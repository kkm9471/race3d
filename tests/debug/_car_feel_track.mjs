// 실제 트랙에서 차마다 드리프트 비교: AI 로 달리다가 여러 지점에서 같은 '톡'·'풀' 드리프트를 걸고
// 머리 회전 속도의 프레임 간 흔들림(예민함)·최대 회전 속도·바퀴가 뜬 비율·미끄럼각 최대를 잰다
import { Sim, FPS } from '../../web/src/sim/race.js';
import { botInput } from '../../web/src/sim/bot.js';
import { pack } from '../../web/src/sim/input.js';
import { CARS } from '../../web/src/sim/cars.js';
const tracks = (process.argv[2] || 'village,circuit,forest,desert').split(',');
const ids = (process.argv[3] || 'hwasal,baram,masil,yuseong').split(',');
const head = c => { const a = c.axes([]); return Math.atan2(a[6], a[8]) * 180 / Math.PI; };
for (const id of ids) {
  const spec = CARS.find(c => c.id === id);
  let J = 0, PK = 0, L = 0, N = 0, NB = 0, BMAX = 0, runs = 0;
  for (const tr of tracks) for (const startF of [420, 600, 780, 960, 1140]) for (const kind of ['tap', 'full']) {
    const sim = new Sim({ track: tr, laps: 3, players: [{ car: id }] });
    const mem = { stuckT: 0 };
    for (let f = 0; f < startF; f++) sim.step([botInput(sim, 0, 0.9, mem)]);
    const c = sim.cars[0]; let ph = head(c), pr = 0, j = 0, pk = 0, lost = 0, n = 0, bmax = 0;
    for (let k = 0; k < 90; k++) {
      const steer = kind === 'tap' ? (k < 8 ? 1 : 0) : (k < 42 ? 1 : k < 57 ? 0 : -1);
      const hb = kind === 'tap' ? (k < 8 ? 1 : 0) : (k < 42 ? 1 : 0);
      sim.step([pack({ kb: 1, thr: 1, steer, hb })]);
      let d = head(c) - ph; if (d > 180) d -= 360; if (d < -180) d += 360; ph = head(c);
      const rate = d * FPS; pk = Math.max(pk, Math.abs(rate));
      if (k > 2) { j += Math.abs(rate - pr); n++; } pr = rate;
      lost += c.out.wheels.filter(x => !x.contact).length;
      const ax = c.axes([]); const vl = c.st.vx * ax[0] + c.st.vz * ax[2], vf = c.st.vx * ax[6] + c.st.vz * ax[8];
      bmax = Math.max(bmax, Math.abs(Math.atan2(vl, Math.max(Math.abs(vf), 0.5))) * 180 / Math.PI);
    }
    J += j / n; PK += pk; L += lost / (90 * 4); BMAX += bmax; runs++;
  }
  console.log(`${spec.name.padEnd(8)} 흔들림 ${(J / runs).toFixed(1)}°/s/프레임 · 최대 회전 ${(PK / runs).toFixed(0)}°/s · 바퀴 뜸 ${(L / runs * 100).toFixed(1)}% · 최대 미끄럼 ${(BMAX / runs).toFixed(0)}°  (${runs}회)`);
}
