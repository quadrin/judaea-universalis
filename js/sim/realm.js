// Judaea Universalis — realm systems: mortal rulers & succession, post-conquest
// integration (autonomy & conversion), mission chains, and the yields of holy
// sites & wonders. DOM-free.

import { num, clamp, GENERAL_NAMES, courtNamePool, resolveTagMult, resolveTagAdd, chronicle, marriageCount, DIPLO, resolveDisplayName, mechanicOn, declaredRivals } from './military.js';
import { FORMABLES } from '../data/formables.js';
import { TRADE_ROUTES } from '../data/trade.js';
import { fireEvent } from './events.js';
import { raiseCrisisTo } from './crisis.js';
import { shiftPopToReligion, driftPopToReligion, shareOf, popTotal } from './population.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/realm]', ...args);
}

// ---------------------------------------------------------------- courtiers
function weightedIndex(rng, weights) {
  let total = 0;
  for (const w of weights) total += w;
  let r = rng.next() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}
// A random member of the court: named for the tag's culture group, skills 0-6
// weighted toward 1-3 (great rulers are rare).
export function rollCourtier(ctx, tag) {
  // The chapter's own pool where it names one (SPEC §143) — this is the
  // function that seats a successor when a ruler dies.
  const pool = courtNamePool(ctx, tag);
  const skill = () => weightedIndex(ctx.rng, [2, 5, 6, 4, 2, 1, 0.5]);
  return { name: ctx.rng.pick(pool), gov: skill(), infl: skill(), mar: skill(), age: 30 + ctx.rng.int(21) };
}

// ---------------------------------------------------------------- succession
function crown(ctx, tag, heir, oldTitle) {
  const t = ctx.game.tags[tag];
  t.ruler = {
    name: String(heir.name || 'Successor'),
    title: String(oldTitle || 'Ruler'),
    gov: clamp(Math.round(num(heir.gov, 2)), 0, 6),
    infl: clamp(Math.round(num(heir.infl, 2)), 0, 6),
    mar: clamp(Math.round(num(heir.mar, 2)), 0, 6),
    age: Math.max(0, Math.round(num(heir.age, 30))),
  };
  t.heir = null;
  t.regency = false;
}

// The player's own successions deserve a full event card, not a six-second
// toast. Dynamic events live in ctx.dynEvents (rebuilt per session, never
// saved); reviveGame drops any dyn_* entries left pending in an old save.
function successionCard(ctx, title, text) {
  const g = ctx.game;
  if (!ctx.dynEvents) return false;
  g.flags._dynEvN = num(g.flags._dynEvN, 0) + 1;
  const ev = {
    id: 'dyn_succession_' + g.flags._dynEvN,
    title,
    desc: text,
    forTag: g.playerTag,
    options: [{ label: 'The realm endures', effects() {} }],
  };
  ctx.dynEvents.set(ev.id, ev);
  try { fireEvent(ctx, ev); return true; } catch (e) { warnOnce('dynEv', 'succession card failed', e); return false; }
}

// The better of two candidates from the court — how republics choose (SPEC §25).
function electWinner(ctx, tag) {
  const a = rollCourtier(ctx, tag);
  const b = rollCourtier(ctx, tag);
  const s = (c) => num(c.gov) + num(c.infl) + num(c.mar);
  return s(a) >= s(b) ? a : b;
}

