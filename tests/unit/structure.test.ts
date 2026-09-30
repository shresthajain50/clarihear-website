import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {JSDOM} from 'jsdom';
import {describe, expect, it} from 'vitest';

const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');
const doc = new JSDOM(html).window.document;
const q = (s: string) => doc.querySelector(s);

describe('index.html structure', () => {
  it('has landmarks and a skip link', () => {
    expect(q('header')).not.toBeNull();
    expect(q('main#main')).not.toBeNull();
    expect(q('footer')).not.toBeNull();
    expect(q('a[href="#main"]')).not.toBeNull();
  });

  it('has the hero hooks and static h1', () => {
    expect(q('#hero[data-scroll-world] svg#wave')).not.toBeNull();
    expect(q('#hero button#wave-toggle')).not.toBeNull();
    expect(q('h1')?.textContent?.trim()).toBe('Hear the conversation again.');
  });

  it('has the places picker with four radios, chart and description', () => {
    expect(q('#places div[role=radiogroup]#env-picker')).not.toBeNull();
    const radios = [...doc.querySelectorAll('#env-picker button[role=radio]')];
    expect(radios.map(r => r.getAttribute('data-env'))).toEqual(['quiet', 'office', 'cafe', 'outdoors']);
    expect(q('#places div#env-chart')).not.toBeNull();
    expect(q('#places p#env-desc')).not.toBeNull();
  });

  it('has the signup form hooks', () => {
    expect(q('section#join form#signup')).not.toBeNull();
    expect(q('div#signup-status[aria-live=polite]')).not.toBeNull();
    expect(q('button#signup-submit')).not.toBeNull();
    for (const f of ['name', 'email', 'phone', 'age', 'consent', 'botcheck']) {
      const input = q(`#signup [name=${f}]`);
      expect(input, f).not.toBeNull();
      expect(input!.getAttribute('aria-describedby') ?? '', f).toContain(`${f}-error`);
      const err = q(`p#${f}-error.field-error`);
      expect(err, `${f}-error`).not.toBeNull();
    }
    for (const f of ['phone', 'age']) expect(q(`#${f}-hint`), `${f}-hint`).not.toBeNull();
  });

  it('labels every visible form input', () => {
    const inputs = [...doc.querySelectorAll('#signup input')].filter(i => i.getAttribute('type') !== 'hidden');
    for (const input of inputs) {
      const id = input.getAttribute('id');
      expect(id, 'input needs id').toBeTruthy();
      expect(doc.querySelector(`label[for="${id}"]`), `label for ${id}`).not.toBeNull();
    }
  });

  it('never pre-ticks consent', () => {
    const consent = q('#signup input[name=consent]')!;
    expect(consent.getAttribute('type')).toBe('checkbox');
    expect(consent.hasAttribute('checked')).toBe(false);
  });

  it('has reveal elements', () => {
    expect(doc.querySelectorAll('.reveal').length).toBeGreaterThan(0);
  });
});
