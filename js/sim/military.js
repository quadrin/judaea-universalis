// Judaea Universalis — military: armies, movement, battles, sieges, wars.
// DOM-free module. Recruitment is a zero-dependency sim leaf, so importing its
// queue helpers keeps the military graph cycle-free.
import {
  unlockedGen, cappedGen, genMult, MODERNIZE_COST_PER_REG_PER_GEN,
  doctrinePips, doctrineSiegeMult, doctrinesFor,
} from '../data/tech.js';
import { JEWISH_INTEGRATED_NAMES, SAMARITAN_INTEGRATED_NAMES, TAG_INTEGRATED_NAMES } from '../data/integrated_names.js';
// The land roster (SPEC §191): three arms, their faces, their gaits, and the
// triangle they answer each other in. Pure data + pure functions.
import {
  ARMS, ARM, armShares, armEdge, armEdgeText, dominantArm, unitBattleCue,
  MOUNTED_TERRAIN,
} from '../data/units.js';
import { queueUnitRecruitment, queuedUnitCount } from './recruitment.js';
// doctrine.js is deliberately self-contained (no military.js import), so this
// stays one-way: an affinity may be gated on the realm's character (SPEC §86).
import { axisOf } from './doctrine.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/military]', ...args);
}

export function num(v, d = 0) { return Number.isFinite(v) ? v : d; }
export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function B(ctx, key, fallback) {
  const base = ctx && ctx.DEFINES && ctx.DEFINES.BASE;
  const v = base ? base[key] : undefined;
  return Number.isFinite(v) ? v : fallback;
}
export function devTotal(p) {
  if (!p || !p.dev) return 0;
  return num(p.dev.tax) + num(p.dev.prod) + num(p.dev.mp);
}
// The levy share (SPEC §173): the fraction of a province's development its
// owner can actually draw on for the wars this game stages. 1 for every
// province the eight campaigns were tuned against; 0.2 for the political
// maps' governed interior; 0.1 for a standing frontier — the Rhine army
// exists on the map precisely so that it cannot march east. Set once at
// initGame from the era's political map and constant for the campaign:
// conquering the far west hands any crown exactly what it handed Rome.
// Reads in five places — manpower pool, force limit, tax, production,
// administration — plus the two censuses that must weigh the same political
// world those five make: hegemon containment and the AI's establishment
// floor. Local facts (supply, sieges, rebel size, peace pricing, development
// itself) stay physical. Missing field = 1, so every save from before this
// section is unchanged.
export function levyOf(p) {
  const v = p && p.levy;
  return Number.isFinite(v) && v > 0 && v < 1 ? v : 1;
}
// Buildings only work for their owner: an occupied province yields nothing
// from its market, granary or shrine (walls' fort bump is one-time, physical).
export function hasBuilding(p, key) {
  return !!(p && Array.isArray(p.buildings) && p.buildings.indexOf(key) >= 0);
}
export function buildingWorks(p, key) {
  return hasBuilding(p, key) && p.owner === p.controller;
}
// A building's face for the given military-tech level (SPEC §52): the same
// key, cost and effects may wear a modern name past `modern.tech` — 1948
// digs a Fortified Line where 66 CE raised Walls.
export function buildingFace(def, marTech) {
  if (def && def.modern && Number.isFinite(def.modern.tech) && (marTech | 0) >= def.modern.tech) {
    return {
      name: def.modern.name || def.name,
      desc: def.modern.desc || def.desc,
      months: Number.isFinite(def.modern.months) ? def.modern.months : def.months,
    };
  }
  return def ? { name: def.name, desc: def.desc, months: def.months } : { name: '', desc: '', months: 1 };
}

// ------------------------------------------------------------ era mechanics
// The first declarative mechanics gate (SPEC §52): a bookmark may switch off
// a whole mechanic (`mechanics: { conversion: false }`). Anything not named
// stays on, so every earlier bookmark and save behaves exactly as before.
export function mechanicOn(ctx, key) {
  const m = ctx && ctx.bookmark && ctx.bookmark.mechanics;
  return !m || m[key] !== false;
}

// ------------------------------------------------------------ constitutions
// What a court's government DOES, read off `DEFINES.GOV_TYPES` (SPEC §212).
//
// There used to be four governments and the engine asked about them by name:
// `govType === 'republic'` in four places, `govType !== 'theocracy'` in one,
// and `gt === 'monarchy' || gt === 'theocracy'` at the marriage table. That is
// a workable shape for a closed set of four and the wrong one the moment a
// chapter's fork can ADOPT a constitution — every new government would arrive
// as an unrecognised string, be treated as a monarchy by every one of those
// tests, and be a label in the panel rather than a fact about the realm.
//
// So the rules are declared beside the names and read from there. An unknown
// or missing government still falls back to `monarchy`, which is what the rest
// of the engine has always defaulted to, and every rule is a positive flag
// defaulting to OFF — so a government that declares nothing behaves like the
// plainest possible crown rather than like nothing at all.
export function govDef(ctx, tag) {
  const types = (ctx && ctx.DEFINES && ctx.DEFINES.GOV_TYPES) || {};
  const t = ctx && ctx.game && ctx.game.tags && ctx.game.tags[tag];
  const key = (t && t.govType) || 'monarchy';
  return types[key] || types.monarchy || {};
}
export function govHas(ctx, tag, rule) {
  return !!govDef(ctx, tag)[rule];
}

// ---------------------------------------------------------------- chronicle
// The running record of the world (SPEC §21). Entries are plain data on
// game.chronicle — saves and MP snapshots carry them for free; the Chronicle
// screen reads them newest-first. Lives in this leaf module so every sim file
// and content package can write history without new import edges.
const CHRONICLE_CAP = 400; // a long campaign's worth; the oldest pages crumble
export function chronicle(ctx, kind, text) {
  const g = ctx && ctx.game;
  if (!g || !text) return;
  if (!Array.isArray(g.chronicle)) g.chronicle = [];
  g.chronicle.push({ y: g.date.y, m: g.date.m, kind: String(kind || 'note'), text: String(text) });
  if (g.chronicle.length > CHRONICLE_CAP) g.chronicle.splice(0, g.chronicle.length - CHRONICLE_CAP);
}

// ---------------------------------------------------------------- modifiers
export function resolveTagMult(ctx, tag, key) {
  const t = ctx.game.tags[tag];
  if (!t) return 1;
  let m = num(t.ideas && t.ideas[key], 1);
  if (!(m > 0)) m = 1;
  for (const mod of t.modifiers || []) {
    const e = mod && mod.effects ? mod.effects[key] : undefined;
    if (Number.isFinite(e) && e > 0) m *= e;
  }
  // Veteran difficulty (start-screen choice, SPEC §21 extended): every AI
  // court fights and earns like a hardened power. Never humans, never rebels.
  if (ctx.game.difficulty === 'hard' && t.ai && tag !== 'REB') {
    const h = ctx.DEFINES.HARD_AI ? ctx.DEFINES.HARD_AI[key] : undefined;
    if (Number.isFinite(h) && h > 0) m *= h;
  }
  return m;
}
export function resolveTagAdd(ctx, tag, key) {
  const t = ctx.game.tags[tag];
  if (!t) return 0;
  let s = num(t.ideas && t.ideas[key], 0);
  for (const mod of t.modifiers || []) {
    const e = mod && mod.effects ? mod.effects[key] : undefined;
    if (Number.isFinite(e)) s += e;
  }
  return s;
}
export function disciplineOf(ctx, tag) {
  return clamp(resolveTagMult(ctx, tag, 'disciplineMult'), 0.5, 2);
}
// Tech's hand on the battlefield (SPEC §22): the nation's military-tech mult
// times the pattern its regiments were actually raised to. An army equipped a
// generation behind fights like it.
export function armyPowerOf(ctx, army) {
  return resolveTagMult(ctx, army.tag, 'milPowerMult') * genMult(num(army.gen, 0));
}
// The pattern a realm may raise: its military level, held to the era's
// ceiling (SPEC §99) — no rifle brigades before the age that had them.
// The tags this realm has been, newest first — itself, then whatever it was
// before it took a greater crown (SPEC §102).
export function tagLineage(ctx, tag) {
  const t = ctx.game.tags[tag];
  const line = t && Array.isArray(t.lineage) ? t.lineage : [];
  return [tag].concat(line);
}
// The first entry of a bookmark table that answers to this realm or to any
// identity it used to hold.
export function contentForTag(ctx, table, tag) {
  if (!table) return null;
  for (const k of tagLineage(ctx, tag)) {
    if (Object.prototype.hasOwnProperty.call(table, k) && table[k]) return table[k];
  }
  return null;
}
// The court a vanished set of three letters answers to now (SPEC §135).
// `lineage` reads the relation from the survivor's side and is the right shape
// for a bookmark table; a trigger has the opposite problem. It is holding the
// name the chapter was WRITTEN with — 'HAS', 'HYR', 'JUD' — and needs to know
// who wears it, every month, for every card in the chain.
//
// This is that lookup, and it is the difference between a chapter that keeps
// running after the player takes a greater crown and one that stops dead. The
// 167 chain lost twenty-two cards to it — the whole royal century, Jannaeus'
// conquests, the Akra, the bronze tablets — because proclaiming the Kingdom of
// Israel is the reward for exactly the conquests those cards are about, and
// every one of them asked after a tag that the proclamation had just deleted.
//
// A living tag always answers for itself: a banner that has been revived by
// later content is itself, not its own successor.
export function livingTag(ctx, tag) {
  const g = ctx && ctx.game;
  if (!g || !tag || !g.tags) return tag;
  if (g.tags[tag]) return tag;
  const to = g.tagAliases && g.tagAliases[tag];
  return to && g.tags[to] ? to : tag;
}
// What the era calls a court, and where it sits (SPEC §139). Three letters
// outlive their century; the state under them does not. JUD is Judaea in every
// chapter that opens before Hadrian and it is GALILEE in 529, because by then
// the courts, the academy and the patriarch's successors are at Tiberias and
// Judaea proper is a Christian province the Jews may enter one day a year.
//
// A chapter says so with `tagTweaks`, and this is the only place that reads it.
// It is a LENS and never a write. DEFINES is a plain mutable object imported
// once and shared by the whole page — nothing would stop a chapter writing
// through it, and nothing would catch it either: the rename would follow the
// player onto the start screen, into the compendium, and into the next
// campaign begun without a reload. Reading is therefore the discipline. The
// lens costs one object spread on a hit and nothing at all when a chapter
// declares no tweaks, which is seven chapters out of eight.
export function tagDef(ctx, tag) {
  const base = (ctx && ctx.DEFINES && ctx.DEFINES.TAGS && ctx.DEFINES.TAGS[tag]) || null;
  const table = ctx && ctx.bookmark && ctx.bookmark.tagTweaks;
  const tweak = table && Object.prototype.hasOwnProperty.call(table, tag) ? table[tag] : null;
  if (!tweak) return base || {};
  return { ...(base || {}), ...tweak };
}
// Off-map seats (SPEC §180): courts the frame cannot reach. A seat is a real
// tag whose def carries `offmap` — alive without land, beyond every army,
// barred from alliances, but a court, an opinion and a treasury like any.
export function isOffmapTag(ctx, tag) {
  return !!tagDef(ctx, tag).offmap;
}

// ------------------------------------------------------- the arms market
// SPEC §181: where the bookmark declares `armsMarket`, only its arsenal
// states raise the gated arms (air wings, armor) from their own works;
// everyone else needs a standing weapons transfer agreement with ONE
// supplier at a time. The book is `game.armsDeals = { client: supplier }` —
// saves carry it for free. Liveness is re-derived rather than stored, so
// regard, war, a §100 embargo or the supplier's fall each shut the pipeline
// the month they happen, with nothing to desynchronize.
export function armsMarketOn(ctx) {
  return !!(ctx && ctx.bookmark && ctx.bookmark.armsMarket);
}
export function isArsenal(ctx, tag) {
  const m = ctx && ctx.bookmark && ctx.bookmark.armsMarket;
  return !!(m && Array.isArray(m.arsenals) && m.arsenals.indexOf(tag) >= 0);
}
export function armsDealBook(ctx) {
  const g = ctx.game;
  if (!g.armsDeals || typeof g.armsDeals !== 'object') g.armsDeals = {};
  return g.armsDeals;
}
// The client's pipeline, and whether it currently feeds: { supplier, live, why }.
export function armsDealState(ctx, tag) {
  const g = ctx.game;
  const sup = armsDealBook(ctx)[tag];
  if (!sup) return { supplier: null, live: false, why: 'no agreement stands' };
  const s = g.tags[sup];
  const A = ctx.DEFINES.ARMS || {};
  if (!s || !s.alive) return { supplier: sup, live: false, why: 'the supplier is no more' };
  const t = g.tags[tag];
  if (t && (t.atWarWith || []).indexOf(sup) >= 0) {
    return { supplier: sup, live: false, why: 'we are at war with ' + (s.name || sup) };
  }
  if (g.embargoes && g.embargoes[sup + '>' + tag]) {
    return { supplier: sup, live: false, why: (s.name || sup) + ' has closed its markets to us' };
  }
  if (opinionOf(ctx, sup, tag) < num(A.floor, 25)) {
    return { supplier: sup, live: false, why: 'our standing in ' + (s.name || sup) + ' sank too low' };
  }
  return { supplier: sup, live: true, why: '' };
}
export function armsSupplierOf(ctx, tag) {
  const st = armsDealState(ctx, tag);
  return st.live ? st.supplier : null;
}
// May this court raise the imported arms this month? '' when yes, else the
// reason. Chapters that declare no market always answer yes.
export function armsGate(ctx, tag) {
  if (!armsMarketOn(ctx)) return '';
  if (isArsenal(ctx, tag)) return '';
  const st = armsDealState(ctx, tag);
  if (st.live) return '';
  return st.supplier ? st.why : 'no arms supplier — win an arsenal court\'s favor first';
}

export function tagGen(ctx, tag) {
  const t = ctx.game.tags[tag];
  return cappedGen(num(t && t.tech && t.tech.mar, 0), ctx && ctx.bookmark);
}
export function maxMoraleOf(ctx, tag) {
  const t = ctx.game.tags[tag];
  let m = B(ctx, 'moraleBase', 3.0) * resolveTagMult(ctx, tag, 'moraleMult');
  if (t && num(t.treasury) < 0) m *= 0.9; // indebted crown, wavering men
  return clamp(m, 0.5, 8);
}
// National force limit (SPEC §21 extended): the establishment a realm's land
// can sustain. Regiments beyond it pay overLimitMult × maintenance (economy.js)
// — the doomstack becomes an economic decision, not a free win button.
export function forceLimitOf(ctx, tag) {
  const g = ctx.game;
  const bal = ctx.DEFINES.BALANCE || {};
  let dev = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== tag) continue;
    dev += devTotal(p) * levyOf(p); // the establishment the realm can DRAW on (SPEC §173)
  }
  return Math.max(4, Math.round(
    (num(bal.forceLimitBase, 8) + dev * num(bal.forceLimitPerDev, 0.15))
    * resolveTagMult(ctx, tag, 'forceLimitMult')));
}

// ---------------------------------------------------------------- queries
export function armiesOf(ctx, tag) {
  const out = [];
  for (const id in ctx.game.armies) {
    const a = ctx.game.armies[id];
    if (a && a.tag === tag) out.push(a);
  }
  return out;
}
export function armiesInProv(ctx, provId) {
  const out = [];
  for (const id in ctx.game.armies) {
    const a = ctx.game.armies[id];
    if (a && a.prov === provId && !a.aboard) out.push(a); // aboard = at sea, out of land play
  }
  return out;
}
export function regCount(a) {
  if (!a || !a.regiments) return 0;
  // Three arms since SPEC §191; a pre-§191 army has no `art` key and num()
  // reads it as the zero it always was.
  return num(a.regiments.inf) + num(a.regiments.cav) + num(a.regiments.art);
}
// A column marches at the pace of its slowest arm (SPEC §191): horse alone
// outruns foot, and one gun train sets the pace of everything it travels with.
export function armSpeedOf(army) {
  const r = army && army.regiments;
  let mult = 0;
  for (const a of ARMS) {
    if (num(r && r[a]) <= 0) continue;
    const s = num(ARM[a] && ARM[a].speed, 1);
    mult = mult === 0 ? s : Math.min(mult, s);
  }
  return mult === 0 ? 1 : mult;
}

// ---------------------------------------------------------------- diplomacy
export function isHostile(ctx, a, b) {
  if (!a || !b || a === b) return false;
  if (a === 'REB' || b === 'REB') return true;
  const t = ctx.game.tags[a];
  return !!(t && t.atWarWith && t.atWarWith.indexOf(b) >= 0);
}
export function sameSide(ctx, a, b) {
  if (a === b) return true;
  if (a === 'REB' || b === 'REB') return false;
  const ta = ctx.game.tags[a], tb = ctx.game.tags[b];
  if (!ta || !tb) return false;
  // Overlord & client (and clients of one overlord) stand together.
  if (ta.overlord === b || tb.overlord === a) return true;
  if (ta.overlord && ta.overlord === tb.overlord) return true;
  if ((ta.allies && ta.allies.indexOf(b) >= 0) || (tb.allies && tb.allies.indexOf(a) >= 0)) return true;
  for (const w of ctx.game.wars) {
    if ((w.attackers.indexOf(a) >= 0 && w.attackers.indexOf(b) >= 0) ||
        (w.defenders.indexOf(a) >= 0 && w.defenders.indexOf(b) >= 0)) return true;
  }
  return false;
}
export function canEnter(ctx, tag, provId) {
  const p = ctx.byId(provId);
  if (!p || p.impassable) return false;
  if (tag === 'REB') return true;
  if (p.owner === tag) return true;
  if (isHostile(ctx, tag, p.owner)) return true;
  if (sameSide(ctx, tag, p.owner)) return true;
  // Unclaimed land nobody governs is walkable by anyone. Before SPEC §160
  // this line could not be reached: every WASTE cell in the game was also
  // `impassable: true` — all nine of them were deep desert — so the check
  // above caught them and the fall-through below was dead code.
  //
  // §160 added 130 unowned-but-passable cells across the west, and the dead
  // code woke up as a WALL. Four of them (Philippopolis, Serdica, Naissus,
  // Novae) sit on the ground between Thrace and Macedonia, which turned
  // Thessalonica, Dyrrhachium, Corinth, Athens and Sparta into a land island
  // in every chapter: no march down the via Egnatia, no supply chain reaching
  // them, and an AI whose bfsDistances could not see them at all. Byzantion
  // could reach 152 of 307 provinces.
  //
  // Passage is not possession. Entering unowned ground takes nothing and
  // claims nothing; it is the crossing a treaty was never needed for.
  if (p.owner === 'WASTE') return true;
  return false;
}

// ---------------------------------------------------------------- pathfinding
function bfs(ctx, fromId, pass, isGoal, maxDepth) {
  const nbs = ctx.geom && ctx.geom.neighbors;
  if (!nbs || !fromId) return null;
  const prev = new Map();
  prev.set(fromId, 0);
  let frontier = [fromId];
  let depth = 0;
  while (frontier.length && depth < (maxDepth || 64)) {
    depth++;
    const next = [];
    for (const cur of frontier) {
      const set = nbs[cur];
      if (!set) continue;
      for (const nb of set) {
        if (prev.has(nb) || !pass(nb)) continue;
        prev.set(nb, cur);
        if (isGoal(nb)) {
          const path = [nb];
          let at = cur;
          while (at !== fromId && at !== 0) { path.unshift(at); at = prev.get(at); }
          return path;
        }
        next.push(nb);
      }
    }
    frontier = next;
  }
  return null;
}
export function bfsDistances(ctx, fromId, pass, maxDepth) {
  const dist = new Map();
  const nbs = ctx.geom && ctx.geom.neighbors;
  if (!nbs || !fromId) return dist;
  dist.set(fromId, 0);
  let frontier = [fromId];
  let d = 0;
  while (frontier.length && d < (maxDepth || 32)) {
    d++;
    const next = [];
    for (const cur of frontier) {
      const set = nbs[cur];
      if (!set) continue;
      for (const nb of set) {
        if (dist.has(nb) || !pass(nb)) continue;
        dist.set(nb, d);
        next.push(nb);
      }
    }
    frontier = next;
  }
  return dist;
}
export function findPath(ctx, tag, fromId, toId) {
  if (!fromId || !toId) return null;
  if (fromId === toId) return [];
  if (!canEnter(ctx, tag, toId)) return null;
  return bfs(ctx, fromId, (id) => canEnter(ctx, tag, id), (id) => id === toId, 64);
}
// Marching speed by unit pattern (SPEC §25): antiquity walks, the lance ages
// ride a little faster, the musket age has roads, the modern age has trucks.
const GEN_SPEED = [1, 1, 1, 1.1, 1.25, 1.5];
export function genSpeed(genIdx) {
  return GEN_SPEED[Math.max(0, Math.min(GEN_SPEED.length - 1, genIdx | 0))];
}
export function hopDays(ctx, fromId, destId, army) {
  const cs = ctx.geom && ctx.geom.centroids;
  const a = cs && cs[fromId], b = cs && cs[destId];
  let dist = 60;
  if (a && b && Number.isFinite(a.x) && Number.isFinite(b.x)) {
    dist = Math.hypot(b.x - a.x, b.y - a.y);
  }
  const p = ctx.byId(destId);
  const terr = p && ctx.DEFINES.TERRAINS ? ctx.DEFINES.TERRAINS[p.terrain] : null;
  const mc = terr ? num(terr.moveCost, 1.2) : 1.2;
  // Pattern × arm (SPEC §25 × §191): the age sets the pace, the slowest arm
  // in the column keeps it. A pure horse raid outruns the same men walking by
  // a quarter; put one gun battery in and the whole column gives back a sixth.
  const spd = army ? genSpeed(num(army.gen, 0)) * armSpeedOf(army) : 1;
  // Interdiction (SPEC §154): a column marching into a ring the enemy owns
  // the sky over moves slower, because that is what happened to the Egyptian
  // and Iraqi columns. Two net wings against it cost a quarter of its speed,
  // four cost half.
  //
  // Scoped to ground the mover's side does not hold, and that scope is
  // load-bearing rather than decorative. Unscoped, this taxed every march in
  // the game: the 1948 map is small enough that two hops covers a country, so
  // once every state had a wing or two, every column everywhere was
  // permanently interdicted — including inside its own borders, in peacetime.
  // Air interdiction is a thing done to an army going somewhere, not a
  // standing weather condition over the world.
  let interdict = 1;
  if (army && army.tag && p && !sameSide(ctx, army.tag, p.controller)) {
    const against = -airNetAgainst(ctx, destId, army.tag);
    if (against >= AIRC(ctx, 'interdictHardAt', 4)) interdict = 1.5;
    else if (against >= AIRC(ctx, 'interdictAt', 2)) interdict = 1.25;
  }
  return clamp(Math.round((4 + dist / 24) * mc * interdict / spd), 2, 40);
}
export function issueMove(ctx, army, targetId) {
  if (!army || army.inBattle) return false;
  if (army.prov === targetId) { army.path = []; army.moveDaysLeft = 0; return true; }
  const path = findPath(ctx, army.tag, army.prov, targetId);
  if (!path || !path.length) return false;
  army.path = path;
  army.moveDaysLeft = 0; // first leg cost set on next day's tick
  army.retreating = false;
  return true;
}

// ---------------------------------------------------------------- spawn/remove
export function spawnArmy(ctx, tag, provName, opts) {
  const g = ctx.game;
  const o = opts || {};
  const pid = ctx.provId(provName);
  if (!pid) { warnOnce('spawnp:' + provName, 'spawnArmy: unknown province', provName); return 0; }
  if (!g.tags[tag]) { warnOnce('spawnt:' + tag, 'spawnArmy: unknown tag', tag); return 0; }
  let inf = Math.max(0, Math.round(num(o.inf, 0)));
  const cav = Math.max(0, Math.round(num(o.cav, 0)));
  const art = Math.max(0, Math.round(num(o.art, 0))); // SPEC §191; absent in every older caller
  if (inf + cav + art <= 0) inf = 1;
  const regSize = B(ctx, 'regSize', 1000);
  const id = g.nextArmyId++;
  const mm = maxMoraleOf(ctx, tag);
  const leader = o.general ? {
    name: String(o.general.name || 'General'),
    fire: clamp(Math.round(num(o.general.fire, 0)), 0, 5),
    shock: clamp(Math.round(num(o.general.shock, 0)), 0, 5),
    maneuver: clamp(Math.round(num(o.general.maneuver, 0)), 0, 5),
  } : null;
  const army = {
    id, tag,
    name: o.name || ((g.tags[tag].name || tag) + ' Army'),
    prov: pid, path: [], moveDaysLeft: 0,
    regiments: { inf, cav, art },
    men: (inf + cav + art) * regSize,
    morale: mm, maxMorale: mm,
    general: leader,
    gen: Number.isFinite(o.gen) ? (o.gen | 0) : tagGen(ctx, tag), // unit pattern (SPEC §22)
    inBattle: false, retreating: false,
  };
  g.armies[id] = army;
  engageIfNeeded(ctx, army);
  return id;
}
export function removeArmy(ctx, armyId) {
  const g = ctx.game;
  const a = g.armies[armyId];
  if (!a) return;
  delete g.armies[armyId];
  if (g.ui && g.ui.selectedArmy === armyId) g.ui.selectedArmy = null;
  if (g.ui && Array.isArray(g.ui.selectedArmies)) {
    g.ui.selectedArmies = g.ui.selectedArmies.filter((id) => id !== armyId);
  }
  for (const b of g.battles.slice()) {
    let i = b.atk.indexOf(a.id);
    if (i >= 0) b.atk.splice(i, 1);
    i = b.def.indexOf(a.id);
    if (i >= 0) b.def.splice(i, 1);
    if (!b.atk.length || !b.def.length) {
      endBattle(ctx, b, b.atk.length ? 'atk' : 'def');
    }
  }
}

// Voluntarily stand an army down to shed its monthly maintenance. An army in
// friendly, controlled land returns most of its surviving men to the manpower
// pool; disbanding abroad still cuts the expense, but disperses the ranks.
export function disbandArmyCore(ctx, army) {
  const g = ctx.game;
  if (!army || !g.armies[army.id]) return { ok: false, why: 'No such army.' };
  if (army.inBattle) return { ok: false, why: 'An army cannot disband in battle.' };
  if (army.retreating || num(army.shatteredDays) > 0) {
    return { ok: false, why: 'A routed army must reform before it can stand down.' };
  }
  if (army.aboard) return { ok: false, why: 'An embarked army must return to land first.' };
  const t = g.tags[army.tag];
  if (!t) return { ok: false, why: 'The army has no realm to return to.' };
  const p = ctx.byId(army.prov);
  const home = !!p && p.owner === army.tag && p.controller === army.tag;
  const returned = home ? Math.max(0, Math.floor(num(army.men) * 0.75)) : 0;
  const ceiling = Number.isFinite(t.maxManpower) ? Math.max(0, num(t.maxManpower)) : Infinity;
  t.manpower = Math.min(ceiling, Math.max(0, num(t.manpower)) + returned);
  const name = army.name || 'The army';
  removeArmy(ctx, army.id);
  return { ok: true, returned, home, name };
}

// ---------------------------------------------------------------- battles
function battleSideArmies(ctx, b, key) {
  const out = [];
  for (const id of b[key]) {
    const a = ctx.game.armies[id];
    if (a && a.men > 0) out.push(a);
  }
  return out;
}
function startBattle(ctx, provId, atkArmies, defArmies) {
  const g = ctx.game;
  g.flags._nextBattleId = num(g.flags._nextBattleId, 0) + 1;
  const b = {
    id: 'b' + g.flags._nextBattleId, prov: provId,
    atk: atkArmies.map((a) => a.id), def: defArmies.map((a) => a.id), day: 0,
  };
  for (const a of atkArmies) a.inBattle = true;
  for (const a of defArmies) a.inBattle = true;
  g.battles.push(b);
  // What the field SOUNDS like (SPEC §191): the arms that lead the two hosts,
  // so a cavalry charge into a gun line is not the same noise as two spear
  // walls meeting. Summed across each side, because the sound of a battle is
  // the sound of everybody in it.
  const lead = (armies) => {
    const regs = { inf: 0, cav: 0, art: 0 };
    let gen = 0;
    for (const a of armies) {
      for (const arm of ARMS) regs[arm] += num(a.regiments && a.regiments[arm]);
      gen = Math.max(gen, num(a.gen, 0));
    }
    return { arm: dominantArm(regs), gen };
  };
  const la = lead(atkArmies), ld = lead(defArmies);
  ctx.bus.emit('battleStart', {
    prov: provId,
    atkArm: la.arm, atkGen: la.gen, defArm: ld.arm, defGen: ld.gen,
    atkCue: unitBattleCue(la.gen, la.arm), defCue: unitBattleCue(ld.gen, ld.arm),
  });
}
function endBattle(ctx, b, winKey) {
  const g = ctx.game;
  const i = g.battles.indexOf(b);
  if (i >= 0) g.battles.splice(i, 1);
  const winners = battleSideArmies(ctx, b, winKey);
  for (const a of winners) { a.inBattle = false; maybeGainTrait(ctx, a); }
  const winnerTag = winners.length ? winners[0].tag : null;
  ctx.bus.emit('battleEnd', { prov: b.prov, winnerTag });
  return winnerTag;
}
export function warBetween(ctx, a, b) {
  for (const w of ctx.game.wars) {
    const aA = w.attackers.indexOf(a) >= 0, aD = w.defenders.indexOf(a) >= 0;
    const bA = w.attackers.indexOf(b) >= 0, bD = w.defenders.indexOf(b) >= 0;
    if ((aA && bD) || (aD && bA)) return w;
  }
  return null;
}
function awardBattleScore(ctx, winnerTag, loserTag) {
  const w = warBetween(ctx, winnerTag, loserTag);
  if (!w) return;
  if (!w._bs) w._bs = { att: 0, def: 0 };
  const key = w.attackers.indexOf(winnerTag) >= 0 ? 'att' : 'def';
  w._bs[key] = Math.min(40, num(w._bs[key]) + 2);
}
export function addWarExhaustion(ctx, tag, amt) {
  const t = ctx.game.tags[tag];
  if (!t) return;
  t.warExhaustion = clamp(num(t.warExhaustion) + amt, 0, B(ctx, 'warExhaustionMax', 20));
}
export function engageIfNeeded(ctx, army) {
  try {
    const g = ctx.game;
    if (!army || !g.armies[army.id] || army.retreating || army.aboard || num(army.shatteredDays) > 0) return;
    const pid = army.prov;
    let b = null;
    for (const bb of g.battles) if (bb.prov === pid) { b = bb; break; }
    if (b) {
      if (b.atk.indexOf(army.id) >= 0 || b.def.indexOf(army.id) >= 0) return;
      const defTags = battleSideArmies(ctx, b, 'def').map((a) => a.tag);
      const atkTags = battleSideArmies(ctx, b, 'atk').map((a) => a.tag);
      const hostileToDef = defTags.some((t) => isHostile(ctx, army.tag, t));
      const hostileToAtk = atkTags.some((t) => isHostile(ctx, army.tag, t));
      // Join a side only when unambiguous; hostile to both (e.g. rebels) stands
      // off and engages the survivor once the battle resolves.
      if (hostileToDef && !hostileToAtk) { b.atk.push(army.id); army.inBattle = true; }
      else if (hostileToAtk && !hostileToDef) { b.def.push(army.id); army.inBattle = true; }
      return;
    }
    const here = armiesInProv(ctx, pid);
    const hostiles = here.filter((o) => o.id !== army.id && !o.retreating && num(o.shatteredDays) <= 0 && o.men > 0 && isHostile(ctx, army.tag, o.tag));
    if (hostiles.length) {
      const friends = here.filter((o) => !o.retreating && !o.inBattle && num(o.shatteredDays) <= 0 && o.men > 0 &&
        (o.id === army.id || sameSide(ctx, army.tag, o.tag)));
      startBattle(ctx, pid, friends.length ? friends : [army], hostiles);
      return;
    }
    const p = ctx.byId(pid);
    if (p && isHostile(ctx, army.tag, p.controller)) ensureSiege(ctx, p, army.tag);
  } catch (e) {
    warnOnce('engage', 'engageIfNeeded failed', e);
  }
}
function casualtiesInflicted(X, Y, rollX, rollY) {
  if (Y.men <= 0 || X.men <= 0) return 0;
  const edge = Math.max(0, rollX - rollY);
  const cas = X.men * 0.010 * (1 + 0.12 * edge) * (X.disc / Math.max(0.5, Y.disc));
  return Math.min(Math.floor(cas), Math.floor(Y.men * 0.12));
}
function moraleDamage(X, Y, rollX, rollY) {
  if (Y.men <= 0) return 0;
  const edge = Math.max(0, rollX - rollY);
  const ratio = clamp(X.men / Math.max(1, Y.men), 0.05, 2.5); // tiny remnants can't break a legion's will
  return (0.16 + 0.045 * edge) * ratio * X.disc;
}
function sideStats(ctx, armies, phase) {
  let men = 0, moraleW = 0, discW = 0, pip = 0, hill = 0, gen = 0, armor = 0;
  const minArmorGen = num((ctx.DEFINES.ARMOR || {}).minGen, 5);
  const tags = new Set();
  // The side's whole order of battle by arm (SPEC §191), counted in regiments
  // across every stack on the field — a mix, not a per-army thing, because the
  // guns of one army cover the line of the one beside it.
  const regs = { inf: 0, cav: 0, art: 0 };
  let modernArt = 0;
  for (const a of armies) {
    men += a.men;
    moraleW += num(a.morale) * a.men;
    discW += disciplineOf(ctx, a.tag) * armyPowerOf(ctx, a) * a.men;
    if (a.general) pip = Math.max(pip, num(a.general[phase], 0));
    gen = Math.max(gen, num(a.gen, 0));
    for (const arm of ARMS) regs[arm] += num(a.regiments && a.regiments[arm]);
    // The tanks on this side (SPEC §181): mounted regiments in a pattern
    // that means armor. A cataphract column counts zero by construction.
    if (num(a.gen, 0) >= minArmorGen) {
      armor += num(a.regiments && a.regiments.cav);
      modernArt += num(a.regiments && a.regiments.art);
    }
    tags.add(a.tag);
  }
  for (const t of tags) hill = Math.max(hill, resolveTagAdd(ctx, t, 'hillDefBonus'));
  return {
    men,
    morale: men > 0 ? moraleW / men : 0,
    disc: men > 0 ? discW / men : 1,
    pip, hill, gen, armor, // `armor` stays §181's COUNT: armorPips nets them
    regs,
    shares: armShares(regs),
    // The side's mounted arm reads as armor when its tanks are most of it —
    // one veteran Sherman troop attached to a horse column does not make the
    // column armor, and does not cost the enemy their braced line.
    armorArm: armor > 0 && armor >= regs.cav * 0.5,
    artModern: modernArt > 0 && modernArt >= regs.art * 0.5,
    tags: [...tags],
  };
}
function applySideDamage(armies, sideMen, cas, moraleDmg) {
  for (const a of armies) {
    const share = sideMen > 0 ? a.men / sideMen : 0;
    a.men = Math.max(0, a.men - Math.round(cas * share));
    a.morale = Math.max(0, num(a.morale) - moraleDmg);
  }
}
function sideMoraleAvg(armies) {
  let men = 0, mw = 0;
  for (const a of armies) { men += a.men; mw += num(a.morale) * a.men; }
  return men > 0 ? mw / men : 0;
}
function isFriendlyControlled(ctx, tag, p) {
  return p.controller === tag || sameSide(ctx, tag, p.controller);
}
function routArmy(ctx, army) {
  army.inBattle = false;
  army.morale = 0.3 * num(army.maxMorale, 1);
  army.shatteredDays = 30; // no engagement either way until recovered (EU4 shattered retreat)
  const safeGoal = (id) => {
    const p = ctx.byId(id);
    if (!p || id === army.prov || !isFriendlyControlled(ctx, army.tag, p)) return false;
    return !armiesInProv(ctx, id).some((o) => o.men > 0 && isHostile(ctx, army.tag, o.tag));
  };
  let path = bfs(ctx, army.prov,
    (id) => { const p = ctx.byId(id); return !!p && !p.impassable; },
    safeGoal, 16);
  if (!path || !path.length) {
    // fall back to any friendly province, even contested
    path = bfs(ctx, army.prov,
      (id) => { const p = ctx.byId(id); return !!p && !p.impassable; },
      (id) => { const p = ctx.byId(id); return !!p && id !== army.prov && isFriendlyControlled(ctx, army.tag, p); },
      16);
  }
  if (!path || !path.length) {
    if (army.tag === ctx.game.playerTag) {
      ctx.bus.emit('notify', { title: 'Army destroyed', text: army.name + ' was wiped out with no line of retreat.', type: 'bad' });
    }
    removeArmy(ctx, army.id);
    return;
  }
  army.path = path;
  army.moveDaysLeft = 0;
  army.retreating = true;
}
function battleRound(ctx, b) {
  const g = ctx.game;
  b.day++;
  let atk = battleSideArmies(ctx, b, 'atk');
  let def = battleSideArmies(ctx, b, 'def');
  if (!atk.length && !def.length) {
    const i = g.battles.indexOf(b);
    if (i >= 0) g.battles.splice(i, 1);
    return;
  }
  if (!atk.length || !def.length) { endBattle(ctx, b, atk.length ? 'atk' : 'def'); return; }
  const p = ctx.byId(b.prov);
  const terr = p && ctx.DEFINES.TERRAINS ? ctx.DEFINES.TERRAINS[p.terrain] : null;
  const defBonus = terr ? num(terr.defBonus, 0) : 0;
  const hilly = !!p && (p.terrain === 'hills' || p.terrain === 'mountains');
  const phase = Math.floor((b.day - 1) / 3) % 2 === 0 ? 'fire' : 'shock';
  const A = sideStats(ctx, atk, phase);
  const D = sideStats(ctx, def, phase);
  // Doctrines (SPEC §29): the side's best pattern adds pips — shieldwall for
  // the defender, shock charge, volley fire, combined arms. Air wings based
  // within range add one more in the fire phase (they cancel when both
  // sides fly).
  // SPEC §154: air is a quantity and it speaks in every phase. `net` is
  // signed, so one side's pips are the other's absence of them — the sky over
  // a battle belongs to somebody rather than to both or neither.
  const net = airNet(ctx, b.prov, A.tags, D.tags);
  const airA = airPips(ctx, net);
  const airD = airPips(ctx, -net);
  // SPEC §181: armor is the shock phase's own signed quantity — fire belongs
  // to the sky, shock to the tanks. One subtraction, so one side's pips are
  // the other's absence of them, exactly as the air term above.
  const armorNet = A.armor - D.armor;
  // The ground answers armor too (SPEC §191). §181's quantity term is the
  // tanks; a mountain is where the tanks cannot go around, so the pips it
  // earns are cut by the same table that takes the charge away from horse.
  const rough = MOUNTED_TERRAIN[(p && p.terrain) || ''] || null;
  const roughArmor = (n) => (rough ? Math.floor(n * rough.armor) : n);
  const armA = phase === 'shock' ? roughArmor(armorPips(ctx, armorNet)) : 0;
  const armD = phase === 'shock' ? roughArmor(armorPips(ctx, -armorNet)) : 0;
  // SPEC §191: what each side's MIX is worth against the other's, this phase.
  // Unlike air and armor this is not a signed quantity — both sides read their
  // own row of the table, so a host of guns and a host of horse can each be
  // earning pips in the phase that belongs to them.
  const mixA = armPips(ctx, phase, A, D, p && p.terrain);
  const mixD = armPips(ctx, phase, D, A, p && p.terrain);
  const docA = doctrinePips(A.gen, phase, false) + airA + armA + mixA;
  const docD = doctrinePips(D.gen, phase, true) + airD + armD + mixD;
  const rollA = ctx.rng.int(10) + A.pip + (hilly ? A.hill : 0) + docA;
  const rollD = ctx.rng.int(10) + D.pip + defBonus + (hilly ? D.hill : 0) + docD;
  const casOnAtk = casualtiesInflicted(D, A, rollD, rollA);
  const casOnDef = casualtiesInflicted(A, D, rollA, rollD);
  const mdOnAtk = moraleDamage(D, A, rollD, rollA);
  const mdOnDef = moraleDamage(A, D, rollA, rollD);
  // Battle-window feed: yesterday's dice and the running butcher's bill.
  b.last = { phase, rollA, rollD, airA, airD, armA, armD, mixA, mixD };
  b.casAtk = num(b.casAtk) + casOnAtk;
  b.casDef = num(b.casDef) + casOnDef;
  applySideDamage(atk, A.men, casOnAtk, mdOnAtk);
  applySideDamage(def, D.men, casOnDef, mdOnDef);
  for (const a of atk.concat(def)) if (a.men <= 0) removeArmy(ctx, a.id);
  if (g.battles.indexOf(b) < 0) return; // resolved via removals
  atk = battleSideArmies(ctx, b, 'atk');
  def = battleSideArmies(ctx, b, 'def');
  if (!atk.length || !def.length) {
    if (atk.length || def.length) endBattle(ctx, b, atk.length ? 'atk' : 'def');
    else { const i = g.battles.indexOf(b); if (i >= 0) g.battles.splice(i, 1); }
    return;
  }
  const atkBroke = sideMoraleAvg(atk) <= 0.05;
  const defBroke = sideMoraleAvg(def) <= 0.05;
  if (!atkBroke && !defBroke) return;
  const winKey = atkBroke ? 'def' : 'atk'; // attacker yields the field on a mutual break
  const losers = atkBroke ? atk : def;
  const winners = winKey === 'atk' ? atk : def;
  const winnerTag = winners[0].tag;
  const loserTag = losers[0].tag;
  endBattle(ctx, b, winKey); // remove battle first so routing can't double-resolve it
  const winnersMen = winners.reduce((s, a) => s + num(a.men), 0);
  const losersMen = losers.reduce((s, a) => s + num(a.men), 0);
  if (winnersMen >= 10 * Math.max(1, losersMen) || losersMen < 300) {
    // Stackwipe: an overwhelming victory annihilates the remnant instead of
    // letting it rout, recover, and re-engage forever.
    for (const a of losers.slice()) {
      if (a.tag === g.playerTag) {
        ctx.bus.emit('notify', { title: 'Army annihilated', text: a.name + ' was destroyed to the last man at ' + (p ? p.name : 'the field') + '.', type: 'bad', provName: p ? p.name : undefined });
      }
      removeArmy(ctx, a.id);
    }
  } else {
    for (const a of losers.slice()) routArmy(ctx, a);
  }
  awardBattleScore(ctx, winnerTag, loserTag);
  addWarExhaustion(ctx, loserTag, 1);
  const player = g.playerTag;
  if (winnerTag === player || loserTag === player) {
    const won = winnerTag === player;
    ctx.bus.emit('notify', {
      title: 'Battle of ' + (p ? p.name : 'the field'),
      text: (g.tags[winnerTag] ? g.tags[winnerTag].name : winnerTag) + ' holds the field after ' + b.day + ' days of fighting.',
      type: won ? 'good' : 'bad',
      provName: p ? p.name : undefined,
    });
  }
}
export function tickBattles(ctx) {
  for (const b of ctx.game.battles.slice()) {
    try { battleRound(ctx, b); } catch (e) { warnOnce('battle', 'battle round failed', e); }
  }
}

