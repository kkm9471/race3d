// 14회차 테마: mansion — 달빛 대저택
// 보름달 밤. 상아색 대리석 노면, 보라 돌벽, 고딕 저택(뾰족 지붕·탑·불 켜진 창), 복도 구간 위에 저택 날개채(지붕·창),
// 복도 안은 붉은 벽지·나무 징두리·샹들리에, 정원은 철창 울타리·산울타리·가로등·촛대·편백나무, 박쥐.
// 그림 전용 (주행 계산과 무관). 무늬는 전부 캔버스로 직접 그림, 무작위는 ctx.rand.

import { applyTexSet, getTex } from '../assets.js';
import { getTreeSet, makeTreeMesh } from '../trees.js';

/** 대리석 바닥 (u = 길 폭, v = 10m 마다 1): 가로 4칸 × 세로 8줄 체크무늬 + 금빛 줄눈 + 결 */
function roadTex(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    const cw = w / 4, rh = h / 8;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) {
      const dark = (r + c) % 2;
      g.fillStyle = dark ? '#b9b2c4' : '#efe9dc'; g.fillRect(c * cw, r * rh, cw, rh);
      for (let k = 0; k < 3; k++) {         // 대리석 결
        g.strokeStyle = dark ? 'rgba(90,80,120,0.25)' : 'rgba(140,120,100,0.22)'; g.lineWidth = 1.2;
        g.beginPath(); const y0 = r * rh + ctx.rand() * rh, x0 = c * cw + ctx.rand() * cw;
        g.moveTo(x0, y0); g.bezierCurveTo(x0 + 10, y0 + 6, x0 + 18, y0 - 6, x0 + 28 + ctx.rand() * 14, y0 + ctx.rand() * 10 - 5); g.stroke();
      }
    }
    g.strokeStyle = '#b8923a'; g.lineWidth = 2;
    for (let c = 0; c <= 4; c++) { g.beginPath(); g.moveTo(c * cw, 0); g.lineTo(c * cw, h); g.stroke(); }
    for (let r = 0; r <= 8; r++) { g.beginPath(); g.moveTo(0, r * rh); g.lineTo(w, r * rh); g.stroke(); }
  });
}

/** 돌벽 (u = 벽 단면 0~1/3 안쪽 면, 1/3~2/3 윗면, 2/3~1 바깥, v = 4m 마다 1) */
function wallTex(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#4b4560'; g.fillRect(0, 0, w, h);
    const face = w / 3;
    for (let x = 0; x < face; x += 14) {
      const off = (Math.floor(x / 14) % 2) * 32;
      for (let y = -64; y < h; y += 64) {
        const l = 30 + Math.floor(ctx.rand() * 9);
        g.fillStyle = `hsl(262,18%,${l}%)`; g.fillRect(x + 1, y + off + 1, 12, 62);
      }
    }
    g.fillStyle = '#d7b04a'; g.fillRect(face * 0.78, 0, face * 0.07, h);        // 금빛 띠
    g.fillStyle = '#6d6585'; g.fillRect(face, 0, face, h);                       // 갓돌
    g.fillStyle = 'rgba(255,255,255,0.12)'; for (let y = 0; y < h; y += 64) g.fillRect(face, y, face, 2);
    g.fillStyle = '#3d3852'; g.fillRect(face * 2, 0, face, h);
  });
}

/** 정원 잔디 (u,v = 10m 마다 1): 밝은 바탕 — 땅의 회색 정점색이 곱해져 어두운 달밤 잔디가 된다 */
function lawnTex(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#76b27a'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 1500; k++) {
      const l = 40 + Math.floor(ctx.rand() * 30);
      g.fillStyle = `hsla(${110 + Math.floor(ctx.rand() * 30)},45%,${l}%,0.3)`;
      g.fillRect(ctx.rand() * w, ctx.rand() * h, 1.5, 3 + ctx.rand() * 5);
    }
    for (let k = 0; k < 30; k++) {          // 낙엽
      g.fillStyle = `rgba(150,110,60,${0.2 + ctx.rand() * 0.2})`;
      g.beginPath(); g.ellipse(ctx.rand() * w, ctx.rand() * h, 2.5, 1.4, ctx.rand() * 3, 0, 7); g.fill();
    }
  });
}

