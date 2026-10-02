// 한판 레이스 실시간 서버 (Cloudflare Worker + Durable Object)
//
// 방 코드마다 Durable Object 하나. 하는 일:
//  · 대기실: 누가 있는지, 차·준비·방장·트랙·랩 수
//  · 레이스: 각자 보낸 입력에 "프레임 도장"을 찍어 모두에게 중계 (서버가 시간의 기준)
//    - 너무 늦게 온 입력은 도장을 "지금-12프레임"으로 고쳐 찍는다 → 과거를 무한정 되돌리지 않게
//    - 모든 PC가 같은 도장 목록으로 계산하므로 결과(충돌 포함)가 같아진다
//  · 끊긴 사람의 차는 서버가 "연결 끊김" 입력을 넣어 서서히 멈추고 유령(통과)으로 만든다
//  · 세 화면의 계산 해시를 비교해서 어긋나면 알린다
// 차의 물리 계산은 하지 않는다(그래서 서버가 가볍고 무료 한도 안에 든다).
//
// 무료 한도 보호:
//  · 대기실에서 아무 일 없으면 Durable Object 가 잠든다(잠든 동안은 사용시간 과금 없음).
//    연결 유지 신호 "ka" 는 자동응답이라 서버를 깨우지 않는다.
//  · 연결당 초당 메시지 수 제한, 메시지 크기 제한, 방 인원 4명.

const PROTOCOL = 5;              // 4: 카트식(부스터 키 비트 22) — 2026-10-02 / 5: 차 색 고르기·대기실 대화 — 2026-10-02 14회차
const MAX_PLAYERS = 4;
const FRAME_MS = 1000 / 60;
const LATE = 30, EARLY = 40;         // 0.5초까지 늦은 입력은 원래 시점 그대로 인정 (멀리서 들어온 사람도 자기 화면대로 달리게)
const TICK_MS = 250;
const MAX_MSG = 8192;
const RATE = 60, BURST = 150;
const LOBBY_GRACE_MS = 45000;          // 대기실에서 끊긴 사람 자리 유지 (새로고침 대비)
const RACE_MAX_MS = 25 * 60 * 1000;
const TRACKS = ['circuit', 'mountain', 'city', 'beach', 'canyon', 'glacier', 'harbor', 'express',
  'village', 'forest', 'desert', 'fairy', 'nymph', 'pirate', 'china', 'ice', 'cemetery', 'factory', 'mansion', 'moonhill', 'golden', 'mine', 'space'];   // web/src/sim/tracks.js 와 같아야 한다 (tests/room_unit.mjs 가 대조)
const CARS = ['kongal', 'masil', 'beongae', 'deundeun', 'jimkkun', 'baram', 'cheondung', 'yuseong', 'heukmeonji', 'chueok',
  'seongchae', 'changkkeut', 'gaeguri', 'dungdung', 'hwasal', 'moseori', 'bitjul', 'kkoma'];   // 14회차 미래형·차급 8종
const NPAINT = 20;                     // 차 색 20가지 (web/src/render/carmesh.js PAINT 와 같은 개수)
// 대화: 한 줄 120자, 0.7초에 1줄·10초에 6줄까지, 최근 20줄만 메모리에 (저장소에는 안 남김)
const CHAT_MAX = 120, CHAT_GAP_MS = 700, CHAT_WIN_MS = 10000, CHAT_WIN_N = 6, CHAT_KEEP = 20;
// 입력 정수 (web/src/sim/input.js 와 같은 규칙)
const NEUTRAL = 128 | (1 << 20);
const DC_INPUT = NEUTRAL | (1 << 21);

