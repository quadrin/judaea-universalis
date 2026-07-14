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
  // Judaea: the ritual chalice of the Year One shekels, pearled gold rim.
  JUD:
    `<circle cx="8.2" cy="5.3" r="0.8" ${ACC}/>` +
    `<circle cx="12" cy="4.8" r="0.8" ${ACC}/>` +
    `<circle cx="15.8" cy="5.3" r="0.8" ${ACC}/>` +
    `<rect x="5.9" y="6.8" width="12.2" height="1.8" rx="0.9" ${ACC}/>` +
    `<path d="M6.6 8.6h10.8c-.4 3.7-2.2 5.7-5.4 6.2-3.2-.5-5-2.5-5.4-6.2Z" ${SIL}/>` +
    `<path d="M11.1 14.8h1.8v2.2h-1.8Z" ${SIL}/>` +
    `<path d="M8.4 19.8c.6-1.9 1.8-2.8 3.6-2.8s3 .9 3.6 2.8Z" ${SIL}/>` +
    `<path d="M8.8 10.1c.4 1.9 1.5 3.1 3.2 3.6" ${DET}/>`,
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
  // Ptolemies: the eagle standing on a thunderbolt (tetradrachm reverse) —
  // hooked beak, deep chest, gold wing folded across the back to the tail.
  PTO:
    `<path d="M3.9 19.2 7.6 17.8 6.8 19.2h10.4l-.8-1.4 3.7 1.4-3.7 1.4.8-1.4H6.8l.8 1.4Z" ${ACC}/>` +
    `<path d="M8.7 5.3c.1-1.1 1-1.9 2.2-1.9 1.2 0 2.1.8 2.2 1.9l.1.5c2.1 1.5 3.2 3.7 3.4 6.6.1 1.8-.2 3.5-1 5.1l-1.6-1.2.4 1.7h-4.1c-1-1.8-1.4-3.7-1.3-5.9.1-1.5.4-2.8.9-4.1-.7-.5-1.1-1.4-1.2-2.7Z" ${SIL}/>` +
    `<path d="M8.9 4.6c-1.1 0-2 .5-2.6 1.3.8.6 1.7.8 2.7.5l-.3 1 1.1-.7Z" ${ACC}/>` +
    `<path d="M12.1 7.3c2 .9 3.4 2.5 4.3 4.8.5 1.4.7 2.7.5 4-1.6-.6-2.9-1.7-3.8-3.3-.8-1.6-1.2-3.4-1-5.5Z" ${ACC}/>` +
    `<path d="M10.7 17.5v1.2M12.7 17.5v1.2" ${DET}/>` +
    `<circle cx="10.2" cy="5" r="0.45" fill="${FO}" stroke="none"/>`,
  // Parthia: the strung recurve bow and arrow of the Arsacid drachms.
  PAR:
    `<path d="M15.2 3.4c-5 1.9-7.5 4.8-7.5 8.6s2.5 6.7 7.5 8.6c.7.3 1.2.7 1.6 1.3l1.2-.9c-.5-.8-1.2-1.4-2.1-1.8-4.3-1.7-6.4-4.1-6.4-7.2s2.1-5.5 6.4-7.2c.9-.4 1.6-1 2.1-1.8L16.8 2.1c-.4.6-.9 1-1.6 1.3Z" ${SIL}/>` +
    `<path d="M17.4 3.2v17.6" ${DET}/>` +
    `<path d="M7.9 11.4h9v1.2h-9Z" ${ACC}/>` +
    `<path d="M3.7 12l4.6-1.9v3.8Z" ${ACC}/>`,
  // Nabataea: the caravan camel of Petra, gold ground line.
  NAB:
    `<path d="M5.9 7.9c0-1.1.8-1.9 1.9-1.9 1 0 1.7.6 1.9 1.6.2 1.1.2 2.2 0 3.3l-.2 1.1c.7-.5 1.5-.9 2.4-1.1.6-1.6 1.7-2.4 3.2-2.4s2.6.8 3.2 2.3c.5 1.3.4 2.6-.3 3.9-.2.4-.5.8-.9 1.1l.1 3.6h-1.4l-.2-3h-2.6l-.1 3h-1.4l-.1-3.2c-.7-.2-1.3-.6-1.7-1.1l.1 4.3H8.4l-.2-5.6c-.4-.9-.5-1.9-.3-3l.1-.8c-1.2-.1-2.1-1-2.1-2.1Z" ${SIL}/>` +
    `<path d="M4.4 19.7h15.2" fill="none" stroke="${FG}" stroke-width="1.3" stroke-linecap="round"/>` +
    `<circle cx="7.4" cy="7.2" r="0.45" fill="${FO}" stroke="none"/>` +
    `<path d="M12.9 11c.4-.9 1.2-1.4 2.3-1.4" ${DET}/>`,
  // Armenia: the Artaxiad eagle, wings spread wide beneath the gold star.
  ARM:
    `<path d="M12 2.2l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9Z" ${ACC}/>` +
    `<path d="M11.4 12.2c-2.6.5-5.1 0-7.5-1.6.1 3.3 1.9 5.4 5.4 6.5.9-1.1 1.6-2.7 2.1-4.9Z" ${SIL}/>` +
    `<path d="M12.6 12.2c2.6.5 5.1 0 7.5-1.6-.1 3.3-1.9 5.4-5.4 6.5-.9-1.1-1.6-2.7-2.1-4.9Z" ${SIL}/>` +
    `<path d="M12 10.6c1.3 1 1.9 2.5 1.9 4.4 0 1.7-.6 3.3-1.9 4.7-1.3-1.4-1.9-3-1.9-4.7 0-1.9.6-3.4 1.9-4.4Z" ${SIL}/>` +
    `<circle cx="12" cy="9.7" r="1.35" ${SIL}/>` +
    `<path d="M9.4 15.4c-1.4-.2-2.6-.7-3.7-1.6M14.6 15.4c1.4-.2 2.6-.7 3.7-1.6" ${DET}/>`,

  // Hyrcanus' Judaea: the palm branch of the high-priestly coins — paired
  // fronds on a straight stem over a gold base.
  HYR:
    `<path d="M11.2 19.6V8h1.6v11.6Z" ${SIL}/>` +
    `<path d="M11.6 8.4C9.7 7.6 8.8 6.2 8.8 4.1c2.1.6 3.2 2 3.2 4.3Z" ${SIL}/>` +
    `<path d="M12.4 8.4c1.9-.8 2.8-2.2 2.8-4.3-2.1.6-3.2 2-3.2 4.3Z" ${SIL}/>` +
    `<path d="M11.6 11.6c-2.5-.5-4-1.7-4.7-3.7 2.6.1 4.2 1.4 4.7 3.7Z" ${SIL}/>` +
    `<path d="M12.4 11.6c2.5-.5 4-1.7 4.7-3.7-2.6.1-4.2 1.4-4.7 3.7Z" ${SIL}/>` +
    `<path d="M11.6 14.8c-2.9-.4-4.7-1.5-5.5-3.4 2.9 0 4.7 1.2 5.5 3.4Z" ${SIL}/>` +
    `<path d="M12.4 14.8c2.9-.4 4.7-1.5 5.5-3.4-2.9 0-4.7 1.2-5.5 3.4Z" ${SIL}/>` +
    `<rect x="8.4" y="19" width="7.2" height="1.9" rx="0.9" ${ACC}/>`,
  // Aristobulus' Judaea: the diadem beneath the star of the royal coinage.
  ARI:
    `<path d="M12 2.9l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1Z" ${ACC}/>` +
    `<path d="M4.4 15.2c2.3-2.6 4.8-3.9 7.6-3.9s5.3 1.3 7.6 3.9l-1.1 1.8c-2-2.3-4.1-3.5-6.5-3.5s-4.5 1.2-6.5 3.5Z" ${ACC}/>` +
    `<circle cx="12" cy="12.9" r="1.7" ${SIL}/>` +
    `<path d="M5.2 16.2c-.8 1.6-.9 3.4-.3 5.3l1.5-.7c-.5-1.5-.4-2.9.2-4.2Z" ${SIL}/>` +
    `<path d="M18.8 16.2c.8 1.6.9 3.4.3 5.3l-1.5-.7c.5-1.5.4-2.9-.2-4.2Z" ${SIL}/>`,

  // Herod's Judaea: the anchor of the Herodian coinage.
  HER:
    `<path d="M12 4.2c.9 0 1.6.7 1.6 1.6S12.9 7.4 12 7.4s-1.6-.7-1.6-1.6.7-1.6 1.6-1.6Zm0 1a.6.6 0 100 1.2.6.6 0 000-1.2Z" ${ACC}/>` +
    `<path d="M11.3 7.4h1.4v10h-1.4Z" ${SIL}/>` +
    `<path d="M8.2 9.4h7.6v1.4H8.2Z" ${SIL}/>` +
    `<path d="M12 20.4c-3-.9-4.9-2.7-5.7-5.4l1.7-.5c.6 2 2 3.4 4 4.1 2-.7 3.4-2.1 4-4.1l1.7.5c-.8 2.7-2.7 4.5-5.7 5.4Z" ${SIL}/>`,
  // Antigonus' Judaea: the seven-branched lampstand of his last coins.
  ATG:
    `<path d="M11.3 6h1.4v10.4h-1.4Z" ${ACC}/>` +
    `<path d="M6 8.4c0 3 .9 4.9 2.7 5.9l.7-1.2C8 12.3 7.4 10.8 7.4 8.4Zm3 0c0 2.2.5 3.6 1.6 4.5l.7-1.2c-.7-.6-1-1.7-1-3.3Z" ${SIL}/>` +
    `<path d="M18 8.4c0 3-.9 4.9-2.7 5.9l-.7-1.2c1.4-.8 2-2.3 2-4.7Zm-3 0c0 2.2-.5 3.6-1.6 4.5l-.7-1.2c.7-.6 1-1.7 1-3.3Z" ${SIL}/>` +
    `<path d="M9 16.4h6v1.4H9Z" ${SIL}/>` +
    `<path d="M8 18.6h8v1.6H8Z" ${ACC}/>`,

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
  // Israel: the shield of David — two interlocked triangles.
  ISR:
    `<path d="M12 4.5 17.8 14.6H6.2Z" fill="none" ${S} stroke="${FP}" stroke-width="1.5"/>` +
    `<path d="M12 19.5 6.2 9.4h11.6Z" fill="none" ${S} stroke="${FG}" stroke-width="1.5"/>`,
};

function escText(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Country chip: rounded rect in the tag's color (CSS .fchip layers a subtle
// top-sheen gradient over the background-color set here), thin gold border,
// two-tone emblem centered on the field. Falls back to the 3-letter tag when
// no emblem exists. `size` is the chip's edge in px.
export function flagChip(tag, DEFINES, size = 20) {
  const t = String(tag || '');
  const def = (DEFINES && DEFINES.TAGS && DEFINES.TAGS[t]) || {};
  const c = Array.isArray(def.color) && def.color.length >= 3 ? def.color : [110, 100, 82];
  const s = Math.max(12, Math.round(Number(size) || 20));
  const body = FLAGS[t];
  const inner = body
    ? `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`
    : `<span class="fchip-abbr">${escText(t || '—')}</span>`;
  return `<span class="fchip" style="background-color:rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0});width:${s}px;height:${s}px" aria-label="${escText(def.name || t)}">${inner}</span>`;
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
