// Judaea Universalis — the western empire while Judaea burns, 69–106 CE
// (SPEC §111 applied to the 66 chapter). Content package. Zero imports; all
// effects run through ctx.helpers at runtime. Concatenated onto EVENTS_66 by
// the era registry.
//
// The 66 chapter's world clock is the imperial succession — Nero to Nerva,
// six setRuler cards — and the after-package's Trajan arc. Between the
// successions, the West itself was silent: no Rhine rising in the very year
// of the four emperors (Josephus has the news of it reaching the besieged;
// the game's Jerusalem never heard), no Agricola, no Dacian disasters, no
// Saturninus, and no Dacia Capta — the conquest whose gold paid for the
// forum Trajan built with Jerusalem's spoils a generation after Titus. The
// 132 bookmark's map already shows Dacia Roman; this file is where that
// happens.
//
// The rule for admission is §104's: it must happen whichever way the revolt
// went. The one transfer is Dacia in 106, by explicit list, off DAC only
// (the transfer() rule, SPEC §111) — the same two cells the 132 atlas hands
// to Rome.
//
// Source spine: Tacitus, Histories IV–V for Civilis and Agricola for the
// north (his father-in-law commands the prose as well as the fleet, and the
// speeches are his); Suetonius, Domitian; Cassius Dio LXVII–LXVIII; Pliny's
// Panegyricus for the official weather of 100; Trajan's column read as a
// dispatch, which is what it is.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_66ce_world] ' + key, e || '');
}

// The letters this court answers to NOW (SPEC §135); see events_167bce_world.js.
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

function stir(ctx, names, mod) {
  for (const n of names) ctx.helpers.addProvinceModifier(ctx, n, mod);
}

function setOpinion(ctx, a, b, val) {
  const t = ctx.game.tags && ctx.game.tags[who(ctx, a)];
  if (!t) return;
  if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
  t.opinion[who(ctx, b)] = Math.max(-200, Math.min(200, val));
}

// Hand a named list over, but never take a province off a living court that is
// not one of the named losers (SPEC §111).
function transfer(ctx, names, to, from) {
  const g = ctx.game;
  const losers = new Set([].concat(from));
  let n = 0;
  for (const name of names) {
    const p = ctx.prov && ctx.prov(name);
    if (!p || p.impassable) continue;
    if (!losers.has(p.owner)) {
      const owner = g.tags[p.owner];
      if (owner && owner.alive !== false) continue;
    }
    if (p.owner === who(ctx, to)) continue;
    ctx.helpers.changeOwner(ctx, p.canon || p.name, to);
    n++;
  }
  return n;
}

// ── the imperium Galliarum, on the map (SPEC §251) ──────────────────────────
//
// The Batavian rising is the one card in this package that describes a country
// coming into existence — "the Gallic units have sworn an empire of the Gauls"
// — and it used to spend three province modifiers and an opinion shift saying
// so. It is a civil war, not a barbarian invasion: Civilis had twenty-five
// years in Roman service, the units that swore the Gallic empire were Roman
// auxiliary and legionary units, and the two legions at Vetera surrendered to
// men wearing the same equipment.
//
// It therefore flies the same `USR` banner as every other claimant (§239),
// which this chapter has already used once and given back: Vitellius takes it
// in January 69 and Vespasian's card folds it up in July. The Rhine is
// September. One tag, twice in one year, never both at once — and `secedeTag`
// refuses a banner somebody is already flying, so the guard is real rather
// than a comment.
const GALLIC_EMPIRE = [
  'Batavia', 'Colonia Agrippina', 'Mogontiacum', 'Argentorate',
  'Augusta Treverorum', 'Durocortorum', 'Vesontio',
  'Gesoriacum', 'Samarobriva', 'Rotomagus', 'Lutetia',
];

function raiseTheGauls(ctx) {
  const g = ctx.game;
  const h = ctx.helpers;
  if (g.tags.USR) return null;
  const rome = who(ctx, 'ROM');
  const ground = GALLIC_EMPIRE.filter((n) => {
    const p = ctx.prov(n);
    return p && !p.impassable && p.owner === rome;
  });
  if (!ground.length) return null;
  const gauls = h.secedeTag(ctx, rome, 'USR', {
    provinces: ground,
    share: 0.15,
    name: 'The Empire of the Gauls',
    color: [104, 132, 96],
    opinion: -180,
    stability: -1,
    legitimacy: 30,
    ruler: {
      name: 'Julius Civilis', title: 'Prince of the Batavi', gov: 2, infl: 3, mar: 4, age: 45,
    },
  });
  if (!gauls) return null;
  h.declareWar(ctx, rome, 'USR', 'The Rising on the Rhine');
  setOpinion(ctx, rome, 'USR', -180);
  setOpinion(ctx, 'USR', rome, -180);
  h.addTagModifier(ctx, 'USR', {
    id: 'the_oath_of_the_gauls', name: 'The Oath of the Gauls', months: -1,
    effects: { moraleMult: 1.1, incomeMult: 0.8, manpowerMult: 0.8 },
  });
  const at = ground.indexOf('Batavia') >= 0 ? 'Batavia' : ground[0];
  h.spawnArmy(ctx, 'USR', at, {
    inf: 8, cav: 2, name: 'The Batavian Cohorts',
    general: { name: 'Julius Civilis', fire: 2, shock: 3, maneuver: 4 },
  });
  return gauls;
}
// Who won (SPEC §252). Cerialis put the rising down inside a year with eight
// legions, and every account of how he did it turns on the Gallic councils at
// Reims voting NOT to join — a vote that could have gone the other way and
// that Tacitus reports as a near thing. The record is the likelier road; the
// war the campaign actually fought bends the odds.
function romeRetakesTheRhine(ctx) {
  return ctx.helpers.verdict(ctx, 'batavianRising', 0.8, {
    recorded: 'ROM', war: ['ROM', 'USR'], sway: 0.3,
  });
}

