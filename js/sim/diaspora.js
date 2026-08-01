// Judaea Universalis — writing to the dispersion (SPEC §172). DOM-free.
//
// The Diaspora was one row in "The Powers Beyond the Map" (SPEC §55) with a
// standing bar and two asks. That row is gone. The communities are places on
// the board now: click Alexandria and you can write to the Jews of Alexandria,
// and what you may ask for depends on how large that community is, how it feels
// about your crown, and whether the empire that owns the province notices.
//
// WHY THE MOVE IS NOT COSMETIC. What is genuinely beyond the frame gets a
// different answer now too — since SPEC §180 an off-map power is a seated
// COURT in the ledger, not a panel row. The dispersion needed neither: it
// was never off the map at all. Alexandria is on the board and is the second
// city of the world; so are Babylon, Nehardea, Cyrene and Rome. Modelling them
// as one abstract bar meant the largest Jewish population on earth was a number
// in a panel while the province it lived in sat on the map owned by somebody
// else and said nothing about it. It also meant the player could not be made to
// feel the one thing that matters most about the diaspora strategically: THE
// COMMUNITIES ARE HOSTAGES. Every one of them lives inside somebody else's
// empire, and every favour you ask puts them at risk from the state they live
// in — which is why asking has a detection roll and why the roll's consequence
// lands on THEM, not only on you.
//
// FOUR THINGS YOU CAN ASK FOR, in rising order of what it costs them: letters
// (what a congregation at the centre of an empire hears first), silver (the
// half-shekel gathered early), a word with their patrons, and their sons.
//
// STANDING is per community, 0-100, and it is not a resource you spend down to
// nothing: every ask costs standing, standing recovers slowly, and the recovery
// target is computed from what kind of crown you are — whether you hold the
// holy places, whether the country is expecting a deliverer (§169), and whether
// their host is at war with you. A crown that empties every community in the
// world in one decade finds none of them answering in the next.
//
// PLAYER-ONLY, and only for a Jewish crown, on the same rule as §34's estates.

import {
  num, clamp, chronicle, addOpinion, livingTag, devTotal,
  setDiploCd, diploCdActive, diploCdMonthsLeft,
} from './military.js';
import { DIASPORA, DIASPORA_ASKS, openAt, tagCommunityOf } from '../data/diaspora.js';
import { expectation } from './sacred.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/diaspora]', ...args);
}

export const DIA = {
  // Monthly drift of standing toward the target its situation implies.
  drift: 0.5,
  // A community whose host is at war with us is HARDER to reach, not impossible.
  //
  // The first draft made war a hard block, and it killed the feature in the one
  // chapter the sources talk about most: 66 CE opens with Judaea at war with
  // Rome, so every community from Alexandria to Rome itself went dark on the
  // first tick. That is also the wrong history. Adiabene sent men to the revolt
  // while Rome was prosecuting it; money moved past hostile customs for four
  // centuries; smuggling both is most of what a diaspora IS, strategically.
  //
  // So a war raises the standing a community must have before it will take the
  // risk, and it roughly doubles the chance the letter is read — which lands on
  // them, not on us. Asking anyway is a real option with a real price.
  warNeed: 15,
  warRiskMult: 2.2,
  // What a discovered request costs the community and the crown.
  caughtUnrest: 2.5,
  caughtMonths: 60,
  caughtStanding: -10,
  caughtOpinion: -12,
};

// Is this crown one the dispersion would write back to?
function jewishCrown(ctx) {
  const g = ctx.game;
  const t = g.tags[g.playerTag];
  if (!t || !t.alive || t.ai) return null;
  return t.religion === 'judaism' ? g.playerTag : null;
}

// The community on this province in this year, or null. The window test is
// `openAt` in the data package (SPEC §175) — it used to be written out here and
// again inside the Compendium, and the two copies had already drifted.
export function communityDef(ctx, p) {
  if (!p) return null;
  const y = num(ctx.game.date.y);
  const key = p.canon || p.name;
  for (const d of DIASPORA) {
    if (d.prov !== key && d.prov !== p.name) continue;
    return openAt(d, y) ? d : null;
  }
  return null;
}

