/** Placeholder quotes appear outside production only (content spec §5.6). */
export function visibleTestimonials<T extends { data: { placeholder: boolean } }>(
  entries: readonly T[],
  includePlaceholders: boolean,
): T[] {
  return entries.filter((entry) => includePlaceholders || !entry.data.placeholder);
}
