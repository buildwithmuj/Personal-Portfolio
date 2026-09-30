/**
 * A visitor who paused animations (the footer's toggle) keeps them paused on every page. Base.astro
 * writes this into the head as a classic inline script, not a deferred module, so it runs as the
 * head is read: before any component script checks the state, and before anything moves. Storage
 * can be blocked; animations then run as normal.
 *
 * Astro hashes only the scripts it bundles for the Content Security Policy, so astro.config.ts
 * hashes this one from the same text.
 */
export const MOTION_SCRIPT =
  "try{localStorage.getItem('motion')==='paused'&&document.documentElement.classList.add('motion-paused')}catch{}";
