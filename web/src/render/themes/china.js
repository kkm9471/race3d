// 14회차 테마: 차이나 — 해 질 녘 붉은 성곽 도시. 회색 돌판 길, 붉은 성벽(금색 띠), 기와 지붕 탑(파고다), 패루(길 위 문),
// 붉은 등롱(바람에 흔들림), 대나무 숲, 기와집, 하늘로 올라가는 소원 등.
// 그리기 호출은 InstancedMesh 하나씩(꼭짓점 색으로 여러 색을 한 번에).

// ── 질감 ──
function flagstone(ctx) {
  const r = ctx.rand;
  return ctx.canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#3d3a36'; g.fillRect(0, 0, w, h);          // 줄눈
    const rows = 16, rh = h / rows;
    for (let row = 0; row < rows; row++) {
      let x = -r() * 50;
      while (x < w) {
        const sw = 44 + r() * 50;
        const v = 138 + (r() * 24 | 0), t = r() * 8;
        g.fillStyle = `rgb(${v + 4},${(v - t) | 0},${(v - 6 - t) | 0})`;
        g.fillRect(x + 1.5, row * rh + 1.5, sw - 3, rh - 3);
        x += sw;
      }
    }
    // 가운데 어도(붉은 점선 느낌) 없이 은은한 얼룩만
    const img = g.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    g.putImageData(img, 0, 0);
  });
}
/** 붉은 성벽 (u 0~1/3 안쪽 면 아래→위, 1/3~2/3 윗면, 2/3~1 바깥 면 / v = 4m 마다 1) */
function redWall(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    const third = w / 3;
    for (const [x0, top] of [[0, false], [2 * third, false]]) {
      g.fillStyle = '#b3261e'; g.fillRect(x0, 0, third, h);
      g.fillStyle = '#9a1c16'; for (let k = 0; k < 4; k++) g.fillRect(x0, k * h / 4, third, 2);   // 벽돌 줄눈
      g.fillStyle = '#e0b040'; g.fillRect(x0 + third * 0.06, 0, third * 0.05, h); g.fillRect(x0 + third * 0.86, 0, third * 0.05, h);   // 금색 띠
      g.fillStyle = '#f0cd6a'; g.fillRect(x0 + third * 0.06, 0, 2, h);
    }
    g.fillStyle = '#4a4a46'; g.fillRect(third, 0, third, h);      // 윗면 기와
    g.fillStyle = '#2f302e'; for (let k = 0; k < 8; k++) g.fillRect(third, k * h / 8, third, 3);
    g.fillStyle = '#e0b040'; g.fillRect(third, 0, 3, h); g.fillRect(2 * third - 3, 0, 3, h);
  });
}
function dust(ctx) {
  return ctx.canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#e8d6bc'; g.fillRect(0, 0, w, h);
    const r = ctx.rand;
    for (let i = 0; i < 500; i++) { const v = 200 + r() * 40; g.fillStyle = `rgb(${v},${v * 0.9},${v * 0.74})`; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 3, 0, 7); g.fill(); }
  });
}

