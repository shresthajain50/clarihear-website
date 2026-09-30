import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {describe, it, expect} from 'vitest';

/**
 * JS budget for the built site. Runs after `npm run build` via `npm run test:budget`
 * (excluded from `npm test`, which runs before any build).
 */
const BASELINE = 34_698; // gzip -9 bytes of dist/assets/*.js on main before the React Bits work
const ADDED_BUDGET = 90_000; // spec: the motion layer adds at most ~90 KB gzip
const DIST = join(process.cwd(), 'dist', 'assets');
const hasDist = existsSync(DIST) && readdirSync(DIST).some(f => f.endsWith('.js'));

if (!hasDist) console.warn('bundle-budget: dist/assets has no JS; run `npm run build` first. Skipping.');

describe.skipIf(!hasDist)('bundle budget', () => {
  it(`total gzip JS <= ${BASELINE} + ${ADDED_BUDGET} bytes`, () => {
    const files = readdirSync(DIST).filter(f => f.endsWith('.js'));
    const sizes = files.map(f => ({f, gz: gzipSync(readFileSync(join(DIST, f)), {level: 9}).length}));
    const total = sizes.reduce((s, x) => s + x.gz, 0);
    console.info(`bundle-budget: ${total} B gzip across ${files.length} file(s)`, sizes);
    expect(total).toBeLessThanOrEqual(BASELINE + ADDED_BUDGET);
  });

  it('the entry chunk stays small: islands load lazily after first paint', () => {
    const html = readFileSync(join(process.cwd(), 'dist', 'index.html'), 'utf8');
    const entry = /<script[^>]+src="[^"]*assets\/([^"]+\.js)"/.exec(html)?.[1];
    expect(entry).toBeTruthy();
    const gz = gzipSync(readFileSync(join(DIST, entry!)), {level: 9}).length;
    // The critical path is the pre-React Bits site plus a little glue, not the island runtime.
    expect(gz).toBeLessThanOrEqual(BASELINE + 5_000);
  });
});
