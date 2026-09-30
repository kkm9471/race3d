// 봇 운전사 — 자동 주행 시험, 완주 후 식힘 주행에 쓴다
//
// 1) 트랙마다 레이싱라인: 도로 폭 안에서 곡률이 작아지도록 중심선을 여러 번 펴 준다(여러 척도로).
// 2) 차마다 속도표: 그 라인의 곡률에서 접지 한계 속도 → 뒤에서부터 제동 가능한 속도로 깎는다.
// 3) 매 프레임: 앞쪽 라인 위 한 점을 향해 조향(pure pursuit), 속도표를 따라 가속/제동.
// 결정적 수학만 쓴다(봇 입력도 모든 화면에서 같아야 하므로).

import { datan, clamp } from './dmath.js';
import { pack } from './input.js';
import { G } from './car.js';

const lineCache = new Map();

export function racingLine(T) {
  if (lineCache.has(T)) return lineCache.get(T);
  const n = T.n;
  let o = new Float64Array(n);
  const lim = new Float64Array(n);
  for (let i = 0; i < n; i++) lim[i] = Math.max(0, T.hw[i] + Math.min(T.curbL[i], T.curbR[i]) * 0.4 - 1.4);
  // 곡률(2차 차분)이 고르게 되도록 4차 차분을 줄인다. 원은 그대로 두고 꺾인 곳만 펴진다.
  // (이웃 중점으로 당기는 방식은 코스 전체를 안쪽으로 오그라뜨려서 쓰면 안 된다)
  const P = (i, oo) => [T.x[i] + T.lx[i] * oo[i], T.z[i] + T.lz[i] * oo[i]];
  for (const h of [16, 8, 4, 2, 1]) {
    for (let it = 0; it < 300; it++) {
      const o2 = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const a2 = P((i - 2 * h + 2 * n) % n, o), a1 = P((i - h + n) % n, o), p0 = P(i, o);
        const b1 = P((i + h) % n, o), b2 = P((i + 2 * h) % n, o);
        const dx = a2[0] - 4 * a1[0] + 6 * p0[0] - 4 * b1[0] + b2[0];
        const dz = a2[1] - 4 * a1[1] + 6 * p0[1] - 4 * b1[1] + b2[1];
        const g = dx * T.lx[i] + dz * T.lz[i];
        o2[i] = clamp(o[i] - 0.05 * g, -lim[i], lim[i]);
      }
      o = o2;
    }
  }
  // 라인 곡률
  const k = new Float64Array(n);
  const h = 3;
  for (let i = 0; i < n; i++) {
    const a = (i - h + n) % n, b = (i + h) % n;
    const ax = T.x[a] + T.lx[a] * o[a], az = T.z[a] + T.lz[a] * o[a];
    const px = T.x[i] + T.lx[i] * o[i], pz = T.z[i] + T.lz[i] * o[i];
    const bx = T.x[b] + T.lx[b] * o[b], bz = T.z[b] + T.lz[b] * o[b];
    const ux = px - ax, uz = pz - az, vx = bx - px, vz = bz - pz, wx = bx - ax, wz = bz - az;
    const cr = ux * vz - uz * vx;
    const d = Math.sqrt((ux * ux + uz * uz) * (vx * vx + vz * vz) * (wx * wx + wz * wz));
    k[i] = d > 1e-9 ? 2 * cr / d : 0;
  }
  const res = { o, k };
  lineCache.set(T, res);
  return res;
}

/** 차별 속도표 */
export function prepareBot(T, spec) {
  const { k } = racingLine(T);
  const n = T.n;
  const m = spec.mass;
  const mu = spec.tire.mu * 0.80;                       // 원선회 시험에서 잰 g ≈ 0.88μ, 여유를 둔다
  const aero = 0.5 * 0.5 * 1.225 * (spec.aero.clA || 0) / m;  // 다운포스 → 속도² 당 추가 가속 (절반만 믿는다)
  const vtop = (spec.target?.vmax?.[1] || 250) / 3.6;
  const v = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    // 앞뒤 몇 샘플 중 가장 급한 곡률
    let kk = 0;
    for (let q = -3; q <= 3; q++) kk = Math.max(kk, Math.abs(k[(i + q + n) % n]));
    const den = kk - mu * aero;
    v[i] = den > 1e-6 ? Math.min(vtop, Math.sqrt(mu * G / den)) : vtop;
  }
  // 뒤에서부터: 다음 지점 속도까지 제동으로 줄일 수 있어야 한다
  const ab = spec.tire.mu * 0.80 * G;
  for (let pass = 0; pass < 2; pass++) {
    for (let q = n - 1; q >= 0; q--) {
      const i = q, j = (q + 1) % n;
      const vb = Math.sqrt(v[j] * v[j] + 2 * (ab + aero * v[j] * v[j] * spec.tire.mu) * T.ds);
      if (vb < v[i]) v[i] = vb;
    }
  }
  return { v };
}

