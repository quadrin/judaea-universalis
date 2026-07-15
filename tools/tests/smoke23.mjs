// Headless smoke test — campaign guidance, visible-era mechanics, irregular
// upkeep, revolt pacing, Persian patronage, and the 1948–56 defense/rearmament arc.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { campaignGuidance } = await import(R + '/js/data/campaign_guidance.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { BOOKMARK_115 } = await import(R + '/js/data/bookmark_115ce.js');
const { EVENTS_115 } = await import(R + '/js/data/events_115ce.js');
const { BOOKMARK_132 } = await import(R + '/js/data/bookmark_132ce.js');
const { EVENTS_132 } = await import(R + '/js/data/events_132ce.js');
const { BOOKMARK_614 } = await import(R + '/js/data/bookmark_614ce.js');
const { EVENTS_614 } = await import(R + '/js/data/events_614ce.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { EVENTS_1948 } = await import(R + '/js/data/events_1948.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { incomeBreakdown } = await import(R + '/js/sim/economy.js');
const { runMonthlyAI } = await import(R + '/js/sim/ai.js');
const { queuedUnitsOf } = await import(R + '/js/sim/recruitment.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const geom = {
  neighbors: Array.from({ length: N + 1 }, (_, i) => {
    const s = new Set();
    if (i > 1) s.add(i - 1);
    if (i >= 1 && i < N) s.add(i + 1);
    return s;
  }),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [],
};

function boot(bookmark, events, playerTag, seed = 91) {
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events, playerTag, rngSeed: seed });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events });
  return { game, ctx, actions: gameActions(ctx) };
}

function regiments(game, tag) {
  let n = 0;
  for (const a of Object.values(game.armies || {})) {
    if (!a || a.tag !== tag) continue;
    n += ((a.regiments && a.regiments.inf) || 0) + ((a.regiments && a.regiments.cav) || 0);
  }
  return n;
}

console.log('== every standard has a campaign contract ==');
ok(DEFINES.RELIGIONS.judaism.name === 'Judaism', 'the Jewish religion is displayed as Judaism');
for (const [id, file, exp, expectedTags] of [
  ['167bce', 'bookmark_167bce', 'BOOKMARK_167', ['HAS']],
  ['67bce', 'bookmark_67bce', 'BOOKMARK_67', ['HYR', 'ARI']],
  ['40bce', 'bookmark_40bce', 'BOOKMARK_40', ['HER', 'ATG']],
  ['66ce', 'bookmark_66ce', 'BOOKMARK_66', ['JUD']],
  ['115ce', 'bookmark_115ce', 'BOOKMARK_115', ['JUD']],
  ['132ce', 'bookmark_132ce', 'BOOKMARK_132', ['JUD']],
  ['614ce', 'bookmark_614ce', 'BOOKMARK_614', ['JUD']],
  ['1948ce', 'bookmark_1948', 'BOOKMARK_1948', ['ISR']],
]) {
  const { [exp]: bm } = await import(R + '/js/data/' + file + '.js');
  const playable = bm.playableTags.map((p) => p.tag);
  ok(JSON.stringify(playable) === JSON.stringify(expectedTags),
    id + ': playable roster is ' + playable.join(', '));
  ok(playable.every((tag) => DEFINES.TAGS[tag] && DEFINES.TAGS[tag].religion === 'judaism'),
    id + ': every playable standard is Jewish');
  for (const p of bm.playableTags) {
    const guide = campaignGuidance(id, p.tag, bm.startDate);
    ok(guide && guide.opening.length === 3 && guide.next,
      id + '/' + p.tag + ': three first moves and a live pressure clock');
  }
}

console.log('== irregular hosts pay irregular upkeep ==');
{
  const { game, ctx, actions } = boot(BOOKMARK_66, EVENTS_66, 'JUD');
  const withFervor = incomeBreakdown(ctx, 'JUD').maint;
  game.tags.JUD.modifiers = game.tags.JUD.modifiers.filter((m) => m.id !== 'religious_fervor');
  const regular = incomeBreakdown(ctx, 'JUD').maint;
  ok(regular > 0 && Math.abs(withFervor / regular - 0.65) < 0.001,
    'Great Revolt upkeep is discounted to 65% while the irregular host lasts');
  const guide = actions.getCampaignGuidance();
  ok(guide && guide.objectives.some((line) => /^Lose:/.test(line)),
    'the sim exposes the pinned campaign objectives');
}

