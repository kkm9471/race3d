import { CARS } from '../../../web/src/sim/cars.js';
import { newCar, frame, FPS, beta, measure, TARGET } from '../../physics_report.mjs';
import { pack } from '../../../web/src/sim/input.js';
for (const spec of CARS) {
  const { c, w } = newCar(spec);
  c.setSpeed(140/3.6);
  const out=[]; const sp=()=>c.out.speed*3.6;
  for (let f=0; f<120; f++){ frame(c,w,pack({thr:1,steer:f<30?1:0.4,hb:1,kb:1})); if(f%30==29) out.push(sp().toFixed(0)+'/'+beta(c).toFixed(0)); }
  const vd=sp();
  const ex=[];
  let mx=vd;
  for (let f=0; f<120; f++){ frame(c,w,pack({thr:1,kb:1})); mx=Math.max(mx,sp()); if(f%10==9) ex.push(sp().toFixed(0)); }
  const r=measure(spec);
  console.log(spec.name, 'drift', out.join(' '), '| exit', ex.join(' '), 'maxExit',mx.toFixed(0),'| st',r.straighten.toFixed(2),'uturn',r.uturn.toFixed(2),'dLoss',r.dLoss.toFixed(0),'counter',r.counter.toFixed(2),'dB',r.driftBeta.toFixed(0), 'gauge', r.gauge2s.toFixed(2));
}
