// Headless regression — SPEC §186: every arm has a face, a gait, and a weakness.
//
// Three land arms — the foot, the mounted, the shot — six patterns each, and
// a triangle they answer each other in: the shot breaks the line, the line
// brakes the charge, the charge rides down the shot. Armor is the twentieth
// century's exception, answered by the guns (a count), the sky (§154) and the
// ground itself. What this suite holds:
//   - the roster: eighteen patterns, eighteen names, eighteen distinct faces,
//     and a move/battle cue for every one;
//   - the triangle: each classic matchup scores in its own phase, balanced
//     hosts read zero, and the pips are capped;
//   - armor: it beats unsupported foot, a braced line stops being an answer,
//     the guns answer it by count, and broken ground cuts BOTH the triangle
//     and §181's own quantity pips;
//   - the gait: a column marches at its slowest arm, and hopDays agrees;
//   - the plumbing: recruit / split / merge / reinforce / the AI muster all
//     round-trip three arms, and regCount counts them;
//   - the lead arm: a third armor puts the tank on the standard, a fifth does
//     not, and the cue follows the face;
//   - a real 1948 battle carries mixA/mixD in the right phases while §181's
//     armA/armD keep their own meaning;
//   - reviveGame writes the missing key for a pre-§186 save.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { initGame, makeCtx, gameActions, reviveGame } = await import(R + '/js/sim/init.js');
const mil = await import(R + '/js/sim/military.js');
const u = await import(R + '/js/data/units.js');
const { UNIT_GENS } = await import(R + '/js/data/tech.js');

const num0 = (v) => (Number.isFinite(v) ? v : 0);
let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const geom = {
  neighbors: snap.neighbors.map((a) => new Set(a)),
  centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
  coastal: snap.coastal.map(Boolean),
  offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
  areas: Int32Array.from(snap.areas), bbox: [],
};
let notices = [];
const bus = { emit(kind, payload) { notices.push({ kind, payload }); }, on() { return () => {}; } };

function boot(eraId, playerTag, seed = 11) {
  const ERA = ERAS.find((e) => e.bookmark.id === eraId);
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: ERA.bookmark, events: ERA.events,
    playerTag, rngSeed: seed,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus, bookmark: ERA.bookmark, events: ERA.events,
  });
  return { game, ctx, actions: gameActions(ctx) };
}

// A province this tag owns, controls, and where nobody is standing — so a
// spawned test army is not immediately locked into somebody else's war.
function quietProv(ctx, game, tag) {
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (!p || p.impassable) continue;
    if (p.owner !== tag || p.controller !== tag) continue;
    if (mil.armiesInProv(ctx, i).length) continue;
    return i;
  }
  return 0;
}

// A side as sideStats builds one, for scoring the triangle directly.
function side(inf, cav, art, gen) {
  const regs = { inf, cav, art };
  const modern = u.isArmorGen(gen, DEFINES);
  return {
    regs,
    shares: u.armShares(regs),
    armor: modern ? cav : 0,               // §181's COUNT
    armorArm: modern && cav > 0,
    artModern: modern && art > 0,
  };
}
const ctxOf = () => ({ DEFINES });

