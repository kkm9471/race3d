// 충돌 — 차끼리, 차와 벽
//
// 차 바닥면을 위에서 본 직사각형(OBB)으로 보고, 모서리가 상대 안으로 파고들면 그 점에
// 충격량(impulse)을 준다. 충격량은 두 차의 무게와 회전관성으로 나뉘므로
//   · 무거운 차는 덜 밀리고 가벼운 차는 많이 튕긴다
//   · 옆구리나 모서리를 치면 회전(스핀)이 생긴다
// 벽은 무한히 무거운 물체로 본다. 높은 속도일수록 덜 튕긴다(차체가 찌그러지며 에너지를 먹음).
//
// 모든 차가 같은 순서로(자리 번호 순) 처리되므로 세 화면에서 결과가 같다.

const E_CAR = 0.28, MU_CAR = 0.30;
const E_WALL = 0.22, MU_WALL = 0.35;

/** 점 r(월드, 무게중심 기준)에 방향 n 으로 충격량을 줄 때의 유효 역질량 */
function invMassAt(car, R, rx, ry, rz, nx, ny, nz) {
  const P = car.P;
  // u = r × n (월드) → 차 기준
  const ux = ry * nz - rz * ny, uy = rz * nx - rx * nz, uz = rx * ny - ry * nx;
  const bx = R[0] * ux + R[1] * uy + R[2] * uz;
  const by = R[3] * ux + R[4] * uy + R[5] * uz;
  const bz = R[6] * ux + R[7] * uy + R[8] * uz;
  return 1 / P.m + bx * bx * P.iI[0] + by * by * P.iI[1] + bz * bz * P.iI[2];
}

/** 충격량 J(월드)를 점 r 에 */
function applyImpulse(car, R, rx, ry, rz, jx, jy, jz) {
  const s = car.st, P = car.P;
  s.vx += jx / P.m; s.vy += jy / P.m; s.vz += jz / P.m;
  const tx = ry * jz - rz * jy, ty = rz * jx - rx * jz, tz = rx * jy - ry * jx;
  const bx = (R[0] * tx + R[1] * ty + R[2] * tz) * P.iI[0];
  const by = (R[3] * tx + R[4] * ty + R[5] * tz) * P.iI[1];
  const bz = (R[6] * tx + R[7] * ty + R[8] * tz) * P.iI[2];
  // R 의 행이 차 기준 축(월드 성분) → 월드 = Σ 축 × 성분
  s.wx += R[0] * bx + R[3] * by + R[6] * bz;
  s.wy += R[1] * bx + R[4] * by + R[7] * bz;
  s.wz += R[2] * bx + R[5] * by + R[8] * bz;
}

function pointVel(s, rx, ry, rz) {
  return [s.vx + (s.wy * rz - s.wz * ry), s.vy + (s.wz * rx - s.wx * rz), s.vz + (s.wx * ry - s.wy * rx)];
}

/** 차의 수평 틀: 중심, 앞방향(fx,fz), 왼쪽(lx,lz), 반길이, 반폭 */
function footprint(car, R, out) {
  const s = car.st, P = car.P;
  let fx = R[6], fz = R[8];
  const fl = Math.sqrt(fx * fx + fz * fz) || 1;
  fx /= fl; fz /= fl;
  out.cx = s.px; out.cz = s.pz; out.fx = fx; out.fz = fz; out.lx = fz; out.lz = -fx;
  out.hl = P.Lb / 2; out.hw = P.Wb / 2;
  return out;
}

const FA = {}, FB = {};
const CORNERS = [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0.5, 1], [0.5, -1], [-0.5, 1], [-0.5, -1]];

