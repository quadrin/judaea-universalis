// js/map/mapmodes.js — per-province color lookups for the six mapmodes. SPEC §5.4.
//
// Flags bitfield contract (shared with js/map/renderer.js — keep in sync):
//   bit0 (1)  = diagonal stripes of `secondary` over primary (occupation)
//   bit1 (2)  = gray cross-hatch (uninhabited or impassable land)
//   bit2 (4)  = pulse the stripes (revolt brewing, unrest mode)
//   bits 3..7 = owner class index (position of the owner tag in DEFINES.TAGS key order,
//               +1, capped at 31). The renderer draws the 2px country border where the
//               class of adjacent provinces differs — so country borders stay correct in
//               every mapmode and after conquests, without extra API surface.

import { tradeIndex } from '../data/trade.js';
import { largestMinorityFaith } from '../sim/population.js';
import { dominantEstate, seatsFor } from '../sim/estates.js';
import { communityOf, openAt, shutBy } from '../data/diaspora.js';
import { communityRegard } from '../sim/diaspora.js';
const GRAY = [128, 128, 128];
const DEV_LOW = [216, 210, 176];   // #d8d2b0
const DEV_HIGH = [30, 122, 46];    // #1e7a2e
const UNREST_QUIET = [151, 159, 141];
const UNREST_YELLOW = [214, 186, 46];
const UNREST_RED = [186, 32, 26];
const REVOLT_SECONDARY = [212, 28, 24];
// Estates mode (SPEC §167): one colour per SEAT at a court, not per party name.
const ESTATE_PALETTE = [[164, 116, 56], [92, 120, 150], [132, 88, 132], [86, 140, 96], [176, 88, 72], [120, 120, 108]];
const ESTATE_PALE = [214, 208, 188];
const ESTATE_NONE = [150, 144, 128];
// Diaspora mode (SPEC §175). The ramp runs from the cold end — a community
// that has been asked too much of, or never courted — to the warm one, so a
// glance says who would answer a letter. Size decides how far off the
// parchment a community is pushed, which is why Alexandria at five reads
// heavier than Corinth at one even when both are lukewarm.
const DIA_PALE = [222, 214, 190];   // the rest of the world
const DIA_COLD = [92, 118, 156];
const DIA_WARM = [212, 168, 56];
const DIA_SHUT = [138, 128, 112];   // a window that has closed
const DIA_OURS = [236, 226, 196];   // the community is inside our own borders

const warned = new Set();
function warnOnce(key, ...msg) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn('[mapmodes]', ...msg);
}

