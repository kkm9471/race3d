// 14회차 테마 맵: mansion — 달빛 고딕 대저택 (★4)
// 보름달 밤의 고딕 저택. 정원 산울타리 시케인 → 저택 안 붉은 복도(직각 코너가 쉬지 않고 이어짐) → 중정 → 아래층 복도 → 뒤뜰 차고.
import { SURF } from '../car.js';

export default {
  id: 'mansion', name: '달빛 대저택', kind: '저택', level: 4, laps: 2, theme: 'mansion', wip: true,
  desc: '보름달 아래 고딕 저택. 정원 산울타리 시케인을 지나 붉은 벽지 복도로 들어가면 직각 코너가 쉬지 않고 이어진다. 복도 구간 3곳, 현관·뒷문 안쪽 지름길 3곳, 점프대 2개. 한 바퀴 약 N초.',
  segs: [
    ['S', 480],           // 0 출발 직선 (정원 진입로, 길이 자동)
    ['A', 40, 90],        // 1 오른쪽 모서리 (지름길)
    ['S', 90],            // 2 앞뜰
    ['A', 24, 90],        // 3 산울타리 시케인 ↓
    ['S', 40],            // 4
    ['A', 24, -90],       // 5
    ['S', 80],            // 6
    ['A', 24, -90],       // 7
    ['S', 40],            // 8
    ['A', 24, 90],        // 9 ↑
    ['S', 190],           // 10 정원 직선 (점프대)
    ['A', 34, -45],       // 11 S자
    ['A', 34, 45],        // 12
    ['S', 100],           // 13
    ['A', 40, 90],        // 14 현관 모서리 (지름길)
    ['S', 90],            // 15 현관 앞 내리막길
    ['A', 30, 90],        // 16 저택 입구로
    ['S', 70],            // 17 복도
    ['A', 24, -90],       // 18 복도 꺾임 ↓
    ['S', 30],            // 19
    ['A', 24, 90],        // 20
    ['S', 60],            // 21
    ['A', 24, 90],        // 22 ↑
    ['S', 30],            // 23
    ['A', 24, -90],       // 24
    ['S', 70],            // 25
    ['A', 24, -90],       // 26 ↓
    ['S', 30],            // 27
    ['A', 24, 90],        // 28
    ['S', 50],            // 29
    ['A', 24, -90],       // 30 계단실 (아래층으로)
    ['S', 70],            // 31
    ['A', 24, -90],       // 32 아래층 복도
    ['S', 70],            // 33
    ['A', 24, 90],        // 34 ↓
    ['S', 30],            // 35
    ['A', 24, -90],       // 36
    ['S', 60],            // 37
    ['A', 24, -90],       // 38 ↑
    ['S', 30],            // 39
    ['A', 24, 90],        // 40
    ['S', 70],            // 41
    ['A', 24, 90],        // 42 ↓
    ['S', 30],            // 43
    ['A', 24, -90],       // 44
    ['S', 60],            // 45
    ['A', 30, 90],        // 46 서재 뒷문 (지름길)
    ['S', 110],           // 47 뒤뜰로
    ['A', 30, 90],        // 48
    ['S', 90],            // 49 뒤뜰
    ['A', 24, 90],        // 50 차고 시케인 ↑
    ['S', 30],            // 51
    ['A', 24, -90],       // 52
    ['S', 120],           // 53 (점프대)
    ['A', 24, -90],       // 54 ↓
    ['S', 30],            // 55
    ['A', 24, 90],        // 56
    ['S', 70],            // 57
    ['A', 40, -40],       // 58
    ['A', 40, 40],        // 59
    ['S', 130],           // 60 (길이 자동, 가속 발판)
    ['A', 40, 90],        // 61 출발 직선으로
  ],
  close: [0, 60],
  smooth: 12,
  startAt: 160,
  width: 9.5,
  elev: [[0, 0], [0.35, 1.5], [0.6, 2.5], [0.85, 1]],
  bankK: 0, bankMax: 0, crossfall: 0,
  curbW: 0.6, curbK: 1 / 40,
  runBase: 1.3, runOut: 0.6, runK: 20, gravel: false, runSurf: SURF.ASPHALT,
  runSlope: 0.0,
  style: 'city',
  palette: { ground: [0x3a5a44, 0x2a4434, 0x466650, 0x34523f] },
  sun: { elev: 38, azim: 215 },     // 달 방향
  night: { top: 0x070827, horizon: 0x2a2060, stars: 2400, moon: 2.3, ambient: 1.7, exposure: 1.05, moonDisc: true, moonColor: 0xc6d2ff, ambientColor: 0x9a9ae0, moonSize: 120 },
  fog: 0.0011, fogColor: 0x241c52,
  features: [
    { t: 'pad', seg: 0, at: 0.65, d: 0, w: 4, len: 8 },
    { t: 'split', seg: 1, from: 0.1, to: 0.9, side: 1, extra: 8, lane: 4.2 },
    { t: 'ramp', seg: 10, at: 0.35, len: 13, h: 1.0 },
    { t: 'pad', seg: 13, at: 0.5, d: 0, w: 4, len: 8 },
    { t: 'split', seg: 14, from: 0.1, to: 0.9, side: 1, extra: 8, lane: 4.2 },
    // 복도 1 (1층 앞쪽)
    { t: 'tunnel', seg: 17, from: 0.15, to: 1 }, { t: 'tunnel', seg: 18 }, { t: 'tunnel', seg: 19 }, { t: 'tunnel', seg: 20 }, { t: 'tunnel', seg: 21 }, { t: 'tunnel', seg: 22 }, { t: 'tunnel', seg: 23 }, { t: 'tunnel', seg: 24 }, { t: 'tunnel', seg: 25 }, { t: 'tunnel', seg: 26 }, { t: 'tunnel', seg: 27 }, { t: 'tunnel', seg: 28 }, { t: 'tunnel', seg: 29, from: 0, to: 0.85 },
    // 중정(하늘이 보임) 30~31
    // 복도 2 (아래층)
    { t: 'tunnel', seg: 32, from: 0.2, to: 1 }, { t: 'tunnel', seg: 33 }, { t: 'tunnel', seg: 34 }, { t: 'tunnel', seg: 35 }, { t: 'tunnel', seg: 36 }, { t: 'tunnel', seg: 37 }, { t: 'tunnel', seg: 38 }, { t: 'tunnel', seg: 39 }, { t: 'tunnel', seg: 40 }, { t: 'tunnel', seg: 41 }, { t: 'tunnel', seg: 42 }, { t: 'tunnel', seg: 43 }, { t: 'tunnel', seg: 44 }, { t: 'tunnel', seg: 45, from: 0, to: 0.85 },
    { t: 'split', seg: 46, from: 0.1, to: 0.9, side: 1, extra: 8, lane: 4.2 },
    // 차고
    { t: 'tunnel', seg: 50, from: 0.2, to: 1 }, { t: 'tunnel', seg: 51 }, { t: 'tunnel', seg: 52, from: 0, to: 0.8 },
    { t: 'pad', seg: 53, at: 0.5, d: 0, w: 4, len: 8 },
    { t: 'ramp', seg: 60, at: 0.25, len: 13, h: 1.0 },
    { t: 'pad', seg: 60, at: 0.7, d: 0, w: 4, len: 8 },
  ],
};
