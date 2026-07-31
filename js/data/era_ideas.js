// js/data/era_ideas.js — the ideas of the age (SPEC §179). DOM-free data +
// pure helpers, the institutions.js pattern: one module owns the whole table.
//
// EU4 unlocks idea GROUPS at named technology levels; this is that, per
// chapter. Every bookmark carries four era idea groups — arts the age itself
// argued about — and each group opens when the matching technology ladder
// reaches its unlock level (`bookmark.techNames` gives that rung its name, so
// the locked card can say "Unlocked at The Greek Art of War (7)" instead of
// "mar 7"). Tiers are bought in order with the group's monarch point, and the
// institutions surcharge (SPEC §166) applies exactly as it does to the
// ladders themselves: a realm behind the world pays more to think.
//
// Contracts (pinned by smoke112):
// - group keys are globally unique (effects resolve from the flat registry,
//   because applyReformsToTag has a tag but no bookmark);
// - `unlock.ladder === point` — the ladder that opens a group is the ladder
//   that pays for it, one mental model, no exceptions;
// - every unlock level sits inside the bookmark's base..ceiling window, so
//   nothing is dangled that the century cannot reach;
// - every effects key is one the sim already consumes.
//
// State: `t.eraIdeas = { groupKey: tiersOwned }` — plain data, rides saves.

export const ERA_IDEA_TIERS = 3;

// Cost in the group's monarch point to buy `tier` (0-based). Dearer than the
// universal reform trees (50+25t): the age's own arts are the premium sink.
export function eraIdeaCost(tier) {
  return 60 + 30 * Math.max(0, tier | 0);
}

