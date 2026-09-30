import { CARS } from '../../web/src/sim/cars.js';
import { newCar, frame, FPS } from '../physics_report.mjs';
import { pack } from '../../web/src/sim/input.js';
const spec = CARS.find(c => c.id === (process.argv[2] || 'masil'));
const R = 40;
for (const vkmh of [50, 60, 65, 70, 75]) {
  const { c, w } = newCar(spec);
  const cx = R, cz = 0; const vt = vkmh / 3.6;
  let log = null;
  for (let f = 0; f < FPS * 30; f++) {
    const s = c.st;
    const ang = Math.atan2(s.pz - cz, s.px - cx);
    const look = 6 + c.out.speed * 0.35;
    const ax = c.axes([]); const fwdx = ax[6], fwdz = ax[8], lx = ax[0], lz = ax[2];
    let best = null;
    for (const sg of [-1, 1]) { const a2 = ang + sg * look / R; const tx = cx + R * Math.cos(a2), tz = cz + R * Math.sin(a2);
      const d = (tx - s.px) * fwdx + (tz - s.pz) * fwdz; if (!best || d > best[2]) best = [tx, tz, d]; }
    const lat = (best[0] - s.px) * lx + (best[1] - s.pz) * lz, fw = (best[0] - s.px) * fwdx + (best[1] - s.pz) * fwdz;
    const curv = 2 * lat / (lat * lat + fw * fw);
    let st = -Math.atan(spec.wb * curv) / (c.out.maxSteer || 0.5); st = Math.max(-1, Math.min(1, st));
    const v = c.out.fwd; const thr = Math.max(0, Math.min(1, (vt - v) * 0.6 + 0.25));
    frame(c, w, pack({ steer: st, thr, brk: 0, kb: 0 }));
    if (f === FPS * 30 - 1) log = { st: st.toFixed(2), maxSteerDeg: (c.out.maxSteer * 57.3).toFixed(1), r: Math.hypot(s.px - cx, s.pz - cz).toFixed(1), v: (v * 3.6).toFixed(1),
      ay: (v * v / Math.hypot(s.px - cx, s.pz - cz) / 9.81).toFixed(3),
      slip: c.out.wheels.map(o => o.slip.toFixed(2)).join(','), Fz: c.out.wheels.map(o => o.Fz.toFixed(0)).join(','), gear: s.gear, rpm: s.rpm.toFixed(0), tcs: s.tcs.toFixed(2),
      roll: (Math.asin(ax[1]) * 57.3).toFixed(1) };
  }
  console.log(vkmh, JSON.stringify(log));
}
