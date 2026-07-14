// Judaea Universalis — realm systems: mortal rulers & succession, post-conquest
// integration (autonomy & conversion), mission chains, and the yields of holy
// sites & wonders. DOM-free.

import { num, clamp, GENERAL_NAMES, resolveTagMult, resolveTagAdd, chronicle } from './military.js';
import { fireEvent } from './events.js';

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
  const t = ctx.game.tags[tag];
  const cul = t && ctx.DEFINES.CULTURES ? ctx.DEFINES.CULTURES[t.culture] : null;
  const pool = (cul && GENERAL_NAMES[cul.group]) || GENERAL_NAMES.hellenic;
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
    text = `${old.name} ${causeText || 'has died'} with no designated heir. ${nr.name} takes the ${title.toLowerCase()} amid whispers and drawn knives. (−25 legitimacy, −1 stability)`;
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
      // A court without an heir designates one, eventually.
      if (!t.heir && !t.regency && t.govType !== 'republic' && ctx.rng.chance(0.015)) {
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
      p.religion = owner.religion;
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
// bookmark.missions = { TAG: [ {id, name, desc, rewardText, icon?, check(ctx), reward(ctx)} ] }
// Linear chains; t.missionIdx points at the current mission. Checked monthly
// for every tag with a chain (the AI earns its rewards too — symmetric odds).
export function checkMissions(ctx) {
  const g = ctx.game;
  const all = ctx.bookmark && ctx.bookmark.missions;
  if (!all) return;
  for (const tag of Object.keys(all)) {
    const t = g.tags[tag];
    const list = all[tag];
    if (!t || !t.alive || !Array.isArray(list)) continue;
    try {
      let idx = Math.max(0, num(t.missionIdx, 0) | 0);
      let guard = 0;
      while (idx < list.length && guard++ < 3) {
        const m = list[idx];
        if (!m || typeof m.check !== 'function') break;
        let ok = false;
        try { ok = !!m.check(ctx); } catch (e) { warnOnce('mcheck:' + m.id, 'mission check threw', m.id, e); }
        if (!ok) break;
        try { if (typeof m.reward === 'function') m.reward(ctx); } catch (e) { warnOnce('mreward:' + m.id, 'mission reward threw', m.id, e); }
        idx++;
        t.missionIdx = idx;
        if (tag === g.playerTag) {
          ctx.bus.emit('notify', {
            title: 'Mission complete — ' + (m.name || m.id),
            text: m.rewardText || 'The realm advances.',
            type: 'good',
          });
        }
      }
      t.missionIdx = idx;
    } catch (e) { warnOnce('missions:' + tag, 'missions failed for', tag, e); }
  }
}