// ---------------------------------------------------------------- the groups
// Four per bookmark. Effects use only keys resolveTagMult/resolveTagAdd
// already consume (same contract as the reform trees and the tech ladders).
export const ERA_IDEA_GROUPS = {
  // ---- 167 BCE, The Maccabean Revolt --------------------------------------
  zeal_of_phinehas: {
    name: 'The Zeal of Phinehas', icon: 'flame', point: 'mar',
    unlock: { ladder: 'mar', level: 3 },
    desc: 'The war the hills taught: ambush, night marches, and a cause worth a covenant.',
    tiers: [
      { name: 'Ambush in the Passes', desc: 'The ascents of Beth Horon belong to those born on them: +1 to hill-country defense.', effects: { hillDefBonus: 1 } },
      { name: 'The Sabbath Ruling', desc: '"If we all do as our brothers have done, they will root us out" — the bands survive to fight: +10% manpower.', effects: { manpowerMult: 1.1 } },
      { name: 'The Hammer\'s Blow', desc: 'Strike the camp before it forms: +5% army strength.', effects: { milPowerMult: 1.05 } },
    ],
  },
  law_restored: {
    name: 'The Law Restored', icon: 'scroll', point: 'infl',
    unlock: { ladder: 'infl', level: 4 },
    desc: 'The scrolls burned in the squares are recopied in the hills — a people bound by a book.',
    tiers: [
      { name: 'Scribes of the Covenant', desc: 'The Law read aloud is the crown\'s best herald: +0.1 legitimacy a month.', effects: { legitimacyAdd: 0.1 } },
      { name: 'The Scrolls Recopied', desc: 'Every village keeps the book again: −0.5 unrest everywhere.', effects: { unrestAll: -0.5 } },
      { name: 'Hasidean Devotion', desc: 'Men who chose the covenant over the cave fight like it: +10% morale.', effects: { moraleMult: 1.1 } },
    ],
  },
  cleansed_house: {
    name: 'The Cleansed House', icon: 'lamp', point: 'gov',
    unlock: { ladder: 'gov', level: 5 },
    desc: 'A purified Temple is an exchequer as well as an altar: the half-shekel, the festivals, the stores.',
    tiers: [
      { name: 'The Half-Shekel Renewed', desc: 'Every man of Israel owes the House its due: +8% income.', effects: { incomeMult: 1.08 } },
      { name: 'Festival Pilgrims', desc: 'Three times a year the roads fill and the inns charge: +10% trade.', effects: { tradeMult: 1.1 } },
      { name: 'The Storehouses', desc: 'Grain in the Temple courts is a siege survived: +10% manpower.', effects: { manpowerMult: 1.1 } },
    ],
  },
  greek_art_of_war: {
    name: 'The Greek Art of War', icon: 'helmet', point: 'mar',
    unlock: { ladder: 'mar', level: 7 },
    desc: 'The Hasmoneans ended the war fighting like the kings they fought: engines, mercenaries, drilled ranks.',
    tiers: [
      { name: 'Engines of the Greeks', desc: 'Rams and towers taken, copied, and turned around: +20% siege progress.', effects: { siegeMult: 1.2 } },
      { name: 'Mercenary Captains', desc: 'Hired professionals drill the levies between campaigns: +5% discipline.', effects: { disciplineMult: 1.05 } },
      { name: 'The Phalanx Answered', desc: 'A line that can stand where the king\'s line stands: +5% army strength.', effects: { milPowerMult: 1.05 } },
    ],
  },

  // 167 BCE, the king's side: the arts of the kingdom of the Greeks.
  seleucid_phalanx: {
    name: 'The Seleucid Phalanx', icon: 'helmet', point: 'mar',
    unlock: { ladder: 'mar', level: 5 },
    desc: 'The grand army of the Epiphany: silver shields, siege parks, and the last war elephants.',
    tiers: [
      { name: 'The Argyraspides', desc: 'The guard regiments drill the line: +5% discipline.', effects: { disciplineMult: 1.05 } },
      { name: 'The Siege Park', desc: 'Rams, towers and engineers on the royal roster: +20% siege progress.', effects: { siegeMult: 1.2 } },
      { name: 'The Elephant Corps', desc: 'The beasts of Beth Zechariah: +5% army strength.', effects: { milPowerMult: 1.05 } },
    ],
  },
  royal_cities: {
    name: 'The Royal Cities', icon: 'bricks', point: 'gov',
    unlock: { ladder: 'gov', level: 4 },
    desc: 'The kingdom is a chain of founded cities; charters, colonists and satrapal order hold it together.',
    tiers: [
      { name: 'The Polis Charters', desc: 'A chartered city taxes itself for you: +8% income.', effects: { incomeMult: 1.08 } },
      { name: 'The King\'s Colonists', desc: 'Veterans settled on the land owe service for it: +10% manpower.', effects: { manpowerMult: 1.1 } },
      { name: 'The Satrapal Order', desc: 'A governor in every province, answerable and replaceable: −0.5 unrest everywhere.', effects: { unrestAll: -0.5 } },
    ],
  },
  kings_friends: {
    name: 'The King\'s Friends', icon: 'laurel', point: 'infl',
    unlock: { ladder: 'infl', level: 3 },
    desc: 'The court of the Friends, the festival at Daphne, and the word of a king who means to be seen.',
    tiers: [
      { name: 'The Court of Friends', desc: 'Honors bind tighter than garrisons: +0.15 legitimacy a month.', effects: { legitimacyAdd: 0.15 } },
      { name: 'The Festival of Daphne', desc: 'A month of spectacle tells the world the kingdom stands: +10% trade.', effects: { tradeMult: 1.1 } },
      { name: 'The Royal Word', desc: 'Edicts that arrive with gifts attached: −0.25 unrest, +5% income.', effects: { unrestAll: -0.25, incomeMult: 1.05 } },
    ],
  },

  // ---- 67 BCE, The Judaean Civil War --------------------------------------
  hasmonean_court: {
    name: 'The Hasmonean Court', icon: 'laurel', point: 'gov',
    unlock: { ladder: 'gov', level: 4 },
    desc: 'Three generations from the hills to a palace: a chancery, an assessment, a court that keeps books.',
    tiers: [
      { name: 'The King\'s Assessment', desc: 'Jannaeus\' surveyors mapped every terrace: +8% income.', effects: { incomeMult: 1.08 } },
      { name: 'Royal Garrisons', desc: 'The fortress line from Alexandrium to Machaerus holds the countryside: −0.5 unrest everywhere.', effects: { unrestAll: -0.5 } },
      { name: 'The Court of the Nasi', desc: 'A court that speaks both Greek and the Law: +0.1 legitimacy a month.', effects: { legitimacyAdd: 0.1 } },
    ],
  },
  schools_of_jerusalem: {
    name: 'The Schools of Jerusalem', icon: 'scroll', point: 'infl',
    unlock: { ladder: 'infl', level: 5 },
    desc: 'Pharisee and Sadducee argue in the same porticoes — and either school can crown a cause.',
    tiers: [
      { name: 'The Houses of Study', desc: 'Learning is a public work: +0.1 legitimacy a month.', effects: { legitimacyAdd: 0.1 } },
      { name: 'The Courts in the Gates', desc: 'Judgment seen is order kept: −0.5 unrest everywhere.', effects: { unrestAll: -0.5 } },
      { name: 'The Word Sent Abroad', desc: 'Letters to Alexandria and Babylon carry your case: +10% trade.', effects: { tradeMult: 1.1 } },
    ],
  },
  hired_lances: {
    name: 'Hired Lances', icon: 'horseshoe', point: 'mar',
    unlock: { ladder: 'mar', level: 6 },
    desc: 'Pisidians, Cilicians, Idumean riders: the brothers\' war is fought with bought steel.',
    tiers: [
      { name: 'The Paymaster\'s Muster', desc: 'Silver raises soldiers faster than sermons: +15% reinforcement speed.', effects: { reinforceMult: 1.15 } },
      { name: 'Veterans of Every War', desc: 'Men who have seen sieges before: +5% discipline.', effects: { disciplineMult: 1.05 } },
      { name: 'The Squadrons of Idumea', desc: 'Antipater\'s country rides for its patron: +10% manpower.', effects: { manpowerMult: 1.1 } },
    ],
  },
  roman_shadow: {
    name: 'The Roman Shadow', icon: 'shield', point: 'infl',
    unlock: { ladder: 'infl', level: 8 },
    desc: 'Pompey is in the east and every court learns the new grammar: embassies, bribes, and patience.',
    tiers: [
      { name: 'Envoys to the Proconsul', desc: 'The first court heard keeps the initiative: +0.15 legitimacy a month.', effects: { legitimacyAdd: 0.15 } },
      { name: 'Gifts That Are Remembered', desc: 'Eight hundred talents, judiciously placed: +10% trade.', effects: { tradeMult: 1.1 } },
      { name: 'Clients of the Republic', desc: 'Rome\'s friendship, priced and paid: −0.5 unrest everywhere, +5% income.', effects: { unrestAll: -0.5, incomeMult: 1.05 } },
    ],
  },

  // ---- 40 BCE, Herod's Rise ------------------------------------------------
  antipaters_web: {
    name: 'Antipater\'s Web', icon: 'coins', point: 'infl',
    unlock: { ladder: 'infl', level: 4 },
    desc: 'The father\'s inheritance: tolls, favors, and a friend in every port from Ascalon to Damascus.',
    tiers: [
      { name: 'The Customs Houses', desc: 'Every road south pays somebody; let it be you: +10% trade.', effects: { tradeMult: 1.1 } },
      { name: 'Quiet Arrangements', desc: 'A dinner in Damascus is worth a garrison: +0.1 legitimacy a month.', effects: { legitimacyAdd: 0.1 } },
      { name: 'The Family\'s Men', desc: 'Brothers and cousins hold the keys: +5% income.', effects: { incomeMult: 1.05 } },
    ],
  },
  friends_of_the_triumvirs: {
    name: 'Friends of the Triumvirs', icon: 'dove', point: 'infl',
    unlock: { ladder: 'infl', level: 6 },
    desc: 'Antony owes the family; Octavian will inherit the debt. Rome\'s civil wars are a ladder.',
    tiers: [
      { name: 'The Senate\'s Decree', desc: 'A kingship voted in an afternoon: +0.15 legitimacy a month.', effects: { legitimacyAdd: 0.15 } },
      { name: 'Legions on Loan', desc: 'Sosius marches when asked: +15% reinforcement speed.', effects: { reinforceMult: 1.15 } },
      { name: 'The Tribute Farmed', desc: 'Collect Rome\'s dues and keep the difference: +8% income.', effects: { incomeMult: 1.08 } },
    ],
  },
  builders_eye: {
    name: 'The Builder\'s Eye', icon: 'bricks', point: 'gov',
    unlock: { ladder: 'gov', level: 6 },
    desc: 'Cisterns at Masada, walls at every pass: the man builds like other men besiege.',
    tiers: [
      { name: 'The Desert Cisterns', desc: 'Water counted is a siege won before it starts: +1 to hill-country defense.', effects: { hillDefBonus: 1 } },
      { name: 'Fortress Granaries', desc: 'Ten years of corn behind every wall: +10% manpower.', effects: { manpowerMult: 1.1 } },
      { name: 'The Royal Foundations', desc: 'Towns rise where the king points: +10% town growth.', effects: { growthMult: 1.1 } },
    ],
  },
  a_kings_army: {
    name: 'A King\'s Army', icon: 'helmet', point: 'mar',
    unlock: { ladder: 'mar', level: 7 },
    desc: 'Galilean hillmen, Idumean riders and hired veterans, drilled into one instrument.',
    tiers: [
      { name: 'The Galilee Campaigns', desc: 'An army learns by winning small wars first: +5% discipline.', effects: { disciplineMult: 1.05 } },
      { name: 'The Siege of the Rock', desc: 'Engineers who have taken cave and crag: +20% siege progress.', effects: { siegeMult: 1.2 } },
      { name: 'The King\'s Own', desc: 'Paid from the king\'s purse, loyal to the king\'s person: +5% army strength.', effects: { milPowerMult: 1.05 } },
    ],
  },

  // 40 BCE, the last Hasmonean's side: a priest-king with Parthia at his back.
  anointed_house: {
    name: 'The Anointed House', icon: 'altar', point: 'gov',
    unlock: { ladder: 'gov', level: 5 },
    desc: 'Antigonus is what the Idumean can never be: high priest and king of the blood.',
    tiers: [
      { name: 'The High Priest\'s Court', desc: 'The office and the crown in one hand: +0.15 legitimacy a month.', effects: { legitimacyAdd: 0.15 } },
      { name: 'The Temple\'s Purse', desc: 'The House\'s revenues stand behind the House\'s king: +8% income.', effects: { incomeMult: 1.08 } },
      { name: 'The House\'s Clients', desc: 'Every family the dynasty raised owes it sons: +10% manpower.', effects: { manpowerMult: 1.1 } },
    ],
  },
  king_of_kings_friendship: {
    name: 'The King of Kings\' Friendship', icon: 'horseshoe', point: 'infl',
    unlock: { ladder: 'infl', level: 4 },
    desc: 'Pacorus\' lancers put the crown on; keeping their friendship keeps it on.',
    tiers: [
      { name: 'The Parthian Compact', desc: 'The horse archers ride when asked: +15% reinforcement speed.', effects: { reinforceMult: 1.15 } },
      { name: 'The Eastern Trade', desc: 'The silk and incense roads run for the King of Kings\' friends: +10% trade.', effects: { tradeMult: 1.1 } },
      { name: 'The Arsacid Ear', desc: 'A word at Ctesiphon outweighs a legion at Antioch: +0.1 legitimacy a month.', effects: { legitimacyAdd: 0.1 } },
    ],
  },
  zealous_city: {
    name: 'The Zealous City', icon: 'walls', point: 'mar',
    unlock: { ladder: 'mar', level: 6 },
    desc: 'Jerusalem chose Antigonus and will stand a siege for him — the city is the army.',
    tiers: [
      { name: 'The Walls Manned', desc: 'Every quarter takes a stretch of rampart: +1 to hill-country defense.', effects: { hillDefBonus: 1 } },
      { name: 'The City\'s Oath', desc: 'A cause sworn in the Temple courts: +10% morale.', effects: { moraleMult: 1.1 } },
      { name: 'The Last Muster', desc: 'The dynasty\'s final levy empties the villages: +10% manpower.', effects: { manpowerMult: 1.1 } },
    ],
  },

  // ---- 66 CE, The Great Revolt --------------------------------------------
  fourth_philosophy: {
    name: 'The Fourth Philosophy', icon: 'flame', point: 'mar',
    unlock: { ladder: 'mar', level: 5 },
    desc: 'No master but God: the creed Josephus blamed for everything, under arms.',
    tiers: [
      { name: 'No King but God', desc: 'A cause that cannot surrender: +10% morale.', effects: { moraleMult: 1.1 } },
      { name: 'The Sicarii\'s Shadow', desc: 'Collaboration has a price collected at festivals: −0.5 unrest in our own streets.', effects: { unrestAll: -0.5 } },
      { name: 'The Oath of the Free', desc: 'Every man sworn is a soldier found: +10% manpower.', effects: { manpowerMult: 1.1 } },
    ],
  },
  treasury_of_the_house: {
    name: 'The Treasury of the House', icon: 'coins', point: 'gov',
    unlock: { ladder: 'gov', level: 6 },
    desc: 'Seventeen talents started the war; the rest of the treasury will have to finish it.',
    tiers: [
      { name: 'The Korban Administered', desc: 'The House\'s wealth, audited and spent with care: +8% income.', effects: { incomeMult: 1.08 } },
      { name: 'The Coined Revolution', desc: '"Year One" silver in every market: +10% trade.', effects: { tradeMult: 1.1 } },
      { name: 'The War Chest', desc: 'What Florus could not steal pays the walls\' defenders: +10% manpower.', effects: { manpowerMult: 1.1 } },
    ],
  },
  walls_of_jerusalem: {
    name: 'The Walls of the City', icon: 'walls', point: 'gov',
    unlock: { ladder: 'gov', level: 8 },
    desc: 'Agrippa\'s third wall, finished in haste by the men it must protect.',
    tiers: [
      { name: 'The Third Wall Finished', desc: 'The north side closed at last: +1 to hill-country defense.', effects: { hillDefBonus: 1 } },
      { name: 'The City Provisioned', desc: 'Granaries filled before the ring closes: +10% manpower.', effects: { manpowerMult: 1.1 } },
      { name: 'Every Tower Manned', desc: 'A wall is its watch: −0.5 unrest everywhere.', effects: { unrestAll: -0.5 } },
    ],
  },
  nation_in_arms: {
    name: 'A Nation in Arms', icon: 'spears', point: 'mar',
    unlock: { ladder: 'mar', level: 8 },
    desc: 'Josephus drilled Galilee in the Roman manner; the nation must learn what its enemies know.',
    tiers: [
      { name: 'Drill in the Roman Manner', desc: 'Ranks, signals, and the short sword\'s discipline: +5% discipline.', effects: { disciplineMult: 1.05 } },
      { name: 'The Armories of Galilee', desc: 'Every town forges and every town stores: +15% reinforcement speed.', effects: { reinforceMult: 1.15 } },
      { name: 'Veterans of the First Year', desc: 'Beth Horon\'s victors teach the new men: +5% army strength.', effects: { milPowerMult: 1.05 } },
    ],
  },

  // 66 CE, the empire's side: Vespasian's war of method.
  flavian_method: {
    name: 'The Flavian Method', icon: 'tower', point: 'mar',
    unlock: { ladder: 'mar', level: 8 },
    desc: 'No battles that can be refused, no fortress left behind the line: the war won by procedure.',
    tiers: [
      { name: 'The Methodical Advance', desc: 'Reduce everything, garrison everything, hurry nothing: +20% siege progress.', effects: { siegeMult: 1.2 } },
      { name: 'The Legions Combined', desc: 'Three legions maneuvering as one instrument: +5% discipline.', effects: { disciplineMult: 1.05 } },
      { name: 'The Auxilia Raised', desc: 'The client kings and the provinces fill the second line: +10% manpower.', effects: { manpowerMult: 1.1 } },
    ],
  },
  grain_of_egypt: {
    name: 'The Grain of Egypt', icon: 'grain', point: 'gov',
    unlock: { ladder: 'gov', level: 7 },
    desc: 'Vespasian took Egypt before he took Rome: the war is a supply problem solved.',
    tiers: [
      { name: 'The Alexandrian Corn', desc: 'The granary of the world feeds the army first: +10% manpower.', effects: { manpowerMult: 1.1 } },
      { name: 'The Supply Depots', desc: 'Caesarea and Ptolemais stocked for years of war: +15% reinforcement speed.', effects: { reinforceMult: 1.15 } },
      { name: 'The War Paid For', desc: 'The East\'s taxes fund the East\'s reconquest: +8% income.', effects: { incomeMult: 1.08 } },
    ],
  },
  client_kings_managed: {
    name: 'The Client Kings Managed', icon: 'dove', point: 'infl',
    unlock: { ladder: 'infl', level: 5 },
    desc: 'Agrippa, Antiochus, Soaemus: the East\'s crowned heads march for Rome when handled well.',
    tiers: [
      { name: 'The Loyal Tetrarchs', desc: 'Kings pleading Rome\'s case in their own tongues: +0.1 legitimacy a month.', effects: { legitimacyAdd: 0.1 } },
      { name: 'The Eastern Settlements', desc: 'Quarrels judged before they become risings: −0.5 unrest everywhere.', effects: { unrestAll: -0.5 } },
      { name: 'The Kings\' Contingents', desc: 'Every client crown owes a column: +10% manpower.', effects: { manpowerMult: 1.1 } },
    ],
  },

  // ---- 132 CE, The Bar Kokhba Revolt --------------------------------------
  method_of_the_caves: {
    name: 'The Method of the Caves', icon: 'mountain', point: 'mar',
    unlock: { ladder: 'mar', level: 5 },
    desc: 'Dio\'s complaint: they did not meet Rome in the open, and the hides and tunnels were dug first.',
    tiers: [
      { name: 'The Hideout Systems', desc: 'A war fought from under the hills: +1 to hill-country defense.', effects: { hillDefBonus: 1 } },
      { name: 'The Underground Granaries', desc: 'Stores the columns never find: +10% manpower.', effects: { manpowerMult: 1.1 } },
      { name: 'Rise, Strike, Vanish', desc: 'The road belongs to whoever holds its shoulders: +5% army strength.', effects: { milPowerMult: 1.05 } },
    ],
  },
  prince_of_israel: {
    name: 'The Prince of Israel', icon: 'star8', point: 'gov',
    unlock: { ladder: 'gov', level: 6 },
    desc: 'The letters from Wadi Murabba\'at are a functioning state\'s: leases, rations, and a Nasi who signs.',
    tiers: [
      { name: 'The Land Leased Anew', desc: 'The Nasi\'s clerks re-let every confiscated field: +8% income.', effects: { incomeMult: 1.08 } },
      { name: 'The Prince\'s Writ', desc: 'Orders that arrive and are obeyed: −0.5 unrest everywhere.', effects: { unrestAll: -0.5 } },
      { name: 'The Camps Provisioned', desc: 'Salt, wheat and wine move on schedule: +15% reinforcement speed.', effects: { reinforceMult: 1.15 } },
    ],
  },
  sages_sanction: {
    name: 'The Sages\' Sanction', icon: 'lamp', point: 'infl',
    unlock: { ladder: 'infl', level: 7 },
    desc: 'Akiva carried the arms-bearer\'s star: the schools\' blessing makes a rising a redemption.',
    tiers: [
      { name: 'The Star Proclaimed', desc: '"A star has gone forth from Jacob": +0.15 legitimacy a month.', effects: { legitimacyAdd: 0.15 } },
      { name: 'The Ordination Kept', desc: 'Teachers ordained in defiance of the decrees: −0.5 unrest everywhere.', effects: { unrestAll: -0.5 } },
      { name: 'Sanctifiers of the Name', desc: 'Men who know exactly what they risk: +10% morale.', effects: { moraleMult: 1.1 } },
    ],
  },
  redemption_mint: {
    name: 'The Redemption Coinage', icon: 'coins', point: 'gov',
    unlock: { ladder: 'gov', level: 8 },
    desc: 'Denarii of the oppressor, overstruck with the Temple facade and a new calendar.',
    tiers: [
      { name: 'The Overstruck Denarii', desc: 'Every coin in the land re-minted for the cause: +8% income.', effects: { incomeMult: 1.08 } },
      { name: '"For the Freedom of Jerusalem"', desc: 'The legend on the silver is a promise kept public: +0.1 legitimacy a month.', effects: { legitimacyAdd: 0.1 } },
      { name: 'The Years of the Redemption', desc: 'A state that dates its own documents: +5% income, −0.25 unrest.', effects: { incomeMult: 1.05, unrestAll: -0.25 } },
    ],
  },

  // 132 CE, the empire's side: the war Hadrian refused to lose.
  expedita_army: {
    name: 'The Expeditionary Army', icon: 'helmet', point: 'mar',
    unlock: { ladder: 'mar', level: 8 },
    desc: 'Severus from Britain, vexillations from every frontier: the empire\'s whole toolbox, brought to one province.',
    tiers: [
      { name: 'The Vexillations Gathered', desc: 'Picked detachments of a dozen armies: +5% discipline.', effects: { disciplineMult: 1.05 } },
      { name: 'The Counter-Ambush School', desc: 'Severus fights the hills\' war in the hills: +1 to hill-country defense.', effects: { hillDefBonus: 1 } },
      { name: 'The Engineers Forward', desc: 'Every cave system mapped, mined and starved: +20% siege progress.', effects: { siegeMult: 1.2 } },
    ],
  },
  provincia_restituta: {
    name: 'The Province Restored', icon: 'bricks', point: 'gov',
    unlock: { ladder: 'gov', level: 7 },
    desc: 'Hadrian builds even while he burns: roads, colonies, and the assessment that follows the standards.',
    tiers: [
      { name: 'The Roads Rebuilt', desc: 'The legionary highways carry taxes as well as columns: +8% income.', effects: { incomeMult: 1.08 } },
      { name: 'The Colonies Planted', desc: 'Veterans settled on confiscated land hold it cheap: +10% town growth.', effects: { growthMult: 1.1 } },
      { name: 'The Assessment Resumed', desc: 'A province that pays again is a province again: +5% income, −0.25 unrest.', effects: { incomeMult: 1.05, unrestAll: -0.25 } },
    ],
  },
  hadrians_peace: {
    name: 'The Emperor\'s Peace', icon: 'laurel', point: 'infl',
    unlock: { ladder: 'infl', level: 5 },
    desc: 'The most-traveled emperor governs by presence: the progress, the Panhellenion, the settled frontier.',
    tiers: [
      { name: 'The Emperor\'s Progress', desc: 'The court arrives, judges, endows, departs: +0.15 legitimacy a month.', effects: { legitimacyAdd: 0.15 } },
      { name: 'The Panhellenion', desc: 'The Greek cities enrolled in one imperial communion: +10% trade.', effects: { tradeMult: 1.1 } },
      { name: 'The Frontier Settled', desc: 'Walls, treaties and subsidies quiet every border but this one: −0.5 unrest everywhere.', effects: { unrestAll: -0.5 } },
    ],
  },

  // ---- 529 CE, The Keepers -------------------------------------------------
  mountain_of_blessing: {
    name: 'The Mountain of Blessing', icon: 'altar', point: 'infl',
    unlock: { ladder: 'infl', level: 9 },
    desc: 'Gerizim, not Jerusalem: the one sanctuary the Keepers ever needed, church on its summit or no.',
    tiers: [
      { name: 'The True Sanctuary', desc: 'The mountain gathers the faithful as it always has: +0.15 legitimacy a month.', effects: { legitimacyAdd: 0.15 } },
      { name: 'The Feasts Kept', desc: 'Passover on the summit in open defiance: +10% morale.', effects: { moraleMult: 1.1 } },
      { name: 'The Blessing and the Curse', desc: 'A people that knows which mountain it stands on: −0.5 unrest everywhere.', effects: { unrestAll: -0.5 } },
    ],
  },
  villages_of_the_hills: {
    name: 'The Villages of the Hills', icon: 'spears', point: 'mar',
    unlock: { ladder: 'mar', level: 10 },
    desc: 'Samaria\'s terraced country raised a hundred thousand once before; the muster rolls are the villages.',
    tiers: [
      { name: 'The Terrace Wall Levies', desc: 'Every village fights for its own stones: +10% manpower.', effects: { manpowerMult: 1.1 } },
      { name: 'The Hill Paths', desc: 'Columns move by ways the dux\'s maps omit: +1 to hill-country defense.', effects: { hillDefBonus: 1 } },
      { name: 'The Young Men Sworn', desc: 'The rising\'s first act was an oath: +10% morale.', effects: { moraleMult: 1.1 } },
    ],
  },
  keepers_law: {
    name: 'The Keepers\' Torah', icon: 'scroll', point: 'gov',
    unlock: { ladder: 'gov', level: 11 },
    desc: 'Five books, one mountain, and a priesthood that never lapsed: law enough to run a kingdom.',
    tiers: [
      { name: 'The Priests\' Courts', desc: 'The high priest\'s judgment replaces the prefect\'s: −0.5 unrest everywhere.', effects: { unrestAll: -0.5 } },
      { name: 'The Tithes Gathered', desc: 'What Byzantium assessed, the Keepers now collect: +8% income.', effects: { incomeMult: 1.08 } },
      { name: 'The Book of the Kingdom', desc: 'A king under the Law is a king the villages accept: +0.1 legitimacy a month.', effects: { legitimacyAdd: 0.1 } },
    ],
  },
  baba_rabbas_inheritance: {
    name: 'Baba Rabba\'s Inheritance', icon: 'lamp', point: 'gov',
    unlock: { ladder: 'gov', level: 13 },
    desc: 'The reformer\'s synagogues, schools and districts — a shadow administration two centuries old.',
    tiers: [
      { name: 'The Eight Districts', desc: 'The land already divided for governing: +8% income.', effects: { incomeMult: 1.08 } },
      { name: 'The Synagogue Schools', desc: 'Literate villages administer themselves: +10% town growth.', effects: { growthMult: 1.1 } },
      { name: 'The Elders Restored', desc: 'The reformer\'s councils seated again: +0.1 legitimacy a month.', effects: { legitimacyAdd: 0.1 } },
    ],
  },

  // 529 CE, the empire's side: Justinian's spring — the Codex is published
  // the very month the rising begins.
  codex_of_laws: {
    name: 'The Codex of Laws', icon: 'scroll', point: 'gov',
    unlock: { ladder: 'gov', level: 12 },
    desc: 'April 529: one law for the whole inhabited world, and assessors who answer to the book.',
    tiers: [
      { name: 'One Law for the Oikoumene', desc: 'The same rule in every province ends a thousand quarrels: −0.5 unrest everywhere.', effects: { unrestAll: -0.5 } },
      { name: 'The Assessors Incorruptible', desc: 'Tax farmed by the book, not the farmer: +8% income.', effects: { incomeMult: 1.08 } },
      { name: 'The Novels Follow', desc: 'A living law announces a living empire: +0.1 legitimacy a month.', effects: { legitimacyAdd: 0.1 } },
    ],
  },
  federate_lances: {
    name: 'The Federate Lances', icon: 'horseshoe', point: 'mar',
    unlock: { ladder: 'mar', level: 11 },
    desc: 'Ghassanid phylarchs, bucellarii and paid limitanei: the sixth-century army is a web of contracts.',
    tiers: [
      { name: 'The Ghassanid Compact', desc: 'The phylarch\'s riders arrive before the field army does: +15% reinforcement speed.', effects: { reinforceMult: 1.15 } },
      { name: 'The Bucellarii', desc: 'Private regiments of picked veterans: +5% discipline.', effects: { disciplineMult: 1.05 } },
      { name: 'The Limitanei Paid', desc: 'Border soldiers paid on time stay border soldiers: +10% manpower.', effects: { manpowerMult: 1.1 } },
    ],
  },
  two_fronts_purse: {
    name: 'The Two Fronts', icon: 'scales', point: 'infl',
    unlock: { ladder: 'infl', level: 9 },
    desc: 'Persia in the east, ambition in the west: the empire buys the peace it cannot fight for.',
    tiers: [
      { name: 'The Eternal Peace, Priced', desc: 'Gold to Ctesiphon is cheaper than a second war: +10% trade.', effects: { tradeMult: 1.1 } },
      { name: 'The Silk Diplomacy', desc: 'The routes east pay for the wars west: +5% income, +5% trade.', effects: { incomeMult: 1.05, tradeMult: 1.05 } },
      { name: 'The Emperor\'s Agents', desc: 'Word of trouble arrives before the trouble does: −0.5 unrest everywhere.', effects: { unrestAll: -0.5 } },
    ],
  },

  // ---- 614 CE, The Persian Gambit -----------------------------------------
  exilarchs_silver: {
    name: 'The Exilarch\'s Silver', icon: 'coins', point: 'infl',
    unlock: { ladder: 'infl', level: 10 },
    desc: 'Babylonia is rich, organized, and watching: the Return is financed from the Euphrates.',
    tiers: [
      { name: 'The House of David\'s Purse', desc: 'The Exilarch\'s treasurers open accounts: +8% income.', effects: { incomeMult: 1.08 } },
      { name: 'The Caravans of Mahoza', desc: 'Silk-road silver moves through friendly hands: +10% trade.', effects: { tradeMult: 1.1 } },
      { name: 'Benjamin\'s Muster', desc: 'The rich man of Tiberias arms whom he funds: +10% manpower.', effects: { manpowerMult: 1.1 } },
    ],
  },
  kings_covenant: {
    name: 'The King of Kings\' Covenant', icon: 'star8', point: 'infl',
    unlock: { ladder: 'infl', level: 11 },
    desc: 'Khosrow\'s war made the Return possible; managing Khosrow makes it survivable.',
    tiers: [
      { name: 'The Court at Ctesiphon', desc: 'A standing embassy where the decisions are made: +0.15 legitimacy a month.', effects: { legitimacyAdd: 0.15 } },
      { name: 'The Shahrbaraz Understanding', desc: 'The general\'s goodwill, separately purchased: +15% reinforcement speed.', effects: { reinforceMult: 1.15 } },
      { name: 'Tribute Weighed, Not Seized', desc: 'A fixed sum beats an open hand: +5% income, −0.25 unrest.', effects: { incomeMult: 1.05, unrestAll: -0.25 } },
    ],
  },
  remnants_walls: {
    name: 'The Remnant\'s Walls', icon: 'walls', point: 'mar',
    unlock: { ladder: 'mar', level: 12 },
    desc: 'Whatever Persia decides, the Return must be expensive to remove.',
    tiers: [
      { name: 'The City Refortified', desc: 'Jerusalem\'s breaches closed with Persian consent or without it: +1 to hill-country defense.', effects: { hillDefBonus: 1 } },
      { name: 'The Watch of the Hills', desc: 'Beacons from Hebron to Galilee: +5% discipline.', effects: { disciplineMult: 1.05 } },
      { name: 'A People Under Arms', desc: 'Five centuries of waiting armed a generation: +10% manpower.', effects: { manpowerMult: 1.1 } },
    ],
  },
  rule_of_the_academies: {
    name: 'The Rule of the Academies', icon: 'scroll', point: 'gov',
    unlock: { ladder: 'gov', level: 12 },
    desc: 'Sura and Pumbedita have governed a nation without a state for four centuries; now with one.',
    tiers: [
      { name: 'The Law of the Land', desc: 'Courts that already exist begin to rule: −0.5 unrest everywhere.', effects: { unrestAll: -0.5 } },
      { name: 'The Kallah Months', desc: 'Twice a year the whole people is convened and counted: +0.1 legitimacy a month.', effects: { legitimacyAdd: 0.1 } },
      { name: 'The Geonic Chancery', desc: 'Responsa move like dispatches: +8% income.', effects: { incomeMult: 1.08 } },
    ],
  },

  // 614 CE, the empire's side: Heraclius rebuilding a state out of a shipwreck.
  heraclian_reform: {
    name: 'The Heraclian Reform', icon: 'scales', point: 'gov',
    unlock: { ladder: 'gov', level: 11 },
    desc: 'Half the coinage, all of the church plate, and an empire reorganized to survive.',
    tiers: [
      { name: 'The Coinage Halved, the Army Paid', desc: 'Austerity with a purpose: +8% income.', effects: { incomeMult: 1.08 } },
      { name: 'The Church\'s Plate', desc: 'The Patriarch melts the vessels for the war of the Cross: +10% manpower.', effects: { manpowerMult: 1.1 } },
      { name: 'The Themes Foreshadowed', desc: 'Soldiers settled on the land they defend: −0.5 unrest everywhere.', effects: { unrestAll: -0.5 } },
    ],
  },
  true_cross_banner: {
    name: 'The Banner of the Cross', icon: 'flag', point: 'infl',
    unlock: { ladder: 'infl', level: 11 },
    desc: 'The first crusade in all but name: the relic taken from Jerusalem is the war\'s own standard.',
    tiers: [
      { name: 'The War of the Icons', desc: 'The image carried before the army: +10% morale.', effects: { moraleMult: 1.1 } },
      { name: 'The Patriarch\'s Loan', desc: 'Sergius funds what he sanctifies: +8% income.', effects: { incomeMult: 1.08 } },
      { name: 'The Christian Oikoumene', desc: 'Every see from Carthage to the Caucasus prays for the emperor: +0.15 legitimacy a month.', effects: { legitimacyAdd: 0.15 } },
    ],
  },
  thematic_muster: {
    name: 'The Thematic Muster', icon: 'helmet', point: 'mar',
    unlock: { ladder: 'mar', level: 12 },
    desc: 'The army Heraclius takes east in 622: drilled through two winters, paid in land, fighting for home.',
    tiers: [
      { name: 'The Soldiers\' Lands', desc: 'A farm held for service is a soldier held for life: +10% manpower.', effects: { manpowerMult: 1.1 } },
      { name: 'The Cataphract Answer', desc: 'Armored horse to meet the Persian pattern: +5% army strength.', effects: { milPowerMult: 1.05 } },
      { name: 'The Winter Drills', desc: 'Two years in Anatolia forging one instrument: +5% discipline.', effects: { disciplineMult: 1.05 } },
    ],
  },

  // ---- 1948, The War of Independence --------------------------------------
  national_institutions: {
    name: 'The National Institutions', icon: 'scales', point: 'gov',
    unlock: { ladder: 'gov', level: 19 },
    desc: 'The state existed before it was declared: an executive, a fund, a labor federation, a shadow treasury.',
    tiers: [
      { name: 'The Situation Committee', desc: 'The handover planned department by department: −0.5 unrest everywhere.', effects: { unrestAll: -0.5 } },
      { name: 'The National Funds', desc: 'A treasury with donors on five continents: +8% income.', effects: { incomeMult: 1.08 } },
      { name: 'The Civil Service Stands Up', desc: 'Ministries out of mandate departments overnight: +10% town growth.', effects: { growthMult: 1.1 } },
    ],
  },
  arms_ships: {
    name: 'The Arms Ships', icon: 'ship', point: 'infl',
    unlock: { ladder: 'infl', level: 20 },
    desc: 'The war will be decided by what clears customs: Czech rifles, surplus Messerschmitts, sterling credits.',
    tiers: [
      { name: 'The Prague Contracts', desc: 'Somebody will always sell; find them first: +15% reinforcement speed.', effects: { reinforceMult: 1.15 } },
      { name: 'The Blockade Runners', desc: 'Freighters with false manifests and real cargo: +10% trade.', effects: { tradeMult: 1.1 } },
      { name: 'The Foreign Purchasing Missions', desc: 'Geneva accounts, Panama flags, Prague airfields: +5% fleet strength, +5% income.', effects: { navalMult: 1.05, incomeMult: 1.05 } },
    ],
  },
  people_in_arms: {
    name: 'The People in Arms', icon: 'spears', point: 'mar',
    unlock: { ladder: 'mar', level: 21 },
    desc: 'Total mobilization: every man and woman of military age, every truck, every machine shop.',
    tiers: [
      { name: 'The Draft of the Whole', desc: 'Conscription without exemption: +10% manpower.', effects: { manpowerMult: 1.1 } },
      { name: 'The Home Front Workshops', desc: 'Sten guns from bed frames, armor from boiler plate: +15% reinforcement speed.', effects: { reinforceMult: 1.15 } },
      { name: 'The Veterans of Two Wars', desc: 'The world war\'s sergeants train the new brigades: +5% discipline.', effects: { disciplineMult: 1.05 } },
    ],
  },
  armored_school: {
    name: 'The Armored School', icon: 'helmet', point: 'mar',
    unlock: { ladder: 'mar', level: 23 },
    desc: 'The next war\'s doctrine, written while this one is still being fought: concentration, speed, the indirect approach.',
    tiers: [
      { name: 'The Brigade Group', desc: 'All arms under one radio net: +5% discipline.', effects: { disciplineMult: 1.05 } },
      { name: 'The Night Attack Doctrine', desc: 'Darkness is a force multiplier for the side that trains in it: +10% morale.', effects: { moraleMult: 1.1 } },
      { name: 'Concentration of Effort', desc: 'The schwerpunkt, learned and taught: +5% army strength.', effects: { milPowerMult: 1.05 } },
    ],
  },

  // 1948, the kingdom's side: the one Arab army the war made heavier.
  arab_legion: {
    name: 'The Arab Legion', icon: 'helmet', point: 'mar',
    unlock: { ladder: 'mar', level: 20 },
    desc: 'Long-service regulars, British-officered, the best-drilled force between Cairo and Baghdad.',
    tiers: [
      { name: 'The Officer Cadre', desc: 'Professionals command every company: +5% discipline.', effects: { disciplineMult: 1.05 } },
      { name: 'The Desert Patrol', desc: 'The force that knows every wadi holds every ridge: +1 to hill-country defense.', effects: { hillDefBonus: 1 } },
      { name: 'The Long-Service Men', desc: 'Soldiers by profession, not conscription: +10% morale.', effects: { moraleMult: 1.1 } },
    ],
  },
  hashemite_court: {
    name: 'The Hashemite Court', icon: 'star8', point: 'gov',
    unlock: { ladder: 'gov', level: 19 },
    desc: 'A dynasty of the Prophet\'s house, a diwan that hears every sheikh, and two banks to govern.',
    tiers: [
      { name: 'The King\'s Diwan', desc: 'The audience is the administration: +0.15 legitimacy a month.', effects: { legitimacyAdd: 0.15 } },
      { name: 'The Tribal Subsidies', desc: 'The desert paid is the desert quiet: −0.5 unrest everywhere.', effects: { unrestAll: -0.5 } },
      { name: 'The Two Banks Administered', desc: 'The kingdom absorbs what it holds: +8% income.', effects: { incomeMult: 1.08 } },
    ],
  },
  foreign_subsidy: {
    name: 'The Foreign Subsidy', icon: 'coins', point: 'infl',
    unlock: { ladder: 'infl', level: 19 },
    desc: 'Sterling balances, treaty ports and quiet understandings: a small state\'s great-power arithmetic.',
    tiers: [
      { name: 'The Sterling Balances', desc: 'London pays the Legion\'s wages: +8% income.', effects: { incomeMult: 1.08 } },
      { name: 'The Treaty Ports', desc: 'Aqaba and the oil road earn their keep: +10% trade.', effects: { tradeMult: 1.1 } },
      { name: 'The Quiet Understandings', desc: 'What is agreed across the river need not be signed: +0.1 legitimacy a month.', effects: { legitimacyAdd: 0.1 } },
    ],
  },
};

