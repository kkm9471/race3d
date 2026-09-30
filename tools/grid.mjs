// 여러 캡처를 한 장으로: node tools/grid.mjs 출력.png 열수 a.png b.png ...
import puppeteer from 'puppeteer-core';
import path from 'node:path';
const [outp, cols, ...files] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--allow-file-access-from-files'] });
const p = await b.newPage();
await p.setViewport({ width: 1920, height: 1080 });
const src = f => 'file:///' + path.resolve(f).split(path.sep).join('/');
await p.goto(src(files[0]).replace(/[^/]+$/, ''));
await p.setContent(`<body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(${cols},1fr);gap:4px">${files.map(f => `<img src="${src(f)}" style="width:100%">`).join('')}</body>`);
await new Promise(r => setTimeout(r, 800));
await p.screenshot({ path: outp, fullPage: true });
await b.close();
