// Judaea Universalis — the Augustan decades: 22–4 BCE (SPEC §274).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// WHY THIS FILE EXISTS. The 67 BCE chapter is dense to Actium and dense for
// four years after it, and then — measured over the whole span a player can
// play rather than over the chapter's generation horizon — it has one card in
// the twenties and one in the teens. Two cards for twenty years, and they are
// twenty years in which this country is rebuilt: a harbour where there was no
// bay, a city on the ruins of Samaria, a third of the taxes remitted twice,
// and the Temple taken down course by course and put back larger than any
// building in the province.
//
// It is also the period in which the terms of the client kingdom are
// established by being broken. Herod crossed into Arabia without leave in 9
// BCE and Augustus wrote him the sentence every client in this game is
// playing against: that he had hitherto used him as a friend and would
// henceforth use him as a subject. Nothing in the chapter said so.
//
// WHAT IT IS. Eight dated cards, 22–4 BCE, all but one of them the realm's
// own business, because in these decades the realm's own business is what
// there is. The through-line is the one a client kingdom actually has: every
// card is a choice about what to spend the standing on, and the standing is
// finite. The harbour buys trade and costs the country its own coast's
// character; the tax remission buys a decade of quiet and costs the treasury;
// the Temple buys forty years of legitimacy and builds a constituency that
// pulls down an eagle at the end of it.
//
// Sources: Josephus, Antiquitates XV-XVII, which is essentially Nicolaus of
// Damascus, Herod's own court historian, and should be read as such; Bellum I
// for the same events at a colder distance; the harbour works at Caesarea,
// which have been surveyed and are exactly as large as Josephus says; and the
// Augustan rescripts on the Jews of Asia preserved in AJ XVI.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_67bce_augustan] ' + key, e || '');
}

function guard(key, fn) {
  return function (ctx) {
    try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); }
  };
}

function who(ctx, tag) {
  return (ctx && ctx.helpers && ctx.helpers.livingTag) ? ctx.helpers.livingTag(ctx, tag) : tag;
}

// Opinion is not on the helper surface (SPEC §274): `ctx.helpers` carries no
// addOpinion, so a package that wants to move a court's regard writes the
// ledger itself, the way the Iron Age packages do. Same shape, same clamp.
function opinion(ctx, from, of, delta) {
  try {
    const t = ctx.game.tags && ctx.game.tags[from];
    if (!t) return;
    if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
    t.opinion[of] = Math.max(-200, Math.min(200, (t.opinion[of] || 0) + delta));
  } catch (e) { warnOnce('opinion', e); }
}

function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[who(ctx, tag)];
  return !!(t && t.alive !== false);
}

function me(ctx) { return ctx.game.playerTag; }

function pay(ctx, delta) {
  const t = me(ctx);
  if (t) ctx.helpers.adjust(ctx, t, delta);
}

function mod(ctx, id, name, effects, months) {
  const t = me(ctx);
  if (!t) return;
  ctx.helpers.addTagModifier(ctx, t, {
    id, name, months: Number.isFinite(months) ? months : -1, effects,
  });
}

const HEART = ['Jerusalem', 'Jericho', 'Hebron', 'Emmaus'];
const COAST = ['Caesarea Maritima', 'Joppa', 'Gaza'];

function stir(ctx, names, m) {
  for (const n of names) {
    const p = ctx.prov && ctx.prov(n);
    if (!p || p.impassable) continue;
    ctx.helpers.addProvinceModifier(ctx, n, m);
  }
}

// A dated card, two answers, the recorded one first — the shape the years
// and neighbours packages use, so the chapter reads as one hand.
function Y(id, title, y, m, desc, historical, a, b) {
  return {
    id, title, desc, historical, forTag: 'player', date: { y, m }, aiOption: 0,
    options: [
      { label: a.label, tooltip: a.tooltip, effects: guard(id + ':0', a.fx) },
      { label: b.label, tooltip: b.tooltip, effects: guard(id + ':1', b.fx) },
    ],
  };
}

function W(id, title, worldLabel, y, m, desc, historical, a, b) {
  const c = Y(id, title, y, m, desc, historical, a, b);
  c.forTag = 'both';
  c.world = true;
  c.worldLabel = worldLabel;
  return c;
}