// The community hosted by a COURT rather than a cell (SPEC §195), or null.
// The window test is the same `openAt`; the host must also be alive in this
// chapter — the United States is seated in 1948 and in no other era, so the
// entry answers 1948 and nobody else without carrying a chapter list.
export function tagCommunityDef(ctx, tag) {
  const d = tagCommunityOf(tag);
  if (!d) return null;
  const host = ctx.game.tags[tag];
  if (!host || !host.alive) return null;
  return openAt(d, num(ctx.game.date.y)) ? d : null;
}

// Seed (or heal) the community's record. Stored on the PROVINCE, so it saves
// for free and travels with the cell through every era's renaming.
function ensureCommunity(ctx, p, def) {
  if (!p.dia || typeof p.dia !== 'object') p.dia = {};
  if (!Number.isFinite(p.dia.standing)) p.dia.standing = num(def.start, 45);
  return p.dia;
}

// A court-hosted community's record lives on the HOST TAG (SPEC §195) the way
// a province community's lives on its cell: it saves for free, and it goes
// out with the court.
function ensureTagCommunity(host, def) {
  if (!host.dia || typeof host.dia !== 'object') host.dia = {};
  if (!Number.isFinite(host.dia.standing)) host.dia.standing = num(def.start, 45);
  return host.dia;
}

// Where this community's standing is heading, given what kind of crown we are.
// It is deliberately readable in the panel, because a player who cannot see WHY
// Babylon has cooled cannot do anything about it.
export function standingTarget(ctx, p, def) {
  if (!p) return null;
  return standingTargetFor(ctx, p.owner, num(p.dia && p.dia.asked), def);
}

// The same arithmetic with the host named directly (SPEC §195): a court-hosted
// community has no province to read its empire off, but its empire behaves
// exactly the same way.
export function standingTargetFor(ctx, hostTag, asked, def) {
  const g = ctx.game;
  const me = jewishCrown(ctx);
  if (!me) return null;
  const rows = [];
  let v = num(def.start, 45);
  rows.push({ label: 'Long acquaintance', value: Math.round(v) });

  // The holy places. A crown that holds them is the address the dispersion
  // already sends its money to; one that does not is a claimant.
  let holy = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const q = g.provinces[i];
    if (q && q.owner === me && q.controller === me && (q.holy || q.wonder)) holy++;
  }
  if (holy > 0) { v += 15; rows.push({ label: 'We hold the holy places', value: 15 }); }
  else { v -= 10; rows.push({ label: 'We hold no holy place', value: -10 }); }

  // The expectation (§169). A country the world thinks is being delivered gets
  // letters and money it did not ask for.
  const exp = expectation(ctx);
  if (exp >= 25) {
    const bump = Math.round(exp / 5);
    v += bump;
    rows.push({ label: 'The dispersion has heard the news', value: bump });
  }

  // Their host. A community inside an empire at war with us is a community
  // being watched, and it draws in.
  const host = g.tags[hostTag];
  if (host && (host.atWarWith || []).includes(me)) {
    v -= 25;
    rows.push({ label: 'Their empire is at war with us', value: -25 });
  } else if (host && num(host.opinion && host.opinion[me]) <= -50) {
    v -= 10;
    rows.push({ label: 'Their empire dislikes us', value: -10 });
  }

  // And what we have already asked of them.
  if (num(asked) > 0) {
    const w = -Math.min(20, num(asked) * 4);
    v += w;
    rows.push({ label: 'What we have already asked of them', value: w });
  }
  return { value: clamp(v, 0, 100), rows };
}

// ------------------------------------------------------------------ the read
function seatInfo(ctx, seat, provId) {
  const g = ctx.game;
  const me = jewishCrown(ctx);
  const host = g.tags[seat.hostTag];
  const atWar = !!(host && (host.atWarWith || []).includes(me));
  const target = seat.p
    ? standingTarget(ctx, seat.p, seat.def)
    : standingTargetFor(ctx, seat.hostTag, num(seat.store.asked), seat.def);
  return {
    provId: provId || 0,
    prov: seat.p ? seat.p.name : null,
    id: seat.def.prov || seat.def.tag,
    name: seat.def.name,
    blurb: seat.def.blurb,
    size: seat.def.size,
    standing: Math.round(num(seat.store.standing)),
    target: target ? Math.round(target.value) : null,
    why: target ? target.rows : [],
    host: seat.hostTag,
    hostName: (host && host.name) || seat.hostTag,
    atWar,
    asks: DIASPORA_ASKS.map((a) => askInfo(ctx, seat, a)),
  };
}

