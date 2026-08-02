// Judaea Universalis — crises that brew (SPEC §98). DOM-free.
//
// A state does not fall over in a month. It runs a deficit for two years and
// then cannot pay the garrison; a king ages without naming an heir and the
// court spends a decade deciding what happens next. This module is the slow
// clock under those two sentences: every crisis has HEAT that rises while its
// cause holds and falls while it does not, and STAGES that bite harder the
// longer nobody fixes the thing.
//
// Heat is 0–100 and lives on the tag (`t.crises[id] = {heat, stage}`), so it
// rides saves and multiplayer snapshots like any other state. Each stage owns
// exactly one tag modifier (`crisis_<id>`), replaced when the stage changes and
// removed when the crisis ends — no modifier leaks if a save is loaded mid-
// crisis. Stages fall one at a time with hysteresis, so a realm that fixes its
// books climbs out instead of flickering.
//
// Two crises are universal: the succession (every age that has heirs) and
// bankruptcy (every age that has money). A bookmark may declare its own in
// `bookmark.crises` — the era's particular way of coming apart.

import {
  num, clamp, chronicle, mechanicOn, spawnArmy, armiesOf, devTotal, govHas,
} from './military.js';
import { fireEvent } from './events.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/crisis]', ...args);
}

export const CRISIS = {
  max: 100,
  hysteresis: 12,   // heat must fall this far below a stage boundary to leave it
  cardCooldown: 24, // months before the same crisis interrupts the player again
};

function tagCrises(t) {
  if (!t.crises || typeof t.crises !== 'object') t.crises = {};
  return t.crises;
}

// The stage a heat reading sits in: 0 (none) through stages.length.
function stageFor(def, heat, current) {
  let stage = 0;
  for (let i = 0; i < def.stages.length; i++) {
    if (heat >= def.stages[i].at) stage = i + 1;
  }
  // Hysteresis: hold the current stage until heat drops clear of its floor.
  if (current > stage && current <= def.stages.length) {
    const floor = def.stages[current - 1].at - CRISIS.hysteresis;
    if (heat >= floor) return current;
  }
  return stage;
}

// The player's own crises deserve a card; other courts' are world news.
function crisisCard(ctx, tag, def, stage) {
  const g = ctx.game;
  if (tag !== g.playerTag || !ctx.dynEvents) return false;
  const last = (g.flags._crisisCard && g.flags._crisisCard[def.id]) || -9999;
  const nowIdx = g.date.y * 12 + g.date.m;
  if (nowIdx - last < CRISIS.cardCooldown && stage.at < CRISIS.max) return false;
  if (!g.flags._crisisCard) g.flags._crisisCard = {};
  g.flags._crisisCard[def.id] = nowIdx;
  g.flags._dynEvN = num(g.flags._dynEvN, 0) + 1;
  const ev = {
    id: 'dyn_crisis_' + def.id + '_' + g.flags._dynEvN,
    title: stage.name,
    desc: typeof stage.desc === 'function' ? stage.desc(ctx, tag) : stage.desc,
    forTag: tag,
    options: [{ label: stage.label || 'The realm holds its breath', effects() {} }],
  };
  ctx.dynEvents.set(ev.id, ev);
  try { fireEvent(ctx, ev); return true; } catch (e) { warnOnce('card', 'crisis card failed', e); return false; }
}

function applyStage(ctx, tag, def, stage) {
  const t = ctx.game.tags[tag];
  if (!t) return;
  t.modifiers = (t.modifiers || []).filter((m) => m && m.id !== 'crisis_' + def.id);
  if (stage && stage.effects) {
    t.modifiers.push({
      id: 'crisis_' + def.id, name: stage.name, months: -1, effects: { ...stage.effects },
    });
  }
}

function clearCrisis(ctx, tag, def) {
  const t = ctx.game.tags[tag];
  if (!t) return;
  t.modifiers = (t.modifiers || []).filter((m) => m && m.id !== 'crisis_' + def.id);
  if (t.crises) delete t.crises[def.id];
}

// ---------------------------------------------------------------- definitions
// A province of the realm to raise a rising in: the least defended one that is
// actually ours, so a pretender's host appears somewhere it can plausibly hold.
function weakProvinceOf(ctx, tag) {
  const g = ctx.game;
  let best = null;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== tag || p.controller !== tag) continue;
    const guarded = armiesOf(ctx, tag).some((a) => a && a.prov === i);
    const score = devTotal(p) + (guarded ? 100 : 0);
    if (!best || score < best.score) best = { p, score };
  }
  return best ? best.p : null;
}

