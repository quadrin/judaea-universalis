#!/usr/bin/env node
// Judaea Universalis — render the branching path tree (SPEC §119).
//
//   node tools/paths.mjs            the whole tree
//   node tools/paths.mjs 132ce      one chapter
//   node tools/paths.mjs --gaps     only the roads that do not end anywhere
//
// This reads `js/data/chapter_paths.js` and prints it. It does NOT verify it —
// that is `smoke83.mjs`, which checks every marker against the source that
// writes it and every card against the chain that plays it. A renderer that
// also validated would be a renderer people trusted for the wrong reason.
import { readFileSync } from 'fs';

const R = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const { CHAPTER_PATHS, KNOWN_GAPS } = await import(R + '/js/data/chapter_paths.js');
const { ERAS } = await import(R + '/js/data/compendium.js');

const args = process.argv.slice(2);
const only = args.find((a) => !a.startsWith('-'));
const gapsOnly = args.includes('--gaps');

const yr = (y) => (y < 0 ? -y + ' BCE' : y + ' CE');
const wrap = (s, width, indent) => {
  const out = [];
  let line = '';
  for (const word of String(s).split(/\s+/)) {
    if (line && (line + ' ' + word).length > width) { out.push(line); line = word; }
    else line = line ? line + ' ' + word : word;
  }
  if (line) out.push(line);
  return out.map((l, i) => (i ? indent : '') + l).join('\n');
};

function yearOf(chapterId, cardId) {
  if (!cardId) return null;
  const era = ERAS.find((e) => e.bookmark.id === chapterId);
  const card = (era ? era.events : []).find((e) => e && e.id === cardId);
  if (!card) return null;
  if (card.date) return card.date.y;
  if (Number.isFinite(card.minYear)) return card.minYear;
  return null;
}

if (gapsOnly) {
  console.log('\nRoads that do not end anywhere\n');
  for (const g of KNOWN_GAPS) {
    console.log('  ' + g.chapter + ' / ' + g.fork + ' / ' + g.road);
    console.log(wrap(g.why, 74, '      ').replace(/^/, '      '));
    console.log('');
  }
  process.exit(0);
}

let roads = 0;
let ends = 0;
for (const ch of CHAPTER_PATHS) {
  if (only && ch.id !== only) continue;
  console.log('\n━━━ ' + ch.title + '  (' + ch.id + ', to ' + yr(ch.lastYear) + ')');
  for (const fk of ch.forks) {
    console.log('\n  ◆ ' + fk.question);
    if (fk.requires) console.log('    (only if ' + fk.requires + ')');
    for (let i = 0; i < fk.roads.length; i++) {
      const rd = fk.roads[i];
      const last = i === fk.roads.length - 1;
      const stem = last ? '  └─ ' : '  ├─ ';
      const cont = last ? '     ' : '  │  ';
      roads++;
      const a = yearOf(ch.id, rd.entry);
      const b = yearOf(ch.id, rd.terminal);
      let span = '';
      if (a !== null && b !== null) span = '  [' + yr(a) + ' → ' + yr(b) + ']';
      else if (a !== null) span = '  [from ' + yr(a) + ']';
      console.log(stem + rd.name + span);
      if (rd.terminal) ends++;
      const mark = rd.marker ? 'flag ' + rd.marker
        : (rd.tagMarker ? 'tag ' + rd.tagMarker
          : (rd.retired ? 'retires ' + rd.retired : 'unmarked'));
      console.log(cont + '  ' + mark
        + (rd.entry ? '  ·  opens ' + rd.entry : '')
        + (rd.terminal ? '  ·  ends ' + rd.terminal : '  ·  NO ENDING'));
      console.log(wrap(rd.note, 72, cont + '  ').replace(/^/, cont + '  '));
    }
  }
}
console.log('\n━━━ ' + roads + ' roads, ' + ends + ' of them with an ending, '
  + KNOWN_GAPS.length + ' declared gaps.');
console.log('    node tools/paths.mjs --gaps   for what is still open.\n');
