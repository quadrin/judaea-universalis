// Judaea Universalis — the Hasmonean line past its own chapter, 63 BCE–6 CE
// (SPEC §121). Content package. Zero imports; all effects run through
// ctx.helpers at runtime. Concatenated onto EVENTS_167 by the era registry.
//
// Reported as a question rather than a bug: what happens if you play 167 all
// the way through to what ought to be Herod's time? Traced, the answer was
// nothing at all. The 167 chain's last card is `ev_w_pompey_organizes` in −64.
// A campaign played on from there gets sixty-eight years of silence covering
// Caesar, the Ides, Antony and Cleopatra, the Parthian invasion of 40, the
// whole of Herod's reign, Actium and the Augustan settlement of the East — and
// then keeps ticking, because no bookmark declares an end date and nothing
// stops it.
//
// The obvious repair is wrong. The 67 and 40 chapters already contain that
// history in detail, but they are written for a world their own bookmarks
// create: HYR and ARI quarrelling over a throne, ATG seated by Parthian
// cavalry, HER bidding for it in Rome. In a 167 continuation none of those
// courts exist. HAS is still the Jewish state, because it never lost — that is
// the entire premise of having played this far — and handing it the war of the
// brothers would be handing it somebody else's chapter.
//
// So this is the same history asked of a different state, and the difference
// that makes is the interesting part. A Hasmonean Judaea that reaches 63 BCE
// intact holds something no other court in the East has: a treaty with Rome
// signed in the year 161 by Judah Maccabee and renewed by every ruler since,
// which is older than the province of Asia, older than Roman Syria, and older
// than the careers of every man now arguing about the frontier. Everything
// here turns on whether that document is worth anything, and to whom, and how
// often it can be produced before somebody in the Senate reads it properly.
//
// Source spine: 1 Maccabees 8, 12 and 14 for the treaty and its renewals;
// Josephus, Antiquitates XIV for Pompey's settlement and the tribute; Plutarch
// Crassus and Dio XL for Carrhae and the Temple treasure; Dio XLVIII for the
// Parthian sweep of 40 and Ventidius' answer; Dio LI and LIV for Actium and
// the settlement of the East.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_167bce_after] ' + key, e || '');
}

function guard(key, fn) {
  return function (ctx) {
    try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); }
  };
}

function safeTrigger(key, fn) {
  return function (ctx) {
    try { return !!fn(ctx); } catch (e) { warnOnce('trigger:' + key, e); return false; }
  };
}

function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[tag];
  return !!(t && t.alive !== false);
}

function flag(ctx, key) {
  return !!(ctx.game.flags && ctx.game.flags[key]);
}

function warBetween(ctx, a, b) {
  for (const w of (ctx.game && ctx.game.wars) || []) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf(a) !== -1 && all.indexOf(b) !== -1) return true;
  }
  return false;
}

function setOpinion(ctx, a, b, val) {
  const t = ctx.game.tags && ctx.game.tags[a];
  if (!t) return;
  if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
  t.opinion[b] = Math.max(-200, Math.min(200, val));
}

// The Jewish crown of this chapter, whatever it has renamed itself to.
function crown(ctx) {
  for (const t of ['HAS', 'MLI', 'JUD']) if (alive(ctx, t)) return t;
  return null;
}
function provsOf(ctx, tag) {
  const g = ctx.game;
  let n = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.owner === tag) n++;
  }
  return n;
}

// The condition the whole package hangs on: the Hasmonean state came through
// its own chapter and is still its own master. Not "did well" — merely alive,
// sovereign, and holding the city it fought for.
function lineContinues(ctx) {
  const me = crown(ctx);
  if (!me) return false;
  const t = ctx.game.tags[me];
  if (t && t.overlord) return false;
  return ctx.helpers.controls(ctx, me, 'Jerusalem') && provsOf(ctx, me) >= 2;
}
// A client is still the line — it is just a line that answers to somebody.
// And a riot is not the end of a dynasty: these are dated cards with a
// one-month window, so testing the CONTROLLER meant a rebel band camped in the
// capital that particular May silently deleted Augustus' settlement from the
// campaign. What ends the line is somebody else owning Jerusalem.
function lineSurvives(ctx) {
  const me = crown(ctx);
  const jer = ctx.prov('Jerusalem');
  return !!me && !!jer && (jer.owner === me || jer.controller === me);
}

const COAST = ['Joppa', 'Jamnia', 'Azotus', 'Ascalon', 'Gaza', 'Dora',
  'Caesarea Maritima'];

