import { WORKERS_CI_BRANCH } from 'astro:env/server';
import { resolveSiteMode } from './site-mode.ts';

export const siteMode = resolveSiteMode({ dev: import.meta.env.DEV, branch: WORKERS_CI_BRANCH });
export const isProduction = siteMode === 'production';
