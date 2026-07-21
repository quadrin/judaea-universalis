// js/ui/icons.js — shared hand-drawn inline-SVG icon set (antiquity motifs).
// One design language everywhere: 24x24 viewBox, stroke currentColor,
// stroke-width 1.6, round caps/joins, minimal fills. Sized via CSS classes;
// color flows from the surrounding text color (gold/parchment palette).

export const ICONS = {
  // --- mapmodes -----------------------------------------------------------
  // Political: temple front (pediment + columns)
  temple:
    '<path d="M4.5 9.5 12 4.5l7.5 5"/>' +
    '<path d="M5.5 9.5h13"/>' +
    '<path d="M6 12.5h12"/>' +
    '<path d="M7.5 12.5v6M12 12.5v6M16.5 12.5v6"/>' +
    '<path d="M5 21h14"/>',
  // Terrain: mountain ridge
  mountain:
    '<path d="M3.5 19 9 8.5l3.5 6.3"/>' +
    '<path d="M10.6 19l4.6-8 5.3 8"/>' +
    '<path d="M3.5 19h17"/>' +
    '<path d="M7.6 11.2l1.4 1.6 1.3-1.6"/>',
  // Religion: altar with flame (generic)
  altar:
    '<path d="M12 4.2c1.7 1.6 2.6 3 2.6 4.4a2.6 2.6 0 1 1-5.2 0c0-1.4.9-2.8 2.6-4.4Z"/>' +
    '<path d="M7.2 14.2h9.6"/>' +
    '<path d="M9 14.2v5.3M15 14.2v5.3"/>' +
    '<path d="M7.2 19.5h9.6"/>',
  // Culture: amphora
  amphora:
    '<path d="M9.5 3.5h5"/>' +
    '<path d="M10.3 3.5c.3 1.7-.3 2.9-1.7 3.9C7 8.6 6.4 10.1 6.4 11.8c0 3.3 2.3 5.6 5.6 5.6s5.6-2.3 5.6-5.6c0-1.7-.6-3.2-2.2-4.4-1.4-1-2-2.2-1.7-3.9"/>' +
    '<path d="M12 17.4v2.1"/>' +
    '<path d="M9.7 20.5h4.6"/>' +
    '<path d="M8.6 6.4c-1.5-.3-2.4.3-2.4 1.3 0 .7.4 1.2 1.2 1.5"/>' +
    '<path d="M15.4 6.4c1.5-.3 2.4.3 2.4 1.3 0 .7-.4 1.2-1.2 1.5"/>',
  // Development: stepped masonry courses
  bricks:
    '<path d="M4 20h16"/>' +
    '<path d="M5.2 20v-3.5h13.6V20"/>' +
    '<path d="M12 16.5V20"/>' +
    '<path d="M7.4 16.5V13h9.2v3.5"/>' +
    '<path d="M9.6 13V9.6h4.8V13"/>',
  // Unrest / war: flame
  flame:
    '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',

  // --- topbar ---------------------------------------------------------------
  // Treasury: coin stack + coin face
  coins:
    '<ellipse cx="9.5" cy="6" rx="5" ry="2.3"/>' +
    '<path d="M4.5 6v4.1c0 1.1 1.7 2 4 2.2"/>' +
    '<path d="M4.5 10.1v4.1c0 1.1 1.7 2 4 2.2"/>' +
    '<path d="M14.5 6v2.6"/>' +
    '<circle cx="15.5" cy="15" r="4.8"/>' +
    '<circle cx="15.5" cy="15" r="1.9"/>',
  // Manpower: crossed spears
  spears:
    '<path d="M4.8 19.2 15.9 8.1"/>' +
    '<path d="M19.4 4.6l-.5 3-2.9.6.6-2.9 2.8-.7Z"/>' +
    '<path d="M19.2 19.2 8.1 8.1"/>' +
    '<path d="M4.6 4.6l.7 2.8 2.9.6-.6-2.9-3-.5Z"/>',
  // Stability: balance scales
  scales:
    '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>' +
    '<path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>' +
    '<path d="M7 21h10"/>' +
    '<path d="M12 3v18"/>' +
    '<path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  // Legitimacy / victory: laurel wreath
  laurel:
    '<path d="M6.4 5.3C4.4 7 3.3 9.4 3.3 12c0 4.5 3.3 8.2 7.6 8.7"/>' +
    '<path d="M17.6 5.3c2 1.7 3.1 4.1 3.1 6.7 0 4.5-3.3 8.2-7.6 8.7"/>' +
    '<path d="M3.8 9.2 1.6 8.5M3.5 12.5l-2.2.3M4.5 15.8l-2 1M6.7 18.5l-1.5 1.7"/>' +
    '<path d="M20.2 9.2l2.2-.7M20.5 12.5l2.2.3M19.5 15.8l2 1M17.3 18.5l1.5 1.7"/>',
  // Save: quill
  quill:
    '<path d="M19.8 4.2c-4.9.4-8.6 2-10.9 5.1-1.4 1.9-2.3 4.6-2.6 8.2 3.6-.3 6.3-1.2 8.2-2.6 3.1-2.3 4.7-6 5.3-10.7Z"/>' +
    '<path d="M4.2 19.8C9 15 13.6 10.4 18 6"/>',
  play:
    '<path d="M8.2 5.8a.55.55 0 0 1 .84-.47l9.9 6.2a.55.55 0 0 1 0 .94l-9.9 6.2a.55.55 0 0 1-.84-.47Z" fill="currentColor" stroke="none"/>',
  pause:
    '<rect x="7.2" y="5.2" width="3.2" height="13.6" rx="1.1" fill="currentColor" stroke="none"/>' +
    '<rect x="13.6" y="5.2" width="3.2" height="13.6" rx="1.1" fill="currentColor" stroke="none"/>',
  plus:
    '<path d="M12 5.5v13M5.5 12h13"/>',

  // --- outliner / battle ----------------------------------------------------
  swords:
    '<path d="M14.5 17.5 3 6V3h3l11.5 11.5"/>' +
    '<path d="M13 19l6-6"/>' +
    '<path d="M16 16l4 4"/>' +
    '<path d="M19 21l2-2"/>' +
    '<path d="M14.5 6.5 18 3h3v3l-3.5 3.5"/>' +
    '<path d="M5 14l4 4"/>' +
    '<path d="M7 17l-3 3"/>' +
    '<path d="M3 19l2 2"/>',
  tower:
    '<path d="M8 17V7h8v10"/>' +
    '<path d="M8 7V4.5h2.2v1.6h3.6V4.5H16V7"/>' +
    '<path d="M7 17h10"/>' +
    '<circle cx="9.4" cy="19.2" r="1.6"/>' +
    '<circle cx="14.6" cy="19.2" r="1.6"/>' +
    '<path d="M10.9 17v-3.4h2.2V17"/>' +
    '<path d="M10.9 9.7h2.2"/>',
  dove:
    '<path d="M19.3 5.1 22 6.2l-2.3 1.2"/>' +
    '<path d="M19.7 7.6a2.8 2.8 0 1 0-5.4-1c-.4 3.3-2 5.4-5 6.4 1.2.7 2.5 1 3.9.9-1 1.7-2.7 2.9-5.3 3.5 5.4 1.6 9.5.1 11.2-3.9.8-1.9 1-3.9.6-5.9Z" fill="currentColor" fill-opacity="0.12"/>' +
    '<circle cx="17.3" cy="5.9" r="0.5" fill="currentColor" stroke="none"/>',
  retreat:
    '<path d="M9 6.5 3.5 12l5.5 5.5"/>' +
    '<path d="M3.5 12h11a6 6 0 0 1 6 6v1.5"/>',
  alert:
    '<path d="M12 4.3 21.2 19.7H2.8Z"/>' +
    '<path d="M12 9.8v4.4"/>' +
    '<path d="M12 17.1h.01"/>',

  // --- province panel ---------------------------------------------------------
  grain:
    '<path d="M12 20.5V6.8"/>' +
    '<path d="M12 6.8c-.3-1.8.4-3.2 2-4.2.4 1.8-.3 3.2-2 4.2Z"/>' +
    '<path d="M12 10.6c-2 .3-3.5-.4-4.4-2 1.9-.5 3.4 0 4.4 2Z"/>' +
    '<path d="M12 10.6c2 .3 3.5-.4 4.4-2-1.9-.5-3.4 0-4.4 2Z"/>' +
    '<path d="M12 14.2c-2 .3-3.5-.4-4.4-2 1.9-.5 3.4 0 4.4 2Z"/>' +
    '<path d="M12 14.2c2 .3 3.5-.4 4.4-2-1.9-.5-3.4 0-4.4 2Z"/>',
  flag:
    '<path d="M6 21V4.5"/>' +
    '<path d="M6 5.5h10.6L14 9l2.6 3.5H6"/>',
  shield:
    '<path d="M12 3.4c2.7 1.2 5.2 1.9 7.4 1.9v.9c0 6.2-2.5 10.5-7.4 13.2-4.9-2.7-7.4-7-7.4-13.2v-.9c2.2 0 4.7-.7 7.4-1.9Z"/>' +
    '<circle cx="12" cy="10.8" r="2.6"/>',
  shieldCrack:
    '<path d="M12 3.4c2.7 1.2 5.2 1.9 7.4 1.9v.9c0 6.2-2.5 10.5-7.4 13.2-4.9-2.7-7.4-7-7.4-13.2v-.9c2.2 0 4.7-.7 7.4-1.9Z"/>' +
    '<path d="M12.6 4.8 10.9 8.4l2.8 1.4-2.2 4.1 1.9 1-1.5 3.2"/>',
  horseshoe:
    '<path d="M6.8 20.2v-2.4c-1.6-1.7-2.5-3.9-2.5-6.3C4.3 7 7.6 3.8 12 3.8s7.7 3.2 7.7 7.7c0 2.4-.9 4.6-2.5 6.3v2.4"/>' +
    '<path d="M5.3 20.2h3M15.7 20.2h3"/>' +
    '<path d="M6.6 14.2h.01M6 10.5h.01M7.8 7.2h.01M12 5.9h.01M16.2 7.2h.01M18 10.5h.01M17.4 14.2h.01"/>',
  star8:
    '<path d="M20.8 12 15.33 13.38 18.22 18.22 13.38 15.33 12 20.8 10.62 15.33 5.78 18.22 8.67 13.38 3.2 12 8.67 10.62 5.78 5.78 10.62 8.67 12 3.2 13.38 8.67 18.22 5.78 15.33 10.62Z" fill="currentColor" fill-opacity="0.15"/>',
  star4:
    '<path d="M12 3.5 14.1 9.9 20.5 12 14.1 14.1 12 20.5 9.9 14.1 3.5 12 9.9 9.9Z" fill="currentColor" fill-opacity="0.15"/>',
  xmark:
    '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',

  // --- buildings (province panel) ----------------------------------------------
  // Market: stall with scalloped awning, counter and wares
  market:
    '<path d="M4.5 9.5 6 4.8h12l1.5 4.7"/>' +
    '<path d="M4.5 9.5c0 1.15.85 1.9 1.9 1.9s1.85-.75 1.85-1.9c0 1.15.85 1.9 1.9 1.9S12 10.65 12 9.5c0 1.15.85 1.9 1.9 1.9s1.85-.75 1.85-1.9c0 1.15.85 1.9 1.9 1.9s1.85-.75 1.85-1.9"/>' +
    '<path d="M6.2 11.6v7.9M17.8 11.6v7.9"/>' +
    '<path d="M6.2 15.2h11.6"/>' +
    '<circle cx="10.2" cy="17.6" r="1.3"/>' +
    '<circle cx="13.8" cy="17.6" r="1.3"/>',
  // Granary: amphorae racked inside a storehouse
  granary:
    '<path d="M4.3 10 12 4.6l7.7 5.4"/>' +
    '<path d="M5.8 9.4v10.1M18.2 9.4v10.1"/>' +
    '<path d="M4.5 19.5h15"/>' +
    '<path d="M8.6 11.3h2.2"/>' +
    '<path d="M8.9 11.3c.2.8-.1 1.4-.7 1.9-.6.5-.9 1.1-.9 1.9 0 1.5.9 2.4 2.4 2.4s2.4-.9 2.4-2.4c0-.8-.3-1.4-.9-1.9-.6-.5-.9-1.1-.7-1.9"/>' +
    '<path d="M13.4 12.9h1.9"/>' +
    '<path d="M13.6 12.9c.2.7-.1 1.2-.6 1.6-.5.4-.7.9-.7 1.6 0 1.3.8 2.1 2 2.1s2-.8 2-2.1c0-.7-.2-1.2-.7-1.6-.5-.4-.8-.9-.6-1.6"/>',
  // Walls: crenellated curtain wall with masonry courses
  walls:
    '<path d="M4.5 19.5V10h3V7.5h3V10h3V7.5h3V10h3v9.5"/>' +
    '<path d="M4.5 19.5h15"/>' +
    '<path d="M4.5 13.2h15M4.5 16.4h15"/>' +
    '<path d="M12 13.2v3.2M8.2 16.4v3.1M15.8 16.4v3.1"/>',
  // Shrine: aedicula — pediment on two columns, flame within
  shrine:
    '<path d="M5.3 8.6 12 4.4l6.7 4.2"/>' +
    '<path d="M6.6 8.6v8.6M17.4 8.6v8.6"/>' +
    '<path d="M5.4 17.2h13.2M6.2 19.5h11.6"/>' +
    '<path d="M12 9.9c1.1 1.05 1.65 2 1.65 2.9a1.65 1.65 0 1 1-3.3 0c0-.9.55-1.85 1.65-2.9Z"/>',
  // Shipyard: slipway, hull ribs and a simple lifting crane
  shipyard:
    '<path d="M4 20h16M6 17.5h12l-2 2.5H8Z"/>' +
    '<path d="M7 17.5V9h8M15 9V5h3M15 9l4 4"/>' +
    '<path d="M10 17.5v-5M13 17.5v-5"/>',
  // Merchantman: square sail over a broad civilian hull
  ship:
    '<path d="M12 4v11M12 5.2 6.5 8v5H12M12 6l5 2.4V13h-5"/>' +
    '<path d="M3.8 15h16.4l-2.5 4H7Z"/>' +
    '<path d="M4 21c1.4-.8 2.8-.8 4.2 0 1.4.8 2.8.8 4.2 0 1.4-.8 2.8-.8 4.2 0 1.1.6 2.2.7 3.3.2"/>',

  // --- army actions (outliner) --------------------------------------------------
  // Split army: one column branching into two arrows
  split:
    '<path d="M12 20.5v-7"/>' +
    '<path d="M12 13.5c0-3-1.9-4.6-4.9-4.6H5.9"/>' +
    '<path d="M12 13.5c0-3 1.9-4.6 4.9-4.6h1.2"/>' +
    '<path d="M8.3 6.3 5.5 8.9l2.8 2.6"/>' +
    '<path d="M15.7 6.3l2.8 2.6-2.8 2.6"/>',
  // Hire general: crested helmet
  helmet:
    '<path d="M6.3 18.6v-6.2c0-3.6 2.4-5.9 5.7-5.9s5.7 2.3 5.7 5.9v6.2"/>' +
    '<path d="M9.6 18.6v-4.9h4.8v4.9"/>' +
    '<path d="M6.3 15h3.3M14.4 15h3.3"/>' +
    '<path d="M6.8 7C7.9 3.9 9.6 2.3 12 2.3s4.1 1.6 5.2 4.7"/>' +
    '<path d="M9.3 4.5 8.5 3.2M12 3.6V2.1M14.7 4.5l.8-1.3"/>',

  // --- loans (topbar) -------------------------------------------------------------
  // Borrow: coin with a down-arrow (talents flowing in)
  borrow:
    '<circle cx="12" cy="8.3" r="4.9"/>' +
    '<circle cx="12" cy="8.3" r="1.9"/>' +
    '<path d="M12 15v6"/>' +
    '<path d="M9.2 18.4 12 21.2l2.8-2.8"/>',
  // Repay: coin with an up-arrow (talents flowing out)
  repay:
    '<circle cx="12" cy="15.7" r="4.9"/>' +
    '<circle cx="12" cy="15.7" r="1.9"/>' +
    '<path d="M12 9V3"/>' +
    '<path d="M9.2 5.6 12 2.8l2.8 2.8"/>',

  // --- toasts / modals --------------------------------------------------------
  scroll:
    '<path d="M19 17V5a2 2 0 0 0-2-2H4"/>' +
    '<path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/>',
  // Oil lamp (defeat): bowl with spout flame, loop handle, small foot
  lamp:
    '<path d="M4.6 13.3h12.8c-.5 3.2-2.6 4.8-6.4 4.8s-5.9-1.6-6.4-4.8Z"/>' +
    '<path d="M17.4 13.3c1.7-.4 2.6-1.2 2.6-2.3 0-.7-.4-1.2-1.2-1.3"/>' +
    '<path d="M6.3 8.9c1 .9 1.5 1.8 1.5 2.6a1.6 1.6 0 1 1-3.2 0c0-.8.5-1.7 1.7-2.6Z"/>' +
    '<path d="M12 18.1v2.5"/>' +
    '<path d="M9.5 20.6h6"/>',
  // Aircraft (SPEC §29 air power): swept wings, fuselage, tailplane
  plane:
    '<path d="M12 3.5v7"/>' +
    '<path d="M12 10.5 3.5 15v2.2l8.5-2.6 8.5 2.6V15Z"/>' +
    '<path d="M12 14.6v4.4"/>' +
    '<path d="M9.4 20.2 12 19l2.6 1.2"/>',
};

