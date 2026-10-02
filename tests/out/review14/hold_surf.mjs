const root=process.argv[2];
const { CARS } = await import(`${root}/web/src/sim/cars.js`);
const P = await import(`${root}/tests/physics_report.mjs`);
const { pack } = await import(`${root}/web/src/sim/input.js`);
const spec=CARS[1];
for (const surf of [0,1,2,3,4,5]) {
  try{
  const c = new (await import(`${root}/web/src/sim/car.js`)).Car(spec); c.place(0,spec.cgH+0.03,0,0); const w=new P.FlatWorld(surf);
  for(let i=0;i<90;i++) P.frame(c,w,pack({kb:0}),i<60);
  c.setSpeed(150/3.6); let mb=0, yaw0=0;
  for(let f=0;f<300;f++){ P.frame(c,w,pack({thr:1,steer:1,hb:1,kb:1})); mb=Math.max(mb,Math.abs(P.beta(c))); }
  console.log(root.split('/').pop(),'surf',surf,'maxBeta',mb.toFixed(0),'spd',(c.out.speed*3.6).toFixed(0));
  }catch(e){console.log('surf',surf,'err',e.message.slice(0,60));}
}
