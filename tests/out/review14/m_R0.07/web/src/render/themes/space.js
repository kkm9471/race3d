// 14회차 테마: space — 별무리 급행 정거장
// 검은 하늘의 별, 멀리 고리 달린 큰 행성·푸른 행성, 밝은 금속 데크 노면 + 네온 가장자리, 길 위 네온 문,
// 길 밖 고가 레일을 달리는 우주 열차, 투명 튜브 터널, 바위 지대(발광 수정), 기지 돔·안테나·컨테이너

/** 금속 데크 노면 (u = 길 폭, v = 10m 마다 1): 밝은 판 + 이음매 + 가장자리 청록 띠 + 진행 방향 화살 */
function deckTex(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#e4eaf8'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 160; k++) {
      const v = 175 + Math.floor(ctx.rand() * 50);
      g.fillStyle = `rgba(${v},${v + 6},${v + 18},0.20)`;
      g.fillRect(ctx.rand() * w, ctx.rand() * h, 3 + ctx.rand() * 26, 1 + ctx.rand() * 3);
    }
    // 판 이음매
    g.fillStyle = '#7f8aa6';
    g.fillRect(0, 0, w, 3); g.fillRect(0, 128, w, 2);
    g.fillRect(w / 2 - 1, 0, 2, 128);
    // 리벳
    g.fillStyle = '#eef3ff';
    for (let y = 12; y < h; y += 116) for (let x = 14; x < w; x += 38) { g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); }
    // 가장자리 청록 띠
    g.fillStyle = '#35c9e8'; g.fillRect(6, 0, 7, h); g.fillRect(w - 13, 0, 7, h);
    // 가운데 점선
    g.fillStyle = '#8fb4ff'; g.fillRect(w / 2 - 2, 20, 4, 40); g.fillRect(w / 2 - 2, 148, 4, 40);
  }, { repeat: [1, 1] });
}

/** 벽: u = 안쪽 아래→위→윗면→바깥, v = 4m 마다 1. 남색 판 + 안쪽 아래 밝은 청록 발광 띠 */
function wallTex(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#34405e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#26304a'; for (let y = 0; y < h; y += 64) g.fillRect(0, y, w, 3);
    g.fillStyle = '#7de9ff'; g.fillRect(44, 0, 30, h);                       // 발광 띠
    g.fillStyle = '#d8fbff'; g.fillRect(53, 0, 12, h);
    g.fillStyle = '#4a5a82'; g.fillRect(74, 0, 12, h);
    g.fillStyle = '#9db3e8';
    for (let y = 8; y < h; y += 32) { g.beginPath(); g.arc(90, y, 2, 0, 7); g.fill(); }
  });
}

/** 땅: 어두운 금속 바닥 + 격자 + 드문 불빛 (u,v = 10m 마다 1) */
function floorTex(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#4a5166'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 300; k++) {
      const v = 60 + Math.floor(ctx.rand() * 50);
      g.fillStyle = `rgba(${v},${v + 6},${v + 20},0.3)`;
      g.fillRect(ctx.rand() * w, ctx.rand() * h, 3 + ctx.rand() * 14, 3 + ctx.rand() * 14);
    }
    g.fillStyle = '#2b3042';
    g.fillRect(0, 0, w, 3); g.fillRect(0, 128, w, 3); g.fillRect(0, 0, 3, h); g.fillRect(128, 0, 3, h);
    g.fillStyle = '#58e1ff';
    for (let k = 0; k < 3; k++) g.fillRect(8 + ctx.rand() * 230, 8 + ctx.rand() * 230, 4, 4);
  });
}

/** 투명 튜브: 틈은 거의 투명, 갈비뼈(링)만 밝게 (u = 둘레 0~3, v = 6m 마다 1) */
function tubeTex(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(150,215,255,0.16)'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(190,240,255,0.95)'; g.fillRect(0, 0, w, 14);          // 링
    for (let x = 0; x < w; x += 64) { g.fillStyle = 'rgba(190,240,255,0.7)'; g.fillRect(x, 0, 3, h); }   // 세로 살
  });
}

