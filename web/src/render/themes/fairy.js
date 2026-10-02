// 14회차 테마: 동화 — 파스텔 하늘, 쿠키 길, 사탕 줄무늬 벽, 과자 집·막대사탕·지팡이 사탕·젤리 곰·버섯·무지개 아치·알록달록 성
// 그리기 호출은 대부분 InstancedMesh 하나씩(꼭짓점 색으로 여러 색을 한 번에), 성·무지개는 한 덩어리로 합친다.

// ── 질감 ──
function cookieRoad(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    // 쿠키 판을 깔아 놓은 길: 가로 4장 × 세로 4장, 판 사이 홈, 판마다 콕콕 구멍, 설탕 반짝이
    g.fillStyle = '#c4935a'; g.fillRect(0, 0, w, h);
    let s = 11; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const cw = w / 4, ch = h / 4;
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
      const x = a * cw + 3, y = b * ch + 3, ww = cw - 6, hh = ch - 6;
      const gr = g.createLinearGradient(x, y, x + ww, y + hh);
      const base = 225 + r() * 15;
      gr.addColorStop(0, `rgb(${base},${base * 0.82},${base * 0.58})`);
      gr.addColorStop(1, `rgb(${base - 18},${(base - 18) * 0.8},${(base - 18) * 0.55})`);
      g.fillStyle = gr;
      g.beginPath(); g.roundRect ? g.roundRect(x, y, ww, hh, 9) : g.rect(x, y, ww, hh); g.fill();
      g.fillStyle = 'rgba(150,100,55,0.75)';
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { g.beginPath(); g.arc(x + ww * (0.22 + i * 0.28), y + hh * (0.22 + j * 0.28), 2.6, 0, Math.PI * 2); g.fill(); }
    }
    for (let i = 0; i < 500; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.55)' : 'rgba(170,115,60,0.35)'; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
  }, { repeat: [1, 1] });
}
function candyStripe(ctx, c1 = '#ff6fa6', c2 = '#fff7fb', n = 4) {
  return (g, w, h) => {
    g.fillStyle = c2; g.fillRect(0, 0, w, h);
    g.fillStyle = c1;
    const p = w / n;
    for (let k = -n; k < n * 2; k++) {
      g.beginPath(); g.moveTo(k * p, 0); g.lineTo(k * p + p / 2, 0); g.lineTo(k * p + p / 2 + w, h); g.lineTo(k * p + w, h); g.closePath(); g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, h * 0.1, w, h * 0.06);
  };
}
function sprinkles(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#c9f2dc'; g.fillRect(0, 0, w, h);
    let s = 5; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 900; i++) { const v = 200 + r() * 55; g.fillStyle = `rgba(${v},255,${v},0.25)`; g.fillRect(r() * w, r() * h, 3, 3); }
    const cols = ['#ff7fb0', '#ffd84d', '#7fc8ff', '#b88bff', '#ffffff', '#ff9f5a'];
    g.lineCap = 'round'; g.lineWidth = 3;
    for (let i = 0; i < 160; i++) {
      const x = r() * w, y = r() * h, a = r() * Math.PI;
      g.strokeStyle = cols[i % cols.length];
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7); g.stroke();
    }
  });
}
function softGround(ctx) {
  return ctx.canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    let s = 3; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 500; i++) { const v = 225 + r() * 30; g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 3, 0, Math.PI * 2); g.fill(); }
  });
}

