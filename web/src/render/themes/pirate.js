// 14회차 테마: pirate — 해적선 만
// 맑은 낮의 카리브해 해변. 파란 벽돌 노면, 통나무 판자 벽, 모래 땅, 야자수, 정박한 해적선(돛대·돛·해골 깃발),
// 대포·술통·보물상자, 넘실거리는 바다(물결 무늬가 흐르고 배가 흔들린다), 갈매기.
// 그림 전용 (주행 계산과 무관). 무늬는 전부 캔버스로 직접 그림, 무작위는 ctx.rand.

/** 파란 벽돌 노면 (u = 길 폭 전체, v = 10m 마다 1) : 가로 8칸 × 세로 16줄, 줄마다 반 칸씩 엇갈림 */
function roadTex(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#9fb0bd'; g.fillRect(0, 0, w, h);                  // 줄눈(회청색)
    const cw = w / 8, rh = h / 16;
    for (let r = 0; r < 16; r++) {
      const off = (r % 2) * cw / 2;
      for (let c = -1; c < 9; c++) {
        const hue = 205 + Math.floor(ctx.rand() * 16), sat = 55 + Math.floor(ctx.rand() * 18), l = 26 + Math.floor(ctx.rand() * 14);
        g.fillStyle = `hsl(${hue},${sat}%,${l}%)`;
        g.fillRect(c * cw + off + 1.5, r * rh + 1.5, cw - 3, rh - 3);
        if (ctx.rand() < 0.35) { g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(c * cw + off + 3, r * rh + 3, cw - 8, 2); }
      }
    }
  });
}

/** 통나무 판자 벽 (u = 벽 단면: 0~1/3 안쪽 면 아래→위, 1/3~2/3 윗면, 2/3~1 바깥, v = 4m 마다 1) */
function wallTex(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8a6a44'; g.fillRect(0, 0, w, h);
    const face = w / 3;
    // 안쪽 면: 가로로 누운 판자(길 방향으로 이어짐), 높이 방향으로 4줄
    const rows = 5, rw = face / rows;
    for (let k = 0; k < rows; k++) {
      for (let y = 0; y < h; y += 64) {
        const off = (k % 2) * 32 + ctx.rand() * 8;
        const l = 38 + Math.floor(ctx.rand() * 14);
        g.fillStyle = `hsl(28,${35 + Math.floor(ctx.rand() * 15)}%,${l}%)`;
        g.fillRect(k * rw + 1, y + off + 1, rw - 2, 62);
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(k * rw + 1, y + off + 1, 2, 62);
      }
    }
    // 흰 밧줄 띠 (벽 윗부분)
    const bx = face * 0.8;
    g.fillStyle = '#e8dcc0'; g.fillRect(bx, 0, face * 0.1, h);
    g.strokeStyle = '#a89870'; g.lineWidth = 2;
    for (let y = 0; y < h; y += 12) { g.beginPath(); g.moveTo(bx, y); g.lineTo(bx + face * 0.1, y + 8); g.stroke(); }
    // 윗면: 짙은 판자 머리
    g.fillStyle = '#5e432a'; g.fillRect(face, 0, face, h);
    g.fillStyle = 'rgba(255,230,180,0.15)'; for (let y = 0; y < h; y += 64) g.fillRect(face, y, face, 2);
    // 바깥
    g.fillStyle = '#7a5a38'; g.fillRect(face * 2, 0, face, h);
  });
}

/** 모래 땅 (u,v = 10m 마다 1): 흐린 알갱이 + 조개·잔돌 */
function sandTex(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#cfc4ae'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 900; k++) {
      const v = 205 + Math.floor(ctx.rand() * 40);
      g.fillStyle = `rgba(${v},${v - 10},${v - 36},0.22)`;
      g.fillRect(ctx.rand() * w, ctx.rand() * h, 1 + ctx.rand() * 3, 1 + ctx.rand() * 2);
    }
    for (let k = 0; k < 70; k++) {
      g.fillStyle = `rgba(140,115,80,${0.15 + ctx.rand() * 0.15})`;
      g.beginPath(); g.arc(ctx.rand() * w, ctx.rand() * h, 0.8 + ctx.rand() * 1.6, 0, 7); g.fill();
    }
    for (let k = 0; k < 5; k++) {   // 모래 결 (바람 무늬)
      g.strokeStyle = 'rgba(190,165,120,0.20)'; g.lineWidth = 2;
      const y = ctx.rand() * h; g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x / 22 + k) * 4);
      g.stroke();
    }
  });
}

