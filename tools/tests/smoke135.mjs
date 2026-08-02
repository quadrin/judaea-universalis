// Headless regression — SPEC §208: the kingdom beyond the strait takes its
// chair. Himyar is seated on the 529 map as Kaleb's client (Procopius I.20)
// and offered on the roster with the full §185 kit, and the three §206
// southern cards land on the LIVE court instead of narrating past it:
//
//   THE CHAIR — the 529 roster is SAM,HMY; the chapter's lens makes the
//   standard Israelite (the ADI precedent: the tag carries the covenant the
//   kings took, the court carries the nuance) while the static define keeps
//   the pre-conversion south the 66 CE frame needs; the client boots yoked,
//   seated, ruled, garrisoned, and NOT pre-paid — no mission completes at
//   boot on the crown the negus gave.
//
//   THE MUTINY — Abraha's card of 533 adapts to who holds the country: an
//   AI client gets the garrison's king and loses the yoke, a player's court
//   keeps its throne and inherits the garrison's fury (and loses the yoke),
//   a client that already won free retires the card unfired.
//
//   THE RECKONING — the eight ships of 570 sail only for a broken country:
//   a free Himyar seated at Zafar is spared, a yoked client falls with its
//   patron (and the incense country still converges on the 614 map's SAS,
//   which is what smoke133 reads). The dam of 575 breaks only where no
//   living kingdom has paid for the sluices and held Marib.
//
//   THE VERDICTS — the dated client contract (§185's shape): alive and
//   seated at the capital in November 570 wins, graded freer and wholer;
//   the capital in other hands at the reckoning loses.
import { DEFINES } from '../../js/data/defines.js';
import { MAP_DATA } from '../../js/data/map_data.js';
import { POLITICAL_MAPS } from '../../js/data/political_maps.js';
import { ERAS } from '../../js/data/compendium.js';
import { ERA_IDEAS_BY_BOOKMARK, eraIdeaGroupsFor, eraIdeaUnlocked } from '../../js/data/era_ideas.js';
import { campaignGuidance } from '../../js/data/campaign_guidance.js';
import { ESTATE_GROUND } from '../../js/data/estate_ground.js';
import { ESTATE_ASKS } from '../../js/data/estate_asks.js';
import { bus } from '../../js/core/bus.js';
import { initGame, makeCtx, gameActions } from '../../js/sim/init.js';
import * as realm from '../../js/sim/realm.js';

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const geom = {
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1),
  bbox: [],
};

const era = ERAS.find((e) => e.bookmark.id === '529ce');

function world(playerTag) {
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: era.events,
    playerTag, rngSeed: 7,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus, bookmark: era.bookmark, events: era.events,
  });
  return { game, ctx, actions: gameActions(ctx) };
}

function fire(w, id) {
  const ev = era.events.find((e) => e && e.id === id);
  if (!ev) return false;
  if (typeof ev.when === 'function' && !ev.when(w.ctx)) return false;
  w.ctx.helpers.fireEvent(w.ctx, id);
  const pe = w.game.pendingEvents.find((p) => p.eventId === id);
  if (!pe) return false;
  w.actions.chooseEventOption(pe.instanceId, ev.aiOption || 0);
  return true;
}

const YEMEN = ['Zafar', 'Muza', 'Eudaemon Arabia', 'Najran', 'Marib',
  'Shabwa', 'Moscha', 'Dioscurida'];

// ---------------------------------------------------------------------------
console.log('== the chair: the 529 roster offers the client kingdom ==');
{
  const roster = era.bookmark.playableTags.map((p) => p.tag);
  ok(JSON.stringify(roster) === JSON.stringify(['SAM', 'HMY']),
    'the 529 roster is SAM,HMY (' + roster.join(',') + ')');
  const row = era.bookmark.playableTags[1];
  ok(typeof row.difficulty === 'string' && typeof row.blurb === 'string' && row.blurb.length > 100,
    'the chair carries a difficulty and a blurb that teaches the campaign');
  // The ADI compromise (§185), applied south: the chapter's lens makes the
  // standard Israelite; the static define keeps the pre-conversion kingdom
  // the 66 CE background needs.
  const tweak = era.bookmark.tagTweaks.HMY;
  ok(tweak && tweak.religion === 'judaism',
    'the 529 lens seats the covenant on the tag (tagTweaks religion: judaism)');
  ok(DEFINES.TAGS.HMY.religion === 'south_arabian',
    'while the static define keeps the pre-conversion south for the earlier frames');
  const objectives = era.bookmark.objectives.HMY || [];
  ok(objectives.length >= 3 && objectives.some((l) => /^Win:/.test(l)) && objectives.some((l) => /^Lose:/.test(l)),
    'the realm panel gets Win and Lose lines');
}

