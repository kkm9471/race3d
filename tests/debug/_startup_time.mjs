// 첫 화면 단추가 동작하기까지 걸리는 시간(모듈을 다 불러와 main.js 가 실행되는 순간) 재기
import puppeteer from 'puppeteer-core';
const BASE = process.env.BASE || 'http://127.0.0.1:8790/';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11'] });
for (let k = 0; k < 2; k++) {
  const p = await b.newPage();
  const t0 = Date.now();
  await p.goto(BASE + 'index.html?q=low&x=' + k, { waitUntil: 'domcontentloaded' });
  const tDom = Date.now() - t0;
  await p.waitForFunction(() => typeof window.__version === 'string' || document.getElementById('m-solo').onclick, { timeout: 30000 });
  console.log(`${k ? '두 번째(캐시)' : '처음'}: 문서 ${tDom}ms, 단추 동작까지 ${Date.now() - t0}ms`);
  await p.close();
}
await b.close();
