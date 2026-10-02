// 한판 레이스 — 화면 흐름: 첫 화면 → 대기실 → 불러오기 → 레이스 → 결과
//
// 혼자 연습과 멀티가 같은 게임 루프(Game)를 쓴다. 다른 점은 "입력이 어디서 오나"와 "시계가 누구 것이냐"뿐.
// 주소 옵션(시험용): ?bot=1 자동주행 · ?auto=방코드 자동입장 · ?name=이름 · ?car=차id · ?q=low|medium|high
//                   ?solo=1&track=circuit&car=baram · ?fps=1 · ?ws=주소(서버 바꾸기)

import * as THREE from 'three';
import { Gfx } from './render/scene.js';
import { RaceView } from './render/raceview.js';
import { Session } from './net/session.js';
import { NetClient, PROTOCOL } from './net/client.js';
import { Hud, fmtTime } from './ui/hud.js';
import { Controls } from './ui/controls.js';
import { EngineAudio } from './audio/engine.js';
import { CARS, CAR_BY_ID, STAT_NAMES } from './sim/cars.js';
import { TRACK_DEFS, TRACK_BY_ID } from './sim/tracks.js';
import { pack, NEUTRAL } from './sim/input.js';
import { FPS, GO_FRAME, getTrack } from './sim/race.js';
import { botInput } from './sim/bot.js';
import { PAINT, PAINT_NAME } from './render/carmesh.js';
import { CarPreview } from './render/preview.js';
import { VERSION } from './version.js';

const Q = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem('race3d.' + k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('race3d.' + k, v); } catch { /* 사생활 모드 등 */ } },
  sget(k, d) { try { const v = sessionStorage.getItem('race3d.' + k); return v === null ? d : v; } catch { return d; } },
  sset(k, v) { try { sessionStorage.setItem('race3d.' + k, v); } catch { /* */ } },
};
const INPUT_DELAY = 2;   // 멀티: 내 입력을 2프레임(33ms) 뒤에 적용 → 상대 화면의 되감기가 줄어든다

