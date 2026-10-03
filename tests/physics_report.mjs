// 카트식 주행 측정 — "느낌"을 숫자로 (2026-10-02 카트식으로 바꾸며 새로 씀)
//
// 평평한 아스팔트에서 차마다:
//   0→100km/h, 최고속, 액셀을 떼고 1초 동안 줄어든 속도, 100→0 제동거리,
//   그냥 꺾을 때 미끄럼각, 드리프트 미끄럼각·회전 반경, Shift 를 뗀 뒤 펴질 때까지 걸린 시간,
//   (2026-10-02 2차) 드리프트로 U자 도는 시간·드리프트 2초 감속·카운터로 펴는 시간,
//   부스터 최고속, 순간부스터(드리프트 끝에 가속 키를 새로 누름 / 계속 누르고 있으면 안 나감)
// 범위(TARGET)를 벗어나면 ❌ — 카트라이더 손맛 기준으로 정한 값.
//
// 사용법: node tests/physics_report.mjs   → tests/out/physics.md

import fs from 'node:fs';
import { CARS } from '../web/src/sim/cars.js';
import { Car, KART } from '../web/src/sim/car.js';
import { pack } from '../web/src/sim/input.js';

export const FPS = 60, SUB = 8, DT = 1 / (FPS * SUB), DTF = 1 / FPS;

export class FlatWorld {
  constructor(surf = 0) { this.g = { h: 0, nx: 0, ny: 1, nz: 0, surf }; this.surf = surf; }
  ground() { this.g.h = 0; this.g.nx = 0; this.g.ny = 1; this.g.nz = 0; this.g.surf = this.surf; return 0; }
}

export function frame(car, world, inp, locked = false) {
  car.controls(inp, DTF, locked);
  for (let k = 0; k < SUB; k++) car.substep(DT, world);
  car.finishFrame();
}

export function newCar(spec, opts) {
  const c = new Car(spec, opts);
  c.place(0, spec.cgH + 0.03, 0, 0);
  const w = new FlatWorld();
  for (let i = 0; i < 60; i++) frame(c, w, pack({ kb: 0 }), true);   // 안착(출발 전)
  for (let i = 0; i < 30; i++) frame(c, w, pack({ kb: 0 }));          // 출발 신호 뒤 0.5초 (출발부스터 기회가 지나가게)
  return { c, w };
}

const kmh = c => c.out.fwd * 3.6;
/** 미끄럼각(도): 진행 방향과 차 머리 사이 */
export function beta(c) {
  const ax = c.axes([]);
  const vl = c.st.vx * ax[0] + c.st.vz * ax[2], vf = c.st.vx * ax[6] + c.st.vz * ax[8];
  return Math.atan2(vl, Math.max(Math.abs(vf), 0.5)) * 180 / Math.PI;
}

export const TARGET = {
  acc100: [2.2, 4.5], vtop: [155, 170], coast1: [20, 40], brake100: [18, 32],
  gripBeta: [0, 5], boostTop: [188, 212],
  // 2026-10-03 3차: 카트라이더 공식 가이드 영상(60fps)에서 잰 값 — 영상과 같은 키 순서로 잰다(시속 150km 에서)
  //  톡(Shift+방향키 0.13초): 최대 미끄럼 10~15° 가 0.5~0.7초에, 1초 남짓에 저절로 펴짐, 속도 -4%
  tapPeak: [8, 18], tapPeakT: [0.35, 0.8], tapEnd: [0.8, 1.6], tapLoss: [0, 8],
  //  풀(0.7초 → 0.25초 아무것도 → 반대 방향키): 0.15초까지 거의 안 돎(묵직), 0.7초에 35~60°, 키를 떼도 각도 유지(관성),
  //  카운터 0.5~1.0초에 펴짐, 속도 -20~40%(영상 -33%), 오래 누르면 U자
  fullB015: [0, 6], fullB07: [35, 60], fullHold: [0.85, 1.3], counterT: [0.5, 1.0], fullLoss: [18, 40], uturn: [1.4, 2.6],
  // (14회차 독립검증) 드리프트가 끝난 뒤(순간부스터 안 씀) 실제 속력: 0.25초 뒤 변화(급감속·급가속 없음), 1초 동안 최대 상승(탈출 속도가 공짜로 붙지 않음 — 동우 피드백)
  exitD25: [-14, 4], exitMax: [0, 8],     // (3차) 그냥 직진보다 더 붙는 속도
};

