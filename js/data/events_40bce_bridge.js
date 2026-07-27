// Judaea Universalis — the sixty years to the Revolt, 26–66 CE (SPEC §124).
// Content package. Zero imports; all effects run through ctx.helpers at
// runtime. Concatenated onto EVENTS_40 by the era registry.
//
// The last edge. SPEC §120 gave all three of the 40 chapter's roads a 6 CE —
// province, Hasmonean kingdom, greater Herod — and then all three stopped
// there, with sixty years to the Great Revolt and nothing in them.
//
// Those sixty years contain the single best-documented near-miss in the whole
// period, and it is the reason this bridge is worth writing rather than merely
// owed. In 40 CE Caligula ordered his statue set up in the Temple. The governor
// of Syria, Petronius, was given an army and told to do it, and instead spent
// a year not doing it — marching slowly, holding hearings, writing letters
// explaining the delay, and finally telling the emperor to his face in writing
// that the province would have to be depopulated first because the population
// would die rather than permit it and had said so, in a body, in a field, for
// several days. Caligula ordered him to commit suicide. The order and the news
// of Caligula's assassination crossed in transit, and Petronius received the
// death sentence twenty-seven days after learning that the man who wrote it
// was dead.
//
// That story is about a Roman province. It is a completely different story
// about a kingdom, which is the point of having three roads arrive here:
//
//   The province road has no instrument but the crowd. Everything depends on
//   whether an unarmed population can face down a legate, which is exactly
//   what happened and is exactly why it is remembered.
//
//   A kingdom has an army, a treasury and an ambassador, and therefore has
//   options the province did not — including the option of being the reason
//   the order is never given, which no province has ever had.
//
// Source spine: Philo, Legatio ad Gaium, who was in Rome for the embassy;
// Josephus, Antiquitates XVIII and Bellum II for Petronius and the crowd at
// Ptolemais; Tacitus, Historiae V for the procuratorial decades; Josephus
// again for Florus and the spring of 66.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_40bce_bridge] ' + key, e || '');
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

function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[tag];
  return !!(t && t.alive !== false);
}

function flag(ctx, key) {
  return !!(ctx.game.flags && ctx.game.flags[key]);
}

function setOpinion(ctx, a, b, val) {
  const t = ctx.game.tags && ctx.game.tags[a];
  if (!t) return;
  if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
  t.opinion[b] = Math.max(-200, Math.min(200, val));
}

function crown(ctx) {
  for (const t of ['ATG', 'HER', 'HAS', 'JUD']) if (alive(ctx, t)) return t;
  return null;
}

// The two worlds the 40 chapter's three roads collapse into for this span:
// somebody's province, or somebody's kingdom. §119 — markers, not geography.
function isProvince(ctx) {
  return flag(ctx, 'judaeaProvincia');
}
function isKingdom(ctx) {
  return !flag(ctx, 'judaeaProvincia')
    && (flag(ctx, 'notAProvince') || flag(ctx, 'notReduced'))
    && !!crown(ctx);
}

const JEWISH_HEART = ['Jerusalem', 'Jericho', 'Hebron', 'Lydda', 'Emmaus',
  'Sepphoris', 'Tiberias'];

function stir(ctx, names, mod) {
  let touched = 0;
  for (const n of names) {
    const p = ctx.prov && ctx.prov(n);
    if (!p || p.impassable) continue;
    ctx.helpers.addProvinceModifier(ctx, n, mod);
    touched++;
  }
  return touched;
}