export function communityInfo(ctx, provId) {
  try {
    const me = jewishCrown(ctx);
    if (!me) return null;
    const p = ctx.byId(provId);
    const def = communityDef(ctx, p);
    if (!p || !def) return null;
    // Our own province is not a diaspora: these are the ones who stayed.
    if (p.owner === me) return null;
    return seatInfo(ctx, provSeat(ctx, p, def), provId);
  } catch (e) { warnOnce('info', 'communityInfo failed', e); return null; }
}

// The court-hosted read (SPEC §195): the same shape the province panel gets,
// served to the host's own nation panel. `prov` is null — there is no cell to
// click, which is the whole reason this entry point exists.
export function tagCommunityInfo(ctx, tag) {
  try {
    const me = jewishCrown(ctx);
    if (!me || tag === me) return null;
    const def = tagCommunityDef(ctx, tag);
    if (!def) return null;
    return seatInfo(ctx, tagSeat(ctx, tag, def), 0);
  } catch (e) { warnOnce('taginfo', 'tagCommunityInfo failed', e); return null; }
}

// A SEAT is where a community sits: a province (`p`, host read off its owner)
// or a court (`p` null, host named directly — SPEC §195). Everything below
// this line works on seats so the two kinds share one set of rules.
function provSeat(ctx, p, def) {
  return { p, def, hostTag: p.owner, store: ensureCommunity(ctx, p, def) };
}
function tagSeat(ctx, tag, def) {
  return { p: null, def, hostTag: tag, store: ensureTagCommunity(ctx.game.tags[tag], def) };
}

// What one ask of this community is worth. Silver is pegged to the HOST
// province's development (SPEC §176): the half-shekel is gathered out of what
// the community's city is worth, so Alexandria at dev 28 sends real money, a
// desert port sends a gesture, and a city that is sacked — or that grows —
// sends what it currently has. A court-hosted community has no cell to read,
// so its entry carries a stand-in `dev` (§195). `treasuryPer` (flat per size)
// is still honoured for any content that declares it.
function yieldOf(ctx, seat, ask) {
  const def = seat.def;
  const dev = seat.p ? devTotal(seat.p) : num(def.dev);
  const silver = num(ask.treasuryPer) + num(ask.treasuryPerDev) * dev;
  return {
    treasury: Math.round(silver * def.size),
    manpower: Math.round(num(ask.manpowerPer) * def.size),
    infl: Math.round(num(ask.inflPer) * def.size),
    opinion: Math.round(num(ask.opinionPer) * def.size),
  };
}

function cdKey(ask, seat) {
  return 'dia:' + ask.id + ':' + (seat.p ? seat.p.id : 'tag:' + seat.hostTag);
}

function askInfo(ctx, seat, ask) {
  const g = ctx.game;
  const me = g.playerTag;
  const t = g.tags[me];
  const st = seat.store;
  const gain = yieldOf(ctx, seat, ask);
  const out = {
    id: ask.id,
    name: ask.name,
    verb: ask.verb,
    desc: ask.desc,
    need: ask.need,
    infl: ask.infl,
    standingCost: ask.standing,
    risk: ask.risk,
    gain,
    can: false,
    whyNot: '',
  };
  const host = g.tags[seat.hostTag];
  const atWar = !!(host && (host.atWarWith || []).includes(me));
  if (atWar) {
    out.need += DIA.warNeed;
    out.risk = Math.min(0.95, out.risk * DIA.warRiskMult);
    out.atWar = true;
  }
  if (ask.war) {
    const fighting = (t.atWarWith || []).some((k) => g.tags[k] && g.tags[k].alive);
    if (!fighting) { out.whyNot = 'They will not send their sons to a country that is not fighting for its life.'; return out; }
  }
  if (num(st.standing) < out.need) {
    out.whyNot = 'They will not go that far for us (' + Math.round(num(st.standing)) + ' of ' + out.need + ' standing'
      + (atWar ? ', and their empire being at war with us raises the bar' : '') + ').';
    return out;
  }
  if (diploCdActive(ctx, cdKey(ask, seat))) {
    out.whyNot = 'We asked them this too recently (' + diploCdMonthsLeft(ctx, cdKey(ask, seat)) + ' months).';
    return out;
  }
  if (ask.infl && num(t.points.infl) < ask.infl) {
    out.whyNot = 'Not enough influence points (' + ask.infl + ' required).';
    return out;
  }
  out.can = true;
  return out;
}

