// 임시 도구: 맵 구간별 시작 비율·거리·높이·경사 (node tests/out/segfrac.mjs <id>)
import { TRACK_BY_ID } from '../../web/src/sim/tracks.js';
import { buildTrack } from '../../web/src/sim/track.js';
const id = process.argv[2];
const def = TRACK_BY_ID[id];
const T = buildTrack(def);
console.log(`${id} L=${T.L.toFixed(0)} n=${T.n}`);
for (let s = 0; s < def.segs.length; s++) {
  const a = T.segAt(s, 0), b = T.segAt(s, 1);
  let gmax = 0;
  for (let i = a; i !== b; i = (i + 1) % T.n) gmax = Math.max(gmax, Math.abs(T.grade[i]));
  console.log(`${String(s).padStart(2)} ${JSON.stringify(def.segs[s]).padEnd(16)} 시작 ${(a / T.n).toFixed(3)} (${(a * T.ds).toFixed(0)}m) 끝 ${(b / T.n).toFixed(3)} 높이 ${T.y[a].toFixed(1)}→${T.y[b].toFixed(1)} 최대경사 ${(gmax * 100).toFixed(1)}%`);
}
let gm = 0; for (let i = 0; i < T.n; i++) gm = Math.max(gm, Math.abs(T.grade[i]));
console.log(`전체 최대 경사 ${(gm * 100).toFixed(1)}%`);