export const look = {
  road: 0xffffff,
  roadTex: flagstone,
  roadRough: 0.85,
  line: 0xf5deb0,
  wall: { map: redWall, color: 0xffffff, roughness: 0.7, emissive: 0x240604, stripe: false },
  terrainTex: dust,
  city: false,
  trees: false,
  far: [0x7a5a64, 0xb27b6e],
  banner: { bg: '#b3261e', fg: '#ffe9a8' },
  tunnel: { color: 0x8a2a1c, light: 0xffb060 },
  // 실사: 실제 돌판 노면, 붉게 물들인 실제 벽돌 성벽, 노을 하늘, 먼 땅은 붉은 모래
  real: {
    sky: 'qwantani_dusk_2_puresky', exposure: 1.1,
    road: { tex: 'stone_tiles', scale: 3, tint: 0xe8d4c0, bright: 1.35, env: 1.0 },
    terrain: { tex: 'red_sand', scale: 5, tint: 0xe0b8a0 },
    runoff: { tex: 'red_sand', scale: 3, tint: 0xd8b098 },
    wall: { tex: 'castle_brick_02_red', scale: 2.4, tint: 0xff9080, bright: 1.1 },
  },
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
  const cyl = (rt, rb, h, x, y, z, hex, seg = 8) => paint(at(new THREE.CylinderGeometry(rt, rb, h, seg), x, y, z), hex);
  /** 네모 기와 지붕 (꼭짓점이 4개인 낮은 뿔, 끝이 살짝 들림은 생략) */
  const roof = (rad, h, x, y, z, hex) => { const g = new THREE.ConeGeometry(rad, h, 4, 1); g.rotateY(Math.PI / 4); return paint(at(g, x, y + h / 2, z), hex); };
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
  const b = T.bounds;
  const RED = 0xb3261e, GOLD = 0xe0b040, TILE = 0x38464a, STONE = 0xa9a198;

  // ── 파고다: 돌 기단 + 층마다 붉은 몸통·금 띠·기와 지붕 ──
  const pagoda = (tiers, w0) => {
    const P = [];
    P.push(box(w0 * 1.7, 1.2, w0 * 1.7, 0, 0.6, 0, STONE), box(w0 * 1.45, 1.0, w0 * 1.45, 0, 1.7, 0, 0xbab2a6));
    let y = 2.2;
    for (let k = 0; k < tiers; k++) {
      const w = w0 * (1 - 0.1 * k), h = 3.0;
      P.push(box(w * 0.78, h, w * 0.78, 0, y + h / 2, 0, RED));
      P.push(box(w * 0.84, 0.3, w * 0.84, 0, y + h - 0.15, 0, GOLD));
      for (const [dx, dz, ry] of [[0, 1, 0], [0, -1, 0], [1, 0, 1], [-1, 0, 1]]) {
        const win = box(ry ? 0.3 : w * 0.28, h * 0.5, ry ? w * 0.28 : 0.3, dx * w * 0.395, y + h * 0.5, dz * w * 0.395, 0x2a1408);
        P.push(win);
      }
      P.push(roof(w * 1.0, 1.7, 0, y + h, 0, TILE));
      P.push(box(w * 1.28, 0.22, w * 1.28, 0, y + h + 0.05, 0, GOLD));
      y += h + 1.25;
    }
    P.push(cyl(0.18, 0.28, 4.5, 0, y + 1.8, 0, GOLD), at(paint(new THREE.SphereGeometry(0.55, 8, 6), GOLD), 0, y + 4.4, 0));
    return { geo: merge(P), height: y + 5 };
  };
  // ── 기와집: 기단 + 붉은 기둥 몸통 + 두툼한 지붕 ──
  const hall = () => {
    const P = [];
    P.push(box(9, 0.8, 7, 0, 0.4, 0, STONE), box(7.2, 3.4, 5.2, 0, 2.5, 0, RED), box(7.4, 0.3, 5.4, 0, 4.0, 0, GOLD));
    for (const x of [-2.4, 0, 2.4]) P.push(box(1.3, 2.2, 0.3, x, 2.1, 2.7, 0x2a1408));
    const r = new THREE.ConeGeometry(6.2, 2.9, 4, 1); r.rotateY(Math.PI / 4); r.scale(1.3, 1, 0.95);
    P.push(paint(at(r, 0, 5.6, 0), TILE), box(11.0, 0.25, 8, 0, 4.2, 0, GOLD));
    return merge(P);
  };

  // 큰 파고다(랜드마크): 출발 직선 가까이 안쪽 들판 (길에서 45m 넘게 떨어진 곳)
  {
    const si = ctx.segAt(0, 0.6);
    let bx = (b.x0 + b.x1) / 2, bz = (b.z0 + b.z1) / 2, best = Infinity;
    for (let x = b.x0; x <= b.x1; x += 8) for (let z = b.z0; z <= b.z1; z += 8) {
      if (!inside(x, z)) continue;
      if (clearance(x, z) < 50) continue;
      const d = Math.hypot(x - T.x[si], z - T.z[si]);
      if (d < best) { best = d; bx = x; bz = z; }
    }
    const big = pagoda(9, 11);
    const m = new THREE.Mesh(big.geo, ctx.mat({ vertexColors: true, roughness: 0.6, emissive: 0x1a0804 }));
    m.scale.setScalar(1.25); m.position.set(bx, ctx.ground(bx, bz) - 0.3, bz);
    m.castShadow = ctx.q.detail >= 1; m.receiveShadow = true;
    ctx.group.add(m);
    // 작은 파고다·기와집은 길가에 (큰 파고다와 겹치지 않게)
    const free = (x, z) => Math.hypot(x - bx, z - bz) > 38;
    const pm = ctx.mat({ vertexColors: true, roughness: 0.6, emissive: 0x1a0804 });
    const p5 = pagoda(5, 7);
    instance(p5.geo, pm, spots({ n: 11, from: 14, to: 55, scale: [1.0, 1.5], filter: free }), { shadow: true });
    const p3 = pagoda(3, 6);
    instance(p3.geo, pm, spots({ n: 9, from: 12, to: 45, scale: [1.0, 1.4], filter: free }), { shadow: true });
    instance(hall(), pm, spots({ n: 42, from: 9, to: 36, scale: [0.9, 1.5], face: true, filter: free }), { shadow: true });
  }

  // ── 패루: 길 위 높은 문 (기둥은 벽 밖, 들보는 높이 9m) ──
  {
    const plaque = new THREE.MeshBasicMaterial({ map: ctx.sign('붉은 등롱 성', '#8a1812', '#ffd86a', 512, 128) });
    const cfg = [[6, 0.4], [10, 0.6], [18, 0.2], [22, 0.5], [12, 0.55]];
    const parts = [], plaques = [];
    for (const [seg, fr] of cfg) {
      const i = ctx.segAt(seg, fr);
      const L = T.wallL[i] + 1.8, R = T.wallR[i] + 1.8, c = (L - R) / 2, hw = (L + R) / 2;
      const P = [];
      for (const s of [-1, 1]) {
        P.push(cyl(0.55, 0.65, 11, s * hw, 4.5, 0, RED, 10), box(1.6, 1.0, 1.6, s * hw, -0.5, 0, STONE));
        P.push(box(0.5, 3.0, 1.4, s * (hw + 1.0), 1.0, 0, GOLD));
      }
      P.push(box(hw * 2 + 2.2, 1.0, 0.9, 0, 9.2, 0, RED), box(hw * 2 + 2.2, 0.28, 1.0, 0, 9.8, 0, GOLD));
      P.push(box(hw * 2 + 2.2, 0.7, 0.8, 0, 7.8, 0, 0xd08a20));
      P.push(box(hw * 2 - 1, 2.0, 0.5, 0, 11.4, 0, RED));
      const rr = new THREE.ConeGeometry(hw * 0.95 + 2, 2.0, 4, 1); rr.rotateY(Math.PI / 4); rr.scale(1, 1, 0.34);
      P.push(paint(at(rr, 0, 13.3, 0), TILE));
      for (const s of [-1, 1]) { const sr = new THREE.ConeGeometry(2.0, 1.4, 4, 1); sr.rotateY(Math.PI / 4); sr.scale(1, 1, 0.5); P.push(paint(at(sr, s * (hw + 0.6), 11.6, 0), TILE)); }
      P.push(cyl(0.12, 0.12, 1.2, 0, 14.5, 0, GOLD));
      const g = merge(P);
      const p = ctx.pt(i, c);
      g.rotateY(ctx.yawAt(i)); g.translate(p.x, ctx.road(i, c) + 0.0, p.z);
      parts.push(g);
      // 현판 (앞뒤 양면)
      for (const f of [1, -1]) {
        const pl = new THREE.PlaneGeometry(Math.min(7, hw * 1.2), 1.7);
        if (f < 0) pl.rotateY(Math.PI);
        pl.translate(0, 11.4, f * 0.27);
        pl.rotateY(ctx.yawAt(i)); pl.translate(p.x, ctx.road(i, c), p.z);
        plaques.push(pl);
      }
    }
    const pm = new THREE.Mesh(merge(parts), ctx.mat({ vertexColors: true, roughness: 0.55, emissive: 0x240804 }));
    pm.castShadow = ctx.q.detail >= 1; ctx.group.add(pm);
    const plm = new THREE.Mesh(merge(plaques), plaque); ctx.group.add(plm);
  }

  // ── 붉은 등롱 (기둥 + 팔 끝에 매달린 등, 바람에 흔들림) ──
  {
    const poles = [];
    const stalk = merge([cyl(0.1, 0.14, 4.6, 0, 2.3, 0, 0x5a1810, 6), box(0.12, 0.12, 1.4, 0, 4.55, 0.7, 0x5a1810)]);
    const list = spots({ n: 130, from: 5, to: 6.5, face: true, margin: 4 });
    list.forEach(o => { o.s = 1; });
    instance(stalk, ctx.mat({ vertexColors: true, roughness: 0.7 }), list);
    const lg = merge([
      paint(at(new THREE.SphereGeometry(0.55, 10, 8).scale(1, 1.25, 1), 0, 0, 0), 0xff3a22),
      cyl(0.4, 0.4, 0.12, 0, 0.78, 0, 0xe0b040, 8), cyl(0.4, 0.4, 0.12, 0, -0.78, 0, 0xe0b040, 8),
      cyl(0.04, 0.04, 0.8, 0, -1.2, 0, 0xe0b040, 4),
    ]);
    const lm = ctx.mat({ vertexColors: true, color: 0xffffff, emissive: 0xd01808, emissiveIntensity: 0.6, roughness: 0.5 });
    const im = new THREE.InstancedMesh(lg, lm, list.length);
    im.frustumCulled = false;
    ctx.group.add(im);
    const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), qn = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1);
    ctx.onFrame(t => {
      list.forEach((o, k) => {
        const sx = Math.sin(t * 1.4 + k * 1.7) * 0.22 + Math.sin(t * 0.5 + k) * 0.1, sz = Math.sin(t * 1.1 + k * 0.9) * 0.1;
        const lx = sx, lz = 1.4 + sz, c = Math.cos(o.ry), s = Math.sin(o.ry);
        p.set(o.x + lx * c + lz * s, o.y + 3.6, o.z - lx * s + lz * c);
        qn.setFromAxisAngle(up, o.ry);
        im.setMatrixAt(k, m4.compose(p, qn, sc));
      });
      im.instanceMatrix.needsUpdate = true;
    });
  }

  // ── 대나무 숲 ──
  {
    const P = [];
    const stalks = [[0, 0, 0.0, 0.0], [0.9, 0.5, 0.05, 0.03], [-0.8, 0.7, -0.04, 0.05], [0.3, -0.9, 0.03, -0.05], [-0.4, -0.5, -0.05, -0.02]];
    stalks.forEach(([x, z, lx, lz], k) => {
      const h = 9 + k * 1.3;
      const c = new THREE.CylinderGeometry(0.09, 0.14, h, 5); c.translate(0, h / 2, 0);
      c.rotateZ(lx); c.rotateX(lz);
      P.push(paint(at(c, x, 0, z), 0x6fae3c));
      for (let j = 1; j < 5; j++) P.push(paint(at(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 5), x + lx * -h * j / 6, h * j / 5.2, z + lz * h * j / 5.2), 0x4e8a2a));
      for (let j = 0; j < 4; j++) {
        const lf = new THREE.ConeGeometry(0.22, 2.2, 4); lf.rotateZ(Math.PI / 2 + j * 1.2); lf.rotateY(j * 1.6 + k);
        P.push(paint(at(lf, x - lx * h * 0.9, h - 0.6 - (j % 2) * 0.8, z + lz * h * 0.9), 0x8ccc4a));
      }
    });
    const col = [new THREE.Color(0xffffff), new THREE.Color(0xd8ffc0), new THREE.Color(0xc8e8a0)];
    instance(merge(P), ctx.mat({ vertexColors: true, roughness: 0.8 }), spots({ n: 230, from: 6, to: 70, scale: [0.9, 1.7] }), { color: (o, k) => col[k % 3], shadow: true });
  }

  // ── 소원 등 (하늘로 천천히 올라가는 작은 불빛) ──
  {
    const n = 70, mx = (b.x0 + b.x1) / 2, mz = (b.z0 + b.z1) / 2, rx = (b.x1 - b.x0) / 2 + 60, rz = (b.z1 - b.z0) / 2 + 60;
    const geo = new THREE.CylinderGeometry(0.7, 0.5, 1.0, 6);
    const im = new THREE.InstancedMesh(geo, ctx.mat({ color: 0xffa040 }, 'basic'), n);
    im.frustumCulled = false; ctx.group.add(im);
    const seed = [];
    for (let k = 0; k < n; k++) seed.push({ x: mx + (ctx.rand() * 2 - 1) * rx, z: mz + (ctx.rand() * 2 - 1) * rz, y0: ctx.rand() * 100, sp: 1.5 + ctx.rand() * 2.5, ph: ctx.rand() * 6.28 });
    const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), qn = new THREE.Quaternion(), sc = new THREE.Vector3();
    ctx.onFrame(t => {
      seed.forEach((o, k) => {
        const y = 12 + ((o.y0 + t * o.sp) % 100);
        p.set(o.x + Math.sin(t * 0.2 + o.ph) * 5, y, o.z + Math.cos(t * 0.17 + o.ph) * 5);
        sc.setScalar(1 + Math.sin(t * 3 + o.ph) * 0.05);
        im.setMatrixAt(k, m4.compose(p, qn, sc));
      });
      im.instanceMatrix.needsUpdate = true;
    });
  }
}
