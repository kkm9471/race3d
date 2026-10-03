// 18대: 톡·풀 드리프트(영상 순서, 펴지면 반대 방향키 뗌)의 가는 방향 총 회전(3초)
import { CARS } from '../../web/src/sim/cars.js';
import { pack } from '../../web/src/sim/input.js';
import { newCar, frame, FPS, fullPlan } from '../physics_report.mjs';
const turnOf = (spec, plan) => {
  const { c, w } = newCar(spec); c.setSpeed(150 / 3.6);
  const pa = () => Math.atan2(c.st.vx, c.st.vz) * 180 / Math.PI;
  let pp = pa(), tot = 0;
  for (let f = 0; f < FPS * 3; f++) { frame(c, w, pack(plan(f, c))); let d = pa() - pp; if (d > 180) d -= 360; if (d < -180) d += 360; pp = pa(); tot += d; }
  return Math.abs(tot);
};
const rows = CARS.map(s => { let off = 0; return [s.name, turnOf(s, f => ({ thr: 1, steer: f < 8 ? 1 : 0, hb: f < 8 ? 1 : 0, kb: 1 })), turnOf(s, (f, c) => { const p = fullPlan(f); if (f >= 57 && !c.st.drift) off = 1; if (off) p.steer = 0; return p; })]; });
for (const r of rows) console.log(r[0].padEnd(8), '톡', r[1].toFixed(0), '풀', r[2].toFixed(0));
const mm = i => [Math.min(...rows.map(r => r[i])), Math.max(...rows.map(r => r[i]))];
console.log('범위: 톡', mm(1).map(v => v.toFixed(0)).join('~'), '풀', mm(2).map(v => v.toFixed(0)).join('~'));
