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
  // 실제 서버처럼 연결마다 고유번호를 붙여 둔다 (fetch() 가 하는 일)
  constructor(name) { this.name = name; this.out = []; this.att = { id: null, c: crypto.randomUUID() }; this.closed = null; }
  send(s) { this.out.push(JSON.parse(s)); }
  close(code) { this.closed = code; }
  serializeAttachment(a) { this.att = structuredClone(a); }
  deserializeAttachment() { return this.att; }
  last(t) { for (let i = this.out.length - 1; i >= 0; i--) if (this.out[i].t === t) return this.out[i]; return null; }
}
function makeCtx(storage, socks) {
  return { storage, getWebSockets: () => socks.filter(s => s.closed === null), setWebSocketAutoResponse() {}, acceptWebSocket() {} };
}
const hi = (room, s, name, tok, extra = {}) => room.webSocketMessage(s, JSON.stringify({ t: 'hi', v: 5, ver: 'x', name, tok, car: 'baram', assist: true, ...extra }));

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
  const e = Array.from({ length: 32 }, (_, i) => [i, 100, 5 + i]);
  await room.webSocketMessage(a, JSON.stringify({ t: 'in', e }));
  ok(room.race.log.length === 1 && room.race.log[0][2] === 36, `한 프레임에 32개 → 기록 ${room.race.log.length}개, 값 ${room.race.log[0]?.[2]} (마지막 값 36 이어야)`);
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
  // 빠르게 연달아 바꿔도 둘 다 반영(저장은 모아서)
  a.out.length = 0;
  await room.webSocketMessage(a, JSON.stringify({ t: 'set', track: 'city' }));
  await room.webSocketMessage(a, JSON.stringify({ t: 'set', laps: 2 }));
  const lb = a.last('lobby').lobby;
  ok(lb.track === 'city' && lb.laps === 2, `연달아 바꾼 트랙·랩 둘 다 반영 (${lb.track}, ${lb.laps})`);
  clearTimeout(room._saveT);
}

