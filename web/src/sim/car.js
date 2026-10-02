// 차 한 대의 물리 — 카트식(아케이드) 주행
//
// 2026-10-02 사용자 결정: "카트라이더처럼". 실제 차 물리(타이어 마찰원·구동계·ESC)는 걷어 내고
// 누른 만큼 반응하는 카트식으로 바꿨다. 옛 실제 물리는 저장소 태그 real-physics-final 에 있다.
//
// 모형 요약
//  · 차체: 3차원 강체 + 바퀴마다 광선 서스펜션(노면 굴곡·경사·점프 착지는 그대로 자연스럽게).
//  · 주행 힘은 바퀴가 아니라 무게중심에 바로 준다 → 굴러 넘어지지 않고 조작이 곧바로 먹는다.
//      앞뒤: 가속(최고속에 가까울수록 줄어듦) / 액셀을 떼면 확 줄어드는 감속 / 브레이크 / 멈춘 뒤 후진
//      옆: 미끄러지는 옆 속도를 빠르게 없애 "가는 방향 = 보는 방향" (평소엔 거의 안 미끄러진다)
//      회전: 조향 = 목표 회전 속도. 빠를수록 크게 못 돈다(접지 한계 aGrip)
//  · 드리프트(Shift 누르는 동안): 더 많이 돌고 옆으로 미끄러진다. 떼면 0.15초 안에 접지가 돌아와 바로 펴진다.
//  · 드리프트하면 게이지가 차고, 가득 차면 부스터 1개(최대 2개). 부스터 키로 쓴다.
//    드리프트가 끝난 직후 가속 키를 "새로" 누르면 순간부스터, 출발 신호 직후 새로 누르면 출발부스터.
//  · 모든 계산은 dmath 의 결정적 함수만 쓴다(세 화면이 비트 단위로 같아야 하므로). 상태는 전부 st 에.
//
// 좌표: 월드 Y 가 위. 차 기준 +Z 앞, +Y 위, +X 왼쪽.

import { dsin, dcos, datan, clamp } from './dmath.js';
import { unpack } from './input.js';

export const G = 9.81;
const KMH = 3.6;

// 노면: 0 아스팔트, 1 연석, 2 잔디, 3 자갈, 4 흙/비포장
export const SURF = { ASPHALT: 0, CURB: 1, GRASS: 2, GRAVEL: 3, DIRT: 4, ICE: 5 };
// 노면별 [최고속 배율, 가속 배율, 접지 배율] — 길 밖으로 나가면 확실히 느려진다. 빙판은 속도는 그대로, 접지만 크게 준다
export const SURF_K = [[1, 1, 1], [0.97, 1, 1], [0.58, 0.6, 0.8], [0.5, 0.55, 0.75], [0.8, 0.85, 0.9], [0.98, 0.7, 0.45]];

// 모든 차 공통 (카트식 손맛을 정하는 값 — tests/physics_report.mjs 가 잰다)
export const KART = {
  BRAKE: 15,          // 브레이크 감속 m/s²
  COAST0: 2.0,        // 액셀을 뗐을 때 감속 = COAST0 + COAST1 × 속도 (최고속에서 약 28km/h/초)
  COAST1: 0.13,
  REV_ACC: 6, REV_MAX: 9,
  GRIP_K: 12,         // 옆미끄럼을 없애는 빠르기(1/초) — 평소
  DRIFT_K: 2.2,       // 드리프트 중
  RECOVER: 0.07,      // 드리프트를 놓은 뒤 접지가 다 돌아오는 시간(초)
  DRIFT_LAT: 1.35,    // 드리프트 중 옆 가속 한계 = aGrip × 이 값
  KEEP: 0.9,          // 옆미끄럼을 없앨 때 그 에너지의 이만큼은 앞으로 돌려준다(코너에서 속도를 덜 잃게)
  DRIFT_DRAG: 1.2,    // 드리프트 중 추가 감속 m/s²
  KYAW: 11,           // 목표 회전 속도로 따라가는 빠르기(1/초)
  KBETA: 4,           // 드리프트 미끄럼각을 목표각으로 맞추는 빠르기(1/초)
  YAW_CAP: 2.4,       // 저속 최대 회전 속도 rad/s
  RMIN: 2.8,          // 제자리 회전 방지: 최소 회전 반경 m
  TILT_K: 6,          // 땅에 닿아 있을 때 롤·피치 흔들림을 잡는 빠르기
  DRIFT_MIN_V: 8,     // 이보다 느리면 드리프트 안 됨 m/s
  CHARGE: 0.40,       // 드리프트 게이지 기본 충전 속도(1/초, 미끄럼각·속도에 따라)
  BOOST_V: 1.25, BOOST_TAU: 0.35, // 부스터: 최고속 ×, 그 속도까지 붙는 시간상수(초) — 누르자마자 확 밀어 준다
  INST_V: 1.14, INST_T: 0.55,    // 순간부스터
  INST_WIN: 0.35,                // 드리프트가 끝난 뒤 순간부스터 입력을 받아 주는 시간
  START_T: 0.9,                  // 출발부스터 지속
  OVER_K: 0.8,                   // 최고속을 넘으면(부스터 끝·내리막) 줄어드는 빠르기
  PAD_T: 0.7, PAD_V: 1.18,       // 가속 발판
};

