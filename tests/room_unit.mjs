// 서버(Room) 단위 시험 — Cloudflare 없이 Node 에서 가짜 저장소·가짜 소켓으로 돌린다
// 특히 "잠들었다 깨어남(hibernation)"을 흉내 낸다: 같은 저장소·같은 소켓으로 Room 을 새로 만든다.
// 사용법: node tests/room_unit.mjs
globalThis.WebSocketRequestResponsePair = class { constructor(a, b) { this.a = a; this.b = b; } };
const { Room } = await import('../server/src/room.js');

let now = 1_000_000;
const realNow = Date.now;
Date.now = () => now;
let fail = 0;
const ok = (c, m) => { console.log(`  ${c ? '✅' : '❌'} ${m}`); if (!c) fail++; };

class Storage {
  constructor() { this.m = new Map(); this.puts = 0; }
  async get(k) { return this.m.has(k) ? structuredClone(this.m.get(k)) : undefined; }
  async put(k, v) { this.puts++; this.m.set(k, structuredClone(v)); }
}
class Sock {
  constructor(name) { this.name = name; this.out = []; this.att = null; this.closed = null; }
  send(s) { this.out.push(JSON.parse(s)); }
  close(code) { this.closed = code; }
  serializeAttachment(a) { this.att = structuredClone(a); }
  deserializeAttachment() { return this.att; }
  last(t) { for (let i = this.out.length - 1; i >= 0; i--) if (this.out[i].t === t) return this.out[i]; return null; }
}
function makeCtx(storage, socks) {
  return { storage, getWebSockets: () => socks.filter(s => s.closed === null), setWebSocketAutoResponse() {}, acceptWebSocket() {} };
}
const hi = (room, s, name, tok) => room.webSocketMessage(s, JSON.stringify({ t: 'hi', v: 3, ver: 'x', name, tok, car: 'baram', assist: true }));

// 1) 방장이 떠난 뒤 잠들었다 깨어나도 방장이 옛 사람으로 돌아가지 않는다
{
  console.log('[잠든 뒤 방장]');
  const st = new Storage(), socks = [];
  let room = new Room(makeCtx(st, socks), {});
  const a = new Sock('kkm'), b = new Sock('dongwoo'), c = new Sock('gf');
  socks.push(a, b, c);
  await hi(room, a, 'kkm', 'ta'); await hi(room, b, '동우', 'tb'); await hi(room, c, '여친', 'tc');
  await room.webSocketMessage(a, JSON.stringify({ t: 'bye' }));
  a.closed = 1000;
  now += 30000;
  room = new Room(makeCtx(st, socks), {});        // 잠들었다 깨어남
  await room.webSocketMessage(b, JSON.stringify({ t: 'ready', on: true }));
  const lb = b.last('lobby');
  const hostName = lb && lb.lobby.players.find(p => p.id === lb.lobby.host)?.name;
  ok(lb && hostName !== 'kkm', `깨어난 뒤 방장 = ${hostName} (떠난 kkm 이 아님)`);
  await room.webSocketMessage(c, JSON.stringify({ t: 'ready', on: true }));
  b.out.length = 0;
  const host = lb.lobby.host === 'p2' ? b : c;
  await room.webSocketMessage(host, JSON.stringify({ t: 'start' }));
  ok(!!host.last('start') && !host.last('err'), '새 방장이 출발 가능');
  clearInterval(room.tickTimer);
}

// 2) 떠난 사람들이 깨어날 때마다 되살아나 "방이 가득"을 만들지 않는다
{
  console.log('[떠난 사람 되살아남]');
  const st = new Storage(), socks = [];
  let room = new Room(makeCtx(st, socks), {});
  const olds = ['o1', 'o2', 'o3'].map(n => new Sock(n));
  socks.push(...olds);
  for (const s of olds) await hi(room, s, s.name, 'tok-' + s.name);
  for (const s of olds) { await room.webSocketClose(s); s.closed = 1000; }
  now += 60000;                                    // 유예시간(45초) 지남
  room = new Room(makeCtx(st, socks), {});
  const k = new Sock('new-kkm'); socks.push(k);
  await hi(room, k, 'kkm', 'new-k');
  now += 20000;
  room = new Room(makeCtx(st, socks), {});        // 다시 잠들었다 깸
  const d = new Sock('new-d'); socks.push(d);
  await hi(room, d, '동우', 'new-d');
  ok(!d.last('err') && !!d.last('welcome'), `새 사람 입장 가능 (오류: ${d.last('err')?.text || '없음'})`);
  const lob = d.last('welcome').lobby;
  ok(lob.players.length === 2, `대기실 인원 ${lob.players.length}명 (떠난 3명은 사라짐)`);
}

