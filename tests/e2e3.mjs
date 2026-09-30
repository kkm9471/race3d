// 크롬 3개(각각 다른 프로필)가 같은 방에서 레이스를 끝까지 — 완성 기준 1·3의 증거
//
// 확인: ① 셋 다 완주 화면까지 간다 ② 세 화면의 순위·기록이 같다
//       ③ 2초마다 찍은 전체 상태 해시(충돌 결과 포함)가 셋 모두 같다
//       ④ 입력 기록을 Node 에서 다시 계산해도 같은 해시 → 브라우저·PC가 달라도 같은 계산
// 사용법: BASE=http://127.0.0.1:8790/ WS=ws://127.0.0.1:8797/ws node tests/e2e3.mjs [트랙] [랩]
//        (WS 를 비우면 web/data/net.json 에 적힌 실제 서버로)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Sim } from '../web/src/sim/race.js';

const BASE = process.env.BASE || 'http://127.0.0.1:8790/';
const WS = process.env.WS ?? 'ws://127.0.0.1:8797/ws';
const [track = 'circuit', laps = '1'] = process.argv.slice(2);
const CODE = process.env.ROOM || ('E' + Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, 'Q'));
const MODE = process.env.MODE || 'gpu';
const out = 'tests/shots';
fs.mkdirSync(out, { recursive: true });
let fail = 0;
const lines = [];
const ok = (c, m) => { const t = `  ${c ? '✅' : '❌'} ${m}`; console.log(t); lines.push(t); if (!c) fail++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const who = [
  { name: '나', car: 'baram', extra: `&autostart=${process.env.NPLAYERS || 3}&track=${track}&laps=${laps}` },
  { name: '동우', car: 'deundeun', extra: '' },
  { name: '여친', car: 'beongae', extra: '' },
];
if (process.env.ONLY2) who.length = 2;       // 외부 시험: 세 번째는 GitHub 클라우드 PC 에서 온다
const browsers = [], pages = [];
const t0 = Date.now();
console.log(`방 ${CODE} · ${track} ${laps}랩 · 서버 ${WS || '(net.json)'}`);
for (const [i, w] of who.entries()) {
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), `race3d-prof${i}-`));
  const args = ['--no-sandbox', '--window-size=960,540', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'];
  if (MODE === 'gpu') args.push('--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist');
  else args.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader');
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', userDataDir: prof, args, defaultViewport: { width: 960, height: 540 } });
  browsers.push(b);
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.errs = errs;
  // 실패한 요청은 주소까지 남긴다 (예전에 원인 모를 503 이 한 번 있었다)
  p.on('response', r => { if (r.status() >= 400) errs.push(`HTTP ${r.status()} ${r.url()}`); });
  p.on('requestfailed', r => errs.push(`요청 실패 ${r.failure()?.errorText} ${r.url()}`));
  const url = `${BASE}index.html?auto=${CODE}&name=${encodeURIComponent(w.name)}&car=${w.car}&bot=1&ready=1&q=low&noscale=1${w.extra}${WS ? '&ws=' + encodeURIComponent(WS) : ''}`;
  await p.goto(url, { waitUntil: 'load' });
  pages.push(p);
  await sleep(i === 0 ? 1500 : 600);
}

