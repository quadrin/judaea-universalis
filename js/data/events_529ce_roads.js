// Judaea Universalis — the Keepers' roads, 531–614 CE. Content package.
// Zero imports; concatenated onto EVENTS_529 by the registry.
//
// SPEC §136 shipped the opening chain — the statute, the games, the bishop, the
// mountain, the phylarch — and charted four forks on the §119 tree with two of
// them live and every road of both declared in `KNOWN_GAPS`, because their
// terminals belonged to a tail nobody had written. This is that tail, and the
// two forks that were charted and empty.
//
// The chapter's problem is that its war is over in two years and its question
// runs for eighty-five. Justinian did not settle Samaria in 531; he broke a
// rising and left the statute standing, and everything that happens to this
// community afterwards happens under a law that was never repealed. So the tail
// is not a campaign. It is four decisions taken by a people getting smaller,
// with the dates the history actually supplies:
//
//   531  the refugees at Ctesiphon, offering Kavad fifty thousand men
//   536  the wall Justinian put round the church on the summit
//   540  Khusrau breaks the Eternal Peace — the invasion, nine years late
//   551  Sergius of Caesarea talks the emperor into easing the disabilities
//   556  the joint rising at Caesarea and the proconsul killed in his own hall
//   572  the last revolt, under Justin II, and the constitution that answered it
//   614  the Persians on the coast road, and what is left to meet them
//
// The Taheb has no date, because that is what it is. The restorer of
// Deut. 18:18 is the one thing in this chapter more dangerous to the empire
// than a king, and the community has produced claimants before: the man who
// took a crowd up Gerizim under Pilate to bring the vessels of the Tabernacle
// out of the mountain, and what Pilate did on the slope, which cost him the
// prefecture and cost the community rather more.
//
// Sources: Malalas XVIII (Ctesiphon, Caesarea, Stephanus); Procopius,
// Buildings V.vii (the wall) and Anecdota XI; Justinian's Novel 129 of 551 and
// the constitution of 572; Josephus, Antiquities XVIII.85–87 (the Taheb under
// Pilate); the Kitab al-Tarikh of Abu'l-Fath and the Samaritan Chronicle Adler,
// which are late and are flagged rather than leaned on.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_529ce_roads] ' + key, e || '');
}

// The letters this court answers to NOW (SPEC §135).
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

function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[who(ctx, tag)];
  return !!(t && t.alive !== false);
}

function flag(ctx, k) { return !!(ctx.game.flags && ctx.game.flags[k]); }

function dateGE(ctx, y, m) {
  const d = ctx.game.date;
  return d.y > y || (d.y === y && d.m >= m);
}

// The chapter's own scoreboard, in a package that cannot import the bookmark:
// how many provinces still keep this Torah, wherever their banner flies. Every
// card in the tail is priced against it, because the thing getting smaller is
// the people and not the state.
function keepers(ctx) {
  const g = ctx.game;
  let n = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.religion === 'samaritanism') n++;
  }
  return n;
}

function nudge(ctx, tag, delta) {
  try {
    const t = ctx.game.tags[who(ctx, tag)];
    if (!t) return;
    if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
    const me = who(ctx, 'SAM');
    t.opinion[me] = Math.max(-200, Math.min(200, (t.opinion[me] || 0) + delta));
  } catch (e) { warnOnce('nudge:' + tag, e); }
}

// The four hill provinces, for the cards that price a decision in villages.
const HILL_COUNTRY = ['Neapolis', 'Jenin', 'Tulkarm', 'Qalqilya'];

function stir(ctx, names, mod) {
  for (const n of names) ctx.helpers.addProvinceModifier(ctx, n, mod);
}

// The rising is over, one way or the other, and there is still a community.
// Every card in the tail wants this and none of them wants a state: a chapter
// whose victory condition counts people cannot gate its own second half on
// holding ground.
function afterTheRising(ctx) {
  return alive(ctx, 'SAM') && keepers(ctx) > 0;
}

