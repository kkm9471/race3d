import { Sim, GO_FRAME, FPS } from '../../../web/src/sim/race.js';
import { pack, unpack } from '../../../web/src/sim/input.js';
import { MAP_IDS } from '../../../web/src/sim/maps/index.js';
import * as SC from './bot_sc.mjs';
import * as ORIG from '../../../web/src/sim/bot.js';
const opts = JSON.parse(process.env.OPTS || '{}');
const skill = opts.skill ?? 0.95, drift = opts.drift ?? 0, shortcut = opts.shortcut ?? 1, carId = opts.car ?? 'masil';
function run(id, k) {
  const sim = new Sim({ track: id, laps: 3, players: [{ car: carId, name: 'h' }] });
  const T = sim.T, n = T.n, c = sim.cars[0], st = c.st, sp = T.splits[k];
  const B = shortcut ? SC : ORIG;
  c.botData = B.prepareBot(T, c.spec);
  const start = (sp.a - Math.round(150 / T.ds) + n) % n;
  const x = T.x[start], z = T.z[start], yaw = Math.atan2(T.tx[start], T.tz[start]);
  c.place(x, sim.groundY(x, z, start) + c.spec.cgH + 0.05, z, yaw); st.hint = start; for (const w of st.w) w.hint = start;
  c.setSpeed(c.P.vtop * 0.9); sim.gs.frame = GO_FRAME + 10000;
  const endI = (sp.b + Math.round(60 / T.ds)) % n, len = ((endI - start) % n + n) % n;
  let hits = 0, strong = 0, resets = 0, minV = 1e9, f = 0, worstVn = 0, hitAt = [];
  for (f = 0; f < 60 * 40; f++) {
    let v = B.botInput(sim, 0, skill);
    const inp = unpack(v);
    const rel = ((st.hint - sp.a) % n + n) % n; const r = rel > n / 2 ? rel - n : rel;
    if (drift && r >= -Math.round(20 / T.ds) && r <= ((sp.b - sp.a) % n + n) % n && Math.abs(inp.steer) > 0.3) v = pack({ ...inp, hb: 1, kb: 1 });
    else v = pack({ ...inp, kb: 1 });
    sim.step([v]);
    for (const e of sim.events) { if (e.t === 'wall') { hits++; if (e.vn > 5) { strong++; hitAt.push(`${(r*T.ds).toFixed(0)}m:${e.vn.toFixed(0)}`); } worstVn = Math.max(worstVn, e.vn); } if (e.t === 'reset') resets++; }
    minV = Math.min(minV, c.out.speed * 3.6);
    if (((st.hint - start) % n + n) % n >= len && ((st.hint - start) % n + n) % n < n / 2) break;
  }
  return { f, hits, strong, resets, minV, worstVn, hitAt };
}
const only = process.argv.slice(2);
let tot = 0, bad = 0;
for (const id of MAP_IDS) {
  if (only.length && !only.includes(id)) continue;
  const sim = new Sim({ track: id, laps: 3, players: [{ car: carId, name: 'h' }] });
  sim.T.splits.forEach((sp, k) => {
    const r = run(id, k); tot++; if (r.strong) bad++;
    console.log(`${id} s${k}@${(sp.a * sim.T.ds).toFixed(0)}: ${(r.f / FPS).toFixed(2)}s walls=${r.hits} strong=${r.strong} reset=${r.resets} minV=${r.minV.toFixed(0)} ${r.hitAt.join(' ')}`);
  });
}
console.log(`total ${tot} strong-bad ${bad}`, JSON.stringify(opts));
