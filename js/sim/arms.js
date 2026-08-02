// Judaea Universalis — where the arms come from (SPEC §181, §212). DOM-free.
// Two halves of one subject: what a court buys abroad, and what it builds at
// home. The verbs for both live here; the readers for both live in
// military.js (the gate) and js/data/programs.js (the table).
//
// Nothing on the 1948 map from Cairo to Tel Aviv could roll a tank or a
// fighter out of its own works: the pattern of every armored battalion in
// the theater was decided in somebody else's capital. Where a bookmark
// declares an `armsMarket`, its arsenal states build the gated arms — air
// wings, armor — from their own works, and everyone else buys the right to
// raise them from ONE supplier at a time, at the supplier's regard bar,
// for a signing fee that lands in the supplier's treasury.
//
// The agreement lives only while the friendship does. The pipeline dies —
// with a notice — when the supplier's regard drops below the floor, when
// war comes between the two courts, when the supplier falls, or when the
// supplier signs a §100 embargo: an embargo IS the cutoff, which is what
// 1967 was. De Gaulle did not march on anybody; he signed something.
//
// The gate itself sits inside recruitRegiment/raiseAirWing (military.js),
// so the AI cannot build around it any more than the player can. This
// module owns the verbs: signing, switching, the monthly liveness sweep,
// and the AI's own deal-seeking — and, below, §212's answer to all of it:
// beginning, abandoning and delivering the works of one's own.

import {
  num, chronicle, opinionOf, addOpinion, setDiploCd, diploCdActive, diploCdMonthsLeft,
  armsMarketOn, isArsenal, armsDealBook, armsDealState, isOffmapTag,
  isSelfArsenal, armsExporters,
} from './military.js';
import { applyReformsToTag } from '../data/ideas.js';
import {
  ARMS_PROGRAMS, armsProgramsOn, armsProgramsFor, programStatus, programMonthsLeft,
  programLadderReached, programNeedsMet, programNeedsMissing, programStrain, ownWorksOf,
} from '../data/programs.js';
import { techLevelName } from '../data/tech.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/arms]', ...args);
}

function A(ctx, key, dflt) {
  const t = ctx.DEFINES.ARMS || {};
  return num(t[key], dflt);
}

const dealCdKey = (client, supplier) => client + '>' + supplier + ':arms';

// Why this client may not sign with this supplier right now — '' when it may.
export function armsSignGate(ctx, client, supplier) {
  const g = ctx.game;
  const c = g.tags[client], s = g.tags[supplier];
  if (!armsMarketOn(ctx)) return 'this age has no arms market';
  if (!c || !c.alive || !s || !s.alive) return 'no such court';
  if (client === supplier) return 'our own works are the question';
  // Who may sell (SPEC §212): the bookmark's exporters, and any court that
  // has built the works for every gated arm. Who need not buy: the same two.
  if (!isArsenal(ctx, supplier) && !isSelfArsenal(ctx, supplier)) return 'their works export nothing';
  if (isArsenal(ctx, client)) return 'our own arsenal builds every pattern we need';
  if (isSelfArsenal(ctx, client)) return 'our own works build every pattern we need';
  if (armsDealBook(ctx)[client] === supplier) return 'the agreement already stands';
  if ((c.atWarWith || []).indexOf(supplier) >= 0) return 'we are at war with them';
  if (g.embargoes && g.embargoes[supplier + '>' + client]) {
    return (s.name || supplier) + ' has closed its markets to us';
  }
  if (diploCdActive(ctx, dealCdKey(client, supplier))) {
    return 'the ministries are still smarting (' + diploCdMonthsLeft(ctx, dealCdKey(client, supplier)) + ' months)';
  }
  const need = A(ctx, 'need', 50);
  if (opinionOf(ctx, supplier, client) < need) {
    return 'their regard for us is too low (' + need + ' required)';
  }
  const cost = A(ctx, 'cost', 50);
  if (num(c.treasury) < cost) return 'not enough treasury (' + cost + ' talents)';
  return '';
}

