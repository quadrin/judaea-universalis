// js/map/labels.js — absolutely-positioned DOM labels in #labels-layer. SPEC §5.6.
// Zoom >= 1.1: province names at pixel-mass centroids, sized by sqrt(area)·zoom.
// Zoom <  1.1: nation names at owner-weighted centroids in darkened tag colors.
// Divs are pooled and reused; style writes are skipped when unchanged.
// EU4-style legibility: dark ink over a layered parchment halo. The halo /
// small-caps / weight styling lives in styles.css (.mlabel, .mlabel-prov,
// .mlabel-tag) and is applied once per div, never per frame.

const PROV_LABEL_ZOOM = 1.1;
const FONT_STACK = "'Iowan Old Style','Palatino Linotype',Georgia,serif";
const PROV_SIZE_K = 0.062;  // raw font px = sqrt(areaPx) * zoom * K
const TAG_SIZE_K = 0.085;
const PROV_MIN_PX = 10.5;   // hide below this (raw px) — bumped for readability
const TAG_MIN_PX = 11.5;
const INK = 'rgba(43,32,21,0.92)';          // #2b2015-ish province ink
const INK_WASTE = 'rgba(66,57,42,0.55)';

const warned = new Set();
function warnOnce(key, ...msg) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn('[labels]', ...msg);
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

  // tier: 'prov' | 'tag' — picks the once-per-div CSS class (halo, caps, weight).
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
          // Nation names, anchored on the realm's PRINCIPAL LANDMASS (SPEC
          // §173). The anchor used to be one area-weighted centroid over
          // every owned province, and the midpoint of an empire is mostly
          // water: 1948 Britain owns the home islands, Cyprus and Libya, and
          // BRITAIN floated in the Tyrrhenian sea between them; FRANCE
          // (métropole plus the Maghreb and the Fezzan) sat in the western
          // Mediterranean. Group each realm's provinces into connected
          // components by land adjacency; the principal one is chosen by
          // DEVELOPMENT, not by pixels — a realm is principally where its
          // people are, and by area alone the Marmarican desert out-labels
          // the home islands and the Sahara out-labels the Seine. The
          // capital's component takes precedence when it holds any real
          // share of the realm (a court is named where it is ruled from),
          // but Britain's static seat is Salamis on Cyprus, and a sliver
          // must not carry the name. Font size stays keyed to the WHOLE
          // realm and the anchor is the area centroid WITHIN the chosen
          // landmass, so a realm of one landmass (most of them, in most
          // eras) renders exactly as before.
          const ownProvs = new Map(); // tag -> [id]
          for (let id = 1; id <= N; id++) {
            const p = provs[id];
            if (!p || p.impassable) continue;
            const tag = p.owner;
            if (!tag || tag === 'WASTE') continue;
            if (!geom.areas[id] || !geom.centroids[id]) continue;
            let list = ownProvs.get(tag);
            if (!list) { list = []; ownProvs.set(tag, list); }
            list.push(id);
          }
          const TAGS = (ctx.DEFINES && ctx.DEFINES.TAGS) || {};
          // The seat's landmass takes the name only against a NEAR-TIE: it
          // must carry this share of the principal component's development.
          // Denmark is named at Copenhagen over the slightly-larger Jutland;
          // Britain is still named on the island and not at its static seat
          // on Cyprus, which holds a quarter of the realm's rolls and is
          // exactly the case a from-the-total threshold got wrong.
          const CAPITAL_TIE = 0.6;
          const devOf = (p) => (p && p.dev
            ? (p.dev.tax || 0) + (p.dev.prod || 0) + (p.dev.mp || 0) : 0);
          const compOf = new Int32Array(N + 1); // scratch: 0 = unvisited this tag
          for (const [tag, list] of ownProvs) {
            const info = ctx.game.tags[tag] || TAGS[tag];
            const name = (info && info.name) || tag;
            let total = 0;
            for (const id of list) total += geom.areas[id];
            const raw = Math.sqrt(total) * zoom * TAG_SIZE_K;
            if (raw < TAG_MIN_PX) continue;
            // Flood the realm's own provinces into components.
            for (const id of list) compOf[id] = 0;
            const comps = [];
            for (const seed of list) {
              if (compOf[seed]) continue;
              const comp = { a: 0, d: 0, x: 0, y: 0 };
              comps.push(comp);
              const mark = comps.length;
              const stack = [seed];
              compOf[seed] = mark;
              while (stack.length) {
                const id = stack.pop();
                const a = geom.areas[id];
                const c = geom.centroids[id];
                comp.a += a;
                comp.d += devOf(provs[id]);
                comp.x += c.x * a;
                comp.y += c.y * a;
                const nbs = geom.neighbors && geom.neighbors[id];
                if (!nbs) continue;
                for (const nb of nbs) {
                  if (compOf[nb] || !provs[nb] || provs[nb].owner !== tag) continue;
                  if (provs[nb].impassable || !geom.areas[nb] || !geom.centroids[nb]) continue;
                  compOf[nb] = mark;
                  stack.push(nb);
                }
              }
            }
            let best = comps[0];
            for (const comp of comps) {
              if (comp.d > best.d || (comp.d === best.d && comp.a > best.a)) best = comp;
            }
            try {
              const capName = (ctx.game.tags[tag] && ctx.game.tags[tag].dynamicCapital)
                || (ctx.tagDef ? ctx.tagDef(tag).capital : (TAGS[tag] || {}).capital);
              const capId = capName && ctx.provId ? ctx.provId(capName) : 0;
              // The seat must be the realm's OWN province: compOf is scratch
              // across tags, and a foreign capital (Britain's Salamis under
              // siege, a court in exile) must not read another realm's marks.
              const capOurs = capId && provs[capId] && provs[capId].owner === tag;
              const seat = capOurs && compOf[capId] ? comps[compOf[capId] - 1] : null;
              if (seat && seat.d >= best.d * CAPITAL_TIE) best = seat;
            } catch (e) { warnOnce('cap:' + tag, 'capital anchor failed for', tag, e); }
            if (!best || !best.a) continue;
            const [sx, sy] = camera.mapToScreen(best.x / best.a, best.y / best.a);
            if (sx < -260 || sy < -80 || sx > vw + 260 || sy > vh + 80) continue;
            const col = info && info.color
              ? `rgba(${Math.round(info.color[0] * 0.42)},${Math.round(info.color[1] * 0.42)},${Math.round(info.color[2] * 0.42)},0.95)`
              : 'rgba(44,36,22,0.9)';
            place(used++, name, sx, sy, Math.min(42, Math.max(12, raw)), col, 'tag');
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
