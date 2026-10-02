// 14회차 테마: 꽃마을 운하길 — 밝은 한낮, 알록달록 지붕 집, 꽃밭·화분·튤립 밭, 운하·연못, 시계탑, 돌아가는 풍차, 열기구
// (그림 전용 — 주행 계산과 무관. 무작위는 ctx.rand 로 맵마다 같은 무늬)

const WATER_Y = -2.4;    // 낮은 땅에 고이는 연못 높이 (서킷 지형은 대략 -6~+2m, 길 옆 3m 안 땅은 노면-1.2m)

/** 옅은 판석 돌길 (u = 길 폭 전체, v = 10m 마다 1) */
function paving(ctx) {
  const r = ctx.rand;
  return ctx.canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#5c564e'; g.fillRect(0, 0, w, h);          // 줄눈
    const rows = 16, rh = h / rows;                            // 한 줄 0.625m
    for (let row = 0; row < rows; row++) {
      let x = -r() * 40;
      while (x < w) {
        const sw = 26 + r() * 36;                              // 1m ≈ 36px (폭 14m)
        const v = 116 + (r() * 22 | 0), t = r() * 10;
        g.fillStyle = `rgb(${v + 10},${(v + 4 - t) | 0},${(v - 8 - t) | 0})`;
        g.fillRect(x + 1.5, row * rh + 1.5, sw - 3, rh - 3);
        x += sw;
      }
    }
    const img = g.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 12; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    g.putImageData(img, 0, 0);
  });
}

/** 크림색 널빤지 울타리 (벽 띠: u 0~1/3 안쪽 면, 1/3~2/3 윗면, 2/3~1 바깥 면 / v = 4m 마다 1) */
function fenceTex(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#fffaf0'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f1e8d4'; g.fillRect(w / 3, 0, w / 3, h);
    g.fillStyle = '#d9cfbb';
    for (let k = 0; k < 20; k++) { const y = k * h / 20; g.fillRect(0, y, w / 3, 2); g.fillRect(2 * w / 3, y, w / 3, 2); }
    g.fillStyle = '#e8dcc4';
    for (const hh of [0.25, 0.8]) { const u = (hh + 1.5) / 2.6 / 3; g.fillRect(u * w - 3, 0, 6, h); g.fillRect((1 - u) * w - 3, 0, 6, h); }
  });
}

export const look = {
  road: 0xffffff,
  roadTex: paving,
  roadRough: 0.85,
  line: 0xffffff,
  wall: { color: 0xb4ac9c, map: fenceTex, roughness: 0.85, stripe: false },
  trees: false,                       // 나무는 build 에서 (연못에 빠지지 않게)
  real: {   // 맑은 낮 마을 — 돌길·회벽
    sky: 'kloofendal_43d_clear_puresky', exposure: 0.95,
    road: { tex: 'cobblestone_floor_04', scale: 2, env: 1.0, bright: 1.25, tint: 0xf2ece0 },
    runoff: { tex: 'leafy_grass', scale: 3, tint: 0xb4d896 },
    terrain: { tex: 'leafy_grass', scale: 5, tint: 0xb4d896 },
    wall: { tex: 'concrete_wall_006', scale: 3, tint: 0xf0e6d0, bright: 1.9 },
    trees: { con: ['island_tree_02'], broad: ['island_tree_01', 'island_tree_02'], h: [6, 11], n: 0.5 },
  },
  far: [0x84a8c2, 0xa3bed4],
  banner: { bg: '#e2533c', fg: '#fff8e6' },
};

