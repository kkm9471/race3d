// 실사 나무 사진판 만들기 (15회차) — Poly Haven 나무 모델(CC0)을 8방향에서 찍어 사진판(atlas) 두 장으로
//  · albedo.png : 색(빛 없이) + 투명 — 게임에서 해 조명을 다시 받는다
//  · normal.png : 그 방향에서 본 면의 방향(카메라 기준) — 게임에서 납작한 판도 입체처럼 빛을 받게
//  · meta.json  : 장 수·실제 높이·폭
// 원본 모델(수십 MB)은 tests/out/models/<id>/ 에만 두고(공개 안 함), 만든 사진판만 web/assets/trees/<id>/ 에 올린다
// 사용법: node tools/bake_trees.mjs fir_sapling pine_sapling_small ...
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const ids = process.argv.slice(2);
const FW = 320, FH = 640, N = 8;
const MIME = { '.js': 'text/javascript', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.jpg': 'image/jpeg', '.png': 'image/png', '.html': 'text/html' };
const srv = http.createServer((req, res) => {
  const p = path.join(process.cwd(), decodeURIComponent(new URL(req.url, 'http://x').pathname));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0);
const port = srv.address().port, ORIGIN = `http://127.0.0.1:${port}`;
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await b.newPage();
page.on('console', m => console.log('  [쪽]', m.text()));
page.on('pageerror', e => console.log('  [오류]', e.message));
await page.goto(`${ORIGIN}/web/index.html`, { waitUntil: 'domcontentloaded' }).catch(() => {});
await page.setContent(`<!doctype html><html><head><script type="importmap">{"imports":{"three":"${ORIGIN}/web/vendor/three/three.module.js","three/addons/":"${ORIGIN}/web/vendor/three/addons/"}}</script></head><body></body></html>`);
for (const id of ids) {
  const out = await page.evaluate(async (ORIGIN, id, FW, FH, N) => {
    const THREE = await import('three');
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const gltf = await new GLTFLoader().loadAsync(`${ORIGIN}/tests/out/models/${id}/${id}.gltf`);
    const root = gltf.scene;
    root.updateMatrixWorld(true);
    // 한 파일에 여러 그루가 나란히 있으면 가장 큰 한 그루만 남긴다
    { const kids = root.children.length === 1 && root.children[0].children.length > 1 ? root.children[0].children : root.children;
      if (kids.length > 1) { let best = null, bh = -1; for (const k of kids) { const bb = new THREE.Box3().setFromObject(k); const h = bb.max.y - bb.min.y; if (h > bh) { bh = h; best = k; } } for (const k of [...kids]) if (k !== best) k.visible = false; console.log(id + ': ' + kids.length + '그루 중 가장 큰 것만 (' + bh.toFixed(2) + 'm)'); } }
    const box = new THREE.Box3(); root.traverseVisible(o => { if (o.isMesh) box.union(new THREE.Box3().setFromObject(o, true)); }), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
    root.position.set(-ctr.x, -box.min.y, -ctr.z);
    root.updateMatrixWorld(true);
    const H = size.y, R = Math.max(size.x, size.z) / 2;
    // 판 한 장의 폭(m): 키의 절반 또는 옆 반지름 중 큰 쪽
    const halfW = Math.max(R * 1.04, H * 0.25);
    const scene = new THREE.Scene();
    scene.add(root);
    const meshes = []; root.traverseVisible(o => { if (o.isMesh) meshes.push(o); });
    const orig = new Map(meshes.map(o => [o, o.material]));
    const albedoMat = m => new THREE.MeshBasicMaterial({ map: m.map || null, color: m.color ? m.color.clone() : 0xffffff, alphaTest: 0.45, side: THREE.DoubleSide, transparent: false });
    const normalMat = m => new THREE.ShaderMaterial({
      uniforms: { map: { value: m.map || null }, useMap: { value: m.map ? 1 : 0 } }, side: THREE.DoubleSide,
      vertexShader: 'varying vec3 vN; varying vec2 vUv; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform sampler2D map; uniform int useMap; varying vec3 vN; varying vec2 vUv; void main(){ if (useMap == 1 && texture2D(map, vUv).a < 0.45) discard; vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n; gl_FragColor = vec4(n * 0.5 + 0.5, 1.0); }',
    });
    const r = new THREE.WebGLRenderer({ alpha: true, antialias: false, preserveDrawingBuffer: true });
    r.setPixelRatio(1); r.setSize(FW * N, FH); r.setClearColor(0x000000, 0);
    r.outputColorSpace = THREE.SRGBColorSpace;
    const cam = new THREE.OrthographicCamera(-halfW, halfW, H * 1.02, -H * 0.02, 0.01, 200);
    const shoot = (matFn, srgb) => {
      for (const o of meshes) o.material = Array.isArray(orig.get(o)) ? orig.get(o).map(matFn) : matFn(orig.get(o));
      r.outputColorSpace = srgb ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
      r.setScissorTest(true); r.clear();
      for (let k = 0; k < N; k++) {
        const a = k / N * Math.PI * 2, el = 5 * Math.PI / 180, D = 50;
        cam.position.set(Math.sin(a) * Math.cos(el) * D, H / 2 + Math.sin(el) * D, Math.cos(a) * Math.cos(el) * D);
        cam.lookAt(0, H / 2, 0);
        r.setViewport(k * FW, 0, FW, FH); r.setScissor(k * FW, 0, FW, FH);
        r.render(scene, cam);
      }
      r.setScissorTest(false);
      // 투명 부분 색을 이웃 잎 색으로 채운다(밉맵에서 테두리가 검게 번지지 않게) — 투명도는 그대로
      const c = document.createElement('canvas'); c.width = FW * N; c.height = FH;
      const g = c.getContext('2d'); g.drawImage(r.domElement, 0, 0);
      const img = g.getImageData(0, 0, c.width, c.height), d = img.data, W = c.width, Hh = c.height;
      for (let it = 0; it < 6; it++) {
        const src = new Uint8ClampedArray(d);
        for (let y = 1; y < Hh - 1; y++) for (let x = 1; x < W - 1; x++) {
          const i = (y * W + x) * 4; if (src[i + 3] > 0 || d[i + 3] === 1) continue;
          let rr = 0, gg = 0, bb = 0, n = 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = ((y + dy) * W + x + dx) * 4; if (src[j + 3] > 0 || src[j] + src[j + 1] + src[j + 2] > 0) { rr += src[j]; gg += src[j + 1]; bb += src[j + 2]; n++; } }
          if (n) { d[i] = rr / n; d[i + 1] = gg / n; d[i + 2] = bb / n; }
        }
      }
      g.putImageData(img, 0, 0);
      return c.toDataURL('image/png');
    };
    const albedo = shoot(albedoMat, true), normal = shoot(normalMat, false);
    return { albedo, normal, meta: { id, frames: N, h: +H.toFixed(3), w: +(halfW * 2).toFixed(3), fw: FW, fh: FH } };
  }, ORIGIN, id, FW, FH, N);
  const dir = path.join('web/assets/trees', id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'albedo.png'), Buffer.from(out.albedo.split(',')[1], 'base64'));
  fs.writeFileSync(path.join(dir, 'normal.png'), Buffer.from(out.normal.split(',')[1], 'base64'));
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(out.meta));
  console.log(`${id}: 높이 ${out.meta.h}m 폭 ${out.meta.w}m → ${(fs.statSync(path.join(dir, 'albedo.png')).size / 1e6).toFixed(1)}MB + ${(fs.statSync(path.join(dir, 'normal.png')).size / 1e6).toFixed(1)}MB`);
}
await b.close();
srv.close();
