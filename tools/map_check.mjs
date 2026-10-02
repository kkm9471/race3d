// 맵 하나를 한 번에 점검: 설계(닫힘·길이·최소반경·길끼리 틈) + 봇 혼자 10대 + 봇 4대 레이스
// 사용법: node tools/map_check.mjs <맵id> [빠르게=1]   (빠르게=1 이면 차 3대만)
// 통과 기준: 틈 > 6m, 봇 강한 벽 0·되돌리기 0, 4대 레이스 전원 완주·되돌리기 ≤ 1
import { TRACK_BY_ID, MAP_LOAD_FAIL } from '../web/src/sim/tracks.js';
import { buildTrack } from '../web/src/sim/track.js';
import { CARS } from '../web/src/sim/cars.js';
import { Sim, FPS, GO_FRAME } from '../web/src/sim/race.js';
import { soloRun } from '../tests/laps.mjs';

const [id, quick] = process.argv.slice(2);
const def = TRACK_BY_ID[id];
if (!def) { console.log(`❌ 맵 ${id} 없음 (불러오기 실패: ${MAP_LOAD_FAIL.join(',') || '없음'})`); process.exit(1); }
const T = buildTrack(def);
const n = T.n, far = Math.round(60 / T.ds);
let worst = Infinity, wi = -1, wj = -1;
for (let i = 0; i < n; i += 2) for (let j = i + far; j < n; j += 2) {
  let di = j - i; di = Math.min(di, n - di);
  if (di < far) continue;
  const d = Math.hypot(T.x[i] - T.x[j], T.z[i] - T.z[j]) - T.hw[i] - T.hw[j];
  if (d < worst) { worst = d; wi = i; wj = j; }
}
let minR = Infinity;
for (let i = 0; i < n; i++) if (Math.abs(T.k[i]) > 1e-6) minR = Math.min(minR, 1 / Math.abs(T.k[i]));
const fc = {}; for (const f of def.features || []) fc[f.t] = (fc[f.t] || 0) + 1;
console.log(`${def.id} ${def.name} ★${def.level} 랩${def.laps || 3}: 길이 ${T.L.toFixed(0)}m · 최소반경 ${minR.toFixed(0)}m · 높이 ${T.bounds.y0.toFixed(0)}~${T.bounds.y1.toFixed(0)}m · 길끼리 틈 ${worst.toFixed(1)}m (${(wi * T.ds).toFixed(0)}m↔${(wj * T.ds).toFixed(0)}m) ${worst > 6 ? '✅' : '❌'}`);
console.log(`  요소: ${JSON.stringify(fc)}`);
let bad = worst > 6 ? 0 : 1;
const cars = quick ? CARS.slice(0, 3) : CARS;
const laps = def.laps ? 1 : 2;
const lts = [];
for (const c of cars) {
  const r = soloRun(id, c.id, laps);
  const lt = r.lts[0];
  lts.push(lt || 0);
  const ok = r.fin && r.bigWall === 0 && r.resets === 0;
  if (!ok) bad++;
  console.log(`  ${ok ? '✅' : '❌'} ${c.name.padEnd(8)} 1랩 ${lt ? (lt / FPS).toFixed(1) + '초' : '-'} 최고 ${r.vmax.toFixed(0)}km/h 벽 ${r.walls}(강 ${r.bigWall}) 되돌리기 ${r.resets} 완주 ${r.fin ? 'O' : 'X'}`);
}
const avg = lts.filter(Boolean).reduce((a, b) => a + b, 0) / Math.max(1, lts.filter(Boolean).length) / FPS;
console.log(`  봇 평균 1랩 ${avg.toFixed(1)}초`);
// 봇 4대 레이스 (혼자 연습 구성)
{
  const me = 'masil', at = CARS.findIndex(c => c.id === me), pool = [...CARS.slice(at + 1), ...CARS.slice(0, at)];
  const players = [{ car: me, name: 'me', bot: true, botSkill: 0.95 }];
  for (let i = 0; i < 3; i++) players.push({ car: pool[i].id, name: 'AI' + i, bot: true, botSkill: 0.86 + i * 0.03 });
  const sim = new Sim({ track: id, laps: 1, players });
  let rs = 0, touchF = 0;
  while (!sim.gs.over && sim.gs.frame < FPS * 600) {
    sim.step(players.map(() => 0));
    if (sim.events.some(e => e.t === 'car') && sim.gs.frame > GO_FRAME) touchF++;
    rs += sim.events.filter(e => e.t === 'reset').length;
  }
  const un = sim.cars.filter(c => !c.st.fin).length;
  const ok = un === 0 && rs <= 1;
  if (!ok) bad++;
  console.log(`  ${ok ? '✅' : '❌'} 봇 4대 1랩: 미완주 ${un} 되돌리기 ${rs} 접촉 ${(touchF / FPS).toFixed(1)}초`);
}
console.log(bad ? `❌ 문제 ${bad}건` : '✅ 통과');
process.exit(bad ? 1 : 0);
