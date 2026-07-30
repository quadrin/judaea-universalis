// Headless regression — SPEC §153: the Gulf strand, 1980–1993.
//
// The bug was that `ev_i_gulf_war` fired on 1991-01 whenever Iraq and Israel
// were both alive, and that was the entire condition. It then applied −60%
// income, −40% manpower and shrank every Iraqi army to 35% of its men. No
// coalition, no invasion, no war — and an Iraq that had kept the river treaty
// in 1980, and therefore had no debt and no reason to invade anybody, was
// flattened anyway, on the calendar.
//
// So the things this suite has to hold are causal rather than structural:
//
//   - the chain is a CHAIN. Break any link and the rest does not happen.
//   - the debt is a NUMBER, not prose: `t.loans` is what the economy charges
//     interest on and the realm panel prints, and it must survive the war.
//   - the Iran–Iraq war is a CONTEST. Iraq used to get thirteen regiments and
//     a fire-3/shock-3 general against an Iran with a manpower bonus and no
//     military penalty at all; the asymmetry now runs both ways.
//   - the 1991 outcome is NOT WRITTEN DOWN. Nothing in the package may shrink
//     an Iraqi army or hand anybody the war; the aftermath cards must ASK
//     which way it went, and both answers must be reachable.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { EVENTS_1948_GULF } = await import(R + '/js/data/events_1948_gulf.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const { checkDateEvents, checkTriggeredEvents } = await import(R + '/js/sim/events.js');
const { LOAN_INTEREST_PER_MONTH } = await import(R + '/js/sim/economy.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const ERA = ERAS.find((e) => e.bookmark.id === '1948ce');
const CHAIN = ERA.events;
const GULF_SRC = readFileSync(R + '/js/data/events_1948_gulf.js', 'utf8');
const M48_SRC = readFileSync(R + '/js/data/events_1948.js', 'utf8');
const byId = (id) => CHAIN.find((e) => e && e.id === id);

const N = MAP_DATA.provinces.length;
const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const geom = {
  neighbors: snap.neighbors.map((a) => new Set(a)),
  centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
  coastal: snap.coastal.map(Boolean),
  offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
  areas: Int32Array.from(snap.areas), bbox: [],
};
const bus = { emit() {}, on() { return () => {}; } };

function boot(date, seed = 5) {
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: ERA.bookmark, events: CHAIN,
    playerTag: 'ISR', rngSeed: seed,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus, bookmark: ERA.bookmark, events: CHAIN,
  });
  game.date = { y: date.y, m: date.m, d: 1 };
  return { game, ctx };
}
// Resolve a card's option directly, the way the decider would.
function take(ctx, id, idx) {
  const c = byId(id);
  if (!c) throw new Error('no card ' + id);
  c.options[idx].effects(ctx);
}
function fires(ctx, id) {
  const c = byId(id);
  if (!c || typeof c.when !== 'function') return null;
  try { return !!c.when(ctx); } catch (e) { return 'threw'; }
}

// ---------------------------------------------------------------------------
console.log('== the package is registered on 1948 and nowhere else ==');
{
  for (const era of ERAS) {
    const n = era.events.filter((e) => EVENTS_1948_GULF.indexOf(e) >= 0).length;
    const want = era.bookmark.id === '1948ce' ? EVENTS_1948_GULF.length : 0;
    ok(n === want, era.bookmark.id + ': ' + n + ' of the strand (want ' + want + ')');
  }
  const ids = new Set(EVENTS_1948_GULF.map((c) => c.id));
  ok(ids.size === EVENTS_1948_GULF.length, 'every card is its own id ('
    + EVENTS_1948_GULF.length + ')');
  const clash = CHAIN.filter((e) => e && ids.has(e.id) && EVENTS_1948_GULF.indexOf(e) < 0);
  ok(!clash.length, 'and none collides with a card the chapter already had');
}

// ---------------------------------------------------------------------------
console.log('== nothing in the strand scripts the outcome ==');
{
  // The specific sin of the old card: reaching into the loser's armies.
  ok(!/\.men\s*=\s*Math\.(max|round)/.test(GULF_SRC),
    'no card shrinks an army by hand');
  ok(!/a\.men\s*\*\s*0\./.test(GULF_SRC), 'and none scales one by a fraction');
  const oldRuin = /after_the_hundred_hours[\s\S]{0,400}?incomeMult:\s*0\.4\b/.test(M48_SRC);
  ok(!oldRuin, 'the flat −60% income ruin is gone from the Scud card');
  ok(!/for \(const a of ctx\.helpers\.armiesOf\(ctx, 'IRQ'\)\)/.test(M48_SRC),
    'and so is its army-shrinking loop');
}

