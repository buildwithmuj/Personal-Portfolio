export const socialPlatforms = [
  'github',
  'linkedin',
  'x',
  'tiktok',
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
  tiktok: 'TikTok',
  bluesky: 'Bluesky',
  dribbble: 'Dribbble',
  behance: 'Behance',
  instagram: 'Instagram',
  youtube: 'YouTube',
};
