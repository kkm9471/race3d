const mk = () => { const f = function(){}; const p = new Proxy(f, { get(t,k){ if(k==='measureText') return ()=>({width:10}); if(k==='getImageData'||k==='createImageData') return (x,y,w,h)=>({data:new Uint8ClampedArray((w||1)*(h||1)*4),width:w,height:h}); if(k===Symbol.toPrimitive) return ()=>0; if(k==='canvas') return globalThis.__c; return p; }, set(){return true;}, apply(){ return p; } }); return p; };
globalThis.document = { createElement: (t) => { const c = { width:1,height:1,style:{}, getContext: () => mk(), toDataURL:()=>'' , addEventListener(){}, }; globalThis.__c=c; return c; } };
globalThis.window = globalThis; globalThis.self = globalThis;
globalThis.location = { search: '' };
const THREE = await import('three');
const { TRACK_DEFS } = await import('../../../web/src/sim/tracks.js');
const { buildTrack } = await import('../../../web/src/sim/track.js');
const { TrackWorld } = await import('../../../web/src/sim/track.js');
const { buildTrackScene } = await import('../../../web/src/render/trackmesh.js');
const { loadTheme, THEMES } = await import('../../../web/src/render/themes/index.js');
const { MAP_IDS } = await import('../../../web/src/sim/maps/index.js');
const only = process.argv.slice(2);
const QS=[{detail:0,shadow:0,trees:0.35,bloom:false,fogMul:1.5},{detail:1,shadow:2048,trees:0.75,bloom:true,fogMul:1},{detail:2,shadow:4096,trees:1,bloom:true,fogMul:0.8}];const detail = +(process.env.DETAIL ?? 2);
for (const id of (process.env.ALL ? TRACK_DEFS.map(d=>d.id) : MAP_IDS)) {
  if (only.length && !only.includes(id)) continue;
  const def = TRACK_DEFS.find(d => d.id === id);
  const th = await loadTheme(def.theme);
  const T = buildTrack(def), world = new TrackWorld(T);
  const warns = []; const ow = console.warn; console.warn = (...a) => warns.push(a.map(String).join(' ').slice(0,200));
  let g, err=null; const t0 = performance.now();
  try { g = buildTrackScene(T, world, QS[detail], def); } catch (e) { err = e; }
  console.warn = ow;
  if (err) { console.log(id, 'THROW', err.message); continue; }
  let meshes = 0, inst = 0, tris = 0, tex = new Set(), mats = new Set(), lights = 0;
  g.traverse(o => { if (o.isLight) lights++; if (o.isMesh || o.isPoints || o.isLine) { meshes++; if (o.isInstancedMesh) inst++; const gm = o.geometry; tris += (gm.index ? gm.index.count : gm.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); const ms = Array.isArray(o.material)?o.material:[o.material]; ms.forEach(m=>{mats.add(m);}); } });
  if (process.env.TOP) { const arr=[]; g.traverse(o=>{ if(o.isMesh||o.isPoints){ const gm=o.geometry; const t=(gm.index?gm.index.count:gm.attributes.position.count)/3*(o.isInstancedMesh?o.count:1); arr.push([t,o.type,o.isInstancedMesh?o.count:1,(o.material.name||o.material.type), o.castShadow]); }}); arr.sort((a,b)=>b[0]-a[0]); console.log(arr.slice(0,+process.env.TOP).map(a=>a.join(' ')).join(String.fromCharCode(10))); }
  { const ims=[]; g.traverse(o=>{ if(o.isInstancedMesh) ims.push([o,o.instanceMatrix.version]); }); for(const f of g.userData.anims) f(1.0,1/60); let bytes=0,cnt=0; for(const [o,v] of ims){ if(o.instanceMatrix.version!==v){ bytes+=o.count*64; cnt++; } } console.log('   per-frame instance upload: meshes',cnt,'KB',(bytes/1024).toFixed(0)); }
  console.log(`${id}: ${(performance.now()-t0).toFixed(0)}ms draw=${meshes} (inst ${inst}) mats=${mats.size} tris=${(tris/1000).toFixed(0)}k lights=${lights} anims=${g.userData.anims.length} warns=${JSON.stringify(warns)}`);
}
