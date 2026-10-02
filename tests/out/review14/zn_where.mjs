const mk = () => { const f = function(){}; const p = new Proxy(f, { get(t,k){ if(k==='measureText') return ()=>({width:10}); if(k==='getImageData'||k==='createImageData') return (x,y,w,h)=>({data:new Uint8ClampedArray((w||1)*(h||1)*4),width:w,height:h}); if(k===Symbol.toPrimitive) return ()=>0; if(k==='canvas') return globalThis.__c; return p; }, set(){return true;}, apply(){ return p; } }); return p; };
globalThis.document = { createElement: () => { const c = { width:1,height:1,style:{}, getContext: () => mk(), toDataURL:()=>'' , addEventListener(){}, }; globalThis.__c=c; return c; } };
globalThis.window = globalThis; globalThis.self = globalThis; globalThis.location = { search: '' };
const THREE = await import('three');
const { TRACK_DEFS } = await import('../../../web/src/sim/tracks.js');
const { buildTrack, TrackWorld } = await import('../../../web/src/sim/track.js');
const { buildTrackScene } = await import('../../../web/src/render/trackmesh.js');
const { loadTheme } = await import('../../../web/src/render/themes/index.js');
const { MAP_IDS } = await import('../../../web/src/sim/maps/index.js');
const QH = { detail: 2, shadow: 4096, trees: 1, bloom: true, fogMul: 0.8 };
for (const id of ["mine"]) {
  const def = TRACK_DEFS.find(d => d.id === id); await loadTheme(def.theme);
  const T = buildTrack(def), world = new TrackWorld(T);
  const ow = console.log; console.log = () => {}; const g = buildTrackScene(T, world, QH, def); console.log = ow;
  let bad = [];
  g.traverse(o => { if (!(o.isMesh || o.isPoints) || o.isInstancedMesh) return; const gm = o.geometry; const nrm = gm.attributes.normal, pos = gm.attributes.position; let zero = 0, nan = 0;
    if (nrm) for (let i = 0; i < nrm.count; i++) { const x = nrm.getX(i), y = nrm.getY(i), z = nrm.getZ(i); if (!Number.isFinite(x+y+z)) nan++; else if (x*x+y*y+z*z < 1e-8) zero++; }
    let pn = 0; for (let i = 0; i < pos.count; i++) if (!Number.isFinite(pos.getX(i)+pos.getY(i)+pos.getZ(i))) pn++;
    const uv = gm.attributes.uv; let un = 0; if (uv) for (let i = 0; i < uv.count; i++) if (!Number.isFinite(uv.getX(i)+uv.getY(i))) un++;
    if (o.material.color?.getHexString?.()==="c0c8d0") { const ix=[]; for (let i=0;i<nrm.count;i++){const x=nrm.getX(i),y=nrm.getY(i),z=nrm.getZ(i); if(x*x+y*y+z*z<1e-8) ix.push(i);} console.error("ZERO idx", ix.join(",")); const P=gm.attributes.position; for (const i of ix.slice(0,6)) { const k=i>>1; console.error(i, [k-1,k,k+1].map(q=>[0,1].map(e=>[P.getX(q*2+e),P.getY(q*2+e),P.getZ(q*2+e)].map(v=>v.toFixed(3)).join("/")).join(" | ")).join("  ||  ")); } }
    if (zero || nan || pn || un) bad.push({ verts: pos.count, zeroNormals: zero, nanNormals: nan, nanPos: pn, nanUv: un, color: o.material.color?.getHexString?.(), mat: o.material.type }); });
  console.log(id, JSON.stringify(bad));
}
