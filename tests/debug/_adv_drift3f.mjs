import { CARS } from '../../web/src/sim/cars.js';
import { setDriftPreset } from '../../web/src/sim/car.js';
import { pack } from '../../web/src/sim/input.js';
import { newCar, frame, beta, FPS } from '../physics_report.mjs';
for (const spec of [CARS[0], CARS[CARS.length - 1]]) for (const pre of [0, 1, 2]) for (const cut of [0, 1]) {
  setDriftPreset(pre);
  const { c, w } = newCar(spec); c.setSpeed(160 / 3.6);
  for (let f = 0; f < 50; f++) frame(c, w, pack({ thr: 1, steer: 1, hb: 1, kb: 1 }));
  let mn = 99, endF = -1, bEnd = 0, mwy = 0;
  for (let f = 0; f < 120; f++) {
    frame(c, w, pack({ thr: 1, steer: -1, hb: cut, kb: 1 }));
    const b = beta(c); mn = Math.min(mn, b); mwy = Math.max(mwy, Math.abs(c.st.wy));
    if (endF < 0 && !c.st.drift) { endF = f; bEnd = b; }
  }
  console.log(`${spec.name} p${pre} ${cut ? '끊기' : '카운터'}: 끝 f${endF} 끝 beta ${bEnd.toFixed(1)} 최소 beta ${mn.toFixed(1)} 최대 회전 ${mwy.toFixed(2)} 2초 뒤 beta ${beta(c).toFixed(1)}`);
}
setDriftPreset(0);
