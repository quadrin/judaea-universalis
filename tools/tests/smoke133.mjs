// Headless regression — SPEC §206: the south and the east get their history.
//
// §205 put Kush, Aksum, the incense kingdoms, Sakastan and the 1948 south on
// the map as courts; this section gives the same ground its dated world
// events, 27 cards across seven packages. What this suite holds is the part
// a crash test cannot see (smoke85 already holds the schema): that the
// TRANSFER cards actually move the map the way the sources say, that the
// SECESSION cards raise the courts the 67 BCE atlas opens with, that the
// conversion cards change real religions on real provinces, and that every
// §206 card is a dated world card — so §121's horizon can never strand one
// and §70 deals every one as a notice.
//
// The convergence claims are the point. ev_w_sakastan_settled and
// ev_w_house_of_raydan exist so that a 167 BCE campaign played forward
// arrives at the political map 67 BCE opens with: SAK on the Helmand, HMY
// at Zafar. If either drifts, the two chapters disagree about the same
// century, and this is the suite that says so.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { POLITICAL_MAPS } = await import(R + '/js/data/political_maps.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const fakeGeom = {
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [], coastal: [], offshore: [],
};
const bus = { emit() {}, on() { return () => {}; } };

function world(eraId, playerTag) {
  const era = ERAS.find((e) => e.bookmark.id === eraId);
  const provinceMap = buildProvinceMapping(MAP_DATA, era.bookmark);
  const game = initGame({
    DEFINES, MAP_DATA, geom: fakeGeom, bookmark: era.bookmark, events: era.events,
    playerTag, rngSeed: 7, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: fakeGeom, bus, bookmark: era.bookmark,
    events: era.events, provinceMap,
  });
  return { game, ctx, actions: gameActions(ctx), events: era.events };
}

// Fire a card by id through the real scheduler surface and take its AI answer.
function fire(w, id) {
  const ev = w.events.find((e) => e && e.id === id);
  if (!ev) return false;
  if (typeof ev.when === 'function' && !ev.when(w.ctx)) return false;
  w.ctx.helpers.fireEvent(w.ctx, id);
  const pe = w.game.pendingEvents.find((p) => p.eventId === id);
  if (!pe) return false;
  w.actions.chooseEventOption(pe.instanceId, ev.aiOption || 0);
  return true;
}

// ---------------------------------------------------------------------------
console.log('== every §206 card is a dated world card in its own chapter ==');
{
  const WANT = {
    '167bce': ['ev_w_upper_satrapies', 'ev_w_eucratides_end', 'ev_w_grass_breaks_in',
      'ev_w_sakastan_settled', 'ev_w_house_of_raydan'],
    '40bce': ['ev5_w_thirst_road', 'ev5_w_kandake_war', 'ev5_w_petronius', 'ev5_w_samos_treaty'],
    '66ce': ['ev_fw_sudd_report', 'ev_fw_periplus', 'ev_fw_alans_gates'],
    '132ce': ['ev2_shammar_union', 'ev2_ezana_cross', 'ev2_meroe_falls'],
    '529ce': ['ev529_w_abraha', 'ev529_w_julian_nubia', 'ev529_w_wahriz', 'ev529_w_marib_breaks'],
    '614ce': ['ev_s_hijra_aksum', 'ev_s_badhan_submits', 'ev_s_baqt'],
    '1948ce': ['ev_s48_mossadegh', 'ev_s48_eritrea_federated', 'ev_s48_mordad',
      'ev_s48_sanaa_officers', 'ev_s48_eritrea_annexed'],
  };
  let total = 0;
  for (const [eraId, ids] of Object.entries(WANT)) {
    const era = ERAS.find((e) => e.bookmark.id === eraId);
    const have = new Map((era.events || []).map((e) => [e && e.id, e]));
    for (const id of ids) {
      const ev = have.get(id);
      total++;
      ok(!!ev, eraId + ' carries ' + id);
      if (!ev) continue;
      ok(ev.world === true && !!ev.date && Number.isFinite(ev.date.y),
        '  and it is a dated world card (' + (ev.date && ev.date.y) + ')');
      ok(ev.date.y > era.bookmark.startDate.y
        || (ev.date.y === era.bookmark.startDate.y && ev.date.m >= era.bookmark.startDate.m),
        '  dated after its own chapter opens, so it can never fire at boot');
    }
  }
  ok(total === 27, 'twenty-seven cards in all (' + total + ')');
}

