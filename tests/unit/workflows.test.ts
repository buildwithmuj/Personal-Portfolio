import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const dir = '.github/workflows';
const workflows = readdirSync(dir)
  .filter((name) => name.endsWith('.yml'))
  .map((name) => ({ name, text: readFileSync(join(dir, name), 'utf8') }));

describe('GitHub Actions hardening (spec §7)', () => {
  it('has the ci and weekly workflows', () => {
    assert.deepEqual(workflows.map((w) => w.name).sort(), ['ci.yml', 'weekly.yml']);
  });

  for (const { name, text } of workflows) {
    it(`${name} pins every action to a full commit SHA`, () => {
      const refs = [...text.matchAll(/^\s*(?:-\s*)?uses:\s*(\S+)/gm)].map(
        (match) => match[1] ?? '',
      );
      assert.ok(refs.length > 0);
      for (const ref of refs) assert.match(ref, /^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/, ref);
    });

    it(`${name} grants only read access to repository contents`, () => {
      assert.match(text, /^permissions:\n {2}contents: read\n/m);
      assert.doesNotMatch(text, /: write/);
    });

    it(`${name} never uses pull_request_target`, () => {
      assert.doesNotMatch(text, /pull_request_target/);
    });

    it(`${name} checks out without persisting credentials`, () => {
      assert.match(text, /persist-credentials: false/);
    });
  }
});

describe('Branch model (spec §8): work on dev, release on main', () => {
  it('ci.yml runs on pull requests and on pushes to main and dev', () => {
    const ci = workflows.find((w) => w.name === 'ci.yml')?.text ?? '';
    assert.match(ci, /^ {2}pull_request:$/m);
    assert.match(ci, /^ {2}push:\n {4}branches: \[main, dev\]$/m);
  });

  it('every Dependabot update targets dev', () => {
    const dependabot = readFileSync('.github/dependabot.yml', 'utf8');
    const ecosystems = dependabot.match(/package-ecosystem:/g)?.length ?? 0;
    const targets = dependabot.match(/^ {4}target-branch: dev$/gm)?.length ?? 0;
    assert.ok(ecosystems > 0);
    assert.equal(targets, ecosystems);
  });
});