// Which groups each chapter teaches WHOM, in panel order (locked cards keep
// their seats, the EU4 screen's fixed slots). Each side of a chapter learns
// its own arts — a Seleucid king is not sold the Zeal of Phinehas, and the
// Nasi is not offered the Emperor's Peace. `default` covers the courts the
// chapter never wrote a curriculum for: the Hellenistic world defaults to
// the king's arts, the shared Levantine chapters to the common set, and the
// eras whose sides share nothing default to none at all.
export const ERA_IDEAS_BY_BOOKMARK = {
  '167bce': {
    HAS: ['zeal_of_phinehas', 'law_restored', 'cleansed_house', 'greek_art_of_war'],
    SEL: ['royal_cities', 'kings_friends', 'seleucid_phalanx'],
    default: ['royal_cities', 'kings_friends', 'seleucid_phalanx'],
  },
  // The brothers' war: both courts are the same court, quarreling — and so
  // are their neighbors, playing the same game of schools, mercenaries and
  // Roman patience.
  '67bce': {
    HYR: ['hasmonean_court', 'schools_of_jerusalem', 'hired_lances', 'roman_shadow'],
    ARI: ['hasmonean_court', 'schools_of_jerusalem', 'hired_lances', 'roman_shadow'],
    default: ['hasmonean_court', 'schools_of_jerusalem', 'hired_lances', 'roman_shadow'],
  },
  '40bce': {
    HER: ['antipaters_web', 'friends_of_the_triumvirs', 'builders_eye', 'a_kings_army'],
    ATG: ['anointed_house', 'king_of_kings_friendship', 'zealous_city'],
  },
  '66ce': {
    JUD: ['fourth_philosophy', 'treasury_of_the_house', 'walls_of_jerusalem', 'nation_in_arms'],
    ROM: ['grain_of_egypt', 'client_kings_managed', 'flavian_method'],
  },
  '132ce': {
    JUD: ['method_of_the_caves', 'prince_of_israel', 'sages_sanction', 'redemption_mint'],
    ROM: ['hadrians_peace', 'provincia_restituta', 'expedita_army'],
  },
  '529ce': {
    SAM: ['mountain_of_blessing', 'villages_of_the_hills', 'keepers_law', 'baba_rabbas_inheritance'],
    BYZ: ['two_fronts_purse', 'federate_lances', 'codex_of_laws'],
  },
  '614ce': {
    JUD: ['exilarchs_silver', 'kings_covenant', 'remnants_walls', 'rule_of_the_academies'],
    BYZ: ['heraclian_reform', 'true_cross_banner', 'thematic_muster'],
  },
  '1948ce': {
    ISR: ['national_institutions', 'arms_ships', 'people_in_arms', 'armored_school'],
    JOR: ['hashemite_court', 'foreign_subsidy', 'arab_legion'],
  },
};

