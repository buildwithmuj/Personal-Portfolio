export interface SeoInput {
  siteUrl: string;
  siteName: string;
  headline: string;
  path: string;
  /** Page title; omit on the home page. */
  title?: string;
  description: string;
  /** Absolute or root-relative image URL. */
  image: { url: string; alt: string };
  noindex: boolean;
  type: 'website' | 'article';
}

export interface MetaTag {
  name?: string;
  property?: string;
  content: string;
}

export interface SeoTags {
  title: string;
  canonical: string;
  meta: MetaTag[];
}

/**
 * Absolute URL with no trailing slash (except the root), query or fragment (spec §5).
 *
 * `build.format: 'file'` means `Astro.url.pathname` is the built file path (`/index.html`,
 * `/404.html`, `/work/sample-project.html`) rather than the route path, so a trailing `.html` is
 * stripped first, then a trailing `/index` (leaving `/` for the root), before the existing
 * trailing-slash rule runs.
 */
export function canonicalUrl(siteUrl: string, path: string): string {
  const url = new URL(path, siteUrl);
  url.search = '';
  url.hash = '';
  if (url.pathname.endsWith('.html')) url.pathname = url.pathname.slice(0, -'.html'.length);
  if (url.pathname.endsWith('/index'))
    url.pathname = url.pathname.slice(0, -'/index'.length) || '/';
  if (url.pathname !== '/' && url.pathname.endsWith('/')) url.pathname = url.pathname.slice(0, -1);
  return url.href;
}

export function buildSeo(input: SeoInput): SeoTags {
  const title = input.title
    ? `${input.title} — ${input.siteName}`
    : `${input.siteName} — ${input.headline}`;
  const canonical = canonicalUrl(input.siteUrl, input.path);
  const image = new URL(input.image.url, input.siteUrl).href;
  const meta: MetaTag[] = [
    { name: 'description', content: input.description },
    ...(input.noindex ? [{ name: 'robots', content: 'noindex, nofollow' }] : []),
    { property: 'og:type', content: input.type },
    { property: 'og:site_name', content: input.siteName },
    { property: 'og:title', content: title },
    { property: 'og:description', content: input.description },
    { property: 'og:url', content: canonical },
    { property: 'og:image', content: image },
    { property: 'og:image:alt', content: input.image.alt },
    { name: 'twitter:card', content: 'summary_large_image' },
  ];
  return { title, canonical, meta };
}
