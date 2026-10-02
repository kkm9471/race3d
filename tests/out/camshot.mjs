// 사용: node camshot.mjs 이름 트랙 x z 높이 시선거리  (그 점 위쪽 비스듬히 내려다보기)
import puppeteer from 'puppeteer-core';
const [name, track, X, Z, H = '18', D = '30'] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox','--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist'], defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
page.on('console', m => { const t = m.text(); if (/오류|error|^PONDS/i.test(t) && !/X4122/.test(t)) console.log(t.slice(0, 300)); });
await page.goto(`http://127.0.0.1:8790/index.html?solo=1&dev=1&track=${track}&bot=1&bots=2`, { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 4000));
await page.evaluate((X, Z, H, D) => {
  const v = window.__game.view, g = v.gfx, T = v.T;
  let bi = 0, bd = 1e18;
  for (let i = 0; i < T.n; i++) { const d = (T.x[i] - X) ** 2 + (T.z[i] - Z) ** 2; if (d < bd) { bd = d; bi = i; } }
  const y = T.y[bi];
  const r = g.render.bind(g);
  g.render = () => { g.camera.position.set(+X - +D, y + +H, +Z); g.camera.lookAt(+X, y, +Z); g.camera.updateMatrixWorld(); r(); };
}, X, Z, H, D);
await new Promise(r => setTimeout(r, 1500));
await page.screenshot({ path: `tests/shots/${name}.png` });
await browser.close();
