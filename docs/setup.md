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
5. Add build variables: `PNPM_VERSION` = `10.34.5` and `NODE_VERSION` = `24`. pnpm's root `engines`
   check fails on a mismatched Node.
6. Save. Cloudflare may build `main` straight away. That build fails, because `main` only holds
   documentation so far. That's expected, and nothing is deployed.

## 6. First pull request

1. Open a pull request from `feat/foundation` into `main`.
2. Wait for the `ci` check and the Cloudflare preview comment.
3. Edit the `main` ruleset: turn on "Require status checks to pass", add **`ci`**, and tick "Require
   branches to be up to date before merging".
4. On the preview address, check four things:
   - pages load
   - `/robots.txt` says `Disallow: /`
   - `curl -s <preview-url> | grep 'name="robots"'` shows `noindex`
   - `curl -sI <preview-url>` shows the headers from `public/_headers`
5. Scan the preview address with https://developer.mozilla.org/en-US/observatory and confirm A+ before
   merging, because floor 7 depends on how it scores the header CSP together with the meta CSP.
6. Squash-merge. Cloudflare deploys production within a minute or two.

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
- keep Cloudflare zone features that rewrite HTML off: Email Address Obfuscation, Rocket Loader and
  automatic Web Analytics injection. Each injects a script the CSP would block.
- only then, consider HSTS `preload`
