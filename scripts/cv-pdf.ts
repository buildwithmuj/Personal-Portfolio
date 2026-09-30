/**
 * Makes the CV download (public/cv.pdf) from the site's own CV: the sheet in the View CV pop-up
 * (src/components/CvViewer.astro), printed to A4 by headless Chromium from the built site. The two
 * can't drift apart unnoticed. Beside this script sit two fingerprints (cv-pdf.sha256): one of
 * everything the PDF is made from (the pop-up's words, the print styles below and the site's
 * address), which a browser test compares with the live pop-up (tests/e2e/cv-view.spec.ts), and one
 * of the PDF file itself, which a unit test compares with the file (tests/unit/cv-pdf.test.ts).
 *
 * Run `pnpm build`, then `pnpm cv:pdf`.
 */
import { chromium, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const CV_PDF = 'public/cv.pdf';
export const CV_FINGERPRINT = 'scripts/cv-pdf.sha256';

const sha256 = (input: string | Buffer) => createHash('sha256').update(input).digest('hex');

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
// aren't, to be drawn with their own role. The rules hang off an id this script gives the body
// itself (it outranks the component's scoped rules), not one of the page's own, which can change:
// when the page's id was renamed, these rules silently stopped matching.
const PRINT_ID = 'cv-print';
const PRINT_CSS = `
  html, #${PRINT_ID} { margin: 0; padding: 0; background: #fff; }
  #${PRINT_ID} .sheet { overflow: visible; padding: 0; }
  #${PRINT_ID} .body { display: flow-root; }
  #${PRINT_ID} .col { display: block; position: relative; float: left; width: 62.5%; }
  #${PRINT_ID} .col:last-child { float: right; width: 33%; }
  #${PRINT_ID} .col > section + section { margin-block-start: var(--space-8); }
  #${PRINT_ID} h3 { letter-spacing: 0.07em; }
  #${PRINT_ID} .foot { position: relative; }
  #${PRINT_ID} .points { display: block; }
  #${PRINT_ID} .points li { position: static; }
  #${PRINT_ID} .points li + li { margin-block-start: 6px; }
  #${PRINT_ID} .points li::before { position: static; float: left; margin: 0.6em 0 0 -16px; }
  #${PRINT_ID} :is(p, li, .top, .foot, .col:last-child section) { break-inside: avoid; }
  #${PRINT_ID} :is(h3, h4, .top, .org) { break-after: avoid; }
`;

/**
 * A fingerprint of everything the PDF is made from: the CV's words (however the markup spaces
 * them), the print styles and the site's address. A change to any of them means printing it again.
 */
export async function cvFingerprint(page: Page): Promise<string> {
  const text = await page.locator('.cv-view .sheet').evaluate((sheet) => sheet.textContent);
  return sha256([text.replace(/\s+/g, ''), PRINT_CSS, liveSite()].join('\n'));
}

/** The two fingerprints on file: the PDF's sources, and the PDF itself. */
export function savedFingerprints(): { sources: string; file: string } {
  const [sources = '', file = ''] = readFileSync(CV_FINGERPRINT, 'utf8').split('\n');
  return { sources, file };
}

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
    await page.evaluate(
      ({ address, id }) => {
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
        document.body.id = id;
        document.body.replaceChildren(sheet);
      },
      { address: site, id: PRINT_ID },
    );
    await page.addStyleTag({ content: PRINT_CSS });
    await page.emulateMedia({ media: 'screen' });
    await page.evaluate(() => document.fonts.ready);
    // The print styles must have taken: printed without them, the PDF keeps the pop-up's layout,
    // with its side sections split across pages and its bullets drawn apart from their roles.
    const styled = await page.evaluate(() => {
      const style = (query: string) =>
        getComputedStyle(document.querySelector(query) ?? document.body);
      return style('.sheet').paddingLeft === '0px' && style('.col').float === 'left';
    });
    if (!styled) throw new Error('The print styles did not apply to the CV sheet.');

    await page.pdf({
      path: CV_PDF,
      format: 'A4',
      scale: 0.9,
      margin: { top: '13mm', right: '13mm', bottom: '13mm', left: '13mm' },
      printBackground: true,
      tagged: true,
      outline: true,
    });
    writeFileSync(CV_FINGERPRINT, `${fingerprint}\n${sha256(readFileSync(CV_PDF))}\n`);
    console.log(`${CV_PDF} written (${site}).`);
  } finally {
    await browser.close();
  }
}

if (import.meta.main) await main();
