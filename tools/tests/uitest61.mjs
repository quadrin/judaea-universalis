// UI verification — SPEC §295/§296: one music at a time, and every song goes
// to war.
//
//   - The title screen hears the open score and no song. A campaign begins:
//     the open score fades out (it is heard leaving, not cut), and only when
//     it is gone does the first song begin, at its first bar.
//   - The songs sit at the open score's loudness (within 4 dB on the meter).
//   - A chosen song of peace, at peace, plays as itself. War comes: the war
//     band takes up the same tune on a bar line, at the beat the song had
//     reached. Peace is signed: the war version plays out.
//   - Songs follow one another with a breath of silence; the open score does
//     not come in between them.
//   - At war a chosen song starts in its war version, and the settings window
//     says so.
//   - "The open score only" ends the song and brings the score back for
//     good; back to automatic, the score leaves before the next song begins.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');
// The start screen waits on the province raster (SPEC §160); on SwiftShader
// that is minutes, not seconds. See uitest18.
const BOOT_MS = Number(process.env.JU_BOOT_TIMEOUT || 480000);
const OUT = (process.env.JU_OUT || '/tmp') + '/';

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };

const browser = await chromium.launch({
  executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.bm-card', { timeout: BOOT_MS });
await page.mouse.click(20, 20); // unlock the audio
await page.waitForFunction(() => window._sound && window._sound.music.state().started, null, { timeout: 30000 });
const state = () => page.evaluate(() => window._sound.music.state());
// The average loudness over `secs` (power mean of the meter, dBFS).
const loud = (secs) => page.evaluate(async (s) => {
  const xs = [];
  for (let i = 0; i < s * 10; i++) { await new Promise((r) => setTimeout(r, 100)); xs.push(window._sound.music.meter()); }
  return 10 * Math.log10(xs.map((d) => Math.pow(10, d / 10)).reduce((a, b) => a + b, 0) / xs.length);
}, secs);
const setSong = (id) => page.evaluate(async (x) => { (await import('/js/ui/settings.js')).setSetting('song', x); }, id);

console.log('== the title screen hears the open score ==');
const scoreDb = await loud(8);
let st = await state();
ok(!st.song && st.score > 0.9, 'no song on the title screen, the open score up: ' + JSON.stringify({ song: st.song, score: st.score }));
ok(scoreDb > -60, 'and it is heard: ' + scoreDb.toFixed(1) + ' dB');

console.log('== a campaign: the open score leaves, then the first song ==');
// sample on the audio clock, in the page, from just before the campaign
const sampling = () => page.evaluate(() => {
  window.__samples = [];
  clearInterval(window.__sampler);
  window.__sampler = setInterval(() => {
    const x = window._sound.music.state();
    window.__samples.push({ t: x.now, song: x.song && x.song.id, from: x.song && x.song.from, at: x.song && x.song.at, score: x.score, scoreOn: x.scoreOn });
  }, 100);
});
const samples = () => page.evaluate(() => window.__samples.slice());
for (let i = 0; i < 12; i++) {
  const txt = (await page.locator('.bm-card.current').textContent()) || '';
  if (txt.includes('Great Revolt')) { await page.locator('.bm-card.current').click(); break; }
  await page.locator('.ss-next').click();
  await page.waitForTimeout(420);
}
await page.waitForSelector('.nation-card');
await sampling();
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => window._ctx && window._ctx.game && window._ctx.game.tags[window._ctx.game.playerTag]);
await page.evaluate(() => { window._ctx.game.paused = true; });
await page.waitForFunction(() => !!window._sound.music.state().song, null, { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1000);
let xs = await samples();
st = await state();
ok(!!st.song, 'a song comes up as the campaign begins: ' + (st.song && st.song.title));
const firstSong = xs.findIndex((x) => x.song);
const left = xs.findIndex((x) => !x.scoreOn);
ok(firstSong > 0 && xs[firstSong].score < 0.02, 'the open score is gone before the song begins: score '
  + (firstSong > 0 ? xs[firstSong].score.toFixed(3) : '?'));
ok(left >= 0 && firstSong > left && xs[firstSong].t - xs[left].t >= 3.5,
  'it faded and rested first: the song began ' + (left >= 0 && firstSong > 0 ? (xs[firstSong].t - xs[left].t).toFixed(1) : '?') + ' s after the score began to leave');
const mid = xs.filter((x, i) => i > left && i < firstSong && x.score > 0.15 && x.score < 0.85);
ok(mid.length >= 1, 'the score is heard leaving, not cut: ' + mid.slice(0, 4).map((x) => x.score.toFixed(2)).join(', '));
ok(xs[firstSong] && xs[firstSong].from === 0 && xs[firstSong].at < 1.5, 'the song begins at its first bar: ' + JSON.stringify(xs[firstSong]));

console.log('== one loudness ==');
// a song of peace and a song of war, against the open score
await page.evaluate(() => {
  const g = window._ctx.game;
  const t = g.tags[g.playerTag];
  window.__wars = { atWarWith: t.atWarWith.slice(), wars: g.wars.slice() };
  t.atWarWith = [];
  g.wars = [];
});
await setSong('well');
await page.waitForFunction(() => { const x = window._sound.music.state(); return x.song && x.song.id === 'well'; }, null, { timeout: 10000 }).catch(() => {});
await page.waitForTimeout(3000); // past the fade-in
const peaceDb = await loud(12);
ok(Math.abs(peaceDb - scoreDb) <= 4, `Song of the Well (${peaceDb.toFixed(1)} dB) sits at the open score's loudness (${scoreDb.toFixed(1)} dB)`);

console.log('== war comes: the song goes to war ==');
st = await state();
ok(st.mood === 'peace' && st.song && st.song.id === 'well' && !st.song.war, 'at peace, Song of the Well plays as itself');
await page.evaluate(() => {
  const g = window._ctx.game;
  g.tags[g.playerTag].atWarWith = window.__wars.atWarWith;
  g.wars = window.__wars.wars;
});
const atWarFrom = await state();
await page.waitForFunction(() => { const x = window._sound.music.state(); return x.song && x.song.id === 'well-war'; }, null, { timeout: 12000 }).catch(() => {});
st = await state();
ok(st.mood === 'war' && st.song && st.song.id === 'well-war' && st.song.war, 'war comes, and the same tune turns to war: ' + (st.song && st.song.title));
ok(st.song && st.song.from > 0 && st.song.from % st.song.meter === 0, 'the war band takes it up on a bar line, at beat ' + (st.song && st.song.from));
ok(st.song && st.song.from * (60 / 84) >= atWarFrom.song.at - 0.5, 'where the song had got to, not back at its start: beat '
  + (st.song && st.song.from) + ', the song was ' + atWarFrom.song.at.toFixed(1) + ' s in');
await page.waitForTimeout(3000);
const warDb = await loud(10);
ok(Math.abs(warDb - scoreDb) <= 5, `the war version (${warDb.toFixed(1)} dB) is no louder than the band should be`);
await page.locator('#topbar [data-ref="settings"]').click();
await page.waitForTimeout(400);
const nowTxt = (await page.locator('#settings-modal [data-ref="stNow"]').textContent()) || '';
ok(/The Well Defended/.test(nowTxt), 'the settings window names it: ' + nowTxt);
await page.keyboard.press('Escape');

console.log('== peace is signed: the war version plays out ==');
await page.evaluate(() => {
  const g = window._ctx.game;
  g.tags[g.playerTag].atWarWith = [];
  g.wars = [];
});
await page.waitForTimeout(2500);
st = await state();
ok(st.mood === 'peace' && st.song && st.song.id === 'well-war', 'the war version is not cut off by the peace');

console.log('== songs follow one another, with no open score between ==');
await sampling();
await page.evaluate(() => window._sound.music.endNow());
await page.waitForFunction((id) => { const x = window._sound.music.state(); return x.song && x.song.id !== id || (x.song && x.song.at < 2 && x.song.at > 0); }, 'well-war', { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(600);
xs = await samples();
const gap = xs.filter((x) => !x.song);
const after = xs.findIndex((x, i) => i > 0 && x.song && !xs[i - 1].song);
ok(gap.length >= 1 && after > 0, 'the song ends, a breath, and the next begins: ' + (after > 0 ? xs[after].song : 'none'));
ok(xs.every((x) => x.score < 0.05 && !x.scoreOn), 'and the open score does not come in between: max ' + Math.max(...xs.map((x) => x.score)).toFixed(3));
ok(after > 0 && gap.length && xs[after].t - gap[0].t >= 2, 'a breath of ' + (after > 0 && gap.length ? (xs[after].t - gap[0].t).toFixed(1) : '?') + ' s');

console.log('== at war a chosen song starts in its war version ==');
await page.evaluate(() => {
  const g = window._ctx.game;
  g.tags[g.playerTag].atWarWith = window.__wars.atWarWith;
  g.wars = window.__wars.wars;
});
await setSong('hills');
await page.waitForFunction(() => { const x = window._sound.music.state(); return x.song && x.song.base === 'hills'; }, null, { timeout: 10000 }).catch(() => {});
st = await state();
ok(st.song && st.song.id === 'hills-war', 'The Hill Country, chosen at war, plays in arms: ' + (st.song && st.song.title));

console.log('== the open score only ==');
await setSong('score');
await page.waitForTimeout(6000);
st = await state();
ok(!st.song && st.scoreOn && st.score > 0.9, 'the song ends and the open score comes back: ' + JSON.stringify({ song: st.song, score: st.score }));
await page.waitForTimeout(6000);
st = await state();
ok(!st.song && st.score > 0.9, 'and no song talks over it');
await page.locator('#topbar [data-ref="settings"]').click();
await page.waitForTimeout(400);
const nowTxt2 = (await page.locator('#settings-modal [data-ref="stNow"]').textContent()) || '';
ok(/the open score/.test(nowTxt2), 'the settings window says so: ' + nowTxt2);
ok(await page.locator('#settings-modal [data-act="next"]').isDisabled(), 'and Next song rests');
await page.keyboard.press('Escape');

console.log('== back to automatic: the score leaves, then a song ==');
await sampling();
await setSong('auto');
await page.waitForFunction(() => !!window._sound.music.state().song, null, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(500);
xs = await samples();
const back = xs.findIndex((x) => x.song);
ok(back > 0 && xs[back].score < 0.02, 'the song begins once the score has gone: ' + (back > 0 ? xs[back].song + ', score ' + xs[back].score.toFixed(3) : 'no song'));

console.log('== no page errors ==');
ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
