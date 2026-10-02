import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const maps = process.argv[2].split(',');
const q = process.env.Q || 'high', mode = process.env.MODE || 'gpu', waitS = +(process.env.WAIT || 9), cam = process.env.CAM || '0';
const [W, H] = [1280, 720];
const args = ['--no-sandbox', `--window-size=${W},${H}`, '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'];
if (mode === 'gpu') args.push('--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'); else args.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader');
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args, defaultViewport: { width: W, height: H } });
for (const m of maps) {
  const page = await browser.newPage();
  const logs = [];
  page.on('console', x => logs.push(`[${x.type()}] ${x.text()}`));
  page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
  await page.goto(`http://127.0.0.1:8790/index.html?solo=1&track=${m}&bots=0&q=${q}&cam=${cam}&laps=1&fps=0${process.env.EXTRA||""}`, { waitUntil: 'load', timeout: 60000 });
  await new Promise(r => setTimeout(r, waitS * 1000));
  const info = await page.evaluate(() => { const g = window.__game; const l = g ? g.fpsLog.slice(-120) : []; const a = l.reduce((s, x) => s + x.dt, 0) / Math.max(1, l.length); return { gpu: window.__gpu, fps: g ? (1000 / a).toFixed(1) : '-', frame: g?.session.frame, calls: window.__gfx?.renderer?.info?.render?.calls, tris: window.__gfx?.renderer?.info?.render?.triangles }; });
  await page.screenshot({ path: `tests/out/review14/${m}_${q}.png` });
  console.log(m, JSON.stringify(info), logs.filter(l => !/\[log\]/.test(l)).slice(0, 5).join(' | '));
  await page.close();
}
await browser.close();
