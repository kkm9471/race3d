import puppeteer from 'puppeteer-core';
const mode = process.argv[2]; // abort | hang | delay
const args = ['--no-sandbox','--window-size=1280,720','--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist'];
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args, defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
const logs = [];
page.on('console', x => { const t = x.text(); if (!/X4122|Program Info/.test(t)) logs.push(t.slice(0, 160)); });
await page.setRequestInterception(true);
let n = 0;
page.on('request', r => {
  if (/\/themes\/moonhill\.js/.test(r.url())) { n++; if (mode === 'abort') return r.abort('failed'); if (mode === 'hang') return; if (mode === 'abort1' && n === 1) return r.abort('failed'); }
  r.continue();
});
await page.goto('http://127.0.0.1:8790/index.html?solo=1&track=moonhill&bots=0&q=high&laps=1&bot=1', { waitUntil: 'load' });
for (const s of [3, 12, 20]) {
  await new Promise(r => setTimeout(r, (s - (s === 3 ? 0 : s === 12 ? 3 : 12)) * 1000));
  const st = await page.evaluate(() => ({ screen: [...document.querySelectorAll('.screen')].filter(e => !e.classList.contains('hidden')).map(e => e.id), game: !!window.__game, frame: window.__game?.session.frame }));
  console.log(mode, 't=' + s, JSON.stringify(st), 'themeReq', n);
}
await page.screenshot({ path: `tests/out/review14/themefail_${mode}.png` });
console.log(logs.join('\n'));
await browser.close();
