// js/map/geometry.js — derived map geometry from the province-ID raster. SPEC §5.3.
// Single pass over idArray comparing right & down neighbors. idArray row 0 = north.
// Every land cell stays IN neighbors; the sim filters current impassability for pathing.

export function computeGeometry(idArray, MAP_DATA) {
  const W = MAP_DATA.MAP_W | 0;
  const H = MAP_DATA.MAP_H | 0;
  const provs = MAP_DATA.provinces || [];
  const N = provs.length;

  const neighbors = new Array(N + 1);
  for (let i = 0; i <= N; i++) neighbors[i] = new Set();
  const areas = new Int32Array(N + 1);
  const sumX = new Float64Array(N + 1);
  const sumY = new Float64Array(N + 1);
  const bbox = new Array(N + 1);
  for (let i = 0; i <= N; i++) bbox[i] = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };

  if (idArray && idArray.length >= W * H) {
    for (let y = 0; y < H; y++) {
      const row = y * W;
      for (let x = 0; x < W; x++) {
        const id = idArray[row + x];
        if (id === 0 || id > N) continue;
        areas[id]++;
        sumX[id] += x + 0.5;
        sumY[id] += y + 0.5;
        const b = bbox[id];
        if (x < b.x0) b.x0 = x;
        if (x > b.x1) b.x1 = x;
        if (y < b.y0) b.y0 = y;
        if (y > b.y1) b.y1 = y;
        if (x + 1 < W) {
          const r = idArray[row + x + 1];
          if (r !== id && r !== 0 && r <= N) { neighbors[id].add(r); neighbors[r].add(id); }
        }
        if (y + 1 < H) {
          const d = idArray[row + W + x];
          if (d !== id && d !== 0 && d <= N) { neighbors[id].add(d); neighbors[d].add(id); }
        }
      }
    }
  } else {
    console.warn('[geometry] idArray missing or wrong size — geometry falls back to seed positions');
  }

  const centroids = new Array(N + 1);
  centroids[0] = { x: 0, y: 0 };
  for (let i = 1; i <= N; i++) {
    if (areas[i] > 0) {
      centroids[i] = { x: sumX[i] / areas[i], y: sumY[i] / areas[i] };
    } else {
      const p = provs[i - 1];
      let fx = W * 0.5;
      let fy = H * 0.5;
      if (p && typeof MAP_DATA.project === 'function' && typeof p.lon === 'number') {
        const xy = MAP_DATA.project(p.lon, p.lat);
        fx = xy[0];
        fy = xy[1];
      }
      centroids[i] = { x: fx, y: fy };
      bbox[i] = { x0: fx - 2, y0: fy - 2, x1: fx + 2, y1: fy + 2 };
      console.warn(`[geometry] province ${i} (${p && p.name}) covers zero pixels in idArray`);
    }
  }

  // Merge extraLinks (strait/ferry adjacency, referenced by canonical name).
  const byName = new Map();
  provs.forEach((p, idx) => { if (p && p.name) byName.set(p.name, idx + 1); });
  for (const link of MAP_DATA.extraLinks || []) {
    const a = link && byName.get(link[0]);
    const b = link && byName.get(link[1]);
    if (!a || !b) {
      console.warn('[geometry] extraLink did not resolve, skipped:', link);
      continue;
    }
    neighbors[a].add(b);
    neighbors[b].add(a);
  }
  // Sever water-crossing raster adjacencies: armies need ships (SPEC §20).
  for (const link of MAP_DATA.severLinks || []) {
    const a = link && byName.get(link[0]);
    const b = link && byName.get(link[1]);
    if (!a || !b) {
      console.warn('[geometry] severLink did not resolve, skipped:', link);
      continue;
    }
    neighbors[a].delete(b);
    neighbors[b].delete(a);
  }

  // ---- coastal detection (v2.0, navies) -----------------------------------
  // The OPEN sea is the id-0 component connected to the map corners (lakes —
  // the Dead Sea, Galilee — are id-0 too, but landlocked, so they don't
  // count). A province touching open sea is coastal; its offshore anchor is
  // the mean of its sea-facing boundary pixels, nudged one step seaward —
  // where fleets ride and blockades sit.
  const coastal = new Array(N + 1).fill(false);
  const offshore = new Array(N + 1).fill(null);
  if (idArray && idArray.length >= W * H) {
    // The map is land-framed (Anatolia, Armenia, Egypt, Arabia at the corners),
    // so the Mediterranean is an INTERIOR sea: open sea = any id-0 component
    // big enough that it cannot be a lake (the Med is ~a third of the map;
    // the Dead Sea and Galilee are specks).
    const sea = new Uint8Array(W * H); // 1 = open sea
    const seen = new Uint8Array(W * H);
    const MIN_SEA_PX = Math.max(20000, (W * H / 100) | 0); // ≥1% of the map
    const comp = new Int32Array(W * H); // scratch: current component's pixels
    for (let start = 0; start < W * H; start++) {
      if (idArray[start] !== 0 || seen[start]) continue;
      let n = 0;
      comp[n++] = start;
      seen[start] = 1;
      for (let head = 0; head < n; head++) {
        const i = comp[head];
        const x = i % W, y = (i / W) | 0;
        const tryPx = (j) => { if (idArray[j] === 0 && !seen[j]) { seen[j] = 1; comp[n++] = j; } };
        if (x > 0) tryPx(i - 1);
        if (x + 1 < W) tryPx(i + 1);
        if (y > 0) tryPx(i - W);
        if (y + 1 < H) tryPx(i + W);
      }
      if (n >= MIN_SEA_PX) for (let k = 0; k < n; k++) sea[comp[k]] = 1;
    }
    const offX = new Float64Array(N + 1);
    const offY = new Float64Array(N + 1);
    const offN = new Int32Array(N + 1);
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const id = idArray[y * W + x];
        if (id === 0 || id > N) continue;
        // any 4-neighbor on open sea?
        let sx = 0, sy = 0, sn = 0;
        if (sea[y * W + x - 1]) { sx -= 1; sn++; }
        if (sea[y * W + x + 1]) { sx += 1; sn++; }
        if (sea[(y - 1) * W + x]) { sy -= 1; sn++; }
        if (sea[(y + 1) * W + x]) { sy += 1; sn++; }
        if (!sn) continue;
        coastal[id] = true;
        offX[id] += x + sx * 6; // nudged ~6px seaward
        offY[id] += y + sy * 6;
        offN[id]++;
      }
    }
    for (let i = 1; i <= N; i++) {
      if (offN[i] > 0) offshore[i] = { x: offX[i] / offN[i], y: offY[i] / offN[i] };
    }
  } else {
    // Fake-geom fallback (headless tests): coast terrain counts as coastal.
    provs.forEach((p, idx) => {
      if (p && p.terrain === 'coast') {
        coastal[idx + 1] = true;
        offshore[idx + 1] = centroids[idx + 1];
      }
    });
  }

  return { neighbors, centroids, areas, bbox, coastal, offshore };
}
