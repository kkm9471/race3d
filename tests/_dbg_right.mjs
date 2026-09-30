import { CARS } from '../web/src/sim/cars.js';
import { newCar, frame, FPS } from './physics_report.mjs';
import { pack } from '../web/src/sim/input.js';
const spec = CARS.find(c => c.id === 'masil');
for (const steer of [-0.3, 0.3]) {
  const { c, w } = newCar(spec);
  c.setSpeed(50 / 3.6);
  let out = [];
  for (let f = 0; f < FPS * 6; f++) {
    frame(c, w, pack({ steer, thr: 0.3, kb: 0 }));
    if (f % 60 === 59) { const ax = c.axes([]); const vlat = c.st.vx * ax[0] + c.st.vz * ax[2];
      out.push(`t${(f + 1) / 60} v${(c.out.fwd * 3.6).toFixed(0)} yawr${c.st.wy.toFixed(3)} vlat${vlat.toFixed(2)} x${c.st.px.toFixed(1)}`); }
  }
  console.log('steer', steer, out.join(' | '));
}
