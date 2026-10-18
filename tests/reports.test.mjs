import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { validatePreviewDetails, shareSummary } from '../assets/js/report.js';

test('preview validation accepts sample details and rejects whitespace/malformed email', () => {
  assert.deepEqual(validatePreviewDetails(' Example Reader ', ' reader@example.com '), { name: '', email: '' });
  for (const email of ['', 'reader', 'reader@', 'reader@example', 'reader @example.com']) assert.ok(validatePreviewDetails('Reader', email).email);
  assert.ok(validatePreviewDetails('   ', 'reader@example.com').name);
});

test('share handles native, cancellation, clipboard and manual fallback', async () => {
  const url = 'http://127.0.0.1:4183/insights/ai-readiness-assessment/';
  let payload;
  assert.equal(await shareSummary({ share: async value => { payload = value; } }, 'Report', url), 'shared');
  assert.deepEqual(payload, { title: 'Report', url });
  assert.equal(await shareSummary({ share: async () => { throw Object.assign(new Error(), { name: 'AbortError' }); } }, 'Report', url), 'cancelled');
  assert.equal(await shareSummary({ clipboard: { writeText: async value => { payload = value; } } }, 'Report', url), 'copied');
  assert.equal(payload, url);
  assert.equal(await shareSummary({ share: async () => { throw new Error(); }, clipboard: { writeText: async () => { throw new Error(); } } }, 'Report', url), 'manual');
  assert.equal(await shareSummary({}, 'Report', url), 'manual');
});

test('report summaries resolve local links, use distinct PDF sources and keep consent optional', () => {
  const pdfs = new Set();
  for (const slug of ['ai-readiness-assessment', 'the-fluency-advantage']) {
    const file = `insights/${slug}/index.html`;
    const html = readFileSync(file, 'utf8');
    assert.match(html, /noindex, nofollow/);
    assert.match(html, /Requests are not being saved yet/);
    assert.match(html, /<input type="checkbox" id="marketing-consent" aria-describedby="consent-help">/);
    assert.doesNotMatch(html, /beehiiv|typeform|attribution\.js|<form[^>]*action=/i);
    for (const [, ref] of html.matchAll(/(?:href|src|data-pdf)="([^"]+)"/g)) {
      if (/^(https?:|#|mailto:)/.test(ref)) continue;
      assert.ok(existsSync(resolve(dirname(file), ref.split(/[?#]/)[0])), `${file}: ${ref}`);
    }
    const pdf = resolve(dirname(file), html.match(/data-pdf="([^"]+)"/)[1]);
    pdfs.add(pdf);
    assert.equal(readFileSync(pdf).subarray(0, 5).toString(), '%PDF-');
  }
  assert.equal(pdfs.size, 2);
});

test('preview code contains no persistence or submission transport', () => {
  const js = readFileSync('assets/js/report.js', 'utf8');
  assert.doesNotMatch(js, /localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|sendBeacon|console\.log/);
});
