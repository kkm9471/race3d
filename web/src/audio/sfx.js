// 사건 효과음 고르기 (2026-11-11) — "무슨 소리를 언제 낼지"만 정한다. 소리를 실제로 내는 건 engine.js.
// 브라우저 없이 Node 시험(tests/sfx_events.mjs)에서 실제 Session·롤백과 같이 돌려 보려고 따로 두었다.
//
// 사건은 Session 의 화면 효과용 사건 통로(takeEvents)로 받는다 — 롤백으로 다시 계산한 프레임은 다시 내보내지 않는 곳.
//   boost = 부스터 사용(Ctrl) · gain = 게이지가 차서 부스터 획득 · inst = 순간(k 1)·출발(k 2)부스터 · pad = 가속 발판
// (out.inst 를 직접 읽지 않는다: HUD 가 소리보다 먼저 읽고 지우고, 롤백 재계산 때 다시 켜져 두 번 잡힌다 — 11/11 반증 실측)
//
// 화면이 따라가는 차(보통 내 차)의 사건만 소리를 낸다. 남의 차는 안 낸다:
//   ① 멀티에서 남의 입력은 늦게 도착해, 그 사건은 대개 이미 지나간 프레임을 다시 계산할 때 생긴다 → 통로가 안 내보내고, 나와도 예측이라 틀릴 수 있다
//   ② 셋에 AI 까지 부스터 소리가 섞이면 "내 부스터가 나갔나"를 귀로 못 가린다. 남의 차는 엔진음으로 충분하다
import { FPS, GO_FRAME } from '../sim/race.js';

const STALE = 15;                                // 0.25초보다 오래된 사건은 소리 안 냄 (탭에 돌아와 몇 초치를 한꺼번에 계산할 때 몰아서 울리지 않게)
const CD = [FPS, 2 * FPS, 3 * FPS, GO_FRAME];    // 화면 숫자 3·2·1·출발이 바뀌는 프레임 (hud.js 와 같은 셈)
const CD_LATE = 20;                              // 이만큼 지나서야 본 단계(재접속·따라잡기)는 조용히 넘긴다

export class SfxPicker {
  constructor() { this.cd = 0; }

  /** 사건 목록 → [소리 이름, 인자] 목록 (이름 = EngineAudio 의 함수 이름) */
  pick(events, follow, frame) {
    const out = [];
    for (const e of events) {
      if (e.a !== follow || frame - e.f > STALE) continue;
      if (e.t === 'boost') out.push(['boost']);
      else if (e.t === 'gain') out.push(['gain']);
      else if (e.t === 'inst') out.push(['inst', e.k]);
      else if (e.t === 'pad') out.push(['pad']);
    }
    return out;
  }

  /** 카운트다운 삐: 화면 숫자와 같은 때 'lo'(3·2·1)·'hi'(출발). 롤백으로 프레임이 뒤로 가도 같은 단계는 다시 안 울린다 */
  countdown(frame) {
    let st = 0;
    while (st < CD.length && frame >= CD[st]) st++;
    if (st <= this.cd) return null;
    this.cd = st;
    if (frame - CD[st - 1] > CD_LATE) return null;
    return st === CD.length ? 'hi' : 'lo';
  }
}
