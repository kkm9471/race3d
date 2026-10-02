// 실사 자료 점검 (15회차): 모든 맵(REAL 표 + 테마 look.real)이 쓰는 질감·하늘·나무·외벽이 목록과 디스크에 다 있는지,
// 목록에만 있고 파일이 없거나, 파일만 있고 아무도 안 쓰는 자료가 있는지. 사용법: node tools/check_assets.mjs
import fs from 'node:fs';
import path from 'node:path';

const man = JSON.parse(fs.readFileSync('web/assets/manifest.json', 'utf8'));
const { REAL } = await import('../web/src/render/realism.js');
const { MAP_IDS } = await import('../web/src/sim/maps/index.js');
// 테마 파일은 브라우저용(document 사용)이지만 look 은 순수 데이터 — 가짜 document 로 불러온다
globalThis.document = { createElement: () => ({ getContext: () => null }) };
const used = { tex: new Map(), sky: new Map(), tree: new Map() };
const add = (kind, id, who) => { if (!used[kind].has(id)) used[kind].set(id, []); used[kind].get(id).push(who); };
const scan = (real, who) => {
  if (!real) return;
  if (real.sky) add('sky', real.sky, who);
  for (const v of Object.values(real)) if (v && typeof v === 'object' && v.tex) add('tex', v.tex, who);
  for (const id of real.facades || []) add('tex', id, who);
  if (real.trees) for (const id of [...(real.trees.con || []), ...(real.trees.broad || [])]) add('tree', id, who);
};
for (const [id, r] of Object.entries(REAL)) scan(r, id);
for (const id of MAP_IDS) {
  try { const m = await import(`../web/src/render/themes/${id}.js`); scan(m.look?.real, id); } catch (e) { console.log(`⚠ 테마 ${id} 불러오기 실패: ${e.message}`); }
}
let bad = 0;
const need = { tex: ['diff.jpg', 'nor.jpg'], sky: ['env.hdr', 'bg.jpg'], tree: ['albedo.png', 'normal.png', 'meta.json'] };
const dirOf = { tex: 'tex', sky: 'sky', tree: 'trees' };
for (const kind of ['tex', 'sky', 'tree']) {
  for (const [id, who] of used[kind]) {
    const inMan = kind === 'tree' ? true : !!man[kind][id];
    const dir = path.join('web/assets', dirOf[kind], id);
    const files = need[kind].filter(f => !fs.existsSync(path.join(dir, f)));
    if (kind === 'tex' && man.tex[id] && !man.tex[id].rough && !fs.existsSync(path.join(dir, 'arm.jpg'))) files.push('arm.jpg');
    if (kind === 'tex' && man.tex[id]?.rough && !fs.existsSync(path.join(dir, 'rough.jpg'))) files.push('rough.jpg');
    if (!inMan || files.length) { bad++; console.log(`❌ ${kind} ${id} (쓰는 맵: ${who.join(',')}) — ${!inMan ? '목록에 없음 ' : ''}${files.length ? '파일 없음: ' + files.join(',') : ''}`); }
  }
}
// 아무도 안 쓰는 자료
let unusedMB = 0;
for (const kind of ['tex', 'sky', 'tree']) {
  const root = path.join('web/assets', dirOf[kind]);
  if (!fs.existsSync(root)) continue;
  for (const id of fs.readdirSync(root)) {
    if (used[kind].has(id)) continue;
    const sz = fs.readdirSync(path.join(root, id)).reduce((a, f) => a + fs.statSync(path.join(root, id, f)).size, 0);
    unusedMB += sz / 1e6;
    console.log(`  (안 씀) ${kind} ${id} ${(sz / 1e6).toFixed(1)}MB`);
  }
}
const total = (dir => { let s = 0; const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); const st = fs.statSync(p); if (st.isDirectory()) walk(p); else s += st.size; } }; walk(dir); return s; })('web/assets');
console.log(`쓰는 자료: 질감 ${used.tex.size} · 하늘 ${used.sky.size} · 나무 ${used.tree.size}, 전체 ${(total / 1e6).toFixed(0)}MB (안 쓰는 것 ${unusedMB.toFixed(1)}MB)`);
console.log(bad ? `❌ 문제 ${bad}건` : '✅ 모든 맵의 자료가 다 있음');
process.exit(bad ? 1 : 0);