// Sign a weapons transfer agreement: the fee moves, the old supplier (if
// any) is dropped and notices, and the pipeline opens on the spot.
export function signArmsDealCore(ctx, client, supplier) {
  const g = ctx.game;
  const why = armsSignGate(ctx, client, supplier);
  if (why) return { ok: false, why };
  const c = g.tags[client], s = g.tags[supplier];
  const book = armsDealBook(ctx);
  const old = book[client];
  if (old && old !== supplier && g.tags[old]) {
    addOpinion(ctx, old, client, A(ctx, 'switchOpinion', -10));
  }
  const cost = A(ctx, 'cost', 50);
  c.treasury = num(c.treasury) - cost;
  s.treasury = num(s.treasury) + cost;
  book[client] = supplier;
  setDiploCd(ctx, dealCdKey(client, supplier), Math.max(1, A(ctx, 'signCdMonths', 6) | 0));
  chronicle(ctx, 'diplo', (s.name || supplier) + ' opens the arsenal to ' + (c.name || client)
    + ': patterns, spares, and the men to teach them.');
  return { ok: true, supplier: s.name || supplier, dropped: old && old !== supplier ? old : null, cost };
}

// Scripted history's own pen (events): set the book directly, no gates, no
// fee — the Messerschmitts landed whatever the cabinet thought of the count.
export function setArmsDeal(ctx, client, supplier) {
  if (!ctx.game.tags[client] || !ctx.game.tags[supplier]) return false;
  armsDealBook(ctx)[client] = supplier;
  return true;
}

// The UI's whole picture of one pair, from the player's chair. Null where
// the age has no market or the other court is neither arsenal nor supplier.
export function armsInfo(ctx, me, other) {
  try {
    if (!armsMarketOn(ctx)) return null;
    const g = ctx.game;
    const them = g.tags[other];
    if (!them) return null;
    const book = armsDealBook(ctx);
    const isCurrent = book[me] === other;
    // A court that built its own works exports like any arsenal (SPEC §212),
    // so its panel carries the signature chip too.
    const sells = isArsenal(ctx, other) || isSelfArsenal(ctx, other);
    const weSell = isArsenal(ctx, me) || isSelfArsenal(ctx, me);
    if (!sells && !isCurrent) return null;
    const st = armsDealState(ctx, me);
    const why = armsSignGate(ctx, me, other);
    const curName = book[me] && g.tags[book[me]] ? (g.tags[book[me]].name || book[me]) : book[me] || null;
    return {
      offered: sells && !weSell,
      weAreArsenal: weSell,
      isSupplier: isCurrent,
      live: isCurrent && st.live,
      lapseWhy: isCurrent && !st.live ? st.why : '',
      can: !why, whyNot: why,
      need: A(ctx, 'need', 50), cost: A(ctx, 'cost', 50), floor: A(ctx, 'floor', 25),
      theirRegard: Math.round(opinionOf(ctx, other, me)),
      currentSupplier: book[me] || null, currentSupplierName: curName,
      switchOpinion: A(ctx, 'switchOpinion', -10),
    };
  } catch (e) { warnOnce('info', 'armsInfo failed', e); return null; }
}

// Monthly. Two passes, both cheap:
//   1. Liveness — a dead pipeline is struck from the book (the state checks
//      re-derive everything, but the BOOK going quiet is what the client is
//      told about, once, the month it happens).
//   2. The AI signs — a clientless AI court takes the friendliest arsenal
//      that will have it, paying the same fee at the same bar. Arsenal AI is
//      passive: a market, not a policy; §100's embargo AI is the policy.
export function monthlyArms(ctx) {
  const g = ctx.game;
  if (!armsMarketOn(ctx)) return;
  const book = armsDealBook(ctx);
  for (const client of Object.keys(book)) {
    const st = armsDealState(ctx, client);
    if (st.live) continue;
    const supName = st.supplier && g.tags[st.supplier]
      ? (g.tags[st.supplier].name || st.supplier) : (st.supplier || 'the supplier');
    delete book[client];
    const t = g.tags[client];
    chronicle(ctx, 'diplo', supName + ' closes the pipeline to ' + ((t && t.name) || client) + '.');
    if (client === g.playerTag) {
      ctx.bus.emit('notify', {
        title: 'The pipeline closes',
        text: supName + ' ends the weapons transfer agreement — ' + (st.why || 'the friendship cooled') + '.',
        type: 'bad',
      });
    }
  }
  // Who is selling this month — the declared arsenals plus anyone who has
  // built their way onto the list (SPEC §212). Read once: it cannot change
  // inside this pass, and it walks every court to answer.
  const exporters = armsExporters(ctx);
  for (const tag of Object.keys(g.tags)) {
    const t = g.tags[tag];
    if (!t || !t.alive || !t.ai || tag === 'REB') continue;
    if (tag === g.playerTag) continue;
    if (isArsenal(ctx, tag) || isSelfArsenal(ctx, tag) || isOffmapTag(ctx, tag)) continue;
    if (book[tag]) continue;
    let best = null;
    for (const sup of exporters) {
      if (armsSignGate(ctx, tag, sup)) continue;
      const regard = opinionOf(ctx, sup, tag);
      if (!best || regard > best.regard) best = { sup, regard };
    }
    if (best) {
      const res = signArmsDealCore(ctx, tag, best.sup);
      if (!res.ok) warnOnce('ai:' + tag, 'AI arms deal refused after gate pass', tag, best.sup, res.why);
    }
  }
}

