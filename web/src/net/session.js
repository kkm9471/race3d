// 세션 — 시뮬레이션 + 입력 기록 + 롤백 (혼자 모드와 멀티가 같은 코드를 쓴다)
//
// 입력은 "프레임 f 부터 이 값" 이라는 사건(event)으로만 기록한다(바뀔 때만).
// 다른 사람 입력이 늦게 도착해 과거 프레임을 바꾸면 → 그 프레임 이전 저장본으로 되돌아가
// 지금까지 다시 계산한다(롤백). 모든 PC가 같은 입력 기록으로 계산하므로 결국 같은 결과가 된다.
//
// 화면은 마지막 두 프레임 사이를 보간해서 그린다(60fps 시뮬레이션을 144Hz 모니터에서도 부드럽게).
// 롤백으로 차가 순간이동해 보이면, 그 차이를 짧게(약 0.15초) 녹여서 보여 준다.

import { Sim, FPS } from '../sim/race.js';
import { NEUTRAL } from '../sim/input.js';

const KEEP = 360;          // 최근 몇 프레임의 저장본을 들고 있나 (6초)
const CHECK_EVERY = 60;    // 이보다 오래된 저장본은 60프레임마다 하나씩만

export class Session {
  constructor(cfg, localSlot = -1) {
    this.cfg = cfg;
    this.sim = new Sim(cfg);
    this.n = cfg.players.length;
    this.local = localSlot;
    // 슬롯별 확정 입력 사건 [프레임, 값] (프레임 오름차순)
    this.ev = Array.from({ length: this.n }, () => [[0, NEUTRAL]]);
    this.pending = [];                   // 내 입력 중 서버 확인 전인 것 {seq, f, v}
    this.snaps = new Map();
    this.dirty = Infinity;               // 이 프레임부터 다시 계산해야 함
    this.states = new Map();             // 프레임 → 그리기용 자세
    this.rollbacks = 0; this.maxRollback = 0; this.resimFrames = 0; this.restamped = 0; this.maxRestamp = 0;
    this.hashes = new Map();             // 120프레임마다 상태 해시 (되감아 다시 계산하면 덮어쓴다)
    this.events = [];                    // 화면 효과용 사건(충돌·랩 등) — 마지막으로 새로 계산한 프레임들
    this.lastFxFrame = -1;
    this.saveState();
  }

  get frame() { return this.sim.gs.frame; }

