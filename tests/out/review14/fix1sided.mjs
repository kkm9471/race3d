import puppeteer from 'puppeteer-core';
const args = ['--no-sandbox','--window-size=1280,720','--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist','--disable-background-timer-throttling','--disable-renderer-backgrounding'];
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args, defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:8790/index.html?solo=1&track=mine&bots=0&q=high&laps=1&bot=1`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && window.__game.session.frame >= 580, { timeout: 60000, polling: 100 });
await page.evaluate(() => { const g = window.__game; g.paused = true; g.pauseAt = performance.now(); });
const size = async () => { await new Promise(r => setTimeout(r, 300)); return (await page.screenshot({ type: 'jpeg', quality: 60 })).length; };
console.log('before', await size());
const r = await page.evaluate(() => { const o = window.__game.view.track.children[116]; const g = o.geometry; const I = g.index; if (!I) return 'nonindexed';
  const old = I.array, keep = []; for (let s = 0; s + 12 <= old.length; s += 12) for (let j = 0; j < 6; j++) keep.push(old[s + j]);
  g.setIndex(keep); g.computeVertexNormals();
  let z = 0; const N = g.attributes.normal; for (let i = 0; i < N.count; i++) { const x=N.getX(i),y=N.getY(i),zz=N.getZ(i); if (x*x+y*y+zz*zz<1e-8) z++; }
  return { idx: old.length, kept: keep.length, zero: z }; });
console.log(JSON.stringify(r), 'after', await size());
await page.screenshot({ path: 'tests/out/review14/mine_fixed1s.png' });
await browser.close();
