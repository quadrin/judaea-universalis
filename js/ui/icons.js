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
