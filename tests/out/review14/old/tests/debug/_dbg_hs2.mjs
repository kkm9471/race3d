import { CARS } from '../../web/src/sim/cars.js';
import { newCar, frame, FPS } from '../physics_report.mjs';
import { pack } from '../../web/src/sim/input.js';
const spec = CARS.find(c => c.id === (process.argv[2] || 'masil'));
const kmh = +(process.argv[3] || 180), steer = +(process.argv[4] || 0.06);
const { c, w } = newCar(spec);
c.setSpeed(kmh / 3.6);
for (let f = 0; f < FPS * 2; f++) {
  frame(c, w, pack({ steer, thr: 0.3, kb: 0 }));
  if (f % 6 === 5) { const ax = c.axes([]); const vlat = c.st.vx * ax[0] + c.st.vz * ax[2];
    console.log(((f+1)/60).toFixed(2), 'yaw', c.st.wy.toFixed(3), 'β', (Math.atan2(vlat, c.out.fwd) * 57.3).toFixed(2), 'slip', c.out.wheels.map(o => o.slip.toFixed(2)).join('/'), 'Fz', c.out.wheels.map(o => o.Fz.toFixed(0)).join('/'), 'roll', (Math.asin(ax[1]) * 57.3).toFixed(2), 'esc', c.out.esc, 'δ', (c.out.wheels[0].steer*57.3).toFixed(2)); }
}
