// 14회차 테마: nymph — 반딧불 요정숲 (보랏빛·청록 밝은 밤)
// 이끼 낀 연한 돌길, 빛나는 꽃·버섯, 수정 기둥(보라·청록·분홍), 맑은 연못(물결이 흐른다), 반딧불(반짝·떠다님).
// 빛은 전부 emissive/Basic(+블룸), 실시간 조명 없음.

// ── 질감 ──
function pathRoad(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#9fa7cf'; g.fillRect(0, 0, w, h);
    const rows = 5, rh = h / rows;
    for (let r = 0; r < rows; r++) {
      const cols = 4 + (r % 2), cw = w / cols, off = (r % 2) * cw * 0.35;
      for (let c = -1; c <= cols; c++) {
        const v = 196 + Math.floor(ctx.rand() * 40);
        g.fillStyle = `rgb(${v - 8},${v},${v + 14})`;
        g.beginPath(); g.roundRect ? g.roundRect(c * cw + off + 3, r * rh + 3, cw - 6, rh - 6, 12) : g.rect(c * cw + off + 3, r * rh + 3, cw - 6, rh - 6); g.fill();
      }
    }
    for (let i = 0; i < 120; i++) { g.fillStyle = 'rgba(90,200,160,0.35)'; g.beginPath(); g.arc(ctx.rand() * w, ctx.rand() * h, 1.5 + ctx.rand() * 3, 0, 7); g.fill(); }
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(ctx.rand() * w, ctx.rand() * h, 2, 2); }
  }, { repeat: [1.2, 2] });
}
function vineWall(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#4f6fa0'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 8; r++) {
      const cw = w / 4, off = (r % 2) * cw / 2;
      for (let c = -1; c < 5; c++) {
        const v = 120 + Math.floor(ctx.rand() * 40);
        g.fillStyle = `rgb(${v - 30},${v + 10},${v + 40})`;
        g.fillRect(c * cw + off + 2, r * h / 8 + 2, cw - 4, h / 8 - 4);
      }
    }
    g.strokeStyle = '#3fd0a0'; g.lineWidth = 3;
    for (let k = 0; k < 6; k++) { g.beginPath(); const x0 = ctx.rand() * w; g.moveTo(x0, 0); g.bezierCurveTo(x0 + 30, h * 0.3, x0 - 30, h * 0.6, x0 + 10, h); g.stroke(); }
    for (let i = 0; i < 40; i++) { g.fillStyle = i % 2 ? '#ffb0f0' : '#b8fff0'; g.beginPath(); g.arc(ctx.rand() * w, ctx.rand() * h, 3, 0, 7); g.fill(); }
  });
}
function mossGround(ctx) {
  return ctx.canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 600; i++) { const v = 190 + Math.floor(ctx.rand() * 65); g.fillStyle = `rgb(${v - 25},${v},${v - 10})`; g.beginPath(); g.arc(ctx.rand() * w, ctx.rand() * h, 1 + ctx.rand() * 2.5, 0, 7); g.fill(); }
  });
}
function glowTex(ctx) {
  return ctx.canvasTex(64, 64, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, { srgb: false });
}
function rippleTex(ctx) {
  return ctx.canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#e8ffff'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(120,200,220,0.55)'; g.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const x = ctx.rand() * w, y = ctx.rand() * h, r = 6 + ctx.rand() * 14;
      for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { g.beginPath(); g.ellipse(x + ox, y + oy, r, r * 0.6, 0, 0, 7); g.stroke(); }
    }
  }, { repeat: [5, 5] });
}

