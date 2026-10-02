// 14회차 테마: mine — 붉은 갱도 내리막 (어두운 광산 협곡)
// 나무 버팀목 틀(길을 가로지르는 들보 + 매달린 랜턴, 터널 안 기둥), 광차 레일과 광차, 용암 줄기·웅덩이(emissive, 흐름),
// 컨베이어(벨트가 움직이고 광석이 실려 간다), 광석 더미. 길가 평지(갓길 밖 비탈 위 약간 평평한 띠)에만 놓는다.
// 빛은 전부 emissive/Basic(+블룸), 실시간 조명 없음.

// ── 질감 ──
function dirtRoad(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8a8078'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { const v = 90 + Math.floor(ctx.rand() * 70); g.fillStyle = `rgba(${v + 20},${v},${v - 20},0.28)`; g.beginPath(); g.arc(ctx.rand() * w, ctx.rand() * h, 3 + ctx.rand() * 11, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(40,24,18,0.28)';                       // 수레바퀴 자국 두 줄
    g.fillRect(w * 0.27, 0, 14, h); g.fillRect(w * 0.7, 0, 14, h);
    for (let i = 0; i < 500; i++) { g.fillStyle = ctx.rand() < 0.15 ? 'rgba(255,200,110,0.8)' : 'rgba(30,20,16,0.45)'; g.fillRect(ctx.rand() * w, ctx.rand() * h, 1.6, 1.6); }
  }, { repeat: [1, 1.5] });
}
function rubble(ctx) {
  return ctx.canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) { const v = 170 + Math.floor(ctx.rand() * 85); g.fillStyle = `rgb(${v},${v - 14},${v - 28})`; g.beginPath(); g.arc(ctx.rand() * w, ctx.rand() * h, 1 + ctx.rand() * 3, 0, 7); g.fill(); }
  });
}
function plankTunnel(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#6a4a30'; g.fillRect(0, 0, w, h);
    const pw = 32;
    for (let x = 0; x < w; x += pw) {
      const v = 120 + Math.floor(ctx.rand() * 40);
      g.fillStyle = `rgb(${v},${v * 0.7},${v * 0.45})`; g.fillRect(x + 2, 0, pw - 4, h);
      g.strokeStyle = 'rgba(40,22,10,0.35)'; g.lineWidth = 1.5;
      for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(x + 4 + ctx.rand() * (pw - 8), 0); g.lineTo(x + 4 + ctx.rand() * (pw - 8), h); g.stroke(); }
    }
    g.fillStyle = 'rgba(30,18,10,0.5)'; for (let y = 40; y < h; y += 128) g.fillRect(0, y, w, 10);   // 가로 띠
  });
}
function lavaTex(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3a1004'; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const x = ctx.rand() * w, y = ctx.rand() * h, r = 18 + ctx.rand() * 40;
      for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) {
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        gr.addColorStop(0, 'rgba(255,200,70,0.95)'); gr.addColorStop(0.5, 'rgba(255,110,20,0.6)'); gr.addColorStop(1, 'rgba(255,60,0,0)');
        g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      }
    }
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = 'rgba(25,8,4,0.8)'; g.lineWidth = 4;        // 식은 껍질 균열
    for (let i = 0; i < 18; i++) { g.beginPath(); const x = ctx.rand() * w, y = ctx.rand() * h; g.moveTo(x, y); g.lineTo(x + (ctx.rand() - 0.5) * 60, y + (ctx.rand() - 0.5) * 60); g.stroke(); }
  });
}
function beltTex(ctx) {
  return ctx.canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#2c2a2e'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#8a8a96'; g.lineWidth = 5; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(10, 50); g.lineTo(32, 26); g.lineTo(54, 50); g.stroke();
  });
}
function glowTex(ctx) {
  return ctx.canvasTex(64, 64, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, { srgb: false });
}

export const look = {
  roadTex: dirtRoad,
  roadRough: 0.95,
  road: 0xffffff,
  line: 0xffc870,
  rock: 0xe8d0b8,
  rail: 0x8a7060,
  terrainTex: rubble,
  trees: false,
  far: [0x3a1c12, 0x5a2a18],
  banner: { bg: '#3a1e10', fg: '#ffb050' },
  tunnel: { color: 0xd8b088, map: plankTunnel, light: 0xffb060, emissive: 0x3a2008, portal: 0x7a5230 },
};

