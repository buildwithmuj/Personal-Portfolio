/**
 * The owner's local weather, shown beside the clock and in the hero's ambient layer, from
 * Open-Meteo (free, no key). The build fetches a reading, which is what shows first and all that
 * shows without JavaScript; the top bar then refreshes it live in the visitor's browser (see the
 * privacy notice). Any failure simply keeps the last reading, or shows no weather.
 */
export interface Weather {
  /** Degrees Celsius, rounded. */
  temperature: number;
  /** A short description, e.g. "Light rain". */
  condition: string;
  /** Which scene the hero's ambient layer plays. */
  scene: WeatherScene;
}

export type WeatherScene = 'clear' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'storm' | 'snow';

/** WMO weather codes, as Open-Meteo reports them, grouped into short descriptions. */
const CONDITIONS: readonly [codes: readonly number[], condition: string, scene: WeatherScene][] = [
  [[0], 'Clear', 'clear'],
  [[1, 2], 'Partly cloudy', 'cloud'],
  [[3], 'Overcast', 'cloud'],
  [[45, 48], 'Fog', 'fog'],
  [[51, 53, 55, 56, 57], 'Drizzle', 'drizzle'],
  [[61, 66], 'Light rain', 'rain'],
  [[63, 65, 67], 'Rain', 'rain'],
  [[71, 73, 75, 77, 85, 86], 'Snow', 'snow'],
  [[80, 81, 82], 'Showers', 'rain'],
  [[95, 96, 99], 'Thunderstorms', 'storm'],
];

export function describeWeather(
  code: number,
): { condition: string; scene: WeatherScene } | undefined {
  const match = CONDITIONS.find(([codes]) => codes.includes(code));
  return match && { condition: match[1], scene: match[2] };
}

/** Open-Meteo's current conditions for a place; the build and visitors' browsers both ask it. */
export function weatherUrl(latitude: number, longitude: number): string {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('current', 'temperature_2m,weather_code');
  return url.href;
}

/** The reading in an Open-Meteo response, or nothing when it is incomplete or a code is unknown. */
export function parseWeather(data: unknown): Weather | undefined {
  const current = (data as { current?: { temperature_2m?: unknown; weather_code?: unknown } })
    ?.current;
  const temperature = current?.temperature_2m;
  const code = current?.weather_code;
  if (typeof temperature !== 'number' || typeof code !== 'number') return undefined;
  const description = describeWeather(code);
  return description && { temperature: Math.round(temperature), ...description };
}

let cached: Promise<Weather | undefined> | undefined;

/** The build-time reading: shown first, and all that shows without JavaScript. */
export function currentWeather(latitude: number, longitude: number): Promise<Weather | undefined> {
  cached ??= fetch(weatherUrl(latitude, longitude), { signal: AbortSignal.timeout(5000) })
    .then((response) => (response.ok ? response.json() : undefined))
    .then(parseWeather, () => undefined);
  return cached;
}
