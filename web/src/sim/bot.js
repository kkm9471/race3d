// 봇 운전사 — 자동 주행 시험, 완주 후 식힘 주행에 쓴다
//
// 1) 트랙마다 레이싱라인: 도로 폭 안에서 곡률이 작아지도록 중심선을 여러 번 펴 준다(여러 척도로).
// 2) 차마다 속도표: 그 라인의 곡률에서 접지 한계 속도 → 뒤에서부터 제동 가능한 속도로 깎는다.
// 3) 매 프레임: 앞쪽 라인 위 한 점을 향해 조향(pure pursuit), 속도표를 따라 가속/제동.
// 결정적 수학만 쓴다(봇 입력도 모든 화면에서 같아야 하므로).

import { datan, clamp } from './dmath.js';
import { pack } from './input.js';
import { G, KART, SURF_K, kartParams } from './car.js';

const lineCache = new Map();

export function racingLine(T) {
  if (lineCache.has(T)) return lineCache.get(T);
  const n = T.n;
  let o = new Float64Array(n);
  const lo = new Float64Array(n), hi = new Float64Array(n);
  for (let i = 0; i < n; i++) { const l = Math.max(0, T.hw[i] + Math.min(T.curbL[i], T.curbR[i]) * 0.4 - 1.4); lo[i] = -l; hi[i] = l; }
  // 지름길 분리대가 있는 곳(앞뒤 16m 포함)은 넓은 본 차선으로만 (봇은 지름길을 안 쓴다)
  if (T.divW) {
    const bd = new Float64Array(n).fill(NaN);
    for (const dir of [1, -1]) {
      let last = NaN, cnt = 0;
      for (let k = 0; k < 2 * n; k++) {
        const i = dir > 0 ? k % n : (2 * n - 1 - k) % n;
        if (T.divW[i] > 0) { last = T.div[i]; cnt = 8; bd[i] = T.div[i]; }
        else if (cnt > 0) { if (bd[i] !== bd[i]) bd[i] = last; cnt--; }
      }
    }
    for (let i = 0; i < n; i++) if (bd[i] === bd[i]) { if (bd[i] > 0) hi[i] = Math.min(hi[i], bd[i] - 3.0); else lo[i] = Math.max(lo[i], bd[i] + 3.0); }
  }
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
        o2[i] = clamp(o[i] - 0.05 * g, lo[i], hi[i]);
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

/** 차별 속도표 (카트식: 그냥 꺾어서 돌 수 있는 한계 aGrip 기준, 여유 12%) */
export function prepareBot(T, spec) {
  const { k } = racingLine(T);
  const n = T.n;
  const K = kartParams(spec);
  const aG = K.aGrip * 0.88;
  const vtop = K.vtop;
  const v = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    // 앞뒤 몇 샘플 중 가장 급한 곡률
    let kk = 0;
    for (let q = -3; q <= 3; q++) kk = Math.max(kk, Math.abs(k[(i + q + n) % n]));
    const sg = T.roadSurf ? SURF_K[T.roadSurf[i]][2] : 1;      // 빙판이면 그만큼 느리게
    v[i] = kk > 1e-6 ? Math.min(vtop, Math.sqrt(aG * sg / kk)) : vtop;
  }
  // 뒤에서부터: 다음 지점 속도까지 브레이크로 줄일 수 있어야 한다 (도는 중엔 여유를 조금 더)
  const ab = KART.BRAKE * 0.7;
  for (let pass = 0; pass < 2; pass++) {
    for (let q = n - 1; q >= 0; q--) {
      const i = q, j = (q + 1) % n;
      const aT = ab, aL = v[j] * v[j] * Math.abs(k[j]) * 0.5;
      const ax = Math.sqrt(Math.max(aT * aT - aL * aL, aT * aT * 0.0625));
      // 내리막이면 중력이 앞으로 밀어 제동에 쓸 몫이 준다(오르막은 반대) — 산길 내리막 코너에서 스핀하던 원인
      const vb = Math.sqrt(v[j] * v[j] + 2 * Math.max(ax + G * T.grade[j], ax * 0.3) * T.ds);
      if (vb < v[i]) v[i] = vb;
    }
  }
  return { v, a: ab };
}

