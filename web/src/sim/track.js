// 트랙 — 설계도(직선·원호 목록) → 2m 간격 중심선 샘플 → 물리 조회(노면 높이·법선·노면 종류·벽)
//
// 물리와 그래픽이 이 파일 하나의 결과를 같이 쓴다. 그래서 "보이는 벽"과 "부딪히는 벽"이 어긋날 수 없다.
//
// 좌표: 트랙 위 한 점을 (s, d) 로 나타낸다. s = 출발선부터 중심선을 따라 간 거리, d = 중심선에서
// 왼쪽(+)/오른쪽(-)으로 떨어진 거리. 노면 높이·연석·잔디·벽은 전부 (s, d)의 함수다.
//
// 방향: yaw ψ 의 진행방향 = (sin ψ, 0, cos ψ). 왼쪽 = (cos ψ, 0, -sin ψ). 곡률 κ>0 = 왼쪽으로 굽음.

import { dsin, dcos, datan2, clamp } from './dmath.js';
import { SURF } from './car.js';

const DS_FINE = 0.5;     // 설계도를 적분하는 간격
const STEP = 4;          // 샘플 간격 = DS_FINE × STEP = 2 m

/** 설계도 → 곡률 배열 */
function curvatureList(segs) {
  const k = [];
  for (const sg of segs) {
    if (sg[0] === 'S') {
      const n = Math.round(sg[1] / DS_FINE);
      for (let i = 0; i < n; i++) k.push(0);
    } else {
      const R = sg[1], deg = sg[2];
      const len = Math.abs(deg) * Math.PI / 180 * R;
      const n = Math.round(len / DS_FINE);
      const kk = (deg > 0 ? 1 : -1) / R;
      // 반올림으로 생긴 각도 오차를 곡률에 흡수 → 총 회전각이 정확히 deg
      const exact = (deg * Math.PI / 180) / (n * DS_FINE);
      for (let i = 0; i < n; i++) k.push(exact);
      void kk;
    }
  }
  return k;
}

/** 원형 이동평균 (완화곡선 효과) */
function smoothCirc(a, win) {
  const n = a.length, h = Math.max(1, Math.round(win / 2));
  const out = new Float64Array(n);
  let sum = 0;
  for (let i = -h; i <= h; i++) sum += a[(i + n) % n];
  for (let i = 0; i < n; i++) {
    out[i] = sum / (2 * h + 1);
    sum += a[(i + h + 1) % n] - a[(i - h + n) % n];
  }
  return out;
}

function integrate(k, x0, z0, psi0) {
  const n = k.length;
  const x = new Float64Array(n + 1), z = new Float64Array(n + 1), psi = new Float64Array(n + 1);
  x[0] = x0; z[0] = z0; psi[0] = psi0;
  for (let i = 0; i < n; i++) {
    const pm = psi[i] + k[i] * DS_FINE / 2;          // 중점 적분
    x[i + 1] = x[i] + dsin(pm) * DS_FINE;
    z[i + 1] = z[i] + dcos(pm) * DS_FINE;
    psi[i + 1] = psi[i] + k[i] * DS_FINE;
  }
  return { x, z, psi };
}

/** 폐곡선이 되도록 지정한 직선 두 개의 길이를 조정한다 */
function closeLoop(def) {
  const segs = def.segs.map(s => s.slice());
  const [ia, ib] = def.close;
  for (let it = 0; it < 4; it++) {
    const k = smoothCirc(curvatureList(segs), def.smooth / DS_FINE);
    const r = integrate(k, 0, 0, 0);
    const n = k.length;
    const ex = r.x[n], ez = r.z[n];
    // 직선 ia, ib 의 방향 (설계 곡률 기준 시작 각도)
    const dirAt = idx => {
      let psi = 0;
      for (let j = 0; j < idx; j++) if (segs[j][0] === 'A') psi += segs[j][2] * Math.PI / 180;
      return psi;
    };
    const pa = dirAt(ia), pb = dirAt(ib);
    // 트랙 모양도 시뮬레이션의 일부 → 결정적 삼각함수만
    const ax = dsin(pa), az = dcos(pa), bx = dsin(pb), bz = dcos(pb);
    // ax*da + bx*db = -ex ; az*da + bz*db = -ez
    const det = ax * bz - bx * az;
    if (Math.abs(det) < 1e-6) throw new Error('close 직선 두 개가 평행합니다');
    const da = (-ex * bz + bx * ez) / det;
    const db = (-az * -ex + ax * -ez) / det;
    segs[ia][1] += da; segs[ib][1] += db;
    if (segs[ia][1] < 5 || segs[ib][1] < 5) throw new Error(`닫기 실패: 직선 길이가 음수 (${segs[ia][1].toFixed(1)}, ${segs[ib][1].toFixed(1)})`);
    if (Math.sqrt(ex * ex + ez * ez) < 0.01) break;
  }
  return segs;
}

