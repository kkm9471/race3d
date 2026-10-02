// 대기실 대화·색 고르기·트랙 미리보기 확인 (14회차): 두 사람이 같은 방에 들어가 색을 고르고 대화를 주고받은 뒤 찍는다
// 먼저: node tools/serve.mjs 8790 + (cd server && npx wrangler dev --port 8797 --local)
// 사용법: node tests/debug/_lobby_chat.mjs   → tests/out/lobby_a.png, lobby_b.png
import puppeteer from 'puppeteer-core';
const BASE = process.env.BASE || 'http://127.0.0.1:8790/';
const WS = process.env.WS || 'ws://127.0.0.1:8797/ws';
const room = 'C' + Math.random().toString(36).slice(2, 5).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11', '--window-size=1500,1000'], defaultViewport: { width: 1500, height: 1000 } });
const errs = [];
async function open(name) {
  const ctx = await b.createBrowserContext();       // 사람마다 따로 (저장소·토큰이 섞이지 않게)
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(name + ': ' + m.text()); });
  await p.goto(`${BASE}index.html?q=low&auto=${room}&name=${encodeURIComponent(name)}&ws=${encodeURIComponent(WS)}`, { waitUntil: 'load' });
  await p.waitForFunction(() => !document.getElementById('lobby').classList.contains('hidden') && document.getElementById('l-conn').textContent === '연결됨', { timeout: 15000 });
  return p;
}
const A = await open('철수');
const B = await open('영희');
await new Promise(r => setTimeout(r, 800));
// A: 색 13(남색) 고르기, 트랙 바꾸기 / B: 색 7(분홍)
await (await A.$$('#l-paints button'))[13].click();
await (await B.$$('#l-paints button'))[7].click();
await A.evaluate(() => { const bs = document.querySelectorAll('#l-tracks button'); bs[Math.min(5, bs.length - 1)].click(); });
await new Promise(r => setTimeout(r, 600));
// 대화: 태그가 섞인 글도 글자 그대로 보여야 한다
await A.type('#l-chat-in', '안녕! <img src=x onerror=alert(1)> 같이 달리자');
await A.keyboard.press('Enter');
await new Promise(r => setTimeout(r, 900));
await B.type('#l-chat-in', '좋아 ㅋㅋ');
await B.keyboard.press('Enter');
await new Promise(r => setTimeout(r, 900));
const seeA = await A.evaluate(() => [...document.querySelectorAll('#l-chat-log .ln')].map(e => e.textContent));
const seeB = await B.evaluate(() => [...document.querySelectorAll('#l-chat-log .ln')].map(e => e.textContent));
const imgs = await B.evaluate(() => document.querySelectorAll('#l-chat-log img').length);
const dots = await B.evaluate(() => [...document.querySelectorAll('#l-players .dot')].map(e => e.style.background));
const names = await B.evaluate(() => [...document.querySelectorAll('#l-players .car')].map(e => e.textContent));
const tp = await B.evaluate(() => [document.getElementById('l-tp-name').textContent, document.getElementById('l-tp-meta').textContent]);
console.log('A 화면 대화:', JSON.stringify(seeA));
console.log('B 화면 대화:', JSON.stringify(seeB));
console.log('대화 속 img 요소 수(0 이어야):', imgs);
console.log('B 화면 참가자 색:', JSON.stringify(dots), JSON.stringify(names));
console.log('B 화면 트랙 미리보기:', JSON.stringify(tp));
await A.screenshot({ path: 'tests/out/lobby_a.png' });
await B.screenshot({ path: 'tests/out/lobby_b.png' });
console.log('오류:', JSON.stringify(errs.slice(0, 8)));
await b.close();
