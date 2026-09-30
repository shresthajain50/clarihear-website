import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

const read = (f: string) => readFileSync(resolve(__dirname, '../../', f), 'utf8');
const pages = {'index.html': read('index.html'), 'privacy.html': read('privacy.html')};

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

  it('shows the contact email in the footer of both pages', () => {
    for (const html of Object.values(pages)) {
      const footer = /<footer[\s\S]*<\/footer>/i.exec(html)?.[0] ?? '';
      expect(footer).toContain('shresthajain.iitb@gmail.com');
    }
  });
});
