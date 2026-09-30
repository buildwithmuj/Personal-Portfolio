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
| 2 | Per page, brotli-compressed as visitors download them: JS ≤ 9 KB, CSS ≤ 13 KB (measured uncompressed until 2026-09-26, §15; inline `<style>` blocks count), fonts ≤ 2 files and ≤ 100 KB, total ≤ 500 KB (CV excluded) | Playwright page-weight check |
| 3 | No requests to any third-party origin, but for the two §15 names: the live weather and, once switched on, the visitor counter. No third-party script runs on any page | CSP + Playwright page-weight check |
| 4 | Lab metrics: LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 100 ms | Lighthouse |
| 5 | WCAG 2.2 AA: zero axe violations in light and dark schemes, plus a manual keyboard-only and screen-reader pass (VoiceOver or NVDA) on the home page and one case study before launch | Playwright + axe; release checklist |
| 6 | Zero CSP violations and zero console errors on every page | Playwright |
| 7 | MDN HTTP Observatory grade A+ on the production URL | Release checklist |
| 8 | No horizontal scrolling at 320 CSS px wide | Playwright |
| 9 | The build fails on invalid content, type errors, lint errors or broken internal links | CI |
| 10 | Works in the last two versions of Chrome, Edge, Firefox and Safari (including iOS); older browsers get readable content | Playwright on Chromium, WebKit and Firefox |

Field targets after launch (at the 75th percentile: LCP < 2.5 s, INP < 200 ms, CLS < 0.1) are the aim,
but they can only be read from Chrome UX Report data once traffic allows: the visitor counter (§15)
counts page views, not performance.

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
- **Branches:** `dev` is where work happens and is the repository's default branch. `main` is the
  release branch; production deploys from it.
- **Branch ruleset on `main`:**
  - require a pull request
  - require the `ci` status checks to pass
  - require the branch to be up to date before merging
  - block force pushes and deletion
  - nobody on the bypass list
  - zero required approvals, because GitHub doesn't let an owner approve their own PR
- **Branch ruleset on `dev`:** block force pushes and deletion. Direct pushes are allowed; CI runs on
  every push.
- **Merges:** a release is a pull request from `dev` into `main`, merged with a merge commit. Don't
  squash or rebase a release: that rewrites commits that `dev` keeps, so the two branches drift apart
  and every later release pull request shows old changes again. Short-lived branches merged into
  `dev` may be squashed.
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
- Dependabot runs weekly for npm and GitHub Actions against `dev`, groups its updates and uses `cooldown` with
  `default-days: 7`.
- Dependencies are limited to the list in §10.

### Custom-domain checklist (applies when a domain is added)

- Registrar account has MFA, transfer lock and auto-renew.
- DNSSEC enabled.
- A CAA record limits issuance to the certificate authorities Cloudflare uses.
- No dangling DNS records.
- `*.workers.dev` is redirected to the domain or disabled.
- Cloudflare zone features that rewrite HTML stay off: Email Address Obfuscation, Rocket Loader and
  automatic Web Analytics injection. Each injects a script the CSP would block.
- Only then consider HSTS `preload`.

### Disclosure and privacy

- `/.well-known/security.txt` (RFC 9116) is a static file in `public/.well-known/` with `Contact`,
  `Expires` and `Preferred-Languages`.
  - A unit test fails once `Expires` is less than 30 days away or more than a year away.
  - An end-to-end test fails if `Contact` doesn't match the email on the site.
- No cookies and no forms. The only analytics is a page-view count that sets no cookie and keeps
  nothing on the visitor's device (§15, 2026-09-30), so no consent banner is needed.

## 8. Build and deployment

```
work ─► dev ─┬─► GitHub Actions: ci.yml (§9) on every push
             └─► Cloudflare: preview build of dev (staging)
release: pull request dev → main ─► ci.yml must pass (branch up to date) ─► merge commit
main ─► Cloudflare Workers Builds ─► production on *.workers.dev
```

Work lands on `dev` directly, or through a short-lived branch and pull request into `dev` for bigger
pieces. Cloudflare's preview build of `dev` is the staging site.

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
- **Analytics:** cookie-free only. A page-view count by GoatCounter is built in, off until its address
  is set (§15, 2026-09-30); Cloudflare Web Analytics may replace or join it once the site has its own
  domain. Any other service means a CSP entry, an update to floor 3, and a privacy note.
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
4. Work lands on `dev` (directly or through a short-lived branch), CI goes green and the `dev` preview is
   checked. A release is a pull request from `dev` into `main`, merged with a merge commit once CI passes.
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

**2026-09-25, owner decision.** The repository uses two long-lived branches: `dev`, where work happens
and the default branch, and `main`, for releases. It replaces "branch → PR → squash-merge into `main`":

| Change | Reason |
|---|---|
| `dev` + `main` branch model | The owner wants a working branch separate from the release branch. `dev` gets a Cloudflare preview (staging). `main` stays production and the build-mode logic is unchanged. |
| CI also runs on pushes to `dev`; Dependabot targets `dev` | Checks run where work happens, and updates reach `main` only through a release. |
| Releases merge with a **merge commit**; squash-only is dropped | Squashing or rebasing `dev` into `main` rewrites commits `dev` keeps, so the branches drift apart and later release pull requests re-show old changes. |

**2026-09-25, CSS budget.** Floor 2's CSS budget rises from 20 KB to 28 KB per page (uncompressed; about 7 KB compressed). The owner approved the change when the designed home page reached 21.3 KB, so the rise-on-scroll, hero effects and animated cards could stay. `tests/support/page-weight.ts` enforces the new value.

**2026-09-26, CSS budget.** Floor 2's CSS budget rises again, from 28 KB to 32 KB per page (uncompressed; about 6 KB brotli-compressed). The owner approved it when the watch-face clock and the Show / Hide section toggles took the home page to 29.8 KB, after dead CSS and unused tokens had already been removed. The Lighthouse floors still guard real-world speed.

**2026-09-26, CSS measured compressed.** Floor 2's CSS budget now measures what visitors download: each page's stylesheets and inline styles, brotli-compressed file by file, at most 8 KB. The owner chose this when the Skills section and the About pills took the home page to 34.8 KB uncompressed (6.7 KB compressed), so the budget tracks the real cost instead of needing a new raise with every feature. Later the same day JavaScript moved to the same measure, at most 6 KB compressed (about 2.3 KB then, against 5,069 of the old 5,120 decoded bytes), when the owner asked for the testimonial rotation and the engagement features without further budget rounds. Fonts keep their decoded-size budget. `tests/support/page-weight.ts` enforces both. At the v1 launch the CSS limit rose to 9 KB compressed: the weather scenes and the pause-animations control took the home page to 8.3 KB, of which about 0.9 KB is the testimonials section's styling, shipped even while every quote is a placeholder and the section is hidden.

**2026-09-25, GitHub Pages preview.** At the owner's request, `.github/workflows/pages.yml` deploys the `dev` branch to GitHub Pages as a preview (noindex, placeholders visible) at `https://buildwithmuj.github.io/Personal-Portfolio/`. Its deploy job is the only place any workflow has write access, and only `pages: write` and `id-token: write`, which GitHub Pages requires; `tests/unit/workflows.test.ts` enforces that. The build sets `PAGES_SITE` and `PAGES_BASE`; every internal link goes through `withBase()` (`src/lib/paths.ts`), and the All work page moved to `/projects` so it cannot clash with the `/work/<slug>` folder on Pages. Cloudflare remains the production host.

**2026-09-26, v1 launches on GitHub Pages.** The owner launched v1 before buying a domain, so GitHub Pages becomes the live site until the move to Cloudflare. `pages.yml` now builds `main` in production mode (indexable; placeholder testimonials and draft case studies hidden) on every push to `main`. Pages hosts one site per repository, so the `dev` preview ends. `pages.yml` runs from `workflow_run` after `ci` succeeds for a push to `main` in this repository, so changes go live only once CI passes, and it checks out the commit CI tested (manual builds take `main`). `tests/unit/workflows.test.ts` pins all of this, and CI builds the site under the `/Personal-Portfolio` base and fails on any internal URL that skips it. The owner chose to ship three known placeholders: the voice intro audio, the CV PDF, and the drafted case-study stories with stock images. The `# PLACEHOLDER` guard in `astro.config.ts` still runs only for Cloudflare builds.

**2026-09-27, live weather and the Lagoon theme.** Floor 3 gains one exception, at the owner's request: the top bar fetches London's current weather from Open-Meteo (`https://api.open-meteo.com`, free, no key, no cookies) in the visitor's browser, so the clock's reading and the hero's weather scene are live. The build still fetches a reading, which shows first and is all that shows without JavaScript; the browser keeps its answer for 15 minutes per tab. The CSP adds `connect-src 'self' https://api.open-meteo.com`, the privacy notice explains the request, `tests/support/page-weight.ts` allows that one origin, and the footer credits Open-Meteo as its CC BY 4.0 licence asks. The hourly scheduled rebuild is gone: GitHub ran it for only 2 of about 13 slots overnight, and the live fetch makes it unnecessary. The same day the owner chose the Lagoon palette from their Feral UI gradient export: a slowly flowing Lagoon band crowns the hero card (a small canvas port of the export's Flow type, about 1 KB, paused by reduced motion and the pause button), and the accent moves from indigo to deep lagoon blue (`#0b6f8e`, 5.7:1 on white) with navy for hover and aqua on dark.

