import { CARS } from '../../web/src/sim/cars.js';
import { newCar, frame, FPS } from '../physics_report.mjs';
import { pack } from '../../web/src/sim/input.js';
const spec = CARS.find(c => c.id === (process.argv[2] || 'cheondung'));
const { c, w } = newCar(spec);
let t = 0;
for (let f = 0; f < FPS * 4; f++) {
  frame(c, w, pack({ thr: 1, kb: 0 }));
  t += 1 / FPS;
  if (f % 6 === 0) {
    const o = c.out;
    console.log(t.toFixed(2), 'v', (o.fwd * 3.6).toFixed(1), 'g', c.st.gear, 'rpm', c.st.rpm.toFixed(0), 'tcs', c.st.tcs.toFixed(2), 'thr', c.st.thr.toFixed(2),
      'kap', c.st.w.map((ww, i) => ((ww.om * c.P.R - o.fwd) / Math.max(Math.abs(o.fwd), 2.5)).toFixed(2)).join(','),
      'Fz', o.wheels.map(x => x.Fz.toFixed(0)).join(','), 'shift', c.st.shiftT.toFixed(2));
  }
}