console.log('== the roster: eighteen soldiers ==');
{
  ok(u.ARMS.length === 3 && u.ARMS.join(',') === 'inf,cav,art', 'three land arms, in order');
  ok(u.ART_GENS.length === UNIT_GENS.length, 'the shot has a pattern for every generation');
  const names = new Set(), glyphs = new Set(), cues = new Set();
  let allNamed = true, allDrawn = true, allHeard = true;
  for (let gi = 0; gi < UNIT_GENS.length; gi++) {
    for (const arm of u.ARMS) {
      const n = u.armGenName(gi, arm);
      const gk = u.unitGlyphKey(gi, arm);
      const d = u.unitGlyphPath(gi, arm);
      if (!n) allNamed = false;
      if (!d || d.length < 20) allDrawn = false;
      if (!u.unitMoveCue(gi, arm) || !u.unitBattleCue(gi, arm)) allHeard = false;
      names.add(n); glyphs.add(gk); cues.add(u.unitMoveCue(gi, arm));
    }
  }
  ok(allNamed && names.size === 18, 'eighteen patterns, eighteen distinct names (' + names.size + ')');
  ok(allDrawn && glyphs.size === 18, '…eighteen distinct faces, none shared (' + glyphs.size + ')');
  ok(allHeard, '…and every one has a marching cue and a battle cue');
  ok(u.armGenName(1, 'inf') === 'Drilled Spearmen' && u.unitGlyphKey(1, 'inf') === 'spear',
    'the spearmen carry a spear');
  ok(u.armGenName(0, 'cav') === 'Raider Horse' && u.unitGlyphKey(0, 'cav') === 'horse',
    'the raider horse carries a horse');
  ok(u.armGenName(5, 'cav') === 'Armored Corps' && u.unitGlyphKey(5, 'cav') === 'tank',
    'the armored corps carries a tank');
  ok(u.unitMoveCue(5, 'cav') === 'engines' && u.unitMoveCue(2, 'cav') === 'hooves',
    'armor sounds like engines; a cataphract still sounds like hooves');
  // Every face has to survive being handed to a path parser, which is what
  // the map does with it every frame.
  let parseable = true;
  for (const key of Object.keys(u.UNIT_GLYPHS)) {
    const d = u.UNIT_GLYPHS[key];
    if (typeof d !== 'string' || !/^M/.test(d) || /[<>]/.test(d)) parseable = false;
  }
  ok(parseable, 'every face is bare path data — no markup, drawable on canvas and in SVG alike');
  ok(u.unitGlyphSvg(1, 'inf').startsWith('<path d="'), '…and wraps to SVG markup for the panels');
}

console.log('== the triangle ==');
{
  const c = ctxOf();
  const pips = (phase, m, t, terr) => mil.armPips(c, phase, m, t, terr || '');
  ok(pips('shock', side(10, 0, 0, 1), side(0, 10, 0, 1)) === 2, 'the spear wall brakes the charge: +2 shock');
  ok(pips('shock', side(0, 10, 0, 1), side(0, 0, 10, 1)) === 2, 'the charge rides down the shot: +2 shock');
  ok(pips('fire', side(0, 0, 10, 1), side(10, 0, 0, 1)) === 2, 'the shot breaks the line: +2 fire');
  ok(pips('fire', side(0, 10, 0, 1), side(10, 0, 0, 1)) === 0, 'the charge is not a fire-phase act');
  ok(pips('shock', side(0, 0, 10, 1), side(10, 0, 0, 1)) === 0, 'guns are not a melee arm');
  ok(pips('fire', side(6, 1, 1, 1), side(6, 1, 1, 1)) === 0
    && pips('shock', side(6, 1, 1, 1), side(6, 1, 1, 1)) === 0,
  'two ordinary balanced hosts read zero in both phases');
  ok(pips('fire', side(7, 0, 3, 1), side(10, 0, 0, 1)) === 1,
    'three archers in ten against a formed line is worth one pip');
  ok(pips('fire', side(9, 0, 1, 1), side(10, 0, 0, 1)) === 0,
    '…one in ten is not');
  const cap = DEFINES.ARMS_TRIANGLE.cap;
  ok(pips('fire', side(0, 0, 20, 1), side(20, 0, 0, 1)) === cap, 'the triangle caps at ' + cap);
}

