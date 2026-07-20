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

// Lift a named modifier from every ROM-owned province of the Jewish faith —
// the decree eased, the screw backed off a turn.
function sootheOccupiedJudaea(ctx, id) {
  const g = ctx.game;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== 'ROM' || p.religion !== 'judaism') continue;
    ctx.helpers.removeModifier(ctx, p.name, id);
  }
}

function atWar(game, a, b) {
  const wars = (game && game.wars) || [];
  for (const w of wars) {
    if (!w) continue;
    const att = w.attackers || [];
    const def = w.defenders || [];
    if ((att.indexOf(a) >= 0 && def.indexOf(b) >= 0)
      || (att.indexOf(b) >= 0 && def.indexOf(a) >= 0)) return true;
  }
  return false;
}

// The world of the aftermath: the revolt is finished and Rome holds the city.
// Gating on the map, not the verdict, keeps a victorious Judaea from being
// narrated into defeat in diverged campaigns.
function romanAftermath(ctx) {
  return alive(ctx, 'ROM')
    && ctx.helpers.controls(ctx, 'ROM', 'Jerusalem')
    && ctx.helpers.countControlled(ctx, 'JUD', {}) === 0;
}

// The other world: the Nasi's state stands in Jerusalem and the war is over.
function judaeaStands(ctx) {
  return alive(ctx, 'JUD')
    && ctx.helpers.controls(ctx, 'JUD', 'Jerusalem')
    && !findJudRomWar(ctx.game);
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
      {
        label: 'Dig the armories deeper',
        tooltip: 'Not yet, not loudly: Judaea +25 martial points. Jewish provinces under Rome: only +1 unrest for 24 months ("The Ploughed Mount").',
        effects: guard('ev2_aelia:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { mar: 25 });
          stirOccupiedJudaea(ctx, 'ploughed_mount', 'The Ploughed Mount', 24, 1);
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
      {
        label: 'Keep the covenant in secret',
        tooltip: 'The Law endures in the caves and the streets stay quiet: Judaea +1 stability.',
        effects: guard('ev2_decrees:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { stability: 1 });
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
      {
        label: 'Send south those who will come',
        tooltip: 'Judaea: +1,000 manpower from the hill villages that do answer — and −5 legitimacy when the north\'s courtesies are read aloud.',
        effects: guard('ev2_galilee_quiet:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { manpower: 1000, legitimacy: -5 });
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
      {
        label: 'Name the ravines like psalms',
        tooltip: 'Rome: −8,000 manpower, −10 legitimacy. Judaea: +5 war score, +5 legitimacy; "The Ravines Remember": +5% morale for 12 months.',
        effects: guard('ev2_legion_lost:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ROM', { manpower: -8000, legitimacy: -10 });
          h.adjust(ctx, 'JUD', { legitimacy: 5 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'ravines_remember', name: 'The Ravines Remember', months: 12,
            effects: { moraleMult: 1.05 },
          });
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
      {
        label: 'Strip the frontiers barer still',
        tooltip: 'Rome: Julius Severus (4/4/5) lands at Ptolemais with 21,000 men; 10,000 more at Caesarea; the provincial hesitation ends — and +1 war exhaustion, for every army between the Rhine and Egypt is a cohort thinner.',
        effects: guard('ev2_hadrian_summons:1', (ctx) => {
          const h = ctx.helpers;
          h.removeModifier(ctx, 'ROM', 'provincial_response');
          h.spawnArmy(ctx, 'ROM', 'Ptolemais', {
            inf: 18, cav: 3, name: 'Army of Julius Severus',
            general: { name: 'Julius Severus', fire: 4, shock: 4, maneuver: 5 },
          });
          h.spawnArmy(ctx, 'ROM', 'Caesarea Maritima', {
            inf: 9, cav: 1, name: 'Vexillations of the Danube',
            general: { name: 'Publicius Marcellus', fire: 2, shock: 3, maneuver: 2 },
          });
          h.adjust(ctx, 'ROM', { warExhaustion: 1 });
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
      {
        label: 'Send envoys across the river',
        tooltip: 'The same held breath — either Rome garrisons the river or the King of Kings crosses it. Judaea: −25 influence points, +5 legitimacy, for the Nasi\'s couriers ride east with the merchants.',
        effects: guard('ev2_parthian_shadow:1', (ctx) => {
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
          h.adjust(ctx, 'JUD', { infl: -25, legitimacy: 5 });
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
      {
        label: 'Ordain the students in secret',
        tooltip: 'No banner over the grave, but the chain of the Law unbroken: Judaea −5 legitimacy, +25 influence points.',
        effects: guard('ev2_akiva:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { legitimacy: -5, infl: 25 });
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
      {
        label: 'Water and walls',
        tooltip: '"Water and Walls": +1 hill defense for 12 months — the rock, not the sally, will decide it.',
        effects: guard('ev2_betar:1', (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'JUD', {
            id: 'betar_walls', name: 'Water and Walls', months: 12,
            effects: { hillDefBonus: 1 },
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
      {
        label: 'Overstrike the enemy\'s silver',
        tooltip: 'The mint before the study house — "For the Freedom of Jerusalem": +10% income for 24 months.',
        effects: guard('ev2_redemption_peace:1', (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'JUD', {
            id: 'freedom_coinage', name: 'For the Freedom of Jerusalem', months: 24,
            effects: { incomeMult: 1.1 },
          });
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

  // ═══════════════════════════════════════════════════════════════════════════
  // THE AFTERMATH, 136–166. Two strands, gated on the map: the world where
  // Rome holds Jerusalem and the revolt is dust (romanAftermath), and the
  // world where the Nasi's state stands (judaeaStands). Shared world-history
  // beats (Marcus, the Parthian war, the plague) fire in both, guarded.
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 17 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_syria_palaestina',
    title: 'Syria Palaestina',
    desc: 'The clerks have their orders: the name Judaea is to be struck from the rolls, '
      + 'the milestones, the tax registers. The province will be called Syria Palaestina, '
      + 'after the old sea-people the Jews once fought — a name chosen precisely because '
      + 'it is someone else\'s. Dio\'s men count what the war cost the country it was '
      + 'fought over: fifty fortresses, nine hundred and eighty-five villages, and the '
      + 'name itself. A country can survive its dead. Whether it can survive its renaming '
      + 'is a longer experiment.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev2_syria_palaestina', (ctx) =>
      dateGE(ctx, 136, 1) && romanAftermath(ctx)),
    aiOption: 0,
    options: [
      {
        label: 'Blot the name from the map',
        tooltip: 'Rome: +10 legitimacy; Aelia garrisoned ("Colonia Aelia Capitolina": −2 unrest in Jerusalem, permanent). Every Jewish province under Rome: +1 unrest for 60 months ("A Name Erased").',
        effects: guard('ev2_syria_palaestina:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          h.adjust(ctx, 'ROM', { legitimacy: 10 });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'aelia_colonia', name: 'Colonia Aelia Capitolina', months: -1,
            effects: { unrest: -2 },
          });
          stirOccupiedJudaea(ctx, 'name_erased', 'A Name Erased', 60, 1);
          h.setFlag(ctx, 'palaestinaRenamed', true);
          h.chronicle(ctx, 'era', 'Judaea is renamed Syria Palaestina; Aelia Capitolina rises on the ruins, closed to Jews on pain of death.');
        }),
      },
      {
        label: 'Confiscate before renaming',
        tooltip: 'The imperial fisc takes the dead men\'s land first: Rome +100 talents — and +2 unrest for 36 months in every Jewish province under Rome ("The Confiscations").',
        effects: guard('ev2_syria_palaestina:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          h.adjust(ctx, 'ROM', { treasury: 100 });
          stirOccupiedJudaea(ctx, 'confiscations', 'The Confiscations', 36, 2);
          h.setFlag(ctx, 'palaestinaRenamed', true);
          h.chronicle(ctx, 'era', 'Judaea is renamed Syria Palaestina; the fisc takes the land of the dead before the clerks take the name.');
        }),
      },
    ],
  },

  // ── 18 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_shemad',
    title: 'The Shemad',
    desc: 'The edicts no longer aim at the rebellion; they aim at the Law. Ordination is '
      + 'made a capital crime — for the ordainer, the ordained, and the town where it '
      + 'happens. The Sabbath, the tefillin, the teaching of Torah in public: forbidden. '
      + 'The jurists have understood something the generals never quite did — that the '
      + 'enemy was never the army, which they destroyed, but the book, which they '
      + 'cannot find. The generation will remember these years by a single word: '
      + 'the destruction, the shemad.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev2_shemad', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'palaestinaRenamed') && dateGE(ctx, 136, 4) && romanAftermath(ctx)),
    aiOption: 0,
    options: [
      {
        label: 'The Law itself is outlawed',
        tooltip: 'Full enforcement: every Jewish province under Rome +2 unrest for 36 months ("The Shemad"); Rome +5 legitimacy before the colonists.',
        effects: guard('ev2_shemad:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          stirOccupiedJudaea(ctx, 'the_shemad', 'The Shemad', 36, 2);
          h.adjust(ctx, 'ROM', { legitimacy: 5 });
          h.setFlag(ctx, 'shemad', true);
        }),
      },
      {
        label: 'Fines before crosses',
        tooltip: 'The governor prefers revenue to martyrs: Rome +50 talents; Jewish provinces only +1 unrest for 36 months ("The Shemad").',
        effects: guard('ev2_shemad:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          stirOccupiedJudaea(ctx, 'the_shemad', 'The Shemad', 36, 1);
          h.adjust(ctx, 'ROM', { treasury: 50 });
          h.setFlag(ctx, 'shemad', true);
        }),
      },
    ],
  },

  // ── 19 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_slave_markets',
    title: 'The Terebinth of Hebron',
    desc: 'At the old tree by Hebron where Abraham is said to have pitched his tent, the '
      + 'army has set up its market, and there is a second at Gaza for the overflow. So '
      + 'many captives stand on the blocks that a Jew sells for the price of a horse, '
      + 'and the traders complain of the glut the way farmers complain of rain. What '
      + 'cannot be sold at Hebron goes to Gaza; what cannot be sold at Gaza goes to '
      + 'Egypt in the grain ships, and the sea takes its share.',
    forTag: 'both',
    trigger: safeTrigger('ev2_slave_markets', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'palaestinaRenamed')
      && ctx.helpers.controls(ctx, 'ROM', 'Hebron') && dateGE(ctx, 136, 6)),
    aiOption: 0,
    options: [
      {
        label: 'A Jew for the price of a horse',
        tooltip: 'Rome: +100 talents from the auction blocks. Every Jewish province under Rome: +1 unrest for 24 months ("The Markets at the Terebinth").',
        effects: guard('ev2_slave_markets:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          h.adjust(ctx, 'ROM', { treasury: 100 });
          stirOccupiedJudaea(ctx, 'terebinth_markets', 'The Markets at the Terebinth', 24, 1);
          h.setFlag(ctx, 'slaveMarkets', true);
        }),
      },
      {
        label: 'Let the ransomers come',
        tooltip: 'The surviving communities buy their kin off the blocks: Rome +40 talents only — but −1 unrest for 24 months in every Jewish province under Rome ("Ransomed Kin").',
        effects: guard('ev2_slave_markets:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          h.adjust(ctx, 'ROM', { treasury: 40 });
          stirOccupiedJudaea(ctx, 'ransomed_kin', 'Ransomed Kin', 24, -1);
          h.setFlag(ctx, 'slaveMarkets', true);
        }),
      },
    ],
  },

  // ── 20 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_ten_martyrs',
    title: 'Wrapped in the Scroll',
    desc: 'They took Hanina ben Teradion teaching in public with the scroll in his lap, '
      + 'and burned him wrapped in it, with wet wool over his heart so that he would '
      + 'die slowly. His students, forced to watch, asked what he saw. "The parchment '
      + 'burns," he said, "but the letters fly up." The tradition will count ten such '
      + 'deaths and make of them a liturgy; the empire counts them as executions, '
      + 'and files the paperwork.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev2_ten_martyrs', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'shemad') && dateGE(ctx, 137, 3) && romanAftermath(ctx)),
    aiOption: 0,
    options: [
      {
        label: 'Burn them in public',
        tooltip: 'Terror as policy: every Jewish province under Rome +2 unrest for 12 months ("The Letters Fly Up"); Rome −5 legitimacy as the story travels faster than the edict.',
        effects: guard('ev2_ten_martyrs:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          stirOccupiedJudaea(ctx, 'letters_fly_up', 'The Letters Fly Up', 12, 2);
          h.adjust(ctx, 'ROM', { legitimacy: -5 });
        }),
      },
      {
        label: 'Kill quietly, in the fortress yards',
        tooltip: 'No spectacle, no liturgy — the informers must be paid instead: Rome −25 talents; Jewish provinces +1 unrest for 24 months ("The Informers").',
        effects: guard('ev2_ten_martyrs:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          h.adjust(ctx, 'ROM', { treasury: -25 });
          stirOccupiedJudaea(ctx, 'the_informers', 'The Informers', 24, 1);
        }),
      },
    ],
  },

  // ── 21 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_judah_ben_bava',
    title: 'The Defile Between Usha and Shefaram',
    desc: 'Ordination carries death for the ordainer, the ordained, and the town — so '
      + 'Judah ben Bava took five of Akiva\'s students out of any town, to the pass '
      + 'between Usha and Shefaram in the Galilee hills, and laid his hands on them '
      + 'there. When the patrol came he told the five to run, and stood in the narrow '
      + 'place, and the report says the body took so many spears it resembled a sieve. '
      + 'The five got clear. The ordination survives.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev2_judah_ben_bava', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'shemad') && dateGE(ctx, 138, 3) && romanAftermath(ctx)),
    aiOption: 0,
    options: [
      {
        label: 'The chain of the Law unbroken',
        tooltip: 'The five carry the ordination into Galilee: Sepphoris −1 unrest for 24 months ("The Ordination Survives").',
        effects: guard('ev2_judah_ben_bava:0', (ctx) => {
          const h = ctx.helpers;
          h.addProvinceModifier(ctx, 'Sepphoris', {
            id: 'ordination_survives', name: 'The Ordination Survives', months: 24,
            effects: { unrest: -1 },
          });
          h.setFlag(ctx, 'ordinationSurvives', true);
        }),
      },
      {
        label: 'Hunt the five through the hills',
        tooltip: 'Rome: +10 martial points spent on patrols; Sepphoris +1 unrest for 12 months ("The Manhunt") — and the five are not found.',
        effects: guard('ev2_judah_ben_bava:1', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { mar: 10 });
          h.addProvinceModifier(ctx, 'Sepphoris', {
            id: 'the_manhunt', name: 'The Manhunt', months: 12,
            effects: { unrest: 1 },
          });
          h.setFlag(ctx, 'ordinationSurvives', true);
        }),
      },
    ],
  },

  // ── 22 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_antoninus_rescript',
    title: 'The Rescript of Antoninus',
    desc: 'The new emperor has answered a petition, and the answer will sit in the law '
      + 'books for centuries: Jews are permitted to circumcise their own sons. It is '
      + 'not a repeal — the Law is still hedged with penalties, converts are still '
      + 'forbidden — but the terror becomes merely oppression, which a people can '
      + 'live inside. In the hill villages the informers wait by the synagogue doors '
      + 'for denunciations that no longer pay, and slowly, like a fever breaking, '
      + 'they starve.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev2_antoninus_rescript', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'shemad') && dateGE(ctx, 139, 3) && alive(ctx, 'ROM')),
    aiOption: 0,
    options: [
      {
        label: 'Circumcidere filios suos',
        tooltip: 'The Shemad is lifted; every Jewish province under Rome: −1 unrest for 24 months ("The Edicts Ease"). Rome +5 legitimacy — clemency is also policy.',
        effects: guard('ev2_antoninus_rescript:0', (ctx) => {
          const h = ctx.helpers;
          sootheOccupiedJudaea(ctx, 'the_shemad');
          stirOccupiedJudaea(ctx, 'edicts_ease', 'The Edicts Ease', 24, -1);
          h.adjust(ctx, 'ROM', { legitimacy: 5 });
          h.setFlag(ctx, 'shemadEased', true);
          h.chronicle(ctx, 'era', 'Antoninus Pius permits the Jews to circumcise their own sons; the persecution eases into mere oppression.');
        }),
      },
      {
        label: 'Ease the law, keep the fines',
        tooltip: 'The Shemad is lifted, but the fisc keeps its schedule of penalties: Rome +50 talents; no easing modifier.',
        effects: guard('ev2_antoninus_rescript:1', (ctx) => {
          const h = ctx.helpers;
          sootheOccupiedJudaea(ctx, 'the_shemad');
          h.adjust(ctx, 'ROM', { treasury: 50 });
          h.setFlag(ctx, 'shemadEased', true);
          h.chronicle(ctx, 'era', 'Antoninus Pius eases Hadrian\'s edicts — for those who can pay the fisc\'s schedule.');
        }),
      },
    ],
  },

  // ── 23 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_day_of_weeping',
    title: 'One Day a Year, to Weep',
    desc: 'Jews may not enter Aelia on pain of death; the garrison lets them come near '
      + 'enough to see the city from the ridge, which is its own refinement. Now the '
      + 'governor\'s office has found the final clause: on the Ninth of Av — the day of '
      + 'the two Temples, the day of Betar — they may enter, to weep at the one wall '
      + 'the engineers left standing. For a fee. Jerome will write it down without '
      + 'blinking: they must pay to mourn the ruin of their own city.',
    forTag: 'both',
    trigger: safeTrigger('ev2_day_of_weeping', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'palaestinaRenamed') && dateGE(ctx, 138, 8) && romanAftermath(ctx)),
    aiOption: 0,
    options: [
      {
        label: 'Grief, taxed at the gate',
        tooltip: 'Rome: +25 talents a season, as it were (+25 treasury); Jerusalem +1 unrest for 36 months ("The Day of Weeping") — a vent is also a wound kept open.',
        effects: guard('ev2_day_of_weeping:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          h.adjust(ctx, 'ROM', { treasury: 25 });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'day_of_weeping', name: 'The Day of Weeping', months: 36,
            effects: { unrest: 1 },
          });
        }),
      },
      {
        label: 'Not even that',
        tooltip: 'The ban stays absolute: every Jewish province under Rome +1 unrest for 24 months ("Near Enough to See") — grief with no vent at all.',
        effects: guard('ev2_day_of_weeping:1', (ctx) => {
          if (!alive(ctx, 'ROM')) return;
          stirOccupiedJudaea(ctx, 'near_enough_to_see', 'Near Enough to See', 24, 1);
        }),
      },
    ],
  },

  // ── 24 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_usha_sanhedrin',
    title: 'The Sanhedrin at Usha',
    desc: 'In a Galilean hill town that no map of the war ever bothered to mark, the '
      + 'surviving sages have reconvened the court of seventy: the Sanhedrin sits at '
      + 'Usha, and the center of gravity of the whole people moves north for good. '
      + 'Shimon ben Gamaliel, who spent the war years hidden, presides as Nasi — a '
      + 'patriarch without a state, which may be the durable kind. Judaea proper lies '
      + 'broken and quiet; Galilee, which did not rise, becomes the Jewish country.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev2_usha_sanhedrin', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'shemadEased') && dateGE(ctx, 140, 6) && romanAftermath(ctx)),
    aiOption: 0,
    options: [
      {
        label: 'The ordinances of Usha',
        tooltip: 'A father must feed his children; a man may give no more than a fifth to charity, lest he need charity himself. Sepphoris: −1 unrest and +5% tax, permanent ("The Sanhedrin at Usha").',
        effects: guard('ev2_usha_sanhedrin:0', (ctx) => {
          const h = ctx.helpers;
          h.addProvinceModifier(ctx, 'Sepphoris', {
            id: 'sanhedrin_at_usha', name: 'The Sanhedrin at Usha', months: -1,
            effects: { unrest: -1, taxMult: 1.05 },
          });
          h.setFlag(ctx, 'ushaSanhedrin', true);
          h.chronicle(ctx, 'era', 'The Sanhedrin reconvenes at Usha in Galilee; the ordinances of a people learning to live unredeemed.');
        }),
      },
      {
        label: 'What most of it cannot bear',
        tooltip: 'The Nasi\'s rule: no decree upon the community that most of it cannot keep. Sepphoris −2 unrest for 36 months ("The Patient Court").',
        effects: guard('ev2_usha_sanhedrin:1', (ctx) => {
          const h = ctx.helpers;
          h.addProvinceModifier(ctx, 'Sepphoris', {
            id: 'patient_court', name: 'The Patient Court', months: 36,
            effects: { unrest: -2 },
          });
          h.setFlag(ctx, 'ushaSanhedrin', true);
          h.chronicle(ctx, 'era', 'The Sanhedrin reconvenes at Usha; Shimon ben Gamaliel decrees nothing the community cannot bear.');
        }),
      },
    ],
  },

  // ── 25 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_carob_cave',
    title: 'Out of the Cave',
    desc: 'The story is already a legend while the men are still alive: Shimon bar Yohai, '
      + 'condemned for a word against Rome, hid with his son in a cave for thirteen years '
      + 'with a carob tree and a spring, and came out to find men ploughing fields. '
      + '"They forsake eternal life for the life of the hour" — and whatever his eyes '
      + 'fell on burned, says the tale, until the heavenly voice ordered him back into '
      + 'the cave: I did not bring you out to destroy My world. The second emergence '
      + 'was gentler. It is the parable of the whole generation.',
    forTag: 'both',
    trigger: safeTrigger('ev2_carob_cave', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'ushaSanhedrin') && dateGE(ctx, 145, 1)),
    aiOption: 1,
    options: [
      {
        label: 'Eternal life against the life of the hour',
        tooltip: 'The fury honored: Tiberias +1 unrest for 12 months ("The Scorched Furrows") — zeal has not finished burning.',
        effects: guard('ev2_carob_cave:0', (ctx) => {
          ctx.helpers.addProvinceModifier(ctx, 'Tiberias', {
            id: 'scorched_furrows', name: 'The Scorched Furrows', months: 12,
            effects: { unrest: 1 },
          });
        }),
      },
      {
        label: 'Back into the cave, to learn gentleness',
        tooltip: 'The second emergence: Tiberias and Sepphoris −1 unrest for 24 months ("The World Not Destroyed").',
        effects: guard('ev2_carob_cave:1', (ctx) => {
          const h = ctx.helpers;
          for (const name of ['Tiberias', 'Sepphoris']) {
            h.addProvinceModifier(ctx, name, {
              id: 'world_not_destroyed', name: 'The World Not Destroyed', months: 24,
              effects: { unrest: -1 },
            });
          }
        }),
      },
    ],
  },

  // ── 26 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_redeem_captives',
    title: 'The Redemption of Captives',
    desc: 'Ten years on, the communities of the coast and the diaspora are still buying '
      + 'their people back — from Gaza, from Egypt, from households as far as Italy. '
      + 'The sages have ruled it the supreme commandment, ahead of feeding the poor or '
      + 'building synagogues: the captive stands in all dangers at once. Congregations '
      + 'sell their scroll-crowns to do it. The traders, who keep no theology, note '
      + 'only that the price of a Jewish slave has quietly doubled.',
    forTag: 'both',
    trigger: safeTrigger('ev2_redeem_captives', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'slaveMarkets') && dateGE(ctx, 146, 1) && romanAftermath(ctx)),
    aiOption: 0,
    options: [
      {
        label: 'Let the buying-back run',
        tooltip: 'Rome: +75 talents pass through the markets; every Jewish province under Rome −1 unrest for 24 months ("Ransomed Home").',
        effects: guard('ev2_redeem_captives:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          h.adjust(ctx, 'ROM', { treasury: 75 });
          stirOccupiedJudaea(ctx, 'ransomed_home', 'Ransomed Home', 24, -1);
        }),
      },
      {
        label: 'Forbid the ransoming',
        tooltip: 'Slaves are property, not diplomacy: Rome −3 legitimacy; every Jewish province under Rome +1 unrest for 24 months ("The Unransomed").',
        effects: guard('ev2_redeem_captives:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          h.adjust(ctx, 'ROM', { legitimacy: -3 });
          stirOccupiedJudaea(ctx, 'the_unransomed', 'The Unransomed', 24, 1);
        }),
      },
    ],
  },

  // ── 27 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_galilee_schools',
    title: 'The Lake Towns Fill',
    desc: 'Sepphoris and Tiberias — towns the war passed over because they kept their '
      + 'gates shut — are filling with everything the war destroyed elsewhere: study '
      + 'houses, courts, dye-works, the sons of Judean villages that no longer exist. '
      + 'The students of Akiva\'s students teach in rooms above fish markets. Judaea '
      + 'proper stays broken, its terraces sliding into the wadis for want of hands; '
      + 'Galilee, almost apologetically, becomes the whole country.',
    forTag: 'both',
    trigger: safeTrigger('ev2_galilee_schools', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'ushaSanhedrin') && dateGE(ctx, 147, 1)),
    aiOption: 0,
    options: [
      {
        label: 'Let the schools grow',
        tooltip: 'Tiberias and Sepphoris: +10% tax and −1 unrest, permanent ("The Schools of Galilee").',
        effects: guard('ev2_galilee_schools:0', (ctx) => {
          const h = ctx.helpers;
          for (const name of ['Tiberias', 'Sepphoris']) {
            h.addProvinceModifier(ctx, name, {
              id: 'schools_of_galilee', name: 'The Schools of Galilee', months: -1,
              effects: { taxMult: 1.1, unrest: -1 },
            });
          }
        }),
      },
      {
        label: 'Tax the new prosperity',
        tooltip: 'Rome: +75 talents now; Tiberias and Sepphoris +1 unrest for 24 months ("The Assessors") — the schools learn to keep two sets of books.',
        effects: guard('ev2_galilee_schools:1', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { treasury: 75 });
          for (const name of ['Tiberias', 'Sepphoris']) {
            h.addProvinceModifier(ctx, name, {
              id: 'the_assessors', name: 'The Assessors', months: 24,
              effects: { unrest: 1 },
            });
          }
        }),
      },
    ],
  },

  // ── 28 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_calendar_war',
    title: 'A New Mountain, a New Altar',
    desc: 'Word comes up from Babylon that Hananiah, nephew of Yehoshua, has begun '
      + 'intercalating years and fixing festivals abroad — as though the calendar, '
      + 'the last sovereignty the Land retains, could emigrate like everything else. '
      + 'The court at Usha sends two scholars with letters that escalate politely to '
      + 'the unanswerable: if you persist, make yourselves a new mountain, and let '
      + 'Ahia build you a new altar, and write at the head of your documents — we '
      + 'have no portion in the God of Israel. Babylon reads the letters twice, '
      + 'and yields.',
    forTag: 'both',
    trigger: safeTrigger('ev2_calendar_war', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'ushaSanhedrin') && dateGE(ctx, 148, 6)),
    aiOption: 0,
    options: [
      {
        label: 'The Land keeps the calendar',
        tooltip: 'One people, one reckoning: Sepphoris −1 unrest for 36 months ("One Calendar").',
        effects: guard('ev2_calendar_war:0', (ctx) => {
          const h = ctx.helpers;
          h.addProvinceModifier(ctx, 'Sepphoris', {
            id: 'one_calendar', name: 'One Calendar', months: 36,
            effects: { unrest: -1 },
          });
          h.chronicle(ctx, 'era', 'Babylon yields to the letters from Usha: the Land, however broken, keeps the calendar of the whole people.');
        }),
      },
      {
        label: 'Two calendars, two Israels',
        tooltip: 'The threat is not sent, and the schism festers: Sepphoris and Tiberias +1 unrest for 24 months ("A Divided Reckoning").',
        effects: guard('ev2_calendar_war:1', (ctx) => {
          const h = ctx.helpers;
          for (const name of ['Sepphoris', 'Tiberias']) {
            h.addProvinceModifier(ctx, name, {
              id: 'divided_reckoning', name: 'A Divided Reckoning', months: 24,
              effects: { unrest: 1 },
            });
          }
        }),
      },
    ],
  },

  // ── 29 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_stirrings_152',
    title: 'The Rising That Wasn\'t',
    desc: 'The Historia will spare it one clause: under Antoninus, stirrings in Palestine, '
      + 'put down. Arms found in a cistern near Lydda; a preacher in the hills counting '
      + 'weeks of years; young men who were children when Betar fell and remember only '
      + 'the glory. Against them, this time, stands the court at Usha with its hard-won '
      + 'doctrine — the three oaths: not to storm the wall, not to force the end. The '
      + 'sages talk the villages down before the governor\'s cavalry can ride them down. '
      + 'Mostly.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev2_stirrings_152', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'palaestinaRenamed') && dateGE(ctx, 152, 6) && romanAftermath(ctx)),
    aiOption: 0,
    options: [
      {
        label: 'Not to storm the wall',
        tooltip: 'The oaths hold and the stirring dissolves: every Jewish province under Rome −1 unrest for 60 months ("The Three Oaths"); Rome +10 governance points.',
        effects: guard('ev2_stirrings_152:0', (ctx) => {
          const h = ctx.helpers;
          stirOccupiedJudaea(ctx, 'three_oaths', 'The Three Oaths', 60, -1);
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { gov: 10 });
          h.setFlag(ctx, 'threeOaths', true);
        }),
      },
      {
        label: 'Make examples anyway',
        tooltip: 'The governor crucifies first and reads the sages\' letters after: Rome +10 martial points, −3 legitimacy; Jewish provinces +2 unrest for 12 months ("Reprisals Renewed").',
        effects: guard('ev2_stirrings_152:1', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { mar: 10, legitimacy: -3 });
          stirOccupiedJudaea(ctx, 'reprisals_renewed', 'Reprisals Renewed', 12, 2);
          h.setFlag(ctx, 'threeOaths', true);
        }),
      },
    ],
  },

  // ── 30 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_meir_aher',
    title: 'Torah from the Mouth of Aher',
    desc: 'On a Sabbath outside Tiberias, a sage rides past the schoolhouse boundary on '
      + 'horseback — Elisha ben Abuyah, who saw the martyrdoms and broke, and is called '
      + 'now only Aher, the Other. Walking beside the horse, keeping pace, learning '
      + 'Torah from him step by step: Rabbi Meir, finest mind of the generation, whose '
      + 'wife Beruriah teaches the students their own tradition back to them. "Turn '
      + 'back," Meir says. "I have heard the sentence already," says the Other, and '
      + 'rides on. Meir keeps the Torah and lets the rider go: the generation\'s whole '
      + 'method, in one image.',
    forTag: 'both',
    trigger: safeTrigger('ev2_meir_aher', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'ushaSanhedrin') && dateGE(ctx, 154, 1)),
    aiOption: 0,
    options: [
      {
        label: 'Eat the date, throw away the stone',
        tooltip: 'Meir\'s rule for broken teachers and broken times: Tiberias −1 unrest and +5% tax, permanent ("Meir\'s Generation").',
        effects: guard('ev2_meir_aher:0', (ctx) => {
          ctx.helpers.addProvinceModifier(ctx, 'Tiberias', {
            id: 'meirs_generation', name: 'Meir\'s Generation', months: -1,
            effects: { unrest: -1, taxMult: 1.05 },
          });
        }),
      },
      {
        label: 'Ban the heretic\'s name',
        tooltip: 'Purity over salvage: Tiberias +1 unrest for 12 months ("The Banned Name") — the schools lose what the Other still knew.',
        effects: guard('ev2_meir_aher:1', (ctx) => {
          ctx.helpers.addProvinceModifier(ctx, 'Tiberias', {
            id: 'banned_name', name: 'The Banned Name', months: 12,
            effects: { unrest: 1 },
          });
        }),
      },
    ],
  },

  // ── 31 ────────────────────────────────────────────────────────────────────
  // The victorious world: the Nasi's state stands, the war is over, and the
  // founder — a soldier in his fifties when the furrow was cut — dies in bed,
  // which no one, least of all Rome, expected of him.
  {
    id: 'ev2_nasi_succession',
    title: 'The Nasi Is Dead',
    desc: 'Simon bar Kosiba, Prince of Israel, who threatened his own officers by letter '
      + 'and beat an empire, has died — in bed, in Jerusalem, which is the whole '
      + 'miracle in four words. The captains hold the fortresses and expect one of '
      + 'their own. The sages hold the courts and remember that the wars of the house '
      + 'of David ended in the schisms of the house of David; they propose the house '
      + 'of Gamaliel, patriarchs by descent and temperament, who decree nothing the '
      + 'community cannot bear.',
    forTag: 'JUD',
    major: true,
    trigger: safeTrigger('ev2_nasi_succession', (ctx) =>
      judaeaStands(ctx) && dateGE(ctx, 141, 1)),
    aiOption: 0,
    options: [
      {
        label: 'The house of Gamaliel',
        tooltip: 'Shimon ben Gamaliel becomes Nasi (2/4/1): +10 legitimacy, +1 stability — administration, not oracle.',
        effects: guard('ev2_nasi_succession:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'JUD')) return;
          h.setRuler(ctx, 'JUD', { name: 'Shimon ben Gamaliel', title: 'Nasi Israel', gov: 2, infl: 4, mar: 1, age: 50 });
          h.adjust(ctx, 'JUD', { legitimacy: 10, stability: 1 });
          h.chronicle(ctx, 'ruler', 'Simon bar Kosiba dies in Jerusalem; the sages raise Shimon ben Gamaliel as Nasi of a standing Israel.');
        }),
      },
      {
        label: 'The captains\' man',
        tooltip: 'A soldier succeeds a soldier (1/2/4): +25 martial points, −5 legitimacy — the sword that won the land keeps it.',
        effects: guard('ev2_nasi_succession:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'JUD')) return;
          h.setRuler(ctx, 'JUD', { name: 'Yehonatan bar Baayan', title: 'Nasi Israel', gov: 1, infl: 2, mar: 4, age: 48 });
          h.adjust(ctx, 'JUD', { mar: 25, legitimacy: -5 });
          h.chronicle(ctx, 'ruler', 'Simon bar Kosiba dies; his captains raise one of their own, and the fortresses stay obedient.');
        }),
      },
    ],
  },

  // ── 32 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_scribes_return',
    title: 'The Scribes Return to Jerusalem',
    desc: 'For the first time since Vespasian, the great court sits in Jerusalem by '
      + 'right and not by memory. The academies of the coast and the Galilee send '
      + 'their best south; the archive of the Law, scattered through seventy years '
      + 'of hiding places, is carried up the ascents in ordinary baskets, because '
      + 'there are no extraordinary ones left. The sages, who spent two generations '
      + 'learning to survive without the city, must now learn the harder thing: to '
      + 'govern with it.',
    forTag: 'JUD',
    trigger: safeTrigger('ev2_scribes_return', (ctx) =>
      judaeaStands(ctx) && dateGE(ctx, 143, 1)),
    aiOption: 0,
    options: [
      {
        label: 'The court sits in the city',
        tooltip: 'Jerusalem: −1 unrest and +5% tax, permanent ("The Great Court"); Judaea +5 legitimacy.',
        effects: guard('ev2_scribes_return:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'JUD')) return;
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'great_court', name: 'The Great Court', months: -1,
            effects: { unrest: -1, taxMult: 1.05 },
          });
          h.adjust(ctx, 'JUD', { legitimacy: 5 });
        }),
      },
      {
        label: 'Keep the academies dispersed',
        tooltip: 'One city fell twice already: the schools stay scattered. Judaea +25 influence points; Hebron −1 unrest for 24 months ("The Country Academies").',
        effects: guard('ev2_scribes_return:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'JUD')) return;
          h.adjust(ctx, 'JUD', { infl: 25 });
          h.addProvinceModifier(ctx, 'Hebron', {
            id: 'country_academies', name: 'The Country Academies', months: 24,
            effects: { unrest: -1 },
          });
        }),
      },
    ],
  },

  // ── 33 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_antonine_detente',
    title: 'The Emperor Who Does Not Come',
    desc: 'Antoninus Pius has reigned a dozen years and never left Italy — a fact the '
      + 'Nasi\'s council recites like a psalm of thanksgiving. The legions of Syria '
      + 'drill and are not sent; the governors write memoranda about the anomalous '
      + 'tributary in the hills and are answered with acknowledgments. Rome has not '
      + 'forgiven and has not forgotten; Rome has merely filed. The question for '
      + 'Jerusalem is what to build with a peace that is only an emperor\'s '
      + 'temperament, and dies when he does.',
    forTag: 'JUD',
    trigger: safeTrigger('ev2_antonine_detente', (ctx) =>
      judaeaStands(ctx) && dateGE(ctx, 150, 1) && alive(ctx, 'ROM')),
    aiOption: 1,
    options: [
      {
        label: 'Trade with the empire',
        tooltip: '"The Open Coast": +10% income for 60 months; +50 talents — prosperity now, hostages to fortune later.',
        effects: guard('ev2_antonine_detente:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'JUD')) return;
          h.addTagModifier(ctx, 'JUD', {
            id: 'open_coast', name: 'The Open Coast', months: 60,
            effects: { incomeMult: 1.1 },
          });
          h.adjust(ctx, 'JUD', { treasury: 50 });
        }),
      },
      {
        label: 'Fortify against the next reign',
        tooltip: '−50 talents; +25 martial points; "The Watchtowers": +1 hill defense for 60 months — the peace is a temperament, the walls are stone.',
        effects: guard('ev2_antonine_detente:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'JUD')) return;
          h.adjust(ctx, 'JUD', { treasury: -50, mar: 25 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'watchtowers', name: 'The Watchtowers', months: 60,
            effects: { hillDefBonus: 1 },
          });
        }),
      },
    ],
  },

  // ── 34 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_antoninus_dies',
    title: 'The Philosopher Inherits',
    worldLabel: 'Marcus Aurelius succeeds Antoninus Pius',
    desc: 'Antoninus Pius dies at Lorium as mildly as he governed, giving the watchword '
      + '"equanimity" and turning to the wall. Marcus Aurelius inherits — a man who has '
      + 'kept a private notebook against exactly this day — and at once does something '
      + 'without precedent: raises Lucius Verus beside him, two Augusti at one time. '
      + 'The stoic keeps Rome; the pleasant one can be sent east, where the couriers '
      + 'already ride in relays, because the King of Kings has chosen his moment too.',
    forTag: 'both',
    date: { y: 161, m: 3 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Two Augusti',
        tooltip: 'Marcus Aurelius (5/4/2) rules with Verus as heir and marshal: Rome +15 martial points, +10 legitimacy.',
        effects: guard('ev2_antoninus_dies:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          h.setRuler(ctx, 'ROM', { name: 'Marcus Aurelius', title: 'Emperor', gov: 5, infl: 4, mar: 2, age: 39 });
          h.setHeir(ctx, 'ROM', { name: 'Lucius Verus', gov: 2, infl: 3, mar: 3, age: 30 });
          h.adjust(ctx, 'ROM', { mar: 15, legitimacy: 10 });
          h.chronicle(ctx, 'ruler', 'Antoninus Pius dies; Marcus Aurelius and Lucius Verus rule as two Augusti — the first colleagueship of the purple.');
        }),
      },
      {
        label: 'The philosopher alone',
        tooltip: 'Marcus Aurelius (5/4/2) rules without a colleague: Rome +1 stability — and every eastern courier reports to one desk.',
        effects: guard('ev2_antoninus_dies:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          h.setRuler(ctx, 'ROM', { name: 'Marcus Aurelius', title: 'Emperor', gov: 5, infl: 4, mar: 2, age: 39 });
          h.adjust(ctx, 'ROM', { stability: 1 });
          h.chronicle(ctx, 'ruler', 'Antoninus Pius dies; Marcus Aurelius rules alone, his notebook open against the day.');
        }),
      },
    ],
  },

  // ── 35 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_parthia_161',
    title: 'The King of Kings Chooses His Moment',
    worldLabel: 'Vologases opens the Parthian War',
    desc: 'Vologases has waited out two cautious Roman reigns, and a succession is the '
      + 'traditional hour: Parthian cataphracts pour into Armenia, install a king of '
      + 'their own choosing, and destroy a legion that marched out to object — its '
      + 'commander falling on his sword at Elegeia. The governor of Syria is beaten in '
      + 'the field for good measure. Rome must send an Augustus east, with every '
      + 'detachment the Danube can spare, down roads that pass one by one through '
      + 'Palestine.',
    forTag: 'both',
    date: { y: 161, m: 10 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'War on the Euphrates',
        tooltip: 'If Rome and Parthia both stand and are not already at war: Parthia declares war on Rome; Rome −4,000 manpower (Elegeia), Parthia +25 martial points.',
        effects: guard('ev2_parthia_161:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM') || !alive(ctx, 'PAR') || atWar(ctx.game, 'ROM', 'PAR')) return;
          h.adjust(ctx, 'ROM', { manpower: -4000 });
          h.adjust(ctx, 'PAR', { mar: 25 });
          h.declareWar(ctx, 'PAR', 'ROM', 'The Parthian War of Lucius Verus');
          h.notify(ctx, {
            title: 'Parthia Invades Armenia', type: 'war', provName: 'Tigranocerta',
            text: 'A legion dies at Elegeia; the East is at war from the Caucasus to the Red Sea roads.',
          });
        }),
      },
      {
        label: 'Buy the frontier a year',
        tooltip: 'Gold instead of eagles: Rome −100 talents, Parthia +100 talents, and "Eastern Anxiety" (Rome\'s armies passive) for 8 months. The war comes anyway — later, on Parthia\'s terms.',
        effects: guard('ev2_parthia_161:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM') || !alive(ctx, 'PAR')) return;
          h.adjust(ctx, 'ROM', { treasury: -100 });
          h.adjust(ctx, 'PAR', { treasury: 100 });
          h.addTagModifier(ctx, 'ROM', {
            id: 'eastern_anxiety', name: 'Eastern Anxiety', months: 8,
            effects: { aiPassive: true },
          });
        }),
      },
    ],
  },

  // ── 36 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_armies_on_roads',
    title: 'Armies on the Roads Again',
    desc: 'For the first time since the revolt, columns tramp the coast road for weeks '
      + 'on end — Verus\'s detachments, bound for the Euphrates, requisitioning as '
      + 'armies do. In the study houses the old question rises with the dust: is '
      + 'Rome\'s trouble our hope, or only our danger? The old men, who remember what '
      + 'hope cost, answer with the oaths: not to storm the wall, not to force the '
      + 'end. The young men watch the columns pass and count them anyway.',
    forTag: 'both',
    trigger: safeTrigger('ev2_armies_on_roads', (ctx) =>
      dateGE(ctx, 162, 3) && alive(ctx, 'ROM') && alive(ctx, 'PAR') && atWar(ctx.game, 'ROM', 'PAR')),
    aiOption: 0,
    options: [
      {
        label: 'Our danger, not our hope',
        tooltip: 'The communities supply quietly and keep the oaths: Rome +2,000 manpower from the eastern levies; every Jewish province under Rome +1 unrest for 18 months ("Requisitions").',
        effects: guard('ev2_armies_on_roads:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ROM', { manpower: 2000 });
          stirOccupiedJudaea(ctx, 'requisitions', 'Requisitions', 18, 1);
        }),
      },
      {
        label: 'Count the columns',
        tooltip: 'Hope keeps its own ledger: every Jewish province under Rome +2 unrest for 12 months ("The Old Question") — and if the Nasi\'s state stands, Judaea +10 martial points.',
        effects: guard('ev2_armies_on_roads:1', (ctx) => {
          const h = ctx.helpers;
          stirOccupiedJudaea(ctx, 'old_question', 'The Old Question', 12, 2);
          if (alive(ctx, 'JUD')) h.adjust(ctx, 'JUD', { mar: 10 });
        }),
      },
    ],
  },

  // ── 37 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_antonine_plague',
    title: 'The Pestilence Comes Home',
    worldLabel: 'The Antonine plague spreads from the East',
    desc: 'The army that took Ctesiphon brings back something in its baggage no triumph '
      + 'lists: fever, thirst, a rash like sown barley, death on the ninth day. It '
      + 'travels the military roads at the speed of marching men and empties towns '
      + 'impartially — Jew and Greek and Roman alike, the garrison and the study house, '
      + 'the colonist in Aelia and the weaver in Tiberias. The physicians name it after '
      + 'the reign. The gravediggers do not name it at all.',
    forTag: 'both',
    date: { y: 166, m: 3 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'It empties towns impartially',
        tooltip: 'Rome −12,000 manpower, +2 war exhaustion; Parthia −6,000; Judaea (if it stands) −1,500. Antioch, Caesarea, Jerusalem, Tiberias, Sepphoris, Gaza: +2 unrest and −20% tax for 24 months ("The Great Pestilence").',
        effects: guard('ev2_antonine_plague:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { manpower: -12000, warExhaustion: 2 });
          if (alive(ctx, 'PAR')) h.adjust(ctx, 'PAR', { manpower: -6000 });
          if (alive(ctx, 'JUD')) h.adjust(ctx, 'JUD', { manpower: -1500 });
          for (const name of ['Antioch', 'Caesarea Maritima', 'Jerusalem', 'Tiberias', 'Sepphoris', 'Gaza']) {
            h.addProvinceModifier(ctx, name, {
              id: 'great_pestilence', name: 'The Great Pestilence', months: 24,
              effects: { unrest: 2, taxMult: 0.8 },
            });
          }
          h.chronicle(ctx, 'era', 'The Antonine plague comes home with the army from the East and empties towns impartially.');
        }),
      },
      {
        label: 'Seal the ports and burn the bedding',
        tooltip: 'Rome −100 talents and −8,000 manpower, +1 war exhaustion; Parthia −6,000; Judaea (if it stands) −1,000. The same six cities suffer only 12 months of "The Great Pestilence" (+2 unrest, −20% tax).',
        effects: guard('ev2_antonine_plague:1', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { treasury: -100, manpower: -8000, warExhaustion: 1 });
          if (alive(ctx, 'PAR')) h.adjust(ctx, 'PAR', { manpower: -6000 });
          if (alive(ctx, 'JUD')) h.adjust(ctx, 'JUD', { manpower: -1000 });
          for (const name of ['Antioch', 'Caesarea Maritima', 'Jerusalem', 'Tiberias', 'Sepphoris', 'Gaza']) {
            h.addProvinceModifier(ctx, name, {
              id: 'great_pestilence', name: 'The Great Pestilence', months: 12,
              effects: { unrest: 2, taxMult: 0.8 },
            });
          }
          h.chronicle(ctx, 'era', 'The Antonine plague comes home with the army; the ports close behind it, a season too late.');
        }),
      },
    ],
  },

  // ── 38 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev2_yehuda_hanasi',
    title: 'The Child in the Schoolhouse',
    desc: 'In the schoolhouses of Usha there is a boy the teachers pass among themselves '
      + 'like a found coin: Judah, son of the patriarch, born — the tradition insists — '
      + 'on the very day Akiva died, as though the generation would not let a single '
      + 'hour go unattended. He learns everything and forgets nothing, and one day he '
      + 'will do what no war could: gather the whole Oral Law into one book, the '
      + 'Mishnah, and hand the people a country made of sentences. The war was lost. '
      + 'The book will win.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev2_yehuda_hanasi', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'ushaSanhedrin') && dateGE(ctx, 165, 6)),
    aiOption: 0,
    options: [
      {
        label: 'A country made of sentences',
        tooltip: 'Sepphoris: −1 unrest and +5% tax, permanent ("The Mishnah Begins") — the schoolhouse outlasts the fortress.',
        effects: guard('ev2_yehuda_hanasi:0', (ctx) => {
          const h = ctx.helpers;
          h.addProvinceModifier(ctx, 'Sepphoris', {
            id: 'mishnah_begins', name: 'The Mishnah Begins', months: -1,
            effects: { unrest: -1, taxMult: 1.05 },
          });
          h.chronicle(ctx, 'era', 'In the schoolhouses of Usha a boy named Judah learns everything and forgets nothing. The war was lost; the book will win.');
        }),
      },
      {
        label: 'What can a book do?',
        tooltip: 'The governor\'s office files the report on the patriarch\'s clever son under "no action required": Rome +5 governance points. History will grade the filing.',
        effects: guard('ev2_yehuda_hanasi:1', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { gov: 5 });
          h.chronicle(ctx, 'era', 'Rome files a report on the patriarch\'s clever son under "no action required."');
        }),
      },
    ],
  },
];
