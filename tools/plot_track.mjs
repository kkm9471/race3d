// 트랙을 위에서 내려다본 그림(PNG)으로 — 설계가 꼬였는지 눈으로 확인
// 사용법: node tools/plot_track.mjs [트랙id]  → tests/out/track_<id>.png
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import { TRACK_DEFS } from '../web/src/sim/tracks.js';
import { buildTrack } from '../web/src/sim/track.js';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ids = process.argv.slice(2);
fs.mkdirSync('tests/out', { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'shell' });
const page = await browser.newPage();
for (const def of TRACK_DEFS) {
  if (ids.length && !ids.includes(def.id)) continue;
  const T = buildTrack(def);
  const b = T.bounds, pad = 40;
  const W = b.x1 - b.x0 + pad * 2, H = b.z1 - b.z0 + pad * 2;
  const sc = Math.min(1400 / W, 1000 / H);
  const X = x => ((x - b.x0 + pad) * sc).toFixed(1), Z = z => ((z - b.z0 + pad) * sc).toFixed(1);
  const path = (off, side) => {
    let d = '';
    for (let i = 0; i <= T.n; i++) {
      const k = i % T.n;
      const o = typeof off === 'function' ? off(k) : off;
      d += (i ? 'L' : 'M') + X(T.x[k] + T.lx[k] * o * side) + ',' + Z(T.z[k] + T.lz[k] * o * side);
    }
    return d;
  };
  const hmin = b.y0, hmax = b.y1;
  let segs = '';
  for (let i = 0; i < T.n; i++) {
    const j = (i + 1) % T.n;
    const u = hmax > hmin ? (T.y[i] - hmin) / (hmax - hmin) : 0;
    const col = `hsl(${220 - u * 200},80%,45%)`;
    segs += `<line x1="${X(T.x[i])}" y1="${Z(T.z[i])}" x2="${X(T.x[j])}" y2="${Z(T.z[j])}" stroke="${col}" stroke-width="${(T.hw[i] * 2 * sc).toFixed(1)}"/>`;
  }
  let marks = '';
  for (let s = 0; s < T.L; s += 250) {
    const i = Math.floor(s / T.ds);
    marks += `<text x="${X(T.x[i] + T.lx[i] * 14)}" y="${Z(T.z[i] + T.lz[i] * 14)}" font-size="13" fill="#000">${s}</text>`;
  }
  let minR = Infinity;
  for (let i = 0; i < T.n; i++) if (Math.abs(T.k[i]) > 1e-6) minR = Math.min(minR, 1 / Math.abs(T.k[i]));
  let maxG = 0;
  for (let i = 0; i < T.n; i++) maxG = Math.max(maxG, Math.abs(T.grade[i]));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${(W * sc).toFixed(0)}" height="${(H * sc + 40).toFixed(0)}" style="background:#f4f1e8">
    <path d="${path(k => T.wallL[k], 1)}" fill="none" stroke="#c00" stroke-width="1.2"/>
    <path d="${path(k => T.wallR[k], -1)}" fill="none" stroke="#c00" stroke-width="1.2"/>
    ${segs}
    <circle cx="${X(T.x[0])}" cy="${Z(T.z[0])}" r="7" fill="#000"/>
    <line x1="${X(T.x[0])}" y1="${Z(T.z[0])}" x2="${X(T.x[0] + T.tx[0] * 40)}" y2="${Z(T.z[0] + T.tz[0] * 40)}" stroke="#000" stroke-width="3"/>
    ${marks}
    <text x="10" y="${(H * sc + 28).toFixed(0)}" font-size="18">${def.name}: 길이 ${T.L.toFixed(0)} m, 최소반경 ${minR.toFixed(1)} m, 고도 ${hmin.toFixed(0)}~${hmax.toFixed(0)} m, 최대경사 ${(maxG * 100).toFixed(1)}%  (빨강=벽, 색=높이)</text>
  </svg>`;
  await page.setViewport({ width: Math.ceil(W * sc), height: Math.ceil(H * sc + 40) });
  await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  await page.screenshot({ path: `tests/out/track_${def.id}.png` });
  console.log(`${def.id}: L=${T.L.toFixed(0)}m n=${T.n} minR=${minR.toFixed(1)} elev ${hmin.toFixed(1)}~${hmax.toFixed(1)} maxGrade ${(maxG * 100).toFixed(1)}% segs10/17=${def.segs[def.close[0]][1]}`);
}
await browser.close();