console.log('== armor, and its three answers ==');
{
  const c = ctxOf();
  const pips = (phase, m, t, terr) => mil.armPips(c, phase, m, t, terr || '');
  const T = DEFINES.ARMS_TRIANGLE;
  ok(pips('shock', side(0, 10, 0, 5), side(10, 0, 0, 5)) === 2,
    'armor rolls over unsupported foot: +2 shock');
  ok(pips('shock', side(10, 0, 0, 5), side(0, 10, 0, 5)) === 0,
    'a rifle company does not stop a Sherman by forming square');
  ok(pips('shock', side(10, 0, 0, 1), side(0, 10, 0, 1)) === 2,
    '…while the same line against HORSE still braces (the answer changed, not the rule)');
  // The guns answer by count, not by proportion.
  ok(mil.antiArmorPips(c, 'fire', side(10, 0, 4, 5), side(6, 4, 0, 5))
    === Math.min(T.atCap, Math.ceil(4 / T.atPer)),
  'four anti-tank regiments against four tanks: ' + Math.ceil(4 / T.atPer) + ' fire-phase pips');
  ok(mil.antiArmorPips(c, 'fire', side(10, 0, 1, 5), side(6, 4, 0, 5)) === 1,
    '…one gun still answers, at its own scale');
  ok(mil.antiArmorPips(c, 'fire', side(10, 0, 9, 5), side(6, 1, 0, 5))
    === Math.ceil(1 / T.atPer),
  '…and guns are never worth more than there are tanks to engage');
  ok(mil.antiArmorPips(c, 'shock', side(10, 0, 4, 5), side(6, 4, 0, 5)) === 0,
    'the guns answer in the fire phase, not the melee');
  ok(mil.antiArmorPips(c, 'fire', side(10, 0, 4, 3), side(6, 4, 0, 3)) === 0,
    'a naphtha crew is not an anti-tank gun');
  ok(mil.antiArmorPips(c, 'fire', side(10, 0, 4, 5), side(10, 0, 0, 5)) === 0,
    '…and there is nothing to answer where there is no armor');
  // The ground.
  ok(pips('shock', side(0, 10, 0, 5), side(10, 0, 0, 5), 'mountains') === 0,
    'a tank that cannot go around a mountain earns nothing');
  ok(pips('shock', side(0, 10, 0, 1), side(0, 0, 10, 1), 'mountains')
    < pips('shock', side(0, 10, 0, 1), side(0, 0, 10, 1), 'farmland'),
  'and broken ground takes the charge from horse too');
  ok(pips('shock', side(0, 10, 0, 5), side(10, 0, 0, 5), 'farmland') === 2,
    'open ground gives armor everything back');
}

console.log('== the gait ==');
{
  const { game, ctx } = boot('167bce', 'HAS');
  const home = quietProv(ctx, game, 'HAS');
  ok(home > 0, 'found a quiet province to march from');
  const name = game.provinces[home].name;
  const foot = mil.spawnArmy(ctx, 'HAS', name, { inf: 4, name: 'Foot' });
  const horse = mil.spawnArmy(ctx, 'HAS', name, { cav: 4, name: 'Horse' });
  const train = mil.spawnArmy(ctx, 'HAS', name, { inf: 4, art: 1, name: 'Train' });
  ok(mil.armSpeedOf(game.armies[foot]) === u.ARM.inf.speed, 'foot marches at the foot pace');
  ok(mil.armSpeedOf(game.armies[horse]) === u.ARM.cav.speed, 'horse alone marches at the horse pace');
  ok(mil.armSpeedOf(game.armies[train]) === u.ARM.art.speed,
    'one gun battery sets the pace of everything it travels with');
  const nb = [...geom.neighbors[home]].find((n) => game.provinces[n]
    && !game.provinces[n].impassable && mil.canEnter(ctx, 'HAS', n));
  ok(nb > 0, 'found somewhere to march to');
  const dFoot = mil.hopDays(ctx, home, nb, game.armies[foot]);
  const dHorse = mil.hopDays(ctx, home, nb, game.armies[horse]);
  const dTrain = mil.hopDays(ctx, home, nb, game.armies[train]);
  ok(dHorse < dFoot, 'and the clock agrees: horse arrives before foot (' + dHorse + ' vs ' + dFoot + ' days)');
  ok(dTrain > dFoot, '…and the gun train after it (' + dTrain + ' days)');
}

