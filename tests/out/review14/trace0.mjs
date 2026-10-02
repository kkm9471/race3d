import { CARS } from '../../../web/src/sim/cars.js';
import { Sim } from '../../../web/src/sim/race.js';
const track=process.argv[2]||'circuit'; const cb=[0,1,2,3];
const players=cb.map((k,i)=>({car:CARS[k].id,name:'B'+i,bot:true,botSkill:0.86+i*0.03,abs:true,tcs:true}));
const sim=new Sim({track,laps:1,players});
while(sim.gs.frame<345){
  sim.step(players.map(()=>0));
  const f=sim.gs.frame;
  if(f===240||f===270||(f>=290&&f%6===0)) console.log(f, sim.cars.map(c=>`${c.st.off.toFixed(1)}@${c.st.hint}/${(c.out.speed*3.6).toFixed(0)}`).join('  '));
}
console.log('hw',sim.T.hw[5], 'wallL', sim.T.wallL[5]);
