// Judaea Universalis — the world beside the Assyrian flood, 732–609 BCE
// (SPEC §268). Content package. Zero imports; effects run through ctx.helpers.
//
// The age's own calendar, arriving whether or not the player's court has
// anything to do with it: an empire that grows until it holds everything from
// the Nile to the Zagros and then comes apart in fifteen years. The Kushite
// pharaohs and what Assyria does to them; the year Elam is erased; the civil
// war between two brothers that nearly ends Assyria fifty years early; the
// horse-peoples; the Medes; the night Nineveh burns; and Carchemish, where the
// world this chapter opened in finally stops existing.
//
// Sources: the annals of Sargon II, Sennacherib, Esarhaddon and Ashurbanipal;
// the Babylonian Chronicle (ABC 1-5); the Nabopolassar and Nabonidus
// inscriptions; Herodotus I.102-106 and II.141-159; the Assyrian eponym canon;
// the Gadd Chronicle for the fall of Nineveh.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_732bce_world] ' + key, e || '');
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

export const EVENTS_732_WORLD = [

  chronicleOnly(
    'ev732w_sargon_takes_the_throne', 'A King Who Names Himself the True King',
    { y: -722, m: 1 },
    'There has been a succession in Assyria that nobody at Kalhu wants to discuss. The new '
      + 'king has taken a throne-name meaning "the king is legitimate", which is the sort of '
      + 'thing a man says when the question has been raised, and he has begun his reign by '
      + 'cancelling taxes in Ashur and Harran to buy the temple cities.\n\n'
      + 'He has also inherited a three-year siege in this country and is going to finish it, '
      + 'count the population, and put the number on a wall.',
    'Sargon II (722-705) claims the conquest of Samaria and 27,290 deportees in his annals, though the siege was begun under Shalmaneser V.',
    'Note the name, and read the annals when they come',
    '+30 martial points and "The Usurper\'s Energy" (+1 fort defence) for thirty years; Assyria is more dangerous, not less, for having an insecure king.',
    (ctx) => {
      const h = ctx.helpers;
      h.adjust(ctx, P(ctx), { mar: 30 });
      mod(ctx, 'the_usurpers_energy', 'The Usurper\'s Energy', { fortDefBonus: 1 }, 360);
      tagMod(ctx, 'ASR', 'sargon_the_legitimate', 'Sargon the Legitimate', { milPowerMult: 1.08, incomeMult: 1.06 }, -1);
      h.chronicle(ctx, 'era', 'A new king in Assyria with a name that argues about his own '
        + 'legitimacy, and a three-year siege to finish in this country.');
    },
    'Sargon II takes the Assyrian throne'),

  chronicleOnly(
    'ev732w_the_kushite_pharaohs', 'The Black Pharaohs',
    { y: -715, m: 5 },
    'Egypt has one government again and it comes from four cataracts up the Nile. The '
      + 'Kushite kings have taken Thebes, then Memphis, then the Delta, and they rule as '
      + 'Pharaohs in the full pharaonic style — the titulary, the temples, the archaising '
      + 'art, the double uraeus for two lands that in their case means Egypt and Kush.\n\n'
      + 'They are also, immediately, the sponsor of every anti-Assyrian movement on this '
      + 'coast. Every Philistine city that revolts in the next forty years has a Kushite '
      + 'letter behind it, and every one of them discovers what an Egyptian promise is worth '
      + 'against an Assyrian army.',
    'The Twenty-Fifth Dynasty (Piye, Shabaka, Shebitku, Taharqa) ruled Egypt c. 744-656 and fought Assyria for the Levant throughout.',
    'Open a correspondence with the new Pharaoh',
    '+40 influence points, Egypt to +50 regard, and "A Pharaoh Who Answers" (+6% morale, +5% income) for forty years — and Assyria reads the post.',
    (ctx) => {
      const h = ctx.helpers;
      const me = P(ctx);
      h.adjust(ctx, me, { infl: 40 });
      mod(ctx, 'a_pharaoh_who_answers_732', 'A Pharaoh Who Answers', { moraleMult: 1.06, incomeMult: 1.05 }, 480);
      opinion(ctx, 'MIZ', me, 50);
      opinion(ctx, 'ASR', me, -20);
      try { h.removeModifier(ctx, 'MIZ', 'the_broken_reed'); } catch (e) { warnOnce('kushite:mod', e); }
      tagMod(ctx, 'MIZ', 'the_kushite_pharaohs', 'The Kushite Pharaohs', { moraleMult: 1.12, manpowerMult: 1.15, legitimacyAdd: 0.2 }, -1);
      h.chronicle(ctx, 'era', 'Egypt is one country again under kings from Napata, and every '
        + 'anti-Assyrian letter on this coast now has somewhere to go.');
    },
    'The Kushite dynasty unites Egypt and backs the Levant'),

  chronicleOnly(
    'ev732w_esarhaddon_takes_egypt', 'The Empire Takes Egypt',
    { y: -671, m: 7 },
    'The thing everybody assumed was impossible has been done: an Assyrian army has crossed '
      + 'the Sinai, beaten the Egyptians in three engagements in fifteen days, and taken '
      + 'Memphis. The Pharaoh got away up the river; his family did not. There are Assyrian '
      + 'governors in the Delta and a stele at the crossing showing the king of Assyria '
      + 'holding two captives on leashes, one of them a Kushite prince.\n\n'
      + 'The empire now runs from the Zagros to Upper Egypt. It is the largest state that '
      + 'has ever existed, and it has just acquired a province that will require an army in '
      + 'it every single year from now on.',
    'Esarhaddon took Memphis in 671; the Zincirli stele shows him with Taharqa\'s son and Baal of Tyre on lip-rings.',
    'Note the arithmetic of it',
    '+40 governance points and "The Empire at Full Stretch" (−0.5 unrest everywhere, +6% income) for thirty years: an Assyria in Egypt is an Assyria whose army is a very long way from here.',
    (ctx) => {
      const h = ctx.helpers;
      const me = P(ctx);
      h.adjust(ctx, me, { gov: 40 });
      mod(ctx, 'the_empire_at_full_stretch', 'The Empire at Full Stretch', { unrestAll: -0.5, incomeMult: 1.06 }, 360);
      tagMod(ctx, 'ASR', 'the_egyptian_province', 'The Egyptian Province', { manpowerMult: 0.92, incomeMult: 1.12 }, -1);
      tagMod(ctx, 'MIZ', 'memphis_taken', 'Memphis Taken', { moraleMult: 0.85, incomeMult: 0.8 }, 240);
      opinion(ctx, 'MIZ', 'ASR', -100);
      h.chronicle(ctx, 'era', 'An Assyrian army crosses the Sinai and takes Memphis in fifteen '
        + 'days. The empire now reaches from the Zagros to the first cataract, and has to be '
        + 'garrisoned along the whole of it.');
    },
    'Esarhaddon conquers Egypt'),

  chronicleOnly(
    'ev732w_thebes_sacked', 'The Sack of Thebes',
    { y: -663, m: 4 },
    'Thebes has been taken and stripped. Not burned for a rebellion — stripped: the temple '
      + 'treasuries, the obelisks, the god\'s own gold, carried down the river and north to '
      + 'Nineveh. The oldest continuously wealthy religious centre in the world has been '
      + 'inventoried by a clerk.\n\n'
      + 'The prophets of this country will use it as a byword for a generation — "art thou '
      + 'better than populous No, that was situate among the rivers?" — because if THAT can '
      + 'happen to Thebes, the argument that any city is too old or too holy to be taken has '
      + 'been settled in public.',
    'Ashurbanipal sacked Thebes in 663; Nahum 3:8 uses it as the standard of catastrophe when arguing that Nineveh will fall too.',
    'Enter it as a warning',
    '+35 martial points and "No City Is Too Old" (+10% siege endurance, +0.5 unrest everywhere) for thirty years.',
    (ctx) => {
      const h = ctx.helpers;
      const me = P(ctx);
      h.adjust(ctx, me, { mar: 35, legitimacy: -5 });
      mod(ctx, 'no_city_is_too_old', 'No City Is Too Old', { siegeMult: 1.1, unrestAll: 0.5 }, 360);
      tagMod(ctx, 'MIZ', 'thebes_stripped', 'Thebes Stripped', { incomeMult: 0.75, legitimacyAdd: -0.2 }, 300);
      h.chronicle(ctx, 'era', 'Thebes is stripped and its gold carried to Nineveh. Every prophet '
        + 'in this country has a new example and uses it.');
    },
    'Ashurbanipal sacks Thebes'),

  chronicleOnly(
    'ev732w_the_brothers_war', 'The War of the Two Brothers',
    { y: -652, m: 3 },
    'The empire is fighting itself. The king at Nineveh and his elder brother, whom their '
      + 'father installed as king in Babylon, have gone to war, and the whole south — '
      + 'Babylonia, the Chaldean tribes, Elam, the Arabs of the desert edge — is in it '
      + 'against Nineveh.\n\n'
      + 'It lasts four years, ends with Babylon starved into cannibalism and the brother '
      + 'dead in his burning palace, and leaves the empire victorious, exhausted and short '
      + 'of exactly the reserve it will need in forty years. Every vassal on this coast is '
      + 'watching and doing sums.',
    'Shamash-shum-ukin\'s revolt (652-648) was the gravest internal crisis of the Assyrian empire; Babylon fell after a two-year siege.',
    'Do the sums with everybody else',
    '+50 martial points and "The Empire Divided" (+10% morale, −0.8 unrest everywhere) for twenty-five years; Assyria is weaker for a generation and knows it.',
    (ctx) => {
      const h = ctx.helpers;
      const me = P(ctx);
      h.adjust(ctx, me, { mar: 50 });
      mod(ctx, 'the_empire_divided', 'The Empire Divided', { moraleMult: 1.1, unrestAll: -0.8 }, 300);
      tagMod(ctx, 'ASR', 'the_brothers_war', 'The War of the Two Brothers', { manpowerMult: 0.85, incomeMult: 0.9 }, 240);
      tagMod(ctx, 'BBL', 'babylon_starved', 'Babylon Starved', { manpowerMult: 0.7, incomeMult: 0.75 }, 180);
      h.chronicle(ctx, 'era', 'Nineveh and Babylon fight for four years and Babylon is starved '
        + 'into surrender. The empire wins and is never the same size again.');
    },
    'Assyria and Babylon fight a four-year civil war'),

  chronicleOnly(
    'ev732w_elam_erased', 'The Erasure of Elam',
    { y: -646, m: 8 },
    'Susa has been taken and what has been done to it is new even by this empire\'s '
      + 'standards. The ziggurat pulled down, the temples exposed, the gods carried off, the '
      + 'royal tombs opened and the bones taken to Assyria so that their ghosts could be '
      + 'denied offerings. Salt and thorn sown over the fields. The inscription says: "the '
      + 'sound of human voices I made to cease in its fields."\n\n'
      + 'Elam has existed as a state for two thousand years. It does not exist any more. The '
      + 'immediate consequence is that the Zagros passes are now open, and the people who '
      + 'come through them next will be Medes.',
    'Ashurbanipal destroyed Susa in 646; the annals and the palace reliefs are unusually explicit about the policy.',
    'Note it, and note what is now on the other side of the passes',
    '+40 governance points and "The Passes Opened" (−0.5 unrest everywhere) for thirty years: Elam is gone and the Median chiefs behind it are no longer anybody\'s buffer.',
    (ctx) => {
      const h = ctx.helpers;
      const me = P(ctx);
      h.adjust(ctx, me, { gov: 40, legitimacy: -5 });
      mod(ctx, 'the_passes_opened', 'The Passes Opened', { unrestAll: -0.5 }, 360);
      tagMod(ctx, 'ELA', 'the_sound_of_voices_ceased', 'The Sound of Voices Ceased', {
        milPowerMult: 0.4, incomeMult: 0.4, manpowerMult: 0.4,
      }, -1);
      tagMod(ctx, 'MDA', 'the_passes_ours', 'The Passes Ours', { milPowerMult: 1.15, manpowerMult: 1.2 }, -1);
      h.chronicle(ctx, 'era', 'Susa is destroyed, its gods carried off and its royal tombs '
        + 'opened. Elam has been a state for two thousand years and stops being one; the Medes '
        + 'inherit the passes.');
    },
    'Assyria destroys Elam and opens the Zagros'),

  chronicleOnly(
    'ev732w_the_scythians', 'The Riders from the Grass',
    { y: -630, m: 6 },
    'Another horse-people has come over the Caucasus and this one has not stopped in the '
      + 'highland. They are through Urartu, through the Assyrian marches, down the coast '
      + 'road, and there are reports of them at the edge of the Egyptian frontier, where '
      + 'Pharaoh is said to have met them with gifts and persuaded them to turn round.\n\n'
      + 'They take nothing that has walls. They take everything that does not, and they are '
      + 'in the country for a generation, and no state on this map can find them when it '
      + 'wants to fight them.',
    'Herodotus I.103-106 puts a Scythian domination of "upper Asia" at twenty-eight years, reaching Palestine and turned back by Psamtik I at the frontier.',
    'Pay them, and get the harvest in behind walls',
    '−150 talents and "The Riders in the Country" (+1.5 unrest everywhere, +8% morale) for fifteen years; every open village in this world pays the same price.',
    (ctx) => {
      const h = ctx.helpers;
      const me = P(ctx);
      h.adjust(ctx, me, { treasury: -150, mar: 25 });
      mod(ctx, 'the_riders_in_the_country', 'The Riders in the Country', { unrestAll: 1.5, moraleMult: 1.08 }, 180);
      tagMod(ctx, 'ASR', 'the_marches_raided', 'The Marches Raided', { manpowerMult: 0.9 }, 180);
      h.chronicle(ctx, 'era', 'Horse-archers are in the country for a generation. They take '
        + 'nothing with walls and everything without them.');
    },
    'Scythian riders reach the Levant'),

  chronicleOnly(
    'ev732w_nineveh_falls', 'The Night Nineveh Burned',
    { y: -612, m: 8 },
    'A Babylonian army and a Median army have been besieging Nineveh since the spring and '
      + 'this month they are inside it. The chronicle from Babylon is uncharacteristically '
      + 'plain: they carried off the vast booty of the city and turned the city into a ruin '
      + 'heap. The king of Assyria is dead, by most accounts in the palace fire he set '
      + 'himself.\n\n'
      + 'Fifteen years ago this was the largest empire that had ever existed and every '
      + 'kingdom in this world paid it. There is a prophet in this country who has written a '
      + 'poem about this day that is essentially a list of sound effects — the whip, the '
      + 'rattling wheels, the prancing horses, the jumping chariots — and it will be read for '
      + 'two thousand five hundred years.',
    'The Gadd Chronicle records the fall of Nineveh in 612 to Nabopolassar of Babylon and Cyaxares the Mede; Nahum 2-3 is the poem.',
    'Watch it happen',
    '+60 martial points, +25 legitimacy, and "The Empire Is Gone" (−1.5 unrest everywhere, +12% income) for twenty-five years. The schedule stops. Everything else starts.',
    (ctx) => {
      const h = ctx.helpers;
      const me = P(ctx);
      h.adjust(ctx, me, { mar: 60, legitimacy: 25 });
      mod(ctx, 'the_empire_is_gone', 'The Empire Is Gone', { unrestAll: -1.5, incomeMult: 1.12 }, 300);
      tagMod(ctx, 'ASR', 'a_ruin_heap', 'A Ruin Heap', {
        milPowerMult: 0.35, incomeMult: 0.3, manpowerMult: 0.3, legitimacyAdd: -0.5,
      }, -1);
      tagMod(ctx, 'BBL', 'the_new_empire', 'The New Empire', {
        milPowerMult: 1.2, incomeMult: 1.2, manpowerMult: 1.2,
      }, -1);
      tagMod(ctx, 'MDA', 'the_median_share', 'The Median Share', { milPowerMult: 1.15, incomeMult: 1.15 }, -1);
      // The division of the heartland (SPEC §277). 612 did not end Assyria —
      // the rump governed from Harran for three more years and Egypt marched
      // north in 609 precisely because the Levant was loose. So the empire
      // loses MESOPOTAMIA here and keeps the west until Carchemish: Media
      // takes the north and the Zagros side, Babylon the rest.
      cedeNamed(ctx, ['Arbela', 'Assur', 'Nisibis', 'Singara'], 'ASR', 'MDA');
      cedeNamed(ctx, ['Hatra', 'Carrhae', 'Edessa'], 'ASR', 'BBL');
      try {
        const t = ctx.game.tags[me];
        if (t && t.overlord === 'ASR') t.overlord = null;
      } catch (e) { warnOnce('nineveh:vassal', e); }
      h.setFlag(ctx, 'ninevehFallen', true);
      h.chronicle(ctx, 'era', 'Nineveh is taken and turned into a ruin heap. The tribute schedule '
        + 'that has governed this country for a hundred and twenty years has nowhere to be sent.');
    },
    'Babylon and Media destroy Nineveh'),

  chronicleOnly(
    'ev732w_carchemish', 'The Field at Carchemish',
    { y: -605, m: 5 },
    'The last Assyrian force and the Egyptian army that came north to prop it up have been '
      + 'caught at the Euphrates crossing by the Babylonian crown prince, and destroyed '
      + 'completely — "not a single man escaped to his own country", says the chronicle, '
      + 'which is the sort of thing chronicles say and in this case appears to be close to '
      + 'true.\n\n'
      + 'The Assyrian empire ends here, in a field, as a footnote to somebody else\'s '
      + 'victory. Everything from the Euphrates to the Egyptian frontier now belongs to '
      + 'Babylon, and the man who won the battle gets the news of his father\'s death in the '
      + 'same season and rides home across the desert to be crowned.',
    'The Babylonian Chronicle for 605: Nebuchadnezzar destroyed the Egyptian army at Carchemish and pursued it to Hamath; Nabopolassar died in August and he returned to Babylon to take the throne.',
    'Understand who the letters go to now',
    '+50 influence points and "The New Great King" (−0.5 unrest everywhere) for twenty years. Babylon to +30 regard; Egypt is finished in Asia for good.',
    (ctx) => {
      const h = ctx.helpers;
      const me = P(ctx);
      h.adjust(ctx, me, { infl: 50 });
      mod(ctx, 'the_new_great_king', 'The New Great King', { unrestAll: -0.5 }, 240);
      opinion(ctx, 'BBL', me, 30);
      tagMod(ctx, 'MIZ', 'finished_in_asia', 'Finished in Asia', { moraleMult: 0.85, manpowerMult: 0.85 }, -1);
      // "The last Assyrian force" is the Harran rump that survived 612, and
      // this is where it stops existing (SPEC §277). Everything it still holds
      // — which is the Levant, unless the player has taken some of it — passes
      // to Babylon, and the chronicle line below becomes literally true.
      const west = ctx.game.provinces.filter((q) => q && !q.impassable && q.owner === 'ASR').length;
      endCourt(ctx, 'ASR', 'BBL');
      h.setFlag(ctx, 'carchemishFought', true);
      h.chronicle(ctx, 'era', 'The Egyptian army is destroyed at Carchemish and pursued to Hamath. '
        + 'Everything from the Euphrates to the Brook of Egypt answers to Babylon now'
        + (west ? ' — ' + west + ' provinces change hands with the last Assyrian government' : '')
        + '.');
    },
    'Nebuchadnezzar destroys Egypt at Carchemish'),

  chronicleOnly(
    'ev732w_the_greeks_and_the_coin', 'The Lydians Strike Metal',
    { y: -640, m: 4 },
    'Merchants from beyond Cyprus are paying with something new: lumps of electrum from the '
      + 'river at Sardis, stamped by the king with a lion\'s head, of guaranteed weight and '
      + 'guaranteed purity. You do not have to weigh them. You do not have to assay them. '
      + 'You count them.\n\n'
      + 'Every transaction in this world has, until this month, involved a balance and a '
      + 'certain amount of arguing. The implications for taxation, for wages, for hiring '
      + 'soldiers and for the price of everything have not been worked out by anybody yet, '
      + 'including the man who is doing it.',
    'Lydian electrum coinage from c. 630-600 is the earliest true coinage; the Greek cities of Ionia adopted it within a generation.',
    'Take the stamped metal at its face',
    '+120 talents and "The Stamped Metal" (+8% trade, +6% income) permanently — the first state on this coast to price in coin has an advantage over every one that does not.',
    (ctx) => {
      const h = ctx.helpers;
      const me = P(ctx);
      h.adjust(ctx, me, { treasury: 120, infl: 20 });
      mod(ctx, 'the_stamped_metal', 'The Stamped Metal', { tradeMult: 1.08, incomeMult: 1.06 });
      tagMod(ctx, 'LYD', 'the_lion_stamp', 'The Lion Stamp', { incomeMult: 1.2, tradeMult: 1.15 }, -1);
      h.chronicle(ctx, 'era', 'Stamped electrum out of Sardis begins circulating on this coast. '
        + 'Nobody weighs it, which is the whole invention.');
    },
    'Lydia strikes the first coins'),

  chronicleOnly(
    'ev732w_psamtik_and_the_greeks', 'Bronze Men From the Sea',
    { y: -656, m: 6 },
    'Egypt has an Egyptian Pharaoh again, out of Sais, and the way he got the country back '
      + 'from the Assyrian garrisons is worth knowing: he hired Carians and Ionians — heavy '
      + 'infantry in bronze, fighting in a line with long spears and big shields — and used '
      + 'them as the core of a new army. An oracle had told his father that bronze men would '
      + 'come out of the sea and avenge him, which is either a very good prophecy or a very '
      + 'good recruiting slogan.\n\n'
      + 'He has given them land in the Delta and a trading port of their own. Every army in '
      + 'this world is now in the market for that kind of soldier.',
    'Psamtik I (664-610) unified Egypt using Carian and Ionian mercenaries and settled them at Daphnae; Herodotus II.152-154 gives the oracle and the settlement.',
    'Hire what can be hired',
    '−150 talents and "The Bronze Men" (+8% army strength, +5% morale) for thirty years; Egypt is a real army again and an expensive friend.',
    (ctx) => {
      const h = ctx.helpers;
      const me = P(ctx);
      h.adjust(ctx, me, { treasury: -150, mar: 35 });
      mod(ctx, 'the_bronze_men', 'The Bronze Men', { milPowerMult: 1.08, moraleMult: 1.05 }, 360);
      tagMod(ctx, 'MIZ', 'the_saite_restoration', 'The Saite Restoration', {
        milPowerMult: 1.15, incomeMult: 1.15, moraleMult: 1.1,
      }, -1);
      try { h.removeModifier(ctx, 'MIZ', 'memphis_taken'); } catch (e) { warnOnce('psamtik:mod', e); }
      h.chronicle(ctx, 'era', 'An Egyptian Pharaoh out of Sais takes the country back from the '
        + 'Assyrian garrisons with hired Greek and Carian heavy infantry, and settles them in '
        + 'the Delta.');
    },
    'Psamtik I restores Egypt with Greek mercenaries'),
];
