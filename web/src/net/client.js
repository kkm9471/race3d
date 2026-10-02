// 실시간 서버 연결 (웹소켓) — 시계 맞추기, 끊기면 다시 붙기
//
// 서버는 "입력"만 중계하고 도장(프레임 번호)을 찍어 준다. 차의 움직임은 각자 PC가 똑같이 계산한다.
// 시계: 서버 시각을 여러 번 물어 왕복시간이 가장 짧았던 값들로 차이를 구한다(NTP 방식).

import { VERSION } from '../version.js';
export const PROTOCOL = 4;     // 서버 room.js 와 같아야 한다 (4: 카트식, 부스터 키)

export class NetClient {
  constructor(url, room, name, token, car, assist) {
    this.url = url; this.room = room; this.name = name; this.token = token; this.car = car; this.assist = assist;
    this.ws = null; this.on = {};
    this.samples = []; this.offset = 0; this.synced = false; this.rtt = 0;
    this.confirmed = -1;
    this.closed = false; this.tries = 0;
    this.statusText = '연결 중…';
    this.desync = false;
    this.sent = 0; this.recv = 0;
    this.fast = false;           // 레이스 중이면 true (시계 자주 맞춤)
  }

  connect() {
    if (this.closed) return;
    const u = this.url + (this.url.includes('?') ? '&' : '?') + 'room=' + encodeURIComponent(this.room);
    let ws;
    try { ws = new WebSocket(u); } catch (e) { this.status('서버 주소가 잘못됐습니다', false); return; }
    this.ws = ws;
    this.status(this.tries ? `다시 연결하는 중… (${this.tries})` : '연결 중…', false);
    ws.onopen = () => {
      this.send({ t: 'hi', v: PROTOCOL, ver: VERSION, name: this.name, tok: this.token, car: this.car, assist: this.assist });
      this.samples = [];
      for (let i = 0; i < 6; i++) setTimeout(() => this.ping(), 60 + i * 120);
      clearInterval(this._pi);
      // 레이스 중에는 5초마다 시계를 다시 맞추고, 대기실에서는 25초마다 연결만 유지한다.
      // "ka" 는 서버가 자동응답해서 서버를 깨우지 않는다(무료 한도 보호).
      this._tk = 0;
      this._pi = setInterval(() => {
        this._tk++;
        if (this.fast) this.ping();
        else if (this._tk % 5 === 0 && this.ws && this.ws.readyState === 1) { try { this.ws.send('ka'); } catch { /* */ } }
      }, 5000);
    };
    ws.onmessage = ev => {
      this.recv++;
      let m;
      try { m = JSON.parse(ev.data); } catch { return; }
      if (!m || typeof m !== 'object') return;
      this.handle(m);
    };
    ws.onclose = ev => {
      clearInterval(this._pi);
      if (this.ws !== ws) return;
      this.ws = null;
      if (this.closed) return;
      if (ev.code === 4001 || ev.code === 4002 || ev.code === 4003) return;   // 서버가 일부러 끊음(가득 참·판 다름·잘못된 방)
      if (ev.code === 4000) {
        // 같은 자리로 다른 탭이 들어옴(탭 복제 등) — 다시 붙으면 둘이 서로 끊어 대는 무한 반복이 된다
        this.closed = true;
        this.status('다른 탭에서 같은 자리로 들어와 이 창은 연결을 끊었습니다', false);
        this.on.error && this.on.error('replaced', '다른 탭에서 같은 자리로 들어와 이 창은 연결을 끊었습니다.');
        return;
      }
      this.tries++;
      const wait = Math.min(8000, 400 * Math.pow(2, Math.min(5, this.tries - 1)));
      this.status(`연결 끊김 — ${Math.round(wait / 1000) || 1}초 뒤 다시 연결`, false);
      this.on.closed && this.on.closed();
      setTimeout(() => this.connect(), wait);
    };
    ws.onerror = () => { /* onclose 가 이어서 온다 */ };
  }

  status(t, ok) { this.statusText = t; this.on.status && this.on.status(t, ok); }

  send(obj) {
    if (!this.ws || this.ws.readyState !== 1) return false;
    try { this.ws.send(JSON.stringify(obj)); this.sent++; return true; } catch { return false; }
  }

  ping() { this.send({ t: 'ping', c: performance.now() }); }

  serverNow() { return performance.now() + this.offset; }

  handle(m) {
    switch (m.t) {
      case 'pong': {
        const now = performance.now();
        const rtt = now - m.c;
        if (!(rtt >= 0 && rtt < 5000) || typeof m.s !== 'number') return;
        const off = m.s - (m.c + now) / 2;
        this.samples.push({ rtt, off });
        if (this.samples.length > 12) this.samples.shift();
        const best = [...this.samples].sort((a, b) => a.rtt - b.rtt).slice(0, 4);
        const o = best.reduce((a, b) => a + b.off, 0) / best.length;
        // 급하게 튀지 않게 (이미 맞췄으면 조금씩)
        if (!this.synced || Math.abs(o - this.offset) > 250) this.offset = o;
        else this.offset += (o - this.offset) * 0.3;
        this.synced = true;
        this.rtt = best[0].rtt;
        break;
      }
      case 'welcome':
        this.tries = 0;          // 입장까지 성공해야 재시도 간격을 되돌린다(열리자마자 끊기는 경우 폭주 방지)
        if (typeof m.now === 'number' && !this.synced) this.offset = m.now - performance.now();
        this.status('연결됨', true);
        this.on.welcome && this.on.welcome(m);
        break;
      case 'lobby': this.on.lobby && this.on.lobby(m.lobby); break;
      case 'start': this.on.start && this.on.start(m.race); break;
      case 'in':
        if (Array.isArray(m.e) && Number.isInteger(m.p)) for (const e of m.e) {
          if (!Array.isArray(e)) continue;
          const [f, v, q] = e;
          if (Number.isInteger(f) && Number.isInteger(v)) this.on.input && this.on.input(m.p, f, v, q);
        }
        break;
      case 'tick': if (Number.isInteger(m.c)) this.confirmed = Math.max(this.confirmed, m.c); break;
      case 'err': this.on.error && this.on.error(m.code, m.text || '오류'); break;
      case 'desync': this.desync = true; this.on.desync && this.on.desync(m.f); break;
    }
  }

  close() {
    this.closed = true;
    clearInterval(this._pi);
    if (this.ws) { try { this.send({ t: 'bye' }); this.ws.close(1000); } catch { /* */ } }
    this.ws = null;
  }
}