function toast(t, ms = 2500) {
  const e = $('toast'); e.textContent = t; e.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => e.classList.remove('on'), ms);
}
function show(id) {
  for (const s of ['menu', 'lobby', 'loading', 'results', 'pause']) $(s).classList.toggle('hidden', s !== id);
  // 차 미리보기는 대기실이 보일 때만 그린다
  if (preview) { if (id === 'lobby') preview.start(); else preview.stop(); }
}
let preview = null;
/** 대기실 차 미리보기: 고른 차를 내 자리 색으로 */
function updatePreview() {
  try {
    if (!preview) preview = new CarPreview($('l-preview'));
    const me = app.lobby?.players?.findIndex(p => p.id === app.myId) ?? -1;
    preview.setCar(app.car, PAINT[Math.max(0, me) % PAINT.length]);
    const spec = CAR_BY_ID[app.car] || CARS[0];
    const nm = $('l-pv-name'); nm.textContent = spec.name;
    const sm = document.createElement('small'); sm.textContent = spec.cls; nm.appendChild(sm);
    if (!$('lobby').classList.contains('hidden')) preview.start();
  } catch (e) { console.warn('미리보기를 못 띄웠습니다', e); }
}
function cleanName(s) { return String(s || '').replace(/[\u0000-\u001f\u007f<>&"'\\]/g, '').trim().slice(0, 12); }
function randCode() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
function token() {
  let t = store.sget('token', '');
  if (!t) { t = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join(''); store.sset('token', t); }
  return t;
}

/** 그래픽 품질 기본값: 소프트웨어 렌더링이면 낮음, 내장 그래픽이면 보통, 외장이면 높음 */
function detectQuality(renderer) {
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
    window.__gpu = name;
    if (/swiftshader|llvmpipe|software|basic render/i.test(name)) return 'low';
    if (/nvidia|geforce|rtx|gtx|radeon rx|radeon pro|arc a/i.test(name)) return 'high';
    return 'medium';
  } catch { return 'medium'; }
}

// ────────────────────────────────────────────────────────────
const canvas = $('gl');
let gfx;
try {
  gfx = new Gfx(canvas, 'medium');
} catch (e) {
  document.body.innerHTML = '<div style="padding:40px;font-size:18px;color:#fff">이 브라우저에서 3D(WebGL)를 쓸 수 없습니다. 크롬 최신 버전으로 열어 주세요.<br><small>' + String(e.message || e) + '</small></div>';
  throw e;
}
const qAuto = detectQuality(gfx.renderer);       // GPU 이름도 여기서 기록된다(시험·진단용)
const qSaved = Q.get('q') || store.get('quality', '') || qAuto;
gfx.setQuality(qSaved);
$('m-q').value = gfx.qKey; $('p-q').value = gfx.qKey;
// 손가락 터치만 되는 기기(휴대폰·태블릿)는 조작할 수 없다고 먼저 알려 준다 (터치 조작은 만들지 않았다)
if (matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches) $('m-mobile').classList.remove('hidden');
// 키보드·게임패드를 붙인 태블릿은 탈 수 있다 — 입력칸 밖 키 입력이나 게임패드가 보이면 안내를 치운다 (3차 독립검증)
window.addEventListener('keydown', e => { if (!/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '')) $('m-mobile').classList.add('hidden'); });
window.addEventListener('gamepadconnected', () => $('m-mobile').classList.add('hidden'));
window.addEventListener('resize', () => gfx.resize());
const controls = new Controls();
const audio = new EngineAudio();

// ── 배경: 메뉴 뒤에서 천천히 도는 트랙 ──
let bgView = null, bgT = 0;
function startBackground() {
  if (bgView || app.game) return;
  const def = TRACK_DEFS[0];
  const cfg = { track: def.id, laps: 1, players: [{ car: 'cheondung', name: '', bot: true, botSkill: 0.75 }, { car: 'baram', name: '', bot: true, botSkill: 0.72 }] };
  const s = new Session(cfg, -1);
  bgView = { s, v: new RaceView(gfx, s, def), t0: performance.now() };
  bgView.v.camMode = 1;
}
function stopBackground() { if (bgView) { bgView.v.dispose(); bgView = null; } }

// ────────────────────────────────────────────────────────────
// 게임 루프 (혼자/멀티 공통)
class Game {
  constructor({ cfg, localSlot, net = null, startAt = 0, names, bot = false, onEnd }) {
    this.cfg = cfg; this.local = localSlot; this.net = net; this.startAt = startAt;
    this.names = names; this.bot = bot; this.onEnd = onEnd;
    this.session = new Session(cfg, localSlot);
    this.def = TRACK_BY_ID[cfg.track];
    this.view = new RaceView(gfx, this.session, this.def);
    this.view.onHit = (e, follow) => audio.hit(e, this.session.sim, follow);
    this.hud = new Hud($('hud'));
    this.hud.setupMap(this.session.sim.T);
    this.lastSent = -1; this.seq = 0; this.sendBuf = [];
    this.t0 = performance.now() + 300;  // 혼자: 0.3초 뒤 시작
    this.paused = false; this.pauseAt = 0;
    this.fpsLog = []; this.frameTimes = [];
    this.running = true;
    this.overShown = false;
    this.catchingUp = false;
    this._raf = requestAnimationFrame(t => this.loop(t));
    this.lastT = performance.now();
    if (net) { net.fast = true; this.sent0 = net.sent; for (let i = 0; i < 4; i++) setTimeout(() => net.ping(), i * 150); }
    this.slow = 0;
    controls.onAction = a => this.action(a);
    if (Q.get('cam')) this.view.camMode = +Q.get('cam');
    audio.start(cfg.players.map(p => CAR_BY_ID[p.car] || CARS[0]), localSlot);
    window.__game = this;
  }

  /** 재접속: 서버 기록이 정답. 서버에 못 닿은 내 입력은 버리고, 지금 입력을 다시 보낸다 */
  resync(log) {
    const s = this.session;
    let low = Infinity;
    for (const p of s.pending) low = Math.min(low, p.f);
    s.pending = [];
    if (low < s.frame) s.dirty = Math.min(s.dirty, low);
    for (const [p, f, v] of log) s.addConfirmed(p, f, v);
    this.lastSent = -1;
    this.sendBuf = [];
    this.seq += 1000;
    this.net.fast = true;
    toast('다시 연결됐습니다', 1500);
  }

  action(a) {
    if (a === 'camera') { this.view.camMode = (this.view.camMode + 1) % 3; toast(['추적 시점', '먼 추적 시점', '보닛 시점'][this.view.camMode], 1000); }
    if (a === 'mute') toast(audio.toggle() ? '소리 켬' : '소리 끔', 1000);
    if (a === 'menu') this.togglePause();
  }

  togglePause() {
    const on = $('pause').classList.contains('hidden');
    $('p-title').textContent = this.net ? '메뉴 (레이스는 계속됩니다)' : '일시정지';
    $('p-restart').classList.toggle('hidden', !!this.net);
    if (on) { show('pause'); if (!this.net) { this.paused = true; this.pauseAt = performance.now(); } }
    else { $('pause').classList.add('hidden'); if (!this.net && this.paused) { this.t0 += performance.now() - this.pauseAt; this.paused = false; } }
  }

  /** 지금 몇 프레임째여야 하나 (실수) */
  clockFrames(now) {
    if (this.net) return (this.net.serverNow() - this.startAt) / (1000 / FPS);
    if (this.paused) return (this.pauseAt - this.t0) / (1000 / FPS);
    return (now - this.t0) / (1000 / FPS);
  }

  sampleInput() {
    if (this.local < 0) return;
    const sim = this.session.sim;
    let v;
    // 시뮬 밖 기억(해시에 안 섞이게). ?bot=ram 은 시험용: 다른 차를 피하지 않는다(세 화면 충돌 동기 시험에 접촉을 만들려고)
    if (this.bot) v = botInput(sim, this.local, 0.9, this._botMem ||= { stuckT: 0, ram: Q.get('bot') === 'ram' });
    else {
      const i = controls.read();
      this.look = i.look;
      // 게임패드 아날로그 값은 조금 굵게 잘라 보낸다 (매 프레임 미세하게 바뀌면 메시지가 폭증 → 무료 한도)
      if (!i.kb) { i.steer = Math.round(i.steer * 40) / 40; i.thr = Math.round(i.thr * 16) / 16; i.brk = Math.round(i.brk * 16) / 16; }
      v = pack(i);
    }
    if (v === this.lastSent) return;
    this.lastSent = v;
    if (!this.net) { this.session.addConfirmed(this.local, this.session.frame, v); return; }
    // 핑이 크면(멀리서 접속) 입력을 조금 늦게 적용해 서버 도착이 늦지 않게 (최대 6프레임=0.1초)
    const delay = Math.max(INPUT_DELAY, Math.min(6, Math.round((this.net.rtt || 0) / 2 / (1000 / FPS)) - 1));
    const f = this.session.frame + delay;
    const q = ++this.seq;
    this.session.addPending(q, f, v);
    this.sendBuf.push([q, f, v]);
  }

  flush(now) {
    if (!this.net || !this.sendBuf.length) return;
    if (now - (this._lastFlush || 0) < 45 && this.sendBuf.length < 8) return;   // 초당 22번 이하로 묶어 보낸다
    this.net.send({ t: 'in', e: this.sendBuf });
    this.sendBuf = [];
    this._lastFlush = now;
  }

  loop(now) {
    if (!this.running) return;
    this._raf = requestAnimationFrame(t => this.loop(t));
    const cpu0 = performance.now();
    const dt = Math.min(0.1, (now - this.lastT) / 1000);
    this.lastT = now;
    const tf = this.clockFrames(now);
    const target = Math.max(0, Math.floor(tf) + 1);
    const alpha = Math.max(0, Math.min(1, tf - Math.floor(tf)));
    if (!this.paused) this.sampleInput();
    this.flush(now);
    const behind = target - this.session.frame;
    this.catchingUp = behind > 120;
    const t1 = performance.now();
    this.session.advanceTo(target, this.catchingUp ? 600 : 240);
    const simMs = performance.now() - t1;
    this.checkHash();
    const follow = this.local >= 0 ? this.local : this.spectate();
    this.view.update(alpha, dt, follow, this.look);
    this.hud.update(this.session, follow, this.view, this.names, this.netInfo());
    if (this.catchingUp) { this.hud.center.textContent = '따라잡는 중…'; this.hud.center.classList.add('small'); }
    audio.update(this.session.sim, follow, this.session.frame >= GO_FRAME || this.session.frame < GO_FRAME);
    gfx.render();
    // 성능 기록
    this.frameTimes.push(dt * 1000);
    if (this.frameTimes.length > 120) this.frameTimes.shift();
    this.fpsLog.push({ t: now, dt: dt * 1000, sim: simMs, cpu: performance.now() - cpu0, f: this.session.frame });
    window.__qKey = gfx.qKey; window.__scale = gfx.scaleDyn;
    if (this.fpsLog.length > 20000) this.fpsLog.shift();
    this.autoScale(dt);
    if (Q.get('fps') === '1') {
      const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
      const i = gfx.info();
      this.hud.fps.textContent = `${(1000 / avg).toFixed(0)} fps · 시뮬 ${simMs.toFixed(1)}ms · 해상도 ${(gfx.scaleDyn * 100).toFixed(0)}%\n그리기 ${i.calls}회 · 삼각형 ${(i.tris / 1000).toFixed(0)}k · 롤백 ${this.session.rollbacks}(최대 ${this.session.maxRollback})`;
    }
    // 끝
    if (this.session.sim.gs.over && !this.overShown) {
      this.overShown = true;
      setTimeout(() => this.finishWhenFinal(), 3500);
    }
  }

  /** 60fps 가 안 나오면 해상도를 조금씩 낮추고, 여유가 생기면 되돌린다.
   *  해상도를 최저(60%)까지 낮춰도 모자라면 그래픽 품질을 한 단계 내린다. */
  autoScale(dt) {
    if (Q.get('noscale') === '1') return;
    this.slowSec = (this.slowSec || 0) + (dt > 1 / 45 ? dt : -dt * 0.5);
    if (this.slowSec < 0) this.slowSec = 0;
    if (this.slowSec > 4 && gfx.scaleDyn <= 0.61 && gfx.qKey !== 'low') {
      const next = gfx.qKey === 'high' ? 'medium' : 'low';
      gfx.setQuality(next); gfx.scaleDyn = 0.8; gfx.resize(); syncBlobs();
      $('m-q').value = next; $('p-q').value = next;
      toast(`화면이 느려서 그래픽을 "${gfx.q.name}"(으)로 낮췄습니다`, 3500);
      this.slowSec = 0;
    }
    this.slow = this.slow * 0.97 + (dt > 1 / 50 ? 1 : 0) * 0.03;
    if (this.slow > 0.5 && gfx.scaleDyn > 0.6) { gfx.scaleDyn = Math.max(0.6, gfx.scaleDyn - 0.1); gfx.resize(); this.slow = 0; }
    else if (this.slow < 0.02 && gfx.scaleDyn < 1 && Math.random() < 0.002) { gfx.scaleDyn = Math.min(1, gfx.scaleDyn + 0.1); gfx.resize(); }
  }

  spectate() {
    const o = this.session.sim.standings();
    return o[0] ?? 0;
  }

  /** 멀티: 확정된 프레임(서버가 "이 프레임까지 입력 다 보냈다"고 한 곳)의 해시를 보내 세 화면이 같은지 확인 */
  checkHash() {
    if (!this.net) return;
    if (this.session.dirty !== Infinity) return;      // 되감기가 남아 있으면 아직 아니다
    // 내 입력 중 서버 확인을 아직 못 받은 게 있으면 그 이후 상태는 확정이 아니다
    let c = this.net.confirmed;
    for (const p of this.session.pending) c = Math.min(c, p.f - 1);
    this.sentHash ||= new Map();
    for (const [hf, h] of this.session.hashes) {
      if (hf <= c && hf < this.session.frame && !this.sentHash.has(hf)) {
        this.sentHash.set(hf, h);
        (this.sentInfo ||= {})[hf] = { c: this.net.confirmed, fr: this.session.frame, pend: this.session.pending.length, rb: this.session.rollbacks };
        this.net.send({ t: 'hash', f: hf, h });
      }
    }
    window.__sentHashes = Object.fromEntries(this.sentHash);
  }

  netInfo() {
    if (!this.net) return '';
    const n = this.net;
    return `${n.statusText}${n.rtt ? ` · 핑 ${Math.round(n.rtt)}ms` : ''}${n.desync ? '\n⚠ 화면 어긋남 감지' : ''}`;
  }

  results() {
    const sim = this.session.sim;
    return sim.standings().map((k, i) => {
      const c = sim.cars[k];
      return { pos: i + 1, slot: k, name: this.names[k] || c.name, car: c.spec.id, fin: c.st.fin ? c.st.fin - GO_FRAME : 0, best: c.st.best, laps: c.st.lap, dc: c.st.dc };
    });
  }

  /** 끝났다는 판단이 되감기로 뒤집힐 수 있다 → 확정된 뒤에만 결과를 낸다 */
  finishWhenFinal() {
    if (!this.running) return;
    const gs = this.session.sim.gs;
    if (!gs.over) { this.overShown = false; return; }
    if (this.net && (this.net.confirmed < gs.overAt || this.session.pending.length)) {
      if ((this._waitFinal = (this._waitFinal || 0) + 1) < 40) { setTimeout(() => this.finishWhenFinal(), 250); return; }
    }
    this.finish();
  }

  finish() {
    if (!this.running) return;
    const res = this.results();
    if (this.net) this.net.send({ t: 'done', r: res.map(r => [r.slot, Math.round(r.fin), Math.round(r.best)]) });
    this.stop();
    this.onEnd && this.onEnd(res, this);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this._raf);
    this.view.dispose();
    if (this.net) this.net.fast = false;
    $('hud').innerHTML = '';
    audio.stop();
    controls.onAction = null;
  }
}

