// Bookmark-specific administrative geography over permanent rendered cells.
// Every MAP_DATA province remains a stable cell ID. A latent cell may collapse
// into a parent province in one bookmark and become independently playable in
// another without changing IDs, save keys, or the underlying land raster.

const warned = new Set();
function warnOnce(key, ...msg) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn('[map-profile]', ...msg);
}

export function buildProvinceMapping(MAP_DATA, bookmark) {
  const cells = (MAP_DATA && MAP_DATA.provinces) || [];
  const N = cells.length;
  const mapping = new Uint16Array(N + 1);
  const byName = new Map();
  for (let i = 0; i < N; i++) {
    mapping[i + 1] = i + 1;
    if (cells[i] && cells[i].name) byName.set(cells[i].name, i + 1);
  }

  const activated = new Set((bookmark && bookmark.activeProvinces) || []);
  for (let i = 0; i < N; i++) {
    const cell = cells[i];
    if (!cell || !cell.latentParent || activated.has(cell.name)) continue;
    const parentId = byName.get(cell.latentParent);
    if (!parentId) {
      warnOnce('parent:' + cell.name,
        `${cell.name}: latent parent "${cell.latentParent}" does not exist; leaving the cell active`);
      continue;
    }
    mapping[i + 1] = parentId;
  }

  // Resolve parent chains once. The guard keeps malformed future content from
  // hanging campaign startup even if validation warnings are ignored.
  for (let id = 1; id <= N; id++) {
    let target = mapping[id];
    let guard = 0;
    while (target && mapping[target] !== target && guard++ <= N) target = mapping[target];
    if (guard > N || !target) {
      warnOnce('cycle:' + id, `province mapping cycle at cell ${id}; using identity`);
      mapping[id] = id;
    } else {
      mapping[id] = target;
    }
  }
  return mapping;
}

function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if (((yi > y) !== (yj > y))
        && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi) inside = !inside;
  }
  return inside;
}

// Some bookmarks need borders that are geography rather than the permanent
// warped-Voronoi cells. Regions are applied in order, so small enclaves (Gaza,
// the West Bank) can deliberately override a larger Israel/Palestine region.
// The base raster remains the land/sea authority; profile regions can reshape
// land provinces, but can never paint a province into water.
export function buildProvinceRaster(MAP_DATA, baseRaster, bookmark, provinceMap) {
  const W = MAP_DATA && (MAP_DATA.MAP_W | 0);
  const H = MAP_DATA && (MAP_DATA.MAP_H | 0);
  const cells = (MAP_DATA && MAP_DATA.provinces) || [];
  const regions = (bookmark && bookmark.mapRegions) || [];
  if (!W || !H || !baseRaster || baseRaster.length < W * H || !regions.length) {
    return baseRaster;
  }

  const byName = new Map();
  cells.forEach((cell, i) => { if (cell && cell.name) byName.set(cell.name, i + 1); });
  const out = new Uint16Array(baseRaster);

  for (const region of regions) {
    const polygon = (region && region.polygon) || [];
    if (polygon.length < 3) {
      warnOnce('region-polygon:' + (region && region.name), 'skipping malformed map region', region);
      continue;
    }
    const projected = polygon.map((p) => MAP_DATA.project(p[0], p[1]));
    const candidates = [];
    for (const name of region.provinces || []) {
      const id = byName.get(name);
      if (!id || (provinceMap && provinceMap[id] !== id)) continue;
      const cell = cells[id - 1];
      const xy = MAP_DATA.project(cell.lon, cell.lat);
      candidates.push({ id, x: xy[0], y: xy[1], weight: Math.max(0.05, cell.weight || 1) });
    }
    if (!candidates.length) {
      warnOnce('region-candidates:' + (region && region.name), 'map region has no active provinces', region);
      continue;
    }

    let x0 = W - 1, y0 = H - 1, x1 = 0, y1 = 0;
    for (const p of projected) {
      x0 = Math.min(x0, Math.floor(p[0]));
      y0 = Math.min(y0, Math.floor(p[1]));
      x1 = Math.max(x1, Math.ceil(p[0]));
      y1 = Math.max(y1, Math.ceil(p[1]));
    }
    x0 = Math.max(0, x0); y0 = Math.max(0, y0);
    x1 = Math.min(W - 1, x1); y1 = Math.min(H - 1, y1);

    for (let y = y0; y <= y1; y++) {
      const row = y * W;
      for (let x = x0; x <= x1; x++) {
        const idx = row + x;
        if (!baseRaster[idx] || !pointInPolygon(x + 0.5, y + 0.5, projected)) continue;
        let best = candidates[0].id;
        let bestDistance = Infinity;
        for (const candidate of candidates) {
          const dx = x - candidate.x, dy = y - candidate.y;
          const d = (dx * dx + dy * dy) / (candidate.weight * candidate.weight);
          if (d < bestDistance) { bestDistance = d; best = candidate.id; }
        }
        out[idx] = best;
      }
    }
  }
  return out;
}
