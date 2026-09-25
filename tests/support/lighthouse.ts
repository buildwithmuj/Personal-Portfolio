import { existsSync } from 'node:fs';
import { chromium } from '@playwright/test';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import type { LighthouseReport } from './lighthouse-scores.ts';

/**
 * On this Windows dev machine, Playwright's full Chrome build (`chromium.executablePath()`)
 * cannot be launched as a standalone process: Windows refuses to build its activation context
 * ("Dependent Assembly 153.0.8010.12 ... could not be found" in the Application event log) for
 * chrome.exe's self-referencing side-by-side manifest, even right after a clean
 * `playwright install chromium --force`. Playwright's own Chromium launches fine (used by
 * tests/e2e), because it launches Playwright's separate chrome-headless-shell build for headless
 * runs, not chrome.exe. That headless-shell build — the same Chrome for Testing release,
 * installed by the same `playwright install` — also launches fine standalone, so on win32 we
 * point chrome-launcher at it instead. Everywhere else (CI is Linux) we use the path the brief
 * specifies.
 */
function resolveChromePath(): string {
  const chromePath = chromium.executablePath();
  if (process.platform !== 'win32') return chromePath;
  const headlessShellPath = chromePath.replace(
    /\\chromium-(\d+)\\chrome-win64\\chrome\.exe$/,
    '\\chromium_headless_shell-$1\\chrome-headless-shell-win64\\chrome-headless-shell.exe',
  );
  return existsSync(headlessShellPath) ? headlessShellPath : chromePath;
}

/** Runs Lighthouse's default mobile audit in Playwright's Chromium. */
export async function runLighthouse(url: string): Promise<LighthouseReport> {
  const chrome = await chromeLauncher.launch({
    chromePath: resolveChromePath(),
    // Ubuntu 24.04 CI runners block Chrome's sandbox; the site under test is our own build.
    chromeFlags: ['--headless=new', ...(process.env['CI'] ? ['--no-sandbox'] : [])],
  });
  try {
    const result = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    });
    if (!result) throw new Error(`Lighthouse returned no result for ${url}`);
    return result.lhr as unknown as LighthouseReport;
  } finally {
    try {
      // chrome-launcher@1.2.1 types kill() as synchronous (`() => void`), unlike the brief's
      // `await chrome.kill()` — awaiting a non-promise is harmless but flagged by `astro check`
      // (ts(80007)), so it's called plainly here.
      chrome.kill();
    } catch (err) {
      // chrome-launcher's kill() taskkills the process, then deletes its temp user-data-dir.
      // On Windows the OS can hold the directory's files locked for a moment after the process
      // exits, so the delete can throw EPERM even though Chrome is already dead and the audit
      // above already completed. https://github.com/GoogleChrome/chrome-launcher/issues/266
      // This race is Windows-only (taskkill + a separate rmSync, not a POSIX SIGKILL), so on
      // every other platform any error here — including an EPERM — still fails the test.
      const isWindowsCleanupRace =
        process.platform === 'win32' && (err as NodeJS.ErrnoException).code === 'EPERM';
      if (!isWindowsCleanupRace) throw err;
    }
  }
}