/** 자리 k 의 차를 봇이 운전할 때의 입력 */
export function botInput(sim, k, skill = 0.95) {
  const c = sim.cars[k], st = c.st, T = sim.T, n = T.n;
  const { o } = racingLine(T);
  const prof = c.botData.v;
  const L = sim.world.locate(st.px, st.pz, st.hint);
  const i = L.i;
  const { qw, qx, qy, qz } = st;
  const fx = 2 * (qx * qz + qw * qy), fz = 1 - 2 * (qx * qx + qy * qy);
  const lx = 1 - 2 * (qy * qy + qz * qz), lz = 2 * (qx * qz - qw * qy);
  const v = st.vx * fx + st.vz * fz;
  const sp = Math.sqrt(st.vx * st.vx + st.vz * st.vz);
  // 조향: 앞쪽 라인 위 한 점
  const Ld = 6 + 0.42 * Math.abs(v);
  const j = (i + Math.round(Ld / T.ds)) % n;
  const tx = T.x[j] + T.lx[j] * o[j], tz = T.z[j] + T.lz[j] * o[j];
  const dx = tx - st.px, dz = tz - st.pz;
  const lat = dx * lx + dz * lz, fw = dx * fx + dz * fz;
  const curv = 2 * lat / Math.max(lat * lat + fw * fw, 1);
  const delta = datan(c.P.spec.wb * curv);
  const lim = c.steerLimit();
  let steer = clamp(-delta / lim, -1, 1);
  // 속도
  let vt = Infinity;
  const ahead = 2 + Math.round(Math.abs(v) * 0.25 / T.ds);
  for (let q = 0; q <= ahead; q++) vt = Math.min(vt, prof[(i + q) % n]);
  vt *= skill;
  // 바로 앞에 느린 차가 있으면 속도를 맞추고 옆으로 비킨다(단순 회피)
  let dodge = 0;
  for (let q = 0; q < sim.cars.length; q++) {
    if (q === k) continue;
    const o = sim.cars[q].st;
    if (o.ghostT > 0 || o.dc || o.fin) continue;
    const ox = o.px - st.px, oz = o.pz - st.pz;
    const ahead = ox * fx + oz * fz, side = ox * lx + oz * lz;
    const len = (c.P.Lb + sim.cars[q].P.Lb) / 2;
    if (ahead > len * 0.9 && ahead < 8 + Math.abs(v) * 0.6 && Math.abs(side) < 2.1) {
      // 정말 앞에 있다 → 속도를 맞추고 비킬 쪽으로
      const ov = o.vx * fx + o.vz * fz;
      if (ov < v) {
        vt = Math.min(vt, ov + Math.max(0, ahead - len - 2) * 0.5);
        dodge = side >= 0 ? -1 : 1;
      }
    } else if (Math.abs(ahead) <= len * 0.9 && Math.abs(side) < 2.8) {
      // 나란히 붙어 있다 → 속도는 그대로, 옆으로만 살짝 벌린다
      dodge = side >= 0 ? -0.6 : 0.6;
      if (ahead > 0) vt *= 0.9;     // 내가 조금 뒤면 양보해서 떨어진다(좁은 길에서 계속 비비지 않게)
    }
  }
  if (dodge) steer = clamp(steer + dodge * 0.25, -1, 1);
  let thr = 0, brk = 0;
  if (v < vt) thr = clamp((vt - v) * 0.6 + 0.3, 0, 1);
  else if (v > vt + 0.8) brk = clamp((v - vt) * 0.3, 0, 1);
  // 옆으로 크게 미끄러지면 가속을 풀어 준다
  const vlat = st.vx * lx + st.vz * lz;
  if (Math.abs(vlat) > 2.5 && sp > 5) thr *= 0.4;
  // 막혔거나 거꾸로 섰으면 되돌리기
  let rst = 0;
  const along = fx * T.tx[i] + fz * T.tz[i];
  if (sim.gs.frame > 300) {
    if (sp < 1.0) st.stuckT = (st.stuckT || 0) + 1 / 60; else st.stuckT = 0;
    if (st.stuckT > 2.5 || along < -0.2 || st.flipT > 1) { rst = 1; st.stuckT = 0; }
  }
  return pack({ steer, thr, brk, kb: 0, rst: rst && !st.lastRst ? 1 : 0 });
}
