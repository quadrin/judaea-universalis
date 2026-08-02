// js/data/political_maps.js — who rules the west, century by century
// (SPEC §173) — and, since §203, the east and the south: the same eight maps
// now also seat the courts of the ground the v7.4 frame added, from Kush and
// Aksum and the incense kingdoms to Sakastan, Margiana and the 1948 south.
//
// SPEC §160 put 133 cells on the new ground and deliberately left every one of
// them WASTE: "the base owner is what every bookmark inherits unless its
// `owners` table overrides, so shipping these as ROM would hand Rome ninety-odd
// provinces in every chapter at once." This file is the section that seam was
// waiting for. Eight political maps of the same cells, keyed by bookmark id,
// merged UNDER each chapter's own tables (js/data/compendium.js attaches them,
// js/sim/init.js reads chapter first, this file second, base atlas last) — so
// a chapter can always overrule a cell, and the base atlas stays WASTE.
//
// Latent cells inherit through `latentParent` exactly as chapter tables do, so
// 'Britannia': 'UK' answers for Londinium in 1948 without naming it.
//
// THE LEVY IS WHAT PAYS FOR IT. Unchecked, giving Rome its west in 66 CE is
// nearly +100% manpower in the one chapter Rome is the antagonist of — a
// number describing an army that never existed, because the Rhine legions were
// the reason the Rhine stayed put. Every cell this file assigns therefore
// carries a levy share — the fraction of its development its owner can
// actually draw on for the wars this game stages:
//
//   1.0  every province the eight campaigns were tuned against (no entry —
//        the old world never appears in a `levies` table)
//   0.2  governed interior: taxed, quiet, its garrison its own
//   0.1  standing frontier: the men are already spent holding the line
//
// Which band a cell sits in depends on the century — Hispania is a frontier
// in 167 BCE (two praetors fight the Celtiberians for it every summer) and an
// interior in 66 CE (one legion, mostly roads). The engine reads the share in
// exactly five places: manpower pool, force limit, tax, production, and the
// administration bill (js/sim/economy.js, js/sim/military.js) — local facts
// (supply, sieges, rebel size, peace pricing) stay physical.
//
// Three of the eight maps are historical CORRECTIONS as well as fills:
//   529: Justinian did not hold Italy, Sicily or Tripolitania in year two of
//        his reign — Belisarius sails in 533. The chapter's own owners table
//        handed him the whole west; the Ostrogoths and Vandals take it back
//        here (bookmark_529ce.js gives up those lines).
//   614: Capua was Lombard, Liguria and Sardinia were not, and the Balkans
//        behind Thessalonica were an Avar and Slav country, not a Roman one.
//   1948: Dyrrhachium, Phasis and Caucasian Albania were marked WASTE — as if
//        Albania and the Soviet Caucasus were nobody's. They were somebody's.
//
// Sources per era are cited inline. Where a people had no state (the Baltic
// amber shore in 167 BCE, the far Volga forest before the Slavs reached it),
// the cell STAYS WASTE — §160's rule stands: unowned is not uninhabited, and
// walking it takes nothing and claims nothing. A political map that invents a
// kingdom to fill a gap is lying in the one place a player can check.
//
// DOM-free, zero imports, data only.

// ---------------------------------------------------------------------------
// Region shorthands. Cells are named once here and dealt per era below.
// ---------------------------------------------------------------------------

// The Maghreb, west of the Syrtis Minor.
const AFRICA_PUNIC = ['Carthago', 'Hadrumetum', 'Thysdrus', 'Tacape'];
const AFRICA_NUMID = ['Capsa', 'Theveste', 'Hippo Regius', 'Cirta'];
const AFRICA_MASAESYLI = ['Saldae', 'Icosium', 'Caesarea Mauretaniae', 'Portus Magnus'];
const AFRICA_MOOR = ['Tingis', 'Volubilis', 'Sala', 'Atlas'];

// Hispania.
const SPAIN_ROMAN_167 = ['Gades', 'Malaca', 'Hispalis', 'Corduba', 'Carthago Nova',
  'Valentia', 'Tarraco', 'Barcino', 'Caesaraugusta'];
const SPAIN_CELTIBERIA = ['Numantia', 'Toletum'];
const SPAIN_LUSITANIA = ['Emerita', 'Salmantica', 'Olisipo'];
const SPAIN_NORTHWEST = ['Bracara', 'Asturica'];
const SPAIN_ALL = SPAIN_ROMAN_167.concat(SPAIN_CELTIBERIA, SPAIN_LUSITANIA,
  SPAIN_NORTHWEST, ['Emporiae', 'Baleares']);

// Gaul.
const GAUL_BELGICA = ['Lutetia', 'Rotomagus', 'Samarobriva', 'Gesoriacum',
  'Durocortorum', 'Augusta Treverorum', 'Colonia Agrippina', 'Mogontiacum', 'Batavia'];
const GAUL_ARMORICA = ['Condate', 'Darioritum'];
const GAUL_CENTRAL = ['Augustodunum', 'Lugdunum', 'Avaricum', 'Limonum',
  'Burdigala', 'Tolosa', 'Vesontio', 'Argentorate', 'Genava'];
const GAUL_NARBONENSIS = ['Narbo', 'Nemausus'];
const GAUL_ALL = GAUL_BELGICA.concat(GAUL_ARMORICA, GAUL_CENTRAL, GAUL_NARBONENSIS,
  ['Massilia', 'Augusta Vindelicorum', 'Virunum']);

// Italy beyond the old frame, and the Tyrrhenian islands.
const ITALY_NORTH = ['Mediolanum', 'Genua', 'Bononia', 'Ravenna', 'Pisae', 'Ancona', 'Aquileia'];
const ITALY_ISLES = ['Aleria', 'Caralis', 'Turris Libisonis'];
// The seven pre-§160 Italian cells the late chapters have to re-answer for.
const ITALY_OLD = ['Roma', 'Capua', 'Tarentum', 'Brundisium', 'Rhegium', 'Panormus', 'Syracusae'];

// The Danube, Illyricum, Thrace, Dacia.
const DANUBE_ILLYRIA = ['Salona', 'Delminium', 'Siscia'];
const DANUBE_PANNONIA = ['Carnuntum', 'Aquincum'];
const DANUBE_MOESIA = ['Sirmium', 'Singidunum', 'Novae'];
const DANUBE_THRACE = ['Serdica', 'Philippopolis']; // Naissus is Dardanian ground and dealt by name
const DACIA = ['Sarmizegetusa', 'Napoca'];

// The Pontic world.
const PONTIC_GREEK = ['Chersonesus', 'Panticapaeum', 'Phanagoria', 'Tanais'];
const PONTIC_WEST = ['Tyras', 'Olbia', 'Tomis'];
const STEPPE_NEAR = ['Tauria', 'Scythia'];
const STEPPE_FAR = ['Sarmatia', 'Roxolania', 'Aorsia'];
const FOREST_FAR = ['Borysthenia', 'Venedia', 'Rha', 'Hyperborea', 'Ripaea'];

// Germania and the north.
const GERMANIA = ['Chatti', 'Teutoburgium', 'Frisia', 'Semnones', 'Boiohaemum'];
const NORTH_SEA = ['Cimbria', 'Selandia', 'Scandia', 'Gothiscandza', 'Aestii'];

// The islands.
const BRITAIN = ['Britannia'];
const CALEDONIA = ['Caledonia'];
const HIBERNIA = ['Hibernia'];

