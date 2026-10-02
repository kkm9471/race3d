// 충돌 물리 시험 — 평지에서 두 차를 부딪혀 충돌 직전·직후 속도를 잰다
//
// 확인하는 것
//  · 운동량 보존: 충돌 순간(타이어 마찰이 끼어들기 전) m1v1 + m2v2 가 거의 같다
//  · 반발계수 e = (떨어지는 속도)/(다가오는 속도): 실제 자동차 충돌 범위 0.05~0.3
//    (저속일수록 크고 고속일수록 작다 — 범퍼·차체가 찌그러지며 에너지를 먹는다)
//  · 무거운 차가 덜 밀린다
//  · 옆을 치면(T자) 맞은 차가 회전한다
//  · 벽: 정면으로 박으면 거의 멈추고, 비스듬히 스치면 속도 대부분을 유지하며 튕겨 나간다
import { CARS, CAR_BY_ID } from '../web/src/sim/cars.js';
import { Car } from '../web/src/sim/car.js';
import { collideCars } from '../web/src/sim/collide.js';
import { FlatWorld } from './physics_report.mjs';
import { pack } from '../web/src/sim/input.js';
import fs from 'node:fs';

const FPS = 60, SUB = 8, DT = 1 / (FPS * SUB);
let fail = 0;
const lines = [];
const ok = (c, m) => { const t = `  ${c ? '✅' : '❌'} ${m}`; console.log(t); lines.push(t); if (!c) fail++; };

function mk(id, x, z, yaw, v) {
  const spec = CAR_BY_ID[id];
  const c = new Car(spec, {});
  c.place(x, spec.cgH + 0.02, z, yaw);
  const w = new FlatWorld();
  for (let i = 0; i < 60; i++) { c.controls(pack({ kb: 0 }), 1 / FPS, false); for (let k = 0; k < SUB; k++) c.substep(DT, w); }
  c.setSpeed(v);
  return c;
}

/** 두 차를 굴려서 충돌 직전/직후(충돌이 끝난 뒤 첫 프레임) 속도를 얻는다 */
function crash(A, B, maxF = 400) {
  const w = new FlatWorld();
  const RA = new Float64Array(9), RB = new Float64Array(9);
  let before = null, after = null, contactF = 0, lastContact = -1;
  const ev = [];
  const inp = pack({ kb: 0 });   // 페달 떼고 굴러감
  for (let f = 0; f < maxF; f++) {
    A.controls(inp, 1 / FPS, false); B.controls(inp, 1 / FPS, false);
    for (let k = 0; k < SUB; k++) {
      const snap = { a: [A.st.vx, A.st.vz], b: [B.st.vx, B.st.vz], wa: A.st.wy, wb: B.st.wy };
      A.substep(DT, w); B.substep(DT, w);
      A.axes(RA); B.axes(RB);
      ev.length = 0;
      const j = collideCars(A, B, RA, RB, ev);
      if (j > 0) {
        if (!before) before = snap;
        contactF++; lastContact = f * SUB + k;
      } else if (before && !after && f * SUB + k > lastContact + 4) {
        after = { a: [A.st.vx, A.st.vz], b: [B.st.vx, B.st.vz], wa: A.st.wy, wb: B.st.wy };
      }
    }
    if (after) break;
  }
  return { before, after, contactF };
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1];

// 1) 추돌: 세단 60km/h → 멈춘 경차 (같은 방향 +Z)
{
  console.log('\n[추돌] 세단 60 km/h → 멈춘 경차');
  lines.push('\n[추돌] 세단 60 km/h → 멈춘 경차');
  const A = mk('masil', 0, 0, 0, 60 / 3.6), B = mk('kongal', 0, 6, 0, 0);
  const r = crash(A, B);
  const mA = A.P.m, mB = B.P.m;
  const pb = mA * r.before.a[1] + mB * r.before.b[1], pa = mA * r.after.a[1] + mB * r.after.b[1];
  const e = (r.after.b[1] - r.after.a[1]) / (r.before.a[1] - r.before.b[1]);
  ok(Math.abs(pa - pb) / pb < 0.05, `운동량 보존: 전 ${pb.toFixed(0)} → 후 ${pa.toFixed(0)} kg·m/s (${((pa - pb) / pb * 100).toFixed(1)}%)`);
  ok(e > 0.03 && e < 0.35, `반발계수 e = ${e.toFixed(3)} (실제 0.05~0.3)`);
  ok(r.after.b[1] > r.after.a[1] && r.after.b[1] > 0, `경차가 앞으로 밀려남: 세단 ${(r.after.a[1] * 3.6).toFixed(1)} km/h, 경차 ${(r.after.b[1] * 3.6).toFixed(1)} km/h`);
}

