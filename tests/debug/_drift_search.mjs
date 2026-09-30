import { CARS } from '../../web/src/sim/cars.js';
import { newCar, frame, FPS } from '../physics_report.mjs';
import { pack } from '../../web/src/sim/input.js';
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['baram', 'cheondung', 'chueok', 'jimkkun', 'heukmeonji', 'masil'];
for (const id of ids) {
  const spec = CARS.find(c => c.id === id);
  let best = { t: 0 };
  for (const kff of [0.7, 0.9, 1.1]) for (const ky of [0, 0.15, 0.3]) for (const tb of [0.35, 0.5, 0.65, 0.8]) for (const kt of [1, 2.5]) {
    const { c, w } = newCar(spec, { tcs: false });
    c.setSpeed(55 / 3.6);
    let hold = 0, mx = 0, sb = 0, n = 0;
    const tgt = 25 * Math.PI / 180;
    for (let f = 0; f < FPS * 8; f++) {
      const ax = c.axes([]);
      const vl = c.st.vx * ax[0] + c.st.vz * ax[2], vf = c.st.vx * ax[6] + c.st.vz * ax[8];
      const b = Math.atan2(vl, Math.max(Math.abs(vf), 0.5));
      const dmax = c.steerLimit();
      let inp;
      if (f < 30) inp = { steer: 1, thr: 0.3 }; else if (f < 50) inp = { steer: 1, hb: 1 };
      else {
        const e = b - tgt;
        // 카운터: 앞바퀴를 진행방향 쪽으로(β 만큼) + 요 속도 감쇠, 가속으로 각도 유지
        const steer = Math.max(-1, Math.min(1, (-b * kff + (tgt * 0.4)) / dmax + ky * (-c.st.wy - 0.9)));
        const thr = Math.max(0.05, Math.min(1, tb - e * kt));
        inp = { steer, thr };
      }
      frame(c, w, pack({ ...inp, kb: 0 }));
      if (f >= 50) { const bd = Math.abs(b) * 57.3; if (bd >= 15 && bd <= 45 && c.out.speed > 5) { hold++; mx = Math.max(mx, hold); sb += bd; n++; } else hold = 0; }
    }
    if (mx > best.t) best = { t: mx, kff, ky, tb, kt, avg: n ? sb / n : 0 };
  }
  console.log(`${spec.name}(${spec.drive}): 최장 ${(best.t / FPS).toFixed(1)}초 (kff ${best.kff}, ky ${best.ky}, 가속 ${best.tb}, kt ${best.kt}, 평균 β ${best.avg?.toFixed(0)}°)`);
}
