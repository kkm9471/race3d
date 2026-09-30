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

function brakeTest(spec, abs) {
  const { c, w } = newCar(spec, { abs });
  const full = pack({ thr: 1, kb: 0 });
  // 100 km/h 조금 넘게 올린다
  for (let f = 0; f < FPS * 60 && kmh(c) < 101; f++) frame(c, w, full);
  // 100 km/h 를 지나는 순간부터 거리 측정
  const br = pack({ brk: 1, kb: 0 });
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

/** 반지름 R 원을 도는 최대 속도 → 횡가속도(g). 원 위를 따라가도록 조향, 속도를 천천히 올린다 */
function skidpad(spec, R = 40) {
  const { c, w } = newCar(spec);
  // 원 중심 (-R, 0) 에서 왼쪽으로 도는 원. 차는 (0,0)에서 +Z 방향 → 반시계(왼쪽) 선회
  const cx = R, cz = 0;   // +X 가 왼쪽이므로 중심은 +X 쪽
  let vt = 20 / 3.6, best = 0, lost = 0, t = 0;
  const hist = [];
  for (let f = 0; f < FPS * 240; f++) {
    const s = c.st;
    // 원 위 앞쪽 목표점 (pure pursuit)
    const ang = Math.atan2(s.pz - cz, s.px - cx);
    const look = 6 + c.out.speed * 0.35;
    const a2 = ang - look / R;     // 반시계 진행 (위에서 볼 때 방향 확인은 실측으로)
    const tx = cx + R * Math.cos(a2), tz = cz + R * Math.sin(a2);
    const a3 = ang + look / R;
    const tx2 = cx + R * Math.cos(a3), tz2 = cz + R * Math.sin(a3);
    // 진행 방향 쪽 목표 고르기
    const ax = c.axes([]);
    const fwdx = ax[6], fwdz = ax[8], lx = ax[0], lz = ax[2];
    const d1 = (tx - s.px) * fwdx + (tz - s.pz) * fwdz, d2 = (tx2 - s.px) * fwdx + (tz2 - s.pz) * fwdz;
    const [gx, gz] = d1 > d2 ? [tx, tz] : [tx2, tz2];
    const lat = (gx - s.px) * lx + (gz - s.pz) * lz, fw = (gx - s.px) * fwdx + (gz - s.pz) * fwdz;
    const curv = 2 * lat / (lat * lat + fw * fw);
    const delta = Math.atan(spec.wb * curv);
    let st = -delta / (c.out.maxSteer || 0.5);
    st = Math.max(-1, Math.min(1, st));
    // 속도 제어
    vt += 0.12 / FPS;    // 초당 0.12 m/s 씩 목표를 올린다
    const v = c.out.fwd;
    let thr = Math.max(0, Math.min(1, (vt - v) * 0.6 + 0.25));
    let brk = v > vt + 1 ? 0.3 : 0;
    frame(c, w, pack({ steer: st, thr, brk, kb: 0 }));
    t += DTF;
    const r = Math.hypot(c.st.px - cx, c.st.pz - cz);
    const err = r - R;
    if (t > 8) {
      if (Math.abs(err) < 1.5) {
        const ay = v * v / r / 9.81;
        hist.push(ay);
        if (hist.length > 90) hist.shift();
        // 1.5초 동안 원 위에 머문 속도만 인정
        if (hist.length === 90) best = Math.max(best, Math.min(...hist));
        lost = 0;
      } else {
        hist.length = 0;
        lost += DTF;
        if (lost > 3) break;
      }
    }
  }
  return { latG: best };
}

export function runAll(ids) {
  const rows = [];
  for (const spec of CARS) {
    if (ids.length && !ids.includes(spec.id)) continue;
    const a = accelTest(spec);
    const b = brakeTest(spec, spec.brake.abs);
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
