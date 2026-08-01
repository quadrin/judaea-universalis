// js/map/labels.js — absolutely-positioned DOM labels in #labels-layer. SPEC §5.6.
// Zoom >= 1.1: province names at pixel-mass centroids, sized by sqrt(area)·zoom.
// Zoom <  1.1: nation names, ONE PER REGION a court holds, in darkened tag colors.
// Divs are pooled and reused; style writes are skipped when unchanged.
// EU4-style legibility: dark ink over a layered parchment halo. The halo /
// small-caps / weight styling lives in styles.css (.mlabel, .mlabel-prov,
// .mlabel-tag, .mlabel-part) and is applied once per div, never per frame.
//
// The nation tier used to be one label per court at the owner-weighted centroid
// of everything it owned. That is the centre of mass of a realm, and the centre
// of mass of a realm in two places is in neither of them: a Judaea holding the
// Levant and Greece wrote JUDAEA across the open Mediterranean, over water it
// did not own, hundreds of miles from either half. Averaging cannot be rescued
// with a nudge — the answer is not to average across parts that are not one
// place. So the tier groups a court's ground by REGION (MAP_DATA.regions) and
// names each part it holds enough of: its own name over the region its seat is
// in, "[Adjective] [Region]" — Judaean Greece, Israeli Britain, Hasmonean Egypt
// — over the rest. Each part's anchor is then pinned to the biggest cell near
// that part's own centre of mass, so a label sits on the ground it names even
// when the part is a scatter of islands.

const PROV_LABEL_ZOOM = 1.1;
const FONT_STACK = "'Iowan Old Style','Palatino Linotype',Georgia,serif";
const PROV_SIZE_K = 0.062;  // raw font px = sqrt(areaPx) * zoom * K
const TAG_SIZE_K = 0.085;
const PROV_MIN_PX = 10.5;   // hide below this (raw px) — bumped for readability
const TAG_MIN_PX = 11.5;
const PART_MIN_PX = 13.5;   // two words need more ground than one to be worth drawing
const PART_SIZE_K = 0.85;   // …and less height, so the home name still reads as the country
const INK = 'rgba(43,32,21,0.92)';          // #2b2015-ish province ink
const INK_WASTE = 'rgba(66,57,42,0.55)';

const warned = new Set();
function warnOnce(key, ...msg) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn('[labels]', ...msg);
}

// province canon name -> region name. Built once per atlas object.
const regionIndexes = new WeakMap();
function regionIndex(MAP_DATA) {
  let index = regionIndexes.get(MAP_DATA);
  if (index) return index;
  index = new Map();
  for (const [region, members] of Object.entries((MAP_DATA && MAP_DATA.regions) || {})) {
    for (const name of members || []) index.set(name, region);
  }
  regionIndexes.set(MAP_DATA, index);
  return index;
}

// A court's adjective. Declared in DEFINES.TAGS (and re-declared by any chapter
// that renames the court — SPEC §139), because no rule derives Dutch from The
// Netherlands. The possessive is the fallback for a tag that never declared one.
function adjectiveOf(def, live, name) {
  const adj = (live && live.adj) || (def && def.adj);
  if (adj) return adj;
  return /s$/.test(name) ? name + "'" : name + "'s";
}

