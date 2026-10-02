// 화면 가운데 뿌연 띠의 원인 물체 찾기: 멈춘 화면에서 트랙 자식을 하나씩 숨겨 가운데 영역 색이 가장 크게 바뀌는 것
import puppeteer from 'puppeteer-core';
const [map, frame] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11', '--enable-gpu', '--window-size=960,540', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'], defaultViewport: { width: 960, height: 540 } });
const p = await b.newPage();
await p.goto(`http://127.0.0.1:8790/index.html?solo=1&track=${map}&bots=0&q=low&bot=1`, { waitUntil: 'load' });
await p.waitForFunction(f => window.__game && window.__game.session.frame >= f, { timeout: 90000, polling: 100 }, +frame);
await p.evaluate(() => { window.__game.paused = true; });
const sample = async () => { await new Promise(r => setTimeout(r, 200)); return p.evaluate(() => { const v = window.__game.view, gl = v.gfx.renderer.getContext(); v.gfx.render(); const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight; const w = Math.floor(W * 0.25), h = Math.floor(H * 0.3); const d = new Uint8Array(w * h * 4); gl.readPixels(Math.floor(W * 0.375), Math.floor(H * 0.25), w, h, gl.RGBA, gl.UNSIGNED_BYTE, d); let r = 0, gg = 0, bb = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; bb += d[i + 2]; } const n = d.length / 4; return [r / n, gg / n, bb / n]; }); };
const base = await sample();
const kids = await p.evaluate(() => { const t = window.__game.view.track; window.__k = t.children.slice(); return t.children.map((c, i) => `${i}:${c.type}:${c.material?.type || ''}:${c.material?.transparent ? '투명' : ''}:${c.material?.color?.getHexString?.() || ''}`); });
const res = [];
for (let i = 0; i < kids.length; i++) {
  await p.evaluate(i => { window.__k[i].visible = false; }, i);
  const s = await sample();
  await p.evaluate(i => { window.__k[i].visible = true; }, i);
  res.push([Math.abs(s[0] - base[0]) + Math.abs(s[1] - base[1]) + Math.abs(s[2] - base[2]), kids[i], s.map(v => v.toFixed(0)).join(',')]);
}
res.sort((a, b) => b[0] - a[0]);
console.log('기준 색', base.map(v => v.toFixed(0)).join(','));
for (const r of res.slice(0, 5)) console.log(r[0].toFixed(1), r[1], '→', r[2]);
await b.close();