// ---------------------------------------------------------------------------
console.log('== the Scud card can no longer fire on the calendar alone ==');
{
  const w = boot({ y: 1991, m: 1 });
  ok(fires(w.ctx, 'ev_i_gulf_war') === false,
    'an Iraq that never fought Iran and never invaded anybody is not bombed in 1991');
  w.game.flags.coalitionWar = true;
  ok(fires(w.ctx, 'ev_i_gulf_war') === true, 'and it fires once there is a coalition war');
}

// ---------------------------------------------------------------------------
console.log('== the chain is a chain: break a link and the rest stops ==');
{
  // Link 0 — the 1980 card's second answer: no war, no debt, no anything.
  const kept = boot({ y: 1990, m: 8 });
  take(kept.ctx, 'ev_i_iran_iraq_war', 1);
  ok(!kept.game.flags.iranIraqWar, 'keeping the river treaty sets no war flag');
  ok(fires(kept.ctx, 'ev_g_the_wells') === false, '  so August 1990 never arrives');
  kept.game.date = { y: 1991, m: 1, d: 1 };
  ok(fires(kept.ctx, 'ev_i_gulf_war') === false, '  and neither does January 1991');

  // Link 1 — the war happened, so the debt exists and the wells open.
  const war = boot({ y: 1980, m: 9 });
  take(war.ctx, 'ev_i_iran_iraq_war', 0);
  ok(war.game.flags.iranIraqWar === true, 'crossing the Shatt al-Arab sets the flag');
  const loans = Number(war.game.tags.IRQ.loans) || 0;
  ok(loans >= 3, '  and Baghdad really borrows (' + loans + ' loans, '
    + (loans * LOAN_INTEREST_PER_MONTH) + ' talents a month)');
  war.game.date = { y: 1988, m: 8, d: 1 };
  ok(fires(war.ctx, 'ev_g_the_river_holds') === true, 'the cease-fire clock fires in 1988');
  ok(fires(war.ctx, 'ev_g_the_line_broken') === false,
    '  and the breakthrough card does not, because no capital fell');
  take(war.ctx, 'ev_g_the_river_holds', 0);
  ok(war.game.flags.iranIraqEnded === true, 'the war ends on the starting line');
  ok((Number(war.game.tags.IRQ.loans) || 0) >= 3,
    '  and the debt SURVIVES the peace, which is the whole causal link');
  war.game.date = { y: 1990, m: 8, d: 1 };
  ok(fires(war.ctx, 'ev_g_the_wells') === true, 'so the wells open in August 1990');

  // Link 2 — accepting the creditors' schedule ends the strand.
  const paid = boot({ y: 1990, m: 8 });
  take(paid.ctx, 'ev_i_iran_iraq_war', 0);
  take(paid.ctx, 'ev_g_the_wells', 2);
  ok(paid.game.flags.iraqDisarmed === true, 'accepting the schedule disarms Iraq');
  paid.game.date = { y: 1990, m: 11, d: 1 };
  ok(fires(paid.ctx, 'ev_g_thirty_five_states') === false, '  so no coalition assembles');
  paid.game.date = { y: 1991, m: 1, d: 1 };
  ok(fires(paid.ctx, 'ev_i_gulf_war') === false, '  and there is no 1991');

  // Link 3 — asking for forgiveness defers rather than ends.
  const asked = boot({ y: 1990, m: 8 });
  take(asked.ctx, 'ev_i_iran_iraq_war', 0);
  take(asked.ctx, 'ev_g_the_wells', 1);
  asked.game.date = { y: 1990, m: 11, d: 1 };
  ok(fires(asked.ctx, 'ev_g_thirty_five_states') === false, 'asking for forgiveness raises no coalition');
  asked.game.date = { y: 1993, m: 8, d: 1 };
  ok(fires(asked.ctx, 'ev_g_the_creditors_answer') === true, '  and the demand returns in 1993');

  // Link 4 — the invasion, then the coalition, then the war.
  const inv = boot({ y: 1990, m: 8 });
  take(inv.ctx, 'ev_i_iran_iraq_war', 0);
  take(inv.ctx, 'ev_g_the_wells', 0);
  ok(inv.game.flags.kuwaitTaken === true, 'taking the coast sets the invasion flag');
  ok(!!(inv.game.wars || []).find((x) => {
    const all = (x.attackers || []).concat(x.defenders || []);
    return all.includes('IRQ') && all.includes('SAU');
  }), '  and there is a real war with Riyadh on the war list');
  inv.game.date = { y: 1990, m: 11, d: 1 };
  ok(fires(inv.ctx, 'ev_g_thirty_five_states') === true, 'the coalition assembles in November');
  take(inv.ctx, 'ev_g_thirty_five_states', 1);
  ok(inv.game.flags.coalitionWar === true, 'digging in starts the coalition war');
  const belligerents = ['UK', 'EGY', 'SYR'].filter((t) => (inv.game.wars || []).some((x) => {
    const all = (x.attackers || []).concat(x.defenders || []);
    return all.includes(t) && all.includes('IRQ');
  }));
  ok(belligerents.length >= 2, '  with the coalition actually at war with Iraq ('
    + (belligerents.join(', ') || 'nobody') + ')');
  const wings = Object.values(inv.game.airwings || {}).filter((w) => w && ['SAU', 'UK'].includes(w.tag));
  ok(wings.length >= 1, '  and wings on a Gulf field that did not exist in the summer ('
    + wings.length + ')');
  const stacks = Object.values(inv.game.armies || {}).filter((a) => a && ['SAU', 'UK', 'EGY'].includes(a.tag));
  ok(stacks.length >= 3, '  and coalition corps on the ground (' + stacks.length + ')');
  inv.game.date = { y: 1991, m: 1, d: 1 };
  ok(fires(inv.ctx, 'ev_i_gulf_war') === true, 'and only now does the Scud card fire');
}