/** 제원 → 계산에 쓰는 상수 (한 번만) */
export function prepare(spec) {
  const m = spec.mass;
  const a = spec.wb * (1 - spec.wf);        // 무게중심 → 앞차축
  const b = spec.wb * spec.wf;              // 무게중심 → 뒤차축
  const [Lb, Wb, Hb] = spec.dims;
  const R = spec.R;
  const mcF = m * spec.wf / 2, mcR = m * (1 - spec.wf) / 2;   // 바퀴 하나가 받치는 질량
  const wF = 2 * Math.PI * spec.susp.fF, wR = 2 * Math.PI * spec.susp.fR;
  const kF = mcF * wF * wF, kR = mcR * wR * wR;
  const cF = 2 * spec.susp.z * Math.sqrt(kF * mcF), cR = 2 * spec.susp.z * Math.sqrt(kR * mcR);
  const xsF = mcF * G / kF, xsR = mcR * G / kR;                 // 정지 시 눌림
  const yHub0 = R - spec.cgH;                                    // 정지 시 바퀴 중심 높이(차 기준)
  const yO = yHub0 + 0.5;                                        // 광선 출발점(바퀴보다 위)
  const wheels = [];
  for (let i = 0; i < 4; i++) {
    const front = i < 2, left = (i % 2) === 0;
    const t = front ? spec.tF : spec.tR;
    wheels.push({ x: left ? t / 2 : -t / 2, z: front ? a : -b, front, left, k: front ? kF : kR, c: front ? cF : cR, xs: front ? xsF : xsR });
  }
  // 관성모멘트 (상자 근사)
  const Ixx = m * (Lb * Lb + Hb * Hb) / 12 * 0.85;   // 피치
  const Iyy = m * (Lb * Lb + Wb * Wb) / 12 * 0.90;   // 요
  const Izz = m * (Wb * Wb + Hb * Hb) / 12 * 0.80;   // 롤
  const k = kartParams(spec);
  return {
    spec, m, a, b, R, Lb, Wb, Hb, wheels, yHub0, yO,
    kF, kR, cF, cR, arbF: spec.susp.arbF * kF, arbR: spec.susp.arbR * kR,
    bumpF: xsF + spec.susp.bump, bumpR: xsR + spec.susp.bump,
    iI: [1 / Ixx, 1 / Iyy, 1 / Izz], I: [Ixx, Iyy, Izz],
    lock: 0.45,        // 그리기용 앞바퀴 최대각
    ...k,
    // 차체 모서리 (바닥 4 + 지붕 4) — 뒤집혔을 때 땅에 닿는 점
    body: [
      [Wb / 2, -spec.cgH + 0.18, Lb / 2], [-Wb / 2, -spec.cgH + 0.18, Lb / 2],
      [Wb / 2, -spec.cgH + 0.18, -Lb / 2], [-Wb / 2, -spec.cgH + 0.18, -Lb / 2],
      [Wb * 0.4, Hb - spec.cgH, Lb * 0.2], [-Wb * 0.4, Hb - spec.cgH, Lb * 0.2],
      [Wb * 0.4, Hb - spec.cgH, -Lb * 0.25], [-Wb * 0.4, Hb - spec.cgH, -Lb * 0.25],
    ],
  };
}

