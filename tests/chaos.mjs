// 깨뜨리기 시험 — 완성 기준 6 (잘못된 입력·연결 끊김·방 인원 초과·새로고침에도 죽지 않음)
// 먼저: node tools/serve.mjs 8790 , cd server && npx wrangler dev --port 8797 --local
// 사용법: node tests/chaos.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const BASE = process.env.BASE || 'http://127.0.0.1:8790/';
const WS = process.env.WS ?? 'ws://127.0.0.1:8797/ws';
const R = 'K' + Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, 'Q');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fail = 0;
const lines = [];
const ok = (c, m) => { const t = `  ${c ? '✅' : '❌'} ${m}`; console.log(t); lines.push(t); if (!c) fail++; };
const browsers = [];
async function open(query, name = 'x') {
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'race3d-chaos-'));
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', userDataDir: prof,
    args: ['--no-sandbox', '--window-size=800,450', '--use-angle=d3d11', '--enable-gpu', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'],
    defaultViewport: { width: 800, height: 450 } });
  browsers.push(b);
  const p = await b.newPage();
  p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(`${BASE}index.html?${query}${WS && !query.includes('ws=') ? '&ws=' + encodeURIComponent(WS) : ''}`, { waitUntil: 'load' });
  p.label = name;
  return p;
}
const ev = (p, fn, ...a) => p.evaluate(fn, ...a).catch(e => ({ err: String(e) }));

console.log('방', R);
// ── 1) 두 사람 레이스 시작 ──
const A = await open(`auto=${R}&name=A&car=baram&bot=1&ready=1&autostart=2&track=circuit&laps=2&q=low&noscale=1`, 'A');
await sleep(1500);
const B = await open(`auto=${R}&name=B&car=beongae&bot=1&ready=1&q=low&noscale=1`, 'B');
let started = false;
for (let i = 0; i < 40 && !started; i++) { await sleep(500); started = (await ev(A, () => (window.__game?.session.frame || 0) > 60)) === true; }
ok(started, '두 사람 레이스 시작');
await sleep(15000);

// ── 2) B 새로고침 → 같은 자리로 돌아와 이어서 달린다 ──
const before = await ev(B, () => ({ local: window.__game.local, f: window.__game.session.frame }));
await B.reload({ waitUntil: 'load' });
let back = null;
for (let i = 0; i < 40; i++) {
  await sleep(500);
  back = await ev(B, () => window.__game ? { local: window.__game.local, f: window.__game.session.frame, catching: window.__game.catchingUp } : null);
  if (back && back.f > before.f && !back.catching) break;
}
ok(back && back.local === before.local, `새로고침 후 같은 자리(${before.local} → ${back && back.local})로 복귀`);
ok(back && back.f >= before.f, `새로고침 후 레이스를 따라잡아 이어서 진행 (프레임 ${before.f} → ${back && back.f})`);

// ── 3) A 연결 강제 끊김 → 자동 재접속 ──
await ev(A, () => window.__app.net.ws.close(4999, 'test'));
await sleep(1500);
const dcSeen = await ev(B, () => window.__game.session.sim.cars[0].st.dc);
let reA = null;
for (let i = 0; i < 30; i++) {
  await sleep(500);
  reA = await ev(A, () => ({ st: window.__app.net?.statusText, f: window.__game?.session.frame, dc: window.__game?.session.sim.cars[0].st.dc }));
  if (reA.st === '연결됨' && reA.f && !reA.dc) break;
}
ok(dcSeen === 1 || dcSeen === true, 'A가 끊긴 동안 B 화면에서 A 차는 "끊김(유령·정지)"');
ok(reA && reA.st === '연결됨' && !reA.dc, `A 자동 재접속 후 다시 운전 (${reA && reA.st})`);

// ── 4) 관전자 + 방 가득 참 ──
const C = await open(`auto=${R}&name=${encodeURIComponent('<b>관전</b>😀아주아주긴이름입니다')}&q=low`, 'C');
await sleep(4000);
const cView = await ev(C, () => ({ local: window.__game?.local, f: window.__game?.session.frame }));
ok(cView && cView.local === -1 && cView.f > 0, `레이스 중 들어온 사람은 관전 (자리 ${cView && cView.local}, 프레임 ${cView && cView.f})`);
const nameShown = await ev(A, () => [...document.querySelectorAll('#l-players .nm')].map(e => e.textContent).join('|'));
const D = await open(`auto=${R}&name=D&q=low`, 'D');
await sleep(2500);
const E = await open(`auto=${R}&name=E&q=low`, 'E');
await sleep(3000);
const eMsg = await ev(E, () => document.getElementById('m-msg').textContent);
ok(/가득/.test(eMsg || ''), `5번째 입장 → 안내: "${eMsg}"`);
ok(await ev(E, () => !document.getElementById('menu').classList.contains('hidden')), '가득 찬 사람은 첫 화면으로 (게임 안 죽음)');

