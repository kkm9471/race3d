// 서버 규칙 시험 — 브라우저 없이 웹소켓으로 직접 붙어 본다
// 먼저: cd server && npx wrangler dev --port 8797 --local
// 사용법: node tests/net_rules.mjs   (WS=wss://... 로 실제 서버도 가능)
const WS = process.env.WS || 'ws://127.0.0.1:8797/ws';
const HTTP = WS.replace(/^ws/, 'http').replace(/\/ws$/, '');
const PROTOCOL = 4;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fail = 0;
const ok = (c, m) => { console.log(`  ${c ? '✅' : '❌'} ${m}`); if (!c) fail++; };
const room = () => 'T' + Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, 'X');

class C {
  constructor(code, name, tok) { this.code = code; this.name = name; this.tok = tok || Math.random().toString(16).slice(2); this.msgs = []; this.closed = null; }
  open() {
    return new Promise((res, rej) => {
      this.ws = new WebSocket(`${WS}?room=${this.code}`);
      this.ws.onopen = () => res(this);
      this.ws.onerror = e => rej(e);
      this.ws.onmessage = e => { try { this.msgs.push(JSON.parse(e.data)); } catch { this.msgs.push({ raw: e.data }); } };
      this.ws.onclose = e => { this.closed = e.code; };
    });
  }
  send(o) { this.ws.send(typeof o === 'string' ? o : JSON.stringify(o)); }
  hi(extra = {}) { this.send({ t: 'hi', v: PROTOCOL, ver: 'test', name: this.name, tok: this.tok, car: 'baram', assist: true, ...extra }); }
  async wait(pred, ms = 3000) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { const m = this.msgs.find(pred); if (m) return m; await sleep(20); }
    return null;
  }
  last(t) { for (let i = this.msgs.length - 1; i >= 0; i--) if (this.msgs[i].t === t) return this.msgs[i]; return null; }
  close() { try { this.ws.close(); } catch { /* */ } }
}

console.log('서버:', WS);
// 0) 살아 있나 / 잘못된 방 코드
{
  const h = await fetch(HTTP + '/health');
  ok(h.ok && (await h.text()) === 'ok', '/health 응답');
  const opened = await new Promise(res => {
    const w = new WebSocket(`${WS}?room=ab!`);
    w.onopen = () => { res(true); w.close(); };
    w.onerror = () => res(false);
    setTimeout(() => res(false), 3000);
  });
  ok(!opened, '잘못된 방 코드 → 연결 거부');
}

// 1) 입장·방장·이름 정리
const R = room();
const A = await new C(R, '가나<script>alert(1)</script>').open(); A.hi();
const wA = await A.wait(m => m.t === 'welcome');
ok(!!wA, 'A 입장 → welcome');
ok(wA && wA.lobby.host === wA.you, 'A 가 방장');
const nmA = wA && wA.lobby.players[0].name;
ok(nmA && !/[<>]/.test(nmA) && nmA.length <= 12, `이름 정리: "${nmA}"`);
const B = await new C(R, '나다').open(); B.hi();
const wB = await B.wait(m => m.t === 'welcome');
ok(wB && wB.lobby.players.length === 2, 'B 입장, 두 명');

// 2) 쓰레기 메시지에도 죽지 않는다
for (const g of ['not json', '{', '[]', 'null', JSON.stringify({ t: 'in', e: [[1, NaN, 'x'], ['a', 1, 2], null, [1, 2]] }),
  JSON.stringify({ t: 'set', laps: 99, track: '../../etc' }), JSON.stringify({ t: 'car', car: '<b>' }), 'x'.repeat(20000),
  JSON.stringify({ t: 'hash', f: 'a', h: {} }), JSON.stringify({ t: 'done', r: 'zzz' }), JSON.stringify({ t: 12 })]) A.send(g);
A.send({ t: 'ping', c: 1 });
ok(!!(await A.wait(m => m.t === 'pong')), '쓰레기 메시지 뒤에도 응답함');

