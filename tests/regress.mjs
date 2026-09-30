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
// 5) 스핀 뒤 뒤로 굴러갈 때 회전계가 레드라인 위에 붙지 않는다 (2차 독립검증)
console.log('[스핀 후 회전계]');
for (const spec of CARS) {
  const { c, w } = newCar(spec, { tcs: false });
  c.setSpeed(108 / 3.6);
  for (let f = 0; f < FPS * 1.5; f++) frame(c, w, pack({ steer: 1, hb: 1, kb: 0 }));
  let over = 0;
  for (let f = 0; f < FPS * 10; f++) { frame(c, w, pack({ kb: 0 })); if (c.st.rpm > spec.engine.redline * 1.02) over++; }
  ok(over === 0, `${spec.name}: 레드라인 넘은 시간 ${(over / FPS).toFixed(1)}초`);
}

// 6) 도심 빌딩끼리 겹치지 않는다
{
  console.log('[도심 빌딩 겹침]');
  const THREE = await import('three');
  const { buildCity } = await import('../web/src/render/city.js');
  const { getTrack } = await import('../web/src/sim/race.js');
  const { TrackWorld } = await import('../web/src/sim/track.js');
  const T = getTrack('city'), W = new TrackWorld(T);
  const g = new THREE.Group();
  buildCity(T, (i, d) => W.heightAt(i, 0, d).h, g, [], { detail: 1 });
  const im = g.children.find(o => o.isInstancedMesh && o.count > 50);
  const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  const bs = [];
  for (let i = 0; i < im.count; i++) {
    im.getMatrixAt(i, m); m.decompose(p, q, sc);
    const ux = new THREE.Vector3(1, 0, 0).applyQuaternion(q), vz = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    bs.push({ x: p.x, z: p.z, w: sc.x, d: sc.z, ux: ux.x, uz: ux.z, vx: vz.x, vz: vz.z });
  }
  const ext = (b, ax, az) => b.w / 2 * Math.abs(b.ux * ax + b.uz * az) + b.d / 2 * Math.abs(b.vx * ax + b.vz * az);
  let pairs = 0;
  for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
    const a = bs[i], c = bs[j], dx = c.x - a.x, dz = c.z - a.z;
    let sep = false;
    for (const [ax, az] of [[a.ux, a.uz], [a.vx, a.vz], [c.ux, c.uz], [c.vx, c.vz]]) if (Math.abs(dx * ax + dz * az) >= ext(a, ax, az) + ext(c, ax, az) - 0.01) { sep = true; break; }
    if (!sep) pairs++;
  }
  ok(pairs === 0, `빌딩 ${bs.length}채 중 겹치는 쌍 ${pairs}`);
}

// 7) 봇이 혼자 달릴 때 세게 벽에 박거나 되돌리기(스핀·역주행)가 없다
//    (휘는 제동 구간 마찰원, 내리막 제동, 코너 탈출 가속, 카운터스티어 중 ESC — 2026-10-01)
{
  console.log('[봇 혼자 주행 30조합]');
  const { soloRun } = await import('./laps.mjs');
  let big = 0, rs = 0; const bad = [];
  for (const t of ['circuit', 'mountain', 'city']) for (const cs of CARS) {
    const r = soloRun(t, cs.id, 2);
    big += r.bigWall; rs += r.resets;
    if (r.bigWall || r.resets) bad.push(`${t}/${cs.name} 강한 벽 ${r.bigWall} 되돌리기 ${r.resets}`);
  }
  ok(big === 0 && rs === 0, `강한 벽 충돌 ${big}, 되돌리기 ${rs} ${bad.join(', ')}`);
}

