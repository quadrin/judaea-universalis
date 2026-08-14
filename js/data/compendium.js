// js/data/compendium.js — the canonical era registry (SPEC §71). One source
// of truth for the bookmark ↔ event-chain pairing, in chronological (title
// carousel) order, each chain with the shared generic pool appended exactly as
// the engine plays it. main.js boots from this list and the in-game wiki reads
// it, so the two can never drift. Zero DOM; data-only imports.
import { BOOKMARK_167 } from './bookmark_167bce.js';
import { EVENTS_167 } from './events_167bce.js';
import { EVENTS_167_KINGS } from './events_167bce_kings.js';
import { EVENTS_167_HELLENIZERS } from './events_167bce_hellenizers.js';
import { EVENTS_167_WORLD } from './events_167bce_world.js';
import { EVENTS_167_REPUBLIC } from './events_167bce_republic.js';
import { EVENTS_167_AFTER } from './events_167bce_after.js';
import { EVENTS_167_EMPIRE } from './events_167bce_empire.js';
import { EVENTS_167_YEARS } from './events_167bce_years.js';
import { EVENTS_167_NEIGHBOURS } from './events_167bce_neighbours.js';
import { BOOKMARK_67 } from './bookmark_67bce.js';
import { EVENTS_67 } from './events_67bce.js';
import { EVENTS_67_WORLD } from './events_67bce_world.js';
import { EVENTS_67_AFTER } from './events_67bce_after.js';
import { EVENTS_67_YEARS } from './events_67bce_years.js';
import { EVENTS_67_NEIGHBOURS } from './events_67bce_neighbours.js';
import { BOOKMARK_40 } from './bookmark_40bce.js';
import { EVENTS_40 } from './events_40bce.js';
import { EVENTS_40_WORLD } from './events_40bce_world.js';
import { EVENTS_40_ALTERNATES } from './events_40bce_alternates.js';
import { EVENTS_40_BRIDGE } from './events_40bce_bridge.js';
import { EVENTS_40_YEARS } from './events_40bce_years.js';
import { EVENTS_40_NEIGHBOURS } from './events_40bce_neighbours.js';
import { BOOKMARK_66 } from './bookmark_66ce.js';
import { EVENTS_66 } from './events_66ce.js';
import { EVENTS_66_WORLD } from './events_66ce_world.js';
import { EVENTS_66_AFTER } from './events_66ce_after.js';
import { EVENTS_66_NATION } from './events_66ce_nation.js';
import { EVENTS_66_SETTLEMENT } from './events_66ce_settlement.js';
import { EVENTS_66_YEARS } from './events_66ce_years.js';
import { EVENTS_66_NEIGHBOURS } from './events_66ce_neighbours.js';
import { BOOKMARK_132 } from './bookmark_132ce.js';
import { EVENTS_132 } from './events_132ce.js';
import { EVENTS_132_FAITH } from './events_132ce_faith.js';
import { EVENTS_132_WORLD } from './events_132ce_world.js';
import { EVENTS_132_WEST } from './events_132ce_west.js';
import { EVENTS_132_GALILEE } from './events_132ce_galilee.js';
import { EVENTS_132_REDEMPTION } from './events_132ce_redemption.js';
import { EVENTS_132_ENDURE } from './events_132ce_endure.js';
import { EVENTS_132_HOUSE } from './events_132ce_house.js';
import { EVENTS_132_KOSIBA } from './events_132ce_kosiba.js';
import { EVENTS_132_YEARS } from './events_132ce_years.js';
import { EVENTS_132_NEIGHBOURS } from './events_132ce_neighbours.js';
import { EVENTS_132_COUNTRY } from './events_132ce_country.js';
import { BOOKMARK_351 } from './bookmark_351ce.js';
import { EVENTS_351 } from './events_351ce.js';
import { EVENTS_351_WORLD } from './events_351ce_world.js';
import { EVENTS_351_COLLAPSE } from './events_351ce_collapse.js';
import { EVENTS_351_YEARS } from './events_351ce_years.js';
import { EVENTS_351_NEIGHBOURS } from './events_351ce_neighbours.js';
import { BOOKMARK_529 } from './bookmark_529ce.js';
import { EVENTS_529 } from './events_529ce.js';
import { EVENTS_529_WORLD } from './events_529ce_world.js';
import { EVENTS_529_ROADS } from './events_529ce_roads.js';
import { EVENTS_529_YEARS } from './events_529ce_years.js';
import { EVENTS_529_NEIGHBOURS } from './events_529ce_neighbours.js';
import { EVENTS_529_COUNTRY } from './events_529ce_country.js';
import { BOOKMARK_614 } from './bookmark_614ce.js';
import { EVENTS_614 } from './events_614ce.js';
import { EVENTS_614_PERSIA } from './events_614ce_persia.js';
import { EVENTS_614_WEST } from './events_614ce_west.js';
import { EVENTS_614_THIRD } from './events_614ce_third.js';
import { EVENTS_614_POWER } from './events_614ce_power.js';
import { EVENTS_614_DAVID } from './events_614ce_david.js';
import { EVENTS_614_YEARS } from './events_614ce_years.js';
import { EVENTS_614_NEIGHBOURS } from './events_614ce_neighbours.js';
import { BOOKMARK_1948 } from './bookmark_1948.js';
import { EVENTS_1948 } from './events_1948.js';
import { EVENTS_1948_REGION } from './events_1948_region.js';
import { EVENTS_1948_COLDWAR } from './events_1948_coldwar.js';
import { EVENTS_1948_ABSORPTION } from './events_1948_absorption.js';
import { EVENTS_1948_LEVANT } from './events_1948_levant.js';
import { EVENTS_1948_QUESTION } from './events_1948_question.js';
import { EVENTS_1948_GULF } from './events_1948_gulf.js';
import { EVENTS_1948_YEARS } from './events_1948_years.js';
import { EVENTS_1948_NEIGHBOURS } from './events_1948_neighbours.js';
import { GENERIC_EVENTS } from './events_generic.js';
import { EVENTS_MARGINALIA } from './events_marginalia.js';
import { EVENTS_ANNEX } from './events_annexation.js';
import { EVENTS_DAVID } from './events_house_of_david.js';
import { EVENTS_STATECRAFT } from './events_statecraft.js';
import { POLITICAL_MAPS } from './political_maps.js';