export const look = {
  roadTex: cookieRoad,
  roadRough: 0.7,
  road: 0xffffff,
  line: 0xfff0f8,
  wall: { map: ctx => ctx.canvasTex(128, 128, candyStripe(ctx), { repeat: [3, 0.5] }), color: 0xffffff, roughness: 0.3, metalness: 0.05, stripe: false },
  runoffTex: sprinkles,
  runoffColor: 0xffffff,
  terrainTex: softGround,
  trees: { n: 0.8, conifer: 0.2, hue: [0.83, 0.99], sat: [0.75, 0.95], light: [0.8, 0.9], trunk: 0xb0805a },
  far: [0xcdb6ee, 0xe9d6f7],
  real: {   // 파스텔 동화 — 하늘은 코드 파스텔 그대로, 질감만 실제 자갈·벽돌에 파스텔 색
    road: { tex: 'brick_pavement_02', scale: 2, env: 0.8, bright: 1.6, tint: 0xffd8b8 },
    runoff: { tex: 'cobblestone_floor_04', scale: 2, tint: 0xd8f0dc, bright: 1.5 },
    terrain: { tex: 'cobblestone_floor_04', scale: 4, tint: 0xd8f0dc, bright: 1.5 },
    wall: { tex: 'brick_pavement_02', scale: 2, tint: 0xffc8e0, bright: 1.5 },
    exposure: 0.95,
  },
  banner: { bg: '#ff7fb6', fg: '#ffffff' },
};

