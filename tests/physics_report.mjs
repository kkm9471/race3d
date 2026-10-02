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
  // 2026-10-02 2차(카트라이더 역설계 사양): 미끄럼각 30~55°, 오래 누르면 U자, 드리프트 중 초당 15% 감속,
  // Shift 를 떼면 부드럽게(0.3~0.8초에 걸쳐) 펴짐 — 뚝 끊기지 않게, 카운터는 빠르게(0.3초 안)
  driftBeta: [30, 58], straighten: [0.3, 0.8], uturn: [1.5, 2.5], dLoss: [30, 50], counter: [0.05, 0.3],
  // (14회차 독립검증) 드리프트를 놓은 뒤 실제 속력: 0.25초 뒤 변화(급감속·급가속 없음), 1초 동안 최대 상승(탈출 속도가 공짜로 붙지 않음 — 동우 피드백)
  exitD25: [-14, 2], exitMax: [0, 12],
};

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
  // 드리프트: 140km/h 에서 오른쪽 + Shift 2초(가속 유지) → 놓고 곧게
  {
    const { c, w } = newCar(spec);
    c.setSpeed(140 / 3.6);
    let sb = 0, n = 0;
    for (let f = 0; f < FPS * 2; f++) {
      frame(c, w, pack({ thr: 1, steer: f < 30 ? 1 : 0.4, hb: 1, kb: 1 }));
      if (f > 40) { sb += Math.abs(beta(c)); n++; }
    }
    r.driftBeta = sb / n;
    r.driftR = c.out.speed / Math.max(1e-6, Math.abs(c.st.wy));
    r.driftKmh = kmh(c);
    r.gauge2s = c.st.gauge + c.st.boosts;
    let t = 0;
    for (let f = 0; f < FPS * 2; f++) { frame(c, w, pack({ thr: 1, kb: 1 })); if (Math.abs(beta(c)) < 3) { t = (f + 1) / FPS; break; } }
    r.straighten = t || 9;
  }
  // U자: 140km/h 에서 Shift + 오른쪽을 계속 → 가는 방향이 180° 돌 때까지 / 2초 동안 줄어든 속도
  {
    const { c, w } = newCar(spec);
    c.setSpeed(140 / 3.6);
    const ang = () => Math.atan2(c.st.vx, c.st.vz) * 180 / Math.PI, a0 = ang();
    let tu = 0, v2 = 0;
    for (let f = 0; f < FPS * 3 && !tu; f++) {
      frame(c, w, pack({ thr: 1, steer: 1, hb: 1, kb: 1 }));
      if (f === FPS * 2 - 1) v2 = c.out.speed * 3.6;
      let d = a0 - ang(); while (d < 0) d += 360; while (d >= 360) d -= 360;
      if (d >= 180 && d < 300) tu = (f + 1) / FPS;
    }
    r.uturn = tu || 9;
    if (!v2) { for (let f = Math.round(tu * FPS); f < FPS * 2; f++) frame(c, w, pack({ thr: 1, steer: 1, hb: 1, kb: 1 })); v2 = c.out.speed * 3.6; }
    r.dLoss = 140 - v2;
  }
  // 카운터: 140km/h 드리프트 0.8초 → 반대 방향키로 펴질 때까지
  {
    const { c, w } = newCar(spec);
    c.setSpeed(140 / 3.6);
    for (let f = 0; f < 48; f++) frame(c, w, pack({ thr: 1, steer: 1, hb: 1, kb: 1 }));
    let t = 0;
    for (let f = 0; f < FPS * 2; f++) { frame(c, w, pack({ thr: 1, steer: f < 20 ? -1 : 0, kb: 1 })); if (Math.abs(beta(c)) < 3) { t = (f + 1) / FPS; break; } }
    r.counter = t || 9;
  }
  // 탈출 속도: 140km/h 드리프트 2초 → Shift 놓고 직진(가속 유지). 실제 속력(옆으로 미끄러지는 몫 포함)으로 잰다
  {
    const { c, w } = newCar(spec);
    c.setSpeed(140 / 3.6);
    for (let f = 0; f < FPS * 2; f++) frame(c, w, pack({ thr: 1, steer: f < 30 ? 1 : 0.4, hb: 1, kb: 1 }));
    const v0 = c.out.speed * 3.6;
    let d25 = 0, mx = 0;
    for (let f = 0; f < FPS; f++) {
      frame(c, w, pack({ thr: 1, kb: 1 }));
      const dv = c.out.speed * 3.6 - v0;
      if (f === Math.round(FPS * 0.25) - 1) d25 = dv;
      mx = Math.max(mx, dv);
    }
    r.exitD25 = d25; r.exitMax = mx;
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
  // 순간부스터: 드리프트 중 가속 키를 뗐다가, 끝나자마자 새로 누르면 나간다 / 계속 누르고 있으면 안 나간다
  const inst = holdThr => {
    const { c, w } = newCar(spec);
    c.setSpeed(120 / 3.6);
    for (let f = 0; f < 50; f++) frame(c, w, pack({ thr: holdThr || f < 10 ? 1 : 0, steer: 1, hb: 1, kb: 1 }));
    frame(c, w, pack({ thr: holdThr ? 1 : 0, kb: 1 }));            // Shift 뗌
    let got = 0;
    for (let f = 0; f < 10; f++) { frame(c, w, pack({ thr: 1, kb: 1 })); if (c.st.boostT > 0) got = 1; }
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
    rows.push(`| ${spec.name}(${spec.cls}) | ${chk(r.acc100, 'acc100', 2)} | ${chk(r.vtop, 'vtop', 0)} | ${chk(r.coast1, 'coast1', 0)} | ${chk(r.brake100, 'brake100')} | ${chk(r.gripBeta, 'gripBeta')} (${r.gripR.toFixed(0)}m) | ${chk(r.driftBeta, 'driftBeta')} (${r.driftR.toFixed(0)}m, ${r.driftKmh.toFixed(0)}km/h) | ${chk(r.straighten, 'straighten', 2)} | ${chk(r.uturn, 'uturn', 2)} | ${chk(r.dLoss, 'dLoss', 0)} | ${chk(r.counter, 'counter', 2)} | ${chk(r.exitD25, 'exitD25', 1)} / ${chk(r.exitMax, 'exitMax', 1)} | ${r.gauge2s.toFixed(2)} | ${chk(r.boostTop, 'boostTop', 0)} | ${r.instOk && !r.instHold ? '✅' : '❌'} ${r.instOk}/${r.instHold} |`);
    if (!(r.instOk && !r.instHold)) bad++;
    console.log(rows[rows.length - 1]);
  }
  const T = TARGET;
  const head = `| 차 | 0→100 s (${T.acc100}) | 최고 km/h (${T.vtop}) | 액셀 떼고 1초 감속 km/h (${T.coast1}) | 100→0 m (${T.brake100}) | 그냥 꺾기 미끄럼° (${T.gripBeta}) | 드리프트 미끄럼° (${T.driftBeta}) | Shift 뗀 뒤 펴짐 s (${T.straighten}) | U자 s (${T.uturn}) | 드리프트 2초 감속 km/h (${T.dLoss}) | 카운터 펴짐 s (${T.counter}) | 탈출 0.25초·1초 최대 km/h (${T.exitD25} / ${T.exitMax}) | 2초 드리프트 게이지 | 부스터 최고 km/h (${T.boostTop}) | 순간부스터 새로누름/계속누름 |`;
  fs.mkdirSync('tests/out', { recursive: true });
  fs.writeFileSync('tests/out/physics.md', `# 카트식 주행 측정 (${new Date().toISOString()})\n\n${head}\n|${'---|'.repeat(15)}\n${rows.join('\n')}\n\n범위 밖: ${bad}개\n`);
  console.log(`\n범위 밖: ${bad}개   (${((Date.now() - t0) / 1000).toFixed(1)}초)`);
  process.exit(bad ? 1 : 0);      // 범위 밖이 있으면 실패로 끝난다 (전엔 ❌ 를 찍고도 성공으로 끝났다 — 14회차 독립검증)
}
