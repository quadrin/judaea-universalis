// Judaea Universalis — the robbers' court (SPEC §217). DOM-free.
//
// §160 put 130 unowned-but-passable cells on the map and wrote the rule that
// makes this possible: "passage is not possession — entering unowned ground
// takes nothing and claims nothing." True of every court on the map. It was
// never true of a rebel band, because `isHostile` answers yes for REB against
// anything, including the nobody who governs the empty quarter: a rising that
// wanders out to Gaetulia or Scythia lays siege to the sand, takes it, and —
// since `monthlyRisings` only burns out a rising against a LIVING owner —
// holds it for the rest of the campaign. A band nobody will ever come for,
// standing on ground nobody wants.
//
// That is a good accident and this section keeps it, with an ending attached.
// A band that has taken the world's edge stops marching (the rebel AI used to
// send it back toward the nearest province with a flag on it), and if it is
// still standing there two years later it stops being a rising: the camp
// becomes a state, with a name, a chief, a constitution and a colour of its
// own. Λῃσταί by land — Josephus' word for Hezekiah on the Galilean border and
// for Eleazar ben Dinai, who was in the hills for twenty years — and πειραταί
// by sea, the Cilicians who had fortresses, arsenals and understandings with
// three kings until Pompey was handed the whole Mediterranean to end them.
//
// It is an easter egg and it is bounded like one: the empty quarter only
// (ownerless frontier at the rim, never an ownerless CITY — Carthage is
// scenery, not a prize), one court per campaign, and no roll of the dice
// anywhere in it. Everything it picks, it picks off the ground it is standing
// on, so a campaign where the robbers never rise draws exactly the world it
// drew before.

import {
  num, clamp, chronicle, changeOwnerCore, changeControllerCore,
} from './military.js';
import { maxManpowerOf } from './economy.js';
import { isCoastal } from './navy.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/outlaws]', ...args);
}

function O(ctx, key, fallback) {
  const o = ctx.DEFINES && ctx.DEFINES.OUTLAW;
  return o && Number.isFinite(o[key]) ? o[key] : fallback;
}

// The two identities, and the tag each one takes.
export const OUTLAW_KINDS = {
  bandit: { tag: 'LST', title: 'Archilestes' },
  pirate: { tag: 'PIR', title: 'Archipirata' },
};

// Chiefs the sources actually name. Brigands out of Josephus, pirates out of
// Cicero, Strabo and Appian — the men who held Olympus, sacked Delos and were
// still being hunted when Pompey got his command.
const CHIEFS = {
  bandit: [
    { name: 'Hezekiah', epithet: 'the archbrigand of the Galilean border' },
    { name: 'Eleazar ben Dinai', epithet: 'twenty years in the hills' },
    { name: 'Tholomaeus', epithet: 'who held Idumaea against two procurators' },
    { name: 'Athronges', epithet: 'the shepherd who put on a diadem' },
    { name: 'Simon of Peraea', epithet: 'a king\'s servant, and then a king' },
    { name: 'Judas son of Hezekiah', epithet: 'who emptied the armory at Sepphoris' },
  ],
  pirate: [
    { name: 'Zeniketes', epithet: 'who burned his own citadel rather than strike' },
    { name: 'Athenodorus', epithet: 'who sold Delos into slavery in a day' },
    { name: 'Heracleon', epithet: 'four ships, and a harbor that let him in' },
    { name: 'Pyrganion', epithet: 'who wintered in a praetor\'s own port' },
    { name: 'Isidorus', epithet: 'master of the sea between Crete and Cyrene' },
    { name: 'Seleucus', epithet: 'who took a fleet\'s name and none of its orders' },
  ],
};

// ---------------------------------------------------------------- the ground
// The empty quarter: ownerless, walkable, and empty. `uninhabited` or
// `frontier` is the whole test and it is deliberately narrow — the same
// ownerless belt holds 67 towns and cities (Carthage, Corduba, Cirta), and a
// rising that walks into one of those has taken a city, which is a balance
// event and somebody else's section. What this wants is the ground at the rim
// that no court on the map has ever bothered to claim.
export function emptyQuarter(ctx, p) {
  if (!p || p.impassable || p.owner !== 'WASTE') return false;
  return p.habitation === 'uninhabited' || p.habitation === 'frontier';
}

