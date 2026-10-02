// 14회차 테마: cemetery — 달빛 묘지 언덕 (밤, 보랏빛)
// 판석 길(밤에도 밝게), 둥근 비석 무리, 앙상한 죽은 나무, 철창 울타리, 호박등, 가로등, 납골당, 도깨비불(떠다님), 낮은 안개.
// 종교 상징(십자가 등)은 쓰지 않는다. 빛은 전부 emissive/Basic(+블룸), 실시간 조명 없음.

// ── 질감 ──
function flagRoad(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#5a5278'; g.fillRect(0, 0, w, h);          // 틈(어두운 보라)
    const rows = 4, rh = h / rows;
    for (let r = 0; r < rows; r++) {
      const cols = 3 + (r % 2), cw = w / cols, off = (r % 2) * cw * 0.3;
      for (let c = -1; c <= cols; c++) {
        const x = c * cw + off + 3, y = r * rh + 3, ww = cw - 6, hh = rh - 6;
        const v = 168 + Math.floor(ctx.rand() * 40);
        g.fillStyle = `rgb(${v},${v - 6},${v + 26})`;
        g.beginPath(); g.roundRect ? g.roundRect(x, y, ww, hh, 7) : g.rect(x, y, ww, hh); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(x + 4, y + 3, ww - 8, 3);
      }
    }
    for (let i = 0; i < 700; i++) { g.fillStyle = ctx.rand() < 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(60,40,100,0.22)'; g.fillRect(ctx.rand() * w, ctx.rand() * h, 1.5, 1.5); }
  }, { repeat: [2, 2] });
}
function stoneWall(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#4a4268'; g.fillRect(0, 0, w, h);
    const rows = 8, rh = h / rows;
    for (let r = 0; r < rows; r++) {
      const cw = w / 4, off = (r % 2) * cw / 2;
      for (let c = -1; c < 5; c++) {
        const v = 150 + Math.floor(ctx.rand() * 40);
        g.fillStyle = `rgb(${v},${v - 8},${v + 30})`;
        g.fillRect(c * cw + off + 2, r * rh + 2, cw - 4, rh - 4);
      }
    }
    for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(70,120,100,0.22)'; g.fillRect(ctx.rand() * w, ctx.rand() * h, 2 + ctx.rand() * 6, 2); }
  });
}
function mossGround(ctx) {
  return ctx.canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) { const v = 170 + Math.floor(ctx.rand() * 85); g.fillStyle = `rgb(${v - 10},${v - 20},${v})`; g.beginPath(); g.arc(ctx.rand() * w, ctx.rand() * h, 1 + ctx.rand() * 2.5, 0, 7); g.fill(); }
  });
}
function glowTex(ctx) {
  return ctx.canvasTex(64, 64, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, { srgb: false });
}
function pumpkinTex(ctx) {
  return ctx.canvasTex(256, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffb03a'); gr.addColorStop(1, '#e8651a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(150,50,0,0.45)'; g.lineWidth = 3;
    for (let k = 0; k < 8; k++) { g.beginPath(); g.moveTo(k * w / 8, 0); g.lineTo(k * w / 8, h); g.stroke(); }
    for (const cx of [w * 0.25, w * 0.75]) {
      g.fillStyle = '#fff09a';
      g.beginPath(); g.moveTo(cx - 26, h * 0.3); g.lineTo(cx - 10, h * 0.3); g.lineTo(cx - 18, h * 0.5); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(cx + 10, h * 0.3); g.lineTo(cx + 26, h * 0.3); g.lineTo(cx + 18, h * 0.5); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(cx - 28, h * 0.62); g.lineTo(cx - 14, h * 0.7); g.lineTo(cx - 6, h * 0.62); g.lineTo(cx + 6, h * 0.7); g.lineTo(cx + 14, h * 0.62); g.lineTo(cx + 28, h * 0.62);
      g.lineTo(cx + 18, h * 0.86); g.lineTo(cx - 18, h * 0.86); g.closePath(); g.fill();
    }
  });
}

