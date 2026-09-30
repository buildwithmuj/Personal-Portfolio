import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  caseStudyDetail,
  caseStudyLabel,
  featuredStudies,
  visibleStudies,
  type Orderable,
} from '../../src/lib/case-studies.ts';

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

describe('caseStudyLabel (content spec §5.4)', () => {
  it('labels client work with its sector', () => {
    assert.equal(
      caseStudyLabel({ kind: 'client', sector: 'Healthcare' }),
      'Client work · Healthcare',
    );
  });

  it('labels personal projects with their status', () => {
    assert.equal(caseStudyLabel({ kind: 'product', status: 'live' }), 'Personal project · Live');
    assert.equal(
      caseStudyLabel({ kind: 'product', status: 'in-progress' }),
      'Personal project · In progress',
    );
    assert.equal(
      caseStudyLabel({ kind: 'product', status: 'retired' }),
      'Personal project · Retired',
    );
    // An idea not yet built says so wherever it is listed.
    assert.equal(
      caseStudyLabel({ kind: 'product', status: 'concept' }),
      'Personal project · Concept',
    );
  });

  it('falls back to the kind alone', () => {
    assert.equal(caseStudyLabel({ kind: 'client' }), 'Client work');
  });
});

// The detail alone, for the Selected work tiles' chips: the sector, or the status.
describe('caseStudyDetail', () => {
  it('gives client work its sector and personal projects their status', () => {
    assert.equal(caseStudyDetail({ kind: 'client', sector: 'Healthcare' }), 'Healthcare');
    assert.equal(caseStudyDetail({ kind: 'product', status: 'in-progress' }), 'In progress');
  });

  it('is empty when there is no detail', () => {
    assert.equal(caseStudyDetail({ kind: 'product' }), '');
  });
});