// ---------------------------------------------------------------------------
console.log('== the seating: yoked, seated, ruled, garrisoned, not pre-paid ==');
{
  const w = world('HMY');
  const t = w.game.tags.HMY;
  ok(t.alive === true && t.religion === 'judaism' && t.culture === 'south_arabian',
    'the court boots alive, of the covenant, of the south');
  ok(t.overlord === 'AXM', 'and under the negus\' yoke (overlord AXM)');
  ok(YEMEN.every((n) => w.ctx.prov(n).owner === 'HMY'),
    'holding the whole incense country: ' + YEMEN.length + ' cells');
  ok(POLITICAL_MAPS['529ce'].owners.Zafar === 'HMY'
    && POLITICAL_MAPS['529ce'].owners.Aksum === 'AXM',
  'seated by the political map, with Aksum on its own highlands');
  ok(YEMEN.every((n) => POLITICAL_MAPS['529ce'].levies[n] === 0.2),
    'at the ordinary levy — the client taxes its own terraces; the yoke is the tribute, not a starved assessment');
  ok(w.ctx.prov('Zafar').religion === 'judaism' && w.ctx.prov('Marib').religion === 'judaism',
    'the royal capital and the interior keep the faith of the house');
  ok(w.ctx.prov('Najran').religion === 'christianity' && w.ctx.prov('Muza').religion === 'christianity',
    'the martyrs\' city and the conquest\'s coast keep the Cross');
  ok(t.ruler && t.ruler.name === 'Sumyafa Ashwa' && t.heir && t.heir.name,
    'Procopius\' Esimiphaios is crowned, with an heir of the old style');
  ok(t.legitimacy === 35, 'at 35 legitimacy — a crown the negus gave (' + t.legitimacy + ')');
  const armies = Object.values(w.game.armies);
  ok(armies.some((a) => a.tag === 'HMY' && w.game.provinces[a.prov].name === 'Zafar'),
    'the king\'s own companies stand at the capital');
  const crossing = armies.find((a) => a.tag === 'AXM' && a.general && a.general.name === 'Abraha');
  ok(!!crossing && w.game.provinces[crossing.prov].name === 'Adulis',
    'and Abraha waits in the negus\' army at the port of the crossing');
  // The four estates, their ground, their asks, their court seats.
  const ids = (era.bookmark.factions.HMY || []).map((f) => f.id);
  ok(JSON.stringify(ids) === JSON.stringify(['negus_men', 'yazanids', 'qayls', 'incense_houses']),
    'the court at Zafar seats its four documented parties');
  ok(ids.every((id) => ESTATE_GROUND[id] && ESTATE_ASKS[id]),
    'every party has ground under it and asks written for it');
  const guide = campaignGuidance('529ce', 'HMY', era.bookmark.startDate);
  ok(guide && guide.opening.length === 3 && guide.next,
    'three first moves and a live pressure clock');
  // The curriculum: groups exist, one open at the starting rungs.
  const groups = eraIdeaGroupsFor(era.bookmark, 'HMY');
  ok(groups.length === 3 && (ERA_IDEAS_BY_BOOKMARK['529ce'].HMY || []).length === 3,
    'a curriculum of three groups');
  const startT = { tech: { gov: 9, infl: 9, mar: 9 } };
  ok(groups.some((gd) => eraIdeaUnlocked(startT, gd)),
    'with one group open at the chapter\'s base rungs');
  // No free lunch: sixteen pumped months on the untouched boot pay nothing —
  // the strongbox, the muster, the yoke and the covenant all start short.
  for (let i = 0; i < 16; i++) realm.checkMissions(w.ctx);
  ok((t.missionsDone || []).length === 0,
    'no mission completes at boot (' + (t.missionsDone || []).join(', ') + ')');
}

// ---------------------------------------------------------------------------
console.log('== the mutiny of 533 lands on the live court ==');
{
  // An AI client: the garrison's king takes the crown and the yoke dies.
  const w = world('SAM');
  w.game.date = { y: 533, m: 6, d: 2 };
  ok(fire(w, 'ev529_w_abraha'), 'the card fires on the yoked AI client');
  const t = w.game.tags.HMY;
  ok(t.ruler.name === 'Abraha' && t.overlord === null,
    'Abraha is king at Zafar and the bond to Aksum is cut');
  ok(w.game.tags.AXM.modifiers.some((m) => m.id === 'viceroys_word'),
    'and Aksum\'s conquest becomes a word (the §206 price, unchanged)');
}
{
  // A player's court: the throne holds, the garrison's party is done with it.
  const w = world('HMY');
  w.game.date = { y: 533, m: 6, d: 2 };
  ok(fire(w, 'ev529_w_abraha'), 'the card fires on the yoked player court');
  const t = w.game.tags.HMY;
  ok(t.ruler.name === 'Sumyafa Ashwa' && t.overlord === null,
    'the player keeps the throne and loses the yoke');
  const negus = w.actions.getFactions().find((f) => f.id === 'negus_men');
  ok(!!negus && negus.approval <= 20,
    'and inherits the garrison\'s fury (negus_men at ' + (negus && negus.approval) + ')');
}
{
  // A client that already won free has no viceroyalty to mutiny against.
  const w = world('HMY');
  w.game.tags.HMY.overlord = null;
  w.game.date = { y: 533, m: 6, d: 2 };
  ok(!fire(w, 'ev529_w_abraha'), 'a court already free retires the card unfired');
}

