// Judaea Universalis — the years the chain skips: 920–763 BCE (SPEC §240,
// §268). Content package. Zero imports; every effect runs through ctx.helpers.
//
// The division is decided in six years and the chapter runs for two hundred
// and nine. Those two centuries are the ninth, which is the one century in
// which both Israelite kingdoms are real powers with real archives — and the
// §241 decade rule says every decade with room in it carries at least two
// dated cards. This file is that arithmetic answered on the ground the
// chapters are actually played on: the fortified towns, the treaty with
// Damascus, the contest on Carmel, a vineyard, four hundred prophets and one,
// the judges in the cities, the chest by the altar, the price Hazael was paid
// not to come up, the hired mercenaries sent home, the vintage receipts, the
// border restored from the entrance of Hamath to the sea, the earthquake,
// the shepherd at Bethel, and an eclipse that lets everybody afterwards date
// all of it to the year.
//
// Sources: 1 Kings 12-22 and 2 Kings 1-15; 2 Chronicles 11-26; Amos; Hosea;
// the Mesha stele; the Tel Dan stele; the Zakkur stele; the Rimah stele of
// Adad-nirari III; the Samaria ostraca; the Assyrian eponym canon and the
// Bur-Sagale eclipse of 15 June 763.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_931bce_years] ' + key, e || '');
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

function opinion(ctx, from, of, delta) {
  try {
    const t = ctx.game.tags && ctx.game.tags[from];
    if (!t) return;
    if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
    t.opinion[of] = Math.max(-200, Math.min(200, (t.opinion[of] || 0) + delta));
  } catch (e) { warnOnce('opinion', e); }
}

// A dated card of the years, with two answers and the recorded one first.
function Y(id, title, y, m, forTag, desc, historical, a, b) {
  return {
    id, title, desc, historical, forTag, date: { y, m }, aiOption: 0,
    options: [
      { label: a.label, tooltip: a.tooltip, effects: guard(id + ':0', a.fx) },
      { label: b.label, tooltip: b.tooltip, effects: guard(id + ':1', b.fx) },
    ],
  };
}

