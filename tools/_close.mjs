import { TRACK_DEFS } from '../web/src/sim/tracks.js';
for (const def of TRACK_DEFS) {
  let x = 0, z = 0, psi = 0, tot = 0;
  const pts = [];
  def.segs.forEach((sg, i) => {
    if (sg[0] === 'S') { x += Math.sin(psi) * sg[1]; z += Math.cos(psi) * sg[1]; }
    else { const a = sg[2] * Math.PI / 180, R = sg[1], n = 50; for (let k = 0; k < n; k++) { const pm = psi + a / n / 2; const L = Math.abs(a) * R / n; x += Math.sin(pm) * L; z += Math.cos(pm) * L; psi += a / n; } tot += sg[2]; }
    pts.push(`${i}:(${x.toFixed(0)},${z.toFixed(0)}) h${(psi * 180 / Math.PI).toFixed(0)}`);
  });
  console.log(def.id, 'angle', tot, 'end', x.toFixed(1), z.toFixed(1));
  console.log(pts.join('  '));
}
