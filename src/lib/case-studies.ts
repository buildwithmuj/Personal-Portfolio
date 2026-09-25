export interface Orderable {
  data: { title: string; featured: boolean; order: number; draft: boolean };
}

/** Drafts are hidden unless `includeDrafts`; ordered by `order`, then title (spec §6). */
export function visibleStudies<T extends Orderable>(
  entries: readonly T[],
  includeDrafts: boolean,
): T[] {
  return entries
    .filter((entry) => includeDrafts || !entry.data.draft)
    .toSorted((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title));
}

export function featuredStudies<T extends Orderable>(entries: readonly T[]): T[] {
  return entries.filter((entry) => entry.data.featured);
}