export const look = {
  roadTex: flagRoad,
  roadRough: 0.85,
  road: 0xffffff,
  line: 0xe9e0ff,
  wall: { color: 0xd6ccf5, map: stoneWall, roughness: 0.9, metalness: 0, stripe: false },
  terrainTex: mossGround,
  runoffTex: mossGround,
  runoffColor: 0x7a6fa0,
  trees: false,
  far: [0x1f1633, 0x33244d],
  banner: { bg: '#2a1a48', fg: '#ffd9a0' },
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
  const spots = ({ n, side = 0, from = 6, to = 60, range = null, scale = [0.8, 1.2], face = false, margin = 4 }) => {
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

  // ── 둥근 비석 무리: 무리 중심 30곳, 줄 맞춰 4~9개 ──
  {
    const round = (w, h, d) => {
      const P = [at(new THREE.BoxGeometry(w, h, d), 0, h / 2, 0)];
      const cap = new THREE.CylinderGeometry(w / 2, w / 2, d, 14, 1, false, 0, Math.PI); cap.rotateX(Math.PI / 2);
      P.push(at(cap, 0, h, 0));
      P.push(at(new THREE.BoxGeometry(w * 1.3, 0.25, d * 2.2), 0, 0.12, 0));
      return merge(P);
    };
    const geoA = round(1.1, 1.5, 0.35), geoB = round(1.5, 1.0, 0.4);
    const listA = [], listB = [];
    for (const c of spots({ n: 48, from: 8, to: 40 })) {
      const rows = 2 + Math.floor(ctx.rand() * 2), cols = 2 + Math.floor(ctx.rand() * 2);
      const ca = Math.cos(c.ry), sa = Math.sin(c.ry);
      for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
        if (ctx.rand() < 0.2) continue;
        const lx = (q - (cols - 1) / 2) * 2.6, lz = r * 2.8;
        const x = c.x + lx * ca - lz * sa, z = c.z + lx * sa + lz * ca;
        if (!ctx.clear(x, z, 4)) continue;
        const o = { x, z, y: ctx.ground(x, z) - 0.1, s: 0.9 + ctx.rand() * 0.6, ry: c.ry + (ctx.rand() - 0.5) * 0.25 };
        (ctx.rand() < 0.65 ? listA : listB).push(o);
      }
    }
    const tint = (o, k) => { const v = 0.62 + ((k * 7) % 10) / 10 * 0.38; return new THREE.Color(v, v * 0.95, v * 1.08); };
    const mat = ctx.mat({ color: 0xc2b8e6, roughness: 0.9, emissive: 0x2a2146 });
    instance(geoA, mat, listA, { color: tint, shadow: true });
    instance(geoB, mat, listB, { color: tint, shadow: true });
  }

  // ── 앙상한 죽은 나무 (가지만) ──
  {
    const P = [];
    const limb = (len, r0, r1, ax, ay, bx, by, bz) => {   // 밑동이 (bx,by,bz), 위로 len, (ax: 기울기 z축, ay: 방향 y축)
      const g = new THREE.CylinderGeometry(r1, r0, len, 5); g.translate(0, len / 2, 0);
      g.rotateZ(ax); g.rotateY(ay); return at(g, bx, by, bz);
    };
    P.push(limb(7, 0.42, 0.12, 0.04, 0, 0, 0, 0));
    const defs = [[3.2, 1.0, 0.9, 2.6], [4.4, 0.9, 2.6, 2.4], [5.2, 0.8, 4.2, 2.0], [5.9, 0.7, 5.6, 1.6], [6.5, 0.6, 1.4, 1.3], [2.4, 1.1, 3.9, 2.2]];
    for (const [y, tilt, dir, len] of defs) {
      P.push(limb(len, 0.14, 0.05, tilt, dir, 0, y, 0));
      // 가지에서 갈라진 잔가지
      const ex = Math.sin(tilt) * len * 0.6, ez = 0;
      const gx = Math.cos(dir) * ex, gz = -Math.sin(dir) * ex;
      P.push(limb(len * 0.5, 0.06, 0.02, tilt + 0.5, dir + 1.3, gx, y + Math.cos(tilt) * len * 0.6, gz + ez));
    }
    const geo = merge(P);
    instance(geo, ctx.mat({ color: 0x1b1428, roughness: 1, emissive: 0x0c0818 }), spots({ n: 70, from: 6, to: 60, scale: [1.0, 2.0] }), { shadow: true });
  }

  // ── 철창 울타리 (3m 판 하나를 줄지어) ──
  {
    const P = [];
    for (const y of [0.45, 1.35]) P.push(at(new THREE.BoxGeometry(0.09, 0.09, 3.1), 0, y, 0));
    for (let k = 0; k < 8; k++) {
      const z = -1.31 + k * 0.375;
      P.push(at(new THREE.BoxGeometry(0.07, 1.7, 0.07), 0, 0.85, z));
      P.push(at(new THREE.ConeGeometry(0.1, 0.26, 4), 0, 1.83, z));
    }
    P.push(at(new THREE.BoxGeometry(0.16, 2.0, 0.16), 0, 1.0, 1.55));
    P.push(at(new THREE.SphereGeometry(0.15, 8, 6), 0, 2.06, 1.55));
    const geo = merge(P);
    const list = [];
    const step = Math.max(1, Math.round(3.1 / T.ds));
    const zones = [[0, 0.3, 1], [1, 0, 1], [2, 0.6, 1], [8, 0, 1], [9, 0, 1], [12, 0, 1], [13, 0, 1], [14, 0, 1], [15, 0, 1], [16, 0, 1], [17, 0, 1], [20, 0, 1]];
    for (const [seg, f0, f1] of zones) {
      const a = ctx.segAt(seg, f0); let b = ctx.segAt(seg, f1); if (b <= a) b += T.n;
      for (let i = a; i < b; i += step) for (const sd of [1, -1]) {
        const idx = ((i % T.n) + T.n) % T.n;
        const off = sd * (ctx.wallAt(idx, sd) + 5.0);
        const x = T.x[idx] + T.lx[idx] * off, z = T.z[idx] + T.lz[idx] * off;
        if (!ctx.clear(x, z, 3.8)) continue;
        list.push({ x, z, y: ctx.ground(x, z) - 0.05, s: 1.25, ry: ctx.yawAt(idx) });
      }
    }
    instance(geo, ctx.mat({ color: 0x6a5c94, roughness: 0.5, metalness: 0.5, emissive: 0x30244f }), list);
  }

  // ── 호박등 (빛나는 얼굴) ──
  {
    const body = new THREE.SphereGeometry(0.75, 14, 10); body.scale(1, 0.82, 1);
    body.translate(0, 0.62, 0);
    const stem = new THREE.CylinderGeometry(0.07, 0.12, 0.3, 6); stem.translate(0, 1.32, 0);
    const list = spots({ n: 80, from: 5, to: 28, scale: [1.1, 2.2], face: true });
    for (const o of list) o.ry += (ctx.rand() - 0.5) * 0.6;
    const m = ctx.mat({ map: pumpkinTex(ctx), color: new THREE.Color(1.5, 1.35, 1.2) }, 'basic');
    instance(body, m, list);
    instance(stem, ctx.mat({ color: 0x2f4a22, roughness: 1 }), list);
  }

  // ── 가로등: 철 기둥 + 호박빛 등 (45m 마다 번갈아) ──
  {
    const pole = merge([at(new THREE.CylinderGeometry(0.09, 0.14, 3.4, 6), 0, 1.7, 0), at(new THREE.BoxGeometry(0.7, 0.1, 0.7), 0, 3.45, 0)]);
    const orb = new THREE.SphereGeometry(0.36, 10, 8); orb.translate(0, 3.85, 0);
    const list = [];
    const step = Math.round(45 / T.ds);
    for (let i = 0, k = 0; i < T.n; i += step, k++) {
      const sd = k % 2 ? 1 : -1;
      const off = sd * (ctx.wallAt(i, sd) + 4.2);
      const x = T.x[i] + T.lx[i] * off, z = T.z[i] + T.lz[i] * off;
      if (!ctx.clear(x, z, 3.2)) continue;
      list.push({ x, z, y: ctx.ground(x, z), s: 1, ry: 0 });
    }
    instance(pole, ctx.mat({ color: 0x18121f, roughness: 0.5, metalness: 0.6 }), list);
    instance(orb, ctx.mat({ color: new THREE.Color(2.4, 1.5, 0.6) }, 'basic'), list);
  }

  // ── 납골당 (작은 돌집, 뾰족 지붕) ──
  {
    const P = [];
    P.push(paint(at(new THREE.BoxGeometry(5, 3.6, 6), 0, 1.8, 0), 0x8c82ad));
    const roof = new THREE.CylinderGeometry(3.7, 3.7, 6.8, 3, 1, false, Math.PI / 2); roof.rotateX(Math.PI / 2); roof.scale(1, 0.55, 1);
    P.push(paint(at(roof, 0, 4.9, 0), 0x4a3f6e));
    for (const x of [-1.9, 1.9]) P.push(paint(at(new THREE.CylinderGeometry(0.28, 0.32, 3.6, 8), x, 1.8, 3.2), 0xb4abd2));
    P.push(paint(at(new THREE.BoxGeometry(1.7, 2.6, 0.2), 0, 1.3, 3.02), 0x120c1c));
    P.push(paint(at(new THREE.BoxGeometry(0.9, 0.5, 0.2), 0, 3.0, 3.05), 0xffc060));
    instance(merge(P), ctx.mat({ vertexColors: true, roughness: 0.85, emissive: 0x1e1634 }), spots({ n: 7, from: 14, to: 48, scale: [1.0, 1.5], face: true }), { shadow: true });
  }

  // ── 낮은 안개 (길 밖에 납작한 구름 조각) ──
  {
    const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
    const list = spots({ n: 55, from: 5, to: 50, scale: [16, 34] });
    for (const o of list) { o.y += 0.55; o.sy = 1; }
    const m = ctx.mat({ map: glowTex(ctx), color: 0x9b82d8, transparent: true, opacity: 0.38, depthWrite: false }, 'basic');
    const im = instance(geo, m, list);
    im.receiveShadow = false;
  }

  // ── 도깨비불: 푸른·연두 불꽃이 둥둥 떠다닌다 ──
  {
    const N = 48;
    const list = spots({ n: N, from: 5, to: 55, scale: [1, 1] });
    const n = list.length;
    const core = new THREE.SphereGeometry(0.28, 10, 8);
    const halo = new THREE.SphereGeometry(0.9, 10, 8);
    const cols = [new THREE.Color(0.5, 1.0, 0.95), new THREE.Color(0.7, 0.9, 1.0), new THREE.Color(0.7, 1.0, 0.6), new THREE.Color(0.85, 0.7, 1.0)];
    const imC = new THREE.InstancedMesh(core, ctx.mat({ color: new THREE.Color(2.2, 2.2, 2.2) }, 'basic'), n);
    const imH = new THREE.InstancedMesh(halo, ctx.mat({ color: 0xffffff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }, 'basic'), n);
    list.forEach((o, k) => { imC.setColorAt(k, cols[k % 4]); imH.setColorAt(k, cols[k % 4]); o.ph = ctx.rand() * 6.28; o.h0 = 1.3 + ctx.rand() * 2.4; o.r = 0.8 + ctx.rand() * 2.2; });
    const m4 = new THREE.Matrix4(), qn = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    ctx.onFrame(t => {
      for (let k = 0; k < n; k++) {
        const o = list[k], ph = o.ph;
        p.set(o.x + Math.cos(t * 0.5 + ph) * o.r, o.y + o.h0 + Math.sin(t * 1.1 + ph * 2) * 0.5, o.z + Math.sin(t * 0.43 + ph) * o.r);
        const f = 0.8 + 0.3 * Math.sin(t * 5 + ph * 3);
        imC.setMatrixAt(k, m4.compose(p, qn, sc.set(f, f * 1.25, f)));
        imH.setMatrixAt(k, m4.compose(p, qn, sc.set(f, f, f)));
      }
      imC.instanceMatrix.needsUpdate = true; imH.instanceMatrix.needsUpdate = true;
    });
    imC.count = n; imH.count = n;
    imC.frustumCulled = false; imH.frustumCulled = false;
    ctx.group.add(imC, imH);
  }
}
