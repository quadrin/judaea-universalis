// Judaea Universalis — the religious quarrels (SPEC §190, §201). Content
// package: zero imports, read by js/sim/schools.js and nothing else.
//
// WHAT WAS MISSING. §190 built this for one quarrel: the Pharisees and the
// Sadducees, who were two approval bars among five when the thing they existed
// to disagree about — whose reading of the Law the crown administers — is a
// single office with one occupant. That went in, and then the other seven
// chapters sat there with a Faith tab that showed an expectation gauge and a
// pilgrim road and nothing about the argument each of them is actually about.
// Every one of these chapters HAS such an argument, in the sources, with two
// named sides and a crown that had to rule:
//
//   167/67 BCE  the Pharisees and the Sadducees — the oral Law, or the text
//   40 BCE      Herod's Sanhedrin and Herod's own imported priestly house
//   66 CE       the offering for Caesar, and everything that followed it
//   132 CE      Akiva's schools and the Nasi's war state
//   529 CE      the Samaritan Council of Seven and the Gerizim priesthood
//   614 CE      the Babylonian academies and a restored altar
//   1948        the status quo letter, and what a Jewish state owes the Law
//
// So this file becomes a TABLE of quarrels, one per court that has one, and
// the engine resolves a tag's quarrel through `bookmark.schools`. The
// arithmetic is unchanged and shared; every word of the politics is per
// chapter, which is the division this codebase keeps everywhere else.
//
// THE POLES ARE `hi` AND `lo`, matching the doctrine axes (§85) rather than
// §190's first draft, which called them `oral` and `written` because in the
// Hasmonean chapter that is what they were. They are not that in 1948. `hi` is
// the positive end of the needle and `lo` the negative; which is which is a
// per-quarrel editorial choice, and the rule followed here is that `hi` is the
// side that would move the practice and `lo` the side that keeps it as
// received. Nothing in the engine cares.
//
// EACH QUARREL:
//   id            stable key; the bookmark's `schools` maps a tag to it
//   title         the panel block's heading
//   hi / lo       { seat, name, effects, text, blurb } — `seat` is the faction
//                 id at that court, and the quarrel only convenes where BOTH
//                 seats are seated. The rest is the reading's own pole: what a
//                 realm committed to that side pays and is charged.
//   states        the four chamber states, names and blurbs; `effects` may be
//                 overridden per quarrel and otherwise come from COURT_EFFECTS
//   crises        the card each sustained breach eventually deals
//   rulings       the disputes, below
//
// EACH RULING:
//   id            stable key; `game.schools.rulings[id]` stores the side given
//   name          what the panel prints
//   question      the dispute in one line, as the court would put it
//   source        the attestation, for the tooltip and for whoever edits next
//   cost          { gov, infl, mar, treasury } — the price of convening on it
//   needsTemple   true when the dispute is about a rite only a standing House
//                 performs; the ruling is not offered where there is no House
//   hi / lo       { label, name, text, effects, push, blurb }
//
// WHY FIVE OR SIX AND NOT TWENTY, per quarrel. Every entry has to pass the
// test the institutions file uses: could a court of the period have ruled
// either way, at a price it could name? That throws out the disputes where one
// side simply won and nobody could have chosen otherwise, and everything that
// is doctrine without administration. What survives is the handful of
// questions the chapter's ruler could not avoid answering.
//
// The approval each side costs the other is NOT authored per entry: it is
// `SCHOOLS.rulingSwing` in the engine, because a court that could be bribed
// into an unpopular ruling by an entry with a soft number would make the whole
// axis meaningless. Every ruling costs the losing house the same.

// The chamber's arithmetic, shared by every quarrel. A quarrel may override
// any of the four in its own `states`; none of them do at present, because the
// shape of the fact — concord is worth holding, a one-sided breach costs
// whatever the broken side was carrying, and two hostile houses is worse than
// either — is the same fact in every century. The WORDS are never shared.
export const COURT_EFFECTS = {
  concord: { legitimacyAdd: 0.3, unrestAll: -0.5, adminMult: 0.95 },
  breachHi: { unrestAll: 1.25, manpowerMult: 0.90, legitimacyAdd: -0.2 },
  breachLo: { incomeMult: 0.85, pilgrimMult: 0.60, reinforceMult: 0.90 },
  schism: { unrestAll: 1.5, legitimacyAdd: -0.4, incomeMult: 0.92, pilgrimMult: 0.80 },
};

// Printed under each state, so a player reads the same numbers the engine
// applies. Kept beside the table above for exactly that reason.
export const COURT_TEXT = {
  concord: '+0.3 legitimacy a month, −0.5 unrest, −5% cost of governing',
  breachHi: '+1.25 unrest, −10% manpower, −0.2 legitimacy a month',
  breachLo: '−15% income, −40% from the ascents, −10% reinforcement',
  schism: '+1.5 unrest, −0.4 legitimacy a month, −8% income, −20% from the ascents',
};

