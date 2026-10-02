// 보이지 않는 벽 검사(regress 0-2 와 같은 방식)를 맵 하나만: node tests/out/_iw.mjs <id>
import { Sim } from '../../web/src/sim/race.js';
import { collideWall } from '../../web/src/sim/collide.js';
import { datan2 } from '../../web/src/sim/dmath.js';
const id = process.argv[2];
const sim = new Sim({ track: id, laps: 1, players: [{ car: 'masil' }] });
const T = sim.T, c = sim.cars[0], R = new Float64Array(9);
let bad = 0; const list = [];
const nearEnd = i => [...Array(17).keys()].some(q => { const k = (i + q - 8 + T.n) % T.n, k2 = (k + 1) % T.n; return (T.divW[k] > 0) !== (T.divW[k2] > 0); });
for (let i = 0; i < T.n; i++) {
  const fine = nearEnd(i); if (!fine && i % 2) continue;
  for (const tt of fine ? [0, 0.25, 0.5, 0.75] : [0]) {
    const i2 = (i + 1) % T.n;
    for (let d = -T.hw[i] + 1.6; d <= T.hw[i] - 1.6; d += fine ? 0.4 : 1.2) {
      const kx = Math.abs(T.k[i]) * 12;
      if (T.divW[i] > 0 && Math.abs(d - T.div[i]) < T.divW[i] + 1.4 + kx) continue;
      if ([-3, -2, -1, 1, 2, 3].some(q => T.divW[(i + q + T.n) % T.n] > 0 && Math.abs(d - T.div[(i + q + T.n) % T.n]) < 1.6 + kx)) continue;
      const cx = T.x[i] + (T.x[i2] - T.x[i]) * tt, cz = T.z[i] + (T.z[i2] - T.z[i]) * tt;
      const x = cx + T.lx[i] * d, z = cz + T.lz[i] * d;
      c.place(x, T.y[i] + 1, z, datan2(T.tx[i], T.tz[i])); c.st.hint = i; c.axes(R);
      collideWall(c, R, sim.world, null);
      if (Math.abs(c.st.px - x) > 1e-9 || Math.abs(c.st.pz - z) > 1e-9) { bad++; list.push(`${(i * T.ds).toFixed(0)}m d=${d.toFixed(1)} 밀림 ${Math.hypot(c.st.px - x, c.st.pz - z).toFixed(2)}m`); }
    }
  }
}
console.log(`${id}: 밀려난 자리 ${bad}곳`, list.slice(0, 6).join(' / '));
