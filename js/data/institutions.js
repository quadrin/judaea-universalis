// Judaea Universalis — the institutions (SPEC §166). Content package: zero
// imports, read by js/sim/institutions.js and nothing else.
//
// WHY THESE AND NOT OTHERS. An institution here is not a technology and not an
// idea. It is a way of organising a state that arose in one place, spread from
// it, and made everywhere that had it structurally cheaper to govern than
// everywhere that did not. The test each entry has to pass is: could a court
// of the period have refused it, at a cost it could name?
//
// That test throws out most of what a period reader would expect. The alphabet
// is not here (nobody refuses an alphabet). Iron is not here (that is
// technology, and technology is three ladders bought with points). What is
// here is eleven arrangements that courts in this map's span argued about,
// adopted late, or refused on principle — and the argument is the point,
// because the ONE argument this whole game is about is whether to take the
// Greek way of doing things.
//
// THE HELLENIZER ENTRY. `chancery` is why this file exists. The quarrel
// between the Hellenizers and the pious was already in the game as flavour: an
// estate bar, a doctrine axis, forty event cards. It had no mechanical teeth
// anywhere — a player could keep the Hellenizers on the floor for a century
// and pay nothing for it but a modifier. Now refusing the Greek chancery means
// paying more for every level of every ladder for as long as you refuse it,
// and embracing it means the pious remember. That is the actual shape of the
// second century BCE, and it belongs in the arithmetic rather than the prose.
//
// EACH ENTRY:
//   id            stable key; provinces store progress under it
//   name, desc    what the panel prints
//   from          the year it appears in the world (BCE negative)
//   origin        province names, first that exists on the map wins
//   spread        base monthly points of progress pushed to a neighbour (0-100)
//   embrace       { gov, infl, treasury } — the one-time price of adopting it
//   factions      approval shifts on embracing, by faction id. Ids are matched
//                 against BOTH the player's authored estates (js/sim/factions.js)
//                 and the generated foreign courts (js/sim/courts.js), and both
//                 fail soft on ids they do not seat — so one list can speak to
//                 eight chapters without knowing which one is running.
//
// NOTE: entries carry NO `effects`. Embracing an institution grants no
// modifier — what it buys is that you stop paying a surcharge on every level
// of every technology ladder. See the long note in js/sim/institutions.js
// `embraceCore` for why the first draft's stat lines had to come out.

