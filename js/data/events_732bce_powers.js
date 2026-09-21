// Judaea Universalis — the great powers, 719–610 BCE (SPEC §283). Content
// package. Zero imports; every effect runs through ctx.helpers.
//
// The 732 BCE chapter is the century in which the first real empire in the
// world is built, runs everything from the Nile to the Zagros, and then comes
// apart in fifteen years. Its world spine carried eleven cards for all of it.
//
// What is in here: the annexation of the last Hittite city; the sack of
// Musasir; a capital built from nothing and abandoned the month its builder
// died; an aqueduct; the Cimmerians breaking Phrygia; an empire that makes
// every vassal in the world swear to its succession in advance; Egypt revolting
// and being retaken and then quietly getting away; a library; a Greek town on
// the Bosporus; the Scythians running over the Medes; Babylon starved out by
// its own brother; Naukratis; a Chaldean taking Babylon in 626 and starting the
// twenty years that end Assyria; Draco; Assur; and the last Assyrian king
// crossing the Euphrates westward with an Egyptian escort.
//
// The Babylon card matters mechanically as well as historically (SPEC §282).
// In most campaigns the AI's Assyria has eaten Babylonia long before 626, and
// a fall that hands Mesopotamia to a court that no longer exists does nothing
// at all. Nabopolassar's accession is exactly the moment Babylon comes back,
// so this card raises it and gives it the south.
//
// Sources: the annals and Display Inscription of Sargon II, including the
// eighth-campaign letter to Ashur; the Rassam, Taylor and Chicago prisms of
// Sennacherib and the Jerwan aqueduct inscription; the Esarhaddon succession
// treaty tablets from Nimrud and Tayinat; the annals of Ashurbanipal; the
// Babylonian Chronicle series for 626-609; Herodotus I.103-106 and IV.11-12
// for the Cimmerians and Scythians, and II.178-179 for Naukratis; the
// Athenian archon list and Aristotle's Constitution of Athens for Draco.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_732bce_powers] ' + key, e || '');
}

function guard(key, fn) {
  return function (ctx) {
    try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); }
  };
}

function P(ctx) { return ctx.game.playerTag; }

function mod(ctx, id, name, effects, months) {
  ctx.helpers.addTagModifier(ctx, P(ctx), {
    id, name, months: Number.isFinite(months) ? months : -1, effects,
  });
}

// What the age does to somebody else's court. A world spine that only ever
// changes the player's own ledger is a newspaper; this is the half that makes
// the board move.
function powerMod(ctx, tag, id, name, effects, months) {
  try {
    const t = ctx.game.tags && ctx.game.tags[tag];
    if (!t || t.alive === false) return;
    ctx.helpers.addTagModifier(ctx, tag, {
      id, name, months: Number.isFinite(months) ? months : -1, effects,
    });
  } catch (e) { warnOnce('powerMod:' + id, e); }
}

function opinion(ctx, from, of, delta) {
  try {
    const t = ctx.game.tags && ctx.game.tags[from];
    if (!t) return;
    if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
    t.opinion[of] = Math.max(-200, Math.min(200, (t.opinion[of] || 0) + delta));
  } catch (e) { warnOnce('opinion', e); }
}

function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[tag];
  return !!(t && t.alive !== false);
}

// A scripted fall names the heir the history gave the ground to, and the heir
// is sometimes already gone (SPEC §282). Raise it rather than refuse: a court
// that holds ground is alive again on the next tick anyway, and a card that
// silently declines is the reason an annexed empire can finish a chapter
// larger than it started. Never the player's own chair.
function raise(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[tag];
  if (!t) return false;
  if (t.alive !== false) return true;
  if (ctx.game.playerTag === tag) return false;
  try {
    t.alive = true;
    t.overlord = null;
    t.atWarWith = [];
    t.warExhaustion = 0;
    if (!Number.isFinite(t.stability) || t.stability < 0) t.stability = 0;
    t.legitimacy = Math.max(Number(t.legitimacy) || 0, 50);
    t.treasury = Math.max(Number(t.treasury) || 0, 25);
    return true;
  } catch (e) { warnOnce('raise:' + tag, e); return false; }
}

// Hand named ground over. Only ground the NAMED loser still owns moves: a
// province the player has taken off it belongs to whoever took it, and a card
// a thousand miles away does not get to reassign it (SPEC §111).
function cedeNamed(ctx, names, fromTag, toTag) {
  if (!raise(ctx, toTag) || fromTag === toTag) return 0;
  if (ctx.game.playerTag === fromTag) return 0;
  let n = 0;
  for (const name of names) {
    const p = ctx.prov && ctx.prov(name);
    if (!p || p.impassable || p.owner !== fromTag) continue;
    try { ctx.helpers.changeOwner(ctx, p.canon || p.name, toTag); n++; }
    catch (e) { warnOnce('cede:' + name, e); }
  }
  return n;
}

