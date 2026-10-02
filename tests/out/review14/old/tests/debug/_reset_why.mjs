// 봇 4대 레이스에서 되돌리기 직전 상황
import { Sim, FPS, GO_FRAME } from '../../web/src/sim/race.js';
import { CARS } from '../../web/src/sim/cars.js';
for (const t of ['circuit', 'mountain', 'city']) for (const me of ['masil', 'baram', 'cheondung']) {
  const at = CARS.findIndex(c => c.id === me), pool = [...CARS.slice(at + 1), ...CARS.slice(0, at)];
  const players = [{ car: me, name: 'me', bot: true, botSkill: 0.95 }];
  for (let i = 0; i < 3; i++) players.push({ car: pool[i].id, name: 'AI' + i, bot: true, botSkill: 0.86 + i * 0.03 });
  const sim = new Sim({ track: t, laps: 2, players });
  const hist = sim.cars.map(() => []);
  while (!sim.gs.over && sim.gs.frame < FPS * 400) {
    sim.step([0, 0, 0, 0]);
    sim.cars.forEach((c, k) => { hist[k].push({ f: sim.gs.frame, v: c.out.speed * 3.6, drift: c.st.drift, boost: c.st.boostT > 0, off: c.st.off, flip: c.st.flipT, car: sim.events.some(e => e.t === 'car' && (e.a === k || e.b === k)), wall: sim.events.some(e => e.t === 'wall' && e.a === k) }); if (hist[k].length > 180) hist[k].shift(); });
    for (const e of sim.events) if (e.t === 'reset') {
      const h = hist[e.a].slice(0, -1);
      const carHit = h.some(x => x.car), wallHit = h.some(x => x.wall), drift = h.some(x => x.drift), minV = Math.min(...h.slice(-60).map(x => x.v));
      const L = h.slice(-40).filter((x, q) => q % 8 === 0).map(x => `${x.v.toFixed(0)}${x.drift ? 'D' : ''}${x.boost ? 'B' : ''}${x.wall ? 'W' : ''}${x.car ? 'C' : ''}(${x.off.toFixed(1)})`).join(' ');
      console.log(`${t}/${me} 자리${e.a} 직전 0.67초: ${L} | ${((sim.gs.frame - GO_FRAME) / FPS).toFixed(1)}s 직전3초: 차충돌 ${carHit} 벽 ${wallHit} 드리프트 ${drift} 마지막1초 최저속도 ${minV.toFixed(0)} 가로 ${h[h.length - 1].off.toFixed(1)}`);
    }
  }
}
