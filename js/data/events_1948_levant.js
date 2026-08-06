// Judaea Universalis — the Levant without a Lebanon, 1971–2000 (SPEC §113).
// Content package. Zero imports; all effects run through ctx.helpers at
// runtime. Concatenated onto EVENTS_1948 by the era registry.
//
// The chapter's whole northern arc — nine major world cards, from the Cairo
// Agreement of 1969 to the Mire — is guarded `when: alive(LEB)`. That is the
// right guard for cards about the collapse of the Lebanese confessional
// settlement, because a state that does not exist cannot have its settlement
// collapse. But `when` RETIRES a card, it does not hold it, so an Israel (or a
// Syria) that took Beirut before 1969 deleted fifty years of the region's
// history and got nothing whatever in its place: no militias, no Guard in the
// Beqaa, no eighteen years in the south. Just quiet, in the loudest corner of
// the map.
//
// That is the two-outcome assumption SPEC §112 names, in its most expensive
// form. This file is the third outcome. The forces the Lebanon arc is about do
// not need Lebanon to exist:
//
//   — The fedayeen expelled from Jordan in 1970 went to Lebanon because Lebanon
//     was the one state too weak to refuse them. With no such state they go
//     somewhere that CAN refuse them, and refusing them is a decision with a
//     price. (Historically the ones who could not reach Beirut went to Syria,
//     to Iraq, and eventually to Tunis.)
//   — Mount Lebanon's confessional arithmetic does not dissolve on annexation.
//     It becomes the annexer's arithmetic: a Maronite north, a Sunni coast, a
//     Shia south and a Druze mountain, inside somebody's borders, voting or
//     not voting.
//   — The Revolutionary Guard came to the Beqaa in 1982 for the Shia of the
//     south. Under a direct occupation that community's grievance is not
//     mediated by a Lebanese state at all, which makes the Guard's argument
//     easier to make, not harder.
//
// So the north stays loud. It is simply loud about a different thing, and the
// player who conquered it is the one it is loud at.
//
// Source spine: Yezid Sayigh on the fedayeen after 1970; Kamal Salibi on the
// confessional settlement and what it was actually load-bearing for; Fouad
// Ajami and Augustus Richard Norton on the Shia south; Nicholas Blanford on
// the Guard's arrival; the Israeli experience in the security zone, 1985–2000,
// as the model for an occupation that cannot be ended by taking more ground.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_1948_levant] ' + key, e || '');
}

function guard(key, fn) {
  return function (ctx) {
    try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); }
  };
}

function safeTrigger(key, fn) {
  return function (ctx) {
    try { return !!fn(ctx); } catch (e) { warnOnce('trigger:' + key, e); return false; }
  };
}

// The 1948 chapter is the exception to SPEC §135, deliberately. Everywhere else
// a renamed realm is the same court under new letters and `alive` should follow
// the forwarding address. Here the rename IS the subject: Cairo becomes the
// United Arab Republic and back again, Damascus walks out of the union as the
// Syrian Arab Republic, and a dozen cards turn on which of those banners is
// flying this decade. So this one asks the raw question, and the chapter's own
// cast resolvers (egyTag / syrTag / syrOwn) go on answering it name by name.
function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[tag];
  return !!(t && t.alive !== false);
}

function flag(ctx, key) {
  return !!(ctx.game.flags && ctx.game.flags[key]);
}

// The provinces that were Lebanon, north to south (SPEC §225 splits the six
// coastal cells into thirteen districts; this list is what "Lebanon" means to
// every card in the file, so it grew with them).
const LEBANON = ['Akkar', 'Tripolis', 'Bsharri', 'Batroun', 'Byblos', 'Jounieh',
  'Berytus', 'Chouf', 'Heliopolis', 'Chalcis', 'Sidon', 'Nabatieh', 'Tyre',
  'Gischala', 'Jotapata', 'Sepphoris', "Ma'alot"];
// The Shia south and the Beqaa — where the last act happens whoever is holding it.
const THE_SOUTH = ['Tyre', 'Nabatieh', 'Sidon', 'Chalcis', 'Heliopolis'];
// Beirut and the Christian north — the confessional question's other half.
const MOUNT_LEBANON = ['Berytus', 'Jounieh', 'Byblos', 'Batroun', 'Bsharri', 'Tripolis'];

