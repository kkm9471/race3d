// D_PATH(드리프트 중 가는 방향이 휘는 세기)를 바꿔 가며: 톡·짧은(0.3초)·풀 드리프트의 총 회전량, 화면(가는 방향) 최대 회전 속도, U자 시간
import { CARS } from '../../web/src/sim/cars.js';
import { pack } from '../../web/src/sim/input.js';
import { KART } from '../../web/src/sim/car.js';
import { newCar, frame, FPS, fullPlan } from '../physics_report.mjs';
const spec = CARS[1];
const path = c => Math.atan2(c.st.vx, c.st.vz) * 180 / Math.PI;
const turn = plan => {
  const { c, w } = newCar(spec); c.setSpeed(150 / 3.6);
  let pp = path(c), tot = 0, pk = 0;
  for (let f = 0; f < 150 && (f < 60 || c.st.drift); f++) { frame(c, w, pack({ kb: 1, ...plan(f) })); let d = path(c) - pp; if (d > 180) d -= 360; if (d < -180) d += 360; pp = path(c); tot += d; pk = Math.max(pk, Math.abs(d * FPS)); }
  return [Math.abs(tot), pk];
};
const uturn = () => { const { c, w } = newCar(spec); c.setSpeed(140 / 3.6); const a0 = path(c); for (let f = 0; f < 240; f++) { frame(c, w, pack({ thr: 1, steer: 1, hb: 1, kb: 1 })); let d = a0 - path(c); while (d < 0) d += 360; if (d >= 180 && d < 300) return (f + 1) / FPS; } return 9; };
for (const v of [1.9, 1.5, 1.2, 1.0]) {
  KART.D_PATH = v;
  const t = turn(f => ({ thr: 1, steer: f < 8 ? 1 : 0, hb: f < 8 ? 1 : 0 }));
  const s = turn(f => ({ thr: 1, steer: f < 18 ? 1 : f < 30 ? 0 : f < 60 ? -1 : 0, hb: f < 18 ? 1 : 0 }));
  const fu = turn(f => { const p = fullPlan(f); if (f >= 102) p.steer = 0; return p; });
  console.log(`D_PATH ${v}: 톡 ${t[0].toFixed(0)}° · 0.3초 ${s[0].toFixed(0)}° · 풀 ${fu[0].toFixed(0)}° (화면 최대 ${fu[1].toFixed(0)}°/s) · U자 ${uturn().toFixed(2)}초`);
}
