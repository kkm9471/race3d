import { CARS } from '../../../web/src/sim/cars.js';
import { newCar, frame, beta } from '../../physics_report.mjs';
import { pack } from '../../../web/src/sim/input.js';
for (const id of ['masil','baram']) {
 const spec=CARS.find(c=>c.id===id)||CARS[0];
 for (const hold of [0.5,1,2]) {
  const { c, w } = newCar(spec);
  c.setSpeed(140/3.6);
  const row=[]; 
  const N=Math.round(hold*60);
  for (let f=0; f<N; f++){ frame(c,w,pack({thr:1,steer:f<30?1:0.4,hb:1,kb:1})); if(f%15==14) row.push(`${(c.out.fwd*3.6).toFixed(0)}/${(c.out.speed*3.6).toFixed(0)}`); }
  const ex=[];
  const v0=c.out.speed*3.6, f0=c.out.fwd*3.6;
  for (let f=0; f<60; f++){ frame(c,w,pack({thr:1,kb:1})); if(f%6==5) ex.push(`${(c.out.fwd*3.6).toFixed(0)}/${(c.out.speed*3.6).toFixed(0)}/b${beta(c).toFixed(0)}`); }
  console.log(spec.id,hold,'drift fwd/spd',row.join(' '),'\n   exit(0.1s step) fwd/spd/beta',ex.join(' '));
 }
}
