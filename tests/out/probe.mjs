import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox','--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist'], defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:8790/index.html?solo=1&dev=1&track=nymph&bot=1&bots=2', { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 5000));
console.log(await page.evaluate(() => { const g = window.__game; return Object.keys(g).join(',') + ' | view:' + Object.keys(g.view||{}).join(',') ; }));
await browser.close();
