# Portfolio

Personal portfolio site: a static [Astro](https://astro.build) 7 site, live on GitHub Pages at
<https://buildwithmuj.github.io/Personal-Portfolio/>. It has no server code, no database and no secrets.

The design and engineering decisions live in the
[foundation spec](docs/superpowers/specs/2026-09-24-portfolio-foundation-design.md). Read it before
changing how the site is built.

## Stack

- Astro 7 (static output), TypeScript 6 (strictest settings), MDX, plain CSS with design tokens
- pnpm 10 and Node 24
- Tests: `node --test` (unit), Playwright (end to end, accessibility with axe, page weight), Lighthouse 13
- Hosting: GitHub Pages, deployed by `.github/workflows/pages.yml` once CI passes on `main`. The
  Cloudflare setup (`wrangler.jsonc`, `public/_headers`, [docs/setup.md](docs/setup.md)) is kept for
  a later move to the site's own domain.
- CI: GitHub Actions (`ci.yml` runs every check in parallel jobs, gated by one job named `ci`;
  `pages.yml` deploys)

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

| Command                             | What it does                                                                             |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| `pnpm dev`                          | Development server with hot reload                                                       |
| `pnpm build`                        | Production build into `dist/`                                                            |
| `pnpm serve`                        | Serves `dist/` at http://127.0.0.1:8787 through `wrangler dev`, with the real `_headers` |
| `pnpm check`                        | Type-checks `.astro` and `.ts` files                                                     |
| `pnpm lint`                         | Stylelint; colours may only come from `src/styles/tokens.css`                            |
| `pnpm format` / `pnpm format:check` | Prettier                                                                                 |
| `pnpm test`                         | Unit tests                                                                               |
| `pnpm test:e2e`                     | Playwright on Chromium, WebKit and Firefox (run `pnpm build` first)                      |
| `pnpm test:perf`                    | Lighthouse floors (run `pnpm build` first)                                               |

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

### Updating the CV

The CV lives in one place: the View CV pop-up, built from `src/content/` (`cvProfile` in the profile,
`experience.yaml`, `cvSkills` and the certifications in `skills.yaml`, and `education.yaml`), in the
words of the formal CV. The PDF download is printed from that pop-up, so the two always say the same
thing.

1. Edit the content.
2. Build the site, then print the PDF:

   ```bash
   pnpm build
   pnpm cv:pdf
   ```

   This writes `public/cv.pdf` (A4, real text, with the site's address added to the contact
   details) and `scripts/cv-pdf.sha256`, a fingerprint of the words it printed. Commit both.

A test fails if the pop-up's words change and the PDF isn't printed again. The PDF carries no hidden
details: its only metadata is the title, the date it was made and the software that made it.

### Visitor counts

Page views can be counted by [GoatCounter](https://www.goatcounter.com/), which uses no cookies and
keeps nothing in the visitor's browser. It's off until `COUNT_URL` in `site.config.ts` holds the
GoatCounter site's endpoint (`https://<code>.goatcounter.com/count`). Setting it:

- lets pages contact that address (the CSP's `connect-src`), and sends one request per page view,
  from the live site only: never from a local build, a preview or a test;
- needs the privacy notice (`src/content/pages/privacy.md`) to say so. A test fails until it names
  GoatCounter, and fails again if the counter is switched off while the notice still does.

### Search Console

`public/google3e3daf617cf37724.html` tells Google Search Console who owns the site. Keep it: Google
checks for it from time to time, and removing it drops the verification.

### Renewing security.txt

`public/.well-known/security.txt` must carry an `Expires` date less than a year away. A test fails once
it's within 30 days. Set a new date about 11 months ahead.

GitHub pauses scheduled workflows in public repositories after 60 days without activity. If `weekly`
stops running, re-enable it in the Actions tab, and keep a calendar reminder for the `Expires` date so
this doesn't go unnoticed.

## Deployment

There are two long-lived branches:

- **`dev`** is where work happens, and it's the default branch.
- **`main`** is for releases. Production deploys from it.

1. **Work on `dev`.** Commit to it directly, or use a short-lived branch and a pull request into `dev`
   for bigger pieces. Every push to `dev` runs the checks. To see work in progress, run
   `pnpm dev` (drafts and placeholder testimonials show there). GitHub Pages hosts one site, the live
   one, so there is no online preview of `dev`.
2. **Release.** Open a pull request from `dev` into `main`
   (<https://github.com/buildwithmuj/Personal-Portfolio/compare/main...dev>). The `main` ruleset only
   accepts pull requests whose `ci` check has passed. Merge with **Create a merge commit**, not a
   squash or rebase, so `dev` and `main` keep a shared history.
3. **Go live.** CI runs on `main`; when it passes, `pages.yml` builds `main` in production mode and
   deploys it to GitHub Pages. The weather beside the clock refreshes live in
   visitors' browsers, from Open-Meteo, so nothing needs rebuilding on a schedule.

To roll back, revert the release's merge commit (`git revert -m 1 <merge-sha>`) on a branch and merge
it into `main` through a pull request; the reverted site goes live once CI passes. Rulesets protect
both branches: neither can be deleted or force-pushed, and `main` needs a pull request with a passing
`ci` check.

## Security

- **CSP:** Astro generates a Content Security Policy `<meta>` tag with hashes of its own scripts and
  styles, and a `<meta name="referrer">` sets the referrer policy. GitHub Pages can't send custom
  headers, so `public/_headers` (`frame-ancestors` and the other security headers) only takes effect
  after a move to Cloudflare; see the foundation spec §15, 2026-09-26. Tests fail on any CSP violation.
- **Almost nothing third-party:** no cookies and no forms. The requests to other sites are the live
  London weather from Open-Meteo and, once switched on, one page-view count to GoatCounter (see the
  privacy notice); the Cal.com calendar loads only when a visitor opens it. No third-party script
  runs on the page.
- **Dependencies:**
  - pnpm won't install a version younger than 7 days (`minimumReleaseAge`).
  - It runs no install scripts except for the packages listed in `pnpm-workspace.yaml`.
  - Dependabot proposes weekly updates, with the same 7-day wait.
  - Adding a dependency needs a reason in its pull request and an update to spec §10.
- **CI:** read-only permissions, every action pinned to a commit SHA, and no secrets.
- **Reporting:** report a vulnerability to the address in `/.well-known/security.txt`.
