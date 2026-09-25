import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkLighthouse, type LighthouseReport } from '../support/lighthouse-scores.ts';

function report(
  overrides: {
    scores?: Record<string, number | null>;
    metrics?: Record<string, number | undefined>;
  } = {},
): LighthouseReport {
  const scores = {
    performance: 1,
    accessibility: 1,
    'best-practices': 1,
    seo: 1,
    ...overrides.scores,
  };
  const metrics = {
    'largest-contentful-paint': 1200,
    'cumulative-layout-shift': 0,
    'total-blocking-time': 0,
    ...overrides.metrics,
  };
  return {
    categories: Object.fromEntries(Object.entries(scores).map(([id, score]) => [id, { score }])),
    audits: Object.fromEntries(
      Object.entries(metrics).map(([id, value]) => [
        id,
        value === undefined ? {} : { numericValue: value },
      ]),
    ),
  };
}

describe('checkLighthouse (spec §4, floors 1 and 4)', () => {
  it('passes a perfect report', () => {
    assert.deepEqual(checkLighthouse(report()), []);
  });

  it('flags a category below its floor', () => {
    assert.deepEqual(checkLighthouse(report({ scores: { performance: 0.9, seo: 0.99 } })), [
      'performance: 90 < 95',
      'seo: 99 < 100',
    ]);
  });

  it('treats a missing score as a failure', () => {
    assert.deepEqual(checkLighthouse(report({ scores: { accessibility: null } })), [
      'accessibility: 0 < 100',
    ]);
  });

  it('flags metrics over budget and missing metrics', () => {
    const failures = checkLighthouse(
      report({ metrics: { 'largest-contentful-paint': 3000, 'total-blocking-time': undefined } }),
    );
    assert.deepEqual(failures, [
      'largest-contentful-paint: 3000 > 2500',
      'total-blocking-time: missing',
    ]);
  });
});
