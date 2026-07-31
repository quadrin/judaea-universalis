// Judaea Universalis — financial aid from the donor courts (SPEC §184). DOM-free.
//
// §180 retired "ask for credits" with the note that subsidies cover the one
// direction money actually flowed — and then left subsidies a payer's verb.
// This module is the taker's side of that sentence: where a bookmark names
// its donor courts, any other court may petition one for aid. The petition
// is weighed on the donor's regard for the asker, the package is sized to
// the donor's own purse, and a grant is an ordinary §24 subsidy row — the
// ledger, the panels, the countdown and the default rule all come free.
//
// A granted package runs its term whatever the friendship does afterward —
// a voted credit clears — and dies early only to the loud ruptures: war
// between the two courts, or the donor signing a §100 embargo. Asking
// leaves a mark on the donor's regard, so standing aid needs standing
// courtship, and each donor hears one petition per cooldown window.

import {
  num, chronicle, opinionOf, addOpinion, setDiploCd, diploCdActive, diploCdMonthsLeft,
  isOffmapTag,
} from './military.js';
import { incomeBreakdown } from './economy.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/aid]', ...args);
}

function A(ctx, key, dflt) {
  const t = ctx.DEFINES.AID || {};
  return num(t[key], dflt);
}

const aidCdKey = (asker, donor) => asker + '>' + donor + ':aid';
const nameOf = (g, tag) => (g.tags[tag] && g.tags[tag].name) || tag;

export function aidOn(ctx) {
  const fa = ctx && ctx.bookmark && ctx.bookmark.financialAid;
  return !!(fa && Array.isArray(fa.donors) && fa.donors.length);
}
export function aidDonors(ctx) {
  return aidOn(ctx) ? ctx.bookmark.financialAid.donors : [];
}
export function isAidDonor(ctx, tag) {
  return aidDonors(ctx).indexOf(tag) >= 0;
}

// The live aid package flowing TO this court, if any — aid rides the §24
// subsidy book with an `aid` marker, so this is a read, not a parallel state.
export function aidFlowTo(ctx, tag) {
  const g = ctx.game;
  for (const s of g.subsidies || []) {
    if (s && s.aid && s.to === tag && num(s.monthsLeft) > 0) return s;
  }
  return null;
}

// What this donor's purse offers a petitioner: a share of its own monthly
// books (income, tribute, and the §180 stipend for a seat beyond the frame),
// floored so a shallow purse still means something and capped so even
// Washington votes line items. Sized at grant time and frozen in the row.
export function aidAmount(ctx, donor) {
  let means = 0;
  try {
    const b = incomeBreakdown(ctx, donor);
    means = num(b.income) + num(b.tributeIn) + num(b.offmapIn);
  } catch (e) { warnOnce('means', 'aidAmount breakdown failed', e); }
  const raw = Math.round(means * A(ctx, 'incomeShare', 0.25));
  return Math.max(A(ctx, 'amountFloor', 5), Math.min(A(ctx, 'amountCap', 25), raw));
}

// Why this asker may not petition this donor right now — '' when it may.
export function aidRequestGate(ctx, asker, donor) {
  const g = ctx.game;
  const a = g.tags[asker], d = g.tags[donor];
  if (!aidOn(ctx)) return 'this age has no donor courts to petition';
  if (!a || !a.alive || !d || !d.alive) return 'no such court';
  if (asker === donor) return 'our own purse is the question';
  if (!isAidDonor(ctx, donor)) return 'their treasury underwrites nobody';
  if (isAidDonor(ctx, asker)) return 'ours is a purse others petition';
  const flow = aidFlowTo(ctx, asker);
  if (flow) {
    return flow.from === donor
      ? 'their aid already flows (' + num(flow.monthsLeft) + ' months left)'
      : 'the treasury already leans on ' + nameOf(g, flow.from) + ' — one purse at a time';
  }
  if ((a.atWarWith || []).indexOf(donor) >= 0) return 'we are at war with them';
  if (g.embargoes && g.embargoes[donor + '>' + asker]) {
    return nameOf(g, donor) + ' has closed its markets to us';
  }
  if (g.embargoes && g.embargoes[asker + '>' + donor]) {
    return 'our own markets are closed to them — lift the embargo first';
  }
  if (diploCdActive(ctx, aidCdKey(asker, donor))) {
    return 'their patience with petitions is spent (' + diploCdMonthsLeft(ctx, aidCdKey(asker, donor)) + ' months)';
  }
  const need = A(ctx, 'need', 55);
  if (opinionOf(ctx, donor, asker) < need) {
    return 'their regard for us is too low (' + need + ' required)';
  }
  // The purse must be real (SPEC §101's discipline): a donor grants from
  // income it actually clears or a war chest that covers the whole package.
  const amount = aidAmount(ctx, donor);
  const months = Math.max(1, A(ctx, 'months', 12) | 0);
  let net = 0;
  try { net = num(incomeBreakdown(ctx, donor).net); } catch (e) { net = 0; }
  if (net < amount && num(d.treasury) < amount * months) {
    return 'their own books cannot carry it';
  }
  const infl = A(ctx, 'infl', 20);
  if (num(a.points && a.points.infl) < infl) return 'not enough influence (' + infl + ' required)';
  return '';
}

