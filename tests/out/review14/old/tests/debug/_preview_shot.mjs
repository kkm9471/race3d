// 대기실 차 미리보기 확인: 첫 화면 → 혼자 연습 대기실, 차 두 대 고르고 끌어서 돌린 뒤 찍기
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11', '--window-size=1600,1000'], defaultViewport: { width: 1600, height: 1000 } });
const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
await p.goto('http://127.0.0.1:8790/index.html?q=medium', { waitUntil: 'load' });
await p.type('#m-name', '나');
await p.click('#m-solo');
await new Promise(r => setTimeout(r, 2500));
await p.screenshot({ path: 'tests/out/preview_1.png' });
const btns = await p.$$('#l-cars .carbtn');
await btns[6].click();                    // 스칼렛 블레이드
await new Promise(r => setTimeout(r, 800));
const box = await (await p.$('#l-preview')).boundingBox();
await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await p.mouse.down(); await p.mouse.move(box.x + box.width / 2 + 160, box.y + box.height / 2 - 20, { steps: 8 }); await p.mouse.up();
await new Promise(r => setTimeout(r, 500));
await p.screenshot({ path: 'tests/out/preview_2.png' });
console.log('오류', errs.slice(0, 5));
await b.close();
