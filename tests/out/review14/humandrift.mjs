import { CARS } from '../../../web/src/sim/cars.js';
import { Sim, GO_FRAME } from '../../../web/src/sim/race.js';
import { botInput } from '../../../web/src/sim/bot.js';
import { unpack, pack } from '../../../web/src/sim/input.js';
import { TRACK_DEFS } from '../../../web/src/sim/tracks.js';
const FPS=60; const only=process.argv[2];
function run(track, me, mode){
  const at=CARS.findIndex(c=>c.id===me), pool=[...CARS.slice(at+1),...CARS.slice(0,at)];
  const players=[{car:me,name:'me'}];
  for(let i=0;i<3;i++) players.push({car:pool[i].id,name:'AI'+i,bot:true,botSkill:0.86+i*0.03});
  const sim=new Sim({track,laps:1,players}); const mem={stuckT:0,ram:true};
  let aiRs=0, aiBig=0, aiWall=0, hit=0, maxStuck=[0,0,0,0], stuck=[0,0,0,0], humanRs=0;
  const u={};
  while(!sim.gs.over && sim.gs.frame<FPS*400){
    let inp=botInput(sim,0,0.95,mem);
    if(mode==='drift'){ unpack(inp,u); if(Math.abs(u.steer)>0.3 && sim.cars[0].out.speed>16) { u.hb=1; } if(sim.cars[0].st.drift && Math.abs(u.steer)>0.1) u.hb=1; inp=pack(u); }
    sim.step([inp,0,0,0]);
    const f=sim.gs.frame;
    for(const e of sim.events){ if(e.t==='reset'){ if(e.a>0||e.k>0) aiRs++; else humanRs++; } if(e.t==='wall'&&e.a>0){aiWall++; if(e.vn>5) aiBig++;} if(e.t==='car'&&f>GO_FRAME) hit++; }
    for(let k=1;k<4;k++){ const c=sim.cars[k]; if(f>GO_FRAME && !c.st.fin && c.out.speed<1.5) {stuck[k]++; maxStuck[k]=Math.max(maxStuck[k],stuck[k]);} else stuck[k]=0; }
  }
  const unf=sim.cars.slice(1).filter(c=>!c.st.fin).length;
  const tm=sim.cars.slice(1).map(c=>(c.st.lt0??0));
  return {aiRs,aiBig,aiWall,hit:hit/FPS,unf,humanRs,maxStuck:Math.max(...maxStuck)/FPS, ft:tm.map(x=>x.toFixed?x.toFixed(1):x).join('/')};
}
for(const d of TRACK_DEFS){ if(only&&d.id!==only) continue;
  for(const me of ['masil','baram']){
    const a=run(d.id,me,'plain'), b=run(d.id,me,'drift');
    console.log(d.id.padEnd(9),me.padEnd(7),'plain',JSON.stringify(a),'| drift',JSON.stringify(b));
  }
}
