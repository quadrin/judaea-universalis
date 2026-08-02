// Judaea Universalis — where the parties are strong (SPEC §167). Content
// package: zero imports, read by js/sim/estates.js and js/map/mapmodes.js.
//
// WHY THIS FILE EXISTS. The estates were a bar in a panel. The Pharisees were
// a number between 0 and 100 and that number was the same in Jerusalem, in
// Ptolemais and in the Nabataean desert, because there was nowhere for it to
// be different. A faction with no geography cannot be fought over, cannot be
// read off a map, and — the part that matters — cannot make CONQUEST an
// internal political act. Taking the Greek coast should change the argument at
// your own court. Before this it changed a province count.
//
// WHAT AN ENTRY IS. A weight per axis of ground. Each axis is a 0-1 reading of
// a province the engine already keeps (js/sim/estates.js computes them), and
// the weights say how much that kind of ground carries this party. Strength is
// `base + Σ weight × signal`, clamped to 0-100. There is no hidden state: a
// province's politics are a function of what the province IS, so they update
// themselves when a town grows, a faith drifts, or a border moves.
//
// THE AXES
//   city      urban(1) · town(0.6) · rural(0.2) · frontier(0)
//   rural     the inverse of city
//   coast     a coastal province
//   hills     hills or mountains
//   desert    desert, drylands or steppe
//   faith     the province shares its owner's religion
//   alien     …and the inverse
//   trade     the province is a stop on a trade route
//   fort      fortification level, 0-1
//   holy      the province holds a holy site
//   dev       total development, 0-1 against a 24-point ceiling
//   capital   the owner's seat
//
// IDS ARE SHARED. The same faction ids appear in the bookmarks' authored
// estates (js/sim/factions.js) and in the generated foreign courts
// (js/sim/courts.js). An id missing from this table falls back to FLAT — a
// party with no particular ground, evenly spread — so nothing breaks when a
// chapter seats a party nobody has written geography for yet.

export const ESTATE_FLAT = { base: 40 };