export function build(ctx) {
  const { THREE, T } = ctx;
  const merge = ctx.mergeGeometries;
  const up = new THREE.Vector3(0, 1, 0);
  const norm = i => ((Math.round(i) % T.n) + T.n) % T.n;
  const paint = (geo, hex) => {
    if (geo.index) geo = geo.toNonIndexed();
    const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return geo;
  };
  const at = (geo, x, y, z) => geo.translate(x, y, z);
  /** 구간 → 샘플 범위 [a, b) (출발선을 넘어가면 b 가 n 보다 커진다) */
  const rng = (s0, f0, s1, f1) => { const a = ctx.segAt(s0, f0); let b = ctx.segAt(s1, f1); if (b <= a) b += T.n; return [a, b]; };
  /** 바깥 지형이 낮아 가드레일이 서는 쪽(트인 쪽)인가 */
  const openSide = (i, sd) => {
    const w = ctx.wallAt(i, sd) + 14;
    return ctx.ground(T.x[i] + T.lx[i] * sd * w, T.z[i] + T.lz[i] * sd * w) < T.y[i] - 0.5;
  };
  const verge = (i, sd, gap) => {
    const off = sd * (ctx.wallAt(i, sd) + gap);
    const x = T.x[i] + T.lx[i] * off, z = T.z[i] + T.lz[i] * off;
    return { x, z, y: ctx.ground(x, z), i, ok: ctx.clear(x, z, Math.max(2, gap - 1)) && Math.abs(ctx.ground(x, z) - (T.y[i] - 0.4)) < 1.4 };
  };
  /** 길가 띠(트인 쪽 갓길 밖 평지)를 따라 이어지는 점 줄들 */
  const lanes = (a, b, gap, sides = [1, -1], { minLen = 6 } = {}) => {
    const out = [];
    for (const sd of sides) {
      let cur = [];
      const flush = () => { if (cur.length >= minLen) out.push({ sd, pts: cur }); cur = []; };
      for (let i = a; i < b; i++) {
        const idx = norm(i);
        const p = verge(idx, sd, gap);
        if (p.ok && openSide(idx, sd) && (!cur.length || Math.abs(p.y - cur[cur.length - 1].y) < 0.7)) cur.push(p); else flush();
      }
      flush();
    }
    return out;
  };
  /** 점 줄 → 띠 모양(폭 w, 땅에서 lift 만큼 위) */
  const strip = (lane, w, lift, uvLen, offs = 0) => {
    const P = lane.pts, n = P.length, pos = new Float32Array(n * 6), uv = new Float32Array(n * 4), idx = [];
    let s = 0;
    for (let k = 0; k < n; k++) {
      const p = P[k], i = p.i;
      if (k) s += Math.hypot(p.x - P[k - 1].x, p.z - P[k - 1].z);
      for (let e = 0; e < 2; e++) {
        const d = (e ? 0.5 : -0.5) * w + offs;
        pos[k * 6 + e * 3] = p.x + T.lx[i] * d; pos[k * 6 + e * 3 + 1] = p.y + lift; pos[k * 6 + e * 3 + 2] = p.z + T.lz[i] * d;
        uv[k * 4 + e * 2] = e; uv[k * 4 + e * 2 + 1] = s / uvLen;
      }
      if (k) { const a = (k - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2, a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };
  const addMesh = (geo, mat, shadow = false) => { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow && ctx.q.detail >= 1; m.receiveShadow = true; ctx.group.add(m); return m; };
  const instance = (geo, mat, list, { color = null, shadow = false } = {}) => {
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    const m4 = new THREE.Matrix4(), qn = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    list.forEach((o, k) => {
      qn.setFromAxisAngle(up, o.ry || 0); sc.set(o.sx ?? o.s ?? 1, o.sy ?? o.s ?? 1, o.sz ?? o.s ?? 1); p.set(o.x, o.y, o.z);
      im.setMatrixAt(k, m4.compose(p, qn, sc));
      if (color) im.setColorAt(k, color(o, k));
    });
    im.count = list.length;
    im.castShadow = shadow && ctx.q.detail >= 1; im.receiveShadow = true;
    im.computeBoundingSphere();
    ctx.group.add(im);
    return im;
  };
  const spots = ({ n, from = 5, to = 12, range = null, scale = [0.8, 1.2], filter = null }) => {
    const out = [];
    let t = 0;
    while (out.length < n && t < n * 60) {
      t++;
      const a = range ? range[0] : 0, b = range ? range[1] : T.n;
      const i = norm(a + ctx.rand() * (b - a));
      const sd = ctx.rand() < 0.5 ? 1 : -1;
      if (!openSide(i, sd)) continue;
      const off = sd * (ctx.wallAt(i, sd) + from + ctx.rand() * (to - from));
      const x = T.x[i] + T.lx[i] * off, z = T.z[i] + T.lz[i] * off;
      const y = ctx.ground(x, z);
      if (!ctx.clear(x, z, Math.min(from, 3)) || Math.abs(y - (T.y[i] - 0.4)) > 1.4) continue;
      if (filter && !filter(x, z, i, y)) continue;
      out.push({ x, z, y, s: scale[0] + ctx.rand() * (scale[1] - scale[0]), ry: ctx.rand() * Math.PI * 2, i });
    }
    return out;
  };
  const flat = (x, z, r, tol) => { let lo = Infinity, hi = -Infinity; for (let a = 0; a < 8; a++) { const h = ctx.ground(x + Math.cos(a * 0.785) * r, z + Math.sin(a * 0.785) * r); lo = Math.min(lo, h); hi = Math.max(hi, h); } return hi - lo < tol ? lo : null; };

  // ── 나무 버팀목 틀: 길 양쪽 벽 아래 기둥 + 길을 가로지르는 들보 + 매달린 랜턴 ──
  {
    const posts = [], beams = [], lamps = [], inner = [];
    const lampAt = (i, c, y) => ({ x: T.x[i] + T.lx[i] * c, y, z: T.z[i] + T.lz[i] * c, s: 1 });
    const frame = (i, tunnel) => {
      const L = T.wallL[i], R = T.wallR[i], H = tunnel ? 4.6 : 7.8;
      const yl = ctx.road(i, L - 0.6), yr = ctx.road(i, -R + 0.6);
      const mk = (d, y) => ({ x: T.x[i] + T.lx[i] * d, z: T.z[i] + T.lz[i] * d, y: y - 0.3, sx: 1, sy: H + 0.3, sz: 1, ry: 0 });
      posts.push(mk(L - 0.6 + (tunnel ? -0.1 : 0), yl), mk(-R + 0.6 + (tunnel ? 0.1 : 0), yr));
      const span = L + R + 0.4, cx = (L - R) / 2;
      beams.push({ x: T.x[i] + T.lx[i] * cx, y: T.y[i] + H, z: T.z[i] + T.lz[i] * cx, sx: span, sy: 1, sz: 1, ry: Math.atan2(-T.lz[i], T.lx[i]) });
      lamps.push(lampAt(i, cx, T.y[i] + H - 0.75));
    };
    const stepOpen = Math.round(48 / T.ds), stepTun = Math.round(11 / T.ds);
    const bad = i => { for (let k = -14; k <= 14; k++) { const j = norm(i + k); if (T.ramp[j] > 0 || T.divW[j] > 0 || T.padW[j] > 0) return true; } return false; };
    const startI = ctx.idxAt(0);
    for (let i = 0; i < T.n; i += stepTun) {
      if (!T.tunnel[i]) continue;
      if (T.divW[i] > 0) continue;
      frame(i, true);
    }
    for (let i = stepOpen; i < T.n; i += stepOpen) {
      if (T.tunnel[i] || bad(i)) continue;
      let near = false; for (let k = -12; k <= 12; k += 4) if (T.tunnel[norm(i + k)]) near = true;
      if (near) continue;
      if (Math.min(Math.abs(i - startI), T.n - Math.abs(i - startI)) < 40) continue;
      frame(i, false);
    }
    const wood = ctx.mat({ color: 0xa8784c, roughness: 0.95, emissive: 0x2a1a0c });
    const post = new THREE.BoxGeometry(0.55, 1, 0.55); post.translate(0, 0.5, 0);
    instance(post, wood, posts, { shadow: true });
    const beam = new THREE.BoxGeometry(1, 0.7, 0.6);
    instance(beam, wood, beams, { shadow: true });
    const chain = new THREE.BoxGeometry(0.06, 0.7, 0.06); chain.translate(0, 0.55, 0);
    const lampG = merge([new THREE.SphereGeometry(0.34, 10, 8), chain]);
    instance(lampG, ctx.mat({ color: new THREE.Color(2.4, 1.5, 0.6) }, 'basic'), lamps);
  }

  // ── 용암 줄기 (협곡 구간, 길가 평지에 흐른다) + 용암 웅덩이 ──
  const lavaTexture = lavaTex(ctx);
  const lavaMat = ctx.mat({ map: lavaTexture, color: new THREE.Color(1.5, 1.25, 1.0), side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }, 'basic');
  {
    const a = ctx.segAt(15, 0), b = Math.max(ctx.segAt(29, 0), a + 10);
    const ls = lanes(a, b, 7.5, [1, -1], { minLen: 8 });
    for (const l of ls) addMesh(strip(l, 4.2, 0.12, 6), lavaMat);
    const geo = new THREE.CircleGeometry(1, 28); geo.rotateX(-Math.PI / 2);
    const list = [];
    for (const o of spots({ n: 60, from: 7, to: 22, range: [a, b], scale: [3, 7], filter: (x, z, i) => flat(x, z, 6, 0.9) !== null })) {
      const y0 = flat(o.x, o.z, o.s, 99);
      list.push({ x: o.x, z: o.z, y: y0 + 0.08, s: o.s, ry: o.ry });
    }
    const spread = spots({ n: 26, from: 7, to: 20, scale: [2.5, 5], filter: (x, z) => flat(x, z, 5, 0.8) !== null });
    for (const o of spread) list.push({ x: o.x, z: o.z, y: flat(o.x, o.z, o.s, 99) + 0.08, s: o.s, ry: o.ry });
    instance(geo, lavaMat, list).receiveShadow = false;
    // 용암 위 열기(빛무리)
    const glow = new THREE.PlaneGeometry(1, 1); glow.rotateX(-Math.PI / 2);
    instance(glow, ctx.mat({ map: glowTex(ctx), color: new THREE.Color(1.0, 0.45, 0.1), transparent: true, opacity: 0.55, depthWrite: false }, 'basic'),
      list.map(o => ({ x: o.x, y: o.y + 0.25, z: o.z, s: o.s * 3.2, ry: 0 }))).receiveShadow = false;
    ctx.onFrame(t => { lavaTexture.offset.set(0, -t * 0.025); });
  }

  // ── 광차 레일 + 광차 ──
  {
    const zones = [rng(0, 0.25, 3, 0.2), rng(4, 0, 14, 1), rng(19, 0, 29, 0), rng(33, 0, 45, 0.5)];
    const sleep = [], railLanes = [];
    for (const [a, b] of zones) railLanes.push(...lanes(a, b, 4.6, [1, -1], { minLen: 12 }));
    const railM = ctx.mat({ color: 0x9aa0aa, roughness: 0.4, metalness: 0.8, side: THREE.DoubleSide });
    const rails = [];
    const carts = [];
    for (const l of railLanes) {
      rails.push(strip(l, 0.14, 0.3, 4, -0.5), strip(l, 0.14, 0.3, 4, 0.5));
      let acc = 0, accCart = 0;
      for (let k = 1; k < l.pts.length; k++) {
        const p = l.pts[k], q = l.pts[k - 1], d = Math.hypot(p.x - q.x, p.z - q.z);
        acc += d; accCart += d;
        if (acc >= 1.5) { acc = 0; sleep.push({ x: p.x, y: p.y + 0.12, z: p.z, s: 1, ry: ctx.yawAt(p.i) }); }
        if (accCart >= 55) { accCart = 0; carts.push({ x: p.x, y: p.y + 0.3, z: p.z, s: 1, ry: ctx.yawAt(p.i) }); }
      }
    }
    if (rails.length) addMesh(merge(rails), railM);
    const sl = new THREE.BoxGeometry(2.0, 0.14, 0.26);
    instance(sl.rotateY(Math.PI / 2 * 0 + 0).clone(), ctx.mat({ color: 0x6a4a30, roughness: 1 }), sleep.map(o => ({ ...o, ry: o.ry + Math.PI / 2 })));
    // 광차: 쇠 통 + 광석 + 바퀴
    const P = [];
    P.push(paint(at(new THREE.BoxGeometry(1.7, 0.9, 1.15), 0, 0.95, 0), 0x6a5648));
    P.push(paint(at(new THREE.BoxGeometry(1.85, 0.12, 1.3), 0, 1.46, 0), 0x3a3a42));
    for (let k = 0; k < 5; k++) { const g = new THREE.DodecahedronGeometry(0.28 + (k % 3) * 0.06); P.push(paint(at(g, -0.55 + k * 0.28, 1.6 + (k % 2) * 0.1, (k % 3 - 1) * 0.25), k % 2 ? 0x4a2e22 : 0xe0a030)); }
    for (const x of [-0.55, 0.55]) for (const z of [-0.5, 0.5]) { const w = new THREE.CylinderGeometry(0.22, 0.22, 0.1, 10); w.rotateX(Math.PI / 2); P.push(paint(at(w, x, 0.35, z * 1.2), 0x2a2a30)); }
    instance(merge(P), ctx.mat({ vertexColors: true, roughness: 0.7, metalness: 0.3, emissive: 0x1a1008 }), carts.map(o => ({ ...o, ry: o.ry + Math.PI / 2 })), { shadow: true });
  }

  // ── 컨베이어: 벨트가 흐르고 광석이 실려 간다 ──
  {
    const zones = [rng(4, 0, 12, 1), rng(14, 0, 14, 1), rng(19, 0, 19, 1), rng(33, 0, 38, 0), rng(41, 0, 44, 1)];
    const belt = beltTex(ctx); belt.repeat.set(1, 1);
    const beltM = ctx.mat({ map: belt, roughness: 0.9, side: THREE.DoubleSide });
    const legs = [], chunks = [], parts = [], frames = [];
    const runs = [];
    for (const [a, b] of zones) for (const l of lanes(a, b, 9.5, [1, -1], { minLen: 14 })) runs.push(l);
    for (const l of runs.slice(0, 7)) {
      addMesh(strip(l, 1.5, 1.35, 1.5), beltM);
      frames.push(strip(l, 0.12, 1.4, 4, -0.85), strip(l, 0.12, 1.4, 4, 0.85));
      let acc = 0, len = 0;
      const cum = [0];
      for (let k = 1; k < l.pts.length; k++) {
        const p = l.pts[k], q = l.pts[k - 1], d = Math.hypot(p.x - q.x, p.z - q.z);
        len += d; cum.push(len); acc += d;
        if (acc >= 4) { acc = 0; legs.push({ x: p.x, y: p.y, z: p.z, sx: 1, sy: 1.35, sz: 1, ry: ctx.yawAt(p.i) }); }
      }
      const nc = Math.max(3, Math.floor(len / 6));
      for (let k = 0; k < nc; k++) chunks.push({ run: l, cum, len, u0: k / nc * len, sp: 1.6, s: 0.3 + ctx.rand() * 0.2, ph: ctx.rand() * 6 });
    }
    if (frames.length) addMesh(merge(frames), ctx.mat({ color: 0x6a6e78, roughness: 0.5, metalness: 0.7, side: THREE.DoubleSide }));
    const leg = new THREE.BoxGeometry(1.9, 1, 0.18); leg.translate(0, 0.5, 0);
    instance(leg, ctx.mat({ color: 0x4a4e58, roughness: 0.6, metalness: 0.5 }), legs.map(o => ({ ...o, ry: o.ry + Math.PI / 2 })));
    if (chunks.length) {
      const imC = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1), ctx.mat({ color: 0x5a3a28, roughness: 0.8, emissive: 0x4a2a08, flatShading: true }), chunks.length);
      const m4 = new THREE.Matrix4(), qn = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
      ctx.onFrame(t => {
        chunks.forEach((c, k) => {
          let u = (c.u0 + t * c.sp) % c.len;
          const cum = c.cum; let lo = 0, hi = cum.length - 1;
          while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= u) lo = mid; else hi = mid; }
          const f = (u - cum[lo]) / Math.max(0.001, cum[hi] - cum[lo]), a = c.run.pts[lo], b = c.run.pts[hi];
          p.set(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f + 1.5 + c.s * 0.3, a.z + (b.z - a.z) * f);
          imC.setMatrixAt(k, m4.compose(p, qn, sc.set(c.s * 1.4, c.s, c.s * 1.2)));
        });
        imC.instanceMatrix.needsUpdate = true;
      });
      imC.count = chunks.length; imC.frustumCulled = false;
      ctx.group.add(imC);
    }
    ctx.onFrame(t => { belt.offset.y = -t * 0.55; });
  }

  // ── 광석 더미 ──
  {
    const P = [];
    const lump = (r, x, y, z, hex) => { const g = new THREE.DodecahedronGeometry(r, 0); g.scale(1, 0.75, 1); return paint(at(g, x, y, z), hex); };
    P.push(lump(1.2, 0, 0.6, 0, 0x4a3226), lump(0.9, 1.1, 0.4, 0.3, 0x5a3a2a), lump(0.8, -1.0, 0.35, 0.4, 0x3a2a24), lump(0.7, 0.2, 0.3, -1.0, 0x6a4430),
      lump(0.6, 0.1, 1.3, 0.1, 0x4a3226), lump(0.25, 0.5, 1.2, 0.6, 0xf0b030), lump(0.2, -0.6, 0.9, 0.7, 0xf0b030), lump(0.22, 1.3, 0.8, 0.5, 0xffd060));
    const list = spots({ n: 70, from: 4, to: 14, scale: [0.8, 2.0] });
    instance(merge(P), ctx.mat({ vertexColors: true, roughness: 0.75, flatShading: true, emissive: 0x2a1604 }), list, { shadow: true });
  }
}
