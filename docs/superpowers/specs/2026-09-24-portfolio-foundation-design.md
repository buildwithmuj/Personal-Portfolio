# Portfolio — technical foundation spec

**Date:** 2026-09-24
**Status:** Approved; amended during planning after dependency research (see §15)
**Replaces:** the v1 folder-grid build (kept locally on `archive/v1-folder-grid`; not carried forward)
**Followed by:** a content & design spec, written once the owner's raw content and inspiration screens arrive

## How to use this document

This is both the design spec and the build prompt. Anyone building this project, human or AI agent,
reads it in full before writing code.

- The decisions in §3 are made. Don't re-evaluate them; propose a change by editing this spec in a
  pull request.
- The floors in §4 are pass/fail. Nothing ships below them.
- Where this spec and the later content & design spec disagree, this spec wins unless it has been
  amended.

## 1. Goal

A personal portfolio site engineered like a production application: secure, fast, accessible and easy
to maintain. It presents the owner, their selected work as case studies and a downloadable CV, and
makes getting in touch easy.

This spec fixes the technical foundation only. Visual design, copy and the set of home-page sections
come later from the owner's material, and the architecture must take them without restructuring.

## 2. Scope

**In (v1)**

- Home page whose sections are rendered from content
- One page per case study at `/work/<slug>`
- Downloadable CV at `/cv.pdf`
- Contact: `mailto:` link, copy-email button, Cal.com booking link
- 404 page, sitemap, `robots.txt`, `security.txt`, favicon set, social-sharing metadata
- CI checks, preview deploys and production deploys on Cloudflare
- Placeholder content that exercises every schema until real content arrives

**Out (v1)** — §11 says how each would be added: blog, contact form, analytics, CMS, search,
newsletter, comments, authentication, custom domain (v1 launches on `*.workers.dev`), manual theme
toggle, UI framework, page transitions.

**Owner supplies later:** raw content (sets content fields and home-page sections), inspiration
screens (set the visual design), CV PDF, fonts, domain.

## 3. Decisions

| Area | Decision | Why |
|---|---|---|
| Framework | Astro 7, static output, no adapter | Zero JS by default; typed content collections; hash-based CSP for static pages (stable since Astro 6); built-in image and font handling. Next.js 16 was rejected: nonce-based CSP forces every page to render dynamically, and its static alternative (SRI) is experimental. |
| Language | TypeScript 6.0, extending `astro/tsconfigs/strictest` | TypeScript 7 is out, but `@astrojs/check` doesn't support it yet. |
| Styling | Plain CSS: design tokens as custom properties, plus Astro scoped component styles | No dependencies; tokens are the seam where the design gets applied. |
| Content | MDX for case studies, YAML for structured data, in the repo, validated by Zod 4 schemas | No CMS; Git is the editing workflow. |
| Hosting | Cloudflare Workers static assets, with no Worker script | Free tier with unlimited bandwidth that allows commercial use; `_headers` support; preview URLs; Cloudflare's recommended successor to Pages. |
| Deploys | Cloudflare Workers Builds through its GitHub app | Builds and deploys with no Cloudflare credential stored in GitHub. |
| Repository | Public GitHub repo, fresh history, commits use the owner's GitHub noreply email | Free branch rulesets and secret scanning; the code is itself portfolio material. |
| CI | GitHub Actions, checks only; it deploys nothing | |
| Package manager | pnpm 10 (latest 10.x) | Blocks dependency install scripts by default; supports `minimumReleaseAge`. Stay on 10: Dependabot can't parse pnpm 11+ lockfiles yet. |
| Runtime | Node 24 LTS, pinned in `.nvmrc`, `engines` and `packageManager` | Astro 7 needs Node 22.12 or later; 24 is the active LTS. |
| Contact | `mailto:` link, copy-email button, Cal.com link | No server code at all. |

## 4. Floors and definition of done

Above the floors, the design leads. When a design choice would breach a floor, the design changes or
this section is amended in writing, never quietly.

