// 사용: node tests/out/spot.mjs 이름 맵id s(m) d(옆) 높이 look(앞 m) [lookLateral] [lookY오프셋]
import puppeteer from 'puppeteer-core';
const [name, id, s, d, h, la = '60', ll = '0', ly = '-2'] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--window-size=1280,720'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const logs = [];
p.on('console', m => { const t = m.text(); if (!t.includes('X4122')) logs.push(t); });
p.on('pageerror', e => logs.push('[pageerror] ' + e.message));
await p.goto(`http://127.0.0.1:8790/index.html?solo=1&dev=1&track=${id}&bot=1&bots=0`, { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 4000));
const info = await p.evaluate(({ s, d, h, la, ll, ly }) => {
  const g = window.__game, v = g.view, T = v.world.T || g.session.sim.world.T;
  const n = T.n, i = Math.round(+s / T.ds) % n, j = Math.round((+s + +la) / T.ds) % n;
  const pos = (i, d) => [T.x[i] + T.lx[i] * d, T.z[i] + T.lz[i] * d];
  const [x, z] = pos(i, +d), [lx, lz] = pos(j, +ll);
  const y = T.y[i] + +h, ty = T.y[j] + +ly;
  v.updateCamera = function () { const c = this.gfx.camera; c.position.set(x, y, z); c.up.set(0, 1, 0); c.lookAt(lx, ty, lz); c.fov = 70; c.updateProjectionMatrix(); };
  return { n, ds: T.ds, L: T.L };
}, { s, d, h, la, ll, ly });
await new Promise(r => setTimeout(r, 1500));
await p.screenshot({ path: `tests/shots/${name}.png` });
console.log(JSON.stringify(info)); logs.slice(0, 10).forEach(l => console.log(l));
await b.close();