  /** 슬롯 k 의 프레임 f 입력 */
  inputAt(k, f) {
    const e = this.ev[k];
    let lo = 0, hi = e.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (e[mid][0] <= f) lo = mid; else hi = mid - 1;
    }
    let v = e[lo][0] <= f ? e[lo][1] : NEUTRAL;
    let vf = e[lo][0];
    if (k === this.local) {
      for (const p of this.pending) if (p.f <= f && p.f >= vf) { v = p.v; vf = p.f; }
    }
    return v;
  }

  /** 확정 입력 추가 (서버가 보낸 것 / 혼자 모드의 내 입력) */
  addConfirmed(k, f, v) {
    if (!(k >= 0 && k < this.n)) return;
    const e = this.ev[k];
    let i = e.length;
    while (i > 0 && e[i - 1][0] > f) i--;
    if (i > 0 && e[i - 1][0] === f) {
      if (e[i - 1][1] === v) return;
      e[i - 1][1] = v;
    } else e.splice(i, 0, [f, v]);
    if (f < this.frame) this.dirty = Math.min(this.dirty, f);
  }

  addPending(seq, f, v) {
    this.pending.push({ seq, f, v });
    if (f < this.frame) this.dirty = Math.min(this.dirty, f);
  }

  /** 서버가 내 입력을 확인해 줌 (프레임이 바뀌었을 수도 있다) */
  confirm(seq, f, v) {
    const i = this.pending.findIndex(p => p.seq === seq);
    if (i >= 0) {
      const p = this.pending[i];
      this.pending.splice(i, 1);
      if (p.f !== f) { this.restamped++; this.maxRestamp = Math.max(this.maxRestamp, f - p.f); }
      if (p.f !== f && Math.min(p.f, f) < this.frame) this.dirty = Math.min(this.dirty, p.f, f);
    }
    this.addConfirmed(this.local, f, v);
  }

  saveState() {
    const f = this.frame;
    this.snaps.set(f, this.sim.snapshot());
    const old = f - KEEP;
    if (old >= 0 && old % CHECK_EVERY !== 0) this.snaps.delete(old);
    const cars = this.sim.cars;
    const st = new Float64Array(cars.length * 16);
    for (let k = 0; k < cars.length; k++) {
      const s = cars[k].st, o = k * 16;
      st[o] = s.px; st[o + 1] = s.py; st[o + 2] = s.pz;
      st[o + 3] = s.qw; st[o + 4] = s.qx; st[o + 5] = s.qy; st[o + 6] = s.qz;
      for (let w = 0; w < 4; w++) { st[o + 7 + w] = s.w[w].x; st[o + 11 + w] = s.w[w].om; }
      st[o + 15] = s.steer;
    }
    this.states.set(f, st);
    this.states.delete(f - 8);
  }

  /** 서버 확인을 2초 넘게 못 받은 내 입력은 서버에 못 닿은 것 → 버린다(서버 기록이 정답) */
  dropStale() {
    if (!this.pending.length) return;
    const lim = this.frame - 120;
    const keep = [];
    for (const p of this.pending) {
      if (p.f < lim) { this.dirty = Math.min(this.dirty, p.f); this.stale = (this.stale || 0) + 1; }
      else keep.push(p);
    }
    this.pending = keep;
  }

  /** 되돌려야 하면 되돌린다. 저장본이 없을 만큼 옛날이면 처음부터 다시 */
  rollbackIfNeeded() {
    if (this.dirty >= this.frame) { this.dirty = Infinity; return 0; }
    let f = this.dirty;
    while (f > 0 && !this.snaps.has(f)) f--;
    const depth = this.frame - f;
    const snap = this.snaps.get(f);
    if (snap) this.sim.restore(snap);
    else { this.sim = new Sim(this.cfg); f = 0; }
    this.dirty = Infinity;
    this.rollbacks++;
    this.maxRollback = Math.max(this.maxRollback, depth);
    return depth;
  }

  /** target 프레임까지 진행 (한 번에 최대 maxSteps) */
  advanceTo(target, maxSteps = 240) {
    this.dropStale();
    const redo = this.rollbackIfNeeded();
    const start = this.frame;
    let steps = 0;
    const n = this.n, inp = new Array(n);
    const cars = this.sim.cars, b0 = this._b0 ||= [], i0 = this._i0 ||= [];
    while (this.frame < target && steps < maxSteps + redo) {
      const f = this.frame;
      for (let k = 0; k < n; k++) inp[k] = this.inputAt(k, f);
      // 소리·섬광용 사건(2026-11-11): 한 걸음 앞뒤 값만 비교한다 — 시뮬레이션 상태(st)·해시는 건드리지 않는다.
      // 부스터 사용 = boosts 감소(car.js 부스터 키 한 곳), 획득 = boosts 증가(게이지 가득), 순간·출발부스터 = 이 걸음에 out.inst 가 켜짐.
      // (boostT 0→양수는 가속 발판·순간·출발부스터도 같이 써서 부스터 점화 신호로 못 쓴다 — 11/11 반증)
      for (let k = 0; k < n; k++) { const c = cars[k]; b0[k] = c.st.boosts; i0[k] = c.out.inst; c.out.inst = 0; }
      this.sim.step(inp);
      const fresh = f >= this.lastFxFrame;     // 롤백으로 다시 계산하는 프레임은 사건을 다시 내보내지 않는다
      if (fresh) for (const e of this.sim.events) this.events.push({ ...e, f });
      for (let k = 0; k < n; k++) {
        const c = cars[k], fired = c.out.inst;
        if (fresh) {
          if (c.st.boosts < b0[k]) this.events.push({ t: 'boost', a: k, f });
          else if (c.st.boosts > b0[k]) this.events.push({ t: 'gain', a: k, f });
          if (fired) this.events.push({ t: 'inst', a: k, k: fired, f });
        }
        if (!fired) c.out.inst = i0[k];        // HUD 알림은 예전 그대로 — HUD 가 읽고 지울 때까지 남겨 둔다
      }
      if (fresh) this.lastFxFrame = f + 1;
      this.saveState();
      if (this.frame % 120 === 0) this.hashes.set(this.frame, this.sim.hash());
      steps++;
    }
    this.resimFrames += Math.min(redo, steps);
    return this.frame - start;
  }

  takeEvents() { const e = this.events; this.events = []; return e; }

  /** 그리기용: 프레임 f-1 과 f 사이 alpha */
  pose(k, alpha, out) {
    const f = this.frame;
    const a = this.states.get(f - 1), b = this.states.get(f);
    const o = k * 16;
    if (!b) return false;
    if (!a) { for (let i = 0; i < 16; i++) out[i] = b[o + i]; return true; }
    for (let i = 0; i < 16; i++) out[i] = a[o + i] + (b[o + i] - a[o + i]) * alpha;
    // 쿼터니언은 짧은 쪽으로
    let d = a[o + 3] * b[o + 3] + a[o + 4] * b[o + 4] + a[o + 5] * b[o + 5] + a[o + 6] * b[o + 6];
    if (d < 0) for (let i = 3; i < 7; i++) out[i] = a[o + i] + (-b[o + i] - a[o + i]) * alpha;
    const l = Math.hypot(out[3], out[4], out[5], out[6]) || 1;
    for (let i = 3; i < 7; i++) out[i] /= l;
    // 바퀴 회전속도는 보간하지 않고 최신
    for (let w = 0; w < 4; w++) out[11 + w] = b[o + 11 + w];
    return true;
  }

  /** 오래된 입력 기록 정리는 하지 않는다 — 재접속한 사람이 처음부터 계산할 때 필요하다 */
  stats() {
    return { frame: this.frame, rollbacks: this.rollbacks, maxRollback: this.maxRollback, resim: this.resimFrames, pending: this.pending.length, restamped: this.restamped, maxRestamp: this.maxRestamp };
  }
}

export { FPS };
