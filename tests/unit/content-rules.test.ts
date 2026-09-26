import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = 'src/content/case-studies';
const slugs = readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

describe('case-study content rules (spec §6)', () => {
  it('has at least one case study', () => {
    assert.ok(slugs.length > 0);
  });

  for (const slug of slugs) {
    it(`${slug}: the folder name is lowercase words joined by hyphens`, () => {
      assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    });

    it(`${slug}: the MDX has no import or export statements`, () => {
      const source = readFileSync(join(root, slug, 'index.mdx'), 'utf8');
      assert.doesNotMatch(source, /^\s*(?:import|export)\s/m);
    });
  }
});
