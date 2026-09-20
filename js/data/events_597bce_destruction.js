// Judaea Universalis — the siege, the burning, and what came back:
// 588–457 BCE (SPEC §241, §268). Content package. Zero imports; every effect
// runs through ctx.helpers.
//
// The Babylonian chapter was written around a hole. It has the oath in 597,
// the two prophets in 594, the letter to the exiles in 593, the Lachish
// ostraca in 588 — and then it jumps to a governor at Mizpah in 585 and a
// book of dirges in 580, both of which are about an event the chapter never
// stages. The ninth of Ab is not in it. Neither is the breach, nor Riblah,
// nor the pillars, nor Gedaliah's name, nor the valley of bones, nor the day
// Jehoiachin was let out of prison, nor Ezra.
//
// A chapter called The Yoke of Babylon that does not contain the destruction
// of the First Temple is a chapter with its middle missing, and the middle is
// the part everything else in this game refers back to: the fast of the fifth
// month, the exile the diaspora system models, the second house that 167 BCE
// rededicates and 66 CE loses again. This file is that middle.
//
// WHAT IT IS NOT. It is not a war package. There are twenty-six cards here
// and exactly one of them is about fighting: the rest are about what a state
// does while it is being ended, and then what a people does once there is no
// state to do anything. The decisions are correspondingly strange — whether
// to let a prophet out of a cistern, whether to count vessels, whether to
// write down a plan for a building that does not exist, whether to let the
// men who never left help build. Those were the decisions. The sources are
// unusually good on them because the people who kept the records were the
// people the decisions were about.
//
// Sources: 2 Kings 24-25 and Jeremiah 37-44 and 52 in parallel, where the two
// accounts of the siege diverge in detail and agree on the sequence;
// Lamentations; Ezekiel with its dated headings, which are the best calendar
// anyone in the exile kept; the Babylonian Chronicle for Nebuchadnezzar's
// years; the ration tablets from the South Palace at Babylon listing
// Ya'u-kinu king of the land of Yahudu and his five sons; the Al-Yahudu
// tablets for the settled exiles' business life; Ezra 1-8 and Nehemiah 8;
// and the Elephantine papyri for the community that did not come back.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_597bce_destruction] ' + key, e || '');
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

// A dated card, two answers, the recorded one first — the same shape the
// years package uses, so the two files read as one hand.
function Y(id, title, y, m, forTag, desc, historical, a, b) {
  return {
    id, title, desc, historical, forTag, date: { y, m }, aiOption: 0,
    options: [
      { label: a.label, tooltip: a.tooltip, effects: guard(id + ':0', a.fx) },
      { label: b.label, tooltip: b.tooltip, effects: guard(id + ':1', b.fx) },
    ],
  };
}

