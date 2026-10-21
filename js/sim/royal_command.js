// Lifecycle helpers deliberately import no other sim modules: combat and
// succession can both call them without making the military graph cyclic.
import { HISTORICAL_COMMAND_RATINGS, ROYAL_COMMAND_ALIASES, ROYAL_COMMAND_RISK, ROYAL_COMMAND_WARNING } from '../data/royal_command.js';

const clone = value => JSON.parse(JSON.stringify(value));
const armies = (ctx, tag) => Object.values(ctx.game.armies || {}).filter(a => a?.tag === tag);
function identity(ctx, person) {
  if (!person.commandId) {
    ctx.game.nextRoyalCommandId = (ctx.game.nextRoyalCommandId || 0) + 1;
    person.commandId = 'royal:' + ctx.game.nextRoyalCommandId;
  }
  return person.commandId;
}
function occupant(ctx, tag, general) {
  if (!general?.royalId) return null;
  const t = ctx.game.tags[tag];
  for (const role of ['ruler', 'heir']) if (t?.[role]?.commandId === general.royalId) return { person: t[role], role };
  return null;
}
function availablePerson(t, role) {
  if (!['ruler', 'heir'].includes(role)) return 'Choose the ruler or heir.';
  const person = t?.[role];
  if (!person) return role === 'heir' ? 'There is no designated heir.' : 'There is no ruler.';
  if (Number(person.age) < 16) return 'A commander must be at least 16.';
  if (role === 'ruler' && (t.regency || /council|regent/i.test(person.title || ''))) return 'A council cannot take personal command.';
  return '';
}
function atHome(ctx, a) {
  const p = ctx.byId(a.prov);
  return p?.owner === a.tag && p.controller === a.tag && !p.siege && !a.inBattle && !a.retreating && !a.aboard
    && !(a.path?.length) && !(a.shatteredDays > 0);
}
export const royalCanReturn = (ctx, army) => atHome(ctx, army);
export function royalCommandInfo(ctx, tag, role, armyId) {
  const t = ctx.game.tags[tag], person = t?.[role];
  const assigned = person?.commandId ? armies(ctx, tag).find(a => a.general?.royalId === person.commandId) : null;
  const a = ctx.game.armies[armyId];
  let why = !t?.alive ? 'This court is no longer active.' : availablePerson(t, role);
  if (!why && assigned) why = 'This person already commands ' + assigned.name + '.';
  if (!why && (!a || a.tag !== tag || a.men <= 0)) why = 'Choose one of your armies.';
  if (!why && a.general) why = 'Choose an army with an empty command.';
  if (!why && !atHome(ctx, a)) why = 'Commission requires a stationary army in controlled home territory.';
  return { ok: !why, why, assigned, person, warning: ROYAL_COMMAND_WARNING };
}
export function commissionRoyalCommand(ctx, tag, role, armyId, rollGeneral) {
  const info = royalCommandInfo(ctx, tag, role, armyId); if (!info.ok) return { ok: false, why: info.why };
  const p = info.person, id = identity(ctx, p);
  if (!p.commandProfile) {
    const profile = rollGeneral();
    // Martial aptitude affects the initial roll, but office never guarantees
    // an elite leader. Recommissioning reuses this profile, without RNG calls.
    profile.shock = Math.max(0, Math.min(6, profile.shock + Math.floor(((p.mar ?? 2) - 2) / 2)));
    p.commandProfile = { ...profile, name: p.name, royalId: id, royalRole: role };
  }
  const a = ctx.game.armies[armyId];
  a.general = { ...clone(p.commandProfile), name: p.name, royalId: id, royalRole: role };
  return { ok: true, name: p.name, army: a.name };
}
export function recallRoyalCommand(ctx, tag, role) {
  const p = ctx.game.tags[tag]?.[role];
  const a = p?.commandId && armies(ctx, tag).find(a => a.general?.royalId === p.commandId);
  if (!a) return { ok: false, why: 'This person has no field command.' };
  if (!atHome(ctx, a)) return { ok: false, why: 'Recall requires a stationary army in controlled home territory.' };
  p.commandProfile = clone(a.general); a.general = null;
  return { ok: true, name: p.name };
}

export function syncRoyalCommands(ctx) {
  for (const t of Object.values(ctx.game.tags)) for (const role of ['ruler', 'heir']) {
    const p = t?.[role];
    if (p?.commandProfile) { p.commandProfile.name = p.name; p.commandProfile.royalRole = role; }
  }
  const claimed = new Set();
  for (const a of Object.values(ctx.game.armies || {})) {
    if (!a?.general?.royalId) continue;
    const holder = occupant(ctx, a.tag, a.general);
    if (!holder || claimed.has(a.general.royalId)) { a.general = null; continue; }
    claimed.add(a.general.royalId);
    a.general.royalRole = holder.role; a.general.name = holder.person.name;
    holder.person.commandProfile = clone(a.general);
  }
}