// The one true death path: crowns the heir, installs a regency for a child
// heir, or lets an unrelated courtier seize power. Republics hold an emergency
// election instead; theocracies never seat a child regency (SPEC §25). Exposed
// so scripted events (Nero, Mattathias) can kill rulers through this machinery.
export function rulerDies(ctx, tag, causeText) {
  const g = ctx.game;
  const t = g.tags[tag];
  if (!t || !t.ruler) return;
  const old = t.ruler;
  const title = old.title || 'Ruler';
  const player = tag === g.playerTag;
  let text;
  if (t.govType === 'republic') {
    const w = electWinner(ctx, tag);
    t.ruler = { name: w.name, title, gov: w.gov, infl: w.infl, mar: w.mar, age: w.age };
    t.heir = null;
    t.regency = false;
    t.electionIn = 48;
    t.legitimacy = clamp(num(t.legitimacy) - 5, 0, 100);
    text = `${old.name} ${causeText || 'has died'} in office. An emergency election raises ${w.name} to the ${title.toLowerCase()}. (−5 legitimacy)`;
  } else if (t.heir && num(t.heir.age, 20) >= 16) {
    const heirName = t.heir.name;
    crown(ctx, tag, t.heir, title);
    t.legitimacy = clamp(num(t.legitimacy) - 10, 0, 100);
    text = `${old.name} ${causeText || 'has died'}. ${heirName} succeeds as ${title}. (−10 legitimacy)`;
  } else if (t.heir && t.govType !== 'theocracy') {
    t.regency = true;
    t.regencyTitle = title; // restored when the heir comes of age
    t.ruler = { name: 'Regency Council', title: 'Regents for ' + t.heir.name, gov: 1, infl: 2, mar: 1, age: 0 };
    t.legitimacy = clamp(num(t.legitimacy) - 20, 0, 100);
    text = `${old.name} ${causeText || 'has died'}. ${t.heir.name} is a child of ${Math.max(0, num(t.heir.age, 0))}; a council rules in the heir's name. (−20 legitimacy)`;
  } else if (t.heir) {
    // Theocracy with a child heir: the elders will not anoint a minor — a
    // senior priest takes office and the young heir waits their turn.
    const nr = rollCourtier(ctx, tag);
    t.ruler = { name: nr.name, title, gov: nr.gov, infl: nr.infl, mar: nr.mar, age: Math.max(50, nr.age) };
    t.legitimacy = clamp(num(t.legitimacy) - 15, 0, 100);
    text = `${old.name} ${causeText || 'has died'}. The elders will not anoint a child: ${nr.name} takes the ${title.toLowerCase()} while ${t.heir.name} comes of age. (−15 legitimacy)`;
  } else {
    const nr = rollCourtier(ctx, tag);
    t.ruler = { name: nr.name, title, gov: nr.gov, infl: nr.infl, mar: nr.mar, age: nr.age };
    t.legitimacy = clamp(num(t.legitimacy) - 25, 0, 100);
    t.stability = clamp(num(t.stability) - 1, -3, 3);
    // A death with no named heir does not simmer — it lands (SPEC §98). The
    // succession crisis opens at the second stage: rival claims, and foreign
    // courts with marriage contracts suddenly interested in our constitution.
    try { raiseCrisisTo(ctx, tag, 'succession', 70); } catch (e) { warnOnce('crisis', 'stoke failed', e); }
    text = `${old.name} ${causeText || 'has died'} with no designated heir. ${nr.name} takes the ${title.toLowerCase()} amid whispers and drawn knives — and the question of the succession is open. (−25 legitimacy, −1 stability)`;
  }
  chronicle(ctx, 'ruler', (t.name || tag) + ': ' + text);
  // The player's own succession pauses the game with a proper card; other
  // courts' deaths stay world news in the toast stream.
  if (!(player && successionCard(ctx, 'Death of ' + old.name, text))) {
    ctx.bus.emit('notify', {
      title: 'Death of ' + old.name,
      text,
      type: player ? 'bad' : 'info',
    });
  }
}

// The monthly chance a heirless court is blessed with an heir: the base
// rate, multiplied up by living royal marriages (SPEC §62), capped.
export function heirChance(ctx, tag) {
  const base = 0.015;
  const bonus = num(DIPLO.marryHeirBonus, 1) * marriageCount(ctx, tag);
  return base * Math.min(num(DIPLO.marryHeirCap, 3), 1 + bonus);
}

