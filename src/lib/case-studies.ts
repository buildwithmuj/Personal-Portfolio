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

// A concept is an idea the owner may build next: nothing exists yet, and its page says so.
export const caseStudyStatuses = ['live', 'in-progress', 'retired', 'concept'] as const;
export type CaseStudyStatus = (typeof caseStudyStatuses)[number];

const statusLabels: Record<CaseStudyStatus, string> = {
  live: 'Live',
  'in-progress': 'In progress',
  retired: 'Retired',
  concept: 'Concept',
};

interface Labelled {
  kind: 'client' | 'product';
  sector?: string | undefined;
  status?: CaseStudyStatus | undefined;
}

/** A client project's sector or a personal project's status, e.g. "Healthcare" or "Live". */
export function caseStudyDetail(data: Labelled): string {
  return (data.kind === 'client' ? data.sector : data.status && statusLabels[data.status]) ?? '';
}

/** "Client work · <sector>" or "Personal project · <status>" (content spec §5.4). */
export function caseStudyLabel(data: Labelled): string {
  const kind = data.kind === 'client' ? 'Client work' : 'Personal project';
  const detail = caseStudyDetail(data);
  return detail ? `${kind} · ${detail}` : kind;
}
