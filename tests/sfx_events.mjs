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
  for (const [name] of picker.pick(evs, 0, F)) tally[name] = (tally[name] || 0) + 1;   // F = 시계 프레임(main.js 의 target)
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

// ── C: 따라잡기(2026-11-11 판정 sync-A2) — 재접속·중간 관전은 처음부터, 탭 복귀는 멈춘 곳부터 600프레임씩 묶어 계산한다(main.js loop).
//    묶음 끝의 session.frame 은 시계보다 한참 뒤라, session.frame 기준으로 '오래된 사건'을 거르면 묶음 끝 0.25초의 옛 사건이 소리·섬광을 냈다.
//    → 시계 프레임(target) 기준이면 시계보다 0.25초 넘게 지난 사건은 소리 0. 시계 바로 앞(지금 일어난) 사건만 소리 남
console.log('[따라잡기 — 재접속·중간 관전·탭 복귀 (600프레임 묶음)]');
{
  const PICKABLE = new Set(['boost', 'gain', 'inst', 'pad']);
  /** main.js loop 흉내: target 까지 따라잡는 동안 소리 개수 — 시계 기준(새)·session.frame 기준(옛) */
  const catchUp = (s, T) => {
    const pNew = new SfxPicker(), pOld = new SfxPicker(); let nNew = 0, nOld = 0, live = 0;
    while (s.frame < T) {
      s.advanceTo(T, T - s.frame > 120 ? 600 : 240);
      const evs = s.takeEvents();
      nNew += pNew.pick(evs, 0, T).length;
      nOld += pOld.pick(evs, 0, s.frame).length;
      live += evs.filter(e => e.a === 0 && PICKABLE.has(e.t) && T - e.f <= 15).length;   // 시계 바로 앞 = 지금 일어난 사건
    }
    return { nNew, nOld, live };
  };
  const fresh = () => { const s = new Session(cfg, 0); for (const [f, v] of myLog) s.addConfirmed(0, f, v); for (const [f, v] of remLog) s.addConfirmed(1, f, v); return s; };
  let newSum = 0, oldSum = 0, liveSum = 0, cases = 0;
  // 재접속·중간 관전: 처음부터
  for (const T of [END, END - 37, END - 400, END - 911, 1990]) { const r = catchUp(fresh(), T); newSum += r.nNew; oldSum += r.nOld; liveSum += r.live; cases++; }
  // 탭 복귀: H 까지 한 프레임씩 진행하다 탭이 숨겨졌고, 돌아오니 시계가 T
  for (let H = 300; H <= 1200; H += 45) {
    const s = fresh(), p = new SfxPicker();
    for (let F = 1; F <= H; F++) { s.advanceTo(F); p.pick(s.takeEvents(), 0, F); }
    const r = catchUp(s, Math.min(END, H + 1500)); newSum += r.nNew; oldSum += r.nOld; liveSum += r.live; cases++;
  }
  ok(oldSum > liveSum, `[재현] session.frame 기준(옛)이면 따라잡는 동안 소리 ${oldSum}개 (지금 일어난 사건 ${liveSum}개) — 이 시나리오가 문제를 실제로 일으킴`);
  ok(newSum === liveSum, `시계 기준이면 옛 사건 소리 0 — ${cases}가지 따라잡기에서 소리 ${newSum}개 = 지금 일어난 사건 ${liveSum}개`);
  // main.js 가 시계 프레임을 넘기는지 (브라우저 없이 확인할 수 있는 건 연결 문장뿐)
  const { readFileSync } = await import('node:fs');
  const mainSrc = readFileSync(new URL('../web/src/main.js', import.meta.url), 'utf8');
  ok(/this\.target = target;/.test(mainSrc) && /this\.sfx\.pick\(evs, follow, this\.target\)/.test(mainSrc), 'main.js: 효과음 고르기에 시계 프레임(this.target)을 넘김');
}

