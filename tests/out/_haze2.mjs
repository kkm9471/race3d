import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11', '--enable-gpu', '--window-size=960,540'], defaultViewport: { width: 960, height: 540 } });
const p = await b.newPage();
await p.goto('http://127.0.0.1:8790/index.html?solo=1&track=ice&bots=0&q=low&bot=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__game && window.__game.session.frame >= 1500, { timeout: 90000, polling: 100 });
await p.evaluate(() => { window.__game.paused = true; });
await new Promise(r => setTimeout(r, 400));
await p.screenshot({ path: 'tests/out/haze_a.png' });
const info = await p.evaluate(() => {
  const t = window.__game.view.track, out = [];
  t.traverse(o => { const m = o.material; if (o.isMesh && m && !Array.isArray(m) && (m.transparent || m.blending !== 1)) { out.push(`${o.type} ${m.type} 투명${m.transparent} 섞기${m.blending} 색${m.color?.getHexString?.()} 정점${o.geometry?.attributes?.position?.count}`); o.userData.__hid = true; o.visible = false; } });
  return out;
});
await new Promise(r => setTimeout(r, 400));
await p.screenshot({ path: 'tests/out/haze_b.png' });
console.log(info.join('\n'));
await b.close();
