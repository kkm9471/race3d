const segs = [['S', 380], ['A', 22, -90], ['S', 180], ['A', 20, -90], ['S', 120], ['A', 20, 90], ['S', 140], ['A', 22, -90], ['S', 300], ['A', 25, -90], ['S', 160], ['A', 30, 45], ['A', 30, -45], ['S', 200], ['A', 22, -90], ['S', 100]];
let x = 0, z = 0, psi = 0; const heads = [];
segs.forEach((sg, i) => {
  if (sg[0] === 'S') { heads.push([i, psi, sg[1]]); x += Math.sin(psi) * sg[1]; z += Math.cos(psi) * sg[1]; }
  else { const a = sg[2] * Math.PI / 180, R = sg[1], n = 60; for (let k = 0; k < n; k++) { const pm = psi + a / n / 2; const L = Math.abs(a) * R / n; x += Math.sin(pm) * L; z += Math.cos(pm) * L; psi += a / n; } }
});
console.log('end', x.toFixed(0), z.toFixed(0), 'psi', (psi * 180 / Math.PI).toFixed(0));
for (let p = 0; p < heads.length; p++) for (let q = p + 1; q < heads.length; q++) {
  const [ia, pa, la] = heads[p], [ib, pb, lb] = heads[q];
  const ax = Math.sin(pa), az = Math.cos(pa), bx = Math.sin(pb), bz = Math.cos(pb);
  const det = ax * bz - bx * az; if (Math.abs(det) < 0.3) continue;
  const da = (-x * bz + bx * z) / det, db = (az * x - ax * z) / det;
  if (la + da > 60 && lb + db > 60 && la + da < 600 && lb + db < 600) console.log(`close [${ia},${ib}] -> ${(la + da).toFixed(0)}, ${(lb + db).toFixed(0)}`);
}
