// 톡톡이(끌기): 드리프트 건 뒤 반대키 한 번 → 꺾은 쪽 방향키를 초당 N번 톡(0.07초) — 각도·속도·끊김
import { CARS } from '../../web/src/sim/cars.js';
import { pack } from '../../web/src/sim/input.js';
import { newCar, frame, beta, FPS } from '../physics_report.mjs';
const spec = CARS[1];
for (const hz of [0, 2, 3, 4, 5, 6]) {
  const { c, w } = newCar(spec); c.setSpeed(150 / 3.6);
  const per = hz ? Math.round(FPS / hz) : 1e9; let tokF = 0, end = 0, bs = [];
  for (let f = 0; f < FPS * 4; f++) {
    const steer = f < 20 ? 1 : f < 26 ? -1 : ((f - 26) % per) < 4 ? 1 : 0;
    frame(c, w, pack({ kb: 1, thr: 1, hb: f < 20 ? 1 : 0, steer }));
    if (c.out.tok) tokF++;
    if (!end && f > 26 && !c.st.drift) end = (f + 1) / FPS;
    if ((f + 1) % 60 === 0) bs.push(`${(f + 1) / 60}초 ${Math.abs(beta(c)).toFixed(0)}°·${(c.out.speed * 3.6).toFixed(0)}km/h`);
  }
  console.log(`초당 ${hz}번: 톡톡이 ${(tokF / FPS).toFixed(1)}초 · 드리프트 ${end ? end.toFixed(2) + '초에 끝' : '4초 내내'} · ${bs.join(' / ')}`);
}
