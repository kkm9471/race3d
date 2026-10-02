// 봇 주행 시험: 트랙마다 차 10종이 혼자 3바퀴 → 랩타임·벽 충돌·되돌리기·최고속도
// 사용법: node tests/laps.mjs [트랙id] [차id]
import fs from 'node:fs';
import { Sim, FPS, GO_FRAME } from '../web/src/sim/race.js';
import { CARS } from '../web/src/sim/cars.js';
import { TRACK_DEFS } from '../web/src/sim/tracks.js';

const [onlyTrack, onlyCar] = process.argv.slice(2);
const fmt = f => { const s = f / FPS; return `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, '0')}`; };

export function soloRun(track, car, laps = 3, skill = 0.95) {
  const sim = new Sim({ track, laps, players: [{ car, name: 'bot', bot: true, botSkill: skill }] });
  let walls = 0, resets = 0, vmax = 0, bigWall = 0, maxOff = 0;
  const c = sim.cars[0];
  while (!sim.gs.over && sim.gs.frame < 60 * FPS * 8) {
    sim.step([0]);
    for (const e of sim.events) {
      if (e.t === 'wall') { walls++; if (e.vn > 5) bigWall++; }
      if (e.t === 'reset') resets++;
    }
    vmax = Math.max(vmax, c.out.speed * 3.6);
    if (sim.gs.frame > GO_FRAME) maxOff = Math.max(maxOff, Math.abs(c.st.off));
    if (c.st.fin) break;
  }
  const st = c.st;
  const lts = [];
  for (let q = 0; q < laps; q++) lts.push(st['lt' + q]);
  return { fin: st.fin, lts, best: st.best, walls, bigWall, resets, vmax, maxOff, frames: sim.gs.frame };
}

if ((process.argv[1] || '').replace(/\\/g, '/').endsWith('tests/laps.mjs')) {
  const t0 = Date.now();
  const lines = [];
  for (const def of TRACK_DEFS) {
    if (onlyTrack && def.id !== onlyTrack) continue;
    lines.push(`\n## ${def.name}`);
    lines.push('| 차 | 1랩 | 2랩 | 3랩 | 최고 km/h | 벽 접촉(강) | 되돌리기 | 최대 이탈 m |');
    lines.push('|---|---|---|---|---|---|---|---|');
    for (const car of CARS) {
      if (onlyCar && car.id !== onlyCar) continue;
      const r = soloRun(def.id, car.id);
      lines.push(`| ${car.name}(${car.cls}) | ${r.lts.map(x => x ? fmt(x) : '-').join(' | ')} | ${r.vmax.toFixed(0)} | ${r.walls}(${r.bigWall}) | ${r.resets} | ${r.maxOff.toFixed(1)} |`);
      console.log(lines[lines.length - 1]);
    }
  }
  console.log(`(${((Date.now() - t0) / 1000).toFixed(1)}초)`);
  fs.mkdirSync('tests/out', { recursive: true });
  if (!onlyTrack && !onlyCar) fs.writeFileSync('tests/out/laps.md', `# 봇 랩타임 (${new Date().toISOString()})\n${lines.join('\n')}\n`);
}
