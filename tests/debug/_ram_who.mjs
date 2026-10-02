// 비켜 주지 않는 '나' + AI 3대, 9판: 접촉 프레임을 "AI 가 내 뒤/옆에서 박음" vs "내가 AI 를 뒤에서 박음" vs AI끼리로 나눔
import { Sim, FPS, GO_FRAME } from '../../web/src/sim/race.js';
import { CARS } from '../../web/src/sim/cars.js';
import { botInput } from '../../web/src/sim/bot.js';
const sk = +(process.argv[2] || 0.95);
let aiHitsMe = 0, meHitsAi = 0, side = 0, aiAi = 0;
for (const t of ['circuit', 'mountain', 'city']) for (const me of ['masil', 'baram', 'cheondung']) {
  const at = CARS.findIndex(c => c.id === me), pool = [...CARS.slice(at + 1), ...CARS.slice(0, at)];
  const players = [{ car: me, name: 'me' }];
  for (let i = 0; i < 3; i++) players.push({ car: pool[i].id, name: 'AI' + i, bot: true, botSkill: 0.86 + i * 0.03 });
  const sim = new Sim({ track: t, laps: 2, players });
  const mem = { stuckT: 0, ram: true };
  while (!sim.gs.over && sim.gs.frame < FPS * 400) {
    sim.step([botInput(sim, 0, sk, mem), 0, 0, 0]);
    if (sim.gs.frame <= GO_FRAME) continue;
    const seen = new Set();
    for (const e of sim.events) {
      if (e.t !== 'car') continue;
      const k = e.a + '-' + e.b; if (seen.has(k)) continue; seen.add(k);
      if (e.a !== 0 && e.b !== 0) { aiAi++; continue; }
      const ai = e.a === 0 ? e.b : e.a;
      const M = sim.cars[0].st, A = sim.cars[ai].st;
      const fx = 2 * (M.qx * M.qz + M.qw * M.qy), fz = 1 - 2 * (M.qx * M.qx + M.qy * M.qy);
      const ahead = (A.px - M.px) * fx + (A.pz - M.pz) * fz;      // AI 가 나보다 앞이면 +
      if (ahead > 2.5) meHitsAi++; else if (ahead < -2.5) aiHitsMe++; else side++;
    }
  }
}
console.log(`실력 ${sk}: 내가 AI 를 뒤에서 ${(meHitsAi / FPS).toFixed(1)}s · AI 가 나를 뒤에서 ${(aiHitsMe / FPS).toFixed(1)}s · 나란히 ${(side / FPS).toFixed(1)}s · AI끼리 ${(aiAi / FPS).toFixed(1)}s`);
