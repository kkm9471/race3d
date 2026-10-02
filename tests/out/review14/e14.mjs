import { CARS } from '../../../web/src/sim/cars.js';
import { pack } from '../../../web/src/sim/input.js';
import { frame, FlatWorld } from '../../physics_report.mjs';
import { Car } from '../../../web/src/sim/car.js';
const spec = CARS[0];
function mk(){ const c=new Car(spec); c.place(0,spec.cgH+0.03,0,0); const w=new FlatWorld(); for(let i=0;i<60;i++)frame(c,w,pack({kb:0}),true); for(let i=0;i<30;i++)frame(c,w,pack({kb:0})); return {c,w}; }
const spd=c=>Math.hypot(c.st.vx,c.st.vz)*3.6;
// 지그재그: seg 프레임 동안 한 방향 드리프트 후 반대 방향키(카운터) + Shift 한 프레임 뗌, 다시 반대로 드리프트
for (const seg of [20,30,45,60]) {
  const {c,w}=mk(); for(let f=0;f<1200;f++)frame(c,w,pack({thr:1,kb:1})); c.st.boosts=1;
  const x0=c.st.px,z0=c.st.pz; let uses=0,up=0,sum=0,n=0,mx=0,dirn=1,lat=0;
  const T=60*30;
  for(let f=0;f<T;f++){
    const k=Math.floor(f/seg), ph=f%seg; dirn=(k%2===0)?1:-1;
    const useB=c.st.boosts>0&&c.st.boostT<=0&&f%2===0; if(useB)uses++;
    // 각 구간 첫 프레임은 Shift 뗌(래치 해제), 이후 누름
    frame(c,w,pack({thr:1,steer:dirn,hb:ph===0?0:1,bo:useB?1:0,kb:1}));
    if(c.st.boostT>0)up++; sum+=spd(c);n++;mx=Math.max(mx,spd(c)); lat=Math.max(lat,Math.abs(c.st.px-x0));
  }
  const d=Math.hypot(c.st.px-x0,c.st.pz-z0);
  console.log('seg',seg,'uses',uses,'uptime',(up/n).toFixed(2),'avg',sum/n|0,'max',mx|0,'순변위속도 km/h',(d/30*3.6)|0,'횡방향최대 m',lat|0,'드리프트중',c.st.drift);
}
// 기준: 직진 가속만
{const {c,w}=mk(); const x0=c.st.px,z0=c.st.pz; for(let f=0;f<1200+1800;f++)frame(c,w,pack({thr:1,kb:1}));console.log('직진 속도',spd(c)|0);}