console.log('== what a column sounds like on the road ==');
{
  const { game, ctx, actions } = boot('167bce', 'HAS');
  const home = quietProv(ctx, game, 'HAS');
  const name = game.provinces[home].name;
  const nb = [...geom.neighbors[home]].find((n) => game.provinces[n]
    && !game.provinces[n].impassable && mil.canEnter(ctx, 'HAS', n));
  const cueFor = (regs) => {
    const id = mil.spawnArmy(ctx, 'HAS', name, { ...regs, name: 'Column' });
    notices = [];
    actions.moveArmy(id, nb);
    const m = notices.filter((n) => n.kind === 'armyMarch').pop();
    mil.removeArmy(ctx, id);
    return m ? m.payload : null;
  };
  const onFoot = cueFor({ inf: 6 });
  ok(onFoot && onFoot.arm === 'inf' && onFoot.cue === 'march',
    'a column of foot marches to tramping feet');
  const mounted = cueFor({ inf: 4, cav: 4 });
  ok(mounted && mounted.arm === 'cav' && mounted.cue === 'hooves',
    'a host that is half horse rides out to hooves');
  const guns = cueFor({ inf: 4, art: 4 });
  ok(guns && guns.arm === 'art' && guns.cue === 'timber',
    'a gun group creaks out on timber and rope');
  // 1948: the same order, and the cue is an engine.
  const modern = boot('1948ce', 'ISR');
  const mHome = quietProv(modern.ctx, modern.game, 'ISR');
  const mNb = [...geom.neighbors[mHome]].find((n) => modern.game.provinces[n]
    && !modern.game.provinces[n].impassable && mil.canEnter(modern.ctx, 'ISR', n));
  const armored = mil.spawnArmy(modern.ctx, 'ISR', modern.game.provinces[mHome].name,
    { inf: 5, cav: 5, gen: 5, name: 'Armored Brigade' });
  notices = [];
  modern.actions.moveArmy(armored, mNb);
  const m = notices.filter((n) => n.kind === 'armyMarch').pop();
  ok(m && m.payload.arm === 'cav' && m.payload.cue === 'engines',
    'and an armored brigade pulls out on diesel and track');
  ok(notices.filter((n) => n.kind === 'armyMarch').length === 1,
    'one order, one cue — the map is not a drum circle');
}

console.log('== the plumbing: three arms all the way down ==');
{
  const { game, ctx, actions } = boot('167bce', 'HAS');
  const home = quietProv(ctx, game, 'HAS');
  const name = game.provinces[home].name;
  game.tags.HAS.treasury = 500;
  game.tags.HAS.manpower = 50000;
  const before = game.tags.HAS.treasury;
  const res = mil.recruitRegiment(ctx, 'HAS', home, 'art');
  ok(res.ok, 'the shot musters like any other arm');
  ok(before - game.tags.HAS.treasury === DEFINES.BASE.regCost.art,
    'at the shot price (' + DEFINES.BASE.regCost.art + ' talents)');
  ok(res.queued && res.queued.totalMonths === DEFINES.BASE.unitRecruitMonths.art,
    'in ' + DEFINES.BASE.unitRecruitMonths.art + ' months, from DEFINES');
  ok(!mil.recruitRegiment(ctx, 'HAS', home, 'siege_elephant').ok, 'and an arm nobody has is refused');

  const id = mil.spawnArmy(ctx, 'HAS', name, { inf: 6, cav: 2, art: 2, name: 'Combined Host' });
  const a = game.armies[id];
  ok(mil.regCount(a) === 10, 'regCount counts all three arms');
  ok(a.men === 10 * DEFINES.BASE.regSize, '…and the men follow the regiments');

  const sid = mil.splitArmyCore(ctx, a);
  const det = game.armies[sid];
  ok(det && det.regiments.inf === 3 && det.regiments.cav === 1 && det.regiments.art === 1,
    'a split halves each arm rather than any one of them');
  ok(a.regiments.inf === 3 && a.regiments.cav === 1 && a.regiments.art === 1,
    '…and the parent keeps the other half');
  ok(mil.mergeInto(ctx, sid, id), 'the halves merge back');
  ok(a.regiments.inf === 6 && a.regiments.cav === 2 && a.regiments.art === 2,
    '…whole, with nothing lost in the round trip');

  // A two-regiment army of one horse and one gun must not split into two of
  // something: largest-remainder, not proportional rounding.
  const pid = mil.spawnArmy(ctx, 'HAS', name, { cav: 1, art: 1, name: 'Pair' });
  const psid = mil.splitArmyCore(ctx, game.armies[pid]);
  const kept = game.armies[pid].regiments, gone = game.armies[psid].regiments;
  ok(mil.regCount(game.armies[pid]) === 1 && mil.regCount(game.armies[psid]) === 1
    && kept.cav + gone.cav === 1 && kept.art + gone.art === 1,
  'a horse and a gun split into a horse and a gun, not two of one');

  // Hollowed armies shed regiments across the arms, not just off the foot.
  const hid = mil.spawnArmy(ctx, 'HAS', name, { inf: 6, cav: 3, art: 3, name: 'Hollow' });
  game.armies[hid].men = 2000;
  mil.monthlyReinforce(ctx);
  const h = game.armies[hid];
  ok(mil.regCount(h) <= 4, 'a hollowed host consolidates (' + mil.regCount(h) + ' regiments left)');
  ok(h.regiments.inf >= 0 && h.regiments.cav >= 0 && h.regiments.art >= 0,
    '…and no arm is driven negative doing it');

  const details = actions.getUnitDetails({ armyId: id });
  const row = details && details.armies && details.armies[0];
  ok(row && row.art === 2 && row.artName === u.armGenName(row.gen, 'art'),
    'the inspector names the shot by its pattern');
  ok(row && Math.abs(row.paceMult - u.ARM.art.speed) < 1e-9,
    '…and reports the pace its slowest arm gives it');
}

