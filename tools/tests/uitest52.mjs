// UI verification — SPEC §247: the old names, at a real peace table in a real
// browser.
//
// smoke167 proves the catalogue, the gates and the court that gets seated.
// This one proves the four things only a browser can:
//
//   1. The release section names COUNTRIES, and nothing else. Open the table on
//      a beaten Seleucid empire and every row is a country you can read —
//      "Restore Phoenicia" — with no Greek State of Straton's Tower left.
//   2. The case for each is IN THE PANEL — the marker on the row, the historical
//      basis in its tooltip — so a player learns why Tyre and Sidon are a
//      country without being told by a wiki.
//   3. The ones out of reach are SHOWN AND INERT: dimmed, disabled, each
//      carrying the reason in the row, and clicking one changes no total.
//   4. Ticking one prices it into the treaty, paints its provinces on the map,
//      and signing it puts Phoenicia on the map under its own colour.
import { createRequire } from 'module';
const require = createRequire((process.env.JU_PW_DIR || '/opt/node22/lib') + '/');
const { chromium } = require('playwright');
const BOOT_MS = Number(process.env.JU_BOOT_TIMEOUT || 480000);
const OUT = (process.env.JU_OUT || '/tmp') + '/';

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  PASS', msg); else { failures++; console.error('  FAIL', msg); } };

