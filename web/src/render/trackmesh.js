// 트랙 그래픽 — 물리와 같은 트랙 데이터(샘플·벽 오프셋·노면 높이 함수)로 만든다
//
// 노면 높이는 물리의 TrackWorld.heightAt 를 그대로 불러 쓴다. 그래서 바퀴가 보이는 노면 위에 정확히 선다.
// 구성: 아스팔트·연석·런오프(잔디/자갈)·흰 선·출발선·벽(콘크리트/타이어/가드레일/암벽)·지형·나무·관중석·원경 산

import * as THREE from 'three';
import * as TX from './textures.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildCity } from './city.js';
import { THEMES } from './themes/index.js';
import { makeCtx } from './themes/kit.js';
import { applyTexSet } from './assets.js';
import { realFor } from './realism.js';

function hash2(x, z) {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z, oct = 5) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, z * f); f *= 2.03; a *= 0.5; }
  return s;
}

/** 샘플마다 [d0..d1] 폭의 띠. hfn(i, d) → 높이 */
function ribbon(T, cols, hfn, uvfn, { closed = true, from = 0, to = T.n } = {}) {
  const n = to - from + (closed ? 1 : 0);
  const m = cols(0).length;
  const pos = new Float32Array(n * m * 3), uv = new Float32Array(n * m * 2);
  const idx = [];
  for (let a = 0; a < n; a++) {
    const i = (from + a) % T.n;
    const ds = cols(i);
    for (let b = 0; b < m; b++) {
      const d = ds[b];
      const x = T.x[i] + T.lx[i] * d, z = T.z[i] + T.lz[i] * d;
      const k = (a * m + b);
      pos[k * 3] = x; pos[k * 3 + 1] = hfn(i, d, b); pos[k * 3 + 2] = z;
      const [u, v] = uvfn(i, d, x, z, a, b);
      uv[k * 2] = u; uv[k * 2 + 1] = v;
    }
  }
  for (let a = 0; a < n - 1; a++) for (let b = 0; b < m - 1; b++) {
    const p = a * m + b, q = (a + 1) * m + b;
    // 앞(a+1) × 왼쪽(b+1) = 위(+Y) 가 되도록
    idx.push(p, q, p + 1, p + 1, q, q + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function buildTrackScene(T, world, q, def) {
  const group = new THREE.Group();
  group.name = 'track';
  const disposables = [];
  const aniso = q.detail >= 2 ? 12 : q.detail >= 1 ? 8 : 2;
  const mats = {
    asphalt: new THREE.MeshStandardMaterial({ map: TX.asphalt(aniso), roughnessMap: TX.asphaltRough(aniso), roughness: 0.95, metalness: 0.0, color: 0xffffff, envMapIntensity: 0.45 }),
    curb: new THREE.MeshStandardMaterial({ map: TX.curb(aniso), roughness: 0.6 }),
    // 풀밭 자리: 해변은 모래, 빙하는 눈 (def.palette.runoff = 'sand' | 'snow' — 풀 질감에 색만 입히면 초록이 남는다)
    grass: def.palette?.runoff
      ? new THREE.MeshStandardMaterial({ map: TX.gravel(aniso), roughness: 0.95, color: def.palette.runoff === 'snow' ? 0xf6f9fc : 0xead39c })
      : new THREE.MeshStandardMaterial({ map: TX.grass(aniso), roughness: 0.95, color: def.palette?.grass ?? (def.style === 'mountain' ? 0xb8c8a0 : 0xffffff) }),
    gravel: new THREE.MeshStandardMaterial({ map: TX.gravel(aniso), roughness: 1 }),
    line: new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    yline: new THREE.MeshStandardMaterial({ color: 0xf0c020, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    concrete: new THREE.MeshStandardMaterial({ map: TX.concrete(aniso), roughness: 0.85 }),
    rock: new THREE.MeshStandardMaterial({ map: TX.rock(aniso), roughness: 0.95, color: def.palette?.rock ?? 0xffffff }),   // 협곡은 붉게, 빙하는 희게
    metal: new THREE.MeshStandardMaterial({ color: 0xc9ced3, roughness: 0.35, metalness: 0.85 }),
    post: new THREE.MeshStandardMaterial({ color: 0x777c80, roughness: 0.5, metalness: 0.6 }),
    terrain: new THREE.MeshStandardMaterial({ map: TX.grass(aniso), roughness: 1, vertexColors: true }),
  };
  for (const k in mats) disposables.push(mats[k]);
  const road = T.hw;
  mats.asphalt.map.repeat.set(1, 1);

  // ── 테마 (2026-10-02 14회차): 노면·선·벽·갓길·암벽 색과 질감을 바꾸고, 끝에 테마 소품을 세운다 ──
  const theme = def.theme ? THEMES[def.theme] : null;
  const look = theme?.look || {};
  let terrainHeight = () => 0;
  const anims = [];
  const ctx = makeCtx({ T, world, def, q, group, disposables, ground: (x, z) => terrainHeight(x, z), anims });
  ctx.aniso = aniso;
  const texOf = v => typeof v === 'function' ? v(ctx) : v === 'grass' ? TX.grass(aniso) : v === 'gravel' ? TX.gravel(aniso) : v === 'concrete' ? TX.concrete(aniso) : v === 'rock' ? TX.rock(aniso) : null;
  if (look.roadTex) { mats.asphalt.map = texOf(look.roadTex); mats.asphalt.roughnessMap = null; mats.asphalt.roughness = look.roadRough ?? 0.8; }
  if (look.road != null) mats.asphalt.color.set(look.road);
  if (look.line != null) mats.line.color.set(look.line);
  if (look.runoffTex) mats.grass.map = texOf(look.runoffTex);
  if (look.runoffColor != null) mats.grass.color.set(look.runoffColor);
  if (look.rock != null) mats.rock.color.set(look.rock);
  // 벽은 보도(콘크리트)와 재질을 나눠서 색을 바꾼다
  mats.wall = mats.concrete;
  mats.walk = mats.concrete;
  if (look.wall) {
    const w = look.wall;
    mats.wall = new THREE.MeshStandardMaterial({ map: w.map ? texOf(w.map) : TX.concrete(aniso), color: w.color ?? 0xffffff, roughness: w.roughness ?? 0.85, metalness: w.metalness ?? 0, emissive: w.emissive ?? 0x000000, emissiveIntensity: w.emissiveIntensity ?? 1 });
    disposables.push(mats.wall);
  }

  // ── 실사 질감(15회차): 사진 질감 세트(색·울퉁불퉁·거칠기). 보통·높음 화질, 미리 받아 둔 경우만 (못 받았으면 위의 그린 질감 그대로) ──
  const real = q.detail >= 1 ? realFor(def, theme) : null;
  if (real) {
    let hwAvg = 0; for (let i = 0; i < T.n; i++) hwAvg += T.hw[i]; hwAvg /= T.n;
    if (applyTexSet(mats.asphalt, real.road, [hwAvg * 2, 10], aniso)) mats.asphalt.envMapIntensity = real.road.env ?? 0.8;
    applyTexSet(mats.grass, real.runoff, [8, 8], aniso);
    applyTexSet(mats.gravel, real.gravel, [4, 4], aniso);
    applyTexSet(mats.rock, real.rock, [6, 5], aniso);
    if (real.walk) { mats.walk = new THREE.MeshStandardMaterial(); disposables.push(mats.walk); applyTexSet(mats.walk, real.walk, [3, 3], aniso); }
    if (real.wall) { if (mats.wall === mats.concrete) { mats.wall = new THREE.MeshStandardMaterial(); disposables.push(mats.wall); } applyTexSet(mats.wall, real.wall, [3, 4], aniso); }
  }

  const H = (i, d) => world.heightAt(i, 0, d).h;
  const sOf = i => i * T.ds;

  // ── 아스팔트 ──
  const roadG = ribbon(T, i => [-T.hw[i], -T.hw[i] / 2, 0, T.hw[i] / 2, T.hw[i]], (i, d) => {
    // 연석 톱니 없이 순수 노면
    const b = T.bank[i];
    return T.y[i] + d * b;
  }, (i, d) => [(d + T.hw[i]) / (2 * T.hw[i]), sOf(i) / 10]);
  const roadM = new THREE.Mesh(roadG, mats.asphalt);
  roadM.receiveShadow = true;
  group.add(roadM);

  // ── 흰 가장자리 선 ──
  for (const side of [1, -1]) {
    const lg = ribbon(T, i => side > 0 ? [T.hw[i] - 0.45, T.hw[i] - 0.2] : [-T.hw[i] + 0.2, -T.hw[i] + 0.45],
      (i, d) => T.y[i] + d * T.bank[i] + 0.004, () => [0, 0]);
    const lm = new THREE.Mesh(lg, def.style === 'mountain' ? mats.line : mats.line);
    lm.receiveShadow = true;
    group.add(lm);
  }
  // 산길: 가운데 노란 점선 (중앙선)
  if (def.style === 'mountain') {
    const dash = [];
    for (let i = 0; i < T.n; i += 3) {
      const g = ribbon(T, () => [-0.08, 0.08], (ii, d) => T.y[ii] + d * T.bank[ii] + 0.004, () => [0, 0], { closed: false, from: i, to: i + 2 });
      dash.push(g);
    }
    const dm = new THREE.Mesh(mergeGeometries(dash), mats.yline);
    dm.receiveShadow = true;
    group.add(dm);
  }

  // ── 연석 ──
  const curbSeg = (side) => {
    const parts = [];
    let start = -1;
    const has = i => (side > 0 ? T.curbL[i] : T.curbR[i]) > 0;
    for (let i = 0; i <= T.n; i++) {
      const on = i < T.n && has(i);
      if (on && start < 0) start = i;
      if ((!on || i === T.n) && start >= 0) {
        const end = Math.min(i + 1, T.n);
        parts.push(ribbon(T, ii => {
          const w = side > 0 ? T.curbL[ii] : T.curbR[ii], hw = T.hw[ii];
          return side > 0 ? [hw, hw + 0.15, hw + Math.max(w, 0.3)] : [-hw - Math.max(w, 0.3), -hw - 0.15, -hw];
        }, (ii, d, b) => {
          const base = T.y[ii] + d * T.bank[ii];
          const inner = side > 0 ? b === 0 : b === 2;
          return base + (inner ? 0.005 : 0.04);
        }, (ii, d, x, z, a, b) => [b / 2, sOf(ii) / 4], { closed: false, from: start, to: end }));
        start = -1;
      }
    }
    return parts;
  };
  const curbParts = [...curbSeg(1), ...curbSeg(-1)];
  if (curbParts.length) {
    const cm = new THREE.Mesh(mergeGeometries(curbParts), mats.curb);
    cm.receiveShadow = true;
    group.add(cm);
  }

  // ── 런오프 (잔디/자갈/산길 갓길) ──
  for (const side of [1, -1]) {
    // 자갈과 잔디를 구간별로 나눠 두 재질로
    for (const surf of [2, 3]) {
      const parts = [];
      let start = -1;
      const sOK = i => (side > 0 ? T.surfL[i] : T.surfR[i]) === surf;
      for (let i = 0; i <= T.n; i++) {
        const on = i < T.n && sOK(i);
        if (on && start < 0) start = i;
        if ((!on || i === T.n) && start >= 0) {
          const end = Math.min(i + 1, T.n);
          parts.push(ribbon(T, ii => {
            const e = T.hw[ii] + (side > 0 ? T.curbL[ii] : T.curbR[ii]);
            const w = side > 0 ? T.wallL[ii] : T.wallR[ii];
            const mid = (e + w) / 2;
            return side > 0 ? [e, mid, w + 0.3] : [-w - 0.3, -mid, -e];
          }, (ii, d) => H(ii, d) - 0.01, (ii, d, x, z) => [x / (surf === 3 ? 4 : 8), z / (surf === 3 ? 4 : 8)], { closed: false, from: start, to: end }));
          start = -1;
        }
      }
      if (parts.length) {
        const m = new THREE.Mesh(mergeGeometries(parts), surf === 3 ? mats.gravel : mats.grass);
        m.receiveShadow = true;
        group.add(m);
      }
    }
  }

  // 도심: 도로 밖 아스팔트 런오프 = 보도(콘크리트)
  if (def.style === 'city') {
    for (const side of [1, -1]) {
      const g = ribbon(T, ii => {
        const e = T.hw[ii] + (side > 0 ? T.curbL[ii] : T.curbR[ii]);
        const w = side > 0 ? T.wallL[ii] : T.wallR[ii];
        return side > 0 ? [e, w + 0.3] : [-w - 0.3, -e];
      }, (ii, d) => H(ii, d) + 0.015, (ii, d, x, z) => [x / 3, z / 3]);
      const m = new THREE.Mesh(g, mats.walk);
      m.receiveShadow = true;
      group.add(m);
    }
  }

  // ── 출발선 체커 ──
  {
    const i = 0;
    const cg = ribbon(T, ii => [-T.hw[ii], T.hw[ii]], (ii, d) => T.y[ii] + d * T.bank[ii] + 0.006, (ii, d, x, z, a, b) => [b * 4, a], { closed: false, from: 0, to: 2 });
    const cm = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ map: TX.checker(), roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -3 }));
    cm.material.map.repeat.set(1, 1);
    cm.receiveShadow = true;
    group.add(cm);
    // 출발 그리드 표시 (흰 ㄷ자)
    const gp = [];
    for (let k = 0; k < 8; k++) {
      const row = Math.floor(k / 2), col = k % 2;
      const back = 12 + row * 9 + col * 4.5 - 2.4;
      const si = Math.floor((T.L - back) / T.ds) % T.n;
      const d0 = col === 0 ? 2.6 : -2.6;
      gp.push(ribbon(T, () => [d0 - 1.1, d0 + 1.1], (ii, d) => T.y[ii] + d * T.bank[ii] + 0.005, () => [0, 0], { closed: false, from: si, to: si + 1 }));
    }
    const gm = new THREE.Mesh(mergeGeometries(gp.map(g => g.index ? g : g)), mats.line);
    group.add(gm);
  }

  // ── 벽 ──
  // 산길: 바깥 지형이 도로보다 높으면 암벽, 낮으면 가드레일
  const terrainH = makeTerrainFn(T, def);
  const wallKind = (i, side) => {
    if (def.style !== 'mountain') return 'concrete';
    const w = side > 0 ? T.wallL[i] : T.wallR[i];
    const x = T.x[i] + T.lx[i] * side * (w + 14), z = T.z[i] + T.lz[i] * side * (w + 14);
    return terrainH(x, z) > T.y[i] + 2 ? 'rock' : 'rail';
  };
  for (const side of [1, -1]) {
    const kinds = new Array(T.n);
    for (let i = 0; i < T.n; i++) kinds[i] = wallKind(i, side);
    // 짧게 튀는 종류는 이웃에 맞춘다
    for (let pass = 0; pass < 3; pass++) for (let i = 0; i < T.n; i++) {
      const a = kinds[(i - 3 + T.n) % T.n], b = kinds[(i + 3) % T.n];
      if (a === b && kinds[i] !== a) kinds[i] = a;
    }
    const segs = { concrete: [], rock: [], rail: [] };
    let start = 0;
    for (let i = 1; i <= T.n; i++) {
      if (i === T.n || kinds[i] !== kinds[start]) {
        segs[kinds[start]].push([start, Math.min(i + 1, T.n)]);
        start = i;
      }
    }
    const wOff = i => (side > 0 ? T.wallL[i] : T.wallR[i]);
    // 콘크리트 벽 (서킷): 높이 1.1m, 두께 0.4m
    const cParts = [];
    for (const [a, b] of segs.concrete) {
      cParts.push(ribbon(T, i => [side * wOff(i), side * wOff(i), side * (wOff(i) + 0.4), side * (wOff(i) + 0.4)],
        (i, d, k) => { const g = H(i, side * wOff(i)); return k === 0 ? g - 1.5 : (k === 3 ? g - 1.5 : g + 1.1); },
        (i, d, x, z, aa, k) => [k / 3, sOf(i) / 4], { closed: false, from: a, to: b }));
    }
    if (cParts.length) {
      const g = mergeGeometries(cParts);
      if (side < 0) flipIndex(g);
      const m = new THREE.Mesh(g, mats.wall);
      m.receiveShadow = true; m.castShadow = q.detail >= 2;
      group.add(m);
      // 벽 아래쪽 빨강/흰 띠 (서킷 분위기 — 도심은 맨 콘크리트)
      const sParts = [];
      for (const [a, b] of segs.concrete) {
        sParts.push(ribbon(T, i => [side * (wOff(i) - 0.01), side * (wOff(i) - 0.01)],
          (i, d, k) => H(i, side * wOff(i)) + (k === 0 ? 0.05 : 0.45), (i, d, x, z, aa, k) => [k, sOf(i) / 4], { closed: false, from: a, to: b }));
      }
      if (look.wall?.stripe ?? def.style !== 'city') {
        const sg = mergeGeometries(sParts);
        if (side < 0) flipIndex(sg);
        const sm = new THREE.Mesh(sg, mats.curb);
        group.add(sm);
      }
    }
    // 암벽 (산길 안쪽): 벽 위치에서 위로 솟는 절벽
    const rParts = [];
    for (const [a, b] of segs.rock) {
      rParts.push(ribbon(T, i => [side * wOff(i), side * (wOff(i) + 1.2), side * (wOff(i) + 4), side * (wOff(i) + 9)],
        (i, d, k) => {
          const g = H(i, side * wOff(i));
          const top = Math.max(g + 3, Math.min(terrainH(T.x[i] + T.lx[i] * d, T.z[i] + T.lz[i] * d), g + 26));
          const n = fbm(i * 0.21, k * 1.7, 3) * 2.2;
          return [g - 1, g + 2.5 + n, g + (top - g) * 0.7 + n, top][k];
        },
        (i, d, x, z, aa, k) => [sOf(i) / 6, k * 1.2], { closed: false, from: a, to: b }));
    }
    if (rParts.length) {
      const g = mergeGeometries(rParts);
      if (side < 0) flipIndex(g);
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, mats.rock);
      m.receiveShadow = true; m.castShadow = q.detail >= 1;
      group.add(m);
    }
    // 가드레일 (산길 바깥): W빔 + 기둥
    const gParts = [], posts = [];
    for (const [a, b] of segs.rail) {
      gParts.push(ribbon(T, i => [side * wOff(i), side * wOff(i), side * wOff(i)],
        (i, d, k) => H(i, side * wOff(i)) + [0.45, 0.62, 0.8][k],
        (i, d, x, z, aa, k) => [k / 2, sOf(i) / 4], { closed: false, from: a, to: b }));
      for (let i = a; i < b; i += 2) posts.push(i);
    }
    if (gParts.length) {
      const g = mergeGeometries(gParts);
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: look.rail ?? 0xd8dde2, roughness: 0.3, metalness: 0.8, side: THREE.DoubleSide }));
      disposables.push(m.material);
      m.receiveShadow = true; m.castShadow = q.detail >= 2;
      group.add(m);
      const pg = new THREE.BoxGeometry(0.12, 0.9, 0.12);
      const pm = new THREE.InstancedMesh(pg, mats.post, posts.length);
      const mm = new THREE.Matrix4();
      posts.forEach((i, k) => {
        const w = side * (wOff(i) + 0.15);
        mm.makeTranslation(T.x[i] + T.lx[i] * w, H(i, side * wOff(i)) + 0.35, T.z[i] + T.lz[i] * w);
        pm.setMatrixAt(k, mm);
      });
      pm.castShadow = q.detail >= 2;
      group.add(pm);
      // 가드레일 밖: 비탈(지형까지 내려가는 흙면)
    }
  }

  // ── 지형 ──
  const terrain = buildTerrain(T, world, def, terrainH, q, !!(real && real.terrain));
  if (look.terrainTex) mats.terrain.map = texOf(look.terrainTex);
  else if (def.style === 'city') { mats.terrain.map = TX.concrete(aniso); mats.terrain.map.repeat.set(0.5, 0.5); }
  else if (def.palette?.runoff) mats.terrain.map = TX.gravel(aniso);    // 모래·눈 땅은 풀 질감 대신
  if (real && real.terrain) applyTexSet(mats.terrain, real.terrain, [10, 10], aniso);
  terrain.material = mats.terrain;
  group.add(terrain);
  terrainHeight = terrain.userData.heightAt;

  // ── 원경 산맥 ──
  if (look.far !== false) group.add(buildFarMountains(T, Array.isArray(look.far) ? { ...def, palette: { ...def.palette, far: look.far } } : def));

  // ── 나무 ──
  if (look.trees !== false) group.add(buildTrees(T, def, terrainH, q, look.trees || null));

  // ── 서킷 시설: 관중석·피트·게이트·광고판 (테마 맵은 출발 게이트만 — 관중석·광고판은 서킷 분위기라서) ──
  const lights = { gantry: null };
  if (def.theme) {
    buildCircuitProps(T, world, group, disposables, lights, q, { stands: false, pit: false, ads: false, label: def.name });
    if (def.style === 'city' && look.city !== false) buildCity(T, H, group, disposables, q);
    if (def.style === 'mountain' && look.chevrons !== false) buildMountainProps(T, world, group, disposables, q, def, false);
    if (look.banner) buildBanner(T, group, `${def.name} · 출발`, look.banner.bg || '#1c2a52', look.banner.fg);
  }
  else if (def.style === 'circuit') buildCircuitProps(T, world, group, disposables, lights, q);
  else if (def.style === 'city') { buildCity(T, H, group, disposables, q); buildBanner(T, group, `${def.name} · 출발`, '#1c2a52'); }
  else buildMountainProps(T, world, group, disposables, q, def, true);

  // ── 카트식 지형 요소: 지름길 분리대·점프대·가속 발판·빙판·터널 ──
  buildKartFeatures(T, group, look, ctx);

  // ── 테마 소품 (실패해도 레이스는 그대로 — 소품만 빠진다) ──
  if (theme?.build) {
    try { theme.build(ctx); } catch (e) { console.warn(`테마 ${def.theme} 소품 오류:`, e); }
  }
  group.userData.anims = anims;
  fixBadNormals(group);

  group.userData.dispose = () => {
    group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); }); }
    });
  };
  group.userData.lights = lights;
  return group;
}