// 2-1) 같은 소켓으로 두 번 입장해도 사람이 늘지 않는다
A.send({ t: 'hi', v: PROTOCOL, ver: 'test', name: '또', tok: 'other', car: 'baram' });
await sleep(400);
A.send({ t: 'ping', c: 9 }); await A.wait(m => m.t === 'pong' && m.c === 9);
ok(!A.msgs.some(m => m.t === 'lobby' && m.lobby.players.length > 2), '같은 소켓 두 번째 입장 무시');

// 3) 버전 불일치
{
  const V = await new C(R, '옛판').open(); V.send({ t: 'hi', v: 1, name: 'x', tok: 'old' });
  const e = await V.wait(m => m.t === 'err');
  await sleep(200);
  ok(e && e.code === 'version' && V.closed === 4002, `다른 프로토콜 → 안내 후 끊김 (${e && e.code}, ${V.closed})`);
}

// 4) 가득 참 (최대 4명)
const Cc = await new C(R, '다라').open(); Cc.hi(); await Cc.wait(m => m.t === 'welcome');
const D = await new C(R, '라마').open(); D.hi(); await D.wait(m => m.t === 'welcome');
{
  const E = await new C(R, '다섯째').open(); E.hi();
  const e = await E.wait(m => m.t === 'err');
  await sleep(200);
  ok(e && e.code === 'full' && E.closed === 4001, `5번째 → "방이 가득" 안내 후 끊김 (${e && e.text})`);
}
D.send({ t: 'bye' }); D.close();
await sleep(300);

// 5) 새로고침: 같은 토큰으로 다시 오면 같은 자리
{
  const tokB = B.tok, idB = wB.you;
  B.close(); await sleep(300);
  const B2 = await new C(R, '나다', tokB).open(); B2.hi();
  const w = await B2.wait(m => m.t === 'welcome');
  ok(w && w.you === idB && w.lobby.players.length === 3, `재접속 → 같은 id (${w && w.you}), 사람 수 그대로 ${w && w.lobby.players.length}`);
  B.ws = B2.ws; B.msgs = B2.msgs; B2.ws.onmessage = e => { try { B.msgs.push(JSON.parse(e.data)); } catch { /* */ } };
}

// 6) 출발: 방장만, 모두 준비돼야
B.send({ t: 'start' });
ok(!!(await B.wait(m => m.t === 'err' && m.code === 'host')), '방장 아닌 사람의 출발 → 거부');
A.send({ t: 'start' });
ok(!!(await A.wait(m => m.t === 'err' && m.code === 'ready')), '준비 안 된 사람 있으면 → 거부');
B.send({ t: 'ready', on: true }); Cc.send({ t: 'ready', on: true });
A.send({ t: 'set', laps: 1 });               // 결과 보고는 "랩당 15초" 이후에만 받으므로 1랩으로
await sleep(300);
A.msgs.length = 0; B.msgs.length = 0; Cc.msgs.length = 0;
A.send({ t: 'start' });
const st = await B.wait(m => m.t === 'start');
ok(st && st.race.cfg.players.length === 3, `출발 → 세 명 모두에게 start (선수 ${st && st.race.cfg.players.length})`);
const startAt = st.race.startAt;

// 7) 입력 도장: 과거·미래·순서
await sleep(Math.max(0, startAt - Date.now()) + 1000);   // 출발 후 1초 (약 60프레임)
const F = () => Math.floor((Date.now() - startAt) / (1000 / 60));
A.send({ t: 'in', e: [[1, 0, 1234]] });                   // 한참 옛날 프레임
const in1 = await B.wait(m => m.t === 'in' && m.p === 0);
ok(in1 && in1.e[0][0] >= F() - 38, `옛날 프레임 입력 → 서버가 최근(현재-30)으로 고쳐 찍음 (${in1 && in1.e[0][0]}, 지금 ${F()})`);
B.msgs.length = 0;
A.send({ t: 'in', e: [[2, F() + 5000, 2222]] });
const in2 = await B.wait(m => m.t === 'in' && m.p === 0);
ok(in2 && in2.e[0][0] <= F() + 45, `먼 미래 프레임 → 현재+40 이내로 (${in2 && in2.e[0][0]})`);
B.msgs.length = 0;
A.send({ t: 'in', e: [[3, 10, 3333]] });
const in3 = await B.wait(m => m.t === 'in' && m.p === 0);
ok(in3 && in3.e[0][0] >= in2.e[0][0], '도장은 되돌아가지 않는다(단조 증가)');
const own = await A.wait(m => m.t === 'in' && m.p === 0 && m.e[0][2] === 3);
ok(!!own, '내 입력도 확인용으로 되돌아온다(q 번호 포함)');

