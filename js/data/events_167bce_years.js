// Judaea Universalis — the years the chain skips: 159–71 BCE (SPEC §240).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// The Maccabean chapter runs a hundred and seven years and spends fifty-one of
// its seventy dated cards on the first twenty. What is left over the rest of
// it is the royal century (§106) and the world's own calendar (§111) — the
// wars and the dynasties — and nothing at all about the thing the revolt was
// fought to be allowed to be. This file is that: the priesthood standing
// empty, the calendar the wilderness kept instead, the second altar in Egypt,
// the case argued before a foreign king over which mountain God chose, the
// grandson translating his grandfather in Alexandria, the seventh year and its
// hole in the revenue, and the men who taught the law in pairs while the
// kings fought.
//
// Sources: 1 Maccabees 9 and 14 for the vacancy and the port; Josephus,
// Antiquities XII–XIII, for Leontopolis, the case before Philometor, the
// sabbatical remission and the coinage; the prologue to Ben Sira for the
// thirty-eighth year of Euergetes; 2 Maccabees 1 for the festal letter;
// Mishnah Avot 1 for the pairs; the Qumran calendrical texts and Jubilees for
// the reckoning of the sun.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_167bce_years] ' + key, e || '');
}

function guard(key, fn) {
  return function (ctx) {
    try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); }
  };
}

// Every card here is addressed to whoever is playing the chapter, so the
// modifiers land on the player's own chair and never need the §135 forwarding
// a world package does — `playerTag` is already the living court.
function P(ctx) { return ctx.game.playerTag; }

function mod(ctx, id, name, effects, months) {
  ctx.helpers.addTagModifier(ctx, P(ctx), {
    id, name, months: Number.isFinite(months) ? months : -1, effects,
  });
}

