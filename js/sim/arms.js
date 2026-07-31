// Judaea Universalis — the weapons transfer agreements (SPEC §181). DOM-free.
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
// and the AI's own deal-seeking.

import {
  num, chronicle, opinionOf, addOpinion, setDiploCd, diploCdActive, diploCdMonthsLeft,
  armsMarketOn, isArsenal, armsDealBook, armsDealState, isOffmapTag,
} from './military.js';

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
  if (!isArsenal(ctx, supplier)) return 'their works export nothing';
  if (isArsenal(ctx, client)) return 'our own arsenal builds every pattern we need';
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
    if (!isArsenal(ctx, other) && !isCurrent) return null;
    const st = armsDealState(ctx, me);
    const why = armsSignGate(ctx, me, other);
    const curName = book[me] && g.tags[book[me]] ? (g.tags[book[me]].name || book[me]) : book[me] || null;
    return {
      offered: isArsenal(ctx, other) && !isArsenal(ctx, me),
      weAreArsenal: isArsenal(ctx, me),
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
  for (const tag of Object.keys(g.tags)) {
    const t = g.tags[tag];
    if (!t || !t.alive || !t.ai || tag === 'REB') continue;
    if (tag === g.playerTag) continue;
    if (isArsenal(ctx, tag) || isOffmapTag(ctx, tag)) continue;
    if (book[tag]) continue;
    const m = ctx.bookmark.armsMarket;
    let best = null;
    for (const sup of m.arsenals || []) {
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
