import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { CV_PDF, savedFingerprints } from '../../scripts/cv-pdf.ts';
import { yamlValues } from '../support/content.ts';

// The CV download is printed by scripts/cv-pdf.ts, which notes the file's fingerprint as it writes
// it. A PDF replaced by hand, or a fingerprint committed without its PDF, no longer matches.
describe('the CV download', () => {
  it('is the file scripts/cv-pdf.ts last printed', () => {
    const file = createHash('sha256').update(readFileSync(CV_PDF)).digest('hex');
    assert.equal(
      file,
      savedFingerprints().file,
      'public/cv.pdf is not the file the script printed. Run `pnpm build`, then `pnpm cv:pdf`.',
    );
  });
});

// Feedback shows one person's words at a time, picked by a rule per seat: its styles cover six.
describe('the recommendations', () => {
  it('number no more than the six seats the section can show', () => {
    const real = yamlValues('src/content/testimonials.yaml', 'placeholder').filter(
      (value) => value === 'false',
    );
    assert.ok(real.length <= 6, `${real.length} recommendations, but Feedback seats six`);
  });
});
