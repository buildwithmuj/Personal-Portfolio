# Portfolio Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the production-ready technical foundation of the portfolio: an Astro 7 static site with placeholder content, strict CSP and security headers, automated quality gates, and deployment to Cloudflare Workers from GitHub.

**Architecture:** Astro prerenders every page to static HTML in `dist/`. Cloudflare Workers static assets serves those files, with security headers from `public/_headers`. Content lives in `src/content/` and is validated by Zod schemas at build time. Pure helpers in `src/lib/` are unit-tested with `node --test`. Playwright runs the end-to-end, axe, page-weight and Lighthouse checks against `wrangler dev` serving the production build.

**Tech Stack:** Astro 7, TypeScript 6.0, pnpm 10.34.5, Node 24, MDX, plain CSS, Playwright, axe-core, Lighthouse 13, Stylelint, Prettier, wrangler 4, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-24-portfolio-foundation-design.md`. Read it in full first, including §15 (amendments).

## Global Constraints

- Node: `.nvmrc` = `24`; `engines.node` = `>=24.12.0 <25`.
- pnpm: `packageManager` = `pnpm@10.34.5`. `pnpm-workspace.yaml` sets:
  - `minimumReleaseAge: 10080`
  - `strictDepBuilds: true`
  - `engineStrict: true`
  - `onlyBuiltDependencies: [esbuild, sharp, workerd]`
- Add dependencies with `pnpm add -w …` (the workspace file makes the root a workspace).
- Dependencies: only those in spec §10. Anything else → stop and ask the owner.
- If pnpm reports `ERR_PNPM_NO_MATURE_MATCHING_VERSION`, or a dependency with an unreviewed build script,
  stop and report. Never bypass `minimumReleaseAge` or `strictDepBuilds`.
- Astro config values, exactly:
  - `trailingSlash: 'never'`
  - `build.format: 'file'`
  - `markdown.syntaxHighlight: false`
  - `security.csp.directives`: `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`,
    `form-action 'none'`
- Things the code must never contain:
  - requests to any third-party origin
  - inline `style` attributes
  - `set:html`, except for JSON-LD
  - colour literals outside `src/styles/tokens.css`
  - personal copy in components (it comes from `src/content/`)
- Relative imports of `.ts` files include the `.ts` extension. Node runs TypeScript natively and needs
  it. TypeScript must use erasable syntax only: no enums, namespaces or parameter properties.
- Test naming:
  - `tests/unit/**/*.test.ts` are unit tests, run by `node --test`.
  - `tests/**/*.spec.ts` are Playwright specs.
- Every non-void HTML element is explicitly closed. Astro 7's compiler rejects unclosed tags, including
  `<script …></script>`.
- Placeholders until Task 12:
  - name "Alex Placeholder", email `alex@example.com`
  - `SITE_URL = 'https://example.com'` in `site.config.ts`
- Shell: POSIX commands (Git Bash on Windows). Run everything from the repository root.
- Branch: `feat/foundation`, created in Task 1 from `main`.
  - Don't push, and don't touch GitHub or Cloudflare settings, before Task 12. That task needs the
    owner.
- Commits:
  - Conventional prefix: `feat:`, `fix:`, `chore:`, `test:`, `docs:` or `ci:`.
  - Every message ends with a blank line and then
    `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - The repo-local committer email is already set to the owner's GitHub noreply address; don't change
    it.
- If a verification fails in a way the plan doesn't predict, use superpowers:systematic-debugging.
  Never weaken a test, a floor or a CSP directive to get to green; stop and report instead.

## Task overview

| # | Task | Main deliverable |
|---|---|---|
| 1 | Scaffold and toolchain | Astro 7 builds with CSP; type-check, Stylelint and Prettier pass; Stylelint rule tests |
| 2 | Environment modes and robots.txt | `resolveSiteMode`, `robotsTxt`, `/robots.txt` |
| 3 | SEO and structured-data builders | `buildSeo`, `canonicalUrl`, JSON-LD helpers |
| 4 | Content collections and placeholder content | Schemas, placeholder profile, case studies, images, CV |
| 5 | Hosting config and end-to-end harness | `wrangler.jsonc`, `_headers`, `security.txt`, Playwright |
| 6 | Design tokens, base layout and 404 | Tokens, layout, SEO tags, skip link; per-page and a11y specs |
| 7 | Case-study pages | Selected work on home, `/work/<slug>`, MDX components |
| 8 | Contact section and copy-email button | Contact links, progressive copy button |
| 9 | Page weight and Lighthouse floors | Weight spec, Lighthouse project |
| 10 | CI and dependency automation | `ci.yml`, `weekly.yml`, Dependabot, lychee |
| 11 | Documentation | `README.md`, `docs/setup.md`, `.env.example` |
| 12 | Launch (with the owner) | Production URL, GitHub repo, Cloudflare, first PR, checklist |

---

### Task 1: Scaffold and toolchain

**Files:**
- Create: `.gitignore`, `.gitattributes`, `.nvmrc`, `package.json`, `pnpm-workspace.yaml`,
  `tsconfig.json`, `site.config.ts`, `astro.config.ts`, `.prettierrc.json`, `.prettierignore`,
  `stylelint.config.js`, `src/pages/index.astro`, `tests/unit/stylelint.test.ts`
- Generated: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `SITE_URL: string` exported from `site.config.ts`
  - scripts `dev`, `build`, `check`, `lint`, `format`, `format:check`, `test`
  - Stylelint config that rejects colour literals outside `src/styles/tokens.css`

- [ ] **Step 1: Create the branch and install pnpm**

```bash
git switch -c feat/foundation
npm install -g pnpm@10.34.5
pnpm --version
```

Expected: `10.34.5`.

- [ ] **Step 2: Write the repository config files**

`.gitignore`:

```
node_modules/
dist/
.astro/
.wrangler/
playwright-report/
test-results/
.env
.env.*
!.env.example
.DS_Store
```

`.gitattributes`:

```
* text=auto eol=lf
*.png binary
*.ico binary
*.jpg binary
*.pdf binary
*.woff2 binary
```

`.nvmrc`:

```
24
```

`package.json`:

```json
{
  "name": "portfolio",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.34.5",
  "engines": {
    "node": ">=24.12.0 <25"
  },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "check": "astro check",
    "lint": "stylelint --allow-empty-input \"src/**/*.{css,astro}\"",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "node --test \"tests/unit/**/*.test.ts\""
  }
}
```

`pnpm-workspace.yaml`:

```yaml
# Supply-chain settings (spec §7). Don't relax them without the owner's approval.
minimumReleaseAge: 10080 # minutes: a version must be 7 days old before it can be installed
strictDepBuilds: true # fail the install when a dependency has an unreviewed build script
engineStrict: true
onlyBuiltDependencies: # reviewed packages allowed to run install scripts (native binaries)
  - esbuild
  - sharp
  - workerd
```

- [ ] **Step 3: Install dependencies**

```bash
pnpm add -w astro@^7.3.0 @astrojs/sitemap@^3.7.0
pnpm add -w -D typescript@~6.0.3 @astrojs/check@^0.9.10 @types/node@^24 prettier@^3.6.0 prettier-plugin-astro@^1.0.1 stylelint@^17 stylelint-config-standard@^40 postcss-html@^2
```

Expected: both finish without errors, and `package.json` now lists them.

If pnpm names a dependency with an unreviewed build script that isn't `esbuild`, `sharp` or `workerd`,
stop and report the package name.

- [ ] **Step 4: Write the TypeScript, site and Astro config**

`tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strictest",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "playwright-report", "test-results"],
  "compilerOptions": {
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true,
    "types": ["node"]
  }
}
```

`site.config.ts`:

```ts
/**
 * The production URL. Canonical URLs, the sitemap and robots.txt are built from it.
 * `https://example.com` is a placeholder until launch (plan Task 12). Cloudflare builds refuse to run
 * while it's still the placeholder (see astro.config.ts).
 */
export const SITE_URL = 'https://example.com';
```

`astro.config.ts`:

```ts
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import { SITE_URL } from './site.config.ts';

// Cloudflare Workers Builds sets WORKERS_CI=1. Refuse to deploy with the placeholder URL.
if (process.env['WORKERS_CI'] === '1' && new URL(SITE_URL).hostname === 'example.com') {
  throw new Error(
    'SITE_URL in site.config.ts is still the placeholder. Set the production URL before deploying.',
  );
}

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'never',
  build: { format: 'file' },
  markdown: { syntaxHighlight: false },
  integrations: [sitemap({ filter: (page) => new URL(page).pathname !== '/404' })],
  security: {
    csp: {
      directives: ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'none'"],
    },
  },
});
```

- [ ] **Step 5: Write the formatter and linter config**

`.prettierrc.json`:

```json
{
  "singleQuote": true,
  "printWidth": 100,
  "plugins": ["prettier-plugin-astro"],
  "overrides": [{ "files": "*.astro", "options": { "parser": "astro" } }]
}
```

`.prettierignore`:

```
dist/
.astro/
.wrangler/
playwright-report/
test-results/
pnpm-lock.yaml
docs/superpowers/
```

`stylelint.config.js`:

```js
/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard'],
  rules: {
    // Colours come from design tokens only (spec §5).
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': [
      'rgb',
      'rgba',
      'hsl',
      'hsla',
      'hwb',
      'lab',
      'lch',
      'oklab',
      'oklch',
      'color',
    ],
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global'] }],
  },
  overrides: [
    { files: ['**/*.astro'], customSyntax: 'postcss-html' },
    {
      files: ['src/styles/tokens.css'],
      rules: { 'color-no-hex': null, 'color-named': null, 'function-disallowed-list': null },
    },
  ],
};
```

- [ ] **Step 6: Write the Stylelint rule test**

`tests/unit/stylelint.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import stylelint from 'stylelint';

async function rulesBroken(code: string, codeFilename: string): Promise<string[]> {
  const { results } = await stylelint.lint({ code, codeFilename });
  return results[0]?.warnings.map((warning) => warning.rule) ?? [];
}

describe('design-token rule (spec §5)', () => {
  it('rejects hex colours in component CSS', async () => {
    assert.ok((await rulesBroken('.a {\n  color: #fff;\n}\n', 'src/styles/global.css')).includes('color-no-hex'));
  });

  it('rejects colour functions in component CSS', async () => {
    const rules = await rulesBroken('.a {\n  color: rgb(0 0 0);\n}\n', 'src/styles/global.css');
    assert.ok(rules.includes('function-disallowed-list'));
  });

  it('rejects named colours in component CSS', async () => {
    assert.ok((await rulesBroken('.a {\n  color: red;\n}\n', 'src/styles/global.css')).includes('color-named'));
  });

  it('checks <style> blocks in .astro files', async () => {
    const code = '<style>\n  .a {\n    color: #fff;\n  }\n</style>\n';
    assert.ok((await rulesBroken(code, 'src/components/Example.astro')).includes('color-no-hex'));
  });

  it('allows tokens', async () => {
    assert.deepEqual(await rulesBroken('.a {\n  color: var(--color-text);\n}\n', 'src/styles/global.css'), []);
  });

  it('allows colour literals in tokens.css', async () => {
    const rules = await rulesBroken(':root {\n  --color-text: #1a1a1a;\n}\n', 'src/styles/tokens.css');
    assert.ok(!rules.includes('color-no-hex'));
  });
});
```

- [ ] **Step 7: Run the Stylelint tests**

Run: `pnpm test`
Expected: 6 passing tests, 0 failures. If any fail, the Stylelint config from Step 5 is wrong; fix the
config, not the test.

- [ ] **Step 8: Write the placeholder home page**

`src/pages/index.astro` (Task 6 replaces it):

```astro
---
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Portfolio</title>
  </head>
  <body>
    <main>
      <h1>Portfolio</h1>
    </main>
  </body>
</html>
```

- [ ] **Step 9: Format, then run every check**

```bash
pnpm format
pnpm format:check
pnpm lint
pnpm check
pnpm build
ls dist
grep -io 'http-equiv="content-security-policy"' dist/index.html
```

Expected:
- `format:check` prints `All matched files use Prettier code style!`
- `lint` exits 0
- `check` reports `0 errors`, `0 warnings`, `0 hints`
- `build` ends with `Complete!`
- `dist` contains `index.html`, `sitemap-index.xml` and `sitemap-0.xml`
- `grep` prints the CSP meta attribute

- [ ] **Step 10: Check the placeholder-URL guard**

Run: `WORKERS_CI=1 pnpm build`
Expected: non-zero exit, and an error containing
`SITE_URL in site.config.ts is still the placeholder`.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Astro 7 project with strict toolchain

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Environment modes and robots.txt

**Files:**
- Create: `src/lib/site-mode.ts`, `src/lib/robots.ts`, `src/lib/mode.ts`, `src/pages/robots.txt.ts`,
  `tests/unit/site-mode.test.ts`, `tests/unit/robots.test.ts`
- Modify: `astro.config.ts` (add the `env` schema)

**Interfaces:**
- Consumes: `site` from `astro.config.ts`
- Produces:
  - `type SiteMode = 'development' | 'preview' | 'production'` (`src/lib/site-mode.ts`)
  - `resolveSiteMode(input: { dev: boolean; branch: string | undefined }): SiteMode`
  - `robotsTxt(input: { mode: SiteMode; sitemapUrl: string }): string` (`src/lib/robots.ts`)
  - `siteMode: SiteMode` and `isProduction: boolean` (`src/lib/mode.ts`, Astro-only; don't import it
    from unit tests)

- [ ] **Step 1: Write the failing tests**

`tests/unit/site-mode.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveSiteMode } from '../../src/lib/site-mode.ts';

