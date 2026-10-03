// 차마다 드리프트 반응 비교: 그냥 꺾기 회전, 톡 회전량·최대 회전 속도, 풀 드리프트 최대 회전 속도·회전량, 회전 속도의 프레임 간 흔들림(예민함), 바퀴 접지 끊김
import { CARS } from '../../web/src/sim/cars.js';
import { pack } from '../../web/src/sim/input.js';
import { newCar, frame, FPS, fullPlan } from '../physics_report.mjs';
const head = c => { const a = c.axes([]); return Math.atan2(a[6], a[8]) * 180 / Math.PI; };
function run(spec, plan, frames) {
  const { c, w } = newCar(spec); c.setSpeed(150 / 3.6);
  let ph = head(c), tot = 0, pk = 0, prevRate = 0, jit = 0, n = 0, lost = 0;
  for (let f = 0; f < frames; f++) {
    frame(c, w, pack({ kb: 1, ...plan(f) }));
    let d = head(c) - ph; if (d > 180) d -= 360; if (d < -180) d += 360; ph = head(c); tot += d;
    const rate = d * FPS; pk = Math.max(pk, Math.abs(rate));
    if (f > 2) { jit += Math.abs(rate - prevRate); n++; } prevRate = rate;
    lost += c.out.wheels.filter(x => !x.contact).length;
  }
  return { tot: Math.abs(tot), pk, jit: jit / n, lost };
}
console.log('차 | 코너·드리프트 점수 | 그냥꺾기 1초 회전° | 톡: 회전°·최대°/s·흔들림 | 풀: 회전°·최대°/s·흔들림 | 바퀴 뜸(프레임·바퀴)');
for (const s of CARS) {
  const g = run(s, f => ({ thr: 1, steer: 1 }), 60);
  const t = run(s, f => ({ thr: 1, steer: f < 8 ? 1 : 0, hb: f < 8 ? 1 : 0 }), 120);
  const fu = run(s, f => fullPlan(f), 120);
  console.log(`${s.name.padEnd(8)} | ${s.stats.corner}·${s.stats.drift} | ${g.tot.toFixed(0)} | ${t.tot.toFixed(0)}·${t.pk.toFixed(0)}·${t.jit.toFixed(1)} | ${fu.tot.toFixed(0)}·${fu.pk.toFixed(0)}·${fu.jit.toFixed(1)} | ${g.lost + t.lost + fu.lost}`);
}
