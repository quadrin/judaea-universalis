// Judaea Universalis — event chain: The War of Independence, the armed
// armistice, and the wars and peace that follow, 1948–79.
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

// ── The long armistice, 1958–79: shared plumbing ────────────────────────────
// The map may have diverged by the sixties — the UAR may stand or Egypt may
// stand alone, Israel may or may not hold Jerusalem and Sinai — so the later
// arcs resolve their casts and their fronts at runtime instead of assuming
// the atlas.
function egyTag(ctx) {
  if (alive(ctx, 'EGY')) return 'EGY';
  if (alive(ctx, 'UAR')) return 'UAR';
  return null;
}
function syrTag(ctx) {
  if (alive(ctx, 'SYR')) return 'SYR';
  if (alive(ctx, 'UAR')) return 'UAR';
  return null;
}
// Opinion check in the ev_i_suez idiom: an unrecorded opinion between these
// courts is old hatred, not indifference.
function hostileToward(ctx, a, b, threshold) {
  const t = ctx.game.tags[a];
  if (!t || t.alive === false) return false;
  const op = t.opinion && Number.isFinite(t.opinion[b]) ? t.opinion[b] : -200;
  return op <= threshold;
}
// eventScore for any war (addWarscore above is wired to the 1948 EGY–ISR war).
function warEventScore(ctx, a, b, tag, amount) {
  try {
    const w = findWar(ctx.game, a, b);
    if (!w) return;
    if (!w.eventScore) w.eventScore = { att: 0, def: 0 };
    const side = (w.attackers || []).indexOf(tag) >= 0 ? 'att'
      : (w.defenders || []).indexOf(tag) >= 0 ? 'def' : null;
    if (side) w.eventScore[side] += amount;
  } catch (e) { warnOnce('warEventScore', e); }
}
// Spawn at the first listed province the tag actually controls — fronts move.
function spawnAt(ctx, tag, provNames, opts) {
  for (const n of provNames) {
    if (ctx.helpers.controls(ctx, tag, n)) return ctx.helpers.spawnArmy(ctx, tag, n, opts);
  }
  return null;
}

// June 1967, both doors. Called by both options of ev_i_moked: the strike, or
// the waiting continued until the coalition chooses the hour instead.
function sixDayOutbreak(ctx, preempt) {
  const g = ctx.game;
  const e = egyTag(ctx), s = syrTag(ctx);
  if (!alive(ctx, 'ISR') || !e) {
    ctx.helpers.chronicle(ctx, 'era', 'June 1967 arrives in a world whose 1948 ended differently; the six days belong to another history.');
    return;
  }
  const enemies = [];
  if (hostileToward(ctx, e, 'ISR', -50)) enemies.push(e);
  if (alive(ctx, 'JOR') && hostileToward(ctx, 'JOR', 'ISR', -40)) enemies.push('JOR');
  if (s && s !== e && enemies.indexOf(s) < 0 && hostileToward(ctx, s, 'ISR', -40)) enemies.push(s);
  if (!enemies.length) {
    ctx.helpers.chronicle(ctx, 'diplomacy', 'The May crisis finds no coalition hostile enough to fight; the June that history expected does not come.');
    return;
  }
  g.flags.jorHeldJerusalem = alive(ctx, 'JOR') && ctx.helpers.controls(ctx, 'JOR', 'Jerusalem');
  g.flags.sixDayWar = true;
  if (preempt) {
    for (const t of enemies) {
      if (!findWar(g, 'ISR', t)) ctx.helpers.declareWar(ctx, 'ISR', t, 'The Six-Day War');
      ctx.helpers.addTagModifier(ctx, t, {
        id: 'moked', name: 'The Air Force Destroyed on the Ground', months: 12,
        effects: { moraleMult: 0.85 },
      });
      warEventScore(ctx, 'ISR', t, 'ISR', 8);
    }
    ctx.helpers.adjust(ctx, 'ISR', { mar: 25 });
    spawnAt(ctx, 'ISR', ['Beersheba', 'Kiryat Gat', 'Gaza', 'Joppa'], {
      inf: 5, cav: 4, name: 'Southern Command',
      general: { name: 'Yeshayahu Gavish', fire: 3, shock: 3, maneuver: 4 },
    });
    spawnAt(ctx, 'ISR', ['Tiberias', 'Safed', 'Afula'], {
      inf: 3, cav: 2, name: 'Northern Command',
      general: { name: 'David Elazar', fire: 3, shock: 3, maneuver: 3 },
    });
    ctx.helpers.chronicle(ctx, 'war', 'Moked: three air forces are destroyed on the ground by mid-morning, and the Six-Day War opens with the sky already decided.');
  } else {
    for (const t of enemies) {
      if (!findWar(g, 'ISR', t)) ctx.helpers.declareWar(ctx, t, 'ISR', 'The June War');
      ctx.helpers.addTagModifier(ctx, t, {
        id: 'first_blow', name: 'The First Blow', months: 6,
        effects: { moraleMult: 1.08 },
      });
    }
    ctx.helpers.adjust(ctx, 'ISR', { stability: -1, warExhaustion: 1 });
    ctx.helpers.chronicle(ctx, 'war', 'The waiting is decided from the other side: the coalition strikes first, and the June War opens on borders Israel chose not to cross.');
  }
}

// October 1973, both doors. Called by both options of ev_i_yom_kippur.
function octoberOutbreak(ctx, preempt) {
  const g = ctx.game;
  const e = egyTag(ctx), s = syrTag(ctx);
  if (!alive(ctx, 'ISR') || !e || !hostileToward(ctx, e, 'ISR', -60) || findWar(g, 'ISR', e)) {
    ctx.helpers.chronicle(ctx, 'era', 'The Day of Atonement of 1973 passes without sirens; the October war belongs to a history this world declined.');
    return;
  }
  g.flags.yomKippurWar = true;
  ctx.helpers.declareWar(ctx, e, 'ISR', 'The Yom Kippur War');
  spawnAt(ctx, e, ['Pelusium', 'Arsinoe', 'Memphis'], {
    inf: 6, cav: 3, name: 'Second and Third Armies',
    general: { name: 'Saad el-Shazly', fire: 3, shock: 2, maneuver: 3 },
  });
  if (s && s !== e && hostileToward(ctx, s, 'ISR', -60) && !findWar(g, 'ISR', s)) {
    ctx.helpers.declareWar(ctx, s, 'ISR', 'The Yom Kippur War');
    spawnAt(ctx, s, ['Damascus', 'Batanea', 'Caesarea Philippi'], {
      inf: 5, cav: 4, name: 'Syrian Armoured Divisions',
      general: { name: 'Yusuf Shakkur', fire: 2, shock: 3, maneuver: 2 },
    });
  }
  if (preempt) {
    ctx.helpers.adjust(ctx, 'ISR', { mar: 10, legitimacy: -15, infl: -20 });
    warEventScore(ctx, e, 'ISR', 'ISR', 5);
    ctx.helpers.chronicle(ctx, 'war', 'Israel preempts on the fast itself: the crossing is blunted, and the chancelleries that would have armed the defender go cold.');
  } else {
    ctx.helpers.addTagModifier(ctx, e, {
      id: 'the_crossing', name: 'The Crossing', months: 6,
      effects: { moraleMult: 1.1, disciplineMult: 1.05 },
    });
    if (s && s !== e) {
      ctx.helpers.addTagModifier(ctx, s, {
        id: 'golan_flood', name: 'The Golan Flood', months: 3,
        effects: { moraleMult: 1.08 },
      });
    }
    ctx.helpers.adjust(ctx, 'ISR', { legitimacy: 10, stability: -1 });
    ctx.helpers.addTagModifier(ctx, 'ISR', {
      id: 'nickel_grass', name: 'The Airlift', months: 12,
      effects: { reinforceMult: 1.15 },
    });
    ctx.helpers.chronicle(ctx, 'war', 'The sirens go up on the fast: the Canal is crossed and the Golan floods, and the world sees exactly who fired first.');
  }
  if (g.flags.mobilizedEarly) {
    spawnAt(ctx, 'ISR', ['Tiberias', 'Safed', 'Joppa'], { inf: 3, cav: 2, name: 'The Reserves, Already Rolling' });
    warEventScore(ctx, e, 'ISR', 'ISR', 3);
  }
}

