const mkCtx=()=>{const bad=[];const h={get(t,k){if(k==='__bad')return bad;if(k==='createRadialGradient')return()=>({addColorStop(){}});return(...a)=>{for(const v of a)if(typeof v==='number'&&!Number.isFinite(v))bad.push(k+':'+v);};},set(){return true;}};return new Proxy({},h);};
const bads=[];
globalThis.document={createElement:()=>{const ctx=mkCtx();return{width:0,height:0,getContext:()=>ctx,__ctx:ctx};}};
globalThis.window={devicePixelRatio:1};
globalThis.performance=performance;
const {TrackPreview,featureSummary}=await import('../../../web/src/ui/trackpreview.js');
const {TRACK_DEFS}=await import('../../../web/src/sim/tracks.js');
const {getTrack}=await import('../../../web/src/sim/race.js');
for(const d of TRACK_DEFS){
  const T=getTrack(d.id);const ctx=mkCtx();
  const c={clientWidth:420,clientHeight:300,width:0,height:0,getContext:()=>ctx};
  const tp=new TrackPreview(c);tp.set(d,T);
  const ok=['bounds','hw','x','z','y','tx','tz','lx','lz','L','ds','n'].every(k=>T[k]!==undefined);
  let nan=0;for(const k of['x','z','y','hw'])for(let i=0;i<T.n;i++)if(!Number.isFinite(T[k][i]))nan++;
  // 배경 그림에서 NaN 좌표
  const bg=tp.bg;const badc=bg?bg.getContext('2d').__bad:[];
  const rot=tp.sc;
  console.log(d.id.padEnd(10),'필드',ok,'NaN샘플',nan,'bg NaN 호출',badc.length,'sc',rot&&rot.toFixed(3),featureSummary(d));
}
