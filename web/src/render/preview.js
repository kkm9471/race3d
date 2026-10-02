// 대기실 차 미리보기 — 고른 차를 원판 위에 3D 로 보여 주고, 마우스로 끌어 360° 돌려 본다 (2026-10-02 사용자 요청)
// 레이스 화면과는 따로 작은 그리기 판을 하나 쓴다. 대기실이 보일 때만 그리고, 다른 화면으로 가면 멈춘다.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CAR_BY_ID, CARS } from '../sim/cars.js';
import { prepare } from '../sim/car.js';
import { buildCar } from './carmesh.js';

export class CarPreview {
  constructor(canvas) {
    this.canvas = canvas;
    const r = this.r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(r);
    this.envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture;   // 차체 반사용 실내 조명
    scene.environment = this.envTex;
    pm.dispose();
    this.cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    const key = new THREE.DirectionalLight(0xffffff, 2.0);
    key.position.set(4, 8, 5); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 });
    key.shadow.radius = 4;
    scene.add(key, new THREE.HemisphereLight(0xdfe8ff, 0x3a3020, 0.5));
    // 바닥 원판(턴테이블)
    const disc = new THREE.Mesh(new THREE.CircleGeometry(3.6, 72), new THREE.MeshStandardMaterial({ color: 0x2b313b, roughness: 0.55, metalness: 0.25 }));
    disc.rotation.x = -Math.PI / 2; disc.receiveShadow = true;
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.55, 3.7, 72), new THREE.MeshBasicMaterial({ color: 0xf2b134 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.002;
    scene.add(disc, ring);
    this.yaw = 0.75; this.pitch = 0.26; this.dist = 9; this.auto = true;
    this.running = false; this.mesh = null; this.key = '';
    // 끌어서 돌리기 · 휠로 확대 (손가락도 같은 포인터 이벤트로)
    canvas.style.touchAction = 'none';
    let drag = null;
    canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; this.auto = false; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; });
    canvas.addEventListener('pointermove', e => {
      if (!drag) return;
      this.yaw -= (e.clientX - drag.x) * 0.012;
      this.pitch = Math.max(0.03, Math.min(1.2, this.pitch + (e.clientY - drag.y) * 0.006));
      drag = { x: e.clientX, y: e.clientY };
    });
    const up = () => { drag = null; canvas.style.cursor = 'grab'; };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', e => { e.preventDefault(); this.dist = Math.max(5.5, Math.min(16, this.dist * (e.deltaY > 0 ? 1.08 : 0.93))); }, { passive: false });
    canvas.addEventListener('dblclick', () => { this.auto = true; });     // 두 번 누르면 다시 저절로 돈다
    canvas.addEventListener('webglcontextlost', e => e.preventDefault());
  }

  /** 차(id)·색으로 바꾼다 (같으면 그대로) */
  setCar(id, paintHex) {
    const key = id + ':' + paintHex;
    if (key === this.key) return;
    this.key = key;
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); });
      this.mesh = null;
    }
    const spec = CAR_BY_ID[id] || CARS[0];
    const m = buildCar(spec, prepare(spec), paintHex, 2);
    m.position.y = spec.cgH;
    m.traverse(o => { if (o.isMesh) o.castShadow = true; });
    if (m.userData.blob) m.userData.blob.visible = false;
    this.scene.add(m);
    this.mesh = m;
    this.dist = Math.max(8, spec.dims[0] * 1.95);
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = () => { if (!this.running) return; requestAnimationFrame(loop); this.frame(); };
    requestAnimationFrame(loop);
  }

  stop() { this.running = false; }

  frame() {
    const c = this.canvas, w = c.clientWidth | 0, h = c.clientHeight | 0;
    if (!w || !h) return;                       // 화면에 안 보이면 그리지 않는다
    if (c.width !== Math.round(w * this.r.getPixelRatio()) || c.height !== Math.round(h * this.r.getPixelRatio())) {
      this.r.setSize(w, h, false);
      this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
    }
    if (this.auto) this.yaw += 0.006;
    const cp = Math.cos(this.pitch), t = new THREE.Vector3(0, 0.55, 0);
    this.cam.position.set(Math.sin(this.yaw) * cp * this.dist, 0.55 + Math.sin(this.pitch) * this.dist, Math.cos(this.yaw) * cp * this.dist);
    this.cam.lookAt(t);
    this.r.render(this.scene, this.cam);
  }
}