// ---------------------------------------------------------------- air power
// SPEC §29: wings live at airfields (a late building — mar tech 19), rebase
// freely between your own fields, add a fire-phase pip to friendly battles
// within AIR.rangeHops, and burn on the ground if their field falls.
function AIRC(ctx, key, fallback) {
  const air = ctx && ctx.DEFINES && ctx.DEFINES.AIR;
  const v = air ? air[key] : undefined;
  return Number.isFinite(v) ? v : fallback;
}
export function hasAirfield(p) {
  return !!(p && Array.isArray(p.buildings) && p.buildings.indexOf('airfield') >= 0);
}
export function airWingsAt(ctx, provId) {
  return Object.values(ctx.game.airwings || {}).filter((w) => w && w.prov === provId);
}
export function airWingsOf(ctx, tag) {
  return Object.values(ctx.game.airwings || {}).filter((w) => w && w.tag === tag);
}
// Small BFS ring: every province within `range` hops (inclusive of start).
export function provsWithin(ctx, provId, range) {
  const seen = new Set([provId]);
  let frontier = [provId];
  for (let d = 0; d < range; d++) {
    const next = [];
    for (const id of frontier) {
      const nb = ctx.geom && ctx.geom.neighbors && ctx.geom.neighbors[id];
      if (!nb) continue;
      for (const n of nb) {
        if (seen.has(n)) continue;
        seen.add(n);
        next.push(n);
      }
    }
    frontier = next;
  }
  return seen;
}
// ── air power as a quantity (SPEC §154) ──────────────────────────────────
//
// `airCoverFor` used to be the whole of air power: a BOOLEAN, worth +1 to the
// die in the fire phase only, and cancelled outright the moment one enemy wing
// stood anywhere in the ring. One wing was +1. Twenty wings were +1. An entire
// air force was worth less than one doctrine level, which gives +1 in EVERY
// phase — and cost 40 talents each plus fuel for the privilege.
//
// Wings are now counted, split by what they are for, and contested rather than
// cancelled:
//
//   FIGHTER wings contest the ring. They count against enemy fighters and do
//   nothing else — no die bonus, no interdiction, no bombs.
//   STRIKE wings do all the work, and only if nobody has taken the air away
//   from them.
//
// So an enemy who buys fighters and no strike aircraft can deny you your bonus
// without gaining one, which is a real trade and the shape the period actually
// had. A wing with no `kind` is a strike wing: that is what every wing in every
// existing save already is, and reading them as anything else would silently
// re-arm old campaigns.
export function airWingsInRange(ctx, provId, tags) {
  const out = { fighters: 0, strike: 0 };
  const g = ctx.game;
  const wings = Object.values(g.airwings || {});
  if (!wings.length || !tags || !tags.length) return out;
  const seen = provsWithin(ctx, provId, AIRC(ctx, 'rangeHops', 2));
  for (const w of wings) {
    if (!w || !seen.has(w.prov)) continue;
    if (!tags.some((t) => w.tag === t || sameSide(ctx, w.tag, t))) continue;
    if (w.kind === 'fighter') out.fighters++; else out.strike++;
  }
  return out;
}

// Net effective strike wings for `ourTags` over `foeTags` in this ring.
// Positive means we own the sky here by that many wings; negative means they do.
export function airNet(ctx, provId, ourTags, foeTags) {
  const A = airWingsInRange(ctx, provId, ourTags || []);
  const D = airWingsInRange(ctx, provId, foeTags || []);
  let ours = 0;
  let theirs = 0;
  if (A.fighters === 0 && D.fighters === 0) {
    // Nobody is contesting the air, so everybody's bombers fly. This is the
    // ordinary case and the one old saves land in.
    ours = A.strike; theirs = D.strike;
  } else if (A.fighters > D.fighters) {
    ours = A.strike; theirs = 0;
  } else if (A.fighters < D.fighters) {
    ours = 0; theirs = D.strike;
  } else {
    ours = A.strike; theirs = D.strike; // contested evenly: both fly, both bleed
  }
  return ours - theirs;
}

// The same question asked from one tag's chair, against everyone hostile to
// it — what movement, sieges and attrition need, none of which is handed a
// tidy two-sided battle to read sides off.
export function airNetAgainst(ctx, provId, tag) {
  const g = ctx.game;
  const foes = [];
  for (const k of Object.keys(g.tags || {})) {
    if (k === tag) continue;
    const t = g.tags[k];
    if (t && t.alive && isHostile(ctx, tag, k)) foes.push(k);
  }
  if (!foes.length) return airNet(ctx, provId, [tag], []);
  return airNet(ctx, provId, [tag], foes);
}

// Pips on the die from net wings: the first net wing is the pip air cover was
// always worth, and every two beyond it is another, to the cap. Unlike the old
// flag this applies in EVERY phase, because air power in this period was.
export function airPips(ctx, net) {
  if (!Number.isFinite(net) || net <= 0) return 0;
  const per = Math.max(1, AIRC(ctx, 'diePerWings', 2));
  return Math.min(AIRC(ctx, 'dieCap', 4), Math.ceil(net / per));
}

// Armor pips (SPEC §181): §154's signed-quantity design on the ground. The
// side with the net advantage in pattern-5+ mounted regiments — tanks, not
// horses — adds shock-phase pips; the other side, by the same subtraction,
// adds none. Ancient chapters cap at pattern 3 and can never see this term.
export function armorPips(ctx, net) {
  if (!Number.isFinite(net) || net <= 0) return 0;
  const AR = ctx.DEFINES.ARMOR || {};
  const per = Math.max(1, num(AR.pipsPer, 2));
  return Math.min(num(AR.pipCap, 3), Math.ceil(net / per));
}

// Composition pips (SPEC §191): what MY arms are worth against THEIRS in this
// phase, on the ground we are standing on. Rounded down, never negative, and
// capped — a mix is an edge, not a verdict. §181's armorPips answers the
// question "who has more tanks"; this one answers "what is each side's army
// FOR", and the two are deliberately different halves.
export function armPips(ctx, phase, mine, theirs, terrain) {
  const T = ctx.DEFINES.ARMS_TRIANGLE || {};
  const raw = armEdge(phase,
    { shares: mine.shares, armor: mine.armorArm, artModern: mine.artModern },
    { shares: theirs.shares, armor: theirs.armorArm, artModern: theirs.artModern },
    terrain || '');
  // Floored on purpose: a mix has to be a real commitment before the dice
  // notice it, so two ordinary balanced hosts read zero rather than both
  // rolling a pip that cancels.
  const triangle = clamp(Math.floor(raw * num(T.scale, 2)), 0, Math.max(0, num(T.cap, 2)));
  return triangle + antiArmorPips(ctx, phase, mine, theirs);
}

// The guns against the tanks (SPEC §191): a count, not a share. Every `atPer`
// tanks that our anti-tank guns can actually engage — never more than we have
// guns for — is a fire-phase pip. This is the third of armor's three counters,
// beside §154's sky and the ground itself.
export function antiArmorPips(ctx, phase, mine, theirs) {
  if (phase !== 'fire') return 0;
  if (!theirs.armorArm || !mine.artModern) return 0;
  const T = ctx.DEFINES.ARMS_TRIANGLE || {};
  const guns = num(mine.regs && mine.regs.art);
  const tanks = num(theirs.armor);
  const engaged = Math.min(guns, tanks);
  if (engaged <= 0) return 0;
  const per = Math.max(1, num(T.atPer, 2));
  return Math.min(num(T.atCap, 3), Math.ceil(engaged / per));
}

// The same read in words, for the battle window's tooltip.
export function armPipsText(ctx, phase, mine, theirs, terrain) {
  return armEdgeText(phase,
    { shares: mine.shares, armor: mine.armorArm, artModern: mine.artModern },
    { shares: theirs.shares, armor: theirs.armorArm, artModern: theirs.artModern },
    terrain || '');
}

// The old boolean, kept because it is the honest answer to the question it
// asks — is there any cover here at all — and because content and tests read
// it that way.
export function airCoverFor(ctx, provId, tags) {
  const c = airWingsInRange(ctx, provId, tags);
  return (c.fighters + c.strike) > 0;
}
// What a wing could bomb from its field: hostile hosts, walls we besiege,
// hostile garrisons — everything within its range ring, biggest prize first.
export function raidTargets(ctx, wing) {
  const out = [];
  const ring = provsWithin(ctx, wing.prov, AIRC(ctx, 'rangeHops', 2));
  for (const id of ring) {
    const p = ctx.byId(id);
    if (!p || p.impassable) continue;
    const foes = armiesInProv(ctx, id).filter((a) => a.men > 0 && isHostile(ctx, wing.tag, a.tag));
    const men = foes.reduce((s, a) => s + a.men, 0);
    const ourSiege = !!(p.siege && sameSide(ctx, wing.tag, p.siege.by));
    const garrison = (isHostile(ctx, wing.tag, p.controller) && (p.garrison | 0) > 0) ? (p.garrison | 0) : 0;
    if (!men && !ourSiege && !garrison) continue;
    out.push({ id, name: p.name, men, siege: ourSiege, garrison });
  }
  out.sort((a, b) => (b.men + b.garrison * 0.5) - (a.men + a.garrison * 0.5));
  return out;
}
// The raid itself (SPEC §30). Enemy air cover over the target scrambles:
// the raid may be driven off, or the wing may fall. A hit thins hostile
// hosts (3%, 40..350 men) and shakes their morale, softens walls we are
// besieging (+4 siege progress), or cracks a hostile garrison (−10%).
export function airRaidCore(ctx, tag, wingId, provId) {
  const g = ctx.game;
  const w = (g.airwings || {})[wingId];
  if (!w || w.tag !== tag) return { ok: false, why: 'no such wing' };
  if ((w.raidCd | 0) > 0) return { ok: false, why: 'rearming (' + w.raidCd + ' more days)' };
  if (!provsWithin(ctx, w.prov, AIRC(ctx, 'rangeHops', 2)).has(provId)) {
    return { ok: false, why: 'beyond the wing’s range' };
  }
  const p = ctx.byId(provId);
  const tgt = p && raidTargets(ctx, w).find((t) => t.id === provId);
  if (!tgt) return { ok: false, why: 'no hostile target there' };
  w.raidCd = AIRC(ctx, 'raidCdDays', 12);
  // fighters based near the target rise to meet the raid; a good commander
  // (SPEC §31 wing leaders) slips the net more often and dies less
  const intercepted = Object.values(g.airwings).some((o) => o && o.id !== w.id
    && isHostile(ctx, w.tag, o.tag) && provsWithin(ctx, o.prov, AIRC(ctx, 'rangeHops', 2)).has(provId));
  const evade = w.leader ? num(w.leader.maneuver, 0) : 0;
  let result = 'hit';
  let killed = 0;
  if (intercepted) {
    const roll = ctx.rng.next();
    if (roll < Math.max(0.06, 0.18 - 0.02 * evade)) result = 'lost';
    else if (roll < Math.max(0.25, 0.5 - 0.04 * evade)) result = 'repelled';
  }
  if (result === 'lost') {
    delete g.airwings[wingId];
  } else if (result === 'hit') {
    const foes = armiesInProv(ctx, provId).filter((a) => a.men > 0 && isHostile(ctx, w.tag, a.tag));
    const men = foes.reduce((s, a) => s + a.men, 0);
    if (men > 0) {
      const aim = 1 + 0.1 * (w.leader ? num(w.leader.fire, 0) : 0);
      killed = Math.min(400, Math.max(40, Math.round(men * 0.03 * aim)));
      for (const a of foes) {
        a.men = Math.max(0, a.men - Math.round(killed * (a.men / men)));
        a.morale = Math.max(0, num(a.morale) - 0.35);
        if (a.men <= 0) removeArmy(ctx, a.id);
      }
    }
    if (p.siege && sameSide(ctx, w.tag, p.siege.by)) {
      p.siege.progress = Math.min(99, num(p.siege.progress) + 4);
    } else if (isHostile(ctx, w.tag, p.controller) && (p.garrison | 0) > 0) {
      p.garrison = Math.max(0, Math.round(p.garrison * 0.9) - 50);
    }
  }
  // the bombed side hears the sirens
  const victimTag = p.controller;
  if (result !== 'repelled' && g.playerTag !== tag) {
    const hitPlayer = victimTag === g.playerTag
      || armiesInProv(ctx, provId).some((a) => a.tag === g.playerTag);
    if (hitPlayer && result === 'hit') {
      ctx.bus.emit('notify', {
        title: 'Bombing raid!',
        text: 'Enemy aircraft strike ' + p.name + (killed ? ' — ' + killed + ' men lost.' : '.'),
        type: 'bad', provName: p.name,
      });
    }
  }
  ctx.bus.emit('airRaid', { wing: wingId, tag, victimTag, from: w.prov, prov: provId, result, killed });
  return { ok: true, result, killed, provName: p.name };
}
// Ordering a strike (v6.2): the player's click SCHEDULES the raid — it flies
// on the next daily tick, so nothing explodes while the world is paused.
// Clicking the same target again calls the strike off. The cooldown is paid
// when the wing actually flies, not when the order is given.
export function orderAirRaid(ctx, tag, wingId, provId) {
  const g = ctx.game;
  const w = (g.airwings || {})[wingId];
  if (!w || w.tag !== tag) return { ok: false, why: 'no such wing' };
  if ((w.raidCd | 0) > 0) return { ok: false, why: 'rearming (' + w.raidCd + ' more days)' };
  if (w.pendingRaid === provId) {
    delete w.pendingRaid;
    return { ok: true, cancelled: true, provName: (ctx.byId(provId) || {}).name || '' };
  }
  if (!provsWithin(ctx, w.prov, AIRC(ctx, 'rangeHops', 2)).has(provId)) {
    return { ok: false, why: 'beyond the wing’s range' };
  }
  const p = ctx.byId(provId);
  if (!p || !raidTargets(ctx, w).find((t) => t.id === provId)) {
    return { ok: false, why: 'no hostile target there' };
  }
  w.pendingRaid = provId;
  return { ok: true, provName: p.name };
}
// Daily: ordered strikes fly. airRaidCore revalidates everything — a target
// that dissolved overnight simply stands the wing down with a notice.
export function flyPendingRaids(ctx) {
  const g = ctx.game;
  for (const id of Object.keys(g.airwings || {})) {
    const w = g.airwings[id];
    if (!w || w.pendingRaid == null) continue;
    const target = w.pendingRaid;
    delete w.pendingRaid;
    const mine = w.tag === g.playerTag;
    const res = airRaidCore(ctx, w.tag, w.id, target);
    if (!mine) continue; // AI raids stay silent for the raider; victims already hear sirens
    if (!res.ok) {
      ctx.bus.emit('notify', {
        title: 'Strike called back',
        text: 'The wing stays grounded: ' + res.why + '.', type: 'info',
      });
    } else if (res.result === 'lost') {
      ctx.bus.emit('notify', {
        title: 'Wing shot down',
        text: 'Enemy fighters met the raid over ' + res.provName + ' — the squadron is lost.', type: 'bad',
      });
    } else if (res.result === 'repelled') {
      ctx.bus.emit('notify', {
        title: 'Raid driven off',
        text: 'Enemy fighters over ' + res.provName + ' turned the raid back before its bombs fell.', type: 'info',
      });
    } else {
      ctx.bus.emit('notify', {
        title: 'Bombs away',
        text: 'The raid strikes ' + res.provName
          + (res.killed ? ' — ' + res.killed + ' enemy men lost' : '')
          + '. The wing returns to rearm.', type: 'good',
      });
    }
  }
}
export function raiseAirWing(ctx, tag, provId, kind) {
  const g = ctx.game;
  const t = g.tags[tag];
  const p = ctx.byId(provId);
  if (!t || !t.alive || !p) return { ok: false, why: 'invalid province or tag' };
  if (p.owner !== tag || p.controller !== tag) return { ok: false, why: 'the field is not in our hands' };
  if (!hasAirfield(p)) return { ok: false, why: 'no airfield here' };
  // SPEC §181: aircraft are an import for everyone but the arsenal states.
  const shut = armsGate(ctx, tag);
  if (shut) return { ok: false, why: shut };
  const cost = AIRC(ctx, 'wingCost', 90);
  if (num(t.treasury) < cost) return { ok: false, why: 'not enough talents (' + cost + ' needed)' };
  if (airWingsAt(ctx, provId).length + queuedUnitCount(ctx, provId, 'wing', tag) >= AIRC(ctx, 'wingsPerField', 2)) {
    return { ok: false, why: 'the hangars are full' };
  }
  t.treasury = num(t.treasury) - cost;
  // Fighters contest the sky, strike wings use it (SPEC §154). Anything that
  // is not explicitly a fighter is a strike wing, which is what every wing
  // raised before this existed already was.
  const wingKind = kind === 'fighter' ? 'fighter' : 'strike';
  const queued = queueUnitRecruitment(ctx, tag, provId, 'wing', { cost, kind: wingKind });
  return queued ? { ok: true, queued } : { ok: false, why: 'the squadron could not be scheduled' };
}
// A named commander for a squadron (SPEC §31): fire pips sharpen the bombs
// (+10%/pip), maneuver pips slip interception. Costs 50 martial points,
// like an army general.
export function hireWingLeaderCore(ctx, tag, wingId) {
  const g = ctx.game;
  const w = (g.airwings || {})[wingId];
  const t = g.tags[tag];
  if (!w || w.tag !== tag || !t) return { ok: false, why: 'no such wing' };
  if (w.leader) return { ok: false, why: 'the squadron already has its commander' };
  if (num(t.points && t.points.mar) < 50) return { ok: false, why: 'a commander costs 50 martial points' };
  t.points.mar = num(t.points.mar) - 50;
  w.leader = rollGeneral(ctx, tag);
  return { ok: true, leader: w.leader };
}
export function rebaseAirWing(ctx, tag, wingId, provId) {
  const g = ctx.game;
  const w = (g.airwings || {})[wingId];
  const p = ctx.byId(provId);
  if (!w || w.tag !== tag || !p) return { ok: false, why: 'no such wing or field' };
  if (p.owner !== tag || p.controller !== tag) return { ok: false, why: 'the field is not in our hands' };
  if (!hasAirfield(p)) return { ok: false, why: 'no airfield there' };
  if (w.prov === provId) return { ok: false, why: 'already based there' };
  if (airWingsAt(ctx, provId).length >= AIRC(ctx, 'wingsPerField', 2)) {
    return { ok: false, why: 'the hangars there are full' };
  }
  w.prov = provId;
  delete w.pendingRaid; // a new field means a new bombsight — orders re-issued
  return { ok: true };
}
// Daily sweep: wings whose field is gone, or in hostile hands, are lost on
// the ground. Dead nations' wings dissolve silently.
export function sweepAirfields(ctx) {
  const g = ctx.game;
  for (const id of Object.keys(g.airwings || {})) {
    const w = g.airwings[id];
    if (!w) { delete g.airwings[id]; continue; }
    if (w.raidCd > 0) w.raidCd--; // the armorers hang fresh bombs
    const t = g.tags[w.tag];
    if (!t || !t.alive) { delete g.airwings[id]; continue; }
    const p = ctx.byId(w.prov);
    const lost = !p || !hasAirfield(p) || isHostile(ctx, w.tag, p.controller);
    if (!lost) continue;
    delete g.airwings[id];
    if (w.tag === g.playerTag) {
      ctx.bus.emit('notify', {
        title: 'Wing lost on the ground',
        text: w.name + ' was caught at ' + ((p && p.name) || 'its field') + ' — the aircraft burn in their revetments.',
        type: 'bad', provName: p && p.name,
      });
    }
  }
}

// Sound the withdrawal (SPEC §33): every army of the tag's side quits the
// field through the rout machinery — shattered, morale broken, marching for
// friendly ground — and the enemy keeps the field (and the battle credit,
// when the round resolves). The player's exit from a battle going wrong.
export function withdrawFromBattle(ctx, tag, provId) {
  const g = ctx.game;
  const b = (g.battles || []).find((x) => x && x.prov === provId);
  if (!b) return { ok: false, why: 'no battle here' };
  const mine = [];
  for (const key of ['atk', 'def']) {
    for (const id of b[key] || []) {
      const a = g.armies[id];
      if (a && a.men > 0 && (a.tag === tag || sameSide(ctx, tag, a.tag))) mine.push(a);
    }
  }
  if (!mine.length) return { ok: false, why: 'none of our armies stand in this battle' };
  for (const a of mine) routArmy(ctx, a);
  return { ok: true, armies: mine.length };
}

// Everything the battle window shows: per-army rows, side totals, yesterday's
// dice, terrain, and which side (if any) is the player's. Read-only.
export function battleInfo(ctx, provId) {
  const g = ctx.game;
  const b = (g.battles || []).find((x) => x && x.prov === provId);
  if (!b) return null;
  const p = ctx.byId(provId);
  const terr = p && ctx.DEFINES.TERRAINS ? ctx.DEFINES.TERRAINS[p.terrain] : null;
  const me = g.playerTag;
  const side = (key) => {
    const armies = battleSideArmies(ctx, b, key);
    let men = 0, mw = 0, pipF = 0, pipS = 0, gen = 0;
    const rows = [];
    const tags = [];
    const regs = { inf: 0, cav: 0, art: 0 };
    for (const a of armies) {
      men += a.men;
      mw += num(a.morale) * a.men;
      if (a.general) { pipF = Math.max(pipF, num(a.general.fire)); pipS = Math.max(pipS, num(a.general.shock)); }
      if (tags.indexOf(a.tag) < 0) tags.push(a.tag);
      gen = Math.max(gen, num(a.gen, 0));
      for (const arm of ARMS) regs[arm] += num(a.regiments && a.regiments[arm]);
      rows.push({
        id: a.id, tag: a.tag, name: a.name || ('Army ' + a.id),
        men: a.men,
        inf: (a.regiments && a.regiments.inf) || 0,
        cav: (a.regiments && a.regiments.cav) || 0,
        art: (a.regiments && a.regiments.art) || 0,
        gen: num(a.gen, 0),
        morale: num(a.morale), maxMorale: Math.max(0.01, num(a.maxMorale, 1)),
        general: a.general ? {
          name: a.general.name,
          fire: num(a.general.fire), shock: num(a.general.shock), maneuver: num(a.general.maneuver),
        } : null,
      });
    }
    return {
      armies: rows, tags, men,
      morale: men > 0 ? mw / men : 0,
      pips: { fire: pipF, shock: pipS },
      gen,
      // The order of battle by arm (SPEC §191), and the stats the triangle
      // reads. `stats` is the same shape sideStats returns, so the window can
      // score the matchup for the phase it is showing.
      regs: { ...regs },
      stats: sideStats(ctx, armies, b.last ? b.last.phase : 'fire'),
      doctrines: doctrinesFor(gen).map((d) => ({ key: d.key, name: d.name, desc: d.desc })),
      air: airCoverFor(ctx, provId, tags),
      casualties: Math.round(num(key === 'atk' ? b.casAtk : b.casDef)),
      isMine: tags.some((t) => t === me || sameSide(ctx, me, t)),
    };
  };
  const atk = side('atk');
  const def = side('def');
  const phaseNow = b.last ? b.last.phase : 'fire';
  const terrainKey = (p && p.terrain) || '';
  atk.mix = armPips(ctx, phaseNow, atk.stats, def.stats, terrainKey);
  def.mix = armPips(ctx, phaseNow, def.stats, atk.stats, terrainKey);
  atk.mixText = armPipsText(ctx, phaseNow, atk.stats, def.stats, terrainKey);
  def.mixText = armPipsText(ctx, phaseNow, def.stats, atk.stats, terrainKey);
  delete atk.stats;
  delete def.stats;
  return {
    prov: provId,
    provName: p ? p.name : '#' + provId,
    terrain: terr ? terr.name : ((p && p.terrain) || ''),
    defBonus: terr ? num(terr.defBonus, 0) : 0,
    day: b.day,
    phase: b.last ? b.last.phase : 'fire', // round 1 opens with fire
    last: b.last ? { ...b.last } : null,
    atk, def,
    playerSide: atk.isMine ? 'atk' : (def.isMine ? 'def' : null),
  };
}

// ---------------------------------------------------------------- movement
export function moveArmiesDaily(ctx) {
  const g = ctx.game;
  for (const id of Object.keys(g.armies)) {
    const a = g.armies[id];
    if (!a || a.inBattle || a.aboard) continue;
    if (num(a.shatteredDays) > 0) {
      a.shatteredDays--;
      // Recovery is an engagement trigger: without this, co-located hostiles
      // coexist forever once the arrival-driven engage has been skipped.
      if (a.shatteredDays <= 0) engageIfNeeded(ctx, a);
    }
    if (!a.path || !a.path.length) {
      if (a.retreating) a.retreating = false;
      continue;
    }
    if (a.moveDaysLeft <= 0) { a.moveDaysLeft = hopDays(ctx, a.prov, a.path[0], a); a.hopTotal = a.moveDaysLeft; }
    a.moveDaysLeft--;
    if (a.moveDaysLeft > 0) continue;
    const next = a.path[0];
    if (!a.retreating && !canEnter(ctx, a.tag, next)) { a.path = []; a.moveDaysLeft = 0; continue; }
    a.path.shift();
    a.prov = next;
    a.moveDaysLeft = 0;
    if (a.retreating && !a.path.length) a.retreating = false;
    engageIfNeeded(ctx, a);
  }
}

// ---------------------------------------------------------------- sieges
// A famine ends when its siege does — otherwise Jerusalem starves forever and
// the penalty even turns against a later garrison of the other side.
function clearFamine(ctx, p) {
  if (!p || p.name !== 'Jerusalem') return;
  if (ctx.game.flags) delete ctx.game.flags.faminePenalty;
  if (Array.isArray(p.modifiers)) p.modifiers = p.modifiers.filter((m) => m && m.id !== 'famine');
}
function playerConcerned(ctx, p, byTag) {
  const pt = ctx.game.playerTag;
  return byTag === pt || p.owner === pt || p.controller === pt;
}
// Armies in the province able to press the siege led by byTag.
export function besiegersOf(ctx, p, byTag) {
  return armiesInProv(ctx, p.id).filter((a) => !a.retreating && !a.inBattle && num(a.shatteredDays) <= 0 && a.men > 0 &&
    (a.tag === byTag || sameSide(ctx, a.tag, byTag)));
}
export function ensureSiege(ctx, p, byTag) {
  if (!p || p.impassable || p.siege) return;
  if (!isHostile(ctx, byTag, p.controller)) return;
  const besiegers = besiegersOf(ctx, p, byTag);
  if (!besiegers.length) return;
  const regs = besiegers.reduce((s, a) => s + regCount(a), 0);
  const need = Math.max(1, Math.ceil(num(p.garrison) / 1000));
  if ((p.fort | 0) > 0 && regs < need) return;
  p.siege = { by: byTag, progress: 0, breach: 0, days: 0 };
  ctx.bus.emit('siegeStart', { provId: p.id, by: byTag });
  if (playerConcerned(ctx, p, byTag)) {
    const bt = ctx.game.tags[byTag];
    ctx.bus.emit('notify', {
      title: 'Siege of ' + p.name,
      text: (bt ? bt.name : byTag) + ' invests ' + p.name + '.',
      type: 'war', provName: p.name,
    });
  }
}
// The one true fall path (progress 100 or a successful storm): controller
// flips, garrison resets to 20%, 'siegeEnd' + notify stay consistent.
export function siegeFall(ctx, p) {
  const g = ctx.game;
  if (!p || !p.siege) return;
  const prev = p.controller;
  const by = p.siege.by;
  p.siege = null;
  clearFamine(ctx, p);
  // Liberation, not occupation (SPEC §61): a fallen province whose OWNER
  // fights on the besieger's side goes home to its owner — the overlord who
  // storms a client's stolen town hands back the keys, and an ally's land
  // returns to the ally.
  const owner = g.tags[p.owner];
  const liberated = p.owner !== by && owner && owner.alive && sameSide(ctx, by, p.owner);
  changeControllerCore(ctx, p, liberated ? p.owner : by);
  p.garrison = Math.round(num(p.maxGarrison) * 0.2);
  addWarExhaustion(ctx, prev, 0.5);
  ctx.bus.emit('siegeEnd', { provId: p.id, by });
  if (playerConcerned(ctx, p, by) || (liberated && p.owner === g.playerTag)) {
    ctx.bus.emit('notify', {
      title: liberated ? p.name + ' is liberated' : p.name + ' has fallen',
      text: liberated
        ? (g.tags[by] ? g.tags[by].name : by) + ' restores ' + p.name + ' to ' + ((owner && owner.name) || p.owner) + '.'
        : (g.tags[by] ? g.tags[by].name : by) + ' takes ' + p.name + '.',
      type: by === g.playerTag || (liberated && p.owner === g.playerTag) ? 'good' : 'bad', provName: p.name,
    });
  }
}
function siegeDay(ctx, p) {
  const g = ctx.game;
  const s = p.siege;
  const besiegers = besiegersOf(ctx, p, s.by);
  if (!besiegers.length) { // siege abandoned
    const by = s.by;
    p.siege = null;
    clearFamine(ctx, p);
    ctx.bus.emit('siegeEnd', { provId: p.id, by });
    return;
  }
  if (g.battles.some((b) => b.prov === p.id)) return; // battle rages; siege pauses
  s.days++;
  const fort = p.fort | 0;
  const regs = besiegers.reduce((sum, a) => sum + regCount(a), 0);
  const bonus = resolveTagAdd(ctx, s.by, 'siegeBonus');
  if (fort <= 0) {
    s.progress += 10; // unwalled town: occupied after ~10 days of unopposed presence
  } else {
    const need = Math.max(1, Math.ceil(num(p.garrison) / 1000));
    if (regs >= need) {
      if (s.days % 14 === 0) {
        const roll = ctx.rng.int(14) + 1;
        if (roll + bonus >= 12 && s.breach < 3) {
          s.breach++;
          if (playerConcerned(ctx, p, s.by)) {
            ctx.bus.emit('notify', { title: 'Walls breached', text: 'A breach opens in the walls of ' + p.name + '.', type: 'war', provName: p.name });
          }
        } else if (roll === 1) {
          for (const a of besiegers) a.men = Math.max(0, a.men - Math.max(1, Math.floor(a.men * 0.02)));
        }
      }
      const engineer = besiegers.some((a) => a.general && Array.isArray(a.general.traits) && a.general.traits.indexOf('engineer') >= 0);
      const blockaded = Object.values(ctx.game.fleets || {}).some((f) =>
        f && f.prov === p.id && f.ships > 0 && sameSide(ctx, f.tag, s.by));
      if (blockaded) s.progress += 0.5; // nothing enters the harbor
      // Modern firepower against old walls (SPEC §25): a musket-age stack
      // (gen 4) sieges +25% faster, a modern one (gen 5, artillery and air)
      // +50%. The Siegecraft doctrine (SPEC §29, gen 2+, professional
      // engineers) adds 20% on top. Antiquity digs like it always did.
      const stackGen = besiegers.reduce((m, a) => Math.max(m, num(a.gen, 0)), 0);
      const firepower = (1 + 0.25 * Math.max(0, stackGen - 3)) * doctrineSiegeMult(stackGen);
      // Air over the walls (SPEC §154): owning the sky by three net wings
      // doubles the rate the camp digs; losing it by three stalls the camp
      // to a crawl, because the besieger is the one in the open.
      const airNetHere = airNetAgainst(ctx, p.id, s.by);
      const siegeAt = AIRC(ctx, 'siegeAt', 3);
      const airSiege = airNetHere >= siegeAt ? 2 : (airNetHere <= -siegeAt ? 0.25 : 1);
      s.progress += airSiege * resolveTagMult(ctx, s.by, 'siegeMult') * (engineer ? 1.3 : 1) * firepower
        * (1.2 + 0.6 * s.breach + 0.03 * clamp(regs - need, 0, 20) + 0.4 * Math.max(0, bonus)) / fort;
      if (p.garrison <= 0) s.progress += 3;
    }
    let decay = 0.0015;
    if (g.flags.faminePenalty && p.name === 'Jerusalem') decay = 0.01;
    if (p.garrison > 0) p.garrison = Math.max(0, p.garrison - Math.max(1, Math.floor(p.garrison * decay)));
  }
  if (s.progress >= 100) siegeFall(ctx, p);
}

