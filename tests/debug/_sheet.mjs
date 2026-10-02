// 스크린샷 여러 장을 한 장으로: node tests/out/_sheet.mjs 출력.png 열수 파일1 파일2 ...
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
const [out, cols, ...files] = process.argv.slice(2);
const C = +cols, W = 1600, cw = W / C, chh = cw * 9 / 16, rows = Math.ceil(files.length / C);
const imgs = files.map(f => `<div style="position:relative;width:${cw}px;height:${chh}px;float:left"><img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}" style="width:100%;height:100%;object-fit:cover"><span style="position:absolute;left:4px;top:2px;color:#fff;background:#000a;font:14px sans-serif;padding:1px 4px">${path.basename(f, '.png')}</span></div>`).join('');
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const p = await b.newPage();
await p.setViewport({ width: W, height: Math.ceil(rows * chh) });
await p.setContent(`<body style="margin:0;background:#000">${imgs}</body>`);
await p.screenshot({ path: out });
await b.close();
