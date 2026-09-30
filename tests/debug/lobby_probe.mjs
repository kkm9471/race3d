import puppeteer from 'puppeteer-core';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const BASE = process.env.BASE || 'https://kkm9471.github.io/race3d/';
const R = 'P' + Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, 'Q');
const pages = [];
for (const [i, q] of [`&autostart=2&track=city&laps=2`, ``].entries()) {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'lp-')), args: ['--use-angle=d3d11'] });
  const p = await b.newPage(); p.b = b;
  p.on('console', m => { if (/error|warn/i.test(m.type())) console.log(i, '[c]', m.text().slice(0, 200)); });
  p.on('pageerror', e => console.log(i, '[pageerror]', e.message));
  await p.goto(`${BASE}index.html?auto=${R}&name=P${i}&bot=1&ready=1&q=low${q}`, { waitUntil: 'load' });
  pages.push(p);
  await new Promise(r => setTimeout(r, 1500));
}
await new Promise(r => setTimeout(r, 8000));
for (const [i, p] of pages.entries()) {
  const s = await p.evaluate(() => ({ lobby: window.__app.lobby, me: window.__app.myId, game: !!window.__game && !!window.__app.game, msg: document.getElementById('l-msg').textContent, mmsg: document.getElementById('m-msg').textContent, raced: window.__app.raced, v: window.__version }));
  console.log(i, JSON.stringify(s).slice(0, 700));
}
for (const p of pages) await p.b.close();