// The groups a chapter teaches THIS court, def + key. Empty array off the
// map (a sim without a bookmark, a bookmark without a table, a court the
// chapter wrote no curriculum for) — never null. A formed crown keeps its
// founder's curriculum: pass the tag object and its `lineage` (the record
// switchTagCore already keeps, SPEC §102) is walked before the default —
// the Kingdom of Israel reads Judaea's ideas, not the empire's. Tiers
// already bought keep paying from t.eraIdeas regardless.
export function eraIdeaGroupsFor(bookmark, tag, t) {
  const table = bookmark && ERA_IDEAS_BY_BOOKMARK[bookmark.id];
  if (!table) return [];
  let keys = table[tag];
  if (!keys && t && Array.isArray(t.lineage)) {
    for (const old of t.lineage) {
      if (table[old]) { keys = table[old]; break; }
    }
  }
  if (!keys) keys = table.default;
  const out = [];
  for (const key of keys || []) {
    const def = ERA_IDEA_GROUPS[key];
    if (def) out.push({ key, ...def });
  }
  return out;
}

// Has this court's ladder reached the group's rung? Reads only tag state, so
// the sim can ask it anywhere.
export function eraIdeaUnlocked(t, def) {
  if (!def || !def.unlock) return false;
  const lvl = t && t.tech && Number.isFinite(t.tech[def.unlock.ladder]) ? t.tech[def.unlock.ladder] : 0;
  return (lvl | 0) >= (def.unlock.level | 0);
}

