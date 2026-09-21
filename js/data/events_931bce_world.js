// Judaea Universalis — the world beside the divided kingdom, 931–722 BCE
// (SPEC §268). Content package. Zero imports; effects run through ctx.helpers.
//
// The two Israelite kingdoms are, at this point in history, minor. The chapter
// has to say so honestly, and the way this codebase says it is a world package:
// the age's own calendar on the age's own clock, arriving whether or not the
// player's court has anything to do with it.
//
// What is on that calendar: Egypt coming apart into four governments; Assyria
// coming back from two centuries of retrenchment and inventing the machinery of
// empire while it does; Damascus rising and falling; Urartu appearing in the
// northern mountains as the one state that can fight Assyria in the hills;
// Tyre planting a colony on a headland in North Africa that will outlast every
// state on this map; Kush coming down the Nile; the first Olympic festival; a
// hill town on the Tiber; and, at the end, the horse-people out of the steppe
// who break Phrygia and terrify everybody.
//
// Sources: the Assyrian eponym lists and royal annals (Ashur-dan II through
// Tiglath-Pileser III); the Zakkur and Kilamuwa inscriptions; Josephus'
// citation of Menander of Ephesus for the Tyrian king-list; the Piye stele;
// the Urartian royal inscriptions; Herodotus I.15 and the Assyrian letters for
// the Cimmerians; Eusebius for the Olympiad and Varro for the Roman date.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_931bce_world] ' + key, e || '');
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

function tagMod(ctx, tag, id, name, effects, months) {
  try {
    ctx.helpers.addTagModifier(ctx, tag, {
      id, name, months: Number.isFinite(months) ? months : -1, effects,
    });
  } catch (e) { warnOnce('tagMod:' + id, e); }
}

function opinion(ctx, from, of, delta) {
  try {
    const t = ctx.game.tags && ctx.game.tags[from];
    if (!t) return;
    if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
    t.opinion[of] = Math.max(-200, Math.min(200, (t.opinion[of] || 0) + delta));
  } catch (e) { warnOnce('opinion', e); }
}

// A world card with one answer: the age happening to everybody.
// ---- when an empire falls, the map says so (SPEC §277) ---------------------
// This package narrated its century and changed nothing on it. The §111 rule
// the 167 packages already keep: a world card rearranges what history
// rearranged, and never confiscates what the player took.

function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[tag];
  return !!(t && t.alive !== false);
}

