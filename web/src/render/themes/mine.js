// 14회차 테마: mine — 붉은 갱도 내리막 (어두운 광산 협곡)
// 나무 버팀목 틀(길을 가로지르는 들보 + 매달린 랜턴, 터널 안 기둥), 갓길 용암 줄기(emissive, 흐름), 광차 레일·광차,
// 머리 위 컨베이어(벨트가 돌고 광석이 실려 간다), 암벽에 박힌 광석 결정, 광석 더미.
// 이 맵은 양쪽이 높은 암벽 협곡이라 모든 소품을 갓길·암벽면·머리 위에 둔다. 빛은 전부 emissive/Basic(+블룸), 실시간 조명 없음.

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
    g.strokeStyle = '#9a9aa6'; g.lineWidth = 6; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(14, 8); g.lineTo(44, 32); g.lineTo(14, 56); g.stroke();   // 진행 방향(+x) 꺾쇠
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
  /** 벽 안쪽 갓길 줄: 벽에서 gap 만큼 길 쪽. 터널 구간에서는 줄을 나눈다 */
  const shoulder = (a, b, sd, gap, minLen = 8) => {
    const out = []; let cur = [];
    const flush = () => { if (cur.length >= minLen) out.push({ sd, pts: cur }); cur = []; };
    for (let i = a; i < b; i++) {
      const idx = norm(i);
      if (T.tunnel[idx]) { flush(); continue; }
      const d = sd * (ctx.wallAt(idx, sd) - gap);
      cur.push({ i: idx, x: T.x[idx] + T.lx[idx] * d, z: T.z[idx] + T.lz[idx] * d, y: ctx.road(idx, d) });
    }
    flush();
    return out;
  };
  /** 점 줄 → 띠 모양 (폭 w, 위로 lift, 옆으로 offs) */
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
  const startI = ctx.idxAt(0);
  const nearStart = i => Math.min(Math.abs(i - startI), T.n - Math.abs(i - startI)) < 40;
  const special = (i, r = 14) => { for (let k = -r; k <= r; k++) { const j = norm(i + k); if (T.ramp[j] > 0 || T.divW[j] > 0 || T.padW[j] > 0) return true; } return false; };
  const nearTunnel = (i, r = 12) => { for (let k = -r; k <= r; k += 4) if (T.tunnel[norm(i + k)]) return true; return false; };

  // ── 나무 버팀목 틀: 길 양쪽 벽 아래 기둥 + 길을 가로지르는 들보 + 매달린 랜턴 (터널 안은 낮고 촘촘하게) ──
  {
    const posts = [], beams = [], lamps = [];
    const frame = (i, tunnel) => {
      const L = T.wallL[i], R = T.wallR[i], H = tunnel ? 4.6 : 7.8;
      const dl = L - 0.3 + (tunnel ? -0.15 : 0), dr = -R + 0.3 + (tunnel ? 0.15 : 0);
      const mk = d => ({ x: T.x[i] + T.lx[i] * d, z: T.z[i] + T.lz[i] * d, y: ctx.road(i, d) - 0.3, sx: 1, sy: H + 0.3, sz: 1, ry: 0 });
      posts.push(mk(dl), mk(dr));
      const span = L + R + 0.4, cx = (L - R) / 2;
      beams.push({ x: T.x[i] + T.lx[i] * cx, y: T.y[i] + H, z: T.z[i] + T.lz[i] * cx, sx: span, sy: 1, sz: 1, ry: Math.atan2(-T.lz[i], T.lx[i]) });
      lamps.push({ x: T.x[i] + T.lx[i] * cx, y: T.y[i] + H - 0.75, z: T.z[i] + T.lz[i] * cx, s: 1 });
    };
    const stepOpen = Math.round(48 / T.ds), stepTun = Math.round(11 / T.ds);
    for (let i = 0; i < T.n; i += stepTun) if (T.tunnel[i] && !(T.divW[i] > 0)) frame(i, true);
    for (let i = stepOpen; i < T.n; i += stepOpen) {
      if (T.tunnel[i] || special(i) || nearTunnel(i) || nearStart(i)) continue;
      frame(i, false);
    }
    const wood = ctx.mat({ color: 0xa8784c, roughness: 0.95, emissive: 0x2a1a0c });
    const post = new THREE.BoxGeometry(0.55, 1, 0.55); post.translate(0, 0.5, 0);
    instance(post, wood, posts, { shadow: true });
    instance(new THREE.BoxGeometry(1, 0.7, 0.6), wood, beams, { shadow: true });
    const chain = new THREE.BoxGeometry(0.06, 0.7, 0.06); chain.translate(0, 0.55, 0);
    instance(merge([new THREE.SphereGeometry(0.34, 10, 8), chain]), ctx.mat({ color: new THREE.Color(2.4, 1.5, 0.6) }, 'basic'), lamps);
  }

  // ── 용암 줄기: 협곡 구간(헤어핀 끝 ~ 협곡 바닥) 갓길에 양쪽으로 흐르며 빛난다 ──
  {
    const lavaTexture = lavaTex(ctx);
    const lavaMat = ctx.mat({ map: lavaTexture, color: new THREE.Color(1.6, 1.3, 1.0), side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }, 'basic');
    const [a, b] = rng(17, 0, 29, 0);
    const glow = [];
    for (const sd of [1, -1]) for (const l of shoulder(a, b, sd, 1.25, 8)) {
      addMesh(strip(l, 1.0, 0.1, 4), lavaMat);
      l.pts.forEach((p, k) => { if (k % 9 === 0) glow.push({ x: p.x, y: p.y + 0.3, z: p.z, s: 6.5, ry: 0 }); });
    }
    const gg = new THREE.PlaneGeometry(1, 1); gg.rotateX(-Math.PI / 2);
    instance(gg, ctx.mat({ map: glowTex(ctx), color: new THREE.Color(1.0, 0.42, 0.08), transparent: true, opacity: 0.5, depthWrite: false }, 'basic'), glow).receiveShadow = false;
    ctx.onFrame(t => { lavaTexture.offset.set(0, -t * 0.04); });
  }

  // ── 광차 레일 + 광차: 갓길을 따라 한쪽 벽 밑에 (용암 구간 제외) ──
  {
    const railLanes = [];
    for (const l of shoulder(...rng(0, 0.2, 17, 0), 1, 1.35, 12)) railLanes.push(l);
    for (const l of shoulder(...rng(29, 0, 45, 0.9), -1, 1.35, 12)) railLanes.push(l);
    const rails = [], sleep = [], carts = [];
    for (const l of railLanes) {
      rails.push(strip(l, 0.12, 0.28, 4, -0.45), strip(l, 0.12, 0.28, 4, 0.45));
      let acc = 0, accC = 60;
      for (let k = 1; k < l.pts.length; k++) {
        const p = l.pts[k], q = l.pts[k - 1], d = Math.hypot(p.x - q.x, p.z - q.z);
        acc += d; accC += d;
        const idx = p.i, ry = ctx.yawAt(idx);
        if (acc >= 1.5) { acc = 0; sleep.push({ x: p.x, y: p.y + 0.1, z: p.z, s: 1, ry }); }
        if (accC >= 130 && !special(idx, 10) && !nearStart(idx)) { accC = 0; carts.push({ x: p.x, y: p.y + 0.28, z: p.z, s: 1, ry }); }
      }
    }
    if (rails.length) addMesh(merge(rails), ctx.mat({ color: 0xc0c8d0, emissive: 0x30343a, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide }));
    instance(new THREE.BoxGeometry(0.26, 0.12, 1.9), ctx.mat({ color: 0x6a4a30, roughness: 1 }), sleep.map(o => ({ ...o, ry: o.ry + Math.PI / 2 })));
    const P = [];
    P.push(paint(at(new THREE.BoxGeometry(1.0, 0.8, 1.7), 0, 0.95, 0), 0x7a6252));
    P.push(paint(at(new THREE.BoxGeometry(1.15, 0.12, 1.85), 0, 1.42, 0), 0x3a3a42));
    for (let k = 0; k < 5; k++) { const g = new THREE.DodecahedronGeometry(0.26 + (k % 3) * 0.05); P.push(paint(at(g, (k % 3 - 1) * 0.25, 1.55 + (k % 2) * 0.1, -0.55 + k * 0.28), k % 2 ? 0x4a2e22 : 0xe0a030)); }
    for (const x of [-0.45, 0.45]) for (const z of [-0.55, 0.55]) { const w = new THREE.CylinderGeometry(0.22, 0.22, 0.1, 10); w.rotateZ(Math.PI / 2); P.push(paint(at(w, x, 0.35, z * 1.2), 0x2a2a30)); }
    instance(merge(P), ctx.mat({ vertexColors: true, roughness: 0.7, metalness: 0.3, emissive: 0x1a1008 }), carts, { shadow: true });
  }

  // ── 머리 위 컨베이어: 암벽에서 암벽으로 길을 가로질러 걸리고, 벨트가 돌며 광석이 실려 간다 (깊은 협곡만) ──
  {
    const belt = beltTex(ctx); belt.repeat.set(14, 1);
    const spots = [];
    const tops = (i, sd) => { const w = ctx.wallAt(i, sd) + 60; return ctx.ground(T.x[i] + T.lx[i] * sd * w, T.z[i] + T.lz[i] * sd * w) - T.y[i]; };
    for (const [seg, fr] of [[2, 0.5], [4, 0.5], [8, 0.65], [10, 0.5], [14, 0.5], [16, 0.6], [19, 0.5], [22, 0.5], [24, 0.5], [26, 0.5], [30, 0.2], [33, 0.7], [38, 0.7], [41, 0.5]]) {
      const i = ctx.segAt(seg, fr);
      if (T.tunnel[i] || special(i, 20) || nearTunnel(i, 16) || nearStart(i)) continue;
      if (tops(i, 1) < 16 || tops(i, -1) < 16) continue;
      spots.push(i);
    }
    const LEN = 36, H = 9.2, PER = 14;
    const list = spots.map(i => { const cx = (T.wallL[i] - T.wallR[i]) / 2; return { x: T.x[i] + T.lx[i] * cx, y: T.y[i] + H, z: T.z[i] + T.lz[i] * cx, ry: Math.atan2(-T.lz[i], T.lx[i]), s: 1 }; });
    instance(new THREE.BoxGeometry(LEN, 0.3, 1.6), ctx.mat({ map: belt, roughness: 0.9 }), list, { shadow: true });
    const edgeList = [];
    list.forEach(o => { for (const z of [-0.85, 0.85]) { const cs = Math.cos(o.ry), sn = Math.sin(o.ry); edgeList.push({ x: o.x + sn * z, y: o.y + 0.2, z: o.z + cs * z, ry: o.ry, s: 1 }); } });
    instance(new THREE.BoxGeometry(LEN, 0.5, 0.14), ctx.mat({ color: 0x6a6e78, roughness: 0.5, metalness: 0.7 }), edgeList);
    const nc = PER * list.length;
    if (list.length) {
      const imC = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1), ctx.mat({ color: 0x5a3a28, roughness: 0.8, emissive: 0x4a2a08, flatShading: true }), nc);
      const seeds = Array.from({ length: nc }, () => ({ u: ctx.rand(), sz: 0.22 + ctx.rand() * 0.18, z: (ctx.rand() - 0.5) * 0.7 }));
      const m4 = new THREE.Matrix4(), qn = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
      ctx.onFrame(t => {
        let k = 0;
        for (const o of list) {
          const c = Math.cos(o.ry), s = Math.sin(o.ry);
          for (let j = 0; j < PER; j++, k++) {
            const sd = seeds[k], u = ((sd.u + t * 0.04) % 1 - 0.5) * (LEN - 2);
            p.set(o.x + c * u + s * sd.z, o.y + 0.15 + sd.sz * 0.6, o.z - s * u + c * sd.z);
            imC.setMatrixAt(k, m4.compose(p, qn, sc.set(sd.sz * 1.3, sd.sz, sd.sz * 1.1)));
          }
        }
        imC.instanceMatrix.needsUpdate = true;
      });
      imC.count = nc; imC.frustumCulled = false;
      ctx.group.add(imC);
    }
    ctx.onFrame(t => { belt.offset.x = (t * 0.5) % 1; });
  }

  // ── 암벽에 박힌 빛나는 광석 결정 (주황·황금·푸른빛) ──
  {
    const P = [];
    for (const [x, y, h, r, tz, ty] of [[0, 0, 1.5, 0.28, 0, 0], [0.35, 0.2, 1.0, 0.2, 0.5, 1.0], [-0.3, 0.15, 0.9, 0.18, -0.4, 4.0], [0.05, -0.35, 0.8, 0.17, 0.2, 2.5]]) {
      const cone = new THREE.ConeGeometry(r, h, 5); cone.translate(0, h / 2, 0); cone.rotateX(Math.PI / 2);   // 끝이 +Z (길 쪽)
      cone.rotateX(tz * 0.3); cone.rotateY(ty * 0.1);
      P.push(at(cone, x, y, 0));
    }
    const geo = merge(P);
    const list = [];
    const cols = [new THREE.Color(1.5, 0.75, 0.2), new THREE.Color(1.4, 1.1, 0.3), new THREE.Color(0.6, 1.1, 1.4), new THREE.Color(1.5, 0.5, 0.18)];
    for (let i = 8; i < T.n; i += 5 + Math.floor(ctx.rand() * 8)) {
      if (T.tunnel[i] || nearStart(i)) continue;
      const sd = ctx.rand() < 0.5 ? 1 : -1, w = ctx.wallAt(i, sd);
      const d = sd * (w + 0.1), y = ctx.road(i, sd * w) + 1.0 + ctx.rand() * 3.2;
      list.push({ x: T.x[i] + T.lx[i] * d, y, z: T.z[i] + T.lz[i] * d, s: 0.45 + ctx.rand() * 0.8, ry: Math.atan2(-sd * T.lx[i], -sd * T.lz[i]) + (ctx.rand() - 0.5) * 0.5 });
    }
    instance(geo, ctx.mat({ color: 0xffffff }, 'basic'), list, { color: (o, k) => cols[k % 4] });
  }

  // ── 광석 더미 (갓길 벽 밑) ──
  {
    const P = [];
    const lump = (r, x, y, z, hex) => { const g = new THREE.DodecahedronGeometry(r, 0); g.scale(1, 0.75, 1); return paint(at(g, x, y, z), hex); };
    P.push(lump(0.7, 0, 0.35, 0, 0x4a3226), lump(0.5, 0.6, 0.22, 0.2, 0x5a3a2a), lump(0.45, -0.55, 0.2, 0.2, 0x3a2a24), lump(0.35, 0.1, 0.7, 0.05, 0x4a3226),
      lump(0.17, 0.3, 0.75, 0.3, 0xf0b030), lump(0.14, -0.3, 0.55, 0.4, 0xf0b030), lump(0.15, 0.7, 0.5, 0.3, 0xffd060));
    const list = [];
    for (let i = 20; i < T.n; i += 14 + Math.floor(ctx.rand() * 18)) {
      if (T.tunnel[i] || special(i, 8) || nearStart(i)) continue;
      const sd = ctx.rand() < 0.5 ? 1 : -1, d = sd * (ctx.wallAt(i, sd) - 1.0);
      list.push({ x: T.x[i] + T.lx[i] * d, z: T.z[i] + T.lz[i] * d, y: ctx.road(i, d) - 0.05, s: 0.8 + ctx.rand() * 0.9, ry: ctx.rand() * 6.28 });
    }
    instance(merge(P), ctx.mat({ vertexColors: true, roughness: 0.75, flatShading: true, emissive: 0x2a1604 }), list, { shadow: true });
  }
}
