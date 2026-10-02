// 이끼숲 오솔길 테마 — 울창한 숲, 다져진 흙길, 통나무 울타리, 이끼 바위, 거대 버섯, 폭포·개울, 햇살 기둥
// 그림 전용(주행 계산과 무관). 소품은 InstancedMesh 위주, 길·벽 밖 5m 안에는 세우지 않는다.

/** 다져진 흙길: 가로 = 길 폭(0~1), 세로 = 10m */
function dirtRoad(ctx) {
  return ctx.canvasTex(256, 512, (g, w, h) => {
    const r = ctx.rand;
    g.fillStyle = '#9a8264'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 260; k++) {           // 얼룩
      const x = r() * w, y = r() * h, rad = 8 + r() * 40;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      const v = r() < 0.5 ? '120,98,72' : '176,154,120';
      gr.addColorStop(0, `rgba(${v},0.35)`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // 바퀴 자국 두 줄 (조금 어둡고 매끈)
    for (const cx of [0.3, 0.7]) {
      const gr = g.createLinearGradient(cx * w - 26, 0, cx * w + 26, 0);
      gr.addColorStop(0, 'rgba(90,72,52,0)'); gr.addColorStop(0.5, 'rgba(90,72,52,0.28)'); gr.addColorStop(1, 'rgba(90,72,52,0)');
      g.fillStyle = gr; g.fillRect(cx * w - 26, 0, 52, h);
    }
    for (let k = 0; k < 900; k++) {           // 자갈
      const v = 90 + r() * 110;
      g.fillStyle = `rgba(${v + 10},${v},${v - 20},0.8)`;
      g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3);
    }
    for (let k = 0; k < 40; k++) {            // 떨어진 잎
      g.fillStyle = r() < 0.5 ? 'rgba(150,110,40,0.7)' : 'rgba(96,120,48,0.7)';
      g.beginPath(); g.ellipse(r() * w, r() * h, 3 + r() * 3, 1.5 + r() * 2, r() * 3, 0, Math.PI * 2); g.fill();
    }
  });
}

/** 통나무 벽: u(가로) = 벽 단면(안쪽면 0~1/3, 윗면 1/3~2/3), v(세로) = 4m. 통나무가 길 방향으로 누워 쌓인 모양 */
function logWall(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    const r = ctx.rand;
    const band = 18;
    for (let x = 0; x < w; x += band) {
      const gr = g.createLinearGradient(x, 0, x + band, 0);
      gr.addColorStop(0, '#3a2414'); gr.addColorStop(0.25, '#7a5232'); gr.addColorStop(0.55, '#94673f'); gr.addColorStop(0.85, '#5e3e24'); gr.addColorStop(1, '#2c1a0e');
      g.fillStyle = gr; g.fillRect(x, 0, band, h);
      for (let k = 0; k < 26; k++) {          // 나무껍질 결
        g.strokeStyle = `rgba(40,24,12,${0.25 + r() * 0.3})`; g.lineWidth = 1;
        const xx = x + 2 + r() * (band - 4), y = r() * h;
        g.beginPath(); g.moveTo(xx, y); g.lineTo(xx + (r() - 0.5) * 2, y + 10 + r() * 30); g.stroke();
      }
      const joint = r() * h;                   // 이음매
      g.fillStyle = 'rgba(30,18,8,0.8)'; g.fillRect(x + 1, joint, band - 2, 3);
      if (r() < 0.6) {                          // 이끼
        g.fillStyle = 'rgba(92,128,48,0.55)';
        for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(x + r() * band, r() * h, 3 + r() * 7, 0, Math.PI * 2); g.fill(); }
      }
    }
  });
}

/** 나무껍질 (쓰러진 통나무·그루터기) */
function barkTex(ctx) {
  return ctx.canvasTex(128, 128, (g, w, h) => {
    const r = ctx.rand;
    g.fillStyle = '#6a4a30'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 120; k++) {
      g.strokeStyle = `rgba(${r() < 0.5 ? '38,24,14' : '120,92,64'},0.5)`; g.lineWidth = 1 + r() * 2;
      const x = r() * w, y = r() * h;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y + 12 + r() * 30); g.stroke();
    }
    g.fillStyle = 'rgba(90,130,50,0.5)';
    for (let k = 0; k < 14; k++) { g.beginPath(); g.arc(r() * w, r() * h * 0.4, 4 + r() * 8, 0, Math.PI * 2); g.fill(); }
  });
}

