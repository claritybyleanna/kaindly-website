// Optional browser acceptance checks: see docs/report-preview.md.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.REPORT_PREVIEW_URL || 'http://127.0.0.1:4183';
const output = process.env.REPORT_REVIEW_OUTPUT || '/tmp/kaindly-report-review';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const hash = value => createHash('sha256').update(value).digest('hex');
const check = (name, value) => { assert.ok(value, name); results.push(name); };
try {
  for (const [slug, pdf] of [
    ['ai-readiness-assessment', 'ai-readiness-assessment-2026-preview.pdf'],
    ['the-fluency-advantage', 'the-fluency-advantage-preview.pdf'],
  ]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
    const page = await context.newPage();
    const requests = [], errors = [];
    page.on('request', request => requests.push({ method: request.method(), url: request.url(), body: request.postData() }));
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/insights/${slug}/`);
    await page.locator('#root h1').waitFor();
    await page.screenshot({ path: `${output}/${slug}-desktop.png`, fullPage: true, animations: 'disabled' });
    check(`${slug}: page loads with a single heading`, await page.locator('#root h1').count() === 1);
    const launch = page.locator('[data-download]').first();
    await launch.focus();
    await page.keyboard.press('Enter');
    check(`${slug}: keyboard opens dialog and focuses name`, await page.locator('#reader-name').evaluate(el => el === document.activeElement));
    check(`${slug}: consent starts unchecked`, !await page.locator('#marketing-consent').isChecked());
    await page.locator('[data-close]').focus();
    await page.keyboard.press('Shift+Tab');
    check(`${slug}: modal traps backward focus`, await page.locator('form button[type=submit]').evaluate(el => el === document.activeElement));
    await page.keyboard.press('Tab');
    check(`${slug}: modal traps forward focus`, await page.locator('[data-close]').evaluate(el => el === document.activeElement));
    await page.locator('form button[type=submit]').click();
    check(`${slug}: empty name and email rejected`, await page.locator('[aria-invalid=true]').count() === 2);
    await page.locator('#reader-name').fill('   ');
    await page.locator('#reader-email').fill('invalid-address');
    await page.locator('form button[type=submit]').click();
    check(`${slug}: whitespace name and invalid email rejected`, await page.locator('[aria-invalid=true]').count() === 2);
    await page.keyboard.press('Escape');
    check(`${slug}: Escape restores opener focus`, await launch.evaluate(el => el === document.activeElement));
    check(`${slug}: dismiss clears details`, await page.locator('#reader-email').inputValue() === '');
    for (const consent of [false, true]) {
      await launch.click();
      await page.locator('#reader-name').fill('Preview Reader');
      await page.locator('#reader-email').fill('reader@example.com');
      if (consent) await page.locator('#marketing-consent').check();
      const downloadPromise = page.waitForEvent('download');
      await page.locator('form button[type=submit]').click();
      const download = await downloadPromise;
      check(`${slug}: consent ${consent} downloads correct filename`, download.suggestedFilename() === pdf);
      check(`${slug}: consent ${consent} downloads exact PDF bytes`, hash(await readFile(await download.path())) === hash(await readFile(`assets/reports/${pdf}`)));
      check(`${slug}: consent ${consent} clears fields and consent`, await page.locator('#reader-name').inputValue() === '' && await page.locator('#reader-email').inputValue() === '' && !await page.locator('#marketing-consent').isChecked());
      check(`${slug}: consent ${consent} shows open/download fallback`, await page.locator('[data-open-pdf]').isVisible() && await page.locator('[data-save-pdf]').isVisible());
      await page.keyboard.press('Escape');
    }
    await page.locator('[data-download][data-page="7"]').click();
    await page.locator('#reader-name').fill('Preview Reader');
    await page.locator('#reader-email').fill('reader@example.com');
    const downloadPromise = page.waitForEvent('download');
    await page.locator('form button[type=submit]').click();
    await downloadPromise;
    check(`${slug}: source link opens cited page`, (await page.locator('[data-open-pdf]').getAttribute('href')).endsWith('#page=7'));
    await page.keyboard.press('Escape');
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('Unavailable'); } }, configurable: true });
    });
    await page.goto(`${base}/insights/${slug}/?ignored=private#method`);
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('Unavailable'); } }, configurable: true });
    });
    await page.locator('[data-share]').first().click();
    await page.locator('#share-dialog').waitFor({ state: 'visible' });
    check(`${slug}: manual share contains only public summary path`, await page.locator('#share-url').inputValue() === `${base}/insights/${slug}/`);
    await page.keyboard.press('Escape');
    check(`${slug}: share Escape restores focus`, await page.locator('[data-share]').first().evaluate(el => el === document.activeElement));
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async value => { window.testCopiedSummary = value; } }, configurable: true }));
    await page.locator('[data-share]').first().click();
    await page.waitForFunction(() => document.querySelector('[data-share-status]').textContent.includes('copied'));
    check(`${slug}: clipboard shares clean URL`, await page.evaluate(() => window.testCopiedSummary) === `${base}/insights/${slug}/`);
    await page.locator('[data-share]').last().click();
    check(`${slug}: closing share action uses the clean URL`, await page.evaluate(() => window.testCopiedSummary) === `${base}/insights/${slug}/`);
    await page.locator('.ilg button').first().hover();
    await page.waitForFunction(() => document.querySelector('.ilg button').getAttribute('aria-pressed') === 'true');
    check(`${slug}: cohort hover highlights figures`, await page.locator('.ppl i.h').count() > 0);
    await page.locator('.ilg button').last().focus();
    await page.keyboard.press('Enter');
    check(`${slug}: cohort selection works from keyboard`, await page.locator('.ilg button').last().getAttribute('aria-pressed') === 'true');
    if (slug === 'the-fluency-advantage') {
      const views = [
        ['Intentional Learners', '65.5%', 277, 181],
        ['One organization', '33', 277, 33],
        ['Director & above', '49%', 277, 136],
        ['Before & after', '2', 277, 2],
        ['Confidence improved', '94%', 277, 260],
      ];
      check('fluency: all five supplied cohort views restored', await page.locator('.ilg button').count() === 5);
      const initialGrid = await page.locator('.ppl').boundingBox();
      for (const [label, value, total, highlighted] of views) {
        await page.locator('.ilg').getByRole('button', { name: label, exact: true }).click();
        check(`fluency: ${label} has correct value and icon sample`, await page.locator('.co b').textContent() === value && await page.locator('.ppl > i').count() === total && await page.locator('.ppl > i.h').count() === highlighted);
      }
      check('fluency: confidence view labels illustrative percentages and unknown response count', (await page.locator('.ppl-scale').textContent()).includes('illustrative') && (await page.locator('.co small').textContent()).includes('not stated'));
      await page.locator('.ilg').getByRole('button', { name: 'Before & after', exact: true }).click();
      check('fluency: before/after retains muted context figures and grid geometry', await page.locator('.ppl > i:not(.h)').count() === 275 && Math.abs((await page.locator('.ppl').boundingBox()).height - initialGrid.height) < 1);
      check('fluency: supplied pre/post count is explicitly awaiting confirmation', (await page.locator('.co small').textContent()).includes('needs confirmation'));
    }
    await page.locator('.st').last().hover();
    check(`${slug}: spectrum hover changes active stage`, await page.locator('.st').last().getAttribute('aria-pressed') === 'true');
    await page.locator('.st').first().focus();
    check(`${slug}: spectrum selection works from keyboard`, await page.locator('.st').first().getAttribute('aria-pressed') === 'true');
    await page.locator('.acc .ai > button').last().focus();
    await page.keyboard.press('Enter');
    check(`${slug}: findings accordion opens from keyboard`, await page.locator('.acc .ai > button').last().getAttribute('aria-expanded') === 'true');
    const imageURLs = await page.evaluate(() => [...new Set([...document.querySelectorAll('*')].flatMap(el => [...getComputedStyle(el).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(m => m[1])).filter(url => url.startsWith(location.origin)))]);
    for (const url of imageURLs) check(`${slug}: imported image loads ${url.split('/').pop()}`, (await page.request.get(url)).ok());
    if (slug === 'ai-readiness-assessment') {
      await page.locator('.segd button').last().click();
      check('readiness: count toggle shows verified data', (await page.locator('.st .p').allTextContents()).join(',') === '9respondents,129respondents,42respondents,15respondents,2respondents');
      await page.locator('.segd button').first().click();
      check('readiness: percentage toggle restores published values', (await page.locator('.st .p').allTextContents()).join(',') === '4.6%,65.5%,21.3%,7.6%,1%');
      await page.locator('.dr').first().hover();
      check('readiness: dimension hover updates detail card', await page.locator('.gapc b').textContent() === '3.61');
      await page.locator('.dr').last().focus();
      check('readiness: dimension keyboard focus updates detail card', await page.locator('.gapc b').textContent() === '2.94');
      await page.locator('.qc').first().hover();
      check('readiness: quadrant hover updates detail and count', (await page.locator('.qd').textContent()).includes('55 respondents'));
      await page.locator('.qc').last().focus();
      check('readiness: quadrant keyboard focus shows layer breakdown', await page.locator('.qd .lr').count() === 3);
      await page.locator('.scg button').nth(1).hover();
      check('readiness: scatter legend filters visible point emphasis', await page.locator('.scg button').nth(1).getAttribute('aria-pressed') === 'true');
      await page.locator('.scp circle').first().focus();
      check('readiness: scatter point keyboard tooltip appears', await page.locator('.sctip').isVisible());
      check('readiness: unverified point data is labeled illustrative', (await page.locator('.sctip').textContent()).includes('Illustrative'));
      await page.locator('#method-opener').click();
      check('readiness: methodology view opens', await page.locator('#method-dialog').isVisible());
      await page.locator('#method-dialog .ms').nth(1).focus();
      await page.keyboard.press('ArrowRight');
      check('readiness: methodology steps support arrow keys', await page.locator('#method-dialog .ms').nth(2).getAttribute('aria-selected') === 'true');
      await page.locator('#method-dialog .flseg button').nth(1).click();
      check('readiness: scoring output switches to stage placement', (await page.locator('#method-dialog .fout').textContent()).includes('AI Readiness Spectrum stage'));
      await page.locator('#method-dialog .flseg button').first().click();
      await page.locator('#method-dialog .lyl button').last().hover();
      check('readiness: layer hover shows environment details', (await page.locator('#method-dialog .lyl button').last().textContent()).includes('organizational conditions'));
      await page.keyboard.press('Escape');
      check('readiness: methodology dismiss restores focus', await page.locator('#method-opener').evaluate(el => el === document.activeElement));
      await page.emulateMedia({ reducedMotion: 'reduce' });
      for (let step = 0; step < 8; step++) {
        await page.locator('.sy-rail button').nth(step).click();
        await page.waitForFunction(index => document.querySelectorAll('.sy-rail button')[index].getAttribute('aria-pressed') === 'true', step);
        check(`readiness: original scroll narrative reaches stage ${step+1}`, await page.locator('.sy-t.on').count() === 1);
      }
      check('readiness: final stage includes animated learning pathway', await page.locator('.sy-sol.on').count() === 1);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    } else {
      await page.locator('.tabs .tab').last().hover();
      check('fluency: programme hover selects the ongoing community', (await page.locator('.panel h3').textContent()).includes('Collective'));
      await page.locator('.tabs .tab').nth(1).focus();
      await page.keyboard.press('ArrowDown');
      check('fluency: programme tabs support arrow keys', await page.locator('.tabs .tab').nth(2).getAttribute('aria-selected') === 'true');
      await page.locator('.tabs .tab').nth(4).focus();
      check('fluency: final session shows correct peak attendance', (await page.locator('.panel .att').textContent()).includes('125'));
      const slider = page.locator('input[type=range]');
      await slider.focus(); await page.keyboard.press('End');
      check('fluency: original slider shows observed finale', await page.locator('.sentcard .big').textContent() === '0%');
      check('fluency: slider announces matched cohort', (await slider.getAttribute('aria-valuetext')).includes('n=112'));
      await page.keyboard.press('Home');
      check('fluency: slider returns to observed opening', await page.locator('.sentcard .big').textContent() === '25%');
      await page.locator('.segd button').last().click();
      check('fluency: count view explains missing exact counts', (await page.locator('.spfoot').textContent()).includes('Exact stage counts are not reported'));
      await page.locator('.segd button').first().click();
      check('fluency: baseline uses the Academy sample', (await page.locator('.spechd p').textContent()).includes('177'));
    }
    for (const width of [390, 320, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`${base}/insights/${slug}/`);
      check(`${slug}: no horizontal overflow at ${width}px`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (slug === 'ai-readiness-assessment') {
        await page.locator('#method-opener').click();
        check(`readiness: methodology fits ${width}px`, await page.locator('#method-dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
        await page.keyboard.press('Escape');
      }
      await launch.click();
      check(`${slug}: dialog fits ${width}px viewport`, await page.locator('#download-dialog').evaluate(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; }));
      if (width === 390) await page.screenshot({ path: `${output}/${slug}-mobile-form.png`, animations: 'disabled' });
      await page.keyboard.press('Escape');
      if (width === 390) {
        check(`${slug}: compact header keeps Insights navigation visible`, await page.locator('.bar .back').isVisible());
        await page.screenshot({ path: `${output}/${slug}-mobile.png`, fullPage: true, animations: 'disabled' });
      }
    }
    check(`${slug}: no browser runtime errors`, errors.length === 0);
    check(`${slug}: no data submissions or analytics requests`, requests.every(r => r.method === 'GET' && !r.body && (r.url.startsWith(base) || /^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(r.url))));
    check(`${slug}: no storage or cookies`, await page.evaluate(() => localStorage.length === 0 && sessionStorage.length === 0 && document.cookie === ''));
    await context.close();
  }
  const page = await browser.newPage();
  await page.goto(`${base}/insights/`);
  check('Insights: two case-study reports', await page.locator('[data-case-study]').count() === 2);
  check('Insights: guided finder is available', await page.locator('[data-finder-step=role]').isVisible());
  for (const path of ['/.env.local', '/.git/config', '/api/workbook-retention', '/Blead/']) {
    const response = await page.request.get(`${base}${path}`);
    check(`server: refuses ${path}`, response.status() === 404);
  }
  const post = await page.request.post(`${base}/insights/`, { data: 'sample' });
  check('server: rejects submission methods', post.status() === 405);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const nojs = await context.newPage();
  await nojs.goto(`${base}/insights/ai-readiness-assessment/`);
  check('no JavaScript: public summary and PDF fallback remain accessible', await nojs.locator('noscript a').first().isVisible() && (await nojs.locator('noscript').textContent()).includes('AI Readiness Assessment'));
  await context.close();
  await writeFile(resolve(output, 'results.json'), JSON.stringify({ passed: results.length, results }, null, 2));
  console.log(`PASS: ${results.length} browser acceptance checks. Evidence: ${output}`);
} finally { await browser.close(); }
