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
| 2 | Per page, brotli-compressed as visitors download them: JS ≤ 8 KB, CSS ≤ 10 KB (measured uncompressed until 2026-09-26, §15), fonts ≤ 2 files and ≤ 100 KB, total ≤ 500 KB (CV excluded) | Playwright page-weight check |
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
- No cookies, analytics, forms or third-party requests, so no consent banner is needed.

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

Accepted for the GitHub Pages period (floor 7, threat 4): Pages serves only its own headers, so `public/_headers` has no effect. Missing: `Content-Security-Policy: frame-ancestors`, `X-Frame-Options`, `X-Content-Type-Options`, `Permissions-Policy`, and COOP and CORP; the MDN Observatory A+ is not reachable. The CSP itself still applies through its `<meta>` tag, and `<meta name="referrer">` restores the referrer policy. The residual risk is low: the site is static, with no sign-in, no forms and nothing a framed page could trick a visitor into changing; the booking frame loads Cal.com in its own origin. `security.txt` is published under the base path, not at the host root RFC 9116 expects. The header tests still run against the Cloudflare emulator and guard the later move. Recommended but outside the code: a `main` ruleset that blocks force pushes and requires the `ci` check. The repository's default branch is `main`, not the `dev` that §7 describes.
