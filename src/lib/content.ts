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

/** The "How I work" steps, in order (content spec §5.5). */
export async function getMethod(): Promise<CollectionEntry<'method'>['data'][]> {
  return (await getCollection('method'))
    .map((entry) => entry.data)
    .toSorted((a, b) => a.order - b.order);
}

/** Testimonials; placeholders only outside production (content spec §5.6). */
export async function getTestimonials(): Promise<CollectionEntry<'testimonials'>['data'][]> {
  return visibleTestimonials(await getCollection('testimonials'), !isProduction).map(
    (entry) => entry.data,
  );
}
