// Judaea Universalis — what kind of rising this is (SPEC §87). DOM-free.
//
// Unrest used to have exactly one outlet: a province crossed a threshold and
// some men appeared with no name for their grievance. But a province rises
// for a reason, and the reasons are already in the game's own state — who
// used to own the land (the §67 grudge book knows), whose god the province
// keeps, whether the realm has a ruler anyone believes in, how tired it is.
// Read those and a rising can arrive with a cause attached.
//
// Five kinds, tried in order of specificity:
//
//   separatist  the land was taken in war from a court that still exists,
//               and it wants that court back. Rises FOR them where it can.
//   pretender   nothing to do with this province: the throne is weak, and
//               someone with a better claim is raising the countryside.
//               Hold the capital long enough and the claimant is crowned.
//   national    a co-religionist power is at war with our ruler across the
//               border, and the province joins it — the old rule, kept.
//   religious   the province keeps a faith the realm does not, nobody is
//               marching to its aid, and the grievance is the altar.
//   peasant     the fallback — the war has gone on too long and the land
//               that pays for it has had enough.
//
// Every classification is a pure read of live state, so nothing here needs a
// save migration; a province that rose before this existed simply has no
// `revoltType` stamp and reads as `peasant` in the UI.

import {
  num, clamp, B, isHostile, spawnArmy, changeControllerCore, armiesOf, tagDef,
} from './military.js';
import { axisOf } from './doctrine.js';
import { rollCourtier } from './realm.js';
import { fireEvent } from './events.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/revolt]', ...args);
}

function R(ctx, key, fallback) {
  const r = ctx.DEFINES && ctx.DEFINES.REVOLT;
  return r && Number.isFinite(r[key]) ? r[key] : fallback;
}

// The five kinds, with what the map and the outliner call them.
export const RISING_KINDS = {
  separatist: { name: 'Separatist rising', sizeMult: 1.3, banner: 'the old flag' },
  pretender: { name: 'Pretender\'s host', sizeMult: 1.1, banner: 'a rival claim' },
  religious: { name: 'Religious rising', sizeMult: 1.15, banner: 'the altar' },
  national: { name: 'National rising', sizeMult: 1.0, banner: 'a neighbor\'s cause' },
  peasant: { name: 'Peasant revolt', sizeMult: 1.4, banner: 'hunger' },
};

// ---------------------------------------------------------------- the reads
function religionGroup(ctx, rel) {
  const r = ctx.DEFINES.RELIGIONS ? ctx.DEFINES.RELIGIONS[rel] : null;
  return r ? r.group : null;
}

// The court this province was taken from, if it is still standing. The §67
// grudge book already records exactly this — a court's memory of the land it
// lost — so a separatist rising is that memory finding a body.
export function dispossessedOf(ctx, p) {
  const g = ctx.game;
  let best = null;
  for (const key of Object.keys(g.tags)) {
    const t = g.tags[key];
    if (!t || !t.alive || key === p.owner || key === 'REB') continue;
    const gr = t.grudges && t.grudges[p.owner];
    if (!gr || !Array.isArray(gr.provs) || gr.provs.indexOf(p.id) < 0) continue;
    // A court whose own people are on that land has the better claim to it.
    const kin = (p.culture && t.culture === p.culture ? 2 : 0)
      + (p.religion && t.religion === p.religion ? 1 : 0);
    if (!best || kin > best.kin) best = { tag: key, kin };
  }
  return best ? best.tag : null;
}

// A throne worth challenging: a crown (not a republic — those have ballots
// for this) whose legitimacy has gone or whose regent is holding the seat.
export function throneIsWeak(ctx, tag) {
  const t = ctx.game.tags[tag];
  if (!t || !t.alive || t.govType === 'republic') return false;
  return num(t.legitimacy, 100) < R(ctx, 'pretenderLegitimacy', 40) || !!t.regency;
}

