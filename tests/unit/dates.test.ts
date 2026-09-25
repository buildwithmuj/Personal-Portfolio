import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatRoleDates } from '../../src/lib/dates.ts';

describe('formatRoleDates', () => {
  it('formats a current role', () => {
    assert.equal(formatRoleDates('2021-12'), 'Dec 2021 – present');
  });

  it('formats a finished role', () => {
    assert.equal(formatRoleDates('2018-04', '2021-11'), 'Apr 2018 – Nov 2021');
  });
});
