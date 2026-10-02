// 테마 목록 — 맵 설계도의 theme 값 → 테마 모듈(themes/<id>.js)
// 필요할 때만 불러온다(대기실에서 트랙을 고를 때 미리, 레이스 시작 전에 꼭). 처음부터 15개를 다 불러오면
// 첫 화면 단추가 공개 주소 기준 약 3초 늦게 살아났다(14회차 깨뜨리기 시험에서 발견).
// 파일 하나가 깨져도 그 테마만 빠지고(기본 모습으로 그림) 나머지는 산다.
import { MAP_IDS } from '../../sim/maps/index.js';

/** 불러온 테마: id → 모듈 (아직 안 불러왔거나 실패면 없음) */
export const THEMES = {};
const pending = {};

/** 테마 불러오기 (여러 번 불러도 한 번만). 실패해도 reject 하지 않는다 */
export function loadTheme(id) {
  if (!id || !MAP_IDS.includes(id)) return Promise.resolve(null);
  if (THEMES[id]) return Promise.resolve(THEMES[id]);
  if (!pending[id]) pending[id] = import(`./${id}.js`).then(m => (THEMES[id] = m), e => { console.warn(`테마 ${id} 불러오기 실패:`, e?.message || e); delete pending[id]; return null; });
  // 5초 넘게 걸리면(파일이 멈춤) 기다리지 않고 기본 모습으로 출발 — 불러오는 화면에서 영영 못 나오지 않게 (14회차 독립검증)
  return Promise.race([pending[id], new Promise(res => setTimeout(() => res(null), 5000))]);
}
