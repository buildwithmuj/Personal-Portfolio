import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isNight, localTime, taskStates } from '../../src/lib/day.ts';

const DAY = ['06:00', '07:45', '08:30', '13:30', '16:00'];

describe('taskStates (the typical day as it happens)', () => {
  it('marks nothing before the first task', () => {
    assert.deepEqual(taskStates(DAY, '05:59'), ['', '', '', '', '']);
  });

  it('marks a task done once the next starts, and the one under way as now', () => {
    assert.deepEqual(taskStates(DAY, '14:00'), ['done', 'done', 'done', 'now', '']);
    assert.deepEqual(taskStates(DAY, '13:30'), ['done', 'done', 'done', 'now', '']);
  });

  it('keeps the last task under way until midnight', () => {
    assert.deepEqual(taskStates(DAY, '23:59'), ['done', 'done', 'done', 'done', 'now']);
  });
});

describe('localTime', () => {
  it('gives the 24-hour time in a time zone, including summer time', () => {
    assert.equal(localTime('Europe/London', new Date('2026-09-28T13:05:00Z')), '14:05');
    assert.equal(localTime('Europe/London', new Date('2026-12-01T00:30:00Z')), '00:30');
  });
});

describe('isNight (the watch face after dark, on London time)', () => {
  it('is night from 19:00 until the 06:00 start', () => {
    for (const time of ['19:00', '23:59', '00:00', '05:59'])
      assert.equal(isNight(time), true, time);
  });

  it('is day from 06:00 until 19:00', () => {
    for (const time of ['06:00', '12:00', '18:59']) assert.equal(isNight(time), false, time);
  });
});
