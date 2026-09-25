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

GitHub pauses scheduled workflows in public repositories after 60 days without activity. If `weekly`
stops running, re-enable it in the Actions tab, and keep a calendar reminder for the `Expires` date so
this doesn't go unnoticed.

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