// Bookmark setup: the opening book — the treaty system the chapter starts
// under. Silent (nothing is "signed" on day one; it was signed years ago).
export function seedArmsDeals(ctx) {
  const m = ctx.bookmark && ctx.bookmark.armsMarket;
  if (!m || !m.starting) return;
  const book = armsDealBook(ctx);
  for (const client of Object.keys(m.starting)) {
    const sup = m.starting[client];
    if (ctx.game.tags[client] && ctx.game.tags[sup]) book[client] = sup;
  }
}

// ================================================================ SPEC §212
// The works of one's own. The verbs above buy the pattern from somebody
// else's capital; these build it here. The book is `t.programs = { key:
// monthsLeft }` — absent is unstarted, positive is in the shops, 0 is
// delivered — and every reader over it is a pure function in
// js/data/programs.js, so saves carry the whole system as plain numbers.

function P(ctx, key, dflt) {
  const t = ctx.DEFINES.PROGRAMS || {};
  return num(t[key], dflt);
}

function programBook(t) {
  if (!t.programs || typeof t.programs !== 'object') t.programs = {};
  return t.programs;
}

// How many of this court's works are still in the shops.
function inShops(t) {
  const book = programBook(t);
  let n = 0;
  for (const k of Object.keys(book)) if (ARMS_PROGRAMS[k] && (book[k] | 0) > 0) n++;
  return n;
}

// Why this court may not begin this program right now — '' when it may.
export function programStartGate(ctx, tag, key) {
  const t = ctx.game.tags[tag];
  if (!armsProgramsOn(ctx.bookmark)) return 'this age builds no works of its own';
  if (!t || !t.alive) return 'no such court';
  const def = armsProgramsFor(ctx.bookmark, tag, t).find((x) => x.key === key);
  if (!def) return 'our shops were never asked to build this';
  const st = programStatus(t, key);
  if (st === 'done') return 'the works already deliver it';
  if (st === 'work') return 'it is already in the shops';
  if (!programLadderReached(t, def)) {
    return 'the art is beyond us — ' + techLevelName(ctx.bookmark, def.unlock.ladder, def.unlock.level)
      + ' (' + def.unlock.level + ') first';
  }
  const owed = programNeedsMissing(t, def);
  if (owed.length) return 'the shops must first deliver ' + owed.join(' and ');
  if (inShops(t) >= Math.max(1, P(ctx, 'maxAtOnce', 2) | 0)) {
    return 'our shops are already building all they can hold';
  }
  if (num(t.treasury) < num(def.cost)) return 'not enough treasury (' + num(def.cost) + ' talents)';
  if (num(t.points && t.points.mar) < num(def.points)) {
    return 'not enough martial points (' + num(def.points) + ' needed)';
  }
  return '';
}

// Begin one. The opening cost is paid on the spot; the monthly development
// line starts next month and runs until delivery.
export function startProgramCore(ctx, tag, key) {
  const why = programStartGate(ctx, tag, key);
  if (why) return { ok: false, why };
  const t = ctx.game.tags[tag];
  const def = ARMS_PROGRAMS[key];
  t.treasury = num(t.treasury) - num(def.cost);
  t.points.mar = num(t.points.mar) - num(def.points);
  programBook(t)[key] = Math.max(1, num(def.months, 12) | 0);
  chronicle(ctx, 'era', (t.name || tag) + ' puts its own shops to work on ' + def.name + '.');
  return { ok: true, name: def.name, months: programBook(t)[key], strain: num(def.strain) };
}

