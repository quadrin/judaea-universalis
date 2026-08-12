// Judaea Universalis — the West beside the world spine, 170–410 CE (SPEC
// §104 continued). Content package. Zero imports; all effects run through
// ctx.helpers at runtime. Concatenated onto EVENTS_132 by the era registry.
//
// The §104 world spine runs the Roman East to 425: the usurpers, Ardashir,
// the persecutions, the councils and the laws. What it watches from the
// corner of its eye and never turns to face is the other frontier — the one
// that actually killed the empire the spine's last cards inhabit. Between
// the Antonine plague and the abolition of the patriarchate, the West lost
// the Marcomannic wars' illusions, an emperor to the Goths in a marsh, '
// Athens to a sea raid, Dacia by evacuation, Britain to an admiral with
// accounting problems, a field army at Adrianople, the Rhine on a frozen
// New Year's Eve, and Rome itself. A campaign that runs to the fifth
// century deserves to hear the world ending from both directions.
//
// The rule for admission is §104's: it must happen whichever way the revolt
// went. The one transfer is the evacuation of Dacia in 271 — off Rome only,
// to the Goths who actually moved in (the transfer() rule, SPEC §111) — the
// map's answer to a province the empire itself struck from the list.
//
// Source spine: Cassius Dio LXXII with Xiphilinus's scissors; Herodian;
// Dexippus's fragments for his own Athens; the Historia Augusta under
// caution for Aurelian; Panegyrici Latini VIII for Carausius as the court
// wanted him remembered; Lactantius on the tetrarchs; Ammianus XXXI, the
// best battle narrative antiquity produced, for Adrianople; Jerome's
// letters and Augustine's City of God for the year 410 as it sounded from
// Bethlehem and Hippo.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_132ce_west] ' + key, e || '');
}

// The letters this court answers to NOW (SPEC §135); see events_132ce_world.js.
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