/** 능력치(1~5점, 합 15로 맞춤) → 실제 값. 차끼리 차이는 작게(최고속 ±2%) — 실력으로 겨루도록 */
export function kartParams(spec) {
  const s = spec.stats, f = (v, step) => 1 + (v - 3) * step;
  return {
    vtop: 160 / KMH * f(s.speed, 0.01),
    acc: 10 * f(s.accel, 0.05),
    aGrip: 24 * f(s.corner, 0.04),
    driftK: f(s.drift, 0.05),
    charge: f(s.boost, 0.06),
    boostDur: 1.3 * f(s.boost, 0.06),
  };
}

/** 롤백용 상태 — 미래를 바꾸는 값은 전부 여기(st)에만 둔다. 숫자만. */
function makeState() {
  return {
    px: 0, py: 0, pz: 0, qw: 1, qx: 0, qy: 0, qz: 0,
    vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0,
    steer: 0, thr: 0, brk: 0, hb: 0,
    gear: 1, shiftT: 0, nextGear: 1, rpm: 800,
    // 카트
    drift: 0, ddir: 0, dT: 0, gripT: 9, gauge: 0, boosts: 0, boostT: 0, boostK: 0, boostV: 1,
    instT: 0, instKind: 0, thrPrev: 0, boPrev: 0, wasLocked: 1, air: 0, padT: 0,
    hint: -1, ghostT: 0, dc: 0, lastRst: 0, rstCD: 0, flipT: 0, stuckT: 0,
    w: [0, 1, 2, 3].map(() => ({ om: 0, x: 0, hint: -1 })),
  };
}

export class Car {
  constructor(spec, opts = {}) {
    this.P = prepare(spec);
    this.spec = spec;
    this.st = makeState();
    this.inp = unpack(0);
    // 그리기·소리용 파생값(상태 아님 — 롤백 대상 아님)
    this.out = {
      speed: 0, fwd: 0, rpm: 0, gear: 1, maxSteer: this.P.lock, esc: 0, inst: 0,
      wheels: [0, 1, 2, 3].map(() => ({
        x: 0, y: 0, z: 0, contact: 0, slip: 0, surf: 0, Fz: 0, steer: 0, comp: 0, sa: 0, sr: 0,
        cx: 0, cy: 0, cz: 0,
      })),
      bodyHit: 0,
    };
    this._fz = [0, 0, 0, 0];
  }

  /** 위치·방향(yaw, 라디안; 0 = +Z)으로 세운다 */
  place(x, y, z, yaw, pitch = 0) {
    const s = this.st;
    const hy = yaw / 2, hp = -pitch / 2;
    const cy = dcos(hy), sy = dsin(hy), cp = dcos(hp), sp = dsin(hp);
    s.qw = cy * cp; s.qx = cy * sp; s.qy = sy * cp; s.qz = -sy * sp;
    s.px = x; s.py = y; s.pz = z;
    s.vx = s.vy = s.vz = 0; s.wx = s.wy = s.wz = 0;
    s.gear = 1; s.shiftT = 0; s.nextGear = 1; s.rpm = this.P.spec.engine.idle;
    s.steer = 0; s.thr = 0; s.brk = 0; s.hb = 0; s.flipT = 0;
    s.drift = 0; s.ddir = 0; s.dT = 0; s.gripT = 9; s.boostT = 0; s.boostK = 0; s.boostV = 1; s.instT = 0;
    for (let i = 0; i < 4; i++) {
      const w = s.w[i];
      w.om = 0;
      w.x = this.P.wheels[i].xs;
    }
  }

  /** 시험용: 앞으로 v(m/s)로 달리는 상태로 만든다 */
  setSpeed(v) {
    const s = this.st, P = this.P;
    const fx = 2 * (s.qx * s.qz + s.qw * s.qy), fy = 2 * (s.qy * s.qz - s.qw * s.qx), fz = 1 - 2 * (s.qx * s.qx + s.qy * s.qy);
    s.vx = fx * v; s.vy = fy * v; s.vz = fz * v;
    for (let i = 0; i < 4; i++) s.w[i].om = v / P.R;
    this.gearbox(v, 0);
  }

  /** 그 속도에서 조향을 끝까지 했을 때의 회전 속도(rad/s) — 봇도 같은 값을 쓴다 */
  yawMax(v) {
    const av = Math.abs(v);
    return Math.min(KART.YAW_CAP, this.P.aGrip / Math.max(av, 4), av / KART.RMIN);
  }

