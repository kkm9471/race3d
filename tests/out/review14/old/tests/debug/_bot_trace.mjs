// 봇 한 구간 프레임 기록: node tests/debug/_bot_trace.mjs 트랙 차 시작i 끝i
import { Sim, FPS } from '../../web/src/sim/race.js';
import { racingLine, botInput } from '../../web/src/sim/bot.js';
import { unpack } from '../../web/src/sim/input.js';
const [track, car, a, b] = process.argv.slice(2);
const sim = new Sim({ track, laps: 1, players: [{ car, name: 'bot', bot: true, botSkill: 0.95 }] });
const c = sim.cars[0], { o } = racingLine(sim.T);
let n = 0, seen = false;
while (!sim.gs.over && sim.gs.frame < 60 * FPS * 4 && !c.st.fin) {
  sim.step([0]);
  const L = sim.world.locate(c.st.px, c.st.pz, c.st.hint);
  if (L.i >= +a && L.i <= +b && n++ % 8 === 0) {
    const inp = unpack(botInput(sim, 0, c.botSkill, {}));
    const ax = c.axes([]);
    const vl = c.st.vx * ax[0] + c.st.vz * ax[2], vf = c.st.vx * ax[6] + c.st.vz * ax[8];
    console.log(`i=${L.i} v=${(vf * 3.6).toFixed(0)} 표=${(c.botData.v[L.i] * 3.6).toFixed(0)} off=${c.st.off.toFixed(1)} 라인=${o[L.i].toFixed(1)} β=${(Math.atan2(vl, Math.abs(vf)) * 57.3).toFixed(1)} yaw=${(c.st.wy ?? 0).toFixed(2)} 조향=${inp.steer?.toFixed(2)} 가=${inp.thr?.toFixed(2)} 제=${inp.brk?.toFixed(2)} 한계=${c.steerLimit().toFixed(3)} esc=${c.out.esc}`);
  }
  if (L.i >= +a && L.i <= +b) seen = true; else if (seen) break;
}
