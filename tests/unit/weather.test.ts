import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { describeWeather } from '../../src/lib/weather.ts';

describe('describeWeather (WMO codes from Open-Meteo)', () => {
  it('gives each kind of weather its hero scene', () => {
    assert.deepEqual(describeWeather(0), { condition: 'Clear', scene: 'clear' });
    assert.deepEqual(describeWeather(2), { condition: 'Partly cloudy', scene: 'cloud' });
    assert.deepEqual(describeWeather(3), { condition: 'Overcast', scene: 'cloud' });
    assert.deepEqual(describeWeather(45), { condition: 'Fog', scene: 'fog' });
    assert.deepEqual(describeWeather(53), { condition: 'Drizzle', scene: 'drizzle' });
    assert.deepEqual(describeWeather(61), { condition: 'Light rain', scene: 'rain' });
    assert.deepEqual(describeWeather(81), { condition: 'Showers', scene: 'rain' });
    assert.deepEqual(describeWeather(95), { condition: 'Thunderstorms', scene: 'storm' });
    assert.deepEqual(describeWeather(73), { condition: 'Snow', scene: 'snow' });
  });

  it('gives no description for a code it does not know', () => {
    assert.equal(describeWeather(42), undefined);
  });
});