export const ESTATE_GROUND = {
  // ---- the Jewish chapters ------------------------------------------------
  // The pious parties are the countryside and the Temple; the accommodating
  // ones are the cities, the coast and the money.
  hasideans: { base: 24, rural: 34, hills: 20, faith: 22, holy: 16, city: -20, trade: -12 },
  pharisees: { base: 30, rural: 24, faith: 20, city: 6, holy: 10, desert: -8 },
  sadducees: { base: 26, city: 22, holy: 26, dev: 16, capital: 18, rural: -12 },
  hellenizers: { base: 18, city: 34, coast: 26, trade: 22, dev: 18, alien: 14, rural: -24, hills: -14 },
  zealots: { base: 24, rural: 26, hills: 26, faith: 20, alien: 10, city: -8, dev: -10 },
  notables: { base: 28, city: 28, coast: 20, trade: 20, dev: 20, rural: -18 },
  priesthood: { base: 26, holy: 34, capital: 22, city: 12, faith: 16, desert: -10 },
  priests: { base: 26, holy: 34, capital: 22, city: 12, faith: 16, desert: -10 },
  sages: { base: 30, rural: 18, faith: 22, city: 10, hills: 10, alien: -12 },
  villages: { base: 26, rural: 36, hills: 18, dev: -16, city: -22 },
  captains: { base: 28, fort: 30, hills: 18, rural: 12, city: -6 },
  warparty: { base: 28, fort: 26, hills: 20, faith: 12, trade: -8 },
  swords: { base: 26, fort: 28, city: 14, dev: 12, alien: 12, rural: -10 },
  kin: { base: 30, capital: 24, desert: 18, fort: 14, city: 8 },
  antipater: { base: 28, desert: 22, trade: 18, coast: 12, capital: 14 },
  sanhedrin: { base: 30, capital: 26, holy: 20, city: 14, faith: 14 },
  // Herod's imported priesthood (SPEC §201): the Mount, the capital and the
  // developed coast their Alexandrian money came through — and, uniquely among
  // the priestly parties here, almost nothing in the countryside, because a
  // house fetched from Egypt to hold an office has no villages behind it. That
  // is the whole reason the king chose them.
  boethusians: { base: 22, holy: 32, capital: 24, dev: 18, coast: 12, rural: -20, hills: -14 },
  street: { base: 28, capital: 30, city: 24, dev: 10, rural: -16 },
  parthians: { base: 24, desert: 20, hills: 14, alien: 12, coast: -18 },
  fighters: { base: 26, hills: 24, rural: 20, faith: 18, fort: 12, city: -8 },
  exilarch: { base: 26, trade: 22, city: 18, alien: 20, dev: 14, hills: -12 },
  crowned: { base: 28, capital: 26, fort: 18, holy: 14 },
  quietists: { base: 30, rural: 28, hills: 20, holy: 12, city: -14, trade: -10 },
  council: { base: 30, city: 18, holy: 20, capital: 16, faith: 12 },
  kibbutzim: { base: 24, rural: 34, faith: 14, dev: -12, city: -18 },
  coalition: { base: 30, city: 22, dev: 18, capital: 14, rural: 6 },
  revisionists: { base: 26, city: 26, coast: 18, dev: 12, fort: 10, rural: -10 },
  // The status-quo signatories (SPEC §201): strong where the old yishuv and
  // the religious neighbourhoods are — Jerusalem, the holy towns, the dense
  // quarters — and weakest on exactly the ground the kibbutz movement holds.
  rabbinate: { base: 26, holy: 30, capital: 22, city: 16, faith: 18, rural: -14 },
  // ---- the client courts (SPEC §185) --------------------------------------
  // Agrippa's kingdom: the pious countryside, the stewarded estates, and the
  // military colony; Adiabene: the converted capital, the road, the horse —
  // and, before the conversion, the fire altars of the countryside.
  pious: { base: 28, rural: 28, faith: 22, holy: 10, city: -10, trade: -8 },
  stewards: { base: 28, city: 24, dev: 20, trade: 18, capital: 14, rural: -12 },
  babylonians: { base: 26, rural: 20, fort: 22, faith: 14, hills: 10, city: -8 },
  proselytes: { base: 26, capital: 26, faith: 22, city: 14, holy: 10, desert: -8 },
  magi: { base: 26, rural: 24, hills: 18, alien: 14, capital: 10, trade: -10 },
  caravans: { base: 26, trade: 30, city: 20, dev: 14, desert: 10, rural: -14 },
  riders: { base: 26, rural: 22, fort: 18, hills: 14, dev: 8, city: -10 },
  // The court at Zafar (SPEC §208). The garrison holds the capital and the
  // conquest's coast — `alien` because with the covenant on the crown the
  // Christian harbors are exactly where the negus' party is at home. The
  // House of Yazan is the faith's own highlands; the qayls are the castles
  // above the terraces; the incense houses are the harbors and the road.
  negus_men: { base: 22, capital: 26, fort: 22, coast: 14, alien: 14, rural: -16, hills: -10 },
  yazanids: { base: 26, hills: 26, faith: 24, rural: 18, capital: 10, coast: -12 },
  qayls: { base: 28, hills: 28, rural: 24, desert: 14, dev: -10, city: -16 },
  incense_houses: { base: 24, coast: 30, trade: 26, city: 20, dev: 14, rural: -18, hills: -12 },

  // ---- the empires and the neighbours -------------------------------------
  senate: { base: 28, capital: 28, city: 22, dev: 20, rural: -14 },
  people: { base: 30, capital: 24, city: 26, dev: 10, rural: -12 },
  legions: { base: 26, fort: 32, alien: 16, hills: 10, capital: -8 },
  legion: { base: 26, fort: 32, desert: 16, alien: 12 },
  cities: { base: 24, city: 32, coast: 24, trade: 24, dev: 18, rural: -22 },
  phalanx: { base: 26, fort: 30, city: 14, alien: 12 },
  court: { base: 30, capital: 32, dev: 16, city: 12, rural: -12 },
  church: { base: 28, holy: 30, city: 18, faith: 22, capital: 12, desert: -12 },
  landowners: { base: 28, rural: 30, dev: 12, city: -14 },
  demes: { base: 28, capital: 30, city: 26, coast: 12, rural: -18 },
  army: { base: 26, fort: 32, hills: 12, alien: 12 },
  palace: { base: 30, capital: 30, dev: 14, fort: 12, desert: 8 },
  tribes: { base: 24, desert: 34, rural: 24, dev: -18, city: -22 },

  // ---- the generated foreign courts (js/sim/courts.js archetypes) ----------
  crown: { base: 30, capital: 30, dev: 16, city: 12, rural: -10 },
  magnates: { base: 28, rural: 28, dev: 14, fort: 12, city: -12 },
  chiefs: { base: 26, desert: 28, rural: 26, dev: -14, city: -18 },
  warriors: { base: 26, desert: 22, hills: 18, fort: 14, city: -10 },
  elders: { base: 30, rural: 26, desert: 16, dev: -10, city: -14 },
};
