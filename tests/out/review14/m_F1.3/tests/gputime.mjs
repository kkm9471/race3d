// GPU 시간 측정 — 한 프레임을 그리는 데 그래픽카드가 실제로 쓴 시간(ms)
// EXT_disjoint_timer_query_webgl2 로 잰다. 사무실 내장그래픽 추정에 쓴다.
// 사용법: node tests/gputime.mjs [품질] [트랙] [가로x세로]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const [q = 'medium', track = 'circuit', size = '1920x1080'] = process.argv.slice(2);
const [W, H] = size.split('x').map(Number);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--no-sandbox', `--window-size=${W},${H}`, '--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-webgl-draft-extensions', '--enable-privileged-webgl-extensions'],
  defaultViewport: { width: W, height: H } });
const p = await b.newPage();
await p.goto(`http://127.0.0.1:8790/index.html?solo=1&track=${track}&car=baram&bots=3&bot=1&q=${q}&noscale=1&laps=5`, { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 7000));
const r = await p.evaluate(async () => {
  const g = window.__gfx, gl = g.renderer.getContext();
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  if (!ext) return { err: 'no timer ext' };
  const times = [];
  const orig = g.render.bind(g);
  let pending = [];
  g.render = function () {
    const qq = gl.createQuery();
    gl.beginQuery(ext.TIME_ELAPSED_EXT, qq);
    orig();
    gl.endQuery(ext.TIME_ELAPSED_EXT);
    pending.push(qq);
    pending = pending.filter(x => {
      if (!gl.getQueryParameter(x, gl.QUERY_RESULT_AVAILABLE)) return true;
      if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) times.push(gl.getQueryParameter(x, gl.QUERY_RESULT) / 1e6);
      gl.deleteQuery(x); return false;
    });
  };
  await new Promise(r => setTimeout(r, 20000));
  g.render = orig;
  times.sort((a, b) => a - b);
  const i = g.info();
  return { n: times.length, avg: times.reduce((s, x) => s + x, 0) / times.length, p50: times[Math.floor(times.length / 2)], p99: times[Math.floor(times.length * 0.99)], calls: i.calls, tris: i.tris };
});
console.log(q, track, size, JSON.stringify(r));
fs.appendFileSync('tests/out/gputime.md', `| ${q} | ${track} | ${size} | ${r.avg?.toFixed(2)} | ${r.p99?.toFixed(2)} | ${r.n} |\n`);
await b.close();
