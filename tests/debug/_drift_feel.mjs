// 드리프트 느낌 진단: 짧게 톡 / Shift 놓을 때 미끄럼각·머리 회전 속도를 시간별로
import { CARS } from '../../web/src/sim/cars.js';
import { pack } from '../../web/src/sim/input.js';
import { newCar, frame, beta, FPS } from '../physics_report.mjs';
const spec = CARS.find(c => c.id === 'baram') || CARS[0];
const head = c => { const a = c.axes([]); return Math.atan2(a[6], a[8]) * 180 / Math.PI; };
function run(name, plan, frames = 90) {
  const { c, w } = newCar(spec); c.setSpeed(140 / 3.6);
  const h0 = head(c); let prev = h0; const rows = [];
  for (let f = 0; f < frames; f++) {
    frame(c, w, pack({ thr: 1, kb: 1, ...plan(f) }));
    const h = head(c); let d = h - prev; if (d > 180) d -= 360; if (d < -180) d += 360; prev = h;
    let tot = h - h0; if (tot > 180) tot -= 360; if (tot < -180) tot += 360;
    if ([3, 6, 9, 12, 18, 24, 30, 36, 45, 54, 60, 72, 90, 105, 120].includes(f + 1)) rows.push(`${((f + 1) / FPS).toFixed(2)}s 미끄럼${beta(c).toFixed(0).padStart(4)}° 머리회전속도${(d * FPS).toFixed(0).padStart(5)}°/s 누적${tot.toFixed(0).padStart(5)}° ${c.out.speed * 3.6 | 0}km/h ${c.st.drift ? '드리프트' : ''}`);
  }
  console.log(`\n■ ${name}`); rows.forEach(r => console.log('  ' + r));
}
run('그냥 꺾기(방향키만)', f => ({ steer: 1 }), 60);
run('방향키 누른 채 Shift 0.1초만 톡', f => ({ steer: 1, hb: f < 6 ? 1 : 0 }), 60);
run('방향키 누른 채 Shift 0.25초', f => ({ steer: 1, hb: f < 15 ? 1 : 0 }), 72);
run('드리프트 1.2초 → Shift 만 놓음(방향키는 계속)', f => ({ steer: 1, hb: f < 72 ? 1 : 0 }), 120);
run('드리프트 1.2초 → Shift·방향키 둘 다 놓음', f => ({ steer: f < 72 ? 1 : 0, hb: f < 72 ? 1 : 0 }), 120);
