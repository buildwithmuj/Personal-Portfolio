/** Placeholder quotes appear outside production only (content spec §5.6). */
export function visibleTestimonials<T extends { data: { placeholder: boolean } }>(
  entries: readonly T[],
  includePlaceholders: boolean,
): T[] {
  return entries.filter((entry) => includePlaceholders || !entry.data.placeholder);
}

/**
 * A quote split around its highlighted phrase (the words the marker strokes): before, the phrase,
 * after. With no phrase, or one not in the quote, nothing is marked.
 */
export function splitQuote(quote: string, highlight?: string): [string, string, string] {
  const at = highlight ? quote.indexOf(highlight) : -1;
  if (!highlight || at < 0) return [quote, '', ''];
  return [quote.slice(0, at), highlight, quote.slice(at + highlight.length)];
}
