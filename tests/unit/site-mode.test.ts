import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveSiteMode } from '../../src/lib/site-mode.ts';

describe('resolveSiteMode (spec §8)', () => {
  it('is development under astro dev, whatever the branch', () => {
    assert.equal(resolveSiteMode({ dev: true, branch: undefined }), 'development');
    assert.equal(resolveSiteMode({ dev: true, branch: 'main' }), 'development');
  });

  it('is production for a main-branch build', () => {
    assert.equal(resolveSiteMode({ dev: false, branch: 'main' }), 'production');
  });

  it('defaults to production when no branch is known (CI and local builds)', () => {
    assert.equal(resolveSiteMode({ dev: false, branch: undefined }), 'production');
    assert.equal(resolveSiteMode({ dev: false, branch: '' }), 'production');
  });

  it('is preview for dev (the staging build) and any other branch', () => {
    assert.equal(resolveSiteMode({ dev: false, branch: 'dev' }), 'preview');
    assert.equal(resolveSiteMode({ dev: false, branch: 'fix/typo' }), 'preview');
  });
});