// Spawn at the first listed province the tag actually controls — fronts move.
function spawnAt(ctx, tag, provNames, opts) {
  for (const n of provNames) {
    if (ctx.helpers.controls(ctx, tag, n)) return ctx.helpers.spawnArmy(ctx, tag, n, opts);
  }
  return null;
}

// The Party of God takes the ground (SPEC §225). Baalbek's half of the Beqaa
// and the Jabal Amil leave whoever is holding them — here that is never
// Beirut, because in this arc there is no Beirut. Returns the tag or null: a
// secession with no province behind it is a proclamation, and the map does not
// model proclamations.
const PARTY_GROUND = ['Heliopolis', 'Nabatieh'];
function seatTheParty(ctx) {
  const g = ctx.game;
  if (g.tags.HEZ) return 'HEZ';
  if (typeof ctx.helpers.secedeTag !== 'function') return null;
  const owners = {};
  for (const n of PARTY_GROUND) {
    const p = ctx.prov && ctx.prov(n);
    const o = p && p.owner;
    if (!o || o === 'REB' || o === 'WASTE' || !alive(ctx, o)) continue;
    owners[o] = (owners[o] || []).concat(n);
  }
  const beqaa = ctx.prov && ctx.prov('Heliopolis');
  const seatOwner = beqaa && owners[beqaa.owner] ? beqaa.owner : null;
  const from = seatOwner
    || Object.keys(owners).sort((a, b) => owners[b].length - owners[a].length)[0];
  if (!from) return null;
  const seated = ctx.helpers.secedeTag(ctx, from, 'HEZ', {
    provinces: owners[from], share: 0.04, stability: 1, legitimacy: 60,
    ruler: { name: 'Subhi al-Tufayli', title: 'Secretary-General', gov: 3, infl: 4, mar: 3, age: 34 },
  });
  if (!seated) return null;
  for (const other of Object.keys(owners)) {
    if (other === from) continue;
    for (const n of owners[other]) ctx.helpers.changeOwner(ctx, n, 'HEZ');
    setOpinion(ctx, other, 'HEZ', -60);
  }
  // The Islamic Resistance: a cadre, not an army. It never had the men to
  // take ground and never tried to; what it has is the ground it is standing
  // on and a doctrine about not leaving it.
  spawnAt(ctx, 'HEZ', ['Heliopolis', 'Nabatieh'], {
    inf: 2, name: 'The Islamic Resistance',
    general: { name: 'Imad Mughniyeh', fire: 2, shock: 3, maneuver: 4 },
  });
  if (alive(ctx, 'IRN')) { setOpinion(ctx, 'IRN', 'HEZ', 120); setOpinion(ctx, 'HEZ', 'IRN', 120); }
  setOpinion(ctx, 'HEZ', from, -200); setOpinion(ctx, from, 'HEZ', -120);
  return 'HEZ';
}

// Who actually holds the country, if it is not a country any more. Returns the
// tag with the most of the nine, or null if Lebanon is alive and holding its own.
function occupier(ctx) {
  if (alive(ctx, 'LEB')) return null;
  const count = {};
  let best = null;
  for (const n of LEBANON) {
    const p = ctx.prov && ctx.prov(n);
    if (!p || p.impassable) continue;
    const t = ctx.game.tags[p.owner];
    if (!t || t.alive === false || p.owner === 'REB' || p.owner === 'WASTE') continue;
    count[p.owner] = (count[p.owner] || 0) + 1;
    if (!best || count[p.owner] > count[best]) best = p.owner;
  }
  // A single province is a border adjustment, not the possession of a country.
  return best && count[best] >= 4 ? best : null;
}

// The condition every card here shares: Lebanon is gone and somebody is
// standing in it.
function noLebanon(ctx) {
  return !alive(ctx, 'LEB') && !!occupier(ctx);
}

function holds(ctx, tag, names) {
  const out = [];
  for (const n of names) {
    if (ctx.helpers.controls(ctx, tag, n)) out.push(n);
  }
  return out;
}

function stir(ctx, tag, names, mod) {
  let touched = 0;
  for (const n of holds(ctx, tag, names)) {
    ctx.helpers.addProvinceModifier(ctx, n, mod);
    touched++;
  }
  return touched;
}

function setOpinion(ctx, a, b, val) {
  const t = ctx.game.tags && ctx.game.tags[a];
  if (!t) return;
  if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
  t.opinion[b] = Math.max(-200, Math.min(200, val));
}

