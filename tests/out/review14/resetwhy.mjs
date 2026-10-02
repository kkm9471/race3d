import { CARS } from '../../../web/src/sim/cars.js';
import { Sim, GO_FRAME } from '../../../web/src/sim/race.js';
import { botInput } from '../../../web/src/sim/bot.js';
import { unpack, pack } from '../../../web/src/sim/input.js';
const FPS=60;
function run(track, me){
  const at=CARS.findIndex(c=>c.id===me), pool=[...CARS.slice(at+1),...CARS.slice(0,at)];
  const players=[{car:me,name:'me'}]; for(let i=0;i<3;i++) players.push({car:pool[i].id,name:'AI'+i,bot:true,botSkill:0.86+i*0.03});
  const sim=new Sim({track,laps:1,players}); const mem={stuckT:0,ram:true}; const u={};
  const hist=[]; // ring of human/AI state
  while(!sim.gs.over&&sim.gs.frame<FPS*400){
    let inp=botInput(sim,0,0.95,mem); unpack(inp,u); if(Math.abs(u.steer)>0.3&&sim.cars[0].out.speed>16)u.hb=1; if(sim.cars[0].st.drift&&Math.abs(u.steer)>0.1)u.hb=1; inp=pack(u);
    // snapshot before step
    const pre=sim.cars.map(c=>({al:0,fl:c.st.flipT,sp:Math.hypot(c.st.vx,c.st.vz),off:c.st.off,hint:c.st.hint,qy:c.st.qy}));
    sim.step([inp,0,0,0]);
    for(const e of sim.events){ if(e.t==='reset'&&e.a>0){
      const T=sim.T; const c=sim.cars[e.a].st; const {qw,qx,qy,qz}=c; const fx=2*(qx*qz+qw*qy), fz=1-2*(qx*qx+qy*qy); const i=c.hint; const along=fx*T.tx[i]+fz*T.tz[i];
      const dh=Math.hypot(sim.cars[0].st.px-c.px, sim.cars[0].st.pz-c.pz);
      console.log(track,me,'frame',sim.gs.frame,'AI',e.a,'along(post)',along.toFixed(2),'flipT',pre[e.a].fl.toFixed(2),'prev speed',pre[e.a].sp.toFixed(1),'humanDist',dh.toFixed(1),'humanDrift',sim.cars[0].st.drift,'off',pre[e.a].off.toFixed(1),'hw',T.hw[i].toFixed(1)); } }
  }
}
for (const [t,m] of [['mountain','masil'],['harbor','masil'],['forest','masil'],['mine','baram'],['canyon','masil'],['glacier','masil'],['desert','baram']]) run(t,m);
