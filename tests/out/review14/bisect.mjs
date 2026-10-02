import puppeteer from 'puppeteer-core';
const [map, frameTarget] = process.argv.slice(2);
const args = ['--no-sandbox','--window-size=1280,720','--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist','--disable-background-timer-throttling','--disable-renderer-backgrounding'];
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args, defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:8790/index.html?solo=1&track=${map}&bots=0&q=${process.env.Q||'high'}&laps=1&bot=1`, { waitUntil: 'load' });
await page.waitForFunction(ft => window.__game && window.__game.session.frame >= ft, { timeout: 60000, polling: 100 }, +frameTarget);
await page.evaluate(() => { const g = window.__game; g.paused = true; g.pauseAt = performance.now(); });
const size = async () => { await new Promise(r => setTimeout(r, 250)); return (await page.screenshot({ type: 'jpeg', quality: 60 })).length; };
console.log('frozen at', await page.evaluate(() => window.__game.session.frame), 'size', await size());
const kids = await page.evaluate(() => { const t = window.__game.view.track; window.__kids = t.children.slice(); return t.children.map((c, i) => `${i}:${c.type}:${c.isInstancedMesh ? 'I' + c.count : c.geometry ? c.geometry.attributes.position.count : ''}`); });
// hide each one individually: find which makes the image return
const base = await size();
const hits = [];
for (let i = 0; i < kids.length; i++) {
  await page.evaluate(i => { window.__kids[i].visible = false; }, i);
  const s = await size();
  await page.evaluate(i => { window.__kids[i].visible = true; }, i);
  if (s > base * 3) hits.push([i, kids[i], s]);
}
console.log('base', base, 'recover when hiding:', JSON.stringify(hits));
if (hits.length) { const info = await page.evaluate(i => { const o = window.__kids[i], m = o.material; const g = o.geometry; const pos = g.attributes.position; let nan = 0, inf=0; for (let k=0;k<pos.array.length;k++){ if (Number.isNaN(pos.array[k])) nan++; else if(!Number.isFinite(pos.array[k])) inf++; } const nrm = g.attributes.normal; let nn=0; if (nrm) for (let k=0;k<nrm.array.length;k++) if(!Number.isFinite(nrm.array[k])) nn++; const uv=g.attributes.uv; let nu=0; if(uv) for(let k=0;k<uv.array.length;k++) if(!Number.isFinite(uv.array[k])) nu++; return { type: m.type, color: m.color?.getHex?.(), emissive: m.emissive?.getHex?.(), ei: m.emissiveIntensity, rough: m.roughness, metal: m.metalness, trans: m.transparent, op: m.opacity, map: !!m.map, side: m.side, nanPos: nan, infPos: inf, nanNorm: nn, nanUv: nu, bbox: (g.computeBoundingBox(), g.boundingBox), attrs: Object.keys(g.attributes), pos: o.position, shadow: o.castShadow }; }, hits[0][0]); console.log(JSON.stringify(info)); }
await browser.close();
