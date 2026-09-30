// 레이스 전체 시뮬레이션 — 차 여러 대 + 트랙 + 충돌 + 랩·순위·완주
//
// 이 객체는 "입력 → 다음 상태"만 한다. 화면·네트워크를 모른다.
// 같은 설정 + 같은 입력 순서면 어느 PC에서든 비트 단위로 같은 결과가 나오게 만든다
// (그래서 롤백: 과거 상태로 되돌아가 늦게 도착한 입력으로 다시 계산해도 모두 같은 곳에 도착한다).

import { Car } from './car.js';
import { buildTrack, TrackWorld } from './track.js';
import { collideCars, collideWall } from './collide.js';
import { CAR_BY_ID, CARS } from './cars.js';
import { TRACK_BY_ID } from './tracks.js';
import { NEUTRAL, unpack } from './input.js';
import { datan2 } from './dmath.js';
import { botInput, prepareBot } from './bot.js';

export const FPS = 60, SUB = 8, DTF = 1 / FPS, DT = 1 / (FPS * SUB);
export const GO_FRAME = 4 * FPS;           // 0~1초 준비, 1초부터 3·2·1, 4초에 출발
export const FINISH_WAIT = 40 * FPS;       // 1등이 들어온 뒤 이만큼 기다려 준다
export const MAX_FRAMES = 20 * 60 * FPS;   // 안전장치: 20분이면 무조건 끝
export const MAX_LAPS = 5;

const trackCache = new Map();
export function getTrack(id) {
  if (!trackCache.has(id)) trackCache.set(id, buildTrack(TRACK_BY_ID[id] || TRACK_BY_ID.circuit));
  return trackCache.get(id);
}

function cloneSt(st) {
  const o = {};
  for (const k in st) if (k !== 'w') o[k] = st[k];
  o.w = [{ ...st.w[0] }, { ...st.w[1] }, { ...st.w[2] }, { ...st.w[3] }];
  return o;
}
function restoreSt(st, o) {
  for (const k in o) if (k !== 'w') st[k] = o[k];
  for (let i = 0; i < 4; i++) Object.assign(st.w[i], o.w[i]);
}

const F64 = new Float64Array(1), U32 = new Uint32Array(F64.buffer);
function hnum(h, x) {
  F64[0] = x;
  h = Math.imul(h ^ U32[0], 16777619);
  h = Math.imul(h ^ U32[1], 16777619);
  return h >>> 0;
}

export class Sim {
  /**
   * cfg = { track, laps, players: [{ car, name, abs, tcs, bot }] }  (자리 번호 = 배열 순서)
   */
  constructor(cfg) {
    this.cfg = cfg;
    this.T = getTrack(cfg.track);
    this.world = new TrackWorld(this.T);
    this.laps = Math.max(1, Math.min(MAX_LAPS, cfg.laps | 0 || 3));
    this.gs = { frame: 0, first: -1, over: 0, overAt: -1 };
    this.events = [];
    this._R = [];
    this.cars = cfg.players.map((p, k) => {
      const spec = CAR_BY_ID[p.car] || CARS[0];
      const c = new Car(spec, { abs: p.abs, tcs: p.tcs });
      c.slot = k;
      c.name = p.name;
      // 봇 운전 자료는 모든 차에 미리 만든다(완주 후 식힘 주행에도 쓴다). 롤백과 무관한 상수.
      c.botData = prepareBot(this.T, spec);
      c.isBot = !!p.bot;
      c.botSkill = p.botSkill ?? 0.95;
      this._R.push(new Float64Array(9));
      const g = this.world.gridSlot(k);
      const y = this.groundY(g.x, g.z, g.i) + spec.cgH + 0.02;
      c.place(g.x, y, g.z, g.yaw);
      const st = c.st;
      st.hint = g.i;
      for (let i = 0; i < 4; i++) st.w[i].hint = g.i;
      // 레이스 상태도 st 에 (롤백 대상)
      st.prog = g.s - this.T.L; st.sPrev = g.s; st.lap = 0; st.lapStart = GO_FRAME;
      st.best = 0; st.last = 0; st.fin = 0; st.off = 0; st.wrongT = 0;
      for (let q = 0; q < MAX_LAPS; q++) st['lt' + q] = 0;
      return c;
    });
    // 출발 전에 서스펜션을 가라앉혀 둔다(모두 같은 계산이라 결정적)
    for (let f = 0; f < 60; f++) this.physics(true);
  }

