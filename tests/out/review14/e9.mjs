import { CARS } from '../../../web/src/sim/cars.js';
import { pack } from '../../../web/src/sim/input.js';
import { newCar, frame, beta } from '../../physics_report.mjs';
const spec = CARS[0];
const spd = c => Math.hypot(c.st.vx, c.st.vz) * 3.6;
console.log('drift decel %/s of speed (1s window after 0.5s in), thr held vs released');
for (const v0 of [40,60,80,100,140,155]) {
  const row=[];
  for (const thr of [1,0]) {
    const { c, w } = newCar(spec); c.setSpeed(v0/3.6);
    for(let f=0;f<30;f++) frame(c,w,pack({thr,steer:1,hb:1,kb:1}));
    const a=spd(c); for(let f=0;f<60;f++) frame(c,w,pack({thr,steer:1,hb:1,kb:1}));
    row.push(`thr${thr}: ${((1-spd(c)/a)*100).toFixed(1)}%/s`);
  }
  // straight no drift thr=1 at v0
  const { c, w } = newCar(spec); c.setSpeed(v0/3.6); const a=spd(c); for(let f=0;f<60;f++) frame(c,w,pack({thr:1,kb:1}));
  row.push(`straight thr1 change ${((spd(c)/a-1)*100).toFixed(1)}%`);
  console.log(v0,row.join(' | '));
}
// 진입 속도: 140km/h, 시간별 beta/머리 회전 속도
{ const { c, w } = newCar(spec); c.setSpeed(140/3.6);
  let maxyaw=0, t30=0, prevH=Math.atan2(2*(c.st.qx*c.st.qz+c.st.qw*c.st.qy),1-2*(c.st.qx*c.st.qx+c.st.qy*c.st.qy));
  for(let f=0;f<90;f++){ frame(c,w,pack({thr:1,steer:1,hb:1,kb:1})); const yw=Math.abs(c.st.wy)*57.3; maxyaw=Math.max(maxyaw,yw); if(!t30&&Math.abs(beta(c))>=30)t30=(f+1)/60; }
  console.log('entry: max head yaw rate deg/s',maxyaw.toFixed(0),'time to 30deg',t30);
}
// 저속 진입(30km/h=8.3m/s) 미끄럼각
for (const v0 of [32,40,60]) { const { c, w } = newCar(spec); c.setSpeed(v0/3.6); let b=[],alive=0;
  for(let f=0;f<90;f++){ frame(c,w,pack({thr:1,steer:1,hb:1,kb:1})); if(f%15==14) b.push(beta(c).toFixed(0)+'/'+(c.out.fwd*3.6).toFixed(0)+(c.st.drift?'D':'-')); }
  console.log('low speed',v0,b.join(' ')); }
// 드리프트 중 방향키 안 누름(steer 0, Shift 유지)
{ const { c, w } = newCar(spec); c.setSpeed(140/3.6); let b=[];
  for(let f=0;f<120;f++){ frame(c,w,pack({thr:1,steer:f<20?1:0,hb:1,kb:1})); if(f%15==14) b.push(beta(c).toFixed(0)+(c.st.drift?'D':'-')); }
  console.log('steer released but shift held',b.join(' '),'hdg change',(Math.atan2(c.st.vx,c.st.vz)*57.3).toFixed(0)); }
