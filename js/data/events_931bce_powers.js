// Judaea Universalis — the great powers, 911–717 BCE (SPEC §283). Content
// package. Zero imports; every effect runs through ctx.helpers.
//
// The 931 BCE chapter runs two hundred and eighteen years and its world spine
// carried eleven cards. Eleven. In that window Assyria goes from a rump on the
// Tigris to the first empire that governs conquered ground instead of raiding
// it, Egypt comes apart and is put back together by Kushites, the Phoenicians
// reach Spain and start the silver trade that pays for all of it, the Greeks
// take the Phoenician letters and invent a literature, Etruria builds cities,
// and Carchemish — the last great Neo-Hittite state, six provinces on this
// board — is annexed out of existence.
//
// A world spine is how a chapter says its player is a minor power. Eleven
// cards over two centuries says it badly.
//
// Sources: the Assyrian eponym canon and the annals of Adad-nirari II,
// Ashurnasirpal II, Shalmaneser III, Shamshi-Adad V, Adad-nirari III,
// Tiglath-Pileser III and Sargon II; the Nimrud and Khorsabad inscriptions;
// the Piye victory stele; the Kurkh monolith; Herodotus V.58 for the letters;
// the Al Mina excavations; Thucydides VI.3-4 and Strabo V for Cumae and
// Etruria; Pausanias IV for the Messenian wars; the Nora stone and the
// Tartessian silver hoards.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_931bce_powers] ' + key, e || '');
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