/** 노랑·검정 사선 무늬 / 앞을 가리키는 하늘색 화살표 (그림 파일 없이 캔버스로) */
function stripeTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#f2c21b'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#151515';
  for (let k = -64; k < 128; k += 32) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 16, 0); g.lineTo(k + 16 - 64, 64); g.lineTo(k - 64, 64); g.closePath(); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function arrowTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 64, 64);
  g.strokeStyle = '#ffffff'; g.lineWidth = 9; g.lineJoin = 'round';
  // 위(앞)를 가리키는 꺾쇠: 캔버스 위쪽 = v 큰 쪽 = 진행 방향
  g.beginPath(); g.moveTo(10, 44); g.lineTo(32, 18); g.lineTo(54, 44); g.stroke();
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 지름길 분리대(노랑·검정 띠벽)·점프대(사선 무늬 경사판)·가속 발판(빛나는 화살표)·빙판(반투명 푸른 막) */
function buildKartFeatures(T, group, look = {}, ctx = null) {
  if (!T.divW) return;
  if (T.tunnel && T.tunnel.some(v => v)) buildTunnels(T, group, look, ctx);
  const base = (i, d) => T.y[i] + d * T.bank[i];
  const runs = pred => {
    const out = []; let s = -1;
    for (let i = 0; i <= T.n; i++) {
      const on = i < T.n && pred(i);
      if (on && s < 0) s = i;
      if (!on && s >= 0) { out.push([s, i]); s = -1; }
    }
    return out;
  };
  const stripes = stripeTex();
  const divM = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.6, side: THREE.DoubleSide });
  const rampM = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.5, metalness: 0.2, side: THREE.DoubleSide });
  const padM = new THREE.MeshBasicMaterial({ map: arrowTex(), color: new THREE.Color(0.4, 1.6, 2.4), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const iceM = new THREE.MeshStandardMaterial({ color: 0xd6ecff, roughness: 0.08, metalness: 0.0, transparent: true, opacity: 0.55, envMapIntensity: 1.4, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  // 분리대: 왼벽·윗면·오른벽을 한 띠로 (높이 0.9m)
  for (const [a, b] of runs(i => T.divW[i] > 0)) {
    const g = ribbon(T, i => { const c = T.div[i], w = Math.max(T.divW[i], 0.05); return [c - w, c - w, c + w, c + w]; },
      (i, d, k) => base(i, d) + (k === 1 || k === 2 ? 0.9 : -0.05), (i, d, x, z, a2, k) => [k / 3, i * T.ds / 4], { closed: false, from: a, to: Math.min(b + 1, T.n) });
    const m = new THREE.Mesh(g, divM); m.castShadow = true; m.receiveShadow = true; group.add(m);
  }
  // 점프대: 벽에서 벽까지 경사판 (물리도 가로 전체 — 옆면 계단에 걸려 뒤집히지 않게), 뒷면은 내리막
  for (const [a, b] of runs(i => T.ramp[i] > 0)) {
    const g = ribbon(T, i => [-T.wallR[i] - 0.3, -T.wallR[i] - 0.3, T.wallL[i] + 0.3, T.wallL[i] + 0.3],
      (i, d, k) => base(i, d) + (k === 1 || k === 2 ? T.ramp[i] : -0.05) + 0.02, (i, d, x, z, a2, k) => [(d + T.wallR[i]) / 3, i * T.ds / 3], { closed: false, from: Math.max(0, a - 1), to: Math.min(b + 1, T.n) });
    const m = new THREE.Mesh(g, rampM); m.castShadow = true; m.receiveShadow = true; group.add(m);
  }
  // 가속 발판
  for (const [a, b] of runs(i => T.padW[i] > 0)) {
    // 닫는 행(b)은 마지막 발판 샘플(b-1) 폭으로 (아니면 끝 2m 가 길 가운데 한 점으로 찌그러져 그려졌다)
    const g = ribbon(T, i => { const q = i === b ? b - 1 : i; return [T.padC[q] - T.padW[q], T.padC[q] + T.padW[q]]; }, (i, d) => base(i, d) + 0.04,
      (i, d, x, z, a2, k) => [k, (i - a) * T.ds / (2 * T.padW[a])], { closed: false, from: a, to: Math.min(b + 1, T.n) });
    group.add(new THREE.Mesh(g, padM));
  }
  // 빙판
  for (const [a, b] of runs(i => T.roadSurf[i] === 5)) {
    const g = ribbon(T, i => [-T.hw[i], 0, T.hw[i]], (i, d) => base(i, d) + 0.015, (i, d, x, z) => [x / 8, z / 8], { closed: false, from: a, to: Math.min(b + 1, T.n) });
    const m = new THREE.Mesh(g, iceM); m.receiveShadow = true; group.add(m);
  }
}

/**
 * 길이 0·NaN 인 법선을 위쪽으로 바꾼다 (안전장치). 셰이더에서 normalize(0) = NaN 이 되면 블룸이 화면 전체를 비운다
 * — 광산 레일에서 실제로 보통·높음 화질 화면이 통째로 비었다(14회차 독립검증). 테마 소품이 늘어도 같은 사고가 없게.
 */
function fixBadNormals(group) {
  group.traverse(o => {
    const n = o.geometry && o.geometry.attributes && o.geometry.attributes.normal;
    if (!n) return;
    const a = n.array;
    let changed = false;
    for (let i = 0; i + 2 < a.length; i += 3) {
      const x = a[i], y = a[i + 1], z = a[i + 2], l = x * x + y * y + z * z;
      if (!(l > 1e-8) || !Number.isFinite(l)) { a[i] = 0; a[i + 1] = 1; a[i + 2] = 0; changed = true; }
    }
    if (changed) n.needsUpdate = true;
  });
}

/** 터널: 벽 위로 둥근 지붕 + 천장 등 줄 + 입구 테두리 (그림만) */
function buildTunnels(T, group, look, ctx) {
  const tl = look.tunnel || {};
  const runs = [];
  { let s = -1; for (let i = 0; i <= T.n; i++) { const on = i < T.n && T.tunnel[i]; if (on && s < 0) s = i; if (!on && s >= 0) { runs.push([s, i]); s = -1; } } }
  const base = (i, d) => T.y[i] + d * T.bank[i];
  const tunM = new THREE.MeshStandardMaterial({ map: tl.map && ctx ? tl.map(ctx) : TX.concrete(8), color: tl.color ?? 0x9a958c, roughness: 0.9, side: THREE.DoubleSide, emissive: tl.emissive ?? 0x141414 });
  const wallH = 5.0, rise = 3.0, K = 9;
  const parts = [];
  for (const [a, b] of runs) {
    // 열: 오른벽 아래·위, 둥근 지붕 K-1 점, 왼벽 위·아래
    parts.push(ribbon(T, i => {
      const L = T.wallL[i] + 0.3, Rr = T.wallR[i] + 0.3, cols = [-Rr, -Rr];
      for (let k = 1; k < K; k++) { const th = Math.PI * k / K; cols.push(-Rr + (L + Rr) * (1 - Math.cos(th)) / 2); }
      cols.push(L, L);
      return cols;
    }, (i, d, k) => {
      if (k === 0 || k === K + 2) return base(i, d) - 0.5;
      if (k === 1 || k === K + 1) return base(i, d) + wallH;
      return T.y[i] + wallH + rise * Math.sin(Math.PI * (k - 1) / K);
    }, (i, d, x, z, aa, k) => [k / (K + 2) * 3, i * T.ds / 6], { closed: false, from: a, to: Math.min(b + 1, T.n) }));
  }
  if (parts.length) {
    const m = new THREE.Mesh(mergeGeometries(parts), tunM);
    // 지붕 그림자는 드리우지 않는다(드리우면 안이 깜깜해 차가 안 보인다 — 밤 맵에서 확인)
    m.castShadow = false; m.receiveShadow = true; group.add(m);
  }
  // 천장 등 (빛나는 짧은 막대, 8m 마다)
  if (tl.light !== false) {
    const lampM = new THREE.MeshBasicMaterial({ color: new THREE.Color(tl.light ?? 0xffd9a0).multiplyScalar(2.2) });
    const lg = new THREE.BoxGeometry(0.5, 0.12, 2.2);
    const idx = [];
    for (const [a, b] of runs) for (let i = a; i < b; i += Math.max(1, Math.round(8 / T.ds))) idx.push(i);
    const im = new THREE.InstancedMesh(lg, lampM, idx.length);
    const m4 = new THREE.Matrix4(), qn = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    idx.forEach((i, k) => {
      const c = (T.wallL[i] - T.wallR[i]) / 2;
      p.set(T.x[i] + T.lx[i] * c, T.y[i] + wallH + rise - 0.25, T.z[i] + T.lz[i] * c);
      qn.setFromAxisAngle(up, Math.atan2(T.tx[i], T.tz[i]));
      im.setMatrixAt(k, m4.compose(p, qn, one));
    });
    group.add(im);
  }
  // 입구 테두리
  const portalM = new THREE.MeshStandardMaterial({ color: tl.portal ?? 0x6f6a62, roughness: 0.85 });
  for (const [a, b] of runs) for (const i of [a, Math.min(b, T.n - 1)]) {
    const L = T.wallL[i] + 0.3, Rr = T.wallR[i] + 0.3, w = L + Rr + 3;
    const g = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, 1.6, 1.2), portalM); top.position.set((L - Rr) / 2, wallH + rise + 0.6, 0); g.add(top);
    for (const sx of [L + 0.75, -Rr - 0.75]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(1.5, wallH + rise + 1.4, 1.2), portalM); leg.position.set(sx, (wallH + rise + 1.4) / 2 - 0.5, 0); g.add(leg); }
    g.position.set(T.x[i], T.y[i], T.z[i]);
    g.rotation.y = Math.atan2(T.tx[i], T.tz[i]);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    group.add(g);
  }
}

