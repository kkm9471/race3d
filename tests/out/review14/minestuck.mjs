import { CARS } from '../../../web/src/sim/cars.js';
import { Sim } from '../../../web/src/sim/race.js';
import { botInput } from '../../../web/src/sim/bot.js';
import { unpack, pack } from '../../../web/src/sim/input.js';
const track='mine', me='baram', FPS=60;
const at=CARS.findIndex(c=>c.id===me), pool=[...CARS.slice(at+1),...CARS.slice(0,at)];
const players=[{car:me,name:'me'}]; for(let i=0;i<3;i++) players.push({car:pool[i].id,name:'AI'+i,bot:true,botSkill:0.86+i*0.03});
const sim=new Sim({track,laps:1,players}); const mem={stuckT:0,ram:true}; const u={};
const T=sim.T; let log=[];
while(sim.gs.frame<4300){
  let inp=botInput(sim,0,0.95,mem); unpack(inp,u); if(Math.abs(u.steer)>0.3&&sim.cars[0].out.speed>16)u.hb=1; if(sim.cars[0].st.drift&&Math.abs(u.steer)>0.1)u.hb=1; inp=pack(u);
  sim.step([inp,0,0,0]);
  const f=sim.gs.frame; if(f>=4040&&f<=4230&&f%15===0){ const c=sim.cars[2].st; log.push(`${f} AI2 off ${c.off.toFixed(1)} hint ${c.hint} spd ${(Math.hypot(c.vx,c.vz)).toFixed(1)} hw ${T.hw[c.hint].toFixed(1)} wallL ${T.wallL[c.hint].toFixed(1)} wallR ${T.wallR[c.hint].toFixed(1)} surf? grade ${T.grade[c.hint].toFixed(2)} air ${c.air} flip ${c.flipT.toFixed(1)} dc ${c.dc} ghost ${c.ghostT.toFixed(1)} | human@${sim.cars[0].st.hint}`); }
}
console.log(log.join('\n'));