/** 복도 안쪽 (u = 둘레 전체 = 한 번, v = 6m 마다 1): 양끝(0~9%·91~100%) = 옆 벽(아래→위), 가운데 = 천장 */
function corridorTex(ctx) {
  return ctx.canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#e4d6b8'; g.fillRect(0, 0, w, h);                        // 천장 회반죽
    const W = 46;
    const wall = (flip) => {
      const X = x => (flip ? w - x : x);
      const rect = (x0, x1, col) => { g.fillStyle = col; g.fillRect(Math.min(X(x0), X(x1)), 0, Math.abs(x1 - x0), h); };
      rect(0, 20, '#4a2a1a');                                               // 나무 징두리
      g.fillStyle = '#6a3e26'; for (let y = 0; y < h; y += 64) { const x0 = Math.min(X(2), X(18)); g.fillRect(x0, y + 6, 16, 52); }
      rect(20, 24, '#d7b04a');                                              // 금빛 몰딩
      rect(24, W, '#7c1626');                                               // 붉은 벽지
      g.fillStyle = '#a8283c';                                              // 다마스크 무늬
      for (let y = 16; y < h; y += 64) for (let x = 29; x < W; x += 14) { g.beginPath(); g.ellipse(X(x), y, 3, 7, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(X(x), y + 32, 3, 7, 0, 0, 7); g.fill(); }
      g.fillStyle = '#d7b04a'; for (let y = 0; y < h; y += 64) g.fillRect(Math.min(X(W - 3), X(W)), y + 30, 3, 4);
    };
    wall(false); wall(true);
    g.strokeStyle = '#b8923a'; g.lineWidth = 3;                              // 천장 금빛 장식 띠
    for (const x of [70, 150, 256, 362, 442]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    g.fillStyle = 'rgba(120,90,50,0.35)'; for (let y = 0; y < h; y += 64) g.fillRect(48, y, w - 96, 2);
  }, { repeat: [1 / 3, 1] });
}

/** 저택 외벽 (10m × 10m 한 장): 돌 + 고딕 창 2개(하나는 불 켜짐·하나는 꺼짐), lit=true 면 불 켜진 창만 그린다(발광 지도) */
function facadeTex(ctx, lit) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    if (!lit) {
      g.fillStyle = '#7d7592'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 32) {
        const o = (y / 16) % 2 ? 16 : 0, l = 46 + Math.floor(ctx.rand() * 10);
        g.fillStyle = `hsl(255,14%,${l}%)`; g.fillRect(x + o + 1, y + 1, 30, 14);
      }
      g.fillStyle = '#4a4360'; g.fillRect(0, h - 22, w, 22);                // 아랫단
      g.fillStyle = '#5c5475'; g.fillRect(0, 12, w, 5);                       // 윗 띠
    } else { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); }
    const win = (cx, on) => {
      const x0 = cx - 24, x1 = cx + 24, yb = 190, yt = 92, apex = 62;
      g.beginPath(); g.moveTo(x0, yb); g.lineTo(x0, yt); g.quadraticCurveTo(x0, apex + 6, cx, apex); g.quadraticCurveTo(x1, apex + 6, x1, yt); g.lineTo(x1, yb); g.closePath();
      if (lit) {
        if (!on) return;
        const gr = g.createLinearGradient(0, apex, 0, yb); gr.addColorStop(0, '#ffe9a8'); gr.addColorStop(1, '#ffb347');
        g.fillStyle = gr; g.fill();
        g.strokeStyle = '#3a2a10'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(cx, apex); g.lineTo(cx, yb); g.moveTo(x0, 128); g.lineTo(x1, 128); g.stroke();
      } else {
        g.fillStyle = on ? '#2b2438' : '#1b1726'; g.fill();
        g.strokeStyle = '#34304a'; g.lineWidth = 6; g.stroke();
        g.fillStyle = '#34304a'; g.fillRect(cx - 32, yb, 64, 8);
      }
    };
    win(64, true); win(192, false);
  });
}

export const look = {
  road: 0xffffff,
  roadTex,
  roadRough: 0.45,
  line: 0xffeeb0,
  wall: { color: 0xffffff, map: wallTex, roughness: 0.85, stripe: false },
  terrainTex: lawnTex,
  trees: false,
  city: false,
  far: [0x14113a, 0x1c1950],
  banner: { bg: '#2a0f2e', fg: '#f2c85a' },
  tunnel: { color: 0xffffff, map: corridorTex, light: 0xffc890, emissive: 0x4a1a14, portal: 0x3c3350 },
  // 실사(15회차): 밤은 그대로(코드 밤하늘) + 실제 대리석·돌담·잔디, 정원에 실사 활엽수 (보통·높음 화질)
  real: {
    road: { tex: 'marble_01', scale: 3, tint: 0xe2e6ff, bright: 1.3, env: 1.0, rough: 0.7 },
    runoff: { tex: 'leafy_grass', scale: 3, tint: 0x6f9a74 },
    terrain: { tex: 'leafy_grass', scale: 5, tint: 0x5a8466 },
    wall: { tex: 'rock_wall_08', scale: 3, tint: 0xb8bedc, bright: 1.5 },
    facade: { tex: 'rock_wall_08', scale: 3, tint: 0xb4bad8, bright: 1.6 },
    trees: { broad: ['island_tree_01', 'island_tree_02'], con: ['island_tree_02'], h: [8, 14], n: 1, tint: 0x9cbcae },
  },
};

