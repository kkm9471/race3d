// 도심 트랙 전용 장식 — 해 질 녘 빌딩 숲(창문 불빛), 보도, 가로등
//
// 빌딩은 상자 하나(InstancedMesh)를 크기만 바꿔 수백 채 찍는다. 창문은 텍스처가 아니라
// 셰이더에서 월드 좌표로 계산한다(층 높이 3.2m, 창 간격 2.6m) → 빌딩 크기가 달라도 창 크기가 같다.
// 빌딩끼리·도로와 겹치지 않게 트랙 중심선까지 거리를 검사해서 세운다.

import * as THREE from 'three';

function hash(n) { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); }

/** 창문 불빛이 있는 외벽 재질 */
function facadeMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, metalness: 0.15 });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vWn; flat varying float vSeed;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vec4 wpI = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
        vWp = wpI.xyz;
        vWn = normalize(mat3(modelMatrix * instanceMatrix) * objectNormal);
        vec3 ctr = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        // 씨앗은 보간하지 않고(flat) 작은 정수로 — 큰 값을 보간하면 fract 에서 오차가 증폭돼 지글거린다
        vSeed = mod(floor(ctr.x * 0.37) * 7.0 + floor(ctr.z * 0.41) * 13.0, 97.0);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vWn; flat varying float vSeed;\nfloat h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (abs(vWn.y) < 0.5) {
          // 벽면: 가로축 = 벽을 따라가는 좌표
          float u = abs(vWn.x) > abs(vWn.z) ? vWp.z : vWp.x;
          float fl = floor((vWp.y - 1.0) / 3.2);
          float col = floor(u / 2.6);
          vec2 f = vec2(fract(u / 2.6), fract((vWp.y - 1.0) / 3.2));
          float win = step(0.18, f.x) * step(f.x, 0.82) * step(0.25, f.y) * step(f.y, 0.8) * step(0.0, fl);
          float r = h21(vec2(mod(col, 61.0) + vSeed, mod(fl, 37.0) + vSeed * 0.5));
          float lit = step(0.55, r);
          vec3 warm = mix(vec3(1.0, 0.76, 0.42), vec3(0.72, 0.84, 1.0), step(0.9, r));
          totalEmissiveRadiance += win * lit * warm * (0.35 + (r - 0.55) * 1.2);
          diffuseColor.rgb *= mix(1.0, 0.25, win);   // 창유리는 어둡게
        }`);
  };
  return m;
}

/**
 * 실사 외벽(15회차): 건물 사진(ambientCG 외벽, CC0)을 월드 좌표로 붙인다 — 상자 크기가 달라도 층·창 크기가 실제와 같다.
 * set = { map, rough, emis, w, h(사진 한 장의 실제 크기 m) }. 지붕은 어두운 콘크리트 색. emis 가 있으면 창 불빛(밤).
 */
function photoFacadeMaterial(set, emisI) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65, metalness: 0.15 });
  m.onBeforeCompile = sh => {
    sh.uniforms.uFMap = { value: set.map }; sh.uniforms.uFRough = { value: set.rough || set.map }; sh.uniforms.uFEmis = { value: set.emis || set.map };
    sh.uniforms.uFSize = { value: new THREE.Vector2(set.w, set.h) }; sh.uniforms.uFEmisI = { value: set.emis ? emisI : 0 };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vWn; flat varying float vBase;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vec4 wpI = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
        vWp = wpI.xyz;
        vWn = normalize(mat3(modelMatrix * instanceMatrix) * objectNormal);
        vBase = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).y;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vWn; flat varying float vBase;\nuniform sampler2D uFMap, uFRough, uFEmis; uniform vec2 uFSize; uniform float uFEmisI;')
      .replace('#include <map_fragment>', `
        bool wall = abs(vWn.y) < 0.5;
        float u = abs(vWn.x) > abs(vWn.z) ? vWp.z : vWp.x;
        vec2 fuv = wall ? vec2(u / uFSize.x, (vWp.y - vBase + 1.0) / uFSize.y) : vWp.xz / 6.0;
        vec4 fc = texture2D(uFMap, fuv);
        diffuseColor.rgb *= wall ? fc.rgb : vec3(0.28);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        if (wall) roughnessFactor = clamp(texture2D(uFRough, fuv).g, 0.05, 1.0);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (wall) totalEmissiveRadiance += texture2D(uFEmis, fuv).rgb * uFEmisI;`);
  };
  m.customProgramCacheKey = () => 'photo-facade';
  return m;
}

/**
 * T: 트랙, H(i,d): 노면 높이, group: 붙일 곳, facades: 실사 외벽 사진 세트 목록(없으면 예전처럼 셰이더 창문)
 */
export function buildCity(T, H, group, disposables, q, facades = null, emisI = 1.5) {
  // 트랙 중심선 격자 (겹침 검사용)
  const cell = 25, grid = new Map();
  for (let i = 0; i < T.n; i++) {
    const k = Math.floor(T.x[i] / cell) + ',' + Math.floor(T.z[i] / cell);
    if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i);
  }
  const clearOfRoad = (x, z, r) => {
    const cx = Math.floor(x / cell), cz = Math.floor(z / cell), R = Math.ceil((r + 20) / cell);
    for (let a = -R; a <= R; a++) for (let b = -R; b <= R; b++) {
      const l = grid.get((cx + a) + ',' + (cz + b));
      if (l) for (const i of l) {
        const dx = x - T.x[i], dz = z - T.z[i];
        const lat = dx * T.lx[i] + dz * T.lz[i];
        const w = (lat > 0 ? T.wallL[i] : T.wallR[i]) + 4 + r;
        if (dx * dx + dz * dz < w * w) return false;
      }
    }
    return true;
  };
  const boxes = [];
  // 정확한 회전 사각형 겹침 검사(분리축) — 원으로 근사하면 모서리끼리 겹친다 (2차 독립검증)
  const ext = (b, ax, az) => b.w / 2 * Math.abs(b.ux * ax + b.uz * az) + b.d / 2 * Math.abs(b.vx * ax + b.vz * az);
  const overlaps = c => boxes.some(b => {
    const dx = c.x - b.x, dz = c.z - b.z;
    for (const [ax, az] of [[b.ux, b.uz], [b.vx, b.vz], [c.ux, c.uz], [c.vx, c.vz]]) {
      if (Math.abs(dx * ax + dz * az) >= ext(b, ax, az) + ext(c, ax, az) + 1.5) return false;
    }
    return true;
  });
  // 도로 양옆을 따라 빌딩 줄 (앞줄) + 뒤쪽 채우기
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const row of [0, 1, 2]) {
    for (let i = 0; i < T.n; i += 6 + row * 3) {
      for (const side of [1, -1]) {
        const w = 14 + rnd() * 22, d = 14 + rnd() * 18;
        const r = Math.hypot(w, d) / 2;
        const back = (side > 0 ? T.wallL[i] : T.wallR[i]) + 5 + r * 0.8 + row * 32 + rnd() * 6;
        const x = T.x[i] + T.lx[i] * side * back, z = T.z[i] + T.lz[i] * side * back;
        // 너비축 = 트랙 옆방향, 깊이축 = 트랙 진행방향 (yaw = atan2(tx, tz) 회전과 같다)
        const cand = { x, z, w, d, ux: T.lx[i], uz: T.lz[i], vx: T.tx[i], vz: T.tz[i] };
        if (!clearOfRoad(x, z, r * 0.8) || overlaps(cand)) continue;
        const hgt = row === 0 ? 10 + rnd() * 35 : 18 + rnd() * 70;
        const yaw = Math.atan2(T.tx[i], T.tz[i]);
        boxes.push({ ...cand, r: r * 0.75, h: hgt, yaw, y: T.y[i] - 1 });
      }
    }
  }
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.translate(0, 0.5, 0);
  const m4 = new THREE.Matrix4(), qn = new THREE.Quaternion(), col = new THREE.Color();
  const tones = [0x8b8f96, 0x9e958a, 0x6f7784, 0xa7a9ad, 0x5d6168, 0x8c7f73, 0x77838e];
  // 실사 외벽이면 사진마다 InstancedMesh 하나(건물마다 번갈아), 아니면 예전 셰이더 창문 하나
  const kinds = facades && facades.length ? facades : [null];
  kinds.forEach((set, fk) => {
    const mine = boxes.filter((_, k) => k % kinds.length === fk);
    if (!mine.length) return;
    const mat = set ? photoFacadeMaterial(set, emisI) : facadeMaterial();
    disposables.push(mat);
    const im = new THREE.InstancedMesh(geo, mat, mine.length);
    mine.forEach((b, k) => {
      qn.setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.yaw);
      m4.compose(new THREE.Vector3(b.x, b.y, b.z), qn, new THREE.Vector3(b.w, b.h, b.d));
      im.setMatrixAt(k, m4);
      if (set) { const v = 0.85 + hash(k + fk * 31) * 0.25; col.setRGB(v, v, v); } else col.setHex(tones[Math.floor(hash(k + 3) * tones.length)]);
      im.setColorAt(k, col);
    });
    im.castShadow = q.detail >= 1; im.receiveShadow = true;
    group.add(im);
  });
  // 옥상 난간·기계실 (작은 상자)
  // 가로등: 20m 마다 번갈아
  const lamps = [];
  for (let i = 0; i < T.n; i += 11) {
    const side = (i / 11) % 2 ? 1 : -1;
    const w = (side > 0 ? T.wallL[i] : T.wallR[i]) + 1.2;
    lamps.push({ x: T.x[i] + T.lx[i] * side * w, z: T.z[i] + T.lz[i] * side * w, y: H(i, side * (w - 1.2)), side, i });
  }
  const poleG = new THREE.CylinderGeometry(0.08, 0.11, 8, 6); poleG.translate(0, 4, 0);
  const headG = new THREE.BoxGeometry(0.5, 0.15, 1.2);
  const poleM = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.5, metalness: 0.6 });
  const headM = new THREE.MeshStandardMaterial({ color: 0xffe2b0, emissive: 0xffc070, emissiveIntensity: 3.0 });
  disposables.push(poleM, headM);
  const ip = new THREE.InstancedMesh(poleG, poleM, lamps.length), ih = new THREE.InstancedMesh(headG, headM, lamps.length);
  lamps.forEach((l, k) => {
    const yaw = Math.atan2(T.lx[l.i], T.lz[l.i]) + (l.side > 0 ? Math.PI : 0);
    qn.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    m4.compose(new THREE.Vector3(l.x, l.y, l.z), qn, new THREE.Vector3(1, 1, 1)); ip.setMatrixAt(k, m4);
    const hx = l.x - T.lx[l.i] * l.side * 1.0, hz = l.z - T.lz[l.i] * l.side * 1.0;
    m4.compose(new THREE.Vector3(hx, l.y + 7.9, hz), qn, new THREE.Vector3(1, 1, 1)); ih.setMatrixAt(k, m4);
  });
  ip.castShadow = q.detail >= 2;
  group.add(ip, ih);
  return { buildings: boxes.length, lamps: lamps.length };
}
