// Judaea Universalis — the Greek Jerusalem (SPEC §171). Content package: zero
// imports, keyed on the Hasmonean crown of the 167 chapter.
//
// WHY THIS BRANCH EXISTS. The Maccabean chapter has forty cards about refusing
// the Greek way of doing things and none about taking it. That is not a
// balanced chapter; it is a chapter with one road and a lot of scenery, and it
// leaves the game unable to represent the thing the sources are actually most
// anxious about — that the Hellenizing party had a real programme, real
// support in the priestly aristocracy and the coastal cities, and came within
// one Seleucid civil war of simply winning.
//
// THE RECORD. Jason bought the High Priesthood from Antiochus IV for 360
// talents and 80 more for the right to enrol the men of Jerusalem as citizens
// of an Antioch-at-Jerusalem — a Greek polis constitution laid over the Temple
// state, with a gymnasium under the citadel and an ephebate (2 Macc. 4:7-15).
// Menelaus then outbid him by 300 talents and the office left the high-priestly
// line entirely. The programme was not an occupation; it was a domestic party
// with a foreign patron, and its own account of itself — "let us go and make a
// covenant with the nations round about us, for since we separated ourselves
// from them many evils have come upon us" (1 Macc. 1:11) — is an argument about
// what had gone wrong, not a confession of treason.
//
// WHAT MAKES IT PLAYABLE NOW. Before §166 this branch could only have been
// flavour: a player could keep the Hellenizers on the floor for a century and
// pay nothing for it. Now refusing the Greek chancery is a standing surcharge
// on every level of every technology ladder, and the chancery will not cross
// into the Jewish hill country on its own — so a crown that wants to stop being
// structurally behind has exactly two roads, and this is the second one.
//
// The branch is gated on BOTH: the Hellenizers strong at court AND the chancery
// actually embraced. Neither alone is a programme. Together they are the
// counterfactual the chapter was missing, and they feed the Road Not Taken.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_167bce_hellenizers] ' + key, e || '');
}
function guard(key, fn) {
  return function (ctx) {
    try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); }
  };
}
function safeTrigger(key, fn) {
  return function (ctx) {
    try { return !!fn(ctx); } catch (e) { warnOnce('trigger:' + key, e); return false; }
  };
}
function who(ctx, tag) {
  return (ctx && ctx.helpers && ctx.helpers.livingTag) ? ctx.helpers.livingTag(ctx, tag) : tag;
}
function alive(ctx, tag) {
  const t = ctx.game.tags[tag];
  return !!(t && t.alive);
}
function crown(ctx) {
  for (const t of ['HAS', 'MLI']) {
    const held = who(ctx, t);
    if (alive(ctx, held)) return held;
  }
  return null;
}
function flag(ctx, key) {
  return !!(ctx.game.flags && ctx.game.flags[key]);
}
function isPlayer(ctx, tag) {
  return !!tag && ctx.game.playerTag === tag;
}
// The party's standing at court, or null where no court sits (an AI hand).
function hellenizers(ctx, tag) {
  const h = ctx.helpers;
  if (!h || typeof h.faction !== 'function') return null;
  const v = h.faction(ctx, tag, 'hellenizers');
  return Number.isFinite(v) ? v : null;
}
// …and whether the realm has actually taken up the Greek chancery (§166). The
// content package may not import the sim, so it reads the tag's own record,
// which is plain data on the game state.
function embracedChancery(ctx, tag) {
  const t = ctx.game.tags[tag];
  return !!(t && Array.isArray(t.embraced) && t.embraced.indexOf('chancery') >= 0);
}
function holdsJerusalem(ctx, tag) {
  const p = ctx.prov ? ctx.prov('Jerusalem') : null;
  return !!(p && p.owner === tag && p.controller === tag);
}