// 89 · the two legions at Mogontiacum (SPEC §253). The other rising this
// chapter narrates and never puts on the map — and the one whose outcome turns
// on the weather, which is as good a definition of a pivot as this game has.
// The plan needed the Chatti across a frozen Rhine; the river thawed early.
const SATURNINUS_RHINE = ['Mogontiacum', 'Argentorate', 'Augusta Treverorum', 'Vesontio'];
function raiseSaturninus(ctx) {
  const g = ctx.game;
  const h = ctx.helpers;
  if (g.tags.USR) return null;
  const rome = who(ctx, 'ROM');
  const ground = SATURNINUS_RHINE.filter((n) => {
    const p = ctx.prov(n);
    return p && !p.impassable && p.owner === rome;
  });
  if (!ground.length) return null;
  const claim = h.secedeTag(ctx, rome, 'USR', {
    provinces: ground,
    share: 0.08,
    name: 'The Acclamation at Mogontiacum',
    color: [132, 118, 84],
    opinion: -180,
    stability: -1,
    legitimacy: 20,
    ruler: { name: 'Antonius Saturninus', title: 'Augustus', gov: 2, infl: 2, mar: 3, age: 48 },
  });
  if (!claim) return null;
  h.declareWar(ctx, rome, 'USR', 'The Rising of the Two Legions');
  setOpinion(ctx, rome, 'USR', -180);
  setOpinion(ctx, 'USR', rome, -180);
  h.addTagModifier(ctx, 'USR', {
    id: 'the_burial_funds', name: 'The Soldiers\' Burial Funds', months: -1,
    effects: { moraleMult: 1.06, incomeMult: 0.8, manpowerMult: 0.6 },
  });
  h.spawnArmy(ctx, 'USR', ground[0], {
    inf: 6, cav: 1, name: 'The Two Legions',
    general: { name: 'Antonius Saturninus', fire: 2, shock: 2, maneuver: 2 },
  });
  return claim;
}
// Whether the river thaws in time (SPEC §252). This is the rare pivot where
// the sources agree on the cause and it is meteorological: a week either way
// and the Chatti are across, and two legions with a German army behind them is
// a different proposition from two legions alone.
function theRhineThaws(ctx) {
  return ctx.helpers.verdict(ctx, 'saturninus', 0.8, {
    recorded: 'ROM', war: ['ROM', 'USR'], sway: 0.25,
  });
}

function settleTheGauls(ctx, line) {
  if (!ctx.game.tags.USR) return false;
  ctx.helpers.dissolveTag(ctx, 'USR', who(ctx, 'ROM'), { chronicle: line });
  return true;
}

