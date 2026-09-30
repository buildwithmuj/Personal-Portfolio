/**
 * Prefixes a root-relative path with the site's base path: `/Personal-Portfolio` on GitHub Pages,
 * the live site (see `.github/workflows/pages.yml`), and empty for local builds, the tests, and a
 * future site on its own domain.
 */
export function withBase(path: string): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`;
}
