import { CARS } from '../web/src/sim/cars.js';
import { newCar, frame, FPS } from './physics_report.mjs';
import { pack } from '../web/src/sim/input.js';
const spec = CARS.find(c => c.id === process.argv[2]);
const { c, w } = newCar(spec);
for (let f = 0; f < FPS * 90; f++) { frame(c, w, pack({ thr: 1, kb: 0 }));
  if (f % (FPS * 5) === 0) console.log((f / FPS).toFixed(0), 's', (c.out.fwd * 3.6).toFixed(1), 'gear', c.st.gear, 'rpm', c.st.rpm.toFixed(0), 'thr', c.st.thr.toFixed(2), 'tcs', c.st.tcs.toFixed(2), 'shiftT', c.st.shiftT.toFixed(2)); }