function flipIndex(g) {
  const ix = g.index.array;
  for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
  g.index.needsUpdate = true;
  g.computeVertexNormals();
}

/** 자연 지형 높이 (도로와 무관한 "원래 땅") */
function makeTerrainFn(T, def) {
  const b = T.bounds;
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  if (def.style === 'mountain') {
    // 트랙 가장 높은 곳 근처가 산 정상이 되도록: 샘플 높이를 거리 가중으로 퍼뜨린 뒤 봉우리 추가
    let hx = 0, hz = 0, hy = -1e9;
    for (let i = 0; i < T.n; i++) if (T.y[i] > hy) { hy = T.y[i]; hx = T.x[i]; hz = T.z[i]; }
    return (x, z) => {
      const d = Math.hypot(x - hx, z - hz);
      const peak = 150 * Math.exp(-d * d / (2 * 420 * 420)) + 40 * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * 900 * 900));
      return peak - 20 + fbm(x / 180, z / 180, 5) * 60 - 25;
    };
  }
  if (def.style === 'city') return () => -0.4;
  return (x, z) => {
    const d = Math.hypot(x - cx, z - cz);
    return -2 + fbm(x / 300, z / 300, 4) * 14 - 7 + Math.max(0, d - 900) * 0.04;
  };
}

/** 지형: 도로 근처는 도로 높이에 맞추고 멀어질수록 자연 지형으로 */
function buildTerrain(T, world, def, natural, q, neutral = false) {
  const b = T.bounds, pad = def.style === 'mountain' ? 900 : 700;
  const x0 = b.x0 - pad, x1 = b.x1 + pad, z0 = b.z0 - pad, z1 = b.z1 + pad;
  const N = q.detail >= 2 ? 320 : q.detail >= 1 ? 240 : 160;
  const nx = N, nz = Math.max(8, Math.round(N * (z1 - z0) / (x1 - x0)));
  const pos = new Float32Array((nx + 1) * (nz + 1) * 3), col = new Float32Array((nx + 1) * (nz + 1) * 3), uv = new Float32Array((nx + 1) * (nz + 1) * 2);
  // 가장 가까운 트랙 샘플 찾기용 격자
  const cell = 30, grid = new Map();
  for (let i = 0; i < T.n; i++) {
    const k = Math.floor(T.x[i] / cell) + ',' + Math.floor(T.z[i] / cell);
    if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i);
  }
  const nearest = (x, z) => {
    const cx = Math.floor(x / cell), cz = Math.floor(z / cell);
    let best = -1, bd = Infinity;
    for (let r = 0; r < 7; r++) {
      for (let a = -r; a <= r; a++) for (let c = -r; c <= r; c++) {
        if (Math.max(Math.abs(a), Math.abs(c)) !== r) continue;
        const l = grid.get((cx + a) + ',' + (cz + c));
        if (l) for (const i of l) { const d = (T.x[i] - x) ** 2 + (T.z[i] - z) ** 2; if (d < bd) { bd = d; best = i; } }
      }
      if (best >= 0 && Math.sqrt(bd) < (r - 0.5) * cell) break;
    }
    return [best, Math.sqrt(bd)];
  };
  // 트랙마다 땅 색을 바꿀 수 있다(def.palette.ground = [밝은, 어두운, 섞는, 높은 곳]) — 해변은 모래, 빙하는 눈
  const pg = def.palette?.ground || [0x6f8a45, 0x4e6b2e, 0x8a8458, 0x6a6e62];
  const green = new THREE.Color(), c1 = new THREE.Color(pg[0]), c2 = new THREE.Color(pg[1]), c3 = new THREE.Color(pg[2]), c4 = new THREE.Color(pg[3]);
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = x0 + (x1 - x0) * i / nx, z = z0 + (z1 - z0) * j / nz;
    let h = natural(x, z);
    const [k, dist] = nearest(x, z);
    if (k >= 0) {
      const lat = (x - T.x[k]) * T.lx[k] + (z - T.z[k]) * T.lz[k];
      const wall = lat > 0 ? T.wallL[k] : T.wallR[k];
      const road = T.y[k];
      const edge = wall + 3;
      if (dist < edge) h = road - 1.2;                    // 도로·런오프 아래 (보이지 않게)
      else {
        const t = Math.min(1, (dist - edge) / (def.style === 'mountain' ? 45 : 90));
        const s = t * t * (3 - 2 * t);
        h = (road - 0.4) * (1 - s) + h * s;
      }
    }
    const p = (j * (nx + 1) + i);
    pos[p * 3] = x; pos[p * 3 + 1] = h; pos[p * 3 + 2] = z;
    uv[p * 2] = x / 10; uv[p * 2 + 1] = z / 10;
    const n = fbm(x / 60, z / 60, 3);
    green.copy(c1).lerp(c2, n);
    if (neutral) { const v = 0.78 + n * 0.3 + Math.max(0, fbm(x / 140 + 5, z / 140, 3) - 0.5) * 0.3; green.setRGB(v, v * 0.99, v * 0.97); }   // 사진 질감 위에 밝기만 크게 얼룩지게
    else if (def.style === 'city') green.setRGB(0.36 + n * 0.08, 0.36 + n * 0.08, 0.37 + n * 0.08);
    else if (def.style === 'mountain') { const hi = Math.min(1, Math.max(0, (h - 60) / 90)); green.lerp(c4, hi * 0.6); }
    else green.lerp(c3, Math.max(0, fbm(x / 140 + 5, z / 140, 3) - 0.55) * 1.2);
    col[p * 3] = green.r; col[p * 3 + 1] = green.g; col[p * 3 + 2] = green.b;
  }
  const idx = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b2 = a + 1, c = a + nx + 1, d = c + 1;
    idx.push(a, c, b2, b2, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g);
  m.receiveShadow = true;
  m.userData.heightAt = (x, z) => {
    const fi = (x - x0) / (x1 - x0) * nx, fj = (z - z0) / (z1 - z0) * nz;
    const i = Math.max(0, Math.min(nx - 1, Math.floor(fi))), j = Math.max(0, Math.min(nz - 1, Math.floor(fj)));
    const u = fi - i, v = fj - j;
    const P = (a, bb) => pos[((j + bb) * (nx + 1) + (i + a)) * 3 + 1];
    return P(0, 0) * (1 - u) * (1 - v) + P(1, 0) * u * (1 - v) + P(0, 1) * (1 - u) * v + P(1, 1) * u * v;
  };
  return m;
}

