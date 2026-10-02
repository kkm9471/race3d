import { CARS } from '../../../web/src/sim/cars.js';
import { Sim } from '../../../web/src/sim/race.js';
const track=process.argv[2]||'space', FPS=60;
const combos=[[0,1,2,3],[4,5,6,7],[8,9,10,11],[12,13,14,15],[14,15,16,17],[0,5,10,15]];
combos.forEach((cb,ci)=>{
  const players=cb.map((k,i)=>({car:CARS[k].id,name:'B'+i,bot:true,botSkill:0.86+i*0.03,abs:true,tcs:true}));
  const sim=new Sim({track,laps:1,players}); const last=players.map(()=>-999);
  while(!sim.gs.over&&sim.gs.frame<FPS*400){
    sim.step(players.map(()=>0)); const f=sim.gs.frame;
    for(const e of sim.events){ if(e.t==='car'){last[e.a]=f;last[e.b]=f;}
      if(e.t==='wall'&&e.vn>5&&f-last[e.a]>=120){ const c=sim.cars[e.a]; const T=sim.T,i=c.st.hint;
        // nearest other car distance
        let nd=1e9; sim.cars.forEach((o,q)=>{if(q!==e.a) nd=Math.min(nd,Math.hypot(o.st.px-c.st.px,o.st.pz-c.st.pz));});
        console.log('combo',ci,'f',f,'car',e.a,CARS[cb[e.a]].name,'skill',players[e.a].botSkill,'vn',e.vn.toFixed(1),'i',i,'/',T.n,'off',c.st.off.toFixed(1),'hw',T.hw[i].toFixed(1),'k',T.k[i].toFixed(3),'spd',(c.out.speed*3.6).toFixed(0),'nearestCar',nd.toFixed(1),'surf',T.roadSurf?T.roadSurf[i]:'-','grade',T.grade[i].toFixed(2),'ramp',T.ramp[i]); }
    }
  }
});
