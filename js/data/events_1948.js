// Judaea Universalis — event chain: The War of Independence and the armed
// armistice, 1948–56.
// Content package. Zero imports; all effects run through ctx.helpers at runtime.
// Historical spine: the declaration and invasion (14-15 May), the First and
// Second Truces, the Altalena, the Czech arms, the Bernadotte affair, the
// autumn offensives (Yoav, Hiram, Horev), and the Rhodes armistices of 1949.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_1948] ' + key, e || '');
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

function findWar(game, a, b) {
  for (const w of (game && game.wars) || []) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf(a) !== -1 && all.indexOf(b) !== -1) return w;
  }
  return null;
}

function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[tag];
  return !!(t && t.alive !== false);
}

function atPeace(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[tag];
  return !!(t && !(t.atWarWith || []).some((x) => alive(ctx, x)));
}

function ally(ctx, a, b) {
  const A = ctx.game.tags[a], B = ctx.game.tags[b];
  if (!A || !B || !A.alive || !B.alive) return;
  if (A.allies.indexOf(b) < 0) A.allies.push(b);
  if (B.allies.indexOf(a) < 0) B.allies.push(a);
}

function mergeSyriaIntoUar(ctx) {
  const g = ctx.game;
  const syr = g.tags.SYR, uar = g.tags.UAR;
  if (!syr || !uar) return;
  uar.treasury = (uar.treasury || 0) + (syr.treasury || 0);
  uar.manpower = (uar.manpower || 0) + (syr.manpower || 0);
  uar.maxManpower = (uar.maxManpower || 0) + (syr.maxManpower || 0);
  for (const p of g.provinces || []) {
    if (!p) continue;
    if (p.owner === 'SYR') p.owner = 'UAR';
    if (p.controller === 'SYR') p.controller = 'UAR';
    if (p.siege && p.siege.by === 'SYR') p.siege.by = 'UAR';
  }
  for (const a of Object.values(g.armies || {})) if (a && a.tag === 'SYR') a.tag = 'UAR';
  for (const f of Object.values(g.fleets || {})) if (f && f.tag === 'SYR') f.tag = 'UAR';
  for (const w of Object.values(g.airwings || {})) if (w && w.tag === 'SYR') w.tag = 'UAR';
  for (const w of g.wars || []) {
    w.attackers = Array.from(new Set((w.attackers || []).map((t) => t === 'SYR' ? 'UAR' : t)));
    w.defenders = Array.from(new Set((w.defenders || []).map((t) => t === 'SYR' ? 'UAR' : t)));
    if (w.warscore && Number.isFinite(w.warscore.SYR)) {
      w.warscore.UAR = (w.warscore.UAR || 0) + w.warscore.SYR;
      delete w.warscore.SYR;
    }
  }
  for (const t of Object.values(g.tags)) {
    if (!t) continue;
    for (const key of ['atWarWith', 'allies', 'guarantees']) {
      if (Array.isArray(t[key])) t[key] = Array.from(new Set(t[key].map((x) => x === 'SYR' ? 'UAR' : x))).filter((x) => x !== t.tag);
    }
    if (t.overlord === 'SYR') t.overlord = 'UAR';
    if (t.opinion && t.opinion.SYR !== undefined) {
      t.opinion.UAR = t.opinion.SYR;
      delete t.opinion.SYR;
    }
  }
  delete g.tags.SYR;
  ctx.bus.emit('provinceOwner', {});
}

function addWarscore(ctx, tag, amount) {
  try {
    const w = findWar(ctx.game, 'EGY', 'ISR');
    if (!w) return;
    if (!w.eventScore) w.eventScore = { att: 0, def: 0 };
    const side = (w.attackers || []).indexOf(tag) >= 0 ? 'att'
      : (w.defenders || []).indexOf(tag) >= 0 ? 'def' : null;
    if (side) w.eventScore[side] += amount;
  } catch (e) { warnOnce('addWarscore', e); }
}

// Nudge one court's opinion of another (clamped to the sim's ±200 range).
function setOpinionDelta(game, a, b, delta) {
  try {
    const ta = game.tags && game.tags[a];
    if (!ta) return;
    if (!ta.opinion || typeof ta.opinion !== 'object') ta.opinion = {};
    ta.opinion[b] = Math.max(-200, Math.min(200, (ta.opinion[b] || 0) + delta));
  } catch (e) { warnOnce('setOpinionDelta', e); }
}

// A UN truce: every belligerent's AI stands down for a month.
function imposeTruce(ctx, id, name) {
  for (const t of ['ISR', 'EGY', 'JOR', 'SYR', 'LEB', 'IRQ', 'SAU']) {
    if (!ctx.game.tags[t]) continue;
    ctx.helpers.addTagModifier(ctx, t, {
      id, name, months: 1, effects: { aiPassive: true },
    });
  }
}

