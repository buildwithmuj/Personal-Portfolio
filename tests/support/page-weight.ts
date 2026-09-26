import { brotliCompressSync } from 'node:zlib';

export interface LoadedResource {
  url: string;
  /** Playwright's resource type: document, stylesheet, script, image, font, … */
  type: string;
  /** Decoded body size. The local server doesn't compress, so this is stricter than production. */
  bytes: number;
}

/** A page's CSS and JavaScript as visitors download them: brotli-compressed, file by file. */
export interface CompressedBytes {
  script: number;
  stylesheet: number;
}

/**
 * Spec §4, floor 2. CSS and JavaScript are measured as visitors download them, brotli-compressed
 * (§15, 2026-09-26); fonts by their decoded size.
 */
export const WEIGHT_BUDGET = {
  compressed: { script: 6 * 1024, stylesheet: 8 * 1024 },
  fontBytes: 100 * 1024,
  fontFiles: 2,
  totalBytes: 500 * 1024,
} as const;

/** Brotli-compressed size of each text, summed: each file travels as its own response. */
export function compressedSize(texts: readonly string[]): number {
  return texts.reduce((sum, text) => sum + brotliCompressSync(text).length, 0);
}

/** One message per broken budget. An empty list means the page passes. */
export function checkPageWeight(
  resources: readonly LoadedResource[],
  origin: string,
  compressed: CompressedBytes = { script: 0, stylesheet: 0 },
): string[] {
  const failures: string[] = [];
  for (const type of ['script', 'stylesheet'] as const) {
    const max = WEIGHT_BUDGET.compressed[type];
    if (compressed[type] > max)
      failures.push(`${type} (compressed): ${compressed[type]} B > ${max} B`);
  }
  const fonts = resources.filter((r) => r.type === 'font');
  const fontBytes = fonts.reduce((sum, r) => sum + r.bytes, 0);
  if (fontBytes > WEIGHT_BUDGET.fontBytes)
    failures.push(`font: ${fontBytes} B > ${WEIGHT_BUDGET.fontBytes} B`);
  if (fonts.length > WEIGHT_BUDGET.fontFiles)
    failures.push(`font files: ${fonts.length} > ${WEIGHT_BUDGET.fontFiles}`);
  const total = resources.reduce((sum, r) => sum + r.bytes, 0);
  if (total > WEIGHT_BUDGET.totalBytes)
    failures.push(`total: ${total} B > ${WEIGHT_BUDGET.totalBytes} B`);
  // Floor 3: nothing may come from another origin.
  for (const r of resources) {
    if (new URL(r.url).origin !== origin) failures.push(`third-party request: ${r.url}`);
  }
  return failures;
}