export const look = {
  roadTex: pathRoad,
  roadRough: 0.8,
  road: 0xffffff,
  line: 0xdff7ff,
  wall: { color: 0xc8e0ff, map: vineWall, roughness: 0.85, metalness: 0, stripe: false },
  terrainTex: mossGround,
  runoffTex: mossGround,
  runoffColor: 0x86d8c0,
  trees: { n: 1, conifer: 0.1, hue: [0.45, 0.82], sat: [0.45, 0.75], light: [0.42, 0.62], trunk: 0x6a5a88 },
  far: [0x2c2f5a, 0x3f3f78],
  banner: { bg: '#3a2a7a', fg: '#c8fff0' },
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
  const spots = ({ n, side = 0, from = 6, to = 60, range = null, scale = [0.8, 1.2], margin = 4 }) => {
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
      out.push({ x, z, y: ctx.ground(x, z), s: scale[0] + ctx.rand() * (scale[1] - scale[0]), ry: ctx.rand() * Math.PI * 2, i });
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
  const hsl = (h, s, l) => new THREE.Color().setHSL(h, s, l);

  // ── 맑은 연못: 길 옆 빈 터를 찾아 둥근 물웅덩이 (물결 무늬가 천천히 흐른다) ──
  const ponds = [];
  {
    const tryAt = (seg, fr, sd) => {
      const i = ctx.segAt(seg, fr);
      for (const r of [16, 13, 10, 7]) {
        const off = sd * (ctx.wallAt(i, sd) + 6 + r);
        const x = T.x[i] + T.lx[i] * off, z = T.z[i] + T.lz[i] * off;
        if (!ctx.clear(x, z, r + 2.5)) continue;
        let lo = Infinity, hi = -Infinity;
        for (let a = 0; a < 8; a++) { const h = ctx.ground(x + Math.cos(a * 0.785) * r, z + Math.sin(a * 0.785) * r); lo = Math.min(lo, h); hi = Math.max(hi, h); }
        const hc = ctx.ground(x, z); lo = Math.min(lo, hc); hi = Math.max(hi, hc);
        if (hi - lo > 0.7) continue;
        if (ponds.some(p => Math.hypot(p.x - x, p.z - z) < p.r + r + 6)) continue;
        ponds.push({ x, z, y: hi + 0.12, r });
        return true;
      }
      return false;
    };
    for (const seg of [8, 9, 10, 3, 4, 5, 11, 7, 2, 13, 0, 6, 12, 14]) for (const fr of [0.5, 0.2, 0.8, 0.35, 0.65]) for (const sd of [1, -1]) if (ponds.length < 6) tryAt(seg, fr, sd);
    const geo = new THREE.CircleGeometry(1, 40); geo.rotateX(-Math.PI / 2);
    const tex = rippleTex(ctx);
    const mat = ctx.mat({ map: tex, color: 0x52e0d0, emissive: 0x0c5a64, roughness: 0.06, metalness: 0.25, transparent: true, opacity: 0.88 });
    const list = ponds.map(p => ({ x: p.x, y: p.y, z: p.z, s: p.r, ry: 0 }));
    // 연못 둘레 돌 둑 (물 높이까지, 아래 1m — 땅이 낮은 쪽에서 물이 떠 보이지 않게)
    const rim = new THREE.CylinderGeometry(1, 1, 1, 40, 1, true); rim.translate(0, -0.5, 0);
    instance(rim, ctx.mat({ color: 0xcfeee8, emissive: 0x1a3a40, roughness: 0.9, side: THREE.DoubleSide }), list.map(o => ({ ...o, y: o.y + 0.04, s: o.s * 1.03, sy: 1 / (o.s * 1.03) })));
    const im = instance(geo, mat, list); im.receiveShadow = false;
    ctx.onFrame(t => { tex.offset.set(t * 0.012, t * 0.007); });
    // 연꽃잎 + 빛나는 연꽃
    const pads = [], lotus = [];
    for (const p of ponds) for (let k = 0; k < 9; k++) {
      const a = ctx.rand() * 6.283, d = ctx.rand() * (p.r - 2);
      (k % 3 === 0 ? lotus : pads).push({ x: p.x + Math.cos(a) * d, y: p.y + 0.06, z: p.z + Math.sin(a) * d, s: 0.8 + ctx.rand() * 0.9, ry: ctx.rand() * 6.28 });
    }
    const pad = new THREE.CircleGeometry(0.9, 12); pad.rotateX(-Math.PI / 2);
    instance(pad, ctx.mat({ color: 0x3fae78, emissive: 0x0e3a28, roughness: 0.7, side: THREE.DoubleSide }), pads);
    const lt = [];
    for (let k = 0; k < 8; k++) { const g = new THREE.SphereGeometry(0.34, 8, 6); g.scale(0.7, 1.3, 0.7); g.rotateZ(Math.sin(k * 0.8) * 0.0); lt.push(at(g, Math.cos(k * 0.785) * 0.38, 0.42, Math.sin(k * 0.785) * 0.38)); }
    instance(merge(lt), ctx.mat({ color: new THREE.Color(2.0, 1.3, 1.8) }, 'basic'), lotus);
  }
  const inPond = (x, z) => ponds.some(p => Math.hypot(p.x - x, p.z - z) < p.r + 2);

  // ── 빛나는 꽃 (줄기는 어둡게, 꽃송이는 emissive 파스텔) ──
  {
    const stem = new THREE.CylinderGeometry(0.035, 0.05, 1.1, 5); stem.translate(0, 0.55, 0);
    const P = [at(new THREE.SphereGeometry(0.14, 8, 6), 0, 1.15, 0)];
    for (let k = 0; k < 6; k++) {
      const g = new THREE.SphereGeometry(0.2, 8, 6); g.scale(1, 0.35, 0.6);
      g.rotateZ(0.5); g.translate(0.26, 0, 0); g.rotateY(k * 1.047); g.translate(0, 1.12, 0); P.push(g);
    }
    const bloom = merge(P);
    const list = spots({ n: 260, from: 5, to: 52, scale: [0.9, 2.0] }).filter(o => !inPond(o.x, o.z));
    instance(stem, ctx.mat({ color: 0x2a6a58, emissive: 0x0c3a30, roughness: 0.8 }), list);
    const hues = [0.92, 0.5, 0.75, 0.14, 0.58, 0.85];
    instance(bloom, ctx.mat({ color: new THREE.Color(1.6, 1.6, 1.6) }, 'basic'), list, { color: (o, k) => hsl(hues[k % 6], 0.85, 0.7) });
  }

  // ── 빛나는 버섯 (자잘한 것 + 큰 것) ──
  {
    const stem = new THREE.CylinderGeometry(0.2, 0.28, 1.4, 8); stem.translate(0, 0.7, 0);
    const cap = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); cap.scale(1.1, 0.7, 1.1); cap.translate(0, 1.3, 0);
    const pos = cap.attributes.position, col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { const f = 0.62 + 0.38 * Math.min(1, pos.getY(i) / 0.5 - 1.6); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = Math.max(0.55, f); }
    cap.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const list = spots({ n: 120, from: 5, to: 48, scale: [0.9, 2.4] }).filter(o => !inPond(o.x, o.z));
    list.push(...spots({ n: 9, from: 10, to: 55, scale: [4, 6.5] }).filter(o => !inPond(o.x, o.z)));
    const hues = [0.5, 0.78, 0.9, 0.62, 0.42];
    instance(stem, ctx.mat({ color: 0xe8dff5, emissive: 0x3a2a60, roughness: 0.7 }), list);
    instance(cap, ctx.mat({ color: new THREE.Color(1.5, 1.5, 1.5), vertexColors: true }, 'basic'), list, { color: (o, k) => hsl(hues[k % 5], 0.8, 0.62) });
  }

  // ── 수정 기둥 (보라·청록·분홍, 반투명 + 은은히 발광) ──
  {
    const cluster = () => {
      const P = [];
      for (const [x, z, h, r, tilt, dir] of [[0, 0, 5.5, 0.55, 0.0, 0], [0.9, 0.4, 3.2, 0.38, 0.28, 0.5], [-0.8, 0.5, 2.4, 0.32, -0.3, 2.2], [0.1, -0.9, 2.8, 0.34, 0.2, 4.0]]) {
        const body = new THREE.CylinderGeometry(r * 0.85, r, h, 6); body.translate(0, h / 2, 0);
        const tip = new THREE.ConeGeometry(r * 0.85, r * 2.2, 6); tip.translate(0, h + r * 1.1, 0);
        const g = merge([body, tip]); g.rotateZ(tilt); g.rotateY(dir); P.push(at(g, x, 0, z));
      }
      return merge(P);
    };
    const geo = cluster();
    for (const [hex, em, n, sc] of [[0xb48cff, 0x6a3fd0, 16, [1.0, 2.2]], [0x6ff0e0, 0x1aa89a, 14, [1.0, 2.0]], [0xff9ee0, 0xc03c9a, 10, [0.9, 1.8]]]) {
      instance(geo, ctx.mat({ color: hex, emissive: em, emissiveIntensity: 0.9, roughness: 0.12, metalness: 0.2, flatShading: true, transparent: true, opacity: 0.88 }),
        spots({ n, from: 6, to: 44, scale: sc }).filter(o => !inPond(o.x, o.z)), { shadow: false });
    }
  }

  // ── 반딧불: 노란 연두 불빛이 반짝이며 떠다닌다 ──
  {
    const list = spots({ n: 150, from: 3, to: 50, scale: [1, 1], margin: 2 });
    const n = list.length;
    const core = new THREE.SphereGeometry(0.13, 8, 6);
    const halo = new THREE.SphereGeometry(0.7, 8, 6);
    const imC = new THREE.InstancedMesh(core, ctx.mat({ color: new THREE.Color(2.4, 2.4, 1.0) }, 'basic'), n);
    const imH = new THREE.InstancedMesh(halo, ctx.mat({ color: new THREE.Color(0.7, 1.0, 0.4), transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }, 'basic'), n);
    list.forEach(o => { o.ph = ctx.rand() * 6.28; o.h0 = 0.8 + ctx.rand() * 3.2; o.r = 0.6 + ctx.rand() * 2.0; o.sp = 0.5 + ctx.rand() * 0.9; });
    const m4 = new THREE.Matrix4(), qn = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    ctx.onFrame(t => {
      for (let k = 0; k < n; k++) {
        const o = list[k], ph = o.ph;
        p.set(o.x + Math.cos(t * 0.35 * o.sp + ph) * o.r, o.y + o.h0 + Math.sin(t * 0.9 * o.sp + ph * 2) * 0.45, o.z + Math.sin(t * 0.3 * o.sp + ph) * o.r);
        const tw = Math.max(0.05, 0.5 + 0.5 * Math.sin(t * 3.2 * o.sp + ph * 5));   // 반짝
        imC.setMatrixAt(k, m4.compose(p, qn, sc.setScalar(0.4 + tw * 0.9)));
        imH.setMatrixAt(k, m4.compose(p, qn, sc.setScalar(0.25 + tw * 0.55)));
      }
      imC.instanceMatrix.needsUpdate = true; imH.instanceMatrix.needsUpdate = true;
    });
    imC.count = n; imH.count = n;
    imC.frustumCulled = false; imH.frustumCulled = false;
    ctx.group.add(imC, imH);
  }

  // ── 땅에 깔린 은은한 빛 얼룩 (이끼 위 빛무리) ──
  {
    const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
    const list = spots({ n: 60, from: 5, to: 50, scale: [5, 12] }).filter(o => !inPond(o.x, o.z));
    for (const o of list) o.y += 0.12;
    const cols = [new THREE.Color(0.6, 0.4, 1.0), new THREE.Color(0.3, 1.0, 0.85), new THREE.Color(1.0, 0.5, 0.9)];
    instance(geo, ctx.mat({ map: glowTex(ctx), color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false }, 'basic'), list, { color: (o, k) => cols[k % 3] }).receiveShadow = false;
  }
}
