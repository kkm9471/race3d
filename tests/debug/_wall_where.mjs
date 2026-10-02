// 봇 벽 충돌 위치: 트랙 위치(m)·가로위치·그 근처 요소(분리대/점프대/빙판/발판)
import { Sim, FPS } from '../../web/src/sim/race.js';
const [t, car] = process.argv.slice(2);
const sim = new Sim({ track: t, laps: 2, players: [{ car, name: 'b', bot: true, botSkill: 0.95 }] });
const T = sim.T, c = sim.cars[0], seen = new Map();
while (!sim.gs.over && sim.gs.frame < FPS * 300 && !c.st.fin) {
  sim.step([0]);
  for (const e of sim.events) if (e.t === 'wall' && e.vn > 2) {
    const L = sim.world.locate(e.x, e.z, c.st.hint), i = L.i;
    let near = [];
    for (let q = -15; q <= 5; q++) { const k = (i + q + T.n) % T.n; if (T.divW[k] > 0) near.push('분리대'); if (T.ramp[k] > 0) near.push('점프대'); if (T.roadSurf[k] === 5) near.push('빙판'); }
    const key = Math.round(L.s / 20) * 20;
    const o = seen.get(key) || { n: 0, vn: 0, d: L.d, near: [...new Set(near)].join('/') || '-', air: c.st.air, v: c.out.speed * 3.6 };
    o.n++; o.vn = Math.max(o.vn, e.vn); seen.set(key, o);
  }
}
for (const [s, o] of [...seen].sort((a, b) => a[0] - b[0])) console.log(`${s}m ×${o.n} vn ${o.vn.toFixed(1)} d ${o.d.toFixed(1)} 근처 ${o.near} 속도 ${o.v.toFixed(0)}`);
