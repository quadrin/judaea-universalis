// Judaea Universalis — event chain: The Bar Kokhba Revolt, 132–136 CE.
// Content package. Zero imports; all effects run through ctx.helpers at runtime.
// Source spine: Cassius Dio LXIX.12-14; Eusebius, HE IV.6; the Murabbaʿat and
// Naḥal Ḥever letters; rabbinic tradition (Akiva, Betar). Dates map to the real
// chronology (30-day game months).

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_132ce] ' + key, e || '');
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
  const t = ctx.game.tags && ctx.game.tags[tag];
  return !!(t && t.alive !== false);
}

function findJudRomWar(game) {
  const wars = (game && game.wars) || [];
  for (const w of wars) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf('JUD') !== -1 && all.indexOf('ROM') !== -1) return w;
  }
  return null;
}

function warscoreOf(ctx, tag) {
  const w = findJudRomWar(ctx.game);
  if (!w || !w.warscore || typeof w.warscore !== 'object') return 0;
  const v = w.warscore[tag];
  return typeof v === 'number' ? v : 0;
}

// Scripted warscore swings persist in the war's eventScore side-bucket (see
// events_66ce.js for the rationale — updateWarscores rebuilds monthly).
function addWarscore(ctx, tag, amount) {
  try {
    const w = findJudRomWar(ctx.game);
    if (!w) return;
    if (!w.eventScore) w.eventScore = { att: 0, def: 0 };
    const side = (w.attackers || []).indexOf(tag) >= 0 ? 'att'
      : (w.defenders || []).indexOf(tag) >= 0 ? 'def' : null;
    if (side) w.eventScore[side] += amount;
  } catch (e) { warnOnce('addWarscore', e); }
}

// Add a province modifier to every ROM-owned province of the Jewish faith —
// the occupied heartland seething under the decrees.
function stirOccupiedJudaea(ctx, id, name, months, unrest) {
  const g = ctx.game;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== 'ROM' || p.religion !== 'judaism') continue;
    ctx.helpers.addProvinceModifier(ctx, p.name, { id, name, months, effects: { unrest } });
  }
}

