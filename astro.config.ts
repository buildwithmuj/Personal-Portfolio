import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, envField, fontProviders } from 'astro/config';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { MOTION_SCRIPT } from './src/lib/motion.ts';
import { assertNoPlaceholders } from './src/lib/placeholders.ts';
import { resolveSiteMode } from './src/lib/site-mode.ts';
import { SITE_URL } from './site.config.ts';

// Cloudflare Workers Builds sets WORKERS_CI=1. Refuse to deploy with the placeholder URL.
if (process.env['WORKERS_CI'] === '1' && new URL(SITE_URL).hostname === 'example.com') {
  throw new Error(
    'SITE_URL in site.config.ts is still the placeholder. Set the production URL before deploying.',
  );
}

// Drafts never appear in the sitemap (spec §6), and the sitemap is production-only (spec §8).
const isProductionBuild =
  resolveSiteMode({ dev: false, branch: process.env['WORKERS_CI_BRANCH'] }) === 'production';

// A production build must not ship placeholders (content spec §13): the live GitHub Pages build, CI's
// builds and local ones alike, so one is caught long before it could deploy. Only `astro build`:
// the dev server and `astro check` load this file too, and drafting may mark placeholders.
if (isProductionBuild && process.argv.includes('build')) {
  const PROFILE = 'src/content/profile.yaml';
  assertNoPlaceholders(PROFILE, readFileSync(PROFILE, 'utf8'));
}

// The live site is GitHub Pages at https://buildwithmuj.github.io/Personal-Portfolio/ (pages.yml sets
// these). The tests, and Cloudflare if the site later moves to its own domain, build at the root.
const pagesBase = process.env['PAGES_BASE'];
// A Pages build without its address would ship example.com canonicals, OG URLs and sitemap entries.
if (pagesBase && !process.env['PAGES_SITE']) {
  throw new Error('PAGES_BASE is set without PAGES_SITE. Set both for a GitHub Pages build.');
}

export default defineConfig({
  site: process.env['PAGES_SITE'] ?? SITE_URL,
  ...(pagesBase ? { base: pagesBase } : {}),
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Mona Sans',
      cssVariable: '--font-mona',
      fallbacks: ['system-ui', 'sans-serif'],
      options: {
        variants: [
          {
            weight: '200 900',
            style: 'normal',
            src: [
              './node_modules/@fontsource-variable/mona-sans/files/mona-sans-latin-wght-normal.woff2',
            ],
          },
        ],
      },
    },
  ],
  env: {
    schema: {
      // Set by Cloudflare Workers Builds; decides production vs preview (spec §8).
      WORKERS_CI_BRANCH: envField.string({ context: 'server', access: 'public', optional: true }),
    },
  },
  trailingSlash: 'never',
  // Class-based scoping keeps each scoped selector ~10 bytes shorter (page-weight floor, spec §4).
  scopedStyleStrategy: 'class',
  build: { format: 'file' },
  markdown: { syntaxHighlight: false },
  integrations: [
    mdx(),
    ...(isProductionBuild
      ? [sitemap({ filter: (page) => new URL(page).pathname !== '/404' })]
      : []),
  ],
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'none'",
        // The Cal.com booking frame, created only when the visitor opens the panel (content spec §5.8).
        'frame-src https://cal.com https://app.cal.com',
        // Live London weather, fetched by the top bar (privacy notice; foundation spec §15).
        "connect-src 'self' https://api.open-meteo.com",
      ],
      // The one inline script Astro doesn't bundle, and so doesn't hash (src/lib/motion.ts).
      scriptDirective: {
        hashes: [`sha256-${createHash('sha256').update(MOTION_SCRIPT).digest('base64')}`],
      },
    },
  },
});
