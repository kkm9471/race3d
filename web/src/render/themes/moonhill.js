// 14회차 테마: moonhill — 문힐 불야성 (진짜 밤의 대도시)
// 밝은 청회색 노면(청록 네온 가장자리 선), 네온 띠 두른 벽, 창문마다 불 켜진 고층 빌딩 숲(emissive 창 + 지붕 네온 테두리 + 붉은 경고등),
// 지어낸 글자 네온 간판(건물 벽·길 위 문형 간판), 가로등, 하늘을 훑는 탐조등, 터널(청록 조명)

import { getTex } from '../assets.js';

/** 노면: 푸른 회색 아스팔트 + 가운데 점선 + 양끝 청록 네온선 (u = 길 폭, v = 10m 마다 1) */
function roadTex(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#5d6684'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 900; k++) {
      const v = 80 + Math.floor(ctx.rand() * 60);
      g.fillStyle = `rgba(${v},${v + 6},${v + 24},0.25)`;
      g.fillRect(ctx.rand() * w, ctx.rand() * h, 1 + ctx.rand() * 5, 1 + ctx.rand() * 5);
    }
    // 젖은 길 느낌: 옅은 가로 번짐
    for (let k = 0; k < 10; k++) {
      g.fillStyle = 'rgba(160,190,255,0.07)';
      g.fillRect(0, ctx.rand() * h, w, 6 + ctx.rand() * 14);
    }
    g.fillStyle = '#e8ecff';
    for (let y = 0; y < h; y += 64) g.fillRect(w / 2 - 3, y + 8, 6, 30);        // 가운데 점선
    g.fillStyle = '#4ff0ff';
    g.fillRect(8, 0, 4, h); g.fillRect(w - 12, 0, 4, h);                        // 가장자리 네온
  });
}

/** 벽: 어두운 콘크리트 + 안쪽 면 아래 자홍 네온 띠 + 위 청록 띠 (u = 안쪽 아래→위→윗면→바깥, v = 4m 마다 1) */
function wallTex(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#2b3048'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 160; k++) { g.fillStyle = 'rgba(120,130,180,0.1)'; g.fillRect(ctx.rand() * w, ctx.rand() * h, 3 + ctx.rand() * 12, 2 + ctx.rand() * 8); }
    g.fillStyle = '#ff3fd0'; g.fillRect(40, 0, 18, h);       // 자홍 네온 (안쪽 면 아래쪽)
    g.fillStyle = '#ffd6f6'; g.fillRect(46, 0, 6, h);
    g.fillStyle = '#4ff0ff'; g.fillRect(70, 0, 8, h);        // 청록 가는 띠
    g.fillStyle = '#1a1e30';
    for (let y = 0; y < h; y += 64) g.fillRect(85, y, w - 85, 3);
  });
}

/** 땅: 어두운 포장 + 희미한 격자 + 얼룩 (u,v = 10m마다 1) */
function groundTex(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#2a2f40'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 500; k++) { const v = 40 + Math.floor(ctx.rand() * 40); g.fillStyle = `rgba(${v},${v + 4},${v + 18},0.4)`; g.fillRect(ctx.rand() * w, ctx.rand() * h, 3 + ctx.rand() * 14, 3 + ctx.rand() * 14); }
    g.fillStyle = 'rgba(120,150,230,0.25)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h);
    g.fillStyle = 'rgba(255,240,170,0.25)'; g.fillRect(0, h / 2, w, 2);
  });
}

/** 터널 안: 어두운 패널 + 청록·자홍 네온 줄 (u = 둘레 0~3, v = 6m 마다 1) */
function tunnelTex(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8890ac'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) { g.fillStyle = 'rgba(20,24,44,0.5)'; g.fillRect(0, y, w, 2); }
    for (let x = 0; x < w; x += 64) { g.fillStyle = 'rgba(20,24,44,0.5)'; g.fillRect(x, 0, 2, h); }
    g.fillStyle = '#4ff0ff'; g.fillRect(0, 60, w, 6);
    g.fillStyle = '#ff3fd0'; g.fillRect(0, 150, w, 6);
    g.fillStyle = '#ffffff'; g.fillRect(0, 62, w, 2); g.fillRect(0, 152, w, 2);
  });
}

