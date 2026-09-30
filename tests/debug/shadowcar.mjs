import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-gpu', '--use-angle=d3d11', '--window-size=1280,720'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage();
await p.goto('http://127.0.0.1:8790/index.html?solo=1&track=circuit&bots=0&q=high', { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 5000));
const info = await p.evaluate(() => {
  const v = window.__game.view;
  const m = v.cars[0].mesh;
  const out = [];
  m.traverse(o => { if (o.isMesh) out.push(`${o.geometry.type}:${o.castShadow ? 'C' : '-'}:${o.visible ? 'V' : 'h'}:${o.frustumCulled ? 'f' : ''}:${(Array.isArray(o.material) ? o.material.map(x => x.type + (x.transparent ? 'T' : '')).join('+') : o.material.type + (o.material.transparent ? 'T' : ''))}`); });
  v.updateCamera = function () { const mm = this.cars[0].mesh, cam = this.gfx.camera; cam.position.set(mm.position.x + 6, mm.position.y + 14, mm.position.z - 8); cam.lookAt(mm.position); cam.fov = 50; cam.updateProjectionMatrix(); };
  // 차 위에 상자 하나
  const THREE = window.__THREE;
  return out;
});
console.log(info.join('\n'));
await b.close();