// ------------------------------------------------------------------- the act
function performAsk(ctx, seat, askId) {
  const me = ctx.game.playerTag;
  const def = seat.def;
  const ask = DIASPORA_ASKS.find((a) => a && a.id === askId);
  if (!ask) return { ok: false, why: 'No such request.' };
  const probe = askInfo(ctx, seat, ask);
  if (!probe.can) return { ok: false, why: probe.whyNot };

  const g = ctx.game;
  const t = g.tags[me];
  const st = seat.store;
  const gain = probe.gain;

  if (ask.infl) t.points.infl = Math.max(0, num(t.points.infl) - ask.infl);
  if (gain.treasury) t.treasury = num(t.treasury) + gain.treasury;
  if (gain.manpower) t.manpower = Math.min(num(t.maxManpower) * 1.5, num(t.manpower) + gain.manpower);
  if (gain.infl) t.points.infl = Math.min(999, num(t.points.infl) + gain.infl);
  if (gain.opinion && seat.hostTag && g.tags[seat.hostTag]) addOpinion(ctx, seat.hostTag, me, gain.opinion);

  st.standing = clamp(num(st.standing) + num(ask.standing), 0, 100);
  st.asked = num(st.asked) + 1;
  setDiploCd(ctx, cdKey(ask, seat), ask.cd);

  // The hostage problem. Every favour is a favour asked of people who live
  // under somebody else's law, and when it is traced the price lands on them.
  // A province community's reprisal is on the map — unrest where they live;
  // a court-hosted one has no cell to trouble, so the price is the ledger's —
  // their standing, and their host's regard for us (§195: the procurement
  // network's ships seized, its buyers indicted).
  let caught = false;
  try { caught = ctx.rng.chance(num(probe.risk, ask.risk)); } catch (e) { warnOnce('roll', 'risk roll failed', e); }
  if (caught) {
    if (seat.p) {
      seat.p.modifiers = (seat.p.modifiers || []).filter((m) => m && m.id !== 'dia_reprisal');
      seat.p.modifiers.push({
        id: 'dia_reprisal',
        name: 'Reprisals Against the Community',
        months: DIA.caughtMonths,
        effects: { unrest: DIA.caughtUnrest },
      });
    }
    st.standing = clamp(num(st.standing) + DIA.caughtStanding, 0, 100);
    if (seat.hostTag && g.tags[seat.hostTag]) addOpinion(ctx, seat.hostTag, me, DIA.caughtOpinion);
    chronicle(ctx, 'politics',
      'Our correspondence with ' + def.name + ' is in the hands of '
      + ((g.tags[seat.hostTag] && g.tags[seat.hostTag].name) || seat.hostTag) + '. They will answer for it, not us.');
    try {
      if (ctx.bus) {
        ctx.bus.emit('notify', {
          title: 'The letter was read',
          text: def.name + ' are answering to their own rulers for our request. '
            + 'They will remember that it was our asking that did it.',
          type: 'bad', provName: seat.p ? seat.p.name : undefined,
        });
      }
    } catch (e) { warnOnce('notify', 'reprisal notice failed', e); }
  } else {
    chronicle(ctx, 'era', def.name + ': ' + ask.verb + '.');
  }
  return {
    ok: true, caught, name: def.name, ask: ask.id, verb: ask.verb, gain,
    standing: Math.round(num(st.standing)),
  };
}

export function askCommunity(ctx, provId, askId) {
  try {
    const me = jewishCrown(ctx);
    if (!me) return { ok: false, why: 'This crown has no dispersion to write to.' };
    const p = ctx.byId(provId);
    const def = communityDef(ctx, p);
    if (!p || !def) return { ok: false, why: 'There is no community here.' };
    if (p.owner === me) return { ok: false, why: 'They are not a dispersion; they are ours.' };
    return performAsk(ctx, provSeat(ctx, p, def), askId);
  } catch (e) { warnOnce('ask', 'askCommunity failed', e); return { ok: false, why: 'The letter did not go.' }; }
}

