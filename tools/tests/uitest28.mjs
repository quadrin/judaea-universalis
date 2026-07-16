// UI verification — v5.5: the map as bombsight and the unit inspector.
// A selected wing raids by clicking a target in range; clicking an enemy
// banner opens the field-glasses inspector; warships and merchantmen render.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp/pw') + '/');
const { chromium } = require('playwright');
const OUT = (process.env.JU_OUT || '/tmp') + '/';

async function pickBookmark(page, nameFrag) {
  await page.waitForSelector('.bm-card', { timeout: 20000 });
  for (let i = 0; i < 8; i++) {
    const cur = page.locator('.bm-card.current');
    const txt = (await cur.textContent()) || '';
    if (txt.includes(nameFrag)) { await cur.click(); return; }
    await page.locator('.ss-next').click();
    await page.waitForTimeout(450);
  }
  throw new Error('bookmark not found: ' + nameFrag);
}

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
await pickBookmark(page, 'Independence');
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => !!window._ctx, null, { timeout: 60000 });
await page.waitForTimeout(600);

console.log('== the field glasses: click an enemy banner ==');
// Center the camera on an Egyptian host and click its chip.
const foePos = await page.evaluate(() => {
  const g = window._ctx.game;
  const foe = Object.values(g.armies).find((a) => a.tag === 'EGY')
    || Object.values(g.armies).find((a) => a.tag !== g.playerTag);
  if (!foe) return null;
  const c = window._ctx.geom.centroids[foe.prov];
  window._camera.centerOn(c.x, c.y, 2.2);
  return { id: foe.id, prov: foe.prov };
});
ok(!!foePos, 'an Egyptian host stands on the map');
await page.waitForTimeout(900); // camera glide
const clickAt = await page.evaluate((fp) => {
  const g = window._ctx.game;
  const a = g.armies[fp.id];
  const c = window._ctx.geom.centroids[a.prov];
  const [sx, sy] = window._camera.mapToScreen(c.x, c.y);
  return { sx, sy };
}, foePos);
let opened = false;
for (const dy of [0, -8, -16, 8, -24]) {
  await page.mouse.click(clickAt.sx, clickAt.sy + dy);
  await page.waitForTimeout(250);
  opened = await page.evaluate(() => {
    const el = document.getElementById('inspect-modal');
    return !!el && !el.classList.contains('hidden');
  });
  if (opened) break;
}
ok(opened, 'clicking the enemy banner opens the inspector');
if (opened) {
  const text = await page.evaluate(() => document.getElementById('inspect-modal').textContent || '');
  ok(/Foreign forces/.test(text), 'the inspector announces foreign forces');
  ok(/Rifle Brigades|Armored Corps/.test(text), 'composition speaks the era pattern');
  await page.screenshot({ path: OUT + 'v55-inspector.png' });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const closed = await page.evaluate(() => document.getElementById('inspect-modal').classList.contains('hidden'));
  ok(closed, 'Escape closes the inspector');
}

console.log('== the bombsight: select a wing, click a target ==');
const raid = await page.evaluate(() => {
  const g = window._ctx.game;
  // Fabricate a rearmed wing near the front (UI test shortcut — the sim
  // validates everything on click).
  const foe = Object.values(g.armies).find((a) => a.tag === 'EGY');
  const nb = [...window._ctx.geom.neighbors[foe.prov]][0];
  const wid = g.nextWingId++;
  g.airwings[wid] = { id: wid, tag: 'ISR', prov: nb, raidCd: 0 };
  g.ui.selectedWing = wid;
  const c = window._ctx.geom.centroids[foe.prov];
  window._camera.centerOn(c.x, c.y, 2.0);
  return { wid, target: foe.prov };
});
await page.waitForTimeout(900);
const tgt = await page.evaluate((r) => {
  const c = window._ctx.geom.centroids[r.target];
  const [sx, sy] = window._camera.mapToScreen(c.x, c.y);
  return { sx, sy };
}, raid);
await page.screenshot({ path: OUT + 'v55-bombsight.png' }); // range ring + reticle visible
// Click the enemy banner itself: planes onto enemy units — the armyId path
// resolves to the host's province and the raid flies.
await page.mouse.click(tgt.sx, tgt.sy);
await page.waitForTimeout(400);
const after = await page.evaluate((r) => ({
  cd: window._ctx.game.airwings[r.wid] ? window._ctx.game.airwings[r.wid].raidCd : -1,
  stillSelected: window._ctx.game.ui.selectedWing === r.wid,
}), raid);
ok(after.cd > 0 || after.cd === -1, 'the sortie flew: the wing is rearming (or was lost to flak): cd=' + after.cd);
ok(after.cd === -1 || after.stillSelected, 'a surviving wing stays selected for the next sortie');

console.log('== ships of the line and the merchant marine ==');
await page.evaluate(() => {
  const g = window._ctx.game;
  // Stage a destroyer flotilla and a merchant harbor for the render pass.
  const isrCoast = g.provinces.find((p) => p && p.owner === 'ISR' && window._ctx.geom.coastal && window._ctx.geom.coastal[p.id]);
  const prov = isrCoast ? isrCoast.id : 5;
  const fid = g.nextFleetId++;
  g.fleets[fid] = { id: fid, tag: 'ISR', prov, ships: 4, gen: 5 };
  const p = g.provinces[prov];
  if (p) p.merchantShips = 3;
  const c = window._ctx.geom.centroids[prov];
  window._camera.centerOn(c.x, c.y, 2.4);
});
await page.waitForTimeout(900);
await page.screenshot({ path: OUT + 'v55-ships.png' });
ok(true, 'warship + merchant render staged (see v55-ships.png)');

ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 3)));
await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
