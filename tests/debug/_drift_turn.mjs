// 16회차: 드리프트로 '돌린 만큼 딱 꺾이나' — 머리 방향 누적과 가는 방향 누적, 끝난 뒤 둘의 차이, 머리가 되돌아간 양 / 톡톡이 유지
import { CARS } from '../../web/src/sim/cars.js';
import { pack } from '../../web/src/sim/input.js';
import { newCar, frame, beta, FPS, fullPlan } from '../physics_report.mjs';
const spec = CARS[1];
const head = c => { const a = c.axes([]); return Math.atan2(a[6], a[8]) * 180 / Math.PI; };
const path = c => Math.atan2(c.st.vx, c.st.vz) * 180 / Math.PI;
function run(name, plan, frames) {
  const { c, w } = newCar(spec); c.setSpeed(150 / 3.6);
  const h0 = head(c), p0 = path(c); let hMin = 0, hEnd = 0, pEnd = 0, rows = [];
  const un = d => { while (d > 180) d -= 360; while (d < -180) d += 360; return d; };
  let hp = 0, pp = 0, ph = h0, ppth = p0;
  for (let f = 0; f < frames; f++) {
    frame(c, w, pack({ kb: 1, ...plan(f) }));
    hp += un(head(c) - ph); ph = head(c); pp += un(path(c) - ppth); ppth = path(c);
    hMin = Math.min(hMin, hp);
    if ((f + 1) % 15 === 0) rows.push(`${((f + 1) / FPS).toFixed(2)}s 머리${hp.toFixed(0)}° 가는${pp.toFixed(0)}° 미끄럼${beta(c).toFixed(0)}° ${(c.out.speed * 3.6).toFixed(0)}km/h${c.st.drift ? ' D' : ''}${c.out.tok ? ' 톡톡' : ''}`);
  }
  console.log(`\n■ ${name}\n  ` + rows.join('\n  ') + `\n  → 머리 최대 ${hMin.toFixed(0)}°, 끝 머리 ${hp.toFixed(0)}° / 가는 방향 ${pp.toFixed(0)}° (머리가 되돌아간 양 ${(hp - hMin).toFixed(0)}°)`);
}
run('풀 드리프트(영상 순서)', f => fullPlan(f), 150);
run('짧게 톡', f => ({ thr: 1, steer: f < 8 ? 1 : 0, hb: f < 8 ? 1 : 0 }), 120);
// 톡톡이: 드리프트 건 뒤 반대키 한 번 → 꺾은 쪽을 0.2초마다 톡(0.07초) 3초
run('톡톡이(끌기) 3초', f => ({ thr: 1, hb: f < 20 ? 1 : 0, steer: f < 20 ? 1 : f < 26 ? -1 : (f - 26) % 12 < 4 ? 1 : 0 }), 210);
run('톡톡이 없이 그냥 끌기(키 뗌)', f => ({ thr: 1, hb: f < 20 ? 1 : 0, steer: f < 20 ? 1 : f < 26 ? -1 : 0 }), 210);
