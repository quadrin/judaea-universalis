// Judaea Universalis — the years the chain skips: 185–418 CE (SPEC §240).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// The Bar Kokhba chapter runs to 430 and is the longest in the game. It has
// sixty dated cards, ten of them in its first decade, and after 140 it averages
// one every five years — and almost all of those are the empire's own calendar:
// emperors, plagues, persecutions, councils, the Rhine. What it does not have
// is the three centuries in which this nation quietly rebuilt itself into
// something that did not need a state, a Temple or a capital, and then watched
// a Christian empire legislate that arrangement into a cage one rescript at a
// time.
//
// That is what this file is. Half of it is construction — the Patriarch's
// couriers, the book that closed the arguments, the two men who carried the
// tradition east and founded the schools that outlived everything. Half of it
// is subtraction, and the subtraction is legislative rather than military:
// crossing over is made a crime, the fields are emptied by a slave law, the
// gold is stopped at the ports, and the offices are closed. Nobody is
// massacred in any of these cards. That is the point of them.
//
// Sources: the Theodosian Code XVI.8 for the rescripts of 315, 339, 399 and
// 418; Eusebius and Jerome for Origen at Caesarea; Sherira Gaon's letter for
// Rav and Shmuel and the founding of Sura; Ammianus XXVI.10 and Libanius for
// the earthquake and wave of 365; Socrates Scholasticus VII.13 for Alexandria.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_132ce_years] ' + key, e || '');
}

function guard(key, fn) {
  return function (ctx) {
    try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); }
  };
}

// Addressed to whoever is playing the chapter — the rising or the house beyond
// the Tigris — so the modifiers land on the chair that answered the card.
function P(ctx) { return ctx.game.playerTag; }

function mod(ctx, id, name, effects, months) {
  ctx.helpers.addTagModifier(ctx, P(ctx), {
    id, name, months: Number.isFinite(months) ? months : -1, effects,
  });
}