function lerp3(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function setRGB(arr, id, c) {
  arr[id * 4] = c[0];
  arr[id * 4 + 1] = c[1];
  arr[id * 4 + 2] = c[2];
  arr[id * 4 + 3] = 255;
}

// culture color mixed 70/30 with the average hue of its culture group
function buildCultureDisplay(DEFINES) {
  const cultures = (DEFINES && DEFINES.CULTURES) || {};
  const groupSum = {};
  for (const key of Object.keys(cultures)) {
    const c = cultures[key];
    if (!c || !c.color) continue;
    const g = c.group || '_';
    if (!groupSum[g]) groupSum[g] = [0, 0, 0, 0];
    groupSum[g][0] += c.color[0];
    groupSum[g][1] += c.color[1];
    groupSum[g][2] += c.color[2];
    groupSum[g][3]++;
  }
  const out = new Map();
  for (const key of Object.keys(cultures)) {
    const c = cultures[key];
    if (!c || !c.color) continue;
    const s = groupSum[c.group || '_'];
    const avg = s && s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : c.color;
    out.set(key, lerp3(c.color, avg, 0.3));
  }
  return out;
}

const MODE_PARAMS = {
  trade: { relief: 0.35, flat: 0 },
  political: { relief: 0.55, flat: 0 },
  terrain: { relief: 1.0, flat: 0 },
  religion: { relief: 0.35, flat: 0 },
  culture: { relief: 0.35, flat: 0 },
  development: { relief: 0.3, flat: 0 },
  unrest: { relief: 0.3, flat: 0 },
  diplomatic: { relief: 0.35, flat: 0 },
  estates: { relief: 0.3, flat: 0 },
  diaspora: { relief: 0.3, flat: 0 },
};

// Diplomatic mode palette (colors relative to the player).
const DIP_ALLY = [86, 148, 86];
const DIP_ENEMY = [182, 52, 46];
const DIP_TRUCE = [206, 178, 84];
const DIP_NEUTRAL = [158, 148, 128];
const CLAIM_GOLD = [230, 192, 64];

export function computeMapmodeColors(ctx, mode) {
  const game = ctx.game;
  const DEFINES = ctx.DEFINES;
  const provs = game.provinces;
  const N = provs.length - 1;

  if (!MODE_PARAMS[mode]) {
    warnOnce('mode:' + mode, `unknown mapmode "${mode}" — falling back to political`);
    mode = 'political';
  }

  const primary = new Uint8Array((N + 1) * 4);
  const secondary = new Uint8Array((N + 1) * 4);
  const flags = new Uint8Array(N + 1);

  const TAGS = (DEFINES && DEFINES.TAGS) || {};
  const tradeIdx = mode === 'trade' ? tradeIndex() : null;
  // Owner class rides lookA's ALPHA byte (renderer contract, SPEC §173:
  // differing classes draw the country border; 255 is WASTE). It was a 5-bit
  // field in the flags byte until v5.4's catalog outgrew 31 keys, and then
  // indexing the LIVE game's tags outgrew 31 too — a §173 era seats nearly
  // fifty courts, and the Math.min clamp fused every court past the thirtieth
  // into one class: the Cherusci and the Chatti touched with no line between
  // them. Alpha is 8 bits, uploaded all along, and was read by nobody.
  const liveKeys = Object.keys(game.tags || {});
  const tagClass = (t) => {
    if (t === 'WASTE') return 255;
    const i = liveKeys.indexOf(t);
    return i >= 0 ? Math.min(254, i + 1) : 0; // unknown -> 0
  };
  const tagColor = (t) =>
    (game.tags[t] && game.tags[t].color) || (TAGS[t] && TAGS[t].color) || GRAY;
  const wasteColor = (TAGS.WASTE && TAGS.WASTE.color) || [70, 66, 60];
  const cultureDisplay = mode === 'culture' ? buildCultureDisplay(DEFINES) : null;

  // Diplomatic mode: classify every tag once, relative to the player.
  let dipColorOf = null;
  if (mode === 'diplomatic') {
    const me = game.playerTag;
    const mine = game.tags[me] || {};
    const myColor = tagColor(me);
    const cache = new Map();
    dipColorOf = (tag) => {
      if (cache.has(tag)) return cache.get(tag);
      const t = game.tags[tag];
      let c = DIP_NEUTRAL;
      if (tag === me) c = myColor;
      else if (t && t.overlord === me) c = lerp3(myColor, [255, 255, 255], 0.35); // our clients
      else if (t && ((mine.atWarWith || []).indexOf(tag) >= 0)) c = DIP_ENEMY;
      else if (t && (mine.overlord === tag || (mine.overlord && t.overlord === mine.overlord))) {
        c = lerp3(tagColor(mine.overlord), [255, 255, 255], 0.3); // our overlord's house
      } else if (t && ((mine.allies || []).indexOf(tag) >= 0 || (t.allies || []).indexOf(me) >= 0)) c = DIP_ALLY;
      else if (t && game.truces) {
        const key = me < tag ? me + '|' + tag : tag + '|' + me;
        const tr = game.truces[key];
        const active = tr && (game.date.y < tr.y || (game.date.y === tr.y && game.date.m < tr.m));
        if (active) c = DIP_TRUCE;
      }
      cache.set(tag, c);
      return c;
    };
  }
  const myClaims = (game.tags[game.playerTag] && game.tags[game.playerTag].claims) || [];
  // One seat-list lookup per TAG, not per province: `seatsFor` walks the
  // registered sources and the estates mode asks it for every cell on the map.
  // Diaspora mode reads only the content package and the province's own saved
  // record — no ctx.helpers, no sim call — so it is safe on the bare
  // {game, DEFINES} context two suites build. One Map lookup per cell rather
  // than a linear scan of twenty entries, because this runs on every sim day.
  const year = (game.date && Number.isFinite(game.date.y)) ? game.date.y : 0;
  const diaCache = mode === 'diaspora' ? new Map() : null;
  const diaOf = (p) => {
    if (!diaCache) return null;
    const key = p.canon || p.name;
    if (diaCache.has(key)) return diaCache.get(key);
    const d = communityOf(key) || communityOf(p.name);
    diaCache.set(key, d);
    return d;
  };
  const seatCache = new Map();
  const seatsOf = (tag) => {
    if (seatCache.has(tag)) return seatCache.get(tag);
    let s = null;
    try { s = seatsFor(ctx, tag); } catch (e) { warnOnce('seats:' + tag, 'seat lookup failed', e); }
    seatCache.set(tag, s);
    return s;
  };

  for (let id = 1; id <= N; id++) {
    const p = provs[id];
    if (!p) continue;
    let cA = GRAY;
    let cB = null;
    let fl = 0;
    if (p.impassable || p.habitation === 'uninhabited') fl |= 2; // hatch in every mode

    switch (mode) {
      case 'political': {
        if (p.owner === 'WASTE') {
          cA = wasteColor;
        } else {
          cA = tagColor(p.owner);
          if (p.controller && p.controller !== p.owner) {
            cB = tagColor(p.controller);
            fl |= 1;
          }
        }
        break;
      }
      case 'trade': {
        // Routes glow in their own colors over muted parchment; chokepoints
        // shine brighter. Occupied/besieged stops show the stripes.
        const stops = tradeIdx.get(p.name);
        if (stops && stops.length) {
          const best = stops.find((x) => x.isChokepoint) || stops[0];
          cA = best.isChokepoint ? lerp3(best.route.color, [255, 240, 190], 0.35) : best.route.color;
          if (p.controller !== p.owner || p.siege) {
            cB = [120, 120, 120];
            fl |= 1;
          }
        } else {
          cA = [196, 188, 168];
        }
        break;
      }
      case 'terrain': {
        const t = DEFINES.TERRAINS && DEFINES.TERRAINS[p.terrain];
        if (t && t.color) cA = t.color;
        else warnOnce('terr:' + p.terrain, `unknown terrain "${p.terrain}" on ${p.name}`);
        break;
      }
      case 'religion': {
        const r = DEFINES.RELIGIONS && DEFINES.RELIGIONS[p.religion];
        if (r && r.color) cA = r.color;
        else warnOnce('rel:' + p.religion, `unknown religion "${p.religion}" on ${p.name}`);
        // A faith that is spreading without a state behind it (SPEC §104)
        // moves shares for decades before it moves a label. The mode stripes
        // the largest minority community once it is a fifth of the province,
        // so the drift is visible while it is still happening — and so the
        // last Jewish quarter of a Christianized city stays on the map.
        const minor = largestMinorityFaith(p);
        if (minor && minor.share >= 0.2) {
          const mr = DEFINES.RELIGIONS && DEFINES.RELIGIONS[minor.r];
          if (mr && mr.color) { cB = mr.color; fl |= 1; }
        }
        break;
      }
      case 'culture': {
        const c = cultureDisplay.get(p.culture);
        if (c) cA = c;
        else warnOnce('cul:' + p.culture, `unknown culture "${p.culture}" on ${p.name}`);
        break;
      }
      case 'development': {
        const dev = p.dev || {};
        const total = (dev.tax || 0) + (dev.prod || 0) + (dev.mp || 0);
        const lvl = Math.min(4, Math.floor(total / 6)); // 5-step ramp
        cA = lerp3(DEV_LOW, DEV_HIGH, lvl / 4);
        break;
      }
      case 'unrest': {
        const u = p.unrest || 0;
        if (u <= 0.25) cA = UNREST_QUIET;
        else if (u < 3) cA = lerp3(UNREST_QUIET, UNREST_YELLOW, (u - 0.25) / 2.75);
        else cA = lerp3(UNREST_YELLOW, UNREST_RED, Math.min(1, (u - 3) / 7));
        if ((p.revoltProgress || 0) > 0 && !p.impassable) {
          cB = REVOLT_SECONDARY;
          fl |= 1 | 4; // striped + pulsing
        }
        break;
      }
      case 'diplomatic': {
        if (p.owner === 'WASTE') {
          cA = wasteColor;
        } else {
          cA = dipColorOf(p.owner);
          if (myClaims.indexOf(id) >= 0) { // our claims, gold-striped
            cB = CLAIM_GOLD;
            fl |= 1;
          } else if (p.controller && p.controller !== p.owner) {
            cB = dipColorOf(p.controller);
            fl |= 1;
          }
        }
        break;
      }
      // The dispersion (SPEC §175). Twenty communities from Cyrene to Ecbatana
      // and, before this mode existed, the only way to find one was to click
      // the exact province it lived in — so the largest Jewish population on
      // earth was a panel block you had to already know about. Now the map
      // says where they are, how big, and how they regard this crown.
      case 'diaspora': {
        const d = diaOf(p);
        if (!d) { cA = DIA_PALE; break; }
        if (shutBy(d, year)) {
          // What has been lost is drawn as lost. A campaign that reaches 117
          // watches Alexandria, Memphis, Cyrene, Berenice and Cyprus go out in
          // one war, and the map should carry that rather than quietly
          // forgetting they were ever there.
          cA = DIA_SHUT;
          fl |= 2;
          break;
        }
        if (!openAt(d, year)) { cA = DIA_PALE; break; }
        // The live figure once this crown has had dealings with them (SPEC
        // §216 files standing per crown, so a guest paints its OWN warmth);
        // entry's own `start` is what it was before anybody wrote to them, and
        // is the honest answer for a crown the dispersion has no dealings with.
        const mine = communityRegard(p.dia, ctx.game.playerTag);
        const st = mine === null ? d.start : mine;
        const warmth = Math.max(0, Math.min(1, st / 100));
        // 1 → 0.44, 5 → 1.0. The top of the ramp must LAND on 1 rather than
        // overshoot it: at 0.4 + 0.15·size, sizes 4 and 5 both clamped to full
        // and Alexandria — the largest community on earth — read exactly like
        // Antioch.
        const weight = 0.3 + 0.14 * Math.max(1, Math.min(5, d.size | 0));
        cA = lerp3(DIA_PALE, lerp3(DIA_COLD, DIA_WARM, warmth), weight);
        // Ours now: the sim drops a community the moment its province becomes
        // the player's, which on the map would simply be a cell that stopped
        // existing. Stripe it instead — they are still there, they are just
        // not somebody else's hostages any more.
        if (p.owner === game.playerTag) { cB = DIA_OURS; fl |= 1; }
        break;
      }
      // Whose ground this is (SPEC §167): the party of its ruler's court that
      // is strongest on this kind of land. The palette is per-COURT rather
      // than global — a court seats two or three parties, so the first party
      // at every court gets the first colour — which means the mode reads as
      // "who runs this province" inside each realm and does not pretend the
      // Seleucid Phalanx and the Judaean Hasideans are the same thing because
      // they happen to sit in the same seat.
      case 'estates': {
        if (p.owner === 'WASTE' || !p.owner) {
          cA = ESTATE_NONE;
        } else {
          const seats = seatsOf(p.owner);
          const dom = seats && seats.length ? dominantEstate(ctx, p, seats) : null;
          if (!dom) {
            cA = ESTATE_NONE;
          } else {
            const i = seats.findIndex((d) => d && d.id === dom.id);
            const base = ESTATE_PALETTE[(i < 0 ? 0 : i) % ESTATE_PALETTE.length];
            // Strength shades it: a party that barely holds this ground reads
            // pale, one that owns it outright reads full.
            cA = lerp3(ESTATE_PALE, base, Math.max(0, Math.min(1, (dom.v - 25) / 55)));
            if (p.controller && p.controller !== p.owner) {
              cB = [120, 120, 120];
              fl |= 1;
            }
          }
        }
        break;
      }
    }

    // While the peace dialog is open, the provinces on the table pulse gold in
    // every mapmode (ui.js sets game.ui.peaceHighlight to the demandable ids);
    // the ones already written into the deal (game.ui.peaceSelected) burn
    // solid gold so the terms can be read straight off the map.
    const hl = game.ui && game.ui.peaceHighlight;
    if (Array.isArray(hl) && hl.indexOf(id) >= 0 && !p.impassable) {
      cB = CLAIM_GOLD;
      fl |= 1 | 4;
      const sel = game.ui.peaceSelected;
      if (Array.isArray(sel) && sel.indexOf(id) >= 0) cA = CLAIM_GOLD;
    }

    setRGB(primary, id, cA);
    setRGB(secondary, id, cB || cA);
    // Owner class in lookA's alpha (renderer contract, SPEC §173): the
    // country-border test compares this byte between neighboring provinces.
    primary[id * 4 + 3] = tagClass(p.owner);
    flags[id] = fl;
  }

  const p = MODE_PARAMS[mode];
  return { primary, secondary, flags, params: { relief: p.relief, flat: p.flat } };
}