/** 순환 보간: 제어점 [[비율, 값], ...] → 부드러운 곡선 */
function profile(pts, frac) {
  const n = pts.length;
  if (!n) return 0;
  let i = 0;
  while (i < n && pts[i][0] <= frac) i++;
  const a = pts[(i - 1 + n) % n], b = pts[i % n];
  let fa = a[0], fb = b[0];
  if (i === 0) fa -= 1;
  if (i === n) fb += 1;
  const t = fb > fa ? (frac - fa) / (fb - fa) : 0;
  const u = (1 - dcos(t * Math.PI)) / 2;       // 코사인 보간 — 경사 변화가 매끈하다
  return a[1] + (b[1] - a[1]) * u;
}

export function buildTrack(def) {
  const segs = closeLoop(def);
  const kFine = smoothCirc(curvatureList(segs), def.smooth / DS_FINE);
  const r = integrate(kFine, 0, 0, 0);
  const nFine = kFine.length;
  // 남은 폐합 오차(수 mm)를 고르게 나눈다
  const ex = r.x[nFine], ez = r.z[nFine];
  for (let i = 0; i <= nFine; i++) { r.x[i] -= ex * i / nFine; r.z[i] -= ez * i / nFine; }
  // 출발선 위치로 돌려서(시작 인덱스 이동)
  const shift = Math.round((def.startAt || 0) / DS_FINE) % nFine;
  const n = Math.floor(nFine / STEP);
  const L = n * STEP * DS_FINE;
  const T = {
    id: def.id, name: def.name, n, L, ds: STEP * DS_FINE, def,
    x: new Float64Array(n), y: new Float64Array(n), z: new Float64Array(n),
    tx: new Float64Array(n), tz: new Float64Array(n), lx: new Float64Array(n), lz: new Float64Array(n),
    k: new Float64Array(n), bank: new Float64Array(n), grade: new Float64Array(n),
    hw: new Float64Array(n), curbL: new Float64Array(n), curbR: new Float64Array(n),
    runL: new Float64Array(n), runR: new Float64Array(n), wallL: new Float64Array(n), wallR: new Float64Array(n),
    surfL: new Uint8Array(n), surfR: new Uint8Array(n),
  };
  for (let i = 0; i < n; i++) {
    const j = (i * STEP + shift) % nFine;
    T.x[i] = r.x[j]; T.z[i] = r.z[j];
    const psi = r.psi[j];
    T.tx[i] = dsin(psi); T.tz[i] = dcos(psi);
    T.lx[i] = dcos(psi); T.lz[i] = -dsin(psi);
    let kk = 0;
    for (let q = 0; q < STEP; q++) kk += kFine[(j + q) % nFine];
    T.k[i] = kk / STEP;
  }
  // 높이
  for (let i = 0; i < n; i++) T.y[i] = profile(def.elev || [[0, 0]], i / n);
  for (let i = 0; i < n; i++) T.grade[i] = (T.y[(i + 1) % n] - T.y[i]) / T.ds;
  // 폭·기울기(뱅크)·연석·런오프
  const W = def.width / 2;
  const kS = smoothCirc(T.k, 10);
  for (let i = 0; i < n; i++) {
    T.hw[i] = W;
    // 바깥쪽이 높게: 왼쪽으로 굽으면(κ>0) 오른쪽(d<0)이 높아야 → dh/dd < 0
    T.bank[i] = clamp(-kS[i] * (def.bankK ?? 3), -(def.bankMax ?? 0.05), def.bankMax ?? 0.05) + (def.crossfall ?? 0);
    const curve = Math.abs(kS[i]) > (def.curbK ?? 1 / 160);
    T.curbL[i] = curve ? (def.curbW ?? 0) : 0;
    T.curbR[i] = curve ? (def.curbW ?? 0) : 0;
  }
  // 런오프: 바깥쪽은 넓게(자갈), 안쪽은 좁게(잔디). 앞뒤로 퍼뜨려 "브레이크 존"도 넓어지게.
  const outBoost = new Float64Array(n);
  for (let i = 0; i < n; i++) outBoost[i] = Math.min(1, Math.abs(kS[i]) * (def.runK ?? 0));
  const spread = smoothCirc(outBoost, 40);
  for (let i = 0; i < n; i++) {
    const left = kS[i] < 0;           // 오른쪽으로 굽으면 바깥은 왼쪽
    const rb = def.runBase ?? 6, rx = def.runOut ?? 0;
    const boost = Math.max(outBoost[i], spread[i] * 1.6);
    T.runL[i] = rb + (left ? rx * Math.min(1, boost) : 0);
    T.runR[i] = rb + (!left ? rx * Math.min(1, boost) : 0);
    T.surfL[i] = (left && boost > 0.25 && def.gravel) ? SURF.GRAVEL : (def.runSurf ?? SURF.GRASS);
    T.surfR[i] = (!left && boost > 0.25 && def.gravel) ? SURF.GRAVEL : (def.runSurf ?? SURF.GRASS);
  }
  // 한쪽만 벽이 붙은 구간(산길의 절벽 등): def.sides(s비율) → {runL, runR}
  if (def.sides) for (let i = 0; i < n; i++) {
    const o = def.sides(i / n, T.k[i]);
    if (o.runL !== undefined) T.runL[i] = o.runL;
    if (o.runR !== undefined) T.runR[i] = o.runR;
    if (o.surfL !== undefined) T.surfL[i] = o.surfL;
    if (o.surfR !== undefined) T.surfR[i] = o.surfR;
  }
  for (let i = 0; i < n; i++) {
    T.wallL[i] = T.hw[i] + T.curbL[i] + T.runL[i];
    T.wallR[i] = T.hw[i] + T.curbR[i] + T.runR[i];
  }
  // 안쪽 벽은 회전반경보다 안으로 못 들어간다 (넘으면 좌표가 겹쳐 꼬인다)
  limitInside(T);
  // 트랙의 다른 부분과 벽이 겹치지 않게
  limitNeighbours(T);
  // 벽 오프셋을 매끈하게 (벽이 갑자기 튀어나오면 모서리에 걸린다)
  T.wallL = smoothCirc(T.wallL, 6); T.wallR = smoothCirc(T.wallR, 6);
  limitInside(T);
  for (let i = 0; i < n; i++) {
    T.wallL[i] = Math.max(T.wallL[i], T.hw[i] + T.curbL[i] + 0.6);
    T.wallR[i] = Math.max(T.wallR[i], T.hw[i] + T.curbR[i] + 0.6);
  }
  buildGrid(T);
  T.bounds = bounds(T);
  return T;
}

