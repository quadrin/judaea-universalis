// Judaea Universalis — the world beside the yoke, 597–450 BCE (SPEC §268).
// Content package. Zero imports; effects run through ctx.helpers.
//
// The sixth century is the one in which the ancient Near East stops being a
// collection of kingdoms and becomes a single empire, and it happens in twenty
// years to people who did not see it coming. Babylon eats the Levant; Lydia
// invents money and loses everything to a man nobody had heard of; Egypt hires
// Greeks and holds out longest; and then one Persian house takes the whole map
// this game is drawn on, from the Aegean to the Indus, and keeps it for two
// hundred years.
//
// Sources: the Babylonian Chronicle (ABC 5-7); the Nabonidus Chronicle and the
// Verse Account; the Cyrus Cylinder; the Behistun inscription; Herodotus I and
// III; Josephus, Against Apion I.21 (Menander on the siege of Tyre); the
// Elephantine papyri.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_597bce_world] ' + key, e || '');
}

function guard(key, fn) {
  return function (ctx) {
    try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); }
  };
}

function P(ctx) { return ctx.game.playerTag; }

function mod(ctx, id, name, effects, months) {
  ctx.helpers.addTagModifier(ctx, P(ctx), {
    id, name, months: Number.isFinite(months) ? months : -1, effects,
  });
}

function tagMod(ctx, tag, id, name, effects, months) {
  try {
    ctx.helpers.addTagModifier(ctx, tag, {
      id, name, months: Number.isFinite(months) ? months : -1, effects,
    });
  } catch (e) { warnOnce('tagMod:' + id, e); }
}

function opinion(ctx, from, of, delta) {
  try {
    const t = ctx.game.tags && ctx.game.tags[from];
    if (!t) return;
    if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
    t.opinion[of] = Math.max(-200, Math.min(200, (t.opinion[of] || 0) + delta));
  } catch (e) { warnOnce('opinion', e); }
}

// ---- when an empire falls, the map says so (SPEC §277) ---------------------
// This package used to narrate the sixth century and change nothing on it.
// Babylon "fell" in 539 and kept all fifty-two of its provinces; the card
// applied a −65% modifier to the dead empire and a +25% one to the live one,
// which is a stat line where an event should be. These two helpers are the
// §111 rule the 167 packages already keep: a world card rearranges what
// history rearranged, and never confiscates what the player took.

function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[tag];
  return !!(t && t.alive !== false);
}

// A scripted fall names the heir the history gave the ground to, and the heir
// is sometimes already gone (SPEC §282). The AI's Assyria eats Babylonia in
// the 620s in most campaigns; 612 then has nobody to hand Mesopotamia to, the
// card refuses, and Assyria ends the chapter larger than it started — which is
// exactly the "the empires never fall" report this helper exists to answer.
//
// The heir is not being invented. The Chaldean dynasty rising out of Babylon
// is what the card is ABOUT, and a court that holds ground is alive again on
// the next tick anyway (`updateTagLife`). So raise it, give it the floor a
// restored court gets, and let the cession run. Two courts are never raised:
// one the world has no entry for at all, and the player's own, because a
// human chair that has fallen is a finished campaign and not a piece of
// world news.
function raise(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[tag];
  if (!t) return false;
  if (t.alive !== false) return true;
  if (ctx.game.playerTag === tag) return false;
  try {
    t.alive = true;
    t.overlord = null;
    t.atWarWith = [];
    t.warExhaustion = 0;
    if (!Number.isFinite(t.stability) || t.stability < 0) t.stability = 0;
    t.legitimacy = Math.max(Number(t.legitimacy) || 0, 50);
    t.treasury = Math.max(Number(t.treasury) || 0, 25);
    return true;
  } catch (e) { warnOnce('raise:' + tag, e); return false; }
}