**2026-09-27, Blue sky band and the JavaScript budget.** The owner swapped the hero's Lagoon band for their Feral UI "Blue sky" export (its Live Sky type), ported as a WebGL shader in `src/components/SkyGradient.astro`. It draws at CSS pixels, about 30 frames a second, compiles off the main thread where the browser supports `KHR_parallel_shader_compile`, and holds still under reduced motion, the pause button, a hidden tab or when scrolled off screen; without WebGL the export's colour stops show as a CSS gradient. It also keeps that CSS gradient when WebGL reports a software renderer (SwiftShader, llvmpipe), as on machines without a usable graphics card and in headless browsers: there the shader would run on the CPU and compile on the main thread, which cost CI's Lighthouse run about 900ms of blocking time on the home page. The export's 2% grain overlay is left out, because it needs a `data:` image the CSP blocks. The shader took the home page to 6.8 KB of compressed JavaScript, and compacting it would have saved only about 125 bytes, so the owner raised floor 2's JavaScript budget from 6 KB to 7 KB compressed. The palette follows the band through the whole site, replacing Lagoon: the accent is the sky's `#6699e6` deepened in the same hue to `#2661ba` (6.0:1 on white; the palette's own blues reach only 2.9:1), with navy `#1f3f7a` for hover and `#80b3ff` on dark, and every glow, tint, weather scene and gradient takes the sky's blues. The same day, the pause button stopped freezing one-off entrances on their first frame (which had hidden the hero headline for returning visitors who had paused): it now holds only looping animations, while entrances finish and scroll-linked effects follow the page.

**2026-09-27, Blue sky throughout, and a fuller CV.** After trying glassy, deep and animated sky buttons and then three flat ones on the live site, the owner chose flat: every primary button is a solid sky-blue pill with an arrow that nudges forward on hover, and secondary buttons are flat white with a hairline edge (no shading, glow or lift anywhere). The Let's work together section closes the page on the same living sky that opens it (Shell's `sky` option, drawn at half resolution; its intro uses the full text colour, since muted grey fails on the deeper blues). Case-study covers keep their images but take the sky's hue through a CSS blend layer (`.sky-grade`), so the violet stock renders read as sky blue; the image files are unchanged. The hero's avatar, name and role sit 16px lower, clear of the band's edge. The CV page gains each role's highlights, education, languages, interests and the CV-only skills, all from the owner's 2026 CV, and every CV section collapses like the home page's. `public/cv.pdf` is now that CV, exported from Word without the phone number; `exiftool` and `qpdf` weren't available, so its author and software fields were blanked in place instead of by the README's commands. The favicon set (SVG, ICO and Apple touch icon) is "MS" in bold Mona Sans, outlined to paths since icons cannot load web fonts, in navy on the sky gradient; the avatar keeps its photo but its flat blue backdrop is keyed out and replaced with the same sky. To calm the Skills & certifications section, its 3D keycaps and tick badges become flat chips (pale sky for skills, white with a sky edge for certifications), after a trial of a shake-to-sort jar the owner decided against; and the cursor glow across section frames is removed, which the owner may bring back.

