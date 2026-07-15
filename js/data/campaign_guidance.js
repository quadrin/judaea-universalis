// Bookmark-specific player guidance shared by the start screen and the
// in-game campaign tracker. This is deliberately data-only: the sim may read
// it, but it owns no state and mutates nothing.

export const CAMPAIGN_GUIDANCE = {
  '167bce': {
    HAS: {
      system: 'Insurgency in the hills',
      opening: [
        'Keep the bands together in Emmaus and Lydda; do not meet the royal army on open ground.',
        'Use the Seleucid hesitation to build the host and contest the ascents.',
        'Take Jerusalem when Antioch turns east, then defend the Temple rather than the frontier.',
      ],
      clocks: [
        { y: -166, m: 6, label: 'Apollonius marches from Samaria' },
        { y: -165, m: 1, label: 'Antiochus turns east — your first great window' },
        { y: -164, m: 11, label: 'The king dies and the regency fractures' },
      ],
    },
    SEL: {
      system: 'Imperial overstretch',
      opening: [
        'Secure the Jerusalem–Samaria road before the hill bands multiply.',
        'Keep an eastern reserve; the king will soon march beyond the Euphrates.',
        'End the revolt before the regency turns one provincial war into three.',
      ],
      clocks: [
        { y: -166, m: 6, label: 'Apollonius is ordered into the hills' },
        { y: -165, m: 1, label: 'The royal army marches east' },
        { y: -164, m: 11, label: 'A succession crisis opens in Antioch' },
      ],
    },
  },
  '67bce': {
    HYR: {
      system: 'Legitimacy, silver, and patrons',
      opening: [
        'Preserve the coastal customs houses that pay Antipater’s levies.',
        'Decide whether Aretas’s cavalry is worth the twelve cities he demands.',
        'Unify the realm before Pompey can choose its ruler for you.',
      ],
      clocks: [
        { y: -66, m: 3, label: 'Aretas names the price of Nabataean aid' },
        { y: -64, m: 5, label: 'Pompey settles Syria and turns south' },
      ],
    },
    ARI: {
      system: 'The crown against the clock',
      opening: [
        'Use the stronger royal army before Nabataea fully enters the war.',
        'Take Hebron and Adora to break Antipater’s political network.',
        'Fortify Jerusalem before Pompey’s settlement reaches Judaea.',
      ],
      clocks: [
        { y: -66, m: 3, label: 'Nabataea may enter for Hyrcanus' },
        { y: -64, m: 5, label: 'Pompey settles Syria and turns south' },
      ],
    },
  },
  '40bce': {
    HER: {
      system: 'Roman patronage versus local legitimacy',
      opening: [
        'Keep Masada and Idumea alive while Herod seeks recognition in Rome.',
        'Let Roman power clear the wider war; spend your strength on the road to Jerusalem.',
        'Secure the coast and Galilee before beginning the final siege.',
      ],
      clocks: [
        { y: -40, m: 10, label: 'Herod must choose whether to sail for Rome' },
        { y: -38, m: 6, label: 'Rome breaks the Parthian field army at Gindarus' },
        { y: -37, m: 3, label: 'The sabbatical year strains the siege' },
      ],
    },
    ATG: {
      system: 'A crown borrowed from Parthia',
      opening: [
        'Destroy Herod’s Idumean base before the Senate can make him useful.',
        'Hold Jerusalem and Masada; time matters more than distant conquest.',
        'Prepare for Parthian support to recede after Gindarus.',
      ],
      clocks: [
        { y: -40, m: 10, label: 'Herod seeks a Roman crown' },
        { y: -38, m: 6, label: 'The Parthian shield breaks at Gindarus' },
        { y: -37, m: 3, label: 'The sabbatical year tests Jerusalem' },
      ],
    },
  },
  '66ce': {
    JUD: {
      system: 'Rebel unity and fortified depth',
      opening: [
        'Turn the Jerusalem host into several commands before Rome concentrates.',
        'Fortify Galilee and the Beth Horon approach while Cestius hesitates.',
        'Preserve the Temple, the food supply, and a route east for foreign aid.',
      ],
      clocks: [
        { y: 66, m: 10, label: 'Cestius Gallus marches on Jerusalem' },
        { y: 67, m: 2, label: 'Vespasian arrives with the imperial field army' },
        { y: 68, m: 6, label: 'Nero dies and Rome turns inward' },
      ],
    },
    ROM: {
      system: 'Campaign seasons and methodical reduction',
      opening: [
        'Secure Caesarea and the coast before committing to the hills.',
        'Reduce Galilee fortress by fortress; do not chase every rebel band.',
        'Close the ring around Jerusalem before the imperial succession crisis.',
      ],
      clocks: [
        { y: 66, m: 10, label: 'Cestius must decide whether to march' },
        { y: 67, m: 2, label: 'Vespasian assumes command' },
        { y: 68, m: 6, label: 'Nero’s death pulls attention west' },
      ],
    },
  },
  '115ce': {
    JUD: {
      system: 'A diaspora rising across separate theaters',
      opening: [
        'Keep Cyprus and Egypt alive as distinct bases; neither can rescue the other quickly.',
        'Seize the Nile granaries to hurt Rome without fighting its eastern field army.',
        'Raise Mesopotamia only when Rome has committed its response elsewhere.',
      ],
      clocks: [
        { y: 116, m: 1, label: 'Marcius Turbo sails south' },
        { y: 116, m: 8, label: 'Quietus is unleashed in the east' },
        { y: 117, m: 8, label: 'Trajan dies; survive to force Hadrian’s choice' },
      ],
    },
    ROM: {
      system: 'Conquest abroad, revolt behind',
      opening: [
        'Choose which matters more: Ctesiphon or the Egyptian grain route.',
        'Use the fleet to isolate Cyprus before the theaters can reinforce one another.',
        'Keep a reserve for Mesopotamia; the rivers will not stay quiet.',
      ],
      clocks: [
        { y: 116, m: 1, label: 'Turbo begins the southern reduction' },
        { y: 116, m: 6, label: 'The communities between the rivers rise' },
        { y: 117, m: 8, label: 'Trajan’s death changes the imperial objective' },
      ],
    },
  },
  '132ce': {
    JUD: {
      system: 'Prepared revolt and underground survival',
      opening: [
        'Exploit the hidden armories while the provincial response remains hesitant.',
        'Take Jerusalem quickly, but keep a field army in the hills rather than on the coast.',
        'Build depth before Severus arrives; after that date, survival is the campaign.',
      ],
      clocks: [
        { y: 132, m: 7, label: 'The governor organizes the first Roman response' },
        { y: 133, m: 6, label: 'Julius Severus arrives with imperial reinforcements' },
      ],
    },
    ROM: {
      system: 'Intelligence, containment, and starvation',
      opening: [
        'Hold the coast and avoid offering the rebels a single decisive battle.',
        'Clear the Shephelah before probing the cave country.',
        'Contain the state until Severus and the imperial detachments arrive.',
      ],
      clocks: [
        { y: 132, m: 7, label: 'Rufus chooses the provincial response' },
        { y: 133, m: 6, label: 'Severus brings the method of reduction' },
      ],
    },
  },
  '614ce': {
    JUD: {
      system: 'Persian favor versus Jewish autonomy',
      opening: [
        'Use the Persian advance to take Jerusalem before attempting independence.',
        'Secure Caesarea and a defensible heartland that is valuable to either empire.',
        'Prepare for Khosrow to trade his clients when the war’s needs change.',
      ],
      clocks: [
        { y: 617, m: 6, label: 'Persia weighs the price of keeping its Jewish ally' },
        { y: 622, m: 4, label: 'Heraclius launches the great counteroffensive' },
      ],
    },
    BYZ: {
      system: 'Survival, then imperial counteroffensive',
      opening: [
        'Hold the Anatolian shield and the fleet; Syria cannot all be saved.',
        'Preserve Alexandria long enough to keep the treasury and grain supply alive.',
        'When Heraclius sails east, strike behind Persia rather than retaking every town.',
      ],
      clocks: [
        { y: 617, m: 6, label: 'Persia reorganizes its conquests' },
        { y: 622, m: 4, label: 'Heraclius sails east for the counteroffensive' },
        { y: 626, m: 7, label: 'Constantinople itself comes under siege' },
      ],
    },
  },
  '1948ce': {
    ISR: {
      system: 'Interior lines, truces, and mobilization',
      opening: [
        'Hold the coastal spine and avoid losing Jerusalem before the first truce.',
        'Use the truce to reorganize, rearm, and open the Burma Road.',
        'After the Ten Days, defeat one front at a time rather than advancing everywhere.',
      ],
      clocks: [
        { y: 1948, m: 6, label: 'The First Truce opens a rearmament window' },
        { y: 1948, m: 7, label: 'The Ten Days return the initiative to the field' },
        { y: 1949, m: 2, label: 'The Rhodes armistice fixes the lines held' },
        { y: 1950, m: 6, label: 'The Arab League formalizes joint defense' },
        { y: 1955, m: 9, label: 'The regional arms race accelerates' },
      ],
    },
    JOR: {
      system: 'Professional force, limited war aims',
      opening: [
        'Hold Latrun and concentrate the Legion around Jerusalem and the hill country.',
        'Refuse costly coastal battles that do not serve the King’s war aims.',
        'Reach the armistice with the Legion intact and something defensible to show.',
      ],
      clocks: [
        { y: 1948, m: 6, label: 'The First Truce freezes the opening positions' },
        { y: 1948, m: 7, label: 'The Ten Days test the Arab coalition' },
        { y: 1949, m: 2, label: 'The Rhodes armistice fixes the lines held' },
        { y: 1950, m: 6, label: 'The Arab League formalizes joint defense' },
        { y: 1955, m: 9, label: 'The regional arms race accelerates' },
      ],
    },
  },
};

function monthIndex(date) {
  if (!date || !Number.isFinite(date.y)) return 0;
  const y = date.y > 0 ? date.y - 1 : date.y; // no year zero
  return y * 12 + Math.max(0, Math.min(11, (date.m || 1) - 1));
}

export function campaignGuidance(bookmarkId, tag, date) {
  const byTag = CAMPAIGN_GUIDANCE[bookmarkId] || {};
  const data = byTag[tag] || null;
  if (!data) return null;
  const now = monthIndex(date);
  const next = (data.clocks || [])
    .map((clock) => ({ ...clock, months: monthIndex(clock) - now }))
    .find((clock) => clock.months >= 0) || null;
  return {
    system: data.system || '',
    opening: Array.isArray(data.opening) ? data.opening.slice() : [],
    clocks: Array.isArray(data.clocks) ? data.clocks.map((c) => ({ ...c })) : [],
    next,
  };
}
