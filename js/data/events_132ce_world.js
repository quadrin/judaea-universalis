// Judaea Universalis — the world spine, 175–425 CE (SPEC §104). Content
// package. Zero imports; all effects run through ctx.helpers at runtime.
// Concatenated onto EVENTS_132 by the era registry.
//
// The 132 bookmark's clock used to stop at the Antonine plague in 166: four
// world events, and after that a campaign that survived ran on triggers keyed
// to Judaea's own state in front of a world that had stopped happening. This
// file is the two and a half centuries the bookmark was missing — the ones in
// which the Roman East is actually decided.
//
// The rule for what belongs here: it must happen whichever way the revolt
// went. Avidius Cassius declares himself emperor whether or not there is a
// Nasi in Jerusalem; Ardashir overthrows the Arsacids regardless; the plague,
// the persecutions, the councils and the laws arrive on their own schedule.
// Where a card genuinely does depend on the outcome it carries a `when` gate
// and retires into the divergence ledger rather than narrating the wrong world
// (SPEC §75, §89).
//
// Most of these are `decider`-gated notices (SPEC §70): the player watches
// them. The exceptions are the civil-war cards that RAISE a claim, where an
// eastern court — Roman province or sovereign Judaea alike — really does have
// to choose a side, and the two where Judaea is the subject. Every civil war
// here is a pair (SPEC §239, §249): the card that raises the purple and the
// card that puts it out, because a claimant left standing is a country on the
// map with nobody coming for it.
//
// Source spine: the Historia Augusta with the usual caution; Cassius Dio
// LXXII–LXXX; Herodian; Eusebius, HE VI–X and the Life of Constantine;
// Lactantius, On the Deaths of the Persecutors; the Res Gestae Divi Saporis;
// Ammianus XXIII.1 on the Temple; the Theodosian Code.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_132ce_world] ' + key, e || '');
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

function findJudRomWar(game) {
  for (const w of (game && game.wars) || []) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf(warTag(game, 'JUD')) !== -1 && all.indexOf(warTag(game, 'ROM')) !== -1) return w;
  }
  return null;
}

function romanAftermath(ctx) {
  return alive(ctx, 'ROM')
    && ctx.helpers.controls(ctx, 'ROM', 'Jerusalem')
    && ctx.helpers.countControlled(ctx, 'JUD', {}) === 0;
}
function judaeaStands(ctx) {
  const t = ctx.game.tags && ctx.game.tags[who(ctx, 'JUD')];
  return alive(ctx, 'JUD')
    && !(t && t.overlord)
    && ctx.helpers.controls(ctx, 'JUD', 'Jerusalem')
    && !findJudRomWar(ctx.game);
}

// The eastern cities the world spine keeps reaching for.
const EAST = ['Antioch', 'Alexandria', 'Caesarea Maritima', 'Tyre', 'Damascus', 'Emesa'];

function stirCities(ctx, names, id, name, months, effects) {
  for (const n of names) {
    ctx.helpers.addProvinceModifier(ctx, n, { id, name, months, effects });
  }
}

// The two civil-war cards below give an eastern court a real choice, so they
// need a considered `aiOption` — which in this engine is doing two jobs at
// once (SPEC §70, §89): it is the course an AI holder takes, AND it is the
// course the divergence ledger treats as the record. Those must be the same
// value, and the record is not in doubt: the East declared for Avidius
// Cassius within days and for Pescennius Niger within weeks, and paid for
// both. So both cards sit at option 0, and a player who waits for the second
// courier is the one departing from history — which is exactly the shape the
// ledger should show.

// The ground a claimant in the East actually stands on (SPEC §239, §249).
//
// `THE_EASTERN_COMMAND` is the commission itself: Syria and Commagene,
// Phoenicia, the Palestinian coast and hills, Arabia, Egypt, Cyprus and
// Cilicia — the provinces a man given the whole East can raise by writing to
// their governors, which is what all three of this chapter's eastern
// usurpations did. Cappadocia is deliberately not in it: Martius Verus held
// it for Marcus in 175 and it is the one province of the commission that is
// known to have refused.
const THE_EASTERN_COMMAND = [
  'Antioch', 'Seleucia Pieria', 'Laodicea', 'Apamea', 'Emesa', 'Chalcis',
  'Damascus', 'Beroea', 'Cyrrhus', 'Palmyra', 'Zeugma', 'Samosata',
  'Tyre', 'Sidon', 'Berytus', 'Byblos', 'Tripolis', 'Aradus',
  'Caesarea Maritima', 'Dora', 'Ptolemais', 'Scythopolis', 'Pella', 'Gadara',
  'Antipatris', 'Sebaste', 'Neapolis', 'Jerusalem', 'Joppa', 'Gaza',
  'Ascalon', 'Azotus', 'Jamnia', 'Caesarea Philippi', 'Batanea',
  'Sepphoris', 'Tiberias', 'Tarichaea', 'Gischala',
  'Gerasa', 'Philadelphia', 'Bostra', 'Petra', 'Medaba', 'Oboda', 'Aila',
  'Hegra', 'Dumatha',
  'Pelusium', 'Rhinocolura', 'Alexandria', 'Athribis', 'Leontopolis',
  'Memphis', 'Arsinoe', 'Oxyrhynchus', 'Thebes', 'Myos Hormos', 'Syene',
  'Berenice', 'Salamis', 'Paphos', 'Tarsus', 'Seleucia Trachea',
];

// Anatolia, which the commission does not carry and a man proclaimed at
// Antioch with the Danube six weeks away has to be given by its own
// governors. Niger was; Cassius, with a living emperor at his back, was not.
const ANATOLIA = [
  'Caesarea Mazaca', 'Tyana', 'Melitene', 'Iconium', 'Ancyra', 'Pisidia',
  'Attalia', 'Nicaea', 'Smyrna', 'Halicarnassus', 'Rhodes', 'Sinope',
  'Trapezus',
];

// 193: Niger's East, which was the commission plus the whole of Asia Minor and the
// city on the crossing — and minus the two harbours that read the field
// correctly on the first ballot. Laodicea and Tyre declared for Severus while
// Antioch was still cheering, were sacked by Niger for it, and were paid back
// afterwards with everything Antioch lost.
const NIGERS_EAST = THE_EASTERN_COMMAND
  .filter((n) => n !== 'Laodicea' && n !== 'Tyre')
  .concat(ANATOLIA, ['Byzantion']);

// Zenobia's empire at its height, 270-272 (SPEC §239): Syria, Phoenicia,
// Palestine, Arabia, Egypt and the road up through Cilicia into Anatolia as
// far as Ancyra. Only what Rome still holds goes over — a chapter in which
// the Nasi's state took Judaea keeps it, and Palmyra takes what is left.
const PALMYRENE_EMPIRE = [
  'Palmyra', 'Antioch', 'Seleucia Pieria', 'Laodicea', 'Apamea', 'Emesa',
  'Chalcis', 'Damascus', 'Beroea', 'Cyrrhus', 'Zeugma', 'Samosata',
  'Tyre', 'Sidon', 'Berytus', 'Byblos', 'Tripolis', 'Aradus',
  'Caesarea Maritima', 'Dora', 'Ptolemais', 'Scythopolis', 'Pella', 'Gadara',
  'Antipatris', 'Sebaste', 'Neapolis', 'Jerusalem', 'Joppa', 'Gaza',
  'Ascalon', 'Azotus', 'Jamnia', 'Gerasa', 'Philadelphia', 'Bostra', 'Petra',
  'Medaba', 'Oboda', 'Aila',
  'Pelusium', 'Rhinocolura', 'Alexandria', 'Athribis', 'Leontopolis',
  'Memphis', 'Arsinoe', 'Oxyrhynchus', 'Thebes', 'Myos Hormos', 'Syene',
  'Berenice', 'Tarsus', 'Seleucia Trachea', 'Salamis', 'Paphos',
  'Caesarea Mazaca', 'Tyana', 'Iconium', 'Ancyra',
];

// One claimant at a time, dressed for the man whose it is (SPEC §239). The
// banner is singular and `secedeTag` refuses one somebody is already flying,
// so the raise is guarded and every arc in this chapter is put out by the
// card that settles it before the next one needs the tag.
function raiseClaimant(ctx, spec) {
  const h = ctx.helpers;
  if (ctx.game.tags.USR) return null;
  const claimant = h.secedeTag(ctx, 'ROM', 'USR', {
    provinces: spec.provinces,
    share: spec.share,
    name: spec.name,
    color: spec.color,
    opinion: -160,
    stability: spec.stability,
    legitimacy: spec.legitimacy,
    ruler: spec.ruler,
  });
  if (claimant) {
    h.declareWar(ctx, 'ROM', 'USR', spec.war);
    if (spec.modifier) h.addTagModifier(ctx, 'USR', spec.modifier);
  }
  return claimant;
}

// The rising itself happens whichever way the player answers it: each card's
// options are what the player's own state does about a civil war, not whether
// the civil war happens.
function raiseCassius(ctx) {
  return raiseClaimant(ctx, {
    // The commission and nothing beyond it: three months and six days of it.
    provinces: THE_EASTERN_COMMAND,
    share: 0.3,
    name: 'The Empire of Avidius Cassius',
    color: [154, 74, 74],
    stability: 0,
    legitimacy: 35,
    war: 'The Acclamation in the East',
    ruler: { name: 'Avidius Cassius', title: 'Augustus', gov: 2, infl: 2, mar: 5, age: 45 },
    modifier: {
      id: 'the_whole_east', name: 'The Eastern Command', months: -1,
      effects: { moraleMult: 1.1, incomeMult: 0.95 },
    },
  });
}

