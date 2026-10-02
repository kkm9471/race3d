import puppeteer from 'puppeteer-core';
const maps = process.argv[2].split(','), dur = +(process.env.DUR || 120), step = +(process.env.STEP || 1.5);
const args = ['--no-sandbox','--window-size=1280,720','--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist','--disable-background-timer-throttling','--disable-renderer-backgrounding'];
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args, defaultViewport: { width: 1280, height: 720 } });
for (const map of maps) {
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', x => { if (x.type() === 'error' || /오류|실패/.test(x.text())) errs.push(x.text().slice(0, 150)); });
  await page.goto(`http://127.0.0.1:8790/index.html?solo=1&track=${map}&bots=0&q=${process.env.Q||'high'}&laps=1&bot=1`, { waitUntil: 'load' });
  const blanks = []; let n = 0, minF = 0, maxS = 0;
  const t0 = Date.now();
  while ((Date.now() - t0) / 1000 < dur) {
    await new Promise(r => setTimeout(r, step * 1000));
    const info = await page.evaluate(() => { const g = window.__game; if (!g) return null; const c = g.session.sim.cars[0].st; const L = g.view.world.locate(c.px, c.pz, c.hint); return { f: g.session.frame, s: Math.round(L.s), over: g.session.sim.gs.over }; });
    if (!info || info.f < 200) continue;
    const sz = (await page.screenshot({ type: 'jpeg', quality: 50, clip: { x: 300, y: 200, width: 700, height: 300 } })).length;
    n++;
    if (sz < 12000) blanks.push(`s=${info.s}(f${info.f}):${sz}`);
    if (info.over) break;
  }
  console.log(map, 'samples', n, 'blank', blanks.length, blanks.slice(0, 20).join(' '), errs.slice(0, 3).join(' | '));
  await page.close();
}
await browser.close();
