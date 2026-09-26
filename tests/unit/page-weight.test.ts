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
        { script: 1 * KB, stylesheet: 2 * KB },
      ),
      [],
    );
  });

  it('flags JavaScript over 6 KB and CSS over 8 KB compressed', () => {
    assert.deepEqual(checkPageWeight([], origin, { script: 7 * KB, stylesheet: 9 * KB }), [
      'script (compressed): 7168 B > 6144 B',
      'stylesheet (compressed): 9216 B > 8192 B',
    ]);
  });

  it('ignores decoded CSS and JavaScript sizes; only the compressed size counts', () => {
    const big = [res('stylesheet', 40 * KB), res('script', 12 * KB)];
    assert.deepEqual(checkPageWeight(big, origin, { script: 3 * KB, stylesheet: 7 * KB }), []);
  });

  it('flags fonts over 100 KB', () => {
    assert.deepEqual(checkPageWeight([res('font', 101 * KB)], origin), [
      'font: 103424 B > 102400 B',
    ]);
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

  it('measures compressed size file by file', () => {
    const rule = '.card { padding: 32px; border-radius: 24px; } ';
    assert.ok(compressedSize([rule.repeat(200)]) < rule.length * 200 * 0.1);
    assert.equal(compressedSize([rule, rule]), 2 * compressedSize([rule]));
  });
});