  /** (옛 이름 호환) 그리기용 앞바퀴 최대각 */
  steerLimit() { return this.P.lock; }

  /** 소리·계기판용 가짜 변속기: 속도를 5단으로 나눠 회전수를 만든다 (주행에는 영향 없음) */
  gearbox(v, dtF) {
    const s = this.st, e = this.P.spec.engine, top = this.P.vtop * KART.BOOST_V;
    const av = Math.abs(v), span = top / 5;
    let g = Math.min(5, 1 + Math.floor(av / span));
    if (v < -0.5 && s.brk > 0) g = -1;
    if (g > 0 && s.gear > 0 && g > s.gear && dtF > 0) s.shiftT = 0.12;      // 변속 소리(힘 끊기는 느낌)
    if (s.shiftT > 0) s.shiftT = Math.max(0, s.shiftT - dtF);
    s.gear = g; s.nextGear = g;
    const frac = g < 0 ? Math.min(1, av / KART.REV_MAX) : (av - (g - 1) * span) / span;
    s.rpm = e.idle + (e.redline - e.idle) * (0.3 + 0.7 * clamp(frac, 0, 1)) * (0.6 + 0.4 * s.thr);
  }

  /** 프레임(1/60초)마다 한 번: 입력 → 조향·페달·드리프트·부스터 */
  controls(packed, dtF, locked) {
    const s = this.st, P = this.P, inp = unpack(packed, this.inp);
    s.dc = inp.dc;
    // 조향: 키보드는 빠르게 올리고 더 빠르게 푼다(카트는 즉답). 패드는 거의 그대로.
    const target = inp.steer, d = target - s.steer;
    const rate = inp.kb ? (target === 0 || target * s.steer < 0 ? 12 : 7) : 20;
    const mx = rate * dtF;
    s.steer += d > mx ? mx : d < -mx ? -mx : d;
    // 페달: 카트는 디지털에 가깝게 (짧은 램프만)
    s.thr += clamp(inp.thr - s.thr, -20 * dtF, 15 * dtF);
    s.brk += clamp(inp.brk - s.brk, -20 * dtF, 15 * dtF);
    s.hb = inp.hb;
    const tNow = inp.thr > 0.5 ? 1 : 0;
    if (s.dc) { s.thr = 0; s.brk = 0.6; s.hb = 0; s.steer = 0; }
    this.locked = locked;
    if (locked) {
      s.drift = 0; s.boostT = 0;
      s.thrPrev = tNow; s.boPrev = inp.bo; s.wasLocked = 1;
      const e = P.spec.engine;
      s.rpm += (e.idle + (e.redline * 0.75 - e.idle) * s.thr - s.rpm) * 0.08;   // 출발 대기: 부릉부릉
      return;
    }
    // 출발 신호 직후 가속 키를 새로 누르면 출발부스터 (신호 전부터 누르고 있었으면 없음)
    if (s.wasLocked) { s.wasLocked = 0; s.instT = KART.INST_WIN; s.instKind = 2; }

    const fwdx = 2 * (s.qx * s.qz + s.qw * s.qy), fwdz = 1 - 2 * (s.qx * s.qx + s.qy * s.qy);
    const vf = s.vx * fwdx + s.vz * fwdz;

    // 드리프트: Shift 를 누르고 있고, 방향키가 들어가 있고, 충분히 빠를 때 시작 → 떼면 끝
    if (!s.drift) {
      if (s.hb && Math.abs(inp.steer) > 0.25 && vf > KART.DRIFT_MIN_V && !s.air && !s.dc) {
        s.drift = 1; s.ddir = inp.steer > 0 ? 1 : -1; s.dT = 0;
      }
    } else if (!s.hb || vf < KART.DRIFT_MIN_V * 0.6 || s.dc) {
      s.drift = 0; s.gripT = 0;
      if (s.dT > 0.3) { s.instT = KART.INST_WIN; s.instKind = 1; }    // 충분히 길게 했으면 순간부스터 기회
    }
    if (s.drift) s.dT += dtF; else s.gripT += dtF;

    // 순간부스터·출발부스터: 기회 시간 안에 가속 키를 "새로" 누르면
    this.out.inst = 0;
    if (s.instT > 0) {
      s.instT -= dtF;
      if (tNow && !s.thrPrev) {
        const t = s.instKind === 2 ? KART.START_T : KART.INST_T;
        if (s.boostT < t) { s.boostT = t; s.boostK = 0.7; s.boostV = KART.INST_V; }
        s.instT = 0; this.out.inst = s.instKind;
      }
    }
    s.thrPrev = tNow;
    // 부스터 키: 누르는 순간 하나 쓴다
    if (inp.bo && !s.boPrev && s.boosts > 0 && !s.dc) {
      s.boosts--; s.boostT = P.boostDur; s.boostK = 1; s.boostV = KART.BOOST_V;
    }
    s.boPrev = inp.bo;
    if (s.boostT > 0) s.boostT = Math.max(0, s.boostT - dtF);
    this.gearbox(vf, dtF);
  }

