// js/data/compendium.js — the canonical era registry (SPEC §71). One source
// of truth for the bookmark ↔ event-chain pairing, in chronological (title
// carousel) order, each chain with the shared generic pool appended exactly as
// the engine plays it. main.js boots from this list and the in-game wiki reads
// it, so the two can never drift. Zero DOM; data-only imports.
import { BOOKMARK_167 } from './bookmark_167bce.js';
import { EVENTS_167 } from './events_167bce.js';
import { EVENTS_167_KINGS } from './events_167bce_kings.js';
import { EVENTS_167_WORLD } from './events_167bce_world.js';
import { EVENTS_167_AFTER } from './events_167bce_after.js';
import { EVENTS_167_EMPIRE } from './events_167bce_empire.js';
import { BOOKMARK_67 } from './bookmark_67bce.js';
import { EVENTS_67 } from './events_67bce.js';
import { EVENTS_67_AFTER } from './events_67bce_after.js';
import { BOOKMARK_40 } from './bookmark_40bce.js';
import { EVENTS_40 } from './events_40bce.js';
import { EVENTS_40_ALTERNATES } from './events_40bce_alternates.js';
import { EVENTS_40_BRIDGE } from './events_40bce_bridge.js';
import { BOOKMARK_66 } from './bookmark_66ce.js';
import { EVENTS_66 } from './events_66ce.js';
import { EVENTS_66_AFTER } from './events_66ce_after.js';
import { EVENTS_66_NATION } from './events_66ce_nation.js';
import { BOOKMARK_132 } from './bookmark_132ce.js';
import { EVENTS_132 } from './events_132ce.js';
import { EVENTS_132_FAITH } from './events_132ce_faith.js';
import { EVENTS_132_WORLD } from './events_132ce_world.js';
import { EVENTS_132_GALILEE } from './events_132ce_galilee.js';
import { EVENTS_132_REDEMPTION } from './events_132ce_redemption.js';
import { EVENTS_132_ENDURE } from './events_132ce_endure.js';
import { EVENTS_132_HOUSE } from './events_132ce_house.js';
import { BOOKMARK_614 } from './bookmark_614ce.js';
import { EVENTS_614 } from './events_614ce.js';
import { EVENTS_614_PERSIA } from './events_614ce_persia.js';
import { EVENTS_614_THIRD } from './events_614ce_third.js';
import { EVENTS_614_POWER } from './events_614ce_power.js';
import { EVENTS_614_DAVID } from './events_614ce_david.js';
import { BOOKMARK_1948 } from './bookmark_1948.js';
import { EVENTS_1948 } from './events_1948.js';
import { EVENTS_1948_REGION } from './events_1948_region.js';
import { EVENTS_1948_LEVANT } from './events_1948_levant.js';
import { EVENTS_1948_QUESTION } from './events_1948_question.js';
import { GENERIC_EVENTS } from './events_generic.js';
import { EVENTS_ANNEX } from './events_annexation.js';

// The shared pool every ANTIQUE chapter plays (SPEC §126). The omens and the
// annexation question travel together: both are keyed on the player rather
// than on a chapter, both ask something any Jewish state large enough to
// conquer will eventually face, and neither belongs to 1948 — which plays the
// omens alone, because a modern state does not rule on circumcision or the
// road. The `maxYear: 1799` on every annexation card is the belt to this
// braces: the registry says where the pool goes, and the cards say when.
const ANTIQUE = EVENTS_ANNEX.concat(GENERIC_EVENTS);

export const ERAS = [
  // The Maccabean chapter carries the royal century beside it (SPEC §106):
  // the wars of Alexander Jannaeus and the nine years of Salome Alexandra.
  { bookmark: BOOKMARK_167, events: EVENTS_167.concat(EVENTS_167_KINGS, EVENTS_167_WORLD, EVENTS_167_AFTER, EVENTS_167_EMPIRE, ANTIQUE) },
  { bookmark: BOOKMARK_67, events: EVENTS_67.concat(EVENTS_67_AFTER, ANTIQUE) },
  { bookmark: BOOKMARK_40, events: EVENTS_40.concat(EVENTS_40_ALTERNATES, EVENTS_40_BRIDGE, ANTIQUE) },
  { bookmark: BOOKMARK_66, events: EVENTS_66.concat(EVENTS_66_AFTER, EVENTS_66_NATION, ANTIQUE) },
  // 132's chain is three packages (SPEC §104): the revolt itself, the
  // Christian thread that runs beside it, and the world spine to 425. They
  // are concatenated HERE rather than inside events_132ce.js so that every
  // content package keeps the zero-import property its header promises, and
  // so the registry stays the one place the pairing is written down.
  { bookmark: BOOKMARK_132, events: EVENTS_132.concat(EVENTS_132_FAITH, EVENTS_132_WORLD, EVENTS_132_GALILEE, EVENTS_132_REDEMPTION, EVENTS_132_ENDURE, EVENTS_132_HOUSE, ANTIQUE) },
  { bookmark: BOOKMARK_614, events: EVENTS_614.concat(EVENTS_614_PERSIA, EVENTS_614_THIRD, EVENTS_614_POWER, EVENTS_614_DAVID, ANTIQUE) },
  // 1948's chain carries the region's own quarrels beside it (SPEC §105):
  // Suez as a crisis rather than a headline, the union coming apart, Eli
  // Cohen, Tehran in 1979, and the northern border it produced.
  { bookmark: BOOKMARK_1948, events: EVENTS_1948.concat(EVENTS_1948_REGION, EVENTS_1948_LEVANT, EVENTS_1948_QUESTION, GENERIC_EVENTS) },
];

// The shared pool by itself (the wiki's "omens and incidents" page tells it
// apart from each chapter's scripted chain).
export { GENERIC_EVENTS };
