// Six situated crises, using the same plain save ledger as the succession
// chains. Event effects validate live actors; foreign courts answer for themselves.
import { month, live, state, war, land, held, note, remember, regard, subject, split } from './historical_crises.js';
import { isHumanChair, clientForeignPolicyBar, truceActive, recognized, withdrawFromWar,
  breakAllianceCore, independenceInfo } from './military.js';
import { isCoastal, blockadedBy } from './navy.js';
import { eventMonthIndex } from './events.js';

const human = (ctx, tag) => isHumanChair(ctx.game, tag);
const sovereign = (ctx, tag) => !!(tag && !clientForeignPolicyBar(ctx, tag));
const safe = (ctx, tag) => held(ctx, tag, land(ctx, tag).map(p => p.canon || p.name));
const canFight = (ctx, a, b) => !!(a && b && a !== b && sovereign(ctx, a)
  && ctx.game.tags[b]?.overlord !== a && !truceActive(ctx, a, b) && !recognized(ctx, a, b));
const cash = (ctx, tag, amount) => !!(tag && ctx.game.tags[tag].treasury >= amount);
const error = why => ({ ok: false, why });
const ok = () => ({ ok: true });
const fields = ctx => { ctx.game.flags.politicalCrises ||= {}; return ctx.game.flags.politicalCrises; };
const access = (ctx, a, b, months = 36) => {
  const f = fields(ctx); f.access ||= [];
  for (const [owner, grantee] of [[a, b], [b, a]]) {
    f.access = f.access.filter(v => !(live(ctx, v.owner) === owner && live(ctx, v.grantee) === grantee));
    f.access.push({ owner, grantee, until: month(ctx) + months });
  }
};
function leavePartner(ctx, tag, partner) {
  for (const w of (ctx.game.wars || []).slice()) if ([w.attackers, w.defenders].some(s => s.includes(tag) && s.includes(partner))) withdrawFromWar(ctx, w, tag);
  breakAllianceCore(ctx, tag, partner);
  const t = ctx.game.tags[tag];
  if (t?.overlord === partner) t.overlord = null;
  if (t?.chapterStrategy?.patron?.tag === partner) t.chapterStrategy.patron = null;
}
function transfer(ctx, from, to, gold, manpower = 0) {
  if (!cash(ctx, from, gold) || !to || ctx.game.tags[from].manpower < manpower) return false;
  ctx.game.tags[from].treasury -= gold; ctx.game.tags[to].treasury += gold;
  ctx.game.tags[from].manpower -= manpower; ctx.game.tags[to].manpower += manpower; return true;
}
function join(ctx, actor, friend, foe) {
  if (!canFight(ctx, actor, foe)) return null;
  const w = war(ctx, friend, foe);
  return w ? ctx.helpers.joinWar(ctx, w, actor, w.attackers.includes(friend) ? 'att' : 'def') : null;
}
function finish(ctx, key, r, status, extra = {}) {
  remember(ctx, key, { ...r, status, ...extra }); return ok();
}

export const ROMAN_RESTORATION = ['Tigranocerta', 'Sophene', 'Amida', 'Melitene', 'Samosata', 'Zeugma', 'Cyrrhus',
  'Beroea', 'Antioch', 'Seleucia Pieria', 'Laodicea', 'Apamea', 'Emesa', 'Chalcis', 'Damascus', 'Palmyra'];

