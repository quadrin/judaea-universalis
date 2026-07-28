// Judaea Universalis — Beit Kosiba: what the house becomes, 150–425 CE.
// Content package. Zero imports; concatenated onto EVENTS_132 by the registry.
//
// The redemption road wins a war and then inherits a problem the war was not
// about. Shimon ben Kosiba never named a successor. What survives of him is a
// signature — Shimon ben Kosiba, Nasi Yisrael — on leases of state land at Ein
// Gedi, and on letters threatening to put his own commanders in irons, and on
// coins that carry a second name beside his: Eleazar the Priest. Nowhere in
// any of it is there a word about what happens after him. In the history that
// happened the omission cost nothing, because there was no after. Here there
// is, and the omission is the chapter's largest unexamined liability: a state
// founded on one man's authority, with no rule for transferring it, arriving
// at the year that man dies.
//
// FOUR CARDS, and the rest of the chapter reads off what they decided.
//
// The first does not fork. It puts the question on the table and lays out the
// four documents that are actually in the archive — the Hasmonean precedent, a
// marriage contract, the two-named coinage, and Ezekiel 44–46 — because the
// house does not choose in the abstract. It chooses under pressure from
// whoever is strongest in the room on the day, which is why the accession is a
// separate card and why its answers are gated on the state rather than listed
// and priced.
//
// THE FOUR ANSWERS. Each is a constitution, and each has a documented failure
// mode attached to it, which is the argument for offering them rather than
// inventing a fifth:
//
//   THE CROWN. The Hasmoneans waited sixty years of de facto rule before
//   Aristobulus put on the diadem. A house that has just won can do it in one
//   generation and skip the pretence — from a worse starting position, because
//   the Hasmoneans could at least claim Joarib and Kosiba cannot claim
//   anything. The sages will say so in every generation, in writing, and the
//   writing is what survives.
//
//   THE MARRIAGE. Herod's move exactly: marry the pedigree you do not have.
//   The line is kept in Babylonia, so it needs the east to be reachable, and
//   the payoff is not the marriage but the grandson — which means a generation
//   of nothing, and a permanent claim on the succession held by whoever holds
//   the Exilarchate. Herod's version of this ended with him killing his wife
//   and then her sons.
//
//   THE TWO HOUSES. The coins said Shimon and Eleazar. Make it hereditary on
//   both sides and it is the arrangement the Hasmoneans collapsed into one
//   office and spent a century paying for — run in reverse, deliberately,
//   which nobody has tried.
//
//   THE PRINCE OF EZEKIEL. Take the founder's own title and give it a
//   constitution. Chapters 44 to 46 describe a nasi who is emphatically not a
//   king: he brings his offerings like anyone else, he has no priestly
//   function, and 46:16–18 lets him pass his inheritance to his sons while
//   forbidding him to take the people's land. It is a hereditary office
//   engineered not to be a monarchy, and it walks around the Davidic objection
//   entirely, because Ezekiel's prince was never anybody's idea of David's
//   heir.
//
//   There is a barb in it. The founder leased the land of Israel in his own
//   name, as Nasi, and the leases are in the archive. That is arguably the
//   precise thing 46:18 forbids. So the option carries a second card nobody
//   enjoys: regularise the founder's practice as a special case, or stop and
//   tell the treasury to find the money somewhere else.
//
// THEN THE MEMORY. A victory inverts it. Akiva stops being the sage who erred
// and becomes the prophet who saw; Yohanan ben Torta's line about grass
// growing from Akiva's cheeks becomes the tradition's embarrassment rather
// than its vindication. And a young sage has compiled every recorded doubt —
// the finger-cutting test, the objection that the founder was making Israel
// blemished, the death of Eleazar of Modi'in on a suspicion nobody ever
// substantiated — into one volume, and asked whether it should be kept.
//
// AND THEN THE BILL. The pun was always there and it is one letter: Bar
// Kokhba, son of a star; Bar Koziba, son of a lie. It was Rome's joke, then
// the sages', and for a century it has been nobody's, because the man won. On
// the first serious defeat after the founding generation is dead it comes
// back, and the constitution is what answers it — or does not. A crowned house
// has nothing but force. A married-in house points at the pedigree. Two houses
// have a priest to say the offerings are still going up. The prince of Ezekiel
// has the best answer available and the most humiliating one: he was never the
// redemption, he was a magistrate, and magistrates lose battles.
//
// TRIGGERS. The accession is fired by the card before it rather than scheduled
// — a succession is not a date. The last card has no year at all beyond its
// window: it waits for a defeat, and if the state never loses one it never
// fires, which is the correct behaviour and is why it is not dated.
//
// Source spine: the Bar Kokhba letters (Yadin, Cave of Letters) for the
// signature, the Ein Gedi leases and the irons; Meshorer for the two-named
// coinage; y.Taanit 4:8 (68d) for Akiva, Yohanan ben Torta and the fingers;
// Ezekiel 44–46; Josephus, Ant. XIII.301 for Aristobulus and the diadem, XV
// for Mariamne.