// ────────────────────────────────────────────────────────────
// 화면 흐름
const app = {
  game: null, net: null, lobby: null, myId: null, solo: false, inRace: false, early: [],
  car: Q.get('car') || store.get('car', 'baram'),
  track: 'circuit', laps: 3, assist: store.get('assist', '1') === '1', bots: 2,
};
if (!CAR_BY_ID[app.car]) app.car = 'baram';

$('m-name').value = Q.get('name') || store.get('name', '');
$('m-room').value = Q.get('auto') || store.sget('room', '');
/** 그림자맵을 끄고 켤 때 차 밑 그림자판도 맞춘다 (안 하면 품질을 바꾼 뒤 차 그림자가 아예 없어진다) */
function syncBlobs() {
  for (const v of [app.game && app.game.view, bgView && bgView.v]) if (v) for (const c of v.cars) c.mesh.userData.blob.visible = !gfx.q.shadow;
}
$('m-q').onchange = e => { gfx.setQuality(e.target.value); store.set('quality', e.target.value); $('p-q').value = e.target.value; syncBlobs(); };
$('p-q').onchange = e => { gfx.setQuality(e.target.value); store.set('quality', e.target.value); $('m-q').value = e.target.value; syncBlobs(); if (app.game) toast('트랙 품질(나무 수 등)은 다음 레이스부터 적용됩니다'); };

