import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { robotsTxt } from '../../src/lib/robots.ts';

const sitemapUrl = 'https://example.com/sitemap-index.xml';

describe('robotsTxt', () => {
  it('allows crawling and names the sitemap in production', () => {
    assert.equal(
      robotsTxt({ mode: 'production', sitemapUrl }),
      'User-agent: *\nAllow: /\n\nSitemap: https://example.com/sitemap-index.xml\n',
    );
  });

  it('blocks all crawling in preview and development', () => {
    for (const mode of ['preview', 'development'] as const) {
      assert.equal(robotsTxt({ mode, sitemapUrl }), 'User-agent: *\nDisallow: /\n');
    }
  });
});