// Petition the donor: the mission costs influence, the grant opens a §24
// subsidy row from their treasury, the asking leaves a mark on their regard,
// and the donor hears no second petition inside the window.
export function requestAidCore(ctx, asker, donor) {
  const g = ctx.game;
  const why = aidRequestGate(ctx, asker, donor);
  if (why) return { ok: false, why };
  const a = g.tags[asker];
  const amount = aidAmount(ctx, donor);
  const months = Math.max(1, A(ctx, 'months', 12) | 0);
  if (!a.points) a.points = {};
  a.points.infl = num(a.points.infl) - A(ctx, 'infl', 20);
  if (!Array.isArray(g.subsidies)) g.subsidies = [];
  g.subsidies.push({ from: donor, to: asker, amount, monthsLeft: months, aid: true });
  addOpinion(ctx, donor, asker, A(ctx, 'askOpinion', -5));
  setDiploCd(ctx, aidCdKey(asker, donor), Math.max(1, A(ctx, 'cdMonths', 30) | 0));
  chronicle(ctx, 'diplo', nameOf(g, donor) + ' opens its purse to ' + nameOf(g, asker)
    + ': ' + amount + ' talents a month for ' + months + ' months.');
  return { ok: true, donorName: nameOf(g, donor), amount, months };
}

// The UI's whole picture of one pair, from the player's chair. Null where
// the age names no donors or the other court is neither donor nor the purse
// we already lean on.
export function aidInfo(ctx, me, other) {
  try {
    if (!aidOn(ctx)) return null;
    const g = ctx.game;
    if (!g.tags[other]) return null;
    const flow = aidFlowTo(ctx, me);
    const fromThem = !!(flow && flow.from === other);
    if (!isAidDonor(ctx, other) && !fromThem) return null;
    const why = aidRequestGate(ctx, me, other);
    return {
      offered: isAidDonor(ctx, other) && !isAidDonor(ctx, me),
      flowing: fromThem,
      amount: fromThem ? num(flow.amount) : aidAmount(ctx, other),
      monthsLeft: fromThem ? num(flow.monthsLeft) : 0,
      months: Math.max(1, A(ctx, 'months', 12) | 0),
      can: !why, whyNot: why,
      need: A(ctx, 'need', 55), infl: A(ctx, 'infl', 20),
      askOpinion: A(ctx, 'askOpinion', -5), cdMonths: A(ctx, 'cdMonths', 30),
      theirRegard: Math.round(opinionOf(ctx, other, me)),
      donorName: nameOf(g, other),
    };
  } catch (e) { warnOnce('info', 'aidInfo failed', e); return null; }
}

// Monthly. Two passes, both cheap:
//   1. Ruptures — a package survives cooling (a voted credit clears), but
//      war between the two courts or the donor's §100 embargo stops the
//      checks that month, with a notice. Dead courts are already the §24
//      sweep's business.
//   2. The AI petitions — a poor court asks the friendliest donor that
//      will grant, paying the same influence at the same bar. Donor AI is
//      passive: a purse, not a policy.
export function monthlyAid(ctx) {
  const g = ctx.game;
  if (!aidOn(ctx)) return;
  if (Array.isArray(g.subsidies) && g.subsidies.length) {
    const keep = [];
    for (const s of g.subsidies) {
      if (!s || !s.aid || !(num(s.monthsLeft) > 0)) { keep.push(s); continue; }
      const taker = g.tags[s.to];
      let cut = '';
      if (taker && (taker.atWarWith || []).indexOf(s.from) >= 0) cut = 'war has come between the courts';
      else if (g.embargoes && g.embargoes[s.from + '>' + s.to]) cut = nameOf(g, s.from) + ' closed its markets';
      if (!cut) { keep.push(s); continue; }
      chronicle(ctx, 'diplo', nameOf(g, s.from) + ' stops the aid to ' + nameOf(g, s.to) + ' — ' + cut + '.');
      if (s.to === g.playerTag || s.from === g.playerTag) {
        ctx.bus.emit('notify', {
          title: 'The aid stops',
          text: nameOf(g, s.from) + ' ends the aid to ' + nameOf(g, s.to) + ' — ' + cut + '.',
          type: s.to === g.playerTag ? 'bad' : 'info',
        });
      }
    }
    g.subsidies = keep;
  }
  for (const tag of Object.keys(g.tags)) {
    const t = g.tags[tag];
    if (!t || !t.alive || !t.ai || tag === 'REB') continue;
    if (tag === g.playerTag) continue;
    if (isAidDonor(ctx, tag) || isOffmapTag(ctx, tag)) continue;
    if (num(t.treasury) >= A(ctx, 'aiFloor', 30)) continue;
    let best = null;
    for (const donor of aidDonors(ctx)) {
      if (aidRequestGate(ctx, tag, donor)) continue;
      const regard = opinionOf(ctx, donor, tag);
      if (!best || regard > best.regard) best = { donor, regard };
    }
    if (best) {
      const res = requestAidCore(ctx, tag, best.donor);
      if (!res.ok) warnOnce('ai:' + tag, 'AI aid petition refused after gate pass', tag, best.donor, res.why);
    }
  }
}
