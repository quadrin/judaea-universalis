// Judaea Universalis — the other side of the line: 929–715 BCE (SPEC §281).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// The chapter already knows two scales. There is the world — Egypt coming
// apart, Assyria coming back, a headland at Carthage — in the world spine,
// and there is the realm, in the chain, in the years and in the two houses.
// What was missing is the scale a caravan crosses in a week: Tyre's dye
// vats, the toll at Gaza, the fords of the Jabbok, the copper at the head of
// the gulf, the men of Dibon walking back onto the plateau, and the sheikhs
// of the dry country who decide every year whether the Negev has a harvest.
//
// A small kingdom's foreign policy is nine tenths neighbours, and this
// chapter — the one chapter where both Israelite kingdoms are real powers
// with real archives — had almost none of it. Nine chapters of this game ship
// a neighbours package. The first three did not.
//
// Sources: 1 Kings 15-22 and 2 Kings 3-17; 2 Chronicles 17-28; Amos 1-2 for
// the oracles against Damascus, Gaza, Tyre, Edom, Ammon and Moab; the Mesha
// stele for Ataroth and the Mishor; the Tel Dan and Zakkur steles; the Black
// Obelisk and the annals of Shalmaneser III and Adad-nirari III; the Nimrud
// slab and the Iran stele of Tiglath-Pileser III for Zabibe and Samsi and for
// the nineteen districts of Hamath; the Samaria ivories; the Khorsabad annals
// of Sargon II for Gath; Josephus' citation of Menander of Ephesus for the
// Tyrian king-list.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_931bce_neighbours] ' + key, e || '');
}

function guard(key, fn) {
  return function (ctx) {
    try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); }
  };
}

// The court a card is currently being answered by (SPEC §216). This chapter
// seats two crowns, so a card addressed to one of them fires in the other's
// campaign as well — silently, on its recorded course — and an effect body
// that reached for `playerTag` would hang Judah's modifier on Israel's
// ledger. The binding at the foot of this file sets this for the length of
// one answer; everywhere else it is null and `P` means what it always meant.
let AUDIENCE = null;

function bindAudience(tag, fn) {
  return function (ctx) {
    const prev = AUDIENCE;
    AUDIENCE = tag;
    try { fn(ctx); } finally { AUDIENCE = prev; }
  };
}

function P(ctx) {
  const t = AUDIENCE && ctx.game.tags && ctx.game.tags[AUDIENCE];
  return (t && t.alive !== false) ? AUDIENCE : ctx.game.playerTag;
}

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

// A dated card of the near world, with two answers and the recorded one first.
function N(id, title, y, m, forTag, desc, historical, a, b) {
  return {
    id, title, desc, historical, forTag, date: { y, m }, aiOption: 0,
    options: [
      { label: a.label, tooltip: a.tooltip, effects: guard(id + ':0', a.fx) },
      { label: b.label, tooltip: b.tooltip, effects: guard(id + ':1', b.fx) },
    ],
  };
}

