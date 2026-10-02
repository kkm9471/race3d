// 주행 기록 그래프 — 차 여러 대가 같은 트랙 한 바퀴를 돌 때 거리별 속도·횡가속도 (완성 기준 4의 "주행 기록")
// 사용법: node tests/telemetry.mjs [트랙] → tests/out/telemetry_<트랙>.png
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import { Sim, FPS, GO_FRAME } from '../web/src/sim/race.js';
import { CAR_BY_ID } from '../web/src/sim/cars.js';

const track = process.argv[2] || 'circuit';
const ids = ['kongal', 'masil', 'baram', 'heukmeonji', 'cheondung', 'yuseong'];
const colors = ['#8a8f98', '#3b7dd8', '#e8a317', '#2ca36b', '#d6402b', '#8e44ad'];
const runs = [];
for (const id of ids) {
  const sim = new Sim({ track, laps: 2, players: [{ car: id, bot: true, botSkill: 0.95 }] });
  const c = sim.cars[0];
  const pts = [];
  let lapStartProg = null;
  while (!c.st.fin && sim.gs.frame < FPS * 600) {
    sim.step([0]);
    if (c.st.lap === 1) {        // 2번째 랩(달리는 중 출발)만 기록
      if (lapStartProg === null) lapStartProg = c.st.prog;
      const ax = c.axes([]);
      const alat = (c.st.wy * c.out.fwd);
      pts.push([c.st.prog - lapStartProg, c.out.fwd * 3.6, alat / 9.81]);
    }
  }
  runs.push({ id, name: CAR_BY_ID[id].name, cls: CAR_BY_ID[id].cls, pts, lap: c.st.lt1 / FPS });
  console.log(id, 'lap2', (c.st.lt1 / FPS).toFixed(2), 's', 'vmax', Math.max(...pts.map(p => p[1])).toFixed(0));
}
const L = Math.max(...runs.map(r => r.pts[r.pts.length - 1][0]));
const W = 1400, H = 760, pad = 60, h1 = 420;
const X = d => pad + d / L * (W - pad * 2);
const Y = v => 30 + h1 - v / 360 * h1;
const Y2 = g => h1 + 90 + 120 - g * 80;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="background:#11151c;font-family:Malgun Gothic">`;
for (let v = 0; v <= 350; v += 50) svg += `<line x1="${pad}" x2="${W - pad}" y1="${Y(v)}" y2="${Y(v)}" stroke="#2a3140"/><text x="10" y="${Y(v) + 4}" fill="#8a94a6" font-size="12">${v}</text>`;
for (let g = -1.5; g <= 1.5; g += 0.5) svg += `<line x1="${pad}" x2="${W - pad}" y1="${Y2(g)}" y2="${Y2(g)}" stroke="#2a3140"/><text x="10" y="${Y2(g) + 4}" fill="#8a94a6" font-size="12">${g}g</text>`;
runs.forEach((r, i) => {
  const step = Math.max(1, Math.floor(r.pts.length / 1200));
  let d1 = '', d2 = '';
  r.pts.forEach((p, k) => { if (k % step) return; d1 += (d1 ? 'L' : 'M') + X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); d2 += (d2 ? 'L' : 'M') + X(p[0]).toFixed(1) + ',' + Y2(p[2]).toFixed(1); });
  svg += `<path d="${d1}" fill="none" stroke="${colors[i]}" stroke-width="2"/>`;
  svg += `<path d="${d2}" fill="none" stroke="${colors[i]}" stroke-width="1.2" opacity="0.8"/>`;
  svg += `<text x="${W - pad - 330}" y="${50 + i * 20}" fill="${colors[i]}" font-size="15">■ ${r.name}(${r.cls}) 랩 ${r.lap.toFixed(2)}초</text>`;
});
svg += `<text x="${pad}" y="22" fill="#e6edf3" font-size="16">${track === 'circuit' ? '한빛 서킷' : '안개 고개'} 한 바퀴: 속도(km/h, 위) · 횡가속도(g, 아래) — 가로축 = 출발선부터 거리 ${L.toFixed(0)}m</text>`;
svg += '</svg>';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const pg = await b.newPage();
await pg.setViewport({ width: W, height: H });
await pg.setContent(`<body style="margin:0">${svg}</body>`);
fs.mkdirSync('tests/out', { recursive: true });
await pg.screenshot({ path: `tests/out/telemetry_${track}.png` });
await b.close();
