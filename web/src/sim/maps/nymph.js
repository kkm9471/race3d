// 14회차 테마 맵: 님프 — 해 질 녘 요정 숲 (★2)
// 직각 코너 없이 크게 휘어 흐르는 숲길. 연못가 S자, 완만한 오르내림, 왼쪽 코너 두 곳 안쪽 지름길, 점프대 1, 가속 발판 2.
import { SURF } from '../car.js';

export default {
  id: 'nymph', name: '반딧불 요정숲', kind: '요정 숲', level: 2, theme: 'nymph', wip: true,
  desc: '빛나는 꽃과 수정 기둥 사이로 크게 휘어 흐르는 밤의 숲길. 연못가 S자, 왼쪽 코너 두 곳 안쪽 지름길, 점프대·가속 발판. 한 바퀴 약 1분.',
  segs: [
    ['S', 300],          // 0 출발 직선
    ['A', 110, 80],      // 1 긴 왼쪽
    ['S', 160],          // 2 가속 발판
    ['A', 80, -60],      // 3 흐르는 S자
    ['A', 70, 60],       // 4
    ['S', 200],          // 5
    ['A', 55, 140],      // 6 큰 왼쪽 — 안쪽 지름길
    ['S', 240],          // 7 (길이 자동, 점프대)
    ['A', 140, -50],     // 8 연못가 S자
    ['A', 110, 60],      // 9
    ['A', 90, -40],      // 10
    ['S', 200],          // 11
    ['A', 50, 110],      // 12 왼쪽 — 안쪽 지름길
    ['S', 300],          // 13 (길이 자동, 가속 발판)
    ['A', 100, 60],      // 14 출발 직선으로
  ],
  close: [7, 13],
  smooth: 30,
  startAt: 140,
  width: 12,
  elev: [[0, 0], [0.12, 3], [0.26, 9], [0.4, 7], [0.55, 2], [0.7, 5], [0.85, 2]],
  bankK: 3, bankMax: 0.045,
  curbW: 0.9, curbK: 1 / 110,
  runBase: 4, runOut: 6, runK: 26, gravel: false, runSurf: SURF.GRASS,
  runSlope: -0.01,
  style: 'circuit',
  palette: { ground: [0x2f5a50, 0x23463f, 0x3b5f6a, 0x45506e], grass: 0x9fd8c0, far: [0x2c2f5a, 0x3a3d6e] },
  sun: { elev: 26, azim: 70 },
  // 해 질 녘~밤: 보랏빛 하늘, 청록 지평선. 길·차가 잘 보이게 밝은 밤
  night: { top: 0x1c0f40, horizon: 0x2d7a86, stars: 1400, moonDisc: true, moonSize: 150, moonDiscColor: 0xeaf6ff, moonColor: 0xd6d2ff, moon: 2.6, ambient: 1.7, ambientColor: 0x9a8fe6, exposure: 1.08 },
  fog: 0.0011, fogColor: 0x34507a,
  features: [
    { t: 'pad', seg: 2, at: 0.4, d: 0, w: 4.5, len: 8 },
    { t: 'split', seg: 6, from: 0.1, to: 0.9, side: 1, extra: 8, lane: 4.4 },
    { t: 'ramp', seg: 7, at: 0.3, len: 13, h: 1.1 },
    { t: 'split', seg: 12, from: 0.1, to: 0.9, side: 1, extra: 8, lane: 4.2 },
    { t: 'pad', seg: 13, at: 0.55, d: 0, w: 4.5, len: 8 },
  ],
};
