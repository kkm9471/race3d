import puppeteer from 'puppeteer-core';
const [map, waitS, extra=''] = process.argv.slice(2);
const args = ['--no-sandbox','--window-size=1280,720','--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist','--disable-background-timer-throttling','--disable-renderer-backgrounding'];
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args, defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
page.on('console', x => { const t = x.text(); if (!/X4122|Program Info/.test(t)) console.log('  [console]', x.type(), t.slice(0, 300)); }); page.on('pageerror', e => console.log('  [pageerror]', e.message));
await page.goto(`http://127.0.0.1:8790/index.html?solo=1&track=${map}&bots=0&q=${process.env.Q||'high'}&laps=1&bot=1${extra}`, { waitUntil: 'load' });
for (let k = 0; k < +waitS; k++) {
  await new Promise(r => setTimeout(r, 1000));
  const r = await page.evaluate(() => { const g = window.__game; if (!g) return null; const gl = window.__gfx.renderer.getContext(); const inf = window.__gfx.renderer.info.render; return { f: g.session.frame, lost: gl.isContextLost(), calls: inf.calls, tris: inf.triangles, err: gl.getError(), vis: window.__gfx.scene.children.length, camFar: window.__gfx.camera.far, fog: window.__gfx.scene.fog?.density }; });
  console.log(k + 1, JSON.stringify(r));
}
await browser.close();
