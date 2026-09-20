// Judaea Universalis — the two houses: Omri's and David's, 870–722 BCE (SPEC
// §240, §268). Content package. Zero imports; every effect runs through
// ctx.helpers.
//
// The chapter's spine is written elsewhere: the division, the calves, the
// towns, the steles, the good years. This file is what happened inside the
// two palaces while those things were being decided — a Tyrian queen with her
// own establishment and her own payroll, a cloak dropped at the Jordan and
// picked up by a ploughman, a borrowed axe-head, an Aramean general with a
// skin disease and a letter, a siege price list with an ass's head at eighty
// pieces of silver, four men outside a gate who worked out that they had
// nothing to lose, a wet cloth pressed on a sick king's face in Damascus, a
// flask of oil poured in a small room with one door, a chariot recognised at
// two miles by the way it was driven, a window, seventy heads in baskets, a
// woman who destroyed the royal seed and a child who spent six years in a
// temple bedroom, a king killed on his bed by his own servants, three prophets
// nobody at court wanted to hear, four kings in one year, a thousand talents
// assessed at fifty shekels a head, and a hill in Samaria that held out for
// three years and then did not.
//
// Sources: 1 Kings 16-22 and 2 Kings 1-17; 2 Chronicles 22-28; Hosea 1-3;
// Amos; the Tel Dan stele; the Black Obelisk; the annals of Tiglath-Pileser III
// and the Nimrud slab; the Khorsabad annals and Display Inscription of Sargon
// II with the figure of 27,290 deported from Samaria.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_931bce_houses] ' + key, e || '');
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

// A dated card of the houses, with two answers and the recorded one first.
function H(id, title, y, m, forTag, desc, historical, a, b) {
  return {
    id, title, desc, historical, forTag, date: { y, m }, aiOption: 0,
    options: [
      { label: a.label, tooltip: a.tooltip, effects: guard(id + ':0', a.fx) },
      { label: b.label, tooltip: b.tooltip, effects: guard(id + ':1', b.fx) },
    ],
  };
}

