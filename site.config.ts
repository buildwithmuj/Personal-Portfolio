/**
 * The production URL. Canonical URLs, the sitemap and robots.txt are built from it.
 * `https://example.com` is a placeholder until launch (plan Task 12). Cloudflare builds refuse to run
 * while it's still the placeholder (see astro.config.ts).
 * Origin only, no trailing slash, e.g. https://portfolio.example.workers.dev.
 */
export const SITE_URL = 'https://example.com';

/**
 * Where page views are counted: a GoatCounter site's endpoint, e.g.
 * https://yourcode.goatcounter.com/count. Empty switches counting off: no request is made and the
 * page carries no code for it. Setting it also means updating the privacy notice (a test checks).
 */
export const COUNT_URL: string = '';