function raiseNiger(ctx) {
  return raiseClaimant(ctx, {
    provinces: NIGERS_EAST,
    share: 0.4,
    name: 'The Empire of Pescennius Niger',
    color: [64, 84, 116],
    stability: 0,
    legitimacy: 45,
    war: 'The War of the Three Emperors',
    ruler: { name: 'Pescennius Niger', title: 'Augustus', gov: 3, infl: 3, mar: 3, age: 58 },
    modifier: {
      id: 'the_eastern_ballot', name: 'The Cities of the East', months: -1,
      effects: { incomeMult: 1.1, manpowerMult: 1.1 },
    },
  });
}

function raisePalmyra(ctx) {
  return raiseClaimant(ctx, {
    provinces: PALMYRENE_EMPIRE,
    share: 0.35,
    name: 'The Palmyrene Empire',
    color: [196, 150, 62],
    stability: 1,
    legitimacy: 55,
    war: 'The Palmyrene Secession',
    ruler: { name: 'Zenobia', title: 'Augusta', gov: 4, infl: 4, mar: 3, age: 29 },
    modifier: {
      id: 'the_caravan_cities', name: 'The Caravan Cities', months: -1,
      effects: { incomeMult: 1.12, moraleMult: 1.05 },
    },
  });
}

// …and the card that puts one out. `dissolveTag` folds the whole of the
// claimant back into Rome — ground, garrisons, treasury, muster rolls — ends
// the civil war with the man who was fighting it, and leaves the banner free
// for the next claim (SPEC §239).
function settleClaim(ctx, line) {
  if (!ctx.game.tags.USR) return false;
  ctx.helpers.dissolveTag(ctx, 'USR', 'ROM', { chronicle: line });
  return true;
}

