import { readFileSync } from 'node:fs';

const PROFILE = 'src/content/profile.yaml';
const read = (path: string) => readFileSync(path, 'utf8');
/** Strips a trailing `# comment` and surrounding quotes from a YAML scalar. */
const clean = (raw: string) => raw.replace(/\s+#.*$/, '').replace(/^(['"])(.*)\1$/, '$2');

/** A top-level scalar of the `main` entry in profile.yaml, e.g. `email`. */
export function profileValue(key: string): string {
  const match = read(PROFILE).match(new RegExp(`^ {2}${key}: (.+)$`, 'm'));
  if (!match?.[1]) throw new Error(`${PROFILE} has no top-level "${key}"`);
  return clean(match[1]);
}

/** A section heading from `profile.sections`, e.g. `sectionHeading('work')`. */
export function sectionHeading(section: string): string {
  const match = read(PROFILE).match(new RegExp(`^ {4}${section}:\\n {6}heading: (.+)$`, 'm'));
  if (!match?.[1]) throw new Error(`${PROFILE} has no heading for section "${section}"`);
  return clean(match[1]);
}

/** Every `key: value` scalar in a YAML file, in file order (e.g. every `title:`). */
export function yamlValues(path: string, key: string): string[] {
  return [...read(path).matchAll(new RegExp(`^\\s*(?:- )?${key}: (.+)$`, 'gm'))].map((match) =>
    clean(match[1] ?? ''),
  );
}

/** The block-list items under `key:` in a YAML file, e.g. `yamlList(PROFILE, 'roles')`. */
export function yamlList(path: string, key: string): string[] {
  const match = read(path).match(new RegExp(`^( *)${key}:\\n((?:\\1 {2}- .+\\n?)+)`, 'm'));
  return (match?.[2] ?? '')
    .split('\n')
    .filter(Boolean)
    .map((line) => clean(line.replace(/^\s*- /, '')));
}
