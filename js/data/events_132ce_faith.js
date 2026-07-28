// Judaea Universalis — event chain: the parting of the ways, 132–200 CE
// (SPEC §104). Content package. Zero imports; all effects run through
// ctx.helpers at runtime. Concatenated onto EVENTS_132 by the era registry.
//
// The 132 bookmark had no Christianity in it at all — not a string, not a pop,
// not a predicate — which is a strange hole in a chapter whose conventional
// dates, 132–136, are the ones historians reach for when asked when the two
// religions became two. Everything below is that hole filled: the revolt's own
// treatment of a rival messiah, the moment Roman law made proselytizing a
// capital crime for one of the two and left the other alone, and the century
// in which the argument stopped being internal.
//
// Source spine: Justin, 1 Apology 31.6 and the Dialogue with Trypho;
// Modestinus in Digest 48.8.11; Eusebius, HE IV.5-6 (the fifteen bishops) and
// V.23-24 (the paschal controversy); Melito of Sardis, Peri Pascha; Tertullian
// on Marcion. Two things here are contested and are written as flavour rather
// than as load-bearing history: the Pella flight tradition, and how much the
// god-fearer inscriptions (Aphrodisias, Sardis) will actually bear.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_132ce_faith] ' + key, e || '');
}

// The letters this court answers to NOW (SPEC §135). A realm that has taken a
// greater crown files its provinces, armies and wars under the new tag, while
// this chapter was written against the old one; the sim keeps the forwarding
// address and hands it back through ctx.helpers. Defensive about `helpers`
// because the content packages are also read cold, with no game to resolve
// against.
function who(ctx, tag) {
  return (ctx && ctx.helpers && ctx.helpers.livingTag) ? ctx.helpers.livingTag(ctx, tag) : tag;
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

function dateGE(ctx, y, m) {
  const d = ctx.game.date;
  return d.y > y || (d.y === y && d.m >= m);
}

function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[who(ctx, tag)];
  return !!(t && t.alive !== false);
}

// A war is filed under the names its belligerents wear NOW (SPEC §135), and a
// content package asks after them by the names its chapter shipped with. The
// forwarding address lives on the game state, so this reads it without needing
// a ctx it was never given.
function warTag(game, t) {
  if (!game || !t) return t;
  if (game.tags && game.tags[t]) return t;
  const to = game.tagAliases && game.tagAliases[t];
  return (to && game.tags && game.tags[to]) ? to : t;
}

function findJudRomWar(game) {
  for (const w of (game && game.wars) || []) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf(warTag(game, 'JUD')) !== -1 && all.indexOf(warTag(game, 'ROM')) !== -1) return w;
  }
  return null;
}

// The two worlds this chain forks on, written exactly as the main chain
// writes them (SPEC §75): gate on the map, not on the verdict.
function romanAftermath(ctx) {
  return alive(ctx, 'ROM')
    && ctx.helpers.controls(ctx, 'ROM', 'Jerusalem')
    && ctx.helpers.countControlled(ctx, 'JUD', {}) === 0;
}
function judaeaStands(ctx) {
  const t = ctx.game.tags && ctx.game.tags.JUD;
  return alive(ctx, 'JUD')
    && !(t && t.overlord)
    && ctx.helpers.controls(ctx, 'JUD', 'Jerusalem')
    && !findJudRomWar(ctx.game);
}

function fired(ctx, id) {
  const f = ctx.game.firedEvents || {};
  return !!f[id];
}

// A province's share of a faith, read defensively: `p.pop` exists wherever a
// bookmark seeds it, and every trigger below must survive its absence rather
// than throwing itself permanently false (SPEC §104, the engine note).
function shareOf(ctx, provName, religion) {
  const p = ctx.prov && ctx.prov(provName);
  if (!p || !Array.isArray(p.pop) || !p.pop.length) return 0;
  let total = 0;
  let mine = 0;
  for (const e of p.pop) {
    if (!e || !(e.n > 0)) continue;
    total += e.n;
    if (e.r === religion) mine += e.n;
  }
  return total > 0 ? mine / total : 0;
}