function stir(ctx, names, mod) {
  const me = crown(ctx);
  if (!me) return 0;
  let touched = 0;
  for (const n of names) {
    if (!ctx.helpers.controls(ctx, me, n)) continue;
    ctx.helpers.addProvinceModifier(ctx, n, mod);
    touched++;
  }
  return touched;
}

export const EVENTS_167_AFTER = [

  {
    id: 'ev_w_the_oldest_treaty',
    title: 'The Oldest Treaty in the East',
    worldLabel: 'Judaea produces a document older than the province of Asia',
    desc: 'The settlement is being applied, town by town, by clerks with a schedule, '
      + 'and Judaea\'s turn has come. The commission expects the usual: a king '
      + 'explaining that he has always been Rome\'s friend, produced at the moment it '
      + 'becomes useful to have been. What it gets instead is a bronze tablet and a '
      + 'sheaf of copies. The treaty of friendship between the Jews and the Roman '
      + 'people was cut in 161 by Judah son of Mattathias, renewed by Jonathan, '
      + 'renewed again by Simon, and reconfirmed by every ruler of the house since; '
      + 'it predates the province of Asia, the province of Syria, and the birth of '
      + 'every man on the commission. Nobody in the room has seen anything like it. '
      + 'One of the younger clerks is heard to ask whether it is still in force, which '
      + 'is either the most naive question in the tent or the only one that matters.',
    forTag: 'both',
    decider: (ctx) => crown(ctx) || 'HAS',
    date: { y: -63, m: 4 },
    world: true,
    major: true,
    when: safeTrigger('ev_w_the_oldest_treaty:when', (ctx) =>
      lineContinues(ctx) && alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'Pompey stormed the Temple in 63, made Judaea tributary, cut the coastal cities away from it, and the treaty was not mentioned by anybody who mattered.',
    options: [
      {
        label: 'Stand on the treaty and pay what friendship costs',
        tooltip: 'The document is accepted as binding and priced accordingly: −250 talents and the coastal cities are administered from Syria (−8% income permanently), but the crown is untouched, Rome\'s opinion goes to +45, and "The Oldest Treaty" runs permanently (+1 stability, −0.5 unrest everywhere, and every later Roman question about this kingdom opens on a better page). Friendship with Rome has always been an expense; the Hasmoneans have simply been paying it longer than anyone.',
        effects: guard('ev_w_the_oldest_treaty:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { treasury: -250, stability: 1 });
          h.addTagModifier(ctx, me, {
            id: 'the_oldest_treaty', name: 'The Oldest Treaty', months: -1,
            effects: { incomeMult: 0.92, unrestAll: -0.5 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', me, 45);
          h.doctrine(ctx, 'alignment', 1);
          h.setFlag(ctx, 'treatyStood', true);
          h.chronicle(ctx, 'era', 'Judaea meets Pompey\'s commission with a bronze tablet cut in 161 and a hundred years of renewals; the treaty is accepted as binding, the coast is not, and the crown is not touched.');
        }),
      },
      {
        label: 'Let the tablet speak and add nothing to it',
        tooltip: 'No gift, no delegation, no offer — the document is submitted and the kingdom waits. +20 legitimacy and +1 authority for a crown that does not plead; the coast stays Judaean for now (no income loss) — but Rome\'s opinion falls to −45 and "An Answer Deferred" runs permanently (+0.5 unrest everywhere), because a commission that cannot close a file leaves it open, and Rome is extremely good at reopening files.',
        effects: guard('ev_w_the_oldest_treaty:1', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { legitimacy: 20 });
          h.addTagModifier(ctx, me, {
            id: 'an_answer_deferred', name: 'An Answer Deferred', months: -1,
            effects: { unrestAll: 0.5 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', me, -45);
          h.doctrine(ctx, 'authority', 1);
          h.setFlag(ctx, 'treatyDeferred', true);
          h.chronicle(ctx, 'era', 'The tablet is submitted and nothing is added to it. The commission cannot close the file, so it leaves it open — and Rome is extremely good at reopening files.');
        }),
      },
    ],
  },

  {
    id: 'ev_w_carrhae_and_the_treasure',
    title: 'The Governor Who Needed Money',
    worldLabel: 'Crassus takes the Temple treasure and dies at Carrhae',
    desc: 'Crassus is going to Parthia because he is the third-richest man in the world '
      + 'and the other two have armies. He needs money for it, which is a sentence that '
      + 'has never made sense to anyone outside Rome, and on the road east he stops at '
      + 'Jerusalem and takes the Temple treasure — two thousand talents that Pompey '
      + 'himself had left untouched, and the beam of solid gold on top of it, after '
      + 'promising the priest who showed him where it was that he would take nothing '
      + 'else. Fourteen months later he is dead in the Mesopotamian dust with twenty '
      + 'thousand legionaries, his son\'s head on a Parthian spear, and — the story '
      + 'goes, and everyone in Judaea tells it — molten gold poured down his throat. '
      + 'Nobody in Jerusalem is claiming credit. Nobody is being especially quiet '
      + 'about it either.',
    forTag: 'both',
    decider: (ctx) => crown(ctx) || 'HAS',
    date: { y: -53, m: 6 },
    world: true,
    major: true,
    when: safeTrigger('ev_w_carrhae_and_the_treasure:when', (ctx) => lineSurvives(ctx)),
    aiOption: 0,
    historical: 'Crassus took the treasure in 54 and died at Carrhae in 53; Judaea rose the following year and was put down by Cassius.',
    options: [
      {
        label: 'Take the road east while there is no road west',
        tooltip: 'The frontier is open and the eastern Jewish communities are close: +8,000 manpower, +2 conquest, "The Road East" for 120 months (+10% morale), and Parthia\'s opinion +40. Rome will be back — Rome is always back — but for a decade the question of who is on which side of the Euphrates is genuinely open, and the answer is being decided by whoever is standing there.',
        effects: guard('ev_w_carrhae_and_the_treasure:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { manpower: 8000, legitimacy: 10 });
          h.addTagModifier(ctx, me, {
            id: 'the_road_east', name: 'The Road East', months: 120,
            effects: { moraleMult: 1.1 },
          });
          if (alive(ctx, 'PAR')) setOpinion(ctx, 'PAR', me, 40);
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', me, -30);
          h.doctrine(ctx, 'conquest', 2);
          h.setFlag(ctx, 'roadEast', true);
          h.chronicle(ctx, 'era', 'With Crassus dead and no army between Antioch and the desert, Judaea takes the road east; for a decade the Euphrates is a question rather than a border.');
        }),
      },
      {
        label: 'Rebuild the treasury and say the loss was Rome\'s, not ours',
        tooltip: 'The theft is entered in the record as a debt Rome owes the Temple, and the kingdom quietly refills the chamber from its own revenues: −180 treasury now, but "The Chamber Refilled" permanently (+10% income as the half-shekel arrives from a diaspora that has heard the story), +15 legitimacy, +1 stability. The most useful thing about an outrage is that everyone remembers it without being asked.',
        effects: guard('ev_w_carrhae_and_the_treasure:1', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { treasury: -180, legitimacy: 15, stability: 1 });
          h.addTagModifier(ctx, me, {
            id: 'the_chamber_refilled', name: 'The Chamber Refilled', months: -1,
            effects: { incomeMult: 1.1 },
          });
          h.setFlag(ctx, 'chamberRefilled', true);
          h.chronicle(ctx, 'era', 'The plundered chamber is refilled out of the kingdom\'s own revenue and the theft entered as a debt; the half-shekel arrives that year from communities that have heard the story and needed no letter.');
        }),
      },
    ],
  },

  {
    id: 'ev_w_the_year_parthia_came',
    title: 'The Year Parthia Came',
    worldLabel: 'Parthian cavalry sweep Syria and offer Judaea the frontier',
    desc: 'The Parthians cross in force and Roman Syria simply ceases to function: '
      + 'Apamea opens, Antioch opens, the governor is killed, and a Roman army in the '
      + 'field goes over to them entire. This is the year that in another history put '
      + 'a Hasmonean back on the throne of Jerusalem with Parthian help, and set off '
      + 'everything that followed from it. There is already a Hasmonean on the throne '
      + 'of Jerusalem. So the offer that arrives is not a crown — it is a frontier: be '
      + 'the anchor of the western march, keep your law, keep your king, keep your '
      + 'coast, and hold the desert road for the King of Kings. The envoys are '
      + 'courteous, they are not asking for hostages, and every man in the council '
      + 'knows what happened the last three times a kingdom here bet on the wrong '
      + 'empire.',
    forTag: 'both',
    decider: (ctx) => crown(ctx) || 'HAS',
    date: { y: -40, m: 5 },
    world: true,
    major: true,
    when: safeTrigger('ev_w_the_year_parthia_came:when', (ctx) =>
      lineSurvives(ctx) && alive(ctx, 'PAR')),
    aiOption: 1,
    historical: 'Parthia swept Syria in 40 and seated Antigonus in Jerusalem; Ventidius drove them out within two years and Herod came back with a Roman army behind him.',
    options: [
      {
        label: 'Take the frontier and hold the desert road',
        tooltip: 'Judaea becomes the western anchor of the Arsacid march: +12,000 manpower, +300 talents of subsidy, Parthia\'s opinion to +90 and "The Western March" (+12% morale, +8% income) — and war with Rome, whose answer to this in the actual event was Ventidius and two years. The largest bet available in the chapter, and the one with a documented outcome.',
        effects: guard('ev_w_the_year_parthia_came:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { manpower: 12000, treasury: 300, legitimacy: 15 });
          h.addTagModifier(ctx, me, {
            id: 'the_western_march', name: 'The Western March', months: -1,
            effects: { moraleMult: 1.12, incomeMult: 1.08 },
          });
          if (alive(ctx, 'PAR')) setOpinion(ctx, 'PAR', me, 90);
          if (alive(ctx, 'ROM')) {
            setOpinion(ctx, 'ROM', me, -120);
            if (!warBetween(ctx, me, 'ROM')) h.declareWar(ctx, 'ROM', me, 'The Parthian Frontier');
          }
          h.doctrine(ctx, 'alignment', -3);
          h.setFlag(ctx, 'westernMarch', true);
          h.chronicle(ctx, 'era', 'Judaea takes the Arsacid offer and becomes the western anchor of the Parthian march; Rome, which has answered this before and within two years, is informed by its own deserters.');
        }),
      },
      {
        label: 'Send the envoys away with gifts and tell Antioch we did',
        tooltip: 'The offer is declined in public and the declining is reported: +20 legitimacy, Rome\'s opinion +55 and "Declined in Writing" permanently (+1 stability, −0.5 unrest everywhere), −150 talents in gifts to envoys who leave empty-handed but unhumiliated. Parthia cools 60. The kingdom has spent a century learning that the useful thing is not which empire you choose but being seen to have chosen.',
        effects: guard('ev_w_the_year_parthia_came:1', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { treasury: -150, legitimacy: 20, stability: 1 });
          h.addTagModifier(ctx, me, {
            id: 'declined_in_writing', name: 'Declined in Writing', months: -1,
            effects: { unrestAll: -0.5 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', me, 55);
          if (alive(ctx, 'PAR')) setOpinion(ctx, 'PAR', me, -60);
          h.doctrine(ctx, 'alignment', 2);
          h.setFlag(ctx, 'declinedTheMarch', true);
          h.chronicle(ctx, 'era', 'The Arsacid envoys are sent away with gifts and Antioch is told, in writing, that they were: the useful thing was never which empire you choose but being seen to have chosen.');
        }),
      },
    ],
  },

  {
    id: 'ev_w_a_hundred_years_of_friendship',
    title: 'A Hundred Years of Friendship',
    worldLabel: 'Augustus settles the East and finds Judaea already in the file',
    desc: 'The young man who won at Actium comes east to decide which kingdoms '
      + 'continue, and his method is the one he uses for everything: read the record, '
      + 'work out what a thing costs and what it saves, and then do the cheap durable '
      + 'option while everyone else is still making speeches. Judaea\'s file is the '
      + 'thickest in the tent and the oldest by fifty years. It contains a treaty from '
      + '161 and its renewals; a century of correspondence in which this kingdom is '
      + 'addressed as a friend and ally by men whose names are now on public buildings; '
      + 'a record of what it did in 40 when Parthia came, whichever way that went; and '
      + 'an accounts summary the commission of −20 has attached at the front, because '
      + 'that is what actually decides these things. Augustus reads the accounts '
      + 'summary. He is said to have read the treaty afterwards, out of curiosity.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -20, m: 5 },
    world: true,
    major: true,
    when: safeTrigger('ev_w_a_hundred_years_of_friendship:when', (ctx) =>
      lineSurvives(ctx) && alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'Augustus settled the East around Herod, who was extremely good at exactly this, and left him alone for the rest of his life.',
    options: [
      {
        label: 'Confirmed: the oldest friendship in the East continues',
        tooltip: 'The kingdom is confirmed in the settlement: +25 legitimacy, +1 stability, and "Confirmed in the Settlement" permanently (+12% income, −0.75 unrest everywhere). A kingdom that stood on its treaty in −63 or declined Parthia in −40 is confirmed warmly (Rome +60); one that has spent the century being difficult is confirmed anyway, coolly, because the alternative is a province nobody has troops for.',
        effects: guard('ev_w_a_hundred_years_of_friendship:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          const warm = flag(ctx, 'treatyStood') || flag(ctx, 'declinedTheMarch');
          h.adjust(ctx, me, { legitimacy: 25, stability: 1 });
          h.addTagModifier(ctx, me, {
            id: 'confirmed_in_the_settlement', name: 'Confirmed in the Settlement', months: -1,
            effects: { incomeMult: 1.12, unrestAll: warm ? -0.75 : -0.4 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', me, warm ? 60 : 10);
          h.setFlag(ctx, 'confirmedBySettlement', warm ? 'warm' : 'cool');
          h.chronicle(ctx, 'era', warm
            ? 'Augustus confirms the oldest friendship in the East, and is said to have read the treaty afterwards out of curiosity.'
            : 'Augustus confirms the kingdom coolly and on the accounts alone; the alternative is a province nobody has the troops for, and everyone in the tent can do that arithmetic.');
        }),
      },
    ],
  },

  {
    id: 'ev_w_the_year_of_the_other_history',
    title: 'The Year of the Other History',
    worldLabel: 'The year Judaea became a province, in a history that did not happen',
    desc: 'This is the year, in the chapter that would have followed this one, when a '
      + 'Herodian ethnarch was deposed on a petition from his own notables, the kingdom '
      + 'was reduced to a province of the third rank, a prefect arrived from Caesarea, '
      + 'and a census was taken that produced a philosophy which never afterwards went '
      + 'away. Everything about that sentence assumes a dynasty that has been on the '
      + 'throne for two generations and is already resented, in a country Rome installed '
      + 'it in. None of it is available here. The house on the throne is the house that '
      + 'took the country back from the Seleucids, the treaty in the archive is older '
      + 'than the province of Asia, and the last hundred and sixty years are a single '
      + 'continuous argument this kingdom has been having with the world and mostly '
      + 'winning. The clerks in Antioch open the file, find nothing that needs doing, '
      + 'and close it. That is the whole event. It is also the point.',
    forTag: 'both',
    decider: (ctx) => crown(ctx) || 'HAS',
    date: { y: 6, m: 6 },
    world: true,
    major: true,
    when: safeTrigger('ev_w_the_year_of_the_other_history:when', (ctx) => lineSurvives(ctx)),
    aiOption: 0,
    historical: 'Archelaus was deposed in 6 CE, Judaea became a province, and Coponius came from Caesarea with Quirinius behind him.',
    options: [
      {
        label: 'Close the file, and let the chapter end where it likes',
        tooltip: 'The Hasmonean line reaches the year the other history ended: +30 legitimacy, +1 stability, and "A Hundred and Seventy-Three Years" permanently (+12% income, −1 unrest everywhere, +0.1 legitimacy a month). The chronicle reads back what the line actually did with the century — the treaty, the road east, Parthia\'s offer, and the settlement.',
        effects: guard('ev_w_the_year_of_the_other_history:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { legitimacy: 30, stability: 1 });
          h.addTagModifier(ctx, me, {
            id: 'a_hundred_and_seventy_three_years', name: 'A Hundred and Seventy-Three Years',
            months: -1, effects: { incomeMult: 1.12, unrestAll: -1, legitimacyAdd: 0.1 },
          });
          const said = [
            flag(ctx, 'treatyStood') ? 'it stood on a treaty from 161'
              : (flag(ctx, 'treatyDeferred') ? 'it let the tablet speak and added nothing' : ''),
            flag(ctx, 'roadEast') ? 'it took the road east over Crassus\'s body'
              : (flag(ctx, 'chamberRefilled') ? 'it refilled the plundered chamber out of its own revenue' : ''),
            flag(ctx, 'westernMarch') ? 'it anchored the Parthian march'
              : (flag(ctx, 'declinedTheMarch') ? 'it declined Parthia in writing' : ''),
            flag(ctx, 'confirmedBySettlement') ? 'and Augustus confirmed it' : '',
          ].filter(Boolean).join('; ');
          h.setFlag(ctx, 'theOtherHistory', true);
          h.chronicle(ctx, 'era', 'The year the kingdom became a province passes without a prefect'
            + (said ? ': ' + said + '. ' : '. ')
            + 'The clerks in Antioch open the file, find nothing that needs doing, and close it.');
        }),
      },
    ],
  },
];
