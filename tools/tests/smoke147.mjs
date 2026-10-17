// Headless regression — concessions settle surrender, but never fund demands.
// Also covers province gifts at peace (SPEC §222).
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const mil = await import(R + '/js/sim/military.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const makeGeom = () => ({
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
});

// Judaea losing the Great Revolt: Rome at +60, one of ours under their boot,
// and a patch of waste we colonised before it started (SPEC §64).
function losing(seed = 222) {
  const geom = makeGeom();
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: [], playerTag: 'JUD', rngSeed: seed });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: [] });
  game.wars = [];
  game.truces = {};
  for (const k of Object.keys(game.tags)) if (game.tags[k]) game.tags[k].atWarWith = [];
  mil.declareWar(ctx, 'ROM', 'JUD', 'The Great Revolt');
  const war = game.wars.find((w) => w.attackers.includes('ROM'));
  war.attackers = ['ROM'];
  war.defenders = ['JUD'];
  war.warscore = { ROM: 60, JUD: -60 };
  for (const k of Object.keys(game.tags)) if (game.tags[k]) game.tags[k].atWarWith = [];
  game.tags.ROM.atWarWith = ['JUD'];
  game.tags.JUD.atWarWith = ['ROM'];
  ctx.prov('Joppa').controller = 'ROM';
  let waste = null;
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (p && p.owner === 'WASTE' && !p.impassable) { waste = p; break; }
  }
  waste.owner = 'JUD'; waste.controller = 'JUD'; // as §64's annexation leaves it
  return { game, ctx, war, waste, actions: gameActions(ctx) };
}

console.log('== what a crown may put on the table ==');
{
  const { ctx, war, waste } = losing();
  const info = mil.peaceDealInfo(ctx, war, 'JUD');
  ok(info.myWs === -60, 'we are losing by 60');
  ok(info.provinces.length === 0, 'and hold nothing of theirs to demand');
  ok(info.concessions.length > 0, 'but we may offer ' + info.concessions.length + ' provinces of our own');

  const names = info.concessions.map((r) => r.name);
  const mine = [];
  for (let i = 1; i < ctx.game.provinces.length; i++) {
    const p = ctx.game.provinces[i];
    if (p && p.owner === 'JUD') mine.push(p.name);
  }
  ok(names.length === mine.length, 'every province we own is on it, and nothing else');
  ok(names.indexOf(waste.name) >= 0, 'including waste we colonised ourselves (' + waste.name + ')');
  ok(info.concessions.some((r) => r.occupied) && names.indexOf('Joppa') >= 0,
    'including what their armies already stand in');
  ok(info.concessions.some((r) => r.capital),
    'and the capital itself — a crown may sign it away; it does not have to');

  // One province, one price, whichever way it moves: what we offer is credited
  // at exactly what they would have paid to demand it.
  const row = info.concessions.find((r) => r.name === 'Joppa');
  const theirs = mil.peaceDealInfo(ctx, war, 'ROM');
  const theirRow = (theirs.provinces || []).find((r) => r.name === 'Joppa');
  ok(!!theirRow && theirRow.cost === row.cost,
    `Joppa is worth ${row.cost} at this table whether taken or given`);
}

console.log('== a losing crown buys its ending ==');
{
  const { ctx, game, war } = losing();
  ok(!mil.evaluatePeaceDeal(ctx, war, 'JUD', {}).acceptable,
    'a white peace is refused: ' + mil.evaluatePeaceDeal(ctx, war, 'JUD', {}).reason);

  const info = mil.peaceDealInfo(ctx, war, 'JUD');
  const sorted = [...info.concessions].sort((a, b) => b.cost - a.cost);
  const one = mil.evaluatePeaceDeal(ctx, war, 'JUD', { concessions: [sorted[0].id] });
  ok(!one.acceptable && /have won more than that/.test(one.reason),
    'too little is refused with the number their war has earned: ' + one.reason);

  const give = [];
  let sum = 0;
  for (const r of sorted) { if (sum >= 60) break; give.push(r.id); sum += r.cost; }
  const ev = mil.evaluatePeaceDeal(ctx, war, 'JUD', { concessions: give });
  ok(ev.acceptable && ev.offered >= 60, `enough is signed (${ev.offered} offered against 60): ` + ev.reason);
  ok(ev.net === -ev.offered, 'the ledger reads as one net: ' + ev.net);

  const before = { infamyRom: game.tags.ROM.aggression || 0, chronicle: game.chronicle.length };
  mil.executePeaceDeal(ctx, war, 'JUD', { concessions: give });
  const moved = give.map((id) => ctx.byId(id));
  ok(moved.every((p) => p.owner === 'ROM' && p.controller === 'ROM'), 'the land changes hands');
  ok(moved.every((p) => p.integration === 0 && p.autonomy >= 0.6
    && (p.modifiers || []).some((m) => m.id === 'recent_conquest')),
  'and arrives in Roman hands restive, unintegrated and freshly conquered');
  ok((game.tags.JUD.grudges && Object.keys(game.tags.JUD.grudges).length > 0)
    || mil.liveGrudge(ctx, 'JUD', 'ROM'), 'we remember the loss (SPEC §67)');
  ok((game.tags.ROM.aggression || 0) === before.infamyRom,
    'and nobody is counted a conqueror for being handed something');
  ok(!game.wars.some((w) => w.id === war.id), 'the war is over');
  const said = game.chronicle.slice(before.chronicle).map((e) => e.text).join(' ');
  ok(/Judaea cedes/.test(said), 'the chronicle says who gave what: ' + said.slice(0, 110));
}

