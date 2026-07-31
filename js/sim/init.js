// Judaea Universalis — sim entry: initGame / makeCtx / gameActions / simHelpers
// (SPEC §6.1, §6.2, §6.4, §6.6). DOM-free; imports only core/rng + sim siblings.

import { createRng } from '../core/rng.js';
import {
  num, clamp, B, armiesOf, spawnArmy, removeArmy, disbandArmyCore, changeOwnerCore, changeControllerCore, resolveDisplayName,
  declareWar, issueMove, mergeInto, recruitRegiment, canEnter, regCount,
  peaceDealInfo, evaluatePeaceDeal, executePeaceDeal,
  DIPLO, opinionOf, addOpinion, diploCdActive, diploCdMonthsLeft, setDiploCd,
  liveGrudge, grudgeCeiling, grudgeCeilingRaw, contentForTag, livingTag, tagDef,
  isOffmapTag, armsSupplierOf, armsDealState, armsGate, isArsenal, armsMarketOn,
  thawProgress, thawQuiet, reconciled, haveAffinity,
  declaredRivals, rivalDeclareInfo, declareRivalCore, renounceRivalCore, reconcileRivalryCore,
  retireAffinityCore, secedeTagCore,
  allianceBarred, recognized, recognitionInfo, recognizeCore, renounceRecognitionCore, recognizeCd,
  sharedWarEnemy, breakAllianceCore, truceKey, truceActive,
  incorporateInfo, incorporateCore, royalMarriageInfo, royalMarriageCore,
  clientOfferInfo, offerClientshipCore,
  assaultInfo, doAssault, splitArmyCore, rollGeneral,
  casusBelli, claimFabricationInfo, startClaimFabrication,
  sideComponents, warGoalInfo, monthsBetween, armiesInProv, devTotal, battleInfo, endWarBySword, GENERAL_NAMES, courtNamePool, engageIfNeeded,
  chronicle as chronicleCore, modernizeInfo, modernizeArmyCore, tagGen, switchTagCore,
  hasAirfield, airWingsAt, airWingsOf, raiseAirWing, rebaseAirWing, raidTargets, airRaidCore, orderAirRaid,
  hireWingLeaderCore, withdrawFromBattle, buildingFace, mechanicOn,
} from './military.js';
import { FORMABLES } from '../data/formables.js';
import { IDEA_TREES, ideaCost, applyReformsToTag } from '../data/ideas.js';
import { eraIdeaGroupsFor, eraIdeaUnlocked, eraIdeaCost, ERA_IDEA_TIERS } from '../data/era_ideas.js';
import { TECH_CATEGORIES, TECH_MAX, techCost, eraBaseline, aheadMult, UNIT_GENS, unlockedGen, cappedGen, techCeiling, genName, computeTechEffects, DOCTRINES, techLevelName } from '../data/tech.js';
import {
  isCoastal, buildShipCore, issueFleetMove, embarkCore, disembarkCore, fleetsAt, seaHopDays,
  navalGen, modernizeFleetInfo, modernizeFleetCore, hireAdmiralCore,
  merchantShipInfo, commissionMerchantShipCore, merchantShipsOf,
  merchantDestinations, sendMerchantCore, merchantVoyagesOf,
  tradeRunDestinations, sendTradeRunCore,
} from './navy.js';
import { navalGenName } from '../data/tech.js';
import { maxManpowerOf, explainIncome, incomeBreakdown, LOAN_SIZE, LOAN_INTEREST_PER_MONTH, MAX_LOANS, developInfo, developCore, DEV_KINDS, settlementInfo, settlementStart, expeditionInfo, expeditionStart, annexInfo, annexCore } from './economy.js';
import { explainUnrest } from './unrest.js';
import { rulerDies, missionsFor, missionId, isMissionTree, missionDoneSet, missionUnlocked } from './realm.js';
import { crisisReport } from './crisis.js';
import { embargoInfo, declareEmbargoCore, liftEmbargoCore, embargoesOn } from './embargo.js';
import { factionApproval, shiftFaction, appeaseFactionCore, getFactionsInfo } from './factions.js';
import { nextWorldEvent, resolveEventOption, fireEvent as fireEventCore } from './events.js';
import { armsInfo, signArmsDealCore, setArmsDeal as setArmsDealCore, seedArmsDeals } from './arms.js';
import { seedPop, popTotal, popTension, addPopulation, communityLabel } from './population.js';
import { campaignGuidance } from '../data/campaign_guidance.js';
import { queuedUnitCount, unitRecruitMonths } from './recruitment.js';
import { buildProvinceMapping } from '../data/map_profile.js';
import { sendAiCounteroffer } from './ai.js';
import { traceSupply, supplyPenaltyText, supplyReasonText, supplyExempt } from './supply.js';
import { chapterView } from './chapters.js';
import { axisOf, pushDoctrine, doctrineView, doctrineEpithet } from './doctrine.js';
import { divergenceView, divergenceSummary } from './divergence.js';
import {
  institutionMult, institutionsReport, embraceCore, embraceInfo, ensureInstitutions,
} from './institutions.js';
import { standingOf, standingTable } from './standing.js';
import { getCourtInfo } from './courts.js';
import { intrigueMenu, runIntrigue as runIntrigueCore } from './intrigue.js';
import { ageReport, absorbReport } from './ages.js';
import { estateReport } from './estates.js';
import { sacredReport, seatHighPriest as seatHighPriestCore, pilgrimageIncome } from './sacred.js';
import { climateReport, attentionReport, harvestOdds } from './weather.js';
import { communityInfo, diasporaReport, askCommunity as askCommunityCore } from './diaspora.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/init]', ...args);
}

function inferredHabitation(owner, dev) {
  if (owner === 'WASTE') return 'uninhabited';
  const total = num(dev && dev.tax) + num(dev && dev.prod) + num(dev && dev.mp);
  if (total >= 24) return 'urban';
  if (total >= 14) return 'town';
  return 'rural';
}

function bookmarkField(bookmark, field, source, inheritParent = true) {
  const table = bookmark && bookmark[field];
  if (!table || !source) return undefined;
  if (Object.prototype.hasOwnProperty.call(table, source.name)) return table[source.name];
  if (inheritParent && source.latentParent
      && Object.prototype.hasOwnProperty.call(table, source.latentParent)) {
    return table[source.latentParent];
  }
  return undefined;
}

// The era's political map (SPEC §173): a second overlay UNDER the chapter's
// own tables, attached by the registry (compendium.js sets bookmark.political)
// so the bookmarks keep their zero-import property and the registry stays the
// one place the pairing is written down. Chapter first, political map second,
// base atlas last — a chapter can always overrule a cell, and the base atlas
// stays WASTE. Same latentParent inheritance as bookmarkField.
//
// `political === undefined` means the bookmark never went through the
// registry (a consumer imported the bookmark file directly) — which boots a
// world with an unowned west and no levy table, silently. Warn once: the two
// suites that legitimately boot raw import compendium for the attachment.
function politicalField(bookmark, field, source) {
  if (bookmark && bookmark.political === undefined) {
    warnOnce('political:' + (bookmark.id || '?'),
      'bookmark', bookmark.id, 'has no political attachment — booted outside '
      + 'the registry? compendium.js attaches the SPEC §173 maps');
  }
  return bookmarkField(bookmark && bookmark.political, field, source);
}

function makeProvinceState({ DEFINES, MAP_DATA, geom, bookmark, source, id }) {
  const s = source || {};
  let x = 0, y = 0;
  const c = geom && geom.centroids && geom.centroids[id];
  if (c && Number.isFinite(c.x) && Number.isFinite(c.y)) {
    x = c.x; y = c.y;
  } else if (MAP_DATA && typeof MAP_DATA.project === 'function') {
    const xy = MAP_DATA.project(num(s.lon), num(s.lat));
    x = num(xy && xy[0]); y = num(xy && xy[1]);
  }

  const impassableOverride = bookmarkField(bookmark, 'impassable', s);
  const impassable = typeof impassableOverride === 'boolean' ? impassableOverride : !!s.impassable;
  const fort = Math.max(0, s.fort | 0);
  const maxGarrison = fort * B({ DEFINES }, 'fortGarrisonPerLevel', 1000);
  const eraName = bookmarkField(bookmark, 'provinceNames', s, false) || null;
  const dt = bookmarkField(bookmark, 'devTweaks', s) || null;
  const owner = bookmarkField(bookmark, 'owners', s)
    || politicalField(bookmark, 'owners', s) || s.owner || 'WASTE';
  // The levy share (SPEC §173): what this owner can actually draw on here.
  // 1 wherever neither the chapter nor the political map says otherwise —
  // which is every province the eight campaigns were tuned against.
  const levyOverride = bookmarkField(bookmark, 'levies', s);
  const levy = Number.isFinite(levyOverride) ? levyOverride
    : num(politicalField(bookmark, 'levies', s), 1);
  const dev = {
    tax: num(dt && dt.tax, num(s.dev && s.dev.tax)),
    prod: num(dt && dt.prod, num(s.dev && s.dev.prod)),
    mp: num(dt && dt.mp, num(s.dev && s.dev.mp)),
  };
  const habitation = bookmarkField(bookmark, 'habitation', s)
    || s.habitation || inferredHabitation(owner, dev);
  const settleableOverride = bookmarkField(bookmark, 'settleable', s);

  const out = {
    id, name: eraName || s.name || ('Province ' + id), canon: s.name || ('Province ' + id), x, y,
    // A bookmark may re-good a province (SPEC §52): the wells of the ancient
    // caravan country pump oil in 1948.
    terrain: bookmarkField(bookmark, 'terrains', s) || s.terrain,
    good: bookmarkField(bookmark, 'goods', s) || s.good,
    religion: bookmarkField(bookmark, 'religions', s)
      || politicalField(bookmark, 'religions', s) || s.religion,
    culture: bookmarkField(bookmark, 'cultures', s)
      || politicalField(bookmark, 'cultures', s) || s.culture,
    dev,
    owner,
    controller: owner,
    levy,
    habitation,
    settleable: typeof settleableOverride === 'boolean' ? settleableOverride : s.settleable !== false,
    autonomy: 0.25, unrest: 0, revoltProgress: 0,
    integration: 0, integrating: null, // the long work of making subjects citizens (SPEC §56)
    fort, garrison: maxGarrison, maxGarrison,
    siege: null, modifiers: [],
    // Pre-existing works (SPEC §58): a bookmark may seed buildings — Herod's
    // harbor at Caesarea, the 1948 airfields — via a `buildings` overlay.
    buildings: (bookmarkField(bookmark, 'buildings', s) || []).slice(),
    construction: null,
    unitQueue: [],
    conversion: null,
    settlement: null, // {by, monthsLeft, toTier} while a settlement project runs (SPEC §43)
    expedition: null, // {by, men} while a camp holds unclaimed waste (SPEC §64)
    holy: s.holy || null,
    wonder: (bookmark && bookmark.wonderTweaks
      && Object.prototype.hasOwnProperty.call(bookmark.wonderTweaks, s.name))
      ? bookmark.wonderTweaks[s.name] : (s.wonder || null),
    impassable,
  };
  // Who actually lives here (SPEC §56): a bookmark `pops` share table for
  // the mixed cities, a homogeneous majority everywhere else. The largest
  // community names the province's religion and culture.
  const mix = bookmarkField(bookmark, 'pops', s) || null;
  seedPop(out, mix, bookmark && bookmark.popMult);
  return out;
}

// ------------------------------------------------------------------ initGame
export function initGame({ DEFINES, MAP_DATA, geom, bookmark, events, playerTag, rngSeed, provinceMap, difficulty }) {
  const start = (bookmark && bookmark.startDate) || { y: 66, m: 6, d: 1 };
  const game = {
    bookmarkId: (bookmark && bookmark.id) || '66ce',
    playerTag,
    difficulty: difficulty === 'hard' ? 'hard' : 'normal', // veteran AI bonuses (resolveTagMult)
    humanTags: [playerTag], // multiplayer adds guest tags; every human tag has ai:false
    over: false, result: null,
    date: { y: start.y, m: start.m, d: start.d },
    speed: 2, paused: true,
    tags: {},
    provinces: [null],
    armies: {}, nextArmyId: 1, nextEventInstance: 1,
    fleets: {}, nextFleetId: 1,
    airwings: {}, nextWingId: 1, // squadrons at their airfields (SPEC §29)
    merchantVoyages: [], // civilian hulls at sea between harbors (SPEC §58)
    nextRecruitId: 1,
    battles: [], wars: [], truces: {}, diploCooldowns: {},
    rivals: {}, retiredRivalries: {},
    recognitions: {}, // states that have recognized one another (SPEC §96)
    embargoes: {},    // closed markets and blockades (SPEC §100)
    pendingEvents: [], firedEvents: {}, flags: {},
    tagAliases: {}, // three letters a greater crown retired → who wears them now (SPEC §135)
    chronicle: [{ y: start.y, m: start.m, kind: 'era', text: 'The chronicle opens: ' + ((bookmark && bookmark.name) || 'a new age') + '.' }],
    subsidies: [], // monthly flows between courts: gifts of policy, debts of defeat (SPEC §24)
    armsDeals: {}, // who feeds whose arsenal: { client: supplier } (SPEC §181)
    rngSeed, rngState: rngSeed,
    ui: { selectedProv: 0, selectedArmy: null, selectedArmies: [], selectedFleet: null, selectedWing: null },
  };

  const srcProvs = (MAP_DATA && MAP_DATA.provinces) || [];
  const activeMap = provinceMap || buildProvinceMapping(MAP_DATA, bookmark);
  game.mapProfileVersion = 1;
  for (let i = 0; i < srcProvs.length; i++) {
    const id = i + 1;
    if (activeMap[id] !== id) { game.provinces.push(null); continue; }
    game.provinces.push(makeProvinceState({
      DEFINES, MAP_DATA, geom, bookmark, source: srcProvs[i], id,
    }));
  }

  // Tags absent from a bookmark (e.g. Rome in 167 BCE) never enter play.
  const active = bookmark && Array.isArray(bookmark.activeTags) ? bookmark.activeTags : null;
  const tagDefs = DEFINES.TAGS || {};
  for (const key of Object.keys(tagDefs)) {
    if (key === 'WASTE') continue;
    if (active && key !== 'REB' && active.indexOf(key) < 0) continue;
    // The era's lens over the static definition (SPEC §139): a chapter may
    // rename a court it inherits, because three letters outlive their century
    // and the state under them does not.
    const d = tagDef({ DEFINES, bookmark }, key);
    game.tags[key] = {
      tag: key,
      name: d.name || key,
      color: Array.isArray(d.color) ? d.color.slice() : [128, 128, 128],
      religion: d.religion, culture: d.culture,
      alive: true,
      ai: key !== playerTag,
      treasury: 0, income: 0, expenses: 0, loans: 0,
      manpower: 0, maxManpower: 0,
      stability: 0, legitimacy: 50, warExhaustion: 0,
      points: { gov: 0, infl: 0, mar: 0 },
      ideas: { ...(d.ideas || {}) },
      reforms: { mil: 0, civ: 0, rel: 0 },
      eraIdeas: {},
      advisors: { gov: null, infl: null, mar: null },
      aggression: 0,
      courtCand: {},
      modifiers: [],
      atWarWith: [], allies: [], guarantees: [], opinion: {},
      govType: (bookmark && bookmark.govTypes && bookmark.govTypes[key])
        || (DEFINES.GOV_OF || {})[key] || 'monarchy',
      electionIn: 48, // months to the next vote (republics only)
      claims: [], claimFabrications: [], overlord: null,
      heir: null, regency: false, missionIdx: 0,
      aiState: {},
    };
  }

  // Technology (SPEC §22): every court starts at its era's level — the
  // bookmark's techBase, nudged per tag by techTweaks (Rome's legions are a
  // pattern ahead). Effects bake into t.ideas before manpower pools compute.
  const techBase = Math.max(0, num(bookmark && bookmark.techBase, 3) | 0);
  const tweaks = (bookmark && bookmark.techTweaks) || {};
  for (const key of Object.keys(game.tags)) {
    const t = game.tags[key];
    const tw = tweaks[key] || {};
    t.tech = {
      gov: Math.max(0, Math.min(TECH_MAX, techBase + (tw.gov | 0))),
      infl: Math.max(0, Math.min(TECH_MAX, techBase + (tw.infl | 0))),
      mar: Math.max(0, Math.min(TECH_MAX, techBase + (tw.mar | 0))),
    };
    applyReformsToTag(DEFINES, t, key);
  }

  // starting manpower pools from owned development
  const tmpCtx = {
    game, DEFINES,
    byId: (id) => game.provinces[id] || null,
  };
  for (const key of Object.keys(game.tags)) {
    const t = game.tags[key];
    t.maxManpower = maxManpowerOf(tmpCtx, key);
    t.manpower = t.maxManpower;
  }
  return game;
}

// ------------------------------------------------------------------ makeCtx
export function makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events, provinceMap }) {
  const nameToId = new Map();
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (!p) continue;
    nameToId.set(p.name, i);
    // Era-renamed provinces (SPEC §24) answer to their canonical map name too,
    // so content packages keep addressing 'Joppa' when the label reads Tel Aviv.
    if (p.canon && p.canon !== p.name) nameToId.set(p.canon, i);
  }
  const rngStart = (Number.isFinite(game.rngState) ? game.rngState : num(game.rngSeed, 1)) >>> 0;
  game.rngState = rngStart;
  const rng = createRng(rngStart, (state) => { game.rngState = state; });
  const ctx = {
    game, DEFINES, MAP_DATA, geom, bus, bookmark, events, provinceMap,
    dynEvents: new Map(), // runtime-synthesized events (succession cards); never saved
    rng,
    helpers: simHelpers,
    prov(name) {
      const id = nameToId.get(name);
      if (id) return game.provinces[id] || null;
      // A pen written mid-campaign (SPEC §66) renames a province AFTER this
      // index was built — Jerusalem becomes Yerushalayim the month Israel
      // finishes integrating it. Content that walks the province list and
      // then addresses a province by its own `p.name` was silently missing
      // after that, because the new label was in no index. Fall back to the
      // live board before giving up; the miss path is the only one that pays.
      for (let i = 1; i < game.provinces.length; i++) {
        const p = game.provinces[i];
        if (p && p.name === name) { nameToId.set(name, i); return p; }
      }
      warnOnce('prov:' + name, 'unknown province name:', name);
      return null;
    },
    provId(name) {
      const id = nameToId.get(name);
      if (id) return id;
      // Same fallback as `prov`: a label written after the index was built.
      for (let i = 1; i < game.provinces.length; i++) {
        const p = game.provinces[i];
        if (p && p.name === name) { nameToId.set(name, i); return i; }
      }
      warnOnce('provId:' + name, 'unknown province name:', name);
      return 0;
    },
    byId(id) { return game.provinces[id] || null; },
    // The era's reading of a court's static definition (SPEC §139). The sim
    // imports `tagDef` directly; the panels have a ctx and no business
    // importing the sim, so it rides here too.
    tagDef(tag) { return tagDef(ctx, tag); },
  };
  if (!game.flags._setupDone) {
    game.flags._setupDone = true;
    try {
      if (bookmark && typeof bookmark.setup === 'function') bookmark.setup(ctx);
    } catch (e) { console.warn('[sim/init] bookmark.setup failed:', e); }
    // The opening arms book (SPEC §181): the treaty system the chapter
    // starts under, seeded after setup so scripted opinions are already in.
    try { seedArmsDeals(ctx); } catch (e) { console.warn('[sim/init] seedArmsDeals failed:', e); }
  }
  // Off-map seats (SPEC §180), on every bind: a save from before a seat
  // existed loads into a world that has one — the same backfill §55 once ran
  // for its standings book, pointed the other way. Seats are created with
  // the ordinary tag shape; the stipend and the court arrive with the next
  // monthly tick.
  try {
    const active = bookmark && Array.isArray(bookmark.activeTags) ? bookmark.activeTags : [];
    for (const key of active) {
      const d = tagDef(ctx, key);
      if (!d.offmap || game.tags[key]) continue;
      game.tags[key] = {
        tag: key,
        name: d.name || key,
        color: Array.isArray(d.color) ? d.color.slice() : [128, 128, 128],
        religion: d.religion, culture: d.culture,
        alive: true, ai: key !== game.playerTag,
        treasury: 0, income: 0, expenses: 0, loans: 0,
        manpower: 0, maxManpower: 0,
        stability: 0, legitimacy: 50, warExhaustion: 0,
        points: { gov: 0, infl: 0, mar: 0 },
        ideas: { ...(d.ideas || {}) },
        reforms: { mil: 0, civ: 0, rel: 0 },
        advisors: { gov: null, infl: null, mar: null },
        aggression: 0, courtCand: {}, modifiers: [],
        atWarWith: [], allies: [], guarantees: [], opinion: {},
        govType: (bookmark && bookmark.govTypes && bookmark.govTypes[key])
          || (DEFINES.GOV_OF || {})[key] || 'republic',
        electionIn: 48,
        claims: [], claimFabrications: [], overlord: null,
        heir: null, regency: false, missionIdx: 0,
        aiState: {},
        tech: {
          gov: Math.max(0, num(bookmark && bookmark.techBase, 3) | 0),
          infl: Math.max(0, num(bookmark && bookmark.techBase, 3) | 0),
          mar: Math.max(0, num(bookmark && bookmark.techBase, 3) | 0),
        },
      };
    }
  } catch (e) { console.warn('[sim/init] seat backfill failed:', e); }
  // Standing rivalries (SPEC §73): pairs the era names as natural enemies.
  // Any pair the bookmark's setup left un-authored is seeded at the cold
  // baseline so the enmity is live from the first month — authored opinions
  // always win, and drift (monthlyOpinionDrift) holds rivals near the
  // baseline forever after. Runs on every bind (fresh games AND saves from
  // before the rivalry existed), touching only unset entries.
  try {
    const rivalries = bookmark && Array.isArray(bookmark.rivalries) ? bookmark.rivalries : [];
    const base = num(DEFINES.BALANCE && DEFINES.BALANCE.rivalOpinion, -60);
    for (const pair of rivalries) {
      if (!Array.isArray(pair) || pair.length !== 2) continue;
      const pairKey = pair[0] < pair[1] ? pair[0] + '|' + pair[1] : pair[1] + '|' + pair[0];
      if (game.retiredRivalries && game.retiredRivalries[pairKey]) continue;
      for (const [a, b] of [[pair[0], pair[1]], [pair[1], pair[0]]]) {
        const t = game.tags[a];
        if (!t || !game.tags[b]) continue;
        if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
        if (t.opinion[b] === undefined) t.opinion[b] = base;
      }
    }
  } catch (e) { console.warn('[sim/init] rivalry seeding failed:', e); }
  // Rulers: historical courts come from the bookmark; anything else (and tags
  // in pre-ruler saves) gets a plain ruling council. Skill pips 0-6 feed the
  // monthly monarch-point gain (tick.js) and the nation panel. Bookmark ruler
  // entries may carry `age` and an `heir: {name, gov, infl, mar, age}`.
  try {
    const rulers = (bookmark && bookmark.rulers) || {};
    const person = (src, fallbackName, fallbackAge) => ({
      name: String((src && src.name) || fallbackName),
      gov: clamp(Math.round(num(src && src.gov, 2)), 0, 6),
      infl: clamp(Math.round(num(src && src.infl, 2)), 0, 6),
      mar: clamp(Math.round(num(src && src.mar, 2)), 0, 6),
      age: Math.max(0, Math.round(num(src && src.age, fallbackAge))),
    });
    for (const key of Object.keys(game.tags)) {
      if (key === 'REB') continue;
      const t = game.tags[key];
      if (t.ruler) {
        if (!Number.isFinite(t.ruler.age)) t.ruler.age = 45; // pre-age saves
        continue;
      }
      const src = rulers[key];
      t.ruler = src
        ? { ...person(src, 'Ruler', 45), title: String(src.title || 'Ruler') }
        : { name: (t.name || key) + ' Council', title: 'Ruling Council', gov: 2, infl: 2, mar: 2, age: 45 };
      if (src && src.heir && !t.heir) t.heir = person(src.heir, 'Heir', 20);
    }
  } catch (e) { console.warn('[sim/init] ruler assignment failed:', e); }
  // Rebuild every court's merged modifiers (static ideas + reforms + tech +
  // government) — saves written before a formula change heal themselves on load.
  try {
    for (const key of Object.keys(game.tags)) {
      const t = game.tags[key];
      if (!t) continue;
      if (!t.govType) {
        t.govType = (bookmark && bookmark.govTypes && bookmark.govTypes[key])
          || (DEFINES.GOV_OF || {})[key] || 'monarchy';
      }
      if (!Number.isFinite(t.electionIn)) t.electionIn = 48;
      // A chapter's own name for a court (SPEC §139) heals on load, but only
      // where nothing has renamed the court since. A save written before the
      // chapter declared the tweak still carries the static name, and that is
      // exactly the case worth healing; a crown proclaimed in play, or a
      // revolution that rebranded itself, wrote its own name over the top and
      // must keep it. Comparing against the STATIC name is what tells the two
      // apart without a flag to get out of step.
      const era = tagDef({ DEFINES, bookmark }, key);
      const stat = ((DEFINES.TAGS || {})[key] || {}).name;
      if (era.name && (!t.name || t.name === stat)) t.name = era.name;
      applyReformsToTag(DEFINES, t, key);
    }
  } catch (e) { console.warn('[sim/init] modifier rebuild failed:', e); }
  return ctx;
}

