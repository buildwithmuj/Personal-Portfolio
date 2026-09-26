import { brotliCompressSync } from 'node:zlib';

export interface LoadedResource {
  url: string;
  /** Playwright's resource type: document, stylesheet, script, image, font, … */
  type: string;
  /** Decoded body size. The local server doesn't compress, so this is stricter than production. */
  bytes: number;
}

/** Astro inlines some scripts, so no network response carries them. */
export interface InlineBytes {
  script: number;
}

/**
 * Spec §4, floor 2. CSS is measured as visitors download it, brotli-compressed (§15, 2026-09-26);
 * scripts and fonts by their decoded size.
 */
export const WEIGHT_BUDGET = {
  bytes: { script: 5 * 1024, font: 100 * 1024 },
  compressedStylesheet: 8 * 1024,
  fontFiles: 2,
  totalBytes: 500 * 1024,
} as const;

/** Brotli-compressed size of each text, summed: each stylesheet travels as its own response. */
export function compressedSize(texts: readonly string[]): number {
  return texts.reduce((sum, text) => sum + brotliCompressSync(text).length, 0);
}

/** One message per broken budget. An empty list means the page passes. */
export function checkPageWeight(
  resources: readonly LoadedResource[],
  origin: string,
  inline: InlineBytes = { script: 0 },
  compressedStylesheet = 0,
): string[] {
  const failures: string[] = [];
  const bytesOf = (type: string) =>
    resources.filter((r) => r.type === type).reduce((sum, r) => sum + r.bytes, 0);

  for (const [type, max] of Object.entries(WEIGHT_BUDGET.bytes)) {
    const bytes = bytesOf(type) + (type === 'script' ? inline.script : 0);
    if (bytes > max) failures.push(`${type}: ${bytes} B > ${max} B`);
  }
  if (compressedStylesheet > WEIGHT_BUDGET.compressedStylesheet)
    failures.push(
      `stylesheet (compressed): ${compressedStylesheet} B > ${WEIGHT_BUDGET.compressedStylesheet} B`,
    );
  const fontFiles = resources.filter((r) => r.type === 'font').length;
  if (fontFiles > WEIGHT_BUDGET.fontFiles)
    failures.push(`font files: ${fontFiles} > ${WEIGHT_BUDGET.fontFiles}`);
  const total = resources.reduce((sum, r) => sum + r.bytes, 0);
  if (total > WEIGHT_BUDGET.totalBytes)
    failures.push(`total: ${total} B > ${WEIGHT_BUDGET.totalBytes} B`);
  // Floor 3: nothing may come from another origin.
  for (const r of resources) {
    if (new URL(r.url).origin !== origin) failures.push(`third-party request: ${r.url}`);
  }
  return failures;
}
