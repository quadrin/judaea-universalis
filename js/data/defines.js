// Judaea Universalis — global defines & balance constants (SPEC §3).
// DOM-free, dependency-free. All colors are [r,g,b] 0–255.

export const DEFINES = {
  // ms of real time per game day, per speed setting 1–5
  SPEED_MS: { 1: 900, 2: 450, 3: 220, 4: 100, 5: 40 },

  DAYS_PER_MONTH: 30,

  MONTH_NAMES: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],

  // Terrain: moveCost 1..2.5, defBonus in battle dice, attrition %/month-ish 0..5
  TERRAINS: {
    coast:     { name: 'Coast',     color: [166, 196, 156], moveCost: 1.0,  defBonus: 0, attrition: 0 },
    farmland:  { name: 'Farmland',  color: [136, 148, 74],  moveCost: 1.0,  defBonus: 0, attrition: 0 },
    hills:     { name: 'Hills',     color: [176, 142, 96],  moveCost: 1.5,  defBonus: 1, attrition: 1 },
    mountains: { name: 'Mountains', color: [138, 120, 100], moveCost: 2.2,  defBonus: 2, attrition: 3 },
    desert:    { name: 'Desert',    color: [214, 190, 138], moveCost: 1.8,  defBonus: 0, attrition: 4 },
    drylands:  { name: 'Drylands',  color: [198, 168, 104], moveCost: 1.2,  defBonus: 0, attrition: 1 },
    steppe:    { name: 'Steppe',    color: [196, 200, 138], moveCost: 1.1,  defBonus: 0, attrition: 1 },
    marsh:     { name: 'Marsh',     color: [110, 148, 138], moveCost: 2.0,  defBonus: 1, attrition: 2 },
    wasteland: { name: 'Wasteland', color: [86, 82, 74],    moveCost: 2.5,  defBonus: 0, attrition: 5, impassable: true },
  },

  // AI temperament per nation (SPEC §21). aggression multiplies the monthly
  // war-declaration chance; caution scales retreat thresholds and how early a
  // realm sues for peace; ponderous marks a great power — slow to anger,
  // needing a bigger edge to strike, but reinforcing half again as fast.
  // Missing tags default to {aggression:1, caution:1}.
  PERSONALITIES: {
    ROM: { aggression: 1.4, caution: 0.7, ponderous: true },
    PAR: { aggression: 1.1, caution: 1.0, ponderous: true },
    SEL: { aggression: 1.2, caution: 0.9, ponderous: true },
    PTO: { aggression: 0.6, caution: 1.3 },
    NAB: { aggression: 0.5, caution: 1.4 },
    ARM: { aggression: 0.8, caution: 1.2 },
    JUD: { aggression: 1.0, caution: 1.0 },
    HAS: { aggression: 1.3, caution: 0.8 },
    HER: { aggression: 1.3, caution: 0.8 },
    ATG: { aggression: 1.2, caution: 0.9 },
    HYR: { aggression: 0.7, caution: 1.3 },
    ARI: { aggression: 1.4, caution: 0.6 },
    AGR: { aggression: 0.4, caution: 1.6 },
    OSR: { aggression: 0.5, caution: 1.5 },
    ADI: { aggression: 0.8, caution: 1.1 },
    CHX: { aggression: 0.3, caution: 1.6 },
    // -- 614 CE --
    BYZ: { aggression: 0.9, caution: 1.1, ponderous: true },
    SAS: { aggression: 1.3, caution: 0.8, ponderous: true },
    GHA: { aggression: 0.6, caution: 1.3 },
    // -- 1948 CE --
    ISR: { aggression: 1.1, caution: 0.9 },
    EGY: { aggression: 1.0, caution: 1.0 },
    JOR: { aggression: 0.8, caution: 1.1 },
    SYR: { aggression: 1.1, caution: 0.9 },
    LEB: { aggression: 0.2, caution: 1.8 },
    IRQ: { aggression: 0.9, caution: 1.0 },
    TUR: { aggression: 0.1, caution: 2.0 },
    SAU: { aggression: 0.2, caution: 1.8 },
    IRN: { aggression: 0.1, caution: 2.0 },
    UK: { aggression: 0.1, caution: 2.0 },
    // formable crowns (SPEC §24)
    MLI: { aggression: 1.0, caution: 1.0 },
    UAR: { aggression: 1.2, caution: 0.9, ponderous: true },
  },

  // Government types (SPEC §25). Effects fold into tag.ideas like reforms and
  // tech; succession behavior lives in realm.js (republics elect every four
  // years and know no regencies; theocracies never crown a child).
  GOV_TYPES: {
    monarchy: {
      name: 'Monarchy',
      desc: 'Crown and dynasty: heirs succeed, and the throne slowly accrues legitimacy.',
      effects: { legitimacyAdd: 0.05 },
    },
    republic: {
      name: 'Republic',
      desc: 'Elected government: the nation votes every four years, no heirs and no regencies — and civic economies prosper (+5% income).',
      effects: { incomeMult: 1.05 },
    },
    theocracy: {
      name: 'Theocracy',
      desc: 'Rule by the anointed: successors are chosen from among the elders — never a child regency — and the faith spreads with authority (+20% conversion).',
      effects: { convertMult: 1.2 },
    },
    tribal: {
      name: 'Tribal Confederation',
      desc: 'Chiefs and elders: every tent sends its sons (+10% manpower).',
      effects: { manpowerMult: 1.1 },
    },
  },
  // Default government per tag; bookmarks may override (bookmark.govTypes —
  // Rome is a republic until the emperors).
  GOV_OF: {
    ROM: 'monarchy', JUD: 'theocracy', HAS: 'theocracy', SEL: 'monarchy',
    PTO: 'monarchy', PAR: 'monarchy', NAB: 'monarchy', ARM: 'monarchy',
    AGR: 'monarchy', HYR: 'theocracy', ARI: 'monarchy', HER: 'monarchy',
    ATG: 'monarchy', OSR: 'monarchy', ADI: 'monarchy', CHX: 'monarchy',
    BYZ: 'monarchy', SAS: 'monarchy', GHA: 'tribal',
    ISR: 'republic', EGY: 'monarchy', JOR: 'monarchy', SYR: 'republic',
    LEB: 'republic', IRQ: 'monarchy', TUR: 'republic', SAU: 'monarchy',
    IRN: 'monarchy', UK: 'monarchy', MLI: 'monarchy', UAR: 'republic',
    REB: 'tribal',
  },

  // Trade goods: price in talents per unit of production
  GOODS: {
    grain:      { name: 'Grain',      price: 2.0,  color: [222, 196, 110] },
    wine:       { name: 'Wine',       price: 2.5,  color: [140, 52, 74] },
    olive_oil:  { name: 'Olive Oil',  price: 2.5,  color: [128, 138, 62] },
    dates:      { name: 'Dates',      price: 2.2,  color: [168, 112, 54] },
    balsam:     { name: 'Balsam',     price: 4.5,  color: [104, 140, 92] },
    incense:    { name: 'Incense',    price: 4.0,  color: [206, 158, 92] },
    purple_dye: { name: 'Purple Dye', price: 5.0,  color: [122, 44, 122] },
    glass:      { name: 'Glass',      price: 3.0,  color: [140, 190, 196] },
    papyrus:    { name: 'Papyrus',    price: 2.8,  color: [196, 186, 140] },
    silver:     { name: 'Silver',     price: 4.0,  color: [176, 180, 188] },
    salt:       { name: 'Salt',      price: 2.0,  color: [226, 224, 214] },
    spices:     { name: 'Spices',     price: 4.5,  color: [190, 96, 46] },
    timber:     { name: 'Timber',     price: 2.2,  color: [110, 86, 56] },
    fish:       { name: 'Fish',       price: 1.8,  color: [92, 130, 168] },
    livestock:  { name: 'Livestock',  price: 2.0,  color: [158, 122, 96] },
  },

  // Religions: groups 'judaic' | 'pagan' | 'iranic' | 'christian' | 'islamic'
  RELIGIONS: {
    judaism:        { name: 'Second Temple Judaism', color: [46, 96, 178],  group: 'judaic' },
    samaritanism:   { name: 'Samaritanism',          color: [92, 150, 196], group: 'judaic' },
    hellenism:      { name: 'Hellenism',             color: [196, 170, 86], group: 'pagan' },
    roman_cult:     { name: 'Roman State Cult',      color: [178, 62, 56],  group: 'pagan' },
    nabataean:      { name: 'Nabataean Cult',        color: [206, 128, 60], group: 'pagan' },
    zoroastrianism: { name: 'Zoroastrianism',        color: [150, 84, 168], group: 'iranic' },
    egyptian:       { name: 'Egyptian Cults',        color: [72, 152, 130], group: 'pagan' },
    christianity:   { name: 'Christianity',          color: [172, 68, 100], group: 'christian' },
    islam:          { name: 'Islam',                 color: [52, 138, 86],  group: 'islamic' },
  },

  // Cultures: groups israelite, syrian, hellenic, arab, egyptian, latin, iranian, armenian
  CULTURES: {
    judean:     { name: 'Judean',     color: [60, 104, 180],  group: 'israelite' },
    galilean:   { name: 'Galilean',   color: [96, 138, 200],  group: 'israelite' },
    samaritan:  { name: 'Samaritan',  color: [124, 168, 212], group: 'israelite' },
    idumean:    { name: 'Idumean',    color: [88, 118, 156],  group: 'israelite' },
    nabataean:  { name: 'Nabataean',  color: [214, 138, 66],  group: 'arab' },
    arab:       { name: 'Arab',       color: [186, 116, 52],  group: 'arab' },
    aramean:    { name: 'Aramean',    color: [168, 150, 92],  group: 'syrian' },
    phoenician: { name: 'Phoenician', color: [130, 90, 150],  group: 'syrian' },
    greek:      { name: 'Greek',      color: [206, 182, 96],  group: 'hellenic' },
    egyptian:   { name: 'Egyptian',   color: [80, 158, 138],  group: 'egyptian' },
    roman:      { name: 'Roman',      color: [184, 70, 62],   group: 'latin' },
    armenian:   { name: 'Armenian',   color: [140, 78, 122],  group: 'armenian' },
    persian:    { name: 'Persian',    color: [158, 96, 176],  group: 'iranian' },
    // -- far eras (SPEC §22) --
    israeli:    { name: 'Israeli',       color: [40, 110, 200],  group: 'israeli' },
    arab_modern: { name: 'Arab',         color: [96, 140, 84],   group: 'arab_modern' },
    turkish:    { name: 'Turkish',       color: [200, 84, 72],   group: 'turkish' },
  },

  TAGS: {
    ROM: {
      name: 'Rome', color: [168, 36, 36], religion: 'roman_cult', culture: 'roman', capital: 'Antioch',
      description: 'The empire that does not forgive: legions, siegecraft, and bottomless reserves.',
      ideas: { disciplineMult: 1.12, siegeBonus: 1, reinforceMult: 1.15 },
    },
    JUD: {
      name: 'Judaea', color: [36, 82, 158], religion: 'judaism', culture: 'judean', capital: 'Jerusalem',
      description: 'A people in arms for the Temple — fierce in the hills, fragile in the field.',
      ideas: { moraleMult: 1.10, hillDefBonus: 1, manpowerMult: 0.85 },
    },
    PAR: {
      name: 'Parthia', color: [0, 120, 110], religion: 'zoroastrianism', culture: 'persian', capital: 'Seleucia-Ctesiphon',
      description: 'The rival empire beyond the Euphrates, watching Rome bleed with interest.',
      ideas: { moraleMult: 1.05 },
    },
    NAB: {
      name: 'Nabataea', color: [196, 124, 40], religion: 'nabataean', culture: 'nabataean', capital: 'Petra',
      description: 'Caravan kings of the incense road, rich, cautious, and loyal to whoever wins.',
      ideas: { incomeMult: 1.10 },
    },
    ARM: {
      name: 'Armenia', color: [122, 62, 150], religion: 'zoroastrianism', culture: 'armenian', capital: 'Tigranocerta',
      description: 'A mountain kingdom forever balanced between Rome and Parthia.',
      ideas: { hillDefBonus: 1 },
    },
    AGR: {
      name: 'Kingdom of Agrippa II', color: [214, 120, 120], religion: 'judaism', culture: 'galilean', capital: 'Caesarea Philippi',
      description: 'The last Herodian: a Jewish king who has cast his lot with Rome.',
      ideas: { incomeMult: 1.05 },
    },
    // --- 167 BCE era tags (Maccabean Revolt bookmark) ---
    SEL: {
      name: 'Seleucid Empire', color: [206, 178, 80], religion: 'hellenism', culture: 'greek', capital: 'Antioch',
      description: 'Alexander\'s heirs in the east — vast, glittering, and coming apart at the dynastic seams.',
      ideas: { disciplineMult: 1.08, siegeBonus: 1, incomeMult: 1.05 },
    },
    PTO: {
      name: 'Ptolemaic Egypt', color: [90, 140, 190], religion: 'egyptian', culture: 'greek', capital: 'Alexandria',
      description: 'The granary of the Mediterranean, ruled from Alexandria by Macedonian god-kings.',
      ideas: { incomeMult: 1.15, manpowerMult: 0.9 },
    },
    HAS: {
      name: 'Hasmonean Judaea', color: [40, 96, 170], religion: 'judaism', culture: 'judean', capital: 'Jerusalem',
      description: 'The sons of Mattathias — priests with swords, fighting for the Law in the hills they know.',
      ideas: { moraleMult: 1.12, hillDefBonus: 1, manpowerMult: 0.8 },
    },
    // --- 67 BCE era tags (the Judaean Civil War bookmark) ---
    HYR: {
      name: "Hyrcanus' Judaea", color: [82, 132, 196], religion: 'judaism', culture: 'judean', capital: 'Hebron',
      description: 'The elder brother: weak in himself, strong in Antipater\'s cunning and Nabataean silver.',
      ideas: { incomeMult: 1.1, hillDefBonus: 1 },
    },
    ARI: {
      name: "Aristobulus' Judaea", color: [26, 60, 128], religion: 'judaism', culture: 'judean', capital: 'Jerusalem',
      description: 'The younger brother: the army, the fortresses, and the crown — everything but time.',
      ideas: { moraleMult: 1.1, manpowerMult: 0.9 },
    },
    OSR: {
      name: 'Osrhoene', color: [86, 148, 132], religion: 'hellenism', culture: 'aramean', capital: 'Edessa',
      description: 'The Abgarid kings of Edessa: small, shrewd, and always on the winning side eventually.',
      ideas: { incomeMult: 1.05, hillDefBonus: 1 },
    },
    ADI: {
      name: 'Adiabene', color: [138, 96, 160], religion: 'judaism', culture: 'aramean', capital: 'Arbela',
      description: 'The kingdom beyond the Tigris whose royal house took the God of Israel — and sent grain and swords to Jerusalem.',
      ideas: { manpowerMult: 1.1, legitimacyAdd: 0.05 },
    },
    CHX: {
      name: 'Characene', color: [92, 152, 172], religion: 'hellenism', culture: 'arab', capital: 'Charax',
      description: 'Merchant kings at the head of the Gulf, growing rich on everything that floats.',
      ideas: { incomeMult: 1.15 },
    },
    HER: {
      name: "Herod's Judaea", color: [148, 108, 42], religion: 'judaism', culture: 'idumean', capital: 'Hebron',
      description: 'The Idumean commoner with a Roman decree: a crown of paper, to be made iron.',
      ideas: { incomeMult: 1.1, siegeMult: 1.1 },
    },
    ATG: {
      name: "Antigonus' Judaea", color: [30, 82, 96], religion: 'judaism', culture: 'judean', capital: 'Jerusalem',
      description: 'The last fighting Hasmonean: king and high priest, with Parthia at his back — for now.',
      ideas: { moraleMult: 1.1, hillDefBonus: 1 },
    },
    // ---- 614 CE: the last great war of antiquity ----
    BYZ: {
      name: 'Byzantium', color: [110, 48, 130], religion: 'christianity', culture: 'greek', capital: 'Antioch',
      description: 'Rome that did not fall: the themes, the walls, and God\'s own empire — bleeding from every border.',
      ideas: { disciplineMult: 1.08, siegeBonus: 1 },
    },
    SAS: {
      name: 'Sasanian Persia', color: [188, 128, 44], religion: 'zoroastrianism', culture: 'persian', capital: 'Seleucia-Ctesiphon',
      description: 'The House of Sasan at high tide: the royal banner, the armored lancers, and a King of Kings who dreams of Alexander in reverse.',
      ideas: { moraleMult: 1.05, reinforceMult: 1.1 },
    },
    GHA: {
      name: 'Ghassanids', color: [150, 44, 52], religion: 'christianity', culture: 'arab', capital: 'Bostra',
      description: 'The phylarchs of the desert edge: Rome\'s Arab shield, unpaid for a generation.',
      ideas: { moraleMult: 1.05 },
    },
    // ---- 1948 CE: the War of Independence ----
    ISR: {
      name: 'Israel', color: [36, 104, 196], religion: 'judaism', culture: 'israeli', capital: 'Joppa',
      description: 'A state declared between one war and the next, defended by everyone it has.',
      ideas: { moraleMult: 1.15, reinforceMult: 1.15, manpowerMult: 0.85 },
    },
    EGY: {
      name: 'Egypt', color: [46, 128, 78], religion: 'islam', culture: 'arab_modern', capital: 'Memphis',
      description: 'The largest Arab army in the field — long columns, short supply lines home.',
      ideas: { manpowerMult: 1.15 },
    },
    JOR: {
      name: 'Transjordan', color: [128, 72, 40], religion: 'islam', culture: 'arab_modern', capital: 'Philadelphia',
      description: 'The Arab Legion: small, British-drilled, and the only army in this war that has read its own manuals.',
      ideas: { disciplineMult: 1.12 },
    },
    SYR: {
      name: 'Syria', color: [88, 128, 104], religion: 'islam', culture: 'arab_modern', capital: 'Damascus',
      description: 'Damascus rides south with more conviction than coordination.',
      ideas: {},
    },
    LEB: {
      name: 'Lebanon', color: [170, 40, 66], religion: 'christianity', culture: 'arab_modern', capital: 'Berytus',
      description: 'A merchant republic at war mostly on paper.',
      ideas: { incomeMult: 1.1 },
    },
    IRQ: {
      name: 'Iraq', color: [72, 72, 80], religion: 'islam', culture: 'arab_modern', capital: 'Seleucia-Ctesiphon',
      description: 'An expeditionary army a long way from Baghdad.',
      ideas: { manpowerMult: 1.05 },
    },
    TUR: {
      name: 'Turkey', color: [200, 84, 72], religion: 'islam', culture: 'turkish', capital: 'Iconium',
      description: 'Watching its southern neighbors with studied neutrality.',
      ideas: { disciplineMult: 1.05 },
    },
    SAU: {
      name: 'Saudi Arabia', color: [40, 116, 60], religion: 'islam', culture: 'arab_modern', capital: 'Hegra',
      description: 'The desert kingdom sends a token force and keeps its counsel.',
      ideas: {},
    },
    IRN: {
      name: 'Iran', color: [136, 148, 70], religion: 'islam', culture: 'persian', capital: 'Ecbatana',
      description: 'The old empire east of the war, watching.',
      ideas: {},
    },
    UK: {
      name: 'Britain', color: [156, 64, 92], religion: 'christianity', culture: 'greek', capital: 'Salamis',
      description: 'The departing mandatory power: a garrison on Cyprus and a schedule to keep.',
      ideas: { disciplineMult: 1.1 },
    },
    // ---- formable crowns (SPEC §24): never in a bookmark's activeTags ----
    MLI: {
      name: 'Kingdom of Israel', color: [46, 70, 172], religion: 'judaism', culture: 'judean', capital: 'Jerusalem',
      description: 'The crown of David restored: won by the sword, kept by the Law.',
      ideas: { moraleMult: 1.1, incomeMult: 1.1, legitimacyAdd: 0.2 },
    },
    UAR: {
      name: 'United Arab Republic', color: [26, 96, 54], religion: 'islam', culture: 'arab_modern', capital: 'Memphis',
      description: 'One nation from the Gulf to the sea — for as long as its generals agree.',
      ideas: { manpowerMult: 1.2, incomeMult: 1.05 },
    },
    REB: {
      name: 'Rebels', color: [96, 96, 96], religion: 'hellenism', culture: 'greek', capital: '',
      description: 'Brigands, zealots, and the desperate — every empire breeds them.',
      ideas: { moraleMult: 1.05 },
    },
    WASTE: {
      name: 'Wasteland', color: [70, 66, 60],
      description: 'Trackless desert where armies go to die.',
    },
  },

  // Province buildings (economy/military contract). Sim applies the effects:
  // market  -> local tax & production ×1.2 (only while owner controls it)
  // granary -> +3 support limit and −1 attrition in the province
  // walls   -> one-time +1 fort level (max 3) and +1,000 garrison on completion
  // shrine  -> −1.5 local unrest
  BUILDINGS: {
    market:  { name: 'Market',  cost: 60,  months: 12, desc: 'Local tax and production +20%' },
    granary: { name: 'Granary', cost: 50,  months: 9,  desc: '+3 support limit; -1 attrition here' },
    walls:   { name: 'Walls',   cost: 100, months: 18, desc: '+1 fort level (max 3), +1,000 garrison' },
    shrine:  { name: 'Shrine',  cost: 40,  months: 9,  desc: '-1.5 local unrest' },
    // The age of flight (SPEC §29): gated on military tech, parks air wings.
    airfield: { name: 'Airfield', cost: 120, months: 10, tech: 19,
      desc: 'A runway and hangars: base up to 2 air wings, whose fighters cover battles nearby' },
  },

  // Air power (SPEC §29): wings live at airfields, rebase freely between
  // your own, cover friendly battles within `rangeHops`, and are destroyed
  // on the ground if their field falls.
  AIR: {
    wingCost: 40,          // talents to raise one air wing (crews included)
    wingUpkeep: 1,         // talents/month per wing
    wingsPerField: 2,      // hangar space per airfield
    rangeHops: 2,          // provinces of combat cover / raid reach from the base
    raidCdDays: 12,        // days to rearm between bombing raids
  },

  BASE: {
    regSize: 1000,                     // men per regiment
    regCost: { inf: 10, cav: 25 },     // talents to recruit one regiment
    maintPerReg: 0.35,                 // talents/month upkeep per regiment
    moraleBase: 3.0,                   // base max morale before multipliers
    moraleRecoveryPerMonth: 0.6,       // morale regained per month out of battle
    taxPerDevPerYear: 1.0,             // talents/year per point of tax dev
    prodMult: 0.6,                     // production income scale: price × prod dev × this / 12
    mpPerDev: 350,                     // max manpower per point of mp dev
    mpRecoveryMonths: 36,              // months to refill manpower pool from empty
    supportLimitBase: 12,              // regiments supportable in any province before attrition
    supportLimitPerDev: 1.5,           // extra supported regiments per total dev point
    fortGarrisonPerLevel: 1000,        // garrison men per fort level
    siegePerFortLevel: 12,             // baseline days of siege work per fort level (progress divisor)
    unrestRevoltThreshold: 5,          // unrest above this accumulates revoltProgress
    revoltFireAt: 100,                 // revoltProgress at which rebels rise
    rebelSizePerDev: 0.4,              // rebel regiments per point of mp dev
    warExhaustionMax: 20,              // hard cap on war exhaustion
    startTreasury: {},                 // per-tag starting treasuries are set by the bookmark
  },

  UNREST: {
    heathen: 3,                // province religion in a different group than owner's
    sameGroupHeretic: 1.5,     // same religious group, different religion
    wrongCultureGroup: 1,      // province culture group differs from owner's culture group
    occupied: 3,               // controller !== owner
    perWarExhaustion: 0.25,    // per point of owner war exhaustion
    perNegativeStability: 1,   // per point of stability below 0
    perPositiveStability: -0.75, // per point of stability above 0
  },
};
