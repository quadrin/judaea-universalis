// Judaea Universalis — the thirties and the fifties: the road to 66 CE
// (SPEC §274). Content package. Zero imports; every effect runs through
// ctx.helpers at runtime. Concatenated onto EVENTS_40 by the era registry.
//
// WHY THIS FILE EXISTS. SPEC §124 built the bridge from 26 CE to 66 CE and
// then, quite honestly, spanned it with four piers: the procurators in 26, the
// statue in 40, the charter in 41, and the spring of 66. Counted over the
// playable span rather than over the generation horizon, the chapter's
// thirties carried one dated card and its fifties carried none — which is to
// say that a player who takes the 40 BCE chapter past Actium and past Herod
// arrives at the best-documented decade in the whole period and is handed
// eighteen years of silence between the Passover crush of 48 and the morning
// the sacrifices stopped.
//
// That silence is the opposite of what the sources look like. Josephus is
// writing month by month through the fifties because he was alive for the end
// of them and because the men who made the revolt were made in them. The
// fifties are where the dagger-men start working the festival crowds, where a
// prophet marches thirty thousand people to the Mount of Olives and announces
// that the walls will fall down, where a procurator marries a king's sister,
// and where Caesarea's Jews and Caesarea's Syrians take a question about
// citizenship to Nero and lose it. None of that was in the game.
//
// WHAT IT IS. Twenty-one dated cards across 30–63 CE, on both of the bridge's
// roads. §119's markers decide which: `judaeaProvincia` opens the province
// cards, `notAProvince`/`notReduced` with a crown still standing opens the
// kingdom ones, and the cards that are about the world rather than about the
// government — Sejanus falling, the synagogues of Alexandria, Antipas denounced
// by his own nephew — are open to both because they happened to everybody.
//
// The province road and the kingdom road are not the same story told twice.
// The province has a prefect, a Syrian legate two weeks away and no instrument
// but the crowd; a kingdom has a treasury, an army and an ambassador, and
// therefore gets asked harder questions. The Samaritan at Gerizim is a public
// order problem for Pilate and a question about a neighbouring people's holy
// mountain for a king. The pilgrim murdered at Ginae is a case that goes to
// Rome under a procurator and a war a king can simply fight.
//
// Sources: Josephus, Antiquitates XVIII–XX and Bellum II, which run in
// parallel for most of this and disagree usefully about Cumanus; Philo,
// In Flaccum and Legatio ad Gaium, who was in Alexandria for the pogrom and in
// Rome for the embassy; Tacitus, Annales XII and Historiae V for Felix and the
// procuratorial temper; and the Pilate inscription from the theatre at
// Caesarea, which is the only thing in this file anybody can go and look at.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_40bce_road] ' + key, e || '');
}

// The letters this court answers to NOW (SPEC §135) — the bridge's own rule,
// repeated here because a content package may not import one.
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

// Opinion is not on the helper surface (SPEC §274): `ctx.helpers` carries no
// addOpinion, so a package that wants to move a court's regard writes the
// ledger itself, the way the Iron Age packages do. Same shape, same clamp.
function opinion(ctx, from, of, delta) {
  try {
    const t = ctx.game.tags && ctx.game.tags[from];
    if (!t) return;
    if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
    t.opinion[of] = Math.max(-200, Math.min(200, (t.opinion[of] || 0) + delta));
  } catch (e) { warnOnce('opinion', e); }
}

function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[who(ctx, tag)];
  return !!(t && t.alive !== false);
}

function flag(ctx, key) {
  return !!(ctx.game.flags && ctx.game.flags[key]);
}

function crown(ctx) {
  for (const t of ['ATG', 'HER', 'HAS', 'JUD']) {
    const held = who(ctx, t);
    if (alive(ctx, held)) return held;
  }
  return null;
}

function isProvince(ctx) {
  return flag(ctx, 'judaeaProvincia');
}

function isKingdom(ctx) {
  return !flag(ctx, 'judaeaProvincia')
    && (flag(ctx, 'notAProvince') || flag(ctx, 'notReduced'))
    && !!crown(ctx);
}

// The cells a grievance in Jerusalem is actually felt in — the bridge's list,
// because the two files are describing the same country.
const JEWISH_HEART = ['Jerusalem', 'Jericho', 'Hebron', 'Lydda', 'Emmaus',
  'Sepphoris', 'Tiberias'];
const COAST = ['Caesarea Maritima', 'Joppa', 'Ptolemais'];
const SAMARITAN = ['Sebaste', 'Neapolis'];

function stir(ctx, names, mod) {
  let touched = 0;
  for (const n of names) {
    const p = ctx.prov && ctx.prov(n);
    if (!p || p.impassable) continue;
    ctx.helpers.addProvinceModifier(ctx, n, mod);
    touched++;
  }
  return touched;
}

// A modifier on whoever is wearing the crown in this world — the player's own
// court on the kingdom road, and on the province road the court that is left
// after Rome has taken the government.
function mine(ctx, id, name, effects, months) {
  const me = crown(ctx) || ctx.game.playerTag;
  if (!me) return;
  ctx.helpers.addTagModifier(ctx, me, {
    id, name, months: Number.isFinite(months) ? months : -1, effects,
  });
}

function pay(ctx, delta) {
  const me = crown(ctx) || ctx.game.playerTag;
  if (me) ctx.helpers.adjust(ctx, me, delta);
}

// A dated card with two answers, the recorded one first. `road` is 'p', 'k' or
// null: the province, the kingdom, or the years that happened to both.
function C(road, id, title, worldLabel, y, m, desc, historical, a, b) {
  const card = {
    id, title, worldLabel, desc, historical,
    forTag: 'both',
    date: { y, m },
    world: true,
    aiOption: 0,
    options: [
      { label: a.label, tooltip: a.tooltip, effects: guard(id + ':0', a.fx) },
      { label: b.label, tooltip: b.tooltip, effects: guard(id + ':1', b.fx) },
    ],
  };
  if (road === 'p') {
    card.decider = 'ROM';
    card.when = safeTrigger(id + ':when', (ctx) => isProvince(ctx));
  } else if (road === 'k') {
    card.decider = (ctx) => crown(ctx) || 'HER';
    card.when = safeTrigger(id + ':when', (ctx) => isKingdom(ctx));
  } else {
    card.decider = (ctx) => crown(ctx) || ctx.game.playerTag || 'ROM';
  }
  return card;
}

