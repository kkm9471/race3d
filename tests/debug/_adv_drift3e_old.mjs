// 실제 트랙 벽에 드리프트로 박기: 새 판 — NaN·회전 폭주·벽 붙어 계속 드리프트
import { Sim, FPS } from './_oldsim/race.js';
import { pack } from './_oldsim/input.js';
import { datan2 } from './_oldsim/dmath.js';
const sim = new Sim({ track: 'circuit', laps: 3, players: [{ car: 'masil' }] });
const T = sim.T, c = sim.cars[0];
for (let f = 0; f < 200; f++) sim.step([pack({ kb: 1 })]);   // 출발 대기 지나기
for (const [i0, side, dir] of [[40, 1, -1], [40, -1, 1], [120, 1, 1], [200, -1, -1]]) {
  const i = i0 % T.n;
  const d = side * (T.hw[i] - 4);
  c.place(T.x[i] + T.lx[i] * d, T.y[i] + c.P.spec.cgH + 0.1, T.z[i] + T.lz[i] * d, datan2(T.tx[i], T.tz[i]));
  c.st.hint = i; for (let q = 0; q < 4; q++) c.st.w[q].hint = i;
  c.setSpeed(140 / 3.6);
  let mwy = 0, mb = 0, hits = 0, bad = '', last = 0, ends = 0, prevD = 0;
  for (let f = 0; f < FPS * 4; f++) {
    sim.step([pack({ thr: 1, steer: f < 40 ? dir : 0, hb: 1, kb: 1 })]);
    for (const k in c.st) if (k !== 'w' && !Number.isFinite(c.st[k])) bad = k;
    mwy = Math.max(mwy, Math.abs(c.st.wy));
    if (c.out.bodyHit) hits++;
    if (prevD && !c.st.drift) ends++; prevD = c.st.drift;
  }
  for (const e of sim.events.splice(0)) if (e.t === 'wall' || e.t === 'hit') last++;
  console.log(`[벽 i${i} 쪽${side} 드리프트${dir}] 최대 회전 ${mwy.toFixed(2)}rad/s 속도 ${(c.out.speed * 3.6).toFixed(0)} drift ${c.st.drift} 끝난 수 ${ends} dB ${c.st.dB.toFixed(2)} nan:${bad} 벽이벤트 ${last}`);
}
