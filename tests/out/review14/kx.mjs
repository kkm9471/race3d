import { TRACK_DEFS } from '../../../web/src/sim/tracks.js';
import { Sim } from '../../../web/src/sim/race.js';
for (const def of TRACK_DEFS){
  const sim=new Sim({track:def.id,laps:1,players:[{car:'masil'}]}); const T=sim.T;
  let maxk=0, nDiv=0, extra=0, tot=0, maxkx=0;
  for(let i=0;i<T.n;i++){
    if(T.divW[i]>0){ nDiv++; const kx=Math.abs(T.k[i])*12; maxkx=Math.max(maxkx,kx); maxk=Math.max(maxk,Math.abs(T.k[i]));
      // 추가로 제외되는 가로 폭(양쪽)
      extra+=2*kx; tot+=2*(T.divW[i]+1.4);
    }
  }
  if(nDiv) console.log(def.id.padEnd(9),'divider samples',nDiv,'max|k|',maxk.toFixed(3),'(R='+(1/Math.max(maxk,1e-9)).toFixed(0)+'m)','max kx',maxkx.toFixed(2),'m');
}
