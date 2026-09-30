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
      const checkouts = text.match(/uses: actions\/checkout@/g)?.length ?? 0;
      assert.ok(checkouts > 0);
      // Every checkout, in every job.
      assert.equal(text.match(/^\s+persist-credentials: false$/gm)?.length ?? 0, checkouts);
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

/** A workflow's jobs by id, each with the text of its block. */
function jobsOf(workflow: string): Map<string, string> {
  const start = workflow.indexOf('\njobs:\n');
  assert.notEqual(start, -1, 'no jobs: section');
  const jobs = new Map<string, string>();
  let current = '';
  for (const line of workflow.slice(start + '\njobs:\n'.length).split('\n')) {
    current = /^ {2}([\w-]+):$/.exec(line)?.[1] ?? current;
    if (current) jobs.set(current, `${jobs.get(current) ?? ''}${line}\n`);
  }
  return jobs;
}

describe('ci.yml runs its checks in parallel jobs behind one required check, ci', () => {
  const ci = workflows.find((w) => w.name === 'ci.yml')?.text ?? '';
  const jobs = jobsOf(ci);
  const gate = jobs.get('ci') ?? '';
  const others = [...jobs.keys()].filter((id) => id !== 'ci');

  it('keeps the names the main ruleset and pages.yml wait for', () => {
    assert.match(ci, /^name: ci$/m);
    assert.match(gate, /^ {4}name: ci$/m);
    assert.equal(ci.match(/^ {4}name: ci$/gm)?.length, 1, 'only the gate job is named ci');
  });

  it('the ci job needs every other job, always runs, and fails unless they all succeeded', () => {
    assert.ok(others.length > 0);
    const needs = /^ {4}needs: \[(.+)\]$/m.exec(gate)?.[1]?.split(', ') ?? [];
    assert.deepEqual(needs.sort(), others.sort());
    // A skipped required check counts as passed, so the gate must never be skipped.
    assert.match(gate, /^ {4}if: always\(\)$/m);
    assert.ok(gate.includes("RESULTS: ${{ join(needs.*.result, ' ') }}"));
    assert.ok(gate.includes('if [ "$result" != success ]; then'));
  });

  it('still runs every check', () => {
    const runs = [...ci.matchAll(/^\s*(?:-\s*)?run: (.+)$/gm)].map((match) => match[1]);
    for (const command of [
      'pnpm audit --audit-level=high',
      'pnpm format:check',
      'pnpm lint',
      'pnpm check',
      'pnpm test',
      'pnpm build',
      'pnpm test:perf',
    ]) {
      assert.ok(runs.includes(command), command);
    }
    assert.ok(ci.includes('PAGES_BASE: /Personal-Portfolio'));
    assert.match(ci, /uses: lycheeverse\/lychee-action@/);
  });

  it('runs every project in test:e2e in the e2e browser matrix', () => {
    const { scripts } = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts: Record<string, string>;
    };
    const projects = [...(scripts['test:e2e'] ?? '').matchAll(/--project=(\w+)/g)].map(
      (match) => match[1],
    );
    const e2e = jobs.get('e2e') ?? '';
    const browsers = /^ {8}browser: \[(.+)\]$/m.exec(e2e)?.[1]?.split(', ') ?? [];
    assert.ok(projects.length > 0);
    assert.deepEqual(browsers.sort(), projects.sort());
    assert.ok(e2e.includes('run: pnpm exec playwright test --project="$BROWSER"'));
  });
});

describe('Production on GitHub Pages (spec §15, 2026-09-26)', () => {
  const pages = workflows.find((w) => w.name === 'pages.yml')?.text ?? '';

  it('deploys main only, after ci passes, or when run by hand', () => {
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
    assert.doesNotMatch(pages, /^ {2}schedule:/m);
    assert.ok(pages.includes("ref: ${{ github.event.workflow_run.head_sha || 'main' }}"));
  });

  it('deploys only the commit main points at now, so a re-run never rolls the site back', () => {
    assert.ok(pages.includes('git ls-remote "https://github.com/$REPOSITORY" refs/heads/main'));
    assert.ok(pages.includes('if [ -z "$TESTED" ] || [ "$TESTED" = "$main" ]; then'));
    // Reading main can't fail quietly (and skip the deploy without a word).
    assert.match(pages, /^ {8}shell: bash$/m);
    assert.ok(pages.includes('if [ -z "$main" ]; then'));
    assert.ok(
      pages.includes("    needs: current\n    if: needs.current.outputs.deploy == 'true'\n"),
    );
  });

  it('lets a deploy finish rather than cancelling it part-way', () => {
    assert.match(pages, /^ {2}cancel-in-progress: false$/m);
  });

  it('builds in production mode under the Pages base path', () => {
    // Setting WORKERS_CI_BRANCH to anything but main would make the live site a noindex preview.
    assert.doesNotMatch(pages, /^\s*WORKERS_CI_BRANCH:/m);
    assert.ok(pages.includes('PAGES_SITE: https://buildwithmuj.github.io'));
    assert.ok(pages.includes('PAGES_BASE: /Personal-Portfolio'));
  });
});
