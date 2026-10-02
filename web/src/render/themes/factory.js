// 14회차 테마: factory — 강철 톱니 공장
// 미끄럼방지 무늬 철판 노면, 노랑·검정 경고 줄무늬 벽, 청록 터널, 공장 건물(톱날 지붕)·굴뚝(연기)·굵은 파이프·
// 돌아가는 톱니바퀴·움직이는 로봇 팔·드럼통·상자, 기름 바닥(빙판 구간을 검은 기름막으로 다시 칠함)

import { applyTexSet } from '../assets.js';

/** 미끄럼방지 무늬 철판 (u = 길 폭, v = 10m 마다 1) */
function plateTex(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#9aa2a6'; g.fillRect(0, 0, w, h);
    // 얼룩(긁힘·때)
    for (let k = 0; k < 220; k++) {
      const v = 130 + Math.floor(ctx.rand() * 50);
      g.fillStyle = `rgba(${v},${v + 4},${v + 8},0.18)`;
      g.fillRect(ctx.rand() * w, ctx.rand() * h, 2 + ctx.rand() * 30, 1 + ctx.rand() * 3);
    }
    // 마름모 돌기: 칸마다 ±45° 짧은 막대를 번갈아
    const c = 32;
    for (let y = 0; y < h; y += c) for (let x = 0; x < w; x += c) {
      const a = ((x + y) / c) % 2 ? Math.PI / 4 : -Math.PI / 4;
      g.save(); g.translate(x + c / 2, y + c / 2); g.rotate(a);
      g.fillStyle = '#5d6569'; g.fillRect(-11, -2, 24, 6);       // 그림자
      g.fillStyle = '#d5dbde'; g.fillRect(-12, -4, 24, 5);       // 솟은 면
      g.restore();
    }
  }, { repeat: [3, 3] });
}

/** 벽: 안쪽 면 아래는 노랑·검정 경고 줄무늬, 위·바깥은 철판 (u = 안쪽 아래→위→윗면→바깥, v = 4m 마다 1) */
function wallTex(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#7d878b'; g.fillRect(0, 0, w, h);
    // 경고 줄무늬 (안쪽 면 아래쪽 = u 0.19~0.28)
    const x0 = 46, x1 = 72;
    g.fillStyle = '#f2c21b'; g.fillRect(x0, 0, x1 - x0, h);
    g.fillStyle = '#151515';
    for (let c = -128; c < h + 128; c += 64) {
      g.beginPath(); g.moveTo(x0, c); g.lineTo(x1, c + 26); g.lineTo(x1, c + 58); g.lineTo(x0, c + 32); g.closePath(); g.fill();
    }
    // 안쪽 면 위쪽: 청록 띠 + 리벳
    g.fillStyle = '#1f7f74'; g.fillRect(x1, 0, 85 - x1, h);
    g.fillStyle = '#c9d2d4';
    for (let y = 8; y < h; y += 32) { g.beginPath(); g.arc(79, y, 2.2, 0, 7); g.fill(); }
    // 윗면·바깥: 철판 이음매
    g.fillStyle = '#5f686c';
    for (let y = 0; y < h; y += 64) g.fillRect(85, y, w - 85, 3);
  });
}

/** 공장 바닥 (땅): 콘크리트 판 이음매 + 기름 얼룩 + 노란 통로선 (u,v = 10m 마다 1) */
function floorTex(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#d2d2cb'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 400; k++) {
      const v = 170 + Math.floor(ctx.rand() * 60);
      g.fillStyle = `rgba(${v},${v},${v - 6},0.25)`;
      g.fillRect(ctx.rand() * w, ctx.rand() * h, 3 + ctx.rand() * 12, 3 + ctx.rand() * 12);
    }
    for (let k = 0; k < 6; k++) {
      g.fillStyle = 'rgba(40,40,36,0.18)';
      g.beginPath(); g.ellipse(ctx.rand() * w, ctx.rand() * h, 8 + ctx.rand() * 22, 5 + ctx.rand() * 12, ctx.rand() * 3, 0, 7); g.fill();
    }
    g.fillStyle = '#8c8c86';
    g.fillRect(0, 0, w, 3); g.fillRect(0, 128, w, 3); g.fillRect(0, 0, 3, h); g.fillRect(128, 0, 3, h);
    g.fillStyle = '#e0b31c'; g.fillRect(60, 0, 6, h);
  });
}

