// 레이스 화면 — 시뮬레이션 상태를 3D 장면에 옮긴다 (차·바퀴·등·카메라·연기·스키드마크·불꽃)
import * as THREE from 'three';
import { buildTrackScene } from './trackmesh.js';
import { buildCar, PAINT } from './carmesh.js';
import { TrackWorld } from '../sim/track.js';

const tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();

export class RaceView {
  constructor(gfx, session, trackDef) {
    this.gfx = gfx;
    this.session = session;
    this.def = trackDef;
    const T = session.sim.T;
    this.T = T;
    this.world = new TrackWorld(T);
    gfx.setEnvironment(trackDef);
    this.track = buildTrackScene(T, this.world, gfx.q, trackDef);
    gfx.scene.add(this.track);
    // 나무를 지형 위에 세운다
    const terrain = this.track.children.find(o => o.userData.heightAt);
    this.terrain = terrain;
    for (const o of this.track.children) if (o.userData.placeOn && terrain) o.userData.placeOn(terrain.userData.heightAt);
    this.cars = session.sim.cars.map((c, k) => {
      // 차 색: 대기실에서 고른 색(cfg.players[k].paint), 없으면 예전처럼 자리 순서 색
      const m = buildCar(c.spec, c.P, PAINT[(session.sim.cfg.players[k]?.paint ?? k) % PAINT.length], gfx.q.detail);
      m.userData.blob.visible = !gfx.q.shadow;
      gfx.scene.add(m);
      return { mesh: m, off: new THREE.Vector3(), yawOff: 0, lastShown: new THREE.Vector3(), ghost: false, spinA: [0, 0, 0, 0] };
    });
    this.pose = new Float64Array(16);
    this.camMode = 0;
    this.camPos = new THREE.Vector3();
    this.camLook = new THREE.Vector3();
    this.camInit = false;
    this.shake = 0;
    this.fx = new Effects(gfx.scene, gfx.q);
    this.names = [];
  }

  dispose() {
    this.gfx.scene.remove(this.track);
    this.track.userData.dispose();
    for (const c of this.cars) { this.gfx.scene.remove(c.mesh); c.mesh.userData.dispose(); }
    this.fx.dispose();
  }

  /** alpha = 프레임 사이 보간값, dt = 실제 경과(초) */
  update(alpha, dt, followSlot, look) {
    const sim = this.session.sim;
    const P = this.pose;
    for (let k = 0; k < this.cars.length; k++) {
      const v = this.cars[k], car = sim.cars[k], m = v.mesh;
      if (!this.session.pose(k, alpha, P)) continue;
      const target = tmpV.set(P[0], P[1], P[2]);
      // 롤백으로 생긴 순간이동은 녹여서 보인다
      if (v.inited) {
        const jump = tmpV2.copy(v.lastShown).sub(target).sub(v.off);
        // 한 번에 3m 넘게 튀면(리셋 등) 녹이지 않는다
        if (jump.lengthSq() > 0.0004 && jump.lengthSq() < 9 && this.session.rollbacks !== v.rb) v.off.add(jump.multiplyScalar(1));
      }
      v.rb = this.session.rollbacks;
      v.off.multiplyScalar(Math.exp(-dt / 0.08));
      m.position.copy(target).add(v.off);
      m.quaternion.set(P[4], P[5], P[6], P[3]);
      v.lastShown.copy(target);
      v.inited = true;
      // 바퀴
      const W = m.userData.wheels;
      for (let i = 0; i < 4; i++) {
        const wi = car.P.wheels[i];
        const comp = P[7 + i];
        W[i].pivot.position.y = W[i].base - wi.xs + Math.min(comp, 0.3) + (comp <= 0 ? 0 : 0);
        W[i].pivot.rotation.y = wi.front ? -P[15] * (car.out.maxSteer || 0.5) * (wi.left === (P[15] < 0) ? 1.08 : 0.93) : 0;
        v.spinA[i] += P[11 + i] * dt;
        W[i].spin.rotation.x = v.spinA[i];
      }
      m.userData.setBrake(car.st.brk);
      if (m.userData.setBoost) m.userData.setBoost(car.st.boostT > 0 ? Math.min(1, car.st.boostK || 1) : 0);
      const ghost = sim.isGhost(car);
      if (ghost !== v.ghost) { m.userData.setGhost(ghost || !!v.see); v.ghost = ghost; }
      // 연기·스키드마크
      this.fx.car(k, car, m, dt);
    }
    // 충돌 불꽃·흔들림
    for (const e of this.session.takeEvents()) {
      if ((e.t === 'car' || e.t === 'wall') && e.vn > 2.5) {
        this.fx.sparks(e.x, e.y, e.z, Math.min(1, e.vn / 15));
        if (e.a === followSlot || e.b === followSlot) this.shake = Math.min(1, this.shake + e.vn / 20);
        if (this.onHit) this.onHit(e, followSlot);      // 부딪힘 소리 (main.js 가 연결)
      }
    }
    this.fx.update(dt);
    this.updateCamera(followSlot, dt, look);
    this.clearView(followSlot);
    this.gfx.followShadow(this.cars[followSlot]?.mesh.position || tmpV.set(0, 0, 0));
    // 테마 소품 움직임 (풍차·깜박이는 등) — 그림만, 주행 계산과 무관
    const anims = this.track.userData.anims;
    if (anims && anims.length) { this.animT = (this.animT || 0) + dt; for (const f of anims) { try { f(this.animT, dt); } catch (e) { anims.length = 0; console.warn('테마 움직임 오류:', e); } } }
    // 출발 신호등
    const g = this.track.userData.lights.gantry;
    if (g) {
      const f = this.session.frame;
      const on = f < 60 ? 0 : f < 240 ? Math.min(5, Math.floor((f - 60) / 36) + 1) : 0;
      g.forEach((mat, i) => { mat.emissiveIntensity = i < on ? 6 : 0; });
    }
  }

