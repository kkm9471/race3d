import { CARS } from '../../web/src/sim/cars.js';
import { newCar, frame, FPS } from '../physics_report.mjs';
import { pack } from '../../web/src/sim/input.js';
const kmh = +(process.argv[3] || 200), steer = +(process.argv[4] || 0.08);
for (const spec of CARS.filter(c => !process.argv[2] || process.argv[2] === 'all' || c.id === process.argv[2])) {
  const { c, w } = newCar(spec);
  c.setSpeed(kmh / 3.6);
  const rows = [];
  for (let f = 0; f < FPS * 4; f++) {
    // 속도 유지용 가속
    const thr = c.out.fwd < kmh / 3.6 ? 0.6 : 0.2;
    frame(c, w, pack({ steer, thr, kb: 0 }));
    if (f % 30 === 29) { const ax = c.axes([]); const vlat = c.st.vx * ax[0] + c.st.vz * ax[2]; rows.push(`${c.st.wy.toFixed(3)}/${(Math.atan2(vlat, c.out.fwd) * 57.3).toFixed(1)}°`); }
  }
  console.log(spec.id.padEnd(11), 'δ=' + (c.out.maxSteer * steer * 57.3).toFixed(2) + '°', 'yaw/β:', rows.join(' '));
}
