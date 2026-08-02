// Judaea Universalis — event chain: The War of Independence, the armed
// armistice, and the wars and peace that follow, 1948–86.
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

function ageAt(ctx, birthYear, birthMonth) {
  const d = ctx.game.date;
  return Math.max(0, d.y - birthYear - (d.m < birthMonth ? 1 : 0));
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

function findWar(game, a, b) {
  const x = warTag(game, a);
  const y = warTag(game, b);
  for (const w of (game && game.wars) || []) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf(x) !== -1 && all.indexOf(y) !== -1) return w;
  }
  return null;
}

// The 1948 chapter is the exception to SPEC §135, deliberately. Everywhere else
// a renamed realm is the same court under new letters and `alive` should follow
// the forwarding address. Here the rename IS the subject: Cairo becomes the
// United Arab Republic and back again, Damascus walks out of the union as the
// Syrian Arab Republic, and a dozen cards turn on which of those banners is
// flying this decade. So this one asks the raw question, and the chapter's own
// cast resolvers (egyTag / syrTag / syrOwn) go on answering it name by name.
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
  // Some pacts are never signed, whoever is holding the pen (SPEC §96).
  if (typeof ctx.helpers.allianceBarred === 'function' && ctx.helpers.allianceBarred(ctx, a, b)) return;
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

