import { Sim, FPS } from '../web/src/sim/race.js';
import { racingLine } from '../web/src/sim/bot.js';
const [track = 'circuit', car = 'masil', f0 = 2800, f1 = 3050, every = 6] = process.argv.slice(2);
const sim = new Sim({ track, laps: 3, players: [{ car, name: 'bot', bot: true }] });
const c = sim.cars[0]; const { o, k } = racingLine(sim.T);
while (sim.gs.frame < +f1) {
  sim.step([0]);
  if (sim.gs.frame >= +f0 && sim.gs.frame % +every === 0) {
    const i = c.st.hint; const ax = c.axes([]); const vlat = c.st.vx * ax[0] + c.st.vz * ax[2];
    console.log(sim.gs.frame, 's', c.st.sPrev.toFixed(0), 'v', (c.out.fwd * 3.6).toFixed(0), 'prof', (c.botData.v[i] * 3.6).toFixed(0), 'off', c.st.off.toFixed(1), 'ln', o[i].toFixed(1), 'k', (k[i]*1000).toFixed(1), 'thr', c.st.thr.toFixed(2), 'brk', c.st.brk.toFixed(2), 'st', c.st.steer.toFixed(2), 'yr', c.st.wy.toFixed(2), 'vlat', vlat.toFixed(1),
      'slip', c.out.wheels.map(w => w.slip.toFixed(1)).join('/'), 'om', c.st.w.map(w => (w.om * c.P.R * 3.6).toFixed(0)).join('/'), 'surf', c.out.wheels.map(w => w.surf).join(''));
  }
}
