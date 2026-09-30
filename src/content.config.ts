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

const publicAudio = z
  .string()
  .regex(/^\/[\w./-]+\.(?:mp3|m4a|ogg|wav)$/, 'A root-relative path to an audio file in public/');

const sectionCopy = z.object({ heading: z.string().min(1), intro: z.string().min(1) });

const profile = defineCollection({
  loader: file('src/content/profile.yaml'),
  schema: z.object({
    name: z.string().min(1),
    jobTitle: z.string().min(1),
    worksFor: z.string().min(1),
    titleTagline: z.string().min(1),
    roles: z.array(z.string().min(1)).min(1).max(6),
    headline: z.string().min(1),
    // The headline's closing words, set in the editorial serif (they must end the headline).
    headlineAccent: z.string().min(1).optional(),
    // A short availability line for the hero's pill, e.g. "Open to new roles and projects".
    availability: z.string().min(1).optional(),
    subline: z.string().min(1),
    about: z.string().min(1),
    interests: z.string().min(1),
    // A typical weekday for the About card's board: tasks in stacks (e.g. Morning, Building,
    // Learning), each at a local time (HH:MM); the board ticks them off as the owner's day goes.
    day: z
      .array(
        z.object({
          stack: z.string().min(1),
          time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'A 24-hour time, e.g. "08:30"'),
          task: z.string().min(1),
        }),
      )
      .default([]),
    // "Ask me": questions with the owner's own answers, including how they work (it replaced
    // the How I work section). A draft shows only in preview builds. Interview.astro shows up to 8.
    // An answer with `audio` (the owner reading it aloud, in public/audio/) gets a play button.
    interview: z
      .object({
        draft: z.boolean().default(true),
        questions: z
          .array(
            z.object({
              question: z.string().min(1),
              answer: z.string().min(1),
              audio: publicAudio.optional(),
            }),
          )
          .min(1)
          .max(8),
      })
      .optional(),
    // For the CV (CvViewer.astro).
    languages: z.array(z.object({ language: z.string().min(1), level: z.string().min(1) })),
    outsideWork: z.array(
      z.object({ activity: z.string().min(1), start: z.string().regex(/^\d{4}-\d{2}$/) }),
    ),
    // The hero's logo strip: clients the owner has worked with (cleared to name, 2026-09-28), each
    // with a logo in public/clients/ when there is one (a navy PNG, 84px tall), or shown by name.
    proof: z.object({
      label: z.string().min(1),
      items: z
        .array(
          z.object({
            name: z.string().min(1),
            logo: z
              .string()
              .regex(/^\/[\w./-]+\.png$/, 'A root-relative path to a PNG in public/')
              .optional(),
            // An optical nudge for a logo that reads heavier (below 1) or lighter (above 1) than
            // its neighbours at the same size.
            scale: z.number().min(0.5).max(1.5).optional(),
          }),
        )
        .min(1),
    }),
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
      skills: sectionCopy,
      testimonials: sectionCopy,
      interview: sectionCopy.optional(),
      contact: sectionCopy,
    }),
    email: z.email(),
    bookingUrl: httpsUrl.refine((value) => value.startsWith('https://cal.com/'), {
      message: 'Must be a Cal.com event URL (https://cal.com/…)',
    }),
    // Only shown on the site (never as a share image), so it may be a WebP cut-out with transparency.
    avatar: z
      .string()
      .regex(/^\/[\w./-]+\.(?:png|jpg|webp)$/, 'A root-relative path to an image in public/')
      .optional(),
    voiceIntro: publicAudio.optional(),
    timeZone: z.string().min(1).default('Europe/London'),
    locationLabel: z.string().min(1),
    coordinates: z
      .object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) })
      .optional(),
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

const testimonials = defineCollection({
  loader: file('src/content/testimonials.yaml'),
  schema: z
    .object({
      name: z.string().min(1),
      role: z.string().min(1),
      quote: z.string().min(1).max(320),
      // Where it was given, named at the foot of the card ("LinkedIn", "Posted on X"), or
      // an email (not named).
      source: z.enum(['linkedin', 'x', 'email']).optional(),
      // The recommendation or post itself; with it, the card reads "Verified on LinkedIn" as a link.
      url: httpsUrl.optional(),
      // A phrase from the quote to mark with the sky highlighter, word for word.
      highlight: z.string().min(1).optional(),
      // Required, so no quote can reach the live site without stating whether it is real.
      placeholder: z.boolean(),
    })
    .refine((data) => !data.highlight || data.quote.includes(data.highlight), {
      message: 'The highlight must be a phrase from the quote, word for word',
      path: ['highlight'],
    }),
});

const yearMonth = z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM');

const experience = defineCollection({
  loader: file('src/content/experience.yaml'),
  schema: z.object({
    employer: z.string().min(1),
    role: z.string().min(1),
    start: yearMonth,
    end: yearMonth.optional(),
    summary: z.string().min(1),
    // Key achievements, shown under the summary in the CV.
    highlights: z.array(z.string().min(1)).default([]),
  }),
});

const education = defineCollection({
  loader: file('src/content/education.yaml'),
  schema: z.object({
    qualification: z.string().min(1),
    institution: z.string().min(1),
    start: yearMonth,
    end: yearMonth.optional(),
  }),
});

const skills = defineCollection({
  loader: file('src/content/skills.yaml'),
  schema: z
    .object({
      intro: z.string().min(1),
      skills: z.array(z.string().min(1)).min(1),
      // From the CV: listed in the CV, and among the Toolkit's grouped skills (below).
      cvOnly: z.array(z.string().min(1)).default([]),
      // The Toolkit's Skills tab: every skill and CV-only skill once, under a heading each.
      // The skills' phases, each a slide in the Toolkit's deck (its CSS shows up to four).
      groups: z
        .array(z.object({ group: z.string().min(1), items: z.array(z.string().min(1)).min(1) }))
        .min(1)
        .max(4),
      // The home page's tools: a name and a logo in public/tools/.
      tools: z
        .array(
          z.object({
            name: z.string().min(1),
            logo: z.string().regex(/^\/tools\/[a-z0-9-]+\.svg$/, 'An SVG in public/tools/'),
          }),
        )
        .default([]),
      // The Toolkit's folders: each opens its certificate, a placeholder until `image` is given.
      certifications: z.array(
        z.object({
          title: z.string().min(1),
          issuer: z.string().min(1),
          // The folder's own name, short enough for a small folder; the full title shows opened.
          short: z.string().min(1),
          image: z
            .string()
            .regex(
              /^\/certificates\/[a-z0-9-]+\.(?:webp|png|jpg)$/,
              'An image in public/certificates/',
            )
            .optional(),
        }),
      ),
    })
    .superRefine(({ skills, cvOnly, groups }, context) => {
      const grouped = groups.flatMap(({ items }) => items);
      const all = [...skills, ...cvOnly];
      const missing = all.filter((skill) => !grouped.includes(skill));
      const extra = grouped.filter((skill) => !all.includes(skill));
      const twice = grouped.filter((skill, index) => grouped.indexOf(skill) !== index);
      for (const [problem, list] of [
        ['not in any group', missing],
        ['not a skill or CV-only skill', extra],
        ['in more than one group', twice],
      ] as const) {
        for (const skill of list)
          context.addIssue({
            code: 'custom',
            path: ['groups'],
            message: `"${skill}" is ${problem}`,
          });
      }
    }),
});

const pages = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/pages' }),
  schema: z.object({ title: z.string().min(1), description: z.string().min(1).max(160) }),
});

export const collections = {
  profile,
  caseStudies,
  testimonials,
  experience,
  education,
  skills,
  pages,
};
