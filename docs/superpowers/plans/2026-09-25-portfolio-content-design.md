# Portfolio v1 Content & Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the placeholder foundation into Mujtaba Shah's v1 portfolio. The build is a reference
rebuild modelled on the Portfolik layout, using Mona Sans, his drafted content, six anonymised case
studies and an opt-in Cal.com booking panel. Every foundation floor stays green.

**Architecture:**
- Content moves into typed collections: `profile`, `caseStudies`, `method`, `experience`, `skills`,
  `testimonials` and `pages`.
- Design values live in `tokens.css`, measured from the reference. Shared layout primitives (shells,
  cards, buttons, scroll reveal) live in `global.css` and a `Shell` component.
- Each home section is one component, rendered in the reference's order.
- Client JavaScript is limited to four tiny custom elements: copy-email, clock, count-up and the booking
  loader.

**Tech Stack:**
- Astro 7 (static, MDX, Fonts API with the local provider)
- `@fontsource-variable/mona-sans`
- TypeScript 6
- Plain CSS with tokens
- `node --test`, Playwright, axe and Lighthouse 13
- pnpm 10 and Node 24

**Spec:** `docs/superpowers/specs/2026-09-25-portfolio-content-design.md` (the "content spec"), which
builds on `docs/superpowers/specs/2026-09-24-portfolio-foundation-design.md` (the "foundation spec").
Read both.

## Global Constraints

Every rule in the foundation spec still binds. The ones that bite most:
- **Branch:** work on `dev`. Never push, and never touch GitHub or Cloudflare settings; the controller
  does that.
- **Dependencies:** the only new one is `@fontsource-variable/mona-sans`. Anything else → stop and ask.
  pnpm's `minimumReleaseAge` and `strictDepBuilds` are never bypassed.
- **CSS:** tokens only. No colour literals outside `src/styles/tokens.css` (Stylelint enforces this).
  `transparent` and `currentcolor` are allowed. Class names are kebab-case with single hyphens
  (`btn-primary`, not `btn--primary`), because Stylelint's standard `selector-class-pattern` rejects
  `--`.
- **Motion and contrast:** never animate `opacity` on text that's visible when the page loads. axe and
  Lighthouse measure contrast mid-animation, and half-transparent text fails. Reveal and rotation
  effects move with `transform` or `translate` instead.
- **Never in the output:**
  - inline `style` attributes
  - `set:html`, except JSON-LD
  - third-party requests before the visitor opens the booking panel
- **Content:**
  - Components hold no personal copy; text comes from `src/content/`. UI labels such as "Download CV",
    "See my work", "Book a call", "About me", "Experience" and "Skills & certifications" may live in
    components.
  - **No client names anywhere** (tests enforce it with hashed names). **No phone number anywhere**
    (tests enforce it).
- **Code:**
  - Relative imports of `.ts` files include the `.ts` extension. Erasable TypeScript only: no enums,
    namespaces or parameter properties.
  - Every non-void element is explicitly closed. In SVG, write `<path ...></path>`, not `<path />`.
- **Tests:**
  - `tests/unit/**/*.test.ts` run under `node --test`; `tests/**/*.spec.ts` run under Playwright.
  - Tests read expected content values from `src/content/` through `tests/support/content.ts`, never as
    hard-coded copies.
  - Firefox and Playwright's full Chromium can't launch on this Windows machine. Run end-to-end tests
    locally with `--project=chromium --project=webkit`; CI runs all three. `pnpm test:perf` works
    locally.
  - Always run `pnpm build` (production mode, no `WORKERS_CI_BRANCH`) before any Playwright run. Leave
    the production build in `dist/`. Leave no `wrangler`, Chrome or Playwright processes running.
- **Every task ends with this verification:**
  ```bash
  pnpm format
  pnpm lint
  pnpm check
  pnpm test
  pnpm build && pnpm exec playwright test --project=chromium --project=webkit
  ```
  From Task 4 onwards, also run `pnpm test:perf`.
- **Commits:** conventional prefix, a blank line, then the `Co-Authored-By:` line your own harness gives
  you.
- **Debugging:** if a verification fails in a way the plan doesn't predict, use
  superpowers:systematic-debugging. Never weaken a test, floor, budget or CSP directive to get to
  green; stop and report instead.

## Task overview

| # | Task | Main deliverable |
|---|---|---|
| 1 | Content model, drafted content and privacy guards | New schemas and content, six case studies, phone/client-name/placeholder guards |
| 2 | Design tokens, Mona Sans and layout primitives | `tokens.css` (light and dark), `global.css` primitives, `Shell`, font; 404 restyled |
| 3 | Page chrome | Sticky top bar (clock, navigation, social icons), footer, `/privacy` |
| 4 | Hero and proof strip | Hero card, rotating role, availability badge, pausable proof strip |
| 5 | About and stats | Statement with word fill, interests, contact row, count-up stats |
| 6 | Selected work | Reference-style case-study grid with kind and sector/status labels |
| 7 | How I work | Five numbered method cards |
| 8 | Testimonials and Experience & skills | Placeholder-gated testimonials; timeline and dark skills card |
| 9 | Contact and booking panel | Opt-in Cal.com panel, CSP `frame-src`, email, CV and socials |
| 10 | Case-study page and home structure | Reference-style case-study page; section-order and navigation tests |
| 11 | Documentation and spec amendments | Foundation §15 entries, README and setup-guide updates |

---

### Task 1: Content model, drafted content and privacy guards

**Files:**
- Modify:
  - `src/lib/social.ts`
  - `src/content.config.ts`
  - `src/lib/case-studies.ts`
  - `src/lib/structured-data.ts`
  - `src/layouts/Base.astro` (the `headline` prop line)
  - `src/pages/index.astro` (the `personJsonLd` call and the `Intro` props)
  - `src/layouts/CaseStudy.astro` (`client` becomes `employer`)
  - `astro.config.ts` (placeholder guard)
  - `public/.well-known/security.txt`
  - `tests/unit/case-studies.test.ts`
  - `tests/unit/structured-data.test.ts`
  - `tests/e2e/contact.spec.ts`
  - `tests/e2e/work.spec.ts`
- Create:
  - `src/lib/testimonials.ts`, `src/lib/placeholders.ts`
  - `src/content/profile.yaml` (replace), `method.yaml`, `experience.yaml`, `skills.yaml`,
    `testimonials.yaml`, `src/content/pages/privacy.md`
  - six case-study folders under `src/content/case-studies/`
  - `tests/support/content.ts`
  - `tests/unit/privacy.test.ts`, `tests/unit/testimonials.test.ts`, `tests/unit/placeholders.test.ts`
- Delete: `src/content/case-studies/sample-project/` (after copying its images)

**Interfaces:**
- Produces (`src/lib/case-studies.ts`):
  - `caseStudyStatuses` = `['live', 'in-progress', 'retired']`
  - `type CaseStudyStatus`
  - `caseStudyLabel(data: { kind: 'client' | 'product'; sector?: string | undefined; status?: CaseStudyStatus | undefined }): string`
- Produces: `visibleTestimonials<T extends { data: { placeholder: boolean } }>(entries: readonly T[], includePlaceholders: boolean): T[]` (`src/lib/testimonials.ts`)
- Produces: `placeholderLines(text: string): string[]` (`src/lib/placeholders.ts`)
- Produces: `personJsonLd(input: { name: string; jobTitle: string; worksFor?: string; url: string; email: string; sameAs: string[] }): string`
- Produces (`tests/support/content.ts`):
  - `profileValue(key): string`
  - `sectionHeading(section): string`
  - `yamlValues(path, key): string[]`
  - `yamlList(path, key): string[]`
- Produces: the collection fields in content spec §7, plus `profile.jobTitle`, `worksFor` and
  `titleTagline`. The case-study slugs are:
  - `healthcare-automation`, `pensions-operating-model`, `satellite-data-product`
  - `amniki`, `viola-ai`, `this-site`
  - `draft-example` (draft; test fixture)

- [ ] **Step 1: Write the failing unit tests**

`tests/unit/privacy.test.ts`:

```ts
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { describe, it } from 'node:test';

const TEXT_EXTENSIONS = new Set(['.md', '.mdx', '.yaml', '.yml', '.txt', '.svg', '.json', '']);
const PHONE = /(?:\+44\s?7\d{3}|\b07\d{3})[\s-]?\d{3}[\s-]?\d{3}\b/;
// SHA-256 of former clients' names, lowercase (content spec §10). The plaintext is never committed.
const CLIENT_HASHES = new Set([
  '02190e51b3183e1f494511b02b14caac60dc38ccab12dc1a7d52b139d30140af',
  '71f566aba763fb7636f03bfeb321c6d4934d4a6d5cb777c49b1c1595260c573b',
  '6a780680a34fd0aa53c10e46252470b940cd921dda653718fc7b31ba05ec1db8',
  'e79afbc118f62c69ce6955da55396a49f466eddb05bdaf2e4e15c3e93c715131',
  '900d1c1837bc980eeda481243f7aaf495a9f8b4059eba50a3a52eb6ed8ddd32f',
]);

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

function textFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return textFiles(path);
    return TEXT_EXTENSIONS.has(extname(entry.name)) ? [path] : [];
  });
}

/** Words and two-word phrases in `text` whose hash is in `hashes`. */
function clientNameHits(text: string, hashes: ReadonlySet<string>): string[] {
  const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const phrases = [...words, ...words.slice(1).map((word, i) => `${words[i]} ${word}`)];
  return phrases.filter((phrase) => hashes.has(sha256(phrase)));
}

describe('privacy guards (content spec §10)', () => {
  it('recognises UK mobile numbers', () => {
    assert.match('+44 7700 900123', PHONE);
    assert.match('07700900123', PHONE);
    assert.doesNotMatch('Nine years across five sectors', PHONE);
  });

  it('finds hashed words and two-word phrases', () => {
    const hashes = new Set([sha256('acme'), sha256('big bank')]);
    assert.deepEqual(clientNameHits('We worked with ACME and a Big Bank.', hashes), ['acme', 'big bank']);
  });

  const files = [...textFiles('src/content'), ...textFiles('public')];

  it('scans the content and public files', () => {
    assert.ok(files.length > 10, `only ${files.length} files found`);
  });

  for (const file of files) {
    const text = readFileSync(file, 'utf8');

    it(`${file} contains no phone number`, () => {
      assert.doesNotMatch(text, PHONE);
    });

    it(`${file} names no former client`, () => {
      assert.deepEqual(clientNameHits(text, CLIENT_HASHES), []);
    });
  }
});
```

`tests/unit/testimonials.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { visibleTestimonials } from '../../src/lib/testimonials.ts';

const real = { data: { placeholder: false, name: 'Real' } };
const fake = { data: { placeholder: true, name: 'Fake' } };

describe('visibleTestimonials (content spec §5.6)', () => {
  it('hides placeholder quotes in production', () => {
    assert.deepEqual(visibleTestimonials([real, fake], false), [real]);
  });

  it('shows placeholder quotes outside production', () => {
    assert.deepEqual(visibleTestimonials([real, fake], true), [real, fake]);
  });
});
```

`tests/unit/placeholders.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assertNoPlaceholders, placeholderLines } from '../../src/lib/placeholders.ts';

describe('placeholderLines', () => {
  it('returns every line marked # PLACEHOLDER, trimmed', () => {
    const text = 'a: 1\n  email: x@example.com # PLACEHOLDER: publish address\nb: 2\n';
    assert.deepEqual(placeholderLines(text), ['email: x@example.com # PLACEHOLDER: publish address']);
  });

  it('returns nothing when no line is marked', () => {
    assert.deepEqual(placeholderLines('a: 1\n# a normal comment\n'), []);
  });
});

describe('assertNoPlaceholders', () => {
  it('names the file and every placeholder line', () => {
    assert.throws(
      () => assertNoPlaceholders('profile.yaml', 'a: 1 # PLACEHOLDER: x\nb: 2 # PLACEHOLDER: y\n'),
      { message: 'profile.yaml still has placeholders:\na: 1 # PLACEHOLDER: x\nb: 2 # PLACEHOLDER: y' },
    );
  });

  it('passes clean content', () => {
    assert.doesNotThrow(() => assertNoPlaceholders('profile.yaml', 'a: 1\n'));
  });
});
```

In `tests/unit/case-studies.test.ts`:
- change the import line to
  `import { caseStudyLabel, featuredStudies, visibleStudies, type Orderable } from '../../src/lib/case-studies.ts';`
- append:

```ts
describe('caseStudyLabel (content spec §5.4)', () => {
  it('labels client work with its sector', () => {
    assert.equal(caseStudyLabel({ kind: 'client', sector: 'Healthcare' }), 'Client work · Healthcare');
  });

  it('labels own products with their status', () => {
    assert.equal(caseStudyLabel({ kind: 'product', status: 'live' }), 'Own product · Live');
    assert.equal(caseStudyLabel({ kind: 'product', status: 'in-progress' }), 'Own product · In progress');
    assert.equal(caseStudyLabel({ kind: 'product', status: 'retired' }), 'Own product · Retired');
  });

  it('falls back to the kind alone', () => {
    assert.equal(caseStudyLabel({ kind: 'client' }), 'Client work');
  });
});
```

In `tests/unit/structured-data.test.ts`, replace the whole `describe('personJsonLd', …)` block with:

```ts
describe('personJsonLd', () => {
  const base = {
    name: 'Mujtaba Shah',
    jobTitle: 'Senior Intelligent Automation Analyst',
    url: 'https://example.com/',
    email: 'hello@example.com',
    sameAs: ['https://github.com/buildwithmuj'],
  };

  it('describes the owner as a schema.org Person', () => {
    assert.deepEqual(JSON.parse(personJsonLd(base)), {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Mujtaba Shah',
      jobTitle: 'Senior Intelligent Automation Analyst',
      url: 'https://example.com/',
      email: 'mailto:hello@example.com',
      sameAs: ['https://github.com/buildwithmuj'],
    });
  });

  it('adds the employer as worksFor when given', () => {
    const data = JSON.parse(personJsonLd({ ...base, worksFor: 'DigiBlu' }));
    assert.deepEqual(data.worksFor, { '@type': 'Organization', name: 'DigiBlu' });
  });
});
```

- [ ] **Step 2: Run the unit tests to see them fail**

Run: `pnpm test`
Expected: FAIL.
- `testimonials.test.ts` and `placeholders.test.ts` report `ERR_MODULE_NOT_FOUND`.
- `case-studies.test.ts` fails on the missing `caseStudyLabel` export.
- `structured-data.test.ts` fails on `jobTitle`.
- `privacy.test.ts` passes: its file scan runs over the current placeholder content, which has no phone
  number or client name. It guards the content written in Steps 5–6.

- [ ] **Step 3: Implement the helpers**

`src/lib/social.ts`: add `'tiktok'` to `socialPlatforms` (after `'x'`) and `tiktok: 'TikTok',` to
`socialLabels` (after `x: 'X',`).

`src/lib/case-studies.ts`: append:

```ts
export const caseStudyStatuses = ['live', 'in-progress', 'retired'] as const;
export type CaseStudyStatus = (typeof caseStudyStatuses)[number];

const statusLabels: Record<CaseStudyStatus, string> = {
  live: 'Live',
  'in-progress': 'In progress',
  retired: 'Retired',
};

/** "Client work · <sector>" or "Own product · <status>" (content spec §5.4). */
export function caseStudyLabel(data: {
  kind: 'client' | 'product';
  sector?: string | undefined;
  status?: CaseStudyStatus | undefined;
}): string {
  const kind = data.kind === 'client' ? 'Client work' : 'Own product';
  const detail = data.kind === 'client' ? data.sector : data.status && statusLabels[data.status];
  return detail ? `${kind} · ${detail}` : kind;
}
```

`src/lib/testimonials.ts`:

