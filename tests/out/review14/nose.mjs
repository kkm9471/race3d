import { Sim, GO_FRAME, FPS } from '../../../web/src/sim/race.js';
import { pack } from '../../../web/src/sim/input.js';
import { MAP_IDS } from '../../../web/src/sim/maps/index.js';
const carId = 'masil';
let worst = [];
for (const id of MAP_IDS) {
  const s0 = new Sim({ track: id, laps: 3, players: [{ car: carId, name: 'h' }] });
  const T = s0.T, n = T.n, ds = T.ds;
  T.splits.forEach((sp, k) => {
    for (const end of ['head', 'tail']) for (const yawOff of [0, 0.35]) for (const dOff of [-0.8, -0.4, 0, 0.4, 0.8]) {
      const sim = new Sim({ track: id, laps: 3, players: [{ car: carId, name: 'h' }] });
      const c = sim.cars[0], st = c.st;
      // head: 진행 방향으로 분리대 코에 / tail: 역주행 아님 — 같은 방향이되 분리대 끝 쪽(뒤)에서 옆으로 비스듬히 들어옴
      const idx = end === 'head' ? (sp.a - Math.round(16 / ds) + n) % n : (sp.b - Math.round(10 / ds) + n) % n;
      const dv = T.div[end === 'head' ? sp.a : sp.b];
      const d0 = dv + dOff;
      const x = T.x[idx] + T.lx[idx] * d0, z = T.z[idx] + T.lz[idx] * d0;
      const yaw = Math.atan2(T.tx[idx], T.tz[idx]) + (end === 'tail' ? yawOff * (sp.side) * -1 * (dOff <= 0 ? 1 : -1) : 0);
      c.place(x, sim.groundY(x, z, idx) + c.spec.cgH + 0.05, z, yaw); st.hint = idx; for (const w of st.w) w.hint = idx;
      c.setSpeed(c.P.vtop * 0.8); sim.gs.frame = GO_FRAME + 10000;
      let hits = 0, strong = 0, vmin = 1e9; let flip = 0;
      for (let f = 0; f < 120; f++) { sim.step([pack({ thr: 1, kb: 1 })]); for (const e of sim.events) if (e.t === 'wall') { hits++; if (e.vn > 5) strong++; } vmin = Math.min(vmin, c.out.speed * 3.6); if (st.flipT > 0) flip++; }
      if (strong || flip || vmin < 40) worst.push(`${id} s${k} ${end} yawOff=${yawOff} dOff=${dOff}: strong=${strong} vmin=${vmin.toFixed(0)} flip=${flip}`);
    }
  });
}
console.log(worst.length ? worst.join('\n') : 'no problems'); 
