import { CARS } from '../web/src/sim/cars.js';
import { circleHold, newCar, frame, FPS } from './physics_report.mjs';
import { pack } from '../web/src/sim/input.js';
const spec = CARS.find(c => c.id === process.argv[2]);
for (let v = +process.argv[3]; v <= +process.argv[4]; v += 2) { const r = circleHold(spec, v); console.log(v, r.hold, r.ay.toFixed(3)); }
