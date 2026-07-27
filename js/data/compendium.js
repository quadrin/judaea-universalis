// js/data/compendium.js — the canonical era registry (SPEC §71). One source
// of truth for the bookmark ↔ event-chain pairing, in chronological (title
// carousel) order, each chain with the shared generic pool appended exactly as
// the engine plays it. main.js boots from this list and the in-game wiki reads
// it, so the two can never drift. Zero DOM; data-only imports.
import { BOOKMARK_167 } from './bookmark_167bce.js';
import { EVENTS_167 } from './events_167bce.js';
import { EVENTS_167_KINGS } from './events_167bce_kings.js';
import { EVENTS_167_WORLD } from './events_167bce_world.js';
import { BOOKMARK_67 } from './bookmark_67bce.js';
import { EVENTS_67 } from './events_67bce.js';
import { BOOKMARK_40 } from './bookmark_40bce.js';
import { EVENTS_40 } from './events_40bce.js';
import { BOOKMARK_66 } from './bookmark_66ce.js';
import { EVENTS_66 } from './events_66ce.js';
import { BOOKMARK_132 } from './bookmark_132ce.js';
import { EVENTS_132 } from './events_132ce.js';
import { EVENTS_132_FAITH } from './events_132ce_faith.js';
import { EVENTS_132_WORLD } from './events_132ce_world.js';
import { BOOKMARK_614 } from './bookmark_614ce.js';
import { EVENTS_614 } from './events_614ce.js';
import { EVENTS_614_PERSIA } from './events_614ce_persia.js';
import { BOOKMARK_1948 } from './bookmark_1948.js';
import { EVENTS_1948 } from './events_1948.js';
import { EVENTS_1948_REGION } from './events_1948_region.js';
import { GENERIC_EVENTS } from './events_generic.js';

export const ERAS = [
  // The Maccabean chapter carries the royal century beside it (SPEC §106):
  // the wars of Alexander Jannaeus and the nine years of Salome Alexandra.
  { bookmark: BOOKMARK_167, events: EVENTS_167.concat(EVENTS_167_KINGS, EVENTS_167_WORLD, GENERIC_EVENTS) },
  { bookmark: BOOKMARK_67, events: EVENTS_67.concat(GENERIC_EVENTS) },
  { bookmark: BOOKMARK_40, events: EVENTS_40.concat(GENERIC_EVENTS) },
  { bookmark: BOOKMARK_66, events: EVENTS_66.concat(GENERIC_EVENTS) },
  // 132's chain is three packages (SPEC §104): the revolt itself, the
  // Christian thread that runs beside it, and the world spine to 425. They
  // are concatenated HERE rather than inside events_132ce.js so that every
  // content package keeps the zero-import property its header promises, and
  // so the registry stays the one place the pairing is written down.
  { bookmark: BOOKMARK_132, events: EVENTS_132.concat(EVENTS_132_FAITH, EVENTS_132_WORLD, GENERIC_EVENTS) },
  { bookmark: BOOKMARK_614, events: EVENTS_614.concat(EVENTS_614_PERSIA, GENERIC_EVENTS) },
  // 1948's chain carries the region's own quarrels beside it (SPEC §105):
  // Suez as a crisis rather than a headline, the union coming apart, Eli
  // Cohen, Tehran in 1979, and the northern border it produced.
  { bookmark: BOOKMARK_1948, events: EVENTS_1948.concat(EVENTS_1948_REGION, GENERIC_EVENTS) },
];

// The shared pool by itself (the wiki's "omens and incidents" page tells it
// apart from each chapter's scripted chain).
export { GENERIC_EVENTS };