describe('resolveSiteMode (spec §8)', () => {
  it('is development under astro dev, whatever the branch', () => {
    assert.equal(resolveSiteMode({ dev: true, branch: undefined }), 'development');
    assert.equal(resolveSiteMode({ dev: true, branch: 'main' }), 'development');
  });

  it('is production for a main-branch build', () => {
    assert.equal(resolveSiteMode({ dev: false, branch: 'main' }), 'production');
  });

  it('defaults to production when no branch is known (CI and local builds)', () => {
    assert.equal(resolveSiteMode({ dev: false, branch: undefined }), 'production');
    assert.equal(resolveSiteMode({ dev: false, branch: '' }), 'production');
  });

  it('is preview for any other branch', () => {
    assert.equal(resolveSiteMode({ dev: false, branch: 'feat/foundation' }), 'preview');
  });
});
```

`tests/unit/robots.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { robotsTxt } from '../../src/lib/robots.ts';

const sitemapUrl = 'https://example.com/sitemap-index.xml';

describe('robotsTxt', () => {
  it('allows crawling and names the sitemap in production', () => {
    assert.equal(
      robotsTxt({ mode: 'production', sitemapUrl }),
      'User-agent: *\nAllow: /\n\nSitemap: https://example.com/sitemap-index.xml\n',
    );
  });

  it('blocks all crawling in preview and development', () => {
    for (const mode of ['preview', 'development'] as const) {
      assert.equal(robotsTxt({ mode, sitemapUrl }), 'User-agent: *\nDisallow: /\n');
    }
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `pnpm test`
Expected: FAIL. Both new files report `ERR_MODULE_NOT_FOUND` for `src/lib/site-mode.ts` and
`src/lib/robots.ts`.

- [ ] **Step 3: Implement the pure helpers**

`src/lib/site-mode.ts`:

```ts
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
```

`src/lib/robots.ts`:

```ts
import type { SiteMode } from './site-mode.ts';

export function robotsTxt(input: { mode: SiteMode; sitemapUrl: string }): string {
  if (input.mode !== 'production') return 'User-agent: *\nDisallow: /\n';
  return `User-agent: *\nAllow: /\n\nSitemap: ${input.sitemapUrl}\n`;
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `pnpm test`
Expected: all tests pass (Stylelint 6, site-mode 4, robots 2).

- [ ] **Step 5: Declare the Cloudflare branch variable and wire up the mode**

In `astro.config.ts`, change the import line to:

```ts
import { defineConfig, envField } from 'astro/config';
```

and add this key inside `defineConfig({ … })`, after `site: SITE_URL,`:

```ts
  env: {
    schema: {
      // Set by Cloudflare Workers Builds; decides production vs preview (spec §8).
      WORKERS_CI_BRANCH: envField.string({ context: 'server', access: 'public', optional: true }),
    },
  },
```

`src/lib/mode.ts`:

```ts
import { WORKERS_CI_BRANCH } from 'astro:env/server';
import { resolveSiteMode } from './site-mode.ts';

export const siteMode = resolveSiteMode({ dev: import.meta.env.DEV, branch: WORKERS_CI_BRANCH });
export const isProduction = siteMode === 'production';
```

`src/pages/robots.txt.ts`:

```ts
import type { APIRoute } from 'astro';
import { siteMode } from '../lib/mode.ts';
import { robotsTxt } from '../lib/robots.ts';

export const GET: APIRoute = ({ site }) => {
  if (!site) throw new Error('`site` must be set in astro.config.ts');
  const body = robotsTxt({ mode: siteMode, sitemapUrl: new URL('sitemap-index.xml', site).href });
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
```

- [ ] **Step 6: Verify both modes in real builds**

```bash
pnpm check
WORKERS_CI_BRANCH=feat/test pnpm build && cat dist/robots.txt
pnpm build && cat dist/robots.txt
```

Expected:
- `check` reports `0 errors`.
- The first `cat` prints `User-agent: *` and `Disallow: /`.
- The second prints `User-agent: *`, `Allow: /`, a blank line, then
  `Sitemap: https://example.com/sitemap-index.xml`.

- [ ] **Step 7: Commit**

```bash
pnpm format
git add -A
git commit -m "feat: add environment modes and robots.txt

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: SEO and structured-data builders

**Files:**
- Create: `src/lib/seo.ts`, `src/lib/structured-data.ts`, `tests/unit/seo.test.ts`,
  `tests/unit/structured-data.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces (`src/lib/seo.ts`):
  - `interface SeoInput { siteUrl: string; siteName: string; headline: string; path: string; title?: string; description: string; image: { url: string; alt: string }; noindex: boolean; type: 'website' | 'article' }`
  - `interface MetaTag { name?: string; property?: string; content: string }`
  - `interface SeoTags { title: string; canonical: string; meta: MetaTag[] }`
  - `canonicalUrl(siteUrl: string, path: string): string`
  - `buildSeo(input: SeoInput): SeoTags`
- Produces (`src/lib/structured-data.ts`):
  - `jsonLd(data: Record<string, unknown>): string`
  - `personJsonLd(input: { name: string; headline: string; url: string; email: string; sameAs: string[] }): string`
  - `creativeWorkJsonLd(input: { title: string; description: string; url: string; image: string; authorName: string; authorUrl: string; keywords: string[] }): string`

- [ ] **Step 1: Write the failing SEO tests**

`tests/unit/seo.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildSeo, canonicalUrl, type SeoInput, type SeoTags } from '../../src/lib/seo.ts';

const home: SeoInput = {
  siteUrl: 'https://example.com/',
  siteName: 'Alex Placeholder',
  headline: 'Product designer',
  path: '/',
  description: 'A placeholder description.',
  image: { url: '/og-default.png', alt: 'Placeholder image' },
  noindex: false,
  type: 'website',
};

function meta(tags: SeoTags, key: string): string | undefined {
  return tags.meta.find((tag) => tag.name === key || tag.property === key)?.content;
}

describe('canonicalUrl', () => {
  it('keeps the slash on the root', () => {
    assert.equal(canonicalUrl('https://example.com/', '/'), 'https://example.com/');
  });

  it('drops trailing slashes, queries and fragments elsewhere', () => {
    assert.equal(
      canonicalUrl('https://example.com/', '/work/sample-project/?ref=x#top'),
      'https://example.com/work/sample-project',
    );
  });
});

describe('buildSeo', () => {
  it('titles the home page "Name — Headline"', () => {
    assert.equal(buildSeo(home).title, 'Alex Placeholder — Product designer');
  });

  it('titles other pages "Page — Name"', () => {
    const tags = buildSeo({ ...home, title: 'Sample Project', path: '/work/sample-project' });
    assert.equal(tags.title, 'Sample Project — Alex Placeholder');
    assert.equal(meta(tags, 'og:title'), 'Sample Project — Alex Placeholder');
  });

  it('uses the absolute canonical URL for og:url', () => {
    const tags = buildSeo({ ...home, path: '/work/sample-project' });
    assert.equal(tags.canonical, 'https://example.com/work/sample-project');
    assert.equal(meta(tags, 'og:url'), 'https://example.com/work/sample-project');
  });

  it('resolves a root-relative image to an absolute og:image', () => {
    const tags = buildSeo(home);
    assert.equal(meta(tags, 'og:image'), 'https://example.com/og-default.png');
    assert.equal(meta(tags, 'og:image:alt'), 'Placeholder image');
  });

  it('adds robots noindex only when asked', () => {
    assert.equal(meta(buildSeo(home), 'robots'), undefined);
    assert.equal(meta(buildSeo({ ...home, noindex: true }), 'robots'), 'noindex, nofollow');
  });

  it('includes the description, type and a large Twitter card', () => {
    const tags = buildSeo({ ...home, type: 'article' });
    assert.equal(meta(tags, 'description'), 'A placeholder description.');
    assert.equal(meta(tags, 'og:description'), 'A placeholder description.');
    assert.equal(meta(tags, 'og:type'), 'article');
    assert.equal(meta(tags, 'og:site_name'), 'Alex Placeholder');
    assert.equal(meta(tags, 'twitter:card'), 'summary_large_image');
  });
});
```

- [ ] **Step 2: Write the failing structured-data tests**

`tests/unit/structured-data.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { creativeWorkJsonLd, jsonLd, personJsonLd } from '../../src/lib/structured-data.ts';

describe('jsonLd', () => {
  it('escapes < so the data can never close its script tag', () => {
    const payload = { name: '</script><script>alert(1)</script>' };
    const out = jsonLd(payload);
    assert.ok(!out.includes('</script>'));
    assert.deepEqual(JSON.parse(out), payload);
  });
});

describe('personJsonLd', () => {
  it('describes the owner as a schema.org Person', () => {
    const data = JSON.parse(
      personJsonLd({
        name: 'Alex Placeholder',
        headline: 'Product designer',
        url: 'https://example.com/',
        email: 'alex@example.com',
        sameAs: ['https://github.com/'],
      }),
    );
    assert.deepEqual(data, {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Alex Placeholder',
      jobTitle: 'Product designer',
      url: 'https://example.com/',
      email: 'mailto:alex@example.com',
      sameAs: ['https://github.com/'],
    });
  });
});

describe('creativeWorkJsonLd', () => {
  it('describes a case study as a CreativeWork by the owner', () => {
    const data = JSON.parse(
      creativeWorkJsonLd({
        title: 'Sample Project',
        description: 'A placeholder.',
        url: 'https://example.com/work/sample-project',
        image: 'https://example.com/_astro/cover.jpg',
        authorName: 'Alex Placeholder',
        authorUrl: 'https://example.com/',
        keywords: ['Design', 'Development'],
      }),
    );
    assert.deepEqual(data, {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: 'Sample Project',
      description: 'A placeholder.',
      url: 'https://example.com/work/sample-project',
      image: 'https://example.com/_astro/cover.jpg',
      keywords: 'Design, Development',
      author: { '@type': 'Person', name: 'Alex Placeholder', url: 'https://example.com/' },
    });
  });
});
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `pnpm test`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/seo.ts` and `src/lib/structured-data.ts`.

- [ ] **Step 4: Implement the builders**

`src/lib/seo.ts`:

```ts
export interface SeoInput {
  siteUrl: string;
  siteName: string;
  headline: string;
  path: string;
  /** Page title; omit on the home page. */
  title?: string;
  description: string;
  /** Absolute or root-relative image URL. */
  image: { url: string; alt: string };
  noindex: boolean;
  type: 'website' | 'article';
}

export interface MetaTag {
  name?: string;
  property?: string;
  content: string;
}

export interface SeoTags {
  title: string;
  canonical: string;
  meta: MetaTag[];
}

/** Absolute URL with no trailing slash (except the root), query or fragment (spec §5). */
export function canonicalUrl(siteUrl: string, path: string): string {
  const url = new URL(path, siteUrl);
  url.search = '';
  url.hash = '';
  if (url.pathname !== '/' && url.pathname.endsWith('/')) url.pathname = url.pathname.slice(0, -1);
  return url.href;
}

export function buildSeo(input: SeoInput): SeoTags {
  const title = input.title
    ? `${input.title} — ${input.siteName}`
    : `${input.siteName} — ${input.headline}`;
  const canonical = canonicalUrl(input.siteUrl, input.path);
  const image = new URL(input.image.url, input.siteUrl).href;
  const meta: MetaTag[] = [
    { name: 'description', content: input.description },
    ...(input.noindex ? [{ name: 'robots', content: 'noindex, nofollow' }] : []),
    { property: 'og:type', content: input.type },
    { property: 'og:site_name', content: input.siteName },
    { property: 'og:title', content: title },
    { property: 'og:description', content: input.description },
    { property: 'og:url', content: canonical },
    { property: 'og:image', content: image },
    { property: 'og:image:alt', content: input.image.alt },
    { name: 'twitter:card', content: 'summary_large_image' },
  ];
  return { title, canonical, meta };
}
```

`src/lib/structured-data.ts`:

```ts
/** Serialises JSON-LD for a `<script type="application/ld+json">` block. */
export function jsonLd(data: Record<string, unknown>): string {
  // Escaping `<` means no value can close the surrounding script tag.
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function personJsonLd(input: {
  name: string;
  headline: string;
  url: string;
  email: string;
  sameAs: string[];
}): string {
  return jsonLd({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: input.name,
    jobTitle: input.headline,
    url: input.url,
    email: `mailto:${input.email}`,
    sameAs: input.sameAs,
  });
}

export function creativeWorkJsonLd(input: {
  title: string;
  description: string;
  url: string;
  image: string;
  authorName: string;
  authorUrl: string;
  keywords: string[];
}): string {
  return jsonLd({
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: input.title,
    description: input.description,
    url: input.url,
    image: input.image,
    keywords: input.keywords.join(', '),
    author: { '@type': 'Person', name: input.authorName, url: input.authorUrl },
  });
}
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `pnpm test && pnpm check`
Expected: every test passes; `check` reports `0 errors`.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add -A
git commit -m "feat: add SEO and structured-data builders

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Content collections and placeholder content

**Files:**
- Create:
  - `src/content.config.ts`, `src/lib/social.ts`, `src/lib/case-studies.ts`, `src/lib/content.ts`
  - `src/content/profile.yaml`
  - `src/content/case-studies/sample-project/index.mdx`, `…/sample-project/cover.png`,
    `…/sample-project/detail.png`
  - `src/content/case-studies/draft-example/index.mdx`, `…/draft-example/cover.png`
  - `public/og-default.png`, `public/favicon.ico`, `public/apple-touch-icon.png`, `public/cv.pdf`
  - `tests/unit/case-studies.test.ts`, `tests/unit/content-rules.test.ts`
- Temporary (run once, then delete): `scripts/placeholders.ts`
- Modify: `astro.config.ts` (add `mdx()`)

**Interfaces:**
- Consumes: `isProduction` from `src/lib/mode.ts`
- Produces:
  - `socialPlatforms`, `type SocialPlatform` and `socialLabels: Record<SocialPlatform, string>`
    (`src/lib/social.ts`)
  - `interface Orderable { data: { title: string; featured: boolean; order: number; draft: boolean } }`
    (`src/lib/case-studies.ts`)
  - `visibleStudies<T extends Orderable>(entries: readonly T[], includeDrafts: boolean): T[]`
  - `featuredStudies<T extends Orderable>(entries: readonly T[]): T[]`
  - Collections:
    - `profile`: a single entry with id `main`. Fields: `name`, `headline`, `intro`, `email`,
      `bookingUrl`, `socials[{ platform, url }]`, `cvUpdated: Date`, `seo{ description, image, imageAlt }`.
    - `caseStudies`: id is the folder name. Fields: `title`, `role`, `timeframe`, `summary`, `cover`,
      `coverAlt`, `tags`, `client?`, `links[{ label, url }]`, `featured`, `order`, `draft`.
  - `getProfile(): Promise<CollectionEntry<'profile'>['data']>` and
    `getCaseStudies(): Promise<CollectionEntry<'caseStudies'>[]>` (`src/lib/content.ts`, Astro-only).
    `getCaseStudies` hides drafts in production.

- [ ] **Step 1: Write the failing ordering tests**

`tests/unit/case-studies.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { featuredStudies, visibleStudies, type Orderable } from '../../src/lib/case-studies.ts';

function study(title: string, order: number, extra: Partial<Orderable['data']> = {}): Orderable {
  return { data: { title, order, featured: false, draft: false, ...extra } };
}

const titles = (entries: Orderable[]) => entries.map((entry) => entry.data.title);

describe('visibleStudies', () => {
  it('hides drafts unless asked to include them', () => {
    const entries = [study('Live', 1), study('Draft', 2, { draft: true })];
    assert.deepEqual(titles(visibleStudies(entries, false)), ['Live']);
    assert.deepEqual(titles(visibleStudies(entries, true)), ['Live', 'Draft']);
  });

  it('sorts by order, then title', () => {
    const entries = [study('Beta', 2), study('Zulu', 1), study('Alpha', 2)];
    assert.deepEqual(titles(visibleStudies(entries, false)), ['Zulu', 'Alpha', 'Beta']);
  });

  it('does not modify its input', () => {
    const entries = [study('B', 2), study('A', 1)];
    visibleStudies(entries, false);
    assert.deepEqual(titles(entries), ['B', 'A']);
  });
});

describe('featuredStudies', () => {
  it('keeps only featured studies, in the given order', () => {
    const entries = [study('One', 1, { featured: true }), study('Two', 2), study('Three', 3, { featured: true })];
    assert.deepEqual(titles(featuredStudies(entries)), ['One', 'Three']);
  });
});
```

- [ ] **Step 2: Write the failing content-rule tests**

`tests/unit/content-rules.test.ts`:

```ts
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = 'src/content/case-studies';
const slugs = readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

describe('case-study content rules (spec §6)', () => {
  it('has at least one case study', () => {
    assert.ok(slugs.length > 0);
  });

  for (const slug of slugs) {
    it(`${slug}: the folder name is lowercase words joined by hyphens`, () => {
      assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    });

    it(`${slug}: the MDX has no import or export statements`, () => {
      const source = readFileSync(join(root, slug, 'index.mdx'), 'utf8');
      assert.doesNotMatch(source, /^\s*(?:import|export)\s/m);
    });
  }
});
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `pnpm test`
Expected: FAIL. `case-studies.test.ts` reports `ERR_MODULE_NOT_FOUND`, and `content-rules.test.ts`
reports `ENOENT` for `src/content/case-studies`.

- [ ] **Step 4: Implement the ordering helpers and social list**

`src/lib/case-studies.ts`:

```ts
export interface Orderable {
  data: { title: string; featured: boolean; order: number; draft: boolean };
}

/** Drafts are hidden unless `includeDrafts`; ordered by `order`, then title (spec §6). */
export function visibleStudies<T extends Orderable>(entries: readonly T[], includeDrafts: boolean): T[] {
  return entries
    .filter((entry) => includeDrafts || !entry.data.draft)
    .toSorted((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title));
}

export function featuredStudies<T extends Orderable>(entries: readonly T[]): T[] {
  return entries.filter((entry) => entry.data.featured);
}
```

`src/lib/social.ts`:

```ts
export const socialPlatforms = [
  'github',
  'linkedin',
  'x',
  'bluesky',
  'dribbble',
  'behance',
  'instagram',
  'youtube',
] as const;

export type SocialPlatform = (typeof socialPlatforms)[number];

export const socialLabels: Record<SocialPlatform, string> = {
  github: 'GitHub',
  linkedin: 'LinkedIn',
  x: 'X',
  bluesky: 'Bluesky',
  dribbble: 'Dribbble',
  behance: 'Behance',
  instagram: 'Instagram',
  youtube: 'YouTube',
};
```

- [ ] **Step 5: Generate the placeholder binaries**

Create `scripts/placeholders.ts`:

```ts
// One-off generator for placeholder images, icons and the CV (plan Task 4). Delete after running.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { deflateSync } from 'node:zlib';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of bytes) c = (crcTable[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function solidPng(width: number, height: number, [r, g, b]: [number, number, number]): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8); // 8-bit RGB, no interlace
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x++) row.set([r, g, b], 1 + x * 3);
  const pixels = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function icoFromPng(png: Buffer, size: number): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size, 0);
  entry.writeUInt8(size, 1);
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12); // image data starts after the 6 + 16 byte headers
  return Buffer.concat([header, entry, png]);
}

function minimalPdf(text: string): Buffer {
  const stream = `BT /F1 24 Tf 72 760 Td (${text}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, 'latin1');
}

function write(path: string, data: Buffer): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
  console.log(`wrote ${path} (${data.length} bytes)`);
}

write('public/og-default.png', solidPng(1200, 630, [64, 64, 64]));
write('public/favicon.ico', icoFromPng(solidPng(32, 32, [26, 26, 26]), 32));
write('public/apple-touch-icon.png', solidPng(180, 180, [26, 26, 26]));
write('public/cv.pdf', minimalPdf('Placeholder CV - replace before launch'));
write('src/content/case-studies/sample-project/cover.png', solidPng(1600, 900, [96, 96, 96]));
write('src/content/case-studies/sample-project/detail.png', solidPng(1600, 1000, [128, 128, 128]));
write('src/content/case-studies/draft-example/cover.png', solidPng(1600, 900, [160, 160, 160]));
```

Run it, then delete it:

```bash
node scripts/placeholders.ts
rm -r scripts
```

Expected: seven `wrote …` lines, and the `scripts/` folder is gone.

- [ ] **Step 6: Write the placeholder content**

`src/content/profile.yaml`:

```yaml
# Placeholder profile. Replace every value with real content (spec §6).
main:
  name: Alex Placeholder
  headline: Product designer and front-end developer
  intro: >-
    Placeholder introduction. This paragraph will be replaced with the owner's own words when the real
    content arrives.
  email: alex@example.com
  bookingUrl: https://cal.com/
  socials:
    - platform: github
      url: https://github.com/
    - platform: linkedin
      url: https://www.linkedin.com/
  cvUpdated: 2026-09-24
  seo:
    description: Placeholder portfolio of Alex Placeholder, a product designer and front-end developer.
    image: /og-default.png
    imageAlt: Placeholder social sharing image
```

`src/content/case-studies/sample-project/index.mdx`:

```mdx
---
title: Sample Project
role: Design and front-end development
timeframe: 2025 – 2026
summary: Placeholder case study that uses every schema field until real selected work arrives.
cover: ./cover.png
coverAlt: Grey placeholder cover image
tags: [Placeholder, Design, Development]
client: Example Client
links:
  - label: Live site
    url: https://example.com/
featured: true
order: 1
---

## The problem

Placeholder copy describing the problem this project solved.

<Callout>
  Placeholder callout highlighting a key decision.
</Callout>

## The outcome

<Figure caption="Placeholder detail image">

![Grey placeholder detail image](./detail.png)

</Figure>

Placeholder copy describing the outcome.
```

`src/content/case-studies/draft-example/index.mdx`:

```mdx
---
title: Draft Example
role: Placeholder role
timeframe: '2026'
summary: Placeholder draft that must never appear in production.
cover: ./cover.png
coverAlt: Grey placeholder cover image
draft: true
---

Placeholder draft body.
```

- [ ] **Step 7: Define the collections and content helpers, and enable MDX**

```bash
pnpm add -w @astrojs/mdx@^8.0.1
```

In `astro.config.ts`, add `import mdx from '@astrojs/mdx';` as the first import, and change the
`integrations` line to:

```ts
  integrations: [mdx(), sitemap({ filter: (page) => new URL(page).pathname !== '/404' })],
```

`src/content.config.ts`:

```ts
import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { socialPlatforms } from './lib/social.ts';

const httpsUrl = z
  .url()
  .refine((value) => value.startsWith('https://'), { message: 'Must be an https:// URL' });

const profile = defineCollection({
  loader: file('src/content/profile.yaml'),
  schema: z.object({
    name: z.string().min(1),
    headline: z.string().min(1),
    intro: z.string().min(1),
    email: z.email(),
    bookingUrl: httpsUrl,
    socials: z.array(z.object({ platform: z.enum(socialPlatforms), url: httpsUrl })),
    cvUpdated: z.coerce.date(),
    seo: z.object({
      description: z.string().min(1).max(160),
      image: z
        .string()
        .regex(/^\/[\w./-]+\.(?:png|jpg)$/, 'A root-relative path to a PNG or JPEG in public/'),
      imageAlt: z.string().min(1),
    }),
  }),
});

const caseStudies = defineCollection({
  loader: glob({
    pattern: '*/index.mdx',
    base: './src/content/case-studies',
    // The folder name is the slug (spec §6).
    generateId: ({ entry }) => entry.split('/')[0] ?? entry,
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),
      role: z.string().min(1),
      timeframe: z.string().min(1),
      summary: z.string().min(1).max(160),
      cover: image(),
      coverAlt: z.string().min(1),
      tags: z.array(z.string().min(1)).default([]),
      client: z.string().min(1).optional(),
      links: z.array(z.object({ label: z.string().min(1), url: httpsUrl })).default([]),
      featured: z.boolean().default(false),
      order: z.number().int().default(100),
      draft: z.boolean().default(false),
    }),
});

export const collections = { profile, caseStudies };
```

`src/lib/content.ts`:

```ts
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { visibleStudies } from './case-studies.ts';
import { isProduction } from './mode.ts';

export async function getProfile(): Promise<CollectionEntry<'profile'>['data']> {
  const entry = await getEntry('profile', 'main');
  if (!entry) throw new Error('src/content/profile.yaml must define a `main` entry');
  return entry.data;
}

/** Case studies in display order; drafts only outside production (spec §6, §8). */
export async function getCaseStudies(): Promise<CollectionEntry<'caseStudies'>[]> {
  return visibleStudies(await getCollection('caseStudies'), !isProduction);
}
```

- [ ] **Step 8: Run the tests and the build**

```bash
pnpm test
pnpm check
pnpm build
```

Expected: every unit test passes, `check` reports `0 errors`, and `build` completes. The build
validates both collections even though no page uses them yet.

- [ ] **Step 9: Prove that invalid content fails the build**

```bash
sed -i 's/^coverAlt: Grey placeholder cover image$/coverAlt: ""/' src/content/case-studies/sample-project/index.mdx
pnpm build; echo "exit code: $?"
sed -i 's/^coverAlt: ""$/coverAlt: Grey placeholder cover image/' src/content/case-studies/sample-project/index.mdx
pnpm build
```

Expected:
- The first build fails with a content error that names `coverAlt`, and prints a non-zero exit code.
- The second build completes.
- `git diff src/content` is empty for that file afterwards.

- [ ] **Step 10: Commit**

```bash
pnpm format
git add -A
git commit -m "feat: add content collections with placeholder content

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Hosting config and end-to-end harness

**Files:**
- Create: `wrangler.jsonc`, `public/_headers`, `public/.well-known/security.txt`, `playwright.config.ts`,
  `tests/support/sitemap.ts`, `tests/support/site.ts`, `tests/support/headers.ts`,
  `tests/unit/sitemap.test.ts`, `tests/unit/security-txt.test.ts`, `tests/e2e/headers.spec.ts`
- Modify: `package.json` (scripts `serve` and `test:e2e`; dev deps `wrangler`, `@playwright/test`,
  `@axe-core/playwright`)

**Interfaces:**
- Consumes: `SITE_URL` from `site.config.ts`
- Produces:
  - `sitemapPaths(xml: string): string[]` (`tests/support/sitemap.ts`)
  - `BASE_URL = 'http://127.0.0.1:8787'`, `SITE_URL`, `SERVER_ONLY: string` and
    `builtPagePaths(): string[]` (`tests/support/site.ts`)
  - `EXPECTED_HEADERS: Record<string, string>` (`tests/support/headers.ts`)
  - Playwright projects `chromium`, `webkit` and `firefox`, running `tests/e2e`
  - scripts `serve` and `test:e2e`

- [ ] **Step 1: Install the test and hosting tools**

```bash
pnpm add -w -D wrangler@^4 @playwright/test@^1.62 @axe-core/playwright@^4
pnpm exec playwright install chromium webkit firefox
```

Expected: both succeed. If `workerd` or another package fails `strictDepBuilds`, follow the Global
Constraints and stop.

- [ ] **Step 2: Write the failing unit tests**

`tests/unit/sitemap.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sitemapPaths } from '../support/sitemap.ts';

describe('sitemapPaths', () => {
  it('returns the pathname of every <loc>, in order', () => {
    const xml =
      '<urlset><url><loc>https://example.com/</loc></url>' +
      '<url><loc>https://example.com/work/sample-project</loc></url></urlset>';
    assert.deepEqual(sitemapPaths(xml), ['/', '/work/sample-project']);
  });

  it('returns an empty list for a sitemap with no URLs', () => {
    assert.deepEqual(sitemapPaths('<urlset></urlset>'), []);
  });
});
```

`tests/unit/security-txt.test.ts`:

```ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const text = readFileSync('public/.well-known/security.txt', 'utf8');
const field = (name: string) => text.match(new RegExp(`^${name}: (.+)$`, 'm'))?.[1];
const DAY = 86_400_000;

describe('security.txt (RFC 9116, spec §7)', () => {
  it('has a mailto: Contact', () => {
    assert.match(field('Contact') ?? '', /^mailto:\S+@\S+$/);
  });

  it('expires more than 30 days and less than a year from now', () => {
    const days = (new Date(field('Expires') ?? '').getTime() - Date.now()) / DAY;
    assert.ok(days > 30, `Expires is ${Math.floor(days)} days away: renew it (README, "Renewing security.txt")`);
    assert.ok(days < 366, 'Expires must be less than a year away');
  });
});
```

- [ ] **Step 3: Run the unit tests to see them fail**

Run: `pnpm test`
Expected: FAIL. `sitemap.test.ts` reports `ERR_MODULE_NOT_FOUND`, and `security-txt.test.ts` reports
`ENOENT`.

- [ ] **Step 4: Implement the helpers and security.txt**

`tests/support/sitemap.ts`:

```ts
/** Pathnames of every <loc> in a sitemap, in document order. */
export function sitemapPaths(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].flatMap((match) =>
    match[1] ? [new URL(match[1]).pathname] : [],
  );
}
```

`public/.well-known/security.txt`:

```
Contact: mailto:alex@example.com
Expires: 2027-09-01T00:00:00.000Z
Preferred-Languages: en
```

Run: `pnpm test`
Expected: every unit test passes.

- [ ] **Step 5: Write the shared test settings and the failing headers spec**

`tests/support/site.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs';
import { SITE_URL } from '../../site.config.ts';
import { sitemapPaths } from './sitemap.ts';

export { SITE_URL };
export const BASE_URL = 'http://127.0.0.1:8787';
export const SERVER_ONLY = 'Server behaviour is the same in every browser, so this runs in Chromium only';

const SITEMAP = 'dist/sitemap-0.xml';

/** Every production page, read from the built sitemap. */
export function builtPagePaths(): string[] {
  if (!existsSync(SITEMAP)) {
    throw new Error(`${SITEMAP} not found. Run \`pnpm build\` before the Playwright tests.`);
  }
  return sitemapPaths(readFileSync(SITEMAP, 'utf8'));
}
```

`tests/support/headers.ts`:

```ts
/** Response headers every page must carry (spec §7). */
export const EXPECTED_HEADERS: Record<string, string> = {
  'content-security-policy': "frame-ancestors 'none'",
  'strict-transport-security': 'max-age=63072000; includeSubDomains',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy':
    'accelerometer=(), browsing-topics=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'x-frame-options': 'DENY',
};
```

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';
import { BASE_URL } from './tests/support/site.ts';

const CI = Boolean(process.env['CI']);

export default defineConfig({
  testDir: 'tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['list']] : 'list',
  use: { baseURL: BASE_URL },
  webServer: {
    command: 'pnpm serve',
    url: BASE_URL,
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', testDir: 'tests/e2e', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', testDir: 'tests/e2e', use: { ...devices['Desktop Safari'] } },
    { name: 'firefox', testDir: 'tests/e2e', use: { ...devices['Desktop Firefox'] } },
  ],
});
```