function myName() {
  const n = cleanName($('m-name').value);
  if (!n) { $('m-msg').textContent = '이름을 먼저 적어 주세요.'; $('m-msg').className = 'msg err'; $('m-name').focus(); return null; }
  store.set('name', n);
  return n;
}

$('m-solo').onclick = () => {
  const n = cleanName($('m-name').value) || '나';
  // 방 들어가기가 진행 중이었으면 취소 (늦게 온 입장 응답이 혼자 연습을 끊지 않게)
  app.joinSeq = (app.joinSeq || 0) + 1;
  if (app.net) { app.net.close(); app.net = null; }
  $('m-msg').textContent = '';
  app.solo = true;
  openLobby(null, n);
};
$('m-new').onclick = () => {
  const n = myName(); if (!n) return;
  const code = randCode();
  $('m-room').value = code;
  joinRoom(code, n);
};
$('m-join').onclick = () => {
  const n = myName(); if (!n) return;
  const code = $('m-room').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length < 4) { $('m-msg').textContent = '방 코드는 4~6자(영문·숫자)입니다.'; $('m-msg').className = 'msg err'; return; }
  joinRoom(code, n);
};
$('m-room').addEventListener('keydown', e => { if (e.key === 'Enter') $('m-join').click(); });

// ── 대기실 그리기 ──
function renderCars() {
  const box = $('l-cars'); box.innerHTML = '';
  for (const c of CARS) {
    const b = document.createElement('button');
    b.className = 'carbtn' + (c.id === app.car ? ' sel' : '');
    const t = document.createElement('div'); t.className = 't'; t.textContent = c.name;
    const cl = document.createElement('span'); cl.className = 'c'; cl.textContent = c.cls; t.appendChild(cl);
    const bars = document.createElement('div'); bars.className = 'bars';
    const bar = (label, v) => { const l = document.createElement('span'); l.textContent = label; const bb = document.createElement('div'); bb.className = 'b'; const i = document.createElement('i'); i.style.width = Math.round(Math.max(0.05, Math.min(1, v)) * 100) + '%'; bb.appendChild(i); bars.append(l, bb); };
    // 능력치 1~5점 (모든 차 합 15점 — 성능은 비슷하고 성격만 다르다)
    for (const [k, label] of STAT_NAMES) bar(label, c.stats[k] / 5);
    b.title = c.desc;
    b.append(t, bars);
    const desc = document.createElement('div'); desc.className = 's'; desc.textContent = c.desc; desc.style.marginTop = '4px';
    b.append(desc);
    b.onclick = () => { app.car = c.id; store.set('car', c.id); renderCars(); if (app.net) { app.net.car = c.id; app.net.send({ t: 'car', car: c.id }); } updateLobby(); };
    box.appendChild(b);
  }
  updatePreview();
}
function renderTracks(isHost) {
  const box = $('l-tracks'); box.innerHTML = '';
  for (const d of TRACK_DEFS) {
    const b = document.createElement('button');
    b.className = d.id === app.track ? 'sel' : '';
    const T = getTrack(d.id);
    b.innerHTML = '';
    const t = document.createElement('b'); t.textContent = `${d.name}`;
    // 난이도 별(★ 1~3) · 종류 · 길이
    const sm = document.createElement('small'); sm.textContent = `${d.level ? '★'.repeat(d.level) + '☆'.repeat(3 - d.level) + ' ' : ''}${d.kind} · ${(T.L / 1000).toFixed(2)}km`;
    b.append(t, sm);
    b.disabled = !isHost;
    b.onclick = () => { app.track = d.id; if (app.net) app.net.send({ t: 'set', track: d.id }); updateLobby(); };
    box.appendChild(b);
  }
}

