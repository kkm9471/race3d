// 시험용: 구간 시작 위치(m) 출력 — node tests/out/segpos.mjs <id>
import { TRACK_BY_ID } from '../../web/src/sim/tracks.js';
import { buildTrack } from '../../web/src/sim/track.js';
const def = TRACK_BY_ID[process.argv[2]];
const T = buildTrack(def);
const out = [];
for (let k = 0; k < def.segs.length; k++) out.push(`${k}:${(T.segAt(k, 0) * T.ds).toFixed(0)}`);
console.log(`L=${T.L.toFixed(0)} ` + out.join(' '));