| # | Floor | Enforced by |
|---|---|---|
| 1 | Lighthouse (mobile) on every page: Performance ≥ 95; Accessibility, Best Practices and SEO = 100 | Lighthouse, every PR |
| 2 | Per page: JS ≤ 5 KB, CSS ≤ 20 KB, fonts ≤ 2 files and ≤ 100 KB, total ≤ 500 KB (CV excluded) | Playwright page-weight check |
| 3 | No requests to any third-party origin | CSP + Playwright page-weight check |
| 4 | Lab metrics: LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 100 ms | Lighthouse |
| 5 | WCAG 2.2 AA: zero axe violations in light and dark schemes, plus a manual keyboard-only and screen-reader pass (VoiceOver or NVDA) on the home page and one case study before launch | Playwright + axe; release checklist |
| 6 | Zero CSP violations and zero console errors on every page | Playwright |
| 7 | MDN HTTP Observatory grade A+ on the production URL | Release checklist |
| 8 | No horizontal scrolling at 320 CSS px wide | Playwright |
| 9 | The build fails on invalid content, type errors, lint errors or broken internal links | CI |
| 10 | Works in the last two versions of Chrome, Edge, Firefox and Safari (including iOS); older browsers get readable content | Playwright on Chromium, WebKit and Firefox |

Field targets after launch (at the 75th percentile: LCP < 2.5 s, INP < 200 ms, CLS < 0.1) are the aim,
but they can only be read from Chrome UX Report data once traffic allows, because the site has no
analytics.

Floor 2's sizes are the decoded response sizes Playwright records from the local `wrangler dev`
server. They're uncompressed, so the check is stricter than the gzip sizes production serves.

The content & design spec may raise floor 2 for a named component, writing the new number here.

## 5. Architecture

### Routes

| Path | Source |
|---|---|
| `/` | Home; sections rendered from content |
| `/work/<slug>` | One page per case study, generated from the collection |
| `/404` | Custom not-found page; Cloudflare serves it with a 404 status for unknown paths |
| `/cv.pdf` | Static file |
| `/sitemap-index.xml` | `@astrojs/sitemap` |
| `/robots.txt` | Generated per environment (§8) |
| `/.well-known/security.txt` | See §7 |

URLs have no trailing slash: Astro `trailingSlash: 'never'` with `build.format: 'file'`, and Cloudflare
`html_handling: "drop-trailing-slash"`. A request for `/work/x/` redirects to `/work/x`.

Whether `/work` gets its own index page is a design decision; the structure supports either.

### Repository layout

```
.github/            ci.yml, weekly.yml, dependabot.yml
docs/               this spec, the implementation plan, setup.md
public/             cv.pdf, favicons, _headers
src/
  pages/            routes only: load content, choose a layout, render
  layouts/          Base.astro (document shell, <Seo>, skip link, header, footer), CaseStudy.astro
  components/       presentational .astro components
  components/mdx/   the only components case-study MDX may use
  content/          case-studies/<slug>/index.mdx plus its images; profile.yaml; other data files
  content.config.ts schemas for every collection
  lib/              pure TypeScript helpers, unit-tested
  styles/           tokens.css, global.css
tests/e2e/          Playwright specs
```

Root config: `astro.config.ts`, `wrangler.jsonc`, `pnpm-workspace.yaml`, `lighthouserc.json`,
`lychee.toml`, lint and format configs, `.nvmrc`, `.env.example`, `README.md`.

Rules:

- Pages hold no logic. Anything worth testing lives in `lib/`.
- Components hold no personal copy; it comes from `src/content/`. UI labels such as "Copy email" may
  live in components.
- A component has one job. When it grows a second, split it.

### Rendering and JavaScript

- Every page is prerendered at build time. No page ships JS unless one of its components needs it.
- Client JS lives in component-scoped `<script>` tags, which Astro bundles and hashes into the CSP.
- In v1 the copy-email button is the only script. The `mailto:` link works without it, and the
  "Copied" confirmation is announced through an `aria-live` region.
- No UI framework is installed, and Astro's `<ClientRouter>` is not used (§11).

### Design tokens

- `src/styles/tokens.css` defines semantic custom properties: colour roles (`--color-bg`,
  `--color-surface`, `--color-text`, `--color-text-muted`, `--color-accent`, `--color-focus`), font
  families, type scale, spacing scale, radii, motion durations and easings.
- Light and dark values switch on `prefers-color-scheme`.
- Until the design spec replaces them, the values are neutral greys and system fonts that still meet
  WCAG AA contrast.
- Components use tokens only. Stylelint rejects colour literals (hex, `rgb()`, `hsl()`, named colours)
  outside `tokens.css`.