// 8) 서버 허용 목록이 게임 데이터와 같은가 (트랙·차를 추가하고 서버를 빼먹는 실수 방지)
{
  console.log('[허용 목록 대조]');
  const { TRACK_DEFS } = await import('../web/src/sim/tracks.js');
  const { CARS } = await import('../web/src/sim/cars.js');
  const src = (await import('node:fs')).readFileSync(new URL('../server/src/room.js', import.meta.url), 'utf8');
  const tr = JSON.parse(src.match(/const TRACKS = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
  const cs = JSON.parse(src.match(/const CARS = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
  ok(JSON.stringify(tr) === JSON.stringify(TRACK_DEFS.map(t => t.id)), `서버 트랙 ${tr.join(',')} = 게임 트랙`);
  ok(JSON.stringify(cs) === JSON.stringify(CARS.map(c => c.id)), `서버 차 ${cs.length}종 = 게임 차`);
}

// 9) 재접속(새로고침): 같은 토큰의 새 연결이 옛 연결을 대신하고, 옛 연결이 닫혀도 "떠남"이 되지 않는다
{
  console.log('[재접속 교체]');
  const st = new Storage(), socks = [];
  const room = new Room(makeCtx(st, socks), {});
  const a = new Sock('a'), b = new Sock('b'); socks.push(a, b);
  await hi(room, a, 'A', 'ta'); await hi(room, b, 'B', 'tb');
  await room.webSocketMessage(b, JSON.stringify({ t: 'ready', on: true }));
  await room.webSocketMessage(a, JSON.stringify({ t: 'start' }));
  clearInterval(room.tickTimer);
  const a2 = new Sock('a2'); socks.push(a2);
  await hi(room, a2, 'A', 'ta');
  ok(a.closed === 4000, `옛 연결은 4000 으로 닫힘 (${a.closed})`);
  const n0 = room.race.log.length;
  await room.webSocketClose(a);
  ok(room.players.get('p1').conn === true && room.race.log.length === n0, '옛 연결이 닫혀도 여전히 접속 중, 끊김 입력 없음');
  ok(!!a2.last('welcome')?.race, '새 연결은 진행 중 레이스를 받는다');
}

// 10) 전원이 "레이스 나가기" → 바로 끝나 새 레이스 가능
{
  console.log('[전원 나가기]');
  const st = new Storage(), socks = [];
  const room = new Room(makeCtx(st, socks), {});
  const a = new Sock('a'), b = new Sock('b'); socks.push(a, b);
  await hi(room, a, 'A', 'ta'); await hi(room, b, 'B', 'tb');
  await room.webSocketMessage(b, JSON.stringify({ t: 'ready', on: true }));
  await room.webSocketMessage(a, JSON.stringify({ t: 'start' }));
  clearInterval(room.tickTimer);
  now = room.race.startAt + 20000;
  const DC = 128 | (1 << 20) | (1 << 21);
  await room.webSocketMessage(a, JSON.stringify({ t: 'in', e: [[1, 1200, DC]] }));
  await room.webSocketMessage(b, JSON.stringify({ t: 'in', e: [[1, 1200, DC]] }));
  room.tick();
  ok(room.phase === 'lobby', `둘 다 나가기 → 레이스 종료 (${room.phase})`);
}

// 11) 출발 뒤 잠들었다 깨도 "준비"가 되살아나지 않는다
{
  console.log('[잠든 뒤 준비 상태]');
  const st = new Storage(), socks = [];
  let room = new Room(makeCtx(st, socks), {});
  const a = new Sock('a'), b = new Sock('b'); socks.push(a, b);
  await hi(room, a, 'A', 'ta'); await hi(room, b, 'B', 'tb');
  await room.webSocketMessage(b, JSON.stringify({ t: 'ready', on: true }));
  await room.webSocketMessage(a, JSON.stringify({ t: 'start' }));
  clearInterval(room.tickTimer);
  room.endRace(); clearTimeout(room._saveT);
  room = new Room(makeCtx(st, socks), {});
  ok(!room.players.get('p2').ready, 'B 는 준비 안 됨 상태로 복구');
}

// 12) 결과 보고 과반 규칙: 3명 중 1명만 보고 → 15초로는 안 끝나고 90초
{
  console.log('[과반 규칙]');
  const st = new Storage(), socks = [];
  const room = new Room(makeCtx(st, socks), {});
  const ss = ['a', 'b', 'c'].map(n => new Sock(n)); socks.push(...ss);
  for (const x of ss) await hi(room, x, x.name, 't' + x.name);
  await room.webSocketMessage(ss[0], JSON.stringify({ t: 'set', laps: 1 }));
  for (const x of ss.slice(1)) await room.webSocketMessage(x, JSON.stringify({ t: 'ready', on: true }));
  await room.webSocketMessage(ss[0], JSON.stringify({ t: 'start' }));
  clearInterval(room.tickTimer);
  now = room.race.startAt + 60000;
  await room.webSocketMessage(ss[2], JSON.stringify({ t: 'done', r: [[2, 3000, 601]] }));
  now += 20000; room.tick();
  ok(room.phase === 'race', '1명 보고 20초 뒤에도 아직 레이스');
  now += 75000; room.tick();
  ok(room.phase === 'lobby' && !room.settings.records.circuit, `90초 뒤 종료, 혼자 보고한 기록은 안 남김 (${JSON.stringify(room.settings.records.circuit)})`);
  clearTimeout(room._saveT);
}

// 12) 차 색 고르기 (2026-10-02 14회차): 안 고른 사람은 서로 다른 색, 고른 색은 그대로, 잘못된 값은 무시, 레이스 설정에 실림
{
  console.log('[차 색]');
  const st = new Storage(), socks = [];
  const room = new Room(makeCtx(st, socks), {});
  const a = new Sock('a'), b = new Sock('b'), c = new Sock('c'); socks.push(a, b, c);
  await hi(room, a, 'A', 'ta'); await hi(room, b, 'B', 'tb'); await hi(room, c, 'C', 'tc', { paint: 13 });
  let ps = c.last('lobby').lobby.players;
  ok(ps[0].paint === 0 && ps[1].paint === 1 && ps[2].paint === 13, `안 고른 사람 0·1, 고른 사람 13 (${ps.map(p => p.paint)})`);
  for (const bad of [20, -1, 1.5, '3', null]) await room.webSocketMessage(a, JSON.stringify({ t: 'paint', paint: bad }));
  ok(room.players.get('p1').paint === 0, '잘못된 색 번호(20, -1, 1.5, "3", null)는 무시');
  await room.webSocketMessage(a, JSON.stringify({ t: 'paint', paint: 19 }));
  ps = b.last('lobby').lobby.players;
  ok(ps[0].paint === 19, `색 바꾸기가 모두에게 보인다 (${ps[0].paint})`);
  // 잠들었다 깨어나도 색 유지
  const room2 = new Room(makeCtx(st, socks), {});
  ok(room2.players.get('p1').paint === 19, '잠들었다 깨어나도 색 유지');
  await room.webSocketMessage(b, JSON.stringify({ t: 'ready', on: true }));
  await room.webSocketMessage(c, JSON.stringify({ t: 'ready', on: true }));
  await room.webSocketMessage(a, JSON.stringify({ t: 'start' }));
  clearInterval(room.tickTimer);
  ok(JSON.stringify(room.race.cfg.players.map(p => p.paint)) === '[19,1,13]', `레이스 설정에 색 (${room.race.cfg.players.map(p => p.paint)})`);
}

// 13) 대기실 대화: 모두에게 전달, 제어문자 제거·120자, 너무 빠르면 보낸 사람에게만 알림, 새로 온 사람은 최근 대화를 받는다
{
  console.log('[대기실 대화]');
  const st = new Storage(), socks = [];
  const room = new Room(makeCtx(st, socks), {});
  const a = new Sock('a'), b = new Sock('b'); socks.push(a, b);
  await hi(room, a, 'A', 'ta'); await hi(room, b, 'B', 'tb');
  await room.webSocketMessage(a, JSON.stringify({ t: 'chat', text: '  안녕\u0000\u202e하세요 <b>굵게</b>  ' }));
  const got = b.last('chat');
  ok(got && got.m.text === '안녕 하세요 <b>굵게</b>' && got.m.name === 'A' && got.m.id === 'p1', `받은 글 = ${JSON.stringify(got?.m.text)} (태그는 글자 그대로 — 화면은 글자로만 그림)`);
  now += 100;
  b.out.length = 0; a.out.length = 0;
  await room.webSocketMessage(a, JSON.stringify({ t: 'chat', text: '연타' }));
  ok(!b.last('chat') && a.last('err')?.code === 'chat', '0.7초 안에 또 보내면 전달 안 되고 보낸 사람에게만 알림');
  now += 800;
  await room.webSocketMessage(a, JSON.stringify({ t: 'chat', text: 'x'.repeat(500) }));
  ok(b.last('chat')?.m.text.length === 120, `긴 글은 120자로 (${b.last('chat')?.m.text.length})`);
  for (let i = 0; i < 10; i++) { now += 800; await room.webSocketMessage(b, JSON.stringify({ t: 'chat', text: '줄' + i })); }
  const sent = a.out.filter(m => m.t === 'chat' && m.m.id === 'p2').length;
  ok(sent === 6 || sent === 7, `10초에 6줄 제한 (0.8초 간격 10번 → ${sent}줄 전달)`);
  for (let i = 0; i < 30; i++) { now += 2000; await room.webSocketMessage(a, JSON.stringify({ t: 'chat', text: '기록' + i })); }
  const c = new Sock('c'); socks.push(c);
  await hi(room, c, 'C', 'tc');
  const w = c.last('welcome');
  ok(w.chat.length === 20 && w.chat[19].text === '기록29', `새로 온 사람은 최근 20줄을 받는다 (${w.chat.length}줄, 마지막 ${w.chat[19]?.text})`);
  await room.webSocketMessage(a, JSON.stringify({ t: 'chat', text: 123 }));
  await room.webSocketMessage(a, JSON.stringify({ t: 'chat', text: '   ' }));
  ok(room.chat.length === 20 && room.chat[19].text === '기록29', '글자가 아니거나 빈 글은 무시');
  const raw = JSON.stringify(await st.get('players') || []) + JSON.stringify(await st.get('settings') || {});
  ok(!raw.includes('기록'), '대화는 저장소에 남기지 않는다');
}

Date.now = realNow;
console.log(fail ? `\n실패 ${fail}개` : '\n전부 통과');
process.exit(fail ? 1 : 0);
