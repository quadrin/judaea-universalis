// Judaea Universalis — the years the chain skips: 534–604 CE (SPEC §240).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// The Keepers' chapter has twenty-eight dated cards over ninety years and
// twenty-four of them are the empire's own calendar: Gelimer, Nika, the
// plague, Totila, the Lombards, Phocas, Heraclius. Samaria itself appears in
// four — the legislation, the rising at Caesarea, the easing at
// Constantinople, and the last revolt — and between them the mountain has
// nothing to do for a decade at a time.
//
// This file is the mountain's own seventy years. It is deliberately small in
// scale, because the chapter is: four hill provinces, a book, a priesthood, a
// terraced hillside and a law that keeps arriving in the post. The cards are
// about the things a community this size actually spends its decades on —
// what its scripture says that nobody else's does, who may inherit, where its
// people have gone, whether the road full of somebody else's pilgrims is a
// threat or a revenue, and what happens to children taken to a font.
//
// Three cards are addressed to the second chair (SPEC §208) rather than to
// the mountain: Himyar's dam, its trade and its road north. The chapter seats
// that court and then hands it ninety years of somebody else's chronicle;
// these are the three decisions its own century actually put in front of it.
//
// Sources: the Samaritan Pentateuch and the Gerizim commandment; Justinian's
// Novellae 129 and 144 for the disabilities and their easing; Procopius,
// Anecdota XI, for the mountain and the coast; the Samaritan inscriptions of
// Thessalonica, Delos and Egypt; Abraha's Marib dam inscription (CIH 541) for
// the repair and the embassies; the Piacenza Pilgrim for the road.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_529ce_years] ' + key, e || '');
}

// The letters this court answers to NOW (SPEC §135).
function who(ctx, tag) {
  return (ctx && ctx.helpers && ctx.helpers.livingTag) ? ctx.helpers.livingTag(ctx, tag) : tag;
}

function guard(key, fn) {
  return function (ctx) {
    try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); }
  };
}

function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[who(ctx, tag)];
  return !!(t && t.alive !== false);
}

function safeWhen(key, fn) {
  return function (ctx) {
    try { return !!fn(ctx); } catch (e) { warnOnce('when:' + key, e); return false; }
  };
}

// These cards are addressed to a NAMED court rather than to whoever is
// playing, because this chapter seats two chairs and the mountain's decades
// are not the Yemen's. A card whose audience is not the player resolves on its
// recorded course inside the sim, so the effects name their own tag: writing
// `playerTag` here would move Himyar's ledger when Samaria answered a question
// about its own priesthood.
function mod(ctx, tag, id, name, effects, months) {
  if (!alive(ctx, tag)) return;
  ctx.helpers.addTagModifier(ctx, tag, {
    id, name, months: Number.isFinite(months) ? months : -1, effects,
  });
}

