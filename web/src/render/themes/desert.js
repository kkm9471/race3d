// 14회차 테마: 사막 (불볕 피라미드) — 뜨거운 한낮, 모래 언덕, 피라미드·오벨리스크·석상, 오아시스(야자수·물웅덩이), 시장 천막
// 그림 전용 (주행 계산과 무관). 무늬는 전부 캔버스로 직접 그림, 무작위는 ctx.rand.

/** 사암 블록 벽 + 청록·금색 띠 (u = 벽 단면: 0~1/3 안쪽 면 아래→위, 1/3~2/3 윗면, v = 4m 마다 1) */
function wallTex(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#d9b27a'; g.fillRect(0, 0, w, h);
    // 안쪽 면 블록 (가로 = 높이 방향, 세로 = 길 방향)
    const face = w / 3;
    for (let x = 0; x < face; x += 12) {
      const off = (Math.floor(x / 12) % 2) * 32;
      for (let y = -64; y < h; y += 64) {
        const l = 58 + Math.floor(ctx.rand() * 12);
        g.fillStyle = `hsl(34, 45%, ${l}%)`;
        g.fillRect(x + 1, y + off + 1, 10, 62);
      }
    }
    // 띠: 높이 0.6~0.95m → x = (h+1.5)/2.6 × face
    const bx0 = (2.1 / 2.6) * face, bx1 = (2.45 / 2.6) * face;
    g.fillStyle = '#1f8f96'; g.fillRect(bx0, 0, bx1 - bx0, h);
    g.fillStyle = '#e8b830';
    for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(bx0, y); g.lineTo(bx1, y + 16); g.lineTo(bx0, y + 32); g.closePath(); g.fill(); }
    // 윗면 갓돌
    g.fillStyle = '#c99a5c'; g.fillRect(face, 0, face, h);
    g.fillStyle = 'rgba(0,0,0,0.12)'; for (let y = 0; y < h; y += 64) g.fillRect(face, y, face, 2);
    // 바깥 면
    g.fillStyle = '#cfa56c'; g.fillRect(face * 2, 0, face, h);
  });
}

export const look = {
  road: 0xeee0c8,           // 모래 먼지 앉은 아스팔트
  line: 0xfff4dc,
  runoffColor: 0xd2b27c,    // 갓길 모래 (기본 모래색보다 조금 짙게 — 한낮 햇빛에 하얗게 번지지 않게)
  wall: { color: 0xffffff, map: wallTex, roughness: 0.92, stripe: false },
  trees: false,             // 기본 나무 대신 야자수·덤불을 직접
  real: {   // 한낮 사막
    sky: 'qwantani_noon_puresky', exposure: 0.95,
    road: { tex: 'worn_asphalt', scale: 3, env: 1.2, bright: 1.5, tint: 0xf0dcc0 },
    runoff: { tex: 'sand_01', scale: 3, tint: 0xe0c898 },
    gravel: { tex: 'sandstone_cracks', scale: 2.5 },
    terrain: { tex: 'sand_01', scale: 8, tint: 0xe0c898 },
    rock: { tex: 'sandstone_cracks', scale: 4 },
    wall: { tex: 'sandstone_cracks', scale: 3, tint: 0xf0e0c0 },
    trees: { con: ['quiver_tree_02'], broad: ['quiver_tree_02'], h: [3, 6], n: 0.3 },
  },
};

