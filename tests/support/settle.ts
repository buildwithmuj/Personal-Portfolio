import type { Locator } from '@playwright/test';

/**
 * Scrolls `target` into view and waits for the page around it to hold still before a test acts on
 * it. Collapsible sections slide open as they come into view (800 ms, Shell.astro) and cards rise
 * in (900 ms, global.css), moving whatever sits below them; WebKit has no scroll anchoring to hide
 * that, and under a full parallel run it draws only six or seven frames a second, so Playwright
 * could aim at an element that then moved before the click or hover landed. Waits until no section
 * is part-way open and no one-off animation or transition on the page's clock is running (loops,
 * and scroll-linked effects, never finish, so they don't count), then checks the target is still
 * on screen, scrolling to it again if the settling pushed it off.
 */
export async function scrollIntoViewSettled(target: Locator): Promise<void> {
  const page = target.page();
  for (let attempt = 0; attempt < 3; attempt++) {
    await target.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () =>
        !document.querySelector('.stack > .is-open:not(.is-settled)') &&
        document
          .getAnimations()
          .every(
            (animation) =>
              animation.playState !== 'running' ||
              animation.timeline !== document.timeline ||
              animation.effect?.getTiming().iterations === Infinity,
          ),
      undefined,
      { polling: 'raf' },
    );
    const onScreen = await target.evaluate((element) => {
      const { top, bottom } = element.getBoundingClientRect();
      return bottom > 0 && top < window.innerHeight;
    });
    if (onScreen) return;
  }
}
