// 드리프트 유지 시험 — 보조 끔. 원 위에서 사이드로 뒤를 흘린 뒤, 카운터스티어+가속으로 미끄럼각 유지
// 운전: 목표 미끄럼각 β*=28° 를 향해 조향(카운터), 가속은 속도·각도 보고 조절 (사람이 하는 방식 흉내)
// 결과: 차마다 β 를 15°~45° 사이로 몇 초 유지했나, 평균 β, 스핀(>80°) 여부
import fs from 'node:fs';
import { CARS } from '../web/src/sim/cars.js';
import { newCar, frame, FPS } from './physics_report.mjs';
import { pack } from '../web/src/sim/input.js';

const deg = r => r * 180 / Math.PI;
function beta(c) {
  const ax = c.axes([]);
  const vl = c.st.vx * ax[0] + c.st.vz * ax[2], vf = c.st.vx * ax[6] + c.st.vz * ax[8];
  return Math.atan2(vl, Math.max(Math.abs(vf), 0.5));      // + = 차가 오른쪽으로 돌아 있음(속도가 왼쪽)
}
const rows = [];
for (const spec of CARS) {
  const { c, w } = newCar(spec, { tcs: false, abs: true });
  c.setSpeed(55 / 3.6);
  let hold = 0, best = 0, sumB = 0, n = 0, spun = false;
  const target = 25 * Math.PI / 180;
  for (let f = 0; f < FPS * 9; f++) {
    const b = beta(c);
    let inp;
    if (f < 30) inp = { steer: 1, thr: 0.3 };                        // 오른쪽으로 꺾고
    else if (f < 55) inp = { steer: 1, hb: 1, thr: 0 };              // 사이드로 뒤를 흘림
    else {
      // 카운터: 앞바퀴를 진행방향 쪽으로(미끄럼각의 0.9배), 가속으로 각도 유지 (게인은 tests/debug/_drift_search.mjs 로 찾음)
      const e = b - target;
      const steer = Math.max(-1, Math.min(1, (-b * 0.9 + target * 0.4) / c.steerLimit()));
      const thr = Math.max(0.05, Math.min(1, 0.35 - e * 2.5));
      inp = { steer, thr };
    }
    frame(c, w, pack({ ...inp, kb: 0 }));
    if (f >= 55) {
      const bd = deg(Math.abs(b));
      if (bd > 80) spun = true;
      if (bd >= 15 && bd <= 45 && c.out.speed > 6) { hold++; best = Math.max(best, hold); sumB += bd; n++; } else hold = 0;
    }
  }
  rows.push({ spec, secs: best / FPS, avg: n ? sumB / n : 0, spun });
  console.log(`${spec.name}(${spec.drive}) 최장 유지 ${(best / FPS).toFixed(1)}초, 평균 β ${n ? (sumB / n).toFixed(0) : '-'}°${spun ? ', 스핀' : ''}`);
}
const lines = ['| 차 | 구동 | 드리프트 최장 유지(β 15~45°) | 평균 미끄럼각 | 스핀 |', '|---|---|---|---|---|'];
for (const r of rows) lines.push(`| ${r.spec.name}(${r.spec.cls}) | ${r.spec.drive} | ${r.secs.toFixed(1)}초 | ${r.avg.toFixed(0)}° | ${r.spun ? '예' : '아니오'} |`);
fs.writeFileSync('tests/out/drift.md', `# 드리프트 유지 (보조 끔, 자동 카운터스티어)\n\n${lines.join('\n')}\n`);
