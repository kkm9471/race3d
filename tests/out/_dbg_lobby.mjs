import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11'] });
const p = await b.newPage(); const logs = [];
p.on('pageerror', e => logs.push('ERR ' + e.message)); p.on('console', m => logs.push(m.type() + ' ' + m.text()));
await p.goto('http://127.0.0.1:8790/index.html?q=low&auto=CHAT1&name=a&ws=' + encodeURIComponent('ws://127.0.0.1:8797/ws'), { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 6000));
console.log(await p.evaluate(() => ({ lobby: !document.getElementById('lobby').classList.contains('hidden'), conn: document.getElementById('l-conn').textContent, msg: document.getElementById('m-msg').textContent })));
console.log(logs.filter(l => !l.includes('불러오기 실패')).slice(0, 15).join('\n'));
await b.close();
