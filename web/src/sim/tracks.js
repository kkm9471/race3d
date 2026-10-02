// 트랙 설계도
//
// segs: ['S', 길이] 직선, ['A', 반지름, 각도] 원호 (각도 + = 왼쪽, - = 오른쪽). 합이 ±360 이어야 한다.
// close: 폐곡선이 되도록 길이를 자동 조정할 직선 두 개(서로 평행하면 안 됨)
// smooth: 곡률을 이 길이(m)로 부드럽게 → 직선↔원호 사이에 완화곡선이 생긴다
// elev: [트랙 비율 0~1, 높이 m] — 코사인 보간, 한 바퀴 돌면 처음으로 이어진다

import { SURF } from './car.js';

export const TRACK_DEFS = [
  {
    id: 'circuit', name: '한빛 서킷', kind: '서킷', level: 2, desc: '긴 직선, 헤어핀, S자, 고속 코너, 시케인. 바깥쪽에 자갈 런오프.',
    segs: [
      ['S', 650],          // 0 메인 직선
      ['A', 25, -150],     // 1 1번 코너 (헤어핀)
      ['S', 160],          // 2
      ['A', 100, 60],      // 3 왼쪽
      ['S', 100],          // 4
      ['A', 80, 45],       // 5 S자
      ['A', 80, -45],      // 6
      ['A', 90, 40],       // 7
      ['A', 90, -40],      // 8
      ['S', 150],          // 9
      ['A', 50, -90],      // 10
      ['S', 450],          // 11 (길이 자동)
      ['A', 28, -90],      // 12
      ['S', 500],          // 13 백스트레이트 (길이 자동)
      ['A', 180, -30],     // 14 고속 스위퍼
      ['S', 100],          // 15
      ['A', 32, 50],       // 16 시케인
      ['A', 32, -50],      // 17
      ['S', 120],          // 18
      ['A', 70, -60],      // 19 마지막 코너
    ],
    close: [0, 13],
    smooth: 24,
    startAt: 250,
    width: 13,
    elev: [[0, 0], [0.12, 1], [0.25, 7], [0.38, 12], [0.52, 7], [0.66, -1], [0.8, 2], [0.92, 1]],
    bankK: 2.5, bankMax: 0.04,
    curbW: 1.2, curbK: 1 / 170,
    runBase: 7, runOut: 20, runK: 32, gravel: true, runSurf: SURF.GRASS,
    runSlope: -0.015,
    style: 'circuit',
    sun: { elev: 14, azim: 235 },   // 늦은 오후
  },
  {
    id: 'mountain', name: '안개 고개', kind: '산길', level: 3, desc: '좁은 산길, 헤어핀 연속, 오르막·내리막. 가드레일과 암벽.',
    segs: [
      ['S', 250],          // 0 출발 직선
      ['A', 60, 60],       // 1
      ['S', 150],          // 2
      ['A', 20, 120],      // 3 헤어핀 L
      ['S', 140],          // 4
      ['A', 20, -180],     // 5 헤어핀 R
      ['S', 140],          // 6
      ['A', 20, 180],      // 7 헤어핀 L (정상)
      ['S', 350],          // 8 내리막 (길이 자동)
      ['A', 60, 90],       // 9
      ['S', 120],          // 10
      ['A', 90, -25],      // 11
      ['A', 90, 25],       // 12
      ['S', 120],          // 13
      ['A', 40, 180],      // 14 아래 헤어핀
      ['S', 200],          // 15 (길이 자동)
      ['A', 45, -90],      // 16 마지막 코너
      ['S', 90],           // 17
    ],
    close: [8, 15],
    smooth: 20,
    startAt: 140,
    width: 8.5,
    elev: [[0, 0], [0.08, 3], [0.17, 14], [0.27, 30], [0.36, 46], [0.43, 58], [0.5, 60], [0.62, 42], [0.74, 24], [0.84, 10], [0.93, 2]],
    bankK: 3, bankMax: 0.06,
    curbW: 0, curbK: 1,
    runBase: 1.4, runOut: 1.5, runK: 20, gravel: false, runSurf: SURF.GRAVEL,
    runSlope: 0.0,
    style: 'mountain',
    sun: { elev: 22, azim: 120 },   // 아침
  },
  {
    id: 'city', name: '별빛 시내', kind: '도심', level: 2, desc: '해 질 녘 시내 거리. 벽이 바로 옆, 직각 교차로 코너와 대로.',
    segs: [
      ['S', 380],          // 0 대로 (출발)
      ['A', 22, -90],      // 1
      ['S', 180],          // 2
      ['A', 20, -90],      // 3
      ['S', 120],          // 4
      ['A', 20, 90],       // 5 왼쪽
      ['S', 140],          // 6
      ['A', 22, -90],      // 7
      ['S', 300],          // 8 (길이 자동)
      ['A', 25, -90],      // 9
      ['S', 160],          // 10
      ['A', 30, 45],       // 11 S자
      ['A', 30, -45],      // 12
      ['S', 200],          // 13 (길이 자동)
      ['A', 22, -90],      // 14 마지막 코너
      ['S', 100],          // 15
    ],
    close: [8, 13],
    smooth: 14,
    startAt: 200,
    width: 11,
    elev: [[0, 0], [0.2, 1.5], [0.45, 3], [0.7, 1], [0.9, 0.5]],
    bankK: 0, bankMax: 0, crossfall: 0,
    curbW: 0.6, curbK: 1 / 30,
    runBase: 1.3, runOut: 0.6, runK: 20, gravel: false, runSurf: SURF.ASPHALT,
    runSlope: 0.0,
    style: 'city',
    sun: { elev: 4, azim: 285 },    // 해 질 녘
    fog: 0.0011, fogColor: 0xb89a88,
  },
];