// The eastern and southern frame (SPEC §203). Impassable wastes (the Kavir
// and Lut, the Karakum and Kyzylkum, the Rub al-Khali, the Nubian desert,
// the Sudd, the deep Sahara, the Great Forest) are never dealt, on the
// standing rule the Ustyurt and the Spanish Sahara already follow: a sealed
// waste stays WASTE in every century.
const IRAN_SE = ['Carmana', 'Harmozeia'];                  // Carmania and its harbor
const IRAN_MAKRAN = ['Tis', 'Pura', 'Makuran'];            // Gedrosia
const IRAN_SAKASTAN = ['Zranka', 'Phrada'];                // the Helmand lands
const IRAN_NE = ['Artacoana', 'Antiochia Margiana'];       // Aria and Margiana
const IRAN_PARTHYENE = ['Nisa', 'Hecatompylos'];           // Parthia proper
const NUBIA_NILE = ['Napata', 'Meroe', 'Soba', 'Dodekaschoinos'];
const AKSUM_CORE = ['Aksum', 'Adulis', 'Tana'];
const YEMEN_SABA = ['Najran', 'Marib'];
const YEMEN_HIMYAR = ['Zafar', 'Muza', 'Eudaemon Arabia'];
const HADRAMAWT = ['Shabwa', 'Moscha', 'Dioscurida'];
const OMAN_CELLS = ['Omana', 'Mazun'];
const HORN_PORTS = ['Avalites', 'Malao', 'Opone'];         // "each under its own chief" — Periplus 14
const HORN_INTERIOR = ['Danakil', 'Ogaden', 'Azania', 'Kaffa', 'Shewa'];
const SAHEL = ['Nigritae', 'Air', 'Agisymba', 'Jebel Marra', 'Noba'];
const GUINEA_W = ['Bambuk', 'Guinea Highlands', 'Kru Coast', 'Volta',
  'Niger Delta', 'Theon Ochema'];
const ARABIA_INNER = ['Macoraba', 'Asir', 'Yamama'];
const OXUS_STEPPE = ['Dahae', 'Massagetae', 'Issedones'];

// ---------------------------------------------------------------------------
// Table builders: OWNERS/LEVIES/RELIGIONS maps from {TAG: [cells]} deals.
// ---------------------------------------------------------------------------

function deal(assignments, frontier, religions) {
  const owners = {};
  for (const tag of Object.keys(assignments)) {
    for (const name of assignments[tag]) {
      if (owners[name] !== undefined) {
        throw new Error('political_maps: ' + name + ' dealt twice (' + owners[name] + ', ' + tag + ')');
      }
      owners[name] = tag;
    }
  }
  const levies = {};
  // Every OWNED new cell is 0.2 unless the era names it a frontier (0.1).
  for (const name of Object.keys(owners)) {
    if (owners[name] !== 'WASTE') levies[name] = 0.2;
  }
  for (const name of frontier || []) {
    if (owners[name] === undefined) {
      throw new Error('political_maps: frontier cell ' + name + ' has no owner');
    }
    levies[name] = 0.1;
  }
  const out = { owners, levies };
  if (religions) out.religions = religions;
  return out;
}

function faiths(faith, ...cellLists) {
  const out = {};
  for (const list of cellLists) for (const name of list) out[name] = faith;
  return out;
}

// ---------------------------------------------------------------------------
// 167 BCE — the world the year after Pydna.
// Polybius XXXI is the spine: Carthage still stands (Scipio burns it in 146),
// Masinissa is eating its hinterland at law and by force, the Arverni under
// Luernius hold the widest hegemony Gaul ever produced (Strabo IV.2.3), and
// Rome's two Spanish provinces are a coastal strip two praetors bleed for
// every summer — Numantia stands another 34 years.
// ---------------------------------------------------------------------------

const MAP_167 = deal({
  // Carthage keeps its Zeugitana-Byzacena core and the Syrtis emporia the
  // treaty of 201 left it; Masinissa's Numidia has already taken the western
  // marches (the Emporia arbitration of the 160s went the king's way, and
  // every arbitration after it — Polybius XXXI.21, Appian Lib. 67-69).
  CAR: AFRICA_PUNIC,
  NUM: AFRICA_NUMID.concat(AFRICA_MASAESYLI), // Masaesyli lands to the Mulucha: his since Zama
  MAU: AFRICA_MOOR.concat(['Gaetulia']),      // Baga's line beyond the Mulucha (Livy XXIX.30)
  GRM: ['Garama'],                            // the Garamantes of the Fezzan oases
  // Rome's Hispania Citerior and Ulterior — the coast and the Baetis valley —
  // and the Cisalpina it finished taking a generation ago: Bononia is a
  // colony of 189, Aquileia of 181, and Sardinia and Corsica are the oldest
  // provinces it has.
  ROM: SPAIN_ROMAN_167.concat(ITALY_NORTH, ITALY_ISLES),
  CTB: SPAIN_CELTIBERIA,                      // the treaties of Gracchus (179) hold, barely
  // The Lusitani, with the Callaeci and Astures of the northwest folded under
  // the one banner that raided south — Viriathus' people, twenty years early.
  LUS: SPAIN_LUSITANIA.concat(SPAIN_NORTHWEST),
  // Massalia: the oldest ally Rome has, still free until Caesar, and Emporion
  // is its own colony (Strabo III.4.8).
  MAS: ['Massilia', 'Emporiae'],
  // The Arverni at their height: "their rule reached to Narbo and the borders
  // of Massalia" (Strabo IV.2.3). Narbo is 49 years from being a colonia; the
  // Volcae, Bituriges, Pictones and Allobroges ride under the hegemon here.
  AVN: GAUL_NARBONENSIS.concat(['Tolosa', 'Burdigala', 'Avaricum', 'Limonum', 'Genava']),
  AED: ['Augustodunum', 'Lugdunum'],          // the Aedui and their Segusiavi clients
  SEQ: ['Vesontio', 'Argentorate'],           // the Sequani of the Doubs and the upper Rhine
  ARO: GAUL_ARMORICA,                         // the Veneti and the sea peoples of the west
  BLG: GAUL_BELGICA,                          // the Belgae, Parisii to the Rhine mouths
  NOR: ['Virunum', 'Augusta Vindelicorum'],   // the regnum Noricum, Rome's iron friend since 186
  BOI: ['Boiohaemum', 'Carnuntum', 'Aquincum'], // the Boii, Bohemia to the middle Danube
  BRT: BRITAIN, CAL: CALEDONIA, HIB: HIBERNIA,
  SUE: ['Semnones'],                          // Tacitus' "oldest and noblest of the Suebi"
  CHE: ['Teutoburgium'], CHA: ['Chatti'], FRS: ['Frisia'],
  CIM: ['Cimbria', 'Selandia'],               // the Cimbri at home, 47 years before they leave
  SCN: ['Scandia'],                           // the Suiones beyond the water (Germania 44)
  GOT: ['Gothiscandza'],                      // the Gothones at the Vistula mouth
  AES: ['Aestii'],                            // the amber-gatherers of the eastern shore
  DLM: ['Salona', 'Delminium'],               // the Delmatae, seceded from Illyria as Genthius fell
  SCO: ['Siscia', 'Sirmium', 'Singidunum'],   // the Scordisci, hegemons of the Save mouth
  DRD: ['Naissus'],                           // the Dardani, Macedon's oldest wound
  // The Odrysian kingdom under Cotys IV, Perseus' pardoned ally; the Moesi
  // and the Serdi ride under the paramount Thracian crown at this scale, and
  // the west-Pontic poleis pay it for quiet.
  THR: DANUBE_THRACE.concat(['Novae', 'Tomis']),
  DAC: DACIA,
  // The Tauric Chersonese: the royal Scythians of the peninsula, to whom
  // Olbia and Tyras already pay protection (the Protogenes decree, IosPE I².32).
  SCY: STEPPE_NEAR.concat(['Olbia', 'Tyras']),
  // The Spartocid Bosporus under Paerisades IV; the Tauric Greeks ride under
  // the one Greek crown of the north at this scale.
  BOS: PONTIC_GREEK,
  SRM: STEPPE_FAR,                            // the Roxolani and Aorsi, new lords of the grass
  VEN: ['Venedia'],                           // the Venedae of Ptolemy III.5
  // -- the east and south (SPEC §203) --
  // Antiochus IV dies at Tabae in Persis THIS YEAR, on an anabasis to hold
  // exactly these satrapies: Carmania is Seleucid on paper and slipping.
  // Eucratides has usurped Bactria and holds Margiana, Aria and the Helmand
  // lands (Strabo XI.9.2, XI.11.2); Phraates I's Parthia is still the small
  // kingdom of Nisa and the Caspian Gates. Meroe is under Ergamenes' line;
  // Saba carries the southwest at this scale (Qataban and Ma'in ride under
  // the paramount incense crown), Hadramawt taxes the groves and the island.
  SEL: IRAN_SE,
  KSH: NUBIA_NILE,
  SAB: YEMEN_SABA.concat(YEMEN_HIMYAR),       // Himyar is 57 years from existing
  HDR: HADRAMAWT,
  GBA: IRAN_NE.concat(IRAN_SAKASTAN),
  PAR: IRAN_PARTHYENE,
  CHO: ['Chorasmia'],
  // No state, honestly: the Balearic slingers hire out to everyone and answer
  // to no one (Carthage lost the islands in 206, Rome takes them in 123), and
  // the far forest is Herodotus' blank margin for another seven centuries.
  // §203's ground keeps the same rule: the Horn ports answer each to its own
  // chief (Periplus 14, three centuries early and still true), the proto-
  // Aksumite highlands are chiefdoms between D'mt and Aksum, the Gedrosian
  // and Omani coasts, inner Arabia and the whole Sahel are peoples, not
  // courts.
  WASTE: ['Baleares', 'Borysthenia', 'Rha', 'Hyperborea', 'Ripaea',
    ...IRAN_MAKRAN, ...OXUS_STEPPE, ...OMAN_CELLS, ...ARABIA_INNER,
    ...AKSUM_CORE, ...HORN_INTERIOR, ...HORN_PORTS, 'Blemmyae',
    ...SAHEL, ...GUINEA_W],
}, [
  // "Spain is a frontier in 167 BCE": the Celtiberian and Lusitanian wars eat
  // both praetorian armies most summers. Everything else on this map is
  // somebody's home ground at the interior share — except the Seleucid far
  // east, which is what the king died marching to hold.
  ...SPAIN_ROMAN_167, ...IRAN_SE,
]);