// --- country flag emblems (v2) -----------------------------------------------
// Rich two-tone insignia meant to read at 22-34px over the tag-color field:
// filled parchment silhouettes with gold accents, a dark outline for contrast,
// and thin interior detail lines. Same 24x24 hand as ICONS.
const FP = '#e8dcc0';              // parchment silhouette fill
const FG = '#e6c554';              // gold accent fill
const FO = 'rgba(20,16,11,0.55)';  // dark outline ink
const S = `stroke="${FO}" stroke-linecap="round" stroke-linejoin="round"`;
const SIL = `fill="${FP}" ${S} stroke-width="0.9"`;   // parchment shape
const ACC = `fill="${FG}" ${S} stroke-width="0.8"`;   // gold shape
const DET = `fill="none" ${S} stroke-width="0.7"`;    // interior detail line

// --- emblem geometry ----------------------------------------------------------
// Proper N-point stars and the interlocked triangles of a hexagram beat
// hand-plotted approximations at chip size. Angles start at 12 o'clock so
// every star stands point-up.
function starPath(cx, cy, points, R, r) {
  const out = [];
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = -Math.PI / 2 + (Math.PI * i) / points;
    out.push((cx + rad * Math.cos(a)).toFixed(2) + ' ' + (cy + rad * Math.sin(a)).toFixed(2));
  }
  return 'M' + out.join('L') + 'Z';
}
const star5 = (cx, cy, R, fill) => `<path d="${starPath(cx, cy, 5, R, R * 0.38)}" fill="${fill}" stroke="none"/>`;
const star7 = (cx, cy, R, fill) => `<path d="${starPath(cx, cy, 7, R, R * 0.55)}" fill="${fill}" stroke="none"/>`;
// One equilateral triangle of the Star of David; `down` flips it. The two
// triangles share a center — stroke them dark-under-gold (or flat blue for
// Israel) and the hexagram reads clean at 22px.
function triPath(cx, cy, R, down) {
  const p = [];
  for (let i = 0; i < 3; i++) {
    const a = (down ? Math.PI / 2 : -Math.PI / 2) + (i * 2 * Math.PI) / 3;
    p.push((cx + R * Math.cos(a)).toFixed(2) + ' ' + (cy + R * Math.sin(a)).toFixed(2));
  }
  return 'M' + p.join('L') + 'Z';
}
const hexagram = (cx, cy, R, ink, w) =>
  `<path d="${triPath(cx, cy, R, false)}${triPath(cx, cy, R, true)}" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linejoin="miter"/>`;