export function politicalCrisisInfo(ctx, key) {
  const g = ctx.game, r = state(ctx)[key];
  if (key === 'egypt') {
    const egypt = live(ctx, 'PTO'), balas = live(ctx, 'BAL'), actor = live(ctx, 'HAS');
    const incumbent = live(ctx, 'SEL');
    const seat = balas && held(ctx, balas, ['Ptolemais', 'Tripolis', 'Seleucia Pieria'])[0];
    const exists = !r && g.date.y >= -145 && g.date.y <= -144 && egypt && balas && actor
      && sovereign(ctx, egypt) && /Ptolemy VI(?:\s|$)|Philometor/.test(g.tags[egypt].ruler?.name || '')
      && /Alexander Balas/.test(g.tags[balas].ruler?.name || '')
      && held(ctx, balas, ['Antioch']).length && (!incumbent || !/Demetrius I(?:\s|$)/.test(g.tags[incumbent].ruler?.name || ''));
    const claimant = live(ctx, r?.claimant || 'DMT');
    const canDefend = !!(r?.status === 'switched' && r.alignment === 'pending' && actor && balas && egypt && war(ctx, balas, egypt) && canFight(ctx, actor, egypt));
    return { exists: !!exists, egypt, balas, actor, claimant, record: r,
      canSwitch: !!(exists && seat && land(ctx, balas).length > 1 && !g.tags.DMT && canFight(ctx, egypt, balas)),
      canAlign: !!(r?.status === 'switched' && r.alignment === 'pending' && actor && claimant && egypt && !war(ctx, actor, claimant) && !war(ctx, actor, egypt)
        && sovereign(ctx, actor) && (g.tags[actor].points?.infl || 0) >= 20), canDefend };
  }
  if (key === 'tryphon') {
    const actor = live(ctx, r?.actor || 'HAS'), p = ctx.prov('Ptolemais'), host = live(ctx, r?.host || p?.owner);
    const t = g.tags[actor];
    const exists = !!(!r && actor && host && actor !== host && ['SEL', 'BAL', 'DMT'].some(k => live(ctx, k) === host)
      && g.date.y >= -143 && g.date.y <= -142 && /Jonathan/.test(t.ruler?.name || '')
      && held(ctx, host, ['Ptolemais']).length);
    return { exists, actor, host, record: r,
      canAttend: exists && t.manpower >= 1000,
      canEscort: exists && t.manpower >= 3000 && t.treasury >= 40,
      canInvade: !!(r?.status === 'refused' && canFight(ctx, host, actor)),
      canRansom: !!(r?.status === 'captive' && cash(ctx, actor, 100)) };
  }
  if (key === 'arabia' || key === 'lakhmid') {
    const court = live(ctx, r?.court || (key === 'arabia' ? 'NAB' : 'LKH'));
    const empire = live(ctx, r?.empire || (key === 'arabia' ? 'ROM' : 'SAS'));
    const t = g.tags[court], expected = key === 'arabia' ? 106 : 602;
    const exists = !!(!r && g.date.y === expected && court && empire && court !== empire && sovereign(ctx, empire)
      && land(ctx, court).length && (!t.overlord || t.overlord === empire)
      && (key !== 'lakhmid' || t.overlord === empire));
    const canAbsorb = !!(court && empire && court !== empire && sovereign(ctx, empire)
      && (!t.overlord || t.overlord === empire) && !war(ctx, court, empire) && land(ctx, court).length
      && safe(ctx, court).length === land(ctx, court).length
      && !(human(ctx, court) && human(ctx, empire)));
    return { exists, court, empire, record: r, canAbsorb,
      canClient: !!(court && empire && court !== empire && sovereign(ctx, empire) && (!t.overlord || t.overlord === empire) && !war(ctx, court, empire)),
      canResist: !!(court && empire && (t.overlord === empire ? independenceInfo(ctx, court)?.can : canFight(ctx, court, empire))),
      canNegotiate: !!(r?.status === 'demand' && court && empire && court !== empire && sovereign(ctx, empire)
        && (!t.overlord || t.overlord === empire) && cash(ctx, court, 100) && !war(ctx, court, empire)) };
  }
  if (key === 'peace628') {
    const persia = live(ctx, 'SAS'), rome = live(ctx, 'BYZ'), actor = live(ctx, r?.actor || 'JUD');
    const exists = !!(!r && g.date.y >= 628 && g.date.y <= 630 && persia && rome && war(ctx, persia, rome)
      && g.firedEvents.ev_p_nineveh && /Khosrow|Chosroes/.test(g.tags[persia].ruler?.name || ''));
    const restoration = persia ? land(ctx, persia).filter(p => ['SAS', 'BYZ'].map(t => live(ctx, t)).includes(p.controller)
      && (ctx.bookmark.owners?.[p.canon || p.name] === 'BYZ' || ROMAN_RESTORATION.includes(p.canon || p.name))).map(p => p.id) : [];
    const localEligible = !!(r?.status === 'settled' && actor && rome && actor !== rome && actor !== persia
      && sovereign(ctx, rome) && land(ctx, actor).length
      && (!g.tags[actor].overlord || [persia, rome].includes(g.tags[actor].overlord)));
    const localPending = localEligible && ['pending', 'refused'].includes(r.local);
    return { exists, actor, persia, rome, record: r, restoration, localEligible, localPending,
      canRequest: !!(localPending && r.local === 'pending' && cash(ctx, actor, 75)),
      canSubmit: localPending };
  }
  if (key === 'reparations') {
    const actor = live(ctx, r?.actor || 'ISR'), donor = live(ctx, r?.donor || 'GER');
    const exists = !!(!r && !g.flags.shilumimRefused && !g.flags.shilumimSigned && actor && donor && g.date.y >= 1952 && g.date.y <= 1953 && sovereign(ctx, donor)
      && !war(ctx, actor, donor) && land(ctx, actor).length);
    return { exists, actor, donor, record: r,
      canSign: !!(r?.status === 'offered' && actor && donor && sovereign(ctx, donor) && !war(ctx, actor, donor)) };
  }
  return {};
}