// The Syrian court, under whichever of its names this campaign produced.
function syrTag(ctx) {
  for (const t of ['SAR', 'SYR', 'UAR']) if (alive(ctx, t)) return t;
  return null;
}

export const EVENTS_1948_LEVANT = [

  {
    id: 'ev_l_nowhere_to_regroup',
    title: 'Nowhere to Regroup',
    worldLabel: 'The fedayeen are expelled with no Lebanon to go to',
    desc: 'The Arab Legion has finished what it started in September, and the '
      + 'organizations are on the roads north with what they can carry. In the history '
      + 'that did not happen here they would be in Beirut by spring, because Lebanon '
      + 'was the one state in the region too weak to refuse them and too divided to '
      + 'agree on refusing them. There is no such state now. There is a border, and '
      + 'behind it an army that answers to whoever took Beirut, and the men on the '
      + 'roads have to be somebody else\'s problem instead — Damascus\'s, or Baghdad\'s, '
      + 'or a port on the far side of the Mediterranean where nobody has to look at '
      + 'them. Every one of those answers has a bill, and the bill is not paid by the '
      + 'people who chose it.',
    forTag: 'both',
    decider: (ctx) => occupier(ctx) || 'JOR',
    date: { y: 1971, m: 3 },
    world: true,
    major: true,
    when: safeTrigger('ev_l_nowhere_to_regroup:when', (ctx) => noLebanon(ctx)),
    aiOption: 0,
    historical: 'They went to Lebanon, and everything that followed followed from that. With no Lebanon the question is only where the bill lands.',
    options: [
      {
        label: 'Seal the border and let Damascus have them',
        tooltip: 'The frontier is closed and the organizations end up in Syria\'s lap. The occupier: +1 stability, "The Sealed Frontier" (−0.75 unrest across the nine provinces, 120 months) — but a garrison bill of −8% income for as long as it lasts, and Syria takes +2 unrest in its own cities and cools 40 toward you. The men are still armed, and now they are armed on somebody\'s payroll.',
        effects: guard('ev_l_nowhere_to_regroup:0', (ctx) => {
          const h = ctx.helpers;
          const me = occupier(ctx);
          if (!me) return;
          h.adjust(ctx, me, { stability: 1 });
          stir(ctx, me, LEBANON, {
            id: 'sealed_frontier', name: 'The Sealed Frontier', months: 120,
            effects: { unrest: -0.75 },
          });
          h.addTagModifier(ctx, me, {
            id: 'the_northern_garrison', name: 'The Northern Garrison', months: 120,
            effects: { incomeMult: 0.92 },
          });
          const syr = syrTag(ctx);
          if (syr) {
            h.adjust(ctx, syr, { stability: -1 });
            for (const n of ['Damascus', 'Aleppo', 'Homs']) {
              if (h.controls(ctx, syr, n)) {
                h.addProvinceModifier(ctx, n, {
                  id: 'the_lodgers', name: 'The Lodgers', months: 120, effects: { unrest: 2 },
                });
              }
            }
            setOpinion(ctx, syr, me, -120);
          }
          h.setFlag(ctx, 'fedayeenToDamascus', true);
          h.setFlag(ctx, 'noLebanonArc', true);
          h.chronicle(ctx, 'war', 'With no Lebanon to absorb them, the fedayeen expelled from Jordan are sealed out of the north and end up in Syria; the frontier is quiet and the garrison is expensive.');
        }),
      },
      {
        label: 'Let them through, and know where they are',
        tooltip: 'The organizations settle in the camps around Sidon and Tyre under your administration rather than beyond your reach. The south carries "The Camps" (+2 unrest, permanent) and the occupier −10 legitimacy abroad — but the intelligence is yours: no "Sealed Frontier" bill, and every later northern card resolves with you inside the problem instead of outside it.',
        effects: guard('ev_l_nowhere_to_regroup:1', (ctx) => {
          const h = ctx.helpers;
          const me = occupier(ctx);
          if (!me) return;
          h.adjust(ctx, me, { legitimacy: -10 });
          stir(ctx, me, ['Tyre', 'Sidon'], {
            id: 'the_camps_north', name: 'The Camps', months: -1, effects: { unrest: 2 },
          });
          h.addTagModifier(ctx, me, {
            id: 'the_files_on_the_camps', name: 'The Files on the Camps', months: -1,
            effects: { unrestAll: -0.25 },
          });
          h.setFlag(ctx, 'campsUnderOccupation', true);
          h.setFlag(ctx, 'noLebanonArc', true);
          h.chronicle(ctx, 'war', 'The fedayeen expelled from Jordan are admitted to the camps of the southern coast under occupation administration — inside the problem rather than beyond it.');
        }),
      },
    ],
  },

  {
    id: 'ev_l_confessional_arithmetic',
    title: 'The Arithmetic Does Not Dissolve',
    worldLabel: 'The confessional question becomes the occupier\'s question',
    desc: 'Lebanon was not a country so much as a formula: a Maronite president, a '
      + 'Sunni prime minister, a Shia speaker, and a census nobody dared repeat because '
      + 'everyone knew what it would say. Conquering the formula does not solve it. The '
      + 'Maronite north expects to be governed by people who understand what it is '
      + 'afraid of; the Sunni coast has a different set of relatives across a different '
      + 'border; the Shia of the south have been at the bottom of the arithmetic since '
      + 'the country was invented and are now at the bottom of somebody else\'s; and the '
      + 'Druze of the mountain have survived four empires by never being the last to '
      + 'change sides. The question is not whether to hold them. It is whether to rule '
      + 'through the men who already run them, or to do it yourself.',
    forTag: 'both',
    decider: (ctx) => occupier(ctx) || 'ISR',
    date: { y: 1975, m: 4 },
    world: true,
    major: true,
    when: safeTrigger('ev_l_confessional_arithmetic:when', (ctx) => noLebanon(ctx)),
    aiOption: 1,
    historical: 'In April 1975 the formula broke on its own and the war ran fifteen years. An occupier inherits the formula rather than the war — and then has to choose how to hold it.',
    options: [
      {
        label: 'Rule through the militias that already exist',
        tooltip: 'The Christian north is administered by its own armed men, who are cheap, loyal and unaccountable. +200 treasury saved, Mount Lebanon −1 unrest for 240 months, no garrison bill in the north — but the south takes +1.5 unrest permanently, the occupier −1 stability, and "The Men We Armed" (+15% chance the last act goes badly): a militia is a debt that comes due in somebody else\'s massacre.',
        effects: guard('ev_l_confessional_arithmetic:0', (ctx) => {
          const h = ctx.helpers;
          const me = occupier(ctx);
          if (!me) return;
          h.adjust(ctx, me, { treasury: 200, stability: -1 });
          stir(ctx, me, MOUNT_LEBANON, {
            id: 'the_militias_north', name: 'Governed by Its Own Armed Men', months: 240,
            effects: { unrest: -1 },
          });
          stir(ctx, me, THE_SOUTH, {
            id: 'bottom_of_the_arithmetic', name: 'The Bottom of the Arithmetic', months: -1,
            effects: { unrest: 1.5 },
          });
          h.addTagModifier(ctx, me, {
            id: 'the_men_we_armed', name: 'The Men We Armed', months: -1,
            effects: { legitimacyAdd: -0.1 },
          });
          h.setFlag(ctx, 'ruledThroughMilitias', true);
          h.chronicle(ctx, 'era', 'Mount Lebanon is administered through its own militias: cheap, loyal, unaccountable, and a debt.');
        }),
      },
      {
        label: 'Administer it directly, and pay for it',
        tooltip: 'Schools, courts, roads and a payroll in all nine provinces. −350 treasury and −10% income for 240 months, and the occupier\'s own politics take the strain (−1 stability now) — but every province is −0.5 unrest permanently, the south is not left to somebody else, and no militia debt is contracted. The expensive answer, which is the one that works.',
        effects: guard('ev_l_confessional_arithmetic:1', (ctx) => {
          const h = ctx.helpers;
          const me = occupier(ctx);
          if (!me) return;
          h.adjust(ctx, me, { treasury: -350, stability: -1 });
          h.addTagModifier(ctx, me, {
            id: 'the_northern_administration', name: 'The Northern Administration', months: 240,
            effects: { incomeMult: 0.9 },
          });
          stir(ctx, me, LEBANON, {
            id: 'courts_and_schools', name: 'Courts and Schools', months: -1,
            effects: { unrest: -0.5 },
          });
          h.setFlag(ctx, 'administeredDirectly', true);
          h.chronicle(ctx, 'era', 'The nine provinces of Lebanon are administered directly — schools, courts and a payroll — at a price the occupier argues about at home every year.');
        }),
      },
    ],
  },

  {
    id: 'ev_l_guard_comes_anyway',
    title: 'The Guard Comes Anyway',
    worldLabel: 'The Revolutionary Guard reaches the Beqaa',
    desc: 'There is no Lebanese state to ask permission of and no Syrian corridor to '
      + 'negotiate, and the Guard arrives regardless — in ones and twos through the '
      + 'mountain, with money, with clerics, and with a proposition that does not '
      + 'require anybody\'s government to agree to it. The community it recruits from '
      + 'has been at the bottom of the arithmetic for sixty years and is now at the '
      + 'bottom of an occupation as well, which removes the last argument for patience. '
      + 'What is built is not a militia in a civil war; there is no civil war. It is a '
      + 'resistance to a foreign administration, which is a very much easier thing to '
      + 'explain to a young man, and there is no local state in between to blame for '
      + 'anything. The occupation has produced the adversary faster than the history '
      + 'that did not happen here would have.',
    forTag: 'both',
    decider: 'IRN',
    date: { y: 1983, m: 2 },
    world: true,
    major: true,
    minYear: 1983,
    maxYear: 1995,
    when: safeTrigger('ev_l_guard_comes_anyway:when', (ctx) =>
      noLebanon(ctx) && flag(ctx, 'iranianRevolution') && !flag(ctx, 'hezbollah')),
    aiOption: 0,
    historical: 'The Guard came to Baalbek in 1982 through Damascus and stayed. Without a Lebanon to come through it comes anyway, and to a population with one less institution between it and the occupier.',
    options: [
      {
        label: 'Baalbek, without anyone\'s permission',
        tooltip: 'The Party of God is founded under occupation. Tyre, Sidon and the Beqaa carry "The Party of God" permanently (+2 unrest); the occupier takes "The Attrition in the South" (−8% income, −5% morale) for as long as it holds them — worse than the historical version, because there is no local government to absorb any of the blame. Iran −60 treasury, +15 influence. Taking more ground does not help; that is the point of it.',
        effects: guard('ev_l_guard_comes_anyway:0', (ctx) => {
          const h = ctx.helpers;
          const me = occupier(ctx);
          for (const n of THE_SOUTH) {
            const p = ctx.prov && ctx.prov(n);
            if (!p || p.impassable) continue;
            h.addProvinceModifier(ctx, n, {
              id: 'party_of_god', name: 'The Party of God', months: -1, effects: { unrest: 2 },
            });
          }
          if (me) {
            h.addTagModifier(ctx, me, {
              id: 'attrition_in_the_south', name: 'The Attrition in the South', months: -1,
              effects: { incomeMult: 0.92, moraleMult: 0.95 },
            });
            setOpinion(ctx, 'IRN', me, -180);
          }
          if (alive(ctx, 'IRN')) {
            h.adjust(ctx, 'IRN', { treasury: -60, legitimacy: 8 });
          }
          h.setFlag(ctx, 'hezbollah', true);
          h.setFlag(ctx, 'hezbollahUnderOccupation', true);
          // …and it takes the ground here too (SPEC §225). There is no
          // Lebanese state to secede from in this world, so Baalbek's Beqaa
          // and the Jabal Amil come off the OCCUPIER — which is the version of
          // this that needs the least explaining to anybody.
          seatTheParty(ctx);
          h.chronicle(ctx, 'war', 'The Revolutionary Guard reaches the Beqaa with no state\'s permission and founds the Party of God against a direct occupation — an adversary the occupation itself produced.');
        }),
      },
    ],
  },

  {
    id: 'ev_l_the_lesson',
    title: 'One Truck, and the Lesson',
    worldLabel: 'A truck bomb takes the occupation headquarters',
    desc: 'There is no multinational force here to guarantee a peace between Lebanese '
      + 'factions, because there are no Lebanese factions and no Lebanon; there is a '
      + 'military government building on the coast with a wire fence and a barrier and '
      + 'a queue of local staff arriving for work at eight. The truck goes through all '
      + 'three. What follows is the same in every particular that matters: a building '
      + 'coming down on the people asleep in it, no organisation claiming it in terms '
      + 'anyone can act on, nobody ever prosecuted, and a lesson learned by everybody '
      + 'watching that is cheap, correct, and impossible to unlearn. An army can take '
      + 'any ground it wants here in an afternoon. It cannot make a headquarters that '
      + 'is not a target, and it cannot retaliate against an address that does not '
      + 'exist.',
    forTag: 'both',
    decider: (ctx) => occupier(ctx) || 'ISR',
    date: { y: 1983, m: 11 },
    world: true,
    major: true,
    minYear: 1983,
    maxYear: 1992,
    when: safeTrigger('ev_l_the_lesson:when', (ctx) =>
      noLebanon(ctx) && flag(ctx, 'hezbollahUnderOccupation')),
    aiOption: 0,
    historical: 'In November 1983 a truck took the Israeli headquarters at Tyre; the method was already the method, and everyone watching drew the same conclusion.',
    options: [
      {
        label: 'Count them, bury them, and harden the perimeter',
        tooltip: 'The occupier: −12 legitimacy, −1 stability, and "No Address to Retaliate Against" permanently (−4% morale, −0.1 legitimacy a month). The southern provinces take +1 unrest for 120 months as the sweeps go through them. Hardening the perimeter works, in the sense that the next truck goes somewhere else.',
        effects: guard('ev_l_the_lesson:0', (ctx) => {
          const h = ctx.helpers;
          const me = occupier(ctx);
          if (!me) return;
          h.adjust(ctx, me, { legitimacy: -12, stability: -1 });
          h.addTagModifier(ctx, me, {
            id: 'no_address_to_retaliate', name: 'No Address to Retaliate Against', months: -1,
            effects: { moraleMult: 0.96, legitimacyAdd: -0.1 },
          });
          stir(ctx, me, THE_SOUTH, {
            id: 'the_sweeps', name: 'The Sweeps', months: 120, effects: { unrest: 1 },
          });
          h.setFlag(ctx, 'theLessonLearned', true);
          h.chronicle(ctx, 'war', 'A truck takes the occupation headquarters on the coast; the method is established, nobody is prosecuted, and there is no address to retaliate against.');
        }),
      },
    ],
  },

  {
    id: 'ev_l_the_long_north',
    title: 'The Long North',
    worldLabel: 'The occupation of Lebanon becomes a war of subtraction',
    desc: 'It has been years now, and the arithmetic of the thing has settled into its '
      + 'final form. The occupier holds every road, every town and every ridge, and can '
      + 'take any piece of ground it decides it wants in an afternoon. It is losing '
      + 'anyway, a few men at a time, to devices in culverts and to boys who go home '
      + 'afterwards to houses the army has the addresses of and cannot do anything '
      + 'about that would not make next month worse. Nobody at home can say what victory '
      + 'here would look like — not because the question is hard but because there is no '
      + 'answer that survives being said out loud. The generals ask for one more year. '
      + 'The mothers have started organising, and they are better at it than the '
      + 'generals are.',
    forTag: 'both',
    decider: (ctx) => occupier(ctx) || 'ISR',
    date: { y: 1993, m: 5 },
    world: true,
    major: true,
    when: safeTrigger('ev_l_the_long_north:when', (ctx) =>
      noLebanon(ctx) && flag(ctx, 'hezbollahUnderOccupation')),
    aiOption: 1,
    historical: 'Israel held a security zone in southern Lebanon for eighteen years and left it in one night in May 2000, having achieved none of what the zone was for.',
    options: [
      {
        label: 'Hold the line; a withdrawal now teaches the wrong lesson',
        tooltip: 'The occupation continues in full. "The Long North" permanently: −10% income, −6% morale, −0.15 legitimacy a month, and the southern provinces stay at their unrest. Nothing is conceded and nothing is gained; the bill simply keeps arriving. Choose this if the map matters more than the ledger.',
        effects: guard('ev_l_the_long_north:0', (ctx) => {
          const h = ctx.helpers;
          const me = occupier(ctx);
          if (!me) return;
          h.addTagModifier(ctx, me, {
            id: 'the_long_north', name: 'The Long North', months: -1,
            effects: { incomeMult: 0.9, moraleMult: 0.94, legitimacyAdd: -0.15 },
          });
          h.doctrine(ctx, 'conquest', 1);
          h.setFlag(ctx, 'theLongNorth', true);
          h.chronicle(ctx, 'war', 'The occupation of the north is held in full; the bill keeps arriving and nobody will say what the end of it looks like.');
        }),
      },
      {
        label: 'Pull back to a line that can be defended by fewer men',
        tooltip: 'The interior is given up and the frontier held: Tripoli, Byblos and Beirut revert to a local administration (a restored Lebanon where one can be seated, otherwise to whoever the map allows), the occupier keeps the south. −15 legitimacy for the retreat and the Party of God claims the credit (+1 unrest in the south, 120 months) — but "The Long North" is halved, and the ledger stops bleeding. The honest answer, at the price honesty costs.',
        effects: guard('ev_l_the_long_north:1', (ctx) => {
          const h = ctx.helpers;
          const me = occupier(ctx);
          if (!me) return;
          h.adjust(ctx, me, { legitimacy: -15 });
          // The interior goes back to a Lebanese administration if a court can be
          // seated at all — `secedeTagCore` refuses where the tag object already
          // exists, which it does for a Lebanon that lived and died in this
          // campaign, so this succeeds only where Lebanon never took the field.
          // Where it refuses, the pull-back is still real; it is simply a
          // frontier held by fewer men rather than a country handed back.
          let seated = false;
          try { seated = !!h.secedeTag(ctx, me, 'LEB', { provinces: MOUNT_LEBANON, capital: 'Berytus' }); }
          catch (e) { seated = false; }
          h.addTagModifier(ctx, me, {
            id: 'the_long_north', name: 'The Long North (the Frontier Only)', months: -1,
            effects: { incomeMult: 0.95, moraleMult: 0.97 },
          });
          stir(ctx, me, THE_SOUTH, {
            id: 'they_claim_the_credit', name: 'They Claim the Credit', months: 120,
            effects: { unrest: 1 },
          });
          h.doctrine(ctx, 'conquest', -1);
          h.setFlag(ctx, 'northFrontierOnly', true);
          h.chronicle(ctx, 'war', seated
            ? 'The interior of Lebanon is given back to a seated Lebanese administration and the frontier alone is held; the Party of God claims the credit and the ledger stops bleeding.'
            : 'The occupier pulls back to a frontier it can hold with fewer men; the Party of God claims the credit and the ledger stops bleeding.');
        }),
      },
    ],
  },

  {
    id: 'ev_l_what_the_north_cost',
    title: 'What the North Cost',
    worldLabel: 'The century closes on the northern question',
    desc: 'Thirty years on it is possible to say what the northern adventure bought and '
      + 'what it charged. It bought a frontier that no longer has a hostile state behind '
      + 'it, which was the whole argument for taking it and was, as far as it went, '
      + 'true. It charged a generation of soldiers, a permanent line in every budget, an '
      + 'adversary that did not exist before the occupation created it, and a standing '
      + 'question about what kind of state administers two million people who did not '
      + 'ask to be administered. The historians will argue about the balance for as long '
      + 'as there are historians. The ledger, at least, is not in dispute.',
    forTag: 'both',
    decider: (ctx) => occupier(ctx) || 'ISR',
    date: { y: 2000, m: 5 },
    world: true,
    major: true,
    when: safeTrigger('ev_l_what_the_north_cost:when', (ctx) =>
      noLebanon(ctx) && flag(ctx, 'noLebanonArc')),
    aiOption: 0,
    historical: 'Israel left southern Lebanon on the night of 24 May 2000 without an agreement, and the adversary the occupation had produced was still there.',
    options: [
      {
        label: 'Enter it in the ledger and let the historians argue',
        tooltip: 'The chapter closes on the north. The occupier: +10 legitimacy for a frontier with no hostile state behind it, and "The Northern Question" permanently (−0.25 unrest if it administered directly, +0.5 if it ruled through militias, and nothing either way if it never chose) — the settlement each answer actually earned.',
        effects: guard('ev_l_what_the_north_cost:0', (ctx) => {
          const h = ctx.helpers;
          const me = occupier(ctx);
          if (!me) return;
          h.adjust(ctx, me, { legitimacy: 10 });
          const direct = flag(ctx, 'administeredDirectly');
          const militias = flag(ctx, 'ruledThroughMilitias');
          h.addTagModifier(ctx, me, {
            id: 'the_northern_question', name: 'The Northern Question', months: -1,
            effects: { unrestAll: direct ? -0.25 : (militias ? 0.5 : 0) },
          });
          h.setFlag(ctx, 'northernQuestionClosed', true);
          h.chronicle(ctx, 'era', direct
            ? 'The century closes on a north that was administered rather than farmed out, and is quieter for it.'
            : (militias
              ? 'The century closes on a north held through other men\'s militias, and the debt is still outstanding.'
              : 'The century closes on the northern question, unanswered by anyone who had to live with it.'));
        }),
      },
    ],
  },
];
