// 실사 나무(사진판) — 15회차. tools/bake_trees.mjs 가 실제 나무 모델(Poly Haven, CC0)을 8방향에서 찍은 사진판을 쓴다.
// 한 그루 = 사각형 한 장(InstancedMesh 라 수천 그루도 그리기 1번). 사각형은 늘 카메라 쪽을 보고(세로축으로만 돈다),
// 보는 방향에 맞는 사진(8장 중 하나)을 고른다. 'normal' 사진판으로 해 조명을 다시 받아 납작해 보이지 않는다.
// 그림자: '높음' 화질에서만 — 그림자를 그릴 땐 사각형이 해 쪽을 보므로 해에서 본 나무 모양 그림자가 생긴다.
import * as THREE from 'three';

const BASE = './assets/trees/';
const cache = new Map(), pending = new Map();

function loadTex(url, srgb) {
  return new Promise(res => new THREE.TextureLoader().load(url, t => { if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; res(t); }, undefined, () => res(null)));
}

/** 나무 사진판 받기: { meta, albedo, normal } */
export function loadTreeSet(id) {
  if (cache.has(id)) return Promise.resolve(cache.get(id));
  if (!pending.has(id)) pending.set(id, (async () => {
    try {
      const meta = await (await fetch(`${BASE}${id}/meta.json`)).json();
      const [albedo, normal] = await Promise.all([loadTex(`${BASE}${id}/albedo.png`, true), loadTex(`${BASE}${id}/normal.png`, false)]);
      if (!albedo) return null;
      const set = { meta, albedo, normal };
      cache.set(id, set);
      return set;
    } catch (e) { console.warn('나무 사진판을 못 받았습니다:', id, e?.message || e); return null; }
  })());
  return pending.get(id);
}
export const getTreeSet = id => cache.get(id) || null;

/** 셰이더 고치기: 사각형을 카메라 쪽으로 세우고, 보는 방향에 맞는 사진을 고른다 (일반 재질·그림자 재질 공용) */
function patchBillboard(shader, frames, lit) {
  shader.uniforms.uFrames = { value: frames };
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>
uniform float uFrames;`)
    .replace('#include <uv_vertex>', `
  // 나무 한 그루: 위치·크기·방향은 instanceMatrix 에서 (원점 = 밑동, 고른 크기, 세로축 회전)
  vec3 bbPos = vec3(instanceMatrix[3]);
  float bbScale = length(vec3(instanceMatrix[0]));
  float bbYaw = atan(-instanceMatrix[0].z, instanceMatrix[0].x);
  vec2 bbD = cameraPosition.xz - bbPos.xz; bbD /= max(length(bbD), 1e-4);
  vec3 bbFwd = vec3(bbD.x, 0.0, bbD.y);
  vec3 bbRight = vec3(bbD.y, 0.0, -bbD.x);
  vec3 bbWorld = bbPos + bbRight * position.x * bbScale + vec3(0.0, 1.0, 0.0) * position.y * bbScale;
  // 사진 고르기: 나무 기준으로 카메라가 있는 각도 (구울 때 k 번째 사진은 각도 k/N·360°에서 찍었다)
  float bbAng = atan(bbD.x, bbD.y) - bbYaw;
  float bbFrame = mod(floor(bbAng / (6.2831853 / uFrames) + 0.5), uFrames);
#include <uv_vertex>
#ifdef USE_MAP
  vMapUv = vec2((uv.x + bbFrame) / uFrames, uv.y);
#endif
#ifdef USE_NORMALMAP
  vNormalMapUv = vec2((uv.x + bbFrame) / uFrames, uv.y);
#endif
#ifdef USE_ALPHAMAP
  vAlphaMapUv = vec2((uv.x + bbFrame) / uFrames, uv.y);
#endif`)
    .replace('#include <project_vertex>', `
  vec4 mvPosition = viewMatrix * vec4(bbWorld, 1.0);
  gl_Position = projectionMatrix * mvPosition;`)
    .replace('#include <worldpos_vertex>', `
#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
  vec4 worldPosition = vec4(bbWorld, 1.0);
#endif`);
  if (lit) shader.vertexShader = shader.vertexShader.replace('#include <defaultnormal_vertex>', `
  vec3 transformedNormal = normalize(mat3(viewMatrix) * bbFwd);`);
}

/**
 * 사진판 나무 InstancedMesh 만들기. list = [{ x, z, s(높이 m), yaw, tint(THREE.Color|null) }]
 * 밑동 높이는 나중에 placeOn 으로 땅에 맞춘다.
 */
export function makeTreeMesh(set, list, q) {
  const { meta } = set, H = meta.h, W = meta.w;
  const g = new THREE.PlaneGeometry(W, H * 1.04);
  g.translate(0, H * 0.5, 0);           // 구울 때 화면 세로 범위 [-0.02H, 1.02H]
  const mat = new THREE.MeshStandardMaterial({ map: set.albedo, normalMap: set.normal, alphaTest: 0.5, roughness: 0.9, metalness: 0, envMapIntensity: 0.6 });
  mat.onBeforeCompile = sh => patchBillboard(sh, meta.frames, true);
  mat.customProgramCacheKey = () => 'tree-billboard';
  const im = new THREE.InstancedMesh(g, mat, list.length);
  const m4 = new THREE.Matrix4(), qy = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), sc = new THREE.Vector3();
  list.forEach((t, k) => {
    const s = t.s / H;
    qy.setFromAxisAngle(up, t.yaw);
    im.setMatrixAt(k, m4.compose(p.set(t.x, 0, t.z), qy, sc.set(s, s, s)));
    if (t.tint) im.setColorAt(k, t.tint);
  });
  im.frustumCulled = false;             // 사각형이 셰이더에서 돌아가므로 경계 구는 대략 (지형 전체를 덮는다)
  im.receiveShadow = true;
  if (q.detail >= 2) {
    const dm = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: set.albedo, alphaTest: 0.5 });
    dm.onBeforeCompile = sh => patchBillboard(sh, meta.frames, false);
    dm.customProgramCacheKey = () => 'tree-billboard-depth';
    im.customDepthMaterial = dm;
    im.castShadow = true;
  }
  im.userData.isTree = true;
  return im;
}
