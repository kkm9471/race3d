// 차급별 물리 측정 — "느낌"이 아니라 숫자로 튜닝하기 위한 시험
//
// 평평한 무한 아스팔트 위에서 차마다:
//   0→100 km/h 시간, 최고속도, 100→0 제동거리(ABS 켬/끔), 원선회 최대 횡가속도(g),
//   그리고 구동방식별 특성(출발 시 바퀴 헛돎)을 잰다.
// 결과를 실제 같은 차급의 공개 성능 범위(cars.js 의 target)와 비교해 표로 낸다.
//
// 사용법: node tests/physics_report.mjs [차id]   → tests/out/physics.md 도 쓴다

import fs from 'node:fs';
import { CARS } from '../web/src/sim/cars.js';
import { Car } from '../web/src/sim/car.js';
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
  for (let i = 0; i < 90; i++) frame(c, w, pack({ kb: 0 }));   // 1.5초 안착
  return { c, w };
}

const kmh = c => c.out.fwd * 3.6;

function accelTest(spec) {
  const { c, w } = newCar(spec);
  const full = pack({ thr: 1, kb: 0 });
  let t = 0, t60 = 0, t100 = 0, t200 = 0, vmax = 0, flat = 0, x0 = c.st.pz, q400 = 0, maxSpin = 0;
  let prev = 0;
  for (let f = 0; f < FPS * 150; f++) {
    frame(c, w, full);
    t += DTF;
    const v = kmh(c);
    if (!t60 && v >= 60) t60 = t;
    if (!t100 && v >= 100) t100 = t;
    if (!t200 && v >= 200) t200 = t;
    if (!q400 && c.st.pz - x0 >= 402.3) q400 = t;
    if (t < 3) {
      for (let i = 0; i < 4; i++) {
        const sp = Math.abs(c.st.w[i].om * c.P.R - c.out.fwd);
        if (sp > maxSpin) maxSpin = sp;
      }
    }
    if (v > vmax + 0.02) { vmax = v; flat = 0; } else flat += DTF;
    if (flat > 6 && t > 20) break;
    prev = v;
  }
  return { t60, t100, t200, q400, vmax, maxSpin, drift: Math.abs(c.st.px) };
}

function brakeTest(spec, abs, pedal = 1) {
  const { c, w } = newCar(spec, { abs });
  const full = pack({ thr: 1, kb: 0 });
  // 100 km/h 조금 넘게 올린다
  for (let f = 0; f < FPS * 60 && kmh(c) < 101; f++) frame(c, w, full);
  // 100 km/h 를 지나는 순간부터 거리 측정
  const br = pack({ brk: pedal, kb: 0 });
  const z0 = c.st.pz, x0 = c.st.px;
  let t = 0, locked = 0, yaw0 = Math.atan2(2 * (c.st.qw * c.st.qy), 1 - 2 * c.st.qy * c.st.qy);
  const v0 = kmh(c);
  while (c.out.speed > 0.3 && t < 20) {
    frame(c, w, br);
    t += DTF;
    for (let i = 0; i < 4; i++) if (c.st.w[i].om === 0 && c.out.speed > 3) locked++;
  }
  const d = Math.hypot(c.st.pz - z0, c.st.px - x0);
  // 100 km/h 기준으로 환산 (시작 속도가 101 근처라 제곱비 보정)
  return { dist: d * (100 / v0) ** 2, time: t, lockedFrames: locked };
}

/** 스키드패드: 반지름 R 원을 일정 속도로 20초 유지할 수 있는 최대 횡가속도(g).
 *  실제 자동차 잡지 시험처럼 속도를 한 단계씩 올려 가며 "원 위에 머무는지"만 본다. */
