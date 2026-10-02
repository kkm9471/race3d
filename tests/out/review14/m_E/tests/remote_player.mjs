// 원격 참가자 — 다른 네트워크(GitHub 클라우드 PC)에서 공개 주소로 들어가 레이스를 끝까지 탄다
// 사용법: ROOM=ABCD node tests/remote_player.mjs  → 결과를 remote_result.json 으로
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const ROOM = process.env.ROOM, CAR = process.env.CAR || 'heukmeonji';
const BASE = process.env.BASE || 'https://kkm9471.github.io/race3d/';
const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(p => fs.existsSync(p));
const t0 = Date.now();
const ipInfo = await fetch('https://api.ipify.org?format=json').then(r => r.json()).catch(() => ({}));
console.log('원격 참가자 IP:', ipInfo.ip, '크롬:', exe);
const b = await puppeteer.launch({ executablePath: exe, headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=800,450',
  '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'], defaultViewport: { width: 800, height: 450 } });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto(`${BASE}index.html?auto=${ROOM}&name=${encodeURIComponent('원격(깃허브)')}&car=${CAR}&bot=1&ready=1&q=low&noscale=1`, { waitUntil: 'load', timeout: 60000 });
let res = null;
const deadline = Date.now() + 14 * 60 * 1000;
while (Date.now() < deadline) {
  await new Promise(r => setTimeout(r, 3000));
  const s = await p.evaluate(() => ({ f: window.__game?.session.frame ?? -1, rtt: window.__game?.net?.rtt ?? 0, L: window.__lastResults ? { res: window.__lastResults.res, sent: window.__lastResults.sent, stats: window.__lastResults.stats, desync: window.__lastResults.desync } : null, gpu: window.__gpu }));
  console.log(((Date.now() - t0) / 1000).toFixed(0) + 's', 'frame', s.f, 'rtt', Math.round(s.rtt));
  if (s.L) { res = { ...s.L, ip: ipInfo.ip, gpu: s.gpu, rtt: s.rtt }; break; }
}
await p.screenshot({ path: 'remote_shot.png' });
fs.writeFileSync('remote_result.json', JSON.stringify({ ok: !!res, res, errs }, null, 1));
console.log(JSON.stringify({ ok: !!res, results: res && res.res.map(r => `${r.name}:${r.fin}`), errs: errs.slice(0, 5) }));
await b.close();
process.exit(res ? 0 : 1);
