// 혼자 연습과 같은 구성(나=봇 0.95 + AI 3대 비슷한 급, 실력 0.86/0.89/0.92)으로 2랩
// 접촉 "사건"(연속 접촉은 1번) · 강한 접촉(vn>3) · 접촉 중인 시간 · 되돌리기 · 완주
import { Sim, FPS, GO_FRAME } from '../../web/src/sim/race.js';
import { CARS, carStats } from '../../web/src/sim/cars.js';
const cars = (process.argv[2] || 'masil,baram,cheondung').split(',');
let tot = { ep: 0, hard: 0, touchS: 0, rs: 0 };
for (const t of ['circuit', 'mountain', 'city']) for (const me of cars) {
  const meS = CARS.find(c => c.id === me);
  const pool = CARS.filter(c => c.id !== me).sort((a, b) => Math.abs(carStats(a).pwr - carStats(meS).pwr) - Math.abs(carStats(b).pwr - carStats(meS).pwr));
  const players = [{ car: me, name: 'me', bot: true, botSkill: 0.95, abs: true, tcs: true }];
  for (let i = 0; i < 3; i++) players.push({ car: pool[i].id, name: 'AI' + i, bot: true, botSkill: 0.86 + i * 0.03, abs: true, tcs: true });
  const sim = new Sim({ track: t, laps: 2, players });
  const touching = new Map(); let ep = 0, hard = 0, touchF = 0, rs = 0;
  while (!sim.gs.over && sim.gs.frame < FPS * 400) {
    sim.step(players.map(() => 0));
    const now = new Set();
    for (const e of sim.events) {
      if (e.t === 'reset') rs++;
      if (e.t !== 'car') continue;
      const key = Math.min(e.a, e.b) + '-' + Math.max(e.a, e.b);
      if (!now.has(key)) { now.add(key); if (!touching.has(key) || touching.get(key) < sim.gs.frame - 30) ep++; }
      touching.set(key, sim.gs.frame);
      if (e.vn > 3) hard++;
    }
    if (now.size) touchF++;
    if (sim.gs.frame % 30 === 0 && sim.gs.frame > 300) { const ord = sim.cars.map((c, q) => [c.st.prog ?? 0, q]).sort((a, b) => b[0] - a[0]).map(x => x[1]).join(); if (globalThis.__po && globalThis.__po !== ord) globalThis.__ot = (globalThis.__ot || 0) + 1; globalThis.__po = ord; }
  }
  const fin = sim.cars.filter(c => c.st.fin).length;
  const ot = globalThis.__ot || 0; globalThis.__ot = 0; globalThis.__po = null;
  console.log(`${t.padEnd(8)} ${me.padEnd(10)} 접촉사건 ${String(ep).padStart(3)} 강한 ${String(hard).padStart(3)} 접촉시간 ${(touchF / FPS).toFixed(1).padStart(5)}s 되돌리기 ${rs} 완주 ${fin}/4 추월 ${ot} (${(sim.gs.frame / FPS).toFixed(0)}s)`);
  tot.ep += ep; tot.hard += hard; tot.touchS += touchF / FPS; tot.rs += rs;
}
console.log(`합계 접촉사건 ${tot.ep} 강한 ${tot.hard} 접촉시간 ${tot.touchS.toFixed(0)}s 되돌리기 ${tot.rs}`);