// 8) 여러 봇이 같이 달릴 때 범퍼로 밀거나 나란히 비비지 않는다 (혼자 연습 구성: 나 + AI 3대 비슷한 급)
{
  console.log('[봇 4대 레이스 접촉]');
  const { carStats } = await import('../web/src/sim/cars.js');
  const { GO_FRAME } = await import('../web/src/sim/race.js');
  let touchF = 0, rs = 0, unfinished = 0;
  for (const t of ['circuit', 'mountain', 'city']) for (const me of ['masil', 'baram', 'cheondung']) {
    const meS = CARS.find(c => c.id === me);
    const pool = CARS.filter(c => c.id !== me).sort((a, b) => Math.abs(carStats(a).pwr - carStats(meS).pwr) - Math.abs(carStats(b).pwr - carStats(meS).pwr));
    const players = [{ car: me, name: 'me', bot: true, botSkill: 0.95, abs: true, tcs: true }];
    for (let i = 0; i < 3; i++) players.push({ car: pool[i].id, name: 'AI' + i, bot: true, botSkill: 0.86 + i * 0.03, abs: true, tcs: true });
    const sim = new Sim({ track: t, laps: 2, players });
    while (!sim.gs.over && sim.gs.frame < FPS * 400) {
      sim.step(players.map(() => 0));
      if (sim.events.some(e => e.t === 'car') && sim.gs.frame > GO_FRAME) touchF++;
      rs += sim.events.filter(e => e.t === 'reset').length;
    }
    unfinished += sim.cars.filter(c => !c.st.fin).length;
  }
  ok(touchF / FPS < 10 && rs <= 2 && unfinished === 0, `9판 합계 접촉 시간 ${(touchF / FPS).toFixed(1)}초(<10), 되돌리기 ${rs}(≤2), 미완주 ${unfinished}`);
}

// 9) '나'가 사람처럼 비켜 주지 않을 때(3차 독립검증: 8번은 나도 피하는 봇이라 이 경우를 못 봤다)
//    AI 가 사람 차를 따라가며 밀거나 나란히 비비면 늘어난다. 2026-10-01 실측: 빠른 나 10.8초, 느린 나 31.6초(9판 합계)
{
  console.log('[비켜 주지 않는 사람 + AI 3대]');
  const { carStats } = await import('../web/src/sim/cars.js');
  const { GO_FRAME } = await import('../web/src/sim/race.js');
  const { botInput } = await import('../web/src/sim/bot.js');
  for (const [meSkill, lim] of [[0.95, 15], [0.86, 50]]) {
    let touchF = 0, unfinished = 0;
    for (const t of ['circuit', 'mountain', 'city']) for (const me of ['masil', 'baram', 'cheondung']) {
      const meS = CARS.find(c => c.id === me);
      const pool = CARS.filter(c => c.id !== me).sort((a, b) => Math.abs(carStats(a).pwr - carStats(meS).pwr) - Math.abs(carStats(b).pwr - carStats(meS).pwr));
      const players = [{ car: me, name: 'me', abs: true, tcs: true }];
      for (let i = 0; i < 3; i++) players.push({ car: pool[i].id, name: 'AI' + i, bot: true, botSkill: 0.86 + i * 0.03, abs: true, tcs: true });
      const sim = new Sim({ track: t, laps: 2, players });
      const mem = { stuckT: 0, ram: true };
      while (!sim.gs.over && sim.gs.frame < FPS * 400) {
        sim.step([botInput(sim, 0, meSkill, mem), 0, 0, 0]);
        if (sim.events.some(e => e.t === 'car') && sim.gs.frame > GO_FRAME) touchF++;
      }
      unfinished += sim.cars.filter(c => !c.st.fin).length;
    }
    ok(touchF / FPS < lim && unfinished === 0, `나 실력 ${meSkill}: 9판 합계 접촉 ${(touchF / FPS).toFixed(1)}초(<${lim}), 미완주 ${unfinished}`);
  }
}

// 10) ESC 가 평범한 조작을 방해하지 않는다 (3차 독립검증: 반대 조향 개입이 너무 넓었다)
//     가벼운 차선 변경에서 보조 켬이 끔보다 3.2km/h 넘게 느려지지 않고, 앞바퀴굴림 사이드브레이크 드리프트 뒤
//     카운터+가속으로 빠져나오는 속도가 수정 전(콩알 2.1·마실 24.2·번개 36.9km/h)으로 돌아가지 않는다
{
  console.log('[ESC 가 평범한 조작을 방해하지 않음]');
  const { lane, hbRecover } = await import('./debug/_lane.mjs');
  for (const spec of CARS) {
    const loss = lane(spec, false) - lane(spec, true);
    ok(loss < 3.2, `${spec.name}: 차선 변경 뒤 보조 켬 손해 ${loss.toFixed(1)}km/h`);
  }
  for (const [id, min] of [['kongal', 8], ['masil', 35], ['beongae', 45]]) {
    const spec = CARS.find(s => s.id === id), v = hbRecover(spec, true);
    ok(v >= min, `${spec.name}: 드리프트 뒤 카운터+가속 탈출 ${v.toFixed(1)}km/h (≥${min})`);
  }
}

console.log(fail ? `\n실패 ${fail}개` : '\n전부 통과');
process.exit(fail ? 1 : 0);
