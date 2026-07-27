// Judaea Universalis — the kingdom that kept the Galilee, 140–425 (SPEC §114).
// Content package. Zero imports; all effects run through ctx.helpers at
// runtime. Concatenated onto EVENTS_132 by the era registry.
//
// The 132 chapter is written for two outcomes and tests for them with two
// predicates:
//
//   judaeaStands    alive, no overlord, CONTROLS JERUSALEM, no war with Rome.
//                   Gates the victory branch: the Era of Redemption, the Third
//                   House, the Second Generation, the succession of the Nasi,
//                   the Antonine reckoning.
//   romanAftermath  Rome alive, Rome holds Jerusalem, and Judaea controls
//                   NOTHING AT ALL. Gates the defeat branch, including the
//                   fifteenth bishop, the rising against Gallus, and the
//                   patriarchate lapsing in 425.
//
// The commonest result of actually playing the chapter is neither. A revolt
// that is beaten out of Jerusalem but not out of the hills leaves a sovereign
// Jewish state of half a dozen Galilean provinces with a Roman Aelia down the
// road — `judaeaStands` false because the city is gone, `romanAftermath` false
// because the state is not. A traced campaign ran from 132 to 431 in exactly
// that position: alive, no overlord, six provinces, war settled, and not one
// card in three centuries that had anything to say about the Jewish-Roman
// question. The world spine ran beautifully past it — Decius, Milan, Nicaea,
// Julian, Cunctos Populos — and none of it was addressed to the Jewish state
// sitting in the middle of the map.
//
// This file is that third outcome. It is also the most interesting of the
// three, because it is the one furthest from what happened: the patriarchate
// as an office of a state that exists rather than a licence from a state that
// tolerates it, the Mishnah redacted for a country with courts of its own, and
// a Christianising empire with a sovereign Jewish neighbour rather than a
// scattered minority — which is a different problem, and one Rome has no
// precedent for.
//
// Source spine: for what the office of the Nasi actually was, Seth Schwartz
// and Martin Goodman; for the Galilee as the centre after 135, the excavations
// at Beth Shearim and Sepphoris; for the redaction, the standard account of
// Rabbi Judah's court at Beth Shearim and Sepphoris; for the fourth-century
// legislation, the Theodosian Code XVI.8 in sequence. Everything the counter-
// factual adds is built on those and marked in the text as what it is.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_132ce_galilee] ' + key, e || '');
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

function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[tag];
  return !!(t && t.alive !== false);
}

function flag(ctx, key) {
  return !!(ctx.game.flags && ctx.game.flags[key]);
}

function dateGE(ctx, y, m) {
  const d = ctx.game.date;
  return d.y > y || (d.y === y && d.m >= (m || 1));
}

function findJudRomWar(game) {
  for (const w of (game && game.wars) || []) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf('JUD') !== -1 && all.indexOf('ROM') !== -1) return w;
  }
  return null;
}

function controlledCount(ctx, tag) {
  const g = ctx.game;
  let n = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.controller === tag) n++;
  }
  return n;
}

// The third outcome, stated as plainly as the two it sits between: a sovereign
// Jewish state that does not hold Jerusalem and has stopped fighting for it.
// Deliberately mutually exclusive with both — `judaeaStands` wants the city,
// `romanAftermath` wants the state gone, and this wants neither.
function judaeaEndures(ctx) {
  const t = ctx.game.tags && ctx.game.tags.JUD;
  if (!alive(ctx, 'JUD') || (t && t.overlord)) return false;
  if (findJudRomWar(ctx.game)) return false;
  if (ctx.helpers.controls(ctx, 'JUD', 'Jerusalem')) return false;
  // SPEC §119: the first road entered is the road. The three predicates read
  // live state, and live state moves — a Judaea that took the city, opened the
  // redemption, then lost it again would otherwise pick up this arc halfway
  // through and play two chapters at once. The marker flag is what makes a road
  // a road rather than a description of this month.
  if (flag(ctx, 'redemptionEra') || flag(ctx, 'freedomEra')) return false;
  return controlledCount(ctx, 'JUD') >= 2;
}