/** 차 a, b 충돌 처리. 부딪혔으면 충격 크기(N·s)를 돌려준다 */
export function collideCars(a, b, Ra, Rb, events) {
  const sa = a.st, sb = b.st;
  const dx = sb.px - sa.px, dz = sb.pz - sa.pz;
  const rr = (a.P.Lb + b.P.Lb) / 2 + 0.5;
  if (dx * dx + dz * dz > rr * rr) return 0;
  if (Math.abs(sb.py - sa.py) > 2.2) return 0;       // 한 대가 붕 떠서 위로 지나감
  footprint(a, Ra, FA); footprint(b, Rb, FB);
  // 가장 깊이 파고든 점 하나를 찾는다 (A 모서리가 B 안 / B 모서리가 A 안)
  let best = null;
  const test = (P, Q, sign) => {
    for (let k = 0; k < CORNERS.length; k++) {
      const [cu, cv] = CORNERS[k];
      const px = P.cx + P.fx * P.hl * cu + P.lx * P.hw * cv;
      const pz = P.cz + P.fz * P.hl * cu + P.lz * P.hw * cv;
      const ux = px - Q.cx, uz = pz - Q.cz;
      const u = ux * Q.fx + uz * Q.fz, v = ux * Q.lx + uz * Q.lz;
      const pu = Q.hl - Math.abs(u), pv = Q.hw - Math.abs(v);
      if (pu <= 0 || pv <= 0) continue;
      let nx, nz, depth;
      if (pu < pv) { depth = pu; const sg = u > 0 ? 1 : -1; nx = Q.fx * sg; nz = Q.fz * sg; }
      else { depth = pv; const sg = v > 0 ? 1 : -1; nx = Q.lx * sg; nz = Q.lz * sg; }
      // n 은 Q → P 방향. A 기준으로 통일: B→A 가 +
      if (sign < 0) { nx = -nx; nz = -nz; }
      if (!best || depth > best.depth) best = { px, pz, nx, nz, depth };
    }
  };
  test(FA, FB, 1);   // A 모서리가 B 안: n 은 B→A
  test(FB, FA, -1);  // B 모서리가 A 안: n 은 A→B 였으니 뒤집어 B→A
  if (!best) return 0;
  const { px, pz, nx, nz, depth } = best;
  const cy = (sa.py + sb.py) / 2;
  const rax = px - sa.px, ray = cy - sa.py, raz = pz - sa.pz;
  const rbx = px - sb.px, rby = cy - sb.py, rbz = pz - sb.pz;
  const va = pointVel(sa, rax, ray, raz), vb = pointVel(sb, rbx, rby, rbz);
  const rvx = va[0] - vb[0], rvy = va[1] - vb[1], rvz = va[2] - vb[2];
  const vn = rvx * nx + rvz * nz;
  // 위치 보정(겹침 해소) — 무게에 반비례
  const ma = a.P.m, mb = b.P.m, tot = ma + mb;
  const corr = Math.max(0, depth - 0.01) * 0.8;
  sa.px += nx * corr * mb / tot; sa.pz += nz * corr * mb / tot;
  sb.px -= nx * corr * ma / tot; sb.pz -= nz * corr * ma / tot;
  if (vn >= 0) return 0;                            // 이미 떨어지는 중
  const k = invMassAt(a, Ra, rax, ray, raz, nx, 0, nz) + invMassAt(b, Rb, rbx, rby, rbz, nx, 0, nz);
  const e = E_CAR * Math.max(0.3, 1 - (-vn) / 30);
  const j = -(1 + e) * vn / k;
  applyImpulse(a, Ra, rax, ray, raz, nx * j, 0, nz * j);
  applyImpulse(b, Rb, rbx, rby, rbz, -nx * j, 0, -nz * j);
  // 마찰 (접선 방향)
  let tx = rvx - vn * nx, tz = rvz - vn * nz;
  const tl = Math.sqrt(tx * tx + tz * tz);
  if (tl > 1e-6) {
    tx /= tl; tz /= tl;
    const kt = invMassAt(a, Ra, rax, ray, raz, tx, 0, tz) + invMassAt(b, Rb, rbx, rby, rbz, tx, 0, tz);
    let jt = -tl / kt;
    const lim = MU_CAR * j;
    if (jt < -lim) jt = -lim;
    applyImpulse(a, Ra, rax, ray, raz, tx * jt, 0, tz * jt);
    applyImpulse(b, Rb, rbx, rby, rbz, -tx * jt, 0, -tz * jt);
  }
  if (events) events.push({ t: 'car', a: a.slot, b: b.slot, x: px, y: cy, z: pz, j, vn: -vn });
  return j;
}

