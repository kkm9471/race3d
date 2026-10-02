import { CARS } from '../../../web/src/sim/cars.js';
import { Sim } from '../../../web/src/sim/race.js';
let maxB=0,maxG=0,drift=0,bt=0;
for (const t of ['circuit','mountain','space','mine']){
  const players=[0,1,2,3].map(i=>({car:CARS[i].id,bot:true,botSkill:0.9}));
  const sim=new Sim({track:t,laps:1,players});
  while(!sim.gs.over&&sim.gs.frame<60*300){ sim.step([0,0,0,0]); for(const c of sim.cars){maxB=Math.max(maxB,c.st.boosts);maxG=Math.max(maxG,c.st.gauge); if(c.st.drift)drift++; if(c.st.boostT>0)bt++;} }
}
console.log('bots: max boosts',maxB,'max gauge',maxG,'drift frames',drift,'boostT frames (pads incl.)',bt);
