// js/data/revivals.js — the old names (SPEC §247). DOM-free, dependency-free.
//
// What a beaten empire could be made to let go of used to be answered by two
// abstractions and no third: the court that owned the ground when the era
// opened (restore Nabataea, return Armenia's homeland), and, for everything
// else, culture-plus-faith — which produced the "Greek State of Antioch" and
// the "Aramean State of Beroea". Those names are honest about what they are.
// They are also the reason a congress that dismembered the Seleucid empire
// read like a census being filed rather than like a map being redrawn.
//
// The ground itself knows better names. Tyre and Sidon are not a Phoenician
// bucket; they are PHOENICIA, and everyone at the table in every one of these
// centuries knew it. So a third abstraction sits between the other two: a list
// of countries that really existed on this map, each with the provinces that
// make it that country and not somewhere else. When an enemy holds ALL of
// them — and the war has gone far enough that a congress would entertain
// redrawing a map at all — the treaty may raise the old name over them again.
//
// The rules that shape the list:
//
//   * CORES ARE THE IDENTITY, and they are few. Phoenicia is Tyre and Sidon;
//     everything else Phoenician — Byblos, Berytus, Tripolis, Aradus, and in
//     the modern chapter the Lebanese districts behind them — is `lands`,
//     taken when the enemy happens to hold them and quietly skipped when it
//     does not. A country that needed sixteen exact provinces would never
//     appear; a country that needed one would appear everywhere.
//
//   * THE FAITH COMES FROM THE GROUND, not from the list. A Phoenicia raised
//     out of a Seleucid Tyre is Hellenistic and one raised out of a Byzantine
//     Tyre is Christian, because that is what the province is — the country
//     takes the faith of the people in it rather than one this file guessed
//     four centuries in advance. Only the states whose whole reason for
//     existing is confessional (the Alawite State, the Jabal al-Druze) pin a
//     religion, and they exist for thirty years of the twentieth century.
//
//   * EVERY NAME HAS A CENTURY. `from`/`to` are signed years — negative is
//     BCE — and they are the window in which the name would have meant
//     something to the men signing. Kurdistan is not on offer in 167 BCE and
//     Moab is not on offer in 1948; Assyria, whose plain has been answering to
//     that word for four thousand years, is on offer in both eras this map
//     reaches.
//
//   * A WAR SCORE THRESHOLD, and it is about AMBITION rather than price. The
//     development-based cost every release already pays says what the land is
//     worth. `minWs` says how badly the enemy has to be losing before a
//     congress will discuss resurrecting a kingdom at all: a coastal league
//     at 25, a real country at 35, Egypt or Babylon at 50.
//
// The tags below are new courts. They deliberately do NOT live in
// DEFINES.TAGS: every bookmark declares `activeTags`, and a tag catalogued
// there but absent from that list is a court that never seats — but the day
// somebody writes a bookmark without an `activeTags` line, twenty-nine empty
// kingdoms would come alive holding nothing. The release row carries the whole
// identity instead (name, banner colour, culture, ideas, the ruler's pool and
// title), and `ensureReleasedCourt` seats it from that.

