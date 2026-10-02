// 차 모형 — 외부 3D 파일 없이 차급별 비율로 깎아 만든다 (상표·로고 없음)
//
// 옆모습(바닥·어깨선·지붕 높이)과 윗모습(폭)을 앞뒤 여러 지점에서 정의하고, 그 사이를 매끈하게
// 이어(단조 3차 보간) 단면을 쌓는다(loft). 바퀴 자리는 단면 아래쪽을 파서 아치를 만든다.
// 좌표: +Z 앞, +X 왼쪽, +Y 위. 원점 = 무게중심. 땅 = -cgH.

import * as THREE from 'three';

// [z 비율(0=뒤범퍼,1=앞범퍼), 바닥, 어깨선, 지붕/덮개 높이, 옆폭비, 윗폭비]
// ws=앞유리, rw=뒷유리, side=옆유리 구간(z 비율)
const BODY = {
  kongal: {
    fo: 0.62, ro: 0.58, crown: 0.03, tireW: 0.165,
    st: [[0, .34, .80, .95, .93, .88], [.03, .26, .84, 1.20, .97, .85], [.08, .24, .86, 1.47, .98, .80], [.30, .22, .88, 1.52, 1, .80],
      [.55, .22, .88, 1.50, 1, .80], [.68, .24, .86, 1.08, .99, .88], [.86, .26, .80, .96, .96, .88], [1, .34, .66, .78, .90, .85]],
    rw: [.02, .08], ws: [.55, .68], side: [.08, .62], bpil: .36, lamps: 'round-ish', extras: [],
  },
  masil: {
    fo: 0.95, ro: 0.98, crown: 0.03, tireW: 0.205,
    st: [[0, .36, .74, .80, .92, .86], [.05, .28, .86, .98, .97, .90], [.19, .25, .90, 1.02, .99, .88], [.30, .24, .90, 1.36, 1, .74],
      [.40, .24, .90, 1.42, 1, .74], [.58, .24, .90, 1.42, 1, .74], [.70, .25, .88, 1.00, .99, .86], [.88, .27, .82, .90, .96, .86], [1, .36, .68, .74, .90, .82]],
    rw: [.19, .30], ws: [.58, .70], side: [.22, .66], bpil: .44, extras: [],
  },
  beongae: {
    fo: 0.88, ro: 0.78, crown: 0.03, tireW: 0.225,
    st: [[0, .34, .80, .98, .94, .86], [.04, .26, .86, 1.20, .98, .80], [.12, .24, .88, 1.42, 1, .74], [.40, .23, .88, 1.44, 1, .74],
      [.60, .23, .88, 1.42, 1, .74], [.72, .24, .86, 1.00, .99, .86], [.88, .26, .82, .90, .96, .86], [1, .30, .64, .72, .90, .82]],
    rw: [.03, .12], ws: [.60, .72], side: [.12, .66], bpil: .40, extras: ['roofspoiler', 'twinexhaust', 'redcaliper'],
  },
  deundeun: {
    fo: 0.95, ro: 1.03, crown: 0.03, tireW: 0.235,
    st: [[0, .45, .95, 1.10, .94, .88], [.04, .38, 1.02, 1.45, .98, .84], [.08, .36, 1.04, 1.70, .99, .82], [.55, .36, 1.04, 1.72, 1, .82],
      [.68, .37, 1.02, 1.18, 1, .90], [.86, .40, .98, 1.10, .98, .90], [1, .46, .84, .96, .92, .86]],
    rw: [.02, .08], ws: [.55, .68], side: [.09, .62], bpil: .36, extras: ['roofrails', 'cladding'],
  },
  jimkkun: {
    fo: 0.95, ro: 1.05, crown: 0.025, tireW: 0.255,
    st: [[0, .50, .95, 1.00, .97, .95], [.03, .46, 1.02, 1.05, .99, .97], [.36, .44, 1.04, 1.06, 1, .97], [.375, .42, 1.04, 1.78, 1, .84],
      [.62, .42, 1.04, 1.85, 1, .84], [.72, .44, 1.02, 1.22, 1, .92], [.88, .46, 1.00, 1.16, .98, .92], [1, .52, .86, 1.02, .94, .90]],
    rw: [.36, .375], ws: [.62, .72], side: [.39, .66], bpil: .51, bed: [.03, .36], extras: ['bed', 'cladding', 'rollbar'],
  },
  baram: {
    fo: 0.85, ro: 0.85, crown: 0.025, tireW: 0.215,
    st: [[0, .32, .70, .80, .93, .86], [.05, .25, .80, .92, .98, .88], [.16, .23, .82, .98, 1, .86], [.30, .22, .82, 1.22, 1, .72],
      [.42, .22, .82, 1.31, 1, .70], [.54, .22, .82, 1.30, 1, .70], [.64, .23, .80, .94, .99, .84], [.86, .25, .74, .84, .96, .84], [1, .30, .58, .64, .88, .80]],
    rw: [.16, .30], ws: [.54, .64], side: [.30, .60], bpil: 0, extras: ['ducktail', 'twinexhaust'],
  },
  cheondung: {
    fo: 1.0, ro: 0.87, crown: 0.02, tireW: 0.28,
    st: [[0, .30, .70, .86, .95, .90], [.06, .20, .80, .98, 1, .90], [.30, .18, .78, 1.08, 1, .66], [.44, .17, .74, 1.20, 1, .62],
      [.54, .17, .72, 1.19, 1, .62], [.66, .18, .66, .84, .98, .82], [.86, .19, .58, .68, .95, .84], [1, .20, .42, .50, .86, .80]],
    rw: [.28, .40], ws: [.54, .66], side: [.40, .62], bpil: 0, extras: ['sideintake', 'smallwing', 'quadexhaust', 'redcaliper', 'splitter'],
  },
  yuseong: {
    fo: 1.05, ro: 0.87, crown: 0.02, tireW: 0.30,
    st: [[0, .30, .72, .90, .96, .92], [.06, .16, .78, .96, 1, .92], [.28, .15, .74, 1.00, 1, .60], [.42, .14, .70, 1.14, 1, .52],
      [.54, .14, .66, 1.12, 1, .52], [.64, .15, .60, .78, .98, .72], [.84, .16, .50, .58, .95, .84], [1, .17, .36, .42, .88, .82]],
    rw: [.28, .40], ws: [.54, .64], side: [.40, .58], bpil: 0, extras: ['bigwing', 'sideintake', 'splitter', 'yellowcaliper', 'fin'],
  },
  heukmeonji: {
    fo: 0.90, ro: 0.88, crown: 0.03, tireW: 0.225,
    st: [[0, .36, .82, 1.00, .95, .88], [.05, .29, .88, 1.10, .99, .86], [.13, .27, .90, 1.40, 1, .76], [.40, .26, .90, 1.45, 1, .76],
      [.60, .26, .90, 1.43, 1, .76], [.72, .27, .88, 1.02, .99, .86], [.88, .29, .84, .94, .97, .86], [1, .36, .68, .78, .90, .82]],
    rw: [.05, .13], ws: [.60, .72], side: [.13, .66], bpil: .40, extras: ['rallywing', 'roofscoop', 'mudflaps', 'hoodvent', 'livery', 'goldrim'],
  },
  chueok: {
    fo: 0.82, ro: 1.06, crown: 0.04, tireW: 0.19,
    st: [[0, .34, .66, .72, .88, .80], [.06, .28, .76, .86, .96, .84], [.18, .26, .80, .98, .99, .80], [.34, .25, .80, 1.26, 1, .70],
      [.48, .25, .80, 1.32, 1, .70], [.60, .25, .80, 1.28, 1, .72], [.68, .26, .78, .88, .98, .84], [.86, .28, .70, .80, .94, .84], [1, .34, .54, .62, .84, .78]],
    rw: [.18, .34], ws: [.60, .68], side: [.36, .64], bpil: 0, extras: ['chrome', 'roundlamps', 'fenderbulge'],
  },
  // ── 2026-10-02 추가 8종 ──
  // 새 차만 쓰는 표시: open=덮개 없는 차(그릴·번호판·거울·기본 등 없음) · noArch=바퀴 아치 안 팜 · linear=직선 보간(각진 차)
  //   flat=면을 각지게 칠함 · hover=바퀴 숨김 · mirror:false · head/tail=등 모양 · exh=[[x, 높이, 뒤끝에서 앞으로 m]] · noPipe · neon=빛 띠 색
  seongchae: {   // 고급 대형 SUV: 각진 상자, 높은 지붕, 기둥을 전부 검게(유리) 해서 지붕이 떠 보이게
    fo: 0.95, ro: 1.02, crown: 0.015, tireW: 0.26,
    st: [[0, .50, 1.04, 1.16, .95, .90], [.025, .44, 1.12, 1.60, .99, .86], [.06, .42, 1.14, 1.76, 1, .84], [.40, .42, 1.14, 1.82, 1, .84],
      [.62, .42, 1.14, 1.84, 1, .84], [.66, .42, 1.14, 1.82, 1, .86], [.76, .43, 1.14, 1.24, 1, .93], [.92, .45, 1.12, 1.18, .99, .93],
      [.975, .47, 1.06, 1.12, .97, .92], [1, .52, .96, 1.00, .94, .90]],
    rw: [.025, .06], ws: [.66, .76], side: [.06, .66], bpil: 0, head: 'slim', tail: 'vert', extras: ['chromeline', 'fendervent'],
  },
  changkkeut: {  // 쐐기형 미드십 슈퍼카: 낮고 뾰족한 V자 앞, 육각 흡기구
    fo: 1.12, ro: 0.88, crown: 0.02, tireW: 0.30, caliper: 0xff7a10,
    st: [[0, .30, .78, .90, .96, .92], [.05, .17, .84, .97, 1, .90], [.18, .15, .84, 1.00, 1, .72], [.32, .14, .80, 1.08, 1, .58],
      [.44, .14, .76, 1.12, 1, .54], [.50, .14, .74, 1.10, .99, .56], [.60, .15, .68, .94, .98, .66], [.69, .15, .63, .74, .96, .82],
      [.82, .16, .56, .64, .93, .86], [.93, .17, .48, .54, .85, .80], [1, .19, .34, .40, .62, .56]],
    rw: [.18, .32], ws: [.50, .69], side: [.32, .58], bpil: 0, head: 'slit', tail: 'bar',
    exh: [[0.13, 0.52, 0], [-0.13, 0.52, 0]], extras: ['hexintake', 'splitter'],
  },
  gaeguri: {     // 뒤엔진 스포츠 쿠페: 둥근 개구리눈 전조등, 지붕이 꼬리까지 흘러내리는 패스트백
    fo: 1.02, ro: 1.03, crown: 0.03, tireW: 0.24,
    st: [[0, .30, .78, .86, .92, .86], [.05, .24, .84, .94, .99, .84], [.16, .22, .86, 1.00, 1, .78], [.30, .21, .86, 1.18, 1, .66],
      [.42, .21, .85, 1.28, .98, .64], [.52, .21, .84, 1.29, .96, .64], [.60, .22, .82, 1.06, .95, .72], [.66, .23, .80, .86, .95, .86],
      [.80, .24, .76, .80, .95, .88], [.92, .26, .70, .74, .93, .86], [1, .30, .56, .60, .86, .80]],
    rw: [.28, .42], ws: [.54, .66], side: [.40, .60], bpil: 0, tail: 'bar', extras: ['roundlamps', 'ducktail', 'engineslats', 'twinexhaust'],
  },
  dungdung: {    // 호버카: 바퀴 대신 빛나는 부양 패드, 통유리 물방울 지붕
    fo: 0.98, ro: 0.92, crown: 0.04, tireW: 0.22, noArch: true, hover: true, mirror: false, neon: [0.35, 1.7, 3.2],
    st: [[0, .52, .78, .86, .80, .74], [.06, .44, .84, .94, .94, .84], [.20, .40, .86, .98, 1, .82], [.34, .40, .86, 1.12, 1, .62],
      [.48, .40, .85, 1.22, 1, .56], [.60, .40, .84, 1.16, .99, .58], [.70, .41, .80, .92, .97, .78], [.84, .42, .74, .80, .93, .84],
      [.95, .44, .66, .70, .84, .78], [1, .48, .58, .62, .70, .64]],
    rw: [.30, .58], ws: [.58, .70], side: [.32, .66], bpil: 0, head: 'bar', tail: 'bar',
    exh: [[0.32, 0.64, 0.04], [-0.32, 0.64, 0.04]], noPipe: true, extras: ['hoverpads', 'twinfins', 'neonbelt'],
  },
  hwasal: {      // 오픈휠 포뮬러: 좁은 동체, 드러난 바퀴, 앞뒤 날개
    fo: 0.95, ro: 0.75, crown: 0.02, tireW: 0.26, noArch: true, open: true, tail: 'center', tailY: 0.30,
    st: [[0, .20, .40, .44, .16, .14], [.08, .12, .42, .50, .24, .18], [.20, .09, .44, .62, .30, .20], [.32, .08, .48, .78, .56, .20],
      [.44, .08, .52, .94, .64, .17], [.50, .08, .54, .80, .58, .26], [.58, .09, .55, .64, .46, .30], [.66, .10, .54, .62, .34, .28],
      [.76, .11, .46, .54, .24, .20], [.88, .12, .36, .42, .17, .14], [1, .12, .22, .26, .10, .08]],
    ws: [.50, .64], bpil: 0, exh: [[0, 0.50, 0.04]], extras: ['fwing', 'rwing', 'arms', 'helmet', 'halo', 'flatfloor', 'fin'],
  },
  moseori: {     // 각진 사이버 쐐기: 평평한 판재, 직선 지붕, 빛 띠
    fo: 0.95, ro: 0.95, crown: 0, tireW: 0.27, linear: true, flat: true, neon: [3.0, 0.35, 2.2],
    st: [[0, .40, .90, 1.00, .96, .94], [.03, .34, .94, 1.06, 1, .96], [.58, .34, .94, 1.50, 1, .80], [.80, .34, .94, 1.00, 1, .94],
      [.97, .36, .90, .92, .99, .94], [1, .42, .80, .84, .96, .92]],
    rw: [.36, .56], ws: [.60, .78], side: [.40, .76], bpil: 0, head: 'bar', tail: 'bar',
    exh: [[0.40, 0.56, 0], [-0.40, 0.56, 0]], noPipe: true, extras: ['neonbelt', 'cladding', 'aerowheel'],
  },
  bitjul: {      // 빛줄기 미래 쿠페: 매끈한 물방울 통유리 지붕, 차체·바퀴를 따라 빛나는 띠
    fo: 0.98, ro: 0.92, crown: 0.04, tireW: 0.25, neon: [0.25, 2.2, 3.2],
    st: [[0, .30, .70, .78, .90, .84], [.05, .20, .78, .86, .99, .86], [.16, .17, .80, .92, 1, .80], [.28, .16, .78, 1.04, 1, .60],
      [.42, .16, .76, 1.16, 1, .52], [.52, .16, .74, 1.18, .99, .52], [.62, .16, .70, 1.04, .98, .58], [.72, .17, .66, .78, .96, .80],
      [.86, .18, .60, .66, .93, .84], [.96, .19, .52, .56, .86, .80], [1, .22, .42, .46, .74, .70]],
    rw: [.20, .52], ws: [.52, .72], side: [.30, .66], bpil: 0, head: 'bar', tail: 'bar',
    exh: [[0.28, 0.40, 0], [-0.28, 0.40, 0]], noPipe: true, extras: ['neonbelt', 'neonsill', 'neonarch', 'neonrim', 'aerowheel'],
  },
  kkoma: {       // 카트라이더식 오픈 카트: 낮은 바닥판, 좌석·핸들·운전자, 드러난 엔진과 배기
    fo: 0.55, ro: 0.45, crown: 0.02, tireW: 0.22, noArch: true, open: true, tail: 'center', tailY: 0.24,
    st: [[0, .14, .24, .28, .30, .26], [.10, .10, .26, .30, .42, .36], [.30, .08, .27, .31, .46, .40], [.56, .08, .28, .32, .46, .40],
      [.68, .09, .32, .40, .44, .34], [.80, .10, .36, .46, .46, .36], [.92, .11, .34, .42, .54, .42], [1, .14, .26, .30, .48, .38]],
    bpil: 0, exh: [[0.16, 0.42, 0.02], [-0.16, 0.42, 0.02]], noPipe: true, extras: ['kart'],
  },
};

