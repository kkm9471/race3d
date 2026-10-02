// 테마 맵 목록 (2026-10-02 14회차) — 순서 = 대기실 목록 순서(쉬운 것부터)
// 맵 하나 = 파일 하나: maps/<id>.js 가 `export default { id, name, ... }` 설계도를 내보낸다 (tracks.js 설계도와 같은 형식 + theme)
// 그림(소품·노면·벽 색)은 web/src/render/themes/<theme>.js
export const MAP_IDS = [
  'village', 'forest',              // ★1
  'desert', 'fairy', 'nymph',       // ★2
  'pirate', 'china', 'ice', 'cemetery',   // ★3
  'factory', 'mansion', 'moonhill', 'golden',   // ★4
  'mine', 'space',                  // ★5
];
