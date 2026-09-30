// 주행 성격 시험 — 구동방식·차급별 "미끄러짐" 차이를 숫자로 (완성 기준 4)
//
//  ① 한계 성향: 반지름 40m 원을 한계 속도의 97%로 돌 때 앞바퀴 슬립각 − 뒷바퀴 슬립각
//     (+ 면 앞이 먼저 밀림 = 언더스티어, − 면 뒤가 먼저 = 오버스티어)
//  ② 탈출 가속(보조 끔): 반지름 30m 코너를 45km/h로 돌다가 가속 끝까지 → 2초 안 최대 차체 미끄럼각 β
//     FF 는 앞이 밀리며 β 작음, FR·MR·RR 은 뒤가 흐르며 β 큼, AWD 는 중간
//  ③ 사이드브레이크 턴: 60km/h 에서 핸들 꺾고 사이드 0.6초 → 최대 회전(요) 속도와 β
//  ④ ABS 끄고 100km/h 급제동 + 핸들: 잠긴 바퀴는 방향이 안 바뀐다 → 옆으로 간 거리 비교
import fs from 'node:fs';
import { CARS } from '../web/src/sim/cars.js';
import { newCar, frame, FPS, circleHold } from './physics_report.mjs';
import { pack } from '../web/src/sim/input.js';

const deg = r => r * 180 / Math.PI;
function beta(c) {
  const ax = c.axes([]);
  const vl = c.st.vx * ax[0] + c.st.vz * ax[2], vf = c.st.vx * ax[6] + c.st.vz * ax[8];
  return Math.atan2(vl, Math.max(Math.abs(vf), 0.5));
}

function follow(c, R, cx, cz) {
  const s = c.st, ax = c.axes([]);
  const fwdx = ax[6], fwdz = ax[8], lx = ax[0], lz = ax[2];
  const ang = Math.atan2(s.pz - cz, s.px - cx);
  const look = 5 + c.out.speed * 0.3;
  let best = null;
  for (const sg of [-1, 1]) {
    const a2 = ang + sg * look / R, tx = cx + R * Math.cos(a2), tz = cz + R * Math.sin(a2);
    const d = (tx - s.px) * fwdx + (tz - s.pz) * fwdz;
    if (!best || d > best[2]) best = [tx, tz, d];
  }
  const lat = (best[0] - s.px) * lx + (best[1] - s.pz) * lz, fw = (best[0] - s.px) * fwdx + (best[1] - s.pz) * fwdz;
  const curv = 2 * lat / (lat * lat + fw * fw);
  return Math.max(-1, Math.min(1, -Math.atan(c.spec.wb * curv) / (c.out.maxSteer || 0.5)));
}

/** ① 한계 성향 */
function balance(spec) {
  // 한계 속도 찾기
  let vmax = 40;
  for (let v = 40; v < 160; v += 2) { if (!circleHold(spec, v, 40, 14).hold) break; vmax = v; }
  const { c, w } = newCar(spec);
  const R = 40, cx = R, cz = 0, vt = vmax * 0.97 / 3.6;
  c.setSpeed(vt);
  let sa = 0, n = 0, integ = 0;
  for (let f = 0; f < FPS * 12; f++) {
    const st = follow(c, R, cx, cz);
    const v = c.out.fwd; integ += (vt - v) / FPS;
    frame(c, w, pack({ steer: st, thr: Math.max(0, Math.min(1, (vt - v) * 0.8 + integ * 0.3 + 0.15)), kb: 0 }));
    if (f > FPS * 8) {
      // 바퀴별 슬립각 (물리 계산에서 쓴 값 그대로)
      const W = c.out.wheels;
      sa += (Math.abs(Math.atan(W[0].sa)) + Math.abs(Math.atan(W[1].sa))) / 2 - (Math.abs(Math.atan(W[2].sa)) + Math.abs(Math.atan(W[3].sa))) / 2;
      n++;
    }
  }
  return { vmax, bal: deg(sa / n) };
}

