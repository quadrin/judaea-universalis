// Judaea Universalis — the West comes apart, 395–439 (SPEC §238).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// The chapter runs to 430, which means it runs straight through the one
// political event of late antiquity that everybody knows the name of and the
// map had no way of showing: the Roman Empire stops being one country.
//
// §235 shipped that as a modifier and a chronicle line — "The Halves Apart",
// −10% manpower — and the map went on painting one Rome from the Clyde to the
// Euphrates until 430. This package makes it happen ON the map, because a
// chapter whose whole argument is that the fourth century is a different
// world from the second cannot ask the player to take that on trust while the
// political layer says otherwise.
//
// Five courts come out of Rome here, none of them invented:
//
//   395  BYZ  the Eastern Empire — Arcadius at Constantinople, and from this
//             month the empire the Galilee is actually dealing with
//   410  BRT  the Britons — the rescript telling the cities to look to their
//             own defence, which is the only formal end Roman Britain got
//   411  VAN  the Vandals and Alans in Spain, by the lot the sources say they
//             drew for it
//   413  BGD  the Burgundians on the Rhine
//   418  VIS  the Visigoths in Aquitaine — settled by treaty, on Roman soil,
//             paid in Roman grain, and never again under Roman government
//
// …and then the same Vandals take Africa (429) and Carthage (439), which is
// the moment the West stops being able to feed itself.
//
// What this package deliberately does NOT do: invent a Hunnic tag (Attila is
// 434–453 and the frame has no court for him), move the Sueves into Gallaecia
// (SUE is seated as the Alamanni in this chapter and renaming the Rhine
// confederation to fit a Spanish province would be a worse lie than leaving
// the northwest Vandal), or touch the East. The East does not collapse. That
// is the entire point of the East, and of the two chapters that come after.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_351ce_collapse] ' + key, e || '');
}

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

function mod(ctx, tag, id, name, effects, months) {
  if (!alive(ctx, tag)) return;
  ctx.helpers.addTagModifier(ctx, tag, {
    id, name, months: Number.isFinite(months) ? months : -1, effects,
  });
}

// Ground that changes hands without a siege. `secedeTag` is the primitive for
// a court that did not exist a minute ago; this is for one that already does —
// the Vandals crossing to Africa are not seceding from anything, they are
// arriving. Only what Rome still holds moves: a province the player took in
// 380 is the player's, and the fifth century may have it back off them.
function handOver(ctx, names, from, to) {
  const g = ctx.game;
  const moved = [];
  for (const name of names) {
    const p = ctx.prov && ctx.prov(name);
    if (!p || p.impassable || p.owner !== from) continue;
    p.owner = to;
    if (p.controller === from) p.controller = to;
    if (p.siege && p.siege.by === from) p.siege = null;
    if (p.conversion && p.conversion.by === from) p.conversion = null;
    if (p.integrating && p.integrating.by === from) p.integrating = null;
    moved.push(name);
  }
  for (const a of Object.values(g.armies || {})) {
    if (!a || a.tag !== from) continue;
    const p = g.provinces[a.prov];
    if (p && p.owner === to) a.tag = to;
  }
  if (moved.length && ctx.bus) ctx.bus.emit('provinceOwner', {});
  return moved;
}