// Abandon one that is still in the shops. Part of the money and a little of
// the thinking come back; the rest was the price of finding out. Some
// programs mend a friendship by dying — the capital that was paying for it
// gets what it asked for (`cancelOpinion`).
export function cancelProgramCore(ctx, tag, key) {
  const t = ctx.game.tags[tag];
  if (!t) return { ok: false, why: 'no such court' };
  const def = ARMS_PROGRAMS[key];
  if (!def) return { ok: false, why: 'no such program' };
  if (programStatus(t, key) !== 'work') return { ok: false, why: 'nothing to stop' };
  const back = Math.round(num(def.cost) * P(ctx, 'cancelRefund', 0.4));
  const pts = Math.round(num(def.points) * P(ctx, 'cancelPoints', 0.25));
  delete programBook(t)[key];
  t.treasury = num(t.treasury) + back;
  t.points.mar = num(t.points.mar) + pts;
  const moved = [];
  for (const other of Object.keys(def.cancelOpinion || {})) {
    if (!ctx.game.tags[other]) continue;
    addOpinion(ctx, other, tag, num(def.cancelOpinion[other]));
    moved.push(ctx.game.tags[other].name || other);
  }
  chronicle(ctx, 'era', (t.name || tag) + ' closes the ' + def.name + ' line. What was learned stays; the aircraft does not.');
  return { ok: true, name: def.name, refund: back, points: pts, pleased: moved };
}

const ARM_WORD = { wing: 'aircraft', armor: 'armor' };

// The player's whole picture of the roster: the cards, plus the one line
// that summarizes them — which gated arms this court now builds at home, and
// whether that is all of them. Null where the chapter or the court has no
// works at all, so the panel block can hide on one test.
export function programsInfo(ctx, tag) {
  const t = ctx.game.tags[tag];
  if (!t || !armsProgramsOn(ctx.bookmark)) return null;
  const defs = armsProgramsFor(ctx.bookmark, tag, t);
  if (!defs.length) return null;
  const own = ownWorksOf(t);
  const roster = defs.map((def) => {
    const status = programStatus(t, def.key);
    const why = status === 'none' ? programStartGate(ctx, tag, def.key) : '';
    return {
      key: def.key, name: def.name, icon: def.icon || 'helmet', desc: def.desc,
      year: def.year || null,
      status,
      monthsLeft: programMonthsLeft(t, def.key),
      months: num(def.months, 12),
      cost: num(def.cost), points: num(def.points), strain: num(def.strain),
      works: def.works || null,
      worksText: def.works ? 'Our own ' + (ARM_WORD[def.works] || def.works) + ', built here' : '',
      ladderReached: programLadderReached(t, def),
      unlockLevel: def.unlock.level,
      unlockText: 'Opens at ' + techLevelName(ctx.bookmark, def.unlock.ladder, def.unlock.level)
        + ' (' + def.unlock.level + ')',
      needs: (def.needs || []).map((n) => (ARMS_PROGRAMS[n] ? ARMS_PROGRAMS[n].name : n)),
      needsMet: programNeedsMet(t, def),
      effects: def.effects || {},
      canStart: status === 'none' && !why,
      whyNot: why,
      canCancel: status === 'work',
    };
  });
  return {
    roster,
    works: Array.from(own),
    worksText: Array.from(own).map((a) => ARM_WORD[a] || a).join(' and '),
    selfSufficient: isSelfArsenal(ctx, tag),
    strain: programStrain(t),
    maxAtOnce: Math.max(1, P(ctx, 'maxAtOnce', 2) | 0),
  };
}