Add to the `scripts` in `package.json`:

```json
    "serve": "wrangler dev --port 8787 --ip 127.0.0.1 --show-interactive-dev-session=false",
    "test:e2e": "playwright test --project=chromium --project=webkit --project=firefox"
```

`tests/e2e/headers.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { EXPECTED_HEADERS } from '../support/headers.ts';
import { builtPagePaths, SERVER_ONLY } from '../support/site.ts';

// Every page in the sitemap. The 404 response is checked in site.spec.ts (Task 6).
for (const path of builtPagePaths()) {
  test(`${path} is served with every security header`, async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', SERVER_ONLY);
    const headers = (await request.get(path)).headers();
    for (const [name, value] of Object.entries(EXPECTED_HEADERS)) {
      expect(headers[name], name).toBe(value);
    }
  });
}

test('security.txt is served', async ({ request, browserName }) => {
  test.skip(browserName !== 'chromium', SERVER_ONLY);
  const response = await request.get('/.well-known/security.txt');
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain('Contact: mailto:');
});
```

- [ ] **Step 6: Run the headers spec to see it fail**

Run: `pnpm build && pnpm test:e2e`
Expected: FAIL. The `webServer` can't start because `wrangler.jsonc` doesn't exist yet, and Playwright
reports the `pnpm serve` error.