export const SUCCESSION_CRISIS = {
  id: 'succession',
  name: 'The Succession',
  // Modern constitutions do not have this problem: 1948 turns it off with
  // `mechanics.succession: false`. Nor does any constitution that does not
  // inherit (SPEC §209): a republic elects, the Lot draws, and an assembly
  // that acknowledges no sovereign has nothing to leave anybody. Nobody riots
  // over a ballot, and nobody claims a seat that was never property.
  applies(ctx, tag) {
    const t = ctx.game.tags[tag];
    if (!t || !t.alive || tag === 'REB') return false;
    if (!mechanicOn(ctx, 'succession')) return false;
    return !govHas(ctx, tag, 'heirless');
  },
  // A living ruler with no son yet is a RISK, not a countdown: that alone
  // brews to the whispers and stops there (the plateau). What pushes a court
  // past it is an actual event — a regency, a pretender in the field, a
  // collapse of belief, or the heirless death that stokes this crisis to its
  // second stage outright (rulerDies, realm.js).
  pressure(ctx, tag) {
    const g = ctx.game;
    const t = g.tags[tag];
    let heat = 0;
    const ruler = t.ruler || {};
    const heirless = !t.heir;
    if (heirless) heat += num(ruler.age, 45) >= 55 ? 2 : 0.5;
    if (t.regency) heat += 4;
    if (g.pretenders && g.pretenders[tag]) heat += 8;
    if (num(t.legitimacy, 100) < 40) heat += 3;
    if (!heirless && !t.regency && num(t.legitimacy, 0) >= 50
      && !(g.pretenders && g.pretenders[tag])) heat -= 10;
    const acute = !!t.regency || !!(g.pretenders && g.pretenders[tag])
      || num(t.legitimacy, 100) < 40;
    return { delta: heat, cap: acute ? CRISIS.max : 45 };
  },
  stages: [
    {
      at: 34,
      name: 'Whispers in the Court',
      label: 'Let them whisper',
      desc: 'The question nobody asks aloud is being asked everywhere else: after '
        + 'this ruler, who? Ministers begin to write two letters where they used to '
        + 'write one, and the households that matter start counting each other\'s '
        + 'soldiers.',
      effects: { unrestAll: 0.5, legitimacyAdd: -0.15 },
    },
    {
      at: 67,
      name: 'Two Claims, One Throne',
      label: 'The realm has an answer, and it is a name',
      desc: 'It is no longer a whisper. A cousin with a genealogy and a purse is '
        + 'receiving visitors; the neighbors who married into this house have '
        + 'discovered a sudden interest in our constitutional arrangements. Courts '
        + 'that would never dare a war of conquest will happily fight a war about '
        + 'who is the rightful heir.',
      effects: { unrestAll: 1, incomeMult: 0.95, legitimacyAdd: -0.3 },
    },
    {
      at: 100,
      name: 'The Succession War',
      label: 'Then it will be settled in the field',
      desc: 'The claim is armed. A pretender\'s banner is up in the provinces, and '
        + 'every foreign court with a marriage contract and an appetite now has a '
        + 'legal argument for crossing our border.',
      effects: { unrestAll: 1.5, incomeMult: 0.9, moraleMult: 0.95, legitimacyAdd: -0.5 },
      onEnter(ctx, tag) {
        const g = ctx.game;
        if (g.pretenders && g.pretenders[tag]) return; // one claim in the field is enough
        const p = weakProvinceOf(ctx, tag);
        if (!p) return;
        const claimant = 'A claimant of the old house';
        const id = spawnArmy(ctx, 'REB', p.name, {
          inf: 4, cav: 1, name: 'The Claimant\'s Host',
          general: { name: 'The Claimant', fire: 2, shock: 2, maneuver: 2 },
        });
        if (!id) return;
        const army = g.armies[id];
        if (army) { army.rising = 'pretender'; army.claimant = claimant; }
        if (!g.pretenders || typeof g.pretenders !== 'object') g.pretenders = {};
        g.pretenders[tag] = { claimant, y: g.date.y, m: g.date.m, heldMonths: 0 };
        chronicle(ctx, 'war', ((g.tags[tag] && g.tags[tag].name) || tag)
          + ': a pretender raises the old house\'s banner in ' + p.name + '.');
      },
    },
  ],
  resolvedText: 'the succession is settled and the court breathes out',
};

