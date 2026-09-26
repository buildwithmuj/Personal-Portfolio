import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assertNoPlaceholders, placeholderLines } from '../../src/lib/placeholders.ts';

describe('placeholderLines', () => {
  it('returns every line marked # PLACEHOLDER, trimmed', () => {
    const text = 'a: 1\n  email: x@example.com # PLACEHOLDER: publish address\nb: 2\n';
    assert.deepEqual(placeholderLines(text), [
      'email: x@example.com # PLACEHOLDER: publish address',
    ]);
  });

  it('returns nothing when no line is marked', () => {
    assert.deepEqual(placeholderLines('a: 1\n# a normal comment\n'), []);
  });
});

describe('assertNoPlaceholders', () => {
  it('names the file and every placeholder line', () => {
    assert.throws(
      () => assertNoPlaceholders('profile.yaml', 'a: 1 # PLACEHOLDER: x\nb: 2 # PLACEHOLDER: y\n'),
      {
        message:
          'profile.yaml still has placeholders:\na: 1 # PLACEHOLDER: x\nb: 2 # PLACEHOLDER: y',
      },
    );
  });

  it('passes clean content', () => {
    assert.doesNotThrow(() => assertNoPlaceholders('profile.yaml', 'a: 1\n'));
  });
});