// The nation tier's placements, with no DOM in sight: one entry per region a
// court holds. `home` marks the part that carries the plain country name.
// Exported for the headless harness (smoke128). Recomputed every frame like
// the tier it replaced: measured at 0.077 ms over the 1948 board (307 cells,
// 59 parts), half a percent of a 60fps frame, so nothing is cached and nothing
// can go stale behind a conquest.
export function tagLabelParts(ctx, geom, MAP_DATA) {
  const out = [];
  const game = ctx && ctx.game;
  if (!game || !geom || !geom.areas || !geom.centroids) return out;
  const provs = game.provinces || [];
  const index = regionIndex(MAP_DATA);

  // 1. every court's ground, split by region.
  const byTag = new Map();
  for (let id = 1; id < provs.length; id++) {
    const p = provs[id];
    if (!p || p.impassable) continue;
    const tag = p.owner;
    if (!tag || tag === 'WASTE') continue;
    const a = geom.areas[id];
    const c = geom.centroids[id];
    if (!a || !c) continue;
    const canon = p.canon || p.name;
    let region = index.get(canon);
    if (!region) {
      // Data drift only: validateMapData warns at boot for any province in no
      // region. Stand it alone rather than folding it into somebody else's land.
      warnOnce('region-' + canon, `province '${canon}' belongs to no region`);
      region = canon;
    }
    let regions = byTag.get(tag);
    if (!regions) { regions = new Map(); byTag.set(tag, regions); }
    let part = regions.get(region);
    if (!part) { part = { region, a: 0, x: 0, y: 0, ids: [] }; regions.set(region, part); }
    part.a += a;
    part.x += c.x * a;
    part.y += c.y * a;
    part.ids.push(id);
  }

  const TAGS = (ctx.DEFINES && ctx.DEFINES.TAGS) || {};
  const tweaks = (ctx.bookmark && ctx.bookmark.tagTweaks) || {};
  for (const [tag, regions] of byTag) {
    const live = game.tags && game.tags[tag];
    const def = { ...(TAGS[tag] || {}), ...(tweaks[tag] || {}) };
    const name = (live && live.name) || def.name || tag;

    // Home: where the court's own name belongs. Declared first (Rome's seat is
    // the eastern command and Britain's is Cyprus — neither wants its name
    // written there), else the region its capital sits in, else — a court in
    // exile, or one whose homeland is entirely lost — the largest thing it holds.
    let home = '';
    if (def.homeRegion && regions.has(def.homeRegion)) home = def.homeRegion;
    if (!home && def.capital) {
      const seat = index.get(def.capital);
      if (seat && regions.has(seat)) home = seat;
    }
    if (!home) {
      let best = -1;
      for (const part of regions.values()) if (part.a > best) { best = part.a; home = part.region; }
    }

    let realm = 0;
    for (const part of regions.values()) realm += part.a;

    for (const part of regions.values()) {
      const cx = part.x / part.a;
      const cy = part.y / part.a;
      // The anchor cell: big, and near this part's centre of mass. Score falls
      // off over the part's own radius (area ≈ radius²), so a scatter picks its
      // mainland rather than an outlying island, and a compact part picks the
      // cell it was already pointing at.
      let anchor = part.ids[0];
      let best = -1;
      for (const id of part.ids) {
        const c = geom.centroids[id];
        const dx = c.x - cx;
        const dy = c.y - cy;
        const score = geom.areas[id] / (1 + (dx * dx + dy * dy) / part.a);
        if (score > best) { best = score; anchor = id; }
      }
      // …and the label goes AT that cell's own pixel-mass centroid, not at the
      // part's centre of mass and not blended toward it. A centre of mass is an
      // average, and an average of a coastline is water: measured over the eight
      // bookmarks' opening positions, the old whole-realm average sat in the sea
      // 19 times in 249; splitting by region and then keeping the centre of mass
      // (clamped into the anchor cell) still sat in it 13-20 times in 505; this
      // rule sat in it 0 times in 505. smoke128 holds that zero.
      const ac = geom.centroids[anchor];
      const isHome = part.region === home;
      out.push({
        tag,
        region: part.region,
        home: isHome,
        text: isHome ? name : adjectiveOf(def, live, name) + ' ' + part.region,
        x: ac.x,
        y: ac.y,
        area: part.a,
        realm,
        color: (live && live.color) || def.color || null,
      });
    }
  }
  return out;
}

