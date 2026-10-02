import { TRACK_DEFS } from '../../../web/src/sim/tracks.js';
import { buildTrack } from '../../../web/src/sim/track.js';
import { MAP_IDS } from '../../../web/src/sim/maps/index.js';
for (const def of TRACK_DEFS) {
  if (!MAP_IDS.includes(def.id)) continue;
  const T = buildTrack(def), n = T.n, ds = T.ds;
  const out = [];
  const segs = def.segs;
  // validate features
  for (const f of def.features||[]) {
    const sg = segs[f.seg];
    if (!sg) { out.push(`bad seg ${JSON.stringify(f)}`); continue; }
    if (f.t==='split' && sg[0]!=='A') out.push(`split on S seg ${f.seg}`);
    if ((f.t==='split'||f.t==='tunnel'||f.t==='ice') && !(f.to>f.from)) out.push(`from>=to ${JSON.stringify(f)}`);
  }
  // ramps
  const rampEnds=[];
  for (const f of def.features||[]) if (f.t==='ramp') {
    const e=T.segAt(f.seg,f.at);
    rampEnds.push(e);
    // tunnel overlap: ramp lead-in samples
    const m=Math.round(f.len/ds), mb=6;
    let inTun=false; for(let k=-m;k<=mb;k++) if(T.tunnel[(e+k+n)%n]) inTun=true;
    if(inTun) out.push(`RAMP IN TUNNEL seg${f.seg} at${f.at}`);
    // next corner
    let dist=null; for(let k=1;k<400;k++){ if(Math.abs(T.k[(e+k)%n])>1/80){dist=k*ds;break;} }
    // prior corner before ramp start
    let prior=null; for(let k=m;k<400;k++){ if(Math.abs(T.k[(e-k+n)%n])>1/80){prior=(k-m)*ds;break;} }
    out.push(`ramp s=${(e*ds).toFixed(0)} h${f.h} len${f.len}: corner after ${dist}m, corner before ${prior}m`);
    // split overlap
    for (const sp of T.splits) { let inn=false; for(let k=-m-10;k<=40;k++){const q=(e+k+n)%n; let rel=((q-sp.a)%n+n)%n; let len=((sp.b-sp.a)%n+n)%n; if(rel<=len+8) inn=true;} if(inn) out.push('  ramp near split'); }
    // speed at ramp: tunnel/pad
  }
  // grid
  const L=T.L; 
  for(let i=0;i<n;i++){ const s=i*ds; const back=L-s; if(back>=0&&back<=12+4*9+4.5+8 && (T.padW[i]>0)) out.push(`PAD IN GRID back=${back.toFixed(0)}`); if(back<=12+4*9+9&&back>=0 && T.ramp[i]>0) out.push(`RAMP IN GRID`); if(back<=60&&back>=0&&T.tunnel[i]) {out.push('TUNNEL IN GRID');break;} }
  // pad after startline: pad within 30m after s=0? also pad near corner
  // tunnel crossing start line
  // split end nose vs next
  for (const sp of T.splits){ const len=((sp.b-sp.a)%n+n)%n*ds; 
    // gap between divider end and next ramp/corner
    out.push(`split a=${(sp.a*ds).toFixed(0)} len=${len.toFixed(0)} side=${sp.side}`);
    // tunnel overlapping split
    for(let k=0;k<=len/ds;k++) if(T.tunnel[(sp.a+k)%n]){out.push('  split in tunnel');break;}
    for(let k=0;k<=len/ds;k++) if(T.roadSurf[(sp.a+k)%n]){out.push('  split on ice');break;}
    for(let k=-8;k<=len/ds+8;k++) if(T.ramp[(sp.a+k+n)%n]>0){out.push('  split has ramp');break;}
    for(let k=-8;k<=len/ds+8;k++) if(T.padW[(sp.a+k+n)%n]>0){out.push('  split has pad');break;}
  }
  // pads: pad with d offset outside divider/near divider
  for (const f of def.features||[]) if (f.t==='pad'){ const c=T.segAt(f.seg,f.at); for(let k=-4;k<=4;k++){const i=(c+k+n)%n; if(T.divW[i]>0) {out.push('PAD on split');break;} if(T.tunnel[i]){out.push('pad in tunnel');break;}} const k0=T.k[c]; if(Math.abs(k0)>1/60) out.push(`pad in corner k=${k0.toFixed(3)}`); 
    if (f.d===0 && false) {} 
    // lateral extent
    if (Math.abs(f.d??0)+(f.w??4)/2 > T.hw[c]) out.push('PAD beyond road');
  }
  console.log(`== ${def.id}\n  ${out.join('\n  ')}`);
}
