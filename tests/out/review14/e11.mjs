import { CARS } from '../../../web/src/sim/cars.js';
import { Car } from '../../../web/src/sim/car.js';
import { pack } from '../../../web/src/sim/input.js';
import { frame, FlatWorld } from '../../physics_report.mjs';
const spd = c => Math.hypot(c.st.vx, c.st.vz) * 3.6;
function beta(c){const ax=c.axes([]);const vl=c.st.vx*ax[0]+c.st.vz*ax[2],vf=c.st.vx*ax[6]+c.st.vz*ax[8];return Math.atan2(vl,vf)*57.3;}
for (const surf of [0,5,3,2]) for (const spec of [CARS[0],CARS[CARS.length-1]]) {
  const w=new FlatWorld(surf); const c=new Car(spec); c.place(0,spec.cgH+0.03,0,0);
  for(let i=0;i<60;i++) frame(c,w,pack({kb:0}),true);
  c.setSpeed(140/3.6); let maxb=0, log=[], ended=0;
  for(let f=0;f<180;f++){ frame(c,w,pack({thr:1,steer:1,hb:1,kb:1})); maxb=Math.max(maxb,Math.abs(beta(c))); if(f%30==29) log.push(`${beta(c).toFixed(0)}°/${spd(c).toFixed(0)}${c.st.drift?'D':'-'}`); }
  console.log('surf',surf,spec.name,'maxbeta',maxb.toFixed(0),log.join(' '));
}
