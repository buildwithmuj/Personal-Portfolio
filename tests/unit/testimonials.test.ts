import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { splitQuote, visibleTestimonials } from '../../src/lib/testimonials.ts';

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

const quote = 'Clear business cases and careful delivery. Mujtaba made automation feel safe.';

describe('splitQuote (the marked phrase in a testimonial)', () => {
  it('splits a quote around its highlighted phrase', () => {
    assert.deepEqual(splitQuote(quote, 'made automation feel safe'), [
      'Clear business cases and careful delivery. Mujtaba ',
      'made automation feel safe',
      '.',
    ]);
  });

  it('marks nothing when there is no phrase, or it is not in the quote', () => {
    assert.deepEqual(splitQuote(quote), [quote, '', '']);
    assert.deepEqual(splitQuote(quote, 'not in it'), [quote, '', '']);
  });

  it('marks only the first time the phrase appears', () => {
    assert.deepEqual(splitQuote('safe and safe', 'safe'), ['', 'safe', ' and safe']);
  });
});
