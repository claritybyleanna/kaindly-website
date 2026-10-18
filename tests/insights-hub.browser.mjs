import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { REPORTS, ROLES, GOALS } from '../assets/js/insights.js';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.REPORT_PREVIEW_URL || 'http://127.0.0.1:4183';
const output = '/tmp/kaindly-insights-review';
await mkdir(output, { recursive: true });
const results = [];
const check = (name, value) => { assert.ok(value, name); results.push(name); };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  const errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push({ method: request.method(), url: request.url(), body: request.postData() }));
  await page.goto(`${base}/insights/`);
  await page.screenshot({ path: `${output}/insights-desktop.png`, fullPage: true, animations: 'disabled' });
  check('finder: initial continue button requires a role', await page.locator('[data-finder-next]').isDisabled());
  check('hub: exactly two case studies and no legacy article cards', await page.locator('[data-case-study]').count() === 2 && await page.locator('main a[href="exclusion-inequity-ai/"]').count() === 0);
  check('hub: Beehiiv link uses the supplied publication URL', await page.getByRole('link', { name: 'Read on Beehiiv' }).getAttribute('href') === 'https://kaindly.beehiiv.com/');
  for (const report of ['readiness', 'fluency']) {
    const card = page.locator(`[data-case-study=${report}]`);
    const guidance = card.locator('.case-guidance');
    const toggle = card.locator('.case-guidance-toggle');
    check(`${report}: start-here guidance starts hidden`, await guidance.isHidden());
    await card.locator('h3').hover();
    check(`${report}: hovering report shows guidance`, await guidance.isVisible() && await toggle.getAttribute('aria-expanded') === 'true');
    await page.keyboard.press('Escape');
    check(`${report}: Escape dismisses hover guidance`, await guidance.isHidden());
    await page.mouse.move(0, 0);
    await toggle.focus();
    check(`${report}: keyboard focus reveals guidance`, await guidance.isVisible());
    await page.keyboard.press('Tab');
    check(`${report}: leaving focus dismisses guidance`, await guidance.isHidden());
  }
  for (const role of Object.keys(ROLES)) {
    for (const goal of Object.keys(GOALS)) {
      await page.locator(`[name=visitor-role][value=${role}]`).check();
      await page.locator('[data-finder-next]').click();
      await page.locator(`[name=visitor-goal][value=${goal}]`).check();
      await page.locator('[data-finder-match]').click();
      const report = REPORTS[goal === 'readiness' ? 'readiness' : 'fluency'];
      check(`finder: ${role}/${goal} recommends the expected report`, await page.locator('[data-result-title]').textContent() === report.title && await page.locator('[data-result-read]').getAttribute('href') === report.href);
      check(`finder: ${role}/${goal} shows both selected qualifiers`, (await page.locator('[data-result-selections]').textContent()).includes(ROLES[role]) && (await page.locator('[data-result-selections]').textContent()).includes(GOALS[goal]));
      check(`finder: ${role}/${goal} never serializes profile into URL`, page.url() === `${base}/insights/`);
      await page.locator('[data-finder-reset]').click();
      check(`finder: ${role}/${goal} reset clears selections`, await page.locator('[data-finder] input:checked').count() === 0 && await page.locator('[data-finder-next]').isDisabled());
    }
  }
  await page.locator('[name=visitor-role][value=learning]').focus();
  await page.keyboard.press('Space');
  await page.locator('[data-finder-next]').focus();
  await page.keyboard.press('Enter');
  check('keyboard: next step heading receives focus', await page.locator('[data-finder-step=goal] [data-step-heading]').evaluate(el => document.activeElement === el));
  await page.locator('[name=visitor-goal][value=program]').focus();
  await page.keyboard.press('Space');
  await page.locator('[data-finder-match]').focus();
  await page.keyboard.press('Enter');
  check('keyboard: result heading receives focus', await page.locator('[data-result-title]').evaluate(el => document.activeElement === el));
  check('finder: new choices clear the old reset message', await page.locator('[data-hub-status]').textContent() === '');
  await page.screenshot({ path: `${output}/insights-recommendation.png`, fullPage: true, animations: 'disabled' });
  await page.locator('[data-result-connect]').click();
  check('capture: finder role and goal prefill the optional context', await page.locator('#lead-role').inputValue() === 'learning' && await page.locator('#lead-goal').inputValue() === 'program');
  check('capture: consent starts unchecked', !await page.locator('#lead-marketing').isChecked());
  await page.locator('[data-lead-submit]').click();
  check('validation: blank name/email rejected', await page.locator('[aria-invalid=true]').count() === 2);
  await page.locator('#lead-name').fill('  ');
  await page.locator('#lead-email').fill('not-an-email');
  await page.locator('[data-lead-submit]').click();
  check('validation: whitespace name and malformed email rejected', await page.locator('[aria-invalid=true]').count() === 2);
  await page.locator('[data-lead-close]').focus();
  await page.keyboard.press('Shift+Tab');
  check('keyboard: reverse tab wraps in dialog', await page.locator('[data-lead-submit]').evaluate(el => document.activeElement === el));
  await page.keyboard.press('Tab');
  check('keyboard: forward tab wraps in dialog', await page.locator('[data-lead-close]').evaluate(el => document.activeElement === el));
  await page.keyboard.press('Escape');
  check('capture: Escape clears inputs and returns focus', await page.locator('#lead-name').inputValue() === '' && await page.locator('#lead-email').inputValue() === '' && await page.locator('[data-result-connect]').evaluate(el => document.activeElement === el));

  const modes = [
    ['download readiness', '[data-case-study=readiness] [data-lead=download]', 'readiness'],
    ['download fluency', '[data-case-study=fluency] [data-lead=download]', 'fluency'],
    ['both reports', '[data-lead=recommendations]', null],
    ['conversation', '.hub-connect [data-lead=connect]', null],
  ];
  for (const [label, selector, reportKey] of modes) {
    for (const consent of [false, true]) {
      await page.locator(selector).click();
      await page.locator('#lead-name').fill('Preview Reader');
      await page.locator('#lead-email').fill('reader@example.com');
      await page.locator('.lead-context-fields summary').click();
      await page.locator('#lead-organization').fill('Example organization');
      await page.locator('#lead-industry').selectOption({ label: 'Education' });
      await page.locator('#lead-size').selectOption({ label: '26–100' });
      await page.locator('#lead-timing').selectOption({ label: 'In 1–3 months' });
      await page.locator('#lead-challenge').fill('Sample learning program discussion.');
      if (consent) await page.locator('#lead-marketing').check();
      const pending = reportKey ? page.waitForEvent('download') : null;
      await page.locator('[data-lead-submit]').click();
      if (pending) {
        const download = await pending;
        const file = REPORTS[reportKey].pdf.split('/').at(-1);
        check(`${label}, consent ${consent}: correct PDF filename`, download.suggestedFilename() === file);
        check(`${label}, consent ${consent}: exact source PDF bytes`, hash(await readFile(await download.path())) === hash(await readFile(`assets/reports/${file}`)));
      }
      check(`${label}, consent ${consent}: success shown and no subscription claimed`, await page.locator('[data-lead-success]').isVisible() && (await page.locator('[data-success-copy]').textContent()).includes('no subscription'));
      check(`${label}, consent ${consent}: all form values cleared`, await page.locator('#lead-form').evaluate(form => [...form.querySelectorAll('input, select, textarea')].every(el => el.type === 'checkbox' ? !el.checked : el.value === '')));
      check(`${label}, consent ${consent}: no validation required for marketing`, await page.locator('#lead-marketing').getAttribute('required') === null);
      if (label === 'both reports') {
        check(`bundle, consent ${consent}: both PDFs available`, await page.locator('[data-success-download]').count() === 2);
        for (let i = 0; i < 2; i++) {
          const pendingDownload = page.waitForEvent('download');
          await page.locator('[data-success-download]').nth(i).click();
          const download = await pendingDownload;
          check(`bundle, consent ${consent}: PDF ${i + 1} correct`, download.suggestedFilename() === Object.values(REPORTS)[i].pdf.split('/').at(-1));
        }
      }
      if (label === 'conversation') check(`conversation, consent ${consent}: explicit simulated request`, (await page.locator('[data-success-copy]').textContent()).includes('sent no request'));
      await page.keyboard.press('Escape');
    }
  }
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${base}/insights/`);
    check(`layout ${width}: no page overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator('.hub-connect [data-lead=connect]').click();
    await page.locator('.lead-context-fields summary').click();
    check(`layout ${width}: expanded form stays within viewport`, await page.locator('#lead-dialog').evaluate(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; }));
    if (width === 390) await page.screenshot({ path: `${output}/insights-mobile-context.png`, animations: 'disabled' });
    await page.keyboard.press('Escape');
    await page.locator('[data-menu-toggle]').click();
    check(`layout ${width}: mobile menu opens`, await page.locator('[data-menu-toggle]').getAttribute('aria-expanded') === 'true');
    await page.keyboard.press('Escape');
    if (width === 390) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `${output}/insights-mobile.png`, fullPage: true, animations: 'disabled' });
    }
  }
  check('privacy: no storage or cookies', await page.evaluate(() => localStorage.length === 0 && sessionStorage.length === 0 && document.cookie === ''));
  check('privacy: no submissions, analytics or email requests', requests.every(r => r.method === 'GET' && !r.body && (r.url.startsWith(base) || /^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(r.url))));
  check('runtime: no browser errors', errors.length === 0);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const nojs = await context.newPage();
  await nojs.goto(`${base}/insights/`);
  check('no JavaScript: case-study summaries stay accessible', await nojs.locator('[data-case-study]').count() === 2 && await nojs.locator('noscript').isVisible());
  await context.close();
  await writeFile(`${output}/results.json`, JSON.stringify({ passed: results.length, results }, null, 2));
  console.log(`PASS: ${results.length} Insights browser acceptance checks. Evidence: ${output}`);
} finally { await browser.close(); }
