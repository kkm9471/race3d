// 사건 효과음 시험 (Node, 브라우저 없음, 약 5초) — 실제 Session·롤백을 돌려 내 차 사건마다 소리가 꼭 1번인지 본다.
//
// 2026-11-11 반증에서 나온 함정 3가지를 이 시험이 잡는다 (가짜 sim 으로 소리만 재는 audio_check.mjs 로는 못 잡음):
//  (a) boostT 0→양수는 가속 발판·순간·출발부스터도 같이 써서 '부스터 점화' 신호가 못 된다
//  (b) out.inst(순간·출발부스터 알림)는 HUD 가 소리보다 먼저 읽고 지운다 → 소리가 영영 안 남
//  (c) out.inst 는 st 밖 값이라 롤백 재계산 때 다시 켜진다 → 멀티에서 소리가 두 번
// 그리고 Session 에 넣은 사건 비교가 시뮬레이션 계산을 바꾸지 않았는지(해시)도 본다.
// 사용법: node tests/sfx_events.mjs
import { Session } from '../web/src/net/session.js';
import { Sim, GO_FRAME } from '../web/src/sim/race.js';
import { pack, unpack, NEUTRAL } from '../web/src/sim/input.js';
import { botInput } from '../web/src/sim/bot.js';
import { SfxPicker } from '../web/src/audio/sfx.js';

let fail = 0;
const ok = (c, m) => { console.log(`  ${c ? '✅' : '❌'} ${m}`); if (!c) fail++; };

// 꽃마을 운하길 40초: 출발부스터·순간부스터·게이지 획득·부스터 사용·가속 발판이 모두 나온다 (2026-11-11 실측)
const END = GO_FRAME + 60 * 40;
const cfg = { track: 'village', laps: 3, players: [{ car: 'baram', name: 'A' }, { car: 'kongal', name: 'B' }] };
// 상대(자리 1)는 출발선에 선 채 브레이크 값만 바꾼다 → 내 차 주행엔 영향 없이 롤백만 일으킨다
const REM = [NEUTRAL, pack({ brk: 1, kb: 1 }), pack({ brk: 0.5, kb: 1 })];
const remLog = []; for (let F = 40; F < END; F += 20) remLog.push([F - 27, REM[(F / 20) % 3]]);

/** 화면 루프 흉내: 한 번에 한 프레임 진행 → (나쁜 순서로) HUD 가 out.inst 를 먼저 읽고 지움 → 사건 통로에서 소리 고르기 */
function loopStep(s, picker, F, tally) {
  s.advanceTo(F);
  const me = s.sim.cars[0];
  if (me.out.inst) { tally.naiveInst++; me.out.inst = 0; }          // HUD (out.inst 를 소리 신호로 썼다면 이 횟수)
  if (me.out.inst) tally.instAfterHud++;                             // HUD 뒤에 out.inst 를 읽는 소리 (함정 b — 늘 0)
  const evs = s.takeEvents();
  for (const e of evs) if (e.a === 0) tally['ev_' + e.t] = (tally['ev_' + e.t] || 0) + 1;   // 통로가 내보낸 원래 사건 (고르기 전)
  for (const [name] of picker.pick(evs, 0, s.frame)) tally[name] = (tally[name] || 0) + 1;
}

