// 차 한 대의 물리 — 이 게임에서 가장 중요한 파일
//
// 모형 요약
//  · 차체: 3차원 강체(위치·자세·속도·각속도). 무게 이동과 롤·피치는 따로 흉내 내지 않고
//    서스펜션 스프링이 받는 힘에서 저절로 생긴다.
//  · 서스펜션: 바퀴마다 아래로 광선을 쏴서 노면까지 거리 → 스프링+댐퍼, 좌우 안티롤바.
//  · 타이어: 슬립률(바퀴가 헛도는 정도)과 슬립각(옆으로 미끄러지는 정도)을 각자의 최대 접지점으로
//    정규화해 합친 "마찰원" 모형. 한계를 넘으면 접지력이 떨어진다(=미끄러지면 덜 붙는다).
//    잠긴 바퀴는 슬립률이 -1 이라 옆 힘을 거의 못 낸다 → 브레이크 잠기면 조향이 안 먹는다.
//  · 구동계: 엔진 토크곡선 → 자동변속(변속 중 동력 끊김) → 디퍼렌셜(오픈/LSD) → 바퀴.
//    네바퀴굴림은 센터 디퍼렌셜 배분 + 점성 커플링.
//  · 모든 계산은 dmath 의 결정적 함수만 쓴다(세 화면이 비트 단위로 같아야 하므로).
//
// 좌표: 월드 Y 가 위. 차 기준 +Z 앞, +Y 위, +X 왼쪽.

import { dsin, dcos, datan, clamp, lerpTable } from './dmath.js';
import { unpack } from './input.js';

export const G = 9.81;
const RHO = 1.225;
const VMIN = 2.5;               // 슬립 계산 분모 하한(m/s) — 정지 근처 떨림 방지
const KMH = 3.6;

// 노면: 0 아스팔트, 1 연석, 2 잔디, 3 자갈, 4 흙/비포장
export const SURF = { ASPHALT: 0, CURB: 1, GRASS: 2, GRAVEL: 3, DIRT: 4 };
const SURF_GRIP = {
  road: [1.00, 0.96, 0.60, 0.55, 0.70],
  sport: [1.00, 0.95, 0.55, 0.50, 0.65],
  semi: [1.00, 0.93, 0.50, 0.46, 0.60],
  offroad: [1.00, 0.96, 0.72, 0.70, 0.85],
  rally: [1.00, 0.96, 0.82, 0.80, 0.92],
};
const SURF_ROLL = [0.013, 0.015, 0.06, 0.16, 0.05];   // 구름저항 계수

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
    wheels.push({
      x: left ? t / 2 : -t / 2, z: front ? a : -b, front, left,
      k: front ? kF : kR, c: front ? cF : cR, xs: front ? xsF : xsR,
      // 타이어 기준하중: 앞뒤 같은 규격이면 같다(차 무게/4). 바퀴별 정지하중으로 하면
      // 앞이 무거운 차의 앞바퀴가 손해를 안 봐서 언더스티어가 안 생긴다.
      Fz0: m * G / 4,
    });
  }
  // 구동: 어느 바퀴에 몇 할
  const d = spec.drive;
  let fShare = 0;
  if (d === 'FF') fShare = 1;
  else if (d === 'AWD') fShare = spec.diff.center ?? 0.4;
  const driven = [fShare > 0, fShare > 0, fShare < 1, fShare < 1];
  const nDriven = driven.filter(Boolean).length;
  // 기어비 (엔진→바퀴 전체) = 레드라인 각속도 × 반지름 / 그 단 최고속도
  const wRed = spec.engine.redline * Math.PI / 30;
  const ratios = spec.gears.map(v => wRed * R / (v / KMH));
  const revRatio = wRed * R / (spec.rev / KMH);
  const maxTq = Math.max(...spec.engine.tq);
  // 관성모멘트 (상자 근사에 실제 차에 맞춘 보정)
  const Ixx = m * (Lb * Lb + Hb * Hb) / 12 * 0.85;   // 피치
  const Iyy = m * (Lb * Lb + Wb * Wb) / 12 * 0.90;   // 요
  const Izz = m * (Wb * Wb + Hb * Hb) / 12 * 0.80;   // 롤
  return {
    spec, m, a, b, R, Lb, Wb, Hb, wheels, yHub0, yO,
    kF, kR, cF, cR, arbF: spec.susp.arbF * kF, arbR: spec.susp.arbR * kR,
    bumpF: xsF + spec.susp.bump, bumpR: xsR + spec.susp.bump,
    fShare, driven, nDriven, ratios, revRatio, nGears: ratios.length, maxTq,
    iI: [1 / Ixx, 1 / Iyy, 1 / Izz], I: [Ixx, Iyy, Izz],
    lock: spec.steer.lock * Math.PI / 180,
    grip: SURF_GRIP[spec.tire.type] || SURF_GRIP.road,
    vmax: spec.vmax ? spec.vmax / KMH : 0,
    // 차체 모서리 (바닥 4 + 지붕 4) — 뒤집혔을 때 땅에 닿는 점
    body: [
      [Wb / 2, -spec.cgH + 0.18, Lb / 2], [-Wb / 2, -spec.cgH + 0.18, Lb / 2],
      [Wb / 2, -spec.cgH + 0.18, -Lb / 2], [-Wb / 2, -spec.cgH + 0.18, -Lb / 2],
      [Wb * 0.4, Hb - spec.cgH, Lb * 0.2], [-Wb * 0.4, Hb - spec.cgH, Lb * 0.2],
      [Wb * 0.4, Hb - spec.cgH, -Lb * 0.25], [-Wb * 0.4, Hb - spec.cgH, -Lb * 0.25],
    ],
  };
}