function buildFarMountains(T, def) {
  const b = T.bounds, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  const amp = def.style === 'mountain' ? [520, 800] : def.style === 'city' ? [120, 300] : [260, 420];
  const fm = def.palette?.far || [0x7f93a6, 0x94a6b8];       // 빙하는 흰 산, 협곡은 붉은 산
  const seg = 180, rings = [[2400, fm[0], amp[0]], [3600, fm[1], amp[1]]];
  const grp = new THREE.Group();
  for (const [R, colr, amp] of rings) {
    const pos = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const a = i / seg * Math.PI * 2;
      const n = fbm(Math.cos(a) * 3 + R / 1000, Math.sin(a) * 3, 5);
      const h = amp * Math.pow(n, 1.6) * 1.8;
      const x = cx + Math.cos(a) * R, z = cz + Math.sin(a) * R;
      pos.push(x, -60, z, x, h, z);
    }
    for (let i = 0; i < seg; i++) { const p = i * 2; idx.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: colr, side: THREE.DoubleSide, fog: true }));
    grp.add(m);
  }
  return grp;
}

function buildTrees(T, def, natural, q, tl = null) {
  const grp = new THREE.Group();
  const count = Math.round((def.style === 'mountain' ? 5200 : def.style === 'city' ? (tl ? 1800 : 0) : 1800) * q.trees * (tl?.n ?? 1));
  const b = T.bounds, pad = def.style === 'mountain' ? 700 : 500;
  const trunkG = new THREE.CylinderGeometry(0.18, 0.28, 3, 5);
  trunkG.translate(0, 1.5, 0);
  const coneG = new THREE.ConeGeometry(2.2, 7, 7);
  coneG.translate(0, 6.2, 0);
  const cone2 = new THREE.ConeGeometry(1.7, 5, 7); cone2.translate(0, 9.0, 0);
  const coniferG = mergeGeometries([coneG, cone2]);
  const blobG = new THREE.IcosahedronGeometry(2.8, 1);
  blobG.translate(0, 5.2, 0);
  // 잎 덩어리를 울퉁불퉁하게
  const pa = blobG.attributes.position;
  for (let i = 0; i < pa.count; i++) {
    const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
    const k = 1 + (hash2(x * 3.1, z * 2.7 + y) - 0.5) * 0.35;
    pa.setXYZ(i, x * k, 5.2 + (y - 5.2) * k * 0.85, z * k);
  }
  blobG.computeVertexNormals();
  const trunkM = new THREE.MeshStandardMaterial({ color: tl?.trunk ?? 0x5a4330, roughness: 1 });
  // 빙하(눈)는 잎 질감 없이 흰 나무 — 초록 질감에 색만 입히면 초록이 남는다
  const snowy = def.palette?.runoff === 'snow';
  const leafM = new THREE.MeshStandardMaterial({ color: def.palette?.leaves ?? 0xffffff, roughness: 0.9, map: snowy ? null : TX.foliage() });
  const conifer = tl?.conifer ?? (def.style === 'mountain' ? 0.8 : 0.35);
  // 테마 잎 색: hue·sat·light 범위 [최소, 최대]
  const tcol = tl?.hue ? () => col.setHSL(tl.hue[0] + r() * (tl.hue[1] - tl.hue[0]), tl.sat[0] + r() * (tl.sat[1] - tl.sat[0]), tl.light[0] + r() * (tl.light[1] - tl.light[0])) : null;
  const nCon = Math.round(count * conifer), nBlob = count - nCon;
  const iTrunk = new THREE.InstancedMesh(trunkG, trunkM, count);
  const iCon = new THREE.InstancedMesh(coniferG, leafM, nCon);
  const iBlob = new THREE.InstancedMesh(blobG, leafM, nBlob);
  const m = new THREE.Matrix4(), qn = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
  let kc = 0, kb = 0, kt = 0;
  // 트랙에서 너무 가까우면 안 된다 (벽 + 8m)
  const cell = 30, grid = new Map();
  for (let i = 0; i < T.n; i++) { const k = Math.floor(T.x[i] / cell) + ',' + Math.floor(T.z[i] / cell); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); }
  const clear = (x, z) => {
    const cx = Math.floor(x / cell), cz = Math.floor(z / cell);
    for (let a = -2; a <= 2; a++) for (let c = -2; c <= 2; c++) {
      const l = grid.get((cx + a) + ',' + (cz + c));
      if (l) for (const i of l) {
        const dx = x - T.x[i], dz = z - T.z[i];
        const lat = dx * T.lx[i] + dz * T.lz[i];
        const w = (lat > 0 ? T.wallL[i] : T.wallR[i]) + 9;
        if (dx * dx + dz * dz < w * w) return false;
      }
    }
    return true;
  };
  let tries = 0;
  let seed = 1;
  const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  while ((kc < nCon || kb < nBlob) && tries < count * 20) {
    tries++;
    // 트랙 근처에 더 촘촘히: 트랙 샘플 주변에 뿌리기 + 전역
    let x, z;
    if (r() < 0.65) {
      const i = Math.floor(r() * T.n), side = r() < 0.5 ? 1 : -1;
      const w = (side > 0 ? T.wallL[i] : T.wallR[i]) + 10 + Math.pow(r(), 1.6) * 220;
      x = T.x[i] + T.lx[i] * side * w + (r() - 0.5) * 20; z = T.z[i] + T.lz[i] * side * w + (r() - 0.5) * 20;
    } else {
      x = b.x0 - pad + r() * (b.x1 - b.x0 + pad * 2); z = b.z0 - pad + r() * (b.z1 - b.z0 + pad * 2);
    }
    if (!clear(x, z)) continue;
    // 서킷: 무리 지어 (숲 가장자리) — 노이즈가 높은 곳만
    if (def.style === 'circuit' && fbm(x / 120, z / 120, 3) < 0.48) continue;
    const isCon = kc < nCon && (kb >= nBlob || r() < conifer);
    const h = 0;  // 높이는 나중에 지형 메쉬에서
    const s = 0.7 + r() * 0.7;
    qn.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28);
    p.set(x, h, z);
    sc.set(s, s * (0.85 + r() * 0.4), s);
    m.compose(p, qn, sc);
    iTrunk.setMatrixAt(kt, m);
    if (isCon) { iCon.setMatrixAt(kc, m); if (tcol) tcol(); else if (snowy) col.setHSL(0.58, 0.15, 0.78 + r() * 0.15); else col.setHSL(0.27 + r() * 0.06, 0.45, 0.22 + r() * 0.08); iCon.setColorAt(kc, col); kc++; }
    else { iBlob.setMatrixAt(kb, m); if (tcol) tcol(); else if (snowy) col.setHSL(0.58, 0.12, 0.8 + r() * 0.12); else col.setHSL(0.18 + r() * 0.1, 0.45 + r() * 0.15, 0.28 + r() * 0.1); iBlob.setColorAt(kb, col); kb++; }
    kt++;
  }
  iTrunk.count = kt; iCon.count = kc; iBlob.count = kb;
  for (const im of [iTrunk, iCon, iBlob]) { im.castShadow = q.detail >= 1; im.receiveShadow = false; grp.add(im); }
  grp.userData.placeOn = (heightAt) => {
    for (const im of [iTrunk, iCon, iBlob]) {
      for (let i = 0; i < im.count; i++) {
        im.getMatrixAt(i, m);
        m.decompose(p, qn, sc);
        p.y = heightAt(p.x, p.z) - 0.3;
        m.compose(p, qn, sc);
        im.setMatrixAt(i, m);
      }
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
    }
  };
  return grp;
}

