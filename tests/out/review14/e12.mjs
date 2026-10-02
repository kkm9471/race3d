import { CARS } from '../../../web/src/sim/cars.js';
import { pack } from '../../../web/src/sim/input.js';
import { newCar, frame, beta } from '../../physics_report.mjs';
const spec = CARS[0];
const spd = c => Math.hypot(c.st.vx, c.st.vz) * 3.6;
function run(tapOn,tapOff,secs=30){
  const { c, w } = newCar(spec); for(let f=0;f<60*20;f++) frame(c,w,pack({thr:1,kb:1})); c.st.boosts=1;
  let uses=0,tokF=0,sum=0,mx=0,n=0;
  for(let f=0;f<60*secs;f++){
    const useB=c.st.boosts>0&&c.st.boostT<=0&&f%2===0;
    if(useB)uses++;
    const phase=f%(tapOn+tapOff);
    frame(c,w,pack({thr:1,steer:tapOn?(phase<tapOn?1:0):1,hb:1,bo:useB?1:0,kb:1}));
    if(c.out.tok)tokF++; sum+=spd(c);n++; mx=Math.max(mx,spd(c));
  }
  return {uses,tokF,avg:(sum/n).toFixed(0),mx:mx.toFixed(0),end:spd(c).toFixed(0),b:c.st.boosts,g:c.st.gauge.toFixed(2),drift:c.st.drift};
}
console.log('hold',run(0,0)); console.log('tap 3/3',run(3,3)); console.log('tap 2/4',run(2,4));
// 회전 반경 / 게이지 충전 속도
{
  const { c, w } = newCar(spec); for(let f=0;f<60*20;f++) frame(c,w,pack({thr:1,kb:1})); c.st.boosts=1;
  let h0=Math.atan2(c.st.vx,c.st.vz), unw=0, prev=h0, g0=0, earned=0, pb=c.st.boosts;
  for(let f=0;f<60*10;f++){
    const useB=c.st.boosts>0&&c.st.boostT<=0&&f%2===0; const phase=f%6;
    const b0=c.st.boosts;
    frame(c,w,pack({thr:1,steer:phase<3?1:0,hb:1,bo:useB?1:0,kb:1}));
    let h=Math.atan2(c.st.vx,c.st.vz), d=h-prev; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI; unw+=d; prev=h;
    if(f>=300&&f<540){ /*count earned: gauge wrap*/ }
  }
  const rate=Math.abs(unw)/10; const v=spd(c)/3.6;
  console.log('tap3/3 heading rate rad/s',rate.toFixed(2),'radius m',(v/rate).toFixed(0),'speed',spd(c).toFixed(0));
  // gauge rate during toktok boost: measure gauge delta over 0.5s
  const { c:c2, w:w2 } = newCar(spec); for(let f=0;f<60*20;f++) frame(c2,w2,pack({thr:1,kb:1})); c2.st.boosts=1;
  let t=0; for(let f=0;f<60*10;f++){ const useB=c2.st.boosts>0&&c2.st.boostT<=0; frame(c2,w2,pack({thr:1,steer:(f%6)<3?1:0,hb:1,bo:useB?1:0,kb:1})); }
  const g0b=c2.st.gauge+c2.st.boosts; let earn=0,last=c2.st.gauge,bs=c2.st.boosts; 
  for(let f=0;f<60*5;f++){ const useB=c2.st.boosts>0&&c2.st.boostT<=0; const bb=c2.st.boosts; frame(c2,w2,pack({thr:1,steer:(f%6)<3?1:0,hb:1,bo:useB?1:0,kb:1})); if(c2.st.gauge<last-0.5) earn++; last=c2.st.gauge; }
  console.log('boosts earned in 5s at steady state',earn);
}
