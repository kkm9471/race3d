// (임시 시험용 — 공용 틀 확인. 담당 작업자가 진짜 테마로 바꾼다)
export const look = {
  road: 0x8a93a8,
  line: 0x40e0ff,
  wall: { color: 0x9aa4b8, metalness: 0.6, roughness: 0.4, stripe: false, emissive: 0x0a2a44 },
  trees: false,
  city: false,
  far: false,
  tunnel: { color: 0x5a6070, light: 0x60e0ff },
};

export function build(ctx) {
  const { THREE } = ctx;
  // 빛나는 기둥 뿌리기
  const geo = new THREE.CylinderGeometry(0.4, 0.6, 8, 8); geo.translate(0, 4, 0);
  ctx.scatter({ geo, mat: ctx.mat({ color: 0x223344, emissive: 0x30c0ff, emissiveIntensity: 1.5 }), n: 120, from: 6, to: 80 });
  // 행성
  const p = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), ctx.mat({ color: 0xd08050, fog: false }, 'basic'));
  p.position.set(ctx.T.x[0] + 1800, 600, ctx.T.z[0] - 1500); ctx.group.add(p);
  // 도는 고리
  const ring = new THREE.Mesh(new THREE.TorusGeometry(10, 0.6, 8, 40), ctx.mat({ color: 0xffffff, emissive: 0xff40c0, emissiveIntensity: 2 }));
  ctx.place(ring, ctx.segAt(0, 0.5), 0, { face: 'along', y: 9 });
  ctx.onFrame(t => { ring.rotation.z = t; });
}
