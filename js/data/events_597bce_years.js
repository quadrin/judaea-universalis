// Judaea Universalis — the years the chain skips: 580–504 BCE (SPEC §241,
// §268). Content package. Zero imports; every effect runs through ctx.helpers.
//
// The Babylonian chapter is the only one whose middle is entirely off the
// map: between the burning of the city and the edict there is no king, no
// army, no capital and no annals, and the chain accordingly jumps from 585 to
// 560 and from 538 to 520. The §241 decade rule refuses the jump, and the
// refusal is the point — the fifty years with nothing in the chronicle are
// the fifty years in which this people stops being a kingdom and becomes
// something that can survive not being one. Eight cards, and not one of them
// is about a battle: a book of dirges recited on a ruin, a plan for a house
// that does not exist, a new pharaoh over the people who ran to Egypt, a
// register of families kept where no land goes with it, a prophet who names
// a Persian, a foundation with nothing on it, a jar handle with a province
// stamped on it, and the community that decided not to come back.
//
// Sources: 2 Kings 25; Jeremiah 40-44; Lamentations; Ezekiel 33-48 with its
// dated headings; Ezra 1-6; Haggai and Zechariah; Isaiah 40-48; Herodotus II
// on Amasis; the Nabonidus Chronicle; the Yehud seal impressions.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_597bce_years] ' + key, e || '');
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