export const EVENTS_931_YEARS = [

  Y('ev931y_the_fifteen_towns', 'Fifteen Fortified Towns', -916, 4, 'JDH',
    'The survey is finished and the recommendation is a ring: Bethlehem, Etam, Tekoa, '
    + 'Beth-zur, Socoh, Adullam, Gath, Mareshah, Ziph, Adoraim, Lachish, Azekah, Zorah, '
    + 'Aijalon and Hebron — every one of them south or west of the capital, and not one of '
    + 'them facing the border with Israel.\n\nThe engineer is explaining why: an army from '
    + 'the north has to come along a ridge this kingdom already holds, and an army from '
    + 'Egypt comes along a coast it does not.',
    '2 Chronicles 11:5-12 gives the list of Rehoboam\'s fortified cities; every one of them covers the southern and western approaches.',
    { label: 'Build the ring', tooltip: '−180 talents and "The Fortified Towns of Judah" (+1 fort defence, +1 hill defence) permanently.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -180, mar: 30 });
        mod(ctx, 'y931_fortified_towns', 'The Fortified Towns of Judah', { fortDefBonus: 1, hillDefBonus: 1 });
        h.chronicle(ctx, 'era', 'Fifteen towns are walled and provisioned, every one of them facing south and west.'); } },
    { label: 'Wall the border with Israel instead', tooltip: '−140 talents and "The Northern Line" (+8% manpower, −0.4 unrest everywhere) for forty years — the quarrel the court can actually see, rather than the invasion it cannot.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -140, mar: 20 });
        mod(ctx, 'y931_northern_line', 'The Northern Line', { manpowerMult: 1.08, unrestAll: -0.4 }, 480);
        h.chronicle(ctx, 'era', 'The works go up along the Benjamin border and the southern approaches stay as they are.'); } }),

  Y('ev931y_the_treaty_with_damascus', 'Silver to Damascus', -908, 3, 'JDH',
    'Israel is fortifying Ramah — five miles north of the capital, astride the road — and '
    + 'the treasurer has a proposal that nobody is proud of: take the silver and gold left '
    + 'in the house and in the palace, send it to the king of Aram, and ask him to break '
    + 'his league with Israel.\n\nIt will work. It will also teach Damascus precisely what '
    + 'this country will pay, and Damascus will spend the next century collecting.',
    '1 Kings 15:18-22: Asa sent the treasure to Ben-hadad, who broke his league with Baasha; Ramah was dismantled and its stones used to build Geba and Mizpah.',
    { label: 'Send the silver', tooltip: '−220 talents, Aram to +50 regard, Israel to −40, and "The Stones of Ramah" (+1 fort defence, −0.5 unrest everywhere) permanently.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -220, infl: 20 });
        mod(ctx, 'y931_stones_of_ramah', 'The Stones of Ramah', { fortDefBonus: 1, unrestAll: -0.5 });
        opinion(ctx, 'DMS', 'JDH', 50); opinion(ctx, 'ISL', 'JDH', -40);
        h.chronicle(ctx, 'era', 'The treasure goes to Damascus and the Arameans come down on Israel\'s northern towns. Ramah is dismantled and its stones carried to Geba and Mizpah.'); } },
    { label: 'Fight for the road ourselves', tooltip: '−4,000 manpower and "The Road Held" (+10% morale, +6% manpower) for twenty-five years. Damascus learns nothing about our purse.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { manpower: -4000, mar: 35, legitimacy: 10 });
        mod(ctx, 'y931_road_held', 'The Road Held', { moraleMult: 1.1, manpowerMult: 1.06 }, 300);
        h.chronicle(ctx, 'era', 'The road north is fought for rather than bought. Damascus is not written to.'); } }),

  Y('ev931y_ramah_dismantled', 'The Stones Go South', -903, 6, 'ISL',
    'The works at Ramah have been abandoned mid-course and the southern kingdom is carrying '
    + 'the dressed stone away by cart to build two forts of its own. It is a small '
    + 'humiliation and an expensive one: two years of corvée, a quarry season and the '
    + 'strategic position that was the point of the whole exercise.\n\nThe question is '
    + 'whether to go back for it, with Damascus in the field on the northern border.',
    '1 Kings 15:21-22. Baasha left off building Ramah and dwelt in Tirzah; Asa carried away the stones and the timber.',
    { label: 'Let it go and hold the north', tooltip: '+40 governance points and "Two Borders, One Army" (+1 fort defence, −0.5 unrest everywhere) for thirty years.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { gov: 40 });
        mod(ctx, 'y931_two_borders', 'Two Borders, One Army', { fortDefBonus: 1, unrestAll: -0.5 }, 360);
        h.chronicle(ctx, 'era', 'The works at Ramah are abandoned and the army goes north to meet the Arameans.'); } },
    { label: 'Go back for the road', tooltip: '−3,000 manpower and "The Road Contested" (+10% army strength) for twenty years, at Judah −40 regard and the northern border stripped.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { manpower: -3000, mar: 30 });
        mod(ctx, 'y931_road_contested', 'The Road Contested', { milPowerMult: 1.1 }, 240);
        opinion(ctx, 'JDH', 'ISL', -40);
        h.chronicle(ctx, 'era', 'The army goes south again for the ridge at Ramah, and the Aramean raids in the north go unanswered for a season.'); } }),

  Y('ev931y_zerah_at_mareshah', 'The Host at Mareshah', -898, 5, 'JDH',
    'A very large force has come up the coast road out of Egypt with chariots and Libyan '
    + 'and Cushite troops and is drawn up in the valley of Zephathah at Mareshah, which is '
    + 'exactly where the fortified ring was built to put an invader.\n\nThe king has come '
    + 'down to meet it rather than wait behind walls, which the council thinks is either '
    + 'faith or vanity and cannot agree which.',
    '2 Chronicles 14:9-15: Zerah the Ethiopian with a host of a thousand thousand — the numbers are the chronicler\'s — was met at Mareshah and broken.',
    { label: 'Meet them in the valley', tooltip: '−3,000 manpower, +25 legitimacy and "The Valley of Zephathah" (+10% morale, +200 talents of spoil) for twenty-five years.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { manpower: -3000, legitimacy: 25, treasury: 200 });
        mod(ctx, 'y931_zephathah', 'The Valley of Zephathah', { moraleMult: 1.1 }, 300);
        h.chronicle(ctx, 'era', 'The host is broken at Mareshah and pursued to Gerar, and the camps of cattle are carried off.'); } },
    { label: 'Hold the towns and let them pass', tooltip: '+4,000 manpower kept and "The Ring Holds" (+1 fort defence) permanently, at −15 legitimacy and the Shephelah stripped for a season.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { manpower: 4000, legitimacy: -15 });
        mod(ctx, 'y931_ring_holds', 'The Ring Holds', { fortDefBonus: 1 });
        h.chronicle(ctx, 'era', 'The gates stay shut and the host goes north through a stripped Shephelah without taking a single walled town.'); } }),

  Y('ev931y_the_covenant_assembly', 'The Assembly in the Third Month', -893, 3, 'JDH',
    'The court has called every household in the kingdom to the capital — and, pointedly, '
    + 'every household that has come south out of Ephraim and Manasseh and Simeon, of whom '
    + 'there are a great many — to swear one oath together.\n\nIt is a political act wearing '
    + 'religious clothes: a covenant sworn by the whole country binds the whole country, and '
    + 'the men who come south to swear it are men the northern kingdom has lost.',
    '2 Chronicles 15:9-15: the assembly in the third month of the fifteenth year, with strangers out of Ephraim, Manasseh and Simeon, "for they fell to him out of Israel in abundance".',
    { label: 'Swear it, and enrol the newcomers', tooltip: '−40 governance points and "The Covenant Sworn" (+0.25 legitimacy a month, +8% manpower) permanently; Israel\'s regard falls by 30.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { gov: -40, legitimacy: 20 });
        mod(ctx, 'y931_covenant_sworn', 'The Covenant Sworn', { legitimacyAdd: 0.25, manpowerMult: 1.08 });
        opinion(ctx, 'ISL', 'JDH', -30);
        h.chronicle(ctx, 'era', 'The whole country swears one oath with a great shout and with trumpets, and the men who came south out of Ephraim swear it with them.'); } },
    { label: 'Keep it to the old families', tooltip: '+40 governance points and "The Old Families" (+8% income, −0.3 unrest everywhere) permanently. The newcomers are housed and not enrolled.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { gov: 40 });
        mod(ctx, 'y931_old_families', 'The Old Families', { incomeMult: 1.08, unrestAll: -0.3 });
        h.chronicle(ctx, 'era', 'The covenant is sworn by the houses of Judah and Benjamin. The northern refugees are given land and no oath.'); } }),

  Y('ev931y_the_contest_on_carmel', 'Three Years Without Rain', -868, 9, 'player',
    'It has not rained for three years. The brooks are gone, the king is personally out '
    + 'looking for grass to keep the chariot horses alive, and the country has spent the '
    + 'drought arguing about whose fault it is.\n\nThere is a proposal in front of the court '
    + 'that is either a masterstroke or a catastrophe: an assembly on Carmel, two altars, '
    + 'two sets of priests, and a public test with the whole political nation watching. '
    + 'Whoever loses it will not be a party in this kingdom afterwards.',
    '1 Kings 17-18: three years of drought, Obadiah hiding a hundred prophets in caves, and the contest on Carmel with the four hundred and fifty.',
    { label: 'Hold the assembly', tooltip: '+25 legitimacy and "The Answer by Fire" (+0.25 legitimacy a month, +1.2 unrest everywhere) for twenty-five years. One party at court is destroyed in public.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { legitimacy: 25, infl: -25 });
        mod(ctx, 'y931_answer_by_fire', 'The Answer by Fire', { legitimacyAdd: 0.25, unrestAll: 1.2 }, 300);
        h.chronicle(ctx, 'era', 'The assembly is called to Carmel and the country halts between two opinions for one afternoon and then does not.'); } },
    { label: 'Buy grain and say nothing', tooltip: '−250 talents and "The Granaries Opened" (−1 unrest everywhere, +6% growth) for twenty years. Nobody is destroyed and nobody is vindicated.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -250, gov: 25 });
        mod(ctx, 'y931_granaries_opened', 'The Granaries Opened', { unrestAll: -1, growthMult: 1.06 }, 240);
        h.chronicle(ctx, 'era', 'Grain is bought from Tyre and the Delta and distributed by district. No assembly is held on any mountain.'); } }),

  Y('ev931y_the_vineyard', 'The Vineyard Beside the Palace', -863, 6, 'ISL',
    'The crown wants a vineyard next to the palace grounds for a kitchen garden and has '
    + 'offered a better vineyard or its full value in silver. The owner has refused, on the '
    + 'ground that it is his fathers\' inheritance, which under the land law of this country '
    + 'it is: it cannot be sold out of the family and the king has no more right to it than '
    + 'anybody else.\n\nThe queen\'s household has pointed out, correctly, that in every '
    + 'other kingdom on this coast the king would simply take it — and that there is a legal '
    + 'procedure available involving two witnesses and a charge of blasphemy.',
    '1 Kings 21. Naboth\'s refusal rests on inalienable patrimony (Leviticus 25:23); the judicial murder that followed is the charge the dynasty never lives down.',
    { label: 'The law is the law: leave it', tooltip: '+25 legitimacy and "The King Under the Law" (+0.25 legitimacy a month, −0.6 unrest everywhere) permanently; −20 influence points and a court that thinks the crown is weak.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { legitimacy: 25, infl: -20 });
        mod(ctx, 'y931_king_under_law', 'The King Under the Law', { legitimacyAdd: 0.25, unrestAll: -0.6 });
        h.chronicle(ctx, 'era', 'The vineyard is left to its owner, and the kitchen garden is laid out on the other side of the palace.'); } },
    { label: 'Take it, by the procedure', tooltip: '+150 talents and "The Crown Takes What It Wants" (+10% income, −0.3 legitimacy a month, +0.8 unrest everywhere) permanently. The prophets acquire their permanent case against this dynasty.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { treasury: 150, legitimacy: -20 });
        mod(ctx, 'y931_crown_takes', 'The Crown Takes What It Wants', { incomeMult: 1.1, legitimacyAdd: -0.3, unrestAll: 0.8 });
        h.chronicle(ctx, 'era', 'Two sons of Belial testify, the owner is stoned outside the city, and the crown enters into the vineyard to possess it.'); } }),

  Y('ev931y_micaiah', 'Four Hundred Prophets and One', -857, 4, 'player',
    'The two kingdoms are allied for once and the question is Ramoth-Gilead, which Damascus '
    + 'has been holding for three years past a treaty that said it would be given back. Four '
    + 'hundred court prophets have been convened and all four hundred say go up and prosper.\n\n'
    + 'The visiting king has asked, pointedly, whether there is not one more — and there is, '
    + 'and the answer he gives is that he saw all Israel scattered on the hills as sheep '
    + 'that have no shepherd. He is in the prison house before the muster is finished.',
    '1 Kings 22: Micaiah ben Imlah, the four hundred, the lying spirit, and the arrow drawn at a venture that found the joints of the harness.',
    { label: 'March on Ramoth-Gilead', tooltip: '−4,000 manpower and "The Gilead Campaign" (+10% army strength, +1 hill defence) for twenty years, at −10 legitimacy if it goes as the one prophet said.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { manpower: -4000, mar: 35, legitimacy: -10 });
        mod(ctx, 'y931_gilead_campaign', 'The Gilead Campaign', { milPowerMult: 1.1, hillDefBonus: 1 }, 240);
        h.chronicle(ctx, 'era', 'The allied army goes up to Ramoth-Gilead. An arrow drawn at a venture finds the joints of the harness, and the chariot is washed out at the pool of Samaria.'); } },
    { label: 'Hear the one, and stand down', tooltip: '+20 legitimacy and "The Muster Dismissed" (−0.8 unrest everywhere, +6% income) for twenty-five years. The Gilead stays Aramean and the army stays alive.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { legitimacy: 20, gov: 30 });
        mod(ctx, 'y931_muster_dismissed', 'The Muster Dismissed', { unrestAll: -0.8, incomeMult: 1.06 }, 300);
        h.chronicle(ctx, 'era', 'The muster is dismissed on the word of one man against four hundred, which no court in this world has ever done before.'); } }),

  Y('ev931y_judges_in_the_cities', 'Judges in the Fenced Cities', -848, 5, 'JDH',
    'The proposal is a court in every fortified town — not elders in the gate, which the '
    + 'country already has, but appointed judges with a written charge, and above them an '
    + 'appeal court at the capital of priests and heads of houses, with a standing '
    + 'instruction that there is no respect of persons and no taking of gifts.\n\nIt is the '
    + 'first judiciary anybody in this country has proposed that does not consist of asking '
    + 'the nearest important man.',
    '2 Chronicles 19:5-11: Jehoshaphat set judges in the land, city by city, and a court of appeal in Jerusalem of Levites, priests and chief fathers.',
    { label: 'Appoint them', tooltip: '−50 governance points and "The Judges in the Cities" (−10% cost of governing, −0.5 unrest everywhere) permanently.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { gov: -50, legitimacy: 15 });
        mod(ctx, 'y931_judges', 'The Judges in the Cities', { adminMult: 0.9, unrestAll: -0.5 });
        h.chronicle(ctx, 'era', 'Judges are set in every fenced city with a written charge, and an appeal court at the capital above them.'); } },
    { label: 'Leave it to the elders in the gate', tooltip: '+40 governance points and "The Elders in the Gate" (+8% manpower, −0.3 unrest everywhere) permanently — cheaper, older, and answerable to the families rather than the crown.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { gov: 40 });
        mod(ctx, 'y931_elders_gate', 'The Elders in the Gate', { manpowerMult: 1.08, unrestAll: -0.3 });
        h.chronicle(ctx, 'era', 'The cases go on being heard in the gate by the men who have always heard them.'); } }),

  Y('ev931y_the_chest_by_the_altar', 'A Chest With a Hole in the Lid', -836, 7, 'JDH',
    'The repairs to the house have not been done. The priests were given the money and told '
    + 'to see to it, and twenty-three years later the breaches are still there, and nobody '
    + 'can produce an account.\n\nThe proposal is administratively brutal and completely '
    + 'effective: one chest beside the altar with a hole bored in the lid, everything that '
    + 'goes in counted and bagged by the king\'s secretary and the high priest together, and '
    + 'paid straight to the carpenters and masons — who are not asked to account for it, '
    + 'because they deal faithfully.',
    '2 Kings 12:4-16. The chest by the altar, the joint count by the king\'s scribe and the high priest, and the workmen who were not reckoned with because they dealt faithfully.',
    { label: 'Bore the hole and count it jointly', tooltip: '−30 governance points and "The Chest by the Altar" (+10% income, +0.2 legitimacy a month) permanently.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { gov: -30, legitimacy: 15 });
        mod(ctx, 'y931_the_chest', 'The Chest by the Altar', { incomeMult: 1.1, legitimacyAdd: 0.2 });
        h.chronicle(ctx, 'era', 'A chest with a hole bored in the lid is set beside the altar, and the house is repaired inside two years.'); } },
    { label: 'Let the priests keep the account', tooltip: '+40 influence points with the priesthood and "The Priests Account" (+0.2 legitimacy a month, −6% income) permanently. The breaches stay.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { infl: 40 });
        mod(ctx, 'y931_priests_account', 'The Priests Account', { legitimacyAdd: 0.2, incomeMult: 0.94 });
        h.chronicle(ctx, 'era', 'The money goes on being received by the priests, every man of his acquaintance, and the breaches of the house are not repaired.'); } }),

  Y('ev931y_hazael_at_gath', 'What Hazael Was Paid', -828, 8, 'JDH',
    'The Aramean has taken Gath and turned his face to come up to the capital, and there is '
    + 'no army in this kingdom that can stop him in the field. The treasurer has the '
    + 'inventory ready: all the hallowed things that three kings dedicated, and the king\'s '
    + 'own, and the gold found in the treasuries of the house and the palace.\n\nIt is the '
    + 'second time in a century the house has been emptied to buy off an army, and the '
    + 'second time it has worked.',
    '2 Kings 12:17-18: Hazael took Gath and set his face to go up to Jerusalem; Joash sent him the hallowed things and the gold, and he went away.',
    { label: 'Send it all', tooltip: '−350 talents and "Bought Off Twice" (−12% income for twenty years) — and the city is not entered.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -350, legitimacy: -12 });
        mod(ctx, 'y931_bought_off', 'Bought Off Twice', { incomeMult: 0.88 }, 240);
        opinion(ctx, 'DMS', 'JDH', 40);
        h.chronicle(ctx, 'era', 'The hallowed things of three kings go north to Damascus and the Aramean goes away from the capital.'); } },
    { label: 'Shut the gates and let him try', tooltip: '+20 legitimacy and "The Gates Shut" (+15% siege endurance, +1 fort defence) for twenty-five years, at −5,000 manpower and the country outside burned.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { legitimacy: 20, manpower: -5000, mar: 30 });
        mod(ctx, 'y931_gates_shut', 'The Gates Shut', { siegeMult: 1.15, fortDefBonus: 1 }, 300);
        mod(ctx, 'y931_country_burned', 'The Country Burned', { unrestAll: 1.2 }, 96);
        h.chronicle(ctx, 'era', 'The gates stay shut. The Aramean takes what is outside them and goes home without the treasure.'); } }),

  Y('ev931y_the_hired_men', 'A Hundred Talents of Hired Men', -816, 4, 'JDH',
    'A hundred thousand mighty men of valour have been hired out of Israel for a hundred '
    + 'talents of silver, paid in advance, for the Edomite campaign — and a man of God has '
    + 'arrived at the muster to say they are not to go, and that the hundred talents are a '
    + 'sunk cost the crown will have to swallow.\n\nThe hired men, who have been paid and '
    + 'now have nothing to plunder, are described in the account as being in great anger. '
    + 'They go home through this kingdom\'s own border towns on the way.',
    '2 Chronicles 25:6-13: the hired Israelites were sent home in great anger and fell upon the cities of Judah from Samaria to Beth-horon on the way.',
    { label: 'Send them home and eat the cost', tooltip: '−150 talents, +18 legitimacy and "The Border Towns Raided" (+1 unrest everywhere) for eight years. Israel\'s regard falls by 35.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -150, legitimacy: 18 });
        mod(ctx, 'y931_border_raided', 'The Border Towns Raided', { unrestAll: 1 }, 96);
        opinion(ctx, 'ISL', 'JDH', -35);
        h.chronicle(ctx, 'era', 'The hired men are sent home before the campaign and fall on the border towns on the way, and the hundred talents are not recovered.'); } },
    { label: 'Take them south and use them', tooltip: '+6,000 manpower and "The Hired Host" (+10% army strength) for fifteen years, at −15 legitimacy and a court that says the campaign was won with the wrong men.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { manpower: 6000, legitimacy: -15, mar: 25 });
        mod(ctx, 'y931_hired_host', 'The Hired Host', { milPowerMult: 1.1 }, 180);
        h.chronicle(ctx, 'era', 'The hired Israelites march south with the army and the Edomite campaign is won with them in the line.'); } }),

  Y('ev931y_the_zakkur_stele', 'A King Who Says His God Answered Him', -808, 5, 'player',
    'A stele has gone up at Hazrach in the north and the text of it is being copied by every '
    + 'chancery on this coast, because it is a new kind of document. A king besieged by a '
    + 'coalition of seventeen kings says that he lifted his hands to his god, and that his '
    + 'god answered him by seers and by diviners and said: do not fear, for I have made you '
    + 'king and I will stand with you.\n\nIt is, word for word, the idiom this country\'s own '
    + 'prophets use — which means either that everybody in Syria talks like this, or that '
    + 'nobody here is as unusual as they think.',
    'The Zakkur stele (KAI 202), c. 785 BCE, from Afis: the earliest Levantine royal inscription describing an oracular salvation response in the first person.',
    { label: 'Copy it into the archive', tooltip: '+40 influence points and "The Idiom of the Coast" (+8% income, +1 diplomatic seat) for thirty years — a chancery that reads its neighbours in the original.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { infl: 40 });
        mod(ctx, 'y931_idiom_of_coast', 'The Idiom of the Coast', { incomeMult: 1.08, diploSeats: 1 }, 360);
        h.chronicle(ctx, 'era', 'The Hazrach text is copied into the archive beside our own oracles, in the same hand and the same idiom.'); } },
    { label: 'Ours is not that kind of word', tooltip: '+30 governance points and "Not That Kind of Word" (+0.2 legitimacy a month) permanently — a court that insists its prophets are a different thing, at some cost in diplomacy.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { gov: 30, infl: -20 });
        mod(ctx, 'y931_not_that_word', 'Not That Kind of Word', { legitimacyAdd: 0.2 });
        h.chronicle(ctx, 'era', 'The court declines to file the Hazrach stele with its own oracles, which the scribes of Hamath find very funny.'); } }),

  Y('ev931y_the_rimah_stele', 'Tribute at Damascus', -803, 9, 'ISL',
    'The Assyrian has come west again, taken tribute at Damascus, and put up a stele at '
    + 'Tell al-Rimah listing who paid. The name on it after the Aramean\'s is ours — spelled, '
    + 'in their hand, "Joash the Samarian", which is the first time any Assyrian scribe has '
    + 'used this kingdom\'s capital as the name of the country.\n\nWhat the tribute buys is '
    + 'real: an Assyrian who is collecting from Damascus is an Assyrian who has just broken '
    + 'the power that has been taking the Gilead off this kingdom for eighty years.',
    'The Rimah stele of Adad-nirari III names "Ia\'asu the Samarian" among the tributaries, alongside Damascus, Tyre and Sidon.',
    { label: 'Pay, and take the Gilead back while Damascus reels', tooltip: '−200 talents and "The Aramean Broken" (+10% army strength, +8% manpower) for twenty-five years; Aram\'s regard falls by 40.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { treasury: -200, mar: 40 });
        mod(ctx, 'y931_aramean_broken', 'The Aramean Broken', { milPowerMult: 1.1, manpowerMult: 1.08 }, 300);
        opinion(ctx, 'DMS', 'ISL', -40); opinion(ctx, 'ASR', 'ISL', 40);
        h.chronicle(ctx, 'era', 'The tribute goes to the Assyrian at Damascus and the army goes east into the Gilead the same summer.'); } },
    { label: 'Pay nothing and let Damascus pay alone', tooltip: '+30 legitimacy and "No Name on the Stele" (+8% morale) for twenty years, at Assyria −50 regard: this kingdom is not on the list, which cuts both ways.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { legitimacy: 30, mar: 20 });
        mod(ctx, 'y931_no_name', 'No Name on the Stele', { moraleMult: 1.08 }, 240);
        opinion(ctx, 'ASR', 'ISL', -50);
        h.chronicle(ctx, 'era', 'No tribute goes north and no name of ours is cut into the stele at Rimah. The scribes at Kalhu note the omission.'); } }),

  Y('ev931y_the_broken_wall', 'Four Hundred Cubits of Wall', -798, 6, 'JDH',
    'The southern king challenged the northern one to look each other in the face, was told '
    + 'in reply a fable about a thistle and a cedar, and went anyway. The army was beaten at '
    + 'Beth-shemesh and scattered, the king was taken alive, and the victor has come up to '
    + 'the capital and broken down four hundred cubits of the wall from the gate of Ephraim '
    + 'to the corner gate.\n\nThe gold, the silver, the vessels and hostages have gone north. '
    + 'The wall is the part everybody can see.',
    '2 Kings 14:8-14. Amaziah\'s challenge, the thistle and the cedar, the rout at Beth-shemesh and four hundred cubits of the wall of Jerusalem pulled down.',
    { label: 'Rebuild the wall first, whatever it costs', tooltip: '−250 talents and "The Corner Gate Rebuilt" (+1 fort defence, +0.2 legitimacy a month) permanently.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -250, legitimacy: 12 });
        mod(ctx, 'y931_corner_gate', 'The Corner Gate Rebuilt', { fortDefBonus: 1, legitimacyAdd: 0.2 });
        h.chronicle(ctx, 'era', 'Four hundred cubits of wall go back up between the gate of Ephraim and the corner gate, and the masons are paid before the garrison.'); } },
    { label: 'Rebuild the army first', tooltip: '+6,000 manpower and "The Muster Rebuilt" (+10% manpower, +8% morale) for twenty-five years, at +0.8 unrest everywhere for fifteen: the capital is open and knows it.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { manpower: 6000, mar: 35 });
        mod(ctx, 'y931_muster_rebuilt', 'The Muster Rebuilt', { manpowerMult: 1.1, moraleMult: 1.08 }, 300);
        mod(ctx, 'y931_open_city', 'The Breach in the Wall', { unrestAll: 0.8 }, 180);
        h.chronicle(ctx, 'era', 'The breach is boarded and the silver goes to the muster instead. Everybody entering the city by the Ephraim gate walks through the gap.'); } }),

  Y('ev931y_the_engines_on_the_towers', 'Engines Invented by Cunning Men', -793, 5, 'JDH',
    'The armoury has built something new: machines set on the towers and on the corners of '
    + 'the wall, to shoot arrows and great stones. Nobody on this coast has anything like '
    + 'them and the chronicler is visibly proud — "his name spread far abroad, for he was '
    + 'marvellously helped, till he was strong."\n\nThey are expensive, they need trained '
    + 'crews, and they are useless in the field. What they do is make a walled town cost a '
    + 'season instead of a month.',
    '2 Chronicles 26:15: engines invented by cunning men on the towers and bulwarks of Jerusalem, to shoot arrows and great stones.',
    { label: 'Build them on every tower', tooltip: '−200 talents and "Engines on the Towers" (+15% siege endurance, +1 fort defence) permanently.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -200, mar: 30 });
        mod(ctx, 'y931_engines', 'Engines on the Towers', { siegeMult: 1.15, fortDefBonus: 1 });
        h.chronicle(ctx, 'era', 'Engines go up on the towers and the corners, and the king\'s name spreads far abroad, which is the part he wanted.'); } },
    { label: 'Spend it on the field army instead', tooltip: '+5,000 manpower and "The Host in the Field" (+8% army strength, +6% manpower) for twenty-five years.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { manpower: 5000, mar: 25 });
        mod(ctx, 'y931_host_in_field', 'The Host in the Field', { milPowerMult: 1.08, manpowerMult: 1.06 }, 300);
        h.chronicle(ctx, 'era', 'The armoury builds shields, spears, helmets and slings by the thousand instead, and the towers keep their archers.'); } }),

  Y('ev931y_the_vintage_receipts', 'In the Ninth Year, From Kosoh', -788, 8, 'ISL',
    'The steward has brought the season\'s receipts and they are potsherds again, and there '
    + 'are more of them every year: in the ninth year, from Kosoh, to Gaddiyaw, a jar of old '
    + 'wine; in the tenth year, from Hazeroth, to Gaddiyaw, a jar of fine oil.\n\nWhat the '
    + 'court has to decide is whether the estates named on them are crown land being '
    + 'administered or private land being taxed — because the two look identical on a '
    + 'potsherd and completely different in a generation.',
    'The Samaria ostraca: sixty-three inked sherds from the royal storehouse, dated by regnal year, recording deliveries from named estates to named men at court.',
    { label: 'Crown land, administered', tooltip: '−40 governance points and "The Royal Estates" (+12% income, +5% growth) permanently — and a landed interest that is the crown\'s tenant rather than its creditor.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { gov: -40 });
        mod(ctx, 'y931_royal_estates', 'The Royal Estates', { incomeMult: 1.12, growthMult: 1.05 });
        h.chronicle(ctx, 'era', 'The estates on the sherds are entered as crown land with stewards over them, and the men at court are paid in kind from the harvests.'); } },
    { label: 'Private land, taxed', tooltip: '+250 talents now and "The Great Houses" (+8% income, +6% manpower, +0.5 unrest everywhere) permanently. The valleys become a constituency with land of their own.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { treasury: 250 });
        mod(ctx, 'y931_great_houses', 'The Great Houses', { incomeMult: 1.08, manpowerMult: 1.06, unrestAll: 0.5 });
        h.chronicle(ctx, 'era', 'The estates are confirmed to the families that hold them and assessed for tax. Within a generation the prophets are writing about men who join house to house and field to field.'); } }),

  Y('ev931y_the_border_restored', 'From the Entrance of Hamath to the Sea', -783, 4, 'ISL',
    'The border is back where the chroniclers say Solomon had it: from the entering in of '
    + 'Hamath in the north to the sea of the plain in the south, the Gilead and the Bashan '
    + 'and Damascus itself paying. Assyria is busy in the mountains, Aram is broken, and this '
    + 'kingdom has quietly become the largest state between the Euphrates and the Nile.\n\n'
    + 'It will last forty years. The court has to decide what to do with them.',
    '2 Kings 14:25-28: Jeroboam II restored the coast of Israel from the entering of Hamath to the sea of the plain; Amos and Hosea are written inside this prosperity.',
    { label: 'Build: ivory, ashlar and storehouses', tooltip: '+300 talents and "The Forty Good Years" (+12% income, +8% growth) permanently, at +0.5 unrest everywhere — the prophets have a great deal to say about the houses of ivory.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { treasury: 300, legitimacy: 15 });
        mod(ctx, 'y931_forty_good_years', 'The Forty Good Years', { incomeMult: 1.12, growthMult: 1.08, unrestAll: 0.5 });
        h.chronicle(ctx, 'era', 'The capital is rebuilt in ashlar with ivory inlay, and the storehouses of the valleys are filled. Two shepherds from the south begin writing about it.'); } },
    { label: 'Fortify: the Assyrian will come back', tooltip: '−250 talents and "The Forty Years Spent on Walls" (+1 fort defence, +15% siege endurance, +8% manpower) permanently.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { treasury: -250, mar: 40 });
        mod(ctx, 'y931_walls_of_the_good_years', 'The Forty Years Spent on Walls', { fortDefBonus: 1, siegeMult: 1.15, manpowerMult: 1.08 });
        h.chronicle(ctx, 'era', 'The good years go into casemate walls, cisterns and grain. Nobody in the capital builds an ivory house, and the court is thought dull.'); } }),

  Y('ev931y_the_earthquake', 'The Earthquake', -776, 7, 'player',
    'Two years\' worth of building has come down in ninety seconds. The damage runs the whole '
    + 'length of the country — the excavators will find the collapse layer at Hazor, at '
    + 'Gezer, at Lachish, everywhere — and the people who were standing in the open when it '
    + 'happened have not stopped talking about it.\n\nIt will be used as a date for two '
    + 'hundred years: men will say "two years before the earthquake", and everybody will know '
    + 'which one.',
    'Amos 1:1 dates his oracles "two years before the earthquake"; Zechariah 14:5 still uses it as a reference point three centuries later. The collapse layer is stratigraphically visible across the southern Levant.',
    { label: 'Rebuild out of the treasury', tooltip: '−300 talents and "Rebuilt After the Earthquake" (+8% growth, +1 fort defence, −0.5 unrest everywhere) permanently.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: -300, legitimacy: 15 });
        mod(ctx, 'y931_rebuilt_after_quake', 'Rebuilt After the Earthquake', { growthMult: 1.08, fortDefBonus: 1, unrestAll: -0.5 });
        h.chronicle(ctx, 'era', 'The towns are rebuilt on the crown\'s account, and men date things by the earthquake for two hundred years.'); } },
    { label: 'Let each town rebuild itself', tooltip: '+150 talents kept and "Each Town Its Own Wall" (+6% income, +0.8 unrest everywhere) for twenty years — the rich towns are back in a year and the poor ones are not back at all.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { treasury: 150, legitimacy: -10 });
        mod(ctx, 'y931_each_town_own_wall', 'Each Town Its Own Wall', { incomeMult: 1.06, unrestAll: 0.8 }, 240);
        h.chronicle(ctx, 'era', 'The towns rebuild at their own charges. The prophets notice which ones do not.'); } }),

  Y('ev931y_amos_at_bethel', 'The Shepherd at the King\'s Sanctuary', -768, 9, 'ISL',
    'There is a man at Bethel — a herdsman and a dresser of sycomore fruit from a village in '
    + 'the other kingdom, with no prophetic training and no guild — saying that this country '
    + 'sells the righteous for silver and the poor for a pair of shoes, that its summer houses '
    + 'and winter houses and houses of ivory will come down, and that its king will die by the '
    + 'sword.\n\nThe priest of Bethel has written to the palace asking for him to be expelled, '
    + 'on the ground that the land is not able to bear all his words, and has told the man to '
    + 'his face to go and eat bread in Judah and prophesy there, because Bethel is the king\'s '
    + 'sanctuary and the king\'s court.',
    'Amos 7:10-17. Amaziah\'s letter to Jeroboam and the phrase that gives the northern establishment away: "it is the king\'s chapel, and it is the king\'s court."',
    { label: 'Expel him', tooltip: '+35 governance points and "The Court Undisturbed" (+8% income) for twenty years, at −12 legitimacy and +0.8 unrest everywhere for fifteen. The words are written down in the other kingdom.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { gov: 35, legitimacy: -12 });
        mod(ctx, 'y931_court_undisturbed_931', 'The Court Undisturbed', { incomeMult: 1.08 }, 240);
        mod(ctx, 'y931_words_written_down', 'The Words Written Down', { unrestAll: 0.8 }, 180);
        h.chronicle(ctx, 'era', 'The herdsman is escorted to the border and goes home, where somebody writes down everything he said at Bethel, in order, with the date.'); } },
    { label: 'Hear him, and rule on the courts', tooltip: '−50 governance points and "Justice in the Gate" (+0.25 legitimacy a month, −0.8 unrest everywhere, −6% income) permanently: the debt cases are reopened and the great houses pay.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { gov: -50, legitimacy: 20 });
        mod(ctx, 'y931_justice_in_gate', 'Justice in the Gate', { legitimacyAdd: 0.25, unrestAll: -0.8, incomeMult: 0.94 });
        h.chronicle(ctx, 'era', 'The debt cases are reopened, the gate courts are purged, and the great houses of the valleys discover that the crown has been listening to a fruit-picker.'); } }),

  Y('ev931y_the_eclipse', 'The Sun Went Out at Noon', -763, 6, 'player',
    'The sun was eaten at midday over the whole of this world — the third month, the month '
    + 'of Simanu, with a revolt in the city of Ashur at the same time — and the Assyrian '
    + 'scribes have entered it in the eponym list against the year of Bur-Sagale, governor '
    + 'of Guzana.\n\nThat single line will let everybody afterwards fix the whole chronology '
    + 'of this age to the year: every king, every campaign, every tribute in the list before '
    + 'and after it. It is the most useful thing any scribe in this century does, and he '
    + 'does it without knowing.',
    'The Bur-Sagale eclipse of 15 June 763 BCE, recorded in the Assyrian eponym canon, is the anchor point for the absolute chronology of the ancient Near East.',
    { label: 'Put our own years beside theirs', tooltip: '−30 governance points and "The Chronology Fixed" (−8% cost of governing, +0.2 legitimacy a month) permanently: an archive that can be checked against anybody\'s.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { gov: -30, infl: 25 });
        mod(ctx, 'y931_chronology_fixed', 'The Chronology Fixed', { adminMult: 0.92, legitimacyAdd: 0.2 });
        h.chronicle(ctx, 'era', 'The court has its own regnal years written out against the Assyrian eponyms, year for year, from the eclipse backwards.'); } },
    { label: 'Read it as a sign and act on it', tooltip: '+20 legitimacy and "The Sign at Noon" (+8% morale, −0.5 unrest everywhere) for fifteen years. Nobody checks the arithmetic.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx); h.adjust(ctx, me, { legitimacy: 20 });
        mod(ctx, 'y931_sign_at_noon', 'The Sign at Noon', { moraleMult: 1.08, unrestAll: -0.5 }, 180);
        h.chronicle(ctx, 'era', 'The darkening at noon is proclaimed a sign, and the court acts on it. The Assyrian scribes, meanwhile, write down the date.'); } }),
];

// --- SPEC §216: a card is answered by the court it is addressed to ---------
// One loop instead of a tag argument on every call site in the file. A card
// marked `player` or `both` is always the chair the player is sitting in and
// is left alone; a card marked ISL or JDH writes to that court whether or not
// the player is in it.
for (const _c of EVENTS_931_YEARS) {
  if (!_c || (_c.forTag !== 'ISL' && _c.forTag !== 'JDH')) continue;
  for (const _o of _c.options || []) {
    if (typeof _o.effects !== 'function') continue;
    _o.effects = bindAudience(_c.forTag, _o.effects);
  }
}
