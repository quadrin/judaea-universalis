// Judaea Universalis — the other side of the line: 729–608 BCE (SPEC §281).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// This chapter's spine is the empire and the house: the tribute schedule, the
// altar at Damascus, the siege of Samaria, the Rabshakeh at the conduit, the
// book found in the house. Between those there are eighty years in which
// nothing in the chapter happens at all — the reign that lasted fifty-five
// years — and the reason is that the chapter had no card for the scale a
// courier could ride: the governor at Megiddo, the oil presses at Ekron, the
// karum the empire opened at the Brook of Egypt, the ships Tyre was made to
// lend, the Arab gods carried home in a cart as a receipt, the Greeks in the
// fort on the coast road, and the year Egypt came north to prop up Assyria
// because the alternative was worse.
//
// The whole point of the period is that a small kingdom between empires has
// almost no room and an enormous number of decisions. The room is the
// neighbours.
//
// Sources: 2 Kings 17-23 and 2 Chronicles 32-35; the annals and Display
// Inscription of Sargon II for Ashdod and the Brook of Egypt; the Rassam and
// Taylor prisms of Sennacherib; the Esarhaddon vassal treaties and the
// Zinjirli stele for Sidon and for the Arab deities; the annals of
// Ashurbanipal for Gyges, the Qedarite campaigns and the Egyptian revolt;
// Herodotus I.105 and II.157 for the Scythians and the siege of Azotus; the
// Mezad Hashavyahu ostracon; the Babylonian Chronicle for 616-605.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_732bce_neighbours] ' + key, e || '');
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