export const EVENTS_132_YEARS = [

  // ── 185 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132y_the_circuit_of_the_apostles',
    title: 'The Circuit of the Apostles',
    desc: 'The couriers are called apostoloi, which only means the sent, and their circuit is '
      + 'the whole world: Antioch, the cities of Asia, Alexandria, Cyrene, Rome, the Rhône '
      + 'valley, and back before the winter closes the sea. They carry three things. The '
      + 'calendar of the coming year, so that the festivals are kept together. Rulings, so '
      + 'that the same question does not get four answers. And they carry back money.\n\n'
      + 'It is a state\'s nervous system running without a state — no territory, no army, no '
      + 'coinage, no border — and it works because every congregation on the circuit agrees to '
      + 'be on it. Nothing compels them. The whole apparatus rests on the fact that a Jew in '
      + 'Lyon would rather be part of something governed from a small town in the Galilee than '
      + 'be part of nothing.',
    forTag: 'player',
    date: { y: 185, m: 6 },
    aiOption: 0,
    historical: 'The Patriarch\'s apostoloi carried the calendar, rulings and the collections across the empire for two centuries. Roman law eventually treated the circuit as a taxable institution, which is a compliment of a kind.',
    options: [
      {
        label: 'Fund the circuit properly and put good men on it',
        tooltip: '−45 talents a decade: +12 influence points and "The Circuit" (+9% income, −0.5 unrest everywhere) for thirty years. Every community on earth hears the same ruling in the same year.',
        effects: guard('circuit:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, infl: 12 });
          mod(ctx, 'the_circuit', 'The Circuit', { incomeMult: 1.09, unrestAll: -0.5 }, 360);
          h.setFlag(ctx, 'apostoloiCircuit', true);
          h.chronicle(ctx, 'era', 'The circuit is funded and staffed: the calendar, the '
            + 'rulings and the collections, from the Rhône to the Tigris, once a year, on the '
            + 'same schedule as the sailing season.');
        }),
      },
      {
        label: 'Send the calendar and the rulings; ask for nothing',
        tooltip: '−20 talents: +10 legitimacy and "The Sent Without a Purse" (−0.6 unrest everywhere, +4% income) for thirty years. Authority that never asks for money is authority nobody can price.',
        effects: guard('circuit:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -20, legitimacy: 10 });
          mod(ctx, 'sent_without_purse', 'The Sent Without a Purse', { unrestAll: -0.6, incomeMult: 1.04 }, 360);
          h.chronicle(ctx, 'era', 'The couriers carry the calendar and the rulings and are '
            + 'forbidden to carry a collection box. It costs the treasury and it buys '
            + 'something the treasury cannot.');
        }),
      },
      {
        label: 'Let each region keep its own reckoning and its own money',
        tooltip: '+35 talents saved, +8 governance points, and "The Regions Apart" (+0.8 unrest everywhere) for twenty years. Four centres, four calendars, and nobody in charge of the argument.',
        effects: guard('circuit:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 35, gov: 8 });
          mod(ctx, 'the_regions_apart', 'The Regions Apart', { unrestAll: 0.8 }, 240);
          h.chronicle(ctx, 'era', 'The circuit is discontinued. Each region keeps its own '
            + 'reckoning, its own rulings and its own money, and within a generation they are '
            + 'four different things.');
        }),
      },
    ],
  },

  // ── 217 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132y_the_book_that_closed_the_mouth',
    title: 'The Book That Closed the Mouth',
    desc: 'Two centuries of argument have been sorted into six divisions — seeds, festivals, '
      + 'women, damages, holy things, purities — and written in a Hebrew so compressed that a '
      + 'ruling on a year of litigation can take nine words. Anonymous where the house has '
      + 'settled, attributed where it has not, and the minority opinions kept in, on the '
      + 'stated ground that a court may one day need to rely on them.\n\n'
      + 'The objection is serious and it is made by serious men: that the tradition was oral '
      + 'because it was meant to be, that a written law can be read by anybody and therefore '
      + 'taught by anybody, and that fixing the argument in six divisions will end the '
      + 'argument. The answer is that the argument has already been ended once, by a war, and '
      + 'that a generation which cannot remember what its grandfathers held is not preserving '
      + 'an oral tradition, it is losing one.',
    forTag: 'player',
    date: { y: 217, m: 6 },
    aiOption: 0,
    historical: 'The Mishnah was redacted under Judah ha-Nasi around the turn of the third century. Everything Jewish law has done since is a commentary on it.',
    options: [
      {
        label: 'Seal it, publish it, and let the commentary begin',
        tooltip: '+20 governance points and "The Six Divisions" (+10% income, −0.7 unrest everywhere) for forty years. A portable, copyable, teachable law that needs no capital to hold it.',
        effects: guard('book:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 20 });
          mod(ctx, 'six_divisions', 'The Six Divisions', { incomeMult: 1.10, unrestAll: -0.7 }, 480);
          h.setFlag(ctx, 'mishnahSealed', true);
          h.chronicle(ctx, 'era', 'The six divisions are sealed and copied. What the nation '
            + 'now carries is not a country: it is a book that can be taught anywhere by '
            + 'anybody who has learned it.');
        }),
      },
      {
        label: 'Seal it, and keep the copies in the court\'s own hands',
        tooltip: '+15 governance points, +10 legitimacy, and "The Authorised Text" (+7% income, −0.4 unrest everywhere) for thirty years. One text, one authority, and a bottleneck that will hold exactly as long as the authority does.',
        effects: guard('book:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 15, legitimacy: 10 });
          mod(ctx, 'authorised_text', 'The Authorised Text', { incomeMult: 1.07, unrestAll: -0.4 }, 360);
          h.setFlag(ctx, 'mishnahSealed', true);
          h.chronicle(ctx, 'era', 'The book is sealed and the copies are controlled. It is a '
            + 'perfectly sound arrangement for as long as there is somebody to control them.');
        }),
      },
      {
        label: 'The oral law is oral',
        tooltip: '+12 legitimacy with the elders and "The Unwritten Tradition" (−0.5 unrest everywhere) for twenty years, with −15 governance points. Nothing is lost this generation. The generation after that is a different question.',
        effects: guard('book:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 12, gov: -15 });
          mod(ctx, 'unwritten_tradition', 'The Unwritten Tradition', { unrestAll: -0.5 }, 240);
          h.chronicle(ctx, 'era', 'The redaction is refused: what was given orally stays oral. '
            + 'The men who remember it are counted, and the number is not large.');
        }),
      },
    ],
  },

  // ── 220 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132y_the_two_who_went_home',
    title: 'The Two Who Went Home',
    desc: 'Two students who trained here have gone back east and are not coming back. One sets '
      + 'up at Sura, in a place with nothing in it, and within a year there are twelve hundred '
      + 'men sitting on the ground in front of him. The other takes over the old school at '
      + 'Nehardea and turns out to be, besides everything else, the best astronomer and the '
      + 'shrewdest lawyer of his generation — the man who formulates the rule that the law of '
      + 'the kingdom is law, which is how a stateless nation makes its peace with every '
      + 'government it will ever live under.\n\n'
      + 'They carry the book with them. From this year there are two centres, both teaching '
      + 'the same text, one inside the Roman world and one outside it, four hundred miles '
      + 'apart across a frontier that is at war about every fifteen years — and the nation has '
      + 'accidentally acquired the one thing it most needs, which is redundancy.',
    forTag: 'player',
    date: { y: 220, m: 4 },
    aiOption: 0,
    historical: 'Rav founded the academy at Sura and Shmuel led Nehardea. Shmuel\'s principle — dina de-malkhuta dina, the law of the kingdom is law — governed Jewish life under every later empire.',
    options: [
      {
        label: 'Bless it, fund it, and keep one chain of ordination',
        tooltip: '−50 talents east: +12 influence points, +12 governance points, and "The Two Centres" (+9% income, +4% trade) for forty years.',
        effects: guard('two:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50, infl: 12, gov: 12 });
          mod(ctx, 'the_two_centres', 'The Two Centres', { incomeMult: 1.09, tradeMult: 1.04 }, 480);
          h.setFlag(ctx, 'twoCentres', true);
          h.chronicle(ctx, 'era', 'The eastern schools are funded and the chain of ordination '
            + 'is kept single. Two libraries, one tradition, and a frontier between them that '
            + 'nobody can close.');
        }),
      },
      {
        label: 'Adopt the eastern rule: the law of the kingdom is law',
        tooltip: '+18 governance points and "The Law of the Kingdom" (+8% income, −0.8 unrest everywhere, −5% cost of governing) for forty years. Every tax, every deed and every court order of every empire we live under is now valid in our own law, which is either a surrender or the most durable thing anybody here ever wrote.',
        effects: guard('two:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 18 });
          mod(ctx, 'law_of_the_kingdom', 'The Law of the Kingdom', { incomeMult: 1.08, unrestAll: -0.8, adminMult: 0.95 }, 480);
          h.setFlag(ctx, 'dinaDeMalkhuta', true);
          h.chronicle(ctx, 'era', 'The rule is adopted: the law of the kingdom is law. A '
            + 'nation with no state has just written down how to live inside somebody else\'s '
            + 'without dissolving in it.');
        }),
      },
      {
        label: 'The land teaches. Recall them',
        tooltip: '+10 legitimacy and "The Single Centre" (−0.5 unrest everywhere) for twenty years, with −8% income. They do not come back, and the recall is remembered in the east for two hundred years.',
        effects: guard('two:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 10 });
          mod(ctx, 'the_single_centre', 'The Single Centre', { unrestAll: -0.5, incomeMult: 0.92 }, 240);
          h.chronicle(ctx, 'era', 'The eastern teachers are recalled to the land. They do not '
            + 'come, and the letter is kept, and quoted.');
        }),
      },
    ],
  },

  // ── 244 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132y_the_argument_at_caesarea',
    title: 'The Argument at Caesarea',
    desc: 'There is a Christian scholar at Caesarea who has done something nobody expected: he '
      + 'has learned the Hebrew. He has laid out the scriptures in six parallel columns — the '
      + 'Hebrew, the Hebrew in Greek letters, and four Greek versions — and he goes to Jewish '
      + 'teachers to ask what a word means, and writes down what they tell him, and cites them '
      + 'by name.\n\n'
      + 'It changes the character of the quarrel. For two centuries the argument between these '
      + 'two houses has been conducted by each side against a version of the other it has '
      + 'never met. What is starting at Caesarea is an argument between people who have read '
      + 'the same text in the same language and disagree about it — which is more dangerous '
      + 'and more honest, and which produces, on both sides, the first scholars who are any '
      + 'good at it.',
    forTag: 'player',
    date: { y: 244, m: 5 },
    aiOption: 1,
    historical: 'Origen compiled the Hexapla at Caesarea and consulted Jewish teachers; the rabbinic sources of the same city and generation argue with Christian readings in visible detail.',
    options: [
      {
        label: 'Send our best men to argue with him in public',
        tooltip: '+15 governance points and "The Public Disputation" (+6% income, −0.4 unrest everywhere) for twenty years, with +0.5 unrest everywhere for six: a public argument can be lost in public.',
        effects: guard('caesarea:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 15 });
          mod(ctx, 'public_disputation', 'The Public Disputation', { incomeMult: 1.06, unrestAll: -0.4 }, 240);
          h.chronicle(ctx, 'era', 'The court sends its best readers down to Caesarea to argue '
            + 'in public with a man who has learned the Hebrew. Both sides get better at it.');
        }),
      },
      {
        label: 'Answer him in the schools and not in the street',
        tooltip: '+18 governance points and "The Answered Verses" (+7% income, −0.6 unrest everywhere) for twenty-five years. The replies go into the commentary, where they will still be read in a thousand years.',
        effects: guard('caesarea:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 18 });
          mod(ctx, 'answered_verses', 'The Answered Verses', { incomeMult: 1.07, unrestAll: -0.6 }, 300);
          h.setFlag(ctx, 'caesareaDisputationAnswered', true);
          h.chronicle(ctx, 'era', 'The answers are written into the commentary rather than '
            + 'shouted in the market. They are still there fifteen centuries later, unsigned, '
            + 'addressed to somebody the reader has to work out.');
        }),
      },
      {
        label: 'Forbid teaching the Hebrew to outsiders',
        tooltip: '+10 legitimacy and "The Closed Tongue" (−0.5 unrest everywhere) for fifteen years, with −12 governance points. He finishes the columns anyway, from converts and from books.',
        effects: guard('caesarea:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 10, gov: -12 });
          mod(ctx, 'the_closed_tongue', 'The Closed Tongue', { unrestAll: -0.5 }, 180);
          h.chronicle(ctx, 'era', 'It is forbidden to teach the sacred tongue to outsiders. The '
            + 'six columns are completed on schedule from other sources.');
        }),
      },
    ],
  },

  // ── 262 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132y_the_palmyrene_years',
    title: 'The Palmyrene Years',
    desc: 'The empire has effectively stopped functioning east of the Taurus and the man who '
      + 'has filled the vacuum is a caravan prince from an oasis city, who beat the Persians '
      + 'twice, took the title Corrector of the whole East, and now governs from Emesa to the '
      + 'Euphrates with Roman titles and his own army.\n\n'
      + 'For the towns of this country the change is mostly in whose cavalry rides through. '
      + 'They pay the same tax to a different collector, they are conscripted for a different '
      + 'campaign, and the rabbinic sources of these decades curse Palmyra with an animosity '
      + 'they never quite manage against Rome — which is the reliable sign of a power that is '
      + 'close enough to touch you. Everyone can see that the arrangement is temporary. '
      + 'Nobody can see what replaces it.',
    forTag: 'player',
    date: { y: 262, m: 7 },
    aiOption: 1,
    historical: 'Odenathus governed the Roman East in fact from 260 to 267. Palmyra is cursed in the rabbinic literature of the period more sharply than Rome is.',
    options: [
      {
        label: 'Deal with whoever holds the roads',
        tooltip: '+10 influence points and "The Caravan Peace" (+8% income, +6% trade) for fifteen years, and −6 legitimacy from the houses who remember which side the empire is supposed to be on.',
        effects: guard('palmyra:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 10, legitimacy: -6 });
          mod(ctx, 'the_caravan_peace', 'The Caravan Peace', { incomeMult: 1.08, tradeMult: 1.06 }, 180);
          h.chronicle(ctx, 'diplomacy', 'The court deals with the men who actually hold the '
            + 'roads. The tax is the same, the collector is new, and the caravans move.');
        }),
      },
      {
        label: 'Arm the villages and hold our own districts',
        tooltip: '−45 talents: +10 martial points and "The Districts Held" (+6% manpower, +1 defence in hill country) for fifteen years. Whoever wins in Syria arrives to find the country already garrisoned.',
        effects: guard('palmyra:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, mar: 10 });
          mod(ctx, 'the_districts_held', 'The Districts Held', { manpowerMult: 1.06, hillDefBonus: 1 }, 180);
          h.chronicle(ctx, 'war', 'The villages are armed and the districts are held with our '
            + 'own men. Two empires\' cavalry ride past and neither stops.');
        }),
      },
      {
        label: 'Wait for Rome to come back',
        tooltip: '+8 legitimacy, +12 governance points, and "The Long Wait" (−0.5 unrest everywhere) for twelve years. Rome does come back. It takes eleven years, and it is not grateful.',
        effects: guard('palmyra:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 8, gov: 12 });
          mod(ctx, 'the_long_wait', 'The Long Wait', { unrestAll: -0.5 }, 144);
          h.chronicle(ctx, 'era', 'The court signs nothing with Palmyra and waits. Rome comes '
            + 'back in eleven years, and remembers the waiting as neutrality rather than as '
            + 'loyalty.');
        }),
      },
    ],
  },

  // ── 297 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132y_the_new_assessment',
    title: 'The New Assessment',
    desc: 'The empire has been refounded on paper and the paper is a census. Every field is '
      + 'measured and rated by what it can grow; every head is counted; the two are yoked '
      + 'together, and the tax is announced years in advance so that nobody can plead surprise '
      + 'and everybody can be held to the number whatever the rains do. There is a price edict '
      + 'as well, fixing what everything may be sold for, which is ignored within a year in '
      + 'every market in the east.\n\n'
      + 'The assessment is not ignored. It is the most effective fiscal instrument this region '
      + 'has been subjected to since Herod, and it lands on a countryside of smallholders in '
      + 'hill villages — which means it is precisely calibrated to make the land unviable for '
      + 'the people who are on it, and to make it easy for anybody with capital to buy it up '
      + 'when they walk off.',
    forTag: 'player',
    date: { y: 297, m: 4 },
    aiOption: 0,
    historical: 'The Diocletianic capitatio-iugatio reached Palestine in the 290s. The rabbinic sources of the fourth century are full of villages abandoning land they can no longer carry.',
    options: [
      {
        label: 'Take the assessment onto our own books and spread it',
        tooltip: '−40 talents to carry the shortfall: +15 governance points and "The Shared Burden" (+7% income, −0.8 unrest everywhere, +4% growth) for twenty-five years. The villages that would have walked stay.',
        effects: guard('assess:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, gov: 15 });
          mod(ctx, 'the_shared_burden', 'The Shared Burden', { incomeMult: 1.07, unrestAll: -0.8, growthMult: 1.04 }, 300);
          h.chronicle(ctx, 'era', 'The assessment is taken onto the community\'s own books and '
            + 'spread across it. Nobody is ruined in a bad year by a number fixed in a good '
            + 'one.');
        }),
      },
      {
        label: 'Buy the failing land into a common fund',
        tooltip: '−75 talents: "The Common Fields" (+11% income) for twenty-five years, and −6 legitimacy. The land stays in the nation\'s hands and the men working it are now tenants of an institution.',
        effects: guard('assess:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -75, legitimacy: -6 });
          mod(ctx, 'the_common_fields', 'The Common Fields', { incomeMult: 1.11 }, 300);
          h.chronicle(ctx, 'era', 'The failing holdings are bought into a common fund before '
            + 'anybody else can buy them. The families stay on the land as tenants of their '
            + 'own nation.');
        }),
      },
      {
        label: 'Let the ones who cannot pay go',
        tooltip: '+60 talents kept and "The Emptied Villages" (−7% income, −5% manpower, +0.7 unrest everywhere) for twenty years. Some of them go to the cities, and a great many of them go east.',
        effects: guard('assess:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 60, legitimacy: -8 });
          mod(ctx, 'emptied_villages', 'The Emptied Villages', { incomeMult: 0.93, manpowerMult: 0.95, unrestAll: 0.7 }, 240);
          h.chronicle(ctx, 'era', 'The villages that cannot carry the new assessment are left '
            + 'to fail. Their people go to the coast cities, and to Babylonia, and do not '
            + 'come back.');
        }),
      },
    ],
  },

  // ── 315 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132y_the_law_about_crossing_over',
    title: 'The Law About Crossing Over',
    desc: 'The first rescript of the new dispensation is not a persecution. It is a rule about '
      + 'traffic, and it runs in one direction. A Jew who attacks a member of his community '
      + 'for having gone over to the Christians is to be burned. A gentile who joins the '
      + 'Jewish community, and the community that receives him, are both liable.\n\n'
      + 'Read coldly, it is an admission: the emperor has just legislated against a movement '
      + 'that is evidently still happening in both directions and that the state has decided '
      + 'to make one-way. Everything the fourth century does to this nation is already in this '
      + 'rescript in miniature. Nobody is forbidden to be a Jew. It is simply arranged that '
      + 'nobody may become one, and that leaving is protected, and the arithmetic does the '
      + 'rest over a hundred and fifty years.',
    forTag: 'player',
    date: { y: 315, m: 10 },
    aiOption: 1,
    historical: 'Constantine\'s rescript of 315 (Theodosian Code XVI.8.1) protected converts from Judaism and penalised conversion to it. The direction of travel never changed again.',
    options: [
      {
        label: 'Petition against it, and cite our own charters back at them',
        tooltip: '−55 talents on the embassy: +12 influence points and "The Charters Cited" (+5% income, −0.4 unrest everywhere) for twenty years. The rescript stands, and its edges are blunted for a generation.',
        effects: guard('crossing:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, infl: 12 });
          mod(ctx, 'the_charters_cited', 'The Charters Cited', { incomeMult: 1.05, unrestAll: -0.4 }, 240);
          h.chronicle(ctx, 'diplomacy', 'The old charters are read back to the new court, '
            + 'clause by clause. The rescript stands and is enforced more loosely than it '
            + 'reads.');
        }),
      },
      {
        label: 'Stop receiving converts, and say why out loud',
        tooltip: '+15 governance points, +8 legitimacy, and "The Door Held Shut" (−0.9 unrest everywhere, +4% income) for twenty-five years. Nobody is put in danger by us. Nobody joins us either.',
        effects: guard('crossing:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 15, legitimacy: 8 });
          mod(ctx, 'door_held_shut', 'The Door Held Shut', { unrestAll: -0.9, incomeMult: 1.04 }, 300);
          h.setFlag(ctx, 'convertsRefused', true);
          h.chronicle(ctx, 'era', 'The courts stop receiving converts and publish the reason: '
            + 'that a man who joins us under this law is a man we have handed to a magistrate.');
        }),
      },
      {
        label: 'Go on receiving them and keep no register',
        tooltip: '+12 legitimacy and "No Names Written Down" (+4% growth, +0.9 unrest everywhere) for twenty years. It goes on happening. It stops being written down, which is why the later centuries think it stopped.',
        effects: guard('crossing:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 12 });
          mod(ctx, 'no_names_written', 'No Names Written Down', { growthMult: 1.04, unrestAll: 0.9 }, 240);
          h.chronicle(ctx, 'era', 'Converts go on being received and no register is kept of '
            + 'them. The practice survives the century; the evidence does not.');
        }),
      },
    ],
  },

  // ── 339 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132y_the_slaves_in_the_fields',
    title: 'The Slaves in the Fields',
    desc: 'The new law forbids a Jew to own a Christian slave. It is framed as a protection and '
      + 'it is, in a period when a slave in a Jewish household was circumcised and freed into '
      + 'the community within the year; and it is also, precisely, an agricultural policy. '
      + 'Every large estate in this country is worked by slaves. Most of the labour on them is '
      + 'now nominally Christian. A landowner who may not own that labour cannot work that '
      + 'land.\n\n'
      + 'What follows over the next two generations is not dramatic and is nearly total. The '
      + 'estates are sold. The families that sold them move into the towns and into trades '
      + 'that need no acres — silk, glass, dyeing, medicine, the law — and the connection '
      + 'between this people and the working of land, which is four thousand years old and is '
      + 'most of what its own scriptures are about, is legislated apart in a single clause '
      + 'about property.',
    forTag: 'player',
    date: { y: 339, m: 6 },
    aiOption: 0,
    historical: 'Constantius\' laws on Jewish slave-holding, hardened repeatedly through the fourth and fifth centuries, are among the main structural causes of Jewish withdrawal from agriculture.',
    options: [
      {
        label: 'Buy the estates into the community and work them with hired men',
        tooltip: '−85 talents and a worse margin: "The Hired Harvest" (+6% income, +5% growth, −0.4 unrest everywhere) for thirty years. The land stays, and the people stay on it.',
        effects: guard('slaves:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -85 });
          mod(ctx, 'the_hired_harvest', 'The Hired Harvest', { incomeMult: 1.06, growthMult: 1.05, unrestAll: -0.4 }, 360);
          h.setFlag(ctx, 'landKept', true);
          h.chronicle(ctx, 'era', 'The estates are bought into the community and worked with '
            + 'hired men at a worse margin. It is more expensive every single year and the '
            + 'villages are still there in a century.');
        }),
      },
      {
        label: 'Sell, and put the money into the trades',
        tooltip: '+120 talents from the sales: "The Trades of the Towns" (+12% income, +6% trade) for thirty years, and "The Land Let Go" (−6% manpower) for the same. The nation gets richer and stops being from anywhere.',
        effects: guard('slaves:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 120 });
          mod(ctx, 'trades_of_the_towns', 'The Trades of the Towns', { incomeMult: 1.12, tradeMult: 1.06 }, 360);
          ctx.helpers.addTagModifier(ctx, P(ctx), {
            id: 'the_land_let_go', name: 'The Land Let Go', months: 360, effects: { manpowerMult: 0.94 },
          });
          h.chronicle(ctx, 'era', 'The estates are sold and the money goes into silk, glass, '
            + 'dyeing and medicine. Within two generations the nation is wealthier, more '
            + 'urban, and no longer from anywhere in particular.');
        }),
      },
      {
        label: 'Free them all, and say what we are doing',
        tooltip: '−60 talents in lost capital: +15 legitimacy, +1 stability, and "The Manumission" (−1.0 unrest everywhere, +4% growth) for twenty-five years. A great many freedmen stay on as tenants, which is not what the law intended.',
        effects: guard('slaves:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -60, legitimacy: 15, stability: 1 });
          mod(ctx, 'the_manumission', 'The Manumission', { unrestAll: -1.0, growthMult: 1.04 }, 300);
          h.chronicle(ctx, 'era', 'Every slave in every Jewish household in the country is '
            + 'freed within the year, publicly, with the reason read out. Most of them are '
            + 'still working the same fields in the spring, for wages.');
        }),
      },
    ],
  },

  // ── 365 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132y_the_sea_went_out',
    title: 'The Sea Went Out',
    desc: 'The ground moves before dawn on the twenty-first of July, from Sicily to the Nile, '
      + 'and then the sea goes out. Boats are left sitting on wet sand and men walk out to '
      + 'pick up fish, and then it comes back — over the moles, over the walls, into the '
      + 'streets of Alexandria, throwing ships onto rooftops. The coast towns of this country '
      + 'lose their harbours in a morning. Inland the shock takes the roofs off villages that '
      + 'had never heard of the sea.\n\n'
      + 'The empire is at its most competent about exactly this sort of thing and will remit '
      + 'taxes, send engineers and rebuild the porticoes of the important cities. What it will '
      + 'not do is rebuild a hill village, because a hill village is not a city and has no '
      + 'patron. Whoever is going to put the villages back has to decide it now, in the same '
      + 'week, before the people in them go somewhere else.',
    forTag: 'player',
    date: { y: 365, m: 7 },
    aiOption: 0,
    historical: 'The earthquake and tsunami of 21 July 365 devastated the eastern Mediterranean. Alexandria commemorated the day for two centuries.',
    options: [
      {
        label: 'Rebuild the villages first and the harbours after',
        tooltip: '−90 talents: +12 legitimacy, +1 stability, and "The Villages Put Back" (+8% income, +7% growth, −0.8 unrest everywhere) for twenty-five years.',
        effects: guard('sea:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -90, legitimacy: 12, stability: 1 });
          mod(ctx, 'villages_put_back', 'The Villages Put Back', { incomeMult: 1.08, growthMult: 1.07, unrestAll: -0.8 }, 300);
          h.chronicle(ctx, 'era', 'The hill villages are rebuilt before the harbours. Nobody '
            + 'in the imperial administration would have chosen that order and nobody in the '
            + 'hills ever forgets it.');
        }),
      },
      {
        label: 'Take the imperial money and rebuild what it will pay for',
        tooltip: '+70 talents in relief: "The Rebuilt Coast" (+9% income, +6% trade) for twenty-five years, and +0.6 unrest everywhere for eight from the country that was not on the list.',
        effects: guard('sea:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 70 });
          mod(ctx, 'the_rebuilt_coast', 'The Rebuilt Coast', { incomeMult: 1.09, tradeMult: 1.06, unrestAll: 0.6 }, 300);
          h.chronicle(ctx, 'era', 'The imperial relief is taken and spent where the imperial '
            + 'relief may be spent: on the harbours, the porticoes and the baths of the '
            + 'coastal cities.');
        }),
      },
      {
        label: 'Move the people rather than the stones',
        tooltip: '−50 talents in resettlement: +8 legitimacy and "The Resettled" (+6% income, +6% growth, +3% manpower) for twenty-five years. Half the ruined villages are never rebuilt and their people are all alive.',
        effects: guard('sea:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50, legitimacy: 8 });
          mod(ctx, 'the_resettled', 'The Resettled', { incomeMult: 1.06, growthMult: 1.06, manpowerMult: 1.03 }, 300);
          h.chronicle(ctx, 'era', 'The ruined villages are not rebuilt. Their people are moved '
            + 'to the towns that still have roofs, with land and a year\'s seed, and the sites '
            + 'go back to scrub.');
        }),
      },
    ],
  },

  // ── 399 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132y_the_gold_that_did_not_sail',
    title: 'The Gold That Did Not Sail',
    desc: 'A rescript from the western court forbids the collection: the money the communities '
      + 'gather for the Patriarch is to be impounded at the ports and paid into the imperial '
      + 'treasury instead, on the stated ground that a foreign authority may not levy on '
      + 'Roman subjects. The eastern court does not follow, and the western one reverses '
      + 'itself within five years under pressure from people who understand what it has '
      + 'actually stopped.\n\n'
      + 'What it has stopped is the only tax this nation levies, on the only territory it has, '
      + 'which is everywhere. Nobody in Ravenna appears to have grasped that the collection is '
      + 'not a tribute to a foreign king but the running cost of the calendar, the courts and '
      + 'the schools — and that a government which cannot be conquered because it holds no '
      + 'ground can still be closed down by a customs officer.',
    forTag: 'player',
    date: { y: 399, m: 5 },
    aiOption: 0,
    historical: 'Honorius banned the transmission of the Patriarch\'s collections in 399 and rescinded the ban in 404. The eastern empire abolished the collection outright a generation later.',
    options: [
      {
        label: 'Move it by land, in small sums, through the fairs',
        tooltip: '−30 talents in losses and commissions: +10 governance points and "The Slow Gold" (+6% income, +4% trade) for twenty-five years. Slower, dearer, and no port officer sees a chest.',
        effects: guard('gold:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -30, gov: 10 });
          mod(ctx, 'the_slow_gold', 'The Slow Gold', { incomeMult: 1.06, tradeMult: 1.04 }, 300);
          h.setFlag(ctx, 'goldByLand', true);
          h.chronicle(ctx, 'era', 'The collection moves inland, in small sums, through the '
            + 'fairs and the credit houses. It arrives late and it arrives.');
        }),
      },
      {
        label: 'Litigate it, at the eastern court, at length',
        tooltip: '−60 talents on the embassies: +14 influence points and "The Reversal Obtained" (+8% income, −0.3 unrest everywhere) for twenty years. It takes five years and it is reversed.',
        effects: guard('gold:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -60, infl: 14 });
          mod(ctx, 'reversal_obtained', 'The Reversal Obtained', { incomeMult: 1.08, unrestAll: -0.3 }, 240);
          h.chronicle(ctx, 'diplomacy', 'The ban is litigated at the eastern court by men who '
            + 'know exactly which official to see. It is rescinded in five years, and the '
            + 'precedent is that it could be imposed at all.');
        }),
      },
      {
        label: 'Let each community keep and spend its own',
        tooltip: '+12 governance points and "The Local Purse" (+5% income, +0.6 unrest everywhere) for twenty-five years. The schools of the land lose their revenue and every congregation gains a treasury, which is the end of the centre and the beginning of everything that replaces it.',
        effects: guard('gold:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12 });
          mod(ctx, 'the_local_purse', 'The Local Purse', { incomeMult: 1.05, unrestAll: 0.6 }, 300);
          h.setFlag(ctx, 'localPurse', true);
          h.chronicle(ctx, 'era', 'Each community is told to keep what it collects. The centre '
            + 'loses its revenue in one year, and four hundred congregations discover they can '
            + 'pay for a school.');
        }),
      },
    ],
  },

  // ── 415 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132y_the_ships_from_alexandria',
    title: 'The Ships from Alexandria',
    desc: 'It begins with a quarrel about dancers at the theatre and a list of names handed to '
      + 'the prefect, and it ends with the bishop of Alexandria leading a crowd through the '
      + 'Jewish quarter of the largest Jewish city on earth, and the community of seven '
      + 'centuries — Philo\'s city, the city of the Greek Bible, the city where a third of the '
      + 'population had been Jewish — being turned out of it with what they could carry.\n\n'
      + 'The prefect protests to Constantinople that he governs the city and the bishop does '
      + 'not. He is right on the law and he is beaten in the street a few months later by '
      + 'monks from the desert, and the emperor does nothing that changes anything. The ships '
      + 'begin arriving on this coast that autumn. What arrives with them is a piece of '
      + 'information: that in this century a bishop with a crowd can do what an emperor with '
      + 'an army chose not to.',
    forTag: 'player',
    date: { y: 415, m: 9 },
    aiOption: 0,
    historical: 'Cyril expelled the Jews of Alexandria in 414–415, against the prefect Orestes, who was assaulted for opposing him. The community never recovered its position.',
    options: [
      {
        label: 'Take them in, all of them, and pay for it',
        tooltip: '−100 talents in landings, food and settlement: +15 legitimacy, +1 stability, and "The Alexandrians" (+9% income, +6% trade, +4% manpower) for thirty years. They arrive with nothing except every skill a city has.',
        effects: guard('ships:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -100, legitimacy: 15, stability: 1 });
          mod(ctx, 'the_alexandrians', 'The Alexandrians', { incomeMult: 1.09, tradeMult: 1.06, manpowerMult: 1.04 }, 360);
          h.setFlag(ctx, 'alexandriansReceived', true);
          h.chronicle(ctx, 'era', 'The ships from Alexandria are met at every harbour on the '
            + 'coast and the people on them are landed, fed and settled. It costs more than '
            + 'the year\'s revenue and it is not debated.');
        }),
      },
      {
        label: 'Petition the emperor before receiving anybody',
        tooltip: '−50 talents on the embassy: +12 influence points and "The Protest Lodged" (+5% income, −0.3 unrest everywhere) for twenty years. The answer is a form of words. The refugees arrive anyway, later, poorer.',
        effects: guard('ships:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50, infl: 12 });
          mod(ctx, 'protest_lodged', 'The Protest Lodged', { incomeMult: 1.05, unrestAll: -0.3 }, 240);
          h.chronicle(ctx, 'diplomacy', 'A protest is lodged at Constantinople about Alexandria '
            + 'before anybody is landed. It is answered courteously and changes nothing at '
            + 'all.');
        }),
      },
      {
        label: 'Send money and passage to Babylonia instead',
        tooltip: '−55 talents: +10 influence points and "The Eastern Passage" (+7% income, +5% trade) for twenty-five years. They are safer beyond the frontier than they would be here, and everybody knows why.',
        effects: guard('ships:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, infl: 10 });
          mod(ctx, 'the_eastern_passage', 'The Eastern Passage', { incomeMult: 1.07, tradeMult: 1.05 }, 300);
          h.chronicle(ctx, 'era', 'The Alexandrians are given passage east rather than a home '
            + 'here, because beyond the frontier no bishop can lead a crowd through their '
            + 'street. Nobody pretends this is a happy arrangement.');
        }),
      },
    ],
  },

  // ── 418 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev132y_the_offices_closed',
    title: 'The Offices Closed',
    desc: 'A short law with a long shadow: Jews are excluded from the imperial service and from '
      + 'the army. Those already serving may finish their term. The advocacy is left open, for '
      + 'now, because the courts cannot function without the men who currently do that work — '
      + 'which will be remedied in twenty-five years.\n\n'
      + 'This is the last hinge. A community can survive being taxed, being disliked, even '
      + 'being periodically attacked; what it cannot survive intact is being made structurally '
      + 'unable to hold any position from which decisions are made about it. From this year the '
      + 'nation\'s dealings with the state that governs it run entirely through petition, '
      + 'patronage and money — and it becomes very, very good at all three, because the other '
      + 'roads have been closed by statute.',
    forTag: 'player',
    date: { y: 418, m: 3 },
    aiOption: 1,
    historical: 'The law of 418 excluded Jews from the militia and the imperial service; the advocacy followed in 425 and 438. The pattern held in Europe for fourteen hundred years.',
    options: [
      {
        label: 'Buy the patronage the offices used to give us',
        tooltip: '−70 talents a decade into the households of men who hold posts: +12 influence points and "The Patrons" (+8% income, −0.4 unrest everywhere) for thirty years.',
        effects: guard('offices:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -70, infl: 12 });
          mod(ctx, 'the_patrons', 'The Patrons', { incomeMult: 1.08, unrestAll: -0.4 }, 360);
          h.chronicle(ctx, 'era', 'What the offices used to provide is bought instead: '
            + 'friendships in the households of men who hold them. It works, and it costs '
            + 'every year, for ever.');
        }),
      },
      {
        label: 'Build our own courts, our own schools and our own registry',
        tooltip: '−60 talents: +18 governance points and "The Nation\'s Own Bench" (+7% income, −0.8 unrest everywhere, −6% cost of governing) for thirty-five years. If we may hold no office in their state, we will need every office of our own.',
        effects: guard('offices:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -60, gov: 18 });
          mod(ctx, 'own_bench', 'The Nation\'s Own Bench', { incomeMult: 1.07, unrestAll: -0.8, adminMult: 0.94 }, 420);
          h.setFlag(ctx, 'ownBench', true);
          h.chronicle(ctx, 'era', 'Courts, schools, a registry of deeds and a bench of judges '
            + 'are built out of the community\'s own money. It is a government without a '
            + 'country, and it lasts longer than the empire that made it necessary.');
        }),
      },
      {
        label: 'Go east, and take the professions with us',
        tooltip: '−45 talents in passages: +10 influence points and "The Move East" (+9% income, +5% trade) for thirty years, with −5% manpower — the frontier is a border and people who cross it stay crossed.',
        effects: guard('offices:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, infl: 10 });
          mod(ctx, 'the_move_east', 'The Move East', { incomeMult: 1.09, tradeMult: 1.05, manpowerMult: 0.95 }, 360);
          h.chronicle(ctx, 'era', 'The physicians, the advocates and the clerks are helped east '
            + 'across the frontier, where an empire that does not care what they believe is '
            + 'hiring.');
        }),
      },
    ],
  },
];