export function build(ctx) {
  const { THREE, T, rand, mergeGeometries } = ctx;
  const G = ctx.ground;
  const up = new THREE.Vector3(0, 1, 0);
  const m4 = new THREE.Matrix4(), qn = new THREE.Quaternion(), v3 = new THREE.Vector3(), sc = new THREE.Vector3(), eu = new THREE.Euler();

  // ── 조각 도구 ──
  /** 정점 색 조각 (uv 없음) */
  const part = (geo, hex, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    g.deleteAttribute('uv');
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scl)));
    return g;
  };
  /** 외벽 질감 조각 (정점 색 없음, uv 는 미터/10 로 맞춘다) */
  const facePart = (geo, pos = [0, 0, 0], rot = [0, 0, 0]) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    g.deleteAttribute('color');
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(1, 1, 1)));
    return g;
  };
  const merge = list => { const g = mergeGeometries(list, false); g.computeBoundingSphere(); return g; };
  const boxF = (w, h, d) => {      // 바닥이 y=0 인 상자, 면마다 미터 단위 uv
    const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0);
    const uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / 10, uv.getY(i) * dims[f][1] / 10); }
    return g;
  };
  const cylF = (r, h, seg = 12) => {
    const g = new THREE.CylinderGeometry(r, r, h, seg, 1, false); g.translate(0, h / 2, 0);
    const uv = g.attributes.uv, cir = 2 * Math.PI * r;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * cir / 10, uv.getY(i) * h / 10);
    return g;
  };
  const gableG = (w, d, h) => {    // 박공지붕 (용마루가 x 방향)
    const hw = w / 2, hd = d / 2;
    const p = [-hw, 0, -hd, hw, 0, -hd, hw, h, 0, -hw, 0, -hd, hw, h, 0, -hw, h, 0,
      hw, 0, hd, -hw, 0, hd, -hw, h, 0, hw, 0, hd, -hw, h, 0, hw, h, 0,
      -hw, 0, -hd, -hw, h, 0, -hw, 0, hd, hw, 0, hd, hw, h, 0, hw, 0, -hd];
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals(); return g;
  };
  const inst = (geo, mat, list, shadow = false) => {
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
  const facadeMat = ctx.mat({ map: facadeTex(ctx, false), emissiveMap: facadeTex(ctx, true), emissive: 0xffffff, emissiveIntensity: 1.5, roughness: 0.85, side: THREE.DoubleSide });
  // 실사: 외벽 무늬는 실제 돌로 바꾸고, 불 켜진 창은 발광 무늬가 그대로 얹힌다
  if (ctx.q.detail >= 1 && getTex(look.real.facade.tex)) { applyTexSet(facadeMat, look.real.facade, [10, 10]); facadeMat.side = THREE.DoubleSide; }
  const roofMat = vcMat({ roughness: 0.55, metalness: 0.15, side: THREE.DoubleSide });
  const glowMat = ctx.mat({ color: new THREE.Color(0xffd890).multiplyScalar(2.2) }, 'basic');
  const SLATE = 0x3a3f66, SLATE2 = 0x4a3f6e;

  // ── 복도 구간 위의 날개채: 터널이 있는 구간을 감싸는 저택 외벽 + 뾰족 지붕 ──
  {
    const runs = [];
    let s = -1;
    for (let i = 0; i <= T.n; i++) { const on = i < T.n && T.tunnel[i]; if (on && s < 0) s = i; if (!on && s >= 0) { runs.push([s, i - 1]); s = -1; } }
    const wallP = [], wallI = [], roofP = [], roofI = [];
    const wallUV = [];
    const EAVE = 8.6, RIDGE = 13.6, BASE = -0.9, PAD = 2.6;
    let wv = 0, rv = 0;
    for (const [a, b] of runs) {
      let sAcc = 0;
      const w0 = wv, r0 = rv;
      for (let i = a; i <= b; i++) {
        const L = T.wallL[i] + PAD, R = T.wallR[i] + PAD, y = T.y[i];
        const cc = (L - R) / 2;
        const P = (d, hy) => [T.x[i] + T.lx[i] * d, y + hy, T.z[i] + T.lz[i] * d];
        // 벽 4점(왼 아래·왼 처마·오른 처마·오른 아래), 지붕 3점(왼 처마·용마루·오른 처마)
        for (const pt of [P(L, BASE), P(L, EAVE), P(-R, EAVE), P(-R, BASE)]) wallP.push(...pt);
        wallUV.push(sAcc / 10, 0, sAcc / 10, (EAVE - BASE) / 10, sAcc / 10, (EAVE - BASE) / 10, sAcc / 10, 0);
        for (const pt of [P(L + 0.5, EAVE - 0.3), P(cc, RIDGE), P(-R - 0.5, EAVE - 0.3)]) roofP.push(...pt);
        sAcc += T.ds;
        wv += 4; rv += 3;
        if (i > a) {
          const q = w0 + (i - a - 1) * 4, q2 = q + 4;
          wallI.push(q, q + 1, q2, q + 1, q2 + 1, q2, q + 2, q + 3, q2 + 2, q + 3, q2 + 3, q2 + 2);
          const u = r0 + (i - a - 1) * 3, u2 = u + 3;
          roofI.push(u, u + 1, u2, u + 1, u2 + 1, u2, u + 1, u + 2, u2 + 1, u + 2, u2 + 2, u2 + 1);
        }
      }
    }
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(wallP, 3));
    wg.setAttribute('uv', new THREE.Float32BufferAttribute(wallUV, 2));
    wg.setIndex(wallI);
    const wgn = wg.toNonIndexed(); wgn.computeVertexNormals();
    const caps = [];
    for (const [a, b] of runs) for (const [i, dir] of [[a, -1], [b, 1]]) {
      const L = T.wallL[i] + PAD, R = T.wallR[i] + PAD, cc = (L - R) / 2;
      const sh = new THREE.Shape();
      sh.moveTo(-R, BASE); sh.lineTo(L, BASE); sh.lineTo(L, EAVE); sh.lineTo(cc, RIDGE); sh.lineTo(-R, EAVE); sh.closePath();
      const hole = new THREE.Path(); const hl = T.wallL[i] + 0.2, hr = T.wallR[i] + 0.2;
      hole.moveTo(-hr, -0.3); hole.lineTo(-hr, 8.4); hole.lineTo(hl, 8.4); hole.lineTo(hl, -0.3); hole.closePath();
      sh.holes.push(hole);
      const g = new THREE.ShapeGeometry(sh).toNonIndexed();
      const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) / 10, (uv.getY(k) - BASE) / 10);
      g.rotateY(Math.atan2(T.tx[i], T.tz[i]) + (dir < 0 ? 0 : 0));
      g.translate(T.x[i] + T.tx[i] * dir * 0.1, T.y[i], T.z[i] + T.tz[i] * dir * 0.1);
      caps.push(g);
    }
    // ShapeGeometry 의 x 는 길 왼쪽(+)이 아니라 오른쪽이라 방향이 뒤집힌다 → 위에서 rotateY 한 뒤 x 를 맞추기 위해 좌우 반전
    caps.forEach(g => { g.deleteAttribute('normal'); g.computeVertexNormals(); });
    const wingFacade = merge([wgn, ...caps]);
    const wingMesh = new THREE.Mesh(wingFacade, facadeMat); wingMesh.castShadow = false; wingMesh.receiveShadow = true; wingMesh.frustumCulled = false; ctx.group.add(wingMesh);
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(roofP, 3)); rg.setIndex(roofI);
    const rgn = rg.toNonIndexed(); rgn.computeVertexNormals();
    const c = new THREE.Color(SLATE), n = rgn.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    rgn.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const roofMesh = new THREE.Mesh(rgn, roofMat); roofMesh.castShadow = false; roofMesh.receiveShadow = true; roofMesh.frustumCulled = false; ctx.group.add(roofMesh);
    // 지붕 위 굴뚝·뾰족 장식
    const chim = [];
    for (const [a, b] of runs) for (let i = a + 14; i < b - 6; i += 36) {
      const cc = (T.wallL[i] - T.wallR[i]) / 2, x = T.x[i] + T.lx[i] * cc, z = T.z[i] + T.lz[i] * cc;
      chim.push({ x: x + T.lx[i] * 1.5, y: T.y[i] + 11.2, z: z + T.lz[i] * 1.5, yaw: 0 });
    }
    inst(merge([facePart(boxF(1.8, 4.2, 1.8)), facePart(boxF(2.4, 0.5, 2.4), [0, 4.2, 0])]), facadeMat, chim, true);
  }

  // ── 큰 저택(랜드마크): 길과 가장 멀리 떨어진 빈 터에 ──
  const buildings = [];
  const spotFor = (minMargin, avoid, nearIdx) => {
    let best = null;
    const b = T.bounds;
    for (let x = b.x0 + 40; x < b.x1 - 40; x += 20) for (let z = b.z0 + 40; z < b.z1 - 40; z += 20) {
      if (!ctx.clear(x, z, minMargin)) continue;
      if (avoid.some(a => Math.hypot(a.x - x, a.z - z) < a.r)) continue;
      const d = Math.hypot(T.x[nearIdx] - x, T.z[nearIdx] - z);
      if (!best || d < best.d) best = { x, z, d };
    }
    return best;
  };
  const faceIdx = (x, z) => { let bi = 0, bd = 1e18; for (let i = 0; i < T.n; i += 3) { const d = (T.x[i] - x) ** 2 + (T.z[i] - z) ** 2; if (d < bd) { bd = d; bi = i; } } return bi; };
  const facadeList = [], roofList = [], glowList = [];
  /** 저택 한 채 (로컬: x = 정면 폭, z = 깊이, +z 가 길 쪽) */
  const manor = (cx, cz, k) => {
    const j = faceIdx(cx, cz), yaw = Math.atan2(T.x[j] - cx, T.z[j] - cz);
    const gy = G(cx, cz) - 0.4;
    const M = new THREE.Matrix4().compose(new THREE.Vector3(cx, gy, cz), new THREE.Quaternion().setFromAxisAngle(up, yaw), new THREE.Vector3(k, k, k));
    const F = (g, x = 0, y = 0, z = 0) => { g.translate(x, y, z); g.applyMatrix4(M); facadeList.push(g); };
    const R = (g, hex, x = 0, y = 0, z = 0) => { const p = part(g, hex, [x, y, z]); p.applyMatrix4(M); roofList.push(p); };
    const Gl = (g, x = 0, y = 0, z = 0) => { const p = part(g, 0xffffff, [x, y, z]); p.applyMatrix4(M); glowList.push(p); };
    // 본채·날개채
    F(boxF(46, 16, 24)); R(gableG(46 + 3, 24 + 3, 11), SLATE, 0, 16, 0);
    for (const sx of [-1, 1]) {
      F(boxF(26, 13, 24), sx * 36, 0, 3); R(gableG(24 + 3, 26 + 3, 9), SLATE2, sx * 36, 13, 3);
      R(gableG(26, 18, 9), SLATE, sx * 36, 13, 3);   // 가로 박공
      F(boxF(6, 9, 6), sx * 36, 13, 3);
    }
    // 중앙 현관탑
    F(boxF(13, 36, 13), 0, 0, 10);
    const cone4 = new THREE.ConeGeometry(10.5, 18, 4); cone4.rotateY(Math.PI / 4); R(cone4, 0x2f3358, 0, 36 + 9, 10);
    R(new THREE.ConeGeometry(0.4, 6, 6), 0xd7b04a, 0, 36 + 18 + 3, 10);
    // 모서리 원형 탑
    for (const [tx, tz, h] of [[-24, -10, 24], [24, -10, 24], [-24, 13, 22], [24, 13, 22], [-50, 14, 17], [50, 14, 17]]) {
      F(cylF(4.2, h, 14), tx, 0, tz);
      R(new THREE.ConeGeometry(5.4, 12, 14), 0x2f3358, tx, h + 6, tz);
    }
    // 정문: 따뜻한 빛, 계단
    Gl(new THREE.BoxGeometry(4.2, 7, 0.6), 0, 3.5, 16.6);
    Gl(new THREE.BoxGeometry(1.2, 1.2, 1.2), -4.5, 6, 17); Gl(new THREE.BoxGeometry(1.2, 1.2, 1.2), 4.5, 6, 17);
    R(new THREE.BoxGeometry(12, 0.6, 5), 0x6a6486, 0, 0.3, 18.6);
    // 정면 큰 창 줄(불 켜진 장식 창)
    for (const sx of [-1, 1]) for (let r = 0; r < 2; r++) Gl(new THREE.BoxGeometry(2.4, 3.6, 0.3), sx * (12 + r * 6.5), 5 + r * 0.3, 12.2);
    buildings.push({ x: cx, z: cz, r: 55 * k });
  };
  {
    const s1 = spotFor(66, [], 0) || spotFor(56, [], 0) || spotFor(46, [], 0);
    if (s1) manor(s1.x, s1.z, 1.0);
    const mid = Math.floor(T.n * 0.55);
    const s2 = spotFor(44, buildings.map(b => ({ x: b.x, z: b.z, r: b.r + 70 })), mid) || spotFor(36, buildings.map(b => ({ x: b.x, z: b.z, r: b.r + 60 })), mid);
    if (s2) manor(s2.x, s2.z, 0.5);
  }
  if (facadeList.length) {
    const fm = new THREE.Mesh(merge(facadeList), facadeMat); fm.castShadow = ctx.q.detail >= 1; fm.receiveShadow = true; fm.frustumCulled = false; ctx.group.add(fm);
    const rm = new THREE.Mesh(merge(roofList), roofMat); rm.castShadow = ctx.q.detail >= 1; rm.frustumCulled = false; ctx.group.add(rm);
    const gm = new THREE.Mesh(merge(glowList.map(g => { g.deleteAttribute('color'); return g; })), glowMat); gm.frustumCulled = false; ctx.group.add(gm);
  }

  // ── 바깥(정원) 길가 위치 모으기: 터널 근처·다른 길 근처는 뺀다 ──
  const nearTunnel = i => { for (let k = -7; k <= 7; k++) if (T.tunnel[(i + k + T.n) % T.n]) return true; return false; };
  const bldClear = (x, z, pad = 6) => buildings.every(b => Math.hypot(b.x - x, b.z - z) > b.r + pad);
  const edge = (i, sd, o) => {
    const off = sd * (ctx.wallAt(i, sd) + o);
    return { x: T.x[i] + T.lx[i] * off, z: T.z[i] + T.lz[i] * off, yaw: Math.atan2(-T.tz[i], T.tx[i]) };
  };

  // ── 철창 울타리 (6m 판) ──
  const fenceG = (() => {
    const L = [part(new THREE.BoxGeometry(6.2, 0.18, 0.16), 0x24222e, [0, 1.5, 0]), part(new THREE.BoxGeometry(6.2, 0.18, 0.16), 0x24222e, [0, 0.45, 0])];
    for (let k = 0; k < 6; k++) {
      const x = -2.6 + k * 1.04;
      L.push(part(new THREE.BoxGeometry(0.1, 2.0, 0.1), 0x2a2834, [x, 1.0, 0]));
      L.push(part(new THREE.ConeGeometry(0.12, 0.4, 4), 0xd7b04a, [x, 2.2, 0]));
    }
    L.push(part(new THREE.BoxGeometry(0.28, 2.5, 0.28), 0x3a3748, [-3.1, 1.25, 0]), part(new THREE.SphereGeometry(0.22, 6, 5), 0xd7b04a, [-3.1, 2.65, 0]));
    return merge(L);
  })();
  const fences = [], hedges = [], lamps = [];
  for (let i = 0; i < T.n; i += 3) {
    if (nearTunnel(i)) continue;
    for (const sd of [1, -1]) {
      const f = edge(i, sd, 3.4);
      if (ctx.clear(f.x, f.z, 2.4) && bldClear(f.x, f.z)) fences.push({ x: f.x, y: G(f.x, f.z), z: f.z, yaw: f.yaw });
      const h = edge(i, sd, 7.4);
      if (ctx.clear(h.x, h.z, 6.4) && bldClear(h.x, h.z)) hedges.push({ x: h.x, y: G(h.x, h.z) - 0.1, z: h.z, yaw: h.yaw, sx: 1 + rand() * 0.15, sy: 0.9 + rand() * 0.5, sz: 1 });
    }
  }
  inst(fenceG, vcMat({ roughness: 0.5, metalness: 0.5 }), fences);
  const hedgeG = (() => {
    const g = new THREE.BoxGeometry(6.4, 2.2, 2.4, 3, 2, 1);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const x = p.getX(k), y = p.getY(k), z = p.getZ(k); const f = 1 - 0.18 * Math.abs(y / 1.1) ** 2; p.setXYZ(k, x, y, z * f + Math.sin(x * 2.1 + y * 3) * 0.12); }
    g.translate(0, 1.1, 0); g.computeVertexNormals();
    return part(g, 0x2c6a3c);
  })();
  inst(hedgeG, vcMat({ roughness: 0.95 }), hedges, true);

  // ── 가로등: 철 기둥 + 따뜻한 등 (빛은 발광 재질) ──
  for (let i = 8; i < T.n; i += 22) {
    if (nearTunnel(i)) continue;
    const sd = ((i / 22) | 0) % 2 ? 1 : -1, p = edge(i, sd, 1.9);
    if (ctx.clear(p.x, p.z, 1.2) && bldClear(p.x, p.z, 2)) lamps.push({ x: p.x, y: G(p.x, p.z), z: p.z, yaw: 0 });
  }
  inst(merge([part(new THREE.CylinderGeometry(0.14, 0.2, 5.2, 6), 0x24222e, [0, 2.6, 0]), part(new THREE.CylinderGeometry(0.5, 0.2, 0.5, 6), 0x24222e, [0, 5.2, 0]),
    part(new THREE.ConeGeometry(0.75, 0.6, 6), 0x24222e, [0, 6.75, 0])]), vcMat({ metalness: 0.4 }), lamps);
  inst(new THREE.SphereGeometry(0.5, 8, 6).translate(0, 5.95, 0), ctx.mat({ color: new THREE.Color(0xffd48a).multiplyScalar(2.6) }, 'basic'), lamps);

  // ── 촛대(정원): 키 큰 금 촛대와 불꽃 ──
  const cand = [];
  for (let t = 0, tries = 0; cand.length < 46 && tries < 900; tries++) {
    const i = Math.floor(rand() * T.n), sd = rand() < 0.5 ? 1 : -1;
    if (nearTunnel(i)) continue;
    const p = edge(i, sd, 11 + rand() * 20);
    if (ctx.clear(p.x, p.z, 8) && bldClear(p.x, p.z)) cand.push({ x: p.x, y: G(p.x, p.z), z: p.z, yaw: 0, s: 0.9 + rand() * 0.5 });
    void t;
  }
  inst(merge([part(new THREE.CylinderGeometry(0.15, 0.3, 3.4, 6), 0x9a7a2c, [0, 1.7, 0]), part(new THREE.CylinderGeometry(0.5, 0.18, 0.4, 8), 0x9a7a2c, [0, 3.6, 0]),
    part(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 5), 0xf0e6c8, [0, 4.1, 0]), part(new THREE.CylinderGeometry(0.4, 0.5, 0.2, 8), 0x9a7a2c, [0, 0.1, 0])]),
    vcMat({ metalness: 0.5, roughness: 0.4 }), cand);
  inst(new THREE.SphereGeometry(0.2, 6, 5).scale(1, 1.8, 1).translate(0, 4.7, 0), ctx.mat({ color: new THREE.Color(0xffa83a).multiplyScalar(3) }, 'basic'), cand);

  // ── 편백나무 (어두운 침엽수) ──
  const cypress = merge([part(new THREE.CylinderGeometry(0.3, 0.45, 2, 6), 0x3a2a20, [0, 1, 0]), part(new THREE.ConeGeometry(2.3, 8.5, 7), 0x1d4a34, [0, 6, 0]), part(new THREE.ConeGeometry(1.6, 5.5, 7), 0x22573d, [0, 9.6, 0])]);
  ctx.scatter({ geo: cypress, mat: vcMat({ roughness: 0.9 }), n: 190, from: 10, to: 110, scale: [0.9, 1.7], sink: 0.2, shadow: true, filter: (x, z) => bldClear(x, z, 4) });

  // ── 실사 활엽수(사진판): 산울타리 바깥쪽에 드문드문 (보통·높음 화질, 미리 받아 둔 경우만) ──
  {
    const sets = (look.real.trees.broad || []).map(getTreeSet).filter(Boolean);
    if (ctx.q.detail >= 1 && sets.length) {
      const lists = sets.map(() => []);
      for (let i = 0, k = 0; i < T.n; i += 9) {
        if (nearTunnel(i)) continue;
        const sd = (k++ % 2) ? 1 : -1, p = edge(i, sd, 12 + rand() * 12);
        if (!ctx.clear(p.x, p.z, 8) || !bldClear(p.x, p.z, 6)) continue;
        const h = look.real.trees.h;
        lists[k % sets.length].push({ x: p.x, z: p.z, s: h[0] + rand() * (h[1] - h[0]), yaw: rand() * 6.28, tint: new THREE.Color(look.real.trees.tint).multiplyScalar(0.85 + rand() * 0.3) });
      }
      sets.forEach((set, k) => {
        if (!lists[k].length) return;
        const im = makeTreeMesh(set, lists[k], ctx.q);
        for (let j = 0; j < im.count; j++) { im.getMatrixAt(j, m4); m4.decompose(v3, qn, sc); v3.y = G(v3.x, v3.z) - 0.15; im.setMatrixAt(j, m4.compose(v3, qn, sc)); }
        im.instanceMatrix.needsUpdate = true;
        ctx.group.add(im);
      });
    }
  }

  // ── 정문(출발 직선): 돌기둥 + 철 아치 + 등 ──
  {
    const i = ctx.segAt(0, 0.4), L = T.wallL[i] + 1.2, Rr = T.wallR[i] + 1.2, mid = (L - Rr) / 2, rad = (L + Rr) / 2;
    const g = new THREE.Group();
    const stone = ctx.mat({ color: 0x6d6585, roughness: 0.8 });
    for (const d of [L, -Rr]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.8, 9, 1.8), stone); p.position.set(d, 4.5, 0); g.add(p);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), ctx.mat({ color: new THREE.Color(0xffd48a).multiplyScalar(2.6) }, 'basic')); lamp.position.set(d, 9.9, 0); g.add(lamp);
    }
    const arch = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.22, 6, 28, Math.PI), ctx.mat({ color: 0x24222e, roughness: 0.5, metalness: 0.5 }));
    arch.position.set(mid, 9.4, 0); g.add(arch);
    const arch2 = new THREE.Mesh(new THREE.TorusGeometry(rad * 0.62, 0.14, 6, 24, Math.PI), ctx.mat({ color: 0xd7b04a, roughness: 0.4, metalness: 0.6 }));
    arch2.position.set(mid, 9.4, 0); g.add(arch2);
    g.position.set(T.x[i], T.y[i], T.z[i]); g.rotation.y = Math.atan2(T.tx[i], T.tz[i]);
    ctx.group.add(g);
  }

  // ── 샹들리에: 복도 천장 한가운데, 32m 마다 ──
  const chand = [];
  {
    for (let i = 4; i < T.n; i += 16) if (T.tunnel[i] && T.tunnel[(i + 2) % T.n] && T.tunnel[(i + T.n - 2) % T.n]) {
      const cc = (T.wallL[i] - T.wallR[i]) / 2;
      chand.push({ x: T.x[i] + T.lx[i] * cc, y: T.y[i] + 7.9, z: T.z[i] + T.lz[i] * cc, yaw: 0 });
    }
    const frame = [part(new THREE.CylinderGeometry(0.04, 0.04, 1.7, 4), 0x9a7a2c, [0, -0.85, 0]), part(new THREE.TorusGeometry(1.05, 0.07, 5, 14), 0xd7b04a, [0, -1.8, 0], [Math.PI / 2, 0, 0]),
      part(new THREE.TorusGeometry(0.55, 0.06, 5, 12), 0xd7b04a, [0, -1.55, 0], [Math.PI / 2, 0, 0])];
    const bulbs = [part(new THREE.SphereGeometry(0.22, 6, 5), 0xffffff, [0, -2.15, 0])];
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * Math.PI * 2;
      frame.push(part(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 4), 0xf0e6c8, [Math.cos(a) * 1.05, -1.6, Math.sin(a) * 1.05]));
      bulbs.push(part(new THREE.SphereGeometry(0.13, 5, 4).scale(1, 1.5, 1), 0xffffff, [Math.cos(a) * 1.05, -1.3, Math.sin(a) * 1.05]));
    }
    inst(merge(frame), vcMat({ metalness: 0.6, roughness: 0.35 }), chand);
    const bm = merge(bulbs); bm.deleteAttribute('color');
    inst(bm, ctx.mat({ color: new THREE.Color(0xffe0a0).multiplyScalar(3) }, 'basic'), chand);
  }

  // ── 박쥐: 저택 위를 빙글빙글 ──
  const batGeo = (() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.35, -1.1, 0.25, 0.1, -0.2, 0, -0.35, 0, 0, 0.35, 0.2, 0, -0.35, 1.1, 0.25, 0.1], 3));
    g.computeVertexNormals(); return g;
  })();
  const NB = 14;
  const batIM = new THREE.InstancedMesh(batGeo, ctx.mat({ color: 0x0c0a14, side: THREE.DoubleSide }, 'basic'), NB);
  batIM.frustumCulled = false; ctx.group.add(batIM);
  const hub = buildings[0] || { x: T.x[0], z: T.z[0] };
  const bats = Array.from({ length: NB }, () => ({ r: 20 + rand() * 60, sp: 0.25 + rand() * 0.3, ph: rand() * 6.28, h: 20 + rand() * 30, cx: hub.x + (rand() - 0.5) * 60, cz: hub.z + (rand() - 0.5) * 60 }));
  ctx.onFrame(t => {
    bats.forEach((b, k) => {
      const a = t * b.sp + b.ph;
      v3.set(b.cx + Math.cos(a) * b.r, b.h + Math.sin(t * 1.3 + b.ph) * 2.5, b.cz + Math.sin(a * 1.1) * b.r);
      qn.setFromEuler(eu.set(0, -a, Math.sin(t * 9 + b.ph) * 0.5, 'YXZ'));
      batIM.setMatrixAt(k, m4.compose(v3, qn, sc.set(1.6, 1.6 + Math.sin(t * 14 + b.ph) * 0.8, 1.6)));
    });
    batIM.instanceMatrix.needsUpdate = true;
  });
  console.log(`[mansion] 저택 ${buildings.length}채 울타리 ${fences.length} 산울타리 ${hedges.length} 가로등 ${lamps.length} 샹들리에 ${chand.length}`);
}
