// UI verification — v4.7 OST (SPEC §48): each age sings its own music.
// The ancient chapters pluck the lyre, the middle chapters ornament the
// klezmer clarinet, and 1948 dances the hora — with notes actually scheduled
// in every style, and the tune data present for the hora set.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp') + '/');
const { chromium } = require('playwright');

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };

const browser = await chromium.launch({
  executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

async function bootBookmark(dot) {
  await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.bm-card');
  await page.mouse.click(20, 20); // unlock audio
  await page.locator(`.ss-dot[data-dot="${dot}"]`).click();
  await page.locator('.bm-card.current').click();
  await page.waitForSelector('.nation-card');
  await page.locator('.nation-card').first().click();
  await page.waitForFunction(() => !!window._ctx && window._sound && window._sound.music.state().started);
}

console.log('== the lyre age ==');
await bootBookmark(0); // 167 BCE
await page.waitForFunction(() => window._sound.music.state().style === 'lyre', null, { timeout: 5000 });
let st = await page.evaluate(() => window._sound.music.state());
ok(st.style === 'lyre', '167 BCE plays the kinnor: ' + st.style);
const lyreBase = st.notes;
await page.waitForFunction((n) => window._sound.music.state().notes > n, lyreBase, { timeout: 30000 });
ok(true, 'the lyre schedules notes');

console.log('== the klezmer age ==');
await bootBookmark(4); // 132 CE
await page.waitForFunction(() => window._sound.music.state().style === 'klezmer', null, { timeout: 5000 });
st = await page.evaluate(() => window._sound.music.state());
ok(st.style === 'klezmer', '132 CE plays klezmer: ' + st.style);
const klezBase = st.notes;
await page.waitForFunction((n) => window._sound.music.state().notes > n, klezBase, { timeout: 30000 });
ok(true, 'the clarinet and oom-pah schedule notes');

console.log('== the hora age ==');
await bootBookmark(6); // 1948
await page.waitForFunction(() => window._sound.music.state().style === 'hora', null, { timeout: 5000 });
st = await page.evaluate(() => window._sound.music.state());
ok(st.style === 'hora', '1948 dances the hora: ' + st.style);
const horaBase = st.notes;
// the hora is dense (melody + kit every beat) — notes must climb quickly
await page.waitForFunction((n) => window._sound.music.state().notes > n + 8, horaBase, { timeout: 30000 });
st = await page.evaluate(() => window._sound.music.state());
ok(st.notes > horaBase + 8, 'the hora is in full swing: +' + (st.notes - horaBase) + ' notes');
ok(st.mood === 'war' || st.mood === 'battle' || st.mood === 'peace', 'mood machine still reporting: ' + st.mood);

console.log('== no page errors ==');
ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
