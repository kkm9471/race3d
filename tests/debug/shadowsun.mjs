import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-gpu', '--use-angle=d3d11', '--window-size=1280,720'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage();
p.on('console', m => console.log('[c]', m.text().slice(0, 300)));
await p.goto('http://127.0.0.1:8790/index.html?solo=1&track=circuit&bots=0&q=high', { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 5000));
const r = await p.evaluate(() => {
  const v = window.__game.view, g = window.__gfx;
  v.updateCamera = function () { const mm = this.cars[0].mesh, cam = this.gfx.camera; cam.position.set(mm.position.x + 6, mm.position.y + 14, mm.position.z - 8); cam.lookAt(mm.position); cam.fov = 50; cam.updateProjectionMatrix(); };
  g.sunDir.set(0.3, 0.9, 0.3).normalize();
  const sm = g.renderer.shadowMap;
  return { auto: sm.autoUpdate, needs: sm.needsUpdate, shadowType: sm.type, lightShadowMapTexture: !!g.sun.shadow.map?.texture, camMatrix: g.sun.shadow.camera.projectionMatrix.elements.slice(0, 1) };
});
console.log(JSON.stringify(r));
await new Promise(r => setTimeout(r, 1500));
await p.screenshot({ path: 'tests/shots/shadow_sun.png' });
await b.close();