// 진행 감시
let shot = false, done = false, lastLog = 0;
const deadline = Date.now() + 12 * 60 * 1000;
while (Date.now() < deadline) {
  await sleep(2000);
  const st = await Promise.all(pages.map(p => p.evaluate(() => ({
    f: window.__game?.session.frame ?? -1, res: !!window.__lastResults,
    rb: window.__game?.session.rollbacks ?? 0, mx: window.__game?.session.maxRollback ?? 0, rtt: window.__game?.net?.rtt ?? 0,
    lap: window.__game ? window.__game.session.sim.cars.map(c => c.st.lap).join('') : '',
  })).catch(() => ({ f: -2 }))));
  if (Date.now() - lastLog > 10000) { console.log('  ', ((Date.now() - t0) / 1000).toFixed(0) + 's', st.map(s => `f${s.f} rb${s.rb}/${s.mx} rtt${Math.round(s.rtt)} lap${s.lap}`).join(' | ')); lastLog = Date.now(); }
  if (!shot && st.every(s => s.f > 60 * 25) && st[0].f < 60 * 40) {
    for (const [i, p] of pages.entries()) await p.screenshot({ path: `${out}/e2e_${i}.png` });
    shot = true;
  }
  if (st.every(s => s.res)) { done = true; break; }
}
ok(done, `세 브라우저 모두 결과 화면까지 (${((Date.now() - t0) / 1000).toFixed(0)}초)`);
const R = await Promise.all(pages.map(p => p.evaluate(() => {
  const L = window.__lastResults;
  return L ? { res: L.res, frame: L.frame, stats: L.stats, ev: L.ev, cfg: L.cfg, local: L.local, sent: L.sent, desync: L.desync, final: L.final, sentInfo: L.sentInfo, netSent: L.netSent, raceSec: L.raceSec } : null;
})));
for (const [i, p] of pages.entries()) await p.screenshot({ path: `${out}/e2e_result_${i}.png` });
if (R.every(Boolean)) fs.writeFileSync('tests/out/e2e_last.json', JSON.stringify(R.map(r => ({ res: r.res, sent: r.sent, stats: r.stats }))));
if (R.every(Boolean)) {
  const fmt = r => r.res.map(x => `${x.name}:${x.fin}`).join(' ');
  ok(R.every(r => fmt(r) === fmt(R[0])), `세 화면의 순위·기록 동일: ${fmt(R[0])}`);
  ok(R.every(r => r.res.every(x => x.fin > 0)), `${R[0].res.length}명 모두 완주`);
  // 해시 비교 (공통 프레임)
  const keys = Object.keys(R[0].sent).filter(k => R.every(r => r.sent[k] !== undefined));
  const same = keys.filter(k => R.every(r => r.sent[k] === R[0].sent[k]));
  ok(keys.length > 5 && same.length === keys.length, `전체 상태 해시 ${keys.length}개 시점에서 세 화면 일치 (${same.length}/${keys.length})`);
  ok(R.every(r => !r.desync), '어긋남 경고 없음');
  // 진단: 보낸 해시가 틀린 곳은 "최종값"과 비교해 보낼 때가 일렀던 것인지(거짓 경보) 계산 자체가 다른지 구분
  const fkeys = Object.keys(R[0].final).filter(k => R.every(r => r.final[k] !== undefined));
  const fsame = fkeys.filter(k => R.every(r => r.final[k] === R[0].final[k])).length;
  ok(fsame === fkeys.length, `레이스 끝 최종 해시 ${fsame}/${fkeys.length} 일치 (진짜 계산 차이가 없다는 뜻)`);
  for (const [i, r] of R.entries()) {
    const bad = Object.keys(r.sent).filter(k => r.final[k] !== undefined && r.sent[k] !== r.final[k]);
    if (bad.length) console.log(`   브라우저${i + 1}: 보낸 뒤 바뀐 해시 ${bad.length}개 예:`, bad.slice(0, 4).map(k => `${k}:${JSON.stringify(r.sentInfo[k])}`).join(' '));
  }
  // Node 재계산
  const cfg = R[0].cfg;
  const sim = new Sim(cfg);
  const ev = R[0].ev;
  const n = cfg.players.length;
  const at = (k, f) => { let v = ev[k][0][1]; for (const [ff, vv] of ev[k]) { if (ff <= f) v = vv; else break; } return v; };
  const nodeHash = {};
  const maxF = Math.max(...keys.map(Number));
  let carHits = 0, wallHits = 0;
  while (sim.gs.frame < maxF) {
    const f = sim.gs.frame;
    sim.step(Array.from({ length: n }, (_, k) => at(k, f)));
    for (const e of sim.events) { if (e.t === 'car') carHits++; if (e.t === 'wall') wallHits++; }
    if (sim.gs.frame % 120 === 0) nodeHash[sim.gs.frame] = sim.hash();
  }
  const nodeSame = keys.filter(k => nodeHash[k] === R[0].sent[k]).length;
  ok(nodeSame === keys.length, `Node 재계산 해시도 일치 ${nodeSame}/${keys.length} (차끼리 충돌 ${carHits}회, 벽 ${wallHits}회 포함)`);
  ok(carHits > 0, `레이스 중 실제로 차끼리 부딪힘 (${carHits}회) — 충돌이 있어도 세 화면 같음`);
  const totalMsgs = R.reduce((a, r) => a + (r.netSent || 0), 0), secs = Math.max(...R.map(r => r.raceSec || 1));
  const t0l = `   서버로 보낸 메시지: 합계 ${totalMsgs}개 / ${secs.toFixed(0)}초 = 초당 ${(totalMsgs / secs).toFixed(1)}개 → 과금 요청 ${(totalMsgs / 20).toFixed(0)}건(20:1) → 무료 10만/일 기준 이런 레이스 하루 ${Math.floor(100000 / (totalMsgs / 20))}판`;
  console.log(t0l); lines.push(t0l);
  for (const [i, r] of R.entries()) {
    const t = `   브라우저${i + 1}(${who[i].name}): 되감기 ${r.stats.rollbacks}번, 최대 ${r.stats.maxRollback}프레임, 재계산 ${r.stats.resim}프레임`;
    console.log(t); lines.push(t);
  }
}
for (const [i, p] of pages.entries()) if (p.errs.length) { console.log(`  브라우저${i + 1} 오류:`, p.errs.slice(0, 5)); }
ok(pages.every(p => !p.errs.some(e => !/X4122|precision/.test(e))), '페이지 오류 없음');
for (const b of browsers) await b.close();
fs.writeFileSync('tests/out/e2e3.md', `# 3인 레이스 시험 (${new Date().toISOString()})\n방 ${CODE}, ${track} ${laps}랩, 서버 ${WS || 'net.json'}\n\`\`\`\n${lines.join('\n')}\n\`\`\`\n`);
console.log(fail ? `\n실패 ${fail}개` : '\n전부 통과');
process.exit(fail ? 1 : 0);