// ---------------------------------------------------------------------------
console.log('== the eight ships sail only for a broken country ==');
{
  // Free and seated: spared — and the dam, if its price was paid, holds.
  const w = world('HMY');
  w.game.tags.HMY.overlord = null;
  w.game.date = { y: 570, m: 11, d: 2 };
  ok(!fire(w, 'ev529_w_wahriz'), 'a free Himyar seated at Zafar is not worth eight ships');
  // A Himyar already in the King of Kings' clientele needs no conquering:
  // the card yields to the §168 ages engine, which is how the 91-year
  // harness actually delivered the abna (vassalized 540s, absorbed 575).
  w.game.tags.HMY.overlord = 'SAS';
  ok(!fire(w, 'ev529_w_wahriz'), 'nor does the fleet sail against the King of Kings\' own client');
  w.game.tags.HMY.overlord = null;
  w.ctx.helpers.setFlag(w.ctx, 'himyarDamKept', true);
  w.game.date = { y: 575, m: 7, d: 2 };
  const breach = era.events.find((e) => e.id === 'ev529_w_marib_breaks');
  ok(!breach.when(w.ctx), 'and the dam a living kingdom budgets does not break');
}
{
  // Yoked at the reckoning: the client falls with the patron, onto the 614 map.
  const w = world('SAM');
  w.game.date = { y: 570, m: 11, d: 2 };
  ok(fire(w, 'ev529_w_wahriz'), 'the fleet sails against a still-yoked client');
  ok(YEMEN.every((n) => w.ctx.prov(n).owner === 'SAS'),
    'and the whole incense country passes to the King of Kings');
  ok(POLITICAL_MAPS['614ce'].owners.Zafar === 'SAS',
    'which is the 614 convergence, read straight from the 614 map');
  const breach = era.events.find((e) => e.id === 'ev529_w_marib_breaks');
  ok(breach.when(w.ctx), 'and the dam nobody budgets still breaks on schedule');
}

// ---------------------------------------------------------------------------
console.log('== the reckoning of November 570 grades the client contract ==');
function reckon(prep) {
  const w = world('HMY');
  prep(w);
  w.game.date = { y: 570, m: 11, d: 2 };
  era.bookmark.checkVictory(w.ctx);
  const verdicts = (w.game.chronicle || []).filter((c) => c && c.kind === 'verdict');
  return { result: w.game.result, line: verdicts.length ? verdicts[verdicts.length - 1].text : '' };
}
{
  const r = reckon((w) => {
    w.game.tags.HMY.overlord = null;
    w.game.tags.HMY.legitimacy = 75;
  });
  ok(r.result === 'win' && /Saba and Dhu Raydan/.test(r.line),
    'free, whole and covenanted: the full style again (' + r.line.slice(0, 40) + '…)');
}
{
  const r = reckon((w) => {
    w.game.tags.HMY.overlord = null;
    w.game.tags.HMY.legitimacy = 40;
    w.ctx.helpers.changeOwner(w.ctx, 'Dioscurida', 'SAS');
  });
  ok(r.result === 'win' && /No Ships From the North/.test(r.line),
    'free but not whole: no ships come, all the same');
}
{
  const r = reckon(() => {});
  ok(r.result === 'win' && /Client That Outlived/.test(r.line),
    'still yoked but still seated: the client outlived the word');
}
{
  const r = reckon((w) => {
    w.ctx.helpers.changeOwner(w.ctx, 'Zafar', 'SAS');
    const p = w.ctx.prov('Zafar');
    p.controller = 'SAS';
  });
  ok(r.result === 'loss' && /Other Men's Fleets/.test(r.line),
    'the capital in other hands at the reckoning: a country of other men\'s fleets');
}
{
  // Elimination is a loss in any year, not only at the reckoning.
  const w = world('HMY');
  for (const n of YEMEN) w.ctx.helpers.changeOwner(w.ctx, n, 'AXM');
  for (const a of Object.values(w.game.armies)) if (a.tag === 'HMY') delete w.game.armies[a.id];
  w.game.date = { y: 541, m: 3, d: 2 };
  era.bookmark.checkVictory(w.ctx);
  ok(w.game.result === 'loss', 'landless and disbanded mid-century: the banners are cast down');
}

console.log(failures ? `smoke135: ${failures} FAIL` : 'smoke135: ALL PASS');
process.exit(failures ? 1 : 0);
