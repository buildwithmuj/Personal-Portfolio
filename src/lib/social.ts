export const socialPlatforms = [
  'github',
  'linkedin',
  'x',
  'bluesky',
  'dribbble',
  'behance',
  'instagram',
  'youtube',
] as const;

export type SocialPlatform = (typeof socialPlatforms)[number];

export const socialLabels: Record<SocialPlatform, string> = {
  github: 'GitHub',
  linkedin: 'LinkedIn',
  x: 'X',
  bluesky: 'Bluesky',
  dribbble: 'Dribbble',
  behance: 'Behance',
  instagram: 'Instagram',
  youtube: 'YouTube',
};
