// js/data/ambient.js — the dateline (SPEC §272). What the world is doing
// while nothing is being decided. Content package: zero imports.
//
// These are murmurs, not cards. A murmur has no options and no modal; it
// writes one line into the campaign's dateline, and the handful that earn one
// move a number. js/sim/ambient.js deals at most one a month and never draws
// from the seeded stream to do it.
//
// WHAT MAKES A GOOD MURMUR. It is specific, it is small, and it is about
// somebody who is not the player. "Trouble on the frontier" is not a murmur;
// it is a headline with nothing under it. "The toll-keeper at Jericho has
// started charging by the animal rather than by the load, and the caravan
// masters have begun going round by Livias" is a murmur: it names a person's
// decision, it has a consequence somebody is already working around, and the
// player can do precisely nothing about it, which is the point. The world is
// not an interface.
//
// Many read the realm's own state — whether there is a war on, how the
// treasury stands, what the season is, how big the realm has grown — so the
// dateline is a mirror held up to the campaign rather than a tape playing
// beside it. `when(ctx)` is that gate.
//
// Era bands are the §52 convention: `maxYear: 1799` for the world of
// caravans and toll-keepers, `minYear: 1900` for the world of newspapers and
// wire agencies. Nothing here is timeless, because what a murmur is ABOUT —
// how word arrives at all — is the most era-bound thing in the file.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[data/ambient]', key, e);
}
function guard(key, fn) {
  return (ctx) => { try { fn(ctx); } catch (e) { warnOnce(key, e); } };
}

function T(ctx) { return ctx.game.tags[ctx.game.playerTag]; }
function atWar(ctx) {
  const t = T(ctx);
  return !!t && (t.atWarWith || []).some((e) => ctx.game.tags[e] && ctx.game.tags[e].alive);
}
function atPeace(ctx) { return !!T(ctx) && !atWar(ctx); }
function owned(ctx, filter) {
  const g = ctx.game;
  const out = [];
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== g.playerTag) continue;
    if (filter && !filter(p)) continue;
    out.push(p);
  }
  return out;
}
function devTotal(p) {
  return p.dev ? (p.dev.tax || 0) + (p.dev.prod || 0) + (p.dev.mp || 0) : 0;
}
// A stable, free choice of subject: the month picks it. Deterministic across
// a save and a replay, costs the seeded stream nothing, and wanders enough
// that a murmur naming a province does not name the same one every time.
function nth(ctx, list, offset) {
  if (!list || !list.length) return null;
  const d = ctx.game.date;
  const i = Math.abs((d.y * 12 + d.m + (offset | 0))) % list.length;
  return list[i];
}
function someProv(ctx, filter, offset) {
  return nth(ctx, owned(ctx, filter), offset);
}
function bigProv(ctx, offset) {
  const list = owned(ctx).sort((a, b) => devTotal(b) - devTotal(a)).slice(0, 5);
  return nth(ctx, list, offset);
}
// The seat, by the name the map is currently using for it. A capital lives in
// the atlas table rather than on the live tag, and a chapter may move it
// (`tagTweaks`), so both are consulted before the province index is asked for
// the name it is presently written under — which may be the integrated one
// (SPEC §66): a murmur out of Yerushalayim should say Yerushalayim.
function capitalName(ctx) {
  const g = ctx.game;
  const tag = g.playerTag;
  let name = null;
  try {
    const tweak = ctx.bookmark && ctx.bookmark.tagTweaks && ctx.bookmark.tagTweaks[tag];
    if (tweak && tweak.capital) name = tweak.capital;
    if (!name) {
      const def = ctx.DEFINES && ctx.DEFINES.TAGS && ctx.DEFINES.TAGS[tag];
      if (def && def.capital) name = def.capital;
    }
  } catch (e) { /* the murmur can live without a seat */ }
  if (!name) {
    const p = bigProv(ctx, 0);
    return (p && p.name) || 'the capital';
  }
  const p = ctx.prov(name);
  return (p && p.name) || name;
}
// A neighbour's court, named — the murmur's favourite subject, because the
// thing a small state actually talks about all day is the large one next door.
//
// NEARBY IS LOAD-BEARING. The first cut of this took any living court, and
// the 167 dateline promptly had the money-changers of Jerusalem weighing the
// coin of the Celtiberians and a gift arriving from the Arverni — which is
// not colour, it is a mistake about the world, and it is the kind of mistake
// that makes a player stop believing the rest of the line. So the pool asks
// the map: a court that owns ground next to ground we own. Only if the realm
// touches nobody at all does it widen to the courts it is at war or allied
// with, and only then to anyone.
function neighbourTags(ctx) {
  const g = ctx.game;
  const me = g.playerTag;
  const nb = (ctx.geom && ctx.geom.neighbors) || null;
  const out = new Set();
  if (nb) {
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (!p || p.owner !== me) continue;
      for (const j of nb[i] || []) {
        const q = g.provinces[j];
        if (!q || q.impassable) continue;
        const o = q.owner;
        if (!o || o === me || o === 'REB' || o === 'WASTE') continue;
        const t = g.tags[o];
        if (t && t.alive && t.name) out.add(o);
      }
    }
  }
  if (out.size) return [...out].sort();
  const t = T(ctx);
  const known = [].concat((t && t.atWarWith) || [], (t && t.allies) || [])
    .filter((k) => g.tags[k] && g.tags[k].alive && g.tags[k].name && k !== me);
  if (known.length) return [...new Set(known)].sort();
  return Object.keys(g.tags).filter((k) => {
    const x = g.tags[k];
    return x && x.alive && k !== me && k !== 'REB' && x.name;
  }).sort();
}
function otherCourt(ctx, offset) {
  const g = ctx.game;
  const t = nth(ctx, neighbourTags(ctx), offset);
  return t ? (g.tags[t].name || t) : null;
}
function season(ctx) {
  try { return ctx.helpers.season(ctx); } catch (e) { return 'spring'; }
}
function broke(ctx) { const t = T(ctx); return !!t && (t.treasury || 0) < 0; }
function rich(ctx) { const t = T(ctx); return !!t && (t.treasury || 0) > 400; }