// ------------------------------------------------------------------ simHelpers (§6.4, frozen)
// Every helper that names a court takes the name the CHAPTER knows it by and
// resolves it to whoever wears those letters now (SPEC §135). A content
// package is written once, against the tags its era shipped with; the player
// may proclaim a greater crown at any point in the century that follows, and
// the chapter is not supposed to stop when they do. `L` is that one line.
const L = livingTag;
export const simHelpers = {
  // The forwarding address itself, for the predicates content owns: a package
  // may not import the sim, so a chain that keeps its own `alive`/`holds`
  // reaches the lookup through here.
  livingTag(ctx, tag) { return L(ctx, tag); },
  spawnArmy(ctx, tag, provName, opts) {
    return spawnArmy(ctx, L(ctx, tag), provName, opts);
  },
  removeArmy(ctx, armyId) {
    removeArmy(ctx, armyId);
  },
  changeOwner(ctx, provName, tag, opts) {
    const p = ctx.prov(provName);
    const to = L(ctx, tag);
    if (!p || !ctx.game.tags[to]) return;
    changeOwnerCore(ctx, p, to);
    if (!opts || opts.alsoController !== false) changeControllerCore(ctx, p, to);
  },
  changeController(ctx, provName, tag) {
    const p = ctx.prov(provName);
    const to = L(ctx, tag);
    if (!p || !(ctx.game.tags[to] || to === 'REB')) return;
    changeControllerCore(ctx, p, to);
  },
  addProvinceModifier(ctx, provName, mod) {
    const p = ctx.prov(provName);
    if (!p || !mod || !mod.id) return;
    p.modifiers = (p.modifiers || []).filter((m) => m && m.id !== mod.id);
    p.modifiers.push({
      id: mod.id, name: mod.name || mod.id,
      months: Number.isFinite(mod.months) ? mod.months : -1,
      effects: { ...(mod.effects || {}) },
    });
  },
  addTagModifier(ctx, tag, mod) {
    const t = ctx.game.tags[L(ctx, tag)];
    if (!t || !mod || !mod.id) return;
    t.modifiers = (t.modifiers || []).filter((m) => m && m.id !== mod.id);
    t.modifiers.push({
      id: mod.id, name: mod.name || mod.id,
      months: Number.isFinite(mod.months) ? mod.months : -1,
      effects: { ...(mod.effects || {}) },
    });
  },
  removeModifier(ctx, scope, id) {
    const t = ctx.game.tags[L(ctx, scope)];
    if (t) { t.modifiers = (t.modifiers || []).filter((m) => m && m.id !== id); return; }
    const p = ctx.prov(scope);
    if (p) p.modifiers = (p.modifiers || []).filter((m) => m && m.id !== id);
  },
  // Immigration and flight (SPEC §56): events move real people. n < 0 drains.
  // A pen that waits on the community (SPEC §95) can turn on the same day the
  // olim land — or off the day a settlement leaves — so re-resolve the label.
  addPopulation(ctx, provName, entry) {
    const p = ctx.prov(provName);
    if (!p) return;
    addPopulation(p, entry);
    resolveDisplayName(ctx, p);
  },
  // Standing forces at the bookmark's opening (SPEC §58): fleets riding at
  // anchor and squadrons on their fields from day one — Israel did not
  // paddle out to meet the Egyptian navy in rowboats.
  spawnFleet(ctx, tag, provName, ships, opts = {}) {
    const g = ctx.game;
    const p = ctx.prov(provName);
    tag = L(ctx, tag);
    if (!p || !g.tags[tag] || !(ships > 0)) return null;
    if (!g.fleets) g.fleets = {};
    if (!Number.isFinite(g.nextFleetId)) g.nextFleetId = 1;
    const fleet = {
      id: g.nextFleetId++, tag, prov: p.id, ships: Math.round(ships),
      path: [], moveDaysLeft: 0, hopTotal: 0,
      name: opts.name || ('Fleet of ' + p.name),
      gen: Number.isFinite(opts.gen) ? opts.gen : navalGen(ctx, tag),
      admiral: opts.admiral || null,
    };
    g.fleets[fleet.id] = fleet;
    return fleet;
  },
  spawnAirWing(ctx, tag, provName, opts = {}) {
    const g = ctx.game;
    const p = ctx.prov(provName);
    tag = L(ctx, tag);
    if (!p || !g.tags[tag]) return null;
    if (!hasAirfield(p)) return null; // seed the airfield building first
    if (!g.airwings) g.airwings = {};
    if (!Number.isFinite(g.nextWingId)) g.nextWingId = 1;
    const id = g.nextWingId++;
    const nth = Object.values(g.airwings).filter((w) => w && w.tag === tag).length + 1;
    const kind = opts.kind === 'fighter' ? 'fighter' : 'strike';
    const wing = { id, tag, prov: p.id, kind, name: opts.name || ('No. ' + nth + ' Squadron') };
    g.airwings[id] = wing;
    return wing;
  },
  adjust(ctx, tag, d) {
    const t = ctx.game.tags[L(ctx, tag)];
    if (!t || !d) return;
    if (Number.isFinite(d.treasury)) t.treasury = num(t.treasury) + d.treasury;
    if (Number.isFinite(d.manpower)) t.manpower = clamp(num(t.manpower) + d.manpower, 0, Math.max(num(t.maxManpower), num(t.manpower) + d.manpower));
    if (Number.isFinite(d.stability)) t.stability = clamp(num(t.stability) + d.stability, -3, 3);
    if (Number.isFinite(d.legitimacy)) t.legitimacy = clamp(num(t.legitimacy) + d.legitimacy, 0, 100);
    if (Number.isFinite(d.warExhaustion)) t.warExhaustion = clamp(num(t.warExhaustion) + d.warExhaustion, 0, B(ctx, 'warExhaustionMax', 20));
    if (Number.isFinite(d.gov)) t.points.gov = clamp(num(t.points.gov) + d.gov, 0, 999);
    if (Number.isFinite(d.infl)) t.points.infl = clamp(num(t.points.infl) + d.infl, 0, 999);
    if (Number.isFinite(d.mar)) t.points.mar = clamp(num(t.points.mar) + d.mar, 0, 999);
  },
  declareWar(ctx, atk, def, name, cb) {
    return declareWar(ctx, L(ctx, atk), L(ctx, def), name, cb);
  },
  // Scripted armistice (SPEC §22 content: Hadrian's withdrawal, UN truces):
  // ends the war between a and b by the sword — winnersKey 'att'/'def' or
  // null/undefined for a white peace where every occupation reverts.
  endWar(ctx, a, b, winnersKey, opts) {
    const g = ctx.game;
    a = L(ctx, a); b = L(ctx, b);
    for (const w of (g.wars || []).slice()) {
      const all = (w.attackers || []).concat(w.defenders || []);
      if (all.indexOf(a) < 0 || all.indexOf(b) < 0) continue;
      endWarBySword(ctx, w, winnersKey === 'att' || winnersKey === 'def' ? winnersKey : null, opts);
      return true;
    }
    return false;
  },
  reconcileRivalry(ctx, a, b) {
    return reconcileRivalryCore(ctx, L(ctx, a), L(ctx, b));
  },
  // ...and the friendship a change of dynasty annuls (SPEC §104).
  retireAffinity(ctx, a, b) {
    return retireAffinityCore(ctx, L(ctx, a), L(ctx, b));
  },
  // A union that comes apart (SPEC §105): the parent survives and a named set
  // of its provinces leaves under its own banner. Returns the new tag or null.
  secedeTag(ctx, from, to, opts) {
    return secedeTagCore(ctx, L(ctx, from), to, opts);
  },
  // Recognition (SPEC §96): a scripted peace may exchange the letters itself
  // — Sadat in the Knesset, the lawn in Washington — or tear them up again.
  recognize(ctx, a, b) {
    return recognizeCore(ctx, L(ctx, a), L(ctx, b));
  },
  renounceRecognition(ctx, a, b) {
    return renounceRecognitionCore(ctx, L(ctx, a), L(ctx, b));
  },
  areRecognized(ctx, a, b) {
    return recognized(ctx, L(ctx, a), L(ctx, b));
  },
  // The bookmark's standing bar on alliances (SPEC §96), for scripted pacts.
  allianceBarred(ctx, a, b) {
    return allianceBarred(ctx, L(ctx, a), L(ctx, b));
  },
  setFlag(ctx, key, val) {
    ctx.game.flags[key] = val;
  },
  // The arms market's pen for scripted history (SPEC §181): set or read the
  // book directly — the Messerschmitts landed whatever the cabinet thought.
  setArmsDeal(ctx, client, supplier) {
    try { return setArmsDealCore(ctx, L(ctx, client), L(ctx, supplier)); } catch (e) { return false; }
  },
  armsSupplier(ctx, tag) {
    try { return armsSupplierOf(ctx, L(ctx, tag)); } catch (e) { return null; }
  },
  // A scripted embargo (SPEC §100/§181): the general signs something. Runs
  // the ordinary declaration, so the trade bite, the opinion hit and the
  // arms-pipeline cutoff all follow from the one signature.
  declareEmbargo(ctx, from, to) {
    try { return declareEmbargoCore(ctx, L(ctx, from), L(ctx, to)); } catch (e) { return { ok: false }; }
  },
  // Fire a scripted event by id, once (SPEC §32). The same machinery the
  // bookmarks' local fireEventById uses — exposed so event effects and
  // checkVictory hooks can queue cards without duplicating it.
  fireEvent(ctx, eventId) {
    try {
      const g = ctx.game;
      const list = ctx.events || [];
      let ev = null;
      for (const e of list) { if (e && e.id === eventId) { ev = e; break; } }
      if (!ev) { warnOnce('fireEvent:' + eventId, 'unknown event id', eventId); return false; }
      if (g.firedEvents && g.firedEvents[eventId]) return false;
      // Hand it to the real one (SPEC §134). This used to queue the card
      // itself, with its own copy of the pause-and-emit dance, and that copy
      // knew nothing about the option mask §128 added — so a card fired by
      // another card had every one of its `when` gates ignored and offered
      // roads the world had closed. The accession of Beit Kosiba is fired
      // exactly this way, which is how a house with no road to Babylonia was
      // still being offered a Davidic marriage.
      //
      // Delegating also picks up the decider notice (§70), the war-already-
      // settled retirement, and the silent AI resolution, none of which the
      // duplicate had.
      // The bookkeeping is fireEventCore's, including the repeat counter a
      // `once: false` card keeps; setting it here as well would corrupt that.
      fireEventCore(ctx, ev);
      return true;
    } catch (e) { warnOnce('fireEvent', 'fireEvent failed', e); return false; }
  },
  // Content-driven political unions and restorations use the same complete
  // reference rewrite as player formable nations.
  switchTag(ctx, from, to) {
    try {
      if (!switchTagCore(ctx, from, to)) return false;
      const nt = ctx.game.tags[to];
      if (nt) applyReformsToTag(ctx.DEFINES, nt, to);
      ctx.bus.emit('tagSwitched', { from, to });
      ctx.bus.emit('provinceOwner', {});
      return true;
    } catch (e) { warnOnce('switchTag', 'switchTag failed', e); return false; }
  },
  // An in-place rebrand: a revolution keeps the tag but the state changes its
  // name, its banner (flag names a FLAGS variant, null restores the tag's
  // own), or its map color — the kingdom overthrown becomes the republic
  // under the same three letters. Chrome rebuilds as for a formable so the
  // new identity shows everywhere at once.
  rebrandTag(ctx, tag, { name, flag, color } = {}) {
    try {
      tag = L(ctx, tag);
      const t = ctx.game.tags[tag];
      if (!t) return false;
      if (name) t.name = String(name);
      if (flag !== undefined) t.flag = flag || null;
      if (Array.isArray(color) && color.length >= 3) t.color = color.slice(0, 3);
      ctx.bus.emit('tagSwitched', { from: tag, to: tag });
      ctx.bus.emit('provinceOwner', {}); // repaint the political layer for a new color
      return true;
    } catch (e) { warnOnce('rebrandTag', 'rebrandTag failed', e); return false; }
  },
  // The years (SPEC §170): a content package may not import the sim, so the
  // generic pool reaches the climate cycle through here. `kind` is 'good' or
  // 'bad'; the return multiplies that event's monthly chance.
  climate(ctx, kind) {
    try { return harvestOdds(ctx, kind === 'bad' ? 'bad' : 'good'); } catch (e) { return 1; }
  },
  getFlag(ctx, key) {
    return ctx.game.flags[key];
  },
  // Move a court faction's approval (SPEC §34). shiftFaction already fails
  // soft everywhere it can — AI realms, eras without factions and unknown
  // ids are quiet no-ops — so content may call it unconditionally.
  factionShift(ctx, tag, factionId, delta) {
    return shiftFaction(ctx, L(ctx, tag), factionId, delta);
  },
  // …and read one (SPEC §130). `faction` is the raw standing or null where no
  // court sits; `factionAtLeast` is the form nearly every gate wants, and it
  // is false rather than throwing when there is no court to ask.
  faction(ctx, tag, factionId) {
    return factionApproval(ctx, L(ctx, tag), factionId);
  },
  factionAtLeast(ctx, tag, factionId, min) {
    const v = factionApproval(ctx, L(ctx, tag), factionId);
    return Number.isFinite(v) && v >= num(min, 0);
  },
  // The settlement a chapter adopted, stored once under its own name (SPEC
  // §130). Booleans were fine while two or three later cards read a decision;
  // they are the wrong shape for one that has to steer sixty years of content
  // including content nobody has written yet. This is write-once on purpose —
  // a constitution that can be silently replaced is not a constitution, and a
  // second call is a bug worth hearing about rather than a feature.
  setConstitution(ctx, era, value) {
    const g = ctx.game;
    if (!g.constitutions || typeof g.constitutions !== 'object') g.constitutions = {};
    const key = String(era || '');
    const val = String(value || '');
    if (!key || !val) return false;
    if (g.constitutions[key] && g.constitutions[key] !== val) {
      warnOnce('constitution:' + key, 'a second constitution for', key,
        '(' + g.constitutions[key] + ' -> ' + val + ') was refused');
      return false;
    }
    g.constitutions[key] = val;
    return true;
  },
  constitutionOf(ctx, era) {
    const c = ctx.game.constitutions;
    return (c && c[String(era || '')]) || '';
  },
  // The doctrine axes (SPEC §85). `axis` reads the realm's character on one
  // of the four tensions (-10..+10) so a trigger can ask what KIND of realm
  // this is, not merely how much of the map it holds; `doctrine` is the
  // explicit push for content that has no flag in the retrofit table.
  axis(ctx, id) {
    return axisOf(ctx, id);
  },
  doctrine(ctx, id, delta) {
    return pushDoctrine(ctx, id, delta);
  },
  notify(ctx, { title, text, type, provName } = {}) {
    ctx.bus.emit('notify', { title: title || '', text: text || '', type: type || 'info', provName });
  },
  chronicle(ctx, kind, text) {
    chronicleCore(ctx, kind, text);
  },
  endGame(ctx, { result, title, text, score } = {}) {
    const g = ctx.game;
    if (g.result) return; // already decided
    g.result = result || 'loss';
    chronicleCore(ctx, 'verdict', (title ? title + ' — ' : '')
      + (text || (g.result === 'win' ? 'Victory.' : 'Defeat.')));
    // The verdict does NOT touch the player's wars (v5.8 fix — 'nothing
    // decides for you', SPEC §32). A dated verdict landing mid-campaign used
    // to sword-peace every live war under the player — the reported
    // "auto-truce". Scripted arcs whose history demands an armistice (Terms
    // from Antioch, Rhodes, Hadrian's withdrawal) end their wars explicitly
    // via helpers.endWar in their own effects; elimination still closes the
    // book in checkElimination. Everything else keeps fighting.
    g.paused = true;
    ctx.bus.emit('pause', true);
    // The full VICTORIA/DEFEAT card is reserved for actual elimination — a
    // chapter verdict while the nation still stands is chronicled as a great
    // moment and the campaign simply continues (checkElimination owns the
    // true game-over).
    const t = g.tags[g.playerTag];
    if (!t || t.alive === false) {
      g.over = true;
      ctx.bus.emit('gameover', { result: g.result, title: title || '', text: text || '', score: num(score, 0) });
    } else {
      ctx.bus.emit('notify', {
        title: title || (g.result === 'win' ? 'Victory' : 'Defeat'),
        text: (text ? text + ' ' : '') + 'The chronicle records this moment — the campaign continues.',
        type: g.result === 'win' ? 'good' : 'bad',
      });
    }
  },
  killGeneral(ctx, tag, generalName) {
    for (const a of armiesOf(ctx, L(ctx, tag))) {
      if (a.general && a.general.name === generalName) a.general = null;
    }
  },
  // Scripted courts (content package): install a ruler / heir outright, or run
  // a death through the ordinary succession machinery (heir, regency, usurper).
  setRuler(ctx, tag, r) {
    const t = ctx.game.tags[L(ctx, tag)];
    if (!t || !r) return;
    t.ruler = {
      name: String(r.name || 'Ruler'),
      title: String(r.title || (t.ruler && t.ruler.title) || 'Ruler'),
      gov: clamp(Math.round(num(r.gov, 2)), 0, 6),
      infl: clamp(Math.round(num(r.infl, 2)), 0, 6),
      mar: clamp(Math.round(num(r.mar, 2)), 0, 6),
      age: Math.max(0, Math.round(num(r.age, 45))),
    };
    t.regency = false;
    t.regencyTitle = null;
  },
  setHeir(ctx, tag, h) {
    const t = ctx.game.tags[L(ctx, tag)];
    if (!t) return;
    t.heir = h ? {
      name: String(h.name || 'Heir'),
      gov: clamp(Math.round(num(h.gov, 2)), 0, 6),
      infl: clamp(Math.round(num(h.infl, 2)), 0, 6),
      mar: clamp(Math.round(num(h.mar, 2)), 0, 6),
      age: Math.max(0, Math.round(num(h.age, 20))),
    } : null;
  },
  rulerDies(ctx, tag, causeText) {
    rulerDies(ctx, L(ctx, tag), causeText);
  },
  armiesOf(ctx, tag) {
    return armiesOf(ctx, L(ctx, tag));
  },
  controls(ctx, tag, provName) {
    const p = ctx.prov(provName);
    return !!p && p.controller === L(ctx, tag);
  },
  // Is this cell a diaspora community rather than part of the land (SPEC
  // §133)? Takes a province or a name, so a `keep` predicate can ask directly.
  isDiaspora(ctx, prov) {
    try {
      const list = (ctx.DEFINES && ctx.DEFINES.DIASPORA) || [];
      if (!list.length) return false;
      const p = typeof prov === 'string' ? ctx.prov(prov) : prov;
      if (!p) return false;
      return list.indexOf(p.canon || p.name) >= 0;
    } catch (e) { warnOnce('isDiaspora', e); return false; }
  },
  countControlled(ctx, tag, opts) {
    const g = ctx.game;
    tag = L(ctx, tag);
    let n = 0;
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (!p || p.impassable || p.controller !== tag) continue;
      if (opts && opts.religion && p.religion !== opts.religion) continue;
      n++;
    }
    return n;
  },
  // The realm, as opposed to the ground the armies happen to be standing on
  // (SPEC §146). `countControlled` answers "where are my flags this month",
  // which is the right question for a siege and the wrong one for every card
  // that says *rules*, *reigns over* or *is a power*: an army sitting in three
  // Anatolian provinces it will hand back at the peace table made the Law of
  // the Nations fire on a realm that had annexed none of them.
  //
  // Ownership is also the quantity that survives the peace: an occupied
  // province is still yours, so a realm does not shrink in the eyes of its own
  // chroniclers because somebody is standing in it.
  countOwned(ctx, tag, opts) {
    const g = ctx.game;
    tag = L(ctx, tag);
    let n = 0;
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (!p || p.impassable || p.owner !== tag) continue;
      if (opts && opts.religion && p.religion !== opts.religion) continue;
      n++;
    }
    return n;
  },
  // How long this chapter has run, in years (SPEC §148). A content package may
  // not import the sim and cannot see `ctx.bookmark`, so a SHARED package —
  // one that plays in every chapter and knows none of them — had no way to
  // tell a dynasty from a rising in its first summer. Fractional, because a
  // card that wants "a generation" should not care which month it is.
  chapterYears(ctx) {
    const s = ctx && ctx.bookmark && ctx.bookmark.startDate;
    const d = ctx && ctx.game && ctx.game.date;
    if (!s || !d) return 0;
    return (num(d.y) - num(s.y)) + (num(d.m, 1) - num(s.m, 1)) / 12;
  },
  // How long this chapter RUNS, in years — start to generation horizon (SPEC
  // §178). The companion to chapterYears, and for the same shared-package
  // reason: a card that must complete a multi-step arc inside whatever chapter
  // it finds itself in has to be able to ask how much room the chapter has.
  // NaN where a bookmark declares no horizon, so a caller can tell "no
  // answer" from "no time".
  chapterSpan(ctx) {
    const b = ctx && ctx.bookmark;
    const s = b && b.startDate;
    if (!s || !Number.isFinite(b.generationHorizon)) return NaN;
    return num(b.generationHorizon) - num(s.y);
  },
};

