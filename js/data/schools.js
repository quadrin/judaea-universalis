// Judaea Universalis — the quarrel of the two schools (SPEC §186). Content
// package: zero imports, read by js/sim/schools.js and nothing else.
//
// WHAT WAS MISSING. The Pharisees and the Sadducees were in this game as two
// approval bars among five. A player could carry them for a hundred and forty
// years of the 167 chapter and never once be asked the question the two
// parties actually existed to disagree about — which is not "do you like us"
// but "whose reading of the Law is the law here". Josephus and the Mishnah
// between them preserve a dozen specific disputes, every one of which a
// Hasmonean crown had to rule on because the Temple could not run without an
// answer, and every one of which cost the crown one of its two constituencies.
// That is a mechanic, and it was sitting in the sources unimplemented.
//
// So: six RULINGS, each a real recorded controversy, each with a side the
// schools took and a side the priestly houses took. Issuing one is permanent,
// costs points, grants a named modifier for the rest of the campaign, moves
// both parties' approval in opposite directions, and pushes THE READING — a
// −10..+10 axis that is the realm's standing answer to the whole quarrel and
// pays its own realm-wide benefit and price.
//
// WHY SIX AND NOT TWENTY. Every entry has to pass the same test the
// institutions file uses: could a court of the period have ruled either way,
// at a price it could name? That throws out the disputes where one side simply
// won and nobody could have chosen otherwise, and it throws out everything
// that is doctrine without administration. What is left is six questions a
// High Priest could not avoid — the calendar, the festival rite, the penal
// code, the composition of the Great Court, the doctrine the army believes,
// and who governs the Temple's own purification. Each is attested; each has a
// note below saying where.
//
// THE POLES. `oral` is the Pharisaic side — the tradition of the fathers, the
// sages, the synagogue, and a Law that is argued. `written` is the Sadducean —
// the text and nothing added to it, the priestly houses, the Temple's revenue,
// and a Law that is administered. The names are the engine's; the parties they
// map to are the court's own `pharisees` and `sadducees` seats, and a chapter
// that seats neither never sees any of this.
//
// EACH ENTRY:
//   id            stable key; `game.schools.rulings[id]` stores the side given
//   name          what the panel prints
//   question      the dispute in one line, as the court would put it
//   source        the attestation, for the tooltip and for whoever edits next
//   cost          { gov, infl, treasury } — the price of convening on it
//   needsTemple   true when the dispute is about a rite only a standing House
//                 performs; the ruling is not offered where there is no House
//   oral/written  { label, name, text, effects, push, blurb }
//     label       the button
//     name        the permanent modifier's name
//     text        what the panel prints under it (the stat line, in prose)
//     effects     the modifier itself — ordinary tag-modifier keys
//     push        how far it moves the reading (positive = toward the schools)
//     blurb       the consequence, one sentence, printed once it is given
//
// The approval each side costs the other is NOT authored per entry: it is
// `SCHOOLS.rulingSwing` in the engine, because a court that could be bribed
// into an unpopular ruling by an entry with a soft number would make the whole
// axis meaningless. Every ruling costs the losing house the same.

export const SCHOOL_IDS = { oral: 'pharisees', written: 'sadducees' };