// ---------------------------------------------------------------------------
console.log('== withdrawal is a real third road ==');
{
  const w = boot({ y: 1990, m: 11 });
  take(w.ctx, 'ev_i_iran_iraq_war', 0);
  w.game.date = { y: 1990, m: 8, d: 1 };
  take(w.ctx, 'ev_g_the_wells', 0);
  w.game.date = { y: 1990, m: 11, d: 1 };
  take(w.ctx, 'ev_g_thirty_five_states', 0);
  ok(w.game.flags.iraqWithdrew === true, 'Iraq comes off the coast');
  ok(!w.game.flags.coalitionWar, '  and no coalition war begins');
  const t = w.game.tags.IRQ;
  ok(t.alive !== false, '  the regime survives');
  ok((t.modifiers || []).some((m) => m.id === 'the_sanctions_decade'),
    '  under sanctions instead of a hundred hours');
  w.game.date = { y: 1991, m: 1, d: 1 };
  ok(fires(w.ctx, 'ev_i_gulf_war') === false, '  and there is no Scud card, because there is no war');
}

// ---------------------------------------------------------------------------
console.log('== both 1991 outcomes are reachable ==');
{
  // Broken: somebody is standing on Iraqi ground.
  const lost = boot({ y: 1991, m: 6 });
  lost.game.flags.coalitionWar = true;
  const basra = lost.ctx.prov('Charax');
  if (basra) basra.controller = 'SAU';
  ok(fires(lost.ctx, 'ev_g_the_risings') === true, 'an Iraq with coalition troops on it faces the risings');
  ok(fires(lost.ctx, 'ev_g_the_regime_holds') === false, '  and cannot also be holding');

  // Held: nobody on Iraqi ground and the coast still Iraqi.
  const held = boot({ y: 1992, m: 6 });
  held.game.flags.coalitionWar = true;
  const gerrha = held.ctx.prov('Gerrha');
  if (gerrha) gerrha.controller = 'IRQ';
  ok(fires(held.ctx, 'ev_g_the_regime_holds') === true,
    'an Iraq still on the wells with nobody on its ground holds — the alternate history the old card foreclosed');
  ok(fires(held.ctx, 'ev_g_the_risings') === false, '  and does not also collapse');
}

