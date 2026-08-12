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
        'Unify the realm before Pompey can choose its ruler for you — and at 80 war score '
          + 'the table will do it in one clause: your brother renounces, and the kingdom is '
          + 'whole again under you.',
      ],
      clocks: [
        { y: -66, m: 3, label: 'Aretas names the price of Nabataean aid' },
        { y: -64, m: 5, label: 'Pompey settles Syria and turns south' },
      ],
    },
    ARI: {
      system: 'The crown against the clock',
      opening: [
        'Use the stronger royal army before Nabataea fully enters the war — win the argument '
          + 'outright rather than the border, and at 80 war score the table writes your '
          + 'brother out of it and hands you the whole kingdom.',
        'Take Hebron and Adora to break Antipater’s political network.',
        'Fortify Jerusalem before Pompey’s settlement reaches Judaea.',
      ],
      clocks: [
        { y: -66, m: 3, label: 'Nabataea may enter for Hyrcanus' },
        { y: -64, m: 5, label: 'Pompey settles Syria and turns south' },
      ],
    },
    ADI: {
      system: 'A client astride the road',
      opening: [
        'Keep the caravans moving — the fords pay for everything the house will ever do.',
        'Muster the riders early; Armenia’s wreck leaves the upper Tigris to whoever holds it.',
        'Serve the King of Kings visibly and cheaply — his regard is the wall the house lives behind.',
      ],
      clocks: [
        { y: -64, m: 5, label: 'Pompey settles Syria — the customs frontier grows a Roman side' },
        { y: -60, m: 1, label: 'The reckoning: the house judged on what it held' },
      ],
    },
  },
  '40bce': {
    HER: {
      system: 'Roman patronage versus local legitimacy',
      opening: [
        'Keep Masada and Idumea alive while Herod seeks recognition in Rome — you begin '
          + 'inside Rome\'s system rather than outside it, and the collar your father earned '
          + 'costs a tenth and a half of the revenue and forbids clients of your own.',
        'Let Roman power clear the wider war; spend your strength on the road to Jerusalem.',
        'Secure the coast and Galilee before the final siege — and remember the crown war is '
          + 'yours to settle whoever fights beside you: at 80 war score its table hands you '
          + 'Antigonus\' whole kingdom in one clause.',
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
    ADI: {
      system: 'Riding the high tide',
      opening: [
        'Muster the riders while Pacorus is winning — lances buy favor cheap at high tide.',
        'Bank the widened road’s tolls before the tide turns; treasure survives ebbs that favor does not.',
        'Plan for Gindarus: keep the host home and the fords guarded when Rome pushes back.',
      ],
      clocks: [
        { y: -38, m: 6, label: 'Rome breaks the Parthian field army at Gindarus' },
        { y: -36, m: 1, label: 'The reckoning: the house judged on what it held' },
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
    AGR: {
      system: 'A client king in a war against his own people',
      opening: [
        'Hold the home provinces — Gamala will test the king’s peace before Rome tests anything.',
        'March the Babylonian horse with Rome’s columns; the kingdom’s worth is proved in the field.',
        'Keep the lake in view: Tiberias and Tarichaea are the emperor’s grant, and the war can make it true.',
      ],
      clocks: [
        { y: 66, m: 10, label: 'Cestius marches — the king’s auxiliaries are expected' },
        { y: 67, m: 2, label: 'Vespasian arrives with the imperial field army' },
        { y: 71, m: 1, label: 'The verdict: still a king, or a curiosity in Rome' },
      ],
    },
    ADI: {
      system: 'The covenant and the yoke',
      opening: [
        'Fill the granaries first — the house’s power in the west has always been grain and silver.',
        'Stand with Jerusalem as far as Ctesiphon’s patience runs; the princes are already riding.',
        'Guard the fords and the tolls: whatever burns in the west, the road must pay.',
      ],
      clocks: [
        { y: 66, m: 11, label: 'Beth Horon — the princes of the house are in the field' },
        { y: 68, m: 6, label: 'Nero dies and both empires watch each other' },
        { y: 71, m: 1, label: 'The verdict: the house judged on what it held' },
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
    ADI: {
      system: 'The restored house and the burning west',
      opening: [
        'Rebuild first — Trajan’s war is sixteen years old and the warehouses still remember it.',
        'Answer the Nasi’s letters carefully: silver travels quieter than sons.',
        'Give no emperor a reason to cross the Euphrates; the King of Kings will not save you twice.',
      ],
      clocks: [
        { y: 133, m: 6, label: 'Severus arrives — the west’s war turns methodical' },
        { y: 136, m: 1, label: 'The verdict: the house judged on what it held' },
      ],
    },
  },
  '351ce': {
    JUD: {
      system: 'A stolen armoury, and a window that closes',
      opening: [
        'Take the lake shore and the valley road before the province is told; Tiberias is a '
          + 'political problem before it is a military one.',
        'Decide early what the rising is — a king, a captain, or the Patriarch\'s business — '
          + 'because Ursicinus arrives in the spring either way.',
        'Do not hold what cannot be relieved. The hills keep an army alive; the towns are '
          + 'what the Empire burns to make its point.',
      ],
      clocks: [
        { y: 351, m: 10, label: 'Mursa — the Empire kills its own field army' },
        { y: 352, m: 4, label: 'Ursicinus comes down from Antioch' },
        { y: 353, m: 8, label: 'The civil war ends and the comitatus is free again' },
        { y: 358, m: 9, label: 'The calendar can be fixed by computation — or kept' },
        { y: 363, m: 3, label: 'An emperor offers to rebuild the Temple' },
        { y: 415, m: 10, label: 'The rescript that takes the patriarchate apart' },
      ],
    },
    ROM: {
      system: 'Two frontiers, one army, and a Caesar nobody trusts',
      opening: [
        'The Galilee is a police action; Persia is the war. Do not spend the eastern field '
          + 'army on the first before the second is settled.',
        'Hold the road net — Caesarea, Scythopolis, Ptolemais — and the hills can wait.',
        'Every month the civil war lasts is a month the East is fighting on garrisons.',
      ],
      clocks: [
        { y: 351, m: 10, label: 'Mursa is won, and paid for' },
        { y: 355, m: 1, label: 'Gallus is executed; the East has no government' },
        { y: 359, m: 10, label: 'Amida — seven legions in one summer' },
        { y: 363, m: 6, label: 'The peace that gives away Nisibis' },
      ],
    },
  },
  '529ce': {
    SAM: {
      system: 'Four hills, a statute, and a mountain you cannot hold',
      opening: [
        'Take Sebaste before the field force concentrates — it is five miles away and it is the empire\u2019s eye in the hill country.',
        'Decide about the mountain early; the summit is the theology and it is a garrison you will not get back.',
        'Caesarea is the whole province and the whole problem: without the port the empire lands whatever it likes.',
      ],
      clocks: [
        { y: 529, m: 5, label: 'The crown is offered at Neapolis' },
        { y: 529, m: 7, label: 'The churches burn, with or without your leave' },
        { y: 530, m: 4, label: 'Al-Harith\u2019s riders come up the Jezreel road' },
        // The 531\u2013614 tail (SPEC \u00a7151). The war ends in the second year and the
        // chapter runs another eighty-three, so the outliner has to keep saying
        // what the next thing is.
        { y: 531, m: 2, label: 'The refugees reach Ctesiphon with an offer' },
        { y: 540, m: 6, label: 'Khusrau breaks the peace \u2014 and stays in the north' },
        { y: 551, m: 9, label: 'A bishop of Caesarea argues the disabilities down' },
        { y: 556, m: 7, label: 'Caesarea rises, and the Jews of the city rise with it' },
        { y: 560, m: 1, label: 'The generation that rose is gone; the count begins' },
        { y: 572, m: 5, label: 'The last rising the chronicles record' },
        { y: 614, m: 3, label: 'The Persians on the coast road; the count is taken' },
      ],
    },
    BYZ: {
      system: 'A police problem with a war behind it',
      opening: [
        'Concentrate at Caesarea and hold Sebaste — the rising has no port and no cavalry.',
        'Use the phylarch: al-Harith\u2019s horse is what actually ends this, and it is already paid for.',
        'Do not spend the Army of the East here. The Persian truce is not going to hold.',
      ],
      clocks: [
        { y: 529, m: 5, label: 'A king is crowned in the hills' },
        { y: 530, m: 4, label: 'The phylarch takes the field' },
        { y: 532, m: 1, label: 'Samaria must be quiet, or the assessment is a fiction' },
      ],
    },
    // The kingdom beyond the strait (SPEC §208).
    HMY: {
      system: 'A client crown, a foreign garrison, and one reckoning',
      opening: [
        'Muster your own companies before 533 — the garrison’s mutiny lands on whoever cannot outnumber it.',
        'Bank the customs of Aden and Mawza; the tribute is a percentage, the strongbox is a policy.',
        'Keep the House of Yazan warm: the covenant is your legitimacy and the highlands are your manpower, and they are the same party.',
      ],
      clocks: [
        { y: 533, m: 6, label: 'The garrison chooses its own judgment — Abraha moves' },
        { y: 540, m: 6, label: 'The two empires go to war, and both write south for allies' },
        { y: 548, m: 4, label: 'The dam calls for the kingdoms — Marib’s great repair' },
        { y: 570, m: 11, label: 'The reckoning: eight ships, if the country is worth so little' },
        { y: 575, m: 7, label: 'The dam, if nobody kept it' },
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
        { y: 628, m: 2, label: 'Persia signs its peace and goes home — the war with the Empire stays ours' },
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
