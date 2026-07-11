// js/map/mapmodes.js — per-province color lookups for the six mapmodes. SPEC §5.4.
//
// Flags bitfield contract (shared with js/map/renderer.js — keep in sync):
//   bit0 (1)  = diagonal stripes of `secondary` over primary (occupation)
//   bit1 (2)  = gray cross-hatch (impassable wasteland)
//   bit2 (4)  = pulse the stripes (revolt brewing, unrest mode)
//   bits 3..7 = owner class index (position of the owner tag in DEFINES.TAGS key order,
//               +1, capped at 31). The renderer draws the 2px country border where the
//               class of adjacent provinces differs — so country borders stay correct in
//               every mapmode and after conquests, without extra API surface.

const GRAY = [128, 128, 128];
const DEV_LOW = [216, 210, 176];   // #d8d2b0
const DEV_HIGH = [30, 122, 46];    // #1e7a2e
const UNREST_QUIET = [151, 159, 141];
const UNREST_YELLOW = [214, 186, 46];
const UNREST_RED = [186, 32, 26];
const REVOLT_SECONDARY = [212, 28, 24];

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
  political: { relief: 0.55, flat: 0 },
  terrain: { relief: 1.0, flat: 0 },
  religion: { relief: 0.35, flat: 0 },
  culture: { relief: 0.35, flat: 0 },
  development: { relief: 0.3, flat: 0 },
  unrest: { relief: 0.3, flat: 0 },
};

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
  const tagKeys = Object.keys(TAGS);
  const tagClass = (t) => Math.min(31, tagKeys.indexOf(t) + 1); // unknown -> 0
  const tagColor = (t) =>
    (game.tags[t] && game.tags[t].color) || (TAGS[t] && TAGS[t].color) || GRAY;
  const wasteColor = (TAGS.WASTE && TAGS.WASTE.color) || [70, 66, 60];
  const cultureDisplay = mode === 'culture' ? buildCultureDisplay(DEFINES) : null;

  for (let id = 1; id <= N; id++) {
    const p = provs[id];
    if (!p) continue;
    let cA = GRAY;
    let cB = null;
    let fl = tagClass(p.owner) << 3;
    if (p.impassable) fl |= 2; // hatch in every mode

    switch (mode) {
      case 'political': {
        if (p.impassable) {
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
    }

    setRGB(primary, id, cA);
    setRGB(secondary, id, cB || cA);
    flags[id] = fl;
  }

  const p = MODE_PARAMS[mode];
  return { primary, secondary, flags, params: { relief: p.relief, flat: p.flat } };
}
