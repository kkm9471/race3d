// 봇 실제 궤적 곡률 vs 레이싱라인 곡률 (같은 부호 규약: 연속 세 점의 외적)
import { Sim, FPS } from '../../web/src/sim/race.js';
import { racingLine, botInput } from '../../web/src/sim/bot.js';
import { unpack } from '../../web/src/sim/input.js';
const [track, car, a, b] = process.argv.slice(2);
const sim = new Sim({ track, laps: 1, players: [{ car, name: 'bot', bot: true, botSkill: 0.95 }] });
const c = sim.cars[0], { o, k } = racingLine(sim.T), T = sim.T;
const hist = [];
let seen = false, n = 0;
while (sim.gs.frame < FPS * 240) {
  const inp = unpack(botInput(sim, 0, c.botSkill, {}));
  sim.step([0]);
  hist.push([c.st.px, c.st.pz]);
  const L = sim.world.locate(c.st.px, c.st.pz, c.st.hint);
  if (L.i >= +a && L.i <= +b) {
    seen = true;
    if (n++ % 10 === 0 && hist.length > 21) {
      const [ax, az] = hist[hist.length - 21], [px, pz] = hist[hist.length - 11], [bx, bz] = hist[hist.length - 1];
      const ux = px - ax, uz = pz - az, vx = bx - px, vz = bz - pz, wx = bx - ax, wz = bz - az;
      const kc = 2 * (ux * vz - uz * vx) / Math.sqrt((ux * ux + uz * uz) * (vx * vx + vz * vz) * (wx * wx + wz * wz));
      // 목표점 방향
      const lx = T.lx[L.i], lz = T.lz[L.i];
      const offLine = (c.st.px - (T.x[L.i] + lx * o[L.i])) * lx + (c.st.pz - (T.z[L.i] + lz * o[L.i])) * lz;
      console.log(`i=${L.i} 라인k=${(k[L.i] * 1000).toFixed(2)} 실제k=${(kc * 1000).toFixed(2)} 라인에서(+왼)=${offLine.toFixed(1)} off=${c.st.off.toFixed(1)} o=${o[L.i].toFixed(1)} 조향=${inp.steer.toFixed(2)} 제=${inp.brk.toFixed(2)}`);
    }
  } else if (seen) break;
}