// 8) 폭주 (초당 한도 초과) → 죽지 않음
for (let i = 0; i < 600; i++) Cc.send({ t: 'in', e: [[100 + i, F(), 5]] });
await sleep(500);
A.send({ t: 'ping', c: 2 });
ok(!!(await A.wait(m => m.t === 'pong' && m.c === 2)), '600개 폭주 후에도 서버 정상');
ok(Cc.closed === null, '한 번 폭주로는 끊기지 않음(경고 수준)');

// 9) 해시 불일치 → 경고
A.send({ t: 'hash', f: 120, h: 111 }); B.send({ t: 'hash', f: 120, h: 222 });
ok(!!(await A.wait(m => m.t === 'desync')), '해시가 다르면 모두에게 desync 알림');

// 10) 관전자: 레이스 중 새로 온 사람 → 레이스 정보 + 입력 기록
const S = await new C(R, '구경꾼').open(); S.hi();
const ws = await S.wait(m => m.t === 'welcome');
ok(ws && ws.race && Array.isArray(ws.log) && ws.log.length > 0, `관전 입장 → 레이스+입력기록 ${ws && ws.log && ws.log.length}개`);
S.send({ t: 'bye' }); S.close();

// 11) 레이스 중 끊김 → 서버가 "끊김" 입력을 넣는다
B.msgs.length = 0;
Cc.close();
const dc = await B.wait(m => m.t === 'in' && m.p === 2 && (m.e[0][1] & (1 << 21)));
ok(!!dc, '레이스 중 끊긴 사람 → 끊김 입력(차 멈춤·유령)');

// 12) 결과 → 대기실로, 방 기록 (너무 이른 보고는 무시, 연결된 선수가 모두 같은 결과를 보고하면 종료)
A.send({ t: 'done', r: [[0, 9000, 3000], [1, 9500, 3100], [2, 0, 0]] });
await sleep(500);
ok(!(A.last('lobby') && A.last('lobby').lobby.phase === 'lobby' && A.last('lobby').lobby.records?.circuit), '출발 직후 결과 보고는 무시');
await sleep(Math.max(0, startAt + 22500 - Date.now()));   // 시험 PC와 서버 시계 차이(~1초) 여유
A.send({ t: 'done', r: [[0, 9000, 3000], [1, 9500, 3100], [2, 0, 0]] });
B.send({ t: 'done', r: [[0, 9000, 3000], [1, 9500, 3100], [2, 0, 0]] });
const lb = await B.wait(m => m.t === 'lobby' && m.lobby.phase === 'lobby' && m.lobby.records && m.lobby.records.circuit, 6000);
if (!lb) console.log('   마지막 대기실:', JSON.stringify(B.last('lobby')?.lobby).slice(0, 400), ' A 마지막:', JSON.stringify(A.last('lobby')?.lobby?.phase), 'B err:', JSON.stringify(B.last('err')));
ok(lb && lb.lobby.records.circuit.best === 3000, `결과 → 대기실, 방 최고 랩 기록 ${lb && JSON.stringify(lb.lobby.records.circuit)}`);

A.close(); B.close();
console.log(fail ? `\n실패 ${fail}개` : '\n전부 통과');
process.exit(fail ? 1 : 0);
