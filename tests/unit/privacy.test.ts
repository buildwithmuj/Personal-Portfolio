import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { describe, it } from 'node:test';

const TEXT_EXTENSIONS = new Set(['.md', '.mdx', '.yaml', '.yml', '.txt', '.svg', '.json', '']);
const PHONE = /(?:\+44\s?7\d{3}|\b07\d{3})[\s-]?\d{3}[\s-]?\d{3}\b/;
// SHA-256 of former clients' names, lowercase (content spec §10). The plaintext is never committed.
// Clients the owner has cleared to name (the hero's logo strip, 2026-09-28) are no longer listed.
const CLIENT_HASHES = new Set(['02190e51b3183e1f494511b02b14caac60dc38ccab12dc1a7d52b139d30140af']);

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

function textFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return textFiles(path);
    return TEXT_EXTENSIONS.has(extname(entry.name)) ? [path] : [];
  });
}

/** Words and two-word phrases in `text` whose hash is in `hashes`. */
function clientNameHits(text: string, hashes: ReadonlySet<string>): string[] {
  const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const phrases = [...words, ...words.slice(1).map((word, i) => `${words[i]} ${word}`)];
  return phrases.filter((phrase) => hashes.has(sha256(phrase)));
}

describe('privacy guards (content spec §10)', () => {
  it('recognises UK mobile numbers', () => {
    assert.match('+44 7700 900123', PHONE);
    assert.match('07700900123', PHONE);
    assert.doesNotMatch('Nine years across five sectors', PHONE);
  });

  it('finds hashed words and two-word phrases', () => {
    const hashes = new Set([sha256('acme'), sha256('big bank')]);
    assert.deepEqual(clientNameHits('We worked with ACME and a Big Bank.', hashes), [
      'acme',
      'big bank',
    ]);
  });

  const files = [...textFiles('src/content'), ...textFiles('public')];

  it('scans the content and public files', () => {
    assert.ok(files.length > 10, `only ${files.length} files found`);
  });

  for (const file of files) {
    const text = readFileSync(file, 'utf8');

    it(`${file} contains no phone number`, () => {
      assert.doesNotMatch(text, PHONE);
    });

    it(`${file} names no former client`, () => {
      assert.deepEqual(clientNameHits(text, CLIENT_HASHES), []);
    });
  }
});