function installSimon(ctx, actor) {
  ctx.helpers.killGeneral(ctx, actor, 'Jonathan Apphus');
  ctx.helpers.setRuler(ctx, actor, { name: 'Simon Thassi', title: 'Acting High Priest', gov: 4, infl: 3, mar: 3, age: 50 });
  ctx.helpers.setHeir(ctx, actor, { name: 'John Hyrcanus', gov: 3, infl: 3, mar: 4, age: 21 });
  const army = Object.values(ctx.game.armies).filter(a => a.tag === actor).sort((a, b) => b.men - a.men)[0];
  if (army && !army.general) army.general = { name: 'Simon Thassi', fire: 2, shock: 3, maneuver: 3 };
}
function recognizeLocal(ctx, r, i) {
  leavePartner(ctx, i.actor, i.persia);
  if (ctx.game.tags[i.actor].overlord === i.rome) ctx.game.tags[i.actor].overlord = null;
  if (ctx.game.tags[i.actor].chapterStrategy?.patron?.tag === i.rome) ctx.game.tags[i.actor].chapterStrategy.patron = null;
  ctx.helpers.recognize(ctx, i.rome, i.actor);
  const t = ctx.game.tags[i.rome];
  const addedGuarantee = !t.guarantees.includes(i.actor); if (addedGuarantee) t.guarantees.push(i.actor);
  return finish(ctx, 'peace628', r, 'settled', { local: 'recognized', guaranteeUntil: month(ctx) + 120, addedGuarantee });
}

