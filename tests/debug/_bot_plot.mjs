// 구간 그림: 도로 가장자리(회색)·레이싱라인(파랑)·봇 궤적(빨강, 제동 중 주황) → tests/out/bot_plot.svg
import fs from 'node:fs';
import { Sim, FPS } from '../../web/src/sim/race.js';
import { racingLine, botInput } from '../../web/src/sim/bot.js';
import { unpack } from '../../web/src/sim/input.js';
const [track, car, a, b] = process.argv.slice(2).map((v, i) => i > 1 ? +v : v);
const sim = new Sim({ track, laps: 1, players: [{ car, name: 'bot', bot: true, botSkill: 0.95 }] });
const T = sim.T, { o } = racingLine(T), c = sim.cars[0];
const pts = [];
let seen = false;
while (sim.gs.frame < FPS * 240) {
  const inp = unpack(botInput(sim, 0, c.botSkill, {}));
  sim.step([0]);
  const L = sim.world.locate(c.st.px, c.st.pz, c.st.hint);
  if (L.i >= a && L.i <= b) { seen = true; pts.push([c.st.px, c.st.pz, inp.brk > 0.05]); } else if (seen) break;
}
const P = []; for (let i = a; i <= b; i++) P.push(i);
const xs = [], zs = [];
for (const i of P) for (const d of [-T.hw[i] - 12, T.hw[i] + 12]) { xs.push(T.x[i] + T.lx[i] * d); zs.push(T.z[i] + T.lz[i] * d); }
const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
const S = 900 / Math.max(x1 - x0, z1 - z0), X = x => ((x - x0) * S).toFixed(1), Z = z => ((z - z0) * S).toFixed(1);
const poly = (f, col, w) => `<polyline fill="none" stroke="${col}" stroke-width="${w}" points="${P.map(i => { const [x, z] = f(i); return X(x) + ',' + Z(z); }).join(' ')}"/>`;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="920" height="920" style="background:#fff">`;
svg += poly(i => [T.x[i] + T.lx[i] * T.hw[i], T.z[i] + T.lz[i] * T.hw[i]], '#888', 2);
svg += poly(i => [T.x[i] - T.lx[i] * T.hw[i], T.z[i] - T.lz[i] * T.hw[i]], '#888', 2);
svg += poly(i => [T.x[i] + T.lx[i] * o[i], T.z[i] + T.lz[i] * o[i]], '#26f', 2);
for (let q = 1; q < pts.length; q++) svg += `<line x1="${X(pts[q - 1][0])}" y1="${Z(pts[q - 1][1])}" x2="${X(pts[q][0])}" y2="${Z(pts[q][1])}" stroke="${pts[q][2] ? '#f90' : '#e22'}" stroke-width="2.5"/>`;
for (let i = a; i <= b; i += 20) svg += `<text x="${X(T.x[i] + T.lx[i] * (T.hw[i] + 4))}" y="${Z(T.z[i] + T.lz[i] * (T.hw[i] + 4))}" font-size="14">${i}</text>`;
svg += `<text x="10" y="20" font-size="16">${track} ${car} i=${a}~${b}  파랑=레이싱라인 빨강=봇(주황=제동) 숫자=+lx쪽</text></svg>`;
fs.writeFileSync('tests/out/bot_plot.svg', svg);
