// 14회차 테마 맵: 꽃마을 운하길 (★1) — 밝은 한낮의 마을, 넓고 완만한 교과서 코스
import { SURF } from '../car.js';

export default {
  id: 'village', name: '꽃마을 운하길', kind: '마을', level: 1, theme: 'village', wip: true,
  desc: '알록달록한 지붕 사이를 도는 넓고 완만한 길. 큰 왼쪽 코너 안쪽 지름길, 낮은 점프대 1개, 가속 발판 2개. 한 바퀴 약 48초.',
  segs: [
    ['S', 320],          // 0 출발 직선 (시계탑)
    ['A', 70, 90],       // 1 왼쪽
    ['S', 140],          // 2 마을 안길
    ['A', 80, -40],      // 3 완만한 S자
    ['A', 80, 40],       // 4
    ['S', 200],          // 5 운하 옆 직선 — 낮은 점프대
    ['A', 50, 140],      // 6 긴 왼쪽 코너 — 안쪽 지름길
    ['S', 150],          // 7
    ['A', 100, -50],     // 8 풍차 언덕 오른쪽
    ['S', 176],          // 9 (길이 자동, 가속 발판)
    ['A', 60, 90],       // 10
    ['S', 264],          // 11 (길이 자동, 가속 발판)
    ['A', 70, 90],       // 12 출발 직선으로
  ],
  close: [9, 11],
  smooth: 26,
  startAt: 130,
  width: 14,
  elev: [[0, 0], [0.2, 1.5], [0.4, 3.5], [0.6, 2.5], [0.8, 1]],
  bankK: 2, bankMax: 0.03,
  curbW: 1.2, curbK: 1 / 120,
  runBase: 6, runOut: 8, runK: 30, gravel: false, runSurf: SURF.GRASS,
  runSlope: -0.01,
  style: 'circuit',
  palette: { ground: [0x5f9a32, 0x4a8228, 0x86a840, 0x6a8a50], leaves: 0xffffff },
  sun: { elev: 38, azim: 150 },   // 맑은 낮 (66° 였더니 하늘이 하얗게 번져 화면 전체가 뿌옇다 — 14회차 검토)
  fog: 0.0003, fogColor: 0x9fbfe0,
  features: [
    { t: 'ramp', seg: 5, at: 0.32, len: 14, h: 0.8 },                         // 착지 뒤 큰 코너까지 120m 넘게
    { t: 'split', seg: 6, from: 0.1, to: 0.9, side: 1, extra: 9, lane: 4.6 },
    { t: 'pad', seg: 9, at: 0.5, d: 0, w: 5, len: 8 },
    { t: 'pad', seg: 11, at: 0.45, d: 0, w: 5, len: 8 },
  ],
};