export function choosePoliticalCrisis(ctx, key, choice, originalActor) {
  const g = ctx.game, h = ctx.helpers, i = politicalCrisisInfo(ctx, key), r = i.record;
  if (key === 'egypt') {
    if (['switch', 'loyal'].includes(choice)) {
      if (!i.exists || choice === 'switch' && !i.canSwitch) return error('Egypt’s historical alignment no longer fits this map.');
      if (choice === 'loyal') { regard(ctx, i.egypt, i.balas, 40); return finish(ctx, key, {}, 'loyal', { actor: i.actor }); }
      const child = split(ctx, i.balas, 'DMT', ['Ptolemais', 'Tripolis', 'Seleucia Pieria'],
        { name: 'Demetrius II Nicator', title: 'Basileus', gov: 2, infl: 3, mar: 3, age: 16 },
        'Demetrius II’s Claim', [92, 105, 161], .2);
      if (!child) return error('Demetrius has no safe landing place.');
      leavePartner(ctx, i.egypt, i.balas); h.retireAffinity(ctx, i.egypt, i.balas);
      const w = h.declareWar(ctx, 'DMT', i.balas, 'The War of Demetrius II');
      if (!w) return error('The claimant cannot declare his war.');
      h.joinWar(ctx, w, i.egypt, 'att');
      access(ctx, i.egypt, 'DMT'); regard(ctx, i.egypt, i.balas, -100);
      note(ctx, 'Ptolemy VI changes allegiance. Demetrius II gains a rival court and Egypt enters the war against Alexander Balas.');
      return finish(ctx, key, {}, 'switched', { actor: i.actor, claimant: 'DMT', alignment: 'pending' });
    }
    if (r?.status !== 'switched') return error('Egypt has not changed sides.');
    if (choice === 'align') {
      if (!i.canAlign) return error('We need 20 influence, an independent foreign policy and peace with Egypt and Demetrius.');
      leavePartner(ctx, i.actor, i.balas); g.tags[i.actor].points.infl -= 20;
      h.removeModifier(ctx, i.actor, 'high_priesthood'); h.setFlag(ctx, 'highPriesthood', false);
      access(ctx, i.actor, i.egypt); access(ctx, i.actor, i.claimant);
      regard(ctx, i.egypt, i.actor, 40); regard(ctx, i.balas, i.actor, -60);
      return finish(ctx, key, r, 'switched', { alignment: 'demetrius' });
    }
    if (choice === 'defend') {
      if (!i.canDefend || !join(ctx, i.actor, i.balas, i.egypt)) return error('Our commitments prevent joining Balas’s war.');
      regard(ctx, i.balas, i.actor, 50); return finish(ctx, key, r, 'switched', { alignment: 'balas' });
    }
    if (choice === 'neutral' && r.alignment === 'pending') return finish(ctx, key, r, 'switched', { alignment: 'requested' });
    if (choice === 'permit' && r.alignment === 'requested' && i.actor && i.egypt && !war(ctx, i.actor, i.egypt)) {
      access(ctx, i.actor, i.egypt); regard(ctx, i.egypt, i.actor, 15);
      return finish(ctx, key, r, 'switched', { alignment: 'neutral' });
    }
    if (choice === 'deny' && r.alignment === 'requested') {
      regard(ctx, i.egypt, i.actor, -40); return finish(ctx, key, r, 'switched', { alignment: 'rebuffed' });
    }
  }
  if (key === 'tryphon') {
    if (['attend', 'escort', 'refuse'].includes(choice)) {
      if (!i.exists || choice === 'attend' && !i.canAttend || choice === 'escort' && !i.canEscort) return error('The invitation or escort is no longer available.');
      if (choice === 'refuse') { regard(ctx, i.host, i.actor, -30); return finish(ctx, key, {}, 'refused', { actor: i.actor, host: i.host }); }
      const escort = choice === 'escort' ? 3000 : 1000;
      g.tags[i.actor].manpower -= escort; if (choice === 'escort') g.tags[i.actor].treasury -= 40;
      return finish(ctx, key, {}, 'meeting', { actor: i.actor, host: i.host, escort, ruler: { ...g.tags[i.actor].ruler } });
    }
    if (!r || !i.actor || !i.host) return error('The courts involved in the invitation no longer exist.');
    if (['honour', 'ambush'].includes(choice)) {
      if (r.status !== 'meeting' || g.tags[i.actor].ruler?.name !== r.ruler.name) return error('This meeting is no longer pending.');
      if (choice === 'honour') {
        g.tags[i.actor].manpower += r.escort; regard(ctx, i.actor, i.host, 30);
        return finish(ctx, key, r, 'safe', { escort: 0 });
      }
      if (r.escort >= 3000) {
        const seat = safe(ctx, i.actor)[0]; if (!seat) return error('The escort has no home to retreat to.');
        h.spawnArmy(ctx, i.actor, seat.canon || seat.name, { inf: 2, name: 'Jonathan’s Returning Escort' });
        return finish(ctx, key, r, 'escaped', { escort: 0, casualties: 1000 });
      }
      installSimon(ctx, i.actor); h.adjust(ctx, i.actor, { stability: -1, legitimacy: 5 });
      h.setFlag(ctx, 'jonathanTaken', true);
      note(ctx, 'Jonathan is captured at Ptolemais; his escort is lost. Simon takes the government while the captive’s fate remains unresolved.');
      return finish(ctx, key, r, 'captive', { escort: 0, casualties: r.escort });
    }
    if (choice === 'ransom') {
      if (!i.canRansom || !transfer(ctx, i.actor, i.host, 100)) return error('A ransom requires 100 talents and a living captor.');
      return finish(ctx, key, r, 'ransom');
    }
    if (choice === 'withhold' && r.status === 'captive') { h.setFlag(ctx, 'jonathanGone', true); return finish(ctx, key, r, 'dead'); }
    if (choice === 'betray' && r.status === 'ransom') { h.setFlag(ctx, 'jonathanGone', true); return finish(ctx, key, r, 'dead'); }
    if (choice === 'release' && r.status === 'ransom') {
      if (g.tags[i.actor].ruler?.name !== 'Simon Thassi') return error('The acting government has already changed.');
      h.setRuler(ctx, i.actor, r.ruler); h.setFlag(ctx, 'jonathanTaken', false);
      return finish(ctx, key, r, 'released');
    }
    if (choice === 'invade') {
      if (!i.canInvade || !h.declareWar(ctx, i.host, i.actor, 'Tryphon’s Punitive Expedition')) return error('Tryphon’s court is still bound by its diplomatic commitments.');
      return finish(ctx, key, r, 'war');
    }
    if (choice === 'abandon' && r.status === 'refused') return finish(ctx, key, r, 'avoided');
  }
  if (key === 'arabia' || key === 'lakhmid') {
    if (['demand', 'confirm'].includes(choice)) {
      if (!i.exists) return error('The historical client question no longer fits these courts.');
      return finish(ctx, key, {}, choice === 'demand' ? 'demand' : 'offer_client', { court: i.court, empire: i.empire,
        formerRuler: { ...g.tags[i.court].ruler }, provinces: land(ctx, i.court).map(p => p.id), reactions: [] });
    }
    if (!r || !i.empire) return error('The imperial demand no longer has a deciding court.');
    if (choice === 'accept') {
      if (!['demand', 'ultimatum'].includes(r.status) || !i.canAbsorb) return error('Annexation needs uncontested land and cannot merge two human chairs.');
      const names = land(ctx, i.court).map(p => p.name);
      h.dissolveTag(ctx, i.court, i.empire, { chronicle: `${names.join(', ')} pass into direct imperial administration.` });
      return finish(ctx, key, r, 'annexed');
    }
    if (choice === 'negotiate') {
      if (!i.canNegotiate) return error('The embassy requires 100 talents and peace with the empire.');
      transfer(ctx, i.court, i.empire, 100); return finish(ctx, key, r, 'petition');
    }
    if (choice === 'approve' || choice === 'client') {
      if (!i.canClient || !['petition', 'offer_client'].includes(r.status)) return error('There is no peaceful client settlement to confirm.');
      subject(ctx, i.court, i.empire, .1);
      if (key === 'lakhmid' && r.status === 'petition') {
        const heir = g.tags[i.court].heir;
        h.setRuler(ctx, i.court, { ...(heir || {}), name: heir?.name || 'The Council of Hira', title: heir ? 'Client King' : 'Council', age: heir?.age || 45 });
        h.setHeir(ctx, i.court, null);
      }
      return finish(ctx, key, r, 'client');
    }
    if (choice === 'reject' && ['petition', 'offer_client'].includes(r.status)) return finish(ctx, key, r, 'ultimatum');
    if (choice === 'resist') {
      if (!['demand', 'offer_client', 'ultimatum'].includes(r.status) || !i.canResist) return error('A truce or another commitment still bars resistance.');
      const result = g.tags[i.court].overlord === i.empire ? h.declareIndependence(ctx, i.court)
        : { ok: !!h.declareWar(ctx, i.court, i.empire, `The Defence of ${g.tags[i.court].name}`) };
      if (!result.ok) return error('The declaration failed.');
      return finish(ctx, key, r, 'resisting');
    }
    const actor = live(ctx, originalActor || (key === 'arabia' ? 'JUD' : 'SAM'));
    if (!actor || [i.court, i.empire].includes(actor) || (r.reactions || []).some(v => live(ctx, v.tag) === actor)) return error('This court has already answered the imperial change.');
    if (!['annexed', 'client', 'resisting'].includes(r.status)) return error('The client settlement is still undecided.');
    if (choice === 'recognize') { regard(ctx, i.empire, actor, 15); }
    else if (choice === 'road') {
      if (r.status !== 'annexed' || war(ctx, actor, i.empire) || !transfer(ctx, actor, i.empire, 60)) return error('A road concession requires peace and 60 talents.');
      h.addTagModifier(ctx, actor, { id: key + '_road_concession', name: 'The Arabian Road Concession', months: 120, effects: { tradeMult: 1.15 } });
      access(ctx, actor, i.empire, 120);
    } else if (choice === 'support') {
      if (r.status !== 'resisting' || !i.court || !transfer(ctx, actor, i.court, 100, 1000)) return error('Support requires a surviving resistance court, 100 talents and 1,000 manpower.');
      regard(ctx, i.empire, actor, -50); regard(ctx, i.court, actor, 50);
    } else if (choice === 'shelter') {
      if (r.status !== 'annexed' || !cash(ctx, actor, 50)) return error('Hosting the displaced court requires 50 talents.');
      g.tags[actor].treasury -= 50; regard(ctx, i.empire, actor, -40);
      for (const id of r.provinces) if (ctx.byId(id)?.owner === i.empire && !g.tags[actor].claims.includes(id)) g.tags[actor].claims.push(id);
      h.addTagModifier(ctx, actor, { id: key + '_exiled_court', name: 'The Exiled Court', months: 120, effects: { diploSeats: 1 } });
    } else return error('This response is unavailable.');
    return finish(ctx, key, r, r.status, { reactions: [...r.reactions, { tag: actor, choice }] });
  }
  if (key === 'peace628') {
    if (['offer', 'continue'].includes(choice)) {
      if (!i.exists) return error('The historical imperial war or ruler no longer exists.');
      if (choice === 'continue') return finish(ctx, key, {}, 'continued', { actor: i.actor });
      h.setRuler(ctx, i.persia, { name: 'Kavad II', title: 'King of Kings', gov: 1, infl: 2, mar: 1, age: 38 });
      h.adjust(ctx, i.persia, { stability: -1, legitimacy: -20 });
      return finish(ctx, key, {}, 'offered', { actor: i.actor });
    }
    if (!r || !i.persia || !i.rome) return error('An empire needed for this settlement no longer exists.');
    if (['restore', 'armistice', 'reject'].includes(choice)) {
      if (r.status !== 'offered' || !war(ctx, i.persia, i.rome)) return error('The empires have already settled their war.');
      if (choice === 'reject') return finish(ctx, key, r, 'rejected');
      if (choice === 'restore') for (const id of i.restoration) h.changeOwner(ctx, ctx.byId(id).canon, i.rome);
      h.endWar(ctx, i.persia, i.rome, null);
      h.addTagModifier(ctx, i.persia, { id: 'house_eats_itself', name: 'The Sasanian Succession Crisis', months: 60, effects: { aiPassive: true, moraleMult: .85, reinforceMult: .75 } });
      note(ctx, 'The empires agree peace. Only Persian-held land can be restored by their treaty; surviving local courts must answer separately.');
      return finish(ctx, key, r, 'settled', { settlement: choice, local: 'pending', restored: choice === 'restore' ? i.restoration : [] });
    }
    if (choice === 'petition') {
      if (!i.canRequest || !transfer(ctx, i.actor, i.rome, 75)) return error('Recognition requires a surviving court and a 75-talent embassy.');
      return finish(ctx, key, r, 'settled', { local: 'petition' });
    }
    if (choice === 'submit') {
      if (!i.canSubmit) return error('Local government cannot be agreed with this emperor now.');
      if (i.persia) leavePartner(ctx, i.actor, i.persia);
      h.endWar(ctx, i.actor, i.rome, null); subject(ctx, i.actor, i.rome, .1);
      return finish(ctx, key, r, 'settled', { local: 'client' });
    }
    if (choice === 'recognize' && r.local === 'petition' && i.localEligible) return recognizeLocal(ctx, r, i);
    if (choice === 'refuse' && r.local === 'petition') return finish(ctx, key, r, 'settled', { local: 'refused' });
    if (choice === 'resist' && i.localPending) {
      leavePartner(ctx, i.actor, i.persia); leavePartner(ctx, i.actor, i.rome);
      regard(ctx, i.rome, i.actor, -60); return finish(ctx, key, r, 'settled', { local: 'resisting' });
    }
    if (choice === 'enforce' && r.local === 'resisting' && canFight(ctx, i.rome, i.actor)) {
      if (!war(ctx, i.rome, i.actor) && !h.declareWar(ctx, i.rome, i.actor, 'The Enforcement of the Imperial Settlement')) return error('Rome cannot intervene.');
      return finish(ctx, key, r, 'settled', { local: 'war' });
    }
    if (choice === 'leave' && r.local === 'resisting') return finish(ctx, key, r, 'settled', { local: 'independent' });
  }
  if (key === 'reparations') {
    if (['shipping', 'industry', 'housing', 'decline'].includes(choice)) {
      if (!i.exists) return error('The agreement cannot be negotiated by these countries now.');
      if (choice === 'decline') {
        h.setFlag(ctx, 'reparationsSettled', true); h.setFlag(ctx, 'reparationsRefused', true); h.setFlag(ctx, 'shilumimRefused', true);
        h.factionShift(ctx, i.actor, 'revisionists', 25); h.factionShift(ctx, i.actor, 'coalition', -10);
        h.adjust(ctx, i.actor, { legitimacy: 12, stability: 1 });
        h.addTagModifier(ctx, i.actor, { id: 'the_long_austerity', name: 'The Long Austerity', months: 96, effects: { incomeMult: .92 } });
        return finish(ctx, key, {}, 'declined', { actor: i.actor, donor: i.donor });
      }
      return finish(ctx, key, {}, 'offered', { actor: i.actor, donor: i.donor, priority: choice });
    }
    if (choice === 'sign') {
      if (!i.canSign) return error('The parties are no longer able to sign this agreement.');
      h.setFlag(ctx, 'reparationsSettled', true); h.setFlag(ctx, 'reparationsTaken', true); h.setFlag(ctx, 'shilumimSigned', true);
      h.factionShift(ctx, i.actor, 'revisionists', -25); h.factionShift(ctx, i.actor, 'coalition', 10);
      h.addTagModifier(ctx, i.actor, { id: 'zion_square', name: 'Opposition to the Agreement', months: 24, effects: { unrestAll: 1 } });
      note(ctx, 'The Luxembourg Agreement is signed. Industrial goods will arrive over twelve years; there is no immediate cash windfall.');
      const started = Math.max(month(ctx) + 1, eventMonthIndex(1953, 3));
      return finish(ctx, key, r, 'active', { until: started + 144, goods: 0, delivered: 0, invested: 0, projects: [], why: '', started });
    }
    if (choice === 'reject' && r?.status === 'offered') {
      h.setFlag(ctx, 'reparationsSettled', true); return finish(ctx, key, r, 'rejected');
    }
  }
  return error('This political choice is no longer available.');
}

