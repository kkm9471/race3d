// 렌더러·하늘·태양·그림자·안개·후처리, 그리고 품질 설정(낮음/보통/높음)
//
// 분위기(포르자·그란투리스모 느낌)의 핵심은 모델 수가 아니라 빛이다:
//  · 하늘은 실제 대기산란 모형(Preetham) — 태양 고도에 따라 노을·한낮 색이 저절로 바뀐다
//  · 그 하늘을 반사맵으로 구워 차 도장·유리에 비친다(PMREM)
//  · ACES 톤매핑 + 약한 블룸 + 색보정(대비·채도·비네트)
//  · 안개 색을 지평선 하늘색에 맞춰 원경이 공기 속으로 사라지게

import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { getSky } from './assets.js';
import { realFor } from './realism.js';
import { THEMES } from './themes/index.js';

export const QUALITY = {
  low: { name: '낮음', scale: 0.75, maxDpr: 1, shadow: 0, post: false, msaa: 0, bloom: false, trees: 0.35, fogMul: 1.5, detail: 0 },
  medium: { name: '보통', scale: 1.0, maxDpr: 1, shadow: 2048, post: true, msaa: 0, bloom: true, trees: 0.75, fogMul: 1.0, detail: 1 },
  high: { name: '높음', scale: 1.0, maxDpr: 1.5, shadow: 4096, post: true, msaa: 4, bloom: true, trees: 1.0, fogMul: 0.8, detail: 2 },
};

