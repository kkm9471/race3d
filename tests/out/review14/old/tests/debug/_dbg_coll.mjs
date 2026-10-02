import { Sim, FPS } from '../../web/src/sim/race.js';
const track = process.argv[2] || 'circuit';
const sim = new Sim({ track, laps: 3, players: [{ car: 'baram', bot: true }, { car: 'deundeun', bot: true }, { car: 'cheondung', bot: true }, { car: 'kongal', bot: true }] });
const win = {};
let maxDepthPair = {};
while (!sim.gs.over) {
  sim.step([0, 0, 0, 0]);
  for (const e of sim.events) if (e.t === 'car') { const key = Math.floor(sim.gs.frame / (FPS * 10)) * 10 + 's ' + e.a + '-' + e.b; win[key] = (win[key] || 0) + 1; }
}
console.log(Object.entries(win).map(([k, v]) => `${k}:${v}`).join('  '));
