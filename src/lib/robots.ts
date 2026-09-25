import type { SiteMode } from './site-mode.ts';

export function robotsTxt(input: { mode: SiteMode; sitemapUrl: string }): string {
  if (input.mode !== 'production') return 'User-agent: *\nDisallow: /\n';
  return `User-agent: *\nAllow: /\n\nSitemap: ${input.sitemapUrl}\n`;
}
