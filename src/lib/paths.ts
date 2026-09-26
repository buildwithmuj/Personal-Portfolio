/**
 * Prefixes a root-relative path with the site's base path. The base is empty for the real site and
 * `/Personal-Portfolio` for the GitHub Pages preview (see `.github/workflows/pages.yml`).
 */
export function withBase(path: string): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`;
}