// Hand one court's remaining ground to another. Only ground the NAMED loser
// still owns moves: a province the player (or anybody else) has taken off it
// belongs to whoever took it, and a card three hundred miles away does not
// get to hand it to Persia. Returns how many provinces changed hands.
function cede(ctx, fromTag, toTag) {
  const g = ctx.game;
  if (!alive(ctx, fromTag) || !raise(ctx, toTag) || fromTag === toTag) return 0;
  // Never the player's own court. `endCourt` refuses it and this is the path
  // that walked around the refusal: a chapter that seats a human in Babylon
  // would have had the empire confiscated out from under them by a card
  // describing what happened to somebody else's Babylon.
  if (g.playerTag === fromTag) return 0;
  let n = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== fromTag) continue;
    try { ctx.helpers.changeOwner(ctx, p.canon || p.name, toTag); n++; }
    catch (e) { warnOnce('cede:' + fromTag + '>' + toTag, e); }
  }
  return n;
}

// The court stops existing and everything still standing under it — ground,
// armies, wars, the forwarding address — passes to the heir. Never the
// player's own chair: `dissolveTagCore` would move the player rather than
// delete them, which is correct engine behaviour and the wrong thing for a
// piece of world news to do without being asked.
function endCourt(ctx, dyingTag, heirTag) {
  if (!alive(ctx, dyingTag) || !raise(ctx, heirTag)) return false;
  if (ctx.game.playerTag === dyingTag) return false;
  try { return !!ctx.helpers.dissolveTag(ctx, dyingTag, heirTag); }
  catch (e) { warnOnce('endCourt:' + dyingTag, e); return false; }
}

function chronicleOnly(id, title, date, desc, historical, label, tooltip, effect, worldLabel) {
  return {
    id, title, worldLabel, desc, historical,
    forTag: 'both', date, world: true, aiOption: 0,
    options: [{ label, tooltip, effects: guard(id, effect) }],
  };
}

