import { Sim, FPS } from '../web/src/sim/race.js';
const [track = 'circuit', car = 'masil'] = process.argv.slice(2);
const sim = new Sim({ track, laps: 3, players: [{ car, name: 'bot', bot: true }] });
const c = sim.cars[0];
let last = 0;
while (!c.st.fin && sim.gs.frame < FPS * 600) {
  const before = { s: c.st.sPrev, off: c.st.off, v: c.out.speed, stuck: c.st.stuckT, flip: c.st.flipT, up: 1 - 2 * (c.st.qx ** 2 + c.st.qz ** 2) };
  sim.step([0]);
  for (const e of sim.events) if (e.t === 'reset' || (e.t === 'wall' && e.vn > 3)) console.log(sim.gs.frame, e.t, JSON.stringify(before, (k, v) => typeof v === 'number' ? +v.toFixed(2) : v), e.vn ? 'vn ' + e.vn.toFixed(1) : '');
  if (sim.gs.frame % (FPS * 10) === 0) console.log('  t', sim.gs.frame / FPS, 's', c.st.sPrev.toFixed(0), 'v', (c.out.speed * 3.6).toFixed(0), 'off', c.st.off.toFixed(1), 'gear', c.st.gear);
}