function limitInside(T) {
  for (let i = 0; i < T.n; i++) {
    const k = T.k[i];
    if (k > 1e-4) T.wallL[i] = Math.min(T.wallL[i], 0.8 / k);
    if (k < -1e-4) T.wallR[i] = Math.min(T.wallR[i], 0.8 / -k);
  }
}

/** 멀리 떨어진 구간(헤어핀 반대편 등)이 가까이 지나가면 두 벽이 겹치지 않게 줄인다 */
function limitNeighbours(T) {
  const n = T.n, cell = 40;
  const g = new Map();
  for (let i = 0; i < n; i++) {
    const key = Math.floor(T.x[i] / cell) + ',' + Math.floor(T.z[i] / cell);
    if (!g.has(key)) g.set(key, []);
    g.get(key).push(i);
  }
  const far = 60 / T.ds;    // 이만큼(샘플 수) 떨어진 것만 "다른 구간"
  const wl = Float64Array.from(T.wallL), wr = Float64Array.from(T.wallR);
  for (let i = 0; i < n; i++) {
    const cx = Math.floor(T.x[i] / cell), cz = Math.floor(T.z[i] / cell);
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
      const lst = g.get((cx + a) + ',' + (cz + b));
      if (!lst) continue;
      for (const j of lst) {
        let di = Math.abs(i - j); di = Math.min(di, n - di);
        if (di < far) continue;
        const dx = T.x[j] - T.x[i], dz = T.z[j] - T.z[i];
        const dist = Math.sqrt(dx * dx + dz * dz);
        const side = dx * T.lx[i] + dz * T.lz[i];          // + = 왼쪽
        const lim = Math.max(dist / 2 - 1.0, T.hw[i] + 1.0);
        if (side > 0) wl[i] = Math.min(wl[i], lim);
        else wr[i] = Math.min(wr[i], lim);
      }
    }
  }
  T.wallL = wl; T.wallR = wr;
}

