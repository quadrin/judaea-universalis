// Judaea Universalis — the great powers, 594–447 BCE (SPEC §283). Content
// package. Zero imports; every effect runs through ctx.helpers.
//
// The chapter in which a Jewish state does not exist is the chapter in which
// the rest of the world is at its most interesting, and it carried sixteen
// world cards for a hundred and fifty-two years.
//
// What is in here: Solon; a sacred war over a road to a shrine; Carthage
// taking the islands; the Ishtar Gate; Amasis; Croesus paying for a temple;
// a tyrant at Athens; Cyrus taking Ecbatana, which is the founding act of the
// Persian empire and was not on the board at all; Alalia, where a Greek fleet
// wins a battle and has to leave anyway; the first tragedy; Cyrus dying in
// the east; Behistun; Persepolis; a bridge of boats over the Bosporus; the
// Tarquin driven out of Rome; Cleisthenes; the Etruscans losing the Latin
// plain; a canal from the Nile to the Red Sea; Cumae; the Long Walls; the
// Twelve Tables; and a building on a rock above Athens.
//
// Sources: Herodotus I, III, IV, V and VII; Thucydides I; Aristotle,
// Constitution of Athens; the Nabonidus Chronicle and the Cyrus Cylinder; the
// Behistun inscription and the Persepolis fortification tablets; the Suez
// stelae of Darius; Livy I-III and the Fasti for Rome; Diodorus XI for Cumae;
// Justin XVIII and the Nora and Motya evidence for Carthage in the islands.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_597bce_powers] ' + key, e || '');
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

