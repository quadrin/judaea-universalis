// Judaea Universalis — the West from the pirate's dinner table to the
// Teutoburg, 39 BCE–9 CE (SPEC §111 applied to the 40 chapter). Content
// package. Zero imports; all effects run through ctx.helpers at runtime.
// Concatenated onto EVENTS_40 by the era registry. BCE years are negative.
//
// The 40 chapter's world clock ran: Gindarus, Antony's Parthian disaster,
// Actium, Alexandria, Augustus — and then nothing until 6 CE. The entire
// Herodian reign passed in front of a stopped world: no Sextus Pompeius,
// whose grain blockade was starving Italy while Herod besieged Jerusalem;
// no Naulochus; no oath of Italy; no Cantabrian end, no secular games, no
// Drusus on the Elbe, and no Teutoburg — the one Roman catastrophe of
// Herod's era, arriving three years after his kingdom became a province.
// A king whose entire statecraft was reading Rome's weather deserves a sky.
//
// The rule for admission is §104's: it must happen whichever way the
// crown war went. Nothing here moves a border; the one succession scripted
// is a Cheruscan war-king the bookmark's roster carries and no card ever
// seated.
//
// Source spine: Appian, Civil Wars V; Velleius Paterculus II, who was there
// for the German part and never lets you forget it; Suetonius, Augustus;
// Cassius Dio XLVIII–LVI; the Res Gestae for what Augustus wanted
// remembered; Horace's Carmen Saeculare for what the festival sounded like.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_40bce_world] ' + key, e || '');
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

