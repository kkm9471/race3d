import { Sim, GO_FRAME, FPS } from '../../../web/src/sim/race.js';
import { pack, unpack } from '../../../web/src/sim/input.js';
import { MAP_IDS } from '../../../web/src/sim/maps/index.js';
import * as B from '../../../web/src/sim/bot.js';
const opts = JSON.parse(process.env.OPTS || '{}');
const skill = opts.skill ?? 0.95, carId = opts.car ?? 'masil', boostBefore = opts.boost ?? 0;
let bad = 0, tot = 0;
for (const id of MAP_IDS) {
  const s0 = new Sim({ track: id, laps: 3, players: [{ car: carId, name: 'h' }] });
  const def = s0.T.def;
  for (const f of def.features) if (f.t === 'ramp') {
    const sim = new Sim({ track: id, laps: 3, players: [{ car: carId, name: 'h' }] });
    const T = sim.T, n = T.n, ds = T.ds, c = sim.cars[0], st = c.st;
    const e = T.segAt(f.seg, f.at);
    const start = (e - Math.round(200 / ds) + n) % n;
    const x = T.x[start], z = T.z[start], yaw = Math.atan2(T.tx[start], T.tz[start]);
    c.place(x, sim.groundY(x, z, start) + c.spec.cgH + 0.05, z, yaw); st.hint = start; for (const w of st.w) w.hint = start;
    c.setSpeed(c.P.vtop * 0.9); sim.gs.frame = GO_FRAME + 10000;
    let strong = 0, hits = 0, resets = 0; const where = [];
    let boosted = false;
    for (let k = 0; k < 60 * 25; k++) {
      let v = B.botInput(sim, 0, skill); const inp = unpack(v);
      // 사람처럼: 점프대 앞 60m 에서 부스터 사용 (게이지 보유 가정)
      const rel = ((st.hint - e) % n + n) % n, r = rel > n / 2 ? rel - n : rel;
      let bo = 0; if (boostBefore && !boosted && r * ds > -boostBefore) { st.boosts = 2; bo = 1; boosted = true; }
      v = pack({ ...inp, kb: 1, bo });
      sim.step([v]);
      for (const ev of sim.events) { if (ev.t === 'wall') { hits++; if (ev.vn > 5) { strong++; where.push(`${(r*ds).toFixed(0)}m:${ev.vn.toFixed(0)}`); } } if (ev.t === 'reset') resets++; }
      if (r * ds > 220) break;
    }
    tot++; if (strong) bad++;
    console.log(`${id} ramp@${(e*ds).toFixed(0)}: strong=${strong} resets=${resets} ${where.slice(0,6).join(' ')}`);
  }
}
console.log('total', tot, 'bad', bad, JSON.stringify(opts));
