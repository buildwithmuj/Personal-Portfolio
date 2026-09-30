import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

// The About stats and the typical day's header set navy text on the live sky. The shader mixes its
// four tones with linear burns (SkyGradient.astro), which can run darker than any of the tones, so
// this walks the shader's blend over its whole range and checks the text against every colour it
// can make, under the white wash that sits between (tokens.css).
const shader = readFileSync('src/components/SkyGradient.astro', 'utf8');
const tokens = readFileSync('src/styles/tokens.css', 'utf8');

type Rgb = [number, number, number];
const tone = (name: string): Rgb => {
  const match = new RegExp(`${name}: \\[([^\\]]+)\\]`).exec(shader);
  assert.ok(match?.[1], `SkyGradient.astro has no ${name} tone`);
  return match[1].split(',').map(Number) as Rgb;
};
const hex = (value: string): Rgb =>
  [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16) / 255) as Rgb;
const luminance = (rgb: Rgb) => {
  const [r = 0, g = 0, b = 0] = rgb.map((v) =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: Rgb, b: Rgb) => {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const mix = (a: Rgb, b: Rgb, t: number) => a.map((v, i) => v * (1 - t) + (b[i] ?? 0) * t) as Rgb;
const burn = (base: Rgb, blend: Rgb, op: number) =>
  mix(base, base.map((v, i) => Math.max(v + (blend[i] ?? 0) - 1, 0)) as Rgb, op);

describe('navy text on the live sky', () => {
  it('stays above 4.5:1 on every colour the sky can make, under its wash', () => {
    const [main, low, mid, high] = ['main', 'low', 'mid', 'high'].map(tone) as [Rgb, Rgb, Rgb, Rgb];
    const ink = hex(/--color-sky-ink: (#[0-9a-f]{6});/.exec(tokens)?.[1] ?? '');
    const wash = Number(/--sky-ink-wash: rgb\(255 255 255 \/ (\d+)%\);/.exec(tokens)?.[1]) / 100;
    assert.ok(wash > 0 && wash < 1, 'tokens.css has the white wash');
    let worst = Infinity;
    const steps = Array.from({ length: 21 }, (_, i) => i / 20);
    for (const lA of steps) {
      for (const lB of steps) {
        for (const lC of steps) {
          let sky = burn(main, low, 1 - lA);
          sky = burn(sky, mix(main, mid, 1 - lB), lA);
          sky = mix(sky, mix(main, high, 1 - lC), lA * lB);
          worst = Math.min(worst, contrast(ink, mix(sky, [1, 1, 1], wash)));
        }
      }
    }
    assert.ok(worst >= 4.5, `worst contrast ${worst.toFixed(2)}:1`);
  });
});