- [ ] **Step 7: Add the hosting config**

`wrangler.jsonc`:

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "portfolio",
  "compatibility_date": "2026-09-15",
  // Static assets only: no Worker script (spec §8).
  "assets": {
    "directory": "./dist",
    "not_found_handling": "404-page",
    "html_handling": "drop-trailing-slash",
  },
}
```

`public/_headers`:

```
/*
  Content-Security-Policy: frame-ancestors 'none'
  Strict-Transport-Security: max-age=63072000; includeSubDomains
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: accelerometer=(), browsing-topics=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  X-Frame-Options: DENY

/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```

- [ ] **Step 8: Run the headers spec to see it pass**

Run: `pnpm build && pnpm test:e2e`
Expected: 2 passed (headers on `/`, and `security.txt`), 4 skipped (the WebKit and Firefox runs of
those server-only tests).

If the header test fails because **none** of the custom headers are present, `wrangler dev` isn't
applying `_headers` locally. Stop and report. The spec §9 fallback moves header assertions to the
Cloudflare preview in Task 12. If some headers arrive joined with a Cloudflare default (for example
`nosniff, nosniff`), report the exact values too; don't edit `EXPECTED_HEADERS` to match.

- [ ] **Step 9: Commit**

```bash
pnpm format
pnpm check
git add -A
git commit -m "feat: add Cloudflare hosting config, security headers and Playwright harness

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Design tokens, base layout and 404

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `src/components/Seo.astro`,
  `src/components/SiteHeader.astro`, `src/components/SiteFooter.astro`, `src/layouts/Base.astro`,
  `src/components/sections/Intro.astro`, `src/pages/404.astro`, `public/favicon.svg`,
  `tests/e2e/pages.spec.ts`, `tests/e2e/a11y.spec.ts`, `tests/e2e/site.spec.ts`
- Modify: `src/pages/index.astro` (replace the placeholder)

**Interfaces:**
- Consumes:
  - `buildSeo`, `SeoInput` (Task 3)
  - `personJsonLd` (Task 3)
  - `getProfile` (Task 4)
  - `isProduction` (Task 2)
  - `builtPagePaths`, `SITE_URL`, `SERVER_ONLY`, `EXPECTED_HEADERS` (Task 5)
- Produces:
  - `Base.astro` props: `{ title?: string; description?: string; image?: { url: string; alt: string }; type?: 'website' | 'article'; structuredData?: string }`
  - The page has `<main id="main" tabindex="-1">`, a skip link "Skip to content", and the classes
    `.container` and `.visually-hidden`.
  - `Intro.astro` props: `{ name: string; headline: string; intro: string }`

- [ ] **Step 1: Write the failing page specs**

`tests/e2e/pages.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { builtPagePaths, SITE_URL } from '../support/site.ts';

for (const path of builtPagePaths()) {
  test.describe(`page ${path}`, () => {
    test('loads without console errors or CSP violations', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript(() => {
        const violations: string[] = [];
        Object.defineProperty(window, '__cspViolations', { value: violations });
        document.addEventListener('securitypolicyviolation', (event) => {
          violations.push(`${event.violatedDirective} ${event.blockedURI}`);
        });
      });
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await page.waitForLoadState('load');
      const violations = await page.evaluate(
        () => (window as unknown as { __cspViolations: string[] }).__cspViolations,
      );
      expect(violations).toEqual([]);
      expect(errors).toEqual([]);
    });

    test('has one h1 and complete SEO metadata', async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      expect(await page.title()).toMatch(/ — /);
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description?.length ?? 0).toBeGreaterThan(0);
      expect(description?.length ?? 0).toBeLessThanOrEqual(160);
      const canonical = path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`;
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical);
      for (const property of ['og:title', 'og:description', 'og:url', 'og:image', 'og:image:alt']) {
        await expect(page.locator(`meta[property="${property}"]`)).toHaveCount(1);
      }
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
      // The production build must stay indexable (spec §8).
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    });

    test('does not scroll sideways at 320px', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
}
```

`tests/e2e/a11y.spec.ts`:

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { builtPagePaths } from '../support/site.ts';

const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const paths = [...builtPagePaths(), '/does-not-exist'];

for (const path of paths) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`${path} has no WCAG 2.2 AA violations in ${colorScheme} mode`, async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'axe results do not depend on the browser engine');
      await page.emulateMedia({ colorScheme });
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
      expect(results.violations).toEqual([]);
    });
  }
}
```

`tests/e2e/site.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { EXPECTED_HEADERS } from '../support/headers.ts';
import { SERVER_ONLY, SITE_URL } from '../support/site.ts';

test('an unknown path returns the 404 page with a 404 status and every security header', async ({ page }) => {
  const response = await page.goto('/does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
  const headers = response?.headers() ?? {};
  for (const [name, value] of Object.entries(EXPECTED_HEADERS)) {
    expect(headers[name], name).toBe(value);
  }
});

test('robots.txt allows crawling in production and names the sitemap', async ({ request, browserName }) => {
  test.skip(browserName !== 'chromium', SERVER_ONLY);
  const text = await (await request.get('/robots.txt')).text();
  expect(text).toBe(`User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap-index.xml\n`);
});

test('the skip link comes first and moves focus to main', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit does not move focus to links with Tab by default');
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('Tab reaches every link and button on the home page', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit does not move focus to links with Tab by default');
  await page.goto('/');
  const count = await page.locator('a[href]:visible, button:visible').count();
  const reached = new Set<number>();
  for (let i = 0; i < count; i++) {
    await page.keyboard.press('Tab');
    reached.add(
      await page.evaluate(() =>
        [...document.querySelectorAll('a[href], button')].indexOf(document.activeElement as Element),
      ),
    );
  }
  expect(reached.has(-1)).toBe(false);
  expect(reached.size).toBe(count);
});
```

- [ ] **Step 2: Run the specs to see them fail**

Run: `pnpm build && pnpm test:e2e`
Expected: FAIL against the Task 1 placeholder page:
- no canonical, description or Open Graph tags
- no skip link
- `/does-not-exist` has no "Page not found" heading

The headers tests from Task 5 still pass.

- [ ] **Step 3: Write the design tokens and global styles**

`src/styles/tokens.css`:

```css
/*
 * Design tokens (spec §5). Placeholder values: neutral greys and system fonts that meet WCAG AA.
 * The content & design spec replaces these values. Components use only these variables.
 */
:root {
  color-scheme: light dark;

  /* Colour roles */
  --color-bg: #fff;
  --color-surface: #f4f4f4;
  --color-text: #1a1a1a;
  --color-text-muted: #595959;
  --color-accent: #1a1a1a;
  --color-border: #d4d4d4;
  --color-focus: #1a1a1a;

  /* Type */
  --font-sans: system-ui, -apple-system, 'Segoe UI', roboto, 'Helvetica Neue', arial, sans-serif;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.25rem;
  --text-xl: clamp(1.5rem, 1.25rem + 1.25vw, 2rem);
  --text-2xl: clamp(2rem, 1.5rem + 2.5vw, 3rem);
  --leading-tight: 1.2;
  --leading-normal: 1.6;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;

  /* Shape */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;

  /* Motion */
  --duration-fast: 150ms;
  --duration-base: 250ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);

  /* Layout */
  --page-max-width: 72rem;
  --measure: 65ch;
  --gutter: clamp(1rem, 4vw, 2rem);
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #121212;
    --color-surface: #1e1e1e;
    --color-text: #ededed;
    --color-text-muted: #a3a3a3;
    --color-accent: #ededed;
    --color-border: #3a3a3a;
    --color-focus: #ededed;
  }
}
```

`src/styles/global.css`:

```css
/* Reset and base styles (spec §5). Every value comes from tokens.css. */
*,
*::before,
*::after {
  box-sizing: border-box;
}

* {
  margin: 0;
}

body {
  min-height: 100vh;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
}

img,
svg {
  display: block;
  max-width: 100%;
  height: auto;
}

