// Judaea Universalis — the other side of the line: 596–452 BCE (SPEC §281).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// The chapter has the empire — Babylon, then Persia, in the world and Persian
// spines — and it has the destruction and the exile, which are the realm. It
// had almost nothing at the scale in between, and that scale is the whole
// story of the period: the five courts that met in this city to plot a revolt
// and then went home; the Edomites who were at the gate and then in the hill
// country and then in possession of it; a siege of Tyre that lasted thirteen
// years and paid its army nothing; Sidon quietly becoming first city of the
// coast; the Arabs who paid Persia a gift rather than a tribute and were the
// only people in the empire who did; and, at the end, the ring of neighbours
// around a small province — Samaria to the north, Ammon to the east, Ashdod
// to the west, Arabia to the south — who all had opinions about a wall.
//
// Sources: Jeremiah 27, 40-41 and 48-49; Obadiah; Ezekiel 25-29 and 35;
// 2 Kings 25; Lamentations; Josephus, Antiquities X, for the Moabite and
// Ammonite campaign of 582; the Babylonian Chronicle and the Nabonidus
// Chronicle for Tyre, Tayma and 539; Herodotus III.88-97 and VII.89 for the
// Arab exemption and the Phoenician squadrons; the Behistun inscription;
// Ezra 4 and Nehemiah 2-6 and 13 for Sanballat, Tobiah, Geshem and the
// speech of Ashdod; the Elephantine papyri; the Yehud and Sidonian coinages.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_597bce_neighbours] ' + key, e || '');
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
    const t = ctx.game.tags && ctx.game.tags[tag];
    if (!t || t.alive === false) return;
    ctx.helpers.addTagModifier(ctx, tag, {
      id, name, months: Number.isFinite(months) ? months : -1, effects,
    });
  } catch (e) { warnOnce('tagMod:' + id, e); }
}

// `ctx.helpers` has no addOpinion — a content package writes the regard it
// changes straight onto the court that holds it, inside the same clamp the
// sim uses.
function opinion(ctx, from, of, delta) {
  try {
    const t = ctx.game.tags && ctx.game.tags[from];
    if (!t) return;
    if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
    t.opinion[of] = Math.max(-200, Math.min(200, (t.opinion[of] || 0) + delta));
  } catch (e) { warnOnce('opinion', e); }
}

function N(id, title, y, m, desc, historical, a, b) {
  return {
    id, title, desc, historical, forTag: 'player', date: { y, m }, aiOption: 0,
    options: [
      { label: a.label, tooltip: a.tooltip, effects: guard(id + ':0', a.fx) },
      { label: b.label, tooltip: b.tooltip, effects: guard(id + ':1', b.fx) },
    ],
  };
}