// ---------------------------------------------------------------------------
console.log('== the 167 east converges on the 67 BCE opening ==');
{
  const w = world('167bce', 'HAS');
  // -148: the upper satrapies leave Antioch and Bactria for Parthia.
  w.game.date = { y: -148, m: 6, d: 2 };
  ok(fire(w, 'ev_w_upper_satrapies'), 'the satrapies card fires');
  ok(w.ctx.prov('Carmana').owner === 'PAR' && w.ctx.prov('Harmozeia').owner === 'PAR',
    'Carmania passes from the Seleucid kingdom to Parthia');
  ok(w.ctx.prov('Artacoana').owner === 'PAR' && w.ctx.prov('Antiochia Margiana').owner === 'PAR',
    'Aria and Margiana pass from Bactria to Parthia');
  // -129: the Saka break Bactria; its Helmand lands go to Parthia as wreckage.
  w.game.date = { y: -129, m: 8, d: 2 };
  ok(fire(w, 'ev_w_grass_breaks_in'), 'the breakthrough card fires');
  ok(w.ctx.prov('Zranka').owner === 'PAR' && w.ctx.prov('Phrada').owner === 'PAR',
    'the Helmand lands pass to Parthia as contested wreckage');
  // -110: Mithridates the Great settles the Saka — SAK rises where 67 seats it.
  w.game.date = { y: -110, m: 4, d: 2 };
  ok(!w.game.tags.SAK || w.game.tags.SAK.alive === false, 'Sakastan does not exist yet');
  ok(fire(w, 'ev_w_sakastan_settled'), 'the settlement card fires');
  ok(!!w.game.tags.SAK && w.game.tags.SAK.alive !== false, 'Sakastan is a living court');
  ok(w.ctx.prov('Zranka').owner === 'SAK' && w.ctx.prov('Phrada').owner === 'SAK',
    'and it holds the Helmand lands the 67 BCE map opens it with');
  // -110: Himyar rises where 67 seats it.
  w.game.date = { y: -110, m: 9, d: 2 };
  ok(fire(w, 'ev_w_house_of_raydan'), 'the Raydan card fires');
  ok(!!w.game.tags.HMY && w.game.tags.HMY.alive !== false, 'Himyar is a living court');
  ok(w.ctx.prov('Zafar').owner === 'HMY' && w.ctx.prov('Muza').owner === 'HMY',
    'holding Zafar and Muza — the 67 BCE opening');
  ok(w.ctx.prov('Marib').owner === 'SAB' && w.ctx.prov('Najran').owner === 'SAB',
    'while old Saba keeps Marib and Najran, exactly as 67 opens');
  const m67 = POLITICAL_MAPS['67bce'].owners;
  ok(m67.Zranka === 'SAK' && m67.Zafar === 'HMY' && m67.Marib === 'SAB',
    'which is the convergence claim, read straight from the 67 map');
}

// ---------------------------------------------------------------------------
console.log('== the Kandake\'s war is an arc, not three strangers ==');
{
  const w = world('40bce', 'HER');
  w.game.date = { y: -23, m: 4, d: 2 };
  ok(!fire(w, 'ev5_w_petronius'), 'Petronius does not march before the Kandake rides');
  w.game.date = { y: -25, m: 10, d: 2 };
  ok(fire(w, 'ev5_w_kandake_war'), 'the Kandake sacks Syene');
  ok(!!w.game.flags.kandakeWar, 'and the war is marked');
  w.game.date = { y: -23, m: 4, d: 2 };
  ok(fire(w, 'ev5_w_petronius'), 'now Petronius answers');
  w.game.date = { y: -20, m: 5, d: 2 };
  ok(fire(w, 'ev5_w_samos_treaty'), 'and Samos closes the arc');
  const ksh = w.game.tags.KSH;
  ok(ksh && ksh.opinion && ksh.opinion.ROM === 50,
    'on the Kandake\'s terms: +50 opinion, tribute remitted');
}

// ---------------------------------------------------------------------------
console.log('== the spine\'s south: cross, union, fall ==');
{
  const w = world('132ce', 'JUD');
  w.game.date = { y: 300, m: 5, d: 2 };
  ok(fire(w, 'ev2_shammar_union'), 'Shammar unites the south');
  ok(w.ctx.prov('Shabwa').owner === 'HMY' && w.ctx.prov('Dioscurida').owner === 'HMY',
    'the frankincense country and the island pass to Himyar');
  w.game.date = { y: 340, m: 6, d: 2 };
  ok(fire(w, 'ev2_ezana_cross'), 'Ezana takes the Cross');
  ok(w.game.tags.AXM.religion === 'christianity'
    && w.ctx.prov('Aksum').religion === 'christianity',
    'and the court and its highlands are Christian');
  w.game.date = { y: 350, m: 4, d: 2 };
  ok(fire(w, 'ev2_meroe_falls'), 'Ezana marches through the wreck of Kush');
  ok(w.game.tags.KSH.name === 'The Noba', 'no Kushite king is recorded again: the Noba remain');
}