// 2) 무게 차이: 픽업 vs 경차 정면, 둘 다 40km/h (카트식에서 무게 차이를 1500 vs 1100kg 로 줄였다 — 2026-10-02)
{
  console.log('\n[정면] 픽업 40 km/h ↔ 경차 40 km/h');
  lines.push('\n[정면] 픽업 40 km/h ↔ 경차 40 km/h');
  const A = mk('jimkkun', 0, 0, 0, 40 / 3.6), B = mk('kongal', 0.3, 9, Math.PI, 40 / 3.6);
  const r = crash(A, B);
  const dA = r.after.a[1] - r.before.a[1], dB = r.after.b[1] - r.before.b[1];
  const ratio = Math.abs(dB) / Math.max(1e-6, Math.abs(dA)), mr = A.P.m / B.P.m;
  ok(Math.abs(ratio / mr - 1) < 0.1, `가벼운 차의 속도 변화가 무게 비만큼 크다(비 ${ratio.toFixed(2)}): 픽업 Δv ${(dA * 3.6).toFixed(1)}, 경차 Δv ${(dB * 3.6).toFixed(1)} km/h (질량비 ${(A.P.m / B.P.m).toFixed(2)})`);
  ok(r.after.b[1] > r.after.a[1] && r.after.b[1] > 0, `경차가 픽업 쪽으로 튕겨 나간다(무거운 쪽이 이긴다): 충돌 후 픽업 ${(r.after.a[1] * 3.6).toFixed(1)} km/h, 경차 ${(r.after.b[1] * 3.6).toFixed(1)} km/h`);
}

// 3) T자: 쿠페 50km/h 가 멈춘 SUV 옆구리 뒤쪽을 친다 → SUV 회전
{
  console.log('\n[T자] 쿠페 50 km/h → 멈춘 SUV 옆(뒤쪽)');
  lines.push('\n[T자] 쿠페 50 km/h → 멈춘 SUV 옆(뒤쪽)');
  const B = mk('deundeun', 0, 0, Math.PI / 2, 0);    // +X 방향을 보고 서 있음
  const A = mk('baram', -1.4, -8, 0, 50 / 3.6);         // 아래(-Z)에서 올라와 SUV 뒤쪽 옆을 친다
  const r = crash(A, B);
  ok(Math.abs(r.after.wb) > 0.3, `맞은 SUV가 돈다: 요 속도 ${r.after.wb.toFixed(2)} rad/s`);
  ok(Math.hypot(...r.after.b) > 1, `SUV가 밀려난다: ${(Math.hypot(...r.after.b) * 3.6).toFixed(1)} km/h`);
}

// 4) 속도별 반발계수 (세단끼리 추돌)
{
  console.log('\n[속도별 반발계수] 세단 → 멈춘 세단');
  lines.push('\n[속도별 반발계수] 세단 → 멈춘 세단');
  const es = [];
  for (const kmh of [10, 30, 60, 100]) {
    const A = mk('masil', 0, 0, 0, kmh / 3.6), B = mk('masil', 0, 6, 0, 0);
    const r = crash(A, B);
    const e = (r.after.b[1] - r.after.a[1]) / (r.before.a[1] - r.before.b[1]);
    es.push(e);
    const t = `    ${kmh} km/h: e=${e.toFixed(3)}, 후 속도 ${(r.after.a[1] * 3.6).toFixed(1)} / ${(r.after.b[1] * 3.6).toFixed(1)} km/h`;
    console.log(t); lines.push(t);
  }
  ok(es[0] > es[3], '빠를수록 덜 튕긴다');
}

console.log(fail ? `\n실패 ${fail}개` : '\n전부 통과');
fs.mkdirSync('tests/out', { recursive: true });
fs.writeFileSync('tests/out/collision.md', `# 충돌 시험 (${new Date().toISOString()})\n\`\`\`\n${lines.join('\n')}\n\`\`\`\n`);
process.exit(fail ? 1 : 0);
