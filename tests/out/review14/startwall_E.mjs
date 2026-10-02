import { CARS } from './m_E/web/src/sim/cars.js';
import { Sim, GO_FRAME } from './m_E/web/src/sim/race.js';
const track=process.argv[2]||'circuit';
const combos=[[0,1,2,3],[4,5,6,7],[8,9,10,11],[12,13,14,15],[14,15,16,17],[0,5,10,15]];
combos.forEach((cb,ci)=>{
  const players=cb.map((k,i)=>({car:CARS[k].id,name:'B'+i,bot:true,botSkill:0.86+i*0.03,abs:true,tcs:true}));
  const sim=new Sim({track,laps:1,players}); let n=0;
  while(sim.gs.frame<60*30){
    sim.step(players.map(()=>0));
    for(const e of sim.events) if(e.t==='wall'&&e.vn>5){const c=sim.cars[e.a];const i=c.st.hint; if(n++<3) console.log('combo',ci,'frame',sim.gs.frame,'car',e.a,'vn',e.vn.toFixed(1),'i',i,'/',sim.T.n,'off',c.st.off.toFixed(1),'hw',sim.T.hw[i].toFixed(1),'div',sim.T.div[i].toFixed(1),'divW',sim.T.divW[i].toFixed(1),'wallL',sim.T.wallL[i].toFixed(1),'wallR',sim.T.wallR[i].toFixed(1),'spd',(c.out.speed*3.6).toFixed(0),'ddrift',c.st.drift);}
  }
  console.log('combo',ci,'bigwalls',n);
});