  groundY(x, z, hint) {
    this.world.ground(x, z, hint);
    return this.world.g.h;
  }

  get frame() { return this.gs.frame; }

  /** 한 프레임 진행. inputs[k] = 자리 k 의 입력 정수 */
  step(inputs) {
    const gs = this.gs, f = gs.frame, locked = f < GO_FRAME;
    this.events.length = 0;
    for (let k = 0; k < this.cars.length; k++) {
      const c = this.cars[k], st = c.st;
      let v = inputs[k];
      if (v === undefined) v = NEUTRAL;
      if (st.fin) v = botInput(this, k, 0.55);          // 완주한 차는 천천히 식힘 주행 (유령)
      else if (c.isBot && !st.dc && !locked) v = botInput(this, k, c.botSkill);
      const inp = unpack(v, this._inp || (this._inp = {}));
      // 되돌리기(R): 누르는 순간 한 번, 3초에 한 번까지
      if (inp.rst && !st.lastRst && st.rstCD <= 0 && !locked && !st.fin) this.resetCar(c);
      st.lastRst = inp.rst;
      if (st.rstCD > 0) st.rstCD -= DTF;
      if (st.ghostT > 0) st.ghostT -= DTF;
      c.controls(v, DTF, locked);
    }
    this.physics(false);
    for (let k = 0; k < this.cars.length; k++) this.progress(this.cars[k], f);
    gs.frame = f + 1;
    // 끝났나?
    if (!gs.over) {
      let allDone = true, anyFin = false;
      for (const c of this.cars) {
        if (c.st.fin) anyFin = true;
        else if (!c.st.dc) allDone = false;
      }
      if (anyFin && allDone) { gs.over = 1; gs.overAt = gs.frame; }
      else if (gs.first >= 0 && gs.frame >= gs.first + FINISH_WAIT) { gs.over = 1; gs.overAt = gs.frame; }
      else if (gs.frame >= MAX_FRAMES) { gs.over = 1; gs.overAt = gs.frame; }
    }
  }

  physics(settle) {
    const cars = this.cars, n = cars.length, w = this.world;
    for (let sub = 0; sub < SUB; sub++) {
      for (let k = 0; k < n; k++) {
        const c = cars[k];
        if (settle) { c.st.brk = 1; c.locked = true; }
        c.substep(DT, w);
      }
      for (let k = 0; k < n; k++) cars[k].axes(this._R[k]);
      if (!settle) {
        for (let a = 0; a < n; a++) {
          const A = cars[a];
          if (this.isGhost(A)) continue;
          for (let b = a + 1; b < n; b++) {
            const B = cars[b];
            if (this.isGhost(B)) continue;
            if (collideCars(A, B, this._R[a], this._R[b], sub === SUB - 1 ? this.events : this.events)) {
              cars[a].axes(this._R[a]); cars[b].axes(this._R[b]);
            }
          }
        }
      }
      for (let k = 0; k < n; k++) collideWall(cars[k], this._R[k], w, settle ? null : this.events);
    }
    for (let k = 0; k < n; k++) cars[k].finishFrame();
  }

  isGhost(c) { return c.st.ghostT > 0 || c.st.dc || c.st.fin > 0; }