// Move souls into a faith in a named province, keeping the local culture:
// events seed congregations, the monthly drift grows them.
function seedFaith(ctx, provName, religion, culture, fraction) {
  const p = ctx.prov && ctx.prov(provName);
  if (!p || !Array.isArray(p.pop) || !p.pop.length) return;
  let total = 0;
  for (const e of p.pop) total += (e && e.n > 0) ? e.n : 0;
  const n = Math.round(total * fraction);
  if (n <= 0) return;
  ctx.helpers.addPopulation(ctx, provName, { r: religion, c: culture, n });
}

export const EVENTS_132_FAITH = [

  // ── F1 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_not_our_star',
    title: 'Not Our Star',
    desc: 'They came out with everyone else — they are Judeans, the villages are theirs '
      + 'too — and then the oath is put to them at the muster and they will not swear it. '
      + 'Not because they love Rome. Because they hold that the redemption has already '
      + 'happened, quietly, a hundred years ago, in a way nobody noticed, and that the '
      + 'man on the coins is therefore not the one. Justin, who is watching this from '
      + 'Ephesus and will write it down for a Roman emperor, says the Prince has them '
      + 'dragged off to punishment unless they deny Jesus and curse him. A claimant who '
      + 'rules by being the star out of Jacob cannot have a second star in the ranks; '
      + 'that is not cruelty, it is arithmetic. It is also the moment the argument stops '
      + 'being between Jews.',
    forTag: 'JUD',
    decider: 'JUD',
    major: true,
    minYear: 132,
    maxYear: 136,
    trigger: safeTrigger('ev2_not_our_star', (ctx) =>
      alive(ctx, 'JUD') && dateGE(ctx, 132, 8) && !!findJudRomWar(ctx.game)),
    aiOption: 0,
    historical: 'The Prince purged them; Justin reported it to Rome within twenty years, and the churches remembered.',
    options: [
      {
        label: 'Deny him, or answer for it',
        tooltip: '+6 legitimacy, +1 stability — one redemption, one prince. The refusers scatter to Pella and the coast, where their congregations keep growing for three centuries (Christian communities seeded in Pella, Joppa and Ascalon).',
        effects: guard('ev2_not_our_star:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'JUD')) return;
          h.adjust(ctx, 'JUD', { legitimacy: 6, stability: 1 });
          seedFaith(ctx, 'Pella', 'christianity', 'greek', 0.06);
          seedFaith(ctx, 'Joppa', 'christianity', 'greek', 0.03);
          seedFaith(ctx, 'Ascalon', 'christianity', 'greek', 0.03);
          h.setFlag(ctx, 'nazarenesPurged', true);
          h.chronicle(ctx, 'era', 'The Nasi puts the oath to the followers of Jesus and punishes those who will not curse him; they go over the Jordan, and stay gone.');
        }),
      },
      {
        label: 'A man who fights need not agree with me',
        tooltip: '+900 manpower and the coastal congregations stay put and stay Judean — but the sages will not be told the Prince is indifferent about the Redemption: −5 legitimacy, the Sages faction −0.6.',
        effects: guard('ev2_not_our_star:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'JUD')) return;
          h.adjust(ctx, 'JUD', { manpower: 900, legitimacy: -5 });
          h.factionShift(ctx, 'JUD', 'sages', -0.6);
          seedFaith(ctx, 'Pella', 'christianity', 'judean', 0.04);
          h.setFlag(ctx, 'nazarenesTolerated', true);
          h.chronicle(ctx, 'era', 'The Prince lets the followers of Jesus keep their oath and their places in the line; the academies are not consulted.');
        }),
      },
    ],
  },

  // ── F2 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_fifteenth_bishop',
    title: 'The Fifteenth Bishop',
    desc: 'Eusebius will copy out a list he found and not notice what it says. Fifteen '
      + 'bishops of Jerusalem, from James the brother of the Lord to Judas, and a note '
      + 'that all of them were Hebrews of ancient stock, and circumcised. Then the list '
      + 'stops, because the city stops: no Jew may enter Aelia on pain of death, and '
      + 'that includes a Jew who holds that the messiah has come. The sixteenth is Mark, '
      + 'a gentile, and the church in the city where the thing began is from this month '
      + 'a church of Greeks who have never kept a sabbath in their lives. The most '
      + 'consequential thing Hadrian did to Christianity, he did without meaning to and '
      + 'without being told.',
    forTag: 'both',
    decider: 'ROM',
    world: true,
    worldLabel: 'A gentile bishop takes Jerusalem\'s empty see',
    date: { y: 136, m: 1 },
    when: (ctx) => romanAftermath(ctx),
    aiOption: 0,
    options: [
      {
        label: 'The see passes to Mark, a Greek',
        tooltip: 'Aelia becomes a gentile city with a gentile church: a Christian community is seeded in Jerusalem, and the drift has a congregation there to grow (SPEC §104).',
        effects: guard('ev2_fifteenth_bishop:0', (ctx) => {
          const h = ctx.helpers;
          seedFaith(ctx, 'Jerusalem', 'christianity', 'greek', 0.05);
          seedFaith(ctx, 'Jerusalem', 'hellenism', 'greek', 0.10); // the colonists themselves
          h.setFlag(ctx, 'gentileSee', true);
          h.chronicle(ctx, 'era', 'The line of circumcised bishops of Jerusalem ends with the ban on Jews entering Aelia; Mark, a gentile, takes the see.');
        }),
      },
    ],
  },

  // ── F3 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_proselyte_ban',
    title: 'His Own Sons, and No Others',
    desc: 'Read the rescript twice and it becomes the most important sentence of the '
      + 'century. Jews are permitted to circumcise their own sons — the relief everyone '
      + 'has been waiting five years for. And: whoever circumcises a man not of that '
      + 'nation suffers the penalty of the castrator. Modestinus copies it into the '
      + 'Digest without comment. What the law has just done is not persecute a religion; '
      + 'it has licensed one and closed its door. The Jews may keep what they have and '
      + 'may not gather more. The other movement, which has spent thirty years arguing '
      + 'that the door does not need a knife on the other side of it, is not mentioned '
      + 'in the rescript at all, and now stands alone in a mission field of sixty million '
      + 'people. Nobody in the consistory notices. Nobody had to.',
    forTag: 'both',
    decider: 'ROM',
    major: true,
    minYear: 139,
    maxYear: 170,
    trigger: safeTrigger('ev2_proselyte_ban', (ctx) =>
      fired(ctx, 'ev2_antoninus_rescript') && dateGE(ctx, 140, 1) && alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'The rescript stood: circumcision of converts stayed a capital offence, and the Jewish mission to the gentiles ended in law.',
    options: [
      {
        label: 'Accept the license and its clause',
        tooltip: 'Quiet, bought at the price of the future: every Jewish province under Rome −1 unrest for 36 months ("The Law Permits Us"), Rome +3 stability worth of order — and the god-fearer pool is closed to the Jewish mission PERMANENTLY. Nothing later reopens it.',
        effects: guard('ev2_proselyte_ban:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (!p || p.impassable || p.religion !== 'judaism') continue;
            h.addProvinceModifier(ctx, p.name, {
              id: 'law_permits_us', name: 'The Law Permits Us', months: 36,
              effects: { unrest: -1 },
            });
          }
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { legitimacy: 4 });
          h.setFlag(ctx, 'missionBarred', true);
          h.chronicle(ctx, 'era', 'The rescript is accepted as it stands: Jews may circumcise their own sons, and no others. The mission field passes to the other movement without a word said about it.');
        }),
      },
      {
        label: 'Keep the door open under a death penalty',
        tooltip: 'The courts keep hearing the cases: every Jewish province under Rome +1 unrest for 36 months ("Cases Before the Governor") and −60 talents in fines — but the Jewish mission keeps its share of the god-fearers, and the state that defends it is remembered for it (+8 legitimacy to a standing Judaea).',
        effects: guard('ev2_proselyte_ban:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (!p || p.impassable || p.religion !== 'judaism') continue;
            h.addProvinceModifier(ctx, p.name, {
              id: 'cases_before_governor', name: 'Cases Before the Governor', months: 36,
              effects: { unrest: 1 },
            });
          }
          if (alive(ctx, 'JUD')) h.adjust(ctx, 'JUD', { treasury: -60, legitimacy: 8 });
          h.setFlag(ctx, 'proselytesDefended', true);
          h.chronicle(ctx, 'era', 'The proselytes keep coming and the governors keep trying the cases: the Jewish mission goes on under a capital statute.');
        }),
      },
    ],
  },

  // ── F4 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_marcion',
    title: 'The Shipowner\'s Two Gods',
    desc: 'A rich man from Sinope buys his way into the Roman congregation with two '
      + 'hundred thousand sesterces and a proposition: the god of the Hebrew scriptures '
      + '— jealous, territorial, occupied with the affairs of one nation — is a different '
      + 'and lesser being than the father of Jesus, and the church should therefore put '
      + 'the whole of those scriptures down. He has a canon ready: one gospel, ten '
      + 'letters, everything Jewish edited out. The presbyters return his money and put '
      + 'him out, and in doing so they decide something they may not realize they are '
      + 'deciding — that this movement will go on reading the Law and the Prophets, go '
      + 'on arguing about them, and go on being, in the only way that finally matters, '
      + 'a claimant to the same inheritance.',
    forTag: 'both',
    decider: 'ROM',
    world: true,
    worldLabel: 'Marcion is expelled at Rome',
    date: { y: 144, m: 7 },
    aiOption: 0,
    options: [
      {
        label: 'The money is returned; the scriptures are kept',
        tooltip: 'The argument stays an argument about the same books, and the two missions keep competing for the same people. No modifier — this card is the reason the rest of the chain is possible.',
        effects: guard('ev2_marcion:0', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'sameScriptures', true);
          h.chronicle(ctx, 'era', 'Rome expels Marcion and keeps the Hebrew scriptures; the two movements will go on disputing the same inheritance.');
        }),
      },
    ],
  },

  // ── F5 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_trypho',
    title: 'The Dialogue at Ephesus',
    worldLabel: 'Justin writes the Dialogue with Trypho',
    desc: 'Justin sets it, as a literary matter, in the days just after the war — a '
      + 'philosopher in a cloak meets a learned Jewish refugee walking the colonnade, and '
      + 'they talk for two days. It is a set piece and Trypho gets the lines Justin wants '
      + 'him to have, and it is still the most revealing document of the century, because '
      + 'of what they do not argue about. Not whether the scriptures are true: both take '
      + 'that as read. They argue about who they are addressed to. Trypho asks the only '
      + 'question that matters — you people take our books, cut yourselves off from the '
      + 'Law, and then claim to be Israel? — and gets an answer that will be repeated for '
      + 'eighteen centuries. They part politely. Neither concedes anything at all.',
    forTag: 'both',
    decider: 'ROM',
    world: true,
    minYear: 150,
    maxYear: 168,
    trigger: safeTrigger('ev2_trypho', (ctx) =>
      dateGE(ctx, 155, 1) && shareOf(ctx, 'Smyrna', 'christianity') > 0.005),
    aiOption: 0,
    options: [
      {
        label: 'The argument is about ownership',
        tooltip: 'A contest of learning rather than of arms: the Christian mission takes the argument to the synagogues of Asia (its congregations at Smyrna and Corinth grow), and the Jewish schools sharpen against it (+15 governance points to a standing Judaea).',
        effects: guard('ev2_trypho:0', (ctx) => {
          const h = ctx.helpers;
          seedFaith(ctx, 'Smyrna', 'christianity', 'greek', 0.02);
          seedFaith(ctx, 'Corinth', 'christianity', 'greek', 0.015);
          if (alive(ctx, 'JUD')) h.adjust(ctx, 'JUD', { gov: 15 });
          h.setFlag(ctx, 'tryphoAnswered', true);
        }),
      },
    ],
  },

  // ── F6 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_quartodeciman',
    title: 'The Fourteenth Day',
    desc: 'The churches of Asia keep the paschal feast on the fourteenth of Nisan — the '
      + 'day the lambs are killed — whatever day of the week it falls on, because that is '
      + 'when it happened and because that is what the calendar says, and the calendar is '
      + 'fixed by a court in Galilee that intercalates the year and sends out the letters. '
      + 'Rome keeps it on the following Sunday and would like everyone else to. Victor, '
      + 'bishop of Rome, writes to cut Asia off entirely; Polycrates of Ephesus replies '
      + 'that he is eighty-five years old, that seven of his relatives were bishops before '
      + 'him, and that he is not frightened by letters. Irenaeus, whose name means '
      + 'peaceable, talks Victor down. But the question underneath is not liturgical: it '
      + 'is whether this religion still takes its year from Jewish authority.',
    forTag: 'both',
    decider: 'ROM',
    minYear: 185,
    maxYear: 215,
    trigger: safeTrigger('ev2_quartodeciman', (ctx) =>
      dateGE(ctx, 190, 1) && shareOf(ctx, 'Smyrna', 'christianity') > 0.01),
    aiOption: 0,
    historical: 'Victor threatened excommunication and was talked out of it; Asia kept the fourteenth day for another century and a half.',
    options: [
      {
        label: 'Asia keeps the fourteenth day',
        tooltip: 'The churches of Asia go on taking the date from the Sanhedrin\'s intercalation. A Judaea that holds the calendar gains by it: +10 legitimacy and +0.2 legitimacy a month for 60 months ("The Reckoning of the Land"). The dependence lasts until Nicaea legislates it away.',
        effects: guard('ev2_quartodeciman:0', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'quartodeciman', true);
          if (alive(ctx, 'JUD') && !!ctx.game.flags.calendarHeld) {
            h.adjust(ctx, 'JUD', { legitimacy: 10 });
            h.addTagModifier(ctx, 'JUD', {
              id: 'reckoning_of_the_land', name: 'The Reckoning of the Land', months: 60,
              effects: { legitimacyAdd: 0.2 },
            });
          }
          h.chronicle(ctx, 'era', 'Victor of Rome fails to cut Asia off: the churches there keep the paschal feast by the Jewish reckoning.');
        }),
      },
      {
        label: 'One Sunday for the whole church',
        tooltip: 'Rome carries the point early, and one more thread between the two is cut: the Jewish court\'s calendar loses its foreign audience (a Judaea holding the calendar loses the "One Calendar" quiet, −5 legitimacy).',
        effects: guard('ev2_quartodeciman:1', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'paschalSunday', true);
          h.removeModifier(ctx, 'Sepphoris', 'one_calendar');
          if (alive(ctx, 'JUD')) h.adjust(ctx, 'JUD', { legitimacy: -5 });
          h.chronicle(ctx, 'era', 'The paschal feast is fixed to the Sunday: the church takes its year from itself.');
        }),
      },
    ],
  },

  // ── F7 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_plague_charity',
    title: 'Who Stayed with the Sick',
    desc: 'The pestilence does not care about anyone\'s theology, and the physicians go '
      + 'first, and then the rich, and then anyone who has anywhere to go. Galen leaves '
      + 'Rome. What is left in the emptied streets is the people who stayed, and a '
      + 'surprising share of them belong to a movement that holds the sick to be Christ '
      + 'in disguise: they carry water, they bury the dead of other households, they take '
      + 'in the children of the dead. Nursing is not a miracle — it is water and warmth — '
      + 'but in a plague water and warmth are the difference between a third dead and two '
      + 'thirds, and the survivors are bound to the people who sat with them. The '
      + 'congregations come out of the plague years larger than they went in, in a world '
      + 'with fewer people in it.',
    forTag: 'both',
    decider: 'ROM',
    minYear: 166,
    maxYear: 195,
    trigger: safeTrigger('ev2_plague_charity', (ctx) =>
      fired(ctx, 'ev2_antonine_plague') && dateGE(ctx, 168, 1)),
    aiOption: 0,
    options: [
      {
        label: 'They stayed, and were remembered for it',
        tooltip: 'The plague years leave the Christian congregations larger than they found them: the god-fearer pool tilts to the Christian mission for good, and Antioch, Alexandria and Rome each gain congregations. Rome +1 unrest for 24 months in the plague cities — the ones who stayed are also the ones the crowd notices are not sacrificing.',
        effects: guard('ev2_plague_charity:0', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'plagueCharity', true);
          for (const name of ['Antioch', 'Alexandria', 'Roma', 'Corinth', 'Smyrna']) {
            seedFaith(ctx, name, 'christianity', 'greek', 0.015);
          }
          for (const name of ['Antioch', 'Alexandria', 'Roma']) {
            h.addProvinceModifier(ctx, name, {
              id: 'the_ones_who_stayed', name: 'The Ones Who Stayed', months: 24,
              effects: { unrest: 1 },
            });
          }
          h.chronicle(ctx, 'era', 'The congregations nurse the sick through the plague and come out of it larger than they went in.');
        }),
      },
      {
        label: 'Find whoever angered the gods',
        tooltip: 'The temples get their sacrifices and the cities get somebody to blame: Rome +40 talents and +1 stability worth of order, but the plague cities +2 unrest for 24 months ("Whose Fault the Plague Is") — and the movement being blamed keeps growing anyway.',
        effects: guard('ev2_plague_charity:1', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'plagueScapegoat', true);
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { treasury: 40 });
          for (const name of ['Antioch', 'Alexandria', 'Roma', 'Smyrna']) {
            h.addProvinceModifier(ctx, name, {
              id: 'whose_fault_the_plague', name: 'Whose Fault the Plague Is', months: 24,
              effects: { unrest: 2 },
            });
            seedFaith(ctx, name, 'christianity', 'greek', 0.008);
          }
          h.chronicle(ctx, 'era', 'The cities look for whoever angered the gods; the sacrifices are counted and the congregations grow regardless.');
        }),
      },
    ],
  },

  // ── F8 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_sardis_homily',
    title: 'The Homily at Sardis',
    desc: 'Melito preaches the paschal homily in a city whose synagogue is the largest '
      + 'anyone has built anywhere — a basilica in the middle of the gymnasium complex, '
      + 'with the town\'s Jews on the council and their names cut into the benches. Into '
      + 'that neighbourhood he says the sentence: God has been murdered, the King of '
      + 'Israel has been killed by an Israelite right hand. It is the first time anyone '
      + 'writes it down in that form, and it is not written by a man who has been '
      + 'defeated by his neighbours — it is written by a man who has to explain, week '
      + 'after week, why the older and richer congregation up the street is not the one '
      + 'God is listening to. The charge outlives the argument that produced it by '
      + 'eighteen hundred years.',
    forTag: 'both',
    decider: 'ROM',
    world: true,
    worldLabel: 'Melito of Sardis preaches the deicide charge',
    date: { y: 165, m: 4 },
    aiOption: 0,
    options: [
      {
        label: 'The charge is made, and kept',
        tooltip: 'A sentence with a very long life: the synagogues of Asia +2 unrest for 48 months ("The Charge at Sardis") wherever a Jewish community lives beside a Christian one, and the Jewish draw on the god-fearers of Asia weakens.',
        effects: guard('ev2_sardis_homily:0', (ctx) => {
          const h = ctx.helpers;
          for (const name of ['Smyrna', 'Corinth', 'Thessalonica', 'Antioch']) {
            h.addProvinceModifier(ctx, name, {
              id: 'charge_at_sardis', name: 'The Charge at Sardis', months: 48,
              effects: { unrest: 2 },
            });
          }
          h.setFlag(ctx, 'deicideCharge', true);
          h.chronicle(ctx, 'era', 'Melito of Sardis preaches that God has been murdered by an Israelite right hand; the sentence outlives everyone who hears it.');
        }),
      },
    ],
  },
];