console.log('== the AI musters three arms ==');
{
  const { game, ctx } = boot('66ce', 'JUD');
  const aiMod = await import(R + '/js/sim/ai.js');
  // Every province trains one unit at a time, so a standing queue hides what
  // the AI would raise NEXT. Drain the queues each month and count the flow.
  const counts = { inf: 0, cav: 0, art: 0 };
  for (let i = 0; i < 60; i++) {
    for (const tag of Object.keys(game.tags)) {
      const t = game.tags[tag];
      if (!t || !t.ai) continue;
      t.treasury = Math.max(num0(t.treasury), 3000);
      t.manpower = Math.max(num0(t.manpower), 300000);
      t.income = Math.max(num0(t.income), 200);
    }
    aiMod.runMonthlyAI(ctx);
    for (let p = 1; p < game.provinces.length; p++) {
      const q = game.provinces[p];
      if (!q || !Array.isArray(q.unitQueue)) continue;
      for (const o of q.unitQueue) if (counts[o.type] !== undefined) counts[o.type]++;
      q.unitQueue.length = 0;
    }
  }
  const total = counts.inf + counts.cav + counts.art;
  ok(counts.inf > 0, 'the AI raises foot (' + counts.inf + ')');
  ok(counts.cav > 0, '…and horse (' + counts.cav + ')');
  ok(counts.art > 0, '…and the shot (' + counts.art + ')');
  ok(total > 0 && counts.inf / total >= 0.35,
    'foot is still the bulk of every establishment (' + Math.round(100 * counts.inf / total) + '%)');
  ok(total > 0 && counts.cav / total <= 0.45 && counts.art / total <= 0.45,
    '…so no AI court fields a host one arm answers outright');
}

console.log('== the lead arm ==');
{
  ok(u.dominantArm({ inf: 6, cav: 4, art: 0 }) === 'cav',
    'a host that is 40% armor flies the tank');
  ok(u.dominantArm({ inf: 8, cav: 2, art: 0 }) === 'inf',
    '…one that is 20% horse still flies the foot');
  ok(u.dominantArm({ inf: 6, cav: 0, art: 4 }) === 'art', 'a gun line flies a gun');
  ok(u.dominantArm({ inf: 10, cav: 4, art: 0 }) === 'inf',
    '…and a mostly-foot host with a squadron attached is still foot');
  ok(u.dominantArm({ inf: 0, cav: 0, art: 0 }) === 'inf', 'a skeleton formation reads as foot');
  ok(u.dominantArm({ inf: 0, cav: 5, art: 0 }) === 'cav' && u.dominantArm({ inf: 0, cav: 0, art: 5 }) === 'art',
    'a pure host of one arm reads as that arm');
}