  /** 물리 한 걸음 (dt = 1/480초) */
  substep(dt, world) {
    const s = this.st, P = this.P, spec = P.spec, out = this.out;
    const m = P.m, R = P.R;
    const { qw, qx, qy, qz } = s;
    const xx = qx * qx, yy = qy * qy, zz = qz * qz, xy = qx * qy, xz = qx * qz, yz = qy * qz,
      wx = qw * qx, wy = qw * qy, wz = qw * qz;
    const r00 = 1 - 2 * (yy + zz), r01 = 2 * (xy - wz), r02 = 2 * (xz + wy);
    const r10 = 2 * (xy + wz), r11 = 1 - 2 * (xx + zz), r12 = 2 * (yz - wx);
    const r20 = 2 * (xz - wy), r21 = 2 * (yz + wx), r22 = 1 - 2 * (xx + yy);
    // Xw=(r00,r10,r20) 왼쪽, Yw=(r01,r11,r21) 위, Zw=(r02,r12,r22) 앞
    let Fx = 0, Fy = -m * G, Fz = 0, Tx = 0, Ty = 0, Tz = 0;
    const vx = s.vx, vy = s.vy, vz = s.vz, ox = s.wx, oy = s.wy, oz = s.wz;

    // ── 서스펜션: 네 바퀴 노면 찾기 ──
    const wh = P.wheels, sw = s.w, fz = this._fz;
    const comp = this._cp || (this._cp = [0, 0, 0, 0]);
    const g = world.g;
    let nc = 0, nxs = 0, nys = 0, nzs = 0, kV = 0, kA = 0, kG = 0, kI = 0;
    for (let i = 0; i < 4; i++) {
      const W = wh[i], w = sw[i], o = out.wheels[i];
      const bx = W.x, by = P.yO, bz = W.z;
      const Ox = s.px + r00 * bx + r01 * by + r02 * bz;
      const Oy = s.py + r10 * bx + r11 * by + r12 * bz;
      const Oz = s.pz + r20 * bx + r21 * by + r22 * bz;
      w.hint = world.ground(Ox, Oz, w.hint);
      const dn = r01 * g.nx + r11 * g.ny + r21 * g.nz;
      let x = 0, t = 0;
      if (dn > 0.25) {
        t = (Oy - g.h) * g.ny / dn;
        x = P.yO - t + R - P.yHub0 + W.xs;       // 늘어난 끝에서 얼마나 눌렸나
      }
      if (t <= 0) x = 0;                         // 바퀴가 이미 땅 속(뒤집힘 등)
      const bumpAt = W.front ? P.bumpF : P.bumpR;
      if (x > bumpAt + 0.12) x = bumpAt + 0.12;
      let F = 0;
      if (x > 0) {
        let xd = (x - w.x) / dt;
        xd = clamp(xd, -5, 5);
        F = W.k * x + W.c * (xd > 0 ? 0.8 : 1.25) * xd;
        if (x > bumpAt) F += W.k * 12 * (x - bumpAt);
        if (F < 0) F = 0;
        nc++; nxs += g.nx; nys += g.ny; nzs += g.nz;
        const sk = SURF_K[g.surf] || SURF_K[0];
        kV += sk[0]; kA += sk[1]; kG += sk[2]; kI += g.surf === SURF.ICE ? 0.35 : 1;
      }
      comp[i] = x;
      w.x = x > 0 ? x : 0;
      fz[i] = F;
      o.contact = x > 0 ? 1 : 0;
      o.surf = g.surf;
      o.comp = x;
      o.Fz = F;
      o.cx = Ox - r01 * t; o.cy = Oy - r11 * t; o.cz = Oz - r21 * t;
      // 그리기용 바퀴 중심
      const hy = P.yHub0 - W.xs + Math.min(x, bumpAt + 0.12);
      o.x = s.px + r00 * bx + r01 * hy + r02 * bz;
      o.y = s.py + r10 * bx + r11 * hy + r12 * bz;
      o.z = s.pz + r20 * bx + r21 * hy + r22 * bz;
      // 서스펜션 힘은 차체 위쪽 축으로, 바퀴 자리에서
      if (F > 0) {
        const rx = o.x - s.px, ry = o.y - s.py, rz = o.z - s.pz;
        const fxw = F * r01, fyw = F * r11, fzw = F * r21;
        Fx += fxw; Fy += fyw; Fz += fzw;
        Tx += ry * fzw - rz * fyw; Ty += rz * fxw - rx * fzw; Tz += rx * fyw - ry * fxw;
      }
    }
    s.air = nc === 0 ? 1 : 0;

    // ── 주행 힘 (무게중심에) ──
    let slipShow = 0, vfOut = 0;
    if (nc > 0) {
      const inv = 1 / nc;
      let nx = nxs * inv, ny = nys * inv, nz = nzs * inv;
      const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      const sV = kV * inv, sA = kA * inv, sG = kG * inv, sI = kI * inv;
      // 노면 위 앞(f)·왼쪽(l)
      const hn = r02 * nx + r12 * ny + r22 * nz;
      let fx = r02 - nx * hn, fy = r12 - ny * hn, fzv = r22 - nz * hn;
      const fl = Math.sqrt(fx * fx + fy * fy + fzv * fzv) || 1; fx /= fl; fy /= fl; fzv /= fl;
      const lx = ny * fzv - nz * fy, ly = nz * fx - nx * fzv, lz = nx * fy - ny * fx;
      const vf = vx * fx + vy * fy + vz * fzv, vl = vx * lx + vy * ly + vz * lz;
      vfOut = vf;
      const share = nc / 4;                       // 바퀴 일부만 닿으면 힘도 그만큼
      // 앞뒤
      const boost = s.boostT > 0 ? s.boostK : 0;
      const vtop = P.vtop * sV * (s.boostT > 0 ? s.boostV : 1);
      let ax = 0;
      if (this.locked) ax = -clamp(vf * 8, -KART.BRAKE, KART.BRAKE);
      else if (s.gear < 0 || (s.brk > 0.3 && s.thr < 0.1 && vf < 0.6)) {
        // 후진 (멈춘 뒤 브레이크를 계속 누르면)
        if (s.brk > 0.3 && vf > -KART.REV_MAX) ax = -KART.REV_ACC * s.brk;
        else if (s.thr > 0.3) ax = KART.BRAKE * s.thr;
        else ax = -clamp(vf * 3, -4, 4);
      } else {
        if (vf > vtop) ax = -(vf - vtop) * KART.OVER_K;
        else if (s.thr > 0) {
          const r = vf / vtop;
          ax = P.acc * sA * s.thr * (1 - r * r);
        }
        // 부스터: 부스터 최고속까지 바로 밀어 준다(가속 키를 안 눌러도)
        if (boost > 0 && vf < vtop) ax = Math.max(ax, (vtop - vf) / KART.BOOST_TAU * boost);
        if (s.thr < 0.05 && boost === 0) ax -= KART.COAST0 + KART.COAST1 * Math.max(0, vf);   // 액셀을 떼면 확 준다
        if (s.brk > 0 && vf > 0) ax -= KART.BRAKE * s.brk * (0.5 + 0.5 * sI);   // 빙판에선 덜 선다
        if (s.drift) ax -= KART.DRIFT_DRAG;
        if (s.dc) ax = -clamp(vf * 2, -6, 6);
      }
      // 옆: 미끄럼을 없앤다 (드리프트 중엔 적게, 놓은 직후엔 빠르게 되돌아온다)
      const rec = s.drift ? 0 : Math.min(1, s.gripT / KART.RECOVER);
      const kLat = (s.drift ? KART.DRIFT_K : KART.DRIFT_K + (KART.GRIP_K - KART.DRIFT_K) * rec) * sI;   // 빙판은 옆으로 잘 미끄러진다
      const aCap = (s.drift ? P.aGrip * KART.DRIFT_LAT * P.driftK : P.aGrip * (s.gripT < 0.4 ? 4.5 : 1.5)) * sG;
      let al = -vl * kLat;
      if (al > aCap) al = aCap; else if (al < -aCap) al = -aCap;
      // 없앤 옆 속도의 일부를 앞으로 (미끄럼을 펴도 속도를 크게 잃지 않게)
      let ak = 0;
      if (vf > 1 && al * vl < 0) ak = KART.KEEP * (-al * vl) / vf;
      ax += ak;
      Fx += m * share * (ax * fx + al * lx);
      Fy += m * share * (ax * fy + al * ly);
      Fz += m * share * (ax * fzv + al * lz);
      // 회전: 노면 법선 축 회전 속도를 목표로
      const on = ox * nx + oy * ny + oz * nz;
      let wt;
      if (s.drift) {
        // 미끄럼각 β(진행 방향이 차 머리보다 왼쪽이면 +)를 목표각으로: 드리프트 방향으로 누르면 26°, 놓으면 17°, 반대로 누르면 9°
        // 경로가 얼마나 휘는지는 옆 가속(위 al)이 정한다 → 각이 클수록 더 돈다. 머리 회전 = 경로 회전 + 각 맞추기
        const beta = datan(vl / Math.max(vf, 1));
        const bt = s.ddir * (0.30 + 0.15 * clamp(s.steer * s.ddir, -1, 1));
        wt = al / Math.max(vf, 1) - KART.KBETA * (bt - beta);
        const cap = KART.YAW_CAP * 1.2;
        if (wt > cap) wt = cap; else if (wt < -cap) wt = -cap;
      } else wt = -s.steer * this.yawMax(vf) * (vf >= 0 ? 1 : -1);
      if (this.locked) wt = 0;
      const ty = P.I[1] * KART.KYAW * (wt - on) * share;
      Tx += ty * nx; Ty += ty * ny; Tz += ty * nz;
      // 롤·피치 흔들림 잡기 (카트는 기울지 않는다)
      const px = ox - on * nx, py = oy - on * ny, pz = oz - on * nz;
      const kt = KART.TILT_K * share * (P.I[0] + P.I[2]) / 2;
      Tx -= kt * px; Ty -= kt * py; Tz -= kt * pz;
      // 드리프트 게이지: 미끄럼각·속도에 비례
      const sp = Math.sqrt(vf * vf + vl * vl);
      if (s.drift && sp > KART.DRIFT_MIN_V) {
        const ratio = Math.abs(vl) / sp;
        s.gauge += dt * KART.CHARGE * P.charge * clamp(ratio / 0.3, 0.3, 1.2) * Math.min(1, sp / 25) * share;
        if (s.gauge >= 1) {
          if (s.boosts < 2) { s.boosts++; s.gauge -= 1; } else s.gauge = 1;
        }
      }
      slipShow = sp > 3 ? Math.abs(vl) / sp : 0;
    } else {
      // 공중: 회전만 살짝 잡는다(착지 때 자세)
      const ia = (P.I[0] + P.I[2]) / 2;
      Tx -= ia * 1.5 * ox; Ty -= ia * 1.5 * oy; Tz -= ia * 1.5 * oz;
    }
    // 그리기용 바퀴 회전·미끄럼 (스키드마크·연기)
    for (let i = 0; i < 4; i++) {
      sw[i].om = vfOut / R;
      const o = out.wheels[i];
      o.steer = wh[i].front ? -s.steer * P.lock : 0;
      o.slip = o.contact ? (s.drift ? 1.5 + slipShow * 3 : slipShow * 6) : 0;
      o.sa = slipShow; o.sr = 0;
    }
    out.esc = 0;

    // ── 차체가 땅에 닿음(뒤집힘·바닥 긁힘) ──
    out.bodyHit = 0;
    for (let k = 0; k < P.body.length; k++) {
      const [bx, by, bz] = P.body[k];
      const X = s.px + r00 * bx + r01 * by + r02 * bz;
      const Y = s.py + r10 * bx + r11 * by + r12 * bz;
      const Z = s.pz + r20 * bx + r21 * by + r22 * bz;
      world.ground(X, Z, s.hint);
      const pen = (g.h - Y) * g.ny;
      if (pen > 0) {
        const rx = X - s.px, ry = Y - s.py, rz = Z - s.pz;
        const pvx = vx + (oy * rz - oz * ry), pvy = vy + (oz * rx - ox * rz), pvz = vz + (ox * ry - oy * rx);
        const vn = pvx * g.nx + pvy * g.ny + pvz * g.nz;
        let Fn = m * (400 * Math.min(pen, 0.3)) - m * 18 * Math.min(vn, 0);
        if (Fn < 0) Fn = 0;
        const tx = pvx - vn * g.nx, ty = pvy - vn * g.ny, tz = pvz - vn * g.nz;
        const tl = Math.sqrt(tx * tx + ty * ty + tz * tz);
        const fr = 0.5 * Fn / Math.max(tl, 0.5);
        const Fsx = Fn * g.nx - fr * tx, Fsy = Fn * g.ny - fr * ty, Fsz = Fn * g.nz - fr * tz;
        Fx += Fsx; Fy += Fsy; Fz += Fsz;
        Tx += ry * Fsz - rz * Fsy; Ty += rz * Fsx - rx * Fsz; Tz += rx * Fsy - ry * Fsx;
        out.bodyHit = 1;
      }
    }

    // ── 적분 ──
    s.vx += Fx / m * dt; s.vy += Fy / m * dt; s.vz += Fz / m * dt;
    const tbx = r00 * Tx + r10 * Ty + r20 * Tz;
    const tby = r01 * Tx + r11 * Ty + r21 * Tz;
    const tbz = r02 * Tx + r12 * Ty + r22 * Tz;
    let wbx = r00 * ox + r10 * oy + r20 * oz;
    let wby = r01 * ox + r11 * oy + r21 * oz;
    let wbz = r02 * ox + r12 * oy + r22 * oz;
    wbx += tbx * P.iI[0] * dt; wby += tby * P.iI[1] * dt; wbz += tbz * P.iI[2] * dt;
    const damp = 1 - 0.02 * dt;
    wbx *= damp; wby *= damp; wbz *= damp;
    s.wx = r00 * wbx + r01 * wby + r02 * wbz;
    s.wy = r10 * wbx + r11 * wby + r12 * wbz;
    s.wz = r20 * wbx + r21 * wby + r22 * wbz;
    s.px += s.vx * dt; s.py += s.vy * dt; s.pz += s.vz * dt;
    const hw = 0.5 * dt, Wx = s.wx, Wy = s.wy, Wz = s.wz;
    const nqw = qw + hw * (-Wx * qx - Wy * qy - Wz * qz);
    const nqx = qx + hw * (qw * Wx + Wy * qz - Wz * qy);
    const nqy = qy + hw * (qw * Wy + Wz * qx - Wx * qz);
    const nqz = qz + hw * (qw * Wz + Wx * qy - Wy * qx);
    const ql = Math.sqrt(nqw * nqw + nqx * nqx + nqy * nqy + nqz * nqz);
    s.qw = nqw / ql; s.qx = nqx / ql; s.qy = nqy / ql; s.qz = nqz / ql;
  }

