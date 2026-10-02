import { CARS } from '../../web/src/sim/cars.js';
import { Car as NewCar } from '../../web/src/sim/car.js';
import { Car as OldCar } from './_oldsim/car.js';
import { pack } from '../../web/src/sim/input.js';
import { FlatWorld, frame, beta, FPS } from '../physics_report.mjs';
const spec = CARS[0];
const mk = C => { const c = new C(spec); c.place(0, spec.cgH + 0.03, 0, 0); const w = new FlatWorld();
  for (let i = 0; i < 60; i++) frame(c, w, pack({ kb: 0 }), true); for (let i = 0; i < 30; i++) frame(c, w, pack({ kb: 0 })); return { c, w }; };
const kmh = c => c.out.speed * 3.6;
// A) 톡 드리프트 자연 종료(가속 계속) → 끝난 뒤 0.1초 안에 뗐다 다시 누름 → 순간부스터?
{
  const { c, w } = mk(NewCar); c.setSpeed(120 / 3.6);
  for (let f = 0; f < 8; f++) frame(c, w, pack({ thr: 1, steer: 1, hb: 1, kb: 1 }));
  let endF = -1, got = -1;
  for (let f = 0; f < 200; f++) {
    let thr = 1;
    if (endF >= 0 && f >= endF + 2 && f < endF + 4) thr = 0;
    frame(c, w, pack({ thr, kb: 1 }));
    if (endF < 0 && !c.st.drift) endF = f;
    if (got < 0 && c.st.boostT > 0) got = f;
  }
  console.log(`[A 톡 자연종료 뒤 뗐다 누름] 끝 f${endF} 순간부스터 f${got}`);
}
// B) 톡 드리프트 도중(펴지기 전) 가속 키를 0.1초만 뗌 → 각도·종료 시각 변화
for (const relAt of [-1, 20, 40]) {
  const { c, w } = mk(NewCar); c.setSpeed(120 / 3.6);
  for (let f = 0; f < 8; f++) frame(c, w, pack({ thr: 1, steer: 1, hb: 1, kb: 1 }));
  let endF = -1, mb = 0;
  for (let f = 0; f < 400; f++) { frame(c, w, pack({ thr: relAt >= 0 && f >= relAt && f < relAt + 6 ? 0 : 1, kb: 1 })); mb = Math.max(mb, Math.abs(beta(c))); if (endF < 0 && !c.st.drift) endF = f; }
  console.log(`[B 톡 뒤 가속 0.1초 뗌 @${relAt}] 끝 f${endF} 최대beta ${mb.toFixed(1)}`);
}
// C) Shift 계속 원 30초: 새 vs 옛 (부스터 얻은 수, 속도)
for (const [nm, C] of [['새', NewCar], ['옛', OldCar]]) {
  const { c, w } = mk(C); c.setSpeed(150 / 3.6);
  let got = 0, prev = 0;
  for (let f = 0; f < FPS * 30; f++) { frame(c, w, pack({ thr: 1, steer: 1, hb: 1, kb: 1 })); if (c.st.boosts > prev) got++; if (c.st.boosts === 2) c.st.boosts = 0; prev = c.st.boosts; }
  console.log(`[C ${nm} Shift 30초 원] drift ${c.st.drift} 속도 ${kmh(c).toFixed(0)} beta ${beta(c).toFixed(0)} 부스터 ${got}`);
}
// D) 직선 지그재그 순간부스터: 100km/h 출발, 10초 동안 z 진행 (새)
{
  const run = mode => {
    const { c, w } = mk(NewCar); c.setSpeed(100 / 3.6);
    let dir = 1, ph = 0, k = 0, inst = 0, hdg = 0;
    for (let f = 0; f < FPS * 10; f++) {
      let inp = { thr: 1, kb: 1 };
      if (mode) {
        if (ph === 0 && c.st.instT <= 0 && c.st.boostT <= 0 && c.out.fwd < c.P.vtop * 0.88 && !c.st.drift && c.st.gripT > 0.3) { ph = 1; k = 0; }
        if (ph === 1) { inp = { thr: 1, steer: dir, hb: 1, kb: 1 }; if (++k >= 3) { ph = 2; } }
        else if (ph === 2) { inp = { thr: Math.abs(beta(c)) < 10 ? 0 : 1, steer: -dir, kb: 1 }; if (!c.st.drift) ph = 3; }
        else if (ph === 3) { inp = { thr: 1, kb: 1 }; ph = 0; dir = -dir; if (c.st.boostT > 0) inst++; }
        // 방향 바로잡기: 드리프트 아닐 때 가는 방향을 +z 로
        if (ph === 0) { const a = Math.atan2(c.st.vx, c.st.vz); inp.steer = Math.max(-1, Math.min(1, a * 4)); }
      }
      frame(c, w, pack(inp));
    }
    return `z ${c.st.pz.toFixed(0)}m x ${c.st.px.toFixed(0)} 속도 ${kmh(c).toFixed(0)} 순간부스터 ${inst}`;
  };
  console.log(`[D 직선] 그냥 ${run(0)} / 지그재그 ${run(1)}`);
}
