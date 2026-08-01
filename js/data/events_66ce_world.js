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
        tooltip: 'Rome −5,000 manpower and −100 talents; Batavia, Colonia Agrippina and Mogontiacum carry "The Rhine in Arms" (+3 unrest for 18 months). The Frisii cool toward Rome (−40 opinion). In Jerusalem, the news is read aloud on the walls.',
        effects: guard('ev_fw_civilis:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { manpower: -5000, treasury: -100 });
          stir(ctx, ['Batavia', 'Colonia Agrippina', 'Mogontiacum'], {
            id: 'rhine_in_arms', name: 'The Rhine in Arms', months: 18,
            effects: { unrest: 3 },
          });
          if (alive(ctx, 'FRS')) setOpinion(ctx, 'FRS', 'ROM', -40);
          h.setFlag(ctx, 'civilisRising', true);
          h.chronicle(ctx, 'era', 'The Batavians rise under Civilis and two legions surrender at Vetera; in the year of four emperors, one small nation nearly closes the Rhine.');
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
];