export const EVENTS_931_NEIGHBOURS = [

  N('ev931n_the_copper_road', 'The Copper Road', -929, 4, 'JDH',
    'The smelting camps in the Arabah are working again — slag heaps, charcoal from the '
    + 'wadis, donkey trains going north with ingots — and the men who run them are Edomite, '
    + 'not ours. The crown\'s claim on that country is a generation old and consists of a '
    + 'garrison list nobody has refreshed since the division.\n\nThe treasurer wants a '
    + 'toll-house on the road. The general wants the camps themselves. The quartermaster '
    + 'points out mildly that the second one means feeding a garrison eight days\' march '
    + 'from the nearest well we control, in a country whose wells belong to other people.',
    'Copper smelting at Khirbat en-Nahas and Timna peaks in the tenth and ninth centuries; Edom is intermittently under Judahite control from Solomon to Jehoram.',
    { label: 'A toll-house, and leave the smelting to them', tooltip: '+120 talents and "The Copper Toll" (+8% trade, +5% income) for forty years; Edom\'s regard improves by 15.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 120, infl: 15 });
        mod(ctx, 'n931_copper_toll', 'The Copper Toll', { tradeMult: 1.08, incomeMult: 1.05 }, 480);
        opinion(ctx, 'EDM', me, 15);
        h.chronicle(ctx, 'era', 'A toll-house goes up where the Arabah road meets the ridge. The Edomites keep the furnaces and the crown keeps a tenth of everything that passes.'); } },
    { label: 'Garrison the camps', tooltip: '−160 talents, −2,000 manpower, +20 martial points and "The Arabah Garrison" (+10% production, +1 fort defence) for thirty years, at Edom\'s regard −35.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -160, manpower: -2000, mar: 20 });
        mod(ctx, 'n931_arabah_garrison', 'The Arabah Garrison', { prodMult: 1.1, fortDefBonus: 1 }, 360);
        opinion(ctx, 'EDM', me, -35);
        h.chronicle(ctx, 'era', 'The smelting camps are taken under guard. Every ingot is now the crown\'s, and so is every mouth in the Arabah.'); } }),

  N('ev931n_the_incense_caravan', 'The Caravan Out of the South', -927, 9, 'player',
    'Sixty camels have come up the desert road from the incense country with frankincense, '
    + 'myrrh and gold, and their owners want a written safe-conduct for the whole route to '
    + 'the coast — one price, one seal, no renegotiation at every ridge.\n\nThe caravan '
    + 'masters are Qedarite; the goods are Sabaean; the buyers are Phoenician; and every '
    + 'one of them would rather pay one court than nine sheikhs. What is being offered is '
    + 'not a toll. It is the chance to be the court that guarantees the road.',
    'South Arabian incense reached the Mediterranean overland through the Hejaz and the Negev from at least the tenth century; Qedarite and Sabaean names appear together on the route.',
    { label: 'Seal the safe-conduct', tooltip: '+90 talents, +25 influence points and "The Incense Road" (+10% trade, +6% income) for fifty years; Qedar to +25 regard and Saba to +20.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 90, infl: 25 });
        mod(ctx, 'n931_incense_road', 'The Incense Road', { tradeMult: 1.1, incomeMult: 1.06 }, 600);
        opinion(ctx, 'QDR', me, 25); opinion(ctx, 'SAB', me, 20);
        h.chronicle(ctx, 'era', 'One seal now covers the whole road from the wells of the south to the sea, and the sheikhs who used to charge at every ridge are paid a share out of the middle.'); } },
    { label: 'Tax every stage, as everybody else does', tooltip: '+200 talents now, +15 governance points and "The Stage Tolls" (+10% income, −4% trade) for twenty-five years. The caravans start looking for a road that is not ours.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 200, gov: 15 });
        mod(ctx, 'n931_stage_tolls', 'The Stage Tolls', { incomeMult: 1.1, tradeMult: 0.96 }, 300);
        opinion(ctx, 'QDR', me, -20);
        h.chronicle(ctx, 'era', 'The caravan pays at every stage and says so loudly at the far end. Within a season there is talk of a route that goes around us.'); } }),

  N('ev931n_the_toll_at_gaza', 'What Gaza Keeps', -922, 5, 'player',
    'Everything this country sells abroad goes down to the plain and along the coast road, '
    + 'and the coast road is Philistine for its whole length. Gaza takes a cut of the '
    + 'caravans, Ashdod takes a cut of the grain, and Ashkelon takes a cut of both and sells '
    + 'the accounting.\n\nThe five cities are not a kingdom and have never once agreed on '
    + 'anything, which is the whole opportunity. Play them against each other and the toll '
    + 'comes down. Squeeze all five at once and they will remember, for the first time in a '
    + 'century, that they have something in common.',
    'The Philistine pentapolis operated as separate city-states; Amos 1:6-8 treats Gaza, Ashdod, Ashkelon and Ekron as distinct powers on the caravan trade.',
    { label: 'Buy one city and undercut the rest', tooltip: '−110 talents and "The Ashdod Understanding" (+9% trade, +4% income) for forty years; Philistia\'s regard improves by 20.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -110, infl: 20 });
        mod(ctx, 'n931_ashdod_understanding', 'The Ashdod Understanding', { tradeMult: 1.09, incomeMult: 1.04 }, 480);
        opinion(ctx, 'PLS', me, 20);
        h.chronicle(ctx, 'era', 'One of the five cities is given a rate nobody else gets, and within two seasons the other four are quarrelling about it instead of about us.'); } },
    { label: 'Demand the same rate from all five', tooltip: '+40 martial points, +10 governance points and "The Coast Road Disputed" (+6% income, +0.6 unrest everywhere) for thirty years, at Philistia\'s regard −40.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { mar: 40, gov: 10 });
        mod(ctx, 'n931_coast_road_disputed', 'The Coast Road Disputed', { incomeMult: 1.06, unrestAll: 0.6 }, 360);
        opinion(ctx, 'PLS', me, -40);
        h.chronicle(ctx, 'era', 'The demand goes to all five cities in the same words, and for the first time in living memory the five cities answer in the same words.'); } }),

  N('ev931n_the_purple_order', 'An Order for Purple', -919, 3, 'JDH',
    'The dye-house at Tyre will take an order for temple hangings and royal cloth, in the '
    + 'true purple, at a price that makes the treasurer sit down. The dye is made from a sea '
    + 'snail; it takes about ten thousand of them to colour one garment; the vats stink so '
    + 'badly the works are downwind of the city by law. There is no substitute and everybody '
    + 'in this world knows it.\n\nThe alternative is the cheap kermes red out of the hills, '
    + 'which fades in four years and which every court that can afford purple can tell at '
    + 'twenty paces.',
    'Tyrian murex purple was the ancient Mediterranean\'s most expensive manufactured good; the dye-works at Tyre and Sidon are attested by their shell middens.',
    { label: 'Pay Tyre and dress the house properly', tooltip: '−190 talents, +20 legitimacy and "The True Purple" (+0.2 legitimacy a month, +5% trade) permanently; Tyre\'s regard improves by 25.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -190, legitimacy: 20 });
        mod(ctx, 'n931_true_purple', 'The True Purple', { legitimacyAdd: 0.2, tradeMult: 1.05 });
        opinion(ctx, 'TYR', me, 25);
        h.chronicle(ctx, 'era', 'The hangings come down the coast road in sealed chests and the court is dressed, for the first time since the division, in a colour no neighbour can match.'); } },
    { label: 'Use the hill dye and spend the silver on walls', tooltip: '+150 talents kept and "Red, Not Purple" (+1 fort defence, −5% cost of governing) permanently, at −10 legitimacy.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 150, legitimacy: -10, mar: 15 });
        mod(ctx, 'n931_red_not_purple', 'Red, Not Purple', { fortDefBonus: 1, adminMult: 0.95 });
        h.chronicle(ctx, 'era', 'The hangings are dyed with kermes from the hill oaks. They are the right colour for about four years, and the silver is in the walls for ever.'); } }),

  N('ev931n_the_fords_of_jabbok', 'The Fords of the Jabbok', -912, 6, 'ISL',
    'Ammon has put men on the fords and is charging our own herdsmen to cross into our own '
    + 'summer pasture. The legal position is that the Jabbok is the border and the pasture '
    + 'beyond it is ours by two centuries of use. The practical position is that Ammon is '
    + 'three days closer to the fords than we are.\n\nThe herdsmen want the crossings taken '
    + 'and held. The council points out that a garrison on the Jabbok is a garrison facing '
    + 'east, in a decade when everything dangerous comes from the north.',
    'The Jabbok is the traditional Israelite-Ammonite boundary (Numbers 21:24, Judges 11:13); control of the Gilead crossings is contested throughout the divided monarchy.',
    { label: 'Take the crossings', tooltip: '−2,500 manpower, +25 martial points and "The Fords Held" (+8% manpower, +1 fort defence) for thirty years, at Ammon\'s regard −40.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { manpower: -2500, mar: 25 });
        mod(ctx, 'n931_fords_held', 'The Fords Held', { manpowerMult: 1.08, fortDefBonus: 1 }, 360);
        opinion(ctx, 'AMO', me, -40);
        h.chronicle(ctx, 'era', 'The crossings are taken in one morning and held with two companies. The summer pasture is ours again and the eastern border now needs feeding.'); } },
    { label: 'Pay the crossing and keep the army north', tooltip: '−80 talents and "The Northern Watch" (+10% army strength, −0.4 unrest everywhere) for thirty years; Ammon\'s regard improves by 20.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -80, gov: 20 });
        mod(ctx, 'n931_northern_watch', 'The Northern Watch', { milPowerMult: 1.1, unrestAll: -0.4 }, 360);
        opinion(ctx, 'AMO', me, 20);
        h.chronicle(ctx, 'era', 'The herdsmen pay at the fords and grumble. The army stays where the danger is, which is not the Jabbok.'); } }),

  N('ev931n_a_wall_at_ataroth', 'A Wall at Ataroth', -907, 4, 'ISL',
    'The settlers on the Mishor — the tableland east of the Dead Sea, the best barley ground '
    + 'this crown has — want Ataroth walled. They have been there a generation, they pay '
    + 'their tithe, and they are surrounded by Moabites who were there a great deal longer '
    + 'and say so.\n\nWalling it makes the holding permanent and the quarrel permanent with '
    + 'it. Leaving it open keeps the barley coming and keeps the option of one day agreeing '
    + 'a line that both sides can live behind.',
    'The Mesha stele records that "the men of Gad had dwelt in the land of Ataroth from of old, and the king of Israel built Ataroth for himself" — and that Mesha took it back.',
    { label: 'Wall it', tooltip: '−140 talents, +20 martial points and "The Towns of the Mishor" (+10% production, +1 fort defence) for forty years, at Moab\'s regard −45.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -140, mar: 20 });
        mod(ctx, 'n931_towns_of_the_mishor', 'The Towns of the Mishor', { prodMult: 1.1, fortDefBonus: 1 }, 480);
        opinion(ctx, 'MOB', me, -45);
        h.chronicle(ctx, 'era', 'Ataroth is walled and provisioned, and a Moabite scribe begins keeping a list of the towns the king of Israel has built for himself.'); } },
    { label: 'Keep it open and keep the barley', tooltip: '+60 talents, +30 governance points and "The Open Plateau" (+8% growth, +5% income) for forty years; Moab\'s regard improves by 20.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 60, gov: 30 });
        mod(ctx, 'n931_open_plateau', 'The Open Plateau', { growthMult: 1.08, incomeMult: 1.05 }, 480);
        opinion(ctx, 'MOB', me, 20);
        h.chronicle(ctx, 'era', 'No wall goes up on the Mishor. The barley comes in, the tithe is paid, and nobody has to decide yet whose plateau it is.'); } }),

  N('ev931n_the_threshing_floors', 'Riders at the Threshing Floors', -901, 7, 'player',
    'Camel riders out of the eastern desert came through the southern villages at harvest, '
    + 'took what was on the floors and were gone before the levy could be raised. They will '
    + 'be back next year, at the same week, because the harvest is always at the same week '
    + 'and a camel crosses the dry country four times faster than a man on foot.\n\nThe only '
    + 'two answers anybody has ever found are a chain of watch-posts, which is expensive for '
    + 'ever, or a payment to the sheikh, which is cheap until the year he decides it is a '
    + 'tribute rather than a fee.',
    'Qedarite camel nomads dominate the northern Arabian steppe from the ninth century; the raiding cycle against settled harvests is the constant of the desert fringe.',
    { label: 'Build the watch-posts', tooltip: '−130 talents, +25 martial points and "The Watch-Posts" (+1 fort defence, −0.6 unrest everywhere, +6% manpower) permanently.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -130, mar: 25 });
        mod(ctx, 'n931_watch_posts', 'The Watch-Posts', { fortDefBonus: 1, unrestAll: -0.6, manpowerMult: 1.06 });
        h.chronicle(ctx, 'era', 'A line of watch-posts goes up along the desert fringe, each within signalling distance of the next, and the harvest week stops being a season of its own.'); } },
    { label: 'Pay the sheikh for the harvest week', tooltip: '−60 talents, +15 influence points and "An Arrangement With the Sheikhs" (+8% growth, −0.4 unrest everywhere) for thirty years; Qedar to +30 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -60, infl: 15 });
        mod(ctx, 'n931_arrangement_with_sheikhs', 'An Arrangement With the Sheikhs', { growthMult: 1.08, unrestAll: -0.4 }, 360);
        opinion(ctx, 'QDR', me, 30);
        h.chronicle(ctx, 'era', 'A payment goes east before every harvest. The floors are not touched, and nobody at court is willing to say out loud what the payment is called.'); } }),

  N('ev931n_hamath_writes', 'A Letter From Hamath', -896, 3, 'player',
    'Hamath on the Orontes has written to propose what it calls a league of the southern '
    + 'kings and what is in fact a subscription: men, silver and grain, against Damascus, '
    + 'which is squeezing Hamath from the south exactly as it squeezes us from the '
    + 'north.\n\nThe argument for is that Damascus beats each of us separately and beats '
    + 'none of us together. The argument against is that Hamath is a great deal further from '
    + 'Damascus than we are, and that a league is only ever as good as the member with the '
    + 'shortest border.',
    'Hamath appears repeatedly in coalition with the southern Levantine states against Damascus and later against Assyria; the Zakkur stele records one such siege.',
    { label: 'Subscribe to the league', tooltip: '−100 talents, +25 martial points and "The League of the Orontes" (+10% army strength, +5% morale) for thirty years; Hamath to +40 regard, Damascus to −35.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -100, mar: 25 });
        mod(ctx, 'n931_league_of_the_orontes', 'The League of the Orontes', { milPowerMult: 1.1, moraleMult: 1.05 }, 360);
        opinion(ctx, 'HMT', me, 40); opinion(ctx, 'DMS', me, -35);
        h.chronicle(ctx, 'era', 'The subscription is paid and the contingent marches north. Damascus now has two borders to watch and the same army it had before.'); } },
    { label: 'Answer courteously and stay out', tooltip: '+35 influence points, +15 governance points and "No Quarrel of Ours" (+8% income, −0.5 unrest everywhere) for thirty years; Damascus to +20 regard, Hamath to −25.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { infl: 35, gov: 15 });
        mod(ctx, 'n931_no_quarrel_of_ours', 'No Quarrel of Ours', { incomeMult: 1.08, unrestAll: -0.5 }, 360);
        opinion(ctx, 'HMT', me, -25); opinion(ctx, 'DMS', me, 20);
        h.chronicle(ctx, 'era', 'The letter is answered with every courtesy and no men. Hamath fights alone in the north and remembers who did not come.'); } }),

  N('ev931n_grain_for_timber', 'Grain for Timber', -891, 8, 'ISL',
    'Tyre is a city on an island with a strip of coast behind it and no grain land worth the '
    + 'name. We have grain and no cedar. The exchange has run since before either kingdom '
    + 'existed and it has never once been written down as a treaty, because neither side has '
    + 'wanted to fix the rate.\n\nThe Tyrians now want it fixed: a standing quantity, a '
    + 'standing price, renewed by the year. It would make the harbour predictable. It would '
    + 'also mean that in a famine year we are contracted to feed a foreign city before our '
    + 'own hill villages.',
    '1 Kings 5:11 records the standing grain-for-timber exchange between Israel and Tyre; Ezekiel 27:17 still lists Judah and Israel as Tyre\'s grain suppliers three centuries later.',
    { label: 'Fix the rate and take the harbour', tooltip: '+140 talents, +20 influence points and "The Tyrian Contract" (+10% trade, +6% income) for forty years; Tyre to +35 regard. In a bad year the contract still runs.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 140, infl: 20 });
        mod(ctx, 'n931_tyrian_contract', 'The Tyrian Contract', { tradeMult: 1.1, incomeMult: 1.06 }, 480);
        opinion(ctx, 'TYR', me, 35);
        h.chronicle(ctx, 'era', 'The exchange is written down at last, in two copies, with a quantity and a price and a date for renewal. The cedar comes ashore at Joppa on a schedule.'); } },
    { label: 'Keep it year by year', tooltip: '+25 governance points and "The Granary Kept Home" (−0.6 unrest everywhere, +6% growth) permanently. The rate moves against us in good years and with us in bad ones.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { gov: 25 });
        mod(ctx, 'n931_granary_kept_home', 'The Granary Kept Home', { unrestAll: -0.6, growthMult: 1.06 });
        h.chronicle(ctx, 'era', 'No contract is signed. The grain goes north when there is grain to spare, and the year the rains fail the hill villages eat first.'); } }),

  N('ev931n_the_salt_and_the_bitumen', 'Salt, and What Floats On It', -887, 5, 'JDH',
    'Slabs of bitumen have surfaced on the Dead Sea again — they do it after a tremor, float '
    + 'for a season and are cut up by men in reed boats — and Egypt pays extraordinarily '
    + 'well for them, because bitumen is what the embalmers use and Egypt has no lake of its '
    + 'own.\n\nThe salt pans on the same shore are worth less per load and worth more per '
    + 'year. The difficulty is that the eastern shore is Moabite, and the men in the boats '
    + 'do not stop to ask whose water they are on.',
    'Dead Sea bitumen was exported to Egypt for embalming from an early date (Diodorus XIX.98-99 describes Nabataean and neighbouring parties fighting over floating slabs).',
    { label: 'Work the bitumen and sell south', tooltip: '+170 talents, +10 influence points and "The Bitumen Trade" (+9% trade) for thirty years, at Moab\'s regard −30 and Egypt\'s +20.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 170, infl: 10 });
        mod(ctx, 'n931_bitumen_trade', 'The Bitumen Trade', { tradeMult: 1.09 }, 360);
        opinion(ctx, 'MOB', me, -30); opinion(ctx, 'MIZ', me, 20);
        h.chronicle(ctx, 'era', 'Reed boats go out from the western shore with cutting tools, and the slabs go down to the Delta by the coast road. Moab sends a complaint and then sends boats.'); } },
    { label: 'Take the salt pans and leave the lake alone', tooltip: '−70 talents, +20 governance points and "The Salt Pans" (+8% production, +5% income) permanently; Moab\'s regard improves by 15.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -70, gov: 20 });
        mod(ctx, 'n931_salt_pans', 'The Salt Pans', { prodMult: 1.08, incomeMult: 1.05 });
        opinion(ctx, 'MOB', me, 15);
        h.chronicle(ctx, 'era', 'The pans on the western shore are walled and worked by gangs from Engedi. The bitumen is left to whoever wants to fight for it.'); } }),

  N('ev931n_the_kings_highway', 'The Highway of the Kings', -881, 4, 'ISL',
    'The road that runs the length of the plateau from the gulf to Damascus carries every '
    + 'caravan that does not want to risk the coast, and it passes through Edom, Moab, Ammon '
    + 'and our own Gilead in that order. Four courts, four tolls, and a merchant who pays '
    + 'all four arrives having spent more on permission than on camels.\n\nThere is a '
    + 'proposal to call the other three to a meeting and agree one rate. There is a rival '
    + 'proposal to undercut all three and take the traffic.',
    'The King\'s Highway (Numbers 20:17) is the trunk route of Transjordan; control of its segments is the recurring cause of Israelite, Moabite, Ammonite and Edomite conflict.',
    { label: 'Call the meeting and agree one rate', tooltip: '−50 talents, +30 influence points and "The Agreed Rate" (+9% trade, −0.4 unrest everywhere) for forty years; Moab, Ammon and Edom each to +20 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -50, infl: 30 });
        mod(ctx, 'n931_agreed_rate', 'The Agreed Rate', { tradeMult: 1.09, unrestAll: -0.4 }, 480);
        opinion(ctx, 'MOB', me, 20); opinion(ctx, 'AMO', me, 20); opinion(ctx, 'EDM', me, 20);
        h.chronicle(ctx, 'era', 'Four courts agree one rate for the length of the plateau, which lasts as long as all four are afraid of the same thing.'); } },
    { label: 'Undercut them and take the traffic', tooltip: '+180 talents, −15 governance points and "The Cheap Stage" (+12% trade, −5% income) for twenty-five years, at Moab, Ammon and Edom each −25 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 180, gov: -15 });
        mod(ctx, 'n931_cheap_stage', 'The Cheap Stage', { tradeMult: 1.12, incomeMult: 0.95 }, 300);
        opinion(ctx, 'MOB', me, -25); opinion(ctx, 'AMO', me, -25); opinion(ctx, 'EDM', me, -25);
        h.chronicle(ctx, 'era', 'Our stage of the highway is suddenly the cheapest on the plateau. The caravans come, and three neighbouring courts start pricing the alternative.'); } }),

  N('ev931n_a_deputy_in_edom', 'A Deputy, Not a King', -876, 6, 'JDH',
    'There is no king in Edom. There is a deputy, appointed from here, and the arrangement '
    + 'has lasted because it costs Edom nothing in pride — the Edomite houses run Edom and '
    + 'the deputy signs what they have already decided — and costs us nothing in '
    + 'garrisons.\n\nThe deputy has died. The houses have proposed a successor of their own '
    + 'choosing and asked us to confirm him. The chancery is divided between confirming him '
    + 'and sending somebody who can actually be recalled.',
    '1 Kings 22:47: "There was then no king in Edom: a deputy was king." Judahite suzerainty over Edom lapses under Jehoram a generation later.',
    { label: 'Confirm their man', tooltip: '+30 influence points, +15 governance points and "The Deputy Confirmed" (+7% income, −0.5 unrest everywhere) for thirty years; Edom to +35 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { infl: 30, gov: 15 });
        mod(ctx, 'n931_deputy_confirmed', 'The Deputy Confirmed', { incomeMult: 1.07, unrestAll: -0.5 }, 360);
        opinion(ctx, 'EDM', me, 35);
        h.chronicle(ctx, 'era', 'The houses of Edom choose and the crown confirms, which is what has happened every time and what everybody prefers not to say.'); } },
    { label: 'Send our own', tooltip: '−90 talents, +25 governance points and "A Deputy We Can Recall" (+10% income, +0.7 unrest everywhere) for twenty-five years, at Edom\'s regard −40.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -90, gov: 25 });
        mod(ctx, 'n931_deputy_recallable', 'A Deputy We Can Recall', { incomeMult: 1.1, unrestAll: 0.7 }, 300);
        opinion(ctx, 'EDM', me, -40);
        h.chronicle(ctx, 'era', 'A man from the capital goes south with a seal and an escort. The Edomite houses receive him correctly and stop telling him things.'); } }),

  N('ev931n_the_gate_of_gath', 'The Gate of Gath', -872, 9, 'JDH',
    'Gath is the largest city in this part of the world — bigger than the capital, with a '
    + 'circuit wall that takes half an hour to walk — and it sits exactly where the hill '
    + 'country drains into the plain. Every olive press in the Shephelah sells through it. '
    + 'Its gate is currently closed to our merchants over a quarrel about weights.\n\nThe '
    + 'quarrel is genuinely about weights. It is also the third such quarrel in ten years, '
    + 'and the council suspects that Gath has worked out that it can test us cheaply and '
    + 'often.',
    'Tell es-Safi/Gath was the largest site in the southern Levant in the tenth-ninth centuries, with a monumental siege system from Hazael\'s destruction around 830.',
    { label: 'Send a weights commission and settle it', tooltip: '−60 talents, +35 governance points and "One Weight, One Measure" (+8% trade, +5% income) permanently; Philistia to +25 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -60, gov: 35 });
        mod(ctx, 'n931_one_weight', 'One Weight, One Measure', { tradeMult: 1.08, incomeMult: 1.05 });
        opinion(ctx, 'PLS', me, 25);
        h.chronicle(ctx, 'era', 'A commission sits at Gath for a season with a set of standard stones, and the presses of the Shephelah go back to work under a rule both sides signed.'); } },
    { label: 'Close the presses to Gath instead', tooltip: '+30 martial points, +10 governance points and "The Presses Withheld" (+9% production, −6% trade) for twenty-five years, at Philistia\'s regard −35.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { mar: 30, gov: 10 });
        mod(ctx, 'n931_presses_withheld', 'The Presses Withheld', { prodMult: 1.09, tradeMult: 0.94 }, 300);
        opinion(ctx, 'PLS', me, -35);
        h.chronicle(ctx, 'era', 'The oil stays in the hills and is sold north instead. Gath\'s gate opens again within the year, and nobody mentions weights.'); } }),

  N('ev931n_the_ivory_workers', 'The Ivory Workers', -866, 5, 'ISL',
    'A workshop of Phoenician ivory-carvers wants a royal commission and a street to work '
    + 'in: panels for furniture, in the Egyptianising style the whole coast buys — lotus, '
    + 'winged sphinxes, a woman at a window — cut from tusks that come up from Kush through '
    + 'the Delta.\n\nIt is the most conspicuous luxury available in this world, it employs '
    + 'about forty foreign craftsmen permanently, and there is a prophet in the market '
    + 'costing it out loud in front of anybody who will listen.',
    'The Samaria ivories are the largest such hoard from the Levant; Amos 3:15 and 6:4 denounce "houses of ivory" and "beds of ivory" as the emblem of the northern court.',
    { label: 'Give them the street and the commission', tooltip: '−150 talents, +20 legitimacy and "The Ivory House" (+0.2 legitimacy a month, +7% trade, +0.5 unrest everywhere) permanently; Tyre to +25 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -150, legitimacy: 20 });
        mod(ctx, 'n931_ivory_house', 'The Ivory House', { legitimacyAdd: 0.2, tradeMult: 1.07, unrestAll: 0.5 });
        opinion(ctx, 'TYR', me, 25);
        h.chronicle(ctx, 'era', 'A street of ivory-workers opens below the palace, and the panels go onto the furniture of everybody at court who can afford them, which is noticed.'); } },
    { label: 'Buy the tusks and sell them on', tooltip: '+160 talents, +20 governance points and "The Tusk Trade" (+8% income, −0.4 unrest everywhere) for thirty years. Nothing is carved here and nothing is preached about.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 160, gov: 20 });
        mod(ctx, 'n931_tusk_trade', 'The Tusk Trade', { incomeMult: 1.08, unrestAll: -0.4 }, 360);
        opinion(ctx, 'KSH', me, 15);
        h.chronicle(ctx, 'era', 'The tusks are bought at the Delta and sold at Tyre without being unloaded here. The carvers go to the coast, and the prophet finds another subject.'); } }),

  N('ev931n_tyre_is_asked_first', 'Tyre Is Asked First', -859, 7, 'player',
    'The Assyrian tribute list for the coast has been read out and Tyre is at the head of '
    + 'it, with Sidon and Byblos after, and every one of them has paid without a siege, '
    + 'without a battle and apparently without much argument. The Phoenician position is '
    + 'that a city which lives by the sea pays whoever is on the land and goes on '
    + 'trading.\n\nOur position has not been settled. There is a party at court that calls '
    + 'the Tyrian answer cowardice and a party that calls it the only intelligent policy any '
    + 'small state on this coast has ever had.',
    'Shalmaneser III records tribute from Tyre, Sidon and Byblos in his first campaigns; the Phoenician cities pay Assyria throughout the ninth century without being besieged.',
    { label: 'Learn from Tyre — keep the trade, pay the price', tooltip: '−120 talents, +25 influence points and "The Phoenician Answer" (+9% trade, +6% income, −5% morale) for forty years; Tyre to +30 regard and Assyria to +15.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -120, infl: 25 });
        mod(ctx, 'n931_phoenician_answer', 'The Phoenician Answer', { tradeMult: 1.09, incomeMult: 1.06, moraleMult: 0.95 }, 480);
        opinion(ctx, 'TYR', me, 30); opinion(ctx, 'ASR', me, 15);
        h.chronicle(ctx, 'era', 'The court decides, without ever putting it in those words, that it would rather be rich and second than poor and proud.'); } },
    { label: 'Say plainly that we are not a trading city', tooltip: '+25 legitimacy, +35 martial points and "We Are Not a Harbour" (+10% morale, +6% manpower, −6% trade) for forty years, at Assyria\'s regard −25.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { legitimacy: 25, mar: 35 });
        mod(ctx, 'n931_not_a_harbour', 'We Are Not a Harbour', { moraleMult: 1.1, manpowerMult: 1.06, tradeMult: 0.94 }, 480);
        opinion(ctx, 'ASR', me, -25);
        h.chronicle(ctx, 'era', 'The court answers that a kingdom in the hills is not an island with a harbour and cannot buy its way out of anything. The hill country agrees loudly.'); } }),

  N('ev931n_hazael_takes_gilead', 'Everything East of the Jordan', -832, 6, 'ISL',
    'The Aramean has come down the plateau and taken it all — Gilead, the Mishor, the towns '
    + 'from the Arnon northward, every place this crown has held east of the river since '
    + 'before the division. The garrisons that were not overrun walked out. The settlers are '
    + 'coming west across the fords in carts.\n\nThe army cannot retake it this year and '
    + 'everybody in the room knows it. The question is what to do with several thousand '
    + 'families who have arrived in the hill country with nothing, in the middle of harvest, '
    + 'and no land to put them on.',
    '2 Kings 10:32-33: Hazael smote Israel in all their coasts, from Jordan eastward, all the land of Gilead, from Aroer by the river Arnon.',
    { label: 'Settle them in the hill country', tooltip: '−170 talents, +3,000 manpower and "The People From Over the River" (+10% manpower, +6% growth, +0.6 unrest everywhere) for thirty years.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -170, manpower: 3000, legitimacy: -10 });
        mod(ctx, 'n931_people_from_over_the_river', 'The People From Over the River', { manpowerMult: 1.1, growthMult: 1.06, unrestAll: 0.6 }, 360);
        opinion(ctx, 'DMS', me, -50);
        h.chronicle(ctx, 'era', 'The families out of Gilead are given ground in the western hills and the villages that already farm it are told to make room. Both halves of that sentence are resented.'); } },
    { label: 'Hold them at the fords and negotiate their return', tooltip: '−40 talents, +20 influence points, −18 legitimacy and "The Fords Full of Carts" (+8% income, +1 fort defence, −8% morale) for twenty-five years; Damascus to +15 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -40, infl: 20, legitimacy: -18 });
        mod(ctx, 'n931_fords_full_of_carts', 'The Fords Full of Carts', { incomeMult: 1.08, fortDefBonus: 1, moraleMult: 0.92 }, 300);
        opinion(ctx, 'DMS', me, 15);
        h.chronicle(ctx, 'era', 'The crown opens a negotiation for the return of the eastern settlers under Aramean rule, and the carts sit at the fords through the whole of it.'); } }),

  N('ev931n_the_men_of_dibon_return', 'The Men of Dibon Come Back', -827, 4, 'ISL',
    'With the plateau gone and the Aramean holding the north, Moab has walked back onto the '
    + 'Mishor without fighting anybody for it. Their king is rebuilding Ataroth and Aroer, '
    + 'cutting a reservoir at Dibon, and — the detail the chancery finds hardest — writing '
    + 'the whole thing up on a stone, in the first person, naming this crown by name.\n\nA '
    + 'punitive raid is possible. It would be a raid, not a reconquest, and the stone would '
    + 'simply gain a paragraph.',
    'The Mesha stele (c. 840-820) records Moab\'s recovery of the Mishor, the rebuilding of Ataroth, Aroer and Qarhoh, and the claim that "Israel hath perished for ever".',
    { label: 'Leave it, and keep the army for the Aramean', tooltip: '+40 governance points and "One Enemy at a Time" (+10% army strength, −0.5 unrest everywhere) for thirty years, at −12 legitimacy.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { gov: 40, legitimacy: -12 });
        mod(ctx, 'n931_one_enemy_at_a_time', 'One Enemy at a Time', { milPowerMult: 1.1, unrestAll: -0.5 }, 360);
        h.chronicle(ctx, 'era', 'Nothing is sent across the Jordan. The stone at Dibon is finished, set up, and read to visitors for the next two thousand eight hundred years.'); } },
    { label: 'Raid the plateau for what can be carried', tooltip: '+130 talents, −1,800 manpower and "The Plateau Raid" (+8% morale) for fifteen years, at Moab\'s regard −45.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 130, manpower: -1800, legitimacy: 8 });
        mod(ctx, 'n931_plateau_raid', 'The Plateau Raid', { moraleMult: 1.08 }, 180);
        opinion(ctx, 'MOB', me, -45);
        h.chronicle(ctx, 'era', 'A column crosses at the Arnon, burns what it cannot carry and is home in six weeks. The stone at Dibon gains a paragraph about it.'); } }),

  N('ev931n_the_sheikhs_of_the_dry_country', 'The Sheikhs of the Dry Country', -822, 3, 'JDH',
    'The Negev is not held by anybody. It is crossed — by Edomite herders from the east, by '
    + 'Qedarite caravans from the south, by our own fortress garrisons at the wells — and '
    + 'whoever is friendly with the men who know where the water is controls it in the only '
    + 'sense that matters.\n\nThe commander at Arad proposes buying that friendship: grain '
    + 'to the sheikhs in a dry year, in exchange for warning and guides. The chancery '
    + 'proposes instead that the fortresses be doubled and the desert treated as a frontier '
    + 'rather than a neighbourhood.',
    'The Negev fortress line (Arad, Kadesh Barnea, Horvat Uza) is maintained by Judah through the ninth and eighth centuries; the Arad ostraca record rations issued to Kittim and to desert parties.',
    { label: 'Buy the guides', tooltip: '−80 talents, +20 influence points and "The Men Who Know the Wells" (+8% trade, −0.6 unrest everywhere, +5% manpower) permanently; Qedar to +30 regard and Edom to +15.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -80, infl: 20 });
        mod(ctx, 'n931_men_who_know_the_wells', 'The Men Who Know the Wells', { tradeMult: 1.08, unrestAll: -0.6, manpowerMult: 1.05 });
        opinion(ctx, 'QDR', me, 30); opinion(ctx, 'EDM', me, 15);
        h.chronicle(ctx, 'era', 'Grain goes south in the dry years and word comes north in all of them. The garrison at Arad stops being surprised.'); } },
    { label: 'Double the fortresses', tooltip: '−150 talents, +30 martial points and "The Negev Line" (+1 fort defence, +8% production, −5% trade) permanently.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -150, mar: 30 });
        mod(ctx, 'n931_negev_line', 'The Negev Line', { fortDefBonus: 1, prodMult: 1.08, tradeMult: 0.95 });
        h.chronicle(ctx, 'era', 'The wells are walled and garrisoned and the desert becomes a frontier with a line on it, which is a thing the desert has never agreed to be.'); } }),

  N('ev931n_the_port_at_the_gulf', 'The Port at the End of the Gulf', -812, 5, 'JDH',
    'Elath at the head of the gulf is a ruin with a good anchorage. Rebuilt, it puts this '
    + 'kingdom on a sea that reaches the incense coast and the gold country without paying '
    + 'one Philistine or one Phoenician a single shekel.\n\nIt also requires shipwrights we '
    + 'do not have, timber that must come down the whole length of the plateau, and a '
    + 'garrison at the far end of a road through Edom. The last crown that tried this had '
    + 'the ships broken in the harbour before they sailed.',
    '1 Kings 22:48: Jehoshaphat made ships of Tharshish to go to Ophir for gold, but they were broken at Ezion-geber. Elath is rebuilt by Azariah in 2 Kings 14:22.',
    { label: 'Rebuild the port', tooltip: '−210 talents and "The Gulf Anchorage" (+12% trade, +6% income) permanently; Saba to +25 regard, Edom to −20.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -210, infl: 20 });
        mod(ctx, 'n931_gulf_anchorage', 'The Gulf Anchorage', { tradeMult: 1.12, incomeMult: 1.06 });
        opinion(ctx, 'SAB', me, 25); opinion(ctx, 'EDM', me, -20);
        h.chronicle(ctx, 'era', 'Timber goes down the plateau by ox-cart for two years, and at the end of it there is a quay at the head of the gulf and a court that owns a sea.'); } },
    { label: 'Spend it on the Shephelah instead', tooltip: '−120 talents, +30 governance points and "The Low Country Improved" (+10% production, +8% growth) permanently — ground we already hold and can reach in a day.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -120, gov: 30 });
        mod(ctx, 'n931_low_country_improved', 'The Low Country Improved', { prodMult: 1.1, growthMult: 1.08 });
        h.chronicle(ctx, 'era', 'The silver goes into presses, cisterns and terrace walls in the Shephelah. Elath stays a ruin with a good anchorage.'); } }),

  N('ev931n_damascus_pays_the_assyrian', 'Damascus Pays', -806, 8, 'player',
    'The Assyrian has shut Damascus up in its own city, taken an indemnity that the scribes '
    + 'have written out to the last talent, and gone home. The Aramean power that has set '
    + 'the terms of everything in this country for eighty years is, this morning, a court '
    + 'paying somebody else.\n\nEvery small state from Hamath to the Philistine plain is '
    + 'making the same calculation at the same time: the pressure is off, and the question '
    + 'is whether to spend the relief on recovering what Damascus took or on being the first '
    + 'to be useful to the new power.',
    'Adad-nirari III besieged Damascus and took a large indemnity from Ben-hadad III around 796; the Rimah stele lists tribute from Israel and the coastal states in the same campaign.',
    { label: 'Recover what Damascus took', tooltip: '−2,200 manpower, +20 legitimacy, +30 martial points and "The Ground Recovered" (+10% manpower, +8% production) for thirty years, at Damascus\'s regard −45.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { manpower: -2200, legitimacy: 20, mar: 30 });
        mod(ctx, 'n931_ground_recovered', 'The Ground Recovered', { manpowerMult: 1.1, prodMult: 1.08 }, 360);
        opinion(ctx, 'DMS', me, -45);
        h.chronicle(ctx, 'era', 'The columns go out while Damascus is still counting its indemnity, and the border towns change hands in a single season.'); } },
    { label: 'Be first in the tribute line', tooltip: '−140 talents, +35 influence points and "First in the List" (+9% income, +5% trade, −5% morale) for forty years; Assyria to +30 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -140, infl: 35 });
        mod(ctx, 'n931_first_in_the_list', 'First in the List', { incomeMult: 1.09, tradeMult: 1.05, moraleMult: 0.95 }, 480);
        opinion(ctx, 'ASR', me, 30);
        h.chronicle(ctx, 'era', 'The gift goes north before it is asked for, which is the whole point, and the scribes at Kalhu enter this court near the top of a list it will be on for a century.'); } }),

  N('ev931n_ten_thousand_at_the_rock', 'Ten Thousand at the Rock', -794, 4, 'JDH',
    'The army has beaten the Edomites in the Valley of Salt and taken the rock fortress '
    + 'above it, and the report from the field includes a sentence the council has read '
    + 'three times: ten thousand prisoners were brought to the top of the rock and thrown '
    + 'down from it.\n\nThe general regards this as the point of the campaign — Edom will '
    + 'not rise again in this reign. The priests regard it as something that will be '
    + 'remembered against this house for as long as anybody keeps records, and they are, as '
    + 'it happens, the people who keep the records.',
    '2 Kings 14:7 and 2 Chronicles 25:11-12: Amaziah slew ten thousand of Edom in the Valley of Salt and cast ten thousand more from the top of the rock.',
    { label: 'Let the report stand', tooltip: '+25 martial points and "The Rock at Sela" (+10% morale, +1 fort defence, +0.8 unrest everywhere) for twenty-five years, at Edom\'s regard −60.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { mar: 25, legitimacy: 10 });
        mod(ctx, 'n931_rock_at_sela', 'The Rock at Sela', { moraleMult: 1.1, fortDefBonus: 1, unrestAll: 0.8 }, 300);
        opinion(ctx, 'EDM', me, -60);
        h.chronicle(ctx, 'era', 'The report is entered as written. Edom is quiet for a generation, and the sentence about the rock is copied by every scribe who handles the archive afterwards.'); } },
    { label: 'Ransom them back and take the tribute instead', tooltip: '+220 talents, +20 legitimacy and "Ransom, Not the Rock" (+0.2 legitimacy a month, +6% income) permanently; Edom to −15 regard rather than −60.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 220, legitimacy: 20 });
        mod(ctx, 'n931_ransom_not_the_rock', 'Ransom, Not the Rock', { legitimacyAdd: 0.2, incomeMult: 1.06 });
        opinion(ctx, 'EDM', me, -15);
        h.chronicle(ctx, 'era', 'The prisoners are ransomed by their own houses at a price set in the field, and Edom pays a yearly tribute rather than a debt of blood.'); } }),

  N('ev931n_the_grain_ships_at_ashdod', 'The Grain Ships at Ashdod', -787, 6, 'player',
    'Egyptian grain is coming ashore at Ashdod in quantity and being carried inland at a '
    + 'price our own growers cannot match in a good year and will not survive in a bad one. '
    + 'The Delta has the Nile and we have the rain, and this year the Nile won.\n\nThe '
    + 'growers want the coast road closed to foreign grain. The cities want it open, because '
    + 'cheap bread is the one thing that keeps a crowded quarter quiet. Both of them are '
    + 'right, which is the difficulty.',
    'Egyptian grain moved through the Philistine ports throughout the Iron Age; the price differential between irrigated Delta agriculture and Levantine dry farming is structural.',
    { label: 'Let the cheap grain in', tooltip: '+70 talents and "Cheap Bread" (−0.8 unrest everywhere, +8% growth, −6% production) for thirty years; Egypt to +20 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 70, gov: 20 });
        mod(ctx, 'n931_cheap_bread', 'Cheap Bread', { unrestAll: -0.8, growthMult: 1.08, prodMult: 0.94 }, 360);
        opinion(ctx, 'MIZ', me, 20);
        h.chronicle(ctx, 'era', 'The grain comes up from the coast and the towns eat cheaply. The hill farmers plant vines instead of barley, which turns out later to have been the right answer for the wrong reason.'); } },
    { label: 'Close the road to it', tooltip: '−50 talents and "The Growers Protected" (+10% production, +6% income, +0.7 unrest everywhere) for thirty years, at Egypt\'s regard −25 and Philistia\'s −20.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -50, gov: 25 });
        mod(ctx, 'n931_growers_protected', 'The Growers Protected', { prodMult: 1.1, incomeMult: 1.06, unrestAll: 0.7 }, 360);
        opinion(ctx, 'MIZ', me, -25); opinion(ctx, 'PLS', me, -20);
        h.chronicle(ctx, 'era', 'Foreign grain is stopped at the edge of the hill country. The barley price holds, the growers are pleased, and the bread price in the towns is a standing item at every council.'); } }),

  N('ev931n_the_wells_of_gerar', 'Wells in the Dry Country', -778, 3, 'JDH',
    'The engineer has a scheme for the south: cisterns cut in the chalk, towers over them, '
    + 'and herds moved out to graze ground that has carried nothing for two hundred years '
    + 'because nobody could water anything there. It would push the settled country a '
    + 'day\'s march further into the dry land in every direction.\n\nIt would also put our '
    + 'herds and our towers across the paths the Philistine and Arab herders have used since '
    + 'before there was a kingdom here, and the engineer has not costed that part.',
    '2 Chronicles 26:6-10: Uzziah broke down the wall of Gath, built cities about Ashdod, and "built towers in the desert, and digged many wells, for he had much cattle".',
    { label: 'Cut the cisterns and build the towers', tooltip: '−180 talents and "Towers in the Desert" (+10% growth, +8% production, +1 fort defence) permanently, at Philistia\'s regard −25 and Qedar\'s −20.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -180, gov: 25 });
        mod(ctx, 'n931_towers_in_the_desert', 'Towers in the Desert', { growthMult: 1.1, prodMult: 1.08, fortDefBonus: 1 });
        opinion(ctx, 'PLS', me, -25); opinion(ctx, 'QDR', me, -20);
        h.chronicle(ctx, 'era', 'Towers go up over new cisterns from the Shephelah to the edge of the wilderness, and the herds follow them out into ground nobody has grazed in living memory.'); } },
    { label: 'Cut the cisterns and share the water', tooltip: '−120 talents and "The Shared Wells" (+7% growth, +9% trade, −0.4 unrest everywhere) permanently; Qedar to +25 regard and Philistia to +15.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -120, infl: 25 });
        mod(ctx, 'n931_shared_wells', 'The Shared Wells', { growthMult: 1.07, tradeMult: 1.09, unrestAll: -0.4 });
        opinion(ctx, 'QDR', me, 25); opinion(ctx, 'PLS', me, 15);
        h.chronicle(ctx, 'era', 'The cisterns are cut and the old herding paths are written into the grant, water by water. The dry country gains a hundred wells and no new quarrel.'); } }),

  N('ev931n_the_ammonite_wheat', 'Wheat From Ammon', -772, 8, 'JDH',
    'Ammon has sent its tribute in kind — ten thousand measures of wheat, ten thousand of '
    + 'barley, and a hundred talents of silver — and has asked, through an intermediary, '
    + 'that the arrangement be put on a three-year footing so that its own villages can plan '
    + 'their sowing.\n\nA three-year assessment is a gift to a treasurer and a hostage to '
    + 'fortune: it is a promise not to raise the demand in the years when we could, and a '
    + 'promise Ammon will hold us to in the years when we need to.',
    '2 Chronicles 26:8 records that the Ammonites gave gifts to Uzziah; 27:5 gives the figures — a hundred talents of silver, ten thousand measures of wheat and ten thousand of barley, for three years.',
    { label: 'Fix it for three years', tooltip: '+190 talents, +25 governance points and "The Three-Year Assessment" (+8% income, −6% cost of governing) for thirty years; Ammon to +30 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 190, gov: 25 });
        mod(ctx, 'n931_three_year_assessment', 'The Three-Year Assessment', { incomeMult: 1.08, adminMult: 0.94 }, 360);
        opinion(ctx, 'AMO', me, 30);
        h.chronicle(ctx, 'era', 'The assessment is written for three years in two copies and the Ammonite villages sow to it. So, quietly, does our own treasury.'); } },
    { label: 'Keep it yearly and keep the leverage', tooltip: '+230 talents, +15 martial points and "Assessed Every Year" (+11% income, +0.5 unrest everywhere) for twenty-five years, at Ammon\'s regard −25.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 230, mar: 15 });
        mod(ctx, 'n931_assessed_every_year', 'Assessed Every Year', { incomeMult: 1.11, unrestAll: 0.5 }, 300);
        opinion(ctx, 'AMO', me, -25);
        h.chronicle(ctx, 'era', 'The demand is set again every spring, a little higher each time, and the Ammonite court begins keeping its own record of what it has paid.'); } }),

  N('ev931n_a_fleet_again_at_the_gulf', 'A Fleet Again at the Gulf', -766, 5, 'JDH',
    'The quay at the head of the gulf is finished and there are hulls on the slips. What '
    + 'there are not is sailors: nobody in this kingdom has put to sea in three generations, '
    + 'and the Red Sea is a bad place to learn, with reefs on both shores and a wind that '
    + 'runs one way for half the year.\n\nTyre will lend crews. Tyre will also, in the '
    + 'course of lending them, learn every anchorage, every well and every price on a route '
    + 'it does not currently have.',
    '2 Kings 14:22: "He built Elath, and restored it to Judah." Phoenician crews sailed Red Sea ventures for inland courts from Solomon\'s time to Necho\'s circumnavigation.',
    { label: 'Hire Tyrian crews', tooltip: '−130 talents, +20 influence points and "The Borrowed Sailors" (+12% trade, +7% income) for forty years; Tyre to +30 regard. They learn the route with us.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -130, infl: 20 });
        mod(ctx, 'n931_borrowed_sailors', 'The Borrowed Sailors', { tradeMult: 1.12, incomeMult: 1.07 }, 480);
        opinion(ctx, 'TYR', me, 30);
        h.chronicle(ctx, 'era', 'Tyrian masters take the hulls out of the gulf on the summer wind and bring them back on the winter one, with our men aboard writing everything down.'); } },
    { label: 'Train our own, slowly', tooltip: '−90 talents, +15 legitimacy and "Our Own Sailors" (+8% trade, +0.2 legitimacy a month) permanently. The first two seasons are a total loss.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -90, legitimacy: 15 });
        mod(ctx, 'n931_our_own_sailors', 'Our Own Sailors', { tradeMult: 1.08, legitimacyAdd: 0.2 });
        h.chronicle(ctx, 'era', 'Two seasons are spent on the reefs of the gulf learning what the Tyrians already knew. In the third the ships come home loaded and crewed by men from Hebron.'); } }),

  N('ev931n_the_queens_of_the_arabs', 'The Queens of the Arabs', -757, 9, 'player',
    'The Assyrian tribute lists from the desert name a queen. Not a queen consort and not a '
    + 'priestess — a ruling queen of the Arabs, with her own treasury, her own camels and '
    + 'her own answer to Nineveh. The chancery has checked, and there has been more than '
    + 'one.\n\nThe practical point is that the whole southern caravan trade can be settled '
    + 'with one negotiation instead of forty, if we are willing to negotiate with her at all. '
    + 'There is a party at court that regards the idea as beneath the crown and has said so '
    + 'in front of the envoys.',
    'Assyrian records of the eighth century name Zabibe and Samsi as queens of the Arabs paying tribute; Arabian queens appear in the royal annals from Tiglath-Pileser III onward.',
    { label: 'Treat with her directly', tooltip: '+40 influence points, +60 talents and "The Queen\'s Word" (+10% trade, +6% income, −0.4 unrest everywhere) for forty years; Qedar to +40 regard and Saba to +20.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { infl: 40, treasury: 60 });
        mod(ctx, 'n931_the_queens_word', 'The Queen\'s Word', { tradeMult: 1.1, incomeMult: 1.06, unrestAll: -0.4 }, 480);
        opinion(ctx, 'QDR', me, 40); opinion(ctx, 'SAB', me, 20);
        h.chronicle(ctx, 'era', 'The whole southern road is settled in one afternoon with one person, which is forty fewer afternoons than usual, and the court finds it has nothing further to object to.'); } },
    { label: 'Deal with the sheikhs under her instead', tooltip: '+120 talents, −10 governance points and "Forty Separate Bargains" (+6% trade, +8% income, +0.5 unrest everywhere) for twenty-five years, at Qedar\'s regard −30.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 120, gov: -10 });
        mod(ctx, 'n931_forty_bargains', 'Forty Separate Bargains', { tradeMult: 1.06, incomeMult: 1.08, unrestAll: 0.5 }, 300);
        opinion(ctx, 'QDR', me, -30);
        h.chronicle(ctx, 'era', 'The crown deals with every sheikh separately and pays for the privilege in time, in silver and in the one thing the desert notices, which is the insult.'); } }),

  N('ev931n_hamath_is_divided', 'Nineteen Districts', -743, 6, 'player',
    'Hamath, which has been a kingdom on the Orontes for as long as there has been anything '
    + 'to write about, has been taken apart. Not conquered and left standing — taken apart: '
    + 'nineteen districts, each with an Assyrian governor, each assessed separately, the '
    + 'population moved and replaced.\n\nThis is not the old arrangement where a king pays '
    + 'and keeps his throne. It is a new thing, and every court from the Orontes to the '
    + 'Negev has spent the month working out what it means for them. It means that paying is '
    + 'no longer necessarily enough.',
    'Tiglath-Pileser III annexed much of Hamath in 738 and organised it into Assyrian provinces with deportation and resettlement — the machinery later applied to Damascus, Samaria and the coast.',
    { label: 'Pay early, pay more, and keep the throne', tooltip: '−200 talents, +30 influence points and "Paid Before Asking" (+8% income, −0.6 unrest everywhere, −6% morale) for forty years; Assyria to +35 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -200, infl: 30 });
        mod(ctx, 'n931_paid_before_asking', 'Paid Before Asking', { incomeMult: 1.08, unrestAll: -0.6, moraleMult: 0.94 }, 480);
        opinion(ctx, 'ASR', me, 35);
        h.chronicle(ctx, 'era', 'The gift leaves before the demand arrives, with the assessment already worked out by our own scribes, which the Assyrian scribes find both irritating and convenient.'); } },
    { label: 'Wall the capital and stock it', tooltip: '−230 talents, +40 martial points and "The Capital Stocked" (+2 fort defence, +8% manpower, −5% trade) permanently.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -230, mar: 40 });
        mod(ctx, 'n931_capital_stocked', 'The Capital Stocked', { fortDefBonus: 2, manpowerMult: 1.08, tradeMult: 0.95 });
        h.chronicle(ctx, 'era', 'The walls are doubled at the weak quarter and the cisterns filled, on the reasoning that the only court on this coast that has never been taken apart is one that could not be taken.'); } }),

  N('ev931n_moab_and_ammon_send_first', 'They Sent Before We Did', -728, 4, 'player',
    'Moab, Ammon and Edom have all sent to Nineveh this season, separately, without '
    + 'consulting anybody and without waiting to be asked. Each of them has done exactly '
    + 'what the others did, for exactly the same reason, and each of them believes it has '
    + 'stolen a march.\n\nWhat it means for us is that the eastern and southern courts are '
    + 'now all inside the same arrangement and none of them will join anything against it. '
    + 'The league option, which has been the chancery\'s standing answer to every crisis for '
    + 'sixty years, is finished.',
    'The Nimrud tribute lists of Tiglath-Pileser III name Moab, Ammon, Edom, Ashkelon, Gaza, Judah and Israel together as tributaries — the Transjordanian states submitted early and were never annexed.',
    { label: 'Join the arrangement', tooltip: '−170 talents, +25 influence points and "Inside the Arrangement" (+9% income, +6% trade, −8% morale) for forty years; Assyria to +30 regard and Egypt to −20.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -170, infl: 25 });
        mod(ctx, 'n931_inside_the_arrangement', 'Inside the Arrangement', { incomeMult: 1.09, tradeMult: 1.06, moraleMult: 0.92 }, 480);
        opinion(ctx, 'ASR', me, 30); opinion(ctx, 'MIZ', me, -20);
        h.chronicle(ctx, 'era', 'The envoys go north with everybody else\'s, and the court discovers that being one of six tributaries is considerably safer than being the only one who is not.'); } },
    { label: 'Look south to Egypt instead', tooltip: '+30 legitimacy, +25 martial points and "The Southern Hope" (+10% morale, +7% manpower, +0.7 unrest everywhere) for thirty years; Egypt to +30 regard, Assyria to −35.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { legitimacy: 30, mar: 25 });
        mod(ctx, 'n931_southern_hope', 'The Southern Hope', { moraleMult: 1.1, manpowerMult: 1.07, unrestAll: 0.7 }, 360);
        opinion(ctx, 'MIZ', me, 30); opinion(ctx, 'ASR', me, -35);
        h.chronicle(ctx, 'era', 'Messengers go down to the Delta instead of up to the Tigris. Egypt is delighted, promises everything, and is four courts in a trench of reeds.'); } }),

  N('ev931n_gath_is_emptied', 'Gath Is Emptied', -718, 7, 'JDH',
    'Gath is gone. Not sacked and rebuilt — emptied: the population deported, the wall '
    + 'thrown down along its whole circuit, the site left for the grass. The largest city in '
    + 'the low country, the one that has set the price of our olive oil for two centuries, '
    + 'has been removed from the world as an administrative act.\n\nThe presses of the '
    + 'Shephelah have nowhere to sell. Ekron, twelve miles north and still standing, has '
    + 'sent to say it would be glad to take the whole trade, on terms.',
    'Sargon II records the capture of Gath; the site is effectively abandoned thereafter, and Ekron becomes the largest olive-oil production centre in the ancient Near East.',
    { label: 'Sell through Ekron on their terms', tooltip: '−40 talents, +15 influence points and "The Ekron Presses" (+10% trade, +6% income, −5% production) for forty years; Philistia to +25 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -40, infl: 15 });
        mod(ctx, 'n931_ekron_presses', 'The Ekron Presses', { tradeMult: 1.1, incomeMult: 1.06, prodMult: 0.95 }, 480);
        opinion(ctx, 'PLS', me, 25);
        h.chronicle(ctx, 'era', 'The oil of the Shephelah goes north to Ekron, is pressed there, and is sold to the empire under somebody else\'s seal at a price we no longer set.'); } },
    { label: 'Press it ourselves and sell north', tooltip: '−160 talents, +25 governance points and "Our Own Presses" (+12% production, +5% income, −6% trade) permanently.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -160, gov: 25 });
        mod(ctx, 'n931_our_own_presses', 'Our Own Presses', { prodMult: 1.12, incomeMult: 1.05, tradeMult: 0.94 });
        h.chronicle(ctx, 'era', 'Press installations go up in every low-country town that has a stone to spare. The oil is worse for two years and ours for ever.'); } }),

  N('ev931n_edom_sends_to_nineveh', 'Edom Sends to Nineveh', -715, 5, 'JDH',
    'Edom has sent its own tribute and its own envoys, in its own name, and has been '
    + 'received. Whatever this crown\'s claim on that country was — deputy, suzerainty, the '
    + 'copper road, the valley of salt — it has been settled by somebody else, in another '
    + 'country, without reference to us.\n\nThe chancery can protest, which will be noted '
    + 'and filed. Or it can stop paying for a claim that no longer buys anything and put the '
    + 'money into the one border that is still ours to hold.',
    'Edom, Moab and Ammon appear as independent Assyrian tributaries from Tiglath-Pileser III onward; Judah\'s intermittent overlordship of Edom does not survive the eighth century.',
    { label: 'Let the claim go', tooltip: '+45 governance points and "The Claim Released" (−8% cost of governing, +1 fort defence, +6% income) permanently, at −12 legitimacy.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { gov: 45, legitimacy: -12 });
        mod(ctx, 'n931_claim_released', 'The Claim Released', { adminMult: 0.92, fortDefBonus: 1, incomeMult: 1.06 });
        opinion(ctx, 'EDM', me, 20);
        h.chronicle(ctx, 'era', 'The southern claim is quietly dropped from the titles, the garrison money goes into the western wall, and no one outside the chancery notices for a decade.'); } },
    { label: 'Protest it at Nineveh', tooltip: '−110 talents, +20 legitimacy and "The Protest Filed" (+0.2 legitimacy a month, −5% income) for twenty-five years, at Edom\'s regard −30.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -110, legitimacy: 20 });
        mod(ctx, 'n931_protest_filed', 'The Protest Filed', { legitimacyAdd: 0.2, incomeMult: 0.95 }, 300);
        opinion(ctx, 'EDM', me, -30);
        h.chronicle(ctx, 'era', 'An embassy goes to Nineveh with the whole history of the claim written out. It is received, heard, filed, and has no effect of any kind.'); } }),
];

// --- SPEC §216: a card is answered by the court it is addressed to ---------
// One loop instead of a tag argument on every call site in the file. A card
// marked `player` is always the chair the player is sitting in and is left
// alone; a card marked ISL or JDH writes to that court whether or not the
// player is in it.
for (const _c of EVENTS_931_NEIGHBOURS) {
  if (!_c || (_c.forTag !== 'ISL' && _c.forTag !== 'JDH')) continue;
  for (const _o of _c.options || []) {
    if (typeof _o.effects !== 'function') continue;
    _o.effects = bindAudience(_c.forTag, _o.effects);
  }
}