export const BANKRUPTCY_CRISIS = {
  id: 'bankruptcy',
  name: 'The Books',
  applies(ctx, tag) {
    const t = ctx.game.tags[tag];
    return !!(t && t.alive && tag !== 'REB');
  },
  pressure(ctx, tag) {
    const t = ctx.game.tags[tag];
    const treasury = num(t.treasury);
    if (treasury >= 0) return num(t.loans) > 0 ? -6 : -12;
    let heat = 4 + Math.min(12, Math.abs(treasury) / 40);
    if (num(t.loans) >= 5) heat += 3;
    if (num(t.income) < num(t.expenses)) heat += 2;
    return heat;
  },
  stages: [
    {
      at: 34,
      name: 'The Pay Is Late',
      label: 'They will wait a month',
      desc: 'The month\'s wages go out short and late. Quartermasters buy on credit '
        + 'from merchants who have started asking when, exactly, and the garrisons '
        + 'have begun to notice which of them gets paid first.',
      effects: { moraleMult: 0.95, unrestAll: 0.5 },
    },
    {
      at: 67,
      name: 'The Creditors Call',
      label: 'Show them the books',
      desc: 'The lenders want their terms revisited, in person, today. The court\'s '
        + 'own advisers are owed enough that some of them have stopped coming to '
        + 'the palace, and the price of everything the state buys has quietly gone '
        + 'up for the state alone.',
      effects: { incomeMult: 0.9, disciplineMult: 0.95, unrestAll: 1 },
      onEnter(ctx, tag) {
        const t = ctx.game.tags[tag];
        if (t && t.advisors) t.advisors = {}; // unpaid men go home
      },
    },
    {
      at: 100,
      name: 'Bankruptcy',
      label: 'Declare it, and take what follows',
      desc: 'The state cannot pay. The debts are repudiated in a single sentence '
        + 'that takes ten years to live down: the lenders are ruined, the credit is '
        + 'gone, the army is paid in promises and a quarter of it simply walks '
        + 'home. Whatever this realm does next, it does with empty hands.',
      effects: { incomeMult: 0.75, manpowerMult: 0.85, unrestAll: 2, moraleMult: 0.9 },
      onEnter(ctx, tag) {
        const g = ctx.game;
        const t = g.tags[tag];
        if (!t) return;
        t.loans = 0;
        t.treasury = 0;
        t.stability = clamp(num(t.stability) - 2, -3, 3);
        t.legitimacy = clamp(num(t.legitimacy) - 20, 0, 100);
        for (const a of armiesOf(ctx, tag)) {
          if (!a || !(a.men > 0)) continue;
          a.men = Math.max(0, Math.round(a.men * 0.75));
        }
        chronicle(ctx, 'era', ((t.name || tag)) + ' declares bankruptcy: the debts are '
          + 'repudiated, the credit is gone, and a quarter of the army walks home.');
      },
    },
  ],
  resolvedText: 'the books balance again and the credit slowly returns',
};

export const CORE_CRISES = [SUCCESSION_CRISIS, BANKRUPTCY_CRISIS];

// The era's own way of coming apart, if it declares one.
export function crisesFor(ctx) {
  const extra = ctx && ctx.bookmark && Array.isArray(ctx.bookmark.crises)
    ? ctx.bookmark.crises.filter((c) => c && c.id && Array.isArray(c.stages)) : [];
  return CORE_CRISES.concat(extra);
}

// A crisis' heat can be pushed directly by the world: a ruler dying heirless
// is not a slow build, it is a fact that lands on the court in one afternoon.
export function stokeCrisis(ctx, tag, id, amount) {
  const t = ctx.game.tags[tag];
  if (!t || !t.alive) return;
  const book = tagCrises(t);
  const row = book[id] || (book[id] = { heat: 0, stage: 0 });
  row.heat = clamp(num(row.heat) + num(amount), 0, CRISIS.max);
}
// Some events do not ADD heat, they establish it: an heirless death opens the
// question at a definite point whether the court had been fretting for years
// or was blindsided this morning.
export function raiseCrisisTo(ctx, tag, id, value) {
  const t = ctx.game.tags[tag];
  if (!t || !t.alive) return;
  const book = tagCrises(t);
  const row = book[id] || (book[id] = { heat: 0, stage: 0 });
  row.heat = clamp(Math.max(num(row.heat), num(value)), 0, CRISIS.max);
}

export function crisisHeat(ctx, tag, id) {
  const t = ctx.game.tags[tag];
  const row = t && t.crises && t.crises[id];
  return row ? clamp(num(row.heat), 0, CRISIS.max) : 0;
}

export function crisisStage(ctx, tag, id) {
  const t = ctx.game.tags[tag];
  const row = t && t.crises && t.crises[id];
  return row ? num(row.stage) | 0 : 0;
}