  /** 프레임 끝: 그리기·소리용 값 정리 */
  finishFrame() {
    const s = this.st, o = this.out;
    const fzx = 2 * (s.qx * s.qz + s.qw * s.qy), fzy = 2 * (s.qy * s.qz - s.qw * s.qx), fzz = 1 - 2 * (s.qx * s.qx + s.qy * s.qy);
    o.speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy + s.vz * s.vz);
    o.fwd = s.vx * fzx + s.vy * fzy + s.vz * fzz;
    o.rpm = s.rpm;
    o.gear = s.gear;
  }

  /** 월드 기준 축 (그리기·충돌에서 쓴다) */
  axes(outArr) {
    const s = this.st;
    const { qw, qx, qy, qz } = s;
    outArr[0] = 1 - 2 * (qy * qy + qz * qz); outArr[1] = 2 * (qx * qy + qw * qz); outArr[2] = 2 * (qx * qz - qw * qy);
    outArr[3] = 2 * (qx * qy - qw * qz); outArr[4] = 1 - 2 * (qx * qx + qz * qz); outArr[5] = 2 * (qy * qz + qw * qx);
    outArr[6] = 2 * (qx * qz + qw * qy); outArr[7] = 2 * (qy * qz - qw * qx); outArr[8] = 1 - 2 * (qx * qx + qy * qy);
    return outArr;
  }
}
