import { CARS } from '../../web/src/sim/cars.js';
import { pack } from '../../web/src/sim/input.js';
import { newCar, frame, beta } from '../physics_report.mjs';
for (const thr of [1, 0.45, 0]) for (const brk of [0, 1]) {
  if (thr && brk) continue;
  const { c, w } = newCar(CARS[0]); c.setSpeed(150 / 3.6);
  for (let f = 0; f < 8; f++) frame(c, w, pack({ thr: 1, steer: 1, hb: 1, kb: 0 }));
  let mb = 0, endF = -1, v1 = 0;
  for (let f = 0; f < 300; f++) { frame(c, w, pack({ thr, brk: brk ? 0.5 : 0, kb: 0 })); mb = Math.max(mb, Math.abs(beta(c))); if (endF < 0 && !c.st.drift) { endF = f; v1 = c.out.speed * 3.6; } }
  console.log(`톡 뒤 thr ${thr} brk ${brk}: 최대 beta ${mb.toFixed(0)}° 끝 f${endF} 그때 ${v1.toFixed(0)}km/h`);
}