export const EVENTS_597_NEIGHBOURS = [

  N('ev597n_the_ammonite_offer', 'The Ammonite Offer', -596, 4,
    'The king of Ammon has sent word, through a merchant and not through an envoy, that men '
    + 'of this country who cannot live under the new arrangement will be received across the '
    + 'Jordan, fed, and not handed back. He has already got several.\n\nIt is a generous '
    + 'offer and it is not charity. A neighbour who holds your malcontents holds a lever, and '
    + 'the day Ammon decides to use it there will be a claimant to this throne living '
    + 'comfortably forty miles away with a household and a grievance.',
    'Jeremiah 40:14 and 41:15 record Baalis king of the Ammonites backing Ishmael son of Nethaniah, and Ishmael fleeing to Ammon afterwards.',
    { label: 'Ask for them back, formally', tooltip: '+30 influence points, +15 governance points and "The Extradition Asked" (+8% income, −0.5 unrest everywhere) for thirty years, at Ammon\'s regard −30.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { infl: 30, gov: 15 });
        mod(ctx, 'n597_extradition_asked', 'The Extradition Asked', { incomeMult: 1.08, unrestAll: -0.5 }, 360);
        opinion(ctx, 'AMO', me, -30);
        h.chronicle(ctx, 'era', 'A formal demand crosses the Jordan and is formally refused, which at least establishes that the crown knows who is over there and is counting.'); } },
    { label: 'Let them go and be glad of it', tooltip: '+35 governance points and "The Malcontents Abroad" (−0.8 unrest everywhere, +6% income) for thirty years; Ammon to +20 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { gov: 35, legitimacy: -8 });
        mod(ctx, 'n597_malcontents_abroad', 'The Malcontents Abroad', { unrestAll: -0.8, incomeMult: 1.06 }, 360);
        opinion(ctx, 'AMO', me, 20);
        h.chronicle(ctx, 'era', 'Nothing is asked and nothing is said. The hardest men in the country take themselves across the river, which makes the country quieter and Ammon more interesting.'); } }),

  N('ev597n_the_envoys_in_the_court', 'Five Courts in One Room', -594, 9,
    'There are envoys from Edom, Moab, Ammon, Tyre and Sidon in the palace at the same time, '
    + 'which has not happened in living memory, and what they are here to discuss is a common '
    + 'refusal of the Babylonian yoke. Egypt has a new king and is said to be interested.\n\n'
    + 'The prophet has come into the court with a wooden yoke on his own neck and told all '
    + 'five of them, by name, in front of each other, to put their necks under the king of '
    + 'Babylon and live. The envoys found this extremely rude. Nobody has been able to say it '
    + 'was wrong.',
    'Jeremiah 27:3 names messengers from Edom, Moab, Ammon, Tyre and Sidon come to Zedekiah at Jerusalem; Jeremiah wore yokes and sent one to each king.',
    { label: 'Send them home with the yoke', tooltip: '+40 governance points and "The Yoke Accepted" (+9% income, −0.7 unrest everywhere, −6% morale) for twenty-five years; Babylon to +35 regard, the four courts to −20.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { gov: 40, infl: 20 });
        mod(ctx, 'n597_yoke_accepted', 'The Yoke Accepted', { incomeMult: 1.09, unrestAll: -0.7, moraleMult: 0.94 }, 300);
        opinion(ctx, 'BBL', me, 35);
        opinion(ctx, 'EDM', me, -20); opinion(ctx, 'MOB', me, -20); opinion(ctx, 'AMO', me, -20); opinion(ctx, 'TYR', me, -20);
        h.chronicle(ctx, 'era', 'The five envoys go home with nothing, and the prophet walks out of the court still wearing the yoke, which somebody breaks off his neck within the month.'); } },
    { label: 'Hear them out and keep the door open', tooltip: '+25 legitimacy, +30 martial points and "The Door Left Open" (+9% morale, +6% manpower, +0.7 unrest everywhere) for twenty years; the four courts to +25, Babylon to −35.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { legitimacy: 25, mar: 30 });
        mod(ctx, 'n597_door_left_open', 'The Door Left Open', { moraleMult: 1.09, manpowerMult: 1.06, unrestAll: 0.7 }, 240);
        opinion(ctx, 'EDM', me, 25); opinion(ctx, 'MOB', me, 25); opinion(ctx, 'AMO', me, 25); opinion(ctx, 'TYR', me, 25);
        opinion(ctx, 'BBL', me, -35);
        h.chronicle(ctx, 'era', 'No commitment is made and no door is shut. Five courts go home believing they have a sixth, which is exactly as much as any of them has.'); } }),

  N('ev597n_who_is_actually_in', 'Who Is Actually In', -589, 3,
    'The revolt is decided and the roll is being called. Tyre is in, which is worth a great '
    + 'deal, because Tyre on its island can hold out for years and ties down an army. Ammon '
    + 'is in. Egypt says it is in.\n\nEdom is not in. Edom has said nothing at all, which in '
    + 'the language of these things means it has already chosen, and what it has chosen is to '
    + 'be standing beside the winner when this is over, at the southern end of our border, '
    + 'with an army.',
    'Ezekiel 21:18-23 shows Nebuchadnezzar choosing between Rabbath-Ammon and Jerusalem; Obadiah and Psalm 137:7 accuse Edom of standing with Babylon at the fall.',
    { label: 'Garrison the south against Edom', tooltip: '−1,700 manpower, +30 martial points and "The Southern Garrison" (+1 fort defence, +7% manpower, −5% income) for twenty-five years, at Edom\'s regard −40.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { manpower: -1700, mar: 30 });
        mod(ctx, 'n597_southern_garrison', 'The Southern Garrison', { fortDefBonus: 1, manpowerMult: 1.07, incomeMult: 0.95 }, 300);
        opinion(ctx, 'EDM', me, -40);
        h.chronicle(ctx, 'era', 'Companies are left in the southern forts instead of joining the field army, on the reasoning that the knife you can see is the one you should watch.'); } },
    { label: 'Put everything into the north with Tyre', tooltip: '+25 martial points, +12 legitimacy and "Everything to the North" (+11% army strength, +8% morale) for twenty years; Tyre to +35 regard, Edom unwatched.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { mar: 25, legitimacy: 12 });
        mod(ctx, 'n597_everything_to_the_north', 'Everything to the North', { milPowerMult: 1.11, moraleMult: 1.08 }, 240);
        opinion(ctx, 'TYR', me, 35);
        h.chronicle(ctx, 'era', 'Every company goes north to hold the road with Tyre, and the southern forts are left with the men too old to march.'); } }),

  N('ev597n_edom_at_the_gate', 'Do Not Stand in the Crossway', -584, 8,
    'The reports from the last days agree on one detail that nobody in this country will '
    + 'forget. When the wall went and the people ran south down the wadis, there were '
    + 'Edomites at the crossways — not fighting, standing — turning back the fugitives and '
    + 'handing them over, and going up into the emptied villages behind them.\n\nThe prophets '
    + 'are writing it down in language they do not use about Babylon. Babylon did what an '
    + 'empire does. Edom is a brother, by the country\'s own reckoning of descent, and it '
    + 'stood in the crossway.',
    'Obadiah 10-14 condemns Edom for standing in the crossway to cut off the escapers and delivering up the remnant; Ezekiel 35 and Psalm 137:7 say the same.',
    { label: 'Write it down and remember it', tooltip: '+30 legitimacy and "The Crossway" (+0.3 legitimacy a month, +9% morale, +0.5 unrest everywhere) permanently, at Edom\'s regard −60.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { legitimacy: 30 });
        mod(ctx, 'n597_the_crossway', 'The Crossway', { legitimacyAdd: 0.3, moraleMult: 1.09, unrestAll: 0.5 });
        opinion(ctx, 'EDM', me, -60);
        h.chronicle(ctx, 'era', 'The thing Edom did at the crossways is written into the prophets in the present tense, and five hundred years later it is still being read aloud in that tense.'); } },
    { label: 'Buy the fugitives back instead', tooltip: '−170 talents, +2,000 manpower, +12 legitimacy and "The Ransomed" (+10% manpower, +7% growth, −0.4 unrest everywhere) for thirty years; Edom to −20 regard rather than −60.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -170, manpower: 2000, legitimacy: 12 });
        mod(ctx, 'n597_the_ransomed', 'The Ransomed', { manpowerMult: 1.1, growthMult: 1.07, unrestAll: -0.4 }, 360);
        opinion(ctx, 'EDM', me, -20);
        h.chronicle(ctx, 'era', 'Whatever silver is left is spent buying people back from the men who caught them, which is humiliating, effective, and remembered by the families rather than the prophets.'); } }),

  N('ev597n_moab_and_ammon_taken', 'Their Turn', -581, 5,
    'The Babylonian army has come back west and gone straight past us. Moab and Ammon — who '
    + 'were in the revolt, who were promised the same Egyptian help, who spent the last three '
    + 'years being told they had chosen more cleverly than we had — have been taken, their '
    + 'kings removed, their populations deported.\n\nThere is no satisfaction in the streets, '
    + 'which is itself surprising. What there is instead is a very quiet recognition that the '
    + 'empire was never choosing between us; it was working down a list.',
    'Josephus (Antiquities X.9.7) records a Babylonian campaign against Moab and Ammon in Nebuchadnezzar\'s twenty-third year; both kingdoms disappear as independent states thereafter.',
    { label: 'Take in what crosses the river', tooltip: '−90 talents, +1,800 manpower and "The Eastern Refugees" (+9% manpower, +7% growth, +0.6 unrest everywhere) for thirty years; Ammon and Moab to +30 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -90, manpower: 1800 });
        mod(ctx, 'n597_eastern_refugees', 'The Eastern Refugees', { manpowerMult: 1.09, growthMult: 1.07, unrestAll: 0.6 }, 360);
        opinion(ctx, 'AMO', me, 30); opinion(ctx, 'MOB', me, 30);
        h.chronicle(ctx, 'era', 'Moabite and Ammonite families are given ground in the eastern villages by a country that has just learned exactly what it is like.'); } },
    { label: 'Close the fords and report them', tooltip: '+35 influence points, +20 governance points and "Nothing Crossed the River" (+8% income, −0.6 unrest everywhere) for thirty years; Babylon to +30 regard, Ammon and Moab to −35.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { infl: 35, gov: 20 });
        mod(ctx, 'n597_nothing_crossed', 'Nothing Crossed the River', { incomeMult: 1.08, unrestAll: -0.6 }, 360);
        opinion(ctx, 'BBL', me, 30); opinion(ctx, 'AMO', me, -35); opinion(ctx, 'MOB', me, -35);
        h.chronicle(ctx, 'era', 'The fords are watched and what tries to cross is turned back or handed over, which is precisely what was done to this country\'s own people three years ago.'); } }),

  N('ev597n_the_hill_country_settled', 'Somebody Else\'s Villages', -579, 4,
    'The southern hill country is being settled by Edomites. The villages were emptied in the '
    + 'deportation, the terraces are still good, and there is nobody with a title deed within '
    + 'five hundred miles. They are not raiding. They are ploughing, building, burying their '
    + 'dead and putting up shrines.\n\nIn a generation the whole south of this country will '
    + 'speak with a different accent and worship under a different name, and the process is '
    + 'happening at the speed of ordinary farming, which is a speed nothing available to this '
    + 'court can stop.',
    'Edomite settlement of the southern Judaean hills from the sixth century produces the region later known as Idumaea; Hebron becomes an Idumaean town.',
    { label: 'Take rent from them and keep the register', tooltip: '+110 talents, +25 governance points and "The Register Kept" (+8% income, +6% growth, +0.2 legitimacy a month) permanently; Edom to +20 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 110, gov: 25, legitimacy: 8 });
        mod(ctx, 'n597_register_kept', 'The Register Kept', { incomeMult: 1.08, growthMult: 1.06, legitimacyAdd: 0.2 });
        opinion(ctx, 'EDM', me, 20);
        h.chronicle(ctx, 'era', 'The new settlers pay rent to a court that has no army, which works because the court has the only surviving list of who owned what, and everybody wants to be on a list.'); } },
    { label: 'Refuse to recognise any of it', tooltip: '+30 legitimacy and "The Land Is Not Theirs" (+0.3 legitimacy a month, +8% morale, −6% income) permanently, at Edom\'s regard −40.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { legitimacy: 30, treasury: -40 });
        mod(ctx, 'n597_land_is_not_theirs', 'The Land Is Not Theirs', { legitimacyAdd: 0.3, moraleMult: 1.08, incomeMult: 0.94 });
        opinion(ctx, 'EDM', me, -40);
        h.chronicle(ctx, 'era', 'The old boundaries are copied out, kept, and recited. They describe a country that does not exist, and four centuries later a Hasmonean with an army uses the copy.'); } }),

  N('ev597n_thirteen_years_no_wages', 'Thirteen Years and No Wages', -576, 7,
    'The siege of Tyre is over. It lasted thirteen years, every head in the Babylonian army '
    + 'was rubbed bald by the carrying-straps of the baskets and every shoulder was worn raw, '
    + 'and at the end of it the city came to terms and kept its wealth, because a city on an '
    + 'island loads its treasure onto ships.\n\nThe army got nothing. The empire has spent '
    + 'thirteen campaigning seasons and the price of a war on a rock that produced no plunder '
    + 'at all, and every court on this coast has watched it happen and drawn the appropriate '
    + 'conclusion about walls.',
    'Ezekiel 29:18-20: "every head was made bald, and every shoulder was peeled: yet had he no wages, nor his army, for Tyre" — the thirteen-year siege ended in terms, not sack.',
    { label: 'Put the lesson into our own walls', tooltip: '−160 talents, +35 martial points and "What Tyre Proved" (+2 fort defence, +7% manpower) permanently.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -160, mar: 35 });
        mod(ctx, 'n597_what_tyre_proved', 'What Tyre Proved', { fortDefBonus: 2, manpowerMult: 1.07 });
        h.chronicle(ctx, 'era', 'The masons are put to work on cisterns before they are put to work on walls, because the thing that held Tyre for thirteen years was water.'); } },
    { label: 'Put it into ships and warehouses instead', tooltip: '−130 talents, +20 influence points and "What Tyre Kept" (+12% trade, +6% income) permanently; Tyre to +30 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -130, infl: 20 });
        mod(ctx, 'n597_what_tyre_kept', 'What Tyre Kept', { tradeMult: 1.12, incomeMult: 1.06 });
        opinion(ctx, 'TYR', me, 30);
        h.chronicle(ctx, 'era', 'The lesson taken is the other one: what cannot be carried away cannot be lost, and what can be carried away should be on a ship before the army arrives.'); } }),

  N('ev597n_sidon_is_first_again', 'Sidon Is First Again', -573, 9,
    'Tyre has kept its wealth and lost its standing. The Babylonian settlement leaves it with '
    + 'a king under supervision and its mainland stripped, and the business of the coast has '
    + 'moved twenty miles north to Sidon, which spent the thirteen years selling to both '
    + 'sides and has emerged as the first city of Phoenicia.\n\nSidon is now where the coast '
    + 'trade is priced, where the ships are registered, and where a small inland court sends '
    + 'its agent if it wants anything to reach the sea.',
    'Sidon supersedes Tyre as the leading Phoenician city under Babylonian and then Persian rule; by the fifth century the Sidonian king commands the Persian fleet.',
    { label: 'Send an agent to Sidon', tooltip: '−70 talents, +15 influence points and "The Agent at Sidon" (+10% trade, +5% income) permanently; Tyre to +25 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -70, infl: 15 });
        mod(ctx, 'n597_agent_at_sidon', 'The Agent at Sidon', { tradeMult: 1.1, incomeMult: 1.05 });
        opinion(ctx, 'TYR', me, 25);
        h.chronicle(ctx, 'era', 'A permanent factor is established on the Sidonian waterfront with a warehouse and a seal, and for the first time in forty years this country has a price at the sea.'); } },
    { label: 'Sell inland instead, east and south', tooltip: '+90 talents, +20 governance points and "The Inland Trade" (+8% income, +7% production, −5% trade) permanently; Ammon and Qedar to +25 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 90, gov: 20 });
        mod(ctx, 'n597_inland_trade', 'The Inland Trade', { incomeMult: 1.08, prodMult: 1.07, tradeMult: 0.95 });
        opinion(ctx, 'AMO', me, 25); opinion(ctx, 'QDR', me, 25);
        h.chronicle(ctx, 'era', 'The wine and oil go east across the Jordan and south to the desert markets, which pay less, pay in kind, and do not require a port anybody else controls.'); } }),

  N('ev597n_the_samaritan_offer', 'The Offer From the North', -571, 3,
    'The governor of the province to the north has written to propose that the administration '
    + 'of this district be merged into his — one assessment, one court of appeal, one '
    + 'governor, the saving of a whole establishment nobody here can afford to staff.\n\nHis '
    + 'argument is entirely administrative and entirely sound. What it would also do is end '
    + 'the separate existence of this place as a unit of anything, permanently, in a filing '
    + 'system that will outlast everyone in the room.',
    'Yehud was administered from Samaria for parts of the Babylonian and early Persian periods; Ezra 4 and Nehemiah 2-4 show the Samarian governor treating Jerusalem as within his sphere.',
    { label: 'Refuse, and pay for our own establishment', tooltip: '−120 talents, +25 legitimacy and "A District of Our Own" (+0.25 legitimacy a month, +7% income, −6% cost of governing) permanently.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -120, legitimacy: 25, gov: 25 });
        mod(ctx, 'n597_a_district_of_our_own', 'A District of Our Own', { legitimacyAdd: 0.25, incomeMult: 1.07, adminMult: 0.94 });
        h.chronicle(ctx, 'era', 'A governor, a seal, a scribe and a treasury are found out of almost nothing, and the district keeps a name of its own in the imperial files.'); } },
    { label: 'Accept the merger and save the money', tooltip: '+180 talents, +35 governance points, −20 legitimacy and "Administered From the North" (+9% income, −10% cost of governing, −0.2 legitimacy a month) for thirty years.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 180, gov: 35, legitimacy: -20 });
        mod(ctx, 'n597_administered_from_the_north', 'Administered From the North', { incomeMult: 1.09, adminMult: 0.9, legitimacyAdd: -0.2 }, 360);
        h.chronicle(ctx, 'era', 'The district is folded into the northern province. The roads are better, the assessment is fairer, and there is no longer a place on any imperial map with this country\'s name on it.'); } }),

  N('ev597n_the_army_goes_down_to_egypt', 'The Army Goes Down to Egypt', -568, 5,
    'The Babylonian army is marching down the coast road to invade Egypt — the country that '
    + 'promised this one an army and sent a column that turned round — and the men who fled '
    + 'south after the fall are in its path.\n\nThe colonies at the Delta and up the river are '
    + 'full of people from here: soldiers, families, the ones who would not stay under a '
    + 'governor. Whatever happens to Egypt now happens to them, and this court has no '
    + 'standing to ask anybody about it.',
    'A fragmentary Babylonian text records a campaign against Amasis of Egypt in Nebuchadnezzar\'s thirty-seventh year (568/7); Jeremiah 43-44 places Judahite refugees at Tahpanhes, Migdol, Noph and Pathros.',
    { label: 'Send silver to the colonies', tooltip: '−140 talents, +15 legitimacy and "The Cousins in Egypt" (+9% trade, +0.2 legitimacy a month, −0.4 unrest everywhere) permanently; Egypt to +25 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -140, legitimacy: 15 });
        mod(ctx, 'n597_cousins_in_egypt', 'The Cousins in Egypt', { tradeMult: 1.09, legitimacyAdd: 0.2, unrestAll: -0.4 });
        opinion(ctx, 'MIZ', me, 25);
        h.chronicle(ctx, 'era', 'Silver goes down to the river colonies with a letter, and a correspondence begins that runs for two hundred years and survives in somebody\'s rubbish pit.'); } },
    { label: 'Have nothing to do with them', tooltip: '+40 governance points, +15 influence points and "They Went Down Against Counsel" (+8% income, −0.6 unrest everywhere) for thirty years; Babylon to +25 regard, Egypt to −25.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { gov: 40, infl: 15 });
        mod(ctx, 'n597_against_counsel', 'They Went Down Against Counsel', { incomeMult: 1.08, unrestAll: -0.6 }, 360);
        opinion(ctx, 'BBL', me, 25); opinion(ctx, 'MIZ', me, -25);
        h.chronicle(ctx, 'era', 'The court declines any connection with the people who went down to Egypt, which is prudent, correct, and the reason a whole community stops writing home.'); } }),

  N('ev597n_gibeon_and_mizpah', 'The Towns That Were Not Burned', -564, 6,
    'Not everything was destroyed. The Benjaminite towns north of the capital — Gibeon, '
    + 'Mizpah, Bethel — were not besieged, not burned and not emptied, because they opened '
    + 'their gates early, and they are now the only functioning towns with intact granaries, '
    + 'intact wine presses and an intact population in the whole district.\n\nThe returning '
    + 'families from the ruined villages regard them as collaborators. The administration '
    + 'regards them as the tax base. Both facts are going to have to be lived with, and '
    + 'somebody has to say which one the court is going to act on.',
    'Archaeology shows continuity through the sixth century at Mizpah, Gibeon and Bethel, in contrast with the destruction of Jerusalem and the Judaean hill towns; Mizpah served as the Babylonian administrative centre.',
    { label: 'Govern from the towns that survived', tooltip: '+150 talents, +35 governance points and "The Surviving Towns" (+10% income, +8% growth, +0.5 unrest everywhere) for forty years.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 150, gov: 35, legitimacy: -10 });
        mod(ctx, 'n597_surviving_towns', 'The Surviving Towns', { incomeMult: 1.1, growthMult: 1.08, unrestAll: 0.5 }, 480);
        h.chronicle(ctx, 'era', 'The seat of administration stays in the north of the district, where the granaries are, and the ruined south is taxed by men from towns it has not forgiven.'); } },
    { label: 'Rebuild the ruined towns first', tooltip: '−170 talents and "The Ruined Towns Rebuilt" (+9% manpower, +0.25 legitimacy a month, −0.6 unrest everywhere) permanently.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -170, legitimacy: 25 });
        mod(ctx, 'n597_ruined_towns_rebuilt', 'The Ruined Towns Rebuilt', { manpowerMult: 1.09, legitimacyAdd: 0.25, unrestAll: -0.6 });
        h.chronicle(ctx, 'era', 'Seed, tools and roof timber go south to the burned villages at the expense of the ones that opened their gates, which is expensive, slow, and the only decision the south will accept.'); } }),

  N('ev597n_the_wine_trade', 'Wine for the Desert', -559, 3,
    'The Arabs will buy wine. They will buy all of it, at a good price, paid in incense or in '
    + 'silver by weight, and they will carry it away themselves on their own animals with no '
    + 'port, no ship and no Phoenician factor taking a cut in the middle.\n\nThe terraces of '
    + 'this country are one of the few things the deportation did not destroy — a vine takes '
    + 'four years and a village takes forty — and there is a whole market three days\' ride '
    + 'south that nobody with an army has ever bothered to tax.',
    'Judaean and Idumaean wine and oil moved into the Arabian caravan trade throughout the Persian period; Qedarite involvement in the Negev is attested by the Tell el-Maskhuta silver bowls.',
    { label: 'Plant for the desert market', tooltip: '−80 talents, +20 influence points and "The Desert Market" (+11% trade, +7% production) permanently; Qedar to +35 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -80, infl: 20 });
        mod(ctx, 'n597_desert_market', 'The Desert Market', { tradeMult: 1.11, prodMult: 1.07 });
        opinion(ctx, 'QDR', me, 35);
        h.chronicle(ctx, 'era', 'The terraces go back under vines for a market that pays in incense, and the district discovers that it can be solvent without a port, a fleet or a king.'); } },
    { label: 'Plant grain — the district must feed itself', tooltip: '−60 talents, +25 governance points and "Bread Before Wine" (+10% growth, −0.7 unrest everywhere, −5% trade) permanently.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -60, gov: 25 });
        mod(ctx, 'n597_bread_before_wine', 'Bread Before Wine', { growthMult: 1.1, unrestAll: -0.7, tradeMult: 0.95 });
        h.chronicle(ctx, 'era', 'The terraces go under barley. It is the wrong crop for the ground and the right one for a district that remembers what a siege is.'); } }),

  N('ev597n_the_king_in_the_desert', 'The King Has Gone to the Oasis', -556, 8,
    'The king of Babylon has left Babylon. Not on campaign — he has moved, with his court, to '
    + 'an oasis in the northern Arabian desert, and has been there for years, while his son '
    + 'runs the capital and the new year festival goes uncelebrated because the king who must '
    + 'take the god\'s hand is eight hundred miles away.\n\nWhat it means for us is that the '
    + 'desert oases are now imperial cities with garrisons and building programmes, the '
    + 'caravan routes through them are under direct royal management, and the Arab sheikhs who '
    + 'used to set the price of the southern road are taking orders.',
    'Nabonidus resided at Tayma in north-west Arabia for about ten years, campaigning in the oases of the Hejaz while Belshazzar governed Babylon; the Nabonidus Chronicle records the akitu festival unheld.',
    { label: 'Trade into the royal oases', tooltip: '+160 talents and "The Oasis Trade" (+10% trade, +6% income) for forty years; Babylon to +25 regard, Qedar to −20.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 160, infl: 20 });
        mod(ctx, 'n597_oasis_trade', 'The Oasis Trade', { tradeMult: 1.1, incomeMult: 1.06 }, 480);
        opinion(ctx, 'BBL', me, 25); opinion(ctx, 'QDR', me, -20);
        h.chronicle(ctx, 'era', 'Caravans go south to sell into a royal building programme in the middle of a desert, which is the safest and strangest market this district has ever had.'); } },
    { label: 'Keep with the sheikhs the empire displaced', tooltip: '+90 talents, +15 influence points and "The Old Road South" (+9% trade, +6% manpower, +0.4 unrest everywhere) permanently; Qedar to +35 regard, Babylon to −20.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 90, infl: 15 });
        mod(ctx, 'n597_old_road_south', 'The Old Road South', { tradeMult: 1.09, manpowerMult: 1.06, unrestAll: 0.4 });
        opinion(ctx, 'QDR', me, 35); opinion(ctx, 'BBL', me, -20);
        h.chronicle(ctx, 'era', 'The district keeps dealing with the men the empire pushed off the wells, on the grounds that empires leave the desert and the men on the wells do not.'); } }),

  N('ev597n_media_becomes_persia', 'The Northern Neighbour Changes Its Name', -553, 4,
    'The Median empire — the power that broke Nineveh, the one everybody east of the '
    + 'Euphrates has spent fifty years measuring themselves against — has been taken over '
    + 'from inside by a vassal king of a southern province, in three years, with the Median '
    + 'army changing sides in the field.\n\nThe practical consequence for a small district in '
    + 'the west is nil this year and everything within twenty. There is now one power on the '
    + 'plateau instead of two, it is run by somebody nobody here has a single letter from, and '
    + 'it is going to be looking west.',
    'Cyrus II of Anshan overthrew Astyages of Media between 553 and 550; the Nabonidus Chronicle records the Median army revolting and handing Astyages over.',
    { label: 'Find out who he is', tooltip: '−60 talents, +40 influence points and "A Letter to Anshan" (+0.2 legitimacy a month, +7% trade) permanently; Persia to +30 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -60, infl: 40 });
        mod(ctx, 'n597_letter_to_anshan', 'A Letter to Anshan', { legitimacyAdd: 0.2, tradeMult: 1.07 });
        opinion(ctx, 'PAS', me, 30);
        h.chronicle(ctx, 'era', 'Two men go east with instructions to find out what the new king does about temples, about deportees and about the gods of conquered cities. What they bring back is read very carefully indeed.'); } },
    { label: 'Nothing on the plateau concerns us', tooltip: '+40 governance points and "The West Looks West" (+8% income, +7% production, −0.4 unrest everywhere) for thirty years.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { gov: 40 });
        mod(ctx, 'n597_west_looks_west', 'The West Looks West', { incomeMult: 1.08, prodMult: 1.07, unrestAll: -0.4 }, 360);
        h.chronicle(ctx, 'era', 'The court attends to the harvest and the roads. When the news from the plateau finally becomes the news here, it arrives as a surprise, which it need not have been.'); } }),

  N('ev597n_tyre_buys_a_future', 'Tyre Buys a Future', -545, 5,
    'Tyre has stopped being ruled by kings. The last of them has been replaced by judges — '
    + 'appointed magistrates on short terms, drawn from the merchant houses — and the city '
    + 'has effectively converted itself from a monarchy into a company, on the reasoning that '
    + 'empires execute kings and negotiate with boards.\n\nThe whole coast is watching to see '
    + 'whether it works. So is this court, which has no king either, for a different reason, '
    + 'and has never considered that the arrangement might be a design rather than a wound.',
    'Josephus, citing Menander, records that after Nebuchadnezzar\'s siege Tyre was governed for some years by judges (suffetes) rather than kings.',
    { label: 'Study the arrangement', tooltip: '+35 governance points, +25 influence points, +10 legitimacy and "Government by Council" (−8% cost of governing, +0.2 legitimacy a month, +6% income) permanently; Tyre to +25 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { gov: 35, infl: 25, legitimacy: 10 });
        mod(ctx, 'n597_government_by_council', 'Government by Council', { adminMult: 0.92, legitimacyAdd: 0.2, incomeMult: 1.06 });
        opinion(ctx, 'TYR', me, 25);
        h.chronicle(ctx, 'era', 'The elders of this district read the Tyrian arrangement closely and adopt about half of it without ever admitting where it came from.'); } },
    { label: 'A people without a king waits for one', tooltip: '+30 legitimacy, −15 governance points and "The Throne Kept Empty" (+0.35 legitimacy a month, +8% morale) permanently.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { legitimacy: 30, gov: -15 });
        mod(ctx, 'n597_throne_kept_empty', 'The Throne Kept Empty', { legitimacyAdd: 0.35, moraleMult: 1.08 });
        h.chronicle(ctx, 'era', 'The court answers that a city may appoint magistrates and a people may not appoint a house of David, and the genealogies are recopied for the third time in a generation.'); } }),

  N('ev597n_the_ammonite_grain', 'Ammon Is Rich Again', -543, 3,
    'Ammon, which was deported and broken twenty years before we were, is prosperous. Its '
    + 'plateau grows barley for an empire that needs it, its towns are rebuilt on the imperial '
    + 'plan, and the family running it for Babylon is doing extremely well out of the '
    + 'arrangement.\n\nThey have offered a partnership: our wine and oil, their grain and '
    + 'their access, one account. It would be the making of this district\'s finances. It '
    + 'would also make the leading family of Ammon the largest creditor in this country, which '
    + 'is a position their descendants may still hold in a hundred years.',
    'The Ammonite plateau recovers quickly under Babylonian and Persian administration; the Tobiad family, entrenched there by the Persian period, appears in Nehemiah and remains powerful into the Hellenistic age.',
    { label: 'Take the partnership', tooltip: '+200 talents and "The Ammonite Account" (+11% income, +8% trade, +0.4 unrest everywhere) permanently; Ammon to +40 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 200, gov: 20 });
        mod(ctx, 'n597_ammonite_account', 'The Ammonite Account', { incomeMult: 1.11, tradeMult: 1.08, unrestAll: 0.4 });
        opinion(ctx, 'AMO', me, 40);
        h.chronicle(ctx, 'era', 'One account is opened across the Jordan and the district is solvent within four years. A century later the same family has a chamber in the Temple courts and nobody can remember voting for that.'); } },
    { label: 'Trade with them and keep the books separate', tooltip: '+110 talents, +30 governance points and "Separate Books" (+7% income, +6% trade, +0.2 legitimacy a month) permanently; Ammon to +15 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 110, gov: 30, legitimacy: 10 });
        mod(ctx, 'n597_separate_books', 'Separate Books', { incomeMult: 1.07, tradeMult: 1.06, legitimacyAdd: 0.2 });
        opinion(ctx, 'AMO', me, 15);
        h.chronicle(ctx, 'era', 'The trade goes on and the accounts stay apart, which costs the district about a third of what the partnership would have paid and saves it an argument that lasts three centuries.'); } }),

  N('ev597n_the_people_of_the_land', 'The People Who Stayed', -535, 7,
    'The returning families have arrived with a register, a royal decree and a list of what '
    + 'their grandfathers owned. The families who were never deported have been farming that '
    + 'ground for fifty years, paid tax on it to three successive administrations, and have '
    + 'registers of their own.\n\nBoth sides are the same people by descent and neither will '
    + 'concede the point. The neighbouring districts — north, east and south — are watching '
    + 'with close attention, because every acre in dispute here is an acre whose owner might '
    + 'want a powerful friend.',
    'Ezra 2 and 4 and Haggai 2 show the tension between the returning golah and the "people of the land"; Ezekiel 33:24 records those who stayed claiming the land by right of possession.',
    { label: 'Rule for possession', tooltip: '+40 governance points and "Possession Is the Register" (+9% income, +7% growth, −0.5 unrest everywhere) permanently, at −15 legitimacy.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { gov: 40, legitimacy: -15 });
        mod(ctx, 'n597_possession_is_the_register', 'Possession Is the Register', { incomeMult: 1.09, growthMult: 1.07, unrestAll: -0.5 });
        h.chronicle(ctx, 'era', 'The ground goes to whoever has been paying tax on it, which is the only rule an administration can actually enforce and the one the returning families never accept.'); } },
    { label: 'Rule for the old title', tooltip: '+30 legitimacy, −20 governance points and "The Old Title" (+0.3 legitimacy a month, +8% manpower, +0.8 unrest everywhere) permanently.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { legitimacy: 30, gov: -20 });
        mod(ctx, 'n597_the_old_title', 'The Old Title', { legitimacyAdd: 0.3, manpowerMult: 1.08, unrestAll: 0.8 });
        h.chronicle(ctx, 'era', 'The old deeds are honoured and fifty years of occupation are set aside. The returning families have their fields and the district has a quarrel it will still be having in Nehemiah\'s day.'); } }),

  N('ev597n_the_ring_of_neighbours', 'Everybody Has an Opinion About a Wall', -531, 4,
    'The proposal to repair the city wall has produced letters from every direction at once. '
    + 'The northern province says a walled town in its jurisdiction is a fortress it did not '
    + 'authorise. The Ammonites say the same in warmer language. Ashdod on the coast says a '
    + 'walled town takes custom off the coast road. The Arabs of the south, who have no '
    + 'jurisdiction anywhere, have written anyway.\n\nNone of them can stop it. All four of '
    + 'them can complain to the satrap about it at the same time, which is a different and '
    + 'more effective thing.',
    'Nehemiah 4:7 lists Sanballat, Tobiah, the Arabians, the Ammonites and the Ashdodites as jointly opposing the repair of Jerusalem\'s wall; Ezra 4 records the same tactic of appeal to the imperial court.',
    { label: 'Build it and answer the satrap in writing', tooltip: '−170 talents, +25 legitimacy, +20 martial points and "The Wall and the File" (+2 fort defence, +0.25 legitimacy a month) permanently; the four neighbours to −25 regard each.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -170, legitimacy: 25, mar: 20 });
        mod(ctx, 'n597_wall_and_file', 'The Wall and the File', { fortDefBonus: 2, legitimacyAdd: 0.25 });
        opinion(ctx, 'AMO', me, -25); opinion(ctx, 'QDR', me, -25); opinion(ctx, 'EDM', me, -25);
        h.chronicle(ctx, 'era', 'The wall goes up and a file of correspondence goes east, and for once the district wins on paper as well as on the ground.'); } },
    { label: 'Drop the wall and keep four neighbours friendly', tooltip: '+140 talents, −12 legitimacy and "Four Quiet Borders" (+10% trade, +8% income, −0.6 unrest everywhere) for forty years; the neighbours to +25 regard each.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 140, infl: 25, legitimacy: -12 });
        mod(ctx, 'n597_four_quiet_borders', 'Four Quiet Borders', { tradeMult: 1.1, incomeMult: 1.08, unrestAll: -0.6 }, 480);
        opinion(ctx, 'AMO', me, 25); opinion(ctx, 'QDR', me, 25); opinion(ctx, 'EDM', me, 25);
        h.chronicle(ctx, 'era', 'The stone is used for houses instead. The district is richer, better liked and completely open, which nobody minds until the century somebody does.'); } }),

  N('ev597n_the_phoenician_fleet', 'The Fleet Goes South', -526, 3,
    'The empire is invading Egypt and the fleet that will do it is Phoenician — Tyrian, '
    + 'Sidonian and Cypriot squadrons, sailing under a Persian admiral to attack the one '
    + 'country on this sea that the Phoenicians have never willingly fought.\n\nThe levy has '
    + 'reached inland as well: grain, water-skins, and drivers for the camel train that will '
    + 'carry water across the Sinai. The Arabs of the desert have been asked for that train '
    + 'directly by the king, and have agreed, which is the first time anybody has asked them '
    + 'for anything instead of taking it.',
    'Herodotus III.4-9 describes Cambyses\' invasion of Egypt in 525, the Phoenician fleet, and the Arabian king who supplied water across the desert by treaty rather than submission.',
    { label: 'Supply the crossing', tooltip: '+170 talents, +25 influence points and "The Sinai Contract" (+9% income, +7% trade) for forty years; Persia to +30 regard and Qedar to +20.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 170, infl: 25 });
        mod(ctx, 'n597_sinai_contract', 'The Sinai Contract', { incomeMult: 1.09, tradeMult: 1.07 }, 480);
        opinion(ctx, 'PAS', me, 30); opinion(ctx, 'QDR', me, 20);
        h.chronicle(ctx, 'era', 'Grain and water go south with the army and are paid for in royal silver at a rate fixed in advance, which is a novelty worth more than the money.'); } },
    { label: 'Supply nothing and warn the colonies in Egypt', tooltip: '+25 legitimacy, −50 talents and "Word Sent Ahead" (+0.25 legitimacy a month, +8% morale, −6% income) for thirty years; Egypt to +30 regard, Persia to −30.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { legitimacy: 25, treasury: -50 });
        mod(ctx, 'n597_word_sent_ahead', 'Word Sent Ahead', { legitimacyAdd: 0.25, moraleMult: 1.08, incomeMult: 0.94 }, 360);
        opinion(ctx, 'MIZ', me, 30); opinion(ctx, 'PAS', me, -30);
        h.chronicle(ctx, 'era', 'A letter goes down the desert road ahead of the army to the river colonies, arrives in time, and helps nobody at all.'); } }),

  N('ev597n_every_province_rises', 'The Year of the Nineteen Battles', -522, 7,
    'The king died in the field, a man claiming to be his dead brother took the throne, '
    + 'somebody killed that man, and now every province from the Indus to the Aegean has a '
    + 'pretender in it. Babylon has risen twice with two different kings, both calling '
    + 'themselves Nebuchadnezzar.\n\nThe new king is fighting nineteen battles in one year and '
    + 'is winning them. Every small district in the empire has had to decide, without '
    + 'information, which of several men is going to be alive in eighteen months, and the ones '
    + 'who chose wrong are being visited.',
    'The Behistun inscription records Darius I fighting nineteen battles and capturing nine kings in one year, including two Babylonian pretenders who both took the name Nebuchadnezzar.',
    { label: 'Sit still and pay whoever collects', tooltip: '+45 governance points, +15 influence points and "We Paid the Collector" (+9% income, −0.7 unrest everywhere) for forty years; Persia to +25 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { gov: 45, infl: 15 });
        mod(ctx, 'n597_paid_the_collector', 'We Paid the Collector', { incomeMult: 1.09, unrestAll: -0.7 }, 480);
        opinion(ctx, 'PAS', me, 25);
        h.chronicle(ctx, 'era', 'The assessment is paid to whichever official presents himself, receipts are kept for all of them, and when the dust settles the district is the only one in the satrapy with a complete file.'); } },
    { label: 'Read it as the sign and raise the house', tooltip: '+35 legitimacy, +20 martial points and "The Signet Ring" (+0.35 legitimacy a month, +9% morale, +1.0 unrest everywhere) for twenty-five years, at Persia\'s regard −35.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { legitimacy: 35, mar: 20 });
        mod(ctx, 'n597_signet_ring', 'The Signet Ring', { legitimacyAdd: 0.35, moraleMult: 1.09, unrestAll: 1 }, 300);
        opinion(ctx, 'PAS', me, -35);
        h.chronicle(ctx, 'era', 'The governor of the house of David is proclaimed in language that everybody present understands and nobody writes down. He is not mentioned again in any record of any kind.'); } }),

  N('ev597n_the_coast_under_sidon', 'The Coast Belongs to Sidon Now', -514, 5,
    'The empire has settled the coast by giving it away. The plain from Dor to Joppa is '
    + 'assigned to Sidon and Tyre as a royal grant, in return for the ships and the crews that '
    + 'make the imperial fleet, and the Phoenician kings now govern the ports our produce has '
    + 'to pass through.\n\nIt is not an occupation. It is a customs arrangement with a fleet '
    + 'behind it, and it means that the price of getting a jar of oil onto a ship is set in a '
    + 'city we have no standing in at all.',
    'The Eshmunazar II sarcophagus records the Persian king granting Dor and Joppa and the corn lands of Sharon to Sidon; Phoenician control of the Palestinian coast is standard in the Persian period.',
    { label: 'Buy a standing at Sidon', tooltip: '−150 talents, +20 influence points and "A Seat on the Waterfront" (+11% trade, +6% income) permanently; Tyre to +30 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -150, infl: 20 });
        mod(ctx, 'n597_seat_on_the_waterfront', 'A Seat on the Waterfront', { tradeMult: 1.11, incomeMult: 1.06 });
        opinion(ctx, 'TYR', me, 30);
        h.chronicle(ctx, 'era', 'A house on the Sidonian waterfront is bought outright in the name of the district, and the men who sit in it spend two generations becoming indispensable.'); } },
    { label: 'Petition the satrap for a port of our own', tooltip: '−90 talents, +30 influence points and "The Petition for a Port" (+0.2 legitimacy a month, +7% trade) for thirty years, at Tyre\'s regard −30.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -90, infl: 30 });
        mod(ctx, 'n597_petition_for_a_port', 'The Petition for a Port', { legitimacyAdd: 0.2, tradeMult: 1.07 }, 360);
        opinion(ctx, 'TYR', me, -30);
        h.chronicle(ctx, 'era', 'The petition is drafted, sent, acknowledged and not granted, which is what happens to a district asking a satrap to take a port off the people who crew his navy.'); } }),

  N('ev597n_the_arabs_are_not_taxed', 'The Only People Who Are Not Taxed', -511, 8,
    'The satrapal assessment has been published for the whole empire, province by province, '
    + 'in talents, and there is exactly one people on the list who do not appear on it. The '
    + 'Arabs of the desert send a thousand talents of frankincense every year as a gift. Not '
    + 'tribute — a gift, from a people the empire treats as friends rather than '
    + 'subjects.\n\nThe reason is not sentiment. It is that they held the water on the road to '
    + 'Egypt when the empire needed it, by agreement, and were never conquered. Every '
    + 'administrator between here and Susa knows this and none of them can do anything about '
    + 'it.',
    'Herodotus III.88-97 states that the Arabians were never reduced to subjection by the Persians and gave a yearly gift of a thousand talents of frankincense rather than paying tribute.',
    { label: 'Study how they did it', tooltip: '+40 influence points, +12 legitimacy and "What the Arabs Understood" (+0.25 legitimacy a month, +8% trade, −0.4 unrest everywhere) permanently; Qedar to +35 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { infl: 40, legitimacy: 12 });
        mod(ctx, 'n597_what_the_arabs_understood', 'What the Arabs Understood', { legitimacyAdd: 0.25, tradeMult: 1.08, unrestAll: -0.4 });
        opinion(ctx, 'QDR', me, 35);
        h.chronicle(ctx, 'era', 'The lesson is written out in the chancery in one line: be indispensable to the empire at the one place where it is weak, and the assessment will never find you.'); } },
    { label: 'Ask the satrap for the same terms', tooltip: '−70 talents, +15 legitimacy and "The Request Refused" (+7% income, +0.2 legitimacy a month, +0.5 unrest everywhere) for twenty-five years, at Persia\'s regard −20.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -70, legitimacy: 15 });
        mod(ctx, 'n597_request_refused', 'The Request Refused', { incomeMult: 1.07, legitimacyAdd: 0.2, unrestAll: 0.5 }, 300);
        opinion(ctx, 'PAS', me, -20);
        h.chronicle(ctx, 'era', 'The request is put with great courtesy and refused with more. A district with a fixed address and good roads cannot be treated as a people who might simply not be there next year.'); } }),

  N('ev597n_the_weights_of_the_satrapy', 'One Weight From Sardis to Susa', -507, 4,
    'The empire has issued its own coin and its own weight standard, and the satrapal '
    + 'treasuries will now take payment in nothing else. The gold piece has an archer on it '
    + 'and is good from the Aegean to the Indus; the silver is minted at half a dozen '
    + 'places; and the old business of weighing out cut metal in front of a suspicious '
    + 'counterparty is, within a generation, going to be over.\n\nThe district may strike '
    + 'small silver of its own under licence, to the royal standard, with its own name on it. '
    + 'It is a small privilege and it is the first time in seventy years that this place has '
    + 'been offered anything with its own name on it at all.',
    'The Persian daric and siglos standardise imperial coinage from Darius I; small silver coins inscribed YHD (Yehud) are struck in the province in the later Persian period.',
    { label: 'Strike the small silver', tooltip: '−110 talents, +25 legitimacy, +20 governance points and "A Coin With Our Name On It" (+0.3 legitimacy a month, +9% trade, −6% cost of governing) permanently.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -110, legitimacy: 25, gov: 20 });
        mod(ctx, 'n597_a_coin_with_our_name', 'A Coin With Our Name On It', { legitimacyAdd: 0.3, tradeMult: 1.09, adminMult: 0.94 });
        h.chronicle(ctx, 'era', 'Small silver is struck to the royal weight with three letters on it. It buys a day\'s bread and it is the only sovereign object this district owns.'); } },
    { label: 'Use the royal coin and save the mint', tooltip: '+130 talents and "The Royal Coin" (+10% trade, +7% income, −8% cost of governing) permanently; Persia to +20 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 130, gov: 30 });
        mod(ctx, 'n597_royal_coin', 'The Royal Coin', { tradeMult: 1.1, incomeMult: 1.07, adminMult: 0.92 });
        opinion(ctx, 'PAS', me, 20);
        h.chronicle(ctx, 'era', 'The archer coin circulates here as it does everywhere else. Nothing is minted, nothing is spent on minting, and nothing in the market has this district\'s name on it.'); } }),

  N('ev597n_it_is_called_idumaea_now', 'They Call It Idumaea Now', -502, 6,
    'The imperial files have caught up with the facts. The southern hill country — Hebron, '
    + 'the Negev approaches, everything below the line where the returning families actually '
    + 'settled — is entered under a new name derived from the people living in it, with its '
    + 'own governor and its own assessment.\n\nIt is the country\'s own south. It has been '
    + 'occupied for eighty years by people who came in after the deportation, and it has now '
    + 'been given a name and a file number, which in an empire is what existence means.',
    'Idumaea emerges as an administrative unit in the Persian period covering the southern Judaean hills settled by Edomites after 586; the Idumaean ostraca from Makkedah date from the fourth century.',
    { label: 'Trade across the new line', tooltip: '+140 talents, +20 governance points and "The Line Crossed Daily" (+10% trade, +7% income, −0.4 unrest everywhere) permanently; Edom to +30 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 140, gov: 20 });
        mod(ctx, 'n597_line_crossed_daily', 'The Line Crossed Daily', { tradeMult: 1.1, incomeMult: 1.07, unrestAll: -0.4 });
        opinion(ctx, 'EDM', me, 30);
        h.chronicle(ctx, 'era', 'The new frontier has a name, a governor and a market on both sides of it, and within a decade more goods cross it every week than crossed the old one in a year.'); } },
    { label: 'Record it as a loss and keep the old maps', tooltip: '+30 legitimacy, +15 martial points and "The Old Map" (+0.3 legitimacy a month, +8% manpower, −5% trade) permanently, at Edom\'s regard −35.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { legitimacy: 30, mar: 15 });
        mod(ctx, 'n597_the_old_map', 'The Old Map', { legitimacyAdd: 0.3, manpowerMult: 1.08, tradeMult: 0.95 });
        opinion(ctx, 'EDM', me, -35);
        h.chronicle(ctx, 'era', 'The tribal boundaries of Judah and Simeon are copied into the scrolls exactly as they were, with Hebron in them, for the use of somebody four hundred years away.'); } }),

  N('ev597n_the_coast_sends_ships', 'The Coast Sends Ships and We Send Barley', -497, 3,
    'The Greek cities of the Anatolian coast have risen, burned a satrapal capital, and the '
    + 'empire is putting down the revolt with a fleet — which means the Phoenician cities are '
    + 'at sea for years, the coast ports are stripped of crews, and the grain that normally '
    + 'goes out through them is sitting on the quays.\n\nThe army marching north needs '
    + 'feeding all the way up the coast road. That is a contract, it is large, and it is '
    + 'payable in royal silver by an administration that has never once failed to pay.',
    'The Ionian Revolt (499-494) drew the Phoenician fleet into years of campaigning; the Persian military road up the Levantine coast was supplied by the provinces it passed through.',
    { label: 'Take the supply contract', tooltip: '+190 talents, +20 governance points and "The Army Fed" (+10% income, +6% production) for forty years; Persia to +30 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 190, gov: 20 });
        mod(ctx, 'n597_the_army_fed', 'The Army Fed', { incomeMult: 1.1, prodMult: 1.06 }, 480);
        opinion(ctx, 'PAS', me, 30);
        h.chronicle(ctx, 'era', 'Barley goes north by the cartload for four years and is paid for in archers on time, which does more for this district than any decree.'); } },
    { label: 'Sell into the ports the crews have left', tooltip: '+150 talents and "The Empty Quays" (+12% trade, +0.4 unrest everywhere) for thirty years; Tyre to +20 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 150, infl: 15 });
        mod(ctx, 'n597_empty_quays', 'The Empty Quays', { tradeMult: 1.12, unrestAll: 0.4 }, 360);
        opinion(ctx, 'TYR', me, 20);
        h.chronicle(ctx, 'era', 'With the Phoenician captains at war, our factors buy quay space at prices they will never see again and ship on whatever hull is left in the harbour.'); } }),

  N('ev597n_nobody_asks_us_for_ships', 'Nobody Asks Us for Ships', -492, 8,
    'The fleet that is going west this year is listed by contingent: Phoenicians, Egyptians, '
    + 'Cypriots, Cilicians, Ionians, Carians, and the islands. Three hundred ships from the '
    + 'coast alone, crewed and commanded by kings whose names are on the muster.\n\nThis '
    + 'district is not on it. It has no ships, no coast and no contingent, and the entire '
    + 'imperial war effort will pass up and down the road outside for twelve years without '
    + 'once requiring anything from here but barley. There are two ways to read that and the '
    + 'council is split down the middle.',
    'Herodotus VII.89-95 lists the naval contingents of Xerxes\' expedition by nation; the inland provinces of the Levant appear only as sources of supply.',
    { label: 'Be glad: barley is cheaper than sons', tooltip: '+45 governance points, +80 talents and "No Muster, No Widows" (+9% income, +7% growth, −0.6 unrest everywhere) permanently.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { gov: 45, treasury: 80 });
        mod(ctx, 'n597_no_muster_no_widows', 'No Muster, No Widows', { incomeMult: 1.09, growthMult: 1.07, unrestAll: -0.6 });
        h.chronicle(ctx, 'era', 'Three hundred ships go west with other people\'s sons aboard, and this district sells them bread and counts itself fortunate, correctly.'); } },
    { label: 'A people with no contingent has no voice', tooltip: '−120 talents, +25 legitimacy, +30 martial points and "A Contingent of Our Own" (+9% army strength, +7% manpower, +0.2 legitimacy a month) permanently; Persia to +20 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -120, legitimacy: 25, mar: 30 });
        mod(ctx, 'n597_a_contingent_of_our_own', 'A Contingent of Our Own', { milPowerMult: 1.09, manpowerMult: 1.07, legitimacyAdd: 0.2 });
        opinion(ctx, 'PAS', me, 20);
        h.chronicle(ctx, 'era', 'A levy is raised, equipped and offered to the satrap, on the argument that a people who are only ever a granary are never at the table when the terms are read.'); } }),

  N('ev597n_the_satrap_at_damascus', 'The Satrap Comes Down the Road', -468, 5,
    'The satrap of Beyond-the-River is making a progress through his province — Damascus, the '
    + 'coast, the plateau, and this district — with a household, a chancery and the power to '
    + 'reassess anything he sees. He will be here for four days.\n\nThe neighbouring '
    + 'governors have spent two months preparing. Samaria has repaired a road. Ammon has '
    + 'produced a banquet. Ashdod has sent a deputation ahead. What this district has is a '
    + 'temple, an archive, and a very long memory, and the question is which of those to put '
    + 'in front of him.',
    'The satrapy of Abar-Nahara (Beyond the River) governed the Levant from Damascus; Ezra 5-6 and Nehemiah 2-3 show provincial business turning on satrapal and royal decisions.',
    { label: 'Show him the archive', tooltip: '+40 influence points, +20 legitimacy and "The File Produced" (+0.25 legitimacy a month, −8% cost of governing, +6% income) permanently; Persia to +30 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { infl: 40, legitimacy: 20, gov: 25 });
        mod(ctx, 'n597_the_file_produced', 'The File Produced', { legitimacyAdd: 0.25, adminMult: 0.92, incomeMult: 1.06 });
        opinion(ctx, 'PAS', me, 30);
        h.chronicle(ctx, 'era', 'The satrap is shown seventy years of receipts, decrees and assessments in order, correctly filed, and leaves with the settled opinion that this is the best-run district in the province.'); } },
    { label: 'Give him the banquet the others gave', tooltip: '−160 talents and "The Banquet" (+9% income, +7% trade, −0.4 unrest everywhere) for thirty years; Persia to +25 regard and Ammon to +15.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -160, infl: 25 });
        mod(ctx, 'n597_the_banquet', 'The Banquet', { incomeMult: 1.09, tradeMult: 1.07, unrestAll: -0.4 }, 360);
        opinion(ctx, 'PAS', me, 25); opinion(ctx, 'AMO', me, 15);
        h.chronicle(ctx, 'era', 'Four days of hospitality are paid for out of a treasury that cannot afford it, and the satrap leaves with the settled opinion that this district is richer than it says it is.'); } }),

  N('ev597n_the_southern_road', 'Who Holds the Southern Road', -464, 9,
    'The incense trade has reorganised itself. The Arab confederation that the empire treats '
    + 'as a friend rather than a subject now runs the whole route from the south, and its '
    + 'chief has begun styling himself king — of Qedar, in an inscription, on a silver bowl '
    + 'dedicated at a shrine in the Delta.\n\nHe is not a sheikh with camels. He is a '
    + 'recognised power with a title, a treasury and the empire\'s goodwill, sitting across '
    + 'the southern approaches of this district, and he is going to be a neighbour for as long '
    + 'as anybody here can plan for.',
    'The Tell el-Maskhuta silver bowls name Qainu son of Geshem, king of Qedar; Geshem the Arabian opposes Nehemiah a few decades later as an established regional power.',
    { label: 'Treat with him as a king', tooltip: '+35 influence points, +70 talents and "Terms With Qedar" (+11% trade, +6% income, −0.4 unrest everywhere) permanently; Qedar to +40 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { infl: 35, treasury: 70 });
        mod(ctx, 'n597_terms_with_qedar', 'Terms With Qedar', { tradeMult: 1.11, incomeMult: 1.06, unrestAll: -0.4 });
        opinion(ctx, 'QDR', me, 40);
        h.chronicle(ctx, 'era', 'The district treats with the king of Qedar on equal terms, which costs nothing, offends the satrapal chancery slightly, and keeps the southern road open for sixty years.'); } },
    { label: 'Report the title to the satrap', tooltip: '+30 influence points, +15 martial points and "The Title Questioned" (+8% income, +1 fort defence, +0.5 unrest everywhere) for thirty years; Persia to +20 regard, Qedar to −45.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { infl: 30, mar: 15 });
        mod(ctx, 'n597_title_questioned', 'The Title Questioned', { incomeMult: 1.08, fortDefBonus: 1, unrestAll: 0.5 }, 360);
        opinion(ctx, 'PAS', me, 20); opinion(ctx, 'QDR', me, -45);
        h.chronicle(ctx, 'era', 'A note goes east observing that a man the empire calls a friend is calling himself a king. It is filed, no action follows, and the desert hears about it within a season.'); } }),

  N('ev597n_sanballat_and_tobiah', 'The Two Men Who Will Not Go Away', -455, 4,
    'The governor of the northern province and the Ammonite official who runs the eastern '
    + 'plateau have between them married into half the leading families of this district. '
    + 'Their sons-in-law sit on the council. Their letters arrive daily. One of them has been '
    + 'given a storeroom inside the temple precinct by a relative on the staff.\n\nThey are '
    + 'not enemies at the gate. They are cousins at the table, which is a harder problem, and '
    + 'the only two ways out of it are to make them family in form as well as in fact, or to '
    + 'throw the furniture out of the storeroom in public.',
    'Nehemiah 6:17-18 and 13:4-9: Tobiah the Ammonite was allied by marriage to the nobles of Judah and given a chamber in the courts of the house of God, which Nehemiah emptied into the street.',
    { label: 'Empty the storeroom', tooltip: '+35 legitimacy, −60 talents and "The Furniture in the Street" (+0.35 legitimacy a month, +8% morale, +0.8 unrest everywhere, −6% income) permanently; Ammon to −45 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { legitimacy: 35, treasury: -60 });
        mod(ctx, 'n597_furniture_in_the_street', 'The Furniture in the Street', { legitimacyAdd: 0.35, moraleMult: 1.08, unrestAll: 0.8, incomeMult: 0.94 });
        opinion(ctx, 'AMO', me, -45);
        h.chronicle(ctx, 'era', 'The household stuff is carried out of the precinct and thrown into the street, the chambers are cleansed, and half the council stops speaking to the governor for a decade.'); } },
    { label: 'Make the connection formal', tooltip: '+180 talents, +25 influence points and "The Families Joined" (+10% income, +8% trade, −0.5 unrest everywhere, −0.2 legitimacy a month) permanently; Ammon to +40 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 180, infl: 25, legitimacy: -18 });
        mod(ctx, 'n597_families_joined', 'The Families Joined', { incomeMult: 1.1, tradeMult: 1.08, unrestAll: -0.5, legitimacyAdd: -0.2 });
        opinion(ctx, 'AMO', me, 40);
        h.chronicle(ctx, 'era', 'The marriages are recognised, the accounts are merged, and the district becomes prosperous, well connected and very difficult to distinguish from its neighbours.'); } }),

  N('ev597n_the_speech_of_ashdod', 'Half of Them Could Not Speak It', -452, 7,
    'The inspection of the villages has produced a finding nobody wanted in writing. In the '
    + 'settlements toward the coast, half the children of the district cannot speak the '
    + 'language of their fathers. They speak the speech of Ashdod, or Ammonite, or Arabic, '
    + 'according to their mothers, and they are perfectly ordinary children of perfectly '
    + 'ordinary households.\n\nA language goes in one generation and does not come back. The '
    + 'question in front of the council is whether that is a catastrophe requiring an '
    + 'intervention, or simply what a small country on four trade roads looks like.',
    'Nehemiah 13:23-24: the children of those married to women of Ashdod, Ammon and Moab spoke half in the speech of Ashdod and could not speak the Jews\' language.',
    { label: 'Put schools in every village', tooltip: '−140 talents, +25 legitimacy, −15 governance points and "The Village Schools" (+0.3 legitimacy a month, +8% manpower, −6% income) permanently.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -140, legitimacy: 25, gov: -15 });
        mod(ctx, 'n597_village_schools', 'The Village Schools', { legitimacyAdd: 0.3, manpowerMult: 1.08, incomeMult: 0.94 });
        h.chronicle(ctx, 'era', 'A man who can read is placed in every village of the district at the community\'s expense, and within two generations the language is in no danger anywhere.'); } },
    { label: 'Leave it — four roads, four languages', tooltip: '+130 talents, +25 governance points, −15 legitimacy and "The Country of Four Roads" (+11% trade, +8% income, −0.2 legitimacy a month) permanently; Ammon, Edom and Philistia to +20 regard each.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 130, gov: 25, legitimacy: -15 });
        mod(ctx, 'n597_country_of_four_roads', 'The Country of Four Roads', { tradeMult: 1.11, incomeMult: 1.08, legitimacyAdd: -0.2 });
        opinion(ctx, 'AMO', me, 20); opinion(ctx, 'EDM', me, 20); opinion(ctx, 'QDR', me, 20);
        h.chronicle(ctx, 'era', 'Nothing is done. The district trades in four languages, prospers, and produces a generation that has to be taught its own scriptures in translation.'); } }),

  N('ev597n_the_satrap_revolts', 'Our Own Satrap Has Revolted', -448, 5,
    'The satrap of Beyond-the-River — the man who governs everything from the Euphrates to '
    + 'the Egyptian frontier, including this district, and who was the king\'s own general '
    + 'in Egypt four years ago — has raised the whole satrapy against the king. He has '
    + 'beaten two royal armies with the provincial levies of this coast.\n\nEvery district '
    + 'in the satrapy has been asked for men. Refusing the satrap is dangerous this year. '
    + 'Obeying him is dangerous every year afterwards, because he is negotiating a pardon '
    + 'and a pardon does not extend to the people who helped him.',
    'Ctesias records the revolt of Megabyzus, satrap of Abar-Nahara, against Artaxerxes I around 449-448; he defeated two royal armies before being reconciled to the king.',
    { label: 'Send nothing and wait for the pardon', tooltip: '+45 governance points, +15 martial points and "We Sent Nobody" (+9% income, +1 fort defence, −0.5 unrest everywhere) for thirty years; Persia to +30 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { gov: 45, mar: 15 });
        mod(ctx, 'n597_we_sent_nobody', 'We Sent Nobody', { incomeMult: 1.09, fortDefBonus: 1, unrestAll: -0.5 }, 360);
        opinion(ctx, 'PAS', me, 30);
        h.chronicle(ctx, 'era', 'The district produces a great many reasons and no men. When the satrap is pardoned a year later he remembers, and so does the king, and the two memories cancel out.'); } },
    { label: 'Send the levy to the satrap', tooltip: '−1,500 manpower, +150 talents, +20 influence points and "In the Satrap\'s Debt" (+10% trade, +7% income, +0.7 unrest everywhere) for twenty-five years; Persia to −25 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { manpower: -1500, treasury: 150, infl: 20 });
        mod(ctx, 'n597_in_the_satraps_debt', 'In the Satrap\'s Debt', { tradeMult: 1.1, incomeMult: 1.07, unrestAll: 0.7 }, 300);
        opinion(ctx, 'PAS', me, -25);
        h.chronicle(ctx, 'era', 'The levy marches with the satrap and comes home with his favour, which is worth a great deal for exactly as long as he is alive.'); } }),
];