export function build(ctx) {
  const { THREE, T, rand, mergeGeometries } = ctx;
  const G = ctx.ground;
  const up = new THREE.Vector3(0, 1, 0);
  const col = (geo, hex) => {
    const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return geo;
  };
  const flat = geo => { const g = geo.index ? geo.toNonIndexed() : geo; g.computeVertexNormals(); return g; };
  /** 위치 목록으로 InstancedMesh 하나 (o = {x,y,z,yaw,s|sx,sy,sz,c}) */
  const inst = (geo, mat, list, shadow = true) => {
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    const m4 = new THREE.Matrix4(), qn = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
    list.forEach((o, k) => {
      qn.setFromAxisAngle(up, o.yaw || 0);
      p.set(o.x, o.y, o.z);
      s.set(o.sx ?? o.s ?? 1, o.sy ?? o.s ?? 1, o.sz ?? o.s ?? 1);
      im.setMatrixAt(k, m4.compose(p, qn, s));
      if (o.c != null) im.setColorAt(k, c.set(o.c));
    });
    im.count = list.length;
    im.castShadow = shadow && ctx.q.detail >= 1; im.receiveShadow = true;
    im.computeBoundingSphere();
    ctx.group.add(im);
    return im;
  };
  /** 구간 seg·비율 frac 의 길에서 가로 d 쯤, 반지름 r 이 길(벽)과 겹치지 않는 자리 — 바깥으로 밀어 가며 찾는다 */
  const spot = (seg, frac, d, r) => {
    const i = ctx.segAt(seg, frac), sd = Math.sign(d) || 1;
    for (let k = 0; k < 40; k++) {
      const dd = d + sd * k * 5, x = T.x[i] + T.lx[i] * dd, z = T.z[i] + T.lz[i] * dd;
      if (ctx.clear(x, z, r)) return { x, z, y: G(x, z), i };
    }
    return null;
  };
  /** 발밑 땅의 가장 낮은 높이 (넓은 건물이 뜨지 않게) */
  const lowAt = (x, z, r) => {
    let m = G(x, z);
    for (let a = 0; a < 8; a++) m = Math.min(m, G(x + Math.cos(a * 0.785) * r, z + Math.sin(a * 0.785) * r));
    return m;
  };
  const faceTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);   // 로컬 +Z 가 (tx,tz) 를 보게

  // ── 재질·무늬 ──
  const stoneTex = ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#d6b47c'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) {
      g.fillStyle = `rgba(90,60,30,${0.18 + ctx.rand() * 0.1})`; g.fillRect(0, y, w, 1.5);
      const off = ctx.rand() * 20;
      for (let x = off; x < w; x += 18 + ctx.rand() * 10) { g.fillStyle = 'rgba(90,60,30,0.15)'; g.fillRect(x, y, 1.2, 8); }
    }
  });
  const stoneM = ctx.mat({ color: 0xffffff, map: stoneTex, roughness: 0.95 });
  const sandstoneM = ctx.mat({ color: 0xd8b783, roughness: 0.9 });
  const goldM = ctx.mat({ color: 0xffc94a, metalness: 1, roughness: 0.25, emissive: 0x6a4200, emissiveIntensity: 0.5 });

  // ── 피라미드: 안쪽 들판에 큰 것, 바깥에 중간·작은 것, 멀리 거대한 것 셋 ──
  const pyrG = flat(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4).translate(0, 0.5, 0));
  const pyrs = [];
  const addPyr = (p, B, H, yaw = 0) => { if (p) pyrs.push({ x: p.x, z: p.z, y: lowAt(p.x, p.z, B * 0.5) - 1.5, sx: B, sz: B, sy: H, yaw }); };
  addPyr(spot(0, 0.65, 115, 80), 112, 74, 0.2);
  addPyr(spot(10, 0.45, -70, 52), 74, 48, -0.3);
  addPyr(spot(10, 0.85, -95, 40), 48, 31, 0.5);
  addPyr(spot(16, 0.5, -90, 52), 70, 45, 0.1);
  {
    const b = T.bounds, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    for (const [a, R, B] of [[0.6, 1150, 240], [1.1, 1250, 190], [3.9, 1100, 220]]) {
      const x = cx + Math.cos(a) * R, z = cz + Math.sin(a) * R;
      pyrs.push({ x, z, y: G(x, z) - 6, sx: B, sz: B, sy: B * 0.64, yaw: a });
    }
  }
  inst(pyrG, stoneM, pyrs);
  // 꼭대기 금 덮개
  inst(pyrG, goldM, pyrs.map(o => ({ x: o.x, z: o.z, yaw: o.yaw, y: o.y + o.sy * 0.93, sx: o.sx * 0.07, sz: o.sz * 0.07, sy: o.sy * 0.07 })), false);

  // ── 석상(사자 몸에 머리쓰개를 쓴 얼굴 — 일반 고대풍): 큰 피라미드 앞, 출발 직선을 본다 ──
  {
    const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
    const parts = [
      box(9, 1.6, 22, 0, 0.2, -2),            // 받침
      box(6.5, 4.6, 13, 0, 3.3, -5),          // 몸통
      box(6.8, 5.6, 5, 0, 3.8, -10.5),        // 뒷다리 엉덩이
      box(1.7, 1.4, 8, -2.2, 1.7, 5),         // 앞발
      box(1.7, 1.4, 8, 2.2, 1.7, 5),
      box(5.2, 5.5, 4, 0, 5.2, 1.6),          // 가슴
      box(3.4, 4.0, 3.4, 0, 9.4, 2.2),        // 얼굴
      box(5.6, 3.6, 3.0, 0, 9.0, 1.2),        // 머리쓰개 양옆
      box(3.9, 1.6, 3.8, 0, 11.8, 2.0),       // 머리쓰개 위
      box(1.0, 2.2, 0.8, 0, 6.6, 4.0),        // 수염
    ];
    const sph = new THREE.Mesh(mergeGeometries(parts), sandstoneM);
    sph.castShadow = true; sph.receiveShadow = true;
    const p = spot(0, 0.8, 44, 16);
    if (p) {
      sph.scale.setScalar(1.5);
      sph.position.set(p.x, lowAt(p.x, p.z, 12) - 0.6, p.z);
      sph.rotation.y = faceTo(p.x, p.z, T.x[p.i], T.z[p.i]);
      ctx.group.add(sph);
      // 석상 양옆 기둥 열 (부서진 신전 기둥)
      const colG = mergeGeometries([
        new THREE.CylinderGeometry(1.0, 1.15, 1, 10).translate(0, 0.5, 0),
      ]);
      const cols = [];
      const yaw = sph.rotation.y, fx = Math.sin(yaw), fz = Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      for (let k = 0; k < 6; k++) for (const sd of [1, -1]) {
        const along = 14 - k * 11, side = sd * 15;
        const x = p.x + fx * along + rx * side, z = p.z + fz * along + rz * side;
        if (!ctx.clear(x, z, 3)) continue;
        const hgt = k % 3 === 2 ? 3 + rand() * 3 : 9 + rand() * 4;     // 몇 개는 부러짐
        cols.push({ x, z, y: G(x, z) - 0.5, sx: 1, sz: 1, sy: hgt });
      }
      inst(colG, sandstoneM, cols);
      // 기둥 머리(연꽃 모양으로 넓게)
      const capG = new THREE.CylinderGeometry(1.7, 1.05, 1.4, 10).translate(0, 0.7, 0);
      inst(capG, sandstoneM, cols.filter(c => c.sy > 6).map(c => ({ x: c.x, z: c.z, y: c.y + c.sy, s: 1 })));
    }
  }

  // ── 오벨리스크: 출발선 양옆, 헤어핀 출구, 계단 코너 ──
  {
    const glyph = ctx.canvasTex(64, 256, (g, w, h) => {
      g.fillStyle = '#d2ad74'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(80,50,20,0.55)'; g.fillStyle = 'rgba(80,50,20,0.55)'; g.lineWidth = 2;
      for (let y = 8; y < h - 8; y += 14) {
        const k = Math.floor(ctx.rand() * 5), cx = w / 2;
        g.beginPath();
        if (k === 0) g.arc(cx, y + 5, 4, 0, 6.3);
        else if (k === 1) { g.moveTo(cx - 6, y + 9); g.lineTo(cx, y); g.lineTo(cx + 6, y + 9); }
        else if (k === 2) { g.moveTo(cx - 7, y + 5); g.lineTo(cx + 7, y + 5); g.moveTo(cx, y); g.lineTo(cx, y + 10); }
        else if (k === 3) g.rect(cx - 5, y + 1, 10, 8);
        else { g.moveTo(cx - 6, y + 2); g.quadraticCurveTo(cx, y + 12, cx + 6, y + 2); }
        g.stroke();
      }
    });
    const obG = flat(new THREE.CylinderGeometry(0.36, 0.5, 1, 4, 1).rotateY(Math.PI / 4).translate(0, 0.5, 0));
    const tipG = flat(new THREE.ConeGeometry(0.36, 0.09, 4, 1).rotateY(Math.PI / 4).translate(0, 0.045, 0));
    const obs = [];
    const add = (seg, frac, sd, gap = 7) => {
      const i = ctx.segAt(seg, frac), w = ctx.wallAt(i, sd) + gap;
      const x = T.x[i] + T.lx[i] * sd * w, z = T.z[i] + T.lz[i] * sd * w;
      if (ctx.clear(x, z, 4)) obs.push({ x, z, y: G(x, z) - 0.6, sx: 3, sz: 3, sy: 22, yaw: Math.atan2(T.tx[i], T.tz[i]) });
    };
    add(0, 0.58, 1, 12); add(0, 0.58, -1, 12);
    add(8, 0.15, 1); add(8, 0.15, -1);
    add(3, 0.5, 1, 9); add(5, 0.5, -1, 9); add(9, 0.5, 1, 9); add(13, 0.5, 1, 9); add(15, 0.5, -1, 9);
    inst(obG, ctx.mat({ color: 0xffffff, map: glyph, roughness: 0.85 }), obs);
    inst(tipG, goldM, obs.map(o => ({ ...o, y: o.y + o.sy })), false);
  }

  // ── 오아시스: 물웅덩이(땅을 따라 붙는 원판) + 풀 + 야자수 둘레 ──
  const water = [], palms = [];
  const ripple = ctx.canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(120,200,215,0.55)'; g.lineWidth = 2;
    for (let k = 0; k < 26; k++) { const x = ctx.rand() * w, y = ctx.rand() * h; g.beginPath(); g.ellipse(x, y, 6 + ctx.rand() * 10, 2 + ctx.rand() * 3, 0, 0, 6.3); g.stroke(); }
  }, { repeat: [3, 3] });
  const waterM = ctx.mat({ color: 0x2f9fb4, map: ripple, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.92 });
  const grassM = ctx.mat({ color: 0x6f9a3a, roughness: 1 });
  const disc = (cx, cz, R, lift, wob) => {
    const N = 32, pos = [cx, G(cx, cz) + lift, cz], uv = [0.5, 0.5], idx = [];
    const ph = rand() * 6;
    for (let k = 0; k <= N; k++) {
      const a = k / N * Math.PI * 2, r = R * (1 + wob * Math.sin(a * 3 + ph) + wob * 0.6 * Math.sin(a * 5 + ph * 2));
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      pos.push(x, G(x, z) + lift, z); uv.push(0.5 + Math.cos(a) * 0.5, 0.5 + Math.sin(a) * 0.5);
      if (k > 0) idx.push(0, k + 1, k);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  };
  const oases = [spot(0, 0.85, -62, 40), spot(12, 0.5, 62, 40), spot(6, 0.15, 70, 38)].filter(Boolean);
  const grassParts = [];
  for (const o of oases) {
    water.push(disc(o.x, o.z, 15, 0.22, 0.12));
    grassParts.push(disc(o.x, o.z, 30, 0.1, 0.1));
    for (let k = 0; k < 16; k++) {
      const a = rand() * Math.PI * 2, r = 18 + rand() * 12, x = o.x + Math.cos(a) * r, z = o.z + Math.sin(a) * r;
      if (ctx.clear(x, z, 4)) palms.push({ x, z, y: G(x, z) - 0.2, s: 0.8 + rand() * 0.6, yaw: rand() * 6.28 });
    }
  }
  if (water.length) {
    const wm = new THREE.Mesh(mergeGeometries(water), waterM); wm.receiveShadow = true; ctx.group.add(wm);
    const gm = new THREE.Mesh(mergeGeometries(grassParts), grassM); gm.receiveShadow = true; ctx.group.add(gm);
    ctx.onFrame(t => { ripple.offset.set(t * 0.02, t * 0.013); });
  }

  // ── 야자수 (줄기 + 잎 8장, 정점 색으로 한 번에 그림) ──
  {
    const parts = [];
    const trunk = new THREE.CylinderGeometry(0.2, 0.36, 9, 7, 6, true).translate(0, 4.5, 0);
    const tp = trunk.attributes.position;
    for (let i = 0; i < tp.count; i++) { const y = tp.getY(i); tp.setX(i, tp.getX(i) + 0.016 * y * y); }
    trunk.computeVertexNormals();
    parts.push(col(trunk, 0x8a6a45));
    const topX = 0.016 * 81;
    for (let k = 0; k < 8; k++) {
      const leaf = new THREE.PlaneGeometry(5.2, 1.2, 5, 1).rotateX(-Math.PI / 2).translate(2.6, 0, 0);
      const lp = leaf.attributes.position;
      for (let j = 0; j < lp.count; j++) {
        const x = lp.getX(j), taper = Math.sin(Math.PI * Math.min(1, x / 5.2 + 0.08)) * 0.9 + 0.1;
        lp.setZ(j, lp.getZ(j) * taper);
        lp.setY(j, 0.45 * x - 0.11 * x * x);
      }
      leaf.rotateY(k / 8 * Math.PI * 2 + (k % 2) * 0.2).translate(topX, 9, 0);
      leaf.computeVertexNormals();
      parts.push(col(leaf, k % 2 ? 0x4f8a2a : 0x3f7a24));
    }
    const palmG = mergeGeometries(parts);
    const palmM = ctx.mat({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide });
    // 길가에도 드문드문 (무리 지어)
    const lump = (x, z) => Math.sin(x * 0.013) + Math.sin(z * 0.017 + 1.3) > 0.7;
    for (let k = 0, tries = 0; k < 70 && tries < 3000; tries++) {
      const i = Math.floor(rand() * T.n), sd = rand() < 0.5 ? 1 : -1, w = ctx.wallAt(i, sd) + 7 + rand() * 30;
      const x = T.x[i] + T.lx[i] * sd * w, z = T.z[i] + T.lz[i] * sd * w;
      if (!lump(x, z) || !ctx.clear(x, z, 5)) continue;
      palms.push({ x, z, y: G(x, z) - 0.2, s: 0.75 + rand() * 0.6, yaw: rand() * 6.28 }); k++;
    }
    inst(palmG, palmM, palms);
  }

  // ── 시장 천막: 출발 직선 바깥쪽에 두 줄, 오아시스 옆에 몇 개 (줄무늬 천 + 개별 색) ──
  {
    const stripe = ctx.canvasTex(64, 64, (g, w, h) => {
      for (let x = 0; x < w; x += 16) { g.fillStyle = '#ffffff'; g.fillRect(x, 0, 8, h); g.fillStyle = '#d8d0c0'; g.fillRect(x + 8, 0, 8, h); }
    });
    const canopy = new THREE.BoxGeometry(4.2, 0.12, 3.6).rotateX(0.2).translate(0, 2.75, 0);
    const valance = new THREE.BoxGeometry(4.2, 0.5, 0.06).translate(0, 2.2, 1.8);
    const back = new THREE.BoxGeometry(4.0, 2.4, 0.06).translate(0, 1.2, -1.7);
    const poles = [[-2, 1.7], [2, 1.7], [-2, -1.7], [2, -1.7]].map(([x, z]) => new THREE.BoxGeometry(0.12, 2.8, 0.12).translate(x, 1.4, z));
    const tentG = mergeGeometries([canopy, valance, back, ...poles]);
    const tentM = ctx.mat({ color: 0xffffff, map: stripe, roughness: 0.9 });
    const hues = [0xd83a2a, 0x2a6fd8, 0xf2b81e, 0x2aa65a, 0xe8752a, 0x9a3ad0, 0x18a8b0];
    const tents = [], goods = [];
    for (const sd of [-1]) for (let k = 0; k < 15; k++) {          // 오른쪽(바깥)만 — 왼쪽은 석상·피라미드 자리
      const i = ctx.segAt(0, 0.6 + k * 0.024), base = ctx.wallAt(i, sd) + 7;
      for (const row of [0, 7]) {
        const w = base + row, x = T.x[i] + T.lx[i] * sd * w, z = T.z[i] + T.lz[i] * sd * w;
        if (!ctx.clear(x, z, 5)) continue;
        const yaw = Math.atan2(T.tx[i], T.tz[i]) + (sd > 0 ? -Math.PI / 2 : Math.PI / 2) + (row ? Math.PI : 0);
        tents.push({ x, z, y: G(x, z) - 0.1, yaw, s: 1, c: hues[Math.floor(rand() * hues.length)] });
        // 천막 앞 항아리·상자
        for (let j = 0; j < 3; j++) {
          const gx = x + Math.sin(yaw) * (2.6 + rand()) + Math.cos(yaw) * (rand() * 3 - 1.5), gz = z + Math.cos(yaw) * (2.6 + rand()) - Math.sin(yaw) * (rand() * 3 - 1.5);
          if (ctx.clear(gx, gz, 3)) goods.push({ x: gx, z: gz, y: G(gx, gz) - 0.05, s: 0.8 + rand() * 0.5, yaw: rand() * 6 });
        }
      }
    }
    for (const o of oases) for (let k = 0; k < 5; k++) {
      const a = rand() * 6.28, r = 36 + rand() * 6, x = o.x + Math.cos(a) * r, z = o.z + Math.sin(a) * r;
      if (ctx.clear(x, z, 5)) tents.push({ x, z, y: G(x, z) - 0.1, yaw: faceTo(x, z, o.x, o.z), s: 1, c: hues[Math.floor(rand() * hues.length)] });
    }
    inst(tentG, tentM, tents);
    const jar = new THREE.LatheGeometry([[0, 0], [0.32, 0.05], [0.45, 0.4], [0.38, 0.8], [0.2, 0.95], [0.24, 1.1], [0.22, 1.12]].map(([x, y]) => new THREE.Vector2(x, y)), 10);
    inst(jar, ctx.mat({ color: 0xb8653a, roughness: 0.8 }), goods);
  }

  // ── 모래 언덕(멀리), 덤불, 바위 ──
  {
    const dune = new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const dp = dune.attributes.position;
    for (let i = 0; i < dp.count; i++) {
      const x = dp.getX(i), z = dp.getZ(i);
      dp.setXYZ(i, x * 1.0, dp.getY(i) * 0.2 * (1 + 0.35 * z), z * 0.6 - 0.25 * x * x * 0.3);
    }
    dune.computeVertexNormals();
    ctx.scatter({ geo: dune, mat: ctx.mat({ color: 0xc9a46c, roughness: 1 }), n: 70, from: 120, to: 520, scale: [40, 85], sink: 0.05, filter: (x, z) => ctx.clear(x, z, 95) });
    const bush = new THREE.IcosahedronGeometry(1, 0).scale(1, 0.55, 1).translate(0, 0.35, 0);
    ctx.scatter({ geo: bush, mat: ctx.mat({ color: 0x8a8a4a, roughness: 1, flatShading: true }), n: 260, from: 5, to: 140, scale: [0.6, 1.5], color: r => new THREE.Color().setHSL(0.13 + r() * 0.08, 0.35, 0.28 + r() * 0.12) });
    const rock = new THREE.DodecahedronGeometry(1, 0).scale(1.2, 0.7, 1);
    ctx.scatter({ geo: rock, mat: ctx.mat({ color: 0xc89a62, roughness: 0.95, flatShading: true }), n: 90, from: 6, to: 160, scale: [0.8, 3.2], sink: 0.3 });
  }
}