export const QUARRELS = {
  // ══════════════════════════════════════════════════════════════════════
  // 167 BCE (from 140) and 67 BCE — the quarrel §190 was built for.
  // ══════════════════════════════════════════════════════════════════════
  sages_and_houses: {
    id: 'sages_and_houses',
    title: 'The Law and Its Readers',
    hi: {
      seat: 'pharisees',
      name: 'The Reading of the Schools',
      effects: { unrestAll: -1.2, manpowerMult: 1.10, moraleMult: 1.05, incomeMult: 0.94 },
      text: '−1.2 unrest, +10% manpower, +5% morale, −6% income',
      blurb: 'The Law is what the sages say it is, and the sages are in every village. The country '
        + 'is quiet and it musters — and the great houses count the tithes very slowly.',
    },
    lo: {
      seat: 'sadducees',
      name: 'The Reading of the Houses',
      effects: { incomeMult: 1.14, legitimacyAdd: 0.25, unrestAll: 1.0, manpowerMult: 0.92 },
      text: '+14% income, +0.25 legitimacy a month, +1.0 unrest, −8% manpower',
      blurb: 'The Law is the text, and the text is kept in the Temple by men who keep its accounts '
        + 'too. The crown is rich and unquestioned — and the country is not with it.',
    },
    mid: 'The crown has ruled on nothing, and both houses are still waiting to hear whose Law '
      + 'this is. Nobody is angry yet; nobody is anybody\'s either.',
    states: {
      concord: {
        name: 'The Sanhedrin Sits Whole',
        blurb: 'Both houses are at the bench, and a ruling that comes out of that chamber is not '
          + 'appealed anywhere in the land. It is very hard to hold and worth holding.',
      },
      breachHi: {
        name: 'The Schools Preach Against the House',
        blurb: 'The crown has taken the houses\' side and broken with the schools, and there is a '
          + 'sage in every town explaining, at length and from the text, what kind of king this is.',
      },
      breachLo: {
        name: 'The Great Houses Close the Treasury',
        blurb: 'The crown has taken the schools\' side and broken with the houses, and the Temple\'s '
          + 'strongroom has developed a very slow door.',
      },
      schism: {
        name: 'The Crown Rules Alone',
        blurb: 'Neither house will own what happens next. This is the position Alexander Jannaeus '
          + 'governed from, and it is why his own subjects invited a Seleucid army in.',
      },
    },
    crises: {
      hi: {
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
              + 'the schools go to the floor and the reading swings hard to the houses. '
              + 'The country will be six years unquiet.',
            stability: -2, legitimacy: -10, hi: -25, lo: 10, push: -3,
            flag: 'waterGateCleared',
            chronicle: 'The guard cleared the Temple court at Tabernacles. The dead were counted in thousands.',
          },
          {
            label: 'Set down the flask',
            tooltip: 'Costs 60 governance points. The schools go up 20, the houses down 10, and the '
              + 'reading swings to the schools. Every priestly house in Jerusalem watches you do it.',
            cost: { gov: 60 }, hi: 20, lo: -10, push: 3,
            flag: 'waterGateYielded',
            chronicle: 'The flask was set down at the altar\'s foot, and the crown poured as the schools say to pour.',
          },
          {
            label: 'Finish the rite and leave by the east gate',
            tooltip: 'Neither answer. −4 legitimacy, and both houses learn that this crown flinches.',
            legitimacy: -4, hi: -5, lo: -5,
            chronicle: 'The rite was finished in silence and the king left by the east gate.',
          },
        ],
      },
      lo: {
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
            cost: { treasury: 80, infl: 30 }, lo: 20, hi: -12, push: -3,
            flag: 'strongroomConfirmed',
            chronicle: 'The Temple\'s revenue was confirmed to the houses that have always counted it.',
          },
          {
            label: 'Put the crown\'s own men on the ledgers',
            tooltip: '−8 legitimacy and the houses go to the floor (−25), but the strongroom opens: '
              + '+150 talents now, and the reading swings to the schools.',
            treasury: 150, legitimacy: -8, lo: -25, hi: 8, push: 2,
            flag: 'strongroomSeized',
            chronicle: 'The crown put its own clerks on the Temple ledgers, and the great houses have not forgotten it.',
          },
          {
            label: 'Let it stay where it is',
            tooltip: 'Nothing is confirmed and nothing is seized. −4 legitimacy, and the treasurers '
              + 'will be back with the same ledgers.',
            legitimacy: -4, lo: -4,
            chronicle: 'The Temple\'s ledgers were left closed, and the question of whose money it is went unanswered.',
          },
        ],
      },
    },
    rulings: [
      {
        id: 'omer',
        name: 'The Morrow After the Sabbath',
        question: 'The sheaf is waved "on the morrow after the sabbath." Which sabbath?',
        source: 'Menahot 65a; Megillat Ta\'anit, 8 Nisan — the dispute over the date of Pentecost.',
        cost: { gov: 30 },
        hi: {
          label: 'After the festival day',
          name: 'The Schools Keep the Year',
          text: 'One calendar in every village: −0.5 unrest, +8% integration',
          effects: { unrestAll: -0.5, integrateMult: 1.08 },
          push: 2,
          blurb: 'The count begins the second night of Passover, and every village in the realm '
            + 'keeps the same festivals as the school it can walk to.',
        },
        lo: {
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
        hi: {
          label: 'Pour it on the altar',
          name: 'The Joy of the Water-Drawing',
          text: 'The greatest week of the year: +15% from the ascents, −0.4 unrest',
          effects: { pilgrimMult: 1.15, unrestAll: -0.4 },
          push: 2,
          blurb: 'The libation is poured where the people can see it poured, and the pilgrim crowds '
            + 'come for a festival that has become the loudest week in the world.',
        },
        lo: {
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
        hi: {
          label: 'The price of an eye',
          name: 'Damages, Not Maimings',
          text: 'The courts assess and the fines come in: +4% income, −0.4 unrest',
          effects: { incomeMult: 1.04, unrestAll: -0.4 },
          push: 2,
          blurb: 'Injury is assessed in silver by men who spend their lives assessing it, and a '
            + 'court that maims once in seventy years is called destructive.',
        },
        lo: {
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
        hi: {
          label: 'The sages take the benches',
          name: 'The Sages on the Benches',
          text: 'A court in every town: −0.6 unrest, +10% integration',
          effects: { unrestAll: -0.6, integrateMult: 1.10 },
          push: 3,
          blurb: 'Men who are not priests judge in the chamber the priests built, and the crown\'s '
            + 'writ reaches every village through a school rather than a garrison.',
        },
        lo: {
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
        hi: {
          label: 'The dead will rise',
          name: 'A Nation That Expects a Hereafter',
          text: 'Men who believe it fight like it: +6% morale, +5% manpower',
          effects: { moraleMult: 1.06, manpowerMult: 1.05 },
          push: 2,
          blurb: 'The doctrine is taught in every synagogue, and a country that believes the grave '
            + 'is not the end sends its sons up the hill differently.',
        },
        lo: {
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
        hi: {
          label: 'The day-immersed priest may burn it',
          name: 'The Schools Rule the Rite',
          text: 'The Temple keeps the schools\' purity: −0.5 unrest, +10% from the ascents',
          effects: { unrestAll: -0.5, pilgrimMult: 1.10 },
          push: 3,
          blurb: 'The sages lay a hand on the priest to defile him, immerse him, and send him out to '
            + 'burn the heifer — a demonstration, performed in public, that the Temple\'s own '
            + 'purity is theirs to define.',
        },
        lo: {
          label: 'The sun must set on him first',
          name: 'The Altar Answers to the Altar',
          text: 'Purity as the houses have always kept it: +0.2 legitimacy a month, +4% income',
          effects: { legitimacyAdd: 0.2, incomeMult: 1.04 },
          push: -3,
          blurb: 'The priest waits for sundown, as his father waited, and the one rite that makes '
            + 'the whole nation clean is performed by the houses on the houses\' terms.',
        },
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // 40 BCE — Herod's Sanhedrin, and Herod's own priestly house.
  //
  // Herod solved the Hasmonean problem by making the High Priesthood an
  // appointment. He fetched Simon son of Boethus from Alexandria, married his
  // daughter, and gave the office to a family with no base in the country —
  // and the Boethusians are named in the sources for two centuries afterward
  // as the party of that arrangement. Against them sits the Sanhedrin, whose
  // members he had executed forty-five of on taking the city, and in which the
  // two houses of Hillel and Shammai were at that moment inventing the rest of
  // Judaism. That is the argument of this reign, and neither side is the
  // crown's friend.
  // ══════════════════════════════════════════════════════════════════════
  fence_and_gate: {
    id: 'fence_and_gate',
    title: 'The Fence and the Gate',
    hi: {
      seat: 'sanhedrin',
      name: 'The Gate Stands Open',
      effects: { growthMult: 1.08, tradeMult: 1.10, convertMult: 1.15, unrestAll: 0.8 },
      text: '+8% growth, +10% trade, +15% conversion, +0.8 unrest',
      blurb: 'Hillel\'s reading: the Law is livable, the convert is welcome, and a man may do '
        + 'business with the world he lives in. The kingdom grows, trades and absorbs — and the '
        + 'strict have a great deal to say about all three.',
    },
    lo: {
      seat: 'boethusians',
      name: 'The Fence Is Built High',
      effects: { unrestAll: -1.1, legitimacyAdd: 0.2, pilgrimMult: 1.12, tradeMult: 0.90 },
      text: '−1.1 unrest, +0.2 legitimacy a month, +12% from the ascents, −10% trade',
      blurb: 'The decrees stand: the oil, the bread and the daughters of the nations are kept at a '
        + 'distance, and the Temple is the one thing everyone agrees about. A quiet, pious, '
        + 'inward kingdom that does less business every year.',
    },
    mid: 'The king has ruled on nothing, which for this king is itself a policy: the sages argue, '
      + 'the priests he appointed keep quiet, and nobody yet knows what kind of Jewish kingdom '
      + 'this is meant to be.',
    states: {
      concord: {
        name: 'The King Keeps Both Houses',
        blurb: 'An Idumean client king with the Sanhedrin and the Temple both content is a thing '
          + 'that did not happen. Hold it and the reign is something better than it was.',
      },
      breachHi: {
        name: 'The Schools Remember the Forty-Five',
        blurb: 'The crown has gone with its own priests, and the chamber remembers what happened '
          + 'to the last Sanhedrin that argued with this house.',
      },
      breachLo: {
        name: 'The King\'s Priests Are Nobody\'s Priests',
        blurb: 'The Boethusians were given the office because they had no country behind them, and '
          + 'a crown that has now dropped them discovers exactly how little that office is worth '
          + 'without the family that was bought with it.',
      },
      schism: {
        name: 'A Foreigner on the Throne of David',
        blurb: 'Neither the Law nor the altar will speak for this king, and the one word left in '
          + 'the country for him is the one his enemies always used: Idumean.',
      },
    },
    crises: {
      hi: {
        id: 'eagle',
        title: 'The Golden Eagle at the Great Gate',
        text: 'The rumour that the king is dying reaches the schools before it reaches the palace, '
          + 'and two teachers — Judas son of Sepphoraeus and Matthias son of Margalus — tell their '
          + 'students what the second commandment says about the great gilded eagle over the Temple '
          + 'gate. Forty young men go up on ropes in the middle of the day and cut it down with axes '
          + 'while the court below watches. The guard has them. The king, who is not dead, wants to '
          + 'know what you propose to do with forty scholars and two teachers.',
        options: [
          {
            label: 'Burn the teachers alive',
            tooltip: 'What was done: Josephus, War I.655. −2 stability, −12 legitimacy, the Sanhedrin '
              + 'to the floor, and the reading swings hard to the fence. The night of the eclipse is '
              + 'remembered for this.',
            stability: -2, legitimacy: -12, hi: -25, lo: 12, push: -3,
            flag: 'eagleBurned',
            chronicle: 'The teachers were burned alive and the students with them, on the night of the eclipse.',
          },
          {
            label: 'Take the eagle down and let them go',
            tooltip: 'Costs 50 influence and Rome notices: the Sanhedrin +20, the king\'s priests −10, '
              + 'the reading swings to the gate. The gilding is quietly scraped off the gate.',
            cost: { infl: 50 }, hi: 20, lo: -10, push: 3,
            flag: 'eagleYielded',
            chronicle: 'The eagle came down off the Temple gate, and the forty went home.',
          },
          {
            label: 'The forty go free; the two teachers do not',
            tooltip: 'The lawyer\'s answer. −5 legitimacy, both houses shift a little, and everyone '
              + 'understands exactly how much the crown is prepared to spend on principle.',
            legitimacy: -5, hi: -6, lo: -4, push: -1,
            chronicle: 'The two teachers were executed and their students released, which satisfied nobody.',
          },
        ],
      },
      lo: {
        id: 'boethus',
        title: 'The House of Boethus Asks What It Was For',
        text: 'Simon son of Boethus came from Alexandria because this crown sent for him, took an '
          + 'office his family had no claim to, and gave a daughter to the king to seal it. His '
          + 'people have spent a generation being the priesthood that the country does not respect '
          + 'and the crown does not need. Now the rulings have gone against them too, and the head '
          + 'of the house asks the question plainly, in a room with the doors shut: what, exactly, '
          + 'was the bargain — and is the crown still in it?',
        options: [
          {
            label: 'Renew the bargain, in writing and in land',
            tooltip: 'Costs 120 talents and 30 governance. The king\'s priests +22, the Sanhedrin −12, '
              + 'the reading swings to the fence. The arrangement holds another generation.',
            cost: { treasury: 120, gov: 30 }, lo: 22, hi: -12, push: -3,
            flag: 'boethusRenewed',
            chronicle: 'The house of Boethus was confirmed in the office and the estates that came with it.',
          },
          {
            label: 'Depose them and appoint from the country',
            tooltip: 'The office goes to a house with a base — which is what the arrangement existed '
              + 'to prevent. Sanhedrin +14, the king\'s priests −22, +6 legitimacy, and the reading '
              + 'swings to the gate.',
            legitimacy: 6, lo: -22, hi: 14, push: 2,
            flag: 'boethusDeposed',
            chronicle: 'The Alexandrians were put out of the high priesthood and a house of the country put in.',
          },
          {
            label: 'Say nothing and change nothing',
            tooltip: 'The bargain is neither renewed nor ended. −4 legitimacy, and the head of the '
              + 'house begins writing to people he has not written to before.',
            legitimacy: -4, lo: -6,
            chronicle: 'The question of what the house of Boethus was for went unanswered.',
          },
        ],
      },
    },
    rulings: [
      {
        id: 'prosbul',
        name: 'The Prosbul',
        question: 'The seventh year cancels every debt. Shall the court hold the bonds, so that men will still lend in the sixth?',
        source: 'Sheviit 10:3–4; Gittin 36a — Hillel\'s own institution, made "for the good order of '
          + 'the world" when he saw that people were refusing to lend as the year approached.',
        cost: { gov: 35 },
        hi: {
          label: 'The court holds the bond',
          name: 'Hillel\'s Prosbul',
          text: 'Credit survives the seventh year: +7% income, +5% growth',
          effects: { incomeMult: 1.07, growthMult: 1.05 },
          push: 2,
          blurb: 'The lender assigns his bonds to the court before the year turns, and the court is '
            + 'not a person, and so the debt lives — which is either a repair to the Law or a hole '
            + 'through it, depending on which bench you ask.',
        },
        lo: {
          label: 'The year releases, as it is written',
          name: 'The Year of Release Kept',
          text: 'The poor are not sold for a debt: −0.7 unrest, −5% income',
          effects: { unrestAll: -0.7, incomeMult: 0.95 },
          push: -2,
          blurb: 'Every seventh year the slate is wiped, as Deuteronomy says it must be. The '
            + 'smallholders keep their land and the men with money keep it in a box.',
        },
      },
      {
        id: 'convert',
        name: 'The Man Who Asked on One Foot',
        question: 'A gentile asks to be taught the whole Law while he stands on one foot. Is he driven off, or taught?',
        source: 'Shabbat 31a — Shammai drove him out with the builder\'s cubit in his hand; Hillel '
          + 'said: what is hateful to you, do not do to your fellow. That is the whole Torah.',
        cost: { infl: 35 },
        hi: {
          label: 'Teach him',
          name: 'The Gate Held Open',
          text: 'The nations come in: +18% conversion, +4% growth',
          effects: { convertMult: 1.18, growthMult: 1.04 },
          push: 2,
          blurb: 'The convert is received with as little friction as the Law allows, and a kingdom '
            + 'of Greek cities and Idumean hills finds that the Law can be joined rather than '
            + 'only endured.',
        },
        lo: {
          label: 'Drive him off',
          name: 'The Cubit in the Hand',
          text: 'What is inside stays inside: −0.6 unrest, +0.15 legitimacy a month',
          effects: { unrestAll: -0.6, legitimacyAdd: 0.15 },
          push: -2,
          blurb: 'A man who treats the Law as something to be summarized on one foot is not asking '
            + 'seriously, and the strict are not in the business of making it easy. The faithful '
            + 'are certain of what they are; nobody else is joining.',
        },
      },
      {
        id: 'eighteen',
        name: 'The Eighteen Decrees',
        question: 'Shall the oil, the bread and the daughters of the nations be forbidden outright — a fence around the fence?',
        source: 'Shabbat 13b–17b; Mishnah Shabbat 1:4 — the House of Shammai outvoted the House of '
          + 'Hillel in the upper room, and that day is remembered as grievous as the golden calf.',
        cost: { gov: 30, infl: 20 },
        hi: {
          label: 'Let the decrees fall',
          name: 'The Upper Room Overruled',
          text: 'A kingdom that trades with its neighbours: +12% trade, +0.6 unrest',
          effects: { tradeMult: 1.12, unrestAll: 0.6 },
          push: 3,
          blurb: 'The eighteen are not enforced, and Jew and Greek buy oil from each other in every '
            + 'market on the coast. The strict count this as the day the wall came down.',
        },
        lo: {
          label: 'The eighteen stand',
          name: 'The Eighteen Decrees',
          text: 'A people apart: −0.9 unrest, +8% from the ascents, −12% trade',
          effects: { unrestAll: -0.9, pilgrimMult: 1.08, tradeMult: 0.88 },
          push: -3,
          blurb: 'The fence is built where Shammai\'s house said to build it. The country is more '
            + 'certain of itself than it has been in a century, and considerably poorer.',
        },
      },
      {
        id: 'passover',
        name: 'The Passover That Fell on a Sabbath',
        question: 'The eve of Passover falls on a sabbath. Does the offering override the day — and who is competent to say?',
        source: 'Pesahim 66a — the Bene Bathyra could not answer; Hillel answered from the text and '
          + 'they set him at their head that day.',
        cost: { gov: 40 },
        needsTemple: true,
        hi: {
          label: 'The reasoning decides, and the reasoner leads',
          name: 'The Nasi of the Chamber',
          text: 'A head of the court who argued his way there: −0.5 unrest, +0.2 legitimacy a month',
          effects: { unrestAll: -0.5, legitimacyAdd: 0.2 },
          push: 3,
          blurb: 'The question is settled by an argument from the text rather than by whose father '
            + 'held the office, and the man who made the argument is put at the head of the '
            + 'chamber the same day. Nobody has ever been made Nasi that way before.',
        },
        lo: {
          label: 'The courses have always known what to do',
          name: 'The Custom of the Courses',
          text: 'The altar answers its own questions: +0.25 legitimacy a month, +8% from the ascents',
          effects: { legitimacyAdd: 0.25, pilgrimMult: 1.08 },
          push: -3,
          blurb: 'The priests who have kept this festival every year of their lives are told to keep '
            + 'it as they have kept it, and the clever young man from Babylon is thanked and sent '
            + 'back to his bench.',
        },
      },
      {
        id: 'kingsPriests',
        name: 'The Office in the King\'s Gift',
        question: 'Is the High Priesthood held for life by a house — or granted, and withdrawn, by the crown?',
        source: 'Josephus, Ant. XV.320–322, XX.247 — Herod sent to Alexandria for Simon son of '
          + 'Boethus, married his daughter, and thereafter appointed and deposed at will.',
        cost: { gov: 50 },
        needsTemple: true,
        hi: {
          label: 'For life, and to a house of the country',
          name: 'The Office Out of the King\'s Hand',
          text: 'A priesthood with a base: −0.7 unrest, +10% from the ascents',
          effects: { unrestAll: -0.7, pilgrimMult: 1.10 },
          push: 2,
          blurb: 'The office goes back to a family the country recognizes and stops being a thing '
            + 'the palace hands out — which makes the man who holds it a power the crown has to '
            + 'reckon with, exactly as before.',
        },
        lo: {
          label: 'The crown grants it, and the crown takes it back',
          name: 'The Priesthood in the King\'s Gift',
          text: 'No rival on the Mount: +0.3 legitimacy a month, +6% income',
          effects: { legitimacyAdd: 0.3, incomeMult: 1.06 },
          push: -2,
          blurb: 'The vestments are kept in the fortress and issued for the festivals. A High Priest '
            + 'who serves at the crown\'s pleasure is a High Priest who never becomes a king, '
            + 'which is the entire point and the whole cost.',
        },
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // 66 CE — the war was begun by a ruling. Eleazar son of Ananias persuaded
  // the Temple ministers to accept no offering from a foreigner, which ended
  // the daily sacrifice for the emperor, "and this was the true beginning of
  // our war with the Romans" (War II.409–410). Every question after it is the
  // same question: what does the Law require of a nation at war with the world.
  // ══════════════════════════════════════════════════════════════════════
  sacrifice_for_caesar: {
    id: 'sacrifice_for_caesar',
    title: 'What the Law Requires of Us Now',
    hi: {
      seat: 'zealots',
      name: 'The Law of a Nation at War',
      effects: { manpowerMult: 1.14, moraleMult: 1.08, incomeMult: 0.90, unrestAll: 0.5 },
      text: '+14% manpower, +8% morale, −10% income, +0.5 unrest',
      blurb: 'The rigorists have their rulings and the country is a war church: every man of age is '
        + 'a soldier and every soldier believes the war is a commandment. Nothing is being '
        + 'produced, banked, or negotiated.',
    },
    lo: {
      seat: 'notables',
      name: 'The Law of a People That Means to Survive',
      effects: { incomeMult: 1.12, unrestAll: -0.8, legitimacyAdd: 0.2, moraleMult: 0.93 },
      text: '+12% income, −0.8 unrest, +0.2 legitimacy a month, −7% morale',
      blurb: 'The houses of property have their rulings: the sacrifices continue, the courts sit, '
        + 'the harvest is brought in and somebody is always, deniably, talking to somebody. The '
        + 'city is governed. The men on the walls know it, too.',
    },
    mid: 'The rulings have not been made and the war is being fought on habit. Nobody has said out '
      + 'loud whether this is a rebellion that wants terms or a commandment that cannot take them.',
    states: {
      concord: {
        name: 'The City Is of One Mind',
        blurb: 'The war party and the men of property in the same chamber, agreeing — which is what '
          + 'the first year actually looked like, before Ananus and before the winter.',
      },
      breachHi: {
        name: 'The Daggers Look for Traitors',
        blurb: 'The crown has ruled with the men of property, and the sicarii have decided that a '
          + 'ruling like that is what a Roman party looks like. They are already choosing names.',
      },
      breachLo: {
        name: 'The Houses Take Their Silver and Their Advice',
        blurb: 'The crown has ruled with the rigorists, and the men who fund the walls and count the '
          + 'grain have discovered that their money has business in Antioch.',
      },
      schism: {
        name: 'Three Armies in One City',
        blurb: 'Neither party owns the war. This is the winter of 69 in advance: the granaries burn '
          + 'while Titus is still marching, and everyone in the city knows whose fault it is.',
      },
    },
    crises: {
      hi: {
        id: 'lots',
        title: 'The Lot Falls on a Stonecutter',
        text: 'The Zealots hold the inner court and they have finished arguing about the priesthood. '
          + 'The office, they say, went by lot in the beginning and the great houses turned it into '
          + 'an inheritance and then into a purchase — so it goes by lot again. The urn is brought '
          + 'out. The lot falls on Phanni son of Samuel, of the village of Aphtha, who is a '
          + 'stonecutter and does not know what the office requires, and they dress him in the '
          + 'vestments while he stands there. The old High Priests are in the outer court, weeping.',
        options: [
          {
            label: 'The lot is the Law; let him serve',
            tooltip: 'What was done: War IV.147–157. The rigorists +18, the houses −20, the reading '
              + 'swings to them, −8 legitimacy and −1 stability. Every priestly family in the city '
              + 'is now an enemy of the government.',
            legitimacy: -8, stability: -1, hi: 18, lo: -20, push: 3,
            flag: 'priesthoodByLot',
            chronicle: 'The high priesthood was drawn by lot and fell on a stonecutter from Aphtha.',
          },
          {
            label: 'Take the vestments back off him',
            tooltip: 'Costs 60 martial points — this is a decision enforced by soldiers in the Temple '
              + 'court. The houses +18, the rigorists −20, the reading swings to the houses.',
            cost: { mar: 60 }, lo: 18, hi: -20, push: -3,
            flag: 'lotRefused',
            chronicle: 'The urn was put away and the vestments taken back, at spearpoint, in the inner court.',
          },
          {
            label: 'Let him serve, and let the courses instruct him',
            tooltip: 'Both and neither: −3 legitimacy, small shifts each way, and a High Priest who '
              + 'is a hostage of whichever party is in the room with him.',
            legitimacy: -3, hi: -4, lo: -4,
            chronicle: 'The stonecutter kept the office and the courses were told to teach him it.',
          },
        ],
      },
      lo: {
        id: 'granaries',
        title: 'The Granaries of the Rich',
        text: 'There is grain in this city for years of siege, and it is in private hands — the '
          + 'stores of the great houses, laid in against exactly this. The rigorists point out that '
          + 'a city under judgment does not hoard, that the poor are eating chaff in the lower town, '
          + 'and that the men who own the granaries are the same men who keep sending letters out. '
          + 'The owners point out, more quietly, that a burned granary feeds nobody in the third '
          + 'year. Both are entirely correct.',
        options: [
          {
            label: 'Open the granaries to the city',
            tooltip: '+120 talents now and the poor are fed — the rigorists +16 — but the houses go '
              + 'to the floor (−22) and the reading swings to them. Nothing is laid in after this.',
            treasury: 120, hi: 16, lo: -22, push: 2,
            flag: 'granariesOpened',
            chronicle: 'The private granaries were opened to the city, and nothing was laid in after them.',
          },
          {
            label: 'Guarantee the stores against the war',
            tooltip: 'Costs 40 governance. The houses +20, the rigorists −14, the reading swings to '
              + 'the houses — and the grain is still there when the siege comes.',
            cost: { gov: 40 }, lo: 20, hi: -14, push: -3,
            flag: 'granariesGuaranteed',
            chronicle: 'The great houses were guaranteed their stores, and the lower town was told to wait.',
          },
          {
            label: 'Neither, and quickly',
            tooltip: 'The question is deferred. −5 legitimacy, both parties lose a little faith, and '
              + 'somebody will settle it with fire eventually.',
            legitimacy: -5, hi: -5, lo: -5,
            chronicle: 'The question of the granaries was deferred, which is how they came to be burned.',
          },
        ],
      },
    },
    rulings: [
      {
        id: 'caesarOffering',
        name: 'The Offering for Caesar',
        question: 'Twice daily the House offers for the emperor and the Roman people. Is a gift from a foreigner lawful at this altar?',
        source: 'Josephus, War II.409–410 — Eleazar son of Ananias persuaded the ministers to accept '
          + 'nothing from a foreigner: "this was the true beginning of our war with the Romans".',
        cost: { gov: 30, mar: 20 },
        needsTemple: true,
        hi: {
          label: 'No gift of a foreigner at this altar',
          name: 'The Sacrifice Refused',
          text: 'The war is a commandment now: +8% manpower, +5% morale',
          effects: { manpowerMult: 1.08, moraleMult: 1.05 },
          push: 3,
          blurb: 'The daily offering for the emperor stops, and the thing that was a tax revolt in '
            + 'the morning is a war of religion by the evening. Nobody in the country is neutral '
            + 'after this.',
        },
        lo: {
          label: 'The offering continues',
          name: 'The Daily Offering Kept',
          text: 'A door left open: +0.25 legitimacy a month, +8% income',
          effects: { legitimacyAdd: 0.25, incomeMult: 1.08 },
          push: -3,
          blurb: 'The House goes on praying for the emperor and the Roman people, which the chief '
            + 'priests argue has been lawful since Cyrus, and which leaves the war something that '
            + 'can still, conceivably, be ended by a letter.',
        },
      },
      {
        id: 'sabbathSword',
        name: 'The Sabbath and the Sword',
        question: 'May the host fight on the sabbath — or only be killed on it?',
        source: '1 Macc 2:32–41, the precedent the Maccabees set in the caves; Josephus, War II.517 '
          + '— the pursuit broken off at Beth-horon because the day had come.',
        cost: { mar: 35 },
        hi: {
          label: 'We fight, and the day forgives us',
          name: 'The Host Keeps No Day',
          text: 'A war fought seven days a week: +6% discipline, +5% morale',
          effects: { disciplineMult: 1.06, moraleMult: 1.05 },
          push: 2,
          blurb: 'The ruling the Maccabees made in the caves is made again, and the Romans lose the '
            + 'one day a week on which this country could be beaten for free.',
        },
        lo: {
          label: 'The day is kept, whatever it costs',
          name: 'The Day Is Kept',
          text: 'The country sees what it is fighting for: −0.8 unrest, +0.2 legitimacy a month',
          effects: { unrestAll: -0.8, legitimacyAdd: 0.2 },
          push: -2,
          blurb: 'The pursuit stops at sundown on Friday and does not start again until sundown on '
            + 'Saturday. It costs battles. It also answers, every single week, the question of '
            + 'what exactly this war is for.',
        },
      },
      {
        id: 'archives',
        name: 'The Bonds in the Record Office',
        question: 'The debts of the poor are written down and kept in the archive. Does the archive burn?',
        source: 'Josephus, War II.427 — the Sicarii burned the record office "to destroy the '
          + 'moneylenders\' bonds and prevent the recovery of debts, so as to win over the poor".',
        cost: { gov: 25 },
        hi: {
          label: 'Burn it',
          name: 'The Debts Burned',
          text: 'The lower city is with the war: +10% manpower, −0.5 unrest, −8% income',
          effects: { manpowerMult: 1.10, unrestAll: -0.5, incomeMult: 0.92 },
          push: 3,
          blurb: 'Every bond in Jerusalem goes up in one afternoon, and the men who owed on them '
            + 'come out for the war that same week. So does every creditor, for the other side.',
        },
        lo: {
          label: 'The deeds stand',
          name: 'The Record Office Guarded',
          text: 'Property is still property: +10% income, +4% growth',
          effects: { incomeMult: 1.10, growthMult: 1.04 },
          push: -3,
          blurb: 'A guard is put on the archive and the debts survive the revolution, which keeps '
            + 'the men of property in the war and tells the lower city precisely whose war it is.',
        },
      },
      {
        id: 'sacredShekels',
        name: 'The Sacred Shekels',
        question: 'The Temple treasury holds the half-shekel of the whole world. Does it buy walls?',
        source: 'The Year One and Year Two silver of the revolt was struck from Temple metal; the '
          + 'chief priests\' objection is the standing complaint of the priesthood\'s own cards.',
        cost: { infl: 30 },
        needsTemple: true,
        hi: {
          label: 'Walls, javelins and bread',
          name: 'The Treasury Spent',
          text: 'A war financed: +12% income, +8% reinforcement',
          effects: { incomeMult: 1.12, reinforceMult: 1.08 },
          push: 2,
          blurb: 'The strongroom is opened and the sacred silver becomes ramparts, arrowheads and '
            + 'the year\'s coinage. The courses ask, reasonably, what is left to defend.',
        },
        lo: {
          label: 'The House\'s silver is the House\'s',
          name: 'The Treasury Sealed',
          text: 'The altar is the point of the war: −0.7 unrest, +12% from the ascents',
          effects: { unrestAll: -0.7, pilgrimMult: 1.12 },
          push: -2,
          blurb: 'The treasury stays sealed and the war is paid for out of the country instead. The '
            + 'daily sacrifice is never once interrupted for want of money, which is the argument '
            + 'and, to a great many people, the answer.',
        },
      },
      {
        id: 'gentileCourt',
        name: 'The Stone in the Middle Wall',
        question: 'The barrier warns the gentile away on pain of death. Is it enforced now, when Greeks in every city are killing Jews?',
        source: 'The Soreg inscriptions (two survive); Josephus, War V.194 — and the massacres at '
          + 'Caesarea, Scythopolis and Alexandria in the same summer.',
        cost: { gov: 25, infl: 15 },
        hi: {
          label: 'To the letter, and to the death',
          name: 'The Barrier Enforced',
          text: 'One people, one court: −0.6 unrest, +6% manpower, −8% trade',
          effects: { unrestAll: -0.6, manpowerMult: 1.06, tradeMult: 0.92 },
          push: 2,
          blurb: 'The warning stones mean what they say, and the Greek quarters of every town this '
            + 'realm holds understand their position exactly.',
        },
        lo: {
          label: 'The god-fearers may come as far as they came',
          name: 'The Outer Court Left Open',
          text: 'The sympathetic world is not driven off: +10% trade, +8% from the ascents',
          effects: { tradeMult: 1.10, pilgrimMult: 1.08 },
          push: -2,
          blurb: 'The gentiles who kept the sabbath and sent the half-shekel are still welcome as far '
            + 'as the barrier, which is where they always stood — and which is the difference '
            + 'between a nation at war with Rome and a nation at war with everyone.',
        },
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // 132 CE — Akiva said "this is the King Messiah" and Yohanan ben Torta told
  // him grass would grow on his cheeks first. The state that came out of that
  // argument ran for three years on documents dated by the Redemption of
  // Israel, signed by a Nasi who wrote to his officers about tithes, the
  // sabbatical year and men who had not turned up. The schools and the war
  // office are both in those letters, disagreeing.
  // ══════════════════════════════════════════════════════════════════════
  star_and_schools: {
    id: 'star_and_schools',
    title: 'The Star and the Schools',
    hi: {
      seat: 'sages',
      name: 'The Age of Redemption',
      effects: { moraleMult: 1.12, manpowerMult: 1.08, unrestAll: -0.6, incomeMult: 0.92 },
      text: '+12% morale, +8% manpower, −0.6 unrest, −8% income',
      blurb: 'The schools have declared what this is, and a country that believes it is living in '
        + 'the redemption fights like it and gives like it. If it turns out not to be the '
        + 'redemption, the schools have staked everything they have on it.',
    },
    lo: {
      seat: 'captains',
      name: 'The Prince\'s Administration',
      effects: { incomeMult: 1.12, disciplineMult: 1.08, adminMult: 0.92, unrestAll: 0.9 },
      text: '+12% income, +8% discipline, −8% cost of governing, +0.9 unrest',
      blurb: 'The Nasi\'s officers collect the tithes, allot the land, and write to villages about '
        + 'men who have not turned up. It is a real state and it works — and it is not what '
        + 'anybody left their farm for.',
    },
    mid: 'Nobody has said from the Nasi\'s own chair whether this is the redemption or a war, and '
      + 'the documents are being dated both ways in the same month.',
    states: {
      concord: {
        name: 'Akiva Carries the Prince\'s Arms',
        blurb: 'The greatest sage of the age endorsing the prince, and the prince\'s administration '
          + 'endowing the schools — the combination that made the rising possible, while it lasted.',
      },
      breachHi: {
        name: 'Grass on Akiva\'s Cheeks',
        blurb: 'The schools have been broken with, and the sentence Yohanan ben Torta said to Akiva '
          + 'is now being said about the Nasi, in every academy still standing.',
      },
      breachLo: {
        name: 'The Officers Stop Writing',
        blurb: 'The prince\'s administration has been ruled against once too often, and the letters '
          + 'about tithes and levies and men who have not turned up simply stop going out.',
      },
      schism: {
        name: 'A Rising Without a Government',
        blurb: 'Neither the schools nor the war office will own this. What is left is bands in the '
          + 'caves with nobody to send them anywhere, which is what the last year of it was.',
      },
    },
    crises: {
      hi: {
        id: 'finger',
        title: 'The Test at the Muster',
        text: 'The Nasi wants soldiers who will not run, and he has a test for it: a man who wishes '
          + 'to serve cuts off a finger. The sages come to him in a body about this — the maiming of '
          + 'the body is not the crown\'s to require, they say, and Israel will shortly have no '
          + 'whole men left to lay tefillin. The prince asks them, in front of his officers, what '
          + 'test they propose instead. It is not a rhetorical question and the room is very quiet.',
        options: [
          {
            label: 'The test stands',
            tooltip: 'What tradition records: y. Ta\'anit 4:8. +8% discipline this campaign is not '
              + 'offered — what it buys is the officers: the captains +18, the schools −22, the '
              + 'reading swings to the administration, −1 stability.',
            stability: -1, lo: 18, hi: -22, push: -3,
            flag: 'fingerTest',
            chronicle: 'The prince kept the maiming test at the muster, over the sages in a body.',
          },
          {
            label: 'Uproot a cedar instead',
            tooltip: 'The sages\' own counter-proposal, and the tradition says he took it. Costs 40 '
              + 'martial points. The schools +20, the captains −12, and the reading swings to the '
              + 'redemption.',
            cost: { mar: 40 }, hi: 20, lo: -12, push: 3,
            flag: 'cedarTest',
            chronicle: 'The maiming test was dropped for the sages\' own: a man who could uproot a cedar riding.',
          },
        ],
      },
      lo: {
        id: 'tithes',
        title: 'The Tithe in the Third Year of the Redemption',
        text: 'A letter comes up from the estate at Ein Gedi and it is about wheat. The Nasi\'s '
          + 'officers have taken the harvest for the army; the villagers have set aside the tithes '
          + 'first, as the Law requires, and there is now not enough of either. The sages hold that '
          + 'a war does not suspend the priestly dues. The quartermasters hold that the dues do not '
          + 'feed the men in the caves. Somebody has to sign something.',
        options: [
          {
            label: 'The army eats first',
            tooltip: 'Costs nothing and pays 100 talents in requisition. The captains +18, the '
              + 'schools −20, the reading swings to the administration — and every village learns '
              + 'what the redemption means in practice.',
            treasury: 100, lo: 18, hi: -20, push: -2,
            flag: 'tithesRequisitioned',
            chronicle: 'The tithes were requisitioned for the host, and the villages were told it was the redemption.',
          },
          {
            label: 'The dues are set aside first, and the army after',
            tooltip: 'Costs 50 governance and 60 talents of purchase. The schools +18, the captains '
              + '−14, and the reading swings to the redemption. The letters from Ein Gedi stop.',
            cost: { gov: 50, treasury: 60 }, hi: 18, lo: -14, push: 3,
            flag: 'tithesKept',
            chronicle: 'The priestly dues were set aside before the host\'s ration, by the Nasi\'s own order.',
          },
          {
            label: 'Let the officers and the sages settle it village by village',
            tooltip: 'No ruling. −4 legitimacy, both sides lose a little, and the same letter arrives '
              + 'again from a different estate next season.',
            legitimacy: -4, hi: -5, lo: -5,
            chronicle: 'The question of the tithes was left to be settled village by village, which it was not.',
          },
        ],
      },
    },
    rulings: [
      {
        id: 'eraFormula',
        name: 'The Date on the Documents',
        question: 'Are the deeds dated for the Redemption of Israel — or, more carefully, for the Freedom of Jerusalem?',
        source: 'The revolt\'s own coinage and the Murabba\'at deeds use both formulae. One of them '
          + 'is a claim about the age; the other is a claim about a city.',
        cost: { gov: 30 },
        hi: {
          label: 'Of the Redemption of Israel',
          name: 'The Years of the Redemption',
          text: 'A country that believes it: +8% morale, −0.5 unrest',
          effects: { moraleMult: 1.08, unrestAll: -0.5 },
          push: 3,
          blurb: 'Every contract signed in this country now says, in its first line, that the age has '
            + 'turned. It is the most powerful sentence available and it cannot be unsaid.',
        },
        lo: {
          label: 'Of the Freedom of Jerusalem',
          name: 'The Years of the Freedom',
          text: 'A claim that can survive a defeat: +0.25 legitimacy a month, +5% income',
          effects: { legitimacyAdd: 0.25, incomeMult: 1.05 },
          push: -3,
          blurb: 'The documents date from the freeing of a city, which is a fact, rather than from '
            + 'the redemption of the world, which is a wager. The prince\'s officers prefer facts.',
        },
      },
      {
        id: 'students',
        name: 'The Students of the Houses',
        question: 'Does the levy take the men of the academies, or does the study of the Law excuse them?',
        source: 'The tradition of Akiva\'s twenty-four thousand students, and what the same tradition '
          + 'says happened to them. The Nasi\'s letters do not exempt anybody.',
        cost: { mar: 35 },
        hi: {
          label: 'The houses keep their men',
          name: 'The Academies Exempt',
          text: 'What survives a defeat: −0.7 unrest, +0.2 legitimacy a month, −6% manpower',
          effects: { unrestAll: -0.7, legitimacyAdd: 0.2, manpowerMult: 0.94 },
          push: 3,
          blurb: 'The benches stay full while the country empties, on the argument that a nation '
            + 'which loses its war and keeps its schools has lost a war, and one which loses both '
            + 'has lost everything.',
        },
        lo: {
          label: 'Every man of age',
          name: 'The Levy Takes All',
          text: 'A nation in arms: +12% manpower, +5% reinforcement',
          effects: { manpowerMult: 1.12, reinforceMult: 1.05 },
          push: -3,
          blurb: 'The academies empty into the muster like everywhere else. There is no argument '
            + 'against it that survives the phrase "and who is to be exempt from the redemption".',
        },
      },
      {
        id: 'seventhYear',
        name: 'The Seventh Year, Under Arms',
        question: 'The sabbatical year has come and the land must rest. Does it rest, with a legion in Galilee?',
        source: 'The Bar Kokhba letters from the desert caves argue about tithes, produce and the '
          + 'sabbatical year in the middle of the war, because both were real at once.',
        cost: { gov: 40 },
        hi: {
          label: 'The land rests',
          name: 'The Year Kept in the War',
          text: 'The Law is not suspended for a war: −0.8 unrest, +0.2 legitimacy a month, −7% income',
          effects: { unrestAll: -0.8, legitimacyAdd: 0.2, incomeMult: 0.93 },
          push: 2,
          blurb: 'The fields lie fallow in the seventh year while the war goes on, because a rising '
            + 'that suspends the Law to win has already answered the question of what it was for.',
        },
        lo: {
          label: 'The land is sown',
          name: 'The Year Deferred',
          text: 'The host is fed: +10% income, +6% reinforcement, +0.5 unrest',
          effects: { incomeMult: 1.10, reinforceMult: 1.06, unrestAll: 0.5 },
          push: -2,
          blurb: 'The seventh year is deferred by the Nasi\'s order until the war is won. It feeds '
            + 'the army through a winter and it is quoted against him for as long as anyone '
            + 'remembers his name.',
        },
      },
      {
        id: 'altarNow',
        name: 'The Stones on the Mount',
        question: 'The Mount is ours and the stones are cut. Is the altar raised now, or stored until the war is won?',
        source: 'The revolt\'s tetradrachms show the Temple façade; the Maccabees stored the stones '
          + 'of the defiled altar "until a prophet should come" (1 Macc 4:46).',
        cost: { gov: 45, treasury: 80 },
        hi: {
          label: 'Raise it, by the Nasi\'s own hand',
          name: 'The Altar Raised',
          text: 'The age has turned: +10% morale, +0.3 legitimacy a month',
          effects: { moraleMult: 1.10, legitimacyAdd: 0.3 },
          push: 3,
          blurb: 'Fire on the Mount for the first time in sixty years, and a country that will now '
            + 'not be told this was only a war. Everything is staked on the next campaign.',
        },
        lo: {
          label: 'Store them, as the Maccabees stored them',
          name: 'The Stones Stored',
          text: 'Nothing risked that cannot be lost twice: +8% income, +0.25 legitimacy a month',
          effects: { incomeMult: 1.08, legitimacyAdd: 0.25 },
          push: -3,
          blurb: 'The stones go into the chamber to wait for a prophet, exactly as they did in Judas\' '
            + 'day. It is the cautious answer, it is the precedented answer, and the men in the '
            + 'caves did not come for either.',
        },
      },
      {
        id: 'prayer',
        name: 'Neither Help Us Nor Hinder Us',
        question: 'Does the prince ask heaven for the battle — or tell it to stand aside?',
        source: 'y. Ta\'anit 4:8 — "Lord of the Universe, neither help us nor hinder us", which the '
          + 'tradition preserves as the sentence that explains everything that followed.',
        cost: { infl: 30 },
        hi: {
          label: 'The schools bless the host',
          name: 'The Blessing Over the Host',
          text: 'An army that has been prayed over: +6% morale, −0.5 unrest',
          effects: { moraleMult: 1.06, unrestAll: -0.5 },
          push: 2,
          blurb: 'The sages go out to the muster and bless it, and the men march understanding '
            + 'themselves to be the instrument of something. It is worth several regiments and it '
            + 'puts the schools inside the war.',
        },
        lo: {
          label: 'The prince needs no help',
          name: 'A State That Asks Nobody',
          text: 'A war run by soldiers: +8% discipline, −6% cost of governing',
          effects: { disciplineMult: 1.08, adminMult: 0.94 },
          push: -2,
          blurb: 'The prayer, such as it is, asks heaven for nothing and warns it off. What is left '
            + 'is a competent army under a competent government, and a sentence the sages will '
            + 'quote for eighteen centuries.',
        },
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // 529 CE — the Samaritan chapter's own quarrel, which is not the Jewish one.
  // Baba Rabba, two centuries before this chapter opens, divided the land into
  // districts and set seven hakhamim over them — three of them laymen, in a
  // community whose whole constitution is its priesthood. That reform is the
  // Council of Seven this court seats, and the argument about it never closed.
  // ══════════════════════════════════════════════════════════════════════
  mountain_and_book: {
    id: 'mountain_and_book',
    title: 'The Mountain and the Book',
    hi: {
      seat: 'council',
      name: 'The Rule of the Seven',
      effects: { unrestAll: -1.0, integrateMult: 1.10, manpowerMult: 1.08, legitimacyAdd: -0.15 },
      text: '−1.0 unrest, +10% integration, +8% manpower, −0.15 legitimacy a month',
      blurb: 'Baba Rabba\'s arrangement, carried through: laymen teach, the districts govern '
        + 'themselves, and a small people holds together across every hill it lives on. The '
        + 'priesthood is a rite rather than a government, and says so.',
    },
    lo: {
      seat: 'priesthood',
      name: 'The Line of Aaron Unbroken',
      effects: { legitimacyAdd: 0.35, pilgrimMult: 1.15, unrestAll: 0.6, integrateMult: 0.94 },
      text: '+0.35 legitimacy a month, +15% from the mountain, +0.6 unrest, −6% integration',
      blurb: 'The high priesthood is the constitution, the reckoning of the feasts is the office\'s '
        + 'own secret, and Gerizim is where every question is answered. It is the oldest '
        + 'continuous thing this people has and it does not scale past the mountain.',
    },
    mid: 'The Seven sit and the priesthood teaches and nobody has said which of them the community '
      + 'is, which has been the arrangement since Baba Rabba and works until it is tested.',
    states: {
      concord: {
        name: 'The Mountain and the Districts Agree',
        blurb: 'The high priest and the Seven of one mind is what Baba Rabba built and what the '
          + 'community has been living off ever since.',
      },
      breachHi: {
        name: 'The Districts Go Quiet',
        blurb: 'The lay teachers have been ruled against and the villages that Baba Rabba\'s '
          + 'districts organized simply stop answering the summons.',
      },
      breachLo: {
        name: 'The Mountain Withholds the Reckoning',
        blurb: 'The priesthood has been ruled against and the one thing the office alone can do — '
          + 'compute the year and proclaim the feasts — is done late, and grudgingly, and once '
          + 'not at all.',
      },
      schism: {
        name: 'A People With Two Answers',
        blurb: 'Neither the mountain nor the Seven speaks for the community, which for a people this '
          + 'size is not a political crisis but an extinction risk.',
      },
    },
    crises: {
      hi: {
        id: 'reckoning',
        title: 'The Feast Is Proclaimed Late',
        text: 'The reckoning of the year belongs to the priesthood — the calculation is the office\'s '
          + 'own, taught from father to son, and it fixes every festival the community keeps. This '
          + 'year the proclamation does not come. Villages three days\' walk out have killed the '
          + 'Passover on the day their own elders reckoned; villages on the mountain have not. When '
          + 'the word finally comes down it is a different day, and half the people have already '
          + 'eaten. The Seven want the calculation written down and published. The high priest has '
          + 'not said no; he has said nothing.',
        options: [
          {
            label: 'The reckoning is published',
            tooltip: 'Costs 45 governance. The Seven +20, the priesthood −18, the reading swings to '
              + 'the districts — and no village ever keeps the wrong Passover again.',
            cost: { gov: 45 }, hi: 20, lo: -18, push: 3,
            flag: 'reckoningPublished',
            chronicle: 'The reckoning of the feasts was written out and published to the districts.',
          },
          {
            label: 'The office keeps its own',
            tooltip: 'Costs 30 influence in apologies to the districts. The priesthood +20, the Seven '
              + '−16, the reading swings to the mountain, and the outer villages keep guessing.',
            cost: { infl: 30 }, lo: 20, hi: -16, push: -3,
            flag: 'reckoningKept',
            chronicle: 'The reckoning stayed the priesthood\'s own, and the far villages went on guessing.',
          },
          {
            label: 'Say nothing and keep two Passovers',
            tooltip: 'The community keeps the festival on two days this year. −6 legitimacy, −1 '
              + 'stability, and both parties note that the crown would not decide.',
            legitimacy: -6, stability: -1, hi: -6, lo: -6,
            chronicle: 'The Passover was kept on two days that year, in one community, on one mountain.',
          },
        ],
      },
      lo: {
        id: 'taheb',
        title: 'A Man Comes Down From the Mountain',
        text: 'He is from one of the hill villages and he has been on Gerizim for forty days, and he '
          + 'is saying the thing nobody says out loud: that the Taheb has come, that the vessels '
          + 'hidden since Uzzi will be uncovered, and that the community should go up armed and wait '
          + 'for the mountain to answer. The priesthood wants him silenced before the Byzantines '
          + 'hear of it. The Seven point out that half the villages have already gone up.',
        options: [
          {
            label: 'Proclaim him, and go up the mountain',
            tooltip: '+10% morale is not the point — the point is that everything is now staked on '
              + 'the mountain answering. The Seven +18, the priesthood −22, +8 legitimacy now, and '
              + 'the reading swings to the districts.',
            legitimacy: 8, hi: 18, lo: -22, push: 3,
            flag: 'tahebProclaimed',
            chronicle: 'The Restorer was proclaimed on Gerizim and the community went up armed to wait.',
          },
          {
            label: 'The priesthood silences him',
            tooltip: 'Costs 40 governance. The priesthood +20, the Seven −16, the reading swings to '
              + 'the mountain — and the villages that had already gone up come down in silence.',
            cost: { gov: 40 }, lo: 20, hi: -16, push: -3,
            flag: 'tahebSilenced',
            chronicle: 'The man from the hill villages was silenced, and the community came down off the mountain.',
          },
          {
            label: 'Let him speak and commit to nothing',
            tooltip: 'He keeps preaching and the crown keeps its distance. −5 legitimacy, and the '
              + 'Byzantines hear about it from somebody else.',
            legitimacy: -5, hi: -4, lo: -6,
            chronicle: 'The preacher on Gerizim was neither proclaimed nor silenced, and the news travelled anyway.',
          },
        ],
      },
    },
    rulings: [
      {
        id: 'sevenSages',
        name: 'Baba Rabba\'s Seven',
        question: 'Three of the seven hakhamim are laymen. Do laymen go on teaching the Law in this community?',
        source: 'The Samaritan chronicles (Abu\'l-Fath; the Tolidah) on Baba Rabba\'s reform: seven '
          + 'sages over the districts, four priests and three laymen.',
        cost: { gov: 40 },
        hi: {
          label: 'The three keep their seats',
          name: 'Laymen at the Bench',
          text: 'Teaching where the priests are not: −0.7 unrest, +8% integration',
          effects: { unrestAll: -0.7, integrateMult: 1.08 },
          push: 3,
          blurb: 'A community of a few tens of thousands, spread over hills a soldier can ride '
            + 'between in a day, is taught by whoever can teach — which is Baba Rabba\'s whole '
            + 'point and the reason there is still a community.',
        },
        lo: {
          label: 'Only the sons of Aaron teach',
          name: 'The Priesthood Alone Teaches',
          text: 'One authority, undivided: +0.25 legitimacy a month, +10% from the mountain',
          effects: { legitimacyAdd: 0.25, pilgrimMult: 1.10 },
          push: -3,
          blurb: 'The seats go back to the courses. What the community loses in reach it gains in '
            + 'never once being uncertain who speaks for it.',
        },
      },
      {
        id: 'synagogues',
        name: 'The Synagogues Below the Mountain',
        question: 'The summit carries a church and a garrison. May the community pray facing Gerizim rather than upon it?',
        source: 'Zeno built the Church of Mary Theotokos on the summit in 484 and the community was '
          + 'kept off it; the surviving Samaritan synagogues are all oriented on the mountain.',
        cost: { infl: 35 },
        hi: {
          label: 'A synagogue in every village, facing the mountain',
          name: 'Facing Gerizim',
          text: 'The rite survives the summit: −0.8 unrest, +6% growth',
          effects: { unrestAll: -0.8, growthMult: 1.06 },
          push: 3,
          blurb: 'If the mountain cannot be climbed it can be faced, and a people that can pray in '
            + 'its own villages is a people that can lose the summit and go on existing.',
        },
        lo: {
          label: 'On the mountain or nowhere',
          name: 'The Summit or Nothing',
          text: 'The claim is never conceded: +0.3 legitimacy a month, +12% from the mountain, +0.5 unrest',
          effects: { legitimacyAdd: 0.3, pilgrimMult: 1.12, unrestAll: 0.5 },
          push: -3,
          blurb: 'The place the Law names is the place, and a substitute for it is a concession that '
            + 'the summit is theirs. The community goes up when it can and grieves when it cannot.',
        },
      },
      {
        id: 'dositheans',
        name: 'The Returning Sect',
        question: 'The followers of Dositheus kept their own calendar and their own book. Are they received back?',
        source: 'The Samaritan sectarian movements are attested from the first century to the tenth; '
          + 'the chronicles treat their reabsorption as a recurring and unresolved question.',
        cost: { infl: 30 },
        hi: {
          label: 'Received, and their reckoning forgiven',
          name: 'The Sect Received',
          text: 'A small people made larger: +8% manpower, +5% growth',
          effects: { manpowerMult: 1.08, growthMult: 1.05 },
          push: 2,
          blurb: 'They are taken back with their errors unrenounced, because a community this size '
            + 'counts men before it counts opinions.',
        },
        lo: {
          label: 'Not until they keep our year',
          name: 'The Sect Held Out',
          text: 'One reckoning or none: +0.2 legitimacy a month, −0.5 unrest',
          effects: { legitimacyAdd: 0.2, unrestAll: -0.5 },
          push: -2,
          blurb: 'A people defined entirely by keeping one book and one mountain cannot take back '
            + 'men who keep neither, however few are left of either party.',
        },
      },
      {
        id: 'abisha',
        name: 'The Scroll of Abisha',
        question: 'Is the ancient scroll brought down and read to the villages — or does it never leave the mountain?',
        source: 'The Abisha Scroll, the community\'s most sacred object, claimed as written by '
          + 'Aaron\'s great-grandson in the thirteenth year of the settlement of Canaan.',
        cost: { gov: 25, infl: 20 },
        needsTemple: true,
        hi: {
          label: 'Carry it to the districts',
          name: 'The Scroll Carried Down',
          text: 'Every village sees it once: −0.6 unrest, +8% manpower',
          effects: { unrestAll: -0.6, manpowerMult: 1.08 },
          push: 2,
          blurb: 'The scroll goes out to the hill villages under guard, and men who will never climb '
            + 'the mountain in safety see the thing the mountain is about.',
        },
        lo: {
          label: 'It stays where it has always stayed',
          name: 'The Scroll on the Mountain',
          text: 'The holy thing in the holy place: +0.3 legitimacy a month, +12% from the mountain',
          effects: { legitimacyAdd: 0.3, pilgrimMult: 1.12 },
          push: -2,
          blurb: 'It does not travel. Whoever wants to see it comes up, which is what coming up is '
            + 'for, and which the priesthood observes has kept it safe for fifteen centuries.',
        },
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // 614 CE — Jerusalem is taken and the Mount is clear for the first time in
  // five hundred years, and the two authorities that governed Jewish life in
  // the meantime both arrive to find out what happens now. The exilarch's
  // house has a Davidic pedigree and the academies of Babylonia behind it; the
  // priests of the Mount have genealogies, the courses in order, and the one
  // argument nobody can answer, which is that the altar is right there.
  // ══════════════════════════════════════════════════════════════════════
  altar_and_academy: {
    id: 'altar_and_academy',
    title: 'The Altar and the Academy',
    hi: {
      seat: 'exilarch',
      name: 'The Rule of the Academies',
      effects: { adminMult: 0.90, integrateMult: 1.12, incomeMult: 1.06, pilgrimMult: 0.90 },
      text: '−10% cost of governing, +12% integration, +6% income, −10% from the Mount',
      blurb: 'Five centuries of law made without a Temple turn out to be a working constitution: '
        + 'courts, contracts, a calendar that needs no observer, and a diaspora that already '
        + 'obeys it. What it cannot do is make the Mount matter.',
    },
    lo: {
      seat: 'priests',
      name: 'The Rule of the Restored Altar',
      effects: { pilgrimMult: 1.30, legitimacyAdd: 0.35, unrestAll: 0.7, adminMult: 1.08 },
      text: '+30% from the Mount, +0.35 legitimacy a month, +0.7 unrest, +8% cost of governing',
      blurb: 'The fire is lit and the courses serve, and every Jew alive knows what year this is. '
        + 'It also means half the law of the last five hundred years is now provisional, and the '
        + 'men who wrote it are in the room.',
    },
    mid: 'The Mount is ours and nobody has said what is to stand on it, which suits the academies '
      + 'and does not suit anyone who walked here from Babylonia to see the fire lit.',
    states: {
      concord: {
        name: 'The Exilarch Stands at the Altar',
        blurb: 'The house of David and the courses of Aaron in one government — the arrangement '
          + 'every restoration text in five centuries assumes and none of them explains.',
      },
      breachHi: {
        name: 'Babylonia Stops Sending',
        blurb: 'The academies have been ruled against, and the money, the men and the legal opinions '
          + 'that came up the road from Sura and Pumbedita come up it more slowly every year.',
      },
      breachLo: {
        name: 'The Courses Stand Down',
        blurb: 'The priests have been ruled against and the daily service is kept by whoever is '
          + 'willing, which the pilgrims can tell at a glance.',
      },
      schism: {
        name: 'A Restoration Nobody Owns',
        blurb: 'Neither the academies nor the altar will answer for this. What is left is a city '
          + 'held by a garrison on a Persian permit, which is what it was in the first place.',
      },
    },
    crises: {
      hi: {
        id: 'firstFire',
        title: 'The Morning They Would Light It',
        text: 'The wood is stacked, the courses are in order by lot as they were, and there is a man '
          + 'in the vestments whose genealogy has been read out three times. What there is not, and '
          + 'cannot be, is the ash of a red heifer — there has not been one for five hundred years, '
          + 'and without it nobody standing on that platform is clean, and everything done there is '
          + 'done in ritual impurity. The academies have written this out at length. The priests '
          + 'answer that the Law was given to be kept, that impurity is set aside for the community, '
          + 'and that the fire will be lit at dawn unless somebody with authority stops it.',
        options: [
          {
            label: 'Let it be lit',
            tooltip: 'Costs 60 governance and 100 talents. The priests +22, the academies −24, +10 '
              + 'legitimacy, and the reading swings hard to the altar. Every Jew in the world hears '
              + 'about this within the year.',
            cost: { gov: 60, treasury: 100 }, legitimacy: 10, lo: 22, hi: -24, push: -3,
            flag: 'altarFireLit',
            chronicle: 'The fire was lit on the Mount at dawn, ashes or no ashes.',
          },
          {
            label: 'Not until the Law can be kept',
            tooltip: 'Costs 40 influence. The academies +20, the priests −22, and the reading swings '
              + 'to the schools. The wood is taken down and stacked in the chamber.',
            cost: { infl: 40 }, hi: 20, lo: -22, push: 3,
            flag: 'altarDeferredPurity',
            chronicle: 'The altar was left unlit for want of a red heifer, by ruling of the academies.',
          },
          {
            label: 'Let them offer, and record that it was irregular',
            tooltip: 'The clerk\'s answer, and everyone will read the record. −4 legitimacy, both '
              + 'sides shift a little, and the question comes back every festival.',
            legitimacy: -4, hi: -6, lo: -6,
            chronicle: 'The offering was made and minuted as irregular, which satisfied the minute-taker.',
          },
        ],
      },
      lo: {
        id: 'twoCalendars',
        title: 'The Year Proclaimed Twice',
        text: 'The academies compute the year — they have done for generations, on a calculation that '
          + 'needs no witnesses and no mountain, and the whole dispersion keeps their dates. The '
          + 'court of the Land has begun proclaiming the new moon again from Jerusalem, on '
          + 'observation, as it was done when there was a court here to do it. This spring the two '
          + 'differ by a day. The Passover of the Land and the Passover of Babylonia fall on '
          + 'different nights, and both are certain, and the letters are already going out.',
        options: [
          {
            label: 'The Land proclaims; the dispersion follows',
            tooltip: 'Costs 50 influence in couriers and quarrels. The priests +18, the academies '
              + '−20, +6 legitimacy, and the reading swings to the altar. Babylonia will not like it.',
            cost: { infl: 50 }, legitimacy: 6, lo: 18, hi: -20, push: -3,
            flag: 'landProclaims',
            chronicle: 'The new moon was proclaimed again from Jerusalem, and the dispersion was told to follow.',
          },
          {
            label: 'The calculation stands, here as everywhere',
            tooltip: 'Costs 30 governance. The academies +20, the priests −16, and the reading swings '
              + 'to them — one calendar from Spain to the Oxus, computed and unarguable.',
            cost: { gov: 30 }, hi: 20, lo: -16, push: 3,
            flag: 'calculationStands',
            chronicle: 'The reckoned calendar was kept in the Land too, and the courts stopped watching the sky.',
          },
        ],
      },
    },
    rulings: [
      {
        id: 'sacrificeResumes',
        name: 'Whether the Service Resumes',
        question: 'The Mount is clear. Does the daily offering begin again — with no ashes of the heifer and no proven line?',
        source: 'The purity problem is real and unresolved: Numbers 19 requires the ashes, and there '
          + 'had not been a red heifer since the destruction. Every restoration since has met it.',
        cost: { gov: 45, treasury: 60 },
        hi: {
          label: 'Not until the Law can be kept',
          name: 'The Service Deferred',
          text: 'The law of five centuries governs: −10% cost of governing, +8% integration',
          effects: { adminMult: 0.90, integrateMult: 1.08 },
          push: 3,
          blurb: 'The academies rule that an offering made in impurity is not an offering, and the '
            + 'Mount stays a building site. The law that was made without a Temple goes on being '
            + 'the law.',
        },
        lo: {
          label: 'The service begins',
          name: 'The Daily Offering Restored',
          text: 'Fire on the Mount: +25% from the Mount, +0.3 legitimacy a month',
          effects: { pilgrimMult: 1.25, legitimacyAdd: 0.3 },
          push: -3,
          blurb: 'Twice a day, on the platform, for the first time since Titus. Whatever else is '
            + 'unresolved, no Jew who sees it will call this anything but the restoration.',
        },
      },
      {
        id: 'reckoned',
        name: 'The Reckoned Year',
        question: 'Is the calendar computed, as Babylonia computes it — or proclaimed from a court in the Land?',
        source: 'The fixed calculation and the observed new moon were both in use; the collision '
          + 'between the Land and Babylonia over who proclaims is the oldest live quarrel between '
          + 'the two centres.',
        cost: { gov: 35 },
        hi: {
          label: 'Computed, and the same everywhere',
          name: 'One Calendar to the Oxus',
          text: 'The dispersion keeps our dates: +8% income, −6% cost of governing',
          effects: { incomeMult: 1.08, adminMult: 0.94 },
          push: 2,
          blurb: 'A calculation that needs no witness works in Spain and in Merv on the same night. '
            + 'It also makes the Land one community among many rather than the one that decides.',
        },
        lo: {
          label: 'Proclaimed, from here',
          name: 'The Month Proclaimed From Zion',
          text: 'The centre is a place again: +0.3 legitimacy a month, +12% from the Mount',
          effects: { legitimacyAdd: 0.3, pilgrimMult: 1.12 },
          push: -2,
          blurb: 'Witnesses come before a court in Jerusalem and the court sanctifies the month, as '
            + 'it did. The dispersion is told, rather than consulted, which is the point.',
        },
      },
      {
        id: 'courses',
        name: 'The Twenty-Four Courses',
        question: 'The lists of the priestly courses survived on synagogue walls. Are they reconstituted?',
        source: 'The courses are listed in inscriptions from Caesarea and in the liturgical poets; '
          + 'the memory of which family served in which week outlived the Temple by centuries.',
        cost: { gov: 30, infl: 20 },
        hi: {
          label: 'The lists are a memory, not a roster',
          name: 'No Roster of Aaron',
          text: 'One order of authority: −8% cost of governing, +6% integration',
          effects: { adminMult: 0.92, integrateMult: 1.06 },
          push: 2,
          blurb: 'A genealogy nobody can check is not a qualification, and a restored realm does not '
            + 'need a second aristocracy with a claim older than the crown\'s.',
        },
        lo: {
          label: 'The courses serve again, by lot and by week',
          name: 'The Courses Restored',
          text: 'The old order back in its weeks: +15% from the Mount, +0.2 legitimacy a month',
          effects: { pilgrimMult: 1.15, legitimacyAdd: 0.2 },
          push: -2,
          blurb: 'Jehoiarib in the first week and Jedaiah in the second, as the lists say, and the '
            + 'families that kept those names through five centuries of nothing are vindicated.',
        },
      },
      {
        id: 'exilarchsWrit',
        name: 'The Exilarch\'s Writ',
        question: 'Does a house that governed the dispersion from Babylonia govern the Land it has returned to?',
        source: 'The exilarchate claimed Davidic descent and real jurisdiction over Babylonian Jewry; '
          + 'the Palestinian centre never conceded that it extended west of the Euphrates.',
        cost: { gov: 45 },
        hi: {
          label: 'The writ runs here as it ran there',
          name: 'The Exilarchate in Zion',
          text: 'A government with five centuries of practice: −10% cost of governing, +10% integration',
          effects: { adminMult: 0.90, integrateMult: 1.10 },
          push: 3,
          blurb: 'The house of the exile brings its courts, its appointments and its tax farm west '
            + 'with it, and the Land is administered by the only Jewish government that has been '
            + 'continuously administering anything.',
        },
        lo: {
          label: 'The Land governs itself',
          name: 'The Land Is Not a Province',
          text: 'Authority where the Mount is: +0.3 legitimacy a month, +10% from the Mount',
          effects: { legitimacyAdd: 0.3, pilgrimMult: 1.10 },
          push: -3,
          blurb: 'Whatever the exilarch is in Babylonia, he is a distinguished returning exile here. '
            + 'The Land has an altar and does not need a viceroy.',
        },
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════
  // 1948 — the quarrel this chapter cannot avoid and had no seat for. On
  // 19 June 1947 Ben-Gurion, Fishman and Greenbaum wrote to Agudat Yisrael
  // promising four things: the sabbath as the state's day of rest, kashrut in
  // state kitchens, rabbinical jurisdiction in marriage, and autonomy for the
  // religious schools. That letter is the constitution nobody wrote, and the
  // exemption of yeshiva students from conscription was agreed the same year,
  // for four hundred men, while the state was fighting for its life.
  // ══════════════════════════════════════════════════════════════════════
  status_quo: {
    id: 'status_quo',
    title: 'The Status Quo',
    hi: {
      seat: 'kibbutzim',
      name: 'A State Like the Others',
      effects: { manpowerMult: 1.12, growthMult: 1.10, adminMult: 0.90, unrestAll: 0.9 },
      text: '+12% manpower, +10% growth, −10% cost of governing, +0.9 unrest',
      blurb: 'One law, one register, one conscription, and the buses run on Saturday. It is a '
        + 'modern state and it works like one — and a quarter of the country experiences it as '
        + 'something being done to them.',
    },
    lo: {
      seat: 'rabbinate',
      name: 'A Jewish State',
      effects: { unrestAll: -1.1, legitimacyAdd: 0.3, manpowerMult: 0.90, growthMult: 0.95 },
      text: '−1.1 unrest, +0.3 legitimacy a month, −10% manpower, −5% growth',
      blurb: 'The sabbath is the day of rest, the courts of personal status are rabbinical, and the '
        + 'men of the yeshivot are not called up. The country is at peace with itself about what '
        + 'it is, and it fields fewer soldiers and builds more slowly.',
    },
    mid: 'The letter of June has been signed and nothing has been legislated, which is exactly the '
      + 'arrangement it was designed to produce and cannot survive a real question.',
    states: {
      concord: {
        name: 'The Coalition Holds',
        blurb: 'The religious parties and the labour movement in the same cabinet, neither pushing. '
          + 'It is not agreement — it is a working truce, and the state was built inside it.',
      },
      breachHi: {
        name: 'The Yeshivot Turn Their Backs',
        blurb: 'The state has legislated where it promised not to, and a quarter of the country has '
          + 'stopped regarding its institutions as theirs.',
      },
      breachLo: {
        name: 'The Movement Will Not Be Governed by Rabbis',
        blurb: 'The state has conceded where the founders said it never would, and the kibbutzim and '
          + 'the unions that built the country are asking what exactly they built.',
      },
      schism: {
        name: 'Two Peoples, One Passport',
        blurb: 'Nobody owns the arrangement any more. This is the argument the state postponed in '
          + 'June 1947 arriving all at once, in a country that is still at war.',
      },
    },
    stateEffects: {
      // No Temple, no ascents: the shared breach and schism lines charge
      // `pilgrimMult`, which in 1948 would be a penalty on an income stream
      // that does not exist and a line of panel text about a mountain nobody
      // is climbing. Both are re-pointed at things this chapter actually has.
      breachLo: { incomeMult: 0.85, growthMult: 0.92, reinforceMult: 0.90 },
      schism: { unrestAll: 1.5, legitimacyAdd: -0.4, incomeMult: 0.92, manpowerMult: 0.94 },
    },
    stateText: {
      breachLo: '−15% income, −8% growth, −10% reinforcement',
      schism: '+1.5 unrest, −0.4 legitimacy a month, −8% income, −6% manpower',
    },
    crises: {
      hi: {
        id: 'exemption',
        title: 'The Four Hundred',
        text: 'The heads of the yeshivot have come to the Prime Minister, and the request is small '
          + 'and enormous at once: the men whose whole occupation is the study of the Law should '
          + 'not be conscripted. Four hundred of them. The world that produced those men was '
          + 'murdered three years ago and what is in these rooms is the whole of what is left. The '
          + 'General Staff observes that there are brigades short of riflemen this month, that the '
          + 'kibbutzim have buried a generation, and that four hundred is a number which has never '
          + 'in the history of any state stayed four hundred.',
        options: [
          {
            label: 'Torato umanuto — grant the exemption',
            tooltip: 'What was granted. −6% manpower is the least of it: the religious bloc +22, the '
              + 'movement −20, the reading swings to them, and the number does not stay four hundred.',
            hi: -20, lo: 22, push: -3,
            flag: 'yeshivaExemption',
            chronicle: 'The students of the yeshivot were exempted from conscription — four hundred of them, to begin with.',
          },
          {
            label: 'Every man serves',
            tooltip: 'Costs 50 governance to force through the cabinet. The movement +20, the '
              + 'religious bloc −22, +8% manpower in effect, and the reading swings to the state.',
            cost: { gov: 50 }, hi: 20, lo: -22, push: 3,
            flag: 'noExemption',
            chronicle: 'The conscription law was passed without exemption, and the religious parties left the room.',
          },
          {
            label: 'Defer it to the first Knesset',
            tooltip: 'The classic answer. −4 legitimacy, both sides lose a little, and the question '
              + 'is inherited by everyone who comes after.',
            legitimacy: -4, hi: -5, lo: -5,
            chronicle: 'The question of the students was deferred to the first Knesset, and then to the next.',
          },
        ],
      },
      lo: {
        id: 'sabbathPort',
        title: 'The Port on Saturday',
        text: 'There is a ship at Haifa with immigrants aboard and another behind it, the sheds are '
          + 'full, and the port authority wants to work through Saturday. The religious parties '
          + 'point at the letter of June, which says in its first clause that the sabbath is the '
          + 'day of rest of the Jewish state, and which was the price of their signature on '
          + 'everything else. The port director points at the ships. Both of them are talking about '
          + 'Jews who have nowhere else to go.',
        options: [
          {
            label: 'The port works',
            tooltip: '+120 talents and the ships clear — the movement +18 — but the religious bloc '
              + 'goes to the floor (−22) and the reading swings to the state. The letter of June is '
              + 'now a letter.',
            treasury: 120, hi: 18, lo: -22, push: 3,
            flag: 'portWorksSabbath',
            chronicle: 'The port worked through the sabbath, and the letter of June became a letter.',
          },
          {
            label: 'The country stops',
            tooltip: 'Costs 60 talents in demurrage and delay. The religious bloc +20, the movement '
              + '−14, and the reading swings to them. The ships wait until sundown.',
            cost: { treasury: 60 }, lo: 20, hi: -14, push: -3,
            flag: 'sabbathKept',
            chronicle: 'The ships waited at Haifa until sundown, as the letter of June said they would.',
          },
          {
            label: 'Non-Jewish crews work the sheds',
            tooltip: 'The lawyer\'s answer and everybody knows it. −3 legitimacy, small shifts, and '
              + 'the same ship arrives next Saturday.',
            legitimacy: -3, hi: -4, lo: -4,
            chronicle: 'The sheds were worked on the sabbath by crews the letter did not cover.',
          },
        ],
      },
    },
    rulings: [
      {
        id: 'statusQuoLetter',
        name: 'The Letter of June',
        question: 'Are the four undertakings — the sabbath, the kitchens, the marriage courts, the schools — written into the state?',
        source: 'Ben-Gurion, Fishman and Greenbaum to Agudat Yisrael, 19 June 1947: the status quo '
          + 'letter, which is the closest thing the state has to a constitution on this question.',
        cost: { gov: 40 },
        hi: {
          label: 'The state legislates for itself',
          name: 'One Law for the Republic',
          text: 'A state that governs its own affairs: −8% cost of governing, +6% growth',
          effects: { adminMult: 0.92, growthMult: 1.06 },
          push: 3,
          blurb: 'The undertakings are treated as what they were — a wartime political letter — and '
            + 'the Knesset legislates. It is coherent, it is modern, and it costs the coalition '
            + 'the parties that signed it.',
        },
        lo: {
          label: 'The four undertakings are kept',
          name: 'The Status Quo',
          text: 'The arrangement holds: −0.9 unrest, +0.25 legitimacy a month',
          effects: { unrestAll: -0.9, legitimacyAdd: 0.25 },
          push: -3,
          blurb: 'The sabbath is the day of rest, the state kitchens are kosher, marriage is '
            + 'rabbinical and the religious schools run themselves. Nothing is settled and '
            + 'everything is workable, which was the entire design.',
        },
      },
      {
        id: 'whoIsAJew',
        name: 'Who Is a Jew',
        question: 'The register asks for nationality. Does the clerk write what the applicant says, or what the Rabbinate says?',
        source: 'The Law of Return and the population registry collided almost immediately; the '
          + 'question of who the state counts has never since been out of its politics.',
        cost: { gov: 35, infl: 20 },
        hi: {
          label: 'The state keeps its own register',
          name: 'The State Decides Whom It Admits',
          text: 'Every arrival counts: +8% growth, +6% manpower',
          effects: { growthMult: 1.08, manpowerMult: 1.06 },
          push: 2,
          blurb: 'A state whose founding law is a right of return cannot let another body decide who '
            + 'may return, and the register admits everyone the law admits.',
        },
        lo: {
          label: 'The Rabbinate answers the question',
          name: 'One Definition, and an Old One',
          text: 'No argument about what the country is: −0.7 unrest, +0.2 legitimacy a month',
          effects: { unrestAll: -0.7, legitimacyAdd: 0.2 },
          push: -2,
          blurb: 'The question is answered where it has been answered for two thousand years, which '
            + 'keeps the country one people at the price of turning some of its citizens away at '
            + 'the counter.',
        },
      },
      {
        id: 'marriageCourts',
        name: 'The Courts of Personal Status',
        question: 'Marriage, divorce and burial — a civil registrar, or the rabbinical courts?',
        source: 'The Ottoman millet system handed personal status to religious courts; the state '
          + 'inherited the arrangement and the status quo letter confirmed it.',
        cost: { gov: 30 },
        hi: {
          label: 'A civil registrar',
          name: 'Civil Marriage',
          text: 'The state serves all its citizens: +6% growth, −6% cost of governing',
          effects: { growthMult: 1.06, adminMult: 0.94 },
          push: 2,
          blurb: 'Anyone may marry anyone at a counter, which is what a republic is for, and which '
            + 'ends a jurisdiction the religious parties consider the last one that matters.',
        },
        lo: {
          label: 'The rabbinical courts',
          name: 'The Courts of the Millet',
          text: 'The arrangement of centuries kept: −0.6 unrest, +0.2 legitimacy a month',
          effects: { unrestAll: -0.6, legitimacyAdd: 0.2 },
          push: -2,
          blurb: 'Personal status stays where the Ottomans left it and where the letter of June put '
            + 'it. It is the single most consequential of the four undertakings and the one that '
            + 'reaches every family in the country.',
        },
      },
      {
        id: 'sabbathPublic',
        name: 'The Sabbath in the Public Square',
        question: 'Do the buses run, the cafés open and the airline fly on Saturday?',
        source: 'The first clause of the status quo letter; the arrangements differed city by city '
          + 'from the beginning, which is how they survived.',
        cost: { infl: 30 },
        hi: {
          label: 'The country moves',
          name: 'A Seven-Day Country',
          text: 'Nothing stops: +8% income, +5% growth',
          effects: { incomeMult: 1.08, growthMult: 1.05 },
          push: 2,
          blurb: 'Buses, ports and aircraft on Saturday like anywhere else. The economy notices '
            + 'immediately and so does every neighbourhood that did not want to hear them.',
        },
        lo: {
          label: 'The country stops',
          name: 'The Day of Rest',
          text: 'One day the whole state keeps: −0.8 unrest, +0.15 legitimacy a month, −5% income',
          effects: { unrestAll: -0.8, legitimacyAdd: 0.15, incomeMult: 0.95 },
          push: -2,
          blurb: 'From sundown to sundown the state does not run, which costs it a seventh of '
            + 'everything and buys it the only weekly demonstration it has that this is a Jewish '
            + 'state and not merely a state of Jews.',
        },
      },
      {
        id: 'holyPlaces',
        name: 'The Holy Places',
        question: 'The shrines are in the state\'s hands. Does a ministry administer them, or the Rabbinate?',
        source: 'The armistice left the Wall on the other side of the line; everything else — Meron, '
          + 'the tombs, the Galilee shrines — had to be assigned to somebody at once.',
        cost: { gov: 25, treasury: 40 },
        hi: {
          label: 'A ministry, and a budget',
          name: 'The Shrines Administered',
          text: 'Sites the state runs and shows: +8% income, −5% cost of governing',
          effects: { incomeMult: 1.08, adminMult: 0.95 },
          push: 2,
          blurb: 'The holy places become a portfolio with a line in the budget, which is how they '
            + 'get roads, guards and visitors, and which the devout regard as filing the sacred '
            + 'under public works.',
        },
        lo: {
          label: 'The Rabbinate holds them',
          name: 'The Shrines in Religious Hands',
          text: 'The sacred is not a portfolio: −0.6 unrest, +0.25 legitimacy a month',
          effects: { unrestAll: -0.6, legitimacyAdd: 0.25 },
          push: -2,
          blurb: 'The places are administered by the authority whose whole business they are, which '
            + 'settles a question that could otherwise be reopened at every change of government.',
        },
      },
    ],
  },
};

// The default quarrel for a court that seats the Hasmonean pair without its
// bookmark saying so — the two chapters §190 shipped for, kept working without
// an edit to either of them.
export const DEFAULT_QUARREL = 'sages_and_houses';

