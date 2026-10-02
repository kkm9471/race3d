// (임시 시험용 — 테마 맵 작업자) 구간별 위치·높이·경사, 점프대 착지 뒤 코너까지 거리
// 사용법: node tests/out/kkm_seginfo.mjs <id>
import { TRACK_BY_ID } from '../../web/src/sim/tracks.js';
import { buildTrack } from '../../web/src/sim/track.js';
const id = process.argv[2];
const def = TRACK_BY_ID[id];
const T = buildTrack(def);
const n = T.n;
const segS = k => T.segAt(k, 0) * T.ds;
console.log(`${id}: L=${T.L.toFixed(0)} n=${n}`);
for (let k = 0; k < def.segs.length; k++) {
  const a = T.segAt(k, 0), b = k + 1 < def.segs.length ? T.segAt(k + 1, 0) : T.segAt(k, 1);
  let len = ((b - a + n) % n) * T.ds;
  let gmax = 0;
  for (let i = a, c = 0; c < (b - a + n) % n; i = (i + 1) % n, c++) gmax = Math.max(gmax, Math.abs(T.grade[i]));
  console.log(`${String(k).padStart(2)} ${JSON.stringify(def.segs[k]).padEnd(16)} s=${segS(k).toFixed(0).padStart(5)} len=${len.toFixed(0).padStart(4)} y ${T.y[a].toFixed(1)}→${T.y[b % n].toFixed(1)} 최대경사 ${(gmax * 100).toFixed(1)}%${T.tunnel[a] ? ' [터널]' : ''}`);
}
let gm = 0, gi = 0;
for (let i = 0; i < n; i++) if (Math.abs(T.grade[i]) > gm) { gm = Math.abs(T.grade[i]); gi = i; }
console.log(`최대경사 ${(gm * 100).toFixed(1)}% @ ${(gi * T.ds).toFixed(0)}m`);
// 점프대: 끝(at) 지점 → 다음 코너(|k| > 1/150)까지 거리
for (const f of def.features || []) {
  if (f.t === 'ramp') {
    const e = T.segAt(f.seg, f.at);
    let d = 0, i = e;
    while (d < 2000 && Math.abs(T.k[i]) < 1 / 150) { i = (i + 1) % n; d += T.ds; }
    let tun = false; for (let q = -10; q < 10; q++) if (T.tunnel[(e + q + n) % n]) tun = true;
    console.log(`점프대 seg${f.seg}@${f.at}: s=${(e * T.ds).toFixed(0)} 다음 코너까지 ${d.toFixed(0)}m (점프 뒤 착지 약 20~30m 포함)${tun ? ' ❌ 터널 근처' : ''}`);
    // 앞쪽 발판 확인
    for (const g of def.features) if (g.t === 'pad') {
      const c = T.segAt(g.seg, g.at); const dd = ((e - c + n) % n) * T.ds;
      if (dd < 80) console.log(`   ❌ 점프대 ${dd.toFixed(0)}m 앞에 발판`);
    }
  }
  if (f.t === 'pad') console.log(`발판 seg${f.seg}@${f.at}: s=${(T.segAt(f.seg, f.at) * T.ds).toFixed(0)} (L-${(T.L - T.segAt(f.seg, f.at) * T.ds).toFixed(0)})`);
  if (f.t === 'split') console.log(`지름길 seg${f.seg} ${f.from}~${f.to} side ${f.side} (구간 회전 ${def.segs[f.seg][2]}) s=${(T.segAt(f.seg, f.from) * T.ds).toFixed(0)}~${(T.segAt(f.seg, f.to) * T.ds).toFixed(0)}`);
  if (f.t === 'tunnel') console.log(`터널 seg${f.seg} s=${(T.segAt(f.seg, f.from ?? 0) * T.ds).toFixed(0)}~${(T.segAt(f.seg, f.to ?? 1) * T.ds).toFixed(0)}`);
}
// 가장 가까운 길끼리 틈
const far = Math.round(60 / T.ds);
let worst = Infinity, wi = -1, wj = -1;
for (let i = 0; i < n; i += 2) for (let j = i + far; j < n; j += 2) {
  let di = j - i; di = Math.min(di, n - di);
  if (di < far) continue;
  const d = Math.hypot(T.x[i] - T.x[j], T.z[i] - T.z[j]) - T.hw[i] - T.hw[j];
  if (d < worst) { worst = d; wi = i; wj = j; }
}
console.log(`길끼리 틈 ${worst.toFixed(1)}m (${(wi * T.ds).toFixed(0)}↔${(wj * T.ds).toFixed(0)})  bounds x ${T.bounds.x0.toFixed(0)}~${T.bounds.x1.toFixed(0)} z ${T.bounds.z0.toFixed(0)}~${T.bounds.z1.toFixed(0)}`);
