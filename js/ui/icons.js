// js/ui/icons.js — shared hand-drawn inline-SVG icon set (antiquity motifs).
// One design language everywhere: 24x24 viewBox, stroke currentColor,
// stroke-width 1.6, round caps/joins, minimal fills. Sized via CSS classes;
// color flows from the surrounding text color (gold/parchment palette).
//
// The eighteen soldiers of the land roster live in js/data/units.js instead —
// the map's canvas needs the same path data, so it is authored where both can
// read it. `unitIcon()` below wraps them in this file's grid.

import { unitGlyphSvg } from '../data/units.js';

export const ICONS = {
  // --- mapmodes -----------------------------------------------------------
  // Political: temple front (pediment + columns)
  temple:
    '<path d="M4.5 9.5 12 4.5l7.5 5"/>' +
    '<path d="M5.5 9.5h13"/>' +
    '<path d="M6 12.5h12"/>' +
    '<path d="M7.5 12.5v6M12 12.5v6M16.5 12.5v6"/>' +
    '<path d="M5 21h14"/>',
  // Diaspora (SPEC §175): a sower's hand and the scattered seed. The word IS
  // the scattering of seed, and the emblem has to read at 18px in a bar next
  // to a temple and a mountain — so: an open palm tilted over, and six grains
  // falling away from it in a spray. Not a menorah; the map is showing where
  // communities LIVE, and half of them lived under crowns that would not have
  // let them raise one.
  diaspora:
    '<path d="M4.2 9.4c1.1-1.9 2.7-2.6 4.8-2.1l3.1.8"/>' +
    '<path d="M4.2 9.4 6 12.2c.8 1.2 2 1.6 3.5 1.2l2.6-.7"/>' +
    '<path d="M12.1 8.1c1.5-.5 2.5-.1 3 1.1.5 1.3 0 2.3-1.4 2.9"/>' +
    '<circle cx="16.9" cy="6.2" r="0.95"/>' +
    '<circle cx="20.1" cy="9.1" r="0.95"/>' +
    '<circle cx="16.4" cy="11.9" r="0.95"/>' +
    '<circle cx="20.4" cy="14.6" r="0.95"/>' +
    '<circle cx="15.6" cy="17.4" r="0.95"/>' +
    '<circle cx="19.4" cy="19.8" r="0.95"/>',
  // Structures (SPEC §242): a built town in elevation — a hall, a house under
  // its roof, a tower. Deliberately NOT `walls` (one crenellated curtain) or
  // `bricks` (Development's course pyramid, already in this bar): the mode is
  // about the several kinds of work that stand on a province, so the emblem
  // has to be several kinds of building rather than one of them.
  structures:
    '<path d="M2.6 20.5h18.8"/>' +
    '<path d="M3.8 20.5v-6.2h4v6.2"/>' +
    '<path d="M3.8 17h4"/>' +
    '<path d="M10 20.5v-8.6l2.5-2.3 2.5 2.3v8.6"/>' +
    '<path d="M11.6 20.5v-3.4h1.8v3.4"/>' +
    '<path d="M17.6 20.5V5.9h3.2v14.6"/>' +
    '<path d="M17.6 10h3.2M17.6 14.4h3.2"/>',
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
  // The tools sheet's own mark: three ruled lines over a closed book edge —
  // a menu that still belongs to a parchment game.
  menu:
    '<path d="M4.5 7h15"/>' +
    '<path d="M4.5 12h15"/>' +
    '<path d="M4.5 17h9.5"/>' +
    '<path d="M17.2 15.6l1.6 1.6-1.6 1.6"/>',
  // The score: a beamed pair of notes (the tools sheet's music toggle).
  note:
    '<path d="M9 17.5V6.2l9-1.8v11.3"/>' +
    '<path d="M9 9.4l9-1.8"/>' +
    '<ellipse cx="7" cy="17.8" rx="2.4" ry="1.9"/>' +
    '<ellipse cx="16" cy="15.8" rx="2.4" ry="1.9"/>',
  // Effects: a speaker with two waves.
  speaker:
    '<path d="M4.5 9.5h3.2L12 6v12l-4.3-3.5H4.5Z"/>' +
    '<path d="M15.2 9.2a4 4 0 0 1 0 5.6"/>' +
    '<path d="M17.6 6.8a7.4 7.4 0 0 1 0 10.4"/>',
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
  // The rival purple (SPEC §239): the vexillum — the square banner hung from
  // a crossbar that a claimant's troops carried, with the wreath the army
  // acclaimed him with over it. Not the aquila, which stays the legitimate
  // Rome's, and not the labarum, which is the Christian empire's: this is the
  // standard of a man whose whole title is that soldiers say so.
  USR:
    `<rect x="11.2" y="2.6" width="1.6" height="18.6" rx="0.8" ${ACC}/>` +
    `<rect x="5.4" y="6.2" width="13.2" height="1.7" rx="0.85" ${ACC}/>` +
    `<path d="M6.4 7.9h11.2v7.9l-1.9-1.4-1.9 1.4-1.8-1.4-1.9 1.4-1.9-1.4L6.4 15.8Z" ${SIL}/>` +
    `<circle cx="12" cy="11.4" r="2.5" fill="none" stroke="${FG}" stroke-width="1.1"/>` +
    `<circle cx="12" cy="4.4" r="1.5" ${ACC}/>`,
  // Galilee (SPEC §236): the zodiac roundel of the synagogue floors. Hammat
  // Tiberias, Beth Alpha and Sepphoris all laid one — twelve signs around a
  // wheel, in the century this chapter opens in, by a community with an
  // academy, a closed Talmud and no state at all. It is the one thing the
  // Galilee of 529 unmistakably made, and it is nobody else's emblem on this
  // map: JUD keeps the menorah for the seven chapters that turn on Jerusalem,
  // and this is what those three letters look like when they mean Tiberias.
  GAL:
    `<circle cx="12" cy="12" r="9.1" ${SIL}/>` +
    `<circle cx="12" cy="12" r="9.1" fill="none" stroke="${FG}" stroke-width="1.4"/>` +
    `<path d="M12 8.5V3.6M13.8 9 16.2 4.7M15 10.2 19.3 7.8M15.5 12h4.9M15 13.8l4.3 2.4`
    + `M13.8 15l2.4 4.3M12 15.5v4.9M10.2 15l-2.4 4.3M9 13.8 4.7 16.2M8.5 12H3.6`
    + `M9 10.2 4.7 7.8M10.2 9 7.8 4.7" fill="none" stroke="${FO}" stroke-width="1.05" stroke-linecap="round"/>` +
    `<circle cx="12" cy="12" r="3.5" ${ACC}/>` +
    `<circle cx="12" cy="12" r="1.4" fill="${FP}" stroke="none"/>`,
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
  // The Lestai (SPEC §217): the sica, the short curved knife a highway robber
  // carried up his sleeve and the one the sicarii were named for — blade
  // sweeping up out of a gold grip, no standard and no scabbard.
  LST:
    `<path d="M8.1 17.8c1.9-4.6 4.6-8 8.1-10.2-.7 4.3-2.6 7.6-5.8 9.9Z" ${SIL}/>` +
    `<path d="M14.6 8.7c-2.2 1.9-3.9 4.3-5.1 7.1" ${DET}/>` +
    `<path d="M6.2 16.8l4.1 1.7-.8 1.9-4.1-1.7Z" ${ACC}/>` +
    `<rect x="3.4" y="18.4" width="2.6" height="2.6" rx="1.1" transform="rotate(22.6 4.7 19.7)" ${ACC}/>`,
  // The Peiratai (SPEC §217): a galley under sail, the bronze ram at the
  // waterline and the painted eye on the bow, over open water nobody patrols.
  PIR:
    `<rect x="11.3" y="2.6" width="1.4" height="11" rx="0.7" ${ACC}/>` +
    `<path d="M7.6 3.6h8.8v.9H7.6Z" ${ACC}/>` +
    `<path d="M8.1 4.5h7.8c.5 2.5.2 4.6-.9 6.2H9c-1.1-1.6-1.4-3.7-.9-6.2Z" ${SIL}/>` +
    `<path d="M4.6 13.6h15.6c-.8 3.3-3.1 5-6.9 5h-3.4c-2.9 0-4.7-1.7-5.3-5Z" ${SIL}/>` +
    `<path d="M4.6 13.6 1.6 14l1.9 2.4 2.9-1Z" ${ACC}/>` +
    `<ellipse cx="8.4" cy="15.2" rx="1.5" ry="1" ${ACC}/>` +
    `<circle cx="8.4" cy="15.2" r="0.45" fill="${FO}" stroke="none"/>` +
    `<path d="M3.8 20.6c1.6-1.1 3.2-1.1 4.8 0s3.2 1.1 4.8 0 3.2-1.1 4.8 0" fill="none" stroke="${FP}" stroke-width="1.2" stroke-linecap="round"/>`,
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
  // Commagene: the star above the sacred mountain of the royal sanctuary.
  CMG:
    `<path d="M3.8 19.4 9.2 10l2.6 4.2 2.8-6 5.6 11.2Z" ${SIL}/>` +
    `<path d="M12 2.7l.9 1.9 2.1.3-1.5 1.5.4 2.1-1.9-1-1.9 1 .4-2.1-1.5-1.5 2.1-.3Z" ${ACC}/>` +
    `<path d="M5.2 19.4h13.6" ${DET}/>`,
  // Cyzicene Syria: the Seleucid anchor divided by the rival diadem.
  CYZ:
    `<circle cx="12" cy="5" r="1.5" fill="none" stroke="${FG}" stroke-width="1.5"/>` +
    `<path d="M11.2 6.8h1.6v10.4h-1.6Z" ${SIL}/>` +
    `<path d="M6.8 10h10.4v1.7H6.8Z" ${ACC}/>` +
    `<path d="M12 20c-3-.4-5.2-2-6.4-4.7l2.2-.9c.9 1.8 2.3 2.9 4.2 3.3 1.9-.4 3.3-1.5 4.2-3.3l2.2.9C17.2 18 15 19.6 12 20Z" ${SIL}/>` +
    `<path d="M4.8 7.5c2-1.5 4.4-2.3 7.2-2.3s5.2.8 7.2 2.3" ${DET}/>`,
  // Ituraea: the recurved bow of the mountain archers.
  ITU:
    `<path d="M16.8 3.8c-4.8 1.8-7.2 4.5-7.2 8.2s2.4 6.4 7.2 8.2" ${SIL}/>` +
    `<path d="M16.8 3.8 16.8 20.2" ${DET}/>` +
    `<path d="M5 11.4h11.8v1.2H5Z" ${ACC}/>` +
    `<path d="M3.2 12 6.7 10.3v3.4Z" ${ACC}/>`,
  // Samaria: Mount Gerizim under the altar fire. Their Torah's tenth
  // commandment is the command to build the altar on this mountain, and their
  // Deuteronomy 27:4 reads Gerizim where the Jewish text reads Ebal — so the
  // banner is the whole argument: one hill, one altar, and no Jerusalem.
  SAM:
    `<path d="M2.6 19.4 9 8.6l3.4 5.6L15.1 10l6.3 9.4Z" ${SIL}/>` +
    `<path d="M6.4 19.4 9 15.1l1.6 2.6" ${DET}/>` +
    `<path d="M9.4 6.4h5.2v1.5H9.4Z" ${ACC}/>` +
    `<path d="M12 2.4c1 1.1 1.5 2.1 1.5 3 0 .6-.3 1.1-.8 1.4.1-.9-.2-1.6-.9-2.2-.5.7-.8 1.4-.8 2.2-.5-.3-.8-.8-.8-1.4 0-.9.6-1.9 1.8-3Z" ${ACC}/>`,
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
  // Transjordan — and Jordan (SPEC §107): the Hashemite tricolor, red chevron,
  // seven-pointed star. The kingdom changes its NAME in April 1949 and not its
  // banner; this flag has been the same since 1928 and serves both.
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
  // ---- the five crowns of government (SPEC §250) ----------------------------
  // Five banners over the same city, in the same faith, in the same blue-ish
  // corner of the palette — so each emblem says the FORM OF GOVERNMENT rather
  // than the country: what is at the head of this state, and whether anything
  // is above it. None of the five repeats Judaea's menorah or Israel's
  // hexagram; those two are the faith and the kingdom, and these are offices.

  // The Priestly Republic: the facade of the House as the tetradrachms drew
  // it — four columns, the architrave, the doorway, the rosette in it. The
  // executive of this state is the man who goes in through that door.
  PRJ:
    `<path d="M4.4 8.4 12 3.6l7.6 4.8Z" ${SIL}/>` +
    `<rect x="4.4" y="8.4" width="15.2" height="1.4" ${ACC}/>` +
    `<path d="M5.6 9.8h1.8v7.8H5.6ZM8.4 9.8h1.8v7.8H8.4ZM13.6 9.8h1.8v7.8h-1.8ZM16.4 9.8h1.8v7.8h-1.8Z" ${SIL}/>` +
    `<circle cx="11.8" cy="13.6" r="1.4" ${ACC}/>` +
    `<rect x="4.4" y="17.6" width="15.2" height="1.5" ${SIL}/>` +
    `<rect x="3.6" y="19.1" width="16.8" height="1.3" rx="0.6" ${ACC}/>`,
  // The Republic: the chalice of the revolt's own silver — the only coinage of
  // the ancient world that names no man — and the year counted above it in
  // three points rather than in anybody's reign.
  RPJ:
    `<circle cx="8.8" cy="4.6" r="0.9" ${ACC}/>` +
    `<circle cx="12" cy="3.8" r="0.9" ${ACC}/>` +
    `<circle cx="15.2" cy="4.6" r="0.9" ${ACC}/>` +
    `<rect x="7.6" y="7" width="8.8" height="1.5" rx="0.75" ${ACC}/>` +
    `<path d="M8.2 8.5h7.6l-1 5.1a2.9 2.9 0 0 1-5.6 0Z" ${SIL}/>` +
    `<path d="M11.2 16.4h1.6v3.2h-1.6Z" ${SIL}/>` +
    `<rect x="8.6" y="19.4" width="6.8" height="1.5" rx="0.75" ${ACC}/>`,
  // The Ethnarchy: the letter under seal. It is the office's whole instrument,
  // and the reason the office outlived the state that adopted it by three
  // centuries — there is no crown anywhere in the design, on purpose.
  EPJ:
    `<rect x="4.9" y="4.6" width="14.2" height="2.1" rx="1.05" ${ACC}/>` +
    `<rect x="6.2" y="6.7" width="11.6" height="9.6" ${SIL}/>` +
    `<path d="M8 8.8h8M8 10.8h8M8 12.8h8M8 14.8h5" ${DET}/>` +
    `<rect x="4.9" y="16.3" width="14.2" height="2.1" rx="1.05" ${ACC}/>` +
    `<path d="M15.2 18.4v1.6" fill="none" stroke="${FO}" stroke-width="1.4"/>` +
    `<circle cx="15.2" cy="21" r="1.9" ${ACC}/>`,
  // The Kingdom: a diadem laid across the sword that won it, with no priestly
  // title and no genealogy anywhere in the design.
  KGJ:
    `<path d="M12 3 13.3 5.5v9.2h-2.6V5.5Z" ${SIL}/>` +
    `<rect x="8" y="14.7" width="8" height="1.7" rx="0.85" ${ACC}/>` +
    `<rect x="11.2" y="16.4" width="1.6" height="3.1" ${SIL}/>` +
    `<circle cx="12" cy="20.4" r="1.5" ${ACC}/>` +
    `<path d="M5.2 9.2c2-1.6 4.3-2.4 6.8-2.4s4.8.8 6.8 2.4l-1.1 1.9c-1.7-1.3-3.6-2-5.7-2s-4 .7-5.7 2Z" ${ACC}/>` +
    `<path d="M5.8 10.6c-.8 1.4-1 2.9-.6 4.4M18.2 10.6c.8 1.4 1 2.9.6 4.4" ${DET}/>`,
  // The Priestly Kingdom: one head, two offices — the diadem above, the mitre
  // with its gold plate beneath, and the objection is the gap between them.
  PKJ:
    `<path d="M4.8 6.8c2.2-2.1 4.6-3.2 7.2-3.2s5 1.1 7.2 3.2l-1.1 2c-1.9-1.8-3.9-2.7-6.1-2.7s-4.2.9-6.1 2.7Z" ${ACC}/>` +
    `<path d="M6.6 17.2c0-4.1 2.4-7 5.4-7s5.4 2.9 5.4 7Z" ${SIL}/>` +
    `<path d="M9.2 12.8c1.7-1.1 3.9-1.1 5.6 0" ${DET}/>` +
    `<rect x="8.2" y="14.8" width="7.6" height="2.1" rx="1.05" ${ACC}/>` +
    `<rect x="6.1" y="17.2" width="11.8" height="1.8" rx="0.9" ${SIL}/>`,
  // ---- the two empires (SPEC §250) ------------------------------------------
  // Both wear the wreath, because that is the one device on this map that
  // means hegemony rather than office. What sits inside it is the difference:
  // the Judaean empire encloses the seats it annexed, four towers on the
  // ring road; the Israelite one encloses the hexagram, because that realm
  // answered the question of what it is before it answered how big it is.
  JEM:
    `<path d="M4.4 5.2c-2 4.2-1.4 9.4 1.8 13.4l1.9-1.4c-2.6-3.3-3.1-7.5-1.5-11Z" ${SIL}/>` +
    `<path d="M19.6 5.2c2 4.2 1.4 9.4-1.8 13.4l-1.9-1.4c2.6-3.3 3.1-7.5 1.5-11Z" ${SIL}/>` +
    `<path d="M7.6 6.4 8.4 3.4l2 1.7L12 2.6l1.6 2.5 2-1.7.8 3Z" ${ACC}/>` +
    `<rect x="7.3" y="6.4" width="9.4" height="1.5" rx="0.75" ${ACC}/>` +
    `<rect x="8" y="12.4" width="2.4" height="6.2" ${SIL}/>` +
    `<rect x="13.6" y="12.4" width="2.4" height="6.2" ${SIL}/>` +
    `<rect x="10.8" y="10.2" width="2.4" height="8.4" ${SIL}/>` +
    `<rect x="6.8" y="18.6" width="10.4" height="1.5" rx="0.75" ${ACC}/>`,
  IEM:
    `<path d="M4.4 5.2c-2 4.2-1.4 9.4 1.8 13.4l1.9-1.4c-2.6-3.3-3.1-7.5-1.5-11Z" ${SIL}/>` +
    `<path d="M19.6 5.2c2 4.2 1.4 9.4-1.8 13.4l-1.9-1.4c2.6-3.3 3.1-7.5 1.5-11Z" ${SIL}/>` +
    `<path d="M7.6 6.4 8.4 3.4l2 1.7L12 2.6l1.6 2.5 2-1.7.8 3Z" ${ACC}/>` +
    `<rect x="7.3" y="6.4" width="9.4" height="1.5" rx="0.75" ${ACC}/>` +
    hexagram(12, 14, 4.4, FO, 2.2) +
    hexagram(12, 14, 4.4, FG, 1.1) +
    `<rect x="6.8" y="19.2" width="10.4" height="1.5" rx="0.75" ${ACC}/>`,

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
  // Syria after the eighth of March, 1963 (event rebrand): the Arab
  // liberation colors turned upright — red, white, black — with the three
  // green stars of the union that was supposed to follow.
  SYR_BAATH:
    `<rect x="0.6" y="0.6" width="22.8" height="7.6" fill="#b5342c" stroke="none"/>` +
    `<rect x="0.6" y="8.2" width="22.8" height="7.6" fill="#f2f4f4" stroke="none"/>` +
    `<rect x="0.6" y="15.8" width="22.8" height="7.6" fill="#141414" stroke="none"/>` +
    star5(6.4, 12, 1.7, '#1a7a44') +
    star5(12, 12, 1.7, '#1a7a44') +
    star5(17.6, 12, 1.7, '#1a7a44'),
  // Syria under Assad, from the Federation of Arab Republics (1972): the same
  // bands, the gold hawk of Quraish in the white — and unmistakable at chip
  // size beside Baghdad's three stars, which is the point.
  SYR_FAR:
    `<rect x="0.6" y="0.6" width="22.8" height="7.6" fill="#b5342c" stroke="none"/>` +
    `<rect x="0.6" y="8.2" width="22.8" height="7.6" fill="#f2f4f4" stroke="none"/>` +
    `<rect x="0.6" y="15.8" width="22.8" height="7.6" fill="#141414" stroke="none"/>` +
    `<path d="M12 9.1c.8 0 1.4.6 1.4 1.4 0 .5-.2.9-.6 1.2l.4 2.9h-2.4l.4-2.9c-.4-.3-.6-.7-.6-1.2 0-.8.6-1.4 1.4-1.4Z" fill="#d9a520" stroke="none"/>` +
    `<path d="M10.6 10.4 4.7 9.2l1.1 2.1-1.3.4 6 1.3Z" fill="#d9a520" stroke="none"/>` +
    `<path d="M13.4 10.4l5.9-1.2-1.1 2.1 1.3.4-6 1.3Z" fill="#d9a520" stroke="none"/>` +
    `<path d="M10.9 14.2h2.2l-.5 1.3h-1.2Z" fill="#d9a520" stroke="none"/>`,
  // Syria after the secession of 1961 (SPEC §105): the independence flag of
  // 1932 hauled back up the same morning the union ended — green over white
  // over black, three red stars for the three districts of the mandate. It is
  // the deliberate opposite of the union's banner, which is the point of it.
  SAR:
    `<rect x="0.6" y="0.6" width="22.8" height="7.6" fill="#1a7a44" stroke="none"/>` +
    `<rect x="0.6" y="8.2" width="22.8" height="7.6" fill="#f2f4f4" stroke="none"/>` +
    `<rect x="0.6" y="15.8" width="22.8" height="7.6" fill="#141414" stroke="none"/>` +
    star5(6.4, 12, 1.7, '#b5342c') +
    star5(12, 12, 1.7, '#b5342c') +
    star5(17.6, 12, 1.7, '#b5342c'),
  // Iran after February 1979 (SPEC §105): the same tricolour, the lion and
  // sun struck out of the middle and the tulip-and-sword emblem in its place.
  IRN_IR:
    `<rect x="0.6" y="0.6" width="22.8" height="7.6" fill="#2c7a3f" stroke="none"/>` +
    `<rect x="0.6" y="8.2" width="22.8" height="7.6" fill="#f2f4f4" stroke="none"/>` +
    `<rect x="0.6" y="15.8" width="22.8" height="7.6" fill="#b5342c" stroke="none"/>` +
    `<path d="M12 8.6v6.8" stroke="#b5342c" stroke-width="1.5" stroke-linecap="round" fill="none"/>` +
    `<path d="M9.4 10.4v3.2M14.6 10.4v3.2" stroke="#b5342c" stroke-width="1.2" stroke-linecap="round" fill="none"/>` +
    `<path d="M10.2 14.6h3.6" stroke="#b5342c" stroke-width="1.2" stroke-linecap="round" fill="none"/>` +
    `<path d="M12 7.4c.7.7 1.1 1.4 1.1 2.1H10.9c0-.7.4-1.4 1.1-2.1Z" fill="#b5342c" stroke="none"/>`,
  // Iraq after the seventeenth of July, 1968 (event rebrand): the flag raised
  // in 1963 and kept for a generation — the same bands, three green stars.
  IRQ_BAATH:
    `<rect x="0.6" y="0.6" width="22.8" height="7.6" fill="#b5342c" stroke="none"/>` +
    `<rect x="0.6" y="8.2" width="22.8" height="7.6" fill="#f2f4f4" stroke="none"/>` +
    `<rect x="0.6" y="15.8" width="22.8" height="7.6" fill="#141414" stroke="none"/>` +
    star5(6.4, 12, 2, '#1a7a44') +
    star5(12, 12, 2, '#1a7a44') +
    star5(17.6, 12, 2, '#1a7a44'),
  // Greece in the modern bookmark (1948: the Kingdom of Greece, still at war
  // with itself in the mountains): nine stripes for the nine syllables of
  // Ελευθερία ή Θάνατος, the white cross of Orthodoxy in the canton. The
  // laurel wreath above stays with the leagues and cities of the ancient eras.
  GRC_MOD:
    `<rect x="0.6" y="0.6" width="22.8" height="22.8" fill="#f2f4f4" stroke="none"/>` +
    [0, 2, 4, 6, 8].map((i) =>
      `<rect x="0.6" y="${(0.6 + i * 2.533).toFixed(2)}" width="22.8" height="2.54" fill="#1d4e9c" stroke="none"/>`).join('') +
    `<rect x="0.6" y="0.6" width="12.67" height="12.67" fill="#1d4e9c" stroke="none"/>` +
    `<path d="M5.69 0.6h2.5v12.67h-2.5Z" fill="#f2f4f4" stroke="none"/>` +
    `<path d="M0.6 5.69h12.67v2.5H0.6Z" fill="#f2f4f4" stroke="none"/>`,
  // Iraq after the July revolution (event rebrand, 1958): Qasim's upright
  // tricolor, the red star of the republic on a gold boss.
  IRQ_REP:
    `<rect x="0.6" y="0.6" width="7.6" height="22.8" fill="#141414" stroke="none"/>` +
    `<rect x="8.2" y="0.6" width="7.6" height="22.8" fill="#f2f4f4" stroke="none"/>` +
    `<rect x="15.8" y="0.6" width="7.6" height="22.8" fill="#1a6a3c" stroke="none"/>` +
    `<path d="${starPath(12, 12, 8, 4.8, 2.4)}" fill="#b5342c" stroke="none"/>` +
    `<circle cx="12" cy="12" r="1.5" fill="#d9a520" stroke="none"/>`,

  // --- the political west (SPEC §173) -------------------------------------
  // One emblem per new court, same coin-die hand as the rest of the file:
  // where a people left a device (Tanit's sign, the Pictish crescent-and-rod,
  // the draco, the Dulo tamga, the iron crown) it is drawn; where they left
  // none, the emblem is the thing their neighbors knew them by.
  // Carthage: the sign of Tanit under the crescent, off every stele in the tophet.
  CAR:
    `<path d="M15.5 4.2a5.4 5.4 0 10-7 .1 6.6 6.6 0 017-.1Z" ${ACC}/>` +
    `<circle cx="12" cy="9.2" r="2.3" ${SIL}/>` +
    `<path d="M5.6 12.6h12.8v1.7H5.6Z" ${SIL}/>` +
    `<path d="M8.2 14.3h7.6L18 20.4H6Z" ${SIL}/>`,
  // Numidia: the free horse of the royal coinage.
  NUM:
    `<path d="M6 19.6c.2-3.2 1.2-5.6 3-7.2l-2.6-.6c-1-.3-1.5-1-1.5-2 .9.3 1.8.4 2.7.3 1.9-.2 3.5.1 4.8.9l3.2-2.6.4-2.9 1.6 2.4 2.2.6c-.6 1-1.4 1.5-2.4 1.6l-1 2.4c1 1.7 1.6 4.1 1.7 7.1h-2.1c-.4-2.3-1.1-4.1-2.1-5.4-1 .8-2.2 1.3-3.6 1.4-.4 1.1-.5 2.4-.4 4Z" ${SIL}/>`,
  // Mauretania: the crescent over the Atlas, the far west's own sky.
  MAU:
    `<path d="M14.8 3.4a4.8 4.8 0 10.1 5.9 5.8 5.8 0 01-.1-5.9Z" ${ACC}/>` +
    `<path d="M2.8 19.8 8 10.4l3 4.6 3-5.4 7.2 10.2Z" ${SIL}/>` +
    `<path d="M5.6 19.8 8 15.4l1.6 2.5" ${DET}/>`,
  // The Garamantes: the chariot wheel of the desert crossings, rock-carved
  // from the Fezzan to the Atlas.
  GRM:
    `<circle cx="12" cy="12" r="7.2" ${SIL}/>` +
    `<circle cx="12" cy="12" r="1.7" ${ACC}/>` +
    `<path d="M12 4.8v14.4M4.8 12h14.4M6.9 6.9l10.2 10.2M17.1 6.9 6.9 17.1" ${DET}/>`,
  // Massalia: the galley prow that carried the west's oldest Greeks.
  MAS:
    `<path d="M3.8 13.6h13.4l3.4-2.8-1 4.4c-2.2 1.9-5 2.8-8.4 2.8-2.8 0-5.3-.6-7.4-1.9Z" ${SIL}/>` +
    `<path d="M6.2 13.6V8.8l2.2 1.2V7.4l2.4 1.4V6l2.6 1.6" ${DET}/>` +
    `<circle cx="16.4" cy="12.2" r="0.7" fill="${FO}" stroke="none"/>` +
    `<path d="M4.2 19.4c1.4-1 2.8-1 4.2 0 1.4 1 2.8 1 4.2 0 1.4-1 2.8-1 4.2 0" ${DET}/>`,
  // The Celtiberians: the round caetra and the falcata that kept Numantia.
  CTB:
    `<circle cx="12" cy="9.4" r="5.8" ${SIL}/>` +
    `<circle cx="12" cy="9.4" r="1.6" ${ACC}/>` +
    `<path d="M12 3.6v11.6M6.2 9.4h11.6" ${DET}/>` +
    `<path d="M5.4 20.6c2.5.2 4.6-.3 6.4-1.5 1.6-1.1 2.6-2.5 3-4.2l1.8 1c-.5 2.2-1.8 4-3.9 5.2-1.9 1.1-4.3 1.4-7.3.9Z" ${ACC}/>`,
  // Lusitania: crossed javelins behind the small shield of the raiding bands.
  LUS:
    `<path d="M5.2 4.6 18.4 19.2M18.8 4.6 5.6 19.2" fill="none" stroke="${FP}" stroke-width="1.6" stroke-linecap="round"/>` +
    `<path d="M5.2 4.6l2.6.5-.9 2.4Z M18.8 4.6l-2.6.5.9 2.4Z" ${ACC}/>` +
    `<circle cx="12" cy="12" r="4.2" ${SIL}/>` +
    `<circle cx="12" cy="12" r="1.2" ${ACC}/>`,
  // The Arverni: the boar of the Gaulish standards, bristles up.
  AVN:
    `<path d="M4.2 14.6c0-3 1.9-4.9 5.6-5.7l1.6-2.1 1 1.9c2.4 0 4.3.5 5.7 1.6l2.1-.6-1 2c.4.6.6 1.3.6 2.1 0 .8-.3 1.5-.8 2.2h-2.6l-.4 1.6h-1.8l-.3-1.4H9.4l-.4 1.4H7.2L6.9 16c-1.8-.2-2.7-.7-2.7-1.4Z" ${SIL}/>` +
    `<path d="M9.8 8.9l1-1.5 1 1.6M12.6 8.9l1.2-1.3.7 1.7" ${DET}/>` +
    `<circle cx="16.9" cy="13.1" r="0.5" fill="${FO}" stroke="none"/>`,
  // The Aedui: the vergobret's torc, ends open — power handed over yearly.
  AED:
    `<path d="M12 4.6a7.4 7.4 0 017.4 7.4c0 2.6-1 4.8-2.9 6.4l-1.3-1.6c1.5-1.2 2.2-2.8 2.2-4.8a5.4 5.4 0 10-10.8 0c0 2 .7 3.6 2.2 4.8l-1.3 1.6c-1.9-1.6-2.9-3.8-2.9-6.4A7.4 7.4 0 0112 4.6Z" ${ACC}/>` +
    `<circle cx="8.1" cy="17.6" r="1.6" ${SIL}/>` +
    `<circle cx="15.9" cy="17.6" r="1.6" ${SIL}/>`,
  // The Sequani: the carnyx, the boar-headed trumpet of the Gaulish charge.
  SEQ:
    `<path d="M10.9 20.4V8.2c0-2 .8-3.4 2.4-4.2l.9 1.7c-1 .6-1.5 1.4-1.5 2.5v12.2Z" ${SIL}/>` +
    `<path d="M13.3 4c1.7-.9 3.3-.9 4.9 0l-1.1 2.1-1.9-.4-.5 1.3Z" ${SIL}/>` +
    `<circle cx="16.6" cy="5" r="0.5" fill="${FO}" stroke="none"/>` +
    `<path d="M9.2 20.4h5.4" ${ACC}/>`,
  // The Belgae: the sheaf of spears of the bravest third.
  BLG:
    `<path d="M12 3.2v17M7.4 5.2l3 15M16.6 5.2l-3 15" fill="none" stroke="${FP}" stroke-width="1.5" stroke-linecap="round"/>` +
    `<path d="M12 3.2l1.2 2.4h-2.4Z M7.4 5.2l1.7 2.1-2.3.5Z M16.6 5.2l.6 2.6-2.3-.5Z" ${ACC}/>` +
    `<rect x="6.8" y="15.2" width="10.4" height="1.7" rx="0.85" ${ACC}/>`,
  // The Armoricans: the leather sail of the Veneti, riding the tide.
  ARO:
    `<path d="M11.2 3.6h1.6v13h-1.6Z" ${ACC}/>` +
    `<path d="M12.8 4.8c3.4.8 5.6 2.6 6.6 5.4l-6.6 1.2Z" ${SIL}/>` +
    `<path d="M11.2 4.8c-3.4.8-5.6 2.6-6.6 5.4l6.6 1.2Z" ${SIL}/>` +
    `<path d="M4 18.2c1.4-1 2.8-1 4.2 0 1.4 1 2.7 1 4 0 1.4-1 2.7-1 4 0 1.3 1 2.6 1 3.9 0" ${DET}/>`,
  // The Aquitani: the oak of the deep-forest country between river and mountains.
  AQT:
    `<path d="M11.1 20.2v-5.4c-3.2-.4-5.4-2-6.4-4.8 1.4.2 2.6 0 3.8-.6-1.2-1-1.8-2.3-1.8-3.9 1.6.7 3 .8 4.2.4.4-1.2 1.1-2.1 2.1-2.7.4 1.2 1.1 2.1 2.1 2.7 1.4.2 2.7 0 3.9-.7 0 1.7-.7 3-2 3.9 1.2.7 2.5 1 3.8.8-1 2.9-3.2 4.5-6.5 4.9v5.4Z" ${SIL}/>` +
    `<path d="M8 20.2h8" ${ACC}/>`,
  // Noricum: the sword on the anvil — the steel every legion bought.
  NOR:
    `<path d="M11.2 2.8h1.6v8h-1.6Z" ${SIL}/>` +
    `<path d="M8.6 5h6.8v1.5H8.6Z" ${ACC}/>` +
    `<path d="M6.4 13.4h11.2v2.4h-3.4v2h2.4v2H7.4v-2h2.4v-2H6.4Z" ${SIL}/>`,
  // The Boii: the bull of the herds that named Bohemia.
  BOI:
    `<path d="M4.4 5.2c.3 2.9 1.7 4.6 4.2 5.2M19.6 5.2c-.3 2.9-1.7 4.6-4.2 5.2" fill="none" stroke="${FG}" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="M8 9.6c.6-1.6 1.9-2.4 4-2.4s3.4.8 4 2.4c.9 2.1.9 4.2 0 6.2-.8 1.9-2.2 2.9-4 2.9s-3.2-1-4-2.9c-.9-2-.9-4.1 0-6.2Z" ${SIL}/>` +
    `<circle cx="10.2" cy="11.4" r="0.6" fill="${FO}" stroke="none"/>` +
    `<circle cx="13.8" cy="11.4" r="0.6" fill="${FO}" stroke="none"/>` +
    `<path d="M10.6 15.4c.9.6 1.9.6 2.8 0" ${DET}/>`,
  // The Britons: the La Tène triskele of the island bronzes.
  BRT:
    `<circle cx="12" cy="12" r="8" ${SIL}/>` +
    `<path d="M12 12c0-3 1.3-4.9 3.9-5.7M12 12c2.6 1.5 3.4 3.7 2.3 6.3M12 12c-2.6 1.5-4.7 1.2-6.2-1" fill="none" stroke="${FO}" stroke-width="1.8" stroke-linecap="round"/>` +
    `<circle cx="12" cy="12" r="1.3" ${ACC}/>`,
  // Caledonia: the crescent and V-rod, cut on symbol stones nobody has read.
  CAL:
    `<path d="M4.6 10.2a7.6 7.6 0 0114.8 0l-2 .5a5.6 5.6 0 00-10.8 0Z" ${SIL}/>` +
    `<path d="M6.2 16.8 12 8.4l5.8 8.4" fill="none" stroke="${FG}" stroke-width="1.6" stroke-linecap="round"/>` +
    `<path d="M6.2 16.8l-.3 2.6 2.1-1.4ZM17.8 16.8l.3 2.6-2.1-1.4Z" ${ACC}/>`,
  // Hibernia: the triple spiral, older on that island than every kingdom of it.
  HIB:
    `<path d="M12 11.2c-.1-2.4 1-3.9 3.2-4.4 2 .5 3 1.8 3 3.9-.4 1.7-1.4 2.6-3 2.6" fill="none" stroke="${FP}" stroke-width="1.7" stroke-linecap="round"/>` +
    `<path d="M12.7 12.4c2.1 1.2 2.6 3 1.7 5.1-1.7 1.3-3.4 1.3-5-.1-.9-1.5-.7-2.8.5-3.9" fill="none" stroke="${FP}" stroke-width="1.7" stroke-linecap="round"/>` +
    `<path d="M11.3 12.4c-2-1.3-4-1.1-5.8.7-.4 2.1.4 3.6 2.3 4.5" fill="none" stroke="${FP}" stroke-width="1.7" stroke-linecap="round"/>` +
    `<circle cx="12" cy="12" r="1" ${ACC}/>`,
  // The Suebi: the knot itself, combed high on every free head.
  SUE:
    `<path d="M9.4 20.4c-1.9-3.4-2.4-6.8-1.5-10.2.8-3 2.5-5 5.1-6 2 .6 3.2 1.9 3.6 3.9.3 1.8-.4 3.1-2.1 3.9-1.5.5-2.7.1-3.6-1.1-.6-1.1-.4-2.1.6-2.9" fill="none" stroke="${FP}" stroke-width="1.8" stroke-linecap="round"/>` +
    `<path d="M13 4.2c1.6-.9 3.2-1 4.8-.3l-1.2 2.2c-1.1-.5-2.1-.4-3.2.2Z" ${ACC}/>`,
  // The Cherusci: the forest where the eagles went down — three standards, one broken.
  CHE:
    `<path d="M6 4.4v15.8M18 4.4v15.8" fill="none" stroke="${FP}" stroke-width="1.5" stroke-linecap="round"/>` +
    `<path d="M12 4.4v6.2l-2.6 3.2" fill="none" stroke="${FP}" stroke-width="1.5" stroke-linecap="round"/>` +
    `<circle cx="6" cy="4" r="1.3" ${ACC}/>` +
    `<circle cx="18" cy="4" r="1.3" ${ACC}/>` +
    `<circle cx="12" cy="4" r="1.3" ${ACC}/>` +
    `<path d="M4.4 20.2h15.2" ${ACC}/>`,
  // The Chatti: the shield and the spade — others go to battle, these go to war.
  CHA:
    `<rect x="5" y="4.6" width="8.6" height="12.4" rx="1.6" ${SIL}/>` +
    `<path d="M9.3 6.4v8.8M6.8 10.8h5" ${DET}/>` +
    `<path d="M16.6 4.2h1.7v9h-1.7Z" ${ACC}/>` +
    `<path d="M15.4 13.2h4.1l-.7 4.4h-2.7Z" ${ACC}/>`,
  // The Frisii: the terp above the tide — a house the sea walks around.
  FRS:
    `<path d="M6.4 13.8c.6-2.6 2.5-3.9 5.6-3.9s5 1.3 5.6 3.9Z" ${SIL}/>` +
    `<path d="M9.8 9.9 12 6.4l2.2 3.5" ${SIL}/>` +
    `<path d="M3.6 16.4c1.4-1 2.8-1 4.2 0 1.4 1 2.8 1 4.2 0 1.4-1 2.8-1 4.2 0 1.4 1 2.8 1 4.2 0" ${DET}/>` +
    `<path d="M4.4 19.2c1.3-.9 2.7-.9 4 0 1.3.9 2.6.9 3.9 0 1.3-.9 2.6-.9 3.9 0 1.3.9 2.6.9 3.9 0" ${DET}/>`,
  // The Cimbri: the brazen bull the priestesses carried to the Raudine plain.
  CIM:
    `<path d="M3.8 4.6c.4 3.2 2 5.1 4.8 5.7M20.2 4.6c-.4 3.2-2 5.1-4.8 5.7" fill="none" stroke="${FP}" stroke-width="2.1" stroke-linecap="round"/>` +
    `<path d="M8.4 10.9c.7-1.4 1.9-2.1 3.6-2.1s2.9.7 3.6 2.1c.8 1.7.8 3.4 0 5.1-.7 1.6-1.9 2.4-3.6 2.4s-2.9-.8-3.6-2.4c-.8-1.7-.8-3.4 0-5.1Z" ${ACC}/>` +
    `<circle cx="10.4" cy="12.6" r="0.55" fill="${FO}" stroke="none"/>` +
    `<circle cx="13.6" cy="12.6" r="0.55" fill="${FO}" stroke="none"/>`,
  // The Suiones: the ship-kings' hull, strong in oars and men.
  SCN:
    `<path d="M3.6 13.2c2.6 1.2 5.4 1.8 8.4 1.8s5.8-.6 8.4-1.8c-.6 2.2-1.8 3.9-3.6 5.1H7.2c-1.8-1.2-3-2.9-3.6-5.1Z" ${SIL}/>` +
    `<path d="M4.6 12.6c-.9-1.5-.8-3 .3-4.5M19.4 12.6c.9-1.5.8-3-.3-4.5" fill="none" stroke="${FG}" stroke-width="1.6" stroke-linecap="round"/>` +
    `<path d="M7.6 13.9v2.6M10.5 14.4v3M13.5 14.4v3M16.4 13.9v2.6" ${DET}/>`,
  // The Gothones: the ring-hilted spear of the kings at the river mouth.
  GOT:
    `<path d="M11.2 7.2h1.6v13h-1.6Z" ${SIL}/>` +
    `<path d="M12 2.4l2.2 4.8h-4.4Z" ${ACC}/>` +
    `<circle cx="12" cy="14.8" r="2.9" fill="none" stroke="${FG}" stroke-width="1.5"/>`,
  // The Aestii: the amber they alone gather, strung above the sea.
  AES:
    `<path d="M4.2 8.4c2.4 1.9 5 2.9 7.8 2.9s5.4-1 7.8-2.9" fill="none" stroke="${FP}" stroke-width="1.4" stroke-linecap="round"/>` +
    `<circle cx="7.2" cy="10.4" r="1.5" ${ACC}/>` +
    `<circle cx="12" cy="11.6" r="2" ${ACC}/>` +
    `<circle cx="16.8" cy="10.4" r="1.5" ${ACC}/>` +
    `<path d="M4.4 17.4c1.4-1 2.8-1 4.2 0 1.4 1 2.8 1 4.2 0 1.4-1 2.8-1 4.2 0 1.3 1 2.6 1 3.9 0" ${DET}/>`,
  // The Delmatae: the hill fort ringed with dry stone, five times conquered.
  DLM:
    `<path d="M3.4 19.6 12 5.2l8.6 14.4Z" ${SIL}/>` +
    `<path d="M8.6 13.6h6.8v2.6H8.6Z" ${ACC}/>` +
    `<path d="M9.8 13.6v2.6M12 13.6v2.6M14.2 13.6v2.6" ${DET}/>`,
  // The Scordisci: the thureos shield that reached Delphi twice.
  SCO:
    `<path d="M8.2 3.6h7.6c.8 2.8 1.2 5.6 1.2 8.4s-.4 5.6-1.2 8.4H8.2c-.8-2.8-1.2-5.6-1.2-8.4s.4-5.6 1.2-8.4Z" ${SIL}/>` +
    `<path d="M12 5v14" ${DET}/>` +
    `<path d="M10.4 12c0-1.1.5-1.7 1.6-1.7s1.6.6 1.6 1.7-.5 1.7-1.6 1.7-1.6-.6-1.6-1.7Z" ${ACC}/>`,
  // Dardania: the watchtower above Macedon's road.
  DRD:
    `<path d="M8.6 20.2V9.4H7.2V6.6h2.2V4.8h1.8v1.8h1.6V4.8h1.8v1.8h2.2v2.8h-1.4v10.8Z" ${SIL}/>` +
    `<path d="M11 13.2h2v3.4h-2Z" fill="${FO}" stroke="none"/>` +
    `<path d="M5.4 20.2h13.2" ${ACC}/>`,
  // Thrace: the pelta and the two javelins of the peltast.
  THR:
    `<path d="M5.2 10.4a6.8 6.8 0 0113.6 0c0 1.9-.6 3.4-1.9 4.6-1-1.7-2.1-2.6-3.4-2.6-.8 0-1.3.4-1.5 1.1-.2-.7-.7-1.1-1.5-1.1-1.3 0-2.4.9-3.4 2.6-1.3-1.2-1.9-2.7-1.9-4.6Z" ${SIL}/>` +
    `<path d="M6.8 17.2 17.6 6.8M6.8 6.8l10.8 10.4" fill="none" stroke="${FG}" stroke-width="1.4" stroke-linecap="round"/>` +
    `<path d="M17.6 6.8l.5-2.4-2.3.7ZM6.8 6.8l-.5-2.4 2.3.7Z" ${ACC}/>`,
  // Dacia: the draco — wolf's head, serpent's tail, wind for a voice.
  DAC:
    `<path d="M4.6 8.2c1.5-1.7 3.2-2.3 5.2-1.8l1.6-1.6.4 1.9c1.1.5 1.8 1.3 2.1 2.4l-2.2 1.4c-.7-.9-1.5-1.4-2.5-1.4l-1.2 1.2-.6-1.5c-1 .1-1.9.5-2.8 1.2Z" ${SIL}/>` +
    `<path d="M13.6 8.6c2.4.4 4 1.5 4.9 3.3.9 1.9.7 3.8-.7 5.7-1.2 1.6-2.9 2.4-5 2.4-1.7 0-3.1-.5-4.2-1.6l1.5-1.7c.8.7 1.7 1.1 2.7 1.1 1.3 0 2.4-.5 3.1-1.5.8-1.1.9-2.2.4-3.4-.6-1.2-1.7-2-3.3-2.3Z" ${ACC}/>` +
    `<circle cx="7.6" cy="7.9" r="0.5" fill="${FO}" stroke="none"/>`,
  // The Bosporan Kingdom: the Spartocid trident-tamga of the straits.
  BOS:
    `<path d="M11.2 6.4h1.6v13.8h-1.6Z" ${SIL}/>` +
    `<path d="M6.4 4.2c.4 3 1.5 4.9 3.4 5.6M17.6 4.2c-.4 3-1.5 4.9-3.4 5.6" fill="none" stroke="${FP}" stroke-width="1.6" stroke-linecap="round"/>` +
    `<path d="M12 2.8l1.5 3.3h-3Z" ${ACC}/>` +
    `<circle cx="12" cy="17.2" r="2.1" fill="none" stroke="${FG}" stroke-width="1.4"/>`,
  // Scythia: the drawn bow and the gorytos that emptied itself and left.
  SCY:
    `<path d="M4.6 9.8c2.4-2.2 4.9-3.3 7.4-3.3s5 1.1 7.4 3.3l-1.4 1.6c-2-1.9-4-2.9-6-2.9s-4 1-6 2.9Z" ${SIL}/>` +
    `<path d="M4.6 9.8 12 12.6l7.4-2.8" ${DET}/>` +
    `<path d="M11.2 6.4h1.6v11.8h-1.6Z" ${ACC}/>` +
    `<path d="M12 20.6l-1.8-2.4h3.6Z" ${ACC}/>`,
  // Sarmatia: the tamga of the lance-bearing clans.
  SRM:
    `<circle cx="12" cy="7.4" r="3.4" fill="none" stroke="${FP}" stroke-width="1.8"/>` +
    `<path d="M12 10.8v9.4M12 15.2 7.4 20.2M12 15.2l4.6 5" fill="none" stroke="${FP}" stroke-width="1.8" stroke-linecap="round"/>`,
  // The Venedae: the pine forest east of everyone's maps.
  VEN:
    `<path d="M7.4 20.2V17c-2.3-.5-3.8-1.7-4.4-3.6 1 .2 1.9.1 2.7-.3-.9-.8-1.4-1.8-1.4-3 1.1.5 2.1.6 3 .3.3-1 .9-1.7 1.8-2.2.9.5 1.5 1.2 1.8 2.2.9.3 1.9.2 3-.3 0 1.2-.5 2.2-1.4 3 .8.4 1.7.5 2.7.3-.6 1.9-2.1 3.1-4.4 3.6v3.2Z" ${SIL}/>` +
    `<path d="M14.8 20.2v-2.4c-1.8-.4-2.9-1.3-3.4-2.8.8.2 1.5.1 2.1-.2-.7-.6-1-1.4-1-2.3.8.4 1.6.4 2.3.2.2-.8.7-1.3 1.4-1.7.7.4 1.2.9 1.4 1.7.7.2 1.5.2 2.3-.2 0 .9-.3 1.7-1 2.3.6.3 1.3.4 2.1.2-.5 1.5-1.6 2.4-3.4 2.8v2.4Z" ${SIL}/>`,
  // The Ostrogoths: the Amal eagle of the cloisonné fibulae, wings squared.
  OST:
    `<path d="M12 3.4c1.1 0 1.8.7 1.8 1.8l-.1 1 2.9-.7c1.6-.4 2.6.2 3 1.7l-3.6 2.2.1 8.2-2.2 2.8h-3.8l-2.2-2.8.1-8.2L4.4 7.2c.4-1.5 1.4-2.1 3-1.7l2.9.7-.1-1c0-1.1.7-1.8 1.8-1.8Z" ${SIL}/>` +
    `<path d="M9.8 10.2h4.4M9.8 13h4.4M9.8 15.8h4.4" ${DET}/>` +
    `<circle cx="12" cy="5.4" r="0.5" fill="${FO}" stroke="none"/>`,
  // The Vandals: the sail that took Carthage's sea and Rome's grain.
  VAN:
    `<path d="M11.2 3.4h1.6v11.4h-1.6Z" ${ACC}/>` +
    `<path d="M5.4 4.8h13.2c-.8 2.1-1.2 4-1.2 5.7 0 1.1.2 2.3.5 3.5H6.1c.3-1.2.5-2.4.5-3.5 0-1.7-.4-3.6-1.2-5.7Z" ${SIL}/>` +
    `<path d="M3.8 16.6h16.4l-2.6 3.6H6.4Z" ${SIL}/>` +
    `<path d="M10.9 7h2.2M12 5.9v2.2" fill="none" stroke="${FO}" stroke-width="1" stroke-linecap="round"/>`,
  // The Visigoths: Toledo's votive crown, hung above the altar on chains.
  VIS:
    `<path d="M7 4.2l1.6 3.6M17 4.2l-1.6 3.6M12 3.4v4" ${DET}/>` +
    `<path d="M6.4 7.8h11.2v4.4c-1.9.8-3.7 1.2-5.6 1.2s-3.7-.4-5.6-1.2Z" ${ACC}/>` +
    `<path d="M8.4 13.4v3.2M12 13.9v3.6M15.6 13.4v3.2" ${DET}/>` +
    `<circle cx="8.4" cy="17.8" r="0.9" ${SIL}/>` +
    `<circle cx="12" cy="18.7" r="0.9" ${SIL}/>` +
    `<circle cx="15.6" cy="17.8" r="0.9" ${SIL}/>`,
  // The Franks: the francisca, thrown once, at the start, to break the line.
  FRK:
    `<path d="M10.9 6.8 8.2 20.2h1.9l2.3-11.9Z" ${SIL}/>` +
    `<path d="M10.4 7.6c-.6-2.2.2-3.7 2.4-4.4 1.9-.6 3.6-.3 5.2.9-1.1 2.4-2.9 3.7-5.4 3.9Z" ${ACC}/>`,
  // Burgundy: the law-book under the crown — the code that outlived the kingdom.
  BGD:
    `<path d="M5.6 9.2c1.9-1.8 4-2.7 6.4-2.7s4.5.9 6.4 2.7l-.9 1.6c-1.7-1.6-3.5-2.4-5.5-2.4s-3.8.8-5.5 2.4Z" ${ACC}/>` +
    `<circle cx="12" cy="7.2" r="1.4" ${SIL}/>` +
    `<path d="M6.4 12.6h11.2v7.2H6.4Z" ${SIL}/>` +
    `<path d="M12 12.6v7.2M8.2 14.8h2M13.8 14.8h2M8.2 16.8h2M13.8 16.8h2" ${DET}/>`,
  // The Gepids: the great eagle buckle of the Tisza graves.
  GEP:
    `<path d="M12 4.2c2.6 0 4.4 1.2 5.4 3.6.9 2.2.7 4.4-.6 6.6l-2-1.2c.9-1.6 1.1-3.1.5-4.6-.6-1.6-1.7-2.4-3.3-2.4s-2.7.8-3.3 2.4c-.6 1.5-.4 3 .5 4.6l-2 1.2c-1.3-2.2-1.5-4.4-.6-6.6 1-2.4 2.8-3.6 5.4-3.6Z" ${SIL}/>` +
    `<path d="M9.4 15.4h5.2l-1 4.8h-3.2Z" ${ACC}/>` +
    `<circle cx="12" cy="8.4" r="0.6" fill="${FO}" stroke="none"/>`,
  // The Lombards: the Iron Crown — a band of gold around a nail of iron.
  LMB:
    `<path d="M5.4 9.4h13.2v6.8H5.4Z" ${ACC}/>` +
    `<path d="M5.4 9.4c2.2-.9 4.4-1.3 6.6-1.3s4.4.4 6.6 1.3" fill="none" stroke="${FO}" stroke-width="0.9"/>` +
    `<circle cx="8.2" cy="12.8" r="1" ${SIL}/>` +
    `<circle cx="12" cy="12.8" r="1" ${SIL}/>` +
    `<circle cx="15.8" cy="12.8" r="1" ${SIL}/>` +
    `<path d="M11.3 11h1.4v3.6h-1.4Z" fill="${FO}" stroke="none"/>` +
    `<path d="M10.2 12.1h3.6v1.4h-3.6Z" fill="${FO}" stroke="none"/>`,
  // The Saxons: the two seaxes, points down, the island's new heraldry.
  SAX:
    `<path d="M6.2 4.4c3.2 3.9 4.6 8.4 4.2 13.4l-1.7 2c-.9-5.6-2.3-10.2-4.3-13.9Z" ${SIL}/>` +
    `<path d="M17.8 4.4c-3.2 3.9-4.6 8.4-4.2 13.4l1.7 2c.9-5.6 2.3-10.2 4.3-13.9Z" ${SIL}/>` +
    `<path d="M8.7 17.8l1.7 2M15.3 17.8l-1.7 2" fill="none" stroke="${FG}" stroke-width="1.6" stroke-linecap="round"/>`,
  // The Avar Khaganate: the horse-tail tug before the ring.
  AVA:
    `<path d="M11.2 3.2h1.6v17.4h-1.6Z" ${ACC}/>` +
    `<circle cx="12" cy="4.6" r="1.6" fill="none" stroke="${FG}" stroke-width="1.3"/>` +
    `<path d="M12.8 7.2c2.4.4 3.9 1.6 4.6 3.6-1.6 1.5-3.1 2.6-4.6 3.4M11.2 7.2c-2.4.4-3.9 1.6-4.6 3.6 1.6 1.5 3.1 2.6 4.6 3.4" fill="none" stroke="${FP}" stroke-width="1.6" stroke-linecap="round"/>`,
  // The Sclaveni: the broad axe and the oak sprig of the river peoples.
  SLV:
    `<path d="M11.1 8.2 9.4 20.2h2l1.4-11.6Z" ${SIL}/>` +
    `<path d="M10.6 8.8C9.6 6.7 10 5.1 11.8 4c1.7-1 3.4-1 5.1 0-.6 2.6-2.1 4.2-4.5 4.8Z" ${ACC}/>` +
    `<path d="M6.2 13.2c1.5-.2 2.6.3 3.3 1.5-1.3.8-2.5.7-3.6-.2Z" ${SIL}/>` +
    `<path d="M5.4 16.6c1.3-.4 2.4-.1 3.3.9-1.1 1-2.3 1.1-3.5.4Z" ${SIL}/>`,
  // The Western Turks: the wolf standard of the Ashina above the bow.
  TRK:
    `<path d="M11.2 6.6h1.6v13.6h-1.6Z" ${ACC}/>` +
    `<path d="M9 6.6c-.4-1.9.2-3.2 1.8-3.9l.9 1.5c1-.5 2-.5 3 0l1.3-1.1c.9 1.2.9 2.4 0 3.5-.9 1-2.1 1.4-3.7 1.2C10.9 7.7 9.8 7.3 9 6.6Z" ${SIL}/>` +
    `<circle cx="13.4" cy="4.9" r="0.5" fill="${FO}" stroke="none"/>` +
    `<path d="M6.4 13.4c1.7-1.6 3.6-2.4 5.6-2.4s3.9.8 5.6 2.4l-1.2 1.4c-1.4-1.3-2.9-2-4.4-2s-3 .7-4.4 2Z" ${SIL}/>`,
  // The Bulgar Hordes: the Dulo tamga — IYI, cut on every stone they left.
  BGR:
    `<path d="M6.6 5.4v13.2M17.4 5.4v13.2" fill="none" stroke="${FP}" stroke-width="1.9" stroke-linecap="round"/>` +
    `<path d="M12 9.4v9.2M12 9.4 8.8 5.6M12 9.4l3.2-3.8" fill="none" stroke="${FG}" stroke-width="1.9" stroke-linecap="round"/>`,
  // -- 1948: the real flags, same muted palette as the rest of the chapter --
  FRA:
    `<rect x="0.6" y="0.6" width="7.6" height="22.8" fill="#1d3c6e" stroke="none"/>` +
    `<rect x="8.2" y="0.6" width="7.6" height="22.8" fill="#f2f4f4" stroke="none"/>` +
    `<rect x="15.8" y="0.6" width="7.6" height="22.8" fill="#b5342c" stroke="none"/>`,
  SPA:
    `<rect x="0.6" y="0.6" width="22.8" height="5.7" fill="#b5342c" stroke="none"/>` +
    `<rect x="0.6" y="6.3" width="22.8" height="11.4" fill="#d9a520" stroke="none"/>` +
    `<rect x="0.6" y="17.7" width="22.8" height="5.7" fill="#b5342c" stroke="none"/>` +
    `<path d="M5.2 9.4h4v4.4h-4Z" fill="#b5342c" stroke="none"/>`,
  POR:
    `<rect x="0.6" y="0.6" width="9.1" height="22.8" fill="#1a6a3c" stroke="none"/>` +
    `<rect x="9.7" y="0.6" width="13.7" height="22.8" fill="#b5342c" stroke="none"/>` +
    `<circle cx="9.7" cy="12" r="3.4" fill="none" stroke="#d9a520" stroke-width="1.3"/>` +
    `<circle cx="9.7" cy="12" r="1.3" fill="#f2f4f4" stroke="none"/>`,
  NLD:
    `<rect x="0.6" y="0.6" width="22.8" height="7.6" fill="#b5342c" stroke="none"/>` +
    `<rect x="0.6" y="8.2" width="22.8" height="7.6" fill="#f2f4f4" stroke="none"/>` +
    `<rect x="0.6" y="15.8" width="22.8" height="7.6" fill="#1d3c6e" stroke="none"/>`,
  // §232: the Low Countries' missing pair, in the same flag hand as their
  // neighbors — Belgium's tricolor of 1830, and Luxembourg's, whose pale
  // blue is what tells it from the Dutch banner above.
  BEL:
    `<rect x="0.6" y="0.6" width="7.6" height="22.8" fill="#2b2b30" stroke="none"/>` +
    `<rect x="8.2" y="0.6" width="7.6" height="22.8" fill="#d9a520" stroke="none"/>` +
    `<rect x="15.8" y="0.6" width="7.6" height="22.8" fill="#b5342c" stroke="none"/>`,
  LUX:
    `<rect x="0.6" y="0.6" width="22.8" height="7.6" fill="#b5342c" stroke="none"/>` +
    `<rect x="0.6" y="8.2" width="22.8" height="7.6" fill="#f2f4f4" stroke="none"/>` +
    `<rect x="0.6" y="15.8" width="22.8" height="7.6" fill="#4a8fc7" stroke="none"/>`,
  DEN:
    `<rect x="0.6" y="0.6" width="22.8" height="22.8" rx="3.2" fill="#b5342c" stroke="none"/>` +
    `<path d="M8.8 0.6v22.8M0.6 12h22.8" stroke="#f2f4f4" stroke-width="3.4" fill="none"/>`,
  SWE:
    `<rect x="0.6" y="0.6" width="22.8" height="22.8" rx="3.2" fill="#1d4e9c" stroke="none"/>` +
    `<path d="M8.8 0.6v22.8M0.6 12h22.8" stroke="#d9a520" stroke-width="3.4" fill="none"/>`,
  POL:
    `<rect x="0.6" y="0.6" width="22.8" height="11.4" fill="#f2f4f4" stroke="none"/>` +
    `<rect x="0.6" y="12" width="22.8" height="11.4" fill="#b5342c" stroke="none"/>`,
  CZE:
    `<rect x="0.6" y="0.6" width="22.8" height="11.4" fill="#f2f4f4" stroke="none"/>` +
    `<rect x="0.6" y="12" width="22.8" height="11.4" fill="#b5342c" stroke="none"/>` +
    `<path d="M0.6 0.6 13 12 0.6 23.4Z" fill="#1d3c6e" stroke="none"/>`,
  SOV:
    `<rect x="0.6" y="0.6" width="22.8" height="22.8" rx="3.2" fill="#b5342c" stroke="none"/>` +
    star5(7.4, 5.8, 1.9, '#d9a520') +
    `<path d="M8.2 16.9a5.3 5.3 0 017.2-7.2 6.6 6.6 0 00-4.3 2.9 6.6 6.6 0 00-2.9 4.3Z" fill="#d9a520" stroke="none"/>` +
    `<path d="M9.6 14.5 16.8 7.3l1.5 1.5-7.2 7.2Z" fill="#d9a520" stroke="none"/>` +
    `<path d="M15.5 9.9l2.6 2.6-1.3 1.3-2.6-2.6Z" fill="#d9a520" stroke="none"/>`,
  GER:
    `<rect x="0.6" y="0.6" width="22.8" height="7.6" fill="#141414" stroke="none"/>` +
    `<rect x="0.6" y="8.2" width="22.8" height="7.6" fill="#b5342c" stroke="none"/>` +
    `<rect x="0.6" y="15.8" width="22.8" height="7.6" fill="#d9a520" stroke="none"/>`,
  AUT:
    `<rect x="0.6" y="0.6" width="22.8" height="7.6" fill="#b5342c" stroke="none"/>` +
    `<rect x="0.6" y="8.2" width="22.8" height="7.6" fill="#f2f4f4" stroke="none"/>` +
    `<rect x="0.6" y="15.8" width="22.8" height="7.6" fill="#b5342c" stroke="none"/>`,
  HUN:
    `<rect x="0.6" y="0.6" width="22.8" height="7.6" fill="#b5342c" stroke="none"/>` +
    `<rect x="0.6" y="8.2" width="22.8" height="7.6" fill="#f2f4f4" stroke="none"/>` +
    `<rect x="0.6" y="15.8" width="22.8" height="7.6" fill="#2c7a3f" stroke="none"/>`,
  YUG:
    `<rect x="0.6" y="0.6" width="22.8" height="7.6" fill="#1d4e9c" stroke="none"/>` +
    `<rect x="0.6" y="8.2" width="22.8" height="7.6" fill="#f2f4f4" stroke="none"/>` +
    `<rect x="0.6" y="15.8" width="22.8" height="7.6" fill="#b5342c" stroke="none"/>` +
    star5(12, 12, 3.4, '#b5342c') +
    star5(12, 12, 2.3, '#d9a520'),
  ALB:
    `<rect x="0.6" y="0.6" width="22.8" height="22.8" rx="3.2" fill="#b5342c" stroke="none"/>` +
    `<path d="M12 5.2c1 1.8 2.4 2.7 4.2 2.9l-2.2 1.6 3.8.4-2.8 1.9 3.4 1.2-3.2 1 2.2 2.2-3.2-.6 1 3-3.2-2.4-3.2 2.4 1-3-3.2.6 2.2-2.2-3.2-1 3.4-1.2-2.8-1.9 3.8-.4-2.2-1.6c1.8-.2 3.2-1.1 4.2-2.9Z" fill="#141414" stroke="none"/>`,
  BUL:
    `<rect x="0.6" y="0.6" width="22.8" height="7.6" fill="#f2f4f4" stroke="none"/>` +
    `<rect x="0.6" y="8.2" width="22.8" height="7.6" fill="#2c7a3f" stroke="none"/>` +
    `<rect x="0.6" y="15.8" width="22.8" height="7.6" fill="#b5342c" stroke="none"/>`,
  ROU:
    `<rect x="0.6" y="0.6" width="7.6" height="22.8" fill="#1d3c6e" stroke="none"/>` +
    `<rect x="8.2" y="0.6" width="7.6" height="22.8" fill="#d9a520" stroke="none"/>` +
    `<rect x="15.8" y="0.6" width="7.6" height="22.8" fill="#b5342c" stroke="none"/>`,
  IRL:
    `<rect x="0.6" y="0.6" width="7.6" height="22.8" fill="#2c7a3f" stroke="none"/>` +
    `<rect x="8.2" y="0.6" width="7.6" height="22.8" fill="#f2f4f4" stroke="none"/>` +
    `<rect x="15.8" y="0.6" width="7.6" height="22.8" fill="#d97a30" stroke="none"/>`,
  SUI:
    `<rect x="0.6" y="0.6" width="22.8" height="22.8" rx="3.2" fill="#b5342c" stroke="none"/>` +
    `<path d="M10.4 5.6h3.2v4.8h4.8v3.2h-4.8v4.8h-3.2v-4.8H5.6v-3.2h4.8Z" fill="#f2f4f4" stroke="none"/>`,
  // The off-map seat (SPEC §180): the 48-star field, at chip scale.
  USA:
    `<rect x="0.6" y="0.6" width="22.8" height="22.8" fill="#f2f4f4" stroke="none"/>` +
    `<path d="M0.6 3.9h22.8M0.6 10.4h22.8M0.6 16.9h22.8" stroke="#b5342c" stroke-width="3.3" fill="none"/>` +
    `<rect x="0.6" y="0.6" width="11.4" height="9.1" fill="#1d3c6e" stroke="none"/>` +
    star5(3.6, 3.2, 1.1, '#f2f4f4') +
    star5(8.9, 3.2, 1.1, '#f2f4f4') +
    star5(6.2, 6.6, 1.1, '#f2f4f4'),
  // ---- the political east and south (SPEC §205) ----
  // Same rule as §173: where a court left an emblem it is drawn; where it
  // left none, the thing its neighbors knew it by.
  // Kush: the Meroitic pyramids of the royal cemetery, steep-sided, the
  // sun-disc of Amun of Napata above them.
  KSH:
    `<circle cx="12" cy="5.4" r="2.1" ${ACC}/>` +
    `<path d="M2.9 19.6 7.2 9.8l4.3 9.8Z" ${SIL}/>` +
    `<path d="M8.1 19.6 12 10.6l3.9 9Z" ${SIL}/>` +
    `<path d="M12.5 19.6 16.8 9.8l4.3 9.8Z" ${SIL}/>`,
  // Nubia: the drawn bow of Ta-Seti, the Land of the Bow — the oldest name
  // any neighbor ever gave the middle Nile.
  NOB:
    `<path d="M6.2 4.6c4.4 2.6 6.6 5.1 6.6 7.4s-2.2 4.8-6.6 7.4c-.7.4-1.1.9-1.4 1.6l-1.4-.7c.4-.9 1-1.6 1.9-2.1 3.8-2.3 5.7-4.3 5.7-6.2s-1.9-3.9-5.7-6.2c-.9-.5-1.5-1.2-1.9-2.1l1.4-.7c.3.7.7 1.2 1.4 1.6Z" ${SIL}/>` +
    `<path d="M4.6 3.6v16.8" ${DET}/>` +
    `<path d="M6.8 11.4h10.6v1.2H6.8Z" ${ACC}/>` +
    `<path d="M20.6 12l-4.4-1.9v3.8Z" ${ACC}/>`,
  // The Blemmyes: crossed camel-lances over the desert moon.
  BLM:
    `<path d="M13.1 3.4a4.4 4.4 0 10.1 5.4 5.4 5.4 0 01-.1-5.4Z" ${ACC}/>` +
    `<path d="M5.2 8.4 17.4 20.6M6.4 7.6l1.8 1.8M5.2 8.4l-.6-2.4 2.4.6Z" fill="none" stroke="${FP}" stroke-width="1.7" stroke-linecap="round"/>` +
    `<path d="M18.8 8.4 6.6 20.6M17.6 7.6l-1.8 1.8M18.8 8.4l.6-2.4-2.4.6Z" fill="none" stroke="${FP}" stroke-width="1.7" stroke-linecap="round"/>`,
  // Aksum: the great stele of the royal field, its false door at the foot,
  // the crescent-and-disc of Astar at the crown.
  AXM:
    `<path d="M14.6 4.0a2.9 2.9 0 10-5.2.1 3.6 3.6 0 015.2-.1Z" ${ACC}/>` +
    `<path d="M9.4 20.4V7.6c0-1.6.9-2.6 2.6-2.6s2.6 1 2.6 2.6v12.8Z" ${SIL}/>` +
    `<path d="M10.8 18.2h2.4v2.2h-2.4Z" fill="${FO}" stroke="none"/>` +
    `<path d="M9.4 8.6h5.2M9.4 11.6h5.2M9.4 14.6h5.2" ${DET}/>` +
    `<path d="M6.6 20.4h10.8v1.4H6.6Z" ${ACC}/>`,
  // Saba: the bull's head of Almaqah between the ibex horns of the temple
  // friezes — off every altar from Marib to Sirwah.
  SAB:
    `<path d="M4.6 4.8c2.2.4 3.7 1.5 4.5 3.3l-1.9 1.2C6 7.9 5.1 6.9 4.4 6.3Z" ${ACC}/>` +
    `<path d="M19.4 4.8c-2.2.4-3.7 1.5-4.5 3.3l1.9 1.2c1.2-1.4 2.1-2.4 2.8-3Z" ${ACC}/>` +
    `<path d="M12 6.6c2.6 0 4.2 1.3 4.8 3.9.3 1.4 0 2.9-.9 4.5-.8 1.4-1.4 2.8-1.7 4.2h-4.4c-.3-1.4-.9-2.8-1.7-4.2-.9-1.6-1.2-3.1-.9-4.5.6-2.6 2.2-3.9 4.8-3.9Z" ${SIL}/>` +
    `<circle cx="10.3" cy="11.2" r="0.7" fill="${FO}" stroke="none"/>` +
    `<circle cx="13.7" cy="11.2" r="0.7" fill="${FO}" stroke="none"/>` +
    `<path d="M10.6 16.2h2.8" ${DET}/>`,
  // Himyar: the crowned eagle of the Zafar reliefs over the crescent.
  HMY:
    `<path d="M12 4.2c1 0 1.7.7 1.7 1.6 0 .6-.3 1.1-.7 1.4.8 1.2 1.2 2.8 1.1 4.8-.1 1.9-.6 3.5-1.4 4.7h-1.4c-.8-1.2-1.3-2.8-1.4-4.7-.1-2 .3-3.6 1.1-4.8-.4-.3-.7-.8-.7-1.4 0-.9.7-1.6 1.7-1.6Z" ${SIL}/>` +
    `<path d="M11.2 7.6C9 7.9 7.4 9 6.5 10.9c-.7 1.5-.9 3.2-.5 5.2 1.2-.7 2.1-1.5 2.8-2.5l.5 2.2 1.7-1.2Z" ${SIL}/>` +
    `<path d="M12.8 7.6c2.2.3 3.8 1.4 4.7 3.3.7 1.5.9 3.2.5 5.2-1.2-.7-2.1-1.5-2.8-2.5l-.5 2.2-1.7-1.2Z" ${SIL}/>` +
    `<path d="M16 18.3a4.6 4.6 0 01-8 0c1.3.6 2.6.9 4 .9s2.7-.3 4-.9Z" ${ACC}/>`,
  // Hadramawt: the incense burner of the Shabwa altars, coals alight.
  HDR:
    `<path d="M8.4 9.2h7.2l-1 3.4h-5.2Z" ${SIL}/>` +
    `<path d="M10.9 12.6h2.2v4h-2.2Z" ${SIL}/>` +
    `<path d="M7.4 16.6h9.2v2H7.4Z" ${SIL}/>` +
    `<path d="M9.6 7.4c.3-1 .1-1.8-.5-2.6 1.2.2 1.9.9 2.1 2.1M14.4 7.4c-.3-1-.1-1.8.5-2.6-1.2.2-1.9.9-2.1 2.1" ${DET}/>` +
    `<circle cx="10.2" cy="8.2" r="0.7" ${ACC}/>` +
    `<circle cx="13.8" cy="8.2" r="0.7" ${ACC}/>` +
    `<circle cx="12" cy="7.4" r="0.7" ${ACC}/>`,
  // Oman: the dhow that worked the strait before anyone wrote its name.
  OMA:
    `<path d="M5.2 15.8h13.6l-2.6 3.8H7.8Z" ${SIL}/>` +
    `<path d="M12.6 4.4c3.4 1.9 5.2 4.9 5.4 9l-.9.9H12.6Z" ${ACC}/>` +
    `<path d="M11.4 6.2v8.1" ${DET}/>` +
    `<path d="M4.2 17.4c1.6 1 3.2 1 4.8 0 1.6 1 3.2 1 4.8 0 1.6 1 3.2 1 4.8 0" fill="none" stroke="${FO}" stroke-width="0.7"/>`,
  // Sakastan: the pointed cap of the Saka tigraxauda, tall on every coin
  // and carving that ever named them.
  SAK:
    `<path d="M12 3.2c1.4 2.8 2.2 5.6 2.4 8.4h-4.8c.2-2.8 1-5.6 2.4-8.4Z" ${SIL}/>` +
    `<path d="M8.4 11.6h7.2l1.6 3.4H6.8Z" ${SIL}/>` +
    `<path d="M6.4 15h11.2v1.8c-1.9.9-3.8 1.3-5.6 1.3s-3.7-.4-5.6-1.3Z" ${ACC}/>` +
    `<path d="M8.4 18.4c1.2.5 2.4.7 3.6.7s2.4-.2 3.6-.7v2.2h-7.2Z" ${SIL}/>`,
  // Bactria: the war elephant of the royal tetradrachms.
  GBA:
    `<path d="M5 18.9c.1-3.6 1-6.2 2.8-7.9 1.3-1.2 3-1.8 5-1.8 2.2 0 3.9.7 5.1 2.1 1 1.2 1.5 2.7 1.5 4.5l-1.9 1.2c-.4-.6-.6-1.4-.6-2.4-.9.8-1.4 1.9-1.4 3.2 0 .4 0 .8.1 1.1h-2c-.1-.4-.1-.8-.1-1.2 0-.9.2-1.8.5-2.5h-3.4c-.5.9-.8 2.1-.9 3.7Z" ${SIL}/>` +
    `<path d="M17.5 11.3c.8-.6 1.2-1.4 1.2-2.4-.9.1-1.7.5-2.3 1.1" ${SIL}/>` +
    `<circle cx="15.9" cy="11.8" r="0.4" fill="${FO}" stroke="none"/>` +
    `<path d="M8.6 8.4c.9-2 2.1-3.4 3.7-4.2l.9 1.8c-1.2.6-2.1 1.6-2.8 3" ${ACC}/>`,
  // Chorasmia: the walled oasis of the lower Oxus — towered ramparts square
  // to the desert, the tamga of its kings over the gate.
  CHO:
    `<path d="M4.6 9.4h14.8v10H4.6Z" ${SIL}/>` +
    `<path d="M4.6 9.4V6.8h2.6v2.6M10.7 9.4V6.8h2.6v2.6M16.8 9.4V6.8h2.6v2.6" ${SIL}/>` +
    `<path d="M10.6 19.4v-4.6h2.8v4.6" fill="${FO}" stroke="none"/>` +
    `<path d="M12 3.2v2.4M10.8 4.4h2.4" fill="none" stroke="${FG}" stroke-width="1.3" stroke-linecap="round"/>`,
  // The Hephthalites: the crescent-and-trident tamga of their drachms.
  HEP:
    `<path d="M12 20.2V9.6M7.4 5.2v3.2c0 1.6.9 2.6 2.4 2.9M16.6 5.2v3.2c0 1.6-.9 2.6-2.4 2.9M12 4.6v5" fill="none" stroke="${FP}" stroke-width="1.9" stroke-linecap="round"/>` +
    `<path d="M8.2 17.2a4.6 4.6 0 007.6 0" fill="none" stroke="${FG}" stroke-width="1.7" stroke-linecap="round"/>`,
  // -- 1948: the real flags, same muted palette as the chapter's west --
  ETH:
    `<rect x="0.6" y="0.6" width="22.8" height="7.6" fill="#2c7a3f" stroke="none"/>` +
    `<rect x="0.6" y="8.2" width="22.8" height="7.6" fill="#d9a520" stroke="none"/>` +
    `<rect x="0.6" y="15.8" width="22.8" height="7.6" fill="#b5342c" stroke="none"/>` +
    `<path d="M9.4 8.6c1.7-.9 3.5-.9 5.2 0l1.5 4.2c-.5 1.9-1.5 3-3 3.4h-2.2c-1.5-.4-2.5-1.5-3-3.4Z" fill="#b5342c" stroke="none"/>` +
    `<path d="M12.4 9.2c.9.4 1.5 1.1 1.8 2.1M10.2 14.2h3.6" stroke="#d9a520" stroke-width="0.8" fill="none"/>`,
  YEM:
    `<rect x="0.6" y="0.6" width="22.8" height="22.8" rx="3.2" fill="#b5342c" stroke="none"/>` +
    `<path d="M15.7 7.1a5.6 5.6 0 100 9.8 6.8 6.8 0 010-9.8Z" fill="#f2f4f4" stroke="none"/>` +
    star5(16.2, 12, 1.7, '#f2f4f4'),
  AFG:
    `<rect x="0.6" y="0.6" width="7.6" height="22.8" fill="#141414" stroke="none"/>` +
    `<rect x="8.2" y="0.6" width="7.6" height="22.8" fill="#b5342c" stroke="none"/>` +
    `<rect x="15.8" y="0.6" width="7.6" height="22.8" fill="#2c7a3f" stroke="none"/>` +
    `<circle cx="12" cy="12" r="3.4" fill="none" stroke="#f2f4f4" stroke-width="0.9"/>` +
    `<path d="M10.4 13.6c0-1.9.5-3.2 1.6-4 1.1.8 1.6 2.1 1.6 4Z" fill="#f2f4f4" stroke="none"/>`,
  PAK:
    `<rect x="0.6" y="0.6" width="22.8" height="22.8" rx="3.2" fill="#2c7a3f" stroke="none"/>` +
    `<rect x="0.6" y="0.6" width="5.7" height="22.8" fill="#f2f4f4" stroke="none"/>` +
    `<path d="M16.9 6.7a5.9 5.9 0 100 10.6 7.2 7.2 0 010-10.6Z" fill="#f2f4f4" stroke="none"/>` +
    star5(17.6, 9.4, 1.6, '#f2f4f4'),
  LBR:
    `<rect x="0.6" y="0.6" width="22.8" height="22.8" fill="#f2f4f4" stroke="none"/>` +
    `<path d="M0.6 4.5h22.8M0.6 10.9h22.8M0.6 17.3h22.8" stroke="#b5342c" stroke-width="3.2" fill="none"/>` +
    `<rect x="0.6" y="0.6" width="9.8" height="9.5" fill="#1d3c6e" stroke="none"/>` +
    star5(5.5, 5.3, 2.6, '#f2f4f4'),
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
// `lens` is a chapter's era definition for this court (SPEC §139, §236) for the
// surfaces that draw a court BEFORE there is a game to read — the start
// screen builds its roster out of `tagDef` and used to hand this function the
// bare tag, so a chapter that seats JUD as Galilee on the lake's own blue
// still showed Judaea's menorah on Judaea's deep blue in the one place a
// player picks a chapter. A live game still wins over both.
export function flagChip(tag, DEFINES, size = 20, link = false, game = null, lens = null) {
  const t = String(tag || '');
  const base = (DEFINES && DEFINES.TAGS && DEFINES.TAGS[t]) || {};
  const def = lens && typeof lens === 'object' ? { ...base, ...lens } : base;
  const live = (game && game.tags && game.tags[t]) || null;
  const c = live && Array.isArray(live.color) && live.color.length >= 3 ? live.color
    : Array.isArray(def.color) && def.color.length >= 3 ? def.color : [110, 100, 82];
  const s = Math.max(12, Math.round(Number(size) || 20));
  // Own-key lookups only: tag and t.flag ride saves, and a hand-edited file
  // must fall back to the base emblem (or the text chip), never surface a
  // prototype-chain member as the SVG body.
  const own = (k) => (typeof k === 'string' && Object.prototype.hasOwnProperty.call(FLAGS, k) ? FLAGS[k] : null);
  const body = (live && own(live.flag)) || own(def.flag) || own(t);
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

// One soldier of the land roster (SPEC §191), drawn from the same path data
// the map counters use: a Drilled Spearman on a recruit button is the exact
// silhouette that will fly on that regiment's standard.
export function unitIcon(gen, arm, cls = '') {
  const body = unitGlyphSvg(gen, arm);
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
