// 혼자 연습 구성에서 '나'가 비켜 주지 않는 사람처럼 달릴 때(ram) AI 와의 접촉 — 나의 실력별
import { Sim, FPS, GO_FRAME } from '../../web/src/sim/race.js';
import { CARS, carStats } from '../../web/src/sim/cars.js';
import { botInput } from '../../web/src/sim/bot.js';
export function humanRace(meSkill, ram = true) {
  let touchF = 0, rs = 0, unfinished = 0; const per = [];
  for (const t of ['circuit', 'mountain', 'city']) for (const me of ['masil', 'baram', 'cheondung']) {
    const meS = CARS.find(c => c.id === me);
    const pool = CARS.filter(c => c.id !== me).sort((a, b) => Math.abs(carStats(a).pwr - carStats(meS).pwr) - Math.abs(carStats(b).pwr - carStats(meS).pwr));
    const players = [{ car: me, name: 'me', abs: true, tcs: true }];
    for (let i = 0; i < 3; i++) players.push({ car: pool[i].id, name: 'AI' + i, bot: true, botSkill: 0.86 + i * 0.03, abs: true, tcs: true });
    const sim = new Sim({ track: t, laps: 2, players });
    const mem = { stuckT: 0, ram };
    let tf = 0;
    while (!sim.gs.over && sim.gs.frame < FPS * 400) {
      const v0 = botInput(sim, 0, meSkill, mem);
      sim.step([v0, 0, 0, 0]);
      if (sim.events.some(e => e.t === 'car') && sim.gs.frame > GO_FRAME) tf++;
      rs += sim.events.filter(e => e.t === 'reset').length;
    }
    touchF += tf; per.push(`${t}/${me} ${(tf / FPS).toFixed(1)}`);
    unfinished += sim.cars.filter(c => !c.st.fin).length;
  }
  return { touch: touchF / FPS, rs, unfinished, per };
}
if (process.argv[1]?.endsWith('_bots_human.mjs')) for (const sk of [0.95, 0.86]) { const r = humanRace(sk); console.log(sk, r.touch.toFixed(1) + 's', '되돌리기', r.rs, '미완주', r.unfinished, r.per.join(' ')); }