/** 건물 파사드: 알베도(어두운 유리벽 + 창틀) / 발광(켜진 창) — 한 칸 = 16m×16m (창 4×4) */
function facadeTex(ctx, palette, litRate) {
  const mk = emissive => ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = emissive ? '#000000' : '#242a40'; g.fillRect(0, 0, w, h);
    const c = 64;
    for (let y = 0; y < h; y += c) for (let x = 0; x < w; x += c) {
      if (!emissive) {
        g.fillStyle = '#10142a'; g.fillRect(x + 10, y + 10, c - 20, c - 22);
        g.fillStyle = 'rgba(150,170,230,0.18)'; g.fillRect(x + 10, y + 10, c - 20, 5);
      } else if (ctx.rand() < litRate) {
        g.fillStyle = palette[Math.floor(ctx.rand() * palette.length)];
        g.fillRect(x + 11, y + 11, c - 22, c - 24);
      }
    }
  }, { repeat: [1, 1] });
  return [mk(false), mk(true)];
}

/** 네온 간판 아틀라스: 8줄 (1024×128 씩), 지어낸 글자만 */
const SIGNS = [
  ['달빛 마켓', '#ff3fd0', '#fff0fb'], ['문힐 극장', '#14a8ff', '#e8fbff'], ['별무리 호텔', '#ffb020', '#fff6dc'], ['네온 정원', '#22e0a0', '#e6fff6'],
  ['불야성 노래방', '#ff4a4a', '#fff0f0'], ['은하수 약국', '#4ff0ff', '#06303a'], ['한밤 서점', '#9d6bff', '#f1e9ff'], ['밤하늘 식당', '#ff7a1a', '#fff1e0'],
];
function signAtlas(ctx) {
  return ctx.canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#05060f'; g.fillRect(0, 0, w, h);
    SIGNS.forEach(([t, c, f], k) => {
      const y = k * 128;
      g.fillStyle = '#0a0c1c'; g.fillRect(0, y, w, 128);
      g.strokeStyle = c; g.lineWidth = 8; g.strokeRect(8, y + 8, w - 16, 112);
      g.shadowColor = c; g.shadowBlur = 24;
      g.fillStyle = f; g.font = 'bold 74px "Malgun Gothic", "Noto Sans KR", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(t, w / 2, y + 68);
      g.shadowBlur = 0;
    });
  });
}

export const look = {
  road: 0xb8c0dc,
  roadTex,
  roadRough: 0.5,
  line: 0x4ff0ff,
  wall: { color: 0xffffff, map: wallTex, roughness: 0.6, metalness: 0.1, stripe: false },
  terrainTex: groundTex,
  runoffTex: groundTex,
  trees: false,
  city: false,
  far: [0x0b1030, 0x151c46],
  banner: { bg: '#0b1030', fg: '#4ff0ff' },
  tunnel: { color: 0xaab2d0, map: tunnelTex, light: 0x6ff3ff, emissive: 0x0c2236, portal: 0x2a3358 },
  // 실사(15회차): 밤·네온은 그대로(코드 밤하늘, 네온 벽·간판) + 실제 아스팔트·보도 + 빌딩 외벽은 밤 창 불빛 사진(Facade009) (보통·높음 화질)
  real: {
    road: { tex: 'clean_asphalt', scale: 3, tint: 0xaab6e6, bright: 3.4, env: 1.4, rough: 0.8 },
    runoff: { tex: 'concrete_pavement', scale: 3, tint: 0x8c96b8, bright: 1.8 },
    terrain: { tex: 'concrete_pavement', scale: 4, tint: 0x7a84a8, bright: 1.6 },
    towers: { tex: 'Facade009', glow: 1.6 },
  },
};