// The seven-branched menorah: three semicircular arms nested each side of
// the shaft, every branch rising to the same lamp line (shared by ATG).
const MENORAH =
  [6.5, 4.5, 2.5].map((r) => `M${12 - r} 6.4A${r} ${r} 0 0 0 ${12 + r} 6.4`).join('')
  + 'M12 6.4V16.9';
const MENORAH_LAMPS = [-6.5, -4.5, -2.5, 0, 2.5, 4.5, 6.5]
  .map((dx) => `<circle cx="${12 + dx}" cy="5.2" r="0.8" ${ACC}/>`).join('');

export const FLAGS = {
  // Rome: the legionary aquila — feathered wings raised beside the head,
  // hooked gold beak, tail fanned over the gold perch bar.
  ROM:
    `<rect x="4.4" y="19" width="15.2" height="1.9" rx="0.9" ${ACC}/>` +
    `<path d="M3.5 4.4c3.2.6 5.5 1.8 7 3.7 1.2 1.6 1.6 3.5 1 5.9l-1.4-1.7-1.2 1.1-1-3.3-1.6.9-.3-3.5-1.6.7Z" ${SIL}/>` +
    `<path d="M20.5 4.4c-3.2.6-5.5 1.8-7 3.7-1.2 1.6-1.6 3.5-1 5.9l1.4-1.7 1.2 1.1 1-3.3 1.6.9.3-3.5 1.6.7Z" ${SIL}/>` +
    `<path d="M12 6.9c1.4 1 2.1 2.6 2.1 4.7 0 1.9-.5 3.5-1.5 4.9h-1.2c-1-1.4-1.5-3-1.5-4.9 0-2.1.7-3.7 2.1-4.7Z" ${SIL}/>` +
    `<path d="M9.9 16.2 12 19.3l2.1-3.1Z" ${SIL}/>` +
    `<path d="M12 2.7c1 0 1.7.7 1.7 1.7 0 .6-.3 1.2-.8 1.5l-.1 1.3h-1.6l-.1-1.3c-.5-.3-.8-.9-.8-1.5 0-1 .7-1.7 1.7-1.7Z" ${SIL}/>` +
    `<path d="M13.5 3.5c1 0 1.8.4 2.3 1.1-.7.6-1.5.8-2.4.6Z" ${ACC}/>` +
    `<circle cx="11.5" cy="4.2" r="0.4" fill="${FO}" stroke="none"/>` +
    `<path d="M10.6 11.7C9 10.9 7.6 9.7 6.5 8.2M13.4 11.7c1.6-.8 3-2 4.1-3.5" ${DET}/>`,
  // Judaea: the seven-branched menorah of the Temple — parchment branches
  // over the blue field, seven gold lamps level along the top, the splayed
  // tripod foot of the lampstand. Distinct from Antigonus' coin die (ATG:
  // gold branches, stepped foot), so the two menorah banners never blur
  // when Herod's Judaea and the last Hasmonean share a map.
  JUD:
    `<path d="${MENORAH}" fill="none" stroke="${FO}" stroke-width="2.7" stroke-linecap="round"/>` +
    `<path d="${MENORAH}" fill="none" stroke="${FP}" stroke-width="1.5" stroke-linecap="round"/>` +
    MENORAH_LAMPS +
    `<path d="M12 16.9v1M12 17.9 9.3 20M12 17.9 14.7 20M12 17.9V20" fill="none" stroke="${FO}" stroke-width="2.5" stroke-linecap="round"/>` +
    `<path d="M12 16.9v1M12 17.9 9.3 20M12 17.9 14.7 20M12 17.9V20" fill="none" stroke="${FP}" stroke-width="1.3" stroke-linecap="round"/>`,
  // Hasmoneans: crossed double cornucopiae of the prutot, pomegranate between.
  HAS:
    `<path d="M11.6 19.6C8 18.5 5.9 16 5.5 12.4c-.2-2 .4-3.8 1.8-5.4l2.2 1.9c-.9 1.2-1.2 2.6-.9 4.2.4 2.5 1.6 4.4 3.6 5.7Z" ${SIL}/>` +
    `<path d="M12.4 19.6c3.6-1.1 5.7-3.6 6.1-7.2.2-2-.4-3.8-1.8-5.4l-2.2 1.9c.9 1.2 1.2 2.6.9 4.2-.4 2.5-1.6 4.4-3.6 5.7Z" ${SIL}/>` +
    `<circle cx="8.2" cy="7.3" r="1.6" ${ACC}/>` +
    `<circle cx="15.8" cy="7.3" r="1.6" ${ACC}/>` +
    `<circle cx="12" cy="10" r="2.1" ${ACC}/>` +
    `<path d="M11 8 12 6.4 13 8" ${DET}/>` +
    `<path d="M7.5 9.6c-.5 1.1-.6 2.3-.3 3.7M16.5 9.6c.5 1.1.6 2.3.3 3.7" ${DET}/>`,
  // Seleucids: the dynastic anchor of Seleucus I, gold ring and stock.
  SEL:
    `<circle cx="12" cy="4.6" r="1.5" fill="none" stroke="${FO}" stroke-width="2.6"/>` +
    `<circle cx="12" cy="4.6" r="1.5" fill="none" stroke="${FG}" stroke-width="1.3"/>` +
    `<path d="M11.1 6.7h1.8v11h-1.8Z" ${SIL}/>` +
    `<rect x="7.3" y="8.6" width="9.4" height="1.7" rx="0.85" ${ACC}/>` +
    `<path d="M12 20.1c-3.1-.3-5.4-1.9-6.8-4.8l2.6-1c1 2 2.4 3.1 4.2 3.5 1.8-.4 3.2-1.5 4.2-3.5l2.6 1c-1.4 2.9-3.7 4.5-6.8 4.8Z" ${SIL}/>`,
  // Ptolemies: the eagle on the thunderbolt (tetradrachm reverse) — gold
  // raptor hunched over the bolt, beak hooking down, the wing sweeping up
  // behind the shoulders.
  PTO:
    `<path d="M3.9 19.2 7.6 17.8 6.8 19.2h10.4l-.8-1.4 3.7 1.4-3.7 1.4.8-1.4H6.8l.8 1.4Z" ${ACC}/>` +
    `<path d="M12.6 7.3c2.3.2 4 1.3 5 3.3.8 1.6 1 3.4.6 5.5-1.3-.7-2.3-1.6-3-2.7l-.5 2.4-1.9-1.3Z" ${SIL}/>` +
    `<path d="M11.5 4.3c1 0 1.8.7 1.8 1.7 0 .5-.2.9-.5 1.3.9 1.3 1.4 3.1 1.3 5.3-.1 2.1-.6 3.9-1.6 5.2h-1.9c-1.1-1.7-1.6-3.8-1.4-6.1.1-1.4.5-2.7 1.1-3.9-.4-.3-.6-.8-.6-1.3 0-1 .8-1.7 1.8-1.7Z" ${ACC}/>` +
    `<path d="M9.9 5c-.9-.2-1.7.1-2.3.8.7.6 1.5.7 2.3.5l-.5 1.2 1.3-.9Z" ${ACC}/>` +
    `<circle cx="11.2" cy="5.6" r="0.4" fill="${FO}" stroke="none"/>` +
    `<path d="M10.9 17.8v1.2M13.1 17.8v1.2" ${DET}/>`,
  // Parthia: the strung recurve bow and arrow of the Arsacid drachms.
  PAR:
    `<path d="M15.2 3.4c-5 1.9-7.5 4.8-7.5 8.6s2.5 6.7 7.5 8.6c.7.3 1.2.7 1.6 1.3l1.2-.9c-.5-.8-1.2-1.4-2.1-1.8-4.3-1.7-6.4-4.1-6.4-7.2s2.1-5.5 6.4-7.2c.9-.4 1.6-1 2.1-1.8L16.8 2.1c-.4.6-.9 1-1.6 1.3Z" ${SIL}/>` +
    `<path d="M17.4 3.2v17.6" ${DET}/>` +
    `<path d="M7.9 11.4h9v1.2h-9Z" ${ACC}/>` +
    `<path d="M3.7 12l4.6-1.9v3.8Z" ${ACC}/>`,
  // Herod's Judaea: the anchor of the Herodian coinage.
  HER:
    `<path d="M12 4.2c.9 0 1.6.7 1.6 1.6S12.9 7.4 12 7.4s-1.6-.7-1.6-1.6.7-1.6 1.6-1.6Zm0 1a.6.6 0 100 1.2.6.6 0 000-1.2Z" ${ACC}/>` +
    `<path d="M11.3 7.4h1.4v10h-1.4Z" ${SIL}/>` +
    `<path d="M8.2 9.4h7.6v1.4H8.2Z" ${SIL}/>` +
    `<path d="M12 20.4c-3-.9-4.9-2.7-5.7-5.4l1.7-.5c.6 2 2 3.4 4 4.1 2-.7 3.4-2.1 4-4.1l1.7.5c-.8 2.7-2.7 4.5-5.7 5.4Z" ${SIL}/>`,
  // Antigonus' Judaea: the seven-branched menorah of his last coins — drawn
  // whole this time: three round arms nested each side of the shaft, seven
  // lamps level along the top, the stepped foot of the coin dies beneath.
  ATG:
    `<path d="${MENORAH}" fill="none" stroke="${FO}" stroke-width="2.6" stroke-linecap="round"/>` +
    `<path d="${MENORAH}" fill="none" stroke="${FG}" stroke-width="1.35" stroke-linecap="round"/>` +
    MENORAH_LAMPS +
    `<path d="M9.6 16.9h4.8v1.4H9.6Z" ${SIL}/>` +
    `<path d="M8 18.3h8v1.7H8Z" ${ACC}/>`,

  // Agrippa II: the royal diadem — gold band, parchment gem and hanging ties.
  AGR:
    `<path d="M4.1 13.2c2.3-2.4 5-3.6 7.9-3.6s5.6 1.2 7.9 3.6l-1 1.8c-2-2.2-4.3-3.3-6.9-3.3s-4.9 1.1-6.9 3.3Z" ${ACC}/>` +
    `<circle cx="12" cy="10.4" r="1.7" ${SIL}/>` +
    `<path d="M4.9 14.1c-.8 1.7-.9 3.5-.3 5.4l1.5-.7c-.5-1.5-.4-2.9.2-4.2Z" ${SIL}/>` +
    `<path d="M19.1 14.1c.8 1.7.9 3.5.3 5.4l-1.5-.7c.5-1.5.4-2.9-.2-4.2Z" ${SIL}/>`,
  // Rebels: a tattered banner on a bare gold pole.
  REB:
    `<rect x="5.9" y="3.4" width="1.5" height="17.4" rx="0.7" ${ACC}/>` +
    `<path d="M7.4 4.9h10.2l-1.5 1.8 1.6 1.5-2 .8 1.1 2-2.5-.6-1.3 1.8-1-1.6H7.4Z" ${SIL}/>` +
    `<path d="M9.7 5.6v4.2" ${DET}/>`,
  // Byzantium: the chi-rho of the labarum, gold on parchment roundel.
  BYZ:
    `<circle cx="12" cy="12" r="8.2" ${SIL}/>` +
    `<path d="M11.2 6h1.6v12h-1.6Z" ${ACC}/>` +
    `<path d="M12 6.6c1.7 0 2.9 1 2.9 2.4S13.7 11.4 12 11.4h-.8V9.9h.8c.8 0 1.3-.3 1.3-.9s-.5-.9-1.3-.9Z" ${ACC}/>` +
    `<path d="M7.6 8.2 16.4 17M16.4 8.2 7.6 17" ${DET}/>`,
  // Sasanian Persia: the fire altar of the drachm reverses.
  SAS:
    `<path d="M12 3.6c1 1.5 1.5 2.7 1.5 3.7 0 1.1-.6 1.9-1.5 2.3-.9-.4-1.5-1.2-1.5-2.3 0-1 .5-2.2 1.5-3.7Z" ${ACC}/>` +
    `<path d="M8.6 10.2h6.8v1.6H8.6Z" ${SIL}/>` +
    `<path d="M10.4 11.8h3.2v5h-3.2Z" ${SIL}/>` +
    `<path d="M8 16.8h8v1.6H8Z" ${SIL}/>` +
    `<path d="M6.4 18.4h11.2v1.6H6.4Z" ${ACC}/>`,
  // Israel: the real flag — white field, two blue stripes, blue Star of David.
  ISR:
    `<rect x="0.6" y="0.6" width="22.8" height="22.8" rx="3.2" fill="#f2f4f4" stroke="none"/>` +
    `<rect x="0.6" y="3.4" width="22.8" height="2.5" fill="#0038b8" stroke="none"/>` +
    `<rect x="0.6" y="18.1" width="22.8" height="2.5" fill="#0038b8" stroke="none"/>` +
    hexagram(12, 12, 4.7, '#0038b8', 1.25),
  // Nabataea: the crow-stepped facade of Petra's tombs, an urn above.
  NAB:
    `<path d="M4 18.6h16v1.8H4Z" ${ACC}/>` +
    `<path d="M5 18.6v-3.4h2.4v-3h2.4V8.9h4.4v3.3h2.4v3h2.4v3.4Z" ${SIL}/>` +
    `<path d="M12 3.6c1.3 0 2.1.8 2.1 2 0 .9-.5 1.6-1.2 1.9v1h-1.8v-1c-.7-.3-1.2-1-1.2-1.9 0-1.2.8-2 2.1-2Z" ${ACC}/>`,
  // Armenia: the twin peaks of Ararat under the Artaxiad star.
  ARM:
    `<path d="M3.6 19 9 9.6l2.6 4.4L14.6 8l5.8 11Z" ${SIL}/>` +
    `<path d="M9 9.6 7.4 12.4h3.2Z M14.6 8l-1.8 3.4h3.6Z" ${ACC}/>` +
    `<path d="M12 2.8l.8 1.7 1.9.3-1.4 1.3.3 1.9-1.6-.9-1.6.9.3-1.9-1.4-1.3 1.9-.3Z" ${ACC}/>`,
  // Hyrcanus: the palm branch of the high-priestly coins — paired fronds
  // on a straight stem over a gold base.
  HYR:
    `<path d="M11.2 19.2V8h1.6v11.2Z" ${SIL}/>` +
    `<path d="M11.6 8.4C9.7 7.6 8.8 6.2 8.8 4.1c2.1.6 3.2 2 3.2 4.3Z" ${SIL}/>` +
    `<path d="M12.4 8.4c1.9-.8 2.8-2.2 2.8-4.3-2.1.6-3.2 2-3.2 4.3Z" ${SIL}/>` +
    `<path d="M11.6 11.6c-2.5-.5-4-1.7-4.7-3.7 2.6.1 4.2 1.4 4.7 3.7Z" ${SIL}/>` +
    `<path d="M12.4 11.6c2.5-.5 4-1.7 4.7-3.7-2.6.1-4.2 1.4-4.7 3.7Z" ${SIL}/>` +
    `<path d="M11.6 14.8c-2.9-.4-4.7-1.5-5.5-3.4 2.9 0 4.7 1.2 5.5 3.4Z" ${SIL}/>` +
    `<path d="M12.4 14.8c2.9-.4 4.7-1.5 5.5-3.4-2.9 0-4.7 1.2-5.5 3.4Z" ${SIL}/>` +
    `<rect x="8.4" y="19" width="7.2" height="1.9" rx="0.9" ${ACC}/>`,
  // Aristobulus: the usurper's diadem over a bared sword.
  ARI:
    `<path d="M5.4 9.8c2.1-2 4.3-3 6.6-3s4.5 1 6.6 3l-.9 1.6c-1.8-1.8-3.7-2.7-5.7-2.7s-3.9.9-5.7 2.7Z" ${ACC}/>` +
    `<circle cx="12" cy="7.8" r="1.3" ${SIL}/>` +
    `<path d="M11.2 12h1.6v6.4l-.8 1.8-.8-1.8Z" ${SIL}/>` +
    `<path d="M8.6 13.4h6.8v1.4H8.6Z" ${ACC}/>`,
  // Osrhoene: the crescent and star of the Edessan coins.
  OSR:
    `<path d="M13.8 5.4a7 7 0 100 13.2 7.8 7.8 0 010-13.2Z" ${SIL}/>` +
    `<path d="M15.4 9.6l.7 1.5 1.7.2-1.2 1.2.3 1.7-1.5-.8-1.5.8.3-1.7-1.2-1.2 1.7-.2Z" ${ACC}/>`,
  // Adiabene: the royal tiara of the converted house.
  ADI:
    `<path d="M6.4 17h11.2v1.8H6.4Z" ${ACC}/>` +
    `<path d="M7 17c0-4.4 1.6-7.6 5-9.6 3.4 2 5 5.2 5 9.6Z" ${SIL}/>` +
    `<path d="M12 9.4l.7 1.5 1.6.2-1.2 1.1.3 1.6-1.4-.7-1.4.7.3-1.6-1.2-1.1 1.6-.2Z" ${ACC}/>`,
  // Characene: a merchant hull riding the Gulf swell.
  CHX:
    `<path d="M4.6 14.2h14.8l-2.2 3.6H6.8Z" ${SIL}/>` +
    `<path d="M11.2 5.2h1.4v9h-1.4Z" ${ACC}/>` +
    `<path d="M12.6 5.6c2.6.6 4.2 2 4.8 4.2l-4.8.4Z" ${SIL}/>` +
    `<path d="M4.2 19.6c1.4-1 2.8-1 4.2 0 1.4 1 2.8 1 4.2 0 1.4-1 2.8-1 4.2 0 1.2.9 2.4 1 3.6.3" ${DET}/>`,
  // Ghassanids: the cross of the phylarchs over a lance pennon.
  GHA:
    `<path d="M11.1 4h1.8v9h-1.8Z" ${ACC}/>` +
    `<path d="M8 6.6h8v1.8H8Z" ${ACC}/>` +
    `<path d="M9 14.6h6l4 2.6-4 2.6H9Z" ${SIL}/>`,
  // Hellas (v5.4): the laurel wreath — two branches meeting under an open
  // crown, timeless enough for the leagues of 167 and the kingdom of 1948.
  GRC:
    `<path d="M12 20.2c-3.9-.9-6.4-3.4-7.2-7.2-.4-2 0-4.2 1-6.2.5 2.2 1.3 4 2.5 5.6 1.2 1.6 2.5 2.7 3.7 3.4Z" ${SIL}/>` +
    `<path d="M12 20.2c3.9-.9 6.4-3.4 7.2-7.2.4-2 0-4.2-1-6.2-.5 2.2-1.3 4-2.5 5.6-1.2 1.6-2.5 2.7-3.7 3.4Z" ${SIL}/>` +
    `<path d="M6.6 8.2c1 .1 1.8.6 2.3 1.4-.9.3-1.8.2-2.6-.3ZM7.6 11.4c1 .1 1.8.6 2.3 1.4-.9.3-1.8.2-2.6-.3ZM17.4 8.2c-1 .1-1.8.6-2.3 1.4.9.3 1.8.2 2.6-.3ZM16.4 11.4c-1 .1-1.8.6-2.3 1.4.9.3 1.8.2 2.6-.3Z" ${ACC}/>` +
    `<circle cx="12" cy="20" r="0.9" ${ACC}/>`,
  // Pontus (v5.4): the star and crescent of the Mithridatic royal badge,
  // straight off the Sinope drachms.
  PNT:
    `<path d="M13.6 6.2a6.9 6.9 0 100 11.6 7.8 7.8 0 010-11.6Z" ${SIL}/>` +
    `<path d="M15.4 9.6l.8 1.9 2 .2-1.5 1.4.4 2-1.7-1-1.7 1 .4-2-1.5-1.4 2-.2Z" ${ACC}/>`,
  // Egypt 1948: the green royal flag — crescent and three stars.
  EGY:
    `<rect x="0.6" y="0.6" width="22.8" height="22.8" rx="3.2" fill="#1a6a3c" stroke="none"/>` +
    `<path d="M10.5 5.4a7.4 7.4 0 100 13.2 8.3 8.3 0 010-13.2Z" fill="#f2f4f4" stroke="none"/>` +
    star5(15.6, 8.4, 1.8, '#f2f4f4') +
    star5(17.4, 12, 1.8, '#f2f4f4') +
    star5(15.6, 15.6, 1.8, '#f2f4f4'),
  // Transjordan: the Hashemite tricolor, red chevron, seven-pointed star.
  JOR:
    `<rect x="0.6" y="0.6" width="22.8" height="7.6" fill="#141414" stroke="none"/>` +
    `<rect x="0.6" y="8.2" width="22.8" height="7.6" fill="#f2f4f4" stroke="none"/>` +
    `<rect x="0.6" y="15.8" width="22.8" height="7.6" fill="#1a6a3c" stroke="none"/>` +
    `<path d="M0.6 0.6 13.4 12 0.6 23.4Z" fill="#b5342c" stroke="none"/>` +
    star7(5.4, 12, 2.3, '#f2f4f4'),
  // Syria 1948: green-white-black, three red stars.
  SYR:
    `<rect x="0.6" y="0.6" width="22.8" height="7.6" fill="#1a6a3c" stroke="none"/>` +
    `<rect x="0.6" y="8.2" width="22.8" height="7.6" fill="#f2f4f4" stroke="none"/>` +
    `<rect x="0.6" y="15.8" width="22.8" height="7.6" fill="#141414" stroke="none"/>` +
    star5(6.4, 12, 1.7, '#b5342c') +
    star5(12, 12, 1.7, '#b5342c') +
    star5(17.6, 12, 1.7, '#b5342c'),
  // Lebanon: red-white-red and the cedar — three tiers of boughs on a trunk.
  LEB:
    `<rect x="0.6" y="0.6" width="22.8" height="5.6" fill="#b5342c" stroke="none"/>` +
    `<rect x="0.6" y="6.2" width="22.8" height="11.6" fill="#f2f4f4" stroke="none"/>` +
    `<rect x="0.6" y="17.8" width="22.8" height="5.6" fill="#b5342c" stroke="none"/>` +
    `<path d="M12 6.4l3.1 3.2h-1.7l2.5 2.6h-1.9l2.6 2.7h-4v2h-1.2v-2h-4l2.6-2.7H8.1l2.5-2.6H8.9Z" fill="#2c7a3f" stroke="none"/>`,
  // Iraq 1948: black-white-green, red trapezoid, two seven-pointed stars.
  IRQ:
    `<rect x="0.6" y="0.6" width="22.8" height="7.6" fill="#141414" stroke="none"/>` +
    `<rect x="0.6" y="8.2" width="22.8" height="7.6" fill="#f2f4f4" stroke="none"/>` +
    `<rect x="0.6" y="15.8" width="22.8" height="7.6" fill="#1a6a3c" stroke="none"/>` +
    `<path d="M0.6 0.6h6.8L11 12 7.4 23.4H0.6Z" fill="#b5342c" stroke="none"/>` +
    star7(4.6, 8.4, 1.8, '#f2f4f4') +
    star7(4.6, 15.6, 1.8, '#f2f4f4'),
  // Turkey: the red flag, white crescent and star.
  TUR:
    `<rect x="0.6" y="0.6" width="22.8" height="22.8" rx="3.2" fill="#c8102e" stroke="none"/>` +
    `<path d="M11.5 4.9a7.2 7.2 0 100 14.2 8 8 0 010-14.2Z" fill="#f2f4f4" stroke="none"/>` +
    star5(16.1, 12, 2.2, '#f2f4f4'),
  // Saudi Arabia: green, the sword beneath the creed (a calligraphy band).
  SAU:
    `<rect x="0.6" y="0.6" width="22.8" height="22.8" rx="3.2" fill="#1a6a3c" stroke="none"/>` +
    `<path d="M4.5 8.2c1.4-1.2 2.6.6 4 .1s2.2-1.4 3.6-.8 2 1.2 3.4.7 2-1.3 3.5-.4" fill="none" stroke="#f2f4f4" stroke-width="1.2" stroke-linecap="round"/>` +
    `<path d="M4.5 11.2c1.4-1.2 2.6.6 4 .1s2.2-1.4 3.6-.8 2 1.2 3.4.7 2-1.3 3.5-.4" fill="none" stroke="#f2f4f4" stroke-width="1.2" stroke-linecap="round"/>` +
    `<path d="M4.6 16.6h13l1.8 1-1.8 1h-13Z" fill="#f2f4f4" stroke="none"/>`,
  // Iran: green-white-red, the sun of the lion-and-sun in gold.
  IRN:
    `<rect x="0.6" y="0.6" width="22.8" height="7.6" fill="#2c7a3f" stroke="none"/>` +
    `<rect x="0.6" y="8.2" width="22.8" height="7.6" fill="#f2f4f4" stroke="none"/>` +
    `<rect x="0.6" y="15.8" width="22.8" height="7.6" fill="#b5342c" stroke="none"/>` +
    `<circle cx="12" cy="12" r="2.6" fill="#d9a520" stroke="none"/>` +
    `<path d="M12 7.6v1.6M12 14.8v1.6M8.2 12h-1.6M17.4 12h-1.6M9.3 9.3 8.2 8.2M15.8 15.8l-1.1-1.1M14.7 9.3l1.1-1.1M8.2 15.8l1.1-1.1" stroke="#d9a520" stroke-width="1" fill="none"/>`,
  // Britain: the Union Flag, near enough for a chip.
  UK:
    `<rect x="0.6" y="0.6" width="22.8" height="22.8" rx="3.2" fill="#1d3c6e" stroke="none"/>` +
    `<path d="M0.6 0.6 23.4 23.4M23.4 0.6 0.6 23.4" stroke="#f2f4f4" stroke-width="4.4" fill="none"/>` +
    `<path d="M0.6 0.6 23.4 23.4M23.4 0.6 0.6 23.4" stroke="#b5342c" stroke-width="1.8" fill="none"/>` +
    `<path d="M12 0.6v22.8M0.6 12h22.8" stroke="#f2f4f4" stroke-width="6" fill="none"/>` +
    `<path d="M12 0.6v22.8M0.6 12h22.8" stroke="#b5342c" stroke-width="3" fill="none"/>`,
  // Italy (v5.4): il Tricolore, full-field.
  ITA:
    `<rect x="0.6" y="0.6" width="7.6" height="22.8" fill="#1a7a44" stroke="none"/>` +
    `<rect x="8.2" y="0.6" width="7.6" height="22.8" fill="#f2f4f4" stroke="none"/>` +
    `<rect x="15.8" y="0.6" width="7.6" height="22.8" fill="#b5342c" stroke="none"/>`,
  // Kingdom of Israel (formable): the Star of David whole and centered —
  // two interlocked equilateral triangles on one heart, gold over the deep
  // blue field, the crown of David above.
  MLI:
    `<path d="M6.7 8.4 7.6 4.6l2.5 2.1L12 3.2l1.9 3.5 2.5-2.1.9 3.8Z" ${ACC}/>` +
    `<rect x="6.4" y="8.4" width="11.2" height="1.6" rx="0.8" ${ACC}/>` +
    hexagram(12, 15.9, 5.1, FO, 2.5) +
    hexagram(12, 15.9, 5.1, FG, 1.3),
  // United Arab Republic (formable): the two-star pan-Arab tricolor.
  UAR:
    `<rect x="0.6" y="0.6" width="22.8" height="7.6" fill="#b5342c" stroke="none"/>` +
    `<rect x="0.6" y="8.2" width="22.8" height="7.6" fill="#f2f4f4" stroke="none"/>` +
    `<rect x="0.6" y="15.8" width="22.8" height="7.6" fill="#141414" stroke="none"/>` +
    star5(8.4, 12, 1.9, '#2c7a3f') +
    star5(15.6, 12, 1.9, '#2c7a3f'),
  // Rashidun Caliphate: the liwa of the conquest — the standard on its
  // lance, the creed running across the cloth in the scribes' hand.
  RSH:
    `<path d="M6.3 1.9 7.5 4.4H5.1Z" ${ACC}/>` +
    `<rect x="5.5" y="4.4" width="1.6" height="16.4" rx="0.8" ${ACC}/>` +
    `<path d="M7.1 5.6h11.8l-2.2 3.7 2.2 3.7H7.1Z" ${SIL}/>` +
    `<path d="M8.6 8c.7-.9 1.3.4 2 .1s.8-1 1.6-.6 1 .7 1.8.3 1-.9 1.7-.3" ${DET}/>` +
    `<path d="M8.6 10.6c.7-.9 1.3.4 2 .1s.8-1 1.6-.6 1 .7 1.8.3" ${DET}/>`,
  // Egypt after the Free Officers (event rebrand, 1952): the Arab
  // Liberation tricolor, the gold eagle of the revolution at its heart.
  EGY_REP:
    `<rect x="0.6" y="0.6" width="22.8" height="7.6" fill="#b5342c" stroke="none"/>` +
    `<rect x="0.6" y="8.2" width="22.8" height="7.6" fill="#f2f4f4" stroke="none"/>` +
    `<rect x="0.6" y="15.8" width="22.8" height="7.6" fill="#141414" stroke="none"/>` +
    `<circle cx="12" cy="9.1" r="0.9" fill="#d9a520" stroke="none"/>` +
    `<path d="M12.7 8.7l1.2.5-1.2.5Z" fill="#d9a520" stroke="none"/>` +
    `<path d="M12 9.9c.9.4 1.4 1.2 1.4 2.2 0 .7-.2 1.4-.5 2.1h-1.8c-.3-.7-.5-1.4-.5-2.1 0-1 .5-1.8 1.4-2.2Z" fill="#d9a520" stroke="none"/>` +
    `<path d="M10.6 10.6c-1.6-.4-2.9-.1-4 .9.6 1 1.5 1.6 2.7 1.8l-.5 1 1.8-.5Z" fill="#d9a520" stroke="none"/>` +
    `<path d="M13.4 10.6c1.6-.4 2.9-.1 4 .9-.6 1-1.5 1.6-2.7 1.8l.5 1-1.8-.5Z" fill="#d9a520" stroke="none"/>` +
    `<path d="M10.4 14.6h3.2l-.4 1H10.8Z" fill="#d9a520" stroke="none"/>`,
  // Iraq after the July revolution (event rebrand, 1958): Qasim's upright
  // tricolor, the red star of the republic on a gold boss.
  IRQ_REP:
    `<rect x="0.6" y="0.6" width="7.6" height="22.8" fill="#141414" stroke="none"/>` +
    `<rect x="8.2" y="0.6" width="7.6" height="22.8" fill="#f2f4f4" stroke="none"/>` +
    `<rect x="15.8" y="0.6" width="7.6" height="22.8" fill="#1a6a3c" stroke="none"/>` +
    `<path d="${starPath(12, 12, 8, 4.8, 2.4)}" fill="#b5342c" stroke="none"/>` +
    `<circle cx="12" cy="12" r="1.5" fill="#d9a520" stroke="none"/>`,
};