// What EVERY chapter plays, 1948 included: the omens, and the margins
// (SPEC §223). Marginalia rides BESIDE the generic pool rather than inside it
// because that pool's own era banding — ten antique cards, ten modern, two
// timeless — is an invariant of its own, and a card gated on a province
// belongs to neither band. It is appended LAST so every other card is offered
// its month in exactly the order it was offered before — and the card itself
// takes nothing out of the seeded stream, so the order is all there is to keep.
const SHARED = GENERIC_EVENTS.concat(EVENTS_MARGINALIA);

// The shared pool every ANTIQUE chapter plays on top of it (SPEC §126). The omens and the
// annexation question travel together: both are keyed on the player rather
// than on a chapter, both ask something any Jewish state large enough to
// conquer will eventually face, and neither belongs to 1948 — which plays the
// shared pool alone, because a modern state does not rule on circumcision or
// the road. The `maxYear: 1799` on every annexation card is the belt to this
// braces: the registry says where the pool goes, and the cards say when.
// The house of David travels with them (SPEC §138): the crown of Israel is
// the united monarchy and the united monarchy is David's, so every chapter
// that can proclaim it must also offer a road to the title. Keyed on the
// player's own religion like the annexation question, so it stays shut for
// the Keepers, who reject the claim outright and have no king in their Torah.
// Statecraft travels with them (SPEC §152): the generic pool is twelve cards
// about weather, and once a chapter's scripted chain has run out it is the
// whole remaining game. This pool is the other half of the murmur — the
// decisions a state's own success produces, banded by how large the player has
// grown rather than by year, so a campaign that outruns its sources still has
// something to answer. Antique-only for the same reason the annexation
// question is: tax farmers and desert prophets do not belong to 1948.
const ANTIQUE = EVENTS_ANNEX.concat(EVENTS_DAVID, EVENTS_STATECRAFT, SHARED);

