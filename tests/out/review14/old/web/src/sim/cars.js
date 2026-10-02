// 차량 10종 — 카트식 (2026-10-02 사용자 결정: 성능은 비슷하게, 성격만 다르게 — 실력으로 겨룬다)
//
// 능력치 stats 는 1~5점, 다섯 개 합이 모두 15점. 1점 차이가 주는 효과는 작다(car.js kartParams):
//   speed 최고속 ±1%/점 · accel 가속 ±5%/점 · corner 코너 접지 ±4%/점 · drift 드리프트 회전 ±5%/점
//   boost 게이지 충전·부스터 지속 ±6%/점
// 이름은 지어낸 것(실제 차 모델명·다른 게임의 카트 이름과 겹치지 않게).
// 모양 치수(dims·wb·tF·tR·cgH·R)는 그리기·충돌용이고, 무게(mass)는 부딪힐 때 밀고 밀리는 정도에만 영향.
// engine 은 소리(회전수)용.

const SUSP = (fF, fR, z, bump) => ({ fF, fR, z, bump, arbF: 0.4, arbR: 0.3 });

export const CARS = [
  {
    id: 'kongal', name: '포켓 로켓', cls: '가속형', desc: '작고 가볍다. 출발과 재가속이 제일 빠르고 잘 돈다. 최고속은 조금 낮다.',
    stats: { speed: 1, accel: 5, corner: 4, drift: 3, boost: 2 },
    mass: 1100, wb: 2.40, wf: 0.62, tF: 1.40, tR: 1.39, cgH: 0.56, dims: [3.60, 1.60, 1.52], R: 0.277,
    susp: SUSP(1.9, 2.0, 0.45, 0.10), tire: {}, engine: { idle: 800, redline: 6500 },
  },
  {
    id: 'masil', name: '어반 나이트', cls: '균형형', desc: '모든 능력이 고르다. 처음 타기 좋다.',
    stats: { speed: 3, accel: 3, corner: 3, drift: 3, boost: 3 },
    mass: 1250, wb: 2.72, wf: 0.61, tF: 1.56, tR: 1.57, cgH: 0.53, dims: [4.65, 1.82, 1.42], R: 0.316,
    susp: SUSP(1.8, 1.9, 0.45, 0.10), tire: {}, engine: { idle: 750, redline: 6600 },
  },
  {
    id: 'beongae', name: '핫샷', cls: '드리프트형', desc: '가속이 좋고 드리프트가 잘 돈다. 최고속·부스터는 조금 낮다.',
    stats: { speed: 2, accel: 4, corner: 3, drift: 4, boost: 2 },
    mass: 1250, wb: 2.63, wf: 0.61, tF: 1.54, tR: 1.51, cgH: 0.50, dims: [4.29, 1.79, 1.44], R: 0.316,
    susp: SUSP(2.1, 2.2, 0.45, 0.08), tire: {}, engine: { idle: 800, redline: 6700 },
  },
  {
    id: 'deundeun', name: '아이언 혼', cls: '코너형', desc: '묵직하고 코너에서 안 밀린다. 가속과 드리프트는 둔하다. 부딪히면 잘 밀어낸다.',
    stats: { speed: 3, accel: 2, corner: 5, drift: 2, boost: 3 },
    mass: 1450, wb: 2.82, wf: 0.57, tF: 1.65, tR: 1.66, cgH: 0.68, dims: [4.80, 1.90, 1.72], R: 0.365,
    susp: SUSP(1.7, 1.8, 0.45, 0.12), tire: {}, engine: { idle: 700, redline: 6300 },
  },
  {
    id: 'jimkkun', name: '럼블러', cls: '묵직형', desc: '무겁고 최고속·부스터가 좋다. 가속과 드리프트는 둔하다.',
    stats: { speed: 4, accel: 2, corner: 3, drift: 2, boost: 4 },
    mass: 1500, wb: 3.10, wf: 0.60, tF: 1.64, tR: 1.64, cgH: 0.74, dims: [5.10, 1.95, 1.85], R: 0.382,
    susp: SUSP(1.7, 1.9, 0.45, 0.13), tire: {}, engine: { idle: 750, redline: 4400 },
  },
  {
    id: 'baram', name: '윈드커터', cls: '코너·드리프트형', desc: '코너와 드리프트가 모두 좋다. 대신 부스터 게이지가 느리게 찬다.',
    stats: { speed: 3, accel: 3, corner: 4, drift: 4, boost: 1 },
    mass: 1250, wb: 2.575, wf: 0.53, tF: 1.52, tR: 1.55, cgH: 0.46, dims: [4.27, 1.78, 1.31], R: 0.315,
    susp: SUSP(2.2, 2.3, 0.45, 0.08), tire: { rear: 1.03 }, engine: { idle: 800, redline: 7400 },
  },
  {
    id: 'cheondung', name: '스칼렛 블레이드', cls: '최고속형', desc: '직선 최고속이 가장 높다. 코너 접지는 약하다.',
    stats: { speed: 5, accel: 3, corner: 2, drift: 3, boost: 2 },
    mass: 1300, wb: 2.67, wf: 0.42, tF: 1.67, tR: 1.61, cgH: 0.42, dims: [4.54, 1.93, 1.20], R: 0.340,
    susp: SUSP(2.6, 2.7, 0.48, 0.07), tire: { rear: 1.14 }, engine: { idle: 950, redline: 8200 },
  },
  {
    id: 'yuseong', name: '스타폴', cls: '최고속·부스터형', desc: '최고속과 부스터가 좋다. 가속·코너·드리프트는 약하다.',
    stats: { speed: 5, accel: 2, corner: 2, drift: 2, boost: 4 },
    mass: 1350, wb: 2.70, wf: 0.44, tF: 1.70, tR: 1.64, cgH: 0.40, dims: [4.62, 2.00, 1.14], R: 0.350,
    susp: SUSP(2.8, 2.9, 0.48, 0.06), tire: { rear: 1.10 }, engine: { idle: 1000, redline: 8800 },
  },
  {
    id: 'heukmeonji', name: '더스트 데빌', cls: '드리프트형', desc: '드리프트가 가장 잘 돈다. 최고속은 조금 낮다.',
    stats: { speed: 2, accel: 3, corner: 3, drift: 5, boost: 2 },
    mass: 1280, wb: 2.62, wf: 0.58, tF: 1.53, tR: 1.54, cgH: 0.50, dims: [4.40, 1.80, 1.45], R: 0.320,
    susp: SUSP(2.0, 2.1, 0.45, 0.12), tire: {}, engine: { idle: 850, redline: 7000 },
  },
  {
    id: 'chueok', name: '빈티지 에이스', cls: '부스터형', desc: '게이지가 가장 빨리 차고 부스터가 오래 간다. 최고속은 조금 낮다.',
    stats: { speed: 2, accel: 3, corner: 3, drift: 2, boost: 5 },
    mass: 1200, wb: 2.27, wf: 0.41, tF: 1.37, tR: 1.35, cgH: 0.50, dims: [4.15, 1.65, 1.32], R: 0.300,
    susp: SUSP(1.8, 1.9, 0.42, 0.10), tire: { rear: 1.08 }, engine: { idle: 900, redline: 7200 },
  },
];

export const CAR_BY_ID = Object.fromEntries(CARS.map(c => [c.id, c]));

export const STAT_NAMES = [['speed', '최고속'], ['accel', '가속'], ['corner', '코너'], ['drift', '드리프트'], ['boost', '부스터']];

/** 화면에 보여 줄 능력치 (1~5점) */
export function carStats(c) {
  return { ...c.stats };
}