export const EVENTS_597_DESTRUCTION = [

  // ── the siege ───────────────────────────────────────────────────────────
  Y('ev597d_the_wall_is_invested', 'They Have Built Forts Against It Round About', -588, 1, 'JDH',
    'In the tenth month of the ninth year the whole army came up, and this time it did '
    + 'not come to be paid. They are not assaulting. They are building: a ring of camps, '
    + 'a bank thrown up the whole circuit, and the roads south and west closed by posts '
    + 'that change every week.\n\nThe engineers in the city have counted what is inside '
    + 'the walls and produced a figure in months. The council has been given it and has '
    + 'not written it down anywhere, which is the only sensible thing to do with a number '
    + 'like that.',
    'Nebuchadnezzar invested Jerusalem on the tenth day of the tenth month of Zedekiah\'s ninth year (2 Kings 25:1). The siege ran about eighteen months.',
    { label: 'Ration from the first week, and post the ration',
      tooltip: '−25 talents. "The Measured City" (−0.8 unrest everywhere, +6% manpower) for three years: hunger that everybody can see is shared is hunger a city survives longer.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -25, stability: 1 });
        mod(ctx, 'd597_measured_city', 'The Measured City', { unrestAll: -0.8, manpowerMult: 1.06 }, 36);
        h.chronicle(ctx, 'war', 'The ration is fixed and posted in the first week of the siege, before anybody is hungry enough to argue about it.'); } },
    { label: 'Say nothing and let the great houses feed the wall',
      tooltip: '+70 talents from the stores the crown does not have to buy, and "Whose Bread" (+1.4 unrest everywhere) for three years.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: 70 });
        mod(ctx, 'd597_whose_bread', 'Whose Bread', { unrestAll: 1.4 }, 36);
        h.chronicle(ctx, 'war', 'No ration is announced. The great houses feed their own men on the wall, and everybody learns quickly whose men they are.'); } }),

  Y('ev597d_the_egyptians_came_out', 'Pharaoh\'s Army Is Come Forth', -588, 7, 'JDH',
    'The Chaldeans have broken camp and gone south. An Egyptian force has crossed the '
    + 'frontier and they have gone to meet it, and for the first time in seven months the '
    + 'gates are open and there is grain coming up the road.\n\nThe prophet in the guard '
    + 'court says it changes nothing — that the Egyptians will go home and the Chaldeans '
    + 'will come back and burn the city, and that anyone who tells the king otherwise is '
    + 'lying to him. He has been saying it for eleven years. He was arrested this week at '
    + 'the Benjamin gate on his way out to his family property, on a charge of deserting '
    + 'to the enemy, which he denies and which was the only charge available.',
    'Hophra\'s advance lifted the siege temporarily in 588 (Jeremiah 37:5-11). The Egyptians withdrew without a battle and the Chaldeans returned.',
    { label: 'Use the weeks: buy grain and repair the breaches',
      tooltip: '−90 talents. "Provisioned Twice" (+9% manpower, −0.5 unrest everywhere) for four years, and the walls hold longer for it.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -90, manpower: 900 });
        mod(ctx, 'd597_provisioned', 'Provisioned Twice', { manpowerMult: 1.09, unrestAll: -0.5 }, 48);
        h.chronicle(ctx, 'war', 'The weeks of the lifted siege are spent on grain and mortar rather than on thanksgiving.'); } },
    { label: 'Proclaim the deliverance and send to Pharaoh for more',
      tooltip: '+18 legitimacy and 30 influence now, and "The Egyptian Hope" (−7% income, +0.6 unrest everywhere) for six years when they do not come back.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { legitimacy: 18, infl: 30 });
        mod(ctx, 'd597_egyptian_hope', 'The Egyptian Hope', { incomeMult: 0.93, unrestAll: 0.6 }, 72);
        h.chronicle(ctx, 'war', 'The lifting of the siege is proclaimed a deliverance, and a second embassy goes down to Egypt.'); } }),

  Y('ev597d_the_cistern', 'The Cistern in the Court of the Guard', -587, 3, 'JDH',
    'The princes came to the king and said the man was weakening the hands of the men of '
    + 'war, which was true, and asked for him, and the king said: he is in your hand, the '
    + 'king is not he that can do anything against you. So they let him down by cords into '
    + 'the cistern. There was no water in it, only mud, and he sank in the mud.\n\nAn '
    + 'Ethiopian of the household has come to the gate where the king is sitting and said '
    + 'it plainly in front of everybody: these men have done evil, and he will die of '
    + 'hunger where he is. He is asking for thirty men and some old rags to put under the '
    + 'prophet\'s armpits so the cords do not cut him coming up.',
    'Jeremiah 38: Ebed-melech the Ethiopian, a court official, obtained the king\'s leave and drew Jeremiah out of the miry cistern with worn rags under his arms.',
    { label: 'Give the Ethiopian his thirty men',
      tooltip: '+14 legitimacy and "A Word Still Spoken" (+0.25 legitimacy a month, −0.4 unrest everywhere) permanently. The city keeps the one voice in it that is not lying.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { legitimacy: 14 });
        mod(ctx, 'd597_word_still_spoken', 'A Word Still Spoken', { legitimacyAdd: 0.25, unrestAll: -0.4 });
        h.setFlag(ctx, 'prophetLives', true);
        h.chronicle(ctx, 'era', 'The prophet is drawn up out of the cistern with rags under his arms, and kept in the court of the guard until the city falls.'); } },
    { label: 'Leave him there. The wall needs men who believe it will hold',
      tooltip: '+1 stability and "No Voice Against the Wall" (+8% morale, −0.35 legitimacy a month) for five years.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { stability: 1, legitimacy: -10 });
        mod(ctx, 'd597_no_voice', 'No Voice Against the Wall', { moraleMult: 1.08, legitimacyAdd: -0.35 }, 60);
        h.chronicle(ctx, 'era', 'The prophet is left in the mud. The men on the wall are told the city will hold, and for a while they are easier for hearing it.'); } }),

  Y('ev597d_the_bread_is_spent', 'The Bread of the City Was Spent', -587, 9, 'JDH',
    'There is no more bread for the people of the land. The figure the engineers gave the '
    + 'council eighteen months ago has arrived, on time, to the week.\n\nWhat is left is '
    + 'in three places: the temple stores, which are consecrated; the king\'s store, which '
    + 'feeds the men on the wall; and the cellars of perhaps forty houses. The council is '
    + 'being asked to decide which of the three is opened, and it understands perfectly '
    + 'that the answer decides what kind of siege the last months of this one are.',
    '2 Kings 25:3: the famine prevailed in the city and there was no bread for the people of the land. Lamentations 4 and Ezekiel 5 describe the result without euphemism.',
    { label: 'Open the temple stores',
      tooltip: '−0.9 unrest everywhere for two years and +1 stability. The priests are overruled and remember it: −16 legitimacy.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { stability: 1, legitimacy: -16 });
        mod(ctx, 'd597_temple_stores', 'The Consecrated Bread', { unrestAll: -0.9 }, 24);
        h.chronicle(ctx, 'war', 'The consecrated stores are opened to the people of the land. The priests protest and are overruled.'); } },
    { label: 'The wall eats first',
      tooltip: '+12% morale for two years. "The People of the Land" (+2 unrest everywhere) for the same two years, and the city holds longer with fewer people in it.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { manpower: -400 });
        mod(ctx, 'd597_wall_eats_first', 'The Wall Eats First', { moraleMult: 1.12, unrestAll: 2 }, 24);
        h.chronicle(ctx, 'war', 'The king\'s store goes to the men on the wall. The people of the land are told to wait, and a good many of them do not.'); } }),

  // ── the fall ────────────────────────────────────────────────────────────
  Y('ev597d_the_breach', 'A Breach Is Made in the City', -586, 4, 'JDH',
    'On the ninth day of the fourth month the wall went, on the north, where it always '
    + 'was going to go. The princes of the king of Babylon came in and sat down in the '
    + 'middle gate — sat down, in the gate, like judges, which is what they were now.\n\n'
    + 'The men of war went out by night by the gate between the two walls, by the king\'s '
    + 'garden, and took the road toward the Arabah. The king went with them. Everybody '
    + 'left in the city watched them go and understood that the decision about what '
    + 'happens next is no longer being made by anyone they know.',
    '2 Kings 25:4 and Jeremiah 39:2-4: the breach on 9 Tammuz 586, the Babylonian officers seated in the middle gate, and the night flight of the garrison and the king toward the Arabah.',
    { label: 'The king goes with the men of war',
      tooltip: 'The recorded course. −12% manpower and "The Flight by Night" (+1.6 unrest everywhere, −8% income) for ten years.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { manpower: -2500, warExhaustion: 3 });
        mod(ctx, 'd597_flight_by_night', 'The Flight by Night', { unrestAll: 1.6, incomeMult: 0.92 }, 120);
        h.setFlag(ctx, 'kingFled', true);
        h.chronicle(ctx, 'war', 'The wall is breached on the ninth of the fourth month. The king and the men of war go out by night toward the Arabah.'); } },
    { label: 'The king stays in the city and surrenders it himself',
      tooltip: '−30% manpower at once, but "Surrendered in Person" (−1 unrest everywhere, +10% income) for ten years: a city given up is not a city stormed.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { manpower: -6000, legitimacy: -20, warExhaustion: 2 });
        mod(ctx, 'd597_surrendered', 'Surrendered in Person', { unrestAll: -1, incomeMult: 1.1 }, 120);
        h.setFlag(ctx, 'kingSurrendered', true);
        h.chronicle(ctx, 'war', 'The king does not go out by night. He opens the gate himself and is taken in the middle gate, sitting.'); } }),

  Y('ev597d_riblah', 'They Slew His Sons Before His Eyes', -586, 5, 'JDH',
    'The Chaldean army overtook him in the plains of Jericho, and all his army was '
    + 'scattered from him. They brought him up to the king of Babylon at Riblah in the '
    + 'land of Hamath, and they gave judgement upon him.\n\nThe account is four clauses '
    + 'long and the order of them is the whole of it: they slew the sons of Zedekiah '
    + 'before his eyes, and put out the eyes of Zedekiah, and bound him in fetters, and '
    + 'carried him to Babylon. The last thing he saw was chosen for him.',
    '2 Kings 25:6-7. Zedekiah was taken at Jericho, judged at Riblah, blinded after watching his sons killed, and died in a Babylonian prison.',
    { label: 'Write it down exactly as it happened',
      tooltip: '+22 legitimacy and "The Oath and the Judgement" (+0.3 legitimacy a month, +6% manpower) permanently: a people that records what perjury cost does not repeat it cheaply.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { legitimacy: 22 });
        mod(ctx, 'd597_oath_and_judgement', 'The Oath and the Judgement', { legitimacyAdd: 0.3, manpowerMult: 1.06 });
        h.chronicle(ctx, 'era', 'The judgement at Riblah is written down in the order it happened, which is the order that makes the point.'); } },
    { label: 'Let the chronicle say only that the king was carried to Babylon',
      tooltip: '−0.8 unrest everywhere for fifteen years, and "The Kinder Account" (−0.2 legitimacy a month) for the same. A people spared the detail learns less from it.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { stability: 1 });
        mod(ctx, 'd597_kinder_account', 'The Kinder Account', { unrestAll: -0.8, legitimacyAdd: -0.2 }, 180);
        h.chronicle(ctx, 'era', 'The chronicle records that the king was carried to Babylon, and stops there.'); } }),

  Y('ev597d_the_house_is_burned', 'The Seventh Day of the Fifth Month', -586, 6, 'JDH',
    'The captain of the guard came to Jerusalem a month after the breach, which is the '
    + 'detail nobody expects: the city stood open and unburned for four weeks while '
    + 'somebody in Riblah decided. Then he burned the house of the LORD, and the king\'s '
    + 'house, and all the houses of Jerusalem, and every great man\'s house he burned '
    + 'with fire.\n\nAnd all the army of the Chaldees that were with the captain of the '
    + 'guard brake down the walls of Jerusalem round about. The date is the seventh day '
    + 'of the fifth month, and in one account the tenth, and both dates will be kept as '
    + 'a fast for two and a half thousand years because nobody could agree which.',
    '2 Kings 25:8-10 gives the seventh of Ab, Jeremiah 52:12 the tenth. Nebuzaradan burned the temple, the palace and the great houses, and the walls were pulled down.',
    { label: 'Keep the fast of the fifth month, both days',
      tooltip: '−20 talents a year in lost working days. "The Fast of the Fifth Month" (+0.35 legitimacy a month, −0.5 unrest everywhere) permanently.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -20, legitimacy: 20 });
        mod(ctx, 'd597_fast_fifth_month', 'The Fast of the Fifth Month', { legitimacyAdd: 0.35, unrestAll: -0.5 });
        h.setFlag(ctx, 'fastOfTheFifth', true);
        h.chronicle(ctx, 'era', 'The house is burned on the seventh day of the fifth month, and the day is kept as a fast from the year it happened.'); } },
    { label: 'No fast. A people that mourns a building every year never leaves it',
      tooltip: '+12% growth and +8% income permanently, and "No Day Appointed" (−0.3 legitimacy a month) with it.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { legitimacy: -14 });
        mod(ctx, 'd597_no_day', 'No Day Appointed', { growthMult: 1.12, incomeMult: 1.08, legitimacyAdd: -0.3 });
        h.chronicle(ctx, 'era', 'No day is appointed. The elders argue that a people which mourns a building every year never finishes leaving it.'); } }),

  Y('ev597d_the_pillars', 'The Brass of Them Was Without Weight', -586, 8, 'JDH',
    'The two pillars at the porch had names. One was Jachin and one was Boaz, and nobody '
    + 'now living knows what the names meant, and the Chaldeans have cut both of them in '
    + 'pieces and are carrying the pieces to Babylon.\n\nThe sea, and the bases, and the '
    + 'pots and the shovels and the snuffers and the spoons, and all the vessels of brass '
    + 'wherewith they ministered — the brass of all these vessels was without weight. The '
    + 'scribe who wrote that down was not being poetic. He means that nobody weighed it, '
    + 'because there was too much of it, and that the inventory of the house of the LORD '
    + 'ends with a number nobody bothered to take.',
    '2 Kings 25:13-17 and Jeremiah 52:17-23: the bronze pillars, the sea and the stands were broken up for transport, and the gold and silver vessels taken by count.',
    { label: 'Count and list the gold and silver vessels as they go',
      tooltip: '−15 talents for the scribes. "The Inventory" (+0.2 legitimacy a month) permanently, and the list is what the vessels are eventually returned against.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -15, gov: 25 });
        mod(ctx, 'd597_inventory', 'The Inventory', { legitimacyAdd: 0.2 });
        h.setFlag(ctx, 'vesselInventory', true);
        h.chronicle(ctx, 'era', 'The vessels are counted and listed as they are carried out, by scribes with nothing else left to administer.'); } },
    { label: 'Hide what can be hidden and record nothing',
      tooltip: '+120 talents in concealed plate, and "Nothing Written Down" (−0.25 legitimacy a month) permanently: what is not on a list cannot be asked for back.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: 120 });
        mod(ctx, 'd597_nothing_written', 'Nothing Written Down', { legitimacyAdd: -0.25 });
        h.chronicle(ctx, 'era', 'What can be carried off quietly is carried off quietly, and no list is made of any of it.'); } }),

  Y('ev597d_the_poorest_of_the_land', 'He Left of the Poor of the Land', -586, 10, 'JDH',
    'The captain of the guard carried away the rest of the people that remained in the '
    + 'city, and the fugitives that fell away to the king of Babylon, and the remnant of '
    + 'the multitude. But he left of the poor of the land to be vinedressers and '
    + 'husbandmen.\n\nThey have been given the vineyards and fields of men who are walking '
    + 'to Babylon, by a clerk with a list, as a deliberate act of policy: a country with '
    + 'nobody in it pays no tax. Those men\'s sons will come back in seventy years with '
    + 'the deeds, and the great quarrel of the return is being created right now, by a '
    + 'Chaldean official doing something sensible.',
    '2 Kings 25:11-12 and Jeremiah 39:10: Nebuzaradan deported the remaining population but left the landless poor and gave them vineyards and fields. Ezekiel 33:24 records what they made of it.',
    { label: 'Let the elders register who holds what, and why',
      tooltip: '−30 talents. "Two Registers" (+7% income, −0.6 unrest everywhere) permanently: the return will have a document to argue from instead of a fight.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -30, gov: 30 });
        mod(ctx, 'd597_two_registers', 'Two Registers', { incomeMult: 1.07, unrestAll: -0.6 });
        h.chronicle(ctx, 'era', 'The elders register the new holdings beside the old ones, against a day when somebody will want both.'); } },
    { label: 'Let possession stand. The land belongs to whoever is standing on it',
      tooltip: '+10% growth and +9% manpower permanently among those who stayed, and "The Quarrel of the Deeds" (+1 unrest everywhere) permanently.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { manpower: 800 });
        mod(ctx, 'd597_quarrel_of_deeds', 'The Quarrel of the Deeds', { growthMult: 1.1, manpowerMult: 1.09, unrestAll: 1 });
        h.chronicle(ctx, 'era', 'Possession stands. The land belongs to whoever is working it, and the argument is left to a generation not yet born.'); } }),

  // ── the remnant ─────────────────────────────────────────────────────────
  Y('ev597d_ishmael', 'Eighty Men With Their Beards Shaven', -585, 10, 'JDH',
    'Ishmael the son of Nethaniah, of the seed royal, came with ten men to Mizpah and ate '
    + 'bread with the governor, and rose up and killed him at the table. He killed the '
    + 'Jews that were with him and the Chaldean soldiers that were found there, and for '
    + 'two days nobody outside the town knew.\n\nOn the second day eighty men came up from '
    + 'Shechem and Shiloh and Samaria with their beards shaven and their clothes rent, '
    + 'bringing offerings to the house of the LORD — which no longer exists, which they '
    + 'evidently had not been told. He went out to meet them weeping, and brought them '
    + 'into the town, and killed seventy of them, and cast them into the pit that Asa the '
    + 'king had made.',
    'Jeremiah 41. Gedaliah was assassinated at Mizpah by Ishmael son of Nethaniah, with Ammonite backing; the murder of the eighty pilgrims followed. The fast of the seventh month commemorates it.',
    { label: 'Keep the fast of the seventh month for the governor',
      tooltip: '+16 legitimacy and "The Fast of the Seventh Month" (+0.2 legitimacy a month, −0.5 unrest everywhere) permanently.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { legitimacy: 16 });
        mod(ctx, 'd597_fast_seventh', 'The Fast of the Seventh Month', { legitimacyAdd: 0.2, unrestAll: -0.5 });
        h.chronicle(ctx, 'era', 'The murder at Mizpah is kept as a fast of the seventh month, beside the fast of the fifth.'); } },
    { label: 'Hunt Ishmael to Ammon and take the price out of Ammon',
      tooltip: '+35 martial points and "The Pursuit" (+10% morale, −6% income) for eight years. Ammon\'s opinion of us falls by 40.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { mar: 35 });
        mod(ctx, 'd597_the_pursuit', 'The Pursuit', { moraleMult: 1.1, incomeMult: 0.94 }, 96);
        h.chronicle(ctx, 'war', 'Johanan goes after Ishmael as far as the great waters of Gibeon, and the survivors are brought back.'); } }),

  Y('ev597d_carry_us_not_into_egypt', 'They Came Into the Land of Egypt', -584, 2, 'JDH',
    'They asked the prophet to enquire, and swore to do whatever the answer was, and '
    + 'waited ten days for it. The answer was: stay in this land and you will be built and '
    + 'not pulled down; go into Egypt and the sword you are afraid of will overtake you '
    + 'there.\n\nThey said he was lying and that Baruch had put him up to it, and they '
    + 'went — the captains, the men, the women, the children, the king\'s daughters, and '
    + 'the prophet himself, taken along by the people who had just told him he was a liar. '
    + 'They stopped at Tahpanhes. It is the last place anybody records him being alive.',
    'Jeremiah 42-43. The remnant under Johanan rejected Jeremiah\'s oracle, went down to Egypt and settled at Tahpanhes, taking Jeremiah and Baruch with them.',
    { label: 'Go into Egypt',
      tooltip: '+140 talents carried out and "The House at Tahpanhes" (+9% trade, −0.3 legitimacy a month) permanently. A community in the Delta, out of Babylon\'s reach and out of the story.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: 140, legitimacy: -12 });
        mod(ctx, 'd597_tahpanhes', 'The House at Tahpanhes', { tradeMult: 1.09, legitimacyAdd: -0.3 });
        h.setFlag(ctx, 'wentToEgypt', true);
        h.chronicle(ctx, 'era', 'The remnant goes down into Egypt and settles at Tahpanhes, taking the prophet with them against his word and his will.'); } },
    { label: 'Stay in the land and take the Chaldean\'s terms',
      tooltip: '−60 talents in reparation for the governor\'s murder, and "Built and Not Pulled Down" (+11% growth, +0.25 legitimacy a month) permanently.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -60, legitimacy: 16 });
        mod(ctx, 'd597_built_not_pulled_down', 'Built and Not Pulled Down', { growthMult: 1.11, legitimacyAdd: 0.25 });
        h.chronicle(ctx, 'era', 'The remnant stays in the land and sends to the Chaldean for terms, which are harsh and are accepted.'); } }),

  Y('ev597d_the_third_deportation', 'Seven Hundred Forty and Five Persons', -582, 6, 'JDH',
    'A third column has gone east, four years after the burning and for no reason anyone '
    + 'here has been given. The number is in the record because somebody counted it: seven '
    + 'hundred forty and five persons.\n\nIt is a small number and that is what is '
    + 'frightening about it. The first deportation took the court, the second took the '
    + 'city, and this one has taken seven hundred and forty-five particular people, chosen '
    + 'by somebody from a list, for a reason that was never written down.',
    'Jeremiah 52:30 records a third deportation in Nebuchadnezzar\'s twenty-third year, 745 persons, probably punitive after the Mizpah killings.',
    { label: 'Send the names east with them, and keep a copy',
      tooltip: '−12 talents. "The Names Went With Them" (+0.2 legitimacy a month, +5% growth) permanently: nobody disappears who is on a list somebody kept.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -12, legitimacy: 10 });
        mod(ctx, 'd597_names_went_east', 'The Names Went With Them', { legitimacyAdd: 0.2, growthMult: 1.05 });
        h.chronicle(ctx, 'era', 'The seven hundred and forty-five are listed by name before they go, and the list is kept in the land.'); } },
    { label: 'Ask nothing and draw no attention',
      tooltip: '+55 talents in a quiet year and "Draw No Attention" (+6% income, +0.7 unrest everywhere) for twelve years.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: 55 });
        mod(ctx, 'd597_draw_no_attention', 'Draw No Attention', { incomeMult: 1.06, unrestAll: 0.7 }, 144);
        h.chronicle(ctx, 'era', 'No enquiry is made about the third column. The year is quiet, which is what was wanted.'); } }),

  // ── by the river ────────────────────────────────────────────────────────
  Y('ev597d_the_elders_sit_before_me', 'The Elders of Judah Sat Before Me', -591, 5, 'JDH',
    'The elders of the exile have taken to sitting in the priest\'s house by the canal '
    + 'and waiting. They are not there for a ruling — there is no jurisdiction here and '
    + 'nothing to rule on. They sit, and after a while he says something, and they go '
    + 'home and argue about it for a fortnight.\n\nHe has begun doing things instead of '
    + 'saying them: lying on one side for a fixed number of days, drawing the city on a '
    + 'clay tile and building siege works against the tile, weighing out his bread by the '
    + 'shekel. Grown men are coming from three settlements to watch a man eat a measured '
    + 'ration, because it is the only news from home anybody trusts.',
    'Ezekiel 8:1 and 14:1: the elders of Judah sat before the prophet in his house by the Chebar. The sign-acts of Ezekiel 4-5 are dated to the same years.',
    { label: 'Let the house by the canal become the court',
      tooltip: '−20 talents. "The House by the Canal" (+0.3 legitimacy a month, −0.7 unrest everywhere) permanently: an assembly with no power that everybody attends anyway.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -20, legitimacy: 14 });
        mod(ctx, 'd597_house_by_canal', 'The House by the Canal', { legitimacyAdd: 0.3, unrestAll: -0.7 });
        h.chronicle(ctx, 'era', 'The elders of the exile sit in the priest\'s house by the canal, which becomes the nearest thing to a court the people have.'); } },
    { label: 'Keep the elders in the settlements where the Babylonian can find them',
      tooltip: '+9% income and +30 governance points, and "Scattered Elders" (−0.2 legitimacy a month) permanently.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { gov: 30 });
        mod(ctx, 'd597_scattered_elders', 'Scattered Elders', { incomeMult: 1.09, legitimacyAdd: -0.2 });
        h.chronicle(ctx, 'era', 'The elders are kept in their own settlements, where the Babylonian administration can deal with them one at a time.'); } }),

  Y('ev597d_the_fugitive_came', 'The City Is Smitten', -587, 12, 'JDH',
    'In the twelfth year of our captivity, in the tenth month, in the fifth day of the '
    + 'month, one that had escaped out of Jerusalem came unto me, saying: the city is '
    + 'smitten.\n\nThe prophet has not spoken since the siege began except when he was '
    + 'given words. The evening before the man arrived his mouth was opened and he was no '
    + 'longer dumb. Everybody in the settlement is quite clear about the order of those '
    + 'two events, and nobody can agree what to do about the fact that the second one came '
    + 'first.',
    'Ezekiel 33:21-22: the fugitive reached the exiles with news of the fall, and the prophet\'s enforced silence ended the evening before he arrived.',
    { label: 'Send the news through every settlement the same week',
      tooltip: '−18 talents in couriers. "One Account, Everywhere" (+0.25 legitimacy a month, −0.6 unrest everywhere) permanently: a scattered people that hears the same thing on the same day is still one people.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -18, legitimacy: 12 });
        mod(ctx, 'd597_one_account', 'One Account, Everywhere', { legitimacyAdd: 0.25, unrestAll: -0.6 });
        h.chronicle(ctx, 'era', 'The news of the burning goes through every settlement of the exile in one week, in one form of words.'); } },
    { label: 'Let each settlement hear it as it hears it',
      tooltip: '+35 influence points from the rumours that prove useful, and "Nine Accounts" (+0.9 unrest everywhere) for twenty years.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { infl: 35 });
        mod(ctx, 'd597_nine_accounts', 'Nine Accounts', { unrestAll: 0.9 }, 240);
        h.chronicle(ctx, 'era', 'The news travels as news travels, and within a month there are nine versions of the fall of the city.'); } }),

  Y('ev597d_dry_bones', 'Son of Man, Can These Bones Live', -585, 8, 'JDH',
    'He set me down in the midst of the valley which was full of bones, and caused me to '
    + 'pass by them round about, and behold there were very many in the open valley, and '
    + 'lo, they were very dry.\n\nThe elders have understood the point and do not like it. '
    + 'The bones say: our bones are dried and our hope is lost, we are cut off for our '
    + 'parts. And the answer is not that they are wrong about being dead. The answer is '
    + 'that it does not follow.',
    'Ezekiel 37:1-14. The vision of the valley of dry bones, and the interpretation given in the text itself: these bones are the whole house of Israel.',
    { label: 'Let it be taught in every settlement',
      tooltip: '+24 legitimacy and "The Bones Live" (+0.4 legitimacy a month, +8% manpower, −0.5 unrest everywhere) permanently.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { legitimacy: 24 });
        mod(ctx, 'd597_bones_live', 'The Bones Live', { legitimacyAdd: 0.4, manpowerMult: 1.08, unrestAll: -0.5 });
        h.setFlag(ctx, 'bonesTaught', true);
        h.chronicle(ctx, 'era', 'The vision of the valley is taught in every settlement of the exile, and a people that had accepted it was dead stops accepting it.'); } },
    { label: 'Keep it among the priests. A hope announced too early is a revolt',
      tooltip: '+1 stability and "Held Among the Priests" (+7% income, −0.15 legitimacy a month) for thirty years.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { stability: 1 });
        mod(ctx, 'd597_held_among_priests', 'Held Among the Priests', { incomeMult: 1.07, legitimacyAdd: -0.15 }, 360);
        h.chronicle(ctx, 'era', 'The vision is kept among the priestly houses, on the argument that a hope announced too early to a people with nothing is a rising.'); } }),

  Y('ev597d_by_the_waters', 'We Hanged Our Harps Upon the Willows', -578, 3, 'JDH',
    'The Babylonians have discovered that the deportees sing, and have begun asking them '
    + 'to. Not cruelly — with genuine curiosity, at dinners, the way a man asks a '
    + 'foreigner to say something in his own language.\n\nThe temple singers are the ones '
    + 'being asked, because the songs people want are the temple ones. Sing us one of the '
    + 'songs of Zion. And the argument in the settlements is whether that is a thing a man '
    + 'may do for money in a foreign country, or whether the right hand should forget its '
    + 'cunning first.',
    'Psalm 137. The psalm is the only one in the collection that names the Babylonian exile directly, and its last verses are not usually read aloud in full.',
    { label: 'The songs of the house are not sung for hire',
      tooltip: '−45 talents in refused fees and "The Harps on the Willows" (+0.3 legitimacy a month, −0.4 unrest everywhere) permanently.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -45, legitimacy: 18 });
        mod(ctx, 'd597_harps_on_willows', 'The Harps on the Willows', { legitimacyAdd: 0.3, unrestAll: -0.4 });
        h.chronicle(ctx, 'era', 'The singers refuse the fee, and a psalm is made about the refusing that outlives everyone at the dinner.'); } },
    { label: 'Let them sing and be paid',
      tooltip: '+95 talents and "The Singers of Babylon" (+11% trade, −0.2 legitimacy a month) permanently. The songs get out into the world, which cuts both ways.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: 95 });
        mod(ctx, 'd597_singers_of_babylon', 'The Singers of Babylon', { tradeMult: 1.11, legitimacyAdd: -0.2 });
        h.chronicle(ctx, 'era', 'The singers are paid, and the songs of the house are heard at Babylonian tables by people who find them beautiful.'); } }),

  Y('ev597d_al_yahudu', 'The Town of Judah, in the Province of Babylon', -575, 4, 'JDH',
    'The settlements have names now, and one of them is on the tablets as Al-Yahudu — '
    + 'the town of Judah — which is a Babylonian clerk\'s way of saying we have put them '
    + 'all in one place and here is what it is called.\n\nThe tablets are ordinary: a '
    + 'lease of a date grove, a loan at interest, a suit about a boundary, a marriage '
    + 'settlement. The names in them are Judaean and the law in them is Babylonian and '
    + 'nobody involved thinks either fact is remarkable. This is what survival looks like '
    + 'from the inside, and it is almost entirely uninteresting, which is the point.',
    'The Al-Yahudu archive: some two hundred cuneiform tablets from a Judaean settlement in Babylonia, recording ordinary business from the 570s onward under Judaean personal names.',
    { label: 'Take the land grants and pay the service they carry',
      tooltip: '+13% income and +9% growth permanently, and "The King\'s Land" (−0.2 legitimacy a month): tenants of the crown are prosperous and are tenants.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: 60 });
        mod(ctx, 'd597_kings_land', 'The King\'s Land', { incomeMult: 1.13, growthMult: 1.09, legitimacyAdd: -0.2 });
        h.chronicle(ctx, 'era', 'The settlements take the royal land grants and the military service that comes attached to them.'); } },
    { label: 'Trade and lend, and hold no land from the king',
      tooltip: '+15% trade permanently and "No Land From the King" (+0.25 legitimacy a month, −5% growth): a people that can leave.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { legitimacy: 12 });
        mod(ctx, 'd597_no_land_from_king', 'No Land From the King', { tradeMult: 1.15, growthMult: 0.95, legitimacyAdd: 0.25 });
        h.chronicle(ctx, 'era', 'The settlements keep to trade and lending and take no land from the crown, so that nothing holds them down.'); } }),

  Y('ev597d_jehoiachin_lifted_up', 'He Did Eat Bread Continually Before Him', -561, 4, 'JDH',
    'In the seven and thirtieth year of the captivity, in the twelfth month, on the seven '
    + 'and twentieth day, the new king of Babylon lifted up the head of Jehoiachin king of '
    + 'Judah out of prison. He spoke kindly to him, and set his throne above the throne of '
    + 'the kings that were with him in Babylon, and changed his prison garments.\n\nThe '
    + 'storehouse clerks have been issuing oil to him for years under a standing order: to '
    + 'Ya\'u-kinu, king of the land of Yahudu, and to his five sons. The house of David has '
    + 'been a ration line in a Babylonian ledger for thirty-seven years, and it is still '
    + 'there, which is more than can be said for the house of the LORD.',
    '2 Kings 25:27-30, confirmed by ration tablets from the South Palace at Babylon listing Ya\'u-kinu king of Yahudu and his five sons among the recipients of oil.',
    { label: 'The line is kept and the reckoning runs from his captivity',
      tooltip: '+26 legitimacy and "The Head Lifted Up" (+0.35 legitimacy a month, +6% manpower) permanently. There is still a king, and everyone can name him.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { legitimacy: 26 });
        mod(ctx, 'd597_head_lifted_up', 'The Head Lifted Up', { legitimacyAdd: 0.35, manpowerMult: 1.06 });
        h.setFlag(ctx, 'davidicLineKept', true);
        h.chronicle(ctx, 'era', 'Jehoiachin is brought out of prison and seated above the other captive kings, and the exile begins dating its years from his captivity.'); } },
    { label: 'Let the kingship lapse and govern by the elders',
      tooltip: '+45 governance points and "Governed by Elders" (+12% income, −0.3 legitimacy a month) permanently: a community that has stopped waiting for a king.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { gov: 45, legitimacy: -15 });
        mod(ctx, 'd597_governed_by_elders', 'Governed by Elders', { incomeMult: 1.12, legitimacyAdd: -0.3 });
        h.chronicle(ctx, 'era', 'The pardoned king is honoured and not obeyed. The elders govern, and the habit sets.'); } }),

  // ── the return ──────────────────────────────────────────────────────────
  Y('ev597d_the_vessels_counted', 'Five Thousand and Four Hundred', -537, 7, 'JDH',
    'The treasurer of the king of Persia has brought out the vessels of the house of the '
    + 'LORD, which Nebuchadnezzar had brought forth out of Jerusalem and put in the house '
    + 'of his gods, and is counting them out to the prince of Judah by number and by '
    + 'weight.\n\nThirty chargers of gold, a thousand chargers of silver, nine and twenty '
    + 'knives, thirty basons of gold — the list is tedious and it is the most important '
    + 'document of the century, because it is a receipt. Everything on it was taken out of '
    + 'a burning building forty-nine years ago by men who had no reason to expect to give '
    + 'any of it back.',
    'Ezra 1:7-11. Mithredath the treasurer counted the temple vessels out to Sheshbazzar, 5,400 in total by the summary figure.',
    { label: 'Take them by number and by weight, and sign for them',
      tooltip: '−25 talents for the escort. "Counted Out and Signed For" (+0.3 legitimacy a month, +8% income) permanently.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -25, legitimacy: 20 });
        mod(ctx, 'd597_counted_and_signed', 'Counted Out and Signed For', { legitimacyAdd: 0.3, incomeMult: 1.08 });
        h.chronicle(ctx, 'era', 'The vessels are counted out by number and by weight and signed for, which is how a restoration is made into a fact.'); } },
    { label: 'Ask for the value in silver instead and buy what is needed',
      tooltip: '+260 talents at once, and "The Vessels Not Returned" (−0.35 legitimacy a month) permanently.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: 260, legitimacy: -18 });
        mod(ctx, 'd597_vessels_not_returned', 'The Vessels Not Returned', { legitimacyAdd: -0.35 });
        h.chronicle(ctx, 'era', 'The vessels are commuted to silver. It is a great deal of silver, and the old men never stop mentioning it.'); } }),

  Y('ev597d_the_old_men_wept', 'The People Could Not Discern the Shouting', -536, 2, 'JDH',
    'The builders laid the foundation, and the priests stood in their apparel with '
    + 'trumpets, and the Levites with cymbals, and they sang together by course. And all '
    + 'the people shouted with a great shout when they praised the LORD, because the '
    + 'foundation of the house was laid.\n\nBut many of the priests and Levites and chief '
    + 'of the fathers, who were ancient men that had seen the first house, wept with a '
    + 'loud voice when the foundation of this house was laid before their eyes. And the '
    + 'people could not discern the noise of the shout of joy from the noise of the '
    + 'weeping of the people, for the people shouted with a loud shout, and the noise was '
    + 'heard afar off.',
    'Ezra 3:10-13. Haggai 2:3 addresses the same men: who is left among you that saw this house in her first glory? and how do ye see it now?',
    { label: 'Let both noises stand, and build to the plan that is left',
      tooltip: '−70 talents. "Both Noises" (+0.3 legitimacy a month, −0.6 unrest everywhere, +7% growth) permanently.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -70, legitimacy: 18 });
        mod(ctx, 'd597_both_noises', 'Both Noises', { legitimacyAdd: 0.3, unrestAll: -0.6, growthMult: 1.07 });
        h.chronicle(ctx, 'era', 'The foundation is laid, and the shouting and the weeping are not separated, because nobody can separate them.'); } },
    { label: 'Build it to the first house\'s measure, whatever it costs',
      tooltip: '−240 talents and eight years. "To the First Measure" (+0.45 legitimacy a month, +9% income, +1 unrest everywhere) permanently.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -240, legitimacy: 28 });
        mod(ctx, 'd597_first_measure', 'To the First Measure', { legitimacyAdd: 0.45, incomeMult: 1.09, unrestAll: 1 });
        h.chronicle(ctx, 'era', 'The house is ordered built to the measure of the first one, at a cost the province cannot really carry.'); } }),

  Y('ev597d_let_us_build_with_you', 'Let Us Build With You, For We Seek Your God', -534, 6, 'JDH',
    'The people of the land have come to the heads of the fathers with an offer, and it '
    + 'is a reasonable one: let us build with you, for we seek your God as ye do, and we '
    + 'do sacrifice unto him since the days of Esarhaddon king of Assur, which brought us '
    + 'up hither.\n\nThat last clause is the whole problem. They have been sacrificing to '
    + 'him for a hundred and eighty years, and they were brought up hither by an Assyrian '
    + 'king, and both of those things are true at once. The answer given was: ye have '
    + 'nothing to do with us to build a house unto our God. Nobody involved is going to '
    + 'forget it.',
    'Ezra 4:1-5. The refusal of the northern offer, and the resulting obstruction of the work "all the days of Cyrus, even until the reign of Darius", is the sharpest surviving root of the Judaean-Samaritan breach.',
    { label: 'Ye have nothing to do with us',
      tooltip: '+22 legitimacy and "One House, One People" (+0.35 legitimacy a month, +10% conversion) permanently. The work stops for fifteen years and the breach is permanent.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { legitimacy: 22 });
        mod(ctx, 'd597_one_house_one_people', 'One House, One People', { legitimacyAdd: 0.35, convertMult: 1.1 });
        mod(ctx, 'd597_the_work_ceased', 'The Work Ceased', { incomeMult: 0.9, unrestAll: 0.8 }, 180);
        h.setFlag(ctx, 'northernOfferRefused', true);
        h.chronicle(ctx, 'era', 'The offer from the people of the land is refused outright, and the work on the house stops for a generation.'); } },
    { label: 'Take the hands and settle the doctrine later',
      tooltip: '+180 talents of labour and materials and "Built With Many Hands" (+14% growth, +9% income, −0.3 legitimacy a month) permanently. The house goes up in half the time and nobody can say whose it is.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: 180, legitimacy: -14 });
        mod(ctx, 'd597_many_hands', 'Built With Many Hands', { growthMult: 1.14, incomeMult: 1.09, legitimacyAdd: -0.3 });
        h.setFlag(ctx, 'northernOfferAccepted', true);
        h.chronicle(ctx, 'era', 'The hands are taken. The house rises quickly, and the question of whose house it is is left for later, which means forever.'); } }),

  Y('ev597d_panelled_houses', 'Is It Time For You To Dwell In Cieled Houses', -520, 5, 'JDH',
    'The prophet put it as a question and then answered it with the harvest returns. Ye '
    + 'have sown much and bring in little; ye eat, but ye have not enough; ye clothe you, '
    + 'but there is none warm; and he that earneth wages earneth wages to put it into a '
    + 'bag with holes.\n\nThen he told them to consider their ways, and then he told them '
    + 'why: because mine house that is waste, and ye run every man unto his own house. The '
    + 'foundation has been standing open to the weather for sixteen years while everybody '
    + 'who came up from Babylon roofed their own.',
    'Haggai 1, dated to the second year of Darius, 520 BCE. Work on the temple resumed within a month of the oracle, according to the book\'s own chronology.',
    { label: 'Consider the ways, and go up to the mountain and bring wood',
      tooltip: '−130 talents and every hand in the province for two years. "The Work Resumed" (+0.4 legitimacy a month, +10% growth) permanently.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -130, legitimacy: 24 });
        h.removeModifier(ctx, P(ctx), 'd597_the_work_ceased');
        mod(ctx, 'd597_work_resumed', 'The Work Resumed', { legitimacyAdd: 0.4, growthMult: 1.1 });
        h.chronicle(ctx, 'era', 'The people go up to the mountain and bring wood, and the work on the house begins again after sixteen years.'); } },
    { label: 'The province cannot afford it this year either',
      tooltip: '+110 talents kept in the province and "Every Man Unto His Own House" (+13% income, +8% growth, −0.35 legitimacy a month) permanently.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: 110, legitimacy: -16 });
        mod(ctx, 'd597_own_house', 'Every Man Unto His Own House', { incomeMult: 1.13, growthMult: 1.08, legitimacyAdd: -0.35 });
        h.chronicle(ctx, 'era', 'The work is deferred another year. The province is visibly richer for it and the foundation stands open another winter.'); } }),

  Y('ev597d_the_house_of_the_rolls', 'Let Search Be Made in the House of the Rolls', -518, 3, 'JDH',
    'The governor beyond the river has written to the king asking whether these people '
    + 'have any authority at all for what they are doing, and has helpfully enclosed their '
    + 'answer: that a king of Persia made a decree about it, and that if his majesty '
    + 'consults the archive he will find it.\n\nIt was a very dangerous thing to say. They '
    + 'searched at Babylon and found nothing. Then somebody thought to search the summer '
    + 'palace at Ecbatana in the province of the Medes, and there was found a roll, and '
    + 'therein was a record written: in the first year of Cyrus the king, the same Cyrus '
    + 'made a decree concerning the house of God at Jerusalem.',
    'Ezra 5-6. The memorandum was found at Ecbatana, not Babylon, and Darius not only confirmed it but charged the costs to the provincial revenue.',
    { label: 'Rest the whole case on the archive',
      tooltip: '+40 influence points and "The Roll at Ecbatana" (+0.3 legitimacy a month, +11% income) permanently: the empire pays for the house out of its own tribute.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { infl: 40, legitimacy: 20, treasury: 90 });
        mod(ctx, 'd597_roll_at_ecbatana', 'The Roll at Ecbatana', { legitimacyAdd: 0.3, incomeMult: 1.11 });
        h.chronicle(ctx, 'era', 'The decree of Cyrus is found at Ecbatana, and the costs of the house are charged to the tribute of the province beyond the river.'); } },
    { label: 'Settle privately with the governor and keep the archive out of it',
      tooltip: '−120 talents in gifts and "An Understanding With the Governor" (+9% trade, −0.2 legitimacy a month) permanently.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -120 });
        mod(ctx, 'd597_understanding', 'An Understanding With the Governor', { tradeMult: 1.09, legitimacyAdd: -0.2 });
        h.chronicle(ctx, 'era', 'The matter is settled with the governor privately and the archive is never troubled, which works and satisfies nobody.'); } }),

  Y('ev597d_the_house_finished', 'The Third Day of the Month Adar', -516, 3, 'JDH',
    'This house was finished on the third day of the month Adar, which was in the sixth '
    + 'year of the reign of Darius the king. Seventy years, near enough, from the seventh '
    + 'of Ab.\n\nAt the dedication they offered a hundred bullocks, two hundred rams, four '
    + 'hundred lambs — and twelve he goats, according to the number of the tribes of '
    + 'Israel. There have not been twelve tribes for two hundred years. Somebody counted '
    + 'out twelve animals anyway, in a province the size of a county, for a people most of '
    + 'whom live somewhere else.',
    'Ezra 6:15-17. The Second Temple was completed in Adar of Darius\'s sixth year, 516 BCE, and stood until 70 CE.',
    { label: 'Twelve he-goats, for the number of the tribes of Israel',
      tooltip: '−50 talents and "According to the Number of the Tribes" (+0.4 legitimacy a month, +9% manpower, −0.5 unrest everywhere) permanently.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -50, legitimacy: 30, stability: 1 });
        mod(ctx, 'd597_number_of_tribes', 'According to the Number of the Tribes', { legitimacyAdd: 0.4, manpowerMult: 1.09, unrestAll: -0.5 });
        h.setFlag(ctx, 'secondHouseFinished', true);
        h.chronicle(ctx, 'era', 'The house is finished on the third of Adar, and twelve he-goats are offered for twelve tribes, most of which no longer exist.'); } },
    { label: 'Offer for Judah and Benjamin, which is who is actually here',
      tooltip: '−20 talents and "For Those Who Are Here" (+12% income, +0.2 legitimacy a month) permanently: an honest liturgy for a small province.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -20, legitimacy: 14, gov: 30 });
        mod(ctx, 'd597_those_who_are_here', 'For Those Who Are Here', { incomeMult: 1.12, legitimacyAdd: 0.2 });
        h.setFlag(ctx, 'secondHouseFinished', true);
        h.chronicle(ctx, 'era', 'The dedication offers for Judah and Benjamin, and the claim on the ten tribes is quietly not made.'); } }),

  // ── the law ─────────────────────────────────────────────────────────────
  Y('ev597d_the_scribe_came_up', 'A Ready Scribe in the Law of Moses', -458, 5, 'JDH',
    'He came up from Babylon with a letter from the king, a freewill offering from the '
    + 'province, and a company of about fifteen hundred men with their households. He is '
    + 'not a governor and not a priest-king; the letter calls him a scribe of the law of '
    + 'the God of heaven, which is a Persian title for a man who knows what a subject '
    + 'people\'s own law says.\n\nHe proclaimed a fast at the river Ahava before they set '
    + 'out, because he was ashamed to ask the king for soldiers and horsemen to help them '
    + 'against the enemy in the way — having told the king that the hand of our God is '
    + 'upon all them for good that seek him. Twelve priests were given the silver to '
    + 'carry, weighed, by name, and weighed again on arrival.',
    'Ezra 7-8. Ezra came up in the seventh year of Artaxerxes with a royal rescript authorising him to appoint judges and enforce the law of his God as the king\'s law.',
    { label: 'Let the law be the law of the king in this province',
      tooltip: '+55 governance points and "The Law of the God of Heaven" (+0.35 legitimacy a month, +12% governing efficiency, +0.6 unrest everywhere) permanently.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { gov: 55, legitimacy: 22 });
        mod(ctx, 'd597_law_of_heaven', 'The Law of the God of Heaven', { legitimacyAdd: 0.35, adminMult: 1.12, unrestAll: 0.6 });
        h.setFlag(ctx, 'ezraLaw', true);
        h.chronicle(ctx, 'era', 'The law is made enforceable as the king\'s law in the province, with judges appointed to it.'); } },
    { label: 'Receive him honourably and keep the courts as they are',
      tooltip: '+9% income and −0.7 unrest everywhere permanently, and "Custom, Not Statute" (−0.25 legitimacy a month).',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { legitimacy: -10 });
        mod(ctx, 'd597_custom_not_statute', 'Custom, Not Statute', { incomeMult: 1.09, unrestAll: -0.7, legitimacyAdd: -0.25 });
        h.chronicle(ctx, 'era', 'The scribe is received honourably and given no jurisdiction. The courts go on as they were.'); } }),

  Y('ev597d_the_people_stood', 'The Ears of All the People Were Attentive', -457, 7, 'JDH',
    'They gathered themselves together as one man into the street that was before the '
    + 'water gate, and he read in it from the morning until midday, and the ears of all '
    + 'the people were attentive unto the book of the law. And the Levites caused the '
    + 'people to understand the law, and gave the sense, and caused them to understand the '
    + 'reading — which means they translated it, because a good many of the people in that '
    + 'street did not speak Hebrew any more.\n\nThe people wept when they heard the words. '
    + 'They were told not to: this day is holy, go your way, eat the fat and drink the '
    + 'sweet, and send portions unto them for whom nothing is prepared. The weeping was '
    + 'stopped on purpose, and that instruction is why there is a festival and not a fast '
    + 'at the head of the year.',
    'Nehemiah 8. The public reading at the water gate, with the Levites giving the sense — the earliest description of what became the synagogue service.',
    { label: 'Read it publicly, translate it, and make the day a feast',
      tooltip: '−35 talents. "The Reading at the Water Gate" (+0.45 legitimacy a month, −0.8 unrest everywhere, +8% growth) permanently: a people that can all hear its own law.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -35, legitimacy: 26, stability: 1 });
        mod(ctx, 'd597_water_gate', 'The Reading at the Water Gate', { legitimacyAdd: 0.45, unrestAll: -0.8, growthMult: 1.08 });
        h.setFlag(ctx, 'publicReading', true);
        h.chronicle(ctx, 'era', 'The law is read publicly at the water gate and translated as it is read, and the day is kept as a feast.'); } },
    { label: 'Keep the reading to the courts and the priestly houses',
      tooltip: '+50 governance points and "Read in the Courts" (+13% governing efficiency, −0.3 legitimacy a month) permanently.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { gov: 50, legitimacy: -12 });
        mod(ctx, 'd597_read_in_courts', 'Read in the Courts', { adminMult: 1.13, legitimacyAdd: -0.3 });
        h.chronicle(ctx, 'era', 'The reading is kept to the courts and the priestly houses, where it is better understood and less use.'); } }),
];
