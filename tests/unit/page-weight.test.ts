import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkPageWeight, compressedSize, type LoadedResource } from '../support/page-weight.ts';

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

  it('flags fonts over 100 KB', () => {
    const failures = checkPageWeight([res('font', 101 * KB)], origin);
    assert.deepEqual(failures, ['font: 103424 B > 102400 B']);
  });

  it('flags CSS over 8 KB compressed, whatever its decoded size', () => {
    assert.deepEqual(
      checkPageWeight([res('stylesheet', 40 * KB)], origin, { script: 0 }, 7 * KB),
      [],
    );
    assert.deepEqual(checkPageWeight([], origin, { script: 0 }, 9 * KB), [
      'stylesheet (compressed): 9216 B > 8192 B',
    ]);
  });

  it('measures CSS compressed, file by file', () => {
    const rule = '.card { padding: 32px; border-radius: 24px; } ';
    const one = compressedSize([rule.repeat(200)]);
    assert.ok(one < rule.length * 200 * 0.1);
    assert.equal(compressedSize([rule, rule]), 2 * compressedSize([rule]));
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
    const failures = checkPageWeight([], origin, { script: 6 * KB });
    assert.deepEqual(failures, ['script: 6144 B > 5120 B']);
  });

  it('does not count inline bytes towards the total', () => {
    const failures = checkPageWeight([res('document', 10 * KB)], origin, { script: 6 * KB });
    assert.ok(!failures.some((f) => f.startsWith('total:')));
  });
});