// ── A: 롤백 없음. 내 입력은 봇 운전 + 크게 꺾을 때 Shift 0.7초 (게이지를 채우려고) ──
const A = new Session(cfg, 0);
for (const [f, v] of remLog) A.addConfirmed(1, f, v);
const pa = new SfxPicker(), ta = { naiveInst: 0, instAfterHud: 0 };
const truth = { boost: 0, gain: 0, inst1: 0, inst2: 0, pad: 0, boostEdge: 0 };
const myLog = [], hA = [];
{
  const mem = { stuckT: 0 }; let last = -1, hold = 0, lastDrift = -999;
  for (let f = 0; f < END; f++) {
    const me = A.sim.cars[0], st = me.st;
    const i = { ...unpack(f < GO_FRAME + 4 ? pack({ kb: 1 }) : botInput(A.sim, 0, 0.9, mem)) };
    if (hold > 0) { i.hb = 1; hold--; }
    else if (f > GO_FRAME + 120 && Math.abs(i.steer) > 0.5 && me.out.speed > 20 && f - lastDrift > 150) { hold = 42; lastDrift = f; i.hb = 1; }
    const v = pack(i); if (v !== last) { A.addConfirmed(0, f, v); myLog.push([f, v]); last = v; }
    // 정답: 한 프레임 앞뒤 상태를 직접 비교 (롤백이 없으니 정확)
    const b0 = st.boosts, p0 = st.padT, bt0 = st.boostT, i0 = me.out.inst;
    me.out.inst = 0;
    A.advanceTo(f + 1);
    if (st.boosts < b0) truth.boost++; else if (st.boosts > b0) truth.gain++;
    if (st.padT > p0) truth.pad++;
    if (bt0 === 0 && st.boostT > 0) truth.boostEdge++;
    if (me.out.inst === 1) truth.inst1++; else if (me.out.inst === 2) truth.inst2++;
    if (!me.out.inst) me.out.inst = i0;
    hA.push(A.sim.hash());
    // 화면 루프와 같은 처리 (A 는 위에서 이미 진행했으니 advanceTo 는 제자리)
    loopStep(A, pa, f + 1, ta);
  }
}
const truthInst = truth.inst1 + truth.inst2;
console.log('[시나리오 — 꽃마을 운하길 40초, 롤백 없음]');
console.log(`    정답: 부스터 사용 ${truth.boost} · 획득 ${truth.gain} · 순간부스터 ${truth.inst1} · 출발부스터 ${truth.inst2} · 발판 ${truth.pad}`);
ok(A.rollbacks === 0, `롤백 없음 (${A.rollbacks})`);
ok(truth.boost >= 1 && truth.gain >= 1 && truth.inst1 >= 1 && truth.inst2 === 1 && truth.pad >= 1, '사건 다섯 가지가 다 나온다 (시나리오가 시험할 거리를 담고 있나)');
ok((ta.boost || 0) === truth.boost, `부스터 점화 소리 ${ta.boost || 0}번 = 사용 ${truth.boost}번`);
ok((ta.gain || 0) === truth.gain, `획득 소리 ${ta.gain || 0}번 = 획득 ${truth.gain}번`);
ok((ta.inst || 0) === truthInst, `순간·출발부스터 소리 ${ta.inst || 0}번 = ${truthInst}번 (HUD 가 먼저 지워도)`);
ok((ta.pad || 0) === truth.pad, `발판 소리 ${ta.pad || 0}번 = ${truth.pad}번`);
ok(truth.boostEdge > truth.boost, `[함정 a] boostT 0→양수 ${truth.boostEdge}번 ≠ 부스터 사용 ${truth.boost}번 — 그 신호를 썼다면 발판·출발·순간에도 점화음`);
ok(ta.instAfterHud === 0 && truthInst > 0, `[함정 b] HUD 뒤에 out.inst 를 읽으면 ${ta.instAfterHud}번 (실제 ${truthInst}번) — 그래서 사건 통로로 받는다`);

// ── 계산이 바뀌지 않았나: Session 없이 Sim 만으로 같은 입력 → 프레임마다 해시 비교 ──
{
  const at = (log, f) => { let v = NEUTRAL; for (const [ff, vv] of log) { if (ff <= f) v = vv; else break; } return v; };
  const sim = new Sim(cfg); let same = 0;
  for (let f = 0; f < END; f++) { sim.step([at(myLog, f), at(remLog, f)]); if (sim.hash() === hA[f]) same++; }
  ok(same === END, `Session(사건 비교 포함) 해시 = Sim 만 돌린 해시 ${same}/${END}프레임 — 시뮬레이션 계산 그대로`);
}

