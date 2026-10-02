import { Sim, GO_FRAME, FPS } from '../../../web/src/sim/race.js';
import { pack } from '../../../web/src/sim/input.js';
import { TRACK_DEFS } from '../../../web/src/sim/tracks.js';
import { MAP_IDS } from '../../../web/src/sim/maps/index.js';
// 조향 부호 보정
function mkSim(id, carId='masil') { return new Sim({ track: id, laps: 3, players: [{ car: carId, name: 'h' }] }); }
function put(sim, i0, d0, v) {
  const T = sim.T, c = sim.cars[0], st = c.st, n = T.n;
  const x = T.x[i0] + T.lx[i0]*d0, z = T.z[i0] + T.lz[i0]*d0;
  const yaw = Math.atan2(T.tx[i0], T.tz[i0]);
  const y = sim.groundY(x, z, i0) + c.spec.cgH + 0.05;
  c.place(x, y, z, yaw); st.hint = i0; for (const w of st.w) w.hint = i0;
  c.setSpeed(v);
  sim.gs.frame = GO_FRAME + 10000; st.prog = 0;
}
export function runSplit(id, sp, { drift, lateEntry, carId='masil', dT=0, lookV=0.5 }) {
  const sim = mkSim(id, carId), T = sim.T, n = T.n, c = sim.cars[0], st = c.st;
  const side = sp.side;
  const lane = (i) => side * (T.hw[i] - 2.2);   // 지름길 차선 중심(대략)
  const len = ((sp.b - sp.a) % n + n) % n;
  const startI = (sp.a - Math.round(90 / T.ds) + n) % n;
  // 시작: 중심선, 최고속
  put(sim, startI, 0, c.P.vtop);
  let hits = 0, strong = 0, resets = 0, minV = 1e9, finishI = -1, t = 0, f = 0, stuck = 0;
  const endI = (sp.b + Math.round(50 / T.ds)) % n;
  let wasDrift = false, divHit = 0;
  let driftOn = false;
  for (f = 0; f < 60 * 30; f++) {
    const loc = sim.world.locate(st.px, st.pz, st.hint); const i = loc.i; 
    const rel = ((i - sp.a) % n + n) % n; const relInSplit = rel > n/2 ? rel - n : rel;  // 샘플 단위, 분리대 시작 기준
    // 목표 가로 위치
    let dt;
    const toNose = -relInSplit * T.ds; // m 앞
    const ent = lateEntry ? 14 : 40;   // 코 앞 몇 m 부터 차선을 바꿀지
    if (toNose > ent) dt = 0; else dt = lane(i);
    // 조향: 룩어헤드
    const v = Math.max(8, c.out.speed);
    const Ld = Math.max(10, v * lookV);
    const j = (i + Math.round(Ld / T.ds)) % n;
    const dj = toNose > ent ? 0 : lane(j);
    const tx = T.x[j] + T.lx[j]*dj, tz = T.z[j] + T.lz[j]*dj;
    const fwdx = 2 * (st.qx * st.qz + st.qw * st.qy), fwdz = 1 - 2 * (st.qx * st.qx + st.qy * st.qy);
    const ex = tx - st.px, ez = tz - st.pz, el = Math.hypot(ex, ez);
    const cross = fwdx * ez - fwdz * ex;  // >0: target to the... 
    const dot = fwdx * ex + fwdz * ez;
    const ang = Math.atan2(cross, dot);
    let steer = Math.max(-1, Math.min(1, -ang * 2.2 * (SGN)));
    let hb = 0;
    if (drift) {
      // 지름길 코너 구간에서 Shift
      if (relInSplit >= -Math.round(dT/T.ds) && relInSplit <= len) hb = 1;
    }
    sim.step([pack({ thr: 1, kb: 1, steer, hb })]);
    for (const e of sim.events) { if (e.t === 'wall') { hits++; if (e.vn > 5) { strong++; if (process.env.DBG) console.log('   hit rel(m)',(relInSplit*T.ds).toFixed(0),'vn',e.vn.toFixed(1),'d',loc.d.toFixed(1),'v',(c.out.speed*3.6).toFixed(0),'len',(len*T.ds).toFixed(0)); } } if (e.t === 'reset') resets++; }
    minV = Math.min(minV, c.out.speed * 3.6);
    if (c.out.speed < 2) { stuck++; if (stuck > 90) break; } else stuck = 0;
    const loc2 = sim.world.locate(st.px, st.pz, st.hint);
    const rel2 = ((loc2.i - endI) % n + n) % n;
    if (rel2 < n/2 && rel2 < 20 && f > 30 && ((loc2.i - startI + n) % n) > ((endI - startI + n)%n) - 5) { finishI = loc2.i; break; }
  }
  return { f, hits, strong, resets, minV, stuck, t: f / FPS, ok: finishI >= 0 };
}
let SGN = 1;
// 보정
{
  const sim = mkSim('village'); const c = sim.cars[0], st = c.st;
  put(sim, 5, 0, c.P.vtop);
  const fx0 = 2 * (st.qx * st.qz + st.qw * st.qy);
  for (let k = 0; k < 20; k++) sim.step([pack({ thr: 1, kb: 1, steer: 1 })]);
  const loc = sim.world.locate(st.px, st.pz, st.hint);
  SGN = loc.d > 0 ? 1 : -1;   // steer +1 → d>0(left)?  then steer = -ang*... mapping; we want left -> steer sign
  console.error('steer +1 -> d', loc.d.toFixed(2), 'SGN', SGN);
}
const opts = JSON.parse(process.env.OPTS || '{}');
const only = process.argv.slice(2);
for (const id of MAP_IDS) {
  if (only.length && !only.includes(id)) continue;
  const sim = mkSim(id); const T = sim.T;
  const sps = T.splits;
  sps.forEach((sp, k) => {
    const r = runSplit(id, sp, opts);
    console.log(`${id} split${k} @${(sp.a*T.ds).toFixed(0)} ${JSON.stringify(opts)}: ok=${r.ok} hits=${r.hits} strong=${r.strong} minV=${r.minV.toFixed(0)} stuck=${r.stuck} t=${r.t.toFixed(1)}`);
  });
}
