// 가벼운 차선 변경(100km/h 풀가속, 키보드 오른쪽 0.15초 → 왼쪽 0.15초): 보조 켬/끔 2.5초 뒤 속도
// 사이드브레이크 드리프트 뒤 카운터+가속(앞바퀴굴림): 보조 켬/끔 3초 뒤 속도
import { CARS } from '../../web/src/sim/cars.js';
import { newCar, frame, FPS } from '../physics_report.mjs';
import { pack } from '../../web/src/sim/input.js';
export function lane(spec, tcs) {
  const { c, w } = newCar(spec, { tcs }); c.setSpeed(100 / 3.6);
  for (let f = 0; f < FPS * 2.5; f++) frame(c, w, pack({ thr: 1, steer: f < 9 ? 1 : f < 18 ? -1 : 0, kb: 1 }));
  return c.out.speed * 3.6;
}
export function hbRecover(spec, tcs) {
  const { c, w } = newCar(spec, { tcs }); c.setSpeed(70 / 3.6);
  for (let f = 0; f < 20; f++) frame(c, w, pack({ steer: -1, thr: 0.3, kb: 0 }));
  for (let f = 0; f < 30; f++) frame(c, w, pack({ steer: -1, hb: 1, kb: 0 }));
  for (let f = 0; f < FPS * 3; f++) frame(c, w, pack({ steer: f < 40 ? 0.6 : 0, thr: 1, kb: 0 }));
  return c.out.speed * 3.6;
}
if (process.argv[1]?.endsWith('_lane.mjs')) for (const s of CARS) console.log(s.id.padEnd(11), '차선변경 켬/끔', lane(s, true).toFixed(1), lane(s, false).toFixed(1), '| 사이드 복구 켬/끔', hbRecover(s, true).toFixed(1), hbRecover(s, false).toFixed(1));