export function reparationsInvestmentInfo(ctx, provId, compromise = false) {
  const i = politicalCrisisInfo(ctx, 'reparations'), r = i.record, p = ctx.byId(Number(provId));
  let why = !r || !['active', 'completed'].includes(r.status) || i.actor !== ctx.game.playerTag ? 'No reparations goods are available to this court.' : '';
  if (!why && compromise) {
    if (r.compromise) why = 'This domestic compromise has already been funded.';
    else if (r.goods < 48 || (ctx.game.tags[i.actor].points?.infl || 0) < 30) why = 'Requires 48 goods and 30 influence.';
  } else if (!why) {
    if (r.goods < 96) why = 'Requires 96 delivered goods.';
    else if (!p || p.owner !== i.actor || p.controller !== i.actor || p.siege || p.impassable || ctx.game.battles.some(b => b.prov === p.id)) why = 'Choose an uncontested province of our own.';
    else if (r.projects.some(v => v.province === p.id)) why = 'This province already received a reparations project.';
    else if (r.priority === 'shipping' && (!isCoastal(ctx, p.id) || blockadedBy(ctx, p.id))) why = 'Shipping investment requires an unblocked coastal province.';
  }
  return { ok: !why, why, cost: compromise ? 48 : 96, priority: r?.priority, province: p?.id };
}
export function investReparations(ctx, provId, compromise = false) {
  const check = reparationsInvestmentInfo(ctx, provId, compromise); if (!check.ok) return check;
  const i = politicalCrisisInfo(ctx, 'reparations'), r = i.record, t = ctx.game.tags[i.actor];
  if (compromise) {
    t.points.infl -= 30; r.goods -= 48; r.compromise = true;
    ctx.helpers.removeModifier(ctx, i.actor, 'zion_square'); ctx.helpers.factionShift(ctx, i.actor, 'revisionists', 15);
    note(ctx, 'Part of the goods programme funds a domestic compromise; one investment is delayed in exchange for reduced political opposition.');
    return ok();
  }
  const p = ctx.byId(Number(provId)); r.goods -= 96; r.invested += 96;
  p.buildings ||= []; p.dev ||= { tax: 0, prod: 0, mp: 0 };
  const building = r.priority === 'shipping' ? 'shipyard' : 'market';
  if (r.priority !== 'housing' && !p.buildings.includes(building)) p.buildings.push(building);
  if (r.priority === 'housing') {
    p.dev.tax++; p.dev.mp++;
    ctx.helpers.addProvinceModifier(ctx, p.canon || p.name, { id: 'reparations_housing', name: 'Housing and Absorption', months: -1, effects: { unrest: -1, growthMult: 1.08 } });
  } else p.dev.prod++;
  r.projects.push({ province: p.id, priority: r.priority, at: month(ctx) });
  note(ctx, `Delivered reparations goods fund ${r.priority} works at ${p.name}.`);
  ctx.bus.emit('provinceOwner', {}); return ok();
}