// The court stops existing; ground, armies, wars and the forwarding address
// pass to the heir. Never the player's own chair (SPEC §111).
function endCourt(ctx, dyingTag, heirTag) {
  if (!alive(ctx, dyingTag) || !raise(ctx, heirTag)) return false;
  if (ctx.game.playerTag === dyingTag) return false;
  try { return !!ctx.helpers.dissolveTag(ctx, dyingTag, heirTag); }
  catch (e) { warnOnce('endCourt:' + dyingTag, e); return false; }
}

// A world card: the age happening to everybody, with one answer.
function W(id, title, y, m, worldLabel, desc, historical, label, tooltip, fx) {
  return {
    id, title, worldLabel, desc, historical,
    forTag: 'both', date: { y, m }, world: true, aiOption: 0,
    options: [{ label, tooltip, effects: guard(id, fx) }],
  };
}

export const EVENTS_732_POWERS = [

  W('ev732p_carchemish_annexed', 'The Last Hittite City', -719, 3,
    'Carchemish is annexed',
    'Carchemish is finished. The great crossing city on the Euphrates — the last state '
      + 'anywhere still writing Hittite hieroglyphs, still carving processions of gods in '
      + 'the old style, still ruled by a king with a Hittite throne-name eight hundred '
      + 'years after the empire it remembers fell — has been annexed, its king deported, '
      + 'its treasury carried off, its territory made a province.\n\nThe Bronze Age ends '
      + 'this year, four centuries late, as a piece of administration.',
    'Sargon II annexed Carchemish in 717, deporting Pisiri and ending the last Neo-Hittite successor state.',
    'Note the end of it',
    'Carchemish\'s ground and government pass to Assyria. +20 legitimacy and "The Old World Ends" (+0.2 legitimacy a month, +6% morale) permanently.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      const held = ctx.game.provinces.filter((p) => p && !p.impassable && p.owner === 'CRC').length;
      endCourt(ctx, 'CRC', 'ASR');
      h.adjust(ctx, me, { legitimacy: 20, infl: 15 });
      mod(ctx, 'p732_old_world_ends', 'The Old World Ends', { legitimacyAdd: 0.2, moraleMult: 1.06 });
      h.chronicle(ctx, 'era', 'Carchemish is made a province and its king is carried to Assyria. ' + held
        + ' provinces change hands, and the last people writing Hittite stop.');
    }),

  W('ev732p_the_eighth_campaign', 'The Letter to the God', -714, 9,
    'Assyria breaks Urartu',
    'The Assyrian army has gone into the northern mountains, marched for months through '
      + 'country where a column can only go in single file, beaten the Urartian king in a '
      + 'valley, and then done the thing that ends the war: walked into the holy city of '
      + 'Musasir and carried off the god.\n\nThe campaign report is addressed to Ashur '
      + 'personally and itemises the loot to the last item, including the divine statue. '
      + 'The Urartian king, according to the report, killed himself when he heard.',
    'Sargon II\'s eighth campaign of 714 against Rusa I of Urartu is recorded in a long letter to the god Ashur, including the sack of Musasir and the itemised plunder.',
    'Read the inventory',
    '+40 martial points and "What an Army Can Reach" (+8% army strength, +1 fort defence) for thirty years; Urartu gains "The God Is Gone" (−20% army strength, −15% income).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { mar: 40 });
      mod(ctx, 'p732_what_an_army_can_reach', 'What an Army Can Reach', { milPowerMult: 1.08, fortDefBonus: 1 }, 360);
      powerMod(ctx, 'URA', 'p732_the_god_is_gone', 'The God Is Gone', { milPowerMult: 0.8, incomeMult: 0.85 }, -1);
      powerMod(ctx, 'ASR', 'p732_the_northern_road', 'The Northern Road', { milPowerMult: 1.06 }, -1);
      h.chronicle(ctx, 'era', 'The Assyrians come back out of the mountains with an Urartian god on a cart, and the one state that could fight them in the hills stops being able to.');
    }),

  W('ev732p_merodach_baladan_driven_out', 'Twelve Years and Out', -710, 5,
    'Babylon changes hands again',
    'The Chaldean who has held Babylon for twelve years — who wrote to every court in '
      + 'this world proposing a common front, including ours — has been driven back into '
      + 'the southern marshes, and the Assyrian king has taken the hand of Marduk in '
      + 'person and made himself king of Babylon as well.\n\nHe is not finished. Marsh '
      + 'country cannot be conquered, only visited, and he will be back within a decade '
      + 'with the same proposal and the same letter.',
    'Sargon II expelled Merodach-baladan II from Babylon in 710 and took the Babylonian kingship himself; the Chaldean returned briefly in 703.',
    'Burn the letter he sent us',
    '+25 influence points and "Nothing In Writing" (−0.5 unrest everywhere, +6% income) for twenty-five years; Assyria\'s regard improves by 20 and Babylon gains "Back in the Marshes" (−10% income).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { infl: 25, gov: 15 });
      mod(ctx, 'p732_nothing_in_writing', 'Nothing In Writing', { unrestAll: -0.5, incomeMult: 1.06 }, 300);
      powerMod(ctx, 'BBL', 'p732_back_in_the_marshes', 'Back in the Marshes', { incomeMult: 0.9 }, 240);
      opinion(ctx, 'ASR', me, 20);
      h.chronicle(ctx, 'era', 'The letter from Babylon is burned rather than filed, which several courts on this coast come to wish they had thought of.');
    }),

  W('ev732p_a_city_from_nothing', 'A Capital Built on a Field', -706, 4,
    'Dur-Sharrukin is dedicated',
    'The Assyrian king has finished building an entire capital city on empty farmland he '
      + 'bought from the villagers — a palace, a citadel, temples, a mile and a half of '
      + 'wall, gates with winged bulls, and a population moved in by decree from everywhere '
      + 'in the empire.\n\nIt took ten years and the tribute of the world. He will be dead '
      + 'within two years and his son will abandon it immediately, on the grounds that a '
      + 'city built by a king who died badly is a city with something wrong with it.',
    'Dur-Sharrukin (Khorsabad) was dedicated in 706 and abandoned as a capital after Sargon II\'s death in 705.',
    'Send the dedication gift and take notes on the works',
    '−90 talents, +30 governance points and "What a Capital Costs" (+8% production, +0.2 legitimacy a month) permanently; Assyria gains "The City on the Field" (−8% income) for ten years.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { treasury: -90, gov: 30 });
      mod(ctx, 'p732_what_a_capital_costs', 'What a Capital Costs', { prodMult: 1.08, legitimacyAdd: 0.2 });
      powerMod(ctx, 'ASR', 'p732_city_on_the_field', 'The City on the Field', { incomeMult: 0.92 }, 120);
      h.chronicle(ctx, 'era', 'A capital city is dedicated on ground that was barley two years ago, and is empty again inside three.');
    }),

  W('ev732p_the_aqueduct', 'Fifty Miles of Water', -700, 8,
    'Nineveh is rebuilt',
    'The new Assyrian king has ignored his father\'s city and rebuilt Nineveh instead, on '
      + 'a scale nobody has attempted: a palace without a rival, eighteen gates, gardens '
      + 'watered by a canal brought fifty miles out of the hills across a stone aqueduct '
      + 'two million blocks long, and a screw-driven lift to raise water to the terraces.'
      + '\n\nThe inscription on the aqueduct says he had it built in a single season. The '
      + 'engineering is four hundred years ahead of anything else in this world and will '
      + 'be remembered, wrongly, as a garden in Babylon.',
    'Sennacherib\'s Nineveh works included the Jerwan aqueduct and a canal system from Bavian; the "hanging gardens" tradition may derive from them.',
    'Hire an engineer who worked on it',
    '−120 talents and "The Water Engineer" (+10% growth, +8% production, +1 fort defence) permanently.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { treasury: -120, gov: 25 });
      mod(ctx, 'p732_water_engineer', 'The Water Engineer', { growthMult: 1.1, prodMult: 1.08, fortDefBonus: 1 });
      powerMod(ctx, 'ASR', 'p732_the_incomparable_palace', 'The Incomparable Palace', { incomeMult: 1.08, moraleMult: 1.05 }, -1);
      h.chronicle(ctx, 'era', 'A man who cut stone for the Assyrian aqueduct is hired away, and the cisterns of this country are never built the old way again.');
    }),

  W('ev732p_the_cimmerians_break_phrygia', 'The King With the Golden Touch Is Dead', -695, 5,
    'Phrygia falls to the Cimmerians',
    'Phrygia is gone. The horse-people out of the steppe came through the highland in '
      + 'force, broke the field army, and took the capital; the king — the one the Greeks '
      + 'tell stories about, who dedicated a throne at Delphi and whose name means wealth '
      + 'in four languages — is dead, by his own hand according to everybody who tells '
      + 'it.\n\nWhat is left of the highland is being gathered up, town by town, by the '
      + 'Lydian kingdom to the west, which is about to become the richest state in Anatolia '
      + 'by inheriting somebody else\'s.',
    'Midas of Phrygia died around 696-695 during the Cimmerian invasion (Strabo I.3.21, Eusebius); Lydia subsequently absorbed much of the Phrygian highland.',
    'Note who gathers the pieces',
    'Phrygia\'s ground and government pass to Lydia. +25 martial points and "The Riders Are Real" (+1 fort defence, +6% manpower) permanently.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      const held = ctx.game.provinces.filter((p) => p && !p.impassable && p.owner === 'PHR').length;
      endCourt(ctx, 'PHR', 'LYD');
      h.adjust(ctx, me, { mar: 25 });
      mod(ctx, 'p732_riders_are_real', 'The Riders Are Real', { fortDefBonus: 1, manpowerMult: 1.06 });
      powerMod(ctx, 'LYD', 'p732_the_phrygian_inheritance', 'The Phrygian Inheritance', { incomeMult: 1.12, manpowerMult: 1.08 }, -1);
      h.chronicle(ctx, 'era', 'Phrygia ends in one campaigning season and ' + held
        + ' provinces pass west to Lydia, which did not have to fight for any of it.');
    }),

  W('ev732p_the_empire_reaches_the_halys', 'From the Salt River to the Nile', -679, 6,
    'Assyria reaches its widest extent',
    'The tribute lists this year run from the Halys in Anatolia to the Nile Delta and from '
      + 'Cyprus to the Zagros. There is no state in this world that is not either inside '
      + 'the empire, paying it, or a long way east of anybody who cares.\n\nThe empire is '
      + 'about eighty years old as an empire and has another seventy in it. Nobody alive '
      + 'thinks of it as temporary, and the men who write its chronicles have run out of '
      + 'directions to describe.',
    'Esarhaddon\'s inscriptions record tribute from Cyprus, Anatolia, the Levant and Arabia, the widest recorded extent of Assyrian hegemony before the Egyptian campaigns.',
    'Write the empire into the chancery protocol',
    '+35 governance points and "One World, One Court" (+8% income, +6% trade, −5% morale) for forty years.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { gov: 35, infl: 20 });
      mod(ctx, 'p732_one_world_one_court', 'One World, One Court', { incomeMult: 1.08, tradeMult: 1.06, moraleMult: 0.95 }, 480);
      powerMod(ctx, 'ASR', 'p732_no_rival_anywhere', 'No Rival Anywhere', { incomeMult: 1.1, milPowerMult: 1.05 }, -1);
      h.chronicle(ctx, 'era', 'The protocol is rewritten on the assumption that there is one empire and everybody else is inside it, which is true for about seventy more years.');
    }),

  W('ev732p_the_succession_sworn', 'Every Vassal in the World Swears', -672, 7,
    'The succession treaty',
    'The Assyrian king has summoned every vassal, governor and client in the empire and '
      + 'made all of them swear, in identical words on identical tablets, to accept his '
      + 'chosen heir — with clauses covering what they must do if anybody speaks against '
      + 'the heir, what they must report, whom they must denounce, and a list of curses '
      + 'for breaking it that runs to several hundred lines.\n\nCopies go home with each '
      + 'court, to be read aloud annually. It is the most thorough attempt anybody has yet '
      + 'made to make an empire outlive a king by paperwork.',
    'Esarhaddon\'s succession treaty of 672 survives in multiple copies from Nimrud and Tell Tayinat, imposing oaths on vassals across the empire.',
    'Swear it, and read the curses carefully',
    '−80 talents, +25 legitimacy and "The Tablet in the Temple" (+0.25 legitimacy a month, −0.5 unrest everywhere, −5% morale) for forty years; Assyria\'s regard improves by 30.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { treasury: -80, legitimacy: 25 });
      mod(ctx, 'p732_tablet_in_the_temple', 'The Tablet in the Temple', { legitimacyAdd: 0.25, unrestAll: -0.5, moraleMult: 0.95 }, 480);
      opinion(ctx, 'ASR', me, 30);
      h.chronicle(ctx, 'era', 'A tablet of oaths is deposited in the house of the god and read out once a year, in a language most of the hearers do not speak.');
    }),

  W('ev732p_egypt_revolts_and_is_retaken', 'Egypt Twice in Three Years', -667, 3,
    'Assyria retakes Egypt',
    'Egypt was conquered, revolted the moment the army left, and has been conquered again. '
      + 'The Assyrians have marched to Memphis twice in three years, installed the same '
      + 'Delta princes both times, and executed most of them after the second.\n\nThe one '
      + 'they did not execute is a prince of Sais, whose son they have taken to Nineveh and '
      + 'educated. That son will be sent home to govern, and will spend thirty patient '
      + 'years making Egypt independent without ever once declaring it.',
    'Ashurbanipal reconquered Egypt in 667-666 after Taharqa\'s counter-attack; Necho I of Sais was spared and his son Psamtik educated at Nineveh.',
    'Watch the prince of Sais',
    '+30 influence points and "The Patient Prince" (+7% trade, +0.2 legitimacy a month) permanently; Egypt gains "Governed by a Native" (+8% income, +6% manpower).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { infl: 30 });
      mod(ctx, 'p732_patient_prince', 'The Patient Prince', { tradeMult: 1.07, legitimacyAdd: 0.2 });
      powerMod(ctx, 'MIZ', 'p732_governed_by_a_native', 'Governed by a Native', { incomeMult: 1.08, manpowerMult: 1.06 }, -1);
      h.chronicle(ctx, 'era', 'Egypt is conquered twice and given back to a native prince both times, which the Assyrians regard as efficiency and which turns out to be the end of their Egypt.');
    }),

  W('ev732p_psamtik_unites_the_delta', 'Egypt Is One Country and Nobody Fought', -664, 6,
    'Psamtik I unites Egypt',
    'The prince the Assyrians educated has spent a decade absorbing the other Delta '
      + 'princedoms by marriage, purchase and the occasional quiet campaign, has had his '
      + 'daughter adopted as the god\'s wife at Thebes — which delivers Upper Egypt without '
      + 'a battle — and is now, in every practical sense, king of a united Egypt.\n\nHe has '
      + 'never repudiated the Assyrian connection, never declared independence, and never '
      + 'sent tribute either. Nobody has raised the subject.',
    'Psamtik I unified Egypt by 656, when the Adoption Stele of Nitocris secured Thebes; Assyrian suzerainty lapsed without formal rupture.',
    'Recognise the new Egypt',
    '+140 talents, +25 influence points and "Two Great Powers Again" (+9% trade, +6% income) permanently; Egypt gains "The Saite Restoration" (+15% income, +10% manpower, +8% army strength).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { treasury: 140, infl: 25 });
      mod(ctx, 'p732_two_great_powers_again', 'Two Great Powers Again', { tradeMult: 1.09, incomeMult: 1.06 });
      powerMod(ctx, 'MIZ', 'p732_saite_restoration', 'The Saite Restoration', { incomeMult: 1.15, manpowerMult: 1.1, milPowerMult: 1.08 }, -1);
      opinion(ctx, 'MIZ', me, 25);
      h.chronicle(ctx, 'era', 'Egypt becomes one country again without a war of independence, because nobody was willing to be the one who said the word.');
    }),

  W('ev732p_the_library', 'A King Who Can Read', -660, 9,
    'The library at Nineveh',
    'The Assyrian king can read cuneiform, including the old dead Sumerian, and is proud '
      + 'enough of it to say so in his own inscriptions. He has ordered every scribal '
      + 'collection in Babylonia copied or confiscated and brought north: omens, medicine, '
      + 'mathematics, lexical lists, the flood story, letters, contracts — tens of '
      + 'thousands of tablets, catalogued.\n\nIt is the first attempt anybody has made to '
      + 'collect everything that has been written. It will burn in fifty years, which is '
      + 'why almost all of it survives.',
    'Ashurbanipal\'s library at Nineveh, assembled by systematic collection from Babylonian archives, survived because the tablets were baked in the fire of 612.',
    'Send our scribes to copy what they will let us copy',
    '−70 talents, +35 governance points and "What the Scribes Brought Back" (+0.25 legitimacy a month, −8% cost of governing, +6% growth) permanently.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { treasury: -70, gov: 35, legitimacy: 10 });
      mod(ctx, 'p732_what_the_scribes_brought_back', 'What the Scribes Brought Back', { legitimacyAdd: 0.25, adminMult: 0.92, growthMult: 1.06 });
      opinion(ctx, 'ASR', me, 15);
      h.chronicle(ctx, 'era', 'Two of our scribes spend three years at Nineveh copying omens, medicine and arithmetic, and come home with more than either of them can explain.');
    }),

  W('ev732p_byzantion', 'A Town on the Narrows', -657, 5,
    'Byzantion is founded',
    'Greek colonists from a small city near Corinth have planted a town on the European '
      + 'side of the narrows where the Black Sea drains into this one — on the opposite '
      + 'shore from an existing colony whose founders, the story goes, must have been '
      + 'blind not to have taken this side.\n\nIt controls the grain of the northern sea, '
      + 'the tunny run, and the crossing. It will be besieged, sacked, renamed and made '
      + 'the capital of the world, and every one of those will be because of where it is.',
    'Megarian colonists founded Byzantion around 657 opposite Chalcedon; Herodotus IV.144 records the "city of the blind" remark.',
    'Buy into the grain run',
    '+110 talents and "The Northern Grain" (+9% trade, +5% growth) permanently; Thrace gains "The Crossing Taxed" (+10% income).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { treasury: 110, infl: 10 });
      mod(ctx, 'p732_northern_grain', 'The Northern Grain', { tradeMult: 1.09, growthMult: 1.05 });
      powerMod(ctx, 'THR', 'p732_crossing_taxed', 'The Crossing Taxed', { incomeMult: 1.1 }, -1);
      h.chronicle(ctx, 'era', 'A Greek town goes up on the narrows and the grain of the northern sea starts moving south in quantity, through a toll.');
    }),

  W('ev732p_the_scythians_over_the_medes', 'Twenty-Eight Years of Riders', -653, 8,
    'The Scythians overrun Media',
    'The Median confederation had Nineveh under siege and was winning. Then horse-people '
      + 'came around the eastern end of the mountains in numbers nobody had allowed for, '
      + 'broke the Median army in the field, and the siege dissolved.\n\nThe riders now '
      + 'hold the plateau, in the sense that nothing can be done on it without their '
      + 'permission. The Greeks who tell this story say it lasted twenty-eight years and '
      + 'ended at a banquet where the Median king made the whole Scythian leadership drunk '
      + 'and killed them.',
    'Herodotus I.103-106 describes the Scythian domination of Media for twenty-eight years after the relief of Nineveh, ended by Cyaxares at a banquet.',
    'Note that the empire was saved by strangers',
    '+30 martial points and "The Siege That Lifted Itself" (+8% morale, +1 fort defence) for thirty years; Media gains "Under the Riders" (−15% army strength, −12% income) for twenty-five years.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { mar: 30 });
      mod(ctx, 'p732_siege_that_lifted_itself', 'The Siege That Lifted Itself', { moraleMult: 1.08, fortDefBonus: 1 }, 360);
      powerMod(ctx, 'MDA', 'p732_under_the_riders', 'Under the Riders', { milPowerMult: 0.85, incomeMult: 0.88 }, 300);
      h.chronicle(ctx, 'era', 'Nineveh is saved by people who had never heard of it, and the Medes spend a generation paying horsemen not to ride through their fields.');
    }),

  W('ev732p_babylon_starved_out', 'Brother Against Brother', -648, 4,
    'The Babylonian revolt ends',
    'The Assyrian king\'s own brother, whom he had made king of Babylon, spent four years '
      + 'in open revolt with Elam, the Chaldeans, the Arabs and Egypt behind him. It ended '
      + 'this month: Babylon starved out after a siege in which, according to the chronicle, '
      + 'people ate their children, and the brother dead in the burning palace.\n\nThe '
      + 'empire has won and has spent four years, its eastern field army and the last of '
      + 'its credit doing it. There will not be another Assyrian generation with the '
      + 'strength to do this twice.',
    'The revolt of Shamash-shum-ukin (652-648) ended with the fall of Babylon after a long siege; the Assyrian recovery from it was never complete.',
    'Count what it cost them',
    '+40 martial points, +25 influence points and "The Empire Is Spending Capital" (+10% manpower, +1 fort defence) permanently; Assyria gains "Four Years Against Itself" (−12% income, −10% manpower) permanently.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { mar: 40, infl: 25 });
      mod(ctx, 'p732_empire_spending_capital', 'The Empire Is Spending Capital', { manpowerMult: 1.1, fortDefBonus: 1 });
      powerMod(ctx, 'ASR', 'p732_four_years_against_itself', 'Four Years Against Itself', { incomeMult: 0.88, manpowerMult: 0.9 }, -1);
      powerMod(ctx, 'BBL', 'p732_the_city_starved', 'The City Starved', { incomeMult: 0.85, manpowerMult: 0.85 }, 240);
      h.chronicle(ctx, 'era', 'Babylon falls to hunger rather than to engines, and the empire that took it is quietly poorer than it was before it started.');
    }),

  W('ev732p_cyaxares_reorganises', 'The Medes Are Sorted Into Regiments', -637, 3,
    'Media becomes an army',
    'The Median king has done to his own people what the Assyrians did to theirs two '
      + 'centuries ago: taken a confederation of horse-owning clans who fought as one '
      + 'undifferentiated mass and sorted them into spearmen, archers and cavalry, each '
      + 'trained separately and commanded separately.\n\nIt is not an original idea. It is '
      + 'the first time anybody east of the Tigris has had it, and the state that had it '
      + 'first is about to find out what it feels like from the other side.',
    'Herodotus I.103 credits Cyaxares with dividing the Median forces into spearmen, archers and cavalry, the reform that preceded the destruction of Assyria.',
    'Send an observer east',
    '−60 talents, +35 martial points and "Arms of Their Own" (+10% army strength, +6% morale) permanently; Media gains "The New Regiments" (+20% army strength, +10% manpower).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { treasury: -60, mar: 35 });
      mod(ctx, 'p732_arms_of_their_own', 'Arms of Their Own', { milPowerMult: 1.1, moraleMult: 1.06 });
      powerMod(ctx, 'MDA', 'p732_the_new_regiments', 'The New Regiments', { milPowerMult: 1.2, manpowerMult: 1.1 }, -1);
      h.chronicle(ctx, 'era', 'The Medes stop fighting as a crowd of horsemen and start fighting as an army, which takes one generation and ends an empire.');
    }),

  W('ev732p_naukratis', 'A Greek Town in the Delta', -631, 8,
    'Naukratis is granted',
    'Egypt has given the Greeks a city. Not a trading beach — a chartered town on a branch '
      + 'of the Nile, with its own temples, its own magistrates, a monopoly on Greek '
      + 'seaborne trade into Egypt, and a customs house to make the monopoly stick.\n\n'
      + 'Every amphora of Greek wine and oil that enters this country now enters through '
      + 'an Egyptian toll, and every Greek who wants to trade with the richest country in '
      + 'the world does it in one place where he can be counted.',
    'Herodotus II.178-179 records Amasis granting Naukratis to the Greeks with a monopoly on seaborne trade; the site is occupied from the late seventh century.',
    'Route our own cargoes through it',
    '+130 talents and "The Delta Customs House" (+10% trade, +5% income) permanently; Egypt gains "Every Greek Counted" (+10% income).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { treasury: 130, infl: 15 });
      mod(ctx, 'p732_delta_customs_house', 'The Delta Customs House', { tradeMult: 1.1, incomeMult: 1.05 });
      powerMod(ctx, 'MIZ', 'p732_every_greek_counted', 'Every Greek Counted', { incomeMult: 1.1 }, -1);
      h.chronicle(ctx, 'era', 'One town on one branch of the Nile becomes the only legal door between the Greek world and Egypt, and everybody pays at it.');
    }),

  W('ev732p_the_chaldean_takes_babylon', 'A Chaldean in the Palace', -626, 5,
    'Nabopolassar takes Babylon',
    'Babylonia has gone. An officer of the empire — a Chaldean from the southern marshes, '
      + 'in imperial service, commanding imperial troops — has taken Babylon, taken the '
      + 'hand of Marduk, and been proclaimed king in his own right. The empire\'s response '
      + 'has been two failed campaigns and then nothing.\n\nThis is not another revolt in '
      + 'the south. It is a second empire, starting now, with a professional army, the '
      + 'grain of Mesopotamia and a king who has spent his career learning exactly how the '
      + 'Assyrian system works from the inside.',
    'Nabopolassar took the Babylonian throne in 626, founding the Neo-Babylonian dynasty; Assyrian counter-attacks failed and Babylonia was permanently lost.',
    'Open a correspondence with the new king',
    'Babylon takes southern Mesopotamia back from Assyria and stands again even where the century had already ended it. +35 influence points and "Two Empires Again" (+8% trade, +6% manpower) permanently.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      // The card the §282 fix exists for. In most campaigns Assyria's AI has
      // long since eaten Babylonia, and 626 is the year the history says the
      // Chaldean dynasty rises — so it rises, with the ground it rose on.
      raise(ctx, 'BBL');
      const took = cedeNamed(ctx, ['Babylon', 'Nehardea', 'Uruk', 'Seleucia-Ctesiphon', 'Charax', 'Susa'], 'ASR', 'BBL');
      h.adjust(ctx, me, { infl: 35 });
      mod(ctx, 'p732_two_empires_again', 'Two Empires Again', { tradeMult: 1.08, manpowerMult: 1.06 });
      powerMod(ctx, 'BBL', 'p732_the_chaldean_dynasty', 'The Chaldean Dynasty', { milPowerMult: 1.15, incomeMult: 1.12, manpowerMult: 1.1 }, -1);
      powerMod(ctx, 'ASR', 'p732_the_south_is_lost', 'The South Is Lost', { incomeMult: 0.85, manpowerMult: 0.88 }, -1);
      opinion(ctx, 'BBL', me, 20); opinion(ctx, 'ASR', me, -10);
      h.chronicle(ctx, 'era', 'A Chaldean officer takes Babylon and keeps it' + (took ? ', and ' + took + ' provinces of the south answer to him by the end of the year' : '')
        + '. The empire sends two armies and then stops sending them.');
    }),

  W('ev732p_draco', 'The Laws Written in Blood', -621, 4,
    'Athens writes its first code',
    'A Greek city has done something this world has seen before only from kings: written '
      + 'its laws down and put them up in public, so that a man accused of something can '
      + 'read what he is accused of instead of being told by whoever is judging him.\n\n'
      + 'The code itself is famously savage — the penalty for most things is death, and a '
      + 'later Athenian says it was written in blood rather than ink. The savagery will be '
      + 'repealed within thirty years. The writing-down will not.',
    'Draco\'s code, traditionally dated 621, is the first written Athenian law; Plutarch (Solon 17) reports the remark that it was written in blood.',
    'Have our own judgements written and posted',
    '+40 governance points, +15 legitimacy and "Written and Posted" (+0.25 legitimacy a month, −0.6 unrest everywhere, −5% income) permanently.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { gov: 40, legitimacy: 15 });
      mod(ctx, 'p732_written_and_posted', 'Written and Posted', { legitimacyAdd: 0.25, unrestAll: -0.6, incomeMult: 0.95 });
      powerMod(ctx, 'ATH', 'p732_the_first_code', 'The First Code', { adminMult: 0.92, unrestAll: -0.4 }, -1);
      h.chronicle(ctx, 'era', 'The judgements of the gate courts are written out and posted where they can be read, which several great houses discover they dislike.');
    }),

  W('ev732p_assur_falls', 'They Have Taken the Old City', -614, 7,
    'The Medes sack Assur',
    'The Medes have come down out of the mountains and taken Assur. Not the capital — the '
      + 'old city, the first city, the one the empire is named after and where its god '
      + 'lives and every Assyrian king is buried.\n\nThe Babylonian king arrived too late '
      + 'for the fighting and in time for the treaty: the two powers have sworn alliance '
      + 'over the ruins and sealed it with a marriage. Everything that happens for the next '
      + 'nine years follows from the handshake at Assur.',
    'The Babylonian Chronicle records the Median capture of Assur in 614 and the subsequent alliance between Cyaxares and Nabopolassar, sealed by a dynastic marriage.',
    'Understand what the handshake means',
    'Assur and the northern cities pass from Assyria to Media. +30 influence points and "The Two Against the One" (+8% manpower, +1 fort defence) permanently.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      const took = cedeNamed(ctx, ['Assur', 'Arbela', 'Gazaca'], 'ASR', 'MDA');
      h.adjust(ctx, me, { infl: 30, mar: 20 });
      mod(ctx, 'p732_two_against_the_one', 'The Two Against the One', { manpowerMult: 1.08, fortDefBonus: 1 });
      powerMod(ctx, 'ASR', 'p732_the_god_has_no_house', 'The God Has No House', { moraleMult: 0.85, incomeMult: 0.88 }, -1);
      opinion(ctx, 'MDA', me, 15); opinion(ctx, 'BBL', me, 15);
      h.chronicle(ctx, 'era', 'Assur is taken and burned' + (took ? ' and ' + took + ' provinces change hands' : '')
        + ', and two kings swear an alliance in the ruins of the city that named the empire they are dismantling.');
    }),

  W('ev732p_the_last_king_crosses', 'The Last King Goes West', -610, 3,
    'Assyria ends at Harran',
    'There is still an Assyrian king. He has no capital, no Assur, no Nineveh and no '
      + 'empire; he has Harran, a field army, and an Egyptian alliance, and he is holding '
      + 'the last crossing of the Euphrates that still answers to him.\n\nWhen Harran goes '
      + 'he will cross westward with what is left and wait for the Egyptians, and the '
      + 'Babylonian Chronicle will stop mentioning him — not because he died in a battle '
      + 'anybody recorded, but because there stopped being anything to say.',
    'Ashur-uballit II held Harran after 612 with Egyptian support; after its loss in 610 he disappears from the Babylonian Chronicle without a recorded death.',
    'Note how an empire actually ends',
    '+25 legitimacy and "How Empires End" (+0.25 legitimacy a month, +8% morale, +6% manpower) permanently.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { legitimacy: 25, mar: 20 });
      mod(ctx, 'p732_how_empires_end', 'How Empires End', { legitimacyAdd: 0.25, moraleMult: 1.08, manpowerMult: 1.06 });
      powerMod(ctx, 'ASR', 'p732_no_capital_no_god', 'No Capital, No God', { incomeMult: 0.8, moraleMult: 0.8 }, -1);
      h.chronicle(ctx, 'era', 'The last Assyrian king crosses the Euphrates westward with a field army and no country, and the chronicle simply stops writing his name.');
    }),
];