function openLobby(code, name) {
  stopBackground(); startBackground();
  show('lobby');
  app.name = name;
  $('l-code').textContent = app.solo ? '혼자' : code;
  $('l-copy').classList.toggle('hidden', app.solo);
  document.querySelectorAll('.solo-only').forEach(e => e.classList.toggle('hidden', !app.solo));
  $('l-conn').textContent = app.solo ? '' : '연결 중…';
  $('l-assist').checked = app.assist;
  renderCars();
  updateLobby();
}

function updateLobby() {
  const L = app.lobby;
  const isHost = app.solo || (L && L.host === app.myId);
  renderTracks(isHost);
  $('l-laps').disabled = !isHost;
  $('l-host-note').textContent = isHost ? '(방장: 트랙·랩 수를 정합니다)' : '(방장이 정합니다)';
  const ul = $('l-players'); ul.innerHTML = '';
  const players = app.solo ? [{ id: 'me', name: app.name, car: app.car, ready: true, conn: true }] : (L ? L.players : []);
  players.forEach((p, i) => {
    const li = document.createElement('li');
    const dot = document.createElement('span'); dot.className = 'dot'; dot.style.background = '#' + PAINT[i % PAINT.length].toString(16).padStart(6, '0');
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = p.name + (p.id === app.myId ? ' (나)' : '') + (L && p.id === L.host ? ' 👑' : '');
    const car = document.createElement('span'); car.className = 'car'; car.textContent = `${(CAR_BY_ID[p.car] || CARS[0]).name} · ${PAINT_NAME[i % PAINT_NAME.length]}`;
    const tag = document.createElement('span'); tag.className = 'tag' + (!p.conn ? ' off' : p.ready ? ' ready' : '');
    tag.textContent = !p.conn ? '연결 끊김' : p.ready ? '준비 완료' : '고르는 중';
    li.append(dot, nm, car, tag);
    ul.appendChild(li);
  });
  if (L) { app.track = L.track; $('l-laps').value = String(L.laps); }
  const me = L && L.players.find(p => p.id === app.myId);
  $('l-ready').classList.toggle('hidden', app.solo);
  $('l-ready').textContent = me && me.ready ? '준비 취소' : '준비';
  const allReady = L && L.players.filter(p => p.conn).every(p => p.ready);
  $('l-start').classList.toggle('hidden', !isHost);
  $('l-start').disabled = !app.solo && !(allReady && L.phase === 'lobby');
  $('l-msg').textContent = app.solo ? '' : L && L.phase === 'race' ? '레이스 진행 중 — 끝나면 같이 탈 수 있습니다' : isHost ? (allReady ? '모두 준비됐습니다. 출발을 누르세요.' : '모두 준비되면 출발할 수 있습니다.') : (me && me.ready ? '방장이 출발하기를 기다리는 중…' : '차를 고르고 준비를 누르세요.');
}

$('l-laps').onchange = e => { app.laps = +e.target.value; if (app.net) app.net.send({ t: 'set', laps: app.laps }); };
$('l-assist').onchange = e => { app.assist = e.target.checked; store.set('assist', app.assist ? '1' : '0'); if (app.net) { app.net.assist = app.assist; app.net.send({ t: 'assist', on: app.assist }); } };
$('l-bots').onchange = e => { app.bots = +e.target.value; };
$('l-ready').onclick = () => { const me = app.lobby && app.lobby.players.find(p => p.id === app.myId); if (app.net) app.net.send({ t: 'ready', on: !(me && me.ready) }); };
$('l-copy').onclick = async () => {
  const url = location.origin + location.pathname;
  const txt = `한판 레이스 같이 해요!\n① 크롬으로 ${url} 열기\n② 이름 적고 방 코드 ${app.lobby?.code || $('l-code').textContent} 입력 → 방 들어가기\n③ 차 고르고 [준비] 누르기`;
  try { await navigator.clipboard.writeText(txt); toast('초대 문구를 복사했습니다'); } catch { prompt('복사해서 보내세요', txt); }
};
$('l-leave').onclick = () => leaveToMenu();
$('l-start').onclick = () => {
  if (app.solo) return startSolo();
  if (app.net) app.net.send({ t: 'start' });
};
$('r-back').onclick = () => {
  if (app.solo) { openLobby(null, app.name); return; }
  if (app.net) { app.net.send({ t: 'back' }); show('lobby'); startBackground(); updateLobby(); }
  else leaveToMenu();
};
$('p-resume').onclick = () => app.game && app.game.togglePause();
$('p-restart').onclick = () => { if (app.game && !app.net) { const g = app.game; g.stop(); app.game = null; startSolo(); } };
$('p-quit').onclick = () => {
  $('pause').classList.add('hidden');
  const g = app.game;
  // 멀티에서 나가면 내 차를 "끊김"으로 알린다 → 다른 화면에서 유령이 되어 비키고, 완주 판정을 막지 않는다
  if (g && g.net && g.local >= 0) g.net.send({ t: 'in', e: [[++g.seq, g.session.frame + INPUT_DELAY, NEUTRAL | (1 << 21)]] });
  if (g && g.net) { app.inRace = false; app.early = []; app.leftRace = g.startAt; }
  if (app.game) { app.game.stop(); app.game = null; }
  if (app.solo) openLobby(null, app.name);
  else { show('lobby'); startBackground(); updateLobby(); }
};

function leaveToMenu() {
  app.launchId = (app.launchId || 0) + 1;
  app.joinSeq = (app.joinSeq || 0) + 1;
  $('m-msg').textContent = '';
  if (app.game) { app.game.stop(); app.game = null; }
  if (app.net) { app.net.close(); app.net = null; }
  app.lobby = null; app.solo = false;
  store.sset('room', '');
  show('menu');
  startBackground();
}