```ts
/** Placeholder quotes appear outside production only (content spec §5.6). */
export function visibleTestimonials<T extends { data: { placeholder: boolean } }>(
  entries: readonly T[],
  includePlaceholders: boolean,
): T[] {
  return entries.filter((entry) => includePlaceholders || !entry.data.placeholder);
}
```

`src/lib/placeholders.ts`:

```ts
/** Lines marked `# PLACEHOLDER` in a content file (content spec §13). */
export function placeholderLines(text: string): string[] {
  return text
    .split('\n')
    .filter((line) => /#\s*PLACEHOLDER\b/.test(line))
    .map((line) => line.trim());
}

/** Throws when `text` still has placeholder lines; production deploys call this (content spec §13). */
export function assertNoPlaceholders(file: string, text: string): void {
  const pending = placeholderLines(text);
  if (pending.length > 0) {
    throw new Error(`${file} still has placeholders:\n${pending.join('\n')}`);
  }
}
```

`src/lib/structured-data.ts`: replace `personJsonLd` with:

```ts
export function personJsonLd(input: {
  name: string;
  jobTitle: string;
  worksFor?: string;
  url: string;
  email: string;
  sameAs: string[];
}): string {
  return jsonLd({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: input.name,
    jobTitle: input.jobTitle,
    ...(input.worksFor ? { worksFor: { '@type': 'Organization', name: input.worksFor } } : {}),
    url: input.url,
    email: `mailto:${input.email}`,
    sameAs: input.sameAs,
  });
}
```

Run: `pnpm test`
Expected: all unit tests pass.

- [ ] **Step 4: Replace the content schemas**

`src/content.config.ts` (whole file):

```ts
import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { caseStudyStatuses } from './lib/case-studies.ts';
import { socialPlatforms } from './lib/social.ts';

const httpsUrl = z
  .url()
  .refine((value) => value.startsWith('https://'), { message: 'Must be an https:// URL' });

const publicImage = z
  .string()
  .regex(/^\/[\w./-]+\.(?:png|jpg)$/, 'A root-relative path to a PNG or JPEG in public/');

const sectionCopy = z.object({ heading: z.string().min(1), intro: z.string().min(1) });
const yearMonth = z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM');

const profile = defineCollection({
  loader: file('src/content/profile.yaml'),
  schema: z.object({
    name: z.string().min(1),
    jobTitle: z.string().min(1),
    worksFor: z.string().min(1),
    titleTagline: z.string().min(1),
    roles: z.array(z.string().min(1)).length(2),
    availability: z.string().min(1).optional(),
    headline: z.string().min(1),
    subline: z.string().min(1),
    about: z.string().min(1),
    interests: z.string().min(1),
    proof: z.object({ label: z.string().min(1), items: z.array(z.string().min(1)).min(1) }),
    stats: z
      .array(
        z.object({
          value: z.string().regex(/^\d+/, 'Start with a number, e.g. "9+"'),
          label: z.string().min(1),
        }),
      )
      .min(1)
      .max(4),
    sections: z.object({
      work: sectionCopy,
      method: sectionCopy,
      testimonials: sectionCopy,
      experience: sectionCopy,
      contact: sectionCopy,
    }),
    email: z.email(),
    bookingUrl: httpsUrl.refine((value) => value.startsWith('https://cal.com/'), {
      message: 'Must be a Cal.com event URL (https://cal.com/…)',
    }),
    avatar: publicImage.optional(),
    timeZone: z.string().min(1).default('Europe/London'),
    locationLabel: z.string().min(1),
    socials: z.array(z.object({ platform: z.enum(socialPlatforms), url: httpsUrl })),
    cvUpdated: z.coerce.date(),
    seo: z.object({
      description: z.string().min(1).max(160),
      image: publicImage,
      imageAlt: z.string().min(1),
    }),
  }),
});

const caseStudies = defineCollection({
  loader: glob({
    pattern: '*/index.mdx',
    base: './src/content/case-studies',
    // The folder name is the slug (foundation spec §6).
    generateId: ({ entry }) => entry.split('/')[0] ?? entry,
  }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().min(1),
        role: z.string().min(1),
        timeframe: z.string().min(1),
        summary: z.string().min(1).max(160),
        cover: image(),
        coverAlt: z.string().min(1),
        kind: z.enum(['client', 'product']),
        sector: z.string().min(1).optional(),
        status: z.enum(caseStudyStatuses).optional(),
        employer: z.string().min(1).optional(),
        tags: z.array(z.string().min(1)).default([]),
        links: z.array(z.object({ label: z.string().min(1), url: httpsUrl })).default([]),
        featured: z.boolean().default(false),
        order: z.number().int().default(100),
        draft: z.boolean().default(false),
      })
      .superRefine((data, ctx) => {
        if (data.kind === 'client' && !data.sector) {
          ctx.addIssue({ code: 'custom', path: ['sector'], message: 'Client work needs a sector' });
        }
        if (data.kind === 'product' && !data.status) {
          ctx.addIssue({ code: 'custom', path: ['status'], message: 'Own products need a status' });
        }
      }),
});

const method = defineCollection({
  loader: file('src/content/method.yaml'),
  schema: z.object({
    order: z.number().int(),
    title: z.string().min(1),
    description: z.string().min(1),
    tags: z.array(z.string().min(1)).min(1),
  }),
});

const experience = defineCollection({
  loader: file('src/content/experience.yaml'),
  schema: z.object({
    employer: z.string().min(1),
    role: z.string().min(1),
    start: yearMonth,
    end: yearMonth.optional(),
    summary: z.string().min(1),
  }),
});

const skills = defineCollection({
  loader: file('src/content/skills.yaml'),
  schema: z.object({
    groups: z
      .array(z.object({ name: z.string().min(1), items: z.array(z.string().min(1)).min(1) }))
      .min(1),
    certifications: z.array(z.string().min(1)),
  }),
});