// Classify the rising this province is about to produce. Returns
// `{ kind, forTag, claimant }` — `forTag` is the banner it marches under
// (REB when it marches for itself).
export function classifyRising(ctx, p, canJoin) {
  const g = ctx.game;
  const owner = g.tags[p.owner];
  if (!owner) return { kind: 'peasant', forTag: 'REB' };

  // 1. Separatist: someone alive lost this land in war and wants it back.
  const lost = dispossessedOf(ctx, p);
  if (lost) {
    // It marches under the old flag where that flag can actually reach it;
    // otherwise it raises the old colors on its own.
    const joinable = canJoin(ctx, p, lost) && isHostile(ctx, lost, p.owner);
    return { kind: 'separatist', forTag: joinable ? lost : 'REB', restoreTo: lost };
  }

  // 2. National: a co-religionist power is at war with our ruler and close
  // enough to march to. This outranks the grievances below because it is
  // those grievances with somewhere to go — a province does not raise its
  // own banner when its co-religionists' army is over the next hill.
  for (const key of Object.keys(g.tags)) {
    const t = g.tags[key];
    if (t && t.alive && key !== 'REB' && key !== p.owner
        && t.religion === p.religion && isHostile(ctx, key, p.owner)
        && canJoin(ctx, p, key)) {
      return { kind: 'national', forTag: key };
    }
  }

  // 3. Pretender: not about this province at all — the throne is weak, and
  // the countryside is a place to raise men. A conciliar realm breeds fewer
  // of these (the sages outlive the dynasty and everyone knows it); a
  // crowned one breeds more, because there is only one chair worth taking.
  if (throneIsWeak(ctx, p.owner)) {
    const crownLean = p.owner === g.playerTag ? axisOf(ctx, 'authority') : 0;
    const chance = clamp(R(ctx, 'pretenderChance', 0.35) + crownLean * 0.02, 0.05, 0.8);
    if (ctx.rng.chance(chance)) {
      let claimant = 'A pretender';
      try { claimant = rollCourtier(ctx, p.owner).name || claimant; }
      catch (e) { warnOnce('claimant', 'rollCourtier failed', e); }
      return { kind: 'pretender', forTag: 'REB', claimant };
    }
  }

  // 4. Religious: the province keeps a faith the realm does not, and it is
  // the altar it is angry about. A zealous realm provokes more of these; an
  // accommodating one has already bought most of them off.
  if (p.religion && owner.religion && p.religion !== owner.religion) {
    const zealLean = p.owner === g.playerTag ? axisOf(ctx, 'zeal') : 0;
    const heathen = religionGroup(ctx, p.religion) !== religionGroup(ctx, owner.religion);
    const chance = clamp(R(ctx, 'religiousChance', 0.5) + zealLean * 0.03 + (heathen ? 0.15 : 0),
      0.05, 0.9);
    if (ctx.rng.chance(chance)) return { kind: 'religious', forTag: 'REB', faith: p.religion };
  }

  // 5. Peasant: the war has gone on too long and the land that pays for it
  // has had enough.
  return { kind: 'peasant', forTag: 'REB' };
}

// The name the band marches under.
function risingName(ctx, p, cls) {
  const g = ctx.game;
  const nameOf = (k) => (g.tags[k] && g.tags[k].name) || k;
  switch (cls.kind) {
    case 'separatist':
      return 'The ' + nameOf(cls.restoreTo) + ' Rising of ' + p.name;
    case 'pretender':
      return 'The Host of ' + cls.claimant;
    case 'religious': {
      const faith = (ctx.DEFINES.RELIGIONS && ctx.DEFINES.RELIGIONS[cls.faith]
        && ctx.DEFINES.RELIGIONS[cls.faith].name) || 'the old faith';
      return 'The Faithful of ' + p.name + ' (' + faith + ')';
    }
    case 'national':
      return 'Zealots of ' + p.name;
    default:
      return 'The Hungry of ' + p.name;
  }
}

// The one-line report the player gets.
function risingText(ctx, p, cls, size) {
  const g = ctx.game;
  const nameOf = (k) => (g.tags[k] && g.tags[k].name) || k;
  const men = size + ',000 men';
  switch (cls.kind) {
    case 'separatist':
      return p.name + ' raises the old flag of ' + nameOf(cls.restoreTo) + ' — ' + men
        + ' who never accepted the change of masters'
        + (cls.forTag !== 'REB' ? ', and they are marching for ' + nameOf(cls.forTag) + '.' : '.');
    case 'pretender':
      return cls.claimant + ' has been proclaimed in ' + p.name + ' — ' + men
        + ' for a claim the throne cannot answer. Take the capital from them, or lose it.';
    case 'religious':
      return 'The shrines of ' + p.name + ' empty into the streets — ' + men
        + ' who will not be ruled by another altar.';
    case 'national':
      return p.name + ' rises for ' + nameOf(cls.forTag) + ' — ' + men + ' in the streets.';
    default:
      return p.name + ' has had enough — ' + men + ' with grain carts and billhooks.';
  }
}

