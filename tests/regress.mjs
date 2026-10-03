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
console.log('[카트 손맛]');
{
  const { measure, TARGET } = await import('./physics_report.mjs');
  const inR = (v, k) => v >= TARGET[k][0] && v <= TARGET[k][1];
  for (const spec of CARS) {
    const r = measure(spec);
    // 14회차: 사용자 요구(오래 누르면 U자·드리프트 감속·카운터 빠르게)와 동우 피드백(탈출 속도)도 단언 (전엔 보고서에만 찍혀 퇴행을 못 잡았다 — 독립검증)
    // 2026-10-03 3차: 카트라이더 공식 가이드 영상에서 잰 값 (톡·풀·카운터·관성 유지·감속)
    const keys = ['coast1', 'gripBeta', 'boostTop', 'tapPeak', 'tapPeakT', 'tapEnd', 'tapLoss', 'fullB015', 'fullB07', 'fullHold', 'counterT', 'fullLoss', 'uturn', 'exitD25', 'exitMax', 'swingBack', 'tokKeep'];
    const bad = keys.filter(k => !inR(r[k], k));
    ok(!bad.length && r.instOk && !r.instHold,
      `${spec.name}: 톡 최대 ${r.tapPeak.toFixed(0)}°(${r.tapPeakT.toFixed(2)}초)·펴짐 ${r.tapEnd.toFixed(2)}초 · 풀 0.15초 ${r.fullB015.toFixed(0)}°·0.7초 ${r.fullB07.toFixed(0)}°·뗀 뒤 유지 ${r.fullHold.toFixed(2)} · 카운터 ${r.counterT.toFixed(2)}초 · 풀 감속 ${r.fullLoss.toFixed(0)}% · U자 ${r.uturn.toFixed(2)}초 · 탈출 0.25초 ${r.exitD25.toFixed(1)}/최대 +${r.exitMax.toFixed(1)}km/h · 머리 되돌아감 ${r.swingBack.toFixed(1)}° · 톡톡이 3초 ${r.tokKeep.toFixed(0)}% · 순간부스터 새로누름 ${r.instOk}/계속누름 ${r.instHold}${bad.length ? ' · 벗어남: ' + bad.join(',') : ''}`);
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
    // 2026-10-03 3차 드리프트: 오래 누를수록 미끄럼각이 커지는 게 의도(최대 60°). 팽이처럼 도는 스핀만 막는다 → 66° 상한, 멈춰 서지 않는다
    // (카트라이더처럼 오래 붙잡으면 크게 느려지므로 앞 속도 대신 실제 속력으로 본다)
    ok(mb < 66 && c.out.speed > 8, `${spec.name}: 5초 꽉 붙잡아도 최대 미끄럼 ${mb.toFixed(0)}°(<66), 속력 ${(c.out.speed * 3.6).toFixed(0)}km/h`);
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

// 6-1) 테마 맵(14회차)이 하나도 빠지지 않고 불러와졌다 (맵 파일이 깨지면 그 맵만 조용히 빠지는 구조라서)
{
  console.log('[테마 맵 불러오기]');
  const { MAP_LOAD_FAIL, TRACK_DEFS: TD } = await import('../web/src/sim/tracks.js');
  const { MAP_IDS } = await import('../web/src/sim/maps/index.js');
  ok(MAP_LOAD_FAIL.length === 0 && MAP_IDS.every(id => TD.some(d => d.id === id && d.theme === id)), `테마 맵 ${MAP_IDS.length}개 모두 불러옴 (실패: ${MAP_LOAD_FAIL.join(',') || '없음'})`);
}

// 7) 봇이 혼자 달릴 때 세게 벽에 박거나 되돌리기(스핀·역주행)가 없다
//    (휘는 제동 구간 마찰원, 내리막 제동, 코너 탈출 가속, 카운터스티어 중 ESC — 2026-10-01)
{
  console.log('[봇 혼자 주행 — 모든 맵 × 10대]');
  const { soloRun } = await import('./laps.mjs');
  let big = 0, rs = 0; const bad = [];
  const { TRACK_DEFS: TD } = await import('../web/src/sim/tracks.js');
  for (const t of TD.map(d => d.id)) for (const cs of CARS) {
    const r = soloRun(t, cs.id, TD.find(d => d.id === t).laps ? 1 : 2);   // 긴 맵은 1바퀴
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

// 11) 4차 독립검증 항목 (2026-10-02)
console.log('[4차 검증: 점프대·부스터 규칙·분리대·출발 자리]');
{
  const { GO_FRAME } = await import('../web/src/sim/race.js');
  const { datan2 } = await import('../web/src/sim/dmath.js');
  const { KART } = await import('../web/src/sim/car.js');
  const { TRACK_DEFS } = await import('../web/src/sim/tracks.js');
  const upY = st => 1 - 2 * (st.qx * st.qx + st.qz * st.qz);
  const ready = (track, car) => {
    const sim = new Sim({ track, laps: 3, players: [{ car, name: 'p' }] });
    while (sim.gs.frame < GO_FRAME + 30) sim.step([pack({ kb: 1 })]);
    return sim;
  };
  const put = (sim, i, d, back, v) => {
    const T = sim.T, c = sim.cars[0];
    const x = T.x[i] + T.lx[i] * d, z = T.z[i] + T.lz[i] * d;
    const yaw = datan2(T.tx[i], T.tz[i]) + (back ? Math.PI : 0);
    sim.world.ground(x, z, i);
    c.place(x, sim.world.g.h + c.P.spec.cgH + 0.1, z, yaw);
    c.st.hint = i; for (let q = 0; q < 4; q++) c.st.w[q].hint = i;
    c.st.sPrev = i * T.ds;
    c.setSpeed(v); c.finishFrame();
  };
  // (가) 점프대 가장자리·한쪽 바퀴만 걸쳐도 안 뒤집힘  (나) 역주행으로 끝면에 들어가도 6m 넘게 안 치솟음
  let flips = 0, worstUp = 1, maxRise = 0, runs = 0;
  for (const tr of ['beach', 'canyon', 'glacier']) {
    for (const car of ['kongal', 'yuseong']) {
      const sim0 = ready(tr, car), T = sim0.T, snap = sim0.snapshot();
      const ends = [];
      for (let i = 0; i < T.n; i++) if (T.ramp[i] > 0 && T.ramp[(i + 1) % T.n] < T.ramp[i] && T.ramp[(i - 1 + T.n) % T.n] < T.ramp[i]) ends.push(i);
      for (const e of ends) {
        const i0 = (e - 20 + T.n) % T.n;
        for (const side of [1, -1]) for (const dd of [-1.0, -0.5, 0, 0.4, 0.8]) for (const v of [25, 40]) {
          sim0.restore(snap); put(sim0, i0, side * (T.hw[i0] + dd), false, v);
          let mu = 1;
          for (let f = 0; f < 200; f++) { sim0.step([pack({ thr: 1, kb: 1 })]); mu = Math.min(mu, upY(sim0.cars[0].st)); }
          runs++; worstUp = Math.min(worstUp, mu); if (mu < 0) flips++;
        }
        // 역주행: 끝면 40m 뒤에서 거꾸로 40m/s
        sim0.restore(snap); const i1 = (e + 20) % T.n; put(sim0, i1, 0, true, 40);
        const y0 = sim0.cars[0].st.py; let top = 0;
        for (let f = 0; f < 150; f++) { sim0.step([pack({ thr: 1, kb: 1 })]); top = Math.max(top, sim0.cars[0].st.py - y0); }
        maxRise = Math.max(maxRise, top);
      }
    }
  }
  ok(flips === 0, `점프대 가장자리·한쪽 걸침 ${runs}번: 뒤집힘 ${flips}번 (가장 기운 upY ${worstUp.toFixed(2)})`);
  ok(maxRise < 6, `점프대 역주행: 가장 높이 솟은 ${maxRise.toFixed(1)}m (<6)`);
  // (다) 브레이크로 속도가 무너져 끝난 드리프트는 순간부스터 기회가 없다
  {
    const { c, w } = newCar(CARS[1]);
    c.setSpeed(108 / 3.6);
    for (let f = 0; f < 24; f++) frame(c, w, pack({ thr: 0, steer: 1, hb: 1, kb: 1 }));
    for (let f = 0; f < 240 && c.st.drift; f++) frame(c, w, pack({ thr: 0, brk: 1, steer: 1, hb: 1, kb: 1 }));
    let inst = 0;
    for (let f = 0; f < 20; f++) { frame(c, w, pack({ thr: 1, hb: 1, kb: 1 })); if (c.out.inst) inst = 1; }
    ok(!inst && c.out.fwd * 3.6 < 60, `브레이크로 멈춘 드리프트 뒤 순간부스터 ${inst ? '나옴' : '없음'}, 0.33초 뒤 ${(c.out.fwd * 3.6).toFixed(0)}km/h`);
  }
  // (라) 최고속에서 직선 지그재그 드리프트로 순간부스터를 이어 붙여도 그냥 달리기보다 빠르지 않다
  {
    const dist = zig => {
      const { c, w } = newCar(CARS[1]);
      for (let f = 0; f < FPS * 25; f++) frame(c, w, pack({ thr: 1, kb: 1 }));
      let x = 0, dir = 1, ph = 0;
      for (let f = 0; f < 600; f++) {
        let inp = { thr: 1, kb: 1 };
        if (zig) {
          ph++;
          if (ph <= 19) inp = { thr: 1, steer: dir, hb: 1, kb: 1 };
          else if (ph === 20) inp = { thr: 0, kb: 1 };
          else if (ph <= 23) inp = { thr: 1, steer: -dir, kb: 1 };
          else { ph = 0; dir = -dir; }
        }
        frame(c, w, pack(inp)); x += c.out.speed / FPS;
      }
      return x;
    };
    const a = dist(false), b = dist(true);
    ok(b <= a * 1.005, `직선 지그재그 10초: ${b.toFixed(0)}m vs 그냥 달리기 ${a.toFixed(0)}m`);
  }
  // (마) 끝나 가는 부스터에 순간부스터가 겹치면 센 쪽(1.25)을 유지하고 시간만 는다
  {
    const { c, w } = newCar(CARS[1]);
    c.setSpeed(40);
    c.st.boostT = 0.4; c.st.boostV = KART.BOOST_V; c.st.boostK = 1; c.st.instT = 0.3; c.st.instKind = 1; c.st.thrPrev = 0;
    frame(c, w, pack({ thr: 1, kb: 1 }));
    ok(c.st.boostV >= KART.BOOST_V && c.st.boostT > 0.45, `부스터 끝무렵 순간부스터: 세기 ${c.st.boostV}, 남은 시간 ${c.st.boostT.toFixed(2)}초`);
  }
  // (바) 분리대 코에 정면으로 들어가도 올라탄 채 끌려가지 않는다
  {
    let stuck = 0, tries = 0;
    for (const tr of ['beach', 'canyon', 'glacier']) {
      const sim0 = ready(tr, 'masil'), T = sim0.T, snap = sim0.snapshot();
      let a = -1;
      for (let i = 0; i < T.n; i++) if (T.divW[i] > 0 && !(T.divW[(i - 1 + T.n) % T.n] > 0)) { a = i; break; }
      for (const off of [-0.6, -0.3, 0, 0.3, 0.6]) for (const v of [15, 30]) {
        sim0.restore(snap); const i0 = (a - 12 + T.n) % T.n; put(sim0, i0, T.div[a] + off, false, v);
        let on = 0;
        for (let f = 0; f < 240; f++) {
          sim0.step([pack({ thr: 1, kb: 1 })]);
          const st = sim0.cars[0].st, L = sim0.world.locate(st.px, st.pz, st.hint);
          if (T.divW[L.i] > 0 && Math.abs(L.d - T.div[L.i]) < T.divW[L.i] + 0.2) on++;
        }
        tries++; if (on > 60) stuck++;
      }
    }
    ok(stuck === 0, `분리대 코 정면 진입 ${tries}번: 1초 넘게 올라탄 경우 ${stuck}번`);
  }
  // (사) 출발 자리에서 출발선까지 가속 발판이 없다 (뒷줄만 출발하자마자 부스터를 받으면 불공평)
  {
    const bad = [];
    for (const def of TRACK_DEFS) {
      const sim0 = new Sim({ track: def.id, laps: 1, players: [{ car: 'masil' }] }), T = sim0.T;
      for (let k = 0; k < 4; k++) {
        const g = sim0.world.gridSlot(k);
        for (let s = g.s; s < T.L + 4; s += 1) { const i = Math.floor(s / T.ds) % T.n; if (T.padW[i] > 0) { bad.push(`${def.name} ${k}번 자리`); break; } }
      }
    }
    ok(bad.length === 0, `출발 자리~출발선 사이 가속 발판: ${bad.join(', ') || '없음'}`);
  }
}

// 12) 부스터 게이지: 가득 차면 부스터 1개(최대 2개), 게이지는 0부터 다시 — 2개를 갖고 있어도 0으로 (2026-10-02 사용자 요청)
console.log('[게이지 다시 0부터]');
{
  const fill = have => {
    const { c, w } = newCar(CARS[1]);
    c.setSpeed(120 / 3.6);
    c.st.boosts = have; c.st.gauge = 0.97;
    for (let f = 0; f < 30; f++) frame(c, w, pack({ thr: 1, steer: 1, hb: 1, kb: 1 }));
    return [c.st.boosts, c.st.gauge];
  };
  const [b1, g1] = fill(1), [b2, g2] = fill(2);
  ok(b1 === 2 && g1 < 0.5 && b2 === 2 && g2 < 0.5, `1개일 때 가득 → 부스터 ${b1}개·게이지 ${g1.toFixed(2)} / 2개일 때 가득 → 부스터 ${b2}개·게이지 ${g2.toFixed(2)}`);
}

console.log(fail ? `\n실패 ${fail}개` : '\n전부 통과');
process.exit(fail ? 1 : 0);