// ── D: 3인 실제 주행 + 늦게 오는 상대 입력(2026-11-11 판정 feel-A1) — 위 B 는 상대가 서 있어 내 차 역사는 안 바뀐다.
//    여기선 셋이 달리고 상대 입력을 가끔 크게 흔들어 '직전 입력 반복' 예측이 틀리게 → 내 차와 부딪힘·밀림까지 롤백으로 바뀐다.
//    정답(Sim 만으로 계산한 내 차 사건)과 귀에 들린 소리(engine.js 같은 소리 간격 적용)를 ±14프레임으로 짝짓는다.
{
  const GAP = { boost: 9, gain: 18, inst: 6, pad: 12 };   // engine.js _sfx 간격(초) × 60
  const SECS = 25, END3 = GO_FRAME + 60 * SECS;
  const cfg3 = { track: 'beach', laps: 3, players: [{ car: 'baram', name: 'A' }, { car: 'kongal', name: 'B' }, { car: 'masil', name: 'C' }] };
  // 햇살 해변 씨앗 4: 16초 안에 순간·획득·사용이 다 나옴(11/11 훑음 — 짧게 돌려도 시험할 거리가 있음)
  let rs = 4 * 7919 + 13; const rnd = () => ((rs = (rs * 1103515245 + 12345) % 2147483648) / 2147483648);
  const auth = new Sim(cfg3), logs = [[], [], []], last = [-1, -1, -1];
  const mems = [0, 1, 2].map(() => ({ stuckT: 0 })), hold = [0, 0, 0], ld = [-999, -999, -999], truth3 = [];
  for (let f = 0; f < END3; f++) {
    const inp = [];
    for (let k = 0; k < 3; k++) {
      const me = auth.cars[k];
      const i = { ...unpack(f < GO_FRAME + 4 ? pack({ kb: 1 }) : botInput(auth, k, [0.8, 0.9, 0.88][k], mems[k])) };
      if (f >= GO_FRAME + 4) {
        if (hold[k] > 0) { i.hb = 1; hold[k]--; }
        else if (f > GO_FRAME + 120 && Math.abs(i.steer) > 0.5 && me.out.speed > 20 && f - ld[k] > 150) { hold[k] = 42; ld[k] = f; i.hb = 1; }
        if (k > 0 && rnd() < 0.04) i.steer = rnd() < 0.5 ? -1 : 1;
      }
      const v = pack(i); if (v !== last[k]) { logs[k].push([f, v]); last[k] = v; }
      inp.push(v);
    }
    const c = auth.cars[0], b0 = c.st.boosts; c.out.inst = 0;
    auth.step(inp);
    if (c.st.boosts < b0) truth3.push(['boost', f]); else if (c.st.boosts > b0) truth3.push(['gain', f]);
    if (c.out.inst) truth3.push(['inst', f]);
    for (const e of auth.events) if (e.t === 'pad' && e.a === 0) truth3.push(['pad', f]);
  }
  const run = (base, jit) => {
    const s = new Session(cfg3, 0);
    for (const [f, v] of logs[0]) s.addConfirmed(0, f, v);
    const arr = [];
    // 도착 = 찍힌 프레임 + 늦음, 화면이 약 45ms(3프레임)마다 묶어 보내므로 3프레임 단위로 모아 도착
    for (const k of [1, 2]) for (const [f, v] of logs[k]) arr.push([Math.ceil((f + base + Math.floor(rnd() * jit)) / 3) * 3, k, f, v]);
    arr.sort((a, b) => a[0] - b[0]);
    const pk = new SfxPicker(), heard = [], lastT = {};
    let ri = 0;
    for (let F = 1; F <= END3; F++) {
      while (ri < arr.length && arr[ri][0] <= F) { s.addConfirmed(arr[ri][1], arr[ri][2], arr[ri][3]); ri++; }
      s.advanceTo(F);
      s.sim.cars[0].out.inst = 0;                                     // HUD 가 지움
      for (const e of s.takeEvents()) for (const [name] of pk.pick([e], 0, F)) {
        if (F - (lastT[name] ?? -999) < GAP[name]) continue;           // engine 같은 소리 간격 (화면 프레임 = 실제 시간)
        lastT[name] = F; heard.push([name, e.f]);
      }
    }
    while (ri < arr.length) { s.addConfirmed(arr[ri][1], arr[ri][2], arr[ri][3]); ri++; }
    s.advanceTo(END3);
    const used = new Set(); let miss = 0;
    for (const [n, f] of truth3) { const j = heard.findIndex(([hn, hf], i) => !used.has(i) && hn === n && Math.abs(hf - f) <= 14); if (j < 0) miss++; else used.add(j); }
    // 같은 사건 두 번: 같은 소리가 14프레임 안에 두 번 들렸는데 그 근처 정답은 하나 이하
    let dbl = 0;
    for (const n of Object.keys(GAP)) {
      const h = heard.filter(x => x[0] === n).map(x => x[1]).sort((a, b) => a - b);
      for (let i = 1; i < h.length; i++) if (h[i] - h[i - 1] <= 14 && truth3.filter(([tn, tf]) => tn === n && tf >= h[i - 1] - 14 && tf <= h[i] + 14).length < 2) dbl++;
    }
    return { rb: s.rollbacks, maxRb: s.maxRollback, hashOk: s.sim.hash() === auth.hash(), miss, extra: heard.length - used.size, dbl };
  };
  const cnt = truth3.reduce((o, [n]) => (o[n] = (o[n] || 0) + 1, o), {});
  console.log(`[3인 실제 주행 — 햇살 해변 ${SECS}초, 내 차 정답 ${truth3.length}개 ${JSON.stringify(cnt)}]`);
  ok(truth3.length >= 5 && cnt.inst && cnt.gain && cnt.boost, '정답에 순간·획득·사용 사건이 다 있다 (시험할 거리)');
  const a = run(3, 15);   // 상대 입력 3~17프레임 늦게 (보통 ~ 느린 인터넷)
  ok(a.rb > 200 && a.hashOk, `보통 지연(3~17프레임): 롤백 ${a.rb}번(최대 ${a.maxRb}) · 최종 해시 같음`);
  ok(a.miss === 0 && a.extra === 0 && a.dbl === 0, `보통 지연: 빠진 소리 ${a.miss} · 남는 소리 ${a.extra} · 두 번 ${a.dbl} (모두 0이어야)`);
  const b = run(45, 30);  // 45~74프레임 (0.75~1.23초 — 아주 나쁨)
  ok(b.hashOk && b.dbl === 0, `아주 나쁜 지연(45~74프레임): 같은 사건 두 번 ${b.dbl} · 최종 해시 같음`);
  console.log(`    (참고) 아주 나쁜 지연에서 빠진 소리 ${b.miss} · 예측이 틀린 소리 ${b.extra} — 롤백에 안전한 통로의 성질(충돌음·불꽃도 같음)`);
}

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
