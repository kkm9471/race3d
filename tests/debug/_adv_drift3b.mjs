import { CARS } from '../../web/src/sim/cars.js';
import { pack } from '../../web/src/sim/input.js';
import { newCar, frame, beta, FPS } from '../physics_report.mjs';
const spec = CARS[0];
const kmh = c => c.out.speed * 3.6;
// 공중 자세히
{
  const { c, w } = newCar(spec); c.setSpeed(150 / 3.6);
  for (let f = 0; f < 24; f++) frame(c, w, pack({ thr: 1, steer: 1, hb: 1, kb: 1 }));
  c.st.py += 3; c.st.vy = 4;
  for (let f = 0; f < 140; f++) {
    frame(c, w, pack({ thr: 1, steer: 1, hb: 1, kb: 1 }));
    if (f % 6 === 0 || (f > 70 && f < 100 && f % 2 === 0)) console.log(f, 'air', c.st.air, 'drift', c.st.drift, 'beta', beta(c).toFixed(1), 'dB', c.st.dB.toFixed(2), 'dR', c.st.dR.toFixed(2), 'wy', c.st.wy.toFixed(2), 'v', kmh(c).toFixed(0), 'fwd', (c.out.fwd*3.6).toFixed(0), 'py', c.st.py.toFixed(2));
  }
}
