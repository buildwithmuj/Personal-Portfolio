import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { caseStudyStatuses } from './lib/case-studies.ts';
import { socialPlatforms } from './lib/social.ts';

const httpsUrl = z
  .url()
  .refine((value) => value.startsWith('https://'), { message: 'Must be an https:// URL' });

const publicImage = z
  .string()
  .regex(/^\/[\w./-]+\.(?:png|jpg)$/, 'A root-relative path to a PNG or JPEG in public/');

const sectionCopy = z.object({ heading: z.string().min(1), intro: z.string().min(1) });

const profile = defineCollection({
  loader: file('src/content/profile.yaml'),
  schema: z.object({
    name: z.string().min(1),
    jobTitle: z.string().min(1),
    worksFor: z.string().min(1),
    titleTagline: z.string().min(1),
    roles: z.array(z.string().min(1)).length(2),
    availability: z.string().min(1).optional(),
    headline: z.string().min(1),
    subline: z.string().min(1),
    about: z.string().min(1),
    interests: z.string().min(1),
    proof: z.object({ label: z.string().min(1), items: z.array(z.string().min(1)).min(1) }),
    stats: z
      .array(
        z.object({
          value: z.string().regex(/^\d+/, 'Start with a number, e.g. "9+"'),
          label: z.string().min(1),
        }),
      )
      .min(1)
      .max(4),
    sections: z.object({
      work: sectionCopy,
      method: sectionCopy,
      testimonials: sectionCopy,
      experience: sectionCopy,
      contact: sectionCopy,
    }),
    email: z.email(),
    bookingUrl: httpsUrl.refine((value) => value.startsWith('https://cal.com/'), {
      message: 'Must be a Cal.com event URL (https://cal.com/…)',
    }),
    avatar: publicImage.optional(),
    voiceIntro: z
      .string()
      .regex(
        /^\/[\w./-]+\.(?:mp3|m4a|ogg|wav)$/,
        'A root-relative path to an audio file in public/',
      )
      .optional(),
    timeZone: z.string().min(1).default('Europe/London'),
    locationLabel: z.string().min(1),
    socials: z.array(z.object({ platform: z.enum(socialPlatforms), url: httpsUrl })),
    cvUpdated: z.coerce.date(),
    seo: z.object({
      description: z.string().min(1).max(160),
      image: publicImage,
      imageAlt: z.string().min(1),
    }),
  }),
});

const caseStudies = defineCollection({
  loader: glob({
    pattern: '*/index.mdx',
    base: './src/content/case-studies',
    // The folder name is the slug (foundation spec §6).
    generateId: ({ entry }) => entry.split('/')[0] ?? entry,
  }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().min(1),
        role: z.string().min(1),
        timeframe: z.string().min(1),
        summary: z.string().min(1).max(160),
        cover: image(),
        coverAlt: z.string().min(1),
        kind: z.enum(['client', 'product']),
        sector: z.string().min(1).optional(),
        status: z.enum(caseStudyStatuses).optional(),
        employer: z.string().min(1).optional(),
        tags: z.array(z.string().min(1)).default([]),
        links: z.array(z.object({ label: z.string().min(1), url: httpsUrl })).default([]),
        featured: z.boolean().default(false),
        order: z.number().int().default(100),
        draft: z.boolean().default(false),
      })
      .superRefine((data, ctx) => {
        if (data.kind === 'client' && !data.sector) {
          ctx.addIssue({ code: 'custom', path: ['sector'], message: 'Client work needs a sector' });
        }
        if (data.kind === 'product' && !data.status) {
          ctx.addIssue({ code: 'custom', path: ['status'], message: 'Own products need a status' });
        }
      }),
});

const method = defineCollection({
  loader: file('src/content/method.yaml'),
  schema: z.object({
    track: z.enum(['process', 'product']),
    order: z.number().int(),
    title: z.string().min(1),
    description: z.string().min(1),
    tags: z.array(z.string().min(1)).min(1),
  }),
});

export const collections = { profile, caseStudies, method };