// A band standing on this ground, big enough to be a garrison rather than a
// straggler, and not currently being answered by anybody.
function bandIn(ctx, p) {
  const g = ctx.game;
  const min = Math.max(1, O(ctx, 'men', 1000));
  let best = null;
  for (const id of Object.keys(g.armies)) {
    const a = g.armies[id];
    if (!a || a.tag !== 'REB' || a.prov !== p.id || a.inBattle || a.retreating) continue;
    if (num(a.men) < min) continue;
    if (!best || num(a.men) > num(best.men)) best = a;
  }
  return best;
}

// Anybody swinging at anybody on this ground.
function contested(ctx, p) {
  const g = ctx.game;
  for (const id of Object.keys(g.armies)) {
    const a = g.armies[id];
    if (a && a.prov === p.id && (a.inBattle || a.retreating)) return true;
  }
  return false;
}

// Has this campaign already produced one? An easter egg that can happen twice
// is a mechanic, and a map that fills up with robber kingdoms is neither.
export function outlawsRisen(ctx) {
  const g = ctx.game;
  if (g.flags && g.flags._outlawCourt) return true;
  for (const k of Object.keys(OUTLAW_KINDS)) {
    const t = g.tags[OUTLAW_KINDS[k].tag];
    if (t && t.alive) return true;
  }
  return false;
}

// Which of the two a camp here would become. Read off the water rather than a
// table, so a cell the map later makes coastal answers the new way by itself.
export function outlawKindFor(ctx, p) {
  return isCoastal(ctx, p.id) ? 'pirate' : 'bandit';
}

// ------------------------------------------------------------------ the tick
// Monthly. One counter per cell, and it only runs while all three facts hold:
// ownerless empty quarter, rebel-held, and a band actually standing in it.
// Lose any of them and the camp is a camp again.
export function monthlyOutlaws(ctx) {
  const g = ctx.game;
  const months = Math.max(1, O(ctx, 'months', 24));
  const done = outlawsRisen(ctx);
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p) continue;
    try {
      if (!emptyQuarter(ctx, p) || p.controller !== 'REB') {
        if (p.outlawMonths) p.outlawMonths = 0;
        continue;
      }
      const band = bandIn(ctx, p);
      if (!band) { if (p.outlawMonths) p.outlawMonths = 0; continue; }
      p.outlawMonths = num(p.outlawMonths) + 1;
      if (done || p.outlawMonths < months) continue;
      // A siege or a battle on this ground is the question still being asked,
      // and a tag switch under a running battle is how a stack changes sides
      // mid-melee. The answer waits for the field to be quiet.
      if (p.siege || contested(ctx, p)) continue;
      if (foundOutlawCourt(ctx, p, band)) return;
    } catch (e) { warnOnce('outlaw:' + i, 'outlaw tick failed for province', i, e); }
  }
}

