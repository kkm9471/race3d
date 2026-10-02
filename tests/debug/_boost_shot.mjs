// 부스터 화면 확인: 혼자 연습에서 부스터를 하나 주고 Ctrl → 찍기
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11', '--window-size=1600,900'], defaultViewport: { width: 1600, height: 900 } });
const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto('http://127.0.0.1:8790/index.html?solo=1&track=circuit&car=yuseong&bots=2&q=high&noscale=1', { waitUntil: 'load' });
await p.click('canvas').catch(() => {});
await new Promise(r => setTimeout(r, 4500));
await p.keyboard.down('ArrowUp');
await new Promise(r => setTimeout(r, 2500));
await p.evaluate(() => { window.__game.session.sim.cars[0].st.boosts = 1; });
await p.keyboard.down('ControlLeft'); await new Promise(r => setTimeout(r, 120)); await p.keyboard.up('ControlLeft');
await new Promise(r => setTimeout(r, 300));
await p.screenshot({ path: 'tests/out/boost_shot.png' });
console.log('boostT', await p.evaluate(() => window.__game.session.sim.cars[0].st.boostT.toFixed(2)), errs);
await b.close();
