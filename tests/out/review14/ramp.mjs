import { Sim, GO_FRAME } from '../../../web/src/sim/race.js';
import { pack } from '../../../web/src/sim/input.js';
import { TRACK_DEFS } from '../../../web/src/sim/tracks.js';
import { MAP_IDS } from '../../../web/src/sim/maps/index.js';
const boost = process.env.BOOST === '1';
for (const id of MAP_IDS) {
  const def = TRACK_DEFS.find(d => d.id === id);
  const sim = new Sim({ track: id, laps: 3, players: [{ car: 'masil', name: 'h' }] });
  const T = sim.T, n = T.n, ds = T.ds, c = sim.cars[0], st = c.st;
  for (const f of def.features) if (f.t === 'ramp') {
    const e = T.segAt(f.seg, f.at);
    const i0 = (e - Math.round(140 / ds) + n) % n;
    const g0 = sim.world; 
    const yaw = Math.atan2(T.tx[i0], T.tz[i0]);
    const y = sim.groundY(T.x[i0], T.z[i0], i0) + c.spec.cgH + 0.05;
    c.place(T.x[i0], y, T.z[i0], yaw); st.hint = i0; for (const w of st.w) w.hint = i0;
    c.setSpeed(c.P.vtop * (boost ? 1.25 : 1));
    sim.gs.frame = GO_FRAME + 10000; st.prog = 0;
    let airStart = -1, airEnd = -1, maxH = 0, maxAirLen = 0, ev = [];
    let hits = 0;
    for (let k = 0; k < 600; k++) {
      sim.step([pack({ thr: 1, kb: 1, steer: 0, bo: boost && k < 3 ? 1 : 0 })]);
      for (const e of sim.events) if (e.t === 'wall') hits++;
      const loc = sim.world.locate(st.px, st.pz, st.hint); const s = loc.s;
      if (c.out.speed < 0.1) break;
      const ra = ((s - e * ds) % T.L + T.L * 1.5) % T.L - T.L / 2; // relative to ramp end
      if (st.air > 0 && airStart < 0) airStart = ra;
      if (st.air > 0) airEnd = ra;
      if (ra > 120) break;
    }
    // corner after ramp
    let cd = null; for (let k = 1; k < 400; k++) if (Math.abs(T.k[(e + k) % n]) > 1/80) { cd = k * ds; break; }
    console.log(`${id} ramp@${(e*ds).toFixed(0)} h${f.h}: air ${airStart.toFixed(0)}..${airEnd.toFixed(0)}m(after end) corner@${cd}m wall=${hits} v=${(c.out.speed*3.6).toFixed(0)} grade=${(T.grade[e]*100).toFixed(1)}%`);
  }
}
