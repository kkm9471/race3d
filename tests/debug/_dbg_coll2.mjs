import { Sim, FPS } from '../../web/src/sim/race.js';
const sim = new Sim({ track: 'circuit', laps: 3, players: [{ car: 'baram', bot: true }, { car: 'deundeun', bot: true }, { car: 'cheondung', bot: true }, { car: 'kongal', bot: true }] });
while (sim.gs.frame < FPS * 25) {
  sim.step([0, 0, 0, 0]);
  if (sim.gs.frame % 30 === 0 && sim.gs.frame > FPS * 4) {
    const a = sim.cars[1].st, b = sim.cars[2].st;
    const fa = [2 * (a.qx * a.qz + a.qw * a.qy), 1 - 2 * (a.qx ** 2 + a.qy ** 2)];
    const dx = b.px - a.px, dz = b.pz - a.pz;
    console.log((sim.gs.frame / FPS).toFixed(1), 'SUV s', a.sPrev.toFixed(0), 'off', a.off.toFixed(1), 'v', (Math.hypot(a.vx, a.vz) * 3.6).toFixed(0),
      '| SC s', b.sPrev.toFixed(0), 'off', b.off.toFixed(1), 'v', (Math.hypot(b.vx, b.vz) * 3.6).toFixed(0), '| ahead', (dx * fa[0] + dz * fa[1]).toFixed(1), 'side', (dx * fa[1] - dz * fa[0]).toFixed(1), 'thrSC', b.thr.toFixed(2), 'brkSC', b.brk.toFixed(2), 'stSC', b.steer.toFixed(2));
  }
}
