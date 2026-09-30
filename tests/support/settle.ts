import type { Locator } from '@playwright/test';

/**
 * Scrolls `target` into view and waits for the page around it to hold still before a test acts on
 * it. Cards and headings rise a few pixels as they come into view (400 ms, global.css); under a full
 * parallel run WebKit draws only six or seven frames a second, so Playwright could aim at an
 * element that then moved before the click or hover landed. Waits until no one-off animation or
 * transition on the page's clock is running (loops, and scroll-linked effects, never finish, so
 * they don't count), then checks the target is still on screen, scrolling to it again if not.
 */
export async function scrollIntoViewSettled(target: Locator): Promise<void> {
  const page = target.page();
  for (let attempt = 0; attempt < 3; attempt++) {
    await target.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () =>
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