// ---------------------------------------------------------------- assaults
// Read-only feasibility + odds for storming a breached wall. byTag must lead
// the siege or share its side; a raging field battle pauses everything.
export function assaultInfo(ctx, p, byTag) {
  const out = {
    can: false, why: '', chancePct: 0, expectedLossesPct: 0,
    chance: 0, lossMen: 0, besiegers: [], besiegerMen: 0,
  };
  const g = ctx.game;
  if (!p || p.impassable || !p.siege) { out.why = 'No siege is under way here.'; return out; }
  const s = p.siege;
  if (s.by !== byTag && !sameSide(ctx, byTag, s.by)) { out.why = 'We do not lead this siege.'; return out; }
  if (g.battles.some((b) => b.prov === p.id)) { out.why = 'A battle rages outside the walls.'; return out; }
  if (num(s.breach) < 1) { out.why = 'The walls stand unbreached.'; return out; }
  const besiegers = besiegersOf(ctx, p, s.by);
  if (!besiegers.length) { out.why = 'No army is fit to storm the walls.'; return out; }
  const men = besiegers.reduce((sum, a) => sum + num(a.men), 0);
  if (men <= 0) { out.why = 'No army is fit to storm the walls.'; return out; }
  const garrison = Math.max(0, num(p.garrison));
  const fort = Math.max(0, p.fort | 0);
  out.can = true;
  out.chance = clamp(0.15 + 0.25 * num(s.breach) + 0.15 * (men / Math.max(1, garrison) - 1), 0.05, 0.9);
  out.chancePct = Math.round(out.chance * 100);
  out.lossMen = Math.round((0.5 + 0.5 * fort) * garrison); // attackers ALWAYS bleed
  out.expectedLossesPct = Math.min(100, Math.round((out.lossMen / men) * 100));
  out.besiegers = besiegers;
  out.besiegerMen = men;
  return out;
}
export function doAssault(ctx, p, byTag) {
  const g = ctx.game;
  const info = assaultInfo(ctx, p, byTag);
  if (!info.can) return { success: false, blocked: true, why: info.why };
  const s = p.siege;
  // Blood price first, win or lose, spread over the besieging armies.
  const total = Math.max(1, info.besiegerMen);
  for (const a of info.besiegers.slice()) {
    const loss = Math.min(a.men, Math.round(info.lossMen * a.men / total));
    a.men = Math.max(0, a.men - loss);
    if (a.men <= 0) {
      if (a.tag === g.playerTag) {
        ctx.bus.emit('notify', { title: 'Army destroyed', text: a.name + ' is consumed storming the walls of ' + p.name + '.', type: 'bad', provName: p.name });
      }
      removeArmy(ctx, a.id);
    }
  }
  const success = ctx.rng.chance(info.chance);
  if (success) {
    if (p.siege) siegeFall(ctx, p); // the existing fall path: flip, 20% garrison, siegeEnd, notify
  } else {
    s.progress = Math.max(0, num(s.progress) - 10);
    for (const a of besiegersOf(ctx, p, s.by)) a.morale = Math.max(0, num(a.morale) - 1.0);
    if (playerConcerned(ctx, p, byTag)) {
      ctx.bus.emit('notify', {
        title: 'Assault repulsed',
        text: 'The garrison of ' + p.name + ' throws the stormers back from the breach.',
        type: byTag === g.playerTag ? 'bad' : 'good', provName: p.name,
      });
    }
  }
  return { success };
}
export function tickSieges(ctx) {
  const g = ctx.game;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || !p.siege) continue;
    try { siegeDay(ctx, p); } catch (e) { warnOnce('siege', 'siege tick failed', e); }
  }
  // Idle armies re-check their province daily: engage recovered hostiles first,
  // fall through to starting a siege (engageIfNeeded does both, in that order).
  for (const id of Object.keys(g.armies)) {
    const a = g.armies[id];
    if (!a || a.inBattle || a.retreating || num(a.shatteredDays) > 0 || (a.path && a.path.length)) continue;
    engageIfNeeded(ctx, a);
  }
}

// ---------------------------------------------------------------- control/owner
export function changeControllerCore(ctx, p, tag) {
  if (!p || !tag || p.controller === tag) return;
  const from = p.controller;
  p.controller = tag;
  if (p.siege) { // a controller flip voids any active siege — close it loudly (SPEC §7 pairing)
    const by = p.siege.by;
    p.siege = null;
    clearFamine(ctx, p);
    ctx.bus.emit('siegeEnd', { provId: p.id, by });
  }
  ctx.bus.emit('provinceController', { provId: p.id, from, to: tag });
}
// The maps speak the owner's tongue only once the land is truly theirs
// (SPEC §66, §94, §95): a bookmark's `integratedNames[tag]` gives the name a
// tag writes on a province. Jewish states also inherit the shared Jewish pen,
// unless the bookmark's local table overrides it. A pen applies only after the
// province is properly integrated (integration at 1) or peopled by the owner's
// own culture (a completed settlement, SPEC §64) — and a Jewish pen asks for
// both at once: full integration AND a living community of the owner's own
// faith and culture in the province (SPEC §95). Until then — and again the
// moment it changes hands — the province carries the era's original name.
// A community of the owner's own faith and culture actually lives here.
// Provinces without a makeup (old saves, thin frontier cells) answer from the
// province's own overlay, which is exactly what the makeup would say.
// The culture half asks for the owner's KIND of people, not its exact
// province-level culture (SPEC §110). A Judean crown in Sepphoris is not
// looking at strangers: Galileans and Judeans are one people in every sense
// this test is trying to capture, and demanding the literal culture key meant
// a Jewish pen could almost never write outside its own home province — and
// meant the Kingdom of Israel's tribal allotments, which are mostly Galilean
// and Transjordanian ground, would have been dead on arrival. The faith half
// is unchanged and still exact.
function sameKind(DEFINES, a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const CUL = (DEFINES && DEFINES.CULTURES) || {};
  const ga = CUL[a] && CUL[a].group;
  const gb = CUL[b] && CUL[b].group;
  return !!ga && ga === gb;
}
function ownersCommunity(ctx, p, t) {
  if (!t || !t.religion || !t.culture) return false;
  const D = ctx && ctx.DEFINES;
  if (Array.isArray(p.pop) && p.pop.length) {
    return p.pop.some((e) => e && e.r === t.religion && sameKind(D, e.c, t.culture) && num(e.n) > 0);
  }
  return p.religion === t.religion && sameKind(D, p.culture, t.culture);
}
export function resolveDisplayName(ctx, p) {
  if (!p || !p.canon) return p && p.name;
  const bm = ctx.bookmark;
  const eraTable = (bm && bm.provinceNames) || {};
  const era = Object.prototype.hasOwnProperty.call(eraTable, p.canon) ? eraTable[p.canon] : p.canon;
  const t = ctx.game.tags && ctx.game.tags[p.owner];
  // A formed nation writes with its predecessor's pen: an `integratedNames`
  // entry may be a string naming another tag whose table it shares, so the
  // Kingdom of Israel keeps Judaea's Hebrew renames after the proclamation.
  const tables = (bm && bm.integratedNames) || {};
  let table = tables[p.owner];
  for (let hop = 0; typeof table === 'string' && hop < 4; hop++) table = tables[table];
  if (typeof table === 'string') table = null;
  // Local pens carry period-specific judgment (Herod's foundations, 1948
  // Nitzana) and therefore win. Religion supplies the cross-bookmark fallback:
  // Adiabene and any future/formable Jewish realm receive it without another
  // copied table or a hard-coded tag list.
  // …and the Keepers have a pen of their own (SPEC §147), on the same footing
  // and for the same reason: a realm should be able to write its own signposts
  // on the land it has integrated without its chapter listing every province
  // by hand. Keyed on the faith rather than the tag, so a Samaritan state in
  // any chapter — or formed in one — is answered without another copied table.
  const shared = !t ? null
    : t.religion === 'judaism' ? JEWISH_INTEGRATED_NAMES
      : t.religion === 'samaritanism' ? SAMARITAN_INTEGRATED_NAMES
        : null;
  // A crown's own pen (SPEC §110) outranks both: the era table describes the
  // age, the religion table describes the faith, and this describes THIS
  // crown — the thing the player just proclaimed. It names few provinces and
  // stands aside everywhere else, so the other two still do all the work.
  const crownPen = t && TAG_INTEGRATED_NAMES[p.owner];
  const renamed = (crownPen && crownPen[p.canon])
    || (table && table[p.canon])
    || (shared && shared[p.canon]);
  // A Hebrew name on a town where no Jew lives is a claim, not a signpost:
  // the Jewish pen (whatever table supplies the word) waits for both halves,
  // the schoolhouse and the community. Other pens keep the older threshold.
  const jewish = !!t && t.religion === 'judaism';
  const theirs = !!t && (jewish
    ? (num(p.integration) >= 1 && ownersCommunity(ctx, p, t))
    : (num(p.integration) >= 1 || (!!t.culture && p.culture === t.culture)));
  const next = (renamed && theirs) ? renamed : era;
  if (p.name !== next) {
    const was = p.name;
    p.name = next;
    if (ctx.bus) {
      ctx.bus.emit('provinceRenamed', { provId: p.id, from: was, to: next });
      if (renamed && theirs && p.owner === ctx.game.playerTag) {
        ctx.bus.emit('notify', {
          title: 'The maps are redrawn',
          text: was + ' is ours in more than law — the signposts now read ' + next + '.',
          type: 'good', provName: next,
        });
      }
    }
  }
  return p.name;
}

export function changeOwnerCore(ctx, p, tag) {
  if (!p || !tag || p.owner === tag) return;
  const from = p.owner;
  p.owner = tag;
  resolveDisplayName(ctx, p);
  ctx.bus.emit('provinceOwner', { provId: p.id, from, to: tag });
}

// ---------------------------------------------------------------- monthly upkeep
export function monthlyReinforce(ctx) {
  const g = ctx.game;
  const regSize = B(ctx, 'regSize', 1000);
  for (const id of Object.keys(g.armies)) {
    const a = g.armies[id];
    if (!a || a.inBattle || a.retreating || a.tag === 'REB') continue;
    // Consolidate badly hollowed armies: ghost regiments cost maintenance and
    // support-limit headroom without adding men (post-battle death-spiral guard).
    const effective = Math.max(1, Math.ceil(a.men / regSize));
    if (regCount(a) > effective + 2) {
      let drop = regCount(a) - (effective + 1);
      // Struck proportionally across the three arms (SPEC §191): an army that
      // has lost half its men has lost half of each of them. The shares are
      // taken against the original total, so a second pass — foot first —
      // clears whatever rounding left standing.
      const total = Math.max(1, regCount(a));
      for (const arm of ARMS) {
        if (drop <= 0) break;
        const have = num(a.regiments[arm]);
        if (have <= 0) continue;
        const take = Math.min(have, Math.max(0, Math.floor(drop * have / total)), drop);
        a.regiments[arm] = have - take;
        drop -= take;
      }
      for (const arm of ARMS) {
        if (drop <= 0) break;
        const have = num(a.regiments[arm]);
        if (have <= 0) continue;
        const take = Math.min(have, drop);
        a.regiments[arm] = have - take;
        drop -= take;
      }
      if (regCount(a) < 1) a.regiments.inf = 1;
    }
    if (num(a.oosMonths) > 0) continue; // no line home, no recruits (SPEC §82)
    const t = g.tags[a.tag];
    if (!t) continue;
    const target = regCount(a) * regSize;
    const missing = target - a.men;
    if (missing <= 0) continue;
    let rate = target * 0.10 * resolveTagMult(ctx, a.tag, 'reinforceMult');
    // Great powers refill their ranks half again as fast: the depth of an
    // empire is felt in the second year of a war, not the first month.
    const pers = (ctx.DEFINES.PERSONALITIES || {})[a.tag];
    if (pers && pers.ponderous) rate *= 1.5;
    const p = ctx.byId(a.prov);
    if (p && isHostile(ctx, a.tag, p.controller)) rate *= 0.5;
    const add = Math.floor(Math.min(missing, rate, Math.max(0, num(t.manpower))));
    if (add <= 0) continue;
    t.manpower = Math.max(0, num(t.manpower) - add);
    a.men += add;
  }
}
export function monthlyMoraleRecovery(ctx) {
  const g = ctx.game;
  const rec = B(ctx, 'moraleRecoveryPerMonth', 0.6);
  // A weary nation's armies mend slowly (SPEC §21 extended): war exhaustion
  // drags recovery toward weMoraleFloor — the long war finally degrades the
  // field host instead of resetting it every month.
  const floor = BAL(ctx, 'weMoraleFloor', 0.4);
  const weAt = Math.max(1, BAL(ctx, 'weMoraleAt', 40));
  const SUP = ctx.DEFINES.SUPPLY || {};
  for (const id of Object.keys(g.armies)) {
    const a = g.armies[id];
    if (!a) continue;
    a.maxMorale = maxMoraleOf(ctx, a.tag);
    const t = g.tags[a.tag];
    let weMult = Math.max(floor, 1 - num(t && t.warExhaustion) / weAt);
    // Out of supply (SPEC §82): hungry men rally at a crawl, and a host
    // isolated past the breaking point cannot hold above half its spirit.
    const oos = num(a.oosMonths) > 0;
    if (oos) weMult *= num(SUP.moraleRecoveryMult, 0.25);
    if (!a.inBattle) a.morale = Math.min(a.maxMorale, num(a.morale) + rec * weMult);
    if (num(a.oosMonths) >= num(SUP.weakenAtMonths, 3)) {
      a.morale = Math.min(num(a.morale), a.maxMorale * num(SUP.weakMoraleCap, 0.5));
    }
    a.morale = clamp(num(a.morale), 0, a.maxMorale);
  }
}
export function monthlyAttrition(ctx) {
  const g = ctx.game;
  const regsByProv = new Map();
  for (const id of Object.keys(g.armies)) {
    const a = g.armies[id];
    if (a) regsByProv.set(a.prov, (regsByProv.get(a.prov) || 0) + regCount(a));
  }
  const slBase = B(ctx, 'supportLimitBase', 8);
  const slDev = B(ctx, 'supportLimitPerDev', 0.8);
  for (const id of Object.keys(g.armies)) {
    const a = g.armies[id];
    if (!a) continue;
    const p = ctx.byId(a.prov);
    if (!p) continue;
    const terr = ctx.DEFINES.TERRAINS ? ctx.DEFINES.TERRAINS[p.terrain] : null;
    let attr = terr ? num(terr.attrition, 0) : 0;
    const granary = buildingWorks(p, 'granary'); // +3 support limit, -1 attrition
    const limit = slBase + devTotal(p) * slDev + (granary ? 3 : 0);
    attr += Math.min(6, Math.max(0, (regsByProv.get(a.prov) || 0) - limit));
    if (isHostile(ctx, a.tag, p.controller)) attr += 1;
    if (granary) attr -= 1;
    // Under hostile air (SPEC §154): a host IN THE FIELD, on ground its own
    // side does not hold, bleeds every month whether or not anyone gives
    // battle. That is what an air force which is never fought is for.
    //
    // The scope is the same lesson as interdiction above: applied to every
    // army everywhere, this was a permanent tax on garrisons sitting at home
    // in their own country, and it quietly rewrote fifty years of the 1948
    // chapter. An army in its own supplied territory is not a column in the
    // open.
    if (isHostile(ctx, a.tag, p.controller) || !sameSide(ctx, a.tag, p.controller)) {
      const airAgainst = -airNetAgainst(ctx, a.prov, a.tag);
      const attrAt = AIRC(ctx, 'attritionAt', 2);
      if (airAgainst >= attrAt) attr += Math.min(3, 1 + (airAgainst - attrAt));
    }
    attr = clamp(attr, 0, 12);
    // Supply lines: an organized siege camp caps attrition (Rome fed Masada's
    // besiegers by road and ramp; so do we) — but only while the road and
    // ramp themselves are supplied (SPEC §82): a cut-off camp starves like
    // any other host, and the longer the isolation the faster it melts.
    const SUP = ctx.DEFINES.SUPPLY || {};
    const oosMonths = num(a.oosMonths) | 0;
    if (oosMonths <= 0 && p.siege && (p.siege.by === a.tag || sameSide(ctx, a.tag, p.siege.by))) attr = Math.min(attr, 5);
    if (oosMonths > 0) {
      attr += num(SUP.attritionBase, 2)
        + Math.min(num(SUP.attritionRampCap, 6), (oosMonths - 1) * num(SUP.attritionPerMonth, 1));
      attr = clamp(attr, 0, 15);
    } else {
      // SPEC §117: the line holds, but it is long. Every province past the
      // comfortable reach is another day's haul for the wagons and another
      // day's forage taken off land that has already been foraged.
      const over = num(a.supplyReach) - num(SUP.reachComfort, 7);
      if (over > 0) {
        attr += Math.min(num(SUP.reachCap, 7), over * num(SUP.reachAttrition, 0.7));
        attr = clamp(attr, 0, 15);
      }
    }
    if (a.tag === 'REB' && a.men < 100) { removeArmy(ctx, a.id); continue; } // starving bands scatter
    if (attr <= 0) continue;
    const loss = Math.floor(a.men * attr / 100);
    if (loss <= 0) continue;
    a.men = Math.max(0, a.men - loss);
    if (a.men <= 0) {
      if (a.tag === g.playerTag) {
        ctx.bus.emit('notify', { title: 'Army lost', text: a.name + ' has melted away to attrition.', type: 'bad' });
      }
      removeArmy(ctx, a.id);
    }
  }
}
export function monthlyGarrisons(ctx) {
  const g = ctx.game;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.siege || !(p.maxGarrison > 0)) continue;
    if (p.garrison < p.maxGarrison) {
      p.garrison = Math.min(p.maxGarrison, Math.round(p.garrison + Math.max(10, p.maxGarrison * 0.05)));
    }
  }
}
export function updateTagLife(ctx) {
  const g = ctx.game;
  const owned = {};
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable) owned[p.owner] = (owned[p.owner] || 0) + 1;
  }
  for (const k of Object.keys(g.tags)) {
    if (k === 'REB') continue; // REB always alive
    const t = g.tags[k];
    if (isOffmapTag(ctx, k)) { t.alive = true; continue; } // a seat cannot fall (SPEC §180)
    const was = !!t.alive;
    t.alive = !!(owned[k] || armiesOf(ctx, k).length);
    if (was && !t.alive) {
      chronicle(ctx, 'fall', 'The banners of ' + (t.name || k) + ' are cast down; the nation passes into memory.');
      if (k !== g.playerTag) {
        ctx.bus.emit('notify', { title: 'News from abroad', text: (t.name || k) + ' is no more.', type: 'info' });
      }
    }
  }
  // A dead overlord frees its clients; a dead client is simply struck off.
  for (const k of Object.keys(g.tags)) {
    const t = g.tags[k];
    if (t && t.overlord && (!g.tags[t.overlord] || !g.tags[t.overlord].alive)) t.overlord = null;
  }
  enforceVassalPeace(ctx);
}

// A crown and its client do not go to war while the bond stands (SPEC §149).
//
// `declareWar` has always refused to OPEN such a war, and that is the only
// place the rule was enforced — so it held in one direction and not the other.
// A war is a persistent list of belligerents; the bond can be made afterwards,
// by the peace table's subjugation clause, by a scripted overlord, or by an AI
// restoring a client whose independence declaration failed. Nothing went back
// and looked at the wars already running, so a court could be your client on
// Tuesday and marching against you in a coalition on Wednesday, tribute still
// flowing the other way.
//
// The yoke IS the settlement of that quarrel, which is what the declareWar
// guard says in its own comment. So the client leaves the war rather than the
// war being cancelled: everyone else on both sides fights on, and if the client
// was the last court on its side the war dissolves for want of an enemy.
export function enforceVassalPeace(ctx) {
  const g = ctx.game;
  if (!Array.isArray(g.wars) || !g.wars.length) return;
  for (const war of g.wars.slice()) {
    if (!war) continue;
    for (const side of [war.attackers, war.defenders]) {
      const foes = side === war.attackers ? war.defenders : war.attackers;
      for (const tag of side.slice()) {
        const t = g.tags[tag];
        const lord = t && t.overlord;
        if (!lord || foes.indexOf(lord) < 0) continue;
        // Its own clients came in under its banner and go home with it.
        const party = [tag].concat(vassalsOf(ctx, tag).filter((v) => side.indexOf(v) >= 0));
        for (const leaver of party) {
          const at = side.indexOf(leaver);
          if (at >= 0) side.splice(at, 1);
          if (war.warscore) delete war.warscore[leaver];
          // Status quo on the fronts between the client and its lord's side.
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (!p || p.impassable || p.controller === p.owner) continue;
            const held = (p.owner === leaver && foes.indexOf(p.controller) >= 0)
              || (p.controller === leaver && foes.indexOf(p.owner) >= 0);
            if (held && g.tags[p.owner] && g.tags[p.owner].alive) changeControllerCore(ctx, p, p.owner);
          }
          chronicle(ctx, 'peace', (g.tags[leaver] ? g.tags[leaver].name : leaver)
            + ' cannot take the field against ' + (g.tags[lord] ? g.tags[lord].name : lord)
            + ', to whom it now bends the knee, and leaves ' + (war.name || 'the war') + '.');
        }
        liftSiegesBetween(ctx, party, foes);
        rebuildAtWarWith(ctx);
        marchStrandedHome(ctx, party.concat(foes));
        ctx.bus.emit('war', { id: war.id, name: war.name, left: tag });
      }
    }
    // A side emptied by the bond has no war left to fight.
    if (!war.attackers.length || !war.defenders.length) dissolveWar(ctx, war);
  }
}

// The only true game-over: the player's nation has ceased to exist — no
// provinces under its banner and no army in the field. Runs monthly, fires
// once (the flag survives "continue observing").
export function checkElimination(ctx) {
  const g = ctx.game;
  if (g.over || (g.flags && g.flags._eliminated)) return;
  const t = g.tags[g.playerTag];
  if (!t || t.alive !== false) return;
  if (!g.flags) g.flags = {};
  g.flags._eliminated = true;
  g.result = 'loss';
  g.over = true;
  g.paused = true;
  for (const w of g.wars.slice()) {
    const onAtt = w.attackers.indexOf(g.playerTag) >= 0;
    if (!onAtt && w.defenders.indexOf(g.playerTag) < 0) continue;
    endWarBySword(ctx, w, onAtt ? 'def' : 'att', { silent: true });
  }
  ctx.bus.emit('pause', true);
  ctx.bus.emit('gameover', {
    result: 'loss',
    title: 'The Nation Extinguished',
    text: 'Every province is lost and no army remains under our banners. The story of '
      + ((t && t.name) || 'the realm') + ' passes into memory.',
    score: 0,
  });
}

// ---------------------------------------------------------------- recruiting & merging
export function recruitRegiment(ctx, tag, provId, type) {
  const g = ctx.game;
  const t = g.tags[tag];
  const p = ctx.byId(provId);
  if (!t || !p) return { ok: false, why: 'invalid province or tag' };
  if (ARMS.indexOf(type) < 0) return { ok: false, why: 'unknown unit type' };
  const costs = (ctx.DEFINES.BASE && ctx.DEFINES.BASE.regCost) || {};
  // Armor (SPEC §181): the mounted arm at pattern 5+ is tanks — priced like
  // them, fitted slower than a horse squadron, and importable only. In a
  // chapter with an arms market a client raises it through a live weapons
  // transfer agreement or not at all.
  const AR = ctx.DEFINES.ARMOR || {};
  const armor = type === 'cav' && tagGen(ctx, tag) >= num(AR.minGen, 5);
  if (armor) {
    const shut = armsGate(ctx, tag);
    if (shut) return { ok: false, why: shut };
  }
  const dfltCost = type === 'cav' ? 25 : type === 'art' ? 18 : 10;
  const cost = armor ? num(AR.cost, 50) : num(costs[type], dfltCost);
  const regSize = B(ctx, 'regSize', 1000);
  if (num(t.treasury) <= -100) return { ok: false, why: 'the treasury is exhausted' };
  if (num(t.manpower) < regSize) return { ok: false, why: 'not enough manpower' };
  t.treasury = num(t.treasury) - cost;
  t.manpower = num(t.manpower) - regSize;
  const queued = queueUnitRecruitment(ctx, tag, provId, type, {
    cost, manpower: regSize, gen: tagGen(ctx, tag),
    months: armor ? num(AR.months, 4) : undefined,
  });
  return queued ? { ok: true, queued } : { ok: false, why: 'the regiment could not be scheduled' };
}
// Detach floor(half) the regiments (mix kept proportional) with a matching
// share of men into a fresh, general-less army in the same province. The
// detachment is a perfectly ordinary army — the AI merge pass, battles and
// attrition treat it like any other. Returns the new army id, or 0.
export function splitArmyCore(ctx, army) {
  const g = ctx.game;
  if (!army || !g.armies[army.id]) return 0;
  const R = regCount(army);
  if (R < 2) return 0;
  const newRegs = Math.floor(R / 2);
  // The detachment takes half of each arm (SPEC §191), largest-remainder so
  // the three shares sum to exactly newRegs and neither half ever goes
  // negative — a two-regiment army of one gun and one horse splits into one
  // of each, not into two of something.
  const have = { inf: num(army.regiments.inf), cav: num(army.regiments.cav), art: num(army.regiments.art) };
  const take = {};
  let assigned = 0;
  for (const arm of ARMS) {
    take[arm] = Math.min(have[arm], Math.floor(have[arm] * newRegs / R));
    assigned += take[arm];
  }
  // hand out what rounding left over, biggest remaining arm first
  const rest = ARMS.slice().sort((x, y) => (have[y] - take[y]) - (have[x] - take[x]));
  for (const arm of rest) {
    if (assigned >= newRegs) break;
    const room = Math.min(have[arm] - take[arm], newRegs - assigned);
    take[arm] += room;
    assigned += room;
  }
  const newMen = Math.floor(num(army.men) * newRegs / R);
  if (newMen < 1) return 0; // too hollowed out to divide
  const newInf = take.inf, newCav = take.cav, newArt = take.art;
  army.regiments.inf = have.inf - newInf;
  army.regiments.cav = have.cav - newCav;
  army.regiments.art = have.art - newArt;
  army.men = Math.max(0, num(army.men) - newMen);
  const id = g.nextArmyId++;
  const det = {
    id, tag: army.tag,
    name: (army.name || 'Army') + ' — Detachment',
    prov: army.prov, path: [], moveDaysLeft: 0,
    regiments: { inf: newInf, cav: newCav, art: newArt },
    men: newMen,
    morale: num(army.morale), maxMorale: num(army.maxMorale, 3),
    general: null,
    gen: num(army.gen, 0), // the detachment marches in its parent's pattern
    inBattle: false, retreating: false,
  };
  g.armies[id] = det;
  engageIfNeeded(ctx, det);
  return id;
}

// ---------------------------------------------------------------- modernization (SPEC §22)
// Re-equip an army to the nation's newest unlocked pattern. Gold per regiment
// per generation crossed; refused mid-battle and mid-rout.
export function modernizeInfo(ctx, army) {
  const t = army ? ctx.game.tags[army.tag] : null;
  const unlocked = army ? tagGen(ctx, army.tag) : 0;
  const cur = num(army && army.gen, 0);
  const gap = Math.max(0, unlocked - cur);
  const cost = army ? regCount(army) * MODERNIZE_COST_PER_REG_PER_GEN * gap : 0;
  let why = '';
  if (!gap) why = 'Already at the newest pattern';
  else if (army.inBattle || army.retreating) why = 'Not in the middle of a fight';
  else if (!t || num(t.treasury) < cost) why = 'Needs ' + cost + ' talents';
  return { unlocked, cur, gap, cost, can: !why, why };
}
export function modernizeArmyCore(ctx, army) {
  const info = modernizeInfo(ctx, army);
  if (!info.can) return { ok: false, why: info.why };
  const t = ctx.game.tags[army.tag];
  t.treasury = num(t.treasury) - info.cost;
  army.gen = info.unlocked;
  return { ok: true, cost: info.cost };
}
export function mergeInto(ctx, fromId, intoId) {
  const g = ctx.game;
  const f = g.armies[fromId];
  const into = g.armies[intoId];
  if (!f || !into || f === into) return false;
  if (f.tag !== into.tag || f.prov !== into.prov) return false;
  if (f.inBattle || into.inBattle || f.retreating || into.retreating) return false;
  const totalMen = f.men + into.men;
  into.morale = totalMen > 0 ? (num(f.morale) * f.men + num(into.morale) * into.men) / totalMen : into.morale;
  // Mixed patterns blend by weight of men — merging levies into legions dilutes them.
  into.gen = totalMen > 0 ? Math.round((num(f.gen, 0) * f.men + num(into.gen, 0) * into.men) / totalMen) : num(into.gen, 0);
  for (const arm of ARMS) into.regiments[arm] = num(into.regiments[arm]) + num(f.regiments[arm]);
  into.men = totalMen;
  if (!into.general && f.general) into.general = f.general;
  removeArmy(ctx, fromId);
  return true;
}

// ---------------------------------------------------------------- forming nations (SPEC §22)
// The whole realm changes its name: every reference to the old tag — provinces,
// armies, fleets, wars and their scores, other courts' opinions and alliances,
// truces, cooldowns, the player's own chair — is rewritten to the new one. The
// new tag inherits the old tag's entire runtime state (treasury, tech, reforms,
// ruler, modifiers...) but takes the new banner's name and color; the caller
// rebuilds t.ideas afterwards (applyReformsToTag) so the new static national
// ideas replace the old.
export function switchTagCore(ctx, from, to) {
  const g = ctx.game;
  const old = g.tags[from];
  const def = (ctx.DEFINES.TAGS || {})[to];
  if (!old || !def || g.tags[to]) return false; // the target banner must be free
  const nt = JSON.parse(JSON.stringify(old));
  nt.tag = to;
  // The crown is new; the country is not (SPEC §102). A formed nation
  // remembers the tags it was, so the era's content addressed to its
  // predecessor — the estates that convene, the objectives the age sets, the
  // pen it writes with — keeps answering to it.
  nt.lineage = [from].concat(Array.isArray(old.lineage) ? old.lineage : []).slice(0, 6);
  nt.formedFrom = from;
  nt.name = def.name || to;
  nt.color = Array.isArray(def.color) ? def.color.slice() : nt.color;
  delete nt.flag; // a variant banner dies with the old identity — the new tag flies its own
  // The new crown brings its constitution (SPEC §25): a proclaimed republic
  // votes, a proclaimed kingdom crowns — and whatever the new banner's
  // constitution says about inheriting (SPEC §212) is applied here rather than
  // left over from the old one, so a realm that formed out of a government
  // with no heirs does not carry a stale one into a crown.
  const gov = (ctx.DEFINES.GOV_OF || {})[to];
  if (gov && gov !== nt.govType) {
    nt.govType = gov;
    nt.electionIn = 48;
    if (((ctx.DEFINES.GOV_TYPES || {})[gov] || {}).heirless) { nt.heir = null; nt.regency = false; }
  }
  g.tags[to] = nt;
  delete g.tags[from];
  // The forwarding address (SPEC §135). `lineage` above lets the survivor say
  // what it used to be; this lets the chapter's cards find it under the name
  // they were written with. Chains are collapsed as they form — a HYR that
  // became HAS and then MLI forwards straight to MLI, so the lookup never
  // walks — and a banner revived by later content clears its own entry,
  // because a tag that exists answers for itself.
  if (!g.tagAliases || typeof g.tagAliases !== 'object') g.tagAliases = {};
  g.tagAliases[from] = to;
  for (const k of Object.keys(g.tagAliases)) {
    if (g.tagAliases[k] === from) g.tagAliases[k] = to;
  }
  delete g.tagAliases[to];

  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p) continue;
    if (p.owner === from) p.owner = to;
    if (p.controller === from) p.controller = to;
    if (p.siege && p.siege.by === from) p.siege.by = to;
    if (p.conversion && p.conversion.by === from) p.conversion.by = to;
  }
  for (const id of Object.keys(g.armies)) {
    const a = g.armies[id];
    if (a && a.tag === from) a.tag = to;
  }
  for (const id of Object.keys(g.fleets || {})) {
    const f = g.fleets[id];
    if (f && f.tag === from) f.tag = to;
  }
  for (const id of Object.keys(g.airwings || {})) {
    const w = g.airwings[id];
    if (w && w.tag === from) w.tag = to;
  }
  for (const w of g.wars || []) {
    for (const side of [w.attackers, w.defenders]) {
      if (!Array.isArray(side)) continue;
      const at = side.indexOf(from);
      if (at >= 0) side[at] = to;
    }
    if (w.warscore && typeof w.warscore[from] === 'number') {
      w.warscore[to] = w.warscore[from];
      delete w.warscore[from];
    }
    if (w.goal) {
      if (w.goal.attacker === from) w.goal.attacker = to;
      if (w.goal.defender === from) w.goal.defender = to;
      if (w.goal.targetTag === from) w.goal.targetTag = to;
    }
  }
  for (const k of Object.keys(g.tags)) {
    const t = g.tags[k];
    if (!t) continue;
    if (Array.isArray(t.atWarWith)) t.atWarWith = t.atWarWith.map((x) => (x === from ? to : x));
    if (Array.isArray(t.allies)) t.allies = t.allies.map((x) => (x === from ? to : x));
    if (Array.isArray(t.guarantees)) t.guarantees = t.guarantees.map((x) => (x === from ? to : x));
    if (t.overlord === from) t.overlord = to;
    if (t.opinion && t.opinion[from] !== undefined) {
      t.opinion[to] = t.opinion[from];
      delete t.opinion[from];
    }
    // Grudge books follow the new name on both sides (SPEC §67): a renamed
    // conqueror is still sitting on the same land.
    if (t.grudges && t.grudges[from] !== undefined) {
      t.grudges[to] = t.grudges[from];
      delete t.grudges[from];
    }
  }
  for (const s of g.subsidies || []) {
    if (!s) continue;
    if (s.from === from) s.from = to;
    if (s.to === from) s.to = to;
  }
  // Truce and cooldown books are keyed by tag pair — rewrite entries that name us.
  const rekey = (book, sep, sorted) => {
    if (!book) return;
    for (const key of Object.keys(book)) {
      const parts = key.split(sep);
      if (parts.indexOf(from) < 0) continue;
      const next = parts.map((x) => (x === from ? to : x));
      const nk = sorted ? next.slice().sort().join(sep) : next.join(sep);
      book[nk] = book[key];
      delete book[key];
    }
  };
  rekey(g.truces, '|', true);
  rekey(g.diploCooldowns, ':', false);

  if (g.playerTag === from) g.playerTag = to;
  if (Array.isArray(g.humanTags)) g.humanTags = g.humanTags.map((x) => (x === from ? to : x));
  chronicle(ctx, 'era', (old.name || from) + ' is no more: the banners of ' + (nt.name || to) + ' rise over its cities.');
  return true;
}

// A union that comes apart (SPEC §105). `switchTagCore` renames a state; this
// SPLITS one — the parent survives, and a named set of its provinces leaves
// under a banner of its own with the garrisons standing on them, a share of
// the treasury and the muster rolls, and none of the parent's wars. It is the
// operation the map has never had: every political change in the game so far
// has been a conquest, a rename or a peace-table release, and none of those
// is what happened in Damascus on the 28th of September 1961, when a brigade
// took the radio station and a republic simply stopped being half of another
// one.
//
//   opts: { provinces: [names], share: 0.35, name, flag, color, ruler,
//           opinion: -40, stability, legitimacy }
//
// Returns the new tag object, or null if the split could not be made (no
// ground to stand on, the banner already flying, no such tag defined).
export function secedeTagCore(ctx, from, to, opts = {}) {
  const g = ctx.game;
  const parent = g.tags[from];
  const def = (ctx.DEFINES.TAGS || {})[to];
  if (!parent || parent.alive === false || !def || g.tags[to]) return null;

  // The ground. A secession with no province behind it is a proclamation, and
  // the map does not model proclamations.
  const ids = [];
  for (const name of (Array.isArray(opts.provinces) ? opts.provinces : [])) {
    const p = ctx.prov(name);
    if (p && p.owner === from && !p.impassable) ids.push(p.id);
  }
  if (!ids.length) return null;
  const idSet = new Set(ids);
  const seat = ctx.byId(ids[0]);

  const share = clamp(num(opts.share, 0.35), 0, 1);
  const tech = parent.tech || {};
  const t = {
    tag: to,
    name: opts.name || def.name || to,
    color: Array.isArray(opts.color) ? opts.color.slice()
      : Array.isArray(def.color) ? def.color.slice() : [112, 118, 126],
    religion: def.religion || (seat && seat.religion) || parent.religion,
    culture: def.culture || (seat && seat.culture) || parent.culture,
    alive: true,
    ai: to !== g.playerTag,
    // What leaves with it: a share of the coin and the muster rolls, and the
    // whole of the institutional inheritance — the parent's technology and
    // reforms were half its own to begin with.
    treasury: Math.round(num(parent.treasury) * share),
    income: 0, expenses: 0, loans: 0,
    manpower: Math.round(num(parent.manpower) * share),
    maxManpower: Math.round(num(parent.maxManpower) * share),
    stability: clamp(num(opts.stability, 0), -3, 3),
    legitimacy: clamp(num(opts.legitimacy, 50), 0, 100),
    warExhaustion: 0,
    points: { gov: 0, infl: 0, mar: 0 },
    ideas: { ...(def.ideas || {}) },
    reforms: { ...(parent.reforms || { mil: 0, civ: 0, rel: 0 }) },
    eraIdeas: { ...(parent.eraIdeas || {}) },
    tech: {
      gov: Math.max(0, num(tech.gov, num(ctx.bookmark && ctx.bookmark.techBase, 3)) | 0),
      infl: Math.max(0, num(tech.infl, num(ctx.bookmark && ctx.bookmark.techBase, 3)) | 0),
      mar: Math.max(0, num(tech.mar, num(ctx.bookmark && ctx.bookmark.techBase, 3)) | 0),
    },
    advisors: { gov: null, infl: null, mar: null },
    aggression: 0,
    courtCand: {},
    modifiers: [],
    // A seceding state inherits no wars. The union's quarrels were the
    // union's; walking out of it is the whole point.
    atWarWith: [], allies: [], guarantees: [], opinion: {},
    govType: (ctx.bookmark && ctx.bookmark.govTypes && ctx.bookmark.govTypes[to])
      || (ctx.DEFINES.GOV_OF || {})[to]
      || parent.govType || 'republic',
    electionIn: 48,
    claims: [], claimFabrications: [], overlord: null,
    heir: null, regency: false, missionIdx: 0,
    aiState: {},
    ruler: opts.ruler
      ? { ...opts.ruler }
      : { name: 'Revolutionary Command', title: 'Council', gov: 2, infl: 2, mar: 2, age: 50 },
    lineage: [from].concat(Array.isArray(parent.lineage) ? parent.lineage : []).slice(0, 6),
    formedFrom: from,
    description: def.description || 'A state that left a union it had joined.',
  };
  if (typeof opts.flag === 'string') t.flag = opts.flag;
  g.tags[to] = t;

  parent.treasury = num(parent.treasury) - t.treasury;
  parent.manpower = Math.max(0, num(parent.manpower) - t.manpower);
  parent.maxManpower = Math.max(0, num(parent.maxManpower) - t.maxManpower);

  for (const id of ids) {
    const p = g.provinces[id];
    if (!p) continue;
    p.owner = to;
    if (p.controller === from) p.controller = to;
    if (p.siege && p.siege.by === from) p.siege.by = to;
    if (p.conversion && p.conversion.by === from) p.conversion = null;
    if (p.integrating && p.integrating.by === from) p.integrating = null;
  }
  // The garrisons go with the ground they are standing on — and only those.
  // A division in Cairo stays Egyptian however Syrian its recruits were.
  for (const id of Object.keys(g.armies)) {
    const a = g.armies[id];
    if (a && a.tag === from && idSet.has(a.prov)) a.tag = to;
  }
  for (const id of Object.keys(g.fleets || {})) {
    const f = g.fleets[id];
    if (f && f.tag === from && idSet.has(f.prov)) f.tag = to;
  }
  for (const id of Object.keys(g.airwings || {})) {
    const w = g.airwings[id];
    if (w && w.tag === from && idSet.has(w.prov)) w.tag = to;
  }

  // How the world meets it. Everyone else's regard for the parent is the
  // starting regard for the child — it is the same country to them — and the
  // two halves of a broken union think about each other for a long time.
  const meet = clamp(num(opts.opinion, -40), -200, 200);
  for (const k of Object.keys(g.tags)) {
    const o = g.tags[k];
    if (!o || k === to) continue;
    if (k !== from && o.opinion && Number.isFinite(o.opinion[from])) o.opinion[to] = o.opinion[from];
    if (k !== from) t.opinion[k] = Number.isFinite(parent.opinion && parent.opinion[k]) ? parent.opinion[k] : 0;
  }
  if (!parent.opinion) parent.opinion = {};
  parent.opinion[to] = meet;
  t.opinion[from] = meet;

  chronicle(ctx, 'era', (t.name || to) + ' leaves ' + (parent.name || from)
    + ': the union is dissolved and both halves keep their own capital.');
  return t;
}