// ------------------------------------------------------------------ national decisions
// Peacetime statecraft enacted from the nation panel. Each decision spends a
// resource, applies its effects through the ordinary modifier machinery, and
// goes on cooldown (stored in game.diploCooldowns under 'decision:<key>').
export const DECISIONS = {
  grand_festival: {
    name: 'Hold a Grand Festival', icon: 'laurel', cdMonths: 24, costText: '100 talents',
    desc: 'Games, feasts and processions in every city: −2 unrest across the realm for a year, +5 legitimacy.',
    can(g, t) { return num(t.treasury) >= 100 ? '' : 'Not enough treasury (100 talents).'; },
    run(ctx, t) {
      t.treasury = num(t.treasury) - 100;
      simHelpers.addTagModifier(ctx, t.tag, { id: 'festival_joy', name: 'Festival Joy', months: 12, effects: { unrestAll: -2 } });
      t.legitimacy = clamp(num(t.legitimacy) + 5, 0, 100);
      return 'The realm rejoices: −2 unrest everywhere for a year, +5 legitimacy.';
    },
  },
  great_rites: {
    name: 'Great Public Rites', icon: 'altar', cdMonths: 18, costText: '50 governance points',
    desc: 'The priesthood proclaims the ruler’s favor with heaven: +10 legitimacy, −1 unrest for a year.',
    can(g, t) { return num(t.points.gov) >= 50 ? '' : 'Not enough governance points (50 required).'; },
    run(ctx, t) {
      t.points.gov = num(t.points.gov) - 50;
      simHelpers.addTagModifier(ctx, t.tag, { id: 'pious_rule', name: 'Pious Rule', months: 12, effects: { unrestAll: -1 } });
      t.legitimacy = clamp(num(t.legitimacy) + 10, 0, 100);
      return 'The rites are performed before the people: +10 legitimacy, −1 unrest for a year.';
    },
  },
  trade_expedition: {
    name: 'Fund Trade Expeditions', icon: 'coins', cdMonths: 36, costText: '150 talents',
    desc: 'Caravans and hulls flying our colors on every road and sea lane: +20% income for two years.',
    can(g, t) { return num(t.treasury) >= 150 ? '' : 'Not enough treasury (150 talents).'; },
    run(ctx, t) {
      t.treasury = num(t.treasury) - 150;
      simHelpers.addTagModifier(ctx, t.tag, { id: 'trade_winds', name: 'Trade Winds', months: 24, effects: { incomeMult: 1.2 } });
      return 'The expeditions set out: +20% income for two years.';
    },
  },
  drill_army: {
    name: 'Drill the Army', icon: 'spears', cdMonths: 24, costText: '50 martial points',
    desc: 'A season of drill, forced marches and mock battles: +5% discipline for 18 months.',
    can(g, t) { return num(t.points.mar) >= 50 ? '' : 'Not enough martial points (50 required).'; },
    run(ctx, t) {
      t.points.mar = num(t.points.mar) - 50;
      simHelpers.addTagModifier(ctx, t.tag, { id: 'drilled_ranks', name: 'Drilled Ranks', months: 18, effects: { disciplineMult: 1.05 } });
      return 'The ranks are hardened: +5% discipline for 18 months.';
    },
  },
  resettle_land: {
    name: 'Resettle the Land', icon: 'grain', cdMonths: 24, costText: '100 talents · peacetime only',
    desc: 'Veterans and landless families take up empty fields: +3,000 manpower now, +10% manpower for a year. Only while at peace.',
    can(g, t) {
      const atWar = (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive);
      if (atWar) return 'The realm is at war — the fields must wait.';
      return num(t.treasury) >= 100 ? '' : 'Not enough treasury (100 talents).';
    },
    run(ctx, t) {
      t.treasury = num(t.treasury) - 100;
      t.manpower = num(t.manpower) + 3000;
      simHelpers.addTagModifier(ctx, t.tag, { id: 'settled_veterans', name: 'Settled Veterans', months: 12, effects: { manpowerMult: 1.1 } });
      return 'The land fills with willing hands: +3,000 manpower, +10% manpower for a year.';
    },
  },
};