export const EVENTS_132_WEST = [

  // ── X1 · 170 ──────────────────────────────────────────────────────────────
  {
    id: 'ev2_eu_marcomanni',
    title: 'The War Crosses the Alps',
    worldLabel: 'The Marcomanni besiege Aquileia; barbarians in Italy',
    desc: 'The plague the army brought home from Seleucia has thinned the Danube '
      + 'garrisons to paper, and the peoples beyond the river — Marcomanni and '
      + 'Quadi at the front, pushed by peoples pushed by peoples, in a chain '
      + 'nobody at Rome can see the far end of — come over it in strength. They '
      + 'destroy a Roman force twenty thousand strong, burn Opitergium, and lay '
      + 'siege to Aquileia at the head of the Adriatic: the first foreign army in '
      + 'Italy since the Cimbri, two hundred and seventy years ago, and the '
      + 'philosopher-emperor auctions the palace furniture in the Forum to pay '
      + 'for the war rather than raise the taxes — a gesture, and understood as '
      + 'one, but the gesture of a state that has stopped pretending. Marcus '
      + 'Aurelius will spend most of what remains of his life in a winter camp '
      + 'on that river, writing Greek to himself about how none of this touches '
      + 'the soul. The frontier is never entirely quiet again.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 170, m: 5 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'The Marcomanni and Quadi broke into Italy and besieged Aquileia around 170; Marcus auctioned the palace plate and spent his remaining years on the Danube.',
    options: [
      {
        label: 'The palace plate is auctioned in the Forum',
        tooltip: 'Rome −5,000 manpower, −150 talents, and Aquileia and Ravenna carry "The War in Italy" (+2 unrest for 24 months). The Suebi +10 martial points and +100 talents of plunder — the chain of pushed peoples has reached the Alps.',
        effects: guard('ev2_eu_marcomanni:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { manpower: -5000, treasury: -150 });
          if (alive(ctx, 'SUE')) h.adjust(ctx, 'SUE', { mar: 10, treasury: 100 });
          stir(ctx, ['Aquileia', 'Ravenna'], {
            id: 'war_in_italy', name: 'The War in Italy', months: 24,
            effects: { unrest: 2 },
          });
          h.setFlag(ctx, 'marcomannicWar', true);
          h.chronicle(ctx, 'era', 'The Marcomanni besiege Aquileia — the first foreign army in Italy since the Cimbri; the emperor auctions the palace plate rather than pretend.');
        }),
      },
    ],
  },

  // ── X2 · 180 ──────────────────────────────────────────────────────────────
  {
    id: 'ev2_eu_commodus',
    title: 'The Philosopher\'s One Mistake',
    worldLabel: 'Marcus Aurelius dies at Vindobona; Commodus makes peace',
    desc: 'Marcus Aurelius dies in the camp at Vindobona, on the frontier he could '
      + 'never leave, seven days after commending his son to the army. Four good '
      + 'emperors in a row were made by adoption — chosen grown, tested first — '
      + 'and the philosopher, who wrote better than any of them about vanity and '
      + 'duty, is the one who breaks the streak for a nineteen-year-old because '
      + 'the nineteen-year-old is his. Commodus takes one look at his father\'s '
      + 'war — one more push was arguably all it needed; two new provinces were '
      + 'surveyed — and sells it: peace with the Marcomanni on subsidy terms, '
      + 'the army home by autumn, the triumph celebrated for wars other men '
      + 'froze in. The Danube holds, for now, because the tribes are as '
      + 'exhausted as the legions. What does not hold is the currency of the '
      + 'thing the Antonines actually minted — the assumption that the man in '
      + 'the purple is the most serious man in the empire. The son will fight '
      + 'as a gladiator under the family name. It takes twelve years to get '
      + 'from the camp at Vindobona to that arena, and the whole century that '
      + 'follows is downstream of the trip.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 180, m: 3 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Marcus died at Vindobona on 17 March 180; Commodus made peace on the Danube and went home to a triumph, ending the adoptive succession.',
    options: [
      {
        label: 'The son is his, so the son succeeds',
        tooltip: 'Commodus takes the purple at nineteen: Rome −1 stability, and the surveyed provinces beyond the Danube are written off. The adoptive century is over, and the auction of 193 is now on the calendar.',
        effects: guard('ev2_eu_commodus:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) {
            h.setRuler(ctx, 'ROM', { name: 'Commodus', title: 'Emperor', gov: 1, infl: 2, mar: 2, age: 19 });
            h.adjust(ctx, 'ROM', { stability: -1 });
          }
          h.setFlag(ctx, 'commodusSucceeds', true);
          h.chronicle(ctx, 'era', 'Marcus dies in the camp at Vindobona and his son sells the war for a triumph; the adoptive century ends because the nineteen-year-old was his.');
        }),
      },
    ],
  },

  // ── X3 · 251 ──────────────────────────────────────────────────────────────
  {
    id: 'ev2_eu_abritus',
    title: 'An Emperor Dies in the Marsh',
    worldLabel: 'The Goths kill Decius and his son at Abritus',
    desc: 'The emperor who ordered the whole world to sacrifice does not outlive '
      + 'his own edict by two years. Cniva\'s Goths have learned Roman war the '
      + 'way frontier peoples do — by decades of enlistment, subsidy and '
      + 'observation — and at Abritus in the Dobrudja marshes Cniva does what no '
      + 'barbarian commander has done: he out-generals an emperor, feigning '
      + 'retreat until the Roman column is committed to the wetland, then '
      + 'closing it from three sides. Decius\'s son falls first, to an arrow; '
      + 'the sources give the father a parade-ground sentence — the loss of one '
      + 'soldier is no great matter — and then the marsh takes him too, so '
      + 'completely that no body is ever found. An emperor of Rome, killed in '
      + 'battle by a foreign enemy: it has never happened, in three centuries '
      + 'of the office. The successor buys the Goths off with tribute and lets '
      + 'them keep the prisoners. Nine years later Valerian will be kneeling '
      + 'in Persia, and the two scenes together — the marsh and the mounting '
      + 'block — are the third century explaining itself to the provinces.',
    forTag: 'both',
    decider: 'GOT',
    date: { y: 251, m: 6 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Cniva destroyed the Roman army in the marshes at Abritus in June 251; Decius and Herennius died, no body was recovered, and Gallus bought peace with tribute.',
    options: [
      {
        label: 'The marsh keeps the emperor',
        tooltip: 'Rome −6,000 manpower, −10 legitimacy, and −100 talents of tribute. The Gothones +15 martial points, +100 talents, and "The Danube Tribute" (+10% income for 60 months) — the peoples beyond the river now know the office is mortal.',
        effects: guard('ev2_eu_abritus:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { manpower: -6000, legitimacy: -10, treasury: -100 });
          if (alive(ctx, 'GOT')) {
            h.adjust(ctx, 'GOT', { mar: 15, treasury: 100 });
            h.addTagModifier(ctx, 'GOT', {
              id: 'danube_tribute', name: 'The Danube Tribute', months: 60,
              effects: { incomeMult: 1.1 },
            });
          }
          h.setFlag(ctx, 'abritus', true);
          h.chronicle(ctx, 'era', 'The Goths kill Decius and his son in the marshes at Abritus — the first emperor to die in battle against a foreign enemy; his successor pays them to go home.');
        }),
      },
    ],
  },

  // ── X4 · 267 ──────────────────────────────────────────────────────────────
  {
    id: 'ev2_eu_athens_sacked',
    title: 'The Historian Takes to the Hills',
    worldLabel: 'The Herulians sack Athens; Dexippus fights back with two thousand',
    desc: 'The sea has stopped being Roman. Gothic and Herulian war bands out of '
      + 'the Black Sea have taken to boats by the hundred, and this year they '
      + 'run the Hellespont and fall on the oldest cities in the world: Athens '
      + 'is stormed and burned — the agora excavators will find this layer '
      + 'everywhere — with Corinth, Sparta and Argos after it. What Athens has '
      + 'left is a historian: Dexippus, archon and priest, who takes two '
      + 'thousand men into the rough country and cuts at the raiders from the '
      + 'woods, and then writes it up himself, speeches included, like a man '
      + 'who has read his Thucydides and knows exactly what genre he is '
      + 'standing in. The last army of classical Athens is a militia led by '
      + 'its own chronicler. The raiders leave loaded. The emperor Gallienus '
      + 'wins a battle against them on the way home and the war bands still '
      + 'winter unmolested inside the empire, because there is no longer a '
      + 'fleet to stop the next season\'s sailing, and everyone on every coast '
      + 'has understood this.',
    forTag: 'both',
    decider: 'GOT',
    date: { y: 267, m: 9 },
    world: true,
    aiOption: 0,
    historical: 'The Heruli sacked Athens in 267; Dexippus harried them from the hills with two thousand men and wrote the account himself.',
    options: [
      {
        label: 'The raiders leave loaded',
        tooltip: 'Athens, Corinth and Sparta carry "The Sea Raids" (+2 unrest, −20% tax for 60 months) and Athens loses 2 development. The Gothones +150 talents of plunder. There is no fleet to stop next season\'s sailing.',
        effects: guard('ev2_eu_athens_sacked:0', (ctx) => {
          const h = ctx.helpers;
          const p = ctx.prov && ctx.prov('Athens');
          if (p && p.dev) {
            p.dev.tax = Math.max(1, (p.dev.tax || 1) - 1);
            p.dev.prod = Math.max(1, (p.dev.prod || 1) - 1);
          }
          stir(ctx, ['Athens', 'Corinth', 'Sparta'], {
            id: 'the_sea_raids', name: 'The Sea Raids', months: 60,
            effects: { unrest: 2, taxMult: 0.8 },
          });
          if (alive(ctx, 'GOT')) h.adjust(ctx, 'GOT', { treasury: 150 });
          h.setFlag(ctx, 'herulianSack', true);
          h.chronicle(ctx, 'era', 'The Herulians burn Athens and the historian Dexippus fights them from the hills with two thousand men; the last army of classical Athens is led by its own chronicler.');
        }),
      },
    ],
  },

  // ── X5 · 271 ──────────────────────────────────────────────────────────────
  {
    id: 'ev2_eu_aurelian_walls',
    title: 'The City Builds Walls; the Empire Gives Ground',
    worldLabel: 'Aurelian walls Rome and evacuates Dacia',
    desc: 'The Juthungi get far enough into Italy this year to beat an imperial '
      + 'army at Placentia, and for a week the roads out of Rome are full. '
      + 'Aurelian answers with the two most honest decisions any emperor of the '
      + 'century makes. He walls Rome — twelve miles of brick, nineteen feet '
      + 'high, thrown up by the city guilds because the legions cannot be '
      + 'spared; the capital of the world has needed no wall for six hundred '
      + 'years, and now it does, and he says so in brick. And he evacuates '
      + 'Dacia: the province Trajan bought with two wars and a bridge is given '
      + 'up entire, garrisons, administration and whoever will leave withdrawn '
      + 'across the Danube, where a new "Dacia" is gerrymandered out of two old '
      + 'Moesian strips so that no document has to record a loss. The Goths '
      + 'move into the real one. It is the first province Rome has ever '
      + 'surrendered — the empire has now drawn two borders by subtraction, '
      + 'and the provinces that watch it happen draw the private conclusion '
      + 'provinces always draw: the center will hold the center. The edges '
      + 'are on their own account now.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 271, m: 3 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Aurelian began the walls of Rome after the Juthungic invasion of 271 and evacuated Dacia across the Danube, refounding it on paper in Moesia; the Goths took the vacated province.',
    options: [
      {
        label: 'Twelve miles of brick, and a province in exchange',
        tooltip: 'Roma carries "The Walls of Aurelian" (−1 unrest permanently). Sarmizegetusa and Napoca pass to the Gothones off Rome alone — the empire\'s first surrendered province. Rome +5 legitimacy for the wall and the honesty both.',
        effects: guard('ev2_eu_aurelian_walls:0', (ctx) => {
          const h = ctx.helpers;
          stir(ctx, ['Roma'], {
            id: 'walls_of_aurelian', name: 'The Walls of Aurelian', months: -1,
            effects: { unrest: -1 },
          });
          if (alive(ctx, 'GOT')) transfer(ctx, ['Sarmizegetusa', 'Napoca'], 'GOT', 'ROM');
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { legitimacy: 5 });
          h.setFlag(ctx, 'daciaAbandoned', true);
          h.chronicle(ctx, 'era', 'Aurelian walls Rome in brick and gives up Dacia entire; the empire has drawn its second border by subtraction, and the edges take note.');
        }),
      },
    ],
  },

  // ── X6 · 286 ──────────────────────────────────────────────────────────────
  {
    id: 'ev2_eu_carausius',
    title: 'The Admiral Keeps the Fleet',
    worldLabel: 'Carausius proclaims himself emperor in Britain',
    desc: 'Carausius — a Menapian riverboat pilot risen to command of the Channel '
      + 'fleet against the Saxon raiders — develops an accounting problem: the '
      + 'plunder he recovers from the pirates has a way of not reaching the '
      + 'treasury, and the suspicion at court is that he lets the raids happen '
      + 'and taxes the proceeds. Sentenced to death in absentia, he answers '
      + 'with the fleet itself: Britain and the Gallic coast declare him '
      + 'emperor, and for seven years there is a Roman empire of the Channel, '
      + 'with London mints striking excellent coin — better silver than the '
      + 'legitimate empire\'s, a point his coinage makes loudly — bearing '
      + 'legends like RESTITUTOR BRITANNIAE and, in the boldest stroke of '
      + 'political brass in the century, CARAUSIUS ET FRATRES SUI: Carausius '
      + 'and his brothers, meaning Diocletian and Maximian, who have '
      + 'conspicuously not been consulted about the kinship. The college '
      + 'swallows it until Constantius is ready; then the brother is removed '
      + 'from the family. But the demonstration stands for anyone with a '
      + 'coast: a fleet is a country, if its admiral decides it is.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 286, m: 7 },
    world: true,
    aiOption: 0,
    historical: 'Carausius took Britain and the Channel with the fleet in 286 and struck coin naming the emperors his brothers; Constantius ended the secession in 296.',
    options: [
      {
        label: 'Carausius and his brothers',
        tooltip: 'Rome −10% naval power for 84 months ("The Lost Fleet") and −5 legitimacy; Britannia and Gesoriacum carry "The Empire of the Channel" (+2 unrest for 84 months). The coin is better silver than the legitimate mints\', and everyone weighs it.',
        effects: guard('ev2_eu_carausius:0', (ctx) => {
          const h = ctx.helpers;
          // The first British state (SPEC §239): a fleet commander who was
          // about to be executed for keeping the pirates' takings declares
          // himself Augustus instead, and holds Britain and the Channel port
          // for seven years because Rome has no navy to argue with. The
          // island goes off the imperial map until the tetrarchy comes for it.
          const carausius = h.secedeTag(ctx, 'ROM', 'USR', {
            provinces: ['Britannia', 'Gesoriacum'],
            share: 0.05,
            name: 'The British Empire of Carausius',
            color: [86, 132, 140],
            opinion: -150,
            stability: 1,
            legitimacy: 40,
            ruler: { name: 'Carausius', title: 'Augustus', gov: 2, infl: 3, mar: 3, age: 45 },
          });
          if (carausius) {
            h.declareWar(ctx, 'ROM', 'USR', 'The British Secession');
            h.addTagModifier(ctx, 'USR', {
              id: 'the_fleet_of_the_channel', name: 'The Fleet of the Channel', months: -1,
              effects: { navalMult: 1.25, moraleMult: 1.05 },
            });
          }
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { legitimacy: -5 });
            h.addTagModifier(ctx, 'ROM', {
              id: 'the_lost_fleet', name: 'The Lost Fleet', months: 84,
              effects: { navalMult: 0.9 },
            });
          }
          stir(ctx, ['Britannia', 'Gesoriacum'], {
            id: 'empire_of_the_channel', name: 'The Empire of the Channel', months: 84,
            effects: { unrest: 2 },
          });
          h.setFlag(ctx, 'carausius', true);
          h.chronicle(ctx, 'era', 'The admiral of the Channel fleet proclaims himself emperor in Britain and strikes better silver than Rome; a fleet is a country, if its admiral decides it is.');
        }),
      },
    ],
  },

  // ── X7 · 293 ──────────────────────────────────────────────────────────────
  {
    id: 'ev2_eu_tetrarchy',
    title: 'Four Emperors, On Purpose',
    worldLabel: 'Diocletian completes the tetrarchy; the empire is quartered',
    desc: 'The century\'s disease has been emperors made by armies, one frontier '
      + 'at a time; Diocletian\'s cure is to prescribe the disease in a '
      + 'controlled dose. Two Augusti, two Caesars, each with a frontier, an '
      + 'army and a capital — and none of the capitals is Rome. Nicomedia, '
      + 'Milan, Trier, Sirmium: the court is wherever the emperor\'s travelling '
      + 'city pitches, and the old capital keeps the Senate, the games and the '
      + 'grain dole, a museum the government visits. The system is held '
      + 'together by arranged marriages, shared titles and Diocletian\'s '
      + 'personal gravity, and it does what nothing else in a hundred years '
      + 'has done: gives the empire twenty years without a successful '
      + 'usurpation, recovers Britain, breaks the Persians. Whether it is a '
      + 'constitution or a truce depends on a question nobody asks aloud — '
      + 'what happens when the man who invented it lets go — and the answer, '
      + 'delivered at Carnuntum and after, is that it was a truce. But the '
      + 'other half survives everything: the emperor is now a college, the '
      + 'capital is now a tent, and Rome has become a place the empire is '
      + 'from, not a place it is.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 293, m: 3 },
    world: true,
    aiOption: 0,
    historical: 'Constantius and Galerius were made Caesars in March 293, completing the tetrarchy; the capitals were Nicomedia, Milan, Trier and Sirmium, and Rome was none of them.',
    options: [
      {
        label: 'The capital is a tent',
        tooltip: 'Rome +1 stability, +5 legitimacy, and "The Tetrarchic Order" (−10% administrative costs for 240 months). Mediolanum, Sirmium and Nicaea carry "The Travelling Court" (+10% tax for 120 months) — the government is wherever it pitches.',
        effects: guard('ev2_eu_tetrarchy:0', (ctx) => {
          const h = ctx.helpers;
          // …and the quartered empire is what finally has enough Caesars to
          // spare one for Britain (SPEC §239). Constantius takes Boulogne the
          // year he is appointed and the island three years later; the court
          // goes with the men who ran it.
          if (ctx.game.tags.USR) {
            h.dissolveTag(ctx, 'USR', 'ROM', {
              chronicle: 'Carausius is murdered by his own treasurer and the island is taken '
                + 'back by a Caesar the new system had to spare; Britain is Roman again.',
            });
          }
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { stability: 1, legitimacy: 5 });
            h.addTagModifier(ctx, 'ROM', {
              id: 'tetrarchic_order', name: 'The Tetrarchic Order', months: 240,
              effects: { adminMult: 0.9 },
            });
          }
          stir(ctx, ['Mediolanum', 'Sirmium', 'Nicaea'], {
            id: 'travelling_court', name: 'The Travelling Court', months: 120,
            effects: { taxMult: 1.1 },
          });
          h.setFlag(ctx, 'tetrarchy', true);
          h.chronicle(ctx, 'era', 'Diocletian quarters the empire between four colleagues and none of the capitals is Rome; the emperor is a college now, and the capital is a tent.');
        }),
      },
    ],
  },

  // ── X8 · 330 ──────────────────────────────────────────────────────────────
  {
    id: 'ev2_eu_constantinople',
    title: 'New Rome',
    worldLabel: 'Constantine dedicates Constantinople on the Bosporus',
    desc: 'On the eleventh of May the city is dedicated: Byzantium refounded as '
      + 'Constantinople, New Rome, with a senate of its own, a grain fleet of '
      + 'its own diverted from Egypt, seven hills counted with some generosity, '
      + 'and free bread for whoever moves in. Constantine has been collecting '
      + 'the classical world\'s statuary to furnish it — the Serpent Column '
      + 'from Delphi stands in the hippodrome, which is one way to summarize '
      + 'the new management\'s relationship to the old gods. The strategic '
      + 'arithmetic is unarguable: the empire\'s money, its recruits and both '
      + 'of its dangerous frontiers are in the East, and a capital on the '
      + 'Bosporus sits between the Danube and Persia like a hand on two '
      + 'sword-hilts. For the provinces of the East the change is physical: '
      + 'the court, the appeals, the favors and the confiscations are all '
      + 'suddenly ten days closer. Rome keeps its Senate and its pride. The '
      + 'younger city will keep everything else — including, for eleven '
      + 'centuries, the name of the thing that died in the West.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 330, m: 5 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Constantinople was dedicated on 11 May 330 with its own senate and grain dole; the court and the center of the empire moved permanently east.',
    options: [
      {
        label: 'A hand on two sword-hilts',
        tooltip: 'Byzantion gains +2 tax and +2 production development and Rome +5 legitimacy — the empire\'s weight moves to the Bosporus. Roma carries "The Museum Capital" (+1 unrest for 60 months) as the court, the appeals and the favors all leave.',
        effects: guard('ev2_eu_constantinople:0', (ctx) => {
          const h = ctx.helpers;
          const p = ctx.prov && ctx.prov('Byzantion');
          if (p && p.dev) {
            p.dev.tax = (p.dev.tax || 1) + 2;
            p.dev.prod = (p.dev.prod || 1) + 2;
          }
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { legitimacy: 5 });
          stir(ctx, ['Roma'], {
            id: 'museum_capital', name: 'The Museum Capital', months: 60,
            effects: { unrest: 1 },
          });
          h.setFlag(ctx, 'constantinopleFounded', true);
          h.chronicle(ctx, 'era', 'Constantinople is dedicated on the Bosporus with a senate and a grain fleet of its own; Rome becomes a place the empire is from.');
        }),
      },
    ],
  },

  // ── X9 · 357 ──────────────────────────────────────────────────────────────
  {
    id: 'ev2_eu_argentoratum',
    title: 'The Bookish Cousin Wins a Battle',
    worldLabel: 'Julian breaks the Alamanni at Argentoratum',
    desc: 'The Caesar Julian was sent to Gaul to be a signature — a member of the '
      + 'dynasty in the west while the real war ran in the east, a student of '
      + 'philosophy with a beard the court laughed at, expected to preside and '
      + 'fail. Instead, at Argentoratum on the Rhine, with thirteen thousand '
      + 'men against Chnodomar\'s thirty-five thousand Alamanni, he wins the '
      + 'cleanest Roman victory in a generation: the German rush breaks on the '
      + 'infantry line, the king is taken alive under a heap of his bodyguard, '
      + 'and the sources put the Roman dead in the low hundreds. Julian then '
      + 'crosses the Rhine three times, rebuilds the granary forts, and cuts '
      + 'taxes in Gaul by more than half while paying for all of it, which '
      + 'frightens the treasury officials more than the Alamanni did. The '
      + 'court\'s problem is now the opposite one: the signature has become a '
      + 'general, the general is beloved, and beloved generals with '
      + 'philosophical convictions are exactly how this dynasty got started. '
      + 'What he does with it — and what he tries to build in Jerusalem — is '
      + 'six years away.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 357, m: 8 },
    world: true,
    aiOption: 0,
    historical: 'Julian broke Chnodomar\'s Alamanni at Argentoratum in August 357 with thirteen thousand men; he restored the Rhine forts and halved Gaul\'s taxation.',
    options: [
      {
        label: 'The king is taken under his bodyguard',
        tooltip: 'Rome +10 martial points. The Suebi −2,000 manpower and −40 opinion of Rome; Argentorate carries "The Granary Forts Rebuilt" (−1 unrest for 60 months). The court has a new problem: the signature became a general.',
        effects: guard('ev2_eu_argentoratum:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { mar: 10 });
          if (alive(ctx, 'SUE')) {
            h.adjust(ctx, 'SUE', { manpower: -2000 });
            const tt = ctx.game.tags[who(ctx, 'SUE')];
            if (tt) {
              if (!tt.opinion || typeof tt.opinion !== 'object') tt.opinion = {};
              tt.opinion[who(ctx, 'ROM')] = Math.max(-200, (tt.opinion[who(ctx, 'ROM')] || 0) - 40);
            }
          }
          stir(ctx, ['Argentorate'], {
            id: 'granary_forts', name: 'The Granary Forts Rebuilt', months: 60,
            effects: { unrest: -1 },
          });
          h.setFlag(ctx, 'argentoratum', true);
          h.chronicle(ctx, 'era', 'Julian breaks the Alamanni at Argentoratum with thirteen thousand men; the signature the court sent to Gaul has become a general.');
        }),
      },
    ],
  },

  // ── X10 · 378 ─────────────────────────────────────────────────────────────
  {
    id: 'ev2_eu_adrianople',
    title: 'The Field Army Dies in an Afternoon',
    worldLabel: 'The Goths destroy Valens and the eastern army at Adrianople',
    desc: 'Two years ago the Goths came to the Danube not as raiders but as '
      + 'refugees — a whole people pushed off their land by the Huns, asking '
      + 'admission. The empire said yes, for the recruits, and then its border '
      + 'officials starved them at the crossing points and sold them dog meat '
      + 'at the price of their children. The battle is the invoice. At '
      + 'Adrianople, on an August afternoon, the emperor Valens — declining to '
      + 'wait for his nephew\'s western army because he wanted the victory '
      + 'undivided — attacks the Gothic wagon ring with the whole eastern '
      + 'field army, and the Gothic cavalry, returning from forage, takes it '
      + 'in the flank and folds it up. Ammianus, a soldier, closes his history '
      + 'with it and reaches for the only comparison Rome has: not since '
      + 'Cannae. Two-thirds of the army of the East is dead by dark, Valens\'s '
      + 'body never found — burned, one story says, in a farmhouse where he '
      + 'lay wounded, which even Ammianus tells at arm\'s length. The '
      + 'difference from Cannae is the one that matters: after Cannae, Rome '
      + 'raised new legions. After Adrianople, it hires the Goths.',
    forTag: 'both',
    decider: 'GOT',
    date: { y: 378, m: 8 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Valens attacked the Gothic laager at Adrianople on 9 August 378 without waiting for the West; two-thirds of the eastern field army died with him, and the settlement of 382 enrolled the Goths entire.',
    options: [
      {
        label: 'After this, Rome hires them',
        tooltip: 'Rome −12,000 manpower, −10 legitimacy, and "The Lost Field Army" (−8% morale, −10% manpower for 120 months). The Gothones +15 martial points, +10 legitimacy, and "Inside the River" permanently (+10% manpower). Hadrianopolis, Serdica and Philippopolis carry "The Goths in Thrace" (+2 unrest for 60 months).',
        effects: guard('ev2_eu_adrianople:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { manpower: -12000, legitimacy: -10 });
            h.addTagModifier(ctx, 'ROM', {
              id: 'lost_field_army', name: 'The Lost Field Army', months: 120,
              effects: { moraleMult: 0.92, manpowerMult: 0.9 },
            });
          }
          if (alive(ctx, 'GOT')) {
            h.adjust(ctx, 'GOT', { mar: 15, legitimacy: 10 });
            h.addTagModifier(ctx, 'GOT', {
              id: 'inside_the_river', name: 'Inside the River', months: -1,
              effects: { manpowerMult: 1.1 },
            });
          }
          stir(ctx, ['Hadrianopolis', 'Serdica', 'Philippopolis'], {
            id: 'goths_in_thrace', name: 'The Goths in Thrace', months: 60,
            effects: { unrest: 2 },
          });
          h.setFlag(ctx, 'adrianople', true);
          h.chronicle(ctx, 'era', 'The eastern field army dies at Adrianople in an afternoon — not since Cannae; after Cannae Rome raised legions, and after this it hires the Goths.');
        }),
      },
    ],
  },

  // ── X11 · 406 ─────────────────────────────────────────────────────────────
  {
    id: 'ev2_eu_rhine_crossing',
    title: 'The River Freezes on the Last Night of the Year',
    worldLabel: 'Vandals, Alans and Suebi cross the frozen Rhine',
    desc: 'On the last night of the year the Rhine is ice at Mogontiacum, and '
      + 'three nations cross it together — Vandals, Alans, Suebi, wagons and '
      + 'all, the treasury of a frontier four hundred years old spent in one '
      + 'night. There is almost nothing on the bank to meet them; the field '
      + 'army of Gaul went to Italy years ago to guard against the Goths, and '
      + 'the usurper of the month is assembling his own bid in Britain. The '
      + 'letters that survive from the next three years are an inventory of '
      + 'burning: Mainz taken, Trier taken twice, the cities of the interior '
      + 'learning what walls are for. Jerome, cataloguing the fallen towns '
      + 'from his cell in Bethlehem, reaches for Virgil because nothing in '
      + 'his own century will serve. The three nations are not conquering; '
      + 'they are moving, the way the Cimbri moved, the way the Goths moved '
      + '— the whole apparatus of the steppe pushing peoples through the '
      + 'empire\'s wall and out the far side, into Spain within three years, '
      + 'Africa within a generation. The frontier is not breached. It is '
      + 'over.',
    forTag: 'both',
    decider: 'SUE',
    date: { y: 406, m: 12 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'The Vandals, Alans and Suebi crossed the frozen Rhine at Mogontiacum on 31 December 406; Gaul burned for three years and the migrations reached Spain by 409.',
    options: [
      {
        label: 'Wagons on the ice',
        tooltip: 'Mogontiacum, Augusta Treverorum, Lutetia and Burdigala carry "The Broken Limes" (+3 unrest, −20% tax for 60 months); Rome −10% manpower for 120 months ("The Lost West") and −10 legitimacy. The Suebi +10 martial points — the long march west has begun.',
        effects: guard('ev2_eu_rhine_crossing:0', (ctx) => {
          const h = ctx.helpers;
          stir(ctx, ['Mogontiacum', 'Augusta Treverorum', 'Lutetia', 'Burdigala'], {
            id: 'the_broken_limes', name: 'The Broken Limes', months: 60,
            effects: { unrest: 3, taxMult: 0.8 },
          });
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { legitimacy: -10 });
            h.addTagModifier(ctx, 'ROM', {
              id: 'the_lost_west', name: 'The Lost West', months: 120,
              effects: { manpowerMult: 0.9 },
            });
          }
          if (alive(ctx, 'SUE')) h.adjust(ctx, 'SUE', { mar: 10 });
          h.setFlag(ctx, 'rhineCrossing', true);
          h.chronicle(ctx, 'era', 'Three nations cross the frozen Rhine on the last night of 406; the frontier of four hundred years is not breached — it is over.');
        }),
      },
    ],
  },

  // ── X12 · 410 ─────────────────────────────────────────────────────────────
  {
    id: 'ev2_eu_alaric',
    title: 'The City Is Taken',
    worldLabel: 'Alaric\'s Goths sack Rome',
    desc: 'Alaric did not particularly want to sack Rome; he wanted a province '
      + 'for his people and a Roman generalship for himself, and he besieged '
      + 'the city three times waiting for a court hiding in the marshes of '
      + 'Ravenna to negotiate like adults. On the third occasion somebody '
      + 'opened the Salarian Gate at night. Three days, and by the standards '
      + 'of sacks a restrained one — the Goths are Christians of a sort, and '
      + 'the churches of Peter and Paul are declared sanctuary and honoured '
      + 'as such — but what burned was not the point. Eight hundred years '
      + 'without a foreign enemy inside the walls, and the news breaks over '
      + 'the Mediterranean like weather: Jerome in Bethlehem writes that the '
      + 'city which had taken the whole world was itself taken, and stops '
      + 'being able to work; the pagans say the old gods are avenging their '
      + 'altars; and in Hippo, Augustine sits down to answer them with the '
      + 'City of God, fourteen hundred pages of the argument that no earthly '
      + 'city was ever the point — the most consequential change of subject '
      + 'in the history of the West. In the Galilee, where Rome\'s fall has '
      + 'been prayed for annually for three centuries, the news is received '
      + 'with the composure of people who have outlived a prophecy\'s '
      + 'addressee. Alaric is dead within the year, buried, the story goes, '
      + 'under a diverted river — like Decebalus\'s gold, the century\'s '
      + 'treasures all end up under rivers — and his people march on, still '
      + 'looking for the province.',
    forTag: 'both',
    decider: 'GOT',
    date: { y: 410, m: 8 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Alaric\'s Goths entered Rome by the Salarian Gate on 24 August 410 and sacked it for three days, sparing the great churches; Jerome wrote that the city which took the world was taken.',
    options: [
      {
        label: 'Eight hundred years, and a gate opened at night',
        tooltip: 'Roma carries "The Sack of 410" (+3 unrest, −30% tax for 120 months); Rome −15 legitimacy and −1 stability. The Gothones +300 talents. The argument about what the earthly city was for has changed subject permanently.',
        effects: guard('ev2_eu_alaric:0', (ctx) => {
          const h = ctx.helpers;
          stir(ctx, ['Roma'], {
            id: 'sack_of_410', name: 'The Sack of 410', months: 120,
            effects: { unrest: 3, taxMult: 0.7 },
          });
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { legitimacy: -15, stability: -1 });
          if (alive(ctx, 'GOT')) h.adjust(ctx, 'GOT', { treasury: 300 });
          h.setFlag(ctx, 'romeSacked', true);
          h.chronicle(ctx, 'era', 'The Goths enter Rome by the Salarian Gate and sack it for three days; the city which had taken the whole world is itself taken.');
        }),
      },
    ],
  },
];
