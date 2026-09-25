export type SiteMode = 'development' | 'preview' | 'production';

/**
 * Production is the default, so a missing variable can never put `noindex` on the live site
 * (spec §8). Only a Cloudflare build of a branch other than `main` is a preview.
 */
export function resolveSiteMode(input: { dev: boolean; branch: string | undefined }): SiteMode {
  if (input.dev) return 'development';
  if (input.branch && input.branch !== 'main') return 'preview';
  return 'production';
}