/** 바다 물결: 옥색 바탕에 흰 물마루 줄 (이어 붙여도 이음매가 안 보이게 사인 주기를 맞춤) */
function seaTex(ctx, dark) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, dark ? '#1b8fb0' : '#27b5c9'); gr.addColorStop(1, dark ? '#2a9fbd' : '#3ac4d2');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.lineWidth = 2.2;
    for (let k = 0; k < 16; k++) {
      const y0 = (k + 0.5) * h / 16, ph = ctx.rand() * 6.28, amp = 4 + ctx.rand() * 4;
      g.strokeStyle = dark ? 'rgba(220,250,255,0.22)' : 'rgba(255,255,255,0.45)';
      g.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const y = y0 + Math.sin(x / w * Math.PI * 4 + ph) * amp;
        x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
    }
    for (let k = 0; k < 40; k++) { g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(ctx.rand() * w, ctx.rand() * h, 2 + ctx.rand() * 5, 1.5); }
  }, { repeat: [dark ? 60 : 90, dark ? 60 : 90] });
}

/** 해적 깃발: 검정 바탕에 하얀 해골과 엇갈린 뼈 */
function flagTex(ctx) {
  return ctx.canvasTex(128, 96, (g, w, h) => {
    g.fillStyle = '#16161c'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#f2efe6'; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(28, 62); g.lineTo(100, 86); g.moveTo(100, 62); g.lineTo(28, 86); g.stroke();
    g.fillStyle = '#f2efe6';
    g.beginPath(); g.arc(64, 38, 22, 0, 7); g.fill();
    g.fillRect(52, 50, 24, 16);
    g.fillStyle = '#16161c';
    g.beginPath(); g.arc(55, 36, 6, 0, 7); g.arc(73, 36, 6, 0, 7); g.fill();
    g.fillRect(62, 44, 4, 7);
    for (let x = 55; x <= 73; x += 6) g.fillRect(x, 56, 2, 9);
  });
}

/** 돛천: 누런 흰색, 세로 이음선, 기운 헝겊 */
function sailTex(ctx) {
  return ctx.canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#f0e6cc'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) { g.fillStyle = 'rgba(150,125,80,0.28)'; g.fillRect(x, 0, 1.5, h); }
    for (let k = 0; k < 90; k++) { g.fillStyle = 'rgba(170,140,90,0.10)'; g.fillRect(ctx.rand() * w, ctx.rand() * h, 6 + ctx.rand() * 18, 2); }
    g.fillStyle = '#c9b48a'; g.fillRect(20, 28, 26, 22);
    g.fillStyle = '#d8c7a0'; g.fillRect(80, 76, 24, 28);
    g.strokeStyle = 'rgba(90,70,40,0.5)'; g.lineWidth = 1; g.strokeRect(20, 28, 26, 22); g.strokeRect(80, 76, 24, 28);
  });
}

export const look = {
  road: 0xffffff,
  roadTex,
  roadRough: 0.8,
  line: 0xfffbea,
  runoffTex: sandTex,
  runoffColor: 0xcdb27a,
  wall: { color: 0xffffff, map: wallTex, roughness: 0.9, stripe: false },
  terrainTex: sandTex,
  trees: false,              // 기본 나무 대신 야자수를 직접
  city: false,
  far: [0x3c9a8e, 0x6bb0b4],
  banner: { bg: '#0f3f5c', fg: '#ffd36a' },
  // 실사(보통·높음 화질): 파란 칠을 한 실제 벽돌 노면, 실제 모래, 맑은 카리브해 낮 하늘 (나무는 테마가 직접 그린 야자수 그대로)
  real: {
    sky: 'kloofendal_43d_clear_puresky', exposure: 0.95,
    road: { tex: 'brick_pavement', scale: 2.4, tint: 0x5f8fe0, bright: 1.25, env: 1.0 },
    runoff: { tex: 'coast_sand_01', scale: 6 },
    terrain: { tex: 'coast_sand_01', scale: 10 },
  },
};

