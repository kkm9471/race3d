// 손맛 1·2·3 을 같은 기준(physics_report measure)으로 비교
import { CARS } from '../../web/src/sim/cars.js';
import { setDriftPreset } from '../../web/src/sim/car.js';
import { measure } from '../physics_report.mjs';
const spec = CARS.find(c => c.id === 'baram') || CARS[1];
for (let i = 0; i < 3; i++) {
  const p = setDriftPreset(i), r = measure(spec);
  console.log(`${i + 1} ${p.name}: 톡 최대 ${r.tapPeak.toFixed(0)}°(${r.tapPeakT.toFixed(2)}초)·펴짐 ${r.tapEnd.toFixed(2)}초·감속 ${r.tapLoss.toFixed(0)}% | 풀 0.15초 ${r.fullB015.toFixed(0)}°·0.7초 ${r.fullB07.toFixed(0)}°·카운터 ${r.counterT.toFixed(2)}초·감속 ${r.fullLoss.toFixed(0)}% | U자 ${r.uturn.toFixed(2)}초 | 순간부스터 ${r.instOk ? '됨' : '안 됨'}`);
}
setDriftPreset(0);
