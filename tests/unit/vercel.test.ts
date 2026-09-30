import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';

const cfg = JSON.parse(readFileSync(join(__dirname, '../../vercel.json'), 'utf8'));

describe('vercel.json', () => {
  it('builds the Vite site into dist at the domain root', () => {
    expect(cfg.framework).toBe('vite');
    expect(cfg.buildCommand).toBe('npm run build');
    expect(cfg.outputDirectory).toBe('dist');
  });

  it('sends conservative security headers on every page', () => {
    const headers = cfg.headers.find((h: {source: string}) => h.source === '/(.*)').headers;
    const get = (k: string) => headers.find((h: {key: string}) => h.key === k)?.value;
    expect(get('X-Content-Type-Options')).toBe('nosniff');
    expect(get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(get('X-Frame-Options')).toBe('DENY');
    expect(get('Permissions-Policy')).toContain('microphone=()');
  });
});
