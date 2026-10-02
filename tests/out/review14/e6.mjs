const {TRACK_DEFS}=await import('../../../web/src/sim/tracks.js');
const {getTrack}=await import('../../../web/src/sim/race.js');
let tot=0;const r=[];
for(const d of TRACK_DEFS){const t=performance.now();getTrack(d.id);const e=performance.now()-t;tot+=e;r.push([d.id,e.toFixed(0)]);}
console.log('23개 첫 빌드 합계 ms',tot.toFixed(0),r.sort((a,b)=>b[1]-a[1]).slice(0,4).join(' | '));
