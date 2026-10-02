import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const files = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
for (const f of files) {
  const b64 = fs.readFileSync(f).toString('base64');
  const r = await page.evaluate(async b64 => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(300, 150, 700, 400).data; let s = 0, hi = 0, n = d.length / 4; for (let i = 0; i < d.length; i += 4) { const l = 0.2126 * d[i] + 0.7152 * d[i+1] + 0.0722 * d[i+2]; s += l; if (l > 235) hi++; } return { mean: +(s / n).toFixed(0), over235pct: +(100 * hi / n).toFixed(1) }; }, b64);
  console.log(f.split(/[\/]/).pop(), JSON.stringify(r));
}
await browser.close();
