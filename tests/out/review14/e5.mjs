const src=(await import('node:fs')).readFileSync('server/src/room.js','utf8');
const tr=[...src.match(/const TRACKS = \[([\s\S]*?)\]/)[1].matchAll(/'(\w+)'/g)].map(m=>m[1]);
const cr=[...src.match(/const CARS = \[([\s\S]*?)\]/)[1].matchAll(/'(\w+)'/g)].map(m=>m[1]);
const {TRACK_DEFS}=await import('../../../web/src/sim/tracks.js');const {CARS}=await import('../../../web/src/sim/cars.js');
const {PAINT}=await import('../../../web/src/render/carmesh.js');
console.log('트랙 서버',tr.length,'클라',TRACK_DEFS.length,'차이',TRACK_DEFS.map(t=>t.id).filter(x=>!tr.includes(x)),tr.filter(x=>!TRACK_DEFS.some(t=>t.id===x)));
console.log('차 서버',cr.length,'클라',CARS.length,CARS.map(c=>c.id).filter(x=>!cr.includes(x)),'PAINT',PAINT.length);
