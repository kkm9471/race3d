import puppeteer from 'puppeteer-core';
const [name, track, times] = process.argv.slice(2);
const args = ['--no-sandbox', '--window-size=1280,720', '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'];
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args, defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
page.on('pageerror', e => console.log('[pageerror]', e.message));
page.on('console', m => { const t = m.text(); if (/오류|error/i.test(t) && !/X4122/.test(t)) console.log(t.slice(0, 300)); });
await page.goto(`http://127.0.0.1:8790/index.html?solo=1&dev=1&track=${track}&bot=1&bots=2`, { waitUntil: 'load', timeout: 60000 });
let t0 = 0;
for (const t of times.split(',').map(Number)) {
  await new Promise(r => setTimeout(r, (t - t0) * 1000)); t0 = t;
  await page.screenshot({ path: `tests/shots/${name}_${t}.png` });
  console.log('shot', t);
}
await browser.close();
