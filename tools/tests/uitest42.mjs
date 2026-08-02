// UI verification — SPEC §199: the nation label sits on the ground it names.
//
// The headless suite (smoke128) proves the placement against the atlas
// coastline. This proves it against the thing the player actually sees: the
// province raster in the GPU texture. For every nation label drawn at
// strategic zoom, the pixel under it is asked who owns it — `provIdAt` on the
// same ID plane the map is painted from — and the answer has to be the court
// whose name is written there. A label in the sea has no province under it at
// all, which is exactly how the old rule failed.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp/pw') + '/');
const { chromium } = require('playwright');
// SPEC §160: the boot is one fullscreen pass over 25.0M texels against 307
// seeds, on SwiftShader. See uitest11 for the measurement behind this number.
const BOOT_MS = Number(process.env.JU_BOOT_TIMEOUT || 480000);
const OUT = (process.env.JU_OUT || '/tmp') + '/';

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };

const browser = await chromium.launch({ executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.bm-card', { timeout: BOOT_MS });
for (let i = 0; i < 10; i++) {
  const txt = (await page.locator('.bm-card.current').textContent()) || '';
  if (txt.includes('Great Revolt')) { await page.locator('.bm-card.current').click(); break; }
  await page.locator('.ss-next').click();
  await page.waitForTimeout(420);
}
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click(); // JUD
await page.waitForFunction(() => !!window._ctx, null, { timeout: BOOT_MS });
await page.waitForTimeout(800);

// A realm in two places — the case the section was reported against.
await page.evaluate(() => {
  for (const nm of ['Corinth', 'Athens', 'Sparta', 'Thessalonica', 'Gortyn',
    'Alexandria', 'Memphis', 'Athribis', 'Arsinoe', 'Oxyrhynchus']) {
    const p = window._ctx.prov(nm);
    if (p) { p.owner = 'JUD'; p.controller = 'JUD'; }
  }
});

// Strategic zoom, wide enough to hold Greece, Egypt and the Levant at once.
async function view(zoom, x, y) {
  await page.evaluate(([z, cx, cy]) => window._camera.centerOn(cx, cy, z), [zoom, x, y]);
  await page.waitForTimeout(1400);
}
const readLabels = () => page.evaluate(() => [...document.querySelectorAll('#labels-layer .mlabel')]
  .filter((d) => d.style.display === 'block')
  .map((d) => {
    const m = d.style.transform.match(/translate\((-?[\d.]+)px, (-?[\d.]+)px\)/);
    const sx = m ? Number(m[1]) : 0;
    const sy = m ? Number(m[2]) : 0;
    const [mx, my] = window._camera.screenToMap(sx, sy);
    const id = window._renderer.provIdAt(mx, my);
    const p = window._ctx.game.provinces[id] || null;
    return {
      text: d.textContent, tier: d.className.replace('mlabel mlabel-', ''), sx, sy,
      prov: p && p.name, owner: p && p.owner,
    };
  }));

await view(0.7, 3851, 2535);
const strategic = await readLabels();
await page.screenshot({ path: OUT + 'labels-nation-tier.png' });

console.log('== the nation tier names each part of a realm where that part is ==');
const nation = strategic.filter((l) => l.tier === 'tag' || l.tier === 'part');
ok(nation.length >= 6, `the strategic view draws ${nation.length} nation labels`);
ok(strategic.every((l) => l.tier !== 'prov'), 'and no province names at this zoom');

const adrift = nation.filter((l) => !l.owner || l.owner === 'WASTE');
ok(adrift.length === 0, 'every one of them stands on owned land, not in the sea: '
  + (adrift.map((l) => l.text + '@' + l.prov).join(', ') || 'all ' + nation.length));

// …and on the land of the court it names: the tag's own name for a home label,
// its adjective plus the region for a part.
const wrongHands = await page.evaluate((rows) => {
  const bad = [];
  for (const l of rows) {
    const t = window._ctx.game.tags[l.owner] || {};
    const def = (window._ctx.DEFINES.TAGS || {})[l.owner] || {};
    const tweak = ((window._ctx.bookmark || {}).tagTweaks || {})[l.owner] || {};
    const name = t.name || tweak.name || def.name || l.owner;
    const adj = tweak.adj || def.adj || '';
    if (l.text === name) continue;                          // its own name at home
    if (adj && l.text.startsWith(adj + ' ')) continue;       // "[Adjective] [Region]"
    bad.push(`${l.text} stands on ${l.prov} (${l.owner})`);
  }
  return bad;
}, nation);
ok(wrongHands.length === 0, 'and each names the court that holds it: ' + (wrongHands.join(' | ') || 'all'));

console.log('\n== Judaea in two places is written in both of them ==');
const greece = nation.find((l) => l.text === 'Judaean Greece');
const home = nation.find((l) => l.text === 'Judaea');
const egypt = nation.find((l) => l.text === 'Judaean Egypt');
ok(!!greece, 'JUDAEAN GREECE is on the map: ' + (greece ? greece.prov : nation.map((l) => l.text).join(', ')));
ok(!!egypt, 'so is JUDAEAN EGYPT: ' + (egypt && egypt.prov));
ok(!!home, 'and JUDAEA is still written at home: ' + (home && home.prov));
ok(!!greece && !!home && Math.hypot(greece.sx - home.sx, greece.sy - home.sy) > 400,
  'the two are a realm apart on screen, not one label averaged into the water between them');
ok(!!greece && greece.tier === 'part' && !!home && home.tier === 'tag',
  'the foreign part is drawn in the subordinate tier, the home name in the country tier');

console.log('\n== zoomed in, the province names come back ==');
await view(2.0, 4611, 2822); // Damascus: one of the few Syrian cells wide enough to carry a name at 2x
const close = await readLabels();
const damascus = await page.evaluate(() => window._ctx.prov('Damascus').name);
ok(close.some((l) => l.tier === 'prov' && l.text === damascus),
  `${damascus} is named at province zoom (${close.filter((l) => l.tier === 'prov').length} province labels drawn)`);
ok(!close.some((l) => l.tier === 'part'), 'and no nation part labels are drawn over them');

ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));

await browser.close();
console.log(failures ? failures + ' FAILURES' : 'ALL PASS');
process.exit(failures ? 1 : 0);
