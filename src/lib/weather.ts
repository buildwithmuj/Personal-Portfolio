/**
 * The owner's local weather, shown beside the clock and in the hero's ambient layer. It's fetched
 * once per build from Open-Meteo (free, no key), so visitors' browsers never contact a weather
 * service; the site is as fresh as its last build. Any failure simply means no weather.
 */
export interface Weather {
  /** Degrees Celsius, rounded. */
  temperature: number;
  /** A short description, e.g. "Light rain". */
  condition: string;
  /** Drizzle, rain, showers or thunder: the hero shows rain. */
  wet: boolean;
}

/** WMO weather codes, as Open-Meteo reports them, grouped into short descriptions. */
const CONDITIONS: readonly [codes: readonly number[], condition: string, wet: boolean][] = [
  [[0], 'Clear', false],
  [[1, 2], 'Partly cloudy', false],
  [[3], 'Overcast', false],
  [[45, 48], 'Fog', false],
  [[51, 53, 55, 56, 57], 'Drizzle', true],
  [[61, 66], 'Light rain', true],
  [[63, 65, 67], 'Rain', true],
  [[71, 73, 75, 77, 85, 86], 'Snow', false],
  [[80, 81, 82], 'Showers', true],
  [[95, 96, 99], 'Thunderstorms', true],
];

export function describeWeather(code: number): { condition: string; wet: boolean } | undefined {
  const match = CONDITIONS.find(([codes]) => codes.includes(code));
  return match && { condition: match[1], wet: match[2] };
}

let cached: Promise<Weather | undefined> | undefined;

export function currentWeather(latitude: number, longitude: number): Promise<Weather | undefined> {
  cached ??= fetchWeather(latitude, longitude);
  return cached;
}

async function fetchWeather(latitude: number, longitude: number): Promise<Weather | undefined> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('current', 'temperature_2m,weather_code');
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return undefined;
    const data = (await response.json()) as {
      current?: { temperature_2m?: number; weather_code?: number };
    };
    const { temperature_2m: temperature, weather_code: code } = data.current ?? {};
    if (typeof temperature !== 'number' || typeof code !== 'number') return undefined;
    const description = describeWeather(code);
    return description && { temperature: Math.round(temperature), ...description };
  } catch {
    return undefined;
  }
}
