import { TRACK_DEFS } from '../../../web/src/sim/tracks.js';
import { buildTrack } from '../../../web/src/sim/track.js';
import { MAP_IDS } from '../../../web/src/sim/maps/index.js';
for (const def of TRACK_DEFS) { if (!MAP_IDS.includes(def.id)) continue;
  const T = buildTrack(def), n = T.n, ds = T.ds;
  const out=[];
  const feats = def.features;
  const find = (arr, i0, dir, lim=200) => { for (let k=0;k<lim/ds;k++){ const q=((i0+dir*k)%n+n)%n; if (arr(q)) return k*ds; } return null; };
  for (const f of feats) if (f.t==='ramp') {
    const e=T.segAt(f.seg,f.at);
    const tunAfter=find(i=>T.tunnel[i], e+1, 1, 150), tunBefore=find(i=>T.tunnel[i], e-Math.round(f.len/ds), -1, 150);
    const padB=find(i=>T.padW[i]>0, e-Math.round(f.len/ds), -1, 200), padA=find(i=>T.padW[i]>0, e+1, 1, 120);
    const iceB=find(i=>T.roadSurf[i]===5, e-Math.round(f.len/ds), -1, 100), iceA=find(i=>T.roadSurf[i]===5, e+1, 1, 100);
    const divA=find(i=>T.divW[i]>0, e+1, 1, 100), divB=find(i=>T.divW[i]>0, e, -1, 100);
    // landing zone width/ walls narrowing? 
    out.push(`ramp s=${(e*ds).toFixed(0)}: tunnelAfter=${tunAfter} tunnelBefore=${tunBefore} padBefore=${padB} padAfter=${padA} iceB=${iceB} iceA=${iceA} divAfter=${divA} divBefore=${divB}`);
  }
  // pads: after pad, corner within 40m? 
  for (const f of feats) if (f.t==='pad') { const c=T.segAt(f.seg,f.at); const cd=find(i=>Math.abs(T.k[i])>1/60, c, 1, 120); const ice=find(i=>T.roadSurf[i]===5, c,1,60); const dv=find(i=>T.divW[i]>0,c,1,60);
    out.push(`pad s=${(c*ds).toFixed(0)} corner after ${cd} ice ${ice} div ${dv}`); }
  console.log(def.id+'\n  '+out.join('\n  '));
}
