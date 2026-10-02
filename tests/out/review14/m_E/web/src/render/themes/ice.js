// 14회차 테마: 아이스 — 오로라 아래 얼음 왕국. 반투명 얼음 궁전·수정 첨탑, 얼음 아치, 이글루, 펭귄 무리, 얼어붙은 호수, 밤하늘 초록 오로라 띠.
// 밤 맵: 길·차가 잘 보이도록 노면은 밝은 눈 얼음 판, 소품은 은은히 빛나게(emissive).

// ── 질감 ──
function iceRoad(ctx) {
  const r = ctx.rand;
  return ctx.canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#b8cfe6'; g.fillRect(0, 0, w, h);
    // 얼음 판 (큰 사각 + 옅은 색차) + 금
    const cols = 4, rows = 16, cw = w / cols, rh = h / rows;
    for (let a = 0; a < cols; a++) for (let c = 0; c < rows; c++) {
      const v = 214 + (r() * 22 | 0);
      g.fillStyle = `rgb(${v - 22},${v - 6},${Math.min(255, v + 18)})`;
      g.fillRect(a * cw + 2, c * rh + 2, cw - 4, rh - 4);
    }
    g.strokeStyle = 'rgba(255,255,255,0.65)'; g.lineWidth = 1.2;
    for (let i = 0; i < 40; i++) {
      let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 50; y += (r() - 0.5) * 50; g.lineTo(x, y); }
      g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 300; i++) g.fillRect(r() * w, r() * h, 1.5, 1.5);
  });
}
/** 얼음 벽돌 벽 (u 0~1/3 안쪽 면, 1/3~2/3 윗면, 2/3~1 바깥 면 / v = 4m 마다 1) */
function iceWall(ctx) {
  const r = ctx.rand;
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#d7efff'; g.fillRect(0, 0, w, h);
    const third = w / 3;
    for (const x0 of [0, 2 * third]) {
      for (let row = 0; row < 6; row++) {
        const y = row * h / 6, off = (row % 2) * 30;
        for (let x = -off; x < third; x += 60) {
          const v = 196 + (r() * 40 | 0);
          g.fillStyle = `rgb(${v - 40},${v - 10},255)`;
          g.fillRect(x0 + Math.max(0, x) + 1, y + 1, Math.min(58, third - Math.max(0, x)), h / 6 - 2);
        }
      }
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(x0 + third * 0.9, 0, 3, h);
    }
    g.fillStyle = '#f4fbff'; g.fillRect(third, 0, third, h);     // 윗면 눈
  });
}
function lakeTex(ctx) {
  const r = ctx.rand;
  return ctx.canvasTex(512, 512, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.7);
    gr.addColorStop(0, '#9ed8f4'); gr.addColorStop(1, '#4f9ac8');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.5;
    for (let i = 0; i < 50; i++) {
      let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 120; y += (r() - 0.5) * 120; g.lineTo(x, y); }
      g.stroke();
    }
  }, { repeat: [6, 6] });
}

function snow(ctx) {
  const r = ctx.rand;
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#f2f8ff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) { const v = 214 + r() * 41; g.fillStyle = `rgb(${v - 10},${v},255)`; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 4, 0, 7); g.fill(); }
    for (let i = 0; i < 200; i++) { g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(r() * w, r() * h, 2, 2); }
  });
}

export const look = {
  runoffTex: snow,
  runoffColor: 0xffffff,
  terrainTex: snow,
  road: 0xffffff,
  roadTex: iceRoad,
  roadRough: 0.45,
  line: 0xffffff,
  wall: { map: iceWall, color: 0xffffff, roughness: 0.2, metalness: 0.1, emissive: 0x1a4a7a, emissiveIntensity: 0.55, stripe: false },
  trees: false,
  far: [0x3a5a8e, 0x5878ae],
  banner: { bg: '#1f5fa8', fg: '#ffffff' },
};