h1,
h2,
h3 {
  line-height: var(--leading-tight);
  text-wrap: balance;
}

p {
  max-width: var(--measure);
  text-wrap: pretty;
}

a {
  color: var(--color-accent);
  text-decoration-thickness: 0.08em;
  text-underline-offset: 0.2em;
}

:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 3px;
}

.container {
  width: min(100% - 2 * var(--gutter), var(--page-max-width));
  margin-inline: auto;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.skip-link {
  position: absolute;
  inset-block-start: var(--space-4);
  inset-inline-start: var(--space-4);
  padding: var(--space-2) var(--space-4);
  border: 2px solid var(--color-focus);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  transform: translateY(-200%);
}

.skip-link:focus {
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4: Write the layout components**

`src/components/Seo.astro`:

```astro
---
import { buildSeo, type SeoInput } from '../lib/seo.ts';

type Props = Omit<SeoInput, 'siteUrl'> & { structuredData?: string };

const { structuredData, ...input } = Astro.props;
if (!Astro.site) throw new Error('`site` must be set in astro.config.ts');
const tags = buildSeo({ ...input, siteUrl: Astro.site.href });
---

<title>{tags.title}</title>
<link rel="canonical" href={tags.canonical} />
{tags.meta.map((tag) => <meta name={tag.name} property={tag.property} content={tag.content} />)}
{structuredData && <script type="application/ld+json" set:html={structuredData}></script>}
```

`src/components/SiteHeader.astro`:

```astro
---
interface Props {
  name: string;
}

const { name } = Astro.props;
const nav = [
  { href: '/#work', label: 'Work' },
  { href: '/#contact', label: 'Contact' },
];
---

<header class="site-header">
  <div class="container inner">
    <a class="home" href="/">{name}</a>
    <nav aria-label="Main">
      <ul>
        {
          nav.map((item) => (
            <li>
              <a href={item.href}>{item.label}</a>
            </li>
          ))
        }
      </ul>
    </nav>
  </div>
</header>

<style>
  .inner {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    align-items: center;
    justify-content: space-between;
    padding-block: var(--space-6);
  }

  .home {
    color: var(--color-text);
    font-weight: 600;
    text-decoration: none;
  }

  ul {
    display: flex;
    gap: var(--space-4);
    padding: 0;
    list-style: none;
  }
</style>
```

`src/components/SiteFooter.astro`:

```astro
---
interface Props {
  name: string;
}

const { name } = Astro.props;
const year = new Date().getFullYear();
---

<footer class="site-footer">
  <div class="container inner">
    <p>© {year} {name}</p>
  </div>
</footer>

<style>
  .inner {
    padding-block: var(--space-8);
    border-top: 1px solid var(--color-border);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }
</style>
```

`src/layouts/Base.astro`:

```astro
---
import '../styles/tokens.css';
import '../styles/global.css';
import Seo from '../components/Seo.astro';
import SiteFooter from '../components/SiteFooter.astro';
import SiteHeader from '../components/SiteHeader.astro';
import { getProfile } from '../lib/content.ts';
import { isProduction } from '../lib/mode.ts';

interface Props {
  title?: string;
  description?: string;
  image?: { url: string; alt: string };
  type?: 'website' | 'article';
  structuredData?: string;
}

const { title, description, image, type = 'website', structuredData } = Astro.props;
const profile = await getProfile();
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/favicon.ico" sizes="32x32" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <Seo
      {...title ? { title } : {}}
      siteName={profile.name}
      headline={profile.headline}
      path={Astro.url.pathname}
      description={description ?? profile.seo.description}
      image={image ?? { url: profile.seo.image, alt: profile.seo.imageAlt }}
      noindex={!isProduction}
      type={type}
      {...structuredData ? { structuredData } : {}}
    />
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <SiteHeader name={profile.name} />
    <main id="main" tabindex="-1">
      <slot />
    </main>
    <SiteFooter name={profile.name} />
  </body>
</html>
```

`src/components/sections/Intro.astro`:

```astro
---
interface Props {
  name: string;
  headline: string;
  intro: string;
}

const { name, headline, intro } = Astro.props;
---

<section class="container intro" aria-labelledby="intro-heading">
  <h1 id="intro-heading">{name}</h1>
  <p class="headline">{headline}</p>
  <p>{intro}</p>
</section>

<style>
  .intro {
    display: grid;
    gap: var(--space-4);
    padding-block: var(--space-16) var(--space-12);
  }

  h1 {
    font-size: var(--text-2xl);
  }

  .headline {
    color: var(--color-text-muted);
    font-size: var(--text-lg);
  }
</style>
```

- [ ] **Step 5: Write the pages and the SVG favicon**

`src/pages/index.astro` (replaces the Task 1 placeholder):

```astro
---
import Intro from '../components/sections/Intro.astro';
import Base from '../layouts/Base.astro';
import { getProfile } from '../lib/content.ts';
import { personJsonLd } from '../lib/structured-data.ts';

const profile = await getProfile();
if (!Astro.site) throw new Error('`site` must be set in astro.config.ts');
const structuredData = personJsonLd({
  name: profile.name,
  headline: profile.headline,
  url: Astro.site.href,
  email: profile.email,
  sameAs: profile.socials.map((social) => social.url),
});
---

<Base structuredData={structuredData}>
  <Intro name={profile.name} headline={profile.headline} intro={profile.intro} />
</Base>
```

`src/pages/404.astro`:

```astro
---
import Base from '../layouts/Base.astro';
---

<Base title="Page not found" description="The page you were looking for doesn't exist.">
  <section class="container not-found">
    <h1>Page not found</h1>
    <p>The page you were looking for doesn't exist or has moved.</p>
    <p><a href="/">Go to the home page</a></p>
  </section>
</Base>

<style>
  .not-found {
    display: grid;
    gap: var(--space-4);
    padding-block: var(--space-16);
  }
</style>
```

`public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#1a1a1a"/><text x="16" y="21" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#fff" text-anchor="middle">AP</text></svg>
```

- [ ] **Step 6: Lint, type-check and run the specs to see them pass**

```bash
pnpm exec stylelint --fix "src/**/*.{css,astro}"
pnpm lint
pnpm check
pnpm test
pnpm build && pnpm test:e2e
```

Expected:
- `lint` exits 0. `stylelint --fix` may only reorder or reformat; it must not add colour literals.
- `check` reports `0 errors`.
- Every unit test passes.
- Every e2e test passes, apart from tests skipped for their browser (server-only and axe tests outside
  Chromium, keyboard tests in WebKit).

- [ ] **Step 7: Commit**

```bash
pnpm format
git add -A
git commit -m "feat: add design tokens, base layout, SEO tags and 404 page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Case-study pages

**Files:**
- Create: `src/components/mdx/Figure.astro`, `src/components/mdx/Callout.astro`,
  `src/components/mdx/index.ts`, `src/components/CaseStudyCard.astro`,
  `src/components/sections/SelectedWork.astro`, `src/layouts/CaseStudy.astro`,
  `src/pages/work/[slug].astro`, `tests/e2e/work.spec.ts`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes:
  - `getCaseStudies`, `getProfile` (Task 4)
  - `featuredStudies` (Task 4)
  - `canonicalUrl`, `creativeWorkJsonLd` (Task 3)
  - `Base.astro` (Task 6)
  - `builtPagePaths`, `SERVER_ONLY` (Task 5)
- Produces:
  - `mdxComponents = { Callout, Figure }` (`src/components/mdx/index.ts`)
  - Home section `<section id="work" aria-labelledby="work-heading">` with heading "Selected work"
  - Route `/work/<slug>`

- [ ] **Step 1: Write the failing spec**

`tests/e2e/work.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { builtPagePaths, SERVER_ONLY } from '../support/site.ts';

test('the home page links to each featured case study', async ({ page }) => {
  await page.goto('/');
  const work = page.getByRole('region', { name: 'Selected work' });
  await work.getByRole('link', { name: 'Sample Project' }).click();
  await expect(page).toHaveURL(/\/work\/sample-project$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Sample Project' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('region', { name: 'Selected work' })).toBeVisible();
});

test('a case study shows its details and MDX components', async ({ page }) => {
  await page.goto('/work/sample-project');
  await expect(page.getByText('Design and front-end development')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Grey placeholder cover image' })).toBeVisible();
  await expect(page.locator('figure figcaption')).toHaveText('Placeholder detail image');
  await expect(page.getByRole('img', { name: 'Grey placeholder detail image' })).toBeVisible();
  await expect(page.locator('aside.callout')).toContainText('Placeholder callout');
  await expect(page.getByRole('link', { name: 'Live site' })).toHaveAttribute('href', 'https://example.com/');
});

test('drafts are not published in production', async ({ request, browserName }) => {
  test.skip(browserName !== 'chromium', SERVER_ONLY);
  expect(builtPagePaths()).toContain('/work/sample-project');
  expect(builtPagePaths()).not.toContain('/work/draft-example');
  expect((await request.get('/work/draft-example')).status()).toBe(404);
});

test('a trailing slash redirects to the canonical URL', async ({ request, browserName }) => {
  test.skip(browserName !== 'chromium', SERVER_ONLY);
  const response = await request.get('/work/sample-project/', { maxRedirects: 0 });
  expect([301, 307, 308]).toContain(response.status());
  expect(response.headers()['location']).toMatch(/\/work\/sample-project$/);
});

test('build assets are served from /_astro with a one-year cache', async ({ page, request, browserName }) => {
  test.skip(browserName !== 'chromium', SERVER_ONLY);
  await page.goto('/work/sample-project');
  const src = await page.getByRole('img', { name: 'Grey placeholder cover image' }).getAttribute('src');
  expect(src).toMatch(/^\/_astro\//);
  const response = await request.get(src ?? '');
  expect(response.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
});
```

- [ ] **Step 2: Run the spec to see it fail**

Run: `pnpm build && pnpm exec playwright test tests/e2e/work.spec.ts --project=chromium`
Expected: FAIL. There's no "Selected work" region, and `/work/sample-project` returns 404.

- [ ] **Step 3: Write the MDX components**

`src/components/mdx/Figure.astro`:

```astro
---
interface Props {
  caption: string;
}

const { caption } = Astro.props;
---

<figure class="figure">
  <slot />
  <figcaption>{caption}</figcaption>
</figure>

<style>
  .figure {
    display: grid;
    gap: var(--space-2);
    margin-block: var(--space-8);
  }

  figcaption {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }
</style>
```

`src/components/mdx/Callout.astro`:

```astro
<aside class="callout">
  <slot />
</aside>

<style>
  .callout {
    margin-block: var(--space-6);
    padding: var(--space-4) var(--space-6);
    border-inline-start: 4px solid var(--color-accent);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
  }
</style>
```

`src/components/mdx/index.ts`:

```ts
import Callout from './Callout.astro';
import Figure from './Figure.astro';

/** The only components case-study MDX may use (spec §6). */
export const mdxComponents = { Callout, Figure };
```

- [ ] **Step 4: Write the card, the section and the case-study layout**

`src/components/CaseStudyCard.astro`:

```astro
---
import type { ImageMetadata } from 'astro';
import { Image } from 'astro:assets';

interface Props {
  href: string;
  title: string;
  summary: string;
  cover: ImageMetadata;
  coverAlt: string;
  tags: string[];
}

const { href, title, summary, cover, coverAlt, tags } = Astro.props;
---

<article class="card">
  <Image
    src={cover}
    alt={coverAlt}
    widths={[480, 960]}
    sizes="(min-width: 48rem) 50vw, 100vw"
    loading="lazy"
  />
  <h3><a href={href}>{title}</a></h3>
  <p>{summary}</p>
  {
    tags.length > 0 && (
      <ul class="tags" aria-label="Tags">
        {tags.map((tag) => (
          <li>{tag}</li>
        ))}
      </ul>
    )
  }
</article>

<style>
  .card {
    display: grid;
    gap: var(--space-3);
  }

  img {
    border-radius: var(--radius-md);
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    padding: 0;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    list-style: none;
  }
</style>
```

`src/components/sections/SelectedWork.astro`:

```astro
---
import type { CollectionEntry } from 'astro:content';
import CaseStudyCard from '../CaseStudyCard.astro';

interface Props {
  studies: CollectionEntry<'caseStudies'>[];
}

const { studies } = Astro.props;
---

<section id="work" class="container work" aria-labelledby="work-heading">
  <h2 id="work-heading">Selected work</h2>
  <ul class="grid">
    {
      studies.map((study) => (
        <li>
          <CaseStudyCard
            href={`/work/${study.id}`}
            title={study.data.title}
            summary={study.data.summary}
            cover={study.data.cover}
            coverAlt={study.data.coverAlt}
            tags={study.data.tags}
          />
        </li>
      ))
    }
  </ul>
</section>

<style>
  .work {
    display: grid;
    gap: var(--space-6);
    padding-block: var(--space-12);
  }

  h2 {
    font-size: var(--text-xl);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
    gap: var(--space-8);
    padding: 0;
    list-style: none;
  }
</style>
```

`src/layouts/CaseStudy.astro`:

```astro
---
import { Image } from 'astro:assets';
import type { CollectionEntry } from 'astro:content';
import Base from './Base.astro';

interface Props {
  study: CollectionEntry<'caseStudies'>;
  ogImageUrl: string;
  structuredData: string;
}

const { study, ogImageUrl, structuredData } = Astro.props;
const { title, summary, role, timeframe, client, tags, links, cover, coverAlt } = study.data;
---

<Base
  title={title}
  description={summary}
  image={{ url: ogImageUrl, alt: coverAlt }}
  type="article"
  structuredData={structuredData}
>
  <article class="container case-study">
    <header class="header">
      <p><a href="/#work">All work</a></p>
      <h1>{title}</h1>
      <p class="summary">{summary}</p>
      <dl class="facts">
        <div>
          <dt>Role</dt>
          <dd>{role}</dd>
        </div>
        <div>
          <dt>Timeframe</dt>
          <dd>{timeframe}</dd>
        </div>
        {
          client && (
            <div>
              <dt>Client</dt>
              <dd>{client}</dd>
            </div>
          )
        }
      </dl>
      {
        tags.length > 0 && (
          <ul class="tags" aria-label="Tags">
            {tags.map((tag) => (
              <li>{tag}</li>
            ))}
          </ul>
        )
      }
    </header>
    <Image
      class="cover"
      src={cover}
      alt={coverAlt}
      widths={[640, 1280, 1600]}
      sizes="(min-width: 72rem) 72rem, 100vw"
      loading="eager"
      fetchpriority="high"
    />
    <div class="body">
      <slot />
    </div>
    {
      links.length > 0 && (
        <section aria-labelledby="links-heading">
          <h2 id="links-heading">Links</h2>
          <ul>
            {links.map((link) => (
              <li>
                <a href={link.url}>{link.label}</a>
              </li>
            ))}
          </ul>
        </section>
      )
    }
  </article>
</Base>

<style>
  .case-study {
    display: grid;
    gap: var(--space-8);
    padding-block: var(--space-12);
  }

  .header {
    display: grid;
    gap: var(--space-4);
  }

  h1 {
    font-size: var(--text-2xl);
  }

  .summary {
    color: var(--color-text-muted);
    font-size: var(--text-lg);
  }

  .facts {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-6);
  }

  dt {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  dd {
    margin: 0;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    padding: 0;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    list-style: none;
  }

  .cover {
    border-radius: var(--radius-md);
  }

  .body {
    display: grid;
    gap: var(--space-4);
  }
</style>
```

- [ ] **Step 5: Write the route and add the section to the home page**

`src/pages/work/[slug].astro`:

```astro
---
import type { GetStaticPaths, InferGetStaticPropsType } from 'astro';
import { getImage } from 'astro:assets';
import { render } from 'astro:content';
import { mdxComponents } from '../../components/mdx/index.ts';
import CaseStudy from '../../layouts/CaseStudy.astro';
import { getCaseStudies, getProfile } from '../../lib/content.ts';
import { canonicalUrl } from '../../lib/seo.ts';
import { creativeWorkJsonLd } from '../../lib/structured-data.ts';

export const getStaticPaths = (async () => {
  const studies = await getCaseStudies();
  return studies.map((study) => ({ params: { slug: study.id }, props: { study } }));
}) satisfies GetStaticPaths;

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

const { study } = Astro.props;
const { Content } = await render(study);
const profile = await getProfile();
if (!Astro.site) throw new Error('`site` must be set in astro.config.ts');
// Social platforms need a raster image: render the cover as a 1200px JPEG for og:image.
const ogImage = await getImage({ src: study.data.cover, width: 1200, format: 'jpg' });
const structuredData = creativeWorkJsonLd({
  title: study.data.title,
  description: study.data.summary,
  url: canonicalUrl(Astro.site.href, Astro.url.pathname),
  image: new URL(ogImage.src, Astro.site).href,
  authorName: profile.name,
  authorUrl: Astro.site.href,
  keywords: study.data.tags,
});
---

<CaseStudy study={study} ogImageUrl={ogImage.src} structuredData={structuredData}>
  <Content components={mdxComponents} />
</CaseStudy>
```

`src/pages/index.astro`: add these imports under the existing ones:

```astro
import SelectedWork from '../components/sections/SelectedWork.astro';
import { featuredStudies } from '../lib/case-studies.ts';
import { getCaseStudies } from '../lib/content.ts';
```

Note: merge `getCaseStudies` into the existing `import { getProfile } from '../lib/content.ts';` line,
so it reads `import { getCaseStudies, getProfile } from '../lib/content.ts';`.

Add after the `structuredData` declaration:

```ts
const featured = featuredStudies(await getCaseStudies());
```

and, in the markup, after `<Intro … />`:

```astro
  {featured.length > 0 && <SelectedWork studies={featured} />}
```

- [ ] **Step 6: Run everything**

```bash
pnpm exec stylelint --fix "src/**/*.{css,astro}"
pnpm lint && pnpm check && pnpm test
pnpm build && pnpm test:e2e
```

Expected: all green. `pages.spec.ts` and `a11y.spec.ts` now cover `/work/sample-project` as well,
because it's in the sitemap.

- [ ] **Step 7: Commit**

```bash
pnpm format
git add -A
git commit -m "feat: add case-study pages and selected work section

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Contact section and copy-email button

**Files:**
- Create: `src/components/CopyEmail.astro`, `src/components/sections/Contact.astro`,
  `tests/e2e/contact.spec.ts`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes:
  - `getProfile` (Task 4)
  - `socialLabels` (Task 4)
  - `.visually-hidden` (Task 6)
  - `SERVER_ONLY` (Task 5)
- Produces:
  - `<section id="contact" aria-labelledby="contact-heading">` with heading "Contact"
  - `CopyEmail.astro` props: `{ email: string }`. It renders
    `<copy-email>` with a hidden `<button>` "Copy email address" and a `role="status"` span.

- [ ] **Step 1: Write the failing spec**

`tests/e2e/contact.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { SERVER_ONLY } from '../support/site.ts';

test('the contact section offers email, booking and CV links', async ({ page }) => {
  await page.goto('/');
  const contact = page.getByRole('region', { name: 'Contact' });
  await expect(contact.getByRole('link', { name: 'alex@example.com' })).toHaveAttribute(
    'href',
    'mailto:alex@example.com',
  );
  const booking = contact.getByRole('link', { name: /^Book a call/ });
  await expect(booking).toHaveAttribute('href', 'https://cal.com/');
  await expect(booking).toHaveAttribute('target', '_blank');
  await expect(booking).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(booking).toHaveAccessibleName('Book a call (opens in a new tab)');
  await expect(contact.getByRole('link', { name: /^Download CV/ })).toHaveAttribute('href', '/cv.pdf');
});

test('the copy button copies the address and announces it', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Only Chromium lets tests grant clipboard permissions');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.getByRole('button', { name: 'Copy email address' }).click();
  await expect(page.getByRole('status')).toHaveText('Copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('alex@example.com');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the copy button stays hidden and the email link still works', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Copy email address' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'alex@example.com' })).toBeVisible();
  });
});

test('the CV is served as a PDF', async ({ request, browserName }) => {
  test.skip(browserName !== 'chromium', SERVER_ONLY);
  const response = await request.get('/cv.pdf');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/pdf');
});

test('security.txt lists the same email as the site', async ({ page, request, browserName }) => {
  test.skip(browserName !== 'chromium', SERVER_ONLY);
  await page.goto('/');
  const mailto = await page.locator('#contact a[href^="mailto:"]').first().getAttribute('href');
  const securityTxt = await (await request.get('/.well-known/security.txt')).text();
  expect(securityTxt).toContain(`Contact: ${mailto}`);
});
```

- [ ] **Step 2: Run the spec to see it fail**

Run: `pnpm build && pnpm exec playwright test tests/e2e/contact.spec.ts`
Expected: FAIL, because there's no "Contact" region. The CV test passes already (the file exists from
Task 4), and so may the no-JavaScript test's first assertion; the others fail.

- [ ] **Step 3: Write the copy button**

`src/components/CopyEmail.astro`:

```astro
---
interface Props {
  email: string;
}

const { email } = Astro.props;
---

<copy-email data-email={email}>
  <button type="button" hidden>Copy email address</button>
  <span role="status"></span>
</copy-email>

<script>
  // Progressive enhancement: the button stays hidden unless the Clipboard API is available (spec §5).
  class CopyEmail extends HTMLElement {
    connectedCallback(): void {
      const button = this.querySelector('button');
      const status = this.querySelector('[role="status"]');
      const email = this.dataset['email'];
      if (!button || !status || !email || !navigator.clipboard) return;
      button.hidden = false;
      button.addEventListener('click', () => {
        navigator.clipboard.writeText(email).then(
          () => {
            status.textContent = 'Copied';
          },
          () => {
            status.textContent = 'Copy failed. Use the email link instead.';
          },
        );
        window.setTimeout(() => {
          status.textContent = '';
        }, 2000);
      });
    }
  }

  customElements.define('copy-email', CopyEmail);
</script>

<style>
  copy-email {
    display: inline-flex;
    gap: var(--space-2);
    align-items: center;
    margin-inline-start: var(--space-2);
  }

  button {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    color: var(--color-text);
    font: inherit;
    font-size: var(--text-sm);
    cursor: pointer;
  }
</style>
```

- [ ] **Step 4: Write the contact section and add it to the home page**

`src/components/sections/Contact.astro`:

```astro
---
import type { CollectionEntry } from 'astro:content';
import { socialLabels } from '../../lib/social.ts';
import CopyEmail from '../CopyEmail.astro';

interface Props {
  profile: CollectionEntry<'profile'>['data'];
}

const { profile } = Astro.props;
const cvDate = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
}).format(profile.cvUpdated);
---

<section id="contact" class="container contact" aria-labelledby="contact-heading">
  <h2 id="contact-heading">Contact</h2>
  <p class="email">
    <a href={`mailto:${profile.email}`}>{profile.email}</a>
    <CopyEmail email={profile.email} />
  </p>
  <ul class="links">
    <li>
      <a href={profile.bookingUrl} target="_blank" rel="noopener noreferrer"
        >Book a call<span class="visually-hidden"> (opens in a new tab)</span></a
      >
    </li>
    <li><a href="/cv.pdf" download>Download CV</a> (PDF, updated {cvDate})</li>
    {
      profile.socials.map((social) => (
        <li>
          <a href={social.url}>{socialLabels[social.platform]}</a>
        </li>
      ))
    }
  </ul>
</section>

<style>
  .contact {
    display: grid;
    gap: var(--space-4);
    padding-block: var(--space-12) var(--space-16);
  }

  h2 {
    font-size: var(--text-xl);
  }

  .email {
    font-size: var(--text-lg);
  }

  .links {
    display: grid;
    gap: var(--space-2);
    padding: 0;
    list-style: none;
  }
</style>
```

`src/pages/index.astro`: add `import Contact from '../components/sections/Contact.astro';` to the
imports, and add after the `SelectedWork` line:

```astro
  <Contact profile={profile} />
```

- [ ] **Step 5: Run everything**

```bash
pnpm exec stylelint --fix "src/**/*.{css,astro}"
pnpm lint && pnpm check && pnpm test
pnpm build && pnpm test:e2e
```

Expected: all green. The Tab test in `site.spec.ts` now also covers the contact links and the copy
button.

- [ ] **Step 6: Commit**

```bash
pnpm format
git add -A
git commit -m "feat: add contact section with progressive copy-email button

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Page weight and Lighthouse floors

**Files:**
- Create: `tests/support/page-weight.ts`, `tests/support/lighthouse-scores.ts`,
  `tests/support/lighthouse.ts`, `tests/unit/page-weight.test.ts`, `tests/unit/lighthouse-scores.test.ts`,
  `tests/e2e/weight.spec.ts`, `tests/perf/lighthouse.spec.ts`
- Modify: `playwright.config.ts` (add the `lighthouse` project), `package.json` (script `test:perf`;
  dev deps `lighthouse`, `chrome-launcher`)

**Interfaces:**
- Consumes: `builtPagePaths`, `BASE_URL` (Task 5)
- Produces (`tests/support/page-weight.ts`):
  - `interface LoadedResource { url: string; type: string; bytes: number }`
  - `WEIGHT_BUDGET`
  - `checkPageWeight(resources: readonly LoadedResource[], origin: string): string[]`
- Produces (`tests/support/lighthouse-scores.ts`):
  - `interface LighthouseReport`
  - `LIGHTHOUSE_FLOORS`
  - `checkLighthouse(report: LighthouseReport): string[]`
- Produces (`tests/support/lighthouse.ts`): `runLighthouse(url: string): Promise<LighthouseReport>`

- [ ] **Step 1: Write the failing unit tests**

`tests/unit/page-weight.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkPageWeight, type LoadedResource } from '../support/page-weight.ts';

const origin = 'http://127.0.0.1:8787';
const KB = 1024;
const res = (type: string, bytes: number, url = `${origin}/${type}`): LoadedResource => ({ url, type, bytes });

describe('checkPageWeight (spec §4, floors 2 and 3)', () => {
  it('passes a light first-party page', () => {
    assert.deepEqual(
      checkPageWeight([res('document', 20 * KB), res('stylesheet', 8 * KB), res('script', 2 * KB)], origin),
      [],
    );
  });

  it('flags JavaScript over 5 KB', () => {
    assert.deepEqual(checkPageWeight([res('script', 6 * KB)], origin), ['script: 6144 B > 5120 B']);
  });

  it('flags CSS over 20 KB and fonts over 100 KB', () => {
    const failures = checkPageWeight([res('stylesheet', 21 * KB), res('font', 101 * KB)], origin);
    assert.deepEqual(failures, ['stylesheet: 21504 B > 20480 B', 'font: 103424 B > 102400 B']);
  });

  it('flags more than two font files', () => {
    const fonts = [1, 2, 3].map((n) => res('font', KB, `${origin}/font-${n}.woff2`));
    assert.deepEqual(checkPageWeight(fonts, origin), ['font files: 3 > 2']);
  });

  it('flags a page over 500 KB in total', () => {
    assert.deepEqual(checkPageWeight([res('image', 501 * KB)], origin), ['total: 513024 B > 512000 B']);
  });

  it('flags every third-party request', () => {
    const failures = checkPageWeight([res('script', 100, 'https://cdn.example.net/x.js')], origin);
    assert.deepEqual(failures, ['third-party request: https://cdn.example.net/x.js']);
  });
});
```

`tests/unit/lighthouse-scores.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkLighthouse, type LighthouseReport } from '../support/lighthouse-scores.ts';

function report(overrides: {
  scores?: Record<string, number | null>;
  metrics?: Record<string, number | undefined>;
} = {}): LighthouseReport {
  const scores = { performance: 1, accessibility: 1, 'best-practices': 1, seo: 1, ...overrides.scores };
  const metrics = {
    'largest-contentful-paint': 1200,
    'cumulative-layout-shift': 0,
    'total-blocking-time': 0,
    ...overrides.metrics,
  };
  return {
    categories: Object.fromEntries(Object.entries(scores).map(([id, score]) => [id, { score }])),
    audits: Object.fromEntries(
      Object.entries(metrics).map(([id, value]) => [id, value === undefined ? {} : { numericValue: value }]),
    ),
  };
}

describe('checkLighthouse (spec §4, floors 1 and 4)', () => {
  it('passes a perfect report', () => {
    assert.deepEqual(checkLighthouse(report()), []);
  });

  it('flags a category below its floor', () => {
    assert.deepEqual(checkLighthouse(report({ scores: { performance: 0.9, seo: 0.99 } })), [
      'performance: 90 < 95',
      'seo: 99 < 100',
    ]);
  });

  it('treats a missing score as a failure', () => {
    assert.deepEqual(checkLighthouse(report({ scores: { accessibility: null } })), ['accessibility: 0 < 100']);
  });

  it('flags metrics over budget and missing metrics', () => {
    const failures = checkLighthouse(
      report({ metrics: { 'largest-contentful-paint': 3000, 'total-blocking-time': undefined } }),
    );
    assert.deepEqual(failures, ['largest-contentful-paint: 3000 > 2500', 'total-blocking-time: missing']);
  });
});
```

- [ ] **Step 2: Run the unit tests to see them fail**

Run: `pnpm test`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `tests/support/page-weight.ts` and
`tests/support/lighthouse-scores.ts`.

- [ ] **Step 3: Implement the checkers**

`tests/support/page-weight.ts`:

```ts
export interface LoadedResource {
  url: string;
  /** Playwright's resource type: document, stylesheet, script, image, font, … */
  type: string;
  /** Decoded body size. The local server doesn't compress, so this is stricter than production. */
  bytes: number;
}

/** Spec §4, floor 2. */
export const WEIGHT_BUDGET = {
  bytes: { script: 5 * 1024, stylesheet: 20 * 1024, font: 100 * 1024 },
  fontFiles: 2,
  totalBytes: 500 * 1024,
} as const;

/** One message per broken budget. An empty list means the page passes. */
export function checkPageWeight(resources: readonly LoadedResource[], origin: string): string[] {
  const failures: string[] = [];
  const bytesOf = (type: string) =>
    resources.filter((r) => r.type === type).reduce((sum, r) => sum + r.bytes, 0);

  for (const [type, max] of Object.entries(WEIGHT_BUDGET.bytes)) {
    const bytes = bytesOf(type);
    if (bytes > max) failures.push(`${type}: ${bytes} B > ${max} B`);
  }
  const fontFiles = resources.filter((r) => r.type === 'font').length;
  if (fontFiles > WEIGHT_BUDGET.fontFiles) failures.push(`font files: ${fontFiles} > ${WEIGHT_BUDGET.fontFiles}`);
  const total = resources.reduce((sum, r) => sum + r.bytes, 0);
  if (total > WEIGHT_BUDGET.totalBytes) failures.push(`total: ${total} B > ${WEIGHT_BUDGET.totalBytes} B`);
  // Floor 3: nothing may come from another origin.
  for (const r of resources) {
    if (new URL(r.url).origin !== origin) failures.push(`third-party request: ${r.url}`);
  }
  return failures;
}
```

`tests/support/lighthouse-scores.ts`:

```ts
/** The parts of a Lighthouse report that the floors read. */
export interface LighthouseReport {
  categories: Record<string, { score: number | null } | undefined>;
  audits: Record<string, { numericValue?: number } | undefined>;
}

/** Spec §4, floors 1 and 4. */
export const LIGHTHOUSE_FLOORS = {
  scores: { performance: 0.95, accessibility: 1, 'best-practices': 1, seo: 1 },
  metrics: {
    'largest-contentful-paint': 2500,
    'cumulative-layout-shift': 0.1,
    'total-blocking-time': 100,
  },
} as const;

/** One message per broken floor. An empty list means the page passes. */
export function checkLighthouse(report: LighthouseReport): string[] {
  const failures: string[] = [];
  for (const [id, min] of Object.entries(LIGHTHOUSE_FLOORS.scores)) {
    const score = report.categories[id]?.score ?? 0;
    if (score < min) failures.push(`${id}: ${Math.round(score * 100)} < ${Math.round(min * 100)}`);
  }
  for (const [id, max] of Object.entries(LIGHTHOUSE_FLOORS.metrics)) {
    const value = report.audits[id]?.numericValue;
    if (value === undefined) failures.push(`${id}: missing`);
    else if (value > max) failures.push(`${id}: ${value} > ${max}`);
  }
  return failures;
}
```

Run: `pnpm test`
Expected: every unit test passes.

- [ ] **Step 4: Add the page-weight spec**

`tests/e2e/weight.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { checkPageWeight, type LoadedResource } from '../support/page-weight.ts';
import { BASE_URL, builtPagePaths } from '../support/site.ts';

for (const path of builtPagePaths()) {
  test(`${path} stays within the page-weight budget`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Resource sizes do not depend on the browser engine');
    const resources: LoadedResource[] = [];
    const pending: Promise<void>[] = [];
    page.on('response', (response) => {
      pending.push(
        response
          .body()
          .catch(() => Buffer.alloc(0)) // redirects have no body
          .then((body) => {
            resources.push({ url: response.url(), type: response.request().resourceType(), bytes: body.length });
          }),
      );
    });
    await page.goto(path, { waitUntil: 'networkidle' });
    await Promise.all(pending);
    expect(checkPageWeight(resources, new URL(BASE_URL).origin)).toEqual([]);
  });
}
```

Run: `pnpm build && pnpm exec playwright test tests/e2e/weight.spec.ts --project=chromium`
Expected: 2 passed (`/` and `/work/sample-project`).

- [ ] **Step 5: Add Lighthouse**

```bash
pnpm add -w -D lighthouse@^13 chrome-launcher@^1.2.1
```

`tests/support/lighthouse.ts`:

```ts
import { chromium } from '@playwright/test';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import type { LighthouseReport } from './lighthouse-scores.ts';

/** Runs Lighthouse's default mobile audit in Playwright's Chromium. */
export async function runLighthouse(url: string): Promise<LighthouseReport> {
  const chrome = await chromeLauncher.launch({
    chromePath: chromium.executablePath(),
    // Ubuntu 24.04 CI runners block Chrome's sandbox; the site under test is our own build.
    chromeFlags: ['--headless=new', ...(process.env['CI'] ? ['--no-sandbox'] : [])],
  });
  try {
    const result = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    });
    if (!result) throw new Error(`Lighthouse returned no result for ${url}`);
    return result.lhr as unknown as LighthouseReport;
  } finally {
    await chrome.kill();
  }
}
```

`tests/perf/lighthouse.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { checkLighthouse } from '../support/lighthouse-scores.ts';
import { runLighthouse } from '../support/lighthouse.ts';
import { BASE_URL, builtPagePaths } from '../support/site.ts';