// A rising with a cause can be bargained with. Player's realm only, once per
// rising kind per campaign — the AI's provinces settle their quarrels
// offstage, exactly as their estates do (SPEC §34).
function demandCard(ctx, p, cls) {
  const g = ctx.game;
  if (!ctx.dynEvents || p.owner !== g.playerTag) return;
  const seen = g.flags._risingCards || (g.flags._risingCards = {});
  if (seen[cls.kind]) return;
  seen[cls.kind] = true;
  const t = g.tags[p.owner];
  const spec = {
    separatist: {
      title: 'The Old Flag Over ' + p.name,
      desc: 'They have kept it folded in a cellar for years, and this morning it is on the '
        + 'roof of the customs house. The rising in ' + p.name + ' is not hungry and it is not '
        + 'devout: it simply does not accept that this is our province, and it has produced '
        + 'a list of men who agree. The garrison commander wants orders. The treasurer, who '
        + 'has read the list, wants to know whether we would rather buy it than fight it.',
      grant: {
        label: 'Buy the province back from itself',
        tooltip: '−80 talents, −1 stability now: the rising disperses (autonomy rises, unrest −3 for five years). The land stays ours.',
        run: () => {
          t.treasury = num(t.treasury) - 80;
          t.stability = clamp(num(t.stability) - 1, -3, 3);
          p.autonomy = clamp(num(p.autonomy, 0.25) + 0.2, 0, 0.95);
          addMod(ctx, p, 'rising_bought', 'The Province Bought Back', 60, { unrest: -3 });
        },
      },
      refuse: {
        label: 'A province is not a market stall',
        tooltip: 'The rising fights. +1 stability (the realm sees a spine), and the province stays angry.',
        run: () => { t.stability = clamp(num(t.stability) + 1, -3, 3); },
      },
    },
    pretender: {
      title: 'A Claim With an Army Behind It',
      desc: 'The proclamation is word-perfect, which is the frightening part: someone with '
        + 'access to the archives wrote it. It recites the descent, the irregularities of our '
        + 'own accession, and the names of three men of the court who have already answered. '
        + 'The countryside around ' + p.name + ' is arming. There is a version of this that '
        + 'ends at a wedding and a version that ends at a wall.',
      grant: {
        label: 'Bring the claim into the house — a title, a marriage, a settlement',
        tooltip: '−120 talents, −25 influence: the host disperses and +10 legitimacy. The claim is bought, not beaten.',
        run: () => {
          t.treasury = num(t.treasury) - 120;
          if (t.points) t.points.infl = clamp(num(t.points.infl) - 25, 0, 999);
          t.legitimacy = clamp(num(t.legitimacy) + 10, 0, 100);
          disperse(ctx, 'REB', 'pretender');
        },
      },
      refuse: {
        label: 'Let them come to the wall',
        tooltip: 'The host stands. Beat it in the field and the throne is answered for good (+15 legitimacy); lose the capital to it and the claimant is crowned in our place.',
        run: () => {},
      },
    },
    religious: {
      title: 'The Altar of ' + p.name,
      desc: 'It began as a procession and it is now a militia, and the difference was about '
        + 'four hours. They want what every congregation under a foreign crown wants: to be '
        + 'left alone with their own rite, in writing, sealed. Our own clergy are split down '
        + 'the middle on whether granting it is tolerance or surrender.',
      grant: {
        label: 'A writ of toleration, sealed',
        tooltip: '−40 influence: the rising disperses, the province calms (unrest −2 for five years) — and the realm reads a little less zealous.',
        run: () => {
          if (t.points) t.points.infl = clamp(num(t.points.infl) - 40, 0, 999);
          addMod(ctx, p, 'rising_tolerated', 'The Writ of Toleration', 60, { unrest: -2 });
          try { ctx.helpers.doctrine(ctx, 'zeal', -2); } catch (e) { warnOnce('dox', e); }
        },
      },
      refuse: {
        label: 'One realm, one altar',
        tooltip: 'The rising fights on. The realm reads more zealous, and every province of this faith grows angrier (+1 unrest for five years).',
        run: () => {
          try { ctx.helpers.doctrine(ctx, 'zeal', 2); } catch (e) { warnOnce('dox', e); }
          for (let i = 1; i < g.provinces.length; i++) {
            const q = g.provinces[i];
            if (!q || q.impassable || q.owner !== p.owner || q.religion !== p.religion) continue;
            addMod(ctx, q, 'rising_refused', 'One Realm, One Altar', 60, { unrest: 1 });
          }
        },
      },
    },
  }[cls.kind];
  if (!spec) return;
  g.flags._dynEvN = num(g.flags._dynEvN, 0) + 1;
  const ev = {
    id: 'dyn_rising_' + g.flags._dynEvN,
    title: spec.title,
    desc: spec.desc,
    forTag: p.owner,
    major: true,
    options: [
      {
        label: spec.grant.label,
        tooltip: spec.grant.tooltip,
        effects: () => { try { spec.grant.run(); } catch (e) { warnOnce('grant:' + cls.kind, e); } },
      },
      {
        label: spec.refuse.label,
        tooltip: spec.refuse.tooltip,
        effects: () => { try { spec.refuse.run(); } catch (e) { warnOnce('refuse:' + cls.kind, e); } },
      },
    ],
  };
  ctx.dynEvents.set(ev.id, ev);
  try { fireEvent(ctx, ev); } catch (e) { warnOnce('card', 'rising card failed', e); }
}