// ---------------------------------------------------------------- generals
// Period name pools keyed by DEFINES.CULTURES group (a hired general speaks
// the recruiting court's tongue). ~8 names per group.
export const GENERAL_NAMES = {
  israelite: ['Eleazar ben Yair', 'Simon ben Cathlas', 'Yohanan ben Levi', 'Judah ben Ari', 'Niger of Perea', 'Silas the Babylonian', 'Joseph ben Simon', 'Jesus ben Sapphias'],
  hellenic:  ['Nikanor', 'Apollonios', 'Demetrios', 'Lysias', 'Antigonos', 'Philon', 'Kallistratos', 'Herakleides'],
  latin:     ['Sextus Vettulenus', 'Aulus Larcius', 'Marcus Ulpius', 'Gaius Cetronius', 'Lucius Annius', 'Quintus Petillius', 'Titus Frigius', 'Gnaeus Pompeius Collega'],
  iranian:   ['Vologases', 'Pacorus', 'Mithridates', 'Artabanus', 'Phraates', 'Gotarzes', 'Sanatruces', 'Osroes'],
  arab:      ['Malichus', 'Obodas', 'Aretas', 'Rabbel', 'Syllaeus', 'Wahballat', 'Hareth', 'Amru'],
  syrian:    ['Sohaemus', 'Azizus', 'Sampsiceramus', 'Abgar', 'Mannus', 'Iamblichus', 'Monimus', 'Bargates'],
  egyptian:  ['Petosiris', 'Ammonios', 'Harpocras', 'Chaeremon', 'Apion', 'Onnophris', 'Psammis', 'Nechutes'],
  armenian:  ['Tiridates', 'Artavasdes', 'Tigranes', 'Sanatruk', 'Mithrobarzanes', 'Vardanes', 'Zariadres', 'Orontes'],
  // far eras (SPEC §22)
  israeli:   ['Yigael Yadin', 'Yitzhak Sadeh', 'Yigal Allon', 'Moshe Carmel', 'Shimon Avidan', 'David Shaltiel', 'Mickey Marcus', 'Yitzhak Rabin'],
  arab_modern: ['Abdullah el-Tell', 'Habis Majali', 'Fawzi al-Qawuqji', 'Ahmed Ali al-Mwawi', 'Taha al-Hashimi', 'Ismail Safwat', 'Muhammad Naguib', 'Sami al-Hinnawi'],
  turkish:   ['Kâzım Orbay', 'Salih Omurtak', 'Nuri Yamut', 'Abdurrahman Nafiz Gürman', 'Şükrü Kanatlı', 'Muzaffer Tuğsavul', 'İzzet Aksalur', 'Asım Tınaztepe'],
  // …and the four courts of 1948 that had no modern pool at all (SPEC §143),
  // so a death in Rome seated Quintus Petillius and a death in Athens seated
  // Antigonos. Same standard as the three above: men who actually held these
  // commands in the years the chapter runs.
  italian:   ['Giovanni Messe', 'Efisio Marras', 'Claudio Trezzani', 'Raffaele Cadorna', 'Paolo Berardi', 'Umberto Utili', 'Taddeo Orlando', 'Giuseppe Castellano'],
  greek_modern: ['Alexandros Papagos', 'Thrasyvoulos Tsakalotos', 'Konstantinos Ventiris', 'Solon Ghikas', 'Stylianos Kitrilakis', 'Dimitrios Giantzis', 'Georgios Grivas', 'Napoleon Zervas'],
  british:   ['Bernard Montgomery', 'William Slim', 'John Crocker', 'Miles Dempsey', 'Gordon MacMillan', 'Evelyn Barker', 'Alan Cunningham', 'Hugh Stockwell'],
  iranian_modern: ['Ali Razmara', 'Fazlollah Zahedi', 'Hassan Arfa', 'Ahmad Amir-Ahmadi', 'Morteza Yazdanpanah', 'Nader Batmanghelich', 'Abdollah Hedayat', 'Mohammad Daftari'],
  // -- the political west (SPEC §173): the courts of the §160 ground. --
  // Ancient pools by culture group, attested men only (Polybius, Caesar,
  // Livy, Tacitus, Appian); the late-antique and 1948 pools are per-court
  // `names` keys, same standard as the four §143 added — people who actually
  // held commands or offices in the years their chapters run.
  celtic:    ['Brennus', 'Dumnorix', 'Orgetorix', 'Ambiorix', 'Cingetorix', 'Viridomarus', 'Camulogenus', 'Correus'],
  iberian:   ['Indibilis', 'Mandonius', 'Caros', 'Rhetogenes', 'Avarus', 'Corocotta', 'Istolatius', 'Punicus'],
  punic:     ['Hanno', 'Hasdrubal', 'Mago', 'Bomilcar', 'Himilco', 'Carthalo', 'Gisgo', 'Maharbal'],
  libyan:    ['Gulussa', 'Mastanabal', 'Adherbal', 'Gauda', 'Bocchar', 'Tacfarinas', 'Firmus', 'Iabdas'],
  germanic:  ['Arminius', 'Segestes', 'Inguiomerus', 'Maroboduus', 'Catualda', 'Vannius', 'Segimerus', 'Chariovalda'],
  thracian:  ['Sitalces', 'Cotys', 'Rhescuporis', 'Seuthes', 'Amadocus', 'Teres', 'Rhoemetalces', 'Dromichaetes'],
  illyrian:  ['Agron', 'Genthius', 'Bato', 'Pinnes', 'Scerdilaidas', 'Epulon', 'Plator', 'Ballaios'],
  scythian:  ['Scilurus', 'Palacus', 'Saumacus', 'Spadines', 'Farzoios', 'Inismeus', 'Susagus', 'Rasparaganus'],
  gothic:    ['Totila', 'Witigis', 'Teia', 'Gelimer', 'Tzazon', 'Sisenand', 'Suinthila', 'Wamba'],
  frankish:  ['Theudebert', 'Chlothar', 'Childebert', 'Sigibert', 'Mummolus', 'Butilinus', 'Chramn', 'Guntram'],
  saxon:     ['Penda', 'Edwin', 'Raedwald', 'Cerdic', 'Cynric', 'Ceawlin', 'Ida', 'Hengest'],
  gaelic:    ['Niall', 'Conall', 'Domnall', 'Aed', 'Fergus', 'Cathal', 'Diarmait', 'Congal'],
  slavic:    ['Ardagastus', 'Peiragastus', 'Musokios', 'Dauritas', 'Samo', 'Mezamir', 'Chatzon', 'Perbundos'],
  turkic:    ['Bayan', 'Tardu', 'Istami', 'Ziebel', 'Kubrat', 'Organa', 'Sandilch', 'Zabergan'],
  // -- the political east and south (SPEC §205): same standard again. The
  // ancient pools are attested rulers — Meroitic kings and kandakes from the
  // royal chronology, Nubian kings from the Silko inscription to the baqt,
  // Aksumite negusts from the coinage and the Periplus, Sayhadic mukarribs
  // from the Marib inscriptions, Saka/Indo-Parthian kings from their coins.
  kushite:   ['Teriteqas', 'Amanirenas', 'Amanishakheto', 'Natakamani', 'Amanitore', 'Shorkaror', 'Amanikhabale', 'Teqorideamani'],
  nubian:    ['Silko', 'Aburni', 'Eirpanome', 'Tokiltoeton', 'Qalidurut', 'Merkurios', 'Zacharias', 'Kyriakos'],
  aksumite:  ['Zoscales', 'Gadarat', 'Adhebah', 'Sembrouthes', 'Endubis', 'Aphilas', 'Ousanas', 'Kaleb'],
  south_arabian: ['Karibil Watar', 'Yada il Bayyin', 'Dhamar Ali', 'Ilsharah Yahdib', 'Nasha Karib', 'Alhan Nahfan', 'Shammar Yuharish', 'Yasir Yuhanim'],
  saka:      ['Maues', 'Azes', 'Azilises', 'Spalirises', 'Vonones', 'Spalahores', 'Gondophares', 'Abdagases'],
  ethiopian_modern: ['Abebe Aregai', 'Mulugeta Bulli', 'Kebbede Guebret', 'Abiye Abebe', 'Merid Mengesha', 'Assefa Ayene', 'Iyasu Mengesha', 'Aklilu Habte-Wold'],
  afghan_modern: ['Shah Mahmud Khan', 'Shah Wali Khan', 'Mohammed Daoud Khan', 'Sardar Mohammed Naim', 'Asadullah Seraj', 'Mohammed Akbar Khan', 'Abdul Hakim Khan', 'Mir Zaman Khan'],
  pakistani_modern: ['Frank Messervy', 'Douglas Gracey', 'Akbar Khan', 'Ayub Khan', 'Iskander Mirza', 'Muhammad Musa', 'Azam Khan', 'Sher Ali Khan'],
  liberian_modern: ['William Tubman', 'Edwin Barclay', 'Clarence Simpson', 'William Tolbert', 'Gabriel Dennis', 'James Cooper', 'Charles Brewer', 'Momolu Dukuly'],
  omani_modern: ['Tariq bin Taimur', 'Ahmad bin Ibrahim', 'Shihab bin Faisal', 'Fahr bin Taimur', 'Sulaiman bin Himyar', 'Ghalib bin Ali', 'Talib bin Ali', 'Isa bin Salih'],
  french_modern: ['Alphonse Juin', 'Jean de Lattre de Tassigny', 'Marie-Pierre Koenig', 'Antoine Béthouart', 'Joseph de Monsabert', 'Raoul Salan', 'Georges Revers', 'Charles Léchères'],
  spanish_modern: ['José Enrique Varela', 'Juan Yagüe', 'José Moscardó', 'Agustín Muñoz Grandes', 'Carlos Asensio', 'Juan Vigón', 'Fidel Dávila', 'Alfredo Kindelán'],
  portuguese_modern: ['Óscar Carmona', 'Francisco Craveiro Lopes', 'Fernando dos Santos Costa', 'Júlio Botelho Moniz', 'Humberto Delgado', 'Américo Tomás', 'António de Spínola', 'Manuel Gomes de Araújo'],
  dutch_modern: ['Simon Spoor', 'Hendrik Kruls', 'Dirk Buurman van Vreeden', 'Conrad Helfrich', 'Willem Drees', 'Louis Beel', 'Dirk Stikker', 'Hubertus van Mook'],
  danish_modern: ['Ebbe Gørtz', 'Hans Hedtoft', 'Vilhelm Buhl', 'Knud Kristensen', 'Erik Eriksen', 'H.C. Hansen', 'Erik With', 'Viggo Kampmann'],
  swedish_modern: ['Helge Jung', 'Nils Swedlund', 'Bengt Nordenskiöld', 'Tage Erlander', 'Östen Undén', 'Per Edvin Sköld', 'Dag Hammarskjöld', 'Bertil Ohlin'],
  german_modern: ['Konrad Adenauer', 'Kurt Schumacher', 'Theodor Heuss', 'Ludwig Erhard', 'Ernst Reuter', 'Jakob Kaiser', 'Erich Ollenhauer', 'Max Brauer'],
  austrian_modern: ['Karl Renner', 'Leopold Figl', 'Theodor Körner', 'Adolf Schärf', 'Julius Raab', 'Karl Gruber', 'Oskar Helmer', 'Emil Liebitzky'],
  polish_modern: ['Michał Rola-Żymierski', 'Zygmunt Berling', 'Władysław Anders', 'Stanisław Maczek', 'Stanisław Sosabowski', 'Marian Spychalski', 'Stanisław Popławski', 'Bolesław Bierut'],
  czech_modern: ['Ludvík Svoboda', 'Karel Klapálek', 'Bohumil Boček', 'Heliodor Píka', 'Klement Gottwald', 'Antonín Zápotocký', 'Edvard Beneš', 'Jan Masaryk'],
  soviet:    ['Georgy Zhukov', 'Ivan Konev', 'Konstantin Rokossovsky', 'Aleksandr Vasilevsky', 'Rodion Malinovsky', 'Semyon Timoshenko', 'Ivan Bagramyan', 'Vasily Chuikov'],
  hungarian_modern: ['László Sólyom', 'Péter Veres', 'Zoltán Tildy', 'Lajos Dinnyés', 'Mátyás Rákosi', 'Mihály Farkas', 'István Bata', 'Árpád Szakasits'],
  yugoslav_modern: ['Koča Popović', 'Peko Dapčević', 'Arso Jovanović', 'Ivan Gošnjak', 'Aleksandar Ranković', 'Edvard Kardelj', 'Milovan Đilas', 'Svetozar Vukmanović'],
  albanian_modern: ['Mehmet Shehu', 'Beqir Balluku', 'Spiro Moisiu', 'Koçi Xoxe', 'Bedri Spahiu', 'Haxhi Lleshi', 'Omer Nishani', 'Myslim Peza'],
  bulgarian_modern: ['Georgi Damyanov', 'Dobri Terpeshev', 'Vasil Kolarov', 'Vulko Chervenkov', 'Anton Yugov', 'Georgi Dimitrov', 'Petar Panchevski', 'Ivan Mihaylov'],
  romanian_modern: ['Emil Bodnăraș', 'Mihail Lascăr', 'Leontin Sălăjan', 'Constantin Vasiliu-Rășcanu', 'Petru Groza', 'Gheorghe Gheorghiu-Dej', 'Ion Gheorghe Maurer', 'Constantin Pârvulescu'],
  irish_modern: ['Richard Mulcahy', 'Daniel McKenna', 'Seán MacEoin', 'Frank Aiken', 'John A. Costello', 'Seán MacBride', 'Seán Lemass', 'Liam Archer'],
  swiss_modern: ['Henri Guisan', 'Louis de Montmollin', 'Jakob Huber', 'Karl Kobelt', 'Max Petitpierre', 'Enrico Celio', 'Ernst Nobs', 'Philipp Etter'],
};

// Which of those a court draws its people from (SPEC §143). The pool was keyed
// on the culture group alone, and a culture group has no century in it: the
// tag that is Ptolemaic Greece in 167 BCE is the Kingdom of Greece in 1948 and
// the group says `hellenic` for both. So a ruler who died in Rome in 1949 was
// replaced by Marcus Ulpius, and one who died in Tehran by Vologases.
//
// A chapter names the pool through the same lens it names the court with
// (§139), because the answer is per-chapter and not per-culture — GRC is in
// two chapters twenty-one centuries apart and Nikanor is right in one of them.
export function courtNamePool(ctx, tag) {
  const key = tagDef(ctx, tag).names;
  if (key && GENERAL_NAMES[key]) return GENERAL_NAMES[key];
  const t = ctx.game.tags[tag];
  const cul = t && ctx.DEFINES && ctx.DEFINES.CULTURES ? ctx.DEFINES.CULTURES[t.culture] : null;
  return (cul && GENERAL_NAMES[cul.group]) || GENERAL_NAMES.hellenic;
}
function weightedIndex(rng, weights) {
  let total = 0;
  for (const w of weights) total += w;
  let r = rng.next() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}
// Pips weighted toward 1-3: fire/shock 0-4, maneuver 0-5.
// Battle-earned laurels: most traits bump the general's pips permanently at
// the moment of gain (they display through the existing pip readout);
// 'Engineer' is consulted live by tickSieges.
export const GENERAL_TRAITS = [
  { key: 'methodical', name: 'Methodical', desc: '+1 fire', apply: (gen) => { gen.fire = Math.min(6, num(gen.fire) + 1); } },
  { key: 'fearsome', name: 'Fearsome', desc: '+1 shock', apply: (gen) => { gen.shock = Math.min(6, num(gen.shock) + 1); } },
  { key: 'swift', name: 'Swift', desc: '+1 maneuver', apply: (gen) => { gen.maneuver = Math.min(6, num(gen.maneuver) + 1); } },
  { key: 'engineer', name: 'Engineer', desc: '+30% siege progress', apply: () => {} },
  { key: 'veteran', name: 'Old Veteran', desc: '+1 fire and +1 shock', apply: (gen) => { gen.fire = Math.min(6, num(gen.fire) + 1); gen.shock = Math.min(6, num(gen.shock) + 1); } },
];
function maybeGainTrait(ctx, army) {
  const gen = army && army.general;
  if (!gen) return;
  gen.wins = num(gen.wins) + 1;
  if (!Array.isArray(gen.traits)) gen.traits = [];
  if (gen.traits.length >= 2 || gen.wins < 2 || ctx.rng.int(100) >= 35) return;
  const open = GENERAL_TRAITS.filter((tr) => gen.traits.indexOf(tr.key) < 0);
  if (!open.length) return;
  const tr = ctx.rng.pick(open);
  gen.traits.push(tr.key);
  try { tr.apply(gen); } catch (e) { /* stat bump only */ }
  if (army.tag === ctx.game.playerTag) {
    ctx.bus.emit('notify', {
      title: 'A name is made',
      text: gen.name + ' earns the epithet "' + tr.name + '" (' + tr.desc + ').',
      type: 'good',
    });
  }
}

export function rollGeneral(ctx, tag) {
  const pool = courtNamePool(ctx, tag);
  return {
    name: ctx.rng.pick(pool),
    fire: weightedIndex(ctx.rng, [2, 5, 6, 5, 2]),
    shock: weightedIndex(ctx.rng, [2, 5, 6, 5, 2]),
    maneuver: weightedIndex(ctx.rng, [2, 4, 5, 5, 3, 1]),
  };
}

// ---------------------------------------------------------------- wars & warscore
export function truceKey(a, b) { return a < b ? a + '|' + b : b + '|' + a; }
export function truceActive(ctx, a, b) {
  const g = ctx.game;
  const t = g.truces && g.truces[truceKey(a, b)];
  if (!t) return false;
  return g.date.y < t.y || (g.date.y === t.y && g.date.m < t.m);
}
export function vassalsOf(ctx, lord) {
  const g = ctx.game;
  const out = [];
  for (const k of Object.keys(g.tags)) {
    const t = g.tags[k];
    if (t && t.alive && t.overlord === lord) out.push(k);
  }
  return out;
}
// A boolean effect carried by any of the tag's live modifiers (script-set
// flags like noSubjugation ride the ordinary modifier pipe; numeric effects
// go through resolveTagMult and never see these).
export function tagModifierFlag(ctx, tag, key) {
  const t = ctx.game.tags[tag];
  if (!t || !Array.isArray(t.modifiers)) return false;
  return t.modifiers.some((m) => m && m.effects && !!m.effects[key]);
}
// The court that holds a war side's pen (SPEC §61/§74). Nominally the side's
// first living member — but a client crown never outranks its own overlord at
// the table: a war declared ON a vassal lists the vassal first and the lord
// second, and without this promotion the lord was handed the junior's
// withdrawal table for a war fought over its own client's land (the reported
// bug). The loop is bounded in case of a client-of-client chain.
export function sideLeaderOf(ctx, war, side) {
  const g = ctx.game;
  let lead = (side || []).find((t) => g.tags[t] && g.tags[t].alive) || null;
  for (let hops = 0; lead && hops < 4; hops++) {
    const lordTag = g.tags[lead] && g.tags[lead].overlord;
    if (!lordTag || side.indexOf(lordTag) < 0) break;
    const lord = g.tags[lordTag];
    if (!lord || !lord.alive) break;
    lead = lordTag;
  }
  return lead;
}

// ---------------------------------------------------------------- the vassal loop (SPEC §61)
// A client that has come to nearly LOVE its overlord (opinion >= 80) can be
// INCORPORATED — but the weaving of two realms is slow and dear: a heavy
// influence price to begin, then a year and more of patient union that
// collapses if war comes or their affection falters. The world remembers the
// absorption at half a conquest's infamy. Subjugation leaves a court at −40
// opinion, so the road from client to province runs through years of gifts
// and good faith — and then more years still.
export function incorporateInfo(ctx, tag, vassalTag) {
  const g = ctx.game;
  const V = ctx.DEFINES.VASSALS || {};
  const me = g.tags[tag];
  const them = g.tags[vassalTag];
  const out = { can: false, why: '', cost: 0, dev: 0, months: 0, opinion: 0, needOpinion: num(V.incorporateOpinion, 80), inProgress: 0 };
  if (!me || !them || !them.alive) { out.why = 'No such court.'; return out; }
  if (them.overlord !== tag) { out.why = 'They are not our client kingdom.'; return out; }
  let dev = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.owner === vassalTag) dev += devTotal(p);
  }
  out.dev = dev;
  out.cost = Math.round(num(V.incorporateBase, 75) + dev * num(V.incorporatePerDev, 2.5));
  out.months = Math.max(1, Math.round(num(V.incorporateMonthsBase, 12) + dev * num(V.incorporateMonthsPerDev, 0.5)));
  out.opinion = Math.round(opinionOf(ctx, vassalTag, tag));
  if (them.incorporating && them.incorporating.by === tag) {
    out.inProgress = them.incorporating.monthsLeft | 0;
    out.suspended = !!them.incorporating.suspended;
    out.why = out.suspended
      ? 'The weaving is halted by the war — the ' + out.inProgress + ' month'
        + (out.inProgress === 1 ? '' : 's') + ' still to run are held where they are, and '
        + 'the clock starts again at peace.'
      : 'The union is already being woven — ' + out.inProgress + ' month' + (out.inProgress === 1 ? '' : 's') + ' remain.';
    return out;
  }
  const meAtWar = (me.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive);
  const themAtWar = (them.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive);
  if (meAtWar || themAtWar) out.why = 'Not in wartime — the union must be woven in peace.';
  else if (out.opinion < out.needOpinion) {
    out.why = 'Their court is not nearly devoted enough (opinion ' + out.opinion + ', needs ' + out.needOpinion + '+). Years of gifts, subsidies and good faith bring them closer.';
  } else if (num(me.points && me.points.infl) < out.cost) {
    out.why = 'Weaving two realms into one takes ' + out.cost + ' influence points.';
  }
  out.can = !out.why;
  return out;
}
// Begin the union: the influence is spent NOW; the realms merge only after
// months of patient work (monthlyIncorporation), and the price is lost if
// the union collapses on the way.
export function incorporateCore(ctx, tag, vassalTag) {
  const info = incorporateInfo(ctx, tag, vassalTag);
  if (!info.can) return { ok: false, why: info.why };
  const g = ctx.game;
  const me = g.tags[tag];
  const them = g.tags[vassalTag];
  me.points.infl = num(me.points.infl) - info.cost;
  them.incorporating = { by: tag, monthsLeft: info.months };
  return { ok: true, started: true, cost: info.cost, months: info.months, dev: info.dev, name: them.name || vassalTag };
}
// The union completes: everything transfers, the client crown retires.
function finishIncorporation(ctx, tag, vassalTag) {
  const g = ctx.game;
  const V = ctx.DEFINES.VASSALS || {};
  const me = g.tags[tag];
  const them = g.tags[vassalTag];
  let dev = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.owner === vassalTag) dev += devTotal(p);
  }
  // Their lands join the realm — willingly, so gentler than conquest: some
  // autonomy, a season of adjustment, no generation of resentment.
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== vassalTag) continue;
    changeOwnerCore(ctx, p, tag);
    if (p.controller === vassalTag) changeControllerCore(ctx, p, tag);
    p.autonomy = Math.max(num(p.autonomy, 0.25), 0.5);
    p.modifiers = (p.modifiers || []).filter((m) => m && m.id !== 'incorporated');
    p.modifiers.push({ id: 'incorporated', name: 'Incorporated', months: 12, effects: { unrest: 1 } });
  }
  // A share of their treasury comes to the union — not the chest itself
  // (SPEC §101). Most of what a client crown held was already owed, spent, or
  // sitting in the cellars of men who are not moving to our capital; taking
  // 100% of it was the "annex a poor client, get rich" exploit. Their standing
  // army goes home to the rolls (half returns as our manpower — no free
  // doomstack).
  const coffers = Math.max(0, num(them.treasury));
  const theirIncome = Math.max(0, num(them.income));
  const inherited = Math.min(
    coffers * clamp(B(ctx, 'inheritTreasuryShare', 0.25), 0, 1),
    theirIncome * Math.max(0, B(ctx, 'inheritTreasuryCapMonths', 12)) + 25,
  );
  me.treasury = num(me.treasury) + inherited;
  them.treasury = 0;
  let men = 0;
  for (const a of armiesOf(ctx, vassalTag)) { men += num(a.men); removeArmy(ctx, a.id); }
  me.manpower = num(me.manpower) + Math.round(men * 0.5);
  for (const id of Object.keys(g.fleets || {})) {
    if (g.fleets[id] && g.fleets[id].tag === vassalTag) delete g.fleets[id];
  }
  for (const id of Object.keys(g.airwings || {})) {
    if (g.airwings[id] && g.airwings[id].tag === vassalTag) delete g.airwings[id];
  }
  them.alive = false;
  them.overlord = null;
  them.incorporating = null;
  them.atWarWith = [];
  for (const al of (them.allies || []).slice()) breakAllianceCore(ctx, vassalTag, al);
  // The world counts absorption — at half a conquest's rate.
  me.aggression = num(me.aggression) + Math.round(dev * num(V.incorporateInfamyPerDev, 0.25));
  chronicle(ctx, 'fall', (them.name || vassalTag) + ' is incorporated into ' + (me.name || tag)
    + ' — the client crown is retired with honors, its lands answer to one throne, and '
    + Math.round(inherited) + ' talents of its treasury reach our capital.');
  ctx.bus.emit('provinceOwner', {});
  return { ok: true, dev, name: them.name || vassalTag };
}
// Monthly: the unions being woven advance — or unravel. War on either court,
// a broken bond, or affection fallen below the gate voids the work (and the
// influence already spent). Completion retires the client crown.
export function monthlyIncorporation(ctx) {
  const g = ctx.game;
  const V = ctx.DEFINES.VASSALS || {};
  for (const k of Object.keys(g.tags)) {
    const them = g.tags[k];
    if (!them || !them.incorporating) continue;
    const c = them.incorporating;
    const lordTag = c.by;
    const me = g.tags[lordTag];
    const tell = (title, text, type) => {
      if (lordTag === g.playerTag) ctx.bus.emit('notify', { title, text, type: type || 'info' });
    };
    const meAtWar = me && (me.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive);
    const themAtWar = (them.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive);
    if (!them.alive || !me || !me.alive || them.overlord !== lordTag) {
      them.incorporating = null;
      continue;
    }
    // Starting the union takes near-devotion (incorporateOpinion); KEEPING it
    // takes only that the court not turn against us (incorporateKeepOpinion).
    // The old check reused the start threshold, so ordinary monthly cooling
    // unraveled every union mid-weave and the influence was lost to simple
    // drift — the reported bug. Real ruptures (insults, grudges, infamy)
    // still cut below the keep line and break it.
    // …unless the calendar started it (SPEC §168). A union woven out of
    // devotion needs the devotion to hold; an annexation the age itself is
    // performing does not, because nobody asked the client. That is the whole
    // difference between the Age of Kingdoms and the Age of Provinces, and if
    // this check applied to both, the second one could never happen: a client
    // being taken into direct rule against its will is by definition a client
    // whose opinion has just collapsed.
    if (!c.byCalendar && opinionOf(ctx, k, lordTag) < num(V.incorporateKeepOpinion, 60)) {
      them.incorporating = null;
      tell('The union unravels', (them.name || k) + '\'s devotion has cooled below what the union demands — the work (and the influence spent) is lost.', 'bad');
      continue;
    }
    // War SUSPENDS the weaving; it does not undo it (SPEC §137). It used to
    // void the union outright and burn the influence with it, and because
    // `incorporateInfo` only lets a union start from a settled court at
    // peace, the months of a weaving were exactly the months an opportunistic
    // AI looks for — a stable, unengaged neighbour is what `aiConsiderWar`
    // hunts. So the one window the mechanic requires was also the window it
    // was most likely to be destroyed in, and thirty months and several
    // hundred influence went with a war the player did not start.
    //
    // The invasion is not prevented and it is not cheap: the clock stops for
    // the whole war, and a client whose devotion cools below the keep line
    // while the fighting runs still breaks the union below. What it no longer
    // does is delete the work.
    if (meAtWar || themAtWar) {
      if (!c.suspended) {
        c.suspended = true;
        tell('The union waits',
          'War halts the weaving of ' + (them.name || k) + ' into the realm. The '
          + (num(c.monthsLeft, 0) | 0) + ' month' + ((c.monthsLeft | 0) === 1 ? '' : 's')
          + ' still to run are held where they are, and the work already done is kept — '
          + 'the clock starts again when the fighting stops.', 'bad');
      }
      continue;
    }
    if (c.suspended) {
      c.suspended = false;
      tell('The weaving resumes',
        'The peace holds, and the union with ' + (them.name || k) + ' takes up where it '
        + 'left off — ' + (num(c.monthsLeft, 0) | 0) + ' months remain.', 'good');
    }
    c.monthsLeft = num(c.monthsLeft, 1) - 1;
    if (c.monthsLeft > 0) continue;
    const res = finishIncorporation(ctx, lordTag, k);
    tell('One realm', (res.name || k) + ' is incorporated — its lands, treasury and people join ours. The world takes note.', 'good');
  }
}
// The world closes ranks against a conqueror: every living, unaligned realm
// that both fears (infamy >= 30) and hates (opinion <= -75) the expander
// stands in its defensive coalition.
export function coalitionAgainst(ctx, expander) {
  const g = ctx.game;
  const t = g.tags[expander];
  // Not every age answers a conqueror with a league (SPEC §100). The modern
  // bookmark's Western powers do not march on the Levant over a border war —
  // they cut trade, embargo, and blockade instead, which is the pressure the
  // era actually applied. A bookmark turns the league off with
  // `mechanics.coalitions: false`.
  if (!mechanicOn(ctx, 'coalitions')) return [];
  if (!t || num(t.aggression) < 30) return [];
  const out = [];
  for (const k of Object.keys(g.tags)) {
    if (k === expander || k === 'REB') continue;
    const o = g.tags[k];
    if (!o || !o.alive || o.overlord === expander) continue;
    if ((t.allies || []).indexOf(k) >= 0) continue;
    if (num(o.opinion && o.opinion[expander], 0) > -75) continue;
    out.push(k);
  }
  return out;
}

// ---------------------------------------------------------------- war goals
// Ordinary diplomatic wars carry one concrete objective. The goal is plain
// save data on the war: old saves can reconstruct it from `war.cb`, while
// scripted wars with no CB remain untouched. Holding the objective after a
// short grace period earns ticking score, so a war can be won by pursuing its
// stated purpose instead of carpet-occupying every last province.
const WAR_GOALS = {
  claim: { cap: 25, rate: 1, grace: 6 },
  conquest: { cap: 25, rate: 1, grace: 6 },
  holy: { cap: 25, rate: 1, grace: 6 },
  liberation: { cap: 25, rate: 1, grace: 6 },
  independence: { cap: 25, rate: 1, grace: 6 },
  containment: { cap: 25, rate: 1, grace: 6 },
  coalition: { cap: 25, rate: 1, grace: 6 },
  succession: { cap: 25, rate: 1, grace: 6 },
};

function capitalProvince(ctx, tag) {
  const t = ctx.game.tags[tag];
  const def = tagDef(ctx, tag);
  const name = (t && t.dynamicCapital) || def.capital;
  const named = name && ctx.prov ? ctx.prov(name) : null;
  if (named && !named.impassable && named.owner === tag) return named;
  let best = null;
  for (let i = 1; i < ctx.game.provinces.length; i++) {
    const p = ctx.game.provinces[i];
    if (!p || p.impassable || p.owner !== tag) continue;
    if (!best || devTotal(p) > devTotal(best)) best = p;
  }
  return best;
}

function warGoalProvinceIds(ctx, atk, def, type, src) {
  const g = ctx.game;
  const explicit = [];
  if (src && typeof src === 'object') {
    if (Number.isFinite(src.provId)) explicit.push(src.provId | 0);
    for (const id of src.targetProvIds || src.provIds || []) explicit.push(id | 0);
  }
  const valid = [...new Set(explicit)].filter((id) => {
    const p = ctx.byId(id);
    return p && !p.impassable;
  });
  if (valid.length) return valid;

  if (type === 'claim') {
    const claims = [];
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (p && !p.impassable && p.owner === def && hasClaim(ctx, atk, i)) claims.push(p);
    }
    claims.sort((a, b) => devTotal(b) - devTotal(a) || a.id - b.id);
    if (claims.length) return [claims[0].id];
  }
  if (type === 'holy' || type === 'liberation') {
    const faith = g.tags[atk] && g.tags[atk].religion;
    const ids = [];
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (p && !p.impassable && p.owner === def && faith && p.religion === faith) ids.push(i);
    }
    if (ids.length) return ids;
  }
  const targetTag = type === 'independence' ? atk : def;
  const capital = capitalProvince(ctx, targetTag);
  return capital ? [capital.id] : [];
}

function makeWarGoal(ctx, atk, def, cb) {
  const type = typeof cb === 'string' ? cb : cb && cb.type;
  const spec = WAR_GOALS[type];
  if (!spec) return null;
  const targetProvIds = warGoalProvinceIds(ctx, atk, def, type, cb);
  if (!targetProvIds.length) return null;
  const names = targetProvIds.map((id) => {
    const p = ctx.byId(id);
    return p && p.name;
  }).filter(Boolean);
  const target = names.length > 2
    ? names.slice(0, 2).join(', ') + ' and ' + (names.length - 2) + ' more'
    : names.join(' and ');
  const A = ctx.game.tags[atk], D = ctx.game.tags[def];
  const attackerName = (A && A.name) || atk;
  const defenderName = (D && D.name) || def;
  let label = 'Hold ' + target;
  let description = 'Control the war objective to gain ticking war score.';
  if (type === 'claim') {
    label = 'Seize ' + target;
    description = attackerName + ' must occupy the land named in its claim.';
  } else if (type === 'conquest') {
    label = 'Conquer ' + target;
    description = attackerName + ' must take the strategic heart of ' + defenderName + '.';
  } else if (type === 'holy' || type === 'liberation') {
    label = 'Liberate the faithful';
    description = attackerName + ' must control a majority of the targeted co-religionist land.';
  } else if (type === 'independence') {
    label = 'Defend independence at ' + target;
    description = 'The rebels gain score while their homeland remains free; the former overlord gains it by occupation.';
  } else if (type === 'containment') {
    label = 'Break the hegemon at ' + target;
    description = attackerName + ' must seize the seat of ' + defenderName + '’s power.';
  } else if (type === 'coalition') {
    label = 'Punish the aggressor at ' + target;
    description = 'The punitive league must seize the aggressor’s political center.';
  } else if (type === 'succession') {
    label = 'Claim the crown at ' + target;
    description = attackerName + ' must occupy the rival seat of succession.';
  }
  return {
    type, label, description, attacker: atk, defender: def,
    targetProvIds, targetTag: type === 'independence' ? atk : def,
    scoreCap: spec.cap, rate: spec.rate, graceMonths: spec.grace,
  };
}

function ensureWarGoal(ctx, war) {
  if (!war) return null;
  if (war.goal && WAR_GOALS[war.goal.type]) return war.goal;
  if (!war.cb || !WAR_GOALS[war.cb]) return null;
  const atk = war.attackers && war.attackers[0];
  const def = war.defenders && war.defenders[0];
  if (!atk || !def) return null;
  war.goal = makeWarGoal(ctx, atk, def, war.cb);
  if (war.goal && !war._goalTick) war._goalTick = { ...ctx.game.date };
  if (!Number.isFinite(war._goalScore)) war._goalScore = 0;
  return war.goal;
}

function warGoalHolder(ctx, war, goal) {
  let total = 0, att = 0, def = 0;
  for (const id of goal.targetProvIds || []) {
    const p = ctx.byId(id);
    if (!p || p.impassable) continue;
    const weight = Math.max(1, devTotal(p));
    total += weight;
    if (war.attackers.indexOf(p.controller) >= 0) att += weight;
    else if (war.defenders.indexOf(p.controller) >= 0) def += weight;
  }
  if (!(total > 0)) return null;
  if (att > total / 2) return 'att';
  if (def > total / 2) return 'def';
  return null;
}

export function warGoalInfo(ctx, war) {
  const goal = ensureWarGoal(ctx, war);
  if (!goal) return null;
  const holderKey = warGoalHolder(ctx, war, goal);
  return {
    ...goal,
    targetNames: (goal.targetProvIds || []).map((id) => {
      const p = ctx.byId(id);
      return p && p.name;
    }).filter(Boolean),
    holderKey,
    score: Math.round(num(war._goalScore)),
    months: Math.max(0, monthsBetween(war.started, ctx.game.date)),
  };
}

function advanceWarGoal(ctx, war) {
  const goal = ensureWarGoal(ctx, war);
  if (!goal) return;
  if (!war._goalTick) {
    war._goalTick = { ...ctx.game.date };
    return;
  }
  const before = Math.max(0, monthsBetween(war.started, war._goalTick) - num(goal.graceMonths, 6));
  const after = Math.max(0, monthsBetween(war.started, ctx.game.date) - num(goal.graceMonths, 6));
  const elapsed = Math.max(0, after - before);
  war._goalTick = { ...ctx.game.date };
  if (!elapsed) return;
  const holder = warGoalHolder(ctx, war, goal);
  if (!holder) return;
  const delta = elapsed * num(goal.rate, 1) * (holder === 'att' ? 1 : -1);
  war._goalScore = clamp(num(war._goalScore) + delta,
    -num(goal.scoreCap, 25), num(goal.scoreCap, 25));
}

