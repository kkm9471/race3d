// 시험용(임시): 맵의 한 화면 그리기 호출·삼각형 수 (장면 전체, 그림자 포함)
import puppeteer from 'puppeteer-core';
const ids = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox', '--window-size=1280,720', '--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'], defaultViewport: { width: 1280, height: 720 } });
for (const id of ids) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (/오류|error/i.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await page.goto(`http://127.0.0.1:8790/index.html?solo=1&dev=1&track=${id}&bot=1&bots=2`, { waitUntil: 'load', timeout: 60000 });
  await new Promise(r => setTimeout(r, 7000));
  const info = await page.evaluate(() => new Promise(res => {
    const r = window.__gfx.renderer;
    requestAnimationFrame(() => { r.info.autoReset = false; r.info.reset();
    requestAnimationFrame(() => {
      const out = { calls: r.info.render.calls, tris: r.info.render.triangles };
      r.info.autoReset = true;
      let meshes = 0, inst = 0; const big = [];
      const tr = window.__app?.game?.view?.track;
      if (tr) tr.traverse(o => {
        if (!(o.isMesh || o.isPoints)) return;
        const g = o.geometry, t = (g.index ? g.index.count : g.attributes.position.count) / 3;
        if (o.isInstancedMesh) { inst++; big.push([Math.round(t * o.count), o.count, Math.round(t)]); } else { meshes++; big.push([Math.round(t), 1, Math.round(t)]); }
      });
      big.sort((a, b) => b[0] - a[0]);
      out.trackMeshes = meshes; out.trackInst = inst; out.top = big.slice(0, 14).map(x => x.join('/')).join(' ');
      res(out);
    }); });
  }));
  console.log(id, JSON.stringify(info), errs.length ? 'ERR ' + errs.join(' | ') : '');
  await page.close();
}
await browser.close();