/** 영상과 같은 키 순서의 풀 드리프트: Shift+→ 0.7초 → 0.25초 아무것도 → ← 를 펴질 때까지. 가속 키는 계속(thr 로 바꿀 수 있음) */
export const fullPlan = (f, thr = () => 1) => ({ thr: thr(f), steer: f < 42 ? 1 : f < 57 ? 0 : -1, hb: f < 42 ? 1 : 0, kb: 1 });

export function measure(spec) {
  const r = {};
  // 0→100, 최고속
  {
    const { c, w } = newCar(spec);
    let t100 = 0;
    for (let f = 0; f < FPS * 30; f++) { frame(c, w, pack({ thr: 1, kb: 1 })); if (!t100 && kmh(c) >= 100) t100 = (f + 1) / FPS; }
    r.acc100 = t100; r.vtop = kmh(c);
    // 액셀을 떼고 1초
    const v0 = kmh(c);
    for (let f = 0; f < FPS; f++) frame(c, w, pack({ kb: 1 }));
    r.coast1 = v0 - kmh(c);
  }
  // 100→0 제동
  {
    const { c, w } = newCar(spec);
    c.setSpeed(100 / 3.6); c.finishFrame();
    let d = 0;
    for (let f = 0; f < FPS * 5 && kmh(c) > 0.5; f++) { frame(c, w, pack({ brk: 1, kb: 1 })); d += Math.max(0, c.out.fwd) / FPS; }
    r.brake100 = d;
  }
  // 그냥 꺾기: 100km/h 에서 끝까지 3초
  {
    const { c, w } = newCar(spec);
    c.setSpeed(100 / 3.6);
    let mb = 0;
    for (let f = 0; f < FPS * 3; f++) { frame(c, w, pack({ thr: 1, steer: 1, kb: 1 })); if (f > 30) mb = Math.max(mb, Math.abs(beta(c))); }
    r.gripBeta = mb;
    r.gripR = c.out.speed / Math.max(1e-6, Math.abs(c.st.wy));
  }
  // 톡: 150km/h 에서 Shift+→ 0.13초, 뒤엔 가속 키만 (영상: 최대 10~15° 가 0.5~0.7초에, 1초 남짓에 저절로 펴짐)
  {
    const { c, w } = newCar(spec);
    c.setSpeed(150 / 3.6);
    let pk = 0, pkT = 0, end = 0, vmin = 999;
    for (let f = 0; f < FPS * 3; f++) {
      frame(c, w, pack({ thr: 1, steer: f < 8 ? 1 : 0, hb: f < 8 ? 1 : 0, kb: 1 }));
      const b = Math.abs(beta(c));
      if (f < FPS * 1.5) vmin = Math.min(vmin, c.out.speed * 3.6);
      if (b > pk) { pk = b; pkT = (f + 1) / FPS; }
      if (!end && f > 8 && b < 3 && !c.st.drift) end = (f + 1) / FPS;
    }
    r.tapPeak = pk; r.tapPeakT = pkT; r.tapEnd = end || 9;
    r.tapLoss = (150 - vmin) / 1.5;       // 가장 느려진 순간 (%)
  }
  // 풀: 영상과 같은 키 순서(fullPlan). 0.15초·0.7초 미끄럼각, 키를 떼고 0.25초 뒤 각도 유지 비율, 카운터부터 펴질 때까지, 가장 느려진 속도(%)
  {
    const { c, w } = newCar(spec);
    c.setSpeed(150 / 3.6);
    let b015 = 0, b07 = 0, b095 = 0, ct = 0, vmin = 999;
    for (let f = 0; f < FPS * 3; f++) {
      frame(c, w, pack(fullPlan(f)));
      const b = Math.abs(beta(c));
      if (f === 8) b015 = b; if (f === 41) b07 = b; if (f === 56) b095 = b;
      vmin = Math.min(vmin, c.out.speed * 3.6);
      if (!ct && f >= 57 && b < 5) ct = (f + 1 - 57) / FPS;
    }
    r.fullB015 = b015; r.fullB07 = b07; r.fullHold = b095 / Math.max(b07, 1); r.counterT = ct || 9; r.fullLoss = (150 - vmin) / 1.5;
    r.gauge2s = c.st.gauge + c.st.boosts;
  }
  // U자: 140km/h 에서 Shift + 오른쪽을 계속 → 가는 방향이 180° 돌 때까지
  {
    const { c, w } = newCar(spec);
    c.setSpeed(140 / 3.6);
    const ang = () => Math.atan2(c.st.vx, c.st.vz) * 180 / Math.PI, a0 = ang();
    let tu = 0;
    for (let f = 0; f < FPS * 4 && !tu; f++) {
      frame(c, w, pack({ thr: 1, steer: 1, hb: 1, kb: 1 }));
      let d = a0 - ang(); while (d < 0) d += 360; while (d >= 360) d -= 360;
      if (d >= 180 && d < 300) tu = (f + 1) / FPS;
    }
    r.uturn = tu || 9;
  }
  // 탈출 속도: 풀 드리프트를 카운터로 펴서 끝낸 뒤(순간부스터 안 씀 — 가속 키를 계속 누름) 실제 속력의 변화에서
  // 같은 속도로 그냥 직진할 때 붙는 속도를 뺀 것 (드리프트로 크게 느려진 뒤 엔진으로 다시 붙는 건 정상 — 3차부터)
  {
    const { c, w } = newCar(spec);
    c.setSpeed(150 / 3.6);
    let f = 0;
    for (; f < FPS * 3 && (f < 57 || c.st.drift); f++) frame(c, w, pack(fullPlan(f)));
    const v0 = c.out.speed * 3.6;
    const ref = newCar(spec); ref.c.setSpeed(c.out.speed);
    let d25 = 0, mx = 0;
    for (let k = 0; k < FPS; k++) {
      frame(c, w, pack({ thr: 1, kb: 1 })); frame(ref.c, ref.w, pack({ thr: 1, kb: 1 }));
      const dv = (c.out.speed - ref.c.out.speed) * 3.6;
      if (k === Math.round(FPS * 0.25) - 1) d25 = dv;
      mx = Math.max(mx, dv);
    }
    r.exitD25 = d25; r.exitMax = mx; void v0;
  }
  // 꺾이는 양(가는 방향 총 회전, 3초까지): 톡 / 풀(영상 순서, 펴지면 반대 방향키 뗌) — 차끼리 크게 벌어지면 안 된다(regress, 18회차)
  {
    const turnOf = plan => {
      const { c, w } = newCar(spec); c.setSpeed(150 / 3.6);
      const pa = () => Math.atan2(c.st.vx, c.st.vz) * 180 / Math.PI;
      let pp = pa(), tot = 0;
      for (let f = 0; f < FPS * 3; f++) { frame(c, w, pack(plan(f, c))); let d = pa() - pp; if (d > 180) d -= 360; if (d < -180) d += 360; pp = pa(); tot += d; }
      return Math.abs(tot);
    };
    r.tapTurn = turnOf(f => ({ thr: 1, steer: f < 8 ? 1 : 0, hb: f < 8 ? 1 : 0, kb: 1 }));
    let off = 0;
    r.fullTurn = turnOf((f, c) => { const p = fullPlan(f); if (f >= 57 && !c.st.drift) off = 1; if (off) p.steer = 0; return p; });
  }
  // 부스터 최고속
  {
    const { c, w } = newCar(spec);
    for (let f = 0; f < FPS * 25; f++) frame(c, w, pack({ thr: 1, kb: 1 }));
    c.st.boosts = 1;
    let mx = 0;
    for (let f = 0; f < FPS * 3; f++) { frame(c, w, pack({ thr: 1, kb: 1, bo: f < 3 ? 1 : 0 })); mx = Math.max(mx, kmh(c)); }
    r.boostTop = mx;
  }
  // 순간부스터: 풀 드리프트를 카운터로 펴는 끝 무렵 가속 키를 뗐다가, 끝나자마자 새로 누르면 나간다 / 계속 누르고 있으면 안 나간다 (영상의 키 순서)
  const inst = holdThr => {
    const { c, w } = newCar(spec);
    c.setSpeed(140 / 3.6);
    let f = 0;
    for (; f < FPS * 3 && (f < 57 || c.st.drift); f++) frame(c, w, pack(fullPlan(f, () => holdThr || !(f > 57 && c.st.drift && Math.abs(beta(c)) < 15) ? 1 : 0)));
    let got = 0;
    for (let k = 0; k < 12; k++) { frame(c, w, pack({ thr: 1, kb: 1 })); if (c.st.boostT > 0) got = 1; }
    return got;
  };
  r.instOk = inst(false); r.instHold = inst(true);
  return r;
}