export function declareWar(ctx, atk, def, name, cb) {
  const g = ctx.game;
  const A = g.tags[atk], D = g.tags[def];
  const cbType = typeof cb === 'string' ? cb : cb && cb.type;
  if (!A || !D) { warnOnce('dw:' + atk + ':' + def, 'declareWar: unknown tag', atk, def); return null; }
  // An off-map seat is beyond every army (SPEC §180). The AI's wars of
  // opportunity walk province adjacency and could never pick one anyway;
  // this bar is for scripts and players, and it trusts nothing.
  if (isOffmapTag(ctx, atk) || isOffmapTag(ctx, def)) {
    warnOnce('dw-offmap:' + atk + ':' + def, 'declareWar refused: off-map seat', atk, def);
    return null;
  }
  if (truceActive(ctx, atk, def)) return null; // the ink on the treaty is still wet
  // A recognized state is a state you are at peace with (SPEC §96): the
  // recognition must be renounced in the open before the guns can be aimed.
  if (recognized(ctx, atk, def)) {
    warnOnce('dw-recog:' + atk + ':' + def, 'declareWar refused: the two states recognize each other', atk, def);
    return null;
  }
  // A crown and its client do not go to war while the bond stands (SPEC §75):
  // the yoke is the settlement of that quarrel. The one legal road is the
  // independence rising (vassalIndependence), which severs the bond FIRST and
  // then declares. Without this guard a scripted event could set an overlord
  // at war with its own vassal while tribute still flowed between them.
  if (A.overlord === def || D.overlord === atk) {
    warnOnce('dw-bond:' + atk + ':' + def, 'declareWar refused: overlord and client', atk, def);
    return null;
  }
  const existing = warBetween(ctx, atk, def);
  if (existing) return existing;
  const attackers = [atk];
  const defenders = [def];
  // A recognized peace is not a promise you can be dragged out of (SPEC §96):
  // a court that has recognized the enemy principal stays out of this war
  // rather than joining it as somebody's ally, league member or guarantor. The
  // bond of fealty is the one thing that still overrides it — a client is
  // marched by its overlord, and that quarrel belongs to §75, not here.
  const join = (side, tag, bound) => {
    if (!g.tags[tag] || !g.tags[tag].alive) return;
    if (attackers.indexOf(tag) >= 0 || defenders.indexOf(tag) >= 0) return;
    const foe = side === attackers ? def : atk;
    if (!bound && recognized(ctx, tag, foe)) return;
    side.push(tag);
  };
  // A client's loyalty is not a formality (SPEC §61): a court that thinks
  // ill of its overlord (below loyalOpinion) stays home from the overlord's
  // wars — attacking and defending both. Only its OWN defense still binds
  // the house, the half of the bargain that never lapses.
  const V = ctx.DEFINES.VASSALS || {};
  const refusals = [];
  const loyal = (v, lord) => {
    if (opinionOf(ctx, v, lord) >= num(V.loyalOpinion, -25)) return true;
    refusals.push({ v, lord });
    return false;
  };
  for (const al of A.allies || []) {
    if (al !== def && (D.allies || []).indexOf(al) < 0) join(attackers, al);
  }
  for (const v of vassalsOf(ctx, atk)) if (loyal(v, atk)) join(attackers, v, true);
  // A punitive league (SPEC §21 extended): when the coalition itself declares
  // the war, every member without a standing truce marches on the attacker's
  // side — the world's answer to a conqueror, not one rival's.
  if (cbType === 'coalition') {
    const league = coalitionAgainst(ctx, def).filter((m) => !truceActive(ctx, m, def));
    for (const m of league) join(attackers, m);
    if (league.length) {
      chronicle(ctx, 'coalition', 'The nations that feared ' + (D.name || def) + ' march as one: '
        + league.map((m) => (g.tags[m] && g.tags[m].name) || m).join(', ') + ' take the field.');
    }
  }
  // Attacking a client kingdom is attacking its overlord — the whole house answers.
  const lord = D.overlord && g.tags[D.overlord] && g.tags[D.overlord].alive ? D.overlord : null;
  if (lord) {
    join(defenders, lord, true);
    for (const v of vassalsOf(ctx, lord)) if (v === def || loyal(v, lord)) join(defenders, v, true);
  }
  for (const al of D.allies || []) join(defenders, al);
  for (const v of vassalsOf(ctx, def)) if (loyal(v, def)) join(defenders, v, true);
  // The coalition answers: realms leagued against an infamous conqueror
  // defend anyone he attacks (anti-snowball, SPEC §21).
  // Guarantors honor their word (SPEC §24): any court that guaranteed the
  // defender's independence joins the defense.
  for (const k of Object.keys(g.tags)) {
    const gt = g.tags[k];
    if (!gt || !gt.alive || k === atk || k === def) continue;
    if (!Array.isArray(gt.guarantees) || gt.guarantees.indexOf(def) < 0) continue;
    const before = defenders.length;
    join(defenders, k);
    if (defenders.length > before && (atk === g.playerTag || def === g.playerTag || k === g.playerTag)) {
      ctx.bus.emit('notify', {
        title: 'A guarantee is honored',
        text: (gt.name || k) + ' stands by its word and joins the defense of ' + (D.name || def) + '.',
        type: k === g.playerTag || def === g.playerTag ? 'good' : 'bad',
      });
    }
  }
  const coal = coalitionAgainst(ctx, atk);
  if (coal.indexOf(def) >= 0) {
    for (const m of coal) join(defenders, m);
    chronicle(ctx, 'coalition', 'The realms that feared ' + (A.name || atk) + ' league together: '
      + coal.map((t) => (g.tags[t] && g.tags[t].name) || t).join(', ') + ' answer as one.');
    if (atk === g.playerTag || def === g.playerTag) {
      ctx.bus.emit('notify', {
        title: 'The coalition marches',
        text: 'The realms that feared ' + (A.name || atk) + ' answer as one.',
        type: atk === g.playerTag ? 'bad' : 'good',
      });
    }
  }
  const war = {
    id: 'war' + (g.wars.length + 1),
    name: name || ((A.name || atk) + '–' + (D.name || def) + ' War'),
    attackers, defenders, warscore: {}, started: { ...g.date }, _bs: { att: 0, def: 0 },
    cb: cbType || null,
    // Which side, if either, fights for its own freedom (SPEC §174). The
    // rising client declares, so the independence CB marks the attackers;
    // scripted revolts set the field by hand. Plain save data.
    independenceSide: cbType === 'independence' ? 'att' : null,
    goal: makeWarGoal(ctx, atk, def, cb),
    _goalScore: 0,
    _goalTick: { ...g.date },
  };
  g.wars.push(war);
  for (const a of attackers) {
    for (const d of defenders) {
      const ta = g.tags[a], td = g.tags[d];
      if (ta && ta.atWarWith.indexOf(d) < 0) ta.atWarWith.push(d);
      if (td && td.atWarWith.indexOf(a) < 0) td.atWarWith.push(a);
      // War annuls the joined houses across the lines (SPEC §62).
      if (breakMarriagesForWar(ctx, a, d) && (a === g.playerTag || d === g.playerTag)) {
        ctx.bus.emit('notify', {
          title: 'A marriage annulled',
          text: 'War sunders the joined houses of ' + ((ta && ta.name) || a) + ' and ' + ((td && td.name) || d) + '.',
          type: 'bad',
        });
      }
    }
  }
  const names = (list) => list.map((t) => (g.tags[t] && g.tags[t].name) || t).join(', ');
  chronicle(ctx, 'war', war.name + ' begins: ' + names(attackers) + ' against ' + names(defenders) + '.');
  ctx.bus.emit('war', { id: war.id, name: war.name, attackers: attackers.slice(), defenders: defenders.slice() });
  if (attackers.indexOf(g.playerTag) >= 0 || defenders.indexOf(g.playerTag) >= 0) {
    ctx.bus.emit('notify', { title: 'War!', text: war.name + ' has begun.', type: 'war' });
    const mine = refusals.filter((r) => r.lord === g.playerTag);
    if (mine.length) {
      ctx.bus.emit('notify', {
        title: 'A client stays home',
        text: mine.map((r) => (g.tags[r.v] && g.tags[r.v].name) || r.v).join(', ')
          + ' refuse' + (mine.length === 1 ? 's' : '') + ' our call to war — their court thinks too ill of us to march.',
        type: 'bad',
      });
    }
  } else {
    // Other people's wars are still news — just quieter news.
    ctx.bus.emit('notify', { title: 'News from abroad', text: names(attackers) + ' march against ' + names(defenders) + '.', type: 'info' });
  }
  return war;
}

// ---------------------------------------------------------------- opinion & alliances
// Costs, gains and cooldowns for the player-facing diplomacy actions (init.js
// gameActions) and the AI reciprocity pass (ai.js). Frozen action contract.
export const DIPLO = {
  // The offered collar (SPEC §92): a small friendly neighbor may be asked to
  // come under our protection as a client kingdom, without a war. It is the
  // one path to a vassal that costs no infamy — nobody was conquered — and
  // it is deliberately hard to reach: they must be our sworn ally, markedly
  // weaker, and devoted to us.
  clientOfferInfl: 100,      // influence to send the offer
  clientOfferDevShare: 0.5,  // their development must be at most this much of ours
  clientOfferMinOpinion: 120, // ...and they must think at least this well of us
  clientOfferAcceptOpinion: 150, // adoration alone is enough at this much
  clientOfferSmallShare: 0.25, // a state this much smaller than us hears the logic
  clientOfferRefuseOpinion: -30, // the sting of being asked and saying no
  clientOfferCdMonths: 60,   // ...and how long before they will hear it again
  clientOfferAcceptOpinionHit: -15, // even a yes costs a little pride
  improveCost: 25, improveGain: 15, improveCdMonths: 4,
  giftCost: 75, giftGain: 20, giftCdMonths: 6,
  allyMinOpinion: 60, allyAcceptOpinion: 110, allyRefuseOpinion: -5, allyCdMonths: 6,
  breakOpinion: -50,
  // Recognition (SPEC §96): the peace available where an alliance is not.
  // Cheaper in goodwill than an alliance and far dearer in politics — it is
  // signed across a grudge, not on top of a friendship.
  recognizeCost: 100,            // influence points to draft and sell it at home
  recognizeMinOpinion: -40,      // they must at least receive the letters
  recognizeAcceptOpinion: 10,    // ...and think this well of us to sign
  recognizeRefuseOpinion: -5,    // the sting of being asked and saying no
  recognizeCdMonths: 24,         // ...and how long before they will hear it again
  recognizeOpinionFloor: 40,     // signing lifts both courts to at least this
  recognizeBreakOpinion: -100,   // tearing it up is not forgotten
  recognizeBreakLegitimacy: -15, // ...and the country notices at home too
  // Royal marriage (SPEC §62): dynasties bind, and children follow. Both
  // courts must be monarchies; the mechanic is era-gated off for 1948.
  marryCost: 25,          // influence points to arrange the match
  marryMinOpinion: 20,    // the other court must at least receive our envoys warmly
  marryOpinionGain: 25,   // both courts, on the wedding day
  marryHeirBonus: 1,      // each living royal marriage adds this ×base heir chance...
  marryHeirCap: 3,        // ...capped at this multiple of the base
  marryWarBreakOpinion: -40, // drawing the sword on kin is not forgotten
  // …and neither is being sent home (SPEC §202). A match was the one bond
  // this game gave no way out of, which was survivable while bonds were free
  // and is a trap now that they take a seat: four early weddings would clog a
  // chancery for the rest of the campaign. Annulment costs less than a war
  // between kin and more than breaking a mere alliance — Herod's household
  // is the argument for the number.
  marryBreakOpinion: -35,
};
export function opinionOf(ctx, whose, of) {
  const t = ctx.game.tags[whose];
  return t && t.opinion ? clamp(Math.round(num(t.opinion[of])), -200, 200) : 0;
}
function rivalryKey(a, b) {
  return a < b ? a + '|' + b : b + '|' + a;
}
function eraRivalryActive(ctx, a, b) {
  const list = ctx.bookmark && Array.isArray(ctx.bookmark.rivalries) ? ctx.bookmark.rivalries : null;
  if (!list) return false;
  const retired = ctx.game && ctx.game.retiredRivalries;
  if (retired && retired[rivalryKey(a, b)]) return false;
  for (const pair of list) {
    if (!Array.isArray(pair) || pair.length !== 2) continue;
    if ((pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a)) return true;
  }
  return false;
}
// Standing rivalries (SPEC §73): the bookmark may name pairs of courts whose
// enmity is the era's weather — Rome and Parthia, the Syrian Wars, the jihad
// state and the empires. Rivals cool toward BALANCE.rivalOpinion instead of
// neutral (monthlyOpinionDrift) and the AI strikes them a little more
// readily (aiConsiderWar) — recomputed live from the bookmark, so no save
// schema is touched.
export function areRivals(ctx, a, b) {
  if (a === b) return false;
  if (eraRivalryActive(ctx, a, b)) return true;
  // Declared rivalries (SPEC §86) sit on top of the era's weather: a court
  // the player has NAMED a rival is a rival in every place the bookmark's
  // own pairs are — drift, the AI's appetite, and the thaw that never comes.
  return declaredRival(ctx, a, b) || declaredRival(ctx, b, a);
}

// ─────────────────────────────────────────────────────────────────────────────
// Declared rivalries and reconciliation (SPEC §86).
//
// §67 made a grudge permanent for as long as the taker held the land, which
// is true of a wound and false of a memory. Courts that were natural friends
// before the quarrel — Persia and the Return, Rome and a client it made —
// do come back together, and the thing that decides whether they do is not
// the map. It is whether either of them keeps choosing the other as an
// enemy. So: a grudge left alone MATURES. Its ceiling rises month by month
// toward a target, halfway for strangers and nearly all the way for the pairs
// a bookmark names historical friends. War between them, a fresh seizure, or
// a declared rivalry stops it — the first two by resetting the clock, the
// last simply by holding it still for as long as the rivalry stands.
// ─────────────────────────────────────────────────────────────────────────────

// The courts `tag` has named as rivals. Player-declared today; the shape is
// per-tag so an AI court can be given the same pen without a schema change.
export function declaredRivals(ctx, tag) {
  const r = ctx.game && ctx.game.rivals;
  const list = r && r[tag];
  return Array.isArray(list) ? list.slice() : [];
}
export function declaredRival(ctx, tag, of) {
  const r = ctx.game && ctx.game.rivals;
  const list = r && r[tag];
  return Array.isArray(list) && list.indexOf(of) >= 0;
}

// Historical friends: pairs the bookmark declares as courts with a bond that
// outlives a quarrel. An entry may carry a doctrine condition —
// `['JUD', 'SAS', { axis: 'alignment', sign: -1 }]` — in which case the
// affinity only holds while the realm's character still leans that way. The
// Return keeps Persia's friendship by facing east; swing west and the old
// bond lapses, and with it the thaw that was riding on it.
export function affinityPair(ctx, a, b) {
  const list = ctx.bookmark && Array.isArray(ctx.bookmark.affinities) ? ctx.bookmark.affinities : null;
  if (!list || a === b) return null;
  // A bond an event has since annulled (SPEC §104). Parthia was the court
  // that offered Bar Kokhba silver; the empire Ardashir builds on top of it
  // is a centralized state with a state church and no use for the old
  // Arsacid hospitality. The book mirrors `retiredRivalries` — plain data on
  // the game, so a save carries it and an older one simply has none.
  const retired = ctx.game && ctx.game.retiredAffinities;
  if (retired && retired[rivalryKey(a, b)]) return null;
  for (const pair of list) {
    if (!Array.isArray(pair) || pair.length < 2) continue;
    if ((pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a)) return pair;
  }
  return null;
}
export function haveAffinity(ctx, a, b) {
  const pair = affinityPair(ctx, a, b);
  if (!pair) return false;
  const cond = pair[2];
  if (!cond || !cond.axis) return true;
  try {
    const s = axisOf(ctx, cond.axis);
    return num(cond.sign, 1) >= 0 ? s >= num(cond.need, 2) : s <= -num(cond.need, 2);
  } catch (e) { warnOnce('affinity', 'affinity condition failed', e); return false; }
}

// The developed weight of a realm: the same sum the force limit is built on,
// and the honest measure of whether one court is in a position to hold a
// grievance against another.
export function realmWeight(ctx, tag) {
  const g = ctx.game;
  let dev = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.owner === tag) dev += devTotal(p);
  }
  return dev;
}

// Deference (SPEC §137), 0..1. A grievance is a policy, and a court that
// cannot afford one stops paying for it.
//
// §67 caps what goodwill can buy while the taker sits on the land, and §86
// lets the wound close halfway over ten quiet years. Between them a small,
// shaky neighbour could hold a permanent −50 against a power six times its
// weight — a court in no position to do anything about it, refusing to be
// bought, forever. That is not what small states do. They accommodate, and
// the ones with troubles at home accommodate fastest.
//
// This measures the gap in developed weight and the victim's own stability,
// and returns how much of the REMAINING reach the gap is worth. It changes
// nothing between equals: at 6/10 of the taker's weight or better it is zero,
// which is every rivalry the chapters are actually about.
export function deference(ctx, victim, taker) {
  const B_ = (ctx.DEFINES && ctx.DEFINES.BALANCE) || {};
  const theirs = realmWeight(ctx, taker);
  if (theirs <= 0) return 0;
  const ratio = realmWeight(ctx, victim) / theirs;
  const top = num(B_.deferDevRatio, 0.6);
  const floor = num(B_.deferFloorRatio, 0.15);
  let d = 0;
  if (ratio < top) d = clamp((top - ratio) / Math.max(0.01, top - floor), 0, 1);
  d *= num(B_.deferMax, 0.85);
  // A court that cannot keep its own house quiet has no appetite for a
  // quarrel it is losing anyway. Only instability counts — a steady small
  // realm may nurse its grievance as long as it likes.
  const t = ctx.game.tags[victim];
  const unsteady = Math.max(0, -num(t && t.stability));
  if (d > 0) d = clamp(d + unsteady * num(B_.deferStabilityBonus, 0.1), 0, 1);
  return d;
}

// How far a grudge has matured, 0..1. Quiet months are counted on the grudge
// entry itself (`thaw`), so a save carries it without a migration: an older
// book simply starts its clock at zero.
//
// The reach is how far the ceiling can rise at full maturity — halfway for
// strangers, nearly all the way for historical friends, and further still
// for a court too light to sustain the grievance (SPEC §137). Deference
// carries what is LEFT of the reach, so it can lift the ceiling off entirely
// where the gap is wide, and does nothing at all between equals. The clock
// is untouched: a state that has just lost land is furious whatever its size,
// and it is the persistence rather than the fury that was wrong.
export function thawProgress(ctx, victim, taker) {
  const t = ctx.game.tags[victim];
  const gr = t && t.grudges && t.grudges[taker];
  if (!gr) return 0;
  const B_ = (ctx.DEFINES && ctx.DEFINES.BALANCE) || {};
  const months = Math.max(1, num(B_.thawMonths, 120));
  const base = haveAffinity(ctx, victim, taker)
    ? num(B_.thawReachAffinity, 0.9) : num(B_.thawReachPlain, 0.5);
  const reach = clamp(base + (1 - base) * deference(ctx, victim, taker), 0, 1);
  return clamp(num(gr.thaw) / months, 0, 1) * reach;
}

// The two courts are quiet: no war between them, and neither has named the
// other a rival. This — not the map — is what lets a wound close.
export function thawQuiet(ctx, victim, taker) {
  const g = ctx.game;
  const t = g.tags[victim], o = g.tags[taker];
  if (!t || !o || !t.alive || !o.alive) return false;
  if ((t.atWarWith || []).indexOf(taker) >= 0 || (o.atWarWith || []).indexOf(victim) >= 0) return false;
  return !areRivals(ctx, victim, taker);
}

// A fully reconciled pair — the wound has closed as far as it is going to,
// and where an affinity carried it, an alliance is on the table again.
// Naming a rival, and unsaying it. The cost of unsaying is deliberately the
// higher of the two: a court may change its mind about an enemy, but the
// chanceries remember that it once did.
export function rivalDeclareInfo(ctx, tag, of) {
  const g = ctx.game;
  const t = g.tags[tag], o = g.tags[of];
  const B_ = (ctx.DEFINES && ctx.DEFINES.BALANCE) || {};
  const out = {
    isRival: declaredRival(ctx, tag, of),
    eraRival: false,
    count: declaredRivals(ctx, tag).filter((k) => g.tags[k] && g.tags[k].alive).length,
    max: Math.max(1, num(B_.rivalMax, 2) | 0),
    declareCost: num(B_.rivalDeclareInfl, 20),
    renounceCost: num(B_.rivalRenounceInfl, 40),
    can: false, why: '',
  };
  if (!t || !o || !o.alive || tag === of) return null;
  // The era's own weather is not the player's to declare or to unsay.
  out.eraRival = eraRivalryActive(ctx, tag, of);
  if (out.isRival) {
    if (num(t.points && t.points.infl) < out.renounceCost) {
      out.why = 'Setting a quarrel aside costs ' + out.renounceCost + ' influence — we have not got it.';
    }
  } else if (out.eraRival) {
    out.why = 'The age already has them for an enemy; no herald of ours made it so.';
  } else if (o.overlord === tag || t.overlord === of) {
    out.why = 'The bond of fealty is not a rivalry.';
  } else if ((t.allies || []).indexOf(of) >= 0) {
    out.why = 'They are our sworn allies. Break the alliance first.';
  } else if (out.count >= out.max) {
    out.why = 'A realm can afford ' + out.max + ' named enemies. We already have them.';
  } else if (diploCdActive(ctx, tag + '>' + of + ':rival')) {
    out.why = 'We only just set this quarrel aside ('
      + diploCdMonthsLeft(ctx, tag + '>' + of + ':rival') + ' months).';
  } else if (num(t.points && t.points.infl) < out.declareCost) {
    out.why = 'Naming an enemy costs ' + out.declareCost + ' influence — we have not got it.';
  }
  out.can = !out.why;
  return out;
}

// A scripted peace can end one of the bookmark's inherited rivalries.  This
// is stronger than the ordinary player action: it retires the era pair,
// clears any declared rivalry on both sides, and settles both grudge ledgers.
// A court may still name the other as a new rival later.
export function reconcileRivalryCore(ctx, a, b) {
  const g = ctx.game;
  if (!g.tags[a] || !g.tags[b] || a === b) return false;
  if (!g.retiredRivalries || typeof g.retiredRivalries !== 'object') g.retiredRivalries = {};
  g.retiredRivalries[rivalryKey(a, b)] = true;
  if (g.rivals && typeof g.rivals === 'object') {
    if (Array.isArray(g.rivals[a])) g.rivals[a] = g.rivals[a].filter((tag) => tag !== b);
    if (Array.isArray(g.rivals[b])) g.rivals[b] = g.rivals[b].filter((tag) => tag !== a);
    if (Array.isArray(g.rivals[a]) && !g.rivals[a].length) delete g.rivals[a];
    if (Array.isArray(g.rivals[b]) && !g.rivals[b].length) delete g.rivals[b];
  }
  if (g.tags[a].grudges) delete g.tags[a].grudges[b];
  if (g.tags[b].grudges) delete g.tags[b].grudges[a];
  return true;
}

// The other half of the same power (SPEC §104): an event may annul one of the
// bookmark's inherited FRIENDSHIPS. A dynasty is overthrown and the state
// that replaces it does not owe the old state's friends anything.
export function retireAffinityCore(ctx, a, b) {
  const g = ctx.game;
  if (!g.tags[a] || !g.tags[b] || a === b) return false;
  if (!g.retiredAffinities || typeof g.retiredAffinities !== 'object') g.retiredAffinities = {};
  g.retiredAffinities[rivalryKey(a, b)] = true;
  return true;
}
// ── Recognition, and the alliance that will never be signed (SPEC §96) ──────
// Some enmities do not end in an alliance. In the modern bookmark no Arab
// capital will put its name under a military pact with Israel — and the thing
// that actually happened instead was recognition: an exchange of letters that
// converts an armistice into a peace. Recognition is mutual, permanent while
// it stands, and pair-specific: it does not oblige either state to fight for
// the other, and it does not make them friends. It only makes them at peace.
export function recognitionKey(a, b) { return a < b ? a + '|' + b : b + '|' + a; }
export function recognized(ctx, a, b) {
  const g = ctx && ctx.game;
  return !!(g && g.recognitions && g.recognitions[recognitionKey(a, b)]);
}
// The bookmark's own bar: `diplomacy.noAlliance` is a list of blocs whose
// members may never ally ACROSS the bloc line ({ between, and, why }).
export function allianceBarred(ctx, a, b) {
  const rules = ctx && ctx.bookmark && ctx.bookmark.diplomacy
    && Array.isArray(ctx.bookmark.diplomacy.noAlliance)
    ? ctx.bookmark.diplomacy.noAlliance : null;
  if (!rules || a === b) return '';
  for (const rule of rules) {
    if (!rule || !Array.isArray(rule.between) || !Array.isArray(rule.and)) continue;
    const across = (x, y) => rule.between.indexOf(x) >= 0 && rule.and.indexOf(y) >= 0;
    if (across(a, b) || across(b, a)) return rule.why || 'No alliance is possible between these states.';
  }
  return '';
}
// The cooldown key uses the same '<me>><them>:<kind>' shape as the panel's.
export function recognizeCd(me, them) { return me + '>' + them + ':recognize'; }
function recognitionOn(ctx) {
  const d = ctx && ctx.bookmark && ctx.bookmark.diplomacy;
  return !!(d && d.recognition);
}
// The one war recognition may itself close: a strictly bilateral one. A wider
// coalition war has other courts at the table and must be settled there first.
function bilateralWarBetween(ctx, a, b) {
  const w = warBetween(ctx, a, b);
  if (!w) return null;
  const live = w.attackers.concat(w.defenders)
    .filter((t) => ctx.game.tags[t] && ctx.game.tags[t].alive);
  return live.length === 2 ? w : null;
}
export function recognitionInfo(ctx, me, other) {
  const g = ctx.game;
  const them = g.tags[other], mine = g.tags[me];
  const out = {
    can: false, why: '', cost: DIPLO.recognizeCost,
    recognized: recognized(ctx, me, other),
    offered: recognitionOn(ctx),
    name: (them && them.name) || other,
    endsWar: false,
  };
  if (!out.offered || !mine || !them || !them.alive || me === other) {
    out.why = 'This age does not exchange recognitions.';
    return out;
  }
  if (out.recognized) { out.why = 'We have already recognized one another.'; return out; }
  if (mine.overlord === other || them.overlord === me) {
    out.why = 'The bond of fealty already answers the question.';
    return out;
  }
  const war = warBetween(ctx, me, other);
  if (war && !bilateralWarBetween(ctx, me, other)) {
    out.why = 'The wider war must be settled at its own table first.';
    return out;
  }
  out.endsWar = !!war;
  if (num(mine.points && mine.points.infl) < DIPLO.recognizeCost) {
    out.why = 'Recognition is drafted, argued and sold at home: ' + DIPLO.recognizeCost + ' influence.';
    return out;
  }
  if (opinionOf(ctx, other, me) < DIPLO.recognizeMinOpinion) {
    out.why = 'Their court will not receive the letters (opinion '
      + Math.round(opinionOf(ctx, other, me)) + ', needs ' + DIPLO.recognizeMinOpinion + '+).';
    return out;
  }
  if (diploCdActive(ctx, recognizeCd(me, other))) {
    out.why = 'Our last approach was refused (' + diploCdMonthsLeft(ctx, recognizeCd(me, other)) + ' months).';
    return out;
  }
  out.can = true;
  return out;
}
// Sign it. Both ledgers are settled: any bilateral war ends where it stands,
// the era's rivalry is retired, and neither court's opinion of the other may
// sit below the floor of a state it has formally recognized.
export function recognizeCore(ctx, a, b) {
  const g = ctx.game;
  if (!g.tags[a] || !g.tags[b] || a === b) return { ok: false, why: 'There is no such court.' };
  if (recognized(ctx, a, b)) return { ok: false, why: 'We have already recognized one another.' };
  const war = bilateralWarBetween(ctx, a, b);
  if (warBetween(ctx, a, b) && !war) {
    return { ok: false, why: 'The wider war must be settled at its own table first.' };
  }
  if (war) endWarBySword(ctx, war, null); // white peace: every occupation reverts
  if (!g.recognitions || typeof g.recognitions !== 'object') g.recognitions = {};
  g.recognitions[recognitionKey(a, b)] = { y: g.date.y, m: g.date.m };
  reconcileRivalryCore(ctx, a, b);
  for (const [x, y] of [[a, b], [b, a]]) {
    const t = g.tags[x];
    if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
    t.opinion[y] = clamp(Math.max(num(t.opinion[y]), DIPLO.recognizeOpinionFloor), -200, 200);
  }
  chronicle(ctx, 'diplomacy', (g.tags[a].name || a) + ' and ' + (g.tags[b].name || b)
    + ' exchange letters of recognition: the armistice between them becomes a peace.');
  if (ctx.bus) ctx.bus.emit('diplomacy', { kind: 'recognition', a, b });
  return { ok: true, endedWar: !!war, name: g.tags[b].name || b };
}
// Tearing it up is an act of state, and it is remembered.
export function renounceRecognitionCore(ctx, a, b) {
  const g = ctx.game;
  if (!recognized(ctx, a, b)) return { ok: false, why: 'There is no recognition to renounce.' };
  delete g.recognitions[recognitionKey(a, b)];
  const them = g.tags[b];
  if (them) {
    if (!them.opinion || typeof them.opinion !== 'object') them.opinion = {};
    them.opinion[a] = clamp(num(them.opinion[a]) + DIPLO.recognizeBreakOpinion, -200, 200);
  }
  const mine = g.tags[a];
  if (mine) mine.legitimacy = clamp(num(mine.legitimacy) + DIPLO.recognizeBreakLegitimacy, 0, 100);
  chronicle(ctx, 'diplomacy', (mine && mine.name ? mine.name : a) + ' withdraws its recognition of '
    + (them && them.name ? them.name : b) + '; the peace between them is a piece of paper again.');
  if (ctx.bus) ctx.bus.emit('diplomacy', { kind: 'recognitionEnded', a, b });
  return { ok: true, name: (them && them.name) || b };
}

export function declareRivalCore(ctx, tag, of) {
  const info = rivalDeclareInfo(ctx, tag, of);
  if (!info || info.isRival || !info.can) {
    return { ok: false, why: info ? info.why : 'There is no such court.' };
  }
  const g = ctx.game;
  const t = g.tags[tag];
  if (!g.rivals || typeof g.rivals !== 'object') g.rivals = {};
  if (!Array.isArray(g.rivals[tag])) g.rivals[tag] = [];
  g.rivals[tag].push(of);
  t.points.infl = num(t.points.infl) - info.declareCost;
  // Naming an enemy is heard. Their regard collapses to the cold baseline,
  // and every grudge between the pair stops maturing while it stands.
  const cold = num((ctx.DEFINES.BALANCE || {}).rivalOpinion, -60);
  const them = g.tags[of];
  if (them) {
    if (!them.opinion) them.opinion = {};
    them.opinion[tag] = Math.min(Math.round(num(them.opinion[tag])), cold);
  }
  return { ok: true, name: (them && them.name) || of, cost: info.declareCost };
}
export function renounceRivalCore(ctx, tag, of) {
  const info = rivalDeclareInfo(ctx, tag, of);
  if (!info || !info.isRival || !info.can) {
    return { ok: false, why: info ? info.why : 'There is no such court.' };
  }
  const g = ctx.game;
  const t = g.tags[tag];
  g.rivals[tag] = (g.rivals[tag] || []).filter((k) => k !== of);
  if (!g.rivals[tag].length) delete g.rivals[tag];
  t.points.infl = num(t.points.infl) - info.renounceCost;
  setDiploCd(ctx, tag + '>' + of + ':rival', num((ctx.DEFINES.BALANCE || {}).rivalCooldownMonths, 24));
  return { ok: true, name: (g.tags[of] && g.tags[of].name) || of, cost: info.renounceCost };
}

// A claim against a named enemy is cheaper to forge: the case half writes
// itself when the court has been saying it aloud for years.
export function claimCostFor(ctx, tag, against) {
  const base = CLAIM_FABRICATION.cost;
  if (!against || !declaredRival(ctx, tag, against)) return base;
  const mult = num((ctx.DEFINES.BALANCE || {}).rivalClaimMult, 0.5);
  return Math.max(1, Math.round(base * mult));
}

export function reconciled(ctx, victim, taker) {
  const B_ = (ctx.DEFINES && ctx.DEFINES.BALANCE) || {};
  const months = Math.max(1, num(B_.thawMonths, 120));
  const t = ctx.game.tags[victim];
  const gr = t && t.grudges && t.grudges[taker];
  if (!gr) return false;
  return haveAffinity(ctx, victim, taker)
    && clamp(num(gr.thaw) / months, 0, 1) >= num(B_.thawAllyAt, 0.75);
}
// The lost lands are remembered (SPEC §67). When a court loses provinces in
// war — at the peace table or by the sword — it records the taker in
// `tag.grudges[taker] = { provs: [ids], y, m }`. While the taker still owns
// any of that land, the victim's opinion of them cannot be raised above a
// deep negative ceiling: envoys and gifts do not talk a court out of its
// occupied patrimony. The grudge dies only when the land stops being the
// taker's (returned, retaken, or either house falls) — monthlyOpinionDrift
// prunes it — and even then the wound heals only at ordinary drift speed.
export function recordGrudge(ctx, victim, taker, provId) {
  const g = ctx.game;
  const t = g.tags[victim];
  if (!t || !taker || victim === taker || !(provId | 0)) return;
  if (!t.grudges) t.grudges = {};
  const gr = t.grudges[taker] || (t.grudges[taker] = { provs: [], y: g.date.y, m: g.date.m, thaw: 0 });
  if (gr.provs.indexOf(provId | 0) < 0) gr.provs.push(provId | 0);
  gr.y = g.date.y; gr.m = g.date.m;
  // A fresh seizure is a fresh wound: whatever the years had healed, this
  // reopens (SPEC §86). Reconciliation starts again from the new taking.
  gr.thaw = 0;
  // The wound is fresh: the victim's opinion drops straight to the ceiling.
  if (!t.opinion) t.opinion = {};
  const cap = grudgeCeiling(ctx, victim, taker);
  t.opinion[taker] = Math.min(Math.round(num(t.opinion[taker])), cap);
}
// The recorded provinces the taker still actually owns — the live part of the
// grudge. Null when no grudge is held (or either house has fallen).
export function liveGrudge(ctx, victim, taker) {
  const g = ctx.game;
  const t = g.tags[victim];
  const gr = t && t.grudges && t.grudges[taker];
  if (!gr || !Array.isArray(gr.provs)) return null;
  if (!t.alive || !g.tags[taker] || !g.tags[taker].alive) return null;
  const held = gr.provs.filter((id) => {
    const p = ctx.byId ? ctx.byId(id) : g.provinces[id];
    return p && !p.impassable && p.owner === taker;
  });
  return held.length ? held : null;
}
// The raw ceiling a fresh grudge imposes, before any years of quiet:
// -(base + perProv × provinces held), floored at -max.
export function grudgeCeilingRaw(ctx, victim, taker) {
  const held = liveGrudge(ctx, victim, taker);
  if (!held) return 200;
  const B = (ctx.DEFINES && ctx.DEFINES.BALANCE) || {};
  return -Math.min(num(B.grudgeCeilingMax, 180),
    num(B.grudgeCeilingBase, 100) + num(B.grudgeCeilingPerProv, 10) * (held.length - 1));
}
// The warmest the victim can be made to feel about the taker while the taker
// sits on the land. The raw ceiling, RISEN by however far the grudge has
// matured (SPEC §86) — halfway for strangers, nearly the whole way for
// historical friends who kept out of each other's way. +200 (no ceiling)
// when no grudge is live.
export function grudgeCeiling(ctx, victim, taker) {
  const raw = grudgeCeilingRaw(ctx, victim, taker);
  if (raw === 200) return 200;
  // Fully mended between historical friends: the ceiling comes off entirely.
  // The land is still ours and the book still records it — a fresh seizure
  // reopens the whole wound — but the grievance has stopped being the thing
  // that governs the relationship, which is the entire point of §86.
  if (reconciled(ctx, victim, taker)) return 200;
  return Math.round(raw * (1 - thawProgress(ctx, victim, taker)));
}
export function addOpinion(ctx, whose, of, delta) {
  const t = ctx.game.tags[whose];
  if (!t || !of || whose === of) return;
  if (!t.opinion) t.opinion = {};
  const cur = Math.round(num(t.opinion[of]));
  let next = clamp(Math.round(cur + num(delta)), -200, 200);
  // A live grudge caps what goodwill can buy (SPEC §67): positive deltas
  // cannot push opinion past the ceiling. Anything already above the ceiling
  // (a scripted treaty, an old friendship) is left where it stands rather
  // than dragged down here — the monthly drift owns that.
  if (num(delta) > 0) next = Math.min(next, Math.max(cur, grudgeCeiling(ctx, whose, of)));
  t.opinion[of] = next;
}
// Cooldowns live in game.diploCooldowns['<me>><them>:<kind>'] = {y, m} — the
// first month the action is available again. Created lazily; older saves lack
// the map entirely (reviveGame supplies the default).
export function diploCdActive(ctx, key) {
  const g = ctx.game;
  const cd = g.diploCooldowns ? g.diploCooldowns[key] : null;
  if (!cd) return false;
  return g.date.y < cd.y || (g.date.y === cd.y && g.date.m < cd.m);
}
export function diploCdMonthsLeft(ctx, key) {
  const g = ctx.game;
  const cd = g.diploCooldowns ? g.diploCooldowns[key] : null;
  if (!cd) return 0;
  let months = (cd.y - g.date.y) * 12 + (cd.m - g.date.m);
  if (g.date.y < 0 && cd.y > 0) months -= 12; // no year zero
  return Math.max(0, months);
}
export function setDiploCd(ctx, key, months) {
  const g = ctx.game;
  if (!g.diploCooldowns) g.diploCooldowns = {};
  const total = g.date.m - 1 + Math.max(0, months | 0);
  let y = g.date.y + Math.floor(total / 12);
  if (g.date.y < 0 && y >= 0) y += 1; // no year zero: -1 rolls straight to 1
  g.diploCooldowns[key] = { y, m: (total % 12) + 1 };
}
// 'Shared common enemy' = some third tag alive that both have in atWarWith.
export function sharedWarEnemy(ctx, a, b) {
  const g = ctx.game;
  const ta = g.tags[a], tb = g.tags[b];
  if (!ta || !tb) return false;
  for (const e of ta.atWarWith || []) {
    if (e === a || e === b) continue;
    if (!g.tags[e] || !g.tags[e].alive) continue;
    if ((tb.atWarWith || []).indexOf(e) >= 0) return true;
  }
  return false;
}
// ---------------------------------------------------------------- claims & casus belli
export const CLAIM_FABRICATION = {
  cost: 30,
  months: 4,
  opinionHit: -20,
  cooldownMonths: 12,
};

