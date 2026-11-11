// 소리 — 녹음 파일 없이 합성: 엔진(회전수 × 실린더 수), 타이어 끼익, 부딪힘, 사건 효과음(부스터·발판·카운트다운 — 2026-11-11)
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
      if (st.shiftT > 0) vol *= 0.35;       // 변속하는 동안 힘이 끊기는 소리 (부웅—붕)
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

  /** 부딪힘: 세기(충돌 속도 vn m/s)와 내 차와의 거리로 크기를 정한다. 쿵(낮은 음) + 철판 긁힘(잡음) */
  hit(e, sim, follow) {
    if (!this.ctx || !this.on || !this.noise) return;
    const c = this.ctx, t = c.currentTime;
    if (t - (this.lastHit || 0) < 0.07) return;      // 비비는 동안 따발총처럼 울리지 않게
    const me = sim.cars[follow];
    let vol = Math.min(1, e.vn / 12);
    if (me && e.a !== follow && e.b !== follow) vol *= Math.max(0, 1 - Math.hypot(e.x - me.st.px, e.z - me.st.pz) / 80);
    if (vol < 0.05) return;
    this.lastHit = t;
    const thump = c.createOscillator(); thump.type = 'sine';
    thump.frequency.setValueAtTime(e.t === 'wall' ? 70 : 95, t); thump.frequency.exponentialRampToValueAtTime(40, t + 0.25);
    const tg = c.createGain(); tg.gain.setValueAtTime(1.1 * vol, t); tg.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    thump.connect(tg); tg.connect(this.master); thump.start(t); thump.stop(t + 0.32);
    const n = c.createBufferSource(); n.buffer = this.noise;
    const bf = c.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = e.t === 'wall' ? 700 : 1100; bf.Q.value = 1.2;
    const ng = c.createGain(); ng.gain.setValueAtTime(0.9 * vol, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    n.connect(bf); bf.connect(ng); ng.connect(this.master); n.start(t, Math.random() * 1.5); n.stop(t + 0.24);
  }

  // ── 사건 효과음 (2026-11-11): 내 차의 부스터·발판·카운트다운. 언제 낼지는 sfx.js 가 고른다 ──
  // 녹음 없이 합성, 음색은 이 게임 것으로 새로 정함. 크기는 엔진음(내 차 최대 0.22)·부딪힘(최대 1.1) 사이 0.1~0.5,
  // 한 소리에 음 2~3개, 같은 소리는 짧은 간격 안에 겹쳐 내지 않는다.

  /** 소리를 낼 수 있나(소리 끔이면 아예 안 만든다) + 같은 소리 간격 */
  _sfx(name, gap) {
    if (!this.ctx || !this.on || !this.noise) return false;
    const t = this.ctx.currentTime, last = (this._sfxT ||= {});
    if (t - (last[name] ?? -9) < gap) return false;
    last[name] = t;
    this.sfxCount = (this.sfxCount || 0) + 1;      // 시험용
    return true;
  }

  /** 크기 곡선: atk 동안 올라가 dur 의 hold 비율까지 유지, 그 뒤 줄어든다 (바로 지수로 줄이면 50ms 마다 반씩 작아져 '톡' 하고 끝났다) */
  _env(g, t, dur, vol, atk, hold) {
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + atk);
    g.gain.setValueAtTime(vol, t + Math.max(atk, dur * hold)); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  }

  /** 음 하나: 파형, 주파수 f0→f1, 시작 t, 길이 dur, 크기 vol, 올라가는 시간 atk, 저역 필터 lp(0 = 없음), 유지 비율 hold */
  _tone(type, f0, f1, t, dur, vol, atk = 0.01, lp = 0, hold = 0.4) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    this._env(g, t, dur, vol, atk, hold);
    let src = o;
    if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); src = f; }
    src.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  /** 바람 한 줄기: 잡음을 대역 필터 fc0→fc1 로 쓸어 올린다 */
  _whoosh(fc0, fc1, q, t, dur, vol, atk = 0.04, hold = 0.45) {
    const c = this.ctx, n = c.createBufferSource(), bf = c.createBiquadFilter(), g = c.createGain();
    n.buffer = this.noise;
    bf.type = 'bandpass'; bf.Q.value = q;
    bf.frequency.setValueAtTime(fc0, t); bf.frequency.exponentialRampToValueAtTime(fc1, t + dur);
    this._env(g, t, dur, vol, atk, hold);
    n.connect(bf); bf.connect(g); g.connect(this.master);
    n.start(t, Math.random() * 1.2); n.stop(t + dur + 0.02);
  }

  /** 부스터 점화(Ctrl): 낮게 꺼지는 '훙' + 위로 쓸려 올라가는 분사음 */
  boost() {
    if (!this._sfx('boost', 0.15)) return;
    const t = this.ctx.currentTime;
    this._tone('sine', 120, 42, t, 0.45, 0.5, 0.008);
    this._whoosh(320, 2600, 0.9, t, 0.75, 0.42, 0.06);
    this._tone('sawtooth', 150, 520, t + 0.02, 0.55, 0.09, 0.05, 1600);
  }

  /** 게이지가 차서 부스터 하나 얻음: 짧은 두 음 */
  gain() {
    if (!this._sfx('gain', 0.3)) return;
    const t = this.ctx.currentTime;
    this._tone('triangle', 784, 784, t, 0.16, 0.32, 0.005);
    this._tone('triangle', 1175, 1175, t + 0.09, 0.3, 0.32, 0.005);
    this._tone('sine', 2350, 2350, t + 0.09, 0.22, 0.05, 0.005);
  }

  /** 순간부스터(1)·출발부스터(2): 짧게 위로 튀는 소리. 출발부스터는 조금 길고 묵직하게 */
  inst(kind) {
    if (!this._sfx('inst', 0.1)) return;
    const t = this.ctx.currentTime, big = kind === 2;
    this._tone('square', big ? 380 : 520, 1350, t, big ? 0.26 : 0.2, 0.18, 0.008, 2400);
    this._whoosh(700, 3000, 1.1, t, big ? 0.32 : 0.26, 0.36, 0.02);
    if (big) this._tone('sine', 95, 45, t, 0.22, 0.32, 0.006);
  }

  /** 가속 발판: 짧게 '휙' */
  pad() {
    if (!this._sfx('pad', 0.2)) return;
    const t = this.ctx.currentTime;
    this._tone('sine', 240, 760, t, 0.15, 0.26, 0.01);
    this._whoosh(600, 2200, 1, t, 0.26, 0.32, 0.03);
  }

  /** 카운트다운 삐: 3·2·1 은 짧게, 출발은 한 옥타브 위로 길게 */
  beep(hi) {
    if (!this._sfx(hi ? 'beepHi' : 'beep', 0.3)) return;
    const t = this.ctx.currentTime, f = hi ? 1480 : 740, d = hi ? 0.45 : 0.15;
    this._tone('sine', f, f, t, d, 0.2, 0.005);
    this._tone('square', f, f, t, d, 0.05, 0.005, 3000);
  }

  stop() {
    for (const v of this.voices) { try { v.o1.stop(); v.o2.stop(); v.o3.stop(); v.n.stop(); v.g.disconnect(); v.ng.disconnect(); } catch { /* */ } }
    this.voices = [];
    if (this.wind) { try { this.wind.w.stop(); this.wind.wg.disconnect(); } catch { /* */ } this.wind = null; }
  }
}
