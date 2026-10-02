// 접촉 사건별: 시작 프레임·지속·짝·트랙 위치·두 차 상대 위치(앞뒤/옆)·속도
import { Sim, FPS, GO_FRAME } from '../../web/src/sim/race.js';
import { CARS, carStats } from '../../web/src/sim/cars.js';
const [t, me] = process.argv.slice(2);
const meS = CARS.find(c => c.id === me);
const pool = CARS.filter(c => c.id !== me).sort((a, b) => Math.abs(carStats(a).pwr - carStats(meS).pwr) - Math.abs(carStats(b).pwr - carStats(meS).pwr));
const players = [{ car: me, name: 'me', bot: true, botSkill: 0.95, abs: true, tcs: true }];
for (let i = 0; i < 3; i++) players.push({ car: pool[i].id, name: 'AI' + i, bot: true, botSkill: 0.86 + i * 0.03, abs: true, tcs: true });
console.log(players.map((p, i) => `${i}:${p.car}`).join(' '));
const sim = new Sim({ track: t, laps: 2, players });
const open = new Map();
const rel = (a, b) => {
  const A = sim.cars[a].st, B = sim.cars[b].st;
  const fx = 2 * (A.qx * A.qz + A.qw * A.qy), fz = 1 - 2 * (A.qx * A.qx + A.qy * A.qy);
  const dx = B.px - A.px, dz = B.pz - A.pz;
  return `앞${(dx * fx + dz * fz).toFixed(1)} 옆${(dx * fz - dz * fx).toFixed(1)}`;
};
const close = (key, o) => console.log(`f${o.f0}(${((o.f0 - GO_FRAME) / FPS).toFixed(1)}s) ${key} ${((o.f1 - o.f0) / FPS).toFixed(1)}s i=${o.i} ${o.r} v=${o.v} 최대vn=${o.vn.toFixed(1)}`);
while (!sim.gs.over && sim.gs.frame < FPS * 400) {
  sim.step(players.map(() => 0));
  for (const e of sim.events) {
    if (e.t === 'reset') console.log(`   f${sim.gs.frame} 되돌리기 ${e.a}`);
    if (e.t !== 'car') continue;
    const key = Math.min(e.a, e.b) + '-' + Math.max(e.a, e.b);
    let o = open.get(key);
    if (o && o.f1 < sim.gs.frame - 30) { close(key, o); o = null; }
    if (!o) { const L = sim.world.locate(sim.cars[e.a].st.px, sim.cars[e.a].st.pz, sim.cars[e.a].st.hint); o = { f0: sim.gs.frame, f1: sim.gs.frame, vn: 0, i: L.i, r: rel(e.a, e.b), v: `${(sim.cars[e.a].out.speed * 3.6).toFixed(0)}/${(sim.cars[e.b].out.speed * 3.6).toFixed(0)}` }; open.set(key, o); }
    o.f1 = sim.gs.frame; o.vn = Math.max(o.vn, e.vn);
  }
}
for (const [k, o] of open) close(k, o);
