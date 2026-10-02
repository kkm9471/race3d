// 회귀 시험 — 독립 검증이 찾은 버그·사용자가 정한 손맛이 다시 깨지지 않는지 (2026-10-02 카트식으로 바뀌며 실제 차 물리 항목은 뺐다)
import { CARS } from '../web/src/sim/cars.js';
import { newCar, frame, FPS } from './physics_report.mjs';
import { pack } from '../web/src/sim/input.js';
import { Sim } from '../web/src/sim/race.js';

let fail = 0;
const ok = (c, m) => { console.log(`  ${c ? '✅' : '❌'} ${m}`); if (!c) fail++; };

// 1) 카트식 손맛 (2026-10-02 사용자 요구: 카트라이더처럼 — 액셀 떼면 확 줄고, Shift 떼면 바로 펴지고, 순간부스터)
console.log('[카트 손맛]');
{
  const { measure, TARGET } = await import('./physics_report.mjs');
  const inR = (v, k) => v >= TARGET[k][0] && v <= TARGET[k][1];
  for (const spec of CARS) {
    const r = measure(spec);
    ok(inR(r.coast1, 'coast1') && inR(r.straighten, 'straighten') && inR(r.driftBeta, 'driftBeta') && inR(r.gripBeta, 'gripBeta') && inR(r.boostTop, 'boostTop') && r.instOk && !r.instHold,
      `${spec.name}: 액셀 떼고 1초 -${r.coast1.toFixed(0)}km/h · 드리프트 ${r.driftBeta.toFixed(0)}° · 뗀 뒤 펴짐 ${r.straighten.toFixed(2)}초 · 부스터 ${r.boostTop.toFixed(0)}km/h · 순간부스터 새로누름 ${r.instOk}/계속누름 ${r.instHold}`);
  }
}
// 2) 드리프트를 끝까지 붙잡고 있어도 스핀하지 않는다 (미끄럼각이 목표각으로 모인다)
console.log('[드리프트 붙잡기]');
{
  const { beta } = await import('./physics_report.mjs');
  for (const spec of CARS) {
    const { c, w } = newCar(spec);
    c.setSpeed(150 / 3.6);
    let mb = 0;
    for (let f = 0; f < FPS * 5; f++) { frame(c, w, pack({ thr: 1, steer: 1, hb: 1, kb: 1 })); mb = Math.max(mb, Math.abs(beta(c))); }
    ok(mb < 40 && c.out.fwd > 10, `${spec.name}: 5초 꽉 붙잡아도 최대 미끄럼 ${mb.toFixed(0)}°, 속도 ${(c.out.fwd * 3.6).toFixed(0)}km/h`);
  }
}
// 3) 출발부스터는 신호 직후 새로 누를 때만 / 부스터가 없으면 부스터 키는 아무 일 없음 / 부스터는 2개까지만
console.log('[출발부스터·부스터 개수]');
{
  const { Car } = await import('../web/src/sim/car.js');
  const { FlatWorld } = await import('./physics_report.mjs');
  const spec = CARS[1];
  const start = preHold => {
    const c = new Car(spec); c.place(0, spec.cgH + 0.03, 0, 0); const w = new FlatWorld();
    for (let i = 0; i < 60; i++) frame(c, w, pack({ thr: preHold ? 1 : 0, kb: 1 }), true);
    for (let i = 0; i < 10; i++) frame(c, w, pack({ thr: preHold || i > 2 ? 1 : 0, kb: 1 }));
    return c.st.boostT > 0;
  };
  ok(start(false) && !start(true), `출발부스터: 신호 직후 새로 누름 ${start(false)}, 신호 전부터 누름 ${start(true)}`);
  const { c, w } = newCar(spec);
  c.setSpeed(30);
  for (let f = 0; f < 5; f++) frame(c, w, pack({ thr: 1, bo: f % 2, kb: 1 }));
  const noBoost = c.st.boostT === 0;
  c.st.gauge = 0;
  for (let f = 0; f < FPS * 12; f++) frame(c, w, pack({ thr: 1, steer: (f % 180) < 150 ? 1 : 0, hb: (f % 180) < 150 ? 1 : 0, kb: 1 }));
  ok(noBoost && c.st.boosts <= 2 && c.st.gauge <= 1, `부스터 없을 때 키 무시 ${noBoost}, 12초 드리프트 뒤 부스터 ${c.st.boosts}개(≤2)·게이지 ${c.st.gauge.toFixed(2)}`);
}