// One Chrome at a time keeps the measurements stable.
test.describe.configure({ mode: 'serial' });

for (const path of builtPagePaths()) {
  test(`${path} meets the Lighthouse floors`, async () => {
    test.setTimeout(120_000);
    const report = await runLighthouse(new URL(path, BASE_URL).href);
    expect(checkLighthouse(report)).toEqual([]);
  });
}
```

In `playwright.config.ts`, add a fourth entry to `projects`:

```ts
    { name: 'lighthouse', testDir: 'tests/perf', use: { ...devices['Desktop Chrome'] } },
```

Add to the `scripts` in `package.json`:

```json
    "test:perf": "playwright test --project=lighthouse"
```

- [ ] **Step 6: Run the Lighthouse floors**

Run: `pnpm build && pnpm test:perf`
Expected: 2 passed.

If a floor fails, the message names the category or metric. Find the cause (for example with
`pnpm exec lighthouse http://127.0.0.1:8787/ --view` while `pnpm serve` is running) and fix the page.
Never lower a floor.

- [ ] **Step 7: Run everything and commit**

```bash
pnpm check && pnpm test && pnpm test:e2e && pnpm test:perf
pnpm format
git add -A
git commit -m "test: enforce page-weight and Lighthouse floors

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: CI and dependency automation

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/weekly.yml`, `.github/dependabot.yml`,
  `lychee.toml`, `tests/unit/workflows.test.ts`