// SPEC §195: the same act against a court-hosted community, from the host's
// own nation panel.
export function askTagCommunity(ctx, tag, askId) {
  try {
    const me = jewishCrown(ctx);
    if (!me) return { ok: false, why: 'This crown has no dispersion to write to.' };
    if (tag === me) return { ok: false, why: 'They are not a dispersion; they are ours.' };
    const def = tagCommunityDef(ctx, tag);
    if (!def) return { ok: false, why: 'There is no community there.' };
    return performAsk(ctx, tagSeat(ctx, tag, def), askId);
  } catch (e) { warnOnce('tagask', 'askTagCommunity failed', e); return { ok: false, why: 'The letter did not go.' }; }
}

// Every community on the board, for the ledger and for a "who will answer us"
// read that does not require clicking twenty provinces. Court-hosted seats
// (§195) ride along with provId 0 — the ledger names their host instead.
export function diasporaReport(ctx) {
  try {
    const me = jewishCrown(ctx);
    if (!me) return null;
    const g = ctx.game;
    const rows = [];
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (!p || p.impassable || p.owner === me) continue;
      const def = communityDef(ctx, p);
      if (!def) continue;
      const st = ensureCommunity(ctx, p, def);
      rows.push({
        provId: i,
        prov: p.name,
        name: def.name,
        size: def.size,
        standing: Math.round(num(st.standing)),
        host: p.owner,
      });
    }
    for (const d of DIASPORA) {
      if (!d.tag || d.tag === me) continue;
      const def = tagCommunityDef(ctx, d.tag);
      if (!def) continue;
      const st = ensureTagCommunity(g.tags[d.tag], def);
      rows.push({
        provId: 0,
        prov: (g.tags[d.tag] && g.tags[d.tag].name) || d.tag,
        name: def.name,
        size: def.size,
        standing: Math.round(num(st.standing)),
        host: d.tag,
      });
    }
    rows.sort((a, b) => b.size - a.size || b.standing - a.standing);
    return rows;
  } catch (e) { warnOnce('report', 'diasporaReport failed', e); return null; }
}

// ------------------------------------------------------------------- monthly
export function monthlyDiaspora(ctx) {
  const g = ctx.game;
  if (!g || !g.provinces) return;
  const me = jewishCrown(ctx);
  if (!me) return;
  for (let i = 1; i < g.provinces.length; i++) {
    try {
      const p = g.provinces[i];
      if (!p || p.impassable) continue;
      const def = communityDef(ctx, p);
      if (!def) continue;
      if (p.owner === me) continue;
      const st = ensureCommunity(ctx, p, def);
      const target = standingTarget(ctx, p, def);
      if (!target) continue;
      const d = target.value - num(st.standing);
      if (Math.abs(d) < 0.01) continue;
      st.standing = clamp(num(st.standing) + Math.sign(d) * Math.min(DIA.drift, Math.abs(d)), 0, 100);
      // What we asked of them fades as the generation that was asked does.
      if (g.date.m === 1 && num(st.asked) > 0) st.asked = Math.max(0, num(st.asked) - 0.5);
    } catch (e) { warnOnce('tick:' + i, 'community tick failed', e); }
  }
  // The court-hosted seats drift on the same rule (§195).
  for (const d of DIASPORA) {
    if (!d.tag || d.tag === me) continue;
    try {
      const def = tagCommunityDef(ctx, d.tag);
      if (!def) continue;
      const st = ensureTagCommunity(g.tags[d.tag], def);
      const target = standingTargetFor(ctx, d.tag, num(st.asked), def);
      if (!target) continue;
      const dd = target.value - num(st.standing);
      if (Math.abs(dd) >= 0.01) {
        st.standing = clamp(num(st.standing) + Math.sign(dd) * Math.min(DIA.drift, Math.abs(dd)), 0, 100);
      }
      if (g.date.m === 1 && num(st.asked) > 0) st.asked = Math.max(0, num(st.asked) - 0.5);
    } catch (e) { warnOnce('tagtick:' + d.tag, 'court community tick failed', e); }
  }
}