export const AMBIENT_MURMURS = [
  // ── the road ─────────────────────────────────────────────────────────────
  {
    id: 'amb_toll_jericho', kind: 'trade', maxYear: 1799, weight: 2,
    title: 'Word from the road',
    when: (ctx) => owned(ctx).length >= 3,
    text: (ctx) => {
      const p = someProv(ctx, (q) => q.terrain !== 'mountains', 3);
      return 'The toll-keeper at ' + ((p && p.name) || 'the ford') + ' has begun charging by the animal '
        + 'rather than by the load. The caravan masters have started going round.';
    },
  },
  {
    id: 'amb_caravan_in', kind: 'trade', maxYear: 1799, weight: 2,
    title: 'A caravan is in',
    when: (ctx) => owned(ctx).length >= 2,
    text: (ctx) => {
      const p = bigProv(ctx, 1);
      return 'Ninety camels came into ' + ((p && p.name) || capitalName(ctx)) + ' out of the south, '
        + 'forty days from the incense country, and the market has talked about nothing else since.';
    },
  },
  {
    id: 'amb_bridge_out', kind: 'trade', maxYear: 1799, season: 'rains',
    title: 'The bridge is out',
    text: (ctx) => 'The winter took the bridge below ' + capitalName(ctx) + '. The ferryman has '
      + 'doubled his price and nobody has found an argument against him.',
  },
  {
    id: 'amb_bandits_road', kind: 'war', maxYear: 1799, weight: 2,
    title: 'The road is not safe',
    when: (ctx) => owned(ctx).length >= 3,
    text: (ctx) => {
      const p = someProv(ctx, (q) => q.terrain === 'hills' || q.terrain === 'drylands', 5);
      return 'Three parties have been stopped this month on the road above ' + ((p && p.name) || 'the pass')
        + '. The elders say they are robbers. The robbers, when caught, say they are something else.';
    },
  },
  {
    id: 'amb_milestone', kind: 'econ', maxYear: 1799,
    title: 'The road is mended',
    when: (ctx) => atPeace(ctx) && owned(ctx).length >= 4,
    text: (ctx) => 'The stretch above ' + capitalName(ctx) + ' has been relaid and the new milestones '
      + 'cut. A loaded wagon now does in two days what it did in three.',
  },
  {
    id: 'amb_pilgrims', kind: 'faith', maxYear: 1799, weight: 2,
    title: 'The roads are full',
    season: 'spring',
    text: (ctx) => 'The pilgrim roads are full a fortnight before the festival. Every roof in '
      + capitalName(ctx) + ' is let, the price of a lamb has doubled, and the innkeepers are '
      + 'the only people in the country praying for a long season.',
  },

  // ── the market ───────────────────────────────────────────────────────────
  {
    id: 'amb_grain_price', kind: 'econ', maxYear: 1799, weight: 3,
    title: 'The price of grain',
    text: (ctx) => {
      const s = season(ctx);
      if (s === 'harvest') return 'Grain has come off a fifth since the threshing began, and every '
        + 'household with a jar is filling it.';
      if (s === 'rains') return 'Grain is holding steady, which after a winter like this one is the '
        + 'best news the market has had.';
      if (s === 'heat') return 'Grain has crept up three months running. Nobody is alarmed yet. '
        + 'Everybody has noticed.';
      return 'The grain factors are quoting for the new harvest before it is cut, which is either '
        + 'confidence or the beginning of something.';
    },
  },
  {
    id: 'amb_debased_coin', kind: 'econ', maxYear: 1799,
    title: 'The coin is light',
    when: (ctx) => broke(ctx) || !!otherCourt(ctx, 2),
    text: (ctx) => {
      const who = otherCourt(ctx, 2) || 'the north';
      return 'The money-changers have begun weighing ' + who + "'s coin instead of counting it. "
        + 'Word is it has been quietly lightened, and the merchants worked it out before the mint announced it.';
    },
  },
  {
    id: 'amb_purple', kind: 'trade', maxYear: 1799,
    title: 'A cargo of purple',
    when: (ctx) => owned(ctx, (p) => p.terrain === 'coast').length >= 1,
    text: (ctx) => {
      const p = someProv(ctx, (q) => q.terrain === 'coast', 2);
      return 'A jar of the true purple went through ' + ((p && p.name) || 'the harbour') + ' this week '
        + 'at a price that would buy a farm. The dyers will not say how many shells went into it, '
        + 'which is how everyone knows it is the true one.';
    },
  },
  {
    id: 'amb_fish', kind: 'econ', maxYear: 1799,
    title: 'The lake is fishing well',
    when: (ctx) => owned(ctx, (p) => p.good === 'fish').length >= 1,
    text: (ctx) => 'The salting sheds are working through the night and the smell has reached the '
      + 'upper town, where somebody has complained about it, as somebody does every year.',
  },
  {
    id: 'amb_bad_debt', kind: 'econ', maxYear: 1799,
    title: 'The creditors meet',
    when: (ctx) => broke(ctx),
    text: (ctx) => 'Three of the house\'s creditors were seen leaving the same door within an hour '
      + 'of one another, which in this city is considered a public announcement.',
  },
  {
    id: 'amb_new_quarter', kind: 'econ', maxYear: 1799,
    title: 'The town is building',
    when: (ctx) => rich(ctx) && atPeace(ctx),
    text: (ctx) => {
      const p = bigProv(ctx, 4);
      return 'They have begun laying out a new quarter above the spring at ' + ((p && p.name) || capitalName(ctx))
        + ', on ground that was olive terraces last year. The price of a plot there has trebled since Nisan.';
    },
  },

  // ── the court, here and elsewhere ────────────────────────────────────────
  {
    id: 'amb_envoy', kind: 'diplo', maxYear: 1799, weight: 2,
    title: 'An envoy at the gate',
    when: (ctx) => !!otherCourt(ctx, 0),
    text: (ctx) => 'An envoy from ' + (otherCourt(ctx, 0) || 'a neighbouring court') + ' has been kept '
      + 'waiting four days, which is either an insult or an oversight, and the whole court is '
      + 'enjoying the argument about which.',
  },
  {
    id: 'amb_foreign_death', kind: 'diplo', maxYear: 1799, record: true,
    title: 'A king is dead',
    when: (ctx) => !!otherCourt(ctx, 7),
    text: (ctx) => 'Word has come that a king of ' + (otherCourt(ctx, 7) || 'a distant country')
      + ' is dead. The message took five weeks; whatever has happened since has also already happened.',
  },
  {
    id: 'amb_foreign_marriage', kind: 'diplo', maxYear: 1799,
    title: 'A marriage abroad',
    when: (ctx) => !!otherCourt(ctx, 5),
    text: (ctx) => 'A daughter of the royal house in ' + (otherCourt(ctx, 5) || 'a neighbouring court')
      + ' has been married north, with an escort of two hundred and a dowry nobody will name. '
      + 'Our own herald has been asked to find out what it was.',
  },
  {
    id: 'amb_gift', kind: 'diplo', maxYear: 1799,
    title: 'A gift arrives',
    when: (ctx) => atPeace(ctx) && !!otherCourt(ctx, 9),
    text: (ctx) => 'A gift has come from the court of ' + (otherCourt(ctx, 9) || 'a neighbour') + ': a horse, a bolt of '
      + 'something expensive, and a letter of such warmth that the chancery has spent two days '
      + 'deciding what it is meant to make us do.',
    effect: guard('amb_gift', (ctx) => {
      ctx.helpers.adjust(ctx, ctx.game.playerTag, { treasury: 12 });
    }),
  },
  {
    id: 'amb_scribe', kind: 'note', maxYear: 1799,
    title: 'The chancery',
    text: (ctx) => 'The chancery has lost a year of the tax rolls and found them again in the wrong '
      + 'room. Two clerks are no longer speaking and the archive has a new lock.',
  },
  {
    id: 'amb_court_faction', kind: 'note', maxYear: 1799, weight: 2,
    title: 'At court',
    when: (ctx) => atPeace(ctx),
    text: (ctx) => 'The question of precedence at the king\'s table has been reopened by somebody '
      + 'who lost it last year, and the court has divided along exactly the same line as last time.',
  },
  {
    id: 'amb_veterans', kind: 'war', maxYear: 1799,
    title: 'The veterans',
    when: (ctx) => atPeace(ctx) && (T(ctx).warExhaustion || 0) > 2,
    text: (ctx) => 'Men who were called up for the war are still on the muster rolls and no longer '
      + 'on their own land. Somebody else is working it. The petitions have started.',
  },

  // ── the faith ────────────────────────────────────────────────────────────
  {
    id: 'amb_prophet', kind: 'faith', maxYear: 1799, weight: 2,
    title: 'A voice in the wilderness',
    text: (ctx) => 'A man has come up out of the wilderness at ' + capitalName(ctx) + ' saying '
      + 'something the priests do not care for and the crowds evidently do. He has been moved on '
      + 'once. He has come back.',
  },
  {
    id: 'amb_calendar', kind: 'faith', maxYear: 1799,
    title: 'The new moon',
    text: (ctx) => 'The witnesses of the new moon disagreed by a day, which means the festival falls '
      + 'twice this year depending on whom you ask, which means two of the villages will keep it '
      + 'on the wrong one and know it.',
  },
  {
    id: 'amb_new_house', kind: 'faith', maxYear: 1799,
    when: (ctx) => atPeace(ctx) && owned(ctx).length >= 4,
    title: 'A house of assembly',
    text: (ctx) => {
      const p = someProv(ctx, null, 6);
      return 'They have finished the new house of assembly at ' + ((p && p.name) || capitalName(ctx))
        + ' — a subscription of forty households, a floor of cut stone, and a benefactor\'s name '
        + 'in the doorway large enough to be read from the street.';
    },
  },
  {
    id: 'amb_dispute_law', kind: 'faith', maxYear: 1799,
    title: 'A dispute in the court of the law',
    text: (ctx) => 'Two teachers have spent a month on a question of a handbreadth and it has now '
      + 'reached the point where each has students who will not eat with the other\'s.',
  },
  {
    id: 'amb_festival', kind: 'faith', maxYear: 1799, season: 'harvest',
    title: 'The festival',
    text: (ctx) => 'The booths are up on every roof in ' + capitalName(ctx) + ' and the city smells '
      + 'of cut branches. For eight days nobody is going to do any work that can be put off, and '
      + 'most of it can.',
  },

  // ── the sky, with nothing attached ───────────────────────────────────────
  {
    id: 'amb_first_rain_smell', kind: 'note', maxYear: 1799, season: 'rains',
    title: 'The first rain',
    text: (ctx) => 'It rained in the night for the first time since Nisan, and the whole country '
      + 'woke up to the smell of it.',
  },
  {
    id: 'amb_storks', kind: 'note', maxYear: 1799, season: 'spring',
    title: 'The birds are over',
    text: (ctx) => 'The storks came over the valley for three days in columns a mile deep, going '
      + 'north, which the farmers take as the end of the cold and the augurs take as something '
      + 'they will explain afterwards.',
  },
  {
    id: 'amb_moon_halo', kind: 'note', maxYear: 1799,
    title: 'A ring round the moon',
    text: (ctx) => 'There was a ring round the moon last night wide enough to hold the whole of the '
      + 'upper town, and every person who saw it has a different reading of it.',
  },
  {
    id: 'amb_hot_night', kind: 'note', maxYear: 1799, season: 'heat',
    title: 'Nobody is sleeping indoors',
    text: (ctx) => 'It has not gone below blood heat for nine nights. The whole of ' + capitalName(ctx)
      + ' is sleeping on its roofs and the watch has given up pretending to move anyone along.',
  },

  // ── the country's own life ───────────────────────────────────────────────
  {
    id: 'amb_vintage', kind: 'econ', maxYear: 1799, season: 'harvest',
    when: (ctx) => owned(ctx, (p) => p.good === 'wine').length >= 1,
    title: 'The vintage',
    text: (ctx) => {
      const p = someProv(ctx, (q) => q.good === 'wine', 1);
      return 'The vintage at ' + ((p && p.name) || 'the terraces') + ' is in and they are saying it '
        + 'is the best in a decade, which they also said last year, but this time the factors from '
        + 'the coast have come up to see for themselves.';
    },
  },
  {
    id: 'amb_olive_year', kind: 'econ', maxYear: 1799,
    when: (ctx) => owned(ctx, (p) => p.good === 'olive_oil').length >= 1,
    title: 'The olives',
    text: (ctx) => 'It is an off year for the olives, which everyone knew it would be, which does '
      + 'not stop it being a hard one for the presses that borrowed against it.',
  },
  {
    id: 'amb_flocks_north', kind: 'note', maxYear: 1799, season: 'heat',
    title: 'The flocks move',
    text: (ctx) => 'The flocks have gone up to the summer grazing three weeks early and the '
      + 'shepherds are saying the same thing they said the year before the bad one.',
  },
  {
    id: 'amb_quarry', kind: 'econ', maxYear: 1799,
    when: (ctx) => rich(ctx),
    title: 'The quarry',
    text: (ctx) => 'The quarry above ' + capitalName(ctx) + ' has opened a new face and the master '
      + 'mason has been asking questions about what exactly it is for, which he has not been answered.',
  },
  {
    id: 'amb_plague_elsewhere', kind: 'note', maxYear: 1799,
    title: 'Sickness abroad',
    when: (ctx) => !!otherCourt(ctx, 4),
    text: (ctx) => 'There is sickness in the ports of ' + (otherCourt(ctx, 4) || 'the north')
      + ' and the harbour masters here have started asking ships where they have been. Nobody has '
      + 'the authority to turn one away and everyone is behaving as though somebody does.',
  },
  {
    id: 'amb_deserters', kind: 'war', maxYear: 1799,
    when: (ctx) => atWar(ctx),
    title: 'Men are going home',
    text: (ctx) => 'Three men from one village walked away from the muster in the night and were '
      + 'back at their own threshing by the end of the week. Nobody has come for them yet.',
  },
  {
    id: 'amb_war_rumour', kind: 'war', maxYear: 1799, weight: 2,
    when: (ctx) => atWar(ctx),
    title: 'The rumour',
    text: (ctx) => 'A rumour went round the city at noon that the army had been destroyed, and was '
      + 'contradicted by four in the afternoon. The price of grain did not come back down.',
  },
  {
    id: 'amb_wounded_home', kind: 'war', maxYear: 1799,
    when: (ctx) => atWar(ctx),
    title: 'They are coming back',
    text: (ctx) => 'The first carts of wounded came into ' + capitalName(ctx) + ' by the north gate '
      + 'at dusk, which is the hour they are always brought in, and everyone knows why.',
  },
  {
    id: 'amb_peace_dividend', kind: 'econ', maxYear: 1799,
    when: (ctx) => atPeace(ctx) && rich(ctx),
    title: 'A quiet year',
    text: (ctx) => 'Nothing whatever happened this month, which the chronicler has recorded in those '
      + 'words, and which the treasury regards as the best month it has had in years.',
  },

  // ── 1948: the same country, a wire service ───────────────────────────────
  {
    id: 'amb_m_radio', kind: 'note', minYear: 1900, weight: 3,
    title: 'On the wireless',
    text: (ctx) => 'The evening bulletin ran nine minutes and spent four of them on a statement from '
      + 'abroad that said nothing, which everyone listened to twice in case it did.',
  },
  {
    id: 'amb_m_convoy', kind: 'war', minYear: 1900, weight: 2,
    when: (ctx) => atWar(ctx),
    title: 'The convoy is through',
    text: (ctx) => 'The convoy got through at four in the morning with two vehicles fewer than it '
      + 'started with. Nobody at this end has asked which two.',
  },
  {
    id: 'amb_m_immigrants', kind: 'econ', minYear: 1900, weight: 2,
    title: 'A ship is in',
    text: (ctx) => 'Eight hundred came off the boat at dawn, and by the evening the camp at '
      + capitalName(ctx) + ' had run out of blankets, cots and forms, in that order.',
  },
  {
    id: 'amb_m_press', kind: 'diplo', minYear: 1900, weight: 2,
    when: (ctx) => !!otherCourt(ctx, 3),
    title: 'In the foreign press',
    text: (ctx) => 'A correspondent for a paper in ' + (otherCourt(ctx, 3) || 'abroad') + ' has filed '
      + 'nine hundred words from a hotel balcony about a battle that took place forty miles away.',
  },
  {
    id: 'amb_m_ration', kind: 'econ', minYear: 1900,
    when: (ctx) => broke(ctx) || atWar(ctx),
    title: 'The ration',
    text: (ctx) => 'The egg ration has gone from three a week to two, and the announcement managed '
      + 'not to use the word egg once.',
  },
  {
    id: 'amb_m_orchestra', kind: 'note', minYear: 1900,
    when: (ctx) => atPeace(ctx),
    title: 'A concert',
    text: (ctx) => 'The orchestra played in a hall with the windows taped and a full house. The '
      + 'programme was announced as unchanged, which was the point of the programme.',
  },
  {
    id: 'amb_m_scrap', kind: 'econ', minYear: 1900,
    when: (ctx) => atWar(ctx),
    title: 'The workshops',
    text: (ctx) => 'A workshop behind ' + capitalName(ctx) + ' has turned out its four hundredth '
      + 'something-or-other this month. What it is, is not printed. That it is four hundred, is.',
  },
  {
    id: 'amb_m_border_shots', kind: 'war', minYear: 1900, weight: 2,
    title: 'Firing on the line',
    text: (ctx) => 'There was firing on the line for eleven minutes last night and both sides have '
      + 'filed a complaint about who began it, each timed to the minute and each a different minute.',
  },
  {
    id: 'amb_m_water_pipe', kind: 'econ', minYear: 1900,
    when: (ctx) => owned(ctx).length >= 4,
    title: 'The pipeline',
    text: (ctx) => 'Another six kilometres of the line went in this month, laid by a gang working '
      + 'two shifts, and the engineer has stopped answering questions about the finishing date.',
  },
  {
    id: 'amb_m_telegram', kind: 'diplo', minYear: 1900,
    when: (ctx) => !!otherCourt(ctx, 6),
    title: 'A telegram',
    text: (ctx) => 'A telegram from the foreign ministry of ' + (otherCourt(ctx, 6) || 'a neighbour') + ' arrived in '
      + 'clear rather than in cipher, which the ministry has decided was a message in itself.',
  },
  {
    id: 'amb_m_bus', kind: 'note', minYear: 1900, weight: 2,
    title: 'The line is running again',
    text: (ctx) => 'The bus to ' + capitalName(ctx) + ' ran on its timetable for the first time in '
      + 'five weeks. The driver has been congratulated by strangers.',
  },
  {
    id: 'amb_m_census', kind: 'econ', minYear: 1900,
    when: (ctx) => atPeace(ctx),
    title: 'The figures are published',
    text: (ctx) => 'The statistical office has published a figure for the population and immediately '
      + 'published a second figure explaining what the first one does and does not count.',
  },
  {
    id: 'amb_m_cinema', kind: 'note', minYear: 1900,
    title: 'At the cinema',
    text: (ctx) => 'The newsreel at the cinema in ' + capitalName(ctx) + ' showed forty seconds of a '
      + 'street everyone in the audience recognised, and the audience said so, loudly, all the way through.',
  },
  {
    id: 'amb_m_union', kind: 'econ', minYear: 1900,
    when: (ctx) => broke(ctx) || atPeace(ctx),
    title: 'The federation meets',
    text: (ctx) => 'The labour federation has met for eleven hours and issued a resolution that '
      + 'commits it to a position it already held, which both sides are describing as a victory.',
  },
  {
    id: 'amb_m_smuggled', kind: 'war', minYear: 1900, weight: 2,
    when: (ctx) => atWar(ctx),
    title: 'A crate comes ashore',
    text: (ctx) => 'Something came off a boat at night on an unlit beach and was in three lorries '
      + 'before dawn. Nobody at the port has any record of a boat.',
  },
  {
    id: 'amb_m_broadcast_enemy', kind: 'war', minYear: 1900, weight: 2,
    when: (ctx) => atWar(ctx) && !!otherCourt(ctx, 1),
    title: 'The other station',
    text: (ctx) => 'The station in ' + (otherCourt(ctx, 1) || 'the neighbouring capital') + ' announced '
      + 'this evening that a town had fallen. People here went and looked at it. It had not.',
  },
  {
    id: 'amb_m_kibbutz', kind: 'econ', minYear: 1900,
    when: (ctx) => owned(ctx).length >= 5,
    title: 'A new settlement',
    text: (ctx) => {
      const p = someProv(ctx, (q) => q.terrain === 'drylands' || q.terrain === 'desert' || q.terrain === 'farmland', 4);
      return 'Forty people put up a tower and a stockade at ' + ((p && p.name) || 'the edge of the map')
        + ' between dusk and dawn, which is the whole point of doing it between dusk and dawn.';
    },
  },
  {
    id: 'amb_m_fuel', kind: 'econ', minYear: 1900,
    when: (ctx) => atWar(ctx) || broke(ctx),
    title: 'Fuel',
    text: (ctx) => 'The petrol allocation has been cut again and the queue at the pump in '
      + capitalName(ctx) + ' now forms before the pump opens, which everyone agrees is not a queue '
      + 'but a different thing with a name nobody wants to use.',
  },
  {
    id: 'amb_m_hospital', kind: 'note', minYear: 1900,
    when: (ctx) => atWar(ctx),
    title: 'At the hospital',
    text: (ctx) => 'The hospital at ' + capitalName(ctx) + ' has put beds in the corridor and then in '
      + 'the lecture room. The blood donors queue round the building and are turned away in the afternoon.',
  },
  {
    id: 'amb_m_mail', kind: 'note', minYear: 1900,
    title: 'The post',
    text: (ctx) => 'Two sacks of mail that went missing in the spring have turned up, and the post '
      + 'office is delivering four-month-old letters with an apology printed on a slip.',
  },
  {
    id: 'amb_m_archaeology', kind: 'faith', minYear: 1900,
    when: (ctx) => atPeace(ctx),
    title: 'Something is dug up',
    text: (ctx) => {
      const p = someProv(ctx, null, 8);
      return 'A bulldozer at ' + ((p && p.name) || capitalName(ctx)) + ' has gone through a floor that '
        + 'turns out to be eighteen hundred years old. Work has stopped. Two ministries are writing letters.';
    },
  },
  {
    id: 'amb_m_border_farm', kind: 'war', minYear: 1900,
    title: 'On the other side of the wire',
    text: (ctx) => 'A farmer whose land is bisected by the line has been ploughing right up to it '
      + 'all week, watched from two directions by men who have been told to watch him and given no '
      + 'instructions beyond that.',
  },
];