// ---------------------------------------------------------------------------
console.log('== the 529 tail converges on the 614 opening ==');
{
  const w = world('529ce', 'SAM');
  w.game.date = { y: 543, m: 8, d: 2 };
  ok(fire(w, 'ev529_w_julian_nubia'), 'Julian baptizes Nobatia');
  ok(w.game.tags.NOB.religion === 'christianity'
    && w.ctx.prov('Napata').religion === 'christianity',
    'the river kingdoms take the Cross — which is how 614 opens them');
  w.game.date = { y: 570, m: 11, d: 2 };
  ok(fire(w, 'ev529_w_wahriz'), 'Wahriz\'s eight ships sail');
  for (const n of ['Zafar', 'Muza', 'Eudaemon Arabia', 'Marib', 'Najran']) {
    ok(w.ctx.prov(n).owner === 'SAS', '  ' + n + ' is the King of Kings\' now');
  }
  const m614 = POLITICAL_MAPS['614ce'].owners;
  ok(m614.Zafar === 'SAS' && m614.Napata === 'NOB',
    'which is the convergence claim, read straight from the 614 map');
}

// ---------------------------------------------------------------------------
console.log('== the conquest\'s south: the letter and the treaty ==');
{
  const w = world('614ce', 'JUD');
  // The caliphate opens dormant-dead and the chapter's own awakening cards
  // raise it in the 620s; both §206 cards gate on freeCaliphate, so a world
  // where the rise never happened retires them silently. This world's
  // premise is that it happened — the same hand smoke88 deals its rising.
  const rsh = w.game.tags.RSH;
  rsh.alive = true;
  rsh.overlord = null;
  w.game.date = { y: 631, m: 1, d: 2 };
  ok(fire(w, 'ev_s_badhan_submits'), 'Badhan transfers the province by letter');
  ok(w.ctx.prov('Zafar').owner === 'RSH' && w.ctx.prov('Zafar').religion === 'islam',
    'the Persian south passes to the caliphate and takes its faith');
  ok(w.ctx.prov('Omana').owner === 'RSH', 'the Omani coast goes over with it');
  w.game.date = { y: 652, m: 9, d: 2 };
  ok(fire(w, 'ev_s_baqt'), 'the Baqt is signed');
  ok(w.ctx.prov('Napata').owner === 'NOB',
    'and Nubia still holds its river: the one border the conquest could not move');
}

// ---------------------------------------------------------------------------
console.log('== 1948\'s south moves on its own dates ==');
{
  const w = world('1948ce', 'ISR');
  w.game.date = { y: 1952, m: 9, d: 2 };
  ok(w.ctx.prov('Adulis').owner === 'UK', 'Eritrea opens under the BMA');
  ok(fire(w, 'ev_s48_eritrea_federated'), 'the federation resolution passes');
  ok(w.ctx.prov('Adulis').owner === 'ETH', 'and Massawa passes to the Crown');
  w.game.date = { y: 1953, m: 8, d: 2 };
  ok(!fire(w, 'ev_s48_mordad'), 'no coup without a nationalization first');
  w.game.date = { y: 1951, m: 5, d: 2 };
  ok(fire(w, 'ev_s48_mossadegh'), 'the concession is cancelled');
  ok((w.game.tags.IRN.modifiers || []).some((m) => m.id === 'boycott_years'),
    'and the boycott years begin');
  w.game.date = { y: 1953, m: 8, d: 2 };
  ok(fire(w, 'ev_s48_mordad'), 'now the 28th of Mordad answers');
  ok(!(w.game.tags.IRN.modifiers || []).some((m) => m.id === 'boycott_years'),
    'and the boycott lapses with the consortium');
  w.game.date = { y: 1962, m: 9, d: 2 };
  ok(fire(w, 'ev_s48_sanaa_officers'), 'the tanks shell the palace at Sana\'a');
  ok((w.game.tags.EGY.modifiers || []).some((m) => m.id === 'our_vietnam'),
    'and Egypt marches into the war its officers will name');
}

console.log(failures ? `smoke133: ${failures} FAIL` : 'smoke133: ALL PASS');
process.exit(failures ? 1 : 0);