// The political maps ride the registry (SPEC §173), exactly as the event
// pairing does: the bookmarks stay zero-import content packages, and the one
// place the chapter ↔ political-map pairing is written down is here. initGame
// reads `bookmark.political` beneath the chapter's own tables.
function withPolitical(bookmark) {
  bookmark.political = POLITICAL_MAPS[bookmark.id] || null;
  return bookmark;
}

// Every chapter also carries its OWN thin decades (SPEC §240). A chapter's
// scripted chain is its opening crisis; its world package is the empires'
// calendar; and between the two, every one of the nine runs for decades or
// centuries with one dated card every five years and the shared pools filling
// the rest. `events_<era>_years.js` is that gap, chapter by chapter: dated
// cards seated where the chain is thinnest, on the ground the chapter is
// actually played on. They ride at the END of each chain and before the shared
// pools, for §223's reason — every card that was offered its month before this
// section is offered it in the same order afterwards.
// …and the ring around it (SPEC §241). §240 filled each chapter's thin decades
// with its own institutions; this is the other half of the same hole — the
// courts a courier can reach in three days, which the world packages (empires)
// and the years packages (the realm) both step over. `events_<era>_neighbours.js`
// rides after the years package for §223's reason: everything offered its month
// before this section is still offered it in the same order.
export const ERAS = [
  // The Maccabean chapter carries the royal century beside it (SPEC §106):
  // the wars of Alexander Jannaeus and the nine years of Salome Alexandra.
  // The republic package is the world spine's western half (SPEC §111
  // continued): Macedonia, Numantia, the Gracchi, the Cimbri, the Social
  // War, Sulla and Spartacus — the century in which Rome became the thing
  // the next chapter opens on.
  { bookmark: withPolitical(BOOKMARK_167), events: EVENTS_167.concat(EVENTS_167_KINGS, EVENTS_167_WORLD, EVENTS_167_REPUBLIC, EVENTS_167_AFTER, EVENTS_167_EMPIRE, EVENTS_167_HELLENIZERS, EVENTS_167_YEARS, EVENTS_167_NEIGHBOURS, ANTIQUE) },
  { bookmark: withPolitical(BOOKMARK_67), events: EVENTS_67.concat(EVENTS_67_WORLD, EVENTS_67_AFTER, EVENTS_67_YEARS, EVENTS_67_NEIGHBOURS, ANTIQUE) },
  { bookmark: withPolitical(BOOKMARK_40), events: EVENTS_40.concat(EVENTS_40_WORLD, EVENTS_40_ALTERNATES, EVENTS_40_BRIDGE, EVENTS_40_YEARS, EVENTS_40_NEIGHBOURS, ANTIQUE) },
  { bookmark: withPolitical(BOOKMARK_66), events: EVENTS_66.concat(EVENTS_66_WORLD, EVENTS_66_AFTER, EVENTS_66_NATION, EVENTS_66_SETTLEMENT, EVENTS_66_YEARS, EVENTS_66_NEIGHBOURS, ANTIQUE) },
  // 132's chain is three packages (SPEC §104): the revolt itself, the
  // Christian thread that runs beside it, and the world spine to 425. They
  // are concatenated HERE rather than inside events_132ce.js so that every
  // content package keeps the zero-import property its header promises, and
  // so the registry stays the one place the pairing is written down.
  // The west package is the spine's other frontier — Abritus, Adrianople,
  // the frozen Rhine and the sack of 410, arriving on the same clock.
  { bookmark: withPolitical(BOOKMARK_132), events: EVENTS_132.concat(EVENTS_132_FAITH, EVENTS_132_WORLD, EVENTS_132_WEST, EVENTS_132_GALILEE, EVENTS_132_REDEMPTION, EVENTS_132_ENDURE, EVENTS_132_HOUSE, EVENTS_132_KOSIBA, EVENTS_132_YEARS, EVENTS_132_NEIGHBOURS, EVENTS_132_COUNTRY, ANTIQUE) },
  // The rising against Gallus (SPEC §235): the chapter whose antagonist is a
  // century rather than an army. Its own chain runs 351–429 — the arms, the
  // Patriarch, the calendar and Julian's offer — and the world package beside
  // it is the age's own calendar on the age's own clock, from Mursa to the
  // morning the Goths were inside Rome. Concatenated HERE rather than inside
  // events_351ce.js so both packages keep the zero-import property their
  // headers promise, and so the registry stays the one place the pairing is
  // written down.
  // The collapse package (SPEC §238) is the western half of this chapter's
  // world spine: the five courts that come out of Rome between 395 and 439,
  // on the map rather than in a modifier. It rides beside the world package
  // for the same reason 132's three packages do — one chapter, one registry
  // line, and every content file keeps its zero-import promise.
  { bookmark: withPolitical(BOOKMARK_351), events: EVENTS_351.concat(EVENTS_351_WORLD, EVENTS_351_COLLAPSE, EVENTS_351_YEARS, EVENTS_351_NEIGHBOURS, ANTIQUE) },
  // The Keepers (SPEC §136): the one chapter whose player is not Jewish. It
  // plays the shared antique pool like its neighbours — the omens belong to
  // anybody, and a Samaritan state large enough to conquer faces the same
  // question about the conquered that a Jewish one does. `jewishCrown` in the
  // annexation package gates itself on the crown's own religion, so the cards
  // simply stay shut for a court that keeps a different Torah, which is the
  // honest answer until somebody writes the Samaritan version of them.
  // The roads package (SPEC §151) is the 531–614 tail: the terminals the
  // opening chain's five roads were declared open for, plus the three forks
  // §136 charted and left empty — Ctesiphon, the Jews, and the Taheb.
  // The world package (SPEC §104's rule) is the age's own calendar — the
  // successions Justinian's court never scripted, from Gelimer's coup to
  // Heraclius' fleet, ending exactly where the roads package picks up.
  { bookmark: withPolitical(BOOKMARK_529), events: EVENTS_529.concat(EVENTS_529_WORLD, EVENTS_529_ROADS, EVENTS_529_YEARS, EVENTS_529_NEIGHBOURS, EVENTS_529_COUNTRY, ANTIQUE) },
  // The west package is the same century seen from Toledo, Paris and the
  // Danube — Sisebut's edict to the Seventeenth Council, with Whitby and
  // the Bulgars between.
  { bookmark: withPolitical(BOOKMARK_614), events: EVENTS_614.concat(EVENTS_614_PERSIA, EVENTS_614_WEST, EVENTS_614_THIRD, EVENTS_614_POWER, EVENTS_614_DAVID, EVENTS_614_YEARS, EVENTS_614_NEIGHBOURS, ANTIQUE) },
  // 1948's chain carries the region's own quarrels beside it (SPEC §105):
  // Suez as a crisis rather than a headline, the union coming apart, Eli
  // Cohen, Tehran in 1979, and the northern border it produced. The cold
  // war package is the superpowers' own weather — Berlin to the flag
  // coming down — that the chapter's arms deals and aliyah waves hang from.
  { bookmark: withPolitical(BOOKMARK_1948), events: EVENTS_1948.concat(EVENTS_1948_ABSORPTION, EVENTS_1948_REGION, EVENTS_1948_COLDWAR, EVENTS_1948_LEVANT, EVENTS_1948_QUESTION, EVENTS_1948_GULF, EVENTS_1948_YEARS, EVENTS_1948_NEIGHBOURS, SHARED) },
];

// The shared pool by itself (the wiki's "omens and incidents" page tells it
// apart from each chapter's scripted chain).
export { GENERIC_EVENTS };