if ((process.argv[1] || '').replace(/\\/g, '/').endsWith('tests/physics_report.mjs')) {
  const t0 = Date.now();
  const rows = [];
  let bad = 0;
  const chk = (v, k, d = 1) => { const [a, b] = TARGET[k]; const ok = v >= a && v <= b; if (!ok) bad++; return `${ok ? '✅' : '❌'} ${v.toFixed(d)}`; };
  for (const spec of CARS) {
    const r = measure(spec);
    rows.push(`| ${spec.name}(${spec.cls}) | ${chk(r.acc100, 'acc100', 2)} | ${chk(r.vtop, 'vtop', 0)} | ${chk(r.coast1, 'coast1', 0)} | ${chk(r.brake100, 'brake100')} | ${chk(r.gripBeta, 'gripBeta')} (${r.gripR.toFixed(0)}m) | ${chk(r.tapPeak, 'tapPeak')}° ${chk(r.tapPeakT, 'tapPeakT', 2)}s ${chk(r.tapEnd, 'tapEnd', 2)}s ${chk(r.tapLoss, 'tapLoss')}% | ${chk(r.fullB015, 'fullB015')}° ${chk(r.fullB07, 'fullB07')}° ${chk(r.fullHold, 'fullHold', 2)} | ${chk(r.counterT, 'counterT', 2)} | ${chk(r.fullLoss, 'fullLoss')} | ${chk(r.uturn, 'uturn', 2)} | ${chk(r.exitD25, 'exitD25', 1)} / ${chk(r.exitMax, 'exitMax', 1)} | ${r.gauge2s.toFixed(2)} | ${chk(r.boostTop, 'boostTop', 0)} | ${r.instOk && !r.instHold ? '✅' : '❌'} ${r.instOk}/${r.instHold} |`);
    if (!(r.instOk && !r.instHold)) bad++;
    console.log(rows[rows.length - 1]);
  }
  const T = TARGET;
  const head = `| 차 | 0→100 s (${T.acc100}) | 최고 km/h (${T.vtop}) | 액셀 떼고 1초 감속 km/h (${T.coast1}) | 100→0 m (${T.brake100}) | 그냥 꺾기 미끄럼° (${T.gripBeta}) | 톡: 최대°·그때·펴짐 s·감속% (${T.tapPeak}/${T.tapPeakT}/${T.tapEnd}/${T.tapLoss}) | 풀: 0.15초°·0.7초°·뗀 뒤 유지비 (${T.fullB015}/${T.fullB07}/${T.fullHold}) | 카운터 펴짐 s (${T.counterT}) | 풀 감속 % (${T.fullLoss}) | U자 s (${T.uturn}) | 탈출 0.25초·1초 최대 km/h (${T.exitD25} / ${T.exitMax}) | 2초 드리프트 게이지 | 부스터 최고 km/h (${T.boostTop}) | 순간부스터 새로누름/계속누름 |`;
  fs.mkdirSync('tests/out', { recursive: true });
  fs.writeFileSync('tests/out/physics.md', `# 카트식 주행 측정 (${new Date().toISOString()})\n\n${head}\n|${'---|'.repeat(15)}\n${rows.join('\n')}\n\n범위 밖: ${bad}개\n`);
  console.log(`\n범위 밖: ${bad}개   (${((Date.now() - t0) / 1000).toFixed(1)}초)`);
  process.exit(bad ? 1 : 0);      // 범위 밖이 있으면 실패로 끝난다 (전엔 ❌ 를 찍고도 성공으로 끝났다 — 14회차 독립검증)
}