**2026-09-27, details and personality.** After trying each on the live preview, the owner kept:
- **Top bar:** the social links move from the top bar into the centre of the hero's sky band, so the bar holds the clock (left), the links (centred on the page) and London's weather (right). At the top of the page the bar's lower corners are square, so it joins the hero's frame; they round off as the page scrolls.
- **Hero:** an availability pill ("Open to new roles and projects", a draft line) with a softly pulsing dot, and the headline's closing words set in an editorial italic serif (a system serif for now; a self-hosted one would need the owner's OK and fits the two-font budget).
- **About:** the card signs off with "M. Shah" in that italic over a drawn flourish, writing itself on as it scrolls into view (a stand-in until the owner's own signature is traced to SVG), and a "Right now" panel (Building, Learning, Training; drafted lines).
- **Site-wide:** pages cross-fade into each other (CSS cross-document view transitions, no script; off under reduced motion).
- **Case studies:** each gains a scroll-driven reading-progress bar and a "Next case study" card.

A four-language greeting was tried and dropped. The testimonials become Portfolik-style post cards (grid on desktop, one every three seconds on phones), still hidden live until real quotes replace the placeholders. An "interview my avatar" section is banked for later.

**2026-09-27, the chain and the CSS budget.** Later the same day the owner reworked these on the live preview. The availability pill moves level with the name at the hero's right edge. On phones, where that row is too narrow, it sits at the card's top right as in Portfolik: the pause button moves to the top left, and the band grows from 112px to 136px so the social links sit clear below the pill. The signature becomes one flowing pen stroke in the style the owner picked, drawn on as the card scrolls into view: an original, until the owner's own is traced, at the end of the About links on desktop and under the statement on phones. The "Right now" panel becomes a white card (the labels, a large title, when it was last updated from `profile.nowUpdated`, and a "Say hello" link) over a Blue sky glow, with the items on frosted tiles. The grey section shells join up like links in a chain, after an owner's reference: the gap between shells grows from 10px to 40px, and a neck with concave sides bridges it, from Selected work down to the testimonials; Contact, crowned with the sky, stands on its own. As in Portfolik, the hero stays 10px above the About card, and the About card's frame runs straight into Selected work's shell (no gap, square where they meet), so the two read as one grey panel. The top bar's watch keeps a single crown, centred on its right edge. These took the home page to about 9.5 KB of compressed CSS, so the owner raised floor 2's CSS budget from 9 KB to 10 KB compressed.

**2026-09-28, the pause moves to the footer.** The owner found the hero's pause button took space it didn't need, and asked whether it was needed at all. It stays, because WCAG 2.2.2 (level A) requires a way to pause anything that moves on its own for more than 5 seconds (hovering pauses only the sector strip, and only for a mouse), but it moves out of the hero into the footer of every page as a "Pause animations" toggle beside the links. It keeps its `aria-pressed` state and the choice remembered on the device, and stays hidden without JavaScript or under reduced motion. The same day, on phones, the availability pill shortens to "Open to new roles" with its last word rotating through `profile.availabilityShort` (roles, projects) like the role line, while screen readers still get the whole line. The owner's photo is cut out of its flat blue backdrop (a 5.5 KB WebP with transparency) and sits on its own small live sky, the same `SkyGradient` as the band, so its background moves with the band's colours.

**2026-09-28, named clients in the hero.** The owner confirmed they are cleared to name eleven clients from their professional work (GSK, Equiniti, Acacium Group, The Open University, BASF, Proximus, PeoplePlus, Barclays, BP, TPx, Brent Council), knowing the logos may make some anonymised case studies identifiable. The hero's sector strip becomes a logo strip, "10+ years with teams at", scrolling as before. The logos are the companies' current official marks (from Wikimedia and the companies' own sites, fetched with the owner's OK), each turned into a small navy PNG (84px tall, shown at 28px; about 35 KB for all eleven) with the colour baked in: coloured and dark shapes turn `#1f3f7a`, white knock-outs stay clear. The content spec §10 guard now blocks only the one former client not cleared; the case studies stay anonymised. The same day the hero's sky band stopped rising in with the content on load, so it is there from the first frame, and white workflow line-art was added over it: tangled lines run into the social links and leave as clean parallel lines, drawing in once, with a light now and then along each (held by the pause toggle).

**2026-09-28, About and "Interview me".** The About card loses its personality pills (the owner felt they didn't represent them well), and on phones the signature signs off below the Play my intro and View CV links. The How I work section is removed: its two methods become answers in a new "Interview me" section instead (`src/components/sections/Interview.astro`, after Skills). Recruiter-style questions sit as pills; picking one plays out like a chat, the question as the visitor's bubble and the owner's answer beside their photo, labelled as written by them, not an AI. The pills are native radio buttons, so it needs no JavaScript. The answers are drafts from the CV, skills and old method steps (`profile.interview`, `draft: true`), shown only in preview builds until the owner rewrites and confirms them, so until then the live site shows neither How I work nor the interview.

**2026-09-28, signature and weather.** The owner picked "M Shah" set in Herr Von Muellerhoff (SIL Open Font License 1.1) for the About card's signature, from a sheet of script faces. It is converted to one SVG outline, so no font file ships, and revealed left to right (a `clip-path` wipe) as the card scrolls into view. The hero's ambient weather layer (drifting specks, clouds, haze, rain, snow and a storm flash) is removed. London's live weather now shows in the top bar as a small line icon for the conditions beside the temperature, one of seven (clear, cloud, fog, drizzle, rain, storm, snow; shapes after Lucide, ISC), swapped when the reading refreshes.

**2026-09-28, a typical day.** Later the same day the owner removed the signature altogether: a handwritten script sat at odds with the site's modern, technical positioning. The About card's "Right now" panel (three lines and an "Updated" date, which felt pointless) becomes "A typical day": the owner's weekday from their own answers, in three stacks (Morning, Building, Learning) of timed tasks (`profile.day`). The board ticks the day off in the owner's time zone: a task is done once the next has started, the one under way is marked "now", and the header counts "3 of 8 done today". It checks once a minute, holds while animations are paused, and without JavaScript simply lists the tasks. Its script took the home page to about 7.2 KB of compressed JavaScript, so the owner raised floor 2's JavaScript budget from 7 KB to 8 KB compressed. The hero's client logos also became quieter, after the owner's DigiBlu site: every logo in one ink (the navy PNGs shown black) at 40% strength, rising to 65% while the strip is hovered and to full strength on the logo under the pointer.

**2026-09-28, the typical day as a widget.** The owner found the board unengaging and wanted it to feel like an app worth showing off. Four widgets were tried side by side (a Reminders list, two "Building / Learning right now" cards, a tabbed app with a day chart, and a compact to-do); the owner kept the Reminders one (`src/components/DayReminders.astro`, logic in `src/lib/day.ts`). A live sky header shows "A typical day", the local time and "3 of 8 done", over "Tasks for today", which scrolls itself one task every 2.4 seconds like a list on a watch: the task in focus sits centred at full size, its neighbours smaller, with the viewport's edges fading out. It starts on the task under way, loops without rewinding (the list is drawn twice; the copy is hidden from screen readers), and holds while hovered or focused, under reduced motion, or while animations are paused. Rows keep at least 80% opacity so their text keeps its contrast. A round "+" says hello. The same day, a regression was fixed: About's script now sits between About and Selected work in the page, which had broken their join, so the join now finds the next shell with `~`, and a browser test guards it.

**2026-09-28, About finished.** The owner closed the About section with three refinements. The statement's scroll-linked fill now starts from a light grey (`--color-text-unread`) and runs from `cover 40%` to `cover 75%`, just past where it sits on load even on a tall screen, so it visibly reads itself in (before, it began from the dark muted grey and was half filled on load). The day widget's "+" became a labelled "Let's talk" blue pill under the list, which gives the tasks the full width; its list is drawn three times, so there are tasks above and below the focused one at any hour, and its edge fade is lighter. The stats became widget tiles, chosen from tiles, activity rings and watch-face tiles side by side: each number counts up over its label and a small picture of what it counts (a run of bars for the years, a dot per sector, a stack of case studies, an app icon per product).

**2026-09-28, icons.** The owner found the interface icons generic (thin Lucide-style outlines, the default of many AI-built sites) and chose Solar Bold Duotone by 480 Design from a side-by-side of ten free families: filled shapes with a second tone at half strength, which takes the sky blue wherever an icon is drawn in the accent. The 26 icons the site uses live in `src/lib/icons.ts` (coordinates rounded to 0.1 on the 24px grid) and draw through `src/components/Icon.astro`; the top bar's weather keeps its swap-on-refresh sprite, now built from the same set. Solar is CC BY 4.0, so the footer credits it ("Icons: Solar"), beside the Open-Meteo credit. Brand marks (X, LinkedIn, TikTok, GitHub and the client logos) keep their own shapes.

**2026-09-28, Framework7 icons.** Seen in place, the duotone icons felt cartoonish, and the owner asked for something more premium. Light line icons (Hugeicons) and glass buttons were tried: see-through domes of Blue sky glass on the round icon buttons, from a reference the owner supplied, with ten icon families compared inside the lenses. The owner kept the icon family they picked there, Framework7 Icons (MIT; solid shapes modelled on Apple's SF Symbols), and dropped the glass, so every button keeps its original look. The icons are rounded to 0.01 on their 56px grid, with a space where a rounded whole number meets a following `.5`; without it the numbers fused and the menu icon's path broke, which the pages' console-error test caught. The footer credit reads "Icons: Framework7". The menu keeps its 2 × 2 app grid (Framework7 `square-grid-2x2`), like a watch's app screen, rather than three bars. "Let's work together" keeps its original thin outline copy and copied marks on the Copy email button: the owner found them softer there than a solid black shape; its email and CV icons are Framework7, as elsewhere. About's Play my intro sat 1.4 to 1.9px above View CV, because its custom element was inline and wrapped the button in a taller line box; it is now a flex box, and a test holds the two icons to one centre line. The About stats were tried as widgets after a reference phone widget (Blue sky tiles in a translucent halo, with an icon and a large number) and reverted; then five options were compared on a preview-only page, in an About card above the top of the typical day: proof tiles (a timeline, the sectors, a fan of covers, the products as app icons), editorial serif numerals, a live sky strip, frosted panes over a case-study render, and numerals with proof. The owner chose the live sky strip, without its dividers and with white text: the four numbers, each over its label, on one band of the hero's living sky (`SkyGradient`), still counting up, with a navy wash (`--stats-wash`) and a soft shadow under the text to keep white readable on the lighter blues. Section shapes were tried and not kept: folder tabs (alternating sides, no necks, each opening as it scrolled into view) and themed outlines (a certificate, a chat window, a quote card). Measured on the home page, folders hid about 40% of it on load (3,193px growing to 5,303px) and made 31 small layout shifts (0.047) as sections opened, against none without them. The sections keep their frames and necks, but the owner kept the opening: on the home page, each collapsible section (Selected work, Skills, Interview me, What people say) is closed below its heading until it scrolls into view, then slides open over 800ms and stays open (`Shell.astro` adds `.is-open`, then `.is-settled`, when content may spill over the edges again). It runs only with the scroll reveals, so without JavaScript or under reduced motion every section is simply open; focus inside opens a section at once. Interview me gains the collapse toggle, with a microphone icon while closed. The gap under "10+ years with teams at" grew from 16px to 24px, so the logos don't crowd the label. The About statement's greeting, up to the owner's job title (`jobTitle`), is now full colour from the start (on a tall screen only its first letter had been), and the rest reads itself in over a shorter stretch of scrolling, `cover 40%` to `cover 58%` (it was to `cover 75%`).

**2026-09-28, Selected work as a bento grid and a swipe deck.** The owner wanted Selected work to stand out without distracting. Five layouts were compared on a preview-only page (a bento grid, a hover-reveal index, stacking cards, a swipe deck and a spotlight); the owner chose the bento grid for desktop and the swipe deck for phones. They are one list of tiles (`WorkShowcase.astro`), restyled by width: on desktop the featured project spans two columns and two rows beside two tiles, over a wide one; on tablets two columns, the featured project across both; on phones a row that runs to the frame's edges and snaps card by card, the next card peeking in, with a dot per card that grows into a blue pill for the card in view (a scroll-driven animation, with no script: the page's JavaScript was 195 bytes under its budget; the dots count the cards where unsupported). Each tile shows its cover, the title in white on a navy fade (`--gradient-cover-fade`), and the sector (or a personal project's status, `caseStudyDetail`) and years as chips; the featured one adds its summary. The whole tile is the link, it lifts on hover with a pointer, and the Work / Personal projects switch works as before. A snapped card sits exactly at the edge of its fully-in-view range, so each dot is lit from halfway through its card's arrival to halfway through its leaving. The comparison's swipe deck had scrolled the whole page when a step fell between snap points; the shipped deck has no arrows.

**2026-09-28, the Toolkit.** The owner found Skills & certifications the least satisfying section and wanted their tools shown as logos. It is now the **Toolkit** (heading and top-bar link; intro "Skills, tools and the certifications behind them."): the tools as app icons, each logo in its brand colours on a white rounded tile (Claude, ChatGPT, Kimi, Jira, Power BI; SVGs in `public/tools/`, CC0 from SVG Logos and Simple Icons, with OpenAI's and Kimi's marks black as their own brand guides have them), the skills as a two-column list, and the certifications as credential cards with their issuers (`skills.yaml` gains `tools`, and each certification a `title` and `issuer`; the CV page lists the titles). Three layouts were compared side by side; the owner chose one card with a Tools / Skills / Certifications switch that turns to the next group every three seconds on its own. The turning is CSS only (the page's JavaScript was 195 bytes under budget): the switch starts with nothing picked (`Switch` gains `start`), the groups share one cell of the card so it keeps the tallest group's height and never jumps, and each tab lights in step with its group; later groups start part-way round the loop rather than after a delay, which would leave their tabs lit while waiting. Hovering or focusing the section pauses it, as does the footer's pause (WCAG 2.2.2); picking a group stops it there; under reduced motion it holds still on the tools. The groups not showing are transparent, not hidden, so screen readers read all three in order.

**2026-09-28, Interview me as "Ask me", and the JavaScript budget.** The owner wanted Interview me unconventional and clever but functional. Of five directions (Ask me, a question deck, a magazine interview, an interview tape and a self-playing thread), three were mocked up side by side and the owner chose **Ask me**: a box that looks like an AI prompt, badged "No AI", which isn't one. As the visitor types, it suggests the owner's own written questions (`src/lib/ask.ts`: every meaningful word must start a word in the question or its answer, filler like "how do you" ignored, question matches first), and picking one shows its answer, signed "Answered by Mujtaba, not an AI". A question with no written answer sets the last answer aside and offers "Send me this question", an email to the owner with the question in it. It is a WAI-ARIA combobox (arrow keys, Enter, Escape, `aria-activedescendant`), the answers sit in a polite live region, the suggestions drop over the card so nothing shifts, and without JavaScript every question and answer shows in turn. The intro reads "Ask me anything. There's no AI here: these are my own answers." Its script is about 0.9 KB compressed, so the owner raised floor 2's JavaScript budget from 8 KB to 9 KB. With the placeholder testimonials' rotation also on (both show only in preview until their content is real), the home page comes to 9,067 of 9,216 bytes; highlighting the typed letters in the suggestions was dropped to make room. Draft answers still show only in preview builds.

**2026-09-28, What people say: highlights and proof.** The owner was happy with the testimonials but open to something better; of five ideas (marker highlights, a 360° feedback ring, praise counted as a chart, a wall of words, verified links), three were mocked up side by side and the owner chose **marker highlights, verified**. The cards stay as they were; each quote's key phrase (`highlight` in `testimonials.yaml`, word for word, or the build fails; split out by `splitQuote`) takes a sky highlighter stroke (`--gradient-marker`) that sweeps across line by line as the card comes up the screen (a scroll-driven animation where supported and motion is allowed; otherwise it simply shows, and it follows the page even with animations paused). Where it was given moves from a corner mark to a line at the card's foot: with the recommendation's address (`url`), "Verified on LinkedIn" as a link; without it, just "LinkedIn recommendation", so a card never claims to be verified without the link to prove it. The placeholders carry highlights but no addresses. The same day the typical day's header ("A typical day", the London time) turned white with the stats' soft navy shadow, over a navy wash on the text's side (`--sky-text-wash`): navy text was hard to read on the deeper blues, and the wash keeps white readable where the sky drifts pale and on the pale fallback gradient without WebGL. Those changes took the home page's CSS to 10,373 bytes against the 10 KB budget; removing four tokens nothing used any more (`--color-blob-1`, `--color-blob-2`, `--color-key-edge`, `--gradient-now-glow`), a flat marker in place of a six-stop gradient, and a few redundant wrappers brought it to 10,278, and the owner raised floor 2's CSS budget from 10 KB to 11 KB compressed: the styles for Interview me and the testimonials ship even while both sections are hidden as drafts.

**2026-09-28, Let's work together: invitation first, and the sky kept.** The owner wanted the contact section to flow better: every field had the same weight and the call came last. Three directions were mocked up (two paths, invitation first, a new message), options 2 and 3 were built for real on a preview-only page, and the owner chose **invitation first**. Under the sky, a card leads with the call: the availability pill, a large "Let's talk it through." (its accent in the serif), the booking button and a short line; then one quiet line holds the email with its copy button, the CV and the social links as icon chips named by platform. The intro is shortened to "Hiring, or have a process that needs untangling?", and the Framework7 mail icon, used only by the old email field, leaves `src/lib/icons.ts`. The same day the owner explored the site's colour: partner colours for the Blue sky (Dawn, Lagoon, Lilac hour, Dusk, Citrus, and a sky that follows London time) and other Gradient Builder styles (iOS, Flow, Retro, Silk, Aurora, Mesh, Glassy, Prism), then tried Dawn silk and Blue prism across the live page behind a preview switch, and kept the original Blue sky.

**2026-09-28, release v1.1.0: Interview me goes live.** For the release the owner published the draft interview answers "for now": `profile.interview.draft` is false, so Ask me shows on the live site, and browser tests now cover it (the first answer signed by the owner, typing and Enter, the arrow keys, the email for an unanswered question, and every answer without JavaScript). The answers were drafted for the owner from the CV, skills and method, while the section signs them "not an AI", so they are the owner's to rewrite in their own words. The availability line ("Open to new roles and projects") loses its draft mark. The placeholder testimonials stay hidden: they are invented people and quotes. Firefox in CI measured About's join with Selected work 0.00006px apart from layout rounding, so that test rounds the gap to a hundredth of a pixel.

**2026-09-28, Drop an email.** After the release the owner gave email a button of its own beside the call: "Drop an email", a white pill the height and shape of "Book a 30-minute call", opening a message to the owner. Its icon is Framework7's envelope, smaller and set to the right of its grid with three speed lines trailing it (`send-mail`), and it flies a few pixels forward on hover. The address line with its copy button, and "Rather write? My email's below." after the call, are removed, so the line beneath the card holds only View CV and the social links, and `CopyEmail.astro` goes. When the booking panel opens, the calendar takes the whole row and the email button moves beneath it; on phones the two buttons stack at the card's full width. The address itself still shows on the CV page.

**2026-09-29, the CV over the page.** On the final day of amendments before release, the owner asked that View CV stop leaving the home page, after the CV Portfolio Template's arrangement. On the home page, View CV (in About, and in Let's work together) now opens the CV over the page (`src/components/CvViewer.astro`, a native modal `<dialog>`): the page dims navy behind it (`--color-scrim`), and a white card holds a bar (the owner's name, "Curriculum Vitae", Download PDF and a close button) above the CV as one scrolling document (the header with contact details and summary, then experience with each role's highlights, skills and certifications, education, languages and interests), from the same content as the CV page. It closes with the button, Escape or a click on the dimmed page; focus starts on the close button and the page behind stops scrolling. On phones it rises as a sheet from the bottom. A Ctrl, Cmd or Shift click still opens the CV page in a new tab or window, and without JavaScript the links go to the CV page. In Let's work together, View CV becomes an icon chip at the head of the social links: Framework7's `doc-person-fill` (a document with a person on it, the usual sign for a CV), named "View CV" and shown as a tooltip on hover. The overlay took the home page to 8,645 of 9,216 bytes of JavaScript and 10,072 of 11,264 of CSS, compressed.

**2026-09-29, the CV branded, logos in blue, and answers in the owner's voice.** Seen in place, the owner liked the overlay but found the CV bland, and asked for it to be friendly to applicant tracking systems with light branding, as in the CV Portfolio Template. It now follows the template's document: a letterhead with the name (and a sky-blue full stop, hidden from assistive technology so the name reads cleanly) and the job title on a sky marker opposite the location, email and LinkedIn address, over a strong rule; then two columns, Profile (the site's subline, rather than the conversational "Hey, I'm…"), Experience and Education beside Skills and Interests as pale sky pills, Tools as blue pills, Certifications with their issuers, and Languages as ruled rows; section labels in small capitals led by a short blue bar; blue dot bullets; each role with its title and dates on one line and the employer in blue; and a foot with the name, a small sky orb and the CV's date. For applicant tracking it keeps real text in one reading order (the main column first), the usual section names as headings, and each role as title, employer and dates; on phones the columns stack. The PDF behind Download PDF, which is what such systems read, is the owner's own export from Word. The hero's client logos keep their quiet single ink, and the one under the pointer now turns the brand blue as well as full strength: a CSS filter (`--filter-accent`) turns the black ink into the accent, rendering as rgb(38 96 188) against #2661ba. Interview me's answers can now be heard in the owner's voice: an answer with an `audio` recording in `profile.yaml` gets a "Hear my answer" button beside its signature, the same player as About's Play my intro (`VoiceIntro.astro` gains its labels and a paragraph form, and plays one recording at a time), and a recording stops when the visitor moves to another answer. No answer is recorded yet, so none shows the button; its playback test switches on with the first recording. The home page came to 8,682 of 9,216 bytes of JavaScript and 10,464 of 11,264 of CSS.

**2026-09-29, Ask in the nav, and one CV icon.** The owner wanted Interview me in the top bar, desktop and phone, in one word; of Interview, Q&A and Ask, they chose **Ask**, which echoes the Ask me box. It sits between Toolkit and Contact, and like the section it shows only while the interview does (`visibleInterview` in `src/lib/content.ts`, shared with the home page); the six links still fit between the clock and the weather from 768px. The owner also found the document-with-a-person CV icon unclear, and picked from six (a document marked CV, solid or outline, the letters CV, a page of text, a profile card and stacked profiles) the **profile card**, Framework7's `person-crop-rectangle-fill`, now the one `cv` icon for View CV in About (in place of the page of text) and in Let's work together. The phone menu's icon row now leads with it too, named "View CV", ahead of the social links: on the home page it closes the menu and opens the CV over the page; elsewhere it goes to the CV page. Seen in place, the owner preferred About's original page of text, so the one `cv` icon is now Framework7's `doc-text-fill` in About, Let's work together and the phone menu alike. The logo hover test first ran with the strip scrolling, and in CI's WebKit the first logo slid out of view before the pointer reached it; it now holds the strip still (its reduced-motion layout) before hovering.

**2026-09-29, the weekly link check skips X.** The weekly job's external link check had failed since 28 September on one link: X answers automated checkers with 403 Forbidden whether or not the profile exists, so `https://x.com/buildwithmuj` failed on every page (27 of 519 links; the rest passed). `lychee.toml` now excludes X (and twitter.com) as it already excluded LinkedIn, which answers with status 999, and a unit test holds the exclusions to those two sites so every other external link is still checked.

**2026-09-29, a production-readiness review, parked, and the phone menu on the sky.** Four read-only reviews (security and privacy; client-side bugs; performance and GitHub Pages deployment; accessibility, SEO and content) found the site ready with fixes; their findings, numbered in five tiers, are kept in a local review file outside this public repository (some are security and privacy notes), parked by the owner until a design round is done (the scroll-to-top button, the phone menu, the Toolkit, Ask me, the booking journey, possibly buttons and icons, then an interview of each section). For the scroll-to-top button, seven variants were demonstrated in scrolling phone frames (today's; a section-aware pill; only on the way up; a sky orb; a mini dock with Book a call; a progress badge; a "Top" chip in the top bar); the owner kept today's. For the phone menu, six mock-ups were compared (today's grey panel, full-screen editorial, into the sky, a bottom sheet of tiles, the bar growing into a card of rows, and jump-or-ask); the owner chose **into the sky** and, seen on a phone, kept its layout but not its sky or its full screen. The menu (`TopBar.astro`) still drops the original grey panel from the bar, now with the links in large type (2rem) and, right beneath them, a white card with the availability, Book a 30-minute call and the CV and social links. Following a link, pressing Escape (focus returns to the menu button) or tapping anywhere outside the menu closes it, which settles review item 17's first half. The menu's code now runs before the weather request, so an older Safari's missing `AbortSignal.timeout` can't stop it.

**2026-09-29, one availability pill, the pill off the band, and the day as a watch.** The availability line now appears the same way everywhere, as the hero's white pill with a softly glowing green dot (`AvailabilityPill.astro`): in the hero, on the phone menu's card and in Let's work together, whose own plain dot is gone. On phones the hero's pill used to sit on the sky band, over its flowing lines; of three placements mocked up (under the role, a status dot on the photo, above the headline) the owner tried **under the role** (a row of its own under the name and role line, the band back at its desktop height) and returned the pill to the band: the aim was a calmer phone hero, to be approached another way. Of five ideas for that (the social links off the band, one rotating word instead of two, the logos at rest, softer flowing lines, lines that settle), the owner tried the first three on phones, then kept the band's links, the pill's rotating word and the moving logos after all, and settled on removing the band's workflow line-art (and its travelling pulses) on phones only: there the band is the live sky with the links and the pill, while wider screens keep the lines running into the links. The typical day became a watch, after the top bar's clock: the brushed-metal rim (`--watch-rim`, now shared with the clock), a ridged crown and a side button on its right edge, at the same size. Its face follows London's day and night on its own, white by day and, from 19:00 to 06:00 (`isNight`, `src/lib/day.ts`), black with a darker sky, white and pale-blue text; the crown is a button ("Night face", pressed at night) that switches the face by hand. The new styles took the home page's CSS, counting its inline blocks, to 11,497 bytes, so the owner raised floor 2's CSS budget from 11 KB to 12 KB compressed. The comparison pages are preview-only and removed once decided; while one exists, the production build splits shared components' CSS into extra inline blocks, which inflates the page's measured CSS.

**2026-09-29, calmer section bars, and Ask me.** A collapsed section's bar now has as much room above its title as below, so the title sits centred rather than low (`global.css`), and every collapse toggle is a plain chevron: the owner found the per-section icons tacky, so `Shell.astro` loses its `icon` prop and `icons.ts` the three that only it used. Let's work together's icon row is centred under its card. Interview me is renamed **Ask me** and rebuilt after an AI-chat card the owner shared; of four variations they chose D, a card as wide as the other sections' cards. Before a question it shows the sky ball, floating a few pixels up and down in place over a soft shadow (still under reduced motion), and "Ask me anything."; beneath come the questions as wrapping pills and a field with a navy send arrow. Picking or typing a question replaces the greeting with the answer, signed by a small ball, "Answered by" the owner's first name, "not an AI"; a question with no written answer offers to send it by email. The intro reads "Pick a question or type your own. No AI here: every answer is mine." Without JavaScript every answer shows, as before. On phones, of three layouts, the owner picked the questions in one row swiped sideways, with a smaller ball and greeting, which took the card from about 600–730px tall to about 330–370px. The field's default width had widened phone pages at 320–375px; it now takes only the room its row gives it.

**2026-09-29, the Toolkit, and back to top as a watch.** Over three rounds of side-by-side comparisons (`/trial/…` pages, preview-only and removed once decided), the owner settled the Toolkit's three tabs. **Tools** are a dock on a patch of the live sky filling the card: of four options (colour on hover, a spotlight, the dock, an orbit round the sky ball) they chose the dock and kept the orbit for a later release. Where there's hover, the icon under the pointer magnifies, its neighbours a little, with its name as a tooltip; on touch screens the names show beneath the icons and a gentle wave runs along the dock every six seconds. The icons size with the card (container units), so the dock fits at 320px. **Skills** are grouped pills in three phases, Understand, Build and Deliver (`groups` in `skills.yaml`, all eleven skills including the CV-only ones; the schema reports a skill in no group, in two, or not a skill at all), lighting blue under the pointer like Ask me's pills. On phones one phase shows at a time, picked from a segmented control of native radios (from the phone view of a Finder-sidebar mock the owner otherwise declined), which took the phone card from 725px to 371px; the Toolkit's own rotation now answers only to its switch's radios. **Certifications** are soft folders in the Apple Files style, four across (two by two on phones), each with a short name and its issuer beneath (`short` in `skills.yaml`). Pointing at or focusing one tips its front forward and a certificate rises out, and a click opens a viewer (a modal `<dialog>`) that slides through the certificates and wraps round. The certificates are placeholders, one Blue sky blue each (`--cert-1` to `--cert-4`), until the owner sends images (`image: /certificates/<name>.webp`). Holographic cards were built first, then replaced by the folders at the owner's request and kept for later with the original folders. A Mac-desktop take on the Toolkit (folders opening Finder-style windows) was mocked up twice and declined. The back-to-top button becomes a round watch face, the first of three mocked up: the top bar clock's brushed-metal rim round a black face with a glare, the arrow in white, and the scroll-progress ring in a pale glare that turns sky blue at the bottom of the page. The Ask me and Toolkit styles took the home page's CSS 99 bytes over 12 KB, so the owner raised floor 2's CSS budget to **13 KB** compressed. The home page now comes to 9,077 of 9,216 bytes of JavaScript and 12,970 of 13,312 of CSS.

**2026-09-29, Selected work without dates, More case studies, and no CV page.** On phones the Selected work deck felt fiddly to swipe: it now moves one card per swipe (`scroll-snap-stop: always`), and every card rests at the frame's inset, the last one too, because the cards are sized against the section (container units) and the row ends with the room the last card needs. The owner asked for the dates to go: the tiles lose their timeframe chip and a case study its Timeframe fact (the `timeframe` field stays in the content, unused). A case study now ends with **More case studies**, the next four in order (wrapping round, never itself) as small cards in a row, swiped sideways on phones, in place of one large "Next case study". Calmer generated covers for the client work were tried and declined, and alternative layouts for Selected work are kept for a later release. The separate CV page (`/cv`) is removed: View CV (in About, Let's work together and the phone menu) opens the CV over the page as before, and without JavaScript it now opens the PDF. The profile's section copy that only the CV page used (experience, education and languages) goes with it. Testimonials' source link reads "LinkedIn" rather than "LinkedIn recommendation".

**2026-09-29, steadier browser tests.** Under load, WebKit's tests failed now and then: they clicked while a section was still sliding open (WebKit has no scroll anchoring, so the target moved), waited a fixed number of frames at about six frames a second, or sampled a moving animation over a short window. `tests/support/settle.ts` adds `scrollIntoViewSettled`, which scrolls to an element and waits until no section is still opening and no finite animation is still running, scrolling again if the element has moved out of view. Tests that watched motion now poll inside the page, and the test that clicks the Toolkit while it turns seeks its animations to a fixed moment. The check that no page scrolls sideways at 320px now settles every section first, which is how it found Ask me's field and the dock widening phone pages. An independent review of the whole round before release found four accessibility gaps, now fixed and tested: on phones, tabbing onto the skills' phases brings the skills forward (as focusing a folder brings the certifications), so focus never sits on a group out of sight; Ask me's faded questions stay readable while a visitor types (60% opacity rather than 40%, about 5.2:1); under reduced motion the tools can still be pointed at; and the certificate viewer steps rather than slides under reduced motion, announcing its count once per certificate.

**2026-09-29, the skies start as they near the screen.** The release's pull request failed floor 4 on the home page, 123–127 ms of blocking time against 100 ms, where the same commit had passed on its push. The round had taken the home page from five skies to eight, and each asked for a WebGL context as the page loaded, only to find software rendering on CI's runners and let it go. A sky now sets up its graphics only as it nears the screen (within half a screen's height), so the skies below the fold cost nothing at load and Ask me's balls nothing until they show; this also settles the production-readiness review's item on the skies starting at load. The home page is now at 9,123 of 9,216 bytes of JavaScript.

**2026-09-29, the production-readiness fixes, first round.** After v1.3.0 the owner took up the parked review in its tiers. A link to a section now lands on it: the sections above it, and the section itself, open at once with no slide (CSS `:target`), where before they opened as the page scrolled past and pushed the section out of sight (the hero's Book a call left Let's work together below a desktop screen). Ask me no longer says "not an AI" or "No AI here: every answer is mine", since the answers were drafted for the owner: it signs them "Answered by" the owner's first name, and its intro reads "Pick a question, or type your own." Nothing published says "Placeholder" any more, and a test on every page keeps it so, hidden text, image descriptions and link-preview tags included: the case-study covers are described as abstract renders, the certificate viewer drops its note, and This site's grey stand-in figure becomes a real diagram of how the site is built and checked. The Pages deploy builds only the commit main points at now, so re-running an older ci run can't roll the live site back, and a deploy is never cancelled part-way. Smaller fixes: pressing play then pause at once no longer reports "Audio unavailable"; the phone deck's dots keep up with the swipe under Pause animations; the pause is restored by a classic inline script in the head (its hash added to the CSP from `src/lib/motion.ts`, since Astro hashes only what it bundles), so a returning visitor who paused sees nothing move; Ask me's field wears the site's focus ring rather than a faint glow; About's statement is readable before it fills (#6b7078, 4.5:1 on the grey shell, from #c4c7cd at 1.7:1); a link followed in the phone menu hands focus to the menu button, so the CV opened from there returns focus to it; the privacy notice covers the pause preference, the weather reading's session-storage lifetime, Cal.com's own cookies once opened, and Ask me; pages declare British English (`en-GB`, `og:locale`) and their link-preview image's size; the draft example reuses a published cover, so no unused image ships. The page-level console test stubs the weather, so Open-Meteo's rate limit on a busy test machine can't fail it. The /cv print item fell away with the page. For the white text on the live sky, which fell to about 1.6:1 at the sky's palest (the About stats and the typical day's header; axe can't see text over a canvas), four fixes were compared side by side: today's, a deeper navy wash, navy text on the bright sky, and navy glass panels. The owner chose **navy text** (`--color-sky-ink`, #0c2454); the navy washes and the text shadow go, and the day's night face keeps white text on its darkened sky. (The release review then found the shader's linear burns can run darker than its tones, to about rgb(26 115 230), where the navy fell to 3.3:1: a faint white wash under the text, `--sky-ink-wash` at 35%, keeps the worst case at 5.85:1, and `tests/unit/sky-ink.test.ts` walks the shader's blend over its whole range to hold it above 4.5:1.) The link preview, a blank grey box until now, becomes the owner's pick of two designs: the headline on a Blue sky gradient beside the owner's photo on a sky ball, with the availability pill and the name and title beneath (1200 × 630, `public/og-default.png`; a unit test holds its size to what the pages declare). Play my intro is hidden until the owner records the real intro (the stand-in `intro.wav` is removed), and every production build now refuses a line marked `# PLACEHOLDER`: the GitHub Pages build, CI's builds and local ones, where before only a Cloudflare deploy checked; a unit test says so first. The owner kept the typical day's gym, times and live clock as they are. Seen again, the Toolkit's turning from group to group on its own was overdoing it, so it opens on the tools and holds still until the visitor picks another group; the rotation's keyframes and their pause and reduced-motion rules go with it.

**2026-09-30, calmer motion.** Asked whether the site overdid its animation, landing and scrolling on computers and phones, I found five or six things moving at once in the hero, and content that kept moving while it was read: sections slid open as they arrived and cards rose in late, so at the bottom of the page Let's work together's cards looked misaligned before settling (and clicks, and jumps to a section, could miss). The rule now: motion that answers the visitor or explains a change stays; motion that plays by itself goes, with at most one slow ambient movement in view. The owner approved all of it. Removed: sections sliding open on arrival (every section is simply open; the chevrons still hide one by hand, and the `:target` fix for jumps is no longer needed), About's statement filling from grey as it scrolls (plain text in full ink), and the testimonials' three-second auto-advance on phones, with its pause button (the dots choose). Toned down: the reveals are one short rise (12px over 400 ms, all of a piece: no stagger, no word-by-word headings, no zooming images); the hero's content rises once, together (500 ms), and its line-art draws in once and rests, without the travelling pulses; the client logos stand still, wrapped, on wider screens (phones, where they don't fit, keep the slow scroll); the availability dot is steady in a soft glow, and the pill says the same whole line on phones instead of rotating its last word (`availabilityShort` goes); the typical day sits on the task under way and moves only when the next begins; the dock's wave on touch screens runs once, as the Toolkit arrives, and not at all with animations paused. Kept: the live skies, the role line, the stats' count-up, Ask me's floating ball, the clocks, and everything that answers the visitor (the deck's dots, the watch's ring, the dock's magnify, the folders, the reading progress, the page cross-fade). The home page came down from 9,148 to 8,312 of 9,216 bytes of JavaScript and from 12,962 to 12,026 of 13,312 of CSS, and the browser tests run faster, with less to wait for. Seen on a phone afterwards, the Selected work deck still jolted: each card off to the right sat 12px low, as a scroll reveal waiting to rise, and rose into line only as a swipe brought it into view (measured frame by frame through a touch swipe). On phones the deck's cards now take no part in the reveals, so they sit level and a swipe moves them only sideways; the grid on wider screens keeps its rise. The owner then asked for the hero's travelling light back, slowed: it runs along the line-art at half its old speed, a nine-second loop, still only on wider screens. On phones, Ask me's single swiped row of questions felt off to the owner; of five mock-ups (the row, three then "more", a list that opens, chat suggestions, two columns of tiles) they chose **three, then "more"**: the first three questions as pills and a pill that opens the rest in place (the list that opens takes over if the questions ever pass seven). The owner also found that sending a question of one's own wasn't apparent, for three reasons found in the code: nothing said it was possible, a loose match hid the offer, and a question of only common words ("Who are you?") did nothing. Now a blue "Ask your own" pill ends the questions on every screen and leads to the field; a question with no written answer is quoted back over one clear "Email me this question" button (full width on phones), with the call as the other way in the small print; every sent question gets an answer or that offer, never silence; and under an answer found by typing, "Not what you asked? Send me your question" still sends the question as typed. On wider screens that offer first sat at the card's left edge under centred pills; it's now centred, like the greeting whose place it takes, with its lines balanced, while answers stay left-aligned as paragraphs to read.

**2026-09-30, a lighter phone menu, and the Toolkit as Windows.** The owner found the phone menu's white card (the availability pill, Book a 30-minute call and the icons) too heavy. Of five mock-ups (today's, just the icons, the icons with the call as a quiet link, the call joining the links, and the icons with availability as a plain line) they chose **the call joining the links**: "Book a call" is the list's last link, in the same large type and in blue, without the arrow so it lines up with the rest, and the CV and social icons sit beneath on the menu's own grey; the card, pill and button go. For the Toolkit, the owner kept the skills' phases as they were on phones and computers over three alternatives (the control on the sky, a swiped card per phase, numbered steps), then asked to see the three tabs as a Mac and as Windows, with Skills as a slide open in PowerPoint, and, being "more of a Windows person", chose **Windows** for all three. **Tools** are a Windows 11 taskbar along the foot of the live sky: a Start button (four squares in the accent, only the look), then each tool, lighting up under the pointer with its name in a tooltip (names beneath on touch screens; no clock, the page has enough time on it); the Mac dock, its magnify and its wave go. **Skills** is a slide deck in a window: the phases are its slides, their thumbnails down the side (beneath, on phones) are the phases' own radios with the picked one in PowerPoint's orange, and the slide shows its place ("1 of 3"), the phase in the italic serif over a sky rule, and its pills; every screen now shows one phase at a time (without `:has()`, every slide in turn). **Certifications** keep their folders in a window. Both windows have Windows' title bar (`WindowBar.astro`), no title since the tab names it, and its buttons work: closing Skills brings up the certifications, closing those goes back to the tools, and minimising either goes back to the tools, as a window goes to the taskbar; focus follows to that group's tab. Maximise is only the look, hidden from assistive technology. (A Mac title bar with the three dots was tried first on the certifications and replaced.) The release review asked for three changes, made before commit: the tools' names, first tooltips on hover (which a keyboard never reveals, and which vanished when pointed at), are always shown, beside each icon where the bar has room (a container query at 620px), as Windows can label its taskbar buttons, and beneath on narrow bars; the groups out of sight are hidden outright (`visibility`, inside `@supports selector(:has(*))`, so without `:has()` all three simply show), where before they were only transparent and Tab could land in them and pull the Toolkit back to a closed window, so the focus-follows-group script goes; and the deploy's `current` job runs bash with pipefail and fails loudly if it can't read main. Smaller: a CSP test that the built policy carries the inline script's hash; the link preview's size read from the PNG itself; the placeholder check only on `astro build`; the phone menu's link handling scoped to the menu; the window buttons' focus ring drawn inside them; Ask me's field keeping its own ring without `:has()`; the heading words' `.w` wrappers no longer clipping; the deck limited to four phases in the schema; and stale comments. The home page comes to 8,323 of 9,216 bytes of JavaScript and 12,156 of 13,312 of CSS.

**2026-09-30, the CV printed from the site, a visitor counter, and Search Console.** The PDF download was a Word export that had fallen behind the site (it still said nine years where the site says ten). It's now printed from the site's own CV: `scripts/cv-pdf.ts` (`pnpm cv:pdf`, after `pnpm build`) opens the built page in headless Chromium, takes the View CV pop-up's sheet and prints it to A4 as real, tagged text, two pages, adding the live site's address to the contact details since a downloaded CV travels without the site around it. On paper the two columns are floats, because Chromium misplaces a grid's rows when it runs on to a second page; the drawing order follows the reading order (letterhead, profile, each role with its own bullets, then the side column), for software that reads a CV in the order it was drawn; and the section labels' letter spacing is tighter, since at the pop-up's spacing they were read back with stray spaces ("E XPERIENCE"). The script notes a fingerprint of the words it printed (`scripts/cv-pdf.sha256`), and a browser test compares the live pop-up with it, so the pop-up and the PDF can't drift apart unnoticed again. Asked how to see how many people visit without cookies, the owner chose **GoatCounter** for now (Cloudflare Web Analytics once the site has its own domain; fuller analytics or another platform may follow in a later release). Floor 3 gains its second exception, at the owner's request: one request per page view to the owner's GoatCounter address, sent by the site's own few lines (`src/lib/analytics.ts`, `VisitCount.astro`) with `navigator.sendBeacon`, so **no script of GoatCounter's runs on the page** and the CSP needs only that address in `connect-src`. It sends the path, the page title, the referrer and the screen size, and marks a browser under automation; GoatCounter also sees the IP address and browser as any request shows them, sets no cookie and keeps nothing in the browser. Only the live site's own host counts: never a local build, a preview or a test. It is **off until `COUNT_URL` is set** in `site.config.ts` (the owner signs up and sends the code); until then the bundler drops the code and the CSP is unchanged. Switching it on adds 255 bytes of JavaScript (the home page measured 8,751 of 9,216 with it on) and must change the privacy notice in the same commit: a unit test fails unless the notice names GoatCounter exactly while the counter is on, and stops claiming "no analytics". A browser test, skipped until then, serves the built site under its live address and checks that one view is counted with no cookie and nothing stored. Lastly, `public/google3e3daf617cf37724.html` is Google Search Console's ownership file, supplied by the owner; it must stay published for the verification to hold. The owner then set the counter aside for now (it stays built and off) and asked for the contact section's CV icon to go, then to stay: it stays. Two small leftovers from the production-readiness review are closed: the skies hold still behind a pop-up (the CV, a certificate), which dims and blurs them anyway (one shared watch on every dialog's `open`); and the top bar's clock wakes as each minute turns and writes only what changed, where it rewrote itself every second. Asked about the icons, the owner wanted one rhythm: every small icon on the social links' white tile. That tile was written three times over (the hero's band, the phone menu, Let's work together); it is now one `.icon-tile` in `global.css`, and View CV in About and the play button (Play my intro, Hear my answer) sit on it too, a plain play or pause in place of the circled ones, each with its words kept beside it, since in About they are the way to the CV. The day watch's pulsing dot stays, and any further animation waits for a second release. The first real testimonial is in, from a LinkedIn recommendation the owner supplied, shortened to the card's 320 characters in the writer's own words; an odd card out now takes the whole row, so one real quote doesn't sit beside a gap, and the made-up ones still never leave preview builds. The owner also spotted a gap while scrolling: once the top bar floats as a pill, the page-coloured strip behind it ended at the bar's lower edge, so whatever scrolled underneath showed as slivers in the notches around its rounded lower corners (white against the hero's sky, or a lens of white between the bar and a section's own rounded top). The strip now reaches 10px below the floating bar (`bar-clear`, on the same scroll timeline that rounds the corners), so what passes beneath ends in a straight line clear of it; at the top of the page the bar still joins the hero's frame. Last, the owner found What people say flat beside its neighbours (the sky, the watch, the bento, the Toolkit's Windows, Ask me's chat). Of four mock-ups (a video call with live captions, a phone's lock screen with the recommendations as notifications, an inbox in a window, one voice at a time on the sky) they liked the call but found it distracting; of a calmer call and their own idea, **today's cards in the Toolkit's window**, they chose the window. The cards sit under `WindowBar` (which gains a quiet title, "Recommendations", and buttons that needn't lead to a Toolkit group) and fill the window from edge to edge, a hairline between them where there were grey gaps, at the owner's request. Its minimise and close buttons put the window away by collapsing the section, as its own toggle does, and focus goes to that toggle; maximise stays only the look. On phones, where one card shows at a time, the dots beneath become each person's initials in their circle, the one being read ringed (the owner's idea; still native radios, so it works without JavaScript). The section then joined the nav as **Reviews**, shown while there is a testimonial to show: the owner wondered whether seven links would crowd the bar and floated using the menu icon on computers too; I advised keeping the links in view, since a menu costs a click and hides what the page holds, and made room by dropping the weather's word (its icon and the temperature stay; the word is kept for screen readers). The bar fits at 770, 960 and 1280px. (In the copy interview the owner renamed the link **Recommendations**, the word on the section's window, finding "Reviews" a word for products; the links sit 16px apart to fit it. Home's address became `#home`, from `#page-top`.) Quotes are now limited to 250 characters (from 320), at the owner's request, and the first real one was cut to fit. The owner then supplied three more recommendations (LinkedIn and email), so the section now holds four real ones, each shortened to the limit by leaving sentences out, in the writer's own words, and the four made-up stand-ins are gone. A testimonial's `role` is now optional, since three arrived without one: the card leaves the line out until the owner has it. On reflection the owner came back to the call ("the Teams call approach is cool") and asked for **the calmer call on every screen**, so computers and phones behave alike; it replaces the cards in the window. Inside the same window there is a seat for each person (their initials in a circle, their first name) and one for the owner, listening; the seats are native radios, and beneath them are the words of whoever is picked, set large, with their name, role and a LinkedIn mark (every recommendation carries one, at the owner's word). The speaker's seat turns pale sky with three small sound bars by the name, the only movement, and a loop the footer's pause holds. Without `:has()` every person's words show in turn. Finally the owner found the Toolkit's Skills slide "a little incomplete": a title and a few pills over empty space. Each slide now reads as a finished one: a line under the title saying what the phase is about (`lead` in `skills.yaml`, drafted from Ask me for the owner to reword), a large pale slide number beside it, the pills, and a footer along the slide's foot with the phases in order and the slide's place in the deck; the thumbnails gain two faint lines, so each looks like a small slide. The owner then asked for the window itself to feel whole, where a white bar sat over bare grey: the title bar now names the file ("Skills.pptx"), a ribbon of the app's tabs runs under it (Home underlined in the deck's orange), and a status bar runs along the foot with the number of slides and the zoom. The ribbon and status bar are only the look, hidden from assistive technology. The home page comes to 8,708 of 9,216 bytes of JavaScript and 12,724 of 13,312 of CSS.

**2026-09-30, the copy interview.** Section by section, the owner put the site's words into their own, choosing from variations checked against their CV and LinkedIn export. **Hero:** the headline becomes "I redesign messy processes, automate them, and build products people actually use." (it should not read as automation alone); the line under it, "Ten years in consulting, the last five in process optimisation and intelligent automation, across the public sector, healthcare, education, financial services and telecoms, and building my own products along the way." (ten years of consulting, of which process work is the last five); and the rotating titles are Automation Analyst, Consultant and AI Product Builder. The search description and the link-preview image follow the headline, and the CV, whose Profile is the same line, was printed again. **About:** "Hey, I'm Muj, a consultant specialising in process optimisation and intelligent automation. I love digging into what AI can do for everyday work, and I build my own products to find out." The typical day is reworded as the shape most days take, not a record of one, and a task is now **ticked the moment its time comes**, the one under way included (its tick in the accent blue inside a softly pulsing ring, the earlier ones navy), where it used to wait for the next task to begin; the count takes it in. **Selected work:** the line is "What I've delivered for clients, and what I've built for myself."; clients stay unnamed; one title is shorter and six summaries tighter; the case-study pages themselves wait for a quick pass after the interview. **Toolkit:** the line is "The skills I bring, the tools I've worked with, and the certifications behind them." ("worked with", since some were used alongside the team that built with them: the owner wants the technical side shown without reading as a developer). The tools grow from five to nine, from the CV and LinkedIn: Microsoft 365, Power Apps, Power BI, RPA, APIs, Jira, Claude, ChatGPT, Kimi (the Microsoft 365 and Power Apps marks from Simple Icons 9.21.0, CC0, downloaded with the owner's leave; RPA and APIs drawn for the site). Nine names no longer fit beside their icons, so every name sits under its icon and a narrow bar runs on to a second row; the wide layout's container query goes. The slide lines are the owner's pick of plainer ones ("I find out how the work actually gets done." / "I design a better way and help build it." / "I see it through until people are using it."), the first drafts having read as written by a machine. Certifications follow LinkedIn: Power BI Data Analyst out; AI Fluency: AI Capabilities & Limitations and Claude 101 in; five folders in one row, three across on phones. **Ask me:** the owner asked for the questions an interviewer would put to a consultant, analyst or AI product builder, so two are reworded ("A project you're proud of?", "How do you build with AI?", which now answers with how they build using AI coding tools such as Claude Code or Codex) and one is made honest: "Which tools have you worked with?", answered as tools *delivered with*, some hands-on and some alongside developers, since the owner won't claim to have used every one themselves. Every answer is rewritten shorter and plainer; "Life outside work?" drops the languages for boxing, the gym and sauna, travel and side builds. The browser tests now find their two questions in the profile by a word, not by their full wording. One test helper changed with this: `scrollIntoViewSettled` also waits for every reveal on screen to have begun, because under a full parallel run WebKit's observer could start a card's rise after the helper had found nothing moving, and a click then landed on a moving target (seen as a phone test's pill not opening). **Feedback and Contact:** "Recommendations" proved too long for the nav, so the section is **Feedback** in the nav and as its heading (the nav link takes the heading's word, and the links go back to 24px apart); the window's title bar keeps "Recommendations", where they came from. The three people without job titles have them. Contact's line is "Hiring, or have a project in mind?", where it spoke of a process that needs untangling. **The case-study pages and the wide tile.** The owner found a case study's opening "messy": a label, the title, a line, the role and employer, then a row of pills, all before the picture. The head is now three lines (label, title, one line); the picture is a band (2:1, where it was 4:3), so the story starts within the first screen; and the facts wait beneath it in one white strip, as words: Role, With, and Focus (the tags, which were pills; `TagList` goes). The story card reads as numbered steps, each heading at the left with what it covers beside it and a hairline between steps, laid out by the grid itself so any case study's paragraphs, lists and figures fall into place (one column on phones). A case study may carry up to three `stats`, shown as large figures on the pale sky under the facts: **real figures only**. The sources give none for the client work, so only this site's page has them (its own floors: a Lighthouse accessibility score of 100, three browser engines tested on every change, no cookies); the client pages wait for numbers the owner can share. The four client stories are fuller, from the CV and LinkedIn (the workshops, the business cases, the testing and rollout, the training), still without naming a client, and Viola AI's unwritten "What I learned" became "Where it is now". On the home page, the wide tile along the foot of Selected work looked blurred because it was sent the small tiles' picture (480px, stretched across 696px): the two big tiles now share the large picture sizes, and both carry the project's one-line summary, where only the first did. Shown the result, the owner found three cards on the page too many, the dots between the focus words odd (a line could begin with one) and the bullets less readable than the opening paragraph. So the story's card is the only one: the facts and the figures sit straight on the page as text, the focus reads with commas, and the client stories tell what was done and what came of it in paragraphs. The wide tile's picture still looked rough at its proper size, because the artwork itself was a low-polygon render with flat facets on its curves; that cover is replaced with one drawn as vectors and rendered at 2400 by 1800 (rows of smooth rounded bars, the same subject).

**2026-09-30, the pre-release review.** An independent review of the release found one thing that mattered. The CV's print styles hung off the page's own id, `#page-top`; the copy interview renamed it `#home`, the rules silently stopped matching, and every PDF printed after that kept the pop-up's layout: side sections split across the two pages, and the bullets drawn apart from their roles. The fingerprint test couldn't see it, since it covered only the words. Now the script gives the body its own id for the print styles and refuses to print unless they have taken; the fingerprint covers the words, the print styles and the site's address; and a second fingerprint, of the PDF file itself, is checked by a unit test, so a PDF replaced by hand or left uncommitted is caught. The PDF was printed again. Smaller: Feedback's styles seat six, so a unit test holds the recommendations to six; a case study's figures have a space before their labels for anyone reading without the styles, and this site's reads "Cookies set by this site" (the booking calendar may set its own); on phones, typing a question in Ask me shows every pill, so the one that fits isn't hidden behind "more"; the clock catches up when the page comes back into view; and four stale comments. Last, the owner asked for the CV to keep to their formal CV, which the pop-up had drifted from as the site's copy became more personal: its Profile is the formal CV's paragraph (`cvProfile`; the hero's line stays on the home page), each role's bullets are the formal CV's, word for word, with no summary line above them, and its Skills are the formal CV's list (`cvSkills`); the Tools list, which the formal CV doesn't have, goes, while the certifications stay as chosen for the Toolkit. The foot is the name alone (the ball and the "Updated" date go, and `cvUpdated` with them), and on a computer the bar's Download PDF and close buttons sit at the pop-up's right edge: the name beside them had kept the page's reading width and stopped short, leaving the buttons in mid-row.

