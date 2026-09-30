/**
 * Makes the CV download (public/cv.pdf) from the site's own CV: the sheet in the View CV pop-up
 * (src/components/CvViewer.astro), printed to A4 by headless Chromium from the built site. The two
 * can't drift apart unnoticed: the text the PDF was made from is fingerprinted beside this script,
 * and a browser test compares the live pop-up with it (tests/e2e/cv-view.spec.ts).
 *
 * Run `pnpm build`, then `pnpm cv:pdf`.
 */
import { chromium, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const CV_FINGERPRINT = 'scripts/cv-pdf.sha256';

/** A fingerprint of the CV's words, however the markup spaces them. */
export async function cvFingerprint(page: Page): Promise<string> {
  const text = await page.locator('.cv-view .sheet').evaluate((sheet) => sheet.textContent);
  return createHash('sha256').update(text.replace(/\s+/g, ' ').trim()).digest('hex');
}

/** The live site's address, from the workflow that publishes it. */
function liveSite(): string {
  const pages = readFileSync('.github/workflows/pages.yml', 'utf8');
  const [, site] = /PAGES_SITE: (\S+)/.exec(pages) ?? [];
  const [, base] = /PAGES_BASE: (\S+)/.exec(pages) ?? [];
  if (!site || !base) throw new Error('pages.yml no longer names PAGES_SITE and PAGES_BASE.');
  return `${site}${base}`;
}

// On paper the sheet loses the pop-up's scrolling and padding (the page margins do that job), and
// keeps its two columns across the pages. They're floats here, not the pop-up's grids: Chromium
// misplaces a grid's rows when it runs on to a second page. Nothing splits mid-paragraph or
// mid-bullet, no heading is left behind at the foot of a page, and each side section stays whole.
// Some software reads a CV in the order it was drawn, so the drawing order follows the reading
// order: the columns and the foot are positioned, to be drawn after the letterhead, and the bullets
// aren't, to be drawn with their own role. (#page-top outranks the component's scoped rules.)
const PRINT_CSS = `
  html, #page-top { margin: 0; padding: 0; background: #fff; }
  #page-top .sheet { overflow: visible; padding: 0; }
  #page-top .body { display: flow-root; }
  #page-top .col { display: block; position: relative; float: left; width: 62.5%; }
  #page-top .col:last-child { float: right; width: 33%; }
  #page-top .col > section + section { margin-block-start: var(--space-8); }
  #page-top h3 { letter-spacing: 0.07em; }
  #page-top .foot { position: relative; }
  #page-top .points { display: block; }
  #page-top .points li { position: static; }
  #page-top .points li + li { margin-block-start: 6px; }
  #page-top .points li::before { position: static; float: left; margin: 0.6em 0 0 -16px; }
  #page-top :is(p, li, .top, .foot, .col:last-child section) { break-inside: avoid; }
  #page-top :is(h3, h4, .top, .org, .muted) { break-after: avoid; }
`;

async function main(): Promise<void> {
  if (!existsSync('dist/index.html')) throw new Error('No dist. Run `pnpm build` first.');
  const browser = await chromium.launch();
  try {
    // The print styles go in as a style element, which the site's own CSP would refuse.
    const context = await browser.newContext({ bypassCSP: true });
    const page = await context.newPage();
    // Every request is answered from dist, so nothing leaves this machine and no server is needed.
    await page.route('**/*', (route) => {
      const { pathname } = new URL(route.request().url());
      const file = join('dist', pathname === '/' ? 'index.html' : decodeURIComponent(pathname));
      return existsSync(file) ? route.fulfill({ path: file }) : route.abort();
    });
    await page.goto('http://cv.localhost/');
    const fingerprint = await cvFingerprint(page);

    const site = liveSite();
    await page.evaluate((address) => {
      const sheet = document.querySelector('.cv-view .sheet');
      const contact = sheet?.querySelector('.contact');
      const last = contact?.lastElementChild;
      if (!sheet || !contact || !last) throw new Error('The CV sheet has changed shape.');
      // A downloaded CV travels without the site around it, so it carries the site's address.
      const item = last.cloneNode(true) as HTMLLIElement;
      const link = item.querySelector('a');
      if (!link) throw new Error('The CV has no contact link to copy.');
      link.href = address;
      link.textContent = address.replace(/^https:\/\//, '');
      contact.append(item);
      document.title = `${sheet.querySelector('h2')?.firstChild?.textContent?.trim()}, Curriculum Vitae`;
      document.body.replaceChildren(sheet);
    }, site);
    await page.addStyleTag({ content: PRINT_CSS });
    await page.emulateMedia({ media: 'screen' });
    await page.evaluate(() => document.fonts.ready);

    await page.pdf({
      path: 'public/cv.pdf',
      format: 'A4',
      scale: 0.9,
      margin: { top: '13mm', right: '13mm', bottom: '13mm', left: '13mm' },
      printBackground: true,
      tagged: true,
      outline: true,
    });
    writeFileSync(CV_FINGERPRINT, `${fingerprint}\n`);
    console.log(`public/cv.pdf written (${site}).`);
  } finally {
    await browser.close();
  }
}

if (import.meta.main) await main();