// ---------------------------------------------------------------------------
// 67 BCE — the year Pompey gets the pirate command.
// Africa is a Roman province around a razed city; Numidia (Hiempsal II) and
// Bocchus' Mauretania split the rest along the Jugurthine settlement.
// Sertorius is two years dead and Spain is quiet enough to tax; the northwest
// never surrendered anything. Gallia Transalpina runs Tolosa to Geneva;
// Ariovistus' Suebi are already across the upper Rhine. Mithridates has just
// destroyed Triarius at Zela and still garrisons the northern Euxine.
// ---------------------------------------------------------------------------

const MAP_67 = deal({
  ROM: AFRICA_PUNIC                            // provincia Africa, 146
    .concat(SPAIN_ROMAN_167, SPAIN_CELTIBERIA, // Citerior/Ulterior, Numantia 66 years fallen
      SPAIN_LUSITANIA,                         // held south of the Tagus since Brutus Callaicus
      ['Emporiae', 'Baleares'],                // Baleares annexed 123
      ITALY_NORTH, ITALY_ISLES,                // Cisalpina a province since Sulla
      GAUL_NARBONENSIS, ['Tolosa', 'Genava'],  // the provincia of 121-118
      ['Salona'],                              // Cosconius took it from the Delmatae, 78-76
      ['Tomis']),                              // M. Lucullus took the west-Pontic coast, 72-71
  NUM: AFRICA_NUMID,                           // Hiempsal II, restored by Pompey's own hand
  MAU: AFRICA_MOOR.concat(AFRICA_MASAESYLI, ['Gaetulia']), // Bocchus' price for Jugurtha
  GRM: ['Garama'],
  LUS: SPAIN_NORTHWEST,                        // the Callaeci and Astures, unconquered until 19
  MAS: ['Massilia'],
  AED: ['Augustodunum', 'Lugdunum', 'Avaricum'], // the Bituriges in Aeduan fides (Caesar BG VII.5)
  AVN: ['Limonum'],                            // what the hegemony kept west of the mountains
  AQT: ['Burdigala'],                          // the peoples between Garonne and ocean
  SEQ: ['Vesontio', 'Argentorate'],            // about to invite Ariovistus in, to their ruin
  ARO: GAUL_ARMORICA,
  BLG: GAUL_BELGICA,
  NOR: ['Virunum', 'Augusta Vindelicorum'],
  BOI: ['Boiohaemum', 'Carnuntum', 'Aquincum'], // Burebista breaks them in seven years
  BRT: BRITAIN, CAL: CALEDONIA, HIB: HIBERNIA,
  SUE: ['Semnones'], CHE: ['Teutoburgium'], CHA: ['Chatti'], FRS: ['Frisia'],
  CIM: ['Cimbria', 'Selandia'],                // parva nunc civitas, sed gloria ingens (Germania 37)
  SCN: ['Scandia'], GOT: ['Gothiscandza'], AES: ['Aestii'],
  DLM: ['Delminium'],                          // the Delmatae keep the hills behind the lost port
  SCO: ['Siscia', 'Sirmium', 'Singidunum'],    // broken at the Margus but not gone
  DRD: ['Naissus'],                            // Curio reached the Danube through them, 75-73
  THR: DANUBE_THRACE.concat(['Novae']),        // the Bessi and Moesi under the Odrysian crown
  DAC: DACIA,                                  // Burebista's rise has begun
  // Mithridates' garrisons still hold the northwestern Euxine ports he took
  // in the 100s (App. Mith. 15; IosPE I².35) — the only cells on this map the
  // Pontic king answers for while his own kingdom burns.
  PNT: ['Olbia', 'Tyras'],
  BOS: PONTIC_GREEK,                           // Machares, ruling for Rome since Lucullus
  SCY: STEPPE_NEAR,
  SRM: STEPPE_FAR,
  VEN: ['Venedia'],
  // -- the east and south (SPEC §203) --
  // Mithridates II retook Aria and Margiana from the Sakas a generation ago
  // and settled them on the Helmand as vassals — Sakastan is now a country's
  // name. Carmania and the Parthyene heartland are Arsacid interior; Himyar
  // exists (from ~110 BCE) and has taken the coast trade from old Saba;
  // Meroe is in its Kandake century.
  PAR: IRAN_SE.concat(IRAN_NE, IRAN_PARTHYENE),
  SAK: IRAN_SAKASTAN.concat(IRAN_MAKRAN),
  CHO: ['Chorasmia'],
  KSH: NUBIA_NILE,
  SAB: YEMEN_SABA.concat(['Eudaemon Arabia']),
  HMY: ['Zafar', 'Muza'],
  HDR: HADRAMAWT,
  WASTE: ['Borysthenia', 'Rha', 'Hyperborea', 'Ripaea',
    ...OXUS_STEPPE, ...OMAN_CELLS, ...ARABIA_INNER,
    ...AKSUM_CORE, ...HORN_INTERIOR, ...HORN_PORTS, 'Blemmyae',
    ...SAHEL, ...GUINEA_W],
}, [
  // The Spanish interior is a province now (Pompey settled it in 71); the
  // standing frontiers are the Lusitanian marches, the new Illyrian and
  // Pontic footholds, and the Allobroges' country — they rise next year.
  // In the east, Aria and Margiana are the Saka wound the Arsacids garrison.
  ...SPAIN_LUSITANIA, 'Salona', 'Tomis', 'Genava',
  ...IRAN_NE,
]);

