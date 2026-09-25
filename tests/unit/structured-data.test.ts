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
  const base = {
    name: 'Mujtaba Shah',
    jobTitle: 'Senior Intelligent Automation Analyst',
    url: 'https://example.com/',
    email: 'hello@example.com',
    sameAs: ['https://github.com/buildwithmuj'],
  };

  it('describes the owner as a schema.org Person', () => {
    assert.deepEqual(JSON.parse(personJsonLd(base)), {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Mujtaba Shah',
      jobTitle: 'Senior Intelligent Automation Analyst',
      url: 'https://example.com/',
      email: 'mailto:hello@example.com',
      sameAs: ['https://github.com/buildwithmuj'],
    });
  });

  it('adds the employer as worksFor when given', () => {
    const data = JSON.parse(personJsonLd({ ...base, worksFor: 'DigiBlu' }));
    assert.deepEqual(data.worksFor, { '@type': 'Organization', name: 'DigiBlu' });
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
