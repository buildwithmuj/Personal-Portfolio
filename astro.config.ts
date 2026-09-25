import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, envField, fontProviders } from 'astro/config';
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

export default defineConfig({
  site: SITE_URL,
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
      ],
    },
  },
});