// ── 카트식 맵 (2026-10-02 사용자 요청: 난이도별, 지름길·점프·가속 발판) ──
// features 는 track.js applyFeatures 설명 참고. 지름길 = 코너 안쪽에 분리대로 나뉜 좁은 차선(안쪽이라 짧다).
TRACK_DEFS.push(
  {
    id: 'beach', name: '햇살 해변', kind: '쉬움', level: 1,
    desc: '넓은 길, 완만한 코너. 긴 왼쪽 코너 안쪽 지름길 차선, 점프대 1개, 가속 발판 2개.',
    segs: [
      ['S', 400],          // 0 출발 직선 (가속 발판)
      ['A', 70, 90],       // 1
      ['S', 150],          // 2 점프대
      ['A', 90, 60],       // 3
      ['A', 60, -40],      // 4
      ['A', 60, 40],       // 5
      ['S', 200],          // 6 (길이 자동)
      ['A', 55, 120],      // 7 긴 왼쪽 코너 — 안쪽 지름길
      ['S', 300],          // 8 (길이 자동, 가속 발판)
      ['A', 80, 90],       // 9
      ['S', 120],          // 10
    ],
    close: [6, 8],
    smooth: 26,
    startAt: 200,
    width: 15,
    elev: [[0, 0], [0.25, 2], [0.5, 4], [0.75, 1.5]],
    bankK: 2, bankMax: 0.03,
    curbW: 1.2, curbK: 1 / 120,
    runBase: 6, runOut: 10, runK: 30, gravel: false, runSurf: SURF.GRASS,
    runSlope: -0.01,
    style: 'circuit',
    palette: { ground: [0xe2cf98, 0xcdb47c, 0xead9ab, 0xc4b38a], runoff: 'sand' },
    sun: { elev: 42, azim: 160 },   // 한낮
    features: [
      { t: 'pad', seg: 0, at: 0.3, d: 0, w: 5, len: 8 },        // 출발 자리(출발선 12~30m 뒤)와 겹치지 않게
      { t: 'ramp', seg: 2, at: 0.6, len: 14, h: 1.3 },
      { t: 'split', seg: 7, from: 0.08, to: 0.92, side: 1, extra: 10, lane: 5 },
      { t: 'pad', seg: 8, at: 0.5, d: -3, w: 5, len: 8 },
    ],
  },
  {
    id: 'canyon', name: '붉은 협곡', kind: '보통', level: 2,
    desc: '오르내리는 협곡 길. 헤어핀 2개와 S자, 헤어핀 안쪽 지름길, 점프대 2개, 가속 발판.',
    segs: [
      ['S', 300],          // 0 출발
      ['A', 40, 90],       // 1
      ['S', 160],          // 2 점프대
      ['A', 30, 180],      // 3 왼쪽 헤어핀
      ['S', 100],          // 4 가속 발판
      ['A', 30, -180],     // 5 오른쪽 헤어핀 — 안쪽 지름길
      ['S', 150],          // 6
      ['A', 40, 90],       // 7
      ['S', 80],           // 8 (길이 자동)
      ['A', 40, 35],       // 9 S자
      ['A', 40, -35],      // 10
      ['S', 80],           // 11 점프대
      ['A', 50, 90],       // 12
      ['S', 120],          // 13 (길이 자동, 가속 발판)
      ['A', 120, 90],      // 14 마지막 큰 코너
    ],
    close: [8, 13],
    smooth: 22,
    startAt: 150,
    width: 11,
    elev: [[0, 0], [0.18, 8], [0.38, 16], [0.55, 10], [0.75, 3], [0.9, 1]],
    bankK: 3, bankMax: 0.05,
    curbW: 0.8, curbK: 1 / 60,
    runBase: 2.0, runOut: 2.5, runK: 20, gravel: true, runSurf: SURF.GRAVEL,
    runSlope: 0.0,
    style: 'mountain',
    palette: { ground: [0xa86a42, 0x7e4a2c, 0xb98458, 0x8f6f5c], grass: 0xc89670, rock: 0xd88a5e, leaves: 0xb8a070, far: [0xa07a66, 0xb89a88] },
    sun: { elev: 30, azim: 250 },
    features: [
      { t: 'ramp', seg: 2, at: 0.55, len: 12, h: 0.6 },     // 낮게: 부스터 속도로 넘어도 헤어핀 전에 착지
      { t: 'pad', seg: 4, at: 0.5, d: 0, w: 4, len: 8 },
      { t: 'split', seg: 5, from: 0.1, to: 0.9, side: -1, extra: 8, lane: 4.2 },
      { t: 'ramp', seg: 13, at: 0.3, len: 14, h: 1.4 },     // 착지 뒤 큰 코너까지 여유 (코너 직전 점프는 못 돌고 박는다)
      { t: 'pad', seg: 13, at: 0.8, d: 0, w: 4, len: 8 },
    ],
  },
  {
    id: 'glacier', name: '얼음 계곡', kind: '어려움', level: 3,
    desc: '좁은 길에 헤어핀 3개가 연달아, 빙판 구간. 마지막 헤어핀 안쪽 지름길과 점프대.',
    segs: [
      ['S', 260],          // 0 출발 (가속 발판)
      ['A', 22, 180],      // 1 왼쪽 헤어핀
      ['S', 150],          // 2 빙판
      ['A', 22, -180],     // 3 오른쪽 헤어핀
      ['S', 150],          // 4 점프대
      ['A', 22, 180],      // 5 왼쪽 헤어핀 — 안쪽 지름길
      ['S', 100],          // 6 (길이 자동)
      ['A', 35, -40],      // 7 S자 (바깥쪽으로)
      ['A', 35, 40],       // 8
      ['S', 100],          // 9 가속 발판
      ['A', 30, 90],       // 10
      ['S', 72],           // 11 (길이 자동, 빙판)
      ['A', 30, 90],       // 12
    ],
    close: [6, 11],
    smooth: 18,
    startAt: 140,
    width: 9.5,
    elev: [[0, 0], [0.15, 6], [0.3, 12], [0.45, 18], [0.6, 14], [0.75, 7], [0.9, 2]],
    bankK: 3, bankMax: 0.05,
    curbW: 0, curbK: 1,
    runBase: 1.6, runOut: 2.0, runK: 20, gravel: false, runSurf: SURF.GRASS,
    runSlope: 0.0,
    style: 'mountain',
    palette: { ground: [0xf2f6fa, 0xdde7ef, 0xd0dde8, 0xffffff], runoff: 'snow', rock: 0xdfe9f2, leaves: 0xe9f1f7, far: [0xc9d6e2, 0xdfe8f0] },
    sun: { elev: 20, azim: 200 },
    fog: 0.0016, fogColor: 0xd8e4ee,
    features: [
      { t: 'pad', seg: 0, at: 0.3, d: 0, w: 4, len: 8 },        // 출발 자리와 겹치지 않게
      { t: 'ice', seg: 2, from: 0.05, to: 0.95 },
      { t: 'ramp', seg: 4, at: 0.3, len: 12, h: 1.2 },      // 착지 뒤 헤어핀까지 100m 남게
      { t: 'split', seg: 5, from: 0.12, to: 0.88, side: 1, extra: 7, lane: 3.8 },
      { t: 'pad', seg: 9, at: 0.5, d: 0, w: 4, len: 8 },
      { t: 'ice', seg: 11, from: 0.0, to: 1.0 },
    ],
  },
);

export const TRACK_BY_ID = Object.fromEntries(TRACK_DEFS.map(t => [t.id, t]));