function setOpinionAtLeast(game, a, b, floor) {
  try {
    const ta = game.tags && game.tags[a];
    if (!ta) return;
    if (!ta.opinion || typeof ta.opinion !== 'object') ta.opinion = {};
    ta.opinion[b] = Math.max(floor, Math.min(200, ta.opinion[b] || 0));
  } catch (e) { warnOnce('setOpinionAtLeast', e); }
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
  // Damascus answers to one of three names depending on how the sixties went
  // (SPEC §105): the mandate republic, the republic that walked out of the
  // union in 1961, or the union itself if it never came apart.
  if (alive(ctx, 'SAR')) return 'SAR';
  if (alive(ctx, 'SYR')) return 'SYR';
  if (alive(ctx, 'UAR')) return 'UAR';
  return null;
}
// Damascus as a state in its own right — the union does not count, because
// the cards that use this are asking whether there is a Syria to ask.
function syrOwn(ctx) {
  if (alive(ctx, 'SAR')) return 'SAR';
  if (alive(ctx, 'SYR')) return 'SYR';
  return null;
}
// The hill country west of the river (SPEC §107). Whether a kingdom whose
// name means "across the Jordan" stops calling itself that depends on one
// question and only one: is it standing on both banks? These are the cells
// the Arab Legion actually held in 1949 — the Samarian and Judaean hills, the
// Jerusalem corridor's eastern half, and the Old City.
const WEST_BANK = [
  'Neapolis', 'Sebaste', 'Jenin', 'Tulkarm', 'Qalqilya', 'Ramallah',
  'Bethlehem', 'Hebron', 'Adora', 'Jericho', 'Jerusalem', 'Beit Shemesh',
  'Modi\'in Hills', 'Emmaus', 'Lydda',
];
function westBankHeld(ctx, tag) {
  let n = 0;
  for (const name of WEST_BANK) {
    if (ctx.helpers.controls(ctx, tag, name)) n++;
  }
  return n;
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
// The fedayeen wars (SPEC §97): where the organizations actually stood at a
// given date. A rebel host with no ground to stand on is not a civil war, so
// each arc picks the first province its host's patron still controls.
function ploBases(ctx, tag, names) {
  return names.filter((n) => ctx.helpers.controls(ctx, tag, n));
}
// A rebel host with a name and a cause. Returns the province it stands in.
function spawnRebels(ctx, provNames, opts) {
  if (!alive(ctx, 'REB')) return null;
  for (const n of provNames) {
    const p = ctx.prov(n);
    if (!p || p.impassable) continue;
    const id = ctx.helpers.spawnArmy(ctx, 'REB', n, opts);
    if (id) return n;
  }
  return null;
}
// Unrest with a name, over a list of provinces their holder still controls.
function unrestAcross(ctx, tag, names, mod) {
  let touched = 0;
  for (const n of names) {
    if (tag && !ctx.helpers.controls(ctx, tag, n)) continue;
    ctx.helpers.addProvinceModifier(ctx, n, mod);
    touched++;
  }
  return touched;
}
// Spawn at the first listed province the tag actually controls — fronts move.
function spawnAt(ctx, tag, provNames, opts) {
  for (const n of provNames) {
    if (ctx.helpers.controls(ctx, tag, n)) return ctx.helpers.spawnArmy(ctx, tag, n, opts);
  }
  return null;
}

// Dated wars are not opportunistic diplomacy. A five-year sim truce from an
// earlier player settlement must not silently erase a scripted historical
// front once the event's own world gate has admitted the war.
function clearEventTruce(ctx, a, b) {
  const g = ctx.game;
  if (!g.truces) return;
  delete g.truces[a < b ? a + '|' + b : b + '|' + a];
}

function octoberCombatants(ctx) {
  const e = egyTag(ctx), s = syrTag(ctx);
  return Array.from(new Set([e, s, alive(ctx, 'JOR') ? 'JOR' : null]
    .filter((t) => t && t !== 'ISR' && alive(ctx, t))));
}

// The raids choose an Israeli-held border district, so the gray army really
// enters Israel instead of materializing in its foreign base.
function fedayeenTarget(ctx) {
  for (const n of [
    // Gaza/Egyptian armistice line
    'Ascalon', 'Kiryat Gat', 'Beersheba', 'Rehovot',
    // Jordanian line and the Jerusalem corridor
    'Beit Shemesh', 'Lydda', 'Jerusalem', 'Engaddi',
    // Lebanese/Syrian approaches
    'Nahariya', 'Ptolemais', 'Safed', 'Kiryat Shmona', 'Tiberias',
  ]) {
    if (ctx.helpers.controls(ctx, 'ISR', n)) return n;
  }
  return null;
}

function spawnFedayeen(ctx, strength) {
  const target = fedayeenTarget(ctx);
  if (!target || !alive(ctx, 'REB')) return null;
  const id = ctx.helpers.spawnArmy(ctx, 'REB', target, {
    inf: Math.max(1, strength | 0), cav: 0, gen: 5,
    name: 'Fedayeen Infiltrators',
    general: { name: 'Field Commander', fire: 1, shock: 2, maneuver: 3 },
  });
  ctx.helpers.addProvinceModifier(ctx, target, {
    id: 'fedayeen_infiltration', name: 'Fedayeen Infiltration', months: 12,
    effects: { unrest: strength > 1 ? 1.5 : 0.75 },
  });
  return id ? target : null;
}

// Remove the community planted by Israeli settlement before sovereignty
// returns to Egypt. Other local communities remain; the largest survivor
// again supplies the province's religion and culture through addPopulation.
function withdrawIsraeliSettlers(ctx, provName, returningTag) {
  const p = ctx.prov(provName);
  const isr = ctx.game.tags.ISR;
  const returning = ctx.game.tags[returningTag];
  if (!p || !isr || !returning) return 0;
  let removed = 0;
  for (const row of Array.isArray(p.pop) ? p.pop.slice() : []) {
    if (!row || row.r !== isr.religion || row.c !== isr.culture || !(row.n > 0)) continue;
    removed += row.n;
    ctx.helpers.addPopulation(ctx, provName, { r: row.r, c: row.c, n: -row.n });
  }
  if (!Array.isArray(p.pop) || !p.pop.length) {
    p.religion = returning.religion;
    p.culture = returning.culture;
    // Empty/frontier saves still need a resident community after evacuation.
    p.pop = [{ r: returning.religion, c: returning.culture, n: 1000 }];
  }
  p.integration = 0;
  p.integrating = null;
  p.settlement = null;
  if (p.settledBy === 'ISR') p.settledBy = null;
  ctx.helpers.removeModifier(ctx, provName, 'settling');
  ctx.helpers.changeOwner(ctx, provName, returningTag);
  return removed;
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
  if (!alive(ctx, 'ISR') || !e || !hostileToward(ctx, e, 'ISR', -60)) {
    ctx.helpers.chronicle(ctx, 'era', 'The Day of Atonement of 1973 passes without sirens; the October war belongs to a history this world declined.');
    return;
  }
  g.flags.yomKippurWar = true;
  const enemies = octoberCombatants(ctx);
  for (const t of enemies) clearEventTruce(ctx, t, 'ISR');
  for (const t of enemies) {
    if (!findWar(g, 'ISR', t)) ctx.helpers.declareWar(ctx, t, 'ISR', 'The Yom Kippur War');
  }
  spawnAt(ctx, e, ['Pelusium', 'Arsinoe', 'Memphis'], {
    inf: 6, cav: 3, name: 'Second and Third Armies',
    general: { name: 'Saad el-Shazly', fire: 3, shock: 2, maneuver: 3 },
  });
  if (s && s !== e && findWar(g, 'ISR', s)) {
    spawnAt(ctx, s, ['Damascus', 'Batanea', 'Caesarea Philippi'], {
      inf: 5, cav: 4, name: 'Syrian Armoured Divisions',
      general: { name: 'Yusuf Shakkur', fire: 2, shock: 3, maneuver: 2 },
    });
  }
  if (enemies.includes('JOR') && findWar(g, 'ISR', 'JOR')) {
    spawnAt(ctx, 'JOR', ['Philadelphia', 'Jericho', 'Neapolis'], {
      inf: 2, cav: 3, name: '40th Armoured Brigade',
      general: { name: 'Khalid Haja Mujalli', fire: 2, shock: 3, maneuver: 3 },
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
    ctx.helpers.chronicle(ctx, 'war', 'The sirens go up on the fast: Egypt crosses the Canal, Syria floods the Golan, and Jordan\'s 40th Armoured Brigade follows onto the Syrian front.');
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
// Provinces outside Israel's 15-May holdings that abstract territory inside
// the 1949 armistice lines. Rhodes may confirm these gains, but not any other
// place an Israeli formation happens to occupy when the decision is pressed.
const ARMISTICE_1949_ISR_GAINS = new Set([
  'Gischala', 'Sepphoris', 'Jotapata',
  'Lydda', 'Beit Shemesh',
  'Ascalon', 'Azotus', 'Kiryat Gat',
  'Beersheba', 'Arad', 'Oboda', 'Dimona', 'Mitzpe Ramon', 'Paran', 'Eilat',
]);
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
    decider: 'ISR',
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
    decider: 'ISR',
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
    decider: 'JOR',
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
    decider: 'ISR',
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
    decider: 'ISR',
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
          // The first pipeline (SPEC §181): Prague sells, and the market opens.
          ctx.helpers.setArmsDeal(ctx, 'ISR', 'CZE');
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
          // The crates land either way (SPEC §181): the cabinet's view of
          // Bernadotte's count was never Prague's concern.
          ctx.helpers.setArmsDeal(ctx, 'ISR', 'CZE');
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
    major: true,
    aiOption: 0,
    historical: 'The cannon fired — Ben-Gurion called it holy afterwards — and the ship '
      + 'burned off the Tel Aviv beach with sixteen dead. There was no second army in '
      + 'Israel from that afternoon on, and no argument about it that anyone could win.',
    options: [
      {
        label: 'One state, one army — fire',
        tooltip: 'Israel: +1 stability, −5 legitimacy. The Revisionists −20, the Coalition +10. The state\'s monopoly on force is settled forever.',
        effects: guard('ev_i_altalena:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { stability: 1, legitimacy: -5 });
          ctx.helpers.factionShift(ctx, 'ISR', 'revisionists', -20);
          ctx.helpers.factionShift(ctx, 'ISR', 'coalition', 10);
          ctx.helpers.setFlag(ctx, 'altalenaShelled', true);
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
          ctx.helpers.setFlag(ctx, 'altalenaAshore', true);
          ctx.helpers.chronicle(ctx, 'era', 'The Altalena\'s cargo comes ashore under a '
            + 'negotiated flag: the rifles join the war, and the question of who commands '
            + 'them is left open, on purpose, by everyone.');
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
    decider: 'ISR',
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
    decider: 'ISR',
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
    decider: 'ISR',
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
    decider: 'ISR',
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
    decider: 'ISR',
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
    decider: 'EGY',
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
    decider: 'ISR',
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
    decider: 'ISR',
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
    decider: 'ISR',
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
    decider: 'JOR',
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

  // ── 9d.2 ──────────────────────────────────────────────────────────────────
  // The kingdom changes its name (SPEC §107). "Transjordan" is a description
  // written from the other side of the river — the land ACROSS the Jordan,
  // as the mandate's draftsmen in Jerusalem saw it. Once the Legion is
  // holding Nablus and Hebron and the Old City, the name describes half the
  // country, and on the 26th of April 1949 Amman drops the preposition. The
  // rename is therefore not a calendar fact but a MAP fact, and it is gated
  // on one: a kingdom that has been pushed back over the river keeps the name
  // the mandate gave it, and the divergence gets its own page.
  {
    id: 'ev_i_kingdom_of_jordan',
    title: 'The Preposition Is Dropped',
    worldLabel: 'Transjordan becomes the Hashemite Kingdom of Jordan',
    desc: 'The name was always a direction. Trans-Jordan: the country on the far side '
      + 'of the river, which is only the far side if you are standing in Jerusalem, '
      + 'and the men who drew it were. For twenty-eight years it described a desert '
      + 'emirate with one railway and a subsidy, and now it describes half of what '
      + 'the King actually rules — the Legion is in Nablus and Hebron and the walls '
      + 'of the Old City, the Jericho notables have proclaimed him, and the armistice '
      + 'signed at Rhodes three weeks ago wrote the line where his soldiers were '
      + 'standing. So the parliament in Amman strikes the preposition out and the '
      + 'kingdom becomes, simply, Jordan: a name that claims both banks by refusing '
      + 'to say which one it is on. The formal act of union comes a year later and '
      + 'exactly two governments in the world recognize it. Everyone uses the name '
      + 'regardless, which is how names work.',
    forTag: 'both',
    decider: 'JOR',
    date: { y: 1949, m: 4 },
    world: true,
    major: true,
    when: safeTrigger('ev_i_kingdom_of_jordan:when', (ctx) =>
      alive(ctx, 'JOR') && westBankHeld(ctx, 'JOR') >= 3),
    aiOption: 0,
    historical: 'The kingdom was renamed on 26 April 1949; the West Bank was formally annexed a year later.',
    options: [
      {
        label: 'One kingdom, and no preposition',
        tooltip: 'Transjordan becomes the Hashemite Kingdom of Jordan: +10 legitimacy, +1 stability and "The Two Banks" permanently (+8% income, +10% manpower — the kingdom has just acquired the more populous half of itself). Cairo and Damascus cool a further 15 toward Amman; the League will spend four years arguing about a name.',
        effects: guard('ev_i_kingdom_of_jordan:0', (ctx) => {
          const g = ctx.game;
          ctx.helpers.rebrandTag(ctx, 'JOR', { name: 'Jordan' });
          ctx.helpers.adjust(ctx, 'JOR', { legitimacy: 10, stability: 1 });
          ctx.helpers.addTagModifier(ctx, 'JOR', {
            id: 'the_two_banks', name: 'The Two Banks', months: -1,
            effects: { incomeMult: 1.08, manpowerMult: 1.1 },
          });
          setOpinionDelta(g, 'EGY', 'JOR', -15);
          setOpinionDelta(g, 'SYR', 'JOR', -15);
          g.flags.kingdomOfJordan = true;
          ctx.helpers.chronicle(ctx, 'era', 'Amman strikes the preposition out: the Hashemite Kingdom of Transjordan becomes the Hashemite Kingdom of Jordan, a name that claims both banks by refusing to say which one it is on.');
        }),
      },
      {
        label: 'Keep the mandate\'s name and annex nothing',
        tooltip: 'The King holds the ground and declines the title: Jordan keeps the name Transjordan, +60 talents and +15 governance points of British goodwill, and Cairo and Damascus cool only 5 — but no "Two Banks" (the west bank is administered, not incorporated, and pays like an occupation rather than a province).',
        effects: guard('ev_i_kingdom_of_jordan:1', (ctx) => {
          const g = ctx.game;
          ctx.helpers.adjust(ctx, 'JOR', { treasury: 60, gov: 15 });
          ctx.helpers.addTagModifier(ctx, 'JOR', {
            id: 'administered_not_annexed', name: 'Administered, Not Annexed', months: -1,
            effects: { incomeMult: 0.96, unrestAll: 0.5 },
          });
          setOpinionDelta(g, 'EGY', 'JOR', -5);
          setOpinionDelta(g, 'SYR', 'JOR', -5);
          g.flags.nameKept = true;
          ctx.helpers.chronicle(ctx, 'era', 'Amman keeps the mandate\'s name and administers the west bank without incorporating it; the League is mollified and the hill country is not.');
        }),
      },
    ],
  },

  // ── 9d.3 ──────────────────────────────────────────────────────────────────
  // The other world: the Legion was pushed back over the river, so there is
  // no second bank and no reason to stop being the country across the first
  // one. This card is the divergence's own page — it fires exactly when the
  // one above retires.
  {
    id: 'ev_i_still_transjordan',
    title: 'Still the Far Side of the River',
    worldLabel: 'Transjordan keeps its name',
    desc: 'The parliament in Amman had a bill drafted. It is not moved. There is no '
      + 'point in a kingdom on both banks announcing itself when the Legion is back '
      + 'on the east one and the hill country is somebody else\'s armistice line, and '
      + 'the King — who wanted Jerusalem more than he wanted Palestine and has now '
      + 'been told he may have neither — spends the spring writing to London about a '
      + 'subsidy. Transjordan keeps the name the mandate gave it, which was always a '
      + 'direction rather than a country, and goes on being the thing the direction '
      + 'points away from.',
    forTag: 'both',
    decider: 'JOR',
    date: { y: 1949, m: 4 },
    world: true,
    when: safeTrigger('ev_i_still_transjordan:when', (ctx) =>
      alive(ctx, 'JOR') && westBankHeld(ctx, 'JOR') < 3),
    aiOption: 0,
    options: [
      {
        label: 'The bill is not moved',
        tooltip: 'Transjordan keeps its name and its subsidy: +80 talents and +10 governance points from London, −10 legitimacy, and "The Kingdom That Stayed Small" (−5% manpower) — a desert emirate with one railway, which is what it was in 1921 and what the war has left it.',
        effects: guard('ev_i_still_transjordan:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'JOR', { treasury: 80, gov: 10, legitimacy: -10 });
          ctx.helpers.addTagModifier(ctx, 'JOR', {
            id: 'kingdom_that_stayed_small', name: 'The Kingdom That Stayed Small', months: -1,
            effects: { manpowerMult: 0.95 },
          });
          ctx.game.flags.stillTransjordan = true;
          ctx.helpers.chronicle(ctx, 'era', 'With the Legion back on the east bank there is no second bank to announce: Transjordan keeps the name the mandate gave it.');
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
    decider: 'ISR',
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
    decider: 'ISR',
    trigger: safeTrigger('ev_i_armistice', (ctx) =>
      dateGE(ctx, 1949, 2) && !!findWar(ctx.game, 'EGY', 'ISR')),
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The lines become the map',
        tooltip: 'The war ends on the classical 1949 armistice lines. Israel keeps occupied Galilee, Lod, the southern plain and Negev/Arabah cells inside those lines; occupied Gaza, Sinai, the West Bank, Golan and foreign territory return to their prior owners. Every court: −2 war exhaustion.',
        effects: guard('ev_i_armistice:0', (ctx) => {
          // Rhodes was four agreements, not one — Egypt in February, Lebanon in
          // March, Jordan in April, Syria in July — and a scripted peace binds
          // the courts that sign it (SPEC §193). So every delegation on the
          // island initials its own map against the same line, and the last
          // signature is the one that ends the war.
          const war = findWar(ctx.game, 'EGY', 'ISR');
          const enemies = war
            ? ((war.attackers || []).indexOf('ISR') >= 0 ? war.defenders : war.attackers).slice()
            : [];
          for (const t of enemies) {
            ctx.helpers.endWar(ctx, t, 'ISR', 'def', {
              keep: (p) => p.controller === 'ISR'
                && ARMISTICE_1949_ISR_GAINS.has(p.canon || p.name),
            });
          }
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
          ctx.helpers.chronicle(ctx, 'peace', 'The Rhodes armistices: the classical 1949 lines become the lines on the atlas; expeditionary occupations beyond them are handed back.');
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
            // Cairo changes suppliers (SPEC §181): the deal is signed in
            // Prague and owned in Moscow — London's treaty is done. And the
            // bloc that now arms Egypt stops selling to Israel: the eastern
            // regard drops through the pipeline floor, and Jerusalem had
            // better be courting Paris already.
            ctx.helpers.setArmsDeal(ctx, 'EGY', 'SOV');
            setOpinionDelta(ctx.game, 'SOV', 'ISR', -50);
            setOpinionDelta(ctx.game, 'CZE', 'ISR', -50);
            setOpinionDelta(ctx.game, 'UK', 'EGY', -40);
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

  // ── THE PARIS AXIS AND THE TEXTILE FACTORY, 1954–86 (SPEC §181/§182) ──────
  // The supplier question, and the question the supplier makes possible.
  // Prague closes in the fifties; Paris opens; and at the end of the French
  // road, in the deep Negev the state had to win first, something hums.
  {
    id: 'ev_i_paris_axis',
    title: 'The Paris Axis',
    desc: 'The east is closing — Prague answers slowly, and the tone from Moscow '
      + 'has changed. In Paris a young director-general of the Defense Ministry '
      + 'finds a different climate entirely: France is fighting in Algeria, blames '
      + 'Cairo for it, and has discovered it shares an enemy. Nobody says alliance. '
      + 'The word used is "procurement."',
    forTag: 'ISR',
    date: { y: 1954, m: 8 },
    when: (ctx) => alive(ctx, 'ISR') && alive(ctx, 'FRA'),
    aiOption: 0,
    options: [
      {
        label: 'Send Peres to Paris',
        tooltip: 'France becomes the arms supplier: her regard rises to at least 55 and the weapons transfer agreement is signed — the Czech book closes. −15 influence points for the mission that never officially happened.',
        effects: guard('ev_i_paris_axis:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { infl: -15 });
          setOpinionAtLeast(ctx.game, 'FRA', 'ISR', 55);
          setOpinionAtLeast(ctx.game, 'ISR', 'FRA', 55);
          ctx.helpers.setArmsDeal(ctx, 'ISR', 'FRA');
          ctx.game.flags.parisAxis = true;
          ctx.helpers.chronicle(ctx, 'diplo', 'The Paris axis: French patterns, French spares, and a friendship conducted entirely in warehouses.');
        }),
      },
      {
        label: 'The east still sells — for now',
        tooltip: 'Keep the Czech pipeline while it lasts. History gives it about a year.',
        effects: guard('ev_i_paris_axis:1', (ctx) => {
          ctx.helpers.chronicle(ctx, 'diplo', 'Jerusalem keeps buying through Prague, and counts the months on its fingers.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_dimona_offer',
    title: 'What France Owes',
    desc: 'The Suez account is being settled in an unlisted currency. In a Paris '
      + 'still smarting from the canal, the atomic energy commissariat is '
      + 'authorized to discuss with Israel what it discusses with nobody: a '
      + 'reactor, heavy water, and engineers — at Dimona, at the end of a road '
      + 'that goes nowhere else, in a desert the state had to conquer before it '
      + 'could keep secrets there. The cost is not the kind a treasury notices '
      + 'once. It is the kind it notices every month for ten years.',
    forTag: 'ISR',
    major: true,
    trigger: safeTrigger('ev_i_dimona_offer', (ctx) =>
      dateGE(ctx, 1957, 10) && alive(ctx, 'ISR') && alive(ctx, 'FRA')
      && ctx.helpers.controls(ctx, 'ISR', 'Dimona')
      && (ctx.helpers.armsSupplier(ctx, 'ISR') === 'FRA'
        || (ctx.game.tags.FRA.opinion && (ctx.game.tags.FRA.opinion.ISR || 0) >= 55))),
    maxYear: 1965,
    aiOption: 1,
    options: [
      {
        label: 'Break ground in the Negev',
        tooltip: 'Israel: −150 talents, −20 influence points, and The Program — 5% of all income, quietly, until the arc resolves. The fork opens: what rises at Dimona is for a later cabinet to name.',
        effects: guard('ev_i_dimona_offer:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { treasury: -150, infl: -20 });
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'dimona_program', name: 'The Program', months: -1,
            effects: { incomeMult: 0.95 },
          });
          ctx.game.flags.dimonaStarted = true;
          ctx.helpers.chronicle(ctx, 'era', 'Ground is broken at Dimona for a works the budget does not mention and the road does not explain.');
        }),
      },
      {
        label: 'A young state has other bills',
        tooltip: 'Decline. The offer was priced in 1957\'s gratitude, and it is not made twice.',
        effects: guard('ev_i_dimona_offer:1', (ctx) => {
          ctx.game.flags.dimonaDeclined = true;
          ctx.helpers.chronicle(ctx, 'era', 'The commissariat\'s offer is allowed to lapse; the desert keeps only its ordinary secrets.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_dimona_cover',
    title: 'The Textile Factory',
    desc: 'An American U-2 has photographed the Negev, and the State Department '
      + 'has stopped pretending not to understand the pictures. A dome does not '
      + 'look like anything else. The ambassador is asked, in the mild voice '
      + 'Washington uses for serious questions, what exactly Israel is building '
      + 'at the end of that road.',
    forTag: 'ISR',
    date: { y: 1960, m: 12 },
    major: true,
    when: (ctx) => !!ctx.game.flags.dimonaStarted && alive(ctx, 'USA'),
    aiOption: 1,
    options: [
      {
        label: '"It is a textile factory"',
        tooltip: 'The cover story, delivered with a straight face. Washington\'s regard −15 — they know, and they know you know they know — but the program stays deniable and the flag remembers the sentence.',
        effects: guard('ev_i_dimona_cover:0', (ctx) => {
          setOpinionDelta(ctx.game, 'USA', 'ISR', -15);
          ctx.game.flags.dimonaCover = true;
          ctx.helpers.chronicle(ctx, 'diplo', 'Asked about the dome at Dimona, Israel describes a textile factory. Nobody writes the answer down without smiling.');
        }),
      },
      {
        label: '"A research reactor, for peaceful purposes"',
        tooltip: 'Ben-Gurion\'s Knesset formula: admit the reactor, promise the peace. Washington\'s regard −5; legitimacy +5 — a half-truth spoken in parliament is a different instrument than a tarpaulin.',
        effects: guard('ev_i_dimona_cover:1', (ctx) => {
          setOpinionDelta(ctx.game, 'USA', 'ISR', -5);
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: 5 });
          ctx.game.flags.dimonaAdmitted = true;
          ctx.helpers.chronicle(ctx, 'diplo', 'The Prime Minister tells the Knesset the Negev reactor is for peaceful purposes, in a sentence built to be quoted exactly.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_dimona_visits',
    title: 'The President\'s Letters',
    desc: 'Kennedy writes the way other presidents telephone: precisely, repeatedly, '
      + 'and on the record. He wants American scientists inside Dimona on a '
      + 'schedule, and each letter is politer and shorter than the last. The '
      + 'visits can be managed — the schedule is drawn by the hosts, and a '
      + 'basement does not tour — but refusing the letters means reading the '
      + 'next one from a colder desk.',
    forTag: 'ISR',
    date: { y: 1963, m: 5 },
    when: (ctx) => !!ctx.game.flags.dimonaStarted && alive(ctx, 'USA'),
    aiOption: 0,
    options: [
      {
        label: 'Curated Saturdays',
        tooltip: 'Admit the visitors on the hosts\' schedule. Washington\'s regard +15; the tour shows what the itinerary permits.',
        effects: guard('ev_i_dimona_visits:0', (ctx) => {
          setOpinionDelta(ctx.game, 'USA', 'ISR', 15);
          ctx.game.flags.dimonaToured = true;
          ctx.helpers.chronicle(ctx, 'diplo', 'American scientists tour Dimona on Saturdays arranged with great care, and find exactly what the schedule intends.');
        }),
      },
      {
        label: 'The desert is not on the itinerary',
        tooltip: 'Refuse. Washington\'s regard −20, and the letters get shorter.',
        effects: guard('ev_i_dimona_visits:1', (ctx) => {
          setOpinionDelta(ctx.game, 'USA', 'ISR', -20);
          ctx.game.flags.dimonaRefusedVisits = true;
          ctx.helpers.chronicle(ctx, 'diplo', 'The President\'s letters go unanswered on the question of visits; the next one arrives typed, without the fountain pen.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_dimona_ready',
    title: 'The Basement',
    desc: 'Nine years of drained budgets, French engineers, and a road that goes '
      + 'nowhere else, and the thing at the end of it is finished. What exists '
      + 'under Dimona is now a fact; the cabinet\'s question is what KIND of '
      + 'fact. A thing declared deters most and costs most. A thing implied '
      + 'deters nearly as much and cannot be photographed. A thing sealed costs '
      + 'nothing further and deters nobody.',
    forTag: 'ISR',
    major: true,
    trigger: safeTrigger('ev_i_dimona_ready', (ctx) =>
      dateGE(ctx, 1966, 6) && !!ctx.game.flags.dimonaStarted && alive(ctx, 'ISR')),
    aiOption: 0,
    options: [
      {
        label: '"We will not be the first to introduce them"',
        tooltip: 'Opacity, the policy the joke grew into: a permanent deterrent (opportunistic AI wars against Israel need ×1.6 the edge). The Program\'s drain ends. The modifier on the ledger is named what the cover story was.',
        effects: guard('ev_i_dimona_ready:0', (ctx) => {
          ctx.helpers.removeModifier(ctx, 'ISR', 'dimona_program');
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'the_basement', name: 'The Textile Factory', months: -1,
            effects: { deterrent: 1 },
          });
          ctx.game.flags.dimonaOpaque = true;
          ctx.helpers.chronicle(ctx, 'era', 'Israel announces it will not be the first to introduce nuclear weapons to the Middle East, in a sentence engineered to stay true whatever is true.');
        }),
      },
      {
        label: 'Test it where the world can see',
        tooltip: 'Declare: deterrent ×2.2 against opportunistic wars — and every arsenal court\'s regard −40, aggression +20, and whatever pipeline feeds you will probably die of the fall. Stronger, and priced like it.',
        effects: guard('ev_i_dimona_ready:1', (ctx) => {
          ctx.helpers.removeModifier(ctx, 'ISR', 'dimona_program');
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'the_basement', name: 'The Device, Declared', months: -1,
            effects: { deterrent: 2 },
          });
          const t = ctx.game.tags.ISR;
          if (t) t.aggression = Math.min(100, (t.aggression || 0) + 20);
          for (const arsenal of ['USA', 'SOV', 'UK', 'FRA', 'CZE']) {
            if (alive(ctx, arsenal)) setOpinionDelta(ctx.game, arsenal, 'ISR', -40);
          }
          ctx.game.flags.dimonaDeclared = true;
          ctx.helpers.chronicle(ctx, 'era', 'A flash over the Negev ends every ambiguity at once. The deterrent is total; so is the bill.');
        }),
      },
      {
        label: 'Seal the basement',
        tooltip: 'The scientists disperse to the universities: +20 governance and +20 influence points, the drain ends, and the desert keeps a cheaper secret. No deterrent.',
        effects: guard('ev_i_dimona_ready:2', (ctx) => {
          ctx.helpers.removeModifier(ctx, 'ISR', 'dimona_program');
          ctx.helpers.adjust(ctx, 'ISR', { gov: 20, infl: 20 });
          ctx.game.flags.dimonaShelved = true;
          ctx.helpers.chronicle(ctx, 'era', 'The works at Dimona are sealed at the last door; the physicists go to the universities and teach, brilliantly, about other things.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_dimona_vanunu',
    title: 'The Technician',
    desc: 'A former technician from the Negev works has talked to the Sunday Times, '
      + 'with photographs. The story runs to sixty column inches and every '
      + 'chancellery reads it twice. Nothing in the doctrine changes — the whole '
      + 'design of ambiguity is that it survives its own photograph — but the '
      + 'sentence "we will not be the first" is now read aloud in a different tone.',
    forTag: 'ISR',
    date: { y: 1986, m: 10 },
    when: (ctx) => !!ctx.game.flags.dimonaOpaque,
    aiOption: 0,
    options: [
      {
        label: 'Say nothing, again',
        tooltip: 'Ambiguity holds — it was built to. Legitimacy −5 for the headlines; the deterrent does not move.',
        effects: guard('ev_i_dimona_vanunu:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: -5 });
          ctx.game.flags.vanunuPublished = true;
          ctx.helpers.chronicle(ctx, 'era', 'The Sunday Times prints the basement. Jerusalem declines to confirm the existence of the newspaper.');
        }),
      },
      {
        label: 'Bring him home',
        tooltip: 'The operation with the yacht and the sedative: −20 influence points, and London\'s regard −10 for the liberty taken on its soil. The trial is closed, the story runs anyway, and the sentence "we will not be the first" survives them both.',
        effects: guard('ev_i_dimona_vanunu:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { infl: -20 });
          if (alive(ctx, 'UK')) setOpinionDelta(ctx.game, 'UK', 'ISR', -10);
          ctx.game.flags.vanunuPublished = true;
          ctx.game.flags.vanunuSeized = true;
          ctx.helpers.chronicle(ctx, 'era', 'The technician is brought home by yacht, tried behind a door, and the basement stays exactly as photographed: implied.');
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
    decider: 'ISR',
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
    decider: 'ISR',
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
    decider: 'ISR',
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
    decider: 'ISR',
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
    decider: 'ISR',
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
    id: 'ev_i_development_towns',
    title: 'Tents, Then Tin, Then Towns',
    desc: 'Seven hundred thousand people arrive in three years to a state of six '
      + 'hundred thousand: the camps of Europe, and then, faster and in greater '
      + 'numbers, whole communities from Baghdad, Sana\'a, Tripoli, Casablanca and '
      + 'Cairo, most with what they could carry. The Jewish Agency puts them where '
      + 'the map is thin — the emptied Arab towns of the south and the corridor, the '
      + 'Negev crossroads, the Galilee hills — in tents, then in tin huts, then in '
      + 'concrete blocks that will still be there in fifty years. The word for it is '
      + 'absorption. Nobody pretends it is gentle, and nobody proposes closing the '
      + 'port.',
    forTag: 'ISR',
    minYear: 1949,
    maxYear: 1961,
    trigger: safeTrigger('ev_i_development_towns', (ctx) =>
      dateGE(ctx, 1950, 1) && alive(ctx, 'ISR') && atPeace(ctx, 'ISR')),
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Send them to the frontier towns',
        tooltip: 'Israel spends 120 funds and takes +1 unrest everywhere for 24 months; +4,000 reserves. Every southern and corridor town Israel holds — Bir Saba, al-Majdal, Isdud, Lydda, al-Faluja, Ayn Shams, Umm Rashrash and the rest — receives an Israeli community of 6,000, which is the half of the pen that integration alone cannot supply (SPEC §95).',
        effects: guard('ev_i_development_towns:0', (ctx) => {
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { treasury: -120, manpower: 4000 });
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'absorption_years', name: 'The Absorption Years', months: 24, effects: { unrestAll: 1 },
          });
          let towns = 0;
          for (const n of ['Beersheba', 'Ascalon', 'Azotus', 'Lydda', 'Kiryat Gat',
            'Beit Shemesh', 'Oboda', 'Eilat', 'Dimona', 'Mitzpe Ramon', 'Arad',
            'Safed', 'Ptolemais', 'Sepphoris', 'Tarichaea', 'Gischala']) {
            if (!ctx.helpers.controls(ctx, 'ISR', n)) continue;
            const p = ctx.prov(n);
            if (!p || p.owner !== 'ISR') continue;
            ctx.helpers.addPopulation(ctx, n, { r: 'judaism', c: 'israeli', n: 6000 });
            towns++;
          }
          ctx.game.flags.developmentTowns = true;
          ctx.helpers.chronicle(ctx, 'era', 'The absorption: the ships unload into tents and the tents become towns'
            + (towns ? ' — ' + towns + ' of them, on the map\'s thin places' : '') + '.');
        }),
      },
      {
        label: 'Keep them on the coast where the work is',
        tooltip: 'Israel: +200 funds and +6,000 reserves, no unrest — the newcomers stay in the coastal cities, which get the labor and the housing crisis. Tel Aviv-Jaffa and Haifa receive 40,000 and 30,000; the frontier towns stay as the war left them, and so do their names.',
        effects: guard('ev_i_development_towns:1', (ctx) => {
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { treasury: 200, manpower: 6000 });
          if (ctx.helpers.controls(ctx, 'ISR', 'Joppa')) ctx.helpers.addPopulation(ctx, 'Joppa', { r: 'judaism', c: 'israeli', n: 40000 });
          if (ctx.helpers.controls(ctx, 'ISR', 'Dora')) ctx.helpers.addPopulation(ctx, 'Dora', { r: 'judaism', c: 'israeli', n: 30000 });
          for (const n of ['Joppa', 'Dora']) {
            if (ctx.helpers.controls(ctx, 'ISR', n)) {
              ctx.helpers.addProvinceModifier(ctx, n, {
                id: 'housing_crisis', name: 'The Housing Crisis', months: 36, effects: { unrest: 1 },
              });
            }
          }
          ctx.helpers.chronicle(ctx, 'era', 'The newcomers stay where the cranes are: the coast doubles, the frontier towns keep their war-time names, and the map stays as it was written.');
        }),
      },
    ],
  },
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
    id: 'ev_i_fedayeen_raids',
    title: 'Across the Armistice Line',
    desc: 'After dark, small fedayeen columns cross from the neighboring armistice '
      + 'zones: guides through the wadis, demolition charges in sacks, and no flag '
      + 'that a regular army will admit is its own. This is neither a conventional '
      + 'invasion nor ordinary provincial unrest. The infiltrators are already '
      + 'inside Israel; the choice is how much of the border to mobilize behind them.',
    forTag: 'ISR',
    minYear: 1951,
    maxYear: 1978,
    once: false,
    cooldownMonths: 30,
    chance: 0.12,
    trigger: safeTrigger('ev_i_fedayeen_raids', (ctx) =>
      alive(ctx, 'ISR') && atPeace(ctx, 'ISR') && !!fedayeenTarget(ctx)),
    aiOption: 0,
    options: [
      {
        label: 'Seal the approaches and run them down',
        tooltip: 'Israel spends 35 talents and 300 manpower. A small Fedayeen Infiltrators rebel army enters an Israeli border province; patrols limit it to one regiment.',
        effects: guard('ev_i_fedayeen_raids:0', (ctx) => {
          const target = spawnFedayeen(ctx, 1);
          if (!target) return;
          ctx.helpers.adjust(ctx, 'ISR', { treasury: -35, manpower: -300, mar: 5 });
          ctx.helpers.chronicle(ctx, 'war', 'Fedayeen cross the armistice line into ' + target + '; patrols close the roads while a gray column is hunted inside Israel.');
        }),
      },
      {
        label: 'Strike the bases across the line',
        tooltip: 'A larger two-regiment Fedayeen Infiltrators rebel army enters Israel. Israel gains 10 martial points but loses 5 legitimacy; Egypt, Jordan, Syria and Lebanon each lose 10 opinion.',
        effects: guard('ev_i_fedayeen_raids:1', (ctx) => {
          const target = spawnFedayeen(ctx, 2);
          if (!target) return;
          ctx.helpers.adjust(ctx, 'ISR', { mar: 10, legitimacy: -5 });
          for (const t of ['EGY', 'JOR', 'SYR', 'LEB']) {
            if (alive(ctx, t)) setOpinionDelta(ctx.game, t, 'ISR', -10);
          }
          ctx.helpers.chronicle(ctx, 'war', 'Fedayeen enter ' + target + ' and the reprisal crosses back over the armistice line; the raid becomes a cycle with two directions.');
        }),
      },
    ],
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

  // ── THE REPUBLICS TURN: THE PARTY TAKES DAMASCUS AND BAGHDAD, 1963–79 ─────
  // The Arab states Israel faced in 1948 were kingdoms, mandate republics and
  // a regency. Within twenty years most of them were something else, and the
  // something else was usually a party with a general at its head. These
  // cards fire on the world's own clock: they run whether or not Israel is
  // fighting anyone, because they were never about Israel.
  {
    id: 'ev_i_ramadan_revolution',
    title: 'The Broadcast from the Ministry of Defence',
    worldLabel: 'The Ba\'ath takes Baghdad; Qasim is shot',
    desc: 'Five years after he shot his way into the palace, the Sole Leader is '
      + 'holding out in the Ministry of Defence with a handful of loyal officers '
      + 'while the tanks of the Ba\'ath and their allies close on the building. He '
      + 'asks for a trial and is given a chair, a wall and a camera; the film is on '
      + 'television that evening so that the country can see the body and stop '
      + 'waiting for him. The party that has taken Baghdad has perhaps a thousand '
      + 'members and every intention of keeping the country.',
    forTag: 'both',
    date: { y: 1963, m: 2 },
    world: true,
    major: true,
    when: safeTrigger('ev_i_ramadan_revolution:when', (ctx) => alive(ctx, 'IRQ')),
    decider: 'IRQ',
    aiOption: 0,
    options: [
      {
        label: 'The party takes the ministries',
        tooltip: 'Iraq: Abd al-Salam Arif takes the presidency, +15 martial points, +1 stability, −10 legitimacy, and the National Guard\'s settling of accounts costs Baghdad and Kirkuk +1 unrest for 24 months. Cairo\'s opinion of Baghdad falls 20 — two revolutions, one Arab leadership, no room.',
        effects: guard('ev_i_ramadan_revolution:0', (ctx) => {
          if (!alive(ctx, 'IRQ')) return;
          ctx.helpers.setRuler(ctx, 'IRQ', {
            name: 'Abd al-Salam Arif', title: 'President', gov: 2, infl: 3, mar: 3, age: 42,
          });
          ctx.helpers.adjust(ctx, 'IRQ', { mar: 15, stability: 1, legitimacy: -10 });
          for (const n of ['Seleucia-Ctesiphon', 'Arbela']) {
            if (ctx.helpers.controls(ctx, 'IRQ', n)) {
              ctx.helpers.addProvinceModifier(ctx, n, {
                id: 'national_guard', name: 'The National Guard\'s Lists', months: 24, effects: { unrest: 1 },
              });
            }
          }
          const e = egyTag(ctx);
          if (e) setOpinionDelta(ctx.game, e, 'IRQ', -20);
          ctx.game.flags.baathBaghdad = true;
          ctx.helpers.chronicle(ctx, 'ruler', 'Baghdad, February 1963: Qasim is shot in the Ministry of Defence and shown on television; the Ba\'ath and the officers divide the ministries between them.');
        }),
      },
      {
        label: 'The garrison holds for the Sole Leader',
        tooltip: 'Iraq: Qasim survives the rising, +10 governance points and +20 legitimacy — but −1 stability and a permanent Suspicious Republic (−7% income, +0.5 unrest): a state that has begun purging its own officer corps and cannot stop.',
        effects: guard('ev_i_ramadan_revolution:1', (ctx) => {
          if (!alive(ctx, 'IRQ')) return;
          ctx.helpers.adjust(ctx, 'IRQ', { gov: 10, legitimacy: 20, stability: -1 });
          ctx.helpers.addTagModifier(ctx, 'IRQ', {
            id: 'suspicious_republic', name: 'The Suspicious Republic', months: -1,
            effects: { incomeMult: 0.93, unrestAll: 0.5 },
          });
          ctx.helpers.chronicle(ctx, 'ruler', 'The Ministry of Defence holds: Qasim survives February, and Baghdad begins the long habit of arresting its own colonels.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_baath_damascus',
    title: 'The Eighth of March',
    worldLabel: 'The Ba\'ath takes Damascus',
    desc: 'A committee of officers most of Syria has never heard of takes the radio '
      + 'station before dawn, and by breakfast the Syrian Arab Republic has a National '
      + 'Council for the Revolutionary Command. The party is small, rural, and largely '
      + 'made of men from the minority districts who found in the army the one ladder '
      + 'the old Damascene families did not own. Its slogan is unity, freedom, '
      + 'socialism; its practice will be the Military Committee, and the Military '
      + 'Committee will be spending the next seven years eating itself.',
    forTag: 'both',
    date: { y: 1963, m: 3 },
    world: true,
    major: true,
    when: safeTrigger('ev_i_baath_damascus:when', (ctx) => !!syrOwn(ctx)),
    decider: (ctx) => syrOwn(ctx) || syrTag(ctx) || 'SYR',
    aiOption: 0,
    options: [
      {
        label: 'Unity, freedom, socialism',
        tooltip: 'Syria becomes the Ba\'athist Syrian Arab Republic under its own banner: +20 martial points, +15 influence points, −15 legitimacy, −1 stability. The land reform and the nationalizations cost 10% of income permanently; the party\'s hold on the army adds 8% manpower.',
        effects: guard('ev_i_baath_damascus:0', (ctx) => {
          const SY = syrOwn(ctx);
          if (!SY) return;
          ctx.helpers.rebrandTag(ctx, SY, { name: 'Syrian Arab Republic', flag: 'SYR_BAATH' });
          ctx.helpers.setRuler(ctx, SY, {
            name: 'Amin al-Hafiz', title: 'President', gov: 2, infl: 2, mar: 3, age: 42,
          });
          ctx.helpers.adjust(ctx, SY, { mar: 20, infl: 15, legitimacy: -15, stability: -1 });
          ctx.helpers.addTagModifier(ctx, SY, {
            id: 'baath_state', name: 'The Party State', months: -1,
            effects: { incomeMult: 0.9, manpowerMult: 1.08 },
          });
          ctx.game.flags.baathDamascus = true;
          ctx.helpers.chronicle(ctx, 'ruler', 'The eighth of March: the Ba\'ath Party takes Damascus, and the Military Committee begins the decade of coups inside the coup.');
        }),
      },
      {
        label: 'The old parties hold the radio station',
        tooltip: 'Syria stays with the notable politicians: +10 governance points, +10 legitimacy, +1 stability — and a permanent Officers Watching Politicians (−5% manpower, +0.5 unrest). The barracks did not go away; they only went back inside.',
        effects: guard('ev_i_baath_damascus:1', (ctx) => {
          const SY = syrOwn(ctx);
          if (!SY) return;
          ctx.helpers.adjust(ctx, SY, { gov: 10, legitimacy: 10, stability: 1 });
          ctx.helpers.addTagModifier(ctx, SY, {
            id: 'officers_watching', name: 'Officers Watching Politicians', months: -1,
            effects: { manpowerMult: 0.95, unrestAll: 0.5 },
          });
          ctx.helpers.chronicle(ctx, 'ruler', 'March passes in Damascus without a new republic; the parties keep the ministries and the officers keep the lists.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_baath_baghdad',
    title: 'The Seventeenth of July',
    worldLabel: 'The Ba\'ath returns to Baghdad for good',
    desc: 'The second time is quieter and permanent. Tanks at the palace at three in '
      + 'the morning, the president on a plane to London by lunch, and a Ba\'athist '
      + 'general in the chair with a thirty-one-year-old party organizer standing '
      + 'behind it who nobody outside Iraq can yet name. Within a fortnight the allies '
      + 'who made the coup possible are retired, exiled or arrested. This regime will '
      + 'outlast every other in the region, and the young man behind the chair will '
      + 'outlast the general.',
    forTag: 'both',
    date: { y: 1968, m: 7 },
    world: true,
    major: true,
    when: safeTrigger('ev_i_baath_baghdad:when', (ctx) => alive(ctx, 'IRQ')),
    decider: 'IRQ',
    aiOption: 0,
    options: [
      {
        label: 'The party takes the state and keeps it',
        tooltip: 'Iraq: al-Bakr president with Saddam Hussein behind the chair, +25 martial points, +1 stability, −10 legitimacy, and a permanent Party and Apparatus (+12% manpower, +5% discipline, +0.5 unrest). The oil is nationalized on this road.',
        effects: guard('ev_i_baath_baghdad:0', (ctx) => {
          if (!alive(ctx, 'IRQ')) return;
          ctx.helpers.rebrandTag(ctx, 'IRQ', { name: 'Iraqi Republic', flag: 'IRQ_BAATH' });
          ctx.helpers.setRuler(ctx, 'IRQ', {
            name: 'Ahmed Hassan al-Bakr', title: 'President', gov: 3, infl: 3, mar: 3, age: 54,
          });
          ctx.helpers.adjust(ctx, 'IRQ', { mar: 25, stability: 1, legitimacy: -10 });
          ctx.helpers.addTagModifier(ctx, 'IRQ', {
            id: 'party_apparatus', name: 'Party and Apparatus', months: -1,
            effects: { manpowerMult: 1.12, disciplineMult: 1.05, unrestAll: 0.5 },
          });
          ctx.game.flags.baathBaghdad = true;
          ctx.game.flags.baathBaghdadHeld = true;
          ctx.helpers.chronicle(ctx, 'ruler', 'The seventeenth of July: the Ba\'ath takes Baghdad a second time, and this time it does not give it back.');
        }),
      },
      {
        label: 'The palace guard is awake',
        tooltip: 'The coup fails: Iraq +15 governance points, +10 legitimacy, −1 stability, and Baghdad +1.5 unrest for 36 months as the arrests run through the officer corps. The party goes underground and waits.',
        effects: guard('ev_i_baath_baghdad:1', (ctx) => {
          if (!alive(ctx, 'IRQ')) return;
          ctx.helpers.adjust(ctx, 'IRQ', { gov: 15, legitimacy: 10, stability: -1 });
          if (ctx.helpers.controls(ctx, 'IRQ', 'Seleucia-Ctesiphon')) {
            ctx.helpers.addProvinceModifier(ctx, 'Seleucia-Ctesiphon', {
              id: 'baghdad_arrests', name: 'The Arrests', months: 36, effects: { unrest: 1.5 },
            });
          }
          ctx.helpers.chronicle(ctx, 'ruler', 'July passes in Baghdad with the palace guard awake; the party goes back underground with a list of who was awake.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_corrective_movement',
    title: 'The Corrective Movement',
    worldLabel: 'Assad takes Damascus',
    desc: 'The Minister of Defence has spent three years refusing his own government\'s '
      + 'orders — refusing to send the air force over Jordan in September, refusing to '
      + 'be blamed for a war his rivals lost him in 1967 — and in November he simply '
      + 'stops pretending. The radicals of the Military Committee are arrested at a '
      + 'party congress; the country is told it has been corrected. Syria will now have '
      + 'one address, one decision-maker, and thirty years of the same signature at the '
      + 'bottom of every page.',
    forTag: 'both',
    date: { y: 1970, m: 11 },
    world: true,
    major: true,
    when: safeTrigger('ev_i_corrective_movement:when', (ctx) => !!syrOwn(ctx)),
    decider: (ctx) => syrOwn(ctx) || syrTag(ctx) || 'SYR',
    aiOption: 0,
    options: [
      {
        label: 'One address in Damascus',
        tooltip: 'Syria: Hafez al-Assad takes the presidency, +2 stability, +20 legitimacy, +25 martial points, and a permanent One Address in Damascus (+10% discipline, +8% income, +5% manpower). The state stops being a coup waiting to happen.',
        effects: guard('ev_i_corrective_movement:0', (ctx) => {
          const SY = syrOwn(ctx);
          if (!SY) return;
          ctx.helpers.setRuler(ctx, SY, {
            name: 'Hafez al-Assad', title: 'President', gov: 4, infl: 4, mar: 4, age: 40,
          });
          // The banner follows the state (SPEC §68): Assad's Syria flies the
          // hawk of the Federation of Arab Republics, not Baghdad's stars.
          ctx.helpers.rebrandTag(ctx, SY, { name: 'Syrian Arab Republic', flag: 'SYR_FAR' });
          ctx.helpers.adjust(ctx, SY, { stability: 2, legitimacy: 20, mar: 25 });
          ctx.helpers.removeModifier(ctx, SY, 'officers_watching');
          ctx.helpers.addTagModifier(ctx, 'SYR', {
            id: 'one_address', name: 'One Address in Damascus', months: -1,
            effects: { disciplineMult: 1.1, incomeMult: 1.08, manpowerMult: 1.05 },
          });
          ctx.game.flags.assadDamascus = true;
          ctx.helpers.chronicle(ctx, 'ruler', 'The Corrective Movement: Hafez al-Assad arrests his own party\'s leadership and gives Syria a single address for the next thirty years.');
        }),
      },
      {
        label: 'The congress arrests the Minister of Defence first',
        tooltip: 'The radicals win: Syria +20 martial points and +1 aggression toward every neighbor (−20 opinion of Israel and Jordan alike) — but −1 stability and a permanent Committee Rule (−8% income, +1 unrest). A state that cannot stop arguing with itself in public.',
        effects: guard('ev_i_corrective_movement:1', (ctx) => {
          const SY = syrOwn(ctx);
          if (!SY) return;
          ctx.helpers.adjust(ctx, SY, { mar: 20, stability: -1 });
          ctx.helpers.addTagModifier(ctx, SY, {
            id: 'committee_rule', name: 'Committee Rule', months: -1,
            effects: { incomeMult: 0.92, unrestAll: 1 },
          });
          for (const t of ['ISR', 'JOR']) {
            if (alive(ctx, t)) setOpinionDelta(ctx.game, SY, t, -20);
          }
          ctx.helpers.chronicle(ctx, 'ruler', 'The party congress arrests its own Minister of Defence; Syria keeps the committee, and the committee keeps quarrelling.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_saddam_ascends',
    title: 'The Names Are Read Aloud',
    worldLabel: 'Saddam Hussein takes the Iraqi presidency',
    desc: 'The president resigns for reasons of health, and eleven years of standing '
      + 'behind the chair end with a man sitting in it. Six days later the Regional '
      + 'Command is assembled in a hall in Baghdad, a confession is read, and the new '
      + 'president smokes a cigar while a secretary reads names from a list. Each man '
      + 'named is walked out. Those left applaud, and are then handed weapons and '
      + 'invited to carry out the sentences themselves, so that everyone in the room '
      + 'is in the film.',
    forTag: 'both',
    date: { y: 1979, m: 7 },
    world: true,
    major: true,
    when: safeTrigger('ev_i_saddam_ascends:when', (ctx) => alive(ctx, 'IRQ')),
    decider: 'IRQ',
    aiOption: 0,
    options: [
      {
        label: 'The hall in Baghdad',
        tooltip: 'Iraq: Saddam Hussein president, +30 martial points, +1 stability, −15 legitimacy, and a permanent The Hall in Baghdad (+15% manpower, +5% discipline, +1 unrest, −10% income). Damascus and Tehran both cool by 30: the party has an enemy in each direction now.',
        effects: guard('ev_i_saddam_ascends:0', (ctx) => {
          if (!alive(ctx, 'IRQ')) return;
          ctx.helpers.setRuler(ctx, 'IRQ', {
            name: 'Saddam Hussein', title: 'President', gov: 3, infl: 4, mar: 5, age: 42,
          });
          ctx.helpers.adjust(ctx, 'IRQ', { mar: 30, stability: 1, legitimacy: -15 });
          ctx.helpers.addTagModifier(ctx, 'IRQ', {
            id: 'the_hall_in_baghdad', name: 'The Hall in Baghdad', months: -1,
            effects: { manpowerMult: 1.15, disciplineMult: 1.05, unrestAll: 1, incomeMult: 0.9 },
          });
          const s = syrTag(ctx);
          for (const t of [s, 'IRN']) {
            if (t && t !== 'IRQ' && alive(ctx, t)) {
              setOpinionDelta(ctx.game, 'IRQ', t, -30);
              setOpinionDelta(ctx.game, t, 'IRQ', -30);
            }
          }
          ctx.game.flags.saddamIraq = true;
          ctx.helpers.chronicle(ctx, 'ruler', 'Saddam Hussein takes the presidency and reads the party\'s own leadership out of the hall; the survivors are handed the pistols.');
        }),
      },
      {
        label: 'The Regional Command keeps its quorum',
        tooltip: 'The collective leadership holds: Iraq +15 governance points, +10 legitimacy, +1 stability, and no purge — but −15 martial points and a permanent Committee in Baghdad (−5% discipline). A slower, less murderous, and considerably less dangerous Iraq.',
        effects: guard('ev_i_saddam_ascends:1', (ctx) => {
          if (!alive(ctx, 'IRQ')) return;
          ctx.helpers.adjust(ctx, 'IRQ', { gov: 15, legitimacy: 10, stability: 1, mar: -15 });
          ctx.helpers.addTagModifier(ctx, 'IRQ', {
            id: 'committee_baghdad', name: 'The Committee in Baghdad', months: -1,
            effects: { disciplineMult: 0.95 },
          });
          ctx.helpers.chronicle(ctx, 'ruler', 'Baghdad keeps its collective leadership; the man behind the chair stays behind it, and the hall is not filmed.');
        }),
      },
    ],
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
          // On the road where the shilumim were refused (SPEC §119) there is
          // no reparations economy for the treasurer to inherit — the boom is
          // the road's own, not the succession's.
          if (!ctx.helpers.getFlag(ctx, 'shilumimRefused')) {
            ctx.helpers.addTagModifier(ctx, 'ISR', {
              id: 'reparations_boom', name: 'The Reparations Economy', months: 36, effects: { incomeMult: 1.05 },
            });
          }
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
    decider: 'ISR',
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
    decider: 'ISR',
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
    decider: 'ISR',
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
    decider: 'ISR',
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
    decider: 'ISR',
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
  // ── THE GENERAL SIGNS SOMETHING: THE SUPPLIER PIVOT OF 1967–68 (SPEC §181)
  // France armed Israel for thirteen years and cut it off in a week. The
  // embargo card fires only in a world where the Paris axis actually stood;
  // the American card is the door out, and it opens at Washington's regard,
  // not by right.
  {
    id: 'ev_i_degaulle_embargo',
    title: 'The General\'s Embargo',
    desc: 'De Gaulle warned against firing the first shot, and the first shot has '
      + 'been fired. The response is not a fleet or a note; it is paperwork. '
      + 'Export licenses die in committee, the Mirage airframes already paid for '
      + 'stay in Bordeaux, and the ministry that built the axis stops returning '
      + 'its calls. Thirteen years of French patterns are now thirteen years of '
      + 'French spare parts, running out.',
    forTag: 'ISR',
    major: true,
    trigger: safeTrigger('ev_i_degaulle_embargo', (ctx) =>
      dateGE(ctx, 1967, 6) && !!ctx.game.flags.sixDayWar && alive(ctx, 'FRA')
      && ctx.helpers.armsSupplier(ctx, 'ISR') === 'FRA'),
    maxYear: 1969,
    aiOption: 0,
    options: [
      {
        label: 'So be it',
        tooltip: 'Take it standing. France closes its markets — the §100 embargo, signed for real — and the pipeline dies of it. Paris\'s regard −40 on top of the signature; the airframes stay in Bordeaux.',
        effects: guard('ev_i_degaulle_embargo:0', (ctx) => {
          ctx.helpers.declareEmbargo(ctx, 'FRA', 'ISR');
          setOpinionDelta(ctx.game, 'FRA', 'ISR', -40);
          ctx.game.flags.degaulleEmbargo = true;
          ctx.helpers.chronicle(ctx, 'diplo', 'France embargoes the state it armed: the general does not march on anybody, he signs something.');
        }),
      },
      {
        label: 'Work the gray channels',
        tooltip: 'Pay the middlemen who still answer: −60 talents. The embargo lands anyway and the pipeline still dies — but crated spares keep the squadrons flying (+5% discipline for 24 months), and Paris is not further offended.',
        effects: guard('ev_i_degaulle_embargo:1', (ctx) => {
          ctx.helpers.declareEmbargo(ctx, 'FRA', 'ISR');
          ctx.helpers.adjust(ctx, 'ISR', { treasury: -60 });
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'gray_spares', name: 'The Gray Channels', months: 24, effects: { disciplineMult: 1.05 },
          });
          ctx.game.flags.degaulleEmbargo = true;
          ctx.helpers.chronicle(ctx, 'diplo', 'France embargoes the state it armed; the state quietly buys its own spare parts back through third flags.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_american_era',
    title: 'The American Era',
    desc: 'The French door is shut and the shelves behind it are emptying. There is '
      + 'exactly one arsenal left whose politics could open: Washington has watched '
      + 'the six days, re-read its Middle East file, and begun using the phrase '
      + '"regional balance" in a tone that means aircraft. The Phantom is not '
      + 'subtle, and neither is the price.',
    forTag: 'ISR',
    trigger: safeTrigger('ev_i_american_era', (ctx) =>
      dateGE(ctx, 1968, 1) && !!ctx.game.flags.degaulleEmbargo && alive(ctx, 'USA')
      && !ctx.helpers.armsSupplier(ctx, 'ISR')
      && (ctx.game.tags.USA.opinion && (ctx.game.tags.USA.opinion.ISR || 0) >= 45)),
    maxYear: 1975,
    aiOption: 0,
    options: [
      {
        label: 'Sign in Washington',
        tooltip: 'The weapons transfer agreement with the United States: −80 talents for the first Phantom contract, their regard rises to at least 55, and the American pipeline opens.',
        effects: guard('ev_i_american_era:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { treasury: -80 });
          setOpinionAtLeast(ctx.game, 'USA', 'ISR', 55);
          ctx.helpers.setArmsDeal(ctx, 'ISR', 'USA');
          ctx.game.flags.americanEra = true;
          ctx.helpers.chronicle(ctx, 'diplo', 'The American era opens: Phantoms, Pattons, and a supplier on the far side of an ocean the map does not cross.');
        }),
      },
      {
        label: 'Not on those terms',
        tooltip: 'Wait. The market stays shut until somebody\'s regard is won the slow way.',
        effects: guard('ev_i_american_era:1', (ctx) => {
          ctx.helpers.chronicle(ctx, 'diplo', 'Jerusalem declines the first Washington terms and goes on cannibalizing Mirages for parts.');
        }),
      },
    ],
  },

  // ── THE FEDAYEEN YEARS: KARAMEH, AMMAN, AND THE ROAD TO BEIRUT, 1968–71 ───
  // Between the Six Days and the October War the most consequential fighting
  // in the region was not between states. An organization that lost its
  // sponsors' war in 1967 spent the next four years becoming a power in its
  // own right — first in the Jordan Valley, then inside the Hashemite state,
  // and finally, when the Legion's guns answered, in Lebanon.
  {
    id: 'ev_i_karameh',
    title: 'The Village of Dignity',
    worldLabel: 'The battle at Karameh',
    desc: 'A brigade group crosses the river at dawn to clear a camp on the far bank '
      + 'and finish an organization the intelligence assessments describe as a '
      + 'nuisance. Instead the fedayeen stand and fight in the village streets, the '
      + 'Jordanian artillery on the ridge above joins in properly, and the column that '
      + 'comes home leaves vehicles behind. Militarily it is a raid that cost more '
      + 'than it should have. Politically it is the founding legend: within months '
      + 'the organization cannot process its volunteers fast enough, and its '
      + 'checkpoints are on Amman\'s streets.',
    forTag: 'both',
    date: { y: 1968, m: 3 },
    world: true,
    major: true,
    when: safeTrigger('ev_i_karameh:when', (ctx) => alive(ctx, 'ISR') && alive(ctx, 'JOR')),
    decider: 'ISR',
    aiOption: 0,
    options: [
      {
        label: 'Cross the river and clear the camp',
        tooltip: 'Israel: +5 martial points, −400 manpower, −5 legitimacy. Jordan: +10 martial points and +5 legitimacy (the Legion\'s guns were on the ridge). The fedayeen become a fact: Amman, Jericho and Gerasa take +1 unrest for 36 months and the organizations are now a power inside the kingdom.',
        effects: guard('ev_i_karameh:0', (ctx) => {
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { mar: 5, manpower: -400, legitimacy: -5 });
          if (alive(ctx, 'JOR')) {
            ctx.helpers.adjust(ctx, 'JOR', { mar: 10, legitimacy: 5 });
            unrestAcross(ctx, 'JOR', ['Philadelphia', 'Jericho', 'Gerasa'], {
              id: 'fedayeen_state', name: 'The State Within the State', months: 36, effects: { unrest: 1 },
            });
          }
          ctx.game.flags.karameh = true;
          ctx.game.flags.fedayeenAscendant = true;
          ctx.helpers.chronicle(ctx, 'war', 'Karameh: the raid clears the camp and loses the argument — the organization that stood its ground cannot count its new volunteers.');
        }),
      },
      {
        label: 'Answer from the air and stay on this bank',
        tooltip: 'Israel: +10 influence points, −5 martial points and no legend made for anyone — the camps are bombed and the border stays a border. Jordan takes +1 unrest in Amman for 24 months anyway; the organizations grow, only slower.',
        effects: guard('ev_i_karameh:1', (ctx) => {
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { infl: 10, mar: -5 });
          if (alive(ctx, 'JOR') && ctx.helpers.controls(ctx, 'JOR', 'Philadelphia')) {
            ctx.helpers.addProvinceModifier(ctx, 'Philadelphia', {
              id: 'fedayeen_state', name: 'The State Within the State', months: 24, effects: { unrest: 1 },
            });
          }
          ctx.helpers.chronicle(ctx, 'war', 'The camps at Karameh are bombed and the brigades stay on their own bank; the legend is not made, and the volunteers still come.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_cairo_agreement',
    title: 'The Agreement Nobody Publishes',
    worldLabel: 'The Cairo Agreement: the PLO gets the Lebanese south',
    desc: 'The Lebanese army has been shelling the camps and losing patience; the '
      + 'organizations have been shelling back and gaining recruits; Nasser convenes '
      + 'both in Cairo and produces a document the Lebanese parliament will ratify '
      + 'without reading it aloud. The camps govern themselves. The organizations may '
      + 'run their own operations from the south. A state of four communities, none of '
      + 'them a majority, has just licensed an armed foreign movement inside its own '
      + 'borders — and everyone signing knows exactly what that means.',
    forTag: 'both',
    date: { y: 1969, m: 11 },
    world: true,
    major: true,
    when: safeTrigger('ev_i_cairo_agreement:when', (ctx) => alive(ctx, 'LEB')),
    decider: 'LEB',
    aiOption: 0,
    options: [
      {
        label: 'Sign it — the alternative is an army that will not fight',
        tooltip: 'Lebanon: +10 influence points (the Arab capitals approve), −1 stability, and Tyre, Sidon and Beirut take +1.5 unrest for 72 months. The south becomes the organizations\' ground: the Lebanese arc is now armed.',
        effects: guard('ev_i_cairo_agreement:0', (ctx) => {
          if (!alive(ctx, 'LEB')) return;
          ctx.helpers.adjust(ctx, 'LEB', { infl: 10, stability: -1 });
          unrestAcross(ctx, 'LEB', ['Tyre', 'Sidon', 'Berytus'], {
            id: 'cairo_agreement', name: 'The Cairo Agreement', months: 72, effects: { unrest: 1.5 },
          });
          ctx.game.flags.cairoAgreement = true;
          ctx.helpers.chronicle(ctx, 'diplomacy', 'The Cairo Agreement: Lebanon licenses the organizations in its own south, and the parliament ratifies a text it is not shown.');
        }),
      },
      {
        label: 'Refuse — the army closes the camps',
        tooltip: 'Lebanon: +15 martial points and +1 stability now, but −20 opinion from every Arab capital and a permanent Confessional Strain (−8% income, +1 unrest): the Muslim half of the country will not forgive an army that fought Palestinians instead of Israelis.',
        effects: guard('ev_i_cairo_agreement:1', (ctx) => {
          if (!alive(ctx, 'LEB')) return;
          ctx.helpers.adjust(ctx, 'LEB', { mar: 15, stability: 1 });
          ctx.helpers.addTagModifier(ctx, 'LEB', {
            id: 'confessional_strain', name: 'Confessional Strain', months: -1,
            effects: { incomeMult: 0.92, unrestAll: 1 },
          });
          const e = egyTag(ctx), sy = syrTag(ctx);
          for (const t of [e, sy, 'JOR', 'IRQ', 'SAU']) {
            if (t && alive(ctx, t)) setOpinionDelta(ctx.game, t, 'LEB', -20);
          }
          ctx.helpers.chronicle(ctx, 'diplomacy', 'Beirut refuses the Cairo text and sends the army into the camps; the Arab capitals answer, and so does half of Lebanon.');
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
            // Not a modifier — a war. The organizations held quarters of the
            // capital and the northern towns, and the Legion had to take them
            // back street by street (SPEC §97).
            const held = spawnRebels(ctx, ploBases(ctx, 'JOR', ['Philadelphia', 'Gerasa', 'Pella', 'Jericho']), {
              inf: 6, cav: 0, gen: 5, name: 'The Fedayeen of Amman',
              general: { name: 'Field Command', fire: 2, shock: 3, maneuver: 2 },
            });
            if (held) {
              ctx.game.flags.jordanCivilWar = true;
              ctx.helpers.addProvinceModifier(ctx, held, {
                id: 'amman_fighting', name: 'The Fighting in the Streets', months: 18, effects: { unrest: 2 },
              });
            }
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

  {
    id: 'ev_i_ajloun',
    title: 'The Last Woods',
    worldLabel: 'The fedayeen are driven out of Jordan',
    desc: 'What began in September ends in July, in the wooded hills above the Jordan '
      + 'Valley where the last two thousand fighters have dug in. The Legion takes the '
      + 'woods in four days. A column of survivors walks west and surrenders to the '
      + 'Israeli army at the river rather than go back — the single most eloquent '
      + 'sentence anyone writes about the year. The rest go north, to the one country '
      + 'whose government signed away the right to stop them.',
    forTag: 'both',
    date: { y: 1971, m: 7 },
    world: true,
    major: true,
    when: safeTrigger('ev_i_ajloun:when', (ctx) => alive(ctx, 'JOR') && !!ctx.game.flags.jordanCivilWar),
    decider: 'JOR',
    aiOption: 0,
    options: [
      {
        label: 'Clear the woods',
        tooltip: 'Jordan: +20 martial points, +15 legitimacy, +1 stability; the fedayeen host in the kingdom is destroyed and the unrest lifts. Every Arab capital cools 25 toward Amman — and Lebanon inherits the organizations (Tyre, Sidon and Beirut +2 unrest for 96 months).',
        effects: guard('ev_i_ajloun:0', (ctx) => {
          const g = ctx.game;
          if (!alive(ctx, 'JOR')) return;
          ctx.helpers.adjust(ctx, 'JOR', { mar: 20, legitimacy: 15, stability: 1 });
          for (const a of ctx.helpers.armiesOf(ctx, 'REB')) {
            if (a && /Fedayeen/.test(a.name || '')) ctx.helpers.removeArmy(ctx, a.id);
          }
          ctx.helpers.removeModifier(ctx, 'JOR', 'black_september');
          for (const n of ['Philadelphia', 'Gerasa', 'Pella', 'Jericho']) {
            ctx.helpers.removeModifier(ctx, n, 'amman_fighting');
            ctx.helpers.removeModifier(ctx, n, 'fedayeen_state');
          }
          const e = egyTag(ctx), sy = syrTag(ctx);
          for (const t of [e, sy, 'IRQ', 'LEB']) {
            if (t && alive(ctx, t)) setOpinionDelta(g, t, 'JOR', -25);
          }
          if (alive(ctx, 'LEB')) {
            unrestAcross(ctx, 'LEB', ['Tyre', 'Sidon', 'Berytus'], {
              id: 'organizations_in_lebanon', name: 'The Organizations Move North', months: 96, effects: { unrest: 2 },
            });
          }
          g.flags.ploInLebanon = true;
          g.flags.jordanCivilWar = false;
          ctx.helpers.chronicle(ctx, 'war', 'Ajloun: the Legion clears the last woods, and a column of fighters walks west to surrender to the Israelis rather than to the King. The organizations go to Lebanon.');
        }),
      },
      {
        label: 'Stop at the edge of the woods — a kingdom shared',
        tooltip: 'Jordan: −10 legitimacy, −1 stability, and the fedayeen host stays in the kingdom with Amman at +1.5 unrest for 60 months. The Arab capitals warm 15 toward Amman. Lebanon is spared what Jordan keeps.',
        effects: guard('ev_i_ajloun:1', (ctx) => {
          const g = ctx.game;
          if (!alive(ctx, 'JOR')) return;
          ctx.helpers.adjust(ctx, 'JOR', { legitimacy: -10, stability: -1 });
          if (ctx.helpers.controls(ctx, 'JOR', 'Philadelphia')) {
            ctx.helpers.addProvinceModifier(ctx, 'Philadelphia', {
              id: 'kingdom_shared', name: 'A Kingdom Shared', months: 60, effects: { unrest: 1.5 },
            });
          }
          const e = egyTag(ctx), sy = syrTag(ctx);
          for (const t of [e, sy, 'IRQ']) {
            if (t && alive(ctx, t)) setOpinionDelta(g, t, 'JOR', 15);
          }
          g.flags.fedayeenStayInJordan = true;
          ctx.helpers.chronicle(ctx, 'war', 'The Legion halts at the edge of the woods; the organizations keep their hills, their checkpoints, and their veto over the kingdom.');
        }),
      },
    ],
  },

  // ── LOD, MUNICH AND THE YOM KIPPUR WAR, 1972–74 ───────────────────────────
  {
    id: 'ev_i_lod_airport',
    title: 'The Arrivals Hall',
    worldLabel: 'The Lod airport massacre',
    desc: 'The 30 May flight from Rome lands a little before midnight, and three '
      + 'young men in the baggage crowd open their violin cases. They are Japanese, '
      + 'of an army nobody in the hall has heard of, recruited by the Popular Front '
      + 'for exactly that reason: no list would have caught them, no profile fits '
      + 'them. Grenades and rifle fire in a closed hall; twenty-six dead, and the '
      + 'count is its own commentary — seventeen of them Puerto Rican pilgrims come '
      + 'to walk where their scriptures happened, and among the others Aharon '
      + 'Katzir, one of the country\'s great scientists, whose brother will be '
      + 'President within the year. One gunman survives his own grenade. The state '
      + 'that promised the ingathering must now answer for the room the ingathering '
      + 'arrives in.',
    forTag: 'ISR',
    date: { y: 1972, m: 5 },
    world: true,
    aiOption: 0,
    when: safeTrigger('ev_i_lod_airport:when', (ctx) => alive(ctx, 'ISR')),
    historical: 'Three Japanese Red Army gunmen recruited by the PFLP-EO killed 26 '
      + 'people and wounded some 80 at Lod on 30 May 1972; Kozo Okamoto survived, '
      + 'was sentenced to life, and went free in the 1985 exchange. Air-passenger '
      + 'screening as the world now knows it descends largely from the overhaul '
      + 'that followed.',
    options: [
      {
        label: 'Harden every gate the state owns',
        tooltip: 'Israel: −60 talents, and Lydda carries "The Hardened Gates" '
          + 'permanently (−1 unrest): the airline becomes the hardest target in the '
          + 'sky, and every airport on earth eventually learns the drill.',
        effects: guard('ev_i_lod_airport:0', (ctx) => {
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { treasury: -60 });
          ctx.helpers.addProvinceModifier(ctx, 'Lydda', {
            id: 'the_hardened_gates', name: 'The Hardened Gates', months: -1,
            effects: { unrest: -1 },
          });
          ctx.game.flags.airportDoctrine = true;
          ctx.helpers.chronicle(ctx, 'era', 'Twenty-six dead in the arrivals hall at Lod; the answer is a security doctrine the whole world\'s airports will eventually copy.');
        }),
      },
      {
        label: 'The senders, not the sent',
        tooltip: 'Israel: +10 martial points and the answer goes to the senders\' '
          + 'camps (Tyre and Sidon +1 unrest for 12 months) — and −5 legitimacy '
          + 'where the answer lands wrong.',
        effects: guard('ev_i_lod_airport:1', (ctx) => {
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { mar: 10, legitimacy: -5 });
          if (alive(ctx, 'LEB')) {
            unrestAcross(ctx, 'LEB', ['Tyre', 'Sidon'], {
              id: 'the_answer_north', name: 'The Answer in the North', months: 12,
              effects: { unrest: 1 },
            });
          }
          ctx.helpers.chronicle(ctx, 'era', 'Twenty-six dead in the arrivals hall at Lod; the answer falls on the camps that sent the senders.');
        }),
      },
    ],
  },
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
      + 'tanks stand against a flood of them, and Jordan\'s 40th Armoured Brigade '
      + 'will follow onto the Syrian front. There is still a last morning\'s room '
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
        tooltip: 'Egypt, Syria and Jordan enter the war: Egypt crosses at +10% morale ("The Crossing"), Syria floods the Golan, and Jordan sends the 40th Armoured Brigade. Israel takes −1 stability but +10 legitimacy, and the American airlift follows (+15% reinforcement, 12 months).',
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
    decider: 'ISR',
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
        tooltip: 'Israel: +10 war score on every live Egyptian, Syrian and Jordanian front, but −2,000 manpower and +1.5 war exhaustion. Egypt: the Third Army encircled (−15% morale for 6 months).',
        effects: guard('ev_i_deversoir:0', (ctx) => {
          const e = egyTag(ctx);
          if (e && findWar(ctx.game, 'ISR', e)) {
            warEventScore(ctx, 'ISR', e, 'ISR', 10);
            ctx.helpers.addTagModifier(ctx, e, {
              id: 'third_army_cut', name: 'The Third Army Encircled', months: 6, effects: { moraleMult: 0.85 },
            });
          }
          for (const t of octoberCombatants(ctx)) {
            if (t !== e && findWar(ctx.game, 'ISR', t)) warEventScore(ctx, 'ISR', t, 'ISR', 10);
          }
          ctx.helpers.adjust(ctx, 'ISR', { manpower: -2000, warExhaustion: 1.5 });
          ctx.helpers.chronicle(ctx, 'war', 'The Valley of Tears holds and Sharon crosses at Deversoir: the war that opened with the sirens closes at kilometer 101.');
        }),
      },
      {
        label: 'Consolidate on the ridgelines',
        tooltip: 'Israel: +4 war score per front, −800 manpower, +1 war exhaustion — the lines are restored and no more than restored; the counterstroke is left unwritten.',
        effects: guard('ev_i_deversoir:1', (ctx) => {
          for (const t of octoberCombatants(ctx)) {
            if (findWar(ctx.game, 'ISR', t)) warEventScore(ctx, 'ISR', t, 'ISR', 4);
          }
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
    decider: 'ISR',
    major: true,
    trigger: safeTrigger('ev_i_agranat', (ctx) =>
      dateGE(ctx, 1974, 2) && !!ctx.game.flags.yomKippurWar && alive(ctx, 'ISR')),
    aiOption: 0,
    options: [
      {
        label: 'The commission spares no one who matters',
        tooltip: 'The wars end by disengagement (occupations revert on both fronts, −2 war exhaustion each). Golda and Dayan fall: Yitzhak Rabin — the first sabra Prime Minister — takes office. Israel: −1 stability now, +10 legitimacy kept.',
        effects: guard('ev_i_agranat:0', (ctx) => {
          for (const t of octoberCombatants(ctx)) {
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
          for (const t of octoberCombatants(ctx)) {
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
        tooltip: 'Israel returns every Sinai province it holds and evacuates its Israeli Jewish settler communities; the inherited rivalry and bilateral land grudges end, the two states recognize one another (neither may declare war on the other while the recognition holds), relations rise to at least +80, and both gain a permanent peace restraint (no opportunistic wars). Both lose 2 war exhaustion; Egypt gains 15 and Israel 10 legitimacy. The Arab League expels Egypt (−60 opinion from every Arab capital).',
        effects: guard('ev_i_treaty:0', (ctx) => {
          const g = ctx.game;
          const e = egyTag(ctx);
          if (!alive(ctx, 'ISR') || !e || !g.flags.campDavid || findWar(g, 'ISR', e)) {
            ctx.helpers.chronicle(ctx, 'diplomacy', 'March 1979 passes without a lawn, a table, or a treaty; the first peace waits for another history.');
            return;
          }
          let evacuated = 0;
          for (const n of SINAI_CELLS) {
            const p = ctx.prov(n);
            if (p && (p.owner === 'ISR' || p.controller === 'ISR')) {
              evacuated += withdrawIsraeliSettlers(ctx, n, e);
            }
          }
          for (const t of ['ISR', e]) {
            ctx.helpers.adjust(ctx, t, { warExhaustion: -2 });
            ctx.helpers.addTagModifier(ctx, t, {
              id: 'treaty_of_washington', name: 'The Treaty of Washington', months: -1,
              effects: { noOpportunisticWars: true },
            });
          }
          ctx.helpers.adjust(ctx, e, { legitimacy: 15 });
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: 10 });
          ctx.helpers.reconcileRivalry(ctx, 'ISR', e);
          // The thing that was actually signed (SPEC §96): recognition, not a
          // pact. Neither army is pledged to the other; neither may take up
          // arms against the other while the papers hold.
          if (typeof ctx.helpers.recognize === 'function') ctx.helpers.recognize(ctx, 'ISR', e);
          setOpinionAtLeast(g, e, 'ISR', 80);
          setOpinionAtLeast(g, 'ISR', e, 80);
          const s = syrTag(ctx);
          for (const t of ['SAU', 'IRQ', 'JOR', 'LEB', s]) {
            if (t && t !== e && alive(ctx, t)) setOpinionDelta(g, t, e, -60);
          }
          ctx.helpers.chronicle(ctx, 'peace', 'The Egypt–Israel treaty is signed on the White House lawn: Sinai for peace, the first recognition. Israeli civilians leave with the army'
            + (evacuated ? ' (' + evacuated.toLocaleString('en-US') + ' settlers evacuated in the map\'s province model)' : '')
            + '. The League expels Egypt; Sadat has three years to live.');
        }),
      },
      {
        label: 'Peace — but the Sinai in stages, and slowly',
        tooltip: 'Only western Sinai returns now, with Israeli settler communities evacuated from the returned provinces; the peace holds at 10 years, opinions +40, Egypt −10 legitimacy (half a treaty buys half a triumph). No expulsion from the League — and less of a peace.',
        effects: guard('ev_i_treaty:1', (ctx) => {
          const g = ctx.game;
          const e = egyTag(ctx);
          if (!alive(ctx, 'ISR') || !e || !g.flags.campDavid || findWar(g, 'ISR', e)) {
            ctx.helpers.chronicle(ctx, 'diplomacy', 'March 1979 passes without a lawn, a table, or a treaty; the first peace waits for another history.');
            return;
          }
          for (const n of ['Pelusium', 'Arsinoe']) {
            const p = ctx.prov(n);
            if (p && (p.owner === 'ISR' || p.controller === 'ISR')) {
              withdrawIsraeliSettlers(ctx, n, e);
            }
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
  {
    id: 'ev_i_begin_resigns',
    title: 'I Cannot Go On Any Longer',
    worldLabel: 'Begin resigns',
    desc: 'After the Lebanon war, the death of Aliza Begin and months of mounting '
      + 'withdrawal, Menachem Begin tells his cabinet that he can no longer continue. '
      + 'The resignation is spare and final. Likud chooses the foreign minister, '
      + 'Yitzhak Shamir, to form the next government.',
    forTag: 'both',
    decider: 'ISR',
    date: { y: 1983, m: 10 },
    world: true,
    major: true,
    aiOption: 0,
    trigger: safeTrigger('ev_i_begin_resigns', (ctx) => alive(ctx, 'ISR')),
    options: [
      {
        label: 'Shamir forms the government',
        tooltip: 'Yitzhak Shamir becomes Prime Minister; +5 public mandate and the modern succession record continues.',
        effects: guard('ev_i_begin_resigns:0', (ctx) => {
          ctx.helpers.setRuler(ctx, 'ISR', {
            name: 'Yitzhak Shamir', title: 'Prime Minister',
            gov: 3, infl: 4, mar: 3, age: ageAt(ctx, 1915, 10),
          });
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: 5 });
          ctx.game.flags.shamirGovernment = true;
          ctx.helpers.chronicle(ctx, 'ruler', 'Menachem Begin resigns; Yitzhak Shamir forms Israel’s twentieth government.');
        }),
      },
      {
        label: 'Ask Begin to remain through the crisis',
        tooltip: 'Begin stays: +10 coalition approval, but −5 public mandate and the later rotation government will not be automatic.',
        effects: guard('ev_i_begin_resigns:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: -5 });
          ctx.helpers.factionShift(ctx, 'ISR', 'coalition', 10);
          ctx.game.flags.beginStayed = true;
          ctx.helpers.chronicle(ctx, 'ruler', 'The cabinet persuades Menachem Begin to remain through the crisis; the expected succession does not come.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_national_unity',
    title: 'The Rotation Government',
    worldLabel: 'Israel’s national unity government',
    desc: 'The election leaves neither alignment able to govern alone. Labor and Likud '
      + 'write an unprecedented rotation into the coalition agreement: Shimon Peres '
      + 'will serve first, Yitzhak Shamir second, with the premiership changing hands '
      + 'at midterm rather than at the ballot box.',
    forTag: 'both',
    decider: 'ISR',
    date: { y: 1984, m: 9 },
    world: true,
    major: true,
    aiOption: 0,
    trigger: safeTrigger('ev_i_national_unity', (ctx) => alive(ctx, 'ISR')),
    options: [
      {
        label: 'Sign the rotation agreement',
        tooltip: 'Shimon Peres becomes Prime Minister; +1 stability and +10 public mandate. The premiership rotates to Shamir in October 1986.',
        effects: guard('ev_i_national_unity:0', (ctx) => {
          ctx.helpers.setRuler(ctx, 'ISR', {
            name: 'Shimon Peres', title: 'Prime Minister',
            gov: 4, infl: 5, mar: 2, age: ageAt(ctx, 1923, 8),
          });
          ctx.helpers.adjust(ctx, 'ISR', { stability: 1, legitimacy: 10 });
          ctx.game.flags.unityRotation = true;
          ctx.helpers.chronicle(ctx, 'ruler', 'The national unity government takes office under Shimon Peres, with a written rotation to Yitzhak Shamir.');
        }),
      },
      {
        label: 'Force a narrow government',
        tooltip: 'No rotation: −1 stability, +10 Revisionist approval. The current Prime Minister remains.',
        effects: guard('ev_i_national_unity:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { stability: -1 });
          ctx.helpers.factionShift(ctx, 'ISR', 'revisionists', 10);
          ctx.game.flags.unityRotation = false;
          ctx.helpers.chronicle(ctx, 'ruler', 'The rotation agreement fails; a narrow government survives a divided Knesset.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_rotation_completed',
    title: 'The Rotation Is Honored',
    worldLabel: 'Shamir returns as Prime Minister',
    desc: 'The date written into the unity agreement arrives. Against the expectations '
      + 'of nearly everyone who thought the arrangement would collapse first, Shimon '
      + 'Peres resigns and Yitzhak Shamir returns to the premiership.',
    forTag: 'both',
    decider: 'ISR',
    date: { y: 1986, m: 10 },
    world: true,
    major: true,
    aiOption: 0,
    trigger: safeTrigger('ev_i_rotation_completed', (ctx) =>
      alive(ctx, 'ISR') && !!ctx.game.flags.unityRotation),
    options: [
      {
        label: 'Honor the agreement',
        tooltip: 'Yitzhak Shamir becomes Prime Minister; +10 public mandate.',
        effects: guard('ev_i_rotation_completed:0', (ctx) => {
          ctx.helpers.setRuler(ctx, 'ISR', {
            name: 'Yitzhak Shamir', title: 'Prime Minister',
            gov: 3, infl: 4, mar: 3, age: ageAt(ctx, 1915, 10),
          });
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: 10 });
          ctx.helpers.chronicle(ctx, 'ruler', 'The rotation is honored: Yitzhak Shamir returns as Prime Minister in October 1986.');
        }),
      },
      {
        label: 'Keep Peres in office',
        tooltip: 'Break the rotation: −1 stability and −15 Revisionist approval; Shimon Peres remains Prime Minister.',
        effects: guard('ev_i_rotation_completed:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ISR', { stability: -1 });
          ctx.helpers.factionShift(ctx, 'ISR', 'revisionists', -15);
          ctx.helpers.chronicle(ctx, 'ruler', 'The rotation agreement breaks at the transfer date; Shimon Peres remains in office.');
        }),
      },
    ],
  },

  // ── THE LEBANESE WAR, 1975–85 ─────────────────────────────────────────────
  // A country of four communities and no majority, holding an armed foreign
  // movement it licensed itself, between two states that both intend to
  // decide its future. The war that follows outlasts every other conflict in
  // this campaign and is the only one none of its participants win.
  {
    id: 'ev_i_lebanon_civil_war',
    title: 'The Bus at Ain al-Rummaneh',
    worldLabel: 'The Lebanese civil war begins',
    desc: 'A church dedication, gunmen in a car, four dead including a party leader\'s '
      + 'bodyguard; two hours later a bus carrying Palestinians through a Christian '
      + 'suburb of Beirut is stopped and shot to pieces. Twenty-seven dead. Everyone '
      + 'has been arming for two years and everyone has a reason ready. The green line '
      + 'is drawn across the capital within weeks — hotels as strongpoints, a museum '
      + 'crossing, snipers with a view of both — and the Lebanese army, asked to choose '
      + 'a side, dissolves into its communities instead.',
    forTag: 'both',
    date: { y: 1975, m: 4 },
    world: true,
    major: true,
    when: safeTrigger('ev_i_lebanon_civil_war:when', (ctx) => alive(ctx, 'LEB')),
    decider: 'LEB',
    aiOption: 0,
    options: [
      {
        label: 'The state cannot stop it',
        tooltip: 'Lebanon: −3 stability, −25 legitimacy, −40% income, −30% manpower and +1 unrest everywhere, permanently (the army dissolves into militias); a militia host takes the field in Beirut, and Beirut, Sidon, Tyre, Tripoli and the Beqaa carry +2.5 unrest on top of it. The war has begun.',
        effects: guard('ev_i_lebanon_civil_war:0', (ctx) => {
          const g = ctx.game;
          if (!alive(ctx, 'LEB')) return;
          ctx.helpers.adjust(ctx, 'LEB', { stability: -3, legitimacy: -25 });
          ctx.helpers.addTagModifier(ctx, 'LEB', {
            id: 'civil_war_lebanon', name: 'The Civil War', months: -1,
            effects: { incomeMult: 0.6, manpowerMult: 0.7, unrestAll: 1 },
          });
          unrestAcross(ctx, 'LEB', ['Berytus', 'Sidon', 'Tyre', 'Tripolis', 'Chalcis'], {
            id: 'the_green_line', name: 'The Green Line', months: -1, effects: { unrest: 2.5 },
          });
          const held = spawnRebels(ctx, ploBases(ctx, 'LEB', ['Berytus', 'Sidon', 'Tyre']), {
            inf: 5, cav: 0, gen: 4, name: 'The Militias of Beirut',
            general: { name: 'Militia Command', fire: 2, shock: 2, maneuver: 2 },
          });
          g.flags.lebanonCivilWar = true;
          if (held) g.flags.lebanonMilitiaHome = held;
          ctx.helpers.chronicle(ctx, 'war', 'The bus at Ain al-Rummaneh: Lebanon\'s war begins, the green line is drawn through Beirut, and the army dissolves into the communities it was made of.');
        }),
      },
      {
        label: 'The army holds the capital, whatever it costs',
        tooltip: 'Lebanon: −2 stability, −15 legitimacy, −25% income; the army holds and no militia host takes the field, but Beirut and Sidon carry +2 unrest for 120 months and the Muslim half of the country will not accept the result. A slower fire.',
        effects: guard('ev_i_lebanon_civil_war:1', (ctx) => {
          const g = ctx.game;
          if (!alive(ctx, 'LEB')) return;
          ctx.helpers.adjust(ctx, 'LEB', { stability: -2, legitimacy: -15, mar: 15 });
          ctx.helpers.addTagModifier(ctx, 'LEB', {
            id: 'civil_war_lebanon', name: 'The Army Holds the Capital', months: -1,
            effects: { incomeMult: 0.75, unrestAll: 1 },
          });
          unrestAcross(ctx, 'LEB', ['Berytus', 'Sidon'], {
            id: 'the_green_line', name: 'The Green Line', months: 120, effects: { unrest: 2 },
          });
          g.flags.lebanonCivilWar = true;
          g.flags.lebanonArmyHeld = true;
          ctx.helpers.chronicle(ctx, 'war', 'Beirut\'s army holds its capital street by street; the country stays a state on paper and a front everywhere else.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_syrian_intervention',
    title: 'The Deterrent Force',
    worldLabel: 'Syria enters Lebanon',
    desc: 'The remarkable thing about the Syrian intervention is which side it comes '
      + 'in on: Damascus, patron of the Palestinian cause, sends its armor into '
      + 'Lebanon to stop the Palestinians and their allies from winning. A Lebanon '
      + 'remade by the left and the organizations would be a Lebanon that drags Syria '
      + 'into a war with Israel on someone else\'s timetable. Six months later the '
      + 'Arab League blesses the occupation retroactively and calls it the Arab '
      + 'Deterrent Force. It will stay twenty-nine years.',
    forTag: 'both',
    date: { y: 1976, m: 6 },
    world: true,
    major: true,
    when: safeTrigger('ev_i_syrian_intervention:when', (ctx) =>
      !!ctx.game.flags.lebanonCivilWar && !!syrTag(ctx) && alive(ctx, 'LEB')),
    decider: (ctx) => syrOwn(ctx) || syrTag(ctx) || 'SYR',
    aiOption: 0,
    options: [
      {
        label: 'Send the armor into the Beqaa',
        tooltip: 'Syria occupies the Beqaa and Tripoli (they change hands on the map), spends 20 martial points and takes a permanent Army of Occupation (−10% income, +0.5 unrest). Lebanon −10 legitimacy; the militia host, if any, is broken. Israel\'s opinion of Syria falls 30 — the red lines over Lebanon are now drawn in pencil.',
        effects: guard('ev_i_syrian_intervention:0', (ctx) => {
          const g = ctx.game;
          const sy = syrTag(ctx);
          if (!sy || !alive(ctx, 'LEB')) return;
          for (const n of ['Chalcis', 'Tripolis']) {
            if (ctx.helpers.controls(ctx, 'LEB', n)) ctx.helpers.changeOwner(ctx, n, sy);
          }
          ctx.helpers.adjust(ctx, sy, { mar: -20 });
          ctx.helpers.addTagModifier(ctx, sy, {
            id: 'army_of_occupation', name: 'The Army of Occupation', months: -1,
            effects: { incomeMult: 0.9, unrestAll: 0.5 },
          });
          ctx.helpers.adjust(ctx, 'LEB', { legitimacy: -10 });
          for (const a of ctx.helpers.armiesOf(ctx, 'REB')) {
            if (a && /Militias of Beirut/.test(a.name || '')) ctx.helpers.removeArmy(ctx, a.id);
          }
          if (alive(ctx, 'ISR')) setOpinionDelta(g, 'ISR', sy, -30);
          g.flags.syrianDeterrentForce = true;
          ctx.helpers.chronicle(ctx, 'war', 'Syrian armor crosses into Lebanon against the side Damascus is supposed to be arming; six months later the League calls it the Arab Deterrent Force.');
        }),
      },
      {
        label: 'Let Lebanon burn on its own timetable',
        tooltip: 'Syria keeps its army home: +15 influence points and no occupation costs. Lebanon\'s war runs unchecked — Beirut, Sidon and Tyre take another +1.5 unrest for 120 months, and the organizations in the south grow into the state\'s replacement.',
        effects: guard('ev_i_syrian_intervention:1', (ctx) => {
          const g = ctx.game;
          const sy = syrTag(ctx);
          if (sy) ctx.helpers.adjust(ctx, sy, { infl: 15 });
          if (alive(ctx, 'LEB')) {
            unrestAcross(ctx, 'LEB', ['Berytus', 'Sidon', 'Tyre'], {
              id: 'unchecked_war', name: 'The War Runs Unchecked', months: 120, effects: { unrest: 1.5 },
            });
          }
          g.flags.ploStateInSouth = true;
          ctx.helpers.chronicle(ctx, 'war', 'Damascus stays home and Lebanon burns to its own timetable; in the south the organizations stop pretending they are guests.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_litani',
    title: 'Eleven Days to the River',
    worldLabel: 'Operation Litani',
    desc: 'A seaborne squad lands north of Tel Aviv, takes a bus on the coastal road, '
      + 'and by the end of the afternoon thirty-eight civilians are dead. The answer '
      + 'is twenty-five thousand men across the border and eleven days of clearing '
      + 'ground up to the Litani. Then the Security Council votes, the force withdraws, '
      + 'and the strip along the border is handed not to the Lebanese state but to a '
      + 'renegade Lebanese major with a militia and a radio station. The arrangement is '
      + 'meant to be temporary.',
    forTag: 'both',
    date: { y: 1978, m: 3 },
    world: true,
    major: true,
    when: safeTrigger('ev_i_litani:when', (ctx) => alive(ctx, 'ISR') && alive(ctx, 'LEB')),
    decider: 'ISR',
    aiOption: 0,
    options: [
      {
        label: 'Clear the ground to the river',
        tooltip: 'Israel: −25 martial points, −600 manpower, −10 legitimacy; the fedayeen host in the south is broken and the border strip becomes the Security Belt — Tyre and Sidon carry it for 96 months (+1 unrest for Lebanon, and Israel\'s northern towns are quiet: Kiryat Shmona and Nahariya −1 unrest for 96 months).',
        effects: guard('ev_i_litani:0', (ctx) => {
          const g = ctx.game;
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { mar: -25, manpower: -600, legitimacy: -10 });
          for (const a of ctx.helpers.armiesOf(ctx, 'REB')) {
            const p = a && ctx.byId(a.prov);
            if (p && ['Tyre', 'Sidon'].indexOf(p.canon) >= 0) ctx.helpers.removeArmy(ctx, a.id);
          }
          unrestAcross(ctx, 'LEB', ['Tyre', 'Sidon'], {
            id: 'security_belt', name: 'The Security Belt', months: 96, effects: { unrest: 1 },
          });
          unrestAcross(ctx, 'ISR', ['Kiryat Shmona', 'Nahariya'], {
            id: 'the_quiet_north', name: 'The Quiet North', months: 96, effects: { unrest: -1 },
          });
          g.flags.securityBelt = true;
          ctx.helpers.chronicle(ctx, 'war', 'Operation Litani: eleven days to the river, then a withdrawal that leaves the border strip to a major with a militia and a radio station.');
        }),
      },
      {
        label: 'Answer from the air and keep the border a border',
        tooltip: 'Israel: +10 influence points, +5 legitimacy, no ground operation — but the northern towns pay for it: Kiryat Shmona, Nahariya and Safed take +1.5 unrest for 60 months (the shelters, the school years spent underground), and the organizations keep the south.',
        effects: guard('ev_i_litani:1', (ctx) => {
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { infl: 10, legitimacy: 5 });
          unrestAcross(ctx, 'ISR', ['Kiryat Shmona', 'Nahariya', 'Safed'], {
            id: 'the_shelters', name: 'The Years in the Shelters', months: 60, effects: { unrest: 1.5 },
          });
          ctx.game.flags.ploStateInSouth = true;
          ctx.helpers.chronicle(ctx, 'war', 'The answer is flown, not marched: the border stays a border and the northern towns learn the sound of the sirens by heart.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_peace_for_galilee',
    title: 'Forty Kilometres',
    worldLabel: 'The Lebanon War',
    desc: 'The ambassador in London is shot in the head by a faction that hates the '
      + 'PLO nearly as much as it hates Israel; the cabinet is told this is the '
      + 'occasion, not the reason. The plan presented to the ministers is forty '
      + 'kilometres deep and forty-eight hours long. The plan in the Defence '
      + 'Minister\'s head runs to Beirut, a Christian president, and a treaty. Nobody '
      + 'at the table is certain which plan they are voting for, and that ambiguity '
      + 'will cost the government more than the war does.',
    forTag: 'both',
    date: { y: 1982, m: 6 },
    world: true,
    major: true,
    when: safeTrigger('ev_i_peace_for_galilee:when', (ctx) =>
      alive(ctx, 'ISR') && alive(ctx, 'LEB') && !!ctx.game.flags.lebanonCivilWar),
    decider: 'ISR',
    aiOption: 0,
    options: [
      {
        label: 'To Beirut, and a new order in Lebanon',
        tooltip: 'Israel goes to war with Lebanon and puts three divisions on the northern border; the organizations\' hosts are driven out (the PLO leadership sails for Tunis). Israel: +20 martial points, −2,000 manpower, −20 legitimacy, +2 war exhaustion. If Syria holds the Beqaa it joins the war. Beirut takes +3 unrest for 60 months.',
        effects: guard('ev_i_peace_for_galilee:0', (ctx) => {
          const g = ctx.game;
          if (!alive(ctx, 'ISR') || !alive(ctx, 'LEB')) return;
          if (!findWar(g, 'ISR', 'LEB')) {
            clearEventTruce(ctx, 'ISR', 'LEB');
            ctx.helpers.declareWar(ctx, 'ISR', 'LEB', 'Peace for Galilee');
          }
          spawnAt(ctx, 'ISR', ['Kiryat Shmona', 'Nahariya', 'Safed', 'Ptolemais'], {
            inf: 6, cav: 4, name: 'Northern Command',
            general: { name: 'Amir Drori', fire: 3, shock: 3, maneuver: 4 },
          });
          spawnAt(ctx, 'ISR', ['Nahariya', 'Ptolemais', 'Dora'], {
            inf: 4, cav: 3, name: 'The Coastal Axis',
            general: { name: 'Amos Yaron', fire: 3, shock: 2, maneuver: 3 },
          });
          const sy = syrTag(ctx);
          if (sy && (ctx.helpers.controls(ctx, sy, 'Chalcis') || ctx.helpers.controls(ctx, sy, 'Tripolis'))
            && !findWar(g, 'ISR', sy)) {
            clearEventTruce(ctx, 'ISR', sy);
            ctx.helpers.declareWar(ctx, sy, 'ISR', 'The Beqaa');
            ctx.helpers.addTagModifier(ctx, 'ISR', {
              id: 'mole_cricket', name: 'The Missile Batteries Silenced', months: 12,
              effects: { moraleMult: 1.08 },
            });
          }
          for (const a of ctx.helpers.armiesOf(ctx, 'REB')) {
            const pr = a && ctx.byId(a.prov);
            if (pr && ['Tyre', 'Sidon', 'Berytus', 'Chalcis'].indexOf(pr.canon) >= 0) ctx.helpers.removeArmy(ctx, a.id);
          }
          ctx.helpers.adjust(ctx, 'ISR', { mar: 20, manpower: -2000, legitimacy: -20, warExhaustion: 2 });
          if (ctx.prov('Berytus')) {
            ctx.helpers.addProvinceModifier(ctx, 'Berytus', {
              id: 'siege_of_beirut', name: 'The Siege of Beirut', months: 60, effects: { unrest: 3 },
            });
          }
          for (const t of ['UK', 'ITA', 'GRC']) {
            if (alive(ctx, t)) setOpinionDelta(g, t, 'ISR', -25);
          }
          g.flags.lebanonWar82 = true;
          g.flags.ploToTunis = true;
          ctx.helpers.chronicle(ctx, 'war', 'The Lebanon War: the columns go north past the forty-kilometre line to the edge of Beirut, and the organizations sail for Tunis under French escort.');
        }),
      },
      {
        label: 'Forty kilometres and not one more',
        tooltip: 'A limited operation: Israel −15 martial points, −800 manpower, −5 legitimacy, no war with Syria, no siege. The rocket line is pushed back (Kiryat Shmona and Nahariya −1 unrest for 60 months) and the organizations keep Beirut — which means this war will be fought again.',
        effects: guard('ev_i_peace_for_galilee:1', (ctx) => {
          const g = ctx.game;
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { mar: -15, manpower: -800, legitimacy: -5 });
          unrestAcross(ctx, 'ISR', ['Kiryat Shmona', 'Nahariya'], {
            id: 'the_quiet_north', name: 'The Quiet North', months: 60, effects: { unrest: -1 },
          });
          unrestAcross(ctx, 'LEB', ['Tyre', 'Sidon'], {
            id: 'security_belt', name: 'The Security Belt', months: 96, effects: { unrest: 1 },
          });
          g.flags.securityBelt = true;
          g.flags.lebanonWar82 = true;
          ctx.helpers.chronicle(ctx, 'war', 'Forty kilometres and not one more: the rocket line is pushed back, Beirut is left to its own war, and everyone understands this is an intermission.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_sabra_shatila',
    title: 'The Camps, and the Commission',
    worldLabel: 'Sabra and Shatila; the Kahan Commission',
    desc: 'The president-elect is killed with his party headquarters by a bomb in the '
      + 'wall; his militia goes into two Palestinian camps the following evening to '
      + 'clear fighters, with Israeli units holding the perimeter and, that night, '
      + 'firing flares over the ground. What happens inside takes thirty-six hours. '
      + 'Four hundred thousand Israelis stand in a Tel Aviv square demanding an '
      + 'inquiry, and they get one: a commission of judges that finds indirect '
      + 'responsibility, and ends a Defence Minister\'s career without ending his '
      + 'politics.',
    forTag: 'both',
    date: { y: 1982, m: 9 },
    world: true,
    major: true,
    when: safeTrigger('ev_i_sabra_shatila:when', (ctx) => alive(ctx, 'ISR') && !!ctx.game.flags.lebanonWar82),
    decider: 'ISR',
    aiOption: 0,
    options: [
      {
        label: 'Appoint the commission of inquiry',
        tooltip: 'Israel: −20 legitimacy and −1 stability now, but +15 governance points and a permanent The Commission Sat (+0.2 public mandate a month): a state that investigated itself in public keeps something no communiqué can buy. Europe cools 20; the Revisionists lose 10.',
        effects: guard('ev_i_sabra_shatila:0', (ctx) => {
          const g = ctx.game;
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: -20, stability: -1, gov: 15 });
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'the_commission_sat', name: 'The Commission Sat', months: -1,
            effects: { legitimacyAdd: 0.2 },
          });
          ctx.helpers.factionShift(ctx, 'ISR', 'revisionists', -10);
          for (const t of ['UK', 'ITA', 'GRC']) {
            if (alive(ctx, t)) setOpinionDelta(g, t, 'ISR', -20);
          }
          g.flags.kahanCommission = true;
          ctx.helpers.chronicle(ctx, 'era', 'Sabra and Shatila, and then the square: four hundred thousand demand an inquiry, the judges deliver one, and a Defence Minister loses his ministry.');
        }),
      },
      {
        label: 'This was a Lebanese matter',
        tooltip: 'Israel: −35 legitimacy, −2 stability, −20 opinion from every friendly capital, and a permanent The Question Left Open (−5% income, +0.5 unrest). The Revisionists gain 5. Nothing is investigated, and nothing goes away.',
        effects: guard('ev_i_sabra_shatila:1', (ctx) => {
          const g = ctx.game;
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: -35, stability: -2 });
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'question_left_open', name: 'The Question Left Open', months: -1,
            effects: { incomeMult: 0.95, unrestAll: 0.5 },
          });
          ctx.helpers.factionShift(ctx, 'ISR', 'revisionists', 5);
          for (const t of ['UK', 'ITA', 'GRC']) {
            if (alive(ctx, t)) setOpinionDelta(g, t, 'ISR', -20);
          }
          ctx.helpers.chronicle(ctx, 'era', 'The camps are called a Lebanese matter and the file is closed; the square fills anyway, and the question outlives the government.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_the_mire',
    title: 'The Mire',
    worldLabel: 'The withdrawal to the security zone',
    desc: 'A truck drives into the headquarters at Tyre; a year later, two more into '
      + 'barracks in Beirut, and the multinational force that came to keep the peace '
      + 'is on its ships within months. The occupation of the south is now a slow '
      + 'subtraction — a jeep a week, a convoy a month — conducted by an enemy that '
      + 'did not exist in 1982 and has learned everything from being occupied. The '
      + 'cabinet finally votes to pull back to a strip along the border and calls it '
      + 'a security zone. The war has produced, from nothing, the most capable '
      + 'adversary Israel will face for a generation.',
    forTag: 'both',
    date: { y: 1985, m: 6 },
    world: true,
    major: true,
    when: safeTrigger('ev_i_the_mire:when', (ctx) => alive(ctx, 'ISR') && !!ctx.game.flags.lebanonWar82),
    decider: 'ISR',
    aiOption: 0,
    options: [
      {
        label: 'Withdraw to the security zone',
        tooltip: 'Any Israeli–Lebanese war ends where it stands; Israel −2 war exhaustion, +10 legitimacy, −10 martial points. The Security Belt is set for 180 months and the new adversary with it: Tyre and Sidon +1.5 unrest, and Israel\'s north gains The Zone Bleeds (−4% income) while it holds.',
        effects: guard('ev_i_the_mire:0', (ctx) => {
          const g = ctx.game;
          if (!alive(ctx, 'ISR')) return;
          if (findWar(g, 'ISR', 'LEB')) ctx.helpers.endWar(ctx, 'ISR', 'LEB', null);
          const sy = syrTag(ctx);
          if (sy && findWar(g, 'ISR', sy)) ctx.helpers.endWar(ctx, 'ISR', sy, null);
          ctx.helpers.adjust(ctx, 'ISR', { warExhaustion: -2, legitimacy: 10, mar: -10 });
          unrestAcross(ctx, 'LEB', ['Tyre', 'Sidon'], {
            id: 'security_belt', name: 'The Security Belt', months: 180, effects: { unrest: 1.5 },
          });
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'the_zone_bleeds', name: 'The Zone Bleeds', months: 180, effects: { incomeMult: 0.96 },
          });
          g.flags.securityBelt = true;
          g.flags.lebanonWithdrawal = true;
          ctx.helpers.chronicle(ctx, 'war', 'The withdrawal to the security zone: the war that was to last forty-eight hours ends its third year by inventing the enemy that will fight the next fifteen.');
        }),
      },
      {
        label: 'Hold the line north of the Awali',
        tooltip: 'Israel keeps the deeper occupation: +10 martial points, but +2 war exhaustion, −15 legitimacy, and a permanent The Mire (−8% income, −5% manpower, +0.5 unrest). Sidon and Beirut keep +2 unrest for 180 months. The subtraction continues, a jeep at a time.',
        effects: guard('ev_i_the_mire:1', (ctx) => {
          const g = ctx.game;
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { mar: 10, warExhaustion: 2, legitimacy: -15 });
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'the_mire', name: 'The Mire', months: -1,
            effects: { incomeMult: 0.92, manpowerMult: 0.95, unrestAll: 0.5 },
          });
          unrestAcross(ctx, 'LEB', ['Sidon', 'Berytus'], {
            id: 'the_deep_occupation', name: 'The Deep Occupation', months: 180, effects: { unrest: 2 },
          });
          g.flags.lebanonDeepHold = true;
          ctx.helpers.chronicle(ctx, 'war', 'The line stays north of the Awali; the convoys keep their intervals, and the country counts the week\'s jeep.');
        }),
      },
    ],
  },

  // ── THE UPRISINGS AND THE PEACE OF RECOGNITION, 1987–2000 ─────────────────
  // The wars in this bookmark were fought by states and settled by states.
  // What follows was neither: an uprising nobody ordered, a peace nobody's
  // army won, and the discovery that the thing available across this line was
  // never an alliance — only recognition (SPEC §96).
  {
    id: 'ev_i_first_intifada',
    title: 'The Stones of December',
    worldLabel: 'The First Intifada',
    desc: 'A truck hits a line of cars at the Gaza crossing and four labourers are '
      + 'killed; the funeral becomes a demonstration, the demonstration becomes a '
      + 'camp, and within a week every camp and town from Jenin to Rafah is out. There '
      + 'is no organization behind it — the leadership in Tunis learns about it from '
      + 'the news — and that is exactly what makes it unanswerable. Twenty years of '
      + 'military government meet a generation that has known nothing else and has '
      + 'decided it is not afraid of the jeeps.',
    forTag: 'both',
    date: { y: 1987, m: 12 },
    world: true,
    major: true,
    when: safeTrigger('ev_i_first_intifada:when', (ctx) => alive(ctx, 'ISR')),
    decider: 'ISR',
    aiOption: 0,
    options: [
      {
        label: 'Force, might, beatings',
        tooltip: 'Israel: +10 martial points, −25 legitimacy, −1 stability, and a permanent The Uprising (−7% income, +1 unrest); every town of the territories Israel holds takes +2 unrest for 72 months. Friendly capitals cool 25. The jeeps win every street and lose the picture.',
        effects: guard('ev_i_first_intifada:0', (ctx) => {
          const g = ctx.game;
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { mar: 10, legitimacy: -25, stability: -1 });
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'the_uprising', name: 'The Uprising', months: -1,
            effects: { incomeMult: 0.93, unrestAll: 1 },
          });
          unrestAcross(ctx, 'ISR', ['Gaza', 'Khan Yunis', 'Rafah', 'Jenin', 'Tulkarm',
            'Qalqilya', 'Ramallah', 'Bethlehem', 'Hebron', 'Neapolis', 'Jericho'], {
            id: 'the_intifada', name: 'The Intifada', months: 72, effects: { unrest: 2 },
          });
          for (const t of ['UK', 'ITA', 'GRC']) {
            if (alive(ctx, t)) setOpinionDelta(g, t, 'ISR', -25);
          }
          g.flags.firstIntifada = true;
          ctx.helpers.chronicle(ctx, 'era', 'The First Intifada: stones, tyres and general strikes from Jenin to Rafah, and an army that was built for tank battles learning what it cannot do.');
        }),
      },
      {
        label: 'Contain it and start looking for an address',
        tooltip: 'Israel: +15 influence points, −10 legitimacy, −1 stability, and the same towns take +1.25 unrest for 48 months instead. The cabinet quietly accepts that the answer is political — which opens the road to Madrid and to the letters of recognition.',
        effects: guard('ev_i_first_intifada:1', (ctx) => {
          const g = ctx.game;
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { infl: 15, legitimacy: -10, stability: -1 });
          unrestAcross(ctx, 'ISR', ['Gaza', 'Khan Yunis', 'Rafah', 'Jenin', 'Tulkarm',
            'Qalqilya', 'Ramallah', 'Bethlehem', 'Hebron', 'Neapolis', 'Jericho'], {
            id: 'the_intifada', name: 'The Intifada', months: 48, effects: { unrest: 1.25 },
          });
          g.flags.firstIntifada = true;
          g.flags.politicalTrack = true;
          ctx.helpers.chronicle(ctx, 'era', 'The uprising is contained rather than crushed, and for the first time the cabinet spends its evenings asking who, exactly, it would negotiate with.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_jordan_disengages',
    title: 'The King Lets Go',
    worldLabel: 'Jordan cuts its legal ties to the West Bank',
    desc: 'In a televised speech of eleven minutes the King dissolves the parliament\'s '
      + 'West Bank seats, ends the salaries of twenty-one thousand officials, and '
      + 'severs the legal and administrative ties his grandfather annexed in 1950. It '
      + 'is presented as respect for Palestinian self-determination and it is also the '
      + 'coldest possible reading of an uprising: if the territories are to be somebody '
      + 'else\'s problem, let them be somebody else\'s problem. Amman has just handed '
      + 'the file back to the people whose file it is.',
    forTag: 'both',
    date: { y: 1988, m: 7 },
    world: true,
    major: true,
    when: safeTrigger('ev_i_jordan_disengages:when', (ctx) => alive(ctx, 'JOR') && !!ctx.game.flags.firstIntifada),
    decider: 'JOR',
    aiOption: 0,
    options: [
      {
        label: 'Sever the ties',
        tooltip: 'Jordan: +20 influence points, +1 stability, −60 funds (the pensions are paid off), and a permanent The Kingdom East of the River (+8% income, −0.5 unrest). Jordan gives up its claims on the West Bank — the grudge ledger between Amman and Jerusalem is settled, and the road to Wadi Araba opens.',
        effects: guard('ev_i_jordan_disengages:0', (ctx) => {
          const g = ctx.game;
          if (!alive(ctx, 'JOR')) return;
          ctx.helpers.adjust(ctx, 'JOR', { infl: 20, stability: 1, treasury: -60 });
          ctx.helpers.addTagModifier(ctx, 'JOR', {
            id: 'east_of_the_river', name: 'The Kingdom East of the River', months: -1,
            effects: { incomeMult: 1.08, unrestAll: -0.5 },
          });
          if (alive(ctx, 'ISR')) {
            ctx.helpers.reconcileRivalry(ctx, 'JOR', 'ISR');
            setOpinionDelta(g, 'JOR', 'ISR', 25);
            setOpinionDelta(g, 'ISR', 'JOR', 25);
          }
          g.flags.jordanDisengaged = true;
          ctx.helpers.chronicle(ctx, 'diplomacy', 'Eleven minutes on television: Amman severs its legal ties to the West Bank and hands the file back to the people whose file it is.');
        }),
      },
      {
        label: 'Keep the claim and the payroll',
        tooltip: 'Jordan: +10 legitimacy and keeps its standing in the territories, but −80 funds now and a permanent The Payroll Across the River (−6% income, +0.5 unrest). The old claim survives — and with it the quarrel that Wadi Araba would have settled.',
        effects: guard('ev_i_jordan_disengages:1', (ctx) => {
          if (!alive(ctx, 'JOR')) return;
          ctx.helpers.adjust(ctx, 'JOR', { legitimacy: 10, treasury: -80 });
          ctx.helpers.addTagModifier(ctx, 'JOR', {
            id: 'payroll_across_river', name: 'The Payroll Across the River', months: -1,
            effects: { incomeMult: 0.94, unrestAll: 0.5 },
          });
          ctx.helpers.chronicle(ctx, 'diplomacy', 'The King keeps the claim and the payroll; the officials are paid, the seats are kept, and the quarrel keeps its file open.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_iran_iraq_war',
    title: 'The Longest War',
    worldLabel: 'Iraq invades Iran',
    desc: 'The revolution next door has shot its own officer corps and is broadcasting '
      + 'sermons at Iraq\'s Shia south; the president in Baghdad, one year into the '
      + 'chair, tears up the river-border treaty on television and sends six divisions '
      + 'across. He expects a fortnight. He gets eight years, a million casualties, '
      + 'trench lines out of a different century, gas, and a cease-fire on the line he '
      + 'started from — paid for with every barrel of oil and every loan the Gulf will '
      + 'extend, which is the debt that will send him into Kuwait.',
    forTag: 'both',
    date: { y: 1980, m: 9 },
    world: true,
    major: true,
    when: safeTrigger('ev_i_iran_iraq_war:when', (ctx) =>
      alive(ctx, 'IRQ') && alive(ctx, 'IRN') && !!ctx.game.flags.saddamIraq),
    decider: 'IRQ',
    aiOption: 0,
    options: [
      {
        label: 'Cross the Shatt al-Arab',
        tooltip: 'Iraq declares war on Iran and puts two armies on the border. Iraq has the equipment and the shallow bench: +12% army power, −15% manpower, −20% income, +2 unrest. Iran has the bodies and no officers left to use them: +60% manpower, −18% army power — one full pattern generation below what its tech says, which is what an executed officer corps and unmaintained American kit actually cost. And Iraq borrows: five Gulf loans, 15 talents a month, and they do not stop when the war does.',
        effects: guard('ev_i_iran_iraq_war:0', (ctx) => {
          const g = ctx.game;
          if (!alive(ctx, 'IRQ') || !alive(ctx, 'IRN')) return;
          clearEventTruce(ctx, 'IRQ', 'IRN');
          if (!findWar(g, 'IRQ', 'IRN')) ctx.helpers.declareWar(ctx, 'IRQ', 'IRN', 'The First Gulf War');
          spawnAt(ctx, 'IRQ', ['Charax', 'Uruk', 'Babylon'], {
            inf: 8, cav: 4, name: 'The Southern Front',
            general: { name: 'Maher Abd al-Rashid', fire: 3, shock: 3, maneuver: 2 },
          });
          spawnAt(ctx, 'IRQ', ['Arbela', 'Assur', 'Seleucia-Ctesiphon'], {
            inf: 5, cav: 2, name: 'The Northern Front',
            general: { name: 'Corps Command', fire: 2, shock: 2, maneuver: 2 },
          });
          // The war was a draw on the starting line and the reason is specific:
          // Iraq had the equipment, Iran had the bodies and the terrain, and
          // neither could convert its advantage. Iraq used to get thirteen
          // infantry, six cavalry and a fire-3/shock-3 general against an Iran
          // with a manpower bonus and no military penalty at all, so of course
          // it won. These are the two halves of the real asymmetry.
          //
          // `milPowerMult` is the same lever `genMult` pulls — it multiplies at
          // exactly the point unit generation does — so 0.82 is not a fudge
          // factor, it is one rung: UNIT_GENS gen 5 is mult 2.8 and gen 4 is
          // 2.3, and 2.3/2.8 is 0.82. Iranian regiments fight a generation
          // below their pattern, which is the thing to model.
          ctx.helpers.addTagModifier(ctx, 'IRQ', {
            id: 'the_longest_war', name: 'The Longest War', months: -1,
            effects: { incomeMult: 0.8, unrestAll: 2, manpowerMult: 0.85, milPowerMult: 1.12 },
          });
          ctx.helpers.addTagModifier(ctx, 'IRN', {
            id: 'the_longest_war', name: 'The Longest War', months: -1,
            effects: { incomeMult: 0.85, manpowerMult: 1.60, milPowerMult: 0.82, reinforceMult: 1.35 },
          });
          // The debt is the causal link to Kuwait, so it has to be a number the
          // player can watch rather than a line of prose. Loans are the
          // engine's own visible drain: LOAN_INTEREST_PER_MONTH is 3 talents
          // each, the realm panel prints the count, and nothing clears them but
          // repayment. By 1990 Baghdad genuinely cannot pay.
          const iq = g.tags.IRQ;
          if (iq) iq.loans = Math.min(5, (Number(iq.loans) || 0) + 5);
          ctx.helpers.adjust(ctx, 'IRQ', { treasury: -200, mar: 20 });
          g.flags.iranIraqWar = true;
          ctx.helpers.chronicle(ctx, 'war', 'Baghdad tears up the river treaty and crosses the Shatt al-Arab; the fortnight becomes eight years, and the loans that pay for it will send the army south next.');
        }),
      },
      {
        label: 'Keep the treaty and watch the revolution burn',
        tooltip: 'Iraq stays home: +20 governance points, +100 funds, +1 stability. Iran keeps its own revolution to itself (−1 stability, +1 unrest for 60 months). No debt, no eight years — and no reason for what came after.',
        effects: guard('ev_i_iran_iraq_war:1', (ctx) => {
          if (alive(ctx, 'IRQ')) ctx.helpers.adjust(ctx, 'IRQ', { gov: 20, treasury: 100, stability: 1 });
          if (alive(ctx, 'IRN')) {
            ctx.helpers.adjust(ctx, 'IRN', { stability: -1 });
            ctx.helpers.addTagModifier(ctx, 'IRN', {
              id: 'the_revolution_inward', name: 'The Revolution Turns Inward', months: 60, effects: { unrestAll: 1 },
            });
          }
          ctx.helpers.chronicle(ctx, 'diplomacy', 'Baghdad keeps the river treaty in the drawer; the revolution next door is left to consume its own officer corps.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_gulf_war',
    title: 'Thirty-Nine Warheads',
    worldLabel: 'The Gulf War; Scuds fall on Tel Aviv',
    desc: 'Eight years of war left Baghdad with the largest army in the region and a '
      + 'debt it cannot pay to the neighbors who lent it the money, so the army goes '
      + 'and takes the wells. What arrives in answer is a coalition of thirty-five '
      + 'states, five weeks of air, and a hundred hours of ground. And every few nights '
      + 'through those weeks the sirens go in Tel Aviv and Haifa: missiles fired at a '
      + 'country that is not in the war, by a government that wants it in the war, at a '
      + 'people who are told to sit in sealed rooms with masks on and not answer.',
    forTag: 'both',
    date: { y: 1991, m: 1 },
    world: true,
    major: true,
    when: safeTrigger('ev_i_gulf_war:when', (ctx) =>
      alive(ctx, 'IRQ') && alive(ctx, 'ISR') && !!ctx.game.flags.coalitionWar),
    decider: 'ISR',
    aiOption: 0,
    options: [
      {
        label: 'Sealed rooms — Israel does not answer',
        tooltip: 'Israel stays out and the coalition fights the war: −15 martial points and Tel Aviv +1.5 unrest for 24 months, but +20 legitimacy and every friendly capital warms 25 — the restraint is the asset. Iraq is not broken by this card. It takes −1 stability and Five Weeks of Air (−25% reinforcement, −15% army power, 12 months) and then the war is fought on the map; if the coalition is thin, Baghdad can survive it.',
        effects: guard('ev_i_gulf_war:0', (ctx) => {
          const g = ctx.game;
          if (!alive(ctx, 'IRQ')) return;
          // The outcome is NOT written down here (SPEC §153). The five weeks of
          // air are a real bombardment modifier on a war that is already
          // running; who wins it is the sim's to say, and the aftermath cards
          // in the Gulf package ask which way it went.
          ctx.helpers.adjust(ctx, 'IRQ', { stability: -1 });
          ctx.helpers.addTagModifier(ctx, 'IRQ', {
            id: 'five_weeks_of_air', name: 'Five Weeks of Air', months: 12,
            effects: { reinforceMult: 0.75, milPowerMult: 0.85 },
          });
          if (alive(ctx, 'ISR')) {
            ctx.helpers.adjust(ctx, 'ISR', { mar: -15, legitimacy: 20 });
            if (ctx.helpers.controls(ctx, 'ISR', 'Joppa')) {
              ctx.helpers.addProvinceModifier(ctx, 'Joppa', {
                id: 'sealed_rooms', name: 'The Sealed Rooms', months: 24, effects: { unrest: 1.5 },
              });
            }
            for (const t of ['UK', 'ITA', 'GRC', 'TUR']) {
              if (alive(ctx, t)) setOpinionDelta(g, t, 'ISR', 25);
            }
          }
          g.flags.gulfWar = true;
          ctx.helpers.chronicle(ctx, 'war', 'The Gulf War: the coalition takes a hundred hours to undo eight years, and Israel spends six weeks in sealed rooms without firing a shot — which is itself the shot.');
        }),
      },
      {
        label: 'Answer the launchers ourselves',
        tooltip: 'Israel enters a war that is actually being fought, alongside a coalition that is actually present: +20 martial points, −1,500 manpower, +1 war exhaustion, −15 legitimacy, and every coalition capital cools 20 — an Israeli sortie over the western desert is exactly the picture Baghdad was firing for, and now there is a coalition to annoy. Iraq takes the same −1 stability and Five Weeks of Air; the rest is the war.',
        effects: guard('ev_i_gulf_war:1', (ctx) => {
          const g = ctx.game;
          if (!alive(ctx, 'IRQ')) return;
          ctx.helpers.adjust(ctx, 'IRQ', { stability: -1 });
          ctx.helpers.addTagModifier(ctx, 'IRQ', {
            id: 'five_weeks_of_air', name: 'Five Weeks of Air', months: 12,
            effects: { reinforceMult: 0.75, milPowerMult: 0.85 },
          });
          if (alive(ctx, 'ISR')) {
            clearEventTruce(ctx, 'ISR', 'IRQ');
            if (!findWar(g, 'ISR', 'IRQ')) ctx.helpers.declareWar(ctx, 'ISR', 'IRQ', 'The Western Desert');
            ctx.helpers.adjust(ctx, 'ISR', { mar: 20, manpower: -1500, warExhaustion: 1, legitimacy: -15 });
            for (const t of ['UK', 'ITA', 'GRC', 'TUR', 'SAU', 'EGY', 'SYR']) {
              if (alive(ctx, t)) setOpinionDelta(g, t, 'ISR', -20);
            }
          }
          g.flags.gulfWar = true;
          g.flags.israelAnsweredScuds = true;
          ctx.helpers.chronicle(ctx, 'war', 'Israeli aircraft go hunting launchers over the western desert; Baghdad gets the photograph it was firing for, and the coalition gets a headache it did not need.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_oslo',
    title: 'The Handshake',
    worldLabel: 'The Oslo accords: the letters of recognition',
    desc: 'Two academics and a Norwegian foreign ministry, fourteen secret rounds in a '
      + 'country house outside Oslo, and at the end of it two letters. One recognizes '
      + 'the State of Israel and renounces terrorism. The other recognizes the PLO as '
      + 'the representative of the Palestinian people. Everything else — the borders, '
      + 'the city, the refugees, the settlements — is postponed to a final status the '
      + 'letters assume will arrive. On a lawn in Washington a Prime Minister who spent '
      + 'his life in uniform shakes a hand he has spent his life hunting, and does not '
      + 'quite manage to look at it.',
    forTag: 'both',
    date: { y: 1993, m: 9 },
    world: true,
    major: true,
    when: safeTrigger('ev_i_oslo:when', (ctx) => alive(ctx, 'ISR') && !!ctx.game.flags.firstIntifada),
    decider: 'ISR',
    aiOption: 0,
    options: [
      {
        label: 'Sign the letters',
        tooltip: 'Israel: +25 legitimacy, +25 influence points, −1 stability, the Revisionists −20 and the Coalition +10; the uprising modifiers lift and the towns of the territories drop to +0.5 unrest for 48 months. Every Arab capital warms 30, friendly capitals 30 — and the road to Wadi Araba is open.',
        effects: guard('ev_i_oslo:0', (ctx) => {
          const g = ctx.game;
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { legitimacy: 25, infl: 25, stability: -1 });
          ctx.helpers.factionShift(ctx, 'ISR', 'revisionists', -20);
          ctx.helpers.factionShift(ctx, 'ISR', 'coalition', 10);
          ctx.helpers.removeModifier(ctx, 'ISR', 'the_uprising');
          for (const n of ['Gaza', 'Khan Yunis', 'Rafah', 'Jenin', 'Tulkarm', 'Qalqilya',
            'Ramallah', 'Bethlehem', 'Hebron', 'Neapolis', 'Jericho']) {
            ctx.helpers.removeModifier(ctx, n, 'the_intifada');
            if (ctx.helpers.controls(ctx, 'ISR', n)) {
              ctx.helpers.addProvinceModifier(ctx, n, {
                id: 'the_interim_period', name: 'The Interim Period', months: 48, effects: { unrest: 0.5 },
              });
            }
          }
          const e = egyTag(ctx), sy = syrTag(ctx);
          for (const t of [e, sy, 'JOR', 'LEB', 'IRQ', 'SAU']) {
            if (t && alive(ctx, t)) setOpinionDelta(g, t, 'ISR', 30);
          }
          for (const t of ['UK', 'ITA', 'GRC', 'TUR']) {
            if (alive(ctx, t)) setOpinionDelta(g, t, 'ISR', 30);
          }
          g.flags.oslo = true;
          ctx.helpers.chronicle(ctx, 'diplomacy', 'Oslo: two letters of recognition, a handshake on a lawn, and every hard question postponed to a final status that everyone signing assumes will arrive.');
        }),
      },
      {
        label: 'No address, no letters',
        tooltip: 'Israel: +10 martial points, the Revisionists +15, −1 stability — and the uprising continues at +1.5 unrest across the territories for 120 months, with a permanent No Interlocutor (−5% income). The occupation stays an administration, and the administration stays the policy.',
        effects: guard('ev_i_oslo:1', (ctx) => {
          const g = ctx.game;
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { mar: 10, stability: -1 });
          ctx.helpers.factionShift(ctx, 'ISR', 'revisionists', 15);
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'no_interlocutor', name: 'No Interlocutor', months: -1, effects: { incomeMult: 0.95 },
          });
          unrestAcross(ctx, 'ISR', ['Gaza', 'Khan Yunis', 'Rafah', 'Jenin', 'Tulkarm',
            'Qalqilya', 'Ramallah', 'Bethlehem', 'Hebron', 'Neapolis', 'Jericho'], {
            id: 'the_intifada', name: 'The Intifada', months: 120, effects: { unrest: 1.5 },
          });
          ctx.helpers.chronicle(ctx, 'diplomacy', 'The letters are not signed: there is no address, the uprising keeps its own address, and the administration remains the policy.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_wadi_araba',
    title: 'The Peace in the Arava',
    worldLabel: 'The Israel–Jordan peace treaty',
    desc: 'A tent pitched on the border in the Arava heat, a hundred kilometres from '
      + 'anywhere, and two states that have been quietly talking to each other for '
      + 'forty-six years finally do it with the microphones on. Water quotas, a border '
      + 'drawn to the metre, the Hashemite role at the Jerusalem holy places written '
      + 'into the text — and, in the only clause that matters, the end of the state of '
      + 'war between them. Not an alliance. Neither army will ever fight for the other. '
      + 'Peace, and an embassy, and a border you can drive across.',
    forTag: 'both',
    date: { y: 1994, m: 10 },
    world: true,
    major: true,
    when: safeTrigger('ev_i_wadi_araba:when', (ctx) =>
      alive(ctx, 'ISR') && alive(ctx, 'JOR') && !!ctx.game.flags.oslo),
    decider: 'ISR',
    aiOption: 0,
    options: [
      {
        label: 'Sign in the Arava',
        tooltip: 'Israel and Jordan recognize one another (SPEC §96): any war between them ends, the rivalry retires, neither may declare war on the other while it stands, and both courts sit at +80 opinion. Both +15 legitimacy, both −1 war exhaustion; Israel +10% and Jordan +12% income permanently (the border trade and the water).',
        effects: guard('ev_i_wadi_araba:0', (ctx) => {
          const g = ctx.game;
          if (!alive(ctx, 'ISR') || !alive(ctx, 'JOR')) return;
          if (typeof ctx.helpers.recognize === 'function') ctx.helpers.recognize(ctx, 'ISR', 'JOR');
          ctx.helpers.reconcileRivalry(ctx, 'ISR', 'JOR');
          setOpinionAtLeast(g, 'ISR', 'JOR', 80);
          setOpinionAtLeast(g, 'JOR', 'ISR', 80);
          for (const t of ['ISR', 'JOR']) {
            ctx.helpers.adjust(ctx, t, { legitimacy: 15, warExhaustion: -1 });
            ctx.helpers.addTagModifier(ctx, t, {
              id: 'wadi_araba', name: 'The Peace in the Arava', months: -1,
              effects: { incomeMult: t === 'JOR' ? 1.12 : 1.1, noOpportunisticWars: true },
            });
          }
          g.flags.wadiAraba = true;
          ctx.helpers.chronicle(ctx, 'peace', 'The Arava treaty: the second peace, signed in a tent in the heat — an embassy, a border you can drive across, and no clause obliging either army to fight for the other.');
        }),
      },
      {
        label: 'Keep the quiet understanding unwritten',
        tooltip: 'The old arrangement continues: both courts +20 opinion and +10 influence points, and nothing is signed. It has worked for forty-six years — and it can be unworked in an afternoon by anybody\'s successor.',
        effects: guard('ev_i_wadi_araba:1', (ctx) => {
          const g = ctx.game;
          for (const [a, b] of [['ISR', 'JOR'], ['JOR', 'ISR']]) {
            if (alive(ctx, a) && alive(ctx, b)) {
              setOpinionDelta(g, a, b, 20);
              ctx.helpers.adjust(ctx, a, { infl: 10 });
            }
          }
          ctx.helpers.chronicle(ctx, 'diplomacy', 'The understanding between Jerusalem and Amman stays where it has always been: unwritten, reliable, and dependent on the men who keep it.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_rabin_square',
    title: 'Three Shots in the Square',
    worldLabel: 'The Prime Minister is assassinated',
    desc: 'A hundred thousand people in the Tel Aviv square under a banner reading Yes '
      + 'to Peace, No to Violence; the Prime Minister, who has never been able to sing, '
      + 'sings the Song of Peace and folds the sheet into his jacket pocket. On the '
      + 'stairs to the car a law student from Herzliya, who has spent a year being told '
      + 'by people who should have known better that this man is a traitor with a '
      + 'religious ruling against him, fires three times. The bloodstained sheet comes '
      + 'out of the pocket at the hospital.',
    forTag: 'both',
    date: { y: 1995, m: 11 },
    world: true,
    major: true,
    when: safeTrigger('ev_i_rabin_square:when', (ctx) => alive(ctx, 'ISR') && !!ctx.game.flags.oslo),
    decider: 'ISR',
    aiOption: 0,
    options: [
      {
        label: 'The state mourns and the process goes on',
        tooltip: 'Israel: −2 stability, +10 legitimacy, the Revisionists −15 and the Coalition +10, and a permanent The Square (+0.15 public mandate a month). The process survives its author, narrowly, and the country argues about who is to blame for the rest of the century.',
        effects: guard('ev_i_rabin_square:0', (ctx) => {
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { stability: -2, legitimacy: 10 });
          ctx.helpers.setRuler(ctx, 'ISR', {
            name: 'Shimon Peres', title: 'Prime Minister', gov: 4, infl: 5, mar: 2, age: ageAt(ctx, 1923, 8),
          });
          ctx.helpers.factionShift(ctx, 'ISR', 'revisionists', -15);
          ctx.helpers.factionShift(ctx, 'ISR', 'coalition', 10);
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'the_square', name: 'The Square', months: -1, effects: { legitimacyAdd: 0.15 },
          });
          ctx.game.flags.rabinKilled = true;
          ctx.helpers.chronicle(ctx, 'era', 'Three shots on the stairs to the car: the Prime Minister is killed by a citizen of his own country, and the folded song comes out of the pocket stained.');
        }),
      },
      {
        label: 'The process dies with him',
        tooltip: 'Israel: −2 stability, −10 legitimacy, the Revisionists +20, and a permanent The Process Ends (−5% income, +1 unrest in every town of the territories through the ordinary unrest). The interim period stops being interim.',
        effects: guard('ev_i_rabin_square:1', (ctx) => {
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { stability: -2, legitimacy: -10 });
          ctx.helpers.setRuler(ctx, 'ISR', {
            name: 'Shimon Peres', title: 'Prime Minister', gov: 4, infl: 5, mar: 2, age: ageAt(ctx, 1923, 8),
          });
          ctx.helpers.factionShift(ctx, 'ISR', 'revisionists', 20);
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'the_process_ends', name: 'The Process Ends', months: -1,
            effects: { incomeMult: 0.95, unrestAll: 1 },
          });
          ctx.game.flags.rabinKilled = true;
          ctx.game.flags.processDead = true;
          ctx.helpers.chronicle(ctx, 'era', 'The Prime Minister is buried and the process with him; the interim period stops being interim and becomes the arrangement.');
        }),
      },
    ],
  },
  {
    id: 'ev_i_second_intifada',
    title: 'The Second Uprising',
    worldLabel: 'The Second Intifada',
    desc: 'A summit at Camp David that goes to the hard questions at last and comes '
      + 'apart on them; a leader of the opposition walking the Temple Mount with a '
      + 'thousand policemen to make a point about sovereignty; and then a second '
      + 'uprising that is nothing like the first. Not stones and strikes but rifles and '
      + 'explosives, buses in the middle of cities, tanks back in the towns the interim '
      + 'period handed over. Whatever the letters of 1993 postponed, they postponed it '
      + 'to this.',
    forTag: 'both',
    date: { y: 2000, m: 9 },
    world: true,
    major: true,
    when: safeTrigger('ev_i_second_intifada:when', (ctx) => alive(ctx, 'ISR')),
    decider: 'ISR',
    aiOption: 0,
    options: [
      {
        label: 'Retake the towns',
        tooltip: 'Israel: +20 martial points, −2,000 manpower, −20 legitimacy, −1 stability and +1.5 war exhaustion; the towns of the territories take +2.5 unrest for 60 months, a militia host rises in Gaza, and a permanent The Second Uprising (−8% income, +1 unrest). Friendly capitals cool 20.',
        effects: guard('ev_i_second_intifada:0', (ctx) => {
          const g = ctx.game;
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { mar: 20, manpower: -2000, legitimacy: -20, stability: -1, warExhaustion: 1.5 });
          ctx.helpers.addTagModifier(ctx, 'ISR', {
            id: 'second_uprising', name: 'The Second Uprising', months: -1,
            effects: { incomeMult: 0.92, unrestAll: 1 },
          });
          unrestAcross(ctx, 'ISR', ['Gaza', 'Khan Yunis', 'Rafah', 'Jenin', 'Tulkarm',
            'Qalqilya', 'Ramallah', 'Bethlehem', 'Hebron', 'Neapolis', 'Jericho'], {
            id: 'the_second_intifada', name: 'The Second Intifada', months: 60, effects: { unrest: 2.5 },
          });
          spawnRebels(ctx, ploBases(ctx, 'ISR', ['Gaza', 'Khan Yunis', 'Jenin', 'Neapolis']), {
            inf: 3, cav: 0, gen: 4, name: 'The Armed Wings',
            general: { name: 'Cell Command', fire: 2, shock: 2, maneuver: 3 },
          });
          for (const t of ['UK', 'ITA', 'GRC']) {
            if (alive(ctx, t)) setOpinionDelta(g, t, 'ISR', -20);
          }
          g.flags.secondIntifada = true;
          ctx.helpers.chronicle(ctx, 'era', 'The second uprising: not stones but rifles and explosives, buses in the middle of cities, and the tanks back in the towns the interim period handed over.');
        }),
      },
      {
        label: 'Hold the line and keep the table',
        tooltip: 'Israel: +20 influence points, −10 legitimacy, −1 stability; the towns take +1.5 unrest for 48 months and no militia host rises. The negotiators stay in the room — Taba, and whatever comes after Taba — and the country is furious with them for it.',
        effects: guard('ev_i_second_intifada:1', (ctx) => {
          const g = ctx.game;
          if (!alive(ctx, 'ISR')) return;
          ctx.helpers.adjust(ctx, 'ISR', { infl: 20, legitimacy: -10, stability: -1 });
          unrestAcross(ctx, 'ISR', ['Gaza', 'Khan Yunis', 'Rafah', 'Jenin', 'Tulkarm',
            'Qalqilya', 'Ramallah', 'Bethlehem', 'Hebron', 'Neapolis', 'Jericho'], {
            id: 'the_second_intifada', name: 'The Second Intifada', months: 48, effects: { unrest: 1.5 },
          });
          g.flags.secondIntifada = true;
          g.flags.tabaTrack = true;
          ctx.helpers.chronicle(ctx, 'era', 'The line is held and the table is kept: the negotiators stay in the room at Taba while the country tells them, loudly, what it thinks of the room.');
        }),
      },
    ],
  },

  // ═══ THE CANNON, AND THE LEDGER (SPEC §119) ═══════════════════════════════
  // Two forks the chapter carried as single afternoons and never charted.
  // The Altalena was already a decision (ev_i_altalena) with no reckoning:
  // the state that fired on its own arms ship settled the question of who
  // commands for a generation, and the state that negotiated the cargo
  // ashore kept the question. And the shilumim: the January 1952 Knesset
  // debate — reparations from Germany, seven years after — with Begin on
  // the balcony and stones coming through the windows, is the hardest
  // major decision in the state's first decade and the game never dealt
  // it. The absorption fork (§171) says what the doubled population was
  // paid for WITH; this one asks whom the payment could be taken FROM.
  {
    id: 'ev_i_what_one_army_meant',
    title: 'What One Army Meant',
    desc: 'Five years on, the afternoon off the Tel Aviv beach has become a founding '
      + 'story, and founding stories are policy. The officer corps is being rebuilt for '
      + 'a smaller budget, the undergrounds\' veterans are middle-aged, and the cabinet '
      + 'table divides over what, exactly, was settled that day.\n\n'
      + 'If the cannon fired, the question is what to do with the men it fired on — '
      + 'whether the state that proved its monopoly can now afford to be generous with '
      + 'the proof. If the cargo came ashore under a negotiated flag, the question has '
      + 'never closed at all: every crisis since has produced men who remember that '
      + 'once, when it mattered, there were two answers to the question of who '
      + 'commands.',
    forTag: 'ISR',
    major: true,
    minYear: 1953,
    maxYear: 1956,
    trigger: safeTrigger('ev_i_one_army_meant', (ctx) => alive(ctx, 'ISR')
      && (ctx.helpers.getFlag(ctx, 'altalenaShelled') || ctx.helpers.getFlag(ctx, 'altalenaAshore'))
      && !ctx.helpers.getFlag(ctx, 'oneArmyReckoned')),
    aiOption: 0,
    historical: 'The monopoly held and was slowly allowed to stop being a wound: the '
      + 'Irgun\'s veterans entered the army, the Knesset, and eventually the government '
      + '— thirty years later, one of them formed it.',
    options: [
      {
        label: 'The army above the parties, and the wound closed',
        tooltip: 'Shelled: commissions and pensions for the men the cannon fired on — '
          + '+1 stability, the Revisionists +15, "The Army Above the Parties" (−0.5 unrest '
          + 'everywhere, permanent). Ashore: the open question is closed late — the militia '
          + 'battalions are folded into the line at last, +1 stability, −5 legitimacy.',
        effects: guard('ev_i_one_army_meant:0', (ctx) => {
          const h = ctx.helpers;
          if (h.getFlag(ctx, 'altalenaShelled')) {
            h.adjust(ctx, 'ISR', { stability: 1 });
            h.factionShift(ctx, 'ISR', 'revisionists', 15);
            h.addTagModifier(ctx, 'ISR', {
              id: 'army_above_parties', name: 'The Army Above the Parties', months: -1,
              effects: { unrestAll: -0.5 },
            });
            h.chronicle(ctx, 'era', 'The men the cannon fired on are commissioned, '
              + 'pensioned, and promoted on the record, and the founding story acquires '
              + 'its second half: the monopoly was the point, not the enemies.');
          } else {
            h.adjust(ctx, 'ISR', { stability: 1, legitimacy: -5 });
            h.chronicle(ctx, 'era', 'The militia battalions are folded into the line five '
              + 'years late, by negotiation, with everyone watching everyone sign. The '
              + 'question of who commands is closed the expensive way: eventually.');
          }
          h.setFlag(ctx, 'oneArmyReckoned', true);
          h.setFlag(ctx, 'armyWoundClosed', true);
        }),
      },
      {
        label: 'The old undergrounds keep their own tables',
        tooltip: 'The veterans\' networks stay networks. Shelled: the wound is left open — '
          + 'the Revisionists −10, +0.5 unrest everywhere for 60 months, +15 governance '
          + 'points (nobody is paid off). Ashore: the second loyalty becomes a standing '
          + 'fact — +1 unrest everywhere for 60 months, and every crisis re-asks the '
          + 'question.',
        effects: guard('ev_i_one_army_meant:1', (ctx) => {
          const h = ctx.helpers;
          if (h.getFlag(ctx, 'altalenaShelled')) {
            h.adjust(ctx, 'ISR', { gov: 15 });
            h.factionShift(ctx, 'ISR', 'revisionists', -10);
            h.addTagModifier(ctx, 'ISR', {
              id: 'the_open_wound', name: 'The Open Wound', months: 60,
              effects: { unrestAll: 0.5 },
            });
            h.chronicle(ctx, 'era', 'No commissions, no pensions, no second half to the '
              + 'founding story. The state saves the money and keeps the wound, and the '
              + 'veterans\' tables keep their own minutes.');
          } else {
            h.addTagModifier(ctx, 'ISR', {
              id: 'the_second_loyalty', name: 'The Second Loyalty', months: 60,
              effects: { unrestAll: 1 },
            });
            h.chronicle(ctx, 'era', 'The old undergrounds keep their own tables, their own '
              + 'funds, and their own answer to the question of who commands, and every '
              + 'crisis of the decade re-asks it on schedule.');
          }
          h.setFlag(ctx, 'oneArmyReckoned', true);
          h.setFlag(ctx, 'oldTablesKept', true);
        }),
      },
    ],
  },

  {
    id: 'ev_i_the_shilumim',
    title: 'The Shilumim',
    desc: 'The arithmetic is on one page: the state has doubled its population, the '
      + 'treasury is running on austerity coupons, and across the sea there is a German '
      + 'government prepared to pay — goods, ships, machinery, oil — three billion '
      + 'marks against a crime that has no price. The word chosen is shilumim, '
      + 'payments, because the other words will not sit in a sentence.\n\n'
      + 'Outside the Knesset the square is full and Begin is speaking: there are things '
      + 'a Jew does not sell, and the dead are first among them. Stones are already '
      + 'coming through the chamber windows. Inside, the arithmetic stays on the page, '
      + 'and the men who survived what the payment is for sit on both sides of the '
      + 'vote.',
    forTag: 'ISR',
    date: { y: 1952, m: 1 },
    major: true,
    aiOption: 0,
    historical: 'The Knesset approved negotiations 61–50 with the windows breaking, the '
      + 'Luxembourg Agreement was signed in September, and the payments underwrote the '
      + 'ports, the power grid, the merchant fleet and the railways of the state\'s '
      + 'second decade.',
    options: [
      {
        label: 'Sign. The dead would not vote to keep us poor',
        tooltip: 'The Luxembourg road: +300 treasury over the agreement and "The Shilumim" '
          + '(+12% income, 144 months) as the ports and the grid rise on the transfer '
          + 'goods. −10 legitimacy, the Revisionists −25, and +1.5 unrest everywhere for '
          + '12 months — the square empties slowly, and it does not forgive.',
        effects: guard('ev_i_shilumim:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ISR', { treasury: 300, legitimacy: -10 });
          h.addTagModifier(ctx, 'ISR', {
            id: 'the_shilumim', name: 'The Shilumim', months: 144,
            effects: { incomeMult: 1.12 },
          });
          h.addTagModifier(ctx, 'ISR', {
            id: 'the_broken_windows', name: 'The Broken Windows', months: 12,
            effects: { unrestAll: 1.5 },
          });
          h.factionShift(ctx, 'ISR', 'revisionists', -25);
          h.setFlag(ctx, 'shilumimSigned', true);
          h.chronicle(ctx, 'era', 'The agreement is signed at Luxembourg by men who do not '
            + 'shake hands. The first cargoes are cranes and rails and generators, and the '
            + 'state builds its second decade with them, keeping the invoices forever.');
        }),
      },
      {
        label: 'Refuse. There are things a state does not invoice',
        tooltip: 'The road not taken: +15 legitimacy, the Revisionists +25, +1 stability '
          + '— the square empties singing — and "The Long Austerity" (−8% income, 96 '
          + 'months): the coupons stay, the camps wait longer, and the state pays for its '
          + 'principle in the currency principles are paid in.',
        effects: guard('ev_i_shilumim:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ISR', { legitimacy: 15, stability: 1 });
          h.addTagModifier(ctx, 'ISR', {
            id: 'the_long_austerity', name: 'The Long Austerity', months: 96,
            effects: { incomeMult: 0.92 },
          });
          h.factionShift(ctx, 'ISR', 'revisionists', 25);
          h.setFlag(ctx, 'shilumimRefused', true);
          h.chronicle(ctx, 'era', 'The Knesset refuses the payments and the square empties '
            + 'singing. The austerity books are reprinted for another decade, and the '
            + 'refusal is filed where the state keeps the things it is — which is not the '
            + 'treasury.');
        }),
      },
    ],
  },

  {
    id: 'ev_i_what_the_shilumim_built',
    title: 'What the Shilumim Built',
    desc: 'Seven years on, the decision of the broken windows has become infrastructure '
      + '— or its absence. The ledger is public either way: what the ports moved, what '
      + 'the grid carried, what the camps became and when, and under it all the '
      + 'question the square shouted through the glass, which has not aged: what was it '
      + 'worth, and to whom, and does the answer change when the trains it bought run '
      + 'on time.\n\n'
      + 'The treasury wants the record read one way and the veterans of the square the '
      + 'other, and the cabinet must put a sentence in the decade\'s official history — '
      + 'which is being written now, by the winners of the argument, as official '
      + 'histories are.',
    forTag: 'ISR',
    major: true,
    minYear: 1959,
    maxYear: 1963,
    trigger: safeTrigger('ev_i_shilumim_built', (ctx) => alive(ctx, 'ISR')
      && (ctx.helpers.getFlag(ctx, 'shilumimSigned') || ctx.helpers.getFlag(ctx, 'shilumimRefused'))
      && !ctx.helpers.getFlag(ctx, 'shilumimReckoned')),
    aiOption: 0,
    historical: 'The payments ran to 1965 and built much of the state\'s heavy '
      + 'infrastructure; the argument about them ran longer, and was inherited intact '
      + 'by the children of both sides.',
    options: [
      {
        label: 'Pour the record into the towns and the ports',
        tooltip: 'Signed: the transfer decade is capitalised — +150 treasury, +1 stability, '
          + 'and "The Built Decade" (+8% income, 60 months). Refused: what austerity built '
          + 'slowly is finished slowly — +1 stability, "The Long Way Built" (+4% income, 60 '
          + 'months), and +10 legitimacy: it is all, every rail of it, the state\'s own.',
        effects: guard('ev_i_shilumim_built:0', (ctx) => {
          const h = ctx.helpers;
          if (h.getFlag(ctx, 'shilumimSigned')) {
            h.adjust(ctx, 'ISR', { treasury: 150, stability: 1 });
            h.addTagModifier(ctx, 'ISR', {
              id: 'the_built_decade', name: 'The Built Decade', months: 60,
              effects: { incomeMult: 1.08 },
            });
            h.chronicle(ctx, 'era', 'The transfer decade is poured into the towns and the '
              + 'ports, and the official history prints the tonnage tables next to a '
              + 'paragraph, carefully drafted, about the price of them.');
          } else {
            h.adjust(ctx, 'ISR', { stability: 1, legitimacy: 10 });
            h.addTagModifier(ctx, 'ISR', {
              id: 'the_long_way_built', name: 'The Long Way Built', months: 60,
              effects: { incomeMult: 1.04 },
            });
            h.chronicle(ctx, 'era', 'The decade\'s official history prints a shorter '
              + 'tonnage table and a longer sentence: what stands, stands unmortgaged. '
              + 'The camps took three years longer to empty, and the history prints '
              + 'that too, because nobody would let it not.');
          }
          h.setFlag(ctx, 'shilumimReckoned', true);
          h.setFlag(ctx, 'decadeCapitalised', true);
        }),
      },
      {
        label: 'Let the argument stand in the record, both sides',
        tooltip: 'The official history prints the debate verbatim instead of a verdict: '
          + '+10 governance points, +5 legitimacy — and the Revisionists are reconciled to '
          + 'the record (+10) whichever road was taken, because the record shows them '
          + 'saying what they said.',
        effects: guard('ev_i_shilumim_built:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ISR', { gov: 10, legitimacy: 5 });
          h.factionShift(ctx, 'ISR', 'revisionists', 10);
          h.setFlag(ctx, 'shilumimReckoned', true);
          h.setFlag(ctx, 'argumentStands', true);
          h.chronicle(ctx, 'era', 'The official history prints the broken-windows debate '
            + 'verbatim, both sides, no verdict. It is the most read chapter in the book, '
            + 'and both sides assign it, each certain of what it shows.');
        }),
      },
    ],
  },
];
