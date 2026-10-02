// 16회차 독립검증 1번 재현: 짧은 드리프트 뒤 가속 키를 떼면 75° 로 돌며 안 끝나던 것 / 코너링 중(→ 누른 채) 떼면 도는 것은 남아야 함
import { CARS } from '../../web/src/sim/cars.js';
import { pack } from '../../web/src/sim/input.js';
import { newCar, frame, beta } from '../physics_report.mjs';
const spec = CARS[1];
const run = (name, plan) => {
  const { c, w } = newCar(spec); c.setSpeed(150 / 3.6);
  let mx = 0, end = 0;
  for (let f = 0; f < 240; f++) { frame(c, w, pack({ kb: 1, ...plan(f) })); mx = Math.max(mx, Math.abs(beta(c))); if (!end && f > 8 && !c.st.drift) end = f; }
  console.log(`${name}: 최대 ${mx.toFixed(0)}°, 끝 f${end || '안 끝남'}, ${(c.out.speed * 3.6).toFixed(0)}km/h`);
};
run('톡 → 가속 계속', f => ({ thr: 1, steer: f < 8 ? 1 : 0, hb: f < 8 ? 1 : 0 }));
run('톡 → 가속 뗌(키 다 뗌)', f => ({ thr: f < 8 ? 1 : 0, steer: f < 8 ? 1 : 0, hb: f < 8 ? 1 : 0 }));
run('톡 → 브레이크', f => ({ thr: f < 8 ? 1 : 0, brk: f < 8 ? 0 : 1, steer: f < 8 ? 1 : 0, hb: f < 8 ? 1 : 0 }));
run('코너링 중(→ 계속) 가속 뗌', f => ({ thr: f < 8 ? 1 : 0, steer: 1, hb: f < 8 ? 1 : 0 }));
run('톡 → 펴지기 직전 ↑ 잠깐 뗐다 누름', f => ({ thr: f >= 40 && f < 44 ? 0 : 1, steer: f < 8 ? 1 : 0, hb: f < 8 ? 1 : 0 }));