export const RULINGS = [
  {
    id: 'omer',
    name: 'The Morrow After the Sabbath',
    question: 'The sheaf is waved "on the morrow after the sabbath." Which sabbath?',
    source: 'Menahot 65a; Megillat Ta\'anit, 8 Nisan — the dispute over the date of Pentecost.',
    cost: { gov: 30 },
    oral: {
      label: 'After the festival day',
      name: 'The Schools Keep the Year',
      text: 'One calendar in every village: −0.5 unrest, +8% integration',
      effects: { unrestAll: -0.5, integrateMult: 1.08 },
      push: 2,
      blurb: 'The count begins the second night of Passover, and every village in the realm '
        + 'keeps the same festivals as the school it can walk to.',
    },
    written: {
      label: 'After the sabbath itself',
      name: 'The Temple Fixes the Year',
      text: 'The year is proclaimed from the court: +0.15 legitimacy a month, +3% income',
      effects: { legitimacyAdd: 0.15, incomeMult: 1.03 },
      push: -2,
      blurb: 'Pentecost falls on a Sunday for ever, because the text says sabbath and means it, '
        + 'and the year is proclaimed from the Temple court like every other year since Zadok.',
    },
  },
  {
    id: 'libation',
    name: 'The Water at the Altar\'s Foot',
    question: 'At Tabernacles, is water poured on the altar beside the wine — or is that no part of the written Law?',
    source: 'Sukkah 4:9; Josephus, Ant. XIII.372 — Jannaeus poured it at his feet and the '
      + 'festival crowd pelted him with their citrons.',
    cost: { gov: 20, infl: 20 },
    needsTemple: true,
    oral: {
      label: 'Pour it on the altar',
      name: 'The Joy of the Water-Drawing',
      text: 'The greatest week of the year: +15% from the ascents, −0.4 unrest',
      effects: { pilgrimMult: 1.15, unrestAll: -0.4 },
      push: 2,
      blurb: 'The libation is poured where the people can see it poured, and the pilgrim crowds '
        + 'come for a festival that has become the loudest week in the world.',
    },
    written: {
      label: 'The Law knows no such rite',
      name: 'The Rite Kept to the Text',
      text: 'The houses approve, the crowd does not: +5% income, +0.5 unrest',
      effects: { incomeMult: 1.05, unrestAll: 0.5 },
      push: -2,
      blurb: 'The water stays in the golden flask. The great houses are satisfied and the '
        + 'festival crowd is not, and a crowd at Tabernacles is most of the country.',
    },
  },
  {
    id: 'decrees',
    name: 'The Book of Decrees',
    question: '"An eye for an eye" — the eye itself, or the price of an eye?',
    source: 'Bava Kamma 83b–84a; Megillat Ta\'anit, 4 Tammuz — "the Book of Decrees was taken '
      + 'away", the Sadducean code of fixed sentences.',
    cost: { gov: 40 },
    oral: {
      label: 'The price of an eye',
      name: 'Damages, Not Maimings',
      text: 'The courts assess and the fines come in: +4% income, −0.4 unrest',
      effects: { incomeMult: 1.04, unrestAll: -0.4 },
      push: 2,
      blurb: 'Injury is assessed in silver by men who spend their lives assessing it, and a '
        + 'court that maims once in seventy years is called destructive.',
    },
    written: {
      label: 'The letter, and the book',
      name: 'The Written Code',
      text: 'Sentences without argument: −6% cost of governing, +0.5 unrest',
      effects: { adminMult: 0.94, unrestAll: 0.5 },
      push: -2,
      blurb: 'The Book of Decrees stays open on the bench: fixed sentences, written down, '
        + 'administered by clerks who need not send to a sage for a reading.',
    },
  },
  {
    id: 'chamber',
    name: 'The Chamber of Hewn Stone',
    question: 'Who sits on the benches of the Great Court — the houses whose fathers sat there, or the sages?',
    source: 'Sanhedrin 4:1–4; Josephus, Ant. XVIII.17 — the priests do as the Pharisees say, '
      + 'or the people will not stand for it.',
    cost: { gov: 45 },
    oral: {
      label: 'The sages take the benches',
      name: 'The Sages on the Benches',
      text: 'A court in every town: −0.6 unrest, +10% integration',
      effects: { unrestAll: -0.6, integrateMult: 1.10 },
      push: 3,
      blurb: 'Men who are not priests judge in the chamber the priests built, and the crown\'s '
        + 'writ reaches every village through a school rather than a garrison.',
    },
    written: {
      label: 'The houses keep them',
      name: 'The Court of the Priestly Houses',
      text: 'One bench, one voice: +0.2 legitimacy a month, +5% income',
      effects: { legitimacyAdd: 0.2, incomeMult: 1.05 },
      push: -3,
      blurb: 'The chamber stays what it was: the great houses, the Temple\'s accounts, and a '
        + 'court that returns a verdict the same day the crown asks for one.',
    },
  },
  {
    id: 'resurrection',
    name: 'The Resurrection and the Angel',
    question: 'Do the dead rise, and are there angels and spirits — or is there only what is written?',
    source: 'Josephus, Ant. XVIII.14–16; War II.163–165; Acts 23:8 — the Sadducees say there is '
      + 'neither resurrection nor angel nor spirit.',
    cost: { infl: 40 },
    oral: {
      label: 'The dead will rise',
      name: 'A Nation That Expects a Hereafter',
      text: 'Men who believe it fight like it: +6% morale, +5% manpower',
      effects: { moraleMult: 1.06, manpowerMult: 1.05 },
      push: 2,
      blurb: 'The doctrine is taught in every synagogue, and a country that believes the grave '
        + 'is not the end sends its sons up the hill differently.',
    },
    written: {
      label: 'Only what is written',
      name: 'The Sober Houses',
      text: 'This world, counted carefully: +6% income, +3% growth',
      effects: { incomeMult: 1.06, growthMult: 1.03 },
      push: -2,
      blurb: 'Reward and punishment are in this life and nowhere else, which is a hard doctrine '
        + 'to preach and an excellent one to keep accounts under.',
    },
  },
  {
    id: 'heifer',
    name: 'The Ashes of the Heifer',
    question: 'May the priest who burns the red heifer be one who immersed today — or must the sun set on him first?',
    source: 'Parah 3:7 — the sages deliberately defiled the priest and immersed him, to show the '
      + 'Sadducean insistence on sundown was not law.',
    cost: { gov: 25, infl: 25 },
    needsTemple: true,
    oral: {
      label: 'The day-immersed priest may burn it',
      name: 'The Schools Rule the Rite',
      text: 'The Temple keeps the schools\' purity: −0.5 unrest, +10% from the ascents',
      effects: { unrestAll: -0.5, pilgrimMult: 1.10 },
      push: 3,
      blurb: 'The sages lay a hand on the priest to defile him, immerse him, and send him out to '
        + 'burn the heifer — a demonstration, performed in public, that the Temple\'s own '
        + 'purity is theirs to define.',
    },
    written: {
      label: 'The sun must set on him first',
      name: 'The Altar Answers to the Altar',
      text: 'Purity as the houses have always kept it: +0.2 legitimacy a month, +4% income',
      effects: { legitimacyAdd: 0.2, incomeMult: 1.04 },
      push: -3,
      blurb: 'The priest waits for sundown, as his father waited, and the one rite that makes '
        + 'the whole nation clean is performed by the houses on the houses\' terms.',
    },
  },
];