function addMod(ctx, p, id, name, monthsLeft, effects) {
  if (!Array.isArray(p.modifiers)) p.modifiers = [];
  p.modifiers = p.modifiers.filter((m) => !m || m.id !== id);
  p.modifiers.push({ id, name, months: monthsLeft, effects: { ...effects } });
}

// Send home every band of one kind (the bargain was struck).
function disperse(ctx, tag, kind) {
  const g = ctx.game;
  for (const id of Object.keys(g.armies)) {
    const a = g.armies[id];
    if (a && a.tag === tag && a.rising === kind) delete g.armies[id];
  }
}

// ------------------------------------------------------------------ the rise
// Called by monthlyUnrest when a province's revolt progress fills. Returns
// true if a band was raised.
export function raiseRising(ctx, p, canJoin) {
  const g = ctx.game;
  const cls = classifyRising(ctx, p, canJoin);
  const kindDef = RISING_KINDS[cls.kind] || RISING_KINDS.peasant;
  const base = Math.max(1, Math.round(num(p.dev && p.dev.mp) * B(ctx, 'rebelSizePerDev', 0.4)));
  const size = Math.max(1, Math.round(base * kindDef.sizeMult));

  // The throttle stays exactly where §6 put it: at most eight ownerless
  // bands under arms at once, so an unhappy world cannot drown the map.
  if (cls.forTag === 'REB') {
    let rebCount = 0;
    for (const id of Object.keys(g.armies)) {
      const a = g.armies[id];
      if (a && a.tag === 'REB' && a.men > 0) rebCount++;
    }
    if (rebCount >= 8) { p.revoltProgress = 0; p.revoltCooldownMonths = 6; return false; }
  }

  const armyId = spawnArmy(ctx, cls.forTag, p.name, {
    inf: size, name: risingName(ctx, p, cls),
  });
  const army = g.armies[armyId];
  if (army) {
    army.rising = cls.kind;
    if (cls.restoreTo) army.restoreTo = cls.restoreTo;
    if (cls.claimant) army.claimant = cls.claimant;
    // A peasant host is large and brittle; a separatist one is small and
    // knows why it is there.
    const moraleMult = cls.kind === 'peasant' ? 0.7 : cls.kind === 'separatist' ? 1.15 : 1;
    army.morale = clamp(num(army.morale) * moraleMult, 0.1, num(army.maxMorale, 3));
  }
  if (num(p.garrison) <= 0) changeControllerCore(ctx, p, cls.forTag);
  p.revoltType = cls.kind;
  p.revoltProgress = 0;
  p.revoltCooldownMonths = 30;
  p.unrest = Math.max(0, num(p.unrest) - 4); // steam vented

  // A pretender is a fact about the realm, not about the province.
  if (cls.kind === 'pretender') {
    if (!g.pretenders || typeof g.pretenders !== 'object') g.pretenders = {};
    g.pretenders[p.owner] = {
      claimant: cls.claimant, y: g.date.y, m: g.date.m, heldMonths: 0,
    };
  }

  ctx.bus.emit('notify', {
    title: kindDef.name + ' in ' + p.name,
    text: risingText(ctx, p, cls, size),
    type: 'war', provName: p.name,
  });
  demandCard(ctx, p, cls);
  return true;
}

