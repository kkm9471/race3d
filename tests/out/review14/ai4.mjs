import { CARS } from '../../../web/src/sim/cars.js';
import { Sim, GO_FRAME } from '../../../web/src/sim/race.js';
import { TRACK_DEFS } from '../../../web/src/sim/tracks.js';
const FPS=60;
const only=process.argv[2];
const combos=[[0,1,2,3],[4,5,6,7],[8,9,10,11],[12,13,14,15],[14,15,16,17],[0,5,10,15]];
const rows=[];
for (const d of TRACK_DEFS){
  if(only && d.id!==only) continue;
  let touch=0,rs=0,unf=0,wall=0,big=0; const notes=[];
  combos.forEach((cb,ci)=>{
    const players=cb.map((k,i)=>({car:CARS[k].id,name:'B'+i,bot:true,botSkill:0.86+i*0.03,abs:true,tcs:true}));
    const sim=new Sim({track:d.id,laps:1,players});
    let rsHere=0, t0=0;
    while(!sim.gs.over && sim.gs.frame<FPS*400){
      sim.step(players.map(()=>0));
      if(sim.gs.frame>GO_FRAME){ if(sim.events.some(e=>e.t==='car')) touch++; }
      for(const e of sim.events){ if(e.t==='reset'){rs++;rsHere++;} if(e.t==='wall'){wall++; if(e.vn>5)big++;} }
    }
    const u=sim.cars.filter(c=>!c.st.fin).length; unf+=u;
    if(rsHere||u) notes.push(`c${ci}:rs${rsHere}/unf${u}`);
  });
  console.log(d.id.padEnd(10),'touch',(touch/FPS).toFixed(1),'rs',rs,'unf',unf,'wall',wall,'big',big,notes.join(' '));
}
