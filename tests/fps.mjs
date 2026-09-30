// fps 실측 — 실제 그래픽카드로 1920×1080, 봇이 운전하는 레이스를 일정 시간 돌리며 프레임 시간을 잰다
// 사용법: node tests/fps.mjs [품질 low|medium|high] [초] [트랙] [cpu배속]
//   cpu배속 4 → CPU 를 4배 느리게(저사양 PC 흉내, 크롬 개발자도구의 CPU 쓰로틀링)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const [q = 'medium', secs = '60', track = 'circuit', cpu = '1'] = process.argv.slice(2);
const BASE = process.env.BASE || 'http://127.0.0.1:8790/';
const b = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--no-sandbox', '--window-size=1920,1080', '--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'],
  defaultViewport: { width: 1920, height: 1080 },
});
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
if (+cpu > 1) { const c = await p.createCDPSession(); await c.send('Emulation.setCPUThrottlingRate', { rate: +cpu }); }
await p.goto(`${BASE}index.html?solo=1&track=${track}&car=baram&bots=3&bot=1&q=${q}&noscale=1&laps=5`, { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 6000));      // 불러오기·출발 대기
await p.evaluate(() => { window.__game.fpsLog.length = 0; });
await new Promise(r => setTimeout(r, +secs * 1000));
const r = await p.evaluate(() => {
  const L = window.__game.fpsLog.slice(1);
  const dts = L.map(x => x.dt).sort((a, b) => a - b);
  const sims = L.map(x => x.sim).sort((a, b) => a - b);
  const cpuT = L.map(x => x.cpu || 0).sort((a, b) => a - b);
  const pct = (a, k) => a[Math.min(a.length - 1, Math.floor(a.length * k))];
  const avg = dts.reduce((s, x) => s + x, 0) / dts.length;
  const i = window.__game ? null : null;
  return {
    frames: L.length, avgFps: 1000 / avg, p99: pct(dts, 0.99), p1Fps: 1000 / pct(dts, 0.99), max: dts[dts.length - 1],
    over33: dts.filter(x => x > 33.4).length, over50: dts.filter(x => x > 50).length,
    simAvg: sims.reduce((s, x) => s + x, 0) / sims.length, simP99: pct(sims, 0.99),
    cpuAvg: cpuT.reduce((s, x) => s + x, 0) / cpuT.length, cpuP99: pct(cpuT, 0.99),
    gpu: window.__gpu, q: window.__qKey, scale: window.__scale,
  };
});
const shotName = `tests/shots/fps_${q}_${track}_cpu${cpu}.png`;
await p.screenshot({ path: shotName });
const line = `| ${q} | ${track} | ${cpu}배 | ${r.avgFps.toFixed(1)} | ${r.p1Fps.toFixed(1)} | ${r.max.toFixed(1)} | ${r.over33} / ${r.over50} | ${r.cpuAvg.toFixed(2)} / ${r.cpuP99.toFixed(2)} | ${r.simAvg.toFixed(2)} | ${r.frames} |`;
console.log(JSON.stringify(r));
console.log(line);
fs.mkdirSync('tests/out', { recursive: true });
fs.appendFileSync('tests/out/fps.md', line + '\n');
if (errs.length) console.log('오류:', errs.slice(0, 5));
await b.close();