// ------------------------------------------------------------------ gameActions (§6.6, frozen)
export function gameActions(ctx) {
  const g = ctx.game;
  const say = (title, text, type) => ctx.bus.emit('notify', { title, text, type: type || 'info' });
  // The campaign contract as it stands NOW: the bookmark's win/loss lines
  // until the chapter's verdict is in, then a single settled line. Shared by
  // getObjectives (realm panel) and getCampaignGuidance (outliner) so no
  // surface keeps flying war goals for a war already decided.
  const liveObjectives = () => {
    if (g.result) {
      return [g.result === 'win'
        ? 'Win: the verdict is ours. The Chronicle (C) records it; the campaign sails on.'
        : 'Lose: the verdict went against us. The Chronicle (C) records it; the campaign sails on.'];
    }
    // A formed nation keeps the age's objectives (SPEC §102) — proclaiming a
    // kingdom does not empty the panel that says what the era asks of you.
    const list = contentForTag(ctx, ctx.bookmark && ctx.bookmark.objectives, g.playerTag);
    return Array.isArray(list) && list.length ? list.slice() : null;
  };

  // ---- diplomacy (frozen action contract) ---------------------------------
  const dipKey = (them, kind) => g.playerTag + '>' + them + ':' + kind;
  // Single source of truth for gating: the actions re-derive this instead of
  // trusting whatever state the UI captured when it rendered.
  const getDip = (tag) => {
    try {
      const me = g.playerTag;
      if (!tag || tag === me || tag === 'REB') return null;
      const them = g.tags[tag], mine = g.tags[me];
      if (!them || !mine || !them.alive) return null;
      const opinionOfUs = opinionOf(ctx, tag, me);
      const ourOpinion = opinionOf(ctx, me, tag);
      const allied = (mine.allies || []).indexOf(tag) >= 0 || (them.allies || []).indexOf(me) >= 0;
      const atWarWithUs = (mine.atWarWith || []).indexOf(tag) >= 0 || (them.atWarWith || []).indexOf(me) >= 0;
      const tr = g.truces ? g.truces[truceKey(me, tag)] : null;
      const truceUntil = tr && truceActive(ctx, me, tag) ? { y: tr.y, m: tr.m } : null;
      const ourClient = them.overlord === me;
      const ourOverlord = mine.overlord === tag;
      const theirOverlord = them.overlord && !ourClient ? them.overlord : null;
      // The lost lands are remembered (SPEC §67): land we took from them in
      // war, and still hold, caps their opinion of us — goodwill cannot buy
      // past it, and the actions that only exist to buy goodwill say so.
      const grudgeHeld = liveGrudge(ctx, tag, me);
      const grudgeCap = grudgeHeld ? grudgeCeiling(ctx, tag, me) : null;
      const grudgeNames = (grudgeHeld || []).map((id) => {
        const p = ctx.byId(id);
        return p ? p.name : null;
      }).filter(Boolean);
      const grudgeLabel = grudgeNames.slice(0, 3).join(', ')
        + (grudgeNames.length > 3 ? '…' : '');
      const grudgeWall = grudgeHeld && opinionOfUs >= grudgeCap
        ? 'They will not hear us while we hold ' + grudgeLabel
          + ' — the lost lands are remembered (opinion capped at ' + grudgeCap + ').'
        : '';
      // Reconciliation (SPEC §86): the same wound, read as a clock. `pct` is
      // how far it has closed; `quiet` says whether it is closing at all;
      // `friends` says how far it can go.
      const reconcile = grudgeHeld ? {
        pct: Math.round(thawProgress(ctx, tag, me) * 100),
        quiet: thawQuiet(ctx, tag, me),
        friends: haveAffinity(ctx, tag, me),
        done: reconciled(ctx, tag, me),
        rawCeiling: grudgeCeilingRaw(ctx, tag, me),
        ceiling: grudgeCap,
      } : null;
      const rival = rivalDeclareInfo(ctx, me, tag);
      const clientOffer = clientOfferInfo(ctx, me, tag);
      let whyNotImprove = '';
      if (grudgeWall) whyNotImprove = grudgeWall;
      else if (diploCdActive(ctx, dipKey(tag, 'improve'))) {
        whyNotImprove = 'Our envoys were just received (' + diploCdMonthsLeft(ctx, dipKey(tag, 'improve')) + ' months).';
      } else if (num(mine.points && mine.points.infl) < DIPLO.improveCost) {
        whyNotImprove = 'Not enough influence (' + DIPLO.improveCost + ' required).';
      }
      let whyNotGift = '';
      if (grudgeWall) whyNotGift = grudgeWall;
      else if (diploCdActive(ctx, dipKey(tag, 'gift'))) {
        whyNotGift = 'A gift was sent recently (' + diploCdMonthsLeft(ctx, dipKey(tag, 'gift')) + ' months).';
      } else if (num(mine.treasury) < DIPLO.giftCost) {
        whyNotGift = 'Not enough treasury (' + DIPLO.giftCost + ' talents required).';
      }
      // Some pacts are never signed (SPEC §96): the bookmark's own bar comes
      // before every other reason, because no amount of goodwill lifts it.
      // An off-map seat (SPEC §180) is barred before even that: an ally who
      // can never march is no ally, whatever anybody's opinion says.
      const seatBar = isOffmapTag(ctx, tag) || isOffmapTag(ctx, me);
      const allyBar = allianceBarred(ctx, me, tag);
      let whyNotAlly = '';
      if (seatBar) whyNotAlly = 'They are beyond the map — an ally who can never march is no ally.';
      else if (allyBar) whyNotAlly = allyBar;
      else if (allied) whyNotAlly = 'We are already allied.';
      else if (atWarWithUs) whyNotAlly = 'We are at war with them.';
      else if (ourClient) whyNotAlly = 'They are already our client kingdom.';
      else if (ourOverlord) whyNotAlly = 'They are our overlord.';
      // §67 refused an alliance outright while a grudge lived. §86 keeps that
      // refusal — unless the pair are historical friends who have spent the
      // years quietly enough for the wound to close. Then the land is still
      // ours, and they will still sign.
      else if (grudgeHeld && !(reconcile && reconcile.done)) {
        whyNotAlly = reconcile && reconcile.friends
          ? 'The old friendship is mending, but it is not mended (' + reconcile.pct
            + '% — we still hold ' + grudgeLabel + ').'
          : 'No alliance while we hold ' + grudgeLabel + ' — the lost lands are remembered.';
      }
      else if (opinionOfUs < DIPLO.allyMinOpinion) whyNotAlly = 'They think too little of us (' + DIPLO.allyMinOpinion + ' opinion required).';
      else if (diploCdActive(ctx, dipKey(tag, 'ally'))) whyNotAlly = 'Our last offer still stings (' + diploCdMonthsLeft(ctx, dipKey(tag, 'ally')) + ' months).';
      const cb = casusBelli(ctx, me, tag);
      let whyNotWar = '';
      if (seatBar) whyNotWar = 'No army on this map can reach them.';
      else if (atWarWithUs) whyNotWar = 'We are already at war with them.';
      else if (recognized(ctx, me, tag)) whyNotWar = 'We recognize them — the recognition must be renounced first.';
      else if (ourClient) whyNotWar = 'They are our client kingdom.';
      else if (ourOverlord) whyNotWar = 'They are our overlord.';
      else if (allied) whyNotWar = 'We are allied — break the alliance first.';
      else if (truceUntil) whyNotWar = 'The ink on the truce is still wet.';
      // Guarantees & subsidies (SPEC §24)
      const weGuarantee = Array.isArray(mine.guarantees) && mine.guarantees.indexOf(tag) >= 0;
      const theyGuarantee = Array.isArray(them.guarantees) && them.guarantees.indexOf(me) >= 0;
      const subOut = (g.subsidies || []).find((s) => s && s.from === me && s.to === tag);
      const subIn = (g.subsidies || []).find((s) => s && s.from === tag && s.to === me);
      let whyNotGuarantee = '';
      if (weGuarantee) whyNotGuarantee = 'Our word already protects them.';
      else if (atWarWithUs) whyNotGuarantee = 'We are at war with them.';
      else if (ourClient || ourOverlord) whyNotGuarantee = 'The bond of fealty already binds us.';
      else if (num(mine.points && mine.points.infl) < 50) whyNotGuarantee = 'Not enough influence (50 required).';
      let whyNotSubsidize = '';
      if (subOut) whyNotSubsidize = 'A subsidy already flows (' + subOut.monthsLeft + ' months left).';
      else if (atWarWithUs) whyNotSubsidize = 'We are at war with them.';
      else if (num(mine.treasury) < 60) whyNotSubsidize = 'The treasury is too thin (60 talents in hand required).';
      // Incorporation (SPEC §61): a willing client can join the realm outright.
      let inc = null;
      if (ourClient) {
        try { inc = incorporateInfo(ctx, me, tag); } catch (e) { inc = null; }
      }
      // Embargo and blockade (SPEC §100): the pressure short of war, in the
      // ages that use it.
      let embargo = null;
      try {
        const ei = embargoInfo(ctx, me, tag);
        if (ei.offered || ei.active) {
          embargo = {
            offered: ei.offered, active: ei.active, blockade: ei.blockade,
            canBlockade: ei.canBlockade, why: ei.why, whyBlockade: ei.whyBlockade,
            againstUs: embargoesOn(ctx, me).some((e) => e.from === tag),
          };
        }
      } catch (e) { embargo = null; }
      // Recognition (SPEC §96): only surfaced in the ages that exchange it.
      let recognition = null;
      try {
        const ri = recognitionInfo(ctx, me, tag);
        if (ri.offered || ri.recognized) {
          recognition = {
            can: ri.can, why: ri.why, cost: ri.cost,
            recognized: ri.recognized, endsWar: ri.endsWar,
            breakOpinion: DIPLO.recognizeBreakOpinion,
            breakLegitimacy: DIPLO.recognizeBreakLegitimacy,
          };
        }
      } catch (e) { recognition = null; }
      // Royal marriage (SPEC §62): only surfaced in the ages that arrange them.
      let marriage = null;
      if (mechanicOn(ctx, 'royalMarriage')) {
        try {
          const mi = royalMarriageInfo(ctx, me, tag);
          marriage = { married: mi.married, can: mi.can, why: mi.why, cost: mi.cost };
        } catch (e) { marriage = null; }
      }
      // The arms market (SPEC §181): only surfaced where a bookmark declares
      // one, and only against an arsenal court or our current supplier.
      let arms = null;
      try { arms = armsInfo(ctx, me, tag); } catch (e) { arms = null; }
      return {
        tag, name: them.name || tag,
        color: Array.isArray(them.color) ? them.color.slice() : [128, 128, 128],
        // SPEC §67: their grudge against us (land of theirs we hold), and ours
        // against them — for the panel's status line and action tooltips.
        grudge: grudgeHeld ? { count: grudgeHeld.length, names: grudgeLabel, ceiling: grudgeCap } : null,
        reconcile,
        rival,
        // The offered collar (SPEC §92): a weaker sworn ally may be asked to
        // come under our protection without a war being fought over it.
        clientOffer,
        ourGrudge: (() => {
          const held = liveGrudge(ctx, me, tag);
          return held ? { count: held.length, ceiling: grudgeCeiling(ctx, me, tag) } : null;
        })(),
        opinionOfUs, ourOpinion, allied, atWarWithUs, truceUntil,
        ourClient, ourOverlord, theirOverlord,
        theirOverlordName: theirOverlord && g.tags[theirOverlord] ? (g.tags[theirOverlord].name || theirOverlord) : '',
        cb,
        canImprove: !whyNotImprove, canGift: !whyNotGift, canAlly: !whyNotAlly, canBreak: allied,
        canWar: !whyNotWar,
        whyNotImprove, whyNotGift, whyNotAlly, whyNotWar,
        improveCost: DIPLO.improveCost, giftCost: DIPLO.giftCost,
        weGuarantee, theyGuarantee,
        subsidyOut: subOut ? { amount: subOut.amount, monthsLeft: subOut.monthsLeft, reparation: !!subOut.reparation } : null,
        subsidyIn: subIn ? { amount: subIn.amount, monthsLeft: subIn.monthsLeft, reparation: !!subIn.reparation } : null,
        canGuarantee: !whyNotGuarantee, whyNotGuarantee,
        canSubsidize: !whyNotSubsidize, whyNotSubsidize,
        incorporate: inc ? {
          can: inc.can, why: inc.why, cost: inc.cost, dev: inc.dev, months: inc.months,
          opinion: inc.opinion, needOpinion: inc.needOpinion, inProgress: inc.inProgress || 0,
          suspended: !!inc.suspended,
        } : null,
        marriage,
        recognition,
        embargo,
        arms,
        offmap: isOffmapTag(ctx, tag),
      };
    } catch (e) { warnOnce('getDiplomacy', 'getDiplomacy failed', e); return null; }
  };

  // Shared gating for the player army actions (split / hire / refit / disband).
  const armyActionInfo = (armyId) => {
    const out = {
      canSplit: false, whySplit: '', canHire: false, whyHire: '', hireCost: 50,
      canModernize: false, whyModernize: '', modernizeCost: 0, genName: '', newGenName: '',
      canDisband: false, whyDisband: '', disbandReturn: 0,
    };
    const a = g.armies[armyId];
    if (!a || a.tag !== g.playerTag) {
      out.whySplit = out.whyHire = out.whyModernize = out.whyDisband = 'That army does not answer to us.';
      return out;
    }
    if (a.inBattle) out.whySplit = a.name + ' is locked in battle.';
    else if (a.retreating) out.whySplit = a.name + ' is retreating and cannot divide.';
    else if (num(a.shatteredDays) > 0) out.whySplit = a.name + ' is shattered and must reform.';
    else if (regCount(a) < 2) out.whySplit = 'At least two regiments are needed to split.';
    out.canSplit = !out.whySplit;
    const t = g.tags[g.playerTag];
    if (!t || num(t.points && t.points.mar) < 50) out.whyHire = 'Not enough martial points (50 required).';
    out.canHire = !out.whyHire;
    try {
      const mi = modernizeInfo(ctx, a);
      out.canModernize = mi.can;
      out.whyModernize = mi.why;
      out.modernizeCost = mi.cost;
      out.genName = genName(num(a.gen, 0), 'inf');
      out.newGenName = genName(mi.unlocked, 'inf');
    } catch (e) { warnOnce('modInfo', 'modernizeInfo failed', e); }
    if (a.inBattle) out.whyDisband = a.name + ' is locked in battle.';
    else if (a.retreating || num(a.shatteredDays) > 0) out.whyDisband = a.name + ' must reform before standing down.';
    else if (a.aboard) out.whyDisband = a.name + ' must disembark before standing down.';
    const p = ctx.byId(a.prov);
    out.disbandReturn = p && p.owner === a.tag && p.controller === a.tag
      ? Math.max(0, Math.floor(num(a.men) * 0.75)) : 0;
    out.canDisband = !out.whyDisband;
    return out;
  };

  // Formable nations (SPEC §22): the crowns this court could claim, with a
  // live requirement checklist. Surfaced through the Decisions panel.
  const formableList = () => {
    const out = [];
    for (const f of FORMABLES) {
      if (f.from !== g.playerTag) continue;
      if (f.bookmarks && ctx.bookmark && f.bookmarks.indexOf(ctx.bookmark.id) < 0) continue;
      if (g.tags[f.to]) continue; // that banner already flies elsewhere
      const rows = (f.requires || []).map((r) => {
        let ok = false;
        try { ok = !!r.check(ctx, g.playerTag); } catch (e) { warnOnce('form:' + f.id, 'requirement check failed', e); }
        return { label: r.label, ok };
      });
      out.push({ f, rows, met: rows.every((r) => r.ok) });
    }
    return out;
  };

  // The player's tech ladder, priced against the age (SPEC §22) and dressed
  // for the panel (SPEC §177): points on hand, the monthly gain, the months
  // to affordability, what the ladders have already paid, and the military
  // ladder's unlock milestones.
  const techInfo = () => {
    const t = g.tags[g.playerTag];
    if (!t || !t.tech) return null;
    const base = num(ctx.bookmark && ctx.bookmark.techBase, 3) | 0;
    const months = monthsBetween((ctx.bookmark && ctx.bookmark.startDate) || g.date, g.date);
    const eraBase = eraBaseline(base, months);
    // The age's own ceiling (SPEC §99): the ladder is the same in every era,
    // but a century can only climb so far up it.
    const ceiling = techCeiling(ctx.bookmark);
    // Where the realm stands (SPEC §166). Every institution alive in the world
    // that this realm has not taken up makes every level of every ladder
    // dearer — which is how "behind" stops being a point total and becomes a
    // place on the map.
    const instMult = institutionMult(ctx, g.playerTag);
    const instPct = Math.round((instMult - 1) * 100);
    // What the crown banks a month, per pool — the tick's own arithmetic:
    // base 2, the ruler's skill, the advisor (capped at 3, silent while the
    // treasury is ruined), and the rivalry drill for martial (SPEC §86).
    const r = t.ruler || {};
    const rivalN = declaredRivals(ctx, g.playerTag).filter((k) => g.tags[k] && g.tags[k].alive).length;
    const gainOf = (k) => {
      const skill = Math.max(0, Math.min(6, Number.isFinite(r[k]) ? r[k] : 2));
      const a = t.advisors && t.advisors[k];
      const adv = (a && num(t.treasury) > -200) ? Math.max(0, Math.min(3, num(a.skill, 1))) : 0;
      const rival = (k === 'mar' && rivalN) ? num((ctx.DEFINES.BALANCE || {}).rivalMarPerMonth, 1) * rivalN : 0;
      return 2 + skill + adv + rival;
    };
    // What the ladders have already paid, per ladder, from the one table that
    // owns the formulas — the panel must never invent its own percentages.
    const fx = computeTechEffects(t.tech);
    const pct = (m) => Math.round((m - 1) * 100);
    const nowText = {
      gov: `+${pct(fx.incomeMult)}% income · ${fx.unrestAll.toFixed(2)} unrest · +${pct(fx.growthMult)}% growth`,
      infl: `+${pct(fx.tradeMult)}% trade · +${pct(fx.navalMult)}% fleet strength`,
      mar: `+${pct(fx.milPowerMult)}% army strength · +${pct(fx.manpowerMult)}% manpower`
        + (fx.siegeBonus ? ` · +${fx.siegeBonus} siege` : ''),
    };
    const rows = Object.keys(TECH_CATEGORIES).map((key) => {
      const cat = TECH_CATEGORIES[key];
      const level = num(t.tech[key]) | 0;
      const next = level + 1;
      const atMax = next > Math.min(TECH_MAX, ceiling);
      const mult = aheadMult(next, eraBase);
      const cost = atMax ? 0 : Math.round(techCost(next) * mult * instMult);
      const have = num(t.points[cat.point]);
      const gain = gainOf(cat.point);
      const aheadTxt = mult > 1 ? 'ahead of the age: +' + Math.round((mult - 1) * 100) + '%' : '';
      const instTxt = instPct > 0 ? 'behind the world: +' + instPct + '%' : '';
      const both = [aheadTxt, instTxt].filter(Boolean).join(', ');
      return {
        key, name: cat.name, desc: cat.desc, point: cat.point,
        level, cost, eraBase,
        // The rung's own names (SPEC §179): where the ladder stands, and the
        // rung being bought, in the era's vocabulary.
        levelName: techLevelName(ctx.bookmark, key, level),
        nextName: atMax ? '' : techLevelName(ctx.bookmark, key, next),
        have: Math.max(0, Math.round(have)),
        gain,
        etaMonths: (!atMax && have < cost && gain > 0) ? Math.ceil((cost - have) / gain) : 0,
        aheadPct: !atMax && mult > 1 ? Math.round((mult - 1) * 100) : 0,
        nowText: nowText[key],
        ahead: !atMax && mult > 1,
        behind: !atMax && instPct > 0,
        instPct,
        canBuy: !atMax && have >= cost,
        whyNot: atMax ? (ceiling < TECH_MAX
          ? 'The age itself stops here: nothing further was known in this century.'
          : 'The ladder ends here — for now.')
          : have < cost ? `Needs ${cost} ${cat.point === 'mar' ? 'martial' : cat.point === 'gov' ? 'government' : 'influence'} points`
            + (both ? ' (' + both + ')' : '') + '.'
            : (both ? both.charAt(0).toUpperCase() + both.slice(1) + '.' : ''),
      };
    });
    const marLevel = num(t.tech.mar) | 0;
    const gi = cappedGen(marLevel, ctx.bookmark);
    // A pattern the age cannot reach is not "next" — it is not on the map.
    const nextGen = (UNIT_GENS[gi + 1] && UNIT_GENS[gi + 1].at <= ceiling) ? UNIT_GENS[gi + 1] : null;
    // The military ladder's milestone strip (SPEC §177): every pattern
    // generation past the first, the doctrine it learns, and whether this
    // century can reach it at all.
    const milestones = UNIT_GENS.map((u, i) => ({ u, i })).filter((x) => x.u.at > 0).map(({ u, i }) => {
      const doct = DOCTRINES.find((d) => d.at === i) || null;
      return {
        at: u.at, inf: u.inf, cav: u.cav,
        doctrine: doct ? doct.name : '',
        doctrineDesc: doct ? doct.desc : '',
        reached: marLevel >= u.at,
        beyond: u.at > ceiling,
      };
    });
    return {
      rows, eraBase, ceiling, instPct, milestones,
      unit: {
        gen: gi, inf: genName(gi, 'inf'), cav: genName(gi, 'cav'),
        nextAt: nextGen ? nextGen.at : null,
        nextInf: nextGen ? nextGen.inf : null,
      },
    };
  };

  const actions = {
    setSpeed(n) {
      g.speed = clamp(Math.round(num(n, 2)), 1, 5);
      ctx.bus.emit('speed', g.speed);
    },
    togglePause() {
      g.paused = !g.paused;
      ctx.bus.emit('pause', g.paused);
    },
    getRecruitmentQueue(provId) {
      try {
        const p = ctx.byId(provId | 0);
        if (!p) return null;
        const nameOf = (type, gen) => type === 'ship' ? navalGenName(num(gen, 0))
          : type === 'wing' ? 'Air Wing'
            : genName(num(gen, 0), type) || (type === 'cav' ? 'Cavalry' : 'Infantry');
        const rows = (Array.isArray(p.unitQueue) ? p.unitQueue : []).map((row, i) => ({
          id: row.id, type: row.type, name: nameOf(row.type, row.gen),
          monthsLeft: Math.max(0, num(row.monthsLeft) | 0),
          totalMonths: Math.max(1, num(row.totalMonths, unitRecruitMonths(ctx, row.type)) | 0),
          position: i + 1, stalled: row.stalled || '',
        }));
        return { paused: !!g.paused, rows };
      } catch (e) { warnOnce('recruitQueue', 'getRecruitmentQueue failed', e); return null; }
    },
    recruit(provId, type) {
      try {
        const p = ctx.byId(provId);
        if (!p || p.impassable) return;
        if (p.owner !== g.playerTag || p.controller !== g.playerTag) {
          say('Cannot recruit', 'You must own and control the province.', 'bad');
          return;
        }
        const res = recruitRegiment(ctx, g.playerTag, provId, type);
        if (!res.ok) say('Cannot recruit', 'Recruitment failed: ' + res.why + '.', 'bad');
        else {
          const label = genName(num(res.queued && res.queued.gen, tagGen(ctx, g.playerTag)), type);
          say('Recruitment ordered', (label || 'A regiment') + ' will muster in '
            + num(res.queued && res.queued.totalMonths, unitRecruitMonths(ctx, type)) + ' months. Units train one at a time in each province.', 'good');
        }
      } catch (e) { warnOnce('recruit', 'recruit failed', e); }
    },
    moveArmy(armyId, provId) {
      try {
        const a = g.armies[armyId];
        if (!a) return;
        if (a.tag !== g.playerTag) return;
        if (a.inBattle) { say('Orders refused', a.name + ' is locked in battle.', 'bad'); return; }
        if (a.retreating) { say('Orders refused', a.name + ' is retreating and will not rally yet.', 'bad'); return; }
        if ((a.shatteredDays || 0) > 0) { say('Orders refused', a.name + ' is shattered and must reform (' + a.shatteredDays + ' days).', 'bad'); return; }
        const p = ctx.byId(provId);
        if (!p || p.impassable) return;
        if (!canEnter(ctx, a.tag, provId)) {
          say('Orders refused', 'We are not at war with the rulers of ' + p.name + '.', 'bad');
          return;
        }
        if (!issueMove(ctx, a, provId)) {
          const overseas = isCoastal(ctx, provId) || isCoastal(ctx, a.prov);
          say('Orders refused', overseas
            ? 'No land route to ' + p.name + ' — the sea is in the way. Build ships, embark the army, and sail.'
            : 'No route to ' + p.name + '.', 'bad');
        }
      } catch (e) { warnOnce('moveArmy', 'moveArmy failed', e); }
    },
    mergeArmies(fromId, intoId) {
      try {
        const f = g.armies[fromId];
        if (!f || f.tag !== g.playerTag) return;
        if (!mergeInto(ctx, fromId, intoId)) {
          say('Cannot merge', 'Armies must share a province and be free to maneuver.', 'bad');
        }
      } catch (e) { warnOnce('merge', 'mergeArmies failed', e); }
    },
    chooseEventOption(instanceId, idx) {
      try { resolveEventOption(ctx, instanceId, idx); }
      catch (e) { warnOnce('choose', 'chooseEventOption failed', e); }
    },
    requestParthianAid() {
      try {
        if (g.playerTag !== 'JUD') return;
        const t = g.tags.JUD;
        if (!t) return;
        if (g.flags.parthianSympathy) {
          say('Parthia', 'The court at Ctesiphon is already sympathetic to our cause.', 'info');
          return;
        }
        if (num(t.points.infl) < 50) {
          say('Parthia', 'Our envoys need more influence at foreign courts (50 required).', 'bad');
          return;
        }
        t.points.infl -= 50;
        const par = g.tags.PAR;
        const opinion = par && par.opinion ? num(par.opinion.JUD) : 0;
        const p = clamp(0.3 + opinion / 400, 0.05, 0.85);
        if (ctx.rng.chance(p)) {
          g.flags.parthianSympathy = true;
          t.treasury = num(t.treasury) + 150;
          t.manpower = num(t.manpower) + 4000;
          say('Word from Ctesiphon', 'Parthia sends silver and volunteers across the Euphrates — and watches Rome with new interest.', 'good');
        } else {
          if (par) par.opinion.JUD = clamp(opinion + 10, -200, 200);
          say('Word from Ctesiphon', 'The King of Kings receives our envoys kindly, and promises nothing.', 'bad');
        }
      } catch (e) { warnOnce('parthia', 'requestParthianAid failed', e); }
    },
    explainUnrest(provId) {
      return explainUnrest(ctx, provId);
    },
    explainIncome(tag) {
      return explainIncome(ctx, tag);
    },

    // ---- buildings (frozen contract) ---------------------------------------
    getBuildInfo(provId) {
      try {
        const p = ctx.byId(provId);
        if (!p || p.impassable) return null;
        if (p.owner !== g.playerTag || p.controller !== g.playerTag) return null;
        const catalog = ctx.DEFINES.BUILDINGS || {};
        const t = g.tags[g.playerTag];
        const built = Array.isArray(p.buildings) ? p.buildings.slice() : [];
        const cdef = p.construction ? catalog[p.construction.key] : null;
        const constructing = p.construction ? {
          key: p.construction.key,
          name: (cdef && buildingFace(cdef, num(t && t.tech && t.tech.mar)).name) || p.construction.key,
          monthsLeft: num(p.construction.monthsLeft),
        } : null;
        const options = [];
        for (const key of Object.keys(catalog)) {
          const b = catalog[key];
          const marTech = num(t && t.tech && t.tech.mar);
          const coastal = isCoastal(ctx, provId);
          // Do not advertise inventions the realm cannot yet conceive, or
          // coastal infrastructure in inland towns. They appear when relevant.
          if (Number.isFinite(b.tech) && marTech < b.tech) continue;
          if (b.coastal && !coastal) continue;
          let whyNot = '';
          if (built.indexOf(key) >= 0) whyNot = 'Already built.';
          else if (p.construction) whyNot = 'Another work is already under way.';
          else if (key === 'walls' && (p.fort | 0) >= 3) whyNot = 'The fortress can rise no higher (fort 3).';
          else if (num(t && t.treasury) < num(b.cost)) whyNot = 'Not enough treasury (' + num(b.cost) + ' talents).';
          // Buildings wear the face of their age (SPEC §52): same key and
          // effects, but 1948 digs a Fortified Line where 66 CE raised Walls.
          const face = buildingFace(b, marTech);
          options.push({
            key, name: face.name || key, cost: num(b.cost), months: num(face.months, 1),
            desc: face.desc || '', canBuild: !whyNot, whyNot,
          });
        }
        return { built, constructing, options };
      } catch (e) { warnOnce('buildInfo', 'getBuildInfo failed', e); return null; }
    },
    buildBuilding(provId, key) {
      try {
        const p = ctx.byId(provId);
        const t = g.tags[g.playerTag];
        const b = (ctx.DEFINES.BUILDINGS || {})[key];
        if (!p || p.impassable || !t || !b) return;
        const face = buildingFace(b, num(t.tech && t.tech.mar));
        const bname = (face.name || key).toLowerCase();
        if (p.owner !== g.playerTag || p.controller !== g.playerTag) {
          say('Cannot build', 'We must own and control ' + p.name + ' to build there.', 'bad'); return;
        }
        if (Array.isArray(p.buildings) && p.buildings.indexOf(key) >= 0) {
          say('Cannot build', p.name + ' already has a ' + bname + '.', 'bad'); return;
        }
        if (p.construction) {
          say('Cannot build', 'Another work is already under way in ' + p.name + '.', 'bad'); return;
        }
        if (key === 'walls' && (p.fort | 0) >= 3) {
          say('Cannot build', 'The fortress of ' + p.name + ' can rise no higher (fort 3).', 'bad'); return;
        }
        if (b.coastal && !isCoastal(ctx, provId)) {
          say('Cannot build', 'A ' + bname + ' needs a coastal harbor.', 'bad'); return;
        }
        if (Number.isFinite(b.tech) && num(t.tech && t.tech.mar) < b.tech) {
          say('Cannot build', 'The ' + bname + ' is beyond this age (military tech ' + b.tech + ' required).', 'bad'); return;
        }
        if (num(t.treasury) < num(b.cost)) {
          say('Cannot build', 'Not enough treasury (' + num(b.cost) + ' talents required).', 'bad'); return;
        }
        t.treasury = num(t.treasury) - num(b.cost);
        p.construction = { key, monthsLeft: Math.max(1, num(face.months, 1)) };
        say('Construction begun', 'Work begins on the ' + bname + ' of ' + p.name + ' (' + num(face.months, 1) + ' months).', 'good');
      } catch (e) { warnOnce('build', 'buildBuilding failed', e); }
    },

    // ---- air power (SPEC §29) ----------------------------------------------
    // The province panel's airfield block: wings based here, hangar space,
    // recruiting terms, and every other field of ours a wing could fly to.
    getAirInfo(provId) {
      try {
        const p = ctx.byId(provId);
        const t = g.tags[g.playerTag];
        if (!p || !t || !hasAirfield(p)) return null;
        if (p.owner !== g.playerTag) return null;
        const AIR = ctx.DEFINES.AIR || {};
        const cap = num(AIR.wingsPerField, 2);
        const wings = airWingsAt(ctx, provId).filter((w) => w.tag === g.playerTag)
          .map((w) => ({
            id: w.id, name: w.name,
            raidCd: w.raidCd | 0,
            pendingRaid: w.pendingRaid || 0,
            pendingName: w.pendingRaid ? ((ctx.byId(w.pendingRaid) || {}).name || '') : '',
            raids: raidTargets(ctx, w).slice(0, 3)
              .map((r) => ({ id: r.id, name: r.name, men: r.men, siege: r.siege, garrison: r.garrison })),
          }));
        const targets = [];
        for (let i = 1; i < g.provinces.length; i++) {
          const q = g.provinces[i];
          if (!q || i === provId || q.owner !== g.playerTag || q.controller !== g.playerTag) continue;
          if (!hasAirfield(q)) continue;
          targets.push({ id: i, name: q.name, room: cap - airWingsAt(ctx, i).length });
        }
        let whyNot = '';
        if (p.controller !== g.playerTag) whyNot = 'The field is in enemy hands.';
        // Aircraft are an import (SPEC §181): the same gate the sim enforces,
        // spoken on the button before the click finds it out.
        const shut = armsGate(ctx, g.playerTag);
        if (!whyNot && shut) whyNot = shut.charAt(0).toUpperCase() + shut.slice(1) + '.';
        const queued = queuedUnitCount(ctx, provId, 'wing', g.playerTag);
        if (!whyNot && wings.length + queued >= cap) whyNot = 'The hangars are full or already committed (' + cap + ' wings).';
        else if (!whyNot && num(t.treasury) < num(AIR.wingCost, 40)) whyNot = 'Not enough talents (' + num(AIR.wingCost, 40) + ' needed).';
        return {
          wings, queued, cap, targets,
          cost: num(AIR.wingCost, 40), upkeep: num(AIR.wingUpkeep, 1), range: num(AIR.rangeHops, 2),
          months: unitRecruitMonths(ctx, 'wing'),
          canRecruit: !whyNot, whyNot,
        };
      } catch (e) { warnOnce('airInfo', 'getAirInfo failed', e); return null; }
    },
    recruitAirWing(provId, kind) {
      try {
        const res = raiseAirWing(ctx, g.playerTag, provId, kind);
        if (!res.ok) { say('Cannot raise a wing', 'The squadron is refused: ' + res.why + '.', 'bad'); return; }
        const p = ctx.byId(provId);
        say('Squadron ordered', 'Crews begin forming at ' + ((p && p.name) || 'the field') + '; the wing will be ready in '
          + num(res.queued && res.queued.totalMonths, unitRecruitMonths(ctx, 'wing')) + ' months.', 'good');
      } catch (e) { warnOnce('recruitWing', 'recruitAirWing failed', e); }
    },
    moveAirWing(wingId, provId) {
      try {
        const res = rebaseAirWing(ctx, g.playerTag, wingId | 0, provId | 0);
        if (!res.ok) { say('Cannot rebase', 'The wing stays put: ' + res.why + '.', 'bad'); return; }
        const p = ctx.byId(provId | 0);
        say('Wing rebased', 'The squadron flies to ' + ((p && p.name) || 'its new field') + '.', 'info');
      } catch (e) { warnOnce('moveWing', 'moveAirWing failed', e); }
    },
    // A strike order is SCHEDULED (v6.2): it flies on the next daily tick,
    // never while the world stands paused. Same target again calls it off.
    raidProvince(wingId, provId) {
      try {
        const res = orderAirRaid(ctx, g.playerTag, wingId | 0, provId | 0);
        if (!res.ok) { say('No raid', 'The wing stays grounded: ' + res.why + '.', 'bad'); return; }
        if (res.cancelled) {
          say('Strike called off', 'The wing stands down' + (res.provName ? ' — ' + res.provName + ' is reprieved' : '') + '.', 'info');
        } else {
          say('Strike ordered', 'The squadron bombs up for ' + res.provName
            + ' — it flies the moment time moves.', 'info');
        }
      } catch (e) { warnOnce('raidProv', 'raidProvince failed', e); }
    },
    // The bombsight (v5.5): which provinces a wing may legally strike right
    // now — ui.js consults this before turning a map click into a raid.
    getWingRaidTargets(wingId) {
      try {
        const w = g.airwings && g.airwings[wingId];
        if (!w || w.tag !== g.playerTag) return [];
        return raidTargets(ctx, w).map((r) => r.id);
      } catch (e) { warnOnce('wingTargets', 'getWingRaidTargets failed', e); return []; }
    },

    // ---- the unit inspector (v5.5) ------------------------------------------
    // Details for ANY clicked unit, friend or foe — what a field commander
    // could see through glasses: banners, strength, patterns, the general's
    // reputation, morale. No hidden rolls are exposed.
    getUnitDetails(sel) {
      try {
        const out = { armies: [], fleet: null, wing: null, provName: '' };
        const ids = sel && Array.isArray(sel.armyIds) ? sel.armyIds
          : (sel && sel.armyId != null ? [sel.armyId] : []);
        for (const id of ids) {
          const a = g.armies && g.armies[id];
          if (!a) continue;
          const t = g.tags[a.tag] || {};
          const p = ctx.byId(a.prov);
          if (p && !out.provName) out.provName = p.name;
          const gen = num(a.gen, 0);
          out.armies.push({
            id: a.id, tag: a.tag, tagName: t.name || a.tag,
            name: a.name || 'Army', men: Math.round(num(a.men)),
            inf: (a.regiments && a.regiments.inf) | 0,
            cav: (a.regiments && a.regiments.cav) | 0,
            infName: genName(gen, 'inf'), cavName: genName(gen, 'cav'),
            morale: num(a.morale), maxMorale: Math.max(0.1, num(a.maxMorale, 3)),
            general: a.general ? {
              name: a.general.name,
              fire: a.general.fire | 0, shock: a.general.shock | 0, maneuver: a.general.maneuver | 0,
            } : null,
            inBattle: !!a.inBattle, retreating: !!a.retreating,
            isOwn: a.tag === g.playerTag,
            // supply (SPEC §82): visible through any commander's glasses —
            // a starving host looks starved
            oosMonths: num(a.oosMonths) | 0,
            supplyText: num(a.oosMonths) > 0
              ? 'Out of supply ' + (num(a.oosMonths) | 0) + ' month' + (num(a.oosMonths) > 1 ? 's' : '')
                + ' — ' + supplyPenaltyText(ctx, a)
              : (a.supplyVia === 'port' ? 'Supplied by sea' : 'In supply'),
          });
        }
        if (sel && sel.fleetId != null && g.fleets && g.fleets[sel.fleetId]) {
          const f = g.fleets[sel.fleetId];
          const t = g.tags[f.tag] || {};
          const p = ctx.byId(f.prov);
          if (p && !out.provName) out.provName = p.name;
          out.fleet = {
            id: f.id, tag: f.tag, tagName: t.name || f.tag,
            ships: f.ships | 0, patternName: navalGenName(f.gen | 0),
            isOwn: f.tag === g.playerTag,
          };
        }
        if (sel && sel.wingId != null && g.airwings && g.airwings[sel.wingId]) {
          const w = g.airwings[sel.wingId];
          const t = g.tags[w.tag] || {};
          const p = ctx.byId(w.prov);
          if (p && !out.provName) out.provName = p.name;
          out.wing = {
            id: w.id, tag: w.tag, tagName: t.name || w.tag,
            leader: (w.leader && w.leader.name) || null,
            rearming: Math.max(0, w.raidCd | 0),
            isOwn: w.tag === g.playerTag,
          };
        }
        return (out.armies.length || out.fleet || out.wing) ? out : null;
      } catch (e) { warnOnce('unitDetails', 'getUnitDetails failed', e); return null; }
    },

    // ---- the arms market (SPEC §181) -----------------------------------------
    getArmsStatus() {
      try {
        if (!armsMarketOn(ctx)) return null;
        const me = g.playerTag;
        if (isArsenal(ctx, me)) return { arsenal: true };
        const st = armsDealState(ctx, me);
        const sup = st.supplier && g.tags[st.supplier] ? g.tags[st.supplier] : null;
        return {
          arsenal: false,
          supplier: st.supplier, supplierName: sup ? (sup.name || st.supplier) : st.supplier,
          live: st.live, why: st.why,
          regard: st.supplier ? Math.round(opinionOf(ctx, st.supplier, me)) : 0,
          floor: num((ctx.DEFINES.ARMS || {}).floor, 25),
        };
      } catch (e) { warnOnce('getArmsStatus', 'getArmsStatus failed', e); return null; }
    },
    signArmsDeal(tag) {
      try {
        const res = signArmsDealCore(ctx, g.playerTag, String(tag));
        if (!res.ok) { say('No agreement', res.why + '.', 'bad'); return; }
        const dropped = res.dropped && g.tags[res.dropped]
          ? ' ' + (g.tags[res.dropped].name || res.dropped) + ' is told last, and coldly.' : '';
        say('The arsenal opens', res.supplier + ' signs the weapons transfer agreement ('
          + res.cost + ' talents): their patterns are ours to raise.' + dropped, 'good');
      } catch (e) { warnOnce('signArmsDeal', 'signArmsDeal failed', e); }
    },

    // ---- loans (frozen contract) -------------------------------------------
    takeLoan() {
      try {
        const t = g.tags[g.playerTag];
        if (!t) return;
        if (num(t.loans) >= MAX_LOANS) {
          say('Loan refused', 'No moneylender will extend us a sixth loan.', 'bad'); return;
        }
        t.loans = num(t.loans) + 1;
        t.treasury = num(t.treasury) + LOAN_SIZE;
        say('Loan taken', '+' + LOAN_SIZE + ' talents borrowed at ' + LOAN_INTEREST_PER_MONTH +
          ' talents interest a month (' + t.loans + ' of ' + MAX_LOANS + ' loans).', 'info');
      } catch (e) { warnOnce('takeLoan', 'takeLoan failed', e); }
    },
    repayLoan() {
      try {
        const t = g.tags[g.playerTag];
        if (!t) return;
        if (num(t.loans) <= 0) { say('No debts', 'We owe the moneylenders nothing.', 'info'); return; }
        if (num(t.treasury) < LOAN_SIZE) {
          say('Cannot repay', 'Repaying a loan takes ' + LOAN_SIZE + ' talents in hand.', 'bad'); return;
        }
        t.treasury = num(t.treasury) - LOAN_SIZE;
        t.loans = num(t.loans) - 1;
        say('Loan repaid', 'A debt of ' + LOAN_SIZE + ' talents is settled (' + t.loans + ' remaining).', 'good');
      } catch (e) { warnOnce('repayLoan', 'repayLoan failed', e); }
    },
    getLoans() {
      try {
        const t = g.tags[g.playerTag];
        const loans = Math.max(0, Math.round(num(t && t.loans)));
        return {
          loans,
          interestPerMonth: loans * LOAN_INTEREST_PER_MONTH,
          canTake: !!t && loans < MAX_LOANS,
          canRepay: !!t && loans > 0 && num(t.treasury) >= LOAN_SIZE,
        };
      } catch (e) {
        warnOnce('getLoans', 'getLoans failed', e);
        return { loans: 0, interestPerMonth: 0, canTake: false, canRepay: false };
      }
    },

    // ---- assault & army actions (frozen contract) ---------------------------
    canAssault(provId) {
      try {
        const info = assaultInfo(ctx, ctx.byId(provId), g.playerTag);
        return { can: info.can, why: info.why, chancePct: info.chancePct, expectedLossesPct: info.expectedLossesPct };
      } catch (e) {
        warnOnce('canAssault', 'canAssault failed', e);
        return { can: false, why: 'No assault is possible.', chancePct: 0, expectedLossesPct: 0 };
      }
    },
    assaultSiege(provId) {
      try {
        const p = ctx.byId(provId);
        const info = assaultInfo(ctx, p, g.playerTag);
        if (!info.can) { say('No assault', info.why || 'The walls cannot be stormed.', 'bad'); return; }
        doAssault(ctx, p, g.playerTag); // notifies success (fall path) / repulse itself
      } catch (e) { warnOnce('assault', 'assaultSiege failed', e); }
    },
    getArmyActions(armyId) {
      try { return armyActionInfo(armyId); }
      catch (e) {
        warnOnce('armyActions', 'getArmyActions failed', e);
        return { canSplit: false, whySplit: '', canHire: false, whyHire: '', hireCost: 50 };
      }
    },
    splitArmy(armyId) {
      try {
        const a = g.armies[armyId];
        if (!a || a.tag !== g.playerTag) return 0;
        const st = armyActionInfo(armyId);
        if (!st.canSplit) { say('Cannot split', st.whySplit, 'bad'); return 0; }
        const nid = splitArmyCore(ctx, a);
        if (!nid) { say('Cannot split', a.name + ' is too depleted to divide.', 'bad'); return 0; }
        return nid;
      } catch (e) { warnOnce('split', 'splitArmy failed', e); return 0; }
    },
    disbandArmy(armyId) {
      try {
        const a = g.armies[armyId];
        if (!a || a.tag !== g.playerTag) return false;
        const st = armyActionInfo(armyId);
        if (!st.canDisband) { say('Cannot stand down', st.whyDisband, 'bad'); return false; }
        const res = disbandArmyCore(ctx, a);
        if (!res.ok) { say('Cannot stand down', res.why, 'bad'); return false; }
        say('Army stood down', res.name + ' is disbanded; maintenance ends'
          + (res.returned ? ', and ' + res.returned.toLocaleString() + ' men return to the manpower pool.' : '.'), 'info');
        return true;
      } catch (e) { warnOnce('disband', 'disbandArmy failed', e); return false; }
    },
    hireGeneral(armyId) {
      try {
        const a = g.armies[armyId];
        const t = g.tags[g.playerTag];
        if (!a || a.tag !== g.playerTag || !t) return;
        const st = armyActionInfo(armyId);
        if (!st.canHire) { say('No general', st.whyHire, 'bad'); return; }
        t.points.mar = num(t.points.mar) - 50;
        const gen = rollGeneral(ctx, g.playerTag);
        a.general = gen;
        say('General hired', gen.name + ' takes command of ' + a.name +
          ' (fire ' + gen.fire + ', shock ' + gen.shock + ', maneuver ' + gen.maneuver + ').', 'good');
      } catch (e) { warnOnce('hire', 'hireGeneral failed', e); }
    },

    // ---- diplomacy (frozen) -----------------------------------------------
    getDiplomacy(tag) {
      return getDip(tag);
    },
    improveRelations(tag) {
      try {
        const d = getDip(tag);
        if (!d) return;
        if (!d.canImprove) { say('Improve relations', d.whyNotImprove || 'We cannot court ' + d.name + ' now.', 'bad'); return; }
        const mine = g.tags[g.playerTag];
        mine.points.infl = num(mine.points.infl) - DIPLO.improveCost;
        addOpinion(ctx, tag, g.playerTag, DIPLO.improveGain);
        setDiploCd(ctx, dipKey(tag, 'improve'), DIPLO.improveCdMonths);
        say('Improve relations', 'Our envoys are warmly received in ' + d.name + ' (+' + DIPLO.improveGain + ' opinion).', 'good');
      } catch (e) { warnOnce('improveRel', 'improveRelations failed', e); }
    },
    sendGift(tag) {
      try {
        const d = getDip(tag);
        if (!d) return;
        if (!d.canGift) { say('Send gift', d.whyNotGift || 'No gift can reach ' + d.name + ' now.', 'bad'); return; }
        const mine = g.tags[g.playerTag];
        mine.treasury = num(mine.treasury) - DIPLO.giftCost;
        addOpinion(ctx, tag, g.playerTag, DIPLO.giftGain);
        setDiploCd(ctx, dipKey(tag, 'gift'), DIPLO.giftCdMonths);
        say('Send gift', 'A caravan of gifts reaches ' + d.name + ' (+' + DIPLO.giftGain + ' opinion).', 'good');
      } catch (e) { warnOnce('sendGift', 'sendGift failed', e); }
    },
    // Guarantees & subsidies (SPEC §24)
    guaranteeNation(tag) {
      try {
        const d = getDip(tag);
        if (!d) return;
        if (!d.canGuarantee) { say('Guarantee', d.whyNotGuarantee || 'We cannot extend our word to ' + d.name + '.', 'bad'); return; }
        const mine = g.tags[g.playerTag];
        mine.points.infl = num(mine.points.infl) - 50;
        if (!Array.isArray(mine.guarantees)) mine.guarantees = [];
        mine.guarantees.push(tag);
        addOpinion(ctx, tag, g.playerTag, 15);
        say('Guarantee', 'Our word now protects ' + d.name + ': attack them, and you fight us (+15 opinion).', 'good');
      } catch (e) { warnOnce('guarantee', 'guaranteeNation failed', e); }
    },
    revokeGuarantee(tag) {
      try {
        const mine = g.tags[g.playerTag];
        if (!mine || !Array.isArray(mine.guarantees) || mine.guarantees.indexOf(tag) < 0) return;
        mine.guarantees = mine.guarantees.filter((x) => x !== tag);
        addOpinion(ctx, tag, g.playerTag, -20);
        say('Guarantee withdrawn', 'Our protection of ' + ((g.tags[tag] && g.tags[tag].name) || tag)
          + ' is quietly ended (−20 opinion).', 'info');
      } catch (e) { warnOnce('revokeGuarantee', 'revokeGuarantee failed', e); }
    },
    sendSubsidy(tag) {
      try {
        const d = getDip(tag);
        if (!d) return;
        if (!d.canSubsidize) { say('Subsidy', d.whyNotSubsidize || 'No subsidy can reach ' + d.name + '.', 'bad'); return; }
        if (!Array.isArray(g.subsidies)) g.subsidies = [];
        g.subsidies.push({ from: g.playerTag, to: tag, amount: 10, monthsLeft: 12 });
        addOpinion(ctx, tag, g.playerTag, 20);
        say('Subsidy', 'Our silver will flow to ' + d.name + ': 10 talents a month for a year (+20 opinion).', 'good');
      } catch (e) { warnOnce('sendSubsidy', 'sendSubsidy failed', e); }
    },
    cancelSubsidy(tag) {
      try {
        if (!Array.isArray(g.subsidies)) return;
        const at = g.subsidies.findIndex((s) => s && s.from === g.playerTag && s.to === tag && !s.reparation);
        if (at < 0) { say('Subsidy', 'Reparations cannot be cancelled — only paid.', 'bad'); return; }
        g.subsidies.splice(at, 1);
        addOpinion(ctx, tag, g.playerTag, -10);
        say('Subsidy ended', 'The silver stops (−10 opinion).', 'info');
      } catch (e) { warnOnce('cancelSubsidy', 'cancelSubsidy failed', e); }
    },
    offerAlliance(tag) {
      try {
        const d = getDip(tag);
        if (!d) return;
        if (!d.canAlly) { say('Alliance', d.whyNotAlly || 'No alliance is possible with ' + d.name + '.', 'bad'); return; }
        const bar = allianceBarred(ctx, g.playerTag, tag);
        if (bar) { say('Alliance', bar, 'bad'); return; }
        const me = g.playerTag;
        const mine = g.tags[me], them = g.tags[tag];
        const accept = d.opinionOfUs >= DIPLO.allyAcceptOpinion ||
          (d.opinionOfUs >= DIPLO.allyMinOpinion && sharedWarEnemy(ctx, me, tag));
        if (accept) {
          if (!mine.allies) mine.allies = [];
          if (!them.allies) them.allies = [];
          if (mine.allies.indexOf(tag) < 0) mine.allies.push(tag);
          if (them.allies.indexOf(me) < 0) them.allies.push(me);
          say('Alliance', d.name + ' binds itself to our cause. Our wars to come are theirs.', 'good');
        } else {
          addOpinion(ctx, tag, me, DIPLO.allyRefuseOpinion);
          setDiploCd(ctx, dipKey(tag, 'ally'), DIPLO.allyCdMonths);
          say('Alliance refused', d.name + ' declines our offer, and will hear no other for ' + DIPLO.allyCdMonths + ' months.', 'bad');
        }
      } catch (e) { warnOnce('offerAlliance', 'offerAlliance failed', e); }
    },
    breakAlliance(tag) {
      try {
        const d = getDip(tag);
        if (!d) return;
        if (!d.canBreak) { say('Alliance', 'We have no alliance with ' + d.name + '.', 'bad'); return; }
        if (breakAllianceCore(ctx, g.playerTag, tag)) {
          say('Alliance broken', 'We renounce our alliance with ' + d.name + '. They will not soon forget it.', 'info');
        }
      } catch (e) { warnOnce('breakAlliance', 'breakAlliance failed', e); }
    },
    // Embargo and blockade (SPEC §100).
    embargoState(tag) {
      try {
        const info = embargoInfo(ctx, g.playerTag, tag);
        if (!info.offered) { say('Embargo', info.why || 'This age does not close its markets by decree.', 'bad'); return; }
        if (info.active) {
          if (!info.canBlockade) { say('Blockade', info.whyBlockade || 'Not possible.', 'bad'); return; }
          const res = declareEmbargoCore(ctx, g.playerTag, tag, { blockade: true });
          if (!res.ok) { say('Blockade', res.why || 'Not possible.', 'bad'); return; }
          say('Blockade declared', 'Our squadrons close the approaches to ' + res.name
            + ': their harbors earn a third of what they did, and their trade is halved again.', 'good');
          return;
        }
        const res = declareEmbargoCore(ctx, g.playerTag, tag);
        if (!res.ok) { say('Embargo', res.why || 'Not possible.', 'bad'); return; }
        say('Markets closed', 'Our markets are shut to ' + res.name
          + '. Their trade suffers while it stands — and their court will not forget who signed it.', 'good');
      } catch (e) { warnOnce('embargoState', 'embargoState failed', e); }
    },
    liftEmbargo(tag) {
      try {
        const res = liftEmbargoCore(ctx, g.playerTag, tag);
        if (!res.ok) { say('Embargo', res.why || 'There is nothing to lift.', 'bad'); return; }
        say('Markets reopened', 'The ban on trade with ' + res.name + ' is lifted (+20 opinion).', 'info');
      } catch (e) { warnOnce('liftEmbargo', 'liftEmbargo failed', e); }
    },

    // Recognition (SPEC §96): the peace on offer where an alliance is not.
    // Their court weighs it the way it weighs an alliance — on what it thinks
    // of us — but the bar is far lower, because recognition asks for nothing
    // but an end to the state of war.
    recognizeState(tag) {
      try {
        const d = getDip(tag);
        if (!d) return;
        const info = recognitionInfo(ctx, g.playerTag, tag);
        if (!info.can) { say('Recognition', info.why || 'No recognition is possible.', 'bad'); return; }
        const mine = g.tags[g.playerTag];
        mine.points.infl = num(mine.points.infl) - info.cost;
        if (opinionOf(ctx, tag, g.playerTag) < DIPLO.recognizeAcceptOpinion) {
          addOpinion(ctx, tag, g.playerTag, DIPLO.recognizeRefuseOpinion);
          setDiploCd(ctx, recognizeCd(g.playerTag, tag), DIPLO.recognizeCdMonths);
          say('Recognition refused', info.name + ' returns the letters unopened, and will hear no others for '
            + DIPLO.recognizeCdMonths + ' months.', 'bad');
          return;
        }
        const res = recognizeCore(ctx, g.playerTag, tag);
        if (!res.ok) { say('Recognition', res.why || 'The papers cannot be signed.', 'bad'); return; }
        say('Recognition', 'We and ' + res.name + ' recognize one another'
          + (res.endedWar ? '; the guns stop where they stand' : '')
          + '. Neither state may take up arms against the other while the papers hold.', 'good');
      } catch (e) { warnOnce('recognizeState', 'recognizeState failed', e); }
    },
    renounceRecognition(tag) {
      try {
        const res = renounceRecognitionCore(ctx, g.playerTag, tag);
        if (!res.ok) { say('Recognition', res.why || 'There is nothing to renounce.', 'bad'); return; }
        say('Recognition withdrawn', 'We withdraw our recognition of ' + res.name
          + ' (' + DIPLO.recognizeBreakOpinion + ' opinion, ' + DIPLO.recognizeBreakLegitimacy
          + ' public mandate). The road back to war is open, and everyone saw us open it.', 'info');
      } catch (e) { warnOnce('renounceRecognition', 'renounceRecognition failed', e); }
    },
    // Royal marriage (SPEC §62): join two crowned houses.
    royalMarriage(tag) {
      try {
        const res = royalMarriageCore(ctx, g.playerTag, tag);
        if (!res.ok) { say('No match', res.why, 'bad'); return; }
        say('The houses are joined', 'Our house is wed to that of ' + res.name
          + ' (+' + DIPLO.marryOpinionGain + ' opinion both ways). A married dynasty is likelier to be blessed with an heir.', 'good');
      } catch (e) { warnOnce('royalMarriage', 'royalMarriage failed', e); }
    },
    // Incorporation (SPEC §61): begin weaving a devoted client into the realm.
    incorporateVassal(tag) {
      try {
        const res = incorporateCore(ctx, g.playerTag, tag);
        if (!res.ok) { say('The union waits', res.why, 'bad'); return; }
        say('The union begins', 'The weaving of ' + res.name + ' into the realm begins: '
          + res.cost + ' influence points spent, ' + res.months + ' months of patient work ahead. '
          + 'War, or their affection faltering, would undo it all.', 'good');
      } catch (e) { warnOnce('incorporate', 'incorporateVassal failed', e); }
    },

    // ---- monarch-point sinks (v1.1) --------------------------------------
    // EU4 mapping: tax dev = Governance, prod dev = Influence, mp dev = Martial.
    // Development (SPEC §24): cost scales with the town's size — 50 + 5×dev.
    devProvince(provId, kind) {
      try {
        const p = ctx.byId(provId | 0);
        const r = developCore(ctx, g.playerTag, provId | 0, kind);
        if (!r.ok) { say('Development', r.why, 'bad'); return; }
        say('Development', (p ? p.name : 'The province') + ' grows: +1 '
          + (kind === 'tax' ? 'tax' : kind === 'prod' ? 'production' : 'manpower')
          + ' development (' + r.cost + ' points).', 'good');
      } catch (e) { warnOnce('dev', 'devProvince failed', e); }
    },
    buyStability() {
      try {
        const t = g.tags[g.playerTag];
        if (!t) return;
        if (t.stability >= 3) { say('Stability', 'The realm is as steady as it will ever be.', 'info'); return; }
        if (num(t.points.gov) < 75) { say('Stability', 'Not enough governance points (75 required).', 'bad'); return; }
        t.points.gov -= 75;
        t.stability = clamp(t.stability + 1, -3, 3);
        say('Stability', 'Order is restored a measure (+1 stability).', 'good');
      } catch (e) { warnOnce('stab', 'buyStability failed', e); }
    },
    callReserves() {
      try {
        const t = g.tags[g.playerTag];
        if (!t) return;
        if (num(t.points.mar) < 50) { say('Reserves', 'Not enough martial points (50 required).', 'bad'); return; }
        if (num(t.manpower) >= num(t.maxManpower)) { say('Reserves', 'Every fighting man is already mustered.', 'info'); return; }
        t.points.mar -= 50;
        t.manpower = Math.min(num(t.maxManpower), num(t.manpower) + 2000);
        say('Reserves', 'The villages send their sons: +2,000 manpower.', 'good');
      } catch (e) { warnOnce('reserves', 'callReserves failed', e); }
    },

    // ---- peace (EU4-style deal builder) ------------------------------------
    // getPeaceInfo -> what can be demanded; evaluatePeace -> live price &
    // acceptance preview; offerPeaceDeal -> send the envoys.
    getPeaceInfo(warId, enemyTag) {
      try {
        const war = g.wars.find((w) => w && w.id === warId);
        const me = g.playerTag;
        if (!war) return null;
        if (war.attackers.indexOf(me) < 0 && war.defenders.indexOf(me) < 0) return null;
        const info = peaceDealInfo(ctx, war, me, enemyTag);
        // Rebuffed envoys cool per court (SPEC §67): a door slammed in Amman
        // does not close the one in Damascus.
        info.envoyMonthsLeft = diploCdMonthsLeft(ctx,
          'peace:' + war.id + (info.separate ? ':' + info.enemyLeader : ''));
        return info;
      } catch (e) { warnOnce('peaceInfo', 'getPeaceInfo failed', e); return null; }
    },
    evaluatePeace(warId, deal) {
      try {
        const war = g.wars.find((w) => w && w.id === warId);
        const me = g.playerTag;
        if (!war) return null;
        if (war.attackers.indexOf(me) < 0 && war.defenders.indexOf(me) < 0) return null;
        return evaluatePeaceDeal(ctx, war, me, deal);
      } catch (e) { warnOnce('peaceEval', 'evaluatePeace failed', e); return null; }
    },
    offerPeaceDeal(warId, deal) {
      try {
        const war = g.wars.find((w) => w && w.id === warId);
        const me = g.playerTag;
        if (!war) return;
        if (war.attackers.indexOf(me) < 0 && war.defenders.indexOf(me) < 0) return;
        // SPEC §31: the player may ALWAYS sue for peace — even in scripted
        // fight-to-the-death wars. Whether the enemy listens is another
        // matter (evaluatePeaceDeal), and the AI keeps its own counsel.
        const scope = peaceDealInfo(ctx, war, me, deal && deal.enemy);
        const cdKey = 'peace:' + war.id + (scope.separate ? ':' + scope.enemyLeader : '');
        if (diploCdActive(ctx, cdKey)) {
          say('Envoys rebuffed', 'That court will not receive our envoys again yet ('
            + diploCdMonthsLeft(ctx, cdKey) + ' months).', 'bad');
          return;
        }
        const ev = evaluatePeaceDeal(ctx, war, me, deal);
        if (ev.acceptable) {
          executePeaceDeal(ctx, war, me, deal);
        } else {
          setDiploCd(ctx, cdKey, 6);
          if (!sendAiCounteroffer(ctx, war, me, deal)) {
            say('Terms refused', ev.reason + ' Six months until they will listen again.', 'bad');
          }
        }
      } catch (e) { warnOnce('peace', 'offerPeaceDeal failed', e); }
    },

    // ---- war overview --------------------------------------------------------
    // Everything the war panel shows: sides, the player's score broken into
    // battles / occupation / events (net of the enemy's same components),
    // who occupies what, duration, CB, and whether the dove can fly.
    getWarInfo(warId) {
      try {
        const war = g.wars.find((w) => w && w.id === warId);
        const me = g.playerTag;
        if (!war) return null;
        const onAtt = war.attackers.indexOf(me) >= 0;
        if (!onAtt && war.defenders.indexOf(me) < 0) return null;
        const myKey = onAtt ? 'att' : 'def';
        const theirKey = onAtt ? 'def' : 'att';
        const mine = sideComponents(ctx, war, myKey);
        const theirs = sideComponents(ctx, war, theirKey);
        const rawGoal = warGoalInfo(ctx, war);
        const goal = rawGoal ? {
          ...rawGoal,
          score: onAtt ? rawGoal.score : -rawGoal.score,
          holder: !rawGoal.holderKey
            ? 'contested'
            : rawGoal.holderKey === myKey ? 'ours' : 'theirs',
        } : null;
        const mySide = onAtt ? war.attackers : war.defenders;
        const theirSide = onAtt ? war.defenders : war.attackers;
        const sideRow = (tag) => ({
          tag,
          name: (g.tags[tag] && g.tags[tag].name) || tag,
          alive: !!(g.tags[tag] && g.tags[tag].alive),
        });
        const weHold = [];
        const theyHold = [];
        for (let i = 1; i < g.provinces.length; i++) {
          const p = g.provinces[i];
          if (!p || p.impassable || p.owner === p.controller) continue;
          if (theirSide.indexOf(p.owner) >= 0 && mySide.indexOf(p.controller) >= 0) {
            weHold.push({ id: i, name: p.name, dev: devTotal(p) });
          } else if (mySide.indexOf(p.owner) >= 0 && theirSide.indexOf(p.controller) >= 0) {
            theyHold.push({ id: i, name: p.name, dev: devTotal(p) });
          }
        }
        weHold.sort((a, b) => b.dev - a.dev);
        theyHold.sort((a, b) => b.dev - a.dev);
        return {
          warId: war.id, warName: war.name,
          cb: war.cb || null,
          started: { ...war.started },
          months: Math.max(0, monthsBetween(war.started, g.date)),
          mySide: mySide.map(sideRow), theirSide: theirSide.map(sideRow),
          myWs: Math.round(num(war.warscore && war.warscore[me])),
          breakdown: {
            battles: Math.round(mine.battles - theirs.battles),
            occupation: Math.round(mine.occupation - theirs.occupation),
            goal: Math.round(mine.goal - theirs.goal),
            events: Math.round(mine.events - theirs.events),
          },
          goal, weHold, theyHold,
          noNegotiation: !!war.noNegotiation,
          envoyMonthsLeft: diploCdMonthsLeft(ctx, 'peace:' + war.id),
        };
      } catch (e) { warnOnce('warInfo', 'getWarInfo failed', e); return null; }
    },

    // ---- the fleet ------------------------------------------------------------------
    getNavy() {
      try {
        const me = g.playerTag;
        const fleets = Object.values(g.fleets || {}).filter((f) => f && f.tag === me && f.ships > 0)
          .map((f) => {
            const aboard = Object.values(g.armies).filter((a) => a && a.aboard === f.id);
            const here = Object.values(g.armies).filter((a) => a && !a.aboard && a.prov === f.prov && a.tag === me && !a.inBattle);
            const p = ctx.byId(f.prov);
            const mi = modernizeFleetInfo(ctx, f);
            return {
              id: f.id, name: f.name, ships: f.ships, prov: f.prov,
              provName: (p && p.name) || ('#' + f.prov),
              sailing: !!(f.path && f.path.length),
              moveDaysLeft: f.moveDaysLeft, hopTotal: f.hopTotal,
              aboardMen: aboard.reduce((s2, a) => s2 + num(a.men), 0),
              canEmbark: here.length > 0 && !(f.path && f.path.length),
              canDisembark: aboard.length > 0 && !(f.path && f.path.length),
              capacity: f.ships * 1000,
              // eras at sea & their commanders (SPEC §31)
              gen: num(f.gen, 0),
              genName: navalGenName(num(f.gen, 0)),
              newGenName: mi.can ? navalGenName(mi.cur) : null,
              canModernize: mi.can, modernizeCost: mi.cost, whyModernize: mi.why || '',
              admiral: f.admiral ? { name: f.admiral.name, maneuver: num(f.admiral.maneuver) } : null,
              canHireAdmiral: !f.admiral && num(g.tags[me].points && g.tags[me].points.mar) >= 50,
            };
          });
        const merchant = merchantShipsOf(ctx, me);
        const voyages = merchantVoyagesOf(ctx, me).map((v) => ({
          from: v.from, to: v.to, daysLeft: v.daysLeft,
          fromName: (ctx.byId(v.from) || {}).name || ('#' + v.from),
          toName: v.kind === 'trade' && v.leg === 'dwell'
            ? 'trading at ' + (((ctx.byId(v.to) || {}).name) || ('#' + v.to)) + (v.payout ? ', ~' + v.payout + ' talents' : '')
            : ((ctx.byId(v.to) || {}).name || ('#' + v.to)) + (v.kind === 'trade' && v.leg === 'home' && v.payout ? ' (~' + v.payout + ' talents aboard)' : ''),
        }));
        return {
          fleets,
          merchant,
          voyages,
          merchantCount: merchant.reduce((sum, row) => sum + row.count, 0) + voyages.length,
          merchantActive: merchant.reduce((sum, row) => sum + (row.active ? row.count : 0), 0),
        };
      } catch (e) { warnOnce('getNavy', 'getNavy failed', e); return { fleets: [] }; }
    },
    // ---- supply lines (SPEC §82): the traced route, live, for any army ------
    getSupplyStatus(armyId) {
      try {
        const a = g.armies[armyId];
        if (!a) return null;
        const res = traceSupply(ctx, a);
        const oos = num(a.oosMonths) | 0;
        return {
          armyId: a.id, ok: res.ok, via: res.via, months: oos,
          route: res.route.slice(), breakAt: res.breakAt, homePort: res.homePort,
          reason: res.reason, reasonText: supplyReasonText(ctx, res),
          penaltyText: oos > 0 ? supplyPenaltyText(ctx, a) : '',
          exempt: supplyExempt(ctx, a),
        };
      } catch (e) { warnOnce('supplyStatus', 'getSupplyStatus failed', e); return null; }
    },
    modernizeFleet(fleetId) {
      try {
        const f = (g.fleets || {})[fleetId];
        if (!f || f.tag !== g.playerTag) return;
        const res = modernizeFleetCore(ctx, f);
        if (!res.ok) { say('No refit', res.why, 'bad'); return; }
        say('Fleet re-rigged', f.name + ' refits as ' + res.name + ' (' + res.cost + ' talents).', 'good');
      } catch (e) { warnOnce('modernizeFleet', 'modernizeFleet failed', e); }
    },
    hireAdmiral(fleetId) {
      try {
        const f = (g.fleets || {})[fleetId];
        if (!f || f.tag !== g.playerTag) return;
        const res = hireAdmiralCore(ctx, f);
        if (!res.ok) { say('No admiral', res.why, 'bad'); return; }
        say('An admiral takes the deck', res.admiral.name + ' commands ' + f.name
          + ' (seamanship ' + num(res.admiral.maneuver) + ').', 'good');
      } catch (e) { warnOnce('hireAdmiral', 'hireAdmiral failed', e); }
    },
    // ---- air wings for the outliner (SPEC §31) -------------------------------
    getAirWings() {
      try {
        return airWingsOf(ctx, g.playerTag).map((w) => {
          const p = ctx.byId(w.prov);
          return {
            id: w.id, name: w.name, prov: w.prov,
            provName: (p && p.name) || ('#' + w.prov),
            raidCd: w.raidCd | 0,
            pendingName: w.pendingRaid ? ((ctx.byId(w.pendingRaid) || {}).name || '') : '',
            leader: w.leader ? { name: w.leader.name, fire: num(w.leader.fire), maneuver: num(w.leader.maneuver) } : null,
            canHireLeader: !w.leader && num(g.tags[g.playerTag].points && g.tags[g.playerTag].points.mar) >= 50,
          };
        });
      } catch (e) { warnOnce('getAirWings', 'getAirWings failed', e); return []; }
    },
    hireWingLeader(wingId) {
      try {
        const res = hireWingLeaderCore(ctx, g.playerTag, wingId | 0);
        if (!res.ok) { say('No commander', res.why, 'bad'); return; }
        say('A commander takes the squadron', res.leader.name + ' leads the wing '
          + '(bombing ' + num(res.leader.fire) + ', evasion ' + num(res.leader.maneuver) + ').', 'good');
      } catch (e) { warnOnce('hireWingLeader', 'hireWingLeader failed', e); }
    },
    buildShip(provId) {
      try {
        const res = buildShipCore(ctx, g.playerTag, provId | 0);
        if (!res.ok) { say('No ship today', res.why, 'bad'); return; }
        const p = ctx.byId(provId | 0);
        say('Hull laid down', 'A new warship begins fitting out at ' + ((p && p.name) || 'port') + '; it will be ready in '
          + num(res.queued && res.queued.totalMonths, unitRecruitMonths(ctx, 'ship')) + ' months.', 'good');
      } catch (e) { warnOnce('buildShip', 'buildShip failed', e); }
    },
    getMerchantShipInfo(provId) {
      try { return merchantShipInfo(ctx, g.playerTag, provId | 0); }
      catch (e) { warnOnce('merchantInfo', e); return { visible: false, can: false, why: 'Unavailable.' }; }
    },
    commissionMerchantShip(provId) {
      try {
        const p = ctx.byId(provId | 0);
        const res = commissionMerchantShipCore(ctx, g.playerTag, provId | 0);
        if (!res.ok) { say('No merchantman today', res.why, 'bad'); return false; }
        say('A merchantman takes the water', ((p && p.name) || 'The port') + ' now supports '
          + res.count + ' of ' + res.cap + ' civilian ships (+' + res.incomeEach + ' trade each month while the harbor is open).', 'good');
        return true;
      } catch (e) { warnOnce('commissionMerchant', e); return false; }
    },
    // Where this port's merchantmen may sail (SPEC §58): our other working
    // shipyard harbors, nearest first, with berth availability.
    getMerchantDestinations(provId) {
      try { return merchantDestinations(ctx, g.playerTag, provId | 0); }
      catch (e) { warnOnce('merchantDest', e); return []; }
    },
    sendMerchantShip(fromId, toId) {
      try {
        const res = sendMerchantCore(ctx, g.playerTag, fromId | 0, toId | 0);
        if (!res.ok) { say('The ship stays home', res.why, 'bad'); return false; }
        say('A merchantman puts to sea', 'She makes for ' + res.toName + ' — about '
          + res.days + ' days under sail. She earns nothing while at sea.', 'good');
        return true;
      } catch (e) { warnOnce('sendMerchant', e); return false; }
    },
    // Trade runs (v6.1): the foreign harbors open (or closed) to this port's
    // merchantmen, with the lump sum a completed round trip lands.
    getTradeRunDestinations(provId) {
      try { return tradeRunDestinations(ctx, g.playerTag, provId | 0); }
      catch (e) { warnOnce('tradeDest', e); return []; }
    },
    sendTradeRun(fromId, toId) {
      try {
        const res = sendTradeRunCore(ctx, g.playerTag, fromId | 0, toId | 0);
        if (!res.ok) { say('The market is closed to us', res.why, 'bad'); return false; }
        say('A trade run puts to sea', 'She makes for ' + res.toName + ' under ' + res.hostName
          + '\'s peace — a month in their market, then home with about ' + res.payout + ' talents.', 'good');
        return true;
      } catch (e) { warnOnce('sendTradeRun', e); return false; }
    },
    moveFleet(fleetId, provId) {
      try {
        const f = (g.fleets || {})[fleetId];
        if (!f || f.tag !== g.playerTag) return;
        if (!isCoastal(ctx, provId | 0)) { say('No harbor there', 'Fleets sail port to port — pick a coastal province.', 'bad'); return; }
        issueFleetMove(ctx, f, provId | 0);
      } catch (e) { warnOnce('moveFleet', 'moveFleet failed', e); }
    },
    embarkFleet(fleetId) {
      try {
        const f = (g.fleets || {})[fleetId];
        if (!f || f.tag !== g.playerTag) return;
        const here = Object.values(g.armies).filter((a) => a && !a.aboard && a.prov === f.prov && a.tag === g.playerTag && !a.inBattle);
        let boarded = 0;
        for (const a of here) {
          const res = embarkCore(ctx, f, a.id);
          if (res.ok) boarded++;
          else if (!boarded) { say('They stay ashore', res.why, 'bad'); return; }
        }
        if (boarded) say('The army embarks', boarded + (boarded === 1 ? ' army is' : ' armies are') + ' aboard. Sail, then disembark.', 'good');
      } catch (e) { warnOnce('embarkFleet', 'embarkFleet failed', e); }
    },
    disembarkFleet(fleetId) {
      try {
        const f = (g.fleets || {})[fleetId];
        if (!f || f.tag !== g.playerTag) return;
        const n = disembarkCore(ctx, f);
        if (n) {
          const p = ctx.byId(f.prov);
          say('Boots on the shore', n + (n === 1 ? ' army lands' : ' armies land') + ' at ' + ((p && p.name) || 'the coast') + '.', 'good');
          // landing on hostile ground is an assault landing: engage at once
          for (const a of Object.values(g.armies)) {
            if (a && a.prov === f.prov && a.tag === g.playerTag && !a.aboard) {
              try { engageIfNeeded(ctx, a); } catch (err) { /* engagement optional */ }
            }
          }
        }
      } catch (e) { warnOnce('disembarkFleet', 'disembarkFleet failed', e); }
    },

    // ---- the court (advisors) ------------------------------------------------------
    // Each pool can seat one advisor: +skill (1-3) to that pool's monthly gain,
    // wage skill*2 talents a month (tick.js). Two candidates per empty seat,
    // rerolled after every hire or dismissal.
    getCourt() {
      try {
        const t = g.tags[g.playerTag];
        if (!t) return null;
        if (!t.advisors) t.advisors = { gov: null, infl: null, mar: null };
        if (!t.courtCand) t.courtCand = {};
        if (!Number.isFinite(t.aggression)) t.aggression = 0;
        // The chapter's pool if it names one (SPEC §143); `advisorEras` below
        // still wins where a chapter dates its court by decade.
        let pool = courtNamePool(ctx, g.playerTag);
        const eras = ctx.bookmark && Array.isArray(ctx.bookmark.advisorEras)
          ? ctx.bookmark.advisorEras.filter((row) => row && row.from <= g.date.y)
            .sort((a, b) => b.from - a.from) : [];
        const era = eras[0];
        if (era && Array.isArray(era.names) && era.names.length) {
          pool = era.names;
          if (t.advisorEra !== era.from) {
            for (const k of ['gov', 'infl', 'mar']) {
              const seated = t.advisors[k];
              if (seated && pool.indexOf(seated.name) < 0) t.advisors[k] = null;
            }
            t.courtCand = {};
            t.advisorEra = era.from;
          }
        }
        const out = {};
        for (const k of ['gov', 'infl', 'mar']) {
          if (!t.advisors[k] && (!Array.isArray(t.courtCand[k]) || !t.courtCand[k].length)) {
            t.courtCand[k] = [0, 1].map(() => {
              const skill = 1 + ctx.rng.int(3);
              return { name: ctx.rng.pick(pool), skill, cost: skill * 30, wage: skill * 2 };
            });
          }
          out[k] = { seated: t.advisors[k], candidates: t.advisors[k] ? [] : t.courtCand[k] };
        }
        return out;
      } catch (e) { warnOnce('getCourt', 'getCourt failed', e); return null; }
    },
    hireAdvisor(kind, idx) {
      try {
        const t = g.tags[g.playerTag];
        if (!t || ['gov', 'infl', 'mar'].indexOf(kind) < 0 || t.advisors[kind]) return;
        const cand = t.courtCand && t.courtCand[kind] && t.courtCand[kind][idx | 0];
        if (!cand) return;
        if (num(t.treasury) < cand.cost) { say('The purse is light', 'Hiring ' + cand.name + ' costs ' + cand.cost + ' talents.', 'bad'); return; }
        t.treasury = num(t.treasury) - cand.cost;
        t.advisors[kind] = { name: cand.name, skill: cand.skill, wage: cand.wage };
        t.courtCand[kind] = [];
        say('An advisor takes their seat', cand.name + ' joins the court (+' + cand.skill + ' ' + kind + ' a month, ' + cand.wage + ' talents wage).', 'good');
      } catch (e) { warnOnce('hireAdvisor', 'hireAdvisor failed', e); }
    },
    dismissAdvisor(kind) {
      try {
        const t = g.tags[g.playerTag];
        if (!t || !t.advisors || !t.advisors[kind]) return;
        say('Dismissed', t.advisors[kind].name + ' leaves the court.', 'info');
        t.advisors[kind] = null;
        if (t.courtCand) t.courtCand[kind] = [];
      } catch (e) { warnOnce('dismissAdvisor', 'dismissAdvisor failed', e); }
    },

    // ---- reforms (idea trees) ----------------------------------------------------
    getIdeas() {
      try {
        const t = g.tags[g.playerTag];
        if (!t) return null;
        const reforms = t.reforms || { mil: 0, civ: 0, rel: 0 };
        return Object.keys(IDEA_TREES).map((key) => {
          const tree = IDEA_TREES[key];
          const owned = reforms[key] | 0;
          const next = owned < tree.tiers.length ? tree.tiers[owned] : null;
          const cost = next ? ideaCost(owned) : 0;
          const have = num(t.points[tree.point]);
          return {
            key, name: tree.name, point: tree.point, owned, cost,
            tiers: tree.tiers.map((ti, i) => ({ name: ti.name, desc: ti.desc, owned: i < owned })),
            canBuy: !!next && have >= cost,
            whyNot: !next ? 'Every reform in this tree is enacted.'
              : have < cost ? `Needs ${cost} ${tree.point === 'mar' ? 'martial' : tree.point === 'gov' ? 'government' : 'influence'} points.` : '',
          };
        });
      } catch (e) { warnOnce('getIdeas', 'getIdeas failed', e); return null; }
    },
    buyIdea(treeKey) {
      try {
        const t = g.tags[g.playerTag];
        const tree = IDEA_TREES[treeKey];
        if (!t || !tree) return;
        if (!t.reforms) t.reforms = { mil: 0, civ: 0, rel: 0 };
        const owned = t.reforms[treeKey] | 0;
        if (owned >= tree.tiers.length) return;
        const cost = ideaCost(owned);
        if (num(t.points[tree.point]) < cost) {
          say('The realm is not ready', 'This reform needs ' + cost + ' points.', 'bad');
          return;
        }
        t.points[tree.point] = num(t.points[tree.point]) - cost;
        t.reforms[treeKey] = owned + 1;
        applyReformsToTag(ctx.DEFINES, t, g.playerTag);
        say('Reform enacted', tree.tiers[owned].name + ' — ' + tree.tiers[owned].desc, 'good');
      } catch (e) { warnOnce('buyIdea', 'buyIdea failed', e); }
    },

    // ---- the ideas of the age (SPEC §179) ----------------------------------------
    // The chapter's four era idea groups, each behind a named rung of its own
    // ladder — the panel's locked cards read `unlockText`, the EU4 screen's
    // "Unlocked at Renaissance Thought (7)". Costs pay the institutions
    // surcharge exactly as the ladders do (SPEC §166): a realm behind the
    // world pays more to think.
    getEraIdeas() {
      try {
        const t = g.tags[g.playerTag];
        if (!t) return null;
        const groups = eraIdeaGroupsFor(ctx.bookmark, g.playerTag, t);
        if (!groups.length) return [];
        const owned = t.eraIdeas || {};
        const instMult = institutionMult(ctx, g.playerTag);
        const instPct = Math.round((instMult - 1) * 100);
        const ptName = { mar: 'martial', gov: 'government', infl: 'influence' };
        return groups.map((gdef) => {
          const n = Math.max(0, Math.min(gdef.tiers.length, owned[gdef.key] | 0));
          const unlocked = eraIdeaUnlocked(t, gdef);
          const next = unlocked && n < gdef.tiers.length ? gdef.tiers[n] : null;
          const cost = next ? Math.round(eraIdeaCost(n) * instMult) : 0;
          const have = num(t.points[gdef.point]);
          const rungName = techLevelName(ctx.bookmark, gdef.unlock.ladder, gdef.unlock.level);
          const ladderName = (TECH_CATEGORIES[gdef.unlock.ladder] || {}).name || gdef.unlock.ladder;
          return {
            key: gdef.key, name: gdef.name, icon: gdef.icon || 'lamp',
            desc: gdef.desc, point: gdef.point, owned: n,
            unlocked,
            unlockText: 'Unlocked at ' + rungName + ' (' + gdef.unlock.level + ')',
            unlockDetail: ladderName + ' technology ' + gdef.unlock.level + ' — ' + rungName + ' — opens this idea.',
            tiers: gdef.tiers.map((ti, i) => ({ name: ti.name, desc: ti.desc, owned: i < n })),
            cost, instPct,
            canBuy: !!next && have >= cost,
            whyNot: !unlocked ? 'The age has not taught this yet.'
              : !next ? 'Every idea in this group is taken up.'
                : have < cost ? 'Needs ' + cost + ' ' + (ptName[gdef.point] || gdef.point) + ' points'
                  + (instPct > 0 ? ' (behind the world: +' + instPct + '%)' : '') + '.'
                  : (instPct > 0 ? 'Behind the world: +' + instPct + '%.' : ''),
          };
        });
      } catch (e) { warnOnce('getEraIdeas', 'getEraIdeas failed', e); return null; }
    },
    buyEraIdea(groupKey) {
      try {
        const t = g.tags[g.playerTag];
        if (!t) return;
        const gdef = eraIdeaGroupsFor(ctx.bookmark, g.playerTag, t).find((x) => x.key === groupKey);
        if (!gdef) return;
        if (!t.eraIdeas) t.eraIdeas = {};
        const owned = t.eraIdeas[groupKey] | 0;
        if (owned >= gdef.tiers.length) return;
        if (!eraIdeaUnlocked(t, gdef)) {
          say('The age has not taught this', gdef.name + ' waits on '
            + techLevelName(ctx.bookmark, gdef.unlock.ladder, gdef.unlock.level)
            + ' (' + (TECH_CATEGORIES[gdef.unlock.ladder] || {}).name + ' ' + gdef.unlock.level + ').', 'bad');
          return;
        }
        const cost = Math.round(eraIdeaCost(owned) * institutionMult(ctx, g.playerTag));
        if (num(t.points[gdef.point]) < cost) {
          say('The realm is not ready', 'This idea needs ' + cost + ' points.', 'bad');
          return;
        }
        t.points[gdef.point] = num(t.points[gdef.point]) - cost;
        t.eraIdeas[groupKey] = owned + 1;
        applyReformsToTag(ctx.DEFINES, t, g.playerTag);
        say('An idea of the age', gdef.tiers[owned].name + ' — ' + gdef.tiers[owned].desc, 'good');
      } catch (e) { warnOnce('buyEraIdea', 'buyEraIdea failed', e); }
    },

    // ---- technology (SPEC §22) ---------------------------------------------------
    getTech() {
      try { return techInfo(); } catch (e) { warnOnce('getTech', 'getTech failed', e); return null; }
    },
    buyTech(catKey) {
      try {
        const t = g.tags[g.playerTag];
        const cat = TECH_CATEGORIES[catKey];
        if (!t || !cat || !t.tech) return;
        const info = techInfo();
        const row = info && info.rows.find((r) => r.key === catKey);
        if (!row || row.level >= Math.min(TECH_MAX, techCeiling(ctx.bookmark))) return;
        if (!row.canBuy) { say('The age is not ready', row.whyNot || 'Not enough points.', 'bad'); return; }
        const before = tagGen(ctx, g.playerTag);
        t.points[cat.point] = num(t.points[cat.point]) - row.cost;
        t.tech[catKey] = row.level + 1;
        applyReformsToTag(ctx.DEFINES, t, g.playerTag);
        say('Advancement', cat.name + ' rises to ' + t.tech[catKey]
          + ' — ' + techLevelName(ctx.bookmark, catKey, t.tech[catKey]) + '.', 'good');
        const after = tagGen(ctx, g.playerTag);
        if (after > before) {
          say('A new pattern of soldier', genName(after, 'inf') + ' and ' + genName(after, 'cav')
            + ' may now be raised — armies at the old pattern can be modernized for gold.', 'good');
        }
        // The rung may open an idea of the age (SPEC §179) — say so, the way
        // EU4 announces an unlocked idea-group slot.
        for (const gdef of eraIdeaGroupsFor(ctx.bookmark, g.playerTag, t)) {
          if (gdef.unlock.ladder === catKey && gdef.unlock.level === t.tech[catKey]) {
            say('An idea of the age unlocks', gdef.name + ' may now be pursued — see Reforms.', 'good');
          }
        }
      } catch (e) { warnOnce('buyTech', 'buyTech failed', e); }
    },
    modernizeArmy(armyId) {
      try {
        const a = g.armies[armyId];
        if (!a || a.tag !== g.playerTag) return;
        const r = modernizeArmyCore(ctx, a);
        if (!r.ok) { say('Cannot modernize', r.why, 'bad'); return; }
        say('Army modernized', a.name + ' re-equips as ' + genName(num(a.gen, 0), 'inf')
          + ' for ' + r.cost + ' talents.', 'good');
      } catch (e) { warnOnce('modernize', 'modernizeArmy failed', e); }
    },

    // ---- development (SPEC §24) --------------------------------------------------
    getDevelopInfo(provId) {
      try {
        const out = {};
        for (const kind of Object.keys(DEV_KINDS)) {
          out[kind] = developInfo(ctx, g.playerTag, provId | 0, kind);
        }
        return out;
      } catch (e) { warnOnce('devInfo', 'getDevelopInfo failed', e); return null; }
    },

    // ---- battle window ---------------------------------------------------------
    getBattleInfo(provId) {
      try { return battleInfo(ctx, provId | 0); } catch (e) { warnOnce('battleInfo', 'getBattleInfo failed', e); return null; }
    },

    // ---- ledger ----------------------------------------------------------------
    getLedger() {
      try {
        const rows = [];
        for (const tag of Object.keys(g.tags)) {
          if (tag === 'REB') continue;
          const t = g.tags[tag];
          if (!t || !t.alive) continue;
          let provs = 0, dev = 0;
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (!p || p.impassable || p.owner !== tag) continue;
            provs++;
            dev += devTotal(p);
          }
          // An off-map seat (SPEC §180) owns no cell; its weight in the world
          // is the def's own number, and the ledger prints it honestly.
          const om = tagDef(ctx, tag).offmap;
          if (om) dev += num(om.dev, 0);
          let troops = 0;
          for (const a of armiesOf(ctx, tag)) troops += num(a.men);
          const bd = incomeBreakdown(ctx, tag);
          rows.push({
            tag,
            name: t.name || tag,
            isPlayer: tag === g.playerTag,
            overlord: t.overlord || null,
            provs, dev,
            income: Math.round(bd.net * 10) / 10,
            treasury: Math.round(num(t.treasury)),
            troops,
            manpower: Math.round(num(t.manpower)),
            warExhaustion: Math.round(num(t.warExhaustion) * 10) / 10,
            tech: t.tech ? (t.tech.gov | 0) + '/' + (t.tech.infl | 0) + '/' + (t.tech.mar | 0) : '-',
          });
        }
        rows.sort((a, b) => b.dev - a.dev);
        return rows;
      } catch (e) { warnOnce('ledger', 'getLedger failed', e); return []; }
    },

    // ---- chronicle -------------------------------------------------------------
    // Quit a losing field (SPEC §33): our whole side leaves through the rout
    // machinery — shattered and marching — and the enemy keeps the ground.
    withdrawBattle(provId) {
      try {
        const res = withdrawFromBattle(ctx, g.playerTag, provId | 0);
        if (!res.ok) { say('No withdrawal', res.why, 'bad'); return; }
        const p = ctx.byId(provId | 0);
        say('Withdrawal sounded', 'Our banners quit the field at ' + ((p && p.name) || 'the battle')
          + ' — shattered, but marching. The enemy keeps the ground.', 'info');
      } catch (e) { warnOnce('withdraw', 'withdrawBattle failed', e); }
    },
    // What the era asks of the player (SPEC §33): the bookmark's win/loss
    // lines for the tag being played, or null when a bookmark predates them.
    // Once the chapter's verdict is in, the goals retire — the panel shows
    // the settled state instead of win/loss lines that can no longer trip.
    getObjectives() {
      try { return liveObjectives(); } catch (e) { warnOnce('objectives', 'getObjectives failed', e); return null; }
    },
    getCampaignGuidance() {
      try {
        const guide = campaignGuidance(g.bookmarkId, g.playerTag, g.date);
        if (!guide) return null;
        // Same verdict-aware list the realm panel shows — the outliner must
        // not keep flying war goals for a war already decided.
        return {
          ...guide,
          objectives: liveObjectives() || [],
          worldNext: nextWorldEvent(ctx),
        };
      } catch (e) { warnOnce('campaignGuide', 'getCampaignGuidance failed', e); return null; }
    },
    getChronicle() {
      try { return Array.isArray(g.chronicle) ? g.chronicle.slice() : []; } catch (e) { warnOnce('chronicle', 'getChronicle failed', e); return []; }
    },

    // ---- merge all -------------------------------------------------------------
    mergeAllInto(armyId) {
      try {
        const a = g.armies[armyId];
        if (!a || a.tag !== g.playerTag) return;
        let merged = 0;
        for (const other of armiesInProv(ctx, a.prov)) {
          if (other.id === a.id || other.tag !== g.playerTag) continue;
          if (mergeInto(ctx, other.id, a.id)) merged++;
        }
        if (!merged) say('Nothing to merge', 'No other army of ours stands in this province (or they are locked in battle).', 'info');
      } catch (e) { warnOnce('mergeAll', 'mergeAllInto failed', e); }
    },

    // ---- declaring war (a casus belli softens the cost) ---------------------
    // no CB: -2 stability, -5 legitimacy · holy war: -1 stability · claim: free
    declareWarOn(tag) {
      try {
        const d = getDip(tag);
        if (!d) return;
        if (!d.canWar) { say('Declare war', d.whyNotWar || 'We cannot declare war on ' + d.name + '.', 'bad'); return; }
        const mine = g.tags[g.playerTag];
        const cb = d.cb;
        if (!cb) {
          mine.stability = clamp(num(mine.stability) - 2, -3, 3);
          mine.legitimacy = clamp(num(mine.legitimacy) - 5, 0, 100);
        } else if (cb.type === 'holy') {
          mine.stability = clamp(num(mine.stability) - 1, -3, 3);
        }
        addOpinion(ctx, tag, g.playerTag, -100);
        // A war without a legal pretext is still a conquest with a declared
        // strategic objective; it simply pays the full stability cost.
        declareWar(ctx, g.playerTag, tag, null, cb || 'conquest');
      } catch (e) { warnOnce('declareWarOn', 'declareWarOn failed', e); }
    },

    // ---- declared rivalries (SPEC §86) --------------------------------------
    // Choosing an enemy is a real move with a real price, and choosing NOT to
    // is what lets an old quarrel die. Both directions are the player's.
    declareRival(tag) {
      try {
        const res = declareRivalCore(ctx, g.playerTag, tag);
        if (!res.ok) { say('Rivalry', res.why, 'bad'); return; }
        say('A rival named', 'The heralds proclaim ' + res.name + ' the enemy of this realm ('
          + res.cost + ' influence). Our captains sharpen against them — and no wound between '
          + 'us will close while it stands.', 'war');
        chronicleCore(ctx, 'diplomacy', 'This realm names ' + res.name + ' its rival.');
      } catch (e) { warnOnce('declareRival', 'declareRival failed', e); }
    },
    renounceRival(tag) {
      try {
        const res = renounceRivalCore(ctx, g.playerTag, tag);
        if (!res.ok) { say('Rivalry', res.why, 'bad'); return; }
        say('A quarrel set aside', 'The heralds unsay it: ' + res.name + ' is no longer named '
          + 'our enemy (' + res.cost + ' influence). Time may now do what envoys could not.', 'good');
        chronicleCore(ctx, 'diplomacy', 'This realm sets aside its quarrel with ' + res.name + '.');
      } catch (e) { warnOnce('renounceRival', 'renounceRival failed', e); }
    },

    // ---- the offered collar (SPEC §92) --------------------------------------
    offerClientship(tag) {
      try {
        const res = offerClientshipCore(ctx, g.playerTag, tag);
        if (!res.ok) { say('Protection', res.why, 'bad'); return; }
        if (!res.accepted) {
          say('The offer is declined', res.name + ' thanks us for our concern and keeps its '
            + 'own crown. They will not hear the question again for years, and they think '
            + 'rather less of us for asking.', 'bad');
          chronicleCore(ctx, 'diplomacy', res.name + ' declines an offer of protection and keeps its own crown.');
          return;
        }
        say('A crown comes under our protection', res.name + ' accepts the collar: their court, '
          + 'their army and their laws stand, and their tribute and their wars are ours. '
          + 'No one was conquered, so no one abroad counts it against us.', 'good');
        chronicleCore(ctx, 'diplomacy', res.name + ' comes under the protection of '
          + ((g.tags[g.playerTag] && g.tags[g.playerTag].name) || g.playerTag)
          + ' as a client kingdom — asked for, not fought for.');
      } catch (e) { warnOnce('offerClientship', 'offerClientship failed', e); }
    },

    // ---- claims --------------------------------------------------------------
    getClaimInfo(provId) {
      try {
        return claimFabricationInfo(ctx, g.playerTag, provId);
      } catch (e) { warnOnce('claimInfo', 'getClaimInfo failed', e); return null; }
    },
    fabricateClaim(provId) {
      try {
        const p = ctx.byId(provId);
        if (!p) return;
        const res = startClaimFabrication(ctx, g.playerTag, provId);
        if (!res.ok) { say('Claim', res.why, 'bad'); return; }
        say('Fabrication begun', res.cost + ' influence points set our agents to work on '
          + res.name + '. The claim will become usable in ' + res.months + ' months.', 'info');
      } catch (e) { warnOnce('fabricateClaim', 'fabricateClaim failed', e); }
    },

    // ---- post-conquest integration ------------------------------------------
    getIntegration(provId) {
      try {
        const p = ctx.byId(provId);
        const t = g.tags[g.playerTag];
        if (!p || p.impassable || !t) return null;
        if (p.owner !== g.playerTag || p.controller !== g.playerTag) return null;
        const autonomy = clamp(num(p.autonomy, 0.25), 0, 0.9);
        let whyNotEstablish = '';
        if (autonomy <= 0.001) whyNotEstablish = 'The province already answers directly to the crown.';
        else if (num(t.points.gov) < 25) whyNotEstablish = 'Not enough governance points (25 required).';
        const foreign = t.religion && p.religion !== t.religion;
        // A bookmark may retire state conversion outright (SPEC §52) — no
        // modern republic sends missionaries to re-faith a district. The
        // control disappears rather than sit disabled.
        const showConvert = mechanicOn(ctx, 'conversion');
        let whyNotConvert = '';
        if (!showConvert) whyNotConvert = 'Not a tool of this age.';
        else if (!foreign) whyNotConvert = 'The province already follows the state faith.';
        else if (p.conversion) whyNotConvert = 'The missionaries are already at work.';
        else if (num(t.points.infl) < 50) whyNotConvert = 'Not enough influence points (50 required).';
        const settle = settlementInfo(ctx, g.playerTag, provId);
        // Hide the settlement control entirely on land that can never take a
        // project (unsettleable), so it only appears where it means something.
        const showSettle = p.settleable !== false;
        // Integration (SPEC §56): the modern answer where conversion is
        // era-gated off, a gentler tool beside it everywhere else.
        const tension = popTotal(p) > 0 ? popTension(ctx, p, t) : null;
        const hasTension = !!tension && (tension.minority + tension.foreignCulture) > 0.001;
        let whyNotIntegrate = '';
        if (!hasTension) whyNotIntegrate = 'Every community here already stands with the state.';
        else if (num(p.integration) >= 1) whyNotIntegrate = 'The province is fully integrated.';
        else if (p.integrating) whyNotIntegrate = 'The program is already under way.';
        else if (num(t.points.gov) < 25) whyNotIntegrate = 'Not enough governance points (25 required).';
        const popRows = (p.pop || []).map((e) => ({
          label: communityLabel(ctx.DEFINES, e.r, e.c), n: e.n, r: e.r, c: e.c,
        }));
        return {
          autonomy,
          pop: popTotal(p) > 0 ? {
            total: popTotal(p), rows: popRows,
            integration: clamp(num(p.integration), 0, 1),
          } : null,
          canIntegrate: !whyNotIntegrate, whyNotIntegrate,
          integrating: p.integrating
            ? { monthsLeft: Math.max(0, num(p.integrating.monthsLeft) | 0) } : null,
          canEstablish: !whyNotEstablish, whyNotEstablish,
          showConvert,
          canConvert: !whyNotConvert, whyNotConvert,
          converting: p.conversion ? { monthsLeft: Math.max(0, num(p.conversion.monthsLeft) | 0) } : null,
          showSettle,
          canSettle: settle.can, whyNotSettle: settle.why,
          settleCost: settle.cost, settleToName: settle.toName,
          settling: p.settlement
            ? { monthsLeft: Math.max(0, num(p.settlement.monthsLeft) | 0) } : null,
        };
      } catch (e) { warnOnce('integration', 'getIntegration failed', e); return null; }
    },
    establishRule(provId) {
      try {
        const p = ctx.byId(provId);
        const t = g.tags[g.playerTag];
        if (!p || !t || p.owner !== g.playerTag || p.controller !== g.playerTag) return;
        if (clamp(num(p.autonomy, 0.25), 0, 0.9) <= 0.001) { say('Establish rule', p.name + ' already answers directly to the crown.', 'info'); return; }
        if (num(t.points.gov) < 25) { say('Establish rule', 'Not enough governance points (25 required).', 'bad'); return; }
        t.points.gov = num(t.points.gov) - 25;
        p.autonomy = Math.max(0, clamp(num(p.autonomy, 0.25), 0, 0.9) - 0.15);
        p.modifiers = (p.modifiers || []).filter((m) => m && m.id !== 'tightened_grip');
        p.modifiers.push({ id: 'tightened_grip', name: 'Tightened Grip', months: 6, effects: { unrest: 2 } });
        say('Rule established', 'Our magistrates take ' + p.name + ' in hand: autonomy falls to '
          + Math.round(p.autonomy * 100) + '%. The locals grumble for a season.', 'good');
      } catch (e) { warnOnce('establishRule', 'establishRule failed', e); }
    },
    convertProvince(provId) {
      try {
        const p = ctx.byId(provId);
        const t = g.tags[g.playerTag];
        if (!p || !t || p.owner !== g.playerTag || p.controller !== g.playerTag) return;
        if (!mechanicOn(ctx, 'conversion')) { say('Conversion', 'State conversion is not a tool of this age.', 'info'); return; }
        if (!t.religion || p.religion === t.religion) { say('Conversion', p.name + ' already follows the state faith.', 'info'); return; }
        if (p.conversion) { say('Conversion', 'The missionaries are already at work in ' + p.name + '.', 'info'); return; }
        if (num(t.points.infl) < 50) { say('Conversion', 'Not enough influence points (50 required).', 'bad'); return; }
        t.points.infl = num(t.points.infl) - 50;
        p.conversion = { by: g.playerTag, monthsLeft: 12 };
        p.modifiers = (p.modifiers || []).filter((m) => m && m.id !== 'religious_tension');
        p.modifiers.push({ id: 'religious_tension', name: 'Religious Tension', months: 12, effects: { unrest: 3 } });
        say('Conversion begun', 'Priests and teachers go out to ' + p.name + '; in a year it will follow the state faith. Expect unrest while the old gods are put away.', 'good');
      } catch (e) { warnOnce('convertProvince', 'convertProvince failed', e); }
    },
    integrateProvince(provId) {
      try {
        const p = ctx.byId(provId);
        const t = g.tags[g.playerTag];
        if (!p || !t || p.owner !== g.playerTag || p.controller !== g.playerTag) return;
        const tension = popTotal(p) > 0 ? popTension(ctx, p, t) : null;
        if (!tension || (tension.minority + tension.foreignCulture) <= 0.001) {
          say('Integration', 'Every community of ' + p.name + ' already stands with the state.', 'info'); return;
        }
        if (num(p.integration) >= 1) { say('Integration', p.name + ' is fully integrated.', 'info'); return; }
        if (p.integrating) { say('Integration', 'The program in ' + p.name + ' is already under way.', 'info'); return; }
        if (num(t.points.gov) < 25) { say('Integration', 'Not enough governance points (25 required).', 'bad'); return; }
        t.points.gov = num(t.points.gov) - 25;
        p.integrating = { by: g.playerTag, monthsLeft: 12 };
        p.modifiers = (p.modifiers || []).filter((m) => m && m.id !== 'reforms_resented');
        p.modifiers.push({ id: 'reforms_resented', name: 'Reforms Resented', months: 12, effects: { unrest: 1 } });
        say('Integration begun', 'Schools, land titles and the civil service go to work in ' + p.name
          + '; in a year its communities will stand closer to the state. Old hands grumble meanwhile.', 'good');
      } catch (e) { warnOnce('integrateProvince', 'integrateProvince failed', e); }
    },
    settleProvince(provId) {
      try {
        const p = ctx.byId(provId);
        const res = settlementStart(ctx, g.playerTag, provId | 0);
        if (!res.ok) { say('Settlement', res.why || 'The land will not take it.', 'bad'); return; }
        say('Settlers set out', 'Surveyors and settlers make for ' + (p ? p.name : 'the frontier')
          + '; in a few months it will grow into a ' + String(res.toName || 'settlement').toLowerCase()
          + ' (' + res.cost + ' influence points).', 'good');
      } catch (e) { warnOnce('settleProvince', 'settleProvince failed', e); }
    },

    // ---- the unclaimed waste (SPEC §64) --------------------------------------
    getWasteland(provId) {
      try {
        const p = ctx.byId(provId);
        if (!p || p.owner !== 'WASTE' || !p.impassable || p.settleable === false) return null;
        const exp = expeditionInfo(ctx, g.playerTag, provId | 0);
        const annex = annexInfo(ctx, g.playerTag, provId | 0);
        if (!exp.show && !annex.show) return null;
        const ours = !!(p.expedition && p.expedition.by === g.playerTag);
        const settle = ours ? settlementInfo(ctx, g.playerTag, provId | 0) : null;
        return {
          ours,
          campBy: p.expedition ? p.expedition.by : null,
          expedition: {
            show: exp.show && !p.expedition,
            can: exp.can, why: exp.why, men: exp.men, cost: exp.cost, fromName: exp.fromName,
          },
          settle: settle ? {
            show: !p.settlement, can: settle.can, why: settle.why,
            cost: settle.cost, toName: settle.toName,
          } : null,
          settling: p.settlement
            ? { monthsLeft: Math.max(0, num(p.settlement.monthsLeft) | 0) } : null,
          annex: { show: annex.show, can: annex.can, why: annex.why, cost: annex.cost },
        };
      } catch (e) { warnOnce('getWasteland', 'getWasteland failed', e); return null; }
    },
    sendExpedition(provId) {
      try {
        const p = ctx.byId(provId);
        const res = expeditionStart(ctx, g.playerTag, provId | 0);
        if (!res.ok) { say('Expedition', res.why || 'The columns cannot march.', 'bad'); return; }
        say('The columns march', res.men.toLocaleString() + ' men leave '
          + (res.fromName || 'the border') + ' and pitch camp in ' + (p ? p.name : 'the waste')
          + ' (' + res.cost + ' talents). Plant a settlement there and the land can be annexed.', 'good');
      } catch (e) { warnOnce('sendExpedition', 'sendExpedition failed', e); }
    },
    annexWasteland(provId) {
      try {
        const p = ctx.byId(provId);
        const res = annexCore(ctx, g.playerTag, provId | 0);
        if (!res.ok) { say('Annexation', res.why || 'The land is not ours to take.', 'bad'); return; }
        say('The waste is annexed', (p ? p.name : 'The frontier') + ' enters the realm ('
          + res.cost + ' governance points): its routes open, its settlers count, its flag is ours.', 'good');
      } catch (e) { warnOnce('annexWasteland', 'annexWasteland failed', e); }
    },

    // ---- factions (nation panel, SPEC §34) -----------------------------------
    getFactions() {
      try { return getFactionsInfo(ctx); } catch (e) { warnOnce('factions', 'getFactions failed', e); return null; }
    },
    appeaseFaction(factionId) {
      try {
        const res = appeaseFactionCore(ctx, g.playerTag, String(factionId));
        if (!res.ok) { say('The court is cold', res.why || 'They will not hear us.', 'bad'); return; }
        say('An estate courted', res.name + ' warms to the crown (approval ' + res.approval + ').', 'good');
      } catch (e) { warnOnce('appease', 'appeaseFaction failed', e); }
    },

    // ---- the world's way of doing things (nation panel, SPEC §166) -----------
    getInstitutions() {
      try { ensureInstitutions(ctx); return institutionsReport(ctx, g.playerTag); }
      catch (e) { warnOnce('institutions', 'getInstitutions failed', e); return { rows: [], mult: 1, penaltyPct: 0, behind: 0 }; }
    },
    embraceInstitution(id) {
      try {
        const probe = embraceInfo(ctx, g.playerTag, String(id));
        const res = embraceCore(ctx, g.playerTag, String(id));
        if (!res.ok) { say('Not yet', res.why || 'The realm is not ready for it.', 'bad'); return; }
        say('A new way of doing things',
          res.name + ' becomes the way this realm is governed. '
          + (probe && probe.desc ? '' : '') + 'The estates have noticed.', 'good');
      } catch (e) { warnOnce('embrace', 'embraceInstitution failed', e); }
    },

    // ---- the standing of the powers (ledger + nation panel, SPEC §165) -------
    getStanding(tag) {
      try { return standingOf(ctx, tag || g.playerTag); }
      catch (e) { warnOnce('standing', 'getStanding failed', e); return null; }
    },
    getStandingTable() {
      try { return standingTable(ctx); }
      catch (e) { warnOnce('standingTable', 'getStandingTable failed', e); return []; }
    },

    // ---- somebody else's politics (foreign nation panel, SPEC §163/§164) ----
    // NOT `getCourt` — that name has meant the player's hired advisers since
    // §44, and taking it here silently shadowed them (smoke23 caught it).
    getForeignCourt(tag) {
      try { return getCourtInfo(ctx, String(tag)); }
      catch (e) { warnOnce('court', 'getForeignCourt failed', e); return null; }
    },
    getIntrigue(tag) {
      try { return intrigueMenu(ctx, g.playerTag, String(tag)); }
      catch (e) { warnOnce('intrigue', 'getIntrigue failed', e); return null; }
    },
    runIntrigue(tag, kind, factionId) {
      try {
        const res = runIntrigueCore(ctx, g.playerTag, String(tag), String(kind), factionId ? String(factionId) : null);
        if (!res.ok) { say('No channel', res.why || 'Our agents cannot reach them.', 'bad'); return res; }
        const who = (g.tags[res.target] && g.tags[res.target].name) || res.target;
        if (kind === 'patronize') say('Silver sent', 'Our money is with ' + res.party + ' at ' + who + '.', 'good');
        else if (kind === 'subvert') {
          say(res.caught ? 'Our hand is seen' : 'Money at work',
            res.caught ? who + ' has the correspondence.' : 'The ground shifts under ' + res.party + ' at ' + who + '.',
            res.caught ? 'bad' : 'good');
        } else {
          say(res.caught ? 'Our hand is seen' : 'A claimant finds a purse',
            res.caught ? who + ' knows whose claimant it was.'
              : 'The succession at ' + who + ' is open' + (res.raised ? ', and there is a banner in the field.' : '.'),
            res.caught ? 'bad' : 'good');
        }
        return res;
      } catch (e) { warnOnce('runIntrigue', 'runIntrigue failed', e); return { ok: false, why: 'The channel is confused.' }; }
    },

    // ---- writing to the dispersion (province panel, SPEC §172) --------------
    getCommunity(provId) {
      try { return communityInfo(ctx, provId | 0); }
      catch (e) { warnOnce('getCommunity', 'getCommunity failed', e); return null; }
    },
    getDiaspora() {
      try { return diasporaReport(ctx); }
      catch (e) { warnOnce('getDiaspora', 'getDiaspora failed', e); return null; }
    },
    askCommunity(provId, askId) {
      try {
        const res = askCommunityCore(ctx, provId | 0, String(askId));
        if (!res.ok) { say('No answer', res.why || 'The letter did not go.', 'bad'); return res; }
        const bits = [];
        if (res.gain.treasury) bits.push(res.gain.treasury + ' talents');
        if (res.gain.manpower) bits.push(res.gain.manpower + ' men');
        if (res.gain.infl) bits.push(res.gain.infl + ' influence');
        if (res.gain.opinion) bits.push('a word in the right ear');
        say(res.caught ? 'The letter was read' : res.name,
          res.caught
            ? res.name + ' are answering to their own rulers for our request.'
            : res.verb + (bits.length ? ' — ' + bits.join(', ') + '.' : '.'),
          res.caught ? 'bad' : 'good');
        return res;
      } catch (e) { warnOnce('askCommunity', 'askCommunity failed', e); return { ok: false }; }
    },

    // ---- the years, and the eye (nation panel, SPEC §170) -------------------
    getClimate() {
      try { return climateReport(ctx); } catch (e) { warnOnce('getClimate', 'getClimate failed', e); return null; }
    },
    getAttention() {
      try { return attentionReport(ctx); } catch (e) { warnOnce('getAttention', 'getAttention failed', e); return null; }
    },

    // ---- the hope, the office and the ascents (nation panel, SPEC §169) -----
    getSacred() {
      try { return sacredReport(ctx); } catch (e) { warnOnce('getSacred', 'getSacred failed', e); return null; }
    },
    seatHighPriest(factionId) {
      try {
        const res = seatHighPriestCore(ctx, String(factionId));
        if (!res.ok) { say('The chamber refuses', res.why || 'It cannot be done.', 'bad'); return; }
        say('A High Priest is anointed', res.name + ' takes the office, from ' + res.factionName
          + '. The parties who did not get it have noticed.', 'good');
      } catch (e) { warnOnce('seatHighPriest', 'seatHighPriest failed', e); }
    },

    // ---- whose ground a province is (province panel, SPEC §167) -------------
    getProvinceEstates(provId) {
      try { return estateReport(ctx, ctx.byId(provId)); }
      catch (e) { warnOnce('getProvinceEstates', 'getProvinceEstates failed', e); return null; }
    },

    // ---- what kind of world it is (nation panel, SPEC §168) -----------------
    getAge() {
      try { return ageReport(ctx); } catch (e) { warnOnce('getAge', 'getAge failed', e); return null; }
    },
    getAbsorption(tag) {
      try { return absorbReport(ctx, tag || g.playerTag); }
      catch (e) { warnOnce('getAbsorption', 'getAbsorption failed', e); return null; }
    },

    // ---- what is brewing (nation panel, SPEC §98) ----------------------------
    getCrises() {
      try { return crisisReport(ctx, g.playerTag); } catch (e) { warnOnce('getCrises', 'getCrises failed', e); return []; }
    },

    // ---- missions (nation panel, SPEC §177) ----------------------------------
    // The tree the panel draws: every mission with its id, grid seat and
    // prerequisites resolved to names. A ladder comes back as one column of
    // rows with implicit parent links, so the same renderer draws both.
    getMissions() {
      try {
        if (g.result) return [];
        const list = missionsFor(ctx, g.playerTag);
        const t = g.tags[g.playerTag];
        if (!Array.isArray(list) || !t) return [];
        const tree = isMissionTree(list);
        const done = missionDoneSet(t, list);
        const ids = list.map((m, i) => missionId(m, i));
        const nameOf = {};
        list.forEach((m, i) => { nameOf[ids[i]] = m.name || ids[i]; });
        // Grid seats: a declared col sticks (clamped to five, EU4's width); a
        // declared row sticks; an undeclared row lands one below the deepest
        // parent. A ladder is column zero, one row per mission.
        const col = [];
        const row = [];
        list.forEach((m, i) => {
          col[i] = tree ? Math.max(0, Math.min(4, num(m.col, 0) | 0)) : 0;
          let r = Number.isFinite(m.row) ? Math.max(0, m.row | 0) : null;
          if (r === null) {
            if (tree && Array.isArray(m.requires) && m.requires.length) {
              r = 0;
              for (const rid of m.requires) {
                const pi = ids.indexOf(String(rid));
                if (pi >= 0 && pi < i && Number.isFinite(row[pi])) r = Math.max(r, row[pi] + 1);
              }
            } else r = tree ? 0 : i;
          }
          row[i] = r;
        });
        return list.map((m, i) => {
          const id = ids[i];
          const requires = tree
            ? (Array.isArray(m.requires) ? m.requires.map(String).filter((rid) => rid !== id && ids.indexOf(rid) >= 0) : [])
            : (i > 0 ? [ids[i - 1]] : []);
          return {
            id,
            name: m.name || id,
            desc: m.desc || '',
            rewardText: m.rewardText || '',
            icon: m.icon || '',
            col: col[i], row: row[i],
            requires,
            requiresNames: requires.map((rid) => nameOf[rid]).filter(Boolean),
            status: done.has(id) ? 'done'
              : missionUnlocked(list, i, done, tree) ? 'current' : 'locked',
          };
        });
      } catch (e) { warnOnce('getMissions', 'getMissions failed', e); return []; }
    },

    // ---- sandbox chapters (SPEC §83): the second act after the verdict ------
    getChapter() {
      try { return chapterView(ctx); } catch (e) { warnOnce('getChapter', 'getChapter failed', e); return null; }
    },
    // ---- the doctrine axes (realm panel, SPEC §85) --------------------------
    getDoctrine() {
      try { return doctrineView(ctx); } catch (e) { warnOnce('getDoctrine', 'getDoctrine failed', e); return null; }
    },
    // ---- the road not taken (chronicle, SPEC §89) ---------------------------
    getDivergence() {
      try { return divergenceView(ctx); } catch (e) { warnOnce('getDivergence', 'getDivergence failed', e); return null; }
    },

    // ---- national decisions (nation panel) ----------------------------------
    getDecisions() {
      try {
        const t = g.tags[g.playerTag];
        if (!t) return [];
        const list = Object.keys(DECISIONS).map((key) => {
          const d = DECISIONS[key];
          const authored = ctx.bookmark && ctx.bookmark.decisionText
            && ctx.bookmark.decisionText[key];
          const copy = authored || {};
          const cdKey = 'decision:' + key;
          let whyNot = '';
          if (diploCdActive(ctx, cdKey)) {
            whyNot = 'Recently enacted — ' + diploCdMonthsLeft(ctx, cdKey) + ' months before it can be repeated.';
          } else {
            whyNot = d.can(g, t) || '';
          }
          return {
            key, name: copy.name || d.name, icon: d.icon,
            desc: copy.desc || d.desc, costText: copy.costText || d.costText,
            cooldownMonths: d.cdMonths, canEnact: !whyNot, whyNot,
          };
        });
        // Formable crowns lead the list — the requirement checklist rides the tooltip.
        for (const { f, rows, met } of formableList().reverse()) {
          const checklist = rows.map((r) => (r.ok ? '✓ ' : '✗ ') + r.label).join('\n');
          list.unshift({
            key: f.id, name: f.name, icon: 'laurel',
            desc: f.desc + '\n――――――\n' + checklist,
            costText: 'a new banner', cooldownMonths: 0,
            canEnact: met,
            whyNot: met ? '' : 'Not yet — the unmet requirements are marked ✗.',
          });
        }
        return list;
      } catch (e) { warnOnce('getDecisions', 'getDecisions failed', e); return []; }
    },
    enactDecision(key) {
      try {
        // Forming a nation routes through the decisions surface (SPEC §22).
        if (String(key).indexOf('form_') === 0) {
          const entry = formableList().find((x) => x.f.id === key);
          if (!entry) return;
          if (!entry.met) {
            say(entry.f.name, 'Not yet — the unmet requirements are marked in the decision\'s scroll.', 'bad');
            return;
          }
          const f = entry.f;
          const oldName = (g.tags[f.from] && g.tags[f.from].name) || f.from;
          if (!switchTagCore(ctx, f.from, f.to)) return;
          const nt = g.tags[f.to];
          applyReformsToTag(ctx.DEFINES, nt, f.to);
          const b = f.bonus || {};
          if (Number.isFinite(b.legitimacy)) nt.legitimacy = clamp(num(nt.legitimacy) + b.legitimacy, 0, 100);
          if (Number.isFinite(b.stability)) nt.stability = clamp(num(nt.stability) + b.stability, -3, 3);
          if (b.modifier) simHelpers.addTagModifier(ctx, f.to, b.modifier);
          // What the crown is actually worth (SPEC §102): coin in the treasury,
          // men on the rolls, points in the ministries, a second permanent
          // modifier where the crown carries one — and, where the new identity
          // has a chain of its own, a fresh set of missions to work through.
          if (b.grant) simHelpers.adjust(ctx, f.to, b.grant);
          if (b.modifier2) simHelpers.addTagModifier(ctx, f.to, b.modifier2);
          // A crown may restyle the ruler who proclaims it (SPEC §178) — the
          // Kingdom of Israel makes its proclaimer King of Israel. A title
          // that already names the crown outranks the formable's: the 614
          // coronation styles its man "King of Israel, of the House of
          // David", and proclaiming the kingdom must not shorten him.
          if (b.rulerTitle && nt.ruler
              && String(nt.ruler.title || '').indexOf(b.rulerTitle) < 0) {
            nt.ruler.title = String(b.rulerTitle);
          }
          if (Array.isArray(f.missions) && f.missions.length) { nt.missionIdx = 0; nt.missionsDone = []; }
          ctx.bus.emit('tagSwitched', { from: f.from, to: f.to });
          ctx.bus.emit('provinceOwner', {}); // the map wears the new color
          say('A new banner', oldName + ' is no more: ' + (nt.name || f.to) + ' rises. The chronicle will remember this day.', 'good');
          return;
        }
        const t = g.tags[g.playerTag];
        const d = DECISIONS[key];
        if (!t || !d) return;
        const copy = (ctx.bookmark && ctx.bookmark.decisionText
          && ctx.bookmark.decisionText[key]) || {};
        const displayName = copy.name || d.name;
        const cdKey = 'decision:' + key;
        if (diploCdActive(ctx, cdKey)) {
          say(displayName, 'Recently enacted — ' + diploCdMonthsLeft(ctx, cdKey) + ' months before it can be repeated.', 'bad');
          return;
        }
        const why = d.can(g, t);
        if (why) { say(displayName, why, 'bad'); return; }
        const result = d.run(ctx, t);
        setDiploCd(ctx, cdKey, d.cdMonths);
        say(displayName, copy.result || result || 'It is done.', 'good');
      } catch (e) { warnOnce('enactDecision', 'enactDecision failed', e); }
    },
  };

  const rawActions = { ...actions };
  const controls = new Set(['setSpeed', 'togglePause']);
  const isQuery = (name) => /^(get|explain|can|evaluate)/.test(name);

  // Saves written by v3.9 may contain clicks that were held by the old blanket
  // pause queue. Apply those once, immediately and in order, so loading the
  // save adopts the new contract without silently losing the player's work.
  const legacyCommands = Array.isArray(g.pendingCommands) ? g.pendingCommands.slice() : [];
  if (legacyCommands.length && !g.over) {
    const startingTag = g.playerTag;
    try {
      for (const cmd of legacyCommands) {
        if (!cmd || typeof rawActions[cmd.name] !== 'function') continue;
        if (cmd.tag && !g.tags[cmd.tag]) continue;
        if (cmd.tag) g.playerTag = cmd.tag;
        rawActions[cmd.name](...(Array.isArray(cmd.args) ? cmd.args : []));
      }
    } finally {
      if (g.tags[startingTag]) g.playerTag = startingTag;
    }
  }
  delete g.pendingCommands;
  delete g.nextCommandId;

  // Pausing stops the simulation clock, not the player's hands. Every command
  // takes effect immediately; actions that represent work merely create a
  // path, construction site, or recruitment order whose clock advances from
  // tickDay/monthly systems after play resumes. The generic event keeps the
  // paused UI honest about resources, queues, splits, merges, and other edits.
  for (const name of Object.keys(rawActions)) {
    if (controls.has(name) || isQuery(name) || typeof rawActions[name] !== 'function') continue;
    actions[name] = (...args) => {
      const result = rawActions[name](...args);
      if (ctx.bus) ctx.bus.emit('actionTaken', { name });
      return result;
    };
  }
  return actions;
}

