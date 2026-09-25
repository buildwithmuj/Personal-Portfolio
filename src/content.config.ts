import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { socialPlatforms } from './lib/social.ts';

const httpsUrl = z
  .url()
  .refine((value) => value.startsWith('https://'), { message: 'Must be an https:// URL' });

const profile = defineCollection({
  loader: file('src/content/profile.yaml'),
  schema: z.object({
    name: z.string().min(1),
    headline: z.string().min(1),
    intro: z.string().min(1),
    email: z.email(),
    bookingUrl: httpsUrl,
    socials: z.array(z.object({ platform: z.enum(socialPlatforms), url: httpsUrl })),
    cvUpdated: z.coerce.date(),
    seo: z.object({
      description: z.string().min(1).max(160),
      image: z
        .string()
        .regex(/^\/[\w./-]+\.(?:png|jpg)$/, 'A root-relative path to a PNG or JPEG in public/'),
      imageAlt: z.string().min(1),
    }),
  }),
});

const caseStudies = defineCollection({
  loader: glob({
    pattern: '*/index.mdx',
    base: './src/content/case-studies',
    // The folder name is the slug (spec §6).
    generateId: ({ entry }) => entry.split('/')[0] ?? entry,
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),
      role: z.string().min(1),
      timeframe: z.string().min(1),
      summary: z.string().min(1).max(160),
      cover: image(),
      coverAlt: z.string().min(1),
      tags: z.array(z.string().min(1)).default([]),
      client: z.string().min(1).optional(),
      links: z.array(z.object({ label: z.string().min(1), url: httpsUrl })).default([]),
      featured: z.boolean().default(false),
      order: z.number().int().default(100),
      draft: z.boolean().default(false),
    }),
});

export const collections = { profile, caseStudies };