export const EVENTS_597_YEARS = [

  Y('ev597y_the_city_sits_solitary', 'How Doth the City Sit Solitary', -580, 5, 'JDH',
    'People are going up to the burnt site to mourn, and somebody has given the mourning '
    + 'a form. Five dirges, four of them running straight through the alphabet, one '
    + 'letter to a stanza — so that grief has a shape, an order and an end, and a man who '
    + 'has lost everything has something to say that does not have to be invented on the '
    + 'spot.\n\nThe elders are divided. The poems say the disaster was deserved, which '
    + 'protects the faith and indicts the fathers; they also say it plainly enough that '
    + 'the Babylonian resident could take it as sedition if he wanted to. And they will '
    + 'be recited every year, forever, if they are allowed to start.',
    'Lamentations: four acrostic dirges and a closing prayer, composed in the years after 586 for recitation at the ruined site. The fast of the fifth month kept them in use for two and a half thousand years.',
    { label: 'Let them be written out and said on the site', tooltip: '−40 talents and "The Book of Dirges" (+0.3 legitimacy a month, −0.7 unrest everywhere) permanently: a calendar of mourning that holds a people together without a country.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -40, legitimacy: 18 });
        mod(ctx, 'y597_book_of_dirges', 'The Book of Dirges', { legitimacyAdd: 0.3, unrestAll: -0.7 });
        h.chronicle(ctx, 'era', 'The dirges are copied out and said on the ninth day at the burnt site. The fast of the fifth month becomes a fixed thing.'); } },
    { label: 'Stop the assemblies at the ruin', tooltip: '+40 governance points and "No Gathering at the Ruin" (+7% income, +0.9 unrest everywhere) for twenty-five years. The resident is reassured; the poems circulate anyway.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { gov: 40, legitimacy: -12 });
        mod(ctx, 'y597_no_gathering', 'No Gathering at the Ruin', { incomeMult: 1.07, unrestAll: 0.9 }, 300);
        h.chronicle(ctx, 'era', 'The gatherings at the site are broken up. The dirges are learned by heart instead, which turns out to be harder to break up.'); } }),

  Y('ev597y_the_plan_of_the_house', 'A Plan for a House That Does Not Exist', -573, 4, 'JDH',
    'In the twenty-fifth year of the deportation, a priest among the exiles has produced '
    + 'a set of measurements. Gates, courts, chambers, the thickness of every wall, the '
    + 'steps of the altar, the portions of the land around it — a complete specification '
    + 'for a temple, drawn up six hundred miles from the hill it is meant to stand on, '
    + 'for a country nobody in the room governs.\n\nThe practical men say it is a waste '
    + 'of good scribes. The priests say that a people who keep the plan of the house are '
    + 'a people who still have the house, and that when the day comes there will be no '
    + 'argument about what is to be built, because it will already be written.',
    'Ezekiel 40-48, headed "in the twenty-fifth year of our captivity" — 573 BCE. The measurements are of a temple that was never built to them, and they kept the idea of one alive.',
    { label: 'Copy the plan and keep it with the registers', tooltip: '−30 talents and "The House in Writing" (+0.25 legitimacy a month, −8% cost of governing) permanently: an institution that survives having no building.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -30, infl: 20 });
        mod(ctx, 'y597_house_in_writing', 'The House in Writing', { legitimacyAdd: 0.25, adminMult: 0.92 });
        h.chronicle(ctx, 'era', 'The measurements are copied and filed with the family registers. A temple exists, on papyrus, with its gates numbered.'); } },
    { label: 'Put the scribes on the law instead', tooltip: '+35 governance points and "The Scribes on the Law" (+10% income, +0.2 legitimacy a month) for forty years — the rules a scattered people can keep, rather than a building it cannot.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { gov: 35, legitimacy: 10 });
        mod(ctx, 'y597_scribes_on_the_law', 'The Scribes on the Law', { incomeMult: 1.1, legitimacyAdd: 0.2 }, 480);
        h.chronicle(ctx, 'era', 'The scribal effort goes into the statutes rather than the elevations. What gets carried home is a law code, not a blueprint.'); } }),

  Y('ev597y_a_new_pharaoh', 'A New Pharaoh Over the Ones Who Ran', -570, 3, 'JDH',
    'The Judaeans who went down to Egypt rather than stay under the governor — the party '
    + 'that took the prophet with them against his will — have just had the ground move '
    + 'under them again. Apries has been deposed by his own general, and Amasis is '
    + 'pharaoh: a man who owes his throne to the native soldiery and has spent a year '
    + 'explaining to them why he keeps foreign troops at all.\n\nThe settlements at '
    + 'Migdal, Tahpanhes, Noph and Pathros want to know whether they are still garrison '
    + 'communities with a charter, or foreigners in a country that has just had a '
    + 'nativist revolution.',
    'Amasis II deposed Apries in 570 BCE. Jeremiah 44 names the Judaean settlements in Egypt; the Elephantine garrison shows how long such communities lasted under Egyptian and then Persian pay.',
    { label: 'Send to Amasis and buy the charter', tooltip: '−90 talents and "The Garrisons in Egypt" (+8% income, +5% manpower) permanently: a second community, paid, armed and reachable.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -90, infl: 15 });
        mod(ctx, 'y597_garrisons_in_egypt', 'The Garrisons in Egypt', { incomeMult: 1.08, manpowerMult: 1.05 });
        h.chronicle(ctx, 'era', 'The Nile settlements are confirmed in their pay and their walls. They will still be there, writing letters in Aramaic, a century and a half later.'); } },
    { label: 'Call them back north', tooltip: '+3,000 manpower and "The Return From the Delta" (+6% growth, −0.5 unrest everywhere) for thirty years, at −60 talents. Most of them do not come.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { manpower: 3000, treasury: -60, legitimacy: 10 });
        mod(ctx, 'y597_return_from_delta', 'The Return From the Delta', { growthMult: 1.06, unrestAll: -0.5 }, 360);
        h.chronicle(ctx, 'era', 'A summons goes down the coast road to the Delta. Some families come back up it. The rest write that the bread was better in Pathros.'); } }),

  Y('ev597y_the_register', 'A Register With No Land Attached', -565, 7, 'JDH',
    'The elders have begun keeping lists. Not tax lists — there is nothing here to tax — '
    + 'but lists of who is whose son, of which priestly course a man belongs to, of which '
    + 'town in the hill country a family came up from, and how many of them there are '
    + 'now.\n\nIt is the strangest administrative act any of them have performed: a '
    + 'cadastre of a country that is six hundred miles away and not theirs, kept by men '
    + 'with no jurisdiction, for a return nobody has authorised. And it means that when '
    + 'somebody eventually asks who these people are, there will be an answer with '
    + 'numbers in it.',
    'The register behind Ezra 2 and Nehemiah 7 lists the returning community by family and by town of origin, with a note on the priestly houses that could not prove their descent and were put off the altar.',
    { label: 'Keep the register by father\'s house and town', tooltip: '−35 talents and "The Golah Register" (−10% cost of governing, +0.2 legitimacy a month, +4% growth) permanently: a people that can count and prove itself.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -35, gov: 20 });
        mod(ctx, 'y597_golah_register', 'The Golah Register', { adminMult: 0.9, legitimacyAdd: 0.2, growthMult: 1.04 });
        h.chronicle(ctx, 'era', 'The families are enrolled by father\'s house and by the town they came up from. Three priestly houses cannot prove their descent and are noted as such.'); } },
    { label: 'Enrol everyone who keeps the sabbath', tooltip: '+9% growth and "The Wider Enrolment" (+9% growth, +7% manpower, −0.3 legitimacy a month) permanently: a bigger people and a longer argument about who belongs to it.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { gov: -15, legitimacy: -8 });
        mod(ctx, 'y597_wider_enrolment', 'The Wider Enrolment', { growthMult: 1.09, manpowerMult: 1.07, legitimacyAdd: -0.3 });
        h.chronicle(ctx, 'era', 'Descent is set aside for practice, and the rolls fill up. The priestly houses will spend the next four generations trying to get the decision reversed.'); } }),

  Y('ev597y_the_name_of_a_persian', 'Comfort, and the Name of a Persian', -548, 6, 'JDH',
    'There is a voice in the assembly saying things that have not been said before. That '
    + 'the term of service is finished and the debt is paid double. That the gods of '
    + 'Babylon are objects, carried on the backs of tired animals by men who then have to '
    + 'carry the animals. And — this is the part that empties the room — that the God of '
    + 'Israel has taken a foreign king by the right hand and named him his anointed, and '
    + 'that the king\'s name is Cyrus.\n\nMedia has just fallen to that man. Saying so in '
    + 'Babylon, in the reign of Nabonidus, in writing, is either prophecy or treason, and '
    + 'the assembly has to decide which of the two it is about to publish.',
    'Isaiah 40-48, composed in the last years of Babylon. Cyrus took Ecbatana in 550 and is named in Isaiah 44:28 and 45:1 — the only foreign king in the Hebrew Bible called the LORD\'s anointed.',
    { label: 'Publish it', tooltip: '+25 legitimacy and "The Name Published" (+12% morale, −0.8 unrest everywhere, +0.3 legitimacy a month) permanently. A people with a named date of release.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { legitimacy: 25, infl: 20 });
        mod(ctx, 'y597_name_published', 'The Name Published', { moraleMult: 1.12, unrestAll: -0.8, legitimacyAdd: 0.3 });
        h.chronicle(ctx, 'era', 'The poems are copied and read out at the assemblies by the canal. When the Persians do come, a large number of people are already expecting them.'); } },
    { label: 'Keep it in the house until the wind changes', tooltip: '+45 governance points and "Nothing Written Down" (+9% income, −0.4 legitimacy a month) for twenty years. Nobody is arrested; nobody is moved either.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { gov: 45, treasury: 60 });
        mod(ctx, 'y597_nothing_written', 'Nothing Written Down', { incomeMult: 1.09, legitimacyAdd: -0.4 }, 240);
        h.chronicle(ctx, 'era', 'The word stays in the house of the elders. The community is safe, prosperous, and entirely unprepared for 539.'); } }),

  Y('ev597y_the_foundation', 'A Foundation With Nothing On It', -528, 4, 'JDH',
    'The altar was set up on its site in the first year back and the burnt offering has '
    + 'been made on it morning and evening since. The foundation of the house was laid '
    + 'the year after, to trumpets, with the old men who had seen the first house weeping '
    + 'so loudly that nobody could tell the shouting from the crying.\n\nAnd that is where '
    + 'it has stayed. The people of the land offered to build with us and were told no, '
    + 'on the ground that they are not of the register; they have been writing to the '
    + 'court ever since. The timber allocation has lapsed, the masons have gone back to '
    + 'their own houses, and there is a stone platform on the hill with nothing standing '
    + 'on it.',
    'Ezra 3-4: the altar and the foundation, the refusal of the people of the land, and the letters to the Persian court. The work stopped until the second year of Darius, sixteen years later.',
    { label: 'Hold the register and wait for a better king', tooltip: '+30 governance points and "The Altar Without the House" (+0.25 legitimacy a month, −6% income) permanently: worship continues, the building does not.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { gov: 30, legitimacy: 12 });
        mod(ctx, 'y597_altar_without_house', 'The Altar Without the House', { legitimacyAdd: 0.25, incomeMult: 0.94 });
        h.chronicle(ctx, 'era', 'The offering is made twice a day on an open platform, and the hill waits sixteen years for a king who will read the archives.'); } },
    { label: 'Take the neighbours\' hands and build now', tooltip: '−70 talents and "Built With the People of the Land" (+10% income, +6% growth, −0.3 legitimacy a month) permanently. The house goes up; the argument about who built it never ends.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -70, gov: -20 });
        mod(ctx, 'y597_built_with_the_land', 'Built With the People of the Land', { incomeMult: 1.1, growthMult: 1.06, legitimacyAdd: -0.3 });
        h.chronicle(ctx, 'era', 'The offer is accepted and the walls go up fast. Two generations later nobody can agree whose house it is, and both sides have documents.'); } }),

  Y('ev597y_a_name_on_a_jar_handle', 'A Province Stamped on a Jar Handle', -509, 3, 'JDH',
    'The wine and oil coming in to the treasury this season are in jars whose handles '
    + 'were stamped before firing, and what is stamped on them is not a king\'s name. It '
    + 'is three letters — the name of the province — and beside them, on the official '
    + 'ones, the seal of the governor.\n\nIt is a small thing that says a great deal. This '
    + 'is not a kingdom and will not be one; it is a sub-district of a satrapy, with a '
    + 'boundary, a revenue, an appointed head and a name in the imperial files. The '
    + 'elders are arguing about whether to be pleased. The alternative to being a province '
    + 'is not being a kingdom. It is not being on the list at all.',
    'The Yehud stamp impressions on storage-jar handles, with the province name and later its governors\' seals. Yehud\'s own small silver coins follow in the next century.',
    { label: 'Take the province and work it', tooltip: '−25 talents and "The Province of Yehud" (−12% cost of governing, +8% income, +0.2 legitimacy a month) permanently: a real administration inside somebody else\'s empire.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -25, gov: 25 });
        mod(ctx, 'y597_province_of_yehud', 'The Province of Yehud', { adminMult: 0.88, incomeMult: 1.08, legitimacyAdd: 0.2 });
        h.chronicle(ctx, 'era', 'The stamps go on every jar of the tithe, the governor\'s seal goes on the returns, and the province acquires the one thing it has lacked: a file.'); } },
    { label: 'Stamp the house\'s mark, not the satrapy\'s', tooltip: '+20 legitimacy and "The Mark of the House" (+10% morale, +0.3 legitimacy a month, +6% cost of governing) for forty years. The satrapal auditors will ask.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { legitimacy: 20, gov: -15 });
        mod(ctx, 'y597_mark_of_the_house', 'The Mark of the House', { moraleMult: 1.1, legitimacyAdd: 0.3, adminMult: 1.06 }, 480);
        h.chronicle(ctx, 'era', 'The sanctuary\'s mark is fired into the handles instead of the province\'s. Somewhere in Damascus a clerk puts the discrepancy in a report.'); } }),

  Y('ev597y_the_ones_who_stayed', 'The Ones Who Stayed', -504, 9, 'JDH',
    'The counting of the return is finished and the number is not the interesting part. '
    + 'The interesting part is the remainder: the great majority of the community in '
    + 'Babylonia did not come. They have land, businesses, contracts in the local courts '
    + 'and children who have never seen the hill country, and they were not obliged to '
    + 'move.\n\nThey are also, by a very long way, the richest part of this people. What '
    + 'comes west from them is silver, timber allocations, letters to the court, and '
    + 'occasionally a man with a commission. What does not come west is them. The elders '
    + 'have to decide what that community is: a failure of nerve to be shamed, or a second '
    + 'centre to be cultivated.',
    'Most of the Babylonian community never returned. It funded the province, produced Ezra and Nehemiah, and remained a centre of Jewish life for a millennium and a half.',
    { label: 'Cultivate them as a second centre', tooltip: '−20 talents and "The Two Centres" (+14% income, −8% cost of governing, +0.15 legitimacy a month) permanently: a province funded from abroad, and answerable to the funders.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { treasury: -20, infl: 25 });
        mod(ctx, 'y597_two_centres', 'The Two Centres', { incomeMult: 1.14, adminMult: 0.92, legitimacyAdd: 0.15 });
        h.chronicle(ctx, 'era', 'The eastern community is written to as a partner rather than a defaulter. The silver arrives every year, and so, eventually, do the men who will rewrite the law.'); } },
    { label: 'Rule that the land is where the people belong', tooltip: '+6% growth and "The Land Is the People" (+7% growth, +9% manpower, −8% income) permanently: a province that counts only what stands on its own soil.',
      fx: (ctx) => { const h = ctx.helpers; h.adjust(ctx, 'JDH', { legitimacy: 15, gov: -10 });
        mod(ctx, 'y597_land_is_the_people', 'The Land Is the People', { growthMult: 1.07, manpowerMult: 1.09, incomeMult: 0.92 });
        h.chronicle(ctx, 'era', 'It is ruled that a man who stayed in Babylonia has chosen Babylonia. The province gets more settlers, and considerably less money.'); } }),
];