export function linkNamedRoyalCommands(ctx, tag, initial = false) {
  const t = ctx.game.tags[tag]; if (!t) return;
  for (const role of ['ruler', 'heir']) {
    if (availablePerson(t, role)) continue;
    const person = t[role], alias = ROYAL_COMMAND_ALIASES[ctx.bookmark?.id]?.[person.name];
    const existing = person.commandId && armies(ctx, tag).find(a => a.general?.royalId === person.commandId);
    if (existing) continue;
    const a = armies(ctx, tag).find(a => a.general && !a.general.royalId && [person.name, alias].includes(a.general.name));
    if (!a) continue;
    const rating = initial ? HISTORICAL_COMMAND_RATINGS[ctx.bookmark?.id]?.[a.general.name] : null;
    if (rating) { for (const k of ['fire', 'shock', 'maneuver']) a.general[k] = rating[k]; }
    a.general.royalId = identity(ctx, person); a.general.royalRole = role;
    person.commandProfile = clone(a.general);
  }
}
export function initializeRoyalCommands(ctx, fresh = false) {
  if (!ctx.game.flags.royalCommandsLinked) {
    // Old campaigns gain identity links, but only a fresh opening position
    // receives revised historical skills. A veteran's earned pips are kept.
    for (const tag of Object.keys(ctx.game.tags)) linkNamedRoyalCommands(ctx, tag, fresh);
    ctx.game.flags.royalCommandsLinked = true;
  }
  syncRoyalCommands(ctx);
}
export function royalPersonFields(person) {
  return person?.commandId ? { commandId: person.commandId, commandProfile: person.commandProfile ? clone(person.commandProfile) : null } : {};
}

export function royalCommandDeath(ctx, army, cause) {
  const general = army?.general, holder = occupant(ctx, army?.tag, general);
  if (!holder || (holder.role === 'ruler' && !ctx.helpers?.rulerDies)) return false;
  const { person, role } = holder, tag = army.tag, name = person.name;
  for (const a of armies(ctx, tag)) if (a.general?.royalId === general.royalId) a.general = null;
  if (role === 'ruler') ctx.helpers.rulerDies(ctx, tag, cause);
  else {
    const t = ctx.game.tags[tag]; t.heir = null; t.legitimacy = Math.max(0, (t.legitimacy || 0) - 10);
    ctx.helpers?.chronicle?.(ctx, 'ruler', `${name}, heir of ${t.name || tag}, ${cause}.`);
    const player = tag === ctx.game.playerTag;
    ctx.bus?.emit('notify', { title: player ? 'Heir lost in command' : 'Heir of ' + (t.name || tag) + ' lost',
      text: `${name}, heir of ${t.name || tag}, ${cause}. There is no designated heir; legitimacy falls by 10.`, type: player ? 'bad' : 'info' });
  }
  syncRoyalCommands(ctx);
  return true;
}
export function royalBattleRisk(ctx, army) {
  if (occupant(ctx, army?.tag, army?.general) && ctx.rng.chance(ROYAL_COMMAND_RISK.battle)) {
    royalCommandDeath(ctx, army, 'has fallen in battle');
  }
}
export function royalArmyRemoved(ctx, army, destroyed = false) {
  const holder = occupant(ctx, army?.tag, army?.general); if (!holder) return;
  if (destroyed && ctx.rng.chance(ROYAL_COMMAND_RISK.destroyed) && royalCommandDeath(ctx, army, 'has died as the army was destroyed')) return;
  holder.person.commandProfile = clone(army.general);
}
export function monthlyRoyalCommands(ctx) {
  syncRoyalCommands(ctx);
  const date = ctx.game.date, stamp = `${date.y}:${date.m}`;
  if (ctx.game.flags.royalRiskMonth === stamp) return;
  ctx.game.flags.royalRiskMonth = stamp;
  for (const a of Object.values(ctx.game.armies || {})) {
    if (!a?.general?.royalId || !occupant(ctx, a.tag, a.general)) continue;
    if (ctx.rng.chance(atHome(ctx, a) ? ROYAL_COMMAND_RISK.camp : ROYAL_COMMAND_RISK.campaign)) {
      royalCommandDeath(ctx, a, 'has died while serving with the army');
    }
  }
}
export function royalCommandsView(ctx, tag) {
  const t = ctx.game.tags[tag]; if (!t) return [];
  return ['ruler', 'heir'].map(role => {
    const person = t[role], a = person?.commandId && armies(ctx, tag).find(a => a.general?.royalId === person.commandId);
    return { role, name: person?.name || (role === 'heir' ? 'No designated heir' : 'No ruler'),
      age: person?.age, profile: a?.general || person?.commandProfile || null, warning: ROYAL_COMMAND_WARNING,
      assigned: a ? { id: a.id, name: a.name } : null, canRecall: !!a && atHome(ctx, a),
      why: availablePerson(t, role),
      armies: armies(ctx, tag).filter(a => a.men > 0 && !a.general && atHome(ctx, a)).map(a => ({ id: a.id, name: a.name })) };
  });
}
