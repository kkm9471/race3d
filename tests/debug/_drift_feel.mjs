// 드리프트 느낌 진단: 영상(카트라이더 공식 가이드)과 같은 키 순서로 미끄럼각·머리 회전·속도를 시간별로
// 사용법: node tests/debug/_drift_feel.mjs [손맛번호 0~2] [시작 km/h]
import { CARS } from '../../web/src/sim/cars.js';
import { pack } from '../../web/src/sim/input.js';
import { setDriftPreset } from '../../web/src/sim/car.js';
import { newCar, frame, beta, FPS } from '../physics_report.mjs';
const pre = +(process.argv[2] || 0), v0 = +(process.argv[3] || 150);
console.log('손맛:', setDriftPreset(pre).name, '· 시작', v0, 'km/h');
const spec = CARS.find(c => c.id === 'baram') || CARS[0];
const head = c => { const a = c.axes([]); return Math.atan2(a[6], a[8]) * 180 / Math.PI; };
function run(name, plan, frames, marks) {
  const { c, w } = newCar(spec); c.setSpeed(v0 / 3.6);
  const h0 = head(c); let prev = h0, tot = 0; const rows = [];
  for (let f = 0; f < frames; f++) {
    frame(c, w, pack({ thr: 1, kb: 1, ...plan(f) }));
    const h = head(c); let d = h - prev; if (d > 180) d -= 360; if (d < -180) d += 360; prev = h; tot += d;
    if ((f + 1) % 6 === 0) rows.push(`${((f + 1) / FPS).toFixed(1)}s 미끄럼${beta(c).toFixed(0).padStart(4)}° 머리${(d * FPS).toFixed(0).padStart(5)}°/s 누적${tot.toFixed(0).padStart(5)}° ${(c.out.speed * 3.6).toFixed(0)}km/h${c.st.drift ? ' D' : ''}${c.st.instT > 0 ? ' 순부기회' : ''}`);
  }
  console.log(`\n■ ${name}`); rows.forEach(r => console.log('  ' + r));
}
run('짧게 톡: Shift+→ 0.13초, 뒤엔 ↑만', f => ({ steer: f < 8 ? 1 : 0, hb: f < 8 ? 1 : 0 }), 108);
run('풀: Shift+→ 0.7초 → 0.25초 아무것도 → ← 0.75초 → ↑ 뗐다 누름', f => ({ steer: f < 42 ? 1 : f < 57 ? 0 : f < 102 ? -1 : 0, hb: f < 42 ? 1 : 0, thr: f >= 102 && f < 106 ? 0 : 1 }), 150);
run('풀인데 카운터 안 함(키 다 뗌)', f => ({ steer: f < 42 ? 1 : 0, hb: f < 42 ? 1 : 0 }), 180);
