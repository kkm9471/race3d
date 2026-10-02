import { CARS } from '../../../web/src/sim/cars.js';
import { newCar, frame } from '../../physics_report.mjs';
import { pack } from '../../../web/src/sim/input.js';
const spec=CARS[0];
for (const hold of [0,0.5,1,1.5,2]) {
  const { c, w } = newCar(spec); c.setSpeed(140/3.6);
  const N=Math.round(hold*60);
  for (let f=0; f<N; f++) frame(c,w,pack({thr:1,steer:f<30?1:0.4,hb:1,kb:1}));
  for (let f=0; f<300-N; f++) frame(c,w,pack({thr:1,kb:1}));
  console.log('hold',hold,'speed@5s',(c.out.speed*3.6).toFixed(1));
}
// 일반 직진 가속 96km/h에서 0.6초
{ const { c, w } = newCar(spec); c.setSpeed(96/3.6); const a=[]; for(let f=0;f<60;f++){frame(c,w,pack({thr:1,kb:1})); if(f%6==5)a.push((c.out.speed*3.6).toFixed(0));} console.log('straight from 96',a.join(' ')); }
// 드리프트 끝 직후 차 머리 회전 중 표시 vs 실제 요약