export const EVENTS_167_YEARS = [

  // ── 159 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev167y_the_seat_nobody_filled',
    title: 'The Seat Nobody Filled',
    desc: 'Alcimus is dead — struck down, the chronicle says, in the middle of ordering the '
      + 'wall of the inner court pulled down, which is the kind of death a chronicle enjoys '
      + 'writing. Antioch does not send a replacement. There is a war on in Media, a regent '
      + 'in Antioch who cannot spare a garrison, and no obvious candidate who would survive '
      + 'the journey.\n\n'
      + 'So the office stands open. Not abolished, not contested: open, with the vestments in '
      + 'their chest and the courses of priests taking their weeks exactly as before, and '
      + 'nobody at all to go into the sanctuary on the tenth of Tishri. The elders point out, '
      + 'quietly, that this has never happened. The men in the wilderness point out, less '
      + 'quietly, that an empty chair is cleaner than the last four men who sat in it.',
    forTag: 'player',
    date: { y: -159, m: 6 },
    aiOption: 0,
    historical: 'The high priesthood stood vacant for seven years after Alcimus died in 159 BCE. Jonathan took it in 152, from a Seleucid claimant who needed him.',
    options: [
      {
        label: 'Let it stand empty',
        tooltip: 'Nobody is elevated and nobody is offended: +10 governance points, +3 legitimacy, and "The Vacant Seat" (−0.05 monthly legitimacy) until somebody fills it. The office keeps its dignity by not being handed to anyone.',
        effects: guard('seat:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 10, legitimacy: 3 });
          mod(ctx, 'vacant_seat', 'The Vacant Seat', { legitimacyAdd: -0.05 }, 96);
          h.setFlag(ctx, 'seatLeftEmpty', true);
          h.chronicle(ctx, 'era', 'Alcimus is dead and no man is raised in his place. The '
            + 'vestments stay in their chest; the courses serve their weeks; the Day of '
            + 'Atonement passes with nobody behind the veil.');
        }),
      },
      {
        label: 'Let the courses choose one of their own',
        tooltip: 'The twenty-four courses put up a caretaker from among themselves: −15 talents, +5 legitimacy, and "The Caretaker of the Courses" (−0.4 unrest everywhere) for six years. A priesthood the priests picked is nobody\'s appointment.',
        effects: guard('seat:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -15, legitimacy: 5 });
          mod(ctx, 'caretaker_courses', 'The Caretaker of the Courses', { unrestAll: -0.4 }, 72);
          h.chronicle(ctx, 'era', 'The courses of the priesthood put up one of their own to '
            + 'keep the office warm — chosen by the men who serve in it, which is an answer '
            + 'no king has ever given.');
        }),
      },
      {
        label: 'The office belongs to the house that saved the altar',
        tooltip: 'The claim is made early and out loud: +8 legitimacy, +10 influence points, and "The Priesthood Claimed" (+0.6 unrest everywhere) for four years while the older houses digest it.',
        effects: guard('seat:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 8, infl: 10 });
          mod(ctx, 'priesthood_claimed', 'The Priesthood Claimed', { unrestAll: 0.6 }, 48);
          h.setFlag(ctx, 'priesthoodClaimedEarly', true);
          h.chronicle(ctx, 'era', 'The house that cleansed the altar states its claim to serve '
            + 'at it. The older families say nothing where it can be written down.');
        }),
      },
    ],
  },

  // ── 156 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev167y_the_reckoning_of_the_sun',
    title: 'The Reckoning of the Sun',
    desc: 'A copy of a book comes up from the wilderness settlements by way of a merchant who '
      + 'cannot read it and knew it would be worth something anyway. It is a calendar. Three '
      + 'hundred and sixty-four days, fifty-two weeks exactly, four seasons of thirteen weeks '
      + 'each — so that every festival falls on the same weekday every year, for ever, and no '
      + 'holy day can ever fall on a sabbath.\n\n'
      + 'It is an elegant system and it is not the Temple\'s. The Temple watches for the new '
      + 'moon and adds a month when the barley is late, which means the Temple\'s Passover and '
      + 'the wilderness\'s Passover are usually days apart and occasionally weeks. The men who '
      + 'keep this book are not merely early or late. They are eating unleavened bread while '
      + 'Jerusalem is still selling leaven, and they hold that Jerusalem — not they — is the '
      + 'party keeping the wrong feast.',
    forTag: 'player',
    date: { y: -156, m: 4 },
    aiOption: 2,
    historical: 'The 364-day solar calendar of Jubilees and the Qumran texts put its keepers permanently out of step with the Temple. Neither side ever moved.',
    options: [
      {
        label: 'The moon is the sign He gave. Say so in writing',
        tooltip: 'A ruling from the court, circulated: +10 governance points, +4 legitimacy, and "The Reckoning Settled" (−0.3 unrest everywhere) for eight years. The men in the wilderness are now formally wrong, which is not the same as gone.',
        effects: guard('sun:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 10, legitimacy: 4 });
          mod(ctx, 'reckoning_settled', 'The Reckoning Settled', { unrestAll: -0.3 }, 96);
          h.chronicle(ctx, 'era', 'The court rules for the moon: the feasts are kept when the '
            + 'watchers see the crescent and the elders say the month has begun.');
        }),
      },
      {
        label: 'Send for the men who keep it',
        tooltip: '−20 talents and a summer of argument in the chamber: +15 governance points and +5 influence points. Nobody is convinced of anything, and the court has learned the sect\'s whole system from the inside.',
        effects: guard('sun:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -20, gov: 15, infl: 5 });
          h.chronicle(ctx, 'era', 'The keepers of the sun-reckoning are brought up to argue '
            + 'their book in the chamber. They go home unmoved, and so does everyone else.');
        }),
      },
      {
        label: 'A calendar is not a rebellion',
        tooltip: 'Nothing is ruled. +5 governance points, and the two reckonings run side by side — which is what a country with a wilderness in it looks like.',
        effects: guard('sun:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 5 });
          h.chronicle(ctx, 'era', 'No ruling is issued about the calendar. Two Passovers are '
            + 'kept in one small country, some years a week apart, and the sky does not fall.');
        }),
      },
    ],
  },

  // ── 154 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev167y_the_altar_in_the_nome',
    title: 'The Altar in the Heliopolite Nome',
    desc: 'Onias, son of the high priest the Syrians murdered at Daphne, has been in Egypt for '
      + 'years commanding troops for Ptolemy Philometor and doing it well enough that the king '
      + 'will grant him almost anything. What he has asked for is a ruined temple of Bubastis '
      + 'in the Heliopolite nome, and what he has built on it is an altar.\n\n'
      + 'He cites Isaiah — there shall be an altar to the Lord in the midst of the land of '
      + 'Egypt — and he has the pedigree that no man in Jerusalem can match: he is the '
      + 'legitimate Zadokite heir to the office his family held for two hundred years and '
      + 'lost to a bribe. His tower is smaller than the House and his lamp hangs rather than '
      + 'stands, which he says is deference. The Jews of Egypt are numerous, rich, and have '
      + 'never once been asked to make the journey up to a city that is currently at war '
      + 'about eight times a decade.',
    forTag: 'player',
    date: { y: -154, m: 8 },
    aiOption: 1,
    historical: 'Onias IV built his temple in the Heliopolite nome around 160 BCE. It served the Jews of Egypt for more than two centuries; Rome closed it in 73 CE, after Jerusalem was already ash.',
    options: [
      {
        label: 'There is one House and it is here',
        tooltip: 'A formal condemnation goes to Alexandria: +6 legitimacy at home, and "The Egyptian Question" (−5% income) for six years as the Nile communities take the ruling personally.',
        effects: guard('nome:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 6 });
          mod(ctx, 'egyptian_question', 'The Egyptian Question', { incomeMult: 0.95 }, 72);
          h.setFlag(ctx, 'leontopolisCondemned', true);
          h.chronicle(ctx, 'era', 'Jerusalem condemns the altar in the Heliopolite nome. Egypt '
            + 'reads the letter, files it, and goes on sacrificing.');
        }),
      },
      {
        label: 'Say nothing, and keep the road open',
        tooltip: 'No ruling either way: +10 influence points and "The Nile Congregations" (+5% income) for ten years. Their half-shekels still come up, which is the argument that mattered.',
        effects: guard('nome:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 10 });
          mod(ctx, 'nile_congregations', 'The Nile Congregations', { incomeMult: 1.05 }, 120);
          h.chronicle(ctx, 'era', 'No ruling is made about the altar in Egypt. The half-shekels '
            + 'come up the coast as they always have, and nobody in Jerusalem asks where the '
            + 'senders sacrificed.');
        }),
      },
      {
        label: 'Send him the courses and the measures',
        tooltip: '−30 talents to send priests, a copy of the Temple\'s order of service and the true measures: +8 influence points and "The Second Altar Acknowledged" (+8% income) for eight years. −5 legitimacy at home, where this reads as surrender.',
        effects: guard('nome:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -30, infl: 8, legitimacy: -5 });
          mod(ctx, 'second_altar', 'The Second Altar Acknowledged', { incomeMult: 1.08 }, 96);
          h.setFlag(ctx, 'leontopolisAcknowledged', true);
          h.chronicle(ctx, 'era', 'Priests and the true measures go down to the Heliopolite '
            + 'nome from Jerusalem. Nobody in either city uses the word schism out loud.');
        }),
      },
    ],
  },

  // ── 145 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev167y_the_case_before_the_king',
    title: 'The Case Before the King',
    desc: 'The Jews and the Samaritans of Alexandria have been arguing in the streets about '
      + 'which mountain God chose, and the argument has finally reached the only court in '
      + 'Egypt that can end it. Ptolemy Philometor agrees to hear the case. Sabbaeus and '
      + 'Theodosius will speak for Gerizim; a man named Andronicus for Jerusalem. The king '
      + 'sets one condition, and the advocates accept it: the losing side\'s counsel is put '
      + 'to death.\n\n'
      + 'It is a monstrous procedure and everybody involved thinks it is entirely reasonable, '
      + 'because both sides are certain. Andronicus argues from the succession of high '
      + 'priests and from the kings of Judah who sent their gifts to one house and no other. '
      + 'The king rules for Jerusalem. Andronicus goes home. The others do not.',
    forTag: 'player',
    date: { y: -145, m: 5 },
    world: true,
    worldLabel: 'Jerusalem and Gerizim argue their claim before the king of Egypt',
    aiOption: 0,
    historical: 'Josephus records the disputation before Ptolemy VI Philometor, the death-stakes and the verdict for Jerusalem. Gerizim went on being served regardless.',
    options: [
      {
        label: 'The verdict is a verdict. Publish it',
        tooltip: 'A foreign king\'s ruling read out in every congregation: +8 legitimacy, +10 influence points, and "The Verdict of Alexandria" (+5% income) for ten years.',
        effects: guard('case:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 8, infl: 10 });
          mod(ctx, 'verdict_alexandria', 'The Verdict of Alexandria', { incomeMult: 1.05 }, 120);
          h.setFlag(ctx, 'alexandrianVerdict', true);
          h.chronicle(ctx, 'era', 'The king of Egypt rules that the house at Jerusalem is the '
            + 'one built according to the laws of Moses. The ruling is read out from Cyrene '
            + 'to Babylon.');
        }),
      },
      {
        label: 'We do not need a Greek to tell us which mountain',
        tooltip: 'The court declines to celebrate a verdict it did not need: +12 governance points and +1 stability at home. The letter is not published, and Gerizim is not handed a grievance it can use.',
        effects: guard('case:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12, stability: 1 });
          h.chronicle(ctx, 'era', 'The verdict from Alexandria is received without ceremony. '
            + 'A court that has to be told which mountain, the elders observe, has already '
            + 'lost the argument.');
        }),
      },
    ],
  },

  // ── 132 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev167y_the_grandsons_preface',
    title: 'The Grandson\'s Preface',
    desc: 'In the thirty-eighth year of the king Euergetes a man arrives in Egypt carrying his '
      + 'grandfather\'s book. The grandfather was Yeshua ben Sira of Jerusalem, who wrote down '
      + 'what a wise man ought to know in the years before the trouble; the grandson has '
      + 'spent the voyage and some part of his life since translating it into Greek, and he '
      + 'writes a preface apologising for the result.\n\n'
      + 'The apology is the interesting part. Things said in Hebrew, he explains, have not '
      + 'the same force when they are turned into another tongue — and this is true not only '
      + 'of his grandfather but of the Law itself and the Prophets and the rest of the books. '
      + 'It is the first time anybody has written down that the sacred writings are a set '
      + 'with an edge to it, and the first time anybody has admitted in public that the '
      + 'nation is now reading them in a language its grandfathers did not pray in.',
    forTag: 'player',
    date: { y: -132, m: 9 },
    aiOption: 1,
    historical: 'The prologue to Ben Sira is dated to the thirty-eighth year of Ptolemy VIII Euergetes — 132 BCE — and is the earliest witness to the threefold division of the scriptures.',
    options: [
      {
        label: 'Pay for the copies, and pay for more',
        tooltip: '−25 talents to a scriptorium working in both tongues: +15 governance points and "The Books in Two Tongues" (+5% income, −0.2 unrest everywhere) for twelve years.',
        effects: guard('preface:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -25, gov: 15 });
          mod(ctx, 'books_two_tongues', 'The Books in Two Tongues', { incomeMult: 1.05, unrestAll: -0.2 }, 144);
          h.chronicle(ctx, 'era', 'The court pays for the copying, in Hebrew and in Greek both. '
            + 'A nation that can be read by its own children abroad is a larger nation.');
        }),
      },
      {
        label: 'Let the scribes settle what belongs in the set',
        tooltip: '+12 governance points, +4 legitimacy. The question the preface raises — which books — is put where it belongs, in front of men who will argue about it for two hundred years.',
        effects: guard('preface:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12, legitimacy: 4 });
          h.chronicle(ctx, 'era', 'The scribes are asked which books belong to the set and '
            + 'which do not. They begin an argument that outlives the dynasty.');
        }),
      },
      {
        label: 'The Law is not translated. It is only ever recited',
        tooltip: 'A ruling against the Greek text: +6 legitimacy and "The Tongue of the Fathers" (−0.3 unrest everywhere) for eight years, and −8% income as the Greek-reading congregations abroad hear what Jerusalem thinks of them.',
        effects: guard('preface:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 6 });
          mod(ctx, 'tongue_of_fathers', 'The Tongue of the Fathers', { unrestAll: -0.3, incomeMult: 0.92 }, 96);
          h.chronicle(ctx, 'era', 'Jerusalem rules that the Law is recited and not translated. '
            + 'In Alexandria the ruling is read out — in Greek, to a congregation that has '
            + 'never heard it any other way.');
        }),
      },
    ],
  },

  // ── 124 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev167y_the_letter_to_egypt',
    title: 'The Letter to the Jews of Egypt',
    desc: 'The chancery drafts a circular, and what is remarkable about it is the sheer nerve '
      + 'of the thing. It goes to the brethren in Egypt — not summoned, not taxed, not '
      + 'rebuked. Invited. Since we are about to keep the purification of the Temple on the '
      + 'twenty-fifth of Kislev, we thought it necessary to inform you, that you also may keep '
      + 'the days.\n\n'
      + 'A festival is being exported. It has no scriptural warrant, no antiquity, and no '
      + 'authority behind it but the fact that the men who instituted it won; and the letter '
      + 'asks a community of hundreds of thousands, living under another king in another '
      + 'country and sacrificing at another altar, to light lamps in Kislev because Jerusalem '
      + 'says so. It will work. That is the part nobody in the room can be sure of yet.',
    forTag: 'player',
    date: { y: -124, m: 11 },
    aiOption: 0,
    historical: 'The festal letter prefixed to 2 Maccabees is dated to 124 BCE. Hanukkah is the only major Jewish festival with no biblical warrant, and it travelled anyway.',
    options: [
      {
        label: 'Send it, and send a copy every year',
        tooltip: '−10 talents a year in couriers, worth it: +10 influence points and "The Days of Dedication Abroad" (+6% income, +3% manpower) for twelve years. A calendar kept in common is a nation kept in common.',
        effects: guard('letter:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -10, infl: 10 });
          mod(ctx, 'dedication_abroad', 'The Days of Dedication Abroad', { incomeMult: 1.06, manpowerMult: 1.03 }, 144);
          h.setFlag(ctx, 'festalLetterSent', true);
          h.chronicle(ctx, 'era', 'The letter goes down to Egypt: keep the days of Kislev with '
            + 'us. Lamps are lit that winter in the Delta for a victory won in the hills '
            + 'forty years ago by men most of the celebrants could not name.');
        }),
      },
      {
        label: 'Send it as an instruction, not an invitation',
        tooltip: 'The wording is stiffened to a command: +8 legitimacy, +5 governance points, and "The Reach of the Chancery" (+2% income) for eight years. Egypt notes the tone and files it.',
        effects: guard('letter:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 8, gov: 5 });
          mod(ctx, 'reach_of_chancery', 'The Reach of the Chancery', { incomeMult: 1.02 }, 96);
          h.chronicle(ctx, 'era', 'The letter to Egypt goes out worded as an instruction. The '
            + 'congregations of the Delta keep the days and resent being told to.');
        }),
      },
      {
        label: 'A feast with no warrant in the Law should not be exported',
        tooltip: 'The circular is not sent: +10 governance points and +4 legitimacy with the strict houses. The days are kept in Judaea alone, which is where they were won.',
        effects: guard('letter:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 10, legitimacy: 4 });
          h.chronicle(ctx, 'era', 'The chancery drops the circular. The days of Dedication are '
            + 'kept in Judaea, by the people who were there.');
        }),
      },
    ],
  },

  // ── 121 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev167y_the_nation_on_the_nile',
    title: 'The Nation on the Nile',
    desc: 'A delegation comes up from Alexandria on behalf of the politeuma — the Jews of the '
      + 'city, who are a corporation under their own archons with their own registry, their '
      + 'own courts for their own people, and a quarter of the city to themselves. They are '
      + 'not asking for money and they are not asking for troops. They are asking whether a '
      + 'writ of divorce drawn under their archons is good in Judaea, and whether a man '
      + 'convicted in their courts is convicted here.\n\n'
      + 'It is a small question with a large hinge inside it. Answer yes and the crown has '
      + 'quietly claimed jurisdiction over Jews who are subjects of the Ptolemies, which the '
      + 'Ptolemies will notice. Answer no and the largest Jewish community on earth has just '
      + 'been told that its rulings stop at the border — and it will start asking what else '
      + 'stops there.',
    forTag: 'player',
    date: { y: -121, m: 3 },
    aiOption: 0,
    historical: 'The Alexandrian politeuma governed its own affairs under its own archons for three centuries. Its relations with Jerusalem were never formally defined by anybody.',
    options: [
      {
        label: 'One law for the nation, wherever it lives',
        tooltip: '+12 influence points and "The Law Travels" (+7% income) for ten years, and −5 governance points spent on a jurisdiction claim that no king anywhere has agreed to.',
        effects: guard('nile:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 12, gov: -5 });
          mod(ctx, 'law_travels', 'The Law Travels', { incomeMult: 1.07 }, 120);
          h.setFlag(ctx, 'diasporaJurisdiction', true);
          h.chronicle(ctx, 'era', 'Jerusalem rules that a judgment of the Jewish courts of '
            + 'Alexandria stands in Judaea. No Ptolemy is consulted.');
        }),
      },
      {
        label: 'Their archons for their city, our elders for the land',
        tooltip: '+12 governance points and +1 stability. Two jurisdictions, formally distinct, formally friendly — and no foreign chancery has anything to object to.',
        effects: guard('nile:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12, stability: 1 });
          h.chronicle(ctx, 'era', 'The court answers Alexandria carefully: their archons for '
            + 'their city, our elders for the land, and courtesy between them.');
        }),
      },
      {
        label: 'Send elders down to sit with theirs',
        tooltip: '−35 talents for the passage and the year: +8 influence points, +8 governance points, and "The Bench at Alexandria" (+4% income, −0.2 unrest everywhere) for eight years.',
        effects: guard('nile:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, infl: 8, gov: 8 });
          mod(ctx, 'bench_alexandria', 'The Bench at Alexandria', { incomeMult: 1.04, unrestAll: -0.2 }, 96);
          h.chronicle(ctx, 'era', 'Elders of Jerusalem go down to sit on the bench at '
            + 'Alexandria for a year. Both benches learn what the other has been doing.');
        }),
      },
    ],
  },

  // ── 117 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev167y_the_seventh_year',
    title: 'The Seventh Year',
    desc: 'The fields go unsown, the vines unpruned, the debts released, and the treasury '
      + 'discovers again what it discovers every seven years: that a commandment kept by an '
      + 'entire country has a shape in the ledgers. There is no harvest to tithe and no '
      + 'harvest to tax. The granaries carry the difference or they do not.\n\n'
      + 'Every neighbouring power has at some point remarked on this and every one of them '
      + 'has treated it as an exploitable weakness, because a besieged fortress in a '
      + 'sabbatical year starves faster and an army in the field eats stores that will not be '
      + 'replaced until the autumn after next. It is also the single most expensive thing the '
      + 'nation does that no foreign observer has ever persuaded it to stop doing.',
    forTag: 'player',
    date: { y: -117, m: 9 },
    aiOption: 0,
    historical: 'The sabbatical year is attested as a real fiscal and military constraint from Beth-Zur in 162 BCE to Caesar\'s decree remitting tribute in the seventh year.',
    options: [
      {
        label: 'Fill the granaries the year before, every cycle',
        tooltip: '−60 talents now for standing stores: "The Sabbatical Granaries" (+4% income, +5% manpower, −0.3 unrest everywhere) for fifteen years. The commandment stops being an emergency and becomes an accounting line.',
        effects: guard('seventh:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -60 });
          mod(ctx, 'sabbatical_granaries', 'The Sabbatical Granaries', { incomeMult: 1.04, manpowerMult: 1.05, unrestAll: -0.3 }, 180);
          h.setFlag(ctx, 'sabbaticalGranaries', true);
          h.chronicle(ctx, 'era', 'The crown builds the sabbatical stores: six years of a '
            + 'skimmed tithe against the seventh, so the fallow year costs the country a '
            + 'granary instead of a famine.');
        }),
      },
      {
        label: 'Remit the tribute of the fallow year and eat the loss',
        tooltip: '−45 talents in forgone revenue: +6 legitimacy, +1 stability, and "The Year Forgiven" (−0.5 unrest everywhere) for six years.',
        effects: guard('seventh:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, legitimacy: 6, stability: 1 });
          mod(ctx, 'year_forgiven', 'The Year Forgiven', { unrestAll: -0.5 }, 72);
          h.chronicle(ctx, 'era', 'The fallow year is remitted from the assessment entire. The '
            + 'villages of the hill country notice, and remember.');
        }),
      },
      {
        label: 'Buy grain abroad and sell it at the gate',
        tooltip: '−30 talents laid out through the coast merchants: +5 influence points and "The Foreign Grain" (+3% income, +0.4 unrest everywhere) for four years, because the strict houses ask whose fields it grew in.',
        effects: guard('seventh:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -30, infl: 5 });
          mod(ctx, 'foreign_grain', 'The Foreign Grain', { unrestAll: 0.4, incomeMult: 1.03 }, 48);
          h.chronicle(ctx, 'era', 'Grain is bought abroad and sold at the gates through the '
            + 'fallow year. It is eaten, and argued about while it is eaten.');
        }),
      },
    ],
  },

  // ── 110 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev167y_the_pairs',
    title: 'The Pairs',
    desc: 'Two men have been teaching in Jerusalem for a decade — one presides, one sits at '
      + 'his right, and between them they hold whatever the tradition currently is. They took '
      + 'it from two men before them, who took it from two men before that, back to the men '
      + 'who took it from the prophets; and neither of them is a priest, holds an office, or '
      + 'has been appointed by anyone.\n\n'
      + 'This is a second government growing quietly in the same city as the first. It has no '
      + 'army and no revenue and it decides what the Law means, which means that in the '
      + 'ordinary life of the country it decides nearly everything. The crown can endow it, '
      + 'ignore it, or try to appoint to it. The one thing the crown cannot do is teach.',
    forTag: 'player',
    date: { y: -110, m: 10 },
    aiOption: 2,
    historical: 'The zugot — the pairs — carried the tradition from the Maccabean period to Hillel and Shammai. No Hasmonean ever succeeded in controlling the succession.',
    options: [
      {
        label: 'Endow the schools out of the treasury',
        tooltip: '−40 talents: +10 governance points and "The Endowed Schools" (+6% income, −0.4 unrest everywhere) for twelve years. Teachers paid by the crown are teachers the crown can find.',
        effects: guard('pairs:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, gov: 10 });
          mod(ctx, 'endowed_schools', 'The Endowed Schools', { incomeMult: 1.06, unrestAll: -0.4 }, 144);
          h.chronicle(ctx, 'era', 'The crown endows the houses of study. The teaching does not '
            + 'change; the teachers eat better and are easier to summon.');
        }),
      },
      {
        label: 'The crown will confirm the succession',
        tooltip: 'An appointment power claimed: +8 legitimacy, +10 influence points, and "The Confirmed Chair" (+0.7 unrest everywhere) for six years. The sages comply and begin, immediately, to record who really taught whom.',
        effects: guard('pairs:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 8, infl: 10 });
          mod(ctx, 'confirmed_chair', 'The Confirmed Chair', { unrestAll: 0.7 }, 72);
          h.setFlag(ctx, 'crownConfirmsSages', true);
          h.chronicle(ctx, 'era', 'The crown claims the confirming of the chair. The chain of '
            + 'tradition is recited that year with particular care, and the crown is not in it.');
        }),
      },
      {
        label: 'Let them teach',
        tooltip: '+8 governance points, +1 stability, and "The Two Authorities" (−0.3 unrest everywhere) for ten years. A country in which nobody has to ask the king what a verse means is a quieter country than one in which they do.',
        effects: guard('pairs:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 8, stability: 1 });
          mod(ctx, 'two_authorities', 'The Two Authorities', { unrestAll: -0.3 }, 120);
          h.chronicle(ctx, 'era', 'The pairs go on teaching, unendowed and unappointed. The '
            + 'crown rules the country and they rule the week.');
        }),
      },
    ],
  },

  // ── 100 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev167y_the_jars_of_the_land',
    title: 'The Jars of the Land',
    desc: 'The customs registers show something the court has not been watching: the stamped '
      + 'Rhodian wine jars that used to come through every port in the country have all but '
      + 'stopped, and what has replaced them is jars made here, filled here, and sold here — '
      + 'and increasingly sold abroad. The oil presses of the Galilee and the vats of the '
      + 'hill country have found a market that will pay a premium for produce a Jew may use, '
      + 'and the premium is the whole business model.\n\n'
      + 'The strict houses have been arguing for a generation that oil pressed by gentiles '
      + 'may not be used, and the argument has always been treated as piety. The registers '
      + 'suggest it is also an industrial policy, and one that has worked: a ruling about '
      + 'purity has closed a domestic market to foreign competitors and opened a foreign one '
      + 'to the country\'s own.',
    forTag: 'player',
    date: { y: -100, m: 5 },
    aiOption: 1,
    historical: 'Imported stamped amphorae vanish from Hasmonean Jerusalem, replaced by local production. The prohibition on gentile oil is attested from the same period.',
    options: [
      {
        label: 'Make the ruling law and put a duty behind it',
        tooltip: '+12 governance points and "The Oil of the Land" (+10% income) for twelve years, with "The Closed Market" (+0.5 unrest everywhere) for six as the coastal cities discover what has been done to them.',
        effects: guard('jars:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12 });
          mod(ctx, 'oil_of_the_land', 'The Oil of the Land', { incomeMult: 1.10 }, 144);
          ctx.helpers.addTagModifier(ctx, P(ctx), {
            id: 'closed_market', name: 'The Closed Market', months: 72, effects: { unrestAll: 0.5 },
          });
          h.chronicle(ctx, 'era', 'The ruling on foreign oil is made law and given a duty to '
            + 'stand on. The presses of the Galilee run through the winter.');
        }),
      },
      {
        label: 'Pay for the presses and the roads to them',
        tooltip: '−50 talents into presses, vats and the tracks that reach them: "The Presses of the Galilee" (+8% income, +5% growth) for fifteen years.',
        effects: guard('jars:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50 });
          mod(ctx, 'presses_of_galilee', 'The Presses of the Galilee', { incomeMult: 1.08, growthMult: 1.05 }, 180);
          h.chronicle(ctx, 'era', 'The crown pays for presses, vats and the tracks that reach '
            + 'them. The country begins to export what it used to import.');
        }),
      },
      {
        label: 'A ruling about purity is not a customs policy',
        tooltip: '+10 governance points, +5 legitimacy with the sages, and "The Trade Left Alone" (+3% income) for ten years. The trade grows anyway, without the crown\'s thumb on it.',
        effects: guard('jars:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 10, legitimacy: 5 });
          mod(ctx, 'jars_untouched', 'The Trade Left Alone', { incomeMult: 1.03 }, 120);
          h.chronicle(ctx, 'era', 'The crown declines to turn a purity ruling into a tariff. '
            + 'The presses go on running and the ruling goes on being about purity.');
        }),
      },
    ],
  },

  // ── 93 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev167y_the_anchor_on_the_coin',
    title: 'The Anchor on the Coin',
    desc: 'The new bronzes come out of the mint with an anchor on them. It is a Seleucid '
      + 'device — every king in Antioch for a century has struck it — and putting it on a '
      + 'Judaean coin is either a claim to have inherited their sea or an admission of where '
      + 'the design came from, depending on which courtier is asked.\n\n'
      + 'What is behind it is the port. Joppa has been the country\'s harbour since Simon '
      + 'took it and turned out its garrison, and the timber, grain and pilgrims that move '
      + 'through it now pay for a considerable share of the army. A country whose only coast '
      + 'is one harbour has one harbour to lose, and the men who keep the customs house have '
      + 'been saying so, at increasing length, for three years.',
    forTag: 'player',
    date: { y: -93, m: 8 },
    aiOption: 0,
    historical: 'Alexander Jannaeus struck the anchor of the Seleucid kings on his own bronzes, and held the coast from Joppa to the Egyptian frontier.',
    options: [
      {
        label: 'Build the moles and dredge the basin',
        tooltip: '−55 talents into the harbour works: "The Harbour Works" (+9% income, +4% trade) for fifteen years, and Joppa keeps a quieter waterfront (−1 unrest there).',
        effects: guard('anchor:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55 });
          mod(ctx, 'harbour_works', 'The Harbour Works', { incomeMult: 1.09, tradeMult: 1.04 }, 180);
          h.addProvinceModifier(ctx, 'Joppa', {
            id: 'the_moles', name: 'The Moles and the Basin', months: 180, effects: { unrest: -1 },
          });
          h.chronicle(ctx, 'era', 'The moles go out into the water at Joppa and the basin is '
            + 'dredged. The country has a harbour instead of a beach.');
        }),
      },
      {
        label: 'Hulls, not moles',
        tooltip: '−70 talents for a squadron and the men to sail it: "The Anchor Fleet" (+6% naval strength, +4% income) for twelve years, and a Judaean flag at sea for the first time in four centuries.',
        effects: guard('anchor:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -70 });
          mod(ctx, 'anchor_fleet', 'The Anchor Fleet', { navalMult: 1.06, incomeMult: 1.04 }, 144);
          h.setFlag(ctx, 'hasmoneanFleet', true);
          h.chronicle(ctx, 'era', 'Hulls are laid down and crewed at Joppa. The anchor on the '
            + 'coinage acquires something to mean.');
        }),
      },
      {
        label: 'Strike our own device and leave the sea alone',
        tooltip: '+8 legitimacy and "The Star and the Wheel" (−0.3 unrest everywhere) for ten years. A country that owes nothing to Antioch does not advertise Antioch\'s anchor.',
        effects: guard('anchor:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 8 });
          mod(ctx, 'star_and_wheel', 'The Star and the Wheel', { unrestAll: -0.3 }, 120);
          h.chronicle(ctx, 'era', 'The anchor is struck off the dies. What replaces it is a '
            + 'star inside a wheel, which belongs to nobody\'s empire.');
        }),
      },
    ],
  },

  // ── 78 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev167y_the_ransom_of_the_captives',
    title: 'The Ransom of the Captives',
    desc: 'The pirates of Cilicia have been selling on Delos for years and some of the stock '
      + 'is ours: pilgrims taken off coasting vessels, families lifted whole out of villages '
      + 'on the Phoenician shore, a scribe from Jamnia who was going to Antioch about a '
      + 'lawsuit. Word comes up through the congregations of the islands, which have been '
      + 'buying back whoever they can afford and have run out of money.\n\n'
      + 'The going rate is a hundred drachmae a head and rising, because the sellers have '
      + 'worked out that this particular nation always pays. That is the argument against '
      + 'paying: every talent spent on ransom is an advertisement, and the price of the next '
      + 'captive is set by what was paid for the last one. It is also, so far, the only '
      + 'argument anyone has ever found against it.',
    forTag: 'player',
    date: { y: -78, m: 6 },
    aiOption: 0,
    historical: 'Redeeming captives was treated as an obligation with almost no ceiling; the rabbis later capped the price precisely because the market had noticed.',
    options: [
      {
        label: 'Pay, and keep paying',
        tooltip: '−70 talents: +10 legitimacy, +1 stability, and "The Ransomed" (+4% manpower, −0.5 unrest everywhere) for ten years. Several hundred people come home.',
        effects: guard('ransom:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -70, legitimacy: 10, stability: 1 });
          mod(ctx, 'the_ransomed', 'The Ransomed', { manpowerMult: 1.04, unrestAll: -0.5 }, 120);
          h.chronicle(ctx, 'era', 'The crown buys its people off the block at Delos and pays '
            + 'the asking price. The asking price goes up.');
        }),
      },
      {
        label: 'Fix a ceiling and publish it',
        tooltip: '−35 talents at the capped rate: +6 governance points, +5 legitimacy, and "The Published Ceiling" (+2% income) for eight years. Fewer come home this year and the market stops climbing.',
        effects: guard('ransom:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, gov: 6, legitimacy: 5 });
          mod(ctx, 'published_ceiling', 'The Published Ceiling', { incomeMult: 1.02 }, 96);
          h.chronicle(ctx, 'era', 'A ceiling is set on what will be paid for a captive and '
            + 'published where the sellers can read it. Some are left on the block, and it is '
            + 'written down that they were left on the block.');
        }),
      },
      {
        label: 'Buy nobody. Sink the men who took them',
        tooltip: '−45 talents to arm and pay a squadron against the slavers: +8 legitimacy, +6 martial points, and "The Coast Patrol" (+3% income, +3% naval strength) for ten years. This year\'s captives are not coming home.',
        effects: guard('ransom:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, legitimacy: 8, mar: 6 });
          mod(ctx, 'coast_patrol', 'The Coast Patrol', { incomeMult: 1.03, navalMult: 1.03 }, 120);
          h.chronicle(ctx, 'era', 'No ransom is paid. A squadron is paid instead, and told '
            + 'what to do with anyone found carrying people.');
        }),
      },
    ],
  },

  // ── 71 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev167y_the_books_in_the_jars',
    title: 'The Books in the Jars',
    desc: 'The scribes send up an inventory nobody asked for. The Temple\'s own master copies '
      + 'are going: the great roll of Isaiah has been recopied twice in living memory and the '
      + 'second copy is already soft at the columns it is opened at, the minor prophets are '
      + 'in four hands and three of them disagree, and there is one scroll of Samuel whose '
      + 'middle third nobody has been able to read since the fire.\n\n'
      + 'What the scribes want is money and a room. What they mention almost as an aside is '
      + 'that the wilderness settlements have been doing this for fifty years — copying, '
      + 'correcting, and sealing what they finish into jars against the day somebody comes '
      + 'for the library. The scribes of the Temple raise it as an example of provincial '
      + 'eccentricity. It will turn out to have been the only method that worked.',
    forTag: 'player',
    date: { y: -71, m: 4 },
    aiOption: 0,
    historical: 'The desert communities sealed their library into jars. It is the only Second Temple Jewish library that survived; the Temple\'s own copies did not.',
    options: [
      {
        label: 'A room, a stipend and a standard copy',
        tooltip: '−45 talents: +15 governance points and "The Corrected Rolls" (+5% income, −0.3 unrest everywhere) for twelve years. One text is declared standard and the disagreements go into the margin, where they can be argued with.',
        effects: guard('books:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, gov: 15 });
          mod(ctx, 'corrected_rolls', 'The Corrected Rolls', { incomeMult: 1.05, unrestAll: -0.3 }, 144);
          h.chronicle(ctx, 'era', 'The scribes get their room and their stipend. A standard '
            + 'copy is made of each book and the variants are written in the margin rather '
            + 'than thrown away.');
        }),
      },
      {
        label: 'Copy everything, and send copies out of the city',
        tooltip: '−60 talents for duplicate sets lodged in Babylon, Alexandria and the hill country: +10 governance points, +8 influence points, and "The Scattered Library" (−0.4 unrest everywhere, +3% income) for fifteen years.',
        effects: guard('books:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -60, gov: 10, infl: 8 });
          mod(ctx, 'scattered_library', 'The Scattered Library', { unrestAll: -0.4, incomeMult: 1.03 }, 180);
          h.setFlag(ctx, 'libraryScattered', true);
          h.chronicle(ctx, 'era', 'Duplicate sets go out to Babylon, to Alexandria and to '
            + 'three towns in the hills. A library in one city is a library one fire from '
            + 'nothing.');
        }),
      },
      {
        label: 'The rolls have lasted this long',
        tooltip: 'Nothing is spent. +10 talents stay in the treasury and the inventory is filed.',
        effects: guard('books:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 10 });
          h.chronicle(ctx, 'era', 'The scribes\' inventory is read, thanked and filed. The '
            + 'rolls go on being opened at the same columns.');
        }),
      },
    ],
  },
];