// 4) 차 두 대 3랩: 늦은 차도 완주 판정 안에 들어와야
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
  const { GO_FRAME } = await import('../web/src/sim/race.js');
  let touchF = 0, rs = 0, unfinished = 0;
  for (const t of ['circuit', 'mountain', 'city']) for (const me of ['masil', 'baram', 'cheondung']) {
    const at = CARS.findIndex(c => c.id === me), pool = [...CARS.slice(at + 1), ...CARS.slice(0, at)];
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
  // 카트식(2026-10-02)은 성능이 비슷해 출발 직후 몸싸움이 늘었다: 9판 합계 약 10초 중 6초가 출발 10초 안 (그 뒤는 판당 0.4초)
  ok(touchF / FPS < 15 && rs <= 2 && unfinished === 0, `9판 합계 접촉 시간 ${(touchF / FPS).toFixed(1)}초(<15), 되돌리기 ${rs}(≤2), 미완주 ${unfinished}`);
}

// 9) '나'가 사람처럼 비켜 주지 않을 때(3차 독립검증: 8번은 나도 피하는 봇이라 이 경우를 못 봤다)
//    AI 탓인 접촉만 센다: AI 가 나를 뒤에서 박음 + 나란히 비빔. (내가 안 피하고 AI 를 뒤에서 박는 건 시험용 운전의 탓)
//    2026-10-02 카트식 기준 실측: 빠른 나 39.6초, 느린 나 41.2초 (9판 합계, 쌍·프레임 단위)
{
  console.log('[비켜 주지 않는 사람 + AI 3대 — AI 탓 접촉]');
  const { GO_FRAME } = await import('../web/src/sim/race.js');
  const { botInput } = await import('../web/src/sim/bot.js');
  for (const [meSkill, lim] of [[0.95, 55], [0.86, 55]]) {
    let aiF = 0, unfinished = 0;
    for (const t of ['circuit', 'mountain', 'city']) for (const me of ['masil', 'baram', 'cheondung']) {
      const at = CARS.findIndex(c => c.id === me), pool = [...CARS.slice(at + 1), ...CARS.slice(0, at)];
      const players = [{ car: me, name: 'me' }];
      for (let i = 0; i < 3; i++) players.push({ car: pool[i].id, name: 'AI' + i, bot: true, botSkill: 0.86 + i * 0.03 });
      const sim = new Sim({ track: t, laps: 2, players });
      const mem = { stuckT: 0, ram: true };
      while (!sim.gs.over && sim.gs.frame < FPS * 400) {
        sim.step([botInput(sim, 0, meSkill, mem), 0, 0, 0]);
        if (sim.gs.frame <= GO_FRAME) continue;
        const seen = new Set();
        for (const e of sim.events) {
          if (e.t !== 'car' || (e.a !== 0 && e.b !== 0)) continue;
          const ai = e.a === 0 ? e.b : e.a; if (seen.has(ai)) continue; seen.add(ai);
          const M = sim.cars[0].st, A = sim.cars[ai].st;
          const fx = 2 * (M.qx * M.qz + M.qw * M.qy), fz = 1 - 2 * (M.qx * M.qx + M.qy * M.qy);
          if ((A.px - M.px) * fx + (A.pz - M.pz) * fz <= 2.5) aiF++;      // AI 가 내 옆이나 뒤
        }
      }
      unfinished += sim.cars.filter(c => !c.st.fin).length;
    }
    ok(aiF / FPS < lim && unfinished === 0, `나 실력 ${meSkill}: AI 탓 접촉 ${(aiF / FPS).toFixed(1)}초(<${lim}), 미완주 ${unfinished}`);
  }
}

console.log(fail ? `\n실패 ${fail}개` : '\n전부 통과');
process.exit(fail ? 1 : 0);