export function build(ctx) {
  const { THREE, T, rand, mergeGeometries } = ctx;
  const G = ctx.ground;
  const up = new THREE.Vector3(0, 1, 0);
  const m4 = new THREE.Matrix4(), qn = new THREE.Quaternion(), v3 = new THREE.Vector3(), sc = new THREE.Vector3(), eu = new THREE.Euler();

  /** 모양 조각: 색을 정점에 칠하고 변환을 적용 (합칠 때 같은 속성만 맞으면 된다) */
  const part = (geo, hex, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) => {
    let g = geo.index ? geo.toNonIndexed() : geo;
    const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    g.deleteAttribute('uv');
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scl)));
    return g;
  };
  const merge = list => { const g = mergeGeometries(list, false); g.computeBoundingSphere(); return g; };
  const inst = (geo, mat, list, shadow = true) => {
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    list.forEach((o, k) => {
      qn.setFromAxisAngle(up, o.yaw || 0);
      im.setMatrixAt(k, m4.compose(v3.set(o.x, o.y, o.z), qn, sc.set(o.sx ?? o.s ?? 1, o.sy ?? o.s ?? 1, o.sz ?? o.s ?? 1)));
    });
    im.count = list.length;
    im.castShadow = shadow && ctx.q.detail >= 1; im.receiveShadow = true;
    im.frustumCulled = false;
    ctx.group.add(im);
    return im;
  };
  const vcMat = (extra = {}) => ctx.mat({ vertexColors: true, roughness: 0.8, ...extra });

  // ── 바다 높이: 길에서 60~260m 떨어진 땅의 낮은 쪽 40% 가 물에 잠기게, 단 길 근처 모래밭은 늘 물 위 ──
  let minRoad = 1e9;
  for (let i = 0; i < T.n; i++) minRoad = Math.min(minRoad, T.y[i]);
  const samp = [];
  for (let i = 0; i < T.n; i += 8) for (const sd of [1, -1]) for (const o of [70, 120, 180, 240]) {
    const off = sd * (ctx.wallAt(i, sd) + o), x = T.x[i] + T.lx[i] * off, z = T.z[i] + T.lz[i] * off;
    if (ctx.clear(x, z, 40)) samp.push(G(x, z));
  }
  samp.sort((a, b) => a - b);
  let level = samp.length ? samp[Math.floor(samp.length * 0.42)] : minRoad - 3;
  level = Math.min(level, minRoad - 2.2);
  const wetAt = (x, z, d = 1.0) => G(x, z) < level - d;

  // ── 바다: 큰 물 평면 두 장(무늬가 서로 다른 방향으로 흐름) + 천천히 오르내림 ──
  const b = T.bounds, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, SZ = 9000;
  const sea1 = new THREE.Mesh(new THREE.PlaneGeometry(SZ, SZ), ctx.mat({ map: seaTex(ctx, false), color: 0xbfeaf2, transparent: true, opacity: 0.86, roughness: 0.6, metalness: 0.0, envMapIntensity: 0.25, depthWrite: false }));
  const sea2 = new THREE.Mesh(new THREE.PlaneGeometry(SZ, SZ), ctx.mat({ map: seaTex(ctx, true), color: 0xcdf3ff, transparent: true, opacity: 0.3, roughness: 0.6, metalness: 0.0, envMapIntensity: 0.2, depthWrite: false }));
  for (const s of [sea1, sea2]) { s.rotation.x = -Math.PI / 2; s.position.set(cx, level, cz); s.renderOrder = 1; ctx.group.add(s); }
  sea2.position.y = level + 0.06;
  const tx1 = sea1.material.map, tx2 = sea2.material.map;

  // ── 야자수 (줄기 + 잎 8장 + 코코넛 = 한 덩어리) ──
  const palmGeo = (() => {
    const list = [];
    let p = new THREE.Vector3(0, 0, 0), a = 0.04;
    const H = 7.5, nseg = 5;
    for (let k = 0; k < nseg; k++) {
      a += 0.07;
      const dir = new THREE.Vector3(Math.sin(a), Math.cos(a), 0), len = H / nseg;
      const r0 = 0.42 - k * 0.05, r1 = 0.42 - (k + 1) * 0.05;
      list.push(part(new THREE.CylinderGeometry(r1, r0, len * 1.05, 7), k % 2 ? 0x8b6a45 : 0x7a5a38, p.clone().addScaledVector(dir, len / 2).toArray(), [0, 0, -a]));
      p.addScaledVector(dir, len);
    }
    // 잎: 위로 솟았다 휘어 내려오는 가는 띠
    for (let f = 0; f < 8; f++) {
      const yaw = f / 8 * Math.PI * 2 + 0.3, S = 5, pos = [], idx = [];
      const lift = 1.4 + (f % 2) * 0.8;
      for (let j = 0; j <= S; j++) {
        const t = j / S, r = 4.4 * t, y = lift * Math.sin(t * 2.0) - 2.2 * t * t * (1.2);
        const wd = 0.75 * Math.sin(Math.PI * (0.12 + 0.88 * t)) + 0.02;
        for (const sd of [-1, 1]) pos.push(r, y - Math.abs(sd) * 0.0 + sd * 0.0, sd * wd);
      }
      for (let j = 0; j < S; j++) { const q = j * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      const green = [0x2f9a3c, 0x3aa845, 0x278a38][f % 3];
      list.push(part(g, green, [p.x, p.y, 0], [0, yaw, 0]));
    }
    for (let c = 0; c < 3; c++) list.push(part(new THREE.SphereGeometry(0.28, 6, 5), 0x4a3320, [p.x + Math.cos(c * 2.1) * 0.35, p.y - 0.35, Math.sin(c * 2.1) * 0.35]));
    return merge(list);
  })();
  const palmMat = vcMat({ side: THREE.DoubleSide });
  ctx.scatter({ geo: palmGeo, mat: palmMat, n: 230, from: 5, to: 75, scale: [0.9, 1.6], sink: 0.1, shadow: true,
    filter: (x, z) => G(x, z) > level + 0.7 });

  // ── 바위·산호색 돌덩이 (해안) ──
  ctx.scatter({ geo: new THREE.IcosahedronGeometry(1.3, 0), mat: ctx.mat({ color: 0xb8ab94, roughness: 0.95, flatShading: true }), n: 90, from: 6, to: 90, scale: [0.6, 2.0], sink: 0.4, shadow: true,
    filter: (x, z) => G(x, z) > level - 1.2 });

  // ── 술통(띠 두른 통) ──
  const barrelGeo = (() => {
    const pts = [[0.46, 0], [0.58, 0.3], [0.62, 0.6], [0.58, 0.9], [0.46, 1.2]].map(([r, y]) => new THREE.Vector2(r, y));
    const body = new THREE.LatheGeometry(pts, 10);
    const top = new THREE.CircleGeometry(0.46, 10); top.rotateX(-Math.PI / 2);
    return merge([part(body, 0x8a5a32), part(top, 0x6e4626, [0, 1.2, 0]),
      part(new THREE.TorusGeometry(0.58, 0.04, 4, 12), 0x3a3a40, [0, 0.3, 0], [Math.PI / 2, 0, 0]),
      part(new THREE.TorusGeometry(0.6, 0.04, 4, 12), 0x3a3a40, [0, 0.9, 0], [Math.PI / 2, 0, 0])]);
  })();
  const taken = [];
  ctx.scatter({ geo: barrelGeo, mat: vcMat(), n: 130, from: 4.5, to: 24, scale: [0.9, 1.25], shadow: true,
    filter: (x, z) => G(x, z) > level + 0.5 });

  // ── 보물상자(뚜껑 열린 상자 + 금화 더미) ──
  const chestGeo = merge([
    part(new THREE.BoxGeometry(1.7, 0.8, 1.05), 0x7a4a26, [0, 0.4, 0]),
    part(new THREE.BoxGeometry(1.76, 0.12, 1.1), 0x2f2f36, [0, 0.8, 0]),
    part(new THREE.BoxGeometry(0.16, 0.82, 1.12), 0xc9a02e, [-0.55, 0.4, 0]),
    part(new THREE.BoxGeometry(0.16, 0.82, 1.12), 0xc9a02e, [0.55, 0.4, 0]),
    part(new THREE.BoxGeometry(1.7, 0.1, 0.95), 0x7a4a26, [0, 1.15, -0.62], [-1.2, 0, 0]),       // 젖힌 뚜껑
    part(new THREE.IcosahedronGeometry(0.62, 1), 0xffd23f, [0, 0.85, 0], [0, 0, 0], [1.2, 0.5, 0.75]),
    part(new THREE.SphereGeometry(0.12, 5, 4), 0xff4a5a, [0.3, 1.1, 0.1]),
    part(new THREE.SphereGeometry(0.1, 5, 4), 0x3ad0ff, [-0.35, 1.08, 0.05]),
  ]);
  ctx.scatter({ geo: chestGeo, mat: vcMat({ emissive: 0x2a1c00, emissiveIntensity: 0.6 }), n: 26, from: 5, to: 22, scale: [0.9, 1.2], yaw: false, shadow: true,
    filter: (x, z) => G(x, z) > level + 0.5 });

  // ── 나무 상자 + 닻 ──
  ctx.scatter({ geo: new THREE.BoxGeometry(1.6, 1.3, 1.6).translate(0, 0.65, 0), mat: ctx.mat({ color: 0xa5794a, roughness: 0.9 }), n: 70, from: 5, to: 28, scale: [0.7, 1.3], shadow: true,
    filter: (x, z) => G(x, z) > level + 0.5 });

  // ── 대포: 길 양옆 바깥을 향해 늘어선다 ──
  const cannonGeo = merge([
    part(new THREE.CylinderGeometry(0.34, 0.5, 2.4, 10), 0x2c2f35, [0, 0.95, 0.1], [Math.PI / 2 - 0.08, 0, 0]),
    part(new THREE.SphereGeometry(0.52, 8, 6), 0x2c2f35, [0, 0.9, -1.1]),
    part(new THREE.BoxGeometry(1.2, 0.35, 2.0), 0x7a4a26, [0, 0.55, 0]),
    part(new THREE.CylinderGeometry(0.5, 0.5, 0.18, 10), 0x5b3a1e, [0.68, 0.5, 0.2], [0, 0, Math.PI / 2]),
    part(new THREE.CylinderGeometry(0.5, 0.5, 0.18, 10), 0x5b3a1e, [-0.68, 0.5, 0.2], [0, 0, Math.PI / 2]),
  ]);
  const cannons = [];
  const cannonAt = (seg, f, side) => {
    const i = ctx.segAt(seg, f);
    for (const dd of [0, 4]) {
      const off = side * (ctx.wallAt(i, side) + 6 + dd * 0), pp = ctx.pt(i + dd * 2, off);
      if (!ctx.clear(pp.x, pp.z, 3.5) || !(G(pp.x, pp.z) > level + 0.5)) continue;
      cannons.push({ x: pp.x, y: G(pp.x, pp.z), z: pp.z, yaw: pp.yaw + (side > 0 ? Math.PI / 2 : -Math.PI / 2), s: 1.15 });
    }
  };
  for (const [s, f, sd] of [[0, 0.25, 1], [0, 0.8, -1], [2, 0.5, 1], [5, 0.2, -1], [5, 0.7, 1], [7, 0.4, -1], [9, 0.2, 1], [9, 0.45, -1], [9, 0.8, 1], [11, 0.5, -1], [15, 0.4, 1], [17, 0.6, -1], [20, 0.5, 1], [22, 0.4, -1], [24, 0.2, 1], [24, 0.6, -1]]) cannonAt(s, f, sd);
  inst(cannonGeo, vcMat({ roughness: 0.55, metalness: 0.2 }), cannons);

  // ── 해적 깃발 기둥 (길 옆, 깃발은 길을 향해 흔들림) ──
  const flagPoleGeo = merge([part(new THREE.CylinderGeometry(0.13, 0.17, 9, 6), 0x5a3f26, [0, 4.5, 0]), part(new THREE.SphereGeometry(0.28, 6, 5), 0xd4a62e, [0, 9.1, 0])]);
  const flagGeo = new THREE.PlaneGeometry(3.2, 2.2, 6, 1); flagGeo.translate(1.7, 0, 0);
  const flagBase = Float32Array.from(flagGeo.attributes.position.array);
  const poles = [], flagsL = [];
  for (const [s, f, sd] of [[0, 0.1, 1], [0, 0.9, 1], [2, 0.9, -1], [6, 0.5, 1], [9, 0.5, -1], [10, 0.7, 1], [16, 0.7, -1], [20, 0.9, 1], [24, 0.8, 1]]) {
    const i = ctx.segAt(s, f), off = sd * (ctx.wallAt(i, sd) + 5), pp = ctx.pt(i, off);
    if (!ctx.clear(pp.x, pp.z, 3.5) || !(G(pp.x, pp.z) > level + 0.5)) continue;
    const gy = G(pp.x, pp.z);
    poles.push({ x: pp.x, y: gy, z: pp.z, yaw: 0 });
    flagsL.push({ x: pp.x, y: gy + 8.0, z: pp.z, yaw: pp.yaw + 0.5 });
  }
  inst(flagPoleGeo, vcMat({ roughness: 0.7 }), poles);
  const flagMat = ctx.mat({ map: flagTex(ctx), side: THREE.DoubleSide, roughness: 0.9 });
  const flagIM = inst(flagGeo, flagMat, flagsL, false);

  // ── 해적선: 옆에서 본 모양을 뽑아 만든 배(앞이 뾰족) + 돛대 3개 + 돛 6장 + 해골 깃발 ──
  const SL = 44, SH = 6.5, SB = 12;
  const hullGeo = (() => {
    const s = new THREE.Shape();
    s.moveTo(-SL * 0.44, 0); s.lineTo(SL * 0.28, 0);
    s.quadraticCurveTo(SL * 0.45, SH * 0.1, SL * 0.5, SH * 1.05);
    s.lineTo(SL * 0.5, SH * 1.1); s.lineTo(SL * 0.34, SH);
    s.lineTo(-SL * 0.34, SH); s.lineTo(-SL * 0.5, SH * 1.5); s.lineTo(-SL * 0.5, SH * 0.5);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: SB, bevelEnabled: true, bevelSize: 0.5, bevelThickness: 0.7, bevelSegments: 1, curveSegments: 8 });
    g.translate(0, 0, -SB / 2);
    const pa = g.attributes.position;
    for (let k = 0; k < pa.count; k++) {         // 아래·앞이 좁게
      const x = pa.getX(k), y = pa.getY(k);
      const bow = Math.min(1, Math.max(0, (x / SL - 0.05) / 0.45));
      pa.setZ(k, pa.getZ(k) * (0.55 + 0.45 * Math.min(1, y / SH)) * (1 - 0.8 * bow * bow));
    }
    g.computeVertexNormals();
    const L = [part(g, 0x5a3a22)];
    L.push(part(new THREE.BoxGeometry(SL * 0.66, 0.5, SB * 0.78), 0xb88f5a, [-SL * 0.02, SH + 0.15, 0]));            // 갑판
    L.push(part(new THREE.BoxGeometry(SL * 0.7, 0.45, SB * 0.98), 0xc9a02e, [0, SH * 0.62, 0]));                      // 금빛 띠
    L.push(part(new THREE.BoxGeometry(SL * 0.2, 4, SB * 0.7), 0x6e4a2a, [-SL * 0.38, SH + 2.3, 0]));                  // 선미 선실
    L.push(part(new THREE.BoxGeometry(SL * 0.2 + 0.6, 0.5, SB * 0.76), 0x3e2a18, [-SL * 0.38, SH + 4.5, 0]));
    for (let k = 0; k < 6; k++) for (const sd of [-1, 1]) {                                                           // 대포 구멍
      L.push(part(new THREE.BoxGeometry(1.5, 1.2, 0.5), 0x15141a, [-SL * 0.24 + k * 4.2, SH * 0.35, sd * SB * 0.5 * 0.98]));
    }
    for (const [mx, mh] of [[SL * 0.25, 27], [-SL * 0.02, 34], [-SL * 0.3, 22]]) {
      L.push(part(new THREE.CylinderGeometry(0.4, 0.55, mh, 8), 0x4a3320, [mx, SH + mh / 2, 0]));
      L.push(part(new THREE.CylinderGeometry(0.22, 0.22, 17, 6), 0x4a3320, [mx, SH + mh * 0.34 + 9, 0], [Math.PI / 2, 0, 0]));
      L.push(part(new THREE.CylinderGeometry(0.2, 0.2, 12, 6), 0x4a3320, [mx, SH + mh * 0.74 + 6, 0], [Math.PI / 2, 0, 0]));
    }
    L.push(part(new THREE.CylinderGeometry(0.3, 0.4, 16, 6), 0x4a3320, [SL * 0.55, SH + 3, 0], [0, 0, -1.2]));            // 이물 돛대(뱃머리 막대)
    L.push(part(new THREE.SphereGeometry(0.9, 8, 6), 0xffe9a0, [-SL * 0.5 - 0.3, SH + 3.6, 0]));                           // 선미 등불
    return merge(L);
  })();
  const sailGeo = (() => {
    const L = [];
    const mk = (x, y, w, h, bulge) => {
      const g = new THREE.PlaneGeometry(w, h, 8, 5);
      const pa = g.attributes.position;
      for (let k = 0; k < pa.count; k++) { const u = pa.getX(k) / (w / 2), v = pa.getY(k) / (h / 2); pa.setZ(k, bulge * (1 - u * u) * (1 - 0.4 * v * v)); }
      g.computeVertexNormals();
      g.rotateY(Math.PI / 2);
      g.translate(x, y, 0);
      const out = g.index ? g.toNonIndexed() : g;
      return out;
    };
    for (const [mx, mh] of [[SL * 0.25, 27], [-SL * 0.02, 34], [-SL * 0.3, 22]]) {
      L.push(mk(mx + 0.6, SH + mh * 0.34 + 9 - 4.7, 15, 9.2, 1.6));
      L.push(mk(mx + 0.6, SH + mh * 0.74 + 6 - 3.3, 11, 6.6, 1.2));
    }
    return merge(L);
  })();
  const jibGeo = (() => {   // 이물 삼각돛
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([SL * 0.55, SH + 3.4, 0, SL * 0.25, SH + 22, 0, SL * 0.25, SH + 3.4, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 1, 1, 0], 2));
    g.setIndex([0, 1, 2]); g.computeVertexNormals();
    return g.toNonIndexed();
  })();
  const sailMat = ctx.mat({ map: sailTex(ctx), side: THREE.DoubleSide, roughness: 0.9, emissive: 0x3a3426, emissiveIntensity: 0.6 });
  const shipFlagGeo = new THREE.PlaneGeometry(6, 4, 1, 1); shipFlagGeo.translate(3, 0, 0);

  // 배 놓을 자리: 물이 깊고(여러 점이 물) 길에서 충분히 먼 곳
  const ships = [];
  const wetFoot = (x, z, yaw, k) => {
    const fx = Math.sin(yaw) * SL * 0.55 * k, fz = Math.cos(yaw) * SL * 0.55 * k, sx = Math.cos(yaw) * SB * 0.8 * k, sz = -Math.sin(yaw) * SB * 0.8 * k;
    return [[0, 0], [fx, fz], [-fx, -fz], [sx, sz], [-sx, -sz]].every(([dx, dz]) => wetAt(x + dx, z + dz, 0.8));
  };
  const placeShip = (seg, frac, k, minD) => {
    const i0 = ctx.segAt(seg, frac);
    for (let di = 0; di < 400; di += 25) for (const sgn of [1, -1]) {
      const i = ctx.norm ? ctx.norm(i0 + sgn * di) : ((i0 + sgn * di) % T.n + T.n) % T.n;
      for (const sd of [1, -1]) for (let o = minD; o < minD + 400; o += 20) {
        const off = sd * (ctx.wallAt(i, sd) + o), x = T.x[i] + T.lx[i] * off, z = T.z[i] + T.lz[i] * off;
        const yaw = ctx.yawAt(i) + (rand() - 0.5) * 0.5;
        if (!ctx.clear(x, z, 34 * k) || !wetFoot(x, z, yaw, k)) continue;
        if (ships.some(s => Math.hypot(s.x - x, s.z - z) < 90)) continue;
        ships.push({ x, z, yaw, k, ph: rand() * 6.28 });
        return true;
      }
    }
    return false;
  };
  placeShip(0, 0.5, 1.0, 55); placeShip(12, 0.5, 0.8, 60); placeShip(21, 0.5, 0.9, 60); placeShip(5, 0.5, 0.7, 80);
  const shipMesh = (geo, mat) => { const im = new THREE.InstancedMesh(geo, mat, Math.max(1, ships.length)); im.count = ships.length; im.frustumCulled = false; im.castShadow = ctx.q.detail >= 1; ctx.group.add(im); return im; };
  const hullIM = shipMesh(hullGeo, vcMat({ roughness: 0.75 }));
  const sailIM = shipMesh(sailGeo, sailMat);
  const jibIM = shipMesh(jibGeo, sailMat);
  const sflagIM = shipMesh(shipFlagGeo, flagMat);
  const pennant = new THREE.Vector3();

  // ── 갈매기: 만 위를 빙글빙글 ──
  const gullGeo = (() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.5, -1.4, 0.35, 0, 0, 0, -0.5, 0, 0, 0.5, 0, 0, -0.5, 1.4, 0.35, 0], 3));
    g.computeVertexNormals(); return g;
  })();
  const NG = 12;
  const gullIM = new THREE.InstancedMesh(gullGeo, ctx.mat({ color: 0xffffff, side: THREE.DoubleSide, roughness: 1 }), NG);
  gullIM.frustumCulled = false; ctx.group.add(gullIM);
  const gulls = Array.from({ length: NG }, (_, k) => {
    const i = Math.floor(rand() * T.n);
    return { cx: T.x[i] + (rand() - 0.5) * 300, cz: T.z[i] + (rand() - 0.5) * 300, r: 25 + rand() * 50, sp: 0.15 + rand() * 0.15, ph: rand() * 6.28, h: 25 + rand() * 25, k };
  });

  // ── 움직임: 물결 흐름·오르내림, 배 흔들림, 깃발 펄럭임, 갈매기 ──
  const flagPos = flagGeo.attributes.position;
  ctx.onFrame(t => {
    tx1.offset.set(t * 0.004, t * 0.0025); tx2.offset.set(-t * 0.003, t * 0.0045);
    sea1.position.y = level + Math.sin(t * 0.7) * 0.10; sea2.position.y = level + 0.07 + Math.sin(t * 0.55 + 1) * 0.08;
    ships.forEach((s, k) => {
      const bob = Math.sin(t * 0.8 + s.ph) * 0.35, roll = Math.sin(t * 0.7 + s.ph) * 0.03, pitch = Math.sin(t * 0.55 + s.ph * 2) * 0.02;
      qn.setFromEuler(eu.set(roll, s.yaw, pitch, 'YXZ'));    // 길 방향 기준 흔들림
      eu.set(pitch, s.yaw, roll, 'YXZ'); qn.setFromEuler(eu);
      v3.set(s.x, level - 1.9 + bob, s.z);
      m4.compose(v3, qn, sc.set(s.k, s.k, s.k));
      hullIM.setMatrixAt(k, m4); sailIM.setMatrixAt(k, m4); jibIM.setMatrixAt(k, m4);
      // 돛대 꼭대기 깃발
      pennant.set(-SL * 0.02, SH + 34 + 0.5, 0).applyMatrix4(m4);
      const q2 = new THREE.Quaternion().setFromAxisAngle(up, s.yaw + Math.PI + Math.sin(t * 1.3 + s.ph) * 0.3);
      sflagIM.setMatrixAt(k, m4.compose(pennant, q2, sc.set(s.k * 0.9, s.k * 0.9, s.k * 0.9)));
    });
    for (const im of [hullIM, sailIM, jibIM, sflagIM]) im.instanceMatrix.needsUpdate = true;
    // 길 옆 깃발: 가로 방향으로 물결
    for (let j = 0; j < flagPos.count; j++) flagPos.setZ(j, Math.sin(t * 3 + flagBase[j * 3] * 2.2) * 0.25 * (flagBase[j * 3] / 3.4));
    flagPos.needsUpdate = true;
    // 갈매기
    gulls.forEach((g, k) => {
      const a = t * g.sp + g.ph;
      v3.set(g.cx + Math.cos(a) * g.r, g.h + Math.sin(t * 0.5 + g.ph) * 3, g.cz + Math.sin(a) * g.r);
      qn.setFromEuler(eu.set(0, -a, Math.sin(t * 2 + g.ph) * 0.3, 'YXZ'));
      gullIM.setMatrixAt(k, m4.compose(v3, qn, sc.set(1.3, 1.3 + Math.sin(t * 6 + g.ph) * 0.6, 1.3)));
    });
    gullIM.instanceMatrix.needsUpdate = true;
  });
  void taken;
  console.log(`[pirate] 바다높이 ${level.toFixed(1)} 길최저 ${minRoad.toFixed(1)} 배 ${ships.length}척 대포 ${cannons.length} 깃발 ${poles.length}`);
}