export const EVENTS_597_WORLD = [

  chronicleOnly(
    'ev597w_the_siege_of_tyre', 'Thirteen Years Before Tyre',
    { y: -585, m: 4 },
    'The king of Babylon has sat down in front of Tyre and is going to be there for thirteen '
      + 'years. The old city on the mainland went in a season; the new one is on an island '
      + 'half a mile offshore with a fleet, and no army in the world has yet worked out how '
      + 'to besiege an island.\n\nHis men have gone bald from carrying baskets and rubbed the '
      + 'skin off their shoulders, says a later prophecy, and he had no wages for his army '
      + 'from Tyre for the service he served against it. What it buys everybody else on this '
      + 'coast is thirteen years in which the largest army in the world is looking at a '
      + 'harbour.',
    'Josephus (Against Apion I.21), citing the Tyrian records, gives thirteen years for the siege; Ezekiel 29:18 complains that Nebuchadnezzar got nothing out of it.',
    'Use the years',
    '+50 governance points and "The Years at Tyre" (−0.8 unrest everywhere, +8% income) for fifteen years: the empire\'s field army is committed to a harbour.',
    (ctx) => {
      const h = ctx.helpers;
      const me = P(ctx);
      h.adjust(ctx, me, { gov: 50 });
      mod(ctx, 'the_years_at_tyre', 'The Years at Tyre', { unrestAll: -0.8, incomeMult: 1.08 }, 180);
      tagMod(ctx, 'BBL', 'the_baskets_and_the_shoulders', 'The Baskets and the Shoulders', {
        manpowerMult: 0.88, incomeMult: 0.92,
      }, 156);
      tagMod(ctx, 'TYR', 'the_island_holds', 'The Island Holds', { siegeMult: 1.4, navalMult: 1.1 }, 156);
      h.chronicle(ctx, 'era', 'Babylon sits down in front of Tyre and stays for thirteen years, '
        + 'and gets nothing for it but bald heads and worn shoulders.');
    },
    'Nebuchadnezzar besieges Tyre for thirteen years'),

  chronicleOnly(
    'ev597w_the_king_at_tayma', 'The King Who Went to the Desert',
    { y: -552, m: 6 },
    'The king of Babylon has left Babylon. Not on campaign — he has moved, with the court '
      + 'and the treasury, to an oasis in the north Arabian desert, and has been there for '
      + 'years, and shows no sign of coming back. He has left his son in charge of the '
      + 'capital, which means the new year festival cannot be performed, because the king '
      + 'has to take the god\'s hand and the king is nine hundred miles away in a date '
      + 'grove.\n\n'
      + 'The priesthood of Marduk is writing things down about him that will be quoted '
      + 'against him by whoever takes the city next. An empire whose capital cult has been '
      + 'suspended for a decade is an empire with an open door.',
    'Nabonidus spent roughly ten years at Tayma; the Nabonidus Chronicle records year after year that the king did not come and the akitu festival was not held.',
    'Note the open door, and write to the priesthood of Marduk',
    '+40 influence points and "The Festival Not Held" (−0.6 unrest everywhere) for fifteen years; Babylon\'s grip loosens on everybody.',
    (ctx) => {
      const h = ctx.helpers;
      const me = P(ctx);
      h.adjust(ctx, me, { infl: 40 });
      mod(ctx, 'the_festival_not_held', 'The Festival Not Held', { unrestAll: -0.6 }, 180);
      tagMod(ctx, 'BBL', 'the_king_at_tayma', 'The King at Tayma', {
        legitimacyAdd: -0.35, incomeMult: 0.9, unrestAll: 0.6,
      }, -1);
      opinion(ctx, 'QDR', 'BBL', -40);
      h.chronicle(ctx, 'era', 'The king of Babylon is at an oasis in the Arabian desert and the '
        + 'new year festival has not been performed for years. The priesthood of Marduk is '
        + 'keeping notes.');
    },
    'Nabonidus abandons Babylon for the desert'),

  chronicleOnly(
    'ev597w_croesus_crosses_the_halys', 'A Great Empire Will Fall',
    { y: -547, m: 5 },
    'The king of Lydia — the richest man anybody in this world has heard of, who has just '
      + 'sent Delphi more gold than the shrine has ever received from anyone — asked the '
      + 'oracle whether he should attack the Persians, and was told that if he crossed the '
      + 'river he would destroy a great empire. He has crossed the river.\n\n'
      + 'The Persian did not go into winter quarters as everybody expected. He followed, '
      + 'caught the Lydian army disbanded for the season, put camels in front of his line '
      + 'because horses will not face the smell, and took Sardis in fourteen days.',
    'Herodotus I.53-91. Cyrus took Sardis c. 547-546; the Nabonidus Chronicle records a campaign across the Tigris in that year.',
    'Understand that a new kind of thing has appeared',
    '+40 martial points and "The Fourteen Days" (+8% morale, +1 fort defence) for twenty years. Lydia is finished and the Persian has the whole of Anatolia and its money.',
    (ctx) => {
      const h = ctx.helpers;
      const me = P(ctx);
      h.adjust(ctx, me, { mar: 40 });
      mod(ctx, 'the_fourteen_days', 'The Fourteen Days', { moraleMult: 1.08, fortDefBonus: 1 }, 240);
      // Lydia is finished (SPEC §277), and the tooltip has said so all along:
      // the Persian has the whole of Anatolia AND ITS MONEY. Until this line
      // Croesus kept governing seven provinces at −60% strength for ever.
      const lydia = ctx.game.provinces.filter((q) => q && !q.impassable && q.owner === 'LYD').length;
      endCourt(ctx, 'LYD', 'PAS');
      tagMod(ctx, 'PAS', 'the_lydian_treasury', 'The Lydian Treasury', {
        incomeMult: 1.3, milPowerMult: 1.12,
      }, -1);
      if (lydia) h.chronicle(ctx, 'era', 'The kingdom of Lydia ends: ' + lydia
        + ' provinces of Anatolia answer to Persia.');
      h.chronicle(ctx, 'era', 'The Persian takes Sardis in fourteen days and with it the richest '
        + 'treasury in the world. The oracle is held to have been technically correct.');
    },
    'Cyrus takes Sardis and destroys Lydia'),

  chronicleOnly(
    'ev597w_babylon_falls', 'The Night the Gates Were Opened',
    { y: -539, m: 10 },
    'Babylon has fallen and nobody had to break anything. The Persian beat the field army at '
      + 'Opis, took Sippar without a battle two days later, and his general walked into '
      + 'Babylon without fighting, because the gates were opened from inside by people who '
      + 'had had a decade of a king who would not come home and perform the festival.\n\n'
      + 'The new master of the world entered a fortnight later in state, restored the '
      + 'festival, returned the gods the previous administration had collected into the '
      + 'capital to their own cities, and issued a general policy about deported peoples and '
      + 'their sanctuaries. The largest empire that has ever existed changed hands with, so '
      + 'far as anybody can tell, no damage to the buildings.',
    'The Nabonidus Chronicle for 539 and the Cyrus Cylinder. Babylon was taken on 12 October and Cyrus entered on 29 October.',
    'Send an embassy to the new king at once',
    '+60 influence points, +25 legitimacy and "A New Master of the World" (−1.5 unrest everywhere, +10% income) for thirty years. Everything about this country\'s position has just changed.',
    (ctx) => {
      const h = ctx.helpers;
      const me = P(ctx);
      h.adjust(ctx, me, { infl: 60, legitimacy: 25 });
      mod(ctx, 'a_new_master_of_the_world', 'A New Master of the World', {
        unrestAll: -1.5, incomeMult: 1.1,
      }, 360);
      // The empire actually changes hands (SPEC §277). The largest empire that
      // has ever existed changed hands in October 539 with no damage to the
      // buildings — and until this line it changed hands on the map not at
      // all: Babylon kept every one of its fifty-two provinces and wore a
      // −65% modifier to explain why it no longer mattered. The overlord line
      // below still runs, because a client of Babylon is Persia's client the
      // moment the gates open, and `dissolveTag` moves the ground, the armies,
      // the wars and the forwarding address with it.
      const before = ctx.game.provinces.filter((p) => p && !p.impassable && p.owner === 'BBL').length;
      try {
        const t = ctx.game.tags[me];
        if (t && t.overlord === 'BBL') t.overlord = 'PAS';
      } catch (e) { warnOnce('babylon:vassal', e); }
      const fell = endCourt(ctx, 'BBL', 'PAS');
      if (!fell) cede(ctx, 'BBL', 'PAS'); // the player's own chair, or no Persia
      tagMod(ctx, 'PAS', 'the_empire_of_cyrus', 'The Empire of Cyrus', {
        milPowerMult: 1.25, incomeMult: 1.3, manpowerMult: 1.25,
      }, -1);
      opinion(ctx, 'PAS', me, 40);
      h.setFlag(ctx, 'babylonFallen', true);
      h.chronicle(ctx, 'era', 'Babylon is taken without a fight and the gods the empire collected '
        + 'are sent back to their own cities. A general policy is issued about deported peoples '
        + 'and their sanctuaries.'
        + (before ? ' ' + before + ' provinces answer to Persia by the end of the month.' : ''));
    },
    'Cyrus takes Babylon and issues the restoration policy'),

  chronicleOnly(
    'ev597w_cambyses_takes_egypt', 'The Last Kingdom',
    { y: -525, m: 5 },
    'Egypt has fallen. The Persian crossed the Sinai with water supplied by an Arab king, '
      + 'beat the Egyptian army and its Greek mercenaries at Pelusium, and took Memphis after '
      + 'a short siege. The Pharaoh had reigned six months.\n\n'
      + 'Every state that existed when this chapter opened is now a province of one empire. '
      + 'There is no independent kingdom anywhere between the Aegean and the Indus, and the '
      + 'only question any of them can still answer for themselves is what kind of province '
      + 'to be.',
    'Cambyses took Egypt in 525; Herodotus III.1-16 gives the campaign, the Arab water supply and the fate of Psamtik III.',
    'Note that there is only one court left to petition',
    '+40 governance points and "One Empire, One Petition" (−0.8 unrest everywhere, +8% income) for thirty years.',
    (ctx) => {
      const h = ctx.helpers;
      const me = P(ctx);
      h.adjust(ctx, me, { gov: 40 });
      mod(ctx, 'one_empire_one_petition', 'One Empire, One Petition', {
        unrestAll: -0.8, incomeMult: 1.08,
      }, 360);
      tagMod(ctx, 'MIZ', 'the_satrapy_of_egypt', 'The Satrapy of Egypt', {
        milPowerMult: 0.5, incomeMult: 0.6, manpowerMult: 0.5,
      }, -1);
      // A SATRAPY, not a deletion (SPEC §277). Egypt keeps its name, its land
      // and its temples under Persian rule and revolts repeatedly — Inaros
      // raises it again in 463 in this chapter's own Persian package — so the
      // thing that changes is who it answers to, which is what the chronicle
      // line below has always claimed and what the map never showed.
      try {
        const egy = ctx.game.tags.MIZ;
        if (egy && egy.alive !== false && ctx.game.tags.PAS && ctx.game.playerTag !== 'MIZ') {
          egy.overlord = 'PAS';
        }
      } catch (e) { warnOnce('cambyses:satrapy', e); }
      h.chronicle(ctx, 'era', 'Egypt becomes a satrapy. There is no independent kingdom left '
        + 'between the Aegean and the Indus.');
    },
    'Cambyses conquers Egypt'),

  chronicleOnly(
    'ev597w_the_royal_road', 'The Road and the Post',
    { y: -515, m: 6 },
    'The new administration has finished something that changes what an empire is. A '
      + 'surfaced road runs from Sardis to Susa — one thousand six hundred and seventy-seven '
      + 'miles, with a posting station and fresh horses every fourteen miles, and riders who '
      + 'hand the bag on without dismounting. A message that took three months takes seven '
      + 'days.\n\n'
      + 'With it comes the rest: a satrapy system with a governor, a separate military '
      + 'commander and a royal secretary who all report separately; a standard coinage; a '
      + 'standard chancery language, which is Aramaic, and which every scribe in this country '
      + 'already writes.',
    'Herodotus V.52-54 and VIII.98 describe the road and the angareion; the Persian administration standardised Aramaic as the imperial chancery language across the whole empire.',
    'Put our own scribes into the imperial chancery',
    '+50 influence points and "The Chancery Tongue" (+10% income, +1 diplomatic seat) permanently: the empire\'s working language is the one this country already writes.',
    (ctx) => {
      const h = ctx.helpers;
      const me = P(ctx);
      h.adjust(ctx, me, { infl: 50, gov: 30 });
      mod(ctx, 'the_chancery_tongue', 'The Chancery Tongue', { incomeMult: 1.1, diploSeats: 1 });
      h.chronicle(ctx, 'era', 'A road from Sardis to Susa with fresh horses every fourteen miles, '
        + 'a standard coinage, and a chancery that works in Aramaic — which every scribe in this '
        + 'country already writes.');
    },
    'The Persian road, post and chancery are established'),

  chronicleOnly(
    'ev597w_the_garrison_at_elephantine', 'A Temple on an Island in the Nile',
    { y: -495, m: 8 },
    'Merchants up from Egypt report something the court has trouble believing. On an island '
      + 'in the Nile at the first cataract there is a garrison of Jewish soldiers who have '
      + 'been there since before the Persians came, in the pay first of Pharaoh and now of '
      + 'the satrap — and they have a temple. An actual temple, with an altar, with '
      + 'sacrifices, to the God of this country, nine hundred miles from Jerusalem.\n\n'
      + 'They write letters to the High Priest here and to the governor at Samaria in the '
      + 'same post, and they keep the passover by instructions that arrive from the Persian '
      + 'court. Nobody in Jerusalem knows what to do about them, and there is no rule that '
      + 'covers it.',
    'The Elephantine papyri: a Judean military colony with its own temple of YHW, correspondence with both Jerusalem and Samaria, and the "Passover Letter" of 419.',
    'Answer their letters and claim the jurisdiction',
    '+40 influence points and "The Dispersion Writes Home" (+8% income, +0.2 legitimacy a month) permanently — a centre that is consulted is a centre.',
    (ctx) => {
      const h = ctx.helpers;
      const me = P(ctx);
      h.adjust(ctx, me, { infl: 40, legitimacy: 12 });
      mod(ctx, 'the_dispersion_writes_home', 'The Dispersion Writes Home', {
        incomeMult: 1.08, legitimacyAdd: 0.2,
      });
      h.chronicle(ctx, 'era', 'A Jewish garrison on an island in the Nile with a temple of its '
        + 'own writes to Jerusalem for a ruling, and gets one. There is now a question about '
        + 'how many houses this god has, and it is being answered by post.');
    },
    'The Jewish garrison and temple at Elephantine'),

  chronicleOnly(
    'ev597w_marathon', 'The Greeks Refuse',
    { y: -490, m: 9 },
    'The empire sent a punitive expedition across the Aegean against two cities that had '
      + 'helped a revolt in Ionia, and it has been beaten in the field by one of them. Not '
      + 'delayed — beaten, by heavy infantry in a line, charging at a run across the last '
      + 'eight hundred yards to get under the archery.\n\n'
      + 'The strategic significance is nil: the empire is not smaller this morning. The '
      + 'significance everywhere else is enormous, because for the first time since Cyrus '
      + 'crossed the Halys somebody has said no to the king of the world and been standing '
      + 'afterwards. Every province in the empire hears about it.',
    'Herodotus VI.94-120. Marathon, September 490; the Persian force withdrew and returned in strength ten years later.',
    'Note that the king of the world can be refused',
    '+40 martial points and "It Can Be Refused" (+8% morale, +0.5 unrest everywhere) for twenty-five years.',
    (ctx) => {
      const h = ctx.helpers;
      const me = P(ctx);
      h.adjust(ctx, me, { mar: 40 });
      mod(ctx, 'it_can_be_refused', 'It Can Be Refused', { moraleMult: 1.08, unrestAll: 0.5 }, 300);
      tagMod(ctx, 'GRC', 'the_line_at_marathon', 'The Line at Marathon', {
        moraleMult: 1.15, milPowerMult: 1.1,
      }, -1);
      h.chronicle(ctx, 'era', 'A Persian expedition is beaten in the field by heavy infantry from '
        + 'one city. The empire is not smaller; the news travels anyway.');
    },
    'Athens defeats a Persian expedition at Marathon'),

  chronicleOnly(
    'ev597w_the_cupbearers_commission', 'A Commission From the Cupbearer',
    { y: -445, m: 4 },
    'A Jew who holds one of the most intimate offices at the Persian court — he hands the '
      + 'king his wine, which means he is trusted with the king\'s life daily — has asked '
      + 'for and received a commission: letters to the governors beyond the river, timber '
      + 'from the royal forest, an escort of cavalry, and leave to go and rebuild the city '
      + 'of his fathers\' sepulchres.\n\n'
      + 'He has ridden round the ruins by night to survey them without telling anybody, '
      + 'called the elders together, and started. The wall goes up in fifty-two days, with '
      + 'every man building with one hand and holding a weapon in the other, and the '
      + 'neighbours write to the king about it and are ignored, because the man doing it is '
      + 'closer to the king than they are.',
    'Nehemiah 1-6: the commission in the twentieth year of Artaxerxes, the night survey, and the wall finished in fifty-two days.',
    'Give the commission everything it asks for',
    '+60 governance points, +30 legitimacy and "The Wall in Fifty-Two Days" (+1 fort defence, −1 unrest everywhere, +8% income) permanently.',
    (ctx) => {
      const h = ctx.helpers;
      const me = P(ctx);
      h.adjust(ctx, me, { gov: 60, legitimacy: 30 });
      mod(ctx, 'the_wall_in_fifty_two_days', 'The Wall in Fifty-Two Days', {
        fortDefBonus: 1, unrestAll: -1, incomeMult: 1.08,
      });
      try {
        const p = ctx.prov && ctx.prov('Jerusalem');
        if (p) {
          if (!Array.isArray(p.buildings)) p.buildings = [];
          if (p.buildings.indexOf('walls') === -1) p.buildings.push('walls');
        }
      } catch (e) { warnOnce('nehemiah:prov', e); }
      h.chronicle(ctx, 'era', 'The wall is finished in fifty-two days by men building with one '
        + 'hand and holding a weapon in the other. The province across the river writes to the '
        + 'king and is ignored.');
    },
    'Nehemiah rebuilds the wall of Jerusalem'),
];