export const EVENTS_40_BRIDGE = [

  // ═══ THE PROVINCE ════════════════════════════════════════════════════════

  {
    id: 'ev5_p_the_procurators',
    title: 'A Post for Men on the Way Up, or Down',
    worldLabel: 'Judaea is governed by equestrians nobody is watching',
    desc: 'The province is third-rank, which means it is governed by a prefect of the '
      + 'equestrian order with no legion of his own and a career that will be decided '
      + 'by whether anything goes wrong. This produces a specific kind of man and a '
      + 'specific kind of government: cautious about Rome, careless about Judaea, and '
      + 'extremely alert to the possibility that a local difficulty might become a '
      + 'Syrian dispatch. The present holder has brought the standards into Jerusalem '
      + 'by night and taken them out again after five days of people lying down in '
      + 'front of his tribunal offering their necks; he has also built an aqueduct '
      + 'with Temple money and clubbed the resulting crowd. Both facts will be in the '
      + 'record. Neither will cost him anything for another six years.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 26, m: 9 },
    world: true,
    major: true,
    when: safeTrigger('ev5_p_the_procurators:when', (ctx) => isProvince(ctx)),
    aiOption: 0,
    historical: 'Pilate governed for ten years, was recalled over a massacre in Samaria, and is the only prefect of Judaea most people can name.',
    options: [
      {
        label: 'The province learns which lever works: lie down in front of it',
        tooltip: 'The standards go out and the method is established: +20 legitimacy for a population that has discovered a weapon, "The Method" permanently (−1 unrest in the Jewish heartland, +6% morale) — and Rome takes "A Province That Says No" (+0.5 unrest, permanent) because a governor who backs down is a governor whose successors will be tested.',
        effects: guard('ev5_p_the_procurators:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (me) {
            h.adjust(ctx, me, { legitimacy: 20 });
            h.addTagModifier(ctx, me, {
              id: 'the_method', name: 'The Method', months: -1,
              effects: { moraleMult: 1.06 },
            });
          }
          stir(ctx, JEWISH_HEART, {
            id: 'the_method_p', name: 'The Method', months: -1, effects: { unrest: -1 },
          });
          if (alive(ctx, 'ROM')) {
            h.addTagModifier(ctx, 'ROM', {
              id: 'a_province_that_says_no', name: 'A Province That Says No', months: -1,
              effects: { unrestAll: 0.5 },
            });
          }
          h.setFlag(ctx, 'theMethod', true);
          h.chronicle(ctx, 'era', 'The standards come out of Jerusalem after five days of people offering their necks in front of the tribunal; the province has discovered a weapon and will use it again.');
        }),
      },
      {
        label: 'The aqueduct is built and the crowd is dispersed with clubs',
        tooltip: 'Order is kept and the method is not learned: Rome +1 stability and "Governed Firmly" (+8% income from Temple funds applied to public works, 240 months) — and the Jewish heartland takes +1.5 unrest permanently, with the grievances going into a ledger nobody reads until 66. Quieter now, and dearer later.',
        effects: guard('ev5_p_the_procurators:1', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { stability: 1 });
            h.addTagModifier(ctx, 'ROM', {
              id: 'governed_firmly', name: 'Governed Firmly', months: 240,
              effects: { incomeMult: 1.08 },
            });
          }
          stir(ctx, JEWISH_HEART, {
            id: 'the_ledger', name: 'The Ledger Nobody Reads', months: -1,
            effects: { unrest: 1.5 },
          });
          h.setFlag(ctx, 'governedFirmly', true);
          h.chronicle(ctx, 'era', 'The aqueduct is finished with Temple money and the crowd that objected is dispersed with clubs; the grievance goes into a ledger nobody reads for forty years.');
        }),
      },
    ],
  },

  {
    id: 'ev5_p_the_statue_and_the_crowd',
    title: 'The Statue and the Crowd',
    worldLabel: 'Caligula orders his image into the Temple',
    desc: 'The emperor has ordered his statue set up in the Temple and given the legate '
      + 'of Syria two legions to do it with. Petronius marches, slowly, and at '
      + 'Ptolemais the population comes out to meet him — not armed, not organised, in '
      + 'tens of thousands, with their families, and lies down in the fields. They stay '
      + 'for forty days through the sowing season, which means there will be no harvest '
      + 'and everybody standing in that field knows it. When Petronius asks whether '
      + 'they intend to make war on Caesar they answer that they will not, that they '
      + 'will not fight, and that they will die instead, and would he please begin. He '
      + 'is a Roman governor with an army and a written order and no legal '
      + 'instrument whatever for what is in front of him. He writes to the emperor '
      + 'that the province will have to be depopulated first, which is the sentence '
      + 'that ends his career and possibly his life.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 40, m: 8 },
    world: true,
    major: true,
    when: safeTrigger('ev5_p_the_statue_and_the_crowd:when', (ctx) => isProvince(ctx)),
    aiOption: 0,
    historical: 'Petronius delayed for a year. Caligula ordered him to kill himself; the order arrived twenty-seven days after news of Caligula\'s assassination.',
    options: [
      {
        label: 'The legate writes the letter and the emperor dies first',
        tooltip: 'The delay holds long enough: the statue is never erected, +30 legitimacy, "The Field at Ptolemais" permanently (−1 unrest in the Jewish heartland, +10% morale everywhere) — the province has now twice discovered that the empire can be stopped by people who will not fight, which is the most dangerous lesson available and the one it takes into 66.',
        effects: guard('ev5_p_the_statue:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (me) {
            h.adjust(ctx, me, { legitimacy: 30 });
            h.addTagModifier(ctx, me, {
              id: 'the_field_at_ptolemais', name: 'The Field at Ptolemais', months: -1,
              effects: { moraleMult: 1.1 },
            });
          }
          stir(ctx, JEWISH_HEART, {
            id: 'field_at_ptolemais_p', name: 'The Field at Ptolemais', months: -1,
            effects: { unrest: -1 },
          });
          h.setFlag(ctx, 'statueRefused', true);
          h.chronicle(ctx, 'era', 'Petronius writes that the province would have to be depopulated first; the order for his suicide and the news of Caligula\'s murder cross in transit, and the statue is never erected.');
        }),
      },
      {
        label: 'The statue goes up and the province finds out what it is',
        tooltip: 'The order is carried out: Rome +10 legitimacy and the thing is done — and the Jewish heartland takes +4 unrest permanently ("The Abomination"), the Temple loses its function in every calculation the game makes, and the revolt of 66 arrives with twenty-six years of this behind it instead of a memory of having once been spared. The most consequential single card in the bridge.',
        effects: guard('ev5_p_the_statue:1', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { legitimacy: 10 });
          stir(ctx, JEWISH_HEART, {
            id: 'the_abomination', name: 'The Abomination', months: -1, effects: { unrest: 4 },
          });
          const me = crown(ctx);
          if (me) h.adjust(ctx, me, { legitimacy: -25, stability: -2 });
          h.setFlag(ctx, 'statueErected', true);
          h.chronicle(ctx, 'era', 'The statue is set up in the Temple. Nothing else that happens in this province for the next twenty-six years is separable from that sentence.');
        }),
      },
    ],
  },

  {
    id: 'ev5_p_the_spring_of_sixty_six',
    title: 'The Spring of Sixty-Six',
    worldLabel: 'The province arrives at the year the sacrifices ceased',
    desc: 'The procurator has taken seventeen talents out of the Temple treasury and '
      + 'said it was for the emperor; the crowd has passed a basket round the streets '
      + 'collecting coppers for the poor procurator, which is funnier than it is wise; '
      + 'and he has answered that joke with troops in the upper market. What is '
      + 'happening now in the courts is not a riot. The captain of the Temple has '
      + 'stopped the daily sacrifice for the emperor\'s welfare, which is a liturgical '
      + 'act and is also the formal renunciation of Roman sovereignty, and the men '
      + 'doing it are the priestly aristocracy rather than the street. Sixty years of '
      + 'ledger are being read out at once. Whatever this country decided in 26 and '
      + 'in 40 is being paid for in the next four years.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 66, m: 5 },
    world: true,
    major: true,
    when: safeTrigger('ev5_p_the_spring:when', (ctx) => isProvince(ctx)),
    aiOption: 0,
    historical: 'The sacrifices ceased in the summer of 66 and the war ran seven years.',
    options: [
      {
        label: 'Let the ledger be read',
        tooltip: 'The chapter closes on the eve of the Great Revolt with everything this bridge decided priced in: the Jewish heartland carries +2 unrest permanently, or +3 if the statue was erected, or +1 if the province learned in 26 that it could say no and was spared in 40. Rome takes a war it has not budgeted for.',
        effects: guard('ev5_p_the_spring:0', (ctx) => {
          const h = ctx.helpers;
          const abomination = flag(ctx, 'statueErected');
          const spared = flag(ctx, 'statueRefused') && flag(ctx, 'theMethod');
          stir(ctx, JEWISH_HEART, {
            id: 'the_spring_of_66', name: 'The Spring of Sixty-Six', months: -1,
            effects: { unrest: abomination ? 3 : (spared ? 1 : 2) },
          });
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { stability: -1 });
          h.setFlag(ctx, 'springOfSixtySix', true);
          h.chronicle(ctx, 'era', abomination
            ? 'The sacrifice for the emperor is stopped in a Temple that has had his grandfather\'s statue in it for twenty-six years; nobody involved expects this to end in a negotiation.'
            : 'The captain of the Temple stops the daily sacrifice for the emperor\'s welfare — a liturgical act, and the formal renunciation of Roman sovereignty, performed by the priestly aristocracy rather than the street.');
        }),
      },
    ],
  },

  // ═══ THE KINGDOM ═════════════════════════════════════════════════════════

  {
    id: 'ev5_k_a_king_between',
    title: 'A King Between',
    worldLabel: 'A Jewish kingdom governs itself through the procuratorial decades',
    desc: 'What the province is enduring in these years — prefects on the make, '
      + 'standards carried in by night, Temple money spent on aqueducts by men who '
      + 'genuinely cannot see the problem — is, in a kingdom, simply administration, '
      + 'and it is being done by people who can see the problem because they will be '
      + 'in the street on the festival. This is not a golden age; the kingdom taxes '
      + 'hard, the priesthood and the court are at odds about most things, and the '
      + 'brigandage in the hills is the same brigandage. But the grievances have '
      + 'somewhere to go that is not a Syrian dispatch, and the difference that makes '
      + 'over forty years is the difference between a country with a ledger and a '
      + 'country with a court.',
    forTag: 'both',
    decider: (ctx) => crown(ctx) || 'HER',
    date: { y: 26, m: 9 },
    world: true,
    major: true,
    when: safeTrigger('ev5_k_a_king_between:when', (ctx) => isKingdom(ctx)),
    aiOption: 0,
    historical: 'There was no such kingdom in these decades; Judaea was governed by prefects and the grievances went into a ledger that was read out in 66.',
    options: [
      {
        label: 'Govern through the priesthood, and let the Temple run the country',
        tooltip: 'The court rules with the priestly aristocracy rather than around it: +1 stability, Priesthood +25 approval, "The Temple Runs the Country" permanently (−1 unrest in the Jewish heartland, +8% income) — and the court\'s own authority is the thing being spent (−0.05 legitimacy a month). The arrangement the province never had available.',
        effects: guard('ev5_k_a_king_between:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { stability: 1 });
          h.addTagModifier(ctx, me, {
            id: 'the_temple_runs_the_country', name: 'The Temple Runs the Country', months: -1,
            effects: { incomeMult: 1.08, legitimacyAdd: -0.05 },
          });
          stir(ctx, JEWISH_HEART, {
            id: 'temple_runs_p', name: 'The Temple Runs the Country', months: -1,
            effects: { unrest: -1 },
          });
          try { h.factionShift(ctx, me, 'priesthood', 25); } catch (e) {}
          h.setFlag(ctx, 'templeRunsTheCountry', true);
          h.chronicle(ctx, 'era', 'The court governs through the priestly aristocracy rather than around it; the grievances of forty years go to men who will be standing in the same street on the festival.');
        }),
      },
      {
        label: 'Govern around it, and keep the Temple to its own business',
        tooltip: 'A secular administration with the cult firmly in its box: +2 authority, +12% income, +20 legitimacy — and the Priesthood −25 approval with +1 unrest in the Jewish heartland permanently. Efficient, modern, and building exactly the constituency that stopped the sacrifices in the other history.',
        effects: guard('ev5_k_a_king_between:1', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { legitimacy: 20 });
          h.addTagModifier(ctx, me, {
            id: 'the_cult_in_its_box', name: 'The Cult In Its Box', months: -1,
            effects: { incomeMult: 1.12 },
          });
          stir(ctx, JEWISH_HEART, {
            id: 'cult_in_box_p', name: 'The Cult In Its Box', months: -1, effects: { unrest: 1 },
          });
          try { h.factionShift(ctx, me, 'priesthood', -25); } catch (e) {}
          h.doctrine(ctx, 'authority', 2);
          h.setFlag(ctx, 'cultInItsBox', true);
          h.chronicle(ctx, 'era', 'The kingdom is administered around the Temple rather than through it: efficient, modern, and building precisely the constituency that stopped the sacrifices in the other history.');
        }),
      },
    ],
  },

  {
    id: 'ev5_k_the_order_that_was_never_given',
    title: 'The Order That Was Never Given',
    worldLabel: 'Caligula and a kingdom that has an ambassador',
    desc: 'The emperor is not sane and the question of his statue has come up, because '
      + 'it comes up wherever there is a temple that does not have one. In the province '
      + 'next door this becomes a legate with two legions and a field full of people '
      + 'lying down in the sowing season. Here it becomes a diplomatic problem, which '
      + 'is a different kind of problem and not obviously an easier one: there is an '
      + 'embassy already in Rome on another matter, a treasury that can be spent, a '
      + 'court that can be flattered, and a client-king of the emperor\'s '
      + 'acquaintance who can be asked to raise it over dinner. All of those are '
      + 'instruments the province does not have. None of them works on a man who has '
      + 'decided he is a god, and everybody in the council knows at least one story '
      + 'suggesting he has.',
    forTag: 'both',
    decider: (ctx) => crown(ctx) || 'HER',
    date: { y: 40, m: 8 },
    world: true,
    major: true,
    when: safeTrigger('ev5_k_the_order:when', (ctx) => isKingdom(ctx)),
    aiOption: 0,
    historical: 'Agrippa I talked Caligula out of it at a dinner, in the one recorded case of the friendship of a Jewish king being worth more than a legion.',
    options: [
      {
        label: 'Spend the friendship: an embassy, a dinner, and a very large gift',
        tooltip: 'The order is never given, because the man who would have given it is talked out of it over dinner by somebody he likes: −400 talents, and the statue question simply does not arise. +25 legitimacy, +1 stability, "The Order Never Given" permanently (−1 unrest in the Jewish heartland). The most expensive dinner in the chapter and the cheapest war never fought.',
        effects: guard('ev5_k_the_order:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { treasury: -400, legitimacy: 25, stability: 1 });
          stir(ctx, JEWISH_HEART, {
            id: 'the_order_never_given', name: 'The Order Never Given', months: -1,
            effects: { unrest: -1 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', me, 50);
          h.setFlag(ctx, 'orderNeverGiven', true);
          h.chronicle(ctx, 'era', 'The statue is talked out of existence at a dinner by somebody the emperor likes: the most expensive meal in the chapter and the cheapest war never fought.');
        }),
      },
      {
        label: 'Refuse in advance, in writing, and put the army on the border',
        tooltip: 'The kingdom answers before it is asked: +30 legitimacy, +2 zeal, +10,000 manpower and "We Said So First" (+10% morale, 120 months) — and Rome\'s opinion to −70, with a real chance the legate is sent anyway. A kingdom can do this and a province cannot; whether it should is the argument the council has for a week.',
        effects: guard('ev5_k_the_order:1', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { legitimacy: 30, manpower: 10000 });
          h.addTagModifier(ctx, me, {
            id: 'we_said_so_first', name: 'We Said So First', months: 120,
            effects: { moraleMult: 1.1 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', me, -70);
          h.doctrine(ctx, 'zeal', 2);
          h.setFlag(ctx, 'refusedInAdvance', true);
          h.chronicle(ctx, 'era', 'The kingdom refuses the statue before it is asked for, in writing, with its army on the border: a thing a kingdom can do and a province cannot.');
        }),
      },
    ],
  },

  {
    id: 'ev5_k_the_year_the_other_country_rose',
    title: 'The Year the Other Country Rose',
    worldLabel: 'The kingdom reaches 66 with no sacrifices to stop',
    desc: 'This is the year that in the other history the captain of the Temple stopped '
      + 'the daily sacrifice for the emperor\'s welfare and a war began that ran seven '
      + 'years and ended with the House in ashes. There is no daily sacrifice for the '
      + 'emperor\'s welfare here, because there has never been an emperor whose welfare '
      + 'this Temple was required to pray for; the liturgy the war began over is not '
      + 'in the book. The kingdom notes the anniversary of nothing, and the priests '
      + 'argue about tithes, and a procurator does not take seventeen talents out of '
      + 'the treasury, and the year is remembered — where it is remembered at all — '
      + 'for a poor harvest.',
    forTag: 'both',
    decider: (ctx) => crown(ctx) || 'HER',
    date: { y: 66, m: 5 },
    world: true,
    major: true,
    when: safeTrigger('ev5_k_the_year:when', (ctx) => isKingdom(ctx)),
    aiOption: 0,
    historical: 'The sacrifices ceased, the war ran seven years, and the Temple was destroyed.',
    options: [
      {
        label: 'Note the poor harvest, and close the chapter',
        tooltip: 'The chapter ends with the kingdom standing where the province burned: +30 legitimacy, +1 stability, "The War That Did Not Come" permanently (+12% income, −1 unrest everywhere, +0.1 legitimacy a month). A kingdom that governed through the Temple carries it most easily; one that boxed the cult has the same constituency the other history\'s war came out of, and carries it with +0.5 unrest instead.',
        effects: guard('ev5_k_the_year:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          const through = flag(ctx, 'templeRunsTheCountry');
          h.adjust(ctx, me, { legitimacy: 30, stability: 1 });
          h.addTagModifier(ctx, me, {
            id: 'the_war_that_did_not_come', name: 'The War That Did Not Come', months: -1,
            effects: {
              incomeMult: 1.12,
              unrestAll: through ? -1 : 0.5,
              legitimacyAdd: 0.1,
            },
          });
          h.setFlag(ctx, 'theWarThatDidNotCome', true);
          h.chronicle(ctx, 'era', through
            ? 'The year the other country rose passes here in an argument about tithes; the liturgy that war began over is not in this Temple\'s book.'
            : 'The year the other country rose passes here without a war — and the constituency that started it in the other history is sitting in this kingdom too, boxed and counted and waiting.');
        }),
      },
    ],
  },
];