// Total era-idea tiers a court has taken up — mission checks read this.
export function eraIdeaTiersOwned(t) {
  const owned = t && t.eraIdeas;
  if (!owned) return 0;
  let n = 0;
  for (const k of Object.keys(owned)) {
    if (ERA_IDEA_GROUPS[k]) n += Math.max(0, Math.min(ERA_IDEA_TIERS, owned[k] | 0));
  }
  return n;
}

// Merge every owned tier into one effects map — same contract as
// computeIdeaEffects (Mult keys multiply, everything else adds). Keys resolve
// from the flat registry: a tier bought stays bought even if a formed crown
// carries the state into a chain the new chapter does not sell.
export function computeEraIdeaEffects(eraIdeas) {
  const out = {};
  if (!eraIdeas) return out;
  for (const key of Object.keys(eraIdeas)) {
    const def = ERA_IDEA_GROUPS[key];
    if (!def) continue;
    const n = Math.max(0, Math.min(def.tiers.length, eraIdeas[key] | 0));
    for (let i = 0; i < n; i++) {
      const eff = def.tiers[i].effects || {};
      for (const k of Object.keys(eff)) {
        if (k.endsWith('Mult')) out[k] = (out[k] === undefined ? 1 : out[k]) * eff[k];
        else out[k] = (out[k] === undefined ? 0 : out[k]) + eff[k];
      }
    }
  }
  return out;
}
