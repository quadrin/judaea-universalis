// Judaea Universalis — the years the chain skips: 33 BCE – 48 CE (SPEC §240).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// The chapter of the crown has fifty-five dated cards and forty-nine of them
// fall before Herod dies. After that it runs another seventy years on six —
// the province, the census, Teutoburg, the procurators, Caligula's statue and
// the spring of sixty-six — which leaves the whole Julio-Claudian century as
// a corridor a campaign walks down in silence.
//
// This file seats the corridor. Half of it is the reign itself at the places
// the scripted chain steps over: the games and the trophies, the oath six
// thousand men refused, the tomb opened for money, the ring of fortresses,
// and the sums spent on cities that were not his. The other half is the
// seventy years afterwards, which contain the two things that decide what the
// next chapter is about — a city built on a graveyard, and a charter from an
// emperor who had been raised with a Jewish king.
//
// Sources: Josephus, Antiquities XV–XX and War I–II, for the games, the oath,
// the tomb, the fortresses, the foreign benefactions, Tiberias and the
// Passover riot; Tacitus, Annals II.85, for the four thousand sent to
// Sardinia; Josephus XIX for the edict of Claudius and XX for the famine
// relief of Queen Helena.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_40bce_years] ' + key, e || '');
}

function guard(key, fn) {
  return function (ctx) {
    try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); }
  };
}

// Addressed to whoever holds the crown in this chapter — Herod, the last
// Hasmonean, or the house beyond the Tigris — so the modifiers land on the
// chair that answered the card.
function P(ctx) { return ctx.game.playerTag; }

function mod(ctx, id, name, effects, months) {
  ctx.helpers.addTagModifier(ctx, P(ctx), {
    id, name, months: Number.isFinite(months) ? months : -1, effects,
  });
}

