// 실제 크롬으로 화면을 찍는다. 사용법: node tests/shot.mjs <이름> "<쿼리>" [대기초] [가로x세로] [gpu|sw]
// 결과: tests/shots/<이름>.png, 콘솔 오류·GPU 이름 출력
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const [name = 'shot', query = 'solo=1', waitS = '8', size = '1600x900', mode = 'gpu'] = process.argv.slice(2);
const [W, H] = size.split('x').map(Number);
const BASE = process.env.BASE || 'http://127.0.0.1:8790/';
fs.mkdirSync('tests/shots', { recursive: true });
const args = ['--no-sandbox', `--window-size=${W},${H}`, '--autoplay-policy=no-user-gesture-required',
  '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'];
if (mode === 'gpu') args.push('--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu');
else args.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader');
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args, defaultViewport: { width: W, height: H } });
const page = await browser.newPage();
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
await page.goto(BASE + 'index.html?' + query, { waitUntil: 'load', timeout: 60000 });
await new Promise(r => setTimeout(r, +waitS * 1000));
const info = await page.evaluate(() => ({ gpu: window.__gpu, v: window.__version, q: window.__game ? null : null,
  fps: window.__game ? (() => { const l = window.__game.fpsLog.slice(-120); const a = l.reduce((s, x) => s + x.dt, 0) / Math.max(1, l.length); return (1000 / a).toFixed(1); })() : '-',
  frame: window.__game?.session.frame }));
await page.screenshot({ path: `tests/shots/${name}.png` });
console.log(JSON.stringify(info));
for (const l of logs.slice(0, 30)) console.log(l);
await browser.close();
