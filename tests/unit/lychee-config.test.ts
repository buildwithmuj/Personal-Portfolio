import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const config = readFileSync('lychee.toml', 'utf8');
// The exclude list's patterns (single-quoted TOML literal strings, so no escaping to undo).
const excludes = [
  ...(config.match(/^exclude = \[([\s\S]*?)^\]/m)?.[1] ?? '').matchAll(/'([^']+)'/g),
]
  .map((match) => match[1] ?? '')
  .map((pattern) => new RegExp(pattern));
const excluded = (url: string) => excludes.some((pattern) => pattern.test(url));

describe('lychee.toml (spec §9 link checks)', () => {
  it('sets include_fragments to a fragment mode lychee accepts', () => {
    // lychee 0.24 takes a mode string, not a boolean; anything else fails CI with exit code 3.
    const value = config.match(/^include_fragments = (.+)$/m)?.[1];
    assert.equal(value, '"anchor-only"');
  });

  it('skips the sites that turn automated checkers away', () => {
    // X answers with 403 Forbidden and LinkedIn with status 999, whether or not the page exists.
    for (const url of [
      'https://x.com/buildwithmuj',
      'https://twitter.com/buildwithmuj',
      'https://www.linkedin.com/in/someone',
    ]) {
      assert.ok(excluded(url), `${url} should be excluded`);
    }
  });

  it('still checks every other external link', () => {
    for (const url of [
      'https://github.com/buildwithmuj',
      'https://www.tiktok.com/@buildwithmuj',
      'https://xyz.com/',
      'https://x.company.com/',
      'https://api.open-meteo.com/v1/forecast',
    ]) {
      assert.ok(!excluded(url), `${url} should be checked`);
    }
  });
});
