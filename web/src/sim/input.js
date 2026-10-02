// 입력 한 프레임을 정수 하나로 묶는다.
//
// 네트워크로 오가는 것은 이 정수뿐이다. 실수(float)를 그대로 보내면 PC마다 반올림이
// 달라질 여지가 생기므로, 보내기 전에 정해진 단계로 잘라 둔다(양자화).
//
//   비트  0~7  조향  (-127..127 을 +128 해서 1..255, 음수=왼쪽)
//   비트  8~12 가속  (0..31)
//   비트 13~17 브레이크 (0..31)
//   비트 18    드리프트(Shift) — 예전 사이드브레이크 자리
//   비트 19    차 되돌리기(리셋)
//   비트 20    키보드 조향(디지털) — 조향을 부드럽게 올리는 방식이 달라진다
//   비트 21    연결 끊김 — 서버가 대신 넣는다. 차가 서서히 멈추고 유령이 된다
//   비트 22    부스터(Ctrl) — 2026-10-02 카트식으로 바꾸며 추가 (서버도 23비트까지 받는다)

export const NEUTRAL = pack({ steer: 0, thr: 0, brk: 0, hb: 0, rst: 0, kb: 1, dc: 0 });

export function pack(i) {
  const s = Math.max(-127, Math.min(127, Math.round((i.steer || 0) * 127))) + 128;
  const t = Math.max(0, Math.min(31, Math.round((i.thr || 0) * 31)));
  const b = Math.max(0, Math.min(31, Math.round((i.brk || 0) * 31)));
  return (s | (t << 8) | (b << 13) | ((i.hb ? 1 : 0) << 18) | ((i.rst ? 1 : 0) << 19)
    | ((i.kb ? 1 : 0) << 20) | ((i.dc ? 1 : 0) << 21) | ((i.bo ? 1 : 0) << 22)) >>> 0;
}

/** 정수 → 사람이 읽는 값. 잘못된 값이면 중립으로 */
export function unpack(v, out = {}) {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v >= (1 << 23)) v = NEUTRAL;
  let s = (v & 255) - 128;
  if (s < -127) s = -127;
  out.steer = s / 127;
  out.thr = ((v >> 8) & 31) / 31;
  out.brk = ((v >> 13) & 31) / 31;
  out.hb = (v >> 18) & 1;
  out.rst = (v >> 19) & 1;
  out.kb = (v >> 20) & 1;
  out.dc = (v >> 21) & 1;
  out.bo = (v >> 22) & 1;
  return out;
}

export function isValid(v) {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < (1 << 23);
}