- `global.css` disables animation and transition for `prefers-reduced-motion: reduce`.
- Once chosen, fonts load through Astro's Fonts API, self-hosted and preloaded.

### SEO

- A `<Seo>` component in the base layout renders:
  - `<title>` as "Page — Name", or "Name — Headline" on the home page
  - the meta description
  - a canonical URL, always the production URL
  - Open Graph and Twitter card tags
  - `og:image`: the case-study cover, or the profile default
- JSON-LD: `Person` on the home page, `CreativeWork` on each case study. JSON-LD blocks are data, not
  executable script, so `script-src` doesn't apply to them.
- The sitemap lists production pages only.
- `<html lang="en">`, one `h1` per page, headings in order.

### Accessibility rules

- Landmarks: `header`, `nav`, `main`, `footer`. The first focusable element is a skip link to `main`.
- A visible `:focus-visible` style using `--color-focus`. It is never removed.
- Interactive elements are native `<a>` and `<button>`. Icon-only controls have an accessible name.
- Content images need `alt` text (the schema enforces it for covers). Decorative images use `alt=""`.
- Tap targets are at least 24 × 24 CSS px.
- A link that opens a new tab (the Cal.com link) says so in its accessible name.

## 6. Content

Content lives in `src/content/`. Every file is validated at build time by schemas in
`src/content.config.ts`, which imports Zod from `astro/zod`. Updating content means: edit a file, open
a PR, check the preview URL, merge.

**`profile`**: one YAML entry, loaded with the `file()` loader. Fields: name, headline, short intro,
email, Cal.com URL, social links (platform from a fixed list, plus URL), CV last-updated date, default
SEO description and default social image.

**`caseStudies`**: one folder per study, `case-studies/<slug>/index.mdx`, with its images alongside,
loaded with the `glob()` loader.

| Field | Rule |
|---|---|
| `title`, `role`, `timeframe` | required |
| `summary` | required, ≤ 160 characters; also the meta description and card text |
| `cover` | required; `image()`, so the file must exist |
| `coverAlt` | required, non-empty |
| `tags`, `client` | optional |
| `links` | optional; each has a label and an `https://` URL |
| `featured`, `order` | which studies appear on the home page, and in what order |
| `draft` | default `false`; drafts appear in development and preview, never in production or the sitemap |

The slug is the folder name: lowercase words separated by hyphens. MDX may only use the components in
`components/mdx/`, passed through the `components` prop; no ad-hoc imports.

