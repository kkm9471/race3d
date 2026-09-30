// 평지 고속 선회: 일정 조향으로 약 0.5g 선회 중 가속 → 뗌 → 약한 제동. β·횡가속 기록
import { CARS } from '../../web/src/sim/cars.js';
import { newCar, frame, FPS } from '../physics_report.mjs';
import { pack } from '../../web/src/sim/input.js';
const id = process.argv[2] || 'beongae', kmh = +(process.argv[3] || 165), stS = +(process.argv[4] || 0.03);
const spec = CARS.find(c => c.id === id);
const { c, w } = newCar(spec, {});
c.setSpeed(kmh / 3.6);
let pvx = 0, pvz = 0;
for (let f = 0; f < FPS * 6; f++) {
  const ph = f < FPS * 2 ? 'thr' : f < FPS * 3 ? 'lift' : 'brk';
  const steer = Math.min(1, stS / c.steerLimit());
  const inp = ph === 'thr' ? { steer, thr: 0.35 } : ph === 'lift' ? { steer } : { steer, brk: 0.4 };
  frame(c, w, pack({ ...inp, kb: 0 }));
  const ax = c.axes([]);
  const vl = c.st.vx * ax[0] + c.st.vz * ax[2], vf = c.st.vx * ax[6] + c.st.vz * ax[8];
  const alat = Math.hypot(c.st.vx - pvx, c.st.vz - pvz) * FPS / 9.81; pvx = c.st.vx; pvz = c.st.vz;
  if (f % 15 === 0) console.log(`${(f / FPS).toFixed(2)}s ${ph} v=${(vf * 3.6).toFixed(0)} β=${(Math.atan2(vl, Math.abs(vf)) * 57.3).toFixed(1)} a=${alat.toFixed(2)}g 조향각=${(steer * c.steerLimit()).toFixed(3)}`);
}