  progress(c, f) {
    const st = c.st, T = this.T;
    const L = this.world.locate(st.px, st.pz, st.hint);
    st.hint = L.i;
    st.off = L.d;
    let ds = L.s - st.sPrev;
    if (ds > T.L / 2) ds -= T.L; else if (ds < -T.L / 2) ds += T.L;
    const prev = st.prog;
    if (ds > -40 && ds < 40) st.prog += ds;
    st.sPrev = L.s;
    // 역주행 감지 (화면 경고용이지만 결정적 값이라 st 에 둬도 된다)
    const fx = 2 * (st.qx * st.qz + st.qw * st.qy), fz = 1 - 2 * (st.qx * st.qx + st.qy * st.qy);
    const along = fx * T.tx[L.i] + fz * T.tz[L.i];
    const sp = st.vx * T.tx[L.i] + st.vz * T.tz[L.i];
    if (along < -0.3 && sp < -2) st.wrongT += DTF; else st.wrongT = 0;
    // 뒤집힘: 3초 넘게 누워 있으면 자동으로 세운다
    const upY = 1 - 2 * (st.qx * st.qx + st.qz * st.qz);
    if (upY < 0.25 && f >= GO_FRAME) { st.flipT += DTF; if (st.flipT > 3) { this.resetCar(c); st.flipT = 0; } }
    else st.flipT = 0;
    // 랩
    while (st.lap < this.laps && st.prog >= (st.lap + 1) * T.L && f >= GO_FRAME) {
      const target = (st.lap + 1) * T.L;
      const frac = st.prog > prev ? (target - prev) / (st.prog - prev) : 1;
      const tc = f + Math.min(1, Math.max(0, frac));
      const lt = tc - st.lapStart;
      st['lt' + st.lap] = lt;
      st.last = lt;
      if (!st.best || lt < st.best) st.best = lt;
      st.lap++;
      st.lapStart = tc;
      if (st.lap === this.laps) {
        st.fin = tc;
        if (this.gs.first < 0) this.gs.first = f + 1;
        this.events.push({ t: 'finish', a: c.slot });
      } else this.events.push({ t: 'lap', a: c.slot, lap: st.lap });
    }
  }

  resetCar(c) {
    const st = c.st, T = this.T;
    const L = this.world.locate(st.px, st.pz, st.hint);
    let i = L.i;
    // 뒤쪽 3m 지점 한가운데 (벽에 붙어 있었어도 도로 위로)
    i = (i - 1 + T.n) % T.n;
    const x = T.x[i], z = T.z[i];
    const yaw = datan2(T.tx[i], T.tz[i]);
    const y = this.groundY(x, z, i) + c.P.spec.cgH + 0.25;
    const keep = { prog: st.prog, lap: st.lap, lapStart: st.lapStart, best: st.best, last: st.last, fin: st.fin };
    c.place(x, y, z, yaw);
    Object.assign(st, keep);
    st.sPrev = i * T.ds; st.hint = i;
    for (let q = 0; q < 4; q++) st.w[q].hint = i;
    st.ghostT = 3; st.rstCD = 3; st.flipT = 0;
    this.events.push({ t: 'reset', a: c.slot });
  }

  /** 순위: 완주 시각 → 진행 거리 → 자리 번호 */
  standings() {
    const arr = this.cars.map((c, k) => ({ k, fin: c.st.fin, prog: c.st.prog }));
    arr.sort((a, b) => {
      if (a.fin && b.fin) return a.fin - b.fin || a.k - b.k;
      if (a.fin) return -1;
      if (b.fin) return 1;
      return b.prog - a.prog || a.k - b.k;
    });
    return arr.map(a => a.k);
  }

  snapshot() {
    return { gs: { ...this.gs }, cars: this.cars.map(c => cloneSt(c.st)) };
  }

  restore(snap) {
    Object.assign(this.gs, snap.gs);
    for (let k = 0; k < this.cars.length; k++) restoreSt(this.cars[k].st, snap.cars[k]);
    for (const c of this.cars) c.finishFrame();
  }

  hash() {
    let h = 2166136261;
    h = hnum(h, this.gs.frame);
    for (const c of this.cars) {
      const st = c.st;
      for (const k in st) {
        if (k === 'w') continue;
        h = hnum(h, st[k]);
      }
      for (let i = 0; i < 4; i++) {
        const w = st.w[i];
        h = hnum(h, w.om); h = hnum(h, w.x); h = hnum(h, w.abs); h = hnum(h, w.hint);
      }
    }
    return h >>> 0;
  }
}
