// js/data/ideas.js — reform trees (SPEC §20). DOM-free data + pure helpers.
// Three trees, five tiers each, bought in order with the matching monarch
// point. Unlocked tiers merge into tag.ideas — the effects map that
// resolveTagMult / resolveTagAdd already consult (mult keys default 1 and
// multiply; everything else adds).
import { computeTechEffects } from './tech.js';

export const IDEA_TREES = {
  mil: {
    name: 'The Way of the Sword',
    point: 'mar',
    tiers: [
      { name: 'Drilled Ranks', desc: 'Regiments fight in step: +5% discipline.', effects: { disciplineMult: 1.05 } },
      { name: 'Standing Levies', desc: 'The muster rolls stay open: +20% manpower recovery.', effects: { manpowerMult: 1.2 } },
      { name: 'Siegecraft', desc: 'Rams, ramps and patience: +25% siege progress.', effects: { siegeMult: 1.25 } },
      { name: 'Hardy Columns', desc: 'Men who march on bread and belief: +15% morale.', effects: { moraleMult: 1.15 } },
      { name: 'Iron Discipline', desc: 'The line does not break: +5% discipline, +1 to hill-country defense.', effects: { disciplineMult: 1.05, hillDefBonus: 1 } },
    ],
  },
  civ: {
    name: 'The Art of Rule',
    point: 'gov',
    tiers: [
      { name: 'Census & Taxation', desc: 'What is counted can be taxed: +10% income.', effects: { incomeMult: 1.1 } },
      { name: 'Provincial Governors', desc: 'A firm, familiar hand in every district: −0.75 unrest everywhere.', effects: { unrestAll: -0.75 } },
      { name: 'Granaries of State', desc: 'Stored grain is stored men: +20% manpower.', effects: { manpowerMult: 1.2 } },
      { name: 'Roads & Couriers', desc: 'Orders travel faster than rumor: +10% income.', effects: { incomeMult: 1.1 } },
      { name: 'The Higher Law', desc: 'One law for prince and peasant: +0.15 legitimacy a month, −0.5 unrest.', effects: { legitimacyAdd: 0.15, unrestAll: -0.5 } },
    ],
  },
  rel: {
    name: 'The Voice of Heaven',
    point: 'infl',
    tiers: [
      { name: 'Public Rites', desc: 'The crowd sees the crown at prayer: +0.15 legitimacy a month.', effects: { legitimacyAdd: 0.15 } },
      { name: 'Missionary Zeal', desc: 'Preachers ride with the tax collectors: +50% conversion speed.', effects: { convertMult: 1.5 } },
      { name: 'Sanctified Courts', desc: 'Judgment in the gate, seen by all: −0.75 unrest everywhere.', effects: { unrestAll: -0.75 } },
      { name: 'Pilgrim Roads', desc: 'Every festival fills the inns: +10% income.', effects: { incomeMult: 1.1 } },
      { name: 'Covenant Renewed', desc: 'A people bound anew to its God: +0.2 legitimacy a month, +5% discipline.', effects: { legitimacyAdd: 0.2, disciplineMult: 1.05 } },
    ],
  },
};

export function ideaCost(tier) { // tier index 0..4
  return 50 + 25 * tier;
}

// Rebuild tag.ideas = the tag's static national bonuses (DEFINES.TAGS[tag].ideas)
// merged with everything its enacted reforms grant and everything its tech
// levels confer (SPEC §22). Pure; call after any change to t.reforms or t.tech.
export function applyReformsToTag(DEFINES, t, tagKey) {
  const base = (DEFINES && DEFINES.TAGS && DEFINES.TAGS[tagKey] && DEFINES.TAGS[tagKey].ideas) || {};
  const merged = { ...base };
  const fold = (eff) => {
    for (const k of Object.keys(eff)) {
      if (k.endsWith('Mult')) merged[k] = (Number.isFinite(merged[k]) ? merged[k] : 1) * eff[k];
      else merged[k] = (Number.isFinite(merged[k]) ? merged[k] : 0) + eff[k];
    }
  };
  fold(computeIdeaEffects(t.reforms));
  if (t.tech) fold(computeTechEffects(t.tech));
  t.ideas = merged;
}

// Merge every unlocked tier into one effects map. Keys ending in 'Mult'
// multiply (default 1); everything else adds (default 0).
export function computeIdeaEffects(reforms) {
  const out = {};
  for (const key of Object.keys(IDEA_TREES)) {
    const tree = IDEA_TREES[key];
    const n = Math.max(0, Math.min(tree.tiers.length, (reforms && reforms[key]) | 0));
    for (let i = 0; i < n; i++) {
      const eff = tree.tiers[i].effects || {};
      for (const k of Object.keys(eff)) {
        if (k.endsWith('Mult')) out[k] = (out[k] === undefined ? 1 : out[k]) * eff[k];
        else out[k] = (out[k] === undefined ? 0 : out[k]) + eff[k];
      }
    }
  }
  return out;
}
