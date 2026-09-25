/** Pathnames of every <loc> in a sitemap, in document order. */
export function sitemapPaths(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].flatMap((match) =>
    match[1] ? [new URL(match[1]).pathname] : [],
  );
}