  /** 카메라와 내 차 사이에 낀 가까운 차는 반투명 (뒤차가 화면을 가리지 않게) */
  clearView(k) {
    const me = this.cars[k];
    if (!me) return;
    const cam = this.gfx.camera.position;
    const toMe = tmpV.copy(me.mesh.position).sub(cam);
    const dMe = toMe.length();
    toMe.normalize();
    for (let j = 0; j < this.cars.length; j++) {
      const v = this.cars[j];
      if (j === k) continue;
      const rel = tmpV2.copy(v.mesh.position).sub(cam);
      const along = rel.dot(toMe);
      const side = Math.sqrt(Math.max(0, rel.lengthSq() - along * along));
      const block = along > -1 && along < dMe && side < 2.4;
      if (block !== !!v.see) {
        v.see = block;
        if (!v.ghost) v.mesh.userData.setGhost(block);
      }
    }
  }

  updateCamera(k, dt, look) {
    const v = this.cars[k];
    if (!v) return;
    const m = v.mesh, car = this.session.sim.cars[k];
    const cam = this.gfx.camera;
    const fwd = tmpV.set(0, 0, 1).applyQuaternion(m.quaternion);
    fwd.y = 0; fwd.normalize();
    const vel = tmpV2.set(car.st.vx, 0, car.st.vz);
    const sp = vel.length();
    // 부스터: 시야가 살짝 넓어져 속도감 (부드럽게)
    this.boostFov = (this.boostFov || 0) + ((car.st.boostT > 0 ? 9 : 0) - (this.boostFov || 0)) * Math.min(1, dt * 6);
    // 드리프트할 때는 진행방향 쪽으로 카메라가 돌아 차 옆모습이 보이게
    const dir = sp > 4 ? fwd.clone().lerp(vel.normalize(), 0.35).normalize() : fwd.clone();
    if (look) dir.multiplyScalar(-1);
    const len = car.P.Lb;
    const modes = [
      { back: 5.2 + len * 0.55, up: 1.9, ahead: 3, fov: 62 },     // 추적
      { back: 8.5 + len * 0.7, up: 3.2, ahead: 5, fov: 58 },      // 먼 추적
      { back: -0.3, up: 0.75, ahead: 20, fov: 72, inside: true }, // 보닛
    ];
    const md = modes[this.camMode % modes.length];
    if (md.inside) {
      const p = tmpV.set(0, car.P.Hb - car.spec.cgH - 0.25, car.P.Lb * 0.12).applyQuaternion(m.quaternion).add(m.position);
      cam.position.copy(p);
      const t = new THREE.Vector3(0, car.P.Hb - car.spec.cgH - 0.4, 30).applyQuaternion(m.quaternion).add(m.position);
      if (look) { t.sub(m.position).multiplyScalar(-1).add(m.position); }
      cam.lookAt(t);
      cam.fov = md.fov + Math.min(10, sp * 0.12) + this.boostFov;
      cam.updateProjectionMatrix();
      this.camInit = false;
      return;
    }
    const want = m.position.clone().addScaledVector(dir, -md.back);
    want.y = m.position.y + md.up;
    // 지형·벽 속으로 들어가지 않게: 노면보다는 위
    const L = this.world.locate(want.x, want.z, car.st.hint);
    const gh = this.world.heightAt(L.i, L.t, Math.max(-60, Math.min(60, L.d))).h;
    if (want.y < gh + 0.8) want.y = gh + 0.8;
    const lookAt = m.position.clone().addScaledVector(dir, md.ahead);
    lookAt.y += 0.9;
    if (!this.camInit) { this.camPos.copy(want); this.camLook.copy(lookAt); this.camInit = true; }
    const kpos = 1 - Math.exp(-dt * 9), klook = 1 - Math.exp(-dt * 14);
    this.camPos.lerp(want, kpos);
    this.camLook.lerp(lookAt, klook);
    cam.position.copy(this.camPos);
    if (this.shake > 0.01) {
      // 흔들림: 위아래·앞뒤만(좌우 기울임=롤은 멀미 때문에 넣지 않는다)
      const s = this.shake * 0.12;
      cam.position.y += (Math.random() - 0.5) * s;
      cam.position.addScaledVector(fwd, (Math.random() - 0.5) * s);
      this.shake *= Math.exp(-dt * 6);
    }
    cam.up.set(0, 1, 0);
    cam.lookAt(this.camLook);
    cam.fov = md.fov + Math.min(12, sp * 0.14) + this.boostFov;
    cam.updateProjectionMatrix();
  }

