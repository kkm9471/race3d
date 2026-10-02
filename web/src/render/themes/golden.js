// 14회차 테마: golden — 황금 문명 유적
// 이끼 낀 돌판 노면(금빛 가장자리 선), 이끼 돌 벽, 진한 초록 정글 나무, 횃불 켠 돌 터널,
// 계단식 피라미드 신전(꼭대기 금빛 지붕), 금빛 수호 석상 쌍·제단(불꽃), 덩굴 낀 돌기둥, 길을 가로지르는 돌 관문(금 태양 원반), 폭포(흐르는 물줄기·물안개)

/** 이끼 낀 돌판 노면 (u = 길 폭, v = 10m 마다 1): 2×2 큰 돌판 + 틈 + 가장자리 이끼 */
function roadStone(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#c9bd9c'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 500; k++) {
      const v = 150 + Math.floor(ctx.rand() * 70);
      g.fillStyle = `rgba(${v},${v - 8},${v - 30},0.22)`;
      g.fillRect(ctx.rand() * w, ctx.rand() * h, 2 + ctx.rand() * 14, 2 + ctx.rand() * 10);
    }
    g.fillStyle = 'rgba(70,60,40,0.55)';
    g.fillRect(0, 0, w, 3); g.fillRect(0, h / 2, w, 3);
    g.fillRect(0, 0, 3, h); g.fillRect(w / 2, 0, 3, h);
    g.fillStyle = 'rgba(255,255,230,0.25)';
    g.fillRect(3, 3, w / 2 - 6, 2); g.fillRect(w / 2 + 3, 3, w / 2 - 6, 2);
    // 이끼 얼룩
    for (let k = 0; k < 40; k++) {
      g.fillStyle = `rgba(${60 + Math.floor(ctx.rand() * 30)},${110 + Math.floor(ctx.rand() * 40)},50,0.28)`;
      g.beginPath(); g.ellipse(ctx.rand() * w, ctx.rand() * h, 4 + ctx.rand() * 14, 3 + ctx.rand() * 8, ctx.rand() * 3, 0, 7); g.fill();
    }
    // 가운데 금빛 나선 무늬 점
    g.fillStyle = 'rgba(214,170,60,0.7)';
    for (let y = 16; y < h; y += 64) { g.beginPath(); g.arc(w / 2 + 1.5, y, 4, 0, 7); g.fill(); }
  });
}

