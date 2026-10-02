// 차고 — 차 모형 확인용 (?garage=1[&focus=번호&yaw=도&pitch=도&dist=m])
import * as THREE from 'three';
import { CARS } from '../sim/cars.js';
import { prepare } from '../sim/car.js';
import { buildCar, PAINT } from './carmesh.js';
import { TRACK_DEFS } from '../sim/tracks.js';
import * as TX from './textures.js';

export function garage(gfx, Q) {
  window.__garage = true;
  gfx.setEnvironment(TRACK_DEFS[0]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: TX.asphalt(8), roughness: 0.9 }));
  ground.material.map.repeat.set(40, 40);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  gfx.scene.add(ground);
  const cars = CARS.map((spec, k) => {
    const P = prepare(spec);
    const m = buildCar(spec, P, PAINT[k % PAINT.length], gfx.q.detail);
    m.position.set((k - (CARS.length - 1) / 2) * 5.2, spec.cgH, 0);
    m.userData.blob.visible = !gfx.q.shadow;
    gfx.scene.add(m);
    return m;
  });
  if (Q.get('grid') === '1') {
    // 칸에 차마다 따로 찍는다 (후처리 없이 바로) — 차 수에 맞춰 6×3 등 (14회차: 18대)
    const yawG = +(Q.get('yaw') ?? 35) * Math.PI / 180, pitchG = +(Q.get('pitch') ?? 12) * Math.PI / 180;
    const r = gfx.renderer;
    (function loopG() {
      requestAnimationFrame(loopG);
      const cols = Math.ceil(Math.sqrt(cars.length * 1.8)), rows = Math.ceil(cars.length / cols);
      const W = gfx.w, H = gfx.h, cw = W / cols, ch = H / rows;
      r.setScissorTest(true);
      cars.forEach((m, k) => {
        const cx = (k % cols) * cw, cy = (rows - 1 - Math.floor(k / cols)) * ch;
        r.setViewport(cx, cy, cw, ch); r.setScissor(cx, cy, cw, ch);
        const c = m.position.clone(); c.y = 0.55;
        const d = 7.2;
        gfx.camera.position.set(c.x + Math.sin(yawG) * Math.cos(pitchG) * d, c.y + Math.sin(pitchG) * d, c.z + Math.cos(yawG) * Math.cos(pitchG) * d);
        gfx.camera.aspect = cw / ch; gfx.camera.fov = 34; gfx.camera.updateProjectionMatrix();
        gfx.camera.lookAt(c);
        gfx.followShadow(c);
        gfx.sky.position.copy(gfx.camera.position);
        r.render(gfx.scene, gfx.camera);
      });
      r.setScissorTest(false);
    })();
    return;
  }
  const focus = Q.get('focus');
  const yaw = +(Q.get('yaw') ?? 35) * Math.PI / 180, pitch = +(Q.get('pitch') ?? 14) * Math.PI / 180;
  const cam = gfx.camera;
  if (focus !== null) {
    const m = cars[+focus];
    const d = +(Q.get('dist') ?? 7.5);
    const c = m.position.clone(); c.y = 0.7;
    cam.position.set(c.x + Math.sin(yaw) * Math.cos(pitch) * d, c.y + Math.sin(pitch) * d, c.z + Math.cos(yaw) * Math.cos(pitch) * d);
    cam.lookAt(c);
    gfx.followShadow(c);
  } else {
    cam.position.set(8, 9, 30); cam.lookAt(0, 0.5, 0);
    gfx.followShadow(new THREE.Vector3(0, 0, 0));
  }
  cam.fov = 40; cam.updateProjectionMatrix();
  (function loop() { requestAnimationFrame(loop); gfx.render(); })();
}
