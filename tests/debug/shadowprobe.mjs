import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-gpu', '--use-angle=d3d11', '--window-size=1280,720'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage();
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[c]', m.text().slice(0, 200)); });
await p.goto('http://127.0.0.1:8790/index.html?solo=1&track=circuit&bots=0&bot=1&cam=1&q=high', { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 8000));
const info = await p.evaluate(() => {
  const g = window.__gfx;
  const s = g.sun;
  let casters = 0, receivers = 0;
  g.scene.traverse(o => { if (o.isMesh || o.isInstancedMesh) { if (o.castShadow) casters++; if (o.receiveShadow) receivers++; } });
  return { enabled: g.renderer.shadowMap.enabled, type: g.renderer.shadowMap.type, cast: s.castShadow, map: !!s.shadow.map, mapSize: s.shadow.mapSize.x,
    sunPos: s.position.toArray().map(v => +v.toFixed(1)), tgt: s.target.position.toArray().map(v => +v.toFixed(1)), inScene: !!s.target.parent,
    cam: [s.shadow.camera.left, s.shadow.camera.near, s.shadow.camera.far], casters, receivers, q: g.qKey, int: s.intensity, carPos: window.__game.view.cars[0].mesh.position.toArray().map(v => +v.toFixed(1)) };
});
console.log(JSON.stringify(info));
await b.close();