// A court that arrives on the map mid-century needs somebody to have it. The
// tags below are all defined and none of them is seated in 351, so the first
// card that needs one creates it — but a campaign in which Rome has already
// lost the ground (the player took Egypt, the Persians took Syria) must not
// spawn a kingdom on nothing, and `secedeTag` returns null when there is no
// province left to stand on. Every caller checks.
function arrive(ctx, tag, opts) {
  try { return ctx.helpers.secedeTag(ctx, 'ROM', tag, opts) || null; } catch (e) {
    warnOnce('arrive:' + tag, e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// The prefectures of Arcadius, as the division of January 395 drew them:
// Oriens, Aegyptus, Asiana and Pontica, Thracia, and the eastern half of
// Illyricum — the dioceses of Macedonia and Dacia. Pannonia, Dalmatia and
// Noricum stayed western and are not on this list, which is why Stilicho
// spends the next twelve years arguing about them.
const THE_EAST = [
  // Oriens: Palestine, Phoenicia, Syria, Mesopotamia, Arabia, Cyprus, Cilicia
  'Jerusalem', 'Jericho', 'Emmaus', 'Lydda', 'Joppa', 'Engaddi', 'Gadora',
  'Tiberias', 'Gaza', 'Ascalon', 'Azotus', 'Jamnia', 'Hebron', 'Adora',
  'Sebaste', 'Neapolis', 'Antipatris', 'Caesarea Maritima', 'Dora',
  'Ptolemais', 'Scythopolis', 'Pella', 'Gadara', 'Gerasa', 'Philadelphia',
  'Caesarea Philippi', 'Batanea', 'Tyre', 'Sidon', 'Berytus', 'Byblos',
  'Tripolis', 'Aradus', 'Damascus', 'Chalcis', 'Emesa', 'Apamea', 'Antioch',
  'Seleucia Pieria', 'Laodicea', 'Beroea', 'Cyrrhus', 'Palmyra', 'Zeugma',
  'Samosata', 'Edessa', 'Carrhae', 'Nisibis', 'Singara', 'Amida',
  'Petra', 'Bostra', 'Oboda', 'Aila', 'Hegra', 'Dumatha', 'Medaba',
  'Salamis', 'Paphos', 'Tarsus', 'Seleucia Trachea',
  // Aegyptus, with the two Libyas
  'Pelusium', 'Rhinocolura', 'Alexandria', 'Athribis', 'Leontopolis',
  'Memphis', 'Arsinoe', 'Oxyrhynchus', 'Thebes', 'Myos Hormos', 'Syene',
  'Berenice', 'Cyrene', 'Marmarica', 'Paraetonium',
  // Asiana and Pontica
  'Iconium', 'Tyana', 'Pisidia', 'Attalia', 'Caesarea Mazaca', 'Melitene',
  'Smyrna', 'Halicarnassus', 'Rhodes', 'Nicaea', 'Ancyra', 'Sinope',
  'Trapezus', 'Phasis',
  // Thracia, and Illyricum orientale — Macedonia and Dacia
  'Byzantion', 'Hadrianopolis', 'Philippopolis', 'Novae', 'Tomis',
  'Thessalonica', 'Dyrrhachium', 'Corinth', 'Athens', 'Sparta', 'Gortyn',
  'Naissus', 'Serdica', 'Singidunum',
];

// The lot drawn in Spain in 411 (Hydatius): Baetica and Lusitania to the
// Silings and the Alans, Gallaecia shared with the Sueves, Carthaginiensis
// overrun. Rome kept Tarraconensis, which is why the Ebro is where every
// fifth-century western campaign starts.
const HISPANIA = [
  'Hispalis', 'Corduba', 'Malaca', 'Gades', 'Emerita', 'Olisipo',
  'Carthago Nova', 'Toletum', 'Bracara', 'Asturica', 'Salmantica',
];
const MAURETANIA = [
  'Tingis', 'Sala', 'Volubilis', 'Atlas', 'Caesarea Mauretaniae',
  'Portus Magnus', 'Icosium', 'Saldae',
];
const AFRICA_PROCONSULARIS = [
  'Carthago', 'Hadrumetum', 'Thysdrus', 'Tacape', 'Capsa', 'Theveste',
  'Hippo Regius', 'Cirta',
];

// The quarrel goes with the ground (SPEC §238). Arcadius inherits Palestine
// and therefore inherits every argument about it; Honorius, ten years old in
// Milan, will never in his life send a soldier past the Adriatic. So a war
// Rome is fighting against a court of the East changes hands with the
// provinces — otherwise the division would hand the player a peace with the
// half that holds nothing they want and a neighbour they are not at war with.
const EASTERN_COURTS = ['JUD', 'SAS', 'ARM'];
function handOverEasternWars(ctx, from, to) {
  const g = ctx.game;
  const eastern = new Set(EASTERN_COURTS.map((t) => who(ctx, t)));
  let moved = 0;
  for (const w of g.wars || []) {
    if (!w) continue;
    const att = w.attackers || [];
    const def = w.defenders || [];
    const romeAttacks = att.indexOf(from) !== -1;
    if (!romeAttacks && def.indexOf(from) === -1) continue;
    const otherSide = romeAttacks ? def : att;
    if (!otherSide.some((t) => eastern.has(t))) continue; // a western war stays west
    const side = romeAttacks ? w.attackers : w.defenders;
    const i = side.indexOf(from);
    if (i >= 0) side[i] = to;
    if (w.warscore && Number.isFinite(w.warscore[from])) {
      w.warscore[to] = w.warscore[from];
      delete w.warscore[from];
    }
    for (const enemy of otherSide) {
      const e = g.tags[enemy];
      if (!e) continue;
      const j = (e.atWarWith || []).indexOf(from);
      if (j >= 0) e.atWarWith[j] = to;
      const child = g.tags[to];
      if (child && (child.atWarWith || []).indexOf(enemy) < 0) child.atWarWith.push(enemy);
    }
    const parent = g.tags[from];
    if (parent) {
      parent.atWarWith = (parent.atWarWith || []).filter((t) => !eastern.has(t));
    }
    moved++;
  }
  return moved;
}

export const EVENTS_351_COLLAPSE = [

  // ── 395 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351w_the_division',
    title: 'The Empire Divided for the Last Time',
    worldLabel: 'Theodosius dies; the Empire is divided between his sons and never rejoined',
    desc: 'Theodosius dies at Milan in January, having ruled the whole Roman world for four '
      + 'months, and leaves it to two boys: Arcadius, eighteen, in Constantinople, and '
      + 'Honorius, ten, in Milan, each with a general behind the throne who despises the '
      + 'other. The Empire has been divided administratively a dozen times. This one is not '
      + 'repaired, and within a generation the two halves are conducting foreign policy '
      + 'against each other.\n\n'
      + 'The practical consequence for everybody east of the Adriatic is simple, and it is '
      + 'on the map from this month: the government that taxes Palestine, garrisons it, '
      + 'legislates about its Jews and answers letters from its patriarch is now a different '
      + 'state from the one that rules Italy. It has its own army, its own treasury, its own '
      + 'wars, and no way at all of calling on the West for help.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 395, m: 1 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Theodosius died on 17 January 395. The Empire was never again ruled by one man; '
      + 'the East outlived the West by a thousand and twenty-two years.',
    options: [
      {
        label: 'Two courts, two armies, one name',
        tooltip: 'The eastern prefectures leave Rome as the Eastern Empire, taking their '
          + 'garrisons, half the treasury and every war Rome is fighting in the East. Rome: '
          + '−1 stability and "The Halves Apart" (−10% manpower and −6% income, permanent).',
        effects: guard('ev351w_the_division:0', (ctx) => {
          const h = ctx.helpers;
          const east = arrive(ctx, 'BYZ', {
            provinces: THE_EAST,
            // The richer half, and everybody knew it: the East paid for the
            // West's wars for a century and stopped in this generation.
            share: 0.55,
            opinion: -20, // two courts, not yet two enemies
            stability: 1,
            legitimacy: 60,
            ruler: {
              name: 'Arcadius', title: 'Augustus of the East',
              gov: 1, infl: 2, mar: 1, age: 18,
            },
          });
          if (east) {
            handOverEasternWars(ctx, 'ROM', 'BYZ');
            mod(ctx, 'BYZ', 'the_prefectures_of_the_east', 'The Prefectures of the East',
              { incomeMult: 1.08 });
          }
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { stability: -1 });
            mod(ctx, 'ROM', 'the_halves_apart', 'The Halves Apart',
              { manpowerMult: 0.9, incomeMult: 0.94 });
          }
          h.setFlag(ctx, 'empireDivided', true);
          h.chronicle(ctx, 'era', 'Theodosius dies and the Empire is divided between two boys, '
            + 'which this time is permanent. The government of Palestine is now at '
            + 'Constantinople and answers to nobody in Italy.');
        }),
      },
    ],
  },

  // ── 407 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351c_the_rhine_crossing',
    title: 'The River Was Frozen',
    worldLabel: 'Vandals, Alans and Sueves cross the Rhine at Mainz',
    desc: 'On the last night of the year a confederation that has been pushed west by '
      + 'something worse behind it crosses the frozen Rhine near Mainz, and the frontier '
      + 'Rome has held for four hundred years is simply not there any more. There is no '
      + 'battle to record. The garrisons had been drawn down for the civil wars, and what '
      + 'was left could not have held a river bank three hundred miles long against a '
      + 'people moving with its wagons.\n\n'
      + 'They do not stop. For three years Gaul is crossed and recrossed by an army with '
      + 'nowhere to be, and the cities that survive are the ones with walls.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 407, m: 1 },
    world: true,
    aiOption: 0,
    historical: 'The crossing is dated to 31 December 406 (Prosper) or 405; Jerome\'s letter 123 '
      + 'lists the cities of Gaul that were taken.',
    options: [
      {
        label: 'Gaul is crossed, and the walls are what is left',
        tooltip: 'Rome: −15% manpower and −8% income for twenty years ("The Frontier Is Not '
          + 'There"), and the cities of Gaul carry unrest for a decade.',
        effects: guard('ev351c_the_rhine_crossing:0', (ctx) => {
          const h = ctx.helpers;
          mod(ctx, 'ROM', 'the_frontier_is_not_there', 'The Frontier Is Not There',
            { manpowerMult: 0.85, incomeMult: 0.92 }, 240);
          for (const name of ['Mogontiacum', 'Argentorate', 'Colonia Agrippina', 'Augusta Treverorum',
            'Durocortorum', 'Lutetia', 'Tolosa', 'Burdigala']) {
            const p = ctx.prov && ctx.prov(name);
            if (!p) continue;
            h.addProvinceModifier(ctx, name, {
              id: 'the_crossing', name: 'The Crossing', months: 120,
              effects: { unrest: 2, taxMult: 0.75 },
            });
          }
          h.setFlag(ctx, 'rhineCrossed', true);
          h.chronicle(ctx, 'era', 'The Rhine freezes and a whole people walks across it; there is '
            + 'no battle, because there was nothing there to fight.');
        }),
      },
    ],
  },

  // ── 410 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351c_britain_looks_to_itself',
    title: 'The Cities Are Told to Look to Their Own Defence',
    worldLabel: 'Honorius tells the British cities to see to themselves; Roman Britain ends',
    desc: 'The army in Britain has proclaimed three emperors in four years and the last of '
      + 'them took the garrison to Gaul and lost it there. When the British cities write to '
      + 'Honorius asking what is to be done about the raiders, the answer — one sentence in '
      + 'Zosimus, and the only formal end Roman Britain ever gets — is that they should see '
      + 'to their own defence.\n\n'
      + 'No treaty is signed and no province is ceded. The diocese simply stops being '
      + 'administered, and within a generation the men who run it are calling themselves '
      + 'kings in a language Rome never taught them.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 410, m: 4 },
    world: true,
    aiOption: 0,
    historical: 'Zosimus VI.10.2, under 410. Britain was never reoccupied.',
    options: [
      {
        label: 'See to yourselves',
        tooltip: 'Britain leaves the Empire as the Britons. Rome: −1 stability.',
        effects: guard('ev351c_britain_looks_to_itself:0', (ctx) => {
          const h = ctx.helpers;
          const brt = arrive(ctx, 'BRT', {
            provinces: ['Britannia'],
            share: 0.02,
            opinion: 0, // nobody was angry; nobody was consulted
            stability: 0,
            legitimacy: 40,
            ruler: { name: 'The Councils of the Cities', title: 'Council', gov: 2, infl: 1, mar: 2, age: 50 },
          });
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { stability: -1 });
          h.setFlag(ctx, 'britainLeft', true);
          h.chronicle(ctx, 'era', brt
            ? 'Honorius tells the cities of Britain to see to their own defence, and they do, '
              + 'for four hundred years, in Latin at first.'
            : 'Britain is told to see to its own defence; there is no longer any Roman '
              + 'government there to notice.');
        }),
      },
    ],
  },

  // ── 411 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351c_the_lot_in_spain',
    title: 'They Drew Lots for the Provinces',
    worldLabel: 'The Vandals and Alans divide Spain by lot',
    desc: 'Two years after crossing the Pyrenees the newcomers stop moving and divide Spain '
      + 'between them — by lot, says Hydatius, who was there and became a bishop in the part '
      + 'the Sueves got. The Silings take Baetica, the Alans take Lusitania and '
      + 'Carthaginiensis, the Hasdings and the Sueves share the northwest.\n\n'
      + 'What makes it different from a raid is what happens next: they collect the taxes. '
      + 'The provincials, Hydatius says, submit to the barbarian lords who hold the cities, '
      + 'and prefer them to the tax collectors of the emperor. Rome keeps Tarraconensis and '
      + 'the road to it, and spends the rest of the century trying to hire one of these '
      + 'peoples to destroy the others.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 411, m: 9 },
    world: true,
    aiOption: 0,
    historical: 'Hydatius, Chronicle 41-49: the division of the Spanish provinces by lot in 411.',
    options: [
      {
        label: 'The provincials prefer them to the tax collectors',
        tooltip: 'Spain outside Tarraconensis leaves the Empire as the Vandals. Rome: −8% '
          + 'income, permanent ("The Spanish Revenues Stop").',
        effects: guard('ev351c_the_lot_in_spain:0', (ctx) => {
          const h = ctx.helpers;
          const van = arrive(ctx, 'VAN', {
            provinces: HISPANIA,
            share: 0.12,
            opinion: -30,
            stability: 1,
            legitimacy: 50,
            ruler: { name: 'Gunderic', title: 'King', gov: 2, infl: 2, mar: 3, age: 32 },
          });
          if (van) {
            mod(ctx, 'VAN', 'the_lot_drawn', 'The Lot Drawn',
              { manpowerMult: 1.1, moraleMult: 1.05 });
          }
          mod(ctx, 'ROM', 'spanish_revenues_stop', 'The Spanish Revenues Stop',
            { incomeMult: 0.92 });
          h.setFlag(ctx, 'spainDivided', true);
          h.chronicle(ctx, 'era', van
            ? 'The Vandals and Alans divide Spain by lot and begin collecting the taxes, which '
              + 'is the difference between a raid and a country.'
            : 'The Vandals and Alans overrun Spain; there is nothing left of Roman Spain for '
              + 'them to divide.');
        }),
      },
    ],
  },

  // ── 413 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351c_the_burgundians_on_the_rhine',
    title: 'A Kingdom at Worms',
    worldLabel: 'The Burgundians are settled on the Rhine as federates',
    desc: 'The Burgundians, who crossed with everybody else, are given the left bank around '
      + 'Worms as federates — land, in return for soldiers — by a government that has no '
      + 'soldiers of its own to put there. It is the arrangement Rome will make over and '
      + 'over for the rest of the century, and the arithmetic of it is not complicated: each '
      + 'time, the Empire buys an army by ceasing to govern a province.\n\n'
      + 'This particular kingdom is destroyed by Huns in a generation, and the destruction '
      + 'becomes the Nibelungenlied.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 413, m: 6 },
    world: true,
    aiOption: 0,
    historical: 'The Burgundian settlement on the Rhine is dated to 413; the kingdom was destroyed '
      + 'in 436 and the survivors resettled in Sapaudia in 443.',
    options: [
      {
        label: 'Buy an army by ceasing to govern a province',
        tooltip: 'The upper Rhine leaves the Empire as Burgundy.',
        effects: guard('ev351c_the_burgundians_on_the_rhine:0', (ctx) => {
          const h = ctx.helpers;
          const bgd = arrive(ctx, 'BGD', {
            provinces: ['Mogontiacum', 'Argentorate'],
            share: 0.04,
            opinion: 10, // federates: allies on paper, and on paper it matters
            stability: 0,
            legitimacy: 45,
            ruler: { name: 'Gundahar', title: 'King', gov: 2, infl: 2, mar: 3, age: 40 },
          });
          h.setFlag(ctx, 'burgundiansSettled', true);
          h.chronicle(ctx, 'era', bgd
            ? 'The Burgundians are settled at Worms as federates: the Empire buys an army by '
              + 'ceasing to govern a province, and will do it again.'
            : 'The Burgundians are settled on a Rhine the Empire no longer holds.');
        }),
      },
    ],
  },

  // ── 418 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351c_the_federates_of_aquitaine',
    title: 'The Grain of Aquitaine',
    worldLabel: 'The Visigoths are settled in Aquitaine by treaty',
    desc: 'Eight years after they were inside Rome, the Goths are given Aquitaine — the '
      + 'richest ground in Gaul, on the Atlantic, a very long way from the Rhine they might '
      + 'have been used to defend — under a treaty that makes them federates and pays them '
      + 'in the tax grain of the province they are sitting on.\n\n'
      + 'Every element of the arrangement is temporary and none of it is ever undone. This '
      + 'is the first barbarian kingdom on Roman soil that Rome itself signed for, and the '
      + 'lawyers of Toulouse will be quoting the treaty when there is no longer a western '
      + 'emperor to quote it to.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 418, m: 1 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'The settlement of the Goths in Aquitania Secunda is dated to 418 (Prosper); the '
      + 'kingdom of Toulouse outlived the western Empire.',
    options: [
      {
        label: 'Sign it — they are on the Atlantic and not on the Rhine',
        tooltip: 'Aquitaine leaves the Empire as the Visigoths. Rome: −6% income, permanent.',
        effects: guard('ev351c_the_federates_of_aquitaine:0', (ctx) => {
          const h = ctx.helpers;
          const vis = arrive(ctx, 'VIS', {
            provinces: ['Tolosa', 'Burdigala'],
            share: 0.08,
            opinion: 10,
            stability: 1,
            legitimacy: 55,
            ruler: { name: 'Wallia', title: 'King', gov: 2, infl: 3, mar: 3, age: 45 },
          });
          if (vis) {
            mod(ctx, 'VIS', 'the_treaty_of_418', 'The Treaty of 418',
              { incomeMult: 1.08, moraleMult: 1.05 });
          }
          mod(ctx, 'ROM', 'the_grain_of_aquitaine', 'The Grain of Aquitaine',
            { incomeMult: 0.94 });
          h.setFlag(ctx, 'gothsSettled', true);
          h.chronicle(ctx, 'era', vis
            ? 'The Goths are settled in Aquitaine by treaty — the first barbarian kingdom on '
              + 'Roman soil that Rome signed for.'
            : 'The Goths are settled in an Aquitaine the Empire no longer governs.');
        }),
      },
    ],
  },

  // ── 429 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351c_the_crossing_to_africa',
    title: 'Eighty Thousand People Cross at Tangier',
    worldLabel: 'The Vandals cross to Africa',
    desc: 'The whole Vandal people — Geiseric counts them at eighty thousand, which is a '
      + 'boast and a muster roll at once — crosses the strait and starts east along the '
      + 'African coast. Africa is the one western province that has never been raided in '
      + 'living memory: no walls kept up, no field army, and the richest grain and oil '
      + 'country in the West.\n\n'
      + 'Augustine dies during the siege of his own city a year into it. He is seventy-five, '
      + 'and he has spent the last twenty years writing a book which argues, at length, that '
      + 'no earthly city is permanent.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 429, m: 5 },
    world: true,
    aiOption: 0,
    historical: 'The Vandal crossing is dated to May 429 (Prosper, Victor of Vita); Augustine died '
      + 'during the siege of Hippo in August 430.',
    options: [
      {
        label: 'There is no field army in Africa',
        tooltip: 'The Mauretanias pass to the Vandals. Rome: −6% income.',
        effects: guard('ev351c_the_crossing_to_africa:0', (ctx) => {
          const h = ctx.helpers;
          const moved = alive(ctx, 'VAN') ? handOver(ctx, MAURETANIA, 'ROM', 'VAN') : [];
          mod(ctx, 'ROM', 'the_african_shore', 'The African Shore Is Crossed',
            { incomeMult: 0.94 });
          h.setFlag(ctx, 'africaCrossed', true);
          h.chronicle(ctx, 'era', moved.length
            ? 'The Vandals cross at Tangier and start east along a coast with no field army on it.'
            : 'The Vandals cross to an Africa the Empire no longer holds.');
        }),
      },
    ],
  },

  // ── 439 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351c_carthage',
    title: 'Carthage, Without a Siege',
    worldLabel: 'The Vandals take Carthage; the West loses its grain',
    desc: 'Geiseric takes Carthage on the nineteenth of October, in peacetime, under a '
      + 'treaty, while the city is at the races. It is the second city of the western Empire '
      + 'and the port the grain fleet sails from, and with it go the revenues that paid the '
      + 'field army of Italy.\n\n'
      + 'Within two years there is a Vandal fleet in the Mediterranean, which no barbarian '
      + 'people has ever had, and the western Empire is a government in Ravenna that can no '
      + 'longer feed Rome, pay soldiers, or reach Africa. Everything after this is the '
      + 'arithmetic working itself out.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 439, m: 10 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Carthage fell on 19 October 439, in peace, four years after a treaty. The grain '
      + 'fleet never sailed for Rome again.',
    options: [
      {
        label: 'The city is at the races',
        tooltip: 'Africa Proconsularis and Numidia pass to the Vandals. Rome: −15% income and '
          + '−10% manpower, permanent ("The Grain Fleet Does Not Sail").',
        effects: guard('ev351c_carthage:0', (ctx) => {
          const h = ctx.helpers;
          const moved = alive(ctx, 'VAN') ? handOver(ctx, AFRICA_PROCONSULARIS, 'ROM', 'VAN') : [];
          if (moved.length) {
            mod(ctx, 'VAN', 'the_grain_and_the_fleet', 'The Grain and the Fleet',
              { incomeMult: 1.15, navalMult: 1.2 });
          }
          mod(ctx, 'ROM', 'the_grain_fleet_does_not_sail', 'The Grain Fleet Does Not Sail',
            { incomeMult: 0.85, manpowerMult: 0.9 });
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { stability: -1 });
          h.setFlag(ctx, 'carthageLost', true);
          h.chronicle(ctx, 'era', moved.length
            ? 'Carthage falls to the Vandals in peacetime, at the races, and the grain fleet '
              + 'never sails for Rome again.'
            : 'Carthage passes out of Roman hands, and with it the grain of the West.');
        }),
      },
    ],
  },
];