/** 터널 안: 골판 철판 (u = 둘레 0~3, v = 6m 마다 1) */
function tunnelTex(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#dfe7e5'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) {
      const gr = g.createLinearGradient(0, y, 0, y + 16);
      gr.addColorStop(0, '#f4fbf9'); gr.addColorStop(0.5, '#c3cdcb'); gr.addColorStop(1, '#eef5f3');
      g.fillStyle = gr; g.fillRect(0, y, w, 16);
    }
    g.fillStyle = '#7f8f8c';
    for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 3, h);
    // 아래쪽 경고 띠 (u 끝 = 벽 아래)
    g.fillStyle = '#f2c21b'; g.fillRect(0, 0, 10, h); g.fillRect(w - 10, 0, 10, h);
  });
}

/** 기름막: 검은 바탕에 무지개 얼룩 (u,v = 8m 마다 1) */
function oilTex(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#17181d'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 26; k++) {
      const x = ctx.rand() * w, y = ctx.rand() * h, r = 10 + ctx.rand() * 40;
      const hue = Math.floor(ctx.rand() * 360);
      const gr = g.createRadialGradient(x, y, r * 0.2, x, y, r);
      gr.addColorStop(0, `hsla(${hue},80%,45%,0.0)`);
      gr.addColorStop(0.6, `hsla(${hue},85%,50%,0.35)`);
      gr.addColorStop(0.8, `hsla(${(hue + 120) % 360},85%,50%,0.25)`);
      gr.addColorStop(1, `hsla(${hue},80%,40%,0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
  });
}

/** 골판 외벽 (건물): 세로 골 + 위쪽 창 띠 */
function shedTex(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#e6e9e8'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 8) { g.fillStyle = '#b9bfbe'; g.fillRect(x, 0, 3, h); }
    g.fillStyle = '#2b3a40'; g.fillRect(0, 26, w, 34);                 // 창 띠
    g.fillStyle = '#8aa3a8'; for (let x = 4; x < w; x += 32) g.fillRect(x, 30, 24, 26);
    g.fillStyle = '#5a6366'; g.fillRect(0, h - 14, w, 14);             // 아래 띠
  });
}

/** 굴뚝: 위쪽에 빨강·흰 띠 */
function chimneyTex(ctx) {
  return ctx.canvasTex(64, 256, (g, w, h) => {
    g.fillStyle = '#a39d94'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 6) { g.fillStyle = 'rgba(70,60,55,0.15)'; g.fillRect(0, y, w, 1); }
    g.fillStyle = '#b8261d'; g.fillRect(0, 6, w, 18); g.fillRect(0, 42, w, 18);
    g.fillStyle = '#f2efe8'; g.fillRect(0, 24, w, 18);
    g.fillStyle = '#2a2624'; g.fillRect(0, 0, w, 6);
  }, { repeat: [3, 1] });
}

/** 톱니바퀴 모양 (반지름 1, 두께 0.3, 가운데 구멍과 살 구멍) */
function gearGeo(THREE, teeth = 16) {
  const s = new THREE.Shape();
  const r0 = 0.84, r1 = 1.0;
  for (let k = 0; k < teeth; k++) {
    const a = k / teeth * Math.PI * 2, da = Math.PI * 2 / teeth;
    const pts = [[r0, a], [r0, a + da * 0.22], [r1, a + da * 0.32], [r1, a + da * 0.62], [r0, a + da * 0.72]];
    pts.forEach(([r, t], j) => (k === 0 && j === 0 ? s.moveTo(r * Math.cos(t), r * Math.sin(t)) : s.lineTo(r * Math.cos(t), r * Math.sin(t))));
  }
  s.closePath();
  const hole = new THREE.Path(); hole.absarc(0, 0, 0.16, 0, Math.PI * 2, true); s.holes.push(hole);
  for (let k = 0; k < 5; k++) {
    const a = k / 5 * Math.PI * 2, p = new THREE.Path();
    p.absarc(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0.17, 0, Math.PI * 2, true);
    s.holes.push(p);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false, curveSegments: 6 });
  g.translate(0, 0, -0.15);
  return g;
}

/** 톱날 지붕 (가로 1, 높이 1, 깊이 1 — 이빨 3개) */
function sawRoofGeo(THREE) {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0);
  for (let k = 0; k < 3; k++) { const x = -0.5 + k / 3; s.lineTo(x, 1); s.lineTo(x + 1 / 3, 0); }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  return g;
}

export const look = {
  road: 0xb4bcc0,
  roadTex: plateTex,
  roadRough: 0.9,     // 반들거리면 해를 마주 볼 때 노면이 하얗게 번진다
  line: 0xf2c21b,
  wall: { color: 0xffffff, map: wallTex, roughness: 0.55, metalness: 0.3, stripe: false },
  terrainTex: floorTex,
  trees: false,
  city: false,
  far: [0x5f6b6a, 0x7b8786],
  banner: { bg: '#174a45', fg: '#f2c21b' },
  tunnel: { color: 0x46cdb9, map: tunnelTex, light: 0xc8fff6, emissive: 0x0e3f39, portal: 0x1d5f57 },
  // 실사(15회차): 흐린 산업 하늘 + 실제 철판·콘크리트·녹슨 금속 (보통·높음 화질)
  real: {
    sky: 'kloofendal_misty_morning_puresky', exposure: 1.0, fogMul: 0.8,
    road: { tex: 'metal_plate', scale: 0.9, env: 1.2, bright: 2.0, tint: 0xd8dcd8, rough: 0.9 },
    runoff: { tex: 'concrete_floor_worn_001', scale: 3 },
    terrain: { tex: 'concrete_floor_worn_001', scale: 5 },
    wall: { tex: 'metal_plate_02', scale: 3, bright: 1.4 },
    props: { tex: 'rusty_metal_02' },
  },
};

export function build(ctx) {
  const { THREE, T, rand } = ctx;
  const m4 = new THREE.Matrix4(), qn = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v3 = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  const instanced = (geo, mat, list, { shadow = false, colors = null } = {}) => {
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    list.forEach((o, k) => {
      qn.setFromAxisAngle(up, o.yaw || 0);
      im.setMatrixAt(k, m4.compose(v3.set(o.x, o.y, o.z), qn, sc.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1)));
      if (colors) im.setColorAt(k, col.setHex(o.c));
    });
    im.count = list.length;
    im.castShadow = shadow && ctx.q.detail >= 1; im.receiveShadow = true;
    im.computeBoundingSphere();
    ctx.group.add(im);
    return im;
  };

  // ── 기름 바닥: 엔진이 그린 빙판(옅은 하늘색 막)을 검은 기름막으로 ──
  const oil = oilTex(ctx);
  ctx.group.traverse(o => {
    const m = o.material;
    if (o.isMesh && m && m.transparent && m.opacity === 0.55 && m.envMapIntensity === 1.4) {   // 엔진의 빙판 재질
      m.map = oil; m.color.setHex(0xffffff); m.opacity = 0.9; m.roughness = 0.06; m.metalness = 0.4; m.needsUpdate = true;
    }
  });

  const boxG = new THREE.BoxGeometry(1, 1, 1); boxG.translate(0, 0.5, 0);
  const taken = [];     // 파이프·톱니·로봇 팔 자리 (건물·상자가 겹치지 않게)

  // ── 굵은 파이프 (길을 따라) + 길 위를 건너는 파이프 다리(높이 8.5m) ──
  const pipes = [], posts = [];
  const pipeAlong = (a, b, side, colr, dOff = 5, hy = 3.6) => {
    let prev = null;
    for (let i = a, k = 0; ; i = (i + 5) % ctx.n, k++) {
      const off = side * (ctx.wallAt(i, side) + dOff);
      const p = ctx.pt(i, off);
      const cur = { x: p.x, y: ctx.ground(p.x, p.z) + hy, z: p.z };
      if (prev) pipes.push({ a: prev, b: cur, r: 0.7, c: colr });
      taken.push({ x: cur.x, z: cur.z, r: 3 });
      if (k % 2 === 0) posts.push({ x: cur.x, y: cur.y - hy - 0.3, z: cur.z, yaw: p.yaw, sx: 0.5, sy: hy + 0.3, sz: 0.5 });
      prev = cur;
      if (((b - i + ctx.n) % ctx.n) < 5) break;
    }
  };
  const seg = (s, f) => ctx.segAt(s, f);
  pipeAlong(seg(0, 0.0), seg(0, 0.95), -1, 0xe0b31c);
  pipeAlong(seg(0, 0.0), seg(0, 0.95), -1, 0x2fa89a, 6.8, 4.8);
  pipeAlong(seg(36, 0.0), seg(36, 0.95), -1, 0xc8cdd0);
  pipeAlong(seg(34, 0.05), seg(34, 0.95), 1, 0xb8442c);
  pipeAlong(seg(12, 0.05), seg(12, 0.95), -1, 0x2fa89a);
  pipeAlong(seg(38, 0.05), seg(38, 0.95), 1, 0xe0b31c);
  for (const [s, f, colr] of [[0, 0.8, 0xe0b31c], [2, 0.5, 0x2fa89a], [12, 0.45, 0xb8442c], [36, 0.42, 0xc8cdd0], [38, 0.6, 0x2fa89a], [24, 0.5, 0xe0b31c]]) {
    const i = seg(s, f);
    const L = ctx.pt(i, ctx.wallAt(i, 1) + 4.5), R = ctx.pt(i, -ctx.wallAt(i, -1) - 4.5);
    const y = T.y[i] + 8.5;
    pipes.push({ a: { x: L.x, y, z: L.z }, b: { x: R.x, y, z: R.z }, r: 0.8, c: colr });
    for (const P of [L, R]) posts.push({ x: P.x, y: ctx.ground(P.x, P.z) - 0.3, z: P.z, yaw: P.yaw, sx: 0.9, sy: y - ctx.ground(P.x, P.z) + 1.2, sz: 0.9 });
  }
  {
    const g = new THREE.CylinderGeometry(1, 1, 1, 12, 1, true);
    const pipeM = ctx.mat({ color: 0xffffff, roughness: 0.35, metalness: 0.6, side: THREE.DoubleSide });
    if (ctx.q.detail >= 1 && applyTexSet(pipeM, { tex: 'rusty_metal_02', scale: 1.5, metal: 0.6, rough: 0.9, bright: 1.1 }, [3, 12])) pipeM.side = THREE.DoubleSide;
    const im = new THREE.InstancedMesh(g, pipeM, Math.max(1, pipes.length));
    const A = new THREE.Vector3(), B = new THREE.Vector3(), D = new THREE.Vector3();
    pipes.forEach((p, k) => {
      A.set(p.a.x, p.a.y, p.a.z); B.set(p.b.x, p.b.y, p.b.z); D.subVectors(B, A);
      const len = D.length();
      qn.setFromUnitVectors(up, D.normalize());
      im.setMatrixAt(k, m4.compose(A.add(B).multiplyScalar(0.5), qn, sc.set(p.r, len + p.r * 0.6, p.r)));
      im.setColorAt(k, col.setHex(p.c));
    });
    im.count = pipes.length; im.castShadow = ctx.q.detail >= 1; im.computeBoundingSphere();
    ctx.group.add(im);
  }
  instanced(boxG, ctx.mat({ color: 0x4c5558, roughness: 0.5, metalness: 0.6 }), posts, { shadow: true });

  // ── 톱니바퀴 (돌아간다): 큰 것·작은 것이 맞물린 쌍 ──
  const gears = [];
  const gearPair = (s, f, side, R1, R2, dist = 9) => {
    const i = seg(s, f);
    const off = side * (ctx.wallAt(i, side) + dist);
    const p = ctx.pt(i, off);
    // 앞뒤로 두 바퀴 (진행 방향으로 R1+R2 떨어뜨림)
    const fx = T.tx[i], fz = T.tz[i];
    const c1 = { x: p.x, z: p.z }, c2 = { x: p.x + fx * (R1 + R2 - 0.1), z: p.z + fz * (R1 + R2 - 0.1) };
    if (!ctx.clear(c1.x, c1.z, 3) || !ctx.clear(c2.x, c2.z, 3)) return;
    const yaw = p.yaw + (side > 0 ? -Math.PI / 2 : Math.PI / 2);     // 바퀴 면이 길을 본다
    const gy = ctx.ground(p.x, p.z);
    gears.push({ x: c1.x, y: gy + R1 + 0.6, z: c1.z, gy, yaw, R: R1, w: 0.5 / R1, ph: 0, c: 0xc9a24a });
    gears.push({ x: c2.x, y: gy + R1 + 0.6, z: c2.z, gy: ctx.ground(c2.x, c2.z), yaw, R: R2, w: -0.5 / R2, ph: Math.PI / 16, c: 0x8c979b });
    taken.push({ x: c1.x, z: c1.z, r: R1 + 1 }, { x: c2.x, z: c2.z, r: R2 + 1 });
  };
  gearPair(0, 0.62, 1, 7, 4);
  gearPair(2, 0.4, -1, 5, 3);
  gearPair(10, 0.0, 1, 6, 3.5, 10);
  gearPair(18, 0.5, -1, 5, 3);
  gearPair(28, 0.0, 1, 5, 3);
  gearPair(36, 0.75, 1, 8, 4.5, 12);
  gearPair(38, 0.3, -1, 6, 3.5);
  gearPair(42, 0.5, -1, 9, 5, 14);
  const gearM = ctx.mat({ color: 0xffffff, roughness: 0.35, metalness: 0.75 });
  if (ctx.q.detail >= 1) applyTexSet(gearM, { tex: 'rusty_metal_02', scale: 2, metal: 0.75, rough: 0.8, bright: 1.0 }, [1, 1]);
  const gearIM = new THREE.InstancedMesh(gearGeo(THREE), gearM, Math.max(1, gears.length));
  gears.forEach((g, k) => gearIM.setColorAt(k, col.setHex(g.c)));
  gearIM.count = gears.length; gearIM.frustumCulled = false; gearIM.castShadow = ctx.q.detail >= 1;
  ctx.group.add(gearIM);
  // 톱니 받침 기둥
  instanced(boxG, ctx.mat({ color: 0x2c3436, roughness: 0.6, metalness: 0.5 }), gears.map(g => ({ x: g.x, y: g.gy - 0.3, z: g.z, yaw: g.yaw, sx: 1.2, sy: g.y - g.gy + 0.3, sz: 1.2 })));

  // ── 로봇 팔 (주황): 받침·아래팔·위팔·집게를 계층으로 계산해 인스턴스 4개에 그린다 ──
  const arms = [];
  for (const [s, f, side] of [[0, 0.3, 1], [4, 0.5, -1], [6, 0.5, 1], [8, 0.5, -1], [14, 0.5, 1], [16, 0.5, -1], [22, 0.5, 1], [26, 0.5, -1], [32, 0.5, 1], [36, 0.6, -1], [38, 0.15, -1]]) {
    const i = seg(s, f), off = side * (ctx.wallAt(i, side) + 7);
    const p = ctx.pt(i, off);
    if (!ctx.clear(p.x, p.z, 5)) continue;
    taken.push({ x: p.x, z: p.z, r: 7 });
    const base = new THREE.Object3D(); base.position.set(p.x, ctx.ground(p.x, p.z), p.z); base.rotation.y = p.yaw;
    const sh = new THREE.Object3D(); sh.position.y = 1.4; base.add(sh);
    const lo = new THREE.Object3D(); lo.position.y = 2.2; sh.add(lo);
    const el = new THREE.Object3D(); el.position.y = 4.4; sh.add(el);
    const hi = new THREE.Object3D(); hi.position.y = 1.8; el.add(hi);
    const wr = new THREE.Object3D(); wr.position.y = 3.6; el.add(wr);
    arms.push({ base, sh, el, wr, lo, hi, yaw: p.yaw, ph: rand() * 6.28 });
  }
  const armM = ctx.mat({ color: 0xf2851b, roughness: 0.45, metalness: 0.3 });
  const darkM = ctx.mat({ color: 0x33393c, roughness: 0.5, metalness: 0.6 });
  const mk = (geo, mat) => { const im = new THREE.InstancedMesh(geo, mat, Math.max(1, arms.length)); im.count = arms.length; im.frustumCulled = false; im.castShadow = ctx.q.detail >= 1; ctx.group.add(im); return im; };
  const baseG = new THREE.CylinderGeometry(1.1, 1.4, 1.4, 14); baseG.translate(0, 0.7, 0);
  const imBase = mk(baseG, darkM), imLo = mk(new THREE.BoxGeometry(0.8, 4.6, 0.8), armM), imHi = mk(new THREE.BoxGeometry(0.6, 3.8, 0.6), armM), imHead = mk(new THREE.BoxGeometry(1.2, 0.9, 1.0), darkM);

  // ── 공장 건물 (톱날 지붕) — 겹치지 않게 원으로 검사 ──
  const halls = [];
  const fits = (x, z, r) => ctx.clear(x, z, r + 3) && halls.every(h => Math.hypot(h.x - x, h.z - z) > h.r + r + 4) && taken.every(h => Math.hypot(h.x - x, h.z - z) > h.r + r + 1);
  const tones = [0x8fb5ae, 0x9aa5ab, 0xb88a6a, 0xc9c2b0, 0x7f9fb3, 0xa7b0a0];
  for (const [step, near, far] of [[7, 6, 22], [10, 40, 110]]) {
    for (let i = 0; i < ctx.n; i += step) for (const side of [1, -1]) {
      const w = 18 + rand() * 24, d = 24 + rand() * 34, r = Math.hypot(w, d) / 2;
      const off = side * (ctx.wallAt(i, side) + near + r + rand() * (far - near));
      const x = T.x[i] + T.lx[i] * off, z = T.z[i] + T.lz[i] * off;
      if (!fits(x, z, r)) continue;
      halls.push({ x, z, r, w, d, h: 9 + rand() * 13, yaw: ctx.yawAt(i), y: ctx.ground(x, z) - 0.5, c: tones[Math.floor(rand() * tones.length)] });
    }
  }
  instanced(boxG, ctx.mat({ map: shedTex(ctx), roughness: 0.6, metalness: 0.25 }), halls.map(h => ({ ...h, sx: h.w, sy: h.h, sz: h.d })), { shadow: true, colors: true });
  instanced(sawRoofGeo(THREE), ctx.mat({ color: 0x55666a, roughness: 0.45, metalness: 0.5 }),
    halls.map(h => ({ x: h.x, y: h.y + h.h, z: h.z, yaw: h.yaw, sx: h.w, sy: 3.5, sz: h.d })), { shadow: true });

  // ── 굴뚝 + 연기 ──
  const chG = new THREE.CylinderGeometry(1.5, 2.3, 38, 14, 1, true); chG.translate(0, 19, 0);
  const chim = [];
  for (let k = 0, tries = 0; chim.length < 9 && tries < 400; tries++) {
    const i = Math.floor(rand() * ctx.n), side = rand() < 0.5 ? 1 : -1;
    const off = side * (ctx.wallAt(i, side) + 18 + rand() * 60);
    const x = T.x[i] + T.lx[i] * off, z = T.z[i] + T.lz[i] * off;
    const s = 0.8 + rand() * 0.5;
    if (!fits(x, z, 4) || chim.some(c => Math.hypot(c.x - x, c.z - z) < 60)) continue;
    chim.push({ x, z, y: ctx.ground(x, z) - 0.5, sx: s, sy: s, sz: s, top: 38 * s });
    halls.push({ x, z, r: 4 });
    void k;
  }
  instanced(chG, ctx.mat({ map: chimneyTex(ctx), roughness: 0.85, side: THREE.DoubleSide }), chim, { shadow: true });
  const PUFF = 7;
  const puffM = ctx.mat({ color: 0xd9dcdc, transparent: true, opacity: 0.5, depthWrite: false }, 'lambert');
  const puffs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), puffM, Math.max(1, chim.length * PUFF));
  puffs.frustumCulled = false;
  ctx.group.add(puffs);

  // ── 드럼통·나무 상자 ──
  const drumG = new THREE.CylinderGeometry(0.6, 0.6, 1.8, 12); drumG.translate(0, 0.9, 0);
  ctx.scatter({ geo: drumG, mat: ctx.mat({ color: 0xffffff, roughness: 0.5, metalness: 0.4 }), n: 160, from: 4, to: 26, scale: [0.9, 1.1],
    color: r => new THREE.Color([0x1f5fa8, 0xe0b31c, 0xb8261d, 0x2fa89a][Math.floor(r() * 4)]), filter: (x, z) => halls.every(h => Math.hypot(h.x - x, h.z - z) > h.r + 2) && taken.every(h => Math.hypot(h.x - x, h.z - z) > h.r) });
  const crateG = new THREE.BoxGeometry(2, 2, 2); crateG.translate(0, 1, 0);
  ctx.scatter({ geo: crateG, mat: ctx.mat({ color: 0xb08a58, roughness: 0.85 }), n: 140, from: 4, to: 30, scale: [0.7, 1.4], shadow: true,
    filter: (x, z) => halls.every(h => Math.hypot(h.x - x, h.z - z) > h.r + 2) && taken.every(h => Math.hypot(h.x - x, h.z - z) > h.r) });

  // ── 경고 간판 ──
  const signAt = (s, f, side, text, bg, fg) => {
    const i = seg(s, f), off = side * (ctx.wallAt(i, side) + 4);
    const g = new THREE.Group();
    const board = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.75), ctx.mat({ map: ctx.sign(text, bg, fg), roughness: 0.6, side: THREE.DoubleSide }));
    board.position.y = 5.2; g.add(board);
    for (const x of [-2.8, 2.8]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.25, 5, 0.25), darkM); p.position.set(x, 2.5, -0.1); g.add(p); }
    ctx.place(g, i, off);
  };
  signAt(34, 0.02, -1, '기름 주의 · 미끄럼', '#f2c21b', '#151515');
  signAt(33, 0.2, 1, '기름 주의 · 미끄럼', '#f2c21b', '#151515');
  signAt(0, 0.9, -1, '안전 제일', '#1d5f57', '#f2c21b');

  // ── 움직임: 톱니·로봇 팔·연기 ──
  const qa = new THREE.Quaternion(), qz = new THREE.Quaternion(), zAxis = new THREE.Vector3(0, 0, 1);
  ctx.onFrame(t => {
    gears.forEach((g, k) => {
      qa.setFromAxisAngle(up, g.yaw); qz.setFromAxisAngle(zAxis, t * g.w * 2 + g.ph); qa.multiply(qz);
      gearIM.setMatrixAt(k, m4.compose(v3.set(g.x, g.y, g.z), qa, sc.set(g.R, g.R, 1.6)));
    });
    gearIM.instanceMatrix.needsUpdate = true;
    arms.forEach((a, k) => {
      const u = t * 0.9 + a.ph;
      a.base.rotation.y = a.yaw + Math.sin(u * 0.5) * 0.6;
      a.sh.rotation.x = -0.35 + Math.sin(u) * 0.35;
      a.el.rotation.x = 0.9 + Math.sin(u + 1.3) * 0.5;
      a.wr.rotation.x = 0.4 + Math.sin(u * 1.7) * 0.4;
      a.base.updateMatrixWorld(true);
      imBase.setMatrixAt(k, a.base.matrixWorld); imLo.setMatrixAt(k, a.lo.matrixWorld); imHi.setMatrixAt(k, a.hi.matrixWorld); imHead.setMatrixAt(k, a.wr.matrixWorld);
    });
    for (const im of [imBase, imLo, imHi, imHead]) im.instanceMatrix.needsUpdate = true;
    let k = 0;
    for (const c of chim) for (let j = 0; j < PUFF; j++, k++) {
      const ph = (t * 0.09 + j / PUFF + c.x * 0.01) % 1;
      const s = (2.2 + ph * 7) * c.sx;
      qn.identity();
      puffs.setMatrixAt(k, m4.compose(v3.set(c.x + ph * 14, c.y + c.top + ph * 26, c.z + ph * 5), qn, sc.set(s, s * 0.8, s)));
    }
    puffs.count = k;
    puffs.instanceMatrix.needsUpdate = true;
  });
}
