// 결정적(deterministic) 수학
//
// 세 사람의 PC가 같은 입력으로 똑같은 결과를 내야 충돌 결과가 세 화면에서 같아진다.
// 덧셈·곱셈·나눗셈·Math.sqrt 는 IEEE-754 규격이라 어느 PC에서나 비트 단위로 같지만,
// Math.sin/cos/atan2/exp/pow/hypot 은 브라우저·버전마다 마지막 자리가 다를 수 있다.
// 그래서 시뮬레이션(물리·순위·봇)에서는 이 파일의 함수만 쓴다. 화면 그리기는 상관없다.

export const PI = 3.141592653589793;
export const TAU = 6.283185307179586;
export const HALF_PI = 1.5707963267948966;

/** sin — [-π/2, π/2]로 접은 뒤 15차 테일러 (오차 < 1e-9) */
export function dsin(x) {
  x = x - Math.round(x / TAU) * TAU;
  if (x > HALF_PI) x = PI - x;
  else if (x < -HALF_PI) x = -PI - x;
  const x2 = x * x;
  return x * (1 + x2 * (-1 / 6 + x2 * (1 / 120 + x2 * (-1 / 5040 + x2 * (1 / 362880
    + x2 * (-1 / 39916800 + x2 * (1 / 6227020800 + x2 * (-1 / 1307674368000))))))));
}

export function dcos(x) { return dsin(x + HALF_PI); }

/** atan — 반각 공식으로 |z| ≤ 0.414 로 줄인 뒤 테일러 (오차 < 1e-8) */
export function datan(z) {
  let sign = 1;
  if (z < 0) { z = -z; sign = -1; }
  let inv = false;
  if (z > 1) { z = 1 / z; inv = true; }
  const zh = z / (1 + Math.sqrt(1 + z * z));
  const z2 = zh * zh;
  let a = zh * (1 + z2 * (-1 / 3 + z2 * (1 / 5 + z2 * (-1 / 7 + z2 * (1 / 9 + z2 * (-1 / 11
    + z2 * (1 / 13 + z2 * (-1 / 15 + z2 * (1 / 17 + z2 * (-1 / 19))))))))));
  a *= 2;
  if (inv) a = HALF_PI - a;
  return sign * a;
}

export function datan2(y, x) {
  if (x > 0) return datan(y / x);
  if (x < 0) return y >= 0 ? datan(y / x) + PI : datan(y / x) - PI;
  if (y > 0) return HALF_PI;
  if (y < 0) return -HALF_PI;
  return 0;
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

/** 표(정렬된 x)에서 선형 보간 — 엔진 토크 곡선 등 */
export function lerpTable(xs, ys, x) {
  const n = xs.length;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];
  let i = 1;
  while (xs[i] < x) i++;
  const t = (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
  return ys[i - 1] + (ys[i] - ys[i - 1]) * t;
}

/** 결정적 난수 (mulberry32) — 봇 성격 등 */
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
