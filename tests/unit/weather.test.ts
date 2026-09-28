import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { describeWeather, parseWeather, weatherUrl } from '../../src/lib/weather.ts';

describe('describeWeather (WMO codes from Open-Meteo)', () => {
  it('gives each kind of weather its icon in the top bar', () => {
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

describe('weatherUrl and parseWeather (build and browser share them)', () => {
  it('asks Open-Meteo for the current temperature and weather code', () => {
    const url = new URL(weatherUrl(51.5072, -0.1276));
    assert.equal(url.origin, 'https://api.open-meteo.com');
    assert.equal(url.searchParams.get('current'), 'temperature_2m,weather_code');
    assert.equal(url.searchParams.get('latitude'), '51.5072');
  });

  it('reads a rounded temperature and the scene from a response', () => {
    assert.deepEqual(parseWeather({ current: { temperature_2m: 17.6, weather_code: 61 } }), {
      temperature: 18,
      condition: 'Light rain',
      scene: 'rain',
    });
  });

  it('reads nothing from an incomplete or unexpected response', () => {
    assert.equal(parseWeather({ current: { temperature_2m: 17 } }), undefined);
    assert.equal(parseWeather(null), undefined);
    assert.equal(parseWeather({ current: { temperature_2m: 17, weather_code: 42 } }), undefined);
  });
});
