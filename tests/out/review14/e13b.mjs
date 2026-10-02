import { CARS } from '../../../web/src/sim/cars.js';
import { pack } from '../../../web/src/sim/input.js';
import { frame, FlatWorld } from '../../physics_report.mjs';
import { Car as CarA } from '../../../web/src/sim/car.js';
import { Car as CarB } from './mod/car_nofb.js';
const spec = CARS[0];
function mk(Car){ const c=new Car(spec); c.place(0,spec.cgH+0.03,0,0); const w=new FlatWorld(); for(let i=0;i<60;i++)frame(c,w,pack({kb:0}),true); for(let i=0;i<30;i++)frame(c,w,pack({kb:0})); return {c,w}; }
const spd=c=>Math.hypot(c.st.vx,c.st.vz)*3.6;
function drift(Car,tapOn,tapOff,secs=30){
  const {c,w}=mk(Car); for(let f=0;f<1200;f++)frame(c,w,pack({thr:1,kb:1})); c.st.boosts=1;
  let uses=0,up=0,sum=0,mx=0,n=0,dist=0;
  for(let f=0;f<60*secs;f++){
    const useB=c.st.boosts>0&&c.st.boostT<=0&&f%2===0; if(useB)uses++;
    const ph=f%(tapOn+tapOff);
    frame(c,w,pack({thr:1,steer:tapOn?(ph<tapOn?1:0):1,hb:1,bo:useB?1:0,kb:1}));
    if(c.st.boostT>0)up++; sum+=spd(c);n++;mx=Math.max(mx,spd(c));
  }
  return {uses,uptime:(up/n).toFixed(2),avg:sum/n|0,mx:mx|0,drift:c.st.drift};
}
// 기준: 드리프트 없이 직진 + 부스터 2개 한 번 쓴 최고속
function straightBoost(Car){const {c,w}=mk(Car);for(let f=0;f<1200;f++)frame(c,w,pack({thr:1,kb:1}));c.st.boosts=2;let mx=0;for(let f=0;f<400;f++){frame(c,w,pack({thr:1,kb:1,bo:f%80===0?1:0}));mx=Math.max(mx,spd(c));}return mx|0;}
for(const [nm,C] of [['현행',CarA],['속도비항 1 고정',CarB]]){
  console.log(nm,'직진 부스터 최고',straightBoost(C),'hold',JSON.stringify(drift(C,0,0)),'tap3/3',JSON.stringify(drift(C,3,3)));
}