// ---------------------------------------------------------------------------
console.log('== the Iran-Iraq war is a contest, not a walkover ==');
{
  const w = boot({ y: 1980, m: 9 });
  take(w.ctx, 'ev_i_iran_iraq_war', 0);
  const iq = (w.game.tags.IRQ.modifiers || []).find((m) => m.id === 'the_longest_war');
  const ir = (w.game.tags.IRN.modifiers || []).find((m) => m.id === 'the_longest_war');
  ok(!!iq && !!ir, 'both belligerents carry The Longest War');
  ok(ir.effects.milPowerMult && ir.effects.milPowerMult < 1,
    'Iran fights below its pattern (' + ir.effects.milPowerMult + ')');
  // 2.3/2.8 is one rung of UNIT_GENS, which is the claim the comment makes.
  ok(Math.abs(ir.effects.milPowerMult - 2.3 / 2.8) < 0.02,
    '  and the penalty really is one generation (' + (2.3 / 2.8).toFixed(3) + ')');
  ok(ir.effects.manpowerMult >= 1.5, 'Iran has the bodies (' + ir.effects.manpowerMult + ')');
  ok(iq.effects.manpowerMult < 1, 'Iraq has the shallow bench (' + iq.effects.manpowerMult + ')');
  ok(iq.effects.milPowerMult > 1, '  and the equipment (' + iq.effects.milPowerMult + ')');
  // The old shape: Iran had a manpower bonus and NO military penalty at all.
  ok(!(ir.effects.manpowerMult > 1 && !ir.effects.milPowerMult),
    'Iran is no longer given an advantage and no disadvantage');
}

// ---------------------------------------------------------------------------
console.log('== the overreach ceiling exists and bites ==');
{
  const w = boot({ y: 1984, m: 6 });
  take(w.ctx, 'ev_i_iran_iraq_war', 0);
  ok(fires(w.ctx, 'ev_g_the_shia_south') === false, 'an Iraq on its own frontier is not overreached');
  for (const n of ['Ecbatana', 'Susa']) {
    const p = w.ctx.prov(n);
    if (p) p.controller = 'IRQ';
  }
  ok(fires(w.ctx, 'ev_g_the_shia_south') === true, 'an Iraq deep inside Iran is');
  take(w.ctx, 'ev_g_the_shia_south', 0);
  const m = (w.game.tags.IRQ.modifiers || []).find((x) => x.id === 'overreached');
  ok(!!m && m.effects.reinforceMult < 1 && m.effects.unrestAll > 0,
    '  and holding the ground costs the rear (' + JSON.stringify(m && m.effects) + ')');
}

// ---------------------------------------------------------------------------
console.log('== every option of every card resolves clean ==');
{
  const realWarn = console.warn;
  for (const card of EVENTS_1948_GULF) {
    for (let i = 0; i < card.options.length; i++) {
      const y = card.date ? card.date.y : (card.minYear || 1991);
      const w = boot({ y, m: card.date ? card.date.m : 6 });
      // Give every card the world it belongs to, so nothing no-ops silently.
      w.game.flags.iranIraqWar = true;
      w.game.flags.kuwaitTaken = true;
      w.game.flags.coalitionWar = true;
      const warned = [];
      console.warn = (...a) => warned.push(a.map(String).join(' '));
      let threw = null;
      try { card.options[i].effects(w.ctx); } catch (e) { threw = e; }
      console.warn = realWarn;
      ok(!threw && !warned.length, card.id + ' #' + i + ' resolves'
        + (threw ? ' — ' + threw.message : (warned.length ? ' — ' + warned[0] : '')));
    }
  }
}

// ---------------------------------------------------------------------------
console.log('== thirteen years of the scheduler raise no guarded failure ==');
{
  const w = boot({ y: 1980, m: 1 });
  w.game.flags.saddamIraq = true;
  const warns = [];
  const realWarn = console.warn;
  console.warn = (...a) => warns.push(a.join(' '));
  try {
    for (let y = 1980; y <= 1993; y++) {
      for (let m = 1; m <= 12; m++) {
        w.game.date = { y, m, d: 1 };
        checkDateEvents(w.ctx);
        checkTriggeredEvents(w.ctx);
        // Resolve every Gulf card the historical way, so the chain advances.
        for (const pe of w.game.pendingEvents.splice(0)) {
          const c = byId(pe.eventId);
          if (!c || !EVENTS_1948_GULF.includes(c)) continue;
          const idx = Number.isFinite(c.aiOption) ? c.aiOption : 0;
          try { c.options[idx].effects(w.ctx); } catch (e) { warns.push(pe.eventId + ': ' + e.message); }
        }
      }
    }
  } finally { console.warn = realWarn; }
  const bad = warns.filter((s) => /1948_gulf|events_1948\]/.test(s));
  ok(!bad.length, 'the whole strand is walked month by month without one'
    + (bad.length ? ' (' + bad[0] + ')' : ''));
}

console.log(failures ? `smoke102: ${failures} FAIL` : 'smoke102: ALL PASS');
process.exit(failures ? 1 : 0);