const browser = await chromium.launch({
  executablePath: process.env.JU_CHROMIUM || '/opt/pw-browsers/chromium',
  args: ['--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('http://127.0.0.1:8613/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.bm-card', { timeout: BOOT_MS });

// 167 BCE, the Hasmoneans against the empire the section was written for.
for (let i = 0; i < 12; i++) {
  const txt = (await page.locator('.bm-card.current').textContent()) || '';
  if (txt.includes('Maccabean')) { await page.locator('.bm-card.current').click(); break; }
  await page.locator('.ss-next').click();
  await page.waitForTimeout(420);
}
await page.waitForSelector('.nation-card');
await page.locator('.nation-card').first().click();
await page.waitForFunction(() => !!window._ctx);
await page.waitForTimeout(600);

// A war going very well indeed.
const war = await page.evaluate(() => {
  const ctx = window._ctx;
  const g = ctx.game;
  let w = g.wars.find((x) => [].concat(x.attackers, x.defenders).includes('SEL')
    && [].concat(x.attackers, x.defenders).includes('HAS'));
  if (!w) return null;
  w.warscore.HAS = 100;
  w.noNegotiation = false;
  return { id: w.id, name: w.name };
});
ok(!!war, 'the revolt is on the books: ' + (war && war.name));

// The player's own road to the table: the outliner's war row opens the war
// overview, and its Negotiate button opens the congress.
const openTable = async () => {
  await page.locator(`#outliner [data-war="${war.id}"]`).first().click();
  await page.waitForSelector('#war-modal [data-ref="negotiate"]', { timeout: 30000 });
  await page.locator('#war-modal [data-ref="negotiate"]').click();
  await page.waitForSelector('#peace-modal .peace-card', { timeout: 30000 });
  await page.waitForTimeout(300);
};
const closeTable = async () => {
  await page.locator('#peace-modal .peace-cancel').click();
  await page.waitForTimeout(250);
};
const readReleases = () => page.evaluate(() => {
  const card = document.querySelector('#peace-modal .peace-card');
  const rows = [...card.querySelectorAll('label.peace-prov')]
    .filter((el) => el.querySelector('[data-release]'))
    .map((el) => ({
      tag: el.querySelector('[data-release]').dataset.release,
      text: (el.querySelector('.peace-prov-name') || {}).textContent.replace(/\s+/g, ' ').trim(),
      revival: el.classList.contains('peace-revival'),
      tt: el.dataset.tt || '',
    }));
  const locked = [...card.querySelectorAll('.peace-locked label.peace-prov')].map((el) => ({
    text: (el.querySelector('.peace-prov-name') || {}).textContent.replace(/\s+/g, ' ').trim(),
    off: el.classList.contains('peace-off'),
    disabled: !!el.querySelector('input[disabled]'),
    tt: el.dataset.tt || '',
  }));
  return { rows, locked, total: (card.querySelector('[data-ref="total"]') || {}).textContent || '' };
});

console.log('== §247 · the section names countries ==');
await openTable();
{
  const { rows } = await readReleases();
  ok(rows.length > 0, `the congress offers ${rows.length} states`);
  const pho = rows.find((r) => r.tag === 'PHO');
  ok(!!pho, 'Phoenicia among them');
  ok(pho && /Restore Phoenicia/.test(pho.text), 'and the row reads in the game\'s own words: ' + (pho && pho.text));
  ok(pho && pho.revival && /an old name/.test(pho.text),
    'marked as an old name rather than a bucket');
  ok(rows.every((r) => !/State of/.test(r.text)),
    'and nothing beside it is named by formula — the culture buckets are gone (§247)');
  ok(pho && /Tyre/.test(pho.tt) && /Sidon/.test(pho.tt), 'the tooltip lists the land that leaves');
  ok(pho && /purple|cities of their own|Phoenician/i.test(pho.tt),
    'and makes the case for the country: ' + (pho ? '…' + pho.tt.slice(-90).replace(/\s+/g, ' ') : ''));
}

console.log('== §247 · the ones out of reach are shown and inert ==');
{
  // Drop the score below Phoenicia's threshold and re-open: it moves from the
  // table to the block below it, with the reason on the row.
  await page.evaluate((id) => {
    const w = window._ctx.game.wars.find((x) => x.id === id);
    w.warscore.HAS = 28;
  }, war.id);
  await closeTable();
  await openTable();
  const { rows, locked, total } = await readReleases();
  ok(!rows.some((r) => r.tag === 'PHO'), 'at +28 Phoenicia is no longer a term we can take');
  ok(locked.length > 0, `and ${locked.length} old names are listed as out of reach`);
  ok(locked.every((r) => r.off && r.disabled), 'every one of them dimmed and unclickable');
  ok(locked.some((r) => /war has not gone far enough|do not hold|capital|promised|do not touch/i.test(r.text)),
    'with the reason in the row, not hidden in a hover: ' + (locked[0] && locked[0].text));
  await page.locator('#peace-modal .peace-locked').scrollIntoViewIfNeeded();
  await page.screenshot({ path: OUT + 'ju-246-locked.png' });
  // `force` because Playwright refuses to click a disabled control, which is
  // itself half the assertion — the click is dispatched anyway to prove the
  // other half: nothing about the treaty moves.
  await page.locator('#peace-modal .peace-locked label.peace-prov').first().click({ force: true });
  await page.waitForTimeout(250);
  const after = await readReleases();
  ok(after.total === total, 'and forcing a click on one moves no total');
  ok(!after.rows.some((r) => /out of reach|locked/i.test(r.text)),
    'nor does it put one on the table');
}

console.log('== §247 · taking one ==');
{
  await page.evaluate((id) => {
    const w = window._ctx.game.wars.find((x) => x.id === id);
    w.warscore.HAS = 100;
  }, war.id);
  await closeTable();
  await openTable();
  await page.locator('#peace-modal [data-release="PHO"]').check();
  await page.waitForTimeout(250);
  const priced = await readReleases();
  ok(/\d/.test(priced.total), 'ticking it prices the treaty: ' + priced.total.replace(/\s+/g, ' ').trim());
  const painted = await page.evaluate(() => {
    const ui = window._ctx.game.ui || {};
    const sel = ui.peaceSelected || [];
    const tyre = window._ctx.game.provinces.find((p) => p && p.name === 'Tyre');
    return { n: sel.length, hasTyre: !!tyre && sel.includes(tyre.id) };
  });
  ok(painted.hasTyre, `and the map burns its ground solid (${painted.n} provinces selected)`);
  await page.screenshot({ path: OUT + 'ju-246-peace-table.png' });

  const btn = page.locator('#peace-modal [data-ref="send"]');
  const label = ((await btn.textContent()) || '').replace(/\s+/g, ' ').trim();
  ok(!(await btn.getAttribute('class') || '').includes('disabled'),
    'the table offers the terms rather than refusing them: ' + label);
  await btn.click();
  await page.waitForTimeout(1200);
  const seated = await page.evaluate(() => {
    const t = window._ctx.game.tags.PHO;
    const own = window._ctx.game.provinces.filter((p) => p && p.owner === 'PHO').map((p) => p.name);
    return t ? { name: t.name, alive: !!t.alive, color: t.color, ruler: t.ruler && t.ruler.title, own } : null;
  });
  ok(seated && seated.alive && seated.name === 'Phoenicia',
    'and Phoenicia stands on the map: ' + JSON.stringify(seated && seated.own));
  ok(seated && seated.ruler === 'Suffete', 'under a suffete, as Tyre was');
  await page.screenshot({ path: OUT + 'ju-246-after.png' });
}

ok(!errors.length, 'no console errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
await browser.close();
console.log(failures ? failures + ' FAILURES' : 'uitest52: ALL PASS');
process.exit(failures ? 1 : 0);
