import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { featuredStudies, visibleStudies, type Orderable } from '../../src/lib/case-studies.ts';

function study(title: string, order: number, extra: Partial<Orderable['data']> = {}): Orderable {
  return { data: { title, order, featured: false, draft: false, ...extra } };
}

const titles = (entries: Orderable[]) => entries.map((entry) => entry.data.title);

describe('visibleStudies', () => {
  it('hides drafts unless asked to include them', () => {
    const entries = [study('Live', 1), study('Draft', 2, { draft: true })];
    assert.deepEqual(titles(visibleStudies(entries, false)), ['Live']);
    assert.deepEqual(titles(visibleStudies(entries, true)), ['Live', 'Draft']);
  });

  it('sorts by order, then title', () => {
    const entries = [study('Beta', 2), study('Zulu', 1), study('Alpha', 2)];
    assert.deepEqual(titles(visibleStudies(entries, false)), ['Zulu', 'Alpha', 'Beta']);
  });

  it('does not modify its input', () => {
    const entries = [study('B', 2), study('A', 1)];
    visibleStudies(entries, false);
    assert.deepEqual(titles(entries), ['B', 'A']);
  });
});

describe('featuredStudies', () => {
  it('keeps only featured studies, in the given order', () => {
    const entries = [
      study('One', 1, { featured: true }),
      study('Two', 2),
      study('Three', 3, { featured: true }),
    ];
    assert.deepEqual(titles(featuredStudies(entries)), ['One', 'Three']);
  });
});