// ---------------------------------------------------------------------------
// 40 BCE — the year of the Parthian flood.
// Caesar's Gaul is conquered and unreconciled (Agrippa is on the Rhine within
// two years); Africa Nova exists because Thapsus killed Numidia; Bocchus II
// holds both Mauretanias for outliving everybody. The Danube is Burebista's
// wreckage: he broke the Boii and Taurisci, sacked Olbia, and died the same
// year as Caesar, leaving four quarreling kingdoms and a Dacia that still
// frightens Rome. Sextus Pompeius' admirals hold Sardinia against the
// triumvirs — a war this chapter's events do not stage, so the islands ride
// under Rome's banner with the rest of the triumviral west.
// ---------------------------------------------------------------------------

const MAP_40 = deal({
  ROM: AFRICA_PUNIC.concat(AFRICA_NUMID,       // Africa Vetus + Nova (Thapsus, 46)
    SPAIN_ROMAN_167, SPAIN_CELTIBERIA,         // the peninsula, all but the never-taken northwest
    SPAIN_LUSITANIA, ['Emporiae', 'Baleares'],
    GAUL_BELGICA, GAUL_ARMORICA, GAUL_CENTRAL, // Gallia Comata, six years pacified
    GAUL_NARBONENSIS, ['Massilia'],            // the old provincia; Massilia stripped in 49
    ITALY_NORTH, ITALY_ISLES,                  // Cisalpina folded into Italia in 42
    ['Salona', 'Tomis']),
  MAU: AFRICA_MOOR.concat(AFRICA_MASAESYLI, ['Gaetulia']), // Bocchus II, the durable
  GRM: ['Garama'],
  LUS: SPAIN_NORTHWEST,
  BRT: BRITAIN, CAL: CALEDONIA, HIB: HIBERNIA,
  SUE: ['Semnones', 'Boiohaemum'],             // the Suebian drift into the emptied Boii country
  CHE: ['Teutoburgium'], CHA: ['Chatti'], FRS: ['Frisia'],
  CIM: ['Cimbria', 'Selandia'], SCN: ['Scandia'], GOT: ['Gothiscandza'], AES: ['Aestii'],
  DLM: ['Delminium'],                          // Octavian's Illyrian war finds them ready, 35
  SCO: ['Siscia', 'Sirmium', 'Singidunum'],
  DRD: ['Naissus'],
  THR: DANUBE_THRACE.concat(['Novae']),        // Antony's client kings, Sadala's heirs
  DAC: DACIA.concat(['Aquincum']),             // the deserta Boiorum answer to Dacian arms now
  NOR: ['Virunum', 'Augusta Vindelicorum', 'Carnuntum'], // the regnum reaches the river in the vacuum
  BOS: PONTIC_GREEK,                           // Asander, who murdered his way to thirty years
  SCY: STEPPE_NEAR.concat(['Olbia', 'Tyras']), // Olbia half-ruined by Burebista, under Scythian protection
  SRM: STEPPE_FAR,
  VEN: ['Venedia'],
  // -- the east and south (SPEC §203): the 67 BCE board, one generation on.
  // Phraates III's east holds; the Indo-Scythian house on the Helmand is at
  // its height between Maues' heirs and Gondophares.
  PAR: IRAN_SE.concat(IRAN_NE, IRAN_PARTHYENE),
  SAK: IRAN_SAKASTAN.concat(IRAN_MAKRAN),
  CHO: ['Chorasmia'],
  KSH: NUBIA_NILE,                             // Amanirenas' generation: Syene is sacked in 15 years
  SAB: YEMEN_SABA.concat(['Eudaemon Arabia']),
  HMY: ['Zafar', 'Muza'],
  HDR: HADRAMAWT,
  WASTE: ['Borysthenia', 'Rha', 'Hyperborea', 'Ripaea',
    ...OXUS_STEPPE, ...OMAN_CELLS, ...ARABIA_INNER,
    ...AKSUM_CORE, ...HORN_INTERIOR, ...HORN_PORTS, 'Blemmyae',
    ...SAHEL, ...GUINEA_W],
}, [
  // Gallia Comata is six years from Alesia and one from the next rising;
  // everything Caesar conquered garrisons itself. Narbonensis and Massilia
  // (stripped in 49) are interior; so is Spain at last. Africa Nova is one
  // year out of its own civil war (Sextius against Cornificius, 42-40).
  ...GAUL_BELGICA, ...GAUL_ARMORICA, ...GAUL_CENTRAL,
  ...AFRICA_NUMID, 'Salona', 'Tomis',
  ...IRAN_NE,
]);

// ---------------------------------------------------------------------------
// 66 CE — the base atlas's own year, the chapter Rome is the antagonist of.
// This is the map §160 could not ship as ownership: the whole west is Nero's.
// The bands are the whole point. Measured on this file, Rome's 83 new
// provinces come to about +15% manpower and +12% force limit instead of the
// +98% / +75% the raw development would hand it — the Rhine army exists on
// this map precisely so that it cannot march east.
// ---------------------------------------------------------------------------

const MAP_66 = deal({
  ROM: AFRICA_PUNIC.concat(AFRICA_NUMID, AFRICA_MASAESYLI, AFRICA_MOOR, // Mauretania annexed 44 CE
    SPAIN_ALL,                                 // Hispania entire, one legion, mostly roads
    GAUL_ALL,                                  // Gaul entire; the Rhine cells carry the legions
    ITALY_NORTH, ITALY_ISLES,
    BRITAIN,                                   // Boudica is five years put down; the island is a war
    DANUBE_ILLYRIA, DANUBE_PANNONIA, DANUBE_MOESIA, DANUBE_THRACE, // Thracia annexed 46 CE
    ['Naissus', 'Tomis', 'Tyras']),            // upper Moesia; Tyras annexed under Nero, 57
  GRM: ['Garama'],
  CAL: CALEDONIA, HIB: HIBERNIA,
  SUE: ['Semnones', 'Boiohaemum'],             // Maroboduus' Marcomanni were Suebi (Tacitus, Germ. 39)
  CHE: ['Teutoburgium'],                       // Arminius' people, feuding themselves to death
  CHA: ['Chatti'], FRS: ['Frisia'],            // Corbulo pulled back over the Rhine in 47
  CIM: ['Cimbria', 'Selandia'], SCN: ['Scandia'], GOT: ['Gothiscandza'], AES: ['Aestii'],
  DAC: DACIA,                                  // quiet since Burebista, waiting for Decebalus
  BOS: PONTIC_GREEK,                           // the client kingdom of Rhescuporis I
  SCY: STEPPE_NEAR.concat(['Olbia']),          // the late Scythians of Neapolis; Olbia under their walls
  SRM: STEPPE_FAR,                             // the Roxolani raid Moesia the winter after this
  VEN: ['Venedia'],
  // -- the east and south (SPEC §203): the Periplus' own map, dated within a
  // generation of this bookmark. Zoscales rules Aksum and Adulis (Periplus
  // 5); Charibael, "king of the two tribes, the Homerites and Sabaeans,"
  // rules from Zafar (23) — so Saba does not appear apart; Eleazus rules the
  // frankincense country from Shabwa, and Dioscurida is his (27, 31); Omana
  // is the mart of the Persian side (36). Gondophares' Indo-Parthian house
  // holds Sakastan and the Makran; the Kandake of Acts 8 reigns at Meroe,
  // and Nero's centurions have just come back from the Sudd with a report
  // (Seneca NQ VI.8).
  PAR: IRAN_SE.concat(IRAN_NE, IRAN_PARTHYENE),
  SAK: IRAN_SAKASTAN.concat(IRAN_MAKRAN),
  CHO: ['Chorasmia'],
  KSH: NUBIA_NILE,
  AXM: AKSUM_CORE,
  HMY: YEMEN_HIMYAR.concat(YEMEN_SABA),
  HDR: HADRAMAWT,
  OMA: OMAN_CELLS,
  // Beyond the limes and beyond every state: the Gaetulian steppe (the tribes
  // answer to no prefect), the far forest — and the Horn ports, which the
  // Periplus says plainly are "not subject to a king, but each mart ruled by
  // its own chief" (14).
  WASTE: ['Gaetulia', 'Borysthenia', 'Rha', 'Hyperborea', 'Ripaea',
    ...OXUS_STEPPE, ...ARABIA_INNER, ...HORN_PORTS, ...HORN_INTERIOR,
    'Blemmyae', ...SAHEL, ...GUINEA_W],
}, [
  // The standing frontiers of the principate: the Rhine army (four legions in
  // 66, about to make an emperor), the Danube line, the British war, the
  // Mauretanian mountain rim. Interior Gaul, Spain, Africa and north Italy
  // are the governed quiet the levy share calls 0.2. In the east, Vologases'
  // Aria and Margiana carry the Saka and Kushan marches.
  'Colonia Agrippina', 'Mogontiacum', 'Argentorate', 'Batavia', // the Rhine
  'Britannia',
  ...DANUBE_PANNONIA, ...DANUBE_MOESIA, 'Tomis', 'Tyras',       // the Danube
  'Atlas',                                                      // the Moorish rim
  ...IRAN_NE,                                                   // the eastern marches
]);

