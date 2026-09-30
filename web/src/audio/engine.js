// 소리 — 녹음 파일 없이 합성: 엔진(회전수 × 실린더 수), 타이어 끼익, 부딪힘
// 브라우저는 사용자가 한 번 누르기 전에는 소리를 못 낸다 → 첫 키/클릭 때 켠다.
const CYL = { kongal: 3, masil: 4, beongae: 4, deundeun: 4, jimkkun: 4, baram: 4, cheondung: 8, yuseong: 8, heukmeonji: 4, chueok: 6 };

export class EngineAudio {
  constructor() {
    this.ctx = null; this.on = true; this.voices = []; this.started = false;
    try { this.on = localStorage.getItem('race3d.sound') !== '0'; } catch { /* */ }
    const unlock = () => { this.ensure(); };
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.on ? 0.5 : 0;
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp); comp.connect(this.ctx.destination);
      // 잡음 버퍼 (타이어·바람)
      const len = this.ctx.sampleRate * 2;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      if (this.pendingCars) this.start(this.pendingCars, this.pendingLocal);
    } catch { this.ctx = null; }
  }

  toggle() {
    this.on = !this.on;
    try { localStorage.setItem('race3d.sound', this.on ? '1' : '0'); } catch { /* */ }
    if (this.master) this.master.gain.value = this.on ? 0.5 : 0;
    return this.on;
  }

  start(specs, local) {
    this.stop();
    this.pendingCars = specs; this.pendingLocal = local;
    if (!this.ctx) return;
    const c = this.ctx;
    this.voices = specs.map((s, k) => {
      const g = c.createGain(); g.gain.value = 0;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 2.5;
      const o1 = c.createOscillator(); o1.type = 'sawtooth';
      const o2 = c.createOscillator(); o2.type = 'square';
      const o3 = c.createOscillator(); o3.type = 'sawtooth';
      const g2 = c.createGain(); g2.gain.value = 0.35;
      const g3 = c.createGain(); g3.gain.value = 0.25;
      o1.connect(f); o2.connect(g2); g2.connect(f); o3.connect(g3); g3.connect(f);
      f.connect(g); g.connect(this.master);
      o1.start(); o2.start(); o3.start();
      // 타이어
      const n = c.createBufferSource(); n.buffer = this.noise; n.loop = true;
      const bf = c.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 1400; bf.Q.value = 6;
      const ng = c.createGain(); ng.gain.value = 0;
      n.connect(bf); bf.connect(ng); ng.connect(this.master); n.start();
      return { o1, o2, o3, f, g, ng, n, cyl: CYL[s.id] || 4, local: k === local };
    });
    // 바람 소리
    const w = c.createBufferSource(); w.buffer = this.noise; w.loop = true;
    const wf = c.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 500;
    const wg = c.createGain(); wg.gain.value = 0;
    w.connect(wf); wf.connect(wg); wg.connect(this.master); w.start();
    this.wind = { w, wg };
  }

  update(sim, follow) {
    if (!this.ctx || !this.voices.length) return;
    const t = this.ctx.currentTime;
    const me = sim.cars[follow];
    for (let k = 0; k < this.voices.length && k < sim.cars.length; k++) {
      const v = this.voices[k], car = sim.cars[k], st = car.st;
      const rpm = Math.max(600, st.rpm);
      const fire = rpm / 60 * v.cyl / 2;
      v.o1.frequency.setTargetAtTime(fire, t, 0.03);
      v.o2.frequency.setTargetAtTime(fire * 0.5, t, 0.03);
      v.o3.frequency.setTargetAtTime(fire * 1.5, t, 0.03);
      const load = 0.35 + st.thr * 0.65;
      v.f.frequency.setTargetAtTime(300 + fire * 3 * load, t, 0.05);
      let vol = (k === follow ? 0.22 : 0.12) * (0.4 + load * 0.6);
      if (k !== follow && me) {
        const d = Math.hypot(st.px - me.st.px, st.pz - me.st.pz);
        vol *= Math.max(0, 1 - d / 120);
      }
      v.g.gain.setTargetAtTime(vol, t, 0.05);
      let slip = 0;
      for (const w of car.out.wheels) if (w.contact && w.surf <= 1) slip = Math.max(slip, w.slip);
      const sq = car.out.speed > 3 ? Math.max(0, Math.min(1, (slip - 1.2) * 0.8)) : 0;
      v.ng.gain.setTargetAtTime(sq * (k === follow ? 0.12 : 0.05), t, 0.05);
    }
    if (me && this.wind) this.wind.wg.gain.setTargetAtTime(Math.min(0.15, me.out.speed / 600), t, 0.1);
  }

  stop() {
    for (const v of this.voices) { try { v.o1.stop(); v.o2.stop(); v.o3.stop(); v.n.stop(); v.g.disconnect(); v.ng.disconnect(); } catch { /* */ } }
    this.voices = [];
    if (this.wind) { try { this.wind.w.stop(); this.wind.wg.disconnect(); } catch { /* */ } this.wind = null; }
  }
}
