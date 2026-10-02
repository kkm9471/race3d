const root=process.argv[2];
const { CARS } = await import(`file:///${root}/web/src/sim/cars.js`);
const { newCar, frame, FPS, beta, measure } = await import(`file:///${root}/tests/physics_report.mjs`);
const { pack } = await import(`file:///${root}/web/src/sim/input.js`);
const spec=CARS[+process.argv[3]||2];
const { c, w } = newCar(spec); c.setSpeed(140/3.6);
const sp=()=>c.out.speed*3.6;
for (let f=0; f<120; f++) frame(c,w,pack({thr:1,steer:f<30?1:0.4,hb:1,kb:1}));
const vd=sp(); const ex=[];
for (let f=0; f<60; f++){ frame(c,w,pack({thr:1,kb:1})); if(f%15==14) ex.push(sp().toFixed(0)); }
const r=measure(spec);
console.log(root.split('/').pop(),spec.name,'drift2s',vd.toFixed(0),'exit(+.25,.5,.75,1s)',ex.join(' '),'straighten',r.straighten.toFixed(2),'dLoss',r.dLoss.toFixed(0),'driftB',r.driftBeta.toFixed(0),'counter',r.counter.toFixed(2),'uturn',r.uturn.toFixed(2));