// Monthly. Two passes:
//   1. The clock — one month off each program in the shops, and whatever
//      reaches zero DELIVERS: effects mount permanently, the works open, and
//      the court is told. The development BILL is not charged here: it is a
//      line in incomeBreakdown, so the ledger names it, the treasury pays it
//      once, and the AI's own "can this realm pay its bills" reads it.
//   2. The AI begins its own, one at a time, only from a comfortable purse.
export function monthlyPrograms(ctx) {
  const g = ctx.game;
  if (!armsProgramsOn(ctx.bookmark)) return;
  for (const tag of Object.keys(g.tags)) {
    const t = g.tags[tag];
    if (!t || !t.alive) continue;
    const book = t.programs;
    if (!book || typeof book !== 'object') continue;
    for (const key of Object.keys(book)) {
      const def = ARMS_PROGRAMS[key];
      if (!def) { delete book[key]; continue; }   // a program this build no longer knows
      const left = book[key] | 0;
      if (left <= 0) continue;
      book[key] = left - 1;
      if (book[key] > 0) continue;
      deliverProgram(ctx, tag, key, def);
    }
  }
  aiPrograms(ctx);
}

function deliverProgram(ctx, tag, key, def) {
  const g = ctx.game;
  const t = g.tags[tag];
  applyReformsToTag(ctx.DEFINES, t, tag);
  for (const other of Object.keys(def.opinion || {})) {
    if (g.tags[other]) addOpinion(ctx, other, tag, num(def.opinion[other]));
  }
  chronicle(ctx, 'era', def.name + ' comes out of ' + ((t.name || tag)) + '\'s own shops.');
  if (tag !== g.playerTag) return;
  const free = def.works
    ? ' From today this realm builds its own ' + (ARM_WORD[def.works] || def.works)
      + ' — no supplier\'s permission required.'
    : '';
  const sold = isSelfArsenal(ctx, tag)
    ? ' And the works are deep enough now that other courts may sign for what they make.'
    : '';
  ctx.bus.emit('notify', {
    title: def.name + ' delivered',
    text: def.desc + free + sold,
    type: 'good',
  });
}

// A court that can afford to think past this year's army begins one thing at
// a time, cheapest first — which is how a small state actually built these,
// and which keeps the AI from mortgaging a war to a prototype. And a court
// whose purse turns over while the line is running closes it, which is what
// happened to every works of the age that did not finish.
function aiPrograms(ctx) {
  const g = ctx.game;
  const floor = P(ctx, 'aiTreasuryFloor', 150);
  const ptFloor = P(ctx, 'aiPointFloor', 80);
  const oneAtATime = !!P(ctx, 'aiOne', 1);
  for (const tag of Object.keys(g.tags)) {
    const t = g.tags[tag];
    if (!t || !t.alive || !t.ai || tag === 'REB' || tag === g.playerTag) continue;
    if (isOffmapTag(ctx, tag)) continue;
    const defs = armsProgramsFor(ctx.bookmark, tag, t);
    if (!defs.length) continue;
    // The money ran out. The prototype is wheeled into a hangar and the file
    // is closed — Helwan's whole history in one branch.
    if (inShops(t) > 0 && num(t.treasury) < 0) {
      for (const def of defs) {
        if (programStatus(t, def.key) !== 'work') continue;
        cancelProgramCore(ctx, tag, def.key);
        break;
      }
      continue;
    }
    if (oneAtATime && inShops(t) > 0) continue;
    // Never at war, never on this month's last talent: the works are what
    // peace and a surplus are FOR.
    if ((t.atWarWith || []).length) continue;
    if (num(t.treasury) < floor) continue;
    let pick = null;
    for (const def of defs) {
      if (programStartGate(ctx, tag, def.key)) continue;
      if (num(t.treasury) < floor + num(def.cost)) continue;         // still solvent after paying
      if (num(t.points.mar) < num(def.points) + ptFloor) continue;   // and still able to keep pace
      if (!pick || num(def.cost) < num(pick.cost)) pick = def;
    }
    if (!pick) continue;
    const res = startProgramCore(ctx, tag, pick.key);
    if (!res.ok) warnOnce('aiprog:' + tag, 'AI program refused after gate pass', tag, pick.key, res.why);
  }
}

// The development line, for the ledger and the AI's own books (SPEC §212).
export function programExpense(ctx, tag) {
  if (!armsProgramsOn(ctx && ctx.bookmark)) return 0;
  const t = ctx.game.tags[tag];
  return t ? programStrain(t) : 0;
}