// Monthly: aging (each January), heir appearances, regencies ending, and the
// actuarial tables. Scripted deaths (events) dominate the playable window;
// this keeps long campaigns honest.
export function monthlySuccession(ctx) {
  const g = ctx.game;
  for (const tag of Object.keys(g.tags)) {
    if (tag === 'REB') continue;
    const t = g.tags[tag];
    if (!t || !t.alive || !t.ruler) continue;
    try {
      const r = t.ruler;
      if (g.date.m === 1) {
        if (!t.regency) r.age = num(r.age, 45) + 1;
        if (t.heir) t.heir.age = num(t.heir.age, 20) + 1;
        if (t.regency && t.heir && num(t.heir.age) >= 16) {
          const heirName = t.heir.name;
          crown(ctx, tag, t.heir, t.regencyTitle || 'Ruler');
          t.regencyTitle = null;
          if (tag === g.playerTag) {
            ctx.bus.emit('notify', {
              title: 'The heir comes of age',
              text: heirName + ' takes up the rule in their own name; the regency is dissolved.',
              type: 'good',
            });
          }
        }
      }
      // Republics vote (SPEC §25): every four years the nation chooses, and
      // the incumbent must beat the field to stay.
      if (t.govType === 'republic') {
        t.heir = null;
        t.regency = false;
        t.electionIn = num(t.electionIn, 48) - 1;
        if (t.electionIn <= 0) {
          const inc = { name: r.name, gov: num(r.gov, 2), infl: num(r.infl, 2), mar: num(r.mar, 2), age: num(r.age, 50) };
          const ch = electWinner(ctx, tag);
          const score = (c) => num(c.gov) + num(c.infl) + num(c.mar);
          const winner = score(inc) >= score(ch) ? inc : ch;
          const reelected = winner === inc;
          t.ruler = { name: winner.name, title: r.title || 'Head of Government', gov: winner.gov, infl: winner.infl, mar: winner.mar, age: winner.age };
          t.electionIn = 48;
          t.legitimacy = clamp(num(t.legitimacy) + 5, 0, 100);
          chronicle(ctx, 'ruler', (t.name || tag) + ': ' + (reelected
            ? r.name + ' is returned to office at the polls.'
            : ch.name + ' wins the election; ' + r.name + ' leaves office.'));
          if (tag === g.playerTag) {
            ctx.bus.emit('notify', {
              title: 'The nation votes',
              text: reelected
                ? r.name + ' is returned to office with a fresh mandate (+5 legitimacy).'
                : ch.name + ' (' + ch.gov + '/' + ch.infl + '/' + ch.mar + ') wins the election and takes office (+5 legitimacy).',
              type: 'good',
            });
          }
        }
      }
      // A court without an heir designates one, eventually. A married
      // dynasty is likelier to be blessed (SPEC §62): each living royal
      // marriage raises the monthly chance, capped.
      if (!t.heir && !t.regency && t.govType !== 'republic' && ctx.rng.chance(heirChance(ctx, tag))) {
        const heir = rollCourtier(ctx, tag);
        heir.age = clamp(num(r.age, 45) - 26, 14, 45);
        t.heir = heir;
        if (tag === g.playerTag) {
          ctx.bus.emit('notify', {
            title: 'An heir for the realm',
            text: heir.name + ' is acknowledged as heir (' + heir.gov + '/' + heir.infl + '/' + heir.mar + ', age ' + heir.age + ').',
            type: 'info',
          });
        }
      }
      if (t.regency) continue; // councils are replaced, not buried
      const age = num(r.age, 45);
      const p = Math.min(0.02, 0.0004 * Math.pow(1.09, Math.max(0, age - 50)));
      if (ctx.rng.chance(p)) rulerDies(ctx, tag, 'has died');
    } catch (e) { warnOnce('succ:' + tag, 'succession failed for', tag, e); }
  }
}

// ---------------------------------------------------------------- integration
// Conversion work started by actions.convertProvince: 12 months of unrest, then
// the province adopts the state faith. Occupation or a change of owner voids it.
export function monthlyIntegration(ctx) {
  const g = ctx.game;
  // Reforms and modifiers can grant a steady legitimacy drip.
  for (const k of Object.keys(g.tags)) {
    const t = g.tags[k];
    if (!t || !t.alive || k === 'REB') continue;
    const drip = resolveTagAdd(ctx, k, 'legitimacyAdd');
    if (drip) t.legitimacy = Math.max(0, Math.min(100, num(t.legitimacy) + drip));
  }
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || !p.conversion) continue;
    try {
      const c = p.conversion;
      const owner = g.tags[p.owner];
      if (!owner || p.owner !== c.by || p.religion === owner.religion) {
        p.conversion = null;
        continue;
      }
      if (p.controller !== p.owner) continue; // the missionaries wait out the occupation
      c.monthsLeft = num(c.monthsLeft, 1) - resolveTagMult(ctx, p.owner, 'convertMult');
      if (c.monthsLeft > 0) continue;
      p.conversion = null;
      // With a makeup (SPEC §56), conversion moves PEOPLE — every foreign
      // community adopts the state faith and the majority follows; without
      // one, the old binary flip stands.
      if (Array.isArray(p.pop) && p.pop.length) shiftPopToReligion(p, owner.religion, 1);
      else p.religion = owner.religion;
      p.modifiers = (p.modifiers || []).filter((m) => m && m.id !== 'religious_tension');
      if (p.owner === g.playerTag) {
        const rel = ctx.DEFINES.RELIGIONS ? ctx.DEFINES.RELIGIONS[p.religion] : null;
        ctx.bus.emit('notify', {
          title: 'A province converted',
          text: p.name + ' now follows ' + ((rel && rel.name) || p.religion) + '.',
          type: 'good', provName: p.name,
        });
      }
    } catch (e) { warnOnce('conv:' + i, 'conversion tick failed for province', i, e); }
  }
  // Integration projects (SPEC §56): schools, land titles, the civil service.
  // Slow, unglamorous, and it works — each finished program raises the
  // province's integration and the communal unrest fades to match.
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || !p.integrating) continue;
    try {
      if (p.owner !== p.integrating.by) { p.integrating = null; continue; }
      if (p.controller !== p.owner) continue; // the program waits out the occupation
      // Integration answers to a realm-wide multiplier the way conversion
      // does (SPEC §126). A standing policy on the conquered — the sword, the
      // tribute roll, the settlements, the single law — is exactly a claim
      // about how fast a province stops being foreign, and before this the
      // only lever content could pull was `convertMult`, which changes the
      // religion and not the allegiance. They are different questions and the
      // Hasmoneans answered them separately.
      p.integrating.monthsLeft = num(p.integrating.monthsLeft, 1)
        - resolveTagMult(ctx, p.owner, 'integrateMult');
      if (p.integrating.monthsLeft > 0) continue;
      p.integrating = null;
      p.integration = Math.min(1, num(p.integration) + 0.34);
      // Full integration lets the owner write its own name on the map (SPEC §66).
      if (p.integration >= 1) resolveDisplayName(ctx, p);
      p.modifiers = (p.modifiers || []).filter((m) => m && m.id !== 'reforms_resented');
      if (p.owner === g.playerTag) {
        ctx.bus.emit('notify', {
          title: 'Integration advances',
          text: p.name + ' is ' + Math.round(p.integration * 100) + '% integrated: its communities answer to the state, not against it.',
          type: 'good', provName: p.name,
        });
      }
    } catch (e) { warnOnce('integ:' + i, 'integration tick failed for province', i, e); }
  }
}

