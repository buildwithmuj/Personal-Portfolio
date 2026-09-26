import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const dir = '.github/workflows';
const workflows = readdirSync(dir)
  .filter((name) => name.endsWith('.yml'))
  .map((name) => ({ name, text: readFileSync(join(dir, name), 'utf8') }));

describe('GitHub Actions hardening (spec §7)', () => {
  it('has the ci, pages and weekly workflows', () => {
    assert.deepEqual(workflows.map((w) => w.name).sort(), ['ci.yml', 'pages.yml', 'weekly.yml']);
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
      // pages.yml's deploy job alone may publish to GitHub Pages; nothing may write to the repository.
      const writes = [...text.matchAll(/^\s*([\w-]+): write$/gm)].map((match) => match[1]);
      assert.deepEqual(writes, name === 'pages.yml' ? ['pages', 'id-token'] : []);
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

describe('Production on GitHub Pages (spec §15, 2026-09-26)', () => {
  const pages = workflows.find((w) => w.name === 'pages.yml')?.text ?? '';

  it('deploys main only, after ci passes, plus hourly and manual rebuilds', () => {
    assert.ok(
      pages.includes(
        '  workflow_run:\n    workflows: [ci]\n    types: [completed]\n    branches: [main]\n',
      ),
    );
    assert.ok(pages.includes("github.event.workflow_run.conclusion == 'success'"));
    assert.ok(
      pages.includes('github.event.workflow_run.head_repository.full_name == github.repository'),
    );
    assert.doesNotMatch(pages, /^ {2}push:/m);
    assert.ok(pages.includes("ref: ${{ github.event.workflow_run.head_sha || 'main' }}"));
  });

  it('builds in production mode under the Pages base path', () => {
    // Setting WORKERS_CI_BRANCH to anything but main would make the live site a noindex preview.
    assert.doesNotMatch(pages, /^\s*WORKERS_CI_BRANCH:/m);
    assert.ok(pages.includes('PAGES_SITE: https://buildwithmuj.github.io'));
    assert.ok(pages.includes('PAGES_BASE: /Personal-Portfolio'));
  });
});