// ---------------------------------------------------------------------------
// 132 CE — Hadrian's world, the year Bar Kokhba rises.
// The same empire one conquest wider: Dacia has been two provinces and a
// bridge since Trajan burned Sarmizegetusa in 106. The Wall is four years
// finished. Nothing else on the western map changed hands in 66 years —
// which is the fact about the second century that the chapter leans on.
// ---------------------------------------------------------------------------

const MAP_132 = deal({
  ROM: AFRICA_PUNIC.concat(AFRICA_NUMID, AFRICA_MASAESYLI, AFRICA_MOOR,
    SPAIN_ALL, GAUL_ALL, ITALY_NORTH, ITALY_ISLES, BRITAIN,
    DANUBE_ILLYRIA, DANUBE_PANNONIA, DANUBE_MOESIA, DANUBE_THRACE,
    DACIA,                                     // provincia Dacia, 106
    ['Naissus', 'Tomis', 'Tyras', 'Olbia']),   // Olbia under Roman protection since Antoninus' father's day
  GRM: ['Garama'],
  CAL: CALEDONIA, HIB: HIBERNIA,
  SUE: ['Semnones', 'Boiohaemum'],
  CHE: ['Teutoburgium'], CHA: ['Chatti'], FRS: ['Frisia'],
  CIM: ['Cimbria', 'Selandia'], SCN: ['Scandia'], GOT: ['Gothiscandza'], AES: ['Aestii'],
  BOS: PONTIC_GREEK,                           // Cotys II pays Hadrian's mint the compliment of copying it
  SCY: ['Tauria', 'Scythia'],
  SRM: STEPPE_FAR,                             // the Iazyges and Roxolani, Trajan's unfinished business
  VEN: ['Venedia'],
  // -- the east and south (SPEC §203): the 66 CE board two generations on.
  // The Indo-Parthian house is a Sistan rump now (the Kushans have its east,
  // beyond the frame) but Sakastan itself it keeps for another century;
  // Aksum under Gadarat's line is reaching for the strait; the dual crown
  // "of Saba and dhu-Raydan" is still fought over at Zafar and carried here.
  PAR: IRAN_SE.concat(IRAN_NE, IRAN_PARTHYENE),
  SAK: IRAN_SAKASTAN.concat(IRAN_MAKRAN),
  CHO: ['Chorasmia'],
  KSH: NUBIA_NILE,                             // the late kingdom, two centuries from Ezana's raid
  AXM: AKSUM_CORE,
  HMY: YEMEN_HIMYAR.concat(YEMEN_SABA),
  HDR: HADRAMAWT,
  OMA: OMAN_CELLS,
  WASTE: ['Gaetulia', 'Borysthenia', 'Rha', 'Hyperborea', 'Ripaea',
    ...OXUS_STEPPE, ...ARABIA_INNER, ...HORN_PORTS, ...HORN_INTERIOR,
    'Blemmyae', ...SAHEL, ...GUINEA_W],
}, [
  'Colonia Agrippina', 'Mogontiacum', 'Argentorate', 'Batavia',
  'Britannia',                                 // the Wall is a frontier made stone
  ...DANUBE_PANNONIA, ...DANUBE_MOESIA, ...DACIA, // Dacia is the salient the legions hold
  'Tomis', 'Tyras', 'Olbia',
  'Atlas',                                     // Mauretania rose the year Hadrian took the purple
  ...IRAN_NE,                                  // the Kushan marches now
]);

// ---------------------------------------------------------------------------
// 529 CE — year two of Justinian, four years before Belisarius sails.
// The chapter's owners table handed the emperor Italy, Sicily and Tripolitania
// he does not hold until 533-540: Athalaric's Ostrogoths rule Italy, Dalmatia,
// Pannonia-Sirmiensis and Provence from Ravenna under Amalasuintha's regency;
// Hilderic's Vandals rule Carthage, the islands and the Syrtic shore; the
// interior Maghreb answers to the Moorish kings the Vandals could not break
// (Masuna's "kingdom of the Moors and Romans", Iaudas in the Aures). Amalaric's
// Visigoths hold Spain and Septimania; the Sueves keep Gallaecia; the Franks
// of Clovis' four sons have Gaul north of them all; Godomar's Burgundy has
// five years to live. Procopius (Wars III-V) and Gregory of Tours are the
// spine here.
// ---------------------------------------------------------------------------

