// 봇 되돌리기 직전 1.5초 기록
import { Sim, FPS } from '../../web/src/sim/race.js';
import { botInput } from '../../web/src/sim/bot.js';
import { unpack } from '../../web/src/sim/input.js';
const [track, car] = process.argv.slice(2);
const sim = new Sim({ track, laps: 2, players: [{ car, name: 'bot', bot: true, botSkill: 0.95 }] });
const c = sim.cars[0], ring = [];
while (!sim.gs.over && sim.gs.frame < FPS * 400 && !c.st.fin) {
  const inp = unpack(botInput(sim, 0, c.botSkill, {}));
  sim.step([0]);
  const L = sim.world.locate(c.st.px, c.st.pz, c.st.hint);
  const T = sim.T, fx = 2 * (c.st.qx * c.st.qz + c.st.qw * c.st.qy), fz = 1 - 2 * (c.st.qx * c.st.qx + c.st.qy * c.st.qy);
  ring.push(`f${sim.gs.frame} i=${L.i} v=${(c.out.speed * 3.6).toFixed(0)} off=${c.st.off.toFixed(1)} along=${(fx * T.tx[L.i] + fz * T.tz[L.i]).toFixed(2)} 조=${inp.steer.toFixed(2)} 가=${inp.thr.toFixed(2)} 제=${inp.brk.toFixed(2)} flip=${(c.st.flipT || 0).toFixed(1)}`);
  if (ring.length > 90) ring.shift();
  for (const e of sim.events) if (e.t === 'reset') { console.log('--- reset'); console.log(ring.filter((_, q) => q % 10 === 0 || q > 85).join('\n')); }
}
