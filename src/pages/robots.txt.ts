import type { APIRoute } from 'astro';
import { siteMode } from '../lib/mode.ts';
import { robotsTxt } from '../lib/robots.ts';

export const GET: APIRoute = ({ site }) => {
  if (!site) throw new Error('`site` must be set in astro.config.ts');
  const body = robotsTxt({ mode: siteMode, sitemapUrl: new URL('sitemap-index.xml', site).href });
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
