// Judaea Universalis — what the estates can be asked for (SPEC §196). Content
// package: zero imports, read by js/sim/factions.js.
//
// WHY THIS FILE EXISTS. §167 gave every party ground — a strength in every
// province, an influence share at court, a colour on the estates mapmode —
// and then spent all of it on pressure: influence scaled their boons and
// banes, their mood rioted their own provinces. The crown could be leaned on
// by the estates and could never lean back. A player who spent thirty years
// keeping the Pharisees devoted got a passive modifier; the map that shows
// where the Pharisees are strong answered no question the player could act
// on. This file is the other half of the bargain: an estate that trusts the
// crown can be ASKED for things, and what it can give is read off the same
// ground the mapmode paints. The map is now a promise, not a diagnostic.
//
// WHAT AN ENTRY IS. Two asks per party, each naming a KIND (the engine's
// arithmetic — what it does and what it costs in favor) and carrying this
// party's own words for it. The magnitudes live once, in ASK_KINDS; the
// flavor lives here, per party, because "The Cities Vote a Crown of Gold"
// and "The Kibbutzim Mobilize" are the same lever and must not read as the
// same sentence. An id missing from this table falls back to ASK_FALLBACK —
// a plain subscription and a plain levy — so a chapter that seats a party
// nobody has written asks for degrades to generic, never to silence.
//
// THE KINDS (js/sim/factions.js interprets; every payoff × the party's
// influenceScale, 0.6–1.4 by its share of the realm's ground — SPEC §167):
//   coin      silver now: months of the realm's income, into the treasury
//   hands     their markets work for the crown: +income% for a year
//   men       an immediate levy: a share of maximum manpower
//   zeal      their fighters stiffen the host: +morale% for a year
//   calm      their ground goes quiet: −unrest everywhere for a year
//   blessing  their sanction: legitimacy, now
//   counsel   their men staff the crown's business: monarch points (`point`
//             names which; an ask may override it)
export const ASK_KINDS = {
  coin: { favor: 40, incomeMonths: 3, floor: 60 },
  hands: { favor: 30, incomeMult: 0.08, months: 12 },
  men: { favor: 40, share: 0.15, floor: 200 },
  zeal: { favor: 30, moraleMult: 0.06, months: 12 },
  calm: { favor: 30, unrest: 1.2, months: 12 },
  blessing: { favor: 35, legitimacy: 9 },
  counsel: { favor: 35, points: 22, point: 'gov' },
};

export const ASK_FALLBACK = [
  { kind: 'coin', name: 'A Subscription of Silver', text: 'They open their strongboxes for the crown that kept faith with them.' },
  { kind: 'men', name: 'A Levy From Their Ground', text: 'They send men from the districts where their word carries.' },
];