  /** 이름표 등에 쓰는 화면 좌표 */
  screenPos(k, out) {
    const m = this.cars[k].mesh, cam = this.gfx.camera;
    tmpV.copy(m.position); tmpV.y += 1.8;
    // 카메라 뒤에 있으면 숨긴다 (투영 좌표는 뒤쪽도 앞처럼 뒤집혀 나와서 믿으면 안 된다)
    cam.getWorldDirection(tmpV2);
    const ahead = tmpV2.dot(tmpV.clone().sub(cam.position));
    tmpV.project(cam);
    out.x = (tmpV.x * 0.5 + 0.5) * this.gfx.w;
    out.y = (-tmpV.y * 0.5 + 0.5) * this.gfx.h;
    out.vis = ahead > 1 && Math.abs(tmpV.x) < 1.1 && Math.abs(tmpV.y) < 1.1;
    out.dist = m.position.distanceTo(cam.position);
    return out;
  }
}

/** 타이어 연기·흙먼지·스키드마크·불꽃 */
class Effects {
  constructor(scene, q) {
    this.scene = scene;
    this.q = q;
    const n = q.detail >= 2 ? 700 : q.detail >= 1 ? 400 : 150;
    // 연기: 점 스프라이트
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    this.smokeTex = new THREE.CanvasTexture(c);
    this.N = n;
    this.pp = new Float32Array(n * 3); this.pv = new Float32Array(n * 3); this.pl = new Float32Array(n); this.ps = new Float32Array(n); this.pc = new Float32Array(n * 3);
    this.sizes = new Float32Array(n); this.alphas = new Float32Array(n);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pp, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.pc, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1));
    this.smokeGeo = geo;
    this.smokeMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: this.smokeTex }, scale: { value: 600 } },
      vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying float vA; varying vec3 vC;
        uniform float scale;
        void main(){ vA = alpha; vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; varying float vA; varying vec3 vC;
        void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC, t.a * vA); if (gl_FragColor.a < 0.01) discard; }`,
      transparent: true, depthWrite: false,
    });
    this.smoke = new THREE.Points(geo, this.smokeMat);
    this.smoke.frustumCulled = false;
    scene.add(this.smoke);
    this.next = 0;
    // 스키드마크: 바퀴마다 이어지는 띠 (고리 버퍼)
    const M = q.detail >= 2 ? 3000 : q.detail >= 1 ? 1800 : 600;
    this.M = M;
    // 구간마다 독립된 사각형(정점 4개) — 서로 다른 자국이 이어져 번지지 않게
    this.skPos = new Float32Array(M * 4 * 3); this.skA = new Float32Array(M * 4);
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(this.skPos, 3));
    sg.setAttribute('alpha', new THREE.BufferAttribute(this.skA, 1));
    const idx = new Uint32Array(M * 6);
    for (let i = 0; i < M; i++) { const a = i * 4; idx.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], i * 6); }
    sg.setIndex(new THREE.BufferAttribute(idx, 1));
    this.skGeo = sg;
    this.skMat = new THREE.ShaderMaterial({
      vertexShader: `attribute float alpha; varying float vA; void main(){ vA = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying float vA; void main(){ gl_FragColor = vec4(0.02,0.02,0.02, vA); }`,
      transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    });
    this.sk = new THREE.Mesh(sg, this.skMat);
    this.sk.frustumCulled = false;
    scene.add(this.sk);
    this.skN = 0;
    this.trail = new Map();
    // 불꽃
    this.sparkN = 200;
    this.spP = new Float32Array(this.sparkN * 3); this.spV = new Float32Array(this.sparkN * 3); this.spL = new Float32Array(this.sparkN);
    const spg = new THREE.BufferGeometry();
    spg.setAttribute('position', new THREE.BufferAttribute(this.spP, 3));
    this.spGeo = spg;
    this.spark = new THREE.Points(spg, new THREE.PointsMaterial({ color: 0xffc060, size: 0.12, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.spark.frustumCulled = false;
    scene.add(this.spark);
    this.spNext = 0;
  }

  dispose() {
    for (const o of [this.smoke, this.sk, this.spark]) { this.scene.remove(o); o.geometry.dispose(); o.material.dispose(); }
    this.smokeTex.dispose();
  }

  emit(x, y, z, vx, vy, vz, size, life, r, g, b) {
    const i = this.next; this.next = (this.next + 1) % this.N;
    this.pp.set([x, y, z], i * 3); this.pv.set([vx, vy, vz], i * 3); this.pl[i] = life; this.ps[i] = size;
    this.pc.set([r, g, b], i * 3);
    this.sizes[i] = size; this.alphas[i] = 0.5;
  }

  car(k, car, mesh, dt) {
    const o = car.out;
    for (let i = 0; i < 4; i++) {
      const w = o.wheels[i];
      const key = k * 4 + i;
      const slip = w.slip;
      const sliding = w.contact && slip > 1.35 && car.out.speed > 3;
      const lateral = w.contact && car.out.speed > 2;
      // 스키드마크
      const tr = this.trail.get(key);
      if (sliding && w.surf <= 1) {
        const hx = w.cx, hy = w.cy + 0.02, hz = w.cz;
        const fx = Math.cos(0), wv = 0.1;
        // 바퀴 옆방향 (차 왼쪽 축)
        tmpV.set(1, 0, 0).applyQuaternion(mesh.quaternion);
        const a = Math.min(0.55, (slip - 1.35) * 0.4 + 0.15);
        if (tr && Math.hypot(hx - tr.x, hz - tr.z) < 3) {
          if (Math.hypot(hx - tr.x, hz - tr.z) > 0.35) {
            this.addSkid(tr, hx, hy, hz, tmpV, wv, a);
            tr.x = hx; tr.y = hy; tr.z = hz;
          }
        } else this.trail.set(key, { x: hx, y: hy, z: hz, first: true, lx: tmpV.x, lz: tmpV.z });
        void fx;
      } else this.trail.delete(key);
      // 연기 (아스팔트) / 흙먼지 (잔디·자갈·흙) / 옅은 눈가루 (빙판 = 5 — 흙먼지로 치면 길 위가 갈색 구름으로 뒤덮인다)
      if (sliding && Math.random() < Math.min(1, (slip - 1.2) * dt * 30)) {
        const dust = w.surf >= 2 && w.surf !== 5;
        const c = w.surf === 5 ? [0.9, 0.94, 1.0] : dust ? (w.surf === 3 ? [0.62, 0.56, 0.46] : [0.45, 0.42, 0.3]) : [0.85, 0.85, 0.85];
        this.emit(w.cx, w.cy + 0.2, w.cz, (Math.random() - 0.5) * 1.5 + car.st.vx * 0.15, 0.6 + Math.random(), (Math.random() - 0.5) * 1.5 + car.st.vz * 0.15, dust ? 1.4 : 1.0, 1.6 + Math.random(), ...c);
      } else if (lateral && w.surf >= 2 && w.surf !== 5 && car.out.speed > 8 && Math.random() < dt * 20) {
        const c = w.surf === 3 ? [0.62, 0.56, 0.46] : [0.4, 0.38, 0.28];
        this.emit(w.cx, w.cy + 0.15, w.cz, car.st.vx * 0.2, 0.8, car.st.vz * 0.2, 1.2, 1.2, ...c);
      }
    }
  }

  addSkid(tr, x, y, z, lat, wv, a) {
    const i = this.skN % this.M, p = this.skPos, b = i * 4;
    const set = (vi, X, Y, Z) => { p[vi * 3] = X; p[vi * 3 + 1] = Y; p[vi * 3 + 2] = Z; };
    set(b, tr.x + lat.x * wv, tr.y, tr.z + lat.z * wv);
    set(b + 1, tr.x - lat.x * wv, tr.y, tr.z - lat.z * wv);
    set(b + 2, x + lat.x * wv, y, z + lat.z * wv);
    set(b + 3, x - lat.x * wv, y, z - lat.z * wv);
    const a0 = tr.first ? 0 : a;
    this.skA[b] = this.skA[b + 1] = a0; this.skA[b + 2] = this.skA[b + 3] = a;
    tr.first = false;
    this.skN++;
    this.skGeo.attributes.position.needsUpdate = true;
    this.skGeo.attributes.alpha.needsUpdate = true;
  }

  sparks(x, y, z, k) {
    const n = Math.round(6 + k * 20);
    for (let q = 0; q < n; q++) {
      const i = this.spNext; this.spNext = (this.spNext + 1) % this.sparkN;
      this.spP.set([x, y + 0.2, z], i * 3);
      this.spV.set([(Math.random() - 0.5) * 8, Math.random() * 4, (Math.random() - 0.5) * 8], i * 3);
      this.spL[i] = 0.3 + Math.random() * 0.4;
    }
  }

  update(dt) {
    for (let i = 0; i < this.N; i++) {
      if (this.pl[i] <= 0) { this.alphas[i] = 0; continue; }
      this.pl[i] -= dt;
      this.pp[i * 3] += this.pv[i * 3] * dt; this.pp[i * 3 + 1] += this.pv[i * 3 + 1] * dt; this.pp[i * 3 + 2] += this.pv[i * 3 + 2] * dt;
      this.pv[i * 3] *= 0.97; this.pv[i * 3 + 2] *= 0.97;
      this.sizes[i] = this.ps[i] * (1 + (2.5 - Math.max(0, this.pl[i])) * 1.3);
      this.alphas[i] = Math.max(0, Math.min(0.45, this.pl[i] * 0.3));
    }
    this.smokeGeo.attributes.position.needsUpdate = true;
    this.smokeGeo.attributes.size.needsUpdate = true;
    this.smokeGeo.attributes.alpha.needsUpdate = true;
    this.smokeGeo.attributes.color.needsUpdate = true;
    for (let i = 0; i < this.sparkN; i++) {
      if (this.spL[i] <= 0) { this.spP[i * 3 + 1] = -1000; continue; }
      this.spL[i] -= dt;
      this.spV[i * 3 + 1] -= 9.8 * dt;
      for (let a = 0; a < 3; a++) this.spP[i * 3 + a] += this.spV[i * 3 + a] * dt;
    }
    this.spGeo.attributes.position.needsUpdate = true;
  }
}
