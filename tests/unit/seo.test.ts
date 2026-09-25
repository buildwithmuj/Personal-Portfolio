import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildSeo, canonicalUrl, type SeoInput, type SeoTags } from '../../src/lib/seo.ts';

const home: SeoInput = {
  siteUrl: 'https://example.com/',
  siteName: 'Alex Placeholder',
  headline: 'Product designer',
  path: '/',
  description: 'A placeholder description.',
  image: { url: '/og-default.png', alt: 'Placeholder image' },
  noindex: false,
  type: 'website',
};

function meta(tags: SeoTags, key: string): string | undefined {
  return tags.meta.find((tag) => tag.name === key || tag.property === key)?.content;
}

describe('canonicalUrl', () => {
  it('keeps the slash on the root', () => {
    assert.equal(canonicalUrl('https://example.com/', '/'), 'https://example.com/');
  });

  it('drops trailing slashes, queries and fragments elsewhere', () => {
    assert.equal(
      canonicalUrl('https://example.com/', '/work/sample-project/?ref=x#top'),
      'https://example.com/work/sample-project',
    );
  });
});

describe('buildSeo', () => {
  it('titles the home page "Name — Headline"', () => {
    assert.equal(buildSeo(home).title, 'Alex Placeholder — Product designer');
  });

  it('titles other pages "Page — Name"', () => {
    const tags = buildSeo({ ...home, title: 'Sample Project', path: '/work/sample-project' });
    assert.equal(tags.title, 'Sample Project — Alex Placeholder');
    assert.equal(meta(tags, 'og:title'), 'Sample Project — Alex Placeholder');
  });

  it('uses the absolute canonical URL for og:url', () => {
    const tags = buildSeo({ ...home, path: '/work/sample-project' });
    assert.equal(tags.canonical, 'https://example.com/work/sample-project');
    assert.equal(meta(tags, 'og:url'), 'https://example.com/work/sample-project');
  });

  it('resolves a root-relative image to an absolute og:image', () => {
    const tags = buildSeo(home);
    assert.equal(meta(tags, 'og:image'), 'https://example.com/og-default.png');
    assert.equal(meta(tags, 'og:image:alt'), 'Placeholder image');
  });

  it('adds robots noindex only when asked', () => {
    assert.equal(meta(buildSeo(home), 'robots'), undefined);
    assert.equal(meta(buildSeo({ ...home, noindex: true }), 'robots'), 'noindex, nofollow');
  });

  it('includes the description, type and a large Twitter card', () => {
    const tags = buildSeo({ ...home, type: 'article' });
    assert.equal(meta(tags, 'description'), 'A placeholder description.');
    assert.equal(meta(tags, 'og:description'), 'A placeholder description.');
    assert.equal(meta(tags, 'og:type'), 'article');
    assert.equal(meta(tags, 'og:site_name'), 'Alex Placeholder');
    assert.equal(meta(tags, 'twitter:card'), 'summary_large_image');
  });
});
