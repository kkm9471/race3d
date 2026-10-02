const root=process.argv[2];
const { CARS } = await import(`file:///${root}/web/src/sim/cars.js`);
const { newCar, frame, beta } = await import(`file:///${root}/tests/physics_report.mjs`);
const { pack } = await import(`file:///${root}/web/src/sim/input.js`);
const { c, w } = newCar(CARS[2]); c.setSpeed(140/3.6);
for (let f=0; f<120; f++) frame(c,w,pack({thr:1,steer:f<30?1:0.4,hb:1,kb:1}));
const b0=Math.abs(beta(c)), v0=c.out.speed*3.6; const o=[];
for (let f=0; f<24; f++){ frame(c,w,pack({thr:1,kb:1})); if(f==5||f==11||f==14) o.push(`t${((f+1)/60).toFixed(2)} b=${(Math.abs(beta(c))/b0).toFixed(2)} dv=${(c.out.speed*3.6-v0).toFixed(1)}`); }
console.log(root.split('/').pop(), 'b0',b0.toFixed(0), o.join(' | '));
