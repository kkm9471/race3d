// 14회차 테마 맵: 동화 — 과자 마을과 무지개 성 (★2)
// 성 주위를 도는 쿠키 길. 직각 코너 몇 개 + 구불구불 사탕 S자, 큰 왼쪽 코너 안쪽 지름길, 점프대 1, 가속 발판 2.
import { SURF } from '../car.js';

export default {
  id: 'fairy', name: '구름사탕 동화길', kind: '동화 나라', level: 2, theme: 'fairy',
  desc: '과자 집과 무지개 성 사이를 도는 쿠키 길. 구불구불 사탕 S자와 직각 코너, 큰 왼쪽 코너 안쪽 지름길, 점프대·가속 발판. 한 바퀴 약 1분.',
  segs: [
    ['S', 340],          // 0 출발 직선 (무지개 아치)
    ['A', 30, 90],       // 1 왼쪽 직각
    ['S', 240],          // 2 점프대
    ['A', 45, 60],       // 3 사탕 S자 (구불구불)
    ['A', 45, -120],     // 4
    ['A', 45, 120],      // 5
    ['A', 45, -60],      // 6
    ['S', 200],          // 7 가속 발판
    ['A', 32, 120],      // 8 큰 왼쪽 코너 — 안쪽 지름길
    ['S', 220],          // 9 (길이 자동)
    ['A', 70, 60],       // 10
    ['S', 160],          // 11
    ['A', 25, -90],      // 12 오른쪽 직각
    ['S', 110],          // 13
    ['A', 25, 90],       // 14 왼쪽 직각
    ['S', 240],          // 15 (길이 자동, 가속 발판, 무지개 아치)
    ['A', 40, 90],       // 16 출발 직선으로
  ],
  close: [9, 15],
  smooth: 20,
  startAt: 140,
  width: 12,
  elev: [[0, 0], [0.18, 2], [0.35, 5], [0.5, 6], [0.68, 3], [0.85, 0.5]],
  bankK: 2, bankMax: 0.03,
  curbW: 1.0, curbK: 1 / 90,
  runBase: 4.5, runOut: 7, runK: 28, gravel: false, runSurf: SURF.GRASS,
  runSlope: -0.01,
  style: 'circuit',
  palette: { ground: [0xbfe9c6, 0x9ed9ae, 0xf6cfe0, 0xd9cdf2], grass: 0xffffff },
  sun: { elev: 48, azim: 150 },
  // 파스텔 하늘: 밤하늘 틀(위·지평선 두 색 그라데이션)을 별 없이 써서 분홍·하늘색 하늘을 만든다
  night: { top: 0x4b98ff, horizon: 0xffbfe0, stars: 0, moonDisc: true, moonSize: 90, moonDiscColor: 0xfff8d8, moonColor: 0xfff2e2, moon: 3.0, ambient: 1.25, ambientColor: 0xffe6f2, exposure: 0.95 },
  fog: 0.0009, fogColor: 0xf3dcef,
  features: [
    { t: 'ramp', seg: 2, at: 0.3, len: 13, h: 1.1 },
    { t: 'pad', seg: 7, at: 0.45, d: 0, w: 4.5, len: 8 },
    { t: 'split', seg: 8, from: 0.1, to: 0.9, side: 1, extra: 8, lane: 4.2 },
    { t: 'pad', seg: 15, at: 0.55, d: 0, w: 4.5, len: 8 },
  ],
};