// ── 5) 잘못된 방 코드·빈 이름·서버 불량 ──
const F = await open(`q=low`, 'F');
await ev(F, () => { document.getElementById('m-name').value = ''; document.getElementById('m-room').value = '!!'; document.getElementById('m-join').click(); });
await sleep(300);
const f1 = await ev(F, () => document.getElementById('m-msg').textContent);
ok(/이름/.test(f1 || ''), `빈 이름 → "${f1}"`);
await ev(F, () => { document.getElementById('m-name').value = '테스트'; document.getElementById('m-room').value = '!!'; document.getElementById('m-join').click(); });
await sleep(300);
const f2 = await ev(F, () => document.getElementById('m-msg').textContent);
ok(/방 코드/.test(f2 || ''), `잘못된 방 코드 → "${f2}"`);
const G = await open(`auto=ZZZZ&name=G&q=low&ws=${encodeURIComponent('ws://127.0.0.1:1/ws')}`, 'G');
await sleep(5000);
const g1 = await ev(G, () => ({ st: window.__app.net?.statusText, alive: !!document.body }));
ok(g1 && /끊김|연결/.test(g1.st || '') && g1.alive, `서버에 못 붙어도 안 죽고 재시도 표시: "${g1 && g1.st}"`);
// 서버 안 되면 혼자 연습은 된다
await ev(G, () => { window.__app.net?.close(); document.getElementById('l-leave')?.click(); });
await sleep(300);
await ev(G, () => { document.getElementById('m-solo').click(); });
await sleep(800);
await ev(G, () => document.getElementById('l-start').click());
await sleep(6000);
const g2 = await ev(G, () => window.__game?.session.frame || 0);
ok(g2 > 60, `서버 없이 혼자 연습 가능 (프레임 ${g2})`);
// 키 마구 누르기 20초
const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyR', 'KeyC', 'KeyB', 'KeyM', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Tab', 'Escape', 'F13', 'KeyQ'];
for (let i = 0; i < 400; i++) {
  const k = keys[Math.floor(Math.random() * keys.length)];
  if (Math.random() < 0.5) await G.keyboard.down(k).catch(() => {}); else await G.keyboard.up(k).catch(() => {});
  await sleep(50);
}
for (const k of keys) await G.keyboard.up(k).catch(() => {});
const g3 = await ev(G, () => ({ f: window.__game?.session.frame || 0, ok: Number.isFinite(window.__game?.session.sim.cars[0].st.px) }));
ok(g3 && g3.ok && g3.f > g2, `키 400번 마구 눌러도 정상 (프레임 ${g3 && g3.f}, 좌표 유효)`);

// ── 6) A·B 완주, 결과 같음 ──
let RA = null, RB = null;
for (let i = 0; i < 200 && !(RA && RB); i++) {
  await sleep(2000);
  RA = await ev(A, () => window.__lastResults ? { res: window.__lastResults.res.map(r => `${r.name}:${r.fin}`).join(' '), sent: window.__lastResults.sent } : null);
  RB = await ev(B, () => window.__lastResults ? { res: window.__lastResults.res.map(r => `${r.name}:${r.fin}`).join(' '), sent: window.__lastResults.sent } : null);
  if (RA && RA.err) RA = null; if (RB && RB.err) RB = null;
}
ok(RA && RB && RA.res === RB.res, `새로고침·끊김을 겪고도 두 화면 결과 같음: ${RA && RA.res}`);
if (RA && RB) {
  const ks = Object.keys(RA.sent).filter(k => RB.sent[k] !== undefined);
  const same = ks.filter(k => RA.sent[k] === RB.sent[k]).length;
  ok(ks.length > 3 && same === ks.length, `상태 해시 ${same}/${ks.length} 일치`);
}
const cRes = await ev(C, () => window.__lastResults ? window.__lastResults.res.map(r => `${r.name}:${r.fin}`).join(' ') : null);
ok(cRes === (RA && RA.res), `관전자 화면 결과도 같음: ${cRes}`);
for (const p of [A, B, C, D, E, F, G]) {
  const bad = p.errs.filter(e => !/X4122|precision/.test(e));
  ok(bad.length === 0, `${p.label} 페이지 오류 없음${bad.length ? ': ' + bad.slice(0, 2).join(' / ') : ''}`);
}
console.log('이름 표시(HTML 무력화 확인):', nameShown);
for (const b of browsers) await b.close();
fs.writeFileSync('tests/out/chaos.md', `# 깨뜨리기 시험 (${new Date().toISOString()})\n\`\`\`\n${lines.join('\n')}\n\`\`\`\n`);
console.log(fail ? `\n실패 ${fail}개` : '\n전부 통과');
process.exit(fail ? 1 : 0);