/** 롤백용 상태 — 미래를 바꾸는 값은 전부 여기(st)에만 둔다. 숫자만. */
function makeState() {
  return {
    px: 0, py: 0, pz: 0, qw: 1, qx: 0, qy: 0, qz: 0,
    vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0,
    steer: 0, thr: 0, brk: 0, hb: 0,
    gear: 1, shiftT: 0, nextGear: 1, rpm: 800, revT: 0, tcs: 1.1,
    hint: -1, ghostT: 0, dc: 0, lastRst: 0, rstCD: 0, flipT: 0, stuckT: 0,
    w: [0, 1, 2, 3].map(() => ({ om: 0, x: 0, abs: 1, hint: -1 })),
  };
}

export class Car {
  constructor(spec, opts = {}) {
    this.P = prepare(spec);
    this.spec = spec;
    this.absOn = opts.abs ?? spec.brake.abs;
    this.tcsOn = opts.tcs ?? true;
    this.st = makeState();
    this.inp = unpack(0);
    // 그리기·소리용 파생값(상태 아님 — 롤백 대상 아님)
    this.out = {
      speed: 0, fwd: 0, rpm: 0, gear: 1,
      wheels: [0, 1, 2, 3].map(() => ({
        x: 0, y: 0, z: 0, contact: 0, slip: 0, surf: 0, Fz: 0, steer: 0, comp: 0, sa: 0, sr: 0,
        cx: 0, cy: 0, cz: 0,
      })),
      bodyHit: 0,
    };
    this._fz = [0, 0, 0, 0];
    this._drive = [0, 0, 0, 0];
    this._Ieff = [1, 1, 1, 1];
    this._coupled = false;
  }

  /** 위치·방향(yaw, 라디안; 0 = +Z)으로 세운다 */
  place(x, y, z, yaw, pitch = 0) {
    const s = this.st;
    const hy = yaw / 2, hp = -pitch / 2;
    // q = yaw(Y축) * pitch(X축)
    const cy = dcos(hy), sy = dsin(hy), cp = dcos(hp), sp = dsin(hp);
    s.qw = cy * cp; s.qx = cy * sp; s.qy = sy * cp; s.qz = -sy * sp;
    s.px = x; s.py = y; s.pz = z;
    s.vx = s.vy = s.vz = 0; s.wx = s.wy = s.wz = 0;
    s.gear = 1; s.shiftT = 0; s.nextGear = 1; s.rpm = this.P.spec.engine.idle;
    s.steer = 0; s.thr = 0; s.brk = 0; s.hb = 0; s.tcs = 1.1; s.revT = 0; s.flipT = 0;
    for (let i = 0; i < 4; i++) {
      const w = s.w[i];
      w.om = 0; w.abs = 1;
      w.x = this.P.wheels[i].xs;
    }
  }

  /** 시험용: 앞으로 v(m/s)로 달리는 상태로 만든다 (바퀴 회전·기어 포함) */
  setSpeed(v) {
    const s = this.st, P = this.P;
    const fx = 2 * (s.qx * s.qz + s.qw * s.qy), fy = 2 * (s.qy * s.qz - s.qw * s.qx), fz = 1 - 2 * (s.qx * s.qx + s.qy * s.qy);
    s.vx = fx * v; s.vy = fy * v; s.vz = fz * v;
    for (let i = 0; i < 4; i++) s.w[i].om = v / P.R;
    const red = P.spec.engine.redline;
    let g = 1;
    while (g < P.nGears && (v / P.R) * P.ratios[g - 1] * 30 / Math.PI > red * 0.8) g++;
    s.gear = g; s.nextGear = g; s.shiftT = 0;
    s.rpm = (v / P.R) * P.ratios[g - 1] * 30 / Math.PI;
  }

