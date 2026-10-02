// 회귀 시험 — 독립 검증이 찾은 버그·사용자가 정한 손맛이 다시 깨지지 않는지 (2026-10-02 카트식으로 바뀌며 실제 차 물리 항목은 뺐다)
import { CARS } from '../web/src/sim/cars.js';
import { newCar, frame, FPS } from './physics_report.mjs';
import { pack } from '../web/src/sim/input.js';
import { Sim } from '../web/src/sim/race.js';

let fail = 0;
const ok = (c, m) => { console.log(`  ${c ? '✅' : '❌'} ${m}`); if (!c) fail++; };

// 0) 상태·해시에 숫자가 아닌 값(없는 값·NaN)이 없다 — NaN 은 비트 모양이 V8 버전·최적화 단계마다 달라
//    세 화면 해시가 어긋난다 (2026-10-02 카트식 전환 때 없어진 w.abs 를 해시에 넣어 실제로 생겼다)
console.log('[상태는 전부 유한한 숫자]');
{
  const sim = new Sim({ track: 'circuit', laps: 1, players: [{ car: 'masil', bot: true }, { car: 'baram', bot: true }, { car: 'yuseong' }] });
  const bad = new Set();
  for (let f = 0; f < FPS * 30; f++) {
    sim.step([0, 0, pack({ thr: 1, steer: (f % 120) < 60 ? 1 : -1, hb: f % 90 < 40 ? 1 : 0, bo: f % 200 === 0 ? 1 : 0, kb: 1 })]);
    for (const c of sim.cars) {
      for (const k in c.st) { const v = c.st[k]; if (k !== 'w' && !Number.isFinite(v)) bad.add(k); }
      for (const w of c.st.w) for (const k in w) if (!Number.isFinite(w[k])) bad.add('w.' + k);
    }
  }
  const src = (await import('node:fs')).readFileSync(new URL('../web/src/sim/race.js', import.meta.url), 'utf8');
  const hashed = [...src.matchAll(/hnum\(h, w\.(\w+)\)/g)].map(m => m[1]).filter(k => !(k in sim.cars[0].st.w[0]));
  ok(bad.size === 0 && hashed.length === 0, `숫자가 아닌 상태 ${[...bad].join(',') || '없음'} · 해시가 읽는데 없는 바퀴 값 ${hashed.join(',') || '없음'}`);
}

// 0-2) 길 위 어디에도 보이지 않는 벽이 없다 — 차를 길 위 곳곳(분리대 자리 빼고)에 세워 실제 벽 충돌 코드로 확인
//      (분리대 끝에서 위치가 0 과 섞여 길 한가운데에 벽이 생긴 적이 있다 — 2026-10-02)
console.log('[길 위 보이지 않는 벽 없음]');
{
  const { TRACK_DEFS } = await import('../web/src/sim/tracks.js');
  const { collideWall } = await import('../web/src/sim/collide.js');
  const { datan2 } = await import('../web/src/sim/dmath.js');
  for (const def of TRACK_DEFS) {
    const sim = new Sim({ track: def.id, laps: 1, players: [{ car: 'masil' }] });
    const T = sim.T, c = sim.cars[0], R = new Float64Array(9);
    let bad = 0, first = '';
    // 분리대 끝 근처(±8샘플)는 샘플 사이도 0.25 간격으로 (벽이 샘플 사이에만 얇게 생길 수 있다)
    const nearEnd = i => [...Array(17).keys()].some(q => { const k = (i + q - 8 + T.n) % T.n, k2 = (k + 1) % T.n; return (T.divW[k] > 0) !== (T.divW[k2] > 0); });
    for (let i = 0; i < T.n; i += 1) {
     const fine = nearEnd(i);
     if (!fine && i % 2) continue;
     for (const tt of fine ? [0, 0.25, 0.5, 0.75] : [0]) {
      const i2 = (i + 1) % T.n;
      for (let d = -T.hw[i] + 1.6; d <= T.hw[i] - 1.6; d += fine ? 0.4 : 1.2) {
        // 급커브에선 차 앞뒤 모서리가 옆으로 더 나가 분리대에 정상적으로 닿는다(반지름 22m 에서 약 0.5m) → 제외 폭을 곡률만큼 넓힌다 (14회차)
        const kx = Math.abs(T.k[i]) * 12;
        if (T.divW[i] > 0 && Math.abs(d - T.div[i]) < T.divW[i] + 1.4 + kx) continue;
        const near = [-3, -2, -1, 1, 2, 3].some(q => T.divW[(i + q + T.n) % T.n] > 0 && Math.abs(d - T.div[(i + q + T.n) % T.n]) < 1.6 + kx);
        if (near) continue;
        const cx = T.x[i] + (T.x[i2] - T.x[i]) * tt, cz = T.z[i] + (T.z[i2] - T.z[i]) * tt;
        const x = cx + T.lx[i] * d, z = cz + T.lz[i] * d;
        c.place(x, T.y[i] + 1, z, datan2(T.tx[i], T.tz[i]));
        c.st.hint = i;
        c.axes(R);
        collideWall(c, R, sim.world, null);
        if (Math.abs(c.st.px - x) > 1e-9 || Math.abs(c.st.pz - z) > 1e-9) { bad++; if (!first) first = `${(i * T.ds).toFixed(0)}m d=${d.toFixed(1)}`; }
      }
     }
    }
    ok(bad === 0, `${def.name}: 밀려난 자리 ${bad}곳 ${first}`);
  }
}

// 1) 카트식 손맛 (2026-10-02 사용자 요구: 카트라이더처럼 — 액셀 떼면 확 줄고, Shift 떼면 바로 펴지고, 순간부스터)
console.log(fail?'FAIL '+fail:'ALLPASS')