console.log('== the prepared revolt receives an opening window ==');
{
  const { game } = boot(BOOKMARK_132, EVENTS_132, 'JUD');
  const response = game.tags.ROM.modifiers.find((m) => m.id === 'provincial_response');
  const armories = game.tags.JUD.modifiers.find((m) => m.id === 'hidden_armories');
  ok(response && response.effects.aiPassive, 'Rome holds during the provincial-response phase');
  ok(armories && armories.effects.maintMult === 0.55, 'the underground host is affordable while the armories last');
}

console.log('== separate Kitos theaters do not share an instant staff ==');
{
  const { game, ctx } = boot(BOOKMARK_115, EVENTS_115, 'JUD');
  const friction = game.tags.JUD.modifiers.find((m) => m.id === 'scattered_risings');
  ok(friction && friction.effects.disciplineMult === 0.9 && friction.effects.reinforceMult === 0.8,
    'coordination friction weakens the unified field army abstraction');
  const beforeRelief = regiments(game, 'ROM');
  for (const id of ['ev_k_turbo', 'ev_k_quietus', 'ev_k_reduction']) {
    EVENTS_115.find((e) => e.id === id).options[0].effects(ctx);
  }
  ok(regiments(game, 'ROM') === beforeRelief + 32,
    'Turbo, Quietus, and the Cyprus reduction deliver 32 regiments in distinct relief columns');
}

console.log('== Persian patronage pays for the Return, until it does not ==');
{
  const { game, ctx } = boot(BOOKMARK_614, EVENTS_614, 'JUD');
  const subsidized = incomeBreakdown(ctx, 'JUD').maint;
  const supply = game.tags.JUD.modifiers.find((m) => m.id === 'persian_supply_trains');
  ok(supply && supply.effects.maintMult === 0.65,
    'Persian supply trains make the allied rising economically viable');
  const betrayal = EVENTS_614.find((e) => e.id === 'ev_p_betrayal');
  betrayal.options[0].effects(ctx);
  const unsupported = incomeBreakdown(ctx, 'JUD').maint;
  ok(unsupported > 0 && Math.abs(subsidized / unsupported - 0.65) < 0.001,
    'Ctesiphon withdraws its logistical subsidy when it trades the client away');
}

console.log('== the armed armistice builds defensive commitments ==');
{
  const { game, ctx } = boot(BOOKMARK_1948, EVENTS_1948, 'ISR');
  const armistice = EVENTS_1948.find((e) => e.id === 'ev_i_armistice');
  armistice.options[0].effects(ctx);
  ok(!game.wars.some((w) => (w.attackers || []).includes('ISR') || (w.defenders || []).includes('ISR')),
    'Rhodes ends the coalition war');
  ok(['ISR', 'EGY', 'JOR', 'SYR', 'LEB', 'IRQ', 'SAU'].every((t) =>
    game.tags[t].modifiers.some((m) => m.id === 'armistice_restraint' && m.effects.noOpportunisticWars)),
  'the five-year armed armistice suppresses ahistorical random wars');

  const pact = EVENTS_1948.find((e) => e.id === 'ev_i_joint_defence');
  pact.options[0].effects(ctx);
  const members = ['EGY', 'JOR', 'SYR', 'LEB', 'IRQ', 'SAU'];
  ok(members.every((a) => members.every((b) => a === b || game.tags[a].guarantees.includes(b))),
    'the Arab League members guarantee one another defensively');
  ok(game.flags.postwarRearmament, 'the postwar force-planning phase is active');

  for (const t of Object.values(game.tags)) if (t) t.ai = true;
  game.tags.LEB.treasury = 1000;
  game.tags.LEB.manpower = 10000;
  game.tags.LEB.income = 30;
  const before = regiments(game, 'LEB');
  runMonthlyAI(ctx);
  ok(regiments(game, 'LEB') + queuedUnitsOf(ctx, 'LEB', ['inf', 'cav']) > before,
    'a solvent threatened state commits recruits above its frozen old target');

  const arms = EVENTS_1948.find((e) => e.id === 'ev_i_arms_race');
  const egyptBefore = regiments(game, 'EGY');
  arms.options[0].effects(ctx);
  ok(game.flags.armsRaceEscalated && regiments(game, 'EGY') >= egyptBefore + 8,
    'the 1955 agreement adds Egyptian formations and raises regional ceilings');
  ok(game.tags.ISR.modifiers.some((m) => m.id === 'arms_race_response'),
    'Israel receives a matching rearmament response');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