  /** 조향 한계(보조): 그 속도에서 접지 한계까지 도는 데 필요한 각 + 타이어 최대 슬립각의 1.3배.
   *  차가 옆으로 미끄러지는 중이면(드리프트) 그 각만큼 더 허용해 카운터를 칠 수 있게 한다. */
  steerLimit() {
    const s = this.st, P = this.P, spec = P.spec;
    const { qw, qx, qy, qz } = s;
    const r00 = 1 - 2 * (qy * qy + qz * qz), r10 = 2 * (qx * qy + qw * qz), r20 = 2 * (qx * qz - qw * qy);
    const r02 = 2 * (qx * qz + qw * qy), r12 = 2 * (qy * qz - qw * qx), r22 = 1 - 2 * (qx * qx + qy * qy);
    const vlong = s.vx * r02 + s.vy * r12 + s.vz * r22;
    const vlat = s.vx * r00 + s.vy * r10 + s.vz * r20;
    const beta = datan(Math.abs(vlat) / Math.max(Math.abs(vlong), 1));
    const need = spec.wb * spec.tire.mu * G / Math.max(vlong * vlong, 1) + 1.9 * datan(spec.tire.ap);
    return Math.min(P.lock, need + beta);
  }

  /** 프레임(1/60초)마다 한 번: 입력 → 조향·페달·변속 */
  controls(packed, dtF, locked) {
    const s = this.st, P = this.P, spec = P.spec, inp = unpack(packed, this.inp);
    s.dc = inp.dc;
    // 조향: 키보드는 천천히 돌리고 빨리 푼다. 속도가 빠를수록 최대각이 줄어든다(보조).
    const sp = Math.sqrt(s.vx * s.vx + s.vz * s.vz);
    let target = inp.steer;
    if (inp.kb) {
      const toward = target === 0 ? 5.0 : (Math.sign(target) !== Math.sign(s.steer) ? 6.0 : 2.6 - clamp(sp / 60, 0, 1) * 1.0);
      const d = target - s.steer, mx = toward * dtF;
      s.steer += d > mx ? mx : d < -mx ? -mx : d;
    } else {
      const d = target - s.steer, mx = 12 * dtF;
      s.steer += d > mx ? mx : d < -mx ? -mx : d;
    }
    // 페달: 키보드 0/1 을 짧게 램프. 후진 중에는 브레이크 키가 가속, 가속 키가 브레이크.
    const tIn = s.gear < 0 ? inp.brk : inp.thr, bIn = s.gear < 0 ? inp.thr : inp.brk;
    const rampT = inp.kb ? 7 : 30, rampB = inp.kb ? 9 : 30;
    s.thr += clamp(tIn - s.thr, -12 * dtF, rampT * dtF);
    s.brk += clamp(bIn - s.brk, -12 * dtF, rampB * dtF);
    s.hb = inp.hb;
    if (s.dc) { s.thr = 0; s.brk = 0.6; s.hb = 0; s.steer = 0; }
    this.locked = locked;
    if (locked) { s.brk = 1; s.gear = 1; s.nextGear = 1; s.shiftT = 0; return; }

    // 앞으로 가는 속도
    const q = s;
    const fzx = 2 * (q.qx * q.qz + q.qw * q.qy), fzz = 1 - 2 * (q.qx * q.qx + q.qy * q.qy);
    const vf = s.vx * fzx + s.vz * fzz;

    // 후진: 거의 멈춘 상태에서 브레이크를 누르고 있으면 R, 가속을 누르면 다시 1단
    if (s.gear > 0) {
      // 거의 멈췄을 때만 후진으로 (뒤로 미끄러지는 중에 바뀌면 브레이크가 풀려 버린다 — 독립검증 지적)
      if (inp.brk > 0.3 && inp.thr < 0.1 && vf < 0.8 && vf > -1.0) {
        s.revT += dtF;
        if (s.revT > 0.3) { s.gear = -1; s.nextGear = -1; s.shiftT = 0; s.revT = 0; }
      } else s.revT = 0;
    } else if (s.gear < 0) {
      if (inp.thr > 0.3 && inp.brk < 0.1 && vf > -0.8) {
        s.revT += dtF;
        if (s.revT > 0.15) { s.gear = 1; s.nextGear = 1; s.shiftT = 0; s.revT = 0; }
      } else s.revT = 0;
    }

    // 자동 변속
    if (s.shiftT > 0) {
      s.shiftT -= dtF;
      if (s.shiftT <= 0) { s.shiftT = 0; s.gear = s.nextGear; }
    } else if (s.gear > 0) {
      const e = spec.engine, g = s.gear;
      const wheelRpm = this.drivenOmega() * P.ratios[g - 1] * 30 / Math.PI;
      if (g < P.nGears) {
        // 다음 단에서 바퀴 토크가 더 크거나 레드라인 직전이면 올린다
        const r1 = P.ratios[g - 1], r2 = P.ratios[g];
        const rpm2 = wheelRpm * r2 / r1;
        const t1 = lerpTable(e.rpm, e.tq, wheelRpm) * r1, t2 = lerpTable(e.rpm, e.tq, rpm2) * r2;
        if (s.thr > 0.3 && (wheelRpm > e.redline * 0.985 || (wheelRpm > e.redline * 0.6 && t2 >= t1))) {
          s.nextGear = g + 1; s.shiftT = spec.shift;
        }
      }
      if (s.shiftT === 0 && g > 1) {
        const rpmDown = wheelRpm * P.ratios[g - 2] / P.ratios[g - 1];
        const low = s.brk > 0.2 ? 0.78 : (s.thr > 0.5 ? 0.62 : 0.50);
        if (rpmDown < e.redline * low || wheelRpm < e.idle * 1.05) {
          s.nextGear = g - 1; s.shiftT = spec.shift * 0.7;
        }
      }
    }
  }

