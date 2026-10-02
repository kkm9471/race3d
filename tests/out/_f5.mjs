import { Sim, FPS, GO_FRAME } from '../../web/src/sim/race.js';
import { CARS } from '../../web/src/sim/cars.js';
const me = 'masil', at = CARS.findIndex(c => c.id === me), pool = [...CARS.slice(at + 1), ...CARS.slice(0, at)];
const players = [{ car: me, name: 'me', bot: true, botSkill: 0.95 }];
for (let i = 0; i < 3; i++) players.push({ car: pool[i].id, name: 'AI' + i, bot: true, botSkill: 0.86 + i * 0.03 });
const sim = new Sim({ track: 'forest', laps: 1, players });
const T = sim.T;
while (sim.gs.frame < GO_FRAME + FPS * 21) {
  sim.step(players.map(() => 0));
  const t = (sim.gs.frame - GO_FRAME) / FPS;
  if (t >= 11.5 && sim.gs.frame % 15 === 0) {
    const row = [1, 3].map(k => { const s = sim.cars[k].st, o = sim.cars[k].out; return `차${k} s${(s.hint * T.ds).toFixed(0)} off${(s.off || 0).toFixed(1)} ${(o.speed * 3.6).toFixed(0)}km/h 드리프트${s.drift} 정렬${s.alT > 0 ? 1 : 0} 접지${s.gripT.toFixed(2)} 부스터${s.boostT > 0 ? 1 : 0} 핸들${s.steer.toFixed(2)}`; });
    console.log(t.toFixed(2), row.join(' | '), sim.events.some(e => e.t === 'car') ? '접촉' : '');
  }
}
