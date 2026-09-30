import { Sim, FPS } from '../web/src/sim/race.js';
import { racingLine } from '../web/src/sim/bot.js';
const [track = 'circuit', car = 'masil', f0 = 2800, f1 = 3050] = process.argv.slice(2);
const sim = new Sim({ track, laps: 3, players: [{ car, name: 'bot', bot: true }] });
const c = sim.cars[0]; const { o, k } = racingLine(sim.T);
while (sim.gs.frame < +f1) {
  sim.step([0]);
  if (sim.gs.frame >= +f0 && sim.gs.frame % 6 === 0) {
    const i = c.st.hint;
    console.log(sim.gs.frame, 's', c.st.sPrev.toFixed(0), 'v', (c.out.fwd * 3.6).toFixed(0), 'prof', (c.botData.v[i] * 3.6).toFixed(0), 'off', c.st.off.toFixed(1), 'line', o[i].toFixed(1), 'R', (1 / Math.abs(k[i])).toFixed(0), 'thr', c.st.thr.toFixed(2), 'brk', c.st.brk.toFixed(2), 'st', c.st.steer.toFixed(2), 'yawr', c.st.wy.toFixed(2));
  }
}