// 3) 같은 소켓으로 두 번 입장하면 두 번째는 무시 (유령 자리 없음)
{
  console.log('[같은 소켓 두 번 입장]');
  const st = new Storage(), socks = [];
  const room = new Room(makeCtx(st, socks), {});
  const a = new Sock('a'); socks.push(a);
  await hi(room, a, 'A', 't1');
  await hi(room, a, 'A2', 't2');
  ok(room.players.size === 1, `사람 수 ${room.players.size}`);
}

// 4) 한 사람의 결과 보고로 레이스가 끝나지 않는다 / 너무 이른 보고는 무시
{
  console.log('[결과 보고]');
  const st = new Storage(), socks = [];
  const room = new Room(makeCtx(st, socks), {});
  const a = new Sock('a'), b = new Sock('b'); socks.push(a, b);
  await hi(room, a, 'A', 'ta'); await hi(room, b, 'B', 'tb');
  await room.webSocketMessage(a, JSON.stringify({ t: 'set', laps: 1 }));
  await room.webSocketMessage(b, JSON.stringify({ t: 'ready', on: true }));
  await room.webSocketMessage(a, JSON.stringify({ t: 'start' }));
  clearInterval(room.tickTimer);
  now += 5000;
  await room.webSocketMessage(a, JSON.stringify({ t: 'done', r: [[0, 100, 700]] }));
  ok(room.phase === 'race', '출발 5초 만의 보고는 무시');
  now = room.race.startAt + 60000;
  await room.webSocketMessage(a, JSON.stringify({ t: 'done', r: [[0, 3000, 2000], [1, 3300, 2100]] }));
  ok(room.phase === 'race', 'A 혼자 보고 → 아직 안 끝남');
  await room.webSocketMessage(b, JSON.stringify({ t: 'done', r: [[0, 3000, 2000], [1, 3300, 2100]] }));
  ok(room.phase === 'lobby' && room.settings.records.circuit?.best === 2000, `둘 다 같은 결과 보고 → 종료, 기록 ${JSON.stringify(room.settings.records.circuit)}`);
}

// 5) 기록 위조: 둘의 보고가 다르면 기록을 믿지 않는다
{
  console.log('[기록 위조]');
  const st = new Storage(), socks = [];
  const room = new Room(makeCtx(st, socks), {});
  const a = new Sock('a'), b = new Sock('b'); socks.push(a, b);
  await hi(room, a, 'A', 'ta'); await hi(room, b, 'B', 'tb');
  await room.webSocketMessage(a, JSON.stringify({ t: 'set', laps: 1 }));
  await room.webSocketMessage(b, JSON.stringify({ t: 'ready', on: true }));
  await room.webSocketMessage(a, JSON.stringify({ t: 'start' }));
  clearInterval(room.tickTimer);
  now = room.race.startAt + 60000;
  await room.webSocketMessage(a, JSON.stringify({ t: 'done', r: [[0, 3000, 601]] }));      // 위조
  await room.webSocketMessage(b, JSON.stringify({ t: 'done', r: [[0, 3000, 2000], [1, 3300, 2100]] }));
  ok(room.phase === 'lobby' && !room.settings.records.circuit, '보고가 서로 다르면 방 기록 안 남김');
}

// 6) 입력 폭주: 같은 프레임 4개까지만
{
  console.log('[입력 폭주]');
  const st = new Storage(), socks = [];
  const room = new Room(makeCtx(st, socks), {});
  const a = new Sock('a'); socks.push(a);
  await hi(room, a, 'A', 'ta');
  await room.webSocketMessage(a, JSON.stringify({ t: 'start' }));
  clearInterval(room.tickTimer);
  now = room.race.startAt + 10000;
  const e = Array.from({ length: 32 }, (_, i) => [i, 100, 5]);
  await room.webSocketMessage(a, JSON.stringify({ t: 'in', e }));
  ok(room.race.log.length <= 4, `한 프레임에 32개 보냄 → 기록 ${room.race.log.length}개`);
}

// 7) 대기실 설정 바꾸기: 바뀐 게 없으면 저장하지 않는다
{
  console.log('[저장 한도 보호]');
  const st = new Storage(), socks = [];
  const room = new Room(makeCtx(st, socks), {});
  const a = new Sock('a'); socks.push(a);
  await hi(room, a, 'A', 'ta');
  const p0 = st.puts;
  for (let i = 0; i < 50; i++) { now += 300; await room.webSocketMessage(a, JSON.stringify({ t: 'set', laps: 3, track: 'circuit' })); }
  ok(st.puts === p0, `같은 설정 50번 → 저장 ${st.puts - p0}번`);
}

Date.now = realNow;
console.log(fail ? `\n실패 ${fail}개` : '\n전부 통과');
process.exit(fail ? 1 : 0);
