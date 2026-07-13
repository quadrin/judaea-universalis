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

  // Religions: groups 'judaic' | 'pagan' | 'iranic'
  RELIGIONS: {
    judaism:        { name: 'Second Temple Judaism', color: [46, 96, 178],  group: 'judaic' },
    samaritanism:   { name: 'Samaritanism',          color: [92, 150, 196], group: 'judaic' },
    hellenism:      { name: 'Hellenism',             color: [196, 170, 86], group: 'pagan' },
    roman_cult:     { name: 'Roman State Cult',      color: [178, 62, 56],  group: 'pagan' },
    nabataean:      { name: 'Nabataean Cult',        color: [206, 128, 60], group: 'pagan' },
    zoroastrianism: { name: 'Zoroastrianism',        color: [150, 84, 168], group: 'iranic' },
    egyptian:       { name: 'Egyptian Cults',        color: [72, 152, 130], group: 'pagan' },
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
