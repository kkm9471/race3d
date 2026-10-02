import { TRACK_DEFS } from '../../web/src/sim/tracks.js';
import { buildTrack } from '../../web/src/sim/track.js';
for (const d of TRACK_DEFS) { const t0 = performance.now(); const T = buildTrack(d); console.log(d.id, (performance.now() - t0).toFixed(0) + 'ms', T.n, T.L.toFixed(0)); }
