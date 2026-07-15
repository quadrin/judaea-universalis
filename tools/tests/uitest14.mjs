// UI verification — v2.7 music & sound: the generative engine schedules notes
// after the first gesture, the mood machine hears war, the music toggle
// silences and persists, and the two sound buttons render.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp/claude-0/-home-user-judaea-universalis/14e3ad23-6546-5a93-b028-f73783a98caf/scratchpad') + '/');
const { chromium } = require('playwright');

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
await page.waitForSelector('.bm-card', { timeout: 20000 });

console.log('== the buttons render ==');
ok(await page.locator('#ju-sound-btn').count() === 1, 'speaker button present');
ok(await page.locator('#ju-music-btn').count() === 1, 'music button present');

console.log('== the lyre wakes on the first gesture ==');
await page.mouse.click(20, 20); // a neutral corner: unlocks audio, hits nothing
let st = await page.evaluate(() => window._sound.music.state());
ok(st.started, 'the engine started: ' + JSON.stringify(st));
ok(st.on, 'music defaults on');
ok(st.mood === 'peace', 'the title screen is at peace: ' + st.mood);
// plucks are probabilistic (~25%/beat in peacetime) — poll, don't fix a window
await page.waitForFunction(() => window._sound.music.state().notes > 3, null, { timeout: 30000 });
st = await page.evaluate(() => window._sound.music.state());
ok(st.notes > 3, 'notes are being scheduled: ' + st.notes + ' so far');

console.log('== the mood machine hears the war ==');
for (let i = 0; i < 10; i++) {
  const txt = (await page.locator('.bm-card.current').textContent()) || '';
  if (txt.includes('Great Revolt')) { await page.locator('.bm-card.current').click(); break; }
  await page.locator('.ss-next').click();
  await page.waitForTimeout(420);
}
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click(); // JUD: born at war with Rome
await page.waitForFunction(() => !!window._ctx);
// the scheduler polls mood every 200ms — give it a moment to hear the war
await page.waitForFunction(() => window._sound.music.state().mood === 'war', null, { timeout: 10000 });
st = await page.evaluate(() => window._sound.music.state());
ok(st.mood === 'war', 'the drums wake — Judaea is at war: ' + st.mood);
ok(st.era === 'antique', 'the era is antique: ' + st.era);

console.log('== the toggle silences and persists ==');
await page.locator('#ju-music-btn').click();
await page.waitForTimeout(800);
st = await page.evaluate(() => window._sound.music.state());
ok(!st.on, 'music off after the click');
const during = st.notes;
await page.waitForTimeout(1600);
st = await page.evaluate(() => window._sound.music.state());
ok(st.notes === during, 'no notes scheduled while off (held at ' + st.notes + ')');
const persisted = await page.evaluate(() => localStorage.getItem('ju_music'));
ok(persisted === '0', 'the choice persists: ju_music=' + persisted);
await page.locator('#ju-music-btn').click();
// wartime drums land every other beat, so notes resume within a few beats
await page.waitForFunction((n) => window._sound.music.state().notes > n, during, { timeout: 30000 });
st = await page.evaluate(() => window._sound.music.state());
ok(st.on && st.notes > during, 'the lyre returns: ' + st.notes + ' notes');

console.log('== no page errors ==');
ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
