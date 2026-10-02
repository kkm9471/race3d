// 화면 흐름 캡처: 첫 화면 → 혼자 대기실 → (1랩 봇 주행) → 결과
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--enable-gpu', '--use-angle=d3d11', '--window-size=1600,900'], defaultViewport: { width: 1600, height: 900 } });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto('http://127.0.0.1:8790/index.html?q=medium&bot=1', { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 4000));
await p.screenshot({ path: 'tests/shots/ui_menu.png' });
await p.type('#m-name', '테스트');
await p.click('#m-solo');
await new Promise(r => setTimeout(r, 2500));
await p.screenshot({ path: 'tests/shots/ui_lobby.png' });
await p.select('#l-laps', '1');
await p.select('#l-bots', '2');
await p.click('#l-start');
for (let i = 0; i < 90; i++) {
  await new Promise(r => setTimeout(r, 2000));
  if (await p.evaluate(() => !document.getElementById('results').classList.contains('hidden'))) break;
}
await new Promise(r => setTimeout(r, 500));
await p.screenshot({ path: 'tests/shots/ui_results.png' });
console.log('errors:', errs);
await b.close();
