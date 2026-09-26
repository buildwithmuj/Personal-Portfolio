import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sitemapPaths } from '../support/sitemap.ts';

describe('sitemapPaths', () => {
  it('returns the pathname of every <loc>, in order', () => {
    const xml =
      '<urlset><url><loc>https://example.com/</loc></url>' +
      '<url><loc>https://example.com/work/sample-project</loc></url></urlset>';
    assert.deepEqual(sitemapPaths(xml), ['/', '/work/sample-project']);
  });

  it('returns an empty list for a sitemap with no URLs', () => {
    assert.deepEqual(sitemapPaths('<urlset></urlset>'), []);
  });
});
