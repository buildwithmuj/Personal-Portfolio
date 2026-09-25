import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { visibleTestimonials } from '../../src/lib/testimonials.ts';

const real = { data: { placeholder: false, name: 'Real' } };
const fake = { data: { placeholder: true, name: 'Fake' } };

describe('visibleTestimonials (content spec §5.6)', () => {
  it('hides placeholder quotes in production', () => {
    assert.deepEqual(visibleTestimonials([real, fake], false), [real]);
  });

  it('shows placeholder quotes outside production', () => {
    assert.deepEqual(visibleTestimonials([real, fake], true), [real, fake]);
  });
});