export const EVENTS_1948 = [
  // ── 1 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_i_declaration',
    title: 'We Hereby Declare',
    desc: '"...by virtue of our natural and historic right and on the strength of the '
      + 'resolution of the United Nations General Assembly, we hereby declare the '
      + 'establishment of a Jewish state in Eretz-Israel, to be known as the State of '
      + 'Israel." Eleven minutes later, Washington recognizes it. By morning, five '
      + 'armies are across the borders.',
    forTag: 'both',
    date: { y: 1948, m: 5 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The state exists — defend it',
        tooltip: 'Israel: +15 legitimacy, +3,000 manpower (total mobilization).',
        effects: guard('ev_i_decl:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: 15, manpower: 3000 });
          ctx.helpers.chronicle(ctx, 'era', 'The State of Israel is declared in Tel Aviv; five Arab armies cross the borders by morning.');
        }),
      },
    ],
  },

  // ── 1b ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_i_spitfires',
    title: 'Bombs on Tel Aviv',
    requiresWar: ['ISR', 'EGY'],
    desc: 'Egyptian Spitfires come in low over the city that declared itself last week '
      + 'and bomb the central bus station in the morning rush. The new state counts its '
      + 'dead in the street where it read its declaration — and understands, in one '
      + 'morning, that this war has a third dimension and it owns none of it.',
    forTag: 'both',
    date: { y: 1948, m: 5 },
    aiOption: 0,
    options: [
      {
        label: 'The sky must be answered',
        tooltip: 'Tel Aviv: +1 unrest for 6 months. Israel: +15 martial points — the air force argument makes itself.',
        effects: guard('ev_i_spitfires:0', (ctx) => {
          ctx.helpers.addProvinceModifier(ctx, 'Joppa', {
            id: 'bus_station', name: 'The Morning of the Spitfires', months: 6, effects: { unrest: 1 },
          });
          ctx.helpers.adjust(ctx, 'ISR', { mar: 15 });
        }),
      },
    ],
  },

  // ── 1c ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_i_oldcity',
    title: 'The Old City Falls',
    requiresWar: ['ISR', 'JOR'],
    desc: 'After two weeks of house-to-house fighting the Jewish Quarter of the Old '
      + 'City surrenders to the Arab Legion: the defenders marched into captivity, the '
      + 'residents evacuated through the Zion Gate, the synagogues burning behind them. '
      + 'The Legion\'s officers keep their prisoners alive and their looters on a leash '
      + '— it is, everyone notes, the most professionally conducted tragedy of the war.',
    forTag: 'both',
    date: { y: 1948, m: 6 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The Quarter empties',
        tooltip: 'Transjordan: +5 legitimacy, +3 war score. Israel: −5 legitimacy — nineteen centuries of continuity interrupted.',
        effects: guard('ev_i_oldcity:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'JOR', { legitimacy: 5 });
          addWarscore(ctx, 'JOR', 3);
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: -5 });
          ctx.helpers.chronicle(ctx, 'war', 'The Jewish Quarter of the Old City surrenders to the Arab Legion.');
        }),
      },
    ],
  },

  // ── 1d ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_i_adhalom',
    title: 'Four Planes at Ad Halom',
    requiresWar: ['ISR', 'EGY'],
    desc: 'The Egyptian column is a day\'s drive from Tel Aviv when four Avia S-199s — '
      + 'Czech-built Messerschmitts, assembled in secret, flown by pilots who met them '
      + 'this week — hit it at the Ad Halom bridge. Two of the four are lost. The '
      + 'column stops digging in the dunes and never truly moves north again: the '
      + 'ugliest fighter ever built has just bought a state.',
    forTag: 'both',
    date: { y: 1948, m: 6 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The column stops',
        tooltip: 'Egypt: −5% morale for 6 months ("Checked at the Bridge"). Israel: +10 legitimacy, +3 war score.',
        effects: guard('ev_i_adhalom:0', (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'EGY', {
            id: 'checked_bridge', name: 'Checked at the Bridge', months: 6, effects: { moraleMult: 0.95 },
          });
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: 10 });
          addWarscore(ctx, 'ISR', 3);
          ctx.helpers.chronicle(ctx, 'war', 'Four fighters stop the Egyptian column at Ad Halom bridge; the air war opens.');
        }),
      },
    ],
  },

  // ── 2 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_i_truce1',
    title: 'The First Truce',
    requiresWar: [['ISR', 'EGY'], ['ISR', 'JOR'], ['ISR', 'SYR'], ['ISR', 'LEB'], ['ISR', 'IRQ']],
    desc: 'Count Bernadotte\'s cease-fire takes hold on every front: four weeks in which '
      + 'no one may fight and no one may re-arm. Nobody keeps the second clause. The '
      + 'Czech rifles, the Messerschmitts in crates, the artillery bought from three '
      + 'continents — they all land now.',
    forTag: 'both',
    date: { y: 1948, m: 6 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Four weeks of quiet guns',
        tooltip: 'Every army stands down a month. Israel: the Czech arms — +10% discipline permanently, +2,000 manpower.',
        effects: guard('ev_i_truce1:0', (ctx) => {
          imposeTruce(ctx, 'truce_1', 'The First Truce');
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'czech_arms', name: 'The Czech Arms', months: -1, effects: { disciplineMult: 1.1 },
          });
          ctx.helpers.adjust(ctx, 'ISR', { manpower: 2000 });
          ctx.helpers.chronicle(ctx, 'peace', 'The First Truce: four weeks of quiet guns, and the arms ships land by night.');
        }),
      },
    ],
  },

  // ── 3 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_i_altalena',
    title: 'The Altalena',
    desc: 'A ship of the Irgun stands off Tel Aviv with nine hundred fighters and five '
      + 'thousand rifles, and its commanders refuse to hand the cargo to the state\'s '
      + 'one army. There cannot be two. Ben-Gurion\'s cabinet votes; the cannon on the '
      + 'beach is loaded.',
    forTag: 'ISR',
    date: { y: 1948, m: 6 },
    aiOption: 0,
    options: [
      {
        label: 'One state, one army — fire',
        tooltip: 'Israel: +1 stability, −5 legitimacy. The Revisionists −20, the Coalition +10. The state\'s monopoly on force is settled forever.',
        effects: guard('ev_i_altalena:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { stability: 1, legitimacy: -5 });
          ctx.helpers.factionShift(ctx, 'ISR', 'revisionists', -20);
          ctx.helpers.factionShift(ctx, 'ISR', 'coalition', 10);
          ctx.helpers.chronicle(ctx, 'era', 'The Altalena burns off Tel Aviv: one state, one army.');
        }),
      },
      {
        label: 'Negotiate the cargo ashore',
        tooltip: 'Israel: +1 regiment at Joppa, −1 stability. The Revisionists +15, the Coalition −10 — the question of who commands is left open.',
        effects: guard('ev_i_altalena:1', (ctx) => {
          ctx.helpers.spawnArmy(ctx, 'ISR', 'Joppa', { inf: 1, name: 'Irgun Battalion' });
          ctx.helpers.adjust(ctx, 'ISR', { stability: -1 });
          ctx.helpers.factionShift(ctx, 'ISR', 'revisionists', 15);
          ctx.helpers.factionShift(ctx, 'ISR', 'coalition', -10);
        }),
      },
    ],
  },

  // ── 4 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_i_burma_road',
    title: 'The Burma Road',
    requiresWar: [['ISR', 'EGY'], ['ISR', 'JOR'], ['ISR', 'SYR'], ['ISR', 'LEB'], ['ISR', 'IRQ']],
    desc: 'Latrun\'s police fort has thrown back every frontal assault, and Jewish '
      + 'Jerusalem is starving behind it. So the engineers do the impossible instead: '
      + 'a goat track through the hills, bulldozed by night into a road the Legion\'s '
      + 'guns cannot reach. The convoys roll; the city eats.',
    forTag: 'both',
    trigger: safeTrigger('ev_i_burma', (ctx) =>
      dateGE(ctx, 1948, 7) && !ctx.helpers.controls(ctx, 'ISR', 'Emmaus')
      && ctx.helpers.controls(ctx, 'ISR', 'Jerusalem')),
    aiOption: 0,
    options: [
      {
        label: 'The city eats',
        tooltip: 'Israel: +1 regiment reaches Jerusalem; Jerusalem −2 unrest for 12 months.',
        effects: guard('ev_i_burma:0', (ctx) => {
          ctx.helpers.spawnArmy(ctx, 'ISR', 'Jerusalem', { inf: 1, name: 'Convoy Escort' });
          ctx.helpers.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'burma_road_ev', name: 'The Burma Road', months: 12, effects: { unrest: -2 },
          });
        }),
      },
    ],
  },

  // ── 4b ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_i_binnun',
    title: 'Bin Nun at Latrun',
    requiresWar: ['ISR', 'JOR'],
    desc: 'Three assaults on the police fort at Latrun; three repulses. Some of the '
      + 'infantry are immigrants who landed this month, drilled on the beach, and died '
      + 'with the Hebrew for "retreat" still unlearned. The fort commands the road; '
      + 'the road feeds Jerusalem; the arithmetic does not care what it costs.',
    forTag: 'ISR',
    trigger: safeTrigger('ev_i_binnun', (ctx) =>
      dateGE(ctx, 1948, 6) && !!findWar(ctx.game, 'EGY', 'ISR')
      && ctx.helpers.controls(ctx, 'JOR', 'Emmaus')),
    aiOption: 1,
    options: [
      {
        label: 'Assault again',
        tooltip: '−1,500 manpower; +20 martial points — the lessons are paid for in blood, and learned.',
        effects: guard('ev_i_binnun:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { manpower: -1500, mar: 20 });
        }),
      },
      {
        label: 'Stop. Go around.',
        tooltip: '+10 influence points — the engineers get their chance (the Burma Road).',
        effects: guard('ev_i_binnun:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { infl: 10 });
        }),
      },
    ],
  },

  // ── 5 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_i_ten_days',
    title: 'The Ten Days',
    requiresWar: [['ISR', 'EGY'], ['ISR', 'JOR'], ['ISR', 'SYR'], ['ISR', 'LEB'], ['ISR', 'IRQ']],
    desc: 'Between the truces the initiative changes hands for good: Operations Dani '
      + 'and Dekel take Lydda, Ramle and lower Galilee in ten days of open-field '
      + 'fighting the Arab commands believed impossible. The improvised state has '
      + 'become the largest army in the theater.',
    forTag: 'both',
    date: { y: 1948, m: 7 },
    aiOption: 0,
    options: [
      {
        label: 'The initiative changes hands',
        tooltip: 'Israel: +5 war score, +25 martial points.',
        effects: guard('ev_i_tendays:0', (ctx) => {
          addWarscore(ctx, 'ISR', 5);
          ctx.helpers.adjust(ctx, 'ISR', { mar: 25 });
        }),
      },
    ],
  },

  // ── 5b ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_i_lydda',
    title: 'The Roads from Lydda',
    requiresWar: ['ISR', 'JOR'],
    desc: 'Dani took Lydda and Ramle in two days; what followed took longer to name. '
      + 'Tens of thousands walked east toward the Legion\'s lines in the July heat, '
      + 'carrying what could be carried. The orders were terse, the arguments about '
      + 'them have never ended, and the columns on the road will shape this land\'s '
      + 'politics for a century. Wars decide borders; this decided more.',
    forTag: 'ISR',
    date: { y: 1948, m: 7 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The front simplifies',
        tooltip: 'Lod and Latrun: −2 unrest for 12 months. Israel: −10 legitimacy — the chroniclers will argue the orders forever.',
        effects: guard('ev_i_lydda:0', (ctx) => {
          for (const n of ['Lydda', 'Emmaus']) {
            ctx.helpers.addProvinceModifier(ctx, n, {
              id: 'roads_east', name: 'The Roads East', months: 12, effects: { unrest: -2 },
            });
          }
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: -10 });
          ctx.helpers.chronicle(ctx, 'war', 'Lydda and Ramle fall to Operation Dani; the roads east fill in the July heat.');
        }),
      },
      {
        label: 'Garrison the towns instead',
        tooltip: '−25 martial points (brigades tied down); Lod +2 unrest for 12 months — and the harder question is left unasked.',
        effects: guard('ev_i_lydda:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { mar: -25 });
          ctx.helpers.addProvinceModifier(ctx, 'Lydda', {
            id: 'towns_held', name: 'The Towns Garrisoned', months: 12, effects: { unrest: 2 },
          });
        }),
      },
    ],
  },

  // ── 5c ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_i_mahal',
    title: 'MAHAL and GAHAL',
    desc: 'The gates are open and the ships come loaded both ways: survivors of the '
      + 'camps conscripted down the gangplank, and volunteers — Second World War '
      + 'pilots, gunners, radar men from five continents, some Jewish, some merely '
      + 'unemployable in peacetime — signing on for a war that finally wants exactly '
      + 'what they know.',
    forTag: 'both',
    date: { y: 1948, m: 8 },
    aiOption: 0,
    options: [
      {
        label: 'Every gangplank a muster line',
        tooltip: 'Israel: +3,000 manpower now, +10% manpower for 12 months ("The Gates Open").',
        effects: guard('ev_i_mahal:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { manpower: 3000 });
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'gates_open', name: 'The Gates Open', months: 12, effects: { manpowerMult: 1.1 },
          });
          // The ships land people, not just soldiers (SPEC §56): the coastal
          // cities grow Jewish by the boatload.
          if (typeof ctx.helpers.addPopulation === 'function') {
            ctx.helpers.addPopulation(ctx, 'Joppa', { r: 'judaism', c: 'israeli', n: 25000 });
            ctx.helpers.addPopulation(ctx, 'Dora', { r: 'judaism', c: 'israeli', n: 15000 });
          }
        }),
      },
    ],
  },

  // ── 6 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_i_truce2',
    title: 'The Second Truce',
    requiresWar: [['ISR', 'EGY'], ['ISR', 'JOR'], ['ISR', 'SYR'], ['ISR', 'LEB'], ['ISR', 'IRQ']],
    desc: 'The Security Council orders a truce of indefinite duration, on pain of '
      + 'sanctions. Both sides sign; both sides plan. The war will now be decided in '
      + 'whatever week somebody chooses to break the quiet.',
    forTag: 'both',
    date: { y: 1948, m: 8 },
    aiOption: 0,
    options: [
      {
        label: 'Sign, and plan',
        tooltip: 'Every army stands down a month.',
        effects: guard('ev_i_truce2:0', (ctx) => {
          imposeTruce(ctx, 'truce_2', 'The Second Truce');
        }),
      },
    ],
  },

  // ── 7 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_i_bernadotte',
    title: 'The Bernadotte Affair',
    requiresWar: [['ISR', 'EGY'], ['ISR', 'JOR'], ['ISR', 'SYR'], ['ISR', 'LEB'], ['ISR', 'IRQ']],
    desc: 'The UN mediator proposes handing the Negev to Transjordan and '
      + 'internationalizing Jerusalem — and is shot dead in his car by Lehi gunmen '
      + 'the next week. The state\'s enemies call it policy; the state must decide '
      + 'what to call it.',
    forTag: 'ISR',
    date: { y: 1948, m: 9 },
    aiOption: 0,
    options: [
      {
        label: 'Disband Lehi, arrest hundreds',
        tooltip: 'Israel: +1 stability, +10 legitimacy; the Revisionists −10 — the law is the law, even in war.',
        effects: guard('ev_i_bernadotte:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { stability: 1, legitimacy: 10 });
          ctx.helpers.factionShift(ctx, 'ISR', 'revisionists', -10);
        }),
      },
      {
        label: 'A quiet file, a loud war',
        tooltip: 'Israel: −10 legitimacy, +25 martial points; the Revisionists +10.',
        effects: guard('ev_i_bernadotte:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: -10, mar: 25 });
          ctx.helpers.factionShift(ctx, 'ISR', 'revisionists', 10);
        }),
      },
    ],
  },

  // ── 7b ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_i_kaukji',
    title: 'Kaukji\'s Pocket',
    requiresWar: [['ISR', 'SYR'], ['ISR', 'LEB']],
    desc: 'Fawzi al-Kaukji and the Arab Liberation Army still hold a pocket of central '
      + 'Galilee — the one Arab force in this war answerable to no government at all. '
      + 'In October he breaks the truce on his own authority and takes a hilltop from '
      + 'the Israelis, which will shortly prove to be the most expensive hilltop of '
      + 'his career: the northern command has been waiting for a reason.',
    forTag: 'both',
    date: { y: 1948, m: 9 },
    aiOption: 0,
    options: [
      {
        label: 'The irregulars dig in',
        tooltip: 'Syria: 2 regiments of the Liberation Army at Safed. The reason Operation Hiram needs is being written.',
        effects: guard('ev_i_kaukji:0', (ctx) => {
          ctx.helpers.spawnArmy(ctx, 'SYR', 'Gischala', {
            inf: 2, name: 'Jaysh al-Inqadh',
            general: { name: 'Fawzi al-Kaukji', fire: 1, shock: 2, maneuver: 2 },
          });
        }),
      },
    ],
  },

  // ── 7c ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_i_allpalestine',
    title: 'The Government of All-Palestine',
    desc: 'In Egyptian-held Gaza a Palestinian government is proclaimed — with Cairo\'s '
      + 'blessing, the Mufti\'s presidency, and authority over approximately nothing. '
      + 'Its purpose is plain to every chancellery: not to govern Palestine but to '
      + 'deny it to Abdullah. The Arab war effort now has two objectives, and they '
      + 'are each other.',
    forTag: 'both',
    date: { y: 1948, m: 10 },
    aiOption: 0,
    options: [
      {
        label: 'Two claimants, one Palestine',
        tooltip: 'Egypt: +5 legitimacy. Transjordan: −5 legitimacy, and Cairo and Amman −30 opinion of each other.',
        effects: guard('ev_i_allpal:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'EGY', { legitimacy: 5 });
          ctx.helpers.adjust(ctx, 'JOR', { legitimacy: -5 });
          const g = ctx.game;
          setOpinionDelta(g, 'EGY', 'JOR', -30);
          setOpinionDelta(g, 'JOR', 'EGY', -30);
          ctx.helpers.chronicle(ctx, 'era', 'The All-Palestine Government is proclaimed in Gaza — aimed less at Tel Aviv than at Amman.');
        }),
      },
    ],
  },

  // ── 8 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_i_yoav',
    title: 'Operation Yoav',
    requiresWar: [['ISR', 'EGY'], ['ISR', 'JOR'], ['ISR', 'SYR'], ['ISR', 'LEB'], ['ISR', 'IRQ']],
    desc: 'A convoy is fired on (it was meant to be); the truce is declared broken (it '
      + 'was meant to be); and eight months of siege end in a week as Allon\'s columns '
      + 'cut the Egyptian line at three points. An Egyptian brigade digs in at Faluja '
      + 'and will not surrender — among its staff officers, a major named Nasser.',
    forTag: 'both',
    trigger: safeTrigger('ev_i_yoav', (ctx) =>
      dateGE(ctx, 1948, 10) && !!findWar(ctx.game, 'EGY', 'ISR')),
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The south opens',
        tooltip: 'Israel: 3 regiments at Jamnia, +5 war score. Egypt: the Faluja Pocket — −10% morale for 12 months.',
        effects: guard('ev_i_yoav:0', (ctx) => {
          ctx.helpers.spawnArmy(ctx, 'ISR', 'Jamnia', {
            inf: 2, cav: 1, name: 'Southern Front',
            general: { name: 'Yigal Allon', fire: 2, shock: 3, maneuver: 4 },
          });
          addWarscore(ctx, 'ISR', 5);
          ctx.helpers.addTagModifier(ctx, 'EGY', {
            id: 'faluja_pocket', name: 'The Faluja Pocket', months: 12, effects: { moraleMult: 0.9 },
          });
        }),
      },
    ],
  },

  // ── 9 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_i_hiram',
    title: 'Hiram and Horev',
    requiresWar: [['ISR', 'EGY'], ['ISR', 'JOR'], ['ISR', 'SYR'], ['ISR', 'LEB'], ['ISR', 'IRQ']],
    desc: 'In sixty hours the northern command clears the Galilee to the Litani '
      + 'approaches; in the south the columns wheel into Sinai itself until London '
      + 'threatens to invoke its treaty with Cairo. The war has one ending now, and '
      + 'everyone can read it. The wires to Rhodes begin to hum.',
    forTag: 'both',
    trigger: safeTrigger('ev_i_hiram', (ctx) =>
      dateGE(ctx, 1948, 12) && !!findWar(ctx.game, 'EGY', 'ISR')),
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'To the table, then',
        tooltip: 'Israel: +8 war score. The war can now be negotiated — armistice talks open.',
        effects: guard('ev_i_hiram:0', (ctx) => {
          addWarscore(ctx, 'ISR', 8);
          const w = findWar(ctx.game, 'EGY', 'ISR');
          if (w) w.noNegotiation = false;
          ctx.helpers.chronicle(ctx, 'war', 'Operations Hiram and Horev end the fighting war; the wires to Rhodes begin to hum.');
        }),
      },
    ],
  },

  // ── 9b ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_i_abdullah_meir',
    title: 'The Secret Wire',
    requiresWar: ['ISR', 'JOR'],
    desc: 'The contacts never quite stopped: emissaries in disguise, a villa in the '
      + 'night, the King explaining with perfect courtesy that he is the only Arab '
      + 'ruler who will still be at this table in ten years. Amman and Tel Aviv are '
      + 'officially at war and unofficially the two most rational actors in it.',
    forTag: 'JOR',
    trigger: safeTrigger('ev_i_wire', (ctx) =>
      dateGE(ctx, 1948, 11) && !!findWar(ctx.game, 'EGY', 'ISR')),
    aiOption: 1,
    options: [
      {
        label: 'Keep the wire open',
        tooltip: 'Amman and Tel Aviv +40 opinion of each other; +15 influence points; the Palace +8 approval. The League would call it treason, if told.',
        effects: guard('ev_i_wire:0', (ctx) => {
          const g = ctx.game;
          setOpinionDelta(g, 'JOR', 'ISR', 40);
          setOpinionDelta(g, 'ISR', 'JOR', 40);
          ctx.helpers.adjust(ctx, 'JOR', { infl: 15 });
          ctx.helpers.factionShift(ctx, 'JOR', 'palace', 8);
        }),
      },
      {
        label: 'Stand with the League',
        tooltip: '+5 legitimacy — solidarity is cheap this month; the bill arrives later.',
        effects: guard('ev_i_wire:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'JOR', { legitimacy: 5 });
        }),
      },
    ],
  },

  // ── 9c ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_i_faluja',
    title: 'The Pocket Holds',
    requiresWar: ['ISR', 'EGY'],
    desc: 'An Egyptian brigade sits encircled at Faluja and declines, week after week, '
      + 'to surrender — the one unambiguous piece of honor Cairo will carry home from '
      + 'this war. Among the staff officers keeping it alive is a young major named '
      + 'Gamal Abdel Nasser, taking detailed notes on whose fault all this is.',
    forTag: 'both',
    trigger: safeTrigger('ev_i_faluja', (ctx) =>
      dateGE(ctx, 1948, 12)
      && !!(ctx.game.firedEvents && ctx.game.firedEvents.ev_i_yoav)),
    aiOption: 0,
    options: [
      {
        label: 'Honor, salvaged',
        tooltip: 'Egypt: +5 legitimacy, +5% morale for 6 months. Israel: +10 influence points — the siege talks plant seeds.',
        effects: guard('ev_i_faluja:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'EGY', { legitimacy: 5 });
          ctx.helpers.addTagModifier(ctx, 'EGY', {
            id: 'faluja_honor', name: 'The Pocket Holds', months: 6, effects: { moraleMult: 1.05 },
          });
          ctx.helpers.adjust(ctx, 'ISR', { infl: 10 });
        }),
      },
    ],
  },

  // ── 9d ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_i_jericho',
    title: 'The Jericho Conference',
    desc: 'Several thousand Palestinian notables — mayors, sheikhs, the practical men '
      + 'of the hill country — meet at Jericho and proclaim Abdullah king of Arab '
      + 'Palestine. Cairo calls it treason, Damascus calls it annexation, and the '
      + 'King calls it the will of the people, which for once is at least partly true.',
    forTag: 'both',
    date: { y: 1948, m: 12 },
    aiOption: 0,
    options: [
      {
        label: 'The two banks, one crown',
        tooltip: 'Transjordan: +10 legitimacy, +25 influence points; Cairo and Damascus −25 opinion of Amman.',
        effects: guard('ev_i_jericho:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'JOR', { legitimacy: 10, infl: 25 });
          const g = ctx.game;
          setOpinionDelta(g, 'EGY', 'JOR', -25);
          setOpinionDelta(g, 'SYR', 'JOR', -25);
          ctx.helpers.chronicle(ctx, 'era', 'The Jericho Conference proclaims Abdullah king of Arab Palestine; the League fumes.');
        }),
      },
    ],
  },

  // ── 9e ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_i_knesset',
    title: 'The Ballot Under Fire',
    desc: 'With the southern front still smoking, the state holds its first general '
      + 'election: 87 percent turnout, twenty-one parties, and a Constituent Assembly '
      + 'that convenes in a Jerusalem the UN still says belongs to nobody. Whatever '
      + 'else the war decides, the polity that fought it will be argued over in '
      + 'committee, forever, by everyone. This too is a victory condition.',
    forTag: 'both',
    date: { y: 1949, m: 1 },
    aiOption: 0,
    options: [
      {
        label: 'The Assembly convenes',
        tooltip: 'Israel: +10 legitimacy, +1 stability; the Coalition +10 approval.',
        effects: guard('ev_i_knesset:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: 10, stability: 1 });
          ctx.helpers.factionShift(ctx, 'ISR', 'coalition', 10);
          ctx.helpers.chronicle(ctx, 'era', 'Israel votes under fire: the first Knesset convenes.');
        }),
      },
    ],
  },

  // ── 10 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_i_armistice',
    title: 'Rhodes',
    requiresWar: [['ISR', 'EGY'], ['ISR', 'JOR'], ['ISR', 'SYR'], ['ISR', 'LEB'], ['ISR', 'IRQ']],
    desc: 'On the island of Rhodes, under a UN flag and Ralph Bunche\'s exhausted '
      + 'patience, the delegations initial the maps: the lines where the armies stand '
      + 'become the lines on the atlas — armistice, not peace, as every signature is '
      + 'careful to say. It will have to do. It does, for a generation.',
    forTag: 'both',
    trigger: safeTrigger('ev_i_armistice', (ctx) =>
      dateGE(ctx, 1949, 2) && !!findWar(ctx.game, 'EGY', 'ISR')),
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The lines become the map',
        tooltip: 'The war ends where the armies stand (armistice on present lines). Every court: −2 war exhaustion.',
        effects: guard('ev_i_armistice:0', (ctx) => {
          ctx.helpers.endWar(ctx, 'EGY', 'ISR', 'def');
          for (const t of ['ISR', 'EGY', 'JOR', 'SYR', 'LEB', 'IRQ', 'SAU']) {
            if (!ctx.game.tags[t]) continue;
            ctx.helpers.adjust(ctx, t, { warExhaustion: -2 });
            // The armistice is not friendship, but for five years it channels
            // policy into reorganization rather than random opportunistic wars.
            ctx.helpers.addTagModifier(ctx, t, {
              id: 'armistice_restraint', name: 'The Armed Armistice', months: 60,
              effects: { noOpportunisticWars: true },
            });
          }
          ctx.helpers.chronicle(ctx, 'peace', 'The Rhodes armistices: the lines where the armies stand become the lines on the atlas.');
        }),
      },
    ],
  },

  // ── 11 ───────────────────────────────────────────────────────────────────
  {
    id: 'ev_i_joint_defence',
    title: 'A Treaty of Joint Defence',
    desc: 'The Arab League gives the lesson of 1948 an institutional form: a Joint '
      + 'Defence Council, a permanent military committee, and the promise that an '
      + 'attack on one concerns all. The signatures are real. So are the rival staffs, '
      + 'competing war aims, and governments that do not intend to place their best '
      + 'formations under a neighbor’s command.',
    forTag: 'both',
    date: { y: 1950, m: 6 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'A common defense, if not a common command',
        tooltip: 'Egypt, Jordan, Syria, Lebanon, Iraq and Saudi Arabia guarantee one another. Their peacetime AI begins threat-driven rearmament, but joint-command friction slows reinforcement.',
        effects: guard('ev_i_joint_defence:0', (ctx) => {
          const members = ['EGY', 'JOR', 'SYR', 'LEB', 'IRQ', 'SAU'].filter((t) => ctx.game.tags[t]);
          for (const a of members) {
            const ta = ctx.game.tags[a];
            if (!Array.isArray(ta.guarantees)) ta.guarantees = [];
            for (const b of members) if (a !== b && ta.guarantees.indexOf(b) < 0) ta.guarantees.push(b);
            ctx.helpers.addTagModifier(ctx, a, {
              id: 'joint_command_rivalries', name: 'Joint Command Rivalries', months: 84,
              effects: { reinforceMult: 0.92 },
            });
          }
          ctx.game.flags.postwarRearmament = true;
          ctx.helpers.chronicle(ctx, 'diplomacy', 'The Arab League Joint Defence Council is established: formal solidarity without a single command.');
        }),
      },
    ],
  },

  // ── 12 ───────────────────────────────────────────────────────────────────
  {
    id: 'ev_i_arms_race',
    title: 'The Balance of Arms Breaks',
    desc: 'Cairo announces an arms agreement through Czechoslovakia: tanks, aircraft, '
      + 'guns, and a new scale of supply. The transaction does more than strengthen '
      + 'Egypt. Every general staff in the region recalculates what the next war would '
      + 'require, and treasuries accumulated through the armistice begin turning into '
      + 'formations, airfields, and imported weapons.',
    forTag: 'both',
    date: { y: 1955, m: 9 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The armistice becomes an arms race',
        tooltip: 'Egypt fields 8 new regiments and gains +8% discipline for 36 months. Israel gains 3,000 manpower and faster reinforcement. Threat-driven AI force ceilings rise by 15%.',
        effects: guard('ev_i_arms_race:0', (ctx) => {
          ctx.game.flags.postwarRearmament = true;
          ctx.game.flags.armsRaceEscalated = true;
          if (ctx.game.tags.EGY) {
            ctx.helpers.spawnArmy(ctx, 'EGY', 'Memphis', {
              inf: 6, cav: 2, name: 'Soviet-Pattern Rearmament Cadres',
              general: { name: 'Abdel Hakim Amer', fire: 2, shock: 2, maneuver: 2 },
            });
            ctx.helpers.addTagModifier(ctx, 'EGY', {
              id: 'czech_arms', name: 'The Czech Arms Agreement', months: 36,
              effects: { disciplineMult: 1.08, reinforceMult: 1.1 },
            });
          }
          if (ctx.game.tags.ISR) {
            ctx.helpers.adjust(ctx, 'ISR', { manpower: 3000, mar: 25 });
            ctx.helpers.addTagModifier(ctx, 'ISR', {
              id: 'arms_race_response', name: 'Rearmament Emergency', months: 36,
              effects: { reinforceMult: 1.12 },
            });
          }
          ctx.helpers.chronicle(ctx, 'war', 'The Egyptian–Czechoslovak agreement turns the armed armistice into a regional arms race.');
        }),
      },
    ],
  },

  // ── THE ARMED ARMISTICE BECOMES A REGIONAL SYSTEM ─────────────────────────
  {
    id: 'ev_i_free_officers',
    title: 'The Free Officers',
    worldLabel: 'The Free Officers overthrow Egypt’s monarchy',
    desc: 'Officers move before dawn, seize the communications centers, and send King '
      + 'Farouk into exile. The defeat of 1948 is part of their indictment of the old '
      + 'order. Egypt becomes a republic whose army is no longer merely recovering from '
      + 'the last war—it is becoming the state\'s central institution.',
    forTag: 'both',
    date: { y: 1952, m: 7 },
    world: true,
    major: true,
    aiOption: 0,
    options: [{
      label: 'The monarchy sails from Alexandria',
      tooltip: 'A surviving Egypt becomes a republic under Muhammad Naguib: short instability, then stronger military recruitment and rearmament.',
      effects: guard('ev_i_free_officers:0', (ctx) => {
        const egy = ctx.game.tags.EGY;
        if (!egy || !egy.alive) return;
        egy.govType = 'republic';
        egy.electionIn = 48;
        egy.heir = null;
        egy.regency = false;
        ctx.helpers.setRuler(ctx, 'EGY', { name: 'Muhammad Naguib', title: 'President', gov: 3, infl: 3, mar: 3, age: 51 });
        ctx.helpers.adjust(ctx, 'EGY', { stability: -1, legitimacy: -20, manpower: 5000, mar: 35 });
        ctx.helpers.addTagModifier(ctx, 'EGY', {
          id: 'free_officers', name: 'The Free Officers', months: 48,
          effects: { manpowerMult: 1.12, reinforceMult: 1.08 },
        });
        ctx.helpers.chronicle(ctx, 'ruler', 'The Free Officers overthrow King Farouk; Egypt becomes a republic under Muhammad Naguib.');
      }),
    }],
  },
  {
    id: 'ev_i_baghdad_pact',
    title: 'The Northern Tier',
    worldLabel: 'The Baghdad Pact divides the region’s alignments',
    desc: 'Iraq and Turkey sign at Baghdad; Britain joins, and Iran follows. The pact is '
      + 'aimed northward in the language of the Cold War, but it divides Arab politics '
      + 'as surely as it organizes defense. Cairo sees a rival system, not Arab unity.',
    forTag: 'both',
    date: { y: 1955, m: 2 },
    world: true,
    major: true,
    aiOption: 0,
    options: [{
      label: 'One region, two security systems',
      tooltip: 'Living Iraq, Turkey, Iran and Britain ally and guarantee one another. Egypt and Iraq lose opinion, splitting the former Arab coalition.',
      effects: guard('ev_i_baghdad_pact:0', (ctx) => {
        const members = ['IRQ', 'TUR', 'IRN', 'UK'].filter((t) => alive(ctx, t));
        for (const a of members) {
          const ta = ctx.game.tags[a];
          for (const b of members) {
            if (a === b) continue;
            ally(ctx, a, b);
            if (ta.guarantees.indexOf(b) < 0) ta.guarantees.push(b);
          }
          ctx.helpers.addTagModifier(ctx, a, {
            id: 'baghdad_pact', name: 'The Baghdad Pact', months: 84,
            effects: { reinforceMult: 1.06 },
          });
        }
        if (alive(ctx, 'EGY') && alive(ctx, 'IRQ')) {
          ctx.game.tags.EGY.opinion.IRQ = -110;
          ctx.game.tags.IRQ.opinion.EGY = -90;
        }
        ctx.helpers.chronicle(ctx, 'diplomacy', 'The Baghdad Pact creates a northern security tier and a rival center inside Arab politics.');
      }),
    }],
  },
  {
    id: 'ev_i_suez',
    title: 'Suez',
    worldLabel: 'Canal nationalization opens the Suez Crisis',
    desc: 'Nasser nationalizes the Suez Canal. Britain and France prepare intervention; '
      + 'Israel weighs the Straits, the fedayeen, and a coordinated attack through Sinai. '
      + 'The crisis occurs on schedule, but war begins only if the live states remain '
      + 'hostile and independent enough to fight it.',
    forTag: 'both',
    date: { y: 1956, m: 10 },
    world: true,
    major: true,
    aiOption: 0,
    options: [{
      label: 'The canal becomes a front',
      tooltip: 'Nasser takes power. If Egypt and Israel remain hostile, the Sinai War begins; a surviving Britain intervenes separately. Armies fight the result normally.',
      effects: guard('ev_i_suez:0', (ctx) => {
        const egy = ctx.game.tags.EGY;
        if (!egy || !egy.alive) {
          ctx.helpers.chronicle(ctx, 'diplomacy', 'The Suez crisis reaches a region where the Egyptian state that nationalized the canal no longer exists.');
          return;
        }
        ctx.helpers.setRuler(ctx, 'EGY', { name: 'Gamal Abdel Nasser', title: 'President', gov: 4, infl: 5, mar: 3, age: 38 });
        ctx.helpers.adjust(ctx, 'EGY', { treasury: 200, legitimacy: 20, infl: 40 });
        ctx.helpers.addTagModifier(ctx, 'EGY', {
          id: 'suez_nationalized', name: 'The Canal Nationalized', months: 60,
          effects: { incomeMult: 1.1 },
        });
        const opinion = egy.opinion && Number.isFinite(egy.opinion.ISR) ? egy.opinion.ISR : -200;
        const hostile = alive(ctx, 'ISR') && opinion <= -75;
        if (hostile && !findWar(ctx.game, 'ISR', 'EGY')) {
          ctx.helpers.declareWar(ctx, 'ISR', 'EGY', 'The Sinai War');
          if (ctx.helpers.controls(ctx, 'ISR', 'Rhinocolura')) {
            ctx.helpers.spawnArmy(ctx, 'ISR', 'Rhinocolura', { inf: 6, cav: 3, name: 'Sinai Task Force' });
          } else if (ctx.helpers.controls(ctx, 'ISR', 'Gaza')) {
            ctx.helpers.spawnArmy(ctx, 'ISR', 'Gaza', { inf: 6, cav: 3, name: 'Sinai Task Force' });
          }
        }
        if (alive(ctx, 'UK') && !findWar(ctx.game, 'UK', 'EGY')) {
          ctx.helpers.declareWar(ctx, 'UK', 'EGY', 'The Anglo-French Intervention');
        }
        ctx.helpers.chronicle(ctx, 'war', 'Egypt nationalizes the Suez Canal; the live alignments determine whether the crisis becomes war.');
      }),
    }],
  },
  {
    id: 'ev_i_uar_union',
    title: 'One Republic from Cairo to Damascus',
    worldLabel: 'Egypt and Syria attempt the United Arab Republic',
    desc: 'Syrian officers and politicians ask for immediate union with Nasser\'s Egypt. '
      + 'The proposal does not depend on Israel having been destroyed; it belongs to the '
      + 'politics of Arab nationalism. It succeeds only if both republics still exist, '
      + 'remain independent, and are at peace enough to unite.',
    forTag: 'both',
    date: { y: 1958, m: 2 },
    world: true,
    major: true,
    aiOption: 0,
    options: [{
      label: 'Raise one flag over two capitals',
      tooltip: 'At-peace, independent Egypt and Syria form the UAR through an event path unrelated to conquering Israel. Otherwise the union remains an unrealized project.',
      effects: guard('ev_i_uar_union:0', (ctx) => {
        const egy = ctx.game.tags.EGY, syr = ctx.game.tags.SYR;
        const canUnite = egy && syr && egy.alive && syr.alive && !egy.overlord && !syr.overlord
          && atPeace(ctx, 'EGY') && atPeace(ctx, 'SYR');
        if (canUnite && ctx.helpers.switchTag(ctx, 'EGY', 'UAR')) {
          mergeSyriaIntoUar(ctx);
          ctx.helpers.setRuler(ctx, 'UAR', { name: 'Gamal Abdel Nasser', title: 'President', gov: 4, infl: 5, mar: 3, age: 40 });
          ctx.helpers.adjust(ctx, 'UAR', { stability: 1, legitimacy: 20, infl: 40 });
          ctx.helpers.addTagModifier(ctx, 'UAR', {
            id: 'arab_union_1958', name: 'The United Arab Republic', months: -1,
            effects: { manpowerMult: 1.12, incomeMult: 1.05 },
          });
          ctx.helpers.chronicle(ctx, 'diplomacy', 'Egypt and Syria unite as the United Arab Republic under Nasser.');
        } else {
          if (egy && egy.alive) ctx.helpers.adjust(ctx, 'EGY', { infl: 15 });
          if (syr && syr.alive) ctx.helpers.adjust(ctx, 'SYR', { infl: 15 });
          ctx.helpers.chronicle(ctx, 'diplomacy', 'The project of Egyptian-Syrian union meets an altered map and remains a project.');
        }
      }),
    }],
  },
  {
    id: 'ev_i_iraqi_revolution',
    title: 'The Monarchy Falls in Baghdad',
    worldLabel: 'The Iraqi revolution overturns the Hashemite monarchy',
    desc: 'Army units enter Baghdad, the royal family is killed, and Abd al-Karim Qasim '
      + 'proclaims a republic. If Iraq still exists, the revolution tears it out of the '
      + 'Baghdad Pact and destroys the old Hashemite axis. If another state holds Baghdad, '
      + 'the date produces unrest rather than resurrecting a vanished monarchy.',
    forTag: 'both',
    date: { y: 1958, m: 7 },
    world: true,
    major: true,
    aiOption: 0,
    options: [{
      label: 'The officers hold the radio station',
      tooltip: 'A surviving Iraq becomes a republic, breaks its Baghdad Pact alliances, and suffers short instability before military consolidation.',
      effects: guard('ev_i_iraqi_revolution:0', (ctx) => {
        const irq = ctx.game.tags.IRQ;
        if (!irq || !irq.alive) {
          ctx.helpers.addProvinceModifier(ctx, 'Seleucia-Ctesiphon', {
            id: 'iraqi_revolutionary_current', name: 'The Revolutionary Current', months: 18,
            effects: { unrest: 1.5 },
          });
          return;
        }
        irq.govType = 'republic';
        irq.heir = null;
        irq.regency = false;
        ctx.helpers.setRuler(ctx, 'IRQ', { name: 'Abd al-Karim Qasim', title: 'Prime Minister', gov: 3, infl: 3, mar: 4, age: 43 });
        for (const partner of ['UK', 'TUR', 'IRN']) {
          const p = ctx.game.tags[partner];
          irq.allies = irq.allies.filter((t) => t !== partner);
          irq.guarantees = irq.guarantees.filter((t) => t !== partner);
          if (p) {
            p.allies = p.allies.filter((t) => t !== 'IRQ');
            p.guarantees = p.guarantees.filter((t) => t !== 'IRQ');
          }
        }
        ctx.helpers.removeModifier(ctx, 'IRQ', 'baghdad_pact');
        ctx.helpers.adjust(ctx, 'IRQ', { stability: -2, legitimacy: -35, manpower: 3000, mar: 25 });
        ctx.helpers.addTagModifier(ctx, 'IRQ', {
          id: 'july_revolution', name: 'The July Revolution', months: 36,
          effects: { manpowerMult: 1.1 },
        });
        ctx.helpers.chronicle(ctx, 'ruler', 'The Iraqi monarchy falls; Abd al-Karim Qasim proclaims a republic and leaves the Baghdad Pact.');
      }),
    }],
  },
];
