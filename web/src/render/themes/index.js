// 테마 목록 — 맵 설계도의 theme 값 → 테마 모듈(themes/<id>.js)
// 파일 하나가 깨져도 그 테마만 빠지고(기본 모습으로 그림) 나머지는 산다.
import { MAP_IDS } from '../../sim/maps/index.js';

const mods = await Promise.all(MAP_IDS.map(id => import(`./${id}.js`).catch(e => { console.warn(`테마 ${id} 불러오기 실패:`, e?.message || e); return null; })));
export const THEMES = Object.fromEntries(MAP_IDS.map((id, k) => [id, mods[k]]));
