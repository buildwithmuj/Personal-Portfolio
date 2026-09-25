import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { creativeWorkJsonLd, jsonLd, personJsonLd } from '../../src/lib/structured-data.ts';

describe('jsonLd', () => {
  it('escapes < so the data can never close its script tag', () => {
    const payload = { name: '</script><script>alert(1)</script>' };
    const out = jsonLd(payload);
    assert.ok(!out.includes('</script>'));
    assert.deepEqual(JSON.parse(out), payload);
  });
});

describe('personJsonLd', () => {
  it('describes the owner as a schema.org Person', () => {
    const data = JSON.parse(
      personJsonLd({
        name: 'Alex Placeholder',
        headline: 'Product designer',
        url: 'https://example.com/',
        email: 'alex@example.com',
        sameAs: ['https://github.com/'],
      }),
    );
    assert.deepEqual(data, {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Alex Placeholder',
      jobTitle: 'Product designer',
      url: 'https://example.com/',
      email: 'mailto:alex@example.com',
      sameAs: ['https://github.com/'],
    });
  });
});

describe('creativeWorkJsonLd', () => {
  it('describes a case study as a CreativeWork by the owner', () => {
    const data = JSON.parse(
      creativeWorkJsonLd({
        title: 'Sample Project',
        description: 'A placeholder.',
        url: 'https://example.com/work/sample-project',
        image: 'https://example.com/_astro/cover.jpg',
        authorName: 'Alex Placeholder',
        authorUrl: 'https://example.com/',
        keywords: ['Design', 'Development'],
      }),
    );
    assert.deepEqual(data, {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: 'Sample Project',
      description: 'A placeholder.',
      url: 'https://example.com/work/sample-project',
      image: 'https://example.com/_astro/cover.jpg',
      keywords: 'Design, Development',
      author: { '@type': 'Person', name: 'Alex Placeholder', url: 'https://example.com/' },
    });
  });
});