export const EVENTS_732_NEIGHBOURS = [

  N('ev732n_the_governor_at_megiddo', 'The Governor at Megiddo', -729, 5,
    'There is now an Assyrian governor a day and a half from here, in a rebuilt town with a '
    + 'grid of streets, a residency in the imperial plan and a garrison that is paid in '
    + 'silver rather than in land. He has jurisdiction, a court, a tariff schedule and a '
    + 'standing instruction to report on his neighbours.\n\nHe has also sent, correctly and '
    + 'without any threat at all, an invitation to establish regular correspondence. What '
    + 'goes into those letters is the first real foreign-policy decision this court has had '
    + 'to make since the schedule was signed.',
    'Megiddo became the seat of the Assyrian province of Magiddu after 732; the stratum IV administrative buildings follow the standard imperial plan.',
    { label: 'Correspond, and be useful', tooltip: '+35 influence points, +15 governance points and "The Megiddo Correspondence" (+8% income, −0.5 unrest everywhere, −5% morale) for forty years; Assyria to +30 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { infl: 35, gov: 15 });
        mod(ctx, 'n732_megiddo_correspondence', 'The Megiddo Correspondence', { incomeMult: 1.08, unrestAll: -0.5, moraleMult: 0.95 }, 480);
        opinion(ctx, 'ASR', me, 30);
        h.chronicle(ctx, 'era', 'A courier goes north every month with a letter that is accurate, dull and entirely truthful about everybody except us.'); } },
    { label: 'Answer courteously and tell him nothing', tooltip: '+30 martial points, +10 legitimacy and "Nothing to Report" (+8% manpower, +1 fort defence, −5% income) for thirty years, at Assyria\'s regard −20.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { mar: 30, legitimacy: 10 });
        mod(ctx, 'n732_nothing_to_report', 'Nothing to Report', { manpowerMult: 1.08, fortDefBonus: 1, incomeMult: 0.95 }, 360);
        opinion(ctx, 'ASR', me, -20);
        h.chronicle(ctx, 'era', 'The letters go north on time and say nothing. The governor at Megiddo begins, slowly, to find other sources.'); } }),

  N('ev732n_tyre_besieged_again', 'Five Years on the Water', -727, 8,
    'Tyre has refused the tribute and the empire has done the only thing it can do to a '
    + 'city on an island: taken the mainland, taken the springs, and sat down to wait. The '
    + 'Tyrians are drinking rainwater from cisterns and shipping grain in past a fleet '
    + 'crewed by Sidonians who would rather be somewhere else.\n\nWhile it lasts, the coast '
    + 'has no functioning port and everything this country sells abroad has to go overland '
    + 'or not at all. There is money to be made and a side to be seen taking.',
    'Shalmaneser V besieged Tyre for five years after 727 (Josephus, citing Menander); the city held out on cistern water and was never stormed.',
    { label: 'Run grain to the island', tooltip: '+210 talents, +15 influence points and "The Blockade Runners" (+10% trade) for twenty-five years; Tyre to +40 regard and Assyria to −30.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 210, infl: 15 });
        mod(ctx, 'n732_blockade_runners', 'The Blockade Runners', { tradeMult: 1.1 }, 300);
        opinion(ctx, 'TYR', me, 40); opinion(ctx, 'ASR', me, -30);
        h.chronicle(ctx, 'era', 'Small boats go out of the creeks at night with grain and come back with Tyrian silver. Everybody knows and nobody has written it down.'); } },
    { label: 'Sell to the siege lines instead', tooltip: '+160 talents, +25 influence points and "The Siege Contract" (+7% income, +5% production) for twenty-five years; Assyria to +25 regard, Tyre to −35.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 160, infl: 25 });
        mod(ctx, 'n732_siege_contract', 'The Siege Contract', { incomeMult: 1.07, prodMult: 1.05 }, 300);
        opinion(ctx, 'ASR', me, 25); opinion(ctx, 'TYR', me, -35);
        h.chronicle(ctx, 'era', 'The army on the Tyrian shore is fed from our granaries at a good price, in silver, on time, for five years.'); } }),

  N('ev732n_the_road_and_the_post', 'The Road and the Post', -719, 4,
    'The empire is putting post stations along the coast road at a day\'s ride apart — '
    + 'stables, fodder, a clerk, a sealed logbook — and has offered to run a spur up to the '
    + 'hill country at our expense. A letter would reach Nineveh in under a fortnight.\n\n'
    + 'So would a letter about us. The road is not a favour; it is how the empire finds out '
    + 'things, and a spur into the hills is a spur in both directions.',
    'The Assyrian royal road and its relay stations (the mardītu system) reached the Levantine coast in the late eighth century; provincial correspondence from Palestine survives in the Nineveh archives.',
    { label: 'Pay for the spur', tooltip: '−130 talents and "The Post Road" (+10% trade, −8% cost of governing, +0.4 unrest everywhere) permanently; Assyria to +20 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -130, gov: 30 });
        mod(ctx, 'n732_post_road', 'The Post Road', { tradeMult: 1.1, adminMult: 0.92, unrestAll: 0.4 });
        opinion(ctx, 'ASR', me, 20);
        h.chronicle(ctx, 'era', 'The spur is cut up to the watershed and a clerk with a sealed logbook is installed at the top of it, where he can see the whole ridge road.'); } },
    { label: 'Decline, and keep our own couriers', tooltip: '+25 governance points, +15 martial points and "Our Own Couriers" (+1 fort defence, +6% manpower, −5% trade) permanently.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { gov: 25, mar: 15 });
        mod(ctx, 'n732_our_own_couriers', 'Our Own Couriers', { fortDefBonus: 1, manpowerMult: 1.06, tradeMult: 0.95 });
        h.chronicle(ctx, 'era', 'The offer is declined with thanks. News from this country continues to reach Nineveh at the speed of a merchant rather than a relay.'); } }),

  N('ev732n_the_karum_at_the_brook', 'A Market at the Brook of Egypt', -716, 6,
    'The empire has opened a trading station at the Brook of Egypt — the last water before '
    + 'the desert crossing — and has fixed by decree what may be sold there, to whom, and at '
    + 'what rate. Egyptians may trade; Egyptians may not cross. It is a customs post wearing '
    + 'a market\'s clothes, and it puts the whole southern trade under one seal.\n\nOur '
    + 'merchants are invited. The invitation carries a schedule of duties and a requirement '
    + 'to register.',
    'Sargon II records opening a trading post (kāru) at the Brook of Egypt and "mingling Assyrians and Egyptians" there under imperial regulation.',
    { label: 'Register and trade', tooltip: '+140 talents and "Registered at the Brook" (+9% trade, +5% income, −4% production) for forty years; Assyria to +20 regard and Egypt to +15.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 140, infl: 15 });
        mod(ctx, 'n732_registered_at_the_brook', 'Registered at the Brook', { tradeMult: 1.09, incomeMult: 1.05, prodMult: 0.96 }, 480);
        opinion(ctx, 'ASR', me, 20); opinion(ctx, 'MIZ', me, 15);
        h.chronicle(ctx, 'era', 'Our merchants are entered in the register at the Brook with their marks and their goods, and the southern trade becomes legal, taxable and slightly smaller.'); } },
    { label: 'Keep to the desert routes', tooltip: '+90 talents, +10 influence points and "The Unregistered Roads" (+8% trade, +6% income, +0.6 unrest everywhere) for thirty years, at Assyria\'s regard −25; Qedar to +25.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 90, infl: 10 });
        mod(ctx, 'n732_unregistered_roads', 'The Unregistered Roads', { tradeMult: 1.08, incomeMult: 1.06, unrestAll: 0.6 }, 360);
        opinion(ctx, 'ASR', me, -25); opinion(ctx, 'QDR', me, 25);
        h.chronicle(ctx, 'era', 'The caravans keep to the wells the register does not list, guided by men who have never been in a register in their lives.'); } }),

  N('ev732n_ashdod_asks_us_to_join', 'Ashdod Asks Us to Join', -713, 3,
    'Ashdod has thrown out the king the empire gave it, installed a man of its own, and '
    + 'written to Edom, Moab, Judah and the Delta at the same time proposing a common front. '
    + 'The letter is confident and specific and promises Egyptian troops.\n\nThe envoys have '
    + 'been received. The general has asked the only question that matters — how many '
    + 'Egyptians, and where are they now — and the Ashdodite envoy has answered it in a way '
    + 'that everybody in the room understood to mean none, and not near.',
    'The Ashdod revolt of 713-711 drew in Judah, Edom, Moab and Egypt by invitation; Sargon\'s army took Ashdod and the promised Egyptian help never arrived. Isaiah 20 dates from it.',
    { label: 'Stay out', tooltip: '+40 governance points, +15 influence points and "We Were Not at Ashdod" (+9% income, −0.6 unrest everywhere) for thirty years; Assyria to +25 regard, Philistia to −25.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { gov: 40, infl: 15 });
        mod(ctx, 'n732_not_at_ashdod', 'We Were Not at Ashdod', { incomeMult: 1.09, unrestAll: -0.6 }, 360);
        opinion(ctx, 'ASR', me, 25); opinion(ctx, 'PLS', me, -25);
        h.chronicle(ctx, 'era', 'The envoys go home with a courteous refusal. Two years later the empire takes Ashdod apart, and the list of those who joined is read out at Nineveh without our name on it.'); } },
    { label: 'Promise quietly and commit nothing', tooltip: '+25 martial points, +10 legitimacy and "A Promise in Writing" (+8% morale, +5% manpower, +0.8 unrest everywhere) for twenty years; Philistia to +30 regard, Assyria to −30.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { mar: 25, legitimacy: 10 });
        mod(ctx, 'n732_a_promise_in_writing', 'A Promise in Writing', { moraleMult: 1.08, manpowerMult: 1.05, unrestAll: 0.8 }, 240);
        opinion(ctx, 'PLS', me, 30); opinion(ctx, 'ASR', me, -30);
        h.chronicle(ctx, 'era', 'A sealed promise of support goes to Ashdod and no men follow it. When the city falls the promise is found in the palace, which is exactly where the empire looks.'); } }),

  N('ev732n_the_arabs_are_settled_north', 'They Have Moved the Desert North', -710, 9,
    'The empire has deported Arab tribes out of the desert and settled them in the hill '
    + 'country north of here — in the province that used to be Israel, on land that used to '
    + 'belong to people who are now in Media. They have been given seed, tax relief for '
    + 'three years, and the standing of imperial subjects.\n\nThey are camel people being '
    + 'made into farmers by decree. Some of them will manage it. All of them are now on our '
    + 'northern border, and none of them owes anything to anybody here.',
    'Sargon II records settling deported Arab tribes in Samerina; the policy of cross-imperial resettlement is the standard Assyrian answer to both nomads and rebels.',
    { label: 'Trade with them and learn the desert from them', tooltip: '+35 influence points, +60 talents and "The New Neighbours" (+8% trade, +6% growth, −0.4 unrest everywhere) for forty years; Qedar to +30 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { infl: 35, treasury: 60 });
        mod(ctx, 'n732_the_new_neighbours', 'The New Neighbours', { tradeMult: 1.08, growthMult: 1.06, unrestAll: -0.4 }, 480);
        opinion(ctx, 'QDR', me, 30);
        h.chronicle(ctx, 'era', 'Markets open on the northern border for people who arrived there against their will, and within a decade the wool trade of the hill country runs through them.'); } },
    { label: 'Close the northern border markets', tooltip: '+30 governance points, +15 martial points and "The Border Closed" (+7% production, +1 fort defence, −6% trade) for thirty years, at Qedar\'s regard −25.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { gov: 30, mar: 15 });
        mod(ctx, 'n732_border_closed', 'The Border Closed', { prodMult: 1.07, fortDefBonus: 1, tradeMult: 0.94 }, 360);
        opinion(ctx, 'QDR', me, -25);
        h.chronicle(ctx, 'era', 'The border markets are shut and the trade goes around us to the coast, which is where the empire wanted it in the first place.'); } }),

  N('ev732n_the_presses_of_ekron', 'The Presses of Ekron', -707, 4,
    'Ekron has been rebuilt as an oil town on a scale nobody in this world has attempted: '
    + 'over a hundred press installations inside one wall, working the olives of the whole '
    + 'low country, selling into an empire that wants oil for lamps, for skin, for '
    + 'ritual.\n\nThe olives are largely ours. The pressing, the jars, the seal and the '
    + 'price are entirely theirs. The question in front of the council is whether to be a '
    + 'supplier of fruit or to fight for the second half of the trade.',
    'Tel Miqne/Ekron in the seventh century held the largest concentration of olive-oil installations known from the ancient Near East, an industry organised under Assyrian rule.',
    { label: 'Supply the fruit and take the volume', tooltip: '+180 talents, +20 governance points and "The Fruit Contract" (+9% income, +7% growth, −5% production) for forty years; Philistia to +30 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 180, gov: 20 });
        mod(ctx, 'n732_fruit_contract', 'The Fruit Contract', { incomeMult: 1.09, growthMult: 1.07, prodMult: 0.95 }, 480);
        opinion(ctx, 'PLS', me, 30);
        h.chronicle(ctx, 'era', 'Every terrace in the low country is planted to olives and every cartload goes down to Ekron, where somebody else puts a seal on it.'); } },
    { label: 'Build presses of our own and sell finished oil', tooltip: '−200 talents, +25 governance points and "The Hill Presses" (+12% production, +6% trade) permanently, at Philistia\'s regard −30.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -200, gov: 25 });
        mod(ctx, 'n732_hill_presses', 'The Hill Presses', { prodMult: 1.12, tradeMult: 1.06 });
        opinion(ctx, 'PLS', me, -30);
        h.chronicle(ctx, 'era', 'Press beds and weights are cut in forty hill towns. The oil is finished here, jarred here, and undersold by Ekron for a decade before it is not.'); } }),

  N('ev732n_sidon_runs', 'The King of Sidon Takes Ship', -702, 3,
    'Luli of Sidon, who rules the whole northern coast and half of Cyprus, has looked at the '
    + 'army coming down the shore road and left — by sea, at night, with his household, for '
    + 'Kition. The empire has installed a new king in his place before the ships were out of '
    + 'sight.\n\nThe northern coast changed hands without a siege. Every court between here '
    + 'and the Euphrates is now recalculating, and the recalculation is being done in public '
    + 'by people who have just watched the strongest city on the coast decide it was not '
    + 'worth it.',
    'Sennacherib\'s 701 campaign records that Luli of Sidon fled overseas and Tuba\'lu was installed; the whole Phoenician coast submitted without a battle.',
    { label: 'Recalculate with them', tooltip: '−150 talents, +30 influence points and "The Coast Submits" (+8% income, +6% trade, −8% morale) for thirty years; Assyria to +30 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -150, infl: 30 });
        mod(ctx, 'n732_the_coast_submits', 'The Coast Submits', { incomeMult: 1.08, tradeMult: 1.06, moraleMult: 0.92 }, 360);
        opinion(ctx, 'ASR', me, 30);
        h.chronicle(ctx, 'era', 'The court reads the coast correctly and sends what the coast sent. There is no siege here either.'); } },
    { label: 'Note that a king who runs stops being a king', tooltip: '+30 legitimacy, +35 martial points and "We Do Not Take Ship" (+10% morale, +1 fort defence, −6% trade) for thirty years, at Assyria\'s regard −25.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { legitimacy: 30, mar: 35 });
        mod(ctx, 'n732_we_do_not_take_ship', 'We Do Not Take Ship', { moraleMult: 1.1, fortDefBonus: 1, tradeMult: 0.94 }, 360);
        opinion(ctx, 'ASR', me, -25);
        h.chronicle(ctx, 'era', 'The point is made in council and repeated in the streets: this house has nowhere to sail to, which is either a weakness or the only real strength anybody here has.'); } }),

  N('ev732n_what_padi_costs', 'What Padi Costs', -698, 5,
    'Ekron\'s king is back on his throne, restored by the empire after his own nobles handed '
    + 'him over to us in irons, and the settlement has a price attached that is being '
    + 'itemised in Nineveh: territory off the hill country, transferred to Ekron, Gaza, '
    + 'Ashdod and Ashkelon as a reward for their loyalty.\n\nThe low country is being '
    + 'redistributed to the coast as a matter of imperial bookkeeping, town by town, and '
    + 'there is a clerk with the list.',
    'Sennacherib restored Padi of Ekron and awarded Judahite towns to Ekron, Gaza, Ashdod and Ashkelon; the Taylor prism itemises the transfer.',
    { label: 'Accept the list and buy the best towns back', tooltip: '−190 talents, +25 governance points and "The Towns Bought Back" (+8% production, +5% income) permanently; Philistia to +20 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -190, gov: 25 });
        mod(ctx, 'n732_towns_bought_back', 'The Towns Bought Back', { prodMult: 1.08, incomeMult: 1.05 });
        opinion(ctx, 'PLS', me, 20);
        h.chronicle(ctx, 'era', 'The transfer is not contested. Over the next decade the better half of it is bought back quietly, farm by farm, by men with our silver and Philistine names.'); } },
    { label: 'Resettle the lost towns\' people in the hills', tooltip: '−90 talents, +2,500 manpower, +12 legitimacy and "The People Brought Up" (+10% manpower, +7% growth, +0.6 unrest everywhere) for thirty years.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -90, manpower: 2500, legitimacy: 12 });
        mod(ctx, 'n732_people_brought_up', 'The People Brought Up', { manpowerMult: 1.1, growthMult: 1.07, unrestAll: 0.6 }, 360);
        h.chronicle(ctx, 'era', 'The families of the ceded towns are brought up into the hills and given ground on the ridge. The capital doubles inside a generation and the water supply does not.'); } }),

  N('ev732n_ships_from_the_cities_of_the_sea', 'Ships From the Cities of the Sea', -695, 8,
    'The empire wants a fleet on the Gulf, eight hundred miles from any sea it controls, to '
    + 'chase a Chaldean into the marshes. So it is building one on the Tigris out of '
    + 'Phoenician timber, with Tyrian and Sidonian shipwrights marched inland under escort, '
    + 'and crewing it with men who have never seen that water.\n\nThe levy for it has reached '
    + 'the whole coast: carpenters, rope, pitch, sailcloth, and cash in lieu for anybody '
    + 'without them. We have no shipwrights. We have cash.',
    'Sennacherib had Phoenician shipwrights build a fleet on the Tigris and Euphrates to pursue Merodach-baladan into the Persian Gulf marshes.',
    { label: 'Pay the cash in lieu', tooltip: '−160 talents and "Paid in Silver, Not in Men" (+7% manpower, −0.5 unrest everywhere) for thirty years; Assyria to +20 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -160, gov: 20 });
        mod(ctx, 'n732_paid_in_silver', 'Paid in Silver, Not in Men', { manpowerMult: 1.07, unrestAll: -0.5 }, 360);
        opinion(ctx, 'ASR', me, 20);
        h.chronicle(ctx, 'era', 'The levy is discharged in silver at the assessed rate. Not one man from this country goes to the Tigris, which is worth considerably more than the silver.'); } },
    { label: 'Send the carpenters and learn the trade', tooltip: '−70 talents, −1,500 manpower, +15 governance points and "What the Carpenters Learned" (+9% production, +6% trade) permanently; Tyre to +25 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -70, manpower: -1500, gov: 15 });
        mod(ctx, 'n732_what_the_carpenters_learned', 'What the Carpenters Learned', { prodMult: 1.09, tradeMult: 1.06 });
        opinion(ctx, 'TYR', me, 25); opinion(ctx, 'ASR', me, 15);
        h.chronicle(ctx, 'era', 'Forty carpenters go east with the Tyrians and about half come back, having spent three years learning joinery from the best shipwrights alive.'); } }),

  N('ev732n_elam_comes_west', 'Elam Comes West', -691, 4,
    'Babylon has bought the Elamites, the Elamites have bought everybody east of the Tigris, '
    + 'and the combined host has met the empire at Halule on the river. Both sides claim the '
    + 'victory, which in this world means neither of them got one.\n\nThe important fact is '
    + 'not who won. It is that the empire fought a battle it did not choose, in its own '
    + 'heartland, against a coalition it did not see coming — and that for one campaigning '
    + 'season there was no Assyrian army anywhere west of the Euphrates.',
    'The battle of Halule (691) between Sennacherib and the Babylonian-Elamite coalition under Humban-nimena is claimed as a victory in the Assyrian annals and in the Babylonian Chronicle by the other side.',
    { label: 'Use the season — rebuild the walls', tooltip: '−170 talents, +35 martial points and "The Season Without an Army" (+2 fort defence, +8% manpower) permanently.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -170, mar: 35 });
        mod(ctx, 'n732_season_without_an_army', 'The Season Without an Army', { fortDefBonus: 2, manpowerMult: 1.08 });
        h.chronicle(ctx, 'era', 'Every mason in the country is on a wall for one summer while the empire is busy on the Tigris, and nobody sends a single letter about it.'); } },
    { label: 'Open a correspondence with Babylon', tooltip: '+40 influence points and "A Letter to the Marshes" (+8% trade, +0.2 legitimacy a month) for thirty years; Babylon to +35 regard, Assyria to −30.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { infl: 40 });
        mod(ctx, 'n732_letter_to_the_marshes', 'A Letter to the Marshes', { tradeMult: 1.08, legitimacyAdd: 0.2 }, 360);
        opinion(ctx, 'BBL', me, 35); opinion(ctx, 'ASR', me, -30);
        h.chronicle(ctx, 'era', 'A letter goes east by a route that does not pass a post station. Two generations later somebody in Babylon remembers that it came.'); } }),

  N('ev732n_edom_fences_the_copper', 'Edom Fences the Copper', -688, 6,
    'The copper of the Arabah is being worked harder than it has been in two hundred years, '
    + 'because the empire wants bronze and pays for it, and Edom has become — quietly, '
    + 'without a battle, by being where the ore is — a court that matters. It has a capital '
    + 'on a crag, a king the empire corresponds with, and a fortified road.\n\nThe road runs '
    + 'through the Negev. Our Negev. Edom has proposed a toll-sharing arrangement, which is a '
    + 'polite way of asking us to acknowledge that the road is theirs to share.',
    'Iron Age II copper production at Khirbat en-Nahas peaks in the ninth-seventh centuries; Edom appears as a settled Assyrian tributary kingdom with a king at Bozrah.',
    { label: 'Share the toll', tooltip: '+130 talents, +20 influence points and "The Shared Toll" (+9% trade, +5% income) for forty years; Edom to +35 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 130, infl: 20 });
        mod(ctx, 'n732_shared_toll', 'The Shared Toll', { tradeMult: 1.09, incomeMult: 1.05 }, 480);
        opinion(ctx, 'EDM', me, 35);
        h.chronicle(ctx, 'era', 'The toll is split at the wells and both courts post guards at their own end. The copper goes north and the arrangement outlasts the empire that made it worth having.'); } },
    { label: 'Refuse — the road is ours', tooltip: '−1,800 manpower, +30 martial points and "The Southern Road Held" (+1 fort defence, +8% production, −5% trade) permanently, at Edom\'s regard −45.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { manpower: -1800, mar: 30 });
        mod(ctx, 'n732_southern_road_held', 'The Southern Road Held', { fortDefBonus: 1, prodMult: 1.08, tradeMult: 0.95 });
        opinion(ctx, 'EDM', me, -45);
        h.chronicle(ctx, 'era', 'The Negev forts are reinforced and the caravans are told whose road they are on. Edom writes to Nineveh about it, and Nineveh files the letter.'); } }),

  N('ev732n_a_market_at_gaza', 'A Market at Gaza', -685, 3,
    'Gaza is now the empire\'s southern port and the place where the desert trade is '
    + 'converted into silver under an imperial seal. Its king has kept his throne through '
    + 'two revolts by the simple method of never joining one, and his customs house is the '
    + 'richest building between here and the Delta.\n\nHe has offered us a standing berth and '
    + 'a fixed rate — a good rate — on condition that our southern caravans stop going '
    + 'directly to the Delta and come through him.',
    'Gaza under Hanunu and his successors served as the Assyrian emporium for the Arabian and Egyptian trade; the city survived repeated regional revolts as a loyal tributary.',
    { label: 'Take the berth', tooltip: '+150 talents and "The Berth at Gaza" (+11% trade, +5% income) for forty years; Philistia to +35 regard, Egypt to −20.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 150, infl: 20 });
        mod(ctx, 'n732_berth_at_gaza', 'The Berth at Gaza', { tradeMult: 1.11, incomeMult: 1.05 }, 480);
        opinion(ctx, 'PLS', me, 35); opinion(ctx, 'MIZ', me, -20);
        h.chronicle(ctx, 'era', 'The southern goods go to Gaza and come back as silver with an imperial seal on the weight. Nobody has to cross the desert twice.'); } },
    { label: 'Keep the Delta route open', tooltip: '+100 talents and "Two Buyers, Not One" (+8% trade, +6% income, −0.4 unrest everywhere) for thirty years; Egypt to +25 regard, Philistia to −20.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 100, gov: 20 });
        mod(ctx, 'n732_two_buyers', 'Two Buyers, Not One', { tradeMult: 1.08, incomeMult: 1.06, unrestAll: -0.4 }, 360);
        opinion(ctx, 'MIZ', me, 25); opinion(ctx, 'PLS', me, -20);
        h.chronicle(ctx, 'era', 'The caravans go to whichever of the two buyers is paying better that season, which is a worse rate on average and a great deal harder to squeeze.'); } }),

  N('ev732n_the_king_is_killed', 'The King Is Killed in the Temple', -681, 9,
    'The king of Assyria has been murdered by his own sons while at prayer, and the empire '
    + 'has spent six weeks deciding which of them is going to win. The one who does is the '
    + 'youngest, who was not in the temple, and who has marched on the capital from the '
    + 'north-west with the field army behind him.\n\nEvery tributary from here to the sea is '
    + 'now asking the same question, which is whether the oaths sworn to the father bind '
    + 'anybody to the son, and the answer is going to be given by whoever asks it first.',
    '2 Kings 19:37 and the Babylonian Chronicle: Sennacherib was killed by his sons in 681 and succeeded after a short civil war by Esarhaddon.',
    { label: 'Swear to the son at once', tooltip: '−140 talents, +35 influence points and "First to Swear" (+9% income, −0.6 unrest everywhere) for forty years; Assyria to +40 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -140, infl: 35 });
        mod(ctx, 'n732_first_to_swear', 'First to Swear', { incomeMult: 1.09, unrestAll: -0.6 }, 480);
        opinion(ctx, 'ASR', me, 40);
        h.chronicle(ctx, 'era', 'The envoys are on the road before the succession is settled and arrive with the oath already written out. The new king remembers it for twenty years.'); } },
    { label: 'Wait and see who is standing', tooltip: '+45 governance points and "We Waited" (+8% manpower, +1 fort defence, −5% income) for thirty years, at Assyria\'s regard −20.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { gov: 45, mar: 20 });
        mod(ctx, 'n732_we_waited', 'We Waited', { manpowerMult: 1.08, fortDefBonus: 1, incomeMult: 0.95 }, 360);
        opinion(ctx, 'ASR', me, -20);
        h.chronicle(ctx, 'era', 'The court sends nothing for six weeks and then sends everything. The gift is accepted and its date is entered in the record along with everybody else\'s.'); } }),

  N('ev732n_sidon_is_erased', 'Sidon Is Erased', -677, 5,
    'Sidon is not there. The king was caught at sea and beheaded, the population was '
    + 'deported, the walls and houses were thrown into the water, and a new town has been '
    + 'founded on the site under the empire\'s own name with imported settlers.\n\nSidon was '
    + 'not a rebel province. It was a tributary city with a treaty, and it is gone. Tyre, '
    + 'twenty miles down the coast, has read the message and renewed its own treaty with an '
    + 'enthusiasm that is painful to watch.',
    'Esarhaddon destroyed Sidon in 677, executed Abdi-Milkutti, deported the population and founded Kar-Esarhaddon on the site; the Tyrian treaty with Baal dates from the same years.',
    { label: 'Renew our own treaty, in the same words', tooltip: '−120 talents, +25 influence points and "The Treaty Renewed" (+8% income, +5% trade, −8% morale) for forty years; Assyria to +35 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -120, infl: 25 });
        mod(ctx, 'n732_treaty_renewed', 'The Treaty Renewed', { incomeMult: 1.08, tradeMult: 1.05, moraleMult: 0.92 }, 480);
        opinion(ctx, 'ASR', me, 35);
        h.chronicle(ctx, 'era', 'The treaty is renewed unasked, with the clauses about informers and the clauses about succession, and the court reads them aloud once and never again.'); } },
    { label: 'Take in the Sidonian refugees', tooltip: '−80 talents, −10 governance points and "The Sidonians Among Us" (+9% trade, +7% growth, +0.6 unrest everywhere) permanently; Tyre to +35 regard, Assyria to −25.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -80, gov: -10 });
        mod(ctx, 'n732_sidonians_among_us', 'The Sidonians Among Us', { tradeMult: 1.09, growthMult: 1.07, unrestAll: 0.6 });
        opinion(ctx, 'TYR', me, 35); opinion(ctx, 'ASR', me, -25);
        h.chronicle(ctx, 'era', 'Sidonian families come up into the hill towns with their trades, their gods and their accounts, and the market quarter of the capital is never the same again.'); } }),

  N('ev732n_the_levy_for_the_arsenal', 'The Levy for the Arsenal', -673, 4,
    'The empire is building an arsenal at Nineveh and has summoned the kings of the coast '
    + 'and the plateau to supply it — timber from the Lebanon, stone from wherever there is '
    + 'stone, and the labour to move both. Twenty-odd courts have been named in the same '
    + 'document, which is itself the message.\n\nThe levy can be discharged in kind, which is '
    + 'cheap and slow, or in silver, which is expensive and instant, or in men, which is the '
    + 'cheapest of all and means several thousand of them will be in Assyria for three years.',
    'Esarhaddon\'s building inscriptions list twenty-two kings of Hatti, the seashore and the islands — Judah among them — levied for materials and labour for the arsenal at Nineveh.',
    { label: 'Discharge it in kind', tooltip: '−110 talents and "Paid in Timber and Stone" (+7% production, −0.4 unrest everywhere) for thirty years; Assyria to +20 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -110, gov: 20 });
        mod(ctx, 'n732_paid_in_timber', 'Paid in Timber and Stone', { prodMult: 1.07, unrestAll: -0.4 }, 360);
        opinion(ctx, 'ASR', me, 20);
        h.chronicle(ctx, 'era', 'Cartloads go north for three years. The quarry gangs learn imperial stone-cutting and bring it home, which is the only part of the levy worth anything.'); } },
    { label: 'Send men', tooltip: '−2,600 manpower, +90 talents and "The Men Who Went North" (+10% income, +6% trade) for thirty years; Assyria to +30 regard. Some of them come back.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { manpower: -2600, treasury: 90 });
        mod(ctx, 'n732_men_who_went_north', 'The Men Who Went North', { incomeMult: 1.1, tradeMult: 1.06 }, 360);
        opinion(ctx, 'ASR', me, 30);
        h.chronicle(ctx, 'era', 'The levy goes north on foot in the spring. The silver stays here, and so do the families of the men who do not come back.'); } }),

  N('ev732n_the_arab_gods_go_home', 'The Gods Go Home in a Cart', -669, 7,
    'The empire took the gods of the Arabs years ago — the actual images, loaded onto carts '
    + 'and carried to Nineveh — and has now had them repaired, inscribed with the Assyrian '
    + 'king\'s name, and sent back. The tribes have their gods again, with somebody else\'s '
    + 'name cut into them.\n\nIt is the most elegant piece of statecraft anybody here has '
    + 'seen in a generation: it costs nothing, it cannot be refused, and every time the tribe '
    + 'prays it reads the name. The chancery has asked whether anything of ours is in that '
    + 'storeroom.',
    'Esarhaddon records returning the captured deities of the Arabs, inscribed with his own name, to Hazael in exchange for tribute and submission — a standard Assyrian instrument.',
    { label: 'Ask what is in the storeroom', tooltip: '−100 talents, +25 legitimacy and "What Came Back" (+0.25 legitimacy a month, −0.5 unrest everywhere) permanently; Assyria to +15 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -100, legitimacy: 25 });
        mod(ctx, 'n732_what_came_back', 'What Came Back', { legitimacyAdd: 0.25, unrestAll: -0.5 });
        opinion(ctx, 'ASR', me, 15);
        h.chronicle(ctx, 'era', 'An inventory is requested and, astonishingly, supplied. What comes back comes back on a cart with a name cut into it that nobody here reads out loud.'); } },
    { label: 'Ask nothing, and say why', tooltip: '+30 legitimacy, −10 influence points and "Nothing of Ours Is in a Cart" (+0.3 legitimacy a month, +8% morale) permanently — a house with no image cannot have one returned to it.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { legitimacy: 30, infl: -10 });
        mod(ctx, 'n732_nothing_in_a_cart', 'Nothing of Ours Is in a Cart', { legitimacyAdd: 0.3, moraleMult: 1.08 });
        h.chronicle(ctx, 'era', 'The answer sent north is that this house keeps no image that anybody could carry away, which is true, and which the Assyrian scribes record as an eccentricity.'); } }),

  N('ev732n_the_ships_of_tyre_are_taken', 'The Ships of Tyre Are Taken', -666, 3,
    'Tyre backed Egypt, Egypt lost, and the empire has done to Tyre what can be done to an '
    + 'island: taken the mainland, taken the water, taken the trading stations up and down '
    + 'the coast, and left the rock itself alone. The city is intact and owns nothing outside '
    + 'its own wall.\n\nIts factors are selling off the mainland warehouses and its captains '
    + 'are looking for someone else\'s flag. The coast trade of the whole Levant is, for one '
    + 'season, available.',
    'Ashurbanipal blockaded Tyre under Baal after its support for Taharqa and Psamtik, stripping its mainland possessions while the island city itself was not taken.',
    { label: 'Buy the warehouses', tooltip: '−200 talents and "The Mainland Warehouses" (+12% trade, +6% income) permanently; Tyre to +25 regard, Assyria to −15.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -200, infl: 15 });
        mod(ctx, 'n732_mainland_warehouses', 'The Mainland Warehouses', { tradeMult: 1.12, incomeMult: 1.06 });
        opinion(ctx, 'TYR', me, 25); opinion(ctx, 'ASR', me, -15);
        h.chronicle(ctx, 'era', 'The coast warehouses change hands at distress prices, and for the first time this kingdom owns storage on water it does not control.'); } },
    { label: 'Hire the captains', tooltip: '−130 talents, +15 governance points and "The Hired Captains" (+10% trade, +5% production, +0.4 unrest everywhere) for forty years; Tyre to +30 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -130, gov: 15 });
        mod(ctx, 'n732_hired_captains', 'The Hired Captains', { tradeMult: 1.1, prodMult: 1.05, unrestAll: 0.4 }, 480);
        opinion(ctx, 'TYR', me, 30);
        h.chronicle(ctx, 'era', 'Tyrian masters take our cargoes under our name at a wage, and a generation of men from the hill towns learns the coast from people who have sailed it for nine hundred years.'); } }),

  N('ev732n_a_wall_around_the_desert', 'A Wall Around the Desert', -662, 5,
    'The empire is trying to do to the desert what it has done to everywhere else, and the '
    + 'desert is not cooperating. Columns go out, find wells, fill them in, catch nobody, and '
    + 'come back. The tribes move. The caravans stop moving, which is the part that reaches '
    + 'us.\n\nThe southern trade has been dead for two seasons. There is a proposal to open a '
    + 'route further west, through the Negev and down the coast, which would be ours, longer, '
    + 'and outside the war.',
    'Ashurbanipal\'s Arabian campaigns against Uate\' and the Qedarites are recorded as a series of punitive expeditions with wells destroyed and tribes pursued rather than as conquests.',
    { label: 'Open the western route', tooltip: '−150 talents, +25 influence points and "The Western Route" (+11% trade, +6% income) permanently; Qedar to +30 regard, Assyria to −20.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -150, infl: 25 });
        mod(ctx, 'n732_western_route', 'The Western Route', { tradeMult: 1.11, incomeMult: 1.06 });
        opinion(ctx, 'QDR', me, 30); opinion(ctx, 'ASR', me, -20);
        h.chronicle(ctx, 'era', 'Wells are cut and caravanserais built on a line that runs west of the fighting. The route is four days longer and it is open every year of the war.'); } },
    { label: 'Supply the imperial columns instead', tooltip: '+170 talents, +20 governance points and "The Desert Contract" (+8% income, +5% production, −5% trade) for thirty years; Assyria to +30 regard, Qedar to −30.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 170, gov: 20 });
        mod(ctx, 'n732_desert_contract', 'The Desert Contract', { incomeMult: 1.08, prodMult: 1.05, tradeMult: 0.95 }, 360);
        opinion(ctx, 'ASR', me, 30); opinion(ctx, 'QDR', me, -30);
        h.chronicle(ctx, 'era', 'Grain, water-skins and guides are sold to the columns at a fair price for a decade. The desert notices who sold the guides.'); } }),

  N('ev732n_the_lydian_sends_for_help', 'A Letter From the Far End of the World', -657, 4,
    'A king nobody at this court had heard of, from a country at the far end of Anatolia, has '
    + 'written to Nineveh asking for help against horsemen out of the steppe — and the news '
    + 'that has reached us with the story is the detail the merchants care about: the Lydians '
    + 'are stamping lumps of electrum with a mark that guarantees the weight.\n\nA lump of '
    + 'metal you do not have to weigh is a different thing from a lump of metal you do. Our '
    + 'whole trade runs on balances and everybody cheats.',
    'Gyges of Lydia appealed to Ashurbanipal against the Cimmerians; the earliest stamped electrum coinage is Lydian, from the late seventh century.',
    { label: 'Get the stamped metal and use it', tooltip: '−90 talents, +30 governance points and "Metal With a Mark On It" (+10% trade, −6% cost of governing, +5% income) permanently; Lydia to +25 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -90, gov: 30 });
        mod(ctx, 'n732_metal_with_a_mark', 'Metal With a Mark On It', { tradeMult: 1.1, adminMult: 0.94, incomeMult: 1.05 });
        opinion(ctx, 'LYD', me, 25);
        h.chronicle(ctx, 'era', 'Stamped electrum appears in the market quarter and the money-changers hate it, which is how everybody knows it works.'); } },
    { label: 'Keep to weighed silver and a royal standard', tooltip: '−60 talents, +25 governance points, +10 legitimacy and "The Royal Weight" (+8% income, +0.2 legitimacy a month, −0.4 unrest everywhere) permanently.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -60, gov: 25, legitimacy: 10 });
        mod(ctx, 'n732_royal_weight', 'The Royal Weight', { incomeMult: 1.08, legitimacyAdd: 0.2, unrestAll: -0.4 });
        h.chronicle(ctx, 'era', 'A set of royal weights is cut in limestone and copies are issued to every market town, with the shekel marked on each in the old script.'); } }),

  N('ev732n_bronze_men_in_the_forts', 'Bronze Men in the Forts', -653, 6,
    'The Delta is hiring Ionians and Carians by the shipload — men in bronze, fighting '
    + 'shoulder to shoulder in a line, which is not how anybody in this part of the world '
    + 'fights — and the practice has reached the coast. Two of the Philistine cities have '
    + 'companies of them. So does Egypt\'s garrison at the mouth of the Nile.\n\nThey are '
    + 'expensive, they do not speak anything anybody here speaks, and in a straight fight on '
    + 'flat ground a hundred of them are worth four hundred of ours. On a hillside they are '
    + 'worth considerably less, which the general keeps pointing out.',
    'Psamtik I\'s Ionian and Carian mercenaries are recorded by Herodotus II.152-154; Greek hoplite equipment appears at coastal Levantine sites from the mid-seventh century.',
    { label: 'Hire a company', tooltip: '−180 talents, +35 martial points and "The Bronze Company" (+12% army strength, +8% morale, +0.5 unrest everywhere) for thirty years; Athens to +20 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -180, mar: 35 });
        mod(ctx, 'n732_bronze_company', 'The Bronze Company', { milPowerMult: 1.12, moraleMult: 1.08, unrestAll: 0.5 }, 360);
        opinion(ctx, 'ATH', me, 20); opinion(ctx, 'MIZ', me, 15);
        h.chronicle(ctx, 'era', 'A company of men in bronze is quartered below the capital, paid in silver, and used exactly twice in thirty years, both times decisively.'); } },
    { label: 'Buy the armour and teach our own', tooltip: '−140 talents, +30 martial points and "The Line of Shields" (+9% army strength, +7% manpower) permanently. It takes a decade before it is worth anything.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -140, mar: 30 });
        mod(ctx, 'n732_line_of_shields', 'The Line of Shields', { milPowerMult: 1.09, manpowerMult: 1.07 });
        h.chronicle(ctx, 'era', 'Shields and greaves are bought by the cartload and the levy is drilled to stand in a line, which takes ten years and two humiliations to learn.'); } }),

  N('ev732n_the_desert_is_punished', 'The Desert Is Punished', -645, 5,
    'The empire has finished with the Arabs. The report that has come down the road is that '
    + 'camels were sold in the streets of Nineveh for less than a bag of grain, that the '
    + 'tribes have been broken up and scattered, and that the caravan trade of the whole '
    + 'southern desert has effectively ceased.\n\nThe merchants of this country have lost '
    + 'their southern suppliers and gained, at ruinous prices, every camel they will ever '
    + 'need. The shrewder of them are pointing out that when the tribes reassemble — and they '
    + 'will — whoever has the animals will have the road.',
    'Ashurbanipal\'s final Arabian campaign records camels sold in Assyria at derisory prices and the dispersal of the Qedarite confederation.',
    { label: 'Buy the camels', tooltip: '−170 talents, +20 influence points and "The Camel Herds" (+12% trade, +6% manpower) permanently; Qedar to +25 regard when they come back.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -170, infl: 20 });
        mod(ctx, 'n732_camel_herds', 'The Camel Herds', { tradeMult: 1.12, manpowerMult: 1.06 });
        opinion(ctx, 'QDR', me, 25);
        h.chronicle(ctx, 'era', 'Every camel that can be bought is bought and put out to the Negev herders. Fifteen years later the southern road reopens and the animals on it are ours.'); } },
    { label: 'Sell what is left of the stock and wait', tooltip: '+200 talents, +15 governance points and "The Trade Suspended" (+9% income, −6% trade) for twenty-five years.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 200, gov: 15 });
        mod(ctx, 'n732_trade_suspended', 'The Trade Suspended', { incomeMult: 1.09, tradeMult: 0.94 }, 300);
        h.chronicle(ctx, 'era', 'The incense stock in the warehouses is sold at the top of a market with no supply, and the southern trade is written off for a generation.'); } }),

  N('ev732n_egypt_takes_the_coast', 'Egypt Comes Back to the Coast', -643, 8,
    'Egypt is on the coast road again for the first time in a century — not raiding, '
    + 'garrisoning — and has sat down in front of Ashdod with what looks like the intention '
    + 'of staying until the city falls, however long that takes. The empire, which owns '
    + 'Ashdod, has said nothing at all.\n\nThat silence is the news. The court has been '
    + 'reading it all week, and the two readings are that Assyria has agreed to this, or that '
    + 'Assyria can no longer do anything about it.',
    'Herodotus II.157 records Psamtik I\'s twenty-nine-year siege of Azotus; Egyptian re-entry into the southern Levant in the 640s-630s goes unopposed by Assyria.',
    { label: 'Treat with Egypt', tooltip: '+30 influence points, +80 talents and "The Egyptian Understanding" (+9% trade, +6% income, +0.5 unrest everywhere) for thirty years; Egypt to +35 regard, Assyria to −25.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { infl: 30, treasury: 80 });
        mod(ctx, 'n732_egyptian_understanding', 'The Egyptian Understanding', { tradeMult: 1.09, incomeMult: 1.06, unrestAll: 0.5 }, 360);
        opinion(ctx, 'MIZ', me, 35); opinion(ctx, 'ASR', me, -25);
        h.chronicle(ctx, 'era', 'Envoys go down to the camp before Ashdod and come back with terms. The court has changed empires without anybody having to say so.'); } },
    { label: 'Hold to the oath and wall the west', tooltip: '−160 talents, +20 legitimacy, +30 martial points and "The Western Wall" (+2 fort defence, +7% manpower) permanently; Assyria to +25 regard, Egypt to −25.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -160, legitimacy: 20, mar: 30 });
        mod(ctx, 'n732_western_wall', 'The Western Wall', { fortDefBonus: 2, manpowerMult: 1.07 });
        opinion(ctx, 'ASR', me, 25); opinion(ctx, 'MIZ', me, -25);
        h.chronicle(ctx, 'era', 'The oath is kept and the western approaches are walled, on the reasoning that an empire which cannot protect you can still punish you.'); } }),

  N('ev732n_scythians_on_the_coast_road', 'Riders Down the Coast Road', -637, 4,
    'Horsemen out of the north have come the whole length of the coast — through Syria, past '
    + 'the Phoenician cities, down the plain — and got as far as Ascalon before turning back. '
    + 'They did not besiege anything. They did not have to; nothing on the road could stand in '
    + 'front of them in the open and everything on the road knew it.\n\nEgypt is said to have '
    + 'bought them off at the frontier. The Philistine cities are said to have paid. Nobody is '
    + 'quite sure whether they have gone home or wintered somewhere north of Carmel.',
    'Herodotus I.103-106 describes a Scythian incursion reaching Ascalon and being bought off by Psammetichus at the Egyptian frontier; Scythian arrowheads appear at seventh-century Levantine sites.',
    { label: 'Pay them and watch them leave', tooltip: '−150 talents, +20 governance points and "The Riders Paid" (−0.6 unrest everywhere, +6% income) for twenty-five years, at −10 legitimacy.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -150, legitimacy: -10, gov: 20 });
        mod(ctx, 'n732_riders_paid', 'The Riders Paid', { unrestAll: -0.6, incomeMult: 1.06 }, 300);
        h.chronicle(ctx, 'era', 'The payment goes out to a camp on the plain and the horsemen go north within the week, which is cheap at the price and says so in nobody\'s chronicle.'); } },
    { label: 'Hold the passes and let them go round', tooltip: '−1,600 manpower, +20 legitimacy, +30 martial points and "The Passes Held" (+1 fort defence, +10% morale, +6% manpower) for thirty years.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { manpower: -1600, legitimacy: 20, mar: 30 });
        mod(ctx, 'n732_passes_held', 'The Passes Held', { fortDefBonus: 1, moraleMult: 1.1, manpowerMult: 1.06 }, 360);
        h.chronicle(ctx, 'era', 'Every pass up into the hill country is stopped and watched for a season. The horsemen stay on the plain, where the riding is better anyway.'); } }),

  N('ev732n_the_empire_stops_asking', 'The Empire Stops Asking', -633, 6,
    'The tribute demand has not come. Not reduced, not deferred — it simply has not arrived, '
    + 'for the second year running, and the governor at Megiddo has been recalled and not '
    + 'replaced. There are towns in the northern province where nobody has collected anything '
    + 'for three seasons.\n\nThe treasurer wants to know whether to keep the money. The '
    + 'chancery wants to know whether to send it anyway. Both of them understand that the '
    + 'first court to stop paying will find out something important, and that finding out is '
    + 'not always survivable.',
    'Assyrian control of the western provinces lapses through the 630s-620s; Josiah\'s expansion into the former province of Samerina (2 Kings 23) presupposes an administrative vacuum.',
    { label: 'Keep the money and move north quietly', tooltip: '+240 talents, +25 martial points, +15 legitimacy and "The Vacuum in the North" (+10% manpower, +8% production, +0.6 unrest everywhere) permanently; Assyria to −30 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 240, mar: 25, legitimacy: 15 });
        mod(ctx, 'n732_vacuum_in_the_north', 'The Vacuum in the North', { manpowerMult: 1.1, prodMult: 1.08, unrestAll: 0.6 });
        opinion(ctx, 'ASR', me, -30);
        h.chronicle(ctx, 'era', 'The tribute stays in the treasury and officers of this crown begin, very quietly, holding court in towns that were somebody else\'s province last year.'); } },
    { label: 'Send it anyway', tooltip: '−190 talents, +35 influence points and "Paid to a Court That Did Not Ask" (+0.25 legitimacy a month, −0.5 unrest everywhere, +6% income) for thirty years; Assyria to +40 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -190, infl: 35 });
        mod(ctx, 'n732_paid_unasked', 'Paid to a Court That Did Not Ask', { legitimacyAdd: 0.25, unrestAll: -0.5, incomeMult: 1.06 }, 360);
        opinion(ctx, 'ASR', me, 40);
        h.chronicle(ctx, 'era', 'The tribute goes north to a capital that has stopped asking for it, which costs a great deal and buys the one thing the court cannot make for itself, which is time.'); } }),

  N('ev732n_greeks_in_the_fort_on_the_shore', 'Greeks in the Fort on the Shore', -628, 3,
    'There is a fort on the coast south of the Yarkon, garrisoned by Greek-speaking '
    + 'mercenaries in this crown\'s pay, and a reaper from the fields outside it has '
    + 'petitioned the governor in writing because the overseer took his cloak and has not '
    + 'given it back.\n\nThe petition is on a potsherd, in our script, drafted by somebody who '
    + 'knew the law well enough to quote it. That a labourer on the coast can put the crown\'s '
    + 'own statute in front of the crown\'s own officer, over a cloak, is either the best news '
    + 'of the reign or an administrative nuisance, depending on where you sit.',
    'The Mezad Hashavyahu ostracon (late seventh century) is a Hebrew petition from a reaper over a confiscated garment, from a coastal fort with Greek mercenary material.',
    { label: 'Rule for the reaper, publicly', tooltip: '+30 legitimacy, −20 governance points and "The Cloak Returned" (+0.3 legitimacy a month, −0.7 unrest everywhere, −5% income) permanently.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { legitimacy: 30, gov: -20 });
        mod(ctx, 'n732_cloak_returned', 'The Cloak Returned', { legitimacyAdd: 0.3, unrestAll: -0.7, incomeMult: 0.95 });
        h.chronicle(ctx, 'era', 'The cloak is returned and the ruling is read out at the fort gate. Within a year there are petitions on potsherds from every coastal district, which is precisely the intention.'); } },
    { label: 'Back the officer and keep the coast quiet', tooltip: '+40 governance points, +15 martial points and "The Officer Upheld" (+8% income, +1 fort defence, +0.6 unrest everywhere) for thirty years.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { gov: 40, mar: 15 });
        mod(ctx, 'n732_officer_upheld', 'The Officer Upheld', { incomeMult: 1.08, fortDefBonus: 1, unrestAll: 0.6 }, 360);
        h.chronicle(ctx, 'era', 'The petition is dismissed and the garrison is told the crown supports its officers. The potsherd is thrown on a rubbish heap, where it stays for twenty-six centuries.'); } }),

  N('ev732n_edom_in_the_negev', 'Edom Comes Over the Wadi', -618, 5,
    'Edomite families are settling in the Negev — not raiding, settling: houses, cisterns, '
    + 'shrines with their own god\'s name on the ostraca, in valleys that have been under this '
    + 'crown\'s fortresses for two hundred years. The fortress commanders report it as an '
    + 'incursion. The tax officers report it as new ploughland.\n\nBoth are right. The '
    + 'question is whether the south is a border to be defended or a country to be filled, '
    + 'and the answer decides who lives there in fifty years.',
    'Edomite pottery, ostraca and a shrine at Horvat Qitmit attest Edomite settlement in the eastern Negev during the late seventh and early sixth centuries.',
    { label: 'Enrol them as subjects', tooltip: '+120 talents and "The New Ploughland" (+9% growth, +7% income, +0.6 unrest everywhere) permanently; Edom to +30 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 120, gov: 20 });
        mod(ctx, 'n732_new_ploughland', 'The New Ploughland', { growthMult: 1.09, incomeMult: 1.07, unrestAll: 0.6 });
        opinion(ctx, 'EDM', me, 30);
        h.chronicle(ctx, 'era', 'The Edomite settlers are entered on the tax rolls with their own names and their own god, and the Negev has more people in it than at any time in its history.'); } },
    { label: 'Clear them back over the wadi', tooltip: '−1,400 manpower, +25 martial points, +10 legitimacy and "The Southern Border Restored" (+1 fort defence, +8% manpower, −5% growth) permanently, at Edom\'s regard −50.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { manpower: -1400, mar: 25, legitimacy: 10 });
        mod(ctx, 'n732_southern_border_restored', 'The Southern Border Restored', { fortDefBonus: 1, manpowerMult: 1.08, growthMult: 0.95 });
        opinion(ctx, 'EDM', me, -50);
        h.chronicle(ctx, 'era', 'The settlements are cleared and the valleys go back to grazing. Edom remembers it, and will be in the Negev again within thirty years with nobody to stop it.'); } }),

  N('ev732n_egypt_marches_to_save_assyria', 'Egypt Marches North to Save Assyria', -615, 4,
    'Egypt is sending an army up the coast road to fight for Assyria. For three hundred years '
    + 'these two have been the only real enemies either of them had, and Egypt is now spending '
    + 'its own men to keep the Assyrian rump standing at Harran.\n\nThe reasoning is not hard '
    + 'to follow: a weak Assyria on the Euphrates is a wall, and what is behind it is Babylon '
    + 'and the Medes together. Every court on this road is about to be asked to let that army '
    + 'through, and letting an army through is a decision about whose side you are on.',
    'From 616 Egypt under Psamtik I and Necho II campaigned in support of Assyria against Babylon; the Babylonian Chronicle records Egyptian forces on the Euphrates.',
    { label: 'Let them through and keep the road open', tooltip: '+140 talents, +20 influence points and "The Road Open Both Ways" (+9% trade, +6% income, −5% morale) for thirty years; Egypt to +35 regard, Babylon to −30.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 140, infl: 20 });
        mod(ctx, 'n732_road_open_both_ways', 'The Road Open Both Ways', { tradeMult: 1.09, incomeMult: 1.06, moraleMult: 0.95 }, 360);
        opinion(ctx, 'MIZ', me, 35); opinion(ctx, 'BBL', me, -30);
        h.chronicle(ctx, 'era', 'The Egyptian columns go north through the plain and are supplied on the way. The court has chosen a side without ever putting it to a vote.'); } },
    { label: 'Close the passes and let the coast road carry it', tooltip: '−110 talents and "The Hill Country Closed" (+1 fort defence, +8% manpower, −5% trade) for thirty years; Babylon to +30 regard, Egypt to −25.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -110, mar: 30, legitimacy: 10 });
        mod(ctx, 'n732_hill_country_closed', 'The Hill Country Closed', { fortDefBonus: 1, manpowerMult: 1.08, tradeMult: 0.95 }, 360);
        opinion(ctx, 'BBL', me, 30); opinion(ctx, 'MIZ', me, -25);
        h.chronicle(ctx, 'era', 'The ridge road is closed and the Egyptians go up the coast, which is longer, flatter and watched the whole way by men who report to Babylon.'); } }),

  N('ev732n_necho_at_riblah', 'The Camp at Riblah', -608, 3,
    'Egypt holds the whole Levant as far as the Euphrates, its headquarters are in a camp on '
    + 'the Orontes, and every court from here to Hamath has been summoned to it. The summons '
    + 'is not a request. The last king of this country to meet an Egyptian army in the field '
    + 'came home in a chariot, dead, three months ago.\n\nWhat is on offer at Riblah is a '
    + 'settlement: recognition, a border, and an indemnity. What is on offer instead is the '
    + 'same settlement imposed by somebody who has come to collect it.',
    '2 Kings 23:33-35: Necho put Jehoahaz in bands at Riblah, set a tribute of a hundred talents of silver and a talent of gold on the land, and made Eliakim king in his stead.',
    { label: 'Go to Riblah and settle', tooltip: '−210 talents and "The Terms of Riblah" (+8% income, −0.5 unrest everywhere, −8% morale) for thirty years; Egypt to +35 regard, Babylon to −25.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -210, infl: 25, legitimacy: -10 });
        mod(ctx, 'n732_terms_of_riblah', 'The Terms of Riblah', { incomeMult: 1.08, unrestAll: -0.5, moraleMult: 0.92 }, 360);
        opinion(ctx, 'MIZ', me, 35); opinion(ctx, 'BBL', me, -25);
        h.chronicle(ctx, 'era', 'The indemnity is assessed on the land and collected from every man according to his rating, which is the first general tax this country has ever levied and will not be the last.'); } },
    { label: 'Send the indemnity and stay at home', tooltip: '−260 talents, +25 legitimacy and "The King Did Not Go" (+0.25 legitimacy a month, +8% morale, +0.6 unrest everywhere) for thirty years, at Egypt\'s regard −30.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -260, legitimacy: 25 });
        mod(ctx, 'n732_king_did_not_go', 'The King Did Not Go', { legitimacyAdd: 0.25, moraleMult: 1.08, unrestAll: 0.6 }, 360);
        opinion(ctx, 'MIZ', me, -30);
        h.chronicle(ctx, 'era', 'The silver goes north and the king does not, which costs an extra fifty talents and is remembered in the hill country for a hundred years.'); } }),
];