// ---------------------------------------------------------------- faith drift
// A faith that no state is sponsoring (SPEC §104). Every conversion path the
// game had before this one ran through a treasury: `convertProvince` spends
// influence to bring a province the state ALREADY OWNS to the faith the state
// ALREADY HOLDS. Nothing modelled a religion crossing a border on its own —
// which is the only way the largest religious change of the period actually
// happened.
//
// The bookmark owns the politics and the engine owns the arithmetic:
//
//   faithDrift: {
//     christianity: {
//       from: ['hellenism', 'roman_cult'],   // drawn on freely
//       resistedBy: { judaism: 0.35 },       // drawn on at (1 − value), and
//                                            //   only where the faith is
//                                            //   already the local weather
//       core: 0.06,                          // the remnant that never goes
//       seeds: ['Antioch', 'Alexandria'],    // where it is already present
//       seedOwner: 'RSH',                    // ...and wherever this crown rules
//       seedShare: 0.012,                    // the congregation a seed keeps
//       curve: (year, ctx) => 0..1,          // how strong the age's pull is
//       vigor: 0.0009,                       // the logistic growth constant
//       spreadsAlong: 'trade',               // sea lanes count as neighbours
//       monthlyCap: 0.004,                   // the rail: share moved / month
//     },
//   }
//
// Three properties are deliberate. It is NOT reversible: `convertProvince`
// can reclaim a province's state faith, and the drift resumes the following
// month. It moves people (`p.pop` shares) and never writes `p.religion`
// directly — the majority community names the province, as it always has. And
// it is gated by `mechanics.faithDrift`, so an age with no missionary religion
// on the map is untouched.

// The strongest congregation within reach: an adjacent province, or — where
// the table says the faith travelled by trade — any other stop on a route
// this province sits on. Christianity was an urban, sea-lane religion before
// it was a rural one; Alexandria is nearer to Antioch than the Negev is.
function faithReach(ctx, p, religion, cfg) {
  const g = ctx.game;
  let best = 0;
  const nb = ctx.geom && ctx.geom.neighbors && ctx.geom.neighbors[p.id];
  if (nb) {
    for (const id of nb) {
      const q = g.provinces[id];
      if (!q || q.impassable) continue;
      const s = shareOf(q, religion);
      if (s > best) best = s;
    }
  }
  if (cfg.spreadsAlong === 'trade') {
    for (const route of TRADE_ROUTES) {
      if (!route || !Array.isArray(route.stops)) continue;
      if (route.stops.indexOf(p.canon || p.name) < 0 && route.stops.indexOf(p.name) < 0) continue;
      for (const stop of route.stops) {
        const q = ctx.prov(stop);
        if (!q || q === p || q.impassable) continue;
        const s = shareOf(q, religion) * 0.75; // a lane is thinner than a border
        if (s > best) best = s;
      }
    }
  }
  return best;
}

