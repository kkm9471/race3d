import { CARS } from '../../../web/src/sim/cars.js';
import { pack } from '../../../web/src/sim/input.js';
import { newCar, frame, beta } from '../../physics_report.mjs';
const spec = CARS[0];
const spd = c => Math.hypot(c.st.vx, c.st.vz) * 3.6;
for (const [v0,dur] of [[150,24],[150,36],[156,24],[156,45],[120,30]]) {
  const { c, w } = newCar(spec); c.setSpeed(v0/3.6);
  for(let f=0;f<dur;f++) frame(c,w,pack({thr:1,steer:1,hb:1,kb:1}));
  const sAt=spd(c), fAt=c.out.fwd*3.6;
  frame(c,w,pack({thr:0,kb:1})); let mx=0,got=0;
  for(let f=0;f<60;f++){ frame(c,w,pack({thr:1,kb:1})); mx=Math.max(mx,spd(c)); if(c.st.boostT>0)got=1;}
  console.log(`v0 ${v0} drift ${dur/60}s release speed ${sAt.toFixed(0)} fwd ${fAt.toFixed(0)} (0.9vtop=${(0.9*156.8).toFixed(0)}) -> boost ${got} max after ${mx.toFixed(0)}`);
}
// 카운터 래치: Shift 계속 누른 채 카운터 → 재드리프트 안 되는지, 그리고 Shift 한 프레임 뗐다 누르면 즉시
{ const { c, w } = newCar(spec); c.setSpeed(140/3.6);
  for(let f=0;f<40;f++) frame(c,w,pack({thr:1,steer:1,hb:1,kb:1}));
  for(let f=0;f<20;f++) frame(c,w,pack({thr:1,steer:-1,hb:1,kb:1}));
  console.log('after counter held shift: drift',c.st.drift,'latch',c.st.hbLatch,'beta',beta(c).toFixed(1));
  for(let f=0;f<20;f++) frame(c,w,pack({thr:1,steer:-1,hb:1,kb:1})); console.log(' still held+left: drift',c.st.drift);
}
// 카운터 정렬 시간 / 순간부스터 카운터 보너스창
{ const { c, w } = newCar(spec); c.setSpeed(140/3.6);
  for(let f=0;f<48;f++) frame(c,w,pack({thr:1,steer:1,hb:1,kb:1}));
  let t=0; for(let f=0;f<60;f++){ frame(c,w,pack({thr:1,steer:-1,hb:1,kb:1})); if(!t&&Math.abs(beta(c))<3)t=(f+1)/60; }
  console.log('counter time to |beta|<3:',t, 'spec 0.12');
}
