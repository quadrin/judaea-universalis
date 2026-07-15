// UI verification — v2.6: era-proper names in every bookmark and a flag for
// every nation (no text-fallback chips anywhere).
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/tmp/claude-0/-home-user-judaea-universalis/14e3ad23-6546-5a93-b028-f73783a98caf/scratchpad') + '/');
const { chromium } = require('playwright');
const OUT = (process.env.JU_OUT || '/tmp') + '/';

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader'] });

async function boot(page, cardText) {
  await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.bm-card', { timeout: 20000 });
  for (let i = 0; i < 10; i++) {
    const txt = (await page.locator('.bm-card.current').textContent()) || '';
    if (txt.includes(cardText)) { await page.locator('.bm-card.current').click(); break; }
    await page.locator('.ss-next').click();
    await page.waitForTimeout(420);
  }
  await page.waitForSelector('.nation-card');
  await page.locator('.nation-card').first().click();
  await page.waitForFunction(() => !!window._ctx);
  await page.waitForTimeout(500);
}

// ---- 67 BCE: pre-Herodian names ------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  console.log('== 67 BCE speaks its era ==');
  await boot(page, 'Civil War');
  const names = await page.evaluate(() => ({
    straton: window._ctx.prov('Caesarea Maritima').name,
    samaria: window._ctx.prov('Sebaste').name,
    shechem: window._ctx.prov('Neapolis').name,
    panion: window._ctx.prov('Caesarea Philippi').name,
    rakkath: window._ctx.prov('Tiberias').name,
    aliased: window._ctx.prov("Straton's Tower") === window._ctx.prov('Caesarea Maritima'),
  }));
  ok(names.straton === "Straton's Tower", 'Caesarea is still Straton\'s Tower: ' + names.straton);
  ok(names.samaria === 'Samaria' && names.shechem === 'Shechem', 'Samaria & Shechem, not yet renamed: '
    + names.samaria + ', ' + names.shechem);
  ok(names.panion === 'Panion' && names.rakkath === 'Rakkath', 'Panion & Rakkath: ' + names.panion + ', ' + names.rakkath);
  ok(names.aliased, 'the era name answers in prov() too');
  ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 2)));
  await page.close();
}

// ---- 614: Byzantine names + a flag for everyone --------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  console.log('== 614 CE names + flags in the ledger ==');
  await boot(page, 'Persian Gambit');
  const n614 = await page.evaluate(() => ({
    constantia: window._ctx.prov('Salamis').name,
    hamadan: window._ctx.prov('Ecbatana').name,
  }));
  ok(n614.constantia === 'Constantia' && n614.hamadan === 'Hamadan',
    'Constantia & Hamadan: ' + n614.constantia + ', ' + n614.hamadan);
  await page.keyboard.press('l');
  await page.waitForTimeout(400);
  const abbr = await page.locator('#ledger-modal .fchip-abbr').count();
  ok(abbr === 0, 'every ledger chip bears an emblem (no text fallbacks): ' + abbr);
  await page.keyboard.press('Escape');
  ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 2)));
  await page.close();
}

// ---- 1948: the full flag row ----------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  console.log('== 1948: ten nations, ten flags ==');
  await boot(page, 'Independence');
  await page.keyboard.press('l');
  await page.waitForTimeout(400);
  const chips = await page.evaluate(() => ({
    total: document.querySelectorAll('#ledger-modal .fchip').length,
    fallbacks: document.querySelectorAll('#ledger-modal .fchip-abbr').length,
  }));
  ok(chips.total >= 10 && chips.fallbacks === 0, 'ten real flags in the ledger: '
    + chips.total + ' chips, ' + chips.fallbacks + ' fallbacks');
  await page.screenshot({ path: OUT + 'v26-flags.png' });
  ok(errors.length === 0, 'no page errors: ' + JSON.stringify(errors.slice(0, 2)));
  await page.close();
}

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