// The reading's own profile, by band. `scale` is applied to the whole effect
// block by the engine — a realm at +4 pays four-tenths of the committed line,
// so the axis is continuous and the bands are only how the panel talks about
// it. The two poles are deliberately NOT mirror images: the schools buy the
// country and the houses buy the treasury, which is the actual trade the
// Hasmoneans were making.
export const READING = {
  oral: {
    name: 'The Reading of the Schools',
    effects: { unrestAll: -1.2, manpowerMult: 1.10, moraleMult: 1.05, incomeMult: 0.94 },
    text: '−1.2 unrest, +10% manpower, +5% morale, −6% income',
    blurb: 'The Law is what the sages say it is, and the sages are in every village. The country '
      + 'is quiet and it musters — and the great houses count the tithes very slowly.',
  },
  written: {
    name: 'The Reading of the Houses',
    effects: { incomeMult: 1.14, legitimacyAdd: 0.25, unrestAll: 1.0, manpowerMult: 0.92 },
    text: '+14% income, +0.25 legitimacy a month, +1.0 unrest, −8% manpower',
    blurb: 'The Law is the text, and the text is kept in the Temple by men who keep its accounts '
      + 'too. The crown is rich and unquestioned — and the country is not with it.',
  },
  mid: {
    blurb: 'The crown has ruled on nothing, and both houses are still waiting to hear whose Law '
      + 'this is. Nobody is angry yet; nobody is anybody\'s either.',
  },
};

// What the two houses do to a realm TOGETHER (SPEC §186). The court states are
// read off both approvals at once, which is the thing five separate estate
// bars structurally could not say: that a crown with one devoted party and one
// broken one is in a WORSE position than a crown both parties merely tolerate.
export const COURT_STATES = {
  concord: {
    name: 'The Sanhedrin Sits Whole',
    text: '+0.3 legitimacy a month, −0.5 unrest, −5% cost of governing',
    effects: { legitimacyAdd: 0.3, unrestAll: -0.5, adminMult: 0.95 },
    blurb: 'Both houses are at the bench, and a ruling that comes out of that chamber is not '
      + 'appealed anywhere in the land. It is very hard to hold and worth holding.',
  },
  breachOral: {
    name: 'The Schools Preach Against the House',
    text: '+1.25 unrest, −10% manpower, −0.2 legitimacy a month',
    effects: { unrestAll: 1.25, manpowerMult: 0.90, legitimacyAdd: -0.2 },
    blurb: 'The crown has taken the houses\' side and broken with the schools, and there is a '
      + 'sage in every town explaining, at length and from the text, what kind of king this is.',
  },
  breachWritten: {
    name: 'The Great Houses Close the Treasury',
    text: '−15% income, −40% from the ascents, −10% reinforcement',
    effects: { incomeMult: 0.85, pilgrimMult: 0.60, reinforceMult: 0.90 },
    blurb: 'The crown has taken the schools\' side and broken with the houses, and the Temple\'s '
      + 'strongroom has developed a very slow door.',
  },
  schism: {
    name: 'The Crown Rules Alone',
    text: '+1.5 unrest, −0.4 legitimacy a month, −8% income, −20% from the ascents',
    effects: { unrestAll: 1.5, legitimacyAdd: -0.4, incomeMult: 0.92, pilgrimMult: 0.80 },
    blurb: 'Neither house will own what happens next. This is the position Alexander Jannaeus '
      + 'governed from, and it is why his own subjects invited a Seleucid army in.',
  },
};

