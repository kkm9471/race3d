import { CARS } from '../web/src/sim/cars.js';
import { circleHold } from './physics_report.mjs';
const spec = CARS.find(c => c.id === process.argv[2]);
for (let v = 50; v <= 80; v += 2) { const r = circleHold(spec, v); console.log(v, r.hold, r.ay.toFixed(3)); }