export function hasClaim(ctx, tag, provId) {
  const t = ctx.game.tags[tag];
  return !!(t && Array.isArray(t.claims) && t.claims.indexOf(provId | 0) >= 0);
}

export function claimFabricationInfo(ctx, tag, provId) {
  const g = ctx.game;
  const p = ctx.byId(provId);
  const t = g.tags[tag];
  if (!p || p.impassable || !t || p.owner === tag || !g.tags[p.owner] || p.owner === 'REB') return null;
  if (!Array.isArray(t.claimFabrications)) t.claimFabrications = [];
  const pending = t.claimFabrications.find((row) => row && row.provId === (provId | 0));
  const out = {
    hasClaim: hasClaim(ctx, tag, provId),
    fabricating: !!pending,
    monthsLeft: pending ? Math.max(0, pending.monthsLeft | 0) : 0,
    cost: claimCostFor(ctx, tag, p.owner),
    months: CLAIM_FABRICATION.months,
    rivalDiscount: claimCostFor(ctx, tag, p.owner) < CLAIM_FABRICATION.cost,
    canFabricate: false,
    whyNot: '',
  };
  if (out.hasClaim) out.whyNot = 'We already hold a claim here.';
  else if (pending) {
    out.whyNot = 'Our agents are forging the case (' + out.monthsLeft + ' month'
      + (out.monthsLeft === 1 ? '' : 's') + ' remaining).';
  } else {
    const cdKey = 'claim:' + p.owner;
    if (diploCdActive(ctx, cdKey)) {
      out.whyNot = 'Our forgers need time (' + diploCdMonthsLeft(ctx, cdKey)
        + ' months before another claim on ' + ((g.tags[p.owner] && g.tags[p.owner].name) || p.owner) + ').';
    } else if (num(t.points && t.points.infl) < out.cost) {
      out.whyNot = 'Not enough influence points (' + out.cost + ' required).';
    }
  }
  out.canFabricate = !out.whyNot;
  return out;
}

export function startClaimFabrication(ctx, tag, provId) {
  const info = claimFabricationInfo(ctx, tag, provId);
  if (!info || !info.canFabricate) return { ok: false, why: info ? info.whyNot : 'No claim can be made here.' };
  const g = ctx.game;
  const p = ctx.byId(provId);
  const t = g.tags[tag];
  t.points.infl = num(t.points.infl) - info.cost;
  t.claimFabrications.push({
    provId: provId | 0,
    against: p.owner,
    monthsLeft: CLAIM_FABRICATION.months,
  });
  addOpinion(ctx, p.owner, tag, CLAIM_FABRICATION.opinionHit);
  setDiploCd(ctx, 'claim:' + p.owner, CLAIM_FABRICATION.cooldownMonths);
  return {
    ok: true,
    name: p.name,
    owner: p.owner,
    cost: claimCostFor(ctx, tag, p.owner),
    months: CLAIM_FABRICATION.months,
    rivalDiscount: claimCostFor(ctx, tag, p.owner) < CLAIM_FABRICATION.cost,
  };
}

// Forged rights take time to become diplomatic fact. The influence is spent
// up front; completion adds the ordinary claim consumed by war and peace
// systems. If the province becomes ours before the papers are ready, the
// operation quietly lapses — there is nothing left to claim.
export function monthlyClaimFabrications(ctx) {
  const g = ctx.game;
  for (const tag of Object.keys(g.tags)) {
    const t = g.tags[tag];
    if (!t) continue;
    if (!t.alive) {
      t.claimFabrications = [];
      continue;
    }
    if (!Array.isArray(t.claimFabrications) || !t.claimFabrications.length) continue;
    const keep = [];
    for (const row of t.claimFabrications) {
      if (!row || !(row.provId > 0)) continue;
      row.monthsLeft = Math.max(0, num(row.monthsLeft, CLAIM_FABRICATION.months) - 1);
      if (row.monthsLeft > 0) {
        keep.push(row);
        continue;
      }
      const p = ctx.byId(row.provId);
      const valid = p && !p.impassable && p.owner !== tag && p.owner !== 'REB' && g.tags[p.owner];
      if (valid && !hasClaim(ctx, tag, row.provId)) {
        if (!Array.isArray(t.claims)) t.claims = [];
        t.claims.push(row.provId | 0);
        if (tag === g.playerTag) {
          ctx.bus.emit('notify', {
            title: 'The claim is ready',
            text: 'The genealogies and treaties are assembled: we now hold a claim on ' + p.name
              + '. A war for it costs no stability, and it receives favored terms at the peace table.',
            type: 'good',
          });
        }
        ctx.bus.emit('claim', { tag, provId: row.provId | 0 });
      } else if (tag === g.playerTag) {
        ctx.bus.emit('notify', {
          title: 'The claim lapses',
          text: p && p.owner === tag
            ? p.name + ' came into our hands before the papers were finished.'
            : 'The political case our agents were building no longer has a valid target.',
          type: 'info',
        });
      }
    }
    t.claimFabrications = keep;
  }
}

// Best available casus belli of atk against def: a fabricated claim on their
// land beats a holy war for co-religionist provinces under their rule.
// A throne in dispute is an invitation (SPEC §98): while a court's succession
// crisis stands at its second stage or worse, the houses bound to it by
// marriage — and any neighbor with a plausible cousin — hold a legal argument
// for war, and the war's prize is the yoke rather than a province.
export function successionClaim(ctx, atk, def) {
  const g = ctx.game;
  const A = g.tags[atk], D = g.tags[def];
  if (!A || !D || !D.alive || A.overlord === def || D.overlord === atk) return null;
  if (!mechanicOn(ctx, 'succession')) return null;
  const row = D.crises && D.crises.succession;
  if (!row || num(row.stage) < 2) return null;
  // A house bound to theirs by marriage has the claim from the moment the
  // question is open. Everyone else needs the thing to be past arguing —
  // an armed pretender in the field, which is an invitation anyone can read.
  const married = marriedTo(ctx, atk, def);
  if (!married && !(num(row.stage) >= 3 && g.pretenders && g.pretenders[def])) return null;
  return {
    type: 'succession',
    label: married
      ? 'Our house has a claim on their throne'
      : 'A rival claim we are pleased to support',
    targetTag: def,
  };
}
export function casusBelli(ctx, atk, def) {
  const g = ctx.game;
  const A = g.tags[atk];
  if (!A) return null;
  const succession = successionClaim(ctx, atk, def);
  if (succession) return succession;
  const claims = [];
  const holy = [];
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== def) continue;
    if (hasClaim(ctx, atk, i)) claims.push(p);
    if (A.religion && p.religion === A.religion) holy.push(i);
  }
  claims.sort((a, b) => devTotal(b) - devTotal(a) || a.id - b.id);
  if (claims.length) {
    return {
      type: 'claim',
      label: 'Pressing our claim on ' + claims[0].name,
      provId: claims[0].id,
      targetProvIds: [claims[0].id],
    };
  }
  return holy.length
    ? { type: 'holy', label: 'Liberating the faithful', targetProvIds: holy }
    : null;
}

// ---------------------------------------------------------------- royal marriage (SPEC §62)
// The old world's diplomacy of beds and cradles: two monarchies bind their
// houses, both courts warm, and a married dynasty is likelier to produce an
// heir (realm.js heirChance). Era-gated: 1948's republics and kings do not
// arrange each other's marriages (bookmark mechanics.royalMarriage: false).
export function marriedTo(ctx, a, b) {
  const t = ctx.game.tags[a];
  return !!(t && Array.isArray(t.marriages) && t.marriages.indexOf(b) >= 0);
}
// Living marriages only — a fallen house binds nobody.
export function marriageCount(ctx, tag) {
  const t = ctx.game.tags[tag];
  if (!t || !Array.isArray(t.marriages)) return 0;
  return t.marriages.filter((k) => ctx.game.tags[k] && ctx.game.tags[k].alive).length;
}
export function royalMarriageInfo(ctx, tag, other) {
  const g = ctx.game;
  const me = g.tags[tag];
  const them = g.tags[other];
  const out = { can: false, why: '', cost: DIPLO.marryCost, married: marriedTo(ctx, tag, other) };
  if (!me || !them || !them.alive) { out.why = 'No such court.'; return out; }
  if (!mechanicOn(ctx, 'royalMarriage')) { out.why = 'This age does not arrange its marriages between states.'; return out; }
  if (out.married) { out.why = 'Our houses are already joined.'; return out; }
  // A HOUSE, not a crown (SPEC §133). This read `monarchy` on both sides,
  // which quietly shut every Jewish state in the game out of the mechanic
  // for good: JUD, HAS and HYR are all typed `theocracy`, so the Hasmoneans,
  // Hyrcanus and Bar Kokhba could never arrange a match with anybody, in any
  // chapter. That is the wrong answer in a game about them, and it is the
  // wrong answer historically — Herod married Mariamne the Hasmonean to buy
  // exactly the pedigree he lacked, Berenice married Polemo of Cilicia,
  // Drusilla married Azizus of Emesa, and the Hasmonean and Nabataean houses
  // dealt in daughters for a century.
  //
  // What the mechanic actually needs is a ruling house on both sides. A
  // republic elects and a tribal confederation acclaims, so neither has one;
  // a theocracy has a named head and, in this period, a dynasty behind him.
  // The heir bonus (realm.js) still only reaches houses that HAVE heirs, so a
  // theocracy marries for the alliance and the warmth and not for the cradle,
  // which is the honest arrangement.
  //
  // Each government now declares whether it is a house (`dynastic`, SPEC
  // §212), so the adopted constitutions answer for themselves: a Temple-State
  // and a Patriarchate are houses, and the Lot and No Ruler but God — which
  // are the two that abolished the idea of anybody inheriting anything — are
  // not, which is the same sentence read forward.
  if (!govHas(ctx, tag, 'dynastic') || !govHas(ctx, other, 'dynastic')) {
    out.why = 'A match joins two houses, and one of these courts has none to join.';
    return out;
  }
  if (isHostile(ctx, tag, other)) { out.why = 'We are at war with them.'; return out; }
  if (opinionOf(ctx, other, tag) < DIPLO.marryMinOpinion) {
    out.why = 'Their court is too cool for a match (opinion ' + Math.round(opinionOf(ctx, other, tag)) + ', needs ' + DIPLO.marryMinOpinion + '+).';
    return out;
  }
  if (num(me.points && me.points.infl) < DIPLO.marryCost) {
    out.why = 'Arranging the match takes ' + DIPLO.marryCost + ' influence points.';
    return out;
  }
  // A match is a standing bond, and both houses have to keep it (SPEC §202).
  const room = chanceryFullWhy(ctx, tag, true) || chanceryFullWhy(ctx, other, false);
  if (room) { out.why = room; return out; }
  out.can = true;
  return out;
}
export function royalMarriageCore(ctx, tag, other) {
  const info = royalMarriageInfo(ctx, tag, other);
  if (!info.can) return { ok: false, why: info.why };
  const g = ctx.game;
  const me = g.tags[tag];
  const them = g.tags[other];
  me.points.infl = num(me.points.infl) - DIPLO.marryCost;
  if (!Array.isArray(me.marriages)) me.marriages = [];
  if (!Array.isArray(them.marriages)) them.marriages = [];
  me.marriages.push(other);
  them.marriages.push(tag);
  addOpinion(ctx, other, tag, DIPLO.marryOpinionGain);
  addOpinion(ctx, tag, other, DIPLO.marryOpinionGain);
  chronicle(ctx, 'ruler', 'The houses of ' + (me.name || tag) + ' and ' + (them.name || other)
    + ' are joined in marriage.');
  return { ok: true, name: them.name || other };
}
// The match sent home (SPEC §202). The mirror of breakAllianceCore: mutual
// removal, and the other court remembers the insult. War's annulment
// (breakMarriagesForWar, below) is the same act performed with an army, and
// costs more.
export function annulMarriageCore(ctx, tag, other) {
  const g = ctx.game;
  const a = g.tags[tag], b = g.tags[other];
  if (!a || !b) return { ok: false, why: 'No such court.' };
  if (!marriedTo(ctx, tag, other) && !marriedTo(ctx, other, tag)) {
    return { ok: false, why: 'Our houses are not joined.' };
  }
  a.marriages = (a.marriages || []).filter((k) => k !== other);
  b.marriages = (b.marriages || []).filter((k) => k !== tag);
  addOpinion(ctx, other, tag, DIPLO.marryBreakOpinion);
  return { ok: true, name: b.name || other, opinion: DIPLO.marryBreakOpinion };
}
// Drawing the sword on kin annuls the match — and is not forgotten.
export function breakMarriagesForWar(ctx, a, b) {
  const ta = ctx.game.tags[a], tb = ctx.game.tags[b];
  if (!marriedTo(ctx, a, b) && !marriedTo(ctx, b, a)) return false;
  if (ta && Array.isArray(ta.marriages)) ta.marriages = ta.marriages.filter((k) => k !== b);
  if (tb && Array.isArray(tb.marriages)) tb.marriages = tb.marriages.filter((k) => k !== a);
  addOpinion(ctx, a, b, DIPLO.marryWarBreakOpinion);
  addOpinion(ctx, b, a, DIPLO.marryWarBreakOpinion);
  return true;
}

// Mutual removal from both allies arrays; the jilted party's opinion of the
// breaker drops. Returns true only when an alliance actually existed.
export function breakAllianceCore(ctx, breaker, other) {
  const g = ctx.game;
  const a = g.tags[breaker], b = g.tags[other];
  if (!a || !b) return false;
  const had = (a.allies || []).indexOf(other) >= 0 || (b.allies || []).indexOf(breaker) >= 0;
  if (!had) return false;
  a.allies = (a.allies || []).filter((x) => x !== other);
  b.allies = (b.allies || []).filter((x) => x !== breaker);
  addOpinion(ctx, other, breaker, DIPLO.breakOpinion);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// The chancery (SPEC §202): a court has only so many envoys.
//
// Every verb in the diplomacy block wrote a bond that then cost nothing to
// keep. Guarantees, alliances, marriages and subsidies were one-off purchases
// of influence and gold, so the optimal number of every one of them was "all
// of them" — and the client kingdom, whose road runs alliance → collar →
// union, could be farmed: free four states out of a beaten enemy at the table
// (no infamy, §174), collar them with the gratitude the liberation itself
// paid for, and eat them one after another at half a conquest's odium.
//
// A standing bond is not a purchase, it is an ESTABLISHMENT: a household kept
// at a foreign court, a promise somebody has to answer when it is called. So
// a realm has SEATS, it staffs as many bonds as it has seats, and the ones
// past that are paid for monthly out of the same influence that buys claims,
// unions and towns — while every court that owes us nothing reads a crown
// with too many irons in the fire as a crown whose word is thin.
//
// Two rules, one purse:
//   * the chancery's own verbs need a free seat, and the peace table never
//     does — a treaty is force, not diplomacy, and a subjugation clause may
//     put a winner over its own establishment;
//   * a client past the free allowance CHAFES: its regard for its overlord
//     sinks toward a floor set by the strain, which is exactly the number the
//     §61 union is built on. Three clients are a policy; six are a rebellion
//     with a waiting list.
// ─────────────────────────────────────────────────────────────────────────────
export function DIP(ctx, key, fallback) {
  const d = ctx && ctx.DEFINES && ctx.DEFINES.DIPLOMACY;
  const v = d ? d[key] : undefined;
  return Number.isFinite(v) ? v : fallback;
}
// Not every age counts its irons (SPEC §52's gate). The twentieth century
// answers a friend with a bloc — the 1948 chapter's own scripts seat the Arab
// League and the Baghdad Pact as six-member webs of mutual guarantee, which is
// the era's diplomacy and not an overreach to be fined. `diploCapacity: false`
// switches the whole section off, establishment, strain and all.
export function chanceryOn(ctx) { return mechanicOn(ctx, 'diploCapacity'); }

// What the establishment can staff: a base every court has, a seat for every
// few points of influence technology (a bigger chancery is a thing states
// learn), one for a ruler who is good at this, and whatever a reform, an idea
// or an event has added through the ordinary modifier pipe (`diploSeats`).
export function diploCapacity(ctx, tag) {
  const t = ctx.game.tags[tag];
  if (!t) return 0;
  let seats = DIP(ctx, 'capacityBase', 4);
  const step = Math.max(1, DIP(ctx, 'capacityPerTech', 3));
  seats += Math.min(DIP(ctx, 'capacityTechMax', 3),
    Math.floor(Math.max(0, num(t.tech && t.tech.infl)) / step));
  if (t.ruler && num(t.ruler.infl) >= DIP(ctx, 'capacityRulerSkill', 4)) seats += 1;
  seats += Math.round(resolveTagAdd(ctx, tag, 'diploSeats'));
  return Math.max(1, Math.round(seats));
}
// One row per seat spent. A guarantee somebody extends to US is their seat and
// not ours; reparations and a donor's aid are flows this court never chose, so
// neither costs it an envoy; and being somebody's client is a bond the LORD
// staffs — a collared crown is not billed for its own collar.
export function diploBonds(ctx, tag) {
  const g = ctx.game;
  const t = g.tags[tag];
  const out = [];
  if (!t) return out;
  const living = (k) => k && k !== tag && g.tags[k] && g.tags[k].alive;
  const nameOf = (k) => (g.tags[k] && g.tags[k].name) || k;
  const seen = new Set();
  const add = (kind, label, k) => {
    const key = kind + ':' + k;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ kind, label, tag: k, name: nameOf(k) });
  };
  for (const k of t.allies || []) if (living(k)) add('ally', 'Alliance', k);
  for (const k of t.guarantees || []) if (living(k)) add('guarantee', 'Guarantee', k);
  for (const k of t.marriages || []) if (living(k)) add('marriage', 'Royal marriage', k);
  for (const s of g.subsidies || []) {
    if (!s || s.from !== tag || s.reparation || s.aid) continue;
    if (living(s.to)) add('subsidy', 'Subsidy', s.to);
  }
  for (const k of vassalsOf(ctx, tag)) if (living(k)) add('client', 'Client kingdom', k);
  return out;
}
// The whole read, for the gates and for the panel.
export function diploLoad(ctx, tag) {
  const on = chanceryOn(ctx);
  const bonds = diploBonds(ctx, tag);
  const capacity = diploCapacity(ctx, tag);
  return {
    on, bonds, capacity,
    seats: bonds.length,
    free: Math.max(0, capacity - bonds.length),
    over: on ? Math.max(0, bonds.length - capacity) : 0,
  };
}
// Is there a seat for one more? Returns the refusal in words, or '' — phrased
// from our side of the table or theirs, because both courts must staff a bond
// that binds them both.
export function chanceryFullWhy(ctx, tag, mine) {
  if (!chanceryOn(ctx)) return '';
  const l = diploLoad(ctx, tag);
  if (l.seats < l.capacity) return '';
  const name = (ctx.game.tags[tag] && ctx.game.tags[tag].name) || tag;
  return mine
    ? 'Our chancery is full — ' + l.seats + ' standing bonds and seats for ' + l.capacity
      + '. End one, or grow the establishment, before we swear another.'
    : 'The chancery of ' + name + ' is full — ' + l.seats + ' standing bonds of ' + l.capacity
      + '. They have no envoy to spare for us.';
}
// The collar chafes: a client kingdom's own liberty desire, read off the same
// two things EU4 reads it off — how many collars the crown holds, and how much
// of the crown they are between them.
// `pre` is the monthly pass's shared arithmetic (one province sweep for every
// court instead of one per client); every other caller omits it and pays the
// ordinary price.
export function clientStrain(ctx, lord, pre) {
  const out = { on: chanceryOn(ctx), clients: 0, share: 0, strain: 0, floor: 0 };
  const clients = (pre && pre.clients) || vassalsOf(ctx, lord);
  out.clients = clients.length;
  if (!out.on || !clients.length) return out;
  const devOf = (pre && pre.devOf) || ((k) => devOfTag(ctx, k));
  const mine = Math.max(1, devOf(lord));
  let theirs = 0;
  for (const k of clients) theirs += devOf(k);
  out.share = Math.round((theirs / mine) * 100) / 100;
  const raw = Math.max(0, clients.length - DIP(ctx, 'freeClients', 3)) * DIP(ctx, 'strainPerClient', 2)
    + Math.max(0, out.share - DIP(ctx, 'strainFreeShare', 0.5)) * DIP(ctx, 'strainPerShare', 8);
  out.strain = Math.round(Math.min(DIP(ctx, 'strainMax', 8), raw) * 10) / 10;
  out.floor = -Math.min(DIP(ctx, 'strainFloorMax', 60),
    Math.round(out.strain * DIP(ctx, 'strainFloorPer', 10)));
  return out;
}
// A court freed at OUR table does not kneel to the hand that freed it — not
// while the people who saw it happen are alive (SPEC §202). Returns the months
// still to run, or 0.
export function freedCollarMonthsLeft(ctx, tag, by) {
  const t = ctx.game.tags[tag];
  const f = t && t.freedBy;
  if (!f || f.by !== by) return 0;
  const total = DIP(ctx, 'freedCollarMonths', 120);
  const since = monthsBetween({ y: num(f.y), m: num(f.m, 1) }, ctx.game.date);
  return Math.max(0, Math.round(total - since));
}
// Monthly: the establishment is paid for, the world reads the overreach, and
// the collars chafe. Runs before the ordinary opinion drift.
export function monthlyChancery(ctx) {
  const g = ctx.game;
  if (!chanceryOn(ctx)) return;
  // One sweep of the map and one of the courts, shared by every strain read
  // below — the alternative is a province pass per client per month.
  const dev = Object.create(null);
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || !p.owner) continue;
    dev[p.owner] = num(dev[p.owner]) + devTotal(p);
  }
  const devOf = (k) => num(dev[k]);
  const clientsOf = Object.create(null);
  for (const k of Object.keys(g.tags)) {
    const t = g.tags[k];
    if (!t || !t.alive || !t.overlord) continue;
    (clientsOf[t.overlord] = clientsOf[t.overlord] || []).push(k);
  }
  for (const tag of Object.keys(g.tags)) {
    const t = g.tags[tag];
    if (!t || !t.alive || tag === 'REB') continue;
    const load = diploLoad(ctx, tag);
    if (load.over > 0) {
      // The envoys past the establishment are paid out of the influence that
      // would have bought a claim, a union or a town.
      if (t.points) {
        t.points.infl = Math.max(0, num(t.points.infl) - load.over * DIP(ctx, 'overInfl', 2));
      }
      // …and every court we owe nothing reads the overreach. Courts already
      // bound to us are the ones being served, so they are not the ones who
      // think less of us for it.
      const bite = load.over * DIP(ctx, 'overOpinion', 1);
      if (bite > 0) {
        const bound = new Set(load.bonds.map((b) => b.tag));
        if (t.overlord) bound.add(t.overlord);
        for (const other of Object.keys(g.tags)) {
          const o = g.tags[other];
          if (!o || !o.alive || other === tag || other === 'REB' || bound.has(other)) continue;
          if (!o.opinion) o.opinion = {};
          o.opinion[tag] = clamp(num(o.opinion[tag]) - bite, -200, 200);
        }
      }
    }
    // The notice, once per crossing, and only to the court a player holds.
    const strained = load.over > 0;
    if (!!t.diploStrained !== strained) {
      t.diploStrained = strained;
      if (tag === g.playerTag && ctx.bus) {
        ctx.bus.emit('notify', strained ? {
          title: 'The chancery is overstretched',
          text: 'We keep ' + load.seats + ' standing bonds and have seats for ' + load.capacity
            + '. The ' + load.over + ' beyond the establishment cost '
            + (load.over * DIP(ctx, 'overInfl', 2)) + ' influence a month, and courts that owe us '
            + 'nothing think a little less of us every month we keep them.',
          type: 'bad',
        } : {
          title: 'The chancery is in order',
          text: 'Our standing bonds are back inside the establishment (' + load.seats
            + ' of ' + load.capacity + '). The envoys are paid for.',
          type: 'good',
        });
      }
    }
    // The collars chafe. Strain sours a client toward a floor and no further:
    // it is what makes a wide client empire undigestible (the §61 union needs
    // devotion), not a machine for manufacturing risings.
    const clients = clientsOf[tag] || [];
    const cs = clientStrain(ctx, tag, { clients, devOf });
    if (cs.strain > 0) {
      for (const k of clients) {
        const c = g.tags[k];
        if (!c || !c.alive) continue;
        if (!c.opinion) c.opinion = {};
        const v = num(c.opinion[tag]);
        if (v > cs.floor) c.opinion[tag] = clamp(Math.max(cs.floor, v - cs.strain), -200, 200);
      }
    }
  }
}

// ---------------------------------------------------------------- peace
// EU4-style negotiated peace: the offering side assembles a deal — occupied
// enemy provinces (warscore cost scales with development), an indemnity in
// talents, a humiliation — and the enemy accepts when the offerer's warscore
// covers the total. The bookmark's scripted war (war.noNegotiation) resolves
// only through events/victory.
export const PEACE = {
  provCostPerDev: 0.9,   // warscore per point of demanded development
  provCostMin: 4,        // floor per province
  claimDiscount: 0.7,    // claimed provinces cost 30% less
  faithDiscount: 0.8,    // co-religionist provinces cost 20% less
  goalProvinceDiscount: 0.65, // the declared territorial objective is cheaper
  goalLiberationDiscount: 0.7, // releases/clients central to a political war
  goalUnrelatedMult: 1.25, // unrelated annexations exceed the war's mandate
  goalDismantleCessionMult: 1.35, // containment prefers dismantling to conquest
  goalSubjugateDiscount: 0.65, // restored yokes and succession claims
  goldCostPer100: 10,    // warscore per 100 talents demanded
  goldStep: 25,          // UI stepper granularity
  humiliateCost: 15,
  reparationsCost: 15,   // warscore for 8 talents/month over 24 months (SPEC §24)
  reparationsAmount: 8,
  reparationsMonths: 24,
  subjugateBase: 25,     // warscore to make the enemy leader a client kingdom...
  subjugatePerDev: 0.25, // ...plus this per point of their total development
  subjugateMax: 100,
  releaseCostPerDev: 0.5, // warscore per point of development set free or returned
  releaseCostMin: 10,     // floor per released/created nation
  transferVassalBase: 15, // warscore to take over an enemy client...
  transferVassalPerDev: 0.25, // ...plus this per point of the client's own development
  transferVassalMax: 80,
  tributeShare: 0.15,    // of a client's income, paid to the overlord (economy.js)
  whiteEnemyWsAtMost: 5, // enemy accepts a white peace at/below this net score
  warWearyWE: 15,        // war exhaustion at which a not-quite-winning enemy takes white peace
  freshWarMonths: 12,    // a war younger than this refuses white peace unless the enemy is losing
  withdrawWhiteGrace: 15, // extra tolerance for a JUNIOR's white withdrawal — the enemy is glad to shed a coalition member
};
// ─────────────────────────────────────────────────────────────────────────────
// The offered collar (SPEC §92): clientship without a war.
//
// Every road to a client kingdom ran through a battlefield — the peace table's
// subjugation clause, or §76's transfer of somebody else's vassal. But a small
// state beside a large friendly one has always had a third option, and it is
// the one most of the real client kingdoms of this map actually took: ask for
// the protection before the alternative arrives. So a court that is our sworn
// ally, markedly weaker than us, and devoted to us may be offered the collar.
//
// It costs no infamy, because nobody was conquered. It costs influence, a
// little of their pride, and — if they refuse — a decade of goodwill.
// ─────────────────────────────────────────────────────────────────────────────
export function devOfTag(ctx, tag) {
  const g = ctx.game;
  let d = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.owner === tag) d += devTotal(p);
  }
  return d;
}
// Is this court in trouble it cannot get out of alone? A state at war with
// somebody markedly bigger hears an offer of protection very differently.
function isThreatened(ctx, tag) {
  const g = ctx.game;
  const t = g.tags[tag];
  if (!t) return false;
  const mine = devOfTag(ctx, tag);
  for (const e of t.atWarWith || []) {
    const et = g.tags[e];
    if (!et || !et.alive) continue;
    if (devOfTag(ctx, e) > mine * 1.5) return true;
  }
  return false;
}
export function clientOfferInfo(ctx, me, them) {
  const g = ctx.game;
  const mine = g.tags[me], theirs = g.tags[them];
  if (!mine || !theirs || me === them || !theirs.alive) return null;
  const B_ = (ctx.DEFINES && ctx.DEFINES.BALANCE) || {};
  const myDev = devOfTag(ctx, me);
  const theirDev = devOfTag(ctx, them);
  const opinion = opinionOf(ctx, them, me);
  const allied = (mine.allies || []).indexOf(them) >= 0
    || (theirs.allies || []).indexOf(me) >= 0;
  const share = myDev > 0 ? theirDev / myDev : 99;
  const out = {
    cost: DIPLO.clientOfferInfl,
    opinion,
    need: DIPLO.clientOfferMinOpinion,
    myDev: Math.round(myDev),
    theirDev: Math.round(theirDev),
    maxShare: DIPLO.clientOfferDevShare,
    share: Math.round(share * 100) / 100,
    threatened: isThreatened(ctx, them),
    can: false,
    why: '',
  };
  // Not every age keeps clients (SPEC §142). Where the chapter has switched
  // the institution off, the offer is not merely refused — it cannot be made.
  if (!mechanicOn(ctx, 'clientKingdoms')) {
    out.why = 'This age has no client kingdoms. A state is sovereign or it is occupied; '
      + 'there is nothing in between for a treaty to write down.';
  } else if (theirs.overlord === me) out.why = 'They are already our client kingdom.';
  else if (theirs.overlord) {
    out.why = 'They already answer to '
      + ((g.tags[theirs.overlord] && g.tags[theirs.overlord].name) || theirs.overlord) + '.';
  } else if (mine.overlord) out.why = 'A client kingdom does not keep client kingdoms of its own.';
  else if ((mine.atWarWith || []).indexOf(them) >= 0) out.why = 'We are at war with them.';
  else if (!allied) out.why = 'Only a sworn ally would hear such an offer.';
  // The freed do not kneel to the hand that freed them (SPEC §202). Liberating
  // a people at the table and collaring it in the same generation is the one
  // move this mechanism exists to stop being free: the gratitude §174 paid for
  // is not a down payment on a collar, and everyone at that table remembers.
  else if (freedCollarMonthsLeft(ctx, them, me) > 0) {
    const left = freedCollarMonthsLeft(ctx, them, me);
    out.why = 'We freed them at the peace table. A crown that frees a people and collars it in '
      + 'the same generation is not believed the next time it frees anybody ('
      + Math.round(left / 12) + ' year' + (Math.round(left / 12) === 1 ? '' : 's')
      + ' before the offer can be made).';
  }
  else if (share > DIPLO.clientOfferDevShare) {
    out.why = 'They are too great to be anyone\'s client (' + out.theirDev
      + ' development against our ' + out.myDev + '; we need to be twice their size).';
  } else if (opinion < DIPLO.clientOfferMinOpinion) {
    out.why = 'They do not love us nearly enough (' + opinion + ' of '
      + DIPLO.clientOfferMinOpinion + ' needed to even ask).';
  } else if (diploCdActive(ctx, me + '>' + them + ':client')) {
    out.why = 'We asked once and were refused ('
      + diploCdMonthsLeft(ctx, me + '>' + them + ':client') + ' months before they will hear it again).';
  } else if (num(mine.points && mine.points.infl) < DIPLO.clientOfferInfl) {
    out.why = 'Not enough influence (' + DIPLO.clientOfferInfl + ' required).';
  }
  out.can = !out.why;
  // What they will say, shown before it is asked — this is a decade-long
  // mistake to make blind.
  out.willAccept = out.can && (opinion >= DIPLO.clientOfferAcceptOpinion
    || out.threatened
    || share <= DIPLO.clientOfferSmallShare);
  return out;
}
export function offerClientshipCore(ctx, me, them) {
  const info = clientOfferInfo(ctx, me, them);
  if (!info || !info.can) return { ok: false, why: info ? info.why : 'There is no such court.' };
  const g = ctx.game;
  const mine = g.tags[me], theirs = g.tags[them];
  mine.points.infl = num(mine.points.infl) - info.cost;
  const name = theirs.name || them;
  if (!info.willAccept) {
    addOpinion(ctx, them, me, DIPLO.clientOfferRefuseOpinion);
    setDiploCd(ctx, me + '>' + them + ':client', DIPLO.clientOfferCdMonths);
    return { ok: true, accepted: false, name };
  }
  // The bond replaces every other: a client keeps no outside alliances, and
  // the alliance that made this possible becomes the fealty itself.
  for (const al of (theirs.allies || []).slice()) breakAllianceCore(ctx, them, al);
  theirs.overlord = me;
  theirs.incorporating = null;
  addOpinion(ctx, them, me, DIPLO.clientOfferAcceptOpinionHit);
  // No infamy. Nobody was conquered — this is the distinction the whole
  // mechanism exists to draw.
  return { ok: true, accepted: true, name, dev: info.theirDev };
}

export function enemySideOf(war, tag) {
  return war.attackers.indexOf(tag) >= 0 ? war.defenders : war.attackers;
}
// The bilateral ledger behind a separate peace (SPEC §67): how the war
// stands between us and ONE member of the enemy coalition. Occupation of
// their own land and their war exhaustion push them toward the door; land
// they hold of ours holds them in. Side-pooled battle glory counts at half
// weight — a coalition member shares its side's victories, but feels its
// own burned fields entirely.
export function separateWarscore(ctx, war, byTag, enemyTag) {
  const g = ctx.game;
  const att = war.attackers.indexOf(byTag) >= 0;
  const mySide = att ? war.attackers : war.defenders;
  const myKey = att ? 'att' : 'def';
  const theirKey = att ? 'def' : 'att';
  let theirDev = 0, occByUs = 0, ourDev = 0, occByThem = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    const d = devTotal(p);
    if (p.owner === enemyTag) {
      theirDev += d;
      if (mySide.indexOf(p.controller) >= 0) occByUs += d;
    } else if (mySide.indexOf(p.owner) >= 0) {
      ourDev += d;
      if (p.controller === enemyTag) occByThem += d;
    }
  }
  const occ = theirDev > 0 ? (occByUs / theirDev) * 60 : 0;
  const counterOcc = ourDev > 0 ? (occByThem / ourDev) * 60 : 0;
  const battles = war._bs ? clamp((num(war._bs[myKey]) - num(war._bs[theirKey])) * 0.5, -20, 20) : 0;
  const et = g.tags[enemyTag];
  const weary = Math.min(20, num(et && et.warExhaustion) * 1.5);
  return Math.round(clamp(occ - counterOcc + battles + weary, -100, 100));
}
// The anti-snowball dial block (SPEC §21 extended, defines.js BALANCE).
export function BAL(ctx, key, fallback) {
  const b = ctx && ctx.DEFINES && ctx.DEFINES.BALANCE;
  const v = b ? b[key] : undefined;
  return Number.isFinite(v) ? v : fallback;
}
// Infamy earned for taking `dev` points of land in one settlement.
function infamyForDev(ctx, dev) {
  return Math.round(Math.max(0, dev) * BAL(ctx, 'infamyPerDev', 0.5));
}
// The side of `war` that fought for its own freedom, if any (SPEC §174):
// 'att'/'def' or null. Stamped by declareWar for the independence CB and by
// hand on the scripted revolts; old saves reconstruct it from `war.cb`.
export function independenceSideOf(war) {
  if (!war) return null;
  if (war.independenceSide === 'att' || war.independenceSide === 'def') return war.independenceSide;
  return war.cb === 'independence' ? 'att' : null;
}
// The land freedom stands on (SPEC §174): a province of the taker's own
// faith outside the diaspora — the same line the authored concessions draw
// with their `keep` predicates. Within a war of independence the rising side
// pays no infamy for this soil; anything beyond it still prices as conquest.
function liberatedSoil(ctx, p, takerTag) {
  const t = ctx.game.tags[takerTag];
  if (!t || !p || !p.religion || p.religion !== t.religion) return false;
  return ((ctx.DEFINES && ctx.DEFINES.DIASPORA) || []).indexOf(p.canon || p.name) < 0;
}
function provDemandCost(ctx, p, byTag) {
  let cost = devTotal(p) * PEACE.provCostPerDev;
  // Alien land is dearer at the table: a province of another religious group
  // resists absorption, and the world prices that resistance in.
  const R = ctx.DEFINES.RELIGIONS || {};
  const me = ctx.game.tags[byTag];
  const myGroup = me && R[me.religion] ? R[me.religion].group : null;
  const provGroup = R[p.religion] ? R[p.religion].group : null;
  if (myGroup && provGroup && myGroup !== provGroup) cost *= BAL(ctx, 'peaceAlienMult', 1.25);
  return Math.max(PEACE.provCostMin, Math.round(cost));
}

function goalSideIsAttacker(war, byTag) {
  return !!(war && war.attackers && war.attackers.indexOf(byTag) >= 0);
}

function goalProvinceAdjustment(ctx, war, byTag, provId) {
  const goal = ensureWarGoal(ctx, war);
  if (!goal) return { mult: 1, aligned: false, reason: '' };
  const attacker = goalSideIsAttacker(war, byTag);
  const targeted = (goal.targetProvIds || []).indexOf(provId | 0) >= 0;
  if (attacker && (goal.type === 'claim' || goal.type === 'conquest')) {
    return targeted
      ? { mult: PEACE.goalProvinceDiscount, aligned: true, reason: 'war goal' }
      : { mult: PEACE.goalUnrelatedMult, aligned: false, reason: 'outside the war goal' };
  }
  if (attacker && (goal.type === 'holy' || goal.type === 'liberation')) {
    return targeted
      ? { mult: PEACE.goalLiberationDiscount, aligned: true, reason: 'liberation objective' }
      : { mult: PEACE.goalUnrelatedMult, aligned: false, reason: 'outside the liberation' };
  }
  if (attacker && (goal.type === 'containment' || goal.type === 'coalition')) {
    return { mult: PEACE.goalDismantleCessionMult, aligned: false, reason: 'containment favors dismantling' };
  }
  if (attacker && goal.type === 'succession') {
    return targeted
      ? { mult: PEACE.goalLiberationDiscount, aligned: true, reason: 'seat of succession' }
      : { mult: PEACE.goalUnrelatedMult, aligned: false, reason: 'outside the succession claim' };
  }
  if (goal.type === 'independence' || !attacker) {
    return { mult: PEACE.goalUnrelatedMult, aligned: false, reason: 'outside the defensive mandate' };
  }
  return { mult: 1, aligned: false, reason: '' };
}