export const EVENTS_67_AUGUSTAN = [

  Y('ev67a_the_harbour_with_no_bay', 'A Harbour Where There Is No Bay', -22, 4,
    'This coast has no natural harbour between Egypt and Phoenicia. That is not a '
    + 'complaint, it is a geological fact, and it is the reason the country has '
    + 'always been a place ships pass rather than a place they stop.\n\nThe '
    + 'engineers propose to build one anyway: two moles run out into open water in '
    + 'twenty fathoms, made of blocks fifty feet long floated out and sunk, with a '
    + 'mortar that sets under water and comes from a volcano in Italy. It has never '
    + 'been done at this scale. If it works, a city with no reason to exist becomes '
    + 'the second port of the eastern sea, and the whole trade of this country stops '
    + 'going overland to Tyre.',
    'Caesarea Maritima\'s harbour was built between about 22 and 10 BCE using hydraulic concrete with Italian pozzolana, in open water. The engineering has been confirmed by underwater survey.',
    { label: 'Build it — moles, mole-head, warehouses and the temple on the hill',
      tooltip: '−260 talents over twelve years. The coast becomes a port: +18% trade permanently, +2 development on the coast, and "The Second Port of the East" (+10 diplomatic weight). It is also a Greek city with a temple to the emperor in it, on this country\'s shore: +1.5 unrest in the heartland permanently.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: -260, legitimacy: 10 });
        mod(ctx, 'a67_second_port', 'The Second Port of the East', { tradeMult: 1.18, diploSeats: 10 }, -1);
        stir(ctx, COAST, { id: 'a67_the_harbour', name: 'The Harbour', months: -1, effects: { prodMult: 1.15, taxMult: 1.1 } });
        stir(ctx, HEART, { id: 'a67_the_greek_city', name: 'A Greek City on Our Shore', months: -1, effects: { unrest: 1.5 } });
        h.setFlag(ctx, 'caesareaBuilt', true);
        h.chronicle(ctx, 'era', 'The moles go out into open water at Straton\'s Tower and the country acquires a harbour where the sea gave it none.'); } },
    { label: 'Spend it on the interior instead — roads, cisterns and the hill forts',
      tooltip: '−180 talents on works inland. +12% income and −1.2 unrest in the heartland permanently, +15% siege defence, and the country stays what it is. The trade keeps going overland to Tyre: no trade bonus, ever, from a coast this chapter never develops.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: -180 });
        stir(ctx, HEART, { id: 'a67_the_interior', name: 'Roads and Cisterns', months: -1, effects: { taxMult: 1.12, unrest: -1.2 } });
        mod(ctx, 'a67_hill_forts', 'The Hill Forts', { hillDefBonus: 15 }, -1);
        h.chronicle(ctx, 'era', 'The money goes into roads, cisterns and the hill forts rather than into the sea; the trade keeps going overland to Tyre.'); } }),

  Y('ev67a_a_third_of_the_tax', 'A Third of It, and Say Why', -20, 3,
    'The country is not in famine this year and the treasury is not empty, which '
    + 'is exactly why the proposal is on the table: remit a third of the year\'s tax, '
    + 'publicly, with a speech about it, in a year when nothing has gone wrong.\n\n'
    + 'The argument against is arithmetic and the argument for is not. A remission '
    + 'granted in a bad year is relief and is forgotten; a remission granted in a '
    + 'good year is a statement about what the crown thinks it is for, and it is the '
    + 'kind of statement that is still being repeated when the crown needs something.',
    'Herod remitted a third of taxes in 20 BCE and a quarter in 14 BCE, both in years without crisis (AJ 15.365, 16.64).',
    { label: 'Remit the third and make a speech about it',
      tooltip: '−140 talents this year. "The Year of the Remission" permanently: −1.5 unrest everywhere, +10% growth and +0.05 legitimacy a month. The cheapest loyalty in the chapter, bought at the one moment it is not needed.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: -140, legitimacy: 15 });
        mod(ctx, 'a67_the_remission', 'The Year of the Remission', { unrestAll: -1.5, growthMult: 1.1, legitimacyAdd: 0.05 }, -1);
        h.setFlag(ctx, 'taxRemitted', true);
        h.chronicle(ctx, 'era', 'A third of the year\'s tax is remitted in a year when nothing has gone wrong, and a speech is made about why.'); } },
    { label: 'Keep it and build the reserve — remissions are for bad years',
      tooltip: '+140 talents into the reserve and "The Reserve" (+10% income, +8% force limit) for thirty years. Prudent, defensible, and the country never learns that this crown gives anything away when it does not have to.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: 140 });
        mod(ctx, 'a67_the_reserve', 'The Reserve', { incomeMult: 1.1, forceLimitMult: 1.08 }, 360);
        h.chronicle(ctx, 'era', 'The remission is not granted; the money goes into the reserve against a year that needs it.'); } }),

  Y('ev67a_a_thousand_priests', 'A Thousand Priests Are Taught Masonry', -19, 9,
    'The proposal is to take down the Temple and build it again, larger, and the '
    + 'objection in the assembly is the obvious one: that a building taken down may '
    + 'not go back up, and that the last time this country was without a house it '
    + 'was without one for seventy years.\n\nThe answer offered is procedural and is '
    + 'the reason it will work. The stone is quarried and dressed and stacked first, '
    + 'all of it, before a single course comes down. A thousand priests are being '
    + 'taught to cut and set stone, because no layman may go into the inner courts '
    + 'and the inner courts have to be built by somebody. The sanctuary itself will '
    + 'be finished in eighteen months. The rest will take eighty years and will be '
    + 'finished in 63 CE, three years before it burns.',
    'Herod began the Temple rebuilding about 20-19 BCE; Josephus (AJ 15.390) reports a thousand priests trained as masons and the stone prepared in advance.',
    { label: 'Build it — quarry first, and let the priests cut their own sanctuary',
      tooltip: '−300 talents over the reign. "The House" permanently: +25 legitimacy now, +0.08 legitimacy a month, −2 unrest in the heartland, +20% pilgrim revenue — and a priestly constituency with its own opinion of the crown, which is the thing that pulls the eagle down in 4 BCE.',
      fx: (ctx) => { const h = ctx.helpers; const t = me(ctx);
        pay(ctx, { treasury: -300, legitimacy: 25 });
        mod(ctx, 'a67_the_house', 'The House', { legitimacyAdd: 0.08, pilgrimMult: 1.2 }, -1);
        stir(ctx, HEART, { id: 'a67_the_house_p', name: 'The House', months: -1, effects: { unrest: -2 } });
        if (t) { try { h.factionShift(ctx, t, 'priesthood', 30); } catch (e) {} }
        h.setFlag(ctx, 'templeRebuilt', true);
        h.chronicle(ctx, 'era', 'The stone is quarried and stacked before a course comes down, and a thousand priests are taught to cut it.'); } },
    { label: 'Repair and enlarge the courts, and leave the sanctuary standing',
      tooltip: '−110 talents. +12 legitimacy, +10% pilgrim revenue and −0.8 unrest in the heartland permanently. Nothing is risked and nothing is transformed: the building that stands in 66 CE is the one the exiles put up, and it is small.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: -110, legitimacy: 12 });
        mod(ctx, 'a67_the_courts', 'The Courts Enlarged', { pilgrimMult: 1.1 }, -1);
        stir(ctx, HEART, { id: 'a67_the_courts_p', name: 'The Courts Enlarged', months: -1, effects: { unrest: -0.8 } });
        h.chronicle(ctx, 'era', 'The courts are enlarged and the sanctuary is left standing; the house in this country is the one the exiles built.'); } }),

  Y('ev67a_the_hecatomb', 'The Admiral Sacrifices a Hundred Oxen', -15, 3,
    'The second man in the empire is in the east with proconsular power, and he has '
    + 'come up to Jerusalem. He is not a tourist. He is the emperor\'s son-in-law, '
    + 'he holds the imperium in these provinces, and what he does in this city over '
    + 'the next four days will be reported at Rome in detail by people who are '
    + 'hostile.\n\nHe has offered a hecatomb — a hundred oxen — in the Temple, '
    + 'according to the rite, having been told what the rite is. The city has '
    + 'feasted him. The question for the court is what to ask him for while he is '
    + 'standing in it, because there will not be another visit like this one.',
    'Marcus Agrippa visited Jerusalem in 15 BCE and sacrificed a hecatomb; the city gave him a public reception (AJ 16.12-15).',
    { label: 'Ask for the Asian communities — their money and their Sabbath in writing',
      tooltip: '−30 talents in entertainment. "The Rescripts" permanently: +14 diplomatic weight, +12% trade, and the diaspora communities of Asia hold a written guarantee of their Temple money and their exemption from court on the Sabbath. It is quoted for two hundred years.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: -30, legitimacy: 12 });
        mod(ctx, 'a67_the_rescripts', 'The Rescripts', { diploSeats: 14, tradeMult: 1.12 }, -1);
        h.setFlag(ctx, 'asianRescripts', true);
        h.chronicle(ctx, 'era', 'The admiral is asked, while he is standing in the city, for the communities of Asia; he gives it in writing.'); } },
    { label: 'Ask for territory — the tetrarchies north and east of the lake',
      tooltip: '−30 talents. +2 development and −1 unrest in the northern cells, +10% force limit and +8 deterrent permanently. Land is land; it is also the grant that makes this kingdom a thing worth dividing among heirs, which it duly is.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: -30 });
        stir(ctx, ['Sepphoris', 'Caesarea Philippi'], { id: 'a67_the_grant', name: 'The Northern Grant', months: -1, effects: { prodMult: 1.12, unrest: -1 } });
        mod(ctx, 'a67_northern_grant', 'The Northern Grant', { forceLimitMult: 1.1, deterrent: 8 }, -1);
        h.chronicle(ctx, 'era', 'The court asks for territory rather than for rescripts, and is given the country north and east of the lake.'); } }),

  W('ev67a_the_jews_of_ionia', 'The Jews of Ionia Before the Admiral',
    'The Greek cities of Asia are told to leave their Jews alone', -14, 7,
    'The Greek cities of Ionia have gone to law against their own Jewish '
    + 'populations and the case is being heard by the admiral himself at Ephesus. '
    + 'The charge is that the Jews are not citizens and are claiming citizens\' '
    + 'privileges; the specific complaints are that they will not come to court on '
    + 'the seventh day, will not serve in the levy, and send money out of the city '
    + 'every year to a temple in another province.\n\nThe last is the one the cities '
    + 'care about, because it is a great deal of money and it leaves. A Damascene '
    + 'philosopher is speaking for the communities and is making the argument that '
    + 'the privileges are not citizenship and never claimed to be — they are a '
    + 'permission to be what they are, granted by Rome, and the cities are asking '
    + 'Rome to revoke Rome\'s own grant.',
    'Nicolaus of Damascus argued the Ionian Jews\' case before Agrippa in 14 BCE; the privileges were confirmed (AJ 16.27-65).',
    { label: 'Fund the advocacy and let the kingdom be seen to speak for them',
      tooltip: '−60 talents. "We Spoke For Them" permanently: +16 diplomatic weight, +12% trade, +10 legitimacy. Every Jewish community between here and the Aegean now has an address, and it is this court.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: -60, legitimacy: 10 });
        mod(ctx, 'a67_we_spoke_for_them', 'We Spoke For Them', { diploSeats: 16, tradeMult: 1.12 }, -1);
        h.setFlag(ctx, 'spokeForDiaspora', true);
        h.chronicle(ctx, 'era', 'The kingdom pays for the advocacy at Ephesus and is seen to; the communities of Asia now have an address in Jerusalem.'); } },
    { label: 'Stay out of it — they are Rome\'s subjects and not ours',
      tooltip: '+1 stability and nothing spent. The privileges are confirmed anyway, by Rome, on Rome\'s own reasoning — and the communities know exactly who did not appear: −8 diplomatic weight for thirty years.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { stability: 1 });
        mod(ctx, 'a67_did_not_appear', 'We Did Not Appear', { diploSeats: -8 }, 360);
        h.chronicle(ctx, 'era', 'The kingdom sends nobody to Ephesus; the privileges are confirmed by Rome on Rome\'s own reasoning, and the communities notice the empty bench.'); } }),

  Y('ev67a_used_you_as_a_friend', 'Hitherto As a Friend', -9, 5,
    'The raiders come out of Arabia, the Nabataeans will not give up the men who '
    + 'shelter them and will not pay the debt they acknowledge, and the legate in '
    + 'Syria has been told about it twice and has done nothing. Crossing the border '
    + 'with troops would settle it in a fortnight.\n\nIt would also be a client '
    + 'kingdom making war on another client kingdom without asking, which is the one '
    + 'thing the arrangement does not permit — and the Nabataean envoy in Rome is '
    + 'good, and will get his version in first. The letter that could come back is '
    + 'the one everybody in this position dreads: that the emperor had hitherto used '
    + 'this king as a friend, and would henceforth use him as a subject.',
    'Herod\'s Arabian expedition of 9 BCE brought exactly that rebuke from Augustus (AJ 16.271-299). Nicolaus repaired it the following year.',
    { label: 'Go in, settle it, and send Nicolaus to Rome behind the army',
      tooltip: '−70 talents on the embassy and the campaign. The raiding stops: +2 stability and −1.5 unrest on the southern marches permanently. Rome −25 opinion and "Henceforth As a Subject" (−12 diplomatic weight, −0.05 legitimacy a month) for fifteen years while the embassy works.',
      fx: (ctx) => { const h = ctx.helpers; const t = me(ctx);
        pay(ctx, { treasury: -70, stability: 2 });
        stir(ctx, ['Beersheba', 'Hebron'], { id: 'a67_marches_quiet', name: 'The Marches Are Quiet', months: -1, effects: { unrest: -1.5 } });
        if (alive(ctx, 'ROM') && t) opinion(ctx, 'ROM', t, -25);
        mod(ctx, 'a67_as_a_subject', 'Henceforth As a Subject', { diploSeats: -12, legitimacyAdd: -0.05 }, 180);
        h.setFlag(ctx, 'usedAsSubject', true);
        h.chronicle(ctx, 'era', 'The army crosses into Arabia and settles the raiding in a fortnight; the letter that comes back says the emperor had hitherto used this king as a friend.'); } },
    { label: 'Write to Antioch a third time and garrison the border ourselves',
      tooltip: '−95 talents a year in standing garrisons and no campaign. Rome +10 opinion and +8 diplomatic weight for a client that asked. The raiding continues: +1.2 unrest on the southern marches and −6% income for twenty years.',
      fx: (ctx) => { const h = ctx.helpers; const t = me(ctx);
        pay(ctx, { treasury: -95 });
        if (alive(ctx, 'ROM') && t) opinion(ctx, 'ROM', t, 10);
        mod(ctx, 'a67_asked_first', 'A Client That Asked', { diploSeats: 8, incomeMult: 0.94 }, 240);
        stir(ctx, ['Beersheba', 'Hebron'], { id: 'a67_raiding_continues', name: 'The Raiding Continues', months: 240, effects: { unrest: 1.2 } });
        h.chronicle(ctx, 'era', 'A third letter goes to Antioch and the border is garrisoned at the kingdom\'s own expense; the raiding continues for twenty years and nobody in Rome ever writes a sentence about it.'); } }),

  Y('ev67a_the_strangling_at_sebaste', 'In the City Where He Married Her', -7, 11,
    'The two sons of the Hasmonean queen have been tried before a council at '
    + 'Berytus assembled for the purpose, on a charge of conspiring against their '
    + 'father, on evidence that a great many of the men in the room do not believe. '
    + 'The emperor was asked in advance and gave permission in terms that were '
    + 'permission and were also a warning.\n\nThey are to be strangled at Sebaste, '
    + 'which is the city where their father married their mother. Three hundred '
    + 'officers of the army are implicated with them and are to go too. The '
    + 'kingdom will be governed for the next three years by a man who has killed his '
    + 'own heirs and by the court that told him to.',
    'Alexander and Aristobulus were executed at Sebaste about 7 BCE after the trial at Berytus (AJ 16.356-394; BJ 1.538-551).',
    { label: 'Let the sentence stand — the army cannot have two loyalties',
      tooltip: '+3 stability and "The Army Has One Loyalty" (+14% discipline, +10 deterrent) for twenty years. −30 legitimacy, the Hasmonean line is finished, and +2 unrest in the heartland permanently: the men in that room go home and tell it.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { stability: 3, legitimacy: -30 });
        mod(ctx, 'a67_one_loyalty', 'The Army Has One Loyalty', { disciplineMult: 1.14, deterrent: 10 }, 240);
        stir(ctx, HEART, { id: 'a67_sebaste', name: 'What Was Done at Sebaste', months: -1, effects: { unrest: 2 } });
        h.setFlag(ctx, 'heirsKilled', true);
        h.chronicle(ctx, 'era', 'The sentence is carried out at Sebaste, in the city where their father married their mother, and three hundred officers go with them.'); } },
    { label: 'Commute it — exile, and the Hasmonean blood stays in the house',
      tooltip: '−50 talents. +25 legitimacy, −1.5 unrest in the heartland permanently, and "The Blood Stayed in the House" (+0.06 legitimacy a month). The court that wanted the executions is still there and is now frightened of the men it failed to kill: −2 stability.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: -50, legitimacy: 25, stability: -2 });
        stir(ctx, HEART, { id: 'a67_blood_stayed', name: 'The Blood Stayed in the House', months: -1, effects: { unrest: -1.5 } });
        mod(ctx, 'a67_blood_stayed_m', 'The Blood Stayed in the House', { legitimacyAdd: 0.06 }, -1);
        h.setFlag(ctx, 'heirsSpared', true);
        h.chronicle(ctx, 'era', 'The sentence is commuted to exile and the Hasmonean blood stays in the house; the men who wanted the executions remain at court and know they were refused.'); } }),

  Y('ev67a_the_eagle_over_the_gate', 'They Are on the Roof With Ropes', -4, 3,
    'A golden eagle was set over the great gate of the Temple when the gate was '
    + 'built, and it has been there for fifteen years, and everybody has been careful '
    + 'not to have the argument about whether it is a graven image on the house of '
    + 'God or a piece of architecture with a bird on it.\n\nTwo teachers have '
    + 'decided that the argument is overdue and that the king is dying. Forty of '
    + 'their students are on the roof at midday with ropes and axes, in front of a '
    + 'crowd, cutting it down. They are not hiding. The whole point is that they are '
    + 'not hiding, and the sentence for it, whatever it is, is the second half of '
    + 'what they came to do.',
    'Judas son of Sepphoraeus and Matthias son of Margalus had the eagle pulled down in 4 BCE; Herod had them burned alive, and died weeks later (AJ 17.149-167).',
    { label: 'Burn the teachers and depose the high priest who let it happen',
      tooltip: '+2 stability now and "The Law Was Answered" (+10% discipline) for ten years. −35 legitimacy, Priesthood −30 approval, and +3 unrest in the heartland permanently. This is the last act of the reign and it is the one the next generation is raised on.',
      fx: (ctx) => { const h = ctx.helpers; const t = me(ctx);
        pay(ctx, { stability: 2, legitimacy: -35 });
        mod(ctx, 'a67_law_answered', 'The Law Was Answered', { disciplineMult: 1.1 }, 120);
        if (t) { try { h.factionShift(ctx, t, 'priesthood', -30); } catch (e) {} }
        stir(ctx, HEART, { id: 'a67_the_burning', name: 'The Burning', months: -1, effects: { unrest: 3 } });
        h.setFlag(ctx, 'eagleBurning', true);
        h.chronicle(ctx, 'era', 'The teachers are burned alive and the high priest is deposed; it is the last act of the reign and the first thing the next generation is told about it.'); } },
    { label: 'Take the eagle down ourselves and fine the forty',
      tooltip: '−25 talents in fines foregone and a visible climb-down. +20 legitimacy, Priesthood +20 approval, −2 unrest in the heartland permanently and "The Eagle Came Down Quietly". −2 stability: the court has learned that forty students on a roof can change a royal decision, and so have the students.',
      fx: (ctx) => { const h = ctx.helpers; const t = me(ctx);
        pay(ctx, { treasury: -25, legitimacy: 20, stability: -2 });
        if (t) { try { h.factionShift(ctx, t, 'priesthood', 20); } catch (e) {} }
        stir(ctx, HEART, { id: 'a67_eagle_quietly', name: 'The Eagle Came Down Quietly', months: -1, effects: { unrest: -2 } });
        h.setFlag(ctx, 'eagleLowered', true);
        h.chronicle(ctx, 'era', 'The eagle is taken down by the crown\'s own workmen and the forty are fined; everybody present understands what has just been established.'); } }),
];
