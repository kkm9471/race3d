// 적대적 검증: 드리프트 3차 (2026-10-03) — 깨지는 경우 찾기
import { CARS } from '../../web/src/sim/cars.js';
import { KART, setDriftPreset, SURF } from '../../web/src/sim/car.js';
import { pack } from '../../web/src/sim/input.js';
import { newCar, frame, beta, FlatWorld, FPS } from '../physics_report.mjs';

const spec = CARS[0];
const kmh = c => c.out.speed * 3.6;
const vang = c => Math.atan2(c.st.vx, c.st.vz) * 180 / Math.PI;           // 가는 방향(+ = 왼쪽 x+)
const hang = c => { const a = c.axes([]); return Math.atan2(a[6], a[8]) * 180 / Math.PI; };   // 머리 방향
const fin = c => { for (const k in c.st) if (k !== 'w' && !Number.isFinite(c.st[k])) return k; return ''; };
const L = (...a) => console.log(...a);

// 1) 부호: 오른쪽 드리프트 → 경로 오른쪽(vang 감소), 머리가 경로보다 더 오른쪽(beta>0: 속도가 머리 왼쪽)
{
  const { c, w } = newCar(spec); c.setSpeed(150 / 3.6);
  const a0 = vang(c), h0 = hang(c);
  for (let f = 0; f < 42; f++) frame(c, w, pack({ thr: 1, steer: 1, hb: 1, kb: 1 }));
  L(`[부호] 오른쪽 0.7초: 경로 ${(vang(c) - a0).toFixed(1)}° 머리 ${(hang(c) - h0).toFixed(1)}° beta ${beta(c).toFixed(1)} ddir ${c.st.ddir}`);
  // 카운터 계속 3초
  let mn = 99, mx = -99, endF = -1;
  for (let f = 0; f < 180; f++) { frame(c, w, pack({ thr: 1, steer: -1, kb: 1 })); const b = beta(c); mn = Math.min(mn, b); mx = Math.max(mx, b); if (endF < 0 && !c.st.drift) endF = f; }
  L(`[카운터 계속 3초] 끝 ${endF}프레임 beta 범위 ${mn.toFixed(1)}~${mx.toFixed(1)} 마지막 beta ${beta(c).toFixed(1)} 속도 ${kmh(c).toFixed(0)} drift ${c.st.drift} nan:${fin(c)}`);
}
// 2) 가속 키를 뗀 채(키 없음) — 드리프트가 끝나나
for (const pre of [0, 1, 2]) {
  setDriftPreset(pre);
  const { c, w } = newCar(spec); c.setSpeed(150 / 3.6);
  for (let f = 0; f < 8; f++) frame(c, w, pack({ thr: 1, steer: 1, hb: 1, kb: 1 }));
  let mb = 0, endF = -1;
  for (let f = 0; f < 600; f++) { frame(c, w, pack({ thr: 0, kb: 1 })); mb = Math.max(mb, Math.abs(beta(c))); if (endF < 0 && !c.st.drift) endF = f; }
  L(`[톡 후 가속 뗌 p${pre}] 끝 ${endF} 최대beta ${mb.toFixed(1)} 속도 ${kmh(c).toFixed(0)} dB ${c.st.dB.toFixed(2)}`);
  // 톡 후 자연 종료 직전 가속 키를 0.1초 뗐다 다시 → 순간부스터 되나
  const r = newCar(spec); r.c.setSpeed(120 / 3.6);
  let got = 0, rel = -1;
  for (let f = 0; f < 8; f++) frame(r.c, r.w, pack({ thr: 1, steer: 1, hb: 1, kb: 1 }));
  for (let f = 0; f < 300; f++) {
    const nearEnd = r.c.st.drift && r.c.st.dB < 0.02 && rel < 0;
    if (nearEnd) rel = f;
    const thr = rel >= 0 && f < rel + 6 ? 0 : 1;
    frame(r.c, r.w, pack({ thr, kb: 1 })); if (r.c.st.boostT > 0) got = f;
  }
  L(`   [톡 자연 종료 + 가속 뗐다 누름 p${pre}] 뗀 프레임 ${rel} 순간부스터 ${got ? '나감 f' + got : '안 나감'}`);
}
setDriftPreset(0);
// 3) Shift 계속(원 돌기) 30초 — 속도·부스터·NaN
{
  const { c, w } = newCar(spec); c.setSpeed(150 / 3.6);
  let boostsGot = 0, prevB = 0, minV = 999;
  for (let f = 0; f < FPS * 30; f++) {
    frame(c, w, pack({ thr: 1, steer: 1, hb: 1, kb: 1 }));
    if (c.st.boosts > prevB) boostsGot++; prevB = c.st.boosts;
    if (c.st.boosts === 2) { c.st.boosts = 0; prevB = 0; }
    if (f > FPS * 10) minV = Math.min(minV, kmh(c));
  }
  L(`[Shift 30초 원] drift ${c.st.drift} 속도 ${kmh(c).toFixed(1)} (10초 뒤 최소 ${minV.toFixed(1)}) beta ${beta(c).toFixed(1)} 부스터 얻음 ${boostsGot} nan:${fin(c)}`);
}
// 3b) Shift 계속 + 가속 뗌
{
  const { c, w } = newCar(spec); c.setSpeed(150 / 3.6);
  let mb = 0, endF = -1;
  for (let f = 0; f < FPS * 10; f++) { frame(c, w, pack({ thr: f < 10 ? 1 : 0, steer: 1, hb: 1, kb: 1 })); mb = Math.max(mb, Math.abs(beta(c))); if (endF < 0 && !c.st.drift) endF = f; }
  L(`[Shift+가속 뗌] 끝 ${endF} 최대beta ${mb.toFixed(1)} 속도 ${kmh(c).toFixed(1)} nan:${fin(c)}`);
}
// 4) 브레이크 드리프트 / 후진 중 Shift
{
  const { c, w } = newCar(spec); c.setSpeed(150 / 3.6);
  for (let f = 0; f < 20; f++) frame(c, w, pack({ thr: 1, steer: 1, hb: 1, kb: 1 }));
  let mb = 0, endF = -1;
  for (let f = 0; f < 240; f++) { frame(c, w, pack({ brk: 1, steer: 1, hb: 1, kb: 1 })); mb = Math.max(mb, Math.abs(beta(c))); if (endF < 0 && !c.st.drift) endF = f; }
  L(`[드리프트 중 브레이크] 끝 ${endF} 최대beta ${mb.toFixed(1)} 속도 ${c.out.fwd.toFixed(1)} nan:${fin(c)}`);
  const r = newCar(spec); r.c.setSpeed(-10);
  for (let f = 0; f < 120; f++) frame(r.c, r.w, pack({ brk: 1, steer: 1, hb: 1, kb: 1 }));
  L(`[후진 중 Shift] drift ${r.c.st.drift} fwd ${r.c.out.fwd.toFixed(1)} nan:${fin(r.c)}`);
}
// 5) 공중: 드리프트 0.4초 → 3m 띄움 → 착지 후
{
  const { c, w } = newCar(spec); c.setSpeed(150 / 3.6);
  for (let f = 0; f < 24; f++) frame(c, w, pack({ thr: 1, steer: 1, hb: 1, kb: 1 }));
  const b0 = beta(c), dR0 = c.st.dR;
  c.st.py += 3; c.st.vy = 4;
  let airF = 0, landF = -1, mb = 0, mwy = 0;
  for (let f = 0; f < 240; f++) {
    frame(c, w, pack({ thr: 1, steer: 1, hb: 1, kb: 1 }));
    if (c.st.air) airF++; else if (landF < 0 && airF) landF = f;
    if (landF >= 0 && f < landF + 30) { mb = Math.max(mb, Math.abs(beta(c))); mwy = Math.max(mwy, Math.abs(c.st.wy)); }
  }
  L(`[공중] 띄우기 전 beta ${b0.toFixed(1)} dR ${dR0.toFixed(2)} 공중 ${airF}프레임 착지 f${landF} 착지 0.5초 최대beta ${mb.toFixed(1)} 최대 회전 ${mwy.toFixed(2)}rad/s drift ${c.st.drift} nan:${fin(c)}`);
}
// 6) 빙판·잔디: 풀 드리프트
for (const [nm, sf] of [['아스팔트', 0], ['빙판', SURF.ICE], ['잔디', SURF.GRASS]]) {
  const { c } = newCar(spec); const w = new FlatWorld(sf); c.setSpeed(120 / 3.6);
  const a0 = vang(c);
  let mb = 0;
  for (let f = 0; f < 60; f++) { frame(c, w, pack({ thr: 1, steer: 1, hb: f < 42 ? 1 : 0, kb: 1 })); mb = Math.max(mb, Math.abs(beta(c))); }
  L(`[${nm}] 1초 경로 ${(a0 - vang(c)).toFixed(0)}° 최대beta ${mb.toFixed(0)} 속도 ${kmh(c).toFixed(0)}`);
}
// 7) 직선 순간부스터 반복 vs 그냥 가속 (120km/h 에서 20초, 앞(z)으로 간 거리)
{
  const run = mode => {
    const { c, w } = newCar(spec); c.setSpeed(130 / 3.6);
    let f = 0, dir = 1, ph = 0, k = 0, inst = 0;
    for (; f < FPS * 20; f++) {
      let inp = { thr: 1, kb: 1 };
      if (mode) {
        if (ph === 0 && c.st.instT <= 0 && c.st.boostT <= 0 && c.out.fwd < (c.P.vtop * 0.88)) { ph = 1; k = 0; }
        if (ph === 1) { inp = { thr: 1, steer: dir, hb: 1, kb: 1 }; if (++k >= 8) { ph = 2; k = 0; } }
        else if (ph === 2) { inp = { thr: Math.abs(beta(c)) < 12 ? 0 : 1, steer: -dir, kb: 1 }; if (!c.st.drift) { ph = 3; } }
        else if (ph === 3) { inp = { thr: 1, kb: 1 }; ph = 0; dir = -dir; if (c.st.boostT > 0) inst++; }
      }
      frame(c, w, pack(inp));
    }
    return { z: c.st.pz, x: c.st.px, inst, v: kmh(c) };
  };
  const a = run(0), b = run(1);
  L(`[직선 지그재그 순간부스터] 그냥 z ${a.z.toFixed(0)}m / 지그재그 z ${b.z.toFixed(0)}m x ${b.x.toFixed(0)} 순간부스터 ${b.inst}회`);
}
// 8) 아날로그 패드: steer 0.26 로 걸고 Shift 떼고 0.3 유지
{
  const { c, w } = newCar(spec); c.setSpeed(120 / 3.6);
  for (let f = 0; f < 6; f++) frame(c, w, pack({ thr: 1, steer: 0.26, hb: 1, kb: 0 }));
  let endF = -1, mb = 0;
  for (let f = 0; f < 300; f++) { frame(c, w, pack({ thr: 1, steer: 0.3, kb: 0 })); mb = Math.max(mb, Math.abs(beta(c))); if (endF < 0 && !c.st.drift) endF = f; }
  L(`[패드 0.26 시작] drift시작 ddir ${c.st.ddir} 끝 ${endF} 최대beta ${mb.toFixed(1)}`);
}
// 9) Shift 톡톡 번갈아 + 반대키 번갈아(10초)
{
  const { c, w } = newCar(spec); c.setSpeed(150 / 3.6);
  let mb = 0, ends = 0, prev = 0, minV = 999;
  for (let f = 0; f < FPS * 10; f++) {
    const inp = { thr: 1, steer: (f % 20) < 10 ? 1 : -1, hb: (f % 14) < 4 ? 1 : 0, kb: 1 };
    frame(c, w, pack(inp)); mb = Math.max(mb, Math.abs(beta(c))); if (prev && !c.st.drift) ends++; prev = c.st.drift; minV = Math.min(minV, kmh(c));
  }
  L(`[연타 혼합 10초] 끝난 횟수 ${ends} 최대beta ${mb.toFixed(1)} 최소속도 ${minV.toFixed(0)} nan:${fin(c)}`);
}
// 10) 부스터 + 드리프트 + 톡톡(같은 쪽 연타) 3초
{
  const { c, w } = newCar(spec); c.setSpeed(150 / 3.6); c.st.boosts = 1;
  let mx = 0, tk = 0;
  for (let f = 0; f < FPS * 3; f++) {
    frame(c, w, pack({ thr: 1, steer: f < 10 ? 1 : (f % 8 < 4 ? 1 : 0), hb: f < 10 ? 1 : 0, bo: f === 2 ? 1 : 0, kb: 1 }));
    mx = Math.max(mx, kmh(c)); if (c.out.tok) tk++;
  }
  L(`[부스터+톡톡] 최고 ${mx.toFixed(0)}km/h 톡톡 ${tk}프레임 vtop ${(c.P.vtop * 3.6).toFixed(0)}`);
}
// 11) 저속에서 Shift: 30km/h, 20km/h
for (const v of [30, 35]) {
  const { c, w } = newCar(spec); c.setSpeed(v / 3.6);
  let mb = 0, endF = -1;
  for (let f = 0; f < 300; f++) { frame(c, w, pack({ thr: 1, steer: 1, hb: 1, kb: 1 })); mb = Math.max(mb, Math.abs(beta(c))); if (endF < 0 && c.st.dT > 0 && !c.st.drift) endF = f; }
  L(`[저속 ${v}km/h Shift 5초] drift ${c.st.drift} 끝 ${endF} 최대beta ${mb.toFixed(0)} 속도 ${kmh(c).toFixed(0)} 회전 ${c.st.wy.toFixed(2)}`);
}