export const EVENTS_931_HOUSES = [

  H('ev931h_the_queens_establishment', 'A Temple and a Payroll', -870, 5, 'ISL',
    'The queen\'s household has arrived at its full size and the treasurer has costed it: a '
    + 'house of Baal in the capital with an altar and a wooden pillar, four hundred and fifty '
    + 'prophets of Baal and four hundred of the grove eating at the queen\'s own table, and a '
    + 'standing line in the accounts for all of it. Nobody can pretend this was not in the '
    + 'marriage contract, because it was, in writing.\n\nThe second item is not in the '
    + 'accounts. The steward of the palace has been quietly removing prophets of the other '
    + 'party from the queen\'s reach and keeping a hundred of them alive by fifty in two caves '
    + 'on bread and water, charged to the household as fodder. He has not mentioned it and the '
    + 'comptroller has.',
    '1 Kings 16:32-33 and 18:4: Ahab built the house of Baal in Samaria; Jezebel cut off the prophets of the LORD and Obadiah hid a hundred of them, fifty to a cave, and fed them bread and water.',
    { label: 'Pay for the temple and look away from the caves', tooltip: '+200 talents of Tyrian custom and "The Queen\'s Table" (+12% trade, +8% income, +0.8 unrest everywhere) permanently; Tyre +50 regard, −12 legitimacy. The comptroller is not answered and the steward is not dismissed.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { treasury: 200, legitimacy: -12, infl: 20 });
        mod(ctx, 'h931_queens_table', 'The Queen\'s Table', { tradeMult: 1.12, incomeMult: 1.08, unrestAll: 0.8 });
        opinion(ctx, 'TYR', 'ISL', 50);
        h.chronicle(ctx, 'era', 'The house of Baal is finished and consecrated, the eight hundred and fifty go on the household roll, and a hundred men in two caves go on being fed out of the fodder account.'); } },
    { label: 'Keep the temple, end the purge', tooltip: '−120 talents in compensation to the queen\'s household and "The Two Altars" (−0.6 unrest everywhere, +0.15 legitimacy a month, −6% trade) permanently; Tyre −30 regard. Both cults are licensed and neither is satisfied.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { treasury: -120, legitimacy: 15, gov: -20 });
        mod(ctx, 'h931_two_altars', 'The Two Altars', { unrestAll: -0.6, legitimacyAdd: 0.15, tradeMult: 0.94 });
        opinion(ctx, 'TYR', 'ISL', -30);
        h.chronicle(ctx, 'era', 'The temple keeps its endowment and the warrants against the other party are withdrawn. The queen is told, in writing, that her household does not hold assizes in this kingdom.'); } }),

  H('ev931h_the_mantle_at_the_jordan', 'The Mantle at the Jordan', -852, 2, 'ISL',
    'The man in the hair cloak is gone. He crossed the Jordan eastward with his successor and '
    + 'did not come back, and the fifty men from the school at Jericho who searched the hills '
    + 'for three days found nothing. The court has declined to enter the witnesses\' account of '
    + 'the weather in the record and has entered the date.\n\nWhat came back over the river was '
    + 'the cloak, on the shoulders of a farmer from Abel-meholah who was ploughing behind the '
    + 'twelfth yoke when he was recruited and who burned the plough and boiled the oxen on it '
    + 'so that nobody would suggest he go back. He asked for a double portion of the old man\'s '
    + 'spirit, which is the firstborn\'s share of an estate, and he is behaving like an heir.',
    '2 Kings 2: Elijah passed over Jordan and Elisha took up the mantle, having asked for a double portion — the language of inheritance law, not of magic.',
    { label: 'Recognise the succession and put the schools on the corn list', tooltip: '−90 talents a decade in grain and "The Sons of the Prophets" (+0.2 legitimacy a month, −0.5 unrest everywhere) permanently. The crown feeds a party that will one day anoint somebody else.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { treasury: -90, legitimacy: 12 });
        mod(ctx, 'h931_sons_of_prophets', 'The Sons of the Prophets', { legitimacyAdd: 0.2, unrestAll: -0.5 });
        h.setFlag(ctx, 'prophetSchoolsEndowed', true);
        h.chronicle(ctx, 'era', 'The schools at Bethel, Jericho and Gilgal are put on the corn list and the new man is received at court, standing.'); } },
    { label: 'Let the schools feed themselves', tooltip: '+40 governance points and "The Crown Feeds Its Own" (+7% income) permanently, against "A Party Outside the Palace" (+0.9 unrest everywhere, −0.15 legitimacy a month) permanently.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { gov: 40 });
        mod(ctx, 'h931_crown_feeds_its_own', 'The Crown Feeds Its Own', { incomeMult: 1.07 });
        mod(ctx, 'h931_party_outside', 'A Party Outside the Palace', { unrestAll: 0.9, legitimacyAdd: -0.15 });
        h.chronicle(ctx, 'era', 'The schools are left to the villages that house them. They are fed anyway, by farmers, which is a different set of creditors.'); } }),

  H('ev931h_the_room_on_the_wall', 'A Room on the Wall at Shunem', -849, 3, 'ISL',
    'A landowning woman at Shunem has built the prophet a walled chamber on her roof with a '
    + 'bed, a table, a stool and a lampstand, so that he can stop across her ground whenever he '
    + 'passes. He offered to speak for her to the king, or to the captain of the host, which is '
    + 'the ordinary currency of such a favour. She answered that she dwells among her own '
    + 'people and wants nothing.\n\nThe crown\'s difficulty is exactly that sentence. A prophetic '
    + 'household maintained by the great houses of the valley is a household the palace does '
    + 'not pay for, cannot post and cannot recall — and when a bad year sends those families '
    + 'over the border and the crown\'s officers take their empty fields into the domain, it is '
    + 'the prophet\'s servant who turns up years later to argue the title.',
    '2 Kings 4:8-10 for the chamber, and 8:1-6 for the Shunammite\'s return after seven years abroad and the restoration of her house, her land and its produce by royal order.',
    { label: 'Leave the patronage to the valley houses', tooltip: '+8% income and −0.4 unrest everywhere ("The Valley Keeps Its Own Prophets") permanently, at −0.1 legitimacy a month: the crown saves the money and loses the man.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { gov: 25 });
        mod(ctx, 'h931_valley_patrons', 'The Valley Keeps Its Own Prophets', { incomeMult: 1.08, unrestAll: -0.4, legitimacyAdd: -0.1 });
        h.chronicle(ctx, 'era', 'The chamber at Shunem is built at the owner\'s charges and the crown is not asked for anything, which the crown notes.'); } },
    { label: 'Restore the absentees and register the titles', tooltip: '−140 talents and −30 governance points for a land court that gives famine refugees their fields and their arrears; "The Register of Titles" (+0.25 legitimacy a month, −6% income) permanently.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { treasury: -140, gov: -30, legitimacy: 18 });
        mod(ctx, 'h931_register_of_titles', 'The Register of Titles', { legitimacyAdd: 0.25, incomeMult: 0.94 });
        h.chronicle(ctx, 'era', 'The fields taken into the domain in the bad years are restored with their fruits from the day of leaving, and a register is opened so that the next argument is shorter.'); } }),

  H('ev931h_the_borrowed_axe', 'The Borrowed Axe-Head', -847, 6, 'ISL',
    'The lodging at Jericho is too small for the men in it, so they went down to the Jordan to '
    + 'fell their own beams and build a bigger one themselves. One of them lost the iron head '
    + 'off his axe into the water on the second day and cried out, not because of the work but '
    + 'because the tool was borrowed and he could not pay for it. The head was got out again, '
    + 'and every village on the road has now heard about it.\n\nWhat the court hears in the '
    + 'story is the price of iron. A head costs more than a month of a man\'s labour, the crown '
    + 'holds the smithies, and a guild is putting up a building without a grant because it '
    + 'cannot afford to hire anything.',
    '2 Kings 6:1-7. The detail that dates the anxiety is "alas, master, for it was borrowed": iron was scarce enough in the ninth century that a lost axe-head was a debt.',
    { label: 'Issue tools on credit from the crown smithies', tooltip: '−160 talents and "Iron on the Village Account" (+9% growth, +6% manpower, −0.4 unrest everywhere) permanently; the crown gives up the premium it has been charging.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { treasury: -160, gov: -20 });
        mod(ctx, 'h931_iron_on_credit', 'Iron on the Village Account', { growthMult: 1.09, manpowerMult: 1.06, unrestAll: -0.4 });
        h.chronicle(ctx, 'era', 'The crown smithies begin issuing heads, coulters and sickles against the harvest, and the lodging by the Jordan is finished before the rains.'); } },
    { label: 'Keep iron dear and tax the smithies', tooltip: '+9% income and +180 talents at once ("The Iron Farm"), against +0.7 unrest everywhere and −5% growth permanently. Guilds and villages go on borrowing tools from each other.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { treasury: 180 });
        mod(ctx, 'h931_iron_farm', 'The Iron Farm', { incomeMult: 1.09, unrestAll: 0.7, growthMult: 0.95 });
        h.chronicle(ctx, 'era', 'The smithies are farmed to three contractors at a fixed rent, and the price of an axe-head in the Jordan villages goes up again.'); } }),

  H('ev931h_naaman_the_aramean', 'A Letter, Ten Talents and a Leper', -846, 9, 'ISL',
    'An Aramean field commander is at the border with an escort of chariots, ten talents of '
    + 'silver, six thousand pieces of gold, ten changes of raiment, and a letter from his king '
    + 'to ours instructing this court to cure him of his skin disease. The war ministry reads '
    + 'the letter as a pretext, on the ground that no court can be instructed to do that and '
    + 'the failure would be the quarrel.\n\nThe man was directed here by a captive Israelite '
    + 'girl in his own household. He has been told to wash seven times in the Jordan, has '
    + 'nearly gone home insulted over the choice of river, and has washed. He now wants two '
    + 'mules\' burden of this country\'s earth to take back to Damascus so that he can sacrifice '
    + 'on it there, and a ruling on whether he may bow in the house of Rimmon beside his '
    + 'master, whose arm he is.',
    '2 Kings 5. The prophet refused the fee, Gehazi went after it and took two talents, and Naaman went home with the earth and his question about the house of Rimmon unanswered except by "go in peace".',
    { label: 'Refuse the fee, grant the earth, answer nothing', tooltip: 'The ten talents are declined. Damascus +45 regard and "Go in Peace" (−0.5 unrest everywhere, +6% morale) for twenty years: the Aramean high command acquires one man who will argue against the next raid.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { legitimacy: 12, infl: 25 });
        mod(ctx, 'h931_go_in_peace', 'Go in Peace', { unrestAll: -0.5, moraleMult: 1.06 }, 240);
        opinion(ctx, 'DMS', 'ISL', 45);
        h.chronicle(ctx, 'era', 'The silver goes back over the border with the escort, the earth goes with it on two mules, and the prophet\'s servant is caught taking two talents on his own account.'); } },
    { label: 'Take the payment and bill the cure as a court service', tooltip: '+260 talents and "The Physicians of the Court" (+8% income) for twenty-five years, at Damascus −25 regard and −10 legitimacy: the thing is now a service that can be withheld, which is how Damascus will read it.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { treasury: 260, legitimacy: -10 });
        mod(ctx, 'h931_court_physicians', 'The Physicians of the Court', { incomeMult: 1.08 }, 300);
        opinion(ctx, 'DMS', 'ISL', -25);
        h.chronicle(ctx, 'era', 'The ten talents and the raiment are entered in the treasury and a receipt is given. Damascus files the receipt, which is the part that matters.'); } }),

  H('ev931h_the_camp_at_dothan', 'The Camp at Dothan', -845, 4, 'ISL',
    'Aramean raiding parties have crossed four times this year and every ambush has been '
    + 'empty, because somebody keeps telling this court where the camp is going to be pitched '
    + 'before it is pitched. Damascus has concluded there is an informer in its war council '
    + 'and has started questioning its own officers, which is the most useful thing that has '
    + 'happened on this border in a decade.\n\nThere is no informer. There is a man at Dothan, '
    + 'and the Aramean has now sent horses and chariots and a night march to take him. The '
    + 'force arrived in the dark, was walked into the capital by somebody who told them they '
    + 'were going somewhere else, and is currently standing in the square inside the gate, '
    + 'disarmed and blinking.',
    '2 Kings 6:8-23: the raiders taken to Samaria, and the ruling that they be fed and sent home — after which "the bands of Syria came no more into the land of Israel".',
    { label: 'Set bread and water before them and send them home', tooltip: '−40 talents for a feast and a campaign season nobody has to fight; Damascus +40 regard and "The Bands Came No More" (−0.6 unrest everywhere, +5% income) for fifteen years. The army is told to its face that the prisoners are walking.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { treasury: -40, legitimacy: 10, mar: -15 });
        mod(ctx, 'h931_bands_came_no_more', 'The Bands Came No More', { unrestAll: -0.6, incomeMult: 1.05 }, 180);
        opinion(ctx, 'DMS', 'ISL', 40);
        h.chronicle(ctx, 'era', 'The raiders are given a great feast in the square and walked back to the border in the morning, and the crossings stop for a season.'); } },
    { label: 'Kill them in the square', tooltip: '+180 talents of horses, chariots and harness and "The Square at the Gate" (+8% army strength, +6% manpower) for fifteen years, at Damascus −60 regard, +1 war exhaustion and a border that stays open all year.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { treasury: 180, warExhaustion: 1, mar: 25 });
        mod(ctx, 'h931_square_at_the_gate', 'The Square at the Gate', { milPowerMult: 1.08, manpowerMult: 1.06 }, 180);
        opinion(ctx, 'DMS', 'ISL', -60);
        h.chronicle(ctx, 'era', 'The prisoners are killed where they stand and the harness is sold. The next Aramean force that comes over the border comes in the field season and in strength.'); } }),

  H('ev931h_an_asses_head', 'An Ass\'s Head for Eighty', -844, 7, 'ISL',
    'The Aramean army is round the capital and the market inside it has produced a price '
    + 'list: an ass\'s head at eighty pieces of silver, a quarter of a cab of dove\'s dung at '
    + 'five. Two women on the north wall have put an arrangement to the king about their sons '
    + 'that he cannot answer, and he has torn his robe in the street, and the people have seen '
    + 'that there is sackcloth under it.\n\nThe granaries of the great houses inside the walls '
    + 'are not empty. The comptroller has the numbers and the guard could have the doors off '
    + 'them by evening, and the heads of those houses are the men who would have to hold the '
    + 'wall afterwards.',
    '2 Kings 6:24-31. The siege prices and the cannibalism case are the chronicler\'s measure of how far Samaria went before the Aramean camp emptied itself.',
    { label: 'Requisition the private granaries', tooltip: '−40 governance points and "The Doors Off the Granaries" (+20% siege endurance, +0.9 unrest everywhere) for ten years; the city is fed and the great houses of the capital do not forget it.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { gov: -40, legitimacy: 8 });
        mod(ctx, 'h931_doors_off_granaries', 'The Doors Off the Granaries', { siegeMult: 1.2, unrestAll: 0.9 }, 120);
        h.chronicle(ctx, 'era', 'The guard opens the private granaries by list and issues by household. The heads of the great houses stand on the wall afterwards and say nothing.'); } },
    { label: 'Open terms with the Aramean', tooltip: '−300 talents, hostages and Damascus +35 regard; "Terms Under the Wall" (−1 unrest everywhere, +6% growth) for fifteen years, at −18 legitimacy. Nobody in the city starves and everybody in it knows what was paid.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { treasury: -300, legitimacy: -18 });
        mod(ctx, 'h931_terms_under_the_wall', 'Terms Under the Wall', { unrestAll: -1, growthMult: 1.06 }, 180);
        opinion(ctx, 'DMS', 'ISL', 35);
        h.chronicle(ctx, 'era', 'The gate is opened for envoys, the terms are silver and hostages, and the price of an ass\'s head in the capital is back to three pieces by the new moon.'); } }),

  H('ev931h_four_at_the_gate', 'Four Men Who Were Not Let In', -843, 2, 'ISL',
    'The four lepers who sit outside the gate, because they are not allowed inside it, worked '
    + 'out at dusk that sitting still killed them as certainly as walking into the Aramean camp '
    + 'and walked into the Aramean camp. It is empty. The tents are standing, the horses and '
    + 'asses are tied, the fires are lit and there is nobody in it.\n\nThey ate, they carried '
    + 'off silver and raiment and hid it, and then they came back and shouted at the porter '
    + 'that they were doing wrong to keep it to themselves. The staff officer on duty says it '
    + 'is a decoy — that the Arameans are lying in the fields to catch the city coming out — '
    + 'and he is not obviously wrong.',
    '2 Kings 7:3-20: the four leprous men, the abandoned camp, the scouts sent with two chariot teams, and the officer who doubted and was trodden to death in the gate by the crowd going out.',
    { label: 'Send two chariot teams to the Jordan before opening', tooltip: '+220 talents taken in order after a night\'s delay, and "The Camp Taken in Order" (+7% income, −0.5 unrest everywhere) for fifteen years. The countryside carries off a third of it while the scouts are out.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { treasury: 220, gov: 20 });
        mod(ctx, 'h931_camp_in_order', 'The Camp Taken in Order', { incomeMult: 1.07, unrestAll: -0.5 }, 180);
        h.chronicle(ctx, 'era', 'Two chariot teams follow the Aramean line to the Jordan and find the road strewn with garments and vessels cast away in the flight. The gates open at dawn, by list.'); } },
    { label: 'Open the gates now', tooltip: '+420 talents of plunder at once and "A Measure of Fine Flour for a Shekel" (+10% growth, −1.2 unrest everywhere) for ten years — against +0.8 unrest for two years and an officer of the household trodden to death in the gateway.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { treasury: 420, legitimacy: -6 });
        mod(ctx, 'h931_fine_flour', 'A Measure of Fine Flour for a Shekel', { growthMult: 1.1, unrestAll: -1.2 }, 120);
        mod(ctx, 'h931_trodden_in_the_gate', 'Trodden in the Gate', { unrestAll: 0.8 }, 24);
        h.chronicle(ctx, 'era', 'The whole city goes out at once and strips the camp by morning. The officer who had charge of the gate is trodden under foot in it and does not get up.'); } }),

  H('ev931h_the_cloth_in_water', 'A Cloth and a Basin of Water', -842, 5, 'ISL',
    'The king of Damascus is sick and sent his senior officer with forty camels\' burden of '
    + 'the good things of the city to ask an Israelite prophet whether he would recover. The '
    + 'answer that came back was in two halves: he will certainly recover, and he will '
    + 'certainly die. The officer went home, and in the morning the king was found dead with a '
    + 'thick cloth that had been dipped in water spread on his face.\n\nThe officer is now king '
    + 'of Damascus. Our own prophet is reported to have wept in front of him and told him, to '
    + 'his face, what he would do to this country\'s strongholds and young men and children. He '
    + 'has been on the throne eleven days and the army at Ramoth-Gilead wants a decision.',
    '2 Kings 8:7-15; the Tel Dan stele and the Assyrian annals confirm Hazael as a usurper — "son of a nobody" — who reigned some forty years and did exactly what the prophet said he would.',
    { label: 'Recognise him and buy the year', tooltip: '−200 talents in accession gifts, Damascus +35 regard, and "The Year Bought at Damascus" (+8% income, −0.4 unrest everywhere) for twelve years. The strongholds are not garrisoned and the prophecy is filed.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { treasury: -200, infl: 20 });
        mod(ctx, 'h931_year_bought', 'The Year Bought at Damascus', { incomeMult: 1.08, unrestAll: -0.4 }, 144);
        opinion(ctx, 'DMS', 'ISL', 35);
        h.chronicle(ctx, 'era', 'Envoys go north with accession gifts and come back with a treaty of friendship signed by a man who murdered his master with a wet cloth.'); } },
    { label: 'Take Ramoth-Gilead while he is eleven days old', tooltip: '−5,000 manpower and +2 war exhaustion for a strike at Gadora while Damascus is changing hands; "The Gilead Campaign" (+10% army strength, +8% morale) for fifteen years and Damascus at −70 regard.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { manpower: -5000, warExhaustion: 2, mar: 35 });
        mod(ctx, 'h931_gilead_campaign', 'The Gilead Campaign', { milPowerMult: 1.1, moraleMult: 1.08 }, 180);
        opinion(ctx, 'DMS', 'ISL', -70);
        h.setFlag(ctx, 'ramothCampaign', true);
        h.chronicle(ctx, 'era', 'The host goes up to Ramoth-Gilead against the Arameans in the first month of the new king\'s reign, which is the only month he is weak.'); } }),

  H('ev931h_the_oil_in_the_chamber', 'The Oil in the Inner Chamber', -841, 4, 'ISL',
    'The king is at Jezreel having arrow wounds taken at Ramoth-Gilead dressed, the king of '
    + 'the southern house is visiting him there, and the army is sitting in front of Ramoth '
    + 'under its captains with nothing to do. This afternoon a young man from one of the '
    + 'prophetic schools walked into the officers\' mess, said he had an errand to one of them, '
    + 'took him into an inner room, poured a flask of oil over his head, told him he was '
    + 'anointed king over Israel and that he was to strike the house of Ahab, opened the door '
    + 'and ran.\n\nThe captain came back out. The others asked him what the mad fellow wanted. '
    + 'He told them. Then they took their cloaks off and spread them under him on the bare '
    + 'stairs, and somebody blew a trumpet, and the succession of this kingdom was settled in a '
    + 'room with one door by eleven men who have not yet sent anybody to tell the palace.',
    '2 Kings 9:1-13. Jehu was anointed at Ramoth-Gilead in 841 by a messenger of Elisha; the Black Obelisk records his tribute to Shalmaneser III in the same year.',
    { label: 'Take the trumpet and shut the roads to Jezreel', tooltip: 'The army is the government: +25 legitimacy with the field officers and "The Anointing at Ramoth" (+12% army strength, +10% morale, +1 unrest everywhere) permanently, at −20 legitimacy for the dynasty and Tyre −50 regard.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { legitimacy: -20, mar: 45 });
        mod(ctx, 'h931_anointing_at_ramoth', 'The Anointing at Ramoth', { milPowerMult: 1.12, moraleMult: 1.1, unrestAll: 1 });
        opinion(ctx, 'TYR', 'ISL', -50);
        h.setFlag(ctx, 'jehuRising', true);
        h.chronicle(ctx, 'era', 'The watch is set on every road out of the camp so that none goes to tell it in Jezreel, and the chariots are made ready in the dark.'); } },
    { label: 'Put the oil away and hold the front', tooltip: '−35 governance points to buy the mess\'s silence and "The Front Held at Ramoth" (+1 fort defence, +8% manpower, −0.5 unrest everywhere) for twenty-five years. The dynasty keeps the throne and the officers keep the secret badly.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { gov: -35, legitimacy: 10 });
        mod(ctx, 'h931_front_held', 'The Front Held at Ramoth', { fortDefBonus: 1, manpowerMult: 1.08, unrestAll: -0.5 }, 300);
        h.setFlag(ctx, 'jehuRefused', true);
        h.chronicle(ctx, 'era', 'The captain washes the oil out of his hair, the mess agrees that a madman came and went, and the siege of Ramoth-Gilead goes on into the autumn.'); } }),

  H('ev931h_the_driving_is_furious', 'The Driving is Furious', -841, 5, 'ISL',
    'The watchman on the tower at Jezreel reported a company coming up the valley. A horseman '
    + 'was sent to ask whether it was peace and joined them. A second was sent and joined them. '
    + 'The watchman\'s third report is the one the household understood: the driving is like the '
    + 'driving of Jehu son of Nimshi, for he driveth furiously.\n\nThe king had his chariot '
    + 'harnessed and went out to meet the column himself, with the southern king beside him in '
    + 'his own chariot, and the two of them met it in the plot of ground that used to belong to '
    + 'Naboth the Jezreelite. He asked whether it was peace. The answer took the form of a '
    + 'question about his mother.',
    '2 Kings 9:14-28: Joram shot between the arms so that the arrow came out at his heart and was cast into Naboth\'s plot; Ahaziah of Judah was shot at the ascent of Gur and died at Megiddo.',
    { label: 'Draw the bow and cast him into Naboth\'s plot', tooltip: 'The house of Omri ends in an afternoon: "The Plot of Naboth Paid For" (+0.25 legitimacy a month, +0.8 unrest everywhere) permanently. Judah\'s king dies in the same hour: Judah −70 regard, Tyre −40.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { legitimacy: 15, mar: 25 });
        mod(ctx, 'h931_naboth_paid_for', 'The Plot of Naboth Paid For', { legitimacyAdd: 0.25, unrestAll: 0.8 });
        opinion(ctx, 'JDH', 'ISL', -70); opinion(ctx, 'TYR', 'ISL', -40);
        h.setRuler(ctx, 'ISL', { name: 'Jehu son of Nimshi', title: 'King of Israel', gov: 2, infl: 1, mar: 5, age: 42 });
        h.chronicle(ctx, 'era', 'The king is shot between the arms in Naboth\'s field and thrown into it, and the southern king, who came to visit a sick relative, is run down at the going up to Gur and dies at Megiddo.'); } },
    { label: 'Take him alive and try him for the vineyard', tooltip: '−50 governance points and eighteen months of hearings: "The Trial of the House of Omri" (+0.3 legitimacy a month, −8% income, +0.5 unrest everywhere) permanently. Judah is not touched and keeps its king.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { gov: -50, legitimacy: 20 });
        mod(ctx, 'h931_trial_of_omri', 'The Trial of the House of Omri', { legitimacyAdd: 0.3, incomeMult: 0.92, unrestAll: 0.5 });
        opinion(ctx, 'JDH', 'ISL', -20);
        h.chronicle(ctx, 'era', 'The king is taken in his own chariot and held at Jezreel, and the case of the vineyard is heard in public for a year and a half, which is a year and a half in which everybody chooses a side.'); } }),

  H('ev931h_the_window_at_jezreel', 'The Window at Jezreel', -841, 6, 'ISL',
    'The queen mother heard what had happened in the valley, painted her eyes, dressed her '
    + 'hair and sat at an upper window, and when the column came through the gate she called '
    + 'down and asked whether Zimri had peace, who murdered his master. Two or three of her own '
    + 'household eunuchs were at the window behind her. They were asked whose side they were on '
    + 'and they answered by throwing her into the street, and the horses went over her.\n\nShe '
    + 'is a king\'s daughter of Tyre. The party that came up from Ramoth wants her left where '
    + 'she is. The chancery points out that the cedar contracts, the shipyard share at Akko, '
    + 'the purple and half the grain sales are all attached to her marriage, and that Tyre will '
    + 'hear about this inside a fortnight either way.',
    '1 Kings 21:23 and 2 Kings 9:30-37: Jezebel thrown from the window and trodden by the horses; when they went to bury her, being a king\'s daughter, they found no more of her than the skull, the feet and the palms of her hands.',
    { label: 'Let the sentence stand', tooltip: '"The Skull, the Feet and the Palms" (+0.2 legitimacy a month, +8% manpower) permanently, at Tyre −80 regard and −15% trade permanently. The western treaties go with her.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { legitimacy: 12 });
        mod(ctx, 'h931_skull_feet_palms', 'The Skull, the Feet and the Palms', { legitimacyAdd: 0.2, manpowerMult: 1.08, tradeMult: 0.85 });
        opinion(ctx, 'TYR', 'ISL', -80);
        h.chronicle(ctx, 'era', 'They eat and drink first and then send to bury her, being a king\'s daughter, and find the skull and the feet and the palms of her hands and nothing else.'); } },
    { label: 'Bury her as a king\'s daughter and write to Tyre', tooltip: '−150 talents for the funeral and the embassy; Tyre −25 regard only and "The Akko Share Kept" (+10% trade, +6% income) permanently, against +1 unrest everywhere and −12 legitimacy with the men who came up from Ramoth.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { treasury: -150, legitimacy: -12, infl: 20 });
        mod(ctx, 'h931_akko_share_kept', 'The Akko Share Kept', { tradeMult: 1.1, incomeMult: 1.06, unrestAll: 1 });
        opinion(ctx, 'TYR', 'ISL', -25);
        h.chronicle(ctx, 'era', 'What is left is gathered up and buried with her titles read out, and a letter goes to Tyre explaining that a queen fell from a window during a disturbance.'); } }),

  H('ev931h_baskets_at_the_gate', 'Two Heaps at the Gate', -841, 7, 'ISL',
    'The old king\'s seventy sons are in the capital, in the houses of the men who brought them '
    + 'up — the elders of the city, the rulers of Jezreel, the tutors. A letter has gone to '
    + 'them inviting them to choose the best and fittest of their master\'s sons, set him on his '
    + 'father\'s throne and fight for their master\'s house, which is an offer of war phrased as '
    + 'a courtesy.\n\nThey have answered that they are servants and will do whatever they are '
    + 'told and will make no man king. The second letter is already drafted. It asks them to '
    + 'bring the heads of their master\'s sons to Jezreel by this time tomorrow, and the point '
    + 'of asking them is that afterwards there will be no faction in the capital that can '
    + 'pretend its hands are clean.',
    '2 Kings 10:1-11. The heads came in baskets and were laid in two heaps at the entering in of the gate until the morning, when the new king told the people that they were righteous and he alone had conspired.',
    { label: 'Make the capital\'s own notables do it', tooltip: '"The Two Heaps" (+0.25 legitimacy a month, −0.6 unrest everywhere, +10% cost of governing) permanently: the elders of Samaria are accomplices and can never lead a restoration. −20 legitimacy abroad.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { legitimacy: -20, gov: 25 });
        mod(ctx, 'h931_two_heaps', 'The Two Heaps', { legitimacyAdd: 0.25, unrestAll: -0.6, adminMult: 1.1 });
        opinion(ctx, 'JDH', 'ISL', -30); opinion(ctx, 'TYR', 'ISL', -30);
        h.chronicle(ctx, 'era', 'The baskets come down from Sebaste overnight and are laid in two heaps at the gate until morning, and in the morning the people are told that they are righteous.'); } },
    { label: 'Use our own guard and leave the notables clean', tooltip: '−45 governance points and "The Houses of the Capital Untouched" (+8% income, +0.9 unrest everywhere) permanently: the old families keep their honour, their tenants and a claimant to talk about.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { gov: -45, legitimacy: -8 });
        mod(ctx, 'h931_houses_untouched', 'The Houses of the Capital Untouched', { incomeMult: 1.08, unrestAll: 0.9 });
        h.chronicle(ctx, 'era', 'The guard does it in one night without the elders of the capital being asked to hold a knife, and the elders of the capital remember that they were not asked.'); } }),

  H('ev931h_the_vestments_and_the_eighty', 'A Great Sacrifice to Baal', -840, 9, 'ISL',
    'The proclamation has gone out to every district: a great sacrifice to Baal, larger than '
    + 'anything the old king ever offered, and every prophet, priest and servant of the god is '
    + 'summoned to attend on pain of his life. The keeper of the wardrobe has been told to '
    + 'issue vestments at the door so that everybody inside the court is dressed alike and it '
    + 'can be established, by inspection, that no servant of the other party is standing among '
    + 'them.\n\nEighty men of the guard are to be posted outside with instructions about anybody '
    + 'who comes out. The chancery asks the court to consider what the alternative costs: an '
    + 'expulsion order leaves the priesthood alive on the Phoenician coast, at Akko and Tyre '
    + 'and Dor, thirty miles away, with their endowments and their correspondence.',
    '2 Kings 10:18-28: the assembly, the vestments, the eighty men at the door, and the house of Baal broken down and made a draught house "unto this day".',
    { label: 'Hold the sacrifice and post the eighty', tooltip: '+300 talents of confiscated endowments and "The House Made a Draught House" (+0.3 legitimacy a month, −0.8 unrest everywhere) permanently — against −18% trade permanently and Tyre at −60 regard. The party is gone.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { treasury: 300, legitimacy: 15 });
        mod(ctx, 'h931_draught_house', 'The House Made a Draught House', { legitimacyAdd: 0.3, unrestAll: -0.8, tradeMult: 0.82 });
        opinion(ctx, 'TYR', 'ISL', -60);
        h.setFlag(ctx, 'baalPurge', true);
        h.chronicle(ctx, 'era', 'The house is filled from one end to the other, the vestments are issued at the door, and the eighty are at the door. The building is pulled down afterwards and used as a latrine.'); } },
    { label: 'Close the temple and put the priesthood on ships', tooltip: '+120 talents of endowments and "The Priesthood Deported" (+0.15 legitimacy a month, −6% trade) permanently, at Tyre −20 regard only. The cult survives at Akko and Dor and its patrons here keep their names.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { treasury: 120, legitimacy: 8, infl: 15 });
        mod(ctx, 'h931_priesthood_deported', 'The Priesthood Deported', { legitimacyAdd: 0.15, tradeMult: 0.94 });
        mod(ctx, 'h931_cult_across_the_water', 'The Cult Across the Water', { unrestAll: 0.4 }, 240);
        opinion(ctx, 'TYR', 'ISL', -20);
        h.chronicle(ctx, 'era', 'The temple is shut and sealed, the priesthood is put on Tyrian ships at Dor with its vessels, and the endowments are taken into the treasury.'); } }),

  H('ev931h_the_royal_seed', 'The Royal Seed', -841, 11, 'JDH',
    'The king went north to visit his cousin at Jezreel and was shot in his chariot at the '
    + 'ascent of Gur by men who were not at war with this kingdom. His mother, who is of the '
    + 'northern house and of Tyre behind it, has not called a council. She has sent the guard '
    + 'to the royal apartments with a list of the king\'s sons and brothers on it, and by this '
    + 'evening there will be no other claimant in the city.\n\nOne child is missing from the '
    + 'list, and the officer who compiled it has not noticed. The king\'s sister, who is married '
    + 'to a priest, took the infant and his nurse out of the bedchamber where the murdered '
    + 'princes were sleeping and has him in the temple precinct, which the queen\'s warrant does '
    + 'not run into.',
    '2 Kings 11:1-3 and 2 Chronicles 22:10-12: Athaliah destroyed all the seed royal; Jehosheba hid Joash and his nurse, and he was with her in the house of the LORD six years while she reigned.',
    { label: 'Let the queen take the government', tooltip: '+30 governance points and "The Queen in Jerusalem" (+10% trade, +8% income, −0.15 legitimacy a month) for the length of her reign; Tyre +40 regard. The temple keeps a secret it will spend six years keeping.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { gov: 30, legitimacy: -20 });
        mod(ctx, 'h931_queen_in_jerusalem', 'The Queen in Jerusalem', { tradeMult: 1.1, incomeMult: 1.08, legitimacyAdd: -0.15 });
        opinion(ctx, 'TYR', 'JDH', 40);
        h.setRuler(ctx, 'JDH', { name: 'Athaliah', title: 'Queen of Judah', gov: 3, infl: 3, mar: 2, age: 45 });
        h.setFlag(ctx, 'athaliahReigns', true);
        h.chronicle(ctx, 'era', 'The seed royal is destroyed in one evening and the king\'s mother takes the throne, the first and last woman to sit on it. One infant is in the temple with his nurse and is not on any list.'); } },
    { label: 'The houses of Judah rise for the dynasty now', tooltip: '−6,000 manpower, +2 war exhaustion and −25 governance points for a rising without a candidate anyone can produce: "The Houses in Arms" (+10% morale, +1.2 unrest everywhere) for ten years. The child in the temple is now known about.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { manpower: -6000, warExhaustion: 2, gov: -25, legitimacy: 10 });
        mod(ctx, 'h931_houses_in_arms', 'The Houses in Arms', { moraleMult: 1.1, unrestAll: 1.2 }, 120);
        opinion(ctx, 'TYR', 'JDH', -40);
        h.chronicle(ctx, 'era', 'The heads of Judah come up armed and the city is fought over street by street for a fortnight, which is a fortnight in which every man in it learns that there is a child in the temple.'); } }),

  H('ev931h_treason_treason', 'Treason, Treason', -835, 6, 'JDH',
    'The boy is seven and has lived in a store-chamber of the temple since he could walk. The '
    + 'priest has spent the winter on arithmetic: the captains of hundreds of the Carite guard '
    + 'and of the runners, the two watches that change on the sabbath, and the spears and '
    + 'shields that have been in the temple treasury since David and can be issued to men who '
    + 'are already inside the building without a single weapon being carried through a '
    + 'gate.\n\nThe alternative on the table is a negotiation: the queen keeps the government, '
    + 'the boy is produced, acknowledged and made heir, and nobody is killed. The Tyrian '
    + 'treaties survive. So does a queen who has already killed every other member of this '
    + 'family.',
    '2 Kings 11:4-20: Jehoiada armed the guard from the temple stores, crowned Joash by the pillar and gave him the testimony; Athaliah rent her clothes and cried "Treason, treason", and was killed at the entering of the horse gate.',
    { label: 'Crown the child in the court', tooltip: '−40 governance points and "The Covenant of Jehoiada" (+0.3 legitimacy a month, −0.6 unrest everywhere, +8% manpower) permanently, at −12% trade and Tyre −50 regard: a priest governs for a decade and the western treaties lapse.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { gov: -40, legitimacy: 25 });
        mod(ctx, 'h931_covenant_of_jehoiada', 'The Covenant of Jehoiada', { legitimacyAdd: 0.3, unrestAll: -0.6, manpowerMult: 1.08, tradeMult: 0.88 });
        opinion(ctx, 'TYR', 'JDH', -50);
        h.setRuler(ctx, 'JDH', { name: 'Jehoash son of Ahaziah', title: 'King of Judah', gov: 2, infl: 2, mar: 1, age: 7 });
        h.setFlag(ctx, 'joashCrowned', true);
        h.chronicle(ctx, 'era', 'The guard is armed from the temple stores and set from the right corner of the house to the left, the crown and the testimony are put on a seven-year-old, and the queen comes in, sees him standing by the pillar, and is taken out to the horse gate.'); } },
    { label: 'Produce the boy and treat with the queen', tooltip: '+35 governance points, Tyre +30 regard and "The Acknowledged Heir" (+10% trade, +7% income, −0.2 legitimacy a month) permanently. No blood, a recognised succession, and a regent nobody in the temple will turn their back on.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { gov: 35, legitimacy: -10 });
        mod(ctx, 'h931_acknowledged_heir', 'The Acknowledged Heir', { tradeMult: 1.1, incomeMult: 1.07, legitimacyAdd: -0.2 });
        opinion(ctx, 'TYR', 'JDH', 30);
        h.chronicle(ctx, 'era', 'The child is brought out of the temple by daylight and presented, the queen acknowledges him as heir before the assembly, and the guard goes back to its barracks with its spears in the racks.'); } }),

  H('ev931h_the_servants_on_the_bed', 'The Servants on the Bed', -796, 2, 'JDH',
    'The priest who raised the king has been dead four years and was buried among the kings, '
    + 'which no priest had been before. Since the funeral the princes of Judah have come to the '
    + 'palace and made their obeisance and been listened to, and the settlement he built — the '
    + 'chest, the joint count, the assizes, the courts of the house — has been quietly taken '
    + 'apart in their favour.\n\nThe priest\'s son stood up in the court of the house last month '
    + 'and asked, in public, why the commandments were being transgressed, and was stoned in '
    + 'that court by order. The Aramean raid that came up in the autumn took the city\'s '
    + 'treasure with a small company against a large army. The king is in bed with wounds and '
    + 'his household officers have been meeting without him.',
    '2 Chronicles 24:17-26: after Jehoiada\'s death Joash hearkened to the princes, Zechariah was stoned in the court of the house, the Syrians came with a small company, and his own servants slew him on his bed; he was buried in the city but not in the sepulchres of the kings.',
    { label: 'Govern with the princes', tooltip: '+12% income and +45 governance points ("The Princes of Judah") permanently, at −0.25 legitimacy a month and +1 unrest everywhere. The household officers settle their account with the king personally.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { gov: 45, legitimacy: -25 });
        mod(ctx, 'h931_princes_of_judah', 'The Princes of Judah', { incomeMult: 1.12, legitimacyAdd: -0.25, unrestAll: 1 });
        h.rulerDies(ctx, 'JDH', 'slain on his bed by his own servants for the blood of the sons of Jehoiada');
        h.chronicle(ctx, 'era', 'The king is killed on his bed by two of his own household officers and buried in the city of David, but not in the sepulchres of the kings.'); } },
    { label: 'Keep the priest\'s settlement without the priest', tooltip: '−55 governance points and −8% income permanently, against "The Chest Kept" (+0.25 legitimacy a month, −0.7 unrest everywhere, −10% cost of governing) permanently. The princes are refused and go on being the men who hold the country.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { gov: -55, legitimacy: 18 });
        mod(ctx, 'h931_chest_kept', 'The Chest Kept', { legitimacyAdd: 0.25, unrestAll: -0.7, adminMult: 0.9, incomeMult: 0.92 });
        h.chronicle(ctx, 'era', 'The assizes and the joint count stand, the princes are heard and not obeyed, and the king sleeps with the guard doubled for the rest of his reign.'); } }),

  H('ev931h_the_gods_of_seir', 'The Gods of Seir', -790, 3, 'JDH',
    'The Edom campaign has come back and the arithmetic in the dispatch is ten thousand killed '
    + 'in the Valley of Salt and ten thousand taken alive and brought to the top of the rock at '
    + 'Sela and thrown off it. The southern trade road is open, the copper districts are ours '
    + 'again, and the army is in the best condition it has been in for fifty years.\n\nThe '
    + 'baggage also contains the gods of the children of Seir, which the king has had set up and '
    + 'has been burning incense to. A prophet asked him in the audience chamber why he sought '
    + 'after gods that could not deliver their own people out of his hand, and was asked in '
    + 'return whether he had been made of the king\'s counsel.',
    '2 Chronicles 25:11-16 and 2 Kings 14:7: Amaziah took Sela, threw ten thousand Edomites from the rock, brought home the gods of Seir and worshipped them, and told the prophet who objected to forbear.',
    { label: 'Keep the images and govern Edom through its own priests', tooltip: '+250 talents of tribute and "Edom Governed Cheaply" (+10% income, +8% trade, −5% cost of governing) permanently; Edom +35 regard, at −0.2 legitimacy a month and the temple party permanently hostile.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: 250, legitimacy: -15 });
        mod(ctx, 'h931_edom_governed_cheaply', 'Edom Governed Cheaply', { incomeMult: 1.1, tradeMult: 1.08, adminMult: 0.95, legitimacyAdd: -0.2 });
        opinion(ctx, 'EDM', 'JDH', 35);
        h.chronicle(ctx, 'era', 'The gods of Seir are set up in the capital and served, and the Edomite priesthoods are left in place to collect the tribute they have always collected.'); } },
    { label: 'Burn them and garrison Sela', tooltip: '−200 talents and −4,000 manpower for a garrison on the rock; "The Rock Held" (+1 fort defence, +10% army strength, +0.2 legitimacy a month) permanently, at Edom −60 regard and a province that has to be held with men rather than priests.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -200, manpower: -4000, legitimacy: 15, mar: 30 });
        mod(ctx, 'h931_the_rock_held', 'The Rock Held', { fortDefBonus: 1, milPowerMult: 1.1, legitimacyAdd: 0.2 });
        opinion(ctx, 'EDM', 'JDH', -60);
        h.chronicle(ctx, 'era', 'The images are burned in the valley below the city and a standing garrison goes into Sela, which costs in a year what the images would have cost in nothing.'); } }),

  H('ev931h_the_word_by_jonah', 'The Word by Jonah of Gath-Hepher', -779, 5, 'ISL',
    'The court prophet is a villager from Gath-hepher in Zebulun and the word he has given is '
    + 'the most expensive one any prophet has given this dynasty: that the border is to be '
    + 'restored from the entering in of Hamath to the sea of the plain, which means Transjordan, '
    + 'the Bashan, the caravan road and the customs on everything that moves between Damascus '
    + 'and the Gulf.\n\nThe same man has told the council that he is to be sent to Nineveh with '
    + 'a warning, which the war ministry regards as insane and the chancery regards as the '
    + 'cheapest intelligence operation ever proposed: a city three days\' journey across, an '
    + 'army that will be on this border within a lifetime, and no Israelite officer has ever '
    + 'seen either.',
    '2 Kings 14:25 credits Jeroboam II\'s restoration of the border to the word of Jonah son of Amittai of Gath-hepher; the book that sends him to Nineveh is written much later and about him.',
    { label: 'Take the border and leave Nineveh alone', tooltip: '−6,000 manpower and "From the Entering of Hamath" (+12% income, +10% trade, +6% force limit) permanently. Nobody from this court sees Assyria until Assyria arrives.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { manpower: -6000, treasury: 150, mar: 30 });
        mod(ctx, 'h931_entering_of_hamath', 'From the Entering of Hamath', { incomeMult: 1.12, tradeMult: 1.1, forceLimitMult: 1.06 });
        h.chronicle(ctx, 'era', 'The columns go up the King\'s Highway as far as the entering in of Hamath and the customs posts go up behind them.'); } },
    { label: 'Send the embassy to Nineveh', tooltip: '−40 talents and +45 influence points; Assyria +40 regard and "What Was Seen at Nineveh" (−8% cost of governing, +1 fort defence, +8% siege endurance) permanently — a survey of the enemy\'s capital, bought for the price of a caravan.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { treasury: -40, infl: 45 });
        mod(ctx, 'h931_seen_at_nineveh', 'What Was Seen at Nineveh', { adminMult: 0.92, fortDefBonus: 1, siegeMult: 1.08 });
        opinion(ctx, 'ASR', 'ISL', 40);
        h.chronicle(ctx, 'era', 'The embassy goes east with a caravan and comes back in the second year with a description of the walls, the canals, the arsenal and the muster of Nineveh, which is filed.'); } }),

  H('ev931h_wife_of_whoredoms', 'Go, Take Unto Thee a Wife', -755, 4, 'ISL',
    'A priest\'s son from the hill country has married a woman of known reputation in public, '
    + 'on the stated ground that he was told to, and that the marriage is an argument: that '
    + 'this country has behaved towards its god the way she has behaved towards him, and that '
    + 'he is going to take her back anyway when she has finished. He has bought her back once '
    + 'already, for fifteen pieces of silver and a homer and a half of barley, and entered the '
    + 'price.\n\nIt is being discussed in every market in the kingdom, and the part being '
    + 'discussed is not the woman. It is the line about the calves at Bethel and Dan, the line '
    + 'about the priests being a band of robbers, and the line about Assyria — that this court '
    + 'has gone to Assyria like a silly dove and hired lovers among the nations.',
    'Hosea 1 and 3: the marriage to Gomer bath-Diblaim, the purchase at fifteen pieces of silver and a homer and a half of barley, and an oracle aimed squarely at the northern state cult in the last years before the collapse.',
    { label: 'Leave him alone', tooltip: '+0.9 unrest everywhere and −0.15 legitimacy a month permanently ("The Argument in the Markets"), against +35 influence points: the crown is seen to tolerate the loudest man in the kingdom, and the oracles are written down where they are spoken.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { infl: 35, legitimacy: -8 });
        mod(ctx, 'h931_argument_in_the_markets', 'The Argument in the Markets', { unrestAll: 0.9, legitimacyAdd: -0.15 });
        h.chronicle(ctx, 'era', 'No warrant is issued. The man goes on standing in the markets with his wife and his argument, and somebody begins writing it down.'); } },
    { label: 'Bind him over to the priest at Bethel', tooltip: '−30 governance points and "The King\'s Sanctuary Enforced" (+8% income, −0.5 unrest everywhere) for twenty years, at −15 legitimacy. He is silenced here and the collection is finished in the southern kingdom.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { gov: -30, legitimacy: -15 });
        mod(ctx, 'h931_sanctuary_enforced', 'The King\'s Sanctuary Enforced', { incomeMult: 1.08, unrestAll: -0.5 }, 240);
        h.chronicle(ctx, 'era', 'He is bound over to keep silence within a day\'s journey of Bethel, and keeps it there and nowhere else.'); } }),

  H('ev931h_not_pitied_not_my_people', 'Lo-Ruhamah and Lo-Ammi', -753, 2, 'ISL',
    'The same man has now named his children, and the registrar of the district has refused to '
    + 'enter two of the three names and has referred the matter up. The first is Jezreel, for '
    + 'the blood of Jezreel, which he says will be avenged on this house — this house being the '
    + 'reigning one, in its fourth generation and its last legitimate year. The second is '
    + 'Lo-ruhamah, Not-Pitied. The third is Lo-ammi, Not-My-People.\n\nThe chancery observes '
    + 'that the oracle has a second half which is rarely quoted: that in the place where it was '
    + 'said to them, ye are not my people, it shall be said unto them, ye are the sons of the '
    + 'living God, and that the names will be changed. Reading the second half in public means '
    + 'admitting the first half, including the sentence about Jezreel.',
    'Hosea 1:4-11. Zechariah son of Jeroboam, the last of Jehu\'s line, was murdered within a year of this oracle; the reversal of the names in Hosea 2:23 is quoted for the next eight centuries.',
    { label: 'Enter the names as given and read the reversal aloud', tooltip: '−18 legitimacy for a dynasty that has publicly accepted the charge of Jezreel, against "The Names Shall Be Changed" (+0.25 legitimacy a month, −0.8 unrest everywhere) permanently and +30 influence points.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { legitimacy: -18, infl: 30 });
        mod(ctx, 'h931_names_changed', 'The Names Shall Be Changed', { legitimacyAdd: 0.25, unrestAll: -0.8 });
        h.chronicle(ctx, 'era', 'The three names go into the roll as given, and the second half of the oracle is read out in the court of the sanctuary, which means the first half has been read out too.'); } },
    { label: 'Refuse the register: enter them under the father\'s name', tooltip: '+40 governance points and "The Roll Kept Clean" (+7% income, −0.3 unrest everywhere) for fifteen years. The names circulate anyway, and the crown has been seen to mind them.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { gov: 40, legitimacy: -6 });
        mod(ctx, 'h931_roll_kept_clean', 'The Roll Kept Clean', { incomeMult: 1.07, unrestAll: -0.3 }, 180);
        h.chronicle(ctx, 'era', 'The registrar enters three sons of a priest\'s son of the hill country by their father\'s name and no other, and everybody in the district goes on using the other names.'); } }),

  H('ev931h_four_kings_one_year', 'Four Kings and One Year', -752, 4, 'ISL',
    'The fourth king of this house lasted six months and was struck down in front of the '
    + 'people by a man from the Jordan valley, who held the capital for a full month before a '
    + 'district commander came up from Tirzah with the Gilead levies and killed him in it. The '
    + 'commander is in the palace now. Tiphsah shut its gates to him on the road and he has '
    + 'taken it and done to it what is done to towns that shut their gates, including the women '
    + 'with child.\n\nThe assembly of the northern houses is the other way this has been settled '
    + 'in the past, at Shechem, twice. It takes six weeks, it produces a king the houses have '
    + 'chosen, and it gives the Gilead levies six weeks to think about whether they are being '
    + 'asked to disperse.',
    '2 Kings 15:8-16: Zechariah slain by Shallum, who reigned a full month in Samaria; Menahem came up from Tirzah, killed him, and smote Tiphsah because it would not open to him.',
    { label: 'Let the man with the Gilead levies take it', tooltip: '+40 governance points and "The Levies in the Palace" (+10% army strength, +8% manpower, +0.9 unrest everywhere) permanently, at −25 legitimacy: a soldier holds the throne and everybody in the kingdom has seen how it is done.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { gov: 40, legitimacy: -25 });
        mod(ctx, 'h931_levies_in_the_palace', 'The Levies in the Palace', { milPowerMult: 1.1, manpowerMult: 1.08, unrestAll: 0.9 });
        h.setRuler(ctx, 'ISL', { name: 'Menahem son of Gadi', title: 'King of Israel', gov: 2, infl: 1, mar: 4, age: 44 });
        h.chronicle(ctx, 'era', 'Four men are called king of Israel inside a year and the fourth is the one with the Gilead levies behind him. Tiphsah, which shut its gates, is not left standing.'); } },
    { label: 'Call the assembly of the northern houses', tooltip: '−50 governance points and six weeks of deadlock: "The Houses Choose" (+0.3 legitimacy a month, −0.7 unrest everywhere, −8% army strength) permanently. The Gilead levies are sent home unpaid and remember it.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { gov: -50, legitimacy: 20, mar: -20 });
        mod(ctx, 'h931_houses_choose', 'The Houses Choose', { legitimacyAdd: 0.3, unrestAll: -0.7, milPowerMult: 0.92 });
        h.chronicle(ctx, 'era', 'The heads of the northern houses are called to Shechem as they were called in the old days, and they choose a king in six weeks, which is five weeks longer than a sword takes.'); } }),

  H('ev931h_a_thousand_talents_for_pul', 'A Thousand Talents for Pul', -738, 3, 'ISL',
    'The Assyrian is in the land with the main field army and has named his price for going '
    + 'away and for confirming the kingdom in the present king\'s hand: one thousand talents of '
    + 'silver, which is more silver than has ever been in this country at one time.\n\nThe '
    + 'treasurer has the only arithmetic that works. Sixty thousand men of substance, assessed '
    + 'at fifty shekels of silver each, paid within the year. That is every landowner, every '
    + 'caravan factor and every oil and wine house in the kingdom, and it is the first time any '
    + 'king here has taxed the mighty men of wealth directly rather than through their '
    + 'districts.',
    '2 Kings 15:19-20: Menahem gave Pul — Tiglath-Pileser III — a thousand talents of silver, exacted of the mighty men of wealth, fifty shekels of each man, "that his hand might be with him to confirm the kingdom in his hand".',
    { label: 'Assess the sixty thousand', tooltip: '−1,000 talents to Assyria; Assyria +55 regard and "Confirmed in His Hand" (−0.6 unrest everywhere, +6% manpower) for twenty years, against "The Mighty Men Assessed" (−12% income, +0.8 unrest) for fifteen. The throne is guaranteed by the man who will take the kingdom.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { treasury: -1000, legitimacy: -10 });
        mod(ctx, 'h931_confirmed_in_his_hand', 'Confirmed in His Hand', { unrestAll: -0.6, manpowerMult: 1.06 }, 240);
        mod(ctx, 'h931_mighty_men_assessed', 'The Mighty Men Assessed', { incomeMult: 0.88, unrestAll: 0.8 }, 180);
        opinion(ctx, 'ASR', 'ISL', 55);
        h.setFlag(ctx, 'menahemTribute', true);
        h.chronicle(ctx, 'era', 'Sixty thousand men of substance are assessed at fifty shekels a head and the silver goes north in the same season, and the Assyrian turns back from the land.'); } },
    { label: 'Pay out of the crown stores and the sanctuaries', tooltip: '−700 talents and the Bethel and Dan treasuries stripped: "The Sanctuaries Emptied" (−0.25 legitimacy a month, +1 unrest everywhere) permanently, but the landowners are untouched and +8% income permanently. Assyria +35 regard and a shortfall it will remember.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { treasury: -700, legitimacy: -20, infl: -20 });
        mod(ctx, 'h931_sanctuaries_emptied', 'The Sanctuaries Emptied', { legitimacyAdd: -0.25, unrestAll: 1, incomeMult: 1.08 });
        opinion(ctx, 'ASR', 'ISL', 35);
        h.chronicle(ctx, 'era', 'The calves keep their plating and lose everything behind them, the crown stores go north with the sanctuary vessels, and the great houses are told that they have been spared.'); } }),

  H('ev931h_the_league_against_jerusalem', 'The League Against Jerusalem', -734, 4, 'ISL',
    'Damascus has a plan for the southern kingdom and wants this court in it: a joint march on '
    + 'Jerusalem, the removal of the house of David from it, and the son of Tabeel — a man with '
    + 'no claim and no following, which is the point — set on the throne in its place. The '
    + 'grievance is real. The south will not join the coalition against Assyria, and an '
    + 'unfriendly kingdom astride the hill road is a knife behind the coalition\'s line.\n\nThe '
    + 'chancery\'s objection is arithmetical. The Assyrian field army is at Arpad. A siege of '
    + 'Jerusalem takes a season, the Galilee garrisons come out of the north to make up the '
    + 'numbers, and the road down the coast to the Egyptian border runs past our own front '
    + 'door while they are gone.',
    'The Syro-Ephraimite war of 734-732: Rezin of Damascus and Pekah of Israel besieged Ahaz in Jerusalem to install "the son of Tabeal" (Isaiah 7:6), and Tiglath-Pileser III answered the appeal that resulted.',
    { label: 'March with Rezin', tooltip: '−7,000 manpower, +2 war exhaustion and war with Judah; Damascus +60 regard and "The Coalition in the Field" (+10% army strength, +8% morale) for twelve years, at Assyria −70 regard and the northern districts stripped of troops.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { manpower: -7000, warExhaustion: 2, mar: 30 });
        mod(ctx, 'h931_coalition_in_the_field', 'The Coalition in the Field', { milPowerMult: 1.1, moraleMult: 1.08 }, 144);
        mod(ctx, 'h931_north_stripped', 'The Northern Districts Stripped', { fortDefBonus: -1, unrestAll: 0.6 }, 96);
        opinion(ctx, 'DMS', 'ISL', 60); opinion(ctx, 'JDH', 'ISL', -80); opinion(ctx, 'ASR', 'ISL', -70);
        h.declareWar(ctx, 'ISL', 'JDH', 'The War of the Son of Tabeel');
        h.chronicle(ctx, 'era', 'The northern levies go south with the Arameans to put a nobody on the throne of David, and the Galilee garrisons go with them.'); } },
    { label: 'Refuse the league and keep paying Assyria', tooltip: '−350 talents of tribute kept current and "The Tribute Kept Current" (+1 fort defence, +8% manpower, −0.4 unrest everywhere) for twenty years; Assyria +40 regard, Damascus −70, and a hostile Aramean army on the only land border we have.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { treasury: -350, legitimacy: 8 });
        mod(ctx, 'h931_tribute_kept_current', 'The Tribute Kept Current', { fortDefBonus: 1, manpowerMult: 1.08, unrestAll: -0.4 }, 240);
        opinion(ctx, 'ASR', 'ISL', 40); opinion(ctx, 'DMS', 'ISL', -70);
        h.chronicle(ctx, 'era', 'The Aramean envoys go home without an army and the year\'s tribute goes to Assyria on time, which buys nothing except time.'); } }),

  H('ev931h_thy_servant_and_thy_son', 'I Am Thy Servant and Thy Son', -733, 2, 'JDH',
    'There are two armies in the hill country, Aramean and Israelite, with an agreed candidate '
    + 'for this throne travelling behind them; Edom has taken Elath back and cleared our people '
    + 'out of it; and Philistine columns are in the Shephelah and the Negeb taking towns that '
    + 'were fortified two generations ago. The city is provisioned and the conduit is '
    + 'covered.\n\nThere is a man standing at the end of the conduit of the upper pool telling '
    + 'the king to take heed and be quiet and not to be afraid of two tails of smoking '
    + 'firebrands, and that the confederacy will not stand. There is also an embassy packed and '
    + 'waiting, with the silver and gold of the house and of the palace treasuries on mules, '
    + 'and a letter that begins: I am thy servant and thy son.',
    '2 Kings 16:5-9 and Isaiah 7: Ahaz appealed to Tiglath-Pileser III with the treasures of the temple and the palace; Assyria took Damascus and killed Rezin, and Judah became a tributary.',
    { label: 'Send the letter and the treasure to Tiglath-Pileser', tooltip: '−450 talents; Assyria +70 regard, Damascus destroyed and the siege lifted. "Servant and Son" (−0.7 unrest everywhere, +10% trade, −0.2 legitimacy a month, −10% army strength) permanently: an altar copied from Damascus goes into the temple court.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -450, legitimacy: -18, infl: 25 });
        mod(ctx, 'h931_servant_and_son', 'Servant and Son', { unrestAll: -0.7, tradeMult: 1.1, legitimacyAdd: -0.2, milPowerMult: 0.9 });
        opinion(ctx, 'ASR', 'JDH', 70); opinion(ctx, 'DMS', 'JDH', -60);
        h.setFlag(ctx, 'ahazAppeal', true);
        h.chronicle(ctx, 'era', 'The treasure of the house and the palace goes to Assyria with a letter of submission, Damascus falls within two years, and the king comes home from meeting his protector there with the measurements of an altar.'); } },
    { label: 'Be quiet and hold the walls', tooltip: '−5,000 manpower and +2 war exhaustion for a siege held without help; "Take Heed and Be Quiet" (+0.3 legitimacy a month, +15% siege endurance, +1 fort defence) permanently, and no tribute, no altar and no protector.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { manpower: -5000, warExhaustion: 2, legitimacy: 25, mar: 25 });
        mod(ctx, 'h931_take_heed_be_quiet', 'Take Heed and Be Quiet', { legitimacyAdd: 0.3, siegeMult: 1.15, fortDefBonus: 1 });
        opinion(ctx, 'ASR', 'JDH', -30);
        h.chronicle(ctx, 'era', 'The embassy is unpacked and the treasure stays in the house. The two armies sit in front of the city until the Assyrian comes down the coast on his own account, which he was going to do anyway.'); } }),

  H('ev931h_cities_of_naphtali', 'Ijon, Abel, Janoah, Kedesh, Hazor', -732, 8, 'ISL',
    'The Assyrian answered the southern appeal by coming down the coast and then turning '
    + 'inland, and the northern half of this kingdom is gone in one campaign: Ijon, '
    + 'Abel-beth-maacah, Janoah, Kedesh, Hazor, Gilead, Galilee, all the land of Naphtali, with '
    + 'the population marched east. What is left is the hill country round the capital and the '
    + 'Ephraim ridge.\n\nThe king who made the league is dead — a conspiracy of one of his own '
    + 'officers, who is in the palace and has been confirmed in it from Assyria on terms. The '
    + 'terms are annual tribute and the formal cession of everything already lost, signed, '
    + 'which is the difference between a defeat and a frontier.',
    'The annals of Tiglath-Pileser III and 2 Kings 15:29-30: the northern and Transjordanian districts annexed in 733-732, the population deported, and Hoshea installed after conspiring against Pekah.',
    { label: 'Sign the cession and keep the hills', tooltip: 'Hazor, Dan and Ramoth-Gilead pass to Assyria where we still hold them; −250 talents a year of tribute and "The Kingdom of the Hills" (−0.6 unrest everywhere, +8% income on what is left) permanently. Assyria +50 regard.',
      fx: (ctx) => { const h = ctx.helpers; const me = P(ctx);
        h.adjust(ctx, 'ISL', { treasury: -250, legitimacy: -20 });
        for (const n of ['Safed', 'Caesarea Philippi', 'Gadora']) {
          if (h.holds(ctx, me, n)) h.changeOwner(ctx, n, 'ASR');
        }
        mod(ctx, 'h931_kingdom_of_the_hills', 'The Kingdom of the Hills', { unrestAll: -0.6, incomeMult: 1.08 });
        opinion(ctx, 'ASR', 'ISL', 50);
        h.chronicle(ctx, 'era', 'The northern districts are signed away in writing and the people of Galilee and Gilead go east in columns. What is left of Israel is a day\'s ride across.'); } },
    { label: 'Refuse to sign and keep the claim', tooltip: '−4,000 manpower to garrison a line that cannot be held and "The Claim Unsurrendered" (+10% morale, +0.25 legitimacy a month, +1.2 unrest everywhere) permanently; Assyria −60 regard and the tribute assessed at twice the rate.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { manpower: -4000, treasury: -150, legitimacy: 15, mar: 25 });
        mod(ctx, 'h931_claim_unsurrendered', 'The Claim Unsurrendered', { moraleMult: 1.1, legitimacyAdd: 0.25, unrestAll: 1.2 });
        opinion(ctx, 'ASR', 'ISL', -60);
        h.chronicle(ctx, 'era', 'The cession is not signed. The districts are lost anyway and the Assyrian scribes enter them as conquered rather than ceded, which doubles the assessment on what remains.'); } }),

  H('ev931h_messengers_to_so', 'Messengers to So', -725, 3, 'ISL',
    'The tribute did not go north this year. It was assessed, counted and left in the '
    + 'treasury, and messengers went to So king of Egypt instead, which the chancery advised '
    + 'against on the ground that Egypt has been three kingdoms arguing with each other for '
    + 'forty years and has no army to lend anybody.\n\nThe Assyrian keeps a schedule and checks '
    + 'it. The envoys who came for the silver have gone home and reported a conspiracy, which '
    + 'is the word their scribes use for a client who misses a payment. There is one season in '
    + 'which the silver can still go north with interest and an explanation.',
    '2 Kings 17:4: Hoshea sent messengers to So king of Egypt and brought no present to the king of Assyria, as he had done year by year; therefore the king of Assyria shut him up and bound him in prison.',
    { label: 'Hold the revolt and wait for Egypt', tooltip: '+30 legitimacy and "The Delta Promise" (+10% morale, +8% manpower) for ten years; Egypt +40 regard, Assyria −90 and war. The silver stays in the treasury and buys nothing at all.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { legitimacy: 30, treasury: 250, mar: 30 });
        mod(ctx, 'h931_delta_promise', 'The Delta Promise', { moraleMult: 1.1, manpowerMult: 1.08 }, 120);
        opinion(ctx, 'MIZ', 'ISL', 40); opinion(ctx, 'ASR', 'ISL', -90);
        h.setFlag(ctx, 'hosheaRevolt', true);
        h.chronicle(ctx, 'era', 'The year\'s tribute stays in the treasury and the embassy to the Delta comes back with good words and no troops.'); } },
    { label: 'Send it late, with interest and an explanation', tooltip: '−400 talents and −20 legitimacy; Assyria +30 regard and "The Payment Made Good" (−0.5 unrest everywhere, +6% income) for fifteen years. The king keeps his throne and the Egyptian correspondence is handed over as a gift.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { treasury: -400, legitimacy: -20 });
        mod(ctx, 'h931_payment_made_good', 'The Payment Made Good', { unrestAll: -0.5, incomeMult: 1.06 }, 180);
        opinion(ctx, 'ASR', 'ISL', 30); opinion(ctx, 'MIZ', 'ISL', -40);
        h.chronicle(ctx, 'era', 'The silver goes north two seasons late with a surcharge, and the letters from the Delta go north with it, which is what the surcharge actually buys.'); } }),

  H('ev931h_the_third_year', 'The Third Year of the Siege', -723, 5, 'ISL',
    'The king was summoned to the Assyrian camp to explain the missing tribute, went, and has '
    + 'not come back; he is in a prison in the north and the kingdom is being administered by '
    + 'its own officers in his name. The field army came up through the whole land and is now '
    + 'round the capital, and has been for two years.\n\nThe hill is the best fortress in the '
    + 'country: Omri\'s casemates, a rock scarp, cisterns cut deep enough for a siege like this '
    + 'one, and stores that were laid in for exactly this. Two years of it have already been '
    + 'spent. The staff\'s estimate for the third is that the walls will hold and the '
    + 'storehouses will not.',
    '2 Kings 17:5-6: Shalmaneser V shut up Hoshea, came up throughout all the land, and besieged Samaria three years; the city fell in the ninth year of Hoshea, 722 BCE.',
    { label: 'Hold the hill', tooltip: '−8,000 manpower and −350 talents; "The Casemates of Omri" (+25% siege endurance, +1 fort defence, +10% morale) and +2 war exhaustion. Three years bought, and a city eaten down to its last stores.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { manpower: -8000, treasury: -350, warExhaustion: 2, legitimacy: 20 });
        mod(ctx, 'h931_casemates_of_omri', 'The Casemates of Omri', { siegeMult: 1.25, fortDefBonus: 1, moraleMult: 1.1 });
        mod(ctx, 'h931_the_stores_eaten', 'The Stores Eaten', { incomeMult: 0.85, unrestAll: 0.9 }, 96);
        h.chronicle(ctx, 'era', 'The capital holds a third winter behind Omri\'s casemates on cistern water and the last of the storehouses.'); } },
    { label: 'Open terms while there is a garrison to bargain with', tooltip: '−600 talents, a third of the capital\'s people marched east at once, and "The City Standing" (−0.8 unrest everywhere, +10% growth, +8% income) permanently; Assyria +45 regard. The walls, the archives and the population that stays are kept.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { treasury: -600, legitimacy: -25 });
        mod(ctx, 'h931_city_standing', 'The City Standing', { unrestAll: -0.8, growthMult: 1.1, incomeMult: 1.08 });
        h.addProvinceModifier(ctx, 'Sebaste', { id: 'h931_terms_at_sebaste', name: 'Terms at Samaria', months: 240, effects: { taxMult: 0.85, unrest: 1 } });
        opinion(ctx, 'ASR', 'ISL', 45);
        h.chronicle(ctx, 'era', 'The gates are opened on terms in the third summer. A third of the city goes east in columns and the other two thirds stay in a city that is still standing.'); } }),

  H('ev931h_halah_and_habor', 'Halah, Habor and the River of Gozan', -722, 6, 'ISL',
    'The city is taken. The Assyrian scribes have counted what they are removing and entered '
    + 'the figure: twenty-seven thousand two hundred and ninety people, with their chariots '
    + 'taken into the royal army, to be settled in Halah, on the Habor, by the river of Gozan '
    + 'and in the cities of the Medes. Men from Babylon, Cuthah, Avva, Hamath and Sepharvaim '
    + 'are being brought the other way to hold the towns.\n\nThe columns will be several months '
    + 'on the road. What the officers of this kingdom can still decide is what goes with them: '
    + 'whether the districts march as households with their elders, their priests and the '
    + 'registers, or whether everybody who can move tonight goes south over the Judah border '
    + 'and into the hills and takes his chances.',
    'Sargon II\'s Khorsabad annals claim 27,290 deported from Samaria; 2 Kings 17:6,24 records the settlement in Halah and Habor and the cities of the Medes and the importation of colonists from Babylon, Cuthah, Avva, Hamath and Sepharvaim.',
    { label: 'March as households, with the elders and the registers', tooltip: '"The Columns Kept Together" (+0.2 legitimacy a month, −0.5 unrest everywhere) permanently: the deported communities keep their families, their law and their names, and are still recognisable generations later. −20% income permanently.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { legitimacy: 10, gov: -25 });
        mod(ctx, 'h931_columns_kept_together', 'The Columns Kept Together', { legitimacyAdd: 0.2, unrestAll: -0.5, incomeMult: 0.8 });
        h.addProvinceModifier(ctx, 'Sebaste', { id: 'h931_the_new_settlers', name: 'The New Settlers', months: -1, effects: { taxMult: 0.9, unrest: 1.5 } });
        h.addProvinceModifier(ctx, 'Neapolis', { id: 'h931_the_new_settlers_n', name: 'The New Settlers', months: -1, effects: { taxMult: 0.9, unrest: 1.2 } });
        h.setFlag(ctx, 'samariaFell', true);
        h.chronicle(ctx, 'era', 'The districts go east by household with their elders and their registers, and men from Babylon, Cuthah, Avva, Hamath and Sepharvaim are put into their towns behind them.'); } },
    { label: 'Scatter south and into the hills tonight', tooltip: 'Judah gains 12,000 men and "The Refugees from the North" (+10% growth); what remains here takes "Scattered" (+1.5 unrest everywhere, −25% income) permanently. The columns still go east, shorter by the people who ran.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'ISL', { legitimacy: -15, gov: -15 });
        h.adjust(ctx, 'JDH', { manpower: 12000, treasury: -80 });
        mod(ctx, 'h931_scattered', 'Scattered', { unrestAll: 1.5, incomeMult: 0.75 });
        h.addTagModifier(ctx, 'JDH', { id: 'h931_refugees_from_the_north', name: 'The Refugees from the North', months: -1, effects: { growthMult: 1.1, unrestAll: 0.4 } });
        h.setFlag(ctx, 'samariaFell', true);
        h.chronicle(ctx, 'era', 'Whole villages go over the southern border in the dark and the capital of the south doubles inside a generation. The columns that go east go east without them.'); } }),

  // ── after the north (SPEC §274) ─────────────────────────────────────────
  // The chapter had one card in its last full decade and then two hundred
  // years of arithmetic. These are the two questions the south actually had
  // to answer in the years after Samaria fell, and they are the questions
  // the 732 chapter opens holding the answers to.

  H('ev931h_the_road_from_the_north', 'They Are Coming Down the Ridge Road', -720, 8, 'JDH',
    'They have been arriving since the spring: families off the northern ridge '
    + 'with what they could carry, priests out of the sanctuaries the Assyrians '
    + 'closed, and whole villages from the Ephraimite hills who left before the '
    + 'columns reached them. The city has doubled. There is a new quarter on the '
    + 'western hill that was sheep pasture two years ago and there is not enough '
    + 'water for it.\n\nThey are also not the same as the people here. They keep '
    + 'northern feasts on northern dates, they have their own priests with their '
    + 'own genealogies, and a great many of them have opinions about the house of '
    + 'David that are two hundred years old and were the reason for the original '
    + 'quarrel.',
    'Jerusalem expanded dramatically in the late eighth century — the Broad Wall and the western hill quarter — which most archaeologists attribute to refugees from the fallen north.',
    { label: 'Wall the new quarter in and put their priests on the rolls',
      tooltip: '−60 talents on the wall and the water. Jerusalem +2 development permanently, +12% manpower and "One People, One House" (−1 unrest everywhere, +10% integration) for a century. The northern traditions come inside the walls and inside the books, which is where most of the Torah comes from.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: -60, manpower: 6000, legitimacy: 12 });
        h.addProvinceModifier(ctx, 'Jerusalem', { id: 'h931_broad_wall', name: 'The Broad Wall', months: -1, effects: { prodMult: 1.2, taxMult: 1.12 } });
        mod(ctx, 'h931_one_people', 'One People, One House', { unrestAll: -1, integrateMult: 1.1, manpowerMult: 1.12 }, 1200);
        h.setFlag(ctx, 'northAbsorbed', true);
        h.chronicle(ctx, 'era', 'A wall is thrown round the new quarter on the western hill and the northern priests are written into the rolls; the city that comes out of it is twice the city that went in.'); } },
    { label: 'Settle them on the land and keep the northern priests off the rolls',
      tooltip: '−25 talents. The countryside gains: +10% growth and +8% income for a century, and the city is not strained. The northern priesthood is a separate body with its own memory: +1.2 unrest everywhere permanently, and the quarrel that made two kingdoms is still in the country.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: -25, manpower: 3000 });
        mod(ctx, 'h931_settled_on_land', 'Settled on the Land', { growthMult: 1.1, incomeMult: 1.08 }, 1200);
        mod(ctx, 'h931_priests_apart', 'The Northern Priests Apart', { unrestAll: 1.2 });
        h.chronicle(ctx, 'era', 'The northerners are settled on the land rather than in the city and their priests are kept off the rolls; the quarrel that made two kingdoms comes south with them.'); } }),

  H('ev931h_the_tribute_after', 'What the South Pays Now', -716, 4, 'JDH',
    'There is one Israelite kingdom on this map and it is this one, and the '
    + 'schedule the Assyrians have sent reflects the change. It is not the north\'s '
    + 'assessment added to the south\'s — the north is provinces now and pays as '
    + 'provinces — it is a new figure for a kingdom that the empire has decided is '
    + 'the last one left in these hills and can therefore be assessed at what it '
    + 'will bear.\n\nThe scribe who brought it is waiting for an answer and the '
    + 'answer he is waiting for is a number, not a position. What the council is '
    + 'actually deciding is whether this kingdom means to survive by paying or by '
    + 'not being worth the march.',
    'Judah paid tribute to Assyria from Ahaz onward; the assessments are recorded in the annals of Tiglath-pileser, Sargon and Sennacherib.',
    { label: 'Pay it, in full, early, and ask for the border posts in writing',
      tooltip: '−110 talents a decade. "Assessed and Quiet" permanently: +10% administrative efficiency, +12 deterrent, −1 unrest everywhere. The kingdom is poor, the borders are recognised, and nothing marches through here for twenty years.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: -110, legitimacy: 10 });
        mod(ctx, 'h931_assessed_quiet', 'Assessed and Quiet', { adminMult: 1.1, deterrent: 12, unrestAll: -1 });
        h.setFlag(ctx, 'tributeAccepted', true);
        h.chronicle(ctx, 'era', 'The new schedule is paid in full and early, and the border posts are asked for and given in writing.'); } },
    { label: 'Pay the old figure and put the difference into the walls',
      tooltip: '+70 talents kept and spent on masonry: +20% siege defence permanently and +8% force limit. The shortfall is on the record: −12 legitimacy and "A Kingdom Worth the March" (+1 unrest everywhere) — the next king of Assyria reads this ledger before he decides where to go.',
      fx: (ctx) => { const h = ctx.helpers;
        h.adjust(ctx, 'JDH', { treasury: 70, legitimacy: -12 });
        mod(ctx, 'h931_into_the_walls', 'Into the Walls', { hillDefBonus: 20, forceLimitMult: 1.08 });
        mod(ctx, 'h931_worth_the_march', 'A Kingdom Worth the March', { unrestAll: 1 });
        h.setFlag(ctx, 'tributeShort', true);
        h.chronicle(ctx, 'era', 'The old figure is paid and the difference goes into masonry; the shortfall is entered in a ledger that is read in Nineveh.'); } }),
];

// --- SPEC §216: a card is answered by the court it is addressed to ---------
// One loop instead of a tag argument on every call site in the file. A card
// marked `player` or `both` is always the chair the player is sitting in and
// is left alone; a card marked ISL or JDH writes to that court whether or not
// the player is in it.
for (const _c of EVENTS_931_HOUSES) {
  if (!_c || (_c.forTag !== 'ISL' && _c.forTag !== 'JDH')) continue;
  for (const _o of _c.options || []) {
    if (typeof _o.effects !== 'function') continue;
    _o.effects = bindAudience(_c.forTag, _o.effects);
  }
}