export const EVENTS_167_HELLENIZERS = [
  {
    id: 'ev_hz_antioch_at_jerusalem',
    title: 'Antioch-at-Jerusalem',
    desc: 'The petition has been drawn up in proper form, because the men who drew '
      + 'it up were trained to draw up petitions: the citizens of Jerusalem request '
      + 'a charter. A council, an assembly, a register of enrolled citizens, a '
      + 'gymnasium under the citadel, and the city\'s name entered on the lists as '
      + 'Antioch-at-Jerusalem. They are not asking to stop being Jews. They are '
      + 'asking to stop being provincial — to be a city that Alexandria and Antioch '
      + 'and Pergamon recognise as the same kind of thing they are, with the same '
      + 'kind of law and the same kind of young men. Their argument is the one they '
      + 'have always made and it has not got worse: we separated ourselves from the '
      + 'nations round about us, and since then many evils have come upon us. The '
      + 'chancery already works in Greek. This only asks the city to admit it.',
    forTag: 'player',
    major: true,
    minYear: -160,
    maxYear: -40,
    trigger: safeTrigger('ev_hz_antioch_at_jerusalem', (ctx) => {
      const me = crown(ctx);
      if (!me || !isPlayer(ctx, me)) return false;
      if (flag(ctx, 'greekJerusalem') || flag(ctx, 'charterRefused')) return false;
      if (!embracedChancery(ctx, me)) return false;
      if (!holdsJerusalem(ctx, me)) return false;
      const h = hellenizers(ctx, me);
      return h !== null && h >= 70;
    }),
    aiOption: 1,
    historical: 'Jason bought the office and the charter from Antiochus IV in 175 BCE (2 Macc. 4:7-15); Menelaus outbid him three years later. The rising of 167 ended the experiment, and the Hasmoneans who ended it went on to rule a Greek-speaking kingdom with a Greek chancery and bilingual coins.',
    options: [
      {
        label: 'Grant the charter. Let the city be a city.',
        tooltip: 'Jerusalem takes a polis constitution over the Temple state. +15% income and +10% trade permanently, the whole realm integrates faster, and the coastal cities stop being foreign. The Hellenizers become the government (+20); the pious parties do not forgive it (−25 each), and the countryside carries a standing grievance the crown will be answering for the rest of the chapter. Opens the Greek Jerusalem.',
        effects: guard('ev_hz_antioch_at_jerusalem:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          h.addTagModifier(ctx, me, {
            id: 'antioch_at_jerusalem', name: 'Antioch-at-Jerusalem', months: -1,
            effects: { incomeMult: 1.15, tradeMult: 1.10, integrateMult: 1.2, unrestAll: 1.2 },
          });
          h.factionShift(ctx, me, 'hellenizers', 20);
          h.factionShift(ctx, me, 'hasideans', -25);
          h.factionShift(ctx, me, 'pharisees', -25);
          h.doctrine(ctx, 'zeal', -3);
          h.doctrine(ctx, 'alignment', 2);
          h.setFlag(ctx, 'greekJerusalem', true);
          h.chronicle(ctx, 'era', 'Jerusalem is entered on the lists as Antioch-at-Jerusalem: a council, an assembly, and a register of citizens.');
        }),
      },
      {
        label: 'The city has a constitution. It was given at Sinai.',
        tooltip: 'The petition is refused in the one language that ends the argument. +1 stability, +8 legitimacy, the pious parties are satisfied (+15 each) and the Hellenizers are told where they stand (−20). The Greek chancery stays a tool of the crown rather than a constitution — and the surcharge on technology that refusing it costs, you keep paying.',
        effects: guard('ev_hz_antioch_at_jerusalem:1', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          h.adjust(ctx, me, { stability: 1, legitimacy: 8 });
          h.factionShift(ctx, me, 'hasideans', 15);
          h.factionShift(ctx, me, 'pharisees', 15);
          h.factionShift(ctx, me, 'hellenizers', -20);
          h.doctrine(ctx, 'zeal', 2);
          h.setFlag(ctx, 'charterRefused', true);
          h.chronicle(ctx, 'era', 'The petition for a charter is refused: this city was given its constitution at Sinai.');
        }),
      },
    ],
  },

  {
    id: 'ev_hz_the_ephebate',
    title: 'The Young Men of the Gymnasium',
    desc: 'The gymnasium is built and full, and the problem it has produced was not '
      + 'the one anyone argued about. Nobody minds the wrestling. What the priests '
      + 'mind is that the priests are at it — the sources will say the young men of '
      + 'the priestly courses hurried through the sacrifices to get to the discus, '
      + 'which is either a scandal or a report that the Temple\'s own staff found '
      + 'the new city more interesting than the old one. And the ephebate has a '
      + 'graduation, and the graduation has a procession, and the procession passes '
      + 'a statue. Nobody has asked the young men to sacrifice to it. Nobody has '
      + 'asked them not to walk past it either, and that is the whole question: '
      + 'where exactly does a Jew who is also a citizen stop.',
    forTag: 'player',
    minYear: -155,
    maxYear: -30,
    trigger: safeTrigger('ev_hz_the_ephebate', (ctx) => {
      const me = crown(ctx);
      return !!me && isPlayer(ctx, me) && flag(ctx, 'greekJerusalem') && !flag(ctx, 'ephebateSettled');
    }),
    aiOption: 0,
    historical: '2 Macc. 4:14-15 has the priests neglecting the altar for the palaestra. The ephebate was the enrolment that made a young man a citizen; what it required of a Jew was the question nobody in the sources answers the same way twice.',
    options: [
      {
        label: 'Write the exemption into the charter',
        tooltip: 'The ephebate keeps its procession and the Jewish citizens keep their exemption from the statue, in writing, as a term of the constitution. It works, and it is the first time anyone has tried: +6 legitimacy, +1 stability, and the pious parties recover a little (+8). A city can be Greek in its law and Jewish in its altar — on paper.',
        effects: guard('ev_hz_the_ephebate:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          h.adjust(ctx, me, { legitimacy: 6, stability: 1 });
          h.factionShift(ctx, me, 'hasideans', 8);
          h.factionShift(ctx, me, 'pharisees', 8);
          h.setFlag(ctx, 'ephebateSettled', true);
          h.setFlag(ctx, 'exemptionWritten', true);
        }),
      },
      {
        label: 'A citizen is a citizen. There are no exemptions.',
        tooltip: 'The charter is applied without a Jewish clause in it, because a clause is an admission that the city has two kinds of citizen. The Hellenizers are delighted (+15) and the pious lose the last of their patience (−20 each); +1.5 unrest in every province of the faith for five years. This is the road that produced the rising the first time.',
        effects: guard('ev_hz_the_ephebate:1', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          h.factionShift(ctx, me, 'hellenizers', 15);
          h.factionShift(ctx, me, 'hasideans', -20);
          h.factionShift(ctx, me, 'pharisees', -20);
          h.addTagModifier(ctx, me, {
            id: 'no_exemptions', name: 'No Exemptions', months: 60,
            effects: { unrestAll: 1.5 },
          });
          h.doctrine(ctx, 'zeal', -2);
          h.setFlag(ctx, 'ephebateSettled', true);
          h.setFlag(ctx, 'noExemptions', true);
        }),
      },
    ],
  },

  {
    id: 'ev_hz_the_purists',
    title: 'The Men Who Went Out to the Wilderness',
    desc: 'They are not an army and they are not asking for anything, which is what '
      + 'makes them difficult. A few hundred at first, then a few thousand: families '
      + 'walking east out of the new city with their households and their scrolls, '
      + 'to camps by the Dead Sea where the calendar is kept the old way and the '
      + 'city is spoken of in the past tense. They pay no tax there because there is '
      + 'nothing to tax. They break no law because they have left the jurisdiction '
      + 'that has laws. And every month a few more of the men the Temple courses '
      + 'actually depend on are among them, and the letters they send back are '
      + 'copied and read in every village in the hill country.',
    forTag: 'player',
    once: false,
    cooldownMonths: 84,
    chance: 0.045,
    minYear: -150,
    maxYear: -20,
    trigger: safeTrigger('ev_hz_the_purists', (ctx) => {
      const me = crown(ctx);
      if (!me || !isPlayer(ctx, me) || !flag(ctx, 'greekJerusalem')) return false;
      const h = hellenizers(ctx, me);
      return h !== null && h >= 55;
    }),
    aiOption: 0,
    historical: 'The Qumran community\'s own foundation account is a secession from a Jerusalem whose priesthood and calendar it held to be illegitimate. Withdrawal was the third answer, alongside accommodation and revolt, and it is the one the Hasmonean state never found a way to punish.',
    options: [
      {
        label: 'Let them go. A state does not chase men who ask for nothing.',
        tooltip: 'No column is sent. −1 stability and a slow bleed of the very men the Temple runs on (−0.4 manpower for eight years), and the pious parties note that the crown at least did not send soldiers (+6). The camps become a permanent second address for the argument.',
        effects: guard('ev_hz_the_purists:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          h.adjust(ctx, me, { stability: -1 });
          h.addTagModifier(ctx, me, {
            id: 'the_camps', name: 'The Camps in the Wilderness', months: 96,
            effects: { manpowerMult: 0.96 },
          });
          h.factionShift(ctx, me, 'hasideans', 6);
          h.factionShift(ctx, me, 'pharisees', 6);
          h.setFlag(ctx, 'theCamps', true);
        }),
      },
      {
        label: 'Send for them. They are citizens whether they like it or not.',
        tooltip: 'The camps are broken up and the families walked back. +1 stability now, and a grievance that outlives everyone involved: −12 with both pious parties, +1 unrest for five years, and the Hellenizers approve (+8). Arresting a man who has broken no law is a thing a city remembers.',
        effects: guard('ev_hz_the_purists:1', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          h.adjust(ctx, me, { stability: 1 });
          h.factionShift(ctx, me, 'hasideans', -12);
          h.factionShift(ctx, me, 'pharisees', -12);
          h.factionShift(ctx, me, 'hellenizers', 8);
          h.addTagModifier(ctx, me, {
            id: 'the_camps_broken', name: 'The Camps Broken Up', months: 60,
            effects: { unrestAll: 1 },
          });
        }),
      },
    ],
  },

  {
    id: 'ev_hz_the_greek_jerusalem',
    title: 'The Greek Jerusalem',
    desc: 'Two generations on, the thing has a shape, and the shape is not what '
      + 'either party expected. The city is a polis and keeps a Temple; the Temple '
      + 'is served by priests who were ephebes; the assembly meets in Greek and '
      + 'closes for the Sabbath; the coins carry a Greek legend on one face and '
      + 'paleo-Hebrew on the other, because nobody could agree and the mint solved '
      + 'it by not deciding. Alexandria writes to it as an equal. The hill country '
      + 'has never accepted it and there are camps in the wilderness that pray for '
      + 'its destruction by name. It is the wealthiest Jewish state that has ever '
      + 'existed and the least sure of what it is, and both of those are the same '
      + 'fact about it.',
    forTag: 'player',
    major: true,
    minYear: -110,
    maxYear: 10,
    trigger: safeTrigger('ev_hz_the_greek_jerusalem', (ctx) => {
      const me = crown(ctx);
      if (!me || !isPlayer(ctx, me) || !flag(ctx, 'greekJerusalem')) return false;
      if (flag(ctx, 'greekJerusalemSettled')) return false;
      return flag(ctx, 'ephebateSettled');
    }),
    aiOption: 0,
    historical: 'It did not happen. The rising of 167 ended the charter, and the dynasty that ended it spent the next century adopting, piecemeal and without a constitution, most of what the charter had asked for.',
    options: [
      {
        label: 'A Jewish city in the Greek world, and let the argument stand',
        tooltip: 'The synthesis is declared to be the settlement rather than a stage on the way to one. Permanent: +12% income, +8% trade, faster integration, +0.8 unrest. The Road Not Taken records the Greek Jerusalem.',
        effects: guard('ev_hz_the_greek_jerusalem:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          h.addTagModifier(ctx, me, {
            id: 'the_greek_jerusalem', name: 'The Greek Jerusalem', months: -1,
            effects: { incomeMult: 1.12, tradeMult: 1.08, integrateMult: 1.15, unrestAll: 0.8 },
          });
          h.adjust(ctx, me, { legitimacy: 8 });
          h.setFlag(ctx, 'greekJerusalemSettled', true);
          h.chronicle(ctx, 'era', 'The Greek Jerusalem is declared a settlement and not a stage: a polis with a Temple in it, and an argument it has stopped trying to win.');
        }),
      },
      {
        label: 'Repeal the charter. It was always a lease.',
        tooltip: 'The constitution is withdrawn and the city returns to the Temple state, two generations late and against its own governing class. −2 stability, −10 legitimacy and the Hellenizers are broken as a party (−30); the pious recover completely (+25 each) and the wilderness camps come home. What the realm keeps is the chancery — the tool, without the constitution.',
        effects: guard('ev_hz_the_greek_jerusalem:1', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          h.adjust(ctx, me, { stability: -2, legitimacy: -10 });
          h.removeModifier(ctx, me, 'antioch_at_jerusalem');
          h.factionShift(ctx, me, 'hellenizers', -30);
          h.factionShift(ctx, me, 'hasideans', 25);
          h.factionShift(ctx, me, 'pharisees', 25);
          h.doctrine(ctx, 'zeal', 3);
          h.setFlag(ctx, 'greekJerusalemSettled', true);
          h.setFlag(ctx, 'charterRepealed', true);
          h.chronicle(ctx, 'era', 'The charter of Antioch-at-Jerusalem is repealed. The city is a Temple state again, and its governing class is not.');
        }),
      },
    ],
  },
];