  drivenOmega() {
    const w = this.st.w, dr = this.P.driven;
    let sum = 0, n = 0;
    for (let i = 0; i < 4; i++) if (dr[i]) { sum += w[i].om; n++; }
    return sum / n;
  }

  /** 엔진·변속기·디퍼렌셜 → 바퀴별 구동토크와 유효 관성 */
  drivetrain() {
    const s = this.st, P = this.P, spec = P.spec, e = spec.engine;
    const drive = this._drive, Ieff = this._Ieff;
    drive[0] = drive[1] = drive[2] = drive[3] = 0;
    for (let i = 0; i < 4; i++) Ieff[i] = spec.Iw;
    this._coupled = false;
    const g = s.gear;
    const ratio = g > 0 ? P.ratios[g - 1] : g < 0 ? -P.revRatio : 0;
    const wd = this.drivenOmega();
    const rpmW = wd * ratio * 30 / Math.PI;
    let thr = s.thr;
    // 전자식 최고속도 제한
    if (P.vmax > 0) {
      const sp = Math.sqrt(s.vx * s.vx + s.vz * s.vz);
      if (sp > P.vmax) thr = 0; else if (sp > P.vmax - 0.4) thr *= (P.vmax - sp) / 0.4;
    }
    if (s.dc) thr = 0;
    if (this.locked) {
      // 출발 대기: 동력은 끊고 회전수만 올린다(부릉부릉)
      s.rpm += (e.idle + (e.redline * 0.75 - e.idle) * s.thr - s.rpm) * 0.08;
      return;
    }
    if (s.hb) {
      // 사이드브레이크를 당기면 클러치를 뗀 것으로 본다 — 뒷바퀴가 확실히 잠긴다
      s.rpm += (e.idle + (e.redline * 0.6 - e.idle) * s.thr - s.rpm) * 0.05;
      return;
    }
    if (g === 0 || s.shiftT > 0) {
      // 변속 중: 동력 끊김, 회전수는 다음 단 쪽으로
      const target = Math.abs(wd * (P.ratios[Math.max(0, s.nextGear - 1)] || ratio) * 30 / Math.PI);
      s.rpm += (Math.max(e.idle, target) - s.rpm) * 0.25;
      return;
    }
    // 트랙션 컨트롤: 구동바퀴가 지금 하중으로 낼 수 있는 힘 × 보정계수(tcs, 미끄럼으로 학습)만큼만 토크를 준다
    if (this.tcsOn && thr > 0) {
      // 오픈 디퍼렌셜 차축은 가벼운 쪽 바퀴가 한계 (양쪽에 같은 토크가 가므로)
      const fz = this._fz, k = spec.tire.mu * spec.tire.muX * spec.R, sf = this._sf || [0, 0, 0, 0];
      const f = i => Math.max(fz[i], 0) * P.grip[sf[i]];      // 지금 노면(잔디·자갈이면 작게)
      const ax = (a, b, type) => type === 'lsd'
        ? (f(a) + f(b)) * k
        : 2 * Math.min(f(a), f(b)) * k * 1.3;
      let cap = 0;
      if (P.driven[0]) cap += ax(0, 1, spec.diff.front) * (spec.drive === 'AWD' ? 1 : 1);
      if (P.driven[2]) cap += ax(2, 3, spec.diff.rear);
      cap *= s.tcs;
      const rpmNow = (rpmW < 0 && (g === 1 || g === -1)) ? e.idle + (e.launch - e.idle) * thr : Math.max(Math.abs(rpmW), e.idle + (e.launch - e.idle) * thr);
      const perThr = lerpTable(e.rpm, e.tq, rpmNow) * Math.abs(ratio) * spec.eff;
      if (perThr * thr > cap && perThr > 0) thr = Math.max(0, cap / perThr);
    }
    let Te, rpm;
    // 바퀴가 기어 반대로 도는 중(스핀 뒤 뒤로 굴러감)이면 엔진이 끌려가지 않는다 → 반클러치로 본다
    if ((Math.abs(rpmW) < e.launch || rpmW < 0) && (g === 1 || g === -1)) {
      // 출발: 클러치가 미끄러지며 붙는다 (엔진 회전은 발진 회전수 쪽으로)
      // 반쯤 물린 클러치도 엔진 관성은 바퀴에 전달한다(없으면 바퀴가 순간적으로 헛돌며 떨린다)
      // 바퀴가 기어 반대로 돌면 엔진은 그 바퀴를 따라가지 않는다 (회전계가 레드라인 위에 붙는 것 방지)
      rpm = rpmW < 0 ? e.idle + (e.launch - e.idle) * thr : Math.max(Math.abs(rpmW), e.idle + (e.launch - e.idle) * thr);
      Te = lerpTable(e.rpm, e.tq, rpm) * thr;
      if (thr < 0.02) Te = 0;          // 가속 안 밟으면 클러치 떼고 굴러간다(시동 꺼짐 흉내 X)
      else this._coupled = true;
    } else {
      rpm = Math.abs(rpmW);
      this._coupled = true;
      // 엔진 브레이크는 항상 실제 회전을 늦추는 쪽으로 (역회전이면 부호 반대), 크기 상한 있음
      const brakeT = P.maxTq * (0.05 + 0.13 * Math.min(rpm, e.redline) / e.redline) * (rpmW < 0 ? -1 : 1);
      if (rpm >= e.redline) Te = -brakeT;                      // 리미터
      else Te = lerpTable(e.rpm, e.tq, rpm) * thr - brakeT * (1 - thr);
    }
    s.rpm = rpm;
    const Tout = Te * ratio * spec.eff;
    // 차축 분배
    const fs = P.fShare;
    let Tf = Tout * fs, Tr = Tout * (1 - fs);
    const w = s.w;
    if (spec.drive === 'AWD') {
      // 센터 점성 커플링: 앞뒤 회전차를 줄이는 방향으로 토크를 옮긴다
      const df = (w[0].om + w[1].om) / 2 - (w[2].om + w[3].om) / 2;
      const tc = clamp(df * spec.diff.cvisc, -spec.diff.ctmax, spec.diff.ctmax);
      Tf -= tc; Tr += tc;
    }
    this.axle(0, 1, Tf, spec.diff.front);
    this.axle(2, 3, Tr, spec.diff.rear);
    if (this._coupled) {
      const add = e.Ie * ratio * ratio * spec.eff / P.nDriven;
      for (let i = 0; i < 4; i++) if (P.driven[i]) Ieff[i] += add;
    }
  }

