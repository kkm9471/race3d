// 점프(공중 약 0.85초) 때 드리프트 단계별: 새 판 vs 옛 판(1a23981)
import { CARS } from '../../web/src/sim/cars.js';
import { Car as NewCar } from '../../web/src/sim/car.js';
import { Car as OldCar } from './_oldsim/car.js';
import { pack } from '../../web/src/sim/input.js';
import { FlatWorld, frame, beta } from '../physics_report.mjs';
const spec = CARS[0];
const mk = C => { const c = new C(spec); c.place(0, spec.cgH + 0.03, 0, 0); const w = new FlatWorld();
  for (let i = 0; i < 60; i++) frame(c, w, pack({ kb: 0 }), true); for (let i = 0; i < 30; i++) frame(c, w, pack({ kb: 0 })); return { c, w }; };
for (const [nm, C] of [['새', NewCar], ['옛', OldCar]]) {
  for (const pre of [12, 24, 42, 90]) {
    for (const hold of [1, 0]) {
      const { c, w } = mk(C); c.setSpeed(150 / 3.6);
      for (let f = 0; f < pre; f++) frame(c, w, pack({ thr: 1, steer: 1, hb: 1, kb: 1 }));
      const b0 = beta(c), wy0 = c.st.wy;
      c.st.vy = 4.2;
      let landed = -1, airF = 0, bL = 0, mb = 0, vmin = 999;
      for (let f = 0; f < 150; f++) {
        const inp = hold ? { thr: 1, steer: 1, hb: 1, kb: 1 } : { thr: 1, kb: 1 };
        frame(c, w, pack(inp));
        if (c.st.air) airF++; else if (landed < 0 && airF > 5) { landed = f; bL = beta(c); }
        if (landed >= 0) { mb = Math.max(mb, Math.abs(beta(c))); vmin = Math.min(vmin, c.out.fwd * 3.6); }
      }
      console.log(`${nm} 진입${pre}프레임 ${hold ? 'Shift+→ 유지' : '키 뗌     '}: 이륙 beta ${b0.toFixed(0)} wy ${wy0.toFixed(2)} → 공중 ${airF}f 착지 beta ${bL.toFixed(0)} 착지후 최대 ${mb.toFixed(0)} 최소 앞속도 ${vmin.toFixed(0)} 끝 drift ${c.st.drift}`);
    }
  }
}
