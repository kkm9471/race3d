// 달빛 묘지 언덕 (★3) — 14회차 테마 맵: 보랏빛 밤, 큰 달, 으스스한 묘지
// 언덕을 좁은 U턴으로 올라 꼭대기에서 가파른 내리막으로 점프, 아래 묘지를 U턴 두 번으로 돈다.
import { SURF } from '../car.js';

export default {
  id: 'cemetery', name: '달빛 묘지 언덕', kind: '묘지', level: 3, theme: 'cemetery', wip: true,
  desc: '보랏빛 밤의 묘지 언덕. 좁은 U턴으로 언덕을 오른 뒤 가파른 내리막 점프, 아래 묘지의 U턴 두 번. 지름길 2곳, 점프대 2개. 한 바퀴 약 80초.',
  segs: [
    ['S', 320],          // 0 출발 직선
    ['A', 35, 90],       // 1
    ['S', 280],          // 2 오르막 (가속 발판)
    ['A', 24, -180],     // 3 오른쪽 U턴 — 안쪽 지름길
    ['S', 200],          // 4 오르막
    ['A', 24, 180],      // 5 왼쪽 U턴
    ['S', 300],          // 6 언덕 꼭대기
    ['A', 45, 90],       // 7
    ['S', 300],          // 8 가파른 내리막 (점프대, 길이 자동)
    ['A', 30, -50],      // 9 내리막 S자
    ['A', 30, 50],       // 10
    ['S', 140],          // 11
    ['A', 40, 90],       // 12 왼쪽 코너 — 안쪽 지름길
    ['S', 180],          // 13 (가속 발판)
    ['A', 22, 180],      // 14 아래 묘지 U턴
    ['S', 140],          // 15
    ['A', 22, -180],     // 16 U턴
    ['S', 200],          // 17 점프대
    ['A', 50, -40],      // 18 S자
    ['A', 50, 40],       // 19
    ['S', 150],          // 20 (길이 자동)
    ['A', 40, 90],       // 21 출발 직선으로
  ],
  close: [8, 20],
  smooth: 18,
  startAt: 150,
  width: 10,
  elev: [[0, 0.5], [0.08, 1], [0.193, 8], [0.291, 15], [0.374, 22], [0.434, 25.5], [0.556, 9], [0.641, 5], [0.783, 3], [0.926, 1.5]],
  bankK: 3, bankMax: 0.05,
  curbW: 0, curbK: 1,
  runBase: 2.0, runOut: 2.5, runK: 20, gravel: false, runSurf: SURF.GRASS,
  runSlope: 0.0,
  style: 'circuit',
  palette: { ground: [0x5a4f7e, 0x3c3458, 0x6a5e90, 0x4a4068], grass: 0x6a6488, far: [0x1f1633, 0x2c2045] },
  sun: { elev: 22, azim: 200 },   // 달 높이·방향 (밤이라 태양 대신 달)
  night: { top: 0x090316, horizon: 0x40225e, stars: 2200, moon: 2.6, moonColor: 0xcfc4ff, ambient: 1.8, ambientColor: 0x9a88d8, exposure: 1.05, moonDisc: true, moonSize: 240, moonDiscColor: 0xfff2c8 },
  fog: 0.0016, fogColor: 0x2e1c48,
  features: [
    { t: 'pad', seg: 2, at: 0.45, d: 0, w: 4, len: 8 },
    { t: 'split', seg: 3, from: 0.12, to: 0.88, side: -1, extra: 8, lane: 4.2 },
    { t: 'ramp', seg: 8, at: 0.25, len: 12, h: 0.8 },
    { t: 'split', seg: 12, from: 0.1, to: 0.9, side: 1, extra: 8, lane: 4.2 },
    { t: 'pad', seg: 13, at: 0.5, d: 0, w: 4, len: 8 },
    { t: 'ramp', seg: 17, at: 0.3, len: 14, h: 1.2 },
  ],
};
