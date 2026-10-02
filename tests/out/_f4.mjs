import { Sim, FPS, GO_FRAME } from '../../web/src/sim/race.js';
import { CARS } from '../../web/src/sim/cars.js';
const id = process.argv[2] || 'forest';
const me = 'masil', at = CARS.findIndex(c => c.id === me), pool = [...CARS.slice(at + 1), ...CARS.slice(0, at)];
const players = [{ car: me, name: 'me', bot: true, botSkill: 0.95 }];
for (let i = 0; i < 3; i++) players.push({ car: pool[i].id, name: 'AI' + i, bot: true, botSkill: 0.86 + i * 0.03 });
const sim = new Sim({ track: id, laps: 1, players });
const T = sim.T; let cs = 0, lastLog = -999;
while (!sim.gs.over && sim.gs.frame < FPS * 600) {
  sim.step(players.map(() => 0));
  for (const e of sim.events) {
    if (e.t === 'reset') console.log(`되돌리기 차${e.k ?? e.a ?? '?'} f${sim.gs.frame} (${((sim.gs.frame - GO_FRAME) / FPS).toFixed(1)}초)`, JSON.stringify(sim.cars.map(c => [(c.st.hint * T.ds).toFixed(0), (c.st.off || 0).toFixed(1), (c.out.speed * 3.6).toFixed(0)])));
    if (e.t === 'car' && sim.gs.frame > GO_FRAME) { cs++; if (sim.gs.frame - lastLog > 120) { lastLog = sim.gs.frame; console.log(`접촉 ${e.a}-${e.b} f${sim.gs.frame} (${((sim.gs.frame - GO_FRAME) / FPS).toFixed(1)}초) s=${(sim.cars[e.a].st.hint * T.ds).toFixed(0)}m`); } }
  }
}
console.log('접촉 프레임', cs);
