import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import stylelint from 'stylelint';

async function rulesBroken(code: string, codeFilename: string): Promise<string[]> {
  const { results } = await stylelint.lint({ code, codeFilename });
  return results[0]?.warnings.map((warning) => warning.rule) ?? [];
}

describe('design-token rule (spec §5)', () => {
  it('rejects hex colours in component CSS', async () => {
    assert.ok(
      (await rulesBroken('.a {\n  color: #fff;\n}\n', 'src/styles/global.css')).includes(
        'color-no-hex',
      ),
    );
  });

  it('rejects colour functions in component CSS', async () => {
    const rules = await rulesBroken('.a {\n  color: rgb(0 0 0);\n}\n', 'src/styles/global.css');
    assert.ok(rules.includes('function-disallowed-list'));
  });

  it('rejects named colours in component CSS', async () => {
    assert.ok(
      (await rulesBroken('.a {\n  color: red;\n}\n', 'src/styles/global.css')).includes(
        'color-named',
      ),
    );
  });

  it('checks <style> blocks in .astro files', async () => {
    const code = '<style>\n  .a {\n    color: #fff;\n  }\n</style>\n';
    assert.ok((await rulesBroken(code, 'src/components/Example.astro')).includes('color-no-hex'));
  });

  it('allows tokens', async () => {
    assert.deepEqual(
      await rulesBroken('.a {\n  color: var(--color-text);\n}\n', 'src/styles/global.css'),
      [],
    );
  });

  it('allows colour literals in tokens.css', async () => {
    const rules = await rulesBroken(
      ':root {\n  --color-text: #1a1a1a;\n}\n',
      'src/styles/tokens.css',
    );
    assert.ok(!rules.includes('color-no-hex'));
  });
});
