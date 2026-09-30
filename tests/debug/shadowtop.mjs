import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-gpu', '--use-angle=d3d11', '--window-size=1280,720'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage();
await p.goto('http://127.0.0.1:8790/index.html?solo=1&track=circuit&bots=0&q=high', { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 5000));
await p.evaluate(() => {
  const v = window.__game.view;
  v.updateCamera = function () {
    const m = this.cars[0].mesh, cam = this.gfx.camera;
    cam.position.set(m.position.x + 6, m.position.y + 14, m.position.z - 8);
    cam.lookAt(m.position); cam.fov = 50; cam.updateProjectionMatrix();
  };
});
await new Promise(r => setTimeout(r, 1500));
await p.screenshot({ path: 'tests/shots/shadow_top.png' });
await p.evaluate(() => { const g = window.__gfx; g.sun.shadow.radius = 1; g.sun.shadow.normalBias = 0; g.sun.shadow.bias = -0.0005; g.q.post = false; g.composer = null; });
await new Promise(r => setTimeout(r, 1000));
await p.screenshot({ path: 'tests/shots/shadow_top2.png' });
await b.close();
