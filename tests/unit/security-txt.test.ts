import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const text = readFileSync('public/.well-known/security.txt', 'utf8');
const field = (name: string) => text.match(new RegExp(`^${name}: (.+)$`, 'm'))?.[1];
const DAY = 86_400_000;

describe('security.txt (RFC 9116, spec §7)', () => {
  it('has a mailto: Contact', () => {
    assert.match(field('Contact') ?? '', /^mailto:\S+@\S+$/);
  });

  it('expires more than 30 days and less than a year from now', () => {
    const days = (new Date(field('Expires') ?? '').getTime() - Date.now()) / DAY;
    assert.ok(
      days > 30,
      `Expires is ${Math.floor(days)} days away: renew it (README, "Renewing security.txt")`,
    );
    assert.ok(days < 366, 'Expires must be less than a year away');
  });
});