export function build(ctx) {
  const { THREE, T } = ctx;
  const merge = ctx.mergeGeometries;
  const up = new THREE.Vector3(0, 1, 0);
  /** 꼭짓점 색 칠하기 (여러 색 부품을 한 덩어리로 합치려고) */
  const paint = (geo, hex) => {
    const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return geo;
  };
  const at = (geo, x, y, z) => geo.translate(x, y, z);
  /** 길 밖 자리 고르기 (ctx.scatter 와 같은 규칙, 결과만 돌려준다) */
  const spots = ({ n, side = 0, from = 6, to = 60, range = null, filter = null, scale = [0.8, 1.2], face = false, margin = 4 }) => {
    const out = [];
    let t = 0;
    while (out.length < n && t < n * 40) {
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
      qn.setFromAxisAngle(up, o.ry); sc.set(o.s, o.s * (o.sy || 1), o.s); p.set(o.x, o.y, o.z);
      im.setMatrixAt(k, m4.compose(p, qn, sc));
      if (color) im.setColorAt(k, color(o, k));
    });
    im.count = list.length;
    im.castShadow = shadow && ctx.q.detail >= 1; im.receiveShadow = true;
    im.computeBoundingSphere();
    ctx.group.add(im);
    return im;
  };
  /** (x,z) 에서 가장 가까운 벽까지 거리 */
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
  /** 중심선 다각형 안쪽인가 */
  const inside = (x, z) => {
    let c = false;
    for (let i = 0, j = T.n - 1; i < T.n; j = i++) {
      if ((T.z[i] > z) !== (T.z[j] > z) && x < (T.x[j] - T.x[i]) * (z - T.z[i]) / (T.z[j] - T.z[i]) + T.x[i]) c = !c;
    }
    return c;
  };
  const b = T.bounds;

  // ── 알록달록 성: 안쪽 들판, 출발 직선 끝에서 정면으로 보이도록 첫 코너 가까이 (길에서 52m 넘게 떨어진 곳 중) ──
  let cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, cr = 0, best = Infinity;
  {
    const ti = ctx.segAt(1, 0.5);
    for (let x = b.x0; x <= b.x1; x += 8) for (let z = b.z0; z <= b.z1; z += 8) {
      if (!inside(x, z)) continue;
      const c = clearance(x, z);
      const d = Math.hypot(x - T.x[ti], z - T.z[ti]);
      if (c >= 52 && d < best) { best = d; cr = c; cx = x; cz = z; }
    }
  }
  {
    const P = [];
    const pastel = [0xffa8cf, 0xa8e6cf, 0xfff1a8, 0xa8d8ff, 0xd7b8ff, 0xffc8a8];
    const roofs = [0xff5fa2, 0x7b5cff, 0x3fb8ff, 0xff8a3d, 0x37c98b, 0xe05cff];
    // 바깥 성벽 + 탑 6개
    const R = 26;
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * Math.PI * 2, a2 = (k + 0.5) / 6 * Math.PI * 2;
      const tx = Math.cos(a) * R, tz = Math.sin(a) * R;
      P.push(paint(at(new THREE.CylinderGeometry(4.2, 4.6, 20, 14), tx, 10, tz), pastel[k]));
      P.push(paint(at(new THREE.ConeGeometry(5.6, 12, 14), tx, 26, tz), roofs[k]));
      P.push(paint(at(new THREE.SphereGeometry(0.9, 8, 6), tx, 32.5, tz), 0xffd84d));
      // 탑 사이 성벽
      const wl = 2 * R * Math.sin(Math.PI / 6);
      const wg = new THREE.BoxGeometry(wl, 11, 3); wg.rotateY(-a2 + Math.PI / 2);
      P.push(paint(at(wg, Math.cos(a2) * R * 0.87, 5.5, Math.sin(a2) * R * 0.87), 0xfff3fa));
      // 창문
      for (const hy of [8, 14]) {
        const wn = new THREE.BoxGeometry(1.4, 2.2, 0.6); wn.rotateY(-a + Math.PI / 2);
        P.push(paint(at(wn, Math.cos(a) * (R + 4.1), hy, Math.sin(a) * (R + 4.1)), 0x6a4fc8));
      }
    }
    // 가운데 본성 + 높은 탑 4개 + 제일 높은 탑
    P.push(paint(at(new THREE.BoxGeometry(24, 22, 24), 0, 11, 0), 0xfff0d8));
    for (let k = 0; k < 4; k++) {
      const a = (k + 0.5) / 4 * Math.PI * 2, tx = Math.cos(a) * 12, tz = Math.sin(a) * 12;
      P.push(paint(at(new THREE.CylinderGeometry(3.6, 3.6, 34, 12), tx, 17, tz), pastel[(k + 2) % 6]));
      P.push(paint(at(new THREE.ConeGeometry(4.8, 14, 12), tx, 41, tz), roofs[(k + 3) % 6]));
      P.push(paint(at(new THREE.SphereGeometry(0.8, 8, 6), tx, 48.5, tz), 0xffd84d));
    }
    P.push(paint(at(new THREE.CylinderGeometry(6, 6.5, 50, 16), 0, 25, 0), 0xffc2e0));
    P.push(paint(at(new THREE.ConeGeometry(8, 22, 16), 0, 61, 0), 0x8a5cff));
    P.push(paint(at(new THREE.SphereGeometry(1.4, 10, 8), 0, 72.5, 0), 0xffd84d));
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2;
      const wn = new THREE.BoxGeometry(1.6, 2.6, 0.6); wn.rotateY(-a + Math.PI / 2);
      P.push(paint(at(wn, Math.cos(a) * 6.3, 38, Math.sin(a) * 6.3), 0x6a4fc8));
    }
    // 성문 (분홍 문 + 크림 테두리)
    for (let k = 0; k < 4; k++) {
      const a = k / 4 * Math.PI * 2;
      const dg = new THREE.BoxGeometry(6, 9, 0.8); dg.rotateY(-a + Math.PI / 2);
      P.push(paint(at(dg, Math.cos(a) * 12.2, 4.5, Math.sin(a) * 12.2), 0xff7fb0));
    }
    const geo = merge(P);
    const sc = Math.max(0.6, Math.min(1.25, (cr - 10) / 34));
    geo.scale(sc, sc, sc);
    const m = new THREE.Mesh(geo, ctx.mat({ vertexColors: true, roughness: 0.55, emissive: 0x2a1a2a }));
    m.position.set(cx, ctx.ground(cx, cz) - 0.5, cz);
    m.castShadow = ctx.q.detail >= 1; m.receiveShadow = true;
    ctx.group.add(m);
  }

  // ── 무지개 아치 2개 (길 위 높이 14m 넘게) + 발치 구름 ──
  const cloudSpots = [];
  {
    const cols = [0xff6b7a, 0xffa94d, 0xffe066, 0x8ce99a, 0x66c7ff, 0x8f7bff, 0xd98bff];
    const parts = [];
    for (const [seg, fr] of [[0, 0.82], [15, 0.3]]) {
      const i = ctx.segAt(seg, fr);
      const half = Math.max(T.wallL[i], T.wallR[i]);
      const c = (T.wallL[i] - T.wallR[i]) / 2;
      const r0 = half + 4.5;
      const P = cols.map((col, k) => paint(new THREE.TorusGeometry(r0 + (cols.length - 1 - k) * 1.05, 0.55, 8, 56, Math.PI), col));
      const g = merge(P);
      const p = ctx.pt(i, c);
      const yaw = ctx.yawAt(i);
      g.rotateY(yaw); g.translate(p.x, T.y[i] - 0.6, p.z);
      parts.push(g);
      for (const sd of [1, -1]) {
        const d = c + sd * (r0 + 3.4);
        const q = ctx.pt(i, d);
        cloudSpots.push({ x: q.x, z: q.z, y: ctx.ground(q.x, q.z) - 0.3, s: 0.48, sy: 0.85, ry: ctx.yawAt(i) + Math.PI / 2 });
      }
    }
    const m = new THREE.Mesh(merge(parts), ctx.mat({ vertexColors: true, roughness: 0.4, emissive: 0x1c1c1c }));
    m.castShadow = ctx.q.detail >= 1;
    ctx.group.add(m);
  }

  // ── 구름 (하늘 + 무지개 발치) ──
  {
    const P = [];
    for (const [x, y, z, r] of [[0, 3, 0, 4], [4.2, 2.4, 0.6, 3.1], [-4.4, 2.2, -0.4, 3.2], [2, 4.6, -1, 2.8], [-1.6, 4.2, 1.4, 2.6], [7.2, 1.6, 0, 2.2], [-7.4, 1.5, 0.4, 2]]) {
      P.push(at(new THREE.SphereGeometry(r, 12, 8), x, y, z));
    }
    const geo = merge(P);
    const sky = [];
    const mx = (b.x0 + b.x1) / 2, mz = (b.z0 + b.z1) / 2;
    for (let k = 0; k < 26; k++) {
      const a = ctx.rand() * Math.PI * 2, d = 500 + ctx.rand() * 1300;
      sky.push({ x: mx + Math.cos(a) * d, z: mz + Math.sin(a) * d, y: 150 + ctx.rand() * 200, s: 6 + ctx.rand() * 8, sy: 0.7, ry: ctx.rand() * 6.28 });
    }
    instance(geo, ctx.mat({ color: 0xffffff, roughness: 1, emissive: 0xffe8f4, emissiveIntensity: 0.45 }), [...cloudSpots, ...sky]);
  }

  // ── 과자 집 (생강빵 벽, 초콜릿 지붕, 지붕 위 크림) ──
  {
    const P = [];
    P.push(paint(at(new THREE.BoxGeometry(6, 4.2, 5), 0, 2.1, 0), 0xc07a3e));
    const roof = new THREE.CylinderGeometry(3.2, 3.2, 6.8, 3, 1, false, Math.PI / 2); roof.rotateZ(Math.PI / 2);
    P.push(paint(at(roof, 0, 5.8, 0), 0x6b3b22));
    for (const z of [2.77, -2.77]) {
      const c = new THREE.CylinderGeometry(0.42, 0.42, 7.1, 8); c.rotateZ(Math.PI / 2);
      P.push(paint(at(c, 0, 4.25, z), 0xfffaf2));
      for (let k = 0; k < 5; k++) P.push(paint(at(new THREE.SphereGeometry(0.42, 8, 6), -2.8 + k * 1.4, 3.85, z * 1.02), 0xfffaf2));
    }
    { const c = new THREE.CylinderGeometry(0.5, 0.5, 7.1, 8); c.rotateZ(Math.PI / 2); P.push(paint(at(c, 0, 9.0, 0), 0xfffaf2)); }
    for (let k = 0; k < 4; k++) P.push(paint(at(new THREE.SphereGeometry(0.75, 10, 8), -2.6 + k * 1.75, 9.4, 0), 0xfffaf2));
    for (const x of [-1.7, 1.7]) {
      P.push(paint(at(new THREE.BoxGeometry(1.5, 1.5, 0.15), x, 2.7, 2.53), 0xfffaf2));
      P.push(paint(at(new THREE.BoxGeometry(1.1, 1.1, 0.2), x, 2.7, 2.58), 0xffd36b));
    }
    P.push(paint(at(new THREE.BoxGeometry(1.4, 2.4, 0.2), 0, 1.2, 2.56), 0xff8fb8));
    [0xff4d6d, 0x4dd5ff, 0x7dff8a, 0xffe14d].forEach((c, k) => P.push(paint(at(new THREE.SphereGeometry(0.26, 8, 6), -2.25 + k * 1.5, 3.8, 2.55), c)));
    P.push(paint(at(new THREE.BoxGeometry(0.9, 2.2, 0.9), 1.8, 7.6, -1.0), 0xff9fc8));
    P.push(paint(at(new THREE.BoxGeometry(1.1, 0.35, 1.1), 1.8, 8.8, -1.0), 0xfffaf2));
    const list = spots({ n: 18, from: 9, to: 45, scale: [1.0, 1.6], face: true });
    instance(merge(P), ctx.mat({ vertexColors: true, roughness: 0.7 }), list, { shadow: true });
  }

  // ── 막대사탕 (막대 + 소용돌이 사탕 2가지) ──
  {
    const swirl = (kind) => ctx.canvasTex(128, 128, (g, w, h) => {
      const img = g.createImageData(w, h), d = img.data;
      // HSL → sRGB 0~255 (캔버스는 sRGB 그대로)
      const hsl = (H, S, L) => { const f = n => { const k = (n + H * 12) % 12, a = S * Math.min(L, 1 - L); return 255 * (L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))); }; return [f(0), f(8), f(4)]; };
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2), r = Math.hypot(dx, dy), th = Math.atan2(dy, dx) / (Math.PI * 2);
        const u = ((th * 2 + r * 2.6) % 1 + 1) % 1;
        const c = kind === 0 ? hsl(u, 0.85, 0.66) : hsl(0.93, 0.85, Math.floor(u * 2) ? 0.97 : 0.66);
        const k = (y * w + x) * 4;
        d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    });
    const stick = new THREE.CylinderGeometry(0.2, 0.2, 7.4, 6); stick.translate(0, 3.7, 0);
    const head = new THREE.CylinderGeometry(2.5, 2.5, 0.55, 28, 1); head.rotateX(Math.PI / 2); head.translate(0, 9.6, 0);
    const list = spots({ n: 32, from: 6, to: 40, scale: [0.8, 1.5] });
    instance(stick, ctx.mat({ color: 0xfffaf4, roughness: 0.5 }), list);
    instance(head, ctx.mat({ map: swirl(0), roughness: 0.25 }), list.filter((_, k) => k % 2 === 0), { shadow: true });
    instance(head.clone(), ctx.mat({ map: swirl(1), roughness: 0.25 }), list.filter((_, k) => k % 2 === 1), { shadow: true });
  }

  // ── 지팡이 사탕 ──
  {
    class Cane extends THREE.Curve {
      getPoint(t, out = new THREE.Vector3()) {
        const L1 = 6, L2 = Math.PI * 1.2, L3 = 0.9, s = t * (L1 + L2 + L3);
        if (s < L1) return out.set(0, s, 0);
        if (s < L1 + L2) { const a = Math.PI - (s - L1) / 1.2; return out.set(1.2 + Math.cos(a) * 1.2, L1 + Math.sin(a) * 1.2, 0); }
        return out.set(2.4, L1 - (s - L1 - L2), 0);
      }
    }
    const geo = new THREE.TubeGeometry(new Cane(), 48, 0.34, 8, false);
    const tex = ctx.canvasTex(64, 64, candyStripe(ctx, '#e8233f', '#ffffff', 2), { repeat: [10, 1] });
    instance(geo, ctx.mat({ map: tex, roughness: 0.3 }), spots({ n: 26, from: 6, to: 35, scale: [1.0, 1.6] }), { shadow: true });
  }

  // ── 젤리 곰 (반투명, 색 여러 가지) ──
  {
    const P = [];
    const sph = (r, x, y, z, sx = 1, sy = 1, sz = 1) => { const g = new THREE.SphereGeometry(r, 12, 9); g.scale(sx, sy, sz); return at(g, x, y, z); };
    P.push(sph(1, 0, 1.65, 0, 1, 1.2, 0.85), sph(0.78, 0, 3.25, 0), sph(0.3, 0.52, 3.85, 0), sph(0.3, -0.52, 3.85, 0),
      sph(0.38, 0.98, 2.15, 0.2, 1, 1.4, 1), sph(0.38, -0.98, 2.15, 0.2, 1, 1.4, 1), sph(0.46, 0.55, 0.5, 0.25), sph(0.46, -0.55, 0.5, 0.25), sph(0.32, 0, 3.08, 0.68));
    const cols = [0xff4d6d, 0xffa53d, 0xffe14d, 0x5fe08a, 0x6fc8ff, 0xd08bff, 0xffffff].map(c => new THREE.Color(c));
    instance(merge(P), ctx.mat({ color: 0xffffff, roughness: 0.15, transparent: true, opacity: 0.8, emissive: 0x401830, emissiveIntensity: 0.6 }),
      spots({ n: 30, from: 6, to: 30, scale: [0.9, 1.7], face: true }), { color: (o, k) => cols[k % cols.length] });
  }

  // ── 거대 버섯 (빨간 갓 + 흰 점) ──
  {
    const P = [];
    P.push(paint(at(new THREE.CylinderGeometry(0.65, 0.95, 4, 12), 0, 2, 0), 0xfff2df));
    const cap = new THREE.SphereGeometry(3, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2); cap.scale(1, 0.7, 1);
    P.push(paint(at(cap, 0, 3.8, 0), 0xff4f6a));
    P.push(paint(at(new THREE.CylinderGeometry(2.95, 2.95, 0.12, 18), 0, 3.82, 0), 0xffe4cc));
    for (let k = 0; k < 9; k++) {
      const a = k * 2.399, el = 0.35 + (k % 3) * 0.32;
      const sx = Math.cos(a) * Math.cos(el) * 3, sz = Math.sin(a) * Math.cos(el) * 3, sy = Math.sin(el) * 3 * 0.7;
      const d = new THREE.SphereGeometry(0.5, 8, 6); d.scale(1, 0.45, 1);
      P.push(paint(at(d, sx, 3.8 + sy, sz), 0xffffff));
    }
    instance(merge(P), ctx.mat({ vertexColors: true, roughness: 0.55 }), spots({ n: 22, from: 7, to: 50, scale: [1.0, 2.6] }), { shadow: true });
  }

  // ── 열기구 (천천히 떠다닌다) ──
  {
    const P = [];
    const env = new THREE.SphereGeometry(6, 16, 12); env.scale(1, 1.15, 1);
    P.push(paint(at(env, 0, 0, 0), 0xffffff));
    P.push(paint(at(new THREE.CylinderGeometry(3.4, 1.0, 3.6, 12), 0, -7.6, 0), 0xffffff));
    P.push(paint(at(new THREE.BoxGeometry(1.8, 1.4, 1.8), 0, -10.2, 0), 0x9a6a44));
    const geo = merge(P);
    const cols = [0xff9fc8, 0xfff07a, 0x9fe8ff, 0xc8a8ff, 0xa8ffc8].map(c => new THREE.Color(c));
    const mx = (b.x0 + b.x1) / 2, mz = (b.z0 + b.z1) / 2;
    const list = [];
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * Math.PI * 2 + 0.4, d = 150 + ctx.rand() * 250;
      list.push({ x: mx + Math.cos(a) * d, z: mz + Math.sin(a) * d, y: 55 + ctx.rand() * 40, s: 1.3, ry: 0 });
    }
    const im = instance(geo, ctx.mat({ vertexColors: true, roughness: 0.6, emissive: 0x2a2a2a }), list, { color: (o, k) => cols[k % cols.length] });
    const m4 = new THREE.Matrix4(), qn = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    ctx.onFrame(t => {
      list.forEach((o, k) => {
        qn.setFromAxisAngle(up, t * 0.05 + k);
        sc.setScalar(o.s);
        p.set(o.x + Math.sin(t * 0.03 + k) * 30, o.y + Math.sin(t * 0.4 + k * 1.7) * 3, o.z + Math.cos(t * 0.03 + k) * 30);
        im.setMatrixAt(k, m4.compose(p, qn, sc));
      });
      im.instanceMatrix.needsUpdate = true;
    });
    im.frustumCulled = false;
  }
}
