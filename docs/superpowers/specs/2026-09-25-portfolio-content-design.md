# Portfolio — content & design spec (v1)

**Date:** 2026-09-25
**Status:** Design agreed in chat; awaiting written-spec review
**Builds on:** `docs/superpowers/specs/2026-09-24-portfolio-foundation-design.md` (the "foundation spec"). Its floors,
security model, build and testing rules still bind everything here unless §12 below amends them.

## How to use this document

This spec says **what the v1 site contains and how it looks**; the foundation spec says how it's built and
guarded. Read both. The decisions in §2 were made with the owner; don't re-open them in implementation.

## 1. Goal

A personal-brand site for **Mujtaba Shah** where recruiters, employers and potential clients can all find
him. It presents one idea that bridges his two strands of work:

> He takes messy real-world problems and turns them into automation and products people actually use.

- **Strand 1, consulting:** 9+ years in intelligent automation, process redesign and digital
  transformation (DigiBlu, Infosys Consulting) across the public sector, healthcare, education, financial
  services and telecoms.
- **Strand 2, building:** his own products made with low-code and AI tooling (AMNIKI, Viola AI, and this
  site).

## 2. Decisions (made with the owner, 2026-09-25)

| Topic | Decision |
|---|---|
| Audience | A personal brand serving recruiters, employers and clients together |
| Positioning | "The bridge": consultant and builder in one story (§1) |
| Name | **Mujtaba Shah** leads everywhere (hero heading, titles, search). "Muj" stays in handles. |
| Voice | First person ("I help teams…"), British English |
| Visual approach | A **reference build** modelled on the free Framer template *Portfolik* (https://portfolik.framer.website/): its layout, spacing, type scale, component styles and motion. Written as original code with the owner's content and placeholder images. Then refined section by section in later iterations. |
| What is not copied | Portfolik's text, images, logos, avatar, code, and the Framer badges |
| Font | **Mona Sans** (OFL-1.1), self-hosted, Latin variable `wght` file (39 KB) |
| Clients | **Anonymised everywhere on the site.** No client names: case studies, proof strip and experience describe clients by sector ("a UK healthcare group"). Employers (DigiBlu, Infosys Consulting) are named. |
| Case studies (v1) | Six: three client, three own-product (§5.4) |
| Contact | **No form.** Cal.com booking loads inline only after the visitor clicks "Book a call" (§5.8), plus email, copy button, CV and socials |
| Not in v1 | FAQ, pricing and services, a contact form, "Now / pipeline" section, writing or blog |

## 3. Page structure

**Home** (one page, sections in the reference's order):

| # | Section | `id` | Reference equivalent |
|---|---|---|---|
| — | Top bar (sticky) | — | top bar |
| 1 | Hero, including the proof strip | `top` | hero + "Trusted by" strip |
| 2 | About, including stats | `about` | about + stats |
| 3 | Selected work | `work` | case studies & projects |
| 4 | How I work | `method` | services |
| 5 | Testimonials (hidden when empty) | `testimonials` | testimonials |
| 6 | Experience & skills | `experience` | pricing (restyled) |
| 7 | Contact | `contact` | contact (form replaced) |
| — | Footer | — | footer |

The order follows the reference. This moves About before Selected work, and Experience after
Testimonials, compared with the order first sketched in chat.

**Other pages:**
- `/work/<slug>`, one page per case study (§6)
- `/privacy`, a short privacy notice (§5.9)
- the existing 404 page, restyled

**Navigation** (top bar, in order): About, Work, How I work, Experience, Contact. Each link targets its
section `id`.

## 4. Design tokens (measured from the reference at 1440px)

Replace the placeholder values in `src/styles/tokens.css` with these. Component rules from the foundation
spec still apply: tokens only, no colour literals outside `tokens.css`.

### Colour (light)

| Token | Value | Use |
|---|---|---|
| `--color-page` | `#FFFFFF` | page background |
| `--color-shell` | `#F3F4F6` | section shells |
| `--color-surface` | `#FFFFFF` | inner cards |
| `--color-text` | `#0A0A0A` | headings, primary text |
| `--color-text-muted` | `#4A4F54` | body and secondary text |
| `--color-inverse` | `#0A0A0A` | dark card background, primary button |
| `--color-on-inverse` | `#FFFFFF` | text on dark |
| `--color-on-inverse-muted` | `rgb(255 255 255 / 0.8)` | secondary text on dark |
| `--color-border` | `#E5E7EB` | secondary-button ring, dividers |
| `--color-nav` | `rgb(242 243 245 / 0.8)` | top bar, with a 12px backdrop blur |
| `--color-status-bg` | `#E2F9DD` | availability badge |
| `--color-status-text` | `#137300` | badge text and dot |
| `--color-focus` | `#0A0A0A` | focus ring |

The reference's badge text (`#178D00` on `#E2F9DD`) is 3.9:1, below WCAG AA for 12px text. `#137300` is
5.4:1 and still reads as the same green.

### Colour (dark)

The reference has no dark design. Derive one so the foundation's `prefers-color-scheme` rule holds:
- page `#0A0A0A`, shell `#161616`, surface `#1F1F1F`
- text `#F5F5F5`, muted `#A3A3A3`
- inverse `#F5F5F5` on `#0A0A0A`
- border `#2E2E2E`, nav `rgb(22 22 22 / 0.8)`
- status `#123D0B` background with `#8BE07A` text
- focus `#F5F5F5`

Every pair must pass the axe checks that already run in dark mode.

### Type (Mona Sans)

| Role | Size / line-height | Weight | Tracking |
|---|---|---|---|
| Hero headline | 28 / 33.6px | 400 | −0.02em |
| Stat number | 28 / 28px | 500 | −0.02em |
| Step number | 36 / 43.2px | 400 | −0.02em, muted colour |
| Section heading (h2), name, card title | 20 / 28px | 500 (card titles 400) | normal |
| Case-study title | 18 / 27px | 500 | normal |
| Lead text | 16 / 25.6px | 400 | normal |
| Body, buttons, nav | 14 / 21px | 400 (buttons and nav 500) | normal |
| Badge, small print | 12 / 16.8px | 500 | normal |
| Clock | 13 / 13px | 500 | −0.04em |

Below 640px wide, the hero headline drops to 24 / 29px.

### Shape, spacing, elevation

| Token | Value |
|---|---|
| Content column | 760px max, centred; 20px page gutter (16px below 640px) |
| Top bar | 64px tall, 20px radius, sticky 18px from the top |
| Section shell | 22px radius; padding 50px 32px 32px; 10px between shells |
| Hero shell | padding 66px 2px 2px (the top bar sits in its first 64px) around a white inner card with 20px radius |
| Inner card | 20px radius; 32px padding (28px for testimonials) |
| Image | 12px radius; 4:3 |
| Button | 12px radius; 8px 20px padding; 40px tall |
| Pill / badge | 999px radius; padding 6px 16px 6px 14px |
| Avatar | 90px circle |
| Primary button | `--color-inverse` background, with the reference's layered shadow (an inner highlight, a 1px ring and three soft drop layers) expressed as tokens |
| Secondary button | surface background, a 1px `--color-border` ring, soft drop shadow |

Grids are 2 columns, collapsing to 1 column below 640px. Gaps, as measured:
- 24px for the case-study grid
- 6px for the method and testimonial card grids
- 10px between the two experience cards

## 5. Sections

Every section's text comes from content files (§7), including each section's heading and sub-line
(`profile.sections`). The headings quoted below, such as "Selected work", are the drafted content values.
Components hold only UI labels such as "Download CV" and "Copy email address".

### 5.1 Top bar

- **Left:** a live clock for London (`Europe/London`, `hh:mm:ss AM`) and the label "London".
- **Centre:** the navigation (§3).
- **Right:** icon buttons for X, LinkedIn, TikTok and GitHub, taken from `profile.socials`. Each has an
  accessible name, for example "Mujtaba Shah on X".
- **Icons:** inline SVGs. X, TikTok and GitHub path data comes from Simple Icons (CC0). LinkedIn is a
  simple "in" mark drawn for this site.
- **Clock without JavaScript:** it shows the build-time London time with no seconds. With JavaScript it
  ticks every second.
- **Below 640px:** the navigation wraps to a second row inside the bar. There's no hamburger menu.

### 5.2 Hero (`#top`)

The hero is a white inner card in the hero shell. It contains, in order:
- **Availability badge** (top right): a green pill, e.g. "Open to new opportunities", from
  `profile.availability`. Hidden when empty.
- **Avatar:** a 90px circle. It uses `profile.avatar` when set, otherwise a placeholder monogram "MS".
- **Name:** `h1` "Mujtaba Shah".
- **Rotating role:** below the name, alternating between `profile.roles` ("Intelligent Automation" /
  "AI Product Builder").
  - The animation is CSS only.
  - The visible rotator is `aria-hidden`. A visually hidden sentence gives screen readers both roles
    once.
  - Under reduced motion, the first role shows statically.
- **Headline:** `profile.headline`, for example "I turn messy processes into automation and products
  people actually use."
- **Sub-line:** `profile.subline`.
- **Buttons:** primary "See my work" (to `#work`) and secondary "Book a call" (to `#contact`).
- **Background:** a faint grid pattern in the card's right half, drawn with CSS gradients using tokens.
- **Proof strip**, at the bottom of the card:
  - the label `profile.proof.label` (e.g. "Nine years across"), then a horizontally scrolling strip of
    text items from `profile.proof.items`: the employers DigiBlu and Infosys Consulting, and the sectors
    public sector, healthcare, education, financial services and telecoms
  - CSS animation with the list duplicated for a seamless loop (the duplicate is `aria-hidden`)
  - it pauses on hover and focus, and wraps statically under reduced motion
  - a small "Pause scrolling" checkbox gives keyboard and touch users a lasting pause (WCAG 2.2.2)
  - text only, no logos

### 5.3 About (`#about`) and stats

The About shell joins Selected work into one continuous shell, as in the reference: About's shell has
rounded top corners, and Selected work's has rounded bottom corners.

- A small label "About me", then the statement `profile.about`: two or three sentences in the first
  person.
- **Statement reveal:** the text fills from muted to full colour word by word as it scrolls into view.
  This uses CSS scroll-driven animations (`animation-timeline: view()`). Browsers without support, and
  reduced motion, show it fully coloured.
- **Interests:** `profile.interests` as one muted line (e.g. "Outside work: boxing at Legends MMA, four
  languages, and building side projects.").
- **Contact row:** an email link and "Download CV" (`/cv.pdf`). **No phone number.**
- **Stats:** four items from `profile.stats`, for example:
  - 9+ Years' experience
  - 5 Sectors
  - 6 Case studies
  - 2 Own products

  The final value is rendered in HTML, so crawlers, visitors without JavaScript, and reduced-motion
  visitors see the real number. With JavaScript, each counts up from zero the first time it scrolls into
  view.

### 5.4 Selected work (`#work`)

- **Heading:** `h2` "Selected work", with a sub-line.
- **Cards:** a 2-column grid of the six case studies.
  - Each card is a 4:3 image, a label line, and the title linking to `/work/<slug>`.
  - Client work is labelled with its sector, e.g. "Client work · Healthcare".
  - Own products are labelled with their status, e.g. "Own product · Live".
- **No "See all projects" button:** all six are shown.

**The six (drafts from the CV and LinkedIn; the owner confirms or rewrites every word):**

| Slug | Title (draft) | Kind | Label | Source |
|---|---|---|---|---|
| `healthcare-automation` | Automating back-office work for a UK healthcare group | client | Healthcare | DigiBlu: RPA and workflow automation |
| `pensions-operating-model` | Redesigning a pensions administrator's operating model | client | Financial services | DigiBlu: as-is assessment, target operating model, SOPs |
| `satellite-data-product` | Owning a data-visualisation product for a global satellite communications company | client | Telecoms | Infosys Consulting: Product Owner, dashboards on a cloud data warehouse |
| `amniki` | AMNIKI: a curated wellness and lifestyle marketplace | product | Live | Own product |
| `viola-ai` | Viola AI: helping students understand research papers | product | Retired | Own product |
| `this-site` | Building this portfolio with AI, to production standards | product | In progress | This repository |

Product statuses are drafts: AMNIKI "Live" and Viola AI "Retired" follow LinkedIn's wording. `this-site`
becomes "Live" at launch. Images are placeholders until the owner supplies them.

### 5.5 How I work (`#method`)

- **Heading:** `h2` "How I work", with a sub-line.
- **Cards:** five numbered white cards (01–05) in the reference's service-card style, from the
  `method` collection:
  - Understand (as-is mapping, stakeholder workshops)
  - Design (future state, target operating model)
  - Justify (business case, ROI)
  - Build (automation, apps, products)
  - Embed (testing, SOPs, change and adoption)
- **Each card:** the number, a title, a one-line description and a muted tag line.
- **Layout:** 2 columns, with the fifth card spanning both.

### 5.6 Testimonials (`#testimonials`)

- **Heading:** `h2` "What people say", with a sub-line.
- **Cards:** a 2×2 grid of white cards. Each has an avatar (a monogram placeholder), the name, a role
  line (e.g. "Head of Operations, a UK pensions administrator") and the quote.
- **No** fake verification badges or X icons.
- **Only real, consented quotes go to production.** Entries marked `placeholder: true` appear in
  development and preview builds only, like drafts.
- **When production has no visible entries,** the section is not rendered. It isn't in the navigation.

### 5.7 Experience & skills (`#experience`)

This reuses the reference's pricing layout: two cards side by side, one white and one dark.

- **The white card, "Experience":**
  - a timeline from the `experience` collection: DigiBlu (Senior Intelligent Automation Analyst,
    Dec 2021 – present) and Infosys Consulting (Management Consultant 2018–2021, Consulting Analyst
    2016–2018)
  - each role has one line of impact
  - early engagements are described by industry
- **The dark card, "Skills & certifications":** skill groups from `skills` (Analysis; Delivery;
  Automation & data; AI building) as check-mark lists, then certifications (CSM, PSPO I, Power BI Data
  Analyst Associate, AI Fluency).
- Each card has an optional button: "Download CV" on the white card, "Book a call" on the dark card.

### 5.8 Contact (`#contact`)

- **Heading:** `h2` "Let's work together", and a short paragraph (`profile.sections.contact.intro`).
- **Booking, loaded only on request:** a native `<details>` element.
  - Its summary is styled as the primary button "Book a 30-minute call".
  - When it opens, a small script (≈300 bytes, on the `toggle` event) creates an `<iframe>` of
    `profile.bookingUrl` with `?embed=true` appended. The frame has the attributes
    `title="Book a call with Mujtaba Shah on Cal.com"`,
    `referrerpolicy="strict-origin-when-cross-origin"` and
    `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"`.
  - The frame is never in the HTML before that, so **no request goes to Cal.com until the visitor
    opens the panel.** Browsers load hidden frames eagerly, which is why the frame can't simply sit inside
    the closed `<details>`.
  - Without JavaScript, opening the panel shows only the fallback link.
  - Under the frame, a fallback link: "Trouble loading? Open the booking page in a new tab".
- **Email:** the address as a `mailto:` link, with the existing copy button.
- **Also:** "Download CV", and the social links as labelled text links.

### 5.9 Footer and privacy page

- **Footer:** "© <build year> Mujtaba Shah" on the left, "Privacy" (`/privacy`) on the right.
- **`/privacy`**, in plain language. Its text lives in a content file:
  - no cookies and no analytics
  - the email address is published for contact
  - the booking calendar is provided by Cal.com and only loads when opened; bookings are handled under
    Cal.com's privacy policy
  - how to ask for anything to be removed

## 6. Case-study page (`/work/<slug>`)

The reference has no project page, so design one in its language. The page has:
- the top bar
- one shell containing: a label line (kind · sector or status), `h1` title, summary, facts row (role ·
  timeframe · employer for client work), and the cover image (4:3, 12px radius)
- a white inner card for the MDX body, with the existing Figure and Callout components restyled
- a links list
- a "Back to all work" link to `/#work`
- the footer

The existing SEO, JSON-LD and og:image behaviour stays.

## 7. Content model changes

**`profile` (`profile.yaml`) gains:**
- `titleTagline`: the text after the name in the home page title ("Intelligent Automation & AI Product
  Builder", §9)
- `jobTitle` and `worksFor`: for JSON-LD `Person` (§9)
- `roles`: 2 strings
- `availability`: optional string
- `headline`, `subline`
- `about`, `interests`
- `proof`: `{ label, items[] }`
- `stats`: 1–4 × `{ value: string, label }`, where `value` is e.g. "9+", counted up from its leading
  number
- `sections`: a `{ heading, intro }` pair for each of `work`, `method`, `testimonials`, `experience` and
  `contact`. The contact intro replaces the paragraph described in §5.8.
- `avatar`: optional path to a PNG or JPEG in `public/`
- `timeZone`: an IANA name, default `Europe/London`
- `locationLabel`
- `bookingUrl` must now be an `https://cal.com/…` event URL

`profile.intro` is removed; `about` and `subline` replace it.

`socialPlatforms` gains `tiktok`.

**`caseStudies` gains:**
- `kind`: `client` | `product`, required
- `sector`: required when `kind` is `client`
- `status`: `live` | `in-progress` | `retired`, required when `kind` is `product`
- `employer`: optional

The `client` field is removed, because clients are anonymised by rule.

**New collections:**

| Collection | Loader | Fields |
|---|---|---|
| `method` | `file('src/content/method.yaml')` | `order`, `title`, `description`, `tags[]` |
| `experience` | `file('src/content/experience.yaml')` | `employer`, `role`, `start`, `end` (optional), `summary` |
| `skills` | `file('src/content/skills.yaml')` | `groups[{ name, items[] }]`, `certifications[]` |
| `testimonials` | `file('src/content/testimonials.yaml')` | `name`, `role`, `quote` (≤ 320 characters), `placeholder` (default `false`) |
| `pages` | `glob('src/content/pages/*.md')` | `title`, `description`; holds `privacy.md` |

The placeholder "Alex Placeholder" content and the two sample case studies are replaced by the owner's
drafted content and the six case studies (§5.4). Body copy is drafted from the CV and LinkedIn and marked
for the owner's review.

## 8. Motion

| Effect | Where | How | Reduced motion |
|---|---|---|---|
| Rotating role | Hero | CSS keyframes | first role, static |
| Proof strip scroll | Hero | CSS keyframes on a duplicated list | static, wrapped |
| Section rise on entering view (movement only, no fade: half-transparent text fails the axe and Lighthouse contrast checks) | All shells except the hero | CSS `animation-timeline: view()` (no support means no animation) | none |
| Word-by-word fill | About statement | CSS scroll-driven animation on per-word spans | full colour |
| Count-up | Stats | Small script (IntersectionObserver) | final value, no animation |
| Live clock | Top bar | Small script (1s interval, `Intl.DateTimeFormat` with `profile.timeZone`) | ticks (it's information, not motion) |
| Button and card hover | Everywhere | CSS transitions ≤ 200ms | none |

Client JavaScript totals: copy-email, clock, count-up and the booking-panel loader. The whole page stays
within the 5 KB floor.

## 9. SEO

- **Home title:** "Mujtaba Shah — Intelligent Automation & AI Product Builder". The description comes
  from `profile.seo.description`.
- **JSON-LD `Person`:** `jobTitle` "Senior Intelligent Automation Analyst", `worksFor` DigiBlu, and
  `sameAs` from the socials.
- Case-study pages keep `CreativeWork`.

## 10. Privacy rules (enforced by tests)

- **No phone number anywhere.** A unit test fails if `src/content/` or `public/` contain a UK phone
  pattern (`+44…` or `07…` with 9 more digits).
- **No client names.** A unit test compares every word and two-word phrase in `src/content/` against a
  **hashed** denylist of former clients, stored as SHA-256 hashes so the names are never committed in
  plain text. The implementer receives the plaintext list out of band.
- **Testimonials:** entries with `placeholder: true` never reach production (tested like drafts).
- **The public CV** (`public/cv.pdf`) is the owner's web copy with the phone number removed, stripped of
  metadata (foundation README).

## 11. Testing additions

- **Sections:** the home page renders them in §3's order, with their `id`s, and every navigation link
  resolves.
- **Hero:** the `h1` is "Mujtaba Shah"; the screen-reader sentence names both roles; the rotator is
  `aria-hidden`.
- **Reduced motion:** with reduced motion emulated, the rotator, proof strip and statement have no
  running animations (checked through `getAnimations()`), and stats show their final values.
- **No JavaScript:** stats show final values and the clock shows a time.
- **Booking:**
  - on page load, no request goes to any Cal.com host
  - opening "Book a 30-minute call" creates the iframe with the expected `src`
  - Cal.com requests are stubbed in tests (`page.route`), so CI never depends on Cal.com
- **Testimonials:** the section is absent in production when every entry is a placeholder, and present
  in a preview build.
- **Privacy:** the unit tests from §10.
- **Existing tests** now read expected values (email, name, booking URL) from the content files, not
  hard-coded placeholder strings.
- **All foundation floors keep running on every page**, including `/privacy`.

## 12. Amendments to the foundation spec

| Foundation rule | Change | Reason |
|---|---|---|
| Floor 3 "No requests to any third-party origin" | "No third-party request **until the visitor opts in**. The only opt-in is opening the Cal.com booking panel." | The owner chose inline booking (§5.8) |
| §7 CSP `<meta>` directives | Add `frame-src https://cal.com https://app.cal.com` (the implementation confirms the exact embed host and records it) | Needed for the booking frame |
| §5 design tokens | Replaced by §4 | Reference build |
| §6 profile and case-study fields | Replaced by §7 | New sections, anonymised clients |
| §10 dependencies | Add `@fontsource-variable/mona-sans` as a build dependency, loaded through Astro's Fonts API | Font decision |

Record these in the foundation spec's §15 amendment log when the plan is implemented.

## 13. Owner inputs

None of these block the reference build; placeholders stand in until they arrive.

| Input | Used in |
|---|---|
| Headshot (square, at least 400px) | Hero avatar |
| Cal.com event URL | Booking panel |
| X and TikTok profile URLs; the email address to publish | Top bar, contact |
| 2–4 consented testimonials | Testimonials |
| For each case study: the story, shareable numbers, images or diagrams; confirmation of the AMNIKI and Viola AI statuses and links | Selected work, case-study pages |
| Web CV without the phone number | `/cv.pdf` |
| Review of every drafted sentence (headline, about, method, experience) | Everywhere |

## 14. Out of scope (v1)

FAQ; pricing and services; a contact form; the "Now / pipeline" section; writing or blog; a manual
light/dark toggle; a custom domain; launch (Cloudflare). Launch remains the foundation plan's deferred
Task 12, after this build and the owner's content review.