function cleanName(s) {
  if (typeof s !== 'string') return '손님';
  const t = s.replace(/[\u0000-\u001f\u007f<>&"'\\]/g, '').trim().slice(0, 12);
  return t || '손님';
}
/** 대화 글: 제어문자·글자 방향 바꾸기 문자 제거, 공백 정리, 120자 (화면은 글자로만 그린다 — HTML 로 해석하지 않음) */
function cleanChat(s) {
  if (typeof s !== 'string') return '';
  const t = s.replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g, ' ').replace(/\s+/g, ' ').trim();
  return Array.from(t).slice(0, CHAT_MAX).join('');
}
const isInt = v => Number.isInteger(v);
const okPaint = v => isInt(v) && v >= 0 && v < NPAINT;
const att = ws => { try { return ws.deserializeAttachment() || {}; } catch { return {}; } };

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = { 'access-control-allow-origin': '*' };
    if (url.pathname === '/health') return new Response('ok', { headers: cors });
    if (url.pathname === '/ws') {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket only', { status: 426 });
      const room = (url.searchParams.get('room') || '').toUpperCase();
      if (!/^[A-Z0-9]{4,6}$/.test(room)) return new Response('bad room', { status: 400 });
      const stub = env.ROOM.get(env.ROOM.idFromName('room:' + room));
      const h = new Headers(req.headers);
      h.set('x-room', room);
      return stub.fetch(new Request(req.url, { headers: h }));
    }
    return new Response('한판 레이스 서버입니다. 게임 주소: https://kkm9471.github.io/race3d/', { headers: { 'content-type': 'text/plain; charset=utf-8', ...cors } });
  },
};

