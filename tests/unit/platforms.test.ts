import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {JSDOM} from 'jsdom';
import {describe, expect, it} from 'vitest';

const read = (f: string) => readFileSync(resolve(__dirname, '../../', f), 'utf8');
const pages = {
  'index.html': new JSDOM(read('index.html')),
  'privacy.html': new JSDOM(read('privacy.html')),
  'credits.html': new JSDOM(read('credits.html')),
};

describe('platform copy', () => {
  const idx = pages['index.html'].window.document;
  it('has exact title, description and eyebrow', () => {
    expect(idx.title).toBe('ClariHear - a personal sound amplifier for iPhone and Android');
    expect(idx.querySelector('meta[name=description]')?.getAttribute('content')).toBe(
      'ClariHear turns your phone and earbuds into a personal sound amplifier for clearer everyday sound. Join the early-access list.',
    );
    expect(idx.querySelector('.eyebrow')?.textContent?.trim()).toBe('Coming soon to iPhone and Android');
  });
  it('has exact lead, FAQ launch answer and privacy intro', () => {
    expect(idx.querySelector('.lead')?.textContent?.trim()).toBe(
      'ClariHear turns your phone and earbuds into a personal sound amplifier, tuned to how you hear and to where you are.',
    );
    const faq = [...idx.querySelectorAll('details')].find(d => d.querySelector('summary')?.textContent?.trim() === 'When does it launch?');
    expect(faq?.querySelector('p')?.textContent?.trim()).toBe('On iPhone and Android. Early-access members hear first.');
    const priv = pages['privacy.html'].window.document.body.textContent ?? '';
    expect(priv).toContain('ClariHear is a pre-launch sound-amplifier app for iPhone and Android. You can reach us at');
  });
  for (const [name, dom] of Object.entries(pages)) {
    const d = dom.window.document;
    const sources = [d.title, ...[...d.querySelectorAll('meta[content]')].map(m => m.getAttribute('content') ?? ''), d.body.textContent ?? ''];
    it(`${name}: every iPhone mention also mentions Android`, () => {
      const sentences = sources.flatMap(s => s.split(/(?<=[.!?])\s+/));
      for (const s of sentences) if (/iphone/i.test(s)) expect(s, s).toMatch(/android/i);
      for (const s of sentences) if (/android/i.test(s)) expect(s, s).toMatch(/iphone/i);
    });
    it(`${name}: no store badges or text`, () => {
      const all = dom.serialize();
      expect(all).not.toMatch(/app store|google play/i);
    });
  }
});