// ── 혼자 연습 ──
function startSolo() {
  const players = [{ car: app.car, name: app.name, abs: app.assist, tcs: app.assist }];
  // AI 는 내 차 다음 차들로 (성능은 모두 비슷하다 — 성격만 다르게 섞이도록)
  const at = Math.max(0, CARS.findIndex(c => c.id === app.car));
  const pool = [...CARS.slice(at + 1), ...CARS.slice(0, at)];
  for (let i = 0; i < app.bots; i++) players.push({ car: pool[i].id, name: `AI ${i + 1}`, bot: true, botSkill: 0.86 + i * 0.03, abs: true, tcs: true });
  launch({ track: app.track, laps: +$('l-laps').value || 3, players }, 0, null, 0, players.map(p => p.name));
}

function launch(cfg, localSlot, net, startAt, names, log = []) {
  stopBackground();
  show('loading');
  $('ld-bar').style.width = '30%';
  const id = app.launchId = (app.launchId || 0) + 1;
  setTimeout(() => {
    if (id !== app.launchId) return;              // 그사이 다른 출발·취소가 있었다
    if (app.game) { app.game.stop(); app.game = null; }
    try {
      app.game = new Game({
        cfg, localSlot, net, startAt, names, bot: Q.get('bot') === '1' || Q.get('bot') === 'ram',
        onEnd: (res, g) => {
          app.game = null;
          if (net) app.leftRace = startAt;        // 끝낸 레이스로 재접속 때 다시 끌려 들어가지 않게
          window.__lastResults = { res, hash: g.session.sim.hash(), frame: g.session.sim.gs.frame, stats: { ...g.session.stats(), rtt: g.net?.rtt, offset: g.net?.offset },
            ev: g.session.ev, cfg, local: localSlot, sent: window.__sentHashes || {}, desync: !!(g.net && g.net.desync),
            final: Object.fromEntries(g.session.hashes), sentInfo: g.sentInfo || {},
            netSent: g.net ? g.net.sent - (g.sent0 || 0) : 0, raceSec: g.session.frame / FPS };
          showResults(res, cfg, localSlot);
        },
      });
      // 재접속·관전: 지금까지의 입력 기록 + 불러오는 동안 도착한 입력을 넣는다
      const g = app.game;
      for (const [p, f, v] of log) g.session.addConfirmed(p, f, v);
      if (net) {
        for (const [p, f, v, q] of app.early || []) {
          if (p === localSlot && q) g.session.confirm(q, f, v); else g.session.addConfirmed(p, f, v);
        }
        app.early = [];
        // 재접속한 경우 내 예전 입력은 이미 확정 기록에 있다 → 내 다음 입력 번호가 겹치지 않게
        g.seq = Date.now() % 100000000;
      }
      document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    } catch (e) {
      console.error(e);
      show('lobby');
      $('l-msg').textContent = '레이스를 시작하지 못했습니다: ' + (e.message || e);
    }
  }, 30);
}

function showResults(res, cfg, localSlot) {
  show('results');
  const tb = $('r-table'); tb.innerHTML = '';
  const hd = document.createElement('tr');
  for (const h of ['순위', '이름', '차', '기록', '최고 랩']) { const th = document.createElement('th'); th.textContent = h; hd.appendChild(th); }
  tb.appendChild(hd);
  for (const r of res) {
    const tr = document.createElement('tr');
    if (r.slot === localSlot) tr.className = 'me';
    const cells = [r.fin ? `${r.pos}위` : '—', r.name + (r.dc ? ' (나감)' : ''), (CAR_BY_ID[r.car] || CARS[0]).name, r.fin ? fmtTime(r.fin) : `완주 못함 (${r.laps}랩)`, fmtTime(r.best)];
    for (const c of cells) { const td = document.createElement('td'); td.textContent = c; tr.appendChild(td); }
    tb.appendChild(tr);
  }
  // 개인 최고 기록 (트랙·차별)
  const mine = res.find(r => r.slot === localSlot);
  const rec = $('r-rec'); rec.innerHTML = '';
  if (mine && mine.best > 0) {
    const key = `best.${cfg.track}.${mine.car}`;
    const old = +store.get(key, '0');
    const t = document.createElement('div');
    if (!old || mine.best < old) { store.set(key, String(mine.best)); t.innerHTML = ''; const b = document.createElement('b'); b.textContent = `새 개인 최고 랩! ${fmtTime(mine.best)}`; t.appendChild(b); if (old) t.append(` (이전 ${fmtTime(old)})`); }
    else t.textContent = `이 트랙·차 개인 최고 랩: ${fmtTime(old)}`;
    rec.appendChild(t);
  }
  if (app.lobby && app.lobby.records && app.lobby.records[cfg.track]) {
    const r = app.lobby.records[cfg.track];
    const t = document.createElement('div');
    t.textContent = `이 방 최고 랩: ${fmtTime(r.best)} — ${r.name} (${(CAR_BY_ID[r.car] || CARS[0]).name})`;
    rec.appendChild(t);
  }
  $('r-title').textContent = mine && mine.fin ? `${mine.pos}위로 완주!` : '레이스 종료';
}

// ── 멀티 ──
function wsUrl() {
  if (Q.get('ws')) return Q.get('ws');
  return window.__NET?.ws || '';
}