export function monthlyPoliticalCrises(ctx) {
  const f = fields(ctx), current = month(ctx); if (f.lastMonth === current) return;
  f.lastMonth = current; f.monthlyExpenses = {};
  f.access = (f.access || []).filter(v => v.until > current && live(ctx, v.owner) && live(ctx, v.grantee));
  const peace = state(ctx).peace628;
  if (peace?.addedGuarantee && peace.guaranteeUntil <= current) {
    const rome = live(ctx, 'BYZ'), actor = live(ctx, peace.actor);
    if (rome) ctx.game.tags[rome].guarantees = ctx.game.tags[rome].guarantees.filter(t => t !== actor);
    peace.addedGuarantee = false;
  }
  const i = politicalCrisisInfo(ctx, 'reparations'), r = i.record;
  if (!r || r.status !== 'active') return;
  if (current < r.started) { r.why = 'Awaiting entry into force'; return; }
  if (r.until <= current) { r.status = 'completed'; r.why = 'The twelve-year delivery period has ended.'; return; }
  const ports = safe(ctx, i.actor).filter(p => isCoastal(ctx, p.id) && !blockadedBy(ctx, p.id));
  r.why = !i.actor || !i.donor ? 'A signatory no longer exists' : war(ctx, i.actor, i.donor) ? 'War between signatories'
    : ctx.game.embargoes?.[i.donor + '>' + i.actor] || ctx.game.embargoes?.[i.actor + '>' + i.donor] ? 'An embargo blocks deliveries'
    : !ports.length ? 'No uncontested, unblocked delivery port' : !cash(ctx, i.donor, 8) ? 'German deliveries are unfunded' : '';
  if (!r.why) { f.monthlyExpenses[i.donor] = 8; r.goods += 8; r.delivered += 8; }
  if (i.actor && !human(ctx, i.actor) && r.goods >= 96) {
    // Reuse the command's validation under this AI's chair, without changing
    // any other court's choices or retaining a temporary protagonist.
    const previous = ctx.game.playerTag;
    try {
      ctx.game.playerTag = i.actor;
      const p = safe(ctx, i.actor).find(p => reparationsInvestmentInfo(ctx, p.id).ok);
      if (p) investReparations(ctx, p.id);
    } finally { ctx.game.playerTag = previous; }
  }
}

export function politicalCrisisView(ctx) {
  const i = politicalCrisisInfo(ctx, 'reparations'), r = i.record;
  if (!r || i.actor !== ctx.game.playerTag || !['active', 'completed'].includes(r.status)) return null;
  return { priority: r.priority, goods: r.goods, delivered: r.delivered, invested: r.invested, projects: r.projects.length,
    months: Math.max(0, r.until - month(ctx)), why: r.why, status: r.status,
    compromise: reparationsInvestmentInfo(ctx, 0, true),
    provinces: land(ctx, i.actor).map(p => ({ id: String(p.id), name: p.name, ...reparationsInvestmentInfo(ctx, p.id) })) };
}

export function canPoliticalIntervention(ctx, key) {
  const i = politicalCrisisInfo(ctx, key);
  return !!(i.record?.local === 'resisting' && canFight(ctx, i.rome, i.actor));
}
