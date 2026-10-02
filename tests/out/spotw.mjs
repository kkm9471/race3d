// 사용: node tests/out/spotw.mjs 이름 맵id cx cy cz lx ly lz  (세계 좌표)
import puppeteer from 'puppeteer-core';
const [name, id, cx, cy, cz, lx, ly, lz] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--window-size=1280,720'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const logs = [];
p.on('console', m => { const t = m.text(); if (!t.includes('X4122')) logs.push(t); });
p.on('pageerror', e => logs.push('[pageerror] ' + e.message));
await p.goto(`http://127.0.0.1:8790/index.html?solo=1&dev=1&track=${id}&bot=1&bots=0`, { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 4000));
await p.evaluate(({ cx, cy, cz, lx, ly, lz }) => {
  const v = window.__game.view;
  v.updateCamera = function () { const c = this.gfx.camera; c.position.set(+cx, +cy, +cz); c.up.set(0, 1, 0); c.lookAt(+lx, +ly, +lz); c.fov = 70; c.updateProjectionMatrix(); };
}, { cx, cy, cz, lx, ly, lz });
await new Promise(r => setTimeout(r, 1500));
await p.screenshot({ path: `tests/shots/${name}.png` });
logs.slice(0, 10).forEach(l => console.log(l));
await b.close();