function goalReleaseAdjustment(ctx, war, byTag, provIds) {
  const goal = ensureWarGoal(ctx, war);
  if (!goal || !goalSideIsAttacker(war, byTag)) return { mult: 1, aligned: false, reason: '' };
  if (goal.type === 'containment' || goal.type === 'coalition') {
    return { mult: PEACE.goalLiberationDiscount, aligned: true, reason: 'dismantling objective' };
  }
  if (goal.type === 'holy' || goal.type === 'liberation') {
    const targets = new Set(goal.targetProvIds || []);
    if ((provIds || []).some((id) => targets.has(id))) {
      return { mult: PEACE.goalLiberationDiscount, aligned: true, reason: 'liberation objective' };
    }
  }
  return { mult: 1, aligned: false, reason: '' };
}

function goalTransferAdjustment(ctx, war, byTag) {
  const goal = ensureWarGoal(ctx, war);
  if (goal && goalSideIsAttacker(war, byTag)
      && (goal.type === 'containment' || goal.type === 'coalition')) {
    return { mult: PEACE.goalLiberationDiscount, aligned: true, reason: 'containment objective' };
  }
  return { mult: 1, aligned: false, reason: '' };
}

function goalSubjugateAdjustment(ctx, war, byTag) {
  const goal = ensureWarGoal(ctx, war);
  if (!goal) return { mult: 1, aligned: false, reason: '' };
  const attacker = goalSideIsAttacker(war, byTag);
  if ((goal.type === 'independence' && !attacker)
      || (goal.type === 'succession' && attacker)) {
    return { mult: PEACE.goalSubjugateDiscount, aligned: true, reason: goal.type + ' objective' };
  }
  return { mult: 1, aligned: false, reason: '' };
}
// The owner a province had when the era opened — static data, recomputable
// from the bookmark's owners table over the base map (so no save schema is
// touched). This is what "whose nation was this land" means at the peace
// table: the fallen court it can be restored to.
export function eraOwnerOf(ctx, p) {
  if (!p) return null;
  const src = ctx.MAP_DATA && Array.isArray(ctx.MAP_DATA.provinces) ? ctx.MAP_DATA.provinces[p.id - 1] : null;
  if (!src) return null;
  const table = ctx.bookmark && ctx.bookmark.owners;
  if (table) {
    if (Object.prototype.hasOwnProperty.call(table, src.name)) return table[src.name];
    if (src.latentParent && Object.prototype.hasOwnProperty.call(table, src.latentParent)) {
      return table[src.latentParent];
    }
  }
  return src.owner || 'WASTE';
}

function tagDevelopment(ctx, tag) {
  let dev = 0;
  for (let i = 1; i < ctx.game.provinces.length; i++) {
    const p = ctx.game.provinces[i];
    if (p && !p.impassable && p.owner === tag) dev += devTotal(p);
  }
  return dev;
}

function stableStateHash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function culturalStateIdentity(culture, religion) {
  return String(culture || 'mixed') + '|' + String(religion || 'local');
}

// Synthetic cultural states use a deterministic short tag. The identity is
// also written onto the live court, so a later treaty returns more of the same
// homeland to the existing state instead of creating a duplicate.
function culturalStateTag(ctx, identity, reserved) {
  for (const tag of Object.keys(ctx.game.tags || {})) {
    const t = ctx.game.tags[tag];
    if (t && t.releaseIdentity === identity) return tag;
  }
  let salt = 0;
  while (salt < 46656) {
    const n = (stableStateHash((ctx.game.bookmarkId || '') + '|' + identity) + salt) % 46656;
    const tag = 'F' + n.toString(36).toUpperCase().padStart(3, '0');
    const live = ctx.game.tags[tag];
    if ((!live || live.releaseIdentity === identity) && (!reserved || !reserved.has(tag))) return tag;
    salt++;
  }
  return 'FREE';
}

// A state has to be somewhere (SPEC §109). Both release paths below group the
// enemy's provinces by an ABSTRACTION — the nation that was born owning them,
// or the culture and faith that live in them — and neither abstraction knows
// anything about geography. Against a Seleucid empire that grouping offered a
// single "Greek State" of twenty-two provinces in five disconnected pieces:
// nine in Anatolia, five in the Decapolis, three on the Philistine coast,
// three on the Syrian coast and two in Samaria. That is not a country. It is a
// census category with a flag.
//
// So a release is resolved to ONE piece of connected land before it is
// offered. Adjacency is the land graph the armies walk: an island pocket is
// its own piece and usually loses to a mainland one, which is correct — a
// state released across a sea it cannot march is the same bug wearing a boat.
// Is the adjacency graph telling us anything? A bare headless harness builds
// `neighbors` as an array of EMPTY sets, which is indistinguishable from a map
// where every province is an island — and would silently fragment every
// release into single provinces. A graph with no edges at all cannot answer
// the contiguity question, so it is not asked.
// SPEC §116. Edges are not a map. The older suites build a geometry where
// province i borders i±1 — a line of beads whose edges are perfectly real and
// mean nothing about where anything is. `geomHasEdges` cannot tell that from a
// map, so anything reasoning about GEOGRAPHY (rather than merely about
// connectedness) has to ask a second question: does this graph have the shape
// of a map? A real province borders four to six others; a bead borders two. The
// threshold sits between them and needs no tuning, because nothing real lands
// near it.
function geomIsMapLike(ctx) {
  const nb = ctx.geom && ctx.geom.neighbors;
  if (!nb || !geomHasEdges(ctx)) return false;
  if (ctx._geomMapLike === undefined) {
    let cells = 0;
    let edges = 0;
    for (let i = 1; i < nb.length; i++) {
      const s = nb[i];
      const n = s ? (s.size !== undefined ? s.size : s.length) : 0;
      if (!n) continue;
      cells++;
      edges += n;
    }
    ctx._geomMapLike = cells > 0 && (edges / cells) >= 3;
  }
  return ctx._geomMapLike;
}

function geomHasEdges(ctx) {
  const nb = ctx.geom && ctx.geom.neighbors;
  if (!nb) return false;
  if (ctx._geomEdges === undefined) {
    let any = false;
    for (let i = 1; i < nb.length; i++) {
      const s = nb[i];
      if (s && (s.size || (Array.isArray(s) && s.length))) { any = true; break; }
    }
    ctx._geomEdges = any;
  }
  return ctx._geomEdges;
}
function landComponents(ctx, ids) {
  const nb = ctx.geom && ctx.geom.neighbors;
  if (!nb || !geomHasEdges(ctx)) return [ids.slice()];
  const pool = new Set(ids);
  const seen = new Set();
  const out = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const stack = [id];
    const comp = [];
    seen.add(id);
    while (stack.length) {
      const cur = stack.pop();
      comp.push(cur);
      for (const n of (nb[cur] || [])) {
        if (pool.has(n) && !seen.has(n)) { seen.add(n); stack.push(n); }
      }
    }
    out.push(comp);
  }
  return out;
}
function componentDev(ctx, comp) {
  return comp.reduce((s, id) => s + devTotal(ctx.byId(id) || {}), 0);
}
// Which piece the treaty actually hands over. A state that already exists and
// holds land grows along its OWN border — the piece touching or containing it —
// so a second treaty enlarges a country instead of scattering it. A state
// being created or restored from nothing takes its largest piece, and is
// seated in it.
function contiguousRelease(ctx, tag, ids) {
  const comps = landComponents(ctx, ids);
  if (comps.length <= 1) return ids.slice();
  const g = ctx.game;
  const t = tag ? g.tags[tag] : null;
  if (t && t.alive) {
    const own = new Set();
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (p && !p.impassable && p.owner === tag) own.add(i);
    }
    if (own.size) {
      const nb = ctx.geom && ctx.geom.neighbors;
      const touching = comps.filter((c) => c.some((id) => own.has(id)
        || (nb && [...(nb[id] || [])].some((n) => own.has(n)))));
      if (touching.length) {
        touching.sort((a, b) => componentDev(ctx, b) - componentDev(ctx, a));
        return touching[0].slice();
      }
    }
  }
  comps.sort((a, b) => componentDev(ctx, b) - componentDev(ctx, a) || b.length - a.length);
  return comps[0].slice();
}

function releaseRow(ctx, tag, ids, kind, extra) {
  const g = ctx.game;
  const dev = ids.reduce((s, id) => s + devTotal(ctx.byId(id) || {}), 0);
  const t = g.tags[tag];
  const def = (ctx.DEFINES.TAGS || {})[tag] || {};
  return {
    tag,
    name: (extra && extra.name) || (t && t.name) || def.name || tag,
    kind,
    origin: (extra && extra.origin) || 'historical',
    culture: extra && extra.culture,
    religion: extra && extra.religion,
    releaseIdentity: extra && extra.releaseIdentity,
    color: extra && extra.color,
    capitalId: (extra && extra.capitalId) || ids[0] || 0,
    provIds: ids,
    provNames: ids.map((id) => { const q = ctx.byId(id); return q ? q.name : null; }).filter(Boolean),
    dev,
    cost: Math.max(PEACE.releaseCostMin, Math.round(dev * PEACE.releaseCostPerDev)),
  };
}

// Force them to free nations (EU4-style, widened in SPEC §76):
//   * a dead historical court can be restored;
//   * a living non-belligerent court can have its old homeland returned;
//   * land with no surviving historical claimant can become a new cultural
//     state. This last path does NOT require a country to have existed at the
//     bookmark opening, or to have been conquered during the present game.
// War participants are skipped as recipients, overlapping homelands are
// resolved in favor of the historical court, and a crown always keeps its own
// capital — liberation may dismember an empire, not behead it.
export function releasableNations(ctx, war, byTag, enemyTag) {
  const g = ctx.game;
  const out = [];
  if (!war || !enemyTag) return out;
  const enemy = g.tags[enemyTag];
  const enemyDef = tagDef(ctx, enemyTag);
  const capital = enemyDef.capital || (enemy && enemy.dynamicCapital) || null;
  const participants = war.attackers.concat(war.defenders);
  const byNation = {};
  const assigned = new Set();
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== enemyTag) continue;
    if (capital && (p.canon || p.name) === capital) continue;
    const born = eraOwnerOf(ctx, p);
    if (!born || born === enemyTag || born === byTag || born === 'WASTE' || born === 'REB') continue;
    const t = g.tags[born];
    if (participants.indexOf(born) >= 0) continue;
    if (!t && !(ctx.DEFINES.TAGS || {})[born]) continue;
    (byNation[born] = byNation[born] || []).push(i);
    assigned.add(i);
  }
  for (const tag of Object.keys(byNation)) {
    // One piece of connected land, not every scrap of an old homeland the
    // enemy happens to be sitting on (SPEC §109).
    const ids = contiguousRelease(ctx, tag, byNation[tag]);
    if (!ids.length) continue;
    const t = g.tags[tag];
    out.push(releaseRow(ctx, tag, ids, t && t.alive ? 'return' : 'restore'));
  }

  // The rest of the enemy's non-capital territory is divisible into cultural
  // states. Culture + faith is the durable identity: it survives owner
  // changes and does not rely on a "recent conquest" flag or a save migration.
  const byIdentity = {};
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== enemyTag || assigned.has(i)) continue;
    if (capital && (p.canon || p.name) === capital) continue;
    if (!p.culture || !p.religion) continue;
    const identity = culturalStateIdentity(p.culture, p.religion);
    (byIdentity[identity] = byIdentity[identity] || []).push(i);
  }
  const reserved = new Set(Object.keys(g.tags || {}));
  for (const identity of Object.keys(byIdentity)) {
    // Same rule, and it matters far more here: culture and faith say nothing
    // whatever about geography, so this grouping is where the twenty-two
    // province, five-piece "Greek State" came from (SPEC §109).
    // If a state of this identity already exists on the map, the treaty
    // enlarges IT along its own border; otherwise the largest piece is taken
    // and seated. Looked up by identity rather than by the generated tag,
    // which can collide and would otherwise steer the choice by an unrelated
    // court's holdings.
    let standing = null;
    for (const k of Object.keys(g.tags)) {
      if (g.tags[k] && g.tags[k].releaseIdentity === identity) { standing = k; break; }
    }
    const ids = contiguousRelease(ctx, standing, byIdentity[identity]);
    if (!ids.length) continue;
    let seat = ctx.byId(ids[0]);
    for (const id of ids) {
      const p = ctx.byId(id);
      if (p && (!seat || devTotal(p) > devTotal(seat))) seat = p;
    }
    const sample = seat || ctx.byId(ids[0]);
    const culture = sample && sample.culture;
    const religion = sample && sample.religion;
    const tag = culturalStateTag(ctx, identity, reserved);
    reserved.add(tag);
    if (participants.indexOf(tag) >= 0 || tag === enemyTag || tag === byTag) continue;
    const existing = g.tags[tag];
    const cultureDef = (ctx.DEFINES.CULTURES || {})[culture] || {};
    const baseColor = Array.isArray(cultureDef.color) ? cultureDef.color : [112, 118, 126];
    const shade = (stableStateHash(identity) % 31) - 15;
    const color = baseColor.map((v, idx) => clamp(Math.round(v + shade + (idx === 2 ? 12 : 0)), 24, 224));
    const name = existing && existing.name
      ? existing.name
      : ((cultureDef.name || 'Free') + ' State of ' + ((seat && seat.name) || 'the Provinces'));
    out.push(releaseRow(ctx, tag, ids, existing && existing.alive ? 'return'
      : existing ? 'restore' : 'create', {
      name,
      origin: 'cultural',
      culture,
      religion,
      releaseIdentity: identity,
      color,
      capitalId: seat && seat.id,
    }));
  }
  out.sort((a, b) => b.dev - a.dev || a.name.localeCompare(b.name));
  return out;
}

// An enemy's direct clients can be reassigned at the full congress. This is a
// relationship term, not annexation: the client keeps every province, army,
// ruler and institution, but its tribute and war duty point to the victor.
export function transferableVassals(ctx, war, byTag) {
  const g = ctx.game;
  if (!war || !byTag) return [];
  // Taking somebody else's client is still acquiring one (SPEC §142), so it
  // goes when the institution does. A chapter that starts with vassals and
  // then switches the mechanic off keeps them — this bars the acquiring, not
  // the having.
  if (!mechanicOn(ctx, 'clientKingdoms')) return [];
  const theirSide = enemySideOf(war, byTag);
  const out = [];
  for (const tag of Object.keys(g.tags)) {
    const t = g.tags[tag];
    if (!t || !t.alive || !t.overlord || t.overlord === byTag) continue;
    if (theirSide.indexOf(t.overlord) < 0) continue;
    const dev = tagDevelopment(ctx, tag);
    if (dev <= 0) continue;
    const ids = [];
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (p && !p.impassable && p.owner === tag) ids.push(i);
    }
    out.push({
      tag,
      name: t.name || tag,
      from: t.overlord,
      fromName: (g.tags[t.overlord] && g.tags[t.overlord].name) || t.overlord,
      provIds: ids,
      dev,
      cost: clamp(Math.round(PEACE.transferVassalBase + dev * PEACE.transferVassalPerDev),
        PEACE.transferVassalBase, PEACE.transferVassalMax),
    });
  }
  out.sort((a, b) => b.dev - a.dev || a.name.localeCompare(b.name));
  return out;
}
// Everything the peace dialog needs: our score, the enemy leader, which
// provinces are on the table (enemy-owned, our-side-occupied) and their costs
// (discounted by claims and shared faith), plus subjugation terms.
// With `enemyTag` (SPEC §67) the table is a SEPARATE PEACE with that one
// coalition member: only their provinces, their gold, their exhaustion — and
// the bilateral separateWarscore instead of the side ledger. Valid only
// while at least one other enemy remains to carry the war on.
// SPEC §116. Which of a set of candidate provinces the claimant's own country
// can actually reach by land, counting the candidates themselves as stepping
// stones — so a demand may run outward from the border through a corridor of
// other demands, but may not begin on the far side of a country nobody is
// taking. Returns null when the rule does not apply: no adjacency data (the
// bare harnesses, where an empty graph is an absence of information and not an
// archipelago — the lesson smoke77 exists to keep), or a claimant with no land
// of its own to reach from, which is a released or landless court that §109
// already governs.
function demandReach(ctx, byTag, candidateIds, side, recipients) {
  if (!geomIsMapLike(ctx) || !candidateIds || !candidateIds.length) return null;
  const g = ctx.game;
  const nb = ctx.geom.neighbors;
  const claims = new Set(candidateIds);
  // Whose country counts as "here". Not one court's — a war is fought by a
  // side, the corridor is held by the side, and a leader may demand a province
  // to hand to a client whose own border it touches rather than his. Seeding
  // from the claimant alone was the first draft's real error: it read the map
  // correctly and the war wrongly.
  const seeds = new Set([byTag]);
  for (const t of (Array.isArray(side) ? side : [])) if (t) seeds.add(t);
  for (const t of (Array.isArray(recipients) ? recipients : [])) if (t) seeds.add(t);
  for (const [k, t] of Object.entries(g.tags || {})) {
    if (t && t.alive !== false && t.overlord && seeds.has(t.overlord)) seeds.add(k);
  }
  const own = [];
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && seeds.has(p.owner)) own.push(i);
  }
  if (!own.length) return null;
  const keep = new Set();
  const seen = new Set(own);
  const stack = own.slice();
  while (stack.length) {
    const cur = stack.pop();
    for (const n of (nb[cur] || [])) {
      if (seen.has(n) || !claims.has(n)) continue;
      seen.add(n);
      keep.add(n);
      stack.push(n);
    }
  }
  return keep;
}

export function peaceDealInfo(ctx, war, byTag, enemyTag) {
  const g = ctx.game;
  const mySide = war.attackers.indexOf(byTag) >= 0 ? war.attackers : war.defenders;
  const theirSide = enemySideOf(war, byTag);
  const aliveEnemies = theirSide.filter((t) => g.tags[t] && g.tags[t].alive);
  // The junior partner's table (SPEC §74): a court that was CALLED into this
  // war does not hold the coalition's pen. Its table is a WITHDRAWAL — it
  // settles only its own front (what its own men hold may be demanded;
  // everything else between it and the enemy reverts) and leaves, while the
  // leader's war goes on untouched. The congress, the separate peaces, the
  // subjugations, releases and client transfers belong to the side's leader alone —
  // previously a junior's "separate peace" struck the enemy out of the
  // ALLY's war, truced the ally to it, and reverted the ally's occupations
  // (the reported bug). The leader is overlord-promoted (sideLeaderOf): a war
  // declared on a client is the protecting crown's to settle, on either side
  // of the table.
  const sideLeader = sideLeaderOf(ctx, war, mySide) || byTag;
  const exit = byTag !== sideLeader;
  const separate = !exit && !!enemyTag && aliveEnemies.indexOf(enemyTag) >= 0 && aliveEnemies.length >= 2;
  const enemyLeader = separate ? enemyTag : (sideLeaderOf(ctx, war, theirSide) || aliveEnemies[0] || null);
  const et = enemyLeader ? g.tags[enemyLeader] : null;
  const me = g.tags[byTag];
  const myRel = me ? me.religion : null;
  const provinces = [];
  let enemyLeaderDev = 0;
  let theirSideDev = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    if (p.owner === enemyLeader) enemyLeaderDev += devTotal(p);
    if (separate ? p.owner !== enemyLeader : theirSide.indexOf(p.owner) < 0) continue;
    theirSideDev += devTotal(p);
    // A withdrawing junior may only demand what its OWN men hold — the
    // ally's occupations are not its to spend.
    if (exit ? p.controller !== byTag : mySide.indexOf(p.controller) < 0) continue;
    let cost = provDemandCost(ctx, p, byTag);
    let discount = '';
    if (hasClaim(ctx, byTag, i)) {
      cost = Math.max(PEACE.provCostMin, Math.round(cost * PEACE.claimDiscount));
      discount = 'claim';
    } else if (myRel && p.religion === myRel) {
      cost = Math.max(PEACE.provCostMin, Math.round(cost * PEACE.faithDiscount));
      discount = 'faith';
    }
    const goalAdj = exit
      ? { mult: 1, aligned: false, reason: '' }
      : goalProvinceAdjustment(ctx, war, byTag, i);
    cost = Math.max(PEACE.provCostMin, Math.round(cost * goalAdj.mult));
    provinces.push({
      id: i, name: p.name, dev: devTotal(p), owner: p.owner, cost, discount,
      goalAligned: goalAdj.aligned, goalReason: goalAdj.reason, goalMult: goalAdj.mult,
    });
  }
  provinces.sort((a, b) => b.dev - a.dev || a.name.localeCompare(b.name));
  // SPEC §116: a demand has to be somewhere. Occupation is not the whole of a
  // claim — the land also has to touch the country claiming it, counting the
  // other demands as they connect. Without this the table would sell whatever
  // an army happened to be standing in when the bell rang, which is how a
  // traced 1948 campaign ended with Egypt owning Hyrcania and Gabae in central
  // Iran and Jordan owning Hatra and Charax.
  {
    const recipients = [];
    for (const [k, t] of Object.entries(g.tags || {})) {
      if (t && t.alive !== false && t.overlord === byTag) recipients.push(k);
    }
    const reach = demandReach(ctx, byTag, provinces.map((r) => r.id), mySide, recipients);
    if (reach) {
      for (let k = provinces.length - 1; k >= 0; k--) {
        if (!reach.has(provinces[k].id)) provinces.splice(k, 1);
      }
    }
  }
  const rawMax = et ? Math.max(0, num(et.treasury)) * 0.6 + 100 : 0;
  // Subjugation: the enemy leader becomes a client kingdom. Impossible for
  // realms already sworn to someone, and priced by the realm's weight.
  let canSubjugate = false;
  let whyNotSubjugate = '';
  if (!mechanicOn(ctx, 'clientKingdoms')) {
    // The age itself refuses the clause (SPEC §142). A twentieth-century peace
    // can occupy a country, partition it, disarm it or garrison it, and this
    // table can still do every one of those — what it cannot do is write a
    // sovereign state into somebody's crown as a client kingdom, because that
    // is not a thing the age's treaties know how to say.
    whyNotSubjugate = 'This age has no client kingdoms. A state can be beaten, occupied and '
      + 'stripped of land, but no treaty here makes one crown the subject of another.';
  } else if (exit) whyNotSubjugate = 'This war is not ours to settle — only its leader can break a crown at the table.';
  else if (separate) whyNotSubjugate = 'A separate peace cannot break a crown — subjugation waits for the full congress.';
  else if (!et) whyNotSubjugate = 'There is no court left to subjugate.';
  else if (et.overlord) whyNotSubjugate = 'They already bend the knee to another.';
  else if (tagModifierFlag(ctx, enemyLeader, 'noSubjugation')) {
    // A court in the grip of its founding fervor (the conquest-era Caliphate)
    // dies before it kneels: no treaty clause puts a yoke on it while the
    // flag-bearing modifier lasts.
    whyNotSubjugate = 'That court would sooner be destroyed than kneel — no yoke can be written into this treaty.';
  } else canSubjugate = true;
  const subjugateAdj = exit
    ? { mult: 1, aligned: false, reason: '' }
    : goalSubjugateAdjustment(ctx, war, byTag);
  const subjugateBaseCost = clamp(Math.round(PEACE.subjugateBase + enemyLeaderDev * PEACE.subjugatePerDev),
    PEACE.subjugateBase, PEACE.subjugateMax);
  const subjugateCost = Math.max(PEACE.provCostMin,
    Math.round(subjugateBaseCost * subjugateAdj.mult));
  const releasable = (separate || exit) ? [] : releasableNations(ctx, war, byTag, enemyLeader)
    .map((row) => {
      const adj = goalReleaseAdjustment(ctx, war, byTag, row.provIds);
      return {
        ...row,
        cost: Math.max(PEACE.provCostMin, Math.round(row.cost * adj.mult)),
        goalAligned: adj.aligned, goalReason: adj.reason, goalMult: adj.mult,
      };
    });
  const transferable = (separate || exit) ? [] : transferableVassals(ctx, war, byTag)
    .map((row) => {
      const adj = goalTransferAdjustment(ctx, war, byTag);
      return {
        ...row,
        cost: Math.max(PEACE.provCostMin, Math.round(row.cost * adj.mult)),
        goalAligned: adj.aligned, goalReason: adj.reason, goalMult: adj.mult,
      };
    });
  // Directed spoils (SPEC §61 extension): the leader's table may cede any
  // demanded province to one of its own direct clients marching in this war —
  // the client that stormed the walls can be given the town — instead of the
  // crown itself. Same war-score price; the pen-holder still carries the
  // treaty's infamy. A withdrawing junior directs nothing.
  const cessionRecipients = exit ? [] : vassalsOf(ctx, byTag)
    .filter((v) => mySide.indexOf(v) >= 0)
    .map((v) => ({ tag: v, name: (g.tags[v] && g.tags[v].name) || v }));
  return {
    warId: war.id, warName: war.name,
    myWs: separate
      ? separateWarscore(ctx, war, byTag, enemyLeader)
      : Math.round(num(war.warscore && war.warscore[byTag])),
    separate,
    // The junior partner's withdrawal table (SPEC §74).
    exit,
    sideLeader,
    leaderName: (g.tags[sideLeader] && g.tags[sideLeader].name) || sideLeader,
    // Every court a separate word could be had with (shown when the enemy
    // is a coalition; empty when there is only one court to talk to — and
    // never offered to a junior, whose pen signs only its own withdrawal).
    separateTargets: !exit && aliveEnemies.length >= 2
      ? aliveEnemies.map((t) => ({
        tag: t, name: (g.tags[t] && g.tags[t].name) || t,
        ws: separateWarscore(ctx, war, byTag, t),
      }))
      : [],
    enemyLeader, enemyName: et ? (et.name || enemyLeader) : '',
    enemyWarExhaustion: et ? num(et.warExhaustion) : 0,
    provinces,
    theirSideDev,
    maxGold: Math.floor(rawMax / PEACE.goldStep) * PEACE.goldStep,
    goldStep: PEACE.goldStep,
    goldCostPer100: PEACE.goldCostPer100,
    humiliateCost: PEACE.humiliateCost,
    reparationsCost: PEACE.reparationsCost,
    reparationsAmount: PEACE.reparationsAmount,
    reparationsMonths: PEACE.reparationsMonths,
    canSubjugate, whyNotSubjugate, subjugateCost,
    subjugateGoalAligned: subjugateAdj.aligned,
    subjugateGoalReason: subjugateAdj.reason,
    // Nations the enemy can be forced to set free (SPEC §69/§76). A separate
    // peace cannot redraw another crown's map — releases wait for the full
    // congress, like subjugation — and a withdrawing junior frees no one.
    releasable,
    releaseCostPerDev: PEACE.releaseCostPerDev,
    // Direct clients on the enemy side may be transferred only at the full
    // congress. A separate court cannot trade another sovereign's bond, and a
    // junior ally cannot rewrite the coalition's hierarchy.
    transferableVassals: transferable,
    transferVassalBase: PEACE.transferVassalBase,
    transferVassalPerDev: PEACE.transferVassalPerDev,
    // Own clients in this war that demanded provinces may be ceded to.
    cessionRecipients,
    cb: war.cb || null,
    goal: warGoalInfo(ctx, war),
    noNegotiation: !!war.noNegotiation,
  };
}
// Pricing a package of demanded provinces: sorted cheapest-first, each
// additional province in the SAME treaty costs peaceProvStep more than face
// value — one great dismemberment is dearer than three modest treaties, and
// the truce clock between them is where the defeated catch their breath.
export function priceProvincePackage(ctx, rows) {
  const step = BAL(ctx, 'peaceProvStep', 0.15);
  const sorted = rows.slice().sort((a, b) => a.cost - b.cost);
  let sum = 0;
  sorted.forEach((r, i) => { sum += r.cost * (1 + step * i); });
  return Math.round(sum);
}
// The most development one treaty may strip from the losing side. Small
// realms can still be taken whole (the floor); empires must be carved over
// several wars.
export function peaceDevCap(ctx, info) {
  return Math.max(25, Math.round(num(info && info.theirSideDev) * BAL(ctx, 'peaceMaxDevShare', 0.4)));
}
// The AI's package builder: biggest prizes first, priced with the same
// escalation the player pays, stopping at the budget and the treaty dev cap.
export function buildAiPeaceProvinces(ctx, info, budget) {
  const capDev = peaceDevCap(ctx, info);
  const chosen = [];
  let dev = 0;
  for (const row of info.provinces || []) { // sorted by dev, descending
    if (dev + row.dev > capDev) continue;
    chosen.push(row);
    if (priceProvincePackage(ctx, chosen) > budget) { chosen.pop(); continue; }
    dev += row.dev;
  }
  return { ids: chosen.map((r) => r.id), cost: priceProvincePackage(ctx, chosen) };
}
// deal = { provinces: [provId], gold: talents, humiliate: bool, subjugate: bool,
//          release: [tags], transferVassals: [tags] }.
// Subjugation supersedes province demands, releases and client transfers (a
// client keeps its political house whole). Returns the warscore price, whether
// the enemy takes it, and a one-line reason.
export function evaluatePeaceDeal(ctx, war, byTag, deal) {
  const d = deal || {};
  const info = peaceDealInfo(ctx, war, byTag, d.enemy); // d.enemy: separate peace (SPEC §67)
  const subjugate = !!d.subjugate && info.canSubjugate;
  const chosen = [];
  let cost = 0;
  if (!subjugate) {
    for (const id of Array.isArray(d.provinces) ? d.provinces : []) {
      const row = info.provinces.find((r) => r.id === (id | 0));
      if (!row || chosen.indexOf(row) >= 0) continue;
      chosen.push(row);
    }
    cost += priceProvincePackage(ctx, chosen);
  } else {
    cost += info.subjugateCost;
  }
  // Directed spoils: each demanded province may name one of the peacemaker's
  // own clients in this war as its recipient. Recipients are re-validated
  // against the live table, so a stale or hand-edited deal cannot gift land
  // to a court outside it. Same price either way.
  const provinceTo = {};
  if (!subjugate && d.provinceTo && typeof d.provinceTo === 'object') {
    const legal = new Set((info.cessionRecipients || []).map((r) => r.tag));
    for (const row of chosen) {
      const to = d.provinceTo[row.id];
      if (to && to !== byTag && legal.has(to)) provinceTo[row.id] = to;
    }
  }
  // Set nations free (SPEC §69): each requested restoration is re-priced on
  // the provinces it would actually receive — anything the deal also cedes to
  // us is struck from the release first, and an emptied release drops out.
  const releaseRows = [];
  if (!subjugate) {
    const cededIds = new Set(chosen.map((r) => r.id));
    const asked = Array.isArray(d.release) ? d.release : [];
    for (const tag of asked) {
      const row = (info.releasable || []).find((r) => r.tag === tag);
      if (!row || releaseRows.some((r) => r.tag === tag)) continue;
      const ids = row.provIds.filter((id) => !cededIds.has(id));
      if (!ids.length) continue;
      const dev = ids.reduce((s, id) => s + devTotal(ctx.byId(id) || {}), 0);
      const baseCost = Math.max(PEACE.releaseCostMin, Math.round(dev * PEACE.releaseCostPerDev));
      const adj = goalReleaseAdjustment(ctx, war, byTag, ids);
      const rowCost = Math.max(PEACE.provCostMin, Math.round(baseCost * adj.mult));
      releaseRows.push({
        ...row, provIds: ids, dev, cost: rowCost,
        goalAligned: adj.aligned, goalReason: adj.reason, goalMult: adj.mult,
      });
      cost += rowCost;
    }
  }
  // Transfer direct enemy clients (SPEC §76). Rows are recomputed from the
  // live hierarchy so a hand-edited/stale deal cannot name an unrelated
  // court. Subjugating the enemy leader supersedes the transfer: one treaty
  // cannot both preserve and dismantle that political house.
  const transferRows = [];
  if (!subjugate) {
    const asked = Array.isArray(d.transferVassals) ? d.transferVassals : [];
    for (const tag of asked) {
      const row = (info.transferableVassals || []).find((r) => r.tag === tag);
      if (!row || transferRows.some((r) => r.tag === tag)) continue;
      transferRows.push({ ...row });
      cost += row.cost;
    }
  }
  const gold = clamp(Math.round(num(d.gold)), 0, info.maxGold);
  cost += Math.round(gold * PEACE.goldCostPer100 / 100);
  // Humiliation and reparations are the congress's instruments, not a
  // withdrawing junior's (SPEC §74) — like subjugation and releases above.
  const humiliate = !!d.humiliate && !info.exit;
  if (humiliate) cost += PEACE.humiliateCost;
  const reparations = !!d.reparations && !info.exit;
  if (reparations) cost += PEACE.reparationsCost;
  const white = !chosen.length && !releaseRows.length && !transferRows.length
    && gold <= 0 && !humiliate && !subjugate && !reparations;
  const enemyWs = -info.myWs;
  let acceptable, reason;
  if (white) {
    // A fresh grudge does not go home for nothing: in a war's first year the
    // enemy signs a white peace only if actually losing or war-weary — no
    // more declaring a war, shrugging, and shaking hands a month later.
    // A junior's white WITHDRAWAL is easier to buy (SPEC §74): the enemy is
    // glad to see a coalition member fold its tents and go home.
    const grace = info.exit ? PEACE.withdrawWhiteGrace : 0;
    const monthsIn = monthsBetween(war.started || ctx.game.date, ctx.game.date);
    const freshGrudge = monthsIn < PEACE.freshWarMonths && enemyWs > -10;
    const wouldSettle = enemyWs <= PEACE.whiteEnemyWsAtMost + grace;
    const warWeary = info.enemyWarExhaustion >= PEACE.warWearyWE && enemyWs <= 15 + grace;
    acceptable = (wouldSettle && !freshGrudge) || warWeary;
    reason = acceptable
      ? (info.exit ? 'They will let us fold our tents and go.' : 'They are ready to lay down arms.')
      : wouldSettle
        ? 'The war is young and their blood is up — they will not go home for nothing yet.'
        : (info.exit
          ? 'They are winning against our whole coalition, and will not let us simply walk away.'
          : 'They believe they are winning, and will not settle for nothing.');
  } else {
    // Cessions, releases and transferred clients all strip territorial weight
    // from the losing political house; the treaty dev cap prices them as one
    // dismemberment budget.
    const chosenDev = chosen.reduce((s, r) => s + num(r.dev), 0)
      + releaseRows.reduce((s, r) => s + num(r.dev), 0)
      + transferRows.reduce((s, r) => s + num(r.dev), 0);
    const capDev = peaceDevCap(ctx, info);
    if (chosenDev > capDev) {
      acceptable = false;
      reason = `No single treaty could strip so much land — the nations would not bear it (${chosenDev} development asked, ${capDev} is the most one settlement will carry).`;
    } else {
      acceptable = info.myWs > 0 && cost <= info.myWs;
      reason = acceptable
        ? 'Our position compels them to accept.'
        : `Our war score does not cover such demands (${cost} asked, ${Math.max(0, info.myWs)} held).`;
    }
  }
  return {
    cost, acceptable, reason, gold, humiliate, subjugate, reparations,
    provinces: chosen.map((c) => c.id),
    provinceTo,
    release: releaseRows.map((r) => r.tag), releaseRows,
    transferVassals: transferRows.map((r) => r.tag), transferRows,
  };
}
// Applies an (already accepted) deal, then winds the war down: status quo for
// the rest, truces, atWarWith rebuild, stranded armies march home.
// Dissolve a war object: strike it from the list, rebuild atWarWith from the
// wars that remain, set five-year truces, march stranded armies home through
// now-neutral land (retreating bypasses entry rules). Territory settlements
// are the CALLER's business — do them before calling this.
function rebuildAtWarWith(ctx) {
  const g = ctx.game;
  for (const t of Object.keys(g.tags)) if (g.tags[t]) g.tags[t].atWarWith = [];
  for (const w of g.wars) {
    for (const a of w.attackers) for (const d of w.defenders) {
      const ta = g.tags[a], td = g.tags[d];
      if (ta && ta.atWarWith.indexOf(d) < 0) ta.atWarWith.push(d);
      if (td && td.atWarWith.indexOf(a) < 0) td.atWarWith.push(a);
    }
  }
}
// Truce + settled-war ledger between two courts. Historical event chains
// consult the ledger so a treaty actually changes the timeline: stale
// battle/armistice cards do not pop up after the player has already ended
// their campaign.
function setTruce(ctx, a, d, warName) {
  const g = ctx.game;
  if (!g.truces) g.truces = {};
  if (!g.flags) g.flags = {};
  if (!g.flags._settledWars) g.flags._settledWars = {};
  const key = truceKey(a, d);
  g.truces[key] = { y: g.date.y + 5, m: g.date.m };
  g.flags._settledWars[key] = { y: g.date.y, m: g.date.m, name: warName || '' };
}
// March armies of `tags` home from land that is no longer theirs to stand on
// (retreating bypasses entry rules).
function marchStrandedHome(ctx, tags) {
  const g = ctx.game;
  for (const id of Object.keys(g.armies)) {
    const a = g.armies[id];
    if (!a || tags.indexOf(a.tag) < 0) continue;
    const p = ctx.byId(a.prov);
    if (!p || p.controller === a.tag || sameSide(ctx, a.tag, p.controller) || isHostile(ctx, a.tag, p.controller)) continue;
    const path = bfs(ctx, a.prov,
      (pid) => { const q = ctx.byId(pid); return !!q && !q.impassable; },
      (pid) => { const q = ctx.byId(pid); return !!q && q.controller === a.tag; },
      24);
    if (path && path.length) { a.path = path; a.moveDaysLeft = 0; a.retreating = true; a.inBattle = false; }
  }
}
// A siege is an act of war and does not outlive one (SPEC §150).
//
// Occupation reverts at every peace table — that was always right. A siege in
// PROGRESS was not occupation and nothing lifted it, so the besieging camp
// stayed on the province after the war that raised it had ended: the outliner
// went on listing "Pisidia 30%", and the map went on striping the cell, because
// the political layer stripes on `p.controller !== p.owner || p.siege`. To the
// player that is indistinguishable from an enemy still sitting on their land —
// and the enemy was, in the only sense the screen could show.
function liftSiegesBetween(ctx, a, b) {
  const g = ctx.game;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || !p.siege) continue;
    const by = p.siege.by;
    const held = p.controller;
    const between = (a.indexOf(by) >= 0 && b.indexOf(held) >= 0)
      || (b.indexOf(by) >= 0 && a.indexOf(held) >= 0);
    if (!between) continue;
    p.siege = null;
    clearFamine(ctx, p);
    ctx.bus.emit('siegeEnd', { provId: p.id, by });
  }
}
export function dissolveWar(ctx, war) {
  const g = ctx.game;
  const participants = war.attackers.concat(war.defenders);
  liftSiegesBetween(ctx, war.attackers, war.defenders);
  const wi = g.wars.indexOf(war);
  if (wi >= 0) g.wars.splice(wi, 1);
  rebuildAtWarWith(ctx);
  for (const a of war.attackers) for (const d of war.defenders) setTruce(ctx, a, d, war.name);
  marchStrandedHome(ctx, participants);
  ctx.bus.emit('war', { id: war.id, name: war.name, ended: true });
}
// A separate peace (SPEC §67): one member of the enemy coalition leaves the
// war while the rest fight on. Status quo is settled between the departing
// court and OUR side only — the caller applies cessions first; every other
// front keeps its occupations. Five-year truces bind the leaver to everyone
// on our side. If the leaver was the last court standing, the caller should
// have ended the war instead (peaceDealInfo refuses that table).
export function releaseFromWar(ctx, war, leaverTag, byTag) {
  const g = ctx.game;
  const mySide = war.attackers.indexOf(byTag) >= 0 ? war.attackers : war.defenders;
  const theirSide = enemySideOf(war, byTag);
  // Status quo between the leaver and our side, both directions.
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    if (p.owner === leaverTag && mySide.indexOf(p.controller) >= 0 && g.tags[p.owner] && g.tags[p.owner].alive) {
      changeControllerCore(ctx, p, p.owner);
    } else if (mySide.indexOf(p.owner) >= 0 && p.controller === leaverTag
        && g.tags[p.owner] && g.tags[p.owner].alive) {
      changeControllerCore(ctx, p, p.owner);
    }
  }
  liftSiegesBetween(ctx, [leaverTag], mySide);
  const at = theirSide.indexOf(leaverTag);
  if (at >= 0) theirSide.splice(at, 1);
  if (war.warscore) delete war.warscore[leaverTag];
  rebuildAtWarWith(ctx);
  for (const t of mySide) setTruce(ctx, leaverTag, t, war.name);
  marchStrandedHome(ctx, [leaverTag].concat(mySide));
  ctx.bus.emit('war', { id: war.id, name: war.name, left: leaverTag });
}