export function circleHold(spec, vkmh, R = 40, secs = 20, opts) {
  const { c, w } = newCar(spec, opts);
  const cx = R, cz = 0;          // +X 가 왼쪽 → 왼쪽으로 도는 원
  c.setSpeed(vkmh / 3.6);
  const vt = vkmh / 3.6;
  let ok = 0, sumAy = 0, n = 0, integ = 0;
  for (let f = 0; f < FPS * secs; f++) {
    const s = c.st;
    const ax = c.axes([]);
    const fwdx = ax[6], fwdz = ax[8], lx = ax[0], lz = ax[2];
    const ang = Math.atan2(s.pz - cz, s.px - cx);
    const look = 5 + c.out.speed * 0.3;
    let best = null;
    for (const sg of [-1, 1]) {
      const a2 = ang + sg * look / R;
      const tx = cx + R * Math.cos(a2), tz = cz + R * Math.sin(a2);
      const d = (tx - s.px) * fwdx + (tz - s.pz) * fwdz;
      if (!best || d > best[2]) best = [tx, tz, d];
    }
    const lat = (best[0] - s.px) * lx + (best[1] - s.pz) * lz, fw = (best[0] - s.px) * fwdx + (best[1] - s.pz) * fwdz;
    const curv = 2 * lat / (lat * lat + fw * fw);
    let st = -Math.atan(spec.wb * curv) / (c.out.maxSteer || 0.5);
    st = Math.max(-1, Math.min(1, st));
    const v = c.out.fwd;
    integ += (vt - v) / FPS;
    const thr = Math.max(0, Math.min(1, (vt - v) * 0.8 + integ * 0.3 + 0.15));
    frame(c, w, pack({ steer: st, thr, brk: 0, kb: 0 }));
    if (f > FPS * (secs - 6)) {
      const r = Math.hypot(c.st.px - cx, c.st.pz - cz);
      if (Math.abs(r - R) < 2 && c.out.fwd > vt - 1.5) ok++;
      sumAy += c.out.fwd * c.out.fwd / r / 9.81; n++;
    }
  }
  return { hold: ok >= n * 0.98, ay: sumAy / n };
}

function skidpad(spec, R = 40) {
  let best = 0;
  for (let v = 40; v < 160; v += 2) {
    const r = circleHold(spec, v, R);
    if (!r.hold) break;
    best = r.ay;
  }
  return { latG: best };
}

export function runAll(ids) {
  const rows = [];
  for (const spec of CARS) {
    if (ids.length && !ids.includes(spec.id)) continue;
    const a = accelTest(spec);
    let b = brakeTest(spec, spec.brake.abs);
    if (!spec.brake.abs) {
      // ABS 없는 차는 사람이 잠기기 직전까지만 밟는다(문턱 제동) — 가장 짧은 값을 쓴다
      for (const p of [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.9]) {
        const t = brakeTest(spec, false, p);
        if (t.dist < b.dist) b = { ...t, pedal: p };
      }
    }
    const bn = brakeTest(spec, false);
    const k = skidpad(spec);
    rows.push({ spec, a, b, bn, k });
  }
  return rows;
}

function mark(v, [lo, hi]) { return v >= lo && v <= hi ? '✅' : '❌'; }

if ((process.argv[1] || '').replace(/\\/g, '/').endsWith('tests/physics_report.mjs')) {
  const ids = process.argv.slice(2);
  const t0 = Date.now();
  const rows = runAll(ids);
  const lines = [];
  lines.push('| 차 | 구동 | 0→100 s (목표) | 최고 km/h (목표) | 100→0 m ABS (목표) | ABS끔 m | 원선회 g (목표) | 출발 헛돎 m/s | 0→200 s | 400m s |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|');
  let bad = 0;
  for (const { spec, a, b, bn, k } of rows) {
    const T = spec.target;
    const m1 = mark(a.t100, T.acc100), m2 = mark(a.vmax, T.vmax), m3 = mark(b.dist, T.brake100), m4 = mark(k.latG, T.latG);
    bad += [m1, m2, m3, m4].filter(x => x === '❌').length;
    lines.push(`| ${spec.name}(${spec.cls}) | ${spec.drive} | ${m1} ${a.t100.toFixed(2)} (${T.acc100.join('~')}) | ${m2} ${a.vmax.toFixed(0)} (${T.vmax.join('~')}) | ${m3} ${b.dist.toFixed(1)} (${T.brake100.join('~')}) | ${bn.dist.toFixed(1)}${bn.lockedFrames ? ' 잠김' : ''} | ${m4} ${k.latG.toFixed(3)} (${T.latG.join('~')}) | ${a.maxSpin.toFixed(1)} | ${a.t200 ? a.t200.toFixed(1) : '-'} | ${a.q400.toFixed(2)} |`);
  }
  const txt = lines.join('\n');
  console.log(txt);
  console.log(`\n범위 밖: ${bad}개   (${((Date.now() - t0) / 1000).toFixed(1)}초)`);
  fs.mkdirSync('tests/out', { recursive: true });
  if (!ids.length) fs.writeFileSync('tests/out/physics.md', `# 물리 측정 (${new Date().toISOString()})\n\n${txt}\n\n범위 밖: ${bad}개\n`);
}