function buildGrid(T) {
  const cell = 16;
  const g = new Map();
  for (let i = 0; i < T.n; i++) {
    const key = Math.floor(T.x[i] / cell) * 100000 + Math.floor(T.z[i] / cell);
    if (!g.has(key)) g.set(key, []);
    g.get(key).push(i);
  }
  T.cell = cell; T.grid = g;
}

function bounds(T) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < T.n; i++) {
    x0 = Math.min(x0, T.x[i]); x1 = Math.max(x1, T.x[i]);
    z0 = Math.min(z0, T.z[i]); z1 = Math.max(z1, T.z[i]);
    y0 = Math.min(y0, T.y[i]); y1 = Math.max(y1, T.y[i]);
  }
  return { x0, x1, z0, z1, y0, y1 };
}

/**
 * 물리 조회 객체. 차·바퀴마다 "직전에 있던 샘플 번호(hint)"를 들고 다니며 이웃만 찾아서 빠르다.
 * ground() 는 결과를 this.g 에 쓰고 새 hint 를 돌려준다.
 */
export class TrackWorld {
  constructor(T) {
    this.T = T;
    this.g = { h: 0, nx: 0, ny: 1, nz: 0, surf: 0 };
    this.loc = { i: 0, t: 0, s: 0, d: 0 };
  }

  /** (x,z) → 가장 가까운 중심선 구간. hint<0 이면 격자로 전체 탐색 */
  locate(x, z, hint) {
    const T = this.T, n = T.n;
    let i = hint;
    if (!(i >= 0 && i < n)) i = this.global(x, z);
    let prevDir = 0, t = 0;
    for (let it = 0; it < 64; it++) {
      const j = i + 1 === n ? 0 : i + 1;
      const ax = T.x[i], az = T.z[i];
      const bx = T.x[j] - ax, bz = T.z[j] - az;
      t = ((x - ax) * bx + (z - az) * bz) / (bx * bx + bz * bz);
      if (t < 0) {
        if (prevDir === 1) { t = 0; break; }    // 바깥 모서리 틈 — 경계에서 멈춤
        prevDir = -1; i = i === 0 ? n - 1 : i - 1;
      } else if (t > 1) {
        if (prevDir === -1) { t = 1; break; }
        prevDir = 1; i = j;
      } else break;
    }
    if (t < 0) t = 0; else if (t > 1) t = 1;
    const j = i + 1 === n ? 0 : i + 1;
    const cx = T.x[i] + (T.x[j] - T.x[i]) * t, cz = T.z[i] + (T.z[j] - T.z[i]) * t;
    let lx = T.lx[i] + (T.lx[j] - T.lx[i]) * t, lz = T.lz[i] + (T.lz[j] - T.lz[i]) * t;
    const ll = Math.sqrt(lx * lx + lz * lz);
    lx /= ll; lz /= ll;
    const L = this.loc;
    L.i = i; L.t = t; L.s = (i + t) * T.ds; L.d = (x - cx) * lx + (z - cz) * lz;
    L.lx = lx; L.lz = lz;
    return L;
  }