// ------------------------------------------------------------- the pretender
// Monthly. A pretender's host that takes and keeps the capital replaces the
// ruler with its claimant; one that is destroyed answers the question of
// legitimacy for good. Player and AI alike — a usurpation is a fact about the
// world, not a piece of the player's UI.
export function monthlyPretenders(ctx) {
  const g = ctx.game;
  if (!g.pretenders) return;
  for (const tag of Object.keys(g.pretenders)) {
    try {
      const pr = g.pretenders[tag];
      const t = g.tags[tag];
      if (!pr || !t || !t.alive) { delete g.pretenders[tag]; continue; }
      // Are any of the claimant's bands still in the field?
      let alive = false;
      for (const id of Object.keys(g.armies)) {
        const a = g.armies[id];
        if (a && a.rising === 'pretender' && a.men > 0 && a.claimant === pr.claimant) { alive = true; break; }
      }
      if (!alive) {
        delete g.pretenders[tag];
        t.legitimacy = clamp(num(t.legitimacy) + R(ctx, 'pretenderBeatenLegitimacy', 15), 0, 100);
        if (tag === g.playerTag) {
          ctx.bus.emit('notify', {
            title: 'The claim is answered',
            text: 'The host of ' + pr.claimant + ' is broken and the question it asked is closed. '
              + '+' + R(ctx, 'pretenderBeatenLegitimacy', 15) + ' legitimacy.',
            type: 'good',
          });
        }
        continue;
      }
      // A throne with a rival in the field bleeds belief every month.
      t.legitimacy = clamp(num(t.legitimacy) - R(ctx, 'pretenderDrain', 0.5), 0, 100);
      // The capital is the whole argument.
      const capName = tagDef(ctx, tag).capital || null;
      const cap = capName ? ctx.byId(ctx.provId(capName)) : null;
      if (!cap || cap.controller !== 'REB') { pr.heldMonths = 0; continue; }
      pr.heldMonths = num(pr.heldMonths) + 1;
      if (pr.heldMonths < R(ctx, 'pretenderHoldMonths', 6)) continue;
      crownThePretender(ctx, tag, pr, cap);
      delete g.pretenders[tag];
    } catch (e) { warnOnce('pretender:' + tag, 'pretender tick failed', e); }
  }
}

