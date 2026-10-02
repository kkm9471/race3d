// 14회차 테마 맵: pirate — 해적선 만 (★3)
// 카리브해 해변. 파란 벽돌 길이 해적선이 정박한 만을 한 바퀴. 위쪽 해안에 헤어핀 지그재그, 오른쪽 해안에 헤어핀 한 쌍, 아래쪽 해안에 굽이.
import { SURF } from '../car.js';

export default {
  id: 'pirate', name: '해적선 만', kind: '해변', level: 3, laps: 1, theme: 'pirate', wip: true,
  desc: '해적선이 정박한 카리브해 해변을 도는 파란 벽돌 길. 헤어핀 지그재그 두 곳, 안쪽 지름길 2곳, 모래 언덕을 넘는 점프대 2개. 한 바퀴 약 80초.',
  segs: [
    ['S', 330],          // 0 출발 직선 (길이 자동, 가속 발판)
    ['A', 45, 90],       // 1
    ['S', 140],          // 2
    ['A', 32, -50],      // 3 S자
    ['A', 32, 50],       // 4
    ['S', 150],          // 5 점프대
    ['A', 26, 180],      // 6 헤어핀 — 안쪽 지름길
    ['S', 180],          // 7
    ['A', 26, -180],     // 8 헤어핀
    ['S', 290],          // 9 가속 발판 → 점프대
    ['A', 50, 90],       // 10
    ['S', 124],          // 11
    ['A', 26, 180],      // 12 해안 헤어핀
    ['S', 80],           // 13
    ['A', 26, -180],     // 14
    ['S', 140],          // 15 가속 발판
    ['A', 45, 90],       // 16
    ['S', 130],          // 17
    ['A', 30, -60],      // 18 굽이
    ['A', 30, 60],       // 19
    ['S', 120],          // 20
    ['A', 26, 180],      // 21 헤어핀 — 안쪽 지름길
    ['S', 160],          // 22
    ['A', 26, -180],     // 23
    ['S', 330],          // 24 (길이 자동, 가속 발판)
    ['A', 45, 90],       // 25 출발 직선으로
  ],
  close: [0, 24],
  smooth: 14,
  startAt: 150,
  width: 10,
  elev: [[0, 0], [0.1, 1.5], [0.22, 5], [0.34, 2], [0.48, 6], [0.6, 3], [0.72, 6.5], [0.86, 2.5]],
  bankK: 2, bankMax: 0.04, crossfall: 0,
  curbW: 0.8, curbK: 1 / 80,
  runBase: 3, runOut: 6, runK: 30, gravel: false, runSurf: SURF.GRASS,
  runSlope: -0.01,
  style: 'circuit',
  palette: { ground: [0xd9bb7c, 0xc6a768, 0xdfc48a, 0xb99b60], runoff: 'sand', far: [0x4a8f86, 0x6aa9a8] },
  sun: { elev: 42, azim: 235 },   // 맑은 한낮
  fog: 0.00028, fogColor: 0xa6d3ea,
  features: [
    { t: 'pad', seg: 0, at: 0.6, d: 0, w: 4, len: 8 },
    { t: 'ramp', seg: 5, at: 0.3, len: 13, h: 0.9 },
    { t: 'split', seg: 6, from: 0.1, to: 0.9, side: 1, extra: 8, lane: 4.2 },
    { t: 'pad', seg: 9, at: 0.15, d: 0, w: 4, len: 8 },
    { t: 'ramp', seg: 9, at: 0.6, len: 13, h: 1.0 },
    { t: 'pad', seg: 15, at: 0.5, d: 0, w: 4, len: 8 },
    { t: 'split', seg: 21, from: 0.1, to: 0.9, side: 1, extra: 8, lane: 4.2 },
    { t: 'pad', seg: 24, at: 0.4, d: 0, w: 4, len: 8 },
  ],
};