export const INSTITUTIONS = [
  {
    id: 'polis',
    name: 'The Polis',
    desc: 'The self-governing city: a council, a magistracy, a body of citizens '
      + 'who are the city rather than its subjects — and who can be taxed, levied '
      + 'and consulted as one thing.',
    from: -650,
    alien: { mult: 0.35, cap: 45 },
    origin: ['Corinth', 'Athens'],
    spread: 0.9,
    embrace: { gov: 40, treasury: 60 },
    factions: { cities: 8, notables: 6, people: 5, hellenizers: 6, elders: -4, quietists: -3 },
  },
  {
    id: 'coinage',
    name: 'Coined Money',
    desc: 'Struck metal of guaranteed weight bearing the issuer\'s name. A tax '
      + 'that can be assessed, an army that can be paid at a distance, and a '
      + 'treasury that means something between one harvest and the next.',
    from: -600,
    origin: ['Athens', 'Sidon'],
    spread: 1.1,
    embrace: { gov: 30, treasury: 80 },
    factions: { notables: 6, cities: 5, magnates: 4, senate: 4, elders: -3 },
  },
  {
    id: 'standing_army',
    name: 'The Standing Army',
    desc: 'Soldiers who are soldiers in peacetime: drilled, quartered, paid by '
      + 'the year, and loyal to whoever pays them. It wins wars a levy cannot '
      + 'fight, and it is the most expensive habit a state can acquire.',
    from: -330,
    origin: ['Pella', 'Antioch'],
    spread: 0.8,
    embrace: { mar: 50, treasury: 100 },
    factions: {
      warparty: 10, captains: 8, phalanx: 10, legions: 8, legion: 8, swords: 8, army: 8,
      villages: -6, tribes: -8, chiefs: -6, elders: -5, magnates: -4,
    },
  },
  {
    id: 'chancery',
    name: 'The Greek Chancery',
    desc: 'Government conducted in Greek, on papyrus, by salaried men who are '
      + 'not the king\'s relatives: registers, receipts, a standing archive and '
      + 'an appeal that goes upward. Every successor kingdom runs on it. Adopting '
      + 'it is not a translation — it is a decision about what your country is.',
    from: -300,
    alien: { mult: 0.18, cap: 38 },
    origin: ['Alexandria', 'Antioch'],
    spread: 0.85,
    embrace: { gov: 60, infl: 30, treasury: 120 },
    factions: {
      hellenizers: 14, cities: 10, notables: 8, senate: 4,
      hasideans: -14, pharisees: -10, zealots: -12, sages: -10, villages: -8,
      priesthood: -8, priests: -8, quietists: -6, church: -4, fighters: -6,
    },
  },
  {
    id: 'roman_law',
    name: 'Roman Law',
    desc: 'A civil law that is the same in Gades and in Antioch, a citizenship '
      + 'that can be granted, and courts that outlive the magistrates who sit in '
      + 'them. It makes a province governable by a stranger — which is the whole '
      + 'of its appeal and the whole of the objection to it.',
    from: -90,
    alien: { mult: 0.25, cap: 44 },
    origin: ['Roma'],
    spread: 0.75,
    embrace: { gov: 70, infl: 40, treasury: 140 },
    factions: {
      senate: 10, notables: 8, sadducees: 6, antipater: 8, kin: 8, magnates: 5,
      zealots: -12, sages: -8, captains: -6, fighters: -8, villages: -6, tribes: -6,
    },
  },
  {
    id: 'state_faith',
    name: 'The Established Faith',
    desc: 'One confession named in law as the state\'s own, with the others '
      + 'placed somewhere below it. It buys a court the loudest constituency it '
      + 'will ever have and hands it, permanently, the problem of everybody else.',
    from: 380,
    alien: { mult: 0.12, cap: 30 },
    origin: ['Byzantion', 'Roma'],
    spread: 0.8,
    embrace: { gov: 50, infl: 50, treasury: 90 },
    factions: {
      church: 14, priesthood: 12, priests: 12, zealots: 10, sages: 6, crowned: 6,
      demes: -6, landowners: -5, cities: -6, notables: -6, hellenizers: -10, quietists: -8,
    },
  },
  {
    id: 'codex',
    name: 'The Codex and the Canon',
    desc: 'The bound book that replaces the roll, and the closed collection that '
      + 'replaces the growing one — in law, in scripture, in everything a state '
      + 'wants to be able to cite. A government that can look a thing up is a '
      + 'different government.',
    from: 530,
    origin: ['Byzantion', 'Seleucia-Ctesiphon'],
    spread: 0.7,
    embrace: { gov: 70, treasury: 130 },
    factions: {
      council: 10, sanhedrin: 10, sages: 12, senate: 6, church: 6, exilarch: 8,
      captains: -5, crowned: -5, warriors: -5,
    },
  },
  {
    id: 'diwan',
    name: 'The Diwan',
    desc: 'The register office of a conquest state: who is on the payroll, who '
      + 'owes which tax at which rate, and in which language the whole thing is '
      + 'kept. It governs more people with fewer officials than anything before it.',
    from: 700,
    alien: { mult: 0.3, cap: 46 },
    origin: ['Damascus', 'Antioch'],
    spread: 0.85,
    embrace: { gov: 60, infl: 40, treasury: 120 },
    factions: {
      notables: 10, landowners: 8, magnates: 6, crown: 6,
      church: -8, demes: -6, zealots: -5,
    },
  },
  {
    id: 'gunpowder',
    name: 'Gunpowder',
    desc: 'Walls that stood for a thousand years come down in six weeks, and the '
      + 'castle stops being an argument. Every state that can afford a train of '
      + 'guns is suddenly larger than every state that cannot.',
    from: 1450,
    origin: ['Byzantion', 'Roma'],
    spread: 0.9,
    embrace: { mar: 70, treasury: 200 },
    factions: { army: 10, legions: 8, legion: 8, captains: 8, magnates: -8, tribes: -10, chiefs: -8 },
  },
  {
    id: 'industry',
    name: 'Industry',
    desc: 'Power that does not eat, applied to work that used to need hands. A '
      + 'country with it can equip an army its population has no business '
      + 'fielding — and must then find something for the hands to do.',
    from: 1780,
    origin: ['Britannia', 'Roma'],
    spread: 0.8,
    embrace: { gov: 80, treasury: 260 },
    factions: { kibbutzim: 10, coalition: 8, people: 6, cities: 8, tribes: -10, palace: -5 },
  },
  {
    id: 'general_staff',
    name: 'The General Staff',
    desc: 'War planned in peacetime by professionals who will not command it: '
      + 'mobilization timetables, a map room, and a plan for the war you are '
      + 'not currently fighting. It is the difference between an army and a '
      + 'crowd with rifles.',
    from: 1806,
    origin: ['Roma', 'Britannia'],
    spread: 0.85,
    embrace: { mar: 80, treasury: 220 },
    factions: { legions: 10, legion: 10, army: 10, captains: 8, coalition: 6, tribes: -10, palace: -6 },
  },
  {
    id: 'total_mobilization',
    name: 'Total Mobilization',
    desc: 'The whole population counted as a war resource: every adult on a '
      + 'register, every industry convertible, every reserve callable in '
      + 'forty-eight hours. A small country that has it outweighs a large one '
      + 'that does not — which is the arithmetic of 1948.',
    from: 1916,
    origin: ['Roma', 'Britannia'],
    spread: 0.75,
    embrace: { gov: 60, mar: 60, treasury: 240 },
    factions: {
      kibbutzim: 12, coalition: 10, revisionists: 8, people: 8, legion: 6,
      tribes: -14, palace: -10, magnates: -8, church: -4,
    },
  },
  {
    id: 'national_idea',
    name: 'The National Idea',
    desc: 'That a state should be the state OF a people, and that a people '
      + 'without one is owed one. It is the most powerful thing in this file and '
      + 'the least governable: every court that adopts it acquires a claim, and '
      + 'so does every people inside its borders.',
    from: 1820,
    origin: ['Roma', 'Athens'],
    spread: 1,
    embrace: { infl: 80, treasury: 180 },
    factions: {
      revisionists: 12, coalition: 8, captains: 10, fighters: 10, zealots: 8, people: 8,
      palace: -10, tribes: -12, church: -6, magnates: -8, crown: -6,
    },
  },
];

// An institution born this many years before a chapter opens is simply part of
// the furniture there: every province has it and every court embraced it before
// the campaign started. Without this rule a 1948 Israel would be told it was
// falling behind for want of the polis, and pay a 250% tech penalty for a
// question nobody in 1948 was asking.
export const UNIVERSAL_AFTER_YEARS = 300;
