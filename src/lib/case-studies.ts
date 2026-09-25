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

export const caseStudyStatuses = ['live', 'in-progress', 'retired'] as const;
export type CaseStudyStatus = (typeof caseStudyStatuses)[number];

const statusLabels: Record<CaseStudyStatus, string> = {
  live: 'Live',
  'in-progress': 'In progress',
  retired: 'Retired',
};

/** "Client work · <sector>" or "Personal project · <status>" (content spec §5.4). */
export function caseStudyLabel(data: {
  kind: 'client' | 'product';
  sector?: string | undefined;
  status?: CaseStudyStatus | undefined;
}): string {
  const kind = data.kind === 'client' ? 'Client work' : 'Personal project';
  const detail = data.kind === 'client' ? data.sector : data.status && statusLabels[data.status];
  return detail ? `${kind} · ${detail}` : kind;
}
