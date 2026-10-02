// 봇이 벽에 닿거나 크게 벗어나는 지점: 트랙 위치·속도·속도표·이탈
import { Sim, FPS, GO_FRAME } from '../../web/src/sim/race.js';
const [track, car] = process.argv.slice(2);
const sim = new Sim({ track, laps: 3, players: [{ car, name: 'bot', bot: true, botSkill: 0.95 }] });
const c = sim.cars[0];
let lastLog = -999;
while (!sim.gs.over && sim.gs.frame < 60 * FPS * 8 && !c.st.fin) {
  sim.step([0]);
  const L = sim.world.locate(c.st.px, c.st.pz, c.st.hint);
  const prof = c.botData.v[L.i] * 3.6;
  const sp = c.out.speed * 3.6;
  for (const e of sim.events) if (e.t === 'wall' || e.t === 'reset') {
    if (sim.gs.frame - lastLog > 30) console.log(`f${sim.gs.frame} lap${c.st.lap} ${e.t} i=${L.i} s=${(L.i * sim.T.ds).toFixed(0)}m v=${sp.toFixed(0)} 표=${prof.toFixed(0)} off=${c.st.off.toFixed(1)} vn=${(e.vn || 0).toFixed(1)}`);
    lastLog = sim.gs.frame;
  }
  if (Math.abs(c.st.off) > 9 && sim.gs.frame % 20 === 0) console.log(`  f${sim.gs.frame} 이탈 i=${L.i} v=${sp.toFixed(0)} 표=${prof.toFixed(0)} off=${c.st.off.toFixed(1)} hw=${sim.T.hw[L.i].toFixed(1)}`);
}