// One faith's month across the whole map.
function driftOneFaith(ctx, religion, cfg) {
  const g = ctx.game;
  // The age's own pull. `curve` gets the year and the context: a faith whose
  // spread was switched on by a conquest and priced by a tax needs to read
  // the flags that conquest set (SPEC §104, the jizya gradient).
  const strength = clamp(num(typeof cfg.curve === 'function' ? cfg.curve(g.date.y, ctx) : cfg.curve, 0), 0, 1);
  if (strength <= 0) return;
  const vigor = num(cfg.vigor, 0.0009);
  const cap = num(cfg.monthlyCap, 0.004);
  const seedShare = num(cfg.seedShare, 0.012);
  // The irreducible remnant of a resisting community, as a share of the
  // province: below this the drift stops drawing on it entirely.
  const core = num(cfg.core, 0.06);
  const seeds = Array.isArray(cfg.seeds) ? cfg.seeds : [];
  // The draw weights, resolved once: a source in `from` converts freely, a
  // source in `resistedBy` at what its resistance leaves.
  const weights = {};
  for (const r of (Array.isArray(cfg.from) ? cfg.from : [])) weights[r] = 1;
  const resisted = cfg.resistedBy || {};
  for (const r of Object.keys(resisted)) weights[r] = clamp(1 - num(resisted[r], 0), 0, 1);
  const resistedWeights = {};
  for (const r of Object.keys(resisted)) resistedWeights[r] = weights[r];
  const freeWeights = {};
  for (const r of Object.keys(weights)) if (!(r in resisted)) freeWeights[r] = weights[r];
  const hasFree = !!Object.keys(freeWeights).length;
  const hasResisted = !!Object.keys(resistedWeights).length;
  // Where a faith arrives it arrives among the gentiles first — a seed and a
  // road only ever draw on the freely-converting sources.
  const arrivalWeights = hasFree ? freeWeights : weights;

  // A faith arriving somewhere takes its first adherents from whoever
  // converts freely — and where nobody in the province does (a wholly Jewish
  // or Samaritan town, a Christian city under a new crown) it takes them,
  // more slowly, from the communities that resist. It is the last kind of
  // place a religion reaches, not a place it can never reach: Aelia ends the
  // Roman period with a bishop, and Emesa ends the Umayyad one with a mosque.
  const arrive = (p, fraction) => {
    if (fraction <= 0) return 0;
    const moved = driftPopToReligion(p, religion, arrivalWeights, fraction);
    if (moved || !hasResisted) return moved;
    return driftPopToReligion(p, religion, resistedWeights, fraction * 0.5);
  };

  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || !Array.isArray(p.pop) || !p.pop.length) continue;
    try {
      let local = shareOf(p, religion);
      // A seed city is where the faith already had a congregation when the
      // bookmark opens; it gets one the first month the age's pull is real.
      // `seedOwner` is the other way a religion arrives somewhere — not by
      // preaching but by governing it: the garrison towns of a conquest are
      // the faith's own from the day the standards go up, which is the whole
      // difference between how Christianity spread and how Islam did.
      const seeded = seeds.indexOf(p.canon || p.name) >= 0
        || (cfg.seedOwner && p.owner === cfg.seedOwner);
      if (local <= 0 && seeded && popTotal(p) > 0) {
        arrive(p, seedShare);
        local = shareOf(p, religion);
      }
      if (local <= 0) {
        // Arrival is not growth. A faith does not seep into a province a
        // hundredth of a soul at a time; a congregation is founded there,
        // once there is a real one near enough to send anybody — and then it
        // grows like every other congregation. Below that the province is
        // simply outside the mission's reach this month.
        const reach = faithReach(ctx, p, religion, cfg);
        if (reach < 0.05) continue;
        arrive(p, seedShare * strength);
        continue;
      }
      const reach = faithReach(ctx, p, religion, cfg);
      // Logistic: a faith grows where it already has carriers and headroom,
      // and the roads keep feeding it from wherever it is stronger.
      const rate = Math.min(cap, vigor * strength * (3 * local + reach) * (1 - local));
      if (rate <= 0) continue;
      if (hasFree) driftPopToReligion(p, religion, freeWeights, rate);
      // A community that resists converts late and slowly: not when the
      // preachers arrive, but once the faith is the weather outside — and
      // even then at what its own cohesion leaves. This is the clause that
      // keeps a Jewish Galilee Jewish for centuries while the Greek cities
      // around it turn.
      //
      // How hard it presses depends on whether it has the state. A faith
      // spreading on its own credit only reaches a resisting community once
      // it is overwhelmingly the majority around it, and even then barely —
      // three hundred years of Christian preaching did not empty the Galilee.
      // A faith that IS the owner's establishment — Theodosius after 380, a
      // caliphal governor with an assessment roll — presses on everything
      // that is left the moment it runs out of easy ground, which is the
      // difference between an argument and a tax.
      if (hasResisted) {
        const owner = g.tags[p.owner];
        const sponsored = !!(owner && owner.alive !== false && owner.religion === religion);
        let openPool = 0;
        for (const r of Object.keys(freeWeights)) openPool += shareOf(p, r);
        const dominance = sponsored
          ? Math.pow(local / Math.max(local + openPool, 1e-6), 2)
          : Math.min(1, local * local * 4);
        if (dominance > 0.01) {
          // ...and a community has a core that does not go. Every faith on
          // this map outlasted the empire that pressed it; none of them were
          // ever converted to the last household, and a mechanic that lets
          // one vanish is telling a lie about all of them.
          const w = {};
          for (const r of Object.keys(resistedWeights)) {
            if (shareOf(p, r) > core) w[r] = resistedWeights[r];
          }
          if (Object.keys(w).length) driftPopToReligion(p, religion, w, rate * dominance);
        }
      }
    } catch (e) { warnOnce('drift:' + i, 'faith drift failed for province', i, e); }
  }
}