**Interfaces:**
- Consumes: scripts `format:check`, `lint`, `check`, `test`, `build`, `test:e2e` and `test:perf`
- Produces:
  - the GitHub status check named `ci` (the branch ruleset in Task 12 requires it)
  - the scheduled `weekly` job

- [ ] **Step 1: Write the failing workflow-hardening test**

`tests/unit/workflows.test.ts`:

```ts
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const dir = '.github/workflows';
const workflows = readdirSync(dir)
  .filter((name) => name.endsWith('.yml'))
  .map((name) => ({ name, text: readFileSync(join(dir, name), 'utf8') }));

describe('GitHub Actions hardening (spec §7)', () => {
  it('has the ci and weekly workflows', () => {
    assert.deepEqual(workflows.map((w) => w.name).sort(), ['ci.yml', 'weekly.yml']);
  });

  for (const { name, text } of workflows) {
    it(`${name} pins every action to a full commit SHA`, () => {
      const refs = [...text.matchAll(/^\s*(?:-\s*)?uses:\s*(\S+)/gm)].map((match) => match[1] ?? '');
      assert.ok(refs.length > 0);
      for (const ref of refs) assert.match(ref, /^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/, ref);
    });

    it(`${name} grants only read access to repository contents`, () => {
      assert.match(text, /^permissions:\n {2}contents: read\n/m);
      assert.doesNotMatch(text, /: write/);
    });

    it(`${name} never uses pull_request_target`, () => {
      assert.doesNotMatch(text, /pull_request_target/);
    });

    it(`${name} checks out without persisting credentials`, () => {
      assert.match(text, /persist-credentials: false/);
    });
  }
});
```

Run: `pnpm test`
Expected: FAIL with `ENOENT` for `.github/workflows`.

- [ ] **Step 2: Write the workflows**

`.github/workflows/ci.yml`:

```yaml
name: ci

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    name: ci
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    env:
      ASTRO_TELEMETRY_DISABLED: '1'
      WRANGLER_SEND_METRICS: 'false'
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - uses: pnpm/action-setup@d9184bf108216479bc5a137cc391f4d7b14c870b # v6.1.0
      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm audit --audit-level=high
      - run: pnpm format:check
      - run: pnpm lint
      - run: pnpm check
      - run: pnpm test
      - run: pnpm build
      - name: Check internal links
        uses: lycheeverse/lychee-action@e7477775783ea5526144ba13e8db5eec57747ce8 # v2.9.0
        with:
          args: --config lychee.toml --offline --root-dir ${{ github.workspace }}/dist dist
          fail: true
      - run: pnpm exec playwright install --with-deps chromium webkit firefox
      - run: pnpm test:e2e
      - run: pnpm test:perf
```

`.github/workflows/weekly.yml`:

```yaml
name: weekly

on:
  schedule:
    - cron: '0 6 * * 1'
  workflow_dispatch:

permissions:
  contents: read

jobs:
  weekly:
    name: weekly
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    env:
      ASTRO_TELEMETRY_DISABLED: '1'
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - uses: pnpm/action-setup@d9184bf108216479bc5a137cc391f4d7b14c870b # v6.1.0
      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm audit --audit-level=high
      # Includes the security.txt expiry check.
      - run: pnpm test
      - run: pnpm build
      - name: Check external links
        uses: lycheeverse/lychee-action@e7477775783ea5526144ba13e8db5eec57747ce8 # v2.9.0
        with:
          args: --config lychee.toml --root-dir ${{ github.workspace }}/dist dist
          fail: true
```

`.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    cooldown:
      default-days: 7
    groups:
      dependencies:
        patterns: ['*']
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
    cooldown:
      default-days: 7
    groups:
      actions:
        patterns: ['*']
```

`lychee.toml`:

```toml
# Link checking (spec §9). CI adds --offline to check internal links only; the weekly job checks
# external links too.
include_fragments = true
fallback_extensions = ["html"]
index_files = ["index.html"]
exclude = [
  '^https://example\.com',           # placeholder SITE_URL and case-study link until launch
  '^https://(www\.)?linkedin\.com',  # LinkedIn answers automated requests with status 999
]
```

- [ ] **Step 3: Run the tests and validate the YAML**

```bash
pnpm test
pnpm format
pnpm format:check
pnpm audit --audit-level=high
```