/** 이끼 돌블록 (벽·기둥·피라미드 공용, u·v 모두 자유) */
function blockStone(ctx, base = '#8f9482', moss = true) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    const bh = 32;
    for (let y = 0; y < h; y += bh) {
      const off = (y / bh) % 2 ? 32 : 0;
      for (let x = -off; x < w; x += 64) {
        const v = Math.floor(ctx.rand() * 28) - 14;
        g.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v) / 120})`;
        g.fillRect(x + 1, y + 1, 62, bh - 2);
      }
      g.fillStyle = 'rgba(30,30,24,0.6)'; g.fillRect(0, y, w, 2);
      for (let x = -off; x < w; x += 64) g.fillRect(x, y, 2, bh);
    }
    if (moss) for (let k = 0; k < 70; k++) {
      g.fillStyle = `rgba(${55 + Math.floor(ctx.rand() * 30)},${105 + Math.floor(ctx.rand() * 50)},45,${0.25 + ctx.rand() * 0.3})`;
      g.beginPath(); g.ellipse(ctx.rand() * w, ctx.rand() * h, 5 + ctx.rand() * 16, 3 + ctx.rand() * 10, ctx.rand() * 3, 0, 7); g.fill();
    }
  });
}

/** 벽 (u = 안쪽 면 아래→위→윗면→바깥, v = 4m 마다 1) */
function wallTex(ctx) {
  const t = blockStone(ctx, '#85897a');
  return t;
}

/** 정글 바닥: 짙은 초록 + 낙엽 + 흙 (u,v = 10m) */
function jungleFloor(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#5f9040'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 900; k++) {
      const s = ctx.rand();
      g.fillStyle = s < 0.6 ? `rgba(${30 + Math.floor(ctx.rand() * 30)},${70 + Math.floor(ctx.rand() * 50)},${25},0.35)` : s < 0.85 ? `rgba(100,75,40,0.28)` : `rgba(150,170,70,0.25)`;
      g.fillRect(ctx.rand() * w, ctx.rand() * h, 2 + ctx.rand() * 9, 2 + ctx.rand() * 9);
    }
  });
}

/** 터널 안: 돌블록 + 금빛 띠 + 물결 문양 (u = 둘레 0~3, v = 6m 마다 1) */
function tunnelTex(ctx) {
  return ctx.canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#b9a883'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) {
      g.fillStyle = 'rgba(40,30,15,0.55)'; g.fillRect(0, y, w, 2);
      const off = (y / 32) % 2 ? 32 : 0;
      for (let x = -off; x < w; x += 64) g.fillRect(x, y, 2, 32);
    }
    // 문양 띠(물결)
    g.fillStyle = '#d4a93c'; g.fillRect(0, 96, w, 10); g.fillRect(0, 170, w, 10);
    g.strokeStyle = '#6b4a14'; g.lineWidth = 3; g.beginPath();
    for (let x = 0; x <= w; x += 16) g.lineTo(x, 138 + (x / 16 % 2 ? 10 : -10));
    g.stroke();
    for (let k = 0; k < 120; k++) {
      g.fillStyle = `rgba(60,50,30,${0.08 + ctx.rand() * 0.1})`;
      g.fillRect(ctx.rand() * w, ctx.rand() * h, 3 + ctx.rand() * 10, 2 + ctx.rand() * 6);
    }
  });
}

/** 덩굴 기둥: 돌 + 세로 덩굴 */
function pillarTex(ctx) {
  return ctx.canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#9a9a86'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) { g.fillStyle = 'rgba(30,30,24,0.5)'; g.fillRect(0, y, w, 2); }
    for (let k = 0; k < 9; k++) {
      const x = ctx.rand() * w, len = 40 + ctx.rand() * 80;
      g.strokeStyle = `rgba(${40 + Math.floor(ctx.rand() * 30)},${110 + Math.floor(ctx.rand() * 50)},40,0.85)`; g.lineWidth = 2 + ctx.rand() * 3;
      g.beginPath(); g.moveTo(x, h); for (let y = h; y > h - len; y -= 8) g.lineTo(x + Math.sin(y * 0.2 + k) * 4, y); g.stroke();
    }
    g.fillStyle = '#d4a93c'; g.fillRect(0, 6, w, 5);
  });
}

/** 폭포: 세로 흰 물줄기 (v 방향으로 흐른다) */
function waterTex(ctx) {
  return ctx.canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#8fd0e8'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 60; k++) {
      const x = ctx.rand() * w, len = 40 + ctx.rand() * 120, y = ctx.rand() * h;
      g.fillStyle = `rgba(255,255,255,${0.35 + ctx.rand() * 0.4})`;
      g.fillRect(x, y, 2 + ctx.rand() * 5, len);
      g.fillRect(x, y - h, 2 + ctx.rand() * 5, len);
    }
  }, { srgb: true });
}

/** 계단식 피라미드 지오메트리 두 개: stone(단·계단·신전) / gold(지붕·장식). 앞면 = +Z */
function pyramidGeo(THREE, mergeGeo, base, tiers, th) {
  const mergeGeometries = arr => mergeGeo(arr.map(g => (g.index ? g.toNonIndexed() : g)));
  const stone = [], gold = [];
  const widths = [];
  for (let k = 0; k < tiers; k++) widths.push(base * (1 - k * 0.8 / tiers));
  for (let k = 0; k < tiers; k++) {
    const g = new THREE.BoxGeometry(widths[k], th, widths[k]); g.translate(0, k * th + th / 2, 0);
    stone.push(g);
    // 단 가장자리 금빛 띠
    const t = new THREE.BoxGeometry(widths[k] + 0.3, 0.35, widths[k] + 0.3); t.translate(0, (k + 1) * th - 0.1, 0);
    gold.push(t);
  }
  // 앞 계단 (옆에서 본 계단 모양을 폭만큼 늘림)
  const sw = base * 0.2, steps = tiers * 4, sh = th / 4;
  const sp = new THREE.Shape();
  const z0 = widths[0] / 2 + 0.5, z1 = widths[tiers - 1] / 2 + 0.5;
  sp.moveTo(0, 0);
  for (let j = 0; j < steps; j++) {
    const z = z0 + (z1 - z0) * j / steps;
    sp.lineTo(z, j * sh); sp.lineTo(z, (j + 1) * sh);
  }
  sp.lineTo(0, steps * sh); sp.closePath();
  const sg = new THREE.ExtrudeGeometry(sp, { depth: sw, bevelEnabled: false });
  // 모양 좌표 (x=앞 거리, y=높이) 를 (z=앞, y=높이, x=폭) 으로
  sg.rotateY(-Math.PI / 2); sg.translate(sw / 2, 0, 0);
  stone.push(sg);
  // 꼭대기 신전
  const top = tiers * th, tw = widths[tiers - 1] * 0.8;
  const cella = new THREE.BoxGeometry(tw, th * 0.9, tw * 0.8); cella.translate(0, top + th * 0.45, 0); stone.push(cella);
  const roof = new THREE.BoxGeometry(tw * 1.25, 0.8, tw * 1.05); roof.translate(0, top + th * 0.9 + 0.4, 0); gold.push(roof);
  const crest = new THREE.ConeGeometry(tw * 0.45, th * 0.9, 4); crest.rotateY(Math.PI / 4); crest.translate(0, top + th * 0.9 + 0.8 + th * 0.45, 0); gold.push(crest);
  const door = new THREE.BoxGeometry(tw * 0.3, th * 0.6, 0.3); door.translate(0, top + th * 0.3, tw * 0.4 + 0.1); gold.push(door);
  return { stone: mergeGeometries(stone), gold: mergeGeometries(gold), top: top + th * 1.8 };
}

/** 수호 석상 (앞 = +Z) → stone(받침·몸) / gold(얼굴·장식) */
function statueGeo(THREE, mergeGeometries) {
  const stone = [], gold = [];
  const ped = new THREE.BoxGeometry(2.6, 1.2, 2.6); ped.translate(0, 0.6, 0); stone.push(ped);
  const ledge = new THREE.BoxGeometry(4.2, 6, 4.2); ledge.translate(0, -2.0, -0.6); stone.push(ledge);
  const body = new THREE.BoxGeometry(1.8, 2.6, 1.2); body.translate(0, 2.5, 0); gold.push(body);
  const legL = new THREE.BoxGeometry(0.7, 1.3, 0.8); legL.translate(-0.5, 1.85, 0); gold.push(legL);
  const head = new THREE.BoxGeometry(1.2, 1.2, 1.1); head.translate(0, 4.4, 0); gold.push(head);
  const dress = new THREE.BoxGeometry(1.6, 0.4, 1.4); dress.translate(0, 5.2, 0); gold.push(dress);
  const feather = new THREE.ConeGeometry(0.9, 1.6, 4); feather.translate(0, 6.1, 0); gold.push(feather);
  for (const s of [-1, 1]) {
    const arm = new THREE.BoxGeometry(0.5, 2.0, 0.5); arm.translate(s * 1.2, 2.6, 0.3); gold.push(arm);
    const eye = new THREE.BoxGeometry(0.22, 0.14, 0.1); eye.translate(s * 0.28, 4.5, 0.58); stone.push(eye);
  }
  return { stone: mergeGeometries(stone), gold: mergeGeometries(gold) };
}

export const look = {
  road: 0xb0a082,
  roadTex: roadStone,
  roadRough: 0.85,
  line: 0xf2c94c,
  wall: { color: 0xffffff, map: wallTex, roughness: 0.9, metalness: 0 },
  rail: 0xc9a23c,
  rock: 0xc4dca8,
  terrainTex: jungleFloor,
  runoffTex: jungleFloor,
  runoffColor: 0xa8c888,
  trees: { n: 2.2, conifer: 0.05, hue: [0.25, 0.37], sat: [0.55, 0.85], light: [0.06, 0.15], trunk: 0x4a3a28 },
  far: [0x2c5a3a, 0x5d8a72],
  banner: { bg: '#2c4a22', fg: '#f2c94c' },
  tunnel: { color: 0xd8c8a0, map: tunnelTex, light: 0xffa850, emissive: 0x3a2610, portal: 0x8a8468 },
  // 실사: 이끼 낀 사암 길·벽, 진한 정글 땅, 활엽수 가득한 숲, 따뜻한 오후 하늘
  real: {
    sky: 'qwantani_late_afternoon_puresky', exposure: 1.0,
    road: { tex: 'mossy_sandstone', scale: 2.5, tint: 0xf0ead8, bright: 1.9, env: 1.0 },
    runoff: { tex: 'forest_ground_04', scale: 3, tint: 0xb8d098 },
    terrain: { tex: 'forest_ground_04', scale: 5, tint: 0xa8c888 },
    rock: { tex: 'mossy_sandstone', scale: 3.5, tint: 0xd8e8b8, bright: 1.7 },
    wall: { tex: 'mossy_sandstone', scale: 2.5, tint: 0xece0c0, bright: 1.7 },
    trees: { con: ['island_tree_02'], broad: ['island_tree_01', 'island_tree_02'], h: [9, 17], n: 0.9, tint: 0xd8e8c0 },
  },
};

export function build(ctx) {
  const { THREE, T, rand, mergeGeometries } = ctx;
  const m4 = new THREE.Matrix4(), qn = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v3 = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  const instanced = (geo, mat, list, { shadow = false } = {}) => {
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    list.forEach((o, k) => {
      qn.setFromAxisAngle(up, o.yaw || 0);
      im.setMatrixAt(k, m4.compose(v3.set(o.x, o.y, o.z), qn, sc.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1)));
    });
    im.count = list.length;
    im.castShadow = shadow && ctx.q.detail >= 1; im.receiveShadow = true;
    im.computeBoundingSphere();
    ctx.group.add(im);
    return im;
  };
  // ── 암벽: 엔진이 그린 암벽 재질(look.rock 색 0xc4dca8)을 이끼 낀 밝은 돌로 ──
  {
    const cliff = ctx.canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#5a674a'; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 160; k++) {
        const x = ctx.rand() * w, len = 30 + ctx.rand() * 120;
        g.fillStyle = ctx.rand() < 0.5 ? `rgba(60,90,40,${0.15 + ctx.rand() * 0.25})` : `rgba(240,235,200,${0.08 + ctx.rand() * 0.12})`;
        g.fillRect(x, ctx.rand() * h, 3 + ctx.rand() * 14, len);
      }
      for (let y = 0; y < h; y += 42) { g.fillStyle = 'rgba(40,45,30,0.35)'; g.fillRect(0, y, w, 3); }
      for (let k = 0; k < 14; k++) {
        const x = ctx.rand() * w; g.strokeStyle = 'rgba(70,130,50,0.8)'; g.lineWidth = 2 + ctx.rand() * 3; g.beginPath(); g.moveTo(x, 0);
        for (let y = 0; y < h * (0.4 + ctx.rand() * 0.6); y += 8) g.lineTo(x + Math.sin(y * 0.15 + k) * 5, y); g.stroke();
      }
    });
    ctx.group.traverse(o => {
      const m = o.material;
      if (o.isMesh && m && m.color && m.color.getHex() === 0xc4dca8) { m.map = cliff; m.color.setHex(0xffffff); m.emissive.setHex(0x0e160a); m.needsUpdate = true; }
    });
  }
  // 암벽·땅 위 높이 재기: 위에서 아래로 광선 (암벽은 땅보다 솟아 있다)
  const rocks = [];
  ctx.group.traverse(o => { if (o.isMesh && o.material && o.material.color && o.material.emissive && o.material.emissive.getHex() === 0x0e160a) rocks.push(o); });
  const ray = new THREE.Raycaster(), rayO = new THREE.Vector3(), rayD = new THREE.Vector3(0, -1, 0);
  rocks.forEach(o => { o.updateMatrixWorld(true); o.userData._side = o.material.side; o.material.side = THREE.DoubleSide; });
  const surf = (x, z) => {
    let y = ctx.ground(x, z);
    ray.set(rayO.set(x, 600, z), rayD);
    const hit = ray.intersectObjects(rocks, false)[0];
    if (hit && hit.point.y > y) y = hit.point.y;
    return y;
  };
  const goldM = ctx.mat({ color: 0xe8a820, roughness: 0.32, metalness: 0.9, emissive: 0x6a4200, emissiveIntensity: 0.7 });
  const stoneM = ctx.mat({ map: blockStone(ctx, '#8e9380'), color: 0x9d9680, roughness: 0.9 });
  const taken = [];       // 큰 소품 자리
  const free = (x, z, r, m = 3) => ctx.clear(x, z, r + m) && taken.every(t => Math.hypot(t.x - x, t.z - z) > t.r + r + 2);

  // ── 계단식 피라미드 신전 (랜드마크 4개) ──
  const pyrs = [[2, 0.5, 1, 70, 5], [13, 0.5, -1, 60, 4], [20, 0.5, -1, 52, 4], [31, 0.3, 1, 66, 5], [38, 0.5, -1, 56, 4]];
  let pyrCount = 0;
  const pyrAt = [];
  for (const [s, f, side, base, tiers] of pyrs) {
    const i = ctx.segAt(s, f);
    let placed = false;
    for (let dd = 30; dd <= 170 && !placed; dd += 10) {
      const off = side * (ctx.wallAt(i, side) + dd + base / 2);
      const p = ctx.pt(i, off);
      if (!free(p.x, p.z, base * 0.75, 6)) continue;
      const th = 5.5;
      const geo = pyramidGeo(THREE, mergeGeometries, base, tiers, th);
      const gy = ctx.ground(p.x, p.z);
      // 땅이 기울어 있어도 묻히게 아래로 더 깊게 (받침)
      const grp = new THREE.Group();
      const a = new THREE.Mesh(geo.stone, stoneM), b = new THREE.Mesh(geo.gold, goldM);
      a.castShadow = b.castShadow = ctx.q.detail >= 1; a.receiveShadow = true;
      grp.add(a, b);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(base * 0.98, 14, base * 0.98), stoneM); foot.position.y = -6.9; grp.add(foot);
      grp.position.set(p.x, gy, p.z);
      grp.rotation.y = p.yaw + (side > 0 ? -Math.PI / 2 : Math.PI / 2);     // 계단 쪽이 길을 봄
      ctx.group.add(grp);
      taken.push({ x: p.x, z: p.z, r: base * 0.75 });
      pyrAt.push({ x: p.x, z: p.z, top: gy + geo.top, i });
      placed = true; pyrCount++;
    }
  }

  // ── 수호 석상 (길 양옆 쌍) ──
  const sg = statueGeo(THREE, mergeGeometries);
  const stat = [];
  for (const [sg0, f] of [[0, 0.7], [1, 0.9], [5, 0.0], [9, 0.55], [12, 0.6], [17, 0.5], [23, 0.0], [24, 0.7], [29, 0.95], [36, 0.8], [40, 0.4], [40, 0.9]]) {
    const i = ctx.segAt(sg0, f);
    for (const side of [1, -1]) {
      // 암벽 면(벽에서 3m 안쪽)에 파낸 감실처럼 세운다
      const p = ctx.pt(i, side * (ctx.wallAt(i, side) + 3.2));
      const gy = surf(p.x, p.z);
      stat.push({ x: p.x, y: gy - 1.0, z: p.z, yaw: p.yaw + (side > 0 ? -Math.PI / 2 : Math.PI / 2), sx: 1.2, sy: 1.2, sz: 1.2 });
      taken.push({ x: p.x, z: p.z, r: 3.5 });
    }
  }
  instanced(sg.stone, stoneM, stat, { shadow: true });
  instanced(sg.gold, goldM, stat, { shadow: true });

  // ── 제단 (계단 위 금 그릇 + 불꽃) ──
  const altars = [];
  for (const [s, f, side] of [[0, 0.45, 1], [7, 0.5, -1], [17, 0.3, 1], [25, 0.5, -1], [36, 0.3, -1]]) {
    const i = ctx.segAt(s, f);
    const p = ctx.pt(i, side * (ctx.wallAt(i, side) + 10));
    if (!free(p.x, p.z, 4, 2)) continue;
    altars.push({ x: p.x, y: ctx.ground(p.x, p.z) - 0.4, z: p.z, yaw: p.yaw });
    taken.push({ x: p.x, z: p.z, r: 4 });
  }
  const altarStone = (() => {
    const a = [];
    for (let k = 0; k < 3; k++) { const g = new THREE.BoxGeometry(5 - k * 1.4, 0.7, 5 - k * 1.4); g.translate(0, 0.35 + k * 0.7, 0); a.push(g); }
    const pl = new THREE.BoxGeometry(1.2, 1.6, 1.2); pl.translate(0, 2.9, 0); a.push(pl);
    return mergeGeometries(a);
  })();
  const bowlG = new THREE.CylinderGeometry(1.1, 0.5, 0.7, 12); bowlG.translate(0, 4.0, 0);
  instanced(altarStone, stoneM, altars, { shadow: true });
  instanced(bowlG, goldM, altars);
  const flameM = ctx.mat({ color: 0xffaa33, emissive: 0xff7a1a, emissiveIntensity: 2.6, transparent: true, opacity: 0.95 }, 'standard');
  const flameG = new THREE.ConeGeometry(0.7, 2.0, 8); flameG.translate(0, 5.3, 0);
  instanced(flameG, flameM, altars);

  // ── 덩굴 낀 돌기둥 (서 있는 것·부러진 것) ──
  const pillarM = ctx.mat({ map: pillarTex(ctx), roughness: 0.9 });
  const pilG = new THREE.CylinderGeometry(0.9, 1.1, 8, 10); pilG.translate(0, 4, 0);
  const capG = new THREE.BoxGeometry(2.6, 0.8, 2.6); capG.translate(0, 8.4, 0);
  const pilAll = mergeGeometries([pilG, capG]);
  const pils = [], stubs = [];
  for (let tries = 0; pils.length + stubs.length < 110 && tries < 600; tries++) {
    const i = Math.floor(rand() * ctx.n), side = rand() < 0.5 ? 1 : -1;
    const off = side * (ctx.wallAt(i, side) + 5 + rand() * 45);
    const x = T.x[i] + T.lx[i] * off, z = T.z[i] + T.lz[i] * off;
    if (!free(x, z, 1.5, 2)) continue;
    const y = ctx.ground(x, z) - 0.4;
    if (rand() < 0.55) pils.push({ x, y, z, yaw: rand() * 6.28, sx: 1, sy: 0.8 + rand() * 0.5, sz: 1 });
    else stubs.push({ x, y, z, yaw: rand() * 6.28, sx: 1, sy: 0.2 + rand() * 0.3, sz: 1 });
    taken.push({ x, z, r: 1.6 });
  }
  instanced(pilAll, pillarM, pils, { shadow: true });
  instanced(pilG, pillarM, stubs);

  // ── 돌 관문: 길을 가로지르는 문(높이 10m 위 상인방 + 금 태양 원반) ──
  const gateStone = [], gateGold = [];
  for (const [s, f] of [[0, 0.88], [13, 0.12], [24, 0.6], [30, 0.85]]) {
    const i = ctx.segAt(s, f), p0 = ctx.pt(i, 0);
    const L = T.wallL[i] + 3.6, R = T.wallR[i] + 3.6, yaw = ctx.yawAt(i);
    const x0 = T.x[i] + T.lx[i] * ((L - R) / 2), z0 = T.z[i] + T.lz[i] * ((L - R) / 2);
    const gy = Math.max(ctx.ground(T.x[i] + T.lx[i] * L, T.z[i] + T.lz[i] * L), ctx.ground(T.x[i] - T.lx[i] * R, T.z[i] - T.lz[i] * R));
    const top = Math.max(p0.y + 10.5, gy + 3);
    const mkP = (sx) => { const g = new THREE.BoxGeometry(2.4, top - gy + 4, 2.4); g.translate(sx, (top - gy + 4) / 2 - 3, 0); return g; };
    const parts = [mkP((L + R) / 2 + 1.2 - 0), mkP(-((L + R) / 2) - 1.2)];
    const lin = new THREE.BoxGeometry(L + R + 6, 2.2, 3); lin.translate(0, top + 1.1 - gy, 0);
    parts.push(lin);
    const gparts = [];
    const disc = new THREE.CylinderGeometry(2.2, 2.2, 0.5, 20); disc.rotateX(Math.PI / 2); disc.translate(0, top + 1.1 - gy, 1.7); gparts.push(disc);
    const disc2 = disc.clone(); disc2.translate(0, 0, -3.4); gparts.push(disc2);
    const bar = new THREE.BoxGeometry(L + R + 6.4, 0.4, 3.2); bar.translate(0, top + 2.3 - gy, 0); gparts.push(bar);
    // 두 기둥을 바깥 쪽으로: 중심 보정 (왼쪽·오른쪽 반폭이 다르므로 중심 x0)
    const grp = new THREE.Group();
    const a = new THREE.Mesh(mergeGeometries(parts), stoneM), b = new THREE.Mesh(mergeGeometries(gparts), goldM);
    a.castShadow = ctx.q.detail >= 1; grp.add(a, b);
    grp.position.set(x0, gy, z0); grp.rotation.y = yaw;
    ctx.group.add(grp);
    gateStone.push(grp);
  }

  // ── 횃불 (길 따라 양옆, 불꽃은 빛나는 재질) ──
  const torches = [];
  for (let i = 8; i < ctx.n; i += 12) {
    const side = (Math.floor(i / 12) % 2) ? 1 : -1;
    const p = ctx.pt(i, side * (ctx.wallAt(i, side) + 1.8));
    torches.push({ x: p.x, y: surf(p.x, p.z) - 0.4, z: p.z });
  }
  const poleG = new THREE.CylinderGeometry(0.14, 0.2, 3.2, 6); poleG.translate(0, 1.6, 0);
  instanced(poleG, ctx.mat({ color: 0x5a4328, roughness: 0.9 }), torches);
  const tFlameM = ctx.mat({ color: 0xffb040, emissive: 0xff8a20, emissiveIntensity: 3 });
  const tFlameG = new THREE.ConeGeometry(0.36, 0.95, 6); tFlameG.translate(0, 3.7, 0);
  instanced(tFlameG, tFlameM, torches);

  // ── 관목·고사리 덩어리 ──
  const bushG = new THREE.IcosahedronGeometry(1.4, 1); bushG.scale(1.4, 0.8, 1.4); bushG.translate(0, 0.7, 0);
  ctx.scatter({ geo: bushG, mat: ctx.mat({ color: 0xffffff, roughness: 1 }), n: 320, from: 4.5, to: 60, scale: [0.7, 1.8], sink: 0.2,
    color: r => new THREE.Color().setHSL(0.24 + r() * 0.12, 0.6, 0.14 + r() * 0.14), filter: (x, z) => taken.every(t => Math.hypot(t.x - x, t.z - z) > t.r) });
  // 큰 열대 잎(야자 같은 비스듬한 원뿔)
  const frondG = new THREE.ConeGeometry(2.2, 6, 5); frondG.translate(0, 3, 0);
  ctx.scatter({ geo: frondG, mat: ctx.mat({ color: 0xffffff, roughness: 0.9 }), n: 120, from: 6, to: 70, scale: [0.8, 1.6], sink: 0.2,
    color: r => new THREE.Color().setHSL(0.3 + r() * 0.08, 0.7, 0.18 + r() * 0.1), filter: (x, z) => taken.every(t => Math.hypot(t.x - x, t.z - z) > t.r) });

  // ── 폭포: 암벽 면을 따라 흐르는 물줄기 + 아래 물안개 (암벽이 높은 곳만) ──
  const water = waterTex(ctx);
  const waterM = ctx.mat({ map: water, color: 0xffffff, transparent: true, opacity: 0.9, roughness: 0.2, emissive: 0x2a5a6a, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const mistM = ctx.mat({ color: 0xeaf6fa, transparent: true, opacity: 0.35, depthWrite: false }, 'lambert');
  const mists = [];
  let nFall = 0;
  const LAT = [1.3, 2.4, 3.6, 5, 6.5, 8.2];
  for (const [sg0, f0, side] of [[7, 0.5, 1], [17, 0.5, -1], [27, 0.5, 1], [36, 0.6, 1], [12, 0.5, -1], [31, 0.5, 1], [25, 0.5, -1], [20, 0.5, 1]]) {
    if (nFall >= 3) break;
    const i0 = ctx.segAt(sg0, f0);
    const tall = (i) => { const p = ctx.pt(i, side * (ctx.wallAt(i, side) + 8.2)); return surf(p.x, p.z) - ctx.road(i, side * ctx.wallAt(i, side)); };
    if (tall(i0) < 12) continue;
    const W = 3;   // 샘플 수 (폭 약 6m)
    const pos = [], uv = [], idx = [];
    let vAcc = 0;
    const prof = [];
    for (let k = 0; k < LAT.length; k++) {
      const row = [];
      for (let c = 0; c < 2; c++) {
        const i = i0 + c * W;
        const q = ctx.pt(i, side * (ctx.wallAt(i, side) + LAT[k]));
        row.push([q.x, surf(q.x, q.z) + 0.25, q.z]);
      }
      prof.push(row);
    }
    for (let k = 0; k < LAT.length; k++) {
      if (k) vAcc += Math.hypot(prof[k][0][0] - prof[k - 1][0][0], prof[k][0][1] - prof[k - 1][0][1], prof[k][0][2] - prof[k - 1][0][2]) / 14;
      for (let c = 0; c < 2; c++) { pos.push(...prof[k][c]); uv.push(c, vAcc); }
    }
    for (let k = 0; k < LAT.length - 1; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    ctx.group.add(new THREE.Mesh(geo, waterM));
    // 아래 물안개
    const b = prof[0][0], b2 = prof[0][1];
    for (let k = 0; k < 4; k++) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(2.4 + k * 0.4, 1), mistM);
      m.position.set((b[0] + b2[0]) / 2 + (k - 1.5) * 0.8, b[1] + 1.4 + k * 0.3, (b[2] + b2[2]) / 2); ctx.group.add(m); mists.push({ m, ph: k * 1.7, y: m.position.y });
    }
    nFall++;
    void tall;
  }

  // ── 움직임: 폭포 흐름·물안개·불꽃 깜박임 ──
  ctx.onFrame(t => {
    water.offset.y = -t * 1.1;
    for (const m of mists) { const k = 1 + Math.sin(t * 1.3 + m.ph) * 0.12; m.m.scale.set(k, k, k); m.m.position.y = m.y + Math.sin(t * 0.8 + m.ph) * 0.5; }
    flameM.emissiveIntensity = 2.6 + Math.sin(t * 9) * 0.5 + Math.sin(t * 23) * 0.3;
    tFlameM.emissiveIntensity = 3 + Math.sin(t * 11 + 1) * 0.6 + Math.sin(t * 27) * 0.3;
  });
  rocks.forEach(o => { o.material.side = o.userData._side; });
  void pyrAt; void col; void gateStone;
}
