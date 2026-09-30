import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {JSDOM} from 'jsdom';
import {describe, expect, it} from 'vitest';

const read = (f: string) => readFileSync(resolve(__dirname, '../../', f), 'utf8');
const pages = {'index.html': read('index.html'), 'privacy.html': read('privacy.html')};

describe('no third-party fonts or scripts', () => {
  for (const [name, html] of Object.entries(pages)) {
    it(`${name} loads no Google Fonts`, () => {
      expect(html).not.toContain('fonts.googleapis');
      expect(html).not.toContain('fonts.gstatic');
    });
  }

  it('font token is the system stack (SF Pro first on Apple)', () => {
    expect(read('src/styles/tokens.css')).toContain(
      '--font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;',
    );
  });

  it('main.ts does not load the Web3Forms/hCaptcha client script', () => {
    const main = read('src/main.ts');
    expect(main).not.toContain('web3forms.com/client');
    expect(main).not.toMatch(/createElement\(['"]script['"]\)/);
  });
});

describe('privacy notice is truthful about processors', () => {
  const doc = new JSDOM(pages['privacy.html']).window.document;
  const text = doc.querySelector('main')!.textContent!.replace(/\s+/g, ' ');

  it('names Web3Forms, the Gmail inbox and GitHub Pages', () => {
    expect(text).toContain('Web3Forms');
    expect(text).toMatch(/form-to-email service/);
    expect(text).toMatch(/Google Gmail account/);
    expect(text).toContain('GitHub Pages');
    expect(text).toMatch(/IP address/);
  });

  it('mentions processing outside India and the consent legal basis', () => {
    expect(text).toMatch(/outside India or your country/);
    expect(text).toMatch(/legal basis/i);
    expect(text).toMatch(/consent, which you can withdraw anytime/);
  });

  it('does not claim it collects nothing else; states no cookies/analytics/trackers', () => {
    expect(text.toLowerCase()).not.toContain('nothing else');
    expect(text).toContain("We don't use cookies, analytics or advertising trackers on this site.");
  });

  it('keeps retention, never sold, rights, complaints and contact', () => {
    expect(text).toContain('12 months after launch');
    expect(text).toContain('never sell');
    expect(text).toMatch(/access to your details, correct them, erase them/);
    expect(text).toContain('Data Protection Board');
    expect(text).toContain('shresthajain.iitb@gmail.com');
  });
});