function escText(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Country chip: rounded rect in the tag's color (CSS .fchip layers a subtle
// top-sheen gradient over the background-color set here), thin gold border,
// two-tone emblem centered on the field. Falls back to the 3-letter tag when
// no emblem exists. `size` is the chip's edge in px. With `link` the chip
// becomes a click target: a document-level handler (ui.js) opens that
// nation's realm panel wherever such a chip is clicked.
// Pass the live `game` to honor a realm's runtime identity: a revolution may
// rebrand a state in place (t.flag names a FLAGS variant, t.name/t.color the
// new style) — the Free Officers' republic flies EGY_REP over the same tag.
export function flagChip(tag, DEFINES, size = 20, link = false, game = null) {
  const t = String(tag || '');
  const def = (DEFINES && DEFINES.TAGS && DEFINES.TAGS[t]) || {};
  const live = (game && game.tags && game.tags[t]) || null;
  const c = live && Array.isArray(live.color) && live.color.length >= 3 ? live.color
    : Array.isArray(def.color) && def.color.length >= 3 ? def.color : [110, 100, 82];
  const s = Math.max(12, Math.round(Number(size) || 20));
  // Own-key lookups only: tag and t.flag ride saves, and a hand-edited file
  // must fall back to the base emblem (or the text chip), never surface a
  // prototype-chain member as the SVG body.
  const own = (k) => (typeof k === 'string' && Object.prototype.hasOwnProperty.call(FLAGS, k) ? FLAGS[k] : null);
  const body = (live && own(live.flag)) || own(t);
  const dispName = (live && live.name) || def.name || t;
  const inner = body
    ? `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`
    : `<span class="fchip-abbr">${escText(t || '—')}</span>`;
  const linked = link && t && t !== 'REB' && t !== 'WASTE';
  const linkAttrs = linked
    ? ` data-open-tag="${escText(t)}" role="button" data-tt="${escText(dispName + ' — see their court')}"`
    : '';
  return `<span class="fchip${linked ? ' fchip-link' : ''}" style="background-color:rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0});width:${s}px;height:${s}px" aria-label="${escText(dispName)}"${linkAttrs}>${inner}</span>`;
}

// Build one icon: 24x24, inherits currentColor, sized via CSS (.icon + modifier).
export function icon(name, cls = '') {
  const body = ICONS[name];
  if (!body) return '';
  return `<svg class="icon${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

// Wide laurel divider ornament (start screen rule, event-card header).
// Central four-point star flanked by laurel sprigs on horizontal stems.
export function divider(cls = '') {
  return `<svg class="divider${cls ? ' ' + cls : ''}" viewBox="0 0 140 16" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
    '<path d="M70 2.6 71.9 6.1 75.4 8 71.9 9.9 70 13.4 68.1 9.9 64.6 8 68.1 6.1Z" fill="currentColor" fill-opacity="0.2"/>' +
    '<path d="M8 8h50M82 8h50"/>' +
    '<path d="M22 8c1.8-3 4.2-4.5 7.4-4.6-.6 3-3 4.6-7.4 4.6Z"/>' +
    '<path d="M32 8c1.8 3 4.2 4.5 7.4 4.6-.6-3-3-4.6-7.4-4.6Z"/>' +
    '<path d="M42 8c1.8-3 4.2-4.5 7.4-4.6-.6 3-3 4.6-7.4 4.6Z"/>' +
    '<path d="M118 8c-1.8-3-4.2-4.5-7.4-4.6.6 3 3 4.6 7.4 4.6Z"/>' +
    '<path d="M108 8c-1.8 3-4.2 4.5-7.4 4.6.6-3 3-4.6 7.4-4.6Z"/>' +
    '<path d="M98 8c-1.8-3-4.2-4.5-7.4-4.6.6 3 3 4.6 7.4 4.6Z"/>' +
    '</svg>';
}