**2026-09-30, the owner's final review.** Walking the site top to bottom, the owner found seven links across the top bar too much to take in, so the menu button is now the navigation on every screen: the bar holds the clock, London's weather beside it and the button, and the panel it drops (the links in large type, Book a call last, then the CV and social icons) is the one the phone already had. The weather's icon and temperature had vanished from the owner's own screen: Open-Meteo was answering this machine with 429, its free daily allowance used up by the browser tests, which asked it for real on every page they opened. Every browser test now gets a fixed reading from a shared fixture (`tests/support/test.ts`), so a run makes no requests to it. The hero's second line lost "along the way" to sit in three lines on a computer; the About stats read "Products built", and "Case studies" counts seven, since one personal project is now a concept. The typical day was made believable: the working day runs from a written plan at 08:30 to a wrap-up before five (no client workshop at half past eight), and the evening stays as it was. In Selected work, the CV and portfolio template repeated this site's own story, so it gave way to a concept the owner may build next, an AI assistant that maps a messy process, labelled "Concept" (a new status) wherever it's listed, and saying plainly that nothing exists yet. Checked against the owner's CV and LinkedIn profile, the four client case studies kept only what those back up: invented colour ("mistakes crept in", "without raising a request") and outcomes neither source states came out, and general role bullets are no longer pinned on one client. In the Toolkit, the taskbar had been frosted glass over the moving sky, which shimmered as the sky moved and left a thin blue line round the card's lower corners; the sky now stops where the bar starts (`contain: size`, so the canvas's own size can't stretch the card) and the bar is one solid pale blue. Five tools are pinned to it, as the owner picked them, and the rest wait in a tray behind a "More" arrow, as Windows keeps its hidden icons (a `details` element, so it works without JavaScript): Power BI, Power Automate (in place of the drawn RPA robot), UiPath (its boxed "Ui" mark, the wordmark being too small at icon size), APIs (the OpenAPI mark, in place of drawn braces), Teams, SharePoint, Google Cloud and Kimi, all from Simple Icons (CC0). The owner chose these free marks over Microsoft's newer icons, whose terms cover only diagrams, training and documentation; Blue Prism waits for a logo they can supply. Each skills slide gained CV-backed skills, six to a slide (and "Agile delivery and product ownership" became "Product ownership", beside "Agile methods"), and on phones its decorative footer gives way to them. The card shown until each certificate's real image comes is drawn properly now: white in a frame of the sky, a badge in its blue, "Certification", the title in the serif and the issuer. It names the certification rather than imitating the certificate: a first draft read "Awarded to" the owner, "Issued by" the issuer, which a recruiter could take for a forged document. Feedback keeps its initials (drawn characters were tried and set aside) and its window loses the "Recommendations" title, the section's heading already saying what it is. Two independent reviews followed, of the code and of the site as it would ship. With the menu now the only navigation, its panel could run off a short screen (a phone on its side) with Book a call and the icons out of reach, since the bar is sticky: the panel now scrolls within itself. Tabbing on past its last link left it open over the page, with focus on buttons hidden beneath it (WCAG 2.4.11): leaving the menu now closes it. The tray closes on Escape or a click elsewhere, as Windows' does; the arrow's focus ring sits inside the card's clipped edge; the certificate card no longer overflows on short screens. The weather stub moved from each page to each browser context, which covers pop-ups and spares tests that only make requests, and the per-test stubs it replaced went. The CV's sky-blue full stop is drawn, not typed, so the PDF's text holds the name alone for the software that parses CVs; the PDF was printed again. And from the copy read-through: the healthcare outcome drops a claim the CV makes of the role in general, not that client; the public-sector study is "Bringing RPA into…", since the organisation was bringing it in; this site's summary and brief say plainly what was done. Last, the owner's answers: the stats stay as they are; AMNIKI links to amniki.com; the job title is "Senior Automation Analyst" everywhere (the full "Senior Intelligent Automation Analyst" was too long; the CV PDF was printed again); Viola AI says what it was built with (Framer, Supabase, Vercel and the OpenAI API, without AI coding tools); the hidden draft example is deleted, since preview builds showed it among the personal projects; and the tone is warmer where it had been curt: this site's case study is "Building my CV and portfolio site with AI, to production standards" and ends "It's live, and I'm still adding to it", and the missing page says sorry and points home. The menu drops "Contact": Book a call, its last link, leads to the same section, so the list is seven, not eight. Blue Prism waits for a future release.

Accepted for the GitHub Pages period (floor 7, threat 4): Pages serves only its own headers, so `public/_headers` has no effect. Missing: `Content-Security-Policy: frame-ancestors`, `X-Frame-Options`, `X-Content-Type-Options`, `Permissions-Policy`, and COOP and CORP; the MDN Observatory A+ is not reachable. The CSP itself still applies through its `<meta>` tag, and `<meta name="referrer">` restores the referrer policy. The residual risk is low: the site is static, with no sign-in, no forms and nothing a framed page could trick a visitor into changing; the booking frame loads Cal.com in its own origin. The site also shares its origin, buildwithmuj.github.io, with the owner's other Pages sites (the CV Portfolio Template), so they share browser storage; this site keeps only the pause preference (localStorage) and the weather reading (sessionStorage), neither of them sensitive. `security.txt` is published under the base path, not at the host root RFC 9116 expects. The header tests still run against the Cloudflare emulator and guard the later move. Recommended but outside the code: a `main` ruleset that blocks force pushes and requires the `ci` check. The repository's default branch is `main`, not the `dev` that §7 describes.
