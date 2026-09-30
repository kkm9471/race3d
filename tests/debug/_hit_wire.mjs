// 실제 레이스에서 부딪힘 → 소리 함수가 불리는지 (서로 안 피하는 자동운전으로 충돌 유도)
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--autoplay-policy=no-user-gesture-required', '--use-angle=d3d11'] });
const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://127.0.0.1:8790/index.html?solo=1&track=mountain&car=masil&bots=3&bot=ram&q=low&noscale=1', { waitUntil: 'load' });
await p.keyboard.press('Shift');   // 소리 켜기용 첫 입력
await new Promise(r => setTimeout(r, 3000));
await p.evaluate(() => { const v = window.__game.view, f = v.onHit; window.__hits = 0; v.onHit = (...a) => { window.__hits++; f(...a); }; const se = window.__game.session, te = se.takeEvents.bind(se); window.__ev = 0; window.__maxvn = 0; se.takeEvents = () => { const e = te(); for (const x of e) if (x.t === 'car' || x.t === 'wall') { window.__ev++; window.__maxvn = Math.max(window.__maxvn, x.vn); } return e; }; });
await new Promise(r => setTimeout(r, 3000));
// 강한 벽 충돌 사건을 하나 넣어 연결(RaceView → onHit → audio.hit)을 확인
await p.evaluate(() => { const st = window.__game.session.sim.cars[0].st; window.__game.session.events.push({ t: 'wall', vn: 10, a: 0, x: st.px, y: st.py, z: st.pz, f: window.__game.session.frame }); });
await new Promise(r => setTimeout(r, 500));
console.log('소리 함수 호출', await p.evaluate(() => [window.__hits, window.__ev, window.__maxvn]), '오류', errs.slice(0, 3));
await b.close();
