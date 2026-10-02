import puppeteer from 'puppeteer-core';
const maps = process.argv[2].split(','), q = process.env.Q || 'high';
const args = ['--no-sandbox','--window-size=1280,720','--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist','--disable-gpu-vsync','--disable-frame-rate-limit','--disable-background-timer-throttling','--disable-renderer-backgrounding'];
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args, defaultViewport: { width: 1280, height: 720 } });
for (const map of maps) {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:8790/index.html?solo=1&track=${map}&bots=0&q=${q}&laps=1&bot=1&noscale=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game && window.__game.session.frame > 420, { timeout: 60000, polling: 200 });
  const r = await page.evaluate(() => new Promise(res => { let n = 0, t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 > 5000) res(n / ((performance.now() - t0) / 1000)); else requestAnimationFrame(f); }; requestAnimationFrame(f); }));
  console.log(q, map, r.toFixed(0), 'fps(rAF)');
  await page.close();
}
await browser.close();