export function createLabels(el, MAP_DATA, geom) {
  const pool = [];

  try {
    el.style.pointerEvents = 'none';
    el.style.overflow = 'hidden';
  } catch (e) { /* no DOM — nothing to label */ }

  function getDiv(i) {
    if (pool[i]) return pool[i];
    const d = document.createElement('div');
    // Static geometry inline (belt-and-braces); typography/halo via .mlabel-* classes.
    d.style.position = 'absolute';
    d.style.left = '0';
    d.style.top = '0';
    d.style.pointerEvents = 'none';
    d.style.whiteSpace = 'nowrap';
    d.style.fontFamily = FONT_STACK;
    d.style.userSelect = 'none';
    d.style.lineHeight = '1';
    d.className = 'mlabel';
    el.appendChild(d);
    pool[i] = d;
    return d;
  }

  // tier: 'prov' | 'tag' | 'part' — picks the once-per-div CSS class (halo, caps, weight).
  function place(i, text, sx, sy, fontPx, color, tier) {
    const d = getDiv(i);
    if (d._text !== text) { d.textContent = text; d._text = text; }
    const f = Math.round(fontPx * 10) / 10;
    if (d._font !== f) { d.style.fontSize = f + 'px'; d._font = f; }
    if (d._color !== color) { d.style.color = color; d._color = color; }
    if (d._tier !== tier) { d.className = 'mlabel mlabel-' + tier; d._tier = tier; }
    const tr = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -50%)`;
    if (d._tr !== tr) { d.style.transform = tr; d._tr = tr; } // avoid per-frame style invalidation when idle
    if (d._shown !== true) { d.style.display = 'block'; d._shown = true; }
  }

  function update(ctx, camera, mapmode) {
    let used = 0;
    try {
      if (ctx && ctx.game && camera) {
        const zoom = camera.zoom;
        const vw = camera.viewport.w;
        const vh = camera.viewport.h;
        const provs = ctx.game.provinces;
        const N = provs.length - 1;

        if (zoom >= PROV_LABEL_ZOOM) {
          // province names
          for (let id = 1; id <= N; id++) {
            const p = provs[id];
            if (!p || !p.name) continue;
            const c = geom.centroids[id];
            if (!c) continue;
            const raw = Math.sqrt(Math.max(1, geom.areas[id])) * zoom * PROV_SIZE_K;
            if (raw < PROV_MIN_PX) continue; // hidden below the readable floor
            const [sx, sy] = camera.mapToScreen(c.x, c.y);
            if (sx < -120 || sy < -60 || sx > vw + 120 || sy > vh + 60) continue;
            const color = p.impassable ? INK_WASTE : INK;
            place(used++, p.name, sx, sy, Math.min(22, raw), color, 'prov');
          }
        } else {
          // nation names: one per region a court holds. A foreign part is sized
          // by its own ground and must clear a higher floor — its label is two
          // words long and belongs only where there is room to read it. The home
          // name is sized by the REALM, tempered by the ground it stands on (the
          // geometric mean of the two): at the whole-map zoom Rome's Italy is
          // 10px of ground and would vanish while ROMAN GAUL printed beside it,
          // which is exactly backwards — a court's own name is the one label the
          // map cannot afford to drop first.
          for (const part of tagLabelParts(ctx, geom, MAP_DATA)) {
            const span = part.home
              ? Math.sqrt(Math.sqrt(part.area) * Math.sqrt(part.realm))
              : Math.sqrt(part.area);
            const raw = span * zoom * TAG_SIZE_K;
            if (raw < (part.home ? TAG_MIN_PX : PART_MIN_PX)) continue;
            const [sx, sy] = camera.mapToScreen(part.x, part.y);
            if (sx < -260 || sy < -80 || sx > vw + 260 || sy > vh + 80) continue;
            const col = part.color
              ? `rgba(${Math.round(part.color[0] * 0.42)},${Math.round(part.color[1] * 0.42)},${Math.round(part.color[2] * 0.42)},0.95)`
              : 'rgba(44,36,22,0.9)';
            const px = part.home
              ? Math.min(42, Math.max(12, raw))
              : Math.min(30, Math.max(12, raw * PART_SIZE_K));
            place(used++, part.text, sx, sy, px, col, part.home ? 'tag' : 'part');
          }
        }
      }
    } catch (e) {
      warnOnce('update-throw', 'update failed', e);
    }
    for (let i = used; i < pool.length; i++) {
      const d = pool[i];
      if (d && d._shown) { d.style.display = 'none'; d._shown = false; }
    }
  }

  return { update };
}