// ------------------------------------------------------------------ save/load
// The game object is plain data by construction (SPEC §6.2); reviveGame merges
// schema defaults so saves from older versions load after fields are added.
export function reconcileGameProvinces({ game, DEFINES, MAP_DATA, geom, bookmark, provinceMap }) {
  if (!game || !Array.isArray(game.provinces)) return provinceMap || null;
  const srcProvs = (MAP_DATA && MAP_DATA.provinces) || [];
  const activeMap = provinceMap || buildProvinceMapping(MAP_DATA, bookmark);
  const migration = bookmark && bookmark.mapProfileMigration;
  const migrationVersion = Math.max(0, num(migration && migration.version, 0) | 0);
  const upgrading = Math.max(0, num(game.mapProfileVersion, 0) | 0) < migrationVersion;
  const wantedLength = srcProvs.length + 1;
  if (game.provinces.length < wantedLength) game.provinces.length = wantedLength;

  for (let id = 1; id < wantedLength; id++) {
    const source = srcProvs[id - 1] || {};
    if (activeMap[id] !== id) {
      // Latent cells are part of their historical parent in this bookmark and
      // must not quietly add income, armies, borders, or victory-count land.
      game.provinces[id] = null;
      continue;
    }

    let p = game.provinces[id];
    if (!p) {
      p = makeProvinceState({ DEFINES, MAP_DATA, geom, bookmark, source, id });
      game.provinces[id] = p;
    } else {
      // Geometry and display names are map-profile data, not campaign state.
      // Refreshing them also prevents an old 1948 save from retaining the old
      // Gischala-as-Safed alias after Safed becomes its own province.
      const c = geom && geom.centroids && geom.centroids[id];
      if (c && Number.isFinite(c.x) && Number.isFinite(c.y)) { p.x = c.x; p.y = c.y; }
      p.canon = source.name || p.canon || p.name;
      p.name = bookmarkField(bookmark, 'provinceNames', source, false) || source.name || p.name;
      // ...then re-earn any owner rename the campaign had achieved (SPEC §66):
      // integration and culture are campaign state and survive the save.
      resolveDisplayName({ game, bookmark, bus: null }, p);
      // Passability is era data, not campaign state — v4.3 opens the 1948
      // desert interiors (SPEC §44), and an old save must not keep the wall.
      // One campaign fact does move it: an annexed waste (SPEC §64) stays
      // open — the routes the expedition cut are not un-cut by loading.
      // Untouched empty land likewise adopts the era's tier; a tier the
      // player earned (settlement, growth) is never clobbered.
      const impassableOverride = bookmarkField(bookmark, 'impassable', source);
      const annexedWaste = p.owner && p.owner !== 'WASTE' && (source.owner || 'WASTE') === 'WASTE';
      p.impassable = annexedWaste ? false
        : (typeof impassableOverride === 'boolean' ? impassableOverride : !!source.impassable);
      const habOverride = bookmarkField(bookmark, 'habitation', source);
      if (habOverride && p.habitation === 'uninhabited') p.habitation = habOverride;
      // Terrain is era geography, not campaign state. A 1948 save made before
      // the modern overlay must shed the ancient "Wasteland" classification.
      p.terrain = bookmarkField(bookmark, 'terrains', source) || source.terrain || p.terrain;
      // Goods are era data too (SPEC §52) — nothing mutates them in play. The
      // 1948 overlay pumps oil where the base map ran caravans, and a save
      // from before the overlay must not spend the whole campaign without a
      // well anywhere (every mechanized realm would import at double forever).
      p.good = bookmarkField(bookmark, 'goods', source) || source.good || p.good;
      const previousDev = upgrading && migration && migration.previousDev
        && migration.previousDev[source.name];
      if (previousDev) {
        const baseline = bookmarkField(bookmark, 'devTweaks', source) || source.dev || {};
        const current = p.dev || {};
        p.dev = {
          tax: num(baseline.tax) + Math.max(0, num(current.tax) - num(previousDev.tax)),
          prod: num(baseline.prod) + Math.max(0, num(current.prod) - num(previousDev.prod)),
          mp: num(baseline.mp) + Math.max(0, num(current.mp) - num(previousDev.mp)),
        };
      }
    }
  }

  // A widened map can hand reconciled provinces to courts the old save never
  // seated (Rome in a pre-v5.4 167 BCE save; Pontus; Italy). Backfill each
  // missing tag exactly as initGame would have — otherwise the new land is
  // painted scenery: no AI, no economy, no diplomacy, and armies can never
  // enter it. makeCtx then crowns the new court like any ruler-less tag.
  const tagDefs = DEFINES.TAGS || {};
  const techBase = Math.max(0, num(bookmark && bookmark.techBase, 3) | 0);
  const techTweaks = (bookmark && bookmark.techTweaks) || {};
  const wantedTags = new Set();
  for (const p of game.provinces) {
    if (!p) continue;
    if (p.owner && p.owner !== 'WASTE') wantedTags.add(p.owner);
    if (p.controller && p.controller !== 'WASTE') wantedTags.add(p.controller);
  }
  if (!game.tags || typeof game.tags !== 'object') game.tags = {};
  for (const key of wantedTags) {
    if (game.tags[key] || !tagDefs[key]) continue;
    // Backfilled exactly as initGame would have, era lens included (SPEC §139).
    const d = tagDef({ DEFINES, bookmark }, key);
    const t = {
      tag: key,
      name: d.name || key,
      color: Array.isArray(d.color) ? d.color.slice() : [128, 128, 128],
      religion: d.religion, culture: d.culture,
      alive: true,
      ai: true,
      treasury: 0, income: 0, expenses: 0, loans: 0,
      manpower: 0, maxManpower: 0,
      stability: 0, legitimacy: 50, warExhaustion: 0,
      points: { gov: 0, infl: 0, mar: 0 },
      ideas: { ...(d.ideas || {}) },
      reforms: { mil: 0, civ: 0, rel: 0 },
      eraIdeas: {},
      advisors: { gov: null, infl: null, mar: null },
      aggression: 0,
      courtCand: {},
      modifiers: [],
      atWarWith: [], allies: [], guarantees: [], opinion: {},
      govType: (bookmark && bookmark.govTypes && bookmark.govTypes[key])
        || (DEFINES.GOV_OF || {})[key] || 'monarchy',
      electionIn: 48,
      claims: [], claimFabrications: [], overlord: null,
      heir: null, regency: false, missionIdx: 0,
      aiState: {},
    };
    const tw = techTweaks[key] || {};
    t.tech = {
      gov: Math.max(0, Math.min(TECH_MAX, techBase + (tw.gov | 0))),
      infl: Math.max(0, Math.min(TECH_MAX, techBase + (tw.infl | 0))),
      mar: Math.max(0, Math.min(TECH_MAX, techBase + (tw.mar | 0))),
    };
    applyReformsToTag(DEFINES, t, key);
    game.tags[key] = t;
    const tmpCtx = { game, DEFINES, byId: (pid) => game.provinces[pid] || null };
    t.maxManpower = maxManpowerOf(tmpCtx, key);
    t.manpower = t.maxManpower;
  }

  if (!game.ui) game.ui = {};
  if (!game.provinces[game.ui.selectedProv]) game.ui.selectedProv = 0;
  game.mapProfileVersion = Math.max(1, migrationVersion);
  return activeMap;
}

