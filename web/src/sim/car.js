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
//  · 드리프트 (2026-10-03 3차 — 카트라이더 공식 가이드 영상을 프레임 단위로 잰 값. 사용자: "예민하고 Shift 떼면 확확 돌아온다"):
//      Shift + 방향키로 건다. Shift 를 누르고 있는 동안 '목표 미끄럼각'이 커진다(짧게 톡 = 살짝 숏 드리프트, 길게 = 풀 드리프트 60°).
//      실제 미끄럼각은 목표각을 묵직하게 따라간다(2차 응답 — 누른 뒤 0.25~0.3초는 거의 안 돌다가 커진다. 톡 치고 떼도 0.5초쯤까지 더 커진다).
//      Shift·방향키를 다 떼도 드리프트는 이어진다(관성 — 목표각이 초당 26° 씩 천천히 줄어 숏 드리프트는 1초쯤에 저절로 펴짐).
//      끝내기는 반대 방향키(카운터): 목표각을 초당 137° 씩 줄인다 → 풀 드리프트(55°)는 0.7~0.8초 눌러야 펴진다. 반대 방향키+Shift 는 두 배(끊기).
//      가는 방향은 미끄럼각만큼 휘고, 감속은 목표각이 클 때 크다(풀 드리프트 초당 약 40% — 영상 200→135km/h). 카운터를 누르면 감속이 바로 준다.
//      코너링 중(Shift·드리프트 쪽 방향키를 누른 채) 가속 키를 떼면 차체가 더 돌아간다(공식 가이드). 손맛 3가지(DRIFT_PRESETS)는 혼자 연습에서 숫자키 1·2·3.
//  · 드리프트하면 게이지가 찬다 = 속도/최고속 × 미끄럼각 × 충전 계수. 가득 차면 부스터 1개(최대 2개). 부스터 키로 쓴다.
//    드리프트가 끝난(차체가 펴진) 직후 0.3초 안에 가속 키를 "새로" 누르면 순간부스터(0.5초), 출발 신호 직후 새로 누르면 출발부스터.
//    부스터 중 드리프트하며 방향키를 톡톡 연타하면(톡톡이) 감속 없이 부스터 최고속의 110% 까지 더 밀어 준다.
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
  KEEP: 0.9,          // 평소: 옆미끄럼을 없앨 때 그 에너지의 이만큼은 앞으로 돌려준다(그냥 꺾는 코너에서 속도를 덜 잃게)
  KYAW: 11,           // 목표 회전 속도로 따라가는 빠르기(1/초)
  YAW_CAP: 2.4,       // 저속 최대 회전 속도 rad/s
  // ── 드리프트 3차 (2026-10-03, 카트라이더 공식 가이드 영상 60fps 실측 — 손맛을 바꿀 때 여기와 DRIFT_PRESETS 만 고친다) ──
  // 영상에서 잰 것: 톡(0.13초) → 미끄럼 10~15°(0.5~0.7초에 최대)·1초쯤 저절로 펴짐·속도 -4% /
  //   풀(0.7초) → 0.25초까지 거의 안 돌다 0.7초에 50~60°·키를 떼도 유지·카운터 0.6~0.7초에 펴짐·200→135km/h /
  //   순간부스터 105→174km/h 0.6초
  D_B0: 0.10,         // 드리프트를 거는 순간의 목표 미끄럼각 rad (6°)
  D_GROW: 2.3,        // Shift 를 누르고 있는 동안 목표각이 커지는 빠르기 rad/초 (130°/초 — 톡 0.13초 ≈ 23°, 0.45초면 상한)
  D_GROW_A: 0.5,      // Shift 없이 드리프트 쪽 방향키만 누르고 있을 때 rad/초 (30°/초 — "방향키를 오래 누르면 깊게 꺾인다")
  D_RELAX: 0.45,      // 아무 키도 안 누르면 목표각이 줄어드는 빠르기 rad/초 (26°/초)
  D_COUNTER: 2.4,     // 반대 방향키(카운터): 목표각이 줄어드는 빠르기 rad/초 (137°/초 — 풀 드리프트가 0.7초쯤에 펴짐)
  D_CUT: 2,           // 반대 방향키 + Shift (끊기): 카운터의 이 배
  D_SPIN: 0.9,        // 드리프트 중 가속 키를 떼면 목표각이 더 커지는 빠르기 rad/초 (차체가 돌아감 — 공식 가이드)
  D_BMAX: 1.05,       // 목표각 상한 rad (60°)
  D_BSPIN: 1.3,       // 가속 키를 뗐을 때 상한 rad (75°)
  D_WN: 7,            // 실제 미끄럼각이 목표각을 따라가는 빠르기(1/초, 2차 응답·감쇠 1) — 묵직함. 클수록 예민
  D_PATH: 1.9,        // 가는 방향이 도는 빠르기 = 이 값 × sin(미끄럼각) rad/초 (풀 드리프트 U자 약 1.8초)
  D_DEC: 0.52,        // 드리프트 감속 = 이 값 × sin(목표각)^1.5 × 속력 (풀 드리프트 초당 약 40% — 영상 200→135km/h). 시속 43km 아래에선 0 으로 줄인다
  D_END: 0.2,         // 목표각이 0 이고 미끄럼각이 이보다 작으면 드리프트 끝 rad (11°) — 이때 순간부스터 기회, 남은 미끄럼은 0.3초에 걸쳐 접지로
  D_YAWCAP: 5,        // 드리프트 중 머리 회전 속도 상한 rad/초
  toktokAccelMultiplier: 1.10,// 톡톡이: 부스터 최고속의 이 배까지
  instantBoostWindowTime: 0.3,// 드리프트를 끝낸 뒤 순간부스터 입력을 받아 주는 시간(초)
  instantBoostForce: 1.14,    // 순간부스터: 최고속의 이 배까지 밀어 준다
  // (AI 드리프트 계획용 — bot.js 가 쓴다. AI 드리프트는 꺼 둠)
  lateralGripFactor: 0.026,
  centripetalStrength: 0.25,
  DRIFT_ALAT: 2.8,    // 드리프트가 끝나고 접지가 돌아오는 동안 옆 가속 상한 = aGrip × 이 값
  KEEP_REC: 0.55,     // 접지가 돌아오는 동안 옆미끄럼 에너지를 앞으로 돌려주는 비율(적게 — 펴지는 순간 속도가 확 붙던 것, 동우 피드백)
  DRIFT_THR: 0.25,    // 드리프트 중 가속 키의 힘(평소의 25% — 액셀을 밟고 있어도 드리프트하면 속도가 준다)
  KYAW_D: 16,         // 드리프트 중 목표 회전 속도로 따라가는 빠르기(1/초)
  RECOVER: 0.3,       // 드리프트가 끝난 뒤 접지가 다 돌아오는 시간(초)
  TOKTOK_ACC: 8,      // 톡톡이 추가 가속 m/s²
  TAP_N: 1.2,         // 톡톡이 판정: 방향키를 새로 누른 횟수(0.4초 반감) 누적이 이 값을 넘으면 '연타'
  RMIN: 2.8,          // 제자리 회전 방지: 최소 회전 반경 m
  TILT_K: 6,          // 땅에 닿아 있을 때 롤·피치 흔들림을 잡는 빠르기
  DRIFT_MIN_V: 8,     // 이보다 느리면 드리프트 안 됨 m/s
  CHARGE: 1.15,       // 게이지 충전 계수 chargeRate: 게이지 += 속도/최고속 × 미끄럼각(rad) × 이 값 × 초 (1.5초 드리프트 ≈ 부스터 1개)
  CHARGE_BMIN: 0.3,   // 짧게 끊어 치는 드리프트도 차도록 미끄럼각은 이 값 이상으로 친다
  BOOST_V: 1.25, BOOST_TAU: 0.35, // 부스터: 최고속 ×, 그 속도까지 붙는 시간상수(초) — 누르자마자 확 밀어 준다
  INST_T: 0.5,                   // 순간부스터 지속(초)
  START_WIN: 0.35,               // 출발 신호 뒤 출발부스터 입력을 받아 주는 시간
  START_T: 0.9,                  // 출발부스터 지속
  OVER_K: 0.8,                   // 최고속을 넘으면(부스터 끝·내리막) 줄어드는 빠르기
  PAD_T: 0.7, PAD_V: 1.18,       // 가속 발판
};
// 드리프트 중 옆 미끄럼을 없애는 빠르기(1/초) = −ln(1 − lateralGripFactor) × 60 (로그는 급수로 — 결정적 계산)
export const K_DRIFT = (() => { const f = KART.lateralGripFactor; let s = 0, p = f; for (let n = 1; n < 60; n++) { s += p / n; p *= f; } return s * 60; })();
// 드리프트 손맛 3가지 — 혼자 연습에서 숫자키 1·2·3 으로 바꿔 타 본다. 같이 타는 방은 늘 1번(세 화면 계산이 같아야 하므로)
export const DRIFT_PRESETS = [
  { name: '영상 그대로', D_WN: 7, D_GROW: 2.3, D_RELAX: 0.45, D_COUNTER: 2.4, D_DEC: 0.52 },
  { name: '가볍게', D_WN: 10, D_GROW: 2.8, D_RELAX: 0.8, D_COUNTER: 3.4, D_DEC: 0.36 },
  { name: '묵직하게', D_WN: 5, D_GROW: 2.0, D_RELAX: 0.3, D_COUNTER: 1.9, D_DEC: 0.6 },
];
export function setDriftPreset(i) {
  const p = DRIFT_PRESETS[i] || DRIFT_PRESETS[0];
  for (const k of Object.keys(p)) if (k !== 'name') KART[k] = p[k];
  return p;
}
const smooth01 = x => { const t = x < 0 ? 0 : x > 1 ? 1 : x; return t * t * (3 - 2 * t); };

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
    dB: 0, dR: 0, alT: 0, tap: 0, stIn: 0, hbLatch: 0,     // dB 목표 미끄럼각(크기) · dR 미끄럼각 변화 속도 · alT 는 bot.js 가 읽는 옛 값(늘 0)
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
    s.dB = 0; s.dR = 0; s.alT = 0; s.tap = 0; s.stIn = 0; s.hbLatch = 0;
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
    if (s.wasLocked) { s.wasLocked = 0; s.instT = KART.START_WIN; s.instKind = 2; }

    const fwdx = 2 * (s.qx * s.qz + s.qw * s.qy), fwdz = 1 - 2 * (s.qx * s.qx + s.qy * s.qy);
    const vf = s.vx * fwdx + s.vz * fwdz;

    // 방향키 연타 세기 (톡톡이 판정): 새로 누르거나 반대쪽으로 바꿀 때마다 +1, 0.4초마다 절반으로
    const sIn = inp.steer > 0.5 ? 1 : inp.steer < -0.5 ? -1 : 0;
    if (sIn !== 0 && sIn !== s.stIn) s.tap += 1;
    s.stIn = sIn;
    s.tap -= s.tap * Math.min(1, 1.75 * dtF);
    if (!s.hb) s.hbLatch = 0;
    // 드리프트(3차): Shift + 방향키 + 충분한 속도로 건다. Shift·방향키를 떼도 이어지고, 목표각이 0 이 되고 차체가 펴지면 끝난다.
    // 카운터+Shift 로 끊었는데 Shift 를 계속 누르고 있으면, Shift 를 새로 눌러야 다음 드리프트(펴자마자 반대로 다시 미끄러지지 않게)
    if (!s.drift) {
      if (s.hb && !s.hbLatch && Math.abs(inp.steer) > 0.25 && vf > KART.DRIFT_MIN_V && !s.air && !s.dc) {
        s.drift = 1; s.ddir = inp.steer > 0 ? 1 : -1; s.dT = 0; s.dB = KART.D_B0; s.dR = 0;
      }
    } else {
      // 지금 미끄럼각(진행 방향이 차 머리보다 왼쪽이면 +) — 왼쪽 축 = 회전행렬 첫 열
      const vl = s.vx * (1 - 2 * (s.qy * s.qy + s.qz * s.qz)) + s.vy * 2 * (s.qx * s.qy + s.qw * s.qz) + s.vz * 2 * (s.qx * s.qz - s.qw * s.qy);
      const bNow = datan(vl / Math.max(vf, 1)), aNow = bNow < 0 ? -bNow : bNow;
      const counter = inp.steer * s.ddir < -0.35;      // 반대 방향키 — 누른 그 순간부터(조향 램프를 기다리지 않음)
      const same = inp.steer * s.ddir > 0.35;
      // 목표각: Shift 를 누르고 있으면 커지고(톡 = 살짝, 길게 = 깊게), 드리프트 쪽 방향키만이면 천천히 커지고,
      // 반대 방향키면 줄고(+Shift 면 두 배 — 끊기), 아무것도 안 누르면 천천히 준다(관성으로 이어지다 숏 드리프트는 저절로 펴짐)
      let lim = KART.D_BMAX;
      if (counter) { s.dB -= KART.D_COUNTER * (s.hb ? KART.D_CUT : 1) * dtF; if (s.hb) s.hbLatch = 1; }
      else if (s.hb && !s.hbLatch) s.dB += KART.D_GROW * P.driftK * dtF;
      else if (same) s.dB += KART.D_GROW_A * P.driftK * dtF;
      else s.dB -= KART.D_RELAX * dtF;
      // 코너링 중(Shift 나 드리프트 쪽 방향키를 누르고 있을 때) 가속 키를 떼면 차체가 돌아간다(공식 가이드). 키를 다 뗀 채 흘러가는 중엔 아님
      // (그때도 돌게 하면 목표각이 0 이 안 돼 드리프트가 안 끝나고, 순간부스터를 쓰려고 ↑ 를 잠깐 뗄 때도 75° 로 돌았다 — 16회차 독립검증)
      if (!counter && s.thr < 0.1 && (s.hb || same)) { s.dB += KART.D_SPIN * dtF; lim = KART.D_BSPIN; }
      if (s.dB > lim) s.dB = lim; else if (s.dB < 0) s.dB = 0;
      const done = s.dB === 0 && aNow < KART.D_END;
      if (done || vf < KART.DRIFT_MIN_V * 0.6 || s.dc) {
        s.drift = 0; s.gripT = 0; s.dR = 0;
        if (s.hb) s.hbLatch = 1;
        // 순간부스터 기회: 차체를 펴서 끝낸, 0.3초 넘게 충분한 속도로 한 드리프트만 (벽에 박혀 멈춘 드리프트·끊김은 안 됨),
        // 그리고 최고속의 90% 아래일 때만 (직선 지그재그로 계속 +11% 를 얻던 것 — 4차 독립검증)
        if (done && s.dT > 0.3 && vf < P.vtop * 0.9) { s.instT = KART.instantBoostWindowTime; s.instKind = 1; }
      }
    }
    if (s.drift) s.dT += dtF; else s.gripT += dtF;

    // 순간부스터·출발부스터: 기회 시간 안에 가속 키를 "새로" 누르면
    // (out.inst 는 화면이 읽고 지운다 — 화면이 느려 한 번에 여러 프레임을 계산해도 알림이 안 빠지게)
    if (s.instT > 0) {
      s.instT -= dtF;
      if (tNow && !s.thrPrev) {
        const t = s.instKind === 2 ? KART.START_T : KART.INST_T;
        // 더 센 부스터가 진행 중이면 약하게 덮어쓰지 않고 시간만 늘린다 (끝난 뒤 남은 boostV 1.25 와 섞이지 않게 진행 중일 때만)
        const iv = KART.instantBoostForce;
        if (s.boostT < t) { const on = s.boostT > 0; s.boostV = on ? Math.max(s.boostV, iv) : iv; s.boostK = on ? Math.max(s.boostK, 0.7) : 0.7; s.boostT = t; }
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
      // 미끄럼각 β (진행 방향이 차 머리보다 왼쪽이면 +)
      const beta = datan(vl / Math.max(vf, 1));
      const aB = beta < 0 ? -beta : beta;
      // 톡톡이: 부스터 중 드리프트 + 미끄럼각 25~50° + 방향키 연타 → 드리프트 감속 없이 부스터 최고속의 110% 까지 더 민다
      const toktok = s.drift && s.boostT > 0 && aB > 0.436 && aB < 0.873 && s.tap > KART.TAP_N;
      this.out.tok = toktok ? 1 : 0;     // 화면 표시용 (상태 아님)
      const vtopB = P.vtop * sV * (s.boostT > 0 ? s.boostV : 1);
      const vtop = toktok ? vtopB * KART.toktokAccelMultiplier : vtopB;
      // 최고속·부스터 비교는 '앞 속도'가 아니라 실제 속력으로 (드리프트 중엔 앞 속도가 작아 부스터가 끝없이 밀어 265km/h 까지 나왔다 — 14회차에 발견)
      const vs = vf > 0 ? Math.sqrt(vf * vf + vl * vl) : vf;
      let ax = 0;
      if (this.locked) ax = -clamp(vf * 8, -KART.BRAKE, KART.BRAKE);
      else if (s.gear < 0 || (s.brk > 0.3 && s.thr < 0.1 && vf < 0.6)) {
        // 후진 (멈춘 뒤 브레이크를 계속 누르면)
        if (s.brk > 0.3 && vf > -KART.REV_MAX) ax = -KART.REV_ACC * s.brk;
        else if (s.thr > 0.3) ax = KART.BRAKE * s.thr;
        else ax = -clamp(vf * 3, -4, 4);
      } else {
        if (vs > vtop) ax = -(vs - vtop) * KART.OVER_K;
        else if (s.thr > 0) {
          const r = vs / vtopB;
          ax = P.acc * sA * s.thr * Math.max(0, 1 - r * r) * (s.drift && !toktok ? KART.DRIFT_THR : 1);
        }
        // 부스터: 부스터 최고속까지 바로 밀어 준다(가속 키를 안 눌러도)
        if (boost > 0 && vs < vtopB) ax = Math.max(ax, (vtopB - vs) / KART.BOOST_TAU * boost);
        if (toktok && vs < vtop) ax += KART.TOKTOK_ACC;
        if (s.thr < 0.05 && boost === 0) ax -= KART.COAST0 + KART.COAST1 * Math.max(0, vf);   // 액셀을 떼면 확 준다
        if (s.brk > 0 && vf > 0) ax -= KART.BRAKE * s.brk * (0.5 + 0.5 * sI);   // 빙판에선 덜 선다
        if (s.dc) ax = -clamp(vf * 2, -6, 6);
      }
      let al, wt, wPath, kyaw = KART.KYAW, rec = 1;
      if (s.drift) {
        // 드리프트(3차): 옆 미끄럼은 없애지 않는다(관성 — 키를 떼도 미끄러짐이 남는다). 가는 방향은 미끄럼각만큼 안쪽으로 휘고,
        // 속도 반대쪽으로 감속한다(목표각이 클수록 — 카운터를 누르면 바로 준다)
        const spd = Math.sqrt(vf * vf + vl * vl) || 1, cf = vf / spd, cl = vl / spd;
        const wp = KART.D_PATH * dsin(aB) * sG;               // 가는 방향이 도는 빠르기 rad/초 (잔디 등에선 덜 휜다)
        // 속도에 수직인 안쪽 = ddir × (cl, −cf) (앞·왼쪽 성분) — 미끄럼각 0 이면 −ddir·왼쪽 (오른쪽 드리프트면 오른쪽)
        let aF = wp * spd * s.ddir * cl, aL = -wp * spd * s.ddir * cf;
        if (!toktok) {
          const sb = dsin(s.dB), fade = clamp((spd - 12) / 14, 0, 1);   // 시속 43km 아래에선 감속을 없애 멈춰 서지 않게
          const dec = KART.D_DEC * sb * Math.sqrt(sb) * spd * fade;
          aF -= dec * cf; aL -= dec * cl;
        }
        ax += aF; al = aL;
        wPath = (cf * al - cl * ax) / spd;                    // 가는 방향이 실제로 도는 속도(왼쪽 +)
        // 미끄럼각이 목표각을 묵직하게 따라간다(2차 응답, 감쇠 1): dR = 미끄럼각이 변하는 속도, 머리 회전 = 경로 회전 − dR
        const bt = s.ddir * s.dB, wn = KART.D_WN;
        s.dR += (wn * wn * (bt - beta) - 2 * wn * s.dR) * dt;
        if (aB > KART.D_BSPIN + 0.1 && s.dR * beta > 0) s.dR = 0;     // 팽이처럼 도는 스핀 방지
        wt = wPath - s.dR;
        if (wt > KART.D_YAWCAP) wt = KART.D_YAWCAP; else if (wt < -KART.D_YAWCAP) wt = -KART.D_YAWCAP;
        kyaw = KART.KYAW_D;
      } else {
        // 옆: 미끄럼을 빠르게 없애 '가는 방향 = 보는 방향'. 드리프트가 끝난 뒤엔 0.3초에 걸쳐 평소로. 빙판은 옆으로 잘 미끄러진다(sI)
        let kLat, aCap, keep;
        if (s.gripT < KART.RECOVER) {
          { const t = s.gripT / KART.RECOVER; rec = 1 - (1 - t) * (1 - t); }    // 처음부터 꾸준히 (끝에 몰리면 질질 끌린다)
          kLat = K_DRIFT + (KART.GRIP_K - K_DRIFT) * rec;
          aCap = P.aGrip * KART.DRIFT_ALAT;
          keep = KART.KEEP_REC + (KART.KEEP - KART.KEEP_REC) * rec;
        } else { kLat = KART.GRIP_K; aCap = P.aGrip * 1.5; keep = KART.KEEP; }
        kLat *= sI; aCap *= sG;
        al = -vl * kLat;
        if (al > aCap) al = aCap; else if (al < -aCap) al = -aCap;
        // 없앤 옆 속도의 일부를 앞으로 (그냥 꺾을 땐 많이, 드리프트 직후엔 적게 — 잃은 속도가 공짜로 돌아오지 않게)
        if (vf > 1 && al * vl < 0) ax += keep * (-al * vl) / vf;
        wPath = al / Math.max(vf, 1);                         // 경로(가는 방향)가 도는 속도
        wt = -s.steer * this.yawMax(vf) * (vf >= 0 ? 1 : -1);
        // 드리프트가 끝난 직후: 머리가 갑자기 멈칫하지 않게 경로 회전에서 평소 조향으로 서서히
        if (rec < 1) wt = wPath + (wt - wPath) * rec;
      }
      Fx += m * share * (ax * fx + al * lx);
      Fy += m * share * (ax * fy + al * ly);
      Fz += m * share * (ax * fzv + al * lz);
      // 회전: 노면 법선 축 회전 속도를 목표로
      const on = ox * nx + oy * ny + oz * nz;
      if (this.locked) wt = 0;
      const ty = P.I[1] * kyaw * (wt - on) * share;
      Tx += ty * nx; Ty += ty * ny; Tz += ty * nz;
      // 롤·피치 흔들림 잡기 (카트는 기울지 않는다)
      const px = ox - on * nx, py = oy - on * ny, pz = oz - on * nz;
      const kt = KART.TILT_K * share * (P.I[0] + P.I[2]) / 2;
      Tx -= kt * px; Ty -= kt * py; Tz -= kt * pz;
      // 드리프트 게이지 (사용자 사양): 게이지 += 속도/최고속 × 미끄럼각 × 충전 계수 × 시간
      const sp = Math.sqrt(vf * vf + vl * vl);
      if (s.drift && sp > KART.DRIFT_MIN_V) {
        // 짧게 끊어 치는 드리프트도 차도록 미끄럼각은 0.3rad 이상으로 친다
        s.gauge += dt * KART.CHARGE * P.charge * Math.min(1.2, sp / P.vtop) * Math.max(aB, KART.CHARGE_BMIN) * share;
        if (s.gauge >= 1) {
          // 가득 차면 부스터 1개(최대 2개), 게이지는 0부터 다시 (2개를 갖고 있으면 그냥 비운다 — 사용자 요청)
          if (s.boosts < 2) s.boosts++;
          s.gauge = 0;
        }
      }
      slipShow = sp > 3 ? Math.abs(vl) / sp : 0;
    } else {
      // 공중: 회전만 살짝 잡는다(착지 때 자세)
      // 공중: 차체 위쪽을 하늘 쪽으로 되돌린다 (카트처럼 바퀴로 착지 — 점프대에서 기운 채 날아 뒤집히던 것, 4차 독립검증)
      const ia = (P.I[0] + P.I[2]) / 2;
      Tx += ia * (30 * -r21 - 8 * ox); Tz += ia * (30 * r01 - 8 * oz); Ty -= ia * 1.5 * oy;
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
