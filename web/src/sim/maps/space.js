// (임시 시험용 — 공용 틀 확인. 담당 작업자가 진짜 맵으로 바꾼다)
import { SURF } from '../car.js';

export default {
  id: 'space', name: '시험 우주', kind: '우주', level: 5, laps: 2, theme: 'space', wip: true,
  desc: '공용 틀 시험용',
  segs: [
    ['S', 300], ['A', 30, 90], ['S', 200], ['A', 30, 90], ['S', 300], ['A', 30, 90], ['S', 200], ['A', 30, 90],
  ],
  close: [0, 2],
  smooth: 14, startAt: 150, width: 11,
  elev: [[0, 0], [0.5, 4]],
  bankK: 0, bankMax: 0, crossfall: 0,
  curbW: 0, curbK: 1,
  runBase: 1.3, runOut: 0.6, runK: 20, gravel: false, runSurf: SURF.ASPHALT, runSlope: 0,
  style: 'city',
  palette: { ground: [0x22252e, 0x1a1c24, 0x2a2e38, 0x22252e] },
  sun: { elev: 30, azim: 200 },
  night: { top: 0x000003, horizon: 0x0b0f24, stars: 2500 },
  fog: 0.0004, fogColor: 0x0b0f24,
  features: [
    { t: 'tunnel', seg: 2, from: 0.2, to: 0.8 },
    { t: 'pad', seg: 4, at: 0.5, d: 0, w: 4, len: 8 },
  ],
};
