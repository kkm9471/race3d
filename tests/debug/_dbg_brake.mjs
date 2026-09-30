import { CARS } from '../../web/src/sim/cars.js';
import { newCar, frame, FPS } from '../physics_report.mjs';
import { pack } from '../../web/src/sim/input.js';
const spec = CARS.find(c => c.id === (process.argv[2] || 'masil'));
for (const steer of [0, 0.03]) {
  const { c, w } = newCar(spec);
  c.setSpeed(135 / 3.6);
  console.log('--- steer', steer);
  for (let f = 0; f < FPS * 3; f++) {
    frame(c, w, pack({ steer, brk: 0.45, kb: 0 }));
    if (f % 15 === 0) { const ax = c.axes([]); const vlat = c.st.vx * ax[0] + c.st.vz * ax[2];
      console.log((f / 60).toFixed(2), 'v', (c.out.fwd * 3.6).toFixed(0), 'yr', c.st.wy.toFixed(3), 'vlat', vlat.toFixed(2), 'Fz', c.out.wheels.map(o => o.Fz.toFixed(0)).join('/'), 'om', c.st.w.map(q => (q.om * c.P.R * 3.6).toFixed(1)).join('/'), 'abs', c.st.w.map(q => q.abs.toFixed(2)).join('/'), 'gear', c.st.gear, 'pitch', (Math.asin(-c.axes([])[7]) * 57.3).toFixed(2)); }
  }
}