  global(x, z) {
    const T = this.T, c = T.cell;
    const cx = Math.floor(x / c), cz = Math.floor(z / c);
    let best = 0, bd = Infinity;
    for (let r = 0; r < 64; r++) {
      for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) {
        if (Math.max(Math.abs(a), Math.abs(b)) !== r) continue;
        const lst = T.grid.get((cx + a) * 100000 + (cz + b));
        if (!lst) continue;
        for (const i of lst) {
          const d = (T.x[i] - x) ** 2 + (T.z[i] - z) ** 2;
          if (d < bd || (d === bd && i < best)) { bd = d; best = i; }
        }
      }
      if (bd < Infinity && Math.sqrt(bd) < (r - 1) * c) break;
    }
    return best;
  }

  /** 노면 높이 (s,d 로부터) */
  heightAt(i, t, d) {
    const T = this.T, n = T.n, j = i + 1 === n ? 0 : i + 1;
    const yc = T.y[i] + (T.y[j] - T.y[i]) * t;
    const b = T.bank[i] + (T.bank[j] - T.bank[i]) * t;
    const hw = T.hw[i];
    const cw = d > 0 ? T.curbL[i] : T.curbR[i];
    const ad = d < 0 ? -d : d;
    const edge = hw + cw;
    let h, slope;
    if (ad <= edge) { h = yc + d * b; slope = b; }
    else {
      const sg = d > 0 ? 1 : -1;
      const rs = this.T.def.runSlope ?? -0.02;
      h = yc + sg * edge * b + (ad - edge) * rs;
      slope = sg * rs;
    }
    // 연석: 톱니 모양으로 살짝 솟아 덜컹거린다
    let surf;
    if (ad <= hw) surf = SURF.ASPHALT;
    else if (ad <= edge) {
      surf = SURF.CURB;
      const s = (i + t) * T.ds;
      const ph = s / 1.2 - Math.floor(s / 1.2);
      h += 0.02 + 0.025 * (ph < 0.5 ? ph * 2 : 2 - ph * 2) * Math.min(1, (ad - hw) / 0.4);
    } else surf = d > 0 ? T.surfL[i] : T.surfR[i];
    this._slope = slope;
    return { h, surf };
  }

  ground(x, z, hint) {
    const L = this.locate(x, z, hint);
    const T = this.T;
    const { h, surf } = this.heightAt(L.i, L.t, L.d);
    const gr = T.grade[L.i];
    // 법선 = (접선 × 옆방향), 접선=(tx, grade, tz), 옆=(lx, slope, lz)
    const i = L.i;
    const tx = T.tx[i], tz = T.tz[i], lx = L.lx, lz = L.lz, sl = this._slope;
    let nx = gr * lz - tz * sl, ny = tz * lx - tx * lz, nz = tx * sl - gr * lx;
    const nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
    const g = this.g;
    g.h = h; g.nx = nx / nl; g.ny = ny / nl; g.nz = nz / nl; g.surf = surf;
    return L.i;
  }

  /** 출발 그리드: k번째 자리 (2열 지그재그) */
  gridSlot(k) {
    const T = this.T;
    const row = Math.floor(k / 2), col = k % 2;
    const back = 12 + row * 9 + col * 4.5;
    let s = T.L - back;
    const i = Math.floor(s / T.ds) % T.n;
    const d = col === 0 ? 2.6 : -2.6;
    const x = T.x[i] + T.lx[i] * d, z = T.z[i] + T.lz[i] * d;
    const yaw = datan2(T.tx[i], T.tz[i]);
    return { x, z, yaw, s: i * T.ds, i };
  }
}
