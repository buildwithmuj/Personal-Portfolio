import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

// Astro scopes class names but not @keyframes names, so two components that each define, say,
// `close-ring` silently share whichever definition the bundle lists last.
function styleFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return styleFiles(path);
    return /\.(astro|css)$/.test(entry.name) ? [path] : [];
  });
}

describe('CSS animations', () => {
  it('gives every @keyframes a name no other file uses', () => {
    const owners = new Map<string, string[]>();
    for (const file of styleFiles('src')) {
      for (const match of readFileSync(file, 'utf8').matchAll(/@keyframes\s+([\w-]+)/g)) {
        const name = match[1] ?? '';
        owners.set(name, [...(owners.get(name) ?? []), file]);
      }
    }
    const clashes = [...owners].filter(([, files]) => files.length > 1);
    assert.deepEqual(clashes, []);
  });
});
