// Judaea Universalis — event chain: the fire and the protected peoples,
// 614–645 CE (SPEC §104). Content package. Zero imports; all effects run
// through ctx.helpers at runtime. Concatenated onto EVENTS_614 by the era
// registry.
//
// The 614 chain renders religion entirely as politics — who holds Jerusalem,
// who gets the Cross back, whose churches burn — and never once as coercion,
// which is odd in a bookmark whose two great powers each have a state church.
// `zoroastrianism` appears in the era's data and almost nowhere in its script.
//
// The Sasanian arrangement was asymmetric in a way that is worth playing.
// Born Christians and born Jews were protected communities with their own
// courts, their own heads, and a tax; a Zoroastrian who left the fire was
// executed. Persecution tracked defection and loyalty, not belief — which is
// why the persecutions under Shapur II fell on Christians whose co-religionists
// ruled the enemy empire, why the Church of the East declared itself
// independent of Antioch, and why Persian Jews, having no foreign patron at
// all, were generally the safest people in the empire.
//
// Source spine: the History of Mar Qardagh and the Life of Mar George
// (Mihran Gushnasp); the synodicon of the Church of the East; Sebeos and the
// Khuzistan Chronicle; Theophanes and the Doctrina Jacobi on the forced
// baptisms; the fast of Heraclius in the Coptic and Syriac calendars.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_614ce_persia] ' + key, e || '');
}

// The letters this court answers to NOW (SPEC §135). A realm that has taken a
// greater crown files its provinces, armies and wars under the new tag, while
// this chapter was written against the old one; the sim keeps the forwarding
// address and hands it back through ctx.helpers. Defensive about `helpers`
// because the content packages are also read cold, with no game to resolve
// against.
function who(ctx, tag) {
  return (ctx && ctx.helpers && ctx.helpers.livingTag) ? ctx.helpers.livingTag(ctx, tag) : tag;
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

function dateGE(ctx, y, m) {
  const d = ctx.game.date;
  return d.y > y || (d.y === y && d.m >= m);
}

function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[who(ctx, tag)];
  return !!(t && t.alive !== false);
}

// A war is filed under the names its belligerents wear NOW (SPEC §135), and a
// content package asks after them by the names its chapter shipped with. The
// forwarding address lives on the game state, so this reads it without needing
// a ctx it was never given.
function warTag(game, t) {
  if (!game || !t) return t;
  if (game.tags && game.tags[t]) return t;
  const to = game.tagAliases && game.tagAliases[t];
  return (to && game.tags && game.tags[to]) ? to : t;
}

function findWar(game, a, b) {
  const x = warTag(game, a);
  const y = warTag(game, b);
  for (const w of (game && game.wars) || []) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf(x) !== -1 && all.indexOf(y) !== -1) return w;
  }
  return null;
}

// The Sasanian provinces where a fire actually burns — the heartland, not the
// conquered Christian west.
const FIRE_LANDS = ['Seleucia-Ctesiphon', 'Ecbatana', 'Susa', 'Gazaca', 'Persepolis', 'Gabae'];

