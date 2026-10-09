// UI verification — SPEC §295: the score hands over cleanly, and every song
// goes to war.
//
//   - The title screen hears the open score and no song; a campaign opens on
//     a song, which comes up while the open score steps aside — one, not
//     both: the score's bus is down while a song plays.
//   - The songs sit at the open score's loudness (within 4 dB on the meter).
//   - A chosen song of peace, at peace, plays as itself. War comes: within a
//     few seconds the same song turns into its war version, at a later
//     section. Peace is signed: the war version plays out.
//   - At war a chosen song of peace starts in its war version, and the
//     settings window says so.
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

console.log('== a campaign opens on a song ==');
for (let i = 0; i < 12; i++) {
  const txt = (await page.locator('.bm-card.current').textContent()) || '';
  if (txt.includes('Great Revolt')) { await page.locator('.bm-card.current').click(); break; }
  await page.locator('.ss-next').click();
  await page.waitForTimeout(420);
}
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => window._ctx && window._ctx.game && window._ctx.game.tags[window._ctx.game.playerTag]);
await page.evaluate(() => { window._ctx.game.paused = true; });
await page.waitForFunction(() => !!window._sound.music.state().song, null, { timeout: 15000 }).catch(() => {});
st = await state();
ok(!!st.song, 'a song comes up as the campaign begins: ' + (st.song && st.song.title));
await page.waitForTimeout(3500);
st = await state();
ok(st.score < 0.05, 'and the open score has stepped aside, not played under it: ' + (st.score != null ? st.score.toFixed(3) : st.score));

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
await page.waitForFunction(() => { const x = window._sound.music.state(); return x.song && x.song.id === 'well-war'; }, null, { timeout: 8000 }).catch(() => {});
st = await state();
ok(st.mood === 'war' && st.song && st.song.id === 'well-war' && st.song.war, 'war comes, and the same tune turns to war: ' + (st.song && st.song.title));
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

console.log('== no page errors ==');
ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
