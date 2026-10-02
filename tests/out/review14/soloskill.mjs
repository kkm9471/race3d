import { CARS } from '../../../web/src/sim/cars.js';
import { TRACK_DEFS } from '../../../web/src/sim/tracks.js';
import { soloRun } from '../../laps.mjs';
for (const sk of [0.72,0.86]) {
  let big=0,rs=0,unf=0; const bad=[]; let n=0;
  for (const d of TRACK_DEFS) for (const c of CARS) { const r=soloRun(d.id,c.id,1,sk); n++; big+=r.bigWall; rs+=r.resets; if(!r.fin) unf++; if(r.bigWall||r.resets||!r.fin) bad.push(`${d.id}/${c.name}:big${r.bigWall},rs${r.resets}${r.fin?'':',UNFIN'}`); }
  console.log('skill',sk,'runs',n,'bigWall',big,'resets',rs,'unfinished',unf,bad.slice(0,15).join(' '));
}