// The Galilean heartland such a state actually holds. Jotapata and Gamala are
// deliberately absent: both were destroyed in the first war and the 132
// bookmark's map does not carry them, so naming them here would only log a
// lookup failure every time this fires.
const GALILEE = ['Sepphoris', 'Tiberias', 'Tarichaea', 'Gischala',
  'Scythopolis', 'Caesarea Philippi'];

function stir(ctx, names, mod) {
  let touched = 0;
  for (const n of names) {
    if (!ctx.helpers.controls(ctx, 'JUD', n)) continue;
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

export const EVENTS_132_GALILEE = [

  {
    id: 'ev2_g_kingdom_in_the_hills',
    title: 'The Kingdom in the Hills',
    desc: 'There is no Betar in this war. There is no triumph either. The legions took '
      + 'the city and the coast and stopped where the hills begin, because the hills '
      + 'cost more than they are worth to a governor who is measured on his accounts, '
      + 'and the men in them stopped coming down for the same reason in reverse. What '
      + 'is left is a fact nobody has written a word of law about: a Jewish state, '
      + 'sovereign, with a treasury and a border and an army, twenty-five miles from a '
      + 'Roman colony built on the ruins of its own capital. Rome will not call it a '
      + 'kingdom, because calling it one concedes the argument. It has to be called '
      + 'something.',
    forTag: 'JUD',
    major: true,
    minYear: 140,
    maxYear: 200,
    trigger: safeTrigger('ev2_g_kingdom_in_the_hills', (ctx) =>
      dateGE(ctx, 140, 1) && judaeaEndures(ctx) && !flag(ctx, 'galileeKingdom')),
    aiOption: 0,
    historical: 'There was no such state: after 135 the Galilee held the schools and the patriarch, and no army at all.',
    options: [
      {
        label: 'Sign what the governor will sign, and keep the hills',
        tooltip: 'A frontier agreement that does not use the word Jerusalem: +1 stability, +15 legitimacy, Rome\'s opinion to +20, and "The Border in the Hills" permanently (+10% income, −0.5 unrest everywhere) — a state that trades has to know where it ends. The claim to the city is not renounced; it is simply not written down.',
        effects: guard('ev2_g_kingdom_in_the_hills:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { stability: 1, legitimacy: 15 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'border_in_the_hills', name: 'The Border in the Hills', months: -1,
            effects: { incomeMult: 1.1, unrestAll: -0.5 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', 'JUD', 20);
          h.doctrine(ctx, 'conquest', -1);
          h.setFlag(ctx, 'galileeKingdom', true);
          h.setFlag(ctx, 'hillsTreaty', true);
          h.chronicle(ctx, 'era', 'The war ends without a Betar and without a triumph: Rome keeps Aelia and the coast, and a sovereign Jewish state keeps the Galilee under a frontier agreement that does not use the word Jerusalem.');
        }),
      },
      {
        label: 'Sign nothing; the city is not Rome\'s to be conceded',
        tooltip: 'No agreement, and the claim stands in the open: +25 legitimacy, +2 zeal, and "The Standing Claim" permanently (+8% morale, +1 unrest everywhere, Rome\'s opinion to −60). No border settlement, so no trade dividend, and the frontier is a place where something can always start again. The answer that keeps faith with the men who died for the city.',
        effects: guard('ev2_g_kingdom_in_the_hills:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 25 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_standing_claim', name: 'The Standing Claim', months: -1,
            effects: { moraleMult: 1.08, unrestAll: 1 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', 'JUD', -60);
          h.doctrine(ctx, 'zeal', 2);
          h.setFlag(ctx, 'galileeKingdom', true);
          h.setFlag(ctx, 'standingClaim', true);
          h.chronicle(ctx, 'era', 'No agreement is signed. Rome holds Aelia; the Jewish state in the hills holds that it holds it wrongly, and says so every year in the same words.');
        }),
      },
    ],
  },

  {
    id: 'ev2_g_prince_and_patriarch',
    title: 'The Prince and the Patriarch',
    desc: 'In the history where there is no state, the Nasi is the whole of the Jewish '
      + 'polity: a patriarch whose authority Rome licenses because a licensed authority '
      + 'is cheaper than a garrison, collecting his own tax, appointing his own judges, '
      + 'and answering for a nation that has no other address. Here there is another '
      + 'address. There is a court in Tiberias with soldiers outside it, and there is a '
      + 'patriarch in Sepphoris with the schools behind him, and the question of which '
      + 'of them is the nation has not come up yet only because nobody has needed to '
      + 'ask. Somebody is about to need to.',
    forTag: 'JUD',
    major: true,
    minYear: 163,
    maxYear: 230,
    trigger: safeTrigger('ev2_g_prince_and_patriarch', (ctx) =>
      dateGE(ctx, 163, 1) && judaeaEndures(ctx) && flag(ctx, 'galileeKingdom')
      && !flag(ctx, 'nasiSettled')),
    aiOption: 0,
    historical: 'The office and the nation were the same thing, because there was nothing else for them to be.',
    options: [
      {
        label: 'One man holds both: the Prince is the Patriarch',
        tooltip: 'The offices are fused, as the Hasmoneans fused crown and altar and were argued about for it ever after. +20 legitimacy, +1 authority, and "The Prince Who Is the Patriarch" permanently (+12% income from the patriarchal tax, −0.5 unrest) — but the sages lose their independent standing (−20 approval), and a bad ruler is now also a bad head of the Law.',
        effects: guard('ev2_g_prince_and_patriarch:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 20 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'prince_and_patriarch', name: 'The Prince Who Is the Patriarch', months: -1,
            effects: { incomeMult: 1.12, unrestAll: -0.5 },
          });
          h.doctrine(ctx, 'authority', 1);
          try { h.factionShift(ctx, 'JUD', 'sages', -20); } catch (e) {}
          h.setFlag(ctx, 'nasiSettled', 'fused');
          h.chronicle(ctx, 'era', 'The Prince of Israel takes the patriarchate into his own hands; one man now answers both for the state and for the Law, and the sages note in writing that this has been tried before.');
        }),
      },
      {
        label: 'Two offices, and let them check each other',
        tooltip: 'The court governs and the patriarch judges, and neither can do the other\'s work. +1 stability, the sages +25 approval, and "The Two Chairs" permanently (−0.75 unrest everywhere, +6% income) — but −1 authority and a permanent −0.05 legitimacy a month, because a state with two heads spends part of every year deciding which one is speaking.',
        effects: guard('ev2_g_prince_and_patriarch:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { stability: 1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_two_chairs', name: 'The Two Chairs', months: -1,
            effects: { unrestAll: -0.75, incomeMult: 1.06, legitimacyAdd: -0.05 },
          });
          h.doctrine(ctx, 'authority', -1);
          try { h.factionShift(ctx, 'JUD', 'sages', 25); } catch (e) {}
          h.setFlag(ctx, 'nasiSettled', 'divided');
          h.chronicle(ctx, 'era', 'The offices are kept apart: the court in Tiberias governs, the patriarch in Sepphoris judges, and the argument between them becomes a permanent feature of the constitution rather than a crisis in it.');
        }),
      },
    ],
  },

  {
    id: 'ev2_g_mishnah_of_a_country',
    title: 'A Law Code for a Country That Has One',
    desc: 'The redaction happens either way — the material is there, the generation that '
      + 'remembers the Temple is dying, and Rabbi Judah\'s court has been arranging it '
      + 'for thirty years. What differs is what it is FOR. In the world without a state '
      + 'the Mishnah is a monument: whole tractates on the order of sacrifices nobody '
      + 'can offer, on tithes for a land nobody administers, on a Sanhedrin that meets '
      + 'nowhere — a law kept perfect against a day, and the keeping is itself the '
      + 'argument. Here the tithes are collected, the courts sit, and the sacrifices '
      + 'are the only part that is still theoretical, because Rome has the mountain. A '
      + 'code that can be enforced is edited differently by men who know it will be.',
    forTag: 'JUD',
    major: true,
    minYear: 200,
    maxYear: 270,
    trigger: safeTrigger('ev2_g_mishnah_of_a_country', (ctx) =>
      dateGE(ctx, 200, 1) && judaeaEndures(ctx) && flag(ctx, 'galileeKingdom')
      && !flag(ctx, 'mishnahRedacted')),
    aiOption: 0,
    historical: 'It was redacted about 200 as the law of a nation that had no state to enforce it, and that is exactly why it outlasted every state that did.',
    options: [
      {
        label: 'Edit it as the law of the land, and let the courts use it',
        tooltip: 'A working code: +2 stability, "The Courts of the Land" permanently (−1 unrest everywhere, +10% income, +15% integration speed) and the state\'s legal reach becomes real. The cost is quiet and permanent — a law that serves a government is a law a government can bend, and the diaspora academies begin keeping their own.',
        effects: guard('ev2_g_mishnah_of_a_country:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { stability: 2, legitimacy: 10 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'courts_of_the_land', name: 'The Courts of the Land', months: -1,
            effects: { unrestAll: -1, incomeMult: 1.1 },
          });
          h.doctrine(ctx, 'authority', 1);
          h.setFlag(ctx, 'mishnahRedacted', 'enforced');
          h.chronicle(ctx, 'era', 'The Mishnah is redacted as the working law of a state that can enforce it; the courts of the Galilee sit on it within a year, and the academies of Babylonia quietly begin keeping a version of their own.');
        }),
      },
      {
        label: 'Edit it whole, including everything that cannot be done',
        tooltip: 'The orders of sacrifice and the tithes of a land not held are kept in full, against the day. +25 legitimacy, +2 zeal, "The Law Kept Whole" permanently (+8% morale, +0.1 legitimacy a month, −0.5 unrest in every Jewish province anywhere on the map) — and no administrative dividend at all. The code stays the nation\'s rather than the government\'s, which is what made it portable.',
        effects: guard('ev2_g_mishnah_of_a_country:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 25 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'law_kept_whole', name: 'The Law Kept Whole', months: -1,
            effects: { moraleMult: 1.08, legitimacyAdd: 0.1, unrestAll: -0.5 },
          });
          h.doctrine(ctx, 'zeal', 1);
          h.setFlag(ctx, 'mishnahRedacted', 'whole');
          h.chronicle(ctx, 'era', 'The Mishnah is redacted whole — the orders of sacrifice and the tithes of a land not held kept in full against the day — and belongs to the nation rather than to the government that could have used it.');
        }),
      },
    ],
  },

  {
    id: 'ev2_g_the_mountain_and_the_toll',
    title: 'The Mountain and the Toll',
    desc: 'Every year on the ninth of Av the Roman authorities in Aelia permit Jews to '
      + 'enter the city and mourn at the wall, and every year they charge for the '
      + 'permit, and every year the money is paid. In the world without a state the '
      + 'humiliation of that transaction is simply borne, because there is nobody to '
      + 'bear it on anyone\'s behalf. Here there is a treasury twenty-five miles away '
      + 'that could pay the whole colony\'s toll out of one season\'s customs, and a '
      + 'court that has to decide, in public, whether buying your own people\'s access '
      + 'to your own holy mountain from the men who took it is statecraft or '
      + 'surrender. Both answers have been argued in the same room, by men who agree '
      + 'about everything else.',
    forTag: 'JUD',
    major: true,
    minYear: 250,
    maxYear: 340,
    trigger: safeTrigger('ev2_g_the_mountain_and_the_toll', (ctx) =>
      dateGE(ctx, 250, 1) && judaeaEndures(ctx) && flag(ctx, 'galileeKingdom')
      && !flag(ctx, 'tollSettled')),
    aiOption: 0,
    historical: 'The permit was bought, individually, by whoever could afford it, for three hundred years.',
    options: [
      {
        label: 'Pay the toll for every Jew who comes, and say why',
        tooltip: 'The state buys the access and prints the reason: −250 treasury and −6% income permanently, but +20 legitimacy, +1 stability, "The Ascents Are Paid For" (−0.75 unrest in every Jewish province anywhere, permanent), and Rome\'s opinion +25 — a customer is a relationship. The mourning becomes a national act performed by a state, which is not nothing.',
        effects: guard('ev2_g_the_mountain_and_the_toll:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: -250, legitimacy: 20, stability: 1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_ascents_paid_for', name: 'The Ascents Are Paid For', months: -1,
            effects: { incomeMult: 0.94, unrestAll: -0.75 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', 'JUD', 25);
          h.setFlag(ctx, 'tollSettled', 'paid');
          h.chronicle(ctx, 'era', 'The state pays the Aelia toll for every Jew who comes to mourn, and publishes the reason; the ninth of Av becomes a national act performed by a government rather than a private grief afforded by whoever can.');
        }),
      },
      {
        label: 'Forbid the payment; nobody buys entry to what is theirs',
        tooltip: 'The court forbids its subjects to purchase the permit. +2 zeal, "Not Bought" permanently (+10% morale, +0.1 legitimacy a month) and Rome\'s opinion −40 — but the mountain goes unvisited by the state\'s own people for generations, which the sages record as a wound (+0.5 unrest in every Jewish province, permanent). The proud answer, at the price pride costs the living.',
        effects: guard('ev2_g_the_mountain_and_the_toll:1', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'JUD', {
            id: 'not_bought', name: 'Not Bought', months: -1,
            effects: { moraleMult: 1.1, legitimacyAdd: 0.1, unrestAll: 0.5 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', 'JUD', -40);
          h.doctrine(ctx, 'zeal', 2);
          h.setFlag(ctx, 'tollSettled', 'refused');
          h.chronicle(ctx, 'era', 'The court forbids the buying of permits to enter Jerusalem; the mountain goes unvisited by the state\'s own people, and the sages record the refusal and the wound in the same sentence.');
        }),
      },
    ],
  },

  {
    id: 'ev2_g_neighbour_not_a_minority',
    title: 'A Neighbour, Not a Minority',
    worldLabel: 'The Christian empire finds a Jewish state on its border',
    desc: 'The empire has become Christian, and it has an apparatus ready for the Jewish '
      + 'question: a body of law about synagogues and slaves and offices and marriage, '
      + 'a theology about why the Temple fell and stays fallen, and a settled practice '
      + 'of legislating for a people who live inside its borders and cannot answer back '
      + 'in any language it has to hear. None of that apparatus works on a state. A '
      + 'state has ambassadors and a frontier and a treasury and, if it comes to it, an '
      + 'army; the Theodosian house has no precedent for a Jewish polity it must '
      + 'negotiate with rather than legislate about, and the men drafting the codes '
      + 'discover that the sentence they want to write does not have a legal subject.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 390, m: 4 },
    world: true,
    major: true,
    when: safeTrigger('ev2_g_neighbour_not_a_minority:when', (ctx) =>
      judaeaEndures(ctx) && flag(ctx, 'galileeKingdom') && alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'There was no state to negotiate with, so the codes legislated, and the sentence had a subject.',
    options: [
      {
        label: 'Treat with it as a power, and legislate only inside the border',
        tooltip: 'Rome writes its Jewish law for its own subjects and treats the Galilee as a foreign court: Rome +8 legitimacy and a working eastern frontier (+5% income), Judaea +15 legitimacy, +1 stability and opinion between them to +40. Every Jewish community inside the empire is now a community with a foreign patron, which changes what can safely be done to it (−0.5 unrest in Jewish provinces the empire holds).',
        effects: guard('ev2_g_neighbour_not_a_minority:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { legitimacy: 8 });
            h.addTagModifier(ctx, 'ROM', {
              id: 'the_eastern_understanding', name: 'The Eastern Understanding', months: -1,
              effects: { incomeMult: 1.05 },
            });
            setOpinion(ctx, 'ROM', 'JUD', 40);
          }
          h.adjust(ctx, 'JUD', { legitimacy: 15, stability: 1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'a_foreign_patron', name: 'A Patron Across the Border', months: -1,
            effects: { unrestAll: -0.5 },
          });
          h.setFlag(ctx, 'treatedAsAPower', true);
          h.chronicle(ctx, 'era', 'The Christian empire treats the Galilee as a foreign court rather than a domestic question; its Jewish subjects acquire, for the first time, a patron with a frontier and a treasury.');
        }),
      },
      {
        label: 'Legislate as though it were not there',
        tooltip: 'The codes are written as if the Galilee did not exist, which is cheaper and reads better at court: Rome +10 legitimacy with its own bishops, but the frontier hardens (Judaea +2 zeal, +10% morale, opinion to −80, and "The Codes" gives every Jewish province the empire holds +1 unrest permanently). A sentence with no legal subject is still a sentence, and it is read aloud on both sides of the border.',
        effects: guard('ev2_g_neighbour_not_a_minority:1', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { legitimacy: 10 });
            h.addTagModifier(ctx, 'ROM', {
              id: 'the_codes', name: 'The Codes', months: -1, effects: { unrestAll: 0.25 },
            });
            setOpinion(ctx, 'ROM', 'JUD', -80);
          }
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_hardened_frontier', name: 'The Hardened Frontier', months: -1,
            effects: { moraleMult: 1.1 },
          });
          h.doctrine(ctx, 'zeal', 2);
          h.setFlag(ctx, 'legislatedAround', true);
          h.chronicle(ctx, 'era', 'The Christian empire legislates about the Jews as though the Jewish state on its frontier were not there; the sentence has no legal subject and is read aloud on both sides of the border.');
        }),
      },
    ],
  },

  {
    id: 'ev2_g_what_the_office_was_for',
    title: 'What the Office Was For',
    worldLabel: 'The patriarchate is a crown, and is not vacated',
    desc: 'In 425 the emperor declines to fill the patriarchate, and the office that '
      + 'had carried the Jewish nation for three centuries simply stops — its tax '
      + 'redirected to the imperial treasury, its courts unlicensed, its authority '
      + 'dispersed into the academies and the communities and, eventually, into a '
      + 'library. That is what happens to an office held at somebody else\'s pleasure. '
      + 'It is not what happens here. Here the office is a crown, or beside one; there '
      + 'is nobody whose pleasure it is held at, and the year passes in the Galilee '
      + 'without anybody noticing that it was supposed to be the end of something. What '
      + 'the empire cannot do is vacate a chair in a country it does not govern.',
    forTag: 'both',
    decider: 'JUD',
    date: { y: 425, m: 5 },
    world: true,
    major: true,
    when: safeTrigger('ev2_g_what_the_office_was_for:when', (ctx) =>
      judaeaEndures(ctx) && flag(ctx, 'galileeKingdom')),
    aiOption: 0,
    historical: 'Theodosius II let the patriarchate lapse on Gamaliel VI\'s death and took its tax; the nation carried on without a head for fifteen hundred years.',
    options: [
      {
        label: 'The chair is filled, as it is filled every generation',
        tooltip: 'The chapter closes with the office intact: +25 legitimacy, +1 stability, and "The Chair Was Never Vacated" permanently (+10% income, −1 unrest in every Jewish province anywhere on the map, +0.1 legitimacy a month). Rome keeps Aelia and the coast; the Galilee keeps the thing the coast was only ever a route to.',
        effects: guard('ev2_g_what_the_office_was_for:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 25, stability: 1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'chair_never_vacated', name: 'The Chair Was Never Vacated', months: -1,
            effects: { incomeMult: 1.1, unrestAll: -1, legitimacyAdd: 0.1 },
          });
          stir(ctx, GALILEE, {
            id: 'the_seat_of_the_nasi', name: 'The Seat of the Nasi', months: -1,
            effects: { taxMult: 1.15, unrest: -0.5 },
          });
          h.setFlag(ctx, 'patriarchateEndures', true);
          h.chronicle(ctx, 'era', 'The year the patriarchate was to have lapsed passes in the Galilee without anyone noticing: the chair is filled, as it is filled every generation, by a state that holds it at nobody\'s pleasure.');
        }),
      },
    ],
  },
];
