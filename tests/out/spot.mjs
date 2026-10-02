// 시험용(임시): 안쪽 들판에서 길과 가장 먼 곳
import { TRACK_BY_ID } from '../../web/src/sim/tracks.js';
import { buildTrack } from '../../web/src/sim/track.js';
const T = buildTrack(TRACK_BY_ID[process.argv[2]]);
const clearance = (x, z) => { let best = Infinity; for (let i = 0; i < T.n; i++) { const dx = x - T.x[i], dz = z - T.z[i]; const lat = dx * T.lx[i] + dz * T.lz[i]; const d = Math.sqrt(dx * dx + dz * dz) - (lat > 0 ? T.wallL[i] : T.wallR[i]); if (d < best) best = d; } return best; };
const inside = (x, z) => { let c = false; for (let i = 0, j = T.n - 1; i < T.n; j = i++) if ((T.z[i] > z) !== (T.z[j] > z) && x < (T.x[j] - T.x[i]) * (z - T.z[i]) / (T.z[j] - T.z[i]) + T.x[i]) c = !c; return c; };
const b = T.bounds; let cx = 0, cz = 0, cr = 0;
for (let x = b.x0; x <= b.x1; x += 12) for (let z = b.z0; z <= b.z1; z += 12) { if (!inside(x, z)) continue; const c = clearance(x, z); if (c > cr) { cr = c; cx = x; cz = z; } }
console.log('bounds', JSON.stringify(b), 'best', cx.toFixed(0), cz.toFixed(0), cr.toFixed(0), 'start', T.x[0].toFixed(0), T.z[0].toFixed(0), 'L', T.L.toFixed(0));
for (const s of process.argv.slice(3)) { const [sg, fr] = s.split(':').map(Number); const i = T.segAt(sg, fr); console.log('seg', s, 'i', i, 'x', T.x[i].toFixed(0), 'z', T.z[i].toFixed(0), 'wl', T.wallL[i].toFixed(1), 'wr', T.wallR[i].toFixed(1)); }