const MAP_529 = deal({
  OST: ITALY_OLD.concat(ITALY_NORTH,
    ['Massilia',                               // Provence, Theodoric's buffer since 508
      'Salona', 'Delminium', 'Siscia',         // Dalmatia and Savia
      'Sirmium',                               // taken from the Gepids in 504
      'Virunum', 'Augusta Vindelicorum']),     // Noricum and Raetia, nominal but named
  VAN: AFRICA_PUNIC.concat(['Hippo Regius',    // the kingdom of Carthage under Hilderic
    'Oea', 'Leptis Magna', 'Macomades',        // Tripolitania (bookmark_529ce.js gives these up)
    'Baleares', 'Caralis', 'Turris Libisonis', 'Aleria']), // the Vandal sea
  // What the Vandals never held and Byzantium will pretend to: the Moorish
  // kingdoms of the interior and the west — Masuna at Altava, Iaudas in the
  // Aures, the Frexes under Antalas. One banner carries them at this scale.
  MAU: AFRICA_MOOR.concat(AFRICA_MASAESYLI,
    ['Capsa', 'Theveste', 'Cirta', 'Gaetulia']), // Numidia's interior; Hippo stays the kings'

  GRM: ['Garama'],                             // still pagan, still selling the desert's carrying trade
  VIS: SPAIN_ROMAN_167.concat(SPAIN_CELTIBERIA, SPAIN_LUSITANIA,
    ['Emporiae'],                              // the Baleares stayed Vandal
    GAUL_NARBONENSIS),                         // Septimania: what Vouillé left of Gallia Gothica
  SUE: SPAIN_NORTHWEST,                        // the Suevic kingdom of Bracara, Arian and apart
  FRK: ['Lutetia', 'Rotomagus', 'Samarobriva', 'Gesoriacum', 'Durocortorum',
    'Augusta Treverorum', 'Colonia Agrippina', 'Mogontiacum', 'Argentorate',
    'Tolosa', 'Burdigala', 'Limonum', 'Avaricum',
    'Chatti'],                                 // Hessian marches; Thuringia falls to Theuderic in 531
  BGD: ['Lugdunum', 'Augustodunum', 'Vesontio', 'Genava'], // Godomar II's kingdom, 534 its last year
  ARO: GAUL_ARMORICA,                          // the Bretons of the peninsula, British and unbowed
  BRT: BRITAIN,                                // the Badon generation: the island holds
  CAL: CALEDONIA, HIB: HIBERNIA,
  SAX: ['Teutoburgium'],                       // the old Saxony the migrants left behind
  FRS: ['Frisia', 'Batavia'],                  // Frisia Magna runs to the Rhine mouths now
  CIM: ['Cimbria', 'Selandia'],                // Chlochilaich's Danes raided Gaul eight years ago
  SCN: ['Scandia'],
  AES: ['Aestii', 'Gothiscandza'],             // the amber shore; the Vidivarii where the Goths were
  GEP: ['Singidunum'].concat(DACIA),           // the Gepid kingdom, Sirmium lost, Transylvania kept
  LMB: DANUBE_PANNONIA,                        // Wacho's Lombards on the middle Danube
  BYZ: ['Naissus', 'Serdica', 'Philippopolis', 'Novae', 'Tomis', // the Balkan dioceses behind the limes
    'Chersonesus', 'Panticapaeum'],            // Justin's Bosporan protectorate (Procop. Wars I.12)
  BGR: ['Tauria', 'Scythia', 'Tanais', 'Phanagoria'].concat(STEPPE_FAR), // Kutrigur and Utigur hordes
  SLV: ['Tyras', 'Olbia', 'Venedia', 'Borysthenia'], // the Antes and Sclaveni of the river country
  // -- the east and south (SPEC §203) --
  // Kavad's Persia holds its whole east, and Mazun — Sasanian Oman — is an
  // attested province of it; the Margiana frontier pays the Hephthalites the
  // tribute Peroz's death fixed, and Chorasmia answers to the White Huns.
  // Four years ago Kaleb of Aksum crossed the strait and broke Jewish
  // Himyar: the whole incense country answers to the negus (through Sumyafa
  // Ashwa his viceroy — Procopius I.20 — with Abraha's mutiny two years
  // out), Christian Najran under his protection. Kush is a century and a
  // half gone: the Nubian kings hold the river, the Blemmyes the desert.
  // Mecca stays WASTE here like the rest of the tribal Hejaz — this chapter
  // keeps RSH deliberately unseated (its Yathrib and Khaybar are a dormant
  // pre-§160 note), and the Quraysh caravan town is a people, not a court.
  SAS: IRAN_SE.concat(IRAN_MAKRAN, IRAN_SAKASTAN, IRAN_NE, IRAN_PARTHYENE, OMAN_CELLS),
  HEP: ['Chorasmia', 'Massagetae'],
  NOB: NUBIA_NILE,
  BLM: ['Blemmyae'],
  AXM: AKSUM_CORE.concat(['Shewa'], YEMEN_SABA, YEMEN_HIMYAR, HADRAMAWT),
  WASTE: ['Semnones', 'Boiohaemum',            // the emptied Elbe lands between migrations
    'Rha', 'Hyperborea', 'Ripaea',
    'Dahae', 'Issedones', 'Macoraba', 'Asir', 'Yamama', // the tribes between the powers
    ...HORN_PORTS, 'Danakil', 'Ogaden', 'Azania', 'Kaffa',
    ...SAHEL, ...GUINEA_W],
}, [
  // Justinian's actual frontier: the lower Danube and the Tauric outposts,
  // raided yearly by the hordes this map finally names. Persia's Margiana
  // carries the Hephthalite tribute-frontier; Aksum's Yemen is a conquest
  // across a sea, four years old and garrison-thin — Abraha is about to
  // prove exactly how thin.
  'Novae', 'Tomis', 'Chersonesus', 'Panticapaeum',
  ...IRAN_NE,
  ...YEMEN_SABA, ...YEMEN_HIMYAR, ...HADRAMAWT,
], faiths('christianity',
  // The christian west, 529: everything a bishop reaches — Frankish Gaul
  // (baptized with Clovis), Visigothic and Suevic Iberia and the Ostrogothic
  // and Vandal south (Arian crowns over Nicene provinces — the game's one
  // religion key carries both rites), Burgundy, Armorica, the Britons and the
  // Irish (Patrick is a century old). The Picts wait for Columba; the English
  // are not yet here; Frisia, the north and the steppe keep their gods.
  AFRICA_PUNIC, AFRICA_NUMID, AFRICA_MASAESYLI, AFRICA_MOOR,
  ['Hippo Regius', 'Baleares', 'Caralis', 'Turris Libisonis', 'Aleria'],
  // The corrected cells: bookmark_529ce.js no longer claims them for the
  // Empire, so the chapter's own christianity overlay no longer reaches them
  // — but a sixth-century Rome with the state cult of Jupiter would be worse
  // than the ownership error this file exists to fix.
  ITALY_OLD, ['Oea', 'Leptis Magna', 'Macomades'],
  SPAIN_ALL, GAUL_ALL, ITALY_NORTH, GAUL_ARMORICA, BRITAIN, HIBERNIA,
  DANUBE_ILLYRIA, DANUBE_PANNONIA, DANUBE_MOESIA, DANUBE_THRACE,
  ['Naissus', 'Singidunum', 'Chersonesus', 'Panticapaeum', 'Tomis'],
  // §203: Christian Aksum (Ezana took the Cross two centuries ago) and the
  // Najran of the martyrs of 523, whose avenging is why Kaleb crossed at
  // all. Nubia's kings are still pagan — Julian's mission sails in 543.
  AKSUM_CORE, ['Shewa', 'Najran'],
));

// ---------------------------------------------------------------------------
// 614 CE — the year Jerusalem falls to Persia.
// Heraclius has reigned four years and holds the sea, Africa (his father's
// exarchate, the launch-pad of 610), the Italian enclaves, Sardinia, the
// Spania rump at Malaca, and Cherson — and behind Thessalonica almost nothing:
// the Avar khaganate and the Slavs have taken the Balkan interior, Salona has
// years to live. Chlothar II rules all Gaul (Paris, 613); Sisebut — the king
// whose forced baptisms this chapter's own Jews are fleeing — rules Spain;
// Agilulf's Lombards split Italy with the exarchate; the Western Turks
// (Heraclius' allies-to-be) rule the far steppe; the Onogur Bulgars the near.
// ---------------------------------------------------------------------------

