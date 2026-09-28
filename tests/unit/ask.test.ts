import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { askMailto, matchQuestions, queryWords } from '../../src/lib/ask.ts';

const questions = [
  {
    question: 'What role are you after?',
    answer: 'A senior role where automation, AI and product meet.',
  },
  { question: 'How do you tackle a messy process?', answer: 'I start with the real process.' },
  { question: 'Which tools do you use?', answer: 'RPA, APIs and Power Apps, and Power BI.' },
  { question: 'What are you learning?', answer: 'Agentic AI workflows.' },
];

describe('queryWords', () => {
  it('keeps the words that mean something, lower-cased', () => {
    assert.deepEqual(queryWords('How do you tackle a MESSY process?'), [
      'tackle',
      'messy',
      'process',
    ]);
  });

  it('is empty for filler alone', () => {
    assert.deepEqual(queryWords('what do you'), []);
    assert.deepEqual(queryWords('   '), []);
  });
});

describe('matchQuestions', () => {
  it('lists every question for an empty query', () => {
    assert.deepEqual(matchQuestions('', questions), [0, 1, 2, 3]);
  });

  it('finds a question from part of a word', () => {
    assert.deepEqual(matchQuestions('mes', questions), [1]);
  });

  it('needs every word, and ignores filler', () => {
    assert.deepEqual(matchQuestions('what tools do you use', questions), [2]);
    assert.deepEqual(matchQuestions('messy tools', questions), []);
  });

  it('puts questions that match before those whose answer matches', () => {
    assert.deepEqual(matchQuestions('ai', questions), [0, 3]);
    assert.deepEqual(matchQuestions('role', questions), [0]);
    assert.deepEqual(matchQuestions('rpa', questions), [2]);
  });

  it('finds nothing for a question not answered', () => {
    assert.deepEqual(matchQuestions('Do you work remotely?', questions), []);
  });
});

describe('askMailto', () => {
  it('opens an email to the owner with the question in it', () => {
    assert.equal(
      askMailto('me@example.com', 'Do you work remotely?'),
      'mailto:me@example.com?subject=A%20question%20from%20your%20site&body=Do%20you%20work%20remotely%3F',
    );
  });
});