**Other sections** (experience, skills, education and so on, as the owner's raw content requires) each
get a YAML file, a schema, a section component, and one line in `src/pages/index.astro`. The home
page's section order is that list; it is not made configurable.

**Syntax highlighting** is off (`markdown.syntaxHighlight: false`). Astro's default highlighter emits
inline styles that the CSP blocks. If code samples are ever needed, use a class-based highlighter.

**CV:** `public/cv.pdf`, linked with the `download` attribute and shown next to the date from
`profile`. Before committing a new CV, the owner strips the PDF's metadata. The README gives the commands:
`exiftool` to strip it, then `qpdf` to rewrite the file so the stripped data is really gone. The public
CV contains no home address or phone number.

**Placeholder content** until real content arrives: an obviously fictional name, an `example.com`
email, one sample case study using every field, and a placeholder CV PDF.

## 7. Security

### Threat model

The site has no server, no secrets and no visitor input. The realistic threats are:

1. Someone publishing through the owner's accounts.
2. A malicious dependency running at build time or shipping in the bundle.
3. Content injected through a third-party resource.
4. The site being framed for clickjacking.

### Content Security Policy: two layers

A `<meta>` CSP can't carry `frame-ancestors`, and every CSP a page receives is enforced, so the two
layers are split so they can't conflict:

- **Per page, as a `<meta>` tag from Astro** (`security.csp`). Astro adds hashed `script-src` and
  `style-src` entries for its own output. The spec adds these directives:
  `default-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'`.
- **As an HTTP header from `_headers`:** only `frame-ancestors 'none'`. That header never contains
  `default-src`, `script-src` or `style-src`.

A report-only CSP can't be delivered through `<meta>`, so there is no report-only rollout. Instead,
Playwright fails on any CSP violation on any page.

### `public/_headers`

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

HTML keeps Cloudflare's default caching, which revalidates on every request, so a deploy shows up
immediately. HSTS gets `preload` only after a custom domain is settled, because preloading is hard to
undo. If a sharing platform fails to show a page's preview image, relax `Cross-Origin-Resource-Policy`
to `cross-origin` for image paths only.

The email address is published in plain text. Obfuscating it would hurt screen readers and copy-paste
for little spam protection.

### Accounts and repository

- **MFA:** GitHub, Cloudflare and, later, the registrar use a passkey or authenticator app, never SMS.
  Recovery codes are stored offline.
- **Branch ruleset on `main`:**
  - require a pull request
  - require the `ci` status checks to pass
  - require the branch to be up to date before merging
  - block force pushes and deletion
  - nobody on the bypass list
  - zero required approvals, because GitHub doesn't let an owner approve their own PR
- **Merges:** squash merge only, linear history.
- **Cloudflare:** its GitHub app is installed on this repository only, and no Cloudflare API tokens are
  created. Cloudflare's deployment history is the audit trail and the rollback mechanism.
- **GitHub security features:** secret scanning with push protection, Dependabot alerts, and CodeQL
  default setup (which also analyses the workflow files).

### CI hardening

- Workflows declare `permissions: contents: read`.
- Every third-party action is pinned to a full commit SHA; Dependabot updates the pins.
- No `pull_request_target` trigger.
- CI holds no secrets.

### Supply chain

- pnpm settings in `pnpm-workspace.yaml`:
  - `minimumReleaseAge: 10080`, so a version must be seven days old before it can be installed
  - an explicit allow-list for dependencies that need build scripts
- CI installs with `--frozen-lockfile` and fails on `pnpm audit --audit-level=high`.
- Dependabot runs weekly for npm and GitHub Actions, groups its updates and uses `cooldown` with
  `default-days: 7`.
- Dependencies are limited to the list in §10.

### Custom-domain checklist (applies when a domain is added)

- Registrar account has MFA, transfer lock and auto-renew.
- DNSSEC enabled.
- A CAA record limits issuance to the certificate authorities Cloudflare uses.
- No dangling DNS records.
- `*.workers.dev` is redirected to the domain or disabled.
- Only then consider HSTS `preload`.

### Disclosure and privacy

- `/.well-known/security.txt` (RFC 9116) is a static file in `public/.well-known/` with `Contact`,
  `Expires` and `Preferred-Languages`.
  - A unit test fails once `Expires` is less than 30 days away or more than a year away.
  - An end-to-end test fails if `Contact` doesn't match the email on the site.
- No cookies, analytics, forms or third-party requests, so no consent banner is needed.

## 8. Build and deployment

```
branch ─► pull request ─┬─► GitHub Actions: ci.yml (§9)
                        └─► Cloudflare: preview build; preview URL posted as a PR comment
         squash-merge (checks green, branch up to date)
main ─► Cloudflare Workers Builds ─► production on *.workers.dev
```

**Environment modes**

| Mode | When | Drafts | Indexing |
|---|---|---|---|
| development | `astro dev` | shown | `noindex` |
| preview | a Cloudflare build where `WORKERS_CI_BRANCH` is not `main` | shown | `noindex`; `robots.txt` disallows everything |
| production | every other build: Cloudflare `main`, CI, a local `pnpm build` | hidden | indexable |

Production is the default mode, so a missing variable can never put `noindex` on the live site. An
end-to-end test asserts that the production build has no `noindex`.

**Cloudflare configuration:** `wrangler.jsonc` sets:

- the Worker name, chosen by the owner at setup (it becomes part of the `workers.dev` URL)
- `compatibility_date`, the setup date
- `assets.directory: "./dist"`
- `assets.not_found_handling: "404-page"`
- `assets.html_handling: "drop-trailing-slash"`

Build command: `pnpm build`. The deploy and preview commands keep the Workers Builds defaults.
`wrangler` is a pinned dev dependency, so those commands use the pinned version. Astro's `site` is the
production URL.

**Rollback:** select an earlier version in the Cloudflare dashboard (instant), or revert the PR.

**Local commands**

| Command | Does |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` | Production build into `dist/` |
| `pnpm serve` | Serves `dist/` through `wrangler dev`, with the real `_headers` |
| `pnpm check`, `lint`, `format:check`, `test`, `test:e2e`, `test:perf` | The same checks CI runs |

**`.env.example`** states that the project needs no secrets and documents the variables Cloudflare
sets during builds (`WORKERS_CI_BRANCH` and others).

**`weekly.yml`**, scheduled so it never blocks a PR: external link check, `pnpm audit`, and the
`security.txt` expiry test.

## 9. Testing

| Layer | Tool | Scope |
|---|---|---|
| Format | Prettier + `prettier-plugin-astro` | All files |
| CSS lint | Stylelint | Colour literals outside `tokens.css` |
| Types | `astro check` with the strictest TypeScript settings | `.astro`, `.ts` |
| Content | The build | Schema violations (§6) |
| Unit | Node's built-in test runner (`node --test`, which runs TypeScript natively), `*.test.ts` | `lib/` helpers, test helpers, content rules, `security.txt` expiry |
| End to end | Playwright on Chromium, WebKit and Firefox, against `pnpm serve`, `*.spec.ts` | Below |
| Accessibility | `@axe-core/playwright`, WCAG 2.2 AA rule tags, in light and dark schemes | Every page |
| Performance | Lighthouse 13 for floors 1 and 4, run from a dedicated Playwright project; Playwright page-weight check for floors 2 and 3 | Every page |
| Links | lychee, offline mode against `dist/` | Internal links, every PR (external links weekly) |
| Security | `pnpm audit`, CodeQL, secret scanning | Repository |

**On every page listed in the sitemap, the end-to-end tests check:**

- it returns 200
- no console errors and no CSP violations
- exactly one `h1`
- correct title, description, canonical and Open Graph tags
- every header from §7
- no horizontal scroll at 320 px

**Flows**

- Home page → case study → back.
- The copy-email button writes the address to the clipboard and announces "Copied".
- `mailto:` and Cal.com links are correct.
- `/cv.pdf` returns `application/pdf`.
- An unknown path returns 404.
- `/work/x/` redirects to `/work/x`.
- The skip link moves focus to `main`, and Tab reaches every interactive element.
- The production build contains no `noindex`, and `robots.txt` allows crawling.

If `wrangler dev` turns out not to apply `_headers` locally, the header assertions run against the
Cloudflare preview URL instead.

**Deliberately not included:** component unit tests (end-to-end tests cover rendered pages), visual
regression tests (until the design settles), load testing (the CDN absorbs load).

## 10. Dependencies

| Kind | Allowed |
|---|---|
| Runtime / build | `astro`, `@astrojs/mdx`, `@astrojs/sitemap`, `sharp` (Astro's image service; pnpm doesn't hoist it, so it's a direct dependency) |
| Dev | `typescript`, `@astrojs/check`, `@types/node`, `wrangler`, `prettier`, `prettier-plugin-astro`, `stylelint`, `stylelint-config-standard`, `postcss-html`, `@playwright/test`, `@axe-core/playwright`, `lighthouse`, `chrome-launcher` |
| CI actions (SHA-pinned) | `actions/checkout`, `pnpm/action-setup`, `actions/setup-node`, `lycheeverse/lychee-action` (CodeQL runs as GitHub's default setup, not a workflow) |

Adding anything else requires a written justification in its PR and an update to this list.

## 11. Adding things later

Each of these is out of v1. If one is added, it follows these rules.

- **UI framework island (React, Svelte, …):** only for a component the design spec names.
  - Install the official Astro integration.
  - Hydrate as late as possible (`client:visible` or `client:idle`).
  - The design spec raises floor 2 for that page explicitly.
  - Frameworks that server-render inline `style` attributes need a narrow `style-src-attr` allowance;
    avoid it where possible.
- **Page transitions:** CSS cross-document view transitions (`@view-transition { navigation: auto; }`),
  with no JS. Browsers without support simply navigate.
- **Analytics:** cookie-free only, such as Cloudflare Web Analytics. Adding it means a CSP entry, an
  update to floor 3, and a privacy note.
- **Contact form:** prefer a form service. A form built in-house needs:
  - server-side validation
  - a honeypot plus Cloudflare Turnstile
  - rate limiting, which needs storage
  - a transactional email provider
  - secrets kept in Cloudflare

  It also adds a Worker script, and `_headers` doesn't cover Worker responses, so that script sets its
  own security headers.
- **Custom domain:** the checklist in §7.
- **Blog:** an MDX collection following §6's rules, plus RSS.
- **CMS:** only if someone who doesn't use Git must edit content. Prefer a Git-based CMS so content
  stays in the repository.
- **Monitoring:** v1 relies on Cloudflare's built-in metrics and deployment logs. Add an external
  uptime check once a custom domain exists.

## 12. Delivery process

1. Read this spec. Don't re-decide §3.
2. Write an implementation plan and get the owner's approval before building.
3. Write tests first for `lib/` helpers and for each end-to-end flow.
4. Every change goes branch → PR → CI green → preview checked → squash-merge.
5. Stop and ask the owner before:
   - adding a dependency not in §10
   - adding any third-party request
   - relaxing a floor or a CSP directive
   - taking any action on accounts, DNS or hosting settings
   - publishing anything

## 13. Deliverables of the foundation build

- An Astro project matching §5, with the placeholder content from §6.
- `_headers`, `wrangler.jsonc`, pnpm settings, `.nvmrc`, `.env.example`.
- `ci.yml`, `weekly.yml`, Dependabot config, Lighthouse and page-weight checks, lychee config.
- The tests from §9, all passing.
- `README.md` covering:
  - what the project is
  - the stack
  - setup
  - environment variables
  - build
  - testing
  - deployment
  - security
  - updating content, including the CV metadata commands
- `docs/setup.md` listing the owner's manual steps:
  - create the GitHub repo and its ruleset
  - turn on secret scanning with push protection, Dependabot alerts and CodeQL default setup
  - create the Cloudflare account and connect Workers Builds to the repo
  - enable MFA on both accounts

## 14. Inputs and what comes next

| Input | Needed for |
|---|---|
| Worker name | Cloudflare setup; it sets the production URL used for `site`, canonicals and the sitemap |
| Raw content | Content & design spec: final schemas and home-page sections |
| Inspiration screens | Content & design spec: tokens, components, layout, motion |
| CV PDF, fonts | Content & design spec |
| Domain | Later; §7 checklist |

## 15. Amendments

**2026-09-24, during planning.** Checking the npm registry and upstream docs on the planning date showed
several assumptions were out of date:

| Change | Reason |
|---|---|
| Astro 6 → **Astro 7** | Astro 7.0 shipped on 2026-06-22 and is at 7.3; Astro 6 got its last feature release in May. CSP, content collections and `astro:env` carry over. Astro 7 also brings Vite 8, a stricter Rust compiler (every non-void element must be closed) and the Sätteri Markdown pipeline. |
| TypeScript pinned to **6.0** | TypeScript 7 exists, but `@astrojs/check` only supports TypeScript 5 or 6. |
| pnpm kept at **10** (not 11 or 12) | Dependabot can't parse the lockfile format that pnpm 11 introduced. Cloudflare's build image defaults to pnpm 10.11, so `PNPM_VERSION` is set explicitly. |
| **ESLint removed** | `eslint-plugin-astro` 3.x needs ESLint 10, but the accessibility plugin it relies on only supports ESLint 9 or older, so only a fork would bridge them. Strict `astro check`, Stylelint and axe on rendered pages cover what ESLint would catch here. |
| `@lhci/cli` → **`lighthouse` + `chrome-launcher`** | Lighthouse CI hasn't published a release in 15 months and bundles Lighthouse 12. Lighthouse 13 is run directly from a Playwright project, reusing Playwright's server and Chromium, and checks scores and metrics only. |
| Page weight measured by **Playwright** | Lighthouse 13 reorganised its audits, so byte and request budgets that read audit internals would be fragile. Playwright records every response directly, which is deterministic and browser-independent. |
| **`upgrade-insecure-requests` removed** from the CSP | Every subresource is same-origin and `*.workers.dev` is HTTPS-only, so it adds nothing in production. It would also rewrite requests on the local `http://127.0.0.1` test server to HTTPS and break them. |
| Vitest → **`node --test`** | Node 24 runs TypeScript natively, so unit tests need no dependency at all. |
| **`@types/node`** added | Needed to type-check the Node-based tests and config files. |
| `security.txt` is a **static file** | It's less fragile than generating it from a dot-directory route. Tests enforce the same guarantees: the expiry window and a `Contact` that matches the site's email. The optional `Canonical` field is dropped. |