export const EVENTS_40_WORLD = [

  // ── W1 · -39 ──────────────────────────────────────────────────────────────
  {
    id: 'ev5_w_misenum',
    title: 'Dinner with the Pirate King',
    worldLabel: 'The triumvirs treat with Sextus Pompeius at Misenum',
    desc: 'While Parthian cavalry hold Syria and a Hasmonean sits in Jerusalem again, '
      + 'Italy is quietly starving. Sextus Pompeius — the great Pompey\'s surviving '
      + 'son, master of Sicily, Sardinia and several hundred warships — has closed '
      + 'the grain routes, and the Roman street riots until Antony and Octavian '
      + 'come to terms. The treaty is signed at Misenum and celebrated at dinner on '
      + 'Sextus\'s flagship, where his admiral Menodorus takes him aside with a '
      + 'practical proposal: cut the cable, put to sea, and the guests dining in '
      + 'your stern cabin stop being the masters of the world before the wine goes '
      + 'round again. Sextus\'s answer is the era in one line — you should have '
      + 'done it without asking; now it would be perjury. He keeps his oath, the '
      + 'grain sails, and every signatory goes home to prepare the war the dinner '
      + 'was supposed to prevent. The kings of the East, asked constantly to guess '
      + 'which Roman will be paying the bills in five years, add a third name to '
      + 'the list and note that it dines well.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -39, m: 8 },
    world: true,
    aiOption: 0,
    historical: 'The pact of Misenum was signed and dined on aboard Sextus\'s flagship in 39; Menodorus offered to cut the cable, and Sextus answered that it should have been done without asking.',
    options: [
      {
        label: 'Now it would be perjury',
        tooltip: 'The grain sails again: Rome +100 talents and "The Grain Sails" (+5% income for 24 months). Nobody at the table intends to keep the treaty, and everybody at the table knows it.',
        effects: guard('ev5_w_misenum:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { treasury: 100 });
            h.addTagModifier(ctx, 'ROM', {
              id: 'the_grain_sails', name: 'The Grain Sails', months: 24,
              effects: { incomeMult: 1.05 },
            });
          }
          h.setFlag(ctx, 'misenum', true);
          h.chronicle(ctx, 'era', 'The triumvirs dine with Sextus Pompeius on his flagship at Misenum; the cable is not cut, and everyone goes home to arm.');
        }),
      },
    ],
  },

  // ── W2 · -36 ──────────────────────────────────────────────────────────────
  {
    id: 'ev5_w_naulochus',
    title: 'The Sea Is Swept',
    worldLabel: 'Agrippa destroys Sextus at Naulochus; Lepidus falls',
    desc: 'Octavian\'s answer to sea power is a man, not a fleet: Agrippa, who digs '
      + 'a harbour out of two lakes, trains twenty thousand oarsmen on benches '
      + 'ashore, and invents a catapult-thrown grapnel that turns naval battles '
      + 'into the land battles Romans win. At Naulochus off Sicily, three hundred '
      + 'ships a side, Sextus loses all but seventeen and flees east in the costume '
      + 'of a private citizen; Antony\'s officers will execute him at Miletus '
      + 'without a trial — a Roman imperator, killed like a bandit, and nobody '
      + 'presses the question because the answer is the times. The same week, '
      + 'Lepidus the third triumvir tries to claim Sicily with twenty legions, and '
      + 'discovers what the legions think of him when they walk out of his camp in '
      + 'an afternoon. He is stripped to a priesthood and house arrest. The world '
      + 'is now a two-man estate — and the young Caesar has just demonstrated, in '
      + 'water, the patient arithmetic he will bring to Actium.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -36, m: 9 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Agrippa broke Sextus at Naulochus on 3 September 36; Sextus was executed at Miletus, and Lepidus\'s legions deserted him when he claimed Sicily.',
    options: [
      {
        label: 'The grapnel turns the sea into land',
        tooltip: 'Rome +10% naval power for 120 months ("The Swept Sea"), +100 talents, and the triumvirate quietly becomes a pair. Panormus and Syracusae carry "The Grain Route Reopened" (+15% tax for 36 months).',
        effects: guard('ev5_w_naulochus:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { treasury: 100 });
            h.addTagModifier(ctx, 'ROM', {
              id: 'the_swept_sea', name: 'The Swept Sea', months: 120,
              effects: { navalMult: 1.1 },
            });
          }
          stir(ctx, ['Panormus', 'Syracusae'], {
            id: 'grain_route_reopened', name: 'The Grain Route Reopened', months: 36,
            effects: { taxMult: 1.15 },
          });
          h.setFlag(ctx, 'naulochus', true);
          h.chronicle(ctx, 'era', 'Agrippa sweeps Sextus from the sea at Naulochus and Lepidus\'s legions walk away; the world is a two-man estate now.');
        }),
      },
    ],
  },

  // ── W3 · -34 ──────────────────────────────────────────────────────────────
  {
    id: 'ev5_w_illyricum',
    title: 'The Triumvir Works His Passage',
    worldLabel: 'Octavian campaigns in Illyricum and takes his scars',
    desc: 'Between the sea war and the last war, Octavian spends two summers doing '
      + 'something nobody expected of the sickly heir who was carried through his '
      + 'first campaigns in a litter: fighting, in person, uphill, in Illyria. The '
      + 'Delmatae and the Iapodes have raided the Adriatic coast and defied Rome '
      + 'since Caesar\'s day; Octavian takes their hill forts one by one, is '
      + 'wounded at Metulum leading a bridge assault — a knee and both arms, '
      + 'witnesses in adequate supply — and recovers Siscia on the Save as a '
      + 'forward base against the Pannonians. The strategy is transparent to '
      + 'anyone who reads dispatches for a living: Antony\'s partisans in Rome '
      + 'have been asking aloud what the young Caesar\'s body has ever done for '
      + 'the Republic, and the answer is now filed, with scars, against the '
      + 'pamphlet war to come. The coast is also, incidentally, actually '
      + 'pacified — the man does tend to finish what he performs.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -34, m: 8 },
    world: true,
    aiOption: 0,
    historical: 'Octavian campaigned in Illyricum 35–33, was wounded at Metulum, and took Siscia; the campaigns answered the pamphlet war as much as the frontier.',
    options: [
      {
        label: 'Scars, filed against the pamphlet war',
        tooltip: 'Rome +10 martial points and +5 legitimacy. The Delmatae −15 legitimacy, −2,000 manpower, and Salona and Siscia carry "The Hill Forts Fall" (+1 unrest for 24 months) while the columns work the valleys.',
        effects: guard('ev5_w_illyricum:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { mar: 10, legitimacy: 5 });
          if (alive(ctx, 'DLM')) h.adjust(ctx, 'DLM', { legitimacy: -15, manpower: -2000 });
          stir(ctx, ['Salona', 'Siscia'], {
            id: 'hill_forts_fall', name: 'The Hill Forts Fall', months: 24,
            effects: { unrest: 1 },
          });
          h.setFlag(ctx, 'illyricum', true);
          h.chronicle(ctx, 'era', 'Octavian fights uphill in Illyricum for two summers and takes his wounds at Metulum; the scars are filed against the pamphlet war.');
        }),
      },
    ],
  },

  // ── W4 · -32 ──────────────────────────────────────────────────────────────
  {
    id: 'ev5_w_oath_of_italy',
    title: 'Italy Swears',
    worldLabel: 'The West takes Octavian\'s oath; war is declared on Cleopatra',
    desc: 'The end begins with a document crime: Octavian seizes Antony\'s will from '
      + 'the Vestal Virgins — who may not surrender it, and are made to — and reads '
      + 'it to the Senate. Legacies to Cleopatra\'s children, Roman provinces '
      + 'promised away, burial beside her in Alexandria: some of it is probably '
      + 'even genuine. What follows is stranger and larger: tota Italia, the whole '
      + 'peninsula town by town, swears a personal oath to Octavian as leader — not '
      + 'to the Republic, not to an office, to a man; the client-oath of a Herod or '
      + 'a Malichus, administered to Italy itself, though nobody puts it that way '
      + 'in Latin. And the war that is declared, with the old fetial spear-throw '
      + 'dusted off for the occasion, is declared against Cleopatra alone. Not '
      + 'Antony — a woman, a foreign queen. Nobody has to say the word civil, and '
      + 'that is the entire point of the ceremony.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -32, m: 10 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Octavian published Antony\'s will in 32; Italy and the western provinces swore the personal oath, and war was declared on Cleopatra alone by the fetial rite.',
    options: [
      {
        label: 'War on the queen, so nobody says civil',
        tooltip: 'Rome +10 legitimacy and "The Oath of Italy" (+10% manpower for 36 months). Egypt cools to −150 opinion of Rome. Every eastern court has one winter left to decide whose war chest it paid into.',
        effects: guard('ev5_w_oath_of_italy:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { legitimacy: 10 });
            h.addTagModifier(ctx, 'ROM', {
              id: 'oath_of_italy', name: 'The Oath of Italy', months: 36,
              effects: { manpowerMult: 1.1 },
            });
          }
          if (alive(ctx, 'PTO')) setOpinion(ctx, 'PTO', 'ROM', -150);
          h.setFlag(ctx, 'oathOfItaly', true);
          h.chronicle(ctx, 'era', 'Italy swears the personal oath town by town, and war is declared on Cleopatra alone — nobody has to say the word civil.');
        }),
      },
    ],
  },

  // ── W5 · -19 ──────────────────────────────────────────────────────────────
  {
    id: 'ev5_w_cantabria',
    title: 'The Last Land War of the West',
    worldLabel: 'Agrippa ends the Cantabrian war; Spain is finished',
    desc: 'Two hundred years after the first legion landed in Spain, the peninsula '
      + 'is finally, entirely quiet. The Cantabrians of the northern mountains were '
      + 'the last — a ten-year war of ambush and reprisal that Augustus opened in '
      + 'person and his doctors made him leave, that consumed legates the way the '
      + 'mountains consume roads, and that ends only when Agrippa arrives, breaks a '
      + 'mutinous legion back into discipline by stripping its title, and brings '
      + 'the mountaineers down to the plains where they can be watched. The sources '
      + 'record the prisoners crucified singing their own victory songs, and the '
      + 'sold slaves killing their buyers with bare hands rather than serve. The '
      + 'gold of the northwest starts flowing the year the fighting stops — mines '
      + 'worked hydraulically at a scale no kingdom has attempted — and Rome '
      + 'quietly closes the temple of Janus again. Augustus is now at peace, '
      + 'officially, everywhere, for the third time in history. It is excellent '
      + 'publicity and, for once, close to true.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -19, m: 7 },
    world: true,
    aiOption: 0,
    historical: 'Agrippa closed the Cantabrian war in 19 after a decade; the northwest\'s gold mines opened, and Janus was shut for the second time under Augustus.',
    options: [
      {
        label: 'The mountaineers are moved to the plains',
        tooltip: 'Rome +5 legitimacy and "The West at Rest" (+3% income permanently) — the last land frontier of the West closes. Asturica and Bracara carry "The Roads and the Mines" (+10% tax for 60 months) as the hydraulic works open.',
        effects: guard('ev5_w_cantabria:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { legitimacy: 5 });
            h.addTagModifier(ctx, 'ROM', {
              id: 'west_at_rest', name: 'The West at Rest', months: -1,
              effects: { incomeMult: 1.03 },
            });
          }
          stir(ctx, ['Asturica', 'Bracara'], {
            id: 'roads_and_mines', name: 'The Roads and the Mines', months: 60,
            effects: { taxMult: 1.1 },
          });
          h.setFlag(ctx, 'cantabriaDone', true);
          h.chronicle(ctx, 'era', 'The Cantabrian war ends and the temple of Janus closes; two hundred years after the first landing, Spain is finished.');
        }),
      },
    ],
  },

  // ── W6 · -17 ──────────────────────────────────────────────────────────────
  {
    id: 'ev5_w_ludi_saeculares',
    title: 'The Age Turns',
    worldLabel: 'Augustus holds the Secular Games; a new age is proclaimed',
    desc: 'For three days and three nights Rome holds a festival that no living '
      + 'person has seen and no living person will see again — the Secular Games, '
      + 'due once in a saeculum, the longest span of a human life, which the '
      + 'quindecimvirs have recalculated with some flexibility to land in this '
      + 'particular year. Heralds summon the city to a spectacle "such as they '
      + 'have never seen and never will see again," which takes a certain '
      + 'administrative nerve to put on a poster. Sacrifices to the Fates and to '
      + 'Mother Earth by night, to Jupiter and Juno by day; and on the final '
      + 'afternoon a choir of twenty-seven boys and twenty-seven girls, parents '
      + 'living, sings a hymn commissioned from Horace: the age turns, the '
      + 'wars are over, Faith and Peace and ancient Modesty return. It is state '
      + 'poetry of the highest grade, meaning both that it is beautiful and that '
      + 'it is policy. An age that must be proclaimed is an age somebody is '
      + 'still arguing about; the East, which has its own calendars and its own '
      + 'ideas about what age it is, files the hymn with the rest of the '
      + 'paperwork.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -17, m: 6 },
    world: true,
    aiOption: 0,
    historical: 'The ludi saeculares were held in June 17 with Horace\'s Carmen Saeculare sung by fifty-four children; the heralds promised a spectacle none living had seen or would see again.',
    options: [
      {
        label: 'A spectacle none living will see again',
        tooltip: 'Rome +10 legitimacy and +1 stability — the new age is proclaimed in hexameters and believed at least until the next war. Roma carries "The Saeculum" (−1 unrest for 60 months).',
        effects: guard('ev5_w_ludi_saeculares:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { legitimacy: 10, stability: 1 });
          stir(ctx, ['Roma'], {
            id: 'the_saeculum', name: 'The Saeculum', months: 60,
            effects: { unrest: -1 },
          });
          h.setFlag(ctx, 'saeculum', true);
          h.chronicle(ctx, 'era', 'Rome holds the Secular Games and Horace\'s choir sings the age turned; an age that must be proclaimed is an age still being argued.');
        }),
      },
    ],
  },

  // ── W7 · -9 ───────────────────────────────────────────────────────────────
  {
    id: 'ev5_w_drusus',
    title: 'The Elbe, and a Fall from a Horse',
    worldLabel: 'Drusus reaches the Elbe and dies on the way back',
    desc: 'For four summers Drusus — Augustus\'s stepson, the popular one, the one '
      + 'the soldiers would follow into water — has been dismantling free Germany: '
      + 'a fleet through the northern lagoons, the Frisii enrolled, the Chatti and '
      + 'Cherusci beaten in their own forests, and finally the Elbe itself, a '
      + 'river no Roman army has ever seen. The omen-collectors say a barbarian '
      + 'woman of superhuman size met him at the bank and told him to turn back, '
      + 'that his end was near; what is certain is that on the return march his '
      + 'horse fell on him, and he died of the gangrene thirty days later with his '
      + 'brother Tiberius at his side — Tiberius having ridden two hundred miles '
      + 'in a day and a night to reach him. The army carries the body home on '
      + 'its shoulders in relays. Germania looks won: garrisons winter on the '
      + 'Weser, the tribes send hostages, the young Cheruscan nobles go to Rome '
      + 'to be educated in the equestrian order. One of them is named Arminius. '
      + 'It is not won.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -9, m: 9 },
    world: true,
    aiOption: 0,
    historical: 'Drusus reached the Elbe in 9 BCE and died of gangrene after a riding fall on the return; Tiberius rode two hundred miles in a day to reach his deathbed.',
    options: [
      {
        label: 'The army carries him home in relays',
        tooltip: 'Rome +10 martial points — the German command is the school of the next generation. The Cherusci and Chatti cool toward Rome (−40 opinion), and Teutoburgium and Chatti carry "The Winter Camps" (+1 unrest for 36 months): the garrisons stay past the campaigning season now.',
        effects: guard('ev5_w_drusus:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { mar: 10 });
          for (const t of ['CHE', 'CHA']) {
            if (alive(ctx, t)) setOpinion(ctx, t, 'ROM', -40);
          }
          stir(ctx, ['Teutoburgium', 'Chatti'], {
            id: 'the_winter_camps', name: 'The Winter Camps', months: 36,
            effects: { unrest: 1 },
          });
          h.setFlag(ctx, 'drususElbe', true);
          h.chronicle(ctx, 'era', 'Drusus reaches the Elbe and dies of a fall on the way home; Germania looks won, and the hostage boys go to Rome to be educated.');
        }),
      },
    ],
  },

  // ── W8 · 9 ────────────────────────────────────────────────────────────────
  {
    id: 'ev5_w_teutoburg',
    title: 'Quinctilius Varus, Give Back the Legions',
    worldLabel: 'Arminius destroys three legions in the Teutoburg forest',
    desc: 'Quinctilius Varus — lately governor of Syria, where he crucified two '
      + 'thousand Judaeans after Herod\'s death, a man whose method is the tax '
      + 'roll and the assize — governs Germania as though it were a province, '
      + 'because he has been told it is one. His chief native adviser is Arminius '
      + 'of the Cherusci: Roman citizen, equestrian, decorated commander of '
      + 'auxiliaries, and the author of the report of a small rising off the line '
      + 'of march that pulls three legions into the wet country between the hills. '
      + 'Segestes, Arminius\'s own father-in-law, names the plot at Varus\'s table '
      + 'the night before; Varus prefers his paperwork. Three days of rain and '
      + 'ambush in the Teutoburg do the rest: legions XVII, XVIII and XIX cease '
      + 'to exist, their numbers never enrolled again, their eagles gone into '
      + 'the groves of gods Rome has no treaty with. Varus falls on his sword; '
      + 'the head travels. Augustus, seventy-one, lets his hair and beard grow '
      + 'for months and is heard at doorframes: Quinctilius Varus, give me back '
      + 'my legions. The Rhine, not the Elbe, will be the border for the next '
      + 'four hundred years — the first line on the map the empire has ever '
      + 'drawn by subtraction.',
    forTag: 'both',
    decider: 'CHE',
    date: { y: 9, m: 9 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Arminius destroyed legions XVII, XVIII and XIX in the Teutoburg in September 9 CE; the numbers were never used again, and the frontier settled on the Rhine.',
    options: [
      {
        label: 'The eagles go into the groves',
        tooltip: 'Rome −8,000 manpower, −10 legitimacy, and "The Ghost Legions" (−8% manpower for 120 months) — three numbers are struck from the army list forever. The Cherusci seat Arminius as war-king: +15 martial points, +10 legitimacy, and "The Liberator" (+5% discipline permanently).',
        effects: guard('ev5_w_teutoburg:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { manpower: -8000, legitimacy: -10 });
            h.addTagModifier(ctx, 'ROM', {
              id: 'ghost_legions', name: 'The Ghost Legions', months: 120,
              effects: { manpowerMult: 0.92 },
            });
          }
          if (alive(ctx, 'CHE')) {
            h.setRuler(ctx, 'CHE', { name: 'Arminius', title: 'War-King of the Cherusci', gov: 2, infl: 3, mar: 5, age: 27 });
            h.adjust(ctx, 'CHE', { mar: 15, legitimacy: 10 });
            h.addTagModifier(ctx, 'CHE', {
              id: 'the_liberator', name: 'The Liberator', months: -1,
              effects: { disciplineMult: 1.05 },
            });
          }
          h.setFlag(ctx, 'teutoburg', true);
          h.chronicle(ctx, 'era', 'Three legions cease to exist in the Teutoburg and their numbers are never used again; the empire draws its first border by subtraction.');
        }),
      },
    ],
  },
];