// What a stage is doing to the realm, in the panel's own words.
const EFFECT_LABELS = {
  incomeMult: 'income', manpowerMult: 'manpower', moraleMult: 'morale',
  disciplineMult: 'discipline', reinforceMult: 'reinforcement', tradeMult: 'trade',
  maintMult: 'army upkeep', forceLimitMult: 'force limit',
  unrestAll: 'unrest everywhere', legitimacyAdd: 'monthly legitimacy',
};
export function crisisBite(effects) {
  if (!effects) return '';
  return Object.keys(effects).map((k) => {
    const v = effects[k];
    if (!Number.isFinite(v)) return null;
    const label = EFFECT_LABELS[k] || k;
    if (/Mult$/.test(k)) {
      const pct = Math.round((v - 1) * 100);
      return pct ? (pct > 0 ? '+' : '−') + Math.abs(pct) + '% ' + label : null;
    }
    return v ? (v > 0 ? '+' : '−') + Math.abs(v) + ' ' + label : null;
  }).filter(Boolean).join(', ');
}

// Everything the panel needs to show what is brewing.
export function crisisReport(ctx, tag) {
  const out = [];
  for (const def of crisesFor(ctx)) {
    try {
      const heat = crisisHeat(ctx, tag, def.id);
      const stage = crisisStage(ctx, tag, def.id);
      if (!heat && !stage) continue;
      const s = stage > 0 ? def.stages[stage - 1] : null;
      out.push({
        id: def.id,
        name: def.name,
        heat: Math.round(heat),
        stage,
        stageName: s ? s.name : 'Brewing',
        rising: num((ctx.game.tags[tag].crises[def.id] || {}).last) < heat,
        effects: s ? s.effects : null,
        bite: s ? crisisBite(s.effects) : '',
        desc: s ? (typeof s.desc === 'function' ? s.desc(ctx, tag) : s.desc) : '',
      });
    } catch (e) { warnOnce('report:' + def.id, e); }
  }
  return out;
}

// ---------------------------------------------------------------- the clock
export function monthlyCrises(ctx) {
  const g = ctx.game;
  const defs = crisesFor(ctx);
  for (const tag of Object.keys(g.tags)) {
    const t = g.tags[tag];
    if (!t || !t.alive || tag === 'REB') continue;
    for (const def of defs) {
      try {
        let applies = true;
        if (typeof def.applies === 'function') applies = !!def.applies(ctx, tag);
        const book = tagCrises(t);
        if (!applies) {
          if (book[def.id]) clearCrisis(ctx, tag, def);
          continue;
        }
        const row = book[def.id] || (book[def.id] = { heat: 0, stage: 0 });
        row.last = num(row.heat);
        // A crisis may report a PLATEAU as well as a pressure: the ceiling its
        // present causes can push heat to on their own. Heat already past the
        // plateau (an event stoked it there) is not dragged back down by it.
        const p = def.pressure(ctx, tag);
        const delta = num(typeof p === 'object' && p ? p.delta : p);
        const cap = typeof p === 'object' && p && Number.isFinite(p.cap) ? p.cap : CRISIS.max;
        const next = num(row.heat) + delta;
        row.heat = clamp(delta > 0 ? Math.min(next, Math.max(num(row.heat), cap)) : next, 0, CRISIS.max);
        const was = num(row.stage) | 0;
        const now = stageFor(def, row.heat, was);
        if (now !== was) {
          row.stage = now;
          const stage = now > 0 ? def.stages[now - 1] : null;
          applyStage(ctx, tag, def, stage);
          if (stage && now > was) {
            if (typeof stage.onEnter === 'function') stage.onEnter(ctx, tag);
            chronicle(ctx, now === def.stages.length ? 'war' : 'era',
              (t.name || tag) + ': ' + stage.name.toLowerCase() + '.');
            if (!crisisCard(ctx, tag, def, stage) && tag === g.playerTag) {
              ctx.bus.emit('notify', { title: stage.name, text: stage.desc, type: 'bad' });
            } else if (tag !== g.playerTag && now === def.stages.length) {
              ctx.bus.emit('notify', {
                title: stage.name + ' in ' + (t.name || tag),
                text: 'A foreign court comes apart: ' + stage.name.toLowerCase() + '.',
                type: 'info',
              });
            }
          }
        }
        if (row.heat <= 0 && row.stage === 0) {
          if (was > 0 || (t.modifiers || []).some((m) => m && m.id === 'crisis_' + def.id)) {
            clearCrisis(ctx, tag, def);
            chronicle(ctx, 'era', (t.name || tag) + ': ' + (def.resolvedText || 'the crisis passes') + '.');
            if (tag === g.playerTag) {
              ctx.bus.emit('notify', {
                title: def.name + ': passed',
                text: 'The crisis is over — ' + (def.resolvedText || 'the realm steadies') + '.',
                type: 'good',
              });
            }
          } else {
            delete book[def.id];
          }
        }
      } catch (e) { warnOnce('tick:' + def.id + ':' + tag, 'crisis tick failed', e); }
    }
  }
}