export const ESTATE_ASKS = {
  // ---- the Jewish chapters ------------------------------------------------
  hasideans: [
    { kind: 'men', name: 'The Pious Take Up Arms', text: 'The men who die rather than fight on the Sabbath will fight on every other day. The villages of the Law send their sons.' },
    { kind: 'calm', name: 'The Villages Keep the Law', text: 'Where their elders speak, the countryside holds its peace and waits.' },
  ],
  pharisees: [
    { kind: 'men', name: 'The Synagogues Send Their Sons', text: 'From every assembly where their teachers are heard, men of the countryside come to the standards.' },
    { kind: 'calm', name: 'The Teachers Counsel Patience', text: 'The oral law reaches villages the crown\'s edicts never do, and this season it counsels quiet.' },
  ],
  sadducees: [
    { kind: 'blessing', name: 'The Altar Acclaims the Crown', text: 'The high-priestly houses read the crown\'s name into the service of the House, and the country hears it.' },
    { kind: 'coin', name: 'The Temple Aristocracy Advances', text: 'Old houses with deep vaults advance the crown what the tax-farmers cannot raise.' },
  ],
  hellenizers: [
    { kind: 'coin', name: 'The Gymnasium Subscribes', text: 'The men of the new fashion raise a subscription in the Greek cities — proof, they say, of what accommodation buys.' },
    { kind: 'hands', name: 'The Harbours Open', text: 'Their factors and their guest-friendships put the realm\'s goods on every quay of the coast.' },
  ],
  zealots: [
    { kind: 'men', name: 'The Bands Come Down', text: 'From Galilee and the gorges, the bands that answer to no muster roll answer to this one, once.' },
    { kind: 'zeal', name: 'The Daggers Serve the War', text: 'Their certainty is contagious: the host fights like men who expect heaven to watch.' },
  ],
  notables: [
    { kind: 'coin', name: 'The Houses Subscribe', text: 'The men of property fund the crown they trust the way they fund nothing else: promptly.' },
    { kind: 'hands', name: 'The Markets Are Kept', text: 'Their stewards keep the markets supplied and the tolls flowing, war or no war.' },
  ],
  priesthood: [
    { kind: 'blessing', name: 'The Courses Bless the Crown', text: 'Every course of the altar names the crown in the daily offering, and legitimacy is made of such namings.' },
    { kind: 'calm', name: 'The Daily Offering Steadies', text: 'While the smoke rises on time, the country believes the world is in order.' },
  ],
  priests: [
    { kind: 'blessing', name: 'The Priesthood Sanctifies', text: 'The courses kept their rolls through five centuries of waiting; their sanction is the oldest coin in the country.' },
    { kind: 'calm', name: 'The Courses Resume', text: 'The service kept in order is the argument, older than any edict, that the crown is in order too.' },
  ],
  sages: [
    { kind: 'blessing', name: 'The Sages Give Their Sanction', text: 'The ordained rule that the crown\'s war is a war of obligation, and the ruling runs through every village court.' },
    { kind: 'calm', name: 'The Sages Rule for Patience', text: 'The academies read this season as one for endurance, and the hill country endures.' },
  ],
  villages: [
    { kind: 'men', name: 'The Hill Villages Arm', text: 'The terraces empty into the muster: men who know every goat-path between here and the plain.' },
    { kind: 'calm', name: 'The Villages Hold Fast', text: 'Their headmen answer for the quiet of every district where their word is law.' },
  ],
  captains: [
    { kind: 'zeal', name: 'The Garrisons Stand To', text: 'The men of the fortresses drill the host in what the sieges taught them.' },
    { kind: 'men', name: 'The Fortress Levies', text: 'Every stronghold empties its second rank into the field army.' },
  ],
  warparty: [
    { kind: 'men', name: 'The Standards Are Raised', text: 'The captains who fought the first campaigns raise the districts that remember them.' },
    { kind: 'zeal', name: 'The Veterans Set the Line', text: 'Men who broke a phalanx once teach the levies exactly where it breaks.' },
  ],
  swords: [
    { kind: 'zeal', name: 'The Hired Blades Drill', text: 'The professionals earn their pay twice: once fighting, once teaching.' },
    { kind: 'men', name: 'The Recruiters Ride Out', text: 'Their sergeants know every market where a man with a spear is for hire.' },
  ],
  kin: [
    { kind: 'counsel', name: 'The Family Council', text: 'The house that runs the realm\'s business sits late, and the crown\'s papers move at family speed.' },
    { kind: 'coin', name: 'The Family Silver', text: 'The house opens its own vaults — a loan between kin, which is to say a gift with a memory.' },
  ],
  antipater: [
    { kind: 'coin', name: 'The Idumaean Roads Pay', text: 'The steward\'s friendships along the caravan roads turn into silver whenever he asks them to.' },
    { kind: 'counsel', name: 'The Steward Whispers', text: 'Antipater\'s men carry the crown\'s case into every tent and every consulate that matters.', point: 'infl' },
  ],
  sanhedrin: [
    { kind: 'blessing', name: 'The Court Gives Its Sanction', text: 'Seventy-one judgments have weight; delivered for the crown, they are legitimacy in its purest coinage.' },
    { kind: 'calm', name: 'The Law Courts Sit', text: 'Justice seen in every gate is the cheapest garrison the country has.' },
  ],
  street: [
    { kind: 'men', name: 'The City Takes Up Staves', text: 'The crowd that can unmake a king can also fill a muster, when it loves him.' },
    { kind: 'calm', name: 'The Street Goes Home', text: 'The men who lead the chanting can also end it, and this month they end it.' },
  ],
  parthians: [
    { kind: 'men', name: 'The King of Kings Lends Horse', text: 'Their letters east are answered: squadrons cross the river under a friendly star.' },
    { kind: 'zeal', name: 'Lances of the East', text: 'Riders who learned war on the steppe school the host in the charge.' },
  ],
  fighters: [
    { kind: 'men', name: 'The Fighting Bands Gather', text: 'Every district that armed in secret sends what it armed.' },
    { kind: 'zeal', name: 'The Oath of the Deliverance', text: 'Men fighting for the end of an exile do not count odds.' },
  ],
  exilarch: [
    { kind: 'coin', name: 'The Exilarchate Remits', text: 'The house of the exile taxes a dispersion the crown cannot reach, and this year it remits.' },
    { kind: 'counsel', name: 'The Word From Ctesiphon', text: 'The exilarch\'s standing at the eastern court opens doors no envoy of ours could knock on.', point: 'infl' },
  ],
  crowned: [
    { kind: 'zeal', name: 'The King\'s Companions Ride', text: 'The men who put the diadem on him ride at the front, where the host can see them.' },
    { kind: 'men', name: 'The Banner Gathers', text: 'A crowned cause fills its ranks with men a mere revolt could never call.' },
  ],
  quietists: [
    { kind: 'calm', name: 'The Quiet Ones Keep the Peace', text: 'The men who counsel against every rising counsel the same to everyone else\'s.' },
    { kind: 'blessing', name: 'The Blessing of the Patient', text: 'Their patience has authority: a crown they endorse is a crown the pious can wait under.' },
  ],
  council: [
    { kind: 'counsel', name: 'The Elders Deliberate', text: 'The council\'s men take the crown\'s business through the districts they have run for generations.' },
    { kind: 'coin', name: 'The Council Assesses Itself', text: 'The families of the council vote an assessment on themselves — reluctantly, audibly, and in full.' },
  ],
  kibbutzim: [
    { kind: 'men', name: 'The Kibbutzim Mobilize', text: 'The settlements empty into the brigades: everyone between sixteen and fifty, and the tractors too.' },
    { kind: 'hands', name: 'The Land Is Worked', text: 'Double shifts in the fields and the packing houses: the movement feeds the state.' },
  ],
  coalition: [
    { kind: 'counsel', name: 'The Coalition Holds', text: 'The parties of government trade their quarrels for a working majority, and the state\'s business moves.' },
    { kind: 'coin', name: 'The Bond Drive', text: 'The institutions raise abroad what the treasury cannot raise at home.' },
  ],
  revisionists: [
    { kind: 'zeal', name: 'The Fighting Spirit', text: 'Their doctrine of iron walls and no retreats gets into the ranks.' },
    { kind: 'men', name: 'The Veterans Enlist', text: 'The underground\'s old hands bring themselves, and their networks, into the line.' },
  ],

  // ---- the client courts (SPEC §185) --------------------------------------
  pious: [
    { kind: 'calm', name: 'The Synagogues Pray for the King', text: 'Where the congregations bless the crown by name, the villages keep its peace.' },
    { kind: 'men', name: 'The Villages of the Golan Muster', text: 'The pious districts send men who fight better for a king they believe in.' },
  ],
  stewards: [
    { kind: 'coin', name: 'The Estates Advance the Rents', text: 'The stewards collect next year\'s rents this year, for a king who will remember it.' },
    { kind: 'hands', name: 'The Granaries Sell', text: 'The managed estates sell high and buy low on the crown\'s behalf.' },
  ],
  babylonians: [
    { kind: 'men', name: 'The Colony Sends Its Sons', text: 'The military settlement does what it was planted to do: it fields horsemen and archers at a word.' },
    { kind: 'zeal', name: 'Archers of the Euphrates', text: 'The colony\'s drillmasters teach the host to shoot the way the settlement shoots.' },
  ],
  proselytes: [
    { kind: 'blessing', name: 'The Converted Court Acclaims', text: 'A dynasty that chose the Law lends the crown the peculiar force of its choosing.' },
    { kind: 'counsel', name: 'Letters to the Dispersion', text: 'The royal house writes to every community from Egypt to Media, and the letters open doors.', point: 'infl' },
  ],
  magi: [
    { kind: 'calm', name: 'The Fire Altars Are Tended', text: 'The old priesthood, kept in honour, keeps the countryside from remembering its grievances.' },
    { kind: 'counsel', name: 'The Star-Readers Advise', text: 'The magi read the sky for the crown, and their readings carry weight in every village.', point: 'infl' },
  ],
  caravans: [
    { kind: 'coin', name: 'The Caravans Pay in Advance', text: 'The masters of the road buy next season\'s passage now, in silver.' },
    { kind: 'hands', name: 'The Tolls Are Farmed', text: 'Their factors run the crown\'s tolls the way they run their own ledgers: profitably.' },
  ],
  riders: [
    { kind: 'men', name: 'The Horse Comes Down', text: 'The hill squadrons answer the summons with remounts to spare.' },
    { kind: 'zeal', name: 'The Lance Is Sharpened', text: 'The riders school the host in the wheeling charge of the uplands.' },
  ],

  // ---- the empires and the neighbours -------------------------------------
  senate: [
    { kind: 'blessing', name: 'The Fathers Vote Honours', text: 'A grateful Senate votes thanksgivings, and the votes make the power look like the law.' },
    { kind: 'counsel', name: 'Senatorial Commissions', text: 'The fathers lend their sons to the provinces: quaestors, legates, men who know how the machine runs.' },
  ],
  legions: [
    { kind: 'zeal', name: 'The Eagles Are Paraded', text: 'The old cohorts show the new ones what a legion at ease with its emperor looks like.' },
    { kind: 'men', name: 'The Veterans Re-enlist', text: 'Time-served men sign for another eagle, at the crown\'s word and the camp\'s cheer.' },
  ],
  people: [
    { kind: 'men', name: 'The Head-Count Volunteers', text: 'The city that loves its princeps fills the recruiting tables without a press-gang in sight.' },
    { kind: 'calm', name: 'The Circus Is Content', text: 'Bread arrives, the factions cheer the right names, and the empire\'s streets police themselves.' },
  ],
  court: [
    { kind: 'counsel', name: 'The Chancery Works Late', text: 'The palace secretaries move the crown\'s business at the speed of royal favour.' },
    { kind: 'coin', name: 'The Royal Treasury Opens', text: 'The court advances the crown its own splendour — with interest payable in gratitude.' },
  ],
  phalanx: [
    { kind: 'zeal', name: 'The Silver Shields Parade', text: 'The guard regiments drill the line in the old Macedonian discipline.' },
    { kind: 'men', name: 'The Settlements Muster', text: 'The military colonies answer the summons their grants oblige them to answer — promptly, for once.' },
  ],
  cities: [
    { kind: 'coin', name: 'The Cities Vote a Crown of Gold', text: 'The Greek cities vote the crown-tax they call a gift and both sides call diplomacy.' },
    { kind: 'hands', name: 'The Ports Trade Freely', text: 'Their harbours clear the realm\'s cargoes first, and the customs houses feel it.' },
  ],
  church: [
    { kind: 'blessing', name: 'The Patriarch\'s Acclamation', text: 'The Church names the crown God-guarded in every liturgy from the capital to the frontier.' },
    { kind: 'calm', name: 'The Liturgy Steadies the Cities', text: 'Processions, relics and sermons do what edicts cannot: the cities compose themselves.' },
  ],
  landowners: [
    { kind: 'coin', name: 'The Great Estates Advance the Tax', text: 'The magnates pay three indictions at once, against remembrance at court.' },
    { kind: 'men', name: 'The Tenants Are Enrolled', text: 'The estates enroll their tenantry: reluctant soldiers, but many.' },
  ],
  army: [
    { kind: 'zeal', name: 'The Field Army Drills', text: 'The regiments sharpen the whole host to the standard of the guards.' },
    { kind: 'men', name: 'The Frontier Recruits', text: 'The military districts send up their drafts a season early.' },
  ],
  demes: [
    { kind: 'men', name: 'The Blues and Greens Enlist', text: 'The circus factions turn their muscle to the walls, under their own banners.' },
    { kind: 'calm', name: 'The Hippodrome Is Quiet', text: 'The chants are for the crown this season, and a chanting city is a governable one.' },
  ],
  palace: [
    { kind: 'counsel', name: 'The Diwan Advises', text: 'The palace circle runs the kingdom\'s business with the discretion the throne pays it for.' },
    { kind: 'blessing', name: 'The Weight of the Name', text: 'The dynasty\'s lineage is read aloud, and the country remembers why it obeys.' },
  ],
  legion: [
    { kind: 'zeal', name: 'The Legion Parades', text: 'The best-drilled force in the region shows the rest of the army what right looks like.' },
    { kind: 'men', name: 'The Legion Recruits', text: 'The regiments open their rolls to the tribes that feed them.' },
  ],
  tribes: [
    { kind: 'men', name: 'The Tribes Send Riders', text: 'The sheikhs answer the summons in person, which means every tent behind them answers too.' },
    { kind: 'calm', name: 'The Desert Is Quiet', text: 'The wells and the crossings keep the crown\'s peace, because the sheikhs said so.' },
  ],
};