// 차 색 20가지 (2026-10-02 14회차: 대기실에서 각자 고른다). 앞 6개 순서는 그대로(예전 자리 색 = 기본값)
export const PAINT = [
  0xc8141e, 0x1f5fd6, 0xf0b418, 0x1c9a58, 0xe8e8ea, 0x7a2fc4, 0xf06a10, 0xf25c9a, 0x3fb6f0, 0x8fd13a,
  0x18191c, 0xa9b0b8, 0xc9a227, 0x1b2a6b, 0x14a3a0, 0x7a1430, 0x7fe0c4, 0xb39ae8, 0x7a4a26, 0x5c6066,
];
export const PAINT_NAME = [
  '빨강', '파랑', '노랑', '초록', '흰색', '보라', '주황', '분홍', '하늘', '연두',
  '검정', '은색', '금색', '남색', '청록', '와인', '민트', '라벤더', '갈색', '회색',
];

/** 단조 3차 보간 (넘침 없이 매끈하게) */
function monoInterp(xs, ys) {
  const n = xs.length, d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return x => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (xs[i + 1] < x) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

/** 직선 보간 (각진 차: 면이 평평하게) */
function linInterp(xs, ys) {
  const n = xs.length;
  return x => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (xs[i + 1] < x) i++;
    return ys[i] + (ys[i + 1] - ys[i]) * (x - xs[i]) / (xs[i + 1] - xs[i]);
  };
}

