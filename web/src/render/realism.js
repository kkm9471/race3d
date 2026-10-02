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
    road: { tex: 'asphalt_track', scale: 3, env: 1.3, bright: 1.9 },
    runoff: { tex: 'leafy_grass', scale: 3, tint: 0xb4d896 },
    terrain: { tex: 'leafy_grass', scale: 5, tint: 0xb4d896 },
    exposure: 1.05,
    gravel: { tex: 'gravel_floor', scale: 2.5 },
    wall: { tex: 'concrete_wall_006', scale: 3 },
  },
  mountain: {   // 안개 낀 아침 산길
    sky: 'kloofendal_misty_morning_puresky', exposure: 1.05,
    road: { tex: 'worn_asphalt', scale: 3, env: 1.2, bright: 1.4 },
    runoff: { tex: 'forest_ground_04', scale: 3 },
    gravel: { tex: 'gravel_floor', scale: 2.5 },
    terrain: { tex: 'forest_ground_04', scale: 5, tint: 0xc8d8b0 },
    rock: { tex: 'rock_face_03', scale: 4 },
    wall: { tex: 'concrete_wall_006', scale: 3 },
  },
  city: {       // 해 질 녘 시내
    sky: 'evening_road_01_puresky', exposure: 1.1,
    road: { tex: 'clean_asphalt', scale: 3, env: 1.2, bright: 1.3 },
    walk: { tex: 'concrete_pavement', scale: 2 },
    terrain: { tex: 'concrete_pavement', scale: 3 },
    wall: { tex: 'concrete_wall_006', scale: 3 },
  },
  beach: {      // 한낮 해변
    sky: 'kloofendal_43d_clear_puresky', exposure: 0.95,
    road: { tex: 'asphalt_02', scale: 3, env: 1.2, bright: 1.3 },
    runoff: { tex: 'coast_sand_01', scale: 6 },
    terrain: { tex: 'coast_sand_01', scale: 10 },
    wall: { tex: 'concrete_wall_006', scale: 3 },
  },
  canyon: {     // 늦은 오후 붉은 협곡
    sky: 'qwantani_late_afternoon_puresky', exposure: 1.0,
    road: { tex: 'worn_asphalt', scale: 3, env: 1.2, bright: 1.4, tint: 0xf0d8c8 },
    runoff: { tex: 'red_sand', scale: 3 },
    gravel: { tex: 'red_sand', scale: 2.5, tint: 0xd8c0b0 },
    terrain: { tex: 'red_sand', scale: 5 },
    rock: { tex: 'red_sandstone_wall', scale: 4 },
    wall: { tex: 'concrete_wall_006', scale: 3, tint: 0xf0dcd0 },
  },
  glacier: {    // 흐린 날 빙하
    sky: 'snow_field_puresky', exposure: 1.0, sun: 2.0,
    road: { tex: 'asphalt_snow', scale: 3, env: 1.2, bright: 1.2 },
    runoff: { tex: 'snow_02', scale: 3 },
    terrain: { tex: 'snow_02', scale: 5 },
    rock: { tex: 'cliff_side', scale: 4, tint: 0xdce6f0 },
    wall: { tex: 'concrete_wall_006', scale: 3 },
  },
  harbor: {     // 해 질 녘 항구 도시
    sky: 'qwantani_dusk_2_puresky', exposure: 1.15,
    road: { tex: 'clean_asphalt', scale: 3, env: 1.2, bright: 1.3 },
    walk: { tex: 'concrete_pavement', scale: 2 },
    terrain: { tex: 'concrete_pavement', scale: 3 },
    wall: { tex: 'concrete_wall_006', scale: 3 },
  },
  express: {    // 눈 덮인 저녁
    sky: 'kloppenheim_06_puresky', exposure: 1.1,
    road: { tex: 'asphalt_snow', scale: 3, env: 1.2, bright: 1.2 },
    runoff: { tex: 'snow_02', scale: 3 },
    terrain: { tex: 'snow_02', scale: 5 },
    rock: { tex: 'cliff_side', scale: 4, tint: 0xdce6f0 },
    wall: { tex: 'concrete_wall_006', scale: 3 },
  },
};
/** 맵 설계도·테마로 실사 설정 찾기 */
export function realFor(def, theme) {
  return theme?.look?.real || REAL[def?.id] || null;
}