// The junior partner's withdrawal (SPEC §74): a court that was called into
// the war settles its own front and goes home — the mirror image of
// releaseFromWar, seen from inside the coalition. Status quo strictly
// between the leaver (and its own clients in this war) and the ENEMY side;
// the leader's fronts, occupations and diplomatic standing are untouched —
// no truce binds the ally, no enemy is struck from the ally's war. The
// caller applies the leaver's cessions first.
export function withdrawFromWar(ctx, war, leaverTag) {
  const g = ctx.game;
  const mySide = war.attackers.indexOf(leaverTag) >= 0 ? war.attackers : war.defenders;
  const theirSide = enemySideOf(war, leaverTag);
  // A withdrawing overlord takes its clients home with it — they were only
  // ever there under its banner.
  const leavers = [leaverTag].concat(
    vassalsOf(ctx, leaverTag).filter((v) => mySide.indexOf(v) >= 0));
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    if (leavers.indexOf(p.owner) >= 0 && theirSide.indexOf(p.controller) >= 0
        && g.tags[p.owner] && g.tags[p.owner].alive) {
      changeControllerCore(ctx, p, p.owner);
    } else if (leavers.indexOf(p.controller) >= 0 && theirSide.indexOf(p.owner) >= 0
        && g.tags[p.owner] && g.tags[p.owner].alive) {
      changeControllerCore(ctx, p, p.owner);
    }
  }
  liftSiegesBetween(ctx, leavers, theirSide);
  for (const leaver of leavers) {
    const at = mySide.indexOf(leaver);
    if (at >= 0) mySide.splice(at, 1);
    if (war.warscore) delete war.warscore[leaver];
    for (const t of theirSide) if (g.tags[t]) setTruce(ctx, leaver, t, war.name);
  }
  rebuildAtWarWith(ctx);
  marchStrandedHome(ctx, leavers.concat(theirSide));
  ctx.bus.emit('war', { id: war.id, name: war.name, left: leaverTag });
}

// End a war without a treaty. winnersKey 'att'/'def': the sword keeps what it
// holds — the winning side takes ownership of every enemy province it controls,
// everything else reverts. null: white peace, all occupations revert. Used when
// one side is annihilated and when a chapter's verdict closes the book.
// opts.keep (SPEC §31): a predicate deciding which occupied provinces the
// SPEC §116. Uti possidetis says a winner keeps what it holds at the bell. It
// does not say a winner keeps what it holds on the other side of somebody
// else's country. §109 gave released states a land border on the grounds that a
// state has to be somewhere; an annexation is the same claim from the other
// direction and never got the same rule, so a traced 1948 campaign ended with
// Egypt owning Hyrcania, Gabae and Susa in central Iran, and Jordan owning
// Hatra and Charax — provinces their armies had walked to through a coalition
// war and simply happened to be standing in.
//
// The rule: a winner may annex only what its own territory can reach by land,
// counting the annexations themselves as they connect. A pocket that touches
// nothing the winner owns goes back to its owner at the table, the way a
// bargaining chip does. It is a rule about the map, not about the fighting: the
// province was still conquered, and it is still handed back.
//
// Deliberate exemptions. A winner with no land at all cannot seed a component
// and is not made to give up its only gains — that is a released or landless
// court, and §109 already governs where it gets seated. And where the geometry
// has no edges at all (the bare harnesses), the rule is skipped rather than
// applied to an absence of information: an empty adjacency graph is not an
// archipelago, which is the lesson smoke77 exists to keep.
function annexable(ctx, war, winners, losers) {
  const g = ctx.game;
  const keepable = new Set();
  if (!geomIsMapLike(ctx)) return null; // no map to reason about: no rule
  const nb = ctx.geom.neighbors;
  const side = new Set(winners);
  for (const [k, t] of Object.entries(g.tags || {})) {
    if (t && t.alive !== false && t.overlord && side.has(t.overlord)) side.add(k);
  }
  for (const w of winners) {
    if (!g.tags[w] || g.tags[w].alive === false) continue;
    // What this winner's SIDE already owns, and what this winner stands to take.
    const own = [];
    const claims = new Set();
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (!p || p.impassable) continue;
      if (side.has(p.owner)) own.push(i);
      else if (p.controller === w && losers.indexOf(p.owner) >= 0) claims.add(i);
    }
    if (!claims.size) continue;
    if (!own.length) { for (const id of claims) keepable.add(id); continue; }
    // Grow outward from the winner's own soil, through the claims only.
    const stack = own.slice();
    const seen = new Set(own);
    const mine = new Set();
    while (stack.length) {
      const cur = stack.pop();
      for (const n of (nb[cur] || [])) {
        if (seen.has(n) || !claims.has(n)) continue;
        seen.add(n);
        mine.add(n);
        stack.push(n);
      }
    }
    for (const id of mine) keepable.add(id);
  }
  return keepable;
}

// The territorial half of a settlement, and the only place the sword's rules
// live. `participants` bounds the pass: the whole war when a war ends, and one
// pair of parties when a scripted peace settles two courts and leaves the war
// standing (SPEC §193).
function settleFronts(ctx, war, winnersKey, winners, losers, participants, keep) {
  const g = ctx.game;
  // SPEC §116: what the winners' own soil can actually reach. `null` means the
  // rule does not apply here (no adjacency data), not that nothing is keepable.
  // A scripted settlement that supplies its own `keep` predicate has already
  // drawn the border by hand — Rhodes says exactly which cells sit inside the
  // 1949 lines — and an authored border is not the engine's to second-guess.
  const reach = keep ? null : annexable(ctx, war, winners, losers);
  // Winning free is not conquest (SPEC §174): when the settlement's winners
  // are the side that fought for its independence, the homeland they keep is
  // a liberation, and no coalition leagues against a people for throwing off
  // its own yoke. Land beyond that homeland still prices as conquest.
  const freeborn = !!winnersKey && independenceSideOf(war) === winnersKey;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.controller === p.owner) continue;
    if (participants.indexOf(p.owner) < 0 || participants.indexOf(p.controller) < 0) continue;
    if (keep && !keep(p) && g.tags[p.owner] && g.tags[p.owner].alive) {
      changeControllerCore(ctx, p, p.owner); // handed back at the table
      continue;
    }
    // A conquest the winner's own country cannot reach by land is a bargaining
    // chip, and bargaining chips go back across the table.
    if (reach && !reach.has(i) && g.tags[p.owner] && g.tags[p.owner].alive
      && winners.indexOf(p.controller) >= 0 && losers.indexOf(p.owner) >= 0) {
      changeControllerCore(ctx, p, p.owner);
      continue;
    }
    if (winners.indexOf(p.controller) >= 0 && losers.indexOf(p.owner) >= 0) {
      const conqueror = g.tags[p.controller];
      if (conqueror && !(freeborn && liberatedSoil(ctx, p, p.controller))) {
        conqueror.aggression = num(conqueror.aggression) + infamyForDev(ctx, devTotal(p));
      }
      p.integration = 0; // integration is with a sovereign, not the soil (SPEC §66)
      p.integrating = null; // cleared before the owner change: no inherited rename
      recordGrudge(ctx, p.owner, p.controller, i); // the lost lands are remembered (SPEC §67)
      changeOwnerCore(ctx, p, p.controller); // uti possidetis
      p.autonomy = Math.max(num(p.autonomy, 0.25), 0.6);
      p.conversion = null;
      p.modifiers = (p.modifiers || []).filter((m) => m && m.id !== 'recent_conquest');
      p.modifiers.push({ id: 'recent_conquest', name: 'Recent Conquest', months: 24, effects: { unrest: 3 } });
    } else if (g.tags[p.owner] && g.tags[p.owner].alive) {
      changeControllerCore(ctx, p, p.owner);
    }
  }
}

// winners actually annex; everything else returns to its owner. Scripted
// concessions use it — "Judea keeps its hills" must not mean all of Syria.
export function endWarBySword(ctx, war, winnersKey, opts) {
  const g = ctx.game;
  const winners = winnersKey === 'att' ? war.attackers : winnersKey === 'def' ? war.defenders : [];
  const losers = winnersKey === 'att' ? war.defenders : winnersKey === 'def' ? war.attackers : [];
  const participants = war.attackers.concat(war.defenders);
  const keep = opts && typeof opts.keep === 'function' ? opts.keep : null;
  settleFronts(ctx, war, winnersKey, winners, losers, participants, keep);
  dissolveWar(ctx, war);
  const endText = (war.name || 'The war') + ' has ended'
    + (winners.length ? ' — the field belongs to ' + winners.map((t) => (g.tags[t] && g.tags[t].name) || t).join(', ') + '.' : ' in exhaustion.');
  chronicle(ctx, 'peace', endText);
  if (opts && opts.silent) return;
  const pt = g.playerTag;
  if (participants.indexOf(pt) >= 0) {
    ctx.bus.emit('notify', {
      title: 'The war is over',
      text: endText,
      type: winners.indexOf(pt) >= 0 ? 'good' : losers.indexOf(pt) >= 0 ? 'bad' : 'info',
    });
  } else {
    ctx.bus.emit('notify', { title: 'News from abroad', text: endText, type: 'info' });
  }
}

// ── A scripted peace binds the courts that signed it (SPEC §193) ────────────
// `helpers.endWar(a, b, …)` names two courts, and it used to dissolve the whole
// war standing around them. So when Kavad II bought his throne with a white
// peace in 628, the Return's war went off the books with Persia's: an ally that
// had signed nothing, lost nothing and was holding Jerusalem got marched home
// because somebody else's king was murdered in a dungeon. A war here is a list
// of belligerents. The two courts settle their own fronts and go home; whoever
// is still facing an enemy keeps the war, and keeps the right to end it at
// their own table.
//
// Who goes home is arithmetic, not authorship. A court leaves when the
// settlement has emptied the far side of its enemies — Persia's only enemy was
// Byzantium, so Persia goes; Byzantium still faces Judaea, so Byzantium stays,
// and the Rhodes-style loop that settles a coalition one court at a time still
// strikes exactly one court per call. Both leave when the war was only ever
// these two, and then it ends exactly as it always did. Neither can leave when
// each still faces courts it has not settled with — nothing here can hold a
// court at war and at peace with the same coalition — and that case ends the
// whole war, which is where this function came in.
export function settleScriptedPeace(ctx, war, a, b, winnersKey, opts) {
  const g = ctx.game;
  const alive = (t) => !!(g.tags[t] && g.tags[t].alive);
  const aOnAtt = war.attackers.indexOf(a) >= 0;
  const bOnAtt = war.attackers.indexOf(b) >= 0;
  // Named on the same side, or one of them not in this war at all: not a pair
  // this rule can separate.
  if (aOnAtt === bOnAtt) return endWarBySword(ctx, war, winnersKey, opts);
  const aSide = aOnAtt ? war.attackers : war.defenders;
  const bSide = aOnAtt ? war.defenders : war.attackers;
  // Each signatory's party: itself, and the clients that came in under its
  // banner and go home under it (SPEC §74).
  const partyOf = (t, side) => [t].concat(vassalsOf(ctx, t).filter((v) => side.indexOf(v) >= 0));
  const aParty = partyOf(a, aSide);
  const bParty = partyOf(b, bSide);
  const aRest = aSide.filter((t) => aParty.indexOf(t) < 0 && alive(t));
  const bRest = bSide.filter((t) => bParty.indexOf(t) < 0 && alive(t));
  if (!aRest.length === !bRest.length) return endWarBySword(ctx, war, winnersKey, opts);
  const keep = opts && typeof opts.keep === 'function' ? opts.keep : null;
  const attParty = aOnAtt ? aParty : bParty;
  const defParty = aOnAtt ? bParty : aParty;
  const winners = winnersKey === 'att' ? attParty : winnersKey === 'def' ? defParty : [];
  const losers = winnersKey === 'att' ? defParty : winnersKey === 'def' ? attParty : [];
  settleFronts(ctx, war, winnersKey, winners, losers, aParty.concat(bParty), keep);
  // Exactly one signatory has run out of enemies; it and its clients go home,
  // settling whatever else they hold at status quo (withdrawFromWar), truced to
  // the side they leave behind.
  const leaver = bRest.length ? b : a;
  const stayer = leaver === a ? b : a;
  const leaverParty = leaver === a ? aParty : bParty;
  withdrawFromWar(ctx, war, leaver);
  // What is left is not the war the two great powers were fighting. Their
  // battles and their scripted swings went home with them, and a fight to the
  // death was their oath to swear and theirs to break — the courts that stayed
  // may send envoys. What the armies actually hold still counts for everything
  // it did: that is read off the map, not the ledger.
  war._bs = { att: 0, def: 0 };
  if (war.eventScore) war.eventScore = { att: 0, def: 0 };
  if (war.goal && (leaverParty.indexOf(war.goal.attacker) >= 0
    || leaverParty.indexOf(war.goal.defender) >= 0)) war.goal = null;
  war._goalScore = 0;
  war._goalTick = { ...g.date };
  if (war.noNegotiation) { war.noNegotiation = false; war._negOpened = true; }
  // Score the war the courts that stayed are actually fighting, now rather than
  // at the next month's tick: the peace table opens the moment the news lands.
  if (war.attackers.length && war.defenders.length) {
    const att = sideGross(ctx, war, 'att');
    const def = sideGross(ctx, war, 'def');
    for (const t of war.attackers) war.warscore[t] = Math.round(clamp(att - def, -100, 100));
    for (const t of war.defenders) war.warscore[t] = Math.round(clamp(def - att, -100, 100));
  }
  const nm = (t) => (g.tags[t] && g.tags[t].name) || t;
  const text = nm(leaver) + ' and ' + nm(stayer) + ' make their peace, and '
    + (war.name || 'the war') + ' goes on without ' + nm(leaver) + '.';
  chronicle(ctx, 'peace', text);
  // A side emptied by the departure has no war left to fight — belt and braces;
  // the arithmetic above already keeps a court on the side that stays.
  if (!war.attackers.length || !war.defenders.length) {
    dissolveWar(ctx, war);
    return;
  }
  if (opts && opts.silent) return;
  const pt = g.playerTag;
  if (war.attackers.indexOf(pt) >= 0 || war.defenders.indexOf(pt) >= 0) {
    const foes = enemySideOf(war, pt).filter(alive).map(nm).join(', ');
    ctx.bus.emit('notify', {
      title: 'The war goes on',
      text: text + ' We are still at war with ' + foes
        + ' — and free to fight on, or to send our own envoys to the peace table.',
      type: 'war',
    });
  } else if (leaverParty.indexOf(pt) >= 0) {
    ctx.bus.emit('notify', {
      title: 'We leave the war',
      text: text + ' A five-year truce binds us to them.',
      type: 'good',
    });
  } else {
    ctx.bus.emit('notify', { title: 'News from abroad', text, type: 'info' });
  }
}

function ensureReleasedCourt(ctx, row, enemyTag) {
  const g = ctx.game;
  let t = g.tags[row.tag];
  if (t) {
    if (row.releaseIdentity && !t.releaseIdentity) t.releaseIdentity = row.releaseIdentity;
    return t;
  }
  const def = (ctx.DEFINES.TAGS || {})[row.tag] || {};
  const template = g.tags[enemyTag] || {};
  const seat = ctx.byId(row.capitalId) || ctx.byId((row.provIds || [])[0]);
  const tech = template.tech || {};
  t = {
    tag: row.tag,
    name: row.name || def.name || row.tag,
    color: Array.isArray(row.color) ? row.color.slice()
      : Array.isArray(def.color) ? def.color.slice() : [112, 118, 126],
    religion: row.religion || def.religion || (seat && seat.religion) || template.religion,
    culture: row.culture || def.culture || (seat && seat.culture) || template.culture,
    alive: false,
    ai: true,
    treasury: 0, income: 0, expenses: 0, loans: 0,
    manpower: 0, maxManpower: 0,
    stability: 0, legitimacy: 50, warExhaustion: 0,
    points: { gov: 0, infl: 0, mar: 0 },
    ideas: { ...(def.ideas || {}) },
    reforms: { mil: 0, civ: 0, rel: 0 },
    eraIdeas: {}, // a state born new has taken up none of the age's ideas
    tech: {
      gov: Math.max(0, num(tech.gov, num(ctx.bookmark && ctx.bookmark.techBase, 3)) | 0),
      infl: Math.max(0, num(tech.infl, num(ctx.bookmark && ctx.bookmark.techBase, 3)) | 0),
      mar: Math.max(0, num(tech.mar, num(ctx.bookmark && ctx.bookmark.techBase, 3)) | 0),
    },
    advisors: { gov: null, infl: null, mar: null },
    aggression: 0,
    courtCand: {},
    modifiers: [],
    atWarWith: [], allies: [], guarantees: [], opinion: {},
    govType: (ctx.bookmark && ctx.bookmark.govTypes && ctx.bookmark.govTypes[row.tag])
      || (ctx.DEFINES.GOV_OF || {})[row.tag]
      || (ctx.game.date.y >= 1800 ? 'republic' : 'monarchy'),
    electionIn: 48,
    claims: [], claimFabrications: [], overlord: null,
    heir: null, regency: false, missionIdx: 0,
    aiState: {},
    ruler: { name: 'Council of the New State', title: 'Council', gov: 2, infl: 2, mar: 2, age: 50 },
    releaseIdentity: row.releaseIdentity || null,
    dynamicCapital: seat ? (seat.canon || seat.name) : null,
    description: 'A state created at the peace table from the lands and institutions of its people.',
  };
  g.tags[row.tag] = t;
  return t;
}

function refreshReleasedManpower(ctx, tag) {
  const t = ctx.game.tags[tag];
  if (!t) return;
  const mpPerDev = B(ctx, 'mpPerDev', 250);
  let max = 0;
  for (let i = 1; i < ctx.game.provinces.length; i++) {
    const p = ctx.game.provinces[i];
    if (p && !p.impassable && p.owner === tag) max += num(p.dev && p.dev.mp) * mpPerDev * levyOf(p);
  }
  t.maxManpower = Math.round(max * resolveTagMult(ctx, tag, 'manpowerMult'));
  t.manpower = Math.max(num(t.manpower), Math.min(Math.max(2000, t.maxManpower), 6000));
}

export function executePeaceDeal(ctx, war, byTag, deal) {
  const g = ctx.game;
  const info = peaceDealInfo(ctx, war, byTag, deal && deal.enemy); // separate peace scope (SPEC §67)
  const ev = evaluatePeaceDeal(ctx, war, byTag, deal);
  const me = g.tags[byTag];
  const terms = [];
  // Cession first: demanded provinces change owner to the peacemaker — or, as
  // directed spoils (ev.provinceTo), to one of the peacemaker's own clients in
  // this war. New land arrives restive — high autonomy and a generation of
  // resentment; integration (Establish Rule / Convert the Faith) is how it
  // becomes truly yours.
  const cededNames = [];
  const cededToClient = {}; // recipient tag -> province names, for the treaty line
  for (const id of ev.provinces) {
    const p = ctx.byId(id);
    if (!p) continue;
    const named = ev.provinceTo && ev.provinceTo[id];
    const recip = named && g.tags[named] && g.tags[named].alive ? named : byTag;
    // A new state starts over with the communities (SPEC §66): integration
    // is with a sovereign, not with the soil — cleared BEFORE the owner
    // change so the incoming owner cannot inherit a rename it never earned.
    p.integration = 0;
    p.integrating = null;
    recordGrudge(ctx, p.owner, recip, id); // the lost lands are remembered (SPEC §67)
    changeOwnerCore(ctx, p, recip);
    changeControllerCore(ctx, p, recip);
    p.autonomy = Math.max(num(p.autonomy, 0.25), 0.6);
    p.conversion = null;
    p.modifiers = (p.modifiers || []).filter((m) => m && m.id !== 'recent_conquest');
    p.modifiers.push({ id: 'recent_conquest', name: 'Recent Conquest', months: 24, effects: { unrest: 3 } });
    const rt = g.tags[recip];
    if (rt && Array.isArray(rt.claims)) rt.claims = rt.claims.filter((c) => c !== id); // claim satisfied
    if (recip === byTag) cededNames.push(p.name);
    else {
      (cededToClient[recip] = cededToClient[recip] || []).push(p.name);
      // A town handed to the client that stormed it is remembered at court.
      addOpinion(ctx, recip, byTag, 10);
    }
  }
  if (cededNames.length) terms.push('cedes ' + cededNames.join(', '));
  for (const tag of Object.keys(cededToClient)) {
    terms.push('cedes ' + cededToClient[tag].join(', ') + ' to '
      + ((g.tags[tag] && g.tags[tag].name) || tag));
  }
  if (ev.provinces.length) {
    // Conquest is remembered: infamy proportional to what was taken (decays
    // monthly — see monthlyOpinionDrift; slower while the taker is still at
    // war). Spoils directed to a client are still the pen-holder's odium.
    // Winning free is not conquest (SPEC §174): the side that fought for its
    // own independence pays nothing for the homeland it keeps. Alien land,
    // subjugation, transfers and humiliation keep their price — only the
    // land freedom stands on is free.
    const freeborn = independenceSideOf(war) === (war.attackers.indexOf(byTag) >= 0 ? 'att' : 'def');
    if (me) me.aggression = num(me.aggression) + infamyForDev(ctx, ev.provinces.reduce((sum, pid) => {
      const q = ctx.byId(pid);
      if (!q || (freeborn && liberatedSoil(ctx, q, byTag))) return sum;
      return sum + devTotal(q);
    }, 0));
  }
  // Free states (SPEC §69/§76): restore dead courts, return old homelands to
  // living non-belligerents, or create a new cultural state where no previous
  // court survives. A revived/new court rises independent and sheltered; a
  // living recipient keeps its existing constitution and diplomatic bonds.
  // Liberation carries no infamy.
  for (const row of ev.releaseRows || []) {
    if (!info.enemyLeader) continue;
    const t = ensureReleasedCourt(ctx, row, info.enemyLeader);
    const wasAlive = !!t.alive;
    const freed = [];
    let seat = null;
    for (const id of row.provIds) {
      const p = ctx.byId(id);
      if (!p || p.owner !== info.enemyLeader) continue;
      p.integration = 0; // a change of sovereign starts the ledger over (SPEC §66)
      p.integrating = null;
      recordGrudge(ctx, info.enemyLeader, row.tag, id); // the lost lands are remembered
      changeOwnerCore(ctx, p, row.tag);
      changeControllerCore(ctx, p, row.tag);
      p.autonomy = Math.min(num(p.autonomy, 0.25), 0.25); // its own people come home, not a conquest
      p.conversion = null;
      p.modifiers = (p.modifiers || []).filter((m) => m && m.id !== 'recent_conquest');
      freed.push(p.name);
      if (!seat || devTotal(p) > devTotal(seat)) seat = p;
    }
    if (!freed.length) continue;
    t.alive = true;
    if (!wasAlive || row.kind === 'create' || row.kind === 'restore') {
      t.overlord = null;
      t.warExhaustion = 0;
      t.stability = Math.max(num(t.stability), 0);
      t.legitimacy = clamp(Math.max(num(t.legitimacy), 40), 0, 100);
      t.treasury = Math.max(num(t.treasury), 25);
      if (!t.ruler) t.ruler = { name: 'Council of the Restoration', title: 'Council', gov: 2, infl: 2, mar: 2, age: 50 };
    }
    if (seat && !t.dynamicCapital) t.dynamicCapital = seat.canon || seat.name;
    refreshReleasedManpower(ctx, row.tag);
    // Who freed them, and when (SPEC §202). The gratitude below is real and it
    // is not a down payment: the same hand may not offer this court a collar
    // for a generation, which is what stopped "free four states, collar them
    // with their own gratitude, and eat them one by one" from being the
    // cheapest expansion in the game.
    t.freedBy = { by: byTag, y: g.date.y, m: g.date.m };
    addOpinion(ctx, row.tag, byTag, 100);
    addOpinion(ctx, byTag, row.tag, 50);
    addOpinion(ctx, row.tag, info.enemyLeader, -100);
    setTruce(ctx, row.tag, info.enemyLeader, war.name);
    // A revived/new court needs a field force; an already living recipient
    // keeps the host it already commands.
    if (!wasAlive && seat && !armiesOf(ctx, row.tag).length) {
      spawnArmy(ctx, row.tag, seat.name, { inf: 2, name: 'Army of the Restoration' });
    }
    const enemyName = g.tags[info.enemyLeader] ? g.tags[info.enemyLeader].name : info.enemyLeader;
    if (row.kind === 'return' && wasAlive) {
      chronicle(ctx, 'peace', enemyName + ' returns ' + freed.join(', ') + ' to '
        + (t.name || row.tag) + ' at the peace table.');
      terms.push('returns ' + freed.join(', ') + ' to ' + (t.name || row.tag));
    } else if (row.kind === 'create') {
      chronicle(ctx, 'peace', 'A new state rises: ' + (t.name || row.tag) + ' is proclaimed in '
        + freed.join(', ') + ', freed from ' + enemyName + ' at the peace table.');
      terms.push('recognizes the new state of ' + (t.name || row.tag) + ' (' + freed.join(', ') + ')');
    } else {
      chronicle(ctx, 'peace', 'The banners of ' + (t.name || row.tag) + ' rise again: '
        + enemyName + ' releases ' + freed.join(', ') + ' at the peace table.');
      terms.push('releases ' + (t.name || row.tag) + ' as a free nation (' + freed.join(', ') + ')');
    }
  }
  // Transfer enemy clients (SPEC §76): the court, army and territory survive;
  // only the bond changes hands. Any attempted incorporation by the old lord
  // dies with that lord's claim.
  const transferredTags = [];
  for (const row of ev.transferRows || []) {
    const t = g.tags[row.tag];
    if (!t || !t.alive || t.overlord !== row.from || !me) continue;
    const oldLord = t.overlord;
    t.overlord = byTag;
    t.incorporating = null;
    for (const al of (t.allies || []).slice()) breakAllianceCore(ctx, row.tag, al);
    addOpinion(ctx, row.tag, oldLord, -60);
    addOpinion(ctx, row.tag, byTag, -25);
    addOpinion(ctx, oldLord, byTag, -50);
    setTruce(ctx, row.tag, oldLord, war.name);
    me.aggression = num(me.aggression) + Math.max(4, Math.round(num(row.dev) * 0.15));
    transferredTags.push(row.tag);
    chronicle(ctx, 'peace', (row.name || row.tag) + ' passes from the protection of '
      + (row.fromName || oldLord) + ' to ' + (me.name || byTag) + ' at the peace table.');
    terms.push('transfers the fealty of ' + (row.name || row.tag) + ' to ' + (me.name || byTag));
  }
  if (ev.subjugate && info.enemyLeader && me) {
    const et = g.tags[info.enemyLeader];
    et.overlord = byTag;
    // A client keeps no outside alliances of its own.
    for (const al of (et.allies || []).slice()) breakAllianceCore(ctx, info.enemyLeader, al);
    addOpinion(ctx, info.enemyLeader, byTag, -40);
    // Breaking a crown to the yoke is conquest by another name — the world
    // counts it (previously subjugation escaped infamy entirely).
    me.aggression = num(me.aggression) + BAL(ctx, 'infamySubjugate', 12);
    terms.push('bends the knee as a client kingdom of ' + (me.name || byTag));
  }
  if (ev.gold > 0 && info.enemyLeader && me) {
    const et = g.tags[info.enemyLeader];
    et.treasury = num(et.treasury) - ev.gold;
    me.treasury = num(me.treasury) + ev.gold;
    terms.push('pays ' + ev.gold + ' talents');
  }
  if (ev.reparations && info.enemyLeader && me) {
    // Reparations ride the subsidy pipe (SPEC §24): a forced monthly flow.
    if (!Array.isArray(g.subsidies)) g.subsidies = [];
    g.subsidies = g.subsidies.filter((s) => !(s && s.reparation && s.from === info.enemyLeader && s.to === byTag));
    g.subsidies.push({
      from: info.enemyLeader, to: byTag,
      amount: PEACE.reparationsAmount, monthsLeft: PEACE.reparationsMonths, reparation: true,
    });
    terms.push('pays reparations (' + PEACE.reparationsAmount + ' talents a month for '
      + Math.round(PEACE.reparationsMonths / 12) + ' years)');
  }
  if (ev.humiliate && info.enemyLeader && me) {
    const et = g.tags[info.enemyLeader];
    me.legitimacy = clamp(num(me.legitimacy) + 10, 0, 100);
    me.points.gov = clamp(num(me.points.gov) + 25, 0, 999);
    me.points.infl = clamp(num(me.points.infl) + 25, 0, 999);
    me.points.mar = clamp(num(me.points.mar) + 25, 0, 999);
    et.legitimacy = clamp(num(et.legitimacy) - 15, 0, 100);
    et.stability = clamp(num(et.stability) - 1, -3, 3);
    me.aggression = num(me.aggression) + BAL(ctx, 'infamyHumiliate', 5);
    terms.push('is humiliated before the nations');
  }
  const participants = war.attackers.concat(war.defenders);
  if (info.exit) {
    // The junior partner withdraws (SPEC §74): its cessions are already
    // applied above; now it settles its own front and leaves. The leader's
    // war continues on every front, occupations and all.
    withdrawFromWar(ctx, war, byTag);
    const summary = terms.length
      ? (g.tags[byTag] ? g.tags[byTag].name : byTag) + ' ' + terms.map((t) => 'the enemy ' + t).join('; ')
        + ' — and withdraws from the war.'
      : (g.tags[byTag] ? g.tags[byTag].name : byTag) + ' withdraws from the war; occupations on its front revert.';
    chronicle(ctx, 'peace', 'A withdrawal: ' + summary + ' '
      + (info.leaderName || 'The coalition') + ' fights on.');
    if (participants.indexOf(g.playerTag) >= 0 || byTag === g.playerTag) {
      ctx.bus.emit('notify', {
        title: 'We leave the war',
        text: summary + ' A five-year truce binds us to the enemy. ' + (info.leaderName || 'Our ally') + '\'s war goes on without us.',
        type: byTag === g.playerTag ? 'good' : 'info',
      });
    }
    return;
  }
  if (info.separate) {
    // One court leaves the table; the war goes on without them. Status quo
    // and truces are theirs alone — every other front keeps its occupations.
    releaseFromWar(ctx, war, info.enemyLeader, byTag);
    const summary = terms.length
      ? (info.enemyName || 'They') + ' ' + terms.join('; ') + ' and leaves the war.'
      : (info.enemyName || 'They') + ' leaves the war; occupations between us revert.';
    chronicle(ctx, 'peace', 'A separate peace: ' + summary);
    if (participants.indexOf(g.playerTag) >= 0) {
      ctx.bus.emit('notify', {
        title: 'A separate peace',
        text: summary + ' A five-year truce holds between us. The rest of the war goes on.',
        type: participants.indexOf(byTag) >= 0 && byTag === g.playerTag ? 'good' : 'info',
      });
    }
    return;
  }
  // Status quo ante for everything still occupied, both directions.
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    if (participants.indexOf(p.owner) >= 0 && p.controller !== p.owner &&
        participants.indexOf(p.controller) >= 0 && g.tags[p.owner] && g.tags[p.owner].alive) {
      changeControllerCore(ctx, p, p.owner);
    }
  }
  dissolveWar(ctx, war);
  // The treaty may have moved a court from the enemy side into our own
  // client house. dissolveWar quite correctly truced the original wartime
  // participants; remove that now-meaningless truce between lord and client.
  for (const tag of transferredTags) {
    const key = truceKey(byTag, tag);
    delete g.truces[key];
    if (g.flags && g.flags._settledWars) delete g.flags._settledWars[key];
  }
  const summary = terms.length
    ? (info.enemyName || 'The enemy') + ' ' + terms.join('; ') + '.'
    : 'A white peace: every occupation reverts.';
  chronicle(ctx, 'peace', war.name + ' ends. ' + summary);
  if (participants.indexOf(g.playerTag) >= 0) {
    ctx.bus.emit('notify', {
      title: 'Peace of ' + (g.date.y < 0 ? (-g.date.y) + ' BCE' : g.date.y + ' CE'),
      text: war.name + ' ends. ' + summary + ' A five-year truce holds.',
      type: 'good',
    });
  } else {
    ctx.bus.emit('notify', { title: 'News from abroad', text: war.name + ' ends. ' + summary, type: 'info' });
  }
}
// Signed months between two game dates (BCE years are negative; no year zero).
export function monthsBetween(a, b) {
  if (!a || !b) return 0;
  let m = (b.y - a.y) * 12 + (b.m - a.m);
  if (a.y < 0 && b.y > 0) m -= 12;
  if (a.y > 0 && b.y < 0) m += 12;
  return m;
}
// One side's gross score, broken into its parts (the war overview shows them).
export function sideComponents(ctx, w, key) {
  const g = ctx.game;
  const mine = key === 'att' ? w.attackers : w.defenders;
  const theirs = key === 'att' ? w.defenders : w.attackers;
  let enemyDev = 0, occupiedDev = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    if (theirs.indexOf(p.owner) < 0) continue;
    const d = devTotal(p);
    enemyDev += d;
    if (mine.indexOf(p.controller) >= 0) occupiedDev += d;
  }
  const occupation = enemyDev > 0 ? Math.min(60, (occupiedDev / enemyDev) * 60) : 0;
  const battles = w._bs ? Math.min(40, num(w._bs[key])) : 0;
  const events = w.eventScore ? num(w.eventScore[key]) : 0; // scripted swings (Beth Horon, the Temple) persist here
  const signedGoal = ensureWarGoal(ctx, w) ? num(w._goalScore) : 0;
  const goal = key === 'att' ? Math.max(0, signedGoal) : Math.max(0, -signedGoal);
  return { battles, occupation, goal, events, occupiedDev, enemyDev, gross: battles + occupation + goal + events };
}
function sideGross(ctx, w, key) {
  return sideComponents(ctx, w, key).gross;
}
export function updateWarscores(ctx) {
  const g = ctx.game;
  for (const w of g.wars.slice()) {
    // A war whose side has ceased to exist is over, not eternal.
    const aliveAtt = w.attackers.some((t) => g.tags[t] && g.tags[t].alive);
    const aliveDef = w.defenders.some((t) => g.tags[t] && g.tags[t].alive);
    if (!aliveAtt || !aliveDef) {
      endWarBySword(ctx, w, aliveAtt ? 'att' : aliveDef ? 'def' : null);
      continue;
    }
    advanceWarGoal(ctx, w);
    const att = sideGross(ctx, w, 'att');
    const def = sideGross(ctx, w, 'def');
    for (const t of w.attackers) w.warscore[t] = Math.round(clamp(att - def, -100, 100));
    for (const t of w.defenders) w.warscore[t] = Math.round(clamp(def - att, -100, 100));
    // A fight-to-the-death war opens to the peace table two ways: one side
    // utterly dominates (75%), or BOTH sides are bled white in a years-long
    // stalemate — exhaustion is the other master of wars (balance harness:
    // without this, all-AI scripted wars grind economies forever).
    if (w.noNegotiation && !w._negOpened) {
      const score = Math.abs(clamp(att - def, -100, 100));
      const months = monthsBetween(w.started, g.date);
      const exhausted = (side) => side.some((t2) => g.tags[t2] && num(g.tags[t2].warExhaustion) >= 15);
      const stalemate = months >= 48 && score < 25 && exhausted(w.attackers) && exhausted(w.defenders);
      if (score >= 75 || stalemate) {
        w._negOpened = true;
        w.noNegotiation = false;
        if (w.attackers.indexOf(g.playerTag) >= 0 || w.defenders.indexOf(g.playerTag) >= 0) {
          ctx.bus.emit('notify', {
            title: 'Envoys may cross the lines',
            text: score >= 75
              ? 'The war has found its master. What began as a fight to the death can now end at the peace table.'
              : 'Four years of blood and neither side can win. Quietly, both courts begin to listen to their envoys.',
            type: 'info',
          });
        }
      }
    }
  }
}