Expected:
- every unit test passes, including the 1 + 4 × 2 workflow checks
- `format:check` passes, which also proves the YAML parses
- `audit` exits 0. If it reports a high or critical advisory, stop and report it. Don't add
  exceptions.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "ci: add hardened checks workflow, weekly job and Dependabot

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Documentation

**Files:**
- Create: `README.md`, `docs/setup.md`, `.env.example`

**Interfaces:**
- Consumes: every script and file from Tasks 1–10
- Produces: the owner-facing docs Task 12 follows

- [ ] **Step 1: Write `.env.example`**

```
# This project has no secrets and needs no .env file.
#
# Cloudflare Workers Builds sets these during its builds (spec §8). You never set them yourself:
#   WORKERS_CI=1               marks a Cloudflare build; the build refuses a placeholder SITE_URL
#   WORKERS_CI_BRANCH=<name>   `main` builds production; any other branch builds a preview
#
# To try a preview build locally:  WORKERS_CI_BRANCH=preview-test pnpm build
```

- [ ] **Step 2: Write `README.md`**

````markdown
# Portfolio

Personal portfolio site: a static [Astro](https://astro.build) 7 site served by Cloudflare Workers
static assets. It has no server code, no database and no secrets.

The design and engineering decisions live in the
[foundation spec](docs/superpowers/specs/2026-09-24-portfolio-foundation-design.md). Read it before
changing how the site is built.

## Stack

- Astro 7 (static output), TypeScript 6 (strictest settings), MDX, plain CSS with design tokens
- pnpm 10 and Node 24
- Tests: `node --test` (unit), Playwright (end to end, accessibility with axe, page weight), Lighthouse 13
- Hosting: Cloudflare Workers static assets, deployed by Cloudflare Workers Builds from GitHub
- CI: GitHub Actions (checks only; it deploys nothing)

## Getting started

Prerequisites: Node 24 (see `.nvmrc`) and pnpm 10.34.5 (`npm install -g pnpm@10.34.5`).

```bash
pnpm install
pnpm exec playwright install chromium webkit firefox
pnpm dev
```

`pnpm dev` serves the site at http://localhost:4321. The Content Security Policy only applies to
production builds, so check anything CSP-related with `pnpm build && pnpm serve`.

Astro collects anonymous usage data by default. To opt out on your machine, run
`pnpm astro telemetry disable`.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Development server with hot reload |
| `pnpm build` | Production build into `dist/` |
| `pnpm serve` | Serves `dist/` at http://127.0.0.1:8787 through `wrangler dev`, with the real `_headers` |
| `pnpm check` | Type-checks `.astro` and `.ts` files |
| `pnpm lint` | Stylelint; colours may only come from `src/styles/tokens.css` |
| `pnpm format` / `pnpm format:check` | Prettier |
| `pnpm test` | Unit tests |
| `pnpm test:e2e` | Playwright on Chromium, WebKit and Firefox (run `pnpm build` first) |
| `pnpm test:perf` | Lighthouse floors (run `pnpm build` first) |

## Environment variables

None are needed. `.env.example` documents the ones Cloudflare sets during its builds:

- `WORKERS_CI=1` marks a Cloudflare build. The build refuses to run while `SITE_URL` in
  `site.config.ts` is a placeholder.
- `WORKERS_CI_BRANCH` sets the mode. `main` builds production. Any other branch builds a preview, with
  drafts shown and `noindex` on every page. Local builds and CI build production.

## Updating content

All personal content lives in `src/content/` and is validated when the site builds. A mistake fails
the build with a message naming the file and the field.

- **Profile** (`src/content/profile.yaml`): name, headline, intro, email, booking link, social links, CV
  date, and the default search description and social image. The image is `public/og-default.png`,
  1200 × 630.
- **Case studies** (`src/content/case-studies/<slug>/index.mdx`): one folder per project, with its
  images alongside.
  - The folder name is the URL (`/work/<slug>`) and must be lowercase words joined by hyphens.
  - The frontmatter fields are defined in `src/content.config.ts`.
  - `draft: true` keeps a study out of production.
  - MDX can use `<Figure>` and `<Callout>` without importing them. Imports aren't allowed.
- **Email address**: when it changes, also update `Contact:` in `public/.well-known/security.txt`. A
  test checks that they match.

### Replacing the CV

1. Export the new CV to `public/cv.pdf`, without your home address or phone number.
2. Strip its hidden metadata. `exiftool` removes the fields, and `qpdf` rewrites the file so the old
   values are really gone:

   ```bash
   exiftool -all:all= -overwrite_original public/cv.pdf
   qpdf --linearize --replace-input public/cv.pdf
   exiftool -a -G1 public/cv.pdf
   ```

   The last command should list only file details, with no author or software name.
3. Update `cvUpdated` in `src/content/profile.yaml`.

### Renewing security.txt

`public/.well-known/security.txt` must carry an `Expires` date less than a year away. A test fails once
it's within 30 days. Set a new date about 11 months ahead.

## Deployment

1. Push a branch and open a pull request. GitHub Actions runs every check. Cloudflare builds a preview
   and posts its address on the pull request.
2. Squash-merge once the checks pass. `main` only accepts pull requests with passing checks.
3. Cloudflare builds `main` and deploys it to production.

To roll back, pick an earlier deployment in the Cloudflare dashboard (Workers & Pages → the Worker →
Deployments), or revert the pull request. First-time account and repository setup is in
[docs/setup.md](docs/setup.md).

## Security

- **CSP:** Astro generates a Content Security Policy `<meta>` tag with hashes of its own scripts and
  styles. `public/_headers` adds `frame-ancestors` and the other security headers. Tests fail on any
  CSP violation and check every header.
- **Nothing third-party:** no requests to other sites, no cookies, no analytics, no forms.
- **Dependencies:**
  - pnpm won't install a version younger than 7 days (`minimumReleaseAge`).
  - It runs no install scripts except for the packages listed in `pnpm-workspace.yaml`.
  - Dependabot proposes weekly updates, with the same 7-day wait.
  - Adding a dependency needs a reason in its pull request and an update to spec §10.
- **CI:** read-only permissions, every action pinned to a commit SHA, and no secrets.
- **Reporting:** report a vulnerability to the address in `/.well-known/security.txt`.
````

- [ ] **Step 3: Write `docs/setup.md`**

````markdown
# First-time setup

The owner does these steps once, in the Cloudflare and GitHub dashboards. They can't be scripted from
the repository because they involve your accounts. Follow them in order.

## 1. Cloudflare account

1. Sign up at https://dash.cloudflare.com/sign-up, or sign in.
2. Turn on two-factor authentication (My Profile → Authentication) with a passkey, security key or
   authenticator app, not SMS. Store the recovery codes offline.
3. Open Workers & Pages. On the first visit Cloudflare asks you to choose a `workers.dev` subdomain.
   Note it.
4. The production address will be `https://portfolio.<your-subdomain>.workers.dev`. `portfolio` is the
   `name` in `wrangler.jsonc`; to use a different name, change it there as well.

## 2. Set the production URL

Set `SITE_URL` in `site.config.ts` to the address from step 1.4 and commit. Cloudflare builds refuse
to run while it's still `https://example.com`.

## 3. GitHub repository

1. Turn on two-factor authentication for your GitHub account (Settings → Password and authentication)
   with a passkey or authenticator app.
2. Create a new **public** repository with no README, licence or `.gitignore`. It must start empty.
3. Push both branches:

   ```bash
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   git push -u origin feat/foundation
   ```

## 4. Repository settings

**Settings → General → Pull Requests**
- Allow squash merging only: untick merge commits and rebase merging.
- Tick "Always suggest updating pull request branches" and "Automatically delete head branches".

**Settings → Rules → Rulesets → New branch ruleset**
- Name `main`, enforcement status **Active**, bypass list **empty**, target **Include default
  branch**.
- Tick these rules:
  - Restrict deletions
  - Require linear history
  - Require a pull request before merging, with required approvals set to **0**
  - Block force pushes
- Leave "Require status checks to pass" for step 6. The `ci` check only shows up in the list once it
  has run.

**Settings → Actions → General**
- Workflow permissions: **Read repository contents and packages permissions**.
- Untick "Allow GitHub Actions to create and approve pull requests".

**Settings → Advanced Security** (called "Code security" on some accounts)
- Turn on Dependabot alerts and Dependabot security updates.
- Turn on secret scanning with push protection.
- CodeQL analysis: **Default** setup.

## 5. Connect Cloudflare to the repository

1. Workers & Pages → Create → Import a repository → GitHub.
2. When GitHub asks what the Cloudflare app may access, choose **Only select repositories** and pick
   this repository.
3. Project name `portfolio` (it must match `name` in `wrangler.jsonc`). Production branch `main`.
4. Build command `pnpm build`. Keep the default deploy command (`npx wrangler deploy`). Keep builds for
   non-production branches **on**.
5. Add a build variable: `PNPM_VERSION` = `10.34.5`.
6. Save. Cloudflare may build `main` straight away. That build fails, because `main` only holds
   documentation so far. That's expected, and nothing is deployed.

## 6. First pull request

1. Open a pull request from `feat/foundation` into `main`.
2. Wait for the `ci` check and the Cloudflare preview comment.
3. Edit the `main` ruleset: turn on "Require status checks to pass", add **`ci`**, and tick "Require
   branches to be up to date before merging".
4. On the preview address, check three things:
   - pages load
   - `/robots.txt` says `Disallow: /`
   - `curl -sI <preview-url>` shows the headers from `public/_headers`
5. Squash-merge. Cloudflare deploys production within a minute or two.

## 7. Launch checklist

- [ ] `https://<production>/robots.txt` shows `Allow: /` and the sitemap address.
- [ ] https://developer.mozilla.org/en-US/observatory rates the production address **A+**.
- [ ] Keyboard-only pass on the home page and one case study: the skip link works, focus is always
      visible, and every control can be reached.
- [ ] Screen-reader pass (VoiceOver or NVDA) on the same pages.
- [ ] Paste the production address into a messaging app: the preview shows the title and image.

## Later: custom domain

Before pointing a domain at the site, follow the checklist in spec §7:
- registrar MFA, transfer lock and auto-renew
- DNSSEC
- a CAA record
- no leftover DNS records
- redirect or disable `*.workers.dev`
- only then, consider HSTS `preload`
````

- [ ] **Step 4: Check and commit**

```bash
pnpm format
pnpm format:check
git add -A
git commit -m "docs: add README, setup guide and .env.example

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: `format:check` passes.

---

### Task 12: Launch (with the owner)

This task changes accounts and publishes the repository, so **every step needs the owner**. Follow
`docs/setup.md`. Ask before each outward-facing action, and don't combine approvals.

**Files:**
- Modify: `site.config.ts` (`SITE_URL`), and `wrangler.jsonc` (`name`) only if the owner picks a
  different Worker name

**Interfaces:**
- Consumes: everything
- Produces: a production deployment on `*.workers.dev`

- [ ] **Step 1: Get the production URL.** Ask the owner to complete `docs/setup.md` step 1 and give
  you the resulting address.
- [ ] **Step 2: Set it.** Put the address in `SITE_URL` in `site.config.ts`. Then run:

```bash
WORKERS_CI=1 pnpm build
pnpm test && pnpm build && pnpm test:e2e && pnpm test:perf
git add site.config.ts wrangler.jsonc
git commit -m "chore: set the production URL

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: the `WORKERS_CI=1` build now succeeds, and every test passes. The canonical expectations
follow `SITE_URL` automatically.

- [ ] **Step 3: Publish the repository.** The owner creates the empty public repository (setup step 3).
  Get **explicit permission to push**, then run the `git remote add` and both `git push` commands from
  setup step 3.
- [ ] **Step 4: Guide the owner** through setup steps 4 and 5 (repository settings, connecting
  Cloudflare).
- [ ] **Step 5: Open the pull request.** There's no `gh` CLI, so give the owner the compare URL
  `https://github.com/<you>/<repo>/compare/main...feat/foundation` and this description:

```markdown
## Summary
Technical foundation for the portfolio, per `docs/superpowers/specs/2026-09-24-portfolio-foundation-design.md`:
- Astro 7 static site with placeholder content
- strict CSP and security headers
- unit, end-to-end, accessibility, page-weight and Lighthouse checks
- hardened CI, weekly checks and Dependabot

## Test plan
- [ ] `ci` check is green
- [ ] The Cloudflare preview loads, `/robots.txt` disallows crawling, and the security headers are present

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

- [ ] **Step 6: Verify the preview.** Once CI is green and Cloudflare has posted the preview address:

```bash
curl -sI <preview-url>
curl -s <preview-url>/robots.txt
```

Expected:
- The headers include every entry in `tests/support/headers.ts`.
- `robots.txt` is `User-agent: *` / `Disallow: /`.
- If Task 5 found that `wrangler dev` doesn't apply `_headers`, this is where the header assertions run.
  Compare each header value by hand and report any difference.

- [ ] **Step 7: Merge and verify production.** The owner completes setup step 6.3 (require `ci`) and
  squash-merges. Then:

```bash
curl -sI <production-url>
curl -s <production-url>/robots.txt
curl -s <production-url>/sitemap-index.xml
```

Expected: the security headers are present. `robots.txt` shows `Allow: /` and the production sitemap
URL. The sitemap index points at `sitemap-0.xml` on the production host.

- [ ] **Step 8: Launch checklist.** Walk the owner through `docs/setup.md` step 7:
  - Observatory A+
  - the keyboard pass and the screen-reader pass
  - the share preview

  Report each result. Anything that fails becomes a new branch and pull request.