export const EVENTS_529_YEARS = [

  // ── 534 · the mountain ─────────────────────────────────────────────────────
  {
    id: 'ev529y_the_book_on_the_mountain',
    title: 'The Book on the Mountain',
    desc: 'A bishop\'s secretary has been asking to see the book, politely, for two years, and '
      + 'the request has finally been put in a form the court has to answer. What he wants to '
      + 'see is the tenth commandment.\n\n'
      + 'The Keepers\' Torah has one the Jews\' does not: that when you cross over, you shall '
      + 'set up these stones on Mount Gerizim and build there an altar. It is not an addition '
      + 'in the eyes of the men who keep it; it is what was always there, and the other version '
      + 'is what is left after somebody took it out. The whole quarrel of a thousand years is '
      + 'one paragraph, and the paragraph is in a scroll in a room five miles from a garrison. '
      + 'To show it is to hand the empire a text it can legislate against by name. To refuse is '
      + 'to be a people whose entire claim rests on a document nobody outside has read.',
    forTag: 'SAM',
    date: { y: 534, m: 5 },
    when: safeWhen('book529', (ctx) => alive(ctx, 'SAM')),
    aiOption: 1,
    historical: 'The Samaritan Pentateuch carries the Gerizim commandment in the Decalogue. It is the shortest statement of the difference between the two Israels and the oldest.',
    options: [
      {
        label: 'Show it, and let them read the whole book',
        tooltip: '+10 influence points and "The Book Read Abroad" (+5% income, −0.3 unrest everywhere) for fifteen years, with −6 legitimacy from the priesthood, who did not want it out of the room.',
        effects: guard('book529:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { infl: 10, legitimacy: -6 });
          mod(ctx, 'SAM', 'book_read_abroad', 'The Book Read Abroad', { incomeMult: 1.05, unrestAll: -0.3 }, 180);
          h.chronicle(ctx, 'era', 'The book is shown and copied. For the first time in five '
            + 'centuries somebody outside the mountain has read what the mountain actually '
            + 'says.');
        }),
      },
      {
        label: 'Copy out the one commandment and send that',
        tooltip: '+12 governance points, +6 legitimacy, and "The Tenth Word" (−0.5 unrest everywhere, +3% income) for fifteen years. The claim is stated exactly, in one paragraph, and nothing else leaves the room.',
        effects: guard('book529:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { gov: 12, legitimacy: 6 });
          mod(ctx, 'SAM', 'the_tenth_word', 'The Tenth Word', { unrestAll: -0.5, incomeMult: 1.03 }, 180);
          h.setFlag(ctx, 'gerizimCommandmentSent', true);
          h.chronicle(ctx, 'era', 'One paragraph is copied out and sent down: the stones, the '
            + 'mountain and the altar. Nothing else leaves the room, and the paragraph is '
            + 'enough to argue about for four hundred years.');
        }),
      },
      {
        label: 'The book is not shown',
        tooltip: '+10 legitimacy with the priesthood and "The Closed Room" (−0.4 unrest everywhere) for twelve years, with −8 influence points. Whatever is written about the Keepers after this is written by people who were not allowed to look.',
        effects: guard('book529:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { legitimacy: 10, infl: -8 });
          mod(ctx, 'SAM', 'the_closed_room', 'The Closed Room', { unrestAll: -0.4 }, 144);
          h.chronicle(ctx, 'era', 'The request is refused. Everything the outside world writes '
            + 'about the Keepers for the next four centuries is written by men who were not '
            + 'allowed to see the book.');
        }),
      },
    ],
  },

  // ── 538 · the mountain ─────────────────────────────────────────────────────
  {
    id: 'ev529y_the_line_of_the_priesthood',
    title: 'The Line of the Priesthood',
    desc: 'The high priest is old and the succession has to be settled, and the rule is not a '
      + 'rule anybody chose: it descends in one family, from Aaron through Eleazar, and the '
      + 'family has been recording every name in order for as long as it has existed. There is '
      + 'no election, no confirmation and no appeal. When there is a candidate the office is '
      + 'filled, and the question the court has never had to face is what happens when there '
      + 'is not.\n\n'
      + 'Two of the eligible men are dead, and the third is nine years old, and the community '
      + 'has just come out of a decade in which a great many families of every kind stopped '
      + 'existing. This is the whole fragility of the arrangement in one succession: an '
      + 'institution that has kept a nation together for two thousand years and that can be '
      + 'ended for ever by three deaths in one household.',
    forTag: 'SAM',
    date: { y: 538, m: 4 },
    when: safeWhen('line529', (ctx) => alive(ctx, 'SAM')),
    aiOption: 0,
    historical: 'The Samaritan high priesthood descended in one Aaronide line; when it failed in the seventeenth century the office passed to the Levitical branch, and the community records the date to this day.',
    options: [
      {
        label: 'Seat the boy and govern through a council until he is grown',
        tooltip: '+12 governance points, +8 legitimacy, and "The Council of Elders" (−0.6 unrest everywhere, +4% income) for twelve years. The line is unbroken and the office is empty in every way that matters for a decade.',
        effects: guard('line529:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { gov: 12, legitimacy: 8 });
          mod(ctx, 'SAM', 'council_of_elders', 'The Council of Elders', { unrestAll: -0.6, incomeMult: 1.04 }, 144);
          h.chronicle(ctx, 'era', 'The child is seated and a council of elders governs in his '
            + 'name. The list of names goes on being kept, without a gap in it.');
        }),
      },
      {
        label: 'Write the rule for what happens when the line fails',
        tooltip: '+15 governance points and "The Rule of Succession" (+6% income, −0.5 unrest everywhere) for twenty years. It is not needed for a thousand years and then it is the only thing that saves the office.',
        effects: guard('line529:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { gov: 15 });
          mod(ctx, 'SAM', 'rule_of_succession', 'The Rule of Succession', { incomeMult: 1.06, unrestAll: -0.5 }, 240);
          h.setFlag(ctx, 'priestlyRuleWritten', true);
          h.chronicle(ctx, 'era', 'A rule is written for the day the line fails: which branch, '
            + 'in which order, on whose testimony. Nobody expects to need it.');
        }),
      },
      {
        label: 'Bring back the branch that went to Egypt',
        tooltip: '−35 talents in passages and settlement: +10 legitimacy and "The Returned Branch" (+5% income, +4% growth) for fifteen years, with +0.5 unrest everywhere for six while the families sort out who outranks whom.',
        effects: guard('line529:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -35, legitimacy: 10 });
          mod(ctx, 'SAM', 'the_returned_branch', 'The Returned Branch', { incomeMult: 1.05, growthMult: 1.04, unrestAll: 0.5 }, 180);
          h.chronicle(ctx, 'era', 'The priestly branch that went down to Egypt generations ago '
            + 'is brought back to the mountain, at the community\'s expense, to a reception '
            + 'that is correct rather than warm.');
        }),
      },
    ],
  },

  // ── 546 · the mountain ─────────────────────────────────────────────────────
  {
    id: 'ev529y_the_wills_that_could_not_be_written',
    title: 'The Wills That Could Not Be Written',
    desc: 'The disabilities are not a persecution and they are worse than one. A Samaritan may '
      + 'not testify in a court. He may not inherit, and he may not leave his property by will '
      + 'to anybody but an orthodox heir. He may not hold office, and a man who accepts baptism '
      + 'takes the family estate with him on the day of it.\n\n'
      + 'What this produces in the villages is not martyrdom. It is an entire legal system '
      + 'operating underneath the real one: property held in the names of Christian neighbours '
      + 'who can be trusted, marriages recorded in the community\'s own registers and in no '
      + 'other, wills written in a language no notary reads and enforced by nothing but the '
      + 'certainty that a man who broke one could not live in the valley afterwards. It works '
      + 'for a century, at the price of everybody\'s security depending on everybody else\'s '
      + 'honesty.',
    forTag: 'SAM',
    date: { y: 546, m: 9 },
    when: safeWhen('wills529', (ctx) => alive(ctx, 'SAM')),
    aiOption: 0,
    historical: 'Justinian\'s legislation barred Samaritans from testimony, inheritance and office; Novella 129 (551) eased it after Sergius of Caesarea intervened, and Novella 144 tightened it again.',
    options: [
      {
        label: 'Keep our own registers, and make them better than theirs',
        tooltip: '−30 talents on notaries and copies: +15 governance points and "The Community\'s Register" (+7% income, −0.7 unrest everywhere) for twenty-five years. Every marriage, every deed and every will, in two copies, in two villages.',
        effects: guard('wills529:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -30, gov: 15 });
          mod(ctx, 'SAM', 'community_register', 'The Community\'s Register', { incomeMult: 1.07, unrestAll: -0.7 }, 300);
          h.setFlag(ctx, 'samaritanRegister', true);
          h.chronicle(ctx, 'era', 'The community keeps its own registers of every marriage, '
            + 'deed and will, in duplicate, in two villages. It is not law anywhere. It is '
            + 'obeyed absolutely.');
        }),
      },
      {
        label: 'Hold the land through friends and pay them for it',
        tooltip: '−45 talents a decade in fees and gifts: "The Trusted Neighbours" (+8% income, −0.05 legitimacy a month) for twenty years, while every family in the valley has its future in somebody else\'s name.',
        effects: guard('wills529:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -45 });
          mod(ctx, 'SAM', 'trusted_neighbours', 'The Trusted Neighbours', { incomeMult: 1.08, legitimacyAdd: -0.05 }, 240);
          h.chronicle(ctx, 'era', 'The estates are put in the names of Christian neighbours who '
            + 'can be trusted, for a consideration. Most of them can be trusted, which is the '
            + 'most frightening sentence in the arrangement.');
        }),
      },
      {
        label: 'Petition Constantinople, through the men of Caesarea',
        tooltip: '−55 talents on the embassy: +12 influence points and "The Easing" (+6% income, −0.5 unrest everywhere) for eighteen years. It takes five years and it is partly granted and it is later revoked.',
        effects: guard('wills529:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -55, infl: 12 });
          mod(ctx, 'SAM', 'the_easing', 'The Easing', { incomeMult: 1.06, unrestAll: -0.5 }, 216);
          h.chronicle(ctx, 'diplomacy', 'A petition goes to the capital through the shipowners '
            + 'and bankers of Caesarea, who have an interest and an audience. Part of it is '
            + 'granted, five years later, and revoked in the next reign.');
        }),
      },
    ],
  },

  // ── 548 · the Yemen ────────────────────────────────────────────────────────
  {
    id: 'ev529y_the_inscription_at_marib',
    title: 'The Inscription at Marib',
    desc: 'The great dam has broken again — the sluices undermined, the southern spillway gone, '
      + 'the gardens below silting up while twenty thousand people wait — and repairing it is '
      + 'the one act that makes a king of this country a king of this country. Twenty thousand '
      + 'men are put on it. Three hundred of them die of the sickness in the camps.\n\n'
      + 'And when it is done, what goes up on the stone beside it is not a prayer. It is a '
      + 'guest list: the envoys who came to the celebration, named and ranked — from the '
      + 'Romans, from the Persians, from the negus across the water, from the kings of the '
      + 'northern Arabs. A repair to a wall in a wadi has been converted into a diplomatic '
      + 'congress, and the man who did it is telling everyone who reads stone that the Yemen '
      + 'is a power that receives embassies rather than a province that sends tribute.',
    forTag: 'HMY',
    date: { y: 548, m: 8 },
    when: safeWhen('marib', (ctx) => alive(ctx, 'HMY')),
    aiOption: 0,
    historical: 'Abraha\'s Marib dam inscription of 548 records the repair, the deaths in the camps, and the embassies from Rome, Persia, Aksum and the Arab kings who attended.',
    options: [
      {
        label: 'Repair it, and hold the congress',
        tooltip: '−80 talents: +12 influence points, +10 legitimacy, and "The Dam and the Guest List" (+9% income, +6% growth, −0.5 unrest everywhere) for twenty-five years.',
        effects: guard('marib:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HMY', { treasury: -80, infl: 12, legitimacy: 10 });
          mod(ctx, 'HMY', 'dam_and_guest_list', 'The Dam and the Guest List', { incomeMult: 1.09, growthMult: 1.06, unrestAll: -0.5 }, 300);
          h.setFlag(ctx, 'maribRepaired', true);
          h.chronicle(ctx, 'era', 'The dam is repaired and the envoys of four empires stand in '
            + 'the wadi to watch the water let through. Both halves go onto the stone.');
        }),
      },
      {
        label: 'Repair it quietly and spend nothing on the ceremony',
        tooltip: '−55 talents: +8 legitimacy and "The Water Restored" (+8% income, +6% growth) for twenty-five years. The gardens are watered and nobody outside the country learns anything.',
        effects: guard('marib:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HMY', { treasury: -55, legitimacy: 8 });
          mod(ctx, 'HMY', 'the_water_restored', 'The Water Restored', { incomeMult: 1.08, growthMult: 1.06 }, 300);
          h.setFlag(ctx, 'maribRepaired', true);
          h.chronicle(ctx, 'era', 'The dam is repaired without ceremony. The gardens fill, and '
            + 'no envoy is invited to watch.');
        }),
      },
      {
        label: 'Move the people down to the coast instead',
        tooltip: '−40 talents in resettlement: "The Coast Towns" (+7% income, +7% trade) for twenty-five years, and −10 legitimacy. The gardens go under the sand a generation early and the country becomes a maritime one.',
        effects: guard('marib:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HMY', { treasury: -40, legitimacy: -10 });
          mod(ctx, 'HMY', 'the_coast_towns', 'The Coast Towns', { incomeMult: 1.07, tradeMult: 1.07 }, 300);
          h.chronicle(ctx, 'era', 'The dam is abandoned and the wadi\'s people are moved to the '
            + 'coast. The gardens of Saba go under the sand a generation before they had to.');
        }),
      },
    ],
  },

  // ── 549 · the mountain ─────────────────────────────────────────────────────
  {
    id: 'ev529y_the_mountain_abroad',
    title: 'The Mountain Abroad',
    desc: 'A letter comes from Thessalonica and another from Syracuse, and there is a '
      + 'congregation in Egypt that has been sending its questions to the mountain for six '
      + 'generations. The Keepers are not only on the mountain. There are communities on Delos, '
      + 'in Rome, along the Syrian coast, in Alexandria and up the Nile — merchants, soldiers, '
      + 'shipowners, a whole quiet dispersion that nobody counts because nobody outside is '
      + 'interested in the difference.\n\n'
      + 'They keep the book and the mountain, and they face towards it when they pray, and they '
      + 'have never been ruled from it. The letters are all asking the same thing in different '
      + 'words: whether there is a nation here or only a district that some people happen to '
      + 'come from.',
    forTag: 'SAM',
    date: { y: 549, m: 4 },
    when: safeWhen('abroad529', (ctx) => alive(ctx, 'SAM')),
    aiOption: 0,
    historical: 'Samaritan inscriptions and papyri attest communities at Thessalonica, Delos, Rome, Syracuse and across Egypt. Their relation to the mountain was never institutionalised.',
    options: [
      {
        label: 'Answer every letter, and send a teacher with each answer',
        tooltip: '−45 talents: +12 influence points and "The Dispersion Answered" (+8% income, +5% trade) for twenty-five years. Money and men come back the other way within a decade.',
        effects: guard('abroad529:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -45, infl: 12 });
          mod(ctx, 'SAM', 'dispersion_answered', 'The Dispersion Answered', { incomeMult: 1.08, tradeMult: 1.05 }, 300);
          h.setFlag(ctx, 'samaritanDispersion', true);
          h.chronicle(ctx, 'era', 'Every letter is answered and a teacher goes with every '
            + 'answer. Within ten years the mountain has a revenue that does not come off the '
            + 'mountain.');
        }),
      },
      {
        label: 'Tell them to come home while they still can',
        tooltip: '−60 talents in passages and land: +10 legitimacy and "The Ingathering" (+5% income, +6% growth, +4% manpower) for twenty years. Four hill provinces are not large and they are ours.',
        effects: guard('abroad529:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -60, legitimacy: 10 });
          mod(ctx, 'SAM', 'the_ingathering', 'The Ingathering', { incomeMult: 1.05, growthMult: 1.06, manpowerMult: 1.04 }, 240);
          h.chronicle(ctx, 'era', 'The word goes out to the dispersion to come home. Enough of '
            + 'them do that the valley villages are fuller in five years than in fifty.');
        }),
      },
      {
        label: 'Tell them to stay where they are and keep quiet about it',
        tooltip: '+12 governance points and "The Quiet Congregations" (+6% income, +4% trade, −0.4 unrest everywhere) for twenty-five years. Whatever happens on the mountain, it will not happen to all of us.',
        effects: guard('abroad529:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { gov: 12 });
          mod(ctx, 'SAM', 'quiet_congregations', 'The Quiet Congregations', { incomeMult: 1.06, tradeMult: 1.04, unrestAll: -0.4 }, 300);
          h.chronicle(ctx, 'era', 'The congregations abroad are told to stay abroad and to draw '
            + 'no attention. It is the least heroic instruction the mountain ever issued and '
            + 'the reason there is anybody left to issue instructions to.');
        }),
      },
    ],
  },

  // ── 553 · the mountain ─────────────────────────────────────────────────────
  {
    id: 'ev529y_the_men_of_the_lake',
    title: 'The Men of the Lake',
    desc: 'An approach comes from the north, through a merchant who trades in both directions '
      + 'and is trusted by neither. The Jews of the Galilee are under the same laws, taxed by '
      + 'the same officials, excluded from the same offices, and losing ground at about the '
      + 'same rate; and somebody among them has done the arithmetic and concluded that two '
      + 'communities filing the same petition are harder to ignore than one.\n\n'
      + 'A thousand years of the quarrel says no. The mountain against the city, the book '
      + 'against the book, the two Israels each of which regards the other as the branch that '
      + 'went wrong — and within living memory their rising and ours went off in different '
      + 'years, and each of us watched the other be put down. The merchant points out, with '
      + 'the tactlessness of a man who is paid by the trip, that this is precisely why the '
      + 'proposal is being made now.',
    forTag: 'SAM',
    date: { y: 553, m: 5 },
    when: safeWhen('lake529', (ctx) => alive(ctx, 'SAM')),
    aiOption: 2,
    historical: 'Samaritan and Jewish risings under Justinian were separate and consecutive; the sources record one joint outbreak, at Caesarea in 556, and nothing else.',
    options: [
      {
        label: 'One petition, both names on it',
        tooltip: '−35 talents on the joint embassy: +12 influence points and "The Two Israels" (+7% income, −0.6 unrest everywhere) for twenty years, with −8 legitimacy from the priesthood, who will not sign anything.',
        effects: guard('lake529:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -35, infl: 12, legitimacy: -8 });
          mod(ctx, 'SAM', 'the_two_israels', 'The Two Israels', { incomeMult: 1.07, unrestAll: -0.6 }, 240);
          h.setFlag(ctx, 'twoIsraelsPetition', true);
          h.chronicle(ctx, 'diplomacy', 'One petition goes to the capital with both names on '
            + 'it. It is the first document in a thousand years signed by the mountain and the '
            + 'city together, and it is about tax.');
        }),
      },
      {
        label: 'No petition. A private understanding about the roads',
        tooltip: '+10 governance points and "The Understanding" (+6% income, +5% trade, −0.4 unrest everywhere) for twenty years. Nothing is signed, nothing is admitted, and the caravans of both communities travel together.',
        effects: guard('lake529:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { gov: 10 });
          mod(ctx, 'SAM', 'the_understanding', 'The Understanding', { incomeMult: 1.06, tradeMult: 1.05, unrestAll: -0.4 }, 240);
          h.chronicle(ctx, 'era', 'No document is signed. The caravans of the mountain and the '
            + 'lake begin travelling together, and each community\'s wardens watch the other\'s '
            + 'roads at night.');
        }),
      },
      {
        label: 'A thousand years is a thousand years',
        tooltip: '+10 legitimacy with the priesthood and "The Mountain Alone" (−0.4 unrest everywhere) for fifteen years. Both communities file separately, and both are answered separately, and one of them is answered first.',
        effects: guard('lake529:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { legitimacy: 10 });
          mod(ctx, 'SAM', 'the_mountain_alone', 'The Mountain Alone', { unrestAll: -0.4 }, 180);
          h.chronicle(ctx, 'era', 'The approach from the north is refused. Both petitions go up '
            + 'separately, as they have for a thousand years, and are dealt with in the order '
            + 'the clerks prefer.');
        }),
      },
    ],
  },

  // ── 558 · the mountain ─────────────────────────────────────────────────────
  {
    id: 'ev529y_the_terraces',
    title: 'The Terraces',
    desc: 'The mountain is not good land and has never been good land. What makes it feed '
      + 'anybody is two thousand years of walls — dry-stone terraces stepped up every hillside '
      + 'in the district, each one holding a strip of soil that would otherwise be in the '
      + 'valley, each one needing a man to walk it after every winter and put back what the '
      + 'rain took out.\n\n'
      + 'A decade of risings and reprisals has meant a decade of nobody walking them. The '
      + 'survey the elders have had done is the first honest count since the troubles and it is '
      + 'bad: a fifth of the terracing is gone, and terracing that is gone takes the soil with '
      + 'it and does not come back within a lifetime. There is no imperial relief for this and '
      + 'there is no substitute for it. Either the community goes back up the hillsides with '
      + 'stones in its hands or the district feeds fewer people every year for ever.',
    forTag: 'SAM',
    date: { y: 558, m: 6 },
    when: safeWhen('terr529', (ctx) => alive(ctx, 'SAM')),
    aiOption: 0,
    historical: 'The terraced agriculture of the Samarian hills is the oldest continuous farming system in the region; abandoned terraces lose their soil within a few seasons.',
    options: [
      {
        label: 'Every man three weeks a year on the walls',
        tooltip: '−25 talents in lost labour: +10 legitimacy and "The Walls Kept" (+9% income, +7% growth, −0.5 unrest everywhere) for thirty years. It is a levy of work rather than of money, and it is the only one anybody pays gladly.',
        effects: guard('terr529:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -25, legitimacy: 10 });
          mod(ctx, 'SAM', 'the_walls_kept', 'The Walls Kept', { incomeMult: 1.09, growthMult: 1.07, unrestAll: -0.5 }, 360);
          h.setFlag(ctx, 'terracesKept', true);
          h.chronicle(ctx, 'era', 'Every man of the district gives three weeks a year to the '
            + 'terraces. Within five years the hillsides are whole again and the survey is '
            + 'not repeated for a generation.');
        }),
      },
      {
        label: 'Hire the labour and keep the men in the trades',
        tooltip: '−70 talents: "The Hired Walls" (+7% income, +5% growth, +4% trade) for twenty-five years. The terraces are rebuilt by other people\'s hands and the community\'s own stay on the looms.',
        effects: guard('terr529:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -70 });
          mod(ctx, 'SAM', 'the_hired_walls', 'The Hired Walls', { incomeMult: 1.07, growthMult: 1.05, tradeMult: 1.04 }, 300);
          h.chronicle(ctx, 'era', 'The terraces are rebuilt with hired labour from the coast '
            + 'while the district\'s own men stay at their trades. It costs three times as '
            + 'much and produces twice as much.');
        }),
      },
      {
        label: 'Let the high ground go and farm the valley',
        tooltip: '+40 talents saved and "The Valley Only" (+5% income) for twenty-five years, with −5% manpower and −6 legitimacy. The district feeds fewer people every year, and the people it stops feeding go to the coast.',
        effects: guard('terr529:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: 40, legitimacy: -6 });
          mod(ctx, 'SAM', 'the_valley_only', 'The Valley Only', { incomeMult: 1.05, manpowerMult: 0.95 }, 300);
          h.chronicle(ctx, 'era', 'The high terraces are abandoned and the farming withdraws to '
            + 'the valley floor. The hillsides are bare inside ten years and the young men are '
            + 'on the coast inside twenty.');
        }),
      },
    ],
  },

  // ── 560 · the Yemen ────────────────────────────────────────────────────────
  {
    id: 'ev529y_the_frankincense_ledger',
    title: 'The Frankincense Ledger',
    desc: 'The customs registers of the northern road show a trade that has been shrinking for '
      + 'a hundred years and nobody in this court has ever put the figures side by side before. '
      + 'The incense still grows where it always grew. What has changed is the road: the ships '
      + 'take it now — out of the ports, up the Red Sea with the monsoon, into Egypt — and a '
      + 'cargo that used to spend eight weeks paying tolls to the caravan towns spends twelve '
      + 'days paying one shipowner.\n\n'
      + 'And the market at the far end is thinning too. The temples that burned it by the ton '
      + 'are closing, and the religion that is replacing them uses a fraction of the quantity. '
      + 'A kingdom whose entire wealth is one aromatic resin is discovering, slowly, that the '
      + 'world has stopped wanting quite as much of it — which is a harder problem than any '
      + 'invasion, because there is nobody to fight.',
    forTag: 'HMY',
    date: { y: 560, m: 4 },
    when: safeWhen('incense', (ctx) => alive(ctx, 'HMY')),
    aiOption: 0,
    historical: 'The overland incense route declined through late antiquity as Red Sea shipping and the closing of the pagan temples cut both the transit and the demand.',
    options: [
      {
        label: 'Own the ships',
        tooltip: '−70 talents into hulls and crews: "The Monsoon Fleet" (+10% income, +9% trade, +5% fleet strength) for twenty-five years. If the cargo is going by sea, the sea is where the revenue is.',
        effects: guard('incense:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HMY', { treasury: -70 });
          mod(ctx, 'HMY', 'the_monsoon_fleet', 'The Monsoon Fleet', { incomeMult: 1.10, tradeMult: 1.09, navalMult: 1.05 }, 300);
          h.setFlag(ctx, 'monsoonFleet', true);
          h.chronicle(ctx, 'era', 'The crown buys hulls instead of defending tolls. Within a '
            + 'decade the incense leaves the country in the country\'s own bottoms.');
        }),
      },
      {
        label: 'Tax the harbours and let the caravan towns fail',
        tooltip: '+60 talents and "The Harbour Dues" (+8% income) for twenty years, with +0.8 unrest everywhere for eight as the inland towns lose the only reason anybody ever stopped there.',
        effects: guard('incense:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HMY', { treasury: 60 });
          mod(ctx, 'HMY', 'the_harbour_dues', 'The Harbour Dues', { incomeMult: 1.08, unrestAll: 0.8 }, 240);
          h.chronicle(ctx, 'era', 'The dues are moved from the road to the harbours. The '
            + 'caravan towns of the interior are told, in effect, that their century is over.');
        }),
      },
      {
        label: 'Grow something else',
        tooltip: '−50 talents into terracing, coffee-country irrigation and the highland crops: "The Highland Fields" (+7% income, +8% growth) for thirty years. The country stops being one commodity, slowly and at a loss.',
        effects: guard('incense:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HMY', { treasury: -50 });
          mod(ctx, 'HMY', 'the_highland_fields', 'The Highland Fields', { incomeMult: 1.07, growthMult: 1.08 }, 360);
          h.chronicle(ctx, 'era', 'The money goes into the highland terraces and the water that '
            + 'feeds them. It will be two generations before anybody can say whether it '
            + 'worked.');
        }),
      },
    ],
  },

  // ── 562 · the mountain ─────────────────────────────────────────────────────
  {
    id: 'ev529y_the_children_in_the_font',
    title: 'The Children in the Font',
    desc: 'The instruction from the bishop\'s house is that the children of the villages are to '
      + 'be baptised, and that families which do not present them will be assessed for the '
      + 'estate tax at the rate for lapsed heretics, which is designed to be unpayable. Nobody '
      + 'is being dragged anywhere. The mechanism is a form, a date and a fee.\n\n'
      + 'What the elders have to decide is what a family should do, and every answer is a bad '
      + 'one. Present the children and the community is Christian on paper within a generation, '
      + 'whatever it does at home. Refuse and the villages are ruined by a tax within three '
      + 'years. Present them and teach them anyway, which is what a great many families will do '
      + 'regardless of any ruling — and produces a people who are baptised, registered, '
      + 'observant in secret, and permanently at the mercy of anybody who informs.',
    forTag: 'SAM',
    date: { y: 562, m: 3 },
    when: safeWhen('font529', (ctx) => alive(ctx, 'SAM')),
    aiOption: 2,
    historical: 'Coerced baptism through fiscal pressure was the standard sixth-century instrument against the Samaritans; Procopius says the country was filled with people who conformed outwardly and believed nothing of it.',
    options: [
      {
        label: 'Refuse, and pay the tax out of the common fund',
        tooltip: '−95 talents: +15 legitimacy, +1 stability, and "The Fund That Paid" (−0.8 unrest everywhere, +4% manpower) for twenty years. The community is intact and it is poor for a generation.',
        effects: guard('font529:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -95, legitimacy: 15, stability: 1 });
          mod(ctx, 'SAM', 'the_fund_that_paid', 'The Fund That Paid', { unrestAll: -0.8, manpowerMult: 1.04 }, 240);
          h.setFlag(ctx, 'baptismRefused', true);
          h.chronicle(ctx, 'era', 'The villages refuse and the common fund pays the penalty '
            + 'rate for every one of them. It empties the fund and no child is presented.');
        }),
      },
      {
        label: 'Present them, and rule that a coerced rite binds nobody',
        tooltip: '+15 governance points and "Water and Nothing Else" (+6% income, −0.4 unrest everywhere) for twenty-five years, with −8 legitimacy. It is a ruling the priesthood accepts and does not forgive.',
        effects: guard('font529:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { gov: 15, legitimacy: -8 });
          mod(ctx, 'SAM', 'water_and_nothing_else', 'Water and Nothing Else', { incomeMult: 1.06, unrestAll: -0.4 }, 300);
          h.chronicle(ctx, 'era', 'The court rules that a rite performed under compulsion binds '
            + 'nobody and that a father who presents his child has not given him away. The '
            + 'children are presented. The teaching goes on at home.');
        }),
      },
      {
        label: 'Let each family decide and ask nobody afterwards',
        tooltip: '+10 legitimacy and "No Questions Asked" (−0.6 unrest everywhere, +3% income) for twenty years. Half the district conforms on paper, the other half pays, and neither half is allowed to reproach the other.',
        effects: guard('font529:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { legitimacy: 10 });
          mod(ctx, 'SAM', 'no_questions_asked', 'No Questions Asked', { unrestAll: -0.6, incomeMult: 1.03 }, 240);
          h.chronicle(ctx, 'era', 'Every family decides for itself and it is made a rule that '
            + 'nobody may be asked afterwards which way they decided. The rule holds, which '
            + 'is the remarkable part.');
        }),
      },
    ],
  },

  // ── 569 · the Yemen ────────────────────────────────────────────────────────
  {
    id: 'ev529y_the_road_north',
    title: 'The Road North',
    desc: 'The proposal on the table is a march up the western road into the Hijaz — nominally '
      + 'to protect the pilgrim traffic and the client tribes, actually to put the trade of the '
      + 'northern towns under this crown\'s hand and to answer a shrine at Mecca that has been '
      + 'drawing away the caravans and the custom that used to come south.\n\n'
      + 'The country beyond the frontier is not a country. It is a network of wells, guides and '
      + 'agreements between families, and an army that goes into it moves at the speed of the '
      + 'wells and eats at the mercy of the guides. Every kingdom that has ever tried it has '
      + 'come back with fewer men than it took and a story about why the failure was somebody '
      + 'else\'s fault, and every one of those stories has been believed by the next kingdom '
      + 'to try.',
    forTag: 'HMY',
    date: { y: 569, m: 5 },
    when: safeWhen('north', (ctx) => alive(ctx, 'HMY')),
    aiOption: 1,
    historical: 'Abraha\'s expedition north — the Year of the Elephant of Arab tradition — ended in disaster. The date is disputed and the memory of it is not.',
    options: [
      {
        label: 'March',
        tooltip: '−60 talents and +12 martial points, with "The Northern Expedition" (+8% manpower, +6% morale) for six years and then "What Came Back" (−9% income, −8% manpower, +1.0 unrest everywhere) for twelve. The road north has never yet paid anybody.',
        effects: guard('north:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HMY', { treasury: -60, mar: 12 });
          mod(ctx, 'HMY', 'northern_expedition', 'The Northern Expedition', { manpowerMult: 1.08, moraleMult: 1.06 }, 72);
          mod(ctx, 'HMY', 'what_came_back', 'What Came Back', { incomeMult: 0.91, manpowerMult: 0.92, unrestAll: 1.0 }, 144);
          h.setFlag(ctx, 'roadNorthTaken', true);
          h.chronicle(ctx, 'war', 'The army goes north up the western road. What comes back is '
            + 'smaller than what went, and the story of why is told in the north for three '
            + 'hundred years.');
        }),
      },
      {
        label: 'Buy the wells and the guides instead',
        tooltip: '−45 talents a decade in subsidies to the tribes who hold the road: +12 influence points and "The Paid Road" (+9% income, +7% trade) for twenty-five years. Cheaper than one campaign and it has to be paid every year.',
        effects: guard('north:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HMY', { treasury: -45, infl: 12 });
          mod(ctx, 'HMY', 'the_paid_road', 'The Paid Road', { incomeMult: 1.09, tradeMult: 1.07 }, 300);
          h.chronicle(ctx, 'diplomacy', 'The wells and the guides of the northern road are '
            + 'bought rather than taken. It is cheaper than a campaign and it never stops '
            + 'being due.');
        }),
      },
      {
        label: 'Let the north keep its shrine and its caravans',
        tooltip: '+12 governance points and "The Southern Kingdom" (+7% income, +6% growth, −0.5 unrest everywhere) for twenty-five years. Everything spent on the road is spent at home instead.',
        effects: guard('north:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'HMY', { gov: 12 });
          mod(ctx, 'HMY', 'the_southern_kingdom', 'The Southern Kingdom', { incomeMult: 1.07, growthMult: 1.06, unrestAll: -0.5 }, 300);
          h.chronicle(ctx, 'era', 'The expedition is refused. The north keeps its shrine and '
            + 'its caravans, and the money that would have gone up the road goes into the '
            + 'highlands.');
        }),
      },
    ],
  },

  // ── 580 · the mountain ─────────────────────────────────────────────────────
  {
    id: 'ev529y_the_pilgrims_road',
    title: 'The Pilgrims\' Road',
    desc: 'The road from the coast to the holy city runs straight through the district and '
      + 'there are more people on it every year: pilgrims from Gaul, from Spain, from Egypt, '
      + 'travelling in parties of forty with money, letters of credit, and a written itinerary '
      + 'that tells them which villages are safe.\n\n'
      + 'They need food, water, mules, guides, roofs and somebody to change their coin, and '
      + 'every one of those is a business. They also carry with them the assumption that this '
      + 'is their country now, and the ones who have read their guidebooks arrive knowing that '
      + 'the local population is a heretical remnant of some kind. Two villages have already '
      + 'had a party of them stop for the night and preach in the square. The revenue is not '
      + 'small and the argument at the elders\' table is whether a district can take a '
      + 'stranger\'s money every summer and remain a district he cannot change.',
    forTag: 'SAM',
    date: { y: 580, m: 6 },
    when: safeWhen('road529', (ctx) => alive(ctx, 'SAM')),
    aiOption: 0,
    historical: 'The pilgrim traffic through Palestine peaked in the sixth century; the Piacenza Pilgrim describes the route through Samaria and the people on it with the confidence of a man holding a guidebook.',
    options: [
      {
        label: 'Take the trade, and set the terms of it',
        tooltip: '−30 talents on hostels, wells and licensed guides: "The Pilgrim Trade" (+10% income, +7% trade) for twenty-five years, with a rule that nobody preaches in a village square and a warden on every stage to enforce it.',
        effects: guard('road529:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -30 });
          mod(ctx, 'SAM', 'the_pilgrim_trade', 'The Pilgrim Trade', { incomeMult: 1.10, tradeMult: 1.07 }, 300);
          h.setFlag(ctx, 'pilgrimTradeTaken', true);
          h.chronicle(ctx, 'era', 'Hostels, wells and licensed guides go up along the road, and '
            + 'a rule with them: no preaching in a village square. Both halves are enforced by '
            + 'the same wardens.');
        }),
      },
      {
        label: 'Move the road around the villages',
        tooltip: '−55 talents to cut and maintain a bypass: +10 legitimacy and "The Road Around" (+5% income, −0.7 unrest everywhere) for twenty-five years. Less money, and the district is unchanged in forty years.',
        effects: guard('road529:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -55, legitimacy: 10 });
          mod(ctx, 'SAM', 'the_road_around', 'The Road Around', { incomeMult: 1.05, unrestAll: -0.7 }, 300);
          h.chronicle(ctx, 'era', 'A bypass is cut around the villages at the district\'s own '
            + 'expense. The pilgrims are served, at a distance, by people who go out to meet '
            + 'them and come home at night.');
        }),
      },
      {
        label: 'Take everything they will spend and worry later',
        tooltip: '+80 talents and "The Summer Money" (+12% income, +8% trade) for fifteen years, with +0.9 unrest everywhere for the same: the villages are richer every year and less recognisable every decade.',
        effects: guard('road529:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: 80 });
          mod(ctx, 'SAM', 'the_summer_money', 'The Summer Money', { incomeMult: 1.12, tradeMult: 1.08, unrestAll: 0.9 }, 180);
          h.chronicle(ctx, 'era', 'Everything the pilgrims will spend is taken and nothing is '
            + 'regulated. The villages on the road are the richest in the district and the '
            + 'least like the district.');
        }),
      },
    ],
  },

  // ── 588 · the mountain ─────────────────────────────────────────────────────
  {
    id: 'ev529y_the_well_at_sychar',
    title: 'The Well at Sychar',
    desc: 'They are building a church over the well. It is the deepest well in the district and '
      + 'the oldest thing anybody here can point to — the patriarch\'s own, dug where he '
      + 'pitched, used every day by the women of the town for as long as there has been a town '
      + '— and its ownership has never been in question because nobody thought a well could be '
      + 'owned.\n\n'
      + 'The building going up over it is cruciform, and there will be a stair down to the '
      + 'water, and it will be served by clergy who will decide who may draw. The theft is '
      + 'real and it is also, precisely, a citation: the church is there because of one '
      + 'conversation recorded in a gospel, between a teacher from the Galilee and a woman of '
      + 'this town, in which he told her that the hour was coming when men would worship '
      + 'neither on this mountain nor at Jerusalem. Five centuries later somebody has built a '
      + 'building on the spot to make sure the point is not missed.',
    forTag: 'SAM',
    date: { y: 588, m: 7 },
    when: safeWhen('well529', (ctx) => alive(ctx, 'SAM')),
    aiOption: 1,
    historical: 'The church over Jacob\'s Well at Sychar, beside Neapolis, was built in the fourth century and rebuilt repeatedly. The well is still there and still deep.',
    options: [
      {
        label: 'Litigate the water rights, village by village, for as long as it takes',
        tooltip: '−45 talents on advocates: +12 governance points and "The Water Suit" (+5% income, −0.4 unrest everywhere) for twenty years. The building goes up and the right to draw from it is written down as ours.',
        effects: guard('well529:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -45, gov: 12 });
          mod(ctx, 'SAM', 'the_water_suit', 'The Water Suit', { incomeMult: 1.05, unrestAll: -0.4 }, 240);
          h.chronicle(ctx, 'era', 'The right to draw from the well is litigated for nine years '
            + 'and established in writing. The church is built over it and the women of the '
            + 'town go on drawing.');
        }),
      },
      {
        label: 'Dig three new wells and let them have that one',
        tooltip: '−60 talents: +10 legitimacy and "The New Wells" (+7% income, +6% growth, −0.5 unrest everywhere) for twenty-five years. Nobody has to ask a stranger for water, which is the only part of this that was ever urgent.',
        effects: guard('well529:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -60, legitimacy: 10 });
          mod(ctx, 'SAM', 'the_new_wells', 'The New Wells', { incomeMult: 1.07, growthMult: 1.06, unrestAll: -0.5 }, 300);
          h.chronicle(ctx, 'era', 'Three new wells are sunk in the town at the community\'s own '
            + 'cost. The old one keeps its church, its stair and its clergy, and nobody from '
            + 'the district goes down it again.');
        }),
      },
      {
        label: 'Answer the citation',
        tooltip: '+12 legitimacy and "Neither on This Mountain" (−0.5 unrest everywhere, +4% income) for twenty years: the community writes down what it holds about the mountain, at length, and copies it into every hall in the district.',
        effects: guard('well529:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { legitimacy: 12 });
          mod(ctx, 'SAM', 'neither_on_this_mountain', 'Neither on This Mountain', { unrestAll: -0.5, incomeMult: 1.04 }, 240);
          h.chronicle(ctx, 'era', 'The community answers the verse in writing, at length, and '
            + 'copies the answer into every hall in the district. It is read out once a year '
            + 'for six hundred years.');
        }),
      },
    ],
  },

  // ── 594 · the mountain ─────────────────────────────────────────────────────
  {
    id: 'ev529y_the_sickness_comes_back',
    title: 'The Sickness Comes Back',
    desc: 'It came the first time when the old men were children and killed a third of '
      + 'everybody, and everybody assumed that was that. It was not. It comes back every '
      + 'twelve to fifteen years now, always in summer, always up from the ports, and each '
      + 'return takes fewer than the last only because there are fewer people for it to take.\n\n'
      + 'A community of this size cannot absorb it the way an empire can. An empire loses a '
      + 'third of a province and refills it from another province; four hill districts that '
      + 'lose a third of a generation lose it permanently, and the arithmetic of a people whose '
      + 'numbers only go down is not a crisis, it is a slope. The elders have started doing '
      + 'the sums that nobody wants to write on a page: how many households in the district, '
      + 'how many the district needs, and how many years there are between those two numbers.',
    forTag: 'SAM',
    date: { y: 594, m: 5 },
    when: safeWhen('sick529', (ctx) => alive(ctx, 'SAM')),
    aiOption: 0,
    historical: 'The Justinianic plague recurred roughly every fifteen years for two centuries. Small closed communities recovered from it far more slowly than large ones, if at all.',
    options: [
      {
        label: 'Shut the district in the plague summers',
        tooltip: '−40 talents in lost trade each time: +10 legitimacy and "The Closed Summers" (+5% manpower, +4% growth, −0.5 unrest everywhere) for thirty years. Poorer, and there are more people alive at the end of it.',
        effects: guard('sick529:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -40, legitimacy: 10 });
          mod(ctx, 'SAM', 'the_closed_summers', 'The Closed Summers', { manpowerMult: 1.05, growthMult: 1.04, unrestAll: -0.5 }, 360);
          h.setFlag(ctx, 'closedSummers', true);
          h.chronicle(ctx, 'era', 'The district closes its roads every plague summer: no '
            + 'caravans, no pilgrims, no market. It costs the trade of one season in three and '
            + 'the burials are fewer every time.');
        }),
      },
      {
        label: 'Bring in whoever will come and marry them in',
        tooltip: '−35 talents in dowries and land: +8 governance points and "The New Households" (+6% growth, +5% manpower, +4% income) for twenty-five years, with −8 legitimacy from the priesthood over the marriage rules.',
        effects: guard('sick529:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -35, gov: 8, legitimacy: -8 });
          mod(ctx, 'SAM', 'the_new_households', 'The New Households', { growthMult: 1.06, manpowerMult: 1.05, incomeMult: 1.04 }, 300);
          h.chronicle(ctx, 'era', 'The marriage rules are loosened and households are brought '
            + 'in from wherever they can be found. The priesthood objects in writing and '
            + 'performs the ceremonies.');
        }),
      },
      {
        label: 'Bury the dead and go on',
        tooltip: '+10 legitimacy with the priesthood and "As It Has Always Been" (−0.4 unrest everywhere) for twenty years, with −5% manpower and −4% growth. Nothing is changed, and the sums the elders did are put in a drawer.',
        effects: guard('sick529:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { legitimacy: 10 });
          mod(ctx, 'SAM', 'as_it_has_always_been', 'As It Has Always Been', { unrestAll: -0.4, manpowerMult: 0.95, growthMult: 0.96 }, 240);
          h.chronicle(ctx, 'era', 'Nothing is changed. The dead are buried in the proper way and '
            + 'the count of the households is not read out again.');
        }),
      },
    ],
  },

  // ── 604 · the mountain ─────────────────────────────────────────────────────
  {
    id: 'ev529y_the_levy_for_a_war_in_persia',
    title: 'The Levy for a War in Persia',
    desc: 'The recruiting officers are in the district. There is a war in the east against the '
      + 'King of Kings, the field army has been stripped to fight it, and the quota for these '
      + 'four provinces has been set by somebody in a chancery who has read a tax register and '
      + 'nothing else.\n\n'
      + 'This is a community that may not testify in a court, may not leave its property to its '
      + 'own children and may not hold any office, being asked for its sons to fight for the '
      + 'state that arranged all three. The officers are not interested in the irony and they '
      + 'are entitled to the men. What is genuinely in question is whether it is better to send '
      + 'them — which puts a few hundred of ours under arms, trained, paid, and legally '
      + 'soldiers of the empire, which is a status nothing else on offer can produce — or to '
      + 'buy the quota out and keep everybody at home for whatever is coming down the coast '
      + 'road.',
    forTag: 'SAM',
    date: { y: 604, m: 6 },
    when: safeWhen('levy529', (ctx) => alive(ctx, 'SAM')),
    aiOption: 1,
    historical: 'Phocas\' Persian war stripped the eastern provinces of troops. Ten years later there was nothing between the Persian army and the coast road.',
    options: [
      {
        label: 'Send them, and make sure they come back trained',
        tooltip: '−30 talents on equipment: +10 martial points and "The Men Who Served" (+8% manpower, +5% morale, +1 defence in hill country) for twenty years. Some of them do not come back and the ones who do have been in a real army.',
        effects: guard('levy529:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -30, mar: 10 });
          mod(ctx, 'SAM', 'the_men_who_served', 'The Men Who Served', { manpowerMult: 1.08, moraleMult: 1.05, hillDefBonus: 1 }, 240);
          h.setFlag(ctx, 'servedTheLevy', true);
          h.chronicle(ctx, 'war', 'The quota is filled and the men go east. The ones who come '
            + 'back have served in a field army, and in ten years that turns out to matter '
            + 'more than anything else in this decade.');
        }),
      },
      {
        label: 'Buy the quota out',
        tooltip: '−85 talents: +8 legitimacy and "The Quota Bought" (−0.6 unrest everywhere, +4% growth) for eighteen years. Nobody\'s son goes to Mesopotamia and the treasury is empty for four years.',
        effects: guard('levy529:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -85, legitimacy: 8 });
          mod(ctx, 'SAM', 'the_quota_bought', 'The Quota Bought', { unrestAll: -0.6, growthMult: 1.04 }, 216);
          h.chronicle(ctx, 'era', 'The levy is bought out at the going rate. Not one household '
            + 'in the district sends a son east, and the fund is empty until 608.');
        }),
      },
      {
        label: 'Refuse it, and let them come and count us',
        tooltip: '+12 legitimacy, +8 martial points, and "The Quota Refused" (+6% manpower, +1.1 unrest everywhere) for twelve years. It is a small defiance and it is written into a file that is still open ten years later.',
        effects: guard('levy529:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { legitimacy: 12, mar: 8 });
          mod(ctx, 'SAM', 'the_quota_refused', 'The Quota Refused', { manpowerMult: 1.06, unrestAll: 1.1 }, 144);
          h.chronicle(ctx, 'war', 'The quota is refused outright. Nothing happens for two '
            + 'years, and the refusal is in a file, and files in this empire are read out '
            + 'later by people who were not there.');
        }),
      },
    ],
  },
];
