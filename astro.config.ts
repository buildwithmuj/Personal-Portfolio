import sitemap from '@astrojs/sitemap';
import { defineConfig, envField } from 'astro/config';
import { SITE_URL } from './site.config.ts';

// Cloudflare Workers Builds sets WORKERS_CI=1. Refuse to deploy with the placeholder URL.
if (process.env['WORKERS_CI'] === '1' && new URL(SITE_URL).hostname === 'example.com') {
  throw new Error(
    'SITE_URL in site.config.ts is still the placeholder. Set the production URL before deploying.',
  );
}

export default defineConfig({
  site: SITE_URL,
  env: {
    schema: {
      // Set by Cloudflare Workers Builds; decides production vs preview (spec §8).
      WORKERS_CI_BRANCH: envField.string({ context: 'server', access: 'public', optional: true }),
    },
  },
  trailingSlash: 'never',
  build: { format: 'file' },
  markdown: { syntaxHighlight: false },
  integrations: [sitemap({ filter: (page) => new URL(page).pathname !== '/404' })],
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
