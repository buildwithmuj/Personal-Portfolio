import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { describeWeather } from '../../src/lib/weather.ts';

describe('describeWeather (WMO codes from Open-Meteo)', () => {
  it('describes dry weather without rain in the hero', () => {
    assert.deepEqual(describeWeather(0), { condition: 'Clear', wet: false });
    assert.deepEqual(describeWeather(3), { condition: 'Overcast', wet: false });
    assert.deepEqual(describeWeather(45), { condition: 'Fog', wet: false });
    assert.deepEqual(describeWeather(73), { condition: 'Snow', wet: false });
  });

  it('marks drizzle, rain, showers and thunder as wet', () => {
    for (const code of [51, 61, 63, 65, 80, 82, 95]) assert.equal(describeWeather(code)?.wet, true);
    assert.equal(describeWeather(61)?.condition, 'Light rain');
  });

  it('gives no description for a code it does not know', () => {
    assert.equal(describeWeather(42), undefined);
  });
});
