import {existsSync, readFileSync} from 'node:fs';
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
    // The visible label carries the state; no competing aria-pressed.
    expect(q('#wave-toggle')!.hasAttribute('aria-pressed')).toBe(false);
    expect(q('#wave-toggle')!.textContent!.trim()).toBe('Pause animation');
    expect(q('h1')?.textContent?.trim()).toBe('Hear the conversation again.');
  });

  it('has the places picker with four radios, chart and description', () => {
    expect(q('#places div[role=radiogroup]#env-picker')).not.toBeNull();
    const radios = [...doc.querySelectorAll('#env-picker button[role=radio]')];
    expect(radios.map(r => r.getAttribute('data-env'))).toEqual(['quiet', 'office', 'cafe', 'outdoors']);
    expect(q('#places div#env-chart')).not.toBeNull();
    expect(q('#places p#env-desc')).not.toBeNull();
  });

  describe('hearing profile section', () => {
    const ids = [...doc.querySelectorAll('main > section')].map(s => s.id);

    it('sits right after How it works, before the moments and places', () => {
      expect(ids).toContain('profile');
      expect(ids.indexOf('profile')).toBe(ids.indexOf('how') + 1);
      expect(ids.indexOf('profile')).toBeLessThan(ids.indexOf('moments'));
      expect(ids.indexOf('profile')).toBeLessThan(ids.indexOf('places'));
      expect(q('#profile h2')?.textContent?.trim()).toBe('Your hearing profile');
    });

    it('has three linked reveal panels in order', () => {
      const panels = [...doc.querySelectorAll('#profile .profile-panel')];
      expect(panels).toHaveLength(3);
      expect(panels.map(p => p.querySelector('h3')?.textContent?.trim())).toEqual([
        'Tone check',
        'Your profile',
        'Your boosts',
      ]);
      for (const p of panels) {
        expect(p.classList.contains('card')).toBe(true);
        expect(p.classList.contains('reveal')).toBe(true);
      }
      const links = [...doc.querySelectorAll('#profile .profile-link')];
      expect(links).toHaveLength(2);
      for (const l of links) expect(l.getAttribute('aria-hidden')).toBe('true');
    });

    it('illustrates the tone check with ears, six pitches and an "I heard it" pill', () => {
      const tone = q('#profile .tone-check')!;
      expect(tone.getAttribute('role')).toBe('img');
      expect(tone.getAttribute('aria-label')).toBeTruthy();
      expect([...tone.querySelectorAll('.ear-toggle span')].map(e => e.textContent!.trim())).toEqual(['Left', 'Right']);
      expect([...tone.querySelectorAll('.pitch-label')].map(e => e.textContent!.trim())).toEqual([
        '250',
        '500',
        '1k',
        '2k',
        '4k',
        '8k',
      ]);
      expect(tone.querySelectorAll('.pitch-dot')).toHaveLength(6);
      expect(tone.querySelector('.heard-pill')?.textContent?.trim()).toBe('I heard it');
    });

    it('has chart mounts, the Everyday / Café toggle, caption and disclaimer', () => {
      expect(q('#profile #profile-chart')).not.toBeNull();
      expect(q('#profile #boost-chart')).not.toBeNull();
      const modes = [...doc.querySelectorAll('#boost-mode[role=radiogroup] button[role=radio]')];
      expect(modes.map(m => m.textContent!.trim())).toEqual(['Everyday', 'Café']);
      expect(modes.map(m => m.getAttribute('aria-checked'))).toEqual(['true', 'false']);
      expect(q('#profile .boost-caption')?.textContent?.trim()).toBe("More help where you need it, less where you don't.");
      expect(q('#profile .profile-note')?.textContent?.trim()).toBe(
        "Illustrative example computed by ClariHear's fitting engine. Your profile and boosts will differ. Not a medical test.",
      );
    });
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

  it('pairs the join form with a "What happens next" panel', () => {
    const layout = q('#join .join-layout')!;
    expect(layout).not.toBeNull();
    expect(layout.querySelector('.form-card form#signup')).not.toBeNull();
    const panel = layout.querySelector('.join-next')!;
    expect(panel).not.toBeNull();
    expect(panel.querySelector('h3')?.textContent?.trim()).toBe('What happens next');
    expect([...panel.querySelectorAll('ol > li')].map(li => li.textContent!.trim())).toEqual([
      'We email you when early access opens.',
      'You can withdraw anytime.',
      'We never sell your details.',
    ]);
  });

  it('never pre-ticks consent', () => {
    const consent = q('#signup input[name=consent]')!;
    expect(consent.getAttribute('type')).toBe('checkbox');
    expect(consent.hasAttribute('checked')).toBe(false);
  });

  it('has reveal elements', () => {
    expect(doc.querySelectorAll('.reveal').length).toBeGreaterThan(0);
  });

  describe('photography', () => {
    const imgs = [...doc.querySelectorAll('img')];
    const hero = q('#hero img.hero-photo') as HTMLImageElement | null;
    const EAGER = ['hero', 'app-cafe', 'place-quiet'];
    const nameOf = (img: Element) => /images\/([a-z-]+?)(?:-\d+)?\.(?:jpg|png)/.exec(img.getAttribute('src') ?? '')?.[1];

    it('has a hero photo that loads eagerly with high priority', () => {
      expect(hero).not.toBeNull();
      expect(hero!.getAttribute('src')).toBe('images/hero.jpg');
      expect(hero!.getAttribute('srcset')).toContain('images/hero-800.jpg 800w');
      expect(hero!.getAttribute('srcset')).toContain('images/hero.jpg 2400w');
      expect(hero!.getAttribute('sizes')).toBeTruthy();
      expect(hero!.getAttribute('width')).toBe('2400');
      expect(hero!.getAttribute('height')).toBe('1600');
      expect(hero!.getAttribute('fetchpriority')).toBe('high');
      expect(hero!.getAttribute('alt')).toBe('People talking at a lamp-lit restaurant table');
      expect(hero!.hasAttribute('loading')).toBe(false);
    });

    it('has an honest app-preview image floating over the hero card', () => {
      const app = q('#hero .hero-media img.hero-app') as HTMLImageElement | null;
      expect(app).not.toBeNull();
      expect(app!.getAttribute('src')).toBe('images/app-cafe.png');
      expect(app!.getAttribute('srcset')).toContain('images/app-cafe-600.png 600w');
      expect(app!.getAttribute('srcset')).toContain('images/app-cafe.png 1000w');
      expect(app!.getAttribute('width')).toBe('1000');
      expect(app!.getAttribute('height')).toBe('1600');
      expect(app!.getAttribute('loading')).toBe('eager');
      expect(app!.getAttribute('decoding')).toBe('async');
      expect(app!.getAttribute('alt')).toBe('ClariHear app screen with the Café / restaurant setting selected');
      expect(existsSync(resolve(__dirname, '../../public/images/app-cafe.png'))).toBe(true);
      expect(existsSync(resolve(__dirname, '../../public/images/app-cafe-600.png'))).toBe(true);
      expect(q('#hero .hero-media .hero-caption')!.textContent!.trim()).toBe('App preview');
      expect(q('#hero[data-scroll-world]')!.hasAttribute('hidden')).toBe(false);
    });

    it('keeps the wave inside the hero photo card, h1 outside it', () => {
      expect(q('#hero .hero-media svg#wave')).not.toBeNull();
      expect(q('#hero .hero-media img.hero-photo')).not.toBeNull();
      expect(q('#hero .hero-copy h1')).not.toBeNull();
    });

    it('gives every image alt, size, async decoding and lazy loading (bar the eager ones)', () => {
      expect(imgs.length).toBeGreaterThanOrEqual(11);
      for (const img of imgs) {
        const src = img.getAttribute('src')!;
        const alt = img.getAttribute('alt');
        expect(alt, `${src} alt`).not.toBeNull();
        if (img.getAttribute('aria-hidden') !== 'true') expect(alt!.trim(), `${src} alt`).not.toBe('');
        expect(Number(img.getAttribute('width')), `${src} width`).toBeGreaterThan(0);
        expect(Number(img.getAttribute('height')), `${src} height`).toBeGreaterThan(0);
        expect(img.getAttribute('decoding'), `${src} decoding`).toBe('async');
        if (EAGER.includes(nameOf(img)!)) expect(img.getAttribute('loading'), src).not.toBe('lazy');
        else expect(img.getAttribute('loading'), `${src} loading`).toBe('lazy');
        expect(img.getAttribute('srcset'), `${src} srcset`).toBeTruthy();
      }
    });

    it('references only image files that exist in public/', () => {
      const refs = imgs.flatMap(img => [
        img.getAttribute('src')!,
        ...(img.getAttribute('srcset') ?? '').split(',').map(c => c.trim().split(/\s+/)[0]).filter(Boolean),
      ]);
      for (const ref of new Set(refs)) {
        expect(ref, ref).toMatch(/^images\//);
        expect(existsSync(resolve(__dirname, '../../public', ref)), ref).toBe(true);
      }
    });

    it('shows a photo per place, stacked in the picker card', () => {
      const photos = [...doc.querySelectorAll('#places #env-photo img[data-env]')];
      expect(photos.map(p => p.getAttribute('data-env'))).toEqual(['quiet', 'office', 'cafe', 'outdoors']);
      expect(photos.map(nameOf)).toEqual(['place-quiet', 'place-office', 'place-cafe', 'place-outdoors']);
    });

    it('puts a photo on top of each How it works step', () => {
      const cards = [...doc.querySelectorAll('#how .card')];
      expect(cards).toHaveLength(3);
      const first = cards.map(c => c.firstElementChild);
      expect(first.map(el => el?.tagName)).toEqual(['IMG', 'IMG', 'IMG']);
      expect(first.map(el => nameOf(el!))).toEqual(['conversation', 'earbuds', 'listening']);
      expect(first.map(el => el!.getAttribute('alt'))).toEqual([
        'Two people talking over coffee',
        'Hands holding earbuds and a phone',
        'Someone putting in an earbud',
      ]);
    });

    it('adds an everyday-moments strip between the hearing profile and Real places', () => {
      const ids = [...doc.querySelectorAll('main > section')].map(s => s.id);
      expect(ids.indexOf('moments')).toBe(ids.indexOf('profile') + 1);
      expect(ids.indexOf('places')).toBe(ids.indexOf('moments') + 1);
      expect(q('#moments h2')?.textContent?.trim()).toBe('Made for everyday moments');
      const cards = [...doc.querySelectorAll('#moments .moment')];
      expect(cards.map(c => nameOf(c.querySelector('img')!))).toEqual(['place-cafe', 'lecture-or-tv', 'place-outdoors']);
      expect(cards.map(c => c.querySelector('figcaption')?.textContent?.trim())).toEqual([
        'Dinners and cafés',
        'Lectures and talks',
        'Out and about',
      ]);
      for (const c of cards) expect(c.classList.contains('reveal')).toBe(true);
      expect(q('#moments')!.textContent!.toLowerCase()).not.toMatch(/\b(users?|customers?)\b/);
    });

    it('credits the photographers from the footer', () => {
      const link = q('footer a[href="credits.html"]');
      expect(link?.textContent?.trim()).toBe('Photography: Unsplash and Pexels contributors (credits)');
    });
  });
});
