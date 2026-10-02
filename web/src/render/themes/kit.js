// 테마 공용 도구 — trackmesh.js 가 테마 파일의 build(ctx) 에 넘길 ctx 를 만든다 (그림 전용: 주행 계산과 무관)
//
// ── 테마 파일 형식 (themes/<id>.js) ──
//   export const look = { ... }          기본 모습 바꾸기 (아래, 전부 선택)
//   export function build(ctx) { ... }   소품을 ctx.group 에 더한다
//
// look:
//   road: 0xffffff                      노면 색(질감에 곱함)
//   roadTex: ctx => THREE.Texture        노면 질감 직접 (u = 길 폭 전체 0~1, v = 10m 마다 1)
//   line: 0xf2f2ee                      가장자리 선 색
//   wall: { color, map: ctx => Texture, roughness, metalness, emissive, stripe: false }   콘크리트 벽(서킷·도심 style)
//   rail: 0xd8dde2                      가드레일 색(산길 style)
//   rock: 0xffffff                      암벽 색 (def.palette.rock 보다 우선)
//   terrainTex: 'grass'|'gravel'|'concrete'| ctx => Texture   땅 질감 (색은 def.palette.ground)
//   runoffTex: 같은 형식, runoffColor: 0xffffff   길 밖 갓길(풀밭 자리) 질감·색
//   trees: false | { n: 1, conifer: 0.35, hue: [h0,h1], sat: [s0,s1], light: [l0,l1], trunk: 0x5a4330 }
//   city: false                         도심 style 기본 건물 끄기(테마가 직접 세울 때)
//   far: false | [가까운 산색, 먼 산색]
//   banner: false | { bg: '#7a1d12', fg: '#fff4e0' }   출발선 현수막
//   tunnel: { color, map: ctx => Texture, light: 0xffd9a0 | false }   터널 안쪽 (features 의 t:'tunnel')
//
// 좌표: d > 0 = 진행 방향 왼쪽. T.wallL[i]·T.wallR[i] = 벽까지 거리(양수). 벽 밖 3m 까지는 땅이 길 아래로 숨어 있으니
// 소품은 벽에서 4m 이상 떨어뜨리거나 ctx.road 높이를 쓴다.
// 실시간 조명(PointLight·SpotLight)은 쓰지 않는다(느려짐) — 빛나는 것은 emissive 재질(+블룸)로.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as TX from '../textures.js';

export { THREE, mergeGeometries };

