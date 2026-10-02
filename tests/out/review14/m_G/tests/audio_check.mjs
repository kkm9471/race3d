// 소리 파형 검사 — 귀로 못 들으니 실제 크롬에서 소리 크기(RMS)를 재서 확인한다
// 사용법: node tests/audio_check.mjs   (로컬 웹서버 tools/serve.mjs 8790 필요, BASE 로 바꿀 수 있음)
import puppeteer from 'puppeteer-core';
const BASE = process.env.BASE || 'http://127.0.0.1:8790/';
const b = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto(BASE + 'index.html?q=low', { waitUntil: 'load' });
const r = await p.evaluate(async () => {
  const { EngineAudio } = await import('./src/audio/engine.js');
  const { CARS } = await import('./src/sim/cars.js');
  const a = new EngineAudio();
  a.on = true; a.ensure(); await a.ctx.resume();
  a.start([CARS[1], CARS[2]], 0);
  const an = a.ctx.createAnalyser(); an.fftSize = 2048; a.master.connect(an);
  const buf = new Float32Array(an.fftSize);
  const rms = () => { an.getFloatTimeDomainData(buf); let s = 0; for (const x of buf) s += x * x; return Math.sqrt(s / buf.length); };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const car = (px) => ({ st: { rpm: 3000, thr: 0.5, shiftT: 0, px, pz: 0 }, out: { speed: 20, wheels: [] } });
  const sim = { cars: [car(0), car(5)] };
  const tick = async (ms) => { const end = performance.now() + ms; while (performance.now() < end) { a.update(sim, 0); await wait(16); } };
  const avg = async (ms) => { let s = 0, n = 0; const end = performance.now() + ms; while (performance.now() < end) { a.update(sim, 0); s += rms(); n++; await wait(16); } return s / n; };
  await tick(600);
  const base = await avg(300);
  // 1) 부딪힘: 직후 커졌다가 0.5초 안에 원래대로
  a.hit({ t: 'car', vn: 12, a: 0, b: 1, x: 2, z: 0 }, sim, 0);
  const hitPeak = await avg(90);
  await tick(500);
  const afterHit = await avg(200);
  // 2) 변속: 도는 동안 엔진 소리가 줄었다가 돌아온다
  sim.cars[0].st.shiftT = 0.3;
  await tick(200);
  const shifting = await avg(150);
  sim.cars[0].st.shiftT = 0;
  await tick(400);
  const afterShift = await avg(200);
  // 3) 연타: 같은 순간 10번 → 한 번만 울림 (lastHit 이 한 번만 바뀜)
  a.lastHit = 0;
  let plays = 0;
  for (let i = 0; i < 10; i++) { const before = a.lastHit; a.hit({ t: 'wall', vn: 8, a: 0, b: undefined, x: 0, z: 0 }, sim, 0); if (a.lastHit !== before) plays++; }
  // 4) 멀리서 남끼리 부딪힘 → 소리 없음
  await tick(300);
  const lh = a.lastHit;
  a.hit({ t: 'car', vn: 15, a: 1, b: 2, x: 300, z: 0 }, sim, 0);
  const farPlayed = a.lastHit !== lh;
  // 5) 소리 끔이면 부딪힘도 안 남
  a.toggle();
  const lh2 = a.lastHit; await wait(100);
  a.hit({ t: 'car', vn: 15, a: 0, b: 1, x: 0, z: 0 }, sim, 0);
  const mutedPlayed = a.lastHit !== lh2;
  a.toggle(); a.stop();
  return { base, hitPeak, afterHit, shifting, afterShift, plays, farPlayed, mutedPlayed };
});
let fail = 0;
const ok = (c, m) => { console.log(`  ${c ? '✅' : '❌'} ${m}`); if (!c) fail++; };
const f = x => x.toFixed(4);
console.log('[소리 파형]');
ok(r.base > 0.005, `엔진 소리 난다 (RMS ${f(r.base)})`);
ok(r.hitPeak > r.base * 1.5, `부딪힌 직후 커짐 ${f(r.base)} → ${f(r.hitPeak)}`);
ok(Math.abs(r.afterHit - r.base) < r.base * 0.3, `0.5초 뒤 원래대로 ${f(r.afterHit)}`);
ok(r.shifting < r.base * 0.6, `변속 중 엔진 소리 줄어듦 ${f(r.shifting)}`);
ok(Math.abs(r.afterShift - r.base) < r.base * 0.3, `변속 끝나면 돌아옴 ${f(r.afterShift)}`);
ok(r.plays === 1, `같은 순간 10번 부딪혀도 소리는 ${r.plays}번`);
ok(!r.farPlayed, '300m 밖 남끼리 부딪힘은 소리 없음');
ok(!r.mutedPlayed, '소리 끔이면 부딪힘 소리도 없음');
ok(errs.length === 0, `페이지 오류 없음 ${errs.slice(0, 3).join(' / ')}`);
console.log(fail ? `실패 ${fail}개` : '전부 통과');
await b.close();
process.exit(fail ? 1 : 0);