function buildCircuitProps(T, world, group, disposables, lights, q, parts = { stands: true, pit: true, ads: true, label: 'START · FINISH' }) {
  const H = (i, d) => world.heightAt(i, 0, d).h;
  const place = (obj, i, d, faceTrack = true) => {
    const x = T.x[i] + T.lx[i] * d, z = T.z[i] + T.lz[i] * d;
    obj.position.set(x, H(i, Math.sign(d) * Math.min(Math.abs(d), T.hw[i])), z);
    const yaw = Math.atan2(T.tx[i], T.tz[i]);
    obj.rotation.y = yaw + (faceTrack ? (d > 0 ? -Math.PI / 2 : Math.PI / 2) : 0);
    group.add(obj);
    return obj;
  };
  // 관중석: 메인 직선 오른쪽(바깥) 벽 뒤 — 출발선 앞뒤 160m
  if (parts.stands) {
  const standM = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.8 });
  const roofM = new THREE.MeshStandardMaterial({ color: 0xe8ecef, roughness: 0.5, metalness: 0.3 });
  const crowdM = new THREE.MeshStandardMaterial({ map: TX.crowd(), roughness: 1 });
  crowdM.map.repeat.set(6, 1);
  disposables.push(standM, roofM, crowdM);
  for (const off of [-60, 0, 60]) {
    const i = ((Math.round(off / T.ds) % T.n) + T.n) % T.n;
    const d = -(T.wallR[i] + 6);
    const g = new THREE.Group();
    // 계단식 좌석 (앞이 트랙 쪽 = 로컬 +Z)
    for (let r = 0; r < 8; r++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(56, 0.5, 1.2), standM);
      step.position.set(0, 0.8 + r * 0.7, -r * 1.2);
      g.add(step);
      const cr = new THREE.Mesh(new THREE.PlaneGeometry(56, 0.7), crowdM);
      cr.position.set(0, 1.35 + r * 0.7, -r * 1.2 + 0.61);
      g.add(cr);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(58, 0.3, 12), roofM);
    roof.position.set(0, 9.5, -4.5); roof.rotation.x = -0.08;
    roof.castShadow = true;
    g.add(roof);
    for (const px of [-27, 0, 27]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9.5, 0.5), standM);
      col.position.set(px, 4.75, -9.5);
      g.add(col);
    }
    g.traverse(o => { if (o.isMesh) { o.castShadow = q.detail >= 1; o.receiveShadow = true; } });
    place(g, i, d);
  }
  }
  // 피트 건물: 메인 직선 왼쪽
  if (parts.pit) {
    const i = Math.floor(40 / T.ds);
    const d = T.wallL[i] + 14;
    const g = new THREE.Group();
    const wallM = new THREE.MeshStandardMaterial({ color: 0xaeb4ba, roughness: 0.75 });
    const glassM = new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.08, metalness: 0.9 });
    disposables.push(wallM, glassM);
    const b = new THREE.Mesh(new THREE.BoxGeometry(150, 7, 16), wallM);
    b.position.set(0, 3.5, -8);
    g.add(b);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(146, 2.2, 0.2), glassM);
    gl.position.set(0, 5.4, 0.05);
    g.add(gl);
    for (let k = -6; k <= 6; k++) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(9, 4, 0.2), new THREE.MeshStandardMaterial({ color: k % 2 ? 0x2c3440 : 0x3a4452, roughness: 0.6 }));
      door.position.set(k * 11, 2, 0.05);
      g.add(door);
    }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(40, 3), new THREE.MeshBasicMaterial({ map: TX.sign('한빛 서킷', '#10254a', '#ffffff', 1024, 96) }));
    sign.position.set(0, 8.6, 0.2);
    g.add(sign);
    g.traverse(o => { if (o.isMesh) { o.castShadow = q.detail >= 1; o.receiveShadow = true; } });
    place(g, i, d);
  }
  // 출발 게이트 + 신호등 5개
  {
    const i = 0;
    const g = new THREE.Group();
    const barM = new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.5, metalness: 0.5 });
    disposables.push(barM);
    const span = T.wallL[i] + T.wallR[i] + 1;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(span, 1.2, 1.0), barM);
    beam.position.set((T.wallL[i] - T.wallR[i]) / 2, 7.5, 0);
    g.add(beam);
    for (const sx of [T.wallL[i] + 0.5, -T.wallR[i] - 0.5]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8, 0.6), barM);
      leg.position.set(sx, 4, 0);
      g.add(leg);
    }
    const lampG = new THREE.CircleGeometry(0.32, 16);
    const lamps = [];
    for (let k = 0; k < 5; k++) {
      const mat = new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff1a0a, emissiveIntensity: 0, roughness: 0.3 });
      disposables.push(mat);
      const l = new THREE.Mesh(lampG, mat);
      l.position.set((k - 2) * 0.9, 7.5, -0.51);
      l.rotation.y = Math.PI;
      g.add(l);
      lamps.push(mat);
    }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.0), new THREE.MeshBasicMaterial({ map: TX.sign(parts.label || 'START · FINISH', '#101010', '#f2f2f2', 1024, 100) }));
    sign.position.set(0, 6.4, -0.52); sign.rotation.y = Math.PI;
    g.add(sign);
    g.traverse(o => { if (o.isMesh) { o.castShadow = q.detail >= 1; } });
    const x = T.x[i], z = T.z[i];
    g.position.set(x, T.y[i], z);
    g.rotation.y = Math.atan2(T.tx[i], T.tz[i]) + Math.PI;   // 로컬 +X 가 트랙 왼쪽이 되도록
    g.rotation.y = Math.atan2(T.tx[i], T.tz[i]);
    group.add(g);
    lights.gantry = lamps;
  }
  // 광고판 (가상 이름만)
  if (!parts.ads) return;
  const ads = [['산들 음료', '#1f7a3a'], ['한빛 모터스포츠', '#b3261e'], ['바람 타이어', '#222222'], ['별빛 전자', '#1d4fa8'], ['해오름 오일', '#e08a12']];
  for (let k = 0; k < 26; k++) {
    const i = Math.floor((k + 0.5) / 26 * T.n);
    if (Math.abs(T.k[i]) < 1 / 300) continue;
    const side = T.k[i] > 0 ? -1 : 1;   // 바깥쪽 벽 위
    const w = side > 0 ? T.wallL[i] : T.wallR[i];
    const [txt, bg] = ads[k % ads.length];
    const mat = new THREE.MeshStandardMaterial({ map: TX.sign(txt, bg), roughness: 0.6 });
    disposables.push(mat);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(12, 1.4), mat);
    const bx = T.x[i] + T.lx[i] * side * (w + 0.45), bz = T.z[i] + T.lz[i] * side * (w + 0.45);
    board.position.set(bx, H(i, side * w) + 1.85, bz);
    board.rotation.y = Math.atan2(T.tx[i], T.tz[i]) + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
    group.add(board);
  }
}