export const EVENTS_40_ROAD = [

  // ═══ THE THIRTIES ════════════════════════════════════════════════════════

  C('p', 'ev40r_p_the_aqueduct', 'Temple Money Buys the City Its Water',
    'The prefect spends the korbanas on an aqueduct', 30, 5,
    'The prefect has taken money out of the korbanas — the Temple\'s dedicated '
    + 'fund — and is building an aqueduct with it. He has done the arithmetic and it '
    + 'is good arithmetic: the city is short of water every summer, the fund is '
    + 'enormous, and water for Jerusalem is plainly a pious use of money given to '
    + 'God for Jerusalem.\n\nThe crowd does not agree and has said so, at length, in '
    + 'the open. What the prefect does next is send soldiers into the crowd in '
    + 'civilian dress with clubs under their cloaks, and on a signal they begin '
    + 'beating people, including a good many who had come to watch. The water '
    + 'arrives. So does the memory.',
    'Pilate funded an aqueduct from the Temple treasury and broke up the protest with soldiers in plain clothes carrying clubs (Josephus, BJ 2.175-177; AJ 18.60-62).',
    { label: 'Let the water be built and let the beating be remembered',
      tooltip: 'The aqueduct is finished: +6% income permanently in the Jewish heartland, and "Clubs Under the Cloaks" (+1.5 unrest there, −10 legitimacy for the government) permanently. Judaea gets its water and learns what the government does to a crowd.',
      fx: (ctx) => { const h = ctx.helpers;
        stir(ctx, JEWISH_HEART, { id: 'road_aqueduct_water', name: 'The Aqueduct', months: -1, effects: { taxMult: 1.06 } });
        stir(ctx, JEWISH_HEART, { id: 'road_clubs_cloaks', name: 'Clubs Under the Cloaks', months: -1, effects: { unrest: 1.5 } });
        pay(ctx, { legitimacy: -10 });
        h.chronicle(ctx, 'era', 'The aqueduct is built with the Temple\'s money and the protest against it is broken by soldiers in plain clothes; the city has water, and a story.'); } },
    { label: 'Buy the fund out — let the court pay for the water itself',
      tooltip: '−140 talents from the treasury. The korbanas is left alone: "The Water Nobody Argued About" permanently (+6% income and −0.8 unrest in the Jewish heartland), and +12 legitimacy. Expensive, and it removes one of the seven or eight things 66 was made of.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: -140, legitimacy: 12 });
        stir(ctx, JEWISH_HEART, { id: 'road_water_unargued', name: 'The Water Nobody Argued About', months: -1, effects: { taxMult: 1.06, unrest: -0.8 } });
        h.chronicle(ctx, 'era', 'The aqueduct is paid for out of the government\'s own purse and the Temple fund is not touched; it costs a great deal and nobody ever riots about it.'); } }),

  C('k', 'ev40r_k_the_water_of_the_city', 'The King Is Short of Water',
    'A kingdom faces the same summer and the same empty fund', 30, 5,
    'Jerusalem runs short every summer and has done since there was a Jerusalem. '
    + 'The engineers want to bring water forty miles from the southern springs and '
    + 'the estimate would empty the treasury twice.\n\nThere is a fund that would '
    + 'cover it, and it is in the Temple, and it is not the crown\'s. A king may ask '
    + 'the priesthood for it, which means a negotiation in which the priesthood '
    + 'discovers it can refuse the king; or he may raise it from the country, which '
    + 'means a levy in a year that does not want one; or he may do neither and let '
    + 'the city be thirsty for another generation, which is what every previous '
    + 'king did.',
    'The aqueduct was built by Pilate with Temple money and the protest was clubbed down. A king had instruments a prefect did not, and every one of them had a price.',
    { label: 'Ask the priesthood, and let them see the crown ask',
      tooltip: 'The fund is opened by agreement: Priesthood +20 approval, +6% income in the Jewish heartland permanently — and "The Crown Asked" (−0.06 legitimacy a month) permanently, because everybody now knows the answer could have been no.',
      fx: (ctx) => { const h = ctx.helpers; const me = crown(ctx); if (!me) return;
        try { h.factionShift(ctx, me, 'priesthood', 20); } catch (e) {}
        stir(ctx, JEWISH_HEART, { id: 'road_aqueduct_water', name: 'The Aqueduct', months: -1, effects: { taxMult: 1.06 } });
        mine(ctx, 'road_the_crown_asked', 'The Crown Asked', { legitimacyAdd: -0.06 }, -1);
        h.chronicle(ctx, 'era', 'The king asks the priesthood for the water money and is given it, and everybody in the court notices that he had to ask.'); } },
    { label: 'Levy it from the country and build it as a royal work',
      tooltip: '−90 talents and "The Water Levy" (+1.2 unrest everywhere) for six years — then +6% income in the Jewish heartland permanently, +15 legitimacy, and the priesthood never learns it could have said no.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: -90, legitimacy: 15 });
        mine(ctx, 'road_water_levy', 'The Water Levy', { unrestAll: 1.2 }, 72);
        stir(ctx, JEWISH_HEART, { id: 'road_aqueduct_water', name: 'The Aqueduct', months: -1, effects: { taxMult: 1.06 } });
        h.chronicle(ctx, 'era', 'The aqueduct is raised as a royal work on a royal levy; the country pays for its own water and the Temple fund is never mentioned.'); } }),

  C(null, 'ev40r_the_prefect_of_the_guard', 'The Second Man in Rome Is Strangled',
    'Sejanus falls and the emperor writes to the provinces', 31, 10,
    'The emperor has been on Capri for five years and the empire has been run by the '
    + 'prefect of his guard. This morning a long letter was read to the Senate which '
    + 'began by praising that prefect and ended, after some minutes, by ordering his '
    + 'arrest; he was strangled the same day and his body was in the Gemonian stairs '
    + 'by evening.\n\nWhat reaches the east a month later is not the gossip but the '
    + 'circular that follows it: the emperor has written to the governors that the '
    + 'Jews of the provinces are to be left in the possession of their customs, and '
    + 'that measures taken against them in the last years were taken without his '
    + 'knowledge. Nobody in Judaea believes the second half. Everybody intends to '
    + 'use the first.',
    'Sejanus was executed in October 31. Philo (Legatio 159-161) says Tiberius afterwards instructed governors to leave Jewish communities undisturbed and blamed Sejanus for the earlier measures.',
    { label: 'Send an embassy to Capri while the door is open',
      tooltip: '−40 talents and eight months of diplomacy: Rome +18 opinion, +20 legitimacy, "The Rescript of Tiberius" (−0.7 unrest in the Jewish heartland) for twenty years. The best hearing anybody will get from this emperor.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: -40, legitimacy: 20 });
        if (alive(ctx, 'ROM')) { const me = crown(ctx) || ctx.game.playerTag; if (me) opinion(ctx, 'ROM', me, 18); }
        stir(ctx, JEWISH_HEART, { id: 'road_rescript', name: 'The Rescript of Tiberius', months: 240, effects: { unrest: -0.7 } });
        h.chronicle(ctx, 'era', 'An embassy reaches Capri in the months after Sejanus\' fall and comes home with a rescript confirming the customs of the Jews.'); } },
    { label: 'Let Rome settle Rome\'s business and say nothing',
      tooltip: 'No cost and no gain: +1 stability for a government that did not go begging, and Rome\'s memory of this year belongs to somebody else.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { stability: 1 });
        h.chronicle(ctx, 'era', 'The year the second man in Rome was strangled passes without an embassy from Judaea; the rescript is sent to the governors and nobody here asked for it.'); } }),

  C('p', 'ev40r_p_the_gilded_shields', 'The Shields With the Name On Them',
    'Gilded shields are hung in the palace at Jerusalem', 33, 3,
    'The prefect has hung gilded shields in the old palace in Jerusalem. They carry '
    + 'no image — he is careful, and he knows the rule about images — only the '
    + 'dedicator\'s name and the emperor\'s. It is, he would say, the least '
    + 'provocative honour available to a Roman governor.\n\nThe objection is that '
    + 'the palace is inside the city and the name on the shield is a name with '
    + '`divi filius` in it, and that a thing which is not quite an image hung in a '
    + 'place which is not quite the Temple is precisely the kind of thing that '
    + 'becomes a precedent. Four of Herod\'s sons have put their names to a petition '
    + 'and are sending it past the prefect straight to Capri.',
    'Pilate set up gilded shields in Herod\'s palace; the Herodian princes petitioned Tiberius, who ordered them transferred to the temple of Augustus at Caesarea (Philo, Legatio 299-305).',
    { label: 'Let the petition go and let the emperor decide',
      tooltip: 'The shields are ordered down to Caesarea: +14 legitimacy, "The Petition Answered" (−0.6 unrest in the Jewish heartland) for fifteen years, and Rome −8 opinion at a government that goes over the governor\'s head. It is also the lesson that going over his head works.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { legitimacy: 14 });
        stir(ctx, JEWISH_HEART, { id: 'road_petition_answered', name: 'The Petition Answered', months: 180, effects: { unrest: -0.6 } });
        if (alive(ctx, 'ROM')) { const me = crown(ctx) || ctx.game.playerTag; if (me) opinion(ctx, 'ROM', me, -8); }
        h.setFlag(ctx, 'shieldsRemoved', true);
        h.chronicle(ctx, 'era', 'Tiberius orders the shields taken out of Jerusalem and hung at Caesarea; the province has learned that the governor can be gone over.'); } },
    { label: 'Leave them hanging — they carry no image and the rule is the rule',
      tooltip: 'The letter of the law is kept and the shields stay: Rome +10 opinion, +1 stability — and "Not Quite an Image" (+1.2 unrest in the Jewish heartland) permanently, which is the precedent the statue of 40 will be argued from.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { stability: 1 });
        if (alive(ctx, 'ROM')) { const me = crown(ctx) || ctx.game.playerTag; if (me) opinion(ctx, 'ROM', me, 10); }
        stir(ctx, JEWISH_HEART, { id: 'road_not_quite_an_image', name: 'Not Quite an Image', months: -1, effects: { unrest: 1.2 } });
        h.setFlag(ctx, 'shieldsKept', true);
        h.chronicle(ctx, 'era', 'The shields stay in the palace on the argument that they carry no image; the argument is remembered, and used again about a statue.'); } }),

  C('p', 'ev40r_p_the_vessels_of_moses', 'The Man Who Knew Where the Vessels Were',
    'A crowd climbs Gerizim and the cavalry is waiting', 36, 3,
    'A Samaritan has told his people that he can show them the sacred vessels Moses '
    + 'buried on Mount Gerizim, and they have believed him in numbers. They are '
    + 'assembling at a village at the foot of the mountain, many of them armed '
    + 'because it is a long walk and these are not safe roads, and they intend to go '
    + 'up.\n\nThe prefect reads the word "armed" and does not read anything else. '
    + 'There is cavalry on the road before the crowd reaches the ascent. The '
    + 'principal men are taken and executed; the Samaritan council, which had nothing '
    + 'to do with any of it, writes to the legate of Syria to say so.',
    'Pilate\'s cavalry broke up the Samaritan gathering at Gerizim in 36; the Samaritan senate complained to Vitellius, who sent Pilate to Rome to answer for it (AJ 18.85-89).',
    { label: 'Let the complaint go to Antioch — the prefect has earned it',
      tooltip: 'The legate recalls him: +16 legitimacy, the Samaritan towns −1.5 unrest for twenty years, and "A Governor Can Be Removed" permanently (+8% morale) — the second lesson in three years about where the real authority sits.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { legitimacy: 16 });
        stir(ctx, SAMARITAN, { id: 'road_gerizim_redress', name: 'The Complaint Was Heard', months: 240, effects: { unrest: -1.5 } });
        mine(ctx, 'road_governor_removed', 'A Governor Can Be Removed', { moraleMult: 1.08 }, -1);
        h.setFlag(ctx, 'prefectRecalled', true);
        h.chronicle(ctx, 'era', 'The Samaritan council\'s complaint reaches Antioch and the prefect is sent to Rome to answer for the dead on the Gerizim road.'); } },
    { label: 'Back the prefect — an armed crowd on a mountain is an armed crowd',
      tooltip: '+1 stability and Rome +12 opinion for a government that holds the line on public order. The Samaritan towns take +2 unrest permanently and remember in 52 who backed whom, and in 66 they are not on your side.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { stability: 1 });
        if (alive(ctx, 'ROM')) { const me = crown(ctx) || ctx.game.playerTag; if (me) opinion(ctx, 'ROM', me, 12); }
        stir(ctx, SAMARITAN, { id: 'road_gerizim_grudge', name: 'The Road Below Gerizim', months: -1, effects: { unrest: 2 } });
        h.setFlag(ctx, 'samaritanGrudge', true);
        h.chronicle(ctx, 'era', 'The government backs the prefect: the men killed below Gerizim were an armed assembly, and the Samaritan council is told so in writing.'); } }),

  C('k', 'ev40r_k_the_vessels_of_moses', 'Somebody Else\'s Holy Mountain',
    'A prophet on Gerizim, and a Jewish king asked what to do about it', 36, 3,
    'A Samaritan has promised to uncover the vessels Moses buried on Gerizim and '
    + 'several thousand people believe him enough to walk up a mountain for it. They '
    + 'are in the kingdom\'s territory, they are armed in the ordinary way of people '
    + 'on bad roads, and they are converging on the one hill in this country that a '
    + 'Jewish crown has no business on.\n\nThe court is split three ways and all '
    + 'three are defensible. Send troops and it is a massacre on a holy mountain '
    + 'ordered by the wrong religion. Send nothing and a prophetic movement forms '
    + 'itself eleven miles from Sebaste. Send a magistrate and ask them politely to '
    + 'go home, and find out whether a Samaritan crowd will take an instruction from '
    + 'Jerusalem.',
    'In the other history Pilate sent cavalry and the principal men were executed. The Samaritan council complained to the legate of Syria and the prefect was recalled.',
    { label: 'Send a magistrate, not a squadron, and let them go up',
      tooltip: '−20 talents and a bad week in the council. The Samaritan towns −2 unrest permanently and "The Mountain Was Theirs" (+12% integration, +8 diplomatic weight) for twenty-five years — the Samaritans are inside this kingdom in 66 instead of on the other side of it.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: -20 });
        stir(ctx, SAMARITAN, { id: 'road_mountain_theirs', name: 'The Mountain Was Theirs', months: -1, effects: { unrest: -2 } });
        mine(ctx, 'road_mountain_policy', 'The Mountain Was Theirs', { integrateMult: 1.12, diploSeats: 8 }, 300);
        h.setFlag(ctx, 'gerizimLeftAlone', true);
        h.chronicle(ctx, 'era', 'The crown sends a magistrate rather than a squadron to Gerizim; the crowd goes up, finds nothing, and goes home, and the Samaritans remember who did not come with cavalry.'); } },
    { label: 'Break it up before it becomes a movement',
      tooltip: '+2 stability and "Public Order" (+10% discipline) for fifteen years. The Samaritan towns take +2.5 unrest permanently and the kingdom has done to Gerizim exactly what the other history\'s prefect did, with the difference that it cannot blame Rome.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { stability: 2 });
        mine(ctx, 'road_public_order', 'Public Order', { disciplineMult: 1.1 }, 180);
        stir(ctx, SAMARITAN, { id: 'road_gerizim_grudge', name: 'The Road Below Gerizim', months: -1, effects: { unrest: 2.5 } });
        h.setFlag(ctx, 'samaritanGrudge', true);
        h.chronicle(ctx, 'era', 'The king\'s troops break up the assembly below Gerizim; it is the same road and the same dead, and this time there is no governor to blame for it.'); } }),

  C('p', 'ev40r_p_the_vestments_returned', 'The Robes Come Out of the Tower',
    'The legate gives the high priest\'s vestments back', 37, 1,
    'The high priest\'s vestments have been kept in the Antonia since the province '
    + 'was made, issued seven days before each of the three festivals and the Day of '
    + 'Atonement and taken back after. It is a small and extremely efficient piece '
    + 'of government: the man cannot function without them, and the garrison holds '
    + 'them.\n\nThe legate of Syria, in Jerusalem for the Passover and in a '
    + 'conciliatory mood after the business at Gerizim, has ordered them handed to '
    + 'the priests\' own custody and has remitted the tax on fruit sold in the city. '
    + 'He has asked for nothing in return, which the council finds harder to '
    + 'interpret than a demand would have been.',
    'Vitellius restored the vestments to priestly custody and remitted the market tax on fruit during his Passover visit (AJ 18.90-95). Claudius confirmed the arrangement in 41.',
    { label: 'Take it, and put the concession in writing before he leaves',
      tooltip: '+22 legitimacy, Priesthood +20 approval, "The Vestments Are Ours" (−1 unrest in the Jewish heartland, +6% income) permanently. A written concession outlives the man who made it, which is the whole point of getting it written.',
      fx: (ctx) => { const h = ctx.helpers; const me = crown(ctx) || ctx.game.playerTag;
        pay(ctx, { legitimacy: 22 });
        if (me) { try { h.factionShift(ctx, me, 'priesthood', 20); } catch (e) {} }
        stir(ctx, JEWISH_HEART, { id: 'road_vestments', name: 'The Vestments Are Ours', months: -1, effects: { unrest: -1, taxMult: 1.06 } });
        h.setFlag(ctx, 'vestmentsReturned', true);
        h.chronicle(ctx, 'era', 'The vestments are handed to the priests\' own custody and the concession is put in writing before the legate leaves the city.'); } },
    { label: 'Ask instead for the fruit tax to stay remitted for ten years',
      tooltip: 'The money rather than the robes: +12% income in the Jewish heartland for ten years and +60 talents now. The vestments stay in the tower, which is a grievance that costs nothing this year and is read out in 66.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: 60 });
        stir(ctx, JEWISH_HEART, { id: 'road_fruit_remitted', name: 'The Fruit Tax Remitted', months: 120, effects: { taxMult: 1.12 } });
        stir(ctx, JEWISH_HEART, { id: 'road_robes_in_tower', name: 'The Robes Stay in the Tower', months: -1, effects: { unrest: 0.8 } });
        h.chronicle(ctx, 'era', 'The council asks for the market tax rather than the vestments; the robes stay in the Antonia and are issued seven days before each feast, as before.'); } }),

  C('k', 'ev40r_k_the_chain_of_gold', 'A Chain the Same Weight as the Other One',
    'Agrippa comes out of prison with a tetrarchy', 37, 4,
    'Herod\'s grandson spent most of last year in an imperial prison for a remark '
    + 'about the emperor\'s health made in front of a freedman who repeated it. The '
    + 'emperor died in March. The new one, who is a friend of his, has let him out, '
    + 'given him the tetrarchy in the north, and had a gold chain made to the exact '
    + 'weight of the iron one he wore in prison.\n\nHe is now a king on this '
    + 'kingdom\'s northern border with a direct line to a twenty-four-year-old '
    + 'emperor who likes him. That is an asset and a rival in the same man, and the '
    + 'court has about six weeks to decide which it would rather have.',
    'Caligula freed Agrippa I in 37, granted him Philip\'s tetrarchy and gave him a gold chain equal in weight to his prison irons (AJ 18.237).',
    { label: 'Court him — he is worth more as a voice in Rome than as a neighbour',
      tooltip: '−70 talents in gifts and an embassy. "The Friend at Court" (+15% diplomatic weight, +10 deterrent) for twenty years, and Rome +15 opinion. Somebody in the palace will now take your letters in.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: -70 });
        mine(ctx, 'road_friend_at_court', 'The Friend at Court', { diploSeats: 15, deterrent: 10 }, 240);
        if (alive(ctx, 'ROM')) { const me = crown(ctx); if (me) opinion(ctx, 'ROM', me, 15); }
        h.chronicle(ctx, 'era', 'The court spends heavily on Herod\'s grandson in the year of his release, and buys itself a voice inside the palace on the Palatine.'); } },
    { label: 'Watch him — a Herodian with an emperor\'s ear is a claim waiting to be made',
      tooltip: '+2 authority and "The Northern Watch" (+8% manpower, +6 deterrent) for twenty years, and no gifts to pay for. He remembers being watched, and in 41 he is the man drafting the charter.',
      fx: (ctx) => { const h = ctx.helpers;
        h.doctrine(ctx, 'authority', 2);
        mine(ctx, 'road_northern_watch', 'The Northern Watch', { manpowerMult: 1.08, deterrent: 6 }, 240);
        h.chronicle(ctx, 'era', 'The court sends no gifts north and doubles the watch on the road instead; the new tetrarch is told, by people who tell him things, exactly that.'); } }),

  C(null, 'ev40r_the_synagogues_of_alexandria', 'The Quarter Is Burning in Alexandria',
    'The Delta quarter is sacked and an embassy goes to Rome', 38, 8,
    'The largest Jewish community in the world is in the two quarters east of the '
    + 'Alexandrian harbour, and this summer the prefect of Egypt let a mob have '
    + 'them. Images were put into the synagogues; the community was declared '
    + 'foreign in its own city and herded into one quarter; houses and shops in the '
    + 'others were taken; thirty-eight members of the council of elders were '
    + 'flogged in the theatre on a festival day, which had never been done to men of '
    + 'that rank.\n\nThe community is sending two embassies to Rome — theirs and the '
    + 'Greeks\' — and the philosopher who will lead ours is seventy and has never '
    + 'done anything like this. The question here is whether Judaea is a party to it.',
    'The Alexandrian pogrom of 38 under the prefect Flaccus is described by Philo (In Flaccum), who led the Jewish embassy to Caligula the following year.',
    { label: 'Fund the embassy and put Judaea\'s name on the petition',
      tooltip: '−85 talents. The diaspora communities +18 opinion and "The Petition of the Nation" (+10% trade, +12 diplomatic weight) for twenty-five years: Judaea has acted as the metropolis of a people rather than the government of a district.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: -85, legitimacy: 12 });
        mine(ctx, 'road_petition_nation', 'The Petition of the Nation', { tradeMult: 1.1, diploSeats: 12 }, 300);
        h.chronicle(ctx, 'era', 'Judaea funds the Alexandrian embassy and signs the petition; for the first time in this century the government in Jerusalem has spoken for Jews who are not its subjects.'); } },
    { label: 'Send money quietly and keep the name off it',
      tooltip: '−30 talents and no exposure: +1 stability, and the aid arrives. Rome is not given a document in which Judaea claims to speak for the Jews of another province, which is a claim Rome has never liked.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: -30, stability: 1 });
        h.chronicle(ctx, 'era', 'Money goes to Alexandria through the Temple\'s own channels and no document with Judaea\'s name on it reaches Rome.'); } }),

  C(null, 'ev40r_the_arms_in_the_armoury', 'Seventy Thousand Sets of Armour',
    'Antipas is denounced by his nephew and exiled to Gaul', 39, 6,
    'The tetrarch of Galilee has gone to Baiae to ask the emperor for a crown, at '
    + 'his wife\'s insistence and against his own judgement, and his nephew\'s '
    + 'freedman has arrived a week ahead of him carrying a letter. The letter says '
    + 'the tetrarch has seventy thousand sets of arms in his magazines and has been '
    + 'corresponding with the Parthians.\n\nThe arms are real; every tetrarch in '
    + 'this country keeps a magazine and everybody knows the figure. The Parthian '
    + 'correspondence is not. The emperor asks one question — are there seventy '
    + 'thousand suits of armour in your armouries — and the tetrarch, who is an '
    + 'honest man in the one way that does not help, says yes. He is in Gaul by '
    + 'autumn.',
    'Agrippa I denounced Antipas to Caligula in 39; asked about the arms in his magazines Antipas admitted them and was exiled to Gaul (AJ 18.240-255).',
    { label: 'Count our own magazines before somebody else does',
      tooltip: '−45 talents in a hurried audit. "The Magazines Counted" (+10% force limit, +8 deterrent) for twenty years, and +1 stability. The lesson of the year is that a true answer can finish you if you have not decided in advance what the true answer is.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: -45, stability: 1 });
        mine(ctx, 'road_magazines_counted', 'The Magazines Counted', { forceLimitMult: 1.1, deterrent: 8 }, 240);
        h.chronicle(ctx, 'era', 'The armouries are audited and the figures written down before anybody in Rome asks for them.'); } },
    { label: 'Take the tetrarchy\'s trade while its court is in disarray',
      tooltip: '+120 talents and "The Galilean Contracts" (+9% trade) for fifteen years — the north\'s business moves south for a season while there is nobody to sign for it. Nothing is counted and nothing is audited.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: 120 });
        mine(ctx, 'road_galilean_contracts', 'The Galilean Contracts', { tradeMult: 1.09 }, 180);
        h.chronicle(ctx, 'era', 'With the tetrarch on a ship to Gaul and his court unsigned for, the season\'s northern business is written in Jerusalem.'); } }),

  // ═══ THE FIFTIES ═════════════════════════════════════════════════════════

  C(null, 'ev40r_the_scroll_at_beth_horon', 'A Soldier Tore the Book',
    'A legionary tears a Torah scroll and the country stops', 50, 4,
    'A detachment searching a village on the Beth-horon road turned out a synagogue '
    + 'chest, and one of the soldiers took the scroll, tore it up and threw it on a '
    + 'fire, with commentary. The village saw it. By the second day there were '
    + 'people on the road from three districts and by the fourth the procurator had '
    + 'a crowd outside his residence at Caesarea that had walked down from the hills '
    + 'and would not leave.\n\nHe has the man beheaded, publicly, in front of the '
    + 'crowd, and the crowd goes home. It is the correct decision and it is also an '
    + 'admission: the government has just executed one of its own soldiers because '
    + 'enough people stood in a road, and everyone who stood in the road now knows '
    + 'the arithmetic.',
    'Cumanus beheaded the soldier who destroyed a Torah scroll near Beth-horon, and the crowd dispersed (AJ 20.113-117; BJ 2.229-231).',
    { label: 'Let the execution stand and say nothing else about it',
      tooltip: '+1 stability and "Enough People in a Road" permanently: −0.8 unrest in the Jewish heartland now, and +0.4 unrest everywhere from 66 onward is not what this does — it does the simpler thing, which is +10% morale for a country that has found out what it can do.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { stability: 1 });
        stir(ctx, JEWISH_HEART, { id: 'road_scroll_redress', name: 'The Book Was Answered For', months: -1, effects: { unrest: -0.8 } });
        mine(ctx, 'road_enough_people', 'Enough People in a Road', { moraleMult: 1.1 }, -1);
        h.chronicle(ctx, 'era', 'The soldier who burned the scroll is beheaded in front of the crowd that came down from the hills, and the crowd walks home having learned the arithmetic.'); } },
    { label: 'Ask for the garrison to be changed as well',
      tooltip: '−55 talents and a long argument in Antioch. The Caesarean cohorts are rotated: +12% discipline for twenty years and −1.2 unrest in the Jewish heartland permanently — the Sebastene auxiliaries who are the whole problem go somewhere else for a while.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: -55 });
        mine(ctx, 'road_garrison_changed', 'The Garrison Changed', { disciplineMult: 1.12 }, 240);
        stir(ctx, JEWISH_HEART, { id: 'road_scroll_redress', name: 'The Book Was Answered For', months: -1, effects: { unrest: -1.2 } });
        h.chronicle(ctx, 'era', 'The government spends the year arguing Antioch into rotating the Caesarean cohorts out, which is the only part of this that would have prevented the next one.'); } }),

  C('p', 'ev40r_p_the_pilgrim_at_ginae', 'A Galilean Killed on the Road to the Feast',
    'A murder at Ginae becomes a case in Rome', 52, 5,
    'A Galilean going up to the feast was killed in a Samaritan village on the '
    + 'plain road. The procurator was asked to act and did not, because he had been '
    + 'paid not to; and so a great many Galileans went and burned Samaritan villages '
    + 'with a brigand chief at their head, and then the procurator acted, on that '
    + 'side, with cavalry.\n\nThe legate of Syria has come down, held an assize, '
    + 'crucified the men he found under arms, and sent the procurator, the tribune, '
    + 'and the principal men of both nations to Rome to put the case to the emperor '
    + 'in person. The whole thing now depends on which delegation is better '
    + 'connected at court, which is not how anybody wants a murder decided.',
    'The Ginae killing led to Jewish reprisals under Eleazar ben Dinai, Quadratus\' assize, and the referral of Cumanus and the Samaritan leaders to Claudius, who exiled Cumanus (AJ 20.118-136; BJ 2.232-246).',
    { label: 'Send the delegation and spend whatever it takes at court',
      tooltip: '−110 talents. The case is won: the procurator is exiled, +20 legitimacy, −1 unrest in the Jewish heartland for twenty years, and "The Case Was Won in Rome" (+10 diplomatic weight) — and the Samaritan towns +2 unrest permanently, because somebody had to lose it.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: -110, legitimacy: 20 });
        stir(ctx, JEWISH_HEART, { id: 'road_case_won', name: 'The Case Was Won in Rome', months: 240, effects: { unrest: -1 } });
        stir(ctx, SAMARITAN, { id: 'road_case_lost', name: 'The Case Was Lost in Rome', months: -1, effects: { unrest: 2 } });
        mine(ctx, 'road_case_weight', 'The Case Was Won in Rome', { diploSeats: 10 }, 240);
        h.setFlag(ctx, 'ginaeWon', true);
        h.chronicle(ctx, 'era', 'The delegation carries the Ginae case at Rome; the procurator goes into exile and the Samaritan principals go to the block.'); } },
    { label: 'Settle it here — blood money to the family and the brigands given up',
      tooltip: '−40 talents and the men who burned the villages are handed over: +2 stability, the Samaritan towns −1.5 unrest permanently and +10% integration for fifteen years. Cheap, quiet, and the Galilee never forgives the court for the handing over.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: -40, stability: 2 });
        stir(ctx, SAMARITAN, { id: 'road_ginae_settled', name: 'Settled Between Neighbours', months: -1, effects: { unrest: -1.5 } });
        mine(ctx, 'road_ginae_integrate', 'Settled Between Neighbours', { integrateMult: 1.1 }, 180);
        stir(ctx, ['Sepphoris', 'Tiberias'], { id: 'road_galilee_handed', name: 'The Men Were Handed Over', months: -1, effects: { unrest: 1.5 } });
        h.chronicle(ctx, 'era', 'The Ginae killing is settled between neighbours with blood money and the surrender of the men who burned the villages; the Galilee is told and does not forget.'); } }),

  C('k', 'ev40r_k_the_pilgrim_at_ginae', 'The Road to the Feast Is the Crown\'s Road',
    'A pilgrim murdered in Samaritan country, and no legate to appeal to', 52, 5,
    'A man going up to the feast was killed in a Samaritan village on the plain '
    + 'road, and this kingdom has no procurator to blame and no legate to appeal to. '
    + 'The road is the crown\'s road. The village is the crown\'s village. The dead '
    + 'man\'s district has already armed itself and is waiting to be told either to '
    + 'stand down or to go.\n\nThere is a version of this in which the crown holds '
    + 'an assize, hangs four men and keeps a country. There is a version in which it '
    + 'lets the Galilee go and burn the plain, and has the Galilee\'s loyalty for '
    + 'twenty years and a civil war in the middle of its own territory.',
    'Under Roman government this became a case for the legate and then for Claudius. A kingdom would have had to judge it, which is a different and harder thing.',
    { label: 'Hold the assize yourself and hang the murderers',
      tooltip: '−35 talents and four executions. +3 stability, +18 legitimacy, "The King\'s Road" (−1 unrest everywhere, +10% integration) for twenty-five years. The Galilee is told to stand down and does, this once.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: -35, stability: 3, legitimacy: 18 });
        mine(ctx, 'road_the_kings_road', 'The King\'s Road', { unrestAll: -1, integrateMult: 1.1 }, 300);
        h.setFlag(ctx, 'kingsAssize', true);
        h.chronicle(ctx, 'era', 'The crown holds its own assize on the plain road, hangs the murderers and tells the Galilee to go home; the Galilee goes home.'); } },
    { label: 'Let the Galilee answer it, and look the other way for a fortnight',
      tooltip: 'No cost now. The Galilee +2.5 unrest reduction and "The Fortnight" (+12% manpower there) for twenty years — and the Samaritan towns +3 unrest permanently, −2 stability, and a country with a burned district inside it.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { stability: -2 });
        stir(ctx, ['Sepphoris', 'Tiberias'], { id: 'road_the_fortnight', name: 'The Fortnight', months: 240, effects: { unrest: -2.5 } });
        mine(ctx, 'road_fortnight_men', 'The Fortnight', { manpowerMult: 1.12 }, 240);
        stir(ctx, SAMARITAN, { id: 'road_the_burned_plain', name: 'The Burned Plain', months: -1, effects: { unrest: 3 } });
        h.setFlag(ctx, 'samaritanGrudge', true);
        h.chronicle(ctx, 'era', 'The crown looks away for a fortnight and the Galilee burns the Samaritan plain; the Galilee is loyal for twenty years and there is a scorched district in the middle of the kingdom.'); } }),

  C('p', 'ev40r_p_a_slaves_temper', 'The Power of a King, the Temper of a Slave',
    'Felix takes the province', 53, 3,
    'The new procurator is the brother of the emperor\'s freedman secretary, which '
    + 'is to say he is a freedman himself and has been given a province because his '
    + 'brother runs the correspondence. He has arrived with the understanding that '
    + 'the post is a reward and that the country is the reward\'s substance.\n\nHe '
    + 'is not lazy. He hunts brigands energetically and crucifies a great many of '
    + 'them, and he takes the brigand chief who burned the Samaritan villages and '
    + 'sends him to Rome in chains, which is a genuine service. He also finds that '
    + 'the most efficient way to deal with a difficult high priest is to arrange for '
    + 'the dagger-men to kill him, and this occurs to him early.',
    'Tacitus on Felix: "he exercised the power of a king with the temper of a slave, in all cruelty and lust" (Historiae V.9). He governed Judaea from about 52 to 60.',
    { label: 'Work with him — he will hunt brigands for anybody who pays',
      tooltip: '−60 talents in the relationship. "The Procurator\'s Hunt" (+14% discipline, −1.2 unrest in the countryside) for eight years, and the roads are genuinely safer. The price is that the government is now visibly a partner in what he does.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: -60 });
        mine(ctx, 'road_procurators_hunt', 'The Procurator\'s Hunt', { disciplineMult: 1.14 }, 96);
        stir(ctx, ['Jericho', 'Emmaus', 'Lydda', 'Hebron'], { id: 'road_roads_safer', name: 'The Roads Are Safer', months: 96, effects: { unrest: -1.2 } });
        stir(ctx, JEWISH_HEART, { id: 'road_visible_partner', name: 'A Visible Partner', months: -1, effects: { unrest: 0.7 } });
        h.chronicle(ctx, 'era', 'The government works with the new procurator and the roads are safer than they have been in twenty years; everybody can see whose roads they are.'); } },
    { label: 'Keep him at arm\'s length and document everything he does',
      tooltip: '+2 authority and "The File on the Procurator" (+12 diplomatic weight, +8% legitimacy recovery) for fifteen years. The brigandage gets worse — +1 unrest in the countryside for eight years — and in 60 there is a dossier that a new emperor will read.',
      fx: (ctx) => { const h = ctx.helpers;
        h.doctrine(ctx, 'authority', 2);
        mine(ctx, 'road_the_file', 'The File on the Procurator', { diploSeats: 12, legitimacyAdd: 0.05 }, 180);
        stir(ctx, ['Jericho', 'Emmaus', 'Lydda', 'Hebron'], { id: 'road_brigandage', name: 'The Hills Are Not Policed', months: 96, effects: { unrest: 1 } });
        h.chronicle(ctx, 'era', 'The council keeps the procurator at arm\'s length and keeps a file; the hills go unpoliced for eight years and the file is read in Rome at the end of them.'); } }),

  C(null, 'ev40r_the_sister_of_the_king', 'The King\'s Sister Leaves Her Husband',
    'Drusilla leaves Emesa for the procurator', 54, 6,
    'The king\'s youngest sister was married last year to the king of Emesa, who '
    + 'accepted circumcision for it, which was the entire point of the match and '
    + 'cost him something. She is sixteen. The procurator has seen her, sent a '
    + 'Cypriot magician to her with a proposal, and she has left Emesa for '
    + 'Caesarea.\n\nThe diplomatic damage is obvious and the religious damage is '
    + 'worse: the royal house has just demonstrated, in public, that its own law '
    + 'about marriage outside the covenant is a thing that applies to other people. '
    + 'Emesa has recalled its envoys. The strict men in the city are saying the '
    + 'quiet part loudly.',
    'Drusilla, daughter of Agrippa I, left Azizus of Emesa for the procurator Felix around 54 (AJ 20.141-144).',
    { label: 'Say it in the Temple court — the law is the law for the king\'s house too',
      tooltip: '+25 legitimacy, Priesthood +20 approval and −1 unrest in the Jewish heartland for twenty years. Rome −15 opinion and the procurator becomes a personal enemy: +1.5 unrest on the coast for eight years while he governs it.',
      fx: (ctx) => { const h = ctx.helpers; const me = crown(ctx) || ctx.game.playerTag;
        pay(ctx, { legitimacy: 25 });
        if (me) { try { h.factionShift(ctx, me, 'priesthood', 20); } catch (e) {} }
        stir(ctx, JEWISH_HEART, { id: 'road_law_is_law', name: 'The Law Is the Law', months: 240, effects: { unrest: -1 } });
        if (alive(ctx, 'ROM') && me) opinion(ctx, 'ROM', me, -15);
        stir(ctx, COAST, { id: 'road_procurator_enemy', name: 'A Personal Enemy at Caesarea', months: 96, effects: { unrest: 1.5 } });
        h.chronicle(ctx, 'era', 'The marriage is denounced from the Temple court by name; the procurator takes it personally and governs the coast accordingly.'); } },
    { label: 'Let it pass — a king\'s sister is a king\'s business',
      tooltip: '+90 talents and Rome +12 opinion out of a procurator who is now in the family. "The Quiet Arrangement" (+8% income) for eight years — and +1.2 unrest in the Jewish heartland permanently, and the strict men have their example, and they keep it.',
      fx: (ctx) => { const h = ctx.helpers; const me = crown(ctx) || ctx.game.playerTag;
        pay(ctx, { treasury: 90 });
        if (alive(ctx, 'ROM') && me) opinion(ctx, 'ROM', me, 12);
        mine(ctx, 'road_quiet_arrangement', 'The Quiet Arrangement', { incomeMult: 1.08 }, 96);
        stir(ctx, JEWISH_HEART, { id: 'road_their_example', name: 'Their Example', months: -1, effects: { unrest: 1.2 } });
        h.chronicle(ctx, 'era', 'Nothing is said about the marriage from any pulpit the court controls; the strict men say it instead, and keep saying it.'); } }),

  C(null, 'ev40r_the_daggers_in_the_crowd', 'The Men With the Short Swords',
    'The sicarii begin killing in the festival crowds', 56, 9,
    'There is a new thing in the city and it does not have a precedent. Men carry '
    + 'short curved daggers under their clothes into the festival crowds, come up '
    + 'beside somebody, kill him, and then join the outcry over the body and help '
    + 'look for the murderer. They are not robbers; they are killing '
    + 'collaborators, by which they mean the men who hold the offices.\n\nThe former '
    + 'high priest was killed this way in the Temple itself, in the crowd, at a '
    + 'feast. Nobody was caught. The effect is not the dead man: it is that every '
    + 'man of rank in Jerusalem has now worked out that he cannot go into a crowd, '
    + 'and that the crowd is where the government happens.',
    'The sicarii murdered the former high priest Jonathan in the Temple; Josephus says Felix arranged it (BJ 2.254-257; AJ 20.162-165).',
    { label: 'Search the crowds — screens at the gates on every festival',
      tooltip: '−70 talents a decade and "The Gate Search" (+14% discipline, −1.5 unrest in the Jewish heartland) for fifteen years. It works. It also means that from now on going up to the feast means being searched by the government, which is its own grievance: +0.8 unrest there permanently.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: -70 });
        mine(ctx, 'road_gate_search', 'The Gate Search', { disciplineMult: 1.14 }, 180);
        stir(ctx, JEWISH_HEART, { id: 'road_gate_search_p', name: 'The Gate Search', months: 180, effects: { unrest: -1.5 } });
        stir(ctx, ['Jerusalem'], { id: 'road_searched_at_the_feast', name: 'Searched at the Feast', months: -1, effects: { unrest: 0.8 } });
        h.chronicle(ctx, 'era', 'Screens go up at the festival gates and the killings stop for a season; going up to the feast now means being searched, and that is remembered too.'); } },
    { label: 'Buy the informers instead and take them one at a time',
      tooltip: '−45 talents and "The Informers" (+10% intrigue reach, +6 deterrent) for fifteen years. Slower and quieter, and it puts the government in the business of paying men to name their neighbours: −8 legitimacy and +0.6 unrest in the Jewish heartland permanently.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: -45, legitimacy: -8 });
        mine(ctx, 'road_the_informers', 'The Informers', { deterrent: 6, disciplineMult: 1.05 }, 180);
        stir(ctx, JEWISH_HEART, { id: 'road_naming_neighbours', name: 'Men Paid to Name Neighbours', months: -1, effects: { unrest: 0.6 } });
        h.chronicle(ctx, 'era', 'The government buys informers rather than searching the crowds, and finds out what a city is like when the man beside you is paid.'); } }),

  C(null, 'ev40r_the_egyptian_on_the_mount', 'He Says the Walls Will Fall Down',
    'A prophet leads thirty thousand to the Mount of Olives', 57, 4,
    'A man from Egypt has been in the wilderness for a year and has come out with a '
    + 'following that the sources will put at thirty thousand and that is certainly '
    + 'several. He has brought them round by the desert road to the Mount of Olives '
    + 'and has announced that at his word the walls of Jerusalem will fall down flat '
    + 'and they will walk in.\n\nHe is not arming them. That is the difficulty: '
    + 'this is not a revolt and the people on that hill are not soldiers, they are '
    + 'farmers who have sold up. The procurator is going to take cavalry up that '
    + 'hill tomorrow morning whatever anybody says, and the only question this '
    + 'council gets is whether it is standing beside him when he does.',
    'The Egyptian prophet led his followers to the Mount of Olives; Felix attacked and killed or took most of them, and the Egyptian escaped (BJ 2.261-263; AJ 20.169-172; Acts 21:38).',
    { label: 'Go up first, unarmed, and talk them down the hill',
      tooltip: '−25 talents and a real risk. The hill empties overnight: −2 unrest in the Jewish heartland for twenty years, +20 legitimacy, and "They Came Down On Their Own" (+10% morale) for twenty years. Several thousand people who would have been cut down are alive in 66.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: -25, legitimacy: 20 });
        stir(ctx, JEWISH_HEART, { id: 'road_came_down', name: 'They Came Down On Their Own', months: 240, effects: { unrest: -2 } });
        mine(ctx, 'road_came_down_m', 'They Came Down On Their Own', { moraleMult: 1.1 }, 240);
        h.setFlag(ctx, 'egyptianTalkedDown', true);
        h.chronicle(ctx, 'era', 'Men from the council go up the Mount of Olives unarmed and spend a night arguing; by morning the hill is empty and there is nothing for the cavalry to do.'); } },
    { label: 'Stand aside and let the cavalry clear the hill',
      tooltip: '+2 stability and Rome +10 opinion. "The Hill Was Cleared" permanently: +2 unrest in the Jewish heartland, −12 legitimacy, and every prophet after this one has a better recruiting argument than the last.',
      fx: (ctx) => { const h = ctx.helpers; const me = crown(ctx) || ctx.game.playerTag;
        pay(ctx, { stability: 2, legitimacy: -12 });
        if (alive(ctx, 'ROM') && me) opinion(ctx, 'ROM', me, 10);
        stir(ctx, JEWISH_HEART, { id: 'road_hill_cleared', name: 'The Hill Was Cleared', months: -1, effects: { unrest: 2 } });
        h.chronicle(ctx, 'era', 'The cavalry clears the Mount of Olives at first light and the council is not on the hill; the Egyptian is not among the dead and is not found.'); } }),

  C(null, 'ev40r_the_citizenship_of_caesarea', 'Whose City Is Caesarea',
    'Caesarea\'s Jews and Syrians take their quarrel to Nero', 59, 8,
    'Caesarea has two populations with two accounts of what the city is. The Jews '
    + 'say Herod founded it and therefore it is a Jewish city in which Greeks live. '
    + 'The Syrians say it was Straton\'s Tower before Herod and has temples and '
    + 'statues in it, and therefore it is a Greek city in which Jews live. Both are '
    + 'true. The question is equal citizenship, and it has moved from the council '
    + 'chamber to the street and from the street to stones.\n\nThe procurator put '
    + 'troops into the Jewish quarter and let them plunder it, then stopped them and '
    + 'told both sides to send delegations to the emperor. The delegations are being '
    + 'assembled now. Whichever way Nero answers, the losing community will be '
    + 'living in the winner\'s city.',
    'The Caesarea citizenship dispute ran through the late fifties; Nero decided for the Syrians in 61, and the riot at Caesarea in May 66 began the Great Revolt (BJ 2.266-270, 284-292; AJ 20.173-178).',
    { label: 'Spend everything on the delegation — this city decides the province',
      tooltip: '−150 talents, the largest single expenditure on the road. The ruling comes back for the Jews: Caesarea −2.5 unrest permanently, +14% trade for twenty-five years, and "Caesarea Was Ours" — the riot that opens the war in 66 does not happen there.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: -150, legitimacy: 15 });
        stir(ctx, ['Caesarea Maritima'], { id: 'road_caesarea_ours', name: 'Caesarea Was Ours', months: -1, effects: { unrest: -2.5, taxMult: 1.1 } });
        mine(ctx, 'road_caesarea_trade', 'Caesarea Was Ours', { tradeMult: 1.14 }, 300);
        h.setFlag(ctx, 'caesareaWon', true);
        h.chronicle(ctx, 'era', 'The Caesarean delegation is funded to the hilt and the rescript comes back for the Jews of the city; the synagogue door on the Greek quarter\'s lane stays where it is.'); } },
    { label: 'Save the money — it is one city and the ruling will be political',
      tooltip: 'No cost. Nero decides for the Syrians: Caesarea +3 unrest permanently, −10% trade for twenty years, and "The Ruling of Caesarea" — this is the quarrel the war of 66 starts in, and it is left lit.',
      fx: (ctx) => { const h = ctx.helpers;
        stir(ctx, ['Caesarea Maritima'], { id: 'road_caesarea_lost', name: 'The Ruling of Caesarea', months: -1, effects: { unrest: 3, taxMult: 0.92 } });
        mine(ctx, 'road_caesarea_lost_t', 'The Ruling of Caesarea', { tradeMult: 0.9 }, 240);
        h.setFlag(ctx, 'caesareaLost', true);
        h.chronicle(ctx, 'era', 'The delegation goes to Rome unfunded and comes back with a rescript for the Syrians; Caesarea is a Greek city with a large Jewish population in it, and stays lit.'); } }),

  C(null, 'ev40r_the_voice_at_the_feast', 'A Voice Against Jerusalem',
    'A man begins crying woe at the feast of Tabernacles', 62, 9,
    'A countryman named Jesus son of Ananias started at the feast four days ago and '
    + 'has not stopped: a voice from the east, a voice from the west, a voice against '
    + 'Jerusalem and the holy house, a voice against the bridegrooms and the brides, '
    + 'a voice against all this people. He answers no questions and greets nobody. '
    + 'He was taken up and flogged to the bone by the magistrates and did not '
    + 'complain and did not stop, and the procurator, deciding he was mad, let him '
    + 'go.\n\nHe will keep this up for seven years and five months, loudest on the '
    + 'festivals, and he will be killed by a stone from an engine during the siege '
    + 'while saying it. The council has to decide today whether the city is a place '
    + 'where a man may stand in the street and say that.',
    'Josephus (BJ 6.300-309) reports Jesus son of Ananias crying woe from 62 until his death in the siege, and gives the date as the feast of Tabernacles.',
    { label: 'Let him alone — a city that flogs a lunatic is afraid of him',
      tooltip: '+12 legitimacy and "The City Let Him Speak" (−0.7 unrest in the Jewish heartland, +6% legitimacy recovery) for fifteen years. Everybody hears him every festival for seven years, which is its own slow cost and is not modelled as one.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { legitimacy: 12 });
        stir(ctx, JEWISH_HEART, { id: 'road_let_him_speak', name: 'The City Let Him Speak', months: 180, effects: { unrest: -0.7 } });
        mine(ctx, 'road_let_him_speak_m', 'The City Let Him Speak', { legitimacyAdd: 0.04 }, 180);
        h.chronicle(ctx, 'era', 'The council declines to silence the man crying woe at the feast, on the ground that a city which flogs a lunatic has told everybody it is frightened.'); } },
    { label: 'Put him out of the city and keep him out',
      tooltip: '+2 stability and "Order in the Courts" (+8% discipline) for fifteen years. −10 legitimacy, and the men who take him out of the gate are remembered doing it: +0.8 unrest in Jerusalem permanently.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { stability: 2, legitimacy: -10 });
        mine(ctx, 'road_order_in_courts', 'Order in the Courts', { disciplineMult: 1.08 }, 180);
        stir(ctx, ['Jerusalem'], { id: 'road_put_out_gate', name: 'Put Out of the Gate', months: -1, effects: { unrest: 0.8 } });
        h.chronicle(ctx, 'era', 'The man crying woe is put out of the city by the Temple guard, in daylight, in front of the feast.'); } }),

  C('p', 'ev40r_p_three_months_of_a_high_priest', 'Three Months, and a Stoning',
    'A high priest uses an interregnum and loses the office', 62, 6,
    'The procurator died in office and the next one has not landed. That is a gap '
    + 'of perhaps three months in which nobody in this country is the government, '
    + 'and the high priest — a Sadducee, and the sources say the harshest of them in '
    + 'judgement — has used it. He convened the council, brought in the brother of '
    + 'the man called Christ and some others, charged them as breakers of the law '
    + 'and had them stoned.\n\nThe objection that reaches the incoming procurator is '
    + 'not from the accused\'s party. It is from strict men of the city who say the '
    + 'council may not be convened for a capital case without the governor\'s '
    + 'consent, which is a point of jurisdiction rather than of mercy, and which is '
    + 'correct.',
    'Ananus son of Ananus convened the Sanhedrin during the gap between Festus and Albinus and had James the brother of Jesus stoned; Agrippa II deposed him after three months (AJ 20.197-203).',
    { label: 'Depose him — the point of jurisdiction is the point',
      tooltip: '+18 legitimacy, Rome +12 opinion, and "The Rule About the Council" (−1 unrest in the Jewish heartland, +8% administrative efficiency) for twenty years. The Sadducee party −20 approval, and it is the faction with the money.',
      fx: (ctx) => { const h = ctx.helpers; const me = crown(ctx) || ctx.game.playerTag;
        pay(ctx, { legitimacy: 18 });
        if (alive(ctx, 'ROM') && me) opinion(ctx, 'ROM', me, 12);
        stir(ctx, JEWISH_HEART, { id: 'road_rule_about_council', name: 'The Rule About the Council', months: 240, effects: { unrest: -1 } });
        mine(ctx, 'road_rule_council_m', 'The Rule About the Council', { adminMult: 1.08 }, 240);
        if (me) { try { h.factionShift(ctx, me, 'priesthood', -20); } catch (e) {} }
        h.chronicle(ctx, 'era', 'The high priest is deposed after three months for convening the council on a capital case without a governor; the point is jurisdiction, and it is upheld.'); } },
    { label: 'Leave him — a council that can try its own is a council worth having',
      tooltip: 'Priesthood +25 approval and "The Council Judged Its Own" (+10% legitimacy recovery, +6% income) for twenty years. Rome −12 opinion and +1 unrest in the Jewish heartland permanently, because what the council did with the power it took was kill somebody.',
      fx: (ctx) => { const h = ctx.helpers; const me = crown(ctx) || ctx.game.playerTag;
        if (me) { try { h.factionShift(ctx, me, 'priesthood', 25); } catch (e) {} }
        mine(ctx, 'road_council_judged', 'The Council Judged Its Own', { legitimacyAdd: 0.06, incomeMult: 1.06 }, 240);
        if (alive(ctx, 'ROM') && me) opinion(ctx, 'ROM', me, -12);
        stir(ctx, JEWISH_HEART, { id: 'road_council_judged_p', name: 'The Council Judged Its Own', months: -1, effects: { unrest: 1 } });
        h.chronicle(ctx, 'era', 'The high priest keeps the office; the council has established that it can try a capital case when Rome is not looking, and what it did with that was a stoning.'); } }),

  C(null, 'ev40r_the_temple_is_finished', 'Eighteen Thousand Men Out of Work',
    'The Temple is completed and its workforce is paid off', 63, 7,
    'The building has been going on for eighty-two years and it is done. The last '
    + 'course is laid, the last scaffold is down, and eighteen thousand craftsmen — '
    + 'masons, carpenters, gilders, the men who have been the city\'s payroll since '
    + 'before anyone alive can remember — are finished.\n\nThe treasury holds enough '
    + 'to have paid them for years and the obvious proposal is to raise the sanctuary '
    + 'another twenty cubits and keep them on. The engineers say the foundation will '
    + 'not take it. The other proposal is to pave the whole city in white stone, '
    + 'which is make-work and everybody knows it, and which employs them, and which '
    + 'costs what it costs.',
    'The Temple was finished about 63; Josephus says the 18,000 workmen were employed paving the city with white stone to prevent unemployment (AJ 20.219-223).',
    { label: 'Pave the city and keep them all on the books',
      tooltip: '−180 talents. Jerusalem +10% income permanently and "The White Streets" (−2 unrest in the Jewish heartland) for fifteen years. Eighteen thousand men with wages are eighteen thousand men who are not in the street in 66.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: -180 });
        stir(ctx, ['Jerusalem'], { id: 'road_white_streets', name: 'The White Streets', months: -1, effects: { taxMult: 1.1 } });
        stir(ctx, JEWISH_HEART, { id: 'road_white_streets_u', name: 'The White Streets', months: 180, effects: { unrest: -2 } });
        h.setFlag(ctx, 'cityPaved', true);
        h.chronicle(ctx, 'era', 'The Temple workforce is put onto paving the city in white stone rather than paid off; it is make-work, it is enormous, and it holds the city\'s wages together for three more years.'); } },
    { label: 'Pay them off and bank the money against a bad year',
      tooltip: '+220 talents kept in the treasury and "The Reserve" (+10% income) for ten years. Jerusalem takes +2.5 unrest permanently: the city has a large, skilled, organised and idle male population three years before 66.',
      fx: (ctx) => { const h = ctx.helpers;
        pay(ctx, { treasury: 220 });
        mine(ctx, 'road_the_reserve', 'The Reserve', { incomeMult: 1.1 }, 120);
        stir(ctx, ['Jerusalem'], { id: 'road_idle_trades', name: 'The Idle Trades', months: -1, effects: { unrest: 2.5 } });
        h.chronicle(ctx, 'era', 'The Temple workforce is paid off and the money banked; the city acquires eighteen thousand skilled, organised, idle men, three years before it needs them for something else.'); } }),
];