/** 기체 행성 줄무늬 */
function gasTex(ctx, pal) {
  return ctx.canvasTex(512, 256, (g, w, h) => {
    for (let y = 0; y < h; y++) {
      const t = y / h;
      const b = Math.sin(t * 38 + Math.sin(t * 9) * 2) * 0.5 + 0.5;
      const c = pal.map((p, k) => Math.round(p[0] + (pal[(k + 1) % pal.length][0] - p[0]) * b));
      void c;
      const r = pal[0][0] + (pal[1][0] - pal[0][0]) * b, gg = pal[0][1] + (pal[1][1] - pal[0][1]) * b, bl = pal[0][2] + (pal[1][2] - pal[0][2]) * b;
      g.fillStyle = `rgb(${r | 0},${gg | 0},${bl | 0})`; g.fillRect(0, y, w, 1);
    }
    for (let k = 0; k < 40; k++) {
      g.fillStyle = `rgba(255,240,220,${0.04 + ctx.rand() * 0.08})`;
      g.beginPath(); g.ellipse(ctx.rand() * w, ctx.rand() * h, 20 + ctx.rand() * 60, 2 + ctx.rand() * 6, 0, 0, 7); g.fill();
    }
    g.fillStyle = 'rgba(170,70,40,0.75)'; g.beginPath(); g.ellipse(w * 0.3, h * 0.64, 36, 18, 0, 0, 7); g.fill();   // 큰 점
  }, { srgb: true });
}

/** 푸른 행성: 바다 + 대륙 + 구름 */
function oceanTex(ctx) {
  return ctx.canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#1b4f9c'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 40; k++) {
      g.fillStyle = k % 3 ? '#3a8a58' : '#8a7a4a';
      g.beginPath(); g.ellipse(ctx.rand() * w, h * (0.2 + ctx.rand() * 0.6), 20 + ctx.rand() * 60, 10 + ctx.rand() * 28, ctx.rand() * 3, 0, 7); g.fill();
    }
    for (let k = 0; k < 60; k++) {
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.beginPath(); g.ellipse(ctx.rand() * w, ctx.rand() * h, 20 + ctx.rand() * 50, 3 + ctx.rand() * 7, 0, 0, 7); g.fill();
    }
    g.fillStyle = '#f2f6ff'; g.fillRect(0, 0, w, 12); g.fillRect(0, h - 12, w, 12);
  });
}

/** 고리: 지름 방향 줄무늬 (RingGeometry 의 u 는 각도라서, 반지름을 u 로 쓰도록 아래서 uv 를 다시 계산) */
function ringTex(ctx) {
  return ctx.canvasTex(256, 4, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let x = 0; x < w; x++) {
      const a = 0.25 + 0.6 * (Math.sin(x * 0.25) * 0.5 + 0.5) * (x > 100 && x < 112 ? 0.1 : 1);
      g.fillStyle = `rgba(235,215,185,${a})`; g.fillRect(x, 0, 1, h);
    }
  });
}

export const look = {
  road: 0xffffff,
  roadTex: deckTex,
  roadRough: 0.55,
  line: 0x4ff0ff,
  wall: { color: 0xffffff, map: wallTex, roughness: 0.5, metalness: 0.35, stripe: false, emissive: 0x0a2236, emissiveIntensity: 1 },
  terrainTex: floorTex,
  runoffTex: floorTex,
  runoffColor: 0xb6bfd8,
  trees: false,
  city: false,
  far: false,
  banner: { bg: '#071a33', fg: '#5ff0ff' },
  tunnel: { color: 0xffffff, map: tubeTex, light: 0x9fe8ff, emissive: 0x0c2c46, portal: 0x2c4a78 },
};