// `names` keys index military.js's GENERAL_NAMES; `title` is what the court
// calls the man at the top of it, and both are read only when a revival is
// actually raised.
export const REVIVALS = [
  // ── the Levantine coast and the country behind it ─────────────────────────
  {
    tag: 'PHO', name: 'Phoenicia', adj: 'Phoenician',
    color: [128, 48, 104], culture: 'phoenician', names: 'punic', title: 'Suffete',
    govType: 'republic',
    from: -1200, to: 700, minWs: 35,
    cores: ['Tyre', 'Sidon'],
    lands: ['Byblos', 'Berytus', 'Tripolis', 'Aradus', 'Nabatieh', 'Chouf',
      'Jounieh', 'Batroun', 'Bsharri', 'Akkar'],
    ideas: { tradeMult: 1.18, navalMult: 1.15, manpowerMult: 0.8 },
    basis: 'Tyre and Sidon have been cities of their own for two thousand years and '
      + 'kings of their own for most of them. Every empire that has taken this coast has '
      + 'taken it as a coast — the towns underneath went on being Phoenician.',
    description: 'The purple cities, sovereign again: little land, deep harbours, '
      + 'and a merchant fleet older than every crown on this map.',
  },
  {
    tag: 'PHL', name: 'Philistia', adj: 'Philistine',
    // No Philistine culture exists on this map and none should be invented for
    // five cities: by every century it is playable in, the coast speaks and
    // trades with the Phoenician one, which is the key that carries that.
    color: [176, 128, 60], culture: 'phoenician', names: 'punic', title: 'Seren',
    govType: 'republic',
    from: -1200, to: 400, minWs: 25,
    cores: ['Gaza', 'Ascalon'],
    lands: ['Azotus', 'Jamnia', 'Khan Yunis', 'Rafah'],
    ideas: { tradeMult: 1.12, incomeMult: 1.08, navalMult: 1.08 },
    basis: 'The five cities of the coastal plain kept their walls, their harbours and '
      + 'their quarrel with the hills through Assyria, Babylon, Persia and Macedon. '
      + 'A league of them is the oldest political fact between Egypt and Judaea.',
    description: 'The pentapolis of the coast road, standing on its own again — '
      + 'grain, garrisons, and the caravan tax on everything moving to Egypt.',
  },
  {
    tag: 'IDU', name: 'Idumaea', adj: 'Idumaean',
    color: [150, 92, 64], culture: 'idumean', names: 'arab', title: 'Strategos',
    govType: 'tribal',
    from: -900, to: 300, minWs: 25,
    cores: ['Hebron', 'Adora'],
    lands: ['Elusa', 'Beersheba', 'Kadesh Barnea', 'Auara', 'Zoara', 'Shobak'],
    ideas: { moraleMult: 1.08, manpowerMult: 1.1, incomeMult: 0.95 },
    basis: 'Edom moved west into the Negev when Babylon emptied it, and the country '
      + 'south of Hebron has had its own governors, its own god and its own fighting men '
      + 'ever since — including under crowns that insisted it did not.',
    description: 'The south, ruling itself: hard hill country, harder cavalry, and '
      + 'a long memory of being annexed.',
  },
  {
    tag: 'MOA', name: 'Moab', adj: 'Moabite',
    color: [140, 74, 96], culture: 'arab', names: 'arab', title: 'King',
    govType: 'monarchy',
    from: -1300, to: 300, minWs: 25,
    cores: ['Medaba'],
    lands: ['Characmoba', 'Machaerus', 'Esbus', 'Zoara'],
    ideas: { hillDefBonus: 1, incomeMult: 1.05, manpowerMult: 0.9 },
    basis: 'The plateau east of the Salt Sea is a country with a border drawn by '
      + 'geology — the Arnon gorge on one side, the desert on the other. Mesha cut his '
      + 'account of taking Medeba back into basalt, and it has been the same country, '
      + 'under the same name, in every list of the region since.',
    description: 'The high tableland east of the Dead Sea, its own again: sheep, '
      + 'balsam, and the ravines that make it indigestible.',
  },
  {
    tag: 'AMM', name: 'Ammon', adj: 'Ammonite',
    color: [118, 106, 148], culture: 'arab', names: 'arab', title: 'King',
    govType: 'monarchy',
    from: -1300, to: 300, minWs: 25,
    cores: ['Philadelphia'],
    lands: ['Esbus', 'Zarqa', 'Mafraq'],
    ideas: { incomeMult: 1.08, hillDefBonus: 1 },
    basis: 'Rabbath-Ammon has been the capital of the same small country under four '
      + 'names and six empires; the Ptolemies renamed it for a king and changed nothing '
      + 'else about it.',
    description: 'The citadel above the Jabbok and the grain plain around it, '
      + 'answering to nobody — as it has managed to be, on and off, for a millennium.',
  },
  {
    tag: 'ARD', name: 'Aram', adj: 'Aramaean',
    color: [96, 128, 148], culture: 'aramean', names: 'syrian', title: 'King',
    govType: 'monarchy',
    from: -900, to: 700, minWs: 35,
    cores: ['Damascus'],
    lands: ['Douma', 'Quneitra', 'Heliopolis', 'Chalcis', 'Mount Hermon',
      'Suwayda', 'Salamiyah', 'Qusayr'],
    ideas: { incomeMult: 1.1, moraleMult: 1.05, tradeMult: 1.08 },
    basis: 'Damascus has not had a king of its own since Tiglath-Pileser took it, '
      + 'and the language of every clerk, caravan and court from the Euphrates to the '
      + 'sea is still Aramaic. The oasis is a state waiting for somebody to say so.',
    description: 'Damascus sovereign again, with the Ghouta feeding it and the '
      + 'desert road paying it — the oldest continuously inhabited capital there is.',
  },
  {
    tag: 'PLM', name: 'Palmyra', adj: 'Palmyrene',
    color: [190, 156, 72], culture: 'aramean', names: 'syrian', title: 'Exarch',
    govType: 'republic',
    from: -60, to: 700, minWs: 35,
    cores: ['Palmyra'],
    lands: ['Rusafa', 'Dura-Europos', 'Emesa', 'Qusayr', 'Nukhayb', 'Sirhan'],
    ideas: { tradeMult: 1.22, incomeMult: 1.1, manpowerMult: 0.85 },
    basis: 'Tadmor in the desert is the only place the Silk Road can cross the steppe '
      + 'between the Euphrates and the sea, and it has an archer aristocracy paid for by '
      + 'that fact. Whoever holds it holds it by leaving it alone.',
    description: 'The caravan city between two empires, taking a cut of both — '
      + 'bowmen, camels, and a customs tariff carved in stone in two languages.',
  },
  {
    tag: 'EME', name: 'Emesa', adj: 'Emesene',
    color: [176, 96, 88], culture: 'aramean', names: 'syrian', title: 'Priest-King',
    govType: 'priestKing',
    from: -100, to: 400, minWs: 25,
    cores: ['Emesa'],
    lands: ['Qusayr', 'Salamiyah', 'Heliopolis'],
    ideas: { moraleMult: 1.06, unrestAll: -0.4, incomeMult: 1.05 },
    basis: 'The house of Sampsiceramus rules the middle Orontes as priests of the '
      + 'black stone of Elagabal, and has been furnishing the region\'s cavalry — and '
      + 'eventually two Roman emperors — from that one temple town.',
    description: 'A priest-dynasty on the Orontes: the god, the horse archers, and '
      + 'a talent for backing the eventual winner slightly early.',
  },
  {
    tag: 'DEC', name: 'The Decapolis', adj: 'Decapolitan',
    color: [120, 148, 108], culture: 'greek', names: 'hellenic', title: 'Archon',
    govType: 'republic',
    from: -70, to: 400, minWs: 35,
    cores: ['Gerasa', 'Pella'],
    lands: ['Philadelphia', 'Gadara', 'Scythopolis', 'Gadora', 'Damascus'],
    ideas: { tradeMult: 1.15, incomeMult: 1.1, manpowerMult: 0.8 },
    basis: 'Ten Greek cities east of the Jordan, freed by Pompey from the Hasmoneans '
      + 'and left to run themselves, keep a common era, a common coinage and a standing '
      + 'habit of appealing over the head of whoever claims them.',
    description: 'The league of the ten cities: colonnades, councils, and no king — '
      + 'a Greek island in a country that is not Greek.',
  },

  // ── Mesopotamia and the east ──────────────────────────────────────────────
  {
    tag: 'ASY', name: 'Assyria', adj: 'Assyrian',
    color: [138, 60, 52], culture: 'aramean', names: 'syrian', title: 'King',
    govType: 'monarchy',
    from: -2000, to: 2100, minWs: 50,
    // Assur and Arbela, never Nineveh: the mound the city sits on is a cell
    // that only the 1948 chapter breaks out of Hatra (SPEC §47), and a core
    // that does not exist in seven of nine chapters is a country that cannot
    // be raised in them. Erbil has been the capital of this plain in both eras
    // the map reaches; Nineveh joins as land when the chapter has it.
    cores: ['Assur', 'Arbela'],
    lands: ['Nineveh', 'Singara', 'Nisibis', 'Hatra', 'Kirkuk', 'Amida',
      'Hasakah', 'Sulaymaniyah'],
    ideas: { disciplineMult: 1.08, siegeBonus: 1, manpowerMult: 1.1 },
    basis: 'The plain between the two Zabs has been called Assyria without a break '
      + 'since it ran the world, through every empire that has since run it. The name '
      + 'outlived the empire by two and a half millennia and is still what the people '
      + 'there call themselves.',
    description: 'The old heartland raised on its own account: the mound cities, the '
      + 'siege train, and a name that four thousand years have not worn out.',
  },
  {
    tag: 'BAB', name: 'Babylonia', adj: 'Babylonian',
    color: [82, 116, 168], culture: 'aramean', names: 'syrian', title: 'King',
    govType: 'monarchy',
    from: -1900, to: 700, minWs: 50,
    // One core, and it is the only one this country has ever needed. Uruk sits
    // in `lands` because the chapters do not agree about who holds the deep
    // south — 167 BCE leaves it Parthian while Babylon itself is Seleucid —
    // and a Babylonia that cannot be raised from Babylon is a joke.
    cores: ['Babylon'],
    lands: ['Uruk', 'Nehardea', 'Seleucia-Ctesiphon', 'Charax', 'Najaf', 'Kut',
      'Samawa', 'Amara', 'Baquba'],
    ideas: { incomeMult: 1.15, growthMult: 1.1, moraleMult: 0.95 },
    basis: 'The temple of Marduk still keeps its own accounts, its own calendar and '
      + 'its own astronomers under whoever is collecting the taxes, and the canal country '
      + 'around it is the richest agricultural ground between the Nile and the Indus.',
    description: 'The land between the rivers, governing itself: canals, granaries, '
      + 'star-tables, and the largest Jewish community outside the Land.',
  },
  {
    tag: 'ELM', name: 'Elam', adj: 'Elamite',
    color: [148, 118, 72], culture: 'persian', names: 'iranian', title: 'King',
    govType: 'monarchy',
    from: -2000, to: 500, minWs: 25,
    cores: ['Susa'],
    lands: ['Charax', 'Amara'],
    ideas: { incomeMult: 1.08, growthMult: 1.05 },
    basis: 'Susa was a capital before Babylon was a city and has been the seat of the '
      + 'lowland country ever since, whichever empire has been drawing its revenue.',
    description: 'The Susiana plain and the hills above it, on their own terms — '
      + 'the oldest chancery in the world, working for itself again.',
  },
  {
    tag: 'MED', name: 'Media', adj: 'Median',
    color: [110, 92, 150], culture: 'persian', names: 'iranian', title: 'King',
    govType: 'monarchy',
    from: -700, to: 700, minWs: 35,
    cores: ['Ecbatana'],
    lands: ['Gazaca'],
    ideas: { moraleMult: 1.06, hillDefBonus: 1, manpowerMult: 1.05 },
    basis: 'Ecbatana is where the Iranian plateau is ruled from when it is ruled by '
      + 'itself, and every empire that has held it has held it by keeping a Median '
      + 'satrap and a summer palace there.',
    description: 'The highland kingdom of the seven walls: horse country, cold '
      + 'summers, and the pass every army from the west has to buy or force.',
  },
  {
    tag: 'PRS', name: 'Persis', adj: 'Persian',
    color: [166, 78, 92], culture: 'persian', names: 'iranian', title: 'Frataraka',
    govType: 'monarchy',
    from: -700, to: 700, minWs: 35,
    cores: ['Persepolis'],
    lands: ['Gabae'],
    ideas: { moraleMult: 1.1, legitimacyAdd: 0.1, manpowerMult: 0.95 },
    basis: 'The kings of Persis have gone on minting their own coins at Istakhr, in '
      + 'their own script, with a fire altar on the reverse, under Seleucid and Parthian '
      + 'alike. Twice in this map\'s span that province has stopped paying and started '
      + 'an empire instead.',
    description: 'The homeland of the Achaemenids under its own fire-priests — small, '
      + 'poor, unimpressed, and historically the wrong province to underestimate.',
  },

  // ── Anatolia, the islands and the Greek world ─────────────────────────────
  {
    tag: 'CIL', name: 'Cilicia', adj: 'Cilician',
    color: [86, 138, 132], culture: 'greek', names: 'hellenic', title: 'Dynast',
    govType: 'republic',
    from: -700, to: 700, minWs: 35,
    cores: ['Tarsus'],
    lands: ['Seleucia Trachea', 'Attalia'],
    ideas: { navalMult: 1.12, incomeMult: 1.08, hillDefBonus: 1 },
    basis: 'The Cilician plain has a mountain wall behind it, one gate through it, and '
      + 'a coast that has fed pirate fleets and timber to every navy in the eastern sea. '
      + 'It has been a separate country far more often than a governed one.',
    description: 'The plain, the Gates and the rough coast behind them: shipyards, '
      + 'cedar, and a long professional interest in other people\'s cargo.',
  },
  {
    tag: 'CAP', name: 'Cappadocia', adj: 'Cappadocian',
    color: [148, 122, 96], culture: 'greek', names: 'hellenic', title: 'King',
    govType: 'monarchy',
    from: -600, to: 700, minWs: 35,
    cores: ['Caesarea Mazaca'],
    lands: ['Tyana', 'Melitene'],
    ideas: { hillDefBonus: 1, manpowerMult: 1.1, incomeMult: 0.95 },
    basis: 'The Ariarathid kings ran the eastern plateau as a client of whoever was '
      + 'strongest and a subject of nobody, on horses, temple estates and the fact that '
      + 'nothing about the country is worth the cost of holding it down.',
    description: 'The high plateau under Argaeus: horse herds, temple-states, and '
      + 'a court that has survived by never being worth conquering.',
  },
  {
    tag: 'GAL', name: 'Galatia', adj: 'Galatian',
    color: [104, 134, 74], culture: 'celtic', names: 'celtic', title: 'Tetrarch',
    govType: 'tribal',
    from: -270, to: 500, minWs: 35,
    cores: ['Ancyra'],
    lands: ['Tyana'],
    ideas: { moraleMult: 1.12, disciplineMult: 0.95, manpowerMult: 1.1 },
    basis: 'Three Celtic tribes crossed into Asia, took the country round Ancyra and '
      + 'have held it for two centuries under their own tetrarchs, still speaking Gaulish '
      + 'in the middle of Anatolia.',
    description: 'The Celts of Asia: twelve tetrarchs, a warrior assembly in an oak '
      + 'grove, and infantry everyone in the east would rather hire than fight.',
  },
  {
    tag: 'ION', name: 'The Ionian League', adj: 'Ionian',
    color: [92, 150, 170], culture: 'greek', names: 'hellenic', title: 'Prytanis',
    govType: 'republic',
    from: -900, to: 700, minWs: 35,
    cores: ['Smyrna'],
    lands: ['Halicarnassus', 'Rhodes', 'Attalia'],
    ideas: { tradeMult: 1.18, navalMult: 1.1, manpowerMult: 0.75 },
    basis: 'The cities of the Asian shore have a common festival, a common assembly '
      + 'and eight hundred years of practice at being autonomous inside somebody else\'s '
      + 'empire. Freedom of the Greeks has been a war aim in this sea for centuries.',
    description: 'The old cities of the Asian coast, free again: harbours, philosophy, '
      + 'a first-rate fleet, and almost no army whatever.',
  },
  {
    tag: 'BIT', name: 'Bithynia', adj: 'Bithynian',
    color: [126, 110, 172], culture: 'greek', names: 'hellenic', title: 'King',
    govType: 'monarchy',
    from: -300, to: 700, minWs: 35,
    cores: ['Nicaea'],
    lands: ['Byzantion'],
    ideas: { incomeMult: 1.1, navalMult: 1.08, tradeMult: 1.08 },
    basis: 'The Bithynian kings held the Propontis shore for two hundred years by '
      + 'sitting on the crossing between Europe and Asia and charging for it. The '
      + 'geography has not moved.',
    description: 'The kingdom on the straits: two seas, one crossing, and the toll '
      + 'on everything that goes through it.',
  },
  {
    tag: 'HEL', name: 'The Hellenic League', adj: 'Hellenic',
    color: [70, 108, 178], culture: 'greek', names: 'hellenic', title: 'Hegemon',
    govType: 'republic',
    from: -500, to: 700, minWs: 35,
    cores: ['Athens', 'Corinth'],
    lands: ['Sparta', 'Gortyn'],
    ideas: { tradeMult: 1.12, navalMult: 1.15, disciplineMult: 1.05, manpowerMult: 0.8 },
    basis: 'Every power that has come into Greece has announced the freedom of the '
      + 'Greeks on arrival, and the leagues have taken the announcement literally each '
      + 'time. The cities are still there and still have their assemblies.',
    description: 'The cities of old Greece confederated again: the fleet, the '
      + 'assemblies, and an unhelpful conviction of being the point of the world.',
  },
  {
    tag: 'MAC', name: 'Macedon', adj: 'Macedonian',
    color: [58, 82, 132], culture: 'greek', names: 'hellenic', title: 'King',
    govType: 'monarchy',
    from: -700, to: 700, minWs: 35,
    cores: ['Thessalonica'],
    lands: ['Dyrrhachium', 'Naissus'],
    ideas: { disciplineMult: 1.1, moraleMult: 1.08, manpowerMult: 1.05 },
    basis: 'The kingdom was abolished, cut into four republics, and then reassembled '
      + 'by a pretender who claimed to be Perseus\' son and beat a Roman army with it. '
      + 'The phalanx country does not stay divided for long.',
    description: 'The kingdom of Philip put back together: highland levies, the '
      + 'sarissa, and the shortest road into Greece.',
  },
  {
    tag: 'CYP', name: 'Cyprus', adj: 'Cypriot',
    color: [178, 142, 96], culture: 'greek', names: 'hellenic', title: 'King',
    govType: 'monarchy',
    from: -800, to: 2100, minWs: 25,
    // Paphos is the core and Salamis is land, which looks backwards for the
    // island's biggest city and is not: Salamis is the seat the 1948 chapter
    // gives Britain, and a capital is never on the table. Roman Cyprus was
    // governed from Paphos anyway.
    cores: ['Paphos'],
    lands: ['Salamis'],
    ideas: { navalMult: 1.15, tradeMult: 1.1, manpowerMult: 0.7 },
    basis: 'The island has copper, timber and eleven kingdoms\' worth of history of '
      + 'being governed from somewhere else and resenting it. It is also the only place '
      + 'in this sea from which both Egypt and Syria can be watched at once.',
    description: 'The copper island on its own: shipyards, mines, and a strategic '
      + 'position everyone else would rather it did not have.',
  },
  {
    tag: 'CRT', name: 'Crete', adj: 'Cretan',
    color: [150, 160, 118], culture: 'greek', names: 'hellenic', title: 'Kosmos',
    govType: 'republic',
    from: -800, to: 900, minWs: 25,
    cores: ['Gortyn'],
    lands: [],
    ideas: { navalMult: 1.12, moraleMult: 1.06, manpowerMult: 0.8 },
    basis: 'The Cretan cities have their own law, their own archers — hired by every '
      + 'army in the Mediterranean — and a hundred-city habit of ignoring anyone who '
      + 'claims the island without landing on it.',
    description: 'The hundred cities under their own magistrates: archers for hire, '
      + 'mountain glens, and an ancient talent for piracy.',
  },

  // ── Egypt and Africa ──────────────────────────────────────────────────────
  {
    tag: 'KMT', name: 'Egypt', adj: 'Egyptian',
    color: [198, 168, 62], culture: 'egyptian', names: 'egyptian', title: 'Pharaoh',
    govType: 'monarchy',
    from: -3000, to: 500, minWs: 50,
    cores: ['Memphis', 'Thebes'],
    lands: ['Athribis', 'Oxyrhynchus', 'Arsinoe', 'Syene', 'Leontopolis',
      'Pelusium', 'Myos Hormos'],
    ideas: { incomeMult: 1.18, growthMult: 1.1, manpowerMult: 1.05, moraleMult: 0.95 },
    basis: 'Thebes crowned two native pharaohs in twenty years of revolt against the '
      + 'Ptolemies and held Upper Egypt with them. The priesthoods of Amun and Ptah have '
      + 'gone on owning a third of the country under every foreign dynasty since Cambyses.',
    description: 'The Two Lands under a pharaoh of their own again: the flood, the '
      + 'temples that own the flood, and the oldest state on earth.',
  },
  {
    tag: 'CYR', name: 'Cyrenaica', adj: 'Cyrenaean',
    color: [156, 176, 84], culture: 'greek', names: 'hellenic', title: 'Archon',
    govType: 'republic',
    from: -630, to: 700, minWs: 35,
    cores: ['Cyrene'],
    lands: ['Marmarica', 'Berenice', 'Paraetonium'],
    ideas: { incomeMult: 1.1, tradeMult: 1.1, manpowerMult: 0.8 },
    basis: 'The Pentapolis of the Libyan shore has been a separate government from '
      + 'Egypt for as long as there has been an Egypt to be separate from — Battiad kings, '
      + 'then a republic, then its own Ptolemy, and always its own grain and silphium.',
    description: 'The five cities of the green hills above the desert: grain, '
      + 'silphium, horses, and a large and ancient Jewish quarter.',
  },
  {
    tag: 'HEJ', name: 'The Hejaz', adj: 'Hejazi',
    color: [176, 144, 88], culture: 'arab_modern', names: 'arab_modern', title: 'King',
    govType: 'monarchy',
    from: 1900, to: 2100, minWs: 35,
    // Medina, and only Medina. Mecca is one of the map's empty cells in 1948 —
    // nobody's province, so nobody can be made to give it up — and the cell the
    // chapter actually labels *Hejaz* is Ibn Saud's own seat, which no treaty
    // may take. Both arrive as land when the map allows; the core is the city
    // that can actually change hands.
    cores: ['Yathrib'],
    lands: ['Hegra', 'Macoraba', 'Tayma', 'Khaybar', 'Dedan', 'Asir'],
    ideas: { legitimacyAdd: 0.15, incomeMult: 1.08, manpowerMult: 0.9 },
    basis: 'The Hashemites ruled the Hejaz as a kingdom in its own right for nine '
      + 'years, were recognised as such, and were driven out of it by Nejd in 1925. Two '
      + 'of the sons still hold thrones; the family has not conceded the point.',
    description: 'The Sharifian kingdom restored to the house that held it: Medina, '
      + 'the pilgrim road, an enormous amount of prestige and a very short army.',
  },

  // ── the twentieth century ─────────────────────────────────────────────────
  {
    tag: 'KUR', name: 'Kurdistan', adj: 'Kurdish',
    // `persian` is the closest culture this map has and it is closer than it
    // looks: Kurdish is an Iranian language, and the alternative was filing a
    // people under the Arab identity they spent the century insisting they
    // were not.
    color: [188, 142, 48], culture: 'persian', religion: 'islam',
    names: 'iranian_modern', title: 'President',
    govType: 'republic',
    from: 1900, to: 2100, minWs: 35,
    cores: ['Sulaymaniyah', 'Kirkuk'],
    lands: ['Nineveh', 'Hasakah', 'Amida'],
    ideas: { hillDefBonus: 1, moraleMult: 1.1, incomeMult: 1.05, manpowerMult: 0.9 },
    basis: 'Sèvres promised the Kurds a state, Lausanne withdrew the promise, and the '
      + 'Republic of Mahabad governed one for eleven months in 1946 before it was hanged. '
      + 'The mountains, the oil and the claim are all still there.',
    description: 'The mountain republic that was promised twice and delivered once: '
      + 'peshmerga, oil under Kirkuk, and three neighbours who all object.',
  },
  {
    tag: 'ALW', name: 'The Alawite State', adj: 'Alawite',
    color: [104, 148, 158], culture: 'arab_modern', religion: 'islam',
    names: 'arab_modern', title: 'Governor',
    govType: 'republic',
    from: 1900, to: 2100, minWs: 25,
    cores: ['Laodicea'],
    lands: ['Qusayr', 'Idlib'],
    ideas: { hillDefBonus: 1, unrestAll: -0.4, manpowerMult: 1.1 },
    basis: 'France governed the Latakia coast as a separate state for sixteen years '
      + 'on the grounds that the mountain was not Sunni and did not want to be ruled from '
      + 'Damascus. The mountain has spent the years since supplying the army that does.',
    description: 'The coastal mountain governing itself: terraces, a martial '
      + 'population, and the ports the interior needs.',
  },
  {
    tag: 'DRZ', name: 'Jabal al-Druze', adj: 'Druze',
    // The Druze faith is its own thing and this map does not carry it; `islam`
    // is the nearest key and is what the province already holds, which is the
    // whole reason a religion is pinned here at all — the state exists because
    // the mountain is not the plain, and the ground alone would not say so.
    color: [126, 96, 132], culture: 'arab_modern', religion: 'islam',
    names: 'arab_modern', title: 'Emir',
    govType: 'monarchy',
    from: 1900, to: 2100, minWs: 25,
    cores: ['Suwayda'],
    lands: ['Quneitra'],
    ideas: { hillDefBonus: 1, moraleMult: 1.12, manpowerMult: 0.8 },
    basis: 'The black basalt mountain was a French state of its own until 1936, and '
      + 'the Atrash clan raised the revolt of 1925 out of it against everyone. It has '
      + 'never been governed from outside for long.',
    description: 'The mountain of the Druze: basalt, cavalry, secrecy, and an '
      + 'unbroken record of outlasting whoever is currently annexing it.',
  },
];

// Every revival whose century contains this year. `y` is the signed game year.
export function revivalsAt(y) {
  const year = Number(y);
  if (!Number.isFinite(year)) return [];
  return REVIVALS.filter((r) => year >= r.from && year <= r.to);
}

// A revival by tag — the release row and the court it seats both want it.
export function revivalByTag(tag) {
  const key = String(tag || '');
  return REVIVALS.find((r) => r.tag === key) || null;
}
