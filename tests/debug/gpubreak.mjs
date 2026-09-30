import puppeteer from 'puppeteer-core';
const q = process.argv[2] || 'low';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--no-sandbox', '--window-size=1920,1080', '--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'], defaultViewport: { width: 1920, height: 1080 } });
const p = await b.newPage();
await p.goto(`http://127.0.0.1:8790/index.html?solo=1&track=circuit&car=baram&bots=3&bot=1&q=${q}&noscale=1&laps=5`, { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 7000));
const r = await p.evaluate(async () => {
  const g = window.__gfx, gl = g.renderer.getContext();
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const orig = g.render.bind(g);
  const measure = async (label, setup, undo) => {
    setup();
    const times = []; let pending = [];
    g.render = function () {
      const qq = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, qq); orig(); gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push(qq);
      pending = pending.filter(x => { if (!gl.getQueryParameter(x, gl.QUERY_RESULT_AVAILABLE)) return true; times.push(gl.getQueryParameter(x, gl.QUERY_RESULT) / 1e6); gl.deleteQuery(x); return false; });
    };
    await new Promise(r => setTimeout(r, 4000));
    g.render = orig; undo();
    times.sort((a, b) => a - b);
    return `${label}: ${times[Math.floor(times.length / 2)].toFixed(2)}ms`;
  };
  const sc = g.scene, v = window.__game.view;
  const out = [];
  out.push(await measure('전부', () => {}, () => {}));
  out.push(await measure('하늘 끔', () => { g.sky.visible = false; }, () => { g.sky.visible = true; }));
  out.push(await measure('트랙 끔', () => { v.track.visible = false; }, () => { v.track.visible = true; }));
  const kids = v.track.children;
  const terr = kids.find(o => o.userData.heightAt);
  out.push(await measure('지형만 끔', () => { terr.visible = false; }, () => { terr.visible = true; }));
  const trees = kids.find(o => o.userData.placeOn);
  out.push(await measure('나무만 끔', () => { trees.visible = false; }, () => { trees.visible = true; }));
  out.push(await measure('차 끔', () => { v.cars.forEach(c => c.mesh.visible = false); }, () => { v.cars.forEach(c => c.mesh.visible = true); }));
  out.push(await measure('효과 끔', () => { v.fx.smoke.visible = false; v.fx.sk.visible = false; v.fx.spark.visible = false; }, () => { v.fx.smoke.visible = true; v.fx.sk.visible = true; v.fx.spark.visible = true; }));
  out.push(await measure('안개 끔', () => { g._fog = sc.fog; sc.fog = null; }, () => { sc.fog = g._fog; }));
  out.push(await measure('반사맵 끔', () => { g._env = sc.environment; sc.environment = null; }, () => { sc.environment = g._env; }));
  out.push(await measure('모두 끔', () => { sc.children.forEach(o => { o.userData._v = o.visible; o.visible = false; }); }, () => { sc.children.forEach(o => { o.visible = o.userData._v; }); }));
  return out;
});
console.log(q, r.join(' | '));
await b.close();
