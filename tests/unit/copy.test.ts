import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {JSDOM} from 'jsdom';
import {describe, expect, it} from 'vitest';

const read = (f: string) => readFileSync(resolve(__dirname, '../../', f), 'utf8');
const pages = {'index.html': read('index.html'), 'privacy.html': read('privacy.html'), 'credits.html': read('credits.html')};

const BANNED = [
  'diagnos',
  'treat',
  'cure',
  'hearing test',
  'clinically',
  'FDA',
  'hearing aid replacement',
  'instead of hearing aids',
  'testimonial',
  '% off',
  'discount',
];

// Negated disclaimers that legitimately contain a banned stem (Controller ruling 1).
const ALLOWED_NEGATIONS = ["Doesn't diagnose or treat hearing loss", 'does not diagnose', "doesn't diagnose"];

const stripAllowed = (html: string) =>
  ALLOWED_NEGATIONS.reduce((acc, phrase) => acc.replace(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ''), html);

describe('copy guard', () => {
  for (const [name, html] of Object.entries(pages)) {
    it(`${name} has no banned words`, () => {
      const scanned = stripAllowed(html).toLowerCase();
      for (const word of BANNED) expect(scanned, `${name} contains "${word}"`).not.toContain(word.toLowerCase());
    });

    it(`${name} carries the medical-device disclaimer`, () => {
      expect(html.toLowerCase()).toContain('not a medical device');
    });
  }

  it('professional card makes only the claim the app supports', () => {
    const html = pages['index.html'];
    expect(html).toContain("We'll tell you when to see a professional");
    expect(html).toContain(
      'If your safety answers suggest seeing a hearing professional, ClariHear tells you before you start.',
    );
    expect(html).not.toContain('If something needs expert attention');
  });

  it('shows the contact email and photo credits in every footer', () => {
    for (const html of Object.values(pages)) {
      const footer = /<footer[\s\S]*<\/footer>/i.exec(html)?.[0] ?? '';
      expect(footer).toContain('shresthajain.iitb@gmail.com');
      expect(footer).toContain('href="credits.html"');
    }
  });
});

describe('hearing-assistance positioning', () => {
  const doc = new JSDOM(pages['index.html']).window.document;
  const texts = (sel: string) => [...doc.querySelectorAll(sel)].map(e => e.textContent!.replace(/\s+/g, ' ').trim());
  const faq = (question: string) =>
    [...doc.querySelectorAll('#faq details')].find(d => d.querySelector('summary')?.textContent?.trim() === question);

  it('no longer calls itself a sound amplifier in the title or hero lead', () => {
    expect(doc.title.toLowerCase()).not.toContain('sound amplifier');
    expect(doc.querySelector('#hero .lead')!.textContent!.toLowerCase()).not.toContain('sound amplifier');
  });

  it('says what it is: personalised, profile-driven, adults only', () => {
    expect(texts('.tick-list--is li')).toEqual([
      'Personalised hearing assistance on your phone and earbuds',
      'A hearing profile from a quick tone check, or from your audiogram',
      'Live sound tuned to your profile, frequency by frequency',
      'Built for adults 18 and over',
    ]);
    expect(texts('.tick-list--isnt li')).toEqual([
      'Not a medical device',
      "Doesn't diagnose or treat hearing loss",
      'Not a replacement for a hearing professional',
    ]);
  });

  it('describes the three steps accurately', () => {
    expect(texts('#how .card h3')).toEqual([
      '1 · A few safety questions',
      '2 · Build your hearing profile',
      '3 · Hear it tuned to you',
    ]);
    expect(texts('#how .card p')).toEqual([
      'Anything that needs a professional is flagged first.',
      'A short tone check, one ear at a time across six pitches, maps how you hear. You can enter a professional audiogram instead.',
      'ClariHear boosts the pitches you find harder to hear, adapts to where you are, and keeps an instant mute.',
    ]);
  });

  it('answers how it personalises and that the tone check is not a medical test, before pricing', () => {
    const qs = texts('#faq summary');
    const how = qs.indexOf('How does ClariHear personalise sound?');
    const med = qs.indexOf('Is the tone check a medical test?');
    const free = qs.indexOf('Is it free?');
    expect(how).toBeGreaterThan(-1);
    expect(med).toBe(how + 1);
    expect(free).toBe(med + 1);
    expect(faq('How does ClariHear personalise sound?')!.querySelector('p')!.textContent!.trim()).toBe(
      'Your tone check (or audiogram) gives an approximate profile for each ear. ClariHear turns it into gentle, capped boosts at each frequency, then adjusts for your surroundings.',
    );
    expect(faq('Is the tone check a medical test?')!.querySelector('p')!.textContent!.trim()).toBe(
      "No. It's a quick, approximate check to personalise your sound. It doesn't diagnose anything. If you're concerned about your hearing, see a hearing professional.",
    );
  });

  it('frames Real places as the profile adjusted for the room', () => {
    expect(doc.querySelector('#places .lead')!.textContent!.trim()).toBe('Your profile, adjusted for where you are.');
  });
});

describe('never positioned as only an amplifier', () => {
  const FOOTER =
    'ClariHear is a personalised hearing assistance app, not a medical device. For adults 18 and over. If you are concerned about your hearing, see a hearing professional.';

  for (const [name, html] of Object.entries(pages)) {
    it(`${name} never says "sound amplifier"`, () => {
      expect(html.toLowerCase()).not.toMatch(/sound[- ]amplifier/);
    });

    it(`${name} footer leads with personalised hearing assistance`, () => {
      const d = new JSDOM(html).window.document;
      expect(d.querySelector('footer p')!.textContent!.replace(/\s+/g, ' ').trim()).toBe(FOOTER);
    });
  }

  it('README never says "sound amplifier"', () => {
    expect(read('README.md').toLowerCase()).not.toMatch(/sound[- ]amplifier/);
  });

  it('answers the hearing-aid FAQ as personalised hearing assistance', () => {
    const d = new JSDOM(pages['index.html']).window.document;
    const faq = [...d.querySelectorAll('#faq details')].find(
      x => x.querySelector('summary')?.textContent?.trim() === 'Is ClariHear a hearing aid?',
    );
    expect(faq!.querySelector('p')!.textContent!.trim()).toBe(
      "No. ClariHear is personalised hearing assistance on your phone: an app that tunes live sound to your hearing profile. It isn't a medical device.",
    );
  });
});
