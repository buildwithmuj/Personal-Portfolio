import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkPageWeight, type LoadedResource } from '../support/page-weight.ts';

const origin = 'http://127.0.0.1:8787';
const KB = 1024;
const res = (type: string, bytes: number, url = `${origin}/${type}`): LoadedResource => ({
  url,
  type,
  bytes,
});

describe('checkPageWeight (spec §4, floors 2 and 3)', () => {
  it('passes a light first-party page', () => {
    assert.deepEqual(
      checkPageWeight(
        [res('document', 20 * KB), res('stylesheet', 8 * KB), res('script', 2 * KB)],
        origin,
      ),
      [],
    );
  });

  it('flags JavaScript over 5 KB', () => {
    assert.deepEqual(checkPageWeight([res('script', 6 * KB)], origin), ['script: 6144 B > 5120 B']);
  });

  it('flags CSS over 20 KB and fonts over 100 KB', () => {
    const failures = checkPageWeight([res('stylesheet', 21 * KB), res('font', 101 * KB)], origin);
    assert.deepEqual(failures, ['stylesheet: 21504 B > 20480 B', 'font: 103424 B > 102400 B']);
  });

  it('flags more than two font files', () => {
    const fonts = [1, 2, 3].map((n) => res('font', KB, `${origin}/font-${n}.woff2`));
    assert.deepEqual(checkPageWeight(fonts, origin), ['font files: 3 > 2']);
  });

  it('flags a page over 500 KB in total', () => {
    assert.deepEqual(checkPageWeight([res('image', 501 * KB)], origin), [
      'total: 513024 B > 512000 B',
    ]);
  });

  it('flags every third-party request', () => {
    const failures = checkPageWeight([res('script', 100, 'https://cdn.example.net/x.js')], origin);
    assert.deepEqual(failures, ['third-party request: https://cdn.example.net/x.js']);
  });

  it('counts inline script bytes towards the script budget', () => {
    const failures = checkPageWeight([], origin, { script: 6 * KB, stylesheet: 0 });
    assert.deepEqual(failures, ['script: 6144 B > 5120 B']);
  });

  it('counts inline stylesheet bytes towards the CSS budget', () => {
    const failures = checkPageWeight([], origin, { script: 0, stylesheet: 21 * KB });
    assert.deepEqual(failures, ['stylesheet: 21504 B > 20480 B']);
  });

  it('does not count inline bytes towards the total', () => {
    const failures = checkPageWeight([res('document', 10 * KB)], origin, {
      script: 6 * KB,
      stylesheet: 21 * KB,
    });
    assert.ok(!failures.some((f) => f.startsWith('total:')));
  });
});