// 번짐(bloom) 전에 밝기 상한: 하늘의 태양 원반은 다른 것보다 수천 배 밝아서 그대로 번지면
// 해를 마주 보는 구간에서 화면 절반이 하얗게 덮여 앞차가 안 보였다 (색조는 유지하고 크기만 줄임)
const ClampShader = {
  uniforms: { tDiffuse: { value: null }, maxV: { value: 5.0 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform sampler2D tDiffuse; uniform float maxV; varying vec2 vUv;\n' +
    'void main() { vec4 c = texture2D(tDiffuse, vUv); float m = max(max(c.r, c.g), c.b); gl_FragColor = vec4(c.rgb * min(1.0, maxV / max(m, 1e-4)), c.a); }',
};

// 색보정: 대비·채도·따뜻한 톤·비네트 (sRGB 공간에서)
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uContrast: { value: 1.10 }, uSat: { value: 1.18 }, uWarm: { value: 0.025 }, uVig: { value: 0.30 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uContrast, uSat, uWarm, uVig; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb;
      col = (col - 0.5) * uContrast + 0.5;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSat);
      col += vec3(uWarm, uWarm * 0.35, -uWarm * 0.6);
      vec2 d = vUv - 0.5;
      col *= 1.0 - uVig * dot(d, d) * 2.2;
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), c.a);
    }`,
};

export class Gfx {
  constructor(canvas, qualityKey = 'medium') {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 6000);
    this.sunDir = new THREE.Vector3(0.4, 0.5, 0.3).normalize();
    // 태양
    this.sun = new THREE.DirectionalLight(0xfff1dd, 3.0);
    this.sun.castShadow = false;
    this.scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xbfd8ff, 0x5a4a38, 0.22);
    this.scene.add(this.hemi);
    // 하늘
    this.sky = new Sky();
    this.sky.scale.setScalar(5000);
    this.sky.material.uniforms.turbidity.value = 2.6;
    this.sky.material.uniforms.rayleigh.value = 1.2;
    this.sky.material.uniforms.mieCoefficient.value = 0.004;
    this.sky.material.uniforms.mieDirectionalG.value = 0.82;
    this.scene.add(this.sky);
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    // 그래픽 드라이버가 재설정되면(WebGL 컨텍스트 복구) 하늘 반사맵을 다시 굽는다
    canvas.addEventListener('webglcontextlost', e => e.preventDefault());
    canvas.addEventListener('webglcontextrestored', () => { if (this.envDef) this.setEnvironment(this.envDef); });
    this.envRT = null;
    this.scaleDyn = 1;       // 동적 해상도 (fps 가 모자라면 낮춘다)
    this.setQuality(qualityKey);
  }

  setQuality(key) {
    this.qKey = QUALITY[key] ? key : 'medium';
    const q = this.q = QUALITY[this.qKey];
    const r = this.renderer;
    r.shadowMap.enabled = q.shadow > 0;
    this.sun.castShadow = q.shadow > 0;
    if (q.shadow > 0) {
      this.sun.shadow.mapSize.set(q.shadow, q.shadow);
      if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
      const s = this.sun.shadow.camera;
      const half = q.shadow >= 4096 ? 70 : 55;
      s.left = -half; s.right = half; s.top = half; s.bottom = -half; s.near = 1; s.far = 400;
      s.updateProjectionMatrix();
      this.sun.shadow.bias = -0.0004;
      this.sun.shadow.normalBias = 0.04;
      this.shadowHalf = half;
    }
    r.shadowMap.type = THREE.PCFShadowMap;
    if (q.shadow > 0) this.sun.shadow.radius = q.shadow >= 4096 ? 3 : 2;
    r.shadowMap.needsUpdate = true;
    this.buildComposer();
    this.resize();
    // 재질이 그림자 설정을 다시 컴파일하도록
    this.scene.traverse(o => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { m.needsUpdate = true; }); } });
  }

  buildComposer() {
    if (this.composer) { this.composer.dispose?.(); this.composer = null; }
    const q = this.q;
    if (!q.post) return;
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: q.msaa || 0 });
    const c = new EffectComposer(this.renderer, rt);
    c.addPass(new RenderPass(this.scene, this.camera));
    if (q.bloom) {
      c.addPass(new ShaderPass(ClampShader));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.14, 0.35, 1.0);
      c.addPass(this.bloom);
    }
    c.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader);
    c.addPass(this.grade);
    if (!q.msaa) {
      this.fxaa = new ShaderPass(FXAAShader);
      c.addPass(this.fxaa);
    } else this.fxaa = null;
    this.composer = c;
  }

  resize() {
    const w = Math.max(1, this.canvas.clientWidth), h = Math.max(1, this.canvas.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, this.q.maxDpr) * this.q.scale * this.scaleDyn;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.composer) {
      this.composer.setPixelRatio(dpr);
      this.composer.setSize(w, h);
      if (this.fxaa) this.fxaa.material.uniforms.resolution.value.set(1 / (w * dpr), 1 / (h * dpr));
      if (this.bloom) this.bloom.resolution.set(w * dpr / 2, h * dpr / 2);
    }
    this.w = w; this.h = h; this.dpr = dpr;
  }

  /** 트랙마다 태양 위치·안개 */
  setEnvironment(def) {
    this.envDef = def;
    const sun = def.sun || { elev: 30, azim: 200 };
    const phi = THREE.MathUtils.degToRad(90 - sun.elev), th = THREE.MathUtils.degToRad(sun.azim);
    this.sunDir.setFromSphericalCoords(1, phi, th);
    this.sky.material.uniforms.sunPosition.value.copy(this.sunDir);
    // 태양빛 색: 낮을수록 주황
    const low = THREE.MathUtils.clamp(1 - sun.elev / 35, 0, 1);
    this.sun.color.setRGB(1, 0.93 - low * 0.18, 0.84 - low * 0.34);
    this.sun.intensity = 2.3 + (1 - low) * 0.9;
    this.renderer.toneMappingExposure = 0.72 + low * 0.12;
    this.hemi.intensity = 0.22;
    // 밤·우주 하늘 (def.night = { top, horizon, stars, moon, ambient, exposure, moonDisc }) — 2026-10-02 14회차 테마 맵
    if (this.nightSky) { this.scene.remove(this.nightSky); this.nightSky.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); }); this.nightSky = null; }
    const nd = def.night || null;
    this.sky.visible = !nd;
    if (nd) {
      this.nightSky = makeNightSky(nd, this.sunDir, 4500);
      this.scene.add(this.nightSky);
      this.sun.color.set(nd.moonColor ?? 0xc6d2ff);
      // 밤이라도 길·차가 잘 보여야 한다(카트라이더 밤 맵처럼 밝은 밤) — 기본값은 화면으로 맞춤
      this.sun.intensity = nd.moon ?? 2.4;
      this.hemi.intensity = nd.ambient ?? 1.6;
      this.renderer.toneMappingExposure = nd.exposure ?? 1.0;
    }
    // 반사맵: 하늘만 있는 장면을 구워 쓴다
    const envScene = new THREE.Scene();
    const sky2 = nd ? makeNightSky({ ...nd, stars: 0, moonDisc: false }, this.sunDir, 900) : new Sky();
    if (!nd) {
      sky2.scale.setScalar(1000);
      for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG', 'sunPosition']) {
        const v = this.sky.material.uniforms[k].value;
        sky2.material.uniforms[k].value = v.clone ? v.clone() : v;
      }
    }
    envScene.add(sky2);
    // 아래쪽 반구는 땅색이 비치도록
    const ground = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: def.style === 'mountain' ? 0x3c4a30 : 0x4d5a36, side: THREE.BackSide }));
    envScene.add(ground);
    if (this.envRT) this.envRT.dispose();
    this.envRT = this.pmrem.fromScene(envScene, 0.02);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 0.55;
    sky2.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); }); ground.geometry.dispose(); ground.material.dispose();
    // 안개: 지평선 근처 하늘색
    const fogCol = new THREE.Color(def.fogColor ?? (nd ? nd.horizon ?? 0x1a2240 : low > 0.5 ? 0xc7b9a5 : 0xb9cadb));
    this.scene.fog = new THREE.FogExp2(fogCol, (def.fog ?? 0.0006) * this.q.fogMul);
    this.hemi.color.set(nd ? nd.ambientColor ?? 0x8f9fd8 : low > 0.5 ? 0xffe0c0 : 0xcfe2ff);
    // ── 실사 하늘(15회차): 하늘 사진(Poly Haven HDR)으로 조명·반사·보이는 하늘. 보통·높음 화질, 미리 받아 둔 경우만 ──
    this.scene.background = null;
    this.scene.backgroundRotation.set(0, 0, 0); this.scene.environmentRotation.set(0, 0, 0);
    const real = !nd && this.q.detail >= 1 ? realFor(def, THEMES[def.theme]) : null;
    const ps = real && real.sky ? getSky(real.sky) : null;
    this.photoSky = !!ps;
    // 번짐(블룸): 실사 하늘은 해가 실제 밝기라 차·연석이 하얗게 날아갔다 → 문턱을 올리고 약하게
    if (this.bloom) { this.bloom.threshold = ps ? (real.bloomT ?? 1.8) : 1.0; this.bloom.strength = ps ? (real.bloomS ?? 0.09) : 0.14; }
    if (ps) {
      // 사진 속 해 방위를 설계도의 해 방위(sun.azim)로 돌린다(고도는 사진 그대로) — 맵마다 정해 둔 '해를 마주 보지 않는 방향'을 지키려고
      const want = Math.atan2(this.sunDir.z, this.sunDir.x), have = Math.atan2(ps.sunDir.z, ps.sunDir.x);
      const a = have - want;
      this.sunDir.copy(ps.sunDir).applyAxisAngle(new THREE.Vector3(0, 1, 0), a).normalize();
      this.scene.backgroundRotation.set(0, -a, 0); this.scene.environmentRotation.set(0, -a, 0);
      this.sky.visible = false;
      this.scene.background = ps.bg || ps.hdr;
      this.scene.backgroundIntensity = real.bgInt ?? 1;
      if (!ps.pmrem) ps.pmrem = this.pmrem.fromEquirectangular(ps.hdr);
      this.scene.environment = ps.pmrem.texture;
      this.scene.environmentIntensity = real.envInt ?? 1.0;
      this.sun.color.copy(ps.sunColor);
      this.sun.intensity = real.sun ?? 3.0;
      this.hemi.intensity = real.hemi ?? 0.0;
      this.renderer.toneMappingExposure = real.exposure ?? 0.85;
      this.scene.fog = new THREE.FogExp2(ps.horizon.clone().multiplyScalar(real.fogMul ?? 0.9), (real.fog ?? def.fog ?? 0.0005) * this.q.fogMul);
    }
  }

  /** 그림자 상자를 내 차 주변으로 (화소 격자에 맞춰 움직여 그림자가 떨리지 않게) */
  followShadow(p) {
    if (!this.sun.castShadow) {
      this.sun.position.copy(p).addScaledVector(this.sunDir, 200);
      this.sun.target.position.copy(p);
      return;
    }
    const half = this.shadowHalf, texel = half * 2 / this.q.shadow;
    const d = this.sunDir;
    // 태양 방향 기준 좌표계에서 스냅
    const z = d.clone(), x = new THREE.Vector3(0, 1, 0).cross(z).normalize(), y = z.clone().cross(x);
    const px = Math.round(p.dot(x) / texel) * texel, py = Math.round(p.dot(y) / texel) * texel, pz = p.dot(z);
    const c = x.multiplyScalar(px).add(y.multiplyScalar(py)).add(z.clone().multiplyScalar(pz));
    this.sun.target.position.copy(c);
    this.sun.position.copy(c).addScaledVector(d, 200);
    this.sun.target.updateMatrixWorld();
  }

  render() {
    this.sky.position.copy(this.camera.position);
    if (this.nightSky) this.nightSky.position.copy(this.camera.position);
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  info() {
    const i = this.renderer.info;
    return { calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, texs: i.memory.textures };
  }
}

/**
 * 밤·우주 하늘: 위(top)·지평선(horizon) 색 그라데이션 공 + 별 + 달 원판. 카메라를 따라다닌다(render 에서).
 * nd = { top, horizon, stars: 개수(기본 1600), moonDisc: true, moonSize: 110 }
 */
function makeNightSky(nd, moonDir, R) {
  const grp = new THREE.Group();
  const g = new THREE.SphereGeometry(R, 48, 24);
  const top = new THREE.Color(nd.top ?? 0x060a1c), hor = new THREE.Color(nd.horizon ?? 0x1a2240), c = new THREE.Color();
  const pa = g.attributes.position, col = new Float32Array(pa.count * 3);
  for (let i = 0; i < pa.count; i++) {
    const h = Math.max(0, pa.getY(i) / R);
    c.copy(hor).lerp(top, Math.pow(h, 0.5));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  grp.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, toneMapped: false, depthWrite: false })));
  const n = nd.stars ?? 1600;
  if (n > 0) {
    const sp = new Float32Array(n * 3);
    let seed = 99;
    const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < n; i++) {
      const y = 0.06 + r() * 0.94, a = r() * Math.PI * 2, rr = Math.sqrt(1 - y * y);
      sp[i * 3] = Math.cos(a) * rr * R * 0.95; sp[i * 3 + 1] = y * R * 0.95; sp[i * 3 + 2] = Math.sin(a) * rr * R * 0.95;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    grp.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.7, sizeAttenuation: false, fog: false, toneMapped: false, transparent: true, opacity: 0.9, depthWrite: false })));
  }
  if (nd.moonDisc !== false) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(nd.moonSize ?? 110, 24, 12), new THREE.MeshBasicMaterial({ color: nd.moonDiscColor ?? 0xfff3d6, fog: false, toneMapped: false }));
    m.position.copy(moonDir).multiplyScalar(R * 0.9);
    grp.add(m);
  }
  grp.renderOrder = -1;
  return grp;
}
