// 봇 2랩 동안 ESC 가 개입한 시간 비율(트랙·차별)
import { Sim, FPS, GO_FRAME } from '../../web/src/sim/race.js';
import { CARS } from '../../web/src/sim/cars.js';
for (const t of ['circuit', 'mountain', 'city']) {
  const row = [];
  for (const cs of CARS) {
    const sim = new Sim({ track: t, laps: 2, players: [{ car: cs.id, name: 'b', bot: true, botSkill: 0.95 }] });
    const c = sim.cars[0]; let n = 0, e = 0;
    while (!c.st.fin && sim.gs.frame < FPS * 400) { sim.step([0]); if (sim.gs.frame > GO_FRAME) { n++; e += c.out.esc; } }
    row.push(`${cs.name}${(100 * e / n).toFixed(1)}%`);
  }
  console.log(t, row.join(' '));
}
