import { existsSync, readFileSync } from 'node:fs';
import { SITE_URL } from '../../site.config.ts';
import { sitemapPaths } from './sitemap.ts';

export { SITE_URL };
/** Origin only (no trailing slash), so building expected URLs by concatenation can't produce `//`. */
export const SITE_ORIGIN = new URL(SITE_URL).origin;
export const BASE_URL = 'http://127.0.0.1:8787';
export const SERVER_ONLY =
  'Server behaviour is the same in every browser, so this runs in Chromium only';

const SITEMAP = 'dist/sitemap-0.xml';

/** Every production page, read from the built sitemap. */
export function builtPagePaths(): string[] {
  if (!existsSync(SITEMAP)) {
    throw new Error(`${SITEMAP} not found. Run \`pnpm build\` before the Playwright tests.`);
  }
  return sitemapPaths(readFileSync(SITEMAP, 'utf8'));
}