function inRange(z, r) { return r && z >= r[0] && z <= r[1]; }

export function buildCar(spec, P, paintHex, quality = 1) {
  const B = BODY[spec.id] || BODY.masil;
  const [L, W] = spec.dims;
  const hw = W / 2;
  const cg = spec.cgH;
  const zFront = P.a + B.fo, zRear = -P.b - B.ro;
  const len = zFront - zRear;
  const cols = [0, 1, 2, 3, 4, 5].map(k => B.st.map(s => s[k]));
  const f = [1, 2, 3, 4, 5].map(k => (B.linear ? linInterp : monoInterp)(cols[0], cols[k]));
  const [fYb, fBelt, fTop, fXb, fXt] = f;
  const R = spec.R, hubY = R;   // 땅 기준
  const axles = [P.a, -P.b];
  const archR = R * 1.18 + 0.02;
  const nSt = quality >= 2 ? 72 : quality >= 1 ? 56 : 40;
  const pos = [], nrm = [], idxBody = [], idxGlass = [], idxTrim = [];
  const ringN = 13;       // 반 단면 점 수
  const rings = [];
  for (let s = 0; s <= nSt; s++) {
    // 앞뒤 끝은 촘촘하게
    const u = s / nSt;
    const zf = 0.5 - 0.5 * Math.cos(u * Math.PI);
    const z = zRear + zf * len;
    let yb = fYb(zf), belt = fBelt(zf), top = fTop(zf);
    const xs = hw * fXb(zf), xt = hw * fXt(zf);
    const xBelt = xs * 0.985;
    // 앞뒤 끝은 둥글게 닫는다
    const endK = Math.min(1, Math.min(zf, 1 - zf) / 0.02);
    const shrink = 0.55 + 0.45 * Math.sqrt(endK);
    // 바퀴 아치
    let sill = yb + 0.10, xFloor = xs * 0.82, archY = -1;
    for (const az of B.noArch ? [] : axles) {
      const dz = z - az;
      if (Math.abs(dz) < archR) {
        const ay = hubY + Math.sqrt(archR * archR - dz * dz);
        if (ay > archY) archY = ay;
      }
    }
    let well = 0;
    if (archY > sill) { well = Math.min(1, (archY - sill) / 0.12); sill = archY; xFloor = xFloor * (1 - well) + (spec.tF / 2 - B.tireW / 2 - 0.08) * well; }
    if (sill > belt - 0.08) sill = belt - 0.08;
    const crown = B.crown;
    const bulge = B.flat ? 0 : B.extras.includes('fenderbulge') && archY > 0 ? 0.03 : 0.01;
    const pts = [
      [0, yb], [xFloor, yb], [well > 0 ? xFloor : xs - 0.05, well > 0 ? sill : sill - 0.04], [xs, sill + 0.03],
      [xs + bulge, sill + (belt - sill) * 0.45], [xs, belt - 0.06], [xBelt, belt],
      [xBelt * 0.97 + xt * 0.03, belt + (top - belt) * 0.12],
      [xBelt * 0.55 + xt * 0.45, belt + (top - belt) * 0.55],
      [xt, top - 0.015], [xt * 0.72, top + crown * 0.75], [xt * 0.36, top + crown * 0.97], [0, top + crown],
    ];
    const ring = pts.map(([x, y]) => [x * shrink, (y - cg), z]);
    // 끝 단면은 가운데로 조금 모아 뚜껑처럼
    rings.push({ z, zf, ring });
  }
  // 정점 (왼쪽 절반 + 거울 오른쪽)
  const vid = (s, k, side) => (s * (ringN * 2) + (side > 0 ? k : ringN + k));
  for (let s = 0; s < rings.length; s++) {
    const r = rings[s].ring;
    for (let k = 0; k < ringN; k++) pos.push(r[k][0], r[k][1], r[k][2]);
    for (let k = 0; k < ringN; k++) pos.push(-r[k][0], r[k][1], r[k][2]);
  }
  for (let s = 0; s < rings.length - 1; s++) {
    const zf = (rings[s].zf + rings[s + 1].zf) / 2;
    for (let k = 0; k < ringN - 1; k++) {
      // 어느 재질?
      let which = idxBody;
      const sideGlass = inRange(zf, B.side) && k >= 6 && k <= 8 && !(B.bpil && Math.abs(zf - B.bpil) < 0.018);
      const topGlass = (inRange(zf, B.ws) || inRange(zf, B.rw)) && k >= 8;
      const bedTop = B.bed && inRange(zf, B.bed) && k >= 9;
      if (sideGlass || topGlass) which = idxGlass;
      else if (bedTop || k <= 1) which = idxTrim;
      if (inRange(zf, B.ws) && k === 8) which = idxGlass;
      for (const side of [1, -1]) {
        const a = vid(s, k, side), b = vid(s, k + 1, side), c = vid(s + 1, k, side), d = vid(s + 1, k + 1, side);
        // 왼쪽(+X) 면은 바깥(+X)을 향하도록: (c-a)×(b-a) 방향
        if (side > 0) which.push(a, b, c, b, d, c);
        else which.push(a, c, b, b, c, d);
      }
    }
  }
  // 앞뒤 끝 막기 (단면 부채꼴)
  const cap = (s, front) => {
    const center = pos.length / 3;
    const r = rings[s].ring;
    let cy = 0; for (const p of r) cy += p[1]; cy /= r.length;
    pos.push(0, cy, rings[s].z + (front ? 0.01 : -0.01));
    for (const side of [1, -1]) for (let k = 0; k < ringN - 1; k++) {
      const a = vid(s, k, side), b = vid(s, k + 1, side);
      const flip = (side > 0) === front;
      if (flip) idxBody.push(center, a, b); else idxBody.push(center, b, a);
    }
  };
  cap(0, false); cap(rings.length - 1, true);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const all = [...idxBody, ...idxGlass, ...idxTrim];
  geo.setIndex(all);
  geo.addGroup(0, idxBody.length, 0);
  geo.addGroup(idxBody.length, idxGlass.length, 1);
  geo.addGroup(idxBody.length + idxGlass.length, idxTrim.length, 2);
  geo.computeVertexNormals();

  const paint = new THREE.MeshPhysicalMaterial({
    color: paintHex, metalness: 0.55, roughness: 0.32, clearcoat: 1.0, clearcoatRoughness: 0.06, envMapIntensity: 1.1,
  });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0b1016, metalness: 0.3, roughness: 0.04, envMapIntensity: 1.6, clearcoat: 1 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x141517, roughness: 0.7, metalness: 0.1 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe8ecef, roughness: 0.12, metalness: 1.0 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.45, metalness: 0.7 });
  const headM = new THREE.MeshStandardMaterial({ color: 0xf4f6ff, emissive: 0xfff4e0, emissiveIntensity: 0.4, roughness: 0.1 });
  const tailM = new THREE.MeshStandardMaterial({ color: 0x5a0508, emissive: 0xff1810, emissiveIntensity: 0.35, roughness: 0.2 });
  // 그림자는 양면으로 계산한다 (기본값 "뒷면만"으로는 이 차체가 그림자를 안 드리웠다 — 실측)
  for (const m of [paint, glass, trim]) m.shadowSide = THREE.DoubleSide;
  if (B.flat) for (const m of [paint, glass, trim]) m.flatShading = true;
  const body = new THREE.Mesh(geo, [paint, glass, trim]);
  body.castShadow = true; body.receiveShadow = true;
  const car = new THREE.Group();
  car.add(body);

  // ── 등 ── (그 위치의 실제 단면 폭 안쪽에 붙인다: 앞뒤 끝은 둥글게 줄어들어서 고정 폭이면 삐져나온다)
  const sect = zf => {
    const endK = Math.min(1, Math.min(zf, 1 - zf) / 0.02), shrink = 0.55 + 0.45 * Math.sqrt(endK);
    return { half: hw * fXb(zf) * shrink, belt: fBelt(zf), yb: fYb(zf), top: fTop(zf), z: zRear + zf * len };
  };
  const hf = sect(1 - 0.04 / len), hr = sect(0.04 / len);
  const frontY = hf.belt - cg - 0.09, rearY = hr.belt - cg - 0.07;
  const lampW = B.extras.includes('roundlamps') || B.open || B.head ? 0 : 1;
  if (B.extras.includes('roundlamps')) {
    for (const sx of [1, -1]) {
      const l = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), headM);
      l.position.set(sx * hw * 0.62, fTop(0.9) - cg + 0.02, zFront - len * 0.09);
      l.rotation.x = -0.9;
      car.add(l);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.015, 6, 20), chrome);
      rim.position.copy(l.position); rim.rotation.copy(l.rotation);
      car.add(rim);
    }
  }
  if (lampW) {
    const hl = new THREE.BoxGeometry(hw * 0.3, 0.09, 0.06);
    for (const sx of [1, -1]) {
      const l = new THREE.Mesh(hl, headM);
      l.position.set(sx * hw * 0.56, frontY, zFront - 0.035);
      l.rotation.y = sx * 0.12;
      car.add(l);
    }
  }
  if (B.head === 'slim') {          // 가늘고 긴 전조등
    for (const sx of [1, -1]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(hw * 0.36, 0.05, 0.06), headM);
      l.position.set(sx * hw * 0.56, frontY + 0.03, zFront - 0.035); l.rotation.y = sx * 0.12;
      car.add(l);
    }
  } else if (B.head === 'slit') {   // 뾰족한 앞코 위에 비스듬한 빛 칼날
    const s = sect(0.95);
    for (const sx of [1, -1]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(hw * 0.34, 0.025, 0.09), headM);
      l.position.set(sx * s.half * 0.6, s.top - cg + 0.004, s.z); l.rotation.set(0.25, sx * 0.5, 0);
      car.add(l);
    }
  } else if (B.head === 'bar') {    // 앞을 가로지르는 한 줄 빛
    const l = new THREE.Mesh(new THREE.BoxGeometry(hf.half * 1.7, 0.035, 0.05), headM);
    l.position.set(0, frontY + 0.04, zFront - 0.03);
    car.add(l);
  }
  const tails = [];
  if (B.open) {
    if (B.tail === 'center') {      // 가운데 작은 등 하나 (포뮬러 비 오는 날 등 · 카트)
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.04), tailM);
      t.position.set(0, B.tailY - cg, zRear + 0.01);
      car.add(t); tails.push(t);
    }
  } else if (B.tail === 'bar') {
    const t = new THREE.Mesh(new THREE.BoxGeometry(hr.half * 1.7, 0.05, 0.06), tailM);
    t.position.set(0, rearY, zRear + 0.035);
    car.add(t); tails.push(t);
  } else if (B.tail === 'vert') {   // 세로로 긴 뒷등
    for (const sx of [1, -1]) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.30, 0.05), tailM);
      t.position.set(sx * hr.half * 0.86, rearY + 0.10, zRear + 0.035);
      car.add(t); tails.push(t);
    }
  } else if (spec.id === 'baram' || spec.id === 'cheondung' || spec.id === 'yuseong') {
    const t = new THREE.Mesh(new THREE.BoxGeometry(hw * 1.4, 0.05, 0.06), tailM);
    t.position.set(0, rearY, zRear + 0.035);
    car.add(t); tails.push(t);
  } else {
    const tl2 = new THREE.BoxGeometry(hw * 0.3, 0.08, 0.06);
    for (const sx of [1, -1]) {
      const t = new THREE.Mesh(tl2, tailM);
      t.position.set(sx * hw * 0.56, rearY, zRear + 0.035);
      t.rotation.y = -sx * 0.1;
      car.add(t); tails.push(t);
    }
  }
  // 그릴 / 번호판 자리 (빈 판)
  if (!B.open) {
    const gs = sect(1 - 0.05 / len);
    const gy = frontY - 0.13;
    const g = new THREE.Mesh(new THREE.BoxGeometry(hw * 0.7, 0.14, 0.05), trim);
    g.position.set(0, gy, zFront - 0.02);
    g.visible = B.grille !== false;
    car.add(g);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.11, 0.02), new THREE.MeshStandardMaterial({ color: 0xeaeaea, roughness: 0.5 }));
    plate.position.set(0, fYb(0.02) - cg + 0.22, zRear + 0.01);
    car.add(plate);
  }
  // 사이드미러
  if (!B.open && B.mirror !== false) {
    const mz = zRear + len * (B.ws[1] - 0.02);
    const my = fBelt(B.ws[1]) - cg + 0.08;
    for (const sx of [1, -1]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.1), paint);
      m.position.set(sx * (hw * fXb(B.ws[1]) + 0.07), my, mz);
      car.add(m);
    }
  }
  // ── 차급 특징 ──
  const ex = B.extras;
  const zAt = frac => zRear + len * frac;
  if (ex.includes('roofspoiler')) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(W * 0.72, 0.04, 0.3), paint);
    s.position.set(0, fTop(0.11) - cg + 0.03, zAt(0.07)); s.rotation.x = 0.18; car.add(s);
  }
  if (ex.includes('ducktail')) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(W * 0.8, 0.05, 0.2), paint);
    s.position.set(0, fTop(0.03) - cg + 0.06, zAt(0.03)); s.rotation.x = 0.35; car.add(s);
  }
  if (ex.includes('smallwing') || ex.includes('bigwing') || ex.includes('rallywing')) {
    const big = ex.includes('bigwing'), rally = ex.includes('rallywing');
    const wW = W * (big ? 0.92 : rally ? 0.86 : 0.7), h = big ? 0.3 : rally ? 0.26 : 0.1;
    const wing = new THREE.Mesh(new THREE.BoxGeometry(wW, 0.04, big ? 0.42 : 0.3), big ? darkMetal : paint);
    const baseY = fTop(0.04) - cg;
    wing.position.set(0, baseY + h, zAt(0.035)); wing.rotation.x = -0.12;
    car.add(wing);
    for (const sx of [1, -1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, h, 0.14), darkMetal);
      post.position.set(sx * wW * 0.32, baseY + h / 2, zAt(0.04));
      car.add(post);
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.02, h * 0.9, big ? 0.46 : 0.34), big ? darkMetal : paint);
      plate.position.set(sx * wW / 2, baseY + h * 0.95, zAt(0.035));
      car.add(plate);
    }
  }
  if (ex.includes('splitter')) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(W * 0.9, 0.025, 0.2), trim);
    s.position.set(0, fYb(0.98) - cg + 0.02, zFront - 0.05); car.add(s);
  }
  if (ex.includes('sideintake')) {
    for (const sx of [1, -1]) {
      const it = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.55), trim);
      it.position.set(sx * (hw * 0.99), fBelt(0.36) - cg - 0.18, zAt(0.33));
      car.add(it);
    }
  }
  if (ex.includes('fin')) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 1.1), paint);
    fin.position.set(0, fTop(0.2) - cg + 0.1, zAt(0.18)); car.add(fin);
  }
  if (ex.includes('roofrails')) {
    for (const sx of [1, -1]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, len * 0.45), chrome);
      r.position.set(sx * hw * 0.7, fTop(0.35) - cg + 0.06, zAt(0.33));
      car.add(r);
    }
  }
  if (ex.includes('roofscoop')) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.3), paint);
    s.position.set(0, fTop(0.45) - cg + 0.06, zAt(0.5)); car.add(s);
  }
  if (ex.includes('hoodvent')) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.35), trim);
    s.position.set(0, fTop(0.8) - cg + 0.015, zAt(0.8)); s.rotation.x = 0.1; car.add(s);
  }
  if (ex.includes('rollbar')) {
    const bz = zAt(0.3);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, 0.06, 0.06), darkMetal);
    bar.position.set(0, fTop(0.3) - cg + 0.36, bz); car.add(bar);
    for (const sx of [1, -1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 0.06), darkMetal);
      p.position.set(sx * W * 0.43, fTop(0.3) - cg + 0.18, bz); car.add(p);
    }
  }
  if (ex.includes('mudflaps')) {
    for (const sx of [1, -1]) for (const az of axles) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.01), new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.8 }));
      m.position.set(sx * spec.tF / 2, R - cg - 0.05, az - archR - 0.05);
      car.add(m);
    }
  }
  if (ex.includes('livery')) {
    // 흰 줄무늬 두 개 (보닛~지붕~트렁크)
    const stripe = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.35, metalness: 0.2, polygonOffset: true, polygonOffsetFactor: -2 });
    for (const sx of [0.13, -0.13]) {
      const pts = [];
      for (let i = 0; i <= 40; i++) { const zf = 0.04 + 0.94 * i / 40; pts.push(new THREE.Vector3(sx, fTop(zf) - cg + B.crown + 0.004, zAt(zf))); }
      const curve = new THREE.CatmullRomCurve3(pts);
      const g = new THREE.TubeGeometry(curve, 60, 0.05, 3, false);
      g.scale(1, 0.12, 1);
      const m = new THREE.Mesh(g, stripe);
      car.add(m);
    }
  }
  if (ex.includes('chrome')) {
    for (const zz of [zFront - 0.02, zRear + 0.02]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(W * 0.9, 0.07, 0.07), chrome);
      b.position.set(0, fYb(zz > 0 ? 0.98 : 0.02) - cg + 0.12, zz); car.add(b);
    }
  }
  if (ex.includes('cladding')) {
    for (const sx of [1, -1]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, len * 0.5), trim);
      c.position.set(sx * hw * 0.99, fYb(0.5) - cg + 0.14, zAt(0.5)); car.add(c);
    }
  }
  // ── 새 차 8종 부품 (2026-10-02) ──
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); car.add(m); return m; };
  /** 두 점을 잇는 둥근 막대 */
  const rod = (x0, y0, z0, x1, y1, z1, r, mat) => {
    const d = new THREE.Vector3(x1 - x0, y1 - y0, z1 - z0);
    const m = add(new THREE.CylinderGeometry(r, r, d.length(), 8), mat, x0 + d.x / 2, y0 + d.y / 2, z0 + d.z / 2);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return m;
  };
  // 빛 띠 (1 넘는 색이라 번짐 효과로 빛난다)
  const neonM = B.neon ? new THREE.MeshBasicMaterial({ color: new THREE.Color(...B.neon) }) : null;
  /** 차체 옆면을 따라 가는 띠: zf 구간 z0~z1, 높이 = yOf(단면) */
  const sideLine = (z0, z1, yOf, mat) => {
    for (const sx of [1, -1]) {
      const pts = [];
      for (let i = 0; i <= 32; i++) { const s = sect(z0 + (z1 - z0) * i / 32); pts.push(new THREE.Vector3(sx * (s.half + 0.008), yOf(s) - cg, s.z)); }
      car.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.013, 4, false), mat));
    }
  };
  const archZ = (R * 1.18 + 0.02) / len;   // 아치 반지름(zf 비율)
  if (ex.includes('chromeline')) {
    sideLine(0.07, 0.72, s => s.belt - 0.02, chrome);
    sideLine((P.b - P.b + B.ro) / len + archZ + 0.01, (B.ro + spec.wb) / len - archZ - 0.01, s => s.yb + 0.24, chrome);
  }
  if (ex.includes('fendervent')) {
    for (const sx of [1, -1]) { const s = sect(0.68); add(new THREE.BoxGeometry(0.03, 0.07, 0.30), chrome, sx * (s.half + 0.005), s.belt - cg - 0.24, s.z); }
  }
  if (ex.includes('hexintake')) {      // 문 뒤 육각 흡기구
    for (const sx of [1, -1]) {
      const s = sect(0.36);
      const h = add(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 6), trim, sx * (s.half - 0.01), s.belt - cg - 0.24, s.z);
      h.rotation.z = Math.PI / 2; h.scale.set(1, 1, 0.55);
    }
  }
  if (ex.includes('engineslats')) {    // 뒤 엔진 덮개의 가로 틈
    for (let k = 0; k < 5; k++) { const s = sect(0.09 + k * 0.022); add(new THREE.BoxGeometry(s.half * 0.9, 0.012, 0.03), trim, 0, s.top + B.crown - cg + 0.004, s.z); }
  }
  if (ex.includes('neonbelt')) sideLine(0.02, 0.98, s => s.belt - 0.06, neonM);
  if (ex.includes('neonsill')) sideLine(B.ro / len + archZ + 0.01, (B.ro + spec.wb) / len - archZ - 0.01, s => s.yb + 0.16, neonM);
  if (ex.includes('neonarch')) {
    for (const az of axles) for (const sx of [1, -1]) {
      const a = add(new THREE.TorusGeometry(R * 1.18 + 0.032, 0.013, 4, 28, Math.PI), neonM, sx * (sect((az - zRear) / len).half + 0.006), R - cg, az);
      a.rotation.y = Math.PI / 2;
    }
  }
  if (ex.includes('hoverpads')) {      // 바퀴 자리 아래 빛나는 부양 패드
    for (const W0 of P.wheels) {
      const s = sect((W0.z - zRear) / len), px = Math.sign(W0.x) * Math.min(Math.abs(W0.x) - 0.1, s.half - 0.3), y = s.yb - cg;
      add(new THREE.CylinderGeometry(0.24, 0.28, 0.08, 20), darkMetal, px, y - 0.03, W0.z);
      add(new THREE.CircleGeometry(0.22, 20), neonM, px, y - 0.072, W0.z).rotation.x = Math.PI / 2;
      add(new THREE.TorusGeometry(0.27, 0.018, 4, 24), neonM, px, y - 0.065, W0.z).rotation.x = Math.PI / 2;
    }
  }
  if (ex.includes('twinfins')) {       // 꼬리 위 두 지느러미 (바깥으로 벌어짐)
    for (const sx of [1, -1]) { const s = sect(0.12); add(new THREE.BoxGeometry(0.035, 0.30, 0.6), paint, sx * s.half * 0.5, s.top - cg + 0.12, s.z).rotation.set(-0.35, 0, -sx * 0.3); }
  }
  if (ex.includes('fwing')) {          // 앞날개: 넓은 판 두 장 + 양끝 세움판
    const z = zFront - 0.26, w = W * 0.94;
    add(new THREE.BoxGeometry(w, 0.025, 0.40), darkMetal, 0, 0.09 - cg, z);
    add(new THREE.BoxGeometry(w * 0.92, 0.02, 0.18), paint, 0, 0.15 - cg, z - 0.12).rotation.x = -0.35;
    for (const sx of [1, -1]) add(new THREE.BoxGeometry(0.02, 0.16, 0.46), paint, sx * w / 2, 0.14 - cg, z);
  }
  if (ex.includes('rwing')) {          // 뒷날개: 높은 판 + 세움판 + 가운데 기둥 + 아래 보조 날개
    const z = zRear + 0.30, w = W * 0.56, y = 0.86 - cg;
    add(new THREE.BoxGeometry(w, 0.03, 0.30), darkMetal, 0, y, z).rotation.x = -0.15;
    add(new THREE.BoxGeometry(w, 0.02, 0.16), paint, 0, y + 0.08, z - 0.14).rotation.x = -0.55;
    for (const sx of [1, -1]) add(new THREE.BoxGeometry(0.02, 0.42, 0.56), paint, sx * w / 2, y - 0.08, z - 0.04);
    add(new THREE.BoxGeometry(0.04, 0.38, 0.10), darkMetal, 0, y - 0.2, z + 0.02);
    add(new THREE.BoxGeometry(w * 0.9, 0.02, 0.16), darkMetal, 0, 0.42 - cg, z - 0.05);
  }
  if (ex.includes('flatfloor')) add(new THREE.BoxGeometry(W * 0.62, 0.025, len * 0.36), trim, 0, 0.07 - cg, zAt(0.44));
  if (ex.includes('arms')) {           // 드러난 바퀴를 잡는 위아래 A자 팔
    for (const W0 of P.wheels) {
      const sx = Math.sign(W0.x), s = sect((W0.z - zRear) / len);
      const tw = B.tireW * (W0.front ? 1 : (spec.tire.rear ? 1.15 : 1));
      const xo = Math.abs(W0.x) - tw / 2 + 0.02, xi = s.half * 0.8;
      for (const dy of [0.07, -0.05]) for (const dz of [0.16, -0.16]) rod(sx * xi, R - cg + dy, W0.z + dz, sx * xo, R - cg + dy, W0.z, 0.014, darkMetal);
    }
  }
  /** 운전자 헬멧 (칠 색 + 앞 가리개) */
  const helmet = (y, z, r) => {
    add(new THREE.SphereGeometry(r, 18, 12), paint, 0, y, z);
    add(new THREE.SphereGeometry(r * 1.03, 18, 6, Math.PI / 2 - 0.9, 1.8, 1.05, 0.55), glass, 0, y, z);
  };
  if (ex.includes('helmet')) helmet(0.78 - cg, zAt(0.53), 0.14);
  if (ex.includes('halo')) {           // 머리 위 보호 고리
    const z0 = zAt(0.535), y = 0.90 - cg, r = 0.27;
    add(new THREE.TorusGeometry(r, 0.022, 6, 20, Math.PI), darkMetal, 0, y, z0).rotation.x = Math.PI / 2;
    rod(0, y, z0 + r, 0, sect(0.6).top - cg - 0.02, z0 + r + 0.05, 0.022, darkMetal);
    for (const sx of [1, -1]) rod(sx * r, y, z0, sx * r, sect(0.5).top - cg - 0.06, z0 - 0.08, 0.02, darkMetal);
  }
  if (ex.includes('kart')) {
    const suit = new THREE.MeshStandardMaterial({ color: 0xeef0f2, roughness: 0.6 });
    for (const sx of [1, -1]) {        // 옆 범퍼 (통통한 캡슐)
      const p = add(new THREE.CapsuleGeometry(0.11, 0.56, 4, 12), paint, sx * 0.56, 0.20 - cg, zAt(0.48));
      p.rotation.x = Math.PI / 2; p.scale.set(1, 1, 0.8);
      rod(sx * 0.30, 0.15 - cg, zAt(0.48), sx * 0.47, 0.18 - cg, zAt(0.48), 0.02, darkMetal);
    }
    rod(-0.62, 0.16 - cg, zFront - 0.06, 0.62, 0.16 - cg, zFront - 0.06, 0.03, darkMetal);   // 앞 범퍼 봉
    rod(-0.78, 0.17 - cg, zRear + 0.03, 0.78, 0.17 - cg, zRear + 0.03, 0.03, darkMetal);     // 뒤 범퍼 봉
    for (const sx of [1, -1]) rod(sx * 0.30, 0.17 - cg, zRear + 0.03, sx * 0.30, 0.13 - cg, zRear + 0.32, 0.022, darkMetal);
    add(new THREE.BoxGeometry(0.44, 0.06, 0.38), trim, 0, 0.34 - cg, zAt(0.43));                 // 좌석 방석
    add(new THREE.BoxGeometry(0.46, 0.50, 0.07), trim, 0, 0.56 - cg, zAt(0.355)).rotation.x = -0.3;   // 등받이
    add(new THREE.CapsuleGeometry(0.15, 0.22, 4, 12), suit, 0, 0.60 - cg, zAt(0.42)).rotation.x = -0.25;   // 몸통
    helmet(0.93 - cg, zAt(0.425), 0.15);
    const wz = zAt(0.60);
    add(new THREE.TorusGeometry(0.13, 0.022, 6, 18), darkMetal, 0, 0.66 - cg, wz).rotation.x = -0.6;   // 핸들
    rod(0, 0.66 - cg, wz, 0, 0.42 - cg, zAt(0.74), 0.02, darkMetal);
    for (const sx of [1, -1]) rod(sx * 0.18, 0.78 - cg, zAt(0.43), sx * 0.12, 0.67 - cg, wz - 0.02, 0.045, suit);   // 팔
    add(new THREE.BoxGeometry(0.36, 0.24, 0.30), darkMetal, 0, 0.44 - cg, zAt(0.13));           // 엔진
    for (let k = 0; k < 4; k++) add(new THREE.BoxGeometry(0.30, 0.015, 0.26), chrome, 0, 0.58 - cg + k * 0.035, zAt(0.13));
    add(new THREE.CylinderGeometry(0.08, 0.08, 0.14, 14), chrome, 0.27, 0.46 - cg, zAt(0.15)).rotation.z = Math.PI / 2;
    for (const [x] of B.exh) rod(x, 0.42 - cg, zAt(0.12), x, 0.42 - cg, zRear + 0.08, 0.035, chrome);   // 배기관
  }
  const exN = B.exh ? B.exh.length : ex.includes('quadexhaust') ? 4 : ex.includes('twinexhaust') ? 2 : 1;
  // 부스터 불꽃(파란 원뿔, 평소엔 숨김) — 빛나는 값(1 넘는 색)이라 번짐 효과로 반짝인다
  const flameM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 2.2, 3.6), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const flameG = new THREE.ConeGeometry(0.16, 1.15, 10, 1, true);
  flameG.rotateX(-Math.PI / 2); flameG.translate(0, 0, -0.57);   // 뒤로 뻗게
  const flames = [];
  for (let k = 0; k < exN; k++) {
    const ep = B.exh ? B.exh[k] : null;
    const sx = ep ? ep[0] : exN === 1 ? -hw * 0.5 : ((k % 2 ? -1 : 1) * hw * (0.3 + 0.12 * Math.floor(k / 2)));
    const ey = ep ? ep[1] - cg : fYb(0.03) - cg + 0.06, ez = zRear + (ep ? ep[2] : 0) + 0.03;
    if (!B.noPipe) {
      const e = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.15, 10), chrome);
      e.rotation.x = Math.PI / 2;
      e.position.set(sx, ey, ez);
      car.add(e);
    }
    const f = new THREE.Mesh(flameG, flameM);
    f.position.set(sx, ey, ez - 0.06);
    f.visible = false; f.userData.fx = true;
    car.add(f); flames.push(f);
  }

  // ── 바퀴 ──
  const wheels = [];
  const caliperCol = ex.includes('redcaliper') ? 0xc81e1e : ex.includes('yellowcaliper') ? 0xf0c020 : 0x3a3a3a;
  const rimM = ex.includes('goldrim') ? new THREE.MeshStandardMaterial({ color: 0xc9a23a, metalness: 0.9, roughness: 0.3 })
    : new THREE.MeshStandardMaterial({ color: ex.includes('chrome') ? 0xd8dadc : 0xb9bec4, metalness: 0.9, roughness: 0.28 });
  const tireM = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.92, shadowSide: THREE.DoubleSide });
  const discM = new THREE.MeshStandardMaterial({ color: 0x777b80, metalness: 0.8, roughness: 0.4 });
  const calM = new THREE.MeshStandardMaterial({ color: caliperCol, roughness: 0.5, metalness: 0.2 });
  for (let i = 0; i < 4; i++) {
    const W0 = P.wheels[i];
    const tw = B.tireW * (W0.front ? 1 : (spec.tire.rear ? 1.15 : 1));
    const pivot = new THREE.Group();       // 조향 (y축 회전)
    const spin = new THREE.Group();        // 굴러감 (x축 회전)
    pivot.add(spin);
    // 타이어: 둥근 사각 단면을 회전
    const prof = [];
    const r0 = R * 0.66, r1 = R;
    const segs = 8;
    prof.push(new THREE.Vector2(r0, -tw / 2));
    for (let k = 0; k <= segs; k++) {
      const a = -Math.PI / 2 + Math.PI * k / segs;
      prof.push(new THREE.Vector2(r1 - 0.035 + Math.cos(a) * 0.035, Math.sin(a) * (tw / 2 - 0.02) + 0));
    }
    prof.push(new THREE.Vector2(r0, tw / 2));
    const tg = new THREE.LatheGeometry(prof, quality >= 1 ? 28 : 18);
    tg.rotateZ(Math.PI / 2);
    const tire = new THREE.Mesh(tg, tireM);
    tire.castShadow = true;
    spin.add(tire);
    // 휠 (림 + 스포크)
    const side = W0.left ? 1 : -1;
    const face = side * (tw / 2 - 0.03);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r0, r0, tw * 0.9, 22, 1, true), rimM);
    rim.rotation.z = Math.PI / 2;
    spin.add(rim);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12), rimM);
    hub.rotation.z = Math.PI / 2; hub.position.x = face;
    spin.add(hub);
    const spokes = ex.includes('chrome') ? 5 : spec.id === 'heukmeonji' ? 6 : 5;
    for (let k = 0; k < spokes; k++) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.03, r0 * 0.95, 0.055), rimM);
      sp.position.x = face;
      sp.rotation.x = k / spokes * Math.PI * 2;
      sp.translateY(r0 * 0.47);
      spin.add(sp);
    }
    // 디스크·캘리퍼는 돌지 않는다
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(r0 * 0.82, r0 * 0.82, 0.03, 20), discM);
    disc.rotation.z = Math.PI / 2; disc.position.x = face - side * 0.05;
    pivot.add(disc);
    const cal = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.12), calM);
    cal.position.set(face - side * 0.03, r0 * 0.55, -r0 * 0.3);
    pivot.add(cal);
    pivot.position.set(W0.x, R - cg, W0.z);
    if (B.hover) pivot.visible = false;   // 호버카: 바퀴는 숨기고 객체만 남긴다
    car.add(pivot);
    wheels.push({ pivot, spin, base: R - cg, angle: 0 });
  }

  // 그림자 판 (그림자맵이 꺼진 낮음 품질용)
  const blobC = document.createElement('canvas'); blobC.width = blobC.height = 64;
  const bg = blobC.getContext('2d');
  const gr = bg.createRadialGradient(32, 32, 4, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  bg.fillStyle = gr; bg.fillRect(0, 0, 64, 64);
  const blobT = new THREE.CanvasTexture(blobC);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.3, len * 1.15), new THREE.MeshBasicMaterial({ map: blobT, transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = -cg + 0.03;
  blob.renderOrder = 1;
  car.add(blob);

  car.userData = {
    wheels, tails, tailM, headM, paint, blob, zFront, zRear, len,
    setBrake(b) { tailM.emissiveIntensity = 0.35 + b * 1.1; },
    /** 부스터 중이면 배기구 불꽃 (b: 0~1 세기) */
    setBoost(b) {
      for (const f of flames) {
        f.visible = b > 0;
        if (b > 0) { const s = 0.7 + Math.random() * 0.5; f.scale.set(0.8 + b * 0.4, 0.8 + b * 0.4, s * (0.6 + b * 0.7)); }
      }
    },
    setGhost(g) {
      car.traverse(o => {
        if (!o.isMesh || o === blob || o.userData.fx) return;
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of ms) { m.transparent = g; m.opacity = g ? 0.35 : 1; m.depthWrite = !g; }
      });
    },
    dispose() {
      car.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); });
    },
  };
  return car;
}
