// 회귀 시험 — 독립 검증이 찾은 물리·규칙 버그가 다시 생기지 않는지
import { CARS } from '../web/src/sim/cars.js';
import { newCar, frame, FPS } from './physics_report.mjs';
import { pack } from '../web/src/sim/input.js';
import { Sim } from '../web/src/sim/race.js';

let fail = 0;
const ok = (c, m) => { console.log(`  ${c ? '✅' : '❌'} ${m}`); if (!c) fail++; };

// 1) 스핀 뒤 손 떼면 뒤로 굴러가는 속도는 줄어야 한다 (엔진브레이크가 거꾸로 밀면 안 됨)
console.log('[스핀 후 뒤로 굴러감]');
for (const spec of CARS) {
  const { c, w } = newCar(spec, { tcs: false });
  c.setSpeed(108 / 3.6);
  for (let f = 0; f < FPS * 1.5; f++) frame(c, w, pack({ steer: 1, hb: 1, kb: 0 }));   // 사이드+풀조향 → 스핀
  // 앞뒤 성분이 아니라 전체 속력으로 본다 (회전을 마치며 뒤로 정렬되면 앞뒤 성분만 커질 수 있다)
  let v1 = null, v2 = 0, f1 = 0, f2 = 0;
  for (let f = 0; f < FPS * 10; f++) { frame(c, w, pack({ kb: 0 })); if (f === FPS) { v1 = c.out.speed; f1 = c.out.fwd; } v2 = c.out.speed; f2 = c.out.fwd; }
  const bad = v2 > v1 + 0.3;                   // 손 뗐는데 더 빨라짐
  ok(!bad, `${spec.name}: 속력 1초 뒤 ${(v1 * 3.6).toFixed(0)} → 10초 뒤 ${(v2 * 3.6).toFixed(0)} km/h (앞뒤 성분 ${(f1 * 3.6).toFixed(0)} → ${(f2 * 3.6).toFixed(0)})`);
}

// 2) 뒤로 미끄러지며 브레이크를 밟고 있으면 멈출 때까지 브레이크 유지 (후진으로 바뀌면 안 됨)
console.log('[뒤로 미끄러질 때 브레이크]');
for (const id of ['kongal', 'yuseong', 'jimkkun']) {
  const spec = CARS.find(c => c.id === id);
  const { c, w } = newCar(spec);
  c.setSpeed(0);
  c.st.vz = -22; for (const q of c.st.w) q.om = -22 / c.P.R;   // 뒤로 80 km/h
  let stopT = -1;
  for (let f = 0; f < FPS * 8; f++) { frame(c, w, pack({ brk: 1, kb: 1 })); if (stopT < 0 && c.out.speed < 1) stopT = f / FPS; }
  ok(stopT > 0 && stopT < 6, `${spec.name}: 뒤로 80km/h 에서 브레이크 → ${stopT > 0 ? stopT.toFixed(1) + '초에 멈춤' : '안 멈춤'}`);
}

// 3) 경차 vs 하이퍼카 3랩: 경차도 완주 판정 안에 들어와야
console.log('[완주 대기시간]');
for (const track of ['circuit', 'mountain']) {
  const sim = new Sim({ track, laps: 3, players: [{ car: 'yuseong', bot: true, botSkill: 0.9 }, { car: 'kongal', bot: true, botSkill: 0.9 }] });
  while (!sim.gs.over && sim.gs.frame < FPS * 900) sim.step([0, 0]);
  const k = sim.cars[1].st;
  ok(k.fin > 0, `${track}: 하이퍼카 ${(sim.cars[0].st.fin / FPS).toFixed(0)}초, 경차 ${k.fin ? (k.fin / FPS).toFixed(0) + '초 완주' : '완주 못함 ' + k.lap + '랩'}`);
}

// 4) 레이스가 끝난 뒤에는 순위가 바뀌지 않는다
{
  const sim = new Sim({ track: 'circuit', laps: 1, players: [{ car: 'yuseong', bot: true }, { car: 'kongal', bot: true, botSkill: 0.3 }] });
  while (!sim.gs.over && sim.gs.frame < FPS * 900) sim.step([0, 0]);
  const a = JSON.stringify(sim.cars.map(c => [c.st.fin, c.st.lap, c.st.prog]));
  for (let f = 0; f < FPS * 20; f++) sim.step([0, 0]);
  const b = JSON.stringify(sim.cars.map(c => [c.st.fin, c.st.lap, c.st.prog]));
  ok(a === b, '종료 뒤 20초 더 계산해도 완주·랩·진행거리 그대로');
}
console.log(fail ? `\n실패 ${fail}개` : '\n전부 통과');
process.exit(fail ? 1 : 0);
