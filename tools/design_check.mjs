// 트랙 설계 점검: 닫히는지, 길이, 가장 좁은 반경, 그리고 "길끼리 너무 가깝거나 겹치는 곳"(다리 없음 → 못 달림)
// 사용법: node tools/design_check.mjs [트랙id...]
import { TRACK_DEFS } from '../web/src/sim/tracks.js';
import { buildTrack } from '../web/src/sim/track.js';

const ids = process.argv.slice(2);
for (const def of TRACK_DEFS) {
  if (ids.length && !ids.includes(def.id)) continue;
  let T;
  try { T = buildTrack(def); } catch (e) { console.log(`${def.id}: ❌ ${e.message}`); continue; }
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
  const closeLens = def.close.map(k => buildTrack.lastSegs?.[k]);
  const ok = worst > 6;
  console.log(`${def.id}: 길이 ${T.L.toFixed(0)}m · 최소반경 ${minR.toFixed(0)}m · 길끼리 가장 가까운 틈 ${worst.toFixed(1)}m (${(wi * T.ds).toFixed(0)}m↔${(wj * T.ds).toFixed(0)}m) ${ok ? '✅' : '❌ 겹치거나 너무 가깝다'}`);
  void closeLens;
}