export const EVENTS_40_YEARS = [

  // ── 33 BCE ─────────────────────────────────────────────────────────────────
  {
    id: 'ev40y_the_games_and_the_trophies',
    title: 'The Games and the Trophies',
    desc: 'The proposal is a five-yearly festival: a theatre, an amphitheatre, chariots, '
      + 'wrestlers, beasts brought in at enormous cost, prizes that will draw competitors '
      + 'from three provinces, and the whole thing dedicated to Caesar. It would put the '
      + 'country on the circuit of the eastern world and it would cost about what a war costs.'
      + '\n\n'
      + 'The objection, when it comes, is not about the money or the nakedness or the beasts. '
      + 'It is about the trophies — the panoplies of captured armour set up around the '
      + 'stadium — which the crowd has decided are images of men, and which therefore may not '
      + 'stand. Strip one down in front of witnesses and it is a frame with armour hung on '
      + 'it, and the crowd laughs, and the objection collapses. Ten men have already sworn to '
      + 'kill whoever authorised it, and they do not laugh, and they are caught with the '
      + 'daggers on them.',
    forTag: 'player',
    date: { y: -33, m: 9 },
    aiOption: 1,
    historical: 'Herod\'s games provoked the trophy controversy and a plot by ten men who were taken with daggers in the theatre. He built the festival anyway.',
    options: [
      {
        label: 'Hold the games and strip a trophy in public',
        tooltip: '−70 talents: +12 influence points and "The Games of Caesar" (+8% income, +5% trade) for twelve years, with +0.8 unrest everywhere for four while the argument runs its course.',
        effects: guard('games:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -70, infl: 12 });
          mod(ctx, 'games_of_caesar', 'The Games of Caesar', { incomeMult: 1.08, tradeMult: 1.05, unrestAll: 0.8 }, 144);
          h.chronicle(ctx, 'era', 'The games are held and a trophy is taken apart in front of '
            + 'the crowd to show the frame inside. Most of the crowd laughs. Ten men are '
            + 'arrested with knives.');
        }),
      },
      {
        label: 'Hold them, and take the trophies down first',
        tooltip: '−55 talents and a smaller festival: +8 influence points, +5 legitimacy, and "The Games Without Images" (+5% income, −0.3 unrest everywhere) for twelve years.',
        effects: guard('games:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, infl: 8, legitimacy: 5 });
          mod(ctx, 'games_without_images', 'The Games Without Images', { incomeMult: 1.05, unrestAll: -0.3 }, 144);
          h.chronicle(ctx, 'era', 'The trophies come down before the games open. The festival '
            + 'is smaller, the crowd is larger, and nobody is arrested.');
        }),
      },
      {
        label: 'No games',
        tooltip: '+8 legitimacy, +10 governance points, and "The Festival Refused" (−0.5 unrest everywhere) for eight years. The eastern circuit goes elsewhere and so does its money.',
        effects: guard('games:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 8, gov: 10 });
          mod(ctx, 'festival_refused', 'The Festival Refused', { unrestAll: -0.5 }, 96);
          h.chronicle(ctx, 'era', 'The festival is refused. The beasts, the wrestlers and the '
            + 'money go to Antioch instead.');
        }),
      },
    ],
  },

  // ── 22 BCE ─────────────────────────────────────────────────────────────────
  {
    id: 'ev40y_the_oath',
    title: 'The Oath',
    desc: 'An oath of loyalty to the crown, sworn by every subject, recorded by district. It '
      + 'is an ordinary instrument of an ordinary reign and about six thousand men will not '
      + 'swear it. They are not in arms and they are not conspiring; they hold, as a matter '
      + 'of law, that a man may not swear by anything but God and may not bind himself to a '
      + 'human ruler in language that belongs to the covenant.\n\n'
      + 'The Essenes are excused outright, on the grounds that they refuse all oaths equally '
      + 'and are therefore not insulting anybody in particular. The Pharisees are fined, and '
      + 'the fine is paid for them by somebody at court — which is either a scandal or the '
      + 'entire point, depending on whether the crown thinks it is buying peace or being '
      + 'told the limits of its own authority.',
    forTag: 'player',
    date: { y: -22, m: 6 },
    aiOption: 1,
    historical: 'Josephus records the loyalty oath, the six thousand who refused, the fine, and the fact that somebody at court paid it for them.',
    options: [
      {
        label: 'Collect the fine and record every name',
        tooltip: '+60 talents and +10 governance points, with "The Register of Refusals" (+0.9 unrest everywhere) for six years. The crown now knows exactly who its opposition is, and so does its opposition.',
        effects: guard('oath:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 60, gov: 10, legitimacy: -4 });
          mod(ctx, 'register_of_refusals', 'The Register of Refusals', { unrestAll: 0.9 }, 72);
          h.setFlag(ctx, 'oathRefusalsRecorded', true);
          h.chronicle(ctx, 'era', 'The fine is collected from six thousand men who would not '
            + 'swear, and every one of their names goes into a register.');
        }),
      },
      {
        label: 'Excuse them, and say why in the decree',
        tooltip: '+8 legitimacy, +12 governance points, and "The Oath Excused" (−0.6 unrest everywhere, +4% income) for twelve years. A crown that can name the one thing it will not demand looks larger, not smaller.',
        effects: guard('oath:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 8, gov: 12 });
          mod(ctx, 'oath_excused', 'The Oath Excused', { unrestAll: -0.6, incomeMult: 1.04 }, 144);
          h.chronicle(ctx, 'era', 'The decree excuses the men who hold that an oath belongs to '
            + 'God alone, and says so in its own words rather than in theirs.');
        }),
      },
      {
        label: 'No exemptions',
        tooltip: '+12 legitimacy with the court and +8 martial points, and "Sworn to the Crown" (+5% manpower, +1.4 unrest everywhere) for six years. Everyone swears. A good many of them are lying, and the crown has taught them that lying is available.',
        effects: guard('oath:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 12, mar: 8 });
          mod(ctx, 'sworn_to_crown', 'Sworn to the Crown', { manpowerMult: 1.05, unrestAll: 1.4 }, 72);
          h.chronicle(ctx, 'era', 'The oath is required of everybody without exception. It is '
            + 'sworn by everybody without exception.');
        }),
      },
    ],
  },

  // ── 21 BCE ─────────────────────────────────────────────────────────────────
  {
    id: 'ev40y_the_cities_that_are_not_ours',
    title: 'The Cities That Are Not Ours',
    desc: 'The accounts of the foreign benefactions are read out and they are astonishing. A '
      + 'colonnaded street two and a half miles long at Antioch, paved in polished stone. The '
      + 'Olympic games endowed in perpetuity because they were failing for want of money. '
      + 'Gymnasia at Ptolemais and Tripolis, walls at Byblos, a theatre at Sidon, baths and '
      + 'fountains at Ascalon, the temple of Pythian Apollo at Rhodes rebuilt, corn to '
      + 'Athens, and a standing subsidy to Chios.\n\n'
      + 'Not one of those places pays this treasury a drachma. The argument for it is that a '
      + 'small kingdom which is famous everywhere is harder to abolish than a small kingdom '
      + 'which is merely solvent, and that every Greek city with a Jewish quarter now has a '
      + 'reason to be careful with it. The argument against it is being made, loudly, by men '
      + 'in the hill country whose villages have no cistern.',
    forTag: 'player',
    date: { y: -21, m: 5 },
    aiOption: 0,
    historical: 'Josephus lists Herod\'s benefactions across the Greek world, including the endowment of the Olympic games, and notes the resentment they caused at home.',
    options: [
      {
        label: 'Spend it abroad. A famous kingdom is a defended kingdom',
        tooltip: '−90 talents: +15 influence points and "The Benefactor of Cities" (+7% income, +6% trade) for fifteen years, with +0.6 unrest everywhere for eight from the villages that were not on the list.',
        effects: guard('cities:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -90, infl: 15 });
          mod(ctx, 'benefactor_of_cities', 'The Benefactor of Cities', { incomeMult: 1.07, tradeMult: 1.06, unrestAll: 0.6 }, 180);
          h.setFlag(ctx, 'foreignBenefactions', true);
          h.chronicle(ctx, 'era', 'The benefactions go out: a paved street at Antioch, the '
            + 'Olympic games endowed, walls at Byblos. In the hill country the cisterns are '
            + 'still dry and it is noticed.');
        }),
      },
      {
        label: 'Half abroad, half into cisterns',
        tooltip: '−70 talents split: +8 influence points and "The Cisterns and the Colonnade" (+5% income, +4% growth, −0.4 unrest everywhere) for fifteen years.',
        effects: guard('cities:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -70, infl: 8 });
          mod(ctx, 'cisterns_colonnade', 'The Cisterns and the Colonnade', { incomeMult: 1.05, growthMult: 1.04, unrestAll: -0.4 }, 180);
          h.chronicle(ctx, 'era', 'The benefactions are halved and the other half goes into '
            + 'cisterns, threshing floors and roads at home. Neither audience is entirely '
            + 'satisfied, which is the usual sign.');
        }),
      },
      {
        label: 'Nothing leaves this country',
        tooltip: '+10 legitimacy and "Spent at Home" (+6% income, +6% growth, −0.5 unrest everywhere) for fifteen years, and −10 influence points: no city in the Greek world owes us anything.',
        effects: guard('cities:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 10, infl: -10 });
          mod(ctx, 'spent_at_home', 'Spent at Home', { incomeMult: 1.06, growthMult: 1.06, unrestAll: -0.5 }, 180);
          h.chronicle(ctx, 'era', 'The foreign benefactions are struck out entire. Every talent '
            + 'is spent inside the country, and outside it nobody has heard of the place.');
        }),
      },
    ],
  },

  // ── 19 BCE ─────────────────────────────────────────────────────────────────
  {
    id: 'ev40y_the_priests_who_learned_to_build',
    title: 'The Priests Who Learned to Build',
    desc: 'There is a problem with rebuilding the House, and it is not money or stone. It is '
      + 'that no layman may go where the work has to happen. The inner courts and the '
      + 'sanctuary itself may be entered by priests and by nobody else, and priests are not '
      + 'masons.\n\n'
      + 'So a thousand of them are trained. They learn to cut, to set and to hoist, and for '
      + 'the eighteen months the sanctuary takes they are the only workforce inside the '
      + 'inner court, and the daily sacrifice never stops for a single day while they do it. '
      + 'Outside, eleven thousand ordinary labourers work the platform and the porticoes. The '
      + 'whole undertaking is designed around a rule about who may stand where, and the '
      + 'design is why it is permitted at all.',
    forTag: 'player',
    date: { y: -19, m: 4 },
    aiOption: 0,
    historical: 'A thousand priests were trained as builders so that the sanctuary could be rebuilt without laymen entering it; the sacrifices continued throughout.',
    options: [
      {
        label: 'Train the thousand and never stop the sacrifice',
        tooltip: '−60 talents: +10 legitimacy, +1 stability, and "The Priest-Masons" (+5% income, −0.6 unrest everywhere) for fifteen years. The one objection that could have stopped the work never gets made.',
        effects: guard('masons:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -60, legitimacy: 10, stability: 1 });
          mod(ctx, 'priest_masons', 'The Priest-Masons', { incomeMult: 1.05, unrestAll: -0.6 }, 180);
          h.chronicle(ctx, 'era', 'A thousand priests are taught to cut and set stone. The '
            + 'sanctuary rises without a layman inside the court and without one morning\'s '
            + 'sacrifice missed.');
        }),
      },
      {
        label: 'Suspend the service for the duration',
        tooltip: '+80 talents saved and the work runs a third faster: "The Quick Work" (+8% income, +1.5 unrest everywhere) for six years, −12 legitimacy now, and "The Cold Altar" (−0.08 legitimacy a month) for twelve years, because the altar was cold and everyone alive will remember it.',
        effects: guard('masons:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 80, legitimacy: -12 });
          mod(ctx, 'the_quick_work', 'The Quick Work', { incomeMult: 1.08, unrestAll: 1.5 }, 72);
          ctx.helpers.addTagModifier(ctx, P(ctx), {
            id: 'cold_altar', name: 'The Cold Altar', months: 144, effects: { legitimacyAdd: -0.08 },
          });
          h.chronicle(ctx, 'era', 'The daily service is suspended while the sanctuary is '
            + 'rebuilt. The work goes quickly. The suspension is what gets written down.');
        }),
      },
      {
        label: 'Build the courts and leave the sanctuary alone',
        tooltip: '−35 talents on the platform and porticoes only: +6 legitimacy and "The Great Platform" (+6% income, +4% trade) for fifteen years. The House itself is untouched, which is a decision as much as rebuilding it would be.',
        effects: guard('masons:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, legitimacy: 6 });
          mod(ctx, 'great_platform', 'The Great Platform', { incomeMult: 1.06, tradeMult: 1.04 }, 180);
          h.chronicle(ctx, 'era', 'The platform and the porticoes are built and the sanctuary '
            + 'is left as it stands. Pilgrims arrive to a courtyard the size of a city and an '
            + 'old house in the middle of it.');
        }),
      },
    ],
  },

  // ── 18 BCE ─────────────────────────────────────────────────────────────────
  {
    id: 'ev40y_the_tomb_of_david',
    title: 'The Tomb of David',
    desc: 'Somebody has done the arithmetic on the old story: that Hyrcanus opened one chamber '
      + 'of David\'s tomb in a bad year and took three thousand talents out of it, and that '
      + 'the inner chambers were never touched. The treasury is not in a bad year, exactly. '
      + 'It is in a decade of building on a scale nothing in this country\'s revenue was '
      + 'designed to carry.\n\n'
      + 'The proposal is put quietly and the objection is not really about the money either. '
      + 'It is that a crown which has to open the tomb of the founder of the dynasty it '
      + 'replaced is announcing what it is short of — and that whatever is in there, the men '
      + 'who go in will come out and talk. In the story as it is told afterwards, two of them '
      + 'are killed by a flame out of the inner chamber, and the work stops, and a monument '
      + 'of white stone is put up at the mouth by way of apology.',
    forTag: 'player',
    date: { y: -18, m: 7 },
    aiOption: 2,
    historical: 'Josephus reports Herod opening David\'s tomb, the flame that killed two of his men, and the propitiatory monument he built at its entrance.',
    options: [
      {
        label: 'Open it',
        tooltip: '+200 talents, and −15 legitimacy with +1.6 unrest everywhere for six years. "What They Took From the Tomb" — the money is real and so is the story that outlives it.',
        effects: guard('tomb:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 200, legitimacy: -15 });
          mod(ctx, 'took_from_the_tomb', 'What They Took From the Tomb', { unrestAll: 1.6 }, 72);
          // The same key §85's doctrine table already reads for Hyrcanus'
          // opening of the sepulchre: the act is identical and so is what it
          // says about the realm, so it moves the zeal needle the same way.
          h.setFlag(ctx, 'davidsTombOpened', true);
          h.chronicle(ctx, 'era', 'The tomb of David is opened and emptied of what it had. The '
            + 'sum is entered in the accounts and the story is told for three hundred years.');
        }),
      },
      {
        label: 'Open it, and build a monument at the mouth',
        tooltip: '+140 talents and −45 spent on white marble: −6 legitimacy, +0.7 unrest everywhere for four years, and "The Monument at the Mouth" (−0.3 unrest everywhere afterwards) for twelve.',
        effects: guard('tomb:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 95, legitimacy: -6 });
          mod(ctx, 'monument_at_the_mouth', 'The Monument at the Mouth', { unrestAll: -0.3 }, 144);
          h.setFlag(ctx, 'davidsTombOpened', true);
          h.chronicle(ctx, 'era', 'The tomb is opened, and a monument of white stone is raised '
            + 'at its mouth afterwards. Nobody is fooled and everybody accepts it.');
        }),
      },
      {
        label: 'Borrow against the customs instead',
        tooltip: '+120 talents raised on the coast revenues, repaid out of them: "The Pledged Customs" (−6% income) for ten years, +8 legitimacy, and the founder stays where he is.',
        effects: guard('tomb:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 120, legitimacy: 8 });
          mod(ctx, 'pledged_customs', 'The Pledged Customs', { incomeMult: 0.94 }, 120);
          h.chronicle(ctx, 'era', 'The building is financed against the customs of the coast '
            + 'instead. The tomb of David is not opened, and the crown says so publicly.');
        }),
      },
    ],
  },

  // ── 17 BCE ─────────────────────────────────────────────────────────────────
  {
    id: 'ev40y_the_boys_come_home',
    title: 'The Boys Come Home',
    desc: 'They have been in Rome five years, boarded in the house of a senator and then in '
      + 'the emperor\'s own, and they come back speaking better Greek than anybody at court, '
      + 'with Roman manners, Roman friends and a set of assumptions about what a kingdom is '
      + 'for that nobody here shares. They are also, on their mother\'s side, Hasmonean — the '
      + 'last of that line, and the country knows it to a man.\n\n'
      + 'What has been created is two young men whom Rome regards as its own protégés and the '
      + 'country regards as the restoration of the old house, who despise the court that '
      + 'raised them and are visibly counting. Everything that happens in this family for the '
      + 'next twelve years is downstream of the decision now being made about what to do with '
      + 'them.',
    forTag: 'player',
    date: { y: -17, m: 6 },
    aiOption: 1,
    historical: 'Alexander and Aristobulus returned from their Roman education around 17 BCE. Both were executed by their father twelve years later.',
    options: [
      {
        label: 'Marry them into the great houses and give them commands',
        tooltip: '−30 talents on the weddings: +10 legitimacy, +8 martial points, and "The Young Princes" (+5% manpower, +4% income) for twelve years, with +0.5 unrest everywhere for eight as a second court forms around them.',
        effects: guard('boys:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -30, legitimacy: 10, mar: 8 });
          mod(ctx, 'the_young_princes', 'The Young Princes', { manpowerMult: 1.05, incomeMult: 1.04, unrestAll: 0.5 }, 144);
          h.chronicle(ctx, 'ruler', 'The princes are married into the great houses and given '
            + 'commands. A second court assembles around them within a year, as everybody '
            + 'expected and nobody prevented.');
        }),
      },
      {
        label: 'Keep them at court with no command and no household',
        tooltip: '+12 governance points and "The Watched Sons" (−0.4 unrest everywhere) for ten years, with −6 legitimacy. Nothing happens, for a while, which is the whole objective.',
        effects: guard('boys:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12, legitimacy: -6 });
          mod(ctx, 'watched_sons', 'The Watched Sons', { unrestAll: -0.4 }, 120);
          h.chronicle(ctx, 'ruler', 'The princes are kept at court without commands, without '
            + 'households and without anything to do. They are excellent company and they are '
            + 'counting.');
        }),
      },
      {
        label: 'Send them back to Rome for good',
        tooltip: '−40 talents in maintenance: +10 influence points and "The Hostages in the Capital" (+6% income, −0.5 unrest everywhere) for fifteen years, and −8 legitimacy at home, where sending the last Hasmoneans abroad is read exactly as it is meant.',
        effects: guard('boys:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, infl: 10, legitimacy: -8 });
          mod(ctx, 'hostages_capital', 'The Hostages in the Capital', { incomeMult: 1.06, unrestAll: -0.5 }, 180);
          h.chronicle(ctx, 'ruler', 'The princes go back to Rome with an allowance and no '
            + 'return date. The country is told it is an education.');
        }),
      },
    ],
  },

  // ── 16 BCE ─────────────────────────────────────────────────────────────────
  {
    id: 'ev40y_the_ring_of_fortresses',
    title: 'The Ring of Fortresses',
    desc: 'The engineers lay out the whole system on one table: Masada on its rock over the '
      + 'sea of salt, Machaerus across the water, Herodium\'s artificial cone south of '
      + 'Bethlehem, Alexandrium and Hyrcania on the desert edge, Cypros above Jericho, the '
      + 'Antonia against the Temple platform. Cisterns cut for years of siege, storerooms '
      + 'stocked, garrisons rotated, and every one of them within signalling distance of the '
      + 'next.\n\n'
      + 'It is not a frontier. Every fortress in it faces inward, or faces the road to Egypt '
      + 'and Arabia, and what it is designed against is a rising in this country or an '
      + 'arrival from the desert — and, if the worst comes, a place for a dynasty to sit out '
      + 'a year while the world decides. Whoever builds it is making a permanent statement '
      + 'about what they expect from the people they rule.',
    forTag: 'player',
    date: { y: -16, m: 5 },
    aiOption: 0,
    historical: 'The Herodian fortresses — Masada, Machaerus, Herodium, Alexandrium, Hyrcania, Cypros, the Antonia — were still the decisive strong points of both the Great Revolt and Bar Kokhba\'s war.',
    options: [
      {
        label: 'Build the ring and stock it for three years',
        tooltip: '−110 talents: "The Fortress Ring" (+1 to defence in hill country, +6% force limit, −0.3 unrest everywhere) for twenty years. Whatever comes, there is somewhere to hold.',
        effects: guard('ring:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -110 });
          mod(ctx, 'fortress_ring', 'The Fortress Ring', { hillDefBonus: 1, forceLimitMult: 1.06, unrestAll: -0.3 }, 240);
          h.setFlag(ctx, 'fortressRing', true);
          h.chronicle(ctx, 'war', 'The fortress ring is finished and stocked: cisterns cut for '
            + 'three years, stores laid in, garrisons rotated. It will still be standing when '
            + 'the people who built it are a rumour.');
        }),
      },
      {
        label: 'Two of them, and spend the rest on the roads',
        tooltip: '−60 talents: "The Two Strongholds" (+3% force limit) and "The Made Roads" (+7% income, +5% growth) for twenty years.',
        effects: guard('ring:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -60 });
          mod(ctx, 'two_strongholds', 'The Two Strongholds', { forceLimitMult: 1.03 }, 240);
          ctx.helpers.addTagModifier(ctx, P(ctx), {
            id: 'made_roads', name: 'The Made Roads', months: 240, effects: { incomeMult: 1.07, growthMult: 1.05 },
          });
          h.chronicle(ctx, 'era', 'Two fortresses are built properly and the rest of the money '
            + 'goes into the roads between the towns.');
        }),
      },
      {
        label: 'A crown that needs seven fortresses against its own country has already lost it',
        tooltip: '+12 legitimacy, +10 governance points, and "The Open Country" (+5% income, −0.7 unrest everywhere) for fifteen years. There is nowhere to retreat to, on purpose.',
        effects: guard('ring:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 12, gov: 10 });
          mod(ctx, 'the_open_country', 'The Open Country', { incomeMult: 1.05, unrestAll: -0.7 }, 180);
          h.chronicle(ctx, 'era', 'The fortress programme is struck out. The crown states that '
            + 'it does not intend to besiege its own people or to be besieged by them.');
        }),
      },
    ],
  },

  // ── 2 BCE ──────────────────────────────────────────────────────────────────
  {
    id: 'ev40y_the_ledger_of_the_reign',
    title: 'The Ledger of the Reign',
    desc: 'The revenue is laid out in full for the first time in a generation and the shape of '
      + 'it is worth looking at. The land tax is the smallest part. The customs of the coast '
      + 'are larger. The balsam of Jericho and Engedi — a monopoly, grown nowhere else on '
      + 'earth, sold by weight against silver — is larger still. So are the copper leases in '
      + 'Cyprus, the crown estates in the Great Plain, and the pilgrim traffic, which the '
      + 'treasury has never previously counted as revenue and which turns out to be one talent '
      + 'in six.\n\n'
      + 'What the ledger says is that this is not an agricultural kingdom with a temple in it. '
      + 'It is a trading state that owns a monopoly and a shrine, and its money comes from '
      + 'people arriving. Which raises the question the clerks are too junior to write down: '
      + 'what happens to the revenue if the arriving ever stops.',
    forTag: 'player',
    date: { y: -2, m: 10 },
    aiOption: 0,
    historical: 'Herodian revenue rested on customs, the balsam monopoly, crown estates and pilgrimage far more than on the land tax — which is why the loss of the Temple was a fiscal catastrophe as well as a religious one.',
    options: [
      {
        label: 'Fund the pilgrim roads out of the pilgrim revenue',
        tooltip: '−50 talents into roads, hostels and cisterns on the ascent: "The Pilgrim Roads" (+9% income, +8% festival draw) for twenty years.',
        effects: guard('ledger:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50 });
          mod(ctx, 'pilgrim_roads', 'The Pilgrim Roads', { incomeMult: 1.09, pilgrimMult: 1.08 }, 240);
          h.chronicle(ctx, 'era', 'The roads of the ascent are made, with cisterns and hostels '
            + 'at a day\'s march. The traffic that pays for a sixth of the state is treated '
            + 'like the asset it is.');
        }),
      },
      {
        label: 'Protect the monopoly and plant more of it',
        tooltip: '−45 talents into the balsam groves and the guards on them: "The Groves" (+11% income) for twenty years. One crop, one country, and the price is whatever we say.',
        effects: guard('ledger:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45 });
          mod(ctx, 'the_groves', 'The Groves', { incomeMult: 1.11 }, 240);
          h.setFlag(ctx, 'balsamProgramme', true);
          h.chronicle(ctx, 'era', 'The balsam groves are extended and put under guard. Nothing '
            + 'else on earth grows it, and the treasury intends to keep that true.');
        }),
      },
      {
        label: 'Spread the base: relieve the land tax and tax the ports',
        tooltip: '+10 governance points and "The Broadened Base" (+6% income, +5% growth, −0.5 unrest everywhere) for twenty years. Less revenue this year, and the state stops resting on one shrine.',
        effects: guard('ledger:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -20, gov: 10 });
          mod(ctx, 'broadened_base', 'The Broadened Base', { incomeMult: 1.06, growthMult: 1.05, unrestAll: -0.5 }, 240);
          h.chronicle(ctx, 'era', 'The land tax is relieved and the ports carry more of the '
            + 'burden. The villages notice within a season.');
        }),
      },
    ],
  },

  // ── 19 CE ──────────────────────────────────────────────────────────────────
  {
    id: 'ev40y_the_four_thousand',
    title: 'The Four Thousand',
    desc: 'A Roman noblewoman named Fulvia gave money for the Temple to four men who kept it. '
      + 'Her husband complained to the emperor. What follows is out of all proportion to it: '
      + 'the Senate votes the Jewish community of the city out of Rome, and four thousand men '
      + 'of military age are conscripted and shipped to Sardinia to fight bandits in a climate '
      + 'that is expected to kill a good number of them. Tacitus notes, without much interest, '
      + 'that if they died of it the loss was cheap.\n\n'
      + 'The mechanism is what matters here. Not a persecution, not a policy, not an edict '
      + 'about religion: one fraud, one aggrieved husband, one Senate looking for something '
      + 'to be firm about, and the largest Jewish community in the west is on ships within a '
      + 'season. Nothing in the law prevented it, and nothing in the law had to change.',
    forTag: 'player',
    date: { y: 19, m: 1 },
    world: true,
    worldLabel: 'Rome expels its Jews; four thousand are conscripted for Sardinia',
    aiOption: 1,
    historical: 'Tiberius expelled the Jews from Rome in 19 CE and sent four thousand to Sardinia. The community was back within a decade.',
    options: [
      {
        label: 'An embassy, at once, and pay whatever it costs',
        tooltip: '−70 talents: +12 influence points and "The Petition of the Nineteenth Year" (+5% income) for twelve years. Some are recalled; the expulsion lapses years earlier than it would have.',
        effects: guard('four:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -70, infl: 12 });
          mod(ctx, 'petition_nineteenth', 'The Petition of the Nineteenth Year', { incomeMult: 1.05 }, 144);
          h.chronicle(ctx, 'diplomacy', 'An embassy goes to the Palatine about the four '
            + 'thousand. It is expensive, it is humiliating, and it works sooner than waiting '
            + 'would have.');
        }),
      },
      {
        label: 'Receive whoever can get to a ship',
        tooltip: '−40 talents on passages and settlement: +8 legitimacy and "The Returned from the West" (+4% manpower, +4% growth) for twelve years.',
        effects: guard('four:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, legitimacy: 8 });
          mod(ctx, 'returned_from_west', 'The Returned from the West', { manpowerMult: 1.04, growthMult: 1.04 }, 144);
          h.chronicle(ctx, 'era', 'Passages are paid for anybody out of Rome who can reach a '
            + 'ship. They arrive through the autumn, and they are settled.');
        }),
      },
      {
        label: 'Say nothing. It will lapse',
        tooltip: '+10 governance points and +20 talents unspent. It does lapse, in about a decade, and everybody involved remembers who said nothing.',
        effects: guard('four:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 10, treasury: 20, legitimacy: -5 });
          h.chronicle(ctx, 'era', 'No embassy is sent about the four thousand. The measure '
            + 'lapses in its own time, as such measures do.');
        }),
      },
    ],
  },

  // ── 20 CE ──────────────────────────────────────────────────────────────────
  {
    id: 'ev40y_the_city_on_the_graves',
    title: 'The City on the Graves',
    desc: 'A new capital is going up on the western shore of the lake — a fine one, with a '
      + 'stadium, a palace, hot springs a mile down the road and a harbour — and nobody will '
      + 'live in it. The site turns out to have been a cemetery, and a Jew who walks over '
      + 'graves is unclean for seven days, which for a city means for ever.\n\n'
      + 'The founder solves it the way such things get solved: he settles it with anybody he '
      + 'can compel or bribe — freed slaves given houses, the poor of the villages given land '
      + 'on condition they stay, officials told to move — and grants exemptions from tax to '
      + 'whoever will register. Two centuries later the same city will be where the '
      + 'Sanhedrin sits, where the Mishnah is completed, and where the calendar of the whole '
      + 'nation is fixed. The graves are quietly ruled to have been a misunderstanding.',
    forTag: 'player',
    date: { y: 20, m: 6 },
    aiOption: 0,
    historical: 'Tiberias was founded on a burial ground around 20 CE and settled by compulsion and bribery. It later became the seat of the Patriarchate and the centre of Jewish learning in the land.',
    options: [
      {
        label: 'Build it, and buy the settlers',
        tooltip: '−75 talents in houses, land grants and tax exemptions: "The New Capital" (+8% income, +7% growth) for twenty years, with +0.6 unrest everywhere for six while the ruling is argued about.',
        effects: guard('graves:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -75 });
          mod(ctx, 'the_new_capital', 'The New Capital', { incomeMult: 1.08, growthMult: 1.07, unrestAll: 0.6 }, 240);
          h.setFlag(ctx, 'lakeCapital', true);
          h.chronicle(ctx, 'era', 'The lake city is built and filled by grant and exemption. '
            + 'The question of the graves is left to be settled by whoever is still arguing '
            + 'about it in a hundred years.');
        }),
      },
      {
        label: 'Have the ground ruled on before a stone is laid',
        tooltip: '−90 talents and two years lost to the survey and the ruling: "The Clean Foundation" (+7% income, +5% growth, −0.4 unrest everywhere) for twenty years. Slower, and nobody ever has to be bribed to live there.',
        effects: guard('graves:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -90, legitimacy: 6 });
          mod(ctx, 'clean_foundation', 'The Clean Foundation', { incomeMult: 1.07, growthMult: 1.05, unrestAll: -0.4 }, 240);
          h.setFlag(ctx, 'lakeCapital', true);
          h.chronicle(ctx, 'era', 'The ground is surveyed and ruled on before the foundations '
            + 'go in. The city fills by itself.');
        }),
      },
      {
        label: 'Put the city somewhere else on the lake',
        tooltip: '−55 talents: "The Lake Towns" (+6% income, +5% growth) for twenty years, and no capital — the shore gets four working harbours instead of one showpiece.',
        effects: guard('graves:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, gov: 8 });
          mod(ctx, 'the_lake_towns', 'The Lake Towns', { incomeMult: 1.06, growthMult: 1.05 }, 240);
          h.chronicle(ctx, 'era', 'The capital on the graves is abandoned and the money goes '
            + 'into four working harbours further up the shore.');
        }),
      },
    ],
  },

  // ── 41 CE ──────────────────────────────────────────────────────────────────
  {
    id: 'ev40y_the_charter_of_claudius',
    title: 'The Charter of Claudius',
    desc: 'The new emperor grew up in the palace alongside a Jewish prince who has just spent '
      + 'a fortnight talking the Praetorians and the Senate into accepting him, and he pays '
      + 'his debts. Two edicts go out. The first restores to the Jews of Alexandria '
      + 'everything the riots took from them and tells the Greeks of that city to stop. The '
      + 'second extends the same terms to the whole empire: they may keep their own customs '
      + 'without interference, and it is to be posted where it can be read.\n\n'
      + 'And then a sentence at the end that the drafters clearly thought was even-handed and '
      + 'that nobody in the east reads as even-handed at all: let them not despise the '
      + 'religious observances of other nations. The charter is real, it is enforceable, and '
      + 'it is a gift from one man to one friend — which is the whole problem with it, because '
      + 'friends die.',
    forTag: 'player',
    date: { y: 41, m: 2 },
    world: true,
    worldLabel: 'Claudius confirms Jewish rights across the empire',
    aiOption: 0,
    historical: 'Claudius issued edicts in 41 CE confirming Jewish rights in Alexandria and throughout the empire, at the urging of Agrippa I, who had helped him to the throne.',
    options: [
      {
        label: 'Get it posted in every city, in stone, this year',
        tooltip: '−55 talents on the couriers and the cutters: +15 influence points and "The Posted Charter" (+9% income, −0.4 unrest everywhere) for twenty years.',
        effects: guard('claudius:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, infl: 15 });
          mod(ctx, 'posted_charter', 'The Posted Charter', { incomeMult: 1.09, unrestAll: -0.4 }, 240);
          h.setFlag(ctx, 'claudianCharter', true);
          h.chronicle(ctx, 'diplomacy', 'The edict is cut and posted from Alexandria to Sardis '
            + 'inside a year. A privilege that exists only in a palace lasts as long as the '
            + 'palace remembers.');
        }),
      },
      {
        label: 'Ask for more while the door is open',
        tooltip: '+12 influence points and "The Wider Ask" (+12% income) for eight years, and +0.8 unrest everywhere for six as the Greek cities read what was granted and begin drafting replies.',
        effects: guard('claudius:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 12 });
          mod(ctx, 'the_wider_ask', 'The Wider Ask', { incomeMult: 1.12, unrestAll: 0.8 }, 96);
          h.chronicle(ctx, 'diplomacy', 'The embassy asks for more than the emperor offered and '
            + 'is given most of it. The Greek cities begin composing their objections that '
            + 'winter.');
        }),
      },
      {
        label: 'A charter that rests on one friendship is worth what the friendship is',
        tooltip: '+12 governance points and "Nothing Owed to a Palace" (+5% income, −0.3 unrest everywhere) for fifteen years. The privileges are taken, and the court builds nothing on them.',
        effects: guard('claudius:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12 });
          mod(ctx, 'nothing_owed_palace', 'Nothing Owed to a Palace', { incomeMult: 1.05, unrestAll: -0.3 }, 180);
          h.chronicle(ctx, 'era', 'The charter is received and filed without ceremony. The '
            + 'court declines to build anything on a friendship between two men.');
        }),
      },
    ],
  },

  // ── 46 CE ──────────────────────────────────────────────────────────────────
  {
    id: 'ev40y_the_grain_of_the_queen',
    title: 'The Grain of the Queen',
    desc: 'The harvest fails twice running and the price of wheat in Jerusalem goes past what '
      + 'anybody can pay. Relief arrives, and it arrives from the far side of the Tigris: '
      + 'Helena, queen mother of Adiabene, who came here on pilgrimage and stayed, sends her '
      + 'agents to Alexandria for grain and to Cyprus for dried figs and distributes both in '
      + 'the city at her own expense. Her son the king sends money after it.\n\n'
      + 'The house of Adiabene converted a generation ago, argued for years about whether the '
      + 'king could be circumcised without losing his throne, decided that he could, and has '
      + 'been sending gold and gifts to the Temple ever since. What the famine demonstrates is '
      + 'the arrangement working the other way: when the land could not feed itself, the thing '
      + 'that fed it was a Jewish kingdom in Mesopotamia that owes this one nothing at all.',
    forTag: 'player',
    date: { y: 46, m: 6 },
    aiOption: 0,
    historical: 'Josephus records Queen Helena of Adiabene buying grain in Egypt and figs in Cyprus for famine relief in Jerusalem around 46–48 CE. Her tomb stood north of the city.',
    options: [
      {
        label: 'Take it, and honour her in the city',
        tooltip: '+70 talents\' worth of relief, +10 legitimacy, +1 stability, and "The Queen\'s Grain" (−0.7 unrest everywhere, +4% growth) for twelve years.',
        effects: guard('queen:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 70, legitimacy: 10, stability: 1 });
          mod(ctx, 'the_queens_grain', 'The Queen\'s Grain', { unrestAll: -0.7, growthMult: 1.04 }, 144);
          h.chronicle(ctx, 'era', 'Grain out of Egypt and figs out of Cyprus are distributed '
            + 'in the city at a foreign queen\'s expense. Her monument goes up north of the '
            + 'walls, with three pyramids on it, and nobody objects to a word of it.');
        }),
      },
      {
        label: 'Take it, and buy the rest ourselves',
        tooltip: '−60 talents on top of the relief: +12 legitimacy, +1 stability, and "The Granaries Opened" (−0.9 unrest everywhere, +5% growth) for twelve years. The crown is not seen to be fed by somebody else\'s queen.',
        effects: guard('queen:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -60, legitimacy: 12, stability: 1 });
          mod(ctx, 'granaries_opened', 'The Granaries Opened', { unrestAll: -0.9, growthMult: 1.05 }, 144);
          h.chronicle(ctx, 'era', 'The queen\'s grain is distributed and the crown buys as much '
            + 'again beside it. Both cargoes are unloaded at the same quay and only one of '
            + 'them is talked about.');
        }),
      },
      {
        label: 'Open a standing account with the eastern house',
        tooltip: '+50 talents in relief now and +10 influence points, with "The Mesopotamian Account" (+7% income, +5% trade) for fifteen years — grain, gold and a corridor that no Roman governor controls.',
        effects: guard('queen:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 50, infl: 10 });
          mod(ctx, 'mesopotamian_account', 'The Mesopotamian Account', { incomeMult: 1.07, tradeMult: 1.05 }, 180);
          h.setFlag(ctx, 'adiabeneAccount', true);
          h.chronicle(ctx, 'diplomacy', 'A standing account is opened with the house beyond the '
            + 'Tigris: grain west, gold west, and a road between them that answers to no '
            + 'legate.');
        }),
      },
    ],
  },

  // ── 48 CE ──────────────────────────────────────────────────────────────────
  {
    id: 'ev40y_the_passover_crush',
    title: 'The Passover Crush',
    desc: 'The garrison stands on the porticoes over the court at every festival, because a '
      + 'crowd of that size in that space is a standing danger and everybody knows it. This '
      + 'year one of the soldiers pulls up his tunic and makes an obscene gesture at the '
      + 'crowd below, and the crowd surges, and the porticoes have four narrow exits.\n\n'
      + 'The counts afterwards are impossible — the lowest is ten thousand and the historian '
      + 'who was there writes twenty — and the manner of it is worse than the number: people '
      + 'trampled into the gates of their own Temple on the feast of their own deliverance, '
      + 'over a joke. The procurator refuses to hand the soldier over. What that refusal '
      + 'teaches, to everyone standing in the court that morning, is the exact size of the '
      + 'space between a grievance and a remedy.',
    forTag: 'player',
    date: { y: 48, m: 5 },
    aiOption: 1,
    historical: 'Josephus records the Passover crush under Cumanus and the refusal to punish the soldier. He counts it among the causes of the war eighteen years later.',
    options: [
      {
        label: 'Demand the man, and go over the governor\'s head',
        tooltip: '−45 talents on the embassy: +10 legitimacy, +8 influence points, and "The Man Handed Over" (−0.5 unrest everywhere) for ten years if it works, which it sometimes does.',
        effects: guard('crush:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -45, legitimacy: 10, infl: 8 });
          mod(ctx, 'man_handed_over', 'The Man Handed Over', { unrestAll: -0.5 }, 120);
          h.chronicle(ctx, 'diplomacy', 'The demand for the soldier goes over the governor\'s '
            + 'head to the legate of Syria. It is an expensive way to be answered, and it is '
            + 'answered.');
        }),
      },
      {
        label: 'Widen the gates and put our own marshals in the court',
        tooltip: '−50 talents on the works and the wardens: +8 legitimacy and "The Marshalled Court" (+6% festival draw, −0.6 unrest everywhere) for fifteen years. The next crowd of that size gets out alive.',
        effects: guard('crush:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50, legitimacy: 8 });
          mod(ctx, 'marshalled_court', 'The Marshalled Court', { pilgrimMult: 1.06, unrestAll: -0.6 }, 180);
          h.chronicle(ctx, 'era', 'The gates of the court are widened and the crowd is '
            + 'marshalled by the Temple\'s own wardens instead of by soldiers on the roof.');
        }),
      },
      {
        label: 'Let the country hear exactly what was refused',
        tooltip: '+12 legitimacy and +10 martial points, with "The Grievance Published" (+7% manpower, +1.2 unrest everywhere) for ten years. Nothing is fixed and nothing is forgotten.',
        effects: guard('crush:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 12, mar: 10 });
          mod(ctx, 'grievance_published', 'The Grievance Published', { manpowerMult: 1.07, unrestAll: 1.2 }, 120);
          h.chronicle(ctx, 'era', 'The refusal is read out in every town: the number of the '
            + 'dead, the cause of it, and the name of the man who would not be handed over.');
        }),
      },
    ],
  },
];