const MAP_614 = deal({
  BYZ: ['Genua',                               // Liguria, Byzantine until Rothari (643)
    'Ravenna', 'Bononia', 'Ancona',            // the exarchate and the Pentapolis
    'Aleria', 'Caralis', 'Turris Libisonis',   // the islands
    'Malaca',                                  // Spania's last decade
    'Salona', 'Philippopolis', 'Tomis',        // what the Danube collapse left standing
    'Chersonesus', 'Panticapaeum']             // Cherson, the empire's far door
    .concat(AFRICA_PUNIC, AFRICA_NUMID),       // the exarchate of Carthage, the healthy limb
  LMB: ['Mediolanum', 'Pisae', 'Aquileia',     // Pavia's kingdom, Tuscia, Friuli
    'Capua'],                                  // CORRECTION: Capua was Lombard, Benevento's north
  MAU: AFRICA_MOOR.concat(AFRICA_MASAESYLI, ['Gaetulia']), // Altava's world, unbroken by either empire
  GRM: ['Garama'],                             // baptized under Justin II (John of Biclaro, a. 569)
  VIS: ['Gades', 'Hispalis', 'Corduba', 'Carthago Nova', 'Valentia', 'Tarraco',
    'Barcino', 'Caesaraugusta']                // all Spain but the Malaca rump
    .concat(SPAIN_CELTIBERIA, SPAIN_LUSITANIA, SPAIN_NORTHWEST, // the Sueves annexed, 585
      ['Emporiae', 'Baleares'], GAUL_NARBONENSIS), // Septimania holds
  FRK: ['Lutetia', 'Rotomagus', 'Samarobriva', 'Gesoriacum', 'Durocortorum',
    'Augusta Treverorum', 'Colonia Agrippina', 'Mogontiacum', 'Argentorate',
    'Tolosa', 'Burdigala', 'Limonum', 'Avaricum', 'Augustodunum', 'Lugdunum',
    'Vesontio', 'Genava', 'Massilia',          // Provence and Burgundy, Frankish since the 530s
    'Chatti', 'Augusta Vindelicorum'],         // Hesse; Alamannia and Raetia under the kings' ban
  ARO: GAUL_ARMORICA,                          // Brittany: the emigration made it permanent
  SAX: BRITAIN.concat(['Teutoburgium']),       // Æthelfrith's generation; and the old country
  CAL: CALEDONIA,                              // the Picts, a generation after Columba
  HIB: HIBERNIA,
  FRS: ['Frisia', 'Batavia'],                  // Radbod's forefathers, the Rhine mouth theirs
  CIM: ['Cimbria', 'Selandia'],                // the Danes, named by Gregory of Tours
  SCN: ['Scandia'],
  AES: ['Aestii', 'Gothiscandza'],
  AVA: DANUBE_PANNONIA.concat(['Sirmium', 'Singidunum', // the khaganate's ring, Sirmium since 582
    'Scythia', 'Tyras', 'Olbia'])              // the Antes crushed in 602; the steppe west of the Don
    .concat(DACIA),                            // Gepidia swallowed, 567
  SLV: ['Delminium', 'Siscia',                 // the Sclaveni settlements the sources mourn
    'Naissus', 'Serdica', 'Novae',             // the cities of the interior, taken 610s
    'Virunum',                                 // Carantania: Slavs in the eastern Alps by 600
    'Semnones', 'Boiohaemum',                  // the Elbe and Bohemian Slavs
    'Venedia', 'Borysthenia'],
  TRK: STEPPE_FAR.concat(['Rha'],              // the Western Turks; Ziebel rides to Tiflis in 627
    ['Chorasmia', 'Massagetae']),              // §203: the Oxus lands, khaganate ground since the 560s
  BGR: ['Tanais', 'Phanagoria', 'Tauria'],     // the Onogurs; Kubrat's uncle holds the straits' shore
  // -- the east and south (SPEC §203) --
  // Khosrow II's Persia at its last high tide: the whole Iranian east, Mazun,
  // and the Yemen Wahriz took in 570 — a garrison of abna at Sana'a and a
  // signature everywhere else, which is what the 0.1 band is for. The
  // Hephthalites are broken (Turks past the Oxus instead); Christian Makuria
  // and Alodia hold the Nile; Aksum keeps its highlands and has lost its sea.
  SAS: IRAN_SE.concat(IRAN_MAKRAN, IRAN_SAKASTAN, IRAN_NE, IRAN_PARTHYENE,
    OMAN_CELLS, YEMEN_SABA, YEMEN_HIMYAR, HADRAMAWT),
  NOB: NUBIA_NILE,
  BLM: ['Blemmyae'],
  AXM: AKSUM_CORE.concat(['Shewa']),
  RSH: ['Macoraba'],                           // the chapter's own dormant seed, Mecca beside Yathrib
  WASTE: ['Hyperborea', 'Ripaea',
    'Dahae', 'Issedones', 'Asir', 'Yamama',
    ...HORN_PORTS, 'Danakil', 'Ogaden', 'Azania', 'Kaffa',
    ...SAHEL, ...GUINEA_W],
}, [
  // An empire of enclaves: every Byzantine holding west of Thessalonica is a
  // garrison at the end of a sea lane. Africa alone is interior — which is
  // why Africa is where Heraclius came from. Persia's Yemen is the same
  // shape with the same arithmetic: enclaves at the end of the world, held
  // at 0.1 while the King of Kings spends the abna's real strength on the
  // Roman war this chapter stages.
  'Genua', 'Bononia', 'Ancona', 'Aleria', 'Caralis', 'Turris Libisonis',
  'Malaca', 'Salona', 'Philippopolis', 'Tomis', 'Chersonesus', 'Panticapaeum',
  ...YEMEN_SABA, ...YEMEN_HIMYAR, ...HADRAMAWT, ...OMAN_CELLS,
  ...IRAN_NE,                                  // the Turk frontier
], faiths('christianity',
  // Christendom at its late-antique edge: both empires' shores, all Gaul and
  // Iberia, Lombard Italy, the Moorish kingdoms, Ireland, Pictland a
  // generation after Columba, the newly-baptized Garamantes — and Britain,
  // whose people are Christian Britons even where the kings are pagan English.
  // Frisia, the north, the Slavs and the steppe wait.
  AFRICA_PUNIC, AFRICA_NUMID, AFRICA_MASAESYLI, AFRICA_MOOR,
  ['Gaetulia', 'Garama'],
  ['Capua'],                                   // corrected out of the chapter's Byzantine list
  SPAIN_ALL, GAUL_ALL, ITALY_NORTH, ITALY_ISLES, GAUL_ARMORICA,
  BRITAIN, CALEDONIA, HIBERNIA,
  DANUBE_ILLYRIA, DANUBE_THRACE, ['Novae', 'Tomis', 'Chersonesus', 'Panticapaeum'],
  // §203: Christendom's southern reach — Aksum's church, the Najran the
  // Persians tax but do not touch, and the Nubian kingdoms Julian and
  // Longinus baptized between 543 and 580.
  AKSUM_CORE, ['Shewa', 'Najran'], NUBIA_NILE,
));

// ---------------------------------------------------------------------------
// 1948 — the year the chapter plays.
// Fills, and three corrections: Dyrrhachium was Hoxha's Albania, not waste;
// Phasis and Caucasian Albania were the Georgian and Azerbaijani SSRs. The
// west of 1948 is the neutral hinterland of somebody else's war — France
// governs the Maghreb and the Fezzan, Spain the Tangier strip, Attlee's
// Britain the island, Stalin the whole eastern board. Germany and Austria are
// under four-power occupation: the 0.1 band here means DISARMED, which is the
// one thing everyone agreed on in 1948.
// ---------------------------------------------------------------------------

