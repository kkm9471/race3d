// 봇 운전사 — 자동 주행 시험, 완주 후 식힘 주행에 쓴다
//
// 1) 트랙마다 레이싱라인: 도로 폭 안에서 곡률이 작아지도록 중심선을 여러 번 펴 준다(여러 척도로).
// 2) 차마다 속도표: 그 라인의 곡률에서 접지 한계 속도 → 뒤에서부터 제동 가능한 속도로 깎는다.
// 3) 매 프레임: 앞쪽 라인 위 한 점을 향해 조향(pure pursuit), 속도표를 따라 가속/제동.
// 결정적 수학만 쓴다(봇 입력도 모든 화면에서 같아야 하므로).

import { datan, clamp } from './dmath.js';
import { pack } from './input.js';
import { G, KART, SURF_K, kartParams, K_DRIFT } from './car.js';

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
/** 꺾는 쪽(dir +1 오른쪽) 벽까지 남은 거리 — 지름길 분리대가 그쪽에 있으면 분리대까지 */
function innerGap(T, i, dir, off) {
  let g = dir > 0 ? T.wallR[i] + off : T.wallL[i] - off;
  if (T.divW[i] > 0) {
    const dv = T.div[i], w = T.divW[i];
    if (dir > 0 && off > dv) g = Math.min(g, off - (dv + w));
    if (dir < 0 && off < dv) g = Math.min(g, (dv - w) - off);
  }
  return g;
}

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
            // 더 빠르다 → 옆으로 빠져 추월
      // 옆으로 충분히 벌어지기 전에는 차간 거리를 지킨다
      if (Math.abs(side) < 1.9) vt = Math.min(vt, ov + (gap - (2 + Math.abs(v) * 0.12)) * 0.6);
    } else if (Math.abs(ahead) <= len * 0.9 && Math.abs(side) < 2.8) {
      // 나란히 → 옆으로 벌린다. 다만 상대에게서 4m 넘게는 안 벌린다 (둘이 계속 벌어지다 다시 모이며 길 폭 전체를 흔들다 풀밭에 갇혔다 — 14회차, 이끼숲)
      
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
  let steer = clamp(-(Math.abs(v) * curv) / Math.max(c.yawMax(v), 0.05), -1, 1);
  let thr = 0, brk = 0;
  if (v < vt) thr = clamp((vt - v) * 0.6 + 0.3, 0, 1);
  else if (v > vt + 0.8) brk = clamp((v - vt) * 0.3, 0, 1);
  // 드리프트·부스터(카트식): 빠른 속도로 크게 꺾어야 하는 코너에서는 Shift 로 게이지를 모으고,
  // 앞이 한동안 트여 있으면 모은 부스터를 쓴다. 시험용 자동운전(ram)은 안 쓴다.
  let hb = 0, bo = 0;
  // AI 드리프트 (2026-10-02 2차 드리프트로 바뀐 뒤): 새 드리프트는 최소 초당 약 1rad 를 돌아, 접지 한계 속도로 코너에 들어가는
  // 지금 AI 운전 방식과는 맞지 않는다(안쪽·바깥 벽에 박음). 드리프트로 코너를 도는 AI 운전은 따로 만들 때까지 끈다 → 개선목록
  const AI_DRIFT = false;
  if (!mem.ram && sim.gs.frame > 300) {
    let kk = 0;
    const look = Math.round((10 + Math.abs(v) * 0.6) / T.ds);
    for (let q = 0; q <= look; q++) kk = Math.max(kk, Math.abs(kl[(i + q) % n]));
    // 옆에 차가 있거나(15m 안) 피하는 중이면 드리프트하지 않는다 — 몰려 있을 때 드리프트하면 바깥으로 밀려 나가 자갈·벽에 갇혔다
    let crowd = want !== null;
    for (let q = 0; q < sim.cars.length && !crowd; q++) { if (q === k) continue; const o2 = sim.cars[q].st; if (o2.ghostT > 0 || o2.dc || o2.fin) continue; const dx2 = o2.px - st.px, dz2 = o2.pz - st.pz; if (dx2 * dx2 + dz2 * dz2 < 225) crowd = true; }
    // 드리프트(2026-10-02 2차 — 오래 누를수록 더 꺾이는 카트라이더식): 드리프트는 최소한 초당 약 1rad 를 돌므로
    // 그만큼 꺾어야 하는 코너(속도 × 곡률이 큰 곳)에서만 쓴다. 중간에는 필요한 만큼만 돌도록 방향키를 눌렀다 놓았다 한다.
    // 드리프트 중엔 머리와 가는 방향이 30~50° 갈라지므로, 꺾을 양은 '가는 방향' 기준으로 잰다
    // (머리 기준이면 진입하자마자 머리가 돌아 '다 돌았다'고 착각해 0.1초 만에 놓았다)
    let cv = curv;
    if ((st.drift || st.gripT < 0.3) && sp > 5) {
      // 드리프트는 레이싱라인(안쪽 벽에 붙는 선)보다 더 돌기 쉬우므로 길 가운데를 겨눈다 (안쪽 벽과 여유)
      const cx = T.x[j] - st.px, cz = T.z[j] - st.pz;
      const dvx = st.vx / sp, dvz = st.vz / sp, latV = cx * dvz - cz * dvx, fwV = cx * dvx + cz * dvz;
      cv = 2 * latV / Math.max(latV * latV + fwV * fwV, 1);
    }
    const needDir = cv < 0 ? 1 : -1;                   // 꺾을 방향 (+ 오른쪽)
    const wNeed = Math.abs(v) * Math.abs(cv);          // 지금 필요한 회전 속도(rad/s)
    if (!AI_DRIFT) { /* 드리프트 안 함 */ }
    else if (st.drift) {
      // 미끄럼각이 클수록 경로가 더 휜다 (car.js: 옆 가속 = K_DRIFT·옆속도 + 안쪽으로 감기는 힘)
      const vlat0 = st.vx * lx + st.vz * lz, tb = Math.abs(vlat0) / Math.max(Math.abs(v), 1);
      const have = K_DRIFT * tb + KART.centripetalStrength * 0.75;
      // 아직 줄여야 할 속도가 남았으면(드리프트 감속을 브레이크 대신) 계속
      // 필요한 것보다 많이 돌고 있으면(안쪽 벽으로 파고듦) 놓는다
      // 안쪽 벽까지 남은 거리 — 2.2m 안으로 파고들면 카운터로 바로 편다
      // 0.3초 뒤 안쪽 여유(옆으로 파고드는 속도까지) — 2m 안이면 카운터로 바로 편다
      const vOff = st.vx * T.lx[i] + st.vz * T.lz[i];
      const inner = innerGap(T, i, st.ddir, st.off || 0) - Math.max(0, st.ddir > 0 ? -vOff : vOff) * 0.3;
      if (inner < 2.0) steer = -st.ddir;
      else if (needDir === st.ddir && wNeed > 0.45 && kk * Math.abs(v) > 0.6 && have < wNeed * 1.2 + 0.1 && v < vt + 4) { hb = 1; steer = st.ddir * (have < wNeed ? 1 : 0); }
      // 다 돌았거나 반대로 꺾어야 하면 Shift 를 놓는다 (조향은 평소대로 — 미끄러져 나오며 펴진다)
    // 반지름 26m 보다 좁은 헤어핀은 AI 는 드리프트로 들어가지 않는다(안쪽 벽이 가까워 파고들다 박았다)
    } else if (!crowd && kk < 1 / 26 && Math.abs(v) > 16 && Math.abs(steer) > 0.25 && kk * Math.abs(v) > 0.8 && wNeed > 0.7 && v < vt + 3
      && innerGap(T, i, needDir, st.off || 0) > 3.5 && steer * needDir > 0 && st.gripT > 0.4 && st.alT <= 0) { hb = 1; steer = needDir; }   // 꺾을 쪽으로만, 펴자마자 다시는 안 함   // 드리프트는 최소 초당 약 1rad 를 돈다 → 그만큼 꺾어야 하는 코너에서, 안쪽 벽과 여유가 있을 때만
    // (드리프트를 브레이크 대신 쓰게 했더니 빠르게 들어간 헤어핀에서 바깥 벽으로 미끄러졌다 → AI 는 브레이크를 그대로 쓴다)
    if (st.boosts > 0 && st.boostT === 0 && !st.drift) {
      let vmin = Infinity;
      const far = Math.round(90 / T.ds);
      for (let q = 0; q <= far; q++) vmin = Math.min(vmin, prof[(i + q) % n]);
      // 앞 150m 안에 점프대가 있으면 안 쓴다 (공중에선 브레이크가 안 돼 착지 뒤 코너에서 박는다)
      for (let q = 0; q <= Math.round(150 / T.ds) && vmin > 0; q++) if (T.ramp[(i + q) % n] > 0) vmin = 0;
      if (vmin * skill > Math.abs(v) + 4) bo = 1;
    }
  }
  if (st.drift) thr = Math.max(thr, 0.6);          // 드리프트 중에도 가속 키는 누른다 (드리프트 감속은 어차피 생긴다)
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
