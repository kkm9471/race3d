import { TRACK_DEFS } from '../web/src/sim/tracks.js';
for (const def of TRACK_DEFS) {
  let x = 0, z = 0, psi = 0; const heads = [];
  def.segs.forEach((sg, i) => {
    if (sg[0] === 'S') { heads.push([i, psi, sg[1]]); x += Math.sin(psi) * sg[1]; z += Math.cos(psi) * sg[1]; }
    else { const a = sg[2] * Math.PI / 180, R = sg[1], n = 60; for (let k = 0; k < n; k++) { const pm = psi + a / n / 2; const L = Math.abs(a) * R / n; x += Math.sin(pm) * L; z += Math.cos(pm) * L; psi += a / n; } }
  });
  const ex = x, ez = z;
  console.log(def.id, 'end', ex.toFixed(0), ez.toFixed(0));
  for (let p = 0; p < heads.length; p++) for (let q = p + 1; q < heads.length; q++) {
    const [ia, pa, la] = heads[p], [ib, pb, lb] = heads[q];
    const ax = Math.sin(pa), az = Math.cos(pa), bx = Math.sin(pb), bz = Math.cos(pb);
    const det = ax * bz - bx * az; if (Math.abs(det) < 0.3) continue;
    const da = (-ex * bz + bx * ez) / det, db = (az * ex - ax * ez) / det;
    const na = la + da, nb = lb + db;
    if (na > 60 && nb > 60 && na < 700 && nb < 700) console.log(`  close [${ia},${ib}] -> ${na.toFixed(0)}, ${nb.toFixed(0)}`);
  }
}
