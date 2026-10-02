// 맵별 실사 설정 (15회차) — 화질 '보통'·'높음'에서 쓴다(낮음은 예전 그대로 코드로 그린 질감)
//
// sky: 하늘 사진(web/assets/sky/<id>) — 조명·반사·보이는 하늘. 해 방위는 맵 설계도의 sun.azim 에 맞춰 사진을 돌린다
// 질감 칸 = { tex: 질감 id(web/assets/tex/<id>), scale: 몇 m 마다 한 번(없으면 실제 크기), tint: 색 곱, rough, normal, ao }
//   road 노면 · runoff 길 밖 갓길(풀밭 자리) · gravel 자갈 · terrain 먼 땅 · wall 콘크리트 벽 · rock 암벽 · walk 보도
// exposure·envInt·sun: 밝기 조절(없으면 기본)
// 테마 맵은 테마 파일의 look.real 이 이 표보다 앞선다
export const REAL = {
  circuit: {
    sky: 'syferfontein_18d_clear_puresky',
    road: { tex: 'asphalt_track', scale: 3 },
    runoff: { tex: 'sparse_grass', scale: 3 },
    terrain: { tex: 'sparse_grass', scale: 6 },
    gravel: { tex: 'gravel_floor', scale: 2.5 },
    wall: { tex: 'concrete_wall_006', scale: 3 },
  },
};

/** 맵 설계도·테마로 실사 설정 찾기 */
export function realFor(def, theme) {
  return theme?.look?.real || REAL[def?.id] || null;
}