export function build(ctx) {
  const { THREE, T, rand } = ctx;
  const m4 = new THREE.Matrix4(), qn = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v3 = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  const instanced = (geo, mat, list, { shadow = false, colors = false } = {}) => {
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
  const seg = (s, f) => ctx.segAt(s, f);

  // ── 투명 튜브 터널: 엔진이 불투명으로 그린 터널 재질을 반투명으로 ──
  ctx.group.traverse(o => {
    const m = o.material;
    if (o.isMesh && m && m.side === THREE.DoubleSide && m.map && m.emissive && m.emissive.getHex() === 0x0c2c46) {
      m.transparent = true; m.depthWrite = false; m.roughness = 0.2; m.metalness = 0.3; m.emissiveIntensity = 1.2; m.needsUpdate = true;
      o.renderOrder = 2;
    }
  });

  // ── 큰 행성들 (멀리, 안개 무시) ──
  const b = T.bounds, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  const planet = (map, r, x, y, z, extra = {}) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 24), ctx.mat({ map, fog: false, roughness: 1, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.55, ...extra }));
    mesh.position.set(cx + x, y, cz + z); ctx.group.add(mesh); return mesh;
  };
  const gas = planet(gasTex(ctx, [[222, 170, 112], [150, 96, 62]]), 650, -1700, 650, 2100);
  gas.rotation.z = 0.35;
  {
    const inner = 800, outer = 1500;
    const rg = new THREE.RingGeometry(inner, outer, 96, 1);
    const pos = rg.attributes.position, uv = rg.attributes.uv;
    for (let k = 0; k < pos.count; k++) uv.setXY(k, (Math.hypot(pos.getX(k), pos.getY(k)) - inner) / (outer - inner), 0.5);
    const ring = new THREE.Mesh(rg, ctx.mat({ map: ringTex(ctx), transparent: true, side: THREE.DoubleSide, fog: false, depthWrite: false }, 'basic'));
    ring.position.copy(gas.position); ring.rotation.x = -Math.PI / 2 + 0.38; ring.rotation.y = 0.35;
    ctx.group.add(ring);
  }
  planet(oceanTex(ctx), 230, 2000, 380, -2300);
  const moon = planet(ctx.canvasTex(128, 64, (g, w, h) => { g.fillStyle = '#9a9aa4'; g.fillRect(0, 0, w, h); for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(60,60,70,${0.2 + rand() * 0.3})`; g.beginPath(); g.arc(rand() * w, rand() * h, 2 + rand() * 6, 0, 7); g.fill(); } }), 90, -900, 520, 1200);
  void moon;

  // ── 배치 도우미: 길 밖에 자리 잡기 (겹침 방지) ──
  const taken = [];
  const spot = (i, side, from, to, r) => {
    const off = side * (ctx.wallAt(i, side) + from + rand() * (to - from));
    const x = T.x[i] + T.lx[i] * off, z = T.z[i] + T.lz[i] * off;
    if (!ctx.clear(x, z, r + 4) || taken.some(h => Math.hypot(h.x - x, h.z - z) < h.r + r)) return null;
    taken.push({ x, z, r });
    return { x, z, y: ctx.ground(x, z) };
  };

  // ── 길 위 네온 문 (직선·평지·터널 밖에만) ──
  const gates = [];
  const flat = i => { for (let d = -10; d <= 10; d += 5) { const j = (i + d + T.n) % T.n; if (T.tunnel[j] || T.div[j] !== 0 || T.ramp[j] > 0 || Math.abs(T.k[j]) > 0.0015) return false; } return true; };
  for (let s = 60, last = -1e9; s < T.L; s += 20) {
    const i = ctx.idxAt(s);
    if (s - last < 120 || !flat(i)) continue;
    last = s;
    gates.push({ x: T.x[i], y: T.y[i], z: T.z[i], yaw: ctx.yawAt(i), c: gates.length % 3 === 1 ? 0xff4fd8 : 0x4ff0ff });
  }
  {
    const arcG = new THREE.TorusGeometry(8.6, 0.32, 8, 28, Math.PI);
    const im = instanced(arcG, ctx.mat({ color: 0xffffff, toneMapped: false }, 'basic'), gates.map(g => ({ ...g, sx: 1, sy: 1, sz: 1 })), { colors: true });
    gates.forEach((g, k) => im.setColorAt(k, col.setHex(g.c).multiplyScalar(2.2)));
    im.instanceColor.needsUpdate = true;
  }

  // ── 기지 돔 + 발광 띠, 안테나 탑 + 점멸등, 컨테이너 ──
  const domes = [], bands = [], towers = [], beacons = [], boxes = [];
  for (let i = 0; i < T.n; i += 9) for (const side of [1, -1]) {
    const roll = rand();
    if (roll < 0.22) {
      const r = 6 + rand() * 9, p = spot(i, side, 8, 40, r + 2); if (!p) continue;
      domes.push({ x: p.x, y: p.y - 0.3, z: p.z, sx: r, sy: r * 0.8, sz: r });
      bands.push({ x: p.x, y: p.y + 0.8, z: p.z, sx: r * 1.01, sy: 1, sz: r * 1.01 });
    } else if (roll < 0.34) {
      const h = 30 + rand() * 40, p = spot(i, side, 10, 50, 4); if (!p) continue;
      towers.push({ x: p.x, y: p.y - 0.3, z: p.z, sx: 1, sy: h, sz: 1 });
      beacons.push({ x: p.x, y: p.y + h + 0.6, z: p.z, sx: 1.4, sy: 1.4, sz: 1.4 });
    } else if (roll < 0.5) {
      const p = spot(i, side, 6, 28, 5); if (!p) continue;
      boxes.push({ x: p.x, y: p.y - 0.2, z: p.z, yaw: rand() * 3, sx: 5 + rand() * 4, sy: 2.6, sz: 2.4, c: [0xd05a38, 0x3a7fc8, 0xd8b43a, 0x7a8aa0][Math.floor(rand() * 4)] });
    }
  }
  const domeG = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  instanced(domeG, ctx.mat({ color: 0xb8c4e0, roughness: 0.35, metalness: 0.6 }), domes, { shadow: true });
  const bandG = new THREE.CylinderGeometry(1, 1, 0.9, 20, 1, true);
  instanced(bandG, ctx.mat({ color: 0x70f0ff, toneMapped: false, side: THREE.DoubleSide }, 'basic'), bands);
  const boxG = new THREE.BoxGeometry(1, 1, 1); boxG.translate(0, 0.5, 0);
  const tG = new THREE.CylinderGeometry(0.35, 0.8, 1, 8); tG.translate(0, 0.5, 0);
  instanced(tG, ctx.mat({ color: 0x8a96b4, roughness: 0.4, metalness: 0.7 }), towers, { shadow: true });
  const beaconM = ctx.mat({ color: 0xff3030, toneMapped: false }, 'basic');
  instanced(new THREE.SphereGeometry(0.6, 8, 6), beaconM, beacons);
  instanced(boxG, ctx.mat({ color: 0xffffff, roughness: 0.55, metalness: 0.4 }), boxes, { shadow: true, colors: true });

  // ── 바위 지대 (구간 7~14) + 발광 수정, 그리고 드문 바위 ──
  const rockRange = [seg(7, 0.5), seg(14, 0)];
  const rocks = [], crystals = [];
  const rockSpot = (a, bb, n, minOff, maxOff, make) => {
    for (let tries = 0, k = 0; k < n && tries < n * 20; tries++) {
      const i = Math.floor(a + rand() * ((bb - a + T.n) % T.n)) % T.n, side = rand() < 0.5 ? 1 : -1;
      const off = side * (ctx.wallAt(i, side) + minOff + rand() * (maxOff - minOff));
      const x = T.x[i] + T.lx[i] * off, z = T.z[i] + T.lz[i] * off;
      if (!ctx.clear(x, z, 3)) continue;
      make(x, ctx.ground(x, z), z); k++;
    }
  };
  rockSpot(rockRange[0], rockRange[1], 110, 4, 75, (x, y, z) => {
    const s = 2 + rand() * rand() * 16;
    rocks.push({ x, y: y - s * 0.3, z, yaw: rand() * 6, sx: s * (0.8 + rand() * 0.6), sy: s * (0.6 + rand() * 0.8), sz: s * (0.8 + rand() * 0.6), c: [0x5c5a66, 0x6e6a72, 0x4c4a58, 0x7a6e66][Math.floor(rand() * 4)] });
  });
  rockSpot(0, T.n, 70, 8, 90, (x, y, z) => {
    const s = 1.5 + rand() * 6;
    rocks.push({ x, y: y - s * 0.3, z, yaw: rand() * 6, sx: s, sy: s * 0.7, sz: s, c: 0x55536a });
  });
  rockSpot(rockRange[0], rockRange[1], 36, 5, 40, (x, y, z) => {
    const s = 1.5 + rand() * 3.5;
    crystals.push({ x, y: y - 0.2, z, yaw: rand() * 6, sx: s * 0.6, sy: s * 2, sz: s * 0.6, c: rand() < 0.5 ? 0x5fe8ff : 0xb070ff });
  });
  instanced(new THREE.IcosahedronGeometry(1, 0), ctx.mat({ color: 0xffffff, roughness: 1, flatShading: true }), rocks, { shadow: true, colors: true });
  const crG = new THREE.ConeGeometry(1, 1, 5); crG.translate(0, 0.5, 0);
  const crIM = instanced(crG, ctx.mat({ color: 0xffffff, toneMapped: false }, 'basic'), crystals, { colors: true });
  crystals.forEach((c, k) => crIM.setColorAt(k, col.setHex(c.c).multiplyScalar(1.8)));
  crIM.instanceColor.needsUpdate = true;

  // ── 떠다니는 작은 소행성 (높이 40~140m, 천천히 돈다) ──
  const drift = [];
  for (let k = 0; k < 40; k++) {
    const i = Math.floor(rand() * T.n), side = rand() < 0.5 ? 1 : -1;
    const off = side * (ctx.wallAt(i, side) + 60 + rand() * 200);
    const x = T.x[i] + T.lx[i] * off, z = T.z[i] + T.lz[i] * off;
    if (!ctx.clear(x, z, 30)) continue;
    drift.push({ x, y: 40 + rand() * 100, z, s: 4 + rand() * 12, ph: rand() * 6 });
  }
  const driftIM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), ctx.mat({ color: 0x77738a, roughness: 1, flatShading: true }), Math.max(1, drift.length));
  driftIM.count = drift.length; driftIM.frustumCulled = false; ctx.group.add(driftIM);

  // ── 우주 열차: 길 밖 고가 레일을 달린다 ──
  const CAR = 15, GAP = 1.5, NCAR = 9, RAILH = 7;
  const trains = [];
  const mkTrain = (a, bb, side, off, speed, dir) => {
    const ia = a % T.n, ib = bb % T.n;
    const pa = ctx.pt(ia, side * (ctx.wallAt(ia, side) + off)), pb = ctx.pt(ib, side * (ctx.wallAt(ib, side) + off));
    const dx = pb.x - pa.x, dz = pb.z - pa.z, len = Math.hypot(dx, dz);
    const tr = { ax: pa.x, az: pa.z, ux: dx / len, uz: dz / len, len, yaw: Math.atan2(dx, dz) + (dir < 0 ? Math.PI : 0), y: Math.max(ctx.ground(pa.x, pa.z), ctx.ground(pb.x, pb.z)) + RAILH, speed, dir, ph: rand() * 100 };
    trains.push(tr);
    // 레일 보
    const beam = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.8, len), ctx.mat({ color: 0x59657f, roughness: 0.5, metalness: 0.6 }));
    beam.position.set(pa.x + dx / 2, tr.y - 0.4, pa.z + dz / 2); beam.rotation.y = Math.atan2(dx, dz); ctx.group.add(beam);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.1, len), ctx.mat({ color: 0x4ff0ff, toneMapped: false }, 'basic'));
    for (const sx of [-1.5, 1.5]) { const gm = glow.clone(); gm.position.set(0, 0, 0); gm.position.set(pa.x + dx / 2 + Math.cos(beam.rotation.y) * sx, tr.y + 0.02, pa.z + dz / 2 - Math.sin(beam.rotation.y) * sx); gm.rotation.y = beam.rotation.y; ctx.group.add(gm); }
    // 받침 기둥
    const posts = [];
    for (let s = 0; s <= len; s += 45) { const x = pa.x + tr.ux * s, z = pa.z + tr.uz * s; posts.push({ x, y: ctx.ground(x, z) - 0.5, z, yaw: beam.rotation.y, sx: 1.4, sy: tr.y - ctx.ground(x, z) - 0.7, sz: 1.4 }); }
    instanced(boxG, ctx.mat({ color: 0x3b4560, roughness: 0.5, metalness: 0.6 }), posts, { shadow: true });
  };
  mkTrain(seg(26, 0.03), seg(26, 0.97), -1, 26, 70, 1);       // 마지막 긴 직선 남쪽 (진행 방향과 같게)
  mkTrain(seg(28, 0.0), seg(0, 0.9), -1, 24, 85, -1);         // 출발 직선 서쪽 (마주 달린다)
  const total = trains.length * NCAR;
  const carG = new THREE.BoxGeometry(3.6, 3.4, CAR); carG.translate(0, 1.7, 0);
  const carIM = new THREE.InstancedMesh(carG, ctx.mat({ color: 0xe8edf8, roughness: 0.3, metalness: 0.5 }), total);
  const winG = new THREE.BoxGeometry(3.75, 0.9, CAR - 2); winG.translate(0, 2.1, 0);
  const winIM = new THREE.InstancedMesh(winG, ctx.mat({ color: 0x66e8ff, toneMapped: false }, 'basic'), total);
  const stripG = new THREE.BoxGeometry(3.7, 0.35, CAR - 0.5); stripG.translate(0, 0.9, 0);
  const stripIM = new THREE.InstancedMesh(stripG, ctx.mat({ color: 0xff4fd8, toneMapped: false }, 'basic'), total);
  for (const im of [carIM, winIM, stripIM]) { im.frustumCulled = false; ctx.group.add(im); }
  carIM.castShadow = ctx.q.detail >= 1;

  // ── 안내 간판 ──
  const darkM = ctx.mat({ color: 0x2c3650, roughness: 0.5, metalness: 0.5 });
  const signAt = (s, f, side, text, bg, fg) => {
    const i = seg(s, f), off = side * (ctx.wallAt(i, side) + 4);
    const g = new THREE.Group();
    const board = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.75), ctx.mat({ map: ctx.sign(text, bg, fg), roughness: 0.5, emissive: 0xffffff, emissiveIntensity: 0.25, side: THREE.DoubleSide }));
    board.position.y = 5.2; g.add(board);
    for (const x of [-2.8, 2.8]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.25, 5, 0.25), darkM); p.position.set(x, 2.5, -0.1); g.add(p); }
    ctx.place(g, i, off);
  };
  signAt(0, 0.15, 1, '별무리 급행 정거장', '#071a33', '#5ff0ff');
  signAt(0, 0.92, -1, 'U자 커브 연속 주의', '#f2c21b', '#151515');
  signAt(8, 0.3, 1, '바위 지대', '#3a2a3e', '#ffd36a');
  signAt(14, 0.96, 1, '직각 지그재그', '#f2c21b', '#151515');

  // ── 움직임: 열차·소행성·점멸등 ──
  const ang = new THREE.Euler();
  ctx.onFrame(t => {
    let k = 0;
    for (const tr of trains) {
      const span = tr.len + NCAR * (CAR + GAP) + 200;
      const head = ((t * tr.speed + tr.ph * 10) % span);
      for (let c = 0; c < NCAR; c++, k++) {
        let s = head - c * (CAR + GAP) - CAR / 2;
        const vis = s > CAR / 2 && s < tr.len - CAR / 2;
        const pos = tr.dir > 0 ? s : tr.len - s;            // 반대 방향이면 거꾸로
        const k0 = vis ? 1 : 0;
        qn.setFromAxisAngle(up, tr.yaw);
        m4.compose(v3.set(tr.ax + tr.ux * pos, tr.y, tr.az + tr.uz * pos), qn, sc.set(k0, k0, k0));
        carIM.setMatrixAt(k, m4); winIM.setMatrixAt(k, m4); stripIM.setMatrixAt(k, m4);
      }
    }
    carIM.instanceMatrix.needsUpdate = winIM.instanceMatrix.needsUpdate = stripIM.instanceMatrix.needsUpdate = true;
    drift.forEach((d, j) => {
      qn.setFromEuler(ang.set(t * 0.05 + d.ph, t * 0.07 + d.ph, 0));
      driftIM.setMatrixAt(j, m4.compose(v3.set(d.x, d.y + Math.sin(t * 0.2 + d.ph) * 3, d.z), qn, sc.set(d.s, d.s * 0.8, d.s)));
    });
    driftIM.instanceMatrix.needsUpdate = true;
    beaconM.color.setRGB(1, 0.15, 0.15).multiplyScalar(Math.sin(t * 3) > 0 ? 1.8 : 0.25);
  });
}