export const EVENTS_66_WORLD = [

  // ── W1 · 69 ───────────────────────────────────────────────────────────────
  {
    id: 'ev_fw_civilis',
    title: 'The Rhine Rises With Everything Else',
    worldLabel: 'Civilis raises the Batavians; two legions surrender on the Rhine',
    desc: 'While four emperors wear the purple in one year and Jerusalem stands '
      + 'besieged, the empire\'s other end catches fire too. Julius Civilis — a '
      + 'one-eyed Batavian prince, twenty-five years a Roman officer, twice '
      + 'arrested on suspicion and once watching his brother executed on it — '
      + 'raises the Batavians against a conscription being run like a slave '
      + 'raid. He begins under a flag of convenience, claiming to hold the Rhine '
      + 'for Vespasian; by winter the pretense is gone, the Gallic units have '
      + 'sworn an empire of the Gauls, and two Roman legions in the camp at '
      + 'Vetera have done what no legion has done in living memory: surrendered '
      + 'to barbarians, marched out under promise, and been cut down on the '
      + 'road. Josephus says the news reached the besieged in Jerusalem and was '
      + 'read as the beginning of the end of Rome. Rome, being Rome, ends the '
      + 'revolt instead within the year — eight legions under Cerialis, and a '
      + 'negotiated bridge-meeting with Civilis of which Tacitus\'s account '
      + 'breaks off mid-sentence, so that the one-eyed man walks out of history '
      + 'in the middle of explaining himself. The lesson the East takes is not '
      + 'the ending. It is that in the year the empire auctioned itself, the '
      + 'auxiliaries of one small nation nearly closed the Rhine.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 69, m: 9 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Civilis raised the Batavians in 69 under cover of Vespasian\'s cause; two legions surrendered at Vetera, and Cerialis put the rising down in 70.',
    options: [
      {
        label: 'Eight legions for one small nation',
        tooltip: 'The Rhine and the Gallic north go over to an empire of the Gauls — a court on the map, at war with Rome, until Cerialis reaches the Moselle next summer. Rome −5,000 manpower and −100 talents; Batavia, Colonia Agrippina and Mogontiacum carry "The Rhine in Arms" (+3 unrest for 18 months). The Frisii cool toward Rome (−40 opinion). In Jerusalem, the news is read aloud on the walls.',
        effects: guard('ev_fw_civilis:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { manpower: -5000, treasury: -100 });
          stir(ctx, ['Batavia', 'Colonia Agrippina', 'Mogontiacum'], {
            id: 'rhine_in_arms', name: 'The Rhine in Arms', months: 18,
            effects: { unrest: 3 },
          });
          if (alive(ctx, 'FRS')) setOpinion(ctx, 'FRS', 'ROM', -40);
          h.setFlag(ctx, 'civilisRising', true);
          const gauls = raiseTheGauls(ctx);
          h.chronicle(ctx, 'era', 'The Batavians rise under Civilis and two legions surrender at Vetera; in the year of four emperors, one small nation nearly closes the Rhine'
            + (gauls ? ' — and the Gallic units swear an empire of the Gauls on the far side of it.' : '.'));
        }),
      },
    ],
  },

  // ── W1b · 70 ──────────────────────────────────────────────────────────────
  // The other half of the pair (SPEC §251). A card that raises a country has
  // to have a card that puts it out, or the map keeps a Gallic empire for the
  // next three hundred years of a chapter that runs to 425.
  {
    id: 'ev_fw_civilis_ends',
    title: 'The Bridge in the Middle of the Sentence',
    worldLabel: 'Cerialis breaks the empire of the Gauls; Civilis parleys and vanishes',
    desc: 'Eight legions come up the Moselle under Petillius Cerialis, and the empire '
      + 'of the Gauls discovers what every provincial rising discovers: that the '
      + 'legions who swore to it were legions, and want their pay in an empire that '
      + 'still exists. Trier is retaken, the Treveri and the Lingones make terms, and '
      + 'Cerialis addresses the Gauls in the only speech of the war anyone bothered to '
      + 'copy — Roman rule is expensive, he tells them, and the alternative is Germans. '
      + 'Civilis pulls back to the island, burns his own farms so the legions cannot '
      + 'have them, and meets Cerialis on a broken bridge over the Nabalia to explain '
      + 'himself. The manuscript of Tacitus stops mid-sentence. What he said, what was '
      + 'agreed, and what became of the one-eyed man are all missing, and the Rhine '
      + 'frontier goes on as though nothing had been proposed there at all.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 70, m: 9 },
    world: true,
    major: true,
    aiOption: 0,
    // No rising, no bridge to settle it on — and one of two roads out of it
    // (SPEC §252). Nothing later in this chapter is written for either
    // outcome, so the Rhine is allowed to draw for the winner.
    verdict: 'batavianRising',
    when: (ctx) => !!ctx.helpers.getFlag(ctx, 'civilisRising') && romeRetakesTheRhine(ctx),
    historical: 'Cerialis retook Trier in 70 and reduced the rising by autumn; the Historiae break off in the middle of Civilis\' parley on the Nabalia.',
    options: [
      {
        label: 'Roman rule is expensive; the alternative is Germans',
        tooltip: 'The empire of the Gauls folds back into Rome — ground, garrisons and treasury — and the war ends with it. Rome +5 legitimacy and −80 talents for the reconstruction; the Rhine keeps its unrest until the modifier runs out.',
        effects: guard('ev_fw_civilis_ends:0', (ctx) => {
          const h = ctx.helpers;
          settleTheGauls(ctx, 'Cerialis retakes Trier and the empire of the Gauls comes apart; Civilis '
            + 'parleys on a broken bridge, and the sentence describing it was never finished.');
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { legitimacy: 5, treasury: -80 });
          h.setFlag(ctx, 'civilisRising', false);
        }),
      },
      {
        label: 'Burn the island farms and take the terms',
        tooltip: 'The same reunion, bought rather than stormed: Rome −160 talents in terms and back pay, +10 legitimacy, and Batavia is spared the sack (its unrest modifier lifts at once).',
        effects: guard('ev_fw_civilis_ends:1', (ctx) => {
          const h = ctx.helpers;
          settleTheGauls(ctx, 'The Batavian terms are signed on the Nabalia and the Gallic empire is '
            + 'dissolved by agreement; Rome pays for the quiet and does not ask what was promised.');
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { legitimacy: 10, treasury: -160 });
          h.removeModifier(ctx, 'Batavia', 'rhine_in_arms');
          h.setFlag(ctx, 'civilisRising', false);
        }),
      },
    ],
  },

  // ── W1c · 70 ──────────────────────────────────────────────────────────────
  {
    id: 'ev_fw_gauls_stand',
    verdict: 'batavianRising',
    title: 'The Councils at Reims Vote the Other Way',
    worldLabel: 'The Gallic councils join the rising; the empire of the Gauls stands',
    desc: 'Everything about the Batavian rising turns on a meeting of Gallic notables '
      + 'at Reims in the spring, where the question is whether the Gauls have an '
      + 'empire or a governor — and the vote, which the histories record as close and '
      + 'reluctant and which went for Rome, goes the other way. The Treveri and the '
      + 'Lingones are not isolated after that; they are the near edge of a country. '
      + 'Cerialis wins his battles and cannot hold what he wins, because eight '
      + 'legions can beat any army in Gaul and cannot garrison a province that has '
      + 'stopped paying, and the Rhine armies he is fighting were built by Rome to '
      + 'the same drill and out of the same men. What is signed in the autumn is not '
      + 'a surrender: it is a frontier. The empire keeps the Alps, the Gauls keep the '
      + 'Rhine, and every court from Antioch to Ctesiphon reads the same dispatch, '
      + 'which says that the thing that happened to the Rhine can happen anywhere the '
      + 'auxiliaries are recruited where they serve.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 70, m: 9 },
    world: true,
    major: true,
    aiOption: 0,
    when: (ctx) => !!ctx.helpers.getFlag(ctx, 'civilisRising') && !romeRetakesTheRhine(ctx),
    options: [
      {
        label: 'A frontier, and the word empire used by both parties',
        tooltip: 'The empire of the Gauls stays on the map as a court of its own, and the war between them ends. Rome −15 legitimacy, −6,000 manpower and "The Rhine Is a Border" (−8% income, −5% manpower) for twenty years; the new state keeps its army. In Jerusalem the dispatch is read on the walls twice.',
        effects: guard('ev_fw_gauls_stand:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          // The claimant is not dissolved: this is the arc where a civil war
          // ends in a country rather than in a reconquest (SPEC §252). The
          // war does end — a frontier is what both sides just signed.
          const kept = [];
          for (const w of g.wars || []) {
            if (!w) { continue; }
            const all = (w.attackers || []).concat(w.defenders || []);
            if (all.indexOf('USR') >= 0 && all.indexOf(who(ctx, 'ROM')) >= 0) continue;
            kept.push(w);
          }
          g.wars = kept;
          for (const t of [g.tags[who(ctx, 'ROM')], g.tags.USR]) {
            if (t && Array.isArray(t.atWarWith)) {
              t.atWarWith = t.atWarWith.filter((x) => x !== 'USR' && x !== who(ctx, 'ROM'));
            }
          }
          if (g.tags.USR) {
            g.tags.USR.name = 'The Empire of the Gauls';
            h.addTagModifier(ctx, 'USR', {
              id: 'the_frontier_signed', name: 'The Frontier Signed', months: -1,
              effects: { moraleMult: 1.05, incomeMult: 0.95 },
            });
          }
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { legitimacy: -15, manpower: -6000 });
            h.addTagModifier(ctx, 'ROM', {
              id: 'rhine_is_a_border', name: 'The Rhine Is a Border', months: 240,
              effects: { incomeMult: 0.92, manpowerMult: 0.95 },
            });
          }
          setOpinion(ctx, who(ctx, 'ROM'), 'USR', -120);
          setOpinion(ctx, 'USR', who(ctx, 'ROM'), -120);
          h.setFlag(ctx, 'civilisRising', false);
          h.setFlag(ctx, 'gallicEmpire', true);
          h.chronicle(ctx, 'era', 'The councils at Reims vote the other way and Cerialis cannot garrison what he beats: '
            + 'the autumn signature is a frontier, and the empire of the Gauls keeps the Rhine.');
        }),
      },
    ],
  },

  // ── W2 · 83 ───────────────────────────────────────────────────────────────
  {
    id: 'ev_fw_mons_graupius',
    title: 'The Edge of the World Has an Army Too',
    worldLabel: 'Agricola breaks the Caledonians at Mons Graupius',
    desc: 'Seven years of methodical conquest have carried Agricola — governor of '
      + 'Britain, and father-in-law of a young senator named Tacitus who will do '
      + 'more for his reputation than any triumph — past every line his '
      + 'predecessors drew, until the free tribes of the far north mass thirty '
      + 'thousand on a hillside called Mons Graupius. Tacitus writes their '
      + 'commander Calgacus a speech no Roman heard and no Caledonian gave, and '
      + 'puts into it the most dangerous sentence ever published in Latin about '
      + 'the empire: they make a desolation and call it peace. The battle itself '
      + 'is the usual arithmetic — the auxiliaries do the killing, the legions '
      + 'are not even engaged, ten thousand dead on the hill against a few '
      + 'hundred. The fleet is sent to circle the island and does, proving '
      + 'Britain is an island, which had been genuinely in dispute. And then '
      + 'Domitian, reading dispatches about a general grown too large, recalls '
      + 'him — politely, with ornaments — and the far north is quietly let go, '
      + 'garrisons drawn down to pay for the Danube. The conquest of the whole '
      + 'island is complete for one season, and never again.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 83, m: 9 },
    world: true,
    aiOption: 0,
    historical: 'Agricola beat the massed Caledonians at Mons Graupius in 83 and his fleet circumnavigated Britain; Domitian recalled him and drew the far north down for the Danube.',
    options: [
      {
        label: 'The ornaments, and the recall',
        tooltip: 'Rome +10 martial points. Caledonia −15 legitimacy, −2,000 manpower, and the province of Caledonia carries "The Desolation" (+2 unrest for 36 months). The general who did it is retired with honors and never employed again.',
        effects: guard('ev_fw_mons_graupius:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { mar: 10 });
          if (alive(ctx, 'CAL')) h.adjust(ctx, 'CAL', { legitimacy: -15, manpower: -2000 });
          stir(ctx, ['Caledonia'], {
            id: 'the_desolation', name: 'The Desolation', months: 36,
            effects: { unrest: 2 },
          });
          h.setFlag(ctx, 'monsGraupius', true);
          h.chronicle(ctx, 'era', 'Agricola breaks the Caledonians at Mons Graupius and his fleet rounds the island; Domitian recalls him with ornaments, and the far north is let go.');
        }),
      },
    ],
  },

  // ── W3 · 87 ───────────────────────────────────────────────────────────────
  {
    id: 'ev_fw_tapae',
    title: 'The King Beyond the Danube',
    worldLabel: 'Decebalus destroys a Roman army; the subsidy peace follows',
    desc: 'Dacia has reassembled itself. A century after Burebista\'s kingdom broke '
      + 'into pieces, a soldier-king named Decebalus has put it back together — '
      + 'Dio grants him the full catalogue, master of ambush and of battle, of '
      + 'using a victory and of surviving a defeat — and when a Roman governor of '
      + 'Moesia is killed in a Dacian raid, Domitian\'s answer escalates into '
      + 'catastrophe. The praetorian prefect Cornelius Fuscus crosses the Danube '
      + 'on a bridge of boats and marches into the pass at Tapae, where his army '
      + 'is annihilated: a legion\'s eagle taken, the prefect dead, prisoners and '
      + 'engines and the campaign chest all gone up the mountain. A second '
      + 'expedition wins a battle at the same pass two years later, whereupon '
      + 'Domitian — needing his army against the Marcomanni and his prestige at '
      + 'home — signs the peace everyone pretends not to understand: Decebalus '
      + 'takes a diadem from Roman hands, a subsidy in Roman coin, and Roman '
      + 'engineers for his fortresses, in exchange for calling himself a client. '
      + 'The engineers matter most. Rome has just paid a tuition, and the '
      + 'invoice for the finished education arrives under Trajan.',
    forTag: 'both',
    decider: 'DAC',
    date: { y: 87, m: 6 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Fuscus\'s army was destroyed at Tapae in 87 and the eagle of V Alaudae lost; the peace of 89 gave Decebalus a subsidy and Roman engineers.',
    options: [
      {
        label: 'A diadem, a subsidy, and the engineers',
        tooltip: 'Rome −5,000 manpower, −5 legitimacy and −100 talents of subsidy. Dacia seats Decebalus: +15 martial points, +100 talents, and "The Roman Engineers" (+8% discipline permanently) — the fortresses go up with borrowed skill.',
        effects: guard('ev_fw_tapae:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { manpower: -5000, legitimacy: -5, treasury: -100 });
          if (alive(ctx, 'DAC')) {
            h.setRuler(ctx, 'DAC', { name: 'Decebalus', title: 'King of Dacia', gov: 3, infl: 3, mar: 5, age: 35 });
            h.adjust(ctx, 'DAC', { mar: 15, treasury: 100 });
            h.addTagModifier(ctx, 'DAC', {
              id: 'roman_engineers', name: 'The Roman Engineers', months: -1,
              effects: { disciplineMult: 1.08 },
            });
          }
          h.setFlag(ctx, 'tapae', true);
          h.chronicle(ctx, 'era', 'Decebalus destroys the praetorian prefect\'s army at Tapae and signs a peace that pays him; Rome\'s engineers go up the mountain to build his fortresses.');
        }),
      },
    ],
  },

  // ── W4 · 89 ───────────────────────────────────────────────────────────────
  {
    id: 'ev_fw_saturninus',
    title: 'Two Legions Proclaim Their Legate',
    worldLabel: 'Saturninus revolts at Mogontiacum; the Rhine thaws too soon',
    desc: 'On the first of January, the two legions wintering together at '
      + 'Mogontiacum proclaim their commander Antonius Saturninus emperor, with '
      + 'their joint savings bank — the soldiers\' burial funds, deposited at '
      + 'headquarters — as his war chest, which is the kind of detail that tells '
      + 'you how carefully this was planned. The plan\'s other half is German: '
      + 'the Chatti are to cross the frozen Rhine and pin the loyalists. The '
      + 'river thaws early. The Chatti stand on the far bank of moving water '
      + 'while Lappius Maximus marches down from Lower Germany and ends the '
      + 'revolt in one battle; Saturninus\'s head goes to Rome, and Lappius — in '
      + 'the one act of the affair anyone remembers warmly — burns the '
      + 'correspondence in the camp files before the emperor\'s questioners '
      + 'arrive, exactly as Marcus Aurelius would do with Cassius\'s letters a '
      + 'century later, and for the same reason: a list of names is a machine '
      + 'that runs until someone breaks it. Domitian comes north anyway. The '
      + 'quaestionings that follow feed the terror of his last years, and the '
      + 'rule is written that no two legions may ever again share a winter '
      + 'camp — a regulation the map of every later frontier obeys.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 89, m: 1 },
    world: true,
    aiOption: 0,
    historical: 'Saturninus was proclaimed by the two legions at Mogontiacum on 1 January 89; the Rhine thawed before the Chatti could cross, Lappius crushed the revolt and burned the files.',
    options: [
      {
        label: 'The files are burned before the questioners arrive',
        tooltip: 'Rome −5 legitimacy and Mogontiacum +2 unrest for 24 months ("The Double Camp Abolished"). The Chatti cool toward Rome (−30 opinion) — the thaw saved them from co-belligerence, not from the list of enemies.',
        effects: guard('ev_fw_saturninus:0', (ctx) => {
          const h = ctx.helpers;
          // Two legions and a war chest of dead men's savings are a country
          // for as long as it takes somebody to march (SPEC §253).
          raiseSaturninus(ctx);
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { legitimacy: -5 });
          stir(ctx, ['Mogontiacum'], {
            id: 'double_camp_abolished', name: 'The Double Camp Abolished', months: 24,
            effects: { unrest: 2 },
          });
          if (alive(ctx, 'CHA')) setOpinion(ctx, 'CHA', 'ROM', -30);
          h.setFlag(ctx, 'saturninus', true);
          h.chronicle(ctx, 'era', 'Two legions proclaim Saturninus at Mogontiacum and the Rhine thaws before the Chatti can cross; the files are burned, and the double winter camp is abolished forever.');
        }),
      },
    ],
  },

  // ── W4b · 89 ──────────────────────────────────────────────────────────────
  {
    id: 'ev_fw_saturninus_ends',
    verdict: 'saturninus',
    title: 'The River Thaws Early',
    worldLabel: 'The Chatti cannot cross; the Rhine rising ends in one battle',
    desc: 'The whole plan is a piece of ice. The Chatti are to cross the frozen Rhine '
      + 'and pin the loyal legions while the two at Mogontiacum march; the river '
      + 'thaws a week early, and a German army stands on the far bank of moving '
      + 'water watching a Roman civil war it can no longer join. Lappius Maximus '
      + 'comes down from Lower Germany and ends the affair in a single battle. Then '
      + 'he does the one thing anybody remembers warmly about him: he burns the '
      + 'correspondence in the camp files before the emperor\'s questioners arrive, '
      + 'exactly as Marcus Aurelius will do with Cassius\' letters a century later, '
      + 'and for the same reason — a list of names is a machine that runs until '
      + 'somebody breaks it.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 89, m: 3 },
    world: true,
    major: true,
    aiOption: 0,
    when: (ctx) => !!ctx.helpers.getFlag(ctx, 'saturninus') && theRhineThaws(ctx),
    options: [
      {
        label: 'One battle, and then the files',
        tooltip: 'The acclamation folds back into Rome and the war ends with it. Rome +5 legitimacy and −2,000 manpower; the double winter camp is abolished, which is the one permanent measure anyone takes.',
        effects: guard('ev_fw_saturninus_ends:0', (ctx) => {
          const h = ctx.helpers;
          settleTheGauls(ctx, 'The Rhine thaws a week early, the Chatti stand on the far bank of '
            + 'moving water, and the rising ends in one battle and a bonfire of letters.');
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { legitimacy: 5, manpower: -2000 });
          h.setFlag(ctx, 'saturninus', false);
        }),
      },
    ],
  },

  // ── W4c · 89 ──────────────────────────────────────────────────────────────
  {
    id: 'ev_fw_saturninus_holds',
    verdict: 'saturninus',
    title: 'The Ice Holds a Week Longer',
    worldLabel: 'The Chatti cross; the Rhine rising becomes a war',
    desc: 'A week of cold is the whole difference. The Chatti come over the ice in '
      + 'strength, the loyal legions of Lower Germany are pinned where they stand, '
      + 'and what was to be a police action against two mutinous legions becomes a '
      + 'campaign on a frontier with a German army inside it. Saturninus is not a '
      + 'great commander and does not need to be; he is the man with the pay chest, '
      + 'the winter camp and the Germans, and Rome — with Dacia unfinished on the '
      + 'other frontier — has to buy what it cannot immediately storm. What is '
      + 'agreed is never called a settlement: an amnesty, an arrangement about the '
      + 'Rhine command, and a treasury payment recorded as a donative. The emperor\'s '
      + 'questioners get their lists anyway, and the terror of the last years starts '
      + 'a season early and runs harder.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 89, m: 3 },
    world: true,
    major: true,
    aiOption: 0,
    when: (ctx) => !!ctx.helpers.getFlag(ctx, 'saturninus') && !theRhineThaws(ctx),
    options: [
      {
        label: 'Buy what cannot be stormed, and call it a donative',
        tooltip: 'The rising is bought out rather than beaten: the Rhine comes back under one banner, but Rome pays −200 talents, −12 legitimacy and −5,000 manpower, and takes "The Questioners" (+1 unrest everywhere, −5% income) for ten years. The Chatti warm toward whoever paid them (+40 opinion).',
        effects: guard('ev_fw_saturninus_holds:0', (ctx) => {
          const h = ctx.helpers;
          settleTheGauls(ctx, 'The ice holds a week longer and the Chatti come over it: the Rhine '
            + 'rising is bought out rather than beaten, and the payment is entered in the books as a donative.');
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { treasury: -200, legitimacy: -12, manpower: -5000 });
            h.addTagModifier(ctx, 'ROM', {
              id: 'the_questioners', name: 'The Questioners', months: 120,
              effects: { unrestAll: 1, incomeMult: 0.95 },
            });
          }
          if (alive(ctx, 'CHA')) setOpinion(ctx, 'CHA', who(ctx, 'ROM'), 40);
          h.setFlag(ctx, 'saturninus', false);
        }),
      },
    ],
  },

  // ── W5 · 92 ───────────────────────────────────────────────────────────────
  {
    id: 'ev_fw_rapax',
    title: 'An Eagle Lost on the Danube',
    worldLabel: 'The Sarmatians destroy Legio XXI Rapax',
    desc: 'The Danube is becoming what the Rhine used to be — the frontier that '
      + 'eats armies. The Iazyges, Sarmatian horse out of the plain between the '
      + 'rivers, cross in strength with their Suebic neighbours and catch Legio '
      + 'XXI Rapax — "the Predator," a legion with a century of battle honours '
      + 'from the German wars — and destroy it, eagle and all. It is the second '
      + 'eagle lost on this frontier in five years. Domitian comes out in person, '
      + 'campaigns eight months, patches the line, and celebrates with an ovation '
      + 'rather than a triumph — laurel without the chariot — because even he '
      + 'can count, and the arithmetic of the Danube now runs: two eagles, one '
      + 'subsidized king, and a steppe cavalry that has learned it can cross '
      + 'whenever the river or the politics freeze. The military center of '
      + 'gravity of the whole empire is sliding, garrison by garrison, from the '
      + 'Rhine to this river, where it will sit for three hundred years.',
    forTag: 'both',
    decider: 'SRM',
    date: { y: 92, m: 5 },
    world: true,
    aiOption: 0,
    historical: 'The Iazyges and Suebi destroyed XXI Rapax around May 92; Domitian campaigned on the Danube and took an ovation, not a triumph.',
    options: [
      {
        label: 'Laurel without the chariot',
        tooltip: 'Rome −4,000 manpower and −5 martial points; Aquincum and Sirmium carry "The Open River" (+2 unrest for 24 months). Sarmatia +10 martial points and +50 talents of plunder — the plain between the rivers has found its trade.',
        effects: guard('ev_fw_rapax:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { manpower: -4000, mar: -5 });
          if (alive(ctx, 'SRM')) h.adjust(ctx, 'SRM', { mar: 10, treasury: 50 });
          stir(ctx, ['Aquincum', 'Sirmium'], {
            id: 'the_open_river', name: 'The Open River', months: 24,
            effects: { unrest: 2 },
          });
          h.setFlag(ctx, 'rapaxLost', true);
          h.chronicle(ctx, 'era', 'The Sarmatians destroy the Predator legion on the Danube — the second eagle in five years; the empire\'s weight begins sliding to the river where it will sit for centuries.');
        }),
      },
    ],
  },

  // ── W6 · 106 ──────────────────────────────────────────────────────────────
  {
    id: 'ev_fw_dacia_capta',
    title: 'The Gold of the Kings Comes Down the River',
    worldLabel: 'Trajan annexes Dacia; the treasure of Decebalus is taken',
    desc: 'Trajan does not renew the subsidy. Two wars, five years, and a bridge — '
      + 'Apollodorus of Damascus throws a permanent span across the lower Danube '
      + 'on twenty stone piers, engineering as a declaration that Rome is not '
      + 'visiting — end the kingdom Decebalus rebuilt. The king\'s hoard is '
      + 'betrayed by a courtier: diverted river, chamber under the riverbed, the '
      + 'figures the tradition keeps too large to audit and too consistent to '
      + 'dismiss. Decebalus, ridden down by Roman cavalry, opens his own throat '
      + 'under a tree — the scout who reached him first, one Tiberius Claudius '
      + 'Maximus, will retire and put the scene on his tombstone, which survives. '
      + 'Sarmizegetusa is razed and refounded in the plain with a Roman name; '
      + 'colonists pour in from everywhere in the empire; and the gold pays for '
      + 'one hundred and twenty-three days of games and the greatest forum Rome '
      + 'will ever build — rising, as it happens, beside the one Vespasian built '
      + 'from the spoils of Jerusalem. Two conquered treasuries, one skyline. '
      + 'The column in the middle carries the whole war in a spiral relief, and '
      + 'not one scene of it needed to be invented.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 106, m: 8 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Trajan annexed Dacia in 106 after two wars; Decebalus killed himself as the cavalry closed, the hoard was taken from under the Sargetia, and the games ran 123 days.',
    options: [
      {
        label: 'A hundred and twenty-three days of games',
        tooltip: 'Sarmizegetusa and Napoca pass to Rome off Dacia alone; Rome +500 talents of the kings\' hoard, +10 legitimacy, and "The Dacian Gold" (+5% income for 120 months). The kingdom of the Dacians is struck from the list of nations.',
        effects: guard('ev_fw_dacia_capta:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          transfer(ctx, ['Sarmizegetusa', 'Napoca'], 'ROM', 'DAC');
          h.adjust(ctx, 'ROM', { treasury: 500, legitimacy: 10 });
          h.addTagModifier(ctx, 'ROM', {
            id: 'dacian_gold', name: 'The Dacian Gold', months: 120,
            effects: { incomeMult: 1.05 },
          });
          h.setFlag(ctx, 'daciaCapta', true);
          h.chronicle(ctx, 'era', 'Trajan ends Dacia and takes the hoard from under the river; the gold builds a forum beside the one built from Jerusalem\'s spoils — two conquered treasuries, one skyline.');
        }),
      },
    ],
  },

  // ── SPEC §206: the south and the east while Judaea burns. The same
  // admission rule as the rest of the file — it happens whichever way the
  // revolt goes, because none of it has heard of the revolt. Sources:
  // Seneca NQ VI.8 and Pliny NH VI.181 for the Nile reconnaissance; the
  // Periplus Maris Erythraei for itself; Josephus BJ VII.244-251 for the
  // Alans, in the same book as the fall of Masada. ─────────────────────────

  // ── S1 · 67 ───────────────────────────────────────────────────────────────
  {
    id: 'ev_fw_sudd_report',
    title: 'The Map Stops at the Marsh',
    worldLabel: 'Nero\'s centurions return from the White Nile; the Ethiopian war is filed away',
    desc: 'Two centurions of the praetorian guard have been away south for two '
      + 'years on the strangest errand of the reign: sent by Nero, with letters '
      + 'of passage from the king of Kush, to find where the Nile comes from — '
      + 'and, Pliny adds dryly, to survey the approaches, because among the '
      + 'wars the emperor was contemplating was one against Ethiopia. Seneca '
      + 'heard their report himself and wrote it down. They passed Meroe, they '
      + 'passed the last herds and the last birds, and then they came to a '
      + 'marsh that the world could not cross: reeds to the horizon, water '
      + 'with no channel, mud that would carry neither a boat nor a boot, '
      + 'inhabited by nothing anyone could name. There, they told the '
      + 'philosopher, we saw two rocks with an immense force of river falling '
      + 'between them — and there they turned around. The report is filed. The '
      + 'Ethiopian war is quietly filed with it: past the Kandake\'s kingdom '
      + 'there is nothing to conquer but water and grass, and the emperor who '
      + 'wanted the war has a year to live.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 67, m: 2 },
    world: true,
    aiOption: 0,
    when: (ctx) => alive(ctx, 'ROM'),
    historical: 'Nero\'s praetorian reconnaissance ascended the Nile past Meroe and was stopped by the Sudd (Seneca NQ VI.8.3-4); Pliny (NH VI.181) says it scouted for a planned Ethiopian war that died with Nero.',
    options: [
      {
        label: 'File the report; shelve the war',
        tooltip: 'Kush +1 stability — the marsh is a better wall than any treaty — and the two courts\' correct relations warm a little (+20 Kushite opinion of Rome). The map south of Meroe stays blank.',
        effects: guard('ev_fw_sudd_report:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'KSH')) {
            h.adjust(ctx, 'KSH', { stability: 1 });
            const t = ctx.game.tags[who(ctx, 'KSH')];
            if (t) {
              if (!t.opinion) t.opinion = {};
              t.opinion[who(ctx, 'ROM')] = Math.min(200, (t.opinion[who(ctx, 'ROM')] || 0) + 20);
            }
          }
          h.setFlag(ctx, 'suddReport', true);
          h.chronicle(ctx, 'era', 'Nero\'s centurions come back from the White Nile with a report of a marsh no army can cross; the Ethiopian war is filed away, and the map south of Meroe stays blank.');
        }),
      },
    ],
  },

  // ── S2 · 70 ───────────────────────────────────────────────────────────────
  {
    id: 'ev_fw_periplus',
    title: 'The Sea Gets a Handbook',
    worldLabel: 'A Greek merchant of Egypt writes down the monsoon trade, port by port',
    desc: 'Somewhere in Egypt, a Greek merchant who has made the run himself sits '
      + 'down and writes the most useful book of the century: a working pilot '
      + 'of the southern sea, port by port, king by king, cargo by cargo. '
      + 'Adulis, where the ivory comes down from the Aksumite highlands and '
      + 'the ruler is Zoscales — tight with his goods, the author notes, but '
      + 'otherwise a fine man, and schooled in Greek. Muza, humming with '
      + 'shipowners. Eudaemon Arabia, which an emperor wrecked within living '
      + 'memory. The frankincense shore, where the harvest is worked by the '
      + 'king\'s convicts and the air itself is said to sicken the crews. '
      + 'Omana on the Persian side; Dioscurida of the dragon\'s blood, rented '
      + 'out by the Hadrami king. And through all of it the great fact the '
      + 'book exists to teach: that the open-sea monsoon run to India, with '
      + 'the wind named for the pilot Hippalus who first trusted it, has made '
      + 'the whole coasting world one market. Nobody important will read it '
      + 'for centuries. Every captain will.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 70, m: 9 },
    world: true,
    aiOption: 0,
    historical: 'The Periplus of the Erythraean Sea, written by an anonymous Egyptian Greek merchant about 50-70 CE, is the surviving handbook of the monsoon trade and names Zoscales, Charibael and Eleazus.',
    options: [
      {
        label: 'Every captain reads it',
        tooltip: 'The handbook trade: Adulis, Muza, Eudaemon Arabia, Omana and Moscha carry "The Merchant\'s Handbook" (+15% tax, +10% production for 10 years), and every incense crown still standing gains "The Monsoon Learned" (+10% trade for 10 years).',
        effects: guard('ev_fw_periplus:0', (ctx) => {
          const h = ctx.helpers;
          stir(ctx, ['Adulis', 'Muza', 'Eudaemon Arabia', 'Omana', 'Moscha'], {
            id: 'merchants_handbook', name: 'The Merchant\'s Handbook', months: 120,
            effects: { taxMult: 1.15, prodMult: 1.1 },
          });
          for (const t of ['AXM', 'HMY', 'HDR', 'OMA', 'CHX']) {
            if (!alive(ctx, t)) continue;
            h.addTagModifier(ctx, t, {
              id: 'monsoon_learned', name: 'The Monsoon Learned', months: 120,
              effects: { tradeMult: 1.1 },
            });
          }
          h.setFlag(ctx, 'periplusWritten', true);
          h.chronicle(ctx, 'era', 'A Greek merchant of Egypt writes the monsoon sea down port by port, king by king. Nobody important will read it for centuries; every captain will.');
        }),
      },
    ],
  },

  // ── S3 · 72 ───────────────────────────────────────────────────────────────
  {
    id: 'ev_fw_alans_gates',
    title: 'The Alans Come Through the Gates',
    worldLabel: 'The steppe rides through Hyrcania into Media; a king\'s ransom is paid from a rope',
    desc: 'Josephus breaks off his own war to report it, in the same book as '
      + 'Masada: the Alans — a Scythian people, he explains, from around the '
      + 'Tanais and the Maeotic lake — have come through the iron gates of the '
      + 'Caspian shore in enormous force, by arrangement with the king of '
      + 'Hyrcania, who holds the pass and opened it. They flood Media '
      + 'unresisted, empty a country full of cattle and of no soldiers, and '
      + 'catch the Parthian king\'s son Pacorus so unprepared that his harem '
      + 'and his baggage are taken and he ransoms them back for a hundred '
      + 'talents. Tiridates of Armenia — the same Tiridates Nero crowned in '
      + 'the theater at Rome — does stand and fight, and survives capture by '
      + 'the width of a sword-stroke: a lasso settles over him and he cuts the '
      + 'rope in time. The riders go home the way they came, loaded, '
      + 'unbeaten, unpunished. The lesson lands in two capitals at once: the '
      + 'Arsacid east has a door in it, and the man who holds Hyrcania holds '
      + 'the hinge.',
    forTag: 'both',
    decider: 'PAR',
    date: { y: 72, m: 6 },
    world: true,
    aiOption: 0,
    when: (ctx) => alive(ctx, 'PAR'),
    historical: 'The Alan invasion of 72 CE through the Caspian Gates, admitted by the king of Hyrcania, ravaged Media and Armenia; Pacorus ransomed his household and Tiridates cut a lasso to escape (Josephus BJ VII.244-251).',
    options: [
      {
        label: 'Cut the rope and count the cost',
        tooltip: 'Parthia −6,000 manpower and −100 talents; Armenia −2,000 manpower. Hyrcania carries "The Gates Stood Open" (+2 unrest for 2 years) — the pass-holder let them in, and the crown knows it.',
        effects: guard('ev_fw_alans_gates:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'PAR', { manpower: -6000, treasury: -100 });
          if (alive(ctx, 'ARM')) h.adjust(ctx, 'ARM', { manpower: -2000 });
          stir(ctx, ['Hyrcania'], {
            id: 'gates_stood_open', name: 'The Gates Stood Open', months: 24,
            effects: { unrest: 2 },
          });
          h.setFlag(ctx, 'alansThroughGates', true);
          h.chronicle(ctx, 'era', 'The Alans ride through the Caspian Gates by the Hyrcanian king\'s leave, empty Media, and go home unbeaten; a Parthian prince ransoms his harem and the king of Armenia cuts a lasso from his own neck.');
        }),
      },
    ],
  },
];
