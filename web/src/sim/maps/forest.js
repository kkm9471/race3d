// 이끼숲 오솔길 (★1) — 14회차 테마 맵: 울창한 숲 속 넓은 입문 코스
// 넓은 길(14m)과 완만한 코너, 숲길이 살짝 오르내린다. 긴 왼쪽 코너 안쪽 지름길 1, 점프대 1, 가속 발판 2.
import { SURF } from '../car.js';

export default {
  id: 'forest', name: '이끼숲 오솔길', kind: '숲', level: 1, theme: 'forest', wip: true,
  desc: '울창한 숲 사이로 오르내리는 넓은 길. 완만한 코너, 긴 왼쪽 코너 안쪽 지름길, 통나무 점프대 1개, 가속 발판 2개. 한 바퀴 약 47초.',
  segs: [
    ['S', 280],          // 0 출발 직선
    ['A', 70, 90],       // 1
    ['S', 160],          // 2 가속 발판
    ['A', 80, -40],      // 3 숲속 S자
    ['A', 80, 40],       // 4
    ['S', 220],          // 5 점프대 (착지 뒤 큰 코너까지 120m)
    ['A', 50, 140],      // 6 긴 왼쪽 코너 — 안쪽 지름길
    ['S', 150],          // 7
    ['A', 60, -50],      // 8
    ['S', 120],          // 9 (길이 자동, 가속 발판)
    ['A', 60, 90],       // 10
    ['S', 200],          // 11 (길이 자동)
    ['A', 150, -20],     // 12 완만한 S자
    ['A', 150, 20],      // 13
    ['S', 60],           // 14
    ['A', 50, 90],       // 15 출발 직선으로
  ],
  close: [9, 11],
  smooth: 26,
  startAt: 140,
  width: 14,
  elev: [[0, 0], [0.12, 2], [0.28, 7], [0.42, 10], [0.55, 6], [0.68, 9], [0.82, 4], [0.93, 1]],
  bankK: 2, bankMax: 0.03,
  curbW: 0, curbK: 1,
  runBase: 6, runOut: 8, runK: 30, gravel: false, runSurf: SURF.GRASS,
  runSlope: -0.01,
  style: 'circuit',
  palette: { ground: [0x4f6e34, 0x334d22, 0x6a5a3a, 0x4a5a3a], grass: 0x8fae6a, leaves: 0xffffff, far: [0x4d6a58, 0x6f8a86] },
  sun: { elev: 38, azim: 145 },   // 한낮 숲 (나뭇잎 사이 햇살)
  fog: 0.0011, fogColor: 0xb9cdb4,
  features: [
    { t: 'pad', seg: 2, at: 0.5, d: 0, w: 5, len: 8 },
    { t: 'ramp', seg: 5, at: 0.3, len: 14, h: 1.0 },
    { t: 'split', seg: 6, from: 0.1, to: 0.9, side: 1, extra: 9, lane: 4.8 },
    { t: 'pad', seg: 9, at: 0.5, d: 0, w: 5, len: 8 },
  ],
};