async function joinRoom(code, name) {
  $('m-msg').textContent = '서버에 연결하는 중…'; $('m-msg').className = 'msg';
  const seq = app.joinSeq = (app.joinSeq || 0) + 1;
  let url = wsUrl();
  if (!url) {
    try {
      const r = await fetch('data/net.json', { cache: 'no-store' });
      if (r.ok) { const j = await r.json(); url = j.ws || ''; window.__NET = j; }
    } catch { /* */ }
  }
  if (seq !== app.joinSeq) return;               // 기다리는 사이 취소됨(혼자 연습·나가기)
  if (!url) { $('m-msg').textContent = '실시간 서버 주소가 없습니다(혼자 연습만 가능).'; $('m-msg').className = 'msg err'; return; }
  if (app.net) app.net.close();
  app.solo = false;
  store.sset('room', code);
  const net = new NetClient(url, code, name, token(), app.car, app.assist);
  app.net = net;
  const H = {
    status(txt, ok) {
      $('l-conn').textContent = txt; $('l-conn').className = 'conn ' + (ok ? 'ok' : 'bad');
      // 첫 화면에서 계속 못 붙으면 알아들을 수 있게 알려 준다 (회사망이 막는 경우)
      if (!ok && net.tries >= 3 && !$('menu').classList.contains('hidden')) {
        $('m-msg').textContent = '서버에 연결되지 않습니다 — 회사 네트워크가 막았을 수 있습니다. 휴대폰 핫스팟으로 해 보거나 [혼자 연습하기]를 쓰세요. (계속 다시 시도하는 중)';
        $('m-msg').className = 'msg err';
      }
    },
    welcome(msg) {
      app.myId = msg.you;
      app.lobby = msg.lobby;
      $('m-msg').textContent = '';
      // 같은 레이스 도중 잠깐 끊겼다 붙은 경우: 화면을 다시 만들지 않고 입력 기록만 맞춘다
      const g = app.game;
      if (g && g.net && msg.race && msg.race.startAt === g.startAt) {
        g.resync(msg.log || []);
        return;
      }
      // 끊긴 사이 레이스가 끝났으면 돌던 화면은 멈춘다 (좀비 게임이 대기실 위에서 계속 돌지 않게)
      if (g) { g.stop(); app.game = null; app.inRace = false; }
      // 스스로 나갔거나 이미 끝낸 레이스로 다시 끌려 들어가지 않는다
      if (msg.race && msg.race.startAt === app.leftRace) msg.race = null;
      // 결과를 보고 있던 중이면 결과 화면을 그대로 둔다
      if (!msg.race && !$('results').classList.contains('hidden')) {
        $('l-conn').textContent = '연결됨'; $('l-conn').className = 'conn ok';
        return;
      }
      openLobby(code, name);
      $('l-conn').textContent = '연결됨'; $('l-conn').className = 'conn ok';
      if (msg.race) enterRace(msg.race, msg.log || []);
    },
    lobby(l) {
      app.lobby = l;
      if (l.phase !== 'race') app.inRace = false;
      if (!app.game) updateLobby();
      // 시험 자동화: ?ready=1 이면 자동 준비, ?autostart=N 이면 방장이 N명 준비되면 출발
      const me = l.players.find(p => p.id === app.myId);
      if (Q.get('ready') === '1' && !app.raced && me && !me.ready && l.phase === 'lobby' && !app.game && !app.autoReadySent) { app.autoReadySent = true; net.send({ t: 'ready', on: true }); setTimeout(() => { app.autoReadySent = false; }, 1500); }
      // 시험 자동화: ?track=&laps= 이면 방장이 그렇게 맞춘다
      if (l.host === app.myId && l.phase === 'lobby' && !app.raced) {
        const want = {};
        if (Q.get('track') && l.track !== Q.get('track')) want.track = Q.get('track');
        if (Q.get('laps') && l.laps !== +Q.get('laps')) want.laps = +Q.get('laps');
        if (Object.keys(want).length) net.send({ t: 'set', ...want });
      }
      const need = +(Q.get('autostart') || 0);
      if (need && !app.raced && l.host === app.myId && l.phase === 'lobby' && !app.game) {
        const conn = l.players.filter(p => p.conn);
        const setOK = (!Q.get('track') || l.track === Q.get('track')) && (!Q.get('laps') || l.laps === +Q.get('laps'));
        if (setOK && conn.length >= need && conn.every(p => p.ready || p.id === app.myId) && !app.autoStartSent) { app.autoStartSent = true; setTimeout(() => { net.send({ t: 'start' }); app.autoStartSent = false; }, 800); }
      }
    },
    start(race) { enterRace(race, []); },
    input(p, f, v, q) {
      const g = app.game;
      // 트랙을 불러오는 동안 온 입력도 버리면 안 된다(버리면 이 화면만 계산이 어긋난다)
      if (!g || !g.net) { if (app.inRace) app.early.push([p, f, v, q]); return; }
      if (p === g.local && q) g.session.confirm(q, f, v);
      else g.session.addConfirmed(p, f, v);
    },
    error(code2, text) {
      $('m-msg').textContent = text; $('m-msg').className = 'msg err';
      if (code2 === 'full' || code2 === 'version' || code2 === 'badroom' || code2 === 'replaced') {
        app.launchId = (app.launchId || 0) + 1;
        if (app.game) { app.game.stop(); app.game = null; }
        app.inRace = false;
        net.close(); app.net = null; show('menu'); startBackground();
      }
      if (code2 === 'version' || code2 === 'mixed' || code2 === 'racever') offerHardReload(code2 === 'version' ? $('m-msg') : $('l-msg'));
      toast(text, 4000);
    },
    desync(f) { toast('⚠ 세 화면의 계산이 어긋났습니다 (프레임 ' + f + ')', 4000); },
    closed() { /* 재접속은 NetClient 가 한다 */ },
  };
  // 이미 버려진 연결(나가기·다른 방·혼자 연습)의 늦은 메시지는 무시한다
  net.on = {};
  for (const k in H) net.on[k] = (...a) => { if (app.net === net) H[k](...a); };
  net.connect();
}