// ── Divergent 1948: the victory strands ─────────────────────────────────────
// When the independence war ends somewhere other than the armistice lines,
// the dated 1960s–70s arc mostly degrades to chronicle lines. These helpers
// read the actual map so alternate decades can fire instead. None of the
// gates below are true in the armistice-lines world: at Rhodes-on-the-lines
// Israel holds neither the hill country, nor the Gaza strip, nor two cells
// of Sinai or the Golan — and it holds far more than eight provinces,
// Tel Aviv and west Jerusalem among them.
const HILL_COUNTRY = ['Neapolis', 'Hebron', 'Jenin', 'Ramallah', 'Bethlehem', 'Jericho', 'Tulkarm', 'Qalqilya'];
const SINAI_CELLS = ['Rhinocolura', 'Pelusium', 'Sinai Interior', 'Kadesh Barnea', 'Dizahab'];
const GOLAN_CELLS = ['Caesarea Philippi', 'Batanea', 'Gamala'];
const GAZA_STRIP = ['Gaza', 'Khan Yunis', 'Rafah'];
function ownerOf(ctx, provName) {
  try {
    const p = typeof ctx.prov === 'function' ? ctx.prov(provName) : null;
    return (p && p.owner) || null;
  } catch (e) { warnOnce('ownerOf', e); return null; }
}
function provCount(ctx, tag) {
  let n = 0;
  for (const p of ctx.game.provinces || []) {
    if (p && !p.impassable && p.owner === tag) n++;
  }
  return n;
}
function controlsCount(ctx, tag, names) {
  let n = 0;
  for (const nm of names) if (ctx.helpers.controls(ctx, tag, nm)) n++;
  return n;
}
// A standing truce (the sim's post-war cooldown) blocks declareWar; the
// war-starting strand events wait it out rather than firing a war that
// silently fails to exist.
function truceHolds(ctx, a, b) {
  try {
    const g = ctx.game;
    const t = g.truces && g.truces[a < b ? a + '|' + b : b + '|' + a];
    if (!t) return false;
    return g.date.y < t.y || (g.date.y === t.y && g.date.m < t.m);
  } catch (e) { warnOnce('truceHolds', e); return false; }
}
// Every 1948 front has gone quiet — armistice, separate peace, or a victor.
function fortyEightSettled(ctx) {
  for (const t of ['EGY', 'JOR', 'SYR', 'LEB', 'IRQ']) {
    if (alive(ctx, t) && findWar(ctx.game, 'ISR', t)) return false;
  }
  return true;
}
// Strand A: Israel ended 1948 holding far more than the armistice lines —
// the hill country, the whole Gaza strip, real Sinai, or the Golan.
function greaterVictory48(ctx) {
  if (!alive(ctx, 'ISR') || !fortyEightSettled(ctx)) return false;
  return controlsCount(ctx, 'ISR', HILL_COUNTRY) >= 3
    || controlsCount(ctx, 'ISR', SINAI_CELLS) >= 2
    || controlsCount(ctx, 'ISR', GOLAN_CELLS) >= 2
    || controlsCount(ctx, 'ISR', GAZA_STRIP) >= 3;
}
// Strand B: Israel survived 1948, diminished — under eight provinces, or
// shorn of Tel Aviv or west Jerusalem.
function reducedState48(ctx) {
  if (!alive(ctx, 'ISR')) return false;
  return provCount(ctx, 'ISR') < 8
    || !ctx.helpers.controls(ctx, 'ISR', 'Joppa')
    || !ctx.helpers.controls(ctx, 'ISR', 'Jerusalem');
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
      {
        label: 'Guns before ceremony',
        tooltip: 'Israel: +5 legitimacy, +1,000 manpower — and +150 talents as the bond drive abroad outruns the flag-raisings.',
        effects: guard('ev_i_decl:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: 5, manpower: 1000, treasury: 150 });
          ctx.helpers.chronicle(ctx, 'era', 'The State of Israel is declared in Tel Aviv — the ceremony is short; the purchasing missions are already abroad.');
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
      {
        label: 'Sirens and shelters first',
        tooltip: 'Tel Aviv: −1 unrest for 12 months — civil defense steadies the city, but the air force argument waits.',
        effects: guard('ev_i_spitfires:1', (ctx) => {
          ctx.helpers.addProvinceModifier(ctx, 'Joppa', {
            id: 'bus_station', name: 'Sirens and Shelters', months: 12, effects: { unrest: -1 },
          });
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
      {
        label: 'The Legion presses its triumph',
        tooltip: 'Transjordan: +5 war score but −5 legitimacy (the synagogues burn on camera). Israel: +10 martial points — rage arms the counterattack.',
        effects: guard('ev_i_oldcity:1', (ctx) => {
          addWarscore(ctx, 'JOR', 5);
          ctx.helpers.adjust(ctx, 'JOR', { legitimacy: -5 });
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: -5, mar: 10 });
          ctx.helpers.chronicle(ctx, 'war', 'The Jewish Quarter falls and the Legion presses its triumph; the fires are seen from every hill.');
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
      {
        label: 'Counterattack the stalled column',
        tooltip: 'Israel: +5 war score, −1,000 manpower — the infantry goes in behind the planes. Egypt: −5% morale for 6 months.',
        effects: guard('ev_i_adhalom:1', (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'EGY', {
            id: 'checked_bridge', name: 'Checked at the Bridge', months: 6, effects: { moraleMult: 0.95 },
          });
          ctx.helpers.adjust(ctx, 'ISR', { manpower: -1000 });
          addWarscore(ctx, 'ISR', 5);
          ctx.helpers.chronicle(ctx, 'war', 'The column checked at Ad Halom is counterattacked in the dunes; the price is paid in infantry.');
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
      {
        label: 'Fight through the count\'s truce',
        tooltip: 'No stand-down — the fronts stay hot. Israel: the Czech arms land rushed (+5% discipline permanently), −10 legitimacy and −1 stability for defying the UN.',
        effects: guard('ev_i_truce1:1', (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'czech_arms', name: 'The Czech Arms, Rushed to the Line', months: -1, effects: { disciplineMult: 1.05 },
          });
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: -10, stability: -1 });
          ctx.helpers.chronicle(ctx, 'peace', 'The First Truce is ordered — and ignored: the guns never quite stop.');
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
      {
        label: 'Pave it properly',
        tooltip: 'Israel: −60 talents to the engineers; Jerusalem −2 unrest for 24 months — a road, not a track. No convoy escort to spare.',
        effects: guard('ev_i_burma:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { treasury: -60 });
          ctx.helpers.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'burma_road_ev', name: 'The Burma Road, Paved', months: 24, effects: { unrest: -2 },
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
      {
        label: 'Push past the plan',
        tooltip: 'Israel: +8 war score, but −1,500 manpower and +1 war exhaustion — the brigades run to the end of their maps and keep going.',
        effects: guard('ev_i_tendays:1', (ctx) => {
          addWarscore(ctx, 'ISR', 8);
          ctx.helpers.adjust(ctx, 'ISR', { manpower: -1500, warExhaustion: 1 });
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
      {
        label: 'Screen for the professionals',
        tooltip: 'Israel: +1,000 manpower now and +5% discipline for 12 months ("The Veterans of Five Armies") — cadres over columns; the same ships land the same families.',
        effects: guard('ev_i_mahal:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { manpower: 1000 });
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'gates_open', name: 'The Veterans of Five Armies', months: 12, effects: { disciplineMult: 1.05 },
          });
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
      {
        label: 'Refuse the indefinite truce',
        tooltip: 'No stand-down. Israel: −10 legitimacy, −1 stability under the sanction threat, but +15 martial points — the fronts stay hot and the staffs stay sharp.',
        effects: guard('ev_i_truce2:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: -10, stability: -1, mar: 15 });
          ctx.helpers.chronicle(ctx, 'war', 'The indefinite truce is ordered on pain of sanctions — and the guns answer for themselves.');
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
      {
        label: 'Spoil the pocket before it forms',
        tooltip: 'Israel: −500 manpower in spoiling raids; Syria fields only 1 Liberation Army regiment — Kaukji digs in with half his men.',
        effects: guard('ev_i_kaukji:1', (ctx) => {
          ctx.helpers.spawnArmy(ctx, 'SYR', 'Gischala', {
            inf: 1, name: 'Jaysh al-Inqadh',
            general: { name: 'Fawzi al-Kaukji', fire: 1, shock: 2, maneuver: 2 },
          });
          ctx.helpers.adjust(ctx, 'ISR', { manpower: -500 });
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
      {
        label: 'Cairo funds its client properly',
        tooltip: 'Egypt: −80 talents but +10 legitimacy — the government of nothing at least has offices. Transjordan: −5 legitimacy; Cairo and Amman −30 opinion of each other.',
        effects: guard('ev_i_allpal:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'EGY', { treasury: -80, legitimacy: 10 });
          ctx.helpers.adjust(ctx, 'JOR', { legitimacy: -5 });
          const g = ctx.game;
          setOpinionDelta(g, 'EGY', 'JOR', -30);
          setOpinionDelta(g, 'JOR', 'EGY', -30);
          ctx.helpers.chronicle(ctx, 'era', 'The All-Palestine Government is proclaimed in Gaza — and, unusually, paid for.');
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
      {
        label: 'Into Sinai, and damn London',
        tooltip: 'Israel: 3 regiments at Jamnia, +8 war score — but −10 legitimacy and +1 war exhaustion as Britain threatens its treaty. Egypt: the Faluja Pocket (−10% morale, 12 months).',
        effects: guard('ev_i_yoav:1', (ctx) => {
          ctx.helpers.spawnArmy(ctx, 'ISR', 'Jamnia', {
            inf: 2, cav: 1, name: 'Southern Front',
            general: { name: 'Yigal Allon', fire: 2, shock: 3, maneuver: 4 },
          });
          addWarscore(ctx, 'ISR', 8);
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: -10, warExhaustion: 1 });
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
      {
        label: 'One more week first',
        tooltip: 'Israel: +12 war score, but +1.5 war exhaustion and −5 legitimacy — the last week of a war is the most expensive. Armistice talks still open.',
        effects: guard('ev_i_hiram:1', (ctx) => {
          addWarscore(ctx, 'ISR', 12);
          ctx.helpers.adjust(ctx, 'ISR', { warExhaustion: 1.5, legitimacy: -5 });
          const w = findWar(ctx.game, 'EGY', 'ISR');
          if (w) w.noNegotiation = false;
          ctx.helpers.chronicle(ctx, 'war', 'Hiram and Horev run a week past their maps before the wires to Rhodes finally hum.');
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
      {
        label: 'Tighten the ring to the end',
        tooltip: 'Israel: +3 war score, no talks. Egypt: −5 legitimacy and −5% morale for 6 months — the pocket holds, but nothing else does.',
        effects: guard('ev_i_faluja:1', (ctx) => {
          addWarscore(ctx, 'ISR', 3);
          ctx.helpers.adjust(ctx, 'EGY', { legitimacy: -5 });
          ctx.helpers.addTagModifier(ctx, 'EGY', {
            id: 'faluja_honor', name: 'The Pocket, Starved', months: 6, effects: { moraleMult: 0.95 },
          });
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
      {
        label: 'A crown paid for in silver',
        tooltip: 'Transjordan: −100 talents in subventions to the notables; +10 legitimacy, +25 influence — and Cairo and Damascus only −10 opinion. Money smooths what proclamations inflame.',
        effects: guard('ev_i_jericho:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'JOR', { treasury: -100, legitimacy: 10, infl: 25 });
          const g = ctx.game;
          setOpinionDelta(g, 'EGY', 'JOR', -10);
          setOpinionDelta(g, 'SYR', 'JOR', -10);
          ctx.helpers.chronicle(ctx, 'era', 'The Jericho Conference crowns Abdullah quietly — the notables paid, the League merely irritated.');
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
      {
        label: 'A war cabinet first, elections after',
        tooltip: 'Israel: +25 government points and +10 martial points now, but −5 legitimacy — the democracies frown at the postponement.',
        effects: guard('ev_i_knesset:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { gov: 25, mar: 10, legitimacy: -5 });
          ctx.helpers.chronicle(ctx, 'era', 'The election waits on the war: a war cabinet governs by decree a season longer.');
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
      {
        label: 'Send the delegations home',
        tooltip: 'The war goes on: no armistice, no stand-down. Israel: −15 legitimacy under UN censure, and every belligerent +2 war exhaustion. The peace, when it comes, will be dictated at the table — not initialed at Rhodes.',
        effects: guard('ev_i_armistice:1', (ctx) => {
          for (const t of ['ISR', 'EGY', 'JOR', 'SYR', 'LEB', 'IRQ']) {
            if (!ctx.game.tags[t]) continue;
            ctx.helpers.adjust(ctx, t, { warExhaustion: 2 });
          }
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: -15 });
          ctx.helpers.chronicle(ctx, 'war', 'The Rhodes talks collapse: the delegations sail home and the lines stay lines of battle.');
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

  // ── STRAND A — THE GREATER VICTORY ────────────────────────────────────────
  // Fires only when the independence war ends with Israel holding far more
  // than the armistice lines (greaterVictory48). The anchor event sets
  // flags.greaterVictory48; the rest of the strand hangs off the flag.
  {
    id: 'ev_i_lines_ourselves',
    title: 'The Lines We Drew Ourselves',
    maxYear: 1953,
    desc: 'There is no Green Line. The war ended where the brigades stopped, and the '
      + 'brigades stopped well past every map the diplomats prepared: defensible '
      + 'ridges, depth before the sea, the hill country under the flag. Also under '
      + 'the flag: half a million Arabs who did not leave and are not leaving, '
      + 'awake this morning in a state that never expected to govern them. The '
      + 'question the ministries wanted twenty years to think about has arrived '
      + 'with the milk. Citizens, or subjects of an administration — there is no '
      + 'third register, and both answers cost.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev_i_lines_ourselves', (ctx) =>
      dateGE(ctx, 1949, 3) && greaterVictory48(ctx) && !reducedState48(ctx)),
    aiOption: 0,
    options: [
      {
        label: 'Citizenship — one law inside whatever the lines are',
        tooltip: 'Israel: +10 legitimacy, −1 stability (the Knesset fight of 1966, held in 1949); held hill-country and Gaza provinces −1 unrest for 60 months.',
        effects: guard('ev_i_lines_ourselves:0', (ctx) => {
          ctx.game.flags.greaterVictory48 = true;
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: 10, stability: -1 });
          for (const n of HILL_COUNTRY.concat(GAZA_STRIP)) {
            if (ctx.helpers.controls(ctx, 'ISR', n)) {
              ctx.helpers.addProvinceModifier(ctx, n, {
                id: 'lines_ourselves', name: 'Citizens of the Enlarged State', months: 60, effects: { unrest: -1 },
              });
            }
          }
          ctx.helpers.chronicle(ctx, 'era', 'No Green Line: the 1948 war ends on lines Israel drew itself, and the new state offers citizenship to everyone inside them.');
        }),
      },
      {
        label: 'A military administration — for now, says everyone',
        tooltip: 'Israel: +20 government points, −10 legitimacy; held hill-country and Gaza provinces +1 unrest permanently. Order first; the question is filed, not answered.',
        effects: guard('ev_i_lines_ourselves:1', (ctx) => {
          ctx.game.flags.greaterVictory48 = true;
          ctx.helpers.adjust(ctx, 'ISR', { gov: 20, legitimacy: -10 });
          for (const n of HILL_COUNTRY.concat(GAZA_STRIP)) {
            if (ctx.helpers.controls(ctx, 'ISR', n)) {
              ctx.helpers.addProvinceModifier(ctx, n, {
                id: 'lines_ourselves', name: 'The Administration', months: -1, effects: { unrest: 1 },
              });
            }
          }
          ctx.helpers.chronicle(ctx, 'era', 'No Green Line: Israel ends 1948 holding the hills — and governs them through military governors, provisionally, indefinitely.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_tripartite_teeth',
    title: 'The Embargo with Teeth',
    maxYear: 1958,
    desc: 'London, Paris and Washington issue their declaration on Middle East arms — '
      + 'and this time it is aimed at one address. A state that redrew the map by '
      + 'force will not be helped to keep it: export licenses die in committee, '
      + 'spare parts sit on docks, and the attachés who used to return calls stop '
      + 'returning them. The powers do not demand withdrawal aloud. They simply '
      + 'price it.',
    forTag: 'ISR',
    trigger: safeTrigger('ev_i_tripartite_teeth', (ctx) =>
      dateGE(ctx, 1950, 5) && !!ctx.game.flags.greaterVictory48 && alive(ctx, 'ISR')),
    aiOption: 0,
    options: [
      {
        label: 'Build it ourselves, then',
        tooltip: 'Israel: −100 talents into workshops and license-breaking, −10% reinforcement for 36 months while the embargo bites — but +20 martial points as the arms industry is born early.',
        effects: guard('ev_i_tripartite_teeth:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { treasury: -100, mar: 20 });
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'tripartite_teeth', name: 'The Embargo with Teeth', months: 36, effects: { reinforceMult: 0.9 },
          });
          ctx.helpers.chronicle(ctx, 'era', 'The tripartite embargo closes the arsenals to the state that moved the borders; the workshops of Tel Aviv start making what the docks will not deliver.');
        }),
      },
      {
        label: 'Concede a conference to keep a pipeline',
        tooltip: 'Israel: +15 influence points, +5 legitimacy; the embargo eases (−5% reinforcement, 24 months) — and the borders are now officially "on the agenda", which is a place borders go to be argued with.',
        effects: guard('ev_i_tripartite_teeth:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { infl: 15, legitimacy: 5 });
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'tripartite_teeth', name: 'The Embargo, Eased', months: 24, effects: { reinforceMult: 0.95 },
          });
          if (alive(ctx, 'UK')) setOpinionDelta(ctx.game, 'UK', 'ISR', 15);
          ctx.helpers.chronicle(ctx, 'diplomacy', 'Israel trades a seat at a borders conference for a thinner embargo; the map is kept, and permanently discussed.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_partition_ritual',
    title: 'The September Ritual',
    maxYear: 1962,
    desc: 'Every autumn the General Assembly performs the same liturgy: a resolution '
      + 'recalling the partition frontiers of 1947, a majority for it, a lecture '
      + 'about the inadmissibility of conquest, and no second paragraph about '
      + 'enforcement, because there are no volunteers. Every autumn the delegation '
      + 'votes no and flies home. The resolutions bind nothing but the record — '
      + 'and the record, year by year, is becoming the world\'s map of what Israel '
      + 'is holding.',
    forTag: 'ISR',
    trigger: safeTrigger('ev_i_partition_ritual', (ctx) =>
      dateGE(ctx, 1951, 9) && !!ctx.game.flags.greaterVictory48 && alive(ctx, 'ISR')),
    aiOption: 0,
    options: [
      {
        label: 'Vote no, table the map we hold',
        tooltip: 'Israel: +5 legitimacy at home, −10 influence points abroad; London and Rome −10 opinion — the record accumulates against the lines, and the lines stay.',
        effects: guard('ev_i_partition_ritual:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: 5, infl: -10 });
          for (const t of ['UK', 'ITA']) {
            if (alive(ctx, t)) setOpinionDelta(ctx.game, t, 'ISR', -10);
          }
          ctx.helpers.chronicle(ctx, 'diplomacy', 'The annual partition-borders resolution passes and is rejected; the September ritual settles into the calendar.');
        }),
      },
      {
        label: 'Offer compensation instead of territory',
        tooltip: 'Israel: −150 talents into a compensation fund, +15 influence points — the ritual softens; the money is real and the borders are not touched.',
        effects: guard('ev_i_partition_ritual:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { treasury: -150, infl: 15 });
          for (const t of ['UK', 'ITA']) {
            if (alive(ctx, t)) setOpinionDelta(ctx.game, t, 'ISR', 10);
          }
          ctx.helpers.chronicle(ctx, 'diplomacy', 'Israel answers the partition ritual with a funded compensation offer: cash on the table, and not one dunam.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_wall_1949',
    title: 'The Wall, Reachable',
    maxYear: 1958,
    desc: 'For the first time since the Quarter burned, a Jew can walk to the Western '
      + 'Wall without a visa from a hostile kingdom — because there is no hostile '
      + 'kingdom between the New City and the Old. The pilgrims come by the '
      + 'shipload, and so do the notes verbales: the Vatican wants the holy places '
      + 'internationalized, the UN wants its corpus separatum, and every consulate '
      + 'in the city still refuses, on principle, to say which country it is '
      + 'standing in.',
    forTag: 'ISR',
    major: true,
    trigger: safeTrigger('ev_i_wall_1949', (ctx) =>
      dateGE(ctx, 1949, 6) && !!ctx.game.flags.greaterVictory48
      && ctx.helpers.controls(ctx, 'ISR', 'Jerusalem')
      && controlsCount(ctx, 'ISR', ['Bethlehem', 'Ramallah', 'Jericho']) >= 1),
    aiOption: 0,
    options: [
      {
        label: 'Open city — every faith, every gate',
        tooltip: 'Jerusalem: +15% production permanently (the pilgrimage economy) and −1 unrest for 36 months. Israel: +10 legitimacy, −10 influence points — the internationalization file stays open, argued in committee forever.',
        effects: guard('ev_i_wall_1949:0', (ctx) => {
          ctx.helpers.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'pilgrim_roads', name: 'The Pilgrim Roads', months: -1, effects: { prodMult: 1.15 },
          });
          ctx.helpers.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'open_city', name: 'The Open City', months: 36, effects: { unrest: -1 },
          });
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: 10, infl: -10 });
          ctx.helpers.chronicle(ctx, 'era', 'Jerusalem whole from 1949: the Wall reachable, the churches open, and the corpus separatum reduced to a filing cabinet.');
        }),
      },
      {
        label: 'Sovereign city, guarded gates',
        tooltip: 'Israel: +10 government points; Jerusalem +5% production permanently but +1 unrest for 24 months, and −10 legitimacy — access by permit persuades no chancellery of anything.',
        effects: guard('ev_i_wall_1949:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { gov: 10, legitimacy: -10 });
          ctx.helpers.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'pilgrim_roads', name: 'The Pilgrim Roads, Metered', months: -1, effects: { prodMult: 1.05 },
          });
          ctx.helpers.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'open_city', name: 'The Guarded Gates', months: 24, effects: { unrest: 1 },
          });
          ctx.helpers.chronicle(ctx, 'era', 'The Old City is sovereign and rationed: pilgrims by permit, holy places by schedule, and the internationalization lobby handed its best argument.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_return_full_scale',
    title: 'The Ledger of Return',
    maxYear: 1955,
    desc: 'The camps across the frontiers hold the people who left the land Israel '
      + 'now holds all of, and there is no second sovereignty to address them to: '
      + 'whoever comes back, comes back into Israel. The cabinet has the file '
      + 'nobody wanted at full scale a decade early — every number in it is a '
      + 'family, every family is a claim, and both choices are defensible and '
      + 'neither is clean. The ministers age visibly across the table.',
    forTag: 'ISR',
    major: true,
    trigger: safeTrigger('ev_i_return_full_scale', (ctx) =>
      dateGE(ctx, 1949, 9) && !!ctx.game.flags.greaterVictory48 && alive(ctx, 'ISR')),
    aiOption: 1,
    options: [
      {
        label: 'A metered return — quotas, ledgers, oaths',
        tooltip: 'Israel: −200 talents, −1 stability, +15 legitimacy; returned families resettle Lydda and Ramallah (+40,000 each where held), and held hill-country provinces −1 unrest for 36 months.',
        effects: guard('ev_i_return_full_scale:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { treasury: -200, stability: -1, legitimacy: 15 });
          if (typeof ctx.helpers.addPopulation === 'function') {
            for (const n of ['Lydda', 'Ramallah']) {
              if (ctx.helpers.controls(ctx, 'ISR', n)) {
                ctx.helpers.addPopulation(ctx, n, { r: 'islam', c: 'arab_modern', n: 40000 });
              }
            }
          }
          for (const n of HILL_COUNTRY) {
            if (ctx.helpers.controls(ctx, 'ISR', n)) {
              ctx.helpers.addProvinceModifier(ctx, n, {
                id: 'ledger_of_return', name: 'The Metered Return', months: 36, effects: { unrest: -1 },
              });
            }
          }
          ctx.helpers.chronicle(ctx, 'era', 'The ledger of return opens: quotas, oaths and resettlement funds bring a portion of the camps home under Israeli law.');
        }),
      },
      {
        label: 'The files stay shut',
        tooltip: 'Israel: +1 stability, −15 legitimacy; held hill-country provinces +1 unrest for 48 months and London −15 opinion — the camps become permanent, and so does the question.',
        effects: guard('ev_i_return_full_scale:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { stability: 1, legitimacy: -15 });
          for (const n of HILL_COUNTRY) {
            if (ctx.helpers.controls(ctx, 'ISR', n)) {
              ctx.helpers.addProvinceModifier(ctx, n, {
                id: 'ledger_of_return', name: 'The Shut Files', months: 48, effects: { unrest: 1 },
              });
            }
          }
          if (alive(ctx, 'UK')) setOpinionDelta(ctx.game, 'UK', 'ISR', -15);
          ctx.helpers.chronicle(ctx, 'era', 'The return files stay shut: the camps across the frontier harden from canvas to concrete, and the claim compounds annually.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_rhodes_plus',
    title: 'Rhodes, With Chairs This Time',
    maxYear: 1958,
    desc: 'A defeated enemy treats sooner than a humiliated one, and Amman has run '
      + 'the numbers: the army broken, the bank lost, the subsidy from London '
      + 'buying less every year. The feelers arrive through the same night-visit '
      + 'channels as in \'48 — but this time the agenda is not an armistice, it is '
      + 'a settlement: recognition, borders, perhaps even a signature in daylight. '
      + 'The price of getting it is giving some of the map back. The price of '
      + 'refusing is keeping everything, and the war it comes with.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev_i_rhodes_plus', (ctx) =>
      dateGE(ctx, 1950, 7) && !!ctx.game.flags.greaterVictory48
      && alive(ctx, 'ISR') && atPeace(ctx, 'ISR') && alive(ctx, 'JOR')),
    aiOption: 0,
    options: [
      {
        label: 'Trade the valley towns for a signature in daylight',
        tooltip: 'Jenin and Jericho return to Jordan where Israel holds them; Amman and Jerusalem +60 opinion of each other and a 10-year peace (no opportunistic wars). Israel: +15 influence points; the Revisionists −15.',
        effects: guard('ev_i_rhodes_plus:0', (ctx) => {
          const g = ctx.game;
          for (const n of ['Jenin', 'Jericho']) {
            if (ctx.helpers.controls(ctx, 'ISR', n)) ctx.helpers.changeOwner(ctx, n, 'JOR');
          }
          setOpinionDelta(g, 'JOR', 'ISR', 60);
          setOpinionDelta(g, 'ISR', 'JOR', 60);
          for (const t of ['ISR', 'JOR']) {
            ctx.helpers.addTagModifier(ctx, t, {
              id: 'rhodes_plus', name: 'The Daylight Settlement', months: 120,
              effects: { noOpportunisticWars: true },
            });
          }
          ctx.helpers.adjust(ctx, 'ISR', { infl: 15 });
          ctx.helpers.factionShift(ctx, 'ISR', 'revisionists', -15);
          g.flags.earlyPeace48 = true;
          ctx.helpers.chronicle(ctx, 'peace', 'Rhodes-plus: a defeated Jordan signs a settlement in daylight — recognition and quiet, bought with the valley towns.');
        }),
      },
      {
        label: 'The map is closed',
        tooltip: 'Nothing returns: Israel +5 legitimacy at home, the Revisionists +10 — and Amman −20 opinion; the settlement that was possible goes back in the drawer.',
        effects: guard('ev_i_rhodes_plus:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: 5 });
          ctx.helpers.factionShift(ctx, 'ISR', 'revisionists', 10);
          setOpinionDelta(ctx.game, 'JOR', 'ISR', -20);
          ctx.helpers.chronicle(ctx, 'diplomacy', 'The feelers from Amman are answered politely and refused completely: the map is closed, and so is the drawer with the treaty in it.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_west_bank_war',
    title: 'The War for the Lost Bank',
    maxYear: 1966,
    desc: 'The kingdom across the river is smaller than its grief. Half of Amman is '
      + 'refugees from the bank the Legion lost, the mosque sermons name the hills '
      + 'one by one, and the young officers have decided the old men signed away '
      + 'what the army could take back. The border posts report battalions '
      + 'rehearsing river crossings in daylight — rehearsals are cheaper than wars, '
      + 'but they are also how wars rehearse.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev_i_west_bank_war', (ctx) =>
      dateGE(ctx, 1953, 1) && !!ctx.game.flags.greaterVictory48
      && !ctx.game.flags.earlyPeace48 && alive(ctx, 'ISR') && alive(ctx, 'JOR')
      && hostileToward(ctx, 'JOR', 'ISR', -80)
      && controlsCount(ctx, 'ISR', HILL_COUNTRY) >= 3
      && !findWar(ctx.game, 'ISR', 'JOR') && fortyEightSettled(ctx)
      && !truceHolds(ctx, 'ISR', 'JOR')),
    aiOption: 0,
    options: [
      {
        label: 'Let them break themselves on the hills',
        tooltip: 'Jordan declares war for the West Bank, crossing at +8% morale for 6 months ("The Return March") with fresh brigades — Israel stands on ground it chose and fortified.',
        effects: guard('ev_i_west_bank_war:0', (ctx) => {
          if (!ctx.helpers.declareWar(ctx, 'JOR', 'ISR', 'The War for the West Bank')) {
            ctx.helpers.chronicle(ctx, 'diplomacy', 'The river crossings are rehearsed and the order never comes; the war for the bank stays a sermon.');
            return;
          }
          ctx.helpers.addTagModifier(ctx, 'JOR', {
            id: 'return_march', name: 'The Return March', months: 6, effects: { moraleMult: 1.08 },
          });
          spawnAt(ctx, 'JOR', ['Philadelphia', 'Gerasa', 'Medaba'], {
            inf: 4, cav: 2, name: 'The Army of Return',
            general: { name: 'Ali Abu Nuwar', fire: 2, shock: 3, maneuver: 2 },
          });
          ctx.helpers.chronicle(ctx, 'war', 'The second Jordanian war opens: the Legion crosses for the bank it lost, into hills that have been waiting for it.');
        }),
      },
      {
        label: 'Spoil it at the crossings',
        tooltip: 'Israel strikes the marshalling yards first: +10 martial points, +5 war score at the outset — but −10 legitimacy as the wire services report who moved first.',
        effects: guard('ev_i_west_bank_war:1', (ctx) => {
          if (!ctx.helpers.declareWar(ctx, 'ISR', 'JOR', 'The War for the West Bank')) {
            ctx.helpers.chronicle(ctx, 'diplomacy', 'The spoiling attack is planned to the hour and shelved: the truce clock has not run out, and nobody wants to be the one who broke it.');
            return;
          }
          ctx.helpers.adjust(ctx, 'ISR', { mar: 10, legitimacy: -10 });
          warEventScore(ctx, 'ISR', 'JOR', 'ISR', 5);
          spawnAt(ctx, 'ISR', ['Jericho', 'Ramallah', 'Jerusalem'], {
            inf: 3, cav: 2, name: 'Jordan Valley Command',
          });
          ctx.helpers.chronicle(ctx, 'war', 'Israel spoils the return offensive at its marshalling yards; the war for the West Bank opens with the river crossings burning.');
        }),
      },
    ],
  },

  // ── STRAND B — THE STATE THAT FELL OR NEARLY FELL ─────────────────────────
  // Fires only when 1948 ends with Israel reduced (reducedState48) or dead.
  // The anchor sets flags.tenMileState; the dead-state events fire on
  // !alive(ISR) — the sim keeps the world turning after the player's
  // elimination ("continue observing"), so they narrate to the survivors.
  {
    id: 'ev_i_ten_mile_state',
    title: 'The Ten-Mile State',
    maxYear: 1955,
    desc: 'The war is over and the state is a corridor: what the armies could hold, '
      + 'not what the declaration named. The coastal road is in mortar range of '
      + 'somebody for most of its length, the capital works out of requisitioned '
      + 'hotels, and the ministries share typewriters. Foreign desks give the '
      + 'country five years, then correct themselves downward. Nobody unpacks. '
      + 'The question is not absorption or development — the question is whether '
      + 'the state is a fact or an episode.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev_i_ten_mile_state', (ctx) =>
      dateGE(ctx, 1949, 3) && reducedState48(ctx) && !greaterVictory48(ctx)
      && fortyEightSettled(ctx)),
    aiOption: 0,
    options: [
      {
        label: 'Dig in — the state is the line',
        tooltip: 'Israel: +2,000 manpower, +1 stability, −100 talents; siege economy: −10% income but +10% manpower for 36 months. The country arms itself into existence.',
        effects: guard('ev_i_ten_mile_state:0', (ctx) => {
          ctx.game.flags.tenMileState = true;
          ctx.helpers.adjust(ctx, 'ISR', { manpower: 2000, stability: 1, treasury: -100 });
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'siege_economy', name: 'The Siege Economy', months: 36,
            effects: { incomeMult: 0.9, manpowerMult: 1.1 },
          });
          ctx.helpers.chronicle(ctx, 'era', 'The ten-mile state digs in: rationing, rifles, and a budget that is mostly cement and ammunition.');
        }),
      },
      {
        label: 'Let the ships take the weary',
        tooltip: 'Emigration is not stopped: Israel −2,000 manpower, −10 legitimacy, −5% income for 24 months — but −1 unrest everywhere for 24 months; fewer mouths, quieter streets, smaller state.',
        effects: guard('ev_i_ten_mile_state:1', (ctx) => {
          ctx.game.flags.tenMileState = true;
          ctx.helpers.adjust(ctx, 'ISR', { manpower: -2000, legitimacy: -10 });
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'siege_economy', name: 'The Thinning', months: 24,
            effects: { incomeMult: 0.95, unrestAll: -1 },
          });
          ctx.helpers.chronicle(ctx, 'era', 'The ships leave fuller than they arrive: the reduced state lets its weary go, and grows quieter and smaller at once.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_siege_gates',
    title: 'Ships at a Narrow Door',
    maxYear: 1960,
    desc: 'The gates were the whole point, and the gates are still open — into a '
      + 'state with no room. The transit camps stand in mortar range of the '
      + 'frontier; the newcomers are issued a tent, a cot and a sector. Closing '
      + 'the door would betray the reason there is a door. Keeping it open packs '
      + 'more lives into a target. The Zionist arithmetic was never supposed to '
      + 'run in a corridor.',
    forTag: 'ISR',
    trigger: safeTrigger('ev_i_siege_gates', (ctx) =>
      dateGE(ctx, 1950, 1) && !!ctx.game.flags.tenMileState && alive(ctx, 'ISR')),
    aiOption: 0,
    options: [
      {
        label: 'Land them anyway',
        tooltip: 'Israel: +1,500 manpower and +50,000 people to the held coast — but Tel Aviv +1 unrest for 24 months (the tent camps) and −5% income for 24 months.',
        effects: guard('ev_i_siege_gates:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { manpower: 1500 });
          if (typeof ctx.helpers.addPopulation === 'function') {
            if (ctx.helpers.controls(ctx, 'ISR', 'Joppa')) ctx.helpers.addPopulation(ctx, 'Joppa', { r: 'judaism', c: 'israeli', n: 30000 });
            if (ctx.helpers.controls(ctx, 'ISR', 'Dora')) ctx.helpers.addPopulation(ctx, 'Dora', { r: 'judaism', c: 'israeli', n: 20000 });
          }
          if (ctx.helpers.controls(ctx, 'ISR', 'Joppa')) {
            ctx.helpers.addProvinceModifier(ctx, 'Joppa', {
              id: 'tent_camps', name: 'The Tent Camps', months: 24, effects: { unrest: 1 },
            });
          }
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'absorption_strain', name: 'Absorption Under Siege', months: 24, effects: { incomeMult: 0.95 },
          });
          ctx.helpers.chronicle(ctx, 'era', 'The gates stay open into the corridor: tents to the horizon, and every new arrival issued a sector along with the cot.');
        }),
      },
      {
        label: 'Hold the ships at Cyprus — for now',
        tooltip: 'Israel: +1 stability and no new strain — but −15 legitimacy: a Jewish state metering Jewish immigration is an argument against itself, and everyone makes it.',
        effects: guard('ev_i_siege_gates:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { stability: 1, legitimacy: -15 });
          ctx.helpers.chronicle(ctx, 'era', 'The ships wait at Cyprus while the corridor state catches its breath; the camps there fill with people the state exists to receive.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_second_round',
    title: 'The Second Round',
    maxYear: 1962,
    desc: 'The communiqués from the last war called it a first round, and the '
      + 'capitals meant it. Now the attachés count what is left of the reduced '
      + 'state — a corridor, a conscript army, an economy on coupons — and the '
      + 'general staffs move the same plans back to the top drawer with better '
      + 'artillery attached. The radios promise the sea. The sea is eight '
      + 'miles from the front line.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev_i_second_round', (ctx) => {
      const e = egyTag(ctx);
      return dateGE(ctx, 1951, 1) && !!ctx.game.flags.tenMileState
        && alive(ctx, 'ISR') && !!e && hostileToward(ctx, e, 'ISR', -60)
        && !findWar(ctx.game, 'ISR', e) && fortyEightSettled(ctx)
        && !truceHolds(ctx, 'ISR', e);
    }),
    aiOption: 0,
    options: [
      {
        label: 'Stand to — the state is the trench',
        tooltip: 'The coalition attacks at +8% morale for 6 months ("Blood in the Water"); every hostile neighbor joins. Israel: +1,500 manpower in the last call-up, −1 stability.',
        effects: guard('ev_i_second_round:0', (ctx) => {
          const g = ctx.game;
          const e = egyTag(ctx), s = syrTag(ctx);
          if (!e) return;
          if (!ctx.helpers.declareWar(ctx, e, 'ISR', 'The Second Round')) {
            ctx.helpers.chronicle(ctx, 'diplomacy', 'The second round is announced on the radios and postponed in the staff rooms; the truce clock is still running.');
            return;
          }
          g.flags.secondRound48 = true;
          const joiners = [e];
          if (alive(ctx, 'JOR') && hostileToward(ctx, 'JOR', 'ISR', -60) && !findWar(g, 'ISR', 'JOR')) {
            ctx.helpers.declareWar(ctx, 'JOR', 'ISR', 'The Second Round');
            joiners.push('JOR');
          }
          if (s && s !== e && hostileToward(ctx, s, 'ISR', -60) && !findWar(g, 'ISR', s)) {
            ctx.helpers.declareWar(ctx, s, 'ISR', 'The Second Round');
            joiners.push(s);
          }
          for (const t of joiners) {
            ctx.helpers.addTagModifier(ctx, t, {
              id: 'blood_in_water', name: 'Blood in the Water', months: 6, effects: { moraleMult: 1.08 },
            });
          }
          spawnAt(ctx, e, ['Gaza', 'Rafah', 'Pelusium', 'Memphis'], {
            inf: 5, cav: 2, name: 'The Army of the Second Round',
          });
          ctx.helpers.adjust(ctx, 'ISR', { manpower: 1500, stability: -1 });
          ctx.helpers.chronicle(ctx, 'war', 'The second round opens: the coalition comes back for the corridor state, and the last call-up empties the schools.');
        }),
      },
      {
        label: 'Preempt with everything left',
        tooltip: 'Israel declares first: +15 martial points and +5 war score — but −10 legitimacy; a reduced state that strikes first collects sympathy from no one.',
        effects: guard('ev_i_second_round:1', (ctx) => {
          const g = ctx.game;
          const e = egyTag(ctx);
          if (!e) return;
          if (!ctx.helpers.declareWar(ctx, 'ISR', e, 'The Second Round')) {
            ctx.helpers.chronicle(ctx, 'diplomacy', 'The preemption is argued, priced, and put back in the safe; the truce clock is still running.');
            return;
          }
          g.flags.secondRound48 = true;
          ctx.helpers.adjust(ctx, 'ISR', { mar: 15, legitimacy: -10 });
          warEventScore(ctx, 'ISR', e, 'ISR', 5);
          ctx.helpers.chronicle(ctx, 'war', 'The corridor state does not wait to be finished: the second round opens on Israeli initiative, and on Israeli credit.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_clawback',
    title: 'The Claw-Back',
    maxYear: 1964,
    desc: 'The front has held longer than the plans on either side assumed, and '
      + 'something has shifted in the arithmetic: the attackers are at the end of '
      + 'their supply lines and the defenders are at the beginning of theirs. The '
      + 'staff maps that spent two years shrinking have room in the margins again. '
      + 'A state that was an episode is behaving like a fact.',
    forTag: 'ISR',
    trigger: safeTrigger('ev_i_clawback', (ctx) => {
      const e = egyTag(ctx);
      return !!ctx.game.flags.secondRound48 && alive(ctx, 'ISR')
        && (ctx.helpers.controls(ctx, 'ISR', 'Joppa') || ctx.helpers.controls(ctx, 'ISR', 'Jerusalem'))
        && !!e && !!findWar(ctx.game, 'ISR', e);
    }),
    aiOption: 0,
    options: [
      {
        label: 'The counterstroke',
        tooltip: 'Israel: +8 war score on every live front, +10 martial points — for −1,500 manpower and +1 war exhaustion. The episode starts taking territory back.',
        effects: guard('ev_i_clawback:0', (ctx) => {
          const e = egyTag(ctx), s = syrTag(ctx);
          for (const t of [e, 'JOR', s]) {
            if (t && findWar(ctx.game, 'ISR', t)) warEventScore(ctx, 'ISR', t, 'ISR', 8);
          }
          ctx.helpers.adjust(ctx, 'ISR', { mar: 10, manpower: -1500, warExhaustion: 1 });
          ctx.helpers.chronicle(ctx, 'war', 'The claw-back: the corridor state counterattacks out of its corridor, and the maps start growing again.');
        }),
      },
      {
        label: 'Hold the line, count their shells',
        tooltip: 'Israel: +3 war score per live front and +5% discipline for 12 months ("The Thin Line") — for −500 manpower. Patience as strategy; the enemy pays for every mile it sits on.',
        effects: guard('ev_i_clawback:1', (ctx) => {
          const e = egyTag(ctx), s = syrTag(ctx);
          for (const t of [e, 'JOR', s]) {
            if (t && findWar(ctx.game, 'ISR', t)) warEventScore(ctx, 'ISR', t, 'ISR', 3);
          }
          ctx.helpers.adjust(ctx, 'ISR', { manpower: -500 });
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'thin_line', name: 'The Thin Line', months: 12, effects: { disciplineMult: 1.05 },
          });
          ctx.helpers.chronicle(ctx, 'war', 'The thin line holds and bills the besiegers monthly; attrition, for once, is running the other way.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_second_exodus',
    title: 'The Sea Road Out',
    desc: 'The state that was declared in a museum has ceased to exist, and what '
      + 'remains of its people is on the water: fishing boats to Cyprus, freighters '
      + 'to Marseilles, anything with an engine standing off the beaches after '
      + 'dark. The victors hold the cities and discover that the prize was the '
      + 'people who built them, and the people are leaving. At the UN the '
      + 'trusteeship drafts circulate; in the chancelleries the word "temporary" '
      + 'does its usual work. The second exodus is orderly, documented, and '
      + 'watched by everyone who said this could not happen.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev_i_second_exodus', (ctx) =>
      dateGE(ctx, 1948, 8) && !alive(ctx, 'ISR')),
    aiOption: 0,
    options: [
      {
        label: 'The boats go west',
        tooltip: 'The coast empties: Tel Aviv −15% production permanently for its holder; occupiers of Tel Aviv and Jerusalem +10 legitimacy but +1 unrest there for 60 months; London and Rome −30 opinion of the conquerors.',
        effects: guard('ev_i_second_exodus:0', (ctx) => {
          const g = ctx.game;
          g.flags.israelFallen = true;
          g.flags.israelFallenY = g.date.y;
          g.flags.israelFallenM = g.date.m;
          const holders = new Set();
          for (const n of ['Joppa', 'Jerusalem']) {
            const holder = ownerOf(ctx, n);
            if (!holder || holder === 'WASTE' || holder === 'REB' || !alive(ctx, holder)) continue;
            holders.add(holder);
            ctx.helpers.addProvinceModifier(ctx, n, {
              id: 'second_exodus', name: 'The Emptied City', months: 60, effects: { unrest: 1 },
            });
          }
          for (const holder of holders) {
            ctx.helpers.adjust(ctx, holder, { legitimacy: 10 });
            for (const t of ['UK', 'ITA']) {
              if (alive(ctx, t)) setOpinionDelta(g, t, holder, -30);
            }
          }
          const coast = ownerOf(ctx, 'Joppa');
          if (coast && coast !== 'WASTE') {
            ctx.helpers.addProvinceModifier(ctx, 'Joppa', {
              id: 'emptied_coast', name: 'The Emptied Coast', months: -1, effects: { prodMult: 0.85 },
            });
          }
          ctx.helpers.chronicle(ctx, 'era', 'The second exodus: the state is extinguished and its people take the sea road out; the victors inherit cities that empty as they enter them.');
        }),
      },
      {
        label: 'A trusteeship on paper',
        tooltip: 'The UN debates administering the territory it once partitioned: surviving Egypt and Jordan +15 influence points each, and Jerusalem +1 unrest for 36 months while the drafts circulate over the facts.',
        effects: guard('ev_i_second_exodus:1', (ctx) => {
          const g = ctx.game;
          g.flags.israelFallen = true;
          g.flags.israelFallenY = g.date.y;
          g.flags.israelFallenM = g.date.m;
          const e = egyTag(ctx);
          for (const t of [e, 'JOR']) {
            if (t && alive(ctx, t)) ctx.helpers.adjust(ctx, t, { infl: 15 });
          }
          ctx.helpers.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'trusteeship_debated', name: 'The Trusteeship Debated', months: 36, effects: { unrest: 1 },
          });
          ctx.helpers.chronicle(ctx, 'era', 'The state is extinguished and the UN debates a trusteeship for the land it partitioned; the drafts are elegant and the occupation is not.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_diaspora_verdict',
    title: 'The Verdict of the Diaspora',
    desc: 'A year on, the accounting. In New York and London and Buenos Aires the '
      + 'communities that wired money and sent sons render their verdict in the '
      + 'only currencies left — memory, archives, and the slow redirection of every '
      + 'institution that pointed at Jerusalem. The victors, meanwhile, have '
      + 'discovered the oldest rule of coalitions: nothing divides like a prize. '
      + 'Cairo and Amman each hold half a country and all of a grudge.',
    forTag: 'both',
    trigger: safeTrigger('ev_i_diaspora_verdict', (ctx) => {
      const g = ctx.game;
      return !!g.flags.israelFallen && !alive(ctx, 'ISR')
        && Number.isFinite(g.flags.israelFallenY)
        && dateGE(ctx, g.flags.israelFallenY + 1, g.flags.israelFallenM || 1);
    }),
    aiOption: 0,
    options: [
      {
        label: 'The spoils divide the victors',
        tooltip: 'Cairo and Amman −40 opinion of each other, Damascus and Amman −20; the partition of the prize begins its own cold war.',
        effects: guard('ev_i_diaspora_verdict:0', (ctx) => {
          const g = ctx.game;
          const e = egyTag(ctx), s = syrTag(ctx);
          if (e && alive(ctx, 'JOR')) {
            setOpinionDelta(g, e, 'JOR', -40);
            setOpinionDelta(g, 'JOR', e, -40);
          }
          if (s && s !== e && alive(ctx, 'JOR')) {
            setOpinionDelta(g, s, 'JOR', -20);
            setOpinionDelta(g, 'JOR', s, -20);
          }
          ctx.helpers.chronicle(ctx, 'diplomacy', 'The diaspora renders its verdict and the victors render theirs — on each other: the partition of the prize opens its own cold war.');
        }),
      },
      {
        label: 'A condominium of the League',
        tooltip: 'The victors administer jointly: surviving Egypt, Jordan and Syria +10 influence points each — and Jerusalem +1 unrest for 24 months under a committee with three chairmen.',
        effects: guard('ev_i_diaspora_verdict:1', (ctx) => {
          const e = egyTag(ctx), s = syrTag(ctx);
          for (const t of [e, 'JOR', s]) {
            if (t && alive(ctx, t)) ctx.helpers.adjust(ctx, t, { infl: 10 });
          }
          ctx.helpers.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'league_condominium', name: 'The Condominium', months: 24, effects: { unrest: 1 },
          });
          ctx.helpers.chronicle(ctx, 'diplomacy', 'The League proclaims a condominium over the conquered land: three flags, three garrisons, and one committee that cannot agree on the stationery.');
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
        // The kingdom's green crescent comes down with the king: the state is
        // the Republic of Egypt now, under the Arab Liberation tricolor.
        ctx.helpers.rebrandTag(ctx, 'EGY', { name: 'Republic of Egypt', flag: 'EGY_REP' });
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
        // The Hashemite colors come down in Baghdad: the Republic of Iraq
        // raises Qasim's tricolor with the red star of the revolution.
        ctx.helpers.rebrandTag(ctx, 'IRQ', { name: 'Republic of Iraq', flag: 'IRQ_REP' });
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

  // ── THE STATE IN ITS SECOND DECADE, 1960–66 ───────────────────────────────
  {
    id: 'ev_i_garibaldi',
    title: 'The Man at the Bus Stop',
    worldLabel: 'Mossad takes Eichmann on Garibaldi Street',
    desc: 'A clerk of the Buenos Aires suburbs walks home from the bus stop on '
      + 'Garibaldi Street and is in a safe house before his supper goes cold. Ricardo '
      + 'Klement\'s papers are false; the hands that filed a continent\'s worth of '
      + 'transports are real. A special El Al flight is fueling. The question is what '
      + 'a state built by the survivors owes the dead: a verdict, or merely an end.',
    forTag: 'both',
    date: { y: 1960, m: 5 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Bring him to Jerusalem',
        tooltip: 'Israel: +5 legitimacy, −10 influence points (Argentina and the Security Council are not amused). The trial will follow.',
        effects: guard('ev_i_garibaldi:0', (ctx) => {
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: 5, infl: -10 });
          ctx.game.flags.eichmannToJerusalem = true;
          ctx.helpers.chronicle(ctx, 'era', 'Adolf Eichmann is taken from a Buenos Aires bus stop and flown to Israel to stand trial.');
        }),
      },
      {
        label: 'A grave in the pampas',
        tooltip: 'Israel: +10 martial points (the service proves its reach), −5 legitimacy — justice done in the dark persuades no one, and there will be no trial.',
        effects: guard('ev_i_garibaldi:1', (ctx) => {
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { mar: 10, legitimacy: -5 });
          ctx.helpers.chronicle(ctx, 'era', 'The man from Garibaldi Street is never seen again; the rumor is left to do the work a courtroom might have done.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_glass_booth',
    title: 'The Glass Booth',
    desc: 'For four months a man in a glass booth answers questions in a Jerusalem '
      + 'theater, and a hundred survivors testify to what until now was spoken of, if '
      + 'at all, in kitchens. The country hears the whole of it aloud for the first '
      + 'time: the schoolteachers weep at the radio, the sabras discover what their '
      + 'parents did not say. The verdict is never in doubt; the hearing is the point. '
      + 'Afterward, the only civil execution in the state\'s history, and the ashes '
      + 'scattered outside territorial waters — so that nothing of him remains in any '
      + 'country\'s soil.',
    forTag: 'ISR',
    trigger: safeTrigger('ev_i_glass_booth', (ctx) =>
      dateGE(ctx, 1961, 4) && alive(ctx, 'ISR') && !!ctx.game.flags.eichmannToJerusalem),
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Let the survivors speak',
        tooltip: 'Israel: +10 legitimacy, +1 stability; Jerusalem −1 unrest for 12 months — the country becomes, for a season, one household.',
        effects: guard('ev_i_glass_booth:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: 10, stability: 1 });
          const seat = ctx.helpers.controls(ctx, 'ISR', 'Jerusalem') ? 'Jerusalem' : 'Joppa';
          ctx.helpers.addProvinceModifier(ctx, seat, {
            id: 'the_country_listens', name: 'The Country Listens', months: 12, effects: { unrest: -1 },
          });
          ctx.helpers.chronicle(ctx, 'era', 'The Eichmann trial: a hundred survivors testify, one man hangs, and the ashes are scattered beyond the territorial waters.');
        }),
      },
      {
        label: 'A soldier\'s tribunal, swift and closed',
        tooltip: 'Israel: +20 government points, −5 legitimacy — efficient, unimpeachable, and the testimony the country needed to hear stays in the transcript.',
        effects: guard('ev_i_glass_booth:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { gov: 20, legitimacy: -5 });
          ctx.helpers.chronicle(ctx, 'era', 'Eichmann is tried quickly and hanged quietly; the reckoning is legal, and only legal.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_eshkol',
    title: 'The Old Man Goes South',
    desc: 'Ben-Gurion resigns — again, and this time it holds — and goes back to his '
      + 'hut at Sde Boker to write and to quarrel by mail. Levi Eshkol inherits: a '
      + 'compromiser, a treasurer, a man who speaks four languages and haggles in all '
      + 'of them. The reparations economy is pouring foundations faster than the '
      + 'ideologues can argue about the money\'s smell, and in the south something '
      + 'unphotographed hums at Dimona.',
    forTag: 'ISR',
    date: { y: 1963, m: 6 },
    aiOption: 0,
    options: [
      {
        label: 'Eshkol — the manager, not the prophet',
        tooltip: 'Levi Eshkol becomes Prime Minister: +1 stability, and the reparations boom pays +5% income for 36 months.',
        effects: guard('ev_i_eshkol:0', (ctx) => {
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.setRuler(ctx, 'ISR', { name: 'Levi Eshkol', title: 'Prime Minister', gov: 4, infl: 3, mar: 2, age: 67 });
          ctx.helpers.adjust(ctx, 'ISR', { stability: 1 });
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'reparations_boom', name: 'The Reparations Economy', months: 36, effects: { incomeMult: 1.05 },
          });
          ctx.helpers.chronicle(ctx, 'ruler', 'Ben-Gurion retires to Sde Boker; Levi Eshkol becomes Prime Minister of Israel.');
        }),
      },
      {
        label: 'Beg the Old Man to stay',
        tooltip: '+5 legitimacy now, but −1 stability and the Coalition −10 approval — the founder\'s last years are spent on feuds, and the party splits under him.',
        effects: guard('ev_i_eshkol:1', (ctx) => {
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: 5, stability: -1 });
          ctx.helpers.factionShift(ctx, 'ISR', 'coalition', -10);
          ctx.helpers.chronicle(ctx, 'ruler', 'Ben-Gurion is persuaded to stay on; the founder governs, and the founder feuds.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_water_carrier',
    title: 'The Kinneret Goes South',
    worldLabel: 'The National Water Carrier opens; the PLO is founded',
    desc: 'The National Water Carrier opens: the Kinneret piped a hundred miles to the '
      + 'Negev, the engineering project the state was half-built to justify. The Arab '
      + 'League summit answers in kind — plans to divert the Jordan\'s headwaters in '
      + 'Syria, and a new instrument founded in Jerusalem\'s Intercontinental Hotel: '
      + 'the Palestine Liberation Organization, chaired for now by a lawyer the '
      + 'governments trust precisely because he frightens no one.',
    forTag: 'both',
    date: { y: 1964, m: 6 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Open the taps at full capacity',
        tooltip: 'Israel: +8% income permanently, Beersheba and Dimona +15% production. The League answers: headwater diversion begins, and the PLO is founded.',
        effects: guard('ev_i_water_carrier:0', (ctx) => {
          const g = ctx.game;
          if (alive(ctx, 'ISR') && ctx.helpers.controls(ctx, 'ISR', 'Tiberias')) {
            ctx.helpers.addTagModifier(ctx, 'ISR', {
              id: 'water_carrier', name: 'The National Water Carrier', months: -1, effects: { incomeMult: 1.08 },
            });
            for (const n of ['Beersheba', 'Dimona']) {
              if (ctx.helpers.controls(ctx, 'ISR', n)) {
                ctx.helpers.addProvinceModifier(ctx, n, {
                  id: 'negev_water', name: 'The Desert Watered', months: -1, effects: { prodMult: 1.15 },
                });
              }
            }
            g.flags.headwaterDiversion = true;
            ctx.helpers.chronicle(ctx, 'era', 'The National Water Carrier opens: the Kinneret flows to the Negev, and the Arab League reaches for the headwaters.');
          } else {
            ctx.helpers.chronicle(ctx, 'era', 'The decade of the great water schemes arrives on a map where the Kinneret answers to someone else; the carrier stays a blueprint.');
          }
          g.flags.ploFounded = true;
          const seat = alive(ctx, 'JOR') && ctx.helpers.controls(ctx, 'JOR', 'Jerusalem') ? 'Jerusalem\'s Intercontinental Hotel' : 'Cairo';
          const e = egyTag(ctx);
          if (e && alive(ctx, 'ISR')) {
            setOpinionDelta(ctx.game, e, 'ISR', -10);
          }
          ctx.helpers.chronicle(ctx, 'diplomacy', 'The Palestine Liberation Organization is founded at ' + seat + ' — an instrument of the governments, for now.');
        }),
      },
      {
        label: 'Meter the Jordan, and say so at the UN',
        tooltip: 'Israel: +4% income permanently and +10 influence points — the Johnston quotas are honored aloud; the diversion answer loses its pretext (no headwater arc). The PLO is founded regardless.',
        effects: guard('ev_i_water_carrier:1', (ctx) => {
          const g = ctx.game;
          if (alive(ctx, 'ISR') && ctx.helpers.controls(ctx, 'ISR', 'Tiberias')) {
            ctx.helpers.addTagModifier(ctx, 'ISR', {
              id: 'water_carrier', name: 'The Carrier, Metered', months: -1, effects: { incomeMult: 1.04 },
            });
            ctx.helpers.adjust(ctx, 'ISR', { infl: 10 });
            const s = syrTag(ctx);
            if (s) setOpinionDelta(ctx.game, s, 'ISR', 10);
            if (alive(ctx, 'JOR')) setOpinionDelta(ctx.game, 'JOR', 'ISR', 10);
          }
          g.flags.ploFounded = true;
          ctx.helpers.chronicle(ctx, 'era', 'The carrier opens within the published quotas; the summit founds its organization anyway, but the bulldozers stay home.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_water_war',
    title: 'The War Over Water',
    maxYear: 1967,
    desc: 'On the Golan slopes the earthmovers are cutting a channel to send the '
      + 'Banias away from the Jordan, and the argument is conducted in the only '
      + 'grammar both sides trust: a tractor plows a disputed field, a gun answers, a '
      + 'longer gun answers that. The tank gunners of the northern command are '
      + 'becoming, shot by shot, the best in the world at hitting bulldozers.',
    forTag: 'both',
    trigger: safeTrigger('ev_i_water_war', (ctx) =>
      dateGE(ctx, 1965, 3) && !!ctx.game.flags.headwaterDiversion
      && alive(ctx, 'ISR') && !!syrTag(ctx)),
    aiOption: 0,
    options: [
      {
        label: 'Long-barrel answers',
        tooltip: 'Tank fire wrecks the works: Syria −100 talents and −3% income for 24 months; Israel +10 martial points; opinions −20 both ways. The slide to war steepens.',
        effects: guard('ev_i_water_war:0', (ctx) => {
          const s = syrTag(ctx);
          if (!s) return;
          ctx.helpers.adjust(ctx, s, { treasury: -100 });
          ctx.helpers.addTagModifier(ctx, s, {
            id: 'diversion_wrecked', name: 'The Diversion Wrecked', months: 24, effects: { incomeMult: 0.97 },
          });
          ctx.helpers.adjust(ctx, 'ISR', { mar: 10 });
          setOpinionDelta(ctx.game, s, 'ISR', -20);
          setOpinionDelta(ctx.game, 'ISR', s, -20);
          ctx.helpers.chronicle(ctx, 'war', 'The war over water: tank fire at extreme range ends the headwater diversion, one earthmover at a time.');
        }),
      },
      {
        label: 'Send the air force against the works',
        tooltip: 'The diversion ends at once: Syria −1 stability. Israel −5 legitimacy and opinions −40 both ways — escalation chooses its own schedule now.',
        effects: guard('ev_i_water_war:1', (ctx) => {
          const s = syrTag(ctx);
          if (!s) return;
          ctx.helpers.adjust(ctx, s, { stability: -1 });
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: -5 });
          setOpinionDelta(ctx.game, s, 'ISR', -40);
          setOpinionDelta(ctx.game, 'ISR', s, -40);
          ctx.helpers.chronicle(ctx, 'war', 'Aircraft finish the argument over the headwaters; the diversion dies, and the border learns what comes after artillery.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_end_mil_gov',
    title: 'Citizens, at Last',
    desc: 'Eighteen years after the war, the military government over Israel\'s Arab '
      + 'citizens is abolished: no more travel permits, no more governors, the '
      + 'emergency regulations folded away if not repealed. The same December, Stockholm: '
      + 'S.Y. Agnon shares the Nobel in literature, accepting in the accents of '
      + 'Buczacz and Jerusalem both. A state that can retire an occupation of its own '
      + 'citizens and export its dreams in Hebrew is becoming, at last, a country.',
    forTag: 'ISR',
    date: { y: 1966, m: 12 },
    aiOption: 0,
    options: [
      {
        label: 'Abolish it outright',
        tooltip: 'Israel: +10 legitimacy, +1 stability; the Galilee (Sepphoris, Afula) −1.5 unrest permanently.',
        effects: guard('ev_i_end_mil_gov:0', (ctx) => {
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: 10, stability: 1 });
          for (const n of ['Sepphoris', 'Afula']) {
            if (ctx.helpers.controls(ctx, 'ISR', n)) {
              ctx.helpers.addProvinceModifier(ctx, n, {
                id: 'mil_gov_lifted', name: 'The Military Government Lifted', months: -1, effects: { unrest: -1.5 },
              });
            }
          }
          ctx.helpers.chronicle(ctx, 'era', 'The military government over Israel\'s Arab citizens is abolished; the same season, Agnon shares the Nobel in literature.');
        }),
      },
      {
        label: 'District by district, permit by permit',
        tooltip: 'Israel: +15 government points, +5 legitimacy; the Galilee −0.5 unrest for 36 months — caution keeps the apparatus, and the apparatus keeps the grievance.',
        effects: guard('ev_i_end_mil_gov:1', (ctx) => {
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { gov: 15, legitimacy: 5 });
          for (const n of ['Sepphoris', 'Afula']) {
            if (ctx.helpers.controls(ctx, 'ISR', n)) {
              ctx.helpers.addProvinceModifier(ctx, n, {
                id: 'mil_gov_lifted', name: 'The Permits Thinned', months: 36, effects: { unrest: -0.5 },
              });
            }
          }
          ctx.helpers.chronicle(ctx, 'era', 'The military government is dismantled by installments; Agnon\'s Nobel is toasted in a country still carrying its permits.');
        }),
      },
    ],
  },

  // ── THE SLIDE TO WAR AND THE SIX DAYS, 1966–67 ────────────────────────────
  {
    id: 'ev_i_slide_to_war',
    title: 'Samu, and the Sky over the Golan',
    maxYear: 1968,
    desc: 'A mine on the Hebron road, and the reprisal goes in by daylight at Samu — a '
      + 'battalion with armor where a platoon by night was the custom, and the young '
      + 'King\'s own subjects burn his portrait for failing to protect a village his '
      + 'army never reached in time. In April the argument moves upstairs: a dogfight '
      + 'over the Golan ends with six MiGs down and the victors circling Damascus '
      + 'itself. Every capital reads the same forecast now, and none of them orders '
      + 'umbrellas.',
    forTag: 'both',
    trigger: safeTrigger('ev_i_slide_to_war', (ctx) =>
      dateGE(ctx, 1966, 11) && alive(ctx, 'ISR')
      && (alive(ctx, 'JOR') || !!syrTag(ctx))),
    aiOption: 0,
    options: [
      {
        label: 'Battalions in daylight',
        tooltip: 'Israel: +10 martial points, −5 legitimacy. Jordan −5 legitimacy; Amman and Damascus −25 opinion of Israel — deterrence is served, and so is the war it was meant to prevent.',
        effects: guard('ev_i_slide:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { mar: 10, legitimacy: -5 });
          if (alive(ctx, 'JOR')) {
            ctx.helpers.adjust(ctx, 'JOR', { legitimacy: -5 });
            setOpinionDelta(ctx.game, 'JOR', 'ISR', -25);
            const j = ctx.game.tags.JOR;
            if (j && j.ruler && j.ruler.name.indexOf('Hussein') < 0) {
              ctx.helpers.setRuler(ctx, 'JOR', { name: 'Hussein bin Talal', title: 'King', gov: 3, infl: 4, mar: 3, age: 31 });
            }
          }
          const s = syrTag(ctx);
          if (s) setOpinionDelta(ctx.game, s, 'ISR', -25);
          ctx.game.flags.slideToWar = true;
          ctx.helpers.chronicle(ctx, 'war', 'Samu by daylight, six MiGs down over the Golan: the reprisal policy and the air war walk the region toward June.');
        }),
      },
      {
        label: 'Reprisal by night, and notes to the powers',
        tooltip: 'Israel: +10 influence points, no legitimacy loss; opinions only −10 — restraint, which the radios of Cairo and Damascus will report as weakness.',
        effects: guard('ev_i_slide:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { infl: 10 });
          if (alive(ctx, 'JOR')) {
            setOpinionDelta(ctx.game, 'JOR', 'ISR', -10);
            const j = ctx.game.tags.JOR;
            if (j && j.ruler && j.ruler.name.indexOf('Hussein') < 0) {
              ctx.helpers.setRuler(ctx, 'JOR', { name: 'Hussein bin Talal', title: 'King', gov: 3, infl: 4, mar: 3, age: 31 });
            }
          }
          const s = syrTag(ctx);
          if (s) setOpinionDelta(ctx.game, s, 'ISR', -10);
          ctx.game.flags.slideToWar = true;
          ctx.helpers.chronicle(ctx, 'war', 'The reprisals stay small and the notes stay polite; the broadcasts call it fear, and the slide continues at its own pace.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_hamtana',
    title: 'HAMTANA — The Waiting',
    worldLabel: 'Nasser closes the Straits of Tiran; the region mobilizes',
    desc: 'It comes in three weeks: the divisions into Sinai on a false Soviet report, '
      + 'the UN force expelled with a single letter, and then the words themselves — '
      + 'the Straits of Tiran closed to Israeli shipping. Armies mobilize on every '
      + 'border. In Israel the economy simply stops: the reserves are the economy. '
      + 'Trenches are dug in the city parks, and the rabbinate quietly consecrates '
      + 'mass graves in Tel Aviv for the ten thousand the plans assume. The state is '
      + 'nineteen years old and waiting to learn if it gets to be twenty.',
    forTag: 'both',
    date: { y: 1967, m: 5 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Call everyone — and form the unity government',
        tooltip: 'Israel: +4,000 manpower, +15% reinforcement for 12 months, Dayan to Defense (+25 martial points) — but −1 stability and −8% income while the straits stay closed. The corner is now the historical one.',
        effects: guard('ev_i_hamtana:0', (ctx) => {
          const e = egyTag(ctx);
          if (!alive(ctx, 'ISR') || !e || !hostileToward(ctx, e, 'ISR', -50)) {
            ctx.helpers.chronicle(ctx, 'diplomacy', 'May 1967 passes without its crisis; the straits stay open in a world that diverged.');
            return;
          }
          spawnAt(ctx, e, ['Rhinocolura', 'Sinai Interior', 'Pelusium', 'Memphis'], {
            inf: 5, cav: 2, name: 'Sinai Field Divisions',
            general: { name: 'Abdel Mohsen Murtagi', fire: 2, shock: 2, maneuver: 1 },
          });
          ctx.helpers.adjust(ctx, 'ISR', { manpower: 4000, mar: 25, stability: -1 });
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'hamtana_mobilized', name: 'The Nation Under Arms', months: 12, effects: { reinforceMult: 1.15 },
          });
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'straits_closed', name: 'The Straits Closed', months: 12, effects: { incomeMult: 0.92 },
          });
          ctx.game.flags.hamtana = true;
          ctx.helpers.factionShift(ctx, 'ISR', 'revisionists', 10);
          ctx.helpers.chronicle(ctx, 'war', 'The Straits of Tiran are closed and the graves are consecrated in advance; Israel mobilizes everything and waits.');
        }),
      },
      {
        label: 'Partial call-up; let Washington try the straits',
        tooltip: 'Israel: +1,500 manpower, +20 influence points, +5 legitimacy — but −8% income for 12 months anyway, and the corner is not forced: the decision passes to others.',
        effects: guard('ev_i_hamtana:1', (ctx) => {
          const e = egyTag(ctx);
          if (!alive(ctx, 'ISR') || !e || !hostileToward(ctx, e, 'ISR', -50)) {
            ctx.helpers.chronicle(ctx, 'diplomacy', 'May 1967 passes without its crisis; the straits stay open in a world that diverged.');
            return;
          }
          spawnAt(ctx, e, ['Rhinocolura', 'Sinai Interior', 'Pelusium', 'Memphis'], {
            inf: 5, cav: 2, name: 'Sinai Field Divisions',
            general: { name: 'Abdel Mohsen Murtagi', fire: 2, shock: 2, maneuver: 1 },
          });
          ctx.helpers.adjust(ctx, 'ISR', { manpower: 1500, infl: 20, legitimacy: 5 });
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'straits_closed', name: 'The Straits Closed', months: 12, effects: { incomeMult: 0.92 },
          });
          ctx.game.flags.hamtanaWaited = true;
          ctx.helpers.chronicle(ctx, 'war', 'The straits close and Israel waits for the maritime powers to reopen them; the armada of notes assembles slowly.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_moked',
    title: 'The Six Days',
    worldLabel: 'War in the first week of June',
    desc: 'The cabinet has sat through the night twice. The air force asks for one '
      + 'word and three hours of morning fog. If it comes, the war will open with '
      + 'Moked — every runway from the Nile to the Euphrates cratered before the '
      + 'enemy\'s pilots finish breakfast — Sinai in four days, and a plea to the King '
      + 'of Jordan to stay out that no one in the room expects him to hear. If it '
      + 'does not come, the coalition on the borders will choose its own morning.',
    forTag: 'both',
    date: { y: 1967, m: 6 },
    world: true,
    major: true,
    aiOption: (ctx) => (ctx.game.flags && ctx.game.flags.hamtana ? 0 : 1),
    options: [
      {
        label: 'Moked — strike first',
        tooltip: 'War with every hostile neighbor: their armies fight at −15% morale for 12 months ("The Air Force Destroyed on the Ground"), Israel +25 martial points, +8 war score per front, and fresh commands in the north and south.',
        effects: guard('ev_i_moked:0', (ctx) => {
          sixDayOutbreak(ctx, true);
        }),
      },
      {
        label: 'Wait for the powers',
        tooltip: 'No first strike. If the coalition attacks anyway, it does so with +8% morale for 6 months ("The First Blow") and Israel takes −1 stability, +1 war exhaustion.',
        effects: guard('ev_i_moked:1', (ctx) => {
          sixDayOutbreak(ctx, false);
        }),
      },
    ],
  },
  {
    id: 'ev_i_har_habayit',
    title: 'Har HaBayit BeYadeinu',
    minYear: 1967,
    maxYear: 1972,
    desc: 'The plea to Hussein was ignored, and so the paratroopers go through the '
      + 'Lions\' Gate at dawn — men fighting alley by alley through a city their '
      + 'commanders know from postcards and their grandfathers from prayer. At 10:08 '
      + 'the radio net carries four words that stop the country cold: "The Temple '
      + 'Mount is in our hands." Rabbi Goren\'s shofar sounds at the Wall over the '
      + 'shooting; secular colonels weep without knowing why. Nineteen years after '
      + 'the Quarter emptied, the paratroopers hang a flag where the Legion took it '
      + 'down.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev_i_har_habayit', (ctx) =>
      !!ctx.game.flags.sixDayWar && !!ctx.game.flags.jorHeldJerusalem
      && alive(ctx, 'ISR') && ctx.helpers.controls(ctx, 'ISR', 'Jerusalem')),
    aiOption: 0,
    options: [
      {
        label: 'The Wall — and the keys of the Mount to the Waqf',
        tooltip: 'Israel: +15 legitimacy, +1 stability; Jerusalem −1 unrest for 24 months. Dayan hands the Mount back to its clerics: sovereignty with a long fuse removed.',
        effects: guard('ev_i_har_habayit:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: 15, stability: 1 });
          ctx.helpers.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'city_reunited', name: 'The City Reunited', months: 24, effects: { unrest: -1 },
          });
          ctx.helpers.chronicle(ctx, 'war', '"Har HaBayit beYadeinu": paratroopers take the Old City through the Lions\' Gate, and the shofar sounds at the Wall.');
        }),
      },
      {
        label: 'Annex, unify, build',
        tooltip: 'Israel: +10 legitimacy, the Revisionists +10 approval — but Jerusalem +1.5 unrest for 24 months and the neighbors −20 opinion: the city is claimed whole, at once, aloud.',
        effects: guard('ev_i_har_habayit:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: 10 });
          ctx.helpers.factionShift(ctx, 'ISR', 'revisionists', 10);
          ctx.helpers.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'city_reunited', name: 'The City Claimed Whole', months: 24, effects: { unrest: 1.5 },
          });
          const e = egyTag(ctx);
          if (e) setOpinionDelta(ctx.game, e, 'ISR', -20);
          if (alive(ctx, 'JOR')) setOpinionDelta(ctx.game, 'JOR', 'ISR', -20);
          ctx.helpers.chronicle(ctx, 'war', 'The Old City falls and is annexed in the same week; the shofar and the surveyors arrive together.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_lines_of_june',
    title: 'The Map Triples',
    desc: 'The cease-fires take hold where the columns stop: the Canal, the river, the '
      + 'crest of the Golan. The map has tripled in a week, and the euphoria is real '
      + 'and photographs well. Less photographed: a French embargo on the aircraft '
      + 'already paid for, and 1.1 million Palestinians who woke under military rule '
      + 'and will not stop being there when the parades end. The victory is total. '
      + 'What it is *for* — that argument now begins, and does not end.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev_i_lines_of_june', (ctx) => {
      if (!ctx.game.flags.sixDayWar || !dateGE(ctx, 1967, 9) || !alive(ctx, 'ISR')) return false;
      const e = egyTag(ctx), s = syrTag(ctx);
      return [e, 'JOR', s].some((t) => t && findWar(ctx.game, 'ISR', t));
    }),
    aiOption: 0,
    options: [
      {
        label: 'Cease-fire on the lines',
        tooltip: 'Every June-War front ends where the armies stand (Israel\'s side keeps its conquests). Israel: +15 legitimacy, −2 war exhaustion — plus the French embargo (−10% reinforcement, 24 months) and military rule (+1 unrest) in the occupied hill country and Gaza.',
        effects: guard('ev_i_lines_of_june:0', (ctx) => {
          const e = egyTag(ctx), s = syrTag(ctx);
          for (const t of [e, 'JOR', s]) {
            if (!t) continue;
            const w = findWar(ctx.game, 'ISR', t);
            if (!w) continue;
            const side = (w.attackers || []).indexOf('ISR') >= 0 ? 'att' : 'def';
            ctx.helpers.endWar(ctx, 'ISR', t, side);
            ctx.helpers.adjust(ctx, t, { warExhaustion: -1 });
          }
          ctx.helpers.removeModifier(ctx, 'ISR', 'straits_closed');
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: 15, warExhaustion: -2 });
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'french_embargo', name: 'The French Embargo', months: 24, effects: { reinforceMult: 0.9 },
          });
          for (const n of ['Neapolis', 'Hebron', 'Ramallah', 'Jenin', 'Jericho', 'Bethlehem', 'Tulkarm', 'Qalqilya', 'Gaza', 'Khan Yunis', 'Rafah']) {
            if (ctx.helpers.controls(ctx, 'ISR', n)) {
              ctx.helpers.addProvinceModifier(ctx, n, {
                id: 'military_rule', name: 'Military Government', months: -1, effects: { unrest: 1 },
              });
            }
          }
          ctx.game.flags.sixDayEnded = true;
          ctx.helpers.chronicle(ctx, 'peace', 'The cease-fire lines of June: the map triples, the embargo begins, and 1.1 million Palestinians wake under military rule.');
        }),
      },
      {
        label: 'Press to the capitals',
        tooltip: 'No cease-fire: the wars continue, +8 war score on every live front — but Israel −10 legitimacy, +2 war exhaustion, and the powers begin discussing the word "sanctions".',
        effects: guard('ev_i_lines_of_june:1', (ctx) => {
          const e = egyTag(ctx), s = syrTag(ctx);
          for (const t of [e, 'JOR', s]) {
            if (!t || !findWar(ctx.game, 'ISR', t)) continue;
            warEventScore(ctx, 'ISR', t, 'ISR', 8);
          }
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: -10, warExhaustion: 2 });
          ctx.game.flags.sixDayEnded = true;
          ctx.helpers.chronicle(ctx, 'war', 'The columns do not stop at the cease-fire lines; the June War runs past its week, and the world\'s patience with it.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_khartoum',
    title: 'Khartoum, and Resolution 242',
    desc: 'The Arab summit at Khartoum answers the defeat with three no\'s: no peace '
      + 'with Israel, no recognition of Israel, no negotiations with it. In November '
      + 'the Security Council adopts Resolution 242 — withdrawal from territories '
      + 'occupied, in exchange for secure and recognized boundaries: land for peace, '
      + 'the founding text of every negotiation for the next half century. Between '
      + 'the no\'s and the resolution, a first convoy of families drives back up to '
      + 'Kfar Etzion, where the fathers died in \'48 — and the settlement question '
      + 'opens like a door nobody can close.',
    forTag: 'ISR',
    trigger: safeTrigger('ev_i_khartoum', (ctx) =>
      dateGE(ctx, 1967, 9) && !!ctx.game.flags.sixDayEnded && alive(ctx, 'ISR')),
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Answer the no\'s with facts on the ground',
        tooltip: 'Kfar Etzion resettled, Hebron next: the Kibbutzim and the Revisionists +10 approval each — but Hebron and Bethlehem +1 unrest permanently and −5 legitimacy abroad. The settlement arc opens.',
        effects: guard('ev_i_khartoum:0', (ctx) => {
          const e = egyTag(ctx), s = syrTag(ctx);
          for (const t of [e, 'JOR', s]) if (t) setOpinionDelta(ctx.game, t, 'ISR', -20);
          ctx.helpers.factionShift(ctx, 'ISR', 'kibbutzim', 10);
          ctx.helpers.factionShift(ctx, 'ISR', 'revisionists', 10);
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: -5 });
          for (const n of ['Hebron', 'Bethlehem']) {
            if (ctx.helpers.controls(ctx, 'ISR', n)) {
              ctx.helpers.addProvinceModifier(ctx, n, {
                id: 'settlement_question', name: 'The Settlement Question', months: -1, effects: { unrest: 1 },
              });
            }
          }
          ctx.game.flags.settlementArc = true;
          ctx.helpers.chronicle(ctx, 'era', 'Khartoum\'s three no\'s; Resolution 242\'s land-for-peace; and the first families back at Kfar Etzion — all in one autumn.');
        }),
      },
      {
        label: 'Hold the territories as a bargaining card',
        tooltip: 'Israel: +20 influence points, +5 legitimacy — everything is negotiable, nothing is settled, and the door at Kfar Etzion stays shut for now.',
        effects: guard('ev_i_khartoum:1', (ctx) => {
          const e = egyTag(ctx), s = syrTag(ctx);
          for (const t of [e, 'JOR', s]) if (t) setOpinionDelta(ctx.game, t, 'ISR', -20);
          ctx.helpers.adjust(ctx, 'ISR', { infl: 20, legitimacy: 5 });
          ctx.game.flags.landForPeacePosture = true;
          ctx.helpers.chronicle(ctx, 'era', 'Khartoum says no three times; Jerusalem answers by holding everything and promising nothing — the territories become a single enormous card.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_attrition',
    title: 'The War of Attrition',
    desc: 'Eshkol dies at his desk in February and the party summons Golda Meir back '
      + 'from retirement to preside. What she inherits on the Canal is not peace and '
      + 'not war: artillery duels across the water, commando raids on radar stations, '
      + 'the Bar-Lev forts counting incoming by the thousand, and Soviet pilots — '
      + 'everyone knows, no one says — flying Egyptian skies. It is the longest war '
      + 'the state will fight, and the only one measured entirely in patience.',
    forTag: 'both',
    trigger: safeTrigger('ev_i_attrition', (ctx) => {
      const e = egyTag(ctx);
      return dateGE(ctx, 1969, 3) && alive(ctx, 'ISR') && !!e
        && !!ctx.game.flags.sixDayEnded && hostileToward(ctx, e, 'ISR', -50);
    }),
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Deep-penetration bombing',
        tooltip: 'Golda Meir takes office. Egypt: −1 stability and −5% morale for 12 months — but Soviet advisers arrive (+5% discipline, 24 months). Israel: −800 manpower, +1.5 war exhaustion.',
        effects: guard('ev_i_attrition:0', (ctx) => {
          const e = egyTag(ctx);
          ctx.helpers.setRuler(ctx, 'ISR', { name: 'Golda Meir', title: 'Prime Minister', gov: 4, infl: 4, mar: 2, age: 70 });
          if (e) {
            ctx.helpers.adjust(ctx, e, { stability: -1 });
            ctx.helpers.addTagModifier(ctx, e, {
              id: 'canal_pounded', name: 'The Canal Cities Emptied', months: 12, effects: { moraleMult: 0.95 },
            });
            ctx.helpers.addTagModifier(ctx, e, {
              id: 'soviet_advisers', name: 'Soviet Advisers', months: 24, effects: { disciplineMult: 1.05 },
            });
          }
          ctx.helpers.adjust(ctx, 'ISR', { manpower: -800, warExhaustion: 1.5 });
          ctx.helpers.chronicle(ctx, 'war', 'The War of Attrition: deep-penetration raids over Egypt, Soviet pilots in Egyptian skies, and the Rogers cease-fire of August 1970 to end it.');
        }),
      },
      {
        label: 'The Bar-Lev Line — absorb and endure',
        tooltip: 'Golda Meir takes office. Israel: −150 talents for the forts, +8% reinforcement for 36 months, −500 manpower, +1 war exhaustion — the sand absorbs what the treasury pays for.',
        effects: guard('ev_i_attrition:1', (ctx) => {
          ctx.helpers.setRuler(ctx, 'ISR', { name: 'Golda Meir', title: 'Prime Minister', gov: 4, infl: 4, mar: 2, age: 70 });
          ctx.helpers.adjust(ctx, 'ISR', { treasury: -150, manpower: -500, warExhaustion: 1 });
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'bar_lev', name: 'The Bar-Lev Line', months: 36, effects: { reinforceMult: 1.08 },
          });
          ctx.helpers.chronicle(ctx, 'war', 'The War of Attrition is fought from the Bar-Lev forts, shell for shell, until the Rogers cease-fire of August 1970.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_black_september',
    title: 'Black September',
    worldLabel: 'Nasser dies; civil war in Jordan',
    desc: 'A month after brokering the Jordan cease-fire, Nasser\'s heart stops, and '
      + 'four million people follow the coffin through Cairo. In Amman the succession '
      + 'crisis is someone else\'s: the fedayeen — famous since they stood at Karameh '
      + '— now run a state within the Hashemite state, and in September they hijack '
      + 'four airliners to a desert strip and dare the King to object. The Arab '
      + 'Legion\'s artillery answers the dare.',
    forTag: 'both',
    date: { y: 1970, m: 9 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The King\'s artillery speaks',
        tooltip: 'Sadat succeeds Nasser. Jordan: +15 martial points, the Palace +10 — but +1 unrest everywhere for 12 months, and the expelled fedayeen carry their war to Lebanon (Tyre and Sidon +1.5 unrest for 60 months).',
        effects: guard('ev_i_black_september:0', (ctx) => {
          const e = egyTag(ctx);
          if (e) {
            const t = ctx.game.tags[e];
            if (t && t.ruler && t.ruler.name.indexOf('Nasser') >= 0) {
              ctx.helpers.setRuler(ctx, e, { name: 'Anwar Sadat', title: 'President', gov: 3, infl: 4, mar: 3, age: 51 });
              ctx.helpers.chronicle(ctx, 'ruler', 'Gamal Abdel Nasser is dead at fifty-two; Anwar Sadat, the underestimated deputy, succeeds him.');
            }
          }
          if (alive(ctx, 'JOR')) {
            ctx.helpers.adjust(ctx, 'JOR', { mar: 15, stability: -1 });
            ctx.helpers.factionShift(ctx, 'JOR', 'palace', 10);
            ctx.helpers.addTagModifier(ctx, 'JOR', {
              id: 'black_september', name: 'Black September', months: 12, effects: { unrestAll: 1 },
            });
            if (alive(ctx, 'LEB')) {
              for (const n of ['Tyre', 'Sidon']) {
                if (ctx.helpers.controls(ctx, 'LEB', n)) {
                  ctx.helpers.addProvinceModifier(ctx, n, {
                    id: 'fedayeen_bases', name: 'The Fedayeen Encamped', months: 60, effects: { unrest: 1.5 },
                  });
                }
              }
            }
            ctx.helpers.chronicle(ctx, 'war', 'Black September: the Arab Legion breaks the fedayeen state-within-the-state; the survivors regroup in Lebanon.');
          }
        }),
      },
      {
        label: 'Accommodate the organizations',
        tooltip: 'Sadat succeeds Nasser. Jordan: −10 legitimacy, −1 stability, Amman +2 unrest for 24 months — the crown shares its house and hopes the lodgers tire first.',
        effects: guard('ev_i_black_september:1', (ctx) => {
          const e = egyTag(ctx);
          if (e) {
            const t = ctx.game.tags[e];
            if (t && t.ruler && t.ruler.name.indexOf('Nasser') >= 0) {
              ctx.helpers.setRuler(ctx, e, { name: 'Anwar Sadat', title: 'President', gov: 3, infl: 4, mar: 3, age: 51 });
              ctx.helpers.chronicle(ctx, 'ruler', 'Gamal Abdel Nasser is dead at fifty-two; Anwar Sadat, the underestimated deputy, succeeds him.');
            }
          }
          if (alive(ctx, 'JOR')) {
            ctx.helpers.adjust(ctx, 'JOR', { legitimacy: -10, stability: -1 });
            ctx.helpers.addProvinceModifier(ctx, 'Philadelphia', {
              id: 'black_september', name: 'A Kingdom Shared', months: 24, effects: { unrest: 2 },
            });
            ctx.helpers.chronicle(ctx, 'war', 'The King chooses accommodation over artillery; the fedayeen keep their checkpoints inside his capital.');
          }
        }),
      },
    ],
  },

  // ── MUNICH AND THE YOM KIPPUR WAR, 1972–74 ────────────────────────────────
  {
    id: 'ev_i_munich',
    title: 'Eleven Athletes',
    worldLabel: 'The Munich massacre',
    desc: 'It was to be the Games that erased 1936: a Jewish team competing in Germany '
      + 'under its own flag. Instead, Black September gunmen take the Israeli quarters '
      + 'at dawn, the world watches a man in a stocking mask on a balcony for a day, '
      + 'and the rescue at the airfield fails in ninety seconds of floodlit '
      + 'incompetence. Eleven athletes come home in coffins. The same summer, '
      + 'gunmen hired from another continent opened fire on the crowds at Lod '
      + 'airport. The question on the cabinet table is not whether to answer.',
    forTag: 'ISR',
    date: { y: 1972, m: 9 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Wrath of God',
        tooltip: 'Israel: +15 martial points — the committee\'s list will be worked through for years, in Rome, Paris, Nicosia, Beirut. −5 legitimacy when the work is noticed, and Europe cools (−10 opinion where it matters).',
        effects: guard('ev_i_munich:0', (ctx) => {
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { mar: 15, legitimacy: -5 });
          for (const t of ['UK', 'ITA']) {
            if (alive(ctx, t)) setOpinionDelta(ctx.game, t, 'ISR', -10);
          }
          ctx.game.flags.wrathOfGod = true;
          ctx.helpers.chronicle(ctx, 'era', 'Munich: eleven athletes murdered at the Games. The committee convenes; the Wrath of God will take years, and does.');
        }),
      },
      {
        label: 'Ask the world for justice',
        tooltip: 'Israel: +10 influence points, +5 legitimacy, −1 stability — the extraditions never come, the country seethes, and the files stay open.',
        effects: guard('ev_i_munich:1', (ctx) => {
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { infl: 10, legitimacy: 5, stability: -1 });
          ctx.helpers.chronicle(ctx, 'era', 'Munich: eleven athletes murdered at the Games. The warrants are filed in courts that will never serve them.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_concept',
    title: 'The Concept',
    desc: 'Military Intelligence has a doctrine and calls it the Concept: Egypt will '
      + 'not attack without air superiority, Syria will not attack without Egypt, '
      + 'therefore quiet. Against it: Sadat saying "this year" once a season, a warning '
      + 'flown in personally by the King of Jordan, and Egyptian divisions rehearsing '
      + 'their crossing in plain sight — which the Concept files under "maneuvers." '
      + 'Mobilizing the reserves costs a fortune and looks like panic. Not mobilizing '
      + 'costs nothing, unless it costs everything.',
    forTag: 'ISR',
    date: { y: 1973, m: 9 },
    aiOption: 0,
    options: [
      {
        label: 'Trust the Concept',
        tooltip: 'Israel: +100 talents (the reserves stay at the harvest and the lathes). If war comes on the fast, it comes with the reserves at home.',
        effects: guard('ev_i_concept:0', (ctx) => {
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { treasury: 100 });
          ctx.helpers.chronicle(ctx, 'era', 'The warnings are filed under maneuvers: the Concept holds that Egypt cannot attack, and the reserves stay home.');
        }),
      },
      {
        label: 'Call the reserves — and be wrong in public if need be',
        tooltip: 'Israel: −150 talents, −1 stability (a costly cry of wolf) — but +3,000 manpower, +10% reinforcement for 6 months, and the reserves are already rolling if the sirens come.',
        effects: guard('ev_i_concept:1', (ctx) => {
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { treasury: -150, manpower: 3000, stability: -1 });
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'mobilized_early', name: 'Mobilized on a Warning', months: 6, effects: { reinforceMult: 1.1 },
          });
          ctx.game.flags.mobilizedEarly = true;
          ctx.helpers.chronicle(ctx, 'era', 'The Prime Minister overrules the Concept and calls the reserves on a warning — expensive, embarrassing, and possibly everything.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_yom_kippur',
    title: 'Yom Kippur',
    worldLabel: 'War on the Day of Atonement',
    desc: 'Two o\'clock in the afternoon on the fast, the one day the country is '
      + 'stopped entirely — and the sirens go up over empty streets. The Canal is '
      + 'crossed in hours behind two thousand guns; on the Golan, mere dozens of '
      + 'tanks stand against a flood of them. There is still a last morning\'s room '
      + 'to strike first, and a superpower watching for exactly that. The state is '
      + 'twenty-five years old and has forgotten, briefly, that it can lose.',
    forTag: 'both',
    date: { y: 1973, m: 10 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Absorb the first blow',
        tooltip: 'Egypt crosses at +10% morale ("The Crossing"), Syria floods the Golan — Israel takes −1 stability but +10 legitimacy, and the American airlift follows (+15% reinforcement, 12 months). The world sees who fired first.',
        effects: guard('ev_i_yom_kippur:0', (ctx) => {
          octoberOutbreak(ctx, false);
        }),
      },
      {
        label: 'Preempt at noon',
        tooltip: 'The crossing is blunted (+5 war score, +10 martial points, no enemy surge) — but −15 legitimacy, −20 influence, and no airlift: the defender who struck first defends alone.',
        effects: guard('ev_i_yom_kippur:1', (ctx) => {
          octoberOutbreak(ctx, true);
        }),
      },
    ],
  },
  {
    id: 'ev_i_deversoir',
    title: 'The Valley of Tears, and the Farm',
    maxYear: 1975,
    desc: 'On the Golan, the 77th Battalion holds the valley until seven tanks remain '
      + 'and the Syrian columns, inexplicably, turn back — the crews will call it the '
      + 'Valley of Tears and argue forever about why. In the south the answer takes '
      + 'two weeks to assemble: a seam found between two Egyptian armies at '
      + 'Deversoir, Sharon\'s division over the Canal on rafts by night, the missile '
      + 'batteries rolled up from behind, and the Third Army encircled at kilometer '
      + '101 of the Cairo road when the powers order the music stopped.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev_i_deversoir', (ctx) => {
      if (!ctx.game.flags.yomKippurWar || !dateGE(ctx, 1973, 11) || !alive(ctx, 'ISR')) return false;
      const e = egyTag(ctx), s = syrTag(ctx);
      return (e && findWar(ctx.game, 'ISR', e)) || (s && findWar(ctx.game, 'ISR', s));
    }),
    aiOption: 0,
    options: [
      {
        label: 'Over the Canal — cut the Third Army\'s throat, gently',
        tooltip: 'Israel: +10 war score on each live front, but −2,000 manpower and +1.5 war exhaustion. Egypt: the Third Army encircled (−15% morale for 6 months).',
        effects: guard('ev_i_deversoir:0', (ctx) => {
          const e = egyTag(ctx), s = syrTag(ctx);
          if (e && findWar(ctx.game, 'ISR', e)) {
            warEventScore(ctx, 'ISR', e, 'ISR', 10);
            ctx.helpers.addTagModifier(ctx, e, {
              id: 'third_army_cut', name: 'The Third Army Encircled', months: 6, effects: { moraleMult: 0.85 },
            });
          }
          if (s && s !== e && findWar(ctx.game, 'ISR', s)) warEventScore(ctx, 'ISR', s, 'ISR', 10);
          ctx.helpers.adjust(ctx, 'ISR', { manpower: -2000, warExhaustion: 1.5 });
          ctx.helpers.chronicle(ctx, 'war', 'The Valley of Tears holds and Sharon crosses at Deversoir: the war that opened with the sirens closes at kilometer 101.');
        }),
      },
      {
        label: 'Consolidate on the ridgelines',
        tooltip: 'Israel: +4 war score per front, −800 manpower, +1 war exhaustion — the lines are restored and no more than restored; the counterstroke is left unwritten.',
        effects: guard('ev_i_deversoir:1', (ctx) => {
          const e = egyTag(ctx), s = syrTag(ctx);
          if (e && findWar(ctx.game, 'ISR', e)) warEventScore(ctx, 'ISR', e, 'ISR', 4);
          if (s && s !== e && findWar(ctx.game, 'ISR', s)) warEventScore(ctx, 'ISR', s, 'ISR', 4);
          ctx.helpers.adjust(ctx, 'ISR', { manpower: -800, warExhaustion: 1 });
          ctx.helpers.chronicle(ctx, 'war', 'The Golan holds by seven tanks and the south by counting; the fronts are restored to their scars and no further.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_agranat',
    title: 'The Earthquake',
    desc: 'Kissinger\'s aircraft shuttles the disengagement accords into being: '
      + 'separation of forces on both fronts, the armies stepped back from each '
      + 'other\'s throats. Then the country counts — 2,656 dead in nineteen days, in '
      + 'a nation of three million — and turns on its own government. The Agranat '
      + 'Commission blames the generals and somehow not the ministers, which the '
      + 'public reads correctly as an indictment of everyone. The protest movements '
      + 'are born on the pavement outside the Prime Minister\'s office, and they do '
      + 'not go home.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev_i_agranat', (ctx) =>
      dateGE(ctx, 1974, 2) && !!ctx.game.flags.yomKippurWar && alive(ctx, 'ISR')),
    aiOption: 0,
    options: [
      {
        label: 'The commission spares no one who matters',
        tooltip: 'The wars end by disengagement (occupations revert on both fronts, −2 war exhaustion each). Golda and Dayan fall: Yitzhak Rabin — the first sabra Prime Minister — takes office. Israel: −1 stability now, +10 legitimacy kept.',
        effects: guard('ev_i_agranat:0', (ctx) => {
          const e = egyTag(ctx), s = syrTag(ctx);
          for (const t of [e, s]) {
            if (!t || !findWar(ctx.game, 'ISR', t)) continue;
            ctx.helpers.endWar(ctx, 'ISR', t, null);
            ctx.helpers.adjust(ctx, t, { warExhaustion: -2 });
          }
          ctx.helpers.adjust(ctx, 'ISR', { warExhaustion: -2, stability: -1, legitimacy: 10 });
          ctx.helpers.setRuler(ctx, 'ISR', { name: 'Yitzhak Rabin', title: 'Prime Minister', gov: 3, infl: 3, mar: 5, age: 52 });
          ctx.helpers.factionShift(ctx, 'ISR', 'coalition', -10);
          ctx.helpers.chronicle(ctx, 'ruler', 'The Agranat earthquake: Golda and Dayan fall, and Yitzhak Rabin becomes the first native-born Prime Minister.');
        }),
      },
      {
        label: 'Close ranks around the government',
        tooltip: 'The wars end by disengagement (−2 war exhaustion each), Golda stays — Israel: +1 stability now, but −15 legitimacy as the pavement fills with reservists who will not be told to go home.',
        effects: guard('ev_i_agranat:1', (ctx) => {
          const e = egyTag(ctx), s = syrTag(ctx);
          for (const t of [e, s]) {
            if (!t || !findWar(ctx.game, 'ISR', t)) continue;
            ctx.helpers.endWar(ctx, 'ISR', t, null);
            ctx.helpers.adjust(ctx, t, { warExhaustion: -2 });
          }
          ctx.helpers.adjust(ctx, 'ISR', { warExhaustion: -2, stability: 1, legitimacy: -15 });
          ctx.helpers.chronicle(ctx, 'peace', 'The disengagement accords hold and the government does too — over the sound, every day louder, of the protest outside.');
        }),
      },
    ],
  },

  // ── THE LONG SEVENTIES, 1974–79 ───────────────────────────────────────────
  {
    id: 'ev_i_gun_olive',
    title: 'The Gun and the Olive Branch',
    worldLabel: 'Arafat at the UN; Gush Emunim at Sebastia',
    desc: 'A year of definitions. Ma\'alot: a school taken, twenty-two children dead '
      + 'when the rescue goes in. November: Arafat at the General Assembly rostrum '
      + 'with a holster on his hip — "I have come bearing an olive branch and a '
      + 'freedom fighter\'s gun; do not let the olive branch fall from my hand" — and '
      + 'a standing ovation. And in Samaria, a new movement called Gush Emunim camps '
      + 'at the old railway station of Sebastia, seven times removed and seven times '
      + 'returned, until the government must choose between its soldiers and its '
      + 'believers.',
    forTag: 'ISR',
    date: { y: 1974, m: 11 },
    world: true,
    aiOption: 0,
    options: [
      {
        label: 'The Sebastia compromise — thirty families, "temporarily"',
        tooltip: 'The Revisionists +10, the Kibbutzim −5; Neapolis and Sebaste +1 unrest permanently; −5 legitimacy. The settlement movement now has its founding myth.',
        effects: guard('ev_i_gun_olive:0', (ctx) => {
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.factionShift(ctx, 'ISR', 'revisionists', 10);
          ctx.helpers.factionShift(ctx, 'ISR', 'kibbutzim', -5);
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: -5 });
          for (const n of ['Neapolis', 'Sebaste']) {
            if (ctx.helpers.controls(ctx, 'ISR', n)) {
              ctx.helpers.addProvinceModifier(ctx, n, {
                id: 'settlement_hilltops', name: 'The Hilltops', months: -1, effects: { unrest: 1 },
              });
            }
          }
          ctx.game.flags.gushEmunim = true;
          ctx.helpers.chronicle(ctx, 'era', 'Arafat\'s gun and olive branch at the UN; Gush Emunim\'s thirty families at Sebastia — both movements get their founding scene the same season.');
        }),
      },
      {
        label: 'Clear the station — an eighth time, a ninth, forever',
        tooltip: 'Israel: +5 legitimacy, +10 influence points, −1 stability — the believers are carried off the hill again and again, and the coalition strains at every carry.',
        effects: guard('ev_i_gun_olive:1', (ctx) => {
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: 5, infl: 10, stability: -1 });
          ctx.helpers.factionShift(ctx, 'ISR', 'revisionists', -10);
          ctx.helpers.chronicle(ctx, 'era', 'Arafat gets his ovation in New York; Gush Emunim gets carried off the Sebastia hilltop — and comes back with more families each time.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_resolution_3379',
    title: 'Zionism Is Racism',
    worldLabel: 'General Assembly Resolution 3379',
    desc: 'By seventy-two votes to thirty-five the General Assembly determines that '
      + 'Zionism is a form of racism. Ambassador Herzog answers from the podium on '
      + 'the anniversary of Kristallnacht, and finishes by tearing the resolution in '
      + 'half: "For us, the Jewish people, this is no more than a piece of paper, '
      + 'and we shall treat it as such." The same season, quieter ink: the Sinai II '
      + 'interim agreement, Egyptian and Israeli signatures on the same page, a '
      + 'thing the resolution\'s drafters would have called impossible.',
    forTag: 'both',
    date: { y: 1975, m: 11 },
    world: true,
    aiOption: 0,
    options: [
      {
        label: 'Tear the paper at the podium',
        tooltip: 'Israel: +10 legitimacy, +1 stability, +10 influence points — isolation, answered aloud, binds the country tighter. Sinai II still holds (+15 opinion with Egypt).',
        effects: guard('ev_i_3379:0', (ctx) => {
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: 10, stability: 1, infl: 10 });
          const e = egyTag(ctx);
          if (e && !findWar(ctx.game, 'ISR', e)) {
            setOpinionDelta(ctx.game, e, 'ISR', 15);
            setOpinionDelta(ctx.game, 'ISR', e, 15);
          }
          ctx.helpers.chronicle(ctx, 'era', 'Resolution 3379 declares Zionism racism; Herzog tears it in half at the podium — while Sinai II is initialed in quieter rooms.');
        }),
      },
      {
        label: 'Walk out, and work the corridors instead',
        tooltip: 'Israel: +20 influence points, no legitimacy gain — the answer is procedural, the repeal campaign begins its sixteen-year walk. Sinai II still holds (+15 opinion with Egypt).',
        effects: guard('ev_i_3379:1', (ctx) => {
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { infl: 20 });
          const e = egyTag(ctx);
          if (e && !findWar(ctx.game, 'ISR', e)) {
            setOpinionDelta(ctx.game, e, 'ISR', 15);
            setOpinionDelta(ctx.game, 'ISR', e, 15);
          }
          ctx.helpers.chronicle(ctx, 'era', 'Resolution 3379 passes; the delegation walks out to begin the long procedural war for its repeal.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_entebbe',
    title: 'Entebbe',
    worldLabel: 'The raid on Entebbe',
    desc: 'An Air France flight is hijacked to Idi Amin\'s Uganda, and at the old '
      + 'terminal the selection is conducted by nationality and by name — Jewish '
      + 'passengers kept, the rest released — a sorting the hostages\' parents '
      + 'recognize from memory. Two thousand five hundred miles. Four Hercules '
      + 'transports, a black Mercedes with a flag, ninety minutes on the ground. The '
      + 'military option is madness; the alternative is the precedent.',
    forTag: 'ISR',
    date: { y: 1976, m: 7 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Send the Hercules',
        tooltip: 'Israel: +20 martial points, +15 legitimacy, +1 stability — the hostages come home over Lake Victoria. The force commander, Yoni Netanyahu, does not.',
        effects: guard('ev_i_entebbe:0', (ctx) => {
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { mar: 20, legitimacy: 15, stability: 1 });
          ctx.helpers.chronicle(ctx, 'era', 'Entebbe: ninety minutes on the ground and the hostages come home over Lake Victoria; Yoni Netanyahu dies at the old terminal.');
        }),
      },
      {
        label: 'Negotiate through Paris',
        tooltip: 'Israel: −100 talents and −10 legitimacy, −1 stability — the hostages come home by ransom, and every future hijacker learns the price list.',
        effects: guard('ev_i_entebbe:1', (ctx) => {
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { treasury: -100, legitimacy: -10, stability: -1 });
          ctx.helpers.chronicle(ctx, 'era', 'The Entebbe hostages are ransomed home through intermediaries; the precedent boards the next flight.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_mahapach',
    title: 'The Mahapach',
    worldLabel: 'Begin ends 29 years of Labor rule',
    desc: 'At 11 p.m. the anchorman uses a word the newsroom invented for the '
      + 'occasion: mahapach — upheaval. Menachem Begin, eight elections a loser, '
      + 'perpetual leader of the perpetual opposition, has won. The development '
      + 'towns did it — the Moroccan and Iraqi and Yemenite second Israel that '
      + 'built the state\'s roads and was never invited to run it, voting against '
      + 'the founders\' party in one motion, twenty-nine years deep. Labor\'s '
      + 'Israel ends at a television desk on a Tuesday night.',
    forTag: 'both',
    date: { y: 1977, m: 5 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The upheaval, whole',
        tooltip: 'Menachem Begin becomes Prime Minister: the Revisionists +25, the Coalition −15, −1 stability in the transition — and the second Israel is finally counted (+10 legitimacy).',
        effects: guard('ev_i_mahapach:0', (ctx) => {
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.setRuler(ctx, 'ISR', { name: 'Menachem Begin', title: 'Prime Minister', gov: 3, infl: 4, mar: 3, age: 63 });
          ctx.helpers.factionShift(ctx, 'ISR', 'revisionists', 25);
          ctx.helpers.factionShift(ctx, 'ISR', 'coalition', -15);
          ctx.helpers.adjust(ctx, 'ISR', { stability: -1, legitimacy: 10 });
          ctx.helpers.chronicle(ctx, 'ruler', 'The Mahapach: Menachem Begin ends twenty-nine years of Labor rule; the development towns are finally counted.');
        }),
      },
      {
        label: 'A cabinet of rivals',
        tooltip: 'Begin takes office but Dayan crosses the aisle to Foreign Affairs: the Revisionists only +10, the Coalition +5, +1 stability — continuity purchased inside the upheaval.',
        effects: guard('ev_i_mahapach:1', (ctx) => {
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.setRuler(ctx, 'ISR', { name: 'Menachem Begin', title: 'Prime Minister', gov: 3, infl: 4, mar: 3, age: 63 });
          ctx.helpers.factionShift(ctx, 'ISR', 'revisionists', 10);
          ctx.helpers.factionShift(ctx, 'ISR', 'coalition', 5);
          ctx.helpers.adjust(ctx, 'ISR', { stability: 1 });
          ctx.helpers.chronicle(ctx, 'ruler', 'Begin wins and reaches across the aisle for Dayan: the upheaval arrives wearing the old guard\'s foreign minister.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_sadat_jerusalem',
    title: 'Sadat in Jerusalem',
    worldLabel: 'The Egyptian president flies to Jerusalem',
    desc: 'He says it in parliament almost as an aside — that he would go to the ends '
      + 'of the earth for peace, even to the Knesset itself — and nine days later the '
      + 'presidential aircraft of Egypt is descending toward a runway where the army '
      + 'band has been rehearsing an anthem it never expected to play. The man who '
      + 'crossed the Canal in \'73 stands before the Knesset and says: no more war, '
      + 'no more bloodshed. Nobody in the chamber has notes for this.',
    forTag: 'both',
    date: { y: 1977, m: 11 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Receive him as history',
        tooltip: 'Egypt and Israel: +60 opinion of each other, +10 legitimacy each, Israel +1 stability. The road to Camp David opens.',
        effects: guard('ev_i_sadat:0', (ctx) => {
          const e = egyTag(ctx);
          if (!alive(ctx, 'ISR') || !e || findWar(ctx.game, 'ISR', e)) {
            ctx.helpers.chronicle(ctx, 'diplomacy', 'November 1977 passes without its miracle: the flight to Jerusalem belongs to a history whose fronts were quieter.');
            return;
          }
          const t = ctx.game.tags[e];
          if (t && t.ruler && t.ruler.name.indexOf('Sadat') < 0) {
            ctx.helpers.setRuler(ctx, e, { name: 'Anwar Sadat', title: 'President', gov: 3, infl: 4, mar: 3, age: 58 });
          }
          setOpinionDelta(ctx.game, e, 'ISR', 60);
          setOpinionDelta(ctx.game, 'ISR', e, 60);
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: 10, stability: 1 });
          ctx.helpers.adjust(ctx, e, { legitimacy: 10 });
          ctx.game.flags.sadatVisit = true;
          ctx.helpers.chronicle(ctx, 'diplomacy', 'Sadat stands before the Knesset: "no more war, no more bloodshed." The impossible becomes an itinerary.');
        }),
      },
      {
        label: 'Receive him — and count the divisions anyway',
        tooltip: 'Opinions +30 only, Israel +10 martial points — the hand is shaken and the guard is kept; the road to the treaty stays open, but narrower.',
        effects: guard('ev_i_sadat:1', (ctx) => {
          const e = egyTag(ctx);
          if (!alive(ctx, 'ISR') || !e || findWar(ctx.game, 'ISR', e)) {
            ctx.helpers.chronicle(ctx, 'diplomacy', 'November 1977 passes without its miracle: the flight to Jerusalem belongs to a history whose fronts were quieter.');
            return;
          }
          const t = ctx.game.tags[e];
          if (t && t.ruler && t.ruler.name.indexOf('Sadat') < 0) {
            ctx.helpers.setRuler(ctx, e, { name: 'Anwar Sadat', title: 'President', gov: 3, infl: 4, mar: 3, age: 58 });
          }
          setOpinionDelta(ctx.game, e, 'ISR', 30);
          setOpinionDelta(ctx.game, 'ISR', e, 30);
          ctx.helpers.adjust(ctx, 'ISR', { mar: 10 });
          ctx.game.flags.sadatVisit = true;
          ctx.helpers.chronicle(ctx, 'diplomacy', 'Sadat speaks at the Knesset and is answered with courtesy and caution in equal measure; the door opens a hand\'s width.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_camp_david',
    title: 'Thirteen Days at the Cabin',
    worldLabel: 'The Camp David negotiations',
    desc: 'Thirteen days in the Maryland woods, and by the last of them the two '
      + 'delegations can no longer be put in the same cabin: Carter carries drafts '
      + 'between them like a court runner. Begin will not write "Jerusalem"; Sadat '
      + 'will not cross out "sovereignty"; twenty-three drafts die named and '
      + 'numbered. On the thirteenth day there are two frameworks — Sinai for '
      + 'peace, and an autonomy for the Palestinians vague enough for every party '
      + 'to read as victory. It is the closest thing to peace the region has ever '
      + 'initialed.',
    forTag: 'both',
    date: { y: 1978, m: 9 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Sign the frameworks',
        tooltip: 'Egypt and Israel: +40 opinion of each other, +10 legitimacy each. The treaty itself comes next spring — Sinai for peace.',
        effects: guard('ev_i_camp_david:0', (ctx) => {
          const e = egyTag(ctx);
          if (!alive(ctx, 'ISR') || !e || !ctx.game.flags.sadatVisit || findWar(ctx.game, 'ISR', e)) {
            ctx.helpers.chronicle(ctx, 'diplomacy', 'September 1978: the cabin in the Maryland woods stands empty; the guests history booked for it never came.');
            return;
          }
          setOpinionDelta(ctx.game, e, 'ISR', 40);
          setOpinionDelta(ctx.game, 'ISR', e, 40);
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: 10 });
          ctx.helpers.adjust(ctx, e, { legitimacy: 10 });
          ctx.game.flags.campDavid = true;
          ctx.helpers.chronicle(ctx, 'diplomacy', 'Camp David: thirteen days, twenty-three dead drafts, and two frameworks initialed — Sinai for peace, and an autonomy everyone reads differently.');
        }),
      },
      {
        label: 'Balk at the autonomy clause',
        tooltip: 'No frameworks: opinions −20, Israel +5 legitimacy at home and the Revisionists +5 — the settlements are not mortgaged, and neither is the peace.',
        effects: guard('ev_i_camp_david:1', (ctx) => {
          const e = egyTag(ctx);
          if (!alive(ctx, 'ISR') || !e || !ctx.game.flags.sadatVisit || findWar(ctx.game, 'ISR', e)) {
            ctx.helpers.chronicle(ctx, 'diplomacy', 'September 1978: the cabin in the Maryland woods stands empty; the guests history booked for it never came.');
            return;
          }
          setOpinionDelta(ctx.game, e, 'ISR', -20);
          setOpinionDelta(ctx.game, 'ISR', e, -20);
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: 5 });
          ctx.helpers.factionShift(ctx, 'ISR', 'revisionists', 5);
          ctx.helpers.chronicle(ctx, 'diplomacy', 'The thirteenth day at Camp David ends with handshakes and no signatures; the drafts go home in separate briefcases.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_treaty_washington',
    title: 'The Treaty on the Lawn',
    worldLabel: 'The Egypt–Israel peace treaty',
    desc: 'On the White House lawn, thirty-one years after five armies crossed the '
      + 'borders of a one-day-old state, an Arab republic signs peace with Israel: '
      + 'Sinai returned to the last grain of sand, embassies exchanged, the first '
      + 'recognition. The Arab League expels Egypt within the week and moves its '
      + 'headquarters out of Cairo; the crowds that carried Sadat after the Crossing '
      + 'are silent now. He knows the price and signs anyway. He has three years '
      + 'to live.',
    forTag: 'both',
    date: { y: 1979, m: 3 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Sinai for peace — sign',
        tooltip: 'Israel returns every Sinai province it holds; both states gain a 20-year peace (no opportunistic wars), −2 war exhaustion, Egypt +15 and Israel +10 legitimacy. The Arab League expels Egypt (−60 opinion from every Arab capital).',
        effects: guard('ev_i_treaty:0', (ctx) => {
          const g = ctx.game;
          const e = egyTag(ctx);
          if (!alive(ctx, 'ISR') || !e || !g.flags.campDavid || findWar(g, 'ISR', e)) {
            ctx.helpers.chronicle(ctx, 'diplomacy', 'March 1979 passes without a lawn, a table, or a treaty; the first peace waits for another history.');
            return;
          }
          for (const n of ['Rhinocolura', 'Pelusium', 'Sinai Interior', 'Kadesh Barnea', 'Paran', 'Dizahab']) {
            if (ctx.helpers.controls(ctx, 'ISR', n)) ctx.helpers.changeOwner(ctx, n, e);
          }
          for (const t of ['ISR', e]) {
            ctx.helpers.adjust(ctx, t, { warExhaustion: -2 });
            ctx.helpers.addTagModifier(ctx, t, {
              id: 'treaty_of_washington', name: 'The Treaty of Washington', months: 240,
              effects: { noOpportunisticWars: true },
            });
          }
          ctx.helpers.adjust(ctx, e, { legitimacy: 15 });
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: 10 });
          setOpinionDelta(g, e, 'ISR', 100);
          setOpinionDelta(g, 'ISR', e, 100);
          const s = syrTag(ctx);
          for (const t of ['SAU', 'IRQ', 'JOR', 'LEB', s]) {
            if (t && t !== e && alive(ctx, t)) setOpinionDelta(g, t, e, -60);
          }
          ctx.helpers.chronicle(ctx, 'peace', 'The Egypt–Israel treaty is signed on the White House lawn: Sinai for peace, the first recognition. The League expels Egypt; Sadat has three years to live.');
        }),
      },
      {
        label: 'Peace — but the Sinai in stages, and slowly',
        tooltip: 'Only western Sinai returns now; the peace holds at 10 years, opinions +40, Egypt −10 legitimacy (half a treaty buys half a triumph). No expulsion from the League — and less of a peace.',
        effects: guard('ev_i_treaty:1', (ctx) => {
          const g = ctx.game;
          const e = egyTag(ctx);
          if (!alive(ctx, 'ISR') || !e || !g.flags.campDavid || findWar(g, 'ISR', e)) {
            ctx.helpers.chronicle(ctx, 'diplomacy', 'March 1979 passes without a lawn, a table, or a treaty; the first peace waits for another history.');
            return;
          }
          for (const n of ['Pelusium', 'Arsinoe']) {
            if (ctx.helpers.controls(ctx, 'ISR', n)) ctx.helpers.changeOwner(ctx, n, e);
          }
          for (const t of ['ISR', e]) {
            ctx.helpers.adjust(ctx, t, { warExhaustion: -1 });
            ctx.helpers.addTagModifier(ctx, t, {
              id: 'treaty_of_washington', name: 'The Treaty, In Installments', months: 120,
              effects: { noOpportunisticWars: true },
            });
          }
          ctx.helpers.adjust(ctx, e, { legitimacy: -10 });
          setOpinionDelta(g, e, 'ISR', 40);
          setOpinionDelta(g, 'ISR', e, 40);
          ctx.helpers.chronicle(ctx, 'peace', 'A treaty of installments: the canal bank changes hands, the rest of Sinai waits on schedules — a peace, but one signed in pencil.');
        }),
      },
    ],
  },
];