/** ② 탈출 가속 (보조 끔) */
function exitThrottle(spec) {
  const { c, w } = newCar(spec, { tcs: false, abs: true });
  const R = 30, cx = R, cz = 0, vt = 45 / 3.6;
  c.setSpeed(vt);
  let maxB = 0, integ = 0;
  for (let f = 0; f < FPS * 8; f++) {
    const st = follow(c, R, cx, cz);
    const v = c.out.fwd; integ += (vt - v) / FPS;
    const thr = f < FPS * 5 ? Math.max(0, Math.min(1, (vt - v) * 0.8 + integ * 0.3 + 0.15)) : 1;
    frame(c, w, pack({ steer: f < FPS * 5 ? st : Math.max(-1, Math.min(1, st)), thr, kb: 0 }));
    if (f >= FPS * 5) maxB = Math.max(maxB, Math.abs(beta(c)));
  }
  return deg(maxB);
}

/** ③ 사이드브레이크 턴 */
function handbrake(spec) {
  const { c, w } = newCar(spec, { tcs: false });
  c.setSpeed(60 / 3.6);
  let maxYaw = 0, maxB = 0;
  for (let f = 0; f < FPS * 3; f++) {
    const hb = f >= 10 && f < 10 + 36 ? 1 : 0;
    frame(c, w, pack({ steer: f >= 6 ? -0.8 : 0, hb, thr: f > 46 ? 0.4 : 0, kb: 0 }));
    maxYaw = Math.max(maxYaw, Math.abs(c.st.wy));
    maxB = Math.max(maxB, Math.abs(beta(c)));
  }
  return { yaw: deg(maxYaw), beta: deg(maxB) };
}

/** ④ ABS 유무 급제동 + 핸들 */
function lockSteer(spec, abs) {
  const { c, w } = newCar(spec, { abs, tcs: true });
  c.setSpeed(100 / 3.6);
  const x0 = c.st.px;
  for (let f = 0; f < FPS * 6; f++) { frame(c, w, pack({ brk: 1, steer: -0.6, kb: 0 })); if (c.out.speed < 0.5) break; }
  return Math.abs(c.st.px - x0);
}

const rows = [];
const t0 = Date.now();
for (const spec of CARS) {
  const b = balance(spec), ex = exitThrottle(spec), hb = handbrake(spec);
  const lsA = lockSteer(spec, true), lsN = lockSteer(spec, false);
  rows.push({ spec, b, ex, hb, lsA, lsN });
  console.log(spec.name, spec.drive, JSON.stringify({ bal: +b.bal.toFixed(2), vmax: b.vmax, exitBeta: +ex.toFixed(1), hbYaw: +hb.yaw.toFixed(0), hbBeta: +hb.beta.toFixed(0), sideABS: +lsA.toFixed(1), sideLock: +lsN.toFixed(1) }));
}
const tag = x => x > 0.5 ? '언더스티어' : x < -0.5 ? '오버스티어' : '중립';
const lines = ['| 차 | 구동 | ① 한계 성향 (앞−뒤 슬립각) | ② 보조 끄고 탈출 가속 시 최대 미끄럼각 | ③ 사이드브레이크 턴 최대 회전 | ④ 급제동+핸들 옆 이동 (ABS / ABS 끔) |', '|---|---|---|---|---|---|'];
for (const r of rows) lines.push(`| ${r.spec.name}(${r.spec.cls}) | ${r.spec.drive} | ${tag(r.b.bal)} ${r.b.bal >= 0 ? '+' : ''}${r.b.bal.toFixed(2)}° | ${r.ex.toFixed(1)}° | ${r.hb.yaw.toFixed(0)}°/s (β ${r.hb.beta.toFixed(0)}°) | ${r.lsA.toFixed(1)} m / ${r.lsN.toFixed(1)} m |`);
const txt = lines.join('\n');
console.log(txt);
// 구동방식별 평균
const by = {};
for (const r of rows) (by[r.spec.drive] ||= []).push(r.ex);
const sum = Object.entries(by).map(([d, a]) => `${d} ${(a.reduce((s, x) => s + x, 0) / a.length).toFixed(1)}°`).join(', ');
console.log('탈출 가속 미끄럼각 구동방식별 평균:', sum, `(${((Date.now() - t0) / 1000).toFixed(1)}초)`);
fs.writeFileSync('tests/out/character.md', `# 주행 성격 (${new Date().toISOString()})\n\n${txt}\n\n탈출 가속 미끄럼각 구동방식별 평균: ${sum}\n`);
