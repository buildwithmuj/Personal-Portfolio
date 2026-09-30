import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { COUNT_URL } from '../../site.config.ts';
import { countUrl, type PageView } from '../../src/lib/analytics.ts';

const ENDPOINT = 'https://example.goatcounter.com/count';
const SITE = 'https://buildwithmuj.github.io';
const view: PageView = {
  hostname: 'buildwithmuj.github.io',
  path: '/Personal-Portfolio/work/this-site',
  title: 'This site — Mujtaba Shah',
  referrer: 'https://www.linkedin.com/',
  screen: [390, 844, 3],
  automated: false,
};

describe('countUrl', () => {
  it('describes one page view to the counter, as GoatCounter expects it', () => {
    const url = new URL(countUrl(ENDPOINT, SITE, view) ?? '');
    assert.equal(url.origin + url.pathname, ENDPOINT);
    assert.deepEqual(Object.fromEntries(url.searchParams), {
      p: '/Personal-Portfolio/work/this-site',
      t: 'This site — Mujtaba Shah',
      r: 'https://www.linkedin.com/',
      s: '390,844,3',
    });
  });

  it('leaves out the referrer when there is none', () => {
    const url = new URL(countUrl(ENDPOINT, SITE, { ...view, referrer: '' }) ?? '');
    assert.equal(url.searchParams.has('r'), false);
  });

  it('marks a browser under automation, which GoatCounter sets aside as a bot', () => {
    const url = new URL(countUrl(ENDPOINT, SITE, { ...view, automated: true }) ?? '');
    assert.equal(url.searchParams.get('b'), '153');
  });

  it('counts nothing anywhere but on the live site: not locally, not on a preview', () => {
    for (const hostname of ['127.0.0.1', 'localhost', 'dev.example.workers.dev', 'github.io']) {
      assert.equal(countUrl(ENDPOINT, SITE, { ...view, hostname }), undefined);
    }
  });
});

// The counter and the privacy notice change together: the notice names the counter exactly while it
// is switched on (site.config.ts).
describe('the visitor counter and the privacy notice', () => {
  const privacy = readFileSync('src/content/pages/privacy.md', 'utf8');

  it('the notice names GoatCounter if, and only if, the counter is on', () => {
    assert.equal(privacy.includes('GoatCounter'), Boolean(COUNT_URL));
  });

  it('the notice claims no analytics, in its text and its description, only while the counter is off', () => {
    assert.equal(/doesn't set cookies or use analytics/.test(privacy), !COUNT_URL);
    assert.equal(/no analytics/i.test(privacy), !COUNT_URL);
  });

  it('the counter, when on, is reached over HTTPS', () => {
    if (COUNT_URL) assert.equal(new URL(COUNT_URL).protocol, 'https:');
  });
});