// ------------------------------------------------------------- the burn-out
// SPEC §112. A rising had exactly one way to end: be beaten in the field. That
// is fine for a pretender — his host is the whole argument, and `monthlyPretenders`
// above settles him either way — but a peasant or religious band that takes a
// town and is simply left alone had no ending at all. It sat there.
//
// That is not a cosmetic stall. Income and manpower (economy.js) and every
// recruitment order (recruitment.js) require a province to be owned AND
// controlled, so a realm whose provinces are all rebel-held earns nothing,
// grows nothing, and can raise nothing — it cannot build the army it would need
// to take its own country back. It is a terminal state with no exit, and it
// reads to the player as the chapter going quiet: the 66 CE Judaea that has
// beaten Rome off, owns sixteen provinces, controls none of them, and can
// therefore never satisfy a single card that asks whether it holds Jerusalem.
//
// So: a band that holds a province with nobody contesting it burns out. Men
// melt away once the grievance that raised them is spent, and faster the longer
// they have been sitting; when the last of them is gone the province answers to
// its owner again. `rebelBurnoutMonths` is the grace period before it starts,
// `rebelHoldMaxMonths` the hard ceiling no rising may pass. Neither number can
// make a rising harmless — a band that is winning is reinforced by the unrest
// that raised it, and a realm that has genuinely lost its country still has to
// wait years — but neither can a rising outlast the state any more.
export function monthlyRisings(ctx) {
  const g = ctx.game;
  const grace = R(ctx, 'rebelBurnoutMonths', 24);
  const ceiling = R(ctx, 'rebelHoldMaxMonths', 72);
  const calm = R(ctx, 'rebelBurnoutUnrest', 4);
  const rate = R(ctx, 'rebelBurnoutRate', 0.12);
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    const owner = g.tags[p.owner];
    // Only a rising against a living owner burns out. Ownerless land and a
    // dead court are somebody else's problem.
    if (p.controller !== 'REB' || p.owner === 'REB' || !owner || owner.alive === false) {
      if (p.rebelHeldMonths) p.rebelHeldMonths = 0;
      continue;
    }
    p.rebelHeldMonths = num(p.rebelHeldMonths) + 1;
    // A pretender's host is settled by its own clock, not this one.
    if (p.revoltType === 'pretender' && g.pretenders && g.pretenders[p.owner]) continue;
    const held = num(p.rebelHeldMonths);
    const over = held >= ceiling;
    // Still angry and still inside the grace period: the band holds.
    if (!over && (held < grace || num(p.unrest) > calm)) continue;
    let men = 0;
    let last = null;
    for (const id of Object.keys(g.armies)) {
      const a = g.armies[id];
      if (!a || a.tag !== 'REB' || a.prov !== i) continue;
      // A band in a battle is being answered the old way; leave it to the field
      // — but only up to the ceiling. An unbounded exemption is the same
      // immortality bug in miniature: one stale `inBattle` and the province is
      // held for good. A host that has sat on a town for six years is not in a
      // battle in any sense the word covers.
      if (a.inBattle && !over) { men = -1; break; }
      a.men = over ? 0 : Math.max(0, Math.round(num(a.men) * (1 - rate)));
      if (a.men < 200) a.men = 0;
      if (a.men <= 0) delete g.armies[id]; else { men += a.men; last = a; }
    }
    if (men < 0) continue;
    if (men > 0) continue;
    // The last of them is gone (or there was never a band here at all, only a
    // flipped controller): the province answers to its owner again.
    changeControllerCore(ctx, p, p.owner);
    p.rebelHeldMonths = 0;
    p.revoltType = null;
    p.revoltProgress = 0;
    p.revoltCooldownMonths = Math.max(num(p.revoltCooldownMonths), 12);
    p.unrest = Math.max(0, num(p.unrest) - 2);
    if (p.owner === g.playerTag) {
      ctx.bus.emit('notify', {
        title: 'The rising in ' + p.name + ' is spent',
        text: 'The band that held ' + p.name + ' has melted away — men go back to the '
          + 'harvest, and the province answers to its own again. It will be '
          + 'a year before anything can be raised here.',
        type: 'good', provName: p.name,
      });
    }
  }
}

function crownThePretender(ctx, tag, pr, cap) {
  const g = ctx.game;
  const t = g.tags[tag];
  const old = t.ruler ? t.ruler.name : 'the old crown';
  const title = (t.ruler && t.ruler.title) || 'King';
  let c = { name: pr.claimant, gov: 2, infl: 2, mar: 3, age: 34 };
  try {
    const rolled = rollCourtier(ctx, tag);
    c = { name: pr.claimant, gov: rolled.gov, infl: rolled.infl, mar: rolled.mar, age: rolled.age };
  } catch (e) { warnOnce('crownRoll', e); }
  t.ruler = { name: c.name, title, gov: c.gov, infl: c.infl, mar: c.mar, age: c.age };
  t.heir = null;
  t.regency = false;
  t.legitimacy = clamp(R(ctx, 'pretenderCrownedLegitimacy', 55), 0, 100);
  t.stability = clamp(num(t.stability) - 1, -3, 3);
  // The war is over the moment its cause is seated: the bands go home and
  // the capital answers to the crown again, because it is now their crown.
  disperse(ctx, 'REB', 'pretender');
  changeControllerCore(ctx, cap, tag);
  const text = old + ' is deposed. ' + c.name + ' is crowned ' + title.toLowerCase()
    + ' in a capital taken by ' + (armiesOf(ctx, 'REB').length ? 'their own soldiers' : 'the host that proclaimed them')
    + ' — legitimacy resets to ' + Math.round(num(t.legitimacy)) + ', −1 stability.';
  ctx.bus.emit('notify', {
    title: 'The pretender is crowned',
    text,
    type: tag === g.playerTag ? 'bad' : 'info',
  });
  try { ctx.helpers.chronicle(ctx, 'ruler', (t.name || tag) + ': ' + text); }
  catch (e) { warnOnce('chron', e); }
}