/** 새 버전을 확실히 받는 새로고침 — F5 는 GitHub Pages 캐시(최대 10분) 때문에 옛 파일을 쓸 수 있다 */
async function hardReload() {
  try {
    const urls = performance.getEntriesByType('resource').map(e => e.name).filter(u => /\.(js|css|json)(\?|$)/.test(u));
    await Promise.all([location.href, ...urls].map(u => fetch(u, { cache: 'reload' }).catch(() => {})));
  } catch { /* */ }
  location.reload();
}
function offerHardReload(where) {
  if (!where || where.querySelector('button')) return;
  const b = document.createElement('button');
  b.className = 'small'; b.textContent = '새 버전 받기'; b.style.marginLeft = '8px';
  b.onclick = hardReload;
  where.appendChild(b);
}

function enterRace(race, log) {
  // 두 번째 레이스부터 옛 확정 프레임이 남아 있으면 확정 전 해시를 보내 거짓 경고가 난다 (독립검증)
  if (app.net) { app.net.confirmed = -1; app.net.desync = false; }
  app.inRace = true;
  app.raced = true;
  app.early = [];
  // race = { startAt, cfg:{track,laps,players:[{id,name,car,abs,tcs}]}, n }
  const players = race.cfg.players;
  const localSlot = players.findIndex(p => p.id === app.myId);
  if (app.game) { app.game.stop(); app.game = null; }
  const cfg = { track: race.cfg.track, laps: race.cfg.laps, players: players.map(p => ({ car: p.car, name: p.name, abs: p.abs, tcs: p.tcs })) };
  launch(cfg, localSlot, app.net, race.startAt, players.map(p => p.name), log);
  if (localSlot < 0) toast('레이스 진행 중 — 관전합니다', 3000);
}

// ── 시작 ──
show('menu');
startBackground();
(function bgLoop() {
  requestAnimationFrame(bgLoop);
  if (!bgView || app.game || window.__garage) return;
  const now = performance.now();
  let tf = (now - bgView.t0) / (1000 / FPS) + GO_FRAME;
  const bs = bgView.s;
  if (tf - bs.frame > 120) { bgView.t0 = now - (bs.frame - GO_FRAME) * (1000 / FPS); tf = bs.frame; }   // 탭을 떠났다 오면 따라잡지 말고 이어서
  bs.advanceTo(Math.floor(tf) + 1, 30);
  // 배경 레이스는 되감을 일이 없으니 저장본·해시를 쌓아 두지 않는다 (켜 둔 탭 메모리 증가 방지)
  if (bs.snaps.size > 420) for (const k of bs.snaps.keys()) if (k < bs.frame - 360) bs.snaps.delete(k);
  if (bs.hashes.size > 100) bs.hashes.clear();
  if (bs.sim.gs.over) { stopBackground(); startBackground(); }
  bgView.v.update(tf - Math.floor(tf), 1 / 60, 0, false);
  gfx.render();
})();

// 레이스 중 탭을 닫으려 하면 한 번 묻는다 — 부스터가 Ctrl 이라 WASD 로 달리다 Ctrl+W 를 누르면
// 크롬이 탭을 바로 닫는다(웹 페이지가 막을 수 없는 단축키). 시험 자동운전(?bot=)은 묻지 않는다.
// 레이스 중 Ctrl(부스터)과 함께 눌린 글자키가 크롬 단축키(Ctrl+D 북마크·Ctrl+S 저장·Ctrl+R 새로고침·Ctrl+A 전체선택 등)로 새지 않게 (4차 독립검증)
window.addEventListener('keydown', e => { if (app.game && e.ctrlKey && /^Key[A-Z]$/.test(e.code)) e.preventDefault(); });
// 레이스 중 창이 비활성화되면(Shift 5번 → Windows 고정 키 창 등) 누르던 키가 풀린다 → 알려 준다
window.addEventListener('blur', () => { if (app.game && app.game.hud) app.game.hud.message('게임 창이 비활성화됐어요 — 키를 다시 눌러 주세요', 2.5, false); });
window.addEventListener('beforeunload', e => {
  if (app.game && !app.game.bot && !Q.get('bot')) { e.preventDefault(); e.returnValue = ''; }
});

document.addEventListener('visibilitychange', () => {
  // 혼자 연습은 탭을 떠나면 일시정지, 소리는 멈춘다
  try { if (audio.ctx) document.hidden ? audio.ctx.suspend() : audio.ctx.resume(); } catch { /* */ }
  if (document.hidden && app.game && !app.game.net && !app.game.paused) app.game.togglePause();
  // 멀티 중 탭을 떠나면 차가 멋대로 달리지 않게 입력을 중립으로
  if (document.hidden && app.game && app.game.net && app.game.local >= 0) {
    app.game.lastSent = -1;
    const g = app.game;
    const f = g.session.frame + INPUT_DELAY, q = ++g.seq, v = NEUTRAL;
    g.session.addPending(q, f, v);
    g.net.send({ t: 'in', e: [[q, f, v]] });
  }
});

if (Q.get('garage') === '1') {
  // 차고: 차 10종을 나란히 세워 모형 확인 (시험용)
  stopBackground();
  show(null);
  document.querySelectorAll('.screen').forEach(e => e.classList.add('hidden'));
  import('./render/garage.js').then(m => m.garage(gfx, Q));
} else if (Q.get('solo') === '1') {
  app.track = Q.get('track') || 'circuit';
  app.bots = +(Q.get('bots') ?? 2);
  app.name = cleanName(Q.get('name')) || '나';
  app.solo = true;
  $('l-laps').value = Q.get('laps') || '3';
  startSolo();
} else if (Q.get('auto')) {
  const n = cleanName(Q.get('name')) || ('손님' + Math.floor(Math.random() * 90 + 10));
  $('m-name').value = n;
  joinRoom(Q.get('auto').toUpperCase(), n);
}

window.__app = app;
window.__gfx = gfx;
window.__version = VERSION;
console.log('한판 레이스', VERSION, 'protocol', PROTOCOL);