/** 버섯 질감: 왼쪽 절반 = 갓(바탕색 + 흰 점), 오른쪽 절반 = 대·주름(크림색) */
function mushroomTex(ctx, cap) {
  return ctx.canvasTex(256, 128, (g, w, h) => {
    const r = ctx.rand;
    g.fillStyle = cap; g.fillRect(0, 0, w / 2, h);
    g.fillStyle = '#fbf3e2';
    for (let k = 0; k < 16; k++) { g.beginPath(); g.ellipse(6 + r() * (w / 2 - 12), 8 + r() * (h * 0.8), 4 + r() * 6, 3 + r() * 5, 0, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#efe2c6'; g.fillRect(w / 2, 0, w / 2, h);
    g.strokeStyle = 'rgba(170,140,100,0.35)';
    for (let k = 0; k < 30; k++) { const x = w / 2 + r() * w / 2; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  }, { repeat: [1, 1] });
}

/** 흐르는 물 (세로로 흐르는 흰 줄) */
function waterTex(ctx, base = '#5aa8c8') {
  return ctx.canvasTex(64, 256, (g, w, h) => {
    const r = ctx.rand;
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 90; k++) {
      g.fillStyle = `rgba(235,250,255,${0.25 + r() * 0.5})`;
      g.fillRect(r() * w, r() * h, 1 + r() * 3, 10 + r() * 40);
    }
  });
}

/** 위치 목록 → InstancedMesh (그리기 1번) */
function inst(ctx, geo, mat, list, shadow = true) {
  const { THREE } = ctx;
  const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  list.forEach((o, k) => {
    e.set(o.rx || 0, o.ry || 0, o.rz || 0);
    q.setFromEuler(e);
    p.set(o.x, o.y, o.z);
    s.set(o.sx ?? o.s ?? 1, o.sy ?? o.s ?? 1, o.sz ?? o.s ?? 1);
    im.setMatrixAt(k, m4.compose(p, q, s));
  });
  im.count = list.length;
  im.castShadow = shadow && ctx.q.detail >= 1;
  im.receiveShadow = true;
  im.computeBoundingSphere();
  ctx.group.add(im);
  return im;
}

/** 버섯 모양 하나 (대 + 갓 + 갓 아래 주름), 높이 약 2.6m */
function mushroomGeo(ctx) {
  const { THREE } = ctx;
  const stem = new THREE.CylinderGeometry(0.28, 0.42, 2, 10, 1, true); stem.translate(0, 1, 0);
  const cap = new THREE.SphereGeometry(1.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); cap.scale(1, 0.62, 1); cap.translate(0, 1.85, 0);
  const gill = new THREE.CircleGeometry(1.4, 16); gill.rotateX(Math.PI / 2); gill.translate(0, 1.85, 0);
  const remap = (geo, u0) => { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, u0 + uv.getX(i) * 0.5); };
  remap(cap, 0); remap(stem, 0.5); remap(gill, 0.5);
  return ctx.mergeGeometries([stem, cap, gill]);
}

/** 이끼 낀 바위: 울퉁불퉁 + 윗면 초록 (꼭짓점 색) */
function mossRockGeo(ctx) {
  const { THREE } = ctx;
  const g = new THREE.IcosahedronGeometry(1, 1).toNonIndexed();
  const pa = g.attributes.position;
  const key = (x, y, z) => `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
  const jit = new Map();
  for (let i = 0; i < pa.count; i++) {
    const k = key(pa.getX(i), pa.getY(i), pa.getZ(i));
    if (!jit.has(k)) jit.set(k, 0.8 + ctx.rand() * 0.4);
    const j = jit.get(k);
    pa.setXYZ(i, pa.getX(i) * j, pa.getY(i) * j * 0.7, pa.getZ(i) * j);
  }
  g.computeVertexNormals();
  const col = new Float32Array(pa.count * 3), grey = new THREE.Color(0x77756c), moss = new THREE.Color(0x5f8a34), c = new THREE.Color();
  const nm = g.attributes.normal;
  for (let i = 0; i < pa.count; i++) {
    c.copy(grey).lerp(moss, Math.max(0, Math.min(1, nm.getY(i) * 1.6 - 0.2)));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.translate(0, 0.35, 0);
  return g;
}

export const look = {
  roadTex: dirtRoad,
  roadRough: 0.92,
  road: 0xffffff,
  line: 0xf6eecb,
  wall: { map: logWall, color: 0xffffff, roughness: 0.92, stripe: false },
  runoffTex: 'grass', runoffColor: 0x8cae62,
  trees: { n: 2.2, conifer: 0.45, hue: [0.22, 0.36], sat: [0.42, 0.68], light: [0.15, 0.3], trunk: 0x4a3524 },
  real: {   // 숲 — 숲 바닥·이끼 바위
    sky: 'kloofendal_overcast_puresky', exposure: 1.0,
    road: { tex: 'forest_ground_04', scale: 3, env: 0.8, bright: 1.5, tint: 0xd8c8a8 },
    runoff: { tex: 'forest_leaves_02', scale: 3, tint: 0xbcd0a0 },
    terrain: { tex: 'forest_leaves_02', scale: 5, tint: 0xb0c898 },
    rock: { tex: 'mossy_rock', scale: 4 },
    wall: { tex: 'mossy_rock', scale: 3, tint: 0xc8b898 },
    trees: { con: ['fir_tree_01'], broad: ['island_tree_02', 'island_tree_01'], h: [9, 18], n: 1.3 },
  },
  far: [0x4a6a56, 0x6c8a84],
};

export function build(ctx) {
  const { THREE, T } = ctx;
  const lambert = (p) => ctx.mat(p, 'lambert');

  // ── 수풀·꽃 (길가를 채운다) ──
  const bushG = new THREE.IcosahedronGeometry(1.2, 0); bushG.scale(1, 0.65, 1); bushG.translate(0, 0.45, 0);
  ctx.scatter({ geo: bushG, mat: ctx.mat({ color: 0xffffff, roughness: 1, flatShading: true }), n: 520, from: 5, to: 32, scale: [0.6, 1.6],
    color: r => new THREE.Color().setHSL(0.25 + r() * 0.1, 0.45 + r() * 0.2, 0.2 + r() * 0.12) });
  const flowerG = new THREE.OctahedronGeometry(0.18, 0); flowerG.translate(0, 0.22, 0);
  const fcols = [0xfff6e0, 0xffd84a, 0xff8fb0, 0xb48cff, 0xffffff];
  ctx.scatter({ geo: flowerG, mat: ctx.mat({ color: 0xffffff, roughness: 0.8, emissive: 0x222222 }), n: 700, from: 5, to: 22, scale: [0.8, 1.5],
    color: r => new THREE.Color(fcols[Math.floor(r() * fcols.length)]) });

  // ── 이끼 바위 ──
  ctx.scatter({ geo: mossRockGeo(ctx), mat: ctx.mat({ vertexColors: true, roughness: 1, flatShading: true }), n: 170, from: 5, to: 55, scale: [0.6, 2.4], sink: 0.15, shadow: true });

  // ── 쓰러진 통나무·그루터기 ──
  const bark = ctx.mat({ map: barkTex(ctx), roughness: 1 });
  const logG = new THREE.CylinderGeometry(0.45, 0.52, 6, 10); logG.rotateZ(Math.PI / 2); logG.translate(0, 0.42, 0);
  ctx.scatter({ geo: logG, mat: bark, n: 46, from: 6, to: 40, scale: [0.7, 1.4], shadow: true });
  const stumpG = new THREE.CylinderGeometry(0.6, 0.8, 1.1, 10); stumpG.translate(0, 0.5, 0);
  ctx.scatter({ geo: stumpG, mat: bark, n: 60, from: 5, to: 45, scale: [0.7, 1.5] });

  // ── 버섯 (작은 것 뿌리기 + 거대 버섯 몇 개) ──
  const mushG = mushroomGeo(ctx);
  const redMush = ctx.mat({ map: mushroomTex(ctx, '#d8352a'), roughness: 0.55 });
  const brownMush = ctx.mat({ map: mushroomTex(ctx, '#c07a2c'), roughness: 0.6 });
  ctx.scatter({ geo: mushG, mat: redMush, n: 80, from: 5, to: 26, scale: [0.45, 1.3], shadow: true,
    color: r => new THREE.Color(1, 0.9 + r() * 0.1, 0.9 + r() * 0.1) });
  ctx.scatter({ geo: mushG, mat: brownMush, n: 60, from: 5, to: 30, scale: [0.4, 1.0] });
  // 거대 버섯: 코너 바깥쪽, 길에서 잘 보이는 자리
  const giants = [];
  for (let k = 0; k < 40 && giants.length < 9; k++) {
    const i = Math.floor(ctx.rand() * T.n);
    if (Math.abs(T.k[i]) < 1 / 120) continue;
    const side = T.k[i] > 0 ? -1 : 1;
    const s = 3.2 + ctx.rand() * 2.8;
    const p = ctx.pt(i, side * (ctx.wallAt(i, side) + 8 + s * 1.4));
    if (!ctx.clear(p.x, p.z, 4 + s * 1.4)) continue;
    if (giants.some(o => Math.hypot(o.x - p.x, o.z - p.z) < 40)) continue;
    giants.push({ x: p.x, y: p.y - 0.3, z: p.z, ry: ctx.rand() * 6.28, s, rz: (ctx.rand() - 0.5) * 0.12 });
  }
  if (giants.length) inst(ctx, mushG, redMush, giants);

  // ── 폭포 + 연못 + 개울 (긴 왼쪽 코너 바깥) ──
  {
    const i = ctx.segAt(6, 0.5), side = -1;
    const wR = ctx.wallAt(i, side);
    const pool = ctx.pt(i, side * (wR + 24));
    const cliffP = ctx.pt(i, side * (wR + 38));
    const yaw = pool.yaw + Math.PI / 2;           // 로컬 +Z 가 길 쪽
    const fx = Math.sin(yaw), fz = Math.cos(yaw);  // 길 쪽 방향
    let gy = Infinity;
    for (let a = 0; a < 8; a++) gy = Math.min(gy, ctx.ground(pool.x + Math.cos(a) * 9, pool.z + Math.sin(a) * 9));
    gy = Math.min(gy, ctx.ground(pool.x, pool.z));
    // 절벽: 큰 바위 덩어리를 겹쳐 쌓기
    const rockParts = [];
    for (let k = 0; k < 9; k++) {
      const gg = new THREE.DodecahedronGeometry(6 + ctx.rand() * 4, 1);
      const lx = (k % 3 - 1) * 9 + (ctx.rand() - 0.5) * 4, ly = Math.floor(k / 3) * 7 + 3, lz = -Math.floor(k / 3) * 2.5 - ctx.rand() * 2;
      gg.scale(1, 0.9, 0.7);
      gg.translate(lx, ly, lz);
      rockParts.push(gg);
    }
    const cliffG = ctx.mergeGeometries(rockParts);
    const cliff = new THREE.Mesh(cliffG, ctx.mat({ map: ctx.TX.rock(ctx.aniso), color: 0x8e9a7e, roughness: 1, flatShading: true }));
    cliff.position.set(cliffP.x, Math.min(cliffP.y, gy) - 1, cliffP.z); cliff.rotation.y = yaw;
    cliff.castShadow = ctx.q.detail >= 1; cliff.receiveShadow = true;
    ctx.group.add(cliff);
    // 떨어지는 물줄기 (빛나게 — 숲 그늘에서도 눈에 띄게)
    const fallTex = waterTex(ctx, '#7cc4e0');
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(7, 22, 1, 1), ctx.mat({ map: fallTex, color: new THREE.Color(1.25, 1.4, 1.55), transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide }, 'basic'));
    fall.position.set(cliffP.x + fx * 7.5, gy + 10.5, cliffP.z + fz * 7.5); fall.rotation.y = yaw;
    ctx.group.add(fall);
    // 연못
    const pondTex = waterTex(ctx, '#3f8aa6'); pondTex.repeat.set(3, 1);
    const pond = new THREE.Mesh(new THREE.CircleGeometry(11, 32), ctx.mat({ map: pondTex, color: 0x9fd0e0, roughness: 0.12, metalness: 0.15 }));
    pond.rotation.x = -Math.PI / 2; pond.position.set(pool.x, gy + 0.18, pool.z);
    ctx.group.add(pond);
    // 물보라
    const foamG = new THREE.SphereGeometry(1, 8, 6); foamG.scale(1, 0.5, 1);
    const foam = [];
    for (let k = 0; k < 10; k++) foam.push({ x: cliffP.x + fx * (7 + ctx.rand() * 3) + (ctx.rand() - 0.5) * 6 * fz, y: gy + 0.3, z: cliffP.z + fz * (7 + ctx.rand() * 3) - (ctx.rand() - 0.5) * 6 * fx, s: 0.8 + ctx.rand() * 1.2 });
    inst(ctx, foamG, ctx.mat({ color: 0xffffff, emissive: 0x6a8a96, roughness: 0.4 }), foam, false);
    // 개울: 연못에서 길(5번 직선)을 따라 흘러간다 — 벽 밖 13~18m
    const a = ctx.segAt(5, 0.15), b = ctx.segAt(6, 0.42);
    const pos = [], uv = [], idx = [];
    let row = 0;
    for (let j = a; ; j = (j + 1) % T.n) {
      const w0 = ctx.wallAt(j, side) + 13, w1 = w0 + 5;
      for (const [c, d] of [[0, w0], [1, w1]]) {
        const x = T.x[j] + T.lx[j] * side * d, z = T.z[j] + T.lz[j] * side * d;
        pos.push(x, ctx.ground(x, z) + 0.22, z); uv.push(c, row * 0.4);
      }
      if (row > 0) { const p = (row - 1) * 2; idx.push(p, p + 2, p + 1, p + 1, p + 2, p + 3); }
      row++;
      if (j === b || row > 400) break;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    sg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    sg.setIndex(idx); sg.computeVertexNormals();
    const streamTex = waterTex(ctx, '#4a98b4');
    const stream = new THREE.Mesh(sg, ctx.mat({ map: streamTex, color: 0xb0dcea, roughness: 0.15, metalness: 0.1, side: THREE.DoubleSide }));
    ctx.group.add(stream);
    ctx.onFrame((t) => { fallTex.offset.y = t * 1.6; streamTex.offset.y = -t * 0.5; pondTex.offset.y = t * 0.05; });
  }

  // ── 통나무 아치: 11번 직선 위로 거대한 쓰러진 나무 (높이 8.5m) ──
  {
    const i = ctx.segAt(11, 0.55);
    const wl = ctx.wallAt(i, 1), wr = ctx.wallAt(i, -1);
    const rockG = new THREE.DodecahedronGeometry(3.6, 1); rockG.scale(1, 2.0, 1);
    const rocks = [1, -1].map(sd => { const p = ctx.pt(i, sd * ((sd > 0 ? wl : wr) + 7.5)); return { x: p.x, y: p.y + 3.5, z: p.z, ry: ctx.rand() * 6, s: 1 }; });
    inst(ctx, rockG, ctx.mat({ map: ctx.TX.rock(ctx.aniso), color: 0x86917a, roughness: 1, flatShading: true }), rocks);
    const span = wl + wr + 15 + 6;
    const logA = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.45, span, 14), bark);
    const c = ctx.pt(i, (wl - wr) / 2);
    logA.rotation.order = 'YXZ';
    logA.rotation.y = c.yaw; logA.rotation.z = Math.PI / 2 + 0.03;
    logA.position.set(c.x, c.y + 10, c.z);   // 아래면이 길에서 8.5m 위
    logA.castShadow = ctx.q.detail >= 1;
    ctx.group.add(logA);
  }

  // ── 햇살 기둥 (나뭇잎 사이로 내려오는 빛) ──
  {
    const sun = ctx.def.sun || { elev: 38, azim: 145 };
    const ph = (90 - sun.elev) * Math.PI / 180, th = sun.azim * Math.PI / 180;
    const dir = new THREE.Vector3(Math.sin(ph) * Math.sin(th), Math.cos(ph), Math.sin(ph) * Math.cos(th));
    const rayG = new THREE.CylinderGeometry(2.2, 3.6, 36, 10, 1, true); rayG.translate(0, 18, 0);
    const im = new THREE.InstancedMesh(rayG, ctx.mat({ color: 0xfff0c0, transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }, 'basic'), 30);
    const qn = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir), m4 = new THREE.Matrix4(), one = new THREE.Vector3(1, 1, 1);
    let k = 0;
    for (let t = 0; t < 200 && k < 30; t++) {
      const i = Math.floor(ctx.rand() * T.n), sd = ctx.rand() < 0.5 ? 1 : -1;
      const p = ctx.pt(i, sd * (ctx.wallAt(i, sd) + 4 + ctx.rand() * 14));
      if (!ctx.clear(p.x, p.z, 3)) continue;
      im.setMatrixAt(k++, m4.compose(new THREE.Vector3(p.x, p.y - 1, p.z), qn, one));
    }
    im.count = k; im.computeBoundingSphere();
    ctx.group.add(im);
  }
}