export function build(ctx) {
  const { THREE, T, rand } = ctx;
  const m4 = new THREE.Matrix4(), qn = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v3 = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  const instanced = (geo, mat, list, { shadow = false, color = false } = {}) => {
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    list.forEach((o, k) => {
      qn.setFromAxisAngle(up, o.yaw || 0);
      im.setMatrixAt(k, m4.compose(v3.set(o.x, o.y, o.z), qn, sc.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1)));
      if (color) im.setColorAt(k, col.set(o.c));
    });
    im.count = list.length;
    im.castShadow = shadow && ctx.q.detail >= 1;
    im.computeBoundingSphere();
    ctx.group.add(im);
    return im;
  };

  // ── 고층 빌딩: 창 불빛(emissive) — 크기별 상자 6종 × 창 색 2종 ──
  const TILE = 16, SKIRT = 14;
  const towerGeo = (w, h, d) => {
    const g = new THREE.BoxGeometry(w, h + SKIRT, d);
    const uv = g.attributes.uv;
    // 면 순서: +x, -x, +y, -y, +z, -z (4점씩)
    const dims = [[d, h + SKIRT], [d, h + SKIRT], [w, d], [w, d], [w, h + SKIRT], [w, h + SKIRT]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, uv.getX(i) * dims[f][0] / TILE, uv.getY(i) * dims[f][1] / TILE);
    }
    g.translate(0, (h - SKIRT) / 2, 0);
    return g;
  };
  const [aWarm, eWarm] = facadeTex(ctx, ['#ffd98a', '#ffc860', '#fff1c8', '#ffe9a8'], 0.55);
  const [aCool, eCool] = facadeTex(ctx, ['#7ff4ff', '#ff6ae0', '#b9c8ff', '#fff3d0', '#6affc6'], 0.5);
  const mats = [
    ctx.mat({ map: aWarm, emissiveMap: eWarm, emissive: 0xffffff, emissiveIntensity: 1.7, color: 0xffffff, roughness: 0.55, metalness: 0.3 }),
    ctx.mat({ map: aCool, emissiveMap: eCool, emissive: 0xffffff, emissiveIntensity: 1.7, color: 0xffffff, roughness: 0.55, metalness: 0.3 }),
  ];
  // 실사: 빌딩 외벽을 밤 창 불빛 사진으로 (두 가지 색 느낌은 불빛 색조로 구분)
  {
    const set = ctx.q.detail >= 1 && getTex(look.real.towers.tex);
    if (set) {
      const rep = TILE / set.w, cl = t => { if (!t) return null; const c = t.clone(); c.repeat.set(rep, rep); c.anisotropy = 8; c.needsUpdate = true; return c; };
      [[0xffe6c8, 0xffc890], [0xd0e0ff, 0x9fd8ff]].forEach(([tint, em], k) => {
        const m = mats[k];
        m.map = cl(set.map); m.normalMap = cl(set.normalMap); m.roughnessMap = cl(set.rough); m.emissiveMap = cl(set.emis);
        m.color.setHex(tint); m.emissive.setHex(em); m.emissiveIntensity = look.real.towers.glow; m.roughness = 1; m.metalness = 0.15; m.needsUpdate = true;
      });
    }
  }
  const sizes = [[22, 80, 22], [30, 56, 26], [18, 120, 18], [36, 40, 30], [24, 150, 24], [28, 96, 20]];
  const geos = sizes.map(([w, h, d]) => ({ w, h, d, geo: towerGeo(w, h, d) }));
  const blds = [];
  const b = T.bounds;
  const fits = (x, z, r) => blds.every(o => Math.hypot(o.x - x, o.z - z) > o.r + r + 3);
  const near = (x, z) => {   // 가장 가까운 길 샘플과 방향
    let bi = 0, bd = 1e9;
    for (let i = 0; i < ctx.n; i += 3) { const d = (T.x[i] - x) ** 2 + (T.z[i] - z) ** 2; if (d < bd) { bd = d; bi = i; } }
    return bi;
  };
  for (let tries = 0; blds.length < 380 && tries < 9000; tries++) {
    const gi = Math.floor(rand() * geos.length), G = geos[gi];
    const far = rand() < 0.28;
    const x = b.x0 - (far ? 420 : 120) + rand() * (b.x1 - b.x0 + (far ? 840 : 240));
    const z = b.z0 - (far ? 420 : 120) + rand() * (b.z1 - b.z0 + (far ? 840 : 240));
    const r = Math.hypot(G.w, G.d) / 2;
    if (!ctx.clear(x, z, r + 8) || !fits(x, z, r)) continue;
    const i = near(x, z);
    const side = ((x - T.x[i]) * T.lx[i] + (z - T.z[i]) * T.lz[i]) > 0 ? 1 : -1;
    const yaw = ctx.yawAt(i) + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
    // 땅이 기울어도 묻히도록 모서리 중 가장 낮은 곳 기준
    let gy = 1e9;
    for (const [dx, dz] of [[0, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) gy = Math.min(gy, ctx.ground(x + dx * G.w / 2, z + dz * G.d / 2));
    blds.push({ x, z, y: gy, yaw, r, gi, mi: rand() < 0.5 ? 0 : 1, G, near: Math.hypot(x - T.x[i], z - T.z[i]) < 70 });
  }
  const groups = new Map();
  for (const o of blds) { const k = o.gi * 2 + o.mi; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(o); }
  for (const [k, list] of groups) instanced(geos[k >> 1].geo, mats[k & 1], list, { shadow: false });

  // ── 지붕 네온 테두리 + 붉은 경고등 ──
  const crownG = new THREE.BoxGeometry(1, 1, 1); crownG.translate(0, 0.5, 0);
  const NEON = [0xff3fd0, 0x4ff0ff, 0xffb020, 0x9d6bff, 0x22e0a0];
  const crowns = blds.map(o => ({ x: o.x, y: o.y + o.G.h, z: o.z, yaw: o.yaw, sx: o.G.w + 0.8, sy: 1.1, sz: o.G.d + 0.8, c: new THREE.Color(NEON[Math.floor(rand() * NEON.length)]).multiplyScalar(2.2).getHex() }));
  {
    const im = new THREE.InstancedMesh(crownG, ctx.mat({ color: 0xffffff }, 'basic'), crowns.length);
    crowns.forEach((o, k) => {
      qn.setFromAxisAngle(up, o.yaw);
      im.setMatrixAt(k, m4.compose(v3.set(o.x, o.y, o.z), qn, sc.set(o.sx, o.sy, o.sz)));
      im.setColorAt(k, col.setHex(NEON[k % NEON.length]).multiplyScalar(2.2));
    });
    im.count = crowns.length; im.computeBoundingSphere(); ctx.group.add(im);
  }
  const beaconM = ctx.mat({ color: 0xff2a2a }, 'basic');
  const tall = blds.filter(o => o.G.h >= 96);
  instanced(new THREE.BoxGeometry(1.2, 4, 1.2), ctx.mat({ color: 0x15182a, roughness: 0.6, metalness: 0.5 }), tall.map(o => ({ x: o.x, y: o.y + o.G.h, z: o.z, sx: 1, sy: 1, sz: 1 })));
  const beacons = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), beaconM, Math.max(1, tall.length));
  tall.forEach((o, k) => beacons.setMatrixAt(k, m4.compose(v3.set(o.x, o.y + o.G.h + 4.4, o.z), qn.identity(), sc.set(1, 1, 1))));
  beacons.count = tall.length; beacons.computeBoundingSphere(); ctx.group.add(beacons);

  // ── 네온 간판: 건물 길 쪽 벽에 붙임 + 길 위 문형 간판 (아틀라스 한 장 · 그리기 1번) ──
  const atlas = signAtlas(ctx);
  const sPos = [], sUv = [], sIdx = [];
  const quad = (a, bb, c, d, row) => {          // 네 모서리(왼아래, 오른아래, 오른위, 왼위)
    const base = sPos.length / 3;
    for (const p of [a, bb, c, d]) sPos.push(p.x, p.y, p.z);
    const v0 = 1 - (row + 1) / 8, v1 = 1 - row / 8;
    sUv.push(0, v0, 1, v0, 1, v1, 0, v1);
    sIdx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const signOnBuilding = (o, row, sw, y) => {
    const sh = sw / 8;
    qn.setFromAxisAngle(up, o.yaw);
    const P = (lx, ly) => new THREE.Vector3(lx, ly, o.G.d / 2 + 0.25).applyQuaternion(qn).add(new THREE.Vector3(o.x, o.y + y, o.z));
    quad(P(-sw / 2, -sh / 2), P(sw / 2, -sh / 2), P(sw / 2, sh / 2), P(-sw / 2, sh / 2), row);
  };
  let nSign = 0;
  for (const o of blds) {
    if (!o.near || nSign >= 36 || rand() < 0.35) continue;
    const sw = Math.min(o.G.w * 0.9, 24);
    signOnBuilding(o, Math.floor(rand() * 8), sw, 12 + rand() * Math.max(4, o.G.h * 0.6));
    nSign++;
  }
  // 길 위 문형 간판 (높이 9m 이상)
  const gantryPosts = [];
  const gantries = [[0, 0.8], [8, 0.5], [26, 0.5], [34, 0.5], [46, 0.5], [56, 0.5]];
  gantries.forEach(([s, f], k) => {
    const i = ctx.segAt(s, f);
    const L = T.wallL[i] + 3.6, R = T.wallR[i] + 3.6;
    const top = T.y[i] + 10;
    const yaw = ctx.yawAt(i);
    const lat = (d, y, fwd = 0) => new THREE.Vector3(T.x[i] + T.lx[i] * d + T.tx[i] * fwd, y, T.z[i] + T.lz[i] * d + T.tz[i] * fwd);
    const sw = Math.min(L + R, 28), sh = sw / 8, c = (L - R) / 2;
    quad(lat(c - sw / 2, top + 0.2, 0.3), lat(c + sw / 2, top + 0.2, 0.3), lat(c + sw / 2, top + 0.2 + sh, 0.3), lat(c - sw / 2, top + 0.2 + sh, 0.3), k % 8);
    // 뒷면도 읽히게 (반대 방향 면)
    quad(lat(c + sw / 2, top + 0.2, -0.3), lat(c - sw / 2, top + 0.2, -0.3), lat(c - sw / 2, top + 0.2 + sh, -0.3), lat(c + sw / 2, top + 0.2 + sh, -0.3), k % 8);
    for (const d of [L, -R]) {
      const x = T.x[i] + T.lx[i] * d, z = T.z[i] + T.lz[i] * d;
      const gy = Math.min(ctx.ground(x, z), T.y[i]);
      gantryPosts.push({ x, y: gy - 1.5, z, yaw, sx: 1.4, sy: top + sh + 1.7 - gy, sz: 1.4 });
    }
    gantryPosts.push({ x: T.x[i] + T.lx[i] * c, y: top - 0.5, z: T.z[i] + T.lz[i] * c, yaw, sx: L + R + 3, sy: 0.9, sz: 1.0, beam: true });
  });
  {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(sPos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(sUv, 2));
    geo.setIndex(sIdx);
    ctx.signMat = new THREE.MeshBasicMaterial({ map: atlas, color: new THREE.Color(1.5, 1.5, 1.5), side: THREE.DoubleSide, toneMapped: true });
    ctx.group.add(new THREE.Mesh(geo, ctx.signMat));
  }
  const boxG = new THREE.BoxGeometry(1, 1, 1); boxG.translate(0, 0.5, 0);
  instanced(boxG, ctx.mat({ color: 0x1b2036, roughness: 0.5, metalness: 0.6 }), gantryPosts, { shadow: true });

  // ── 가로등 (고개 숙인 팔 + 따뜻한 빛 머리) ──
  const poles = [], heads = [];
  for (let i = 6; i < ctx.n; i += 15) {
    const side = (Math.floor(i / 15) % 2) ? 1 : -1;
    const d = side * (ctx.wallAt(i, side) + 3.6);
    const x = T.x[i] + T.lx[i] * d, z = T.z[i] + T.lz[i] * d;
    if (!ctx.clear(x, z, 0.2)) continue;
    const y = Math.min(ctx.ground(x, z), T.y[i]);
    poles.push({ x, y: y - 0.5, z, sx: 1, sy: 1, sz: 1 });
    heads.push({ x: x - T.lx[i] * side * 0.8, y: y + 9, z: z - T.lz[i] * side * 0.8, yaw: ctx.yawAt(i), sx: 1, sy: 1, sz: 1 });
  }
  const poleG = new THREE.CylinderGeometry(0.13, 0.2, 9.6, 6); poleG.translate(0, 4.8, 0);
  instanced(poleG, ctx.mat({ color: 0x20243a, roughness: 0.6, metalness: 0.5 }), poles);
  const headG = new THREE.BoxGeometry(1.8, 0.28, 0.7);
  instanced(headG, ctx.mat({ color: new THREE.Color(0xffc878).multiplyScalar(2.6) }, 'basic'), heads);

  // ── 탐조등: 하늘을 훑는 빛기둥 (가산 혼합, 안개 무시) ──
  const beams = [];
  const beamM = ctx.mat({ color: 0x9fe8ff, transparent: true, opacity: 0.11, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }, 'basic');
  const bg = new THREE.ConeGeometry(9, 420, 14, 1, true); bg.translate(0, 210, 0);
  const tallest = [...blds].sort((a, c) => (c.G.h + c.y) - (a.G.h + a.y)).slice(0, 5);
  tallest.forEach((o, k) => {
    const m = new THREE.Mesh(bg, beamM);
    m.position.set(o.x, o.y + o.G.h, o.z); m.userData.ph = k * 1.9; m.frustumCulled = false;
    ctx.group.add(m); beams.push(m);
  });

  // ── 움직임: 경고등 깜박임·탐조등 회전·간판 은은한 맥동 ──
  ctx.onFrame(t => {
    beaconM.color.setRGB(1, 0.15, 0.15).multiplyScalar(Math.sin(t * 3.2) > 0.2 ? 2.4 : 0.25);
    for (const m of beams) { const a = t * 0.35 + m.userData.ph; m.rotation.set(Math.sin(a) * 0.5, 0, Math.cos(a * 0.8) * 0.5); }
    const k = 1.45 + Math.sin(t * 2.1) * 0.12;
    ctx.signMat.color.setRGB(k, k, k);
  });
}
