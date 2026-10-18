import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { recommendReport, ROLES, GOALS, REPORTS } from '../assets/js/insights.js';

test('all audience/priority combinations recommend relevant evidence and conversation wording', () => {
  for (const role of Object.keys(ROLES)) {
    for (const goal of Object.keys(GOALS)) {
      const result = recommendReport(role, goal);
      assert.equal(result.report, goal === 'readiness' ? 'readiness' : 'fluency');
      assert.ok(result.reason.length > 50);
      assert.ok(result.nextStep.length > 10);
      assert.ok(existsSync(resolve('insights', REPORTS[result.report].href, 'index.html')));
    }
  }
  assert.match(recommendReport('learning', 'program').nextStep, /learning program/);
  assert.match(recommendReport('individual', 'practice').nextStep, /your learning goals/);
});

test('incomplete and unrecognized finder answers cannot produce a recommendation', () => {
  for (const [role, goal] of [['', 'program'], ['leader', ''], ['other', 'program'], ['leader', 'anything'], ['__proto__', 'readiness']]) {
    assert.equal(recommendReport(role, goal), null);
  }
});

test('hub keeps real capture inactive and offers all three purposeful capture routes', () => {
  const html = readFileSync('insights/index.html', 'utf8');
  const js = readFileSync('assets/js/insights.js', 'utf8');
  assert.doesNotMatch(js, /localStorage|sessionStorage|indexedDB|fetch\(|sendBeacon|XMLHttpRequest|console\.log/);
  assert.doesNotMatch(html, /subscribe-forms\.beehiiv\.com|<form[^>]*action=/);
  for (const mode of ['download', 'connect', 'recommendations']) assert.ok(html.includes(`data-lead="${mode}"`));
  assert.match(html, /<input type="checkbox" id="lead-marketing" aria-describedby="lead-consent-help">/);
  assert.match(html, /Two questions\. No email needed/);
  for (const field of ['role', 'goal', 'organization', 'industry', 'size', 'timing', 'challenge']) {
    const tag = html.match(new RegExp(`<[^>]+id="lead-${field}"[^>]*>`))?.[0];
    assert.ok(tag);
    assert.doesNotMatch(tag, /required/);
  }
});