export const EVENTS_529_ROADS = [

  // ── 1 ──────────────────────────────────────────────────────────────────────
  // The fork the design called Ctesiphon. It is the oldest move available to
  // anybody in this corner of the world and it has never once worked.
  {
    id: 'ev529_the_letter_to_ctesiphon',
    title: 'The Letter to Ctesiphon',
    worldLabel: 'The refugees reach the Persian court',
    desc: 'Men of this community have been leaving for the east since the notary read the '
      + 'statute out, because east is where you go, and enough of them have reached the King of '
      + 'Kings\' court to be received as a delegation rather than as beggars. What they are '
      + 'offering there is not sympathy. They are offering an army: fifty '
      + 'thousand men of this community and its neighbours, they say, will rise in Palaestina '
      + 'on the day a Persian column crosses the Euphrates, and the diocese that feeds '
      + 'Constantinople will come apart behind the field army.\n\n'
      + 'Kavad is seventy-eight and has spent thirty years at war with Rome, and everyone in '
      + 'the room knows the number is a number the way an ambassador\'s numbers are. That is '
      + 'not the difficulty. The difficulty is that the letter, once written, is a fact in a '
      + 'chancery that keeps its files, and the empire it is written against also keeps files. '
      + 'A community that has been legislated out of inheritance can be legislated out of '
      + 'anything; what it has not yet been called is a Persian asset, and there is a word for '
      + 'what happens to those in a frontier province when the war comes.',
    forTag: 'SAM',
    major: true,
    minYear: 531,
    maxYear: 540,
    trigger: safeTrigger('ev529_ctesiphon', (ctx) => afterTheRising(ctx)
      && !flag(ctx, 'ctesiphonAnswered')
      && dateGE(ctx, 531, 2)),
    aiOption: 2,
    historical: 'Malalas XVIII records Samaritan refugees at Kavad\'s court after the rising, '
      + 'promising fifty thousand men if Persia invaded Palestine. Kavad died in September 531 '
      + 'and the Eternal Peace followed in 532; nothing came of it except that Constantinople '
      + 'remembered the offer.',
    options: [
      {
        label: 'Fifty thousand men, and the King of Kings may have the province',
        tooltip: 'The offer goes east under the elders\' own names. Persia\'s opinion of us +80 '
          + 'and the empire\'s −60; "The Promise to Ctesiphon" (+12% manpower, −8% income, '
          + 'permanent) — the men are being counted and so are the assessors. The crowned party '
          + '+25, the quietists −30, and the realm turns eastward.',
        effects: guard('ev529_ctesiphon:0', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'SAM', {
            id: 'the_promise_to_ctesiphon', name: 'The Promise to Ctesiphon', months: -1,
            effects: { manpowerMult: 1.12, incomeMult: 0.92 },
          });
          h.factionShift(ctx, 'SAM', 'crowned', 25);
          h.factionShift(ctx, 'SAM', 'quietists', -30);
          h.doctrine(ctx, 'alignment', -3);
          nudge(ctx, 'SAS', 80);
          nudge(ctx, 'BYZ', -60);
          h.setFlag(ctx, 'ctesiphonAnswered', true);
          h.setFlag(ctx, 'ctesiphonPromised', true);
          h.chronicle(ctx, 'diplomacy', 'An offer of fifty thousand men goes to Ctesiphon over the '
            + 'names of the elders. Two chanceries file it, and only one of them is friendly.');
        }),
      },
      {
        label: 'Send the men, not the letter',
        tooltip: 'No promise and no signature: the young men simply take service in the east, as '
          + 'men from this hill country have done since Alexander. −3,000 manpower and +80 talents '
          + 'now, "The Men Who Went East" (+7% income, −6% manpower, permanent), Persia +35. The '
          + 'Council of Seven +20 — they are the ones who will explain it to the mothers.',
        effects: guard('ev529_ctesiphon:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { manpower: -3000, treasury: 80 });
          h.addTagModifier(ctx, 'SAM', {
            id: 'the_men_who_went_east', name: 'The Men Who Went East', months: -1,
            effects: { incomeMult: 1.07, manpowerMult: 0.94 },
          });
          h.factionShift(ctx, 'SAM', 'council', 20);
          h.factionShift(ctx, 'SAM', 'crowned', 10);
          h.doctrine(ctx, 'alignment', -1);
          nudge(ctx, 'SAS', 35);
          h.setFlag(ctx, 'ctesiphonAnswered', true);
          h.setFlag(ctx, 'sentTheYoungMen', true);
          h.chronicle(ctx, 'era', 'The young men go east and take Persian pay. Nothing is written '
            + 'down, which is the entire point, and the remittances arrive for thirty years.');
        }),
      },
      {
        label: 'No. A people that is a pretext is a people with a garrison in it',
        tooltip: 'The delegation is disowned in writing before anyone in Caesarea has to ask. '
          + '+1 stability, +12 legitimacy, the empire\'s opinion of us +25 and Persia\'s −20; the '
          + 'quietists +30 and the Council of Seven +20, the crowned party −25. It buys nothing '
          + 'and it removes the one charge the statute did not already contain.',
        effects: guard('ev529_ctesiphon:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { stability: 1, legitimacy: 12 });
          h.addTagModifier(ctx, 'SAM', {
            id: 'nothing_in_the_file', name: 'Nothing in the File', months: -1,
            effects: { unrestAll: -0.5 },
          });
          h.factionShift(ctx, 'SAM', 'quietists', 30);
          h.factionShift(ctx, 'SAM', 'council', 20);
          h.factionShift(ctx, 'SAM', 'crowned', -25);
          h.doctrine(ctx, 'alignment', 2);
          nudge(ctx, 'BYZ', 25);
          nudge(ctx, 'SAS', -20);
          h.setFlag(ctx, 'ctesiphonAnswered', true);
          h.setFlag(ctx, 'ctesiphonRefused', true);
          h.chronicle(ctx, 'era', 'The elders disown the delegation at Ctesiphon in a letter the '
            + 'dux is meant to read, and which he does read, and files.');
        }),
      },
    ],
  },

  // ── 2 ──────────────────────────────────────────────────────────────────────
  // Justinian's answer to the mountain, and the terminal of the altar road.
  {
    id: 'ev529_the_wall_on_the_summit',
    title: 'The Wall on the Summit',
    desc: 'Procopius will write the sentence down as praise: the emperor rebuilt the church on '
      + 'the summit, and because the Samaritans are treacherous he ran a wall round it, and put '
      + 'a garrison inside the wall, and that was the end of the matter. It is one of the very '
      + 'few passages in the whole panegyric where the building and the policy are the same '
      + 'object and he does not bother to separate them.\n\n'
      + 'A wall on a summit is not a fortification of a mountain. It is a fortification of an '
      + 'idea, and it is built to be seen from the fields, which is also how the altar was '
      + 'built to be seen. Whoever is on the rock this year is going to spend money on masonry '
      + 'that grows nothing, drinks cistern water, and settles nothing at all — and both sides '
      + 'know that the side which stops paying for it has conceded the mountain.',
    forTag: 'SAM',
    major: true,
    minYear: 536,
    maxYear: 570,
    trigger: safeTrigger('ev529_wall', (ctx) => afterTheRising(ctx)
      && flag(ctx, 'gerizimAnswered')
      && !flag(ctx, 'summitAnswered')
      && dateGE(ctx, 536, 1)),
    aiOption: 0,
    historical: 'Procopius, Buildings V.vii: Justinian rebuilt the Church of St Mary Theotokos on '
      + 'Gerizim after the rising was broken and walled it about with a garrison inside — the '
      + 'emperor\'s answer to the whole question, in stone, on the skyline.',
    options: [
      {
        label: 'Then we wall it. Whatever it costs to keep a rock',
        tooltip: 'The altar gets the wall the church would have had: −140 talents and −30 '
          + 'governance points, "The Wall Is Ours" (+1 hill defense, +0.3 legitimacy a month, '
          + 'permanent) and Neapolis quiets by a further point. The priesthood +30. It is a '
          + 'garrison on ground that grows nothing, and it is the skyline.',
        when: (ctx) => flag(ctx, 'gerizimCleared'),
        effects: guard('ev529_wall:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -140, gov: -30 });
          h.addTagModifier(ctx, 'SAM', {
            id: 'the_wall_is_ours', name: 'The Wall Is Ours', months: -1,
            effects: { hillDefBonus: 1, legitimacyAdd: 0.3 },
          });
          h.addProvinceModifier(ctx, 'Neapolis', {
            id: 'the_walled_summit', name: 'The Walled Summit', months: -1,
            effects: { unrest: -1 },
          });
          h.factionShift(ctx, 'SAM', 'priesthood', 30);
          h.factionShift(ctx, 'SAM', 'quietists', -15);
          h.doctrine(ctx, 'zeal', 1);
          h.setFlag(ctx, 'summitAnswered', true);
          h.setFlag(ctx, 'summitWalled', true);
          h.chronicle(ctx, 'era', 'A wall goes round the altar on Gerizim, built by the people who '
            + 'built the altar. From the fields it is the same silhouette the church had, and '
            + 'nobody in the villages says so out loud.');
        }),
      },
      {
        label: 'An altar is not a fort. Leave it open to the sky',
        tooltip: 'The summit is kept as the Torah describes it and not as a garrison: +20 '
          + 'legitimacy and +2 zeal, "Open to the Sky" (+8% morale, permanent) — and the rock is '
          + 'held by whoever can walk up the one road, so −1 hill defense. The priesthood +20 and '
          + 'the Council of Seven −20.',
        when: (ctx) => flag(ctx, 'gerizimCleared'),
        effects: guard('ev529_wall:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { legitimacy: 20 });
          h.addTagModifier(ctx, 'SAM', {
            id: 'open_to_the_sky', name: 'Open to the Sky', months: -1,
            effects: { moraleMult: 1.08, hillDefBonus: -1 },
          });
          h.factionShift(ctx, 'SAM', 'priesthood', 20);
          h.factionShift(ctx, 'SAM', 'council', -20);
          h.doctrine(ctx, 'zeal', 2);
          h.setFlag(ctx, 'summitAnswered', true);
          h.setFlag(ctx, 'altarLeftOpen', true);
          h.chronicle(ctx, 'era', 'The altar on Gerizim is left unwalled, on the argument that a '
            + 'commandment fortified is a commandment answered in somebody else\'s language.');
        }),
      },
      {
        label: 'The masons come up the one road, and we watch them',
        tooltip: 'The empire holds the summit and rebuilds: the church goes back up inside a wall, '
          + 'and the community is barred from the mountain again. −15 legitimacy and +1.5 unrest '
          + 'in the hill country permanently; the priesthood −25 and the crowned party +20, because '
          + 'a grievance visible from every field in Samaria recruits by itself.',
        when: (ctx) => !flag(ctx, 'gerizimCleared'),
        effects: guard('ev529_wall:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { legitimacy: -15 });
          stir(ctx, HILL_COUNTRY, {
            id: 'the_church_rebuilt', name: 'The Church Rebuilt', months: -1,
            effects: { unrest: 1.5 },
          });
          h.addTagModifier(ctx, 'SAM', {
            id: 'barred_from_the_mountain', name: 'Barred From the Mountain', months: -1,
            effects: { manpowerMult: 1.08, legitimacyAdd: -0.15 },
          });
          h.factionShift(ctx, 'SAM', 'priesthood', -25);
          h.factionShift(ctx, 'SAM', 'crowned', 20);
          h.setFlag(ctx, 'summitAnswered', true);
          h.setFlag(ctx, 'theotokosRebuilt', true);
          h.chronicle(ctx, 'era', 'The Theotokos goes back up on the summit inside a new wall, with '
            + 'a garrison in it. The harvest below it is brought in by people who may not go up.');
        }),
      },
    ],
  },

  // ── 3 ──────────────────────────────────────────────────────────────────────
  // The invasion arrives. It is nine years late and it is not for us.
  {
    id: 'ev529_the_year_the_peace_broke',
    title: 'The Year the Peace Broke',
    worldLabel: 'Khusrau breaks the Eternal Peace',
    desc: 'The Eternal Peace lasted eight years, which is longer than the men who signed it '
      + 'expected and shorter than its name. Khusrau comes down the Euphrates in the spring, '
      + 'takes the cities of the north in order, and burns Antioch — the third city of the '
      + 'empire, emptied and fired in a week, its population marched east to a new Antioch '
      + 'built for them outside Ctesiphon and named after the man who took them.\n\n'
      + 'This is the invasion the refugees asked for in 531, arriving nine years late and for '
      + 'entirely Persian reasons, three hundred miles from the hill country, and it will not '
      + 'come south. That is the whole lesson of asking. The empire, meanwhile, has a field '
      + 'army in Syria and a war it did not choose, and every garrison between here and the '
      + 'coast is thinner this month than it was last month.',
    forTag: 'SAM',
    world: true,
    major: true,
    date: { y: 540, m: 6 },
    when: (ctx) => afterTheRising(ctx),
    aiOption: 1,
    historical: 'Khusrau I broke the Eternal Peace in 540 and sacked Antioch. The Persian war ran '
      + 'in Mesopotamia and Lazica and never came down into Palaestina, which is where the '
      + 'promise of 531 had been made about.',
    options: [
      {
        label: 'Rise. This is what was promised and this is the hour',
        tooltip: 'The thinned garrisons are taken at their word: +5,000 manpower and "The Hour '
          + 'Promised" (+12% morale, +10% manpower, 60 months), the crowned party +30. The empire '
          + 'files it with the letter of 531 (−50 opinion) and Persia, which is busy, is grateful '
          + 'at no cost to itself (+40).',
        effects: guard('ev529_peace:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { manpower: 5000 });
          h.addTagModifier(ctx, 'SAM', {
            id: 'the_hour_promised', name: 'The Hour Promised', months: 60,
            effects: { moraleMult: 1.12, manpowerMult: 1.1 },
          });
          h.factionShift(ctx, 'SAM', 'crowned', 30);
          h.factionShift(ctx, 'SAM', 'quietists', -25);
          h.doctrine(ctx, 'conquest', 2);
          nudge(ctx, 'BYZ', -50);
          nudge(ctx, 'SAS', 40);
          h.setFlag(ctx, 'roseWithKhusrau', true);
          h.chronicle(ctx, 'war', 'The hill country rises in the year Antioch burns, on the reasoning '
            + 'that the garrisons have gone north. The garrisons have gone north.');
        }),
      },
      {
        label: 'Let the empires have their war',
        tooltip: 'The community sits out the largest Persian offensive in a century: +2 stability, '
          + '+120 talents from a season nobody requisitions, and "The Quiet Decade" (−1 unrest '
          + 'everywhere, 120 months). The quietists +30 and the crowned party −25 — and the '
          + 'thinnest garrisons in eighty years go unanswered.',
        effects: guard('ev529_peace:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { stability: 2, treasury: 120 });
          h.addTagModifier(ctx, 'SAM', {
            id: 'the_quiet_decade', name: 'The Quiet Decade', months: 120,
            effects: { unrestAll: -1 },
          });
          h.factionShift(ctx, 'SAM', 'quietists', 30);
          h.factionShift(ctx, 'SAM', 'crowned', -25);
          h.setFlag(ctx, 'satOutTheWar', true);
          h.chronicle(ctx, 'era', 'Antioch burns in the north and the hill country brings in its '
            + 'harvest. It is the first year since the statute that nobody in the villages is '
            + 'asked to decide anything.');
        }),
      },
      {
        label: 'Sell the passes. Both sides are buying and neither is watching',
        tooltip: 'Guides, grain and silence, sold to whoever is paying that month: +200 talents and '
          + '"The Season\'s Trade" (+15% income, 120 months), the Council of Seven +25 and the '
          + 'realm turns mercantile. It also puts this community\'s men on both sides of a road '
          + 'the empire polices: +1 unrest in the hill country.',
        effects: guard('ev529_peace:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: 200 });
          h.addTagModifier(ctx, 'SAM', {
            id: 'the_seasons_trade', name: 'The Season\'s Trade', months: 120,
            effects: { incomeMult: 1.15 },
          });
          stir(ctx, HILL_COUNTRY, {
            id: 'men_on_both_roads', name: 'Men on Both Roads', months: 120, effects: { unrest: 1 },
          });
          h.factionShift(ctx, 'SAM', 'council', 25);
          h.factionShift(ctx, 'SAM', 'priesthood', -15);
          h.doctrine(ctx, 'conquest', -2);
          h.setFlag(ctx, 'soldThePasses', true);
          h.chronicle(ctx, 'era', 'The hill country sells guides and grain to both armies and keeps '
            + 'no accounts either side could subpoena. It is the most profitable decade in the '
            + 'chapter and nobody writes a word of it down.');
        }),
      },
    ],
  },

  // ── 4 ──────────────────────────────────────────────────────────────────────
  // A Christian bishop is the one who gets the persecution relaxed.
  {
    id: 'ev529_sergius_of_caesarea',
    title: 'Sergius of Caesarea',
    worldLabel: 'The disabilities are eased at Constantinople',
    desc: 'Sergius, bishop of Caesarea, has gone to Constantinople and argued the case, and the '
      + 'emperor who wrote the statute has issued a constitution softening it. This is not a '
      + 'repeal. It restores the right to inherit and to leave property, in the province, under '
      + 'conditions, and the argument that carried it is not a good one: the bishop told the '
      + 'court that many of these people have come over sincerely and are being ruined for the '
      + 'sins of the ones who have not, and that a province of paupers pays no tax.\n\n'
      + 'Twenty-two years. It is the first thing that has moved in the right direction since '
      + 'the rescript was read out, and it was moved by a Christian bishop of the city where '
      + 'the rescript was read out, on the grounds that the persecution had become inefficient. '
      + 'The elders are being asked what the community\'s answer is, and there are two of them '
      + 'in the room and both are honest.',
    forTag: 'SAM',
    world: true,
    major: true,
    date: { y: 551, m: 9 },
    when: (ctx) => afterTheRising(ctx),
    aiOption: 0,
    historical: 'Justinian\'s Novel 129 of 551 eased the disabilities on the Samaritans of '
      + 'Palestine after Sergius, bishop of Caesarea, interceded. Procopius says the relief was '
      + 'partial and did not last; no chapter of the legislation was ever struck out.',
    options: [
      {
        label: 'Take it. A law half-lifted is half a law',
        tooltip: 'The statute is replaced by its eased version: the income penalty drops from a '
          + 'quarter to a tenth and the unrest it carried is halved. +1 stability, +80 talents of '
          + 'estates recovered, the quietists +25 and the Council of Seven +25, the crowned party '
          + '−20.',
        effects: guard('ev529_sergius:0', (ctx) => {
          const h = ctx.helpers;
          h.removeModifier(ctx, 'SAM', 'the_statutes');
          h.addTagModifier(ctx, 'SAM', {
            id: 'the_statutes_eased', name: 'The Statutes Eased', months: -1,
            effects: { incomeMult: 0.9, unrestAll: 0.75 },
          });
          h.adjust(ctx, 'SAM', { stability: 1, treasury: 80 });
          h.factionShift(ctx, 'SAM', 'quietists', 25);
          h.factionShift(ctx, 'SAM', 'council', 25);
          h.factionShift(ctx, 'SAM', 'crowned', -20);
          nudge(ctx, 'BYZ', 20);
          h.setFlag(ctx, 'disabilitiesEased', true);
          h.chronicle(ctx, 'era', 'The disabilities are eased at Constantinople on a bishop\'s '
            + 'argument that a ruined province pays no tax. The elders take it, and the estates '
            + 'that come back are counted rather than celebrated.');
        }),
      },
      {
        label: 'Take it, and write the bishop\'s name in our own chronicle',
        tooltip: 'The same relief, and the community records who obtained it — which costs the '
          + 'priesthood something (−20) and buys a thing no statute grants: +15 legitimacy, +30 '
          + 'imperial opinion, and "The Bishop\'s Name" (−0.75 unrest everywhere, permanent), '
          + 'because the Christian villages of the hill country hear it too.',
        effects: guard('ev529_sergius:1', (ctx) => {
          const h = ctx.helpers;
          h.removeModifier(ctx, 'SAM', 'the_statutes');
          h.addTagModifier(ctx, 'SAM', {
            id: 'the_statutes_eased', name: 'The Statutes Eased', months: -1,
            effects: { incomeMult: 0.9, unrestAll: 0.75 },
          });
          h.addTagModifier(ctx, 'SAM', {
            id: 'the_bishops_name', name: 'The Bishop\'s Name', months: -1,
            effects: { unrestAll: -0.75 },
          });
          h.adjust(ctx, 'SAM', { legitimacy: 15 });
          h.factionShift(ctx, 'SAM', 'council', 30);
          h.factionShift(ctx, 'SAM', 'priesthood', -20);
          h.doctrine(ctx, 'zeal', -2);
          nudge(ctx, 'BYZ', 30);
          h.setFlag(ctx, 'disabilitiesEased', true);
          h.setFlag(ctx, 'sergiusRemembered', true);
          h.chronicle(ctx, 'diplomacy', 'The name of Sergius, bishop of Caesarea, is entered in the '
            + 'community\'s own chronicle for the year, which is not a thing that chronicle does.');
        }),
      },
      {
        label: 'We will not be grateful for the return of what was ours',
        tooltip: 'The relief is available and is not acknowledged; the elders keep the grievance '
          + 'entire. The statute stays as it is — no easing — and the community keeps what a '
          + 'grievance buys: +20 legitimacy, +2 zeal, the priesthood +30 and the crowned party +20, '
          + 'the quietists −30, imperial opinion −20.',
        effects: guard('ev529_sergius:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { legitimacy: 20 });
          h.addTagModifier(ctx, 'SAM', {
            id: 'the_grievance_entire', name: 'The Grievance Entire', months: -1,
            effects: { manpowerMult: 1.1, moraleMult: 1.05 },
          });
          h.factionShift(ctx, 'SAM', 'priesthood', 30);
          h.factionShift(ctx, 'SAM', 'crowned', 20);
          h.factionShift(ctx, 'SAM', 'quietists', -30);
          h.doctrine(ctx, 'zeal', 2);
          nudge(ctx, 'BYZ', -20);
          h.setFlag(ctx, 'easingRefused', true);
          h.chronicle(ctx, 'era', 'The easing is not acknowledged. The elders answer that a people '
            + 'does not thank a court for handing back the right to bury its own father with '
            + 'something to leave.');
        }),
      },
    ],
  },

  // ── 5 ──────────────────────────────────────────────────────────────────────
  // The fork the design called the Jews. Four centuries of schism, one city,
  // one governor, and a decision that has to be made in an afternoon.
  {
    id: 'ev529_the_praetorium_at_caesarea',
    title: 'The Praetorium at Caesarea',
    worldLabel: 'Caesarea rises: the proconsul killed in his own hall',
    desc: 'It starts in the Samaritan quarter of Caesarea, as it did in 484 and as it did in '
      + '529, because that is where this community meets the empire at close quarters and '
      + 'because a port city is where a crowd can become a rising between one street and the '
      + 'next. What is different this time is who is in the street with them. The Jews of '
      + 'Caesarea have come out too, on the same day, against the same government, and nobody '
      + 'in either quarter can produce a precedent for it.\n\n'
      + 'Four centuries of schism, a mountain each side calls a lie, and two Torahs that do not '
      + 'read the same at Deuteronomy 27:4 — and the crowd goes through the Christian quarter '
      + 'and then through the praetorium, and Stephanus the proconsul is killed in his own '
      + 'hall by people who have been governed by him jointly. His widow will take the case to '
      + 'Constantinople herself. The elders in Neapolis have the afternoon to decide whether '
      + 'this is their rising, somebody else\'s riot, or the first thing in four hundred years '
      + 'that both houses of Israel have done together.',
    forTag: 'SAM',
    world: true,
    major: true,
    date: { y: 556, m: 7 },
    when: (ctx) => afterTheRising(ctx),
    aiOption: 0,
    historical: 'In July 556 the Samaritans and Jews of Caesarea rose together, killed the '
      + 'proconsul Stephanus in his praetorium, and his widow Bassa carried the case to '
      + 'Constantinople; Justinian sent Amantius, whose punishment of the city was remembered as '
      + 'severe even by people who approved of it.',
    options: [
      {
        label: 'Send word to the Jewish quarter. Both houses, or neither',
        tooltip: 'The rising is joint and is declared to be joint: Galilee\'s opinion of us +80 and '
          + 'ours of them likewise, +4,000 manpower, and "The Two Houses" (+15% manpower, +8% '
          + 'morale, 120 months). Caesarea burns for a week (+2.5 unrest there, 120 months) and the '
          + 'empire answers a rising of both (−60 opinion). The crowned party +25, the priesthood '
          + '−20: this is not a thing the Eleazarite line has any liturgy for.',
        effects: guard('ev529_praetorium:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { manpower: 4000 });
          h.addTagModifier(ctx, 'SAM', {
            id: 'the_two_houses', name: 'The Two Houses', months: 120,
            effects: { manpowerMult: 1.15, moraleMult: 1.08 },
          });
          h.addProvinceModifier(ctx, 'Caesarea Maritima', {
            id: 'the_rising_of_556', name: 'The Rising of 556', months: 120,
            effects: { unrest: 2.5 },
          });
          h.factionShift(ctx, 'SAM', 'crowned', 25);
          h.factionShift(ctx, 'SAM', 'priesthood', -20);
          nudge(ctx, 'JUD', 80);
          nudge(ctx, 'BYZ', -60);
          try {
            const sam = ctx.game.tags[who(ctx, 'SAM')];
            if (sam) {
              if (!sam.opinion || typeof sam.opinion !== 'object') sam.opinion = {};
              const j = who(ctx, 'JUD');
              sam.opinion[j] = Math.min(200, (sam.opinion[j] || 0) + 80);
            }
          } catch (e) { warnOnce('praetorium:opinion', e); }
          h.setFlag(ctx, 'caesareaAnswered', true);
          h.setFlag(ctx, 'roseWithTheJews', true);
          h.notify(ctx, {
            title: 'The Praetorium at Caesarea', type: 'war', provName: 'Caesarea Maritima',
            text: 'Both houses of Israel are in the same street against the same government, for '
              + 'the first time since there were two of them.',
          });
          h.chronicle(ctx, 'era', 'The Keepers and the Jews of Caesarea rise on the same day and '
            + 'the proconsul is killed in his own hall. Four hundred years of argument are not '
            + 'settled; they are simply not mentioned for a week.');
        }),
      },
      {
        label: 'Rise. The Jews will do as they please',
        tooltip: 'The quarter is ours and the rising is ours alone: +2,500 manpower and "The '
          + 'Quarter Rises" (+8% manpower, 60 months), the priesthood +25. Galilee is not asked '
          + 'and notices (−25), the empire answers a Samaritan rising (−40) — and the punishment '
          + 'that comes is aimed at one community rather than shared between two.',
        effects: guard('ev529_praetorium:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { manpower: 2500 });
          h.addTagModifier(ctx, 'SAM', {
            id: 'the_quarter_rises', name: 'The Quarter Rises', months: 60,
            effects: { manpowerMult: 1.08 },
          });
          h.addProvinceModifier(ctx, 'Caesarea Maritima', {
            id: 'the_rising_of_556', name: 'The Rising of 556', months: 60,
            effects: { unrest: 1.5 },
          });
          h.factionShift(ctx, 'SAM', 'priesthood', 25);
          h.factionShift(ctx, 'SAM', 'crowned', 15);
          h.doctrine(ctx, 'zeal', 1);
          nudge(ctx, 'JUD', -25);
          nudge(ctx, 'BYZ', -40);
          h.setFlag(ctx, 'caesareaAnswered', true);
          h.setFlag(ctx, 'roseAlone', true);
          h.chronicle(ctx, 'war', 'The Samaritan quarter of Caesarea rises alone. The Jews of the '
            + 'city are in their houses by evening, and the distinction is entirely lost on the '
            + 'troops sent to restore order.');
        }),
      },
      {
        label: 'Keep the quarter shut. This is a riot with a governor\'s body in it',
        tooltip: 'The elders hold the quarter and say so to the dux in writing: +1 stability, +150 '
          + 'talents of a season that is not requisitioned, imperial opinion +35, and "The Quarter '
          + 'Held" (−1 unrest everywhere, permanent). The quietists +35 and the crowned party −30, '
          + 'and −12 legitimacy: two communities went into the street and one of them watched.',
        effects: guard('ev529_praetorium:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { stability: 1, treasury: 150, legitimacy: -12 });
          h.addTagModifier(ctx, 'SAM', {
            id: 'the_quarter_held', name: 'The Quarter Held', months: -1,
            effects: { unrestAll: -1 },
          });
          h.factionShift(ctx, 'SAM', 'quietists', 35);
          h.factionShift(ctx, 'SAM', 'council', 20);
          h.factionShift(ctx, 'SAM', 'crowned', -30);
          nudge(ctx, 'BYZ', 35);
          nudge(ctx, 'JUD', -35);
          h.setFlag(ctx, 'caesareaAnswered', true);
          h.setFlag(ctx, 'quarterKeptShut', true);
          h.chronicle(ctx, 'era', 'The elders keep the Samaritan quarter of Caesarea indoors while '
            + 'the city burns, and write to the dux to say they have done it. The letter is '
            + 'acknowledged, which is more than the rising gets.');
        }),
      },
    ],
  },

  // ── 6 ──────────────────────────────────────────────────────────────────────
  // The fork with no date on it, because that is what it is.
  {
    id: 'ev529_the_taheb',
    title: 'The Taheb',
    desc: 'Deuteronomy 18:18: a prophet like unto me, from among their brethren. Every people '
      + 'in this region has a version of the sentence and this one\'s is the sharpest, because '
      + 'the whole of its history since Eli carried the ark to Shiloh is understood as the '
      + 'Fanuta — the turning-away, the age in which the divine favour is withdrawn and the '
      + 'true sanctuary is hidden — and the Taheb is the man who ends it. He is not a king. He '
      + 'restores the tabernacle, brings the vessels up out of the mountain, and the Rahuta '
      + 'begins, and nothing that any empire has legislated survives contact with that.\n\n'
      + 'There is a man in the villages the elders are being asked about. There have been '
      + 'others: one took a crowd up Gerizim under the prefect Pilate to show them the vessels, '
      + 'and Pilate met them on the slope with cavalry and killed enough of them that Rome '
      + 'recalled him for it, and the community counted its own dead and got nothing. The High '
      + 'Priest will not certify this, and says so first and plainly: the office is real, the '
      + 'age is not the age, and a claim that cannot be tested is a claim the community cannot '
      + 'survive being wrong about twice.',
    forTag: 'SAM',
    major: true,
    minYear: 542,
    maxYear: 600,
    trigger: safeTrigger('ev529_taheb', (ctx) => afterTheRising(ctx)
      && !flag(ctx, 'tahebAnswered')
      && flag(ctx, 'phylarchAnswered')
      && dateGE(ctx, 542, 1)),
    aiOption: 1,
    historical: 'The Taheb is the Samaritan restorer of Deut. 18:18, who ends the Fanuta and '
      + 'brings the hidden vessels of the tabernacle out of Gerizim. Josephus, Antiquities '
      + 'XVIII.85–87, records a claimant under Pilate and the cavalry on the slope; the '
      + 'community\'s own chronicles are cautious about all of them.',
    options: [
      {
        label: 'He is here. The Fanuta is over',
        tooltip: 'The restorer is proclaimed on the mountain: +30 legitimacy, +3 zeal, "The Rahuta" '
          + '(+15% morale, +12% manpower, −1 unrest everywhere, permanent) — a people that believes '
          + 'the age has turned does not calculate. The crowned party +30 and the quietists −40; '
          + 'the priesthood will not certify it (−30); and the empire is no longer answering a '
          + 'revolt but a prophecy (−45 opinion), which it has answered before.',
        effects: guard('ev529_taheb:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { legitimacy: 30, stability: 1 });
          h.addTagModifier(ctx, 'SAM', {
            id: 'the_rahuta', name: 'The Rahuta', months: -1,
            effects: { moraleMult: 1.15, manpowerMult: 1.12, unrestAll: -1 },
          });
          h.factionShift(ctx, 'SAM', 'crowned', 30);
          h.factionShift(ctx, 'SAM', 'priesthood', -30);
          h.factionShift(ctx, 'SAM', 'quietists', -40);
          h.doctrine(ctx, 'zeal', 3);
          h.doctrine(ctx, 'authority', 2);
          nudge(ctx, 'BYZ', -45);
          h.setFlag(ctx, 'tahebAnswered', true);
          h.setFlag(ctx, 'tahebProclaimed', true);
          h.notify(ctx, {
            title: 'The Taheb', type: 'good', provName: 'Neapolis',
            text: 'The restorer is proclaimed on Gerizim and the villages empty toward the '
              + 'mountain. Nobody in them is doing arithmetic this week.',
          });
          h.chronicle(ctx, 'era', 'The Taheb is proclaimed on Gerizim and the age of the '
            + 'turning-away is declared closed. The High Priest is present and does not put his '
            + 'hand on him, and both facts are recorded by the same scribe.');
        }),
      },
      {
        label: 'The age is not the age. The office stays open',
        tooltip: 'The claim is heard and not certified, which is the priesthood\'s oldest function: '
          + '+1 stability, "The Office Kept Open" (+0.35 legitimacy a month and −0.5 unrest '
          + 'everywhere, permanent). The priesthood +35 and the quietists +15, the crowned party '
          + '−20. An expectation nobody has spent is an expectation still available.',
        effects: guard('ev529_taheb:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { stability: 1 });
          h.addTagModifier(ctx, 'SAM', {
            id: 'the_office_kept_open', name: 'The Office Kept Open', months: -1,
            effects: { legitimacyAdd: 0.35, unrestAll: -0.5 },
          });
          h.factionShift(ctx, 'SAM', 'priesthood', 35);
          h.factionShift(ctx, 'SAM', 'quietists', 15);
          h.factionShift(ctx, 'SAM', 'crowned', -20);
          h.setFlag(ctx, 'tahebAnswered', true);
          h.setFlag(ctx, 'tahebAwaited', true);
          h.chronicle(ctx, 'era', 'The claim is heard on the mountain and not certified. The High '
            + 'Priest tells the man he may be right and that the community cannot afford to find '
            + 'out, and the sentence is remembered longer than the claimant.');
        }),
      },
      {
        label: 'The restoration is the calendar, and we are keeping it',
        tooltip: 'The Council of Seven\'s answer: the tabernacle is restored by a people that is '
          + 'still here to restore it, and the office is a description of the community rather '
          + 'than a vacancy for a man. +10 legitimacy, "The Keeping Is the Restoration" (+10% '
          + 'income, +0.25 legitimacy a month, permanent), the Seven +35 and the quietists +20, '
          + 'the crowned party −25, and the realm turns conciliar.',
        effects: guard('ev529_taheb:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { legitimacy: 10 });
          h.addTagModifier(ctx, 'SAM', {
            id: 'the_keeping_is_the_restoration', name: 'The Keeping Is the Restoration', months: -1,
            effects: { incomeMult: 1.1, legitimacyAdd: 0.25 },
          });
          h.factionShift(ctx, 'SAM', 'council', 35);
          h.factionShift(ctx, 'SAM', 'quietists', 20);
          h.factionShift(ctx, 'SAM', 'crowned', -25);
          h.doctrine(ctx, 'authority', -2);
          h.setFlag(ctx, 'tahebAnswered', true);
          h.setFlag(ctx, 'tahebIsThePeople', true);
          h.chronicle(ctx, 'era', 'The Seven rule that the restoration is the calendar kept and the '
            + 'scroll copied, and that a people which is still here in the morning has done the '
            + 'thing the prophecy describes. It is not a popular ruling and it is not overturned.');
        }),
      },
    ],
  },

  // ── 7 ──────────────────────────────────────────────────────────────────────
  // The last dated beat the sources give this community, and the terminal of
  // the crowned road and of both roads out of Caesarea.
  {
    id: 'ev529_the_last_rising',
    title: 'The Last Rising',
    worldLabel: 'The revolt under Justin II',
    desc: 'Justinian has been dead seven years and his nephew has the throne and none of the '
      + 'luck. The Persian truce has lapsed, Italy is a running sore, and in Palaestina the '
      + 'community rises again — the fourth time in ninety years, and the last time the sources '
      + 'will bother to record.\n\n'
      + 'The men going out this spring are the grandsons of the men who went out for the king '
      + 'at Neapolis. They know what happened to them; the villages have kept the count, and '
      + 'the count is the only document in this chapter that everybody agrees about. What comes '
      + 'back from Constantinople is a new constitution against the Samaritans, which is what '
      + 'came back the last three times, and after this one there is no fifth rising in any '
      + 'chronicle on either side — not because the grievance was settled, but because there '
      + 'were not enough people left to raise one.',
    forTag: 'SAM',
    world: true,
    major: true,
    date: { y: 572, m: 5 },
    when: (ctx) => afterTheRising(ctx),
    aiOption: 1,
    historical: 'A Samaritan revolt under Justin II in 572/3 is the last the sources record, and '
      + 'the imperial answer was another constitution rather than a settlement. The community\'s '
      + 'own chronicles are as ambivalent about it as about the risings before it.',
    options: [
      {
        label: 'Once more. The count is not an argument for dying quietly',
        tooltip: '+4,000 manpower and "The Fourth Rising" (+12% morale, +10% manpower, 60 months), '
          + 'the crowned party +30 and the priesthood +15, +2 zeal. The empire answers with a new '
          + 'constitution (−50 opinion, +1.5 unrest in the hill country for 240 months), and the '
          + 'villages that go out this spring are counted afterwards.',
        effects: guard('ev529_last:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { manpower: 4000 });
          h.addTagModifier(ctx, 'SAM', {
            id: 'the_fourth_rising', name: 'The Fourth Rising', months: 60,
            effects: { moraleMult: 1.12, manpowerMult: 1.1 },
          });
          stir(ctx, HILL_COUNTRY, {
            id: 'the_new_constitution', name: 'The New Constitution', months: 240,
            effects: { unrest: 1.5 },
          });
          h.factionShift(ctx, 'SAM', 'crowned', 30);
          h.factionShift(ctx, 'SAM', 'priesthood', 15);
          h.factionShift(ctx, 'SAM', 'quietists', -30);
          h.doctrine(ctx, 'zeal', 2);
          nudge(ctx, 'BYZ', -50);
          h.setFlag(ctx, 'lastRisingFought', true);
          h.chronicle(ctx, 'war', 'The community rises for the fourth time in ninety years. The '
            + 'answer from Constantinople is another constitution, filed under the same heading '
            + 'as the first one.');
        }),
      },
      {
        label: 'Not this time. Somebody has to be here in a hundred years',
        tooltip: 'The elders refuse the rising and say why, in public, to men who have every '
          + 'reason to go: −15 legitimacy and the crowned party −35, the quietists +35 and the '
          + 'Seven +25. +2 stability and "The Generation That Stayed" (+12% income, −1 unrest '
          + 'everywhere, permanent), imperial opinion +30.',
        effects: guard('ev529_last:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { stability: 2, legitimacy: -15 });
          h.addTagModifier(ctx, 'SAM', {
            id: 'the_generation_that_stayed', name: 'The Generation That Stayed', months: -1,
            effects: { incomeMult: 1.12, unrestAll: -1 },
          });
          h.factionShift(ctx, 'SAM', 'quietists', 35);
          h.factionShift(ctx, 'SAM', 'council', 25);
          h.factionShift(ctx, 'SAM', 'crowned', -35);
          nudge(ctx, 'BYZ', 30);
          h.setFlag(ctx, 'lastRisingDeclined', true);
          h.chronicle(ctx, 'era', 'The elders refuse the fourth rising to the faces of the men who '
            + 'wanted it. Nobody in the villages calls it courage for about forty years, and then '
            + 'a good many of them do.');
        }),
      },
      {
        label: 'Send the elders to Constantinople instead',
        tooltip: 'The community argues its own case at the capital for the first time, having '
          + 'watched a bishop do it and get results: −140 talents and −40 influence points, +20 '
          + 'legitimacy, imperial opinion +45, and "Heard at the Capital" (−1 unrest everywhere '
          + 'and +8% income, permanent). The Seven +30, the crowned party −20.',
        effects: guard('ev529_last:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -140, infl: -40, legitimacy: 20 });
          h.addTagModifier(ctx, 'SAM', {
            id: 'heard_at_the_capital', name: 'Heard at the Capital', months: -1,
            effects: { unrestAll: -1, incomeMult: 1.08 },
          });
          h.factionShift(ctx, 'SAM', 'council', 30);
          h.factionShift(ctx, 'SAM', 'quietists', 20);
          h.factionShift(ctx, 'SAM', 'crowned', -20);
          nudge(ctx, 'BYZ', 45);
          h.setFlag(ctx, 'eldersAtTheCapital', true);
          h.chronicle(ctx, 'diplomacy', 'The elders of the community argue their own case at '
            + 'Constantinople, twenty-one years after a bishop of Caesarea argued it for them. '
            + 'They are heard, which is not the same as being answered.');
        }),
      },
    ],
  },

  // ── 8 ──────────────────────────────────────────────────────────────────────
  // The road with no king on it gets its own ending, because a community that
  // refused the diadem in 529 reaches this year with a different thing to
  // decide than one that crowned a man and buried him.
  {
    id: 'ev529_the_office_they_never_filled',
    title: 'The Office They Never Filled',
    desc: 'Forty-four years since the diadem was declined in the town below the mountain, and '
      + 'the constitution that has just come down from the capital is the fourth of its kind '
      + 'and reads like the first three, with one difference that only this community notices: '
      + 'it names the people and it cannot name the head. There is no king to attaint, no court '
      + 'to dissolve, no man whose death ends the matter and whose crown goes west in a box '
      + 'with an inventory number.\n\n'
      + 'What the empire does instead is exactly what it did anyway — the statutes, the '
      + 'assessors, the schedule — and the elders have had four decades to decide whether that '
      + 'is the argument for the decision or against it. The men who wanted a crown in 529 are '
      + 'dead. Their sons are in the room, and they point out, not unreasonably, that the '
      + 'thing which cannot be beheaded also cannot be recognised, treated with, or given '
      + 'terms, and that the community has spent forty-four years being administered rather '
      + 'than negotiated with.',
    forTag: 'SAM',
    major: true,
    minYear: 573,
    maxYear: 605,
    trigger: safeTrigger('ev529_no_king', (ctx) => afterTheRising(ctx)
      && flag(ctx, 'crownRefused')
      && !flag(ctx, 'headAnswered')
      && dateGE(ctx, 573, 3)),
    aiOption: 0,
    historical: 'The risings after 529 produced no second king, and the imperial constitutions '
      + 'that answered them legislate against a people rather than against a court. Nothing in '
      + 'the Samaritan chronicles suggests the community ever regretted it; nothing suggests it '
      + 'was ever offered terms either.',
    options: [
      {
        label: 'The office stays empty. It is the only thing they cannot take',
        tooltip: 'Four decades of the same answer, given once more and now on the record: +20 '
          + 'legitimacy, +1 stability, "No Head to Take" is made permanent and doubled (−1 unrest '
          + 'everywhere, +8% manpower). The priesthood +30 and the Council of Seven +25, the '
          + 'crowned party −30.',
        effects: guard('ev529_no_king:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { legitimacy: 20, stability: 1 });
          h.addTagModifier(ctx, 'SAM', {
            id: 'no_head_to_take', name: 'No Head to Take', months: -1,
            effects: { unrestAll: -1, manpowerMult: 1.08 },
          });
          h.factionShift(ctx, 'SAM', 'priesthood', 30);
          h.factionShift(ctx, 'SAM', 'council', 25);
          h.factionShift(ctx, 'SAM', 'crowned', -30);
          h.doctrine(ctx, 'authority', -2);
          h.setFlag(ctx, 'headAnswered', true);
          h.setFlag(ctx, 'noHeadStill', true);
          h.chronicle(ctx, 'era', 'The crown is declined for the second time, forty-four years '
            + 'after the first, by men who were children when it was declined for them.');
        }),
      },
      {
        label: 'Crown one now, while there is a people to crown him over',
        tooltip: 'The argument the sons make, and it is a real one: a thing with no head is '
          + 'administered and never treated with. +15 legitimacy and "A Head at Last" (+10% morale, '
          + '+0.3 legitimacy a month, permanent), the crowned party +40 — and the priesthood will '
          + 'not anoint him (−35), the quietists −20, and the empire acquires the one thing it has '
          + 'been missing since 531, which is a man to send for (−35 opinion).',
        effects: guard('ev529_no_king:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { legitimacy: 15 });
          h.removeModifier(ctx, 'SAM', 'no_head_to_take');
          h.addTagModifier(ctx, 'SAM', {
            id: 'a_head_at_last', name: 'A Head at Last', months: -1,
            effects: { moraleMult: 1.1, legitimacyAdd: 0.3 },
          });
          h.factionShift(ctx, 'SAM', 'crowned', 40);
          h.factionShift(ctx, 'SAM', 'priesthood', -35);
          h.factionShift(ctx, 'SAM', 'quietists', -20);
          h.doctrine(ctx, 'authority', 2);
          nudge(ctx, 'BYZ', -35);
          h.setFlag(ctx, 'headAnswered', true);
          h.setFlag(ctx, 'crownedAtLast', true);
          h.chronicle(ctx, 'ruler', 'A king is crowned in the hill country forty-four years after '
            + 'the first one was declined. The High Priest attends and keeps his hands at his '
            + 'sides, exactly as his predecessor did.');
        }),
      },
    ],
  },

  // ── 9 ──────────────────────────────────────────────────────────────────────
  // The chapter's last year, and the question every road in it was asking.
  {
    id: 'ev529_what_the_villages_kept',
    title: 'What the Villages Kept',
    worldLabel: 'The Persians on the coast road',
    desc: 'Eighty-five years after the rescript was read out in Caesarea, a Persian army is on '
      + 'the coast road and the empire that wrote the rescript cannot stop it. Every province '
      + 'from Antioch south is deciding this spring what it is going to be when the column '
      + 'arrives, and for once the hill country is being asked rather than told.\n\n'
      + 'What is left to do the asking is the actual subject of this chapter. Not a border and '
      + 'not a throne: villages, a calendar, a priestly line that can still name its own '
      + 'succession, and a scroll. In the history that happened the community went out to meet '
      + 'the Persians, on the perfectly sound reasoning that no arrangement could be worse than '
      + 'the one that had been legislated in 529, and discovered over the following twenty-five '
      + 'years that this was not a law of nature. The next chapter opens on the far side of '
      + 'that decision, in a city sixty miles south, and it is somebody else\'s chapter.',
    forTag: 'SAM',
    world: true,
    major: true,
    date: { y: 614, m: 3 },
    when: (ctx) => keepers(ctx) > 0,
    aiOption: 0,
    historical: 'The Samaritans who were still in the hill country in 614 sided with the Persian '
      + 'invasion, as the Jews of Palaestina largely did; the arrangement lasted as long as '
      + 'Persia needed it and no longer.',
    options: [
      {
        label: 'Open the road. Nothing they bring can be worse than the statute',
        tooltip: 'The community goes out to meet the Persians: +25 legitimacy, +2 stability, "The '
          + 'Road Opened" (+12% income and +10% manpower, permanent), Persia +70 and the empire −70. '
          + 'It is the historical answer and it is a bet on a court eight hundred miles away.',
        effects: guard('ev529_614:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { legitimacy: 25, stability: 2 });
          h.addTagModifier(ctx, 'SAM', {
            id: 'the_road_opened', name: 'The Road Opened', months: -1,
            effects: { incomeMult: 1.12, manpowerMult: 1.1 },
          });
          h.doctrine(ctx, 'alignment', -2);
          nudge(ctx, 'SAS', 70);
          nudge(ctx, 'BYZ', -70);
          h.setFlag(ctx, 'keepersEndured', true);
          h.setFlag(ctx, 'wentOutToPersia', true);
          h.chronicle(ctx, 'era', 'The hill country opens the road to the Persians in the spring of '
            + '614, eighty-five years after a notary read the statute out in Caesarea. The '
            + 'calendar has been kept every one of those years, which is the whole of what was '
            + 'being defended.');
        }),
      },
      {
        label: 'Eighty-five years of empires. Let this one pass as well',
        tooltip: 'The villages are shut and the column goes by: +2 stability, +15 legitimacy and '
          + '"What the Villages Kept" (−1 unrest everywhere and +0.3 legitimacy a month, '
          + 'permanent). Neither court has anything to hold against this community and neither has '
          + 'any reason to protect it, which is the arrangement it has had since Alexander.',
        effects: guard('ev529_614:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { stability: 2, legitimacy: 15 });
          h.addTagModifier(ctx, 'SAM', {
            id: 'what_the_villages_kept', name: 'What the Villages Kept', months: -1,
            effects: { unrestAll: -1, legitimacyAdd: 0.3 },
          });
          h.factionShift(ctx, 'SAM', 'quietists', 25);
          h.factionShift(ctx, 'SAM', 'priesthood', 20);
          h.setFlag(ctx, 'keepersEndured', true);
          h.setFlag(ctx, 'letThePersiansPass', true);
          h.chronicle(ctx, 'era', 'The Persian column goes south past a hill country that has shut '
            + 'its doors and gone on with the year. Two empires will change hands over these '
            + 'villages in the next thirty years and the calendar will not miss a month.');
        }),
      },
    ],
  },

];