export class Room {
  constructor(ctx, env) {
    this.ctx = ctx; this.env = env;
    this.code = '';
    this.settings = { track: 'circuit', laps: 3, host: null, nextId: 1, records: {} };
    this.players = new Map();          // id → { id, name, car, ready, assist, tok, conn, ver, leftAt, order }
    // 소켓 식별은 연결마다 붙는 첨부정보(attachment)의 고유번호 c 로 한다.
    // 실제 Cloudflare 에서는 같은 연결이라도 메시지마다 소켓 객체가 같다는 보장이 없다(로컬 모의 서버와 다름 — 실측).
    this.race = null;                  // { startAt, cfg, log, last, hashes, slotOf, ended }
    this.chat = [];                    // 최근 대화 (잠들면 사라진다 — 일부러 저장하지 않음)
    this.phase = 'lobby';
    this.tickTimer = null;
    this.rate = new Map();
    this.loaded = false;
    // 잠들었다 깨어난 경우: 붙어 있는 소켓에서 사람 정보를 되살린다
    for (const ws of this.ctx.getWebSockets()) {
      const a = ws.deserializeAttachment();
      if (a && a.id) this.players.set(a.id, { ...a.p, conn: true });
    }
    try { this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ka', 'ka!')); } catch { /* 구버전 런타임 */ }
  }

  async load() {
    if (this.loaded) return;
    this.loaded = true;
    const s = await this.ctx.storage.get('settings');
    if (s) this.settings = { ...this.settings, ...s };
    const c = await this.ctx.storage.get('code');
    if (c) this.code = c;
    const order = await this.ctx.storage.get('players');
    if (Array.isArray(order)) {
      // 잠들기 전 대기실에 있던 사람(연결은 끊겼을 수 있음) — 자리만 복구
      // 저장된 leftAt 을 그대로 쓴다 (깨어날 때마다 새 유예시간을 주면 떠난 사람이 영영 자리를 차지한다 — 독립검증)
      for (const p of order) if (!this.players.has(p.id)) this.players.set(p.id, { ...p, conn: false, leftAt: p.leftAt || Date.now() });
    }
    // 잠들기 전 방장이 떠났을 수 있다 → 실제 연결된 사람 기준으로 다시 정한다
    this.prune();
  }

  async save() {
    await this.ctx.storage.put('settings', this.settings);
    await this.ctx.storage.put('players', [...this.players.values()].map(p => ({ id: p.id, name: p.name, car: p.car, paint: p.paint, ready: false, assist: p.assist, tok: p.tok, order: p.order, ver: p.ver, leftAt: p.conn ? 0 : (p.leftAt || Date.now()) })));
  }

  saveSoon() {
    if (this._saveT) return;
    const wait = Math.max(0, 5000 - (Date.now() - (this._lastSave || 0)));
    this._saveT = setTimeout(async () => { this._saveT = null; this._lastSave = Date.now(); await this.trySave(); }, wait);
  }

  async trySave() {
    // 저장 실패(무료 한도 소진 등)가 입장·진행을 막지 않게
    try { await this.save(); } catch { /* 다음 저장 때 다시 */ }
  }

  async fetch(req) {
    await this.load();
    const room = req.headers.get('x-room') || '';
    if (room && this.code !== room) { this.code = room; await this.ctx.storage.put('code', room); }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ id: null, c: crypto.randomUUID() });
    return new Response(null, { status: 101, webSocket: client });
  }

  send(ws, obj) { try { ws.send(JSON.stringify(obj)); } catch { /* 끊긴 소켓 */ } }
  broadcast(obj) {
    const s = JSON.stringify(obj);
    for (const ws of this.ctx.getWebSockets()) { try { ws.send(s); } catch { /* */ } }
  }

  lobbyView() {
    const ps = [...this.players.values()].sort((a, b) => a.order - b.order);
    return {
      code: this.code, host: this.settings.host, phase: this.phase, track: this.settings.track, laps: this.settings.laps,
      players: ps.map(p => ({ id: p.id, name: p.name, car: p.car, paint: okPaint(p.paint) ? p.paint : 0, ready: !!p.ready, conn: !!p.conn, assist: !!p.assist })),
      records: this.settings.records,
    };
  }
  pushLobby() { this.broadcast({ t: 'lobby', lobby: this.lobbyView() }); }

  serverFrame() { return Math.floor((Date.now() - this.race.startAt) / FRAME_MS); }

  /** 끊긴 지 오래된 사람 정리, 방장 넘기기 */
  prune() {
    const now = Date.now();
    for (const [id, p] of this.players) {
      const inRace = this.race && !this.race.ended && this.race.slotOf.has(id);
      if (!p.conn && !inRace && now - (p.leftAt || 0) > LOBBY_GRACE_MS) this.players.delete(id);
    }
    const host = this.players.get(this.settings.host);
    if (!host || !host.conn) {
      const next = [...this.players.values()].filter(p => p.conn).sort((a, b) => a.order - b.order)[0];
      if (next) this.settings.host = next.id;
      else if (!host) this.settings.host = null;
    }
  }

  allow(ws) {
    const now = Date.now();
    const key = att(ws).c || 'x';
    let b = this.rate.get(key);
    if (!b) { b = { tokens: BURST, t: now, strikes: 0 }; this.rate.set(key, b); }
    const el = (now - b.t) / 1000;
    b.tokens = Math.min(BURST, b.tokens + el * RATE);
    b.strikes = Math.max(0, b.strikes - el * 20);      // 잠깐 몰아 보낸 건 곧 잊는다
    b.t = now;
    if (b.tokens < 1) {
      b.strikes++;
      // 오래 계속 폭주하는 연결만 끊는다 (정상 클라이언트는 초당 30개 이하)
      if (b.strikes > 2000) { try { ws.close(4004, 'too many messages'); } catch { /* */ } }
      return false;
    }
    b.tokens -= 1;
    return true;
  }

  async webSocketMessage(ws, data) {
    await this.load();
    if (typeof data !== 'string' || data.length > MAX_MSG) return;
    if (!this.allow(ws)) return;
    let m;
    try { m = JSON.parse(data); } catch { return; }
    if (!m || typeof m !== 'object' || typeof m.t !== 'string') return;
    const id = att(ws).id;
    if (m.t === 'ping') { this.send(ws, { t: 'pong', c: typeof m.c === 'number' ? m.c : 0, s: Date.now() }); return; }
    if (m.t === 'hi') return this.hello(ws, m);
    if (!id) return;
    const p = this.players.get(id);
    if (!p) return;
    switch (m.t) {
      case 'car':
        if (CARS.includes(m.car)) { p.car = m.car; this.attach(ws, p); this.pushLobby(); }
        break;
      case 'assist': p.assist = !!m.on; this.attach(ws, p); this.pushLobby(); break;
      case 'paint':
        if (okPaint(m.paint) && m.paint !== p.paint) { p.paint = m.paint; this.attach(ws, p); this.pushLobby(); }
        break;
      case 'chat': this.chatMsg(ws, p, m.text); break;
      case 'ready':
        if (this.phase === 'lobby') { p.ready = !!m.on; this.attach(ws, p); this.pushLobby(); }
        break;
      case 'set': {
        if (id !== this.settings.host || this.phase !== 'lobby') break;
        const t0 = this.settings.track, l0 = this.settings.laps;
        if (TRACKS.includes(m.track)) this.settings.track = m.track;
        if (isInt(m.laps) && m.laps >= 1 && m.laps <= 5) this.settings.laps = m.laps;
        if (t0 === this.settings.track && l0 === this.settings.laps) break;
        // 바뀐 설정은 바로 반영하고, 저장만 5초에 한 번으로 모은다 (연타로 저장 한도를 갉아먹지 않게, 빠른 연속 변경도 잃지 않게)
        this.pushLobby();
        this.saveSoon();
        break;
      }
      case 'start': await this.start(ws, id); break;
      case 'in': this.input(id, m.e); break;
      case 'hash': this.hash(id, m); break;
      case 'done': await this.done(id, m.r); break;
      case 'back': p.ready = false; this.attach(ws, p); this.pushLobby(); break;
      case 'bye': p.conn = false; p.leftAt = 0; await this.leave(ws, id, true); break;
    }
  }

  attach(ws, p) {
    ws.serializeAttachment({ id: p.id, c: att(ws).c, p: { id: p.id, name: p.name, car: p.car, paint: p.paint, ready: p.ready, assist: p.assist, tok: p.tok, order: p.order, ver: p.ver } });
  }

  /** 대기실 대화 한 줄 — 너무 빠르면 보낸 사람에게만 알린다 */
  chatMsg(ws, p, raw) {
    const text = cleanChat(raw);
    if (!text) return;
    const now = Date.now();
    p.chatT = (p.chatT || []).filter(t => now - t < CHAT_WIN_MS);
    if (p.chatT.length >= CHAT_WIN_N || (p.chatT.length && now - p.chatT[p.chatT.length - 1] < CHAT_GAP_MS)) {
      this.send(ws, { t: 'err', code: 'chat', text: '대화를 너무 빨리 보내고 있습니다. 잠깐 쉬었다 보내 주세요.' });
      return;
    }
    p.chatT.push(now);
    const msg = { id: p.id, name: p.name, paint: okPaint(p.paint) ? p.paint : 0, text, at: now };
    this.chat.push(msg);
    if (this.chat.length > CHAT_KEEP) this.chat.shift();
    this.broadcast({ t: 'chat', m: msg });
  }

  /** 아직 아무도 안 쓰는 색 (앞 6색 = 예전 자리 색 순서부터) */
  freePaint(exceptId) {
    const used = new Set([...this.players.values()].filter(q => q.id !== exceptId).map(q => q.paint));
    for (let i = 0; i < NPAINT; i++) if (!used.has(i)) return i;
    return 0;
  }

  async hello(ws, m) {
    if (att(ws).id) return;                  // 한 연결은 한 번만 입장 (두 번째 hi 가 유령 자리를 만들지 않게)
    if (m.v !== PROTOCOL) {
      this.send(ws, { t: 'err', code: 'version', text: '게임이 새 버전으로 바뀌었습니다. Ctrl+Shift+R(강력 새로고침)을 눌러 주세요.' });
      try { ws.close(4002, 'version'); } catch { /* */ }
      return;
    }
    this.prune();
    const tok = typeof m.tok === 'string' ? m.tok.slice(0, 40) : '';
    let p = tok ? [...this.players.values()].find(q => q.tok === tok) : null;
    if (p) {
      // 새로고침·재접속: 같은 자리로. 예전 소켓은 끊는다.
      const me = att(ws).c;
      for (const w of this.ctx.getWebSockets()) {
        const a = att(w);
        if (a.id === p.id && a.c !== me) { try { w.serializeAttachment({ id: null, c: a.c, gone: 1 }); w.close(4000, 'replaced'); } catch { /* */ } }
      }
      p.conn = true; p.leftAt = 0;
      p.name = cleanName(m.name);
    } else {
      // 연결된 사람 + 대기실에서 잠깐 끊긴 사람(새로고침 대비)만 센다. 진행 중 레이스의 끊긴 선수 자리는 빼서
      // 탭을 닫았다 새로 연 사람도 관전으로는 들어올 수 있게 한다
      const racing = this.race && !this.race.ended ? this.race.slotOf : null;
      const count = [...this.players.values()].filter(q => q.conn || !(racing && racing.has(q.id))).length;
      if (count >= MAX_PLAYERS) {
        this.send(ws, { t: 'err', code: 'full', text: `방이 가득 찼습니다 (최대 ${MAX_PLAYERS}명). 다른 방 코드를 쓰세요.` });
        try { ws.close(4001, 'full'); } catch { /* */ }
        return;
      }
      const id = 'p' + (this.settings.nextId++);
      p = { id, name: cleanName(m.name), car: CARS.includes(m.car) ? m.car : 'baram', ready: false, assist: m.assist !== false, tok, conn: true, order: this.settings.nextId, ver: '' };
      // 색: 스스로 고른 적이 있으면 그 색(겹쳐도 됨), 아니면 아무도 안 쓰는 색
      p.paint = okPaint(m.paint) ? m.paint : this.freePaint(id);
      this.players.set(id, p);
      if (!this.settings.host || !this.players.get(this.settings.host)?.conn) this.settings.host = id;
    }
    p.ver = typeof m.ver === 'string' ? m.ver.slice(0, 30) : '';
    this.attach(ws, p);
    await this.trySave();
    if (!okPaint(p.paint)) p.paint = this.freePaint(p.id);      // 예전 판에서 잠든 방에서 깨어난 사람
    const welcome = { t: 'welcome', you: p.id, lobby: this.lobbyView(), now: Date.now(), chat: this.chat };
    if (this.race && !this.race.ended) {
      if (p.ver === this.race.ver) {
        welcome.race = { startAt: this.race.startAt, cfg: this.race.cfg };
        welcome.log = this.race.log;
        // 레이스 중에 돌아온 사람: 끊김 표시 해제는 그 사람이 다음 입력을 보내면 저절로 된다
      } else {
        // 판이 다르면 같은 계산을 못 한다 → 이번 레이스는 대기실에서 기다리게
        this.send(ws, { t: 'err', code: 'racever', text: '버전이 달라 이번 레이스는 함께 못 탑니다. Ctrl+Shift+R(강력 새로고침)을 누르면 다음 레이스부터 같이 탈 수 있습니다.' });
      }
    }
    this.send(ws, welcome);
    this.pushLobby();
  }

  async start(ws, id) {
    if (id !== this.settings.host) return this.send(ws, { t: 'err', code: 'host', text: '방장만 출발할 수 있습니다.' });
    if (this.phase !== 'lobby') return;
    const ps = [...this.players.values()].filter(p => p.conn).sort((a, b) => a.order - b.order).slice(0, MAX_PLAYERS);
    if (!ps.length) return;
    if (!ps.every(p => p.ready || p.id === id)) return this.send(ws, { t: 'err', code: 'ready', text: '아직 준비 안 된 사람이 있습니다.' });
    const vers = new Set(ps.map(p => p.ver));
    if (vers.size > 1) {
      this.broadcast({ t: 'err', code: 'mixed', text: '서로 다른 버전이 섞여 있습니다. 모두 Ctrl+Shift+R(강력 새로고침)을 눌러 주세요.' });
      return;
    }
    const cfg = {
      track: this.settings.track, laps: this.settings.laps,
      players: ps.map(p => ({ id: p.id, name: p.name, car: p.car, paint: okPaint(p.paint) ? p.paint : 0, abs: !!p.assist, tcs: !!p.assist })),
    };
    this.race = {
      startAt: Date.now() + 2500, cfg, log: [], last: cfg.players.map(() => 0),
      hashes: new Map(), slotOf: new Map(cfg.players.map((p, i) => [p.id, i])), ended: false,
      ver: ps[0].ver, done: new Map(), firstDone: 0, perFrame: cfg.players.map(() => [-1, 0]), logCap: cfg.players.map(() => 0), quit: new Set(),
    };
    this.phase = 'race';
    for (const p of ps) p.ready = false;
    for (const w of this.ctx.getWebSockets()) { const a = att(w); const q = a.id && this.players.get(a.id); if (q) this.attach(w, q); }
    this.broadcast({ t: 'start', race: { startAt: this.race.startAt, cfg } });
    this.pushLobby();
    clearInterval(this.tickTimer);
    this.tickTimer = setInterval(() => this.tick(), TICK_MS);
  }

  /** 아직 달리는 선수 = 연결돼 있고, 메뉴에서 "레이스 나가기"(끊김 입력)를 보내지 않은 사람 */
  activeRacers(r) {
    return [...r.slotOf.keys()].filter(pid => this.players.get(pid)?.conn && !r.quit.has(pid));
  }

  tick() {
    const r = this.race;
    if (!r || r.ended) { clearInterval(this.tickTimer); this.tickTimer = null; return; }
    const F = this.serverFrame();
    this.broadcast({ t: 'tick', c: F - LATE - 2 });
    const active = this.activeRacers(r);
    const el = Date.now() - r.startAt;
    // 모두 나갔으면 바로 끝 (독립검증 2차: 전원 "나가기"면 방이 25분 묶였다)
    if (el > RACE_MAX_MS || (!active.length && el > 10000)) this.endRace();
    // 결과 보고 뒤: 과반이 보고했으면 15초, 한 명뿐이면 90초 기다렸다 끝낸다 (한 사람이 모두의 레이스를 끝내지 못하게)
    else if (r.firstDone && Date.now() - r.firstDone > (r.done.size * 2 > active.length ? 15000 : 90000)) this.endRace();
  }

  input(id, e) {
    const r = this.race;
    if (!r || r.ended || !Array.isArray(e)) return;
    const s = r.slotOf.get(id);
    if (s === undefined) return;               // 관전자
    const F = this.serverFrame();
    const out = [];
    for (const it of e.slice(0, 32)) {
      if (!Array.isArray(it)) continue;
      const [q, f, v] = it;
      if (!isInt(f) || !isInt(v) || v < 0 || v >= (1 << 23)) continue;
      if (r.logCap[s] > 60000) break;                 // 한 사람이 기록을 부풀리면 그 사람 입력만 멈춘다
      let f2 = Math.max(f, F - LATE, r.last[s]);
      f2 = Math.min(f2, F + EARLY);
      if (f2 < r.last[s]) f2 = r.last[s];
      // 한 사람의 같은 프레임 입력은 기록에 하나만 — 최신값으로 덮어쓴다 (폭주 제한 겸, 클라이언트도 마지막 값이 이긴다)
      const pf = r.perFrame[s];
      if (v & (1 << 21)) r.quit.add(id); else r.quit.delete(id);
      r.last[s] = f2;
      if (pf[0] === f2) r.log[pf[1]][2] = v;
      else { r.log.push([s, f2, v]); pf[0] = f2; pf[1] = r.log.length - 1; r.logCap[s]++; }
      out.push(isInt(q) ? [f2, v, q] : [f2, v]);
    }
    if (out.length) this.broadcast({ t: 'in', p: s, e: out });
  }

  hash(id, m) {
    const r = this.race;
    if (!r || !isInt(m.f) || !isInt(m.h)) return;
    const s = r.slotOf.get(id);
    if (s === undefined || this.players.get(id)?.ver !== r.ver) return;    // 관전자·다른 판의 보고는 믿지 않는다
    const prev = r.hashes.get(m.f);
    if (!prev) {
      r.hashes.set(m.f, { h: m.h, n: 1 });
      if (r.hashes.size > 120) for (const k of r.hashes.keys()) { if (k < m.f - 100 * 120) r.hashes.delete(k); }
    } else if (prev.h !== m.h) {
      if (!prev.bad) { prev.bad = true; this.broadcast({ t: 'desync', f: m.f, slot: s }); }
    } else prev.n++;
  }

  /** 레이스 결과 보고. 한 사람의 보고로 모두의 레이스를 끝내지 않는다(독립검증: 강제 종료·기록 위조).
   *  연결된 선수가 모두 보고하거나, 첫 보고 뒤 15초가 지나면 끝낸다. 너무 이른 보고(말이 안 되는 시간)는 무시. */
  async done(id, res) {
    const r = this.race;
    if (!r || r.ended || !r.slotOf.has(id) || !Array.isArray(res)) return;
    if (this.serverFrame() < 240 + r.cfg.laps * 15 * 60) return;          // 랩당 15초 미만은 불가능
    r.done.set(id, JSON.stringify(res.slice(0, MAX_PLAYERS)));
    if (!r.firstDone) r.firstDone = Date.now();
    if (this.activeRacers(r).every(pid => r.done.has(pid))) this.endRace();
  }

  endRace() {
    const r = this.race;
    if (!r || r.ended) return;
    r.ended = true;
    clearInterval(this.tickTimer); this.tickTimer = null;
    // 방 최고 랩: 보고가 둘 이상이면 서로 같은 내용일 때만(세 화면 계산은 같아야 하므로), 하나뿐이면 그대로
    const reports = [...r.done.values()];
    const agreed = reports.length === 1 && this.activeRacers(r).length <= 1 ? reports[0] : reports.find((x, i) => reports.indexOf(x) !== i);
    let res = null;
    if (agreed) { try { res = JSON.parse(agreed); } catch { /* */ } }
    if (res) {
      for (const it of res.slice(0, MAX_PLAYERS)) {
        if (!Array.isArray(it)) continue;
        const [slot, , best] = it;
        const p = r.cfg.players[slot];
        if (!p || !isInt(best) || best <= 600) continue;          // 10초 미만 랩은 무시(말이 안 됨)
        const rec = this.settings.records[r.cfg.track];
        if (!rec || best < rec.best) this.settings.records[r.cfg.track] = { best, name: p.name, car: p.car };
      }
    }
    this.phase = 'lobby';
    this.pushLobby();
    this.saveSoon();              // 기록은 어느 경로로 끝나든 저장 (타이머 경로에서 빠져 있었다)
  }

  leave(ws, id, now) {
    const me = att(ws).c;
    this.rate.delete(me);
    const p = this.players.get(id);
    if (!p) return;
    // 같은 사람이 다른 연결(새로고침)로 이미 들어와 있으면 떠난 게 아니다
    const still = this.ctx.getWebSockets().some(w => { const a = att(w); return a.id === id && a.c !== me && !a.gone; });
    if (still) return;
    p.conn = false; p.leftAt = now ? 0 : Date.now();
    p.ready = false;
    const r = this.race;
    if (r && !r.ended && r.slotOf.has(id)) {
      const s = r.slotOf.get(id);
      const F = this.serverFrame();
      const f2 = Math.max(F, r.last[s]);
      r.last[s] = f2;
      if (r.perFrame[s][0] === f2) r.log[r.perFrame[s][1]][2] = DC_INPUT;
      else { r.log.push([s, f2, DC_INPUT]); r.perFrame[s] = [f2, r.log.length - 1]; }
      this.broadcast({ t: 'in', p: s, e: [[f2, DC_INPUT]] });
    }
    this.prune();
    this.pushLobby();
    // 잠들었다 깨도 떠난 사실·새 방장이 남도록 저장 (독립검증: 방장이 옛 값으로 돌아가 출발 불가)
    return this.trySave();
  }

  async webSocketClose(ws) {
    await this.load();
    const id = att(ws).id;
    if (id) await this.leave(ws, id, false);
    try { ws.close(1000, 'bye'); } catch { /* */ }
  }

  async webSocketError(ws) {
    await this.load();
    const id = att(ws).id;
    if (id) await this.leave(ws, id, false);
  }
}