export const EVENTS_132 = [
  // ── 1 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_aelia',
    title: 'Aelia Capitolina',
    requiresWar: ['JUD', 'ROM'],
    desc: 'The emperor\'s surveyors have run their plough over the Temple Mount, marking '
      + 'the sacred furrow of a Roman colony: Aelia Capitolina, with a temple of Jupiter '
      + 'where the House of the Lord once stood. It is not desecration by accident or by a '
      + 'soldier\'s torch, but by decree, with ceremony. In the hill villages, men who have '
      + 'spent ten years quietly digging armories look at one another and say: now.',
    forTag: 'both',
    date: { y: 132, m: 4 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The furrow is a wound',
        tooltip: 'Judaea: +10 legitimacy. Every Jewish province under Rome: +2 unrest for 24 months ("The Ploughed Mount").',
        effects: guard('ev2_aelia:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 10 });
          stirOccupiedJudaea(ctx, 'ploughed_mount', 'The Ploughed Mount', 24, 2);
        }),
      },
    ],
  },

  // ── 2 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_decrees',
    title: 'The Decrees',
    requiresWar: ['JUD', 'ROM'],
    desc: 'To the colony is added the edict: the covenant of circumcision is forbidden, '
      + 'listed by the jurists beside castration, as though the mark of Abraham were a '
      + 'mutilation. The synagogues read the decree aloud in silence. There is no argument '
      + 'to be had with it — which is precisely why every man knows what comes instead.',
    forTag: 'both',
    date: { y: 132, m: 6 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'What the Law forbids to abandon',
        tooltip: 'Judaea: +5 legitimacy. Jewish provinces under Rome: +1 unrest for 36 months ("The Decrees").',
        effects: guard('ev2_decrees:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 5 });
          stirOccupiedJudaea(ctx, 'the_decrees', 'The Decrees', 36, 1);
        }),
      },
    ],
  },

  // ── 3 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_prince_of_israel',
    title: 'A Star Out of Jacob',
    requiresWar: ['JUD', 'ROM'],
    desc: 'Rabbi Akiva, the greatest of the sages, has seen Simon bar Kosiba and quoted '
      + 'Balaam\'s oracle: "A star shall come out of Jacob" — bar Kokhba, Son of the Star. '
      + 'Other sages answer that grass will grow from Akiva\'s chin before the son of David '
      + 'comes. The Nasi himself is said to pray more plainly: Lord, you need not help us — '
      + 'only do not shame us.',
    forTag: 'JUD',
    date: { y: 132, m: 5 },
    major: true,
    aiOption: 1,
    options: [
      {
        label: 'Embrace the name: Bar Kokhba',
        tooltip: '+15 legitimacy — and a claim that cannot survive defeat. "Son of the Star": +10% morale for 24 months.',
        effects: guard('ev2_prince_of_israel:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 15 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'son_of_the_star', name: 'Son of the Star', months: 24,
            effects: { moraleMult: 1.1 },
          });
          h.setFlag(ctx, 'messianicClaim', true);
        }),
      },
      {
        label: 'Prince, not messiah',
        tooltip: 'Rule by administration, not oracle: +1 stability.',
        effects: guard('ev2_prince_of_israel:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { stability: 1 });
        }),
      },
    ],
  },

  // ── 4 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_rufus_response',
    title: 'The Governor Strikes Back',
    requiresWar: ['JUD', 'ROM'],
    desc: 'Tineius Rufus has two legions on paper and rather less in fact, and a province '
      + 'where every road now runs through hostile hills. His officers urge reprisals — '
      + 'the old grammar of empire. His engineers urge camps, walls, and patience until '
      + 'the emperor sends more than letters.',
    forTag: 'ROM',
    date: { y: 132, m: 7 },
    aiOption: 1,
    options: [
      {
        label: 'Make examples',
        tooltip: 'Terror now, hatred later: Judaea -5 legitimacy, but every Jewish province under Rome +2 unrest for 12 months.',
        effects: guard('ev2_rufus_response:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { legitimacy: -5 });
          stirOccupiedJudaea(ctx, 'reprisals', 'Reprisals', 12, 2);
        }),
      },
      {
        label: 'Camps, walls, patience',
        tooltip: 'Hold what can be held: +25 martial points.',
        effects: guard('ev2_rufus_response:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ROM', { mar: 25 });
        }),
      },
    ],
  },

  // ── 5 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_galilee_quiet',
    title: 'Galilee Does Not Rise',
    requiresWar: ['JUD', 'ROM'],
    desc: 'The messengers went north with the Nasi\'s letters and came back with courtesies. '
      + 'Galilee remembers Jotapata and Tarichaea — sixty years is nothing in these hills — '
      + 'and its towns have made their peace with the world as it is. The war will be won '
      + 'or lost in Judea proper.',
    forTag: 'both',
    date: { y: 132, m: 9 },
    aiOption: 0,
    options: [
      {
        label: 'The north keeps its counsel',
        tooltip: 'Rome: +10 governance points — one front, not two.',
        effects: guard('ev2_galilee_quiet:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'ROM', { gov: 10 });
        }),
      },
    ],
  },

  // ── 6 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_legion_lost',
    title: 'A Legion Struck from the Rolls',
    requiresWar: ['JUD', 'ROM'],
    desc: 'The Twenty-Second, Deiotariana, marched up from Egypt into the hill country and '
      + 'has not marched anywhere since. No battle is named; no eagle is displayed in '
      + 'triumph; the legion simply ceases to appear in the army lists, which is the way '
      + 'Rome admits what it will not say. In the hideouts they know the ravines where it '
      + 'happened, and they name them to each other like psalms.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev2_legion_lost', (ctx) =>
      alive(ctx, 'JUD') && warscoreOf(ctx, 'JUD') >= 12 && !dateGE(ctx, 134, 6)),
    aiOption: 0,
    options: [
      {
        label: 'Struck from the rolls',
        tooltip: 'Rome: -8,000 manpower, -10 legitimacy. Judaea: +5 war score, +25 martial points.',
        effects: guard('ev2_legion_lost:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ROM', { manpower: -8000, legitimacy: -10 });
          h.adjust(ctx, 'JUD', { mar: 25 });
          addWarscore(ctx, 'JUD', 5);
        }),
      },
    ],
  },

  // ── 7 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_hadrian_summons',
    title: 'Severus Is Sent For',
    requiresWar: ['JUD', 'ROM'],
    desc: 'Hadrian has stopped writing "I and the army are well" to the Senate, and has '
      + 'done something no emperor does lightly: pulled his best general off the edge of '
      + 'the world. Sextus Julius Severus leaves Britain with his staff and his methods, '
      + 'and detachments converge on the coast from every army between the Rhine and '
      + 'Egypt. Rome has decided to take the little war seriously.',
    forTag: 'both',
    date: { y: 133, m: 6 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The best general of the age',
        tooltip: 'Rome: Julius Severus (4/4/5) lands at Ptolemais with 20,000 men; 10,000 more at Caesarea; the provincial hesitation ends.',
        effects: guard('ev2_hadrian_summons:0', (ctx) => {
          const h = ctx.helpers;
          h.removeModifier(ctx, 'ROM', 'provincial_response');
          h.spawnArmy(ctx, 'ROM', 'Ptolemais', {
            inf: 17, cav: 3, name: 'Army of Julius Severus',
            general: { name: 'Julius Severus', fire: 4, shock: 4, maneuver: 5 },
          });
          h.spawnArmy(ctx, 'ROM', 'Caesarea Maritima', {
            inf: 9, cav: 1, name: 'Vexillations of the Danube',
            general: { name: 'Publicius Marcellus', fire: 2, shock: 3, maneuver: 2 },
          });
          h.setFlag(ctx, 'severusArrived', true);
        }),
      },
    ],
  },

  // ── 8 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_severus_method',
    title: 'The Method of Severus',
    requiresWar: ['JUD', 'ROM'],
    desc: 'Severus does not offer battle. He takes the war apart joint by joint: '
      + 'intercepting food, sealing wells, walling off districts, starving the hideouts '
      + 'cave by cave — slower than glory, and surer. Dio will write it plainly: he could '
      + 'crush them by hunger, since he dared not come to close quarters.',
    forTag: 'ROM',
    trigger: safeTrigger('ev2_severus_method', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'severusArrived') && dateGE(ctx, 134, 1)),
    aiOption: 0,
    options: [
      {
        label: 'Hunger is a siege engine',
        tooltip: '"The Severan Method": +1 siege bonus for 24 months; Judaea starves: -15% manpower for 24 months.',
        effects: guard('ev2_severus_method:0', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'ROM', {
            id: 'severan_method_ev', name: 'The Method of Severus', months: 24,
            effects: { siegeBonus: 1 },
          });
          h.addTagModifier(ctx, 'JUD', {
            id: 'starved_hills', name: 'Starved Hills', months: 24,
            effects: { manpowerMult: 0.85 },
          });
        }),
      },
      {
        label: 'The Senate wants a battle',
        tooltip: 'Force the pace: +25 martial points, +1 war exhaustion.',
        effects: guard('ev2_severus_method:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ROM', { mar: 25, warExhaustion: 1 });
        }),
      },
    ],
  },

  // ── 9 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_letters',
    title: 'Letters from the Nasi',
    requiresWar: ['JUD', 'ROM'],
    desc: 'His letters survive him: curt, practical, terrifying. "From Simon bar Kosiba: '
      + 'that you send the wheat, and if you do not, punishment will be exacted." "That '
      + 'you seize the men of Tekoa who repair their houses while the war is fought." He '
      + 'runs the revolt like an estate steward with a sword, and the hills obey.',
    forTag: 'JUD',
    date: { y: 132, m: 11 },
    aiOption: 0,
    options: [
      {
        label: 'Punishment will be exacted',
        tooltip: '"Iron Discipline": +5% discipline for 24 months — and -5 legitimacy among the weary.',
        effects: guard('ev2_letters:0', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'JUD', {
            id: 'iron_discipline', name: 'Iron Discipline', months: 24,
            effects: { disciplineMult: 1.05 },
          });
          h.adjust(ctx, 'JUD', { legitimacy: -5 });
        }),
      },
      {
        label: 'Feed the villages first',
        tooltip: 'Mercy is also policy: +5 legitimacy.',
        effects: guard('ev2_letters:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 5 });
        }),
      },
    ],
  },

  // ── 10 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_parthian_shadow',
    title: 'The Shadow on the Euphrates',
    desc: 'The King of Kings has let it be known — through merchants, which is how kings '
      + 'whisper — that the eastern bank of the Euphrates is very well garrisoned this '
      + 'year. Roman staff officers redo their arithmetic: every cohort sent to Judea is a '
      + 'cohort not watching Parthia, and Parthia has noticed.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev2_parthian_shadow', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'parthianSympathy') && warscoreOf(ctx, 'JUD') >= 20 && alive(ctx, 'PAR')),
    aiOption: 0,
    options: [
      {
        label: 'The East holds its breath',
        tooltip: 'Either Rome garrisons the river ("Eastern Anxiety": passive 6 months) — or the King of Kings crosses it.',
        effects: guard('ev2_parthian_shadow:0', (ctx) => {
          const h = ctx.helpers;
          if (ctx.rng.chance(0.35) && alive(ctx, 'PAR') && alive(ctx, 'ROM')) {
            h.declareWar(ctx, 'PAR', 'ROM', 'The Euphrates War');
            h.notify(ctx, {
              title: 'Parthia crosses the Euphrates',
              text: 'The arithmetic was right: the King of Kings has chosen his moment.',
              type: 'war',
            });
          } else {
            h.addTagModifier(ctx, 'ROM', {
              id: 'eastern_anxiety', name: 'Eastern Anxiety', months: 6,
              effects: { aiPassive: true },
            });
          }
        }),
      },
    ],
  },

  // ── 11 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_akiva',
    title: 'The Martyrdom of Akiva',
    requiresWar: ['JUD', 'ROM'],
    desc: 'They took the old sage at Caesarea and combed his flesh with iron combs, and he '
      + 'died reciting the Shema, drawing out the word "One" until the breath went with it. '
      + 'His students asked, even now? He answered: all my life I wondered when I would be '
      + 'given the chance to love with all my soul. The Romans meant it for terror. It will '
      + 'not work as terror.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev2_akiva', (ctx) =>
      alive(ctx, 'JUD') && dateGE(ctx, 134, 6) && warscoreOf(ctx, 'ROM') >= 10),
    aiOption: 0,
    options: [
      {
        label: 'Hear, O Israel',
        tooltip: 'Judaea: -10 legitimacy (the sage is gone), but "The Sanctified Name": +10% morale for 18 months.',
        effects: guard('ev2_akiva:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: -10 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'sanctified_name', name: 'The Sanctified Name', months: 18,
            effects: { moraleMult: 1.1 },
          });
        }),
      },
    ],
  },

  // ── 12 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_betar',
    title: 'The Rock of Betar',
    requiresWar: ['JUD', 'ROM'],
    desc: 'What is left of the rising has gathered onto one spur of rock southwest of '
      + 'Jerusalem, where the Nasi holds his last court behind walls the engineers circle '
      + 'patiently with a wall of their own. The tradition will remember that Betar fell '
      + 'on the Ninth of Av, the day of the two Temples, and that the horses waded to '
      + 'their bridles. Inside, tonight, they still hold.',
    forTag: 'JUD',
    major: true,
    trigger: safeTrigger('ev2_betar', (ctx) => {
      if (!alive(ctx, 'JUD')) return false;
      const provs = ctx.helpers.countControlled(ctx, 'JUD', {});
      return provs > 0 && provs <= 2 && !ctx.helpers.controls(ctx, 'JUD', 'Jerusalem') && dateGE(ctx, 134, 1);
    }),
    aiOption: 0,
    options: [
      {
        label: 'Hold the rock',
        tooltip: '"Last Stand": +15% morale for 12 months. There is nowhere further to go.',
        effects: guard('ev2_betar:0', (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'JUD', {
            id: 'last_stand', name: 'Last Stand', months: 12,
            effects: { moraleMult: 1.15 },
          });
        }),
      },
    ],
  },

  // ── 13 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_redemption_peace',
    title: 'For the Freedom of Jerusalem',
    desc: 'The couriers ride out with a sentence nobody in the province can quite believe: '
      + 'the war is over, and Israel stands. The mint strikes a new year-name over the old '
      + 'tetradrachms of the enemy: "For the Freedom of Jerusalem." In the study houses '
      + 'they argue already over what was promised and what was merely won; in the '
      + 'vineyards they simply bring in the harvest, unburned, for the first year in four.',
    forTag: 'JUD',
    aiOption: 0,
    options: [
      {
        label: 'Year One of the Redemption',
        tooltip: 'The war is won. +1 stability.',
        effects: guard('ev2_redemption_peace:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { stability: 1 });
        }),
      },
    ],
  },

  {
    id: 'ev2_hadrian_dies',
    title: 'Hadrian Is Dead',
    worldLabel: 'Antoninus Pius succeeds Hadrian',
    desc: 'Hadrian dies at Baiae after a long illness, leaving Antoninus to inherit the '
      + 'empire, the Senate he humiliated, and whatever settlement the Judaean war has '
      + 'actually produced. A new reign changes Roman posture; it does not erase armies '
      + 'or award a victory the map does not support.',
    forTag: 'both',
    date: { y: 138, m: 7 },
    world: true,
    major: true,
    aiOption: 0,
    options: [{
      label: 'The rescript bears a new name',
      tooltip: 'Antoninus Pius becomes emperor. Rome gains stability and loses its emergency passivity; any surviving war continues under the live balance of power.',
      effects: guard('ev2_hadrian_dies:0', (ctx) => {
        if (!alive(ctx, 'ROM')) return;
        ctx.helpers.setRuler(ctx, 'ROM', { name: 'Antoninus Pius', title: 'Emperor', gov: 4, infl: 4, mar: 2, age: 51 });
        ctx.helpers.adjust(ctx, 'ROM', { stability: 1, legitimacy: 15, warExhaustion: -2 });
        ctx.helpers.removeModifier(ctx, 'ROM', 'provincial_response');
        ctx.helpers.removeModifier(ctx, 'ROM', 'eastern_anxiety');
        ctx.helpers.addTagModifier(ctx, 'ROM', {
          id: 'antonine_succession', name: 'The Antonine Succession', months: 36,
          effects: { incomeMult: 1.05 },
        });
        ctx.helpers.chronicle(ctx, 'ruler', 'Hadrian dies; Antoninus Pius inherits the empire and the settlement the live war has made.');
      }),
    }],
  },

  // Fired by BOOKMARK_132.checkVictory when the revolt reaches +50 war score
  // (SPEC §32); never fires on its own. Hadrian's concession is an OFFER.
  {
    id: 'ev132_terms',
    title: 'Rome Lets Go',
    requiresWar: ['JUD', 'ROM'],
    desc: 'Dio\u2019s arithmetic wins the argument in the Senate: so many legions mauled, '
      + 'so many years, for hills that grow stones. Hadrian, older and ill, offers a '
      + 'tributary prince in Judea — circumcision unbanned, the colony unbuilt, the '
      + 'hills of the faith under the Nasi\u2019s coins. The occupied Greek cities return. '
      + 'Or the Prince of Israel can refuse the half, and dig for the whole.',
    forTag: 'JUD',
    major: true,
    trigger: safeTrigger('ev132_terms', () => false),
    aiOption: 0,
    options: [
      {
        label: 'A tributary prince in Judea',
        tooltip: 'Victory (score 200). The war ends; Judaea keeps the provinces of the faith it holds, and every other occupied town returns.',
        effects: guard('ev132_terms:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          h.fireEvent(ctx, 'ev2_redemption_peace');
          const w = (g.wars || []).find((x) => x
            && (x.attackers.concat(x.defenders)).indexOf('JUD') >= 0
            && (x.attackers.concat(x.defenders)).indexOf('ROM') >= 0);
          const key = w && (w.attackers || []).indexOf('JUD') >= 0 ? 'att' : 'def';
          h.endWar(ctx, 'JUD', 'ROM', key, { keep: (p) => p.religion === 'judaism' });
          h.endGame(ctx, {
            result: 'win',
            title: 'Rome Lets Go',
            text: 'Hadrian accepts a tributary prince in Judea — circumcision unbanned, '
              + 'the colony unbuilt — and writes to the Senate without the customary '
              + 'formula, for he and the army are not well.',
            score: 200,
          });
        }),
      },
      {
        label: 'Dig for the whole',
        tooltip: 'The war goes on. +5 legitimacy; Hadrian will not offer twice.',
        effects: guard('ev132_terms:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 5 });
        }),
      },
    ],
  },

  // Holding Jerusalem and the heartland into 136 earns a second settlement
  // offer. It must remain a player decision: merely reaching the date changes
  // neither ownership nor the state of the war.
  {
    id: 'ev132_endurance_terms',
    title: 'Four Years and the Hills Still Answer',
    requiresWar: ['JUD', 'ROM'],
    desc: 'Four campaigning seasons, and the standards still cannot stay in the hills '
      + 'through a winter. Hadrian offers to withdraw from the country of the faith and '
      + 'leave the Nasi in Jerusalem, while Rome keeps the coast and the Greek cities. '
      + 'The settlement can make the coins of Year Four true — or the war can go on.',
    forTag: 'JUD',
    major: true,
    trigger: safeTrigger('ev132_endurance_terms', () => false),
    aiOption: 0,
    options: [
      {
        label: 'Take the freedom of Jerusalem',
        tooltip: 'Victory (score 150). The war ends; Judaea keeps the provinces of the faith it holds, and every other occupied town returns.',
        effects: guard('ev132_endurance_terms:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const w = (g.wars || []).find((x) => x
            && (x.attackers.concat(x.defenders)).indexOf('JUD') >= 0
            && (x.attackers.concat(x.defenders)).indexOf('ROM') >= 0);
          const key = w && (w.attackers || []).indexOf('JUD') >= 0 ? 'att' : 'def';
          h.fireEvent(ctx, 'ev2_redemption_peace');
          h.endWar(ctx, 'JUD', 'ROM', key, { keep: (p) => p.religion === 'judaism' });
          h.endGame(ctx, {
            result: 'win',
            title: 'The Redemption of Israel',
            text: 'Four campaigning seasons, and the standards still cannot stay in the hills '
              + 'through a winter. Rome keeps the coast and calls it victory; in Jerusalem the '
              + 'Nasi keeps the city, the Law, and the mint. The coins of Year Four read: '
              + '"For the Freedom of Jerusalem."',
            score: 150,
          });
        }),
      },
      {
        label: 'The whole land, or nothing',
        tooltip: 'The war and every occupation continue exactly as they stand. Rome will not repeat this offer.',
        effects: guard('ev132_endurance_terms:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 5 });
        }),
      },
    ],
  },
];