// The god-fearers (SPEC §104): the pool, drawn on monthly by whoever is
// entitled to it. The bookmark's `godfearers.weigh(ctx)` returns each
// claimant's pull, 0..1 — that is where the politics lives (a barred mission
// returns zero, forever). The engine only decides how much of the pool a
// given pull actually moves, and scales it by the claimant's presence on the
// ground: nobody recruits in a city where they have no synagogue and no
// church.
function driftGodfearers(ctx, cfg) {
  const g = ctx.game;
  const pool = cfg.pool || 'godfearers';
  let weights = null;
  try { weights = typeof cfg.weigh === 'function' ? cfg.weigh(ctx) : cfg.weigh; }
  catch (e) { warnOnce('godfearers:weigh', 'godfearer weights threw', e); return; }
  if (!weights || typeof weights !== 'object') return;
  const claimants = Object.keys(weights).filter((r) => num(weights[r]) > 0);
  if (!claimants.length) return;
  const cap = num(cfg.monthlyCap, 0.006);
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || !Array.isArray(p.pop) || !p.pop.length) continue;
    try {
      if (shareOf(p, pool) <= 0) continue;
      for (const r of claimants) {
        const presence = Math.min(1, shareOf(p, r) * 4);
        if (presence <= 0) continue;
        const rate = clamp(cap * clamp(num(weights[r]), 0, 1) * presence, 0, 1);
        if (rate <= 0) continue;
        driftPopToReligion(p, r, { [pool]: 1 }, rate);
      }
    } catch (e) { warnOnce('gf:' + i, 'god-fearer draw failed for province', i, e); }
  }
}

// A congregation whose co-religionists rule the enemy (SPEC §104). The
// Sasanian state did not persecute belief; it persecuted defection from the
// fire and disloyalty to the crown — and a Christian in Ctesiphon was
// suspected because the Christian emperor was in Constantinople, while a Jew,
// having no foreign patron at all, generally was not. One rule states both
// facts, and a schism clears it: the Church of the East declared itself
// independent of Antioch precisely so the charge would stop being available.
//
//   foreignPatron: { christianity: { patron: 'BYZ', unrest: 1.6, minShare: 0.2,
//                                    freedFlag: 'churchOfTheEastFree',
//                                    name: 'The Enemy\'s Church' } }
function monthlyForeignPatronPass(ctx) {
  const g = ctx.game;
  const table = ctx.bookmark && ctx.bookmark.foreignPatron;
  if (!table) return;
  for (const religion of Object.keys(table)) {
    const cfg = table[religion] || {};
    const id = cfg.id || ('foreign_patron_' + religion);
    const freed = cfg.freedFlag && g.flags && !!g.flags[cfg.freedFlag];
    const patron = g.tags[cfg.patron];
    const minShare = num(cfg.minShare, 0.2);
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (!p || p.impassable) continue;
      try {
        const owner = g.tags[p.owner];
        let suspect = false;
        if (!freed && owner && owner.alive && patron && patron.alive
          && owner.religion !== religion && p.owner !== cfg.patron) {
          const hostile = (owner.atWarWith || []).indexOf(cfg.patron) >= 0
            || declaredRivals(ctx, p.owner).indexOf(cfg.patron) >= 0;
          suspect = !!hostile && shareOf(p, religion) >= minShare;
        }
        const has = (p.modifiers || []).some((m) => m && m.id === id);
        if (suspect && !has) {
          p.modifiers = p.modifiers || [];
          p.modifiers.push({
            id, name: cfg.name || 'The Enemy\'s Church', months: -1,
            effects: { unrest: num(cfg.unrest, 1.5) },
          });
        } else if (!suspect && has) {
          p.modifiers = (p.modifiers || []).filter((m) => !m || m.id !== id);
        }
      } catch (e) { warnOnce('patron:' + i, 'foreign-patron pass failed for province', i, e); }
    }
  }
}

// The monthly pass. Two tables, one gate each; a bookmark that declares
// neither pays nothing.
export function monthlyFaithDrift(ctx) {
  if (!mechanicOn(ctx, 'faithDrift')) return;
  const bm = ctx.bookmark;
  if (!bm) return;
  const table = bm.faithDrift;
  if (table) {
    for (const religion of Object.keys(table)) {
      try { driftOneFaith(ctx, religion, table[religion] || {}); }
      catch (e) { warnOnce('drift:' + religion, 'faith drift failed for', religion, e); }
    }
  }
  if (bm.godfearers) {
    try { driftGodfearers(ctx, bm.godfearers); }
    catch (e) { warnOnce('godfearers', 'god-fearer pass failed', e); }
  }
  if (mechanicOn(ctx, 'foreignPatron')) {
    try { monthlyForeignPatronPass(ctx); }
    catch (e) { warnOnce('patron', 'foreign-patron pass failed', e); }
  }
}

