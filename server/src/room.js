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

const PROTOCOL = 3;
const MAX_PLAYERS = 4;
const FRAME_MS = 1000 / 60;
const LATE = 12, EARLY = 40;
const TICK_MS = 250;
const MAX_MSG = 8192;
const RATE = 60, BURST = 150;
const LOBBY_GRACE_MS = 45000;          // 대기실에서 끊긴 사람 자리 유지 (새로고침 대비)
const RACE_MAX_MS = 25 * 60 * 1000;
const TRACKS = ['circuit', 'mountain'];
const CARS = ['kongal', 'masil', 'beongae', 'deundeun', 'jimkkun', 'baram', 'cheondung', 'yuseong', 'heukmeonji', 'chueok'];
// 입력 정수 (web/src/sim/input.js 와 같은 규칙)
const NEUTRAL = 128 | (1 << 20);
const DC_INPUT = NEUTRAL | (1 << 21);

function cleanName(s) {
  if (typeof s !== 'string') return '손님';
  const t = s.replace(/[\u0000-\u001f\u007f<>&"'\\]/g, '').trim().slice(0, 12);
  return t || '손님';
}
const isInt = v => Number.isInteger(v);

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
    this.sockets = new Map();          // ws → id
    this.race = null;                  // { startAt, cfg, log, last, hashes, slotOf, ended }
    this.phase = 'lobby';
    this.tickTimer = null;
    this.rate = new Map();
    this.loaded = false;
    // 잠들었다 깨어난 경우: 붙어 있는 소켓에서 사람 정보를 되살린다
    for (const ws of this.ctx.getWebSockets()) {
      const a = ws.deserializeAttachment();
      if (a && a.id) {
        this.sockets.set(ws, a.id);
        this.players.set(a.id, { ...a.p, conn: true });
      }
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
      for (const p of order) if (!this.players.has(p.id)) this.players.set(p.id, { ...p, conn: false, leftAt: Date.now() });
    }
  }

  async save() {
    await this.ctx.storage.put('settings', this.settings);
    await this.ctx.storage.put('players', [...this.players.values()].map(p => ({ id: p.id, name: p.name, car: p.car, ready: false, assist: p.assist, tok: p.tok, order: p.order, ver: p.ver })));
  }

  async fetch(req) {
    await this.load();
    const room = req.headers.get('x-room') || '';
    if (room && this.code !== room) { this.code = room; await this.ctx.storage.put('code', room); }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ id: null });
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
      players: ps.map(p => ({ id: p.id, name: p.name, car: p.car, ready: !!p.ready, conn: !!p.conn, assist: !!p.assist })),
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
    let b = this.rate.get(ws);
    if (!b) { b = { tokens: BURST, t: now, strikes: 0 }; this.rate.set(ws, b); }
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
    const id = this.sockets.get(ws) || (ws.deserializeAttachment() || {}).id;
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
      case 'ready':
        if (this.phase === 'lobby') { p.ready = !!m.on; this.attach(ws, p); this.pushLobby(); }
        break;
      case 'set':
        if (id !== this.settings.host || this.phase !== 'lobby') break;
        if (TRACKS.includes(m.track)) this.settings.track = m.track;
        if (isInt(m.laps) && m.laps >= 1 && m.laps <= 5) this.settings.laps = m.laps;
        await this.save();
        this.pushLobby();
        break;
      case 'start': await this.start(ws, id); break;
      case 'in': this.input(id, m.e); break;
      case 'hash': this.hash(id, m); break;
      case 'done': await this.done(id, m.r); break;
      case 'back': p.ready = false; this.attach(ws, p); this.pushLobby(); break;
      case 'bye': p.conn = false; p.leftAt = 0; this.leave(ws, id, true); break;
    }
  }

  attach(ws, p) {
    ws.serializeAttachment({ id: p.id, p: { id: p.id, name: p.name, car: p.car, ready: p.ready, assist: p.assist, tok: p.tok, order: p.order, ver: p.ver } });
  }

  async hello(ws, m) {
    if (m.v !== PROTOCOL) {
      this.send(ws, { t: 'err', code: 'version', text: '게임이 새 버전으로 바뀌었습니다. 새로고침(F5) 해 주세요.' });
      try { ws.close(4002, 'version'); } catch { /* */ }
      return;
    }
    this.prune();
    const tok = typeof m.tok === 'string' ? m.tok.slice(0, 40) : '';
    let p = tok ? [...this.players.values()].find(q => q.tok === tok) : null;
    if (p) {
      // 새로고침·재접속: 같은 자리로. 예전 소켓은 끊는다.
      for (const [w, pid] of this.sockets) if (pid === p.id && w !== ws) { this.sockets.delete(w); try { w.close(4000, 'replaced'); } catch { /* */ } }
      p.conn = true; p.leftAt = 0;
      p.name = cleanName(m.name);
    } else {
      const count = this.players.size;
      if (count >= MAX_PLAYERS) {
        this.send(ws, { t: 'err', code: 'full', text: `방이 가득 찼습니다 (최대 ${MAX_PLAYERS}명). 다른 방 코드를 쓰세요.` });
        try { ws.close(4001, 'full'); } catch { /* */ }
        return;
      }
      const id = 'p' + (this.settings.nextId++);
      p = { id, name: cleanName(m.name), car: CARS.includes(m.car) ? m.car : 'baram', ready: false, assist: m.assist !== false, tok, conn: true, order: this.settings.nextId, ver: '' };
      this.players.set(id, p);
      if (!this.settings.host || !this.players.get(this.settings.host)?.conn) this.settings.host = id;
    }
    p.ver = typeof m.ver === 'string' ? m.ver.slice(0, 30) : '';
    this.sockets.set(ws, p.id);
    this.attach(ws, p);
    await this.save();
    const welcome = { t: 'welcome', you: p.id, lobby: this.lobbyView(), now: Date.now() };
    if (this.race && !this.race.ended) {
      welcome.race = { startAt: this.race.startAt, cfg: this.race.cfg };
      welcome.log = this.race.log;
      // 레이스 중에 돌아온 사람: 끊김 표시 해제는 그 사람이 다음 입력을 보내면 저절로 된다
    }
    this.send(ws, welcome);
    this.pushLobby();
  }

  async start(ws, id) {
    if (id !== this.settings.host) return this.send(ws, { t: 'err', code: 'host', text: '방장만 출발할 수 있습니다.' });
    if (this.phase !== 'lobby') return;
    const ps = [...this.players.values()].filter(p => p.conn).sort((a, b) => a.order - b.order);
    if (!ps.length) return;
    if (!ps.every(p => p.ready || p.id === id)) return this.send(ws, { t: 'err', code: 'ready', text: '아직 준비 안 된 사람이 있습니다.' });
    const vers = new Set(ps.map(p => p.ver));
    if (vers.size > 1) {
      this.broadcast({ t: 'err', code: 'mixed', text: '서로 다른 버전이 섞여 있습니다. 모두 새로고침(F5) 해 주세요.' });
      return;
    }
    const cfg = {
      track: this.settings.track, laps: this.settings.laps,
      players: ps.map(p => ({ id: p.id, name: p.name, car: p.car, abs: !!p.assist, tcs: !!p.assist })),
    };
    this.race = {
      startAt: Date.now() + 2500, cfg, log: [], last: cfg.players.map(() => 0),
      hashes: new Map(), slotOf: new Map(cfg.players.map((p, i) => [p.id, i])), ended: false,
    };
    this.phase = 'race';
    for (const p of ps) p.ready = false;
    this.broadcast({ t: 'start', race: { startAt: this.race.startAt, cfg } });
    this.pushLobby();
    clearInterval(this.tickTimer);
    this.tickTimer = setInterval(() => this.tick(), TICK_MS);
  }

  tick() {
    const r = this.race;
    if (!r || r.ended) { clearInterval(this.tickTimer); this.tickTimer = null; return; }
    const F = this.serverFrame();
    this.broadcast({ t: 'tick', c: F - LATE - 2 });
    const anyone = [...r.slotOf.keys()].some(pid => this.players.get(pid)?.conn);
    if (Date.now() - r.startAt > RACE_MAX_MS || (!anyone && Date.now() - r.startAt > 10000)) this.endRace(null);
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
      if (!isInt(f) || !isInt(v) || v < 0 || v >= (1 << 22)) continue;
      let f2 = Math.max(f, F - LATE, r.last[s]);
      f2 = Math.min(f2, F + EARLY);
      if (f2 < r.last[s]) f2 = r.last[s];
      r.last[s] = f2;
      r.log.push([s, f2, v]);
      out.push(isInt(q) ? [f2, v, q] : [f2, v]);
    }
    if (out.length) this.broadcast({ t: 'in', p: s, e: out });
    if (r.log.length > 200000) this.endRace(null);    // 비정상적으로 긴 기록 방지
  }

  hash(id, m) {
    const r = this.race;
    if (!r || !isInt(m.f) || !isInt(m.h)) return;
    const s = r.slotOf.get(id);
    const prev = r.hashes.get(m.f);
    if (!prev) {
      r.hashes.set(m.f, { h: m.h, n: 1 });
      if (r.hashes.size > 80) r.hashes.delete(r.hashes.keys().next().value);
    } else if (prev.h !== m.h) {
      if (!prev.bad) { prev.bad = true; this.broadcast({ t: 'desync', f: m.f, slot: s }); }
    } else prev.n++;
  }

  async done(id, res) {
    const r = this.race;
    if (!r || r.ended || !r.slotOf.has(id)) return;
    this.endRace(Array.isArray(res) ? res : null);
    await this.save();
  }

  endRace(res) {
    const r = this.race;
    if (!r || r.ended) return;
    r.ended = true;
    clearInterval(this.tickTimer); this.tickTimer = null;
    // 방 최고 랩 기록 (트랙별)
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
  }

  leave(ws, id, now) {
    this.sockets.delete(ws);
    this.rate.delete(ws);
    const p = this.players.get(id);
    if (!p) return;
    const still = [...this.sockets.values()].includes(id);
    if (still) return;
    p.conn = false; p.leftAt = now ? 0 : Date.now();
    p.ready = false;
    const r = this.race;
    if (r && !r.ended && r.slotOf.has(id)) {
      const s = r.slotOf.get(id);
      const F = this.serverFrame();
      const f2 = Math.max(F, r.last[s]);
      r.last[s] = f2;
      r.log.push([s, f2, DC_INPUT]);
      this.broadcast({ t: 'in', p: s, e: [[f2, DC_INPUT]] });
    }
    this.prune();
    this.pushLobby();
  }

  async webSocketClose(ws) {
    const id = this.sockets.get(ws) || (ws.deserializeAttachment() || {}).id;
    if (id) this.leave(ws, id, false);
    try { ws.close(1000, 'bye'); } catch { /* */ }
  }

  async webSocketError(ws) {
    const id = this.sockets.get(ws) || (ws.deserializeAttachment() || {}).id;
    if (id) this.leave(ws, id, false);
  }
}
