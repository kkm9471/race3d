import { CARS } from '../../../web/src/sim/cars.js';
import { Sim, GO_FRAME } from '../../../web/src/sim/race.js';
const FPS=60; const track=process.argv[2]||'circuit';
const combos=[[0,1,2,3],[4,5,6,7],[8,9,10,11],[12,13,14,15],[14,15,16,17],[0,5,10,15]];
let tot=0,nearCar=0,aftercar=0,solo=0; const hist={};
combos.forEach((cb,ci)=>{
  const players=cb.map((k,i)=>({car:CARS[k].id,name:'B'+i,bot:true,botSkill:0.86+i*0.03,abs:true,tcs:true}));
  const sim=new Sim({track,laps:1,players});
  const lastCar=players.map(()=>-999);
  while(!sim.gs.over && sim.gs.frame<FPS*400){
    sim.step(players.map(()=>0));
    const f=sim.gs.frame;
    for(const e of sim.events){
      if(e.t==='car'){ lastCar[e.a]=f; lastCar[e.b]=f; }
      if(e.t==='wall' && e.vn>5){
        tot++; const k=e.i??e.a??e.k; 
        const car=e.a; 
        const c=sim.cars[car]; 
        const lc=lastCar[car]; if(f-lc<120) aftercar++; else solo++;
        const i=c.st.hint; const b=Math.floor(i/ (sim.T.n/20)); hist[b]=(hist[b]||0)+1;
        if(tot<4) console.log(JSON.stringify(e), 'frame',f);
      }
    }
  }
});
console.log(track,'big walls',tot,'within2s after car contact',aftercar,'no recent contact',solo, 'by track 5%-bin',JSON.stringify(hist));
