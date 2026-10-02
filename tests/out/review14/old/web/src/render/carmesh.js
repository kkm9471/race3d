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
};

export const PAINT = [0xc8141e, 0x1f5fd6, 0xf0b418, 0x1c9a58, 0xe8e8ea, 0x7a2fc4];
export const PAINT_NAME = ['빨강', '파랑', '노랑', '초록', '흰색', '보라'];

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

function inRange(z, r) { return r && z >= r[0] && z <= r[1]; }

export function buildCar(spec, P, paintHex, quality = 1) {
  const B = BODY[spec.id] || BODY.masil;
  const [L, W] = spec.dims;
  const hw = W / 2;
  const cg = spec.cgH;
  const zFront = P.a + B.fo, zRear = -P.b - B.ro;
  const len = zFront - zRear;
  const cols = [0, 1, 2, 3, 4, 5].map(k => B.st.map(s => s[k]));
  const f = [1, 2, 3, 4, 5].map(k => monoInterp(cols[0], cols[k]));
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
    for (const az of axles) {
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
    const bulge = B.extras.includes('fenderbulge') && archY > 0 ? 0.03 : 0.01;
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
  const lampW = B.extras.includes('roundlamps') ? 0 : 1;
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
  const tails = [];
  if (spec.id === 'baram' || spec.id === 'cheondung' || spec.id === 'yuseong') {
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
  {
    const gs = sect(1 - 0.05 / len);
    const gy = frontY - 0.13;
    const g = new THREE.Mesh(new THREE.BoxGeometry(hw * 0.7, 0.14, 0.05), trim);
    g.position.set(0, gy, zFront - 0.02);
    car.add(g);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.11, 0.02), new THREE.MeshStandardMaterial({ color: 0xeaeaea, roughness: 0.5 }));
    plate.position.set(0, fYb(0.02) - cg + 0.22, zRear + 0.01);
    car.add(plate);
  }
  // 사이드미러
  {
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
  const exN = ex.includes('quadexhaust') ? 4 : ex.includes('twinexhaust') ? 2 : 1;
  // 부스터 불꽃(파란 원뿔, 평소엔 숨김) — 빛나는 값(1 넘는 색)이라 번짐 효과로 반짝인다
  const flameM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 2.2, 3.6), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const flameG = new THREE.ConeGeometry(0.16, 1.15, 10, 1, true);
  flameG.rotateX(-Math.PI / 2); flameG.translate(0, 0, -0.57);   // 뒤로 뻗게
  const flames = [];
  for (let k = 0; k < exN; k++) {
    const e = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.15, 10), chrome);
    e.rotation.x = Math.PI / 2;
    const sx = exN === 1 ? -hw * 0.5 : ((k % 2 ? -1 : 1) * hw * (0.3 + 0.12 * Math.floor(k / 2)));
    e.position.set(sx, fYb(0.03) - cg + 0.06, zRear + 0.03);
    car.add(e);
    const f = new THREE.Mesh(flameG, flameM);
    f.position.set(sx, fYb(0.03) - cg + 0.06, zRear - 0.03);
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
