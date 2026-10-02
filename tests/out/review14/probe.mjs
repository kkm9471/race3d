import puppeteer from 'puppeteer-core';
const [map, waitS, extra=''] = process.argv.slice(2);
const args = ['--no-sandbox','--window-size=1280,720','--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist','--disable-background-timer-throttling','--disable-renderer-backgrounding'];
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args, defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
const logs=[]; page.on('console', x => logs.push(x.text())); page.on('pageerror', e => logs.push('ERR '+e.message));
await page.goto(`http://127.0.0.1:8790/index.html?solo=1&track=${map}&bots=0&q=${process.env.Q||"high"}&laps=1&bot=1${extra}`, { waitUntil: 'load' });
for (let k = 0; k < +waitS; k++) {
  await new Promise(r => setTimeout(r, 1000));
  const r = await page.evaluate(() => { const g = window.__game; if (!g) return null; const c = g.session.sim.cars[0].st, T = g.session.sim.T; const cam = window.__gfx.camera.position; const L = g.view.world.locate(c.px, c.pz, c.hint); const th = g.view.track.children.find(o => o.userData.heightAt); return { f: g.session.frame, s: +(L.s).toFixed(0), car: [c.px, c.py, c.pz].map(v => +v.toFixed(1)), cam: [cam.x, cam.y, cam.z].map(v => +v.toFixed(1)), roadY: +T.y[L.i].toFixed(1), terr: th ? +th.userData.heightAt(cam.x, cam.z).toFixed(1) : null, tun: T.tunnel[L.i] }; });
  console.log(k + 1, JSON.stringify(r)); if (process.env.SNAP && k+1 >= +process.env.SNAP) await page.screenshot({ path: 'tests/out/review14/snap_' + map + '_' + (k+1) + '.png' });
}
console.log(logs.filter(l=>!/X4122|Program Info/.test(l)).slice(0,8).join('\n'));
await browser.close();
