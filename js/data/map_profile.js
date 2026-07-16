// Bookmark-specific administrative geography over permanent rendered cells.
// Every MAP_DATA province remains a stable cell ID. A latent cell may collapse
// into a parent province in one bookmark and become independently playable in
// another without changing IDs, save keys, or the underlying land raster.
//
// Two per-bookmark levers (SPEC §47):
//   bookmark.activeProvinces — latent cells that become real provinces here
//     (Safed in 1948, Modi'in in 167 BCE, Betar in 132 CE).
//   bookmark.mergeProvinces  — base cells that do NOT exist in this era and
//     fold into a neighbor ({'Masada': 'Engaddi'} before the fortress was
//     built and after it burned). The pixels, clicks and adjacency join the
//     parent; the era has no such province.

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

  // Era merges: base cells that do not exist in this bookmark fold into a
  // named neighbor. Chain resolution below handles merge→latent chains.
  const merges = (bookmark && bookmark.mergeProvinces) || {};
  for (const child of Object.keys(merges)) {
    const cid = byName.get(child);
    const pid = byName.get(merges[child]);
    if (!cid || !pid || cid === pid) {
      warnOnce('merge:' + child,
        `mergeProvinces: "${child}" -> "${merges[child]}" does not resolve; ignored`);
      continue;
    }
    mapping[cid] = pid;
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
