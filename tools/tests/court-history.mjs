// Court policy must change actual historical event outcomes and respect treaties
// signed while an event is waiting for a human answer.
import assert from 'node:assert/strict';
import { strategicEventChoice, fireEvent, resolveEventOption } from '../../js/sim/events.js';
import { BALAS_EVENT, EVENTS_BROTHERS } from '../../js/data/events_historical_crises.js';
import { PEACE628_ENTRY } from '../../js/data/events_political_turning_points.js';
import { rememberAllianceBreak, settlePromises } from '../../js/sim/strategy.js';
const offer = EVENTS_BROTHERS.find(e => e.id === 'ev67_the_brothers_accord');
function scene() {
  const chosen = [], emitted = [];
  let exists = true;
  const ctx = {
    DEFINES: { TAGS: {} },
    game: { playerTag: 'PLAYER', date: { y: -67, m: 6 }, flags: {}, firedEvents: {}, pendingEvents: [], nextEventInstance: 1,
      wars: [], armies: { a: { tag: 'HYR', men: 2000 }, b: { tag: 'ARI', men: 20000 } },
      tags: { HYR: { alive: true, ai: true, treasury: 40, manpower: 500, stability: -1, warExhaustion: 5,
        courtPlan: { goals: [{ kind: 'rebuild' }], reserve: 100 } }, ARI: { alive: true, manpower: 10000 }, PLAYER: { alive: true } } },
    events: [offer], bus: { emit(...args) { emitted.push(args); } },
    helpers: { historicalCrisisInfo() { return { exists, elder: 'HYR', younger: 'ARI' }; },
      chooseHistoricalCrisis(_ctx, key, choice) { chosen.push([key, choice]); } },
    byId: id => ({ id, owner: 'ARI' }),
  };
  return { ctx, chosen, emitted, settle() { exists = false; } };
}
{
  const s = scene();
  const before = JSON.stringify(s.ctx.game);
  assert.equal(strategicEventChoice(s.ctx, offer, null, 0), 0);
  assert.equal(JSON.stringify(s.ctx.game), before, 'policy preview is pure');
  fireEvent(s.ctx, offer);
  assert.deepEqual(s.chosen, [['brothers', 'offer']], 'depleted court actually offers settlement');
}
{
  const s = scene(), g = s.ctx.game;
  Object.assign(g.tags.HYR, { treasury: 1000, manpower: 30000, stability: 2, warExhaustion: 0,
    courtPlan: { goals: [{ kind: 'recover', target: 'ARI' }], reserve: 150 } });
  g.armies.a.men = 40000; g.armies.b.men = 2000;
  assert.equal(strategicEventChoice(s.ctx, offer, null, 0), 1);
  fireEvent(s.ctx, offer);
  assert.deepEqual(s.chosen, [['brothers', 'fight']], 'prepared claimant pursues the war instead of historical submission');
  assert.equal(strategicEventChoice(s.ctx, offer, [0], 0), 0, 'restricted options remain restricted');
  g.tags.HYR.modifiers = [{ effects: { aiPassive: true } }];
  assert.equal(strategicEventChoice(s.ctx, offer, null, 0), 0, 'scripted diplomatic lull discourages renewed war');
}
{
  const s = scene(); s.ctx.game.playerTag = 'HYR';
  fireEvent(s.ctx, offer);
  const pe = s.ctx.game.pendingEvents[0]; assert(pe && !pe.notice);
  s.settle(); resolveEventOption(s.ctx, pe.instanceId, 1);
  assert.deepEqual(s.chosen, [], 'an intervening settlement prevents a queued war answer from changing reality');
  assert.equal(s.ctx.game.pendingEvents.length, 0);
  assert(s.emitted.some(([kind]) => kind === 'eventResolved'));
}
{
  const s = scene(); s.settle(); fireEvent(s.ctx, offer);
  assert.deepEqual(s.chosen, [], 'direct event fire respects changed political context');
}
{
  const s = scene(), g = s.ctx.game;
  g.tags.SAS = g.tags.HYR; g.tags.BYZ = g.tags.ARI;
  g.armies = { a: { tag: 'SAS', men: 1000 }, b: { tag: 'BYZ', men: 18000 } };
  s.ctx.helpers.politicalCrisisInfo = () => ({ persia: 'SAS', rome: 'BYZ', exists: true });
  assert.equal(strategicEventChoice(s.ctx, PEACE628_ENTRY, null, 0), 0);
  Object.assign(g.tags.SAS, { manpower: 30000, treasury: 1000, stability: 2, warExhaustion: 0,
    courtPlan: { goals: [{ kind: 'recover', target: 'BYZ' }], reserve: 100 } });
  g.armies.a.men = 40000;
  assert.equal(strategicEventChoice(s.ctx, PEACE628_ENTRY, null, 0), 1, 'Persia may continue a viable war instead of always taking recorded peace');
}
{
  const s = scene(), t = s.ctx.game.tags.HYR;
  s.ctx.helpers.historicalCrisisInfo = () => ({ sponsor: 'HYR', incumbent: 'ARI', exists: true, canFund: true, canBackKing: true });
  Object.assign(t, { treasury: 1000, courtPlan: { goals: [], reserve: 100 }, opinion: { ARI: -100 } });
  assert.equal(strategicEventChoice(s.ctx, BALAS_EVENT, null, 0), 0, 'rivalry encourages funding the rival claimant');
  t.opinion.ARI = 100;
  assert.equal(strategicEventChoice(s.ctx, BALAS_EVENT, null, 0), 1, 'friendship favors the incumbent offer');
  t.opinion.ARI = 0; t.treasury = 10; t.courtPlan.goals = [{ kind: 'rebuild' }];
  assert.equal(strategicEventChoice(s.ctx, BALAS_EVENT, null, 0), 2, 'a depleted court preserves its scarce resources');
  t.treasury = 1000; t.courtPlan.goals = [];
  t.courtPlan.memories = [{ other: 'ARI', weight: -30, expires: 1000 }];
  assert.equal(strategicEventChoice(s.ctx, BALAS_EVENT, null, 1), 0, 'remembered betrayal changes which claimant receives support');
}
{
  const s = scene();
  rememberAllianceBreak(s.ctx, 'HYR', 'ARI');
  assert.equal(s.ctx.game.tags.ARI.diplomaticCredit.HYR.trust, 30);
  assert(JSON.stringify(s.ctx.game.tags.ARI.courtPlan).includes('abandoned_ally'));
  const war = { promises: [{ ally: 'ARI', caller: 'HYR', province: 1 }], promiseVictory: { HYR: true } };
  settlePromises(s.ctx, war);
  assert.equal(s.ctx.game.tags.ARI.diplomaticCredit.HYR.trust, 40);
  assert(JSON.stringify(s.ctx.game.tags.ARI.courtPlan).includes('kept_promise'));
  const after = JSON.stringify(s.ctx.game.tags.ARI); settlePromises(s.ctx, war);
  assert.equal(JSON.stringify(s.ctx.game.tags.ARI), after, 'settling the same promise twice cannot create memory or trust twice');
  s.ctx.byId = () => ({ owner: 'HYR' });
  settlePromises(s.ctx, { promises: [{ ally: 'ARI', caller: 'HYR', province: 2 }], promiseVictory: { HYR: true } });
  assert(JSON.stringify(s.ctx.game.tags.ARI.courtPlan).includes('broken_promise'));
}
console.log('ALL PASS: strategic historical choices, legal alternatives, queued settlement revalidation and diplomatic memories');