export function build(ctx) {
  const { THREE, T } = ctx;
  const R = ctx.rand;
  const col = new THREE.Color();
  const taken = [];        // 큰 물건 자리 {x,z,r} — 서로 겹치지 않게
  const free = (x, z, r) => taken.every(t => (t.x - x) ** 2 + (t.z - z) ** 2 > (t.r + r) ** 2);
  const dry = (x, z, pad = 0.5) => ctx.ground(x, z) > WATER_Y + pad;

  // ── 도구 ──
  /** 길 옆 자리 고르기 (scatter 와 같은 규칙 + 자리 기억) */
  function spots({ n, from = 6, to = 40, side = 0, range = null, filter = null, margin = from, r = 0, keep = false }) {
    const out = [];
    let tries = 0;
    while (out.length < n && tries < n * 40) {
      tries++;
      const a = range ? range[0] : 0, b = range ? range[1] : T.n;
      const span = (((b - a) % T.n) + T.n) % T.n || T.n;
      const i = ((Math.floor(a + R() * span) % T.n) + T.n) % T.n;
      const sd = side || (R() < 0.5 ? 1 : -1);
      const off = sd * (ctx.wallAt(i, sd) + from + R() * (to - from));
      const x = T.x[i] + T.lx[i] * off, z = T.z[i] + T.lz[i] * off;
      if (!ctx.clear(x, z, margin)) continue;
      if (r && !free(x, z, r)) continue;
      if (filter && !filter(x, z, i)) continue;
      const p = { x, z, y: ctx.ground(x, z), i, side: sd, face: ctx.yawAt(i) + (sd > 0 ? -Math.PI / 2 : Math.PI / 2), u: R(), v: R() };
      out.push(p);
      if (keep && r) taken.push({ x, z, r });
    }
    return out;
  }
  /** 같은 자리 목록으로 InstancedMesh 하나 */
  function inst(geo, mat, list, { s = () => 1, yaw = p => p.face, color = null, cast = false, dy = 0 } = {}) {
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    list.forEach((p, k) => {
      const ss = s(p);
      q.setFromAxisAngle(up, yaw(p));
      v.set(p.x, p.y + dy, p.z); sc.set(ss, ss, ss);
      im.setMatrixAt(k, m4.compose(v, q, sc));
      if (color) im.setColorAt(k, color(p, k));
    });
    im.count = list.length;
    im.castShadow = cast && ctx.q.detail >= 1;
    im.receiveShadow = true;
    im.computeBoundingSphere();
    ctx.group.add(im);
    return im;
  }
  /** 합치기 전 손질: 비색인 + uv + (색) */
  function prep(g, hex = null) {
    const x = g.index ? g.toNonIndexed() : g;
    if (!x.attributes.uv) x.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(x.attributes.position.count * 2), 2));
    if (!x.attributes.normal) x.computeVertexNormals();
    if (hex != null) {
      const c = new THREE.Color(hex), n = x.attributes.position.count, a = new Float32Array(n * 3);
      for (let k = 0; k < n; k++) { a[k * 3] = c.r; a[k * 3 + 1] = c.g; a[k * 3 + 2] = c.b; }
      x.setAttribute('color', new THREE.BufferAttribute(a, 3));
    }
    return x;
  }
  const merge = list => ctx.mergeGeometries(list);
  /** 삼각형 목록 → 형상 (면 법선) */
  function tris(pts, uvs) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs || new Array(pts.length / 3 * 2).fill(0), 2));
    g.computeVertexNormals();
    return g;
  }

  // ── 시계탑 (출발선 지나 왼쪽, 길을 바라봄) ──
  {
    const i = ctx.segAt(0, 0.62), d = ctx.wallAt(i, 1) + 13;
    const p = ctx.pt(i, d);
    taken.push({ x: p.x, z: p.z, r: 9 });
    const tower = new THREE.Group();
    const stone = [
      prep(new THREE.BoxGeometry(6, 25, 6).translate(0, 11, 0), 0xf3e7cc),
      prep(new THREE.BoxGeometry(7, 1, 7).translate(0, 0, 0), 0xd9c9a8),
      prep(new THREE.BoxGeometry(6.8, 0.8, 6.8).translate(0, 16, 0), 0xd9c9a8),
      prep(new THREE.BoxGeometry(6.8, 0.8, 6.8).translate(0, 23.6, 0), 0xd9c9a8),
      prep(new THREE.BoxGeometry(4.6, 4.2, 4.6).translate(0, 26, 0), 0xf8eedb),
      prep(new THREE.BoxGeometry(5.4, 0.6, 5.4).translate(0, 28.2, 0), 0xd9c9a8),
      prep(new THREE.ConeGeometry(4.4, 8, 4).rotateY(Math.PI / 4).translate(0, 32.4, 0), 0x2f6fb8),
      prep(new THREE.SphereGeometry(0.7, 12, 8).translate(0, 36.8, 0), 0xffcf40),
      prep(new THREE.BoxGeometry(1.6, 3, 0.3).translate(0, 25.6, 2.36), 0x5a4030),   // 종탑 창
      prep(new THREE.BoxGeometry(1.6, 3, 0.3).translate(0, 25.6, -2.36), 0x5a4030),
      prep(new THREE.BoxGeometry(2.6, 3.6, 0.3).translate(0, 1.6, 3.05), 0x7a5232),   // 문
    ];
    const body = new THREE.Mesh(merge(stone), ctx.mat({ vertexColors: true, roughness: 0.8 }));
    body.castShadow = ctx.q.detail >= 1; body.receiveShadow = true;
    tower.add(body);
    const clockTex = ctx.canvasTex(256, 256, (g, w) => {
      g.fillStyle = '#fffdf4'; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 4, 0, Math.PI * 2); g.fill();
      g.lineWidth = 10; g.strokeStyle = '#2b3a55'; g.stroke();
      g.fillStyle = '#2b3a55';
      for (let k = 0; k < 12; k++) {
        const a = k / 12 * Math.PI * 2, r0 = w / 2 - 22;
        g.save(); g.translate(w / 2 + Math.sin(a) * r0, w / 2 - Math.cos(a) * r0); g.rotate(a);
        g.fillRect(-4, -12, 8, k % 3 ? 16 : 26); g.restore();
      }
    });
    const faces = [];
    for (let k = 0; k < 4; k++) faces.push(new THREE.CircleGeometry(2.3, 32).translate(0, 0, 3.03).rotateY(k * Math.PI / 2).translate(0, 19.5, 0));
    tower.add(new THREE.Mesh(merge(faces), ctx.mat({ map: clockTex, roughness: 0.5, emissive: 0x222018 })));
    const handM = ctx.mat({ color: 0x1d2433, roughness: 0.5 });
    const hourH = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.4, 0.06).translate(0, 0.55, 0), handM);
    const minH = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.0, 0.06).translate(0, 0.85, 0), handM);
    hourH.position.set(0, 19.5, 3.1); minH.position.set(0, 19.5, 3.14);
    tower.add(hourH, minH);
    ctx.place(tower, i, d);
    tower.position.y = p.y - 0.3;
    ctx.onFrame(t => { minH.rotation.z = -t * 0.35; hourH.rotation.z = -t * 0.35 / 12 - 1.2; });
  }

  // ── 풍차 3기 (풍차 언덕 — 오른쪽 바깥, 길을 바라봄) ──
  {
    const wmGeo = merge([
      prep(new THREE.CylinderGeometry(2.0, 3.3, 12, 12).translate(0, 5.5, 0), 0xfbf6ea),
      prep(new THREE.CylinderGeometry(2.3, 2.3, 0.5, 12).translate(0, 11.6, 0), 0x8a5a3a),
      prep(new THREE.ConeGeometry(2.6, 3.6, 12).translate(0, 13.6, 0), 0xb8402e),
      prep(new THREE.BoxGeometry(1.4, 2.4, 0.3).translate(0, 1.0, 3.05), 0x6a4a30),
      prep(new THREE.BoxGeometry(1.0, 1.0, 0.3).translate(0, 6.5, 2.55), 0x4c7aa0),
      prep(new THREE.CylinderGeometry(0.35, 0.35, 1.6, 8).rotateX(Math.PI / 2).translate(0, 12.2, 2.4), 0x5a4030),
    ]);
    const wmM = ctx.mat({ vertexColors: true, roughness: 0.8 });
    const latt = ctx.canvasTex(64, 256, (g, w, h) => {
      g.fillStyle = '#f6efe0'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#8a6a4a'; g.lineWidth = 5; g.strokeRect(3, 3, w - 6, h - 6);
      g.lineWidth = 3;
      for (let y = 0; y < h; y += 26) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
    });
    const bladeGeo = merge([0, 1, 2, 3].map(k => new THREE.BoxGeometry(1.5, 8.5, 0.12).translate(0.5, 5.1, 0).rotateZ(k * Math.PI / 2)));
    const bladeM = ctx.mat({ map: latt, roughness: 0.8, side: THREE.DoubleSide });
    const where = [[7, 0.25, 34], [8, 0.55, 48], [9, 0.45, 30]];
    const mills = [];
    for (const [sg, fr, off] of where) {
      const i = ctx.segAt(sg, fr);
      let d = -(ctx.wallAt(i, -1) + off), p = ctx.pt(i, d);
      for (let k = 0; k < 6 && (!dry(p.x, p.z, 1) || !ctx.clear(p.x, p.z, 8)); k++) { d -= 8; p = ctx.pt(i, d); }
      taken.push({ x: p.x, z: p.z, r: 8 });
      const g = new THREE.Group();
      const body = new THREE.Mesh(wmGeo, wmM); body.castShadow = ctx.q.detail >= 1; body.receiveShadow = true; g.add(body);
      const blades = new THREE.Mesh(bladeGeo, bladeM); blades.position.set(0, 12.2, 3.25); blades.castShadow = ctx.q.detail >= 1;
      g.add(blades);
      ctx.place(g, i, d);
      g.position.y = p.y - 0.4;
      mills.push([blades, 0.6 + mills.length * 0.15]);
    }
    ctx.onFrame(t => { for (const [b, w] of mills) b.rotation.z = t * w; });
  }

  // ── 운하 (운하 옆 직선 오른쪽: 돌 둑 + 반짝이는 물) ──
  const waterTex = ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#2a7fa6'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 140; k++) {
      const x = R() * w, y = R() * h, l = 10 + R() * 30;
      g.strokeStyle = R() < 0.5 ? 'rgba(170,225,245,0.55)' : 'rgba(30,110,150,0.45)';
      g.lineWidth = 2 + R() * 2;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 4, x + l, y); g.stroke();
    }
  });
  const glint = ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff';
    for (let k = 0; k < 70; k++) { const x = R() * w, y = R() * h; g.fillRect(x, y, 3 + R() * 6, 1.5); }
  });
  {
    const a = ctx.segAt(4, 0.05), b = ctx.segAt(6, 0.02);
    const dc = i => -(ctx.wallAt(i, -1) + 12);
    const pos = [], uv = [], bank = [];
    const rows = [];
    for (let i = a; ; i = (i + 1) % T.n) {
      const c = ctx.pt(i, dc(i));
      rows.push({ i, c });
      if (i === b) break;
    }
    // 물 높이: 줄마다 둑 안 땅보다 조금 위 (앞뒤 10m 의 최고 땅 — 완만하게 따라간다)
    const gmax = rows.map(({ i }) => Math.max(...[-3.6, 0, 3.6].map(o => ctx.pt(i, dc(i) + o).y)));
    const wyr = gmax.map((_, k) => Math.max(...gmax.slice(Math.max(0, k - 5), k + 6)) + 0.12);
    for (let k = 0; k < rows.length - 1; k++) {
      const i0 = rows[k].i, i1 = rows[k + 1].i, y0 = wyr[k], y1 = wyr[k + 1];
      const A = ctx.pt(i0, dc(i0) - 3.2), B = ctx.pt(i0, dc(i0) + 3.2), C = ctx.pt(i1, dc(i1) - 3.2), D = ctx.pt(i1, dc(i1) + 3.2);
      pos.push(A.x, y0, A.z, C.x, y1, C.z, B.x, y0, B.z, B.x, y0, B.z, C.x, y1, C.z, D.x, y1, D.z);
      const v0 = k * T.ds / 6, v1 = (k + 1) * T.ds / 6;
      uv.push(0, v0, 0, v1, 1, v0, 1, v0, 0, v1, 1, v1);
      for (const o of [-3.6, 3.6]) bank.push({ ...ctx.pt(i0, dc(i0) + o), yaw: ctx.yawAt(i0), wy: y0 });
    }
    const wg = tris(pos, uv);
    const wm = ctx.mat({ map: waterTex, emissiveMap: glint, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.32, metalness: 0.0, envMapIntensity: 0.5, side: THREE.DoubleSide });
    const water = new THREE.Mesh(wg, wm); water.receiveShadow = true; ctx.group.add(water);
    // 둑: 돌 블록 (2m 마다), 꼭대기는 물보다 0.5m 위
    const bg = new THREE.BoxGeometry(1.0, 1.0, 2.15);
    const bm = ctx.mat({ color: 0xd8ccb4, roughness: 0.9 });
    const im = new THREE.InstancedMesh(bg, bm, bank.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    bank.forEach((p, k) => {
      const top = p.wy + 0.5, bot = Math.min(p.y, p.wy) - 0.6;
      q.setFromAxisAngle(up, p.yaw); v.set(p.x, (top + bot) / 2, p.z); sc.set(1, top - bot, 1);
      im.setMatrixAt(k, m4.compose(v, q, sc));
    });
    im.receiveShadow = true; im.castShadow = ctx.q.detail >= 1; im.computeBoundingSphere();
    ctx.group.add(im);
    // 무지개다리 2개 (운하를 가로지름 — 길 위가 아님)
    const arch = [];
    for (const f of [0.3, 0.75]) {
      const k = Math.floor(rows.length * f), i0 = rows[k].i, c = ctx.pt(i0, dc(i0));
      const g = new THREE.TorusGeometry(4.2, 0.55, 6, 16, Math.PI).scale(1, 0.45, 2.6);
      g.rotateY(ctx.yawAt(i0));   // 다리 방향(로컬 X) = 길 옆방향 → 운하를 가로지른다
      g.translate(c.x, wyr[k] + 0.2, c.z);
      arch.push(g);
      taken.push({ x: c.x, z: c.z, r: 6 });
    }
    const am = new THREE.Mesh(merge(arch), ctx.mat({ color: 0xe9dcc2, roughness: 0.85 }));
    am.castShadow = ctx.q.detail >= 1; ctx.group.add(am);
    // 운하 자리는 다른 물건이 못 들어오게
    for (let k = 0; k < rows.length; k += 4) taken.push({ x: rows[k].c.x, z: rows[k].c.z, r: 5 });
  }

  // ── 연못 (낮은 땅에 고이는 물 평면) ──
  {
    const b = T.bounds;
    const g = new THREE.PlaneGeometry(5200, 5200).rotateX(-Math.PI / 2);
    const wt = waterTex.clone(); wt.needsUpdate = true; wt.repeat.set(420, 420);
    const gt = glint.clone(); gt.needsUpdate = true; gt.repeat.set(420, 420);
    const m = new THREE.Mesh(g, ctx.mat({ map: wt, emissiveMap: gt, emissive: 0xffffff, emissiveIntensity: 0.3, roughness: 0.32, metalness: 0.0, envMapIntensity: 0.5 }));
    m.position.set((b.x0 + b.x1) / 2, WATER_Y, (b.z0 + b.z1) / 2);
    m.receiveShadow = true;
    ctx.group.add(m);
    ctx.onFrame(t => {
      waterTex.offset.set(t * 0.02, t * 0.035); glint.offset.set(-t * 0.03, t * 0.05);
      wt.offset.set(t * 0.01, t * 0.02); gt.offset.set(-t * 0.015, t * 0.025);
      m.position.y = WATER_Y + Math.sin(t * 0.6) * 0.04;
    });
  }

  // ── 집 (알록달록 지붕) ──
  {
    const facade = ctx.canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#d7d0c4'; g.fillRect(0, 92, w, 12);                       // 밑돌 띠
      for (const x of [22, 74]) {
        g.fillStyle = '#7a8f52'; g.fillRect(x - 8, 30, 8, 38); g.fillRect(x + 32, 30, 8, 38);   // 덧문
        g.fillStyle = '#ffffff'; g.fillRect(x, 30, 32, 38);
        g.fillStyle = '#5f8db2'; g.fillRect(x + 3, 33, 12, 15); g.fillRect(x + 17, 33, 12, 15); g.fillRect(x + 3, 50, 12, 15); g.fillRect(x + 17, 50, 12, 15);
        g.fillStyle = '#c0453a'; g.fillRect(x - 2, 68, 36, 5);                // 창 아래 꽃 상자
        g.fillStyle = '#ff7aa8'; for (let k = 0; k < 6; k++) g.fillRect(x + k * 6, 64, 4, 4);
      }
    });
    const bodyGeo = merge([
      prep(new THREE.BoxGeometry(7, 5.8, 6).translate(0, 1.7, 0)),
      prep(tris([-3.5, 4.6, 3, -3.5, 4.6, -3, -3.5, 7.2, 0, 3.5, 4.6, -3, 3.5, 4.6, 3, 3.5, 7.2, 0], [0, 0.95, 1, 0.95, 0.5, 1, 0, 0.95, 1, 0.95, 0.5, 1])),
    ]);
    const roofGeo = (() => {
      const w = 4.1, y0 = 4.4, y1 = 7.45, dz = 3.7;
      return tris([
        -w, y0, dz, w, y0, dz, w, y1, 0, -w, y0, dz, w, y1, 0, -w, y1, 0,
        w, y0, -dz, -w, y0, -dz, -w, y1, 0, w, y0, -dz, -w, y1, 0, w, y1, 0,
      ], [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]);
    })();
    const shingle = ctx.canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(0,0,0,0.16)';
      for (let k = 0; k < 7; k++) { g.fillRect(0, k * h / 7, w, 3); for (let x = (k % 2) * 8; x < w; x += 16) g.fillRect(x, k * h / 7, 2, h / 7); }
    });
    const houses = spots({ n: 90, from: 9, to: 46, margin: 8, r: 6.5, keep: true, filter: (x, z) => dry(x, z, 0.8) && dry(x + 4, z + 4, 0.6) && dry(x - 4, z - 4, 0.6) });
    const walls = ['#fff4dc', '#ffe6dc', '#e4f4e6', '#e2ecff', '#fff0c0', '#f2e4ff', '#ffffff', '#ffe0c8'];
    const roofs = ['#e2453a', '#f08a24', '#2f7fd8', '#22a89a', '#8d5ad6', '#f2b92e', '#e8609a', '#3a9a48', '#d43c6a'];
    const yaw = p => p.face + (p.v - 0.5) * 0.3;
    const sz = p => 0.9 + p.u * 0.35;
    inst(bodyGeo, ctx.mat({ map: facade, color: 0xcfcfcf, roughness: 0.85 }), houses, { s: sz, yaw, dy: -0.2, cast: true, color: p => col.set(walls[Math.floor(p.u * 997) % walls.length]) });
    inst(roofGeo, ctx.mat({ map: shingle, roughness: 0.7, side: THREE.DoubleSide }), houses, { s: sz, yaw, dy: -0.2, cast: true, color: p => col.set(roofs[Math.floor(p.v * 991) % roofs.length]) });
  }

  // ── 튤립 밭 (색 줄무늬 밭, 땅을 따라 휘게) ──
  {
    const fields = spots({ n: 7, from: 14, to: 70, margin: 14, r: 20, keep: true, filter: (x, z) => dry(x, z, 1) && dry(x + 14, z, 1) && dry(x - 14, z, 1) && dry(x, z + 14, 1) && dry(x, z - 14, 1) });
    const tex = ctx.canvasTex(256, 256, (g, w, h) => {
      const cs = ['#e8343c', '#ffd23a', '#ff6fae', '#f7f7f2', '#9a5ce0', '#ff8a2a'];
      const n = 12;
      for (let k = 0; k < n; k++) {
        g.fillStyle = k % 2 ? '#4f8a35' : cs[(k / 2) % cs.length | 0]; g.fillRect(0, k * h / n, w, h / n);
        if (!(k % 2)) { g.fillStyle = 'rgba(255,255,255,0.25)'; for (let x = 0; x < w; x += 6) g.fillRect(x + (R() * 3 | 0), k * h / n + 3, 2, 2); }
      }
    });
    const geos = [];
    for (const f of fields) {
      const g = new THREE.PlaneGeometry(34, 22, 12, 8).rotateX(-Math.PI / 2).rotateY(f.face).translate(f.x, 0, f.z);
      const pa = g.attributes.position;
      for (let k = 0; k < pa.count; k++) pa.setY(k, ctx.ground(pa.getX(k), pa.getZ(k)) + 0.14);
      g.computeVertexNormals();
      geos.push(g);
    }
    if (geos.length) { const m = new THREE.Mesh(merge(geos), ctx.mat({ map: tex, roughness: 0.9 })); m.receiveShadow = true; ctx.group.add(m); }
  }

  // ── 나무 (둥근 나무 + 측백) ──
  {
    const trees = spots({ n: 340, from: 12, to: 170, margin: 9, filter: (x, z) => dry(x, z, 0.8) && free(x, z, 3) });
    const trunk = new THREE.CylinderGeometry(0.22, 0.32, 2.8, 6).translate(0, 1.2, 0);
    const crown = new THREE.IcosahedronGeometry(2.3, 1).scale(1, 0.95, 1).translate(0, 4.2, 0);
    const s = p => 0.85 + p.u * 0.6, yaw = p => p.v * 6.28;
    inst(trunk, ctx.mat({ color: 0x7a5434, roughness: 1 }), trees, { s, yaw, dy: -0.2 });
    inst(crown, ctx.mat({ color: 0xffffff, roughness: 0.9 }), trees, { s, yaw, dy: -0.2, cast: true, color: p => col.setHSL(0.24 + p.v * 0.1, 0.55 + p.u * 0.15, 0.32 + p.u * 0.1) });
    const cyp = spots({ n: 90, from: 8, to: 60, margin: 7, filter: (x, z) => dry(x, z, 0.8) && free(x, z, 2) });
    inst(new THREE.ConeGeometry(1.05, 7, 8).translate(0, 3.3, 0), ctx.mat({ color: 0xffffff, roughness: 0.9 }), cyp, { s: p => 0.8 + p.u * 0.5, cast: true, color: p => col.setHSL(0.3 + p.v * 0.05, 0.45, 0.22 + p.u * 0.06) });
  }

  // ── 꽃밭 덤불 + 화분 (길 가까이) ──
  const bright = ['#ff3b5c', '#ffd22e', '#ff7bc1', '#ffffff', '#a45cff', '#ff8a1f', '#3fa0ff'];
  {
    const beds = spots({ n: 420, from: 5, to: 18, margin: 5, filter: (x, z) => dry(x, z, 0.6) && free(x, z, 1.5) });
    const bush = new THREE.IcosahedronGeometry(1, 1).scale(1.5, 0.55, 1.1).translate(0, 0.2, 0);
    const bl = [];
    for (let k = 0; k < 9; k++) { const a = k * 2.4, rr = 0.25 + (k % 3) * 0.35; bl.push(new THREE.IcosahedronGeometry(0.26, 0).translate(Math.cos(a) * rr * 1.3, 0.62 + (k % 2) * 0.08, Math.sin(a) * rr * 0.9)); }
    const s = p => 0.8 + p.u * 0.6, yaw = p => p.v * 6.28;
    inst(bush, ctx.mat({ color: 0x4f9a3a, roughness: 0.95 }), beds, { s, yaw });
    inst(merge(bl), ctx.mat({ color: 0xffffff, roughness: 0.7 }), beds, { s, yaw, color: p => col.set(bright[Math.floor(p.u * 773) % bright.length]) });
    const pots = spots({ n: 150, from: 5, to: 9, margin: 5, filter: (x, z) => dry(x, z, 0.6) && free(x, z, 1) });
    const s2 = p => 1.0 + p.u * 0.5;
    inst(new THREE.CylinderGeometry(0.5, 0.36, 0.8, 10).translate(0, 0.3, 0), ctx.mat({ color: 0xc8643a, roughness: 0.9 }), pots, { s: s2 });
    inst(new THREE.IcosahedronGeometry(0.55, 1).scale(1, 0.8, 1).translate(0, 0.95, 0), ctx.mat({ color: 0xffffff, roughness: 0.8 }), pots, { s: s2, color: p => col.set(bright[Math.floor(p.v * 911) % bright.length]) });
  }

  // ── 출발 직선 위 깃발 줄 (가장 낮은 곳 7.4m) ──
  {
    const pos = [], cl = [], poles = [];
    const fc = ['#ff3b5c', '#ffd22e', '#3fa0ff', '#4cc46a', '#ff8a1f', '#ffffff'].map(h => new THREE.Color(h));
    for (const f of [0.12, 0.42, 0.78]) {
      const i = ctx.segAt(0, f);
      const L = ctx.pt(i, ctx.wallAt(i, 1) + 4.5), Rr = ctx.pt(i, -(ctx.wallAt(i, -1) + 4.5));
      const ry = T.y[i];
      for (const p of [L, Rr]) poles.push(new THREE.CylinderGeometry(0.14, 0.18, 10.4, 6).translate(p.x, p.y + 5.0, p.z));
      const N = 30;
      for (let k = 0; k < N; k++) {
        const t0 = k / N, t1 = (k + 0.6) / N;
        const at = t => ({ x: L.x + (Rr.x - L.x) * t, z: L.z + (Rr.z - L.z) * t, y: ry + 9.9 - Math.sin(t * Math.PI) * 1.6 });
        const a = at(t0), b = at(t1), m = at((t0 + t1) / 2);
        pos.push(a.x, a.y, a.z, b.x, b.y, b.z, m.x, m.y - 0.85, m.z);
        const c = fc[k % fc.length];
        for (let q = 0; q < 3; q++) cl.push(c.r, c.g, c.b);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(cl, 3));
    g.computeVertexNormals();
    ctx.group.add(new THREE.Mesh(g, ctx.mat({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.8 })));
    ctx.group.add(new THREE.Mesh(merge(poles), ctx.mat({ color: 0xf6f2ea, roughness: 0.6 })));
  }

  // ── 열기구 (하늘에 둥실) ──
  {
    const prof = [[0.01, -7.2], [1.6, -7], [4.4, -4], [6.6, -0.5], [7.1, 2.4], [6.2, 5.4], [4, 7.4], [0.01, 8.2]].map(([x, y]) => new THREE.Vector2(x, y));
    const env = new THREE.LatheGeometry(prof, 20);
    const stripe = ctx.canvasTex(256, 64, (g, w, h) => { for (let k = 0; k < 10; k++) { g.fillStyle = k % 2 ? '#ffffff' : '#ffd84a'; g.fillRect(k * w / 10, 0, w / 10, h); } });
    const basket = new THREE.BoxGeometry(1.8, 1.4, 1.8).translate(0, -9.6, 0);
    const b = T.bounds, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    const tints = ['#ff5a4a', '#3f8cff', '#38c47a', '#c85cff', '#ff9a2a'];
    const list = tints.map((c, k) => ({ x: cx + (R() - 0.5) * (b.x1 - b.x0) * 1.1, z: cz + (R() - 0.5) * (b.z1 - b.z0) * 1.1, y: 70 + R() * 70, ph: R() * 6.28, c }));
    const eM = new THREE.InstancedMesh(env, ctx.mat({ map: stripe, roughness: 0.6, side: THREE.DoubleSide }), list.length);
    const kM = new THREE.InstancedMesh(basket, ctx.mat({ color: 0x8a5a30, roughness: 1 }), list.length);
    list.forEach((p, k) => eM.setColorAt(k, col.set(p.c)));
    const m4 = new THREE.Matrix4();
    const upd = t => {
      list.forEach((p, k) => {
        m4.makeTranslation(p.x + Math.sin(t * 0.05 + p.ph) * 30, p.y + Math.sin(t * 0.4 + p.ph) * 2, p.z + Math.cos(t * 0.04 + p.ph) * 30);
        eM.setMatrixAt(k, m4); kM.setMatrixAt(k, m4);
      });
      eM.instanceMatrix.needsUpdate = true; kM.instanceMatrix.needsUpdate = true;
    };
    upd(0);
    eM.frustumCulled = false; kM.frustumCulled = false;
    ctx.group.add(eM, kM);
    ctx.onFrame(upd);
  }
}