console.log('== a real battle, 1948 ==');
{
  const { game, ctx } = boot('1948ce', 'ISR');
  const jamnia = ctx.provId('Jamnia');
  for (const a of Object.values(game.armies)) if (a.prov === jamnia) mil.removeArmy(ctx, a.id);
  notices = [];
  // Armor against a gun line, on flat ground (Jamnia is farmland). Deep
  // morale so both sides live to see both phases whatever the dice do.
  const armored = mil.spawnArmy(ctx, 'ISR', 'Jamnia', { inf: 6, cav: 4, name: 'Armored Fist' });
  mil.spawnArmy(ctx, 'EGY', 'Jamnia', { inf: 10, art: 4, name: 'Gun Line' });
  for (const a of Object.values(game.armies)) if (a.prov === jamnia) { a.gen = 5; a.morale = 30; a.maxMorale = 30; }
  mil.engageIfNeeded(ctx, game.armies[armored]);
  const start = notices.find((n) => n.kind === 'battleStart');
  ok(!!start, 'the engagement opens a battle');
  ok(start && start.payload.atkCue && start.payload.defCue,
    'and the field announces what each side sounds like going in');
  const b = game.battles.find((x) => x && x.prov === jamnia);
  ok(!!b, 'the battle is on the books');
  const isrIsAtk = (b.atk || []).some((id) => game.armies[id] && game.armies[id].tag === 'ISR');
  const seen = { fire: null, shock: null };
  for (let d = 0; d < 10 && game.battles.indexOf(b) >= 0 && !(seen.fire && seen.shock); d++) {
    mil.tickBattles(ctx);
    if (b.last && !seen[b.last.phase]) seen[b.last.phase] = { ...b.last };
  }
  const tank = (r) => (isrIsAtk ? r.mixA : r.mixD);
  const guns = (r) => (isrIsAtk ? r.mixD : r.mixA);
  ok(seen.shock && tank(seen.shock) > 0,
    'in the shock phase the armor earns composition pips (' + (seen.shock && tank(seen.shock)) + ')');
  ok(seen.fire && guns(seen.fire) > 0,
    'in the fire phase the guns answer them (' + (seen.fire && guns(seen.fire)) + ')');
  ok(seen.fire && tank(seen.fire) === 0, 'armor earns nothing from the triangle in the fire phase');
  ok(seen.shock && (isrIsAtk ? seen.shock.armA : seen.shock.armD) > 0,
    '…while §181\'s own quantity pips keep their separate meaning and their own field');
}

console.log('== the ancient chapters never see the modern arithmetic ==');
{
  const { game, ctx } = boot('167bce', 'HAS');
  const c = ctxOf();
  const home = quietProv(ctx, game, 'HAS');
  const name = game.provinces[home].name;
  const id = mil.spawnArmy(ctx, 'HAS', name, { cav: 6, name: 'Horse' });
  ok(!u.isArmorGen(game.armies[id].gen, DEFINES), 'a Maccabean horse column is not armor');
  ok(mil.antiArmorPips(c, 'fire', side(10, 0, 4, 0), side(0, 6, 0, 0)) === 0,
    'and no sling band was ever an anti-tank gun');
  ok(mil.armPips(c, 'shock', side(10, 0, 0, 0), side(0, 10, 0, 0)) === 2,
    'the ancient triangle is the one that answers instead');
}

console.log('== the save contract ==');
{
  const { game } = boot('167bce', 'HAS');
  const saved = JSON.parse(JSON.stringify(game));
  let stripped = 0;
  for (const k of Object.keys(saved.armies || {})) {
    if (saved.armies[k] && saved.armies[k].regiments) { delete saved.armies[k].regiments.art; stripped++; }
  }
  ok(stripped > 0, 'a pre-§186 save has armies with two arms');
  const revived = reviveGame(saved);
  const all = Object.values((revived && revived.armies) || {});
  ok(all.length > 0 && all.every((a) => a.regiments && a.regiments.art === 0),
    '…and loads with no guns rather than a crash');
  ok(all.every((a) => mil.regCount(a) > 0), '…with every host still counting its regiments');
}

console.log(failures ? `smoke122: ${failures} FAILURES` : 'smoke122: ALL PASS');
process.exit(failures ? 1 : 0);