const MAP_1948 = deal({
  FRA: ['Narbo', 'Massilia', 'Nemausus', 'Tolosa', 'Burdigala', 'Lugdunum',
    'Augustodunum', 'Avaricum', 'Limonum', 'Lutetia', 'Rotomagus',
    'Samarobriva', 'Gesoriacum', 'Durocortorum', 'Argentorate', 'Vesontio']
    .concat(GAUL_ARMORICA,                     // Rennes and Vannes vote like everyone else now
      ['Aleria'],                              // Corsica
      AFRICA_PUNIC, AFRICA_NUMID, AFRICA_MASAESYLI, // Tunisia and Algeria
      ['Volubilis', 'Sala', 'Atlas', 'Gaetulia', // the Moroccan protectorate
        'Garama'],                             // the Fezzan, under French military administration
      // §203: French West and Equatorial Africa — the AOF from the upper
      // Niger to Lake Chad, Cameroun under trusteeship — and the Côte
      // Française des Somalis at the strait.
      ['Bambuk', 'Guinea Highlands', 'Nigritae', 'Air', 'Agisymba',
        'Theon Ochema', 'Avalites']),
  SPA: SPAIN_ROMAN_167.concat(SPAIN_CELTIBERIA,
    ['Emerita', 'Salmantica', 'Asturica', 'Emporiae', 'Baleares'],
    ['Tingis']),                               // the Spanish protectorate and Tangier's hour of occupation
  POR: ['Olisipo', 'Bracara'],
  UK: BRITAIN.concat(CALEDONIA,                // and every latent city beneath them
    // §203: the empire's south and east — the Anglo-Egyptian Sudan (one
    // color at this scale, and it is not Cairo's), the Gold Coast and
    // Nigeria, both Somalilands (the ex-Italian one under British Military
    // Administration until the 1950 trusteeship), Eritrea under the same
    // BMA, Aden Colony with the Hadhramaut protectorates and Socotra.
    ['Napata', 'Meroe', 'Soba', 'Blemmyae', 'Noba', 'Jebel Marra',
      'Volta', 'Niger Delta',
      'Malao', 'Opone', 'Azania', 'Adulis',
      'Eudaemon Arabia', 'Shabwa', 'Dioscurida']),
  IRL: HIBERNIA,                               // the Republic, declared this very year
  // §203: the sovereign south and east of 1948, by treaty line.
  ETH: ['Aksum', 'Tana', 'Shewa', 'Kaffa', 'Danakil',
    'Ogaden'],                                 // handed back from the BMA this very September
  LBR: ['Kru Coast'],                          // Africa's other sovereign, Tubman's Liberia
  YEM: ['Zafar', 'Muza', 'Marib'],             // the Mutawakkilite Kingdom, gates shut
  SAU: ['Macoraba', 'Asir', 'Yamama', 'Najran'], // the Hejaz road, Riyadh, and the 1934 line
  OMA: ['Omana', 'Mazun', 'Moscha'],           // Muscat and Oman, with Dhofar the Sultan's estate
  IRN: ['Carmana', 'Harmozeia', 'Tis', 'Pura', 'Zranka', 'Hecatompylos'],
  AFG: ['Artacoana', 'Phrada'],                // Herat and Farah: the kingdom's west
  PAK: ['Makuran'],                            // one year old (Gwadar itself stays the Sultan's until 1958)
  NLD: ['Batavia', 'Frisia'],
  GER: ['Colonia Agrippina', 'Mogontiacum', 'Augusta Treverorum',
    'Augusta Vindelicorum', 'Chatti', 'Teutoburgium', 'Semnones'], // the four zones, one map color
  AUT: ['Carnuntum', 'Virunum'],               // occupied too, Vienna to Klagenfurt
  SUI: ['Genava'],
  DEN: ['Cimbria', 'Selandia'],
  SWE: ['Scandia'],
  POL: ['Gothiscandza'],                       // Gdańsk, two names and one ruin ago Danzig
  CZE: ['Boiohaemum'],                         // the coup was in February; the map already shows it
  HUN: ['Aquincum'],
  ITA: ITALY_NORTH                             // the republic, two years old (Trieste rides with Friuli)
    .concat(['Caralis', 'Turris Libisonis']),
  YUG: DANUBE_ILLYRIA.concat(['Sirmium', 'Singidunum', 'Naissus']),
  ALB: ['Dyrrhachium'],                        // CORRECTION: not waste — Hoxha's Albania
  BUL: ['Serdica', 'Philippopolis', 'Novae'],
  ROU: ['Tomis'].concat(DACIA),                // the People's Republic, one year old
  SOV: ['Aestii',                              // the Lithuanian SSR
    'Tyras', 'Olbia',                          // the Ukrainian SSR's Black Sea shore
    'Chersonesus', 'Panticapaeum', 'Phanagoria', 'Tanais', // Crimea and the Kuban
    'Tauria', 'Scythia', 'Sarmatia', 'Roxolania', 'Aorsia',
    'Borysthenia', 'Venedia', 'Rha', 'Hyperborea', 'Ripaea',
    'Phasis', 'Caucasian Albania',             // CORRECTIONS: the Georgian and Azerbaijani SSRs
    // §203: the Turkmen, Uzbek and Kazakh SSRs the new frame reaches.
    'Nisa', 'Antiochia Margiana', 'Dahae', 'Chorasmia', 'Massagetae', 'Issedones'],
}, [
  // Disarmed under occupation statute: the German zones and Austria.
  'Colonia Agrippina', 'Mogontiacum', 'Augusta Treverorum', 'Augusta Vindelicorum',
  'Chatti', 'Teutoburgium', 'Semnones', 'Carnuntum', 'Virunum',
], Object.assign(
  faiths('christianity',
    SPAIN_ALL, GAUL_ALL, GAUL_ARMORICA, ITALY_NORTH, ITALY_ISLES,
    GERMANIA, NORTH_SEA, BRITAIN, CALEDONIA, HIBERNIA,
    DANUBE_ILLYRIA, DANUBE_PANNONIA, DANUBE_MOESIA, DANUBE_THRACE, DACIA,
    ['Naissus', 'Phasis'],                     // Georgia keeps its old church
    PONTIC_GREEK, PONTIC_WEST, STEPPE_NEAR, STEPPE_FAR, FOREST_FAR,
    // §203: the Ethiopian church on its highlands (and Eritrea's), and the
    // mission-and-coast Christianity of British West Africa and Liberia.
    AKSUM_CORE, ['Shewa', 'Kaffa'],
    ['Kru Coast', 'Volta', 'Niger Delta', 'Theon Ochema']),
  faiths('islam',
    AFRICA_PUNIC, AFRICA_NUMID, AFRICA_MASAESYLI, AFRICA_MOOR,
    ['Gaetulia', 'Garama',
      'Dyrrhachium', 'Caucasian Albania'],     // Albania and the Azerbaijani SSR
    // §203: the Muslim south and east of 1948 — the Sudan and the Sahel,
    // the Horn's lowlands, all Arabia, Iran's east, Afghanistan, Pakistan's
    // Makran, and Soviet Central Asia (sixteen years into the atheist
    // campaigns, and the census still says this).
    NUBIA_NILE, ['Blemmyae', 'Noba', 'Jebel Marra', 'Nigritae', 'Air',
      'Agisymba', 'Bambuk', 'Guinea Highlands'],
    HORN_PORTS, ['Danakil', 'Ogaden', 'Azania'],
    ARABIA_INNER, YEMEN_SABA, YEMEN_HIMYAR, HADRAMAWT, OMAN_CELLS,
    IRAN_SE, IRAN_MAKRAN, IRAN_SAKASTAN, IRAN_NE, IRAN_PARTHYENE,
    ['Chorasmia', 'Dahae', 'Massagetae', 'Issedones']),
));

// 1948 also re-tongues the Slavic and Soviet board: the cultures the base
// atlas carries there are the ancient peoples', and a Polish Gdańsk with a
// 'germanic' culture row would be the wrong kind of joke in 1948.
MAP_1948.cultures = Object.assign(
  {},
  ...['Gothiscandza', 'Boiohaemum', 'Aquincum', // Magyar reads Slavic at this scale; see defines.js
    'Salona', 'Delminium', 'Siscia', 'Sirmium', 'Singidunum', 'Naissus',
    'Serdica', 'Philippopolis', 'Novae',
    'Tyras', 'Olbia', 'Chersonesus', 'Panticapaeum', 'Phanagoria', 'Tanais',
    'Tauria', 'Scythia', 'Sarmatia', 'Roxolania', 'Aorsia',
    'Borysthenia', 'Venedia', 'Rha', 'Hyperborea', 'Ripaea', 'Aestii',
  ].map((n) => ({ [n]: 'slavic' })),
  { Tomis: 'thracian' }, // the Dobruja is Romania's
  // §203: the Arab world of 1948 speaks its own century's tongue — the
  // Sudan's river towns included; the Beja, the Horn and Central Asia keep
  // their own rows.
  ...['Macoraba', 'Asir', 'Yamama', 'Najran', 'Marib', 'Zafar', 'Muza',
    'Eudaemon Arabia', 'Shabwa', 'Moscha', 'Dioscurida', 'Omana', 'Mazun',
    'Napata', 'Meroe', 'Soba',
  ].map((n) => ({ [n]: 'arab_modern' })),
);

// 614 settles the Slavs where the sources put them; the culture map should
// say so where they are the population and not merely the spear.
MAP_614.cultures = Object.assign(
  {},
  ...['Delminium', 'Siscia', 'Naissus', 'Serdica', 'Novae', 'Virunum',
    'Semnones', 'Boiohaemum', 'Venedia', 'Borysthenia',
  ].map((n) => ({ [n]: 'slavic' })),
);

export const POLITICAL_MAPS = {
  '167bce': MAP_167,
  '67bce': MAP_67,
  '40bce': MAP_40,
  '66ce': MAP_66,
  '132ce': MAP_132,
  '529ce': MAP_529,
  '614ce': MAP_614,
  '1948ce': MAP_1948,
};
