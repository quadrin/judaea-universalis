// Headless regression — SPEC §184: the cards that open a road wear a badge.
//
// `entryFork(chapterId, eventId)` is the one lookup behind the event window's
// chip, the multiplayer mirror's resolved payload, and the Compendium's badge.
// It is built from CHAPTER_PATHS itself, so this suite holds it to the tree:
// every declared entry resolves (to its own fork's question), nothing else
// resolves, and a chapter cannot borrow another chapter's cards.
import { CHAPTER_PATHS, entryFork } from '../../js/data/chapter_paths.js';

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

console.log('== §184: every declared entry resolves to its own fork ==');
{
  let entries = 0;
  const bad = [];
  for (const ch of CHAPTER_PATHS) {
    for (const fk of ch.forks) {
      for (const rd of fk.roads) {
        if (!rd.entry) continue;
        entries++;
        const hit = entryFork(ch.id, rd.entry);
        if (!hit) { bad.push(ch.id + '/' + rd.entry + ' -> null'); continue; }
        if (hit.chapter !== ch.id) bad.push(ch.id + '/' + rd.entry + ' -> wrong chapter ' + hit.chapter);
        // An entry shared by several roads resolves to ONE fork — the first
        // that declared it — and that fork must actually contain this entry.
        const owner = ch.forks.find((f) => f.id === hit.fork);
        if (!owner || !owner.roads.some((r) => r.entry === rd.entry)) {
          bad.push(ch.id + '/' + rd.entry + ' -> fork ' + hit.fork + ' does not own it');
        }
        if (typeof hit.question !== 'string' || hit.question.length < 10) {
          bad.push(ch.id + '/' + rd.entry + ' -> no question to ask');
        }
        if (!(hit.roads >= 1)) bad.push(ch.id + '/' + rd.entry + ' -> roads ' + hit.roads);
      }
    }
  }
  ok(!bad.length, 'all ' + entries + ' road entries resolve cleanly ('
    + (bad.slice(0, 4).join('; ') || 'no defects') + ')');
  ok(entries >= 20, 'the tree declares ' + entries + ' entry cards in all');
}

console.log('== §184: nothing else wears the badge ==');
{
  ok(entryFork('66ce', 'ev_vespasian_arrives') === null, 'a canonical non-fork card stays bare');
  ok(entryFork('66ce', 'no_such_event') === null, 'an unknown id stays bare');
  ok(entryFork(null, 'ev_temple_burns') === null && entryFork('66ce', null) === null,
    'null chapter or id is answered with null, not a throw');
  ok(entryFork('generic', 'ev_temple_burns') === null, 'the shared pool has no chapter and no forks');
  // A chapter cannot borrow another chapter's cards: 132's redemption entry
  // means nothing inside 66, and vice versa.
  ok(entryFork('66ce', 'ev2_era_of_redemption') === null && entryFork('132ce', 'ev_house_that_stood') === null,
    'entries do not cross chapters');
  const hit = entryFork('66ce', 'ev_house_that_stood');
  ok(!!hit && hit.fork === 'how_the_revolt_ends' && /Second Kingdom/.test(hit.question),
    'the House that stood opens how_the_revolt_ends: ' + (hit && hit.question));
  ok(!!hit && Object.isFrozen(hit), 'the lookup hands out frozen records');
}

console.log(failures ? `smoke117: ${failures} FAIL` : 'smoke117: ALL PASS');
process.exit(failures ? 1 : 0);
