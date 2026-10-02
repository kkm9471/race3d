// 설계도 구간을 따라 걸으며 구간마다 끝 위치·방향을 보여 준다 (닫기 전, 다듬기 전 — 대략 설계용)
// 사용법: node tools/seg_walk.mjs 트랙id   또는 JSON 구간 목록을 인자로
import { TRACK_BY_ID } from '../web/src/sim/tracks.js';
const arg = process.argv[2];
const segs = TRACK_BY_ID[arg]?.segs || JSON.parse(arg);
let x = 0, z = 0, psi = 0;
const r = v => v.toFixed(0).padStart(6);
segs.forEach((sg, k) => {
  if (sg[0] === 'S') { x += Math.sin(psi) * sg[1]; z += Math.cos(psi) * sg[1]; }
  else {
    const R = sg[1], a = sg[2] * Math.PI / 180, s = a > 0 ? 1 : -1;
    // 왼쪽(+) 으로 돌면 중심은 왼쪽 = (cos ψ, -sin ψ)
    const cx = x + Math.cos(psi) * R * s, cz = z - Math.sin(psi) * R * s;
    psi += a;
    x = cx - Math.cos(psi) * R * s; z = cz + Math.sin(psi) * R * s;
  }
  console.log(`${String(k).padStart(2)} ${JSON.stringify(sg).padEnd(16)} → x${r(x)} z${r(z)} 방향 ${(psi * 180 / Math.PI).toFixed(0)}°`);
});
console.log(`끝 틈 ${Math.hypot(x, z).toFixed(0)}m, 방향 ${(psi * 180 / Math.PI % 360).toFixed(0)}°`);
