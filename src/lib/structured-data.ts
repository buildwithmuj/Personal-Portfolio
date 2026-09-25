/** Serialises JSON-LD for a `<script type="application/ld+json">` block. */
export function jsonLd(data: Record<string, unknown>): string {
  // Escaping `<` means no value can close the surrounding script tag.
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function personJsonLd(input: {
  name: string;
  headline: string;
  url: string;
  email: string;
  sameAs: string[];
}): string {
  return jsonLd({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: input.name,
    jobTitle: input.headline,
    url: input.url,
    email: `mailto:${input.email}`,
    sameAs: input.sameAs,
  });
}

export function creativeWorkJsonLd(input: {
  title: string;
  description: string;
  url: string;
  image: string;
  authorName: string;
  authorUrl: string;
  keywords: string[];
}): string {
  return jsonLd({
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: input.title,
    description: input.description,
    url: input.url,
    image: input.image,
    keywords: input.keywords.join(', '),
    author: { '@type': 'Person', name: input.authorName, url: input.authorUrl },
  });
}