/** 차와 벽. 모서리·옆면 중간점이 벽 밖으로 나가면 밀어 넣고 튕긴다 */
export function collideWall(car, R, world, events) {
  const s = car.st, P = car.P, T = world.T;
  footprint(car, R, FA);
  let hit = 0, pushL = 0, pushR = 0, nxL = 0, nzL = 0, nxR = 0, nzR = 0;
  for (let k = 0; k < CORNERS.length; k++) {
    const [cu, cv] = CORNERS[k];
    const px = FA.cx + FA.fx * FA.hl * cu + FA.lx * FA.hw * cv;
    const pz = FA.cz + FA.fz * FA.hl * cu + FA.lz * FA.hw * cv;
    const L = world.locate(px, pz, s.hint);
    const i = L.i, j = i + 1 === T.n ? 0 : i + 1;
    const wl = T.wallL[i] + (T.wallL[j] - T.wallL[i]) * L.t;
    const wr = T.wallR[i] + (T.wallR[j] - T.wallR[i]) * L.t;
    let depth = 0, nx = 0, nz = 0;
    if (L.d > wl) { depth = L.d - wl; nx = -L.lx; nz = -L.lz; }
    else if (L.d < -wr) { depth = -wr - L.d; nx = L.lx; nz = L.lz; }
    else if (T.divW && (T.divW[i] > 0 || T.divW[j] > 0)) {
      // 지름길 차선의 가운데 분리대: 가까운 쪽 옆으로 밀어낸다
      // 분리대가 없는 쪽 샘플의 위치(0)와 섞지 않는다
      const dw = T.divW[i] + (T.divW[j] - T.divW[i]) * L.t;
      const dc = T.divW[i] > 0 && T.divW[j] > 0 ? T.div[i] + (T.div[j] - T.div[i]) * L.t : T.divW[i] > 0 ? T.div[i] : T.div[j];
      const rel = L.d - dc;
      if (dw > 0 && Math.abs(rel) < dw + 0.5) {
        // 차 중심이 있는 쪽으로만 민다(점마다 가까운 쪽으로 밀면 코에 정면으로 들어간 차가 양쪽으로 밀려 올라탄 채 끌려갔다 — 4차 독립검증).
        // 한 걸음에 3cm 까지 (먼 쪽 모서리를 한 번에 밀면 차가 옆으로 1m 순간이동한다)
        const relC = rel - ((px - s.px) * L.lx + (pz - s.pz) * L.lz);
        const sg = relC >= 0 ? 1 : -1;
        depth = Math.min(dw + 0.5 - sg * rel, 0.03);
        nx = sg * L.lx; nz = sg * L.lz;
      }
    }
    if (depth <= 0) continue;
    if (depth > 3) depth = 3;
    if (nx * L.lx + nz * L.lz < 0) { if (depth > pushL) { pushL = depth; nxL = nx; nzL = nz; } }
    else if (depth > pushR) { pushR = depth; nxR = nx; nzR = nz; }
    const rx = px - s.px, ry = 0, rz = pz - s.pz;
    const v = pointVel(s, rx, ry, rz);
    const vn = v[0] * nx + v[2] * nz;
    if (vn >= 0) continue;
    const kk = invMassAt(car, R, rx, ry, rz, nx, 0, nz);
    const e = E_WALL * Math.max(0.2, 1 - (-vn) / 25);
    const jn = -(1 + e) * vn / kk;
    applyImpulse(car, R, rx, ry, rz, nx * jn, 0, nz * jn);
    const v2 = pointVel(s, rx, ry, rz);
    let tx = v2[0] - (v2[0] * nx + v2[2] * nz) * nx, tz = v2[2] - (v2[0] * nx + v2[2] * nz) * nz;
    const tl = Math.sqrt(tx * tx + tz * tz);
    if (tl > 1e-6) {
      tx /= tl; tz /= tl;
      const kt = invMassAt(car, R, rx, ry, rz, tx, 0, tz);
      let jt = -tl / kt;
      if (jt < -MU_WALL * jn) jt = -MU_WALL * jn;
      applyImpulse(car, R, rx, ry, rz, tx * jt, 0, tz * jt);
    }
    if (jn > hit) hit = jn;
    if (events && jn > car.P.m * 0.3) events.push({ t: 'wall', a: car.slot, x: px, y: s.py, z: pz, j: jn, vn: -vn });
  }
  if (pushL > 0) { s.px += nxL * pushL; s.pz += nzL * pushL; }
  if (pushR > 0) { s.px += nxR * pushR; s.pz += nzR * pushR; }
  return hit;
}