export function makeCtx({ T, world, def, q, group, disposables, ground, anims }) {
  // 맵마다 같은 무늬가 나오도록 맵 id 로 씨앗을 정한다 (세 화면이 같은 풍경)
  let seed = 7;
  for (const ch of def.id) seed = (seed * 31 + ch.charCodeAt(0)) % 2147483647;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const road = (i, d) => world.heightAt(((i % T.n) + T.n) % T.n, 0, d).h;
  const wallAt = (i, side) => (side > 0 ? T.wallL[i] : T.wallR[i]);
  const yawAt = i => Math.atan2(T.tx[i], T.tz[i]);
  const norm = i => ((Math.round(i) % T.n) + T.n) % T.n;
  // 트랙 근처 판정용 격자 (30m)
  const cell = 30, grid = new Map();
  for (let i = 0; i < T.n; i++) { const k = Math.floor(T.x[i] / cell) + ',' + Math.floor(T.z[i] / cell); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); }
  /** (x,z) 가 모든 길에서 벽+margin 보다 멀면 true */
  const clear = (x, z, margin = 4) => {
    const cx = Math.floor(x / cell), cz = Math.floor(z / cell), r = Math.ceil((margin + 40) / cell);
    for (let a = -r; a <= r; a++) for (let c = -r; c <= r; c++) {
      const l = grid.get((cx + a) + ',' + (cz + c));
      if (l) for (const i of l) {
        const dx = x - T.x[i], dz = z - T.z[i];
        const lat = dx * T.lx[i] + dz * T.lz[i];
        const w = (lat > 0 ? T.wallL[i] : T.wallR[i]) + margin;
        if (dx * dx + dz * dz < w * w) return false;
      }
    }
    return true;
  };
  /** 샘플 i, 가로 d 의 점. 벽 안이면 노면 높이, 밖이면 땅 높이 */
  const pt = (i, d) => {
    i = norm(i);
    const x = T.x[i] + T.lx[i] * d, z = T.z[i] + T.lz[i] * d;
    const inside = d >= -T.wallR[i] && d <= T.wallL[i];
    return { x, z, y: inside ? road(i, d) : ground(x, z), yaw: yawAt(i), i };
  };
  const mats = [];
  const ctx = {
    THREE, T, def, q, group, rand, road, ground, clear, pt, wallAt, yawAt, mergeGeometries, TX,
    n: T.n, ds: T.ds, L: T.L,
    /** 설계도 구간(seg)·비율 → 샘플 번호 */
    segAt: (seg, frac = 0) => T.segAt ? T.segAt(seg, frac) : 0,
    /** 출발선에서 s m 지점 → 샘플 번호 */
    idxAt: s => norm(s / T.ds),
    /** 재질 (끝날 때 저절로 정리) */
    mat(params = {}, kind = 'standard') {
      const M = kind === 'basic' ? THREE.MeshBasicMaterial : kind === 'lambert' ? THREE.MeshLambertMaterial : THREE.MeshStandardMaterial;
      const m = new M(params); mats.push(m); disposables.push(m); return m;
    },
    /** 캔버스로 그린 질감: draw(g, w, h) */
    canvasTex(w, h, draw, { repeat = [1, 1], srgb = true } = {}) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      draw(c.getContext('2d'), w, h);
      const t = new THREE.CanvasTexture(c);
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeat[0], repeat[1]);
      t.anisotropy = q.detail >= 1 ? 8 : 2;
      return t;
    },
    /** 글자 판 질감 */
    sign: (text, bg, fg, w = 1024, h = 128) => TX.sign(text, bg, fg, w, h),
    /**
     * obj 를 샘플 i, 가로 d 에 놓는다. face: 'track'(로컬 +Z 가 길 가운데를 봄) | 'along'(로컬 +Z = 진행 방향) | 라디안
     * y: 높이 더하기
     */
    place(obj, i, d, { face = 'track', y = 0 } = {}) {
      const p = pt(i, d);
      obj.position.set(p.x, p.y + y, p.z);
      obj.rotation.y = p.yaw + (face === 'track' ? (d > 0 ? -Math.PI / 2 : Math.PI / 2) : face === 'along' ? 0 : face);
      group.add(obj);
      return obj;
    },
    /**
     * 길 양옆(벽 밖)에 같은 모양을 많이 뿌린다 (InstancedMesh 하나 = 그리기 1번)
     *  geo, mat, n(개수), side: 0(양쪽)|1(왼쪽)|-1(오른쪽), from·to = 벽 밖 거리 범위(m),
     *  scale: [최소,최대], yaw: true(아무 방향)|false(길을 봄), sink: 땅에 묻는 깊이, color: r => THREE.Color(개별 색),
     *  range: [시작 샘플, 끝 샘플](없으면 한 바퀴 전체), filter: (x,z,i) => bool, shadow: 그림자 드리움
     */
    scatter({ geo, mat, n = 100, side = 0, from = 6, to = 60, scale = [0.8, 1.2], yaw = true, sink = 0, color = null, range = null, filter = null, shadow = false, margin = 4 }) {
      const im = new THREE.InstancedMesh(geo, mat, n);
      const m4 = new THREE.Matrix4(), qn = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
      let k = 0, tries = 0;
      while (k < n && tries < n * 30) {
        tries++;
        const a = range ? range[0] : 0, b = range ? range[1] : T.n;
        const i = norm(a + rand() * (((b - a) % T.n + T.n) % T.n || T.n));
        const sd = side || (rand() < 0.5 ? 1 : -1);
        const off = sd * (wallAt(i, sd) + from + rand() * (to - from));
        const x = T.x[i] + T.lx[i] * off, z = T.z[i] + T.lz[i] * off;
        if (!clear(x, z, Math.min(from, margin))) continue;
        if (filter && !filter(x, z, i)) continue;
        const s = scale[0] + rand() * (scale[1] - scale[0]);
        qn.setFromAxisAngle(up, yaw ? rand() * Math.PI * 2 : yawAt(i) + (sd > 0 ? -Math.PI / 2 : Math.PI / 2));
        p.set(x, ground(x, z) - sink * s, z);
        sc.set(s, s, s);
        m4.compose(p, qn, sc);
        im.setMatrixAt(k, m4);
        if (color) im.setColorAt(k, color(rand));
        k++;
      }
      im.count = k;
      im.castShadow = shadow && q.detail >= 1;
      im.receiveShadow = true;
      im.computeBoundingSphere();
      group.add(im);
      return im;
    },
    /** 매 화면마다 불릴 함수 (돌아가는 풍차·깜박이는 등): fn(t초, dt초) */
    onFrame(fn) { anims.push(fn); },
  };
  return ctx;
}