function buildBanner(T, group, text, bg, fg = '#fff4e0') {
  const i = 0;
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(T.wallL[i] + T.wallR[i], 1.2),
    new THREE.MeshBasicMaterial({ map: TX.sign(text, bg, fg, 1024, 96), side: THREE.DoubleSide }));
  banner.position.set(T.x[i] + T.lx[i] * (T.wallL[i] - T.wallR[i]) / 2, T.y[i] + 5.2, T.z[i] + T.lz[i] * (T.wallL[i] - T.wallR[i]) / 2);
  banner.rotation.y = Math.atan2(T.tx[i], T.tz[i]);
  group.add(banner);
  for (const sd of [1, -1]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5.8, 6), new THREE.MeshStandardMaterial({ color: 0x555555 }));
    const w = sd > 0 ? T.wallL[i] : T.wallR[i];
    pole.position.set(T.x[i] + T.lx[i] * sd * w, T.y[i] + 2.9, T.z[i] + T.lz[i] * sd * w);
    group.add(pole);
  }
}

function buildMountainProps(T, world, group, disposables, q, def, banner = true) {
  const H = (i, d) => world.heightAt(i, 0, d).h;
  // 급커브 앞 화살표 표지 (노랑 바탕 검정 화살)
  const mkArrow = (dir) => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#f5c518'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#111';
    g.beginPath();
    if (dir > 0) { g.moveTo(30, 20); g.lineTo(90, 64); g.lineTo(30, 108); g.lineTo(50, 64); }
    else { g.moveTo(98, 20); g.lineTo(38, 64); g.lineTo(98, 108); g.lineTo(78, 64); }
    g.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const matL = new THREE.MeshStandardMaterial({ map: mkArrow(1), roughness: 0.5 });
  const matR = new THREE.MeshStandardMaterial({ map: mkArrow(-1), roughness: 0.5 });
  disposables.push(matL, matR);
  const plate = new THREE.PlaneGeometry(1.0, 1.0);
  for (let i = 0; i < T.n; i += 3) {
    const k = T.k[i];
    if (Math.abs(k) < 1 / 30) continue;
    const side = k > 0 ? -1 : 1;           // 바깥쪽
    const w = side > 0 ? T.wallL[i] : T.wallR[i];
    const m = new THREE.Mesh(plate, k > 0 ? matR : matL);
    m.position.set(T.x[i] + T.lx[i] * side * (w - 0.1), H(i, side * w) + 1.3, T.z[i] + T.lz[i] * side * (w - 0.1));
    m.rotation.y = Math.atan2(T.tx[i], T.tz[i]) + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
    group.add(m);
  }
  // 출발선 현수막 (맵 이름 — 전엔 산길 맵이 모두 '안개 고개'로 나왔다)
  if (banner) buildBanner(T, group, `${def.name} · 출발`, '#7a1d12');
}