console.log('== concessions cannot fund demands at any war score ==');
for (const score of [60, 1, 0, -60]) {
  const { ctx, game, war, actions } = losing();
  war.warscore = { ROM: -score, JUD: score };
  const theirs = ctx.prov('Caesarea Maritima');
  theirs.owner = 'ROM';
  theirs.controller = 'JUD';
  const info = mil.peaceDealInfo(ctx, war, 'JUD');
  const take = info.provinces.find(r => r.id === theirs.id);
  ok(!!take, 'enemy province available at ' + score + ' war score');
  const give = info.concessions.map(r => r.id);
  const variants = [
    { provinces: [take.id] }, { gold: 100 }, { humiliate: true }, { reparations: true },
    ...info.releasable.map(r => ({ release: [r.tag] })),
    ...info.transferableVassals.map(r => ({ transferVassals: [r.tag] })),
  ];
  for (const demand of variants) {
    const deal = { ...demand, concessions: give };
    const ev = actions.evaluatePeace(war.id, deal);
    ok(!ev.acceptable && ev.mixedTerms && /cannot pay for demands/.test(ev.reason),
      'mixed ' + Object.keys(demand)[0] + ' refused at ' + score);
    ok(ev.net === ev.cost && ev.offered > 0,
      'concessions never reduce the demand cost');
    const before = JSON.stringify(game);
    mil.executePeaceDeal(ctx, war, 'JUD', deal);
    ok(JSON.stringify(game) === before, 'direct execution cannot apply mixed terms');
  }
  if (score === 1) {
    const ordinary = actions.evaluatePeace(war.id, { provinces: [take.id] });
    ok(!ordinary.acceptable, 'province is beyond our actual bargaining power');
    actions.offerPeaceDeal(war.id, { provinces: [take.id], concessions: give });
    ok(theirs.owner === 'ROM' && give.every(id => ctx.byId(id).owner === 'JUD')
      && game.wars.includes(war), 'the player command transfers no land and leaves the war running');
  }
}

console.log('== nothing moves for a deal without concessions in it ==');
{
  // The guard on the whole section: an ordinary winning treaty prices and
  // reads exactly as it did before, which is why no AI history moves.
  const { ctx, game, war } = losing();
  war.warscore = { ROM: -60, JUD: 60 };
  const theirs = ctx.prov('Caesarea Maritima') || ctx.prov('Ascalon');
  theirs.owner = 'ROM';
  theirs.controller = 'JUD';
  const info = mil.peaceDealInfo(ctx, war, 'JUD');
  const take = (info.provinces || [])[0];
  const ev = mil.evaluatePeaceDeal(ctx, war, 'JUD', { provinces: [take.id] });
  ok(ev.offered === 0 && ev.net === ev.cost, 'an empty offer changes no arithmetic');
  ok(ev.acceptable && /compels them/.test(ev.reason), 'and the winner\'s verdict is the old one: ' + ev.reason);
  const white = mil.evaluatePeaceDeal(ctx, war, 'JUD', {});
  ok(/lay down arms/.test(white.reason), 'the white peace still reads as it did: ' + white.reason);
  // Subjugation supersedes everything at the table, ours included.
  const sub = mil.evaluatePeaceDeal(ctx, war, 'JUD', { subjugate: true, concessions: info.concessions.map((r) => r.id) });
  ok(sub.offered === 0 && (sub.concessions || []).length === 0,
    'a subjugation clause takes nothing of ours with it');
  ok(game.tags.JUD.alive, 'and the realm is intact throughout');
}

