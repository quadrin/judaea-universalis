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
    // "Wasteland" describes land cover, not political or physical state.
    // Individual map cells decide whether they are currently impassable; this
    // lets a desert sit inside sovereign borders and later be settled.
    wasteland: { name: 'Wasteland', color: [86, 82, 74],    moveCost: 2.5,  defBonus: 0, attrition: 5 },
  },

  // A province's habitation is independent of terrain, ownership and army
  // passability. Regional modernization will advance through these stable tiers.
  HABITATION: {
    uninhabited: { name: 'Uninhabited', level: 0 },
    frontier:    { name: 'Frontier',    level: 1 },
    rural:       { name: 'Rural',       level: 2 },
    town:        { name: 'Town',        level: 3 },
    urban:       { name: 'Urban',       level: 4 },
  },
  // A settlement project (actions.settleProvince, SPEC §43) raises a settleable
  // province one habitation tier — clearing land, planting a frontier, growing a
  // town. It spends influence, runs for a few months, and grants a little
  // development on completion. Only prosperity (yearly growth + develop) ever
  // makes the final leap to `urban`; settlement caps at `town`.
  SETTLEMENT: {
    maxTier: 3,          // habitation level a project can reach (town); urban is earned, not founded
    baseCost: 40,        // influence points, plus perTier per level of the target tier
    perTier: 35,
    months: 6,           // duration of one settlement project
    devReward: { tax: 1, prod: 1 }, // development added when the project completes
    unrest: 1,           // temporary unrest while the newcomers settle in
    unrestMonths: 6,
  },
  // An expedition into the unclaimed waste (SPEC §64): soldiers from an army
  // beside an ownerless wasteland pitch a camp there; a settlement project
  // plants the frontier; and annexation makes it a province of the realm.
  EXPEDITION: {
    men: 1000,     // soldiers detached from the adjacent army to hold the camp
    treasury: 50,  // talents of supplies to put the columns on the trail
    annexGov: 50,  // governance points to annex once the frontier is planted
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
    CMG: { aggression: 0.5, caution: 1.4 },
    CYZ: { aggression: 1.3, caution: 0.8 },
    ITU: { aggression: 0.8, caution: 1.1 },
    // -- v5.4: the wider frame's ancient north --
    // Pontus appears twice, both times spent: Pharnaces after the treaty of
    // 179, Mithridates after Lucullus. A wary kingdom, not a conqueror.
    PNT: { aggression: 0.7, caution: 1.3 },
    // -- 614 CE --
    // -- 529 CE --
    // A four-province rising that has to choose its moment: it strikes hard
    // when it strikes, and it cannot afford to be anywhere carelessly.
    SAM: { aggression: 1.15, caution: 1.35 },
    // -- 614 CE --
    BYZ: { aggression: 0.9, caution: 1.1, ponderous: true },
    SAS: { aggression: 1.3, caution: 0.8, ponderous: true },
    GHA: { aggression: 0.6, caution: 1.3 },
    RSH: { aggression: 1.35, caution: 0.75, ponderous: true },
    // -- 1948 CE --
    ISR: { aggression: 1.1, caution: 0.9 },
    EGY: { aggression: 1.0, caution: 1.0 },
    JOR: { aggression: 0.8, caution: 1.1 },
    SYR: { aggression: 1.1, caution: 0.9 },
    LEB: { aggression: 0.2, caution: 1.8 },
    IRQ: { aggression: 0.9, caution: 1.0 },
    TUR: { aggression: 0.1, caution: 2.0 },
    GRC: { aggression: 0.3, caution: 1.6 },
    SAU: { aggression: 0.2, caution: 1.8 },
    IRN: { aggression: 0.1, caution: 2.0 },
    UK: { aggression: 0.1, caution: 2.0 },
    ITA: { aggression: 0.1, caution: 2.0 },
    // formable crowns (SPEC §24)
    MLI: { aggression: 1.0, caution: 1.0 },
    UAR: { aggression: 1.2, caution: 0.9, ponderous: true },
    // The republic that walked out of the union (SPEC §105): the most
    // coup-prone state in the region, and the one most convinced it is owed
    // the Golan.
    SAR: { aggression: 1.3, caution: 0.8 },
    // A rising with no rear area, no treasury and nothing to negotiate with
    // (SPEC §129). It attacks because standing still is the one thing it
    // cannot afford.
    LUK: { aggression: 1.8, caution: 0.3 },
    // -- the political west (SPEC §173). Missing tags default to {1, 1}. --
    // Carthage is bound by treaty from any war without Rome's leave; Masinissa
    // built a fifty-year reign on knowing it. The Lusitanians, Dacians and the
    // steppe raid because raiding is the economy; the khaganates are empires
    // and move like the other ponderous ones.
    CAR: { aggression: 0.4, caution: 1.6 },
    NUM: { aggression: 1.15, caution: 0.9 },
    MAU: { aggression: 0.6, caution: 1.3 },
    GRM: { aggression: 0.3, caution: 1.7 },
    MAS: { aggression: 0.2, caution: 1.8 },
    AVN: { aggression: 1.15, caution: 0.9 },
    BLG: { aggression: 1.1, caution: 0.95 },
    CTB: { aggression: 1.1, caution: 1.0 },
    LUS: { aggression: 1.25, caution: 0.85 },
    THR: { aggression: 0.9, caution: 1.05 },
    DAC: { aggression: 1.25, caution: 0.85 },
    SCO: { aggression: 1.2, caution: 0.9 },
    SRM: { aggression: 1.25, caution: 0.8 },
    SCY: { aggression: 1.1, caution: 0.95 },
    BOS: { aggression: 0.5, caution: 1.4 },
    CHE: { aggression: 1.2, caution: 0.9 },
    CHA: { aggression: 1.15, caution: 0.9 },
    SUE: { aggression: 1.1, caution: 1.0 },
    OST: { aggression: 0.9, caution: 1.1, ponderous: true },
    VAN: { aggression: 1.0, caution: 1.0 },
    VIS: { aggression: 0.9, caution: 1.1 },
    FRK: { aggression: 1.15, caution: 0.95, ponderous: true },
    LMB: { aggression: 1.1, caution: 0.95 },
    SAX: { aggression: 1.15, caution: 0.9 },
    AVA: { aggression: 1.3, caution: 0.75, ponderous: true },
    TRK: { aggression: 1.2, caution: 0.85, ponderous: true },
    BGR: { aggression: 1.3, caution: 0.75 },
    SLV: { aggression: 1.15, caution: 0.9 },
    // 1948's west is scenery with courts: nobody here marches on the Levant.
    FRA: { aggression: 0.1, caution: 2.0 },
    SPA: { aggression: 0.1, caution: 2.0 },
    POR: { aggression: 0.05, caution: 2.0 },
    NLD: { aggression: 0.05, caution: 2.0 },
    DEN: { aggression: 0.05, caution: 2.0 },
    SWE: { aggression: 0.05, caution: 2.0 },
    POL: { aggression: 0.1, caution: 2.0 },
    CZE: { aggression: 0.1, caution: 2.0 },
    SOV: { aggression: 0.2, caution: 1.8, ponderous: true },
    USA: { aggression: 0.05, caution: 2.0, ponderous: true },
    GER: { aggression: 0.05, caution: 2.0 },
    AUT: { aggression: 0.05, caution: 2.0 },
    HUN: { aggression: 0.1, caution: 2.0 },
    YUG: { aggression: 0.15, caution: 1.9 },
    ALB: { aggression: 0.1, caution: 2.0 },
    BUL: { aggression: 0.1, caution: 2.0 },
    ROU: { aggression: 0.1, caution: 2.0 },
    IRL: { aggression: 0.05, caution: 2.0 },
    SUI: { aggression: 0.05, caution: 2.0 },
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
    CMG: 'monarchy', CYZ: 'monarchy', ITU: 'theocracy',
    SAM: 'theocracy', // the High Priesthood is the office; a king is the thing in dispute
    BYZ: 'monarchy', SAS: 'monarchy', GHA: 'tribal', RSH: 'theocracy',
    PNT: 'monarchy',
    ISR: 'republic', EGY: 'monarchy', JOR: 'monarchy', SYR: 'republic',
    LEB: 'republic', IRQ: 'monarchy', TUR: 'republic', SAU: 'monarchy',
    IRN: 'monarchy', UK: 'monarchy', ITA: 'republic',
    MLI: 'monarchy', UAR: 'republic', SAR: 'republic', LUK: 'monarchy',
    REB: 'tribal',
    // -- the political west (SPEC §173) --
    // Carthage's suffetes and Massalia's timouchoi are elected; the Aedui
    // choose a vergobret for a single year (Caesar BG I.16). Tacitus says the
    // Suiones and Gothones obey kings where the rest of Germania will not
    // (Germania 43-44), so those two are crowned and their neighbors are not.
    CAR: 'republic', MAS: 'republic', AED: 'republic',
    NUM: 'monarchy', MAU: 'monarchy', GRM: 'monarchy', AVN: 'monarchy',
    SEQ: 'monarchy', NOR: 'monarchy', DRD: 'monarchy', THR: 'monarchy',
    DAC: 'monarchy', BOS: 'monarchy', SCY: 'monarchy', HIB: 'monarchy',
    SCN: 'monarchy', GOT: 'monarchy',
    BLG: 'tribal', ARO: 'tribal', AQT: 'tribal', BOI: 'tribal',
    CTB: 'tribal', LUS: 'tribal', DLM: 'tribal', SCO: 'tribal',
    SRM: 'tribal', VEN: 'tribal', BRT: 'tribal', CAL: 'tribal',
    SUE: 'tribal', CHE: 'tribal', CHA: 'tribal', FRS: 'tribal',
    CIM: 'tribal', AES: 'tribal',
    OST: 'monarchy', VAN: 'monarchy', VIS: 'monarchy', FRK: 'monarchy',
    BGD: 'monarchy', GEP: 'monarchy', LMB: 'monarchy', SAX: 'monarchy',
    AVA: 'monarchy', TRK: 'monarchy',
    BGR: 'tribal', SLV: 'tribal',
    // 1948: Franco's Spain holds no elections and answers the monarchy test
    // better than the republic one; the people's republics hold elections
    // with one answer, which is still the republic succession rule.
    FRA: 'republic', POR: 'republic', POL: 'republic', CZE: 'republic',
    SOV: 'republic', GER: 'republic', AUT: 'republic', HUN: 'republic',
    USA: 'republic',
    YUG: 'republic', ALB: 'republic', BUL: 'republic', ROU: 'republic',
    IRL: 'republic', SUI: 'republic',
    SPA: 'monarchy', NLD: 'monarchy', DEN: 'monarchy', SWE: 'monarchy',
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
    // The modern age's prize (SPEC §52): assigned only by bookmark `goods`
    // overlays (1948 Kirkuk/Khuzestan/al-Hasa) — no base-map province carries
    // it, so the ancient chapters never see a barrel.
    oil:        { name: 'Oil',        price: 5.5,  color: [44, 42, 48] },
  },

  // Religions: groups 'judaic' | 'pagan' | 'iranic' | 'christian' | 'islamic'
  RELIGIONS: {
    judaism:        { name: 'Judaism',               color: [46, 96, 178],  group: 'judaic' },
    samaritanism:   { name: 'Samaritanism',          color: [92, 150, 196], group: 'judaic' },
    hellenism:      { name: 'Hellenism',             color: [196, 170, 86], group: 'pagan' },
    roman_cult:     { name: 'Roman State Cult',      color: [178, 62, 56],  group: 'pagan' },
    nabataean:      { name: 'Nabataean Cult',        color: [206, 128, 60], group: 'pagan' },
    zoroastrianism: { name: 'Zoroastrianism',        color: [150, 84, 168], group: 'iranic' },
    egyptian:       { name: 'Egyptian Cults',        color: [72, 152, 130], group: 'pagan' },
    christianity:   { name: 'Christianity',          color: [172, 68, 100], group: 'christian' },
    islam:          { name: 'Islam',                 color: [52, 138, 86],  group: 'islamic' },
    // The theosebeis (SPEC §104): gentiles who kept the sabbath, the food
    // laws and the ethics of the synagogue without accepting circumcision.
    // Not a religion with a priesthood — a standing between two of them, and
    // the recruiting ground both the Jewish and the Christian mission drew
    // on. Grouped with the pagan cults, because that is what a census, a
    // governor and an owner's state church all counted them as.
    godfearers:     { name: 'God-fearers',           color: [150, 132, 120], group: 'pagan' },
    // -- the western and northern frame (SPEC §160) --
    // The map reaches Britain now, and a base atlas that called the Britons
    // Roman-cult in 167 BCE would be lying in the one place the player can
    // check. These are all `pagan` by group, which is the only claim the
    // simulation makes of them: a Roman governor's province with one of these
    // faiths is foreign-faith ground, and behaves like one.
    druidic:        { name: 'Druidic Rites',         color: [104, 142, 92],  group: 'pagan' },
    germanic_cult:  { name: 'Germanic Cults',        color: [128, 138, 156], group: 'pagan' },
    punic:          { name: 'Punic Cults',           color: [176, 108, 76],  group: 'pagan' },
    thracian_cult:  { name: 'Thracian Cults',        color: [148, 118, 168], group: 'pagan' },
    steppe_cults:   { name: 'Steppe Cults',          color: [166, 152, 104], group: 'pagan' },
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
    // -- the western and northern frame (SPEC §160) --
    // Each takes its own group, which is the whole of what it does: unrest.js
    // reads culture GROUPS, and a Gaulish province under a Roman owner should
    // read as foreign-culture ground because it was. Carthage and the African
    // coast keep `phoenician` — the colonists' own culture, already here.
    celtic:     { name: 'Celtic',     color: [92, 152, 116],  group: 'celtic' },
    iberian:    { name: 'Iberian',    color: [190, 154, 74],  group: 'iberian' },
    mauri:      { name: 'Mauri',      color: [198, 132, 88],  group: 'libyan' },
    germanic:   { name: 'Germanic',   color: [110, 128, 160], group: 'germanic' },
    thracian:   { name: 'Thracian',   color: [156, 108, 176], group: 'thracian' },
    illyrian:   { name: 'Illyrian',   color: [120, 140, 188], group: 'illyrian' },
    sarmatian:  { name: 'Sarmatian',  color: [176, 160, 100], group: 'scythian' },
    // The Slavs (SPEC §173): a people the 614 map settles across the Balkans
    // and the 1948 map inherits half of Europe from. No base-atlas cell
    // carries it — it arrives through the political maps' culture overlays.
    slavic:     { name: 'Slavic',     color: [122, 158, 92],  group: 'slavic' },
    // -- far eras (SPEC §22) --
    israeli:    { name: 'Israeli',       color: [40, 110, 200],  group: 'israeli' },
    arab_modern: { name: 'Arab',         color: [96, 140, 84],   group: 'arab_modern' },
    turkish:    { name: 'Turkish',       color: [200, 84, 72],   group: 'turkish' },
  },

  // Jewish by religion, never part of the land (SPEC §133). These are
  // diaspora communities that happen to sit on the map: Onias' temple
  // settlement in the Heliopolite nome, the royal house of Adiabene that
  // converted under Izates, the academies of Babylonia, and the oasis of the
  // Hijaz. A peace that awards Judaea "every Jewish province it holds" must
  // not hand it any of them — Leontopolis was a Ptolemaic military colony that
  // Vespasian closed in 73 and was never Judaean territory in any century this
  // game covers.
  //
  // This is about TERRITORY only. A card that mourns the Temple in every
  // Jewish province is right to include all four, and does.
  DIASPORA: ['Leontopolis', 'Arbela', 'Nehardea', 'Khaybar'],

  TAGS: {
    ROM: {
      // v5.4: Roma is on the map, but the capital stays the eastern command —
      // every scripted war is eastern, and the AI rallies (and the growth
      // bonus lands) where the game is actually played.
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
    CMG: {
      name: 'Commagene', color: [176, 92, 58], religion: 'hellenism', culture: 'aramean', capital: 'Samosata',
      description: 'The kingdom above the Euphrates crossings: Iranian, Hellenic, and difficult for any empire to recover.',
      ideas: { hillDefBonus: 1, incomeMult: 1.05 },
    },
    CYZ: {
      name: 'Cyzicene Syria', color: [142, 94, 168], religion: 'hellenism', culture: 'greek', capital: 'Damascus',
      description: 'The southern Seleucid crown of Antiochus Cyzicenus — one dynasty, two kings, and a war without an arbiter.',
      ideas: { moraleMult: 1.05, reinforceMult: 0.95 },
    },
    ITU: {
      name: 'Ituraea', color: [112, 132, 68], religion: 'hellenism', culture: 'aramean', capital: 'Chalcis',
      description: 'The mountain tetrarchy of Chalcis: priest-kings, archers, and tolls on every road through Lebanon.',
      ideas: { hillDefBonus: 1, manpowerMult: 1.05 },
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
    // ---- v5.4: the wider frame's ancient north ----
    PNT: {
      name: 'Pontus', color: [0, 110, 140], religion: 'hellenism', culture: 'greek', capital: 'Sinope',
      description: 'The kingdom of the Black Sea coast — Persian blood, Greek cities, and a long memory of Rome.',
      ideas: { moraleMult: 1.05, navalMult: 1.05 },
    },
    // ---- 614 CE: the last great war of antiquity ----
    SAM: {
      name: 'Samaria', color: [92, 150, 196], religion: 'samaritanism', culture: 'samaritan', capital: 'Neapolis',
      description: 'The Shamerim — the keepers: an Israelite people with its own Torah, its own priesthood '
        + 'and its own mountain, four hill provinces deep inside a Christian empire.',
      // What four provinces of hill country actually give you: ground you know
      // and men who do not have far to go. Nothing else.
      ideas: { hillDefBonus: 1, manpowerMult: 1.08, disciplineMult: 0.96 },
    },
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
    RSH: {
      name: 'Rashidun Caliphate', color: [38, 116, 72], religion: 'islam', culture: 'arab', capital: 'Hegra',
      description: 'The polity rising beyond the southern map edge: mobile, zealous, and entering an exhausted imperial world.',
      ideas: { moraleMult: 1.1, manpowerMult: 1.1, reinforceMult: 1.08 },
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
      // The name it opens 1948 with. A kingdom holding both banks of the river
      // drops the preposition in April 1949 (SPEC §107, ev_i_kingdom_of_jordan)
      // and this tag is renamed in place; one pushed back over the river keeps
      // the mandate's name.
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
    GRC: {
      name: 'Greece', color: [52, 106, 180], religion: 'hellenism', culture: 'greek', capital: 'Corinth',
      description: 'The leagues and cities of Hellas — old in glory, careful in war.',
      ideas: {},
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
    ITA: {
      name: 'Italy', color: [46, 139, 87], religion: 'christianity', culture: 'roman', capital: 'Roma',
      description: 'The republic reborn from the war — watching the eastern sea it once ruled.',
      ideas: { incomeMult: 1.05 },
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
    // The state that walks out of that union (SPEC §105). Syria kept the
    // name it took in 1961 for the rest of the century, through eight
    // governments in nine years and then one for thirty: a republic whose
    // politics are made in the officer corps, whose army is better at
    // surviving coups than wars, and which never for one year stops
    // regarding the Golan as a temporarily mislaid province.
    SAR: {
      name: 'Syrian Arab Republic', color: [70, 118, 92], religion: 'islam', culture: 'arab_modern', capital: 'Damascus',
      description: 'Damascus after the union: a republic of officers, and the last Arab capital that will not sign.',
      ideas: { manpowerMult: 1.08, moraleMult: 1.05, incomeMult: 0.95 },
    },
    // The diaspora rising of 115–117 (SPEC §129). It is a SEPARATE STATE and
    // not Judaea, because that is the whole historical point of it: Cyrene,
    // Cyprus, Egypt and Roman-held Mesopotamia rose while Judaea did not, and
    // the communities that rose were Greek-speaking, had never been governed
    // from Jerusalem, and answered to nobody there. Eusebius (HE IV.2.4) says
    // the Jews of Cyrene "appointed as their king one Lukuas"; Dio calls the
    // leader Andreas. That royal style is the only statehood the rising ever
    // claimed and it is enough to put it on the map under its own colour.
    //
    // Judaism and Greek: the pairing IS the argument. A player who joins this
    // war is allying with a foreign power that happens to share his religion,
    // which is exactly the relationship the period was trying to work out.
    LUK: {
      name: 'The Host of Lukuas', color: [150, 92, 138], religion: 'judaism', culture: 'greek', capital: 'Cyrene',
      description: 'The rising of the Greek-speaking diaspora, under a king the Roman sources name twice and differently.',
      ideas: { moraleMult: 1.15, manpowerMult: 1.1, incomeMult: 0.8 },
    },
    // ---- the political west (SPEC §173): the courts of the §160 ground ----
    // Every one exists because a political map in js/data/political_maps.js
    // seats it somewhere in some century. None appears in a chapter that does
    // not list it in activeTags, and none holds a single province at the old
    // world's full levy — the shares in that file are what let sixty new
    // courts onto eight tuned boards without rewriting one of them.
    //
    // -- the ancient Maghreb --
    CAR: {
      name: 'Carthage', color: [148, 52, 96], religion: 'punic', culture: 'phoenician', capital: 'Carthago',
      names: 'punic',
      description: 'The republic of the sea that lost the sea: suffetes, silver, and a treaty that forbids it a war.',
      ideas: { incomeMult: 1.1, navalMult: 1.05 },
    },
    NUM: {
      name: 'Numidia', color: [176, 140, 72], religion: 'punic', culture: 'mauri', capital: 'Cirta',
      names: 'libyan',
      description: 'Masinissa\'s kingdom: the finest light horse in the world, and a lawsuit against Carthage every year.',
      ideas: { manpowerMult: 1.05 },
    },
    MAU: {
      name: 'Mauretania', color: [150, 96, 44], religion: 'punic', culture: 'mauri', capital: 'Volubilis',
      names: 'libyan',
      description: 'The kings of the far west, from the Pillars to the desert\'s edge — last to be conquered, first to come back.',
      ideas: {},
    },
    GRM: {
      name: 'The Garamantes', color: [188, 158, 96], religion: 'punic', culture: 'mauri', capital: 'Garama',
      names: 'libyan',
      description: 'The lords of the Fezzan oases, who carry the Sahara\'s trade and cannot be followed home.',
      ideas: { incomeMult: 1.05 },
    },
    // -- the free west: Iberia and Gaul --
    MAS: {
      name: 'Massalia', color: [90, 140, 160], religion: 'hellenism', culture: 'greek', capital: 'Massilia',
      description: 'The oldest Greek city of the west: a small navy, a great harbor, and Rome\'s oldest friendship.',
      ideas: { incomeMult: 1.1 },
    },
    CTB: {
      name: 'The Celtiberians', color: [156, 84, 48], religion: 'druidic', culture: 'celtic', capital: 'Numantia',
      names: 'iberian',
      description: 'The hill confederacies of the meseta. Numantia has not fallen, and will not for a generation.',
      ideas: { hillDefBonus: 1 },
    },
    LUS: {
      name: 'Lusitania', color: [124, 110, 58], religion: 'druidic', culture: 'iberian', capital: 'Bracara',
      names: 'iberian',
      description: 'The raiders of the western hills, with the Callaeci and Astures at their backs — poor in silver, rich in war.',
      ideas: { hillDefBonus: 1, moraleMult: 1.05 },
    },
    AVN: {
      name: 'The Arverni', color: [70, 110, 60], religion: 'druidic', culture: 'celtic', capital: 'Avaricum',
      description: 'The hegemons of Gaul: Luernius scatters gold from his chariot, and the peoples ride under his clientage.',
      ideas: { manpowerMult: 1.05 },
    },
    AED: {
      name: 'The Aedui', color: [96, 130, 84], religion: 'druidic', culture: 'celtic', capital: 'Augustodunum',
      description: 'The senate of Bibracte and its elected vergobret: the Arverni\'s rivals, and everyone\'s brokers.',
      ideas: {},
    },
    SEQ: {
      name: 'The Sequani', color: [104, 124, 96], religion: 'druidic', culture: 'celtic', capital: 'Vesontio',
      description: 'The people of the Doubs and the gate of the upper Rhine, who will one day open it and regret it.',
      ideas: {},
    },
    BLG: {
      name: 'The Belgae', color: [66, 98, 86], religion: 'druidic', culture: 'celtic', capital: 'Durocortorum',
      description: 'The bravest of the three parts, as their conqueror wrote, being furthest from the traders.',
      ideas: { moraleMult: 1.05 },
    },
    ARO: {
      name: 'The Armoricans', color: [78, 118, 124], religion: 'druidic', culture: 'celtic', capital: 'Darioritum',
      description: 'The sea league of the west: the Veneti\'s oak ships, and every harbor between two tides.',
      ideas: { navalMult: 1.05 },
    },
    AQT: {
      name: 'The Aquitani', color: [140, 124, 68], religion: 'druidic', culture: 'celtic', capital: 'Burdigala',
      description: 'The peoples between the Garonne and the mountains, nearer Iberia than Gaul in everything but the map.',
      ideas: {},
    },
    NOR: {
      name: 'Noricum', color: [110, 120, 140], religion: 'druidic', culture: 'celtic', capital: 'Virunum',
      description: 'The kingdom of the eastern Alps, whose steel every legion buys and whose friendship every consul keeps.',
      ideas: { disciplineMult: 1.03 },
    },
    BOI: {
      name: 'The Boii', color: [128, 140, 90], religion: 'druidic', culture: 'celtic', capital: 'Boiohaemum',
      description: 'The people who named Bohemia and fought everyone from the Po to the Danube bend.',
      ideas: {},
    },
    // -- the islands --
    BRT: {
      name: 'The Britons', color: [60, 120, 110], religion: 'druidic', culture: 'celtic', capital: 'Britannia',
      description: 'The kings of the tin island: chariots on the beaches, and the druids\' groves behind them.',
      ideas: {},
    },
    CAL: {
      name: 'Caledonia', color: [90, 80, 130], religion: 'druidic', culture: 'celtic', capital: 'Caledonia',
      description: 'The peoples beyond every wall anyone will ever build, painted and unconquered.',
      ideas: { hillDefBonus: 1 },
    },
    HIB: {
      name: 'Hibernia', color: [50, 130, 80], religion: 'druidic', culture: 'celtic', capital: 'Hibernia',
      names: 'gaelic',
      description: 'The island of kings-of-kings, where no legion ever landed and every cattle-raid is an epic.',
      ideas: {},
    },
    // -- Germania and the north --
    SUE: {
      name: 'The Suebi', color: [100, 110, 120], religion: 'germanic_cult', culture: 'germanic', capital: 'Semnones',
      description: 'The oldest and noblest of the Germans, by their own account, which their neighbors are made to share.',
      ideas: { moraleMult: 1.05 },
    },
    CHE: {
      name: 'The Cherusci', color: [130, 120, 100], religion: 'germanic_cult', culture: 'germanic', capital: 'Teutoburgium',
      description: 'The people of the forest where three eagles fell — feuding themselves to ruin ever since.',
      ideas: { moraleMult: 1.05 },
    },
    CHA: {
      name: 'The Chatti', color: [110, 100, 80], religion: 'germanic_cult', culture: 'germanic', capital: 'Chatti',
      description: 'Germans who dig trenches and post watches: others go to battle, wrote Tacitus — the Chatti go to war.',
      ideas: { disciplineMult: 1.03 },
    },
    FRS: {
      name: 'The Frisii', color: [120, 140, 150], religion: 'germanic_cult', culture: 'germanic', capital: 'Frisia',
      description: 'The people of the terpen and the tide, who once hanged Rome\'s tax-farmers in their own sacred grove.',
      ideas: {},
    },
    CIM: {
      name: 'The Cimbri', color: [140, 150, 160], religion: 'germanic_cult', culture: 'germanic', capital: 'Cimbria',
      description: 'A small people with a great glory: the north that once emptied itself at Italy and nearly kept it.',
      ideas: {},
    },
    SCN: {
      name: 'The Suiones', color: [150, 160, 140], religion: 'germanic_cult', culture: 'germanic', capital: 'Scandia',
      description: 'The ship-kings beyond the water, strong in men, arms, and fleets — and obeyed, which amazed Tacitus.',
      ideas: { navalMult: 1.05 },
    },
    GOT: {
      name: 'The Gothones', color: [110, 130, 150], religion: 'germanic_cult', culture: 'germanic', capital: 'Gothiscandza',
      names: 'gothic',
      description: 'The people at the Vistula mouth, ruled by kings a little more strictly than other Germans — going somewhere.',
      ideas: {},
    },
    AES: {
      name: 'The Aestii', color: [190, 150, 70], religion: 'germanic_cult', culture: 'germanic', capital: 'Aestii',
      description: 'The amber-gatherers of the eastern shore, who alone farm the sea\'s gold and wonder why anyone pays.',
      ideas: {},
    },
    // -- the Danube, Illyricum and Thrace --
    DLM: {
      name: 'The Delmatae', color: [130, 100, 120], religion: 'thracian_cult', culture: 'illyrian', capital: 'Delminium',
      description: 'The hill federation behind the Adriatic shore, which Rome will declare conquered five separate times.',
      ideas: { hillDefBonus: 1 },
    },
    SCO: {
      name: 'The Scordisci', color: [100, 80, 100], religion: 'thracian_cult', culture: 'illyrian', capital: 'Singidunum',
      description: 'The Celts of the Save mouth who broke Macedon\'s marches and marched on Delphi for the second time.',
      ideas: {},
    },
    DRD: {
      name: 'Dardania', color: [90, 90, 120], religion: 'thracian_cult', culture: 'illyrian', capital: 'Naissus',
      description: 'The kingdom above Macedon, its oldest enemy and most patient one.',
      ideas: { hillDefBonus: 1 },
    },
    THR: {
      name: 'Thrace', color: [170, 90, 110], religion: 'thracian_cult', culture: 'thracian', capital: 'Philippopolis',
      names: 'thracian',
      description: 'The Odrysian kingdom: horsemen, peltasts and gold-masked kings between two empires\' roads.',
      ideas: { moraleMult: 1.05 },
    },
    DAC: {
      name: 'Dacia', color: [196, 110, 44], religion: 'thracian_cult', culture: 'thracian', capital: 'Sarmizegetusa',
      names: 'thracian',
      description: 'The mountain kingdom of the Getae, which believes itself immortal and will make Rome test it.',
      ideas: { hillDefBonus: 1, moraleMult: 1.05 },
    },
    // -- the Pontic world --
    BOS: {
      name: 'The Bosporan Kingdom', color: [70, 130, 170], religion: 'hellenism', culture: 'greek', capital: 'Panticapaeum',
      description: 'The grain kings of the straits: the oldest Greek monarchy, and the longest-lived client crown there will ever be.',
      ideas: { incomeMult: 1.1 },
    },
    SCY: {
      name: 'Scythia', color: [150, 130, 60], religion: 'steppe_cults', culture: 'sarmatian', capital: 'Tauria',
      names: 'scythian',
      description: 'The royal Scythians of the peninsula, farming now, taxing the Greeks, and remembering the whole steppe.',
      ideas: { moraleMult: 1.05 },
    },
    SRM: {
      name: 'Sarmatia', color: [120, 100, 50], religion: 'steppe_cults', culture: 'sarmatian', capital: 'Sarmatia',
      names: 'scythian',
      description: 'The lance-bearing peoples who took the grass from the Scythians: Roxolani, Aorsi, and the ones after them.',
      ideas: { moraleMult: 1.05 },
    },
    VEN: {
      name: 'The Venedae', color: [100, 120, 100], religion: 'steppe_cults', culture: 'sarmatian', capital: 'Venedia',
      description: 'The forest people east of the Germans, whom every geographer names and none has met.',
      ideas: {},
    },
    // -- the late-antique west (529, 614) --
    OST: {
      name: 'The Ostrogoths', color: [90, 90, 160], religion: 'christianity', culture: 'germanic', capital: 'Ravenna',
      names: 'gothic',
      description: 'Theodoric\'s Italy under Theodoric\'s grandchild: Roman consuls, Gothic spears, and a regent holding both.',
      ideas: { disciplineMult: 1.05 },
    },
    VAN: {
      name: 'The Vandals', color: [60, 100, 140], religion: 'christianity', culture: 'germanic', capital: 'Carthago',
      names: 'gothic',
      description: 'The kingdom of Carthage and the islands: the one barbarian crown that took to the sea, and Rome\'s grain with it.',
      ideas: { navalMult: 1.1 },
    },
    VIS: {
      name: 'The Visigoths', color: [150, 120, 40], religion: 'christianity', culture: 'germanic', capital: 'Toletum',
      names: 'gothic',
      description: 'The kingdom of Toledo: Roman law in Gothic hands, and councils that crown and uncrown kings.',
      ideas: {},
    },
    FRK: {
      name: 'The Franks', color: [40, 80, 140], religion: 'christianity', culture: 'germanic', capital: 'Lutetia',
      names: 'frankish',
      description: 'Clovis\' heirs at Paris: the one barbarian crown baptized into the bishops\' church, and the one that lasts.',
      ideas: { disciplineMult: 1.05, manpowerMult: 1.05 },
    },
    BGD: {
      name: 'Burgundy', color: [140, 70, 50], religion: 'christianity', culture: 'germanic', capital: 'Lugdunum',
      names: 'frankish',
      description: 'The kingdom of the Rhône with the best law-code and the worst borders of its generation.',
      ideas: {},
    },
    GEP: {
      name: 'The Gepids', color: [120, 90, 60], religion: 'christianity', culture: 'germanic', capital: 'Singidunum',
      names: 'gothic',
      description: 'The Goths\' slower cousins, holding the Tisza and Transylvania until worse horsemen come.',
      ideas: {},
    },
    LMB: {
      name: 'The Lombards', color: [80, 130, 120], religion: 'christianity', culture: 'germanic', capital: 'Mediolanum',
      names: 'gothic',
      description: 'The long-beards: last of the wandering nations, and the ones who will keep what they take of Italy.',
      ideas: { moraleMult: 1.05 },
    },
    SAX: {
      name: 'The Saxons', color: [160, 140, 110], religion: 'germanic_cult', culture: 'germanic', capital: 'Teutoburgium',
      names: 'saxon',
      description: 'The seax-bearers of the old shore and the new island: seven kingdoms where Britannia was.',
      ideas: { moraleMult: 1.05 },
    },
    AVA: {
      name: 'The Avar Khaganate', color: [170, 80, 40], religion: 'steppe_cults', culture: 'sarmatian', capital: 'Sirmium',
      names: 'turkic',
      description: 'The ring on the middle Danube: tribute from two emperors, the Slavs for infantry, and the whole steppe behind.',
      ideas: { moraleMult: 1.05, reinforceMult: 1.05 },
    },
    SLV: {
      name: 'The Sclaveni', color: [110, 150, 70], religion: 'steppe_cults', culture: 'slavic', capital: 'Venedia',
      names: 'slavic',
      description: 'The many peoples of the rivers, ruled by no one, stopped by nothing, and settling everything they cross.',
      ideas: { manpowerMult: 1.1 },
    },
    TRK: {
      name: 'The Western Turks', color: [80, 120, 190], religion: 'steppe_cults', culture: 'sarmatian', capital: 'Sarmatia',
      names: 'turkic',
      description: 'The khaganate of the far grass, whose yabghu will one day ride to Tiflis to meet an emperor.',
      ideas: { moraleMult: 1.05 },
    },
    BGR: {
      name: 'The Bulgar Hordes', color: [140, 110, 160], religion: 'steppe_cults', culture: 'sarmatian', capital: 'Phanagoria',
      names: 'turkic',
      description: 'Kutrigur and Utigur, Onogur and Dulo: the horsemen between the Don and the Danube delta, for rent and for themselves.',
      ideas: { moraleMult: 1.05 },
    },
    // -- 1948: the neutral hinterland of somebody else's war --
    FRA: {
      name: 'France', color: [40, 70, 160], religion: 'christianity', culture: 'celtic', capital: 'Lutetia',
      names: 'french_modern',
      description: 'The Fourth Republic: an empire from Dunkirk to the Fezzan, and a government a season.',
      ideas: { incomeMult: 1.05 },
    },
    SPA: {
      name: 'Spain', color: [186, 58, 34], religion: 'christianity', culture: 'iberian', capital: 'Toletum',
      names: 'spanish_modern',
      description: 'The Caudillo\'s Spain: shut out of the peace, shut into itself.',
      ideas: {},
    },
    POR: {
      name: 'Portugal', color: [36, 116, 58], religion: 'christianity', culture: 'iberian', capital: 'Olisipo',
      names: 'portuguese_modern',
      description: 'The Estado Novo: quiet, Atlantic, and older at this game than anyone.',
      ideas: {},
    },
    NLD: {
      name: 'The Netherlands', color: [220, 120, 40], religion: 'christianity', culture: 'germanic', capital: 'Batavia',
      names: 'dutch_modern',
      description: 'A trading kingdom rebuilding its docks and losing its Indies.',
      ideas: { incomeMult: 1.05 },
    },
    DEN: {
      name: 'Denmark', color: [190, 44, 44], religion: 'christianity', culture: 'germanic', capital: 'Selandia',
      names: 'danish_modern',
      description: 'Five years occupied, three years free, and done with neutrality.',
      ideas: {},
    },
    SWE: {
      name: 'Sweden', color: [50, 110, 170], religion: 'christianity', culture: 'germanic', capital: 'Scandia',
      names: 'swedish_modern',
      description: 'The armed neutral of the north, untouched and intending to stay so.',
      ideas: {},
    },
    POL: {
      name: 'Poland', color: [200, 80, 90], religion: 'christianity', culture: 'slavic', capital: 'Gothiscandza',
      names: 'polish_modern',
      description: 'A republic moved three hundred kilometers west, under a government it did not choose.',
      ideas: {},
    },
    CZE: {
      name: 'Czechoslovakia', color: [84, 104, 172], religion: 'christianity', culture: 'slavic', capital: 'Boiohaemum',
      names: 'czech_modern',
      description: 'The February coup is four months old; the ministers who could refuse are gone or falling from windows.',
      ideas: {},
    },
    SOV: {
      name: 'The Soviet Union', color: [180, 28, 28], religion: 'christianity', culture: 'slavic', capital: 'Hyperborea',
      names: 'soviet',
      description: 'The other victor: from the Elbe to the Pacific, and its shadow over every capital between.',
      ideas: { manpowerMult: 1.15 },
    },
    GER: {
      name: 'Occupied Germany', color: [50, 50, 54], religion: 'christianity', culture: 'germanic', capital: 'Mogontiacum',
      names: 'german_modern',
      description: 'Four zones, no army, and an airlift keeping half a capital alive.',
      ideas: {},
    },
    AUT: {
      name: 'Austria', color: [168, 108, 108], religion: 'christianity', culture: 'germanic', capital: 'Carnuntum',
      names: 'austrian_modern',
      description: 'Occupied like Germany, treated unlike it: a republic waiting out its four garrisons.',
      ideas: {},
    },
    HUN: {
      // No Magyar culture exists at this game's scale; the Pannonian basin
      // reads under the coarse Slavic label its neighbors share, and the
      // court's own name pool keeps the country's actual tongue.
      name: 'Hungary', color: [116, 148, 86], religion: 'christianity', culture: 'slavic', capital: 'Aquincum',
      names: 'hungarian_modern',
      description: 'A republic being swallowed by its own interior ministry, one salami slice at a time.',
      ideas: {},
    },
    YUG: {
      name: 'Yugoslavia', color: [86, 96, 150], religion: 'christianity', culture: 'slavic', capital: 'Singidunum',
      names: 'yugoslav_modern',
      description: 'Tito\'s federation, four days from being read out of the Cominform.',
      ideas: {},
    },
    ALB: {
      name: 'Albania', color: [130, 40, 44], religion: 'islam', culture: 'illyrian', capital: 'Dyrrhachium',
      names: 'albanian_modern',
      description: 'The smallest people\'s republic, and the most walled-in.',
      ideas: {},
    },
    BUL: {
      name: 'Bulgaria', color: [90, 150, 110], religion: 'christianity', culture: 'slavic', capital: 'Serdica',
      names: 'bulgarian_modern',
      description: 'The people\'s republic at the Straits\' back door.',
      ideas: {},
    },
    ROU: {
      name: 'Romania', color: [200, 170, 70], religion: 'christianity', culture: 'thracian', capital: 'Tomis',
      names: 'romanian_modern',
      description: 'A king abdicated at gunpoint five months ago; the People\'s Republic is one year old.',
      ideas: {},
    },
    IRL: {
      name: 'Ireland', color: [20, 140, 60], religion: 'christianity', culture: 'celtic', capital: 'Hibernia',
      names: 'irish_modern',
      description: 'Declaring itself a republic this very year, and staying out of everything else.',
      ideas: {},
    },
    SUI: {
      name: 'Switzerland', color: [200, 60, 70], religion: 'christianity', culture: 'germanic', capital: 'Genava',
      names: 'swiss_modern',
      description: 'Armed to the teeth and party to nothing.',
      ideas: {},
    },
    // ---- off-map seats (SPEC §180): courts the frame cannot reach ----
    // An off-map seat is a real tag with no cell on the board: alive without
    // land, beyond every army, no alliances — but a court, an opinion, a
    // treasury, and every civil verb. `offmap.dev/income` is its economy in
    // one number, read by the ledger, the §165 standing table and the
    // monthly stipend; `treasuryCap` keeps a court that never spends from
    // compounding forever.
    USA: {
      name: 'The United States', color: [60, 90, 160], religion: 'christianity', culture: 'germanic', capital: '',
      offmap: { dev: 420, income: 60 }, // the §101 hoard cap bounds the idle treasury

      description: 'Recognition came in eleven minutes; arms did not. Half the '
        + 'world\'s industry, on the far side of an ocean the map does not cross.',
      ideas: {},
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
    // A building may wear the face of its age (SPEC §52): at/after `modern.tech`
    // (military), its name/desc/months are read from the modern variant — the
    // key, cost and completion effects stay the same, so saves and glyphs hold.
    // Nobody rings 1948 towns with curtain walls; they dig.
    walls:   { name: 'Walls',   cost: 100, months: 18, desc: '+1 fort level (max 3), +1,000 garrison',
      modern: { tech: 19, name: 'Fortified Line', months: 12,
        desc: 'Trenches, pillboxes, wire and mines: +1 fort level (max 3), +1,000 garrison' } },
    shrine:  { name: 'Shrine',  cost: 40,  months: 9,  desc: '-1.5 local unrest',
      modern: { tech: 19, name: 'House of Worship',
        desc: 'A synagogue, church or mosque for the town: -1.5 local unrest' } },
    shipyard: { name: 'Shipyard', cost: 90, months: 14, coastal: true,
      desc: 'A working harbor: local production +15%; berths 3 merchant ships, which may sail between your shipyard harbors' },
    // The age of flight (SPEC §29): gated on military tech, parks air wings.
    airfield: { name: 'Airfield', cost: 120, months: 10, tech: 19,
      desc: 'A runway and hangars: base up to 2 air wings, whose fighters cover battles nearby' },
  },

  // Air power (SPEC §29): wings live at airfields, rebase freely between
  // your own, cover friendly battles within `rangeHops`, and are destroyed
  // on the ground if their field falls.
  // Air power is a QUANTITY, not a flag (SPEC §154). Net wings in a ring buy
  // pips in every battle phase, slow hostile columns, break or stall sieges,
  // and bleed hostile hosts monthly without a battle. Wings cost accordingly:
  // an air force is the thing a realm builds INSTEAD of an army, which is the
  // actual 1948-73 choice, and at 40 talents it was neither.
  AIR: {
    wingCost: 90,          // talents to raise one air wing (crews included)
    wingUpkeep: 1,         // talents/month per wing
    wingsPerField: 2,      // hangar space per airfield
    rangeHops: 2,          // provinces of combat cover / raid reach from the base
    raidCdDays: 12,        // days to rearm between bombing raids
    diePerWings: 2,        // net wings per pip on the die (first wing = first pip)
    dieCap: 4,             // most pips air alone can add, in every phase
    interdictAt: 2,        // net wings against a column: +25% march days
    interdictHardAt: 4,    // …and +50%
    siegeAt: 3,            // net wings: sieges at double rate, hostile camps stall
    attritionAt: 2,        // net wings: hostile hosts bleed monthly, unfought
    aiWingCap: 8,          // most wings an AI court will want (SPEC §155)
  },

  // Oil spending (SPEC §52): the mechanized patterns burn fuel. Regiments of
  // generation `gen`+ and every air wing pay a monthly fuel line on top of
  // ordinary maintenance; a realm that controls no oil-producing province
  // buys its fuel abroad at `importMult` the price. Ancient eras never reach
  // gen 5, so the line is zero there by construction.
  FUEL: {
    gen: 5,                // first unit-pattern generation that burns fuel
    perReg: 0.2,           // talents/month per fueled regiment
    perWing: 0.5,          // talents/month per air wing (on top of wingUpkeep)
    shipMult: 1.5,         // oil-fired hulls: ship upkeep multiplier at gen 5+
    importMult: 2,         // fuel bill multiplier with no controlled oil province
  },

  // Armor (SPEC §181): mounted regiments at pattern `minGen`+ are tanks, not
  // horses — a shock-phase die advantage on §154's signed-quantity design,
  // and a price that reflects a battalion of Shermans rather than a squadron
  // of dragoons. Ancient chapters cap at pattern 3, so none of this exists
  // for them by construction.
  ARMOR: {
    minGen: 5,             // first pattern generation that reads as armor
    cost: 50,              // talents to raise one armored regiment (vs regCost.cav)
    months: 4,             // training/fitting time (vs unitRecruitMonths.cav)
    pipsPer: 2,            // net armor regiments per shock-phase pip
    pipCap: 3,             // most pips armor advantage can add
  },

  // The arms market (SPEC §181): where a bookmark declares `armsMarket`, only
  // its arsenal states build the gated arms (air wings, armor) from their own
  // works; everyone else needs a standing weapons transfer agreement with one
  // supplier at a time, signed at the supplier's regard bar and alive only
  // while the friendship is.
  ARMS: {
    need: 50,              // supplier's opinion of the client required to sign
    floor: 25,             // pipeline dies when their regard falls below this
    anchor: 40,            // a live deal anchors the supplier's drift here (§57's pact floor, reborn)
    cost: 50,              // signing fee, paid into the supplier's treasury
    switchOpinion: -10,    // what the dropped supplier thinks of the switch
    signCdMonths: 6,       // no re-signing churn inside this window
  },

  // The land roster (SPEC §186): three arms answering each other in a
  // triangle, scored once per phase from each side's own mix. `scale` turns
  // the raw matchup number (js/data/units.js) into die pips; `cap` is the most
  // a composition can ever be worth, so an all-guns host beats a line without
  // deciding the battle before the dice are thrown.
  ARMS_TRIANGLE: {
    scale: 2,              // pips per unit of matchup edge (floored, so a
                           // balanced host against a balanced host reads 0)
    cap: 2,                // most pips the triangle itself can add in a phase
    // The answer to armor, and it is a COUNT, not a proportion (SPEC §186).
    // Four anti-tank regiments against four tanks is four anti-tank
    // regiments against four tanks, whatever fraction of the army they are.
    atPer: 2,              // engaged tanks per fire-phase pip for the guns
    atCap: 3,              // most pips the guns can earn against armor
  },

  BASE: {
    regSize: 1000,                     // men per regiment
    // Talents to recruit one regiment. The shot arm sits between the foot and
    // the horse: engines and their teams cost more than men and less than
    // remounts (armor prices separately — ARMOR.cost above).
    regCost: { inf: 10, cav: 25, art: 18 },
    // Every province trains/fits one queued military unit at a time. Paused
    // time never advances these clocks.
    unitRecruitMonths: { inf: 2, cav: 3, art: 3, ship: 6, wing: 4 },
    maintPerReg: 0.35,                 // talents/month upkeep per regiment (× the pattern's upkeep mult)
    // Administration (SPEC §52): governing costs money, and more realm costs
    // more. Every point of owned development beyond the free allowance bills
    // the treasury monthly — the scaling expense that keeps a snowballing
    // empire's books honest. Small realms (under the allowance) pay nothing.
    adminFreeDev: 40,                  // development a court governs for free
    adminPerDev: 0.03,                 // talents/month per owned dev point beyond it
    // What a treasury can actually hold (SPEC §101). Pre-modern states did not
    // bank; a crown's reserve is roughly what its own economy justifies, and
    // everything past that goes into palaces, walls, salaries, and the pockets
    // of the men who count it. Without this, an untouched minor quietly banks
    // thousands for decades and hands the lot to whoever annexes it — the
    // reported "annex a poor client, get rich" exploit. The cap scales with
    // income, so a rich realm may still save for a campaign; only hoards far
    // beyond the country's means bleed.
    hoardCapMonths: 18,                // months of gross income a court may hold…
    hoardCapFloor: 150,                // …never less than this, so paupers can still save
    hoardDecayPerMonth: 0.06,          // share of the EXCESS that drains each month
    // What a conquering or absorbing crown actually inherits: the treasury of
    // a state is not a chest that travels. A share comes to the new capital;
    // the rest was already spent, owed, or is in somebody's cellar.
    inheritTreasuryShare: 0.25,        // share of a client's coffers on incorporation…
    inheritTreasuryCapMonths: 12,      // …capped at this many months of its own income
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

  // Anti-snowball & challenge levers (SPEC §21 extended). Everything that
  // keeps a human steamroll honest lives here: infamy pricing, the punitive
  // coalition, great-power containment, the national force limit, and the
  // escalating price of conquest at the peace table.
  BALANCE: {
    infamyPerDev: 0.5,       // infamy per point of ceded development (was 1/3)
    infamySubjugate: 12,     // infamy for forcing a crown to bend the knee
    infamyHumiliate: 5,      // infamy for a humiliation
    infamyDecayPeace: 1,     // infamy shed per month at peace...
    infamyDecayWar: 0.25,    // ...and while at war — conquest mid-war is not forgotten
    // The lost lands are remembered (SPEC §67): while a conqueror still sits
    // on land taken from a court in war, that court's opinion of the taker is
    // capped at -(base + perProv × provinces still held), up to -max. Envoys
    // and gifts cannot raise it past the cap; only giving the land back (or
    // losing it) ends the grudge, and the wound then heals at drift speed.
    grudgeCeilingBase: 100,  // cap starts at -100 for a single lost province
    grudgeCeilingPerProv: 10, // ...and deepens per additional province held
    grudgeCeilingMax: 180,   // the coldest a court can be compelled to sit
    grudgeBite: 4,           // monthly pull toward the cap while above it
    coalitionInfamy: 30,     // infamy at which the coalition may march on its own
    coalitionStrength: 1.2,  // combined coalition strength needed, × the expander's
    coalitionChance: 0.1,    // monthly punitive-war roll once conditions hold
    containDevShare: 0.25,   // human share of world development at which great powers take note
    containWarShare: 0.32,   // ...and at which containment wars become possible
    containOpinionDrift: 2,  // monthly opinion slide toward hostility while oversized
    containChance: 0.06,     // monthly containment-war roll per watching great power
    forceLimitBase: 8,       // regiments any court keeps in the field for free...
    forceLimitPerDev: 0.15,  // ...plus this per point of owned development
    overLimitMult: 3,        // the overlimit fraction of the army pays this × maintenance
    peaceProvStep: 0.15,     // each additional province in one deal costs +15% more
    peaceAlienMult: 1.25,    // land of another religious group costs 25% more to take
    peaceMaxDevShare: 0.4,   // no single treaty strips more than this share of the loser's dev
    weMoraleFloor: 0.4,      // morale recovery never drops below this fraction...
    weMoraleAt: 40,          // ...which it reaches as war exhaustion approaches this
    // Standing rivalries (SPEC §73): pairs the bookmark names as the era's
    // natural enemies. Their mutual opinion drifts toward the cold baseline
    // instead of neutral, so the opportunistic-war gate (opinion < -50)
    // never rusts shut between them and the great powers keep fighting
    // their own wars.
    rivalOpinion: -60,       // the baseline rival opinions cool toward
    rivalRatioMult: 0.85,    // rivals need 15% less overmatch to strike
    // How long a war must have run before the court that is merely TIRED of it
    // may ask the player to let it out (SPEC §144). A court being routed still
    // sues at once; this is only the weariness road, and weariness carried in
    // from the last war is not a reason to abandon this one in its first month.
    warSueGraceMonths: 12,
    // Declared rivalries (SPEC §86): the player may name up to `rivalMax`
    // courts as rivals. A named rival is worth something — cheaper claims
    // against them, a monthly martial dividend from a court kept on a war
    // footing — and costs something: their opinion sinks to the cold
    // baseline, no alliance, and no grudge between you will ever thaw.
    rivalMax: 2,
    rivalDeclareInfl: 20,    // influence to name a rival...
    rivalRenounceInfl: 40,   // ...and the harder coin to unsay it
    rivalMarPerMonth: 1,     // martial points a month per declared rival
    rivalClaimMult: 0.5,     // claims against a declared rival cost half
    rivalCooldownMonths: 24, // a court renounced cannot be re-named at once
    // Reconciliation (SPEC §86): a grudge is a wound, and a wound that is
    // left alone closes. Every month the two courts are neither at war nor
    // rivals and no fresh land has been taken, the grudge matures and its
    // ceiling softens toward a target. Without an affinity the wound only
    // half-closes — the land is still theirs and everyone knows it. Where
    // the bookmark names the pair HISTORICAL FRIENDS, it closes nearly all
    // the way, and an alliance becomes possible again.
    thawMonths: 120,          // ten years of quiet to reach full maturity
    thawReachPlain: 0.5,      // strangers: the ceiling rises halfway
    thawReachAffinity: 0.9,   // historical friends: nearly all the way back
    // Deference (SPEC §137): a grievance is a policy, and a court that cannot
    // afford one stops paying for it. A victim much lighter than the taker
    // carries its thaw further than the reach above — all the way off, when
    // the gap is wide enough and the little court has troubles of its own.
    deferDevRatio: 0.6,       // at or above 6/10 of the taker's weight: no deference at all
    deferFloorRatio: 0.15,    // at or below 15%: the full deference the gap can buy
    deferMax: 0.85,           // how much of the remaining reach a weight gap can carry
    deferStabilityBonus: 0.1, // ...per point of stability BELOW zero, on top of it
    thawAllyAt: 0.75,         // the maturity at which friends may ally again
    thawHeal: 1,              // monthly warming once the ceiling is above us
    thawMartialPenalty: 0.5,  // a wholly martial realm matures at half speed
  },

  // What kind of rising this is (SPEC §87). A province rises for a reason,
  // and the reasons are already in the game's state: who used to own the land,
  // whose god it keeps, whether the throne is believed in, how tired it is.
  REVOLT: {
    pretenderLegitimacy: 40,  // below this (or under a regency) claims appear
    pretenderChance: 0.35,    // ...and this often, when a weak throne's province rises
    pretenderDrain: 0.5,      // legitimacy a month while a claimant is in the field
    pretenderBeatenLegitimacy: 15, // ...and the answer when the host is broken
    pretenderHoldMonths: 6,   // a claimant holding the capital this long is crowned
    pretenderCrownedLegitimacy: 55, // the usurper starts here, not at the old crown's number
    religiousChance: 0.5,     // a heterodox province rises for the altar this often
    // SPEC §112 — a rising nobody answers has to end, or a realm whose
    // provinces are all rebel-held can never earn, grow or recruit its way
    // back into its own country.
    rebelBurnoutMonths: 24,   // held this long, with the province calm, and the band starts melting
    rebelBurnoutUnrest: 4,    // ...where "calm" means unrest has fallen to this or below
    rebelBurnoutRate: 0.12,   // ...losing this share of its men a month
    rebelHoldMaxMonths: 72,   // and no rising holds a province longer than this, angry or not
  },

  // Supply lines (SPEC §82). An army traces monthly to controlled home
  // territory through a chain of friendly/occupied provinces, or across the
  // sea from an unblockaded friendly port while the side keeps a warship
  // afloat and an open home harbor. Out of supply: no reinforcements, slow
  // morale, mounting attrition, and a breaking host after weakenAtMonths.
  SUPPLY: {
    moraleRecoveryMult: 0.25, // out-of-supply armies mend at a quarter pace
    attritionBase: 2,         // extra attrition %/month the month the line is cut...
    attritionPerMonth: 1,     // ...growing by this per further month cut off...
    attritionRampCap: 6,      // ...to at most base + cap
    weakenAtMonths: 3,        // months isolated before the host starts to break
    weakMoraleCap: 0.5,       // morale ceiling (× max morale) once breaking
    // SPEC §117 — the length of the line costs something. The chain itself
    // still reaches (an army far from home is supplied, not stranded), but a
    // host operating this many provinces past its own country bleeds for every
    // further one, which is what stops a campaign walking to the Gulf.
    reachComfort: 7,          // provinces from a home source before the wagons strain
    reachAttrition: 0.7,      // extra attrition %/month per province beyond that...
    reachCap: 7,              // ...to at most this much
  },

  // AI naval invasions (SPEC §82). A warring AI that cannot reach its enemy
  // overland plans a real amphibious operation: pick a beachhead, gather an
  // army and hulls at a friendly port (building — never conjuring — the
  // missing ships), sail escorted, land, and hold. Every gate below is a
  // reason to postpone rather than teleport.
  INVASION: {
    minMen: 4000,        // smallest force worth shipping
    maxShips: 8,         // the armada the AI aims for — a bounded expedition, not the whole levy
    escortRatio: 1.15,   // a hostile fleet this much stronger forces a postponement
    defenderEdge: 1.25,  // landing force must outweigh the beach's defenders × this
    maxShipsBuilding: 3, // hulls the operation lays down at once across the realm
    patienceMonths: 30,  // a stalled operation is abandoned after this long
    shipReserve: 80,     // talents kept back beyond each hull's price
  },

  // Sandbox chapters (SPEC §83). Winning the bookmark opens a generated
  // second act: chapters of three world-aware objectives (one territorial,
  // one internal, one diplomatic/economic), each rewarded with a permanent
  // but restrained modifier and succeeded by a harder chapter. Failure sets
  // back and replaces; it never ends the campaign.
  CHAPTERS: {
    graceMonths: 2,        // months after the verdict before the first chapter opens
    betweenMonths: 6,      // breathing space between chapters
    deadlineMonths: 96,    // an objective has eight years before it is replaced
    failLegitimacy: -10,   // the restrained setback a lapsed objective costs
  },

  // Veteran difficulty (start-screen choice): every AI court fights and earns
  // like a hardened power. Applied inside resolveTagMult — never to humans.
  HARD_AI: { disciplineMult: 1.05, incomeMult: 1.25, manpowerMult: 1.25 },

  // The vassal loop (SPEC §61): fealty is a relationship, not a flag. A loved
  // client can be absorbed; a resentful one stays home from your wars; a
  // hostile one rises, and only the sword (and the subjugation clause at the
  // table) puts the yoke back on.
  VASSALS: {
    incorporateOpinion: 80,      // a client is absorbed only by a court it nearly loves
    incorporateKeepOpinion: 60,  // ...but once begun, only real disaffection (below this) unravels the weaving
    incorporateBase: 75,         // influence points to begin the union...
    incorporatePerDev: 2.5,      // ...plus per point of the client's development
    incorporateMonthsBase: 12,   // the weaving of two realms takes at least a year...
    incorporateMonthsPerDev: 0.5, // ...and longer for every point of their development
    incorporateInfamyPerDev: 0.25, // the world counts absorption at half a conquest
    loyalOpinion: -25,           // below this a client refuses the overlord's war calls
    revoltOpinion: -75,          // at/below this a client may rise for independence
    revoltStrength: 0.4,         // rebel strength needed (with co-rebels), × the overlord's
    revoltChance: 0.04,          // monthly rising roll once every condition holds
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