// ── B: 같은 입력인데 상대 입력이 27프레임(가끔 300프레임) 늦게 도착 → 롤백 반복 ──
const B = new Session(cfg, 0);
for (const [f, v] of myLog) B.addConfirmed(0, f, v);
const pb = new SfxPicker(), tb = { naiveInst: 0, instAfterHud: 0 };
// 입력마다 따로 도착 (도착 = 찍힌 프레임 + 늦음) — 순서대로만 받으면 깊은 것 하나가 뒤를 막아 롤백 구간에 빈틈이 생겼다
const arrive = remLog.map(([f, v], i) => [f + (i % 25 === 7 ? 300 : 27), f, v]).sort((x, y) => x[0] - y[0]);
let ri = 0;
for (let F = 1; F <= END; F++) {
  while (ri < arrive.length && arrive[ri][0] <= F) { B.addConfirmed(1, arrive[ri][1], arrive[ri][2]); ri++; }
  loopStep(B, pb, F, tb);
}
while (ri < arrive.length) { B.addConfirmed(1, arrive[ri][1], arrive[ri][2]); ri++; }
loopStep(B, pb, END, tb);
console.log(`[같은 입력 + 롤백 ${B.rollbacks}번 (최대 ${B.maxRollback}프레임 — 0.3초 시간 거르기로는 못 막는 깊이)]`);
ok(B.rollbacks >= 30 && B.maxRollback >= 200, `롤백이 충분히 일어남 (${B.rollbacks}번, 최대 ${B.maxRollback})`);
ok(B.sim.hash() === A.sim.hash(), '롤백해도 최종 해시가 같다');
ok((tb.boost || 0) === truth.boost, `부스터 점화 소리 ${tb.boost || 0}번 = ${truth.boost}번`);
ok((tb.gain || 0) === truth.gain, `획득 소리 ${tb.gain || 0}번 = ${truth.gain}번`);
ok((tb.inst || 0) === truthInst, `순간·출발부스터 소리 ${tb.inst || 0}번 = ${truthInst}번`);
ok((tb.pad || 0) === truth.pad, `발판 소리 ${tb.pad || 0}번 = ${truth.pad}번`);
const raw = ['boost', 'gain', 'inst', 'pad'].map(t => tb['ev_' + t] || 0).join('·'), want = [truth.boost, truth.gain, truthInst, truth.pad].join('·');
ok(raw === want, `Session 사건 통로 자체도 한 번씩 (0.25초 거르기 전, 사용·획득·순간출발·발판) ${raw} = ${want}`);
ok(tb.naiveInst > truthInst, `[함정 c] out.inst 를 직접 셌다면 ${tb.naiveInst}번 (실제 ${truthInst}번) — 롤백 재계산 때 다시 켜짐을 이 시나리오가 실제로 재현`);

// ── 고르기 규칙 ──
console.log('[고르기 규칙]');
{
  const p = new SfxPicker();
  ok(p.pick([{ t: 'boost', a: 1, f: 100 }, { t: 'pad', a: 2, f: 100 }], 0, 100).length === 0, '남의 차 사건은 소리 없음');
  ok(p.pick([{ t: 'boost', a: 0, f: 100 }], 0, 200).length === 0, '0.25초 넘게 지난 사건(탭 복귀·따라잡기)은 소리 없음');
  ok(p.pick([{ t: 'car', a: 0, b: 1, f: 100, vn: 9 }, { t: 'lap', a: 0, f: 100 }], 0, 100).length === 0, '부딪힘(따로 hit)·랩 사건은 여기서 안 냄');
  const seq = (frames) => { const q = new SfxPicker(), out = []; for (const f of frames) { const c = q.countdown(f); if (c) out.push(`${f}:${c}`); } return out.join(' '); };
  const r1 = []; for (let f = 0; f <= 300; f++) r1.push(f);
  ok(seq(r1) === '60:lo 120:lo 180:lo 240:hi', `카운트다운 삐 3·2·1·출발 = ${seq(r1)}`);
  const r2 = []; for (let f = 0; f <= 300; f += 3) r2.push(f);
  ok(seq(r2) === '60:lo 120:lo 180:lo 240:hi', `느린 화면(3프레임씩)도 4번 = ${seq(r2)}`);
  const r3 = [0, 65, 179, 185, 175, 182, 243, 236, 250];   // 179 = '2' 단계를 1초 가까이 늦게 봄 → 조용히
  ok(seq(r3) === '65:lo 185:lo 243:hi', `롤백으로 프레임이 뒤로 가도 다시 안 울림 = ${seq(r3)}`);
  ok(seq([0, 3000, 3001]) === '', '레이스 중간에 들어오면(재접속) 삐 없음');
}

console.log(fail ? `실패 ${fail}개` : '전부 통과');
process.exit(fail ? 1 : 0);
