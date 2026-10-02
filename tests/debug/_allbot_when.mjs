// 봇 4대(나도 봇 0.95) 9판: 접촉 시간을 출발 10초 안 / 그 뒤로 나눔
import { Sim, FPS, GO_FRAME } from '../../web/src/sim/race.js';
import { CARS } from '../../web/src/sim/cars.js';
let early = 0, late = 0; const per = [];
for (const t of ['circuit', 'mountain', 'city']) for (const me of ['masil', 'baram', 'cheondung']) {
  const at = CARS.findIndex(c => c.id === me), pool = [...CARS.slice(at + 1), ...CARS.slice(0, at)];
  const players = [{ car: me, name: 'me', bot: true, botSkill: 0.95 }];
  for (let i = 0; i < 3; i++) players.push({ car: pool[i].id, name: 'AI' + i, bot: true, botSkill: 0.86 + i * 0.03 });
  const sim = new Sim({ track: t, laps: 2, players });
  let e0 = 0, l0 = 0;
  while (!sim.gs.over && sim.gs.frame < FPS * 400) {
    sim.step([0, 0, 0, 0]);
    if (sim.gs.frame > GO_FRAME && sim.events.some(e => e.t === 'car')) { if (sim.gs.frame < GO_FRAME + 10 * FPS) e0++; else l0++; }
  }
  early += e0; late += l0; per.push(`${t}/${me} ${(e0 / FPS).toFixed(1)}+${(l0 / FPS).toFixed(1)}`);
}
console.log(`출발 10초 안 ${(early / FPS).toFixed(1)}s · 그 뒤 ${(late / FPS).toFixed(1)}s | ${per.join(' ')}`);
