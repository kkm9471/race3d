// 결정성 시험 — 멀티에서 세 화면이 같은 결과를 내는지의 기반
//
//  1) 같은 설정 + 같은 입력 → 두 번 돌려 매 프레임 해시가 같은가
//  2) 롤백: 중간중간 과거로 되돌아가 "틀린 입력"으로 몇 프레임 가 보고, 다시 되돌려
//     "맞는 입력"으로 재계산 → 한 번도 되돌리지 않은 쪽과 해시가 같은가
//  3) 4대 봇 레이스(충돌 포함)를 끝까지 → 순위·기록이 같은가
// 사용법: node tests/determinism.mjs
import { Sim, FPS } from '../web/src/sim/race.js';
import { pack } from '../web/src/sim/input.js';
import { rng } from '../web/src/sim/dmath.js';

let fail = 0;
const ok = (c, m) => { console.log(`  ${c ? '✅' : '❌'} ${m}`); if (!c) fail++; };

// 사람 입력 흉내: 결정적 난수로 조향·가속·브레이크가 바뀐다
function humanInputs(seed, n, frames) {
  const r = rng(seed);
  const cur = Array.from({ length: n }, () => ({ steer: 0, thr: 1, brk: 0, kb: 1 }));
  const out = [];
  for (let f = 0; f < frames; f++) {
    for (const c of cur) {
      if (r() < 0.04) c.steer = [-1, 0, 0, 1][Math.floor(r() * 4)];
      if (r() < 0.03) { c.thr = r() < 0.8 ? 1 : 0; c.brk = c.thr ? 0 : 1; }
      c.hb = r() < 0.005 ? 1 : 0;
      c.rst = r() < 0.001 ? 1 : 0;
    }
    out.push(cur.map(c => pack(c)));
  }
  return out;
}

const cfg = (track) => ({
  track, laps: 3, players: [
    { car: 'baram', name: 'A' }, { car: 'deundeun', name: 'B' },
    { car: 'cheondung', name: 'C' }, { car: 'kongal', name: 'D' },
  ],
});

for (const track of ['circuit', 'mountain']) {
  console.log(`\n[${track}]`);
  const frames = FPS * 40;
  const inputs = humanInputs(track.length * 7919, 4, frames);
  // 1) 두 번
  const a = new Sim(cfg(track)), b = new Sim(cfg(track));
  let same = true, firstDiff = -1, collisions = 0;
  for (let f = 0; f < frames; f++) {
    a.step(inputs[f]); b.step(inputs[f]);
    collisions += a.events.filter(e => e.t === 'car').length;
    if (a.hash() !== b.hash()) { same = false; if (firstDiff < 0) firstDiff = f; }
  }
  ok(same, `같은 입력 두 번 → ${frames}프레임 전부 같은 해시${same ? '' : ' (처음 어긋난 프레임 ' + firstDiff + ')'}  (차끼리 충돌 ${collisions}회)`);

  // 2) 롤백
  const ref = new Sim(cfg(track)), rb = new Sim(cfg(track));
  const r = rng(12345);
  const snaps = [];
  let rollbacks = 0, maxDepth = 0;
  for (let f = 0; f < frames; f++) {
    snaps[f] = rb.snapshot();
    ref.step(inputs[f]);
    rb.step(inputs[f]);
    if (f > 10 && r() < 0.05) {
      // 과거 d 프레임 전으로 돌아가, 틀린 입력으로 d 프레임 가 본 다음, 다시 돌아가 맞는 입력으로
      const d = 1 + Math.floor(r() * 10);
      const from = f + 1 - d;
      rb.restore(snaps[from]);
      for (let q = from; q <= f; q++) rb.step(inputs[q].map(v => (v ^ 0x1f00) >>> 0));
      rb.restore(snaps[from]);
      for (let q = from; q <= f; q++) { snaps[q] = rb.snapshot(); rb.step(inputs[q]); }
      rollbacks++; maxDepth = Math.max(maxDepth, d);
    }
  }
  ok(ref.hash() === rb.hash(), `롤백 ${rollbacks}번(최대 ${maxDepth}프레임) 섞어도 최종 해시 같음`);

  // 3) 봇 4대 레이스 끝까지
  const botCfg = { ...cfg(track), players: cfg(track).players.map(p => ({ ...p, bot: true })) };
  const r1 = new Sim(botCfg), r2 = new Sim(botCfg);
  let cc = 0;
  while (!r1.gs.over && r1.gs.frame < FPS * 600) { r1.step([0, 0, 0, 0]); cc += r1.events.filter(e => e.t === 'car').length; }
  while (!r2.gs.over && r2.gs.frame < FPS * 600) r2.step([0, 0, 0, 0]);
  const res = s => s.standings().map(k => `${s.cars[k].name}:${(s.cars[k].st.fin / FPS).toFixed(3)}`).join(' ');
  ok(res(r1) === res(r2) && r1.hash() === r2.hash(), `봇 4대 완주 결과 동일: ${res(r1)} (충돌 ${cc}회, ${(r1.gs.frame / FPS).toFixed(0)}초)`);
  ok(r1.cars.every(c => c.st.fin > 0), '4대 모두 완주');
}
console.log(fail ? `\n실패 ${fail}개` : '\n전부 통과');
process.exit(fail ? 1 : 0);