// ---------------------------------------------------------------- holy sites & wonders
// Each holy site belongs to a faith forever, whatever happens to the province.
export const HOLY_FAITH = { temple_mount: 'judaism', gerizim: 'samaritanism' };
// Wonders yield to whoever owns AND controls them (monthly).
export const WONDER_YIELD = {
  temple: { gov: 1, legitimacy: 0.2, desc: '+1 governance point and +0.2 legitimacy a month to its keeper' },
  library: { infl: 1, desc: '+1 influence point a month to its keeper' },
  petra: { treasury: 2, desc: '+2 talents a month to its keeper' },
};
export function monthlyHolySites(ctx) {
  const g = ctx.game;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    try {
      // Holy sites: a controller of the same faith draws strength from it...
      if (p.holy) {
        const faith = HOLY_FAITH[p.holy] || p.religion;
        const c = g.tags[p.controller];
        if (c && c.alive && c.religion === faith) {
          c.points.gov = clamp(num(c.points.gov) + 1, 0, 999);
          c.points.infl = clamp(num(c.points.infl) + 1, 0, 999);
          c.points.mar = clamp(num(c.points.mar) + 1, 0, 999);
          c.legitimacy = clamp(num(c.legitimacy) + 0.3, 0, 100);
        }
        // ...while every realm of that faith aches to see it in heathen hands.
        const cGroup = c && ctx.DEFINES.RELIGIONS && ctx.DEFINES.RELIGIONS[c.religion]
          ? ctx.DEFINES.RELIGIONS[c.religion].group : null;
        const fGroup = ctx.DEFINES.RELIGIONS && ctx.DEFINES.RELIGIONS[faith]
          ? ctx.DEFINES.RELIGIONS[faith].group : null;
        if (c && cGroup && fGroup && cGroup !== fGroup) {
          for (const k of Object.keys(g.tags)) {
            const t = g.tags[k];
            if (t && t.alive && t.religion === faith) {
              t.legitimacy = clamp(num(t.legitimacy) - 0.2, 25, 100);
            }
          }
        }
      }
      // Wonders: flat yields for the keeper (owner === controller).
      if (p.wonder && p.owner === p.controller) {
        const y = WONDER_YIELD[p.wonder];
        const t = g.tags[p.owner];
        if (y && t && t.alive) {
          if (y.gov) t.points.gov = clamp(num(t.points.gov) + y.gov, 0, 999);
          if (y.infl) t.points.infl = clamp(num(t.points.infl) + y.infl, 0, 999);
          if (y.mar) t.points.mar = clamp(num(t.points.mar) + y.mar, 0, 999);
          if (y.treasury) t.treasury = num(t.treasury) + y.treasury;
          if (y.legitimacy) t.legitimacy = clamp(num(t.legitimacy) + y.legitimacy, 0, 100);
        }
      }
    } catch (e) { warnOnce('holy:' + i, 'holy site tick failed for province', i, e); }
  }
}

// ---------------------------------------------------------------- missions
// bookmark.missions = { TAG: [ {id, name, desc, rewardText, icon?, col?, row?,
//   requires?: [ids], check(ctx), reward(ctx)} ] }
// The chain of missions a realm is working through (SPEC §102), checked
// monthly for every tag with a chain (the AI earns its rewards too —
// symmetric odds). The era's own table answers first; a nation that took a
// greater crown reads the chain that crown carries instead — the Kingdom of
// Israel is not asked to finish Judaea's war objectives, it is asked to do
// the things a kingdom does.
//
// Two shapes share one table (SPEC §177). A chain where no mission names a
// prerequisite is the old LADDER: each mission implicitly requires the one
// before it, and they complete strictly in order. A chain where any mission
// declares `requires` (or claims a grid `col`) is a TREE: a mission unlocks
// when every prerequisite is done, a mission with none is a root, and
// parallel branches advance independently — a stalled war no longer holds
// the building program hostage, which is the entire reason EU4 draws these
// as trees. `col`/`row`/`icon` are layout, owned by the panel; the sim reads
// only `requires`.
//
// The record is `t.missionsDone`, the ids completed, in table order.
// `t.missionIdx` stays maintained as the longest completed PREFIX of the
// table: on a ladder that is exactly the old cursor (every save and test
// that reads or writes it keeps its meaning), and a hand-moved missionIdx —
// an old save, a test forcing a chain forward — is honored by seeding the
// first missionIdx missions as done, which is what it always meant.
export function missionsFor(ctx, tag) {
  const own = ctx.bookmark && ctx.bookmark.missions && ctx.bookmark.missions[tag];
  if (Array.isArray(own) && own.length) return own;
  for (const f of FORMABLES) {
    if (!f || f.to !== tag || !Array.isArray(f.missions) || !f.missions.length) continue;
    if (f.bookmarks && ctx.bookmark && f.bookmarks.indexOf(ctx.bookmark.id) < 0) continue;
    return f.missions;
  }
  return null;
}

