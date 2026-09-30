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

export const QUALITY = {
  low: { name: '낮음', scale: 0.75, maxDpr: 1, shadow: 0, post: false, msaa: 0, bloom: false, trees: 0.35, fogMul: 1.5, detail: 0 },
  medium: { name: '보통', scale: 1.0, maxDpr: 1, shadow: 2048, post: true, msaa: 0, bloom: true, trees: 0.75, fogMul: 1.0, detail: 1 },
  high: { name: '높음', scale: 1.0, maxDpr: 1.5, shadow: 4096, post: true, msaa: 4, bloom: true, trees: 1.0, fogMul: 0.8, detail: 2 },
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
    const sun = def.sun || { elev: 30, azim: 200 };
    const phi = THREE.MathUtils.degToRad(90 - sun.elev), th = THREE.MathUtils.degToRad(sun.azim);
    this.sunDir.setFromSphericalCoords(1, phi, th);
    this.sky.material.uniforms.sunPosition.value.copy(this.sunDir);
    // 태양빛 색: 낮을수록 주황
    const low = THREE.MathUtils.clamp(1 - sun.elev / 35, 0, 1);
    this.sun.color.setRGB(1, 0.93 - low * 0.18, 0.84 - low * 0.34);
    this.sun.intensity = 2.3 + (1 - low) * 0.9;
    this.renderer.toneMappingExposure = 0.72 + low * 0.12;
    // 반사맵: 하늘만 있는 장면을 구워 쓴다
    const envScene = new THREE.Scene();
    const sky2 = new Sky();
    sky2.scale.setScalar(1000);
    for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG', 'sunPosition']) {
      const v = this.sky.material.uniforms[k].value;
      sky2.material.uniforms[k].value = v.clone ? v.clone() : v;
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
    sky2.geometry.dispose(); sky2.material.dispose(); ground.geometry.dispose(); ground.material.dispose();
    // 안개: 지평선 근처 하늘색
    const fogCol = new THREE.Color(def.fogColor ?? (low > 0.5 ? 0xc7b9a5 : 0xb9cadb));
    this.scene.fog = new THREE.FogExp2(fogCol, (def.fog ?? 0.0006) * this.q.fogMul);
    this.hemi.color.set(low > 0.5 ? 0xffe0c0 : 0xcfe2ff);
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
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  info() {
    const i = this.renderer.info;
    return { calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, texs: i.memory.textures };
  }
}