export const EVENTS_597_POWERS = [

  W('ev597p2_solon', 'The Shaking Off of Burdens', -594, 4,
    'Solon reforms Athens',
    'A Greek city on the edge of civil war has handed one man the power to rewrite '
      + 'everything, and he has used it to cancel all debts secured on the person, free '
      + 'everybody already enslaved for debt, buy back those sold abroad, and forbid the '
      + 'practice for ever.\n\nHe then refused the tyranny he was offered, made everybody '
      + 'swear to the laws for ten years, and left the country so that he could not be '
      + 'asked to amend them. Both halves of that are unusual. The second is nearly '
      + 'unheard of.',
    'Solon\'s seisachtheia of 594 cancelled debt-bondage at Athens; Aristotle (Constitution of Athens 5-12) records his refusal of the tyranny and voluntary exile.',
    'Ask what a debt cancellation actually costs',
    '+40 governance points, +20 legitimacy and "The Burdens Shaken Off" (+0.25 legitimacy a month, −0.8 unrest everywhere, −6% income) permanently.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { gov: 40, legitimacy: 20 });
      mod(ctx, 'p597_burdens_shaken_off', 'The Burdens Shaken Off', { legitimacyAdd: 0.25, unrestAll: -0.8, incomeMult: 0.94 });
      powerMod(ctx, 'ATH', 'p597_no_man_a_pledge', 'No Man a Pledge for His Body', { manpowerMult: 1.12, unrestAll: -0.5 }, -1);
      h.chronicle(ctx, 'era', 'A Greek city frees everybody enslaved for debt in a single year, and the man who did it leaves the country rather than be asked to undo it.');
    }),

  W('ev597p2_the_sacred_war', 'A War About a Road', -590, 7,
    'The First Sacred War',
    'A league of Greek states has destroyed a town for charging pilgrims to use the road '
      + 'to a shrine. The town is gone — walls down, land cursed and dedicated to the god, '
      + 'forbidden to be farmed for ever — and the shrine is now administered by the league '
      + 'that destroyed it.\n\nIt is the first war anybody in that world has fought over a '
      + 'sanctuary rather than a border, and it establishes the thing that makes Greek '
      + 'politics work: a council where states that are at war with each other still have '
      + 'to sit down about the god.',
    'The First Sacred War (c. 595-585) ended with the destruction of Kirrha and the Amphictyonic League\'s control of Delphi.',
    'Note that a shrine can be a state',
    '+30 influence points, +15 legitimacy and "The Council of the Shrine" (+0.2 legitimacy a month, +6% trade, −0.3 unrest everywhere) permanently.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { infl: 30, legitimacy: 15 });
      mod(ctx, 'p597_council_of_the_shrine', 'The Council of the Shrine', { legitimacyAdd: 0.2, tradeMult: 1.06, unrestAll: -0.3 });
      h.chronicle(ctx, 'era', 'A town is erased for taxing pilgrims, and the states that erased it discover they have invented a permanent council.');
    }),

  W('ev597p2_carthage_takes_the_islands', 'The New City Takes the Old Colonies', -583, 8,
    'Carthage takes the western islands',
    'The Phoenician city in Africa has stopped being one colony among many. With Tyre '
      + 'under siege and then under Babylonian supervision, the western settlements have '
      + 'nobody to answer to, and Carthage has spent a generation answering for them: '
      + 'garrisons on the big islands, a fleet, treaties with the Etruscans, and a war with '
      + 'the Greeks over the western half of the sea.\n\nThe mother city on its rock is '
      + 'still there. The Phoenician world is now run from Africa.',
    'Carthaginian hegemony over the western Phoenician settlements, Sardinia and western Sicily consolidates in the sixth century (Justin XVIII.7; the Nora and Motya evidence).',
    'Deal with Carthage as a power, not a colony',
    '+25 influence points and "The Western Capital" (+8% trade) permanently; Carthage gains "The Sea Behind the Pillars" (+14% income, +10% army strength) and Tyre "A Daughter Grown" (−8% income).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { infl: 25, treasury: 60 });
      mod(ctx, 'p597_western_capital', 'The Western Capital', { tradeMult: 1.08 });
      powerMod(ctx, 'CAR', 'p597_sea_behind_the_pillars', 'The Sea Behind the Pillars', { incomeMult: 1.14, milPowerMult: 1.1 }, -1);
      powerMod(ctx, 'TYR', 'p597_a_daughter_grown', 'A Daughter Grown', { incomeMult: 0.92 }, -1);
      opinion(ctx, 'CAR', me, 15);
      h.chronicle(ctx, 'era', 'The western Phoenician world stops sending its tithe to Tyre and starts sending it to Carthage, which nobody in Tyre is in a position to object to.');
    }),

  W('ev597p2_the_ishtar_gate', 'A Gate of Blue Brick', -575, 3,
    'Babylon is rebuilt',
    'Babylon has been rebuilt on a scale that has no precedent: a double wall a carriage '
      + 'can be driven along the top of, a processional way paved in stone, a ziggurat '
      + 'raised again to its full height, and a gate faced entirely in glazed blue brick '
      + 'with bulls and dragons in relief, built so that the whole city walks through it in '
      + 'procession once a year.\n\nIt is paid for by the tribute of everything between the '
      + 'Gulf and the Egyptian frontier, including this country, and a great many of the '
      + 'people who laid the brick were carried there from here.',
    'Nebuchadnezzar II\'s building programme at Babylon included the Ishtar Gate, the Processional Way and Etemenanki, funded by imperial tribute and deportee labour.',
    'Send the craftsmen the empire asks for',
    '−60 talents and "What Our Hands Built" (+8% production, +0.2 legitimacy a month, +0.4 unrest everywhere) permanently; Babylon gains "The City Without Rival" (+12% income, +6% morale).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { treasury: -60, gov: 20 });
      mod(ctx, 'p597_what_our_hands_built', 'What Our Hands Built', { prodMult: 1.08, legitimacyAdd: 0.2, unrestAll: 0.4 });
      powerMod(ctx, 'BBL', 'p597_city_without_rival', 'The City Without Rival', { incomeMult: 1.12, moraleMult: 1.06 }, -1);
      h.chronicle(ctx, 'era', 'Babylon is faced in blue brick with the tribute of the world, and a good deal of the labour that lays it was born in this country.');
    }),

  W('ev597p2_amasis', 'The General Who Became Pharaoh', -570, 9,
    'Amasis takes Egypt',
    'Egypt has had a coup. The army mutinied against a pharaoh who had spent native '
      + 'soldiers on a foreign war and kept Greek mercenaries for the palace, and the '
      + 'general they proclaimed instead was a common man with no royal blood and a '
      + 'reputation as a drunk and a thief.\n\nHe is going to rule for forty-four years, '
      + 'preside over the richest stretch Egypt has had in five centuries, give the Greeks '
      + 'a chartered city, marry a Cyrenean, and die three months before the Persians '
      + 'arrive, which is the best timing any pharaoh ever managed.',
    'Amasis II (570-526) came to power by military coup against Apries; Herodotus II.161-182 gives the account of his reign and reputation.',
    'Recognise him and trade',
    '+120 talents, +20 influence points and "The Rich Delta" (+9% trade, +6% income) for forty years; Egypt gains "Forty-Four Good Years" (+14% income, +8% growth).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { treasury: 120, infl: 20 });
      mod(ctx, 'p597_rich_delta', 'The Rich Delta', { tradeMult: 1.09, incomeMult: 1.06 }, 480);
      powerMod(ctx, 'MIZ', 'p597_forty_four_good_years', 'Forty-Four Good Years', { incomeMult: 1.14, growthMult: 1.08 }, -1);
      opinion(ctx, 'MIZ', me, 20);
      h.chronicle(ctx, 'era', 'Egypt is taken over by a general of no family who turns out to be the best administrator it has had in five hundred years.');
    }),

  W('ev597p2_croesus_pays_for_a_temple', 'The Richest Man Anybody Has Heard Of', -568, 6,
    'Lydia at its height',
    'The Lydian king is paying for the rebuilding of the greatest temple in the Greek '
      + 'world, in a Greek city he has conquered, with his name on the columns. He is also '
      + 'sending gold to Delphi by the cartload, entertaining Greek wise men, and minting '
      + 'the first coins anybody has struck in pure gold and pure silver rather than a '
      + 'natural alloy.\n\nThe electrum came out of a river. The refining is his own '
      + 'invention, and it is the reason his name will mean wealth in languages that do not '
      + 'exist yet.',
    'Croesus funded the Artemision at Ephesus and introduced bimetallic gold and silver coinage; Herodotus I.14-51 records his dedications at Delphi.',
    'Change our reserve into the new coin',
    '+150 talents and "Refined Metal" (+10% trade, +6% income, −5% cost of governing) permanently; Lydia gains "The Golden King" (+16% income).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { treasury: 150, gov: 20 });
      mod(ctx, 'p597_refined_metal', 'Refined Metal', { tradeMult: 1.1, incomeMult: 1.06, adminMult: 0.95 });
      powerMod(ctx, 'LYD', 'p597_the_golden_king', 'The Golden King', { incomeMult: 1.16 }, -1);
      h.chronicle(ctx, 'era', 'Coins of refined gold and refined silver appear in the markets, and every merchant who handles them stops carrying scales.');
    }),

  W('ev597p2_the_tyrant_of_athens', 'The Tyrant Who Was Good At It', -561, 8,
    'Pisistratus takes Athens',
    'Athens has a tyrant. He took the citadel with a bodyguard he was voted after showing '
      + 'the assembly wounds he had probably given himself, was thrown out twice, came back '
      + 'the second time in a chariot beside a very tall woman dressed as the city\'s '
      + 'goddess, and has now settled in.\n\nHe is going to keep Solon\'s laws, lend money '
      + 'to smallholders, fix the olive and pottery trade, build an aqueduct and organise '
      + 'the festivals that turn into the theatre. Tyranny, competently done, is how this '
      + 'city becomes rich enough to be a democracy.',
    'Pisistratus ruled Athens intermittently from 561 and continuously from 546; Herodotus I.59-64 and Aristotle (Constitution of Athens 14-16) describe both the seizures and the administration.',
    'Note what a tyrant is actually for',
    '+35 governance points and "The Competent Hand" (+9% income, +7% growth, −0.4 unrest everywhere, −0.15 legitimacy a month) for forty years; Athens gains "The Olive and the Pot" (+14% trade, +8% growth).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { gov: 35, legitimacy: -8 });
      mod(ctx, 'p597_competent_hand', 'The Competent Hand', { incomeMult: 1.09, growthMult: 1.07, unrestAll: -0.4, legitimacyAdd: -0.15 }, 480);
      powerMod(ctx, 'ATH', 'p597_olive_and_pot', 'The Olive and the Pot', { tradeMult: 1.14, growthMult: 1.08 }, -1);
      h.chronicle(ctx, 'era', 'A Greek city is taken over by one man who then spends thirty years making it rich, which is the part the story usually leaves out.');
    }),

  W('ev597p2_cyrus_takes_ecbatana', 'A Vassal Takes His Overlord', -550, 4,
    'Persia absorbs Media',
    'The Median empire has been taken over from inside. A king of a southern province — a '
      + 'vassal, married into the royal house, ruling a highland nobody thought much '
      + 'about — revolted, and when the Median army was sent against him it arrested its '
      + 'own king and handed him over.\n\nThere is no new empire and no conquest to report. '
      + 'The same administration, the same nobility and the same army are now answering to '
      + 'a different court, and the man they answer to is thirty and has just started.',
    'Cyrus II of Anshan overthrew Astyages between 553 and 550; the Nabonidus Chronicle records the Median army revolting and delivering its king to Cyrus.',
    'Send the embassy west to the new court',
    'Media\'s ground and government pass to Persia. +35 influence points and "The Name We Did Not Know" (+0.2 legitimacy a month, +6% trade) permanently.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      const held = ctx.game.provinces.filter((p) => p && !p.impassable && p.owner === 'MDA').length;
      endCourt(ctx, 'MDA', 'PAS');
      h.adjust(ctx, me, { infl: 35 });
      mod(ctx, 'p597_name_we_did_not_know', 'The Name We Did Not Know', { legitimacyAdd: 0.2, tradeMult: 1.06 });
      powerMod(ctx, 'PAS', 'p597_the_median_army', 'The Median Army, Under New Orders', { milPowerMult: 1.18, manpowerMult: 1.15, incomeMult: 1.1 }, -1);
      opinion(ctx, 'PAS', me, 15);
      h.chronicle(ctx, 'era', 'The Median empire changes hands without being conquered. ' + held
        + ' provinces answer to a Persian, and everything else about the administration stays exactly where it was.');
    }),

  W('ev597p2_alalia', 'A Victory They Had to Leave After', -540, 6,
    'The battle of Alalia',
    'The Phocaeans — Greeks who abandoned their own city rather than submit to Persia and '
      + 'sailed west with everything they owned — planted a colony on the big island north '
      + 'of the Etruscan coast and spent five years raiding everything that moved. Carthage '
      + 'and the Etruscans combined against them.\n\nThe Greeks won the sea fight and lost '
      + 'two thirds of their ships doing it, and then abandoned the island anyway. The '
      + 'western sea is now divided between Carthage and Etruria by agreement, and the '
      + 'agreement holds for a century.',
    'The battle of Alalia (c. 540-535) was a Phocaean "Cadmean victory" against a Carthaginian-Etruscan fleet, after which the Phocaeans left Corsica (Herodotus I.166-167).',
    'Note who now owns the western sea',
    '+25 influence points and "The Sea Is Divided" (+7% trade) permanently; Carthage and Etruria each gain "The Western Agreement" (+8% income, +5% morale).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { infl: 25 });
      mod(ctx, 'p597_sea_is_divided', 'The Sea Is Divided', { tradeMult: 1.07 });
      powerMod(ctx, 'CAR', 'p597_western_agreement_car', 'The Western Agreement', { incomeMult: 1.08, moraleMult: 1.05 }, -1);
      powerMod(ctx, 'ETR', 'p597_western_agreement_etr', 'The Western Agreement', { incomeMult: 1.08, moraleMult: 1.05 }, -1);
      h.chronicle(ctx, 'era', 'A Greek fleet wins a battle it cannot afford and sails away from the island it won, and two other powers divide the sea behind it.');
    }),

  W('ev597p2_the_first_tragedy', 'A Man Answered the Chorus', -534, 3,
    'Tragedy is invented at Athens',
    'At the city festival a performer stepped out of the singing chorus, put on a mask, '
      + 'and answered it in the voice of somebody else. Until this year a Greek chorus sang '
      + 'about a god. This year a man pretended to be one, and argued.\n\nIt is a small '
      + 'technical change in a religious festival in one city. Within eighty years it will '
      + 'be the form in which that world does its hardest thinking about law, family, '
      + 'obligation and the gods, and it will still be in use twenty-five centuries later.',
    'Thespis is traditionally credited with introducing the first actor distinct from the chorus at the City Dionysia around 534.',
    'Send somebody to watch it',
    '+20 influence points, +15 legitimacy and "The Man in the Mask" (+0.2 legitimacy a month, −0.4 unrest everywhere) permanently.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { infl: 20, legitimacy: 15 });
      mod(ctx, 'p597_man_in_the_mask', 'The Man in the Mask', { legitimacyAdd: 0.2, unrestAll: -0.4 });
      h.chronicle(ctx, 'era', 'A man steps out of the chorus and argues with it, which is reported here as a curiosity of a foreign festival.');
    }),

  W('ev597p2_cyrus_dies_in_the_east', 'The King Is Killed by a Queen', -530, 9,
    'Cyrus dies on the steppe',
    'The king who took Media, Lydia, Babylon and everything between them is dead on the '
      + 'far side of the empire, fighting nomads on a river nobody here can name, in a '
      + 'campaign that had no purpose anyone can reconstruct.\n\nThe Greeks say he was '
      + 'beaten by a queen of the horse-people who had his head put in a skin of blood so '
      + 'he could drink his fill of it. The Persians say nothing at all about how he died, '
      + 'which is its own kind of answer.',
    'Cyrus II died on campaign against the Massagetae in 530; Herodotus I.205-214 gives the account of Tomyris, noting that many versions circulated.',
    'Learn what an empire does when its founder dies',
    '+30 governance points and "The Second King Is the Test" (+0.2 legitimacy a month, +6% income) permanently.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { gov: 30, infl: 15 });
      mod(ctx, 'p597_second_king_is_the_test', 'The Second King Is the Test', { legitimacyAdd: 0.2, incomeMult: 1.06 });
      h.chronicle(ctx, 'era', 'The founder of the largest empire the world has seen dies fighting nomads on a river his own scribes cannot place.');
    }),

  W('ev597p2_behistun', 'A Wall of Rock Three Hundred Feet Up', -521, 7,
    'Darius carves the Behistun inscription',
    'The new Persian king has had his account of how he took the throne carved into a '
      + 'cliff above the main road, three hundred feet up, in three languages, with a relief '
      + 'of himself standing on a man and nine bound kings roped by the neck — and then had '
      + 'the approach ledges cut away so that nobody can reach it to alter it.\n\nCopies '
      + 'have gone out to every province in every language of the empire. It is the most '
      + 'thorough piece of official history anybody has attempted, and the reason the '
      + 'thoroughness is necessary is visible in the first line of it.',
    'The Behistun inscription of Darius I (c. 520) is trilingual, deliberately inaccessible, and was circulated in copies across the empire — including an Aramaic version found at Elephantine.',
    'Read the copy the satrap posts',
    '+35 influence points, +15 legitimacy and "The Official Version" (+0.25 legitimacy a month, −0.5 unrest everywhere) permanently; Persia gains "One Story, Every Language" (+8% income, −0.4 unrest everywhere).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { infl: 35, legitimacy: 15 });
      mod(ctx, 'p597_official_version', 'The Official Version', { legitimacyAdd: 0.25, unrestAll: -0.5 });
      powerMod(ctx, 'PAS', 'p597_one_story_every_language', 'One Story, Every Language', { incomeMult: 1.08, unrestAll: -0.4 }, -1);
      h.chronicle(ctx, 'era', 'The king\'s account of his own accession is posted in every province in the local language, which is how everybody learns there was something to explain.');
    }),

  W('ev597p2_persepolis', 'A Capital Nobody Is Meant to Live In', -518, 5,
    'Persepolis is begun',
    'The Persians have started building a ceremonial capital on a terrace in the highland '
      + 'that no road system connects properly and that the court will visit for a few weeks '
      + 'a year. The reliefs on the stairs show every nation of the empire bringing its own '
      + 'gift in its own dress, walking up in procession — Medes, Lydians, Bactrians, '
      + 'Arabs, Kushites, Ionians, all of them.\n\nNobody is shown kneeling. That is the '
      + 'point, and it is a different idea of empire from the one that flayed people on '
      + 'palace walls a century and a half ago.',
    'Persepolis was begun under Darius I around 518; the Apadana reliefs depict delegations of subject peoples bringing gifts, without depictions of subjugation.',
    'Rehearse our own delegation',
    '−70 talents, +30 influence points and "Our Place in the Procession" (+0.25 legitimacy a month, +6% trade, −0.4 unrest everywhere) permanently; Persia\'s regard improves by 25.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { treasury: -70, infl: 30, legitimacy: 12 });
      mod(ctx, 'p597_place_in_the_procession', 'Our Place in the Procession', { legitimacyAdd: 0.25, tradeMult: 1.06, unrestAll: -0.4 });
      opinion(ctx, 'PAS', me, 25);
      h.chronicle(ctx, 'era', 'A delegation goes east with a gift chosen to look right on a staircase, which is the whole of what the new empire asks of its subjects in public.');
    }),

  W('ev597p2_the_bridge_of_boats', 'A Bridge Made of Ships', -513, 8,
    'Darius crosses into Europe',
    'The Persian king has put an army across the narrows on a bridge of ships lashed '
      + 'together, marched it through Thrace, thrown a second bridge over the great river '
      + 'beyond, and gone north after the horse-people who have no cities to take and no '
      + 'army to beat.\n\nHe came back. That is the most that can be said for the campaign, '
      + 'and it is not nothing: the empire now holds the European shore, the Greek cities '
      + 'of the straits, and a road into a continent it had no reason to want.',
    'Darius I\'s Scythian expedition of c. 513 crossed the Bosporus and the Danube on pontoon bridges and secured Thrace for Persia (Herodotus IV.83-144).',
    'Note that the empire is now in two continents',
    '+25 martial points, +20 influence points and "Two Continents" (+7% trade, +5% manpower) permanently; Thrace passes under Persian supervision.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { mar: 25, infl: 20 });
      mod(ctx, 'p597_two_continents', 'Two Continents', { tradeMult: 1.07, manpowerMult: 1.05 });
      powerMod(ctx, 'THR', 'p597_under_persian_supervision', 'Under Persian Supervision', { incomeMult: 0.92, milPowerMult: 0.92 }, -1);
      powerMod(ctx, 'PAS', 'p597_the_european_shore', 'The European Shore', { incomeMult: 1.05 }, -1);
      h.chronicle(ctx, 'era', 'An army crosses from one continent to another on a road of lashed ships, comes back having achieved nothing, and leaves a province behind it.');
    }),

  W('ev597p2_the_tarquin_driven_out', 'The Town on the Tiber Throws Out Its King', -510, 5,
    'The Roman republic begins',
    'The Latin town at the river crossing has expelled its king — an Etruscan, the last of '
      + 'three — after a crime in his household that the town decided it would not tolerate, '
      + 'and has sworn an oath never to have another.\n\nIn place of the king they have two '
      + 'magistrates who hold office for one year, check each other, and go back to being '
      + 'ordinary afterwards. It is one small town among dozens on that plain. The '
      + 'arrangement is going to outlive every empire on this board.',
    'The traditional date for the expulsion of Tarquinius Superbus and the founding of the Roman republic is 509 (Livy I.57-60, II.1-2).',
    'File it under curiosities of the far west',
    '+20 governance points, +10 legitimacy and "Two Magistrates, One Year" (+0.2 legitimacy a month, −6% cost of governing) permanently; Rome gains "The Oath Against Kings" (+10% manpower, +8% morale).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { gov: 20, legitimacy: 10 });
      mod(ctx, 'p597_two_magistrates', 'Two Magistrates, One Year', { legitimacyAdd: 0.2, adminMult: 0.94 });
      powerMod(ctx, 'ROM', 'p597_oath_against_kings', 'The Oath Against Kings', { manpowerMult: 1.1, moraleMult: 1.08 }, -1);
      h.chronicle(ctx, 'era', 'A town of no importance on a river in Italy expels its king and swears never to have another, and the chancery files the report under curiosities.');
    }),

  W('ev597p2_cleisthenes', 'The City Is Cut Into Tenths', -508, 6,
    'The Athenian democracy',
    'Athens has reorganised itself on purpose. The old kin-based tribes are abolished and '
      + 'replaced by ten new ones, each deliberately assembled out of three unconnected '
      + 'districts — a stretch of coast, a stretch of inland, a stretch of the city — so '
      + 'that no tribe is anybody\'s neighbourhood and no great family can deliver one.'
      + '\n\nThe council is drawn by lot from all ten. It is the most deliberate act of '
      + 'political engineering anybody in this world has attempted, and it works.',
    'Cleisthenes\' reforms of 508/7 created ten artificial tribes from separated trittyes and a council of five hundred chosen by lot (Herodotus V.66-73; Aristotle, Constitution of Athens 20-21).',
    'Consider whether a council can be drawn by lot',
    '+40 governance points, +20 legitimacy and "Drawn By Lot" (+0.3 legitimacy a month, −0.6 unrest everywhere, −6% income) permanently; Athens gains "Ten Tribes" (+12% manpower, +10% morale).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { gov: 40, legitimacy: 20 });
      mod(ctx, 'p597_drawn_by_lot', 'Drawn By Lot', { legitimacyAdd: 0.3, unrestAll: -0.6, incomeMult: 0.94 });
      powerMod(ctx, 'ATH', 'p597_ten_tribes', 'Ten Tribes', { manpowerMult: 1.12, moraleMult: 1.1 }, -1);
      h.chronicle(ctx, 'era', 'A city redraws its own tribes on a map so that no great house can deliver one, and then chooses its council by lottery.');
    }),

  W('ev597p2_aricia', 'The Etruscans Lose the Plain', -504, 3,
    'Etruria is pushed out of Latium',
    'The Etruscan army that was to put the expelled king back on his throne — and, '
      + 'incidentally, to hold the whole plain south of the Tiber — has been beaten in '
      + 'front of a Latin town by the Latins and a Greek fleet from the bay together.\n\n'
      + 'Etruria will keep its cities, its metal and its fleet for another century. What it '
      + 'has lost today is the land route south, and with it the only chance anybody had of '
      + 'stopping the town at the river crossing from becoming the largest thing on that '
      + 'plain.',
    'The defeat of Lars Porsenna\'s forces at Aricia (c. 504) by the Latins and Aristodemus of Cumae ended Etruscan expansion into Latium (Livy II.14; Dionysius V-VII).',
    'Note who is now unopposed on that plain',
    '+20 influence points and "The Plain Is Open" (+5% trade, +0.2 legitimacy a month) permanently; Etruria gains "The Road South Is Shut" (−10% income, −8% army strength) and Rome "Nobody Above Us" (+10% growth).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { infl: 20 });
      mod(ctx, 'p597_plain_is_open', 'The Plain Is Open', { tradeMult: 1.05, legitimacyAdd: 0.2 });
      powerMod(ctx, 'ETR', 'p597_road_south_shut', 'The Road South Is Shut', { incomeMult: 0.9, milPowerMult: 0.92 }, -1);
      powerMod(ctx, 'ROM', 'p597_nobody_above_us', 'Nobody Above Us', { growthMult: 1.1 }, -1);
      h.chronicle(ctx, 'era', 'The Etruscans are beaten out of the Latin plain, and the only power left on it is a town that has just abolished its monarchy.');
    }),

  W('ev597p2_the_canal_to_the_red_sea', 'A Ship Sails From the Nile to the Gulf', -486, 8,
    'Darius cuts the Suez canal',
    'The Persians have finished a canal the Egyptians began and abandoned: from the eastern '
      + 'branch of the Nile, through the bitter lakes, to the gulf that runs down to the '
      + 'incense coast. Stelae in Egyptian and Old Persian stand along it saying so.\n\n'
      + 'It is wide enough for two triremes to pass and takes four days. A ship can now go '
      + 'from the Mediterranean to Arabia without unloading, which reorders the price of '
      + 'every southern good in every market between here and Greece.',
    'Darius I completed the canal from the Pelusiac Nile to the Red Sea; his stelae record that ships sailed from Egypt to Persia by it.',
    'Reprice the southern trade',
    '+110 talents and "The Water Road South" (+10% trade, −5% income from the caravan tolls) permanently; Egypt gains "The Canal Tolls" (+10% income) and Qedar "The Road Undercut" (−10% income).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { treasury: 110, infl: 15 });
      mod(ctx, 'p597_water_road_south', 'The Water Road South', { tradeMult: 1.1, incomeMult: 0.95 });
      powerMod(ctx, 'MIZ', 'p597_canal_tolls', 'The Canal Tolls', { incomeMult: 1.1 }, -1);
      powerMod(ctx, 'QDR', 'p597_road_undercut', 'The Road Undercut', { incomeMult: 0.9 }, -1);
      h.chronicle(ctx, 'era', 'A ship goes from the Nile to the incense coast without unloading, and every caravan master between here and the desert reads the news twice.');
    }),

  W('ev597p2_cumae', 'The Etruscan Fleet Is Broken', -474, 5,
    'Syracuse breaks Etruria at sea',
    'The Greek tyrant of the great Sicilian city has destroyed the Etruscan fleet in the '
      + 'bay off Cumae and dedicated a captured helmet at Olympia with an inscription '
      + 'naming the loser.\n\nEtruria has been the naval power of that sea for two hundred '
      + 'years and has just stopped being one, in an afternoon, in a battle fought about '
      + 'somebody else\'s colony. The metal cities keep the mines and lose the sea, and '
      + 'from here everything that happens to them happens by land.',
    'Hiero I of Syracuse defeated the Etruscan fleet off Cumae in 474; the dedicated helmet with his inscription survives (Diodorus XI.51; Pindar, Pythian 1).',
    'Note who commands the western sea now',
    '+20 influence points and "The Sea Changes Hands" (+6% trade) permanently; Etruria gains "No Fleet" (−12% income, −10% army strength) and Syracuse "Master of the Strait" (+12% income, +8% army strength).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { infl: 20 });
      mod(ctx, 'p597_sea_changes_hands', 'The Sea Changes Hands', { tradeMult: 1.06 });
      powerMod(ctx, 'ETR', 'p597_no_fleet', 'No Fleet', { incomeMult: 0.88, milPowerMult: 0.9 }, -1);
      powerMod(ctx, 'SYC', 'p597_master_of_the_strait', 'Master of the Strait', { incomeMult: 1.12, milPowerMult: 1.08 }, -1);
      h.chronicle(ctx, 'era', 'The Etruscan fleet is destroyed in an afternoon and a helmet with the winner\'s name on it is nailed up at Olympia.');
    }),

  W('ev597p2_the_long_walls', 'A City That Made Itself an Island', -460, 4,
    'Athens builds the Long Walls',
    'Athens has built two walls four miles long from the city to its harbour and walled the '
      + 'harbour too, so that the whole thing — city, road, port — is one fortification.\n\n'
      + 'The consequence is that Athens can no longer be starved by anybody who does not '
      + 'control the sea, which nobody does. It has converted itself from a country with a '
      + 'city in it into a city with a fleet, and it can now lose every field in Attica and '
      + 'not care. It will find out what else that costs.',
    'The Long Walls linking Athens to Piraeus were built c. 461-456, making the city impregnable to land siege while the fleet held the sea (Thucydides I.107-108).',
    'Understand what walls to a harbour mean',
    '+30 martial points and "Walls to the Water" (+1 fort defence, +8% trade, −0.4 unrest everywhere) permanently; Athens gains "A City With a Fleet" (+14% trade, +10% morale).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { mar: 30, gov: 15 });
      mod(ctx, 'p597_walls_to_the_water', 'Walls to the Water', { fortDefBonus: 1, tradeMult: 1.08, unrestAll: -0.4 });
      powerMod(ctx, 'ATH', 'p597_city_with_a_fleet', 'A City With a Fleet', { tradeMult: 1.14, moraleMult: 1.1 }, -1);
      h.chronicle(ctx, 'era', 'A city walls the four miles to its own harbour and stops being besiegeable by anybody without a navy.');
    }),

  W('ev597p2_the_twelve_tables', 'The Law on Twelve Boards', -451, 7,
    'Rome writes the Twelve Tables',
    'The town on the Tiber has had a long argument about the fact that its law was known '
      + 'only to the priests and the old families, who were also the judges. It has ended '
      + 'with a commission of ten writing the whole of it out on twelve boards and putting '
      + 'them up in the market place.\n\nThe content is harsh and mostly about debt, '
      + 'property and procedure. What matters is that a man who cannot read can have it read '
      + 'to him, and that from now on everything that town does to anybody has to be '
      + 'findable on a board.',
    'The Twelve Tables were compiled c. 451-450 and published in the Roman forum, making the law publicly accessible (Livy III.33-37).',
    'File the report and keep the copy',
    '+30 governance points, +15 legitimacy and "The Law On Boards" (+0.2 legitimacy a month, −6% cost of governing, −0.4 unrest everywhere) permanently; Rome gains "Findable Law" (+8% growth, −0.4 unrest everywhere).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { gov: 30, legitimacy: 15 });
      mod(ctx, 'p597_law_on_boards', 'The Law On Boards', { legitimacyAdd: 0.2, adminMult: 0.94, unrestAll: -0.4 });
      powerMod(ctx, 'ROM', 'p597_findable_law', 'Findable Law', { growthMult: 1.08, unrestAll: -0.4 }, -1);
      h.chronicle(ctx, 'era', 'A western town writes its whole law on twelve boards and nails them up where anybody can have them read aloud.');
    }),

  W('ev597p2_the_parthenon', 'A Building Paid For With Somebody Else\'s Defence Fund', -447, 9,
    'The Parthenon is begun',
    'Athens has moved the treasury of the league it leads — the fund every allied city pays '
      + 'into to keep a fleet against Persia — from the island where it was kept to Athens, '
      + 'and has begun spending the surplus on a temple.\n\nThe allies have pointed out, '
      + 'reasonably, that this is their money. The Athenian answer, delivered in the '
      + 'assembly and recorded, is that they are paying for protection, they are getting '
      + 'protection, and what Athens does with the change is not their business. The '
      + 'building is going to be extraordinary.',
    'The Delian League treasury was moved to Athens in 454 and the Parthenon begun in 447; Plutarch (Pericles 12) records the controversy over spending allied contributions.',
    'Note how a league becomes an empire',
    '+35 influence points and "What a League Turns Into" (+0.25 legitimacy a month, +7% income, +6% trade) permanently; Athens gains "The Treasury Moved" (+15% income, +6% morale).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { infl: 35, gov: 15 });
      mod(ctx, 'p597_what_a_league_turns_into', 'What a League Turns Into', { legitimacyAdd: 0.25, incomeMult: 1.07, tradeMult: 1.06 });
      powerMod(ctx, 'ATH', 'p597_treasury_moved', 'The Treasury Moved', { incomeMult: 1.15, moraleMult: 1.06 }, -1);
      h.chronicle(ctx, 'era', 'A defensive league\'s treasury is moved to the leading city and spent on a temple, which is how every league in history has ended.');
    }),
];
