import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { visibleStudies } from './case-studies.ts';
import { isProduction } from './mode.ts';
import { visibleTestimonials } from './testimonials.ts';

export async function getProfile(): Promise<CollectionEntry<'profile'>['data']> {
  const entry = await getEntry('profile', 'main');
  if (!entry) throw new Error('src/content/profile.yaml must define a `main` entry');
  return entry.data;
}

/** Case studies in display order; drafts only outside production (spec §6, §8). */
export async function getCaseStudies(): Promise<CollectionEntry<'caseStudies'>[]> {
  return visibleStudies(await getCollection('caseStudies'), !isProduction);
}

/** Testimonials; placeholders only outside production (content spec §5.6). */
export async function getTestimonials(): Promise<CollectionEntry<'testimonials'>['data'][]> {
  return visibleTestimonials(await getCollection('testimonials'), !isProduction).map(
    (entry) => entry.data,
  );
}

/** Roles, newest first. */
export async function getExperience(): Promise<CollectionEntry<'experience'>['data'][]> {
  return (await getCollection('experience'))
    .map((entry) => entry.data)
    .toSorted((a, b) => b.start.localeCompare(a.start));
}

/** Qualifications, newest first. */
export async function getEducation(): Promise<CollectionEntry<'education'>['data'][]> {
  return (await getCollection('education'))
    .map((entry) => entry.data)
    .toSorted((a, b) => b.start.localeCompare(a.start));
}

export async function getSkills(): Promise<CollectionEntry<'skills'>['data']> {
  const entry = await getEntry('skills', 'main');
  if (!entry) throw new Error('src/content/skills.yaml must define a `main` entry');
  return entry.data;
}

export async function getPage(id: string): Promise<CollectionEntry<'pages'>> {
  const entry = await getEntry('pages', id);
  if (!entry) throw new Error(`src/content/pages/${id}.md is missing`);
  return entry;
}

/** Ask me's questions, or null: draft answers show only in preview builds, never live. */
export function visibleInterview(
  profile: CollectionEntry<'profile'>['data'],
): NonNullable<CollectionEntry<'profile'>['data']['interview']> | null {
  const { interview } = profile;
  return interview && (!interview.draft || !isProduction) ? interview : null;
}
