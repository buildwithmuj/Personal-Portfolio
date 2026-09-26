/** Lines marked `# PLACEHOLDER` in a content file (content spec §13). */
export function placeholderLines(text: string): string[] {
  return text
    .split('\n')
    .filter((line) => /#\s*PLACEHOLDER\b/.test(line))
    .map((line) => line.trim());
}

/** Throws when `text` still has placeholder lines; production deploys call this (content spec §13). */
export function assertNoPlaceholders(file: string, text: string): void {
  const pending = placeholderLines(text);
  if (pending.length > 0) {
    throw new Error(`${file} still has placeholders:\n${pending.join('\n')}`);
  }
}