export function build(ctx) {
  const { THREE, T } = ctx;
  const merge = ctx.mergeGeometries;
  const up = new THREE.Vector3(0, 1, 0);
  const paint = (geo, hex) => {
    const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return geo;
  };
  const at = (geo, x, y, z) => geo.translate(x, y, z);
  const box = (w, h, d, x, y, z, hex) => paint(at(new THREE.BoxGeometry(w, h, d), x, y, z), hex);
  const cone = (r, h, x, y, z, hex, seg = 6) => paint(at(new THREE.ConeGeometry(r, h, seg), x, y + h / 2, z), hex);
  const cyl = (rt, rb, h, x, y, z, hex, seg = 8) => paint(at(new THREE.CylinderGeometry(rt, rb, h, seg), x, y + h / 2, z), hex);
  const spots = ({ n, side = 0, from = 6, to = 60, range = null, filter = null, scale = [0.8, 1.2], face = false, margin = 4, tries = 40 }) => {
    const out = [];
    let t = 0;
    while (out.length < n && t < n * tries) {
      t++;
      const a = range ? range[0] : 0, b = range ? range[1] : T.n;
      const span = ((b - a) % T.n + T.n) % T.n || T.n;
      const i = ((Math.floor(a + ctx.rand() * span) % T.n) + T.n) % T.n;
      const sd = side || (ctx.rand() < 0.5 ? 1 : -1);
      const off = sd * (ctx.wallAt(i, sd) + from + ctx.rand() * (to - from));
      const x = T.x[i] + T.lx[i] * off, z = T.z[i] + T.lz[i] * off;
      if (!ctx.clear(x, z, Math.min(from, margin))) continue;
      if (filter && !filter(x, z, i)) continue;
      const s = scale[0] + ctx.rand() * (scale[1] - scale[0]);
      const ry = face ? ctx.yawAt(i) + (sd > 0 ? -Math.PI / 2 : Math.PI / 2) : ctx.rand() * Math.PI * 2;
      out.push({ x, z, y: ctx.ground(x, z), s, ry, i });
    }
    return out;
  };
  const instance = (geo, mat, list, { color = null, shadow = false } = {}) => {
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    const m4 = new THREE.Matrix4(), qn = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    list.forEach((o, k) => {
      qn.setFromAxisAngle(up, o.ry); sc.set(o.s, o.s, o.s); p.set(o.x, o.y, o.z);
      im.setMatrixAt(k, m4.compose(p, qn, sc));
      if (color) im.setColorAt(k, color(o, k));
    });
    im.count = list.length;
    im.castShadow = shadow && ctx.q.detail >= 1; im.receiveShadow = true;
    im.computeBoundingSphere();
    ctx.group.add(im);
    return im;
  };
  const clearance = (x, z) => {
    let best = Infinity;
    for (let i = 0; i < T.n; i++) {
      const dx = x - T.x[i], dz = z - T.z[i];
      const lat = dx * T.lx[i] + dz * T.lz[i];
      const d = Math.sqrt(dx * dx + dz * dz) - (lat > 0 ? T.wallL[i] : T.wallR[i]);
      if (d < best) best = d;
    }
    return best;
  };
  const inside = (x, z) => {
    let c = false;
    for (let i = 0, j = T.n - 1; i < T.n; j = i++) {
      if ((T.z[i] > z) !== (T.z[j] > z) && x < (T.x[j] - T.x[i]) * (z - T.z[i]) / (T.z[j] - T.z[i]) + T.x[i]) c = !c;
    }
    return c;
  };
  /** 길에서 minC 넘게 떨어진 안쪽 자리 중 (tx,tz) 에 가장 가까운 곳 */
  const openSpot = (tx, tz, minC) => {
    const bb = T.bounds;
    let bx = (bb.x0 + bb.x1) / 2, bz = (bb.z0 + bb.z1) / 2, best = Infinity, cr = 0;
    for (let x = bb.x0; x <= bb.x1; x += 8) for (let z = bb.z0; z <= bb.z1; z += 8) {
      if (!inside(x, z)) continue;
      const c = clearance(x, z);
      if (c < minC) continue;
      const d = Math.hypot(x - tx, z - tz);
      if (d < best) { best = d; bx = x; bz = z; cr = c; }
    }
    return { x: bx, z: bz, c: cr };
  };
  const b = T.bounds;
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  const W = 0xe6f6ff, B1 = 0xa8dcff, B2 = 0x7cc4f2, B3 = 0xc9ecff, WIN = 0xeaffff;
  const iceMat = (extra = {}) => ctx.mat({ vertexColors: true, color: 0xffffff, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.78, emissive: 0x2a86c0, emissiveIntensity: 0.5, ...extra });

  // ── 얼음 궁전 (큰 랜드마크): 궁전 앞 코스(구간 12~14) 가까운 안쪽 ──
  {
    const pi = ctx.segAt(14, 0.5);
    const sp = openSpot(T.x[pi], T.z[pi], 48);
    const P = [], WN = [];
    const R = 24;
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * Math.PI * 2, a2 = (k + 0.5) / 6 * Math.PI * 2;
      const tx = Math.cos(a) * R, tz = Math.sin(a) * R;
      P.push(cyl(3.6, 4.2, 22, tx, 0, tz, B3, 10), cone(4.4, 18, tx, 22, tz, B2, 8));
      const wl = 2 * R * Math.sin(Math.PI / 6);
      const wg = new THREE.BoxGeometry(wl, 9, 2.4); wg.rotateY(-a2 + Math.PI / 2);
      P.push(paint(at(wg, Math.cos(a2) * R * 0.87, 4.5, Math.sin(a2) * R * 0.87), W));
      for (const hy of [8, 14]) {
        const wn = new THREE.BoxGeometry(1.3, 2.4, 0.5); wn.rotateY(-a + Math.PI / 2);
        WN.push(paint(at(wn, Math.cos(a) * (R + 3.7), hy, Math.sin(a) * (R + 3.7)), WIN));
      }
    }
    P.push(box(22, 20, 22, 0, 10, 0, B3));
    for (let k = 0; k < 4; k++) {
      const a = (k + 0.5) / 4 * Math.PI * 2, tx = Math.cos(a) * 11, tz = Math.sin(a) * 11;
      P.push(cyl(2.8, 3.2, 38, tx, 0, tz, W, 8), cone(3.8, 26, tx, 38, tz, B1, 6));
    }
    P.push(cyl(5.0, 6.2, 54, 0, 0, 0, B3, 8), cone(6.6, 46, 0, 54, 0, B2, 6), cone(1.6, 14, 0, 98, 0, W, 6));
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2;
      const wn = new THREE.BoxGeometry(1.5, 3.2, 0.5); wn.rotateY(-a + Math.PI / 2);
      WN.push(paint(at(wn, Math.cos(a) * 5.4, 40, Math.sin(a) * 5.4), WIN));
      const wn2 = new THREE.BoxGeometry(2.4, 5, 0.5); wn2.rotateY(-a + Math.PI / 2);
      WN.push(paint(at(wn2, Math.cos(a) * 11.2, 10, Math.sin(a) * 11.2), WIN));
    }
    const sc = Math.max(0.6, Math.min(1.3, (sp.c - 8) / 36));
    const place = (geo, mat) => {
      geo.scale(sc, sc, sc);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(sp.x, ctx.ground(sp.x, sp.z) - 0.5, sp.z);
      ctx.group.add(m);
    };
    place(merge(P), iceMat({ emissiveIntensity: 0.65 }));
    place(merge(WN), ctx.mat({ vertexColors: true, color: 0xffffff }, 'basic'));
  }

  // ── 수정 첨탑 (길가·들판): 여러 개가 기울어져 모인 기둥 ──
  {
    const P = [];
    const spike = (r, h, x, z, lx, lz, hex) => {
      const g = merge([cyl(r, r * 1.1, h, 0, 0, 0, hex, 6), cone(r, r * 3.4, 0, h, 0, hex, 6)]);
      g.rotateZ(lx); g.rotateX(lz); g.translate(x, -0.4, z); return g;
    };
    P.push(spike(1.4, 9, 0, 0, 0, 0, B1), spike(0.9, 6, 1.9, 0.8, -0.28, 0.1, W), spike(1.0, 7, -1.7, 0.5, 0.25, -0.1, B2), spike(0.7, 4, 0.5, -1.8, 0.1, 0.35, W));
    instance(merge(P), iceMat({ emissiveIntensity: 0.8 }), spots({ n: 62, from: 7, to: 60, scale: [0.8, 2.4] }));
  }

  // ── 얼음 아치 (길 위 높이 10m 넘게): 반원 + 아래로 늘어진 고드름 ──
  {
    const parts = [];
    for (const [seg, fr] of [[0, 0.5], [6, 0.85], [14, 0.4], [17, 0.65], [10, 0.5]]) {
      const i = ctx.segAt(seg, fr);
      const half = Math.max(T.wallL[i], T.wallR[i]), c = (T.wallL[i] - T.wallR[i]) / 2, r0 = half + 2.8;
      const P = [paint(new THREE.TorusGeometry(r0, 0.95, 5, 28, Math.PI), B1), paint(new THREE.TorusGeometry(r0 - 1.6, 0.55, 5, 28, Math.PI), W)];
      for (const s of [-1, 1]) P.push(cyl(1.1, 1.5, 9, s * r0, -9, 0, B2, 6), cone(1.2, 4, s * r0, 0.6, 0, W, 5));
      for (let k = 2; k <= 10; k++) {
        const a = k / 12 * Math.PI, h = 1.6 + ((k * 7) % 4) * 0.5;
        const ic = new THREE.ConeGeometry(0.28, h, 5); ic.rotateX(Math.PI);
        P.push(paint(at(ic, Math.cos(a) * (r0 - 0.9), Math.sin(a) * (r0 - 0.9) - h / 2 - 0.4, 0), W));
      }
      const g = merge(P);
      const p = ctx.pt(i, c);
      g.rotateY(ctx.yawAt(i)); g.translate(p.x, ctx.road(i, c), p.z);
      parts.push(g);
    }
    const m = new THREE.Mesh(merge(parts), iceMat({ emissiveIntensity: 0.9 }));
    ctx.group.add(m);
  }

  // ── 이글루 ──
  {
    const P = [];
    const dome = new THREE.SphereGeometry(3.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    P.push(paint(at(dome, 0, -0.1, 0), 0xeef6ff));
    for (let k = 0; k < 4; k++) { const r = new THREE.TorusGeometry(3.2 * Math.cos(k * 0.34 + 0.1), 0.07, 4, 20); r.rotateX(Math.PI / 2); P.push(paint(at(r, 0, 3.2 * Math.sin(k * 0.34 + 0.1), 0), 0xb8d4ee)); }
    const tun = new THREE.CylinderGeometry(1.25, 1.25, 2.2, 10, 1, false, 0, Math.PI); tun.rotateX(Math.PI / 2); tun.rotateZ(Math.PI / 2);
    P.push(paint(at(new THREE.CylinderGeometry(1.4, 1.4, 2.4, 10, 1, false, Math.PI * 0.5, Math.PI).rotateX(Math.PI / 2).rotateY(Math.PI / 2), 0, 0, 3.3), 0xeef6ff));
    P.push(box(1.6, 1.5, 0.3, 0, 0.75, 4.4, 0x15263c));
    instance(merge(P), ctx.mat({ vertexColors: true, roughness: 0.6, emissive: 0x2a5a8a, emissiveIntensity: 0.4 }), spots({ n: 18, from: 8, to: 40, scale: [1.0, 1.9], face: true }), { shadow: true });
  }

  // ── 펭귄 무리 (몸·배·머리·부리·날개를 한 덩어리로, 무리 15곳 × 6~9마리) ──
  {
    const P = [];
    const sph = (r, x, y, z, sx, sy, sz, hex) => { const g = new THREE.SphereGeometry(r, 10, 8); g.scale(sx, sy, sz); return paint(at(g, x, y, z), hex); };
    P.push(sph(0.55, 0, 0.8, 0, 1, 1.45, 0.9, 0x1b2438), sph(0.46, 0, 0.74, 0.14, 0.95, 1.38, 0.7, 0xf4f8ff), sph(0.33, 0, 1.78, 0.02, 1, 1, 1, 0x1b2438),
      sph(0.2, 0, 1.78, 0.28, 0.5, 0.35, 1.3, 0xffa020).translate(0, -0.06, 0.04),
      sph(0.14, 0.5, 1.0, 0, 0.5, 2.2, 1.1, 0x141c2c), sph(0.14, -0.5, 1.0, 0, 0.5, 2.2, 1.1, 0x141c2c),
      sph(0.18, 0.2, 0.05, 0.2, 1.2, 0.5, 1.6, 0xffa020), sph(0.18, -0.2, 0.05, 0.2, 1.2, 0.5, 1.6, 0xffa020));
    const list = [];
    const centers = spots({ n: 15, from: 9, to: 36, scale: [1, 1], tries: 120 });
    for (const c of centers) {
      const cnt = 6 + Math.floor(ctx.rand() * 4), ang0 = ctx.rand() * 6.28;
      for (let k = 0; k < cnt; k++) {
        const a = ang0 + k * 2.4, d = 0.8 + Math.sqrt(k) * 1.3;
        const x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
        if (!ctx.clear(x, z, 5)) continue;
        list.push({ x, z, y: ctx.ground(x, z) - 0.05, s: 0.85 + ctx.rand() * 0.45, ry: ctx.yawAt(c.i) + (ctx.rand() - 0.5) * 2.4 });
      }
    }
    instance(merge(P), ctx.mat({ vertexColors: true, roughness: 0.55, emissive: 0x0a1a2a }), list, { shadow: true });
  }

  // ── 얼어붙은 호수: 긴 빙판 구간(구간 2~5) 안쪽의 푸른 얼음 원판 (땅이 높은 곳은 땅이 가린다) ──
  {
    const li = ctx.segAt(3, 0.5);
    const sp = openSpot(T.x[li], T.z[li], 40);
    const y = ctx.ground(sp.x, sp.z) + 0.15;
    const geo = new THREE.CircleGeometry(150, 40); geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, ctx.mat({ map: lakeTex(ctx), color: 0xe6f6ff, roughness: 0.08, metalness: 0.2, emissive: 0x1d6aa0, emissiveIntensity: 0.35, transparent: true, opacity: 0.92, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    m.position.set(sp.x, y, sp.z);
    m.receiveShadow = true;
    ctx.group.add(m);
  }

  // ── 오로라: 하늘에 걸린 초록·보라 빛 띠 (일렁임) ──
  {
    const COLS = 72;
    const bands = [];
    const defs = [[0.2, 1.1, 1900, 230, 420, 0], [1.9, 3.0, 2300, 300, 520, 1], [3.5, 4.8, 2000, 260, 460, 2], [5.0, 6.1, 2500, 340, 560, 3]];
    for (const [a0, a1, R, y0, hgt, ph] of defs) {
      const pos = new Float32Array(COLS * 3 * 3), col = new Float32Array(COLS * 3 * 4), idx = [];
      for (let j = 0; j < COLS; j++) {
        const ray = 0.55 + 0.45 * Math.abs(Math.sin(j * 0.9 + ph * 2) * Math.cos(j * 0.37));
        const rows = [[0.3, 1.0, 0.55, 0.65 * ray], [0.25, 0.95, 0.6, 0.5 * ray], [0.55, 0.35, 0.95, 0.0]];
        for (let r = 0; r < 3; r++) { const o = (j * 3 + r) * 4; col[o] = rows[r][0]; col[o + 1] = rows[r][1]; col[o + 2] = rows[r][2]; col[o + 3] = rows[r][3]; }
        if (j < COLS - 1) for (let r = 0; r < 2; r++) { const a = j * 3 + r, bb = (j + 1) * 3 + r; idx.push(a, bb, a + 1, bb, bb + 1, a + 1); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 4));
      g.setIndex(idx);
      const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, fog: false, toneMapped: false }));
      mesh.frustumCulled = false; mesh.renderOrder = 5;
      ctx.group.add(mesh);
      bands.push({ a0, a1, R, y0, hgt, ph, pos, g });
    }
    ctx.onFrame(t => {
      for (const bd of bands) {
        for (let j = 0; j < COLS; j++) {
          const u = j / (COLS - 1), ang = bd.a0 + (bd.a1 - bd.a0) * u;
          const sway = Math.sin(ang * 7 + t * 0.35 + bd.ph) * 90 + Math.sin(ang * 3 - t * 0.2) * 60;
          const R = bd.R + sway;
          const hh = bd.hgt * (0.8 + 0.25 * Math.sin(ang * 11 - t * 0.6 + bd.ph));
          const x = cx + Math.cos(ang) * R, z = cz + Math.sin(ang) * R;
          const yb = bd.y0 + Math.sin(ang * 5 + t * 0.3) * 30;
          bd.pos.set([x, yb, z, x + Math.cos(ang) * 30, yb + hh * 0.5, z + Math.sin(ang) * 30, x + Math.cos(ang) * 70 + Math.sin(t * 0.3 + j) * 12, yb + hh, z + Math.sin(ang) * 70], j * 9);
        }
        bd.g.attributes.position.needsUpdate = true;
      }
    });
  }
}
