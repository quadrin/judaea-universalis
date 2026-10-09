// UI verification — SPEC §289: the settings window and the songs.
//
// A button in the topbar (and the O key, and a tile on the phone's tools
// sheet) opens Settings: the main, effects and music volumes, the button
// ticks, the song, the yearly autosave, how long notices stay, and reduce
// motion. Each one is stored, and each one is heard or seen at once.
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
for (let i = 0; i < 12; i++) {
  const txt = (await page.locator('.bm-card.current').textContent()) || '';
  if (txt.includes('Great Revolt')) { await page.locator('.bm-card.current').click(); break; }
  await page.locator('.ss-next').click();
  await page.waitForTimeout(420);
}
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click(); // Judaea, at war with Rome
await page.waitForFunction(() => window._ctx && window._ctx.game && window._ctx.game.tags[window._ctx.game.playerTag]);
await page.waitForFunction(() => window._sound.music.state().mood === 'war', null, { timeout: 10000 });

const isOpen = () => page.evaluate(() => {
  const el = document.getElementById('settings-modal');
  return !!el && !el.classList.contains('hidden');
});
const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('ju_settings') || '{}'));
const setRange = (key, v) => page.evaluate(([k, val]) => {
  const r = document.querySelector('#settings-modal input[data-set="' + k + '"]');
  r.value = String(val);
  r.dispatchEvent(new Event('input', { bubbles: true }));
  r.dispatchEvent(new Event('change', { bubbles: true }));
}, [key, v]);

console.log('== the button, the key and Escape ==');
ok(await page.locator('#topbar [data-ref="settings"]').isVisible(), 'the topbar carries a settings button');
await page.locator('#topbar [data-ref="settings"]').click();
await page.waitForTimeout(250);
ok(await isOpen(), 'the button opens Settings');
const secs = await page.locator('#settings-modal .peace-sec').allTextContents();
ok(secs.join(',') === 'Sound,Music,Game,Display', 'four sections: ' + secs.join(', '));
await page.screenshot({ path: OUT + 'v289-settings.png' });
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
ok(!(await isOpen()), 'Escape closes it');
await page.keyboard.press('o');
await page.waitForTimeout(200);
ok(await isOpen(), 'the O key opens it');

console.log('== the three volumes reach the mix ==');
const before = await page.evaluate(() => window._sound.levels());
await setRange('master', 50);
await setRange('sfx', 0);
await setRange('music', 100);
await page.waitForTimeout(700);
const after = await page.evaluate(() => window._sound.levels());
ok(Math.abs(after.master - 0.22 * 0.25) < 0.004, `main volume 50 sets the master gain to ${after.master.toFixed(3)} (was ${before.master.toFixed(3)})`);
ok(after.sfx < 0.001, 'effects volume 0 silences the effects bus: ' + after.sfx.toFixed(4));
ok(Math.abs(after.music - 0.55) < 0.01, 'music volume 100 sets the score to its full level: ' + after.music.toFixed(3));
ok((await page.locator('#settings-modal [data-val="master"]').textContent()) === '50', 'the number beside the slider follows it');
let s = await stored();
ok(s.master === 50 && s.sfx === 0 && s.music === 100, 'the three are stored: ' + JSON.stringify(s));

console.log('== a chosen song plays ==');
await page.selectOption('#settings-modal select[data-set="song"]', 'hammer');
await page.waitForFunction(() => {
  const x = window._sound.music.state();
  return x.song && x.song.id === 'hammer';
}, null, { timeout: 8000 }).catch(() => {});
let ms = await page.evaluate(() => window._sound.music.state());
ok(ms.song && ms.song.id === 'hammer', 'The Hammer is playing: ' + JSON.stringify(ms.song));
await page.waitForTimeout(1500);
const now = await page.locator('#settings-modal [data-ref="stNow"]').textContent();
ok(/The Hammer/.test(now), 'the window says what is playing: ' + now);
// The Hammer opens on the shofar (two long calls a bar), and a loaded
// machine schedules late: wait for six notes rather than a fixed time.
const notes0 = ms.notes;
await page.waitForFunction((n) => window._sound.music.state().notes > n + 6, notes0, { timeout: 20000 }).catch(() => {});
ms = await page.evaluate(() => window._sound.music.state());
ok(ms.notes > notes0 + 6, `its notes are scheduled (${ms.notes - notes0} so far)`);
const groups = await page.locator('#settings-modal select[data-set="song"] optgroup').evaluateAll((g) => g.map((x) => x.label));
ok(groups.length === 4, 'the songs are listed by age: ' + groups.join(', '));