// ------------------------------------------------------------ the foundation
// The camp becomes a state. Everything it needs it takes off the province it
// is standing on — faith, tongue, seat, and which of the two identities it is
// — and the chief is picked by province id rather than by a die, so this adds
// no draw to the campaign's seeded stream.
export function foundOutlawCourt(ctx, p, band) {
  const g = ctx.game;
  if (!p || !band || outlawsRisen(ctx)) return false;
  const kind = outlawKindFor(ctx, p);
  const def = OUTLAW_KINDS[kind];
  const tag = def.tag;
  if (g.tags[tag] && g.tags[tag].alive) return false;
  const chiefs = CHIEFS[kind];
  const chief = chiefs[Math.abs(p.id | 0) % chiefs.length];
  const t = makeOutlawCourt(ctx, tag, kind, p, chief);
  g.tags[tag] = t;

  // The ground. It was ownerless a moment ago, so nobody is losing anything
  // and no grudge is recorded: there is no court to remember it.
  if (p.habitation === 'uninhabited') p.habitation = 'frontier';
  p.autonomy = clamp(num(p.autonomy, 0.25), 0, 0.5);
  p.integration = 0;
  p.integrating = null;
  p.outlawMonths = 0;
  p.revoltType = null;
  p.revoltProgress = 0;
  p.rebelHeldMonths = 0;
  changeOwnerCore(ctx, p, tag); // …which resolves the display name for the new pen
  changeControllerCore(ctx, p, tag);

  // The band. Every rebel standing on this ground is now somebody's army —
  // which is the whole of what happened here, told in one field.
  let men = 0;
  for (const id of Object.keys(g.armies)) {
    const a = g.armies[id];
    if (!a || a.tag !== 'REB' || a.prov !== p.id) continue;
    a.tag = tag;
    a.name = (kind === 'pirate' ? 'Company of ' : 'Band of ') + chief.name;
    delete a.rising;
    delete a.restoreTo;
    delete a.claimant;
    men += num(a.men);
  }
  t.maxManpower = Math.max(men, maxManpowerOf(ctx, tag));
  t.manpower = Math.round(t.maxManpower * 0.5);

  // A corsair court without hulls is a joke with no punchline.
  if (kind === 'pirate' && ctx.helpers && ctx.helpers.spawnFleet) {
    try {
      ctx.helpers.spawnFleet(ctx, tag, p.canon || p.name, Math.max(1, O(ctx, 'ships', 3)), {
        name: 'The ' + chief.name.split(' ')[0] + ' Squadron',
      });
    } catch (e) { warnOnce('fleet', 'outlaw fleet failed', e); }
  }

  if (!g.flags || typeof g.flags !== 'object') g.flags = {};
  g.flags._outlawCourt = { tag, kind, prov: p.id, chief: chief.name, y: g.date.y, m: g.date.m };

  const line = kind === 'pirate'
    ? t.name + ' is proclaimed at ' + p.name + '. ' + chief.name + ', ' + chief.epithet
      + ', is archipirata of a coast no navy patrols — and the difference between '
      + 'a pirate and a maritime power was never in the ships.'
    : t.name + ' is proclaimed at ' + p.name + '. ' + chief.name + ', ' + chief.epithet
      + ', is archilestes of ground no crown ever wanted — which is how every '
      + 'kingdom on this map began, if you go back far enough.';
  chronicle(ctx, 'world', line);
  if (ctx.bus) {
    ctx.bus.emit('notify', {
      title: kind === 'pirate' ? 'A flag over an unwatched coast' : 'A crown out of the sand',
      text: line,
      type: 'info', provName: p.name,
    });
  }
  return true;
}

function makeOutlawCourt(ctx, tag, kind, p, chief) {
  const d = (ctx.DEFINES.TAGS || {})[tag] || {};
  const techBase = Math.max(0, num(ctx.bookmark && ctx.bookmark.techBase, 3) | 0);
  // A robber state knows what the country it robbed knows, one rung down: it
  // has veterans and no schools.
  const tech = Math.max(0, techBase - 1);
  return {
    tag,
    name: d.name || tag,
    color: Array.isArray(d.color) ? d.color.slice() : [110, 96, 88],
    // Whoever these men were before they were outlaws, they were from here.
    religion: p.religion || d.religion,
    culture: p.culture || d.culture,
    alive: true,
    ai: true,
    treasury: Math.max(0, O(ctx, 'treasury', 40)),
    income: 0, expenses: 0, loans: 0,
    manpower: 0, maxManpower: 0,
    stability: 0, legitimacy: 50, warExhaustion: 0,
    points: { gov: 0, infl: 0, mar: 0 },
    ideas: { ...(d.ideas || {}) },
    reforms: { mil: 0, civ: 0, rel: 0 },
    eraIdeas: {}, // a state with no chancery has taken up none of the age's ideas
    programs: {}, // …and owns no works (SPEC §213)
    tech: { gov: tech, infl: tech, mar: tech },
    advisors: { gov: null, infl: null, mar: null },
    aggression: 0,
    courtCand: {},
    modifiers: [],
    atWarWith: [], allies: [], guarantees: [], opinion: {},
    govType: 'company',
    electionIn: 48,
    claims: [], claimFabrications: [], overlord: null,
    heir: null, regency: false, missionIdx: 0,
    aiState: {},
    ruler: {
      name: chief.name, title: OUTLAW_KINDS[kind].title,
      gov: 1, infl: 2, mar: 4, age: 38,
    },
    dynamicCapital: p.canon || p.name,
    description: d.description || 'A band that stopped moving.',
  };
}
