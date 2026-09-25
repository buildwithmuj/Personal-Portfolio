/** The parts of a Lighthouse report that the floors read. */
export interface LighthouseReport {
  categories: Record<string, { score: number | null } | undefined>;
  audits: Record<string, { numericValue?: number } | undefined>;
}

/** Spec §4, floors 1 and 4. */
export const LIGHTHOUSE_FLOORS = {
  scores: { performance: 0.95, accessibility: 1, 'best-practices': 1, seo: 1 },
  metrics: {
    'largest-contentful-paint': 2500,
    'cumulative-layout-shift': 0.1,
    'total-blocking-time': 100,
  },
} as const;

/** One message per broken floor. An empty list means the page passes. */
export function checkLighthouse(report: LighthouseReport): string[] {
  const failures: string[] = [];
  for (const [id, min] of Object.entries(LIGHTHOUSE_FLOORS.scores)) {
    const score = report.categories[id]?.score ?? 0;
    if (score < min) failures.push(`${id}: ${Math.round(score * 100)} < ${Math.round(min * 100)}`);
  }
  for (const [id, max] of Object.entries(LIGHTHOUSE_FLOORS.metrics)) {
    const value = report.audits[id]?.numericValue;
    if (value === undefined) failures.push(`${id}: missing`);
    else if (value > max) failures.push(`${id}: ${value} > ${max}`);
  }
  return failures;
}
