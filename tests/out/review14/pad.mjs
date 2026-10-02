import { Sim } from '../../../web/src/sim/race.js';
import { TRACK_DEFS } from '../../../web/src/sim/tracks.js';
import { MAP_IDS } from '../../../web/src/sim/maps/index.js';
import { KART } from '../../../web/src/sim/car.js';
for (const id of MAP_IDS) {
  const sim = new Sim({ track: id, laps: 3, players: [{ car: 'masil', name: 'h' }] });
  const T = sim.T, n = T.n, ds = T.ds, c = sim.cars[0], def = T.def;
  const prof = c.botData.v; const vtop = c.P.vtop;
  for (const f of def.features) if (f.t === 'pad') {
    const ci = T.segAt(f.seg, f.at);
    // pad end
    let e = ci; while (T.padW[(e + 1) % n] > 0) e++;
    // find first sample after pad end where profile speed < vtop*1.18*0.8
    let need = null; for (let k = 1; k < 150/ds; k++) { const q = (e + k) % n; if (!need || prof[q] < need.vc) need = { k, dist: k * ds, vc: prof[q] }; }
    const vb = vtop * 1.18;
    // 제동 가능 거리: (vb^2 - vc^2) / (2*BRAKE) ; 사람 최대 제동 KART.BRAKE
    const brakeNeed = (vb * vb - need.vc * need.vc) / (2 * KART.BRAKE);
    // 벽까지 여유 없는 정도
    console.log(`${id} pad@${(ci*ds).toFixed(0)} cornerAfter ${need.dist}m vcorner ${(need.vc*3.6).toFixed(0)}km/h  boosted ${(vb*3.6).toFixed(0)}km/h  brakeNeeded ${brakeNeed.toFixed(0)}m ${brakeNeed > need.dist ? 'SHORT' : ''}`);
  }
}