export const EVENTS_132_WORLD = [

  // ── W1 · 175 ──────────────────────────────────────────────────────────────
  {
    id: 'ev2_avidius_cassius',
    title: 'The Governor of Syria Is Acclaimed',
    worldLabel: 'Avidius Cassius is proclaimed emperor in the East',
    desc: 'A rumour reaches Alexandria that Marcus Aurelius is dead on the Danube, and '
      + 'Avidius Cassius — the general who burned Seleucia, governor of Syria with a '
      + 'commission over the whole East — is acclaimed emperor by his legions. Egypt '
      + 'declares for him within days. Then the rumour turns out to be false, and the '
      + 'East is left holding a usurper for three months and six days, which is exactly '
      + 'long enough for every city, temple and phylarch between the Nile and the '
      + 'Euphrates to have committed itself in writing. He is killed by his own '
      + 'centurion. Marcus burns the correspondence unread, publicly, which is either '
      + 'the most magnanimous act of the century or the most efficient.',
    forTag: 'both',
    major: true,
    date: { y: 175, m: 5 },
    world: true,
    aiOption: 0,
    historical: 'The East declared for Cassius; he was murdered in the third month, and Marcus burned the letters unread.',
    options: [
      {
        label: 'Send to Alexandria; the East has its own emperor',
        tooltip: '+120 talents and +15 martial points from a grateful usurper — and a letter with your seal on it in a bundle you must hope somebody burns: −10 legitimacy and "The Letters Were Kept" (−5% income for 60 months).',
        effects: guard('ev2_avidius_cassius:0', (ctx) => {
          const h = ctx.helpers;
          const me = ctx.game.playerTag;
          raiseCassius(ctx);
          h.adjust(ctx, me, { treasury: 120, mar: 15, legitimacy: -10 });
          h.addTagModifier(ctx, me, {
            id: 'letters_were_kept', name: 'The Letters Were Kept', months: 60,
            effects: { incomeMult: 0.95 },
          });
          h.setFlag(ctx, 'backedCassius', true);
          h.chronicle(ctx, 'era', 'The East declares for Avidius Cassius; the letters are written, and not all of them are burned.');
        }),
      },
      {
        label: 'Wait for the second courier',
        tooltip: 'The oldest eastern policy there is: +5 legitimacy and no correspondence to explain. Antioch and Alexandria +1 unrest for 12 months while the question is open.',
        effects: guard('ev2_avidius_cassius:1', (ctx) => {
          const h = ctx.helpers;
          raiseCassius(ctx);
          h.adjust(ctx, ctx.game.playerTag, { legitimacy: 5 });
          stirCities(ctx, ['Antioch', 'Alexandria'], 'the_open_question', 'The Question Is Open', 12, { unrest: 1 });
          h.chronicle(ctx, 'era', 'Avidius Cassius is acclaimed and killed within the season; the prudent waited for the second courier.');
        }),
      },
    ],
  },

  // ── W1b · 175 ─────────────────────────────────────────────────────────────
  {
    id: 'ev2_cassius_killed',
    title: 'Three Months and Six Days',
    worldLabel: 'A centurion ends the eastern empire; Marcus burns the letters',
    desc: 'The second courier says that Marcus Aurelius is alive, on the Danube, and '
      + 'coming. After that the arithmetic is quick: a decurion and a centurion take '
      + 'Avidius Cassius on the road, and his head goes west to an emperor who refuses '
      + 'to look at it and orders it buried. Marcus reaches Syria to find a province '
      + 'that has spent a season writing to the wrong man, and does the one thing '
      + 'nobody has planned for — burns the correspondence unread, in public, before '
      + 'anybody can be denounced with it. Not one senator is executed. The province '
      + 'is not punished; the Egyptian prefect who declared for Cassius is exiled and '
      + 'nothing worse. The only permanent measure is administrative and unanswerable: '
      + 'no man may govern the province he was born in, ever again.',
    forTag: 'both',
    decider: 'ROM',
    major: true,
    date: { y: 175, m: 8 },
    world: true,
    aiOption: 0,
    historical: 'Cassius was killed by his own officers after three months and six days; Marcus burned the letters unread, executed no senator, and barred every governor from his native province.',
    options: [
      {
        label: 'Burn them unread',
        tooltip: 'The East comes back under Rome whole — ground, garrisons and treasury. Rome +12 legitimacy and +1 stability, and "No Man Governs His Own" for 240 months: a governor who is a stranger to his province cannot be its patron (−0.2 unrest everywhere) and costs more to keep there (+3% administration). Antioch and Alexandria +1 unrest for 24 months while everyone works out who is still holding whose letter.',
        effects: guard('ev2_cassius_killed:0', (ctx) => {
          const h = ctx.helpers;
          // Three months and six days (SPEC §249): the East that left in May
          // is Rome's again in August, and the banner is free for the next
          // claim on it.
          settleClaim(ctx, 'A centurion takes Avidius Cassius on the road, and the East that '
            + 'declared for him in May is Rome\'s again by August; Marcus burns the letters unread.');
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { legitimacy: 12, stability: 1 });
            h.addTagModifier(ctx, 'ROM', {
              id: 'no_man_governs_his_own', name: 'No Man Governs His Own',
              months: 240, effects: { unrestAll: -0.2, adminMult: 1.03 },
            });
          }
          stirCities(ctx, ['Antioch', 'Alexandria'], 'the_burned_letters',
            'The Letters Nobody Read', 24, { unrest: 1 });
          h.chronicle(ctx, 'era', 'Marcus burns the eastern correspondence unread and executes nobody; '
            + 'the one lasting measure is that no man will govern the province he was born in.');
        }),
      },
    ],
  },

  // ── W2 · 193 ──────────────────────────────────────────────────────────────
  {
    id: 'ev2_pescennius_niger',
    title: 'The Year of the Five Emperors',
    worldLabel: 'Syria proclaims Niger; the empire is auctioned',
    desc: 'The Praetorians kill Pertinax and sell the empire at auction in their camp — '
      + 'the winning bid is twenty-five thousand sesterces a man — and within weeks three '
      + 'armies have decided that they can bid too. Syria proclaims Pescennius Niger, '
      + 'Britain proclaims Albinus, Pannonia proclaims Septimius Severus, and Severus is '
      + 'the one who is closest to Rome and moves fastest. The East will spend two years '
      + 'finding out what that costs: Niger dies fleeing to the Euphrates, Byzantium is '
      + 'starved out and levelled, Antioch loses its status to Laodicea, and the cities '
      + 'that guessed right on the first ballot are made rich.',
    forTag: 'both',
    major: true,
    date: { y: 193, m: 4 },
    world: true,
    aiOption: 0,
    historical: 'Syria declared for Niger and paid for it; Severus won, demoted Antioch and rewarded the cities that had backed him.',
    options: [
      {
        label: 'Declare for Niger — the East votes for the East',
        tooltip: '+150 talents and +2,000 manpower now; when Severus wins, "Severus Remembers" (−10% income, +1 unrest in the eastern cities, 96 months) and −10 legitimacy.',
        effects: guard('ev2_pescennius_niger:0', (ctx) => {
          const h = ctx.helpers;
          const me = ctx.game.playerTag;
          raiseNiger(ctx);
          h.adjust(ctx, me, { treasury: 150, manpower: 2000, legitimacy: -10 });
          h.addTagModifier(ctx, me, {
            id: 'severus_remembers', name: 'Severus Remembers', months: 96,
            effects: { incomeMult: 0.90 },
          });
          stirCities(ctx, ['Antioch', 'Laodicea'], 'severus_remembers_p', 'Severus Remembers', 96, { unrest: 1 });
          h.setFlag(ctx, 'backedNiger', true);
          h.chronicle(ctx, 'era', 'The East declares for Pescennius Niger; Severus wins, and Antioch is demoted to a village of Laodicea.');
        }),
      },
      {
        label: 'Declare for the man with the nearest legions',
        tooltip: 'Cynical and correct: +8 legitimacy, +80 talents from the settlement, "The Right Ballot" (+5% income for 96 months).',
        effects: guard('ev2_pescennius_niger:1', (ctx) => {
          const h = ctx.helpers;
          const me = ctx.game.playerTag;
          raiseNiger(ctx);
          h.adjust(ctx, me, { treasury: 80, legitimacy: 8 });
          h.addTagModifier(ctx, me, {
            id: 'right_ballot', name: 'The Right Ballot', months: 96,
            effects: { incomeMult: 1.05 },
          });
          h.chronicle(ctx, 'era', 'Severus takes the purple; the cities that guessed right on the first ballot are made rich.');
        }),
      },
    ],
  },

  // ── W2b · 194 ─────────────────────────────────────────────────────────────
  {
    id: 'ev2_issus',
    title: 'The Pass at Issus',
    worldLabel: 'Severus breaks Niger at Issus; the East loses its emperor',
    desc: 'Cyzicus, then Nicaea, then the Cilician Gates, and finally the pass where '
      + 'Alexander beat Darius, because the ground has not moved and neither has the '
      + 'argument for standing on it. Twenty thousand of Niger\'s men are said to fall '
      + 'at Issus; he runs for Antioch, finds it emptying, runs for the Euphrates and '
      + 'the Parthians, and is caught and beheaded short of the river. Then comes the '
      + 'settlement, which is the part the East remembers. Antioch, which acclaimed '
      + 'him, is stripped of its status and made a village of Laodicea, which did not. '
      + 'Neapolis loses its civic rights. Byzantium holds out another two years and is '
      + 'levelled to the ground for it — walls, theatres, baths, the lot — by an '
      + 'emperor who then complains that he has taken a fortress off the frontier. And '
      + 'every city that guessed right on the first ballot has its guess written into '
      + 'its charter.',
    forTag: 'both',
    decider: 'ROM',
    major: true,
    date: { y: 194, m: 5 },
    world: true,
    aiOption: 0,
    historical: 'Niger was broken at Issus in 194 and killed fleeing to the Euphrates; Severus demoted Antioch to a village of Laodicea, stripped Neapolis of its rights, and levelled Byzantium in 196.',
    options: [
      {
        label: 'The settlement of the East',
        tooltip: 'The East is one empire again — every province, garrison and talent back under Rome. Rome +10 legitimacy and +1 stability. Antioch is demoted (−2 development, +2 unrest for 120 months) and Byzantion levelled (−3 development, +2 unrest for 120 months); Neapolis loses its civic rights (+2 unrest for 96 months); and Laodicea and Tyre are paid back for the first ballot (+15% tax for 120 months).',
        effects: guard('ev2_issus:0', (ctx) => {
          const h = ctx.helpers;
          // Issus, and the two years of settlement after it (SPEC §249): the
          // eastern empire stops existing and everything it held is Rome's.
          settleClaim(ctx, 'Severus breaks Niger at Issus and takes his head short of the Euphrates; '
            + 'the East is one empire again, and Antioch is a village of Laodicea.');
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { legitimacy: 10, stability: 1 });
          const demote = (name, tax, prod) => {
            const p = ctx.prov && ctx.prov(name);
            if (!p || !p.dev) return;
            p.dev.tax = Math.max(1, (p.dev.tax || 1) - tax);
            p.dev.prod = Math.max(1, (p.dev.prod || 1) - prod);
          };
          demote('Antioch', 1, 1);
          demote('Byzantion', 2, 1);
          stirCities(ctx, ['Antioch'], 'a_village_of_laodicea', 'A Village of Laodicea', 120, { unrest: 2 });
          stirCities(ctx, ['Byzantion'], 'the_walls_come_down', 'The Walls Come Down', 120, { unrest: 2 });
          stirCities(ctx, ['Neapolis'], 'the_rights_withdrawn', 'The Rights Withdrawn', 96, { unrest: 2 });
          stirCities(ctx, ['Laodicea', 'Tyre'], 'the_first_ballot', 'The First Ballot', 120, { taxMult: 1.15 });
          h.chronicle(ctx, 'era', 'Severus settles the East: Antioch is demoted, Neapolis loses its rights, '
            + 'Byzantium is levelled, and the cities that guessed right on the first ballot are made rich.');
        }),
      },
    ],
  },

  // ── W3 · 197 ──────────────────────────────────────────────────────────────
  {
    id: 'ev2_severus_ctesiphon',
    title: 'Ctesiphon Sacked Again',
    worldLabel: 'Severus sacks Ctesiphon and annexes Mesopotamia',
    desc: 'Having settled the civil war, Severus takes the army east and does to Ctesiphon '
      + 'what Trajan did and what Avidius Cassius did: takes it, empties it, kills the men '
      + 'and sells a hundred thousand of the rest. Then he does the thing his predecessors '
      + 'did not, and keeps the ground — a new province of Mesopotamia with two legions in '
      + 'it, garrisoned forward at Nisibis and Singara. The Euphrates stops being the '
      + 'border and starts being a river the border has crossed. Every war of the next four '
      + 'centuries is fought over the ground he just annexed.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 197, m: 12 },
    world: true,
    aiOption: 0,
    options: [
      {
        label: 'The frontier moves to the Tigris',
        tooltip: 'Rome +250 talents of plunder and +1 stability; Parthia −10 legitimacy, −6,000 manpower, and Nisibis and Singara +2 unrest for 60 months ("The Forward Garrisons").',
        effects: guard('ev2_severus_ctesiphon:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { treasury: 250, stability: 1 });
          if (alive(ctx, 'PAR')) h.adjust(ctx, 'PAR', { legitimacy: -10, manpower: -6000 });
          stirCities(ctx, ['Nisibis', 'Singara'], 'forward_garrisons', 'The Forward Garrisons', 60, { unrest: 2 });
          h.chronicle(ctx, 'era', 'Severus sacks Ctesiphon and keeps the ground: Mesopotamia becomes a province with two legions in it.');
        }),
      },
    ],
  },

  // ── W4 · 212 ──────────────────────────────────────────────────────────────
  {
    id: 'ev2_antoniniana',
    title: 'Everyone Is a Roman Now',
    worldLabel: 'The Constitutio Antoniniana: citizenship for all',
    desc: 'Caracalla grants Roman citizenship to every free inhabitant of the empire. Dio '
      + 'says it was for the inheritance tax, which he had just doubled and which only '
      + 'citizens paid, and Dio is probably right and it does not matter. What it does is '
      + 'end the category the whole provincial order was built on. There are no longer '
      + 'peregrines with local law and local courts; there is one law, everywhere, '
      + 'administered by governors who now have jurisdiction over everybody in the '
      + 'province. For the Jews it changes the meaning of the fiscus Judaicus from a '
      + 'tribute paid by a conquered nation to a tax levied on a religion — the first '
      + 'time in Roman practice that those are different things.',
    forTag: 'both',
    decider: 'ROM',
    major: true,
    date: { y: 212, m: 1 },
    world: true,
    aiOption: 0,
    options: [
      {
        label: 'One law, and the inheritance tax with it',
        tooltip: 'Rome +8% income permanently ("The Universal Citizenship") and +5 legitimacy; every province Rome owns loses 0.5 unrest for 60 months — and the fiscus Judaicus is now a levy on a faith rather than tribute from a nation.',
        effects: guard('ev2_antoniniana:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { legitimacy: 5 });
            h.addTagModifier(ctx, 'ROM', {
              id: 'universal_citizenship', name: 'The Universal Citizenship', months: -1,
              effects: { incomeMult: 1.08 },
            });
          }
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (!p || p.impassable || p.owner !== 'ROM') continue;
            h.addProvinceModifier(ctx, p.name, {
              id: 'civitas_romana', name: 'Civitas Romana', months: 60,
              effects: { unrest: -0.5 },
            });
          }
          h.setFlag(ctx, 'universalCitizenship', true);
          h.chronicle(ctx, 'era', 'Caracalla makes every free provincial a Roman citizen; the category the provincial order was built on ceases to exist.');
        }),
      },
    ],
  },

  // ── W5 · 224 ──────────────────────────────────────────────────────────────
  {
    id: 'ev2_ardashir',
    title: 'The King of Kings Is Dead',
    worldLabel: 'Ardashir overthrows the Arsacids; Persia is reborn',
    desc: 'A vassal king from Fars named Ardashir, son of Papak, kills Artabanus on the '
      + 'plain of Hormozdgan and takes the crown of a five-hundred-year-old dynasty. What '
      + 'replaces it is not another Parthia. The Arsacids were the first among feudal '
      + 'equals, tolerant to the point of indifference, and it was that indifference that '
      + 'once let a King of Kings offer silver to a Jewish prince in revolt against Rome. '
      + 'The house of Sasan builds a centralized empire with a state clergy, an official '
      + 'scripture, and a fire kept for the king in every province — and it wants Rome\'s '
      + 'eastern provinces back on the grounds that Cyrus held them. The comfortable '
      + 'eastern balance ends this month, and everything that lives in the gap between '
      + 'the two empires had better find a patron.',
    forTag: 'both',
    major: true,
    date: { y: 224, m: 4 },
    world: true,
    aiOption: 0,
    options: [
      {
        label: 'The house of Sasan takes the crown',
        tooltip: 'Parthia becomes the Sasanian Empire — a centralized state with a state church. Any inherited friendship between Judaea and the Arsacid court lapses with the dynasty that made it; the new King of Kings starts +12 martial and −20 opinion of Rome.',
        effects: guard('ev2_ardashir:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (alive(ctx, 'PAR')) {
            h.rebrandTag(ctx, 'PAR', { name: 'Sasanian Empire', flag: 'SAS' });
            h.setRuler(ctx, 'PAR', { name: 'Ardashir I', title: 'King of Kings', gov: 4, infl: 3, mar: 4, age: 44 });
            h.adjust(ctx, 'PAR', { mar: 12, legitimacy: 10, stability: 1 });
            h.addTagModifier(ctx, 'PAR', {
              id: 'house_of_sasan', name: 'The House of Sasan', months: -1,
              effects: { disciplineMult: 1.06, incomeMult: 1.05 },
            });
            // The bond that made Parthia interesting to a Jewish state was
            // Arsacid, and it dies with the Arsacids (SPEC §104).
            h.retireAffinity(ctx, 'JUD', 'PAR');
            const par = g.tags.PAR;
            if (par) {
              if (!par.opinion) par.opinion = {};
              par.opinion.ROM = Math.max(-200, (par.opinion.ROM || 0) - 20);
              par.opinion.JUD = Math.min(200, Math.max(-200, (par.opinion.JUD || 0) - 40));
            }
          }
          h.setFlag(ctx, 'sasanianRise', true);
          h.chronicle(ctx, 'era', 'Ardashir kills Artabanus and takes the crown: the Arsacid balance is over, and the empire that replaces it has a state church.');
        }),
      },
    ],
  },

  // ── W6 · 240 ──────────────────────────────────────────────────────────────
  {
    id: 'ev2_third_century_crisis',
    title: 'The Century of Iron and Rust',
    worldLabel: 'The empire enters the crisis of the third century',
    desc: 'From here to Diocletian the throne changes hands upward of twenty times and '
      + 'almost never peacefully; the silver in the denarius falls from a half to about a '
      + 'fortieth; the Rhine and the Danube open; Gaul and the East each secede under '
      + 'their own emperors for a decade. No single event announces this — it is a change '
      + 'in the weather. Cities that have not had walls since Augustus start building them, '
      + 'in a hurry, out of their own tombstones and theatres, which is how we know what '
      + 'the third century thought its odds were.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 240, m: 1 },
    world: true,
    aiOption: 0,
    options: [
      {
        label: 'The walls go up out of the theatres',
        tooltip: 'Rome: −12% income and −1 stability for 480 months ("The Crisis of the Third Century") — the debased coin, the open frontiers and the emperors who last a season. It lifts when Diocletian restores the coinage.',
        effects: guard('ev2_third_century_crisis:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) {
            h.addTagModifier(ctx, 'ROM', {
              id: 'third_century_crisis', name: 'The Crisis of the Third Century', months: 480,
              effects: { incomeMult: 0.88, manpowerMult: 0.9 },
            });
            h.adjust(ctx, 'ROM', { stability: -1 });
          }
          h.setFlag(ctx, 'thirdCenturyCrisis', true);
          h.chronicle(ctx, 'era', 'The century of iron and rust: debased silver, open frontiers, and cities building walls out of their own theatres.');
        }),
      },
    ],
  },

  // ── W7 · 250 ──────────────────────────────────────────────────────────────
  {
    id: 'ev2_decian_persecution',
    title: 'The Certificate of Sacrifice',
    worldLabel: 'Decius orders universal sacrifice; the libelli are issued',
    desc: 'Decius orders every inhabitant of the empire to sacrifice to the gods, before a '
      + 'commission, and to receive a certificate saying they have. It is not aimed at '
      + 'anyone; it is aimed at everyone, which is what makes it new. Forty-odd of the '
      + 'certificates survive from Egypt, and they are the dullest documents imaginable — '
      + 'I have always sacrificed, I have sacrificed in your presence, please certify. The '
      + 'Jews are exempt as a licensed nation whose refusal to sacrifice is ancestral and '
      + 'therefore respectable. The Christians are not a nation and have no ancestors, and '
      + 'for them the certificate is apostasy. Most of them get one. The ones who do not '
      + 'become the reason the ones who did are still arguing about it fifty years later.',
    forTag: 'both',
    decider: 'ROM',
    major: true,
    date: { y: 250, m: 1 },
    world: true,
    aiOption: 0,
    historical: 'The edict was enforced empire-wide; the Jews were exempt as a licit nation and the Christians were not.',
    options: [
      {
        label: 'Everyone sacrifices, and takes a certificate',
        tooltip: 'Rome +180 talents from the commissions and +1 stability; the great cities +2 unrest for 36 months ("The Commissions Sit"). The Jewish communities are exempt as a licensed nation — which is the one privilege of the licence, and the reason it was worth accepting the rescript.',
        effects: guard('ev2_decian_persecution:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { treasury: 180, stability: 1 });
          stirCities(ctx, EAST.concat(['Roma', 'Corinth', 'Smyrna']), 'commissions_sit', 'The Commissions Sit', 36, { unrest: 2 });
          h.setFlag(ctx, 'decianEdict', true);
          h.chronicle(ctx, 'era', 'Decius orders universal sacrifice and issues certificates; the Jews are exempt as a licit nation, and the Christians are not.');
        }),
      },
    ],
  },

  // ── W8 · 260 ──────────────────────────────────────────────────────────────
  {
    id: 'ev2_valerian_taken',
    title: 'An Emperor, Alive',
    worldLabel: 'Shapur takes Valerian alive at Edessa',
    desc: 'Shapur has the whole thing carved on a cliff at Naqsh-e Rustam in three '
      + 'languages, and then carved again as a relief: a mounted King of Kings, and a '
      + 'Roman emperor kneeling, and the king\'s hand on his wrist. Valerian came to '
      + 'relieve Edessa with seventy thousand men and came to a parley and did not come '
      + 'back. There is no precedent. Emperors have been killed by their own troops, by '
      + 'their own guard, by Germans in a swamp — no emperor has ever been a prisoner. '
      + 'The East does the arithmetic that same season: whatever else Rome is, it is no '
      + 'longer the thing that cannot be beaten.',
    forTag: 'both',
    decider: 'ROM',
    major: true,
    date: { y: 260, m: 6 },
    world: true,
    aiOption: 0,
    options: [
      {
        label: 'The king\'s hand is on his wrist',
        tooltip: 'Rome −20 legitimacy, −1 stability, −15,000 manpower and "The Emperor Kneeling" (−8% morale for 120 months); Persia +15 legitimacy and +200 talents of ransom that is never paid because there is no ransom.',
        effects: guard('ev2_valerian_taken:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { legitimacy: -20, stability: -1, manpower: -15000 });
            h.addTagModifier(ctx, 'ROM', {
              id: 'emperor_kneeling', name: 'The Emperor Kneeling', months: 120,
              effects: { moraleMult: 0.92 },
            });
          }
          if (alive(ctx, 'PAR')) h.adjust(ctx, 'PAR', { legitimacy: 15, treasury: 200 });
          h.setFlag(ctx, 'valerianTaken', true);
          h.chronicle(ctx, 'era', 'Shapur takes Valerian alive at Edessa and has it carved on a cliff; no emperor has ever been a prisoner.');
        }),
      },
    ],
  },

  // ── W9 · 267 ──────────────────────────────────────────────────────────────
  {
    id: 'ev2_palmyra_rises',
    title: 'The Caravan City Takes the East',
    worldLabel: 'Zenobia takes Syria, Egypt and the Levant',
    desc: 'With Valerian in Persia and Gallienus holding the Danube, the East is defended '
      + 'by a caravan city and its own cavalry. Odaenathus of Palmyra beats Shapur back '
      + 'across the Euphrates twice and is given, in effect, the whole eastern command; '
      + 'then he is murdered, and his widow decides that what her husband held for Rome '
      + 'she will hold for her son. Zenobia takes Syria, then Arabia, then Egypt, mints '
      + 'her own coin, keeps a court of philosophers, and is reported — by writers with '
      + 'reasons of their own — to be notably well disposed toward the Jews of Alexandria '
      + 'and Egypt. For five years the Levant is governed from the desert, by a woman, and '
      + 'not from Rome at all.',
    forTag: 'both',
    major: true,
    date: { y: 269, m: 6 },
    world: true,
    aiOption: 0,
    historical: 'The eastern cities went over to Palmyra; Aurelian took it all back in eighteen months and levelled the city.',
    options: [
      {
        label: 'Send to Palmyra — the East can hold the East',
        tooltip: '+100 talents and +2,500 manpower from the Palmyrene settlement, and Jewish communities under Palmyrene rule breathe: −1 unrest for 48 months in the eastern cities. When Aurelian comes back, "Aurelian\'s Reckoning": −12% income for 72 months and −8 legitimacy.',
        effects: guard('ev2_palmyra_rises:0', (ctx) => {
          const h = ctx.helpers;
          const me = ctx.game.playerTag;
          raisePalmyra(ctx);
          h.adjust(ctx, me, { treasury: 100, manpower: 2500, legitimacy: -8 });
          stirCities(ctx, EAST, 'zenobias_peace', 'Zenobia\'s Peace', 48, { unrest: -1 });
          h.addTagModifier(ctx, me, {
            id: 'aurelians_reckoning', name: 'Aurelian\'s Reckoning', months: 72,
            effects: { incomeMult: 0.88 },
          });
          h.setFlag(ctx, 'backedPalmyra', true);
          h.chronicle(ctx, 'era', 'The eastern cities go over to Palmyra; for five years the Levant is governed from the desert.');
        }),
      },
      {
        label: 'Rome will come back; Rome always comes back',
        tooltip: 'Five years of Palmyrene taxation with none of the Palmyrene favour: −60 talents and the eastern cities +1 unrest for 48 months — and when Aurelian levels the city, the loyal are remembered: +10 legitimacy.',
        effects: guard('ev2_palmyra_rises:1', (ctx) => {
          const h = ctx.helpers;
          const me = ctx.game.playerTag;
          raisePalmyra(ctx);
          h.adjust(ctx, me, { treasury: -60, legitimacy: 10 });
          stirCities(ctx, EAST, 'palmyrene_levy', 'The Palmyrene Levy', 48, { unrest: 1 });
          h.chronicle(ctx, 'era', 'Palmyra takes the East and Aurelian takes it back; the cities that waited are remembered kindly.');
        }),
      },
    ],
  },

  // ── W10 · 273 ─────────────────────────────────────────────────────────────
  {
    id: 'ev2_aurelian_palmyra',
    title: 'Aurelian Levels Palmyra',
    worldLabel: 'Aurelian destroys Palmyra and restores the East',
    desc: 'Eighteen months, two battles and a siege: Zenobia is taken on the road to the '
      + 'Euphrates and walks in a triumph in gold chains, and when the city revolts a '
      + 'second time Aurelian comes back and finishes it. What is left is a garrison, a '
      + 'temple and a field of columns. The caravan road that made Palmyra rich for three '
      + 'hundred years moves permanently south and east, and the desert route through '
      + 'Syria never carries that much silk again. Aurelian is titled Restitutor Orbis and '
      + 'is murdered two years later by his own secretary over a forged list.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 273, m: 8 },
    world: true,
    aiOption: 0,
    options: [
      {
        label: 'Restitutor Orbis',
        tooltip: 'Rome +12 legitimacy and +1 stability; Palmyra −8 development and +3 unrest for 120 months ("A Field of Columns"), and the desert silk road never recovers.',
        effects: guard('ev2_aurelian_palmyra:0', (ctx) => {
          const h = ctx.helpers;
          // Immae, Emesa, and then the city itself (SPEC §239): the court
          // that governed the Levant from the desert for five years stops
          // existing, and everything it held is Rome's again.
          if (ctx.game.tags.USR) {
            h.dissolveTag(ctx, 'USR', 'ROM', {
              chronicle: 'Aurelian beats Zenobia twice, takes her alive, and levels Palmyra; '
                + 'the East is Roman again and the caravan city never trades another season.',
            });
          }
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { legitimacy: 12, stability: 1 });
          const p = ctx.prov && ctx.prov('Palmyra');
          if (p && p.dev) {
            p.dev.tax = Math.max(1, (p.dev.tax || 1) - 3);
            p.dev.prod = Math.max(1, (p.dev.prod || 1) - 4);
            p.dev.mp = Math.max(1, (p.dev.mp || 1) - 1);
          }
          h.addProvinceModifier(ctx, 'Palmyra', {
            id: 'field_of_columns', name: 'A Field of Columns', months: 120,
            effects: { unrest: 3, taxMult: 0.5 },
          });
          h.chronicle(ctx, 'era', 'Aurelian levels Palmyra; the silk road moves south and the desert route never carries that much again.');
        }),
      },
    ],
  },

  // ── SPEC §206 · 300 ───────────────────────────────────────────────────────
  {
    id: 'ev2_shammar_union',
    title: 'King of Saba, dhu-Raydan, Hadramawt and Yamnat',
    worldLabel: 'Shammar Yuharish unites the incense kingdoms under Himyar',
    desc: 'The southern end of the world\'s oldest trade route consolidates, and the '
      + 'title says it all. For four hundred years the incense country has been '
      + 'a quarrel of crowns — Saba against Himyar against Hadramawt, the '
      + 'caravan road against the monsoon ports. Shammar Yuharish of Himyar '
      + 'ends the argument: Shabwa falls, the frankincense terraces and the '
      + 'island of Dioscurida pass to Zafar, and the king begins writing his '
      + 'style the way his successors will write it for two hundred years — '
      + 'king of Saba, of dhu-Raydan, of Hadramawt and of Yamnat, the whole '
      + 'south in one breath. It is the largest state Arabia has ever '
      + 'produced, it commands both shores of the strait\'s approaches, and '
      + 'the two empires to the north will spend the next three centuries '
      + 'discovering that it, too, has opinions.',
    forTag: 'both',
    major: true,
    date: { y: 300, m: 5 },
    world: true,
    aiOption: 0,
    when: (ctx) => alive(ctx, 'HMY'),
    historical: 'Shammar Yuharish completed the Himyarite unification about 275-300, absorbing Hadramawt; the fourfold royal style is on his inscriptions.',
    options: [
      {
        label: 'The whole south in one breath',
        tooltip: 'Hadramawt\'s lands — Shabwa, Moscha, Dioscurida — pass to Himyar, whose crown gains the fourfold style (+10 legitimacy, +5% income permanently). The old frankincense kingdom is struck from the lists.',
        effects: guard('ev2_shammar_union:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const hmy = who(ctx, 'HMY');
          if (alive(ctx, 'HDR')) {
            const hdr = who(ctx, 'HDR');
            for (const n of ['Shabwa', 'Moscha', 'Dioscurida']) {
              const p = ctx.prov(n);
              if (p && !p.impassable && p.owner === hdr) h.changeOwner(ctx, n, hmy);
            }
            for (const id of Object.keys(g.armies || {})) {
              const a = g.armies[id];
              if (a && a.tag === hdr) h.removeArmy(ctx, id);
            }
          }
          h.adjust(ctx, hmy, { legitimacy: 10 });
          h.addTagModifier(ctx, hmy, {
            id: 'fourfold_style', name: 'King of Saba, dhu-Raydan, Hadramawt and Yamnat', months: -1,
            effects: { incomeMult: 1.05 },
          });
          h.setFlag(ctx, 'shammarUnion', true);
          h.chronicle(ctx, 'era', 'Shammar Yuharish takes Shabwa and the frankincense country: one crown over the whole south, and a royal style that names every kingdom it swallowed.');
        }),
      },
    ],
  },

  // ── W11 · 301 ─────────────────────────────────────────────────────────────
  {
    id: 'ev2_armenia_converts',
    title: 'The First Christian Kingdom',
    worldLabel: 'Armenia becomes the first Christian state',
    desc: 'Gregory the Illuminator is let out of the pit at Artaxata after thirteen years '
      + 'and baptizes Tiridates, and Armenia becomes — a full decade before Constantine '
      + 'sees anything at the Milvian Bridge — the first kingdom on earth to make this '
      + 'religion the religion of the state. It is not a philosophical event. Armenia sits '
      + 'between two empires that have spent four centuries partitioning it, one of which '
      + 'has just acquired a state clergy and a fire on every altar. Choosing a faith that '
      + 'is neither the fire nor the imperial cult is a foreign policy, and it commits the '
      + 'kingdom to the western empire for the next three hundred years.',
    forTag: 'both',
    decider: 'ARM',
    major: true,
    date: { y: 301, m: 3 },
    world: true,
    aiOption: 0,
    options: [
      {
        label: 'The king is baptized in the Araxes',
        tooltip: 'Armenia adopts Christianity as its state faith: +12 legitimacy, +1 stability, and a permanent −20 opinion of the Persian court. The Armenian provinces begin converting.',
        effects: guard('ev2_armenia_converts:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const arm = g.tags && g.tags.ARM;
          if (arm && arm.alive !== false) {
            arm.religion = 'christianity';
            h.adjust(ctx, 'ARM', { legitimacy: 12, stability: 1 });
            if (!arm.opinion) arm.opinion = {};
            arm.opinion.PAR = Math.max(-200, (arm.opinion.PAR || 0) - 20);
            for (let i = 1; i < g.provinces.length; i++) {
              const p = g.provinces[i];
              if (!p || p.impassable || p.owner !== 'ARM' || !Array.isArray(p.pop) || !p.pop.length) continue;
              let total = 0;
              for (const e of p.pop) total += (e && e.n > 0) ? e.n : 0;
              const n = Math.round(total * 0.2);
              if (n > 0) h.addPopulation(ctx, p.name, { r: 'christianity', c: p.culture, n });
            }
          }
          h.setFlag(ctx, 'armeniaChristian', true);
          h.chronicle(ctx, 'era', 'Tiridates is baptized: Armenia is the first kingdom on earth to make Christianity the religion of the state.');
        }),
      },
    ],
  },

  // ── W12 · 303 ─────────────────────────────────────────────────────────────
  {
    id: 'ev2_great_persecution',
    title: 'The Scriptures Are Called In',
    worldLabel: 'Diocletian orders the Great Persecution',
    desc: 'On the feast of the Terminalia the soldiers pull down the church at Nicomedia, '
      + 'in sight of the palace, and the edicts follow in four instalments over two years: '
      + 'churches demolished, scriptures surrendered and burned, clergy arrested, and '
      + 'finally everyone in the empire to sacrifice on pain of death. It is the most '
      + 'systematic thing the Roman state has ever attempted against a religion and it is '
      + 'run by the most competent administration the empire has had in a century. In the '
      + 'West it is enforced for two years; in the East for ten. It fails so completely '
      + 'that the last persecuting emperor issues, from his deathbed, an edict asking the '
      + 'Christians to pray for him.',
    forTag: 'both',
    decider: 'ROM',
    major: true,
    date: { y: 303, m: 2 },
    world: true,
    aiOption: 0,
    options: [
      {
        label: 'Demolish the churches; burn the books',
        tooltip: 'Rome +120 talents of confiscation and +5 legitimacy with the old cults — and every great city +3 unrest for 96 months ("The Edicts of the Terminalia"). Jewish communities are again exempt: they are a licensed nation and this is not aimed at them.',
        effects: guard('ev2_great_persecution:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { treasury: 120, legitimacy: 5 });
          stirCities(ctx, EAST.concat(['Roma', 'Smyrna', 'Corinth', 'Nicaea']), 'edicts_terminalia', 'The Edicts of the Terminalia', 96, { unrest: 3 });
          h.setFlag(ctx, 'greatPersecution', true);
          h.chronicle(ctx, 'era', 'Diocletian orders the churches demolished and the scriptures burned; in the East the edicts are enforced for ten years.');
        }),
      },
    ],
  },

  // ── W13 · 311 ─────────────────────────────────────────────────────────────
  {
    id: 'ev2_galerius_edict',
    title: 'Let Them Pray for Us',
    worldLabel: 'Galerius ends the persecution from his deathbed',
    desc: 'Galerius, who pushed the persecution hardest and is now dying of something the '
      + 'sources describe with relish and at length, issues an edict from Serdica that is '
      + 'remarkable mostly for its tone. We wished to correct everything according to the '
      + 'ancient laws; very many persisted; they were left with neither their own gods nor '
      + 'ours; therefore, by our indulgence, let them be Christians again and rebuild their '
      + 'meeting places — and let them pray to their god for our safety. It is not '
      + 'toleration on principle. It is an administration writing off a policy that did '
      + 'not work, and asking the survivors for their prayers.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 311, m: 4 },
    world: true,
    aiOption: 0,
    options: [
      {
        label: 'By our indulgence, let them be Christians again',
        tooltip: 'The persecution modifiers lift eight years early: "The Edicts of the Terminalia" is removed from every city, Rome −40 talents in restitutions.',
        effects: guard('ev2_galerius_edict:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (!p) continue;
            h.removeModifier(ctx, p.name, 'edicts_terminalia');
          }
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { treasury: -40 });
          h.setFlag(ctx, 'galeriusEdict', true);
          h.chronicle(ctx, 'era', 'Galerius, dying, ends the persecution and asks the Christians to pray for him.');
        }),
      },
    ],
  },

  // ── W14 · 313 ─────────────────────────────────────────────────────────────
  {
    id: 'ev2_milan',
    title: 'The Agreement at Milan',
    worldLabel: 'Constantine and Licinius grant liberty of religion',
    desc: 'Constantine takes Rome at the Milvian Bridge under a sign nobody who was there '
      + 'describes the same way twice, and the following winter he and Licinius agree at '
      + 'Milan that everyone in the empire may follow whatever religion they choose, and '
      + 'that the Christians specifically are to have their confiscated buildings back — '
      + 'at state expense, from whoever bought them, immediately. Read as a document of '
      + 'toleration it is generous and slightly vague. Read as a property settlement it is '
      + 'precise, expensive, and the moment the imperial treasury starts paying for a '
      + 'church. Everything after this follows from the second reading.',
    forTag: 'both',
    decider: 'ROM',
    major: true,
    date: { y: 313, m: 2 },
    world: true,
    aiOption: 0,
    options: [
      {
        label: 'The buildings are restored, at state expense',
        tooltip: 'Rome −150 talents of restitution and +8 legitimacy; the great cities −2 unrest for 60 months ("Liberty of Religion"). The state has begun paying for one of the religions it tolerates.',
        effects: guard('ev2_milan:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { treasury: -150, legitimacy: 8 });
          stirCities(ctx, EAST.concat(['Roma', 'Smyrna', 'Corinth', 'Nicaea']), 'liberty_of_religion', 'Liberty of Religion', 60, { unrest: -2 });
          h.setFlag(ctx, 'edictOfMilan', true);
          h.chronicle(ctx, 'era', 'Constantine and Licinius agree at Milan: liberty of religion, and the confiscated churches restored at state expense.');
        }),
      },
    ],
  },

  // ── W15 · 325 ─────────────────────────────────────────────────────────────
  {
    id: 'ev2_nicaea',
    title: 'The Council and the Calendar',
    worldLabel: 'Nicaea severs Easter from the Jewish reckoning',
    desc: 'Three hundred bishops at imperial expense in a lakeside palace, and the creed '
      + 'is what everyone remembers. The clause that changes more lives is the one about '
      + 'the date. Constantine writes to the churches that were not there, and his '
      + 'argument is not astronomical: it is unbecoming that in the celebration of this '
      + 'most holy feast we should follow the practice of the Jews, who have soiled their '
      + 'hands with a heinous crime — let us have nothing in common with that most hostile '
      + 'people. From this year the church computes its own Easter. The last administrative '
      + 'thread by which a Christian year hung on a rabbinic court in Galilee is cut on '
      + 'purpose, and the reason given in writing is contempt.',
    forTag: 'both',
    decider: 'ROM',
    major: true,
    date: { y: 325, m: 6 },
    world: true,
    aiOption: 0,
    historical: 'The council fixed Easter independently of the Jewish reckoning, and said in writing why.',
    options: [
      {
        label: 'Nothing in common with that most hostile people',
        tooltip: 'The Christian calendar is severed from the Jewish one: the "One Calendar" quiet ends, the quartodeciman dependence is void, and a Judaea that had been keeping the reckoning for both loses it — −8 legitimacy and the Sanhedrin\'s foreign audience.',
        effects: guard('ev2_nicaea:0', (ctx) => {
          const h = ctx.helpers;
          h.removeModifier(ctx, 'Sepphoris', 'one_calendar');
          h.removeModifier(ctx, 'JUD', 'reckoning_of_the_land');
          h.setFlag(ctx, 'nicaeaCalendar', true);
          h.setFlag(ctx, 'calendarHeld', false);
          if (alive(ctx, 'JUD')) h.adjust(ctx, 'JUD', { legitimacy: -8 });
          h.chronicle(ctx, 'era', 'Nicaea computes its own Easter and says why in writing: the last administrative thread between the two calendars is cut.');
        }),
      },
    ],
  },

  // ── SPEC §206 · 340 ───────────────────────────────────────────────────────
  {
    id: 'ev2_ezana_cross',
    title: 'The Coins Change Sign',
    worldLabel: 'Ezana of Aksum takes the Cross; the highlands become Christian',
    desc: 'It begins, the church historians say, with a shipwreck: two Syrian boys, '
      + 'Frumentius and Aedesius, sole survivors of a Red Sea raid, raised at '
      + 'the Aksumite court — the one becoming tutor to the king\'s son, then '
      + 'regent, then quietly the founder of a church. When the boy he tutored '
      + 'is king in his own right, Frumentius travels to Alexandria to ask '
      + 'Athanasius for a bishop for Ethiopia, and Athanasius — never a man to '
      + 'waste an appointment — consecrates Frumentius himself and sends him '
      + 'back. Now Ezana, king of Aksum, conqueror in four directions, does '
      + 'what only one other king on earth has done and stakes his crown on '
      + 'it: the royal coinage drops the old disc and crescent of the South '
      + 'Arabian gods and strikes the Cross instead — the first coins in the '
      + 'world to carry it. The inscriptions stop invoking Mahrem the '
      + 'war-god mid-reign and begin invoking the Lord of Heaven. An empire '
      + 'at the far end of everyone\'s map has bound itself to Alexandria, '
      + 'and it will still be Christian when every empire on this map has '
      + 'changed its gods twice.',
    forTag: 'both',
    major: true,
    date: { y: 340, m: 6 },
    world: true,
    aiOption: 0,
    when: (ctx) => alive(ctx, 'AXM'),
    historical: 'Ezana converted about 330-340 under Frumentius, whom Athanasius consecrated bishop (Rufinus HE I.9-10); Aksum\'s coinage is the first in the world to carry the Cross.',
    options: [
      {
        label: 'Strike the Cross on the gold',
        tooltip: 'Aksum and all its provinces become Christian; the crown gains +1 stability, +5 legitimacy, and "The Lord of Heaven" (+20% conversion strength, permanent).',
        effects: guard('ev2_ezana_cross:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const axm = who(ctx, 'AXM');
          const t = g.tags[axm];
          if (t) t.religion = 'christianity';
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (p && !p.impassable && p.owner === axm) p.religion = 'christianity';
          }
          h.adjust(ctx, axm, { stability: 1, legitimacy: 5 });
          h.addTagModifier(ctx, axm, {
            id: 'lord_of_heaven', name: 'The Lord of Heaven', months: -1,
            effects: { convertMult: 1.2 },
          });
          h.setFlag(ctx, 'ezanaCross', true);
          h.chronicle(ctx, 'era', 'Ezana of Aksum takes the Cross and strikes it on his gold — the first coins in the world to carry it. The highlands bind themselves to Alexandria.');
        }),
      },
    ],
  },

  // ── SPEC §209 · 345 ───────────────────────────────────────────────────────
  {
    id: 'ev2_takkaze_refusers',
    title: 'Behind the Takkaze',
    worldLabel: 'Those who refuse the Cross withdraw into the Semien',
    desc: 'The king\'s new god has a tithe, a bishop and a court calendar, and not '
      + 'everyone in the highlands will have him. The old faith of the plateau was '
      + 'never one thing — Mahrem of the king\'s line, the Sabaean moon, and, in '
      + 'the valleys around the lake, something much older and much more '
      + 'particular: communities that keep the Sabbath of Israel, slaughter '
      + 'clean, and read the Orit in Ge\'ez. The court now calls all of these '
      + 'ayhud, which settles nothing. Rather than take the Cross the way the '
      + 'king took it — onto the coinage, over the whole country at once — they '
      + 'go up: across the Takkaze gorge, onto the ambas of the Semien, mountain '
      + 'tables with a spring and a grain-pit and one path a boy with a spear '
      + 'can hold. The crown\'s chroniclers will spend the next thousand years '
      + 'announcing their final defeat.',
    forTag: 'both',
    decider: 'AXM',
    date: { y: 345, m: 3 },
    world: true,
    aiOption: 0,
    when: (ctx) => alive(ctx, 'AXM') && !!ctx.game.flags.ezanaCross,
    historical: 'The origin of the Beta Israel is genuinely contested — refusers of '
      + 'Ezana\'s conversion, Agaw judaizers of the following centuries, or an older '
      + 'Israelite seed, as the community\'s own tradition holds; the first '
      + 'unambiguous outside attestations are medieval, in chronicles that call '
      + 'them ayhud. The withdrawal-after-Ezana telling is one respectable '
      + 'reconstruction, and it is the one this game\'s own spine supplies: the '
      + 'dispersion ledger (js/data/diaspora.js) opens their window here and '
      + 'closes it on 24-25 May 1991.',
    options: [
      {
        label: 'Let the mountains keep them',
        tooltip: 'A share of Tana\'s people hold to the older covenant and withdraw '
          + 'upcountry: the lake country gains a Jewish community (the dispersion '
          + 'ledger opens a window at Tana) and carries "The House of Israel in the '
          + 'Mountains" (+0.5 unrest, permanent) — a war the crown will re-win once '
          + 'a generation without ever finishing it.',
        effects: guard('ev2_takkaze_refusers:0', (ctx) => {
          const h = ctx.helpers;
          const p = ctx.prov && ctx.prov('Tana');
          if (p && Array.isArray(p.pop) && p.pop.length) {
            let total = 0;
            for (const e of p.pop) total += (e && e.n > 0) ? e.n : 0;
            const n = Math.round(total * 0.25);
            if (n > 0) h.addPopulation(ctx, 'Tana', { r: 'judaism', c: 'cushitic', n });
          }
          h.addProvinceModifier(ctx, 'Tana', {
            id: 'house_of_israel', name: 'The House of Israel in the Mountains', months: -1,
            effects: { unrest: 0.5 },
          });
          h.setFlag(ctx, 'betaIsraelWithdrawn', true);
          h.chronicle(ctx, 'era', 'Those who refuse Ezana\'s Cross withdraw across the Takkaze into the Semien; the court calls them ayhud, and the mountains keep them.');
        }),
      },
    ],
  },

  // ── SPEC §206 · 350 ───────────────────────────────────────────────────────
  {
    id: 'ev2_meroe_falls',
    title: 'The Granaries of the Noba',
    worldLabel: 'Ezana marches down the Nile; the kingdom of Kush ends',
    desc: 'The oldest state on the map dies quietly, and the man who buries it '
      + 'leaves the account himself, cut in stone at Aksum in three scripts. '
      + 'Ezana marches against the Noba — herdsman clans who have pushed into '
      + 'the Nile valley and, his inscription complains, boasted and broke '
      + 'their oaths — and what his columns actually march through is the '
      + 'wreck of Kush: the island of Meroe, the brick temples, the granaries '
      + 'and the cotton fields of a kingdom that watched pharaohs come and go '
      + 'and treated with Augustus as an equal. The army burns the granaries, '
      + 'takes the bronze statues off their plinths, and goes home. No Kushite '
      + 'king is recorded again, ever. What remains on the river is what '
      + 'Ezana\'s scribes called it: the Noba — chiefdoms in the shell of a '
      + 'kingdom, herds grazing the processional ways. In two centuries their '
      + 'descendants will take a new god from a missionary in a reed boat and '
      + 'build Christian kingdoms that outlast Rome. The pyramids at Meroe '
      + 'keep their own counsel either way.',
    forTag: 'both',
    major: true,
    date: { y: 350, m: 4 },
    world: true,
    aiOption: 0,
    when: (ctx) => alive(ctx, 'AXM') && alive(ctx, 'KSH'),
    historical: 'Ezana\'s Nubian campaign inscription (DAE 11, c. 350) records the march through a Meroe already in Noba hands; no later Kushite king is attested.',
    options: [
      {
        label: 'Burn the granaries and go home',
        tooltip: 'The kingdom of Kush ends: the court at Meroe gives way to the Noba chiefdoms (the realm is renamed under the bow of Ta-Seti, −2 stability, −15% income permanently); Meroe and Soba carry "The Burned Granaries" (+2 unrest, −30% tax for 10 years). Aksum takes +100 talents of plunder.',
        effects: guard('ev2_meroe_falls:0', (ctx) => {
          const h = ctx.helpers;
          const ksh = who(ctx, 'KSH');
          h.adjust(ctx, ksh, { stability: -2, treasury: -150 });
          h.rebrandTag(ctx, ksh, { name: 'The Noba', flag: 'NOB' });
          h.addTagModifier(ctx, ksh, {
            id: 'city_abandoned', name: 'The City Abandoned', months: -1,
            effects: { incomeMult: 0.85 },
          });
          stirCities(ctx, ['Meroe', 'Soba'], 'burned_granaries', 'The Burned Granaries', 120,
            { unrest: 2, taxMult: 0.7 });
          h.adjust(ctx, who(ctx, 'AXM'), { treasury: 100 });
          h.setFlag(ctx, 'meroeFalls', true);
          h.chronicle(ctx, 'fall', 'Ezana marches through the wreck of Kush, burns the granaries of the Noba, and goes home; no Kushite king is ever recorded again. The pyramids keep their own counsel.');
        }),
      },
    ],
  },

  // ── W16 · 351 ─────────────────────────────────────────────────────────────
  {
    id: 'ev2_gallus_revolt',
    title: 'The Rising Against Gallus',
    worldLabel: 'Revolt at Sepphoris against the Caesar Gallus',
    desc: 'A small thing that the sources cannot agree about: at Diocaesarea — Sepphoris, '
      + 'renamed — a man named Patricius is raised up, a Roman garrison is disarmed in the '
      + 'night, and for a season the Galilee is out of the government\'s hands. Ursicinus '
      + 'is sent, and the towns of the lake are burned, and the whole thing occupies a '
      + 'sentence and a half in Ammianus. It is the last time for fifteen hundred years '
      + 'that a Jewish population in the Galilee takes a Roman garrison\'s weapons off it, '
      + 'and it is remembered chiefly because of what the burned towns cost the schools '
      + 'that were in them.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 351, m: 5 },
    when: (ctx) => romanAftermath(ctx),
    world: true,
    aiOption: 0,
    options: [
      {
        label: 'Ursicinus burns the towns of the lake',
        tooltip: 'Sepphoris, Tiberias and Tarichaea: −2 development each and +3 unrest for 72 months ("Ursicinus Came Through"). Rome +30 talents of confiscation.',
        effects: guard('ev2_gallus_revolt:0', (ctx) => {
          const h = ctx.helpers;
          for (const name of ['Sepphoris', 'Tiberias', 'Tarichaea']) {
            const p = ctx.prov && ctx.prov(name);
            if (p && p.dev) {
              p.dev.tax = Math.max(1, (p.dev.tax || 1) - 1);
              p.dev.prod = Math.max(1, (p.dev.prod || 1) - 1);
            }
            h.addProvinceModifier(ctx, name, {
              id: 'ursicinus_came_through', name: 'Ursicinus Came Through', months: 72,
              effects: { unrest: 3, taxMult: 0.8 },
            });
          }
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { treasury: 30 });
          h.chronicle(ctx, 'era', 'The rising at Diocaesarea is put down and the towns of the lake are burned; Ammianus gives it a sentence and a half.');
        }),
      },
    ],
  },

  // ── W17 · 363 ─────────────────────────────────────────────────────────────
  {
    id: 'ev2_julian_temple',
    title: 'The Emperor Orders the House Rebuilt',
    worldLabel: 'Julian orders the Temple in Jerusalem rebuilt',
    desc: 'Julian, who has spent his reign trying to put the old gods back and has worked '
      + 'out that the most effective argument against the Galileans is a functioning '
      + 'Jewish sacrifice on the hill their scriptures say will stay in ruins forever, '
      + 'writes to the communities: I shall rebuild the holy city of Jerusalem at my own '
      + 'expense, and dwell there with you, and give glory to the Most High God. Alypius '
      + 'of Antioch is given the commission and the treasury. The foundations are cleared '
      + 'and the work begins. Then — this is Ammianus, a pagan officer with no motive to '
      + 'invent it — fireballs burst from the foundations, the workmen are driven off, and '
      + 'the project stops. The Galilee earthquake is that year. Julian is dead in Persia '
      + 'within months, and no emperor ever asks the question again.',
    forTag: 'both',
    major: true,
    date: { y: 363, m: 5 },
    world: true,
    aiOption: 0,
    historical: 'The work began, was stopped by fire in the foundations after the earthquake, and died with Julian in Persia that summer.',
    options: [
      {
        label: 'Clear the foundations',
        tooltip: 'A Judaea that stands: +20 legitimacy and +150 talents from the imperial commission. Under Rome: Jerusalem −2 unrest for 24 months, and every Jewish province +1 stability worth of hope — until the fire in the foundations, four months later.',
        effects: guard('ev2_julian_temple:0', (ctx) => {
          const h = ctx.helpers;
          if (judaeaStands(ctx)) {
            h.adjust(ctx, 'JUD', { legitimacy: 20, treasury: 150 });
          } else {
            h.addProvinceModifier(ctx, 'Jerusalem', {
              id: 'the_commission', name: 'The Emperor\'s Commission', months: 24,
              effects: { unrest: -2 },
            });
          }
          h.setFlag(ctx, 'julianTemple', true);
          h.chronicle(ctx, 'era', 'Julian orders the Temple rebuilt at imperial expense; Alypius of Antioch clears the foundations.');
        }),
      },
      {
        label: 'Take the money and build nothing yet',
        tooltip: 'The elders remember that the last three emperors to promise something also promised something: +200 talents, no legitimacy, and no ruined foundations to explain when the emperor dies in Persia in June.',
        effects: guard('ev2_julian_temple:1', (ctx) => {
          const h = ctx.helpers;
          const me = alive(ctx, 'JUD') ? 'JUD' : ctx.game.playerTag;
          h.adjust(ctx, me, { treasury: 200 });
          h.setFlag(ctx, 'julianDeclined', true);
          h.chronicle(ctx, 'era', 'The commission is taken and the ground is not broken; Julian dies in Persia in June.');
        }),
      },
    ],
  },

  // ── W18 · 380 ─────────────────────────────────────────────────────────────
  {
    id: 'ev2_cunctos_populos',
    title: 'Cunctos Populos',
    worldLabel: 'Theodosius makes Nicene Christianity compulsory',
    desc: 'It is one paragraph, addressed to the people of Constantinople, and it inverts '
      + 'the legal order of the empire: it is our will that all the peoples we rule shall '
      + 'practise the religion which the divine Peter transmitted to the Romans; we command '
      + 'that they take the name of Catholic Christians; the rest we adjudge demented and '
      + 'insane, to bear the infamy of heretical dogmas, and to be smitten first by divine '
      + 'vengeance and then by our own. Nothing in the previous four hundred years reads '
      + 'like this. The tolerated faith is now the compulsory one, and the interesting '
      + 'question for everyone else on the map stops being whether they are licensed and '
      + 'starts being what they are licensed for.',
    forTag: 'both',
    decider: 'ROM',
    major: true,
    date: { y: 380, m: 2 },
    world: true,
    aiOption: 0,
    options: [
      {
        label: 'The rest we adjudge demented and insane',
        tooltip: 'Rome takes Christianity as its state religion: +10 legitimacy, and every province Rome owns that follows another faith +2 unrest permanently ("Cunctos Populos") until it converts. Judaism keeps a licence — narrower every decade, and still the only one anyone else has.',
        effects: guard('ev2_cunctos_populos:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const rom = g.tags && g.tags.ROM;
          if (rom && rom.alive !== false) {
            rom.religion = 'christianity';
            h.adjust(ctx, 'ROM', { legitimacy: 10 });
            for (let i = 1; i < g.provinces.length; i++) {
              const p = g.provinces[i];
              if (!p || p.impassable || p.owner !== 'ROM' || p.religion === 'christianity') continue;
              h.addProvinceModifier(ctx, p.name, {
                id: 'cunctos_populos', name: 'Cunctos Populos', months: -1,
                effects: { unrest: 2 },
              });
            }
          }
          h.setFlag(ctx, 'cunctosPopulos', true);
          h.chronicle(ctx, 'era', 'Theodosius makes Nicene Christianity the religion of the empire and the rest a crime; the legal order of four centuries is inverted.');
        }),
      },
    ],
  },

  // ── SPEC §209 · 384 ───────────────────────────────────────────────────────
  {
    id: 'ev2_himyar_rahmanan',
    title: 'The Inscriptions Change Their God',
    worldLabel: 'The kings of Himyar turn to the God of Israel',
    desc: 'For eight hundred years the dedications of the south have opened with the '
      + 'same address: Almaqah of Saba, Athtar, Ta\'lab, the temple bulls and the '
      + 'ibex friezes. This year the royal inscriptions of Zafar simply stop '
      + 'naming them. Malkikarib Yuha\'min and his sons dedicate instead to '
      + 'Rahmanan, the Merciful, Lord of Heaven — no image, no bull, no consort — '
      + 'and the court\'s new house of prayer is called mikrab, which is a '
      + 'synagogue\'s word. The polite fiction of a neutral monotheism lasts '
      + 'exactly as long as nobody asks the court\'s teachers where the formulas '
      + 'came from; the stones themselves will shortly run to "Lord of the Jews" '
      + 'and end amen. The kingdom of the incense terraces has, with no legion '
      + 'within a thousand miles of it, taken up the covenant of Israel — and '
      + 'across the strait sits a crown that took the Cross forty years ago. Two '
      + 'shores, two scriptures, one strait between them.',
    forTag: 'both',
    decider: 'HMY',
    major: true,
    date: { y: 384, m: 6 },
    world: true,
    aiOption: 0,
    when: (ctx) => alive(ctx, 'HMY'),
    historical: 'From 384 the royal inscriptions of Himyar drop the old gods for '
      + 'Rahmanan, "the Merciful, lord of heaven" (Malkikarib Yuha\'min\'s '
      + 'dedications); the judaizing character sharpens under his successors — '
      + 'mikrab dedications, "lord of the Jews", the Hebrew amen — and Islamic-era '
      + 'tradition remembers Abu Karib As\'ad converting with two rabbis of '
      + 'Yathrib. Dhu Nuwas, the Jewish king whose massacre of Najran\'s '
      + 'Christians in 523 brought Kaleb\'s invasion of 525, is this line\'s last '
      + 'act — which is exactly where the 529 chapter opens.',
    options: [
      {
        label: 'Rahmanan, and no image beside him',
        tooltip: 'Himyar and all its provinces take the covenant of Israel (+5 '
          + 'legitimacy, +1 stability, and "Rahmanan, Lord of Heaven": +15% '
          + 'conversion strength, permanent); the strait becomes a confessional '
          + 'border, and Aksum and Himyar cool 20 toward each other. Kaleb\'s '
          + 'crossing — the 529 chapter\'s opening premise — is the bill for this '
          + 'card, a hundred and forty years out.',
        effects: guard('ev2_himyar_rahmanan:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const hmy = who(ctx, 'HMY');
          const t = g.tags[hmy];
          if (t) t.religion = 'judaism';
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (p && !p.impassable && p.owner === hmy) p.religion = 'judaism';
          }
          h.adjust(ctx, hmy, { legitimacy: 5, stability: 1 });
          h.addTagModifier(ctx, hmy, {
            id: 'rahmanan', name: 'Rahmanan, Lord of Heaven', months: -1,
            effects: { convertMult: 1.15 },
          });
          const axm = who(ctx, 'AXM');
          const ta = g.tags[axm];
          if (ta && ta.alive !== false) {
            if (!ta.opinion) ta.opinion = {};
            ta.opinion[hmy] = Math.max(-200, (ta.opinion[hmy] || 0) - 20);
            if (t) {
              if (!t.opinion) t.opinion = {};
              t.opinion[axm] = Math.max(-200, (t.opinion[axm] || 0) - 20);
            }
          }
          h.setFlag(ctx, 'himyarJudaism', true);
          h.chronicle(ctx, 'era', 'The royal inscriptions of Zafar stop naming the old gods: Himyar\'s kings dedicate to Rahmanan, Lord of Heaven, and the court\'s new house of prayer is called by a synagogue\'s word.');
        }),
      },
    ],
  },

  // ── W19 · 425 ─────────────────────────────────────────────────────────────
  {
    id: 'ev2_patriarchate_ends',
    title: 'The Office Is Not Filled',
    worldLabel: 'The Jewish patriarchate is abolished',
    desc: 'Gamaliel VI is stripped of his honorary prefecture for building a synagogue '
      + 'without permission and for hearing cases between Jews and Christians, and when he '
      + 'dies without a son the government simply does not fill the office. The apostolē — '
      + 'the tax the communities of the whole diaspora had sent to the patriarch since '
      + 'before anyone can remember — is redirected to the imperial treasury by name. '
      + 'Three hundred years of continuous Jewish self-government in the land ends not '
      + 'with an edict of destruction but with an administrative decision not to appoint '
      + 'a successor. This is the card that does not happen if the Nasi\'s state survived; '
      + 'in that world the chronicle simply has nothing to record here.',
    forTag: 'both',
    decider: 'ROM',
    major: true,
    date: { y: 425, m: 5 },
    when: (ctx) => romanAftermath(ctx),
    world: true,
    aiOption: 0,
    options: [
      {
        label: 'The apostolē goes to the sacred treasury',
        tooltip: 'Rome +250 talents and the office lapses; every Jewish province +2 unrest for 120 months ("No One to Appeal To"), and the last institution of Jewish self-government in the land is gone.',
        effects: guard('ev2_patriarchate_ends:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { treasury: 250 });
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (!p || p.impassable || p.religion !== 'judaism') continue;
            h.addProvinceModifier(ctx, p.name, {
              id: 'no_one_to_appeal_to', name: 'No One to Appeal To', months: 120,
              effects: { unrest: 2 },
            });
          }
          h.setFlag(ctx, 'patriarchateEnded', true);
          h.chronicle(ctx, 'era', 'Gamaliel VI dies and the patriarchate is not filled; the diaspora tax is redirected to the imperial treasury by name.');
        }),
      },
    ],
  },
];
