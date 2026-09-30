import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {JSDOM} from 'jsdom';
import {describe, expect, it} from 'vitest';

const read = (f: string) => readFileSync(resolve(__dirname, '../../', f), 'utf8');
const doc = new JSDOM(read('credits.html')).window.document;

const PHOTOS = [
  'hero.jpg',
  'place-quiet.jpg',
  'place-office.jpg',
  'place-cafe.jpg',
  'place-outdoors.jpg',
  'earbuds.jpg',
  'conversation.jpg',
  'listening.jpg',
  'lecture-or-tv.jpg',
];

describe('credits.html', () => {
  it('uses the shared page layout', () => {
    expect(doc.querySelector('header.site-header')).not.toBeNull();
    expect(doc.querySelector('main#main .prose h1')?.textContent?.trim()).toBe('Photo credits');
    expect(doc.querySelector('footer.site-footer')).not.toBeNull();
    expect(doc.querySelector('script[type=module][src="/src/main.ts"]')).not.toBeNull();
  });

  it('lists all nine photos with photographer, source link and licence', () => {
    const items = [...doc.querySelectorAll('main [data-photo]')];
    expect(items.map(i => i.getAttribute('data-photo')).sort()).toEqual([...PHOTOS].sort());
    for (const item of items) {
      const name = item.getAttribute('data-photo')!;
      const text = item.textContent!.replace(/\s+/g, ' ');
      expect(text, name).toContain(name);
      expect(item.querySelector('.credit-photographer')?.textContent?.trim(), name).toBeTruthy();
      const source = item.querySelector<HTMLAnchorElement>('a.credit-source');
      expect(source?.getAttribute('href'), name).toMatch(/^https:\/\/(unsplash\.com\/photos\/|www\.pexels\.com\/photo\/)/);
      const host = new URL(source!.getAttribute('href')!).hostname;
      expect(text, name).toContain(host.includes('pexels') ? 'Pexels License' : 'Unsplash License');
    }
  });

  it('matches the photographers in docs/PHOTO-CREDITS.md', () => {
    const md = read('docs/PHOTO-CREDITS.md');
    for (const item of doc.querySelectorAll('main [data-photo]')) {
      const name = item.getAttribute('data-photo')!;
      const row = md.split('\n').find(l => l.startsWith(`| ${name} |`))!;
      expect(row, name).toBeTruthy();
      expect(row).toContain(item.querySelector('a.credit-source')!.getAttribute('href')!);
      const who = item.querySelector('.credit-photographer')!.textContent!.trim();
      expect(row).toContain(who);
    }
  });

  it('links to both licences and says the people are not ClariHear users', () => {
    expect(doc.querySelector('a[href="https://unsplash.com/license"]')).not.toBeNull();
    expect(doc.querySelector('a[href="https://www.pexels.com/license/"]')).not.toBeNull();
    expect(doc.querySelector('main')!.textContent).toMatch(/not ClariHear users/);
  });
});

describe('vite config', () => {
  it('builds credits.html as a page', () => {
    expect(read('vite.config.ts')).toMatch(/credits:\s*'credits\.html'/);
  });
});
