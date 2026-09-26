import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const config = readFileSync('lychee.toml', 'utf8');

describe('lychee.toml (spec §9 link checks)', () => {
  it('sets include_fragments to a fragment mode lychee accepts', () => {
    // lychee 0.24 takes a mode string, not a boolean; anything else fails CI with exit code 3.
    const value = config.match(/^include_fragments = (.+)$/m)?.[1];
    assert.equal(value, '"anchor-only"');
  });
});