export const SAVE_VERSION = 1;
export function reviveGame(saved) {
  if (!saved || typeof saved !== 'object' || !saved.tags || !saved.provinces) return null;
  if (!Number.isFinite(saved.rngSeed)) saved.rngSeed = 1;
  if (!Number.isFinite(saved.rngState)) saved.rngState = saved.rngSeed;
  if (!saved.truces) saved.truces = {};
  if (saved.difficulty !== 'hard') saved.difficulty = 'normal'; // pre-difficulty saves
  if (!saved.diploCooldowns) saved.diploCooldowns = {}; // pre-diplomacy saves
  if (!saved.armsDeals || typeof saved.armsDeals !== 'object') saved.armsDeals = {}; // pre-§181 saves
  // The powers beyond the map are retired (SPEC §180): drop the standings
  // book, and strip the pact/ask modifiers whose removal path went with the
  // system — a permanent incomeMult nobody can ever unsign is not a save
  // feature, it is a leak.
  if (saved.powers !== undefined) delete saved.powers;
  for (const k of Object.keys(saved.tags)) {
    const t = saved.tags[k];
    if (!t || !Array.isArray(t.modifiers)) continue;
    t.modifiers = t.modifiers.filter((m) => !(m && typeof m.id === 'string' && m.id.startsWith('power_')));
  }
  if (!saved.rivals) saved.rivals = {}; // pre-rivalry saves (SPEC §86): nobody named yet
  if (!Array.isArray(saved.divergences)) saved.divergences = []; // pre-ledger saves (SPEC §89)
  if (!Array.isArray(saved.retiredChapters)) saved.retiredChapters = [];
  if (!saved.doctrine) saved.doctrine = {}; // pre-doctrine saves (SPEC §85): flags carry the rest
  // Pre-§135 saves carry no forwarding table — but every formed tag already
  // records its `lineage`, so the table can be rebuilt from it exactly. A
  // campaign that proclaimed a greater crown before this existed therefore
  // gets the rest of its chapter back on load rather than on a new game.
  if (!saved.tagAliases || typeof saved.tagAliases !== 'object') {
    saved.tagAliases = {};
    for (const k of Object.keys(saved.tags)) {
      const t = saved.tags[k];
      const line = t && Array.isArray(t.lineage) ? t.lineage : [];
      for (const old of line) {
        if (!saved.tags[old]) saved.tagAliases[old] = k;
      }
    }
  }
  if (!saved.flags) saved.flags = {};
  if (!saved.pendingEvents) saved.pendingEvents = [];
  // Runtime-synthesized events don't survive a reload — drop stale pendings.
  saved.pendingEvents = saved.pendingEvents.filter((pe) => !(pe && String(pe.eventId).startsWith('dyn_')));
  if (!saved.firedEvents) saved.firedEvents = {};
  if (!saved.battles) saved.battles = [];
  if (!saved.fleets) saved.fleets = {};
  if (!Number.isFinite(saved.nextFleetId)) saved.nextFleetId = 1;
  if (!saved.airwings) saved.airwings = {}; // pre-air-power saves
  if (!Number.isFinite(saved.nextWingId)) saved.nextWingId = 1;
  if (!Array.isArray(saved.merchantVoyages)) saved.merchantVoyages = []; // pre-§58 saves
  if (!Number.isFinite(saved.nextRecruitId)) saved.nextRecruitId = 1;
  if (!Array.isArray(saved.pendingCommands)) saved.pendingCommands = [];
  if (!Number.isFinite(saved.nextCommandId)) saved.nextCommandId = 1;
  for (const f of Object.values(saved.fleets)) { // pre-naval-era saves (SPEC §31)
    if (!f) continue;
    if (!Number.isFinite(f.gen)) f.gen = 0;
    if (f.admiral === undefined) f.admiral = null;
  }
  if (!saved.wars) saved.wars = [];
  if (!saved.rivals || typeof saved.rivals !== 'object') saved.rivals = {};
  if (!saved.retiredRivalries || typeof saved.retiredRivalries !== 'object') saved.retiredRivalries = {};
  if (!saved.recognitions || typeof saved.recognitions !== 'object') saved.recognitions = {}; // pre-§96 saves
  if (!saved.embargoes || typeof saved.embargoes !== 'object') saved.embargoes = {}; // pre-§100 saves
  if (!Array.isArray(saved.chronicle)) saved.chronicle = []; // pre-chronicle saves
  if (!Array.isArray(saved.subsidies)) saved.subsidies = []; // pre-diplomacy-depth saves
  if (!saved.ui) saved.ui = { selectedProv: 0, selectedArmy: null, selectedArmies: [], selectedFleet: null, selectedWing: null };
  if (!Array.isArray(saved.ui.selectedArmies)) saved.ui.selectedArmies = [];
  if (saved.ui.selectedFleet === undefined) saved.ui.selectedFleet = null;
  if (saved.ui.selectedWing === undefined) saved.ui.selectedWing = null;
  // pre-buildings/loans saves: default the new economy & military fields
  for (let i = 1; i < saved.provinces.length; i++) {
    const p = saved.provinces[i];
    if (!p) continue;
    if (!Array.isArray(p.buildings)) p.buildings = [];
    if (p.construction === undefined) p.construction = null;
    if (!Array.isArray(p.unitQueue)) p.unitQueue = [];
    if (!p.habitation) p.habitation = inferredHabitation(p.owner, p.dev);
    if (p.settleable === undefined) p.settleable = true;
    if (p.settlement === undefined) p.settlement = null; // pre-settlement saves (SPEC §43)
  }
  for (const k of Object.keys(saved.tags)) {
    const t = saved.tags[k];
    if (!t) continue;
    if (!Number.isFinite(t.loans)) t.loans = 0;
    // v1.5 realm fields (rulers themselves are re-crowned in makeCtx)
    if (!Array.isArray(t.claims)) t.claims = [];
    if (!Array.isArray(t.claimFabrications)) t.claimFabrications = [];
    if (t.overlord === undefined) t.overlord = null;
    if (t.heir === undefined) t.heir = null;
    if (t.regency === undefined) t.regency = false;
    if (!Number.isFinite(t.missionIdx)) t.missionIdx = 0;
    // Ladder-era saves carry no done list; missionDoneSet seeds it from
    // missionIdx. Anything that is not an array is dropped, not trusted.
    if (t.missionsDone !== undefined && !Array.isArray(t.missionsDone)) t.missionsDone = undefined;
    if (!t.reforms) t.reforms = { mil: 0, civ: 0, rel: 0 }; // pre-reform saves
    if (!t.eraIdeas || typeof t.eraIdeas !== 'object') t.eraIdeas = {}; // pre-§179 saves
    if (!t.tech) t.tech = { gov: 3, infl: 3, mar: 3 }; // pre-tech saves join the age
    if (!t.advisors) t.advisors = { gov: null, infl: null, mar: null };
    if (!t.courtCand) t.courtCand = {};
    if (!Number.isFinite(t.aggression)) t.aggression = 0;
    if (!Array.isArray(t.guarantees)) t.guarantees = []; // pre-diplomacy-depth saves
    if (t.factions === undefined) t.factions = null; // pre-faction saves (SPEC §34): reseeded lazily
    // A save written mid-multiplayer leaves guest nations human (ai:false).
    // Loading is always a solo continuation: everyone but the player is AI again.
    t.ai = k !== saved.playerTag;
  }
  saved.humanTags = [saved.playerTag]; // multiplayer roster never survives a reload
  for (let i = 1; i < saved.provinces.length; i++) {
    const p = saved.provinces[i];
    if (p && p.conversion === undefined) p.conversion = null;
  }
  // Pre-tech saves: armies take their nation's current pattern (SPEC §22).
  for (const id of Object.keys(saved.armies || {})) {
    const a = saved.armies[id];
    if (a && !Number.isFinite(a.oosMonths)) a.oosMonths = 0; // pre-supply saves (SPEC §82)
    if (!a || Number.isFinite(a.gen)) continue;
    const t = saved.tags[a.tag];
    a.gen = unlockedGen(num(t && t.tech && t.tech.mar, 0));
  }
  // Pre-invasion saves: the AI needs its scratch state (SPEC §82); pre-chapter
  // saves keep their ledgers whole (SPEC §83).
  for (const k of Object.keys(saved.tags)) {
    const t = saved.tags[k];
    if (t && (!t.aiState || typeof t.aiState !== 'object')) t.aiState = {};
  }
  if (saved.chapters && typeof saved.chapters === 'object') {
    if (!Array.isArray(saved.chapters.history)) saved.chapters.history = [];
    if (!Array.isArray(saved.chapters.usedKinds)) saved.chapters.usedKinds = [];
  }
  saved.paused = true; // always resume paused
  return saved;
}