// The two cards a sustained breach eventually deals. Both are historical and
// both are forks, not punishments: the crown that has broken with a house is
// asked, once, whether it means it. Guarded by `SCHOOLS.crisisCdMonths` and by
// the same one-dynamic-card-at-a-time rule the estate demands use.
export const BREACH_CRISES = {
  oral: {
    id: 'citrons',
    title: 'Citrons at the Water-Gate',
    text: 'It is the seventh day of Tabernacles and the court is full. The High Priest takes the '
      + 'golden flask to the altar, and — with the whole nation watching, and because the schools '
      + 'have spent three years saying the rite is theirs and not his — pours the water at his own '
      + 'feet. The sound that comes back off the colonnades is not a sound anyone has heard in the '
      + 'Temple before. Then the first citron hits the altar rail, and then six thousand of them, '
      + 'and the mercenaries in the outer court look to you for the word.',
    options: [
      {
        label: 'Let the guard clear the court',
        tooltip: 'The historical answer, and it costs what it cost him: −2 stability, −10 legitimacy, '
          + 'the schools go to 5 approval and the reading swings hard to the houses. '
          + 'The country will be six years unquiet.',
        stability: -2, legitimacy: -10, oral: -25, written: 10, push: -3,
        flag: 'waterGateCleared',
        chronicle: 'The guard cleared the Temple court at Tabernacles. The dead were counted in thousands.',
      },
      {
        label: 'Set down the flask',
        tooltip: 'Costs 60 governance points. The schools go up 20, the houses down 10, and the '
          + 'reading swings to the schools. Every priestly house in Jerusalem watches you do it.',
        cost: { gov: 60 }, oral: 20, written: -10, push: 3,
        flag: 'waterGateYielded',
        chronicle: 'The flask was set down at the altar\'s foot, and the crown poured as the schools say to pour.',
      },
      {
        label: 'Finish the rite and leave by the east gate',
        tooltip: 'Neither answer. −4 legitimacy, and both houses learn that this crown flinches.',
        legitimacy: -4, oral: -5, written: -5,
        chronicle: 'The rite was finished in silence and the king left by the east gate.',
      },
    ],
  },
  written: {
    id: 'strongroom',
    title: 'The Chamber Declines to Count',
    text: 'The Temple treasurers are courteous men and they have brought their ledgers. The '
      + 'half-shekel is coming in from Babylon and Alexandria as it always does; the tithes are '
      + 'coming up from the terraces as they always do. What is not happening is the part where '
      + 'any of it leaves the strongroom for the crown. The rulings of the last years, they '
      + 'explain, have made it unclear whose money this is — and unclear money, under the written '
      + 'Law, stays where it is until somebody with authority says otherwise.',
    options: [
      {
        label: 'Confirm the houses in the Temple\'s revenue',
        tooltip: 'Costs 80 talents and 30 influence. The houses go up 20, the schools down 12, and '
          + 'the reading swings to the houses — but the silver moves this month.',
        cost: { treasury: 80, infl: 30 }, written: 20, oral: -12, push: -3,
        flag: 'strongroomConfirmed',
        chronicle: 'The Temple\'s revenue was confirmed to the houses that have always counted it.',
      },
      {
        label: 'Put the crown\'s own men on the ledgers',
        tooltip: '−8 legitimacy and the houses go to the floor (−25), but the strongroom opens: '
          + '+150 talents now, and the reading swings to the schools.',
        treasury: 150, legitimacy: -8, written: -25, oral: 8, push: 2,
        flag: 'strongroomSeized',
        chronicle: 'The crown put its own clerks on the Temple ledgers, and the great houses have not forgotten it.',
      },
      {
        label: 'Let it stay where it is',
        tooltip: 'Nothing is confirmed and nothing is seized. −4 legitimacy, and the treasurers '
          + 'will be back with the same ledgers.',
        legitimacy: -4, written: -4,
        chronicle: 'The Temple\'s ledgers were left closed, and the question of whose money it is went unanswered.',
      },
    ],
  },
};
