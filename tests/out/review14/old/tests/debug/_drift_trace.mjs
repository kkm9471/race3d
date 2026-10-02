import { CARS } from '../../web/src/sim/cars.js';
import { newCar, frame, FPS } from '../physics_report.mjs';
import { pack } from '../../web/src/sim/input.js';
const spec = CARS.find(c => c.id === (process.argv[2] || 'baram'));
const { c, w } = newCar(spec, { tcs: false });
c.setSpeed(55 / 3.6);
const target = 28 * Math.PI / 180;
for (let f = 0; f < FPS * 5; f++) {
  const ax = c.axes([]);
  const vl = c.st.vx * ax[0] + c.st.vz * ax[2], vf = c.st.vx * ax[6] + c.st.vz * ax[8];
  const b = Math.atan2(vl, Math.max(Math.abs(vf), 0.5));
  let inp;
  if (f < 30) inp = { steer: 1, thr: 0.3 }; else if (f < 55) inp = { steer: 1, hb: 1, thr: 0 };
  else { const e = b - target; inp = { steer: Math.max(-1, Math.min(1, 0.4 - e * 3.2 - c.st.wy * 0.25)), thr: Math.max(0, Math.min(1, 0.55 - e * 2.2 + (c.out.speed < 12 ? 0.3 : 0))) }; }
  frame(c, w, pack({ ...inp, kb: 0 }));
  if (f % 6 === 0 && f >= 24) console.log((f / 60).toFixed(2), 'β', (b * 57.3).toFixed(0), 'yaw', c.st.wy.toFixed(2), 'v', (c.out.speed * 3.6).toFixed(0), 'st', inp.steer.toFixed(2), 'δmax', (c.out.maxSteer * 57.3).toFixed(0), 'thr', c.st.thr.toFixed(2), 'g', c.st.gear, 'rpm', c.st.rpm.toFixed(0), 'rs', c.out.wheels.slice(2).map(q => q.sr.toFixed(2)).join('/'), 'fs', c.out.wheels.slice(0, 2).map(q => (Math.atan(q.sa) * 57.3).toFixed(0)).join('/'));
}
