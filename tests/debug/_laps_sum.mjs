// 봇 30조합 요약: 벽(강)·되돌리기·최대이탈·랩 합계
import { soloRun } from '../laps.mjs';
import { CARS } from '../../web/src/sim/cars.js';
let walls = 0, big = 0, rs = 0, sum = 0, bad = [];
for (const t of ['circuit', 'mountain', 'city']) for (const c of CARS) {
  const r = soloRun(t, c.id, 2);
  walls += r.walls; big += r.bigWall; rs += r.resets; sum += r.lts[1] || 9999;
  if (r.walls > 2 || r.maxOff > 9 || r.resets) bad.push(`${t}/${c.id} 벽${r.walls}(${r.bigWall}) 리셋${r.resets} 이탈${r.maxOff.toFixed(0)}`);
}
console.log(`벽 ${walls}(강 ${big}) 되돌리기 ${rs} 2랩합 ${(sum / 60).toFixed(1)}s | ${bad.join(', ')}`);