const _warned = new Set();
function warnOnce(k, e) { if (_warned.has(k)) return; _warned.add(k); console.warn('[events_132ce_kosiba] ' + k, e || ''); }
function guard(k, fn) { return function (ctx) { try { fn(ctx); } catch (e) { warnOnce('effects:' + k, e); } }; }
function safeTrigger(k, fn) { return function (ctx) { try { return !!fn(ctx); } catch (e) { warnOnce('trigger:' + k, e); return false; } }; }
function safeWhen(k, fn) { return function (ctx) { try { return !!fn(ctx); } catch (e) { warnOnce('when:' + k, e); return false; } }; }

function alive(ctx, tag) { const t = ctx.game.tags && ctx.game.tags[who(ctx, tag)]; return !!(t && t.alive !== false); }
function flag(ctx, k) { return !!(ctx.game.flags && ctx.game.flags[k]); }
function holds(ctx, tag, name) {
  try {
    const held = who(ctx, tag);
    const p = ctx.prov(name);
    return !!p && !p.impassable && p.owner === held && p.controller === held;
  } catch (e) { warnOnce('holds', e); return false; }
}

// The letters this court answers to NOW (SPEC §135). A realm that has taken a
// greater crown files its provinces, armies and wars under the new tag, while
// this chapter was written against the old one; the sim keeps the forwarding
// address and hands it back through ctx.helpers. Defensive about `helpers`
// because the content packages are also read cold, with no game to resolve
// against.
function who(ctx, tag) {
  return (ctx && ctx.helpers && ctx.helpers.livingTag) ? ctx.helpers.livingTag(ctx, tag) : tag;
}
function ruler(ctx) { const t = ctx.game.tags && ctx.game.tags[who(ctx, 'JUD')]; return (t && t.ruler) || null; }

// The redemption held: sovereign, in Jerusalem, on the road §118 opened. The
// same predicate the endure package states, restated locally because this
// package imports nothing.
function redeemed(ctx) {
  if (!alive(ctx, 'JUD')) return false;
  const t = ctx.game.tags.JUD;
  return !(t && t.overlord) && holds(ctx, 'JUD', 'Jerusalem') && flag(ctx, 'redemptionEra');
}

// Is the man who signed the leases still the man on the seat? The founder is
// the only ruler this state has ever had and the engine ages him like any
// other; when he dies the succession machinery installs somebody whose name is
// not his, which is the cleanest signal available that the question is live.
function founderGone(ctx) {
  const r = ruler(ctx);
  return !r || String(r.name || '').indexOf('Kosiba') < 0;
}
function founderOld(ctx) {
  const r = ruler(ctx);
  return !!r && Number(r.age || 0) >= 62;
}

// A court reading. Factions convene only for a human player (sim/factions),
// so an AI-run Judaea reads every party as absent and is left with the answers
// that need no party behind them — which is right: the gated roads are the
// ones somebody in the room has to be strong enough to force.
function factionAt(ctx, id, min) {
  return ctx.helpers.factionAtLeast(ctx, 'JUD', id, min);
}

// The line of Jehoiachin is kept in Babylonia, which is in another empire.
// Reachable means either the realm has got there, or there is a road and
// nobody is shooting along it.
function eastReachable(ctx) {
  if (holds(ctx, 'JUD', 'Nehardea') || holds(ctx, 'JUD', 'Babylon') || holds(ctx, 'JUD', 'Nisibis')) return true;
  const t = ctx.game.tags && ctx.game.tags.JUD;
  if (!alive(ctx, 'PAR') || !t) return false;
  if ((t.atWarWith || []).indexOf('PAR') >= 0) return false;
  const par = ctx.game.tags.PAR;
  return Number((par.opinion && par.opinion.JUD) || 0) > -25;
}

// A frontier has broken: somebody else is standing on ground this state owns,
// or the war has gone on long enough that everyone can feel it.
function seriousDefeat(ctx) {
  const g = ctx.game;
  const t = g.tags && g.tags.JUD;
  if (!t) return false;
  if (Number(t.warExhaustion || 0) >= 8) return true;
  let lost = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== 'JUD') continue;
    if (p.controller && p.controller !== 'JUD') lost++;
  }
  return lost >= 2;
}

// Which constitution the house took. Stored once by name under
// `constitutions['132ce']` (SPEC §130) and read from there; the four booleans
// are kept beside it because the path tree and the older terminals read flags,
// and a road marker that stopped being written would delete a road.
const ERA = '132ce';
function constitution(ctx) {
  const stored = ctx.helpers.constitutionOf(ctx, ERA);
  if (stored) return stored;
  // A campaign saved before the store existed still knows what it chose.
  if (flag(ctx, 'kosibaNasiConstitution')) return 'nasi';
  if (flag(ctx, 'kosibaTwoHouses')) return 'twoHouses';
  if (flag(ctx, 'kosibaMarriedDavid')) return 'david';
  if (flag(ctx, 'kosibaCrowned')) return 'crown';
  return null;
}
// The store (SPEC §130). The road MARKER is written literally at each call
// site and not from in here: smoke83 reads content packages as text to prove
// every road on the path tree is still set by a live card, and a marker
// written through a helper is invisible to it.
function adopt(ctx, name) {
  const h = ctx.helpers;
  h.setConstitution(ctx, ERA, name);
  h.setFlag(ctx, 'beitKosibaSettled', true);
}

