import puppeteer from 'puppeteer-core';
const WS = 'ws://127.0.0.1:8797/ws', room = 'D' + Math.random().toString(36).slice(2, 5).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11'] });
const p = await b.newPage(); const logs = [];
p.on('pageerror', e => logs.push('ERR ' + e.message));
await p.goto(`http://127.0.0.1:8790/index.html?q=low&auto=${room}&name=a&ws=${encodeURIComponent(WS)}`, { waitUntil: 'load' });
await p.waitForFunction(() => document.getElementById('l-conn').textContent === '연결됨', { timeout: 15000 });
console.log(await p.evaluate(async () => {
  const bs = [...document.querySelectorAll('#l-tracks button')];
  const info = bs.map(b => b.textContent + (b.disabled ? '(막힘)' : ''));
  bs[5].click();
  await new Promise(r => setTimeout(r, 1500));
  return { info, after: document.getElementById('l-tp-name').textContent, sel: document.querySelector('#l-tracks .sel')?.textContent };
}));
console.log(logs.join('\n'));
await b.close();
