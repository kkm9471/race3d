// SVG → PNG (크롬): node tests/debug/_svg2png.mjs 입력.svg 출력.png
import puppeteer from 'puppeteer-core';
import path from 'node:path';
const [inp, out] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const p = await b.newPage(); await p.setViewport({ width: 920, height: 920 });
await p.goto('file:///' + path.resolve(inp).split(path.sep).join('/'));
await p.screenshot({ path: out }); await b.close();
