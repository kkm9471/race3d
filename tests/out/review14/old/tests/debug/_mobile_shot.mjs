// 휴대폰 흉내 화면과 PC 화면에서 첫 화면 안내 확인
import puppeteer, { KnownDevices } from 'puppeteer-core';
const BASE = process.env.BASE || 'http://localhost:8790/';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11'] });
for (const [name, dev] of [['phone', KnownDevices['iPhone 13']], ['pc', null]]) {
  const p = await b.newPage();
  if (dev) await p.emulate(dev); else await p.setViewport({ width: 1280, height: 800 });
  await p.goto(BASE + 'index.html?q=low', { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 2500));
  const vis = await p.evaluate(() => !document.getElementById('m-mobile').classList.contains('hidden'));
  console.log(name, '안내 보임:', vis);
  await p.screenshot({ path: `tests/out/menu_${name}.png` });
  await p.close();
}
await b.close();