export const EVENTS_132_KOSIBA = [

  // ── I. The question opens ───────────────────────────────────────────────

  {
    id: 'ev_bk_the_prince_is_mortal',
    title: 'The Prince Is Mortal',
    desc: 'The archive has been searched twice because nobody believed the answer the '
      + 'first time. There is no instrument of succession. There are leases of state land '
      + 'at Ein Gedi in his own hand and his own name, and letters to his commanders '
      + 'promising to put them in irons, and requisitions for the Four Species, and a '
      + 'great deal about wheat — and not one word, in twenty years of a man who wrote '
      + 'about everything, on what is to happen after him. Men who were in the caves are '
      + 'in this room. So is a clerk, who has laid four documents on the table and stepped '
      + 'back without saying anything: the Hasmonean settlement, in which a priestly house '
      + 'took a crown it had no title to; a marriage contract; a coin with two names on '
      + 'it; and a scroll of Ezekiel, open at the forty-fourth chapter.',
    forTag: 'JUD',
    major: true,
    minYear: 150,
    maxYear: 178,
    trigger: safeTrigger('ev_bk_the_prince_is_mortal', (ctx) => {
      if (!redeemed(ctx) || flag(ctx, 'kosibaSuccessionOpen')) return false;
      return founderGone(ctx) || founderOld(ctx);
    }),
    aiOption: 0,
    historical: 'He signed himself Shimon ben Kosiba, Nasi Yisrael, and left no rule of succession — the letters and leases from the Judaean Desert caves are full of his administration and silent on his heir.',
    // This card does not fork the constitution — the four roads are the next
    // card's business. What it decides is who is standing in the room when
    // they are chosen, which is the whole mechanism: the house does not pick
    // in the abstract, it picks under whoever is strongest on the day.
    options: [
      {
        label: 'Read all four aloud, and adjourn until the house can answer',
        tooltip: 'The question put formally, in front of everyone with a claim to be consulted. +1 stability, Sages +15 and the villages +10 for being asked at all — and the schools are now strong enough in the room to force answers a soldier would not have offered.',
        effects: guard('ev_bk_mortal:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { stability: 1 });
          h.factionShift(ctx, 'JUD', 'sages', 15);
          h.factionShift(ctx, 'JUD', 'villages', 10);
          h.setFlag(ctx, 'kosibaSuccessionOpen', true);
          h.setFlag(ctx, 'successionInCouncil', true);
          h.chronicle(ctx, 'ruler', 'The council reads out the Hasmonean settlement, a marriage contract, a two-named coin and the forty-fourth of Ezekiel, and adjourns without deciding. The clerk files all four where they can be found again quickly.');
          // A succession is not a date. The accession follows the question
          // rather than the calendar, and it follows it now.
          h.fireEvent(ctx, 'ev_bk_the_accession');
        }),
      },
      {
        label: 'Not while he is alive. The captains will settle it in the morning',
        tooltip: 'The question is not put; it is simply answered, by the men with the swords, in the antechamber. +20 to the captains and −25 to the sages — and the roads that need a party behind them may not be open when the morning comes. Faster, quieter, and it narrows the constitution to whatever a soldier can see the point of.',
        effects: guard('ev_bk_mortal:1', (ctx) => {
          const h = ctx.helpers;
          h.factionShift(ctx, 'JUD', 'captains', 20);
          h.factionShift(ctx, 'JUD', 'sages', -25);
          h.doctrine(ctx, 'authority', 1);
          h.setFlag(ctx, 'kosibaSuccessionOpen', true);
          h.setFlag(ctx, 'successionInTheAntechamber', true);
          h.chronicle(ctx, 'ruler', 'The four documents go back in the chest unread. The men who were in the caves settle it among themselves before dawn, which is how these things were always going to be settled and nobody says so.');
          h.fireEvent(ctx, 'ev_bk_the_accession');
        }),
      },
    ],
  },

  // ── II. The accession ───────────────────────────────────────────────────
  //
  // No trigger and no date: this card is fired by the one above it, which is
  // what "immediately after" means in an engine that schedules by month. Its
  // answers are gated with `when`, so a house without the east cannot marry
  // into David and a house whose sages are nobody cannot adopt a constitution
  // out of a prophet — the roads that need a party behind them are only open
  // when that party is strong enough to force them.

  {
    id: 'ev_bk_the_accession',
    title: 'The Accession',
    desc: 'They reconvene in the morning, and the composition of the room has already '
      + 'decided most of it. The captains want the thing settled in one sentence and do '
      + 'not much mind which sentence. The priests have been up all night with the '
      + 'coinage. The sages have brought the scroll back and have marked it. Everyone '
      + 'present understands that whatever is said today becomes the constitution of a '
      + 'state that does not have one, that it will be argued about for as long as the '
      + 'state lasts, and that the arguing will be done by people who were not in the '
      + 'room and will assume the decision was principled.',
    forTag: 'JUD',
    major: true,
    aiOption: 0,
    historical: 'The Hasmoneans took eighty years to reach the diadem and the Herodians married for the pedigree they lacked; the office of Nasi outlasted both, and was abolished by a Roman rescript in 425.',
    options: [
      {
        label: 'Take the crown. The house that won the war will wear it',
        tooltip: 'Always available, and the simplest: king in one generation rather than the Hasmoneans\' sixty years of pretence. +25 legitimacy, +3 authority, +12% income and −1 unrest everywhere from an undivided succession. And it cannot be defended: the house has no priestly descent and no Davidic descent, the sages will say so in writing in every generation, and the writing is what survives. Sages −40, permanent.',
        effects: guard('ev_bk_accession:crown', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 25, stability: 1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_kosiba_crown', name: 'The Crown of Beit Kosiba', months: -1,
            effects: { incomeMult: 1.12, unrestAll: -1 },
          });
          h.factionShift(ctx, 'JUD', 'sages', -40);
          h.factionShift(ctx, 'JUD', 'captains', 30);
          h.doctrine(ctx, 'authority', 3);
          adopt(ctx, 'crown');
          h.setFlag(ctx, 'kosibaCrowned', true);
          h.chronicle(ctx, 'era', 'The house of Kosiba takes the diadem. It is done in one generation where the Hasmoneans took three, and the objection is the same objection, made earlier and by better lawyers.');
        }),
      },
      {
        label: 'Marry into David. Send to Babylonia for the line of Jehoiachin',
        when: safeWhen('accession:david', (ctx) => eastReachable(ctx)),
        tooltip: 'Herod\'s answer, and it needs the east open, because the line is kept in Babylonia. The payoff is not the marriage — it is the grandson, so this is a generation of nothing followed by an unassailable claim: +15 legitimacy now, +0.25 a month thereafter, permanently. Whoever holds the Exilarchate now holds a standing claim on this succession. Herod\'s version of this ended with him killing his wife and, later, her sons.',
        effects: guard('ev_bk_accession:david', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 15 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_davidic_marriage', name: 'The Davidic Marriage', months: -1,
            effects: { legitimacyAdd: 0.25, unrestAll: -1, incomeMult: 0.96 },
          });
          h.factionShift(ctx, 'JUD', 'sages', 20);
          h.factionShift(ctx, 'JUD', 'captains', -15);
          h.doctrine(ctx, 'authority', 1);
          adopt(ctx, 'david');
          h.setFlag(ctx, 'kosibaMarriedDavid', true);
          h.chronicle(ctx, 'era', 'The house sends east for a bride of the line of Jehoiachin. The contract is read out in Jerusalem and the point of it will not be born for twenty years.');
        }),
      },
      {
        label: 'Two houses, as the coinage said: Shimon and Eleazar, both hereditary',
        // The 132 court has no priestly party — captains, sages, villages. What
        // it has instead is the house package's record of who was given the
        // Temple: a state that settled the courses has a priesthood organised
        // enough to be made hereditary, and one that never did has not.
        when: safeWhen('accession:two', (ctx) => flag(ctx, 'coursesChoose') || flag(ctx, 'priesthoodSettled') || factionAt(ctx, 'sages', 55)),
        tooltip: 'The arrangement the coins implied, made permanent — and it is the Hasmonean collapse run in reverse, which nobody has tried. +3 stability, +20 legitimacy, Sages +25, −8% income for the second household. Two hereditary offices means two successions to go wrong instead of one, and the state has no arbiter above either of them.',
        effects: guard('ev_bk_accession:two', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 20, stability: 3 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_two_houses', name: 'The Two Houses', months: -1,
            effects: { incomeMult: 0.92, legitimacyAdd: 0.15, unrestAll: -1 },
          });
          h.factionShift(ctx, 'JUD', 'sages', 25);
          adopt(ctx, 'twoHouses');
          h.setFlag(ctx, 'kosibaTwoHouses', true);
          h.chronicle(ctx, 'era', 'Prince and priest are both made hereditary, as the coinage always implied. The Hasmoneans spent a century merging these two offices; this state has just spent a morning separating them.');
        }),
      },
      {
        label: 'The prince of Ezekiel: keep the title, and give it a constitution',
        when: safeWhen('accession:nasi', (ctx) => factionAt(ctx, 'sages', 60) || flag(ctx, 'mishnahWritten')),
        tooltip: 'Chapters 44 to 46: a nasi who brings his offerings like any man, holds no priestly office, and — 46:16–18 — may leave his inheritance to his sons but may not take the people\'s land. A hereditary office engineered not to be a monarchy, which walks around the Davidic objection entirely because Ezekiel\'s prince was never David\'s heir. +30 legitimacy, Sages +40, −2 authority, −1 unrest everywhere, permanent. And it binds this house in writing, forever, in ways the other three do not.',
        effects: guard('ev_bk_accession:nasi', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 30, stability: 2 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_prince_of_ezekiel', name: 'The Prince of Ezekiel', months: -1,
            effects: { legitimacyAdd: 0.2, unrestAll: -1 },
          });
          h.factionShift(ctx, 'JUD', 'sages', 40);
          h.factionShift(ctx, 'JUD', 'captains', -20);
          h.doctrine(ctx, 'authority', -2);
          adopt(ctx, 'nasi');
          h.setFlag(ctx, 'kosibaNasiConstitution', true);
          h.chronicle(ctx, 'era', 'The house keeps the founder\'s title and accepts the prophet\'s terms for it. It is the first Jewish constitution since the elders, and it was written by somebody who never expected it to be used.');
          // The barb: the founder's own leases are arguably the thing 46:18
          // forbids, and the treasury has been living on them.
          h.fireEvent(ctx, 'ev_bk_the_land_of_the_prince');
        }),
      },
    ],
  },

  {
    id: 'ev_bk_the_land_of_the_prince',
    title: 'The Land of the Prince',
    desc: 'The scroll was barely rolled up before the treasury raised it, in the flat '
      + 'voice of men who have already done the arithmetic. Forty-six, verse eighteen: the '
      + 'prince shall not take of the people\'s inheritance, thrusting them out of their '
      + 'possession. The founder leased the land of Israel in his own name, as Nasi, and '
      + 'the leases are in the room next door, and the rents from them are a material part '
      + 'of what the state runs on. Nobody wants to say out loud that the man in whose name '
      + 'the constitution was just adopted spent twenty years doing the one thing it '
      + 'forbids. The clerk who found it has gone rather quiet.',
    forTag: 'JUD',
    major: true,
    aiOption: 0,
    historical: 'The Ein Gedi documents show Shimon ben Kosiba leasing state land in his own name as Nasi. Whether that was administration or the thing Ezekiel forbids is a question the sources never had to answer.',
    options: [
      {
        label: 'Regularise it. The founder\'s hand is a special case and always was',
        tooltip: 'The rents keep coming and the constitution acquires an exception in its first year, named after the man it is about. No income lost, +1 stability — and −12 legitimacy and Sages −25, because everyone can see what has just been done and the document is short enough that everyone has read it.',
        effects: guard('ev_bk_land:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: -12, stability: 1 });
          h.factionShift(ctx, 'JUD', 'sages', -25);
          h.setFlag(ctx, 'landRegularized', true);
          h.chronicle(ctx, 'ruler', 'The leases stand, under an exception drafted for the purpose. It is the first gloss on the new constitution and it is a year old.');
        }),
      },
      {
        label: 'Stop. Let the treasury find the money somewhere else',
        tooltip: 'The verse applied to the man it embarrasses. −15% income permanently and the treasury told to go and look, +18 legitimacy, Sages +30, +1 zeal — and a constitution that cost something in its first year is a constitution people believe in.',
        effects: guard('ev_bk_land:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 18 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_leases_surrendered', name: 'The Leases Surrendered', months: -1,
            effects: { incomeMult: 0.85, legitimacyAdd: 0.1 },
          });
          h.factionShift(ctx, 'JUD', 'sages', 30);
          h.doctrine(ctx, 'zeal', 1);
          h.setFlag(ctx, 'landRenounced', true);
          h.chronicle(ctx, 'era', 'The state gives up the prince\'s leases in the first year of the constitution that forbids them. The treasury is told to find the money elsewhere, and does, eventually, and complains for a generation.');
        }),
      },
    ],
  },

  // ── II(b). What the marriage was actually for ───────────────────────────
  //
  // The accession said it plainly: the payoff is not the marriage, it is the
  // grandson. Without this card that was a promise the road never kept — the
  // option set a flag, added a modifier, and got a line in a chronicle three
  // centuries later, and the Exilarchate's "standing claim on this succession"
  // existed nowhere but in the tooltip (SPEC §134).

  {
    id: 'ev_bk_the_grandson',
    title: 'The Grandson of Jehoiachin',
    desc: 'The boy the marriage was for is thirty-one and has been running the '
      + 'treasury\'s eastern correspondence for six years, which everyone agrees he does '
      + 'well and nobody thinks is the point. His mother was of the line of Jehoiachin '
      + 'and the genealogy has been copied four times since she came, each copy attested '
      + 'by men from Nehardea who did not travel eight hundred miles to watch it be '
      + 'filed. There is a delegation in the city now. They are courteous, they ask for '
      + 'nothing in writing, and they have mentioned twice in passing that the line of '
      + 'David has waited six hundred years and can be patient a little longer, which is '
      + 'the most threatening sentence anyone has said in this building in a decade. '
      + 'Somebody has also left a copy of Josephus open at the fifteenth book, where '
      + 'Herod does the arithmetic on his wife and reaches the answer he reaches.',
    forTag: 'JUD',
    major: true,
    minYear: 176,
    maxYear: 245,
    trigger: safeTrigger('ev_bk_the_grandson', (ctx) => {
      if (!redeemed(ctx) || flag(ctx, 'grandsonAnswered')) return false;
      if (constitution(ctx) !== 'david') return false;
      return founderGone(ctx);
    }),
    aiOption: 1,
    historical: 'Herod married Mariamne the Hasmonean for the pedigree he lacked, executed her in 29 BCE and her two sons by him in 7 BCE. The Exilarchs of Babylonia went on claiming descent from Jehoiachin for another eight hundred years.',
    options: [
      {
        label: 'Let the succession pass to him. The house has the pedigree now',
        tooltip: 'What the marriage was arranged for, collected: +35 legitimacy and +0.3 a month permanently, and no rival can ever again say this house has no title to what it holds. The price is the one the Babylonians came to name — the Exilarchate has a recognised interest in the succession of Israel from this year, and will send a delegation to every one of them. Sages +25, −1 authority.',
        effects: guard('ev_bk_grandson:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 35, stability: 1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_line_of_jehoiachin', name: 'The Line of Jehoiachin', months: -1,
            effects: { legitimacyAdd: 0.3, unrestAll: -1 },
          });
          h.factionShift(ctx, 'JUD', 'sages', 25);
          h.doctrine(ctx, 'authority', -1);
          h.setFlag(ctx, 'grandsonAnswered', true);
          h.setFlag(ctx, 'davidicSuccession', true);
          // The shared title (SPEC §138): this chapter asks the question in its
          // own voice, and its answer is the same answer.
          h.setFlag(ctx, 'davidicThrone', true);
          h.setFlag(ctx, 'exilarchateHasAClaim', true);
          h.chronicle(ctx, 'era', 'The succession passes to the son of the Babylonian marriage, and the house of Kosiba becomes, in law and in the genealogies, the house of David. The delegation from Nehardea stays for the ceremony and leaves with a copy of the record.');
        }),
      },
      {
        label: 'He is a good treasury official. The crown stays where it is',
        tooltip: 'The pedigree kept as an ornament rather than a title: no legitimacy gained, +2 stability from a succession nobody has to argue about, and the eastern communities draw the obvious conclusion about what their daughter was for. −25 opinion with Parthia, Sages −20, and the genealogy goes back in the chest.',
        effects: guard('ev_bk_grandson:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { stability: 2 });
          h.factionShift(ctx, 'JUD', 'sages', -20);
          for (const tag of ['PAR', 'SAS']) {
            if (!alive(ctx, tag)) continue;
            const t = ctx.game.tags[tag];
            if (t) { t.opinion = t.opinion || {}; t.opinion.JUD = Math.max(-200, Number(t.opinion.JUD || 0) - 25); }
          }
          h.setFlag(ctx, 'grandsonAnswered', true);
          h.setFlag(ctx, 'pedigreeAsOrnament', true);
          h.chronicle(ctx, 'ruler', 'The crown stays in the senior line and the grandson keeps the eastern correspondence, which he continues to do well. Nehardea sends no delegation to the next accession.');
        }),
      },
      {
        // Herod's answer, and it needs a court with nobody left to object.
        label: 'Herod\'s arithmetic',
        when: safeWhen('grandson:herod', (ctx) => !factionAt(ctx, 'sages', 45)),
        tooltip: 'The book was left open at the fifteenth chapter for a reason and the reason is that it worked: Herod died in his bed, on his throne, thirty-three years a king. The claimants are removed and the claim with them. +2 authority, no succession dispute in this or any following reign — and −40 legitimacy, Sages −50, +3 unrest everywhere permanently, and a house that has now done to its own the thing the Hasmoneans were destroyed for.',
        effects: guard('ev_bk_grandson:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: -40, stability: -1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'herods_arithmetic', name: 'Herod\'s Arithmetic', months: -1,
            effects: { unrestAll: 3, legitimacyAdd: -0.1 },
          });
          h.factionShift(ctx, 'JUD', 'sages', -50);
          h.doctrine(ctx, 'authority', 2);
          for (const tag of ['PAR', 'SAS']) {
            if (!alive(ctx, tag)) continue;
            const t = ctx.game.tags[tag];
            if (t) { t.opinion = t.opinion || {}; t.opinion.JUD = Math.max(-200, Number(t.opinion.JUD || 0) - 70); }
          }
          h.setFlag(ctx, 'grandsonAnswered', true);
          h.setFlag(ctx, 'herodsArithmetic', true);
          h.chronicle(ctx, 'era', 'The claimants are removed, quietly and completely, and the question of the succession does not arise again in this reign. The delegation from Nehardea is not received, and the copies of the genealogy that were made in Babylonia are in Babylonia.');
        }),
      },
    ],
  },

  // ── III. The memory ─────────────────────────────────────────────────────

  {
    id: 'ev_bk_grass_on_akivas_cheeks',
    title: 'The Grass on Akiva\'s Cheeks',
    desc: 'Victory has inverted the whole record and the academies have only now noticed '
      + 'how completely. Akiva is no longer the greatest sage of his generation making the '
      + 'greatest error of his life; he is the one who saw it. Yohanan ben Torta, who told '
      + 'him grass would grow from his cheeks before the son of David came, is no longer '
      + 'the voice of sober judgement — he is a man who was wrong in public and got it '
      + 'written down. And a young sage from the Galilee has spent four years collecting '
      + 'every recorded doubt into one volume: the finger-cutting test, the objection that '
      + 'the founder was making Israel blemished, the prayer that God should neither help '
      + 'him nor hinder him, and the death of Eleazar of Modi\'in on a suspicion nobody '
      + 'ever substantiated. He has brought it to the court himself, unasked, and put the '
      + 'question the only honest way: does this survive, or not?',
    forTag: 'JUD',
    major: true,
    minYear: 180,
    maxYear: 225,
    trigger: safeTrigger('ev_bk_grass', (ctx) => {
      if (!redeemed(ctx) || !flag(ctx, 'beitKosibaSettled') || flag(ctx, 'akivaAnswered')) return false;
      return true;
    }),
    aiOption: 1,
    historical: 'y.Taanit 4:8 preserves all of it — Akiva reading Numbers 24 as the star, Yohanan ben Torta\'s reply about the grass, the fingers, and Betar. The tradition kept the doubts because the doubts turned out to be right.',
    options: [
      {
        label: 'It does not survive. Collect the copies',
        tooltip: 'A clean founding: +20 legitimacy and +2 stability, and no rival will ever be able to quote the tradition against this house because the tradition will not contain it. The cost is not paid by the crown: the academies have learned that their records are negotiable, and they are the institution this civilisation keeps everything in. Sages −45, −2 zeal.',
        effects: guard('ev_bk_grass:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 20, stability: 2 });
          h.factionShift(ctx, 'JUD', 'sages', -45);
          h.doctrine(ctx, 'zeal', -2);
          h.doctrine(ctx, 'authority', 2);
          h.setFlag(ctx, 'akivaAnswered', true);
          h.setFlag(ctx, 'doubtSuppressed', true);
          h.chronicle(ctx, 'era', 'The volume is collected and not returned. The academies note the fact in no document at all, which is the first time they have ever handled something that way.');
        }),
      },
      {
        label: 'It survives. Shelve it with everything else',
        tooltip: 'An honest tradition and a permanent liability: +25 Sages, +1 zeal, no legitimacy gained — and every rival, pretender and Roman polemicist for three hundred years has a Jewish book to quote from. +1 unrest everywhere, permanently.',
        effects: guard('ev_bk_grass:1', (ctx) => {
          const h = ctx.helpers;
          h.factionShift(ctx, 'JUD', 'sages', 25);
          h.doctrine(ctx, 'zeal', 1);
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_doubts_preserved', name: 'The Doubts, Preserved', months: -1,
            effects: { unrestAll: 1, legitimacyAdd: 0.05 },
          });
          h.setFlag(ctx, 'akivaAnswered', true);
          h.setFlag(ctx, 'doubtPreserved', true);
          h.chronicle(ctx, 'ruler', 'The volume goes on the shelf with everything else. Nobody pretends this is costless; the argument for it is that the alternative is worse and harder to undo.');
        }),
      },
      {
        label: 'Canonise the doubt. Read it at the founding every year',
        tooltip: 'The strange one. The dissent is made part of the founding on the explicit grounds that a redeemer who cannot be criticised is an idol — which is a claim about God, made by a state, about its own founder. −20 legitimacy permanently and no way to get it back. Sages +50, +2 zeal, −1 authority, and a state that has said this out loud can survive being told it was wrong, which none of the other answers can.',
        effects: guard('ev_bk_grass:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: -20 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_canonised_doubt', name: 'The Canonised Doubt', months: -1,
            effects: { unrestAll: -1, legitimacyAdd: -0.05 },
          });
          h.factionShift(ctx, 'JUD', 'sages', 50);
          h.doctrine(ctx, 'zeal', 2);
          h.doctrine(ctx, 'authority', -1);
          h.setFlag(ctx, 'akivaAnswered', true);
          h.setFlag(ctx, 'doubtCanonized', true);
          h.chronicle(ctx, 'era', 'The objections are read out at the founding festival, beside the account of the victory, by decree. A redeemer who cannot be criticised is an idol; the state has now said so about its own founder, annually, in public.');
        }),
      },
    ],
  },

  // ── IV. The bill ────────────────────────────────────────────────────────

  {
    id: 'ev_bk_bar_kokhba_or_bar_koziba',
    title: 'Bar Kokhba or Bar Koziba',
    desc: 'The pun was always there. One letter: son of a star, son of a lie. It was '
      + 'Rome\'s joke first and then the sages\' and for a hundred years it has been '
      + 'nobody\'s, because the man won and jokes about winners are not funny. A frontier '
      + 'has broken. There is a column somewhere it should not be, the couriers are '
      + 'arriving faster than the council can read them, and a preacher in the Galilee has '
      + 'begun using the other spelling in public, at volume, to crowds — and is not being '
      + 'arrested nearly fast enough, because the men who would have to arrest him are '
      + 'themselves waiting to hear what the answer is.',
    forTag: 'JUD',
    major: true,
    minYear: 176,
    maxYear: 425,
    trigger: safeTrigger('ev_bk_koziba', (ctx) => {
      if (!redeemed(ctx) || !flag(ctx, 'beitKosibaSettled') || flag(ctx, 'kozibaAnswered')) return false;
      if (!founderGone(ctx)) return false;
      return seriousDefeat(ctx);
    }),
    aiOption: 0,
    historical: 'The rabbinic sources spell him Bar Koziba almost without exception. The star reading is Akiva\'s, and it is preserved chiefly in order to record that it was wrong.',
    options: [
      {
        label: 'Say nothing. A state does not answer a pun',
        tooltip: 'The dignified answer, and it is a bet on the constitution rather than a use of it: no legitimacy spent, no proclamation, nothing for anyone to quote back. A house whose founding can be stated in one sentence survives the silence and is steadier for it. A house whose founding cannot will find that the only sentence in circulation is the preacher\'s.',
        effects: guard('ev_bk_koziba:silence', (ctx) => {
          const h = ctx.helpers;
          const kind = constitution(ctx);
          h.setFlag(ctx, 'kozibaAnswered', true);
          h.setFlag(ctx, 'kozibaMetWithSilence', true);
          if (kind === 'nasi' || kind === 'twoHouses') {
            h.adjust(ctx, 'JUD', { stability: 2, legitimacy: 5 });
            h.addTagModifier(ctx, 'JUD', {
              id: 'nothing_to_answer', name: 'Nothing to Answer', months: 180,
              effects: { unrestAll: -1, legitimacyAdd: 0.05 },
            });
            h.chronicle(ctx, 'era', 'The court says nothing whatever, on the grounds that there is nothing to say: the constitution is a document, it is in the archive, and anyone may read it. The preacher runs out of audience before the season does.');
          } else {
            h.adjust(ctx, 'JUD', { legitimacy: -30, stability: -2 });
            h.addTagModifier(ctx, 'JUD', {
              id: 'the_only_sentence', name: 'The Only Sentence in Circulation', months: 240,
              effects: { unrestAll: 3, legitimacyAdd: -0.15 },
            });
            h.factionShift(ctx, 'JUD', 'sages', -20);
            h.chronicle(ctx, 'era', 'The court says nothing, and the only account of the house in general circulation by the end of the year is the preacher\'s, told better each time and now with a tune.');
          }
        }),
      },
      {
        label: 'Answer it with whatever this house was given',
        tooltip: 'The constitution earns out, or does not. A crowned house has nothing but force and uses it. A married-in house points at the pedigree and lets the genealogists talk. Two houses put a priest up to say the offerings are still going up. The prince of Ezekiel has the best answer available and the most humiliating one — he was never the redemption, he was a magistrate, and magistrates lose battles. The record shows which of those this campaign built.',
        effects: guard('ev_bk_koziba:0', (ctx) => {
          const h = ctx.helpers;
          const kind = constitution(ctx);
          h.setFlag(ctx, 'kozibaAnswered', true);
          if (kind === 'crown') {
            h.adjust(ctx, 'JUD', { legitimacy: -25, stability: -2 });
            h.addTagModifier(ctx, 'JUD', {
              id: 'the_name_returns', name: 'The Other Spelling', months: 180,
              effects: { unrestAll: 3, legitimacyAdd: -0.1 },
            });
            h.factionShift(ctx, 'JUD', 'captains', 20);
            h.factionShift(ctx, 'JUD', 'sages', -20);
            h.doctrine(ctx, 'authority', 2);
            h.setFlag(ctx, 'kozibaByForce', true);
            h.chronicle(ctx, 'era', 'The preacher is taken up in the night and the crowds are dispersed by the garrison, and the spelling goes on spreading, because a state that can only answer a joke with soldiers has confirmed the joke.');
          } else if (kind === 'david') {
            // Whether the pedigree is an ANSWER depends on whether the house
            // ever collected on it (SPEC §134). A crown that took the Davidic
            // succession can point at the man on the seat; one that left the
            // genealogy in a chest is pointing at a document.
            const collected = flag(ctx, 'davidicSuccession');
            h.adjust(ctx, 'JUD', { legitimacy: collected ? 5 : -15, stability: collected ? 2 : 0 });
            h.addTagModifier(ctx, 'JUD', {
              id: 'the_pedigree_answers', name: collected ? 'The Pedigree Answers' : 'A Genealogy in a Chest',
              months: 120, effects: { unrestAll: collected ? -1 : 2 },
            });
            h.setFlag(ctx, 'kozibaByPedigree', true);
            h.chronicle(ctx, 'era', collected
              ? 'The house answers with a genealogy, which is a slow answer and a real one: the man on the seat is of the line of Jehoiachin whatever anybody calls his great-grandfather.'
              : 'The house answers with a genealogy belonging to a cousin it declined to crown, which the preacher in the Galilee has already read and has questions about.');
          } else if (kind === 'twoHouses') {
            h.adjust(ctx, 'JUD', { legitimacy: -8, stability: 2 });
            h.addTagModifier(ctx, 'JUD', {
              id: 'the_offerings_continue', name: 'The Offerings Continue', months: 120,
              effects: { unrestAll: -1, legitimacyAdd: 0.1 },
            });
            h.factionShift(ctx, 'JUD', 'sages', 15);
            h.setFlag(ctx, 'kozibaByAltar', true);
            h.chronicle(ctx, 'era', 'The priest goes up and says what he says every day, and the fact that he can still say it is the answer. The state loses a frontier and does not lose its founding.');
          } else if (kind === 'nasi') {
            h.adjust(ctx, 'JUD', { stability: 3 });
            h.addTagModifier(ctx, 'JUD', {
              id: 'a_magistrate_loses_a_battle', name: 'A Magistrate Loses a Battle', months: 240,
              effects: { unrestAll: -2, legitimacyAdd: 0.1 },
            });
            h.factionShift(ctx, 'JUD', 'sages', 20);
            h.setFlag(ctx, 'kozibaByOffice', true);
            h.chronicle(ctx, 'era', 'The court replies, in writing and without heat, that the Nasi was never the redemption and has never claimed to be; he is a magistrate under a constitution, and magistrates lose battles. It is the most humiliating sentence the state has ever published and it ends the matter in a season.');
          } else {
            h.adjust(ctx, 'JUD', { legitimacy: -15, stability: -1 });
            h.setFlag(ctx, 'kozibaUnanswered', true);
            h.chronicle(ctx, 'era', 'The council has no settled answer to give, because it never settled what the house was, and the other spelling spreads through a year in which nobody in authority contradicts it.');
          }
          if (flag(ctx, 'doubtCanonized')) {
            // A state that reads its own doubts aloud every year cannot be
            // wounded by somebody reading them aloud once.
            h.adjust(ctx, 'JUD', { stability: 2 });
            h.chronicle(ctx, 'ruler', 'The preacher\'s text turns out to be the one the state reads at the founding festival every year, from a better copy, and the crowds thin out of their own accord.');
          }
        }),
      },
    ],
  },

];
