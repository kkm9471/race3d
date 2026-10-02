// 실사 자료 받기 (2026-10-02 15회차) — Poly Haven(polyhaven.com, 전부 CC0: 누구나·상업용까지 무료, 출처 표기 의무 없음)
//
// 받는 것
//  · 질감 세트: 색(diff)·울퉁불퉁(nor_gl)·거칠기 묶음(arm = AO·거칠기·금속) 1k JPG → web/assets/tex/<id>/
//  · 하늘: 조명용 1k HDR + 눈에 보이는 하늘 4k JPG(8k 원본을 크롬으로 줄임) → web/assets/sky/<id>/
// 목록은 web/assets/manifest.json 에 쌓인다(실제 크기 m·출처 주소). 출처 목록은 web/assets/CREDITS.md
// 사용법: node tools/fetch_assets.mjs tex asphalt_track worn_asphalt ...   /   node tools/fetch_assets.mjs sky kloofendal_43d_clear_puresky ...
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const [kind, ...ids] = process.argv.slice(2);
const ROOT = 'web/assets', MAN = path.join(ROOT, 'manifest.json');
const man = fs.existsSync(MAN) ? JSON.parse(fs.readFileSync(MAN, 'utf8')) : { tex: {}, sky: {} };
const api = async u => { const r = await fetch(u); if (!r.ok) throw new Error(`${r.status} ${u}`); return r.json(); };
async function dl(url, file) {
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return fs.statSync(file).size;
  const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`);
  const b = Buffer.from(await r.arrayBuffer());
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, b);
  return b.length;
}
/** 큰 JPG 를 크롬 캔버스로 줄여 저장 (가로 w, 품질 q) */
async function shrinkJpg(src, dst, w, q = 0.86) {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--allow-file-access-from-files'] });
  const p = await b.newPage();
  const data = fs.readFileSync(src).toString('base64');
  const out = await p.evaluate(async (data, w, q) => {
    const blob = await (await fetch('data:image/jpeg;base64,' + data)).blob();
    const bmp = await createImageBitmap(blob);
    const h = Math.round(bmp.height * w / bmp.width);
    const c = new OffscreenCanvas(w, h); c.getContext('2d').drawImage(bmp, 0, 0, w, h);
    const ob = await c.convertToBlob({ type: 'image/jpeg', quality: q });
    const ab = new Uint8Array(await ob.arrayBuffer());
    let s = ''; for (let i = 0; i < ab.length; i += 0x8000) s += String.fromCharCode(...ab.subarray(i, i + 0x8000));
    return btoa(s);
  }, data, w, q);
  fs.writeFileSync(dst, Buffer.from(out, 'base64'));
  await b.close();
}

for (const id of ids) {
  try {
    const info = await api(`https://api.polyhaven.com/info/${id}`);
    const files = await api(`https://api.polyhaven.com/files/${id}`);
    if (kind === 'tex') {
      const dir = path.join(ROOT, 'tex', id);
      let size = 0;
      size += await dl(files.Diffuse['1k'].jpg.url, path.join(dir, 'diff.jpg'));
      size += await dl(files.nor_gl['1k'].jpg.url, path.join(dir, 'nor.jpg'));
      size += await dl(files.arm['1k'].jpg.url, path.join(dir, 'arm.jpg'));
      const dims = info.dimensions || [2000, 2000];     // mm
      man.tex[id] = { name: info.name, w: dims[0] / 1000, h: dims[1] / 1000, url: `https://polyhaven.com/a/${id}` };
      console.log(`질감 ${id}: ${(size / 1e6).toFixed(1)}MB, 실제 크기 ${dims[0] / 1000}×${dims[1] / 1000}m`);
    } else if (kind === 'sky') {
      const dir = path.join(ROOT, 'sky', id);
      fs.mkdirSync(dir, { recursive: true });
      let size = await dl(files.hdri['1k'].hdr.url, path.join(dir, 'env.hdr'));
      const bg = path.join(dir, 'bg.jpg');
      if (!fs.existsSync(bg)) {
        const tmp = path.join(process.env.TEMP || '/tmp', `ph_${id}_tm.jpg`);
        await dl(files.tonemapped.url, tmp);
        await shrinkJpg(tmp, bg, 4096);
      }
      size += fs.statSync(bg).size;
      man.sky[id] = { name: info.name, time: info.attributes?.time_of_day || '', weather: info.attributes?.weather || '', url: `https://polyhaven.com/a/${id}` };
      console.log(`하늘 ${id}: ${(size / 1e6).toFixed(1)}MB`);
    }
  } catch (e) { console.log(`❌ ${id}: ${e.message}`); }
}
fs.mkdirSync(ROOT, { recursive: true });
fs.writeFileSync(MAN, JSON.stringify(man, null, 1));
// 출처 목록 (CC0 라 의무는 없지만 고마움 표시·나중에 확인용)
const lines = ['# 실사 자료 출처', '', '모두 [Poly Haven](https://polyhaven.com) 자료이며 CC0(퍼블릭 도메인 — 누구나 상업용까지 무료, 출처 표기 의무 없음)입니다.', '', '## 하늘', ...Object.entries(man.sky).map(([k, v]) => `- ${v.name} — ${v.url}`), '', '## 질감', ...Object.entries(man.tex).map(([k, v]) => `- ${v.name} (${v.w}×${v.h}m) — ${v.url}`), ''];
fs.writeFileSync(path.join(ROOT, 'CREDITS.md'), lines.join('\n'));