console.log('== the panel, as the player fills it in ==');
{
  const { ctx, war, actions } = losing();
  const info = actions.getPeaceInfo(war.id);
  ok(!!info && Array.isArray(info.concessions) && info.concessions.length > 0,
    'the dialog is handed the list of what we may offer');
  const sorted = [...info.concessions].sort((a, b) => b.cost - a.cost);
  const give = [];
  let sum = 0;
  for (const r of sorted) { if (sum >= 60) break; give.push(r.id); sum += r.cost; }
  const ev = actions.evaluatePeace(war.id, { concessions: give });
  ok(ev && ev.acceptable, 'it prices the offer through the ordinary action: ' + (ev && ev.reason));
  actions.offerPeaceDeal(war.id, { concessions: give });
  ok(give.every((id) => ctx.byId(id).owner === 'ROM'), 'and sending the terms hands the land over');
}

console.log('== and a province given away with no war at all ==');
{
  const { ctx, game, war, waste, actions } = losing();
  // Peace first: a gift on the eve of losing the province is not diplomacy.
  const denied = mil.cedeProvinceInfo(ctx, 'JUD', ctx.prov('Sepphoris').id);
  ok(denied && !denied.can && /wartime/.test(denied.why), 'not while a war is running: ' + denied.why);
  mil.dissolveWar(ctx, war);
  for (const k of Object.keys(game.tags)) if (game.tags[k]) game.tags[k].atWarWith = [];

  const occupied = ctx.prov('Joppa');
  occupied.controller = 'ROM';
  const stuck = mil.cedeProvinceInfo(ctx, 'JUD', occupied.id);
  ok(stuck && !stuck.can && /standing in it/.test(stuck.why),
    'nor ground a foreign army stands in — that is a treaty: ' + stuck.why);
  occupied.controller = 'JUD';

  const town = ctx.prov('Sepphoris');
  // Nobody to give it to yet: this suite's geometry is a bead chain, so who is
  // "next door" is whoever holds the neighbouring id — and we are bound to no
  // one. Both roads to a recipient are opened here, one at a time.
  const alone = mil.cedeProvinceInfo(ctx, 'JUD', town.id);
  ok(alone && !alone.can && /nobody to give it to/.test(alone.why),
    'a province with no neighbour and no friend cannot be given away: ' + alone.why);
  const nextDoor = ctx.game.provinces[town.id + 1] || ctx.game.provinces[town.id - 1];
  nextDoor.owner = 'ROM'; nextDoor.controller = 'ROM';
  game.tags.JUD.allies = ['PAR'];
  game.tags.PAR.allies = ['JUD'];
  const info = mil.cedeProvinceInfo(ctx, 'JUD', town.id);
  ok(!!info && info.can, 'at peace, a province of ours can simply be given away');
  ok(info.recipients.length === 2 && info.recipients.every((r) => r.tag !== 'JUD' && r.tag !== 'REB'),
    'to the court that governs beside it, or the one we are sworn to: '
    + info.recipients.map((r) => r.name + (r.bond ? '/' + r.bond : ' (next door)')).join(', '));
  ok(info.recipients.some((r) => r.adjacent && r.tag === 'ROM')
    && info.recipients.some((r) => r.bond === 'our ally' && r.tag === 'PAR'),
  'and the list says which is which');

  // Colonised waste too — the same rule as the table (SPEC §64/§222).
  const wasteInfo = mil.cedeProvinceInfo(ctx, 'JUD', waste.id);
  ok(!!wasteInfo, 'colonised waste is a province like any other here');

  const to = info.recipients[0].tag;
  const theirs = game.tags[to];
  const was = (theirs.opinion && theirs.opinion.JUD) || 0;
  const infamyBefore = game.tags.JUD.aggression || 0;
  const res = mil.cedeProvinceCore(ctx, 'JUD', town.id, to);
  ok(res.ok && town.owner === to && town.controller === to,
    'the deed is signed: ' + res.name + ' to ' + res.toName);
  ok((theirs.opinion.JUD || 0) === was + info.gratitude,
    'their court remembers it (+' + info.gratitude + ')');
  ok((game.tags.JUD.aggression || 0) === infamyBefore, 'and nobody is a conqueror for accepting a gift');
  ok(town.integration === 0 && town.autonomy >= 0.5
    && (town.modifiers || []).some((m) => m.id === 'ceded'),
  'the province starts its ledger over under a new crown, and is restive about it');
  ok(!(town.modifiers || []).some((m) => m.id === 'recent_conquest'),
    'but carries no conqueror\'s mark: nobody conquered it');
  ok(/cedes Sepphoris/.test(game.chronicle[game.chronicle.length - 1].text),
    'the chronicle records the gift: ' + game.chronicle[game.chronicle.length - 1].text.slice(0, 100));
  ok(mil.cedeProvinceInfo(ctx, 'JUD', town.id) === null, 'and it is no longer ours to give twice');
  ok(typeof actions.cedeProvince === 'function' && typeof actions.getCession === 'function',
    'the panel has both an answer and a verb');
}

console.log(failures ? '\n' + failures + ' FAIL' : '\nALL PASS');
process.exit(failures ? 1 : 0);