export function missionId(m, i) {
  return (m && m.id) ? String(m.id) : 'm' + i;
}

// Tree or ladder? Any explicit prerequisite (or a claimed column) makes it a tree.
export function isMissionTree(list) {
  return Array.isArray(list) && list.some((m) => m
    && ((Array.isArray(m.requires) && m.requires.length) || Number.isFinite(m.col)));
}

// The set of completed mission ids for a tag. `missionsDone` is the record;
// the first `missionIdx` missions in table order are ALSO done — that is the
// invariant the ladder era wrote into every save, and unioning it in is what
// lets an old save (or a test that sets missionIdx by hand) keep working.
// Safe in both directions because writeMissionState keeps missionIdx at the
// longest done prefix, never the raw count.
export function missionDoneSet(t, list) {
  const done = new Set();
  if (Array.isArray(t && t.missionsDone)) {
    for (const id of t.missionsDone) done.add(String(id));
  }
  const idx = Math.max(0, num(t && t.missionIdx, 0) | 0);
  for (let i = 0; i < Math.min(idx, list.length); i++) done.add(missionId(list[i], i));
  return done;
}

// May mission `i` be worked on? Explicit prerequisites answer first; in a
// tree a mission without any is a root; on a ladder it needs its predecessor.
export function missionUnlocked(list, i, done, tree) {
  const m = list[i];
  if (m && Array.isArray(m.requires) && m.requires.length) {
    for (const id of m.requires) if (!done.has(String(id))) return false;
    return true;
  }
  if (tree) return true;
  return i === 0 || done.has(missionId(list[i - 1], i - 1));
}

// Write the done set back: `missionsDone` in table order (ids from other
// chains — a crown formed mid-campaign — are dropped with the chain that
// owned them), `missionIdx` as the longest completed prefix.
function writeMissionState(t, list, done) {
  const out = [];
  for (let i = 0; i < list.length; i++) {
    if (done.has(missionId(list[i], i))) out.push(missionId(list[i], i));
  }
  t.missionsDone = out;
  let prefix = 0;
  while (prefix < list.length && done.has(missionId(list[prefix], prefix))) prefix++;
  t.missionIdx = prefix;
}

export function checkMissions(ctx) {
  const g = ctx.game;
  const all = ctx.bookmark && ctx.bookmark.missions;
  // Every living tag with a mission chain of its own — the bookmark's tables
  // plus any formed crown carrying its own (SPEC §102).
  const tags = new Set(Object.keys(all || {}));
  for (const k of Object.keys(g.tags)) {
    if (g.tags[k] && g.tags[k].alive && missionsFor(ctx, k)) tags.add(k);
  }
  if (!tags.size) return;
  for (const tag of tags) {
    const t = g.tags[tag];
    const list = missionsFor(ctx, tag);
    if (!t || !t.alive || !Array.isArray(list)) continue;
    try {
      const tree = isMissionTree(list);
      const done = missionDoneSet(t, list);
      // Up to three completion WAVES a month — the ladder's old guard, kept:
      // finishing a mission can unlock children a realm already qualifies
      // for, and they should not wait a month per generation, but a cascade
      // straight to the capstone stays impossible. Unlocks are judged
      // against the wave's OPENING state (a completion only feeds the next
      // wave), so depth is genuinely capped at three; parallel branches may
      // each complete in the same wave — that is the point of branches.
      let waves = 0;
      let moved = true;
      while (moved && waves++ < 3) {
        moved = false;
        const opened = new Set(done);
        for (let i = 0; i < list.length; i++) {
          const m = list[i];
          if (!m || typeof m.check !== 'function') continue;
          const id = missionId(m, i);
          if (done.has(id)) continue;
          if (!missionUnlocked(list, i, opened, tree)) continue;
          let ok = false;
          try { ok = !!m.check(ctx); } catch (e) { warnOnce('mcheck:' + id, 'mission check threw', id, e); }
          if (!ok) continue;
          try { if (typeof m.reward === 'function') m.reward(ctx); } catch (e) { warnOnce('mreward:' + id, 'mission reward threw', id, e); }
          done.add(id);
          moved = true;
          if (tag === g.playerTag) {
            ctx.bus.emit('notify', {
              title: 'Mission complete — ' + (m.name || id),
              text: m.rewardText || 'The realm advances.',
              type: 'good',
            });
          }
        }
      }
      writeMissionState(t, list, done);
    } catch (e) { warnOnce('missions:' + tag, 'missions failed for', tag, e); }
  }
}