console.log('== automatic plays a song of this age and this hour ==');
await page.selectOption('#settings-modal select[data-set="song"]', 'auto');
// the chosen song fades, and a song for the hour follows 1.5 s later
await page.waitForTimeout(2500);
await page.waitForFunction(() => !!window._sound.music.state().song, null, { timeout: 8000 }).catch(() => {});
ms = await page.evaluate(() => window._sound.music.state());
ok(ms.age === 'temple', 'the Great Revolt is an age of the Second Temple: ' + ms.age);
ok(ms.song && ['hammer', 'watchfires', 'rivers'].includes(ms.song.id), 'a Second Temple war song: ' + JSON.stringify(ms.song));
const first = ms.song && ms.song.id;
await page.locator('#settings-modal [data-act="next"]').click();
await page.waitForFunction((id) => {
  const x = window._sound.music.state();
  return x.song && x.song.id !== id;
}, first, { timeout: 8000 }).catch(() => {});
ms = await page.evaluate(() => window._sound.music.state());
ok(ms.song && ms.song.id !== first, 'Next song changes the song: ' + first + ' → ' + (ms.song && ms.song.id));

console.log('== the switches ==');
await page.locator('#settings-modal [data-toggle="clicks"]').click();
await page.locator('#settings-modal [data-toggle="reduceMotion"]').click();
await page.locator('#settings-modal [data-toggle="autosave"]').click();
await page.locator('#settings-modal [data-toast="4"]').click();
s = await stored();
ok(s.clicks === false && s.reduceMotion === true && s.autosave === false && s.toastSecs === 4, 'four switches stored: ' + JSON.stringify(s));
ok(await page.evaluate(() => document.documentElement.classList.contains('ju-reduce-motion')), 'reduce motion marks the page');
ok((await page.locator('#settings-modal [data-toggle="clicks"]').getAttribute('aria-checked')) === 'false', 'the switch says it is off');
await page.locator('#settings-modal [data-toggle="music"]').click();
await page.waitForTimeout(200);
ok((await page.evaluate(() => window._sound.music.state().on)) === false && (await page.evaluate(() => localStorage.getItem('ju_music'))) === '0',
  'the Music switch is the old music button, stored where it was');
await page.locator('#settings-modal [data-toggle="music"]').click();

console.log('== a short notice is short ==');
await page.keyboard.press('Escape');
// paused, so no other notice of the campaign pushes this one out
await page.evaluate(() => { window._ctx.game.paused = true; document.getElementById('toast-container').innerHTML = ''; });
await page.evaluate(() => window._ctx.bus.emit('notify', { title: 'Test notice', text: 'gone in four', type: 'info' }));
await page.waitForTimeout(1500);
const up = await page.evaluate(() => [...document.querySelectorAll('.toast')].some((t) => t.textContent.includes('gone in four')));
await page.waitForTimeout(3600);
const gone = await page.evaluate(() => ![...document.querySelectorAll('.toast')].some((t) => t.textContent.includes('gone in four')));
ok(up && gone, 'a notice set to Short is up at 1.5 s and gone by 5.1 s');

console.log('== Defaults ==');
await page.keyboard.press('o');
await page.locator('#settings-modal [data-act="reset"]').click();
await page.waitForTimeout(200);
s = await stored();
ok(s.master === 80 && s.sfx === 80 && s.music === 70 && s.clicks === true && s.song === 'auto' && s.reduceMotion === false,
  'Defaults puts everything back: ' + JSON.stringify(s));
ok(!(await page.evaluate(() => document.documentElement.classList.contains('ju-reduce-motion'))), 'and lets the interface move again');
await page.keyboard.press('Escape');

console.log('== the phone reaches it through the tools sheet ==');
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
ok(!(await page.locator('#topbar [data-ref="settings"]').isVisible()), 'the topbar sheds the settings button at 390px');
await page.locator('.tb-more').click();
await page.waitForTimeout(300);
await page.locator('.tools-tile[data-tool="settings"]').click();
await page.waitForTimeout(300);
ok(await isOpen(), 'the Settings tile opens the window');
const fits = await page.evaluate(() => {
  const r = document.querySelector('#settings-modal .st-card').getBoundingClientRect();
  return r.left >= 0 && r.right <= window.innerWidth && document.documentElement.scrollWidth <= window.innerWidth;
});
ok(fits, 'the card fits the phone without sideways scroll');
await page.screenshot({ path: OUT + 'v289-settings-phone.png' });

console.log('== no page errors ==');
ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
