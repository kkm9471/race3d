// 14회차 테마 맵: 아이스 — 오로라 아래 얼음 왕국 (★3)
// 얼어붙은 호수 위 긴 빙판(직선·S자·코너), 얼음 궁전으로 오르는 헤어핀 2개, 궁전 앞 빙판 시케인, 내리막 직선.
import { SURF } from '../car.js';

export default {
  id: 'ice', name: '오로라 얼음왕국', kind: '얼음 왕국', level: 3, theme: 'ice',
  desc: '오로라 아래 얼어붙은 호수를 가로지르는 긴 빙판 S자, 얼음 궁전으로 오르는 헤어핀 2개와 궁전 앞 빙판 시케인. 지름길 2곳, 점프대 2개. 한 바퀴 약 1분 20초.',
  segs: [
    ['S', 350],          // 0 출발 직선 (얼음 아치)
    ['A', 40, 90],       // 1 호수로
    ['S', 350],          // 2 호수 위 긴 빙판
    ['A', 65, 45],       // 3 빙판 S자
    ['A', 65, -90],      // 4
    ['A', 65, 45],       // 5
    ['S', 200],          // 6 빙판 → 가속 발판
    ['A', 35, 90],       // 7 왼쪽 — 안쪽 지름길
    ['S', 240],          // 8 오르막, 점프대
    ['A', 22, 180],      // 9 왼쪽 헤어핀 — 안쪽 지름길
    ['S', 150],          // 10 오르막
    ['A', 22, -180],     // 11 오른쪽 헤어핀
    ['S', 250],          // 12 (길이 자동) 궁전 앞
    ['A', 50, 90],       // 13
    ['S', 200],          // 14 궁전 마당
    ['A', 40, -60],      // 15 빙판 시케인
    ['A', 40, 60],       // 16
    ['S', 250],          // 17 (길이 자동) 내리막, 점프대
    ['A', 45, 90],       // 18 출발 직선으로
  ],
  close: [12, 17],
  smooth: 18,
  startAt: 150,
  width: 10,
  elev: [[0, 2], [0.1, 0], [0.33, 0], [0.42, 4], [0.52, 11], [0.6, 16], [0.7, 17], [0.8, 12], [0.92, 5]],
  bankK: 2.5, bankMax: 0.04,
  curbW: 0.8, curbK: 1 / 70,
  runBase: 3, runOut: 4, runK: 24, gravel: false, runSurf: SURF.GRASS,
  runSlope: 0.0,
  style: 'circuit',
  palette: { ground: [0xeef4fa, 0xd6e3ee, 0xc8d8e8, 0xffffff], runoff: 'snow', leaves: 0xe9f1f7, far: [0x3a4e6e, 0x4c628a] },
  sun: { elev: 24, azim: 320 },
  // 밤하늘 + 오로라(테마가 그린다). 눈·얼음이 달빛에 밝게
  night: { top: 0x040a22, horizon: 0x16365a, stars: 2400, moonDisc: true, moonSize: 100, moonDiscColor: 0xf2f6ff, moonColor: 0xcfe0ff, moon: 2.5, ambient: 1.55, ambientColor: 0x8fb4e8, exposure: 1.0 },
  fog: 0.0008, fogColor: 0x1d3a5c,
  features: [
    { t: 'ice', seg: 2, from: 0.15, to: 1 },
    { t: 'ice', seg: 3, from: 0, to: 1 }, { t: 'ice', seg: 4, from: 0, to: 1 }, { t: 'ice', seg: 5, from: 0, to: 1 },
    { t: 'ice', seg: 6, from: 0, to: 0.4 },
    { t: 'pad', seg: 6, at: 0.6, d: 0, w: 4, len: 8 },
    { t: 'split', seg: 7, from: 0.1, to: 0.9, side: 1, extra: 8, lane: 4.2 },
    { t: 'ramp', seg: 8, at: 0.3, len: 12, h: 0.9 },
    { t: 'split', seg: 9, from: 0.12, to: 0.88, side: 1, extra: 7, lane: 3.8 },
    { t: 'ice', seg: 15, from: 0, to: 1 }, { t: 'ice', seg: 16, from: 0, to: 1 },
    { t: 'ramp', seg: 17, at: 0.3, len: 14, h: 1.3 },
  ],
};