  axle(iL, iR, T, type) {
    if (T === 0) return;
    const drive = this._drive, spec = this.P.spec;
    let bias = 0;
    const w = this.st.w;
    if (type === 'lsd') {
      const lock = spec.diff.lock + spec.diff.ratio * Math.abs(T);
      bias = clamp((w[iL].om - w[iR].om) * 180, -lock, lock);
    } else if (this.tcsOn) {
      // 트랙션컨트롤이 헛도는 바퀴를 브레이크로 잡는다(전자식 LSD) — 끄면 오픈 디퍼렌셜 그대로
      const lock = 30 + 0.3 * Math.abs(T);
      bias = clamp((w[iL].om - w[iR].om) * 120, -lock, lock);
    }
    drive[iL] += T / 2 - bias;
    drive[iR] += T / 2 + bias;
  }

  /** 물리 한 걸음 (dt = 1/480초) */
  substep(dt, world) {
    const s = this.st, P = this.P, spec = P.spec, out = this.out;
    const m = P.m, R = P.R;
    // 자세 행렬
    const { qw, qx, qy, qz } = s;
    const xx = qx * qx, yy = qy * qy, zz = qz * qz, xy = qx * qy, xz = qx * qz, yz = qy * qz,
      wx = qw * qx, wy = qw * qy, wz = qw * qz;
    const r00 = 1 - 2 * (yy + zz), r01 = 2 * (xy - wz), r02 = 2 * (xz + wy);
    const r10 = 2 * (xy + wz), r11 = 1 - 2 * (xx + zz), r12 = 2 * (yz - wx);
    const r20 = 2 * (xz - wy), r21 = 2 * (yz + wx), r22 = 1 - 2 * (xx + yy);
    // Xw=(r00,r10,r20) 왼쪽, Yw=(r01,r11,r21) 위, Zw=(r02,r12,r22) 앞
    let Fx = 0, Fy = -m * G, Fz = 0, Tx = 0, Ty = 0, Tz = 0;
    const vx = s.vx, vy = s.vy, vz = s.vz, ox = s.wx, oy = s.wy, oz = s.wz;

    // 공기저항 + 다운포스
    const sp = Math.sqrt(vx * vx + vy * vy + vz * vz);
    const dq = 0.5 * RHO * spec.aero.cdA * sp;
    Fx -= dq * vx; Fy -= dq * vy; Fz -= dq * vz;
    const vlong = vx * r02 + vy * r12 + vz * r22;
    if (spec.aero.clA > 0) {
      const down = 0.5 * RHO * spec.aero.clA * vlong * vlong;
      // 앞뒤 차축 위치에 나눠 준다 → 피치 모멘트
      const df = down * spec.aero.bal, dr = down - df;
      Fx -= down * r01; Fy -= down * r11; Fz -= down * r21;
      // 토크 = r × F, r = Zw*a (앞), Zw*(-b) (뒤), F = -Yw*d
      const mo = P.a * df - P.b * dr;   // Zw × (-Yw) = Xw 방향(왼쪽 축) … 앞이 눌리면 앞으로 숙임
      Tx += mo * r00; Ty += mo * r10; Tz += mo * r20;
    }

    // ── 서스펜션: 네 바퀴 노면 찾기 ──
    const wh = P.wheels, sw = s.w, fz = this._fz;
    const hitX = this._hx || (this._hx = [0, 0, 0, 0]);
    const hitY = this._hy || (this._hy = [0, 0, 0, 0]);
    const hitZ = this._hz || (this._hz = [0, 0, 0, 0]);
    const nX = this._nx || (this._nx = [0, 0, 0, 0]);
    const nY = this._ny || (this._ny = [0, 0, 0, 0]);
    const nZ = this._nz || (this._nz = [0, 0, 0, 0]);
    const surfA = this._sf || (this._sf = [0, 0, 0, 0]);
    const comp = this._cp || (this._cp = [0, 0, 0, 0]);
    const g = world.g;
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
      }
      comp[i] = x;
      w.x = x > 0 ? x : 0;
      fz[i] = F;
      hitX[i] = Ox - r01 * t; hitY[i] = Oy - r11 * t; hitZ[i] = Oz - r21 * t;
      nX[i] = g.nx; nY[i] = g.ny; nZ[i] = g.nz; surfA[i] = g.surf;
      o.contact = x > 0 ? 1 : 0;
      o.surf = g.surf;
      o.comp = x;
      // 그리기용 바퀴 중심
      const hy = P.yHub0 - W.xs + Math.min(x, bumpAt + 0.12);
      o.x = s.px + r00 * bx + r01 * hy + r02 * bz;
      o.y = s.py + r10 * bx + r11 * hy + r12 * bz;
      o.z = s.pz + r20 * bx + r21 * hy + r22 * bz;
    }
    // 안티롤바
    if (comp[0] > 0 || comp[1] > 0) {
      const f = P.arbF * (comp[0] - comp[1]);
      if (comp[0] > 0) fz[0] += f;
      if (comp[1] > 0) fz[1] -= f;
    }
    if (comp[2] > 0 || comp[3] > 0) {
      const f = P.arbR * (comp[2] - comp[3]);
      if (comp[2] > 0) fz[2] += f;
      if (comp[3] > 0) fz[3] -= f;
    }

    // ── 구동계 ──
    this.drivetrain();
    const drive = this._drive, Ieff = this._Ieff;

    // 브레이크 — EBD: 제동 중 하중이 앞으로 쏠리면 뒤 제동력을 줄인다(뒤가 먼저 잠겨 차가 도는 것을 막음)
    const bT = spec.brake.T * s.brk;
    const fzF = Math.max(fz[0], 0) + Math.max(fz[1], 0), fzR = Math.max(fz[2], 0) + Math.max(fz[3], 0);
    const ideal = fzF + fzR > 1 ? fzF / (fzF + fzR) : spec.brake.bias;
    const biasF = clamp(Math.max(spec.brake.bias, ideal + 0.05), 0.4, 0.92);
    const hbT = s.hb ? spec.brake.hb : 0;
    const maxSteer = this.steerLimit();
    const delta = -s.steer * maxSteer;         // 입력 +1 = 오른쪽, δ>0 = 왼쪽
    this.out.maxSteer = maxSteer;

    // 차체자세제어(ESC, 주행 보조가 켜져 있을 때): 차가 조향보다 많이 돌면(오버스티어)
    // 바깥 앞바퀴에 브레이크를 걸어 돌아가는 것을 막는다. 사이드브레이크 중에는 끈다(드리프트 허용).
    let escWheel = -1, escT = 0, escRel = 1;
    if (this.tcsOn && !s.hb && Math.abs(vlong) > 5) {
      const yaw = ox * r01 + oy * r11 + oz * r21;
      const lim = spec.tire.mu * G / Math.abs(vlong);
      let ref = vlong * delta / spec.wb;
      if (ref > lim) ref = lim; else if (ref < -lim) ref = -lim;
      // 반대로 꺾고 있으면(카운터스티어) 그 방향 회전은 전부 과한 회전이다 — 전에는 이때 ESC 가 빠져서
      // 내리막 제동 코너에서 카운터를 대는 순간 차가 돌아 버렸다
      let over = Math.abs(yaw) - (yaw * ref > 0 ? Math.abs(ref) : 0) - 0.06;
      // 뒷바퀴가 회전 방향으로 한계 넘게 미끄러지기 시작해도 개입 (회전 속도만 보면 제동 중 서서히 도는 걸 늦게 잡는다)
      const vlatR = vx * r00 + vy * r10 + vz * r20 + yaw * wh[2].z;
      if (vlatR * yaw < 0) over = Math.max(over, (Math.abs(vlatR) / Math.abs(vlong) - spec.tire.ap) * 4);
      if (over > 0) {
        escWheel = yaw > 0 ? 1 : 0;              // 왼쪽으로 돌고 있으면 오른쪽 앞(1)
        escT = Math.min(over * 6000, spec.brake.T * 0.35);
        escRel = 1 - Math.min(0.8, over * 3);      // 나머지 바퀴 브레이크는 풀어 준다(앞이 이미 접지 한계면 한쪽만 더 잡아서는 회전을 못 막고, 뒤가 접지를 되찾는다)
        s.thr *= 1 - Math.min(0.7, over * 3);
      }
    }
    this.out.esc = escWheel >= 0 ? 1 : 0;

    let tcsSlip = 0;
    for (let i = 0; i < 4; i++) {
      const W = wh[i], w = sw[i], o = out.wheels[i];
      let Fn = fz[i];
      if (Fn < 0) Fn = 0;
      o.Fz = Fn;
      o.slip = 0;
      // 바퀴 방향
      let d = W.front ? delta : 0;
      // 아커만: 안쪽 바퀴를 조금 더 꺾는다
      if (W.front && d !== 0) d *= (d > 0) === W.left ? 1.08 : 0.93;
      o.steer = d;
      const cd = dcos(d), sd = dsin(d);
      let hx = r02 * cd + r00 * sd, hy = r12 * cd + r10 * sd, hz = r22 * cd + r20 * sd;
      const Iw = Ieff[i];
      if (comp[i] <= 0 || Fn <= 0) {
        // 공중: 구동·브레이크만
        let om = w.om + dt * drive[i] / Iw;
        const bb = dt * (bT * (W.front ? biasF : 1 - biasF) / 2 + (W.front ? 0 : hbT / 2)) / Iw;
        if (Math.abs(om) <= bb) om = 0; else om -= Math.sign(om) * bb;
        w.om = om;
        continue;
      }
      const nx = nX[i], ny = nY[i], nz = nZ[i];
      // 노면에 투영한 진행방향 f, 옆방향 l (= n × f, 왼쪽)
      const hn = hx * nx + hy * ny + hz * nz;
      hx -= nx * hn; hy -= ny * hn; hz -= nz * hn;
      const hl = Math.sqrt(hx * hx + hy * hy + hz * hz) || 1;
      const fx = hx / hl, fy = hy / hl, fzv = hz / hl;
      const lx = ny * fzv - nz * fy, ly = nz * fx - nx * fzv, lz = nx * fy - ny * fx;
      // 접지점 속도
      const rx = hitX[i] - s.px, ry = hitY[i] - s.py, rz = hitZ[i] - s.pz;
      const cvx = vx + (oy * rz - oz * ry), cvy = vy + (oz * rx - ox * rz), cvz = vz + (ox * ry - oy * rx);
      const vl = cvx * fx + cvy * fy + cvz * fzv;
      const vt = cvx * lx + cvy * ly + cvz * lz;
      const vref = Math.max(Math.abs(vl), VMIN);
      // 슬립
      const tire = spec.tire;
      const kappa = (w.om * R - vl) / vref;
      const tanA = vt / vref;
      // 하중이 클수록 최대 슬립각이 커진다(실제 타이어) → 코너링 강성이 하중에 정비례하지 않고 둔하게 는다.
      // 이게 없으면 제동으로 하중이 앞으로 쏠릴 때 뒤가 지나치게 가벼워져 차가 저절로 돈다.
      const lr = Fn / W.Fz0;
      const apE = tire.ap * clamp(Math.sqrt(Math.sqrt(lr)), 0.7, 1.3);   // 하중^0.25
      const sx = kappa / tire.kp, sy = tanA / apE;
      const ss = Math.sqrt(sx * sx + sy * sy);
      // 하중 민감도: 많이 눌린 바퀴는 비율상 덜 붙는다
      const ls = clamp(1 - 0.10 * (lr - 1), 0.75, 1.15);
      const mu = tire.mu * (W.front ? 1 : (tire.rear || 1)) * P.grip[surfA[i]] * ls;
      const Fmax = mu * Fn;
      // 곡선 c(s): 0→1 에서 포물선으로 1까지 오르고, 넘으면 slide 로 떨어진다
      let c, cp;
      if (ss <= 1) { c = ss * (2 - ss); cp = 2 - 2 * ss; }
      else {
        const u = (ss - 1) / 1.3, den = 1 + u * u;
        c = tire.slide + (1 - tire.slide) / den;
        cp = -(1 - tire.slide) * 2 * u / (den * den) / 1.3;
      }
      const F = Fmax * c;
      let Fl = 0, Ft = 0;
      if (ss > 1e-9) { Fl = F * sx / ss * tire.muX; Ft = -F * sy / ss; }
      // 정지 근처: 한 걸음에 옆 속도를 반대로 뒤집을 만큼의 힘은 주지 않는다
      const mC = Fn / G;
      const lim = mC * Math.abs(vt) / dt * 0.6;
      if (Ft > lim) Ft = lim; else if (Ft < -lim) Ft = -lim;
      o.slip = ss; o.sa = tanA; o.sr = kappa;
      // 바퀴 회전 (타이어 힘은 반암시적으로 — 딱딱한 스프링이라 그냥 적분하면 튄다)
      let slope;
      if (ss < 1e-6) slope = 2;
      else slope = cp * sx * sx / (ss * ss) + c * sy * sy / (ss * ss * ss);
      if (slope < 0) slope = 0;
      const K = Fmax * slope * tire.muX * R / (tire.kp * vref);
      let om = w.om + dt * (drive[i] - Fl * R) / Iw / (1 + dt * R * K / Iw);
      // 브레이크 (ABS 는 바퀴가 잠기려 하면 풀었다 잡는다)
      let bw = bT * (W.front ? biasF : 1 - biasF) / 2 * (escWheel >= 0 && i !== escWheel ? escRel : 1) + (i === escWheel ? escT : 0);
      if (this.absOn && bw > 0) {
        // 최대 접지 미끄럼률(kp) 근처를 유지하도록 브레이크 압력을 조절
        const over = (-kappa - tire.kp * 0.95) / tire.kp;
        if (over > 0 && vl > 1.5) w.abs = Math.max(0.05, w.abs - dt * 40 * over);
        else w.abs = Math.min(1, w.abs + dt * 6);
        bw *= w.abs;
      } else w.abs = 1;
      if (!W.front) bw += hbT / 2;
      const bb = dt * bw / Iw;
      if (Math.abs(om) <= bb) om = 0; else om -= Math.sign(om) * bb;
      w.om = om;
      if (P.driven[i] && kappa > tcsSlip) tcsSlip = kappa;
      // 구름저항(노면별) — 접지점 속도 반대로
      const crr = SURF_ROLL[surfA[i]] * Fn;
      const vpl = Math.sqrt(vl * vl + vt * vt);
      const rrk = crr / Math.max(vpl, 1.0);
      const Fsx = Fl * fx + Ft * lx - rrk * (vl * fx + vt * lx) + Fn * r01;
      const Fsy = Fl * fy + Ft * ly - rrk * (vl * fy + vt * ly) + Fn * r11;
      const Fsz = Fl * fzv + Ft * lz - rrk * (vl * fzv + vt * lz) + Fn * r21;
      Fx += Fsx; Fy += Fsy; Fz += Fsz;
      Tx += ry * Fsz - rz * Fsy; Ty += rz * Fsx - rx * Fsz; Tz += rx * Fsy - ry * Fsx;
      o.cx = hitX[i]; o.cy = hitY[i]; o.cz = hitZ[i];
    }
    // 트랙션 컨트롤
    if (this.tcsOn) {
      // 구동바퀴 미끄럼률을 최대 접지점의 1.25배 안으로 (넘으면 스로틀을 줄인다)
      const err = (spec.tire.kp * 1.15 - tcsSlip) / spec.tire.kp;
      s.tcs = clamp(s.tcs + dt * 3 * clamp(err, -3, 1), 0.5, 1.5);
    }

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
    // 각속도: 차 기준 좌표에서 관성으로 나눈다
    const tbx = r00 * Tx + r10 * Ty + r20 * Tz;
    const tby = r01 * Tx + r11 * Ty + r21 * Tz;
    const tbz = r02 * Tx + r12 * Ty + r22 * Tz;
    let wbx = r00 * ox + r10 * oy + r20 * oz;
    let wby = r01 * ox + r11 * oy + r21 * oz;
    let wbz = r02 * ox + r12 * oy + r22 * oz;
    wbx += tbx * P.iI[0] * dt; wby += tby * P.iI[1] * dt; wbz += tbz * P.iI[2] * dt;
    // 아주 약한 회전 감쇠(수치 안정용)
    const damp = 1 - 0.02 * dt;
    wbx *= damp; wby *= damp; wbz *= damp;
    s.wx = r00 * wbx + r01 * wby + r02 * wbz;
    s.wy = r10 * wbx + r11 * wby + r12 * wbz;
    s.wz = r20 * wbx + r21 * wby + r22 * wbz;
    s.px += s.vx * dt; s.py += s.vy * dt; s.pz += s.vz * dt;
    // q += 0.5 dt (0,w) q
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