const testimonials = defineCollection({
  loader: file('src/content/testimonials.yaml'),
  schema: z.object({
    name: z.string().min(1),
    role: z.string().min(1),
    quote: z.string().min(1).max(320),
    placeholder: z.boolean().default(false),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/pages' }),
  schema: z.object({ title: z.string().min(1), description: z.string().min(1).max(160) }),
});

export const collections = { profile, caseStudies, method, experience, skills, testimonials, pages };
```

- [ ] **Step 5: Write the content**

`src/content/profile.yaml` (whole file):

```yaml
# Mujtaba Shah's profile, drafted from his CV and LinkedIn. Every sentence is for him to review.
# Lines marked PLACEHOLDER must be replaced before launch; production deploys refuse to build otherwise.
main:
  name: Mujtaba Shah
  jobTitle: Senior Intelligent Automation Analyst
  worksFor: DigiBlu
  titleTagline: Intelligent Automation & AI Product Builder
  roles:
    - Intelligent Automation
    - AI Product Builder
  availability: Open to new opportunities
  headline: I turn messy processes into automation and products people actually use.
  subline: >-
    Nine years untangling complex processes for organisations across the public sector, healthcare,
    education, financial services and telecoms, and building my own products along the way.
  about: >-
    I'm a Senior Intelligent Automation Analyst and a product-minded problem solver. I work with the
    people closest to a process to understand how it really runs, design automation and data solutions,
    and deliver change that sticks. Alongside consulting, I build my own products with low-code, no-code
    and AI tools.
  interests: 'Outside work: boxing at Legends MMA, four languages, and building side projects.'
  proof:
    label: Nine years across
    items:
      - DigiBlu
      - Infosys Consulting
      - Public sector
      - Healthcare
      - Education
      - Financial services
      - Telecoms
  stats:
    - value: '9+'
      label: Years' experience
    - value: '5'
      label: Sectors
    - value: '6'
      label: Case studies
    - value: '2'
      label: Own products
  sections:
    work:
      heading: Selected work
      intro: Client programmes and my own products, each turning a messy problem into something people use.
    method:
      heading: How I work
      intro: The same five steps, whether it's a client programme or something I'm building myself.
    testimonials:
      heading: What people say
      intro: From people I've worked with.
    experience:
      heading: Experience & skills
      intro: Nine years in consulting and automation delivery, and the tools I use.
    contact:
      heading: Let's work together
      intro: Hiring, or have a process that needs untangling? Book a call or send me an email.
  email: hello@example.com # PLACEHOLDER: the address to publish
  bookingUrl: https://cal.com/placeholder/30min # PLACEHOLDER: the Cal.com event link
  timeZone: Europe/London
  locationLabel: London
  socials:
    - platform: x
      url: https://x.com/ # PLACEHOLDER: the X profile URL
    - platform: linkedin
      url: https://www.linkedin.com/in/mujtaba-shah-028b1a56 # PLACEHOLDER: confirm the profile URL
    - platform: tiktok
      url: https://www.tiktok.com/ # PLACEHOLDER: the TikTok profile URL
    - platform: github
      url: https://github.com/buildwithmuj
  cvUpdated: 2026-09-25
  seo:
    description: Mujtaba Shah, Senior Intelligent Automation Analyst and AI product builder, turning messy processes into automation and products people use.
    image: /og-default.png
    imageAlt: Mujtaba Shah, Intelligent Automation & AI Product Builder
```

`src/content/method.yaml`:

```yaml
# "How I work" (content spec §5.5). Drafted from the CV; for Mujtaba to review.
understand:
  order: 1
  title: Understand
  description: Map how the work really happens today, with the people who do it.
  tags: [As-is mapping, Stakeholder workshops]
design:
  order: 2
  title: Design
  description: Shape the future state, and the operating model around it.
  tags: [Target operating model, Solution design]
justify:
  order: 3
  title: Justify
  description: Build the business case, so the right people can say yes.
  tags: [Business case, ROI]
build:
  order: 4
  title: Build
  description: Deliver the automation, app or product, in small, tested steps.
  tags: [Automation, Apps, Products]
embed:
  order: 5
  title: Embed
  description: Test, document and support adoption, so the change sticks.
  tags: [Testing, SOPs, Change and adoption]
```

`src/content/experience.yaml`:

```yaml
# Roles for "Experience & skills" (content spec §5.7). Clients are described by industry, never named.
digiblu:
  employer: DigiBlu
  role: Senior Intelligent Automation Analyst
  start: '2021-12'
  summary: Design and deliver intelligent automation, from APIs and Power Apps to RPA, for healthcare, education and financial-services organisations.
infosys-management-consultant:
  employer: Infosys Consulting
  role: Management Consultant
  start: '2018-04'
  end: '2021-11'
  summary: Led RPA, digital-experience and data-product work for UK public-sector and global telecoms clients, from business case to rollout.
infosys-consulting-analyst:
  employer: Infosys Consulting
  role: Consulting Analyst
  start: '2016-09'
  end: '2018-03'
  summary: Requirements, process assessments and user acceptance testing on transformation programmes for large banking, pharmaceutical and public-sector clients.
```

`src/content/skills.yaml`:

```yaml
# Skills and certifications (content spec §5.7), from the CV and LinkedIn.
main:
  groups:
    - name: Analysis
      items:
        - Process mapping (as-is and to-be)
        - Requirements gathering
        - Business cases and ROI
        - SOPs and technical writing
    - name: Delivery
      items:
        - Project management
        - Agile (Scrum and Kanban)
        - Product ownership
        - Testing, change and adoption
    - name: Automation & data
      items:
        - RPA
        - APIs and stored procedures
        - Power Apps
        - Power BI
    - name: AI building
      items:
        - Low-code and no-code
        - Generative AI
        - AI coding tools
        - Astro and TypeScript
  certifications:
    - Certified ScrumMaster (CSM)
    - Professional Scrum Product Owner (PSPO I)
    - Microsoft Power BI Data Analyst Associate
    - 'AI Fluency: Framework & Foundations'
```

`src/content/testimonials.yaml`:

```yaml
# Testimonials (content spec §5.6). Entries with placeholder: true never reach the live site.
# Replace them with real quotes that the person has agreed to publish, and set placeholder: false.
placeholder-one:
  name: Placeholder Name
  role: Role, organisation
  quote: Placeholder testimonial. A real, consented quote from someone Mujtaba has worked with goes here.
  placeholder: true
placeholder-two:
  name: Placeholder Name
  role: Role, organisation
  quote: Placeholder testimonial about how he untangles complex processes and gets people aligned.
  placeholder: true
placeholder-three:
  name: Placeholder Name
  role: Role, organisation
  quote: Placeholder testimonial about delivery, from business case to adoption.
  placeholder: true
placeholder-four:
  name: Placeholder Name
  role: Role, organisation
  quote: Placeholder testimonial about working with him on a product.
  placeholder: true
```

`src/content/pages/privacy.md`:

```md
---
title: Privacy
description: How this site handles your data. No cookies, no analytics, and a booking calendar that only loads when you open it.
---

This site doesn't use cookies or analytics, and it doesn't track you.

**Email.** My email address is published so you can contact me. If you email me, I only use your
message to reply.

**Booking a call.** The booking calendar is provided by Cal.com. It only loads when you choose "Book a
30-minute call". When you book, Cal.com handles your details under
[its privacy policy](https://cal.com/privacy).

**Hosting.** The site is hosted on Cloudflare, which processes standard request data, such as IP
addresses, to serve and protect it.

**Questions or removal requests.** Email me at the address on the home page.
```

`public/.well-known/security.txt`: change the `Contact` line to `Contact: mailto:hello@example.com`.

- [ ] **Step 6: Write the six case studies**

Copy the placeholder images, then delete the sample:

```bash
for slug in healthcare-automation pensions-operating-model satellite-data-product amniki viola-ai this-site; do
  mkdir -p "src/content/case-studies/$slug"
  cp src/content/case-studies/sample-project/cover.png "src/content/case-studies/$slug/cover.png"
done
cp src/content/case-studies/sample-project/detail.png src/content/case-studies/this-site/detail.png
git rm -r -q src/content/case-studies/sample-project
```

`src/content/case-studies/healthcare-automation/index.mdx`:

```mdx
---
title: Automating back-office work for a UK healthcare group
role: Senior Intelligent Automation Analyst
timeframe: 2021 – present
summary: RPA and workflow automation that cut manual effort and improved turnaround times across a UK healthcare group's back office.
cover: ./cover.png
coverAlt: Placeholder cover image for the healthcare automation case study
kind: client
sector: Healthcare
employer: DigiBlu
tags: [RPA, Workflow automation, Process redesign]
featured: true
order: 1
---

{/* DRAFT from the CV and LinkedIn. Mujtaba to review every sentence and add numbers he can share before launch. */}

## The problem

High-volume back-office processes relied on manual steps. That slowed turnaround and left room for
error.

## What I did

- Mapped the current processes with the teams who ran them, and prioritised the best candidates for
  automation.
- Designed the automations and workflows, then led delivery through testing and release.
- Wrote the SOPs and documentation the teams needed to run and support them.

## The outcome

Less manual work, faster turnaround and more consistent processing.
```

`src/content/case-studies/pensions-operating-model/index.mdx`:

```mdx
---
title: Redesigning a pensions administrator's operating model
role: Senior Intelligent Automation Analyst
timeframe: 2021 – present
summary: As-is assessment, a target operating model and SOPs that prepared a pensions administrator for automation-driven service delivery.
cover: ./cover.png
coverAlt: Placeholder cover image for the pensions operating model case study
kind: client
sector: Financial services
employer: DigiBlu
tags: [Process assessment, Target operating model, SOPs]
featured: true
order: 2
---

{/* DRAFT from the CV and LinkedIn. Mujtaba to review every sentence and add numbers he can share before launch. */}

## The problem

Service delivery depended on manual processes that weren't documented consistently, which made
automation hard to plan.

## What I did

- Ran as-is assessments of the core processes with the teams involved.
- Defined the future-state operating model.
- Wrote detailed SOPs and technical documentation to support handover, training and ongoing
  governance.

## The outcome

A clear, documented foundation for automation-driven service delivery.
```

`src/content/case-studies/satellite-data-product/index.mdx`:

```mdx
---
title: Owning a data-visualisation product for a global satellite communications company
role: Product Owner
timeframe: 2018 – 2021
summary: As Product Owner, I led the backlog and roadmap for self-service dashboards on a cloud data warehouse.
cover: ./cover.png
coverAlt: Placeholder cover image for the data-visualisation product case study
kind: client
sector: Telecoms
employer: Infosys Consulting
tags: [Product ownership, Data visualisation, Agile]
featured: true
order: 3
---

{/* DRAFT from the CV and LinkedIn. Mujtaba to review every sentence and add numbers he can share before launch. */}

## The problem

Teams needed faster access to insight than the existing reporting could give them.

## What I did

- Owned the product backlog, prioritisation and roadmap for data-visualisation dashboards on a cloud
  data warehouse.
- Worked with data engineers, analysts and business stakeholders to define data models, reporting
  requirements and user stories.
- Kept delivery scalable and well tested.

## The outcome

Self-service insights for the business, delivered iteratively.
```

`src/content/case-studies/amniki/index.mdx`:

```mdx
---
title: 'AMNIKI: a curated wellness and lifestyle marketplace'
role: Founder and builder
timeframe: Ongoing
summary: A curated e-commerce marketplace for wellness and lifestyle brands, built quickly with low-code and AI tools.
cover: ./cover.png
coverAlt: Placeholder cover image for the AMNIKI case study
kind: product
status: live
tags: [E-commerce, Low-code, AI tools]
featured: true
order: 4
---

{/* DRAFT from LinkedIn. Mujtaba to confirm the status and timeframe, add the live link and screenshots, and review every sentence. */}

## The idea

A curated place to discover wellness and lifestyle brands.

## How I built it

I used low-code, no-code and AI tools to move quickly from concept to a working marketplace.

## Where it is now

Live.
```

`src/content/case-studies/viola-ai/index.mdx`:

```mdx
---
title: 'Viola AI: helping students understand research papers'
role: Founder and builder
timeframe: Past project
summary: A platform that helped students summarise and understand research papers more efficiently.
cover: ./cover.png
coverAlt: Placeholder cover image for the Viola AI case study
kind: product
status: retired
tags: [Generative AI, Education, Prototype]
featured: true
order: 5
---

{/* DRAFT from LinkedIn. Mujtaba to confirm the status and timeframe, add screenshots, and review every sentence. */}

## The idea

Research papers are dense. Students needed a faster way to understand them.

## How I built it

A generative-AI platform that summarised papers and helped students work through them.

## What I learned

To be written by Mujtaba.
```

`src/content/case-studies/this-site/index.mdx`:

```mdx
---
title: Building this portfolio with AI, to production standards
role: Designer and builder
timeframe: '2026'
summary: A security-hardened, fully tested Astro site built with AI coding tools, from specification to release.
cover: ./cover.png
coverAlt: Placeholder cover image for the portfolio build case study
kind: product
status: in-progress
tags: [Astro, AI-assisted development, Security, Accessibility]
links:
  - label: Source code
    url: https://github.com/buildwithmuj/Personal-Portfolio
featured: true
order: 6
---

{/* DRAFT. Mujtaba to review every sentence before launch. */}

## The brief

A personal site that is fast, secure and accessible by default, with the design applied on top of a
tested foundation.

<Callout>
  Every change is checked automatically before it can reach the live site.
</Callout>

## How it's built

<Figure caption="Placeholder diagram of how the site is built and checked">

![Placeholder diagram](./detail.png)

</Figure>

Written specifications, then small tested steps, each reviewed before it merged.
```

`src/content/case-studies/draft-example/index.mdx`: in its frontmatter, add `kind: product` and
`status: in-progress` (after `coverAlt`). It has no `client` field; leave the rest as it is.

- [ ] **Step 7: Keep the existing components compiling**

- `src/layouts/Base.astro`: change `headline={profile.headline}` to `headline={profile.titleTagline}`.
- `src/pages/index.astro`:
  - replace the `personJsonLd({...})` argument with
    `{ name: profile.name, jobTitle: profile.jobTitle, worksFor: profile.worksFor, url: Astro.site.href, email: profile.email, sameAs: profile.socials.map((social) => social.url) }`
  - change the `Intro` element's `intro={profile.intro}` to `intro={profile.subline}`
- `src/layouts/CaseStudy.astro`: rename `client` to `employer` in the destructuring line and in the
  facts block, and change that fact's `<dt>Client</dt>` to `<dt>Employer</dt>`.

- [ ] **Step 8: Guard production deploys against placeholders**

In `astro.config.ts`:
- add `import { readFileSync } from 'node:fs';` and
  `import { assertNoPlaceholders } from './src/lib/placeholders.ts';` to the imports
- add after the `isProductionBuild` constant:

```ts
// A production deploy must not ship placeholder contact details (content spec §13).
if (process.env['WORKERS_CI'] === '1' && isProductionBuild) {
  const PROFILE = 'src/content/profile.yaml';
  assertNoPlaceholders(PROFILE, readFileSync(PROFILE, 'utf8'));
}
```

The unit tests cover the check itself. It can't be exercised through a real `WORKERS_CI=1` build yet,
because the existing `SITE_URL` guard above it stops every such build while `SITE_URL` is the
placeholder. That's expected until launch.

- [ ] **Step 9: Point the end-to-end tests at the content**

`tests/support/content.ts`:

```ts
import { readFileSync } from 'node:fs';

const PROFILE = 'src/content/profile.yaml';
const read = (path: string) => readFileSync(path, 'utf8');
/** Strips a trailing `# comment` and surrounding quotes from a YAML scalar. */
const clean = (raw: string) => raw.replace(/\s+#.*$/, '').replace(/^(['"])(.*)\1$/, '$2');

/** A top-level scalar of the `main` entry in profile.yaml, e.g. `email`. */
export function profileValue(key: string): string {
  const match = read(PROFILE).match(new RegExp(`^ {2}${key}: (.+)$`, 'm'));
  if (!match?.[1]) throw new Error(`${PROFILE} has no top-level "${key}"`);
  return clean(match[1]);
}

/** A section heading from `profile.sections`, e.g. `sectionHeading('work')`. */
export function sectionHeading(section: string): string {
  const match = read(PROFILE).match(new RegExp(`^ {4}${section}:\\n {6}heading: (.+)$`, 'm'));
  if (!match?.[1]) throw new Error(`${PROFILE} has no heading for section "${section}"`);
  return clean(match[1]);
}

/** Every `key: value` scalar in a YAML file, in file order (e.g. every `title:`). */
export function yamlValues(path: string, key: string): string[] {
  return [...read(path).matchAll(new RegExp(`^\\s*(?:- )?${key}: (.+)$`, 'gm'))].map((match) =>
    clean(match[1] ?? ''),
  );
}

/** The block-list items under `key:` in a YAML file, e.g. `yamlList(PROFILE, 'roles')`. */
export function yamlList(path: string, key: string): string[] {
  const match = read(path).match(new RegExp(`^( *)${key}:\\n((?:\\1 {2}- .+\\n?)+)`, 'm'));
  return (match?.[2] ?? '')
    .split('\n')
    .filter(Boolean)
    .map((line) => clean(line.replace(/^\s*- /, '')));
}
```

`tests/e2e/contact.spec.ts`:
- add `import { profileValue } from '../support/content.ts';`
- add, after the imports:
  `const EMAIL = profileValue('email');` and `const BOOKING_URL = profileValue('bookingUrl');`
- replace every `'alex@example.com'` with `EMAIL`, `'mailto:alex@example.com'` with `` `mailto:${EMAIL}` `` and
  `'https://cal.com/'` with `BOOKING_URL`
- in the "without JavaScript" test, scope the email link to the contact section:
  `page.locator('#contact').getByRole('link', { name: EMAIL })`

`tests/e2e/work.spec.ts` (whole file):

```ts
import { expect, test } from '@playwright/test';
import { sectionHeading } from '../support/content.ts';
import { builtPagePaths, SERVER_ONLY } from '../support/site.ts';

const WORK = sectionHeading('work');
const HEALTHCARE = 'Automating back-office work for a UK healthcare group';

test('the home page links to each featured case study', async ({ page }) => {
  await page.goto('/');
  const work = page.getByRole('region', { name: WORK });
  await work.getByRole('link', { name: HEALTHCARE }).click();
  await expect(page).toHaveURL(/\/work\/healthcare-automation$/);
  await expect(page.getByRole('heading', { level: 1, name: HEALTHCARE })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('region', { name: WORK })).toBeVisible();
});

test('a case study shows its details and MDX components', async ({ page }) => {
  await page.goto('/work/this-site');
  await expect(page.getByText('Designer and builder')).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Placeholder cover image for the portfolio build case study' }),
  ).toBeVisible();
  await expect(page.locator('figure figcaption')).toHaveText(
    'Placeholder diagram of how the site is built and checked',
  );
  await expect(page.getByRole('img', { name: 'Placeholder diagram' })).toBeVisible();
  await expect(page.locator('aside.callout')).toContainText('Every change is checked automatically');
  await expect(page.getByRole('link', { name: 'Source code' })).toHaveAttribute(
    'href',
    'https://github.com/buildwithmuj/Personal-Portfolio',
  );
});

test('drafts are not published in production', async ({ request, browserName }) => {
  test.skip(browserName !== 'chromium', SERVER_ONLY);
  expect(builtPagePaths()).toContain('/work/healthcare-automation');
  expect(builtPagePaths()).not.toContain('/work/draft-example');
  expect((await request.get('/work/draft-example')).status()).toBe(404);
});

test('a trailing slash redirects to the canonical URL', async ({ request, browserName }) => {
  test.skip(browserName !== 'chromium', SERVER_ONLY);
  const response = await request.get('/work/healthcare-automation/', { maxRedirects: 0 });
  expect([301, 307, 308]).toContain(response.status());
  expect(response.headers()['location']).toMatch(/\/work\/healthcare-automation$/);
});

test('build assets are served from /_astro with a one-year cache', async ({
  page,
  request,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', SERVER_ONLY);
  await page.goto('/work/healthcare-automation');
  const src = await page
    .getByRole('img', { name: 'Placeholder cover image for the healthcare automation case study' })
    .getAttribute('src');
  expect(src).toMatch(/^\/_astro\//);
  const response = await request.get(src ?? '');
  expect(response.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
});
```

- [ ] **Step 10: Check that a preview build still completes**

```bash
WORKERS_CI_BRANCH=feat/x pnpm build
pnpm build
```

Expected: both builds complete. The second one leaves the production build in `dist/`.

- [ ] **Step 11: Run the full verification and commit**

Run the Global Constraints verification block.
Expected:
- every unit test passes, including every per-file privacy check
- `check` reports 0 errors
- the build completes
- every end-to-end test passes on Chromium and WebKit

```bash
git add -A
git commit -m "feat: add the v1 content model, drafted content and privacy guards

<your harness's Co-Authored-By line>"
```

---

### Task 2: Design tokens, Mona Sans and layout primitives

**Files:**
- Modify: `src/styles/tokens.css` (replace), `src/styles/global.css` (replace), `astro.config.ts`
  (fonts), `src/layouts/Base.astro` (`<Font>`), `src/pages/404.astro`, `package.json` and
  `pnpm-lock.yaml` (via pnpm)
- Create: `src/components/Shell.astro`, `tests/e2e/design.spec.ts`

**Interfaces:**
- Produces (tokens, used by every later task):
  - colours: `--color-page`, `--color-shell`, `--color-surface`, `--color-text`,
    `--color-text-muted`, `--color-accent`, `--color-inverse`, `--color-on-inverse`,
    `--color-on-inverse-muted`, `--color-border`, `--color-nav`, `--color-status-bg`,
    `--color-status-text`, `--color-focus`, `--color-grid-line`
  - type: `--font-sans`, `--text-xs`, `--text-clock`, `--text-sm`, `--text-base`, `--text-lg`,
    `--text-xl`, `--text-2xl`, `--text-3xl`, `--text-hero`, `--leading-tight`, `--leading-snug`,
    `--leading-body`, `--leading-normal`, `--tracking-tight`, `--tracking-clock`, `--weight-regular`, `--weight-medium`
  - spacing: `--space-1`…`--space-16`
  - layout: `--page-max-width`, `--gutter`, `--measure`, `--bar-height`, `--bar-offset`, `--shell-gap`,
    `--shell-pad-top`, `--shell-pad`, `--inset`, `--card-pad`, `--card-pad-sm`, `--hero-card-pad`,
    `--gap-cards`, `--gap-work`, `--gap-pair`, `--avatar`, `--icon-button`, `--button-height`,
    `--button-pad-x`
  - shape: `--radius-sm`, `--radius-md`, `--radius-icon`, `--radius-image`, `--radius-button`,
    `--radius-card`, `--radius-shell`, `--radius-pill`
  - elevation: `--shadow-primary`, `--shadow-secondary`
  - motion: `--duration-fast`, `--duration-base`, `--ease-standard`, `--marquee-duration`,
    `--role-duration`
- Produces (classes in `global.css`):
  - `.container`, `.stack`, `.visually-hidden`, `.skip-link`
  - `.shell`, `.shell-inset`, `.shell-hero`, `.shell-join-top`, `.shell-join-bottom`
  - `.card`, `.card-inverse`, `.section-head`, `.label`
  - `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-on-inverse`
  - `.reveal`
- Produces: `Shell.astro` with props
  `{ id: string; heading?: string; intro?: string; labelledBy?: string; join?: 'top' | 'bottom'; inset?: boolean; hero?: boolean; reveal?: boolean }`.
  It renders `<section id aria-labelledby>`, with an optional `.section-head` (`h2#<id>-heading` plus
  intro) and a slot.

- [ ] **Step 1: Write the failing design test**

`tests/e2e/design.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('text is set in Mona Sans', async ({ page }) => {
  await page.goto('/');
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].some((face) => face.family.includes('Mona Sans') && face.status === 'loaded');
  });
  expect(loaded).toBe(true);
  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain('Mona Sans');
});

test('the light palette matches the reference', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const body = await page.evaluate(() => {
    const style = getComputedStyle(document.body);
    return { background: style.backgroundColor, color: style.color };
  });
  expect(body).toEqual({ background: 'rgb(255, 255, 255)', color: 'rgb(10, 10, 10)' });
});

test('the dark palette is derived', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(background).toBe('rgb(10, 10, 10)');
});

test('the 404 page sits in a section shell', async ({ page }) => {
  await page.goto('/does-not-exist');
  const shell = page.locator('section.shell');
  await expect(shell).toHaveCount(1);
  await expect(shell).toHaveCSS('border-radius', '22px');
  await expect(shell).toHaveCSS('background-color', 'rgb(243, 244, 246)');
});
```

Run: `pnpm build && pnpm exec playwright test tests/e2e/design.spec.ts --project=chromium`
Expected: FAIL. The font isn't Mona Sans, the body text is still `#1a1a1a`, the dark page is still
`#121212`, and there's no `section.shell`.

- [ ] **Step 2: Add Mona Sans**

```bash
pnpm add @fontsource-variable/mona-sans@^5.3.0
```

The repo has a `pnpm-workspace.yaml` for its supply-chain settings. If pnpm answers
`ERR_PNPM_ADDING_TO_ROOT`, rerun with `-w`. Never bypass `minimumReleaseAge`: if 5.3.0 is younger than
7 days, stop and report.

In `astro.config.ts`:
- change the `astro/config` import to `import { defineConfig, envField, fontProviders } from 'astro/config';`
- add this key inside `defineConfig({ … })`, after `site: SITE_URL,`:

```ts
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
```

In `src/layouts/Base.astro`:
- add `import { Font } from 'astro:assets';` to the frontmatter imports
- add `<Font cssVariable="--font-mona" preload />` as the first element after
  `<meta name="viewport" …/>`

If Astro rejects a `node_modules` path in the local provider, then:
1. copy that file to `src/assets/fonts/mona-sans-latin-wght-normal.woff2`
2. copy the package's `LICENSE` to `src/assets/fonts/OFL.txt`
3. point `src` at `./src/assets/fonts/mona-sans-latin-wght-normal.woff2`
4. record the deviation in your report

- [ ] **Step 3: Replace the tokens**

`src/styles/tokens.css` (whole file):

```css
/*
 * Design tokens (content spec §4), measured from the Portfolik reference at 1440px.
 * Components use only these variables.
 */
:root {
  color-scheme: light dark;

  /* Colour */
  --color-page: #fff;
  --color-shell: #f3f4f6;
  --color-surface: #fff;
  --color-text: #0a0a0a;
  --color-text-muted: #4a4f54;
  --color-accent: #0a0a0a;
  --color-inverse: #0a0a0a;
  --color-on-inverse: #fff;
  --color-on-inverse-muted: rgb(255 255 255 / 80%);
  --color-border: #e5e7eb;
  --color-nav: rgb(242 243 245 / 80%);
  --color-status-bg: #e2f9dd;
  --color-status-text: #137300;
  --color-focus: #0a0a0a;
  --color-grid-line: rgb(10 10 10 / 6%);

  /* Type */
  --font-sans: var(--font-mona);
  --text-xs: 0.75rem;
  --text-clock: 0.8125rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.75rem;
  --text-3xl: 2.25rem;
  --text-hero: 1.75rem;
  --leading-tight: 1.2;
  --leading-snug: 1.4;
  --leading-body: 1.5;
  --leading-normal: 1.6;
  --tracking-tight: -0.02em;
  --tracking-clock: -0.04em;
  --weight-regular: 400;
  --weight-medium: 500;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;

  /* Layout */
  --page-max-width: 760px;
  --gutter: 20px;
  --measure: 65ch;
  --bar-height: 64px;
  --bar-offset: 18px;
  --shell-gap: 10px;
  --shell-pad-top: 50px;
  --shell-pad: 32px;
  --inset: 2px;
  --card-pad: 32px;
  --card-pad-sm: 28px;
  --hero-card-pad: 44px;
  --gap-cards: 6px;
  --gap-work: 24px;
  --gap-pair: 10px;
  --avatar: 90px;
  --icon-button: 32px;
  --button-height: 40px;
  --button-pad-x: 20px;

  /* Shape */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-icon: 10px;
  --radius-image: 12px;
  --radius-button: 12px;
  --radius-card: 20px;
  --radius-shell: 22px;
  --radius-pill: 999px;

  /* Elevation */
  --shadow-primary:
    inset 0 1px 3px 0 rgb(255 255 255 / 30%), 0 0 0 1px #111827, 0 1.5px 3px 0 rgb(31 31 31 / 8%),
    0 4px 4px 0 rgb(31 31 31 / 7%), 0 12px 6px 0 rgb(31 31 31 / 4%), 0 16px 8px 0 rgb(31 31 31 / 1%);
  --shadow-secondary:
    inset 0 2px 2px 0 #fff, 0 12px 12px -6px rgb(41 41 41 / 4%), 0 6px 6px -3px rgb(41 41 41 / 4%),
    0 3px 3px -1.5px rgb(41 41 41 / 2%), 0 0 0 1px #e5e7eb;

  /* Motion */
  --duration-fast: 150ms;
  --duration-base: 200ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --marquee-duration: 30s;
  --role-duration: 6s;
}

@media (width < 40rem) {
  :root {
    --gutter: 16px;
    --shell-pad: 20px;
    --card-pad: 24px;
    --card-pad-sm: 24px;
    --hero-card-pad: 24px;
    /* The top bar wraps to its content height below 640px; this only sets the scroll offset. */
    --bar-height: 8rem;
    --text-hero: 1.5rem;
  }
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-page: #0a0a0a;
    --color-shell: #161616;
    --color-surface: #1f1f1f;
    --color-text: #f5f5f5;
    --color-text-muted: #a3a3a3;
    --color-accent: #f5f5f5;
    --color-inverse: #f5f5f5;
    --color-on-inverse: #0a0a0a;
    --color-on-inverse-muted: rgb(10 10 10 / 80%);
    --color-border: #2e2e2e;
    --color-nav: rgb(22 22 22 / 80%);
    --color-status-bg: #123d0b;
    --color-status-text: #8be07a;
    --color-focus: #f5f5f5;
    --color-grid-line: rgb(245 245 245 / 6%);
    --shadow-primary: 0 0 0 1px #f5f5f5;
    --shadow-secondary: 0 0 0 1px #2e2e2e;
  }
}
```

- [ ] **Step 4: Replace the global styles**

`src/styles/global.css` (whole file):

```css
/* Reset, base styles and layout primitives (content spec §4). Every value comes from tokens.css. */
*,
*::before,
*::after {
  box-sizing: border-box;
}

* {
  margin: 0;
}

html {
  scroll-padding-top: calc(var(--bar-offset) + var(--bar-height) + var(--space-4));
}

body {
  min-height: 100vh;
  background: var(--color-page);
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  line-height: var(--leading-body);
}

img,
svg {
  display: block;
  max-width: 100%;
  height: auto;
}

h1,
h2,
h3,
h4 {
  font-weight: var(--weight-medium);
  line-height: var(--leading-snug);
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
  z-index: 20;
  inset-block-start: var(--space-4);
  inset-inline-start: var(--space-4);
  padding: var(--space-2) var(--space-4);
  border: 2px solid var(--color-focus);
  border-radius: var(--radius-sm);
  background: var(--color-page);
  color: var(--color-text);
  transform: translateY(-200%);
}

.skip-link:focus {
  transform: none;
}

/* The page's column of section shells */
.stack {
  display: grid;
  gap: var(--shell-gap);
}

.stack > :first-child {
  padding-block-start: calc(var(--bar-height) + var(--shell-pad));
}

.shell {
  padding: var(--shell-pad-top) var(--shell-pad) var(--shell-pad);
  border-radius: var(--radius-shell);
  background: var(--color-shell);
}

.shell-inset {
  padding: var(--inset);
}

.stack > .shell-hero:first-child {
  padding: calc(var(--bar-height) + var(--inset)) var(--inset) var(--inset);
}

.shell-join-top {
  border-end-start-radius: 0;
  border-end-end-radius: 0;
}

.shell-join-bottom {
  border-start-start-radius: 0;
  border-start-end-radius: 0;
}

.stack > .shell-join-top + .shell-join-bottom {
  margin-block-start: calc(-1 * var(--shell-gap));
}

/* Below 640px the top bar wraps to its own height and sits above the first shell. */
@media (width < 40rem) {
  .stack > :first-child {
    padding-block-start: var(--shell-pad);
  }

  .stack > .shell-hero:first-child {
    padding: var(--inset);
  }
}

.section-head {
  display: grid;
  gap: var(--space-1);
  margin-block-end: var(--space-8);
}

.section-head h2 {
  font-size: var(--text-xl);
}

.section-head p {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.label {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  font-weight: var(--weight-regular);
}

.card {
  padding: var(--card-pad);
  border-radius: var(--radius-card);
  background: var(--color-surface);
}

.card-inverse {
  background: var(--color-inverse);
  color: var(--color-on-inverse);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--button-height);
  padding: var(--space-2) var(--button-pad-x);
  border: 0;
  border-radius: var(--radius-button);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  text-decoration: none;
  cursor: pointer;
  transition: transform var(--duration-fast) var(--ease-standard);
}

.btn:hover {
  transform: translateY(-1px);
}

.btn-primary {
  background: var(--color-inverse);
  box-shadow: var(--shadow-primary);
  color: var(--color-on-inverse);
}

.btn-secondary {
  background: var(--color-surface);
  box-shadow: var(--shadow-secondary);
  color: var(--color-text);
}

.btn-on-inverse {
  background: var(--color-on-inverse);
  color: var(--color-inverse);
}

/*
 * Section rise on scroll (content spec §8): progressive, and never on the hero. It moves without
 * fading, because half-transparent text fails the axe and Lighthouse contrast checks.
 */
@keyframes rise {
  from {
    transform: translateY(16px);
  }

  to {
    transform: none;
  }
}

@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .reveal {
      animation: rise linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 35%;
    }
  }
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

If Stylelint reports `animation-timeline` or `animation-range` as unknown, they're valid CSS
(scroll-driven animations). In that case add them to `ignoreProperties` for `property-no-unknown` in
`stylelint.config.js`: `'property-no-unknown': [true, { ignoreProperties: ['animation-timeline', 'animation-range'] }]`.
Record it.

- [ ] **Step 5: Add the Shell component and restyle the 404 page**

`src/components/Shell.astro`:

```astro
---
interface Props {
  id: string;
  heading?: string;
  intro?: string;
  labelledBy?: string;
  join?: 'top' | 'bottom';
  inset?: boolean;
  hero?: boolean;
  reveal?: boolean;
}

const {
  id,
  heading,
  intro,
  labelledBy,
  join,
  inset = false,
  hero = false,
  reveal = true,
} = Astro.props;
const headingId = `${id}-heading`;
---

<section
  id={id}
  class:list={[
    'shell',
    { 'shell-inset': inset, 'shell-hero': hero, reveal },
    join && `shell-join-${join}`,
  ]}
  aria-labelledby={heading ? headingId : labelledBy}
>
  {
    heading && (
      <header class="section-head">
        <h2 id={headingId}>{heading}</h2>
        {intro && <p>{intro}</p>}
      </header>
    )
  }
  <slot />
</section>
```

`src/pages/404.astro` (whole file):

```astro
---
import Shell from '../components/Shell.astro';
import Base from '../layouts/Base.astro';
---

<Base
  title="Page not found"
  description="The page you were looking for doesn't exist."
  noindex
>
  <Shell id="not-found" labelledBy="not-found-heading" reveal={false}>
    <div class="card not-found">
      <h1 id="not-found-heading">Page not found</h1>
      <p>The page you were looking for doesn't exist or has moved.</p>
      <p><a class="btn btn-primary" href="/">Go to the home page</a></p>
    </div>
  </Shell>
</Base>

<style>
  .not-found {
    display: grid;
    gap: var(--space-4);
  }

  h1 {
    font-size: var(--text-2xl);
    font-weight: var(--weight-regular);
    letter-spacing: var(--tracking-tight);
  }

  p {
    color: var(--color-text-muted);
  }
</style>
```

- [ ] **Step 6: Run the design test, then the full verification, and commit**

Run: `pnpm build && pnpm exec playwright test tests/e2e/design.spec.ts --project=chromium --project=webkit`
Expected: 8 passed.

Run the Global Constraints verification block. Expected: all green, including axe in light and dark
mode. The existing sections still use their own styles; that's expected until Tasks 3–10 replace them.

```bash
git add -A
git commit -m "feat: add the reference design tokens, Mona Sans and layout primitives

<your harness's Co-Authored-By line>"
```

---

### Task 3: Page chrome: top bar, footer and privacy page

**Files:**
- Create: `src/components/TopBar.astro`, `src/components/LiveClock.astro`,
  `src/components/SocialIcon.astro`, `src/components/Footer.astro`, `src/pages/privacy.astro`,
  `tests/e2e/chrome.spec.ts`
- Modify: `src/layouts/Base.astro` (body structure), `src/lib/content.ts` (`getPage`)
- Delete: `src/components/SiteHeader.astro`, `src/components/SiteFooter.astro`

**Interfaces:**
- Consumes:
  - `Shell` and tokens (Task 2)
  - `profile.timeZone`, `locationLabel`, `socials` and `name` (Task 1)
  - `socialLabels` (Task 1)
- Produces:
  - `getPage(id: string): Promise<CollectionEntry<'pages'>>` (`src/lib/content.ts`)
  - the Base body: `<div class="container page">` holding `TopBar`, then `<main id="main" class="stack">`,
    then `Footer`
  - the navigation hrefs `/#about`, `/#work`, `/#method`, `/#experience`, `/#contact`

- [ ] **Step 1: Write the failing chrome spec**

`tests/e2e/chrome.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { profileValue } from '../support/content.ts';

const NAME = profileValue('name');
const NAV = [
  ['About', '/#about'],
  ['Work', '/#work'],
  ['How I work', '/#method'],
  ['Experience', '/#experience'],
  ['Contact', '/#contact'],
] as const;

test('the top bar has the navigation and social links', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main' });
  for (const [label, href] of NAV) {
    await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute('href', href);
  }
  const bar = page.locator('header.top-bar');
  for (const platform of ['LinkedIn', 'X', 'TikTok', 'GitHub']) {
    await expect(bar.getByRole('link', { name: `${NAME} on ${platform}` })).toHaveCount(1);
  }
});

test('the clock ticks with seconds', async ({ page }) => {
  await page.goto('/');
  const clock = page.locator('live-clock time');
  await expect(clock).toHaveText(/^\d{2}:\d{2}:\d{2} (AM|PM)$/);
  await expect(page.locator('header.top-bar')).toContainText(profileValue('locationLabel'));
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the clock shows the build time', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('live-clock time')).toHaveText(/^\d{2}:\d{2} (AM|PM)$/);
  });
});

test('the top bar stays in view while scrolling', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, 1500));
  const box = await page.locator('header.top-bar').boundingBox();
  expect(box?.y).toBeCloseTo(18, 0);
});

test('the footer links to the privacy page', async ({ page }) => {
  await page.goto('/');
  const footer = page.locator('footer.site-footer');
  await expect(footer).toContainText(`© ${new Date().getFullYear()} ${NAME}`);
  await footer.getByRole('link', { name: 'Privacy' }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy');
});
```

Run: `pnpm build && pnpm exec playwright test tests/e2e/chrome.spec.ts --project=chromium`
Expected: FAIL, because there's no top bar, clock, footer link or `/privacy`.

- [ ] **Step 2: Write the chrome components**

`src/components/SocialIcon.astro`:

```astro
---
import type { SocialPlatform } from '../lib/social.ts';

interface Props {
  platform: SocialPlatform;
}

const { platform } = Astro.props;
// X, TikTok and GitHub: Simple Icons 15.22.0 (CC0-1.0). LinkedIn: drawn for this site.
const paths: Partial<Record<SocialPlatform, string>> = {
  x: 'M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z',
  tiktok:
    'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  github:
    'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
};
const path = paths[platform];
---

{
  platform === 'linkedin' ? (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="3" width="18" height="18" rx="3"></rect>
      <path d="M8 10.5V16M8 7.5v.01M12 16v-5.5M12 13a2.5 2.5 0 0 1 5 0v3"></path>
    </svg>
  ) : path ? (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false">
      <path d={path}></path>
    </svg>
  ) : (
    <span aria-hidden="true">{platform.slice(0, 2).toUpperCase()}</span>
  )
}
```

`src/components/LiveClock.astro`:

```astro
---
interface Props {
  timeZone: string;
}

const { timeZone } = Astro.props;
// Without JavaScript the clock shows the build time, without seconds (content spec §5.1).
const buildTime = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
  timeZone,
}).format(new Date());
---

<live-clock data-time-zone={timeZone}><time>{buildTime}</time></live-clock>

<script>
  class LiveClock extends HTMLElement {
    connectedCallback(): void {
      const time = this.querySelector('time');
      const timeZone = this.dataset['timeZone'];
      if (!time || !timeZone) return;
      const format = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone,
      });
      const tick = () => {
        time.textContent = format.format(new Date());
      };
      tick();
      window.setInterval(tick, 1000);
    }
  }

  customElements.define('live-clock', LiveClock);
</script>
```

`src/components/TopBar.astro`:

```astro
---
import type { CollectionEntry } from 'astro:content';
import { socialLabels } from '../lib/social.ts';
import LiveClock from './LiveClock.astro';
import SocialIcon from './SocialIcon.astro';

interface Props {
  profile: CollectionEntry<'profile'>['data'];
}

const { profile } = Astro.props;
const nav = [
  { href: '/#about', label: 'About' },
  { href: '/#work', label: 'Work' },
  { href: '/#method', label: 'How I work' },
  { href: '/#experience', label: 'Experience' },
  { href: '/#contact', label: 'Contact' },
];
---

<header class="top-bar">
  <p class="where">
    <LiveClock timeZone={profile.timeZone} />
    <span class="city">{profile.locationLabel}</span>
  </p>
  <nav aria-label="Main">
    <ul role="list">
      {
        nav.map((item) => (
          <li>
            <a href={item.href}>{item.label}</a>
          </li>
        ))
      }
    </ul>
  </nav>
  <ul class="socials" role="list">
    {
      profile.socials.map((social) => (
        <li>
          <a
            class="icon-button"
            href={social.url}
            aria-label={`${profile.name} on ${socialLabels[social.platform]}`}
          >
            <SocialIcon platform={social.platform} />
          </a>
        </li>
      ))
    }
  </ul>
</header>

<style>
  .top-bar {
    position: sticky;
    z-index: 10;
    top: var(--bar-offset);
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: var(--space-3) var(--space-6);
    align-items: center;
    height: var(--bar-height);
    margin-block-end: calc(-1 * var(--bar-height));
    padding: var(--space-3) var(--space-4) var(--space-3) var(--button-pad-x);
    border-radius: var(--radius-card);
    background: var(--color-nav);
    backdrop-filter: blur(12px);
  }

  .where {
    display: flex;
    gap: var(--space-2);
    align-items: baseline;
    font-size: var(--text-clock);
    font-weight: var(--weight-medium);
    letter-spacing: var(--tracking-clock);
    line-height: 1;
    white-space: nowrap;
  }

  .city {
    color: var(--color-text-muted);
    font-weight: var(--weight-regular);
    letter-spacing: normal;
  }

  nav ul,
  .socials {
    display: flex;
    gap: var(--space-6);
    padding: 0;
    list-style: none;
  }

  nav ul {
    justify-content: center;
  }

  nav a {
    color: var(--color-text);
    font-weight: var(--weight-medium);
    text-decoration: none;
  }

  nav a:hover {
    text-decoration: underline;
  }

  .socials {
    gap: var(--space-2);
  }

  .icon-button {
    display: grid;
    place-items: center;
    width: var(--icon-button);
    height: var(--icon-button);
    border-radius: var(--radius-icon);
    background: var(--color-surface);
    box-shadow: var(--shadow-secondary);
    color: var(--color-text);
  }

  /* Below 640px the navigation wraps to its own row inside the bar (content spec §5.1). */
  @media (width < 40rem) {
    .top-bar {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      align-items: center;
      justify-content: space-between;
      height: auto;
      margin-block-end: var(--shell-gap);
      padding: var(--space-3);
    }

    nav {
      flex-basis: 100%;
      order: 1;
    }

    nav ul {
      flex-wrap: wrap;
      justify-content: flex-start;
      gap: var(--space-1) var(--space-4);
    }
  }
</style>
```

`src/components/Footer.astro`:

```astro
---
interface Props {
  name: string;
}

const { name } = Astro.props;
const year = new Date().getFullYear();
---

<footer class="site-footer">
  <p>© {year} {name}</p>
  <p><a href="/privacy">Privacy</a></p>
</footer>

<style>
  .site-footer {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    justify-content: space-between;
    padding: var(--space-8) var(--button-pad-x);
    color: var(--color-text-muted);
  }

  a {
    color: var(--color-text-muted);
  }
</style>
```

- [ ] **Step 3: Wire up the layout and the privacy page**

In `src/lib/content.ts`, append:

```ts
export async function getPage(id: string): Promise<CollectionEntry<'pages'>> {
  const entry = await getEntry('pages', id);
  if (!entry) throw new Error(`src/content/pages/${id}.md is missing`);
  return entry;
}
```

In `src/layouts/Base.astro`:
- replace the `SiteFooter` and `SiteHeader` imports with `import Footer from '../components/Footer.astro';`
  and `import TopBar from '../components/TopBar.astro';`
- replace everything inside `<body>` with:

```astro
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="container page">
      <TopBar profile={profile} />
      <main id="main" tabindex="-1" class="stack">
        <slot />
      </main>
      <Footer name={profile.name} />
    </div>
```

- append this to the file:

```astro
<style>
  .page {
    padding-block-start: var(--bar-offset);
  }
</style>
```

Delete `src/components/SiteHeader.astro` and `src/components/SiteFooter.astro`.

`src/pages/privacy.astro`:

```astro
---
import { render } from 'astro:content';
import Shell from '../components/Shell.astro';
import Base from '../layouts/Base.astro';
import { getPage } from '../lib/content.ts';

const page = await getPage('privacy');
const { Content } = await render(page);
---

<Base title={page.data.title} description={page.data.description}>
  <Shell id="privacy" labelledBy="privacy-heading" reveal={false}>
    <article class="card prose">
      <h1 id="privacy-heading">{page.data.title}</h1>
      <Content />
    </article>
  </Shell>
</Base>

<style>
  .prose {
    display: grid;
    gap: var(--space-4);
  }

  h1 {
    font-size: var(--text-2xl);
    font-weight: var(--weight-regular);
    letter-spacing: var(--tracking-tight);
  }

  .prose :global(p) {
    color: var(--color-text-muted);
    font-size: var(--text-base);
  }
</style>
```

- [ ] **Step 4: Run the chrome spec, then the full verification, and commit**

Run: `pnpm build && pnpm exec playwright test tests/e2e/chrome.spec.ts --project=chromium --project=webkit`
Expected: all pass.

Run the Global Constraints verification block. Expected: all green. `/privacy` is now in the sitemap, so
every per-page floor also runs on it.

```bash
git add -A
git commit -m "feat: add the sticky top bar, footer and privacy page

<your harness's Co-Authored-By line>"
```

---

### Task 4: Hero and proof strip

**Files:**
- Create: `src/components/sections/Hero.astro`, `src/components/ProofStrip.astro`,
  `tests/e2e/hero.spec.ts`
- Modify: `src/pages/index.astro`, `tests/e2e/site.spec.ts` (the Tab test's selector)
- Delete: `src/components/sections/Intro.astro`

**Interfaces:**
- Consumes:
  - `Shell` (with `hero` and `reveal={false}`), tokens and the `.btn` classes (Task 2)
  - `profile.availability`, `avatar`, `name`, `roles`, `headline`, `subline` and `proof` (Task 1)
- Produces:
  - the hero section `#top`, with its heading `h1#hero-name`
  - buttons linking to `#work` and `#contact`
  - the Tab test's selector becomes `a[href], button, input, summary`

- [ ] **Step 1: Write the failing hero spec, and widen the Tab test**

`tests/e2e/hero.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { profileValue, yamlList } from '../support/content.ts';

const PROFILE = 'src/content/profile.yaml';
const ROLES = yamlList(PROFILE, 'roles');
const PROOF = yamlList(PROFILE, 'items');

test('the hero introduces Mujtaba with both roles', async ({ page }) => {
  await page.goto('/');
  const hero = page.locator('#top');
  await expect(hero.getByRole('heading', { level: 1 })).toHaveText(profileValue('name'));
  await expect(hero.locator('.roles .visually-hidden')).toHaveText(`${ROLES[0]} and ${ROLES[1]}`);
  await expect(hero.locator('.rotator')).toHaveAttribute('aria-hidden', 'true');
  await expect(hero.locator('.badge')).toHaveText(profileValue('availability'));
  await expect(hero.locator('.headline')).toHaveText(profileValue('headline'));
});

test('the hero buttons lead to the work and contact sections', async ({ page }) => {
  await page.goto('/');
  const hero = page.locator('#top');
  await expect(hero.getByRole('link', { name: 'See my work' })).toHaveAttribute('href', '#work');
  await expect(hero.getByRole('link', { name: 'Book a call' })).toHaveAttribute('href', '#contact');
});

test('the proof strip lists every item once for assistive technology', async ({ page }) => {
  await page.goto('/');
  const tracks = page.locator('#top .track');
  await expect(tracks).toHaveCount(2);
  await expect(tracks.nth(0).locator('li')).toHaveText(PROOF);
  await expect(tracks.nth(1)).toHaveAttribute('aria-hidden', 'true');
});

test('the proof strip can be paused', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.getByLabel('Pause scrolling').check();
  const states = await page.locator('#top .track').first().evaluate((track) =>
    track.getAnimations().map((animation) => animation.playState),
  );
  expect(states).toEqual(['paused']);
});

test('nothing in the hero moves under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForTimeout(100);
  const running = await page.locator('#top').evaluate((hero) =>
    hero.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running').length,
  );
  expect(running).toBe(0);
  await expect(page.locator('#top .rotator span').nth(1)).toBeHidden();
  await expect(page.getByLabel('Pause scrolling')).toBeHidden();
});
```

In `tests/e2e/site.spec.ts`, in the "Tab reaches every link and button" test, change both selectors:
- `'a[href]:visible, button:visible'` becomes `'a[href]:visible, button:visible, input:visible, summary:visible'`
- `'a[href], button'` becomes `'a[href], button, input, summary'`

Run: `pnpm build && pnpm exec playwright test tests/e2e/hero.spec.ts --project=chromium`
Expected: FAIL, because there's no `#top` hero yet.

- [ ] **Step 2: Write the proof strip and hero**

`src/components/ProofStrip.astro`:

```astro
---
interface Props {
  label: string;
  items: string[];
}

const { label, items } = Astro.props;
---

<div class="proof">
  <div class="proof-head">
    <p class="proof-label">{label}</p>
    <label class="pause">
      <input type="checkbox" />
      <span>Pause scrolling</span>
    </label>
  </div>
  <div class="marquee">
    <ul class="track" role="list">
      {items.map((item) => <li>{item}</li>)}
    </ul>
    <ul class="track" role="list" aria-hidden="true">
      {items.map((item) => <li>{item}</li>)}
    </ul>
  </div>
</div>

<style>
  .proof {
    display: grid;
    gap: var(--space-4);
  }

  .proof-head {
    display: flex;
    gap: var(--space-4);
    align-items: center;
    justify-content: space-between;
  }

  .proof-label {
    font-weight: var(--weight-medium);
  }

  .pause {
    display: inline-flex;
    gap: var(--space-2);
    align-items: center;
    color: var(--color-text-muted);
    font-size: var(--text-xs);
    cursor: pointer;
  }

  .pause input {
    width: 1rem;
    height: 1rem;
    accent-color: var(--color-inverse);
  }

  .marquee {
    display: flex;
    overflow: hidden;
    mask-image: linear-gradient(
      90deg,
      transparent,
      var(--color-text) 10%,
      var(--color-text) 90%,
      transparent
    );
  }

  .track {
    display: flex;
    flex-shrink: 0;
    gap: var(--space-8);
    padding: 0 var(--space-8) 0 0;
    list-style: none;
    animation: marquee var(--marquee-duration) linear infinite;
  }

  .track li {
    font-size: var(--text-lg);
    font-weight: var(--weight-medium);
    white-space: nowrap;
  }

  /* Hover and focus pause it (content spec §5.2); the checkbox is the lasting control WCAG 2.2.2 needs. */
  .proof:has(.pause input:checked) .track,
  .proof:focus-within .track,
  .marquee:hover .track {
    animation-play-state: paused;
  }

  @keyframes marquee {
    to {
      transform: translateX(-100%);
    }
  }

  /* Under reduced motion the list wraps statically inside the card. */
  @media (prefers-reduced-motion: reduce) {
    .marquee {
      display: block;
      mask-image: none;
    }

    .track {
      flex-wrap: wrap;
      gap: var(--space-2) var(--space-6);
      padding: 0;
      animation: none;
    }

    .track[aria-hidden='true'],
    .pause {
      display: none;
    }
  }
</style>
```

`src/components/sections/Hero.astro`:

```astro
---
import type { CollectionEntry } from 'astro:content';
import ProofStrip from '../ProofStrip.astro';
import Shell from '../Shell.astro';

interface Props {
  profile: CollectionEntry<'profile'>['data'];
}

const { profile } = Astro.props;
const [firstRole = '', secondRole = ''] = profile.roles;
const monogram = profile.name
  .split(/\s+/)
  .map((part) => part[0] ?? '')
  .join('')
  .slice(0, 2);
---

<Shell id="top" labelledBy="hero-name" hero reveal={false}>
  <div class="card hero">
    {
      profile.availability && (
        <p class="badge">
          <span class="dot" aria-hidden="true"></span>
          {profile.availability}
        </p>
      )
    }
    <div class="identity">
      {
        profile.avatar ? (
          <img class="avatar" src={profile.avatar} alt="" width="90" height="90" />
        ) : (
          <span class="avatar monogram" aria-hidden="true">
            {monogram}
          </span>
        )
      }
      <div>
        <h1 id="hero-name">{profile.name}</h1>
        <p class="roles">
          <span class="visually-hidden">{firstRole} and {secondRole}</span>
          <span class="rotator" aria-hidden="true">
            <span>{firstRole}</span>
            <span>{secondRole}</span>
          </span>
        </p>
      </div>
    </div>
    <p class="headline">{profile.headline}</p>
    <p class="subline">{profile.subline}</p>
    <p class="actions">
      <a class="btn btn-primary" href="#work">See my work</a>
      <a class="btn btn-secondary" href="#contact">Book a call</a>
    </p>
    <ProofStrip label={profile.proof.label} items={profile.proof.items} />
  </div>
</Shell>

<style>
  .hero {
    position: relative;
    display: grid;
    gap: var(--space-6);
    padding: var(--hero-card-pad);
    overflow: hidden;
    isolation: isolate;
  }

  .hero::after {
    position: absolute;
    z-index: -1;
    inset: 0 0 0 55%;
    background-image:
      linear-gradient(var(--color-grid-line) 1px, transparent 1px),
      linear-gradient(90deg, var(--color-grid-line) 1px, transparent 1px);
    background-size: 64px 64px;
    content: '';
    mask-image: radial-gradient(circle at 60% 35%, var(--color-text), transparent 70%);
  }

  .badge {
    position: absolute;
    inset-block-start: var(--space-4);
    inset-inline-end: var(--space-4);
    display: inline-flex;
    gap: var(--space-2);
    align-items: center;
    padding: 6px 16px 6px 14px;
    border-radius: var(--radius-pill);
    background: var(--color-status-bg);
    color: var(--color-status-text);
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
    line-height: var(--leading-snug);
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentcolor;
  }

  .identity {
    display: flex;
    gap: var(--space-4);
    align-items: center;
    margin-block-start: var(--space-4);
  }

  .avatar {
    width: var(--avatar);
    height: var(--avatar);
    border-radius: 50%;
    object-fit: cover;
  }

  .monogram {
    display: grid;
    place-items: center;
    background: var(--color-shell);
    color: var(--color-text);
    font-size: var(--text-2xl);
    font-weight: var(--weight-medium);
  }

  h1 {
    font-size: var(--text-xl);
  }

  .roles {
    height: 1.5em;
    overflow: hidden;
    color: var(--color-text-muted);
  }

  .rotator {
    display: grid;
  }

  .rotator > span {
    grid-area: 1 / 1;
  }

  .rotator > span:first-child {
    animation: role-first var(--role-duration) var(--ease-standard) infinite;
  }

  .rotator > span:last-child {
    animation: role-second var(--role-duration) var(--ease-standard) infinite;
  }

  /* The roles slide through the clipped .roles line; no opacity, so contrast never dips. */
  @keyframes role-first {
    0%,
    45%,
    100% {
      transform: none;
    }

    50%,
    95% {
      transform: translateY(-110%);
    }
  }

  @keyframes role-second {
    0%,
    45%,
    100% {
      transform: translateY(110%);
    }

    50%,
    95% {
      transform: none;
    }
  }

  .headline {
    max-width: 34rem;
    font-size: var(--text-hero);
    letter-spacing: var(--tracking-tight);
    line-height: var(--leading-tight);
  }

  .subline {
    max-width: 34rem;
    color: var(--color-text-muted);
    font-size: var(--text-base);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  @media (width < 40rem) {
    .badge {
      position: static;
      justify-self: start;
    }

    .identity {
      margin-block-start: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .rotator > span {
      animation: none;
    }

    .rotator > span:last-child {
      display: none;
    }
  }
</style>
```

- [ ] **Step 3: Put the hero on the home page**

`src/pages/index.astro`:
- replace `import Intro from '../components/sections/Intro.astro';` with
  `import Hero from '../components/sections/Hero.astro';`
- replace the `<Intro … />` element with `<Hero profile={profile} />`

Delete `src/components/sections/Intro.astro`.

- [ ] **Step 4: Run the hero spec, then the full verification and perf, and commit**

Run: `pnpm build && pnpm exec playwright test tests/e2e/hero.spec.ts --project=chromium --project=webkit`
Expected: all pass. If WebKit reports a running animation after `reducedMotion: 'reduce'`, report the
animation's name rather than loosening the test.

Run the Global Constraints verification block, then `pnpm test:perf`. Expected: all green. Lighthouse
still scores ≥ 95, because the hero isn't hidden by a reveal.

```bash
git add -A
git commit -m "feat: add the hero with rotating role and pausable proof strip

<your harness's Co-Authored-By line>"
```

---

### Task 5: About and stats

**Files:**
- Create: `src/components/sections/About.astro`, `src/components/Stats.astro`, `tests/e2e/about.spec.ts`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes:
  - `Shell` (`inset`, `join="top"`) and tokens (Task 2)
  - `profile.about`, `interests`, `email` and `stats` (Task 1)
- Produces:
  - `#about`, with `h2#about-heading` "About me"
  - `.statement .word` spans
  - `dd[data-count]` stat values, whose text is always the final value in the HTML

- [ ] **Step 1: Write the failing about spec**

`tests/e2e/about.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { profileValue, yamlValues } from '../support/content.ts';

const STAT_VALUES = yamlValues('src/content/profile.yaml', 'value');

test('about shows the statement, interests and contact row without a phone number', async ({ page }) => {
  await page.goto('/');
  const about = page.getByRole('region', { name: 'About me' });
  // The about text is a folded YAML block that profileValue can't read; it names the job title.
  await expect(about.locator('.statement')).toContainText(profileValue('jobTitle'));
  await expect(about.locator('.statement .word').first()).toBeVisible();
  await expect(about.getByRole('link', { name: 'Download CV' })).toHaveAttribute('href', '/cv.pdf');
  await expect(about.getByRole('link', { name: profileValue('email') })).toHaveAttribute(
    'href',
    `mailto:${profileValue('email')}`,
  );
  expect(await about.textContent()).not.toMatch(/\+44|\b07\d{3}/);
});

test('stats count up to their final values', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.locator('#about .stats').scrollIntoViewIfNeeded();
  await expect(page.locator('#about dd[data-count]')).toHaveText(STAT_VALUES, { timeout: 5000 });
});

test('stats show their final values under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('#about dd[data-count]')).toHaveText(STAT_VALUES);
  const running = await page.locator('#about').evaluate((about) =>
    about.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running').length,
  );
  expect(running).toBe(0);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('stats show their final values', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#about dd[data-count]')).toHaveText(STAT_VALUES);
  });
});
```

Run: `pnpm build && pnpm exec playwright test tests/e2e/about.spec.ts --project=chromium`
Expected: FAIL, because there's no "About me" region.

- [ ] **Step 2: Write the components**

`src/components/Stats.astro`:

```astro
---
interface Props {
  stats: { value: string; label: string }[];
}

const { stats } = Astro.props;
---

<dl class="stats">
  {
    stats.map((stat) => (
      <div>
        <dt>{stat.label}</dt>
        <dd data-count>{stat.value}</dd>
      </div>
    ))
  }
</dl>

<script>
  // Counts each stat up from zero the first time it's seen; the HTML always holds the final value.
  const counters = document.querySelectorAll<HTMLElement>('[data-count]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function countUp(element: HTMLElement): void {
    const match = /^(\d+)(.*)$/.exec(element.textContent ?? '');
    if (!match) return;
    const target = Number(match[1]);
    const suffix = match[2] ?? '';
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / 1200);
      element.textContent = `${Math.round(target * (1 - (1 - progress) ** 3))}${suffix}`;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  if (!reduced && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          countUp(entry.target as HTMLElement);
        }
      },
      { threshold: 0.6 },
    );
    counters.forEach((counter) => observer.observe(counter));
  }
</script>

<style>
  .stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-6);
  }

  .stats > div {
    display: flex;
    flex-direction: column-reverse;
    gap: var(--space-2);
  }

  dt {
    color: var(--color-text-muted);
  }

  dd {
    margin: 0;
    font-size: var(--text-2xl);
    font-weight: var(--weight-medium);
    letter-spacing: var(--tracking-tight);
    line-height: 1;
  }

  @media (width < 40rem) {
    .stats {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
```

`src/components/sections/About.astro`:

```astro
---
import type { CollectionEntry } from 'astro:content';
import Shell from '../Shell.astro';
import Stats from '../Stats.astro';

interface Props {
  profile: CollectionEntry<'profile'>['data'];
}

const { profile } = Astro.props;
const words = profile.about.split(/\s+/);
---

<Shell id="about" labelledBy="about-heading" inset join="top">
  <div class="card about">
    <h2 id="about-heading" class="label">About me</h2>
    <p class="statement">{words.map((word) => <span class="word">{`${word} `}</span>)}</p>
    <p class="interests">{profile.interests}</p>
    <ul class="contact-row" role="list">
      <li>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false">
          <rect x="3" y="5" width="18" height="14" rx="2"></rect>
          <path d="m3 7 9 6 9-6"></path>
        </svg>
        <a href={`mailto:${profile.email}`}>{profile.email}</a>
      </li>
      <li>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false">
          <path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"></path>
        </svg>
        <a href="/cv.pdf" download>Download CV</a>
      </li>
    </ul>
    <Stats stats={profile.stats} />
  </div>
</Shell>

<style>
  .about {
    display: grid;
    gap: var(--space-6);
  }

  .statement {
    max-width: 36rem;
    font-size: var(--text-lg);
    line-height: var(--leading-snug);
  }

  .interests {
    color: var(--color-text-muted);
  }

  .contact-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-6);
    padding: 0;
    list-style: none;
  }

  .contact-row li {
    display: inline-flex;
    gap: var(--space-2);
    align-items: center;
    color: var(--color-text-muted);
  }

  .contact-row a {
    color: var(--color-text);
    overflow-wrap: anywhere;
    text-decoration: none;
  }

  .contact-row a:hover {
    text-decoration: underline;
  }

  @keyframes fill {
    from {
      color: var(--color-text-muted);
    }

    to {
      color: var(--color-text);
    }
  }

  @media (prefers-reduced-motion: no-preference) {
    @supports (animation-timeline: view()) {
      .word {
        animation: fill linear both;
        animation-timeline: view();
        animation-range: cover 25% cover 45%;
      }
    }
  }
</style>
```

`src/pages/index.astro`:
- add `import About from '../components/sections/About.astro';`
- add `<About profile={profile} />` directly after `<Hero profile={profile} />`

- [ ] **Step 3: Run the about spec, then the full verification and perf, and commit**

Run: `pnpm build && pnpm exec playwright test tests/e2e/about.spec.ts --project=chromium --project=webkit`
Expected: all pass.

Run the Global Constraints verification block, then `pnpm test:perf`. Expected: all green. The page
weight still has JavaScript ≤ 5 KB, including inline scripts.

```bash
git add -A
git commit -m "feat: add the about section with word fill and count-up stats

<your harness's Co-Authored-By line>"
```

---

### Task 6: Selected work

**Files:**
- Modify: `src/components/sections/SelectedWork.astro` (replace), `src/components/CaseStudyCard.astro`
  (replace), `src/pages/index.astro`, `tests/e2e/work.spec.ts` (append)

**Interfaces:**
- Consumes:
  - `Shell` (`join="bottom"`) (Task 2)
  - `caseStudyLabel` and `profile.sections.work` (Task 1)
- Produces:
  - `SelectedWork` props `{ studies: CollectionEntry<'caseStudies'>[]; heading: string; intro: string }`
  - `CaseStudyCard` props `{ href: string; title: string; label: string; cover: ImageMetadata; coverAlt: string }`

- [ ] **Step 1: Write the failing assertions**

Append to `tests/e2e/work.spec.ts`:

```ts
test('selected work shows six labelled cards', async ({ page }) => {
  await page.goto('/');
  const cards = page.getByRole('region', { name: WORK }).locator('li');
  await expect(cards).toHaveCount(6);
  await expect(cards.nth(0).locator('.card-label')).toHaveText('Client work · Healthcare');
  await expect(cards.nth(3).locator('.card-label')).toHaveText('Own product · Live');
  await expect(cards.nth(0).locator('img')).toHaveCSS('border-radius', '12px');
});

test('selected work continues the about shell', async ({ page }) => {
  await page.goto('/');
  const gap = await page.evaluate(() => {
    const about = document.getElementById('about')?.getBoundingClientRect();
    const work = document.getElementById('work')?.getBoundingClientRect();
    return about && work ? Math.round(work.top - about.bottom) : null;
  });
  expect(gap).toBe(0);
});
```

Run: `pnpm build && pnpm exec playwright test tests/e2e/work.spec.ts --project=chromium`
Expected: FAIL, because there's no `.card-label` and the shells are 10px apart.

- [ ] **Step 2: Rewrite the card and section**

`src/components/CaseStudyCard.astro` (whole file):

```astro
---
import type { ImageMetadata } from 'astro';
import { Image } from 'astro:assets';

interface Props {
  href: string;
  title: string;
  label: string;
  cover: ImageMetadata;
  coverAlt: string;
}

const { href, title, label, cover, coverAlt } = Astro.props;
---

<article class="case-card">
  <Image
    src={cover}
    alt={coverAlt}
    widths={[336, 672]}
    sizes="(min-width: 48rem) 336px, 100vw"
    loading="lazy"
  />
  <p class="card-label">{label}</p>
  <h3><a href={href}>{title}</a></h3>
</article>

<style>
  .case-card {
    display: grid;
    gap: var(--space-2);
  }

  img {
    width: 100%;
    margin-block-end: var(--space-3);
    border-radius: var(--radius-image);
    aspect-ratio: 4 / 3;
    object-fit: cover;
  }

  .card-label {
    color: var(--color-text-muted);
  }

  h3 {
    font-size: var(--text-lg);
    line-height: var(--leading-snug);
  }

  h3 a {
    color: var(--color-text);
    text-decoration: none;
  }

  h3 a:hover {
    text-decoration: underline;
  }
</style>
```

`src/components/sections/SelectedWork.astro` (whole file):

```astro
---
import type { CollectionEntry } from 'astro:content';
import { caseStudyLabel } from '../../lib/case-studies.ts';
import CaseStudyCard from '../CaseStudyCard.astro';
import Shell from '../Shell.astro';

interface Props {
  studies: CollectionEntry<'caseStudies'>[];
  heading: string;
  intro: string;
}

const { studies, heading, intro } = Astro.props;
---

<Shell id="work" heading={heading} intro={intro} join="bottom">
  <ul class="grid" role="list">
    {
      studies.map((study) => (
        <li>
          <CaseStudyCard
            href={`/work/${study.id}`}
            title={study.data.title}
            label={caseStudyLabel(study.data)}
            cover={study.data.cover}
            coverAlt={study.data.coverAlt}
          />
        </li>
      ))
    }
  </ul>
</Shell>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-8) var(--gap-work);
    padding: 0;
    list-style: none;
  }

  @media (width < 40rem) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
```

In `src/pages/index.astro`, change the `SelectedWork` line to:
`{featured.length > 0 && <SelectedWork studies={featured} heading={profile.sections.work.heading} intro={profile.sections.work.intro} />}`

- [ ] **Step 3: Run the work spec, then the full verification and perf, and commit**

Run: `pnpm build && pnpm exec playwright test tests/e2e/work.spec.ts --project=chromium --project=webkit`
Expected: all pass.

Run the Global Constraints verification block, then `pnpm test:perf`. Expected: all green.

```bash
git add -A
git commit -m "feat: restyle selected work as the reference's labelled project grid

<your harness's Co-Authored-By line>"
```

---

### Task 7: How I work

**Files:**
- Create: `src/components/sections/Method.astro`, `tests/e2e/method.spec.ts`
- Modify: `src/lib/content.ts` (`getMethod`), `src/pages/index.astro`

**Interfaces:**
- Consumes: `Shell` (Task 2), and the `method` collection and `profile.sections.method` (Task 1)
- Produces:
  - `getMethod(): Promise<CollectionEntry<'method'>['data'][]>`, sorted by `order`
  - `#method`

- [ ] **Step 1: Write the failing method spec**

`tests/e2e/method.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { sectionHeading, yamlValues } from '../support/content.ts';

const TITLES = yamlValues('src/content/method.yaml', 'title');

test('How I work lists the five steps in order, numbered', async ({ page }) => {
  await page.goto('/');
  const method = page.getByRole('region', { name: sectionHeading('method') });
  const steps = method.locator('ol > li');
  await expect(steps).toHaveCount(TITLES.length);
  await expect(steps.locator('h3')).toHaveText(TITLES);
  await expect(steps.nth(0).locator('.number')).toHaveText('01');
  await expect(steps.nth(4).locator('.number')).toHaveText('05');
});
```

Run: `pnpm build && pnpm exec playwright test tests/e2e/method.spec.ts --project=chromium`
Expected: FAIL, because there's no region.

- [ ] **Step 2: Add the getter and the section**

Append to `src/lib/content.ts`:

```ts
/** The "How I work" steps, in order (content spec §5.5). */
export async function getMethod(): Promise<CollectionEntry<'method'>['data'][]> {
  return (await getCollection('method'))
    .map((entry) => entry.data)
    .toSorted((a, b) => a.order - b.order);
}
```

`src/components/sections/Method.astro`:

```astro
---
import type { CollectionEntry } from 'astro:content';
import Shell from '../Shell.astro';

interface Props {
  steps: CollectionEntry<'method'>['data'][];
  heading: string;
  intro: string;
}

const { steps, heading, intro } = Astro.props;
---

<Shell id="method" heading={heading} intro={intro}>
  <ol class="steps" role="list">
    {
      steps.map((step, index) => (
        <li class="card step">
          <span class="number" aria-hidden="true">
            {String(index + 1).padStart(2, '0')}
          </span>
          <h3>{step.title}</h3>
          <p>{step.description}</p>
          <p class="tags">{step.tags.join(', ')}</p>
        </li>
      ))
    }
  </ol>
</Shell>

<style>
  .steps {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--gap-cards);
    padding: 0;
    list-style: none;
  }

  .steps > li:last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }

  .step {
    display: grid;
    gap: var(--space-2);
    align-content: start;
  }

  .number {
    margin-block-end: var(--space-8);
    color: var(--color-text-muted);
    font-size: var(--text-3xl);
    letter-spacing: var(--tracking-tight);
    line-height: var(--leading-tight);
  }

  h3 {
    font-size: var(--text-xl);
    font-weight: var(--weight-regular);
  }

  p {
    color: var(--color-text-muted);
  }

  @media (width < 40rem) {
    .steps {
      grid-template-columns: 1fr;
    }
  }
</style>
```

`src/pages/index.astro`:
- add `import Method from '../components/sections/Method.astro';`
- change the `content.ts` import to also import `getMethod`
- add `const method = await getMethod();` after `featured`
- add `<Method steps={method} heading={profile.sections.method.heading} intro={profile.sections.method.intro} />`
  after the `SelectedWork` line

- [ ] **Step 3: Run the method spec, then the full verification and perf, and commit**

Run: `pnpm build && pnpm exec playwright test tests/e2e/method.spec.ts --project=chromium --project=webkit`
Expected: all pass.

Run the Global Constraints verification block, then `pnpm test:perf`. Expected: all green.

```bash
git add -A
git commit -m "feat: add the How I work section

<your harness's Co-Authored-By line>"
```

---

### Task 8: Testimonials and Experience & skills

**Files:**
- Create:
  - `src/lib/dates.ts`, `tests/unit/dates.test.ts`
  - `src/components/sections/Testimonials.astro`, `src/components/sections/ExperienceSkills.astro`
  - `tests/e2e/experience.spec.ts`, `tests/e2e/preview.spec.ts`
- Modify: `src/lib/content.ts` (three getters), `src/pages/index.astro`

**Interfaces:**
- Consumes:
  - `visibleTestimonials` (Task 1)
  - `Shell`, `.card-inverse` and `.btn-on-inverse` (Task 2)
- Produces:
  - `formatRoleDates(start: string, end?: string): string` (`src/lib/dates.ts`), e.g.
    `'Dec 2021 – present'`
  - `getTestimonials(): Promise<CollectionEntry<'testimonials'>['data'][]>`
  - `getExperience(): Promise<CollectionEntry<'experience'>['data'][]>` (newest first)
  - `getSkills(): Promise<CollectionEntry<'skills'>['data']>`
  - `#testimonials` (only when entries are visible) and `#experience`

- [ ] **Step 1: Write the failing tests**

`tests/unit/dates.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatRoleDates } from '../../src/lib/dates.ts';

describe('formatRoleDates', () => {
  it('formats a current role', () => {
    assert.equal(formatRoleDates('2021-12'), 'Dec 2021 – present');
  });

  it('formats a finished role', () => {
    assert.equal(formatRoleDates('2018-04', '2021-11'), 'Apr 2018 – Nov 2021');
  });
});
```

`tests/e2e/experience.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { sectionHeading, yamlList, yamlValues } from '../support/content.ts';

const ROLES = yamlValues('src/content/experience.yaml', 'role');
const CERTIFICATIONS = yamlList('src/content/skills.yaml', 'certifications');

test('experience lists every role, newest first, with dates', async ({ page }) => {
  await page.goto('/');
  const section = page.getByRole('region', { name: sectionHeading('experience') });
  await expect(section.locator('.timeline h4')).toHaveText(ROLES);
  await expect(section.locator('.timeline .when').first()).toHaveText('Dec 2021 – present');
  await expect(section.getByRole('link', { name: 'Download CV' })).toHaveAttribute('href', '/cv.pdf');
});

test('the dark card lists skills and certifications', async ({ page }) => {
  await page.goto('/');
  const skills = page.locator('#experience .card-inverse');
  await expect(skills.getByRole('heading', { name: 'Skills & certifications' })).toBeVisible();
  await expect(skills.locator('.certifications li')).toHaveText(CERTIFICATIONS);
  await expect(skills.getByRole('link', { name: 'Book a call' })).toHaveAttribute('href', '#contact');
});

test('placeholder testimonials never reach production', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#testimonials')).toHaveCount(0);
  await expect(page.getByText('Placeholder testimonial')).toHaveCount(0);
});
```

`tests/e2e/preview.spec.ts`:

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Runs only against a preview build: WORKERS_CI_BRANCH=preview-test pnpm build, then PREVIEW=1.
test.skip(process.env['PREVIEW'] !== '1', 'Needs a preview build (see Task 8)');

test('preview builds show placeholder testimonials, accessibly', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'axe results do not depend on the browser engine');
  await page.goto('/');
  const quotes = page.locator('#testimonials li');
  await expect(quotes).toHaveCount(4);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  const results = await new AxeBuilder({ page })
    .include('#testimonials')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

Run: `pnpm test` (expect `dates.test.ts` to fail with `ERR_MODULE_NOT_FOUND`), then
`pnpm build && pnpm exec playwright test tests/e2e/experience.spec.ts --project=chromium`. Expected: FAIL,
because there's no experience region. The testimonials test already passes; that's expected.

- [ ] **Step 2: Implement the dates helper and getters**

`src/lib/dates.ts`:

```ts
const month = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });

function format(yearMonth: string): string {
  const [year = '1970', monthNumber = '01'] = yearMonth.split('-');
  return month.format(new Date(Date.UTC(Number(year), Number(monthNumber) - 1, 1)));
}

/** "Dec 2021 – present" or "Apr 2018 – Nov 2021" from YYYY-MM strings. */
export function formatRoleDates(start: string, end?: string): string {
  return `${format(start)} – ${end ? format(end) : 'present'}`;
}
```

Append to `src/lib/content.ts` (also add `import { visibleTestimonials } from './testimonials.ts';`
to its imports):

```ts
/** Testimonials; placeholders only outside production (content spec §5.6). */
export async function getTestimonials(): Promise<CollectionEntry<'testimonials'>['data'][]> {
  return visibleTestimonials(await getCollection('testimonials'), !isProduction).map(
    (entry) => entry.data,
  );
}

/** Roles, newest first. */
export async function getExperience(): Promise<CollectionEntry<'experience'>['data'][]> {
  return (await getCollection('experience'))
    .map((entry) => entry.data)
    .toSorted((a, b) => b.start.localeCompare(a.start));
}

export async function getSkills(): Promise<CollectionEntry<'skills'>['data']> {
  const entry = await getEntry('skills', 'main');
  if (!entry) throw new Error('src/content/skills.yaml must define a `main` entry');
  return entry.data;
}
```

Run: `pnpm test`. Expected: all unit tests pass.

- [ ] **Step 3: Write the two sections**

`src/components/sections/Testimonials.astro`:

```astro
---
import type { CollectionEntry } from 'astro:content';
import Shell from '../Shell.astro';

interface Props {
  testimonials: CollectionEntry<'testimonials'>['data'][];
  heading: string;
  intro: string;
}

const { testimonials, heading, intro } = Astro.props;
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2);
---

<Shell id="testimonials" heading={heading} intro={intro}>
  <ul class="quotes" role="list">
    {
      testimonials.map((testimonial) => (
        <li class="card quote">
          <figure>
            <figcaption>
              <span class="avatar" aria-hidden="true">
                {initials(testimonial.name)}
              </span>
              <span class="who">
                <span class="name">{testimonial.name}</span>
                <span class="role">{testimonial.role}</span>
              </span>
            </figcaption>
            <blockquote>
              <p>{testimonial.quote}</p>
            </blockquote>
          </figure>
        </li>
      ))
    }
  </ul>
</Shell>

<style>
  .quotes {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--gap-cards);
    padding: 0;
    list-style: none;
  }

  .quote {
    padding: var(--card-pad-sm);
  }

  figure {
    display: grid;
    gap: var(--space-4);
  }

  figcaption {
    display: flex;
    gap: var(--space-3);
    align-items: center;
  }

  .avatar {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--color-shell);
    font-size: var(--text-xs);
    font-weight: var(--weight-medium);
  }

  .who {
    display: grid;
  }

  .name {
    font-weight: var(--weight-medium);
  }

  .role {
    color: var(--color-text-muted);
    font-size: var(--text-xs);
  }

  blockquote {
    margin: 0;
  }

  @media (width < 40rem) {
    .quotes {
      grid-template-columns: 1fr;
    }
  }
</style>
```

`src/components/sections/ExperienceSkills.astro`:

```astro
---
import type { CollectionEntry } from 'astro:content';
import { formatRoleDates } from '../../lib/dates.ts';
import Shell from '../Shell.astro';

interface Props {
  roles: CollectionEntry<'experience'>['data'][];
  skills: CollectionEntry<'skills'>['data'];
  heading: string;
  intro: string;
}

const { roles, skills, heading, intro } = Astro.props;
---

<Shell id="experience" heading={heading} intro={intro}>
  <div class="pair">
    <section class="card column" aria-labelledby="experience-roles">
      <h3 id="experience-roles">Experience</h3>
      <ol class="timeline" role="list">
        {
          roles.map((role) => (
            <li>
              <p class="when">{formatRoleDates(role.start, role.end)}</p>
              <h4>{role.role}</h4>
              <p class="where">{role.employer}</p>
              <p class="summary">{role.summary}</p>
            </li>
          ))
        }
      </ol>
      <p><a class="btn btn-primary" href="/cv.pdf" download>Download CV</a></p>
    </section>
    <section class="card card-inverse column" aria-labelledby="experience-skills">
      <h3 id="experience-skills">Skills &amp; certifications</h3>
      {
        skills.groups.map((group) => (
          <div class="group">
            <h4>{group.name}</h4>
            <ul class="checks" role="list">
              {group.items.map((item) => (
                <li>{item}</li>
              ))}
            </ul>
          </div>
        ))
      }
      <div class="group">
        <h4>Certifications</h4>
        <ul class="checks certifications" role="list">
          {skills.certifications.map((certification) => (
            <li>{certification}</li>
          ))}
        </ul>
      </div>
      <p><a class="btn btn-on-inverse" href="#contact">Book a call</a></p>
    </section>
  </div>
</Shell>

<style>
  .pair {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--gap-pair);
  }

  .column {
    display: grid;
    gap: var(--space-6);
    align-content: start;
  }

  h3 {
    font-size: var(--text-xl);
  }

  h4 {
    font-size: var(--text-base);
  }

  .timeline {
    display: grid;
    gap: var(--space-6);
    padding: 0;
    list-style: none;
  }

  .when,
  .where,
  .summary {
    color: var(--color-text-muted);
  }

  .card-inverse .group h4 {
    margin-block-end: var(--space-2);
  }

  .checks {
    display: grid;
    gap: var(--space-2);
    padding: 0;
    list-style: none;
  }

  .checks li {
    display: flex;
    gap: var(--space-3);
    align-items: baseline;
  }

  .checks li::before {
    flex-shrink: 0;
    width: 10px;
    height: 5px;
    border-block-end: 2px solid currentcolor;
    border-inline-start: 2px solid currentcolor;
    content: '';
    transform: translateY(-2px) rotate(-45deg);
  }

  @media (width < 40rem) {
    .pair {
      grid-template-columns: 1fr;
    }
  }
</style>
```

`src/pages/index.astro`:
- import `Testimonials` and `ExperienceSkills`, and add `getTestimonials`, `getExperience` and
  `getSkills` to the `content.ts` import
- add:

```ts
const testimonials = await getTestimonials();
const roles = await getExperience();
const skills = await getSkills();
```

- after the `Method` element, add:

```astro
  {testimonials.length > 0 && (
    <Testimonials testimonials={testimonials} heading={profile.sections.testimonials.heading} intro={profile.sections.testimonials.intro} />
  )}
  <ExperienceSkills roles={roles} skills={skills} heading={profile.sections.experience.heading} intro={profile.sections.experience.intro} />
```

- [ ] **Step 4: Verify the preview behaviour**

```bash
WORKERS_CI_BRANCH=preview-test pnpm build
PREVIEW=1 pnpm exec playwright test tests/e2e/preview.spec.ts --project=chromium
pnpm build
```

Expected: 1 passed, then the production build is back in `dist/`.

- [ ] **Step 5: Run the full verification and perf, and commit**

Run the Global Constraints verification block, then `pnpm test:perf`. Expected: all green. Without
`PREVIEW=1`, `preview.spec.ts` is skipped. axe checks the dark card's contrast in both schemes.

```bash
git add -A
git commit -m "feat: add placeholder-gated testimonials and the experience and skills cards

<your harness's Co-Authored-By line>"
```

---

### Task 9: Contact and booking panel

**Files:**
- Create: `src/components/BookingPanel.astro`, `tests/e2e/booking.spec.ts`
- Modify: `src/components/sections/Contact.astro` (replace), `src/pages/index.astro`,
  `astro.config.ts` (CSP), `tests/e2e/pages.spec.ts` (CSP assertion), `tests/e2e/contact.spec.ts`
  (booking tests)

**Interfaces:**
- Consumes:
  - `Shell` (Task 2)
  - `CopyEmail`
  - `profile.bookingUrl`, `email`, `socials`, `cvUpdated`, `name` and `sections.contact` (Task 1)
- Produces:
  - `BookingPanel` props `{ url: string; name: string }`
  - `#contact`
  - the CSP directive `frame-src https://cal.com https://app.cal.com`

- [ ] **Step 1: Write the failing booking spec and update the contact assertions**

`tests/e2e/booking.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { profileValue } from '../support/content.ts';

const BOOKING_URL = profileValue('bookingUrl');
const EMBED_URL = `${BOOKING_URL}?embed=true`;
const CAL = /^https:\/\/(?:app\.)?cal\.com\//;

test.beforeEach(async ({ page }) => {
  // CI never depends on Cal.com: stub every request to it (content spec §11).
  await page.route(CAL, (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Stub</title><p>Booking stub</p>' }),
  );
});

test('nothing loads from Cal.com until the booking panel opens', async ({ page }) => {
  const calRequests: string[] = [];
  page.on('request', (request) => {
    if (CAL.test(request.url())) calRequests.push(request.url());
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(calRequests).toEqual([]);
  await expect(page.locator('#contact iframe')).toHaveCount(0);

  await page.locator('#contact summary').click();
  const frame = page.locator('#contact iframe');
  await expect(frame).toHaveAttribute('src', EMBED_URL);
  await expect(frame).toHaveAttribute('title', `Book a call with ${profileValue('name')} on Cal.com`);
  await expect(frame).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
  await expect.poll(() => calRequests.length).toBeGreaterThan(0);
});

test('opening the booking panel causes no CSP violation', async ({ page }) => {
  await page.addInitScript(() => {
    const violations: string[] = [];
    Object.defineProperty(window, '__cspViolations', { value: violations });
    document.addEventListener('securitypolicyviolation', (event) => {
      violations.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  await page.goto('/');
  await page.locator('#contact summary').click();
  await expect(page.frameLocator('#contact iframe').getByText('Booking stub')).toBeVisible();
  const violations = await page.evaluate(() => (window as unknown as { __cspViolations: string[] }).__cspViolations);
  expect(violations).toEqual([]);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the panel offers the booking page link instead', async ({ page }) => {
    await page.goto('/');
    await page.locator('#contact summary').click();
    await expect(page.locator('#contact iframe')).toHaveCount(0);
    const fallback = page.locator('#contact').getByRole('link', { name: /Open the booking page/ });
    await expect(fallback).toHaveAttribute('href', BOOKING_URL);
    await expect(fallback).toHaveAttribute('target', '_blank');
  });
});
```

In `tests/e2e/contact.spec.ts`, replace the first test ("the contact section offers email, booking and
CV links") with:

```ts
test('the contact section offers booking, email, CV and socials', async ({ page }) => {
  await page.goto('/');
  const contact = page.locator('#contact');
  await expect(contact.locator('summary')).toHaveText('Book a 30-minute call');
  await expect(contact.getByRole('link', { name: EMAIL })).toHaveAttribute('href', `mailto:${EMAIL}`);
  await expect(contact.getByRole('link', { name: /^Download CV/ })).toHaveAttribute('href', '/cv.pdf');
  for (const platform of ['LinkedIn', 'X', 'TikTok', 'GitHub']) {
    await expect(contact.getByRole('link', { name: platform, exact: true })).toHaveCount(1);
  }
});
```

- The copy-button test targets `page.locator('#contact').getByRole('button', { name: 'Copy email address' })`.
- Its status assertion targets `page.locator('#contact [role="status"]')`.
- The `BOOKING_URL` constant is no longer used in this file. Remove it.

In `tests/e2e/pages.spec.ts`, in the "ships a strict Content Security Policy" test, add
`"frame-src https://cal.com https://app.cal.com"` to the array of required directives.

Run: `pnpm build && pnpm exec playwright test tests/e2e/booking.spec.ts --project=chromium`
Expected: FAIL, because there's no `summary` in `#contact`.

- [ ] **Step 2: Write the booking panel and contact section**

`src/components/BookingPanel.astro`:

```astro
---
interface Props {
  url: string;
  name: string;
}

const { url, name } = Astro.props;
const embedUrl = new URL(url);
embedUrl.searchParams.set('embed', 'true');
---

<booking-panel data-src={embedUrl.href} data-title={`Book a call with ${name} on Cal.com`}>
  <details class="booking">
    <summary class="btn btn-primary">Book a 30-minute call</summary>
    <div class="panel">
      <div class="frame" data-frame></div>
      <p class="fallback">
        <a href={url} target="_blank" rel="noopener noreferrer">
          Trouble loading? Open the booking page in a new tab
        </a>
      </p>
    </div>
  </details>
</booking-panel>

<script>
  // The frame is created only when the visitor opens the panel, so nothing reaches Cal.com
  // before that (content spec §5.8). Browsers load hidden frames eagerly, hence no frame in the HTML.
  class BookingPanel extends HTMLElement {
    connectedCallback(): void {
      const details = this.querySelector('details');
      const slot = this.querySelector('[data-frame]');
      const src = this.dataset['src'];
      const title = this.dataset['title'];
      if (!details || !slot || !src || !title) return;
      details.addEventListener('toggle', () => {
        if (!details.open || slot.querySelector('iframe')) return;
        const frame = document.createElement('iframe');
        frame.src = src;
        frame.title = title;
        frame.referrerPolicy = 'strict-origin-when-cross-origin';
        frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
        slot.append(frame);
      });
    }
  }

  customElements.define('booking-panel', BookingPanel);
</script>

<style>
  summary {
    list-style: none;
  }

  /* Safari still draws the disclosure marker without this. */
  summary::-webkit-details-marker {
    display: none;
  }

  .panel {
    display: grid;
    gap: var(--space-3);
    margin-block-start: var(--space-4);
  }

  .frame :global(iframe) {
    width: 100%;
    height: 640px;
    border: 0;
    border-radius: var(--radius-image);
    background: var(--color-surface);
  }

  .fallback a {
    color: var(--color-text-muted);
  }
</style>
```

`src/components/sections/Contact.astro` (whole file):

```astro
---
import type { CollectionEntry } from 'astro:content';
import { socialLabels } from '../../lib/social.ts';
import BookingPanel from '../BookingPanel.astro';
import CopyEmail from '../CopyEmail.astro';
import Shell from '../Shell.astro';

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

<Shell id="contact" heading={profile.sections.contact.heading} intro={profile.sections.contact.intro}>
  <div class="card contact">
    <BookingPanel url={profile.bookingUrl} name={profile.name} />
    <p class="email">
      <a href={`mailto:${profile.email}`}>{profile.email}</a>
      <CopyEmail email={profile.email} />
    </p>
    <p>
      <a href="/cv.pdf" download>Download CV</a>
      <span class="muted">(PDF, updated {cvDate})</span>
    </p>
    <ul class="socials" role="list">
      {
        profile.socials.map((social) => (
          <li>
            <a href={social.url}>{socialLabels[social.platform]}</a>
          </li>
        ))
      }
    </ul>
  </div>
</Shell>

<style>
  .contact {
    display: grid;
    gap: var(--space-4);
  }

  .email {
    font-size: var(--text-lg);
    overflow-wrap: anywhere;
  }

  .muted {
    color: var(--color-text-muted);
  }

  .socials {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    padding: 0;
    list-style: none;
  }
</style>
```

In `astro.config.ts`, add `"frame-src https://cal.com https://app.cal.com"` to the
`security.csp.directives` array, after `"form-action 'none'"`.

In `src/pages/index.astro`, make sure `<Contact profile={profile} />` is the last element, after
`ExperienceSkills`.

- [ ] **Step 3: Run the booking and contact specs, then the full verification and perf, and commit**

Run: `pnpm build && pnpm exec playwright test tests/e2e/booking.spec.ts tests/e2e/contact.spec.ts --project=chromium --project=webkit`
Expected: all pass.

If WebKit's `sandbox` attribute value or the `toggle` event behaves differently, report it rather
than weakening the assertion.

Confirm the embed host (content spec §12 asks for it to be recorded):

```bash
curl -sI "https://cal.com/rick/30min?embed=true" | grep -iE "^(HTTP|location|content-security-policy|x-frame-options)"
```

Record the output in your report. If Cal.com redirects the embed to a host other than `cal.com` or
`app.cal.com`, stop and report; don't widen `frame-src` on your own. The same applies if it refuses
framing (`X-Frame-Options`, or a `frame-ancestors` that excludes other sites).

Run the Global Constraints verification block, then `pnpm test:perf`. Expected: all green. The
page-weight check still shows no third-party request.

```bash
git add -A
git commit -m "feat: add the contact section with an opt-in Cal.com booking panel

<your harness's Co-Authored-By line>"
```

---

### Task 10: Case-study page and home structure

**Files:**
- Modify:
  - `src/layouts/CaseStudy.astro` (replace)
  - `src/components/mdx/Figure.astro`, `src/components/mdx/Callout.astro` (styles only)
  - `tests/e2e/work.spec.ts` (append)
- Create: `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes:
  - `Shell` and `TagList`
  - `caseStudyLabel` (Task 1)
  - `Base`
- Produces: the case-study page with `h1#case-study-title`, a label line, facts, the cover, the body
  card, links and "Back to all work"

- [ ] **Step 1: Write the failing specs**

`tests/e2e/home.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('home sections appear in the reference order', async ({ page }) => {
  await page.goto('/');
  const ids = await page.locator('main > section').evaluateAll((sections) => sections.map((section) => section.id));
  expect(ids).toEqual(['top', 'about', 'work', 'method', 'experience', 'contact']);
});

test('every home section has an accessible name', async ({ page }) => {
  await page.goto('/');
  for (const id of ['top', 'about', 'work', 'method', 'experience', 'contact']) {
    const labelledBy = await page.locator(`#${id}`).getAttribute('aria-labelledby');
    expect(labelledBy, id).toBeTruthy();
    await expect(page.locator(`#${labelledBy}`)).toHaveCount(1);
  }
});

test('every navigation link lands on a home section', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
  for (const href of hrefs) {
    await expect(page.locator(href.replace('/', ''))).toHaveCount(1);
  }
});
```

Append to `tests/e2e/work.spec.ts`:

```ts
test('a case-study page has the reference layout', async ({ page }) => {
  await page.goto('/work/healthcare-automation');
  await expect(page.locator('.case-study .label')).toHaveText(
    'Client work · Healthcare',
  );
  await expect(page.locator('.case-study .facts')).toContainText('DigiBlu');
  await expect(page.locator('.case-study .body')).toHaveCSS('border-radius', '20px');
  await expect(page.getByRole('link', { name: 'Back to all work' })).toHaveAttribute('href', '/#work');
});
```

Run: `pnpm build && pnpm exec playwright test tests/e2e/home.spec.ts tests/e2e/work.spec.ts --project=chromium`
Expected:
- `home.spec.ts` passes; it guards the order and naming built in Tasks 4–9.
- The case-study layout test fails, because there's no `.facts` "DigiBlu" in the new form and no "Back
  to all work".

- [ ] **Step 2: Rewrite the case-study layout**

`src/layouts/CaseStudy.astro` (whole file):

```astro
---
import { Image } from 'astro:assets';
import type { CollectionEntry } from 'astro:content';
import Shell from '../components/Shell.astro';
import TagList from '../components/TagList.astro';
import { caseStudyLabel } from '../lib/case-studies.ts';
import Base from './Base.astro';

interface Props {
  study: CollectionEntry<'caseStudies'>;
  ogImageUrl: string;
  structuredData: string;
}

const { study, ogImageUrl, structuredData } = Astro.props;
const { title, summary, role, timeframe, employer, tags, links, cover, coverAlt } = study.data;
---

<Base
  title={title}
  description={summary}
  image={{ url: ogImageUrl, alt: coverAlt }}
  type="article"
  structuredData={structuredData}
>
  <Shell id="case-study" labelledBy="case-study-title" reveal={false}>
    <article class="case-study">
      <header class="head">
        <p class="label">{caseStudyLabel(study.data)}</p>
        <h1 id="case-study-title">{title}</h1>
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
            employer && (
              <div>
                <dt>Employer</dt>
                <dd>{employer}</dd>
              </div>
            )
          }
        </dl>
        <TagList tags={tags} />
      </header>
      <Image
        class="cover"
        src={cover}
        alt={coverAlt}
        widths={[640, 1280]}
        sizes="(min-width: 48rem) 696px, 100vw"
        loading="eager"
        fetchpriority="high"
      />
      <div class="card body">
        <slot />
      </div>
      {
        links.length > 0 && (
          <section class="links" aria-labelledby="links-heading">
            <h2 id="links-heading">Links</h2>
            <ul role="list">
              {links.map((link) => (
                <li>
                  <a href={link.url}>{link.label}</a>
                </li>
              ))}
            </ul>
          </section>
        )
      }
      <p><a class="btn btn-secondary" href="/#work">Back to all work</a></p>
    </article>
  </Shell>
</Base>

<style>
  .case-study {
    display: grid;
    gap: var(--space-8);
  }

  .head {
    display: grid;
    gap: var(--space-3);
  }

  h1 {
    font-size: var(--text-hero);
    font-weight: var(--weight-regular);
    letter-spacing: var(--tracking-tight);
    line-height: var(--leading-tight);
  }

  .summary {
    color: var(--color-text-muted);
    font-size: var(--text-base);
  }

  .facts {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-6);
  }

  dt {
    color: var(--color-text-muted);
  }

  dd {
    margin: 0;
    font-weight: var(--weight-medium);
  }

  .cover {
    width: 100%;
    border-radius: var(--radius-image);
    aspect-ratio: 4 / 3;
    object-fit: cover;
  }

  .body {
    display: grid;
    gap: var(--space-4);
    font-size: var(--text-base);
  }

  .body :global(h2) {
    font-size: var(--text-xl);
  }

  .body :global(p),
  .body :global(li) {
    color: var(--color-text-muted);
  }

  .links ul {
    display: grid;
    gap: var(--space-2);
    padding: 0;
    list-style: none;
  }

  .links h2 {
    margin-block-end: var(--space-2);
    font-size: var(--text-xl);
  }
</style>
```

- [ ] **Step 3: Restyle the MDX components**

In `src/components/mdx/Callout.astro`, replace the `.callout` rule with:

```css
  .callout {
    margin-block: var(--space-6);
    padding: var(--space-4) var(--space-6);
    border-inline-start: 4px solid var(--color-inverse);
    border-radius: var(--radius-image);
    background: var(--color-shell);
    color: var(--color-text);
  }
```

In `src/components/mdx/Figure.astro`, add this rule inside its `<style>`:

```css
  .figure :global(img) {
    border-radius: var(--radius-image);
  }
```

- [ ] **Step 4: Run the specs, then the full verification and perf, and commit**

Run: `pnpm build && pnpm exec playwright test tests/e2e/home.spec.ts tests/e2e/work.spec.ts --project=chromium --project=webkit`
Expected: all pass.

Run the Global Constraints verification block, then `pnpm test:perf`. Expected: all green on every
page, including the case studies.

```bash
git add -A
git commit -m "feat: restyle the case-study page and guard the home structure

<your harness's Co-Authored-By line>"
```

---

### Task 11: Documentation and spec amendments

**Files:**
- Modify: `docs/superpowers/specs/2026-09-24-portfolio-foundation-design.md` (hand-edit; it's
  Prettier-ignored), `README.md`, `docs/setup.md`

**Interfaces:**
- Consumes: everything above
- Produces: documentation that matches the built site

- [ ] **Step 1: Amend the foundation spec**

In `docs/superpowers/specs/2026-09-24-portfolio-foundation-design.md`:
- §4 floor 3: change "No requests to any third-party origin" to "No third-party request until the
  visitor opts in. The only opt-in is opening the Cal.com booking panel (content spec §5.8)".
- §7, in the `<meta>` CSP directive list: add `frame-src https://cal.com https://app.cal.com`.
- §10: add `@fontsource-variable/mona-sans` to the "Runtime / build" row.
- §15: append a new dated block:

```md
**2026-09-25, content & design spec.** `docs/superpowers/specs/2026-09-25-portfolio-content-design.md` §12 amends this spec:

| Change | Reason |
|---|---|
| Floor 3 allows third-party requests only after the visitor opens the booking panel | The owner chose inline Cal.com booking |
| CSP adds `frame-src https://cal.com https://app.cal.com` | Needed for the booking frame, created by a ~300-byte script on `toggle` because browsers load hidden frames eagerly |
| §5 tokens and §6 content fields are replaced by the content spec §4 and §7 | Reference build and anonymised case studies |
| `@fontsource-variable/mona-sans` added | Font decision (Mona Sans, OFL-1.1, 39 KB) |
```

- [ ] **Step 2: Update the README**

In `README.md`, replace the "Updating content" section's bullet list with:

```md
- **Profile** (`src/content/profile.yaml`): name, roles, headline, about, stats, section headings, email,
  Cal.com event link, socials, CV date and search defaults.
  - Lines marked `# PLACEHOLDER` must be replaced before launch. A production deploy refuses to build
    while any remain.
- **Case studies** (`src/content/case-studies/<slug>/index.mdx`): one folder per project, with its
  images.
  - `kind` is `client` (needs a `sector`) or `product` (needs a `status`: live, in-progress or retired).
  - Clients are always anonymised: describe them by industry. A test fails if a former client's name
    appears.
  - MDX can use `<Figure>` and `<Callout>` without importing them.
- **How I work, experience, skills** (`method.yaml`, `experience.yaml`, `skills.yaml`): one entry per
  step, role or group.
- **Testimonials** (`testimonials.yaml`): only publish quotes the person has agreed to. Entries with
  `placeholder: true` show in previews but never on the live site. The section disappears when nothing
  is left to show.
- **Privacy page** (`src/content/pages/privacy.md`).
- **Email address**: when it changes, also update `Contact:` in `public/.well-known/security.txt`. A test
  checks that they match.
- **Never add a phone number.** A test fails if one appears in content or `public/`.
```

In the README's "Security" section, add this bullet:

```md
- **Booking:** the Cal.com calendar is created only when a visitor opens "Book a 30-minute call", so
  nothing loads from Cal.com before that. The CSP allows frames from `cal.com` and `app.cal.com` only.
```

- [ ] **Step 3: Update the setup guide**

In `docs/setup.md`, add these two items at the top of the "Launch checklist":

```md
- [ ] Every `# PLACEHOLDER` in `src/content/profile.yaml` is replaced: the email address, the Cal.com
      event link, and the LinkedIn, X and TikTok URLs.
- [ ] The testimonials are real and consented (`placeholder: false`), or the section is empty.
```

- [ ] **Step 4: Verify and commit**

```bash
pnpm format
pnpm format:check
pnpm test
```

Expected: both pass. The docs change no code.

```bash
git add -A
git commit -m "docs: record the content spec amendments and the new content workflow

<your harness's Co-Authored-By line>"
```
