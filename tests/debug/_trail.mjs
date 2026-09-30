// 평지 트레일 브레이킹: 속도 v 에서 조향 유지 + 제동 b → 최대 β (보조 켬/끔)
import { CARS } from '../../web/src/sim/cars.js';
import { newCar, frame, FPS } from '../physics_report.mjs';
import { pack } from '../../web/src/sim/input.js';
const kmh = +(process.argv[2] || 150);
for (const spec of CARS) {
  const row = [];
  for (const assist of [true, false]) for (const [st, b] of [[0.10, 0.45], [0.2, 0.45], [0.2, 1.0]]) {
    const { c, w } = newCar(spec, { tcs: assist, abs: spec.brake.abs });
    c.setSpeed(kmh / 3.6);
    let mb = 0;
    for (let f = 0; f < FPS * 3; f++) {
      const steer = Math.min(1, st / c.steerLimit());
      frame(c, w, pack({ steer, brk: f > 20 ? b : 0, kb: 0 }));
      const ax = c.axes([]);
      const vl = c.st.vx * ax[0] + c.st.vz * ax[2], vf = c.st.vx * ax[6] + c.st.vz * ax[8];
      if (c.out.speed > 3) mb = Math.max(mb, Math.abs(Math.atan2(vl, Math.abs(vf)) * 57.3));
    }
    row.push(mb.toFixed(0).padStart(3));
  }
  console.log(spec.name.padEnd(4), spec.drive.padEnd(3), '보조켬[조향.1/제.45 조향.2/제.45 조향.2/제1]', row.slice(0, 3).join(' '), '| 보조끔', row.slice(3).join(' '));
}