export const EVENTS_614_PERSIA = [

  // ── P1 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_apostate_noble',
    title: 'The Marzban Who Would Not Come Back',
    desc: 'Mihran Gushnasp is everything the order is built out of: a great house of the '
      + 'Mihranid line, a governor\'s commission, a wife of equal rank, a fire endowed in '
      + 'his own name. Then he is baptized, takes the name George, dismisses the wife '
      + 'because the marriage is one Christian law does not recognize, and goes to a '
      + 'monastery. The King of Kings has no quarrel with Christians — half of Ctesiphon '
      + 'is Christian, his own physician is Christian, his favourite wife is Christian. He '
      + 'has an absolute quarrel with a Persian nobleman who has walked away from the fire '
      + 'his ancestors endowed, because if that is permitted then the aristocracy is not '
      + 'held together by anything. The mobads ask for him for two years. He is questioned '
      + 'at court, courteously, at length, and then strangled. His body is left out and '
      + 'the Christians of the capital take it away by night and the accounts of what he '
      + 'said in the interrogation circulate within the year in two languages.',
    forTag: 'both',
    decider: 'SAS',
    major: true,
    minYear: 614,
    maxYear: 628,
    trigger: safeTrigger('ev_p_apostate_noble', (ctx) =>
      dateGE(ctx, 615, 2) && alive(ctx, 'SAS')),
    aiOption: 0,
    historical: 'He was executed; the Life circulated within a year and the great houses took the point.',
    options: [
      {
        label: 'A nobleman may not leave the fire',
        tooltip: 'The order holds: Persia +6 legitimacy and +1 stability with the great houses — and the Christian communities of the heartland +2 unrest for 60 months ("The Martyr of the Mihranids"), because a martyr with a pedigree is worth more to them than a hundred without.',
        effects: guard('ev_p_apostate_noble:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'SAS')) h.adjust(ctx, 'SAS', { legitimacy: 6, stability: 1 });
          for (const n of FIRE_LANDS) {
            h.addProvinceModifier(ctx, n, {
              id: 'martyr_of_the_mihranids', name: 'The Martyr of the Mihranids', months: 60,
              effects: { unrest: 2 },
            });
          }
          h.setFlag(ctx, 'apostateExecuted', true);
          h.chronicle(ctx, 'era', 'Mihran Gushnasp, baptized George, is strangled at Ctesiphon for leaving the fire; the great houses take the point, and so do the churches.');
        }),
      },
      {
        label: 'Let him go to his monastery',
        tooltip: 'The King of Kings declines to make the case: Persia −8 legitimacy with the mobads and the great houses (−0.2 legitimacy a month for 60 months, "The Fire Unavenged") — and the Christian communities of the heartland −1 unrest for 60 months, which in a war with a Christian empire is not nothing.',
        effects: guard('ev_p_apostate_noble:1', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'SAS')) {
            h.adjust(ctx, 'SAS', { legitimacy: -8 });
            h.addTagModifier(ctx, 'SAS', {
              id: 'fire_unavenged', name: 'The Fire Unavenged', months: 60,
              effects: { legitimacyAdd: -0.2 },
            });
          }
          for (const n of FIRE_LANDS) {
            h.addProvinceModifier(ctx, n, {
              id: 'the_king_declined', name: 'The King Declined the Case', months: 60,
              effects: { unrest: -1 },
            });
          }
          h.setFlag(ctx, 'apostateSpared', true);
          h.chronicle(ctx, 'era', 'The King of Kings lets the apostate marzban go to his monastery; the mobads do not forget being refused.');
        }),
      },
    ],
  },

  // ── P2 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_vacant_throne',
    title: 'The Chair Is Left Empty',
    desc: 'Mar Gregory dies and the catholicos of the Church of the East — the head of '
      + 'every Christian in the empire, elected at Ctesiphon, answerable to the King of '
      + 'Kings and to no bishop outside it — is not replaced. Not banned. Not martyred. '
      + 'Simply not appointed, year after year, while the archdeacon holds the '
      + 'correspondence and the sees go vacant beneath him and the courts have nobody to '
      + 'appeal to. The man who arranged it is Gabriel of Sinjar, the king\'s physician, '
      + 'who was of that church and left it for the rival confession over a matter of '
      + 'doctrine and a matter of a second wife, and who has the ear of a king who is not '
      + 'interested in the difference. It is a way of decapitating a religion that leaves '
      + 'nothing for a chronicler to call a persecution: no fire, no crowds, no relics — '
      + 'just twenty years of an empty chair.',
    forTag: 'both',
    decider: 'SAS',
    minYear: 614,
    maxYear: 630,
    trigger: safeTrigger('ev_p_vacant_throne', (ctx) =>
      dateGE(ctx, 616, 1) && alive(ctx, 'SAS')),
    aiOption: 0,
    historical: 'The see stayed vacant from 609 until after Khosrow\'s fall; Gabriel of Sinjar worked against the church at court throughout.',
    options: [
      {
        label: 'The archdeacon may hold the correspondence',
        tooltip: 'A religion administered into paralysis: Persia +60 talents a year of unallocated church revenue (+180 talents) and no unrest at all — but the Christian provinces of the empire lose 10% production for 120 months ("No One to Ordain"), because the courts, the schools and the hospitals ran through that office.',
        effects: guard('ev_p_vacant_throne:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (alive(ctx, 'SAS')) h.adjust(ctx, 'SAS', { treasury: 180 });
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (!p || p.impassable || p.owner !== 'SAS' || p.religion !== 'christianity') continue;
            h.addProvinceModifier(ctx, p.name, {
              id: 'no_one_to_ordain', name: 'No One to Ordain', months: 120,
              effects: { prodMult: 0.9 },
            });
          }
          h.setFlag(ctx, 'catholicateVacant', true);
          h.chronicle(ctx, 'era', 'The catholicate is left vacant year after year; the sees go empty beneath it and nothing happens that a chronicler could call a persecution.');
        }),
      },
      {
        label: 'Let them elect at Ctesiphon',
        tooltip: 'The synod meets and the empire\'s largest confession has a head again, appointed under the king\'s eye: Persia −60 talents, +1 stability, and the Christian provinces −1 unrest for 120 months ("A Head at Ctesiphon"). A church with its own chief in your capital is a church that is not writing to Antioch.',
        effects: guard('ev_p_vacant_throne:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (alive(ctx, 'SAS')) h.adjust(ctx, 'SAS', { treasury: -60, stability: 1 });
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (!p || p.impassable || p.owner !== 'SAS' || p.religion !== 'christianity') continue;
            h.addProvinceModifier(ctx, p.name, {
              id: 'head_at_ctesiphon', name: 'A Head at Ctesiphon', months: 120,
              effects: { unrest: -1 },
            });
          }
          h.setFlag(ctx, 'catholicateFilled', true);
          h.chronicle(ctx, 'era', 'The synod elects a catholicos at Ctesiphon under the king\'s eye: the empire\'s largest confession has a head, and it is a Persian one.');
        }),
      },
    ],
  },

  // ── P3 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_not_romes_church',
    title: 'Not Rome\'s Church',
    desc: 'The bishops meeting at Ctesiphon put it in the acts in as many words: this '
      + 'church has its own head, elected here, and appeals to no see in the Roman '
      + 'empire. Read charitably it is a doctrinal position with two centuries of '
      + 'argument behind it. Read the way the court reads it, it is a security '
      + 'clearance. Every persecution this church has suffered since Shapur II has come '
      + 'from the same syllogism — the emperor over the border is a Christian, these are '
      + 'Christians, therefore these are his — and the synod has just cut the middle '
      + 'term. The Jews of Babylonia, who make the same tax payments and hold the same '
      + 'protected standing, have never needed to hold a synod about it, because there '
      + 'is no Jewish emperor anywhere for anyone to suspect them of preferring. That is '
      + 'the whole of the asymmetry, and it explains four centuries of who was burned '
      + 'and who was left alone.',
    forTag: 'both',
    decider: 'SAS',
    major: true,
    minYear: 614,
    maxYear: 640,
    trigger: safeTrigger('ev_p_not_romes_church', (ctx) =>
      dateGE(ctx, 617, 3) && alive(ctx, 'SAS')
      && (!!ctx.game.flags.catholicateFilled || dateGE(ctx, 628, 1))),
    aiOption: 0,
    historical: 'The Church of the East governed itself and appealed to no Roman see; the suspicion of foreign loyalty lapsed with it.',
    options: [
      {
        label: 'Enter it in the acts: we appeal to no see abroad',
        tooltip: 'The charge stops being available. "The Enemy\'s Church" (+1.6 unrest wherever a large Christian community lives under a crown at war with Byzantium) is lifted permanently and never returns; Persia +1 stability. This is the mechanic, not a modifier: SPEC §104\'s foreign-patron rule, cleared by schism.',
        effects: guard('ev_p_not_romes_church:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          h.setFlag(ctx, 'churchOfTheEastFree', true);
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (!p) continue;
            h.removeModifier(ctx, p.name, 'foreign_patron_christianity');
          }
          if (alive(ctx, 'SAS')) h.adjust(ctx, 'SAS', { stability: 1 });
          h.chronicle(ctx, 'era', 'The synod at Ctesiphon enters it in the acts: this church appeals to no see in the Roman empire, and the oldest charge against it lapses.');
        }),
      },
      {
        label: 'Let the question stay open',
        tooltip: 'The court keeps a lever and pays for it: the suspicion stands, so every large Christian community in an empire at war with Byzantium keeps its unrest — and Persia +80 talents from the confiscations that the suspicion licenses.',
        effects: guard('ev_p_not_romes_church:1', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'SAS')) h.adjust(ctx, 'SAS', { treasury: 80 });
          h.setFlag(ctx, 'churchSuspect', true);
          h.chronicle(ctx, 'era', 'The question of whose church it is is left open at Ctesiphon: a lever for the court, and a charge available against every bishop in the empire.');
        }),
      },
    ],
  },

  // ── P4 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_forced_baptism',
    title: 'The Oath and the Font',
    desc: 'Heraclius comes back up the coast in the year the Cross returns and stops at '
      + 'Tiberias, in the house of Benjamin, who fed his army on the road and rode with '
      + 'him to Jerusalem under an oath of safe conduct given in the emperor\'s own '
      + 'mouth. At Jerusalem the monks explain that an oath sworn to those who killed '
      + 'Christians is not an oath, that the sin of breaking it is theirs to absolve, '
      + 'and that they will fast a week every year forever in expiation on his behalf — '
      + 'and the Copts and the Syrians will still be keeping that fast in the twentieth '
      + 'century, which tells you what the people who arranged it thought they had '
      + 'arranged. The killing follows. Then, in 632, the decree: every Jew in the '
      + 'empire is to be baptized. It is the first such order in Roman law, it is '
      + 'unenforceable, it is enforced anyway wherever a bishop is keen, and it is the '
      + 'last legislation of its kind the empire has time for — the Arabs are four years '
      + 'away.',
    forTag: 'both',
    decider: 'BYZ',
    major: true,
    minYear: 629,
    maxYear: 640,
    trigger: safeTrigger('ev_p_forced_baptism', (ctx) =>
      dateGE(ctx, 632, 1) && alive(ctx, 'BYZ')
      && ctx.helpers.controls(ctx, 'BYZ', 'Jerusalem')),
    aiOption: 0,
    historical: 'The oath was absolved, the massacre followed, and the baptism decree of 632 went out over the whole empire.',
    options: [
      {
        label: 'Every Jew in the empire is to be baptized',
        tooltip: 'Byzantium +6 legitimacy with the church and +100 talents of confiscation; every Jewish province in the empire +3 unrest permanently ("The Font at Sword\'s Point") until it converts, and the Galilee empties toward the desert frontier — where, in four years, somebody else will be arriving.',
        effects: guard('ev_p_forced_baptism:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (alive(ctx, 'BYZ')) h.adjust(ctx, 'BYZ', { legitimacy: 6, treasury: 100 });
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (!p || p.impassable || p.owner !== 'BYZ' || p.religion !== 'judaism') continue;
            h.addProvinceModifier(ctx, p.name, {
              id: 'font_at_swords_point', name: 'The Font at Sword\'s Point', months: -1,
              effects: { unrest: 3 },
            });
          }
          h.addPopulation(ctx, 'Tiberias', { r: 'judaism', c: 'galilean', n: -1200 });
          h.setFlag(ctx, 'forcedBaptism', true);
          h.chronicle(ctx, 'era', 'Heraclius decrees the baptism of every Jew in the empire; the monks keep the expiatory fast for the broken oath for thirteen centuries.');
        }),
      },
      {
        label: 'The emperor keeps his word',
        tooltip: 'The oath at Tiberias stands: Byzantium −6 legitimacy with the church (the monks keep no fast, and say so loudly), −1 stability — and the Jewish provinces of the empire −2 unrest for 120 months ("The Oath Was Kept"), which is worth rather more than a fast when the frontier armies arrive.',
        effects: guard('ev_p_forced_baptism:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (alive(ctx, 'BYZ')) h.adjust(ctx, 'BYZ', { legitimacy: -6, stability: -1 });
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (!p || p.impassable || p.owner !== 'BYZ' || p.religion !== 'judaism') continue;
            h.addProvinceModifier(ctx, p.name, {
              id: 'the_oath_was_kept', name: 'The Oath Was Kept', months: 120,
              effects: { unrest: -2 },
            });
          }
          h.setFlag(ctx, 'oathKept', true);
          h.chronicle(ctx, 'era', 'Heraclius keeps the safe conduct he gave at Tiberias; the monks of Jerusalem are not asked to absolve anything, and say so loudly.');
        }),
      },
    ],
  },

  // ── P5 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_p_jizya_gradient',
    title: 'The Gradient, Not the Sword',
    desc: 'The conquest settles into an assessment, and the assessment is the whole '
      + 'policy. A protected community keeps its law, its courts, its buildings and its '
      + 'liturgy, and pays a tax that a Muslim does not pay. Nobody is at the door with '
      + 'a choice; there is simply a bill, every year, for the rest of a life, and a '
      + 'neighbour who does not get one. The first governors are actively unhappy about '
      + 'conversions, because the revenue is assessed on the protected and a convert '
      + 'stops paying — there is correspondence from Egypt complaining about exactly '
      + 'this. It takes three centuries and it is nearly complete, and almost none of it '
      + 'is done by force. It is done by arithmetic applied annually to a family that '
      + 'has to decide whether the children will pay it too.',
    forTag: 'both',
    decider: 'RSH',
    minYear: 640,
    maxYear: 700,
    trigger: safeTrigger('ev_p_jizya_gradient', (ctx) => {
      const h = ctx.helpers;
      return dateGE(ctx, 642, 1) && alive(ctx, 'RSH')
        && h.controls(ctx, 'RSH', 'Jerusalem') && h.controls(ctx, 'RSH', 'Damascus');
    }),
    aiOption: 0,
    historical: 'The poll-tax stood, conversion was slow and voluntary and the treasury complained about it.',
    options: [
      {
        label: 'Assess the protected and leave them alone',
        tooltip: 'The Caliphate +12% income permanently ("The Assessment") and the conquered provinces −1 unrest for 120 months — and Islam begins to spread the way the tax makes it spread, by the year and by the household (the ambient drift takes it from here, SPEC §104).',
        effects: guard('ev_p_jizya_gradient:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (alive(ctx, 'RSH')) {
            h.addTagModifier(ctx, 'RSH', {
              id: 'the_assessment', name: 'The Assessment', months: -1,
              effects: { incomeMult: 1.12 },
            });
          }
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (!p || p.impassable || p.owner !== 'RSH' || p.religion === 'islam') continue;
            h.addProvinceModifier(ctx, p.name, {
              id: 'the_assessment_p', name: 'The Assessment', months: 120,
              effects: { unrest: -1 },
            });
          }
          h.setFlag(ctx, 'jizyaAssessed', true);
          h.chronicle(ctx, 'era', 'The conquest settles into an assessment: the protected keep their law and their courts and pay for them, every year, for the rest of their lives.');
        }),
      },
      {
        label: 'Press the conversions and lose the revenue',
        tooltip: 'Faster and much more expensive: the Caliphate −8% income for 120 months, the conquered provinces +2 unrest for 60 months — and the faith spreads at double the ordinary rate while the pressure lasts ("The Governors Press").',
        effects: guard('ev_p_jizya_gradient:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (alive(ctx, 'RSH')) {
            h.addTagModifier(ctx, 'RSH', {
              id: 'governors_press', name: 'The Governors Press', months: 120,
              effects: { incomeMult: 0.92 },
            });
          }
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (!p || p.impassable || p.owner !== 'RSH' || p.religion === 'islam') continue;
            h.addProvinceModifier(ctx, p.name, {
              id: 'governors_press_p', name: 'The Governors Press', months: 60,
              effects: { unrest: 2 },
            });
          }
          h.setFlag(ctx, 'conversionPressed', true);
          h.chronicle(ctx, 'era', 'The governors press the conversions and the treasury sends letters about the shortfall; both are in the record.');
        }),
      },
    ],
  },
];