/** 자리 k 의 차를 봇이 운전할 때의 입력 */
// mem: 막힘 타이머를 둘 곳. 시뮬 안(봇 자리·완주 후)은 st, 시험용 자동운전(?bot=1)은 시뮬 밖 객체를 넘긴다
// (시뮬 밖에서 st 를 건드리면 그 화면만 해시가 달라진다 — 독립검증 지적)
export function botInput(sim, k, skill = 0.95, mem = sim.cars[k].st) {
  const c = sim.cars[k], st = c.st, T = sim.T, n = T.n;
  const { o, k: kl } = racingLine(T);
  const RL = o;                 // 레이싱라인 가로 위치 (아래 반복문 안의 o 는 다른 차)
  const prof = c.botData.v;
  const L = sim.world.locate(st.px, st.pz, st.hint);
  const i = L.i;
  const { qw, qx, qy, qz } = st;
  const fx = 2 * (qx * qz + qw * qy), fz = 1 - 2 * (qx * qx + qy * qy);
  const lx = 1 - 2 * (qy * qy + qz * qz), lz = 2 * (qx * qz - qw * qy);
  const v = st.vx * fx + st.vz * fz;
  const sp = Math.sqrt(st.vx * st.vx + st.vz * st.vz);
  // 속도
  let vt = Infinity;
  const ahead = 2 + Math.round(Math.abs(v) * 0.25 / T.ds);
  for (let q = 0; q <= ahead; q++) vt = Math.min(vt, prof[(i + q) % n]);
  vt *= skill;
  // 다른 차: 앞차와는 속도에 맞는 거리를 두고(범퍼로 밀지 않게), 내가 더 빠르면 빈 쪽으로 비켜 추월,
  // 나란히면 서로 옆으로 벌린다. 옆 위치는 트랙 기준 가로 위치(off)로 정한다.
  let want = null;
  for (let q = 0; q < sim.cars.length && !mem.ram; q++) {
    if (q === k) continue;
    const o = sim.cars[q].st;
    if (o.ghostT > 0 || o.dc || o.fin) continue;
    const ox = o.px - st.px, oz = o.pz - st.pz;
    const ahead = ox * fx + oz * fz, side = ox * lx + oz * lz;
    const len = (c.P.Lb + sim.cars[q].P.Lb) / 2;
    const away = st.off >= o.off ? 1 : -1;            // 상대에게서 멀어지는 가로 방향
    // 레이싱라인 위에 서 있거나 느린 차는 트랙을 따라 잰 거리로 제동 거리까지 내다보고 미리 줄인다
    // (3차 독립검증: 감지 창 10+0.8v 가 제동 거리보다 짧아, 스핀해 선 사람 차를 최대 147km/h 로 들이받았다)
    const dAl = ((o.hint - i + n) % n) * T.ds;
    if (dAl > len && dAl < 10 + Math.abs(v) * 0.8 + v * v / (2 * c.botData.a) && Math.abs(o.off - RL[o.hint]) < 2.3) {
      const ovT = Math.max(0, o.vx * T.tx[o.hint] + o.vz * T.tz[o.hint]);
      // 다가가는 속도 하한 12m/s — 아예 서 버리면 되돌리기만 되풀이한다. 가까워지면 아래 추월 판단으로 비켜 간다
      vt = Math.min(vt, ovT + Math.max(12, Math.sqrt(2 * c.botData.a * Math.max(0, dAl - len - 2 - Math.abs(v) * 0.12))));
    }
    const ov = o.vx * fx + o.vz * fz, cl = Math.max(0, v - ov);
    if (ahead > len * 0.9 && ahead < 10 + Math.abs(v) * 0.8 + cl * cl / (2 * c.botData.a) && Math.abs(side) < 2.3) {
      const gap = ahead - len;
      if (vt > ov + 1.5) want = o.off + away * 3.2;      // 더 빠르다 → 옆으로 빠져 추월
      // 옆으로 충분히 벌어지기 전에는 차간 거리를 지킨다
      if (Math.abs(side) < 1.9) vt = Math.min(vt, ov + (gap - (2 + Math.abs(v) * 0.12)) * 0.6);
    } else if (Math.abs(ahead) <= len * 0.9 && Math.abs(side) < 2.8) {
      want = st.off + away * 1.5;                     // 나란히 → 옆으로 벌린다
      if (ahead > 0) vt *= 0.9;                       // 조금 뒤인 쪽이 양보(좁은 길에서 계속 비비지 않게)
    }
  }
  // 조향: 앞쪽 라인 위 한 점 (추월·벌리기 중이면 그 가로 위치로)
  const Ld = 6 + 0.42 * Math.abs(v);
  const j = (i + Math.round(Ld / T.ds)) % n;
  const room = Math.max(0, T.hw[j] - 1.3);
  const oj = want === null ? o[j] : clamp(want, -room, room);
  const tx = T.x[j] + T.lx[j] * oj, tz = T.z[j] + T.lz[j] * oj;
  const dx = tx - st.px, dz = tz - st.pz;
  const lat = dx * lx + dz * lz, fw = dx * fx + dz * fz;
  const curv = 2 * lat / Math.max(lat * lat + fw * fw, 1);
  // 카트식: 조향 = 목표 회전 속도 / 그 속도의 최대 회전 속도 (+ = 오른쪽, 회전은 왼쪽이 +)
  const steer = clamp(-(Math.abs(v) * curv) / Math.max(c.yawMax(v), 0.05), -1, 1);
  let thr = 0, brk = 0;
  if (v < vt) thr = clamp((vt - v) * 0.6 + 0.3, 0, 1);
  else if (v > vt + 0.8) brk = clamp((v - vt) * 0.3, 0, 1);
  // 드리프트·부스터(카트식): 빠른 속도로 크게 꺾어야 하는 코너에서는 Shift 로 게이지를 모으고,
  // 앞이 한동안 트여 있으면 모은 부스터를 쓴다. 시험용 자동운전(ram)은 안 쓴다.
  let hb = 0, bo = 0;
  if (!mem.ram && sim.gs.frame > 300) {
    let kk = 0;
    const look = Math.round((10 + Math.abs(v) * 0.6) / T.ds);
    for (let q = 0; q <= look; q++) kk = Math.max(kk, Math.abs(kl[(i + q) % n]));
    // 옆에 차가 있거나(15m 안) 피하는 중이면 드리프트하지 않는다 — 몰려 있을 때 드리프트하면 바깥으로 밀려 나가 자갈·벽에 갇혔다
    let crowd = want !== null;
    for (let q = 0; q < sim.cars.length && !crowd; q++) { if (q === k) continue; const o2 = sim.cars[q].st; if (o2.ghostT > 0 || o2.dc || o2.fin) continue; const dx2 = o2.px - st.px, dz2 = o2.pz - st.pz; if (dx2 * dx2 + dz2 * dz2 < 225) crowd = true; }
    // 반지름 26m 보다 좁은 헤어핀은 드리프트하면 바깥으로 밀려 벽에 닿는다(설원 급행·황혼 항구) → 그냥 꺾는다
    const tight = kk > 1 / 26;
    if (!crowd && !tight && ((Math.abs(v) > 16 && kk > 1 / 70 && Math.abs(steer) > 0.3) || (st.drift && Math.abs(steer) > 0.15 && kk > 1 / 90))) hb = 1;
    if (st.boosts > 0 && st.boostT === 0 && !st.drift) {
      let vmin = Infinity;
      const far = Math.round(90 / T.ds);
      for (let q = 0; q <= far; q++) vmin = Math.min(vmin, prof[(i + q) % n]);
      // 앞 150m 안에 점프대가 있으면 안 쓴다 (공중에선 브레이크가 안 돼 착지 뒤 코너에서 박는다)
      for (let q = 0; q <= Math.round(150 / T.ds) && vmin > 0; q++) if (T.ramp[(i + q) % n] > 0) vmin = 0;
      if (vmin * skill > Math.abs(v) + 4) bo = 1;
    }
  }
  if (st.drift) thr = Math.max(thr, 0.6);          // 드리프트 중엔 속도 유지
  // 옆으로 크게 미끄러지면(드리프트가 아닌데) 가속을 풀어 준다
  const vlat = st.vx * lx + st.vz * lz;
  if (Math.abs(vlat) > 2.5 && sp > 5 && !st.drift) thr *= 0.4;
  // 막혔거나 거꾸로 섰으면 되돌리기
  let rst = 0;
  const along = fx * T.tx[i] + fz * T.tz[i];
  if (sim.gs.frame > 300) {
    if (sp < 1.0) mem.stuckT = (mem.stuckT || 0) + 1 / 60; else mem.stuckT = 0;
    if (mem.stuckT > 2.5 || along < -0.2 || st.flipT > 1) { rst = 1; mem.stuckT = 0; }
  }
  return pack({ steer, thr, brk, hb, bo, kb: 0, rst: rst && !st.lastRst ? 1 : 0 });
}