export const EVENTS_931_POWERS = [

  W('ev931p_assyria_comes_back', 'The Rump on the Tigris Stands Up', -911, 4,
    'Assyria begins to recover',
    'For two hundred years Assyria has been a small country around three cities, paying '
      + 'Aramaean chiefs to leave its farmland alone. This year it stopped. The new king '
      + 'has gone out on campaign every single season, taken back the grain land west of '
      + 'the Tigris one district at a time, and begun rebuilding the road system.\n\n'
      + 'None of it reaches this far. What reaches this far, eventually, is the method: '
      + 'a standing army paid in silver, a survey of what every district owes, and a habit '
      + 'of going out every year whether or not there is a reason.',
    'Adad-nirari II (911-891) began the Neo-Assyrian recovery with annual campaigns that retook the Jezirah and the Khabur.',
    'Note the road-building, and count the years',
    '+25 influence points and "The News From the Tigris" (+6% income, −0.3 unrest everywhere) for forty years; Assyria gains "The Annual Campaign" (+10% army strength, +8% income).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { infl: 25 });
      mod(ctx, 'p931_news_from_the_tigris', 'The News From the Tigris', { incomeMult: 1.06, unrestAll: -0.3 }, 480);
      powerMod(ctx, 'ASR', 'p931_the_annual_campaign', 'The Annual Campaign', { milPowerMult: 1.1, incomeMult: 1.08 }, -1);
      h.chronicle(ctx, 'era', 'The Assyrian king goes out on campaign in the spring and comes back in the autumn, and does it again the next year, and the year after that.');
    }),

  W('ev931p_iron_is_everywhere', 'Everybody Has Iron Now', -900, 6,
    'Iron becomes ordinary',
    'The smiths have stopped treating iron as a rich man\'s curiosity. There is enough of '
      + 'it, and enough people who know how to carburise and quench it, that ploughshares, '
      + 'mattocks, sickles and axes are being made of it in ordinary villages.\n\nThe '
      + 'military consequence is the one everybody talks about. The real one is that a '
      + 'hillside which took a season to clear with bronze takes a month, and the terraces '
      + 'are going up the slopes in every direction at once.',
    'The Iron Age II transition sees iron move from prestige metal to everyday tool across the Levant, with a marked expansion of hill-country terracing.',
    'Put the smiths on the tax roll',
    '+35 governance points and "The Iron Villages" (+10% growth, +8% production, +5% manpower) permanently.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { gov: 35 });
      mod(ctx, 'p931_iron_villages', 'The Iron Villages', { growthMult: 1.1, prodMult: 1.08, manpowerMult: 1.05 });
      h.chronicle(ctx, 'era', 'Iron tools reach the ordinary village, and the terraces begin climbing slopes that nobody has farmed since the world began.');
    }),

  W('ev931p_the_euboeans_at_al_mina', 'Strangers in the North Harbour', -876, 8,
    'Greek traders reach the Levant',
    'There is a foreign quarter at the mouth of the Orontes: men from islands nobody here '
      + 'can place, drinking out of painted cups they brought with them, buying metal and '
      + 'selling nothing much yet. They are not colonists and not raiders. They are '
      + 'looking.\n\nThe Phoenician factors regard them as a nuisance and a customer. In '
      + 'about a century they will be a competitor, and in three they will own the western '
      + 'end of this sea.',
    'Euboean pottery at Al Mina and other north Syrian sites from the ninth century marks the earliest sustained Greek trading presence in the Levant.',
    'Sell to them and see what they have',
    '+20 influence points and "The Painted Cups" (+7% trade, +4% income) permanently; Tyre gains "New Competition" (+6% trade, −4% income).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { infl: 20 });
      mod(ctx, 'p931_painted_cups', 'The Painted Cups', { tradeMult: 1.07, incomeMult: 1.04 });
      powerMod(ctx, 'TYR', 'p931_new_competition', 'New Competition', { tradeMult: 1.06, incomeMult: 0.96 }, -1);
      h.chronicle(ctx, 'era', 'Painted cups from the western islands turn up in the north harbour, and then in every market between there and here.');
    }),

  W('ev931p_the_chaldeans_come_up_the_river', 'The Tribes in the Marshes', -845, 5,
    'The Chaldeans take southern Babylonia',
    'Babylon has a new problem and does not yet know it is the future. The Chaldean '
      + 'tribes of the southern marshes — five houses, date palms, buffalo, and a country '
      + 'nobody can march an army through — have taken the old cities of the south one by '
      + 'one and are now the largest organised power in lower Mesopotamia.\n\nThey are not '
      + 'Babylonians and they have spent two centuries being told so. They will, in due '
      + 'course, be kings of Babylon, and they will burn a temple in this country.',
    'Chaldean tribal houses (Bit-Yakin, Bit-Dakkuri, Bit-Amukani) dominate southern Babylonia from the ninth century; the Neo-Babylonian dynasty of 626 is Chaldean.',
    'Enter the new names in the chancery list',
    '+20 governance points and "The Names From the South" (+5% trade, +0.2 legitimacy a month) for sixty years; Babylon gains "The Tribes Inside the Walls" (−6% income, +0.5 unrest everywhere).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { gov: 20 });
      mod(ctx, 'p931_names_from_the_south', 'The Names From the South', { tradeMult: 1.05, legitimacyAdd: 0.2 }, 720);
      powerMod(ctx, 'BBL', 'p931_tribes_inside_the_walls', 'The Tribes Inside the Walls', { incomeMult: 0.94, unrestAll: 0.5 }, -1);
      h.chronicle(ctx, 'era', 'The chancery begins keeping a list of Chaldean house-names, because the men who answer for southern Mesopotamia now have them.');
    }),

  W('ev931p_the_silver_of_tarshish', 'The Silver of Tarshish', -836, 3,
    'Phoenicia reaches the far west',
    'The Tyrian ships have been going further west every decade and have now reached the '
      + 'end of the sea: a river valley beyond the pillars where silver comes out of the '
      + 'ground in quantities that do not make sense, traded by a people who have no idea '
      + 'what it is worth anywhere else.\n\nThe return voyage takes three years. The cargo '
      + 'pays for the ship, the crew, the ship\'s replacement and a temple. Every price in '
      + 'this sea is about to be quoted in a metal that just became common.',
    'Phoenician settlement at Gadir and the Tartessian silver trade are archaeologically attested from the ninth-eighth centuries; the influx measurably changed Near Eastern silver values.',
    'Take payment in silver while it is still dear',
    '+180 talents and "The Western Silver" (+9% trade, +6% income) permanently; Tyre gains "The Three-Year Voyage" (+15% trade, +10% income) and Tartessos "The Buyers Have Come" (+12% income).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { treasury: 180, infl: 15 });
      mod(ctx, 'p931_western_silver', 'The Western Silver', { tradeMult: 1.09, incomeMult: 1.06 });
      powerMod(ctx, 'TYR', 'p931_three_year_voyage', 'The Three-Year Voyage', { tradeMult: 1.15, incomeMult: 1.1 }, -1);
      powerMod(ctx, 'TRT', 'p931_the_buyers_have_come', 'The Buyers Have Come', { incomeMult: 1.12 }, -1);
      opinion(ctx, 'TYR', me, 15);
      h.chronicle(ctx, 'era', 'Ships come back from beyond the pillars three years out and so heavily laden that the price of silver falls in every market on this sea.');
    }),

  W('ev931p_the_assyrian_civil_war', 'Twenty-Seven Cities Against the King', -825, 6,
    'Assyria tears itself in half',
    'The Assyrian empire has spent four years fighting itself. The old king\'s eldest son '
      + 'raised twenty-seven cities against his father and his brother, including Nineveh '
      + 'and Assur, and for the length of it no Assyrian army came west at all.\n\nThe '
      + 'brother has won. What he has inherited is an empire that has stopped collecting '
      + 'from half its provinces, an army that has been killing its own veterans, and a '
      + 'set of western vassals who have noticed how long four years is.',
    'The revolt of Ashur-danin-pal against Shalmaneser III (c. 826-820) involved twenty-seven cities and was suppressed by Shamshi-Adad V with Babylonian help.',
    'Use the four years',
    '+45 martial points and "The Years Nobody Came" (+1 fort defence, +10% manpower, +6% income) for thirty years; Assyria gains "The Cities That Rose" (−12% army strength, −10% income) for twenty-five years.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { mar: 45, treasury: 80 });
      mod(ctx, 'p931_years_nobody_came', 'The Years Nobody Came', { fortDefBonus: 1, manpowerMult: 1.1, incomeMult: 1.06 }, 360);
      powerMod(ctx, 'ASR', 'p931_cities_that_rose', 'The Cities That Rose', { milPowerMult: 0.88, incomeMult: 0.9 }, 300);
      h.chronicle(ctx, 'era', 'For four years the Assyrian army is in Assyria, fighting Assyrians, and every court between the Euphrates and the sea quietly stops paying.');
    }),

  W('ev931p_a_queen_at_nineveh', 'The Queen Who Signed', -820, 9,
    'A woman rules Assyria in her son\'s name',
    'The king has died leaving a boy, and the boy\'s mother is governing — not as a '
      + 'regent behind a curtain but in public, with her name on the stelae beside her '
      + 'son\'s, dedications in her own right, and at least one campaign conducted while '
      + 'she was in charge of the empire.\n\nThe Assyrian court, which has never done this '
      + 'before and will not do it again, appears to have made no objection anybody wrote '
      + 'down. Four centuries from now the Greeks will have heard a garbled version and '
      + 'will make her the founder of Babylon.',
    'Sammuramat, mother of Adad-nirari III, appears on stelae alongside her son and is the historical kernel of the Greek Semiramis legend.',
    'Send the embassy to her, correctly addressed',
    '+30 influence points, +15 legitimacy and "The Letter to the Queen" (+0.2 legitimacy a month, +5% income) permanently; Assyria\'s regard improves by 20.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { infl: 30, legitimacy: 15 });
      mod(ctx, 'p931_letter_to_the_queen', 'The Letter to the Queen', { legitimacyAdd: 0.2, incomeMult: 1.05 });
      opinion(ctx, 'ASR', me, 20);
      h.chronicle(ctx, 'era', 'The embassy is addressed to the queen and to the king together, in that order, which the Assyrian chancery accepts without comment.');
    }),

  W('ev931p_the_medes_are_named', 'A Name Nobody Has Written Before', -810, 4,
    'The Medes enter the record',
    'The Assyrian tribute list has a new entry this year: a people on the plateau east of '
      + 'the mountains, horse-breeders, no cities worth the name, organised in something '
      + 'between a confederation and an argument. The scribe has written the name down for '
      + 'the first time.\n\nIt is a very long way away and it means nothing to anybody '
      + 'here. In two hundred years a coalition of these people will burn Nineveh, and in '
      + 'three hundred a king who began as their vassal will rule from the Aegean to the '
      + 'Indus.',
    'The Medes first appear in Assyrian records under Shalmaneser III and Adad-nirari III as tribute-paying peoples of the Zagros.',
    'Enter it in our own list too',
    '+25 governance points and "The Long List" (−6% cost of governing, +0.2 legitimacy a month) permanently — an archive that records what is not yet important.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { gov: 25, infl: 10 });
      mod(ctx, 'p931_the_long_list', 'The Long List', { adminMult: 0.94, legitimacyAdd: 0.2 });
      h.chronicle(ctx, 'era', 'A new people is entered in the chancery list against a country nobody here has seen, because the rule is to write down everything and decide later what mattered.');
    }),

  W('ev931p_the_letters_go_west', 'Twenty-Two Signs', -800, 7,
    'The Greeks take the alphabet',
    'The Greeks have taken the Phoenician letters. Not copied a few — taken the whole set, '
      + 'kept the order, kept most of the names, and then done something nobody on this '
      + 'coast thought of: used the signs they had no sound for as vowels.\n\nThe result '
      + 'can be learned by a child in a season instead of by a scribe in a decade. Writing '
      + 'has just stopped being a profession, and there is no court in this world that has '
      + 'understood yet what that will do.',
    'Herodotus V.58 credits the Phoenicians with bringing the letters to Greece; the earliest Greek alphabetic inscriptions date from around 800-750.',
    'Put the letters in the villages, not only the palace',
    '+40 governance points and "Writing Without Scribes" (+0.3 legitimacy a month, −8% cost of governing, +6% trade) permanently.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { gov: 40, legitimacy: 15 });
      mod(ctx, 'p931_writing_without_scribes', 'Writing Without Scribes', { legitimacyAdd: 0.3, adminMult: 0.92, tradeMult: 1.06 });
      h.chronicle(ctx, 'era', 'The alphabet crosses the sea and comes back with vowels in it. Within two generations there are ostraca in the hand of men who are not scribes.');
    }),

  W('ev931p_napata', 'The Kingdom at the Fourth Cataract', -790, 5,
    'Kush becomes a kingdom again',
    'Five hundred miles up the Nile, at the mountain the Egyptians used to call the holy '
      + 'place of Amun, there is a kingdom again — with a temple in the Egyptian style, '
      + 'kings buried under pyramids, Egyptian titles, Egyptian gods, and an army.\n\nThey '
      + 'consider themselves the legitimate custodians of an Egyptian religion that Egypt '
      + 'itself has let fall apart, and they are entirely serious about it. The four '
      + 'governments in the Delta have no idea what is coming up the river.',
    'The Napatan kingdom of Kush emerges in the ninth-eighth centuries with Egyptianising royal burials at el-Kurru and the cult of Amun at Jebel Barkal.',
    'Open the southern trade',
    '+120 talents and "The Road Up the River" (+8% trade, +5% income) permanently; Kush gains "The Custodians of Amun" (+10% army strength, +8% income) and Egypt "The Rival Claim" (−5% income, +0.4 unrest everywhere).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { treasury: 120, infl: 15 });
      mod(ctx, 'p931_road_up_the_river', 'The Road Up the River', { tradeMult: 1.08, incomeMult: 1.05 });
      powerMod(ctx, 'KSH', 'p931_custodians_of_amun', 'The Custodians of Amun', { milPowerMult: 1.1, incomeMult: 1.08 }, -1);
      powerMod(ctx, 'MIZ', 'p931_the_rival_claim', 'The Rival Claim', { incomeMult: 0.95, unrestAll: 0.4 }, -1);
      opinion(ctx, 'KSH', me, 20);
      h.chronicle(ctx, 'era', 'Ivory, ebony and gold come down the river from a kingdom that thinks it is more Egyptian than Egypt, and is arguably right.');
    }),

  W('ev931p_assyria_stops_marching', 'Three Plagues and a Revolt', -783, 8,
    'Assyria goes quiet for forty years',
    'Assyria has stopped. Not collapsed — stopped: three outbreaks of plague in a decade, '
      + 'a revolt in the capital, a run of weak kings, and an eponym list whose entries for '
      + 'year after year read "in the land", which is the scribal way of saying the army '
      + 'did not go anywhere.\n\nFor every small court between the Euphrates and Egypt '
      + 'this is the best forty years in living memory. It is also the last of them, and '
      + 'the man who ends it is alive now.',
    'The Assyrian eponym canon records plague in 765, 759 and a revolt in 763-759, with repeated entries of "in the land" for the reigns of Ashur-dan III and Ashur-nirari V.',
    'Spend the quiet years on the country',
    '+50 governance points and "The Forty Quiet Years" (+10% growth, +8% income, −0.6 unrest everywhere) for forty years; Assyria gains "In the Land" (−15% army strength, −10% income) for thirty-five years.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { gov: 50, treasury: 100 });
      mod(ctx, 'p931_forty_quiet_years', 'The Forty Quiet Years', { growthMult: 1.1, incomeMult: 1.08, unrestAll: -0.6 }, 480);
      powerMod(ctx, 'ASR', 'p931_in_the_land', 'In the Land', { milPowerMult: 0.85, incomeMult: 0.9 }, 420);
      h.chronicle(ctx, 'era', 'The eponym list says "in the land" for year after year, and the whole of Syria and the Levant spends forty years building things.');
    }),

  W('ev931p_the_cities_of_etruria', 'Cities on the Other Sea', -770, 6,
    'Etruria urbanises',
    'The traders coming back from the far west report something new on the coast north of '
      + 'the Tiber: real cities, walled, with planned streets, tombs cut like houses and '
      + 'painted inside, iron and copper mines behind them, and an aristocracy that buys '
      + 'Phoenician and Greek luxury by the shipload.\n\nThey write, in letters borrowed '
      + 'from the Greeks, a language nobody can place. They will run that peninsula for '
      + 'three hundred years and be remembered mostly by the people who replaced them.',
    'The Villanovan settlements of Etruria coalesce into walled cities through the eighth century, funded by the metal ores of the Colline Metallifere and trading with Phoenicians and Greeks.',
    'Send a factor with the next ship',
    '+90 talents and "The Far Market" (+8% trade) permanently; Etruria gains "The Metal Cities" (+12% income, +8% army strength).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { treasury: 90, infl: 10 });
      mod(ctx, 'p931_the_far_market', 'The Far Market', { tradeMult: 1.08 });
      powerMod(ctx, 'ETR', 'p931_the_metal_cities', 'The Metal Cities', { incomeMult: 1.12, milPowerMult: 1.08 }, -1);
      h.chronicle(ctx, 'era', 'Word comes back of walled cities on the far coast with iron behind them and painted tombs under them, buying everything the east can ship.');
    }),

  W('ev931p_sarduri_in_the_mountains', 'The Kingdom That Fights in the Hills', -760, 3,
    'Urartu at its height',
    'The mountain kingdom north of Assyria has spent the quiet years doing what Assyria '
      + 'cannot: taking the high country. It holds the passes, the copper, the horse '
      + 'pastures and the headwaters, it builds fortresses on crags that cannot be '
      + 'besieged, and it has reached the Euphrates bend from the north.\n\nIt is, this '
      + 'decade, the strongest state in this world. It is also a kingdom whose whole '
      + 'military art is defensive terrain, which works perfectly until the year somebody '
      + 'decides to come anyway.',
    'Sarduri II of Urartu (764-735) extended Urartian power to the Euphrates and northern Syria during the Assyrian interregnum.',
    'Buy their horses',
    '+35 martial points and "The Mountain Horses" (+8% army strength, +6% manpower) for forty years.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { mar: 35, treasury: -60 });
      mod(ctx, 'p931_mountain_horses', 'The Mountain Horses', { milPowerMult: 1.08, manpowerMult: 1.06 }, 480);
      h.chronicle(ctx, 'era', 'Horses come down from the northern mountains by the string, bought from a kingdom that currently frightens Assyria.');
    }),

  W('ev931p_cumae', 'A Greek Town on the Italian Shore', -750, 8,
    'The Greeks colonise the west',
    'The Greeks have stopped visiting and started staying. There is a town of them on the '
      + 'bay north of the Etruscan border — proper colonists with land allotments, a '
      + 'founder, a cult and a mother city that they will argue with for centuries.\n\n'
      + 'It is the first of a great many. Within a hundred years the whole southern half '
      + 'of that peninsula and most of the big island will be Greek-speaking, which will '
      + 'matter enormously to a village on the Tiber that does not exist yet.',
    'Pithekoussai and then Cumae are the earliest Greek settlements in Italy, traditionally dated to the mid-eighth century (Thucydides VI.3-4).',
    'Note where the colonies are going',
    '+25 influence points and "The Colonial Map" (+7% trade, +0.2 legitimacy a month) permanently — a chancery that knows who is where.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { infl: 25 });
      mod(ctx, 'p931_colonial_map', 'The Colonial Map', { tradeMult: 1.07, legitimacyAdd: 0.2 });
      h.chronicle(ctx, 'era', 'The Greeks begin planting towns in the west with founders, allotments and a grievance against the mother city, which is their whole method.');
    }),

  W('ev931p_sparta_takes_messenia', 'One City Enslaves Another', -735, 6,
    'Sparta conquers Messenia',
    'A Greek city in the southern peninsula has conquered its neighbour and done something '
      + 'unusual with it: not sacked it, not tributed it, but kept the whole population on '
      + 'the land as the property of the state, working the fields for citizen masters who '
      + 'are thereby freed to do nothing but train.\n\nIt will produce the best infantry in '
      + 'this world and a country that can never send it far or for long, because the '
      + 'helots outnumber the citizens seven to one and everybody in the arrangement knows '
      + 'the arithmetic.',
    'The First Messenian War (traditionally c. 743-724) gave Sparta the Messenian helots, the basis of its distinctive military society (Pausanias IV, Tyrtaeus).',
    'Note the arithmetic',
    '+30 martial points and "What Standing Armies Cost" (+8% army strength, −0.3 unrest everywhere) permanently.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { mar: 30, gov: 15 });
      mod(ctx, 'p931_what_standing_armies_cost', 'What Standing Armies Cost', { milPowerMult: 1.08, unrestAll: -0.3 });
      h.chronicle(ctx, 'era', 'A Greek city buys a professional army by making its neighbour into a permanent harvest, and spends the next three centuries afraid of its own fields.');
    }),

  W('ev931p_the_double_crown_at_thebes', 'The Kushite Takes the Double Crown', -727, 4,
    'Kush conquers Egypt',
    'The king from the fourth cataract has come down the whole length of the Nile, taken '
      + 'Thebes, taken Memphis, received the submission of every Delta princeling in '
      + 'person, and had the entire campaign carved on a stele in the most correct '
      + 'archaising Egyptian anyone has written in three centuries.\n\nEgypt is one country '
      + 'again for the first time in two hundred years, and it is ruled from eight hundred '
      + 'miles up the river by men the Delta considers foreigners and who consider the '
      + 'Delta lapsed.',
    'Piye\'s campaign of c. 727 is recorded on his victory stele from Jebel Barkal; the Twenty-Fifth Dynasty reunified Egypt under Kushite rule.',
    'Send to the new court at once',
    '+30 influence points and "One Egypt Again" (+8% trade, +5% income, +0.3 unrest everywhere) permanently; Kush gains "The Two Lands" (+15% income, +10% manpower) and Egypt is its client in all but name.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { infl: 30 });
      mod(ctx, 'p931_one_egypt_again', 'One Egypt Again', { tradeMult: 1.08, incomeMult: 1.05, unrestAll: 0.3 });
      powerMod(ctx, 'KSH', 'p931_the_two_lands', 'The Two Lands', { incomeMult: 1.15, manpowerMult: 1.1 }, -1);
      powerMod(ctx, 'MIZ', 'p931_ruled_from_the_south', 'Ruled From the South', { incomeMult: 0.92, unrestAll: 0.5 }, -1);
      opinion(ctx, 'KSH', me, 20); opinion(ctx, 'MIZ', me, -10);
      h.chronicle(ctx, 'era', 'Egypt is one kingdom again, ruled from Napata, and the Delta princes who submitted in person are sent home to govern for somebody else.');
    }),

  W('ev931p_sargon_takes_the_throne', 'A King Who Names Himself Legitimate', -721, 3,
    'Sargon II seizes Assyria',
    'There has been a coup at Kalhu. The new king is not the old king\'s heir, took the '
      + 'throne in the middle of a siege, and has chosen a throne-name that means "the '
      + 'king is legitimate" — which is the sort of thing a man says when everybody knows '
      + 'he is not.\n\nHe will spend seventeen years proving it with an army, build a new '
      + 'capital from nothing, take Babylon, break Urartu, and die in a ditch in Anatolia '
      + 'with his body unrecovered, which the Assyrians will spend a generation trying to '
      + 'explain.',
    'Sargon II took the Assyrian throne in 722 in disputed circumstances, took the name Sharru-kin ("the king is legitimate"), and died on campaign in 705 with his body never recovered.',
    'Recognise him at once and pay',
    '−130 talents, +25 influence points and "Recognised Early" (+7% income, −0.4 unrest everywhere) for thirty years; Assyria gains "The Legitimate King" (+12% army strength, +8% siege).',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      h.adjust(ctx, me, { treasury: -130, infl: 25 });
      mod(ctx, 'p931_recognised_early', 'Recognised Early', { incomeMult: 1.07, unrestAll: -0.4 }, 360);
      powerMod(ctx, 'ASR', 'p931_the_legitimate_king', 'The Legitimate King', { milPowerMult: 1.12, siegeMult: 1.08 }, -1);
      opinion(ctx, 'ASR', me, 25);
      h.chronicle(ctx, 'era', 'The new Assyrian king is recognised here before he is recognised in half of Assyria, which is cheap and turns out to have been correct.');
    }),

  W('ev931p_carchemish_annexed', 'The Last Hittite City', -717, 5,
    'Carchemish is annexed',
    'Carchemish is finished. The great crossing city on the Euphrates — the last state '
      + 'anywhere still writing in Hittite hieroglyphs, still carving processions of gods '
      + 'in the old style, still ruled by a king with a Hittite throne-name eight hundred '
      + 'years after the empire it remembers fell — has been annexed, its king deported, '
      + 'its treasury carried off, its territory made a province.\n\nThe Bronze Age ends '
      + 'this year, four centuries late, in a single administrative act.',
    'Sargon II annexed Carchemish in 717, deporting Pisiri and ending the last of the Neo-Hittite successor states.',
    'Note the end of it',
    'Carchemish\'s ground and government pass to Assyria. +20 legitimacy and "The Old World Ends" (+0.2 legitimacy a month, +6% morale) permanently.',
    (ctx) => {
      const h = ctx.helpers; const me = P(ctx);
      const held = ctx.game.provinces.filter((p) => p && !p.impassable && p.owner === 'CRC').length;
      endCourt(ctx, 'CRC', 'ASR');
      h.adjust(ctx, me, { legitimacy: 20, infl: 15 });
      mod(ctx, 'p931_old_world_ends', 'The Old World Ends', { legitimacyAdd: 0.2, moraleMult: 1.06 });
      powerMod(ctx, 'ASR', 'p931_the_crossing_held', 'The Crossing Held', { incomeMult: 1.06, milPowerMult: 1.04 }, -1);
      h.chronicle(ctx, 'era', 'Carchemish is made a province and its king is carried to Assyria. ' + held
        + ' provinces change hands, and the last people writing Hittite stop.');
    }),
];
