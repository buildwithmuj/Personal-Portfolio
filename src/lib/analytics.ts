/**
 * Visitor counts, by GoatCounter: one request per page view, with no cookie and nothing kept in the
 * visitor's browser (privacy notice; foundation spec §15). Off until COUNT_URL is set in
 * site.config.ts. The site sends the request itself, so no script of GoatCounter's runs here.
 */
export interface PageView {
  /** Where the page is being read: only the live site's own host is counted. */
  hostname: string;
  path: string;
  title: string;
  /** The page that linked here, or empty. */
  referrer: string;
  screen: readonly [width: number, height: number, scale: number];
  /** A browser under automation (`navigator.webdriver`), which GoatCounter sets aside as a bot. */
  automated: boolean;
}

/** GoatCounter's code for a browser driven by WebDriver. */
const AUTOMATED = '153';

/** The request that counts one page view, or nothing when the page isn't on the live site. */
export function countUrl(endpoint: string, site: string, view: PageView): string | undefined {
  if (view.hostname !== new URL(site).hostname) return undefined;
  const url = new URL(endpoint);
  url.searchParams.set('p', view.path);
  url.searchParams.set('t', view.title);
  if (view.referrer) url.searchParams.set('r', view.referrer);
  url.searchParams.set('s', view.screen.join());
  if (view.automated) url.searchParams.set('b', AUTOMATED);
  return url.href;
}
