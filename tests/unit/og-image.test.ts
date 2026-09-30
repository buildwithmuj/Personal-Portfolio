import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

// Base.astro reads the default link-preview image's size from its PNG header; this holds the image
// to the 1200 × 630 that link previews expect.
describe('the default link-preview image', () => {
  it('is a 1200 × 630 PNG', () => {
    const png = readFileSync('public/og-default.png');
    assert.equal(png.toString('ascii', 1, 4), 'PNG');
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1200, 630]);
  });
});
