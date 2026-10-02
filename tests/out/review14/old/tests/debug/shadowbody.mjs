import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-gpu', '--use-angle=d3d11', '--window-size=1280,720'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage();
await p.goto('http://127.0.0.1:8790/index.html?solo=1&track=circuit&bots=0&q=high', { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 5000));
const r = await p.evaluate(async () => {
  const THREE = await import('/vendor/three/three.module.js');
  const v = window.__game.view, g = window.__gfx;
  v.updateCamera = function () { const mm = this.cars[0].mesh, cam = this.gfx.camera; cam.position.set(mm.position.x + 4, mm.position.y + 22, mm.position.z + 2); cam.lookAt(mm.position); cam.fov = 50; cam.updateProjectionMatrix(); };

  const body = v.cars[0].mesh.children[0];
  const geo = body.geometry;
  const bs = geo.boundingSphere;
  // 실험: 그림자 전용 면을 양면으로
  return { groups: geo.groups, idx: geo.index.count, pos: geo.attributes.position.count, bs: bs ? [bs.center.toArray(), bs.radius] : null, box: geo.boundingBox };
});
console.log(JSON.stringify(r).slice(0, 600));
await new Promise(r => setTimeout(r, 1500));
await p.screenshot({ path: 'tests/shots/shadow_low.png' });
await b.close();
