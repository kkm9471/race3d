// 비켜 주지 않는 '나'(ram) + AI 3대: 접촉 사건 목록 (누가·어디서·얼마나·앞뒤/옆)
import { Sim, FPS, GO_FRAME } from '../../web/src/sim/race.js';
import { CARS } from '../../web/src/sim/cars.js';
import { botInput } from '../../web/src/sim/bot.js';
const [t, me, sk] = [process.argv[2] || 'mountain', process.argv[3] || 'masil', +(process.argv[4] || 0.95)];
const at = CARS.findIndex(c => c.id === me), pool = [...CARS.slice(at + 1), ...CARS.slice(0, at)];
const players = [{ car: me, name: 'me' }];
for (let i = 0; i < 3; i++) players.push({ car: pool[i].id, name: 'AI' + i, bot: true, botSkill: 0.86 + i * 0.03 });
const sim = new Sim({ track: t, laps: 2, players });
const mem = { stuckT: 0, ram: true };
const open = new Map(); let total = 0;
const rel = (a, b) => { const A = sim.cars[a].st, B = sim.cars[b].st; const fx = 2 * (A.qx * A.qz + A.qw * A.qy), fz = 1 - 2 * (A.qx * A.qx + A.qy * A.qy); const dx = B.px - A.px, dz = B.pz - A.pz; return `앞${(dx * fx + dz * fz).toFixed(1)} 옆${(dx * fz - dz * fx).toFixed(1)}`; };
const close = (k, o) => { if (o.f1 - o.f0 > 20) console.log(`${((o.f0 - GO_FRAME) / FPS).toFixed(1)}s ${k} ${((o.f1 - o.f0) / FPS).toFixed(1)}s i=${o.i} ${o.r} v=${o.v}`); };
while (!sim.gs.over && sim.gs.frame < FPS * 400) {
  sim.step([botInput(sim, 0, sk, mem), 0, 0, 0]);
  let any = false;
  for (const e of sim.events) {
    if (e.t !== 'car') continue; any = true;
    const k = Math.min(e.a, e.b) + '-' + Math.max(e.a, e.b);
    let o = open.get(k);
    if (o && o.f1 < sim.gs.frame - 30) { close(k, o); o = null; }
    if (!o) { o = { f0: sim.gs.frame, f1: sim.gs.frame, i: sim.cars[e.a].st.hint, r: rel(e.a, e.b), v: `${(sim.cars[e.a].out.speed * 3.6).toFixed(0)}/${(sim.cars[e.b].out.speed * 3.6).toFixed(0)}` }; open.set(k, o); }
    o.f1 = sim.gs.frame;
  }
  if (any && sim.gs.frame > GO_FRAME) total++;
}
for (const [k, o] of open) close(k, o);
console.log('접촉 합계', (total / FPS).toFixed(1), 's');
