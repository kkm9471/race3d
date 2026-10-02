// 실사 자료 불러오기 (15회차) — web/assets/ 의 사진 질감·하늘(Poly Haven, CC0)
//
// 레이스를 시작하기 전에 그 맵에 필요한 것만 받아 둔다(preloadReal). 그 뒤 장면을 만드는 코드는
// getTex·getSky 로 이미 받아 둔 것을 바로 꺼내 쓴다(없으면 null → 예전처럼 코드로 그린 질감).
// 화질 '낮음'에서는 아무것도 받지 않는다(가장 약한 PC 를 지키려고).
import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

const BASE = './assets/';
let manifest = null;
const texCache = new Map(), skyCache = new Map(), pending = new Map();

async function loadManifest() {
  if (manifest) return manifest;
  try { manifest = await (await fetch(BASE + 'manifest.json')).json(); } catch { manifest = { tex: {}, sky: {} }; }
  return manifest;
}

function loadImageTex(url, srgb) {
  return new Promise(res => {
    new THREE.TextureLoader().load(url, t => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      res(t);
    }, undefined, () => { console.warn('사진 질감을 못 받았습니다:', url); res(null); });
  });
}

/** 질감 세트 받기: { map, normalMap, arm, w, h(실제 크기 m) } */
function fetchTex(id) {
  if (texCache.has(id)) return Promise.resolve(texCache.get(id));
  const key = 'tex:' + id;
  if (!pending.has(key)) pending.set(key, (async () => {
    const m = (await loadManifest()).tex[id];
    if (!m) { console.warn('목록에 없는 질감:', id); return null; }
    const [map, normalMap, arm] = await Promise.all([loadImageTex(`${BASE}tex/${id}/diff.jpg`, true), loadImageTex(`${BASE}tex/${id}/nor.jpg`, false), loadImageTex(`${BASE}tex/${id}/arm.jpg`, false)]);
    if (!map) return null;
    const set = { id, map, normalMap, arm, w: m.w, h: m.h };
    texCache.set(id, set);
    return set;
  })());
  return pending.get(key);
}

/** 하늘 받기: { hdr(조명용 DataTexture), bg(보이는 하늘 JPG), sunDir(사진 속 해 방향), horizon(지평선 평균색) } */
function fetchSky(id) {
  if (skyCache.has(id)) return Promise.resolve(skyCache.get(id));
  const key = 'sky:' + id;
  if (!pending.has(key)) pending.set(key, (async () => {
    const hdr = await new Promise(res => new HDRLoader().setDataType(THREE.FloatType).load(`${BASE}sky/${id}/env.hdr`, res, undefined, () => res(null)));
    if (!hdr) { console.warn('하늘을 못 받았습니다:', id); return null; }
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    const bg = await loadImageTex(`${BASE}sky/${id}/bg.jpg`, true);
    if (bg) { bg.mapping = THREE.EquirectangularReflectionMapping; bg.wrapS = THREE.RepeatWrapping; bg.wrapT = THREE.ClampToEdgeWrapping; }
    const info = analyseHdr(hdr);
    const sky = { id, hdr, bg, ...info };
    skyCache.set(id, sky);
    return sky;
  })());
  return pending.get(key);
}

/**
 * HDR 사진에서 해 방향(가장 밝은 곳)과 지평선 색(안개 색)을 찾는다.
 * 좌표: three 의 등장방형 매핑(u=0.5 → -Z 방향, v 위가 하늘)과 같은 식으로 방향을 만든다.
 */
function analyseHdr(tex) {
  const { width: W, height: H, data } = tex.image;
  const ch = data.length / (W * H);
  let best = -1, bi = 0, bj = 0;
  const hor = [0, 0, 0]; let hn = 0;
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const k = (j * W + i) * ch, r = data[k], g = data[k + 1], b = data[k + 2];
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (j < H / 2 && l > best) { best = l; bi = i; bj = j; }
      // 지평선 바로 위(고도 2~10°)의 평균 = 안개 색
      const elev = 90 - (j + 0.5) / H * 180;
      if (elev > 2 && elev < 10) { hor[0] += Math.min(r, 4); hor[1] += Math.min(g, 4); hor[2] += Math.min(b, 4); hn++; }
    }
  }
  const u = (bi + 0.5) / W, v = (bj + 0.5) / H;
  const phi = v * Math.PI, theta = u * Math.PI * 2;        // phi: 위에서부터
  // three 등장방형: 방향 (x, y, z) → u = atan2(z, x)/(2π) + 0.5, v = asin(y)/π + 0.5 (y 위). 그 역
  const lon = (u - 0.5) * Math.PI * 2, lat = (0.5 - v) * Math.PI;
  const sunDir = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)).normalize();
  void phi; void theta;
  const k = (bj * W + bi) * ch;
  const sunColor = new THREE.Color(data[k], data[k + 1], data[k + 2]);
  const mx = Math.max(sunColor.r, sunColor.g, sunColor.b) || 1;
  sunColor.multiplyScalar(1 / mx);
  const horizon = new THREE.Color(hor[0] / hn, hor[1] / hn, hor[2] / hn);
  return { sunDir, sunColor, sunPeak: best, horizon };
}

/** 이 맵·화질에 필요한 사진 자료를 미리 받는다. real = realism 설정(없으면 아무것도 안 함) */
export async function preloadReal(real, q) {
  if (!real || !q || q.detail < 1) return;
  const ids = new Set();
  for (const v of Object.values(real)) {
    if (v && typeof v === 'object' && v.tex) ids.add(v.tex);
  }
  const jobs = [...ids].map(fetchTex);
  if (real.sky) jobs.push(fetchSky(real.sky));
  // 너무 오래 걸리면(느린 망) 8초에서 끊고 받은 것만 쓴다 — 출발이 무한히 미뤄지지 않게
  await Promise.race([Promise.all(jobs), new Promise(r => setTimeout(r, 8000))]);
}

export const getTex = id => texCache.get(id) || null;
export const getSky = id => skyCache.get(id) || null;

/**
 * 질감 세트를 재질에 입힌다. 같은 사진을 여러 재질이 쓰므로 반복 배율(repeat)은 사진 하나를 복제해 따로 둔다.
 * spec = { tex, scale(가로·세로 몇 m 마다 한 번), tint, rough(거칠기 배율), normal(울퉁불퉁 세기) }
 * uvMeters = 이 메쉬의 UV 1 이 몇 m 인지 [u, v]
 */
export function applyTexSet(mat, spec, uvMeters, aniso = 8) {
  const set = spec && getTex(spec.tex);
  if (!set) return false;
  const sx = (spec.scale ?? set.w), sy = (spec.scale ?? set.h);
  const rep = [uvMeters[0] / sx, uvMeters[1] / sy];
  const clone = t => { if (!t) return null; const c = t.clone(); c.repeat.set(rep[0], rep[1]); c.anisotropy = aniso; c.needsUpdate = true; return c; };
  mat.map = clone(set.map);
  mat.normalMap = clone(set.normalMap);
  if (mat.normalMap) { const n = spec.normal ?? 1; mat.normalScale = new THREE.Vector2(n, n); }
  const arm = clone(set.arm);
  mat.roughnessMap = arm; mat.aoMap = arm; mat.aoMapIntensity = spec.ao ?? 0.8;
  mat.metalnessMap = null; mat.metalness = spec.metal ?? 0;
  mat.roughness = spec.rough ?? 1;
  mat.color = new THREE.Color(spec.tint ?? 0xffffff);
  mat.needsUpdate = true;
  return true;
}