// A scripted fall names the heir the history gave the ground to, and the heir
// is sometimes already gone (SPEC §282). The AI's Assyria eats Babylonia in
// the 620s in most campaigns; 612 then has nobody to hand Mesopotamia to, the
// card refuses, and Assyria ends the chapter larger than it started — which is
// exactly the "the empires never fall" report this helper exists to answer.
//
// The heir is not being invented. The Chaldean dynasty rising out of Babylon
// is what the card is ABOUT, and a court that holds ground is alive again on
// the next tick anyway (`updateTagLife`). So raise it, give it the floor a
// restored court gets, and let the cession run. Two courts are never raised:
// one the world has no entry for at all, and the player's own, because a
// human chair that has fallen is a finished campaign and not a piece of
// world news.
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
// a thousand miles away does not get to reassign it.
function cedeNamed(ctx, names, fromTag, toTag) {
  if (!raise(ctx, toTag) || fromTag === toTag) return 0;
  // Never the player's own court — see the note on endCourt below.
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
// pass to the heir. Never the player's own chair — dissolveTagCore would move
// the player rather than delete them, which is right for the engine and wrong
// for a piece of world news to do unasked.
function endCourt(ctx, dyingTag, heirTag) {
  if (!alive(ctx, dyingTag) || !raise(ctx, heirTag)) return false;
  if (ctx.game.playerTag === dyingTag) return false;
  try { return !!ctx.helpers.dissolveTag(ctx, dyingTag, heirTag); }
  catch (e) { warnOnce('endCourt:' + dyingTag, e); return false; }
}

function chronicleOnly(id, title, date, desc, historical, label, tooltip, effect, worldLabel) {
  return {
    id, title, worldLabel, desc, historical,
    forTag: 'both', date, world: true, aiOption: 0,
    options: [{ label, tooltip, effects: guard(id, effect) }],
  };
}

export const EVENTS_931_WORLD = [

  chronicleOnly(
    'ev931w_the_delta_divides', 'Four Governments in the Delta',
    { y: -890, m: 4 },
    'Egypt has stopped being a country and become an arrangement. There is a Pharaoh at '
      + 'Tanis, a High Priest of Amun at Thebes who is also a general and also the '
      + 'Pharaoh\'s relative, a line of Libyan chiefs in the western Delta who have begun '
      + 'writing their own cartouches, and a fourth court at Leontopolis that nobody can '
      + 'quite explain.\n\nFor the two kingdoms of the hill country this is the best news '
      + 'of the century and the worst news of the next one. The road from the south is '
      + 'closed to armies for three hundred years — and when it reopens it will be '
      + 'carrying somebody else.',
    'The Twenty-Second Dynasty fragmented after Osorkon II; by the eighth century there were four or five simultaneous claimants to the double crown.',
    'Note it, and stop expecting help from the south',
    '+40 influence points, and "No Help From Egypt" (−0.4 unrest everywhere, −5% trade) for forty years — a quieter southern border and a poorer one.',
    (ctx) => {
      const h = ctx.helpers;
      h.adjust(ctx, P(ctx), { infl: 40 });
      mod(ctx, 'no_help_from_egypt', 'No Help From Egypt', { unrestAll: -0.4, tradeMult: 0.95 }, 480);
      tagMod(ctx, 'MIZ', 'the_divided_delta', 'The Divided Delta', { incomeMult: 0.8, moraleMult: 0.85 }, -1);
      h.chronicle(ctx, 'era', 'Egypt divides into four courts that recognise each other when '
        + 'convenient. No Egyptian army crosses the Sinai for three centuries.');
    },
    'Egypt fragments: four courts, one crown, no army'),

  chronicleOnly(
    'ev931w_ashurnasirpal_marches', 'The King Who Kept a Record',
    { y: -878, m: 6 },
    'The Assyrian has reached the Mediterranean, washed his weapons in it, taken cedar '
      + 'from the Lebanon and tribute from Tyre and Sidon, and gone home. What he did on '
      + 'the way is written on the walls of a new palace at Kalhu in the first person: the '
      + 'flaying, the pillars of heads, the burning of young men and maidens, the number '
      + 'of each. It is not boasting to an enemy. It is a policy document, and the intended '
      + 'reader is the next city that considers shutting its gates.\n\n'
      + 'He also threw a banquet for sixty-nine thousand people when the palace opened, and '
      + 'recorded the menu on a stele with the same care.',
    'Ashurnasirpal II (883-859) reached the Mediterranean in 877 and built Kalhu (Nimrud); the Banquet Stele lists 69,574 guests fed for ten days.',
    'Read the wall, and take the lesson',
    '+30 martial points and "The Assyrian Method" (+1 fort defence, +5% morale) for thirty years, at Assyria\'s regard −20 — the coast has understood what is coming and has begun walling itself.',
    (ctx) => {
      const h = ctx.helpers;
      const me = P(ctx);
      h.adjust(ctx, me, { mar: 30 });
      mod(ctx, 'the_assyrian_method', 'The Assyrian Method', { fortDefBonus: 1, moraleMult: 1.05 }, 360);
      tagMod(ctx, 'ASR', 'the_royal_annals', 'The Royal Annals', { milPowerMult: 1.1, siegeMult: 1.12 }, -1);
      opinion(ctx, 'ASR', me, -20);
      h.chronicle(ctx, 'era', 'The Assyrian washes his weapons in the Great Sea and goes home to '
        + 'write it on a wall. Every port on the coast pays, and every port on the coast '
        + 'starts building.');
    },
    'Ashurnasirpal II reaches the sea and writes down how'),

  chronicleOnly(
    'ev931w_the_headland_at_carthage', 'A Colony on a Headland',
    { y: -814, m: 3 },
    'A dispute in the royal house at Tyre has ended with the king\'s sister leaving by sea '
      + 'with a faction, a treasury and the temple\'s priests. The party has made landfall '
      + 'on a headland in the gulf west of Sicily, bought as much land as an ox-hide would '
      + 'cover, cut the hide into thread, and enclosed a hill.\n\n'
      + 'Tyre records it as an embarrassment. It is, in fact, the most consequential thing '
      + 'the Phoenician coast will ever do: the New City will outlive Tyre, Israel, Judah, '
      + 'Assyria, Babylon and Persia, and will be destroyed by a republic that does not '
      + 'exist yet.',
    'The traditional foundation date of Carthage is 814 BCE (Timaeus, via Josephus\' Tyrian king-list). Archaeology puts the earliest levels a few decades later.',
    'Note the sailing, and buy into the voyage',
    '+150 talents and "The Western Voyages" (+8% trade) for fifty years; Tyre\'s regard improves by 20.',
    (ctx) => {
      const h = ctx.helpers;
      const me = P(ctx);
      h.adjust(ctx, me, { treasury: 150, infl: 20 });
      mod(ctx, 'the_western_voyages', 'The Western Voyages', { tradeMult: 1.08 }, 600);
      opinion(ctx, 'TYR', me, 20);
      tagMod(ctx, 'TYR', 'the_daughter_city', 'The Daughter City', { tradeMult: 1.1 }, -1);
      h.chronicle(ctx, 'era', 'A faction out of Tyre encloses a hill on an African headland and '
        + 'calls it the New City. Nobody in the Levant thinks it is important.');
    },
    'A Tyrian faction founds Carthage'),

  chronicleOnly(
    'ev931w_urartu_in_the_mountains', 'A Kingdom of Fortresses',
    { y: -830, m: 7 },
    'There is a new name in the Assyrian annals and it keeps recurring, which no name is '
      + 'supposed to do. Urartu — the highland around the great lake — has been organised '
      + 'by its kings into something the Assyrians have no answer to: sixty fortresses on '
      + 'crags, irrigation canals that let the valleys feed garrisons through a siege, and '
      + 'a cavalry that declines battle in the plain and takes it in the passes.\n\n'
      + 'For the next century every Assyrian king who wants to march west has to think '
      + 'first about his northern flank. Every year Assyria spends in the mountains is a '
      + 'year it does not spend on this coast.',
    'Urartu under Sarduri I, Ishpuini and Menua (c. 840-786) became Assyria\'s chief rival; Shalmaneser III campaigned against it repeatedly and never took the highland.',
    'Send an embassy north over the Assyrian\'s head',
    '+40 influence points and "The Northern Flank" (−0.5 unrest everywhere, +6% income) for forty years: every summer Assyria spends at Van is a summer it does not spend here.',
    (ctx) => {
      const h = ctx.helpers;
      const me = P(ctx);
      h.adjust(ctx, me, { infl: 40 });
      mod(ctx, 'the_northern_flank', 'The Northern Flank', { unrestAll: -0.5, incomeMult: 1.06 }, 480);
      tagMod(ctx, 'ASR', 'the_mountain_war', 'The War in the Mountains', { manpowerMult: 0.9 }, 360);
      h.chronicle(ctx, 'era', 'Urartu fortifies the highland and Assyria discovers that there is '
        + 'a direction from which it can be hurt.');
    },
    'Urartu fortifies the northern highland'),

  chronicleOnly(
    'ev931w_the_olympiad', 'The First Olympiad',
    { y: -776, m: 7 },
    'In the far west of the world, past Cyprus, past the sea the Philistines came out of, '
      + 'a set of villages in a mountainous peninsula has begun holding a festival every '
      + 'four years at a sanctuary in the Peloponnese, and — this is the part that will '
      + 'matter — has begun numbering the years from it.\n\n'
      + 'The Phoenicians who trade there report that the same people have started writing '
      + 'again, using the Tyrian letters with the useless throat-consonants turned into '
      + 'vowels. It has been four hundred years since anybody in that country could write.',
    'The traditional date of the first Olympiad is 776 BCE; the Greek adoption of the Phoenician alphabet is archaeologically dated to roughly the same century.',
    'Note it, and sell them oil',
    '+80 talents and "The Western Market" (+6% trade) for sixty years.',
    (ctx) => {
      const h = ctx.helpers;
      h.adjust(ctx, P(ctx), { treasury: 80, infl: 15 });
      mod(ctx, 'the_western_market', 'The Western Market', { tradeMult: 1.06 }, 720);
      h.chronicle(ctx, 'era', 'The Greeks begin counting years from a footrace, and begin '
        + 'writing with Tyrian letters and invented vowels.');
    },
    'The Greeks count from a footrace and learn to write again'),

  chronicleOnly(
    'ev931w_a_town_on_the_tiber', 'A Town on the Tiber',
    { y: -753, m: 4 },
    'Merchants off the western sea report a new settlement at a river ford in the middle '
      + 'of Italy: a cluster of hill villages that have agreed to share a market and a '
      + 'defensive ditch, under a king, on the boundary between the Etruscan cities and '
      + 'the Latin plain.\n\nThere is no reason whatever for anybody in this part of the '
      + 'world to write it down. It is written down here because of what it does later.',
    'Varro\'s traditional foundation date for Rome is 753 BCE; the archaeological record shows the Palatine settlement consolidating in the eighth century.',
    'Note it in the margin',
    '+10 governance points. Nothing else — this is a note for whoever reads the chronicle in eight hundred years.',
    (ctx) => {
      const h = ctx.helpers;
      h.adjust(ctx, P(ctx), { gov: 10 });
      h.chronicle(ctx, 'era', 'Villages at a ford on the Tiber agree to share a market. The '
        + 'chronicle notes it and moves on.');
    },
    'Villages on the Tiber agree to share a market'),

  chronicleOnly(
    'ev931w_kush_comes_down_the_nile', 'The Kushite Comes Down the Nile',
    { y: -747, m: 9 },
    'The kingdom at Napata, four cataracts up the Nile, has decided that the Libyan chiefs '
      + 'of the Delta are neglecting Amun, and has come north to fix it. Piye has taken '
      + 'Thebes, then Hermopolis, then Memphis, and has accepted the submission of every '
      + 'prince in the Delta — and then gone home, leaving Egypt in the hands of governors '
      + 'and a stele explaining that the whole campaign was an act of piety.\n\n'
      + 'Egypt is one country again, ruled from the south by kings who are more scrupulous '
      + 'about Egyptian religion than any Egyptian has been for three centuries.',
    'Piye\'s Victory Stele, c. 727. The Twenty-Fifth (Kushite) Dynasty ruled Egypt for most of a century and fought Assyria for the Levant.',
    'Send an embassy to the new Pharaoh',
    '+30 influence points, Egypt\'s regard improves by 40 and Egypt is a power again: "A Pharaoh Who Answers" (+6% morale) for forty years. It is also, now, worth Assyria\'s while to come and take it.',
    (ctx) => {
      const h = ctx.helpers;
      const me = P(ctx);
      h.adjust(ctx, me, { infl: 30 });
      mod(ctx, 'a_pharaoh_who_answers', 'A Pharaoh Who Answers', { moraleMult: 1.06 }, 480);
      opinion(ctx, 'MIZ', me, 40);
      try { ctx.helpers.removeModifier(ctx, 'MIZ', 'the_divided_delta'); } catch (e) { warnOnce('kush:mod', e); }
      tagMod(ctx, 'MIZ', 'the_kushite_dynasty', 'The Kushite Dynasty', { moraleMult: 1.08, legitimacyAdd: 0.2 }, -1);
      h.chronicle(ctx, 'era', 'Piye of Napata takes Egypt from the south in the name of Amun, '
        + 'accepts the submission of every prince in the Delta, and goes home.');
    },
    'Kush takes Egypt and restores the double crown'),

  chronicleOnly(
    'ev931w_tiglath_pileser_takes_the_throne', 'The Reorganisation',
    { y: -745, m: 4 },
    'There has been a coup at Kalhu, and the man on the throne has begun doing something '
      + 'no Assyrian king has done: reorganising. The great provincial governorships are '
      + 'being cut in half so that no governor can rebel. The seasonal levy is being '
      + 'replaced with a standing army paid from the treasury. And the policy for a '
      + 'conquered country is no longer tribute and a loyalty oath — it is annexation, a '
      + 'governor, and the removal of the population somewhere else entirely.\n\n'
      + 'Every kingdom on this coast has been paying tribute for a century on the '
      + 'understanding that tribute is what is wanted. That understanding has just ended.',
    'Tiglath-Pileser III (745-727) rebuilt the Assyrian state: halved provinces, a standing army, and mass deportation as systematic policy. He reached the Levant within five years.',
    'Understand what has changed, and prepare',
    '+50 martial points and "The New Assyria" (+1 fort defence, +8% manpower) for thirty years — and Assyria itself is transformed: the empire this chapter ends against now exists.',
    (ctx) => {
      const h = ctx.helpers;
      const me = P(ctx);
      h.adjust(ctx, me, { mar: 50, gov: 20 });
      mod(ctx, 'the_new_assyria', 'The New Assyria', { fortDefBonus: 1, manpowerMult: 1.08 }, 360);
      tagMod(ctx, 'ASR', 'the_reorganisation', 'The Reorganisation', {
        milPowerMult: 1.15, manpowerMult: 1.2, siegeMult: 1.15, incomeMult: 1.1,
      }, -1);
      h.setFlag(ctx, 'tiglathPileserReforms', true);
      opinion(ctx, 'ASR', me, -30);
      h.chronicle(ctx, 'era', 'Tiglath-Pileser takes the throne at Kalhu and rebuilds the '
        + 'Assyrian state from the province up. Tribute is no longer what is wanted.');
    },
    'Tiglath-Pileser III rebuilds the Assyrian state'),

  chronicleOnly(
    'ev931w_the_cimmerians', 'Horsemen Out of the North',
    { y: -714, m: 8 },
    'A people nobody on this map has a name for has come over the Caucasus into the '
      + 'highland, broken the Urartian army in the field — which no Assyrian king ever '
      + 'managed — and gone west into Phrygia. The Phrygian king is dead, by his own hand, '
      + 'according to the merchants; the palace at Gordion has burned.\n\n'
      + 'They do not besiege, they do not govern, and they do not stay. They are the first '
      + 'notice this world has that there is an inexhaustible supply of horse-archers on '
      + 'the other side of the mountains, and that every settled kingdom in it is a target.',
    'The Cimmerians broke Urartu c. 714 and destroyed Phrygia around 696; Assyrian intelligence letters from Sargon\'s reign track them anxiously.',
    'Buy the pass, and warn the coast',
    '−120 talents and "The Watch on the Passes" (+1 hill defence, +5% morale) for forty years; Urartu is broken as a counterweight, which is worse news than it looks.',
    (ctx) => {
      const h = ctx.helpers;
      const me = P(ctx);
      h.adjust(ctx, me, { treasury: -120, mar: 25 });
      mod(ctx, 'the_watch_on_the_passes', 'The Watch on the Passes', { hillDefBonus: 1, moraleMult: 1.05 }, 480);
      tagMod(ctx, 'URA', 'broken_in_the_field', 'Broken in the Field', { milPowerMult: 0.8, manpowerMult: 0.8 }, -1);
      tagMod(ctx, 'PHR', 'gordion_burned', 'Gordion Burned', { incomeMult: 0.7, milPowerMult: 0.75 }, -1);
      h.chronicle(ctx, 'era', 'Horse-archers out of the north break Urartu in the open field and '
        + 'burn Gordion. The counterweight on Assyria\'s northern flank is gone.');
    },
    'The Cimmerians break Urartu and burn Gordion'),

  chronicleOnly(
    'ev931w_damascus_falls', 'Damascus Falls',
    { y: -732, m: 6 },
    'The oldest rival this country has had is gone. The Assyrian took the city after a '
      + 'two-year siege, executed the king, deported the population and made the whole '
      + 'kingdom of Aram into three Assyrian provinces with Assyrian governors in them.\n\n'
      + 'For two hundred years every strategic calculation in the hill country has begun '
      + 'with Damascus. The kings of Israel have fought it, hired it, married into it and '
      + 'been saved by other people fighting it. It is now a line in a provincial register, '
      + 'and there is nothing at all between this country and the empire.',
    '2 Kings 16:9 and the annals of Tiglath-Pileser III. Damascus fell in 732; Rezin was executed and Aram ceased to exist as a state.',
    'Note it, and count what is left in front of us',
    '+40 martial points and "Nothing In Between" (+8% manpower, +1.0 unrest everywhere) for thirty years. Aram is finished as a power on this map.',
    (ctx) => {
      const h = ctx.helpers;
      const me = P(ctx);
      h.adjust(ctx, me, { mar: 40, legitimacy: -5 });
      mod(ctx, 'nothing_in_between', 'Nothing In Between', { manpowerMult: 1.08, unrestAll: 1 }, 360);
      tagMod(ctx, 'DMS', 'three_assyrian_provinces', 'Three Assyrian Provinces', {
        milPowerMult: 0.5, incomeMult: 0.5, manpowerMult: 0.5,
      }, -1);
      opinion(ctx, 'ASR', me, -20);
      // …and it becomes three Assyrian provinces (SPEC §277). The chronicle
      // line below has said so since the card was written; until now the map
      // did not, and Aram kept governing the three of them for ever.
      const aram = cedeNamed(ctx, ['Damascus', 'Chalcis', 'Bostra'], 'DMS', 'ASR');
      endCourt(ctx, 'DMS', 'ASR');
      h.setFlag(ctx, 'damascusFallen', true);
      h.chronicle(ctx, 'era', 'Damascus falls after a two-year siege and becomes '
        + (aram === 3 ? 'three Assyrian provinces' : 'an Assyrian province')
        + '. There is nothing between the hill country and the empire.');
    },
    'Assyria takes Damascus and ends the kingdom of Aram'),

  chronicleOnly(
    'ev931w_samaria_besieged', 'The Siege of Samaria',
    { y: -725, m: 4 },
    'The king in Samaria stopped the tribute and sent envoys to a Pharaoh in the Delta who '
      + 'was in no position to help anybody, and the Assyrian answer is at the wall. The '
      + 'city is on a hill with a casemate wall and cisterns, and it holds for three years, '
      + 'which is a long time — long enough for the king who began the siege to die and '
      + 'another to finish it.\n\nWhat happens afterwards is the policy: twenty-seven '
      + 'thousand seven hundred and twenty-nine people counted out and marched to Halah, to '
      + 'Habor by the river of Gozan, and to the cities of the Medes, and other people '
      + 'brought in from Babylon and Hamath to take their fields.',
    '2 Kings 17:3-6 and the annals of Sargon II, who claims 27,290 deportees. The northern kingdom ended in 722/720; its people are not heard from again.',
    'Watch it happen',
    '+2.0 unrest everywhere for fifteen years and "The Cities of the Medes" (−0.3 legitimacy a month) for twenty — the end of the northern kingdom, on the calendar whether or not the player is standing in it.',
    (ctx) => {
      const h = ctx.helpers;
      const me = P(ctx);
      h.adjust(ctx, me, { legitimacy: -10, mar: 30 });
      mod(ctx, 'the_cities_of_the_medes', 'The Cities of the Medes', { legitimacyAdd: -0.3 }, 240);
      mod(ctx, 'the_road_north_full', 'The Road North Full of People', { unrestAll: 2 }, 180);
      h.setFlag(ctx, 'samariaBesieged', true);
      h.chronicle(ctx, 'era', 'Samaria holds for three years and then does not. Twenty-seven '
        + 'thousand people are counted out and marched to Halah and Habor and the cities of '
        + 'the Medes, and other people are brought in to take their fields.');
    },
    'Samaria falls; the ten tribes are deported'),
];
