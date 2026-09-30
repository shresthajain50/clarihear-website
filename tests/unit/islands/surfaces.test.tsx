// @vitest-environment jsdom
import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {within} from '@testing-library/react';
import {act} from 'preact/test-utils';
import {indexBody, stubManualIntersectionObserver, stubVisibleIntersectionObserver} from './helpers';

// ogl needs a real WebGL context; stand in for it so the render loop can be observed.
const renders = vi.hoisted(() => ({count: 0}));
vi.mock('ogl', () => {
  class Renderer {
    gl: {canvas: HTMLCanvasElement; clearColor: () => void; getExtension: () => null};
    dpr: number;
    constructor(opts: {dpr?: number} = {}) {
      this.dpr = opts.dpr ?? 1;
      this.gl = {canvas: document.createElement('canvas'), clearColor() {}, getExtension: () => null};
    }
    setSize() {}
    render() {
      renders.count++;
    }
  }
  class Program {
    uniforms: Record<string, {value: unknown}>;
    constructor(_gl: unknown, o: {uniforms: Record<string, {value: unknown}>}) {
      this.uniforms = o.uniforms;
    }
  }
  class Mesh {}
  class Triangle {}
  return {Renderer, Program, Mesh, Triangle};
});

import {enhanceSpotlightCards, enhanceHeroCta, enhanceHeroAurora} from '../../../src/islands/surfaces';

/** matchMedia where only the listed queries match. */
function stubMedia(matching: string[]) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: matching.includes(q),
    media: q,
    addEventListener() {},
    removeEventListener() {},
  }));
}

/** A requestAnimationFrame queue that runs only when `tick()` is called. */
function stubRaf() {
  let id = 0;
  const queue = new Map<number, FrameRequestCallback>();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    queue.set(++id, cb);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (n: number) => queue.delete(n));
  return {
    pending: () => queue.size,
    tick: () => {
      const cbs = [...queue.values()];
      queue.clear();
      cbs.forEach(cb => cb(performance.now()));
    },
  };
}

const withWebGL = (ok: boolean) =>
  vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation((() => (ok ? ({} as RenderingContext) : null)) as never);

/** Islands mounted by a test, unmounted after it (they listen on document). */
const cleanups: Array<() => void> = [];
/** Mounts inside act(): preact runs effects after paint, act flushes them. */
function mounted<T>(fn: () => T): T {
  let out!: T;
  act(() => {
    out = fn();
  });
  if (typeof out === 'function') cleanups.push(out as () => void);
  if (Array.isArray(out)) cleanups.push(...(out as Array<() => void>));
  return out;
}

const CARD_SECTIONS = ['#honest', '#privacy-promise', '#profile'];
const cards = (sel: string) => [...document.querySelectorAll<HTMLElement>(`${sel} .card`)];

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  renders.count = 0;
  stubVisibleIntersectionObserver();
  document.body.innerHTML = indexBody;
});
afterEach(() => {
  act(() => cleanups.splice(0).forEach(u => u()));
  Object.defineProperty(document, 'hidden', {configurable: true, value: false});
});

describe('enhanceSpotlightCards', () => {
  it('does nothing on touch / coarse pointers', () => {
    stubMedia(['(pointer: coarse)']);
    const before = document.body.innerHTML;
    expect(enhanceSpotlightCards(document, {reducedMotion: false})).toEqual([]);
    expect(document.body.innerHTML).toBe(before);
  });

  it('does nothing under reduced motion, even with a fine pointer', () => {
    stubMedia(['(pointer: fine)']);
    const before = document.body.innerHTML;
    expect(enhanceSpotlightCards(document, {reducedMotion: true})).toEqual([]);
    expect(document.body.innerHTML).toBe(before);
  });

  it('with a fine pointer, adds one decorative spotlight to each glass card in #honest, #privacy-promise and #profile only', () => {
    stubMedia(['(pointer: fine)']);
    const snapshot = CARD_SECTIONS.flatMap(cards).map(c => ({el: c, cls: c.className, text: c.textContent}));
    expect(snapshot.length).toBeGreaterThanOrEqual(9);
    enhanceSpotlightCards(document, {reducedMotion: false});
    for (const {el, cls, text} of snapshot) {
      // Same element, same classes (plus the marker), same content, read once.
      expect(el.isConnected).toBe(true);
      expect(el.className).toBe(`${cls} has-spotlight`);
      expect(el.textContent).toBe(text);
      const layers = el.querySelectorAll('.card-spotlight');
      expect(layers).toHaveLength(1);
      expect(layers[0].closest('[aria-hidden="true"]')).not.toBeNull();
    }
    // Cards elsewhere are untouched.
    for (const c of document.querySelectorAll('#how .card')) expect(c.querySelector('.card-spotlight')).toBeNull();
  });

  it('follows the pointer over the card', () => {
    stubMedia(['(pointer: fine)']);
    mounted(() => enhanceSpotlightCards(document, {reducedMotion: false}));
    const card = cards('#honest')[0];
    const layer = card.querySelector<HTMLElement>('.card-spotlight')!;
    act(() => {
      card.dispatchEvent(new MouseEvent('mousemove', {clientX: 40, clientY: 30, bubbles: true}));
    });
    expect(layer.style.getPropertyValue('--mouse-x')).toBe('40px');
    expect(layer.style.getPropertyValue('--mouse-y')).toBe('30px');
    expect(layer.style.getPropertyValue('--spotlight-color')).toMatch(/^rgba\(0, 212, 255, 0\.1\d?\)$/);
  });

  it('unmount restores every card exactly', () => {
    stubMedia(['(pointer: fine)']);
    const before = CARD_SECTIONS.flatMap(cards).map(c => c.outerHTML);
    const unmounts = mounted(() => enhanceSpotlightCards(document, {reducedMotion: false}));
    unmounts.forEach(u => u());
    expect(CARD_SECTIONS.flatMap(cards).map(c => c.outerHTML)).toEqual(before);
  });
});

describe('enhanceHeroCta', () => {
  const heroCta = () => document.querySelector<HTMLAnchorElement>('#hero a[href="#join"]')!;

  it('does nothing under reduced motion', () => {
    const before = document.body.innerHTML;
    expect(enhanceHeroCta(document, {reducedMotion: true})).toBeNull();
    expect(document.body.innerHTML).toBe(before);
  });

  it('adds the star border to the hero CTA only, keeping the same link and name', () => {
    const cta = heroCta();
    const header = document.querySelector<HTMLAnchorElement>('header a[href="./#join"]')!;
    const headerBefore = header.outerHTML;
    enhanceHeroCta(document, {reducedMotion: false});
    expect(heroCta()).toBe(cta); // the very same element
    expect(cta.getAttribute('href')).toBe('#join');
    expect(cta.querySelector('.star-border-container')).not.toBeNull();
    const hero = document.getElementById('hero')!;
    expect(within(hero).getAllByRole('link', {name: 'Join early access'})).toEqual([cta]);
    expect(header.outerHTML).toBe(headerBefore);
    expect(document.querySelectorAll('.star-border-container')).toHaveLength(1);
  });

  it('unmount restores the CTA exactly', () => {
    const before = heroCta().outerHTML;
    enhanceHeroCta(document, {reducedMotion: false})!();
    expect(heroCta().outerHTML).toBe(before);
  });
});

describe('enhanceHeroAurora', () => {
  const hero = () => document.getElementById('hero')!;

  it('is not mounted under reduced motion', () => {
    withWebGL(true);
    stubRaf();
    const before = hero().outerHTML;
    expect(enhanceHeroAurora(hero(), {reducedMotion: true})).toBeNull();
    expect(hero().outerHTML).toBe(before);
    expect(hero().querySelector('canvas')).toBeNull();
  });

  it('is not mounted without WebGL (the CSS gradient stays)', () => {
    withWebGL(false);
    stubRaf();
    const before = hero().outerHTML;
    expect(enhanceHeroAurora(hero(), {reducedMotion: false})).toBeNull();
    expect(hero().outerHTML).toBe(before);
  });

  it('is not mounted on a software WebGL renderer (no GPU: SwiftShader / llvmpipe)', () => {
    const spy = withWebGL(true);
    stubRaf();
    for (const renderer of ['ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device), SwiftShader driver)', 'llvmpipe (LLVM 15.0.7, 256 bits)', 'Microsoft Basic Render Driver']) {
      const gl = {
        getExtension: (name: string) => (name === 'WEBGL_debug_renderer_info' ? {UNMASKED_RENDERER_WEBGL: 0x9246} : null),
        getParameter: (p: number) => (p === 0x9246 ? renderer : ''),
      };
      spy.mockImplementation((() => gl) as never);
      const before = hero().outerHTML;
      expect(enhanceHeroAurora(hero(), {reducedMotion: false}), renderer).toBeNull();
      expect(hero().outerHTML).toBe(before);
    }
  });

  it('mounts a decorative, non-interactive canvas behind the hero', () => {
    withWebGL(true);
    const raf = stubRaf();
    stubMedia([]);
    const unmount = mounted(() => enhanceHeroAurora(hero(), {reducedMotion: false}));
    expect(unmount).toBeTypeOf('function');
    const host = hero().querySelector<HTMLElement>('.hero-aurora')!;
    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.querySelector('canvas')).not.toBeNull();
    raf.tick();
    expect(renders.count).toBeGreaterThan(0);
    act(() => unmount!());
    expect(hero().querySelector('.hero-aurora')).toBeNull();
    expect(raf.pending()).toBe(0);
  });

  it('stops rendering while the hero is off screen, and resumes when it is back', () => {
    withWebGL(true);
    const r2 = stubRaf();
    stubMedia([]);
    let cb: IntersectionObserverCallback = () => {};
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(c: IntersectionObserverCallback) {
          cb = c;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return [];
        }
      },
    );
    mounted(() => enhanceHeroAurora(hero(), {reducedMotion: false}));
    r2.tick();
    expect(r2.pending()).toBe(1);
    const report = (isIntersecting: boolean) =>
      act(() => cb([{isIntersecting, target: hero()} as unknown as IntersectionObserverEntry], {} as IntersectionObserver));
    report(false);
    expect(r2.pending()).toBe(0);
    const n = renders.count;
    r2.tick();
    expect(renders.count).toBe(n);
    report(true);
    expect(r2.pending()).toBe(1);
    r2.tick();
    expect(renders.count).toBe(n + 1);
  });

  it('stops rendering while the tab is hidden', () => {
    withWebGL(true);
    stubManualIntersectionObserver(); // no observer updates outside act()
    const raf = stubRaf();
    stubMedia([]);
    mounted(() => enhanceHeroAurora(hero(), {reducedMotion: false}));
    raf.tick();
    expect(raf.pending()).toBe(1);
    Object.defineProperty(document, 'hidden', {configurable: true, value: true});
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(raf.pending()).toBe(0);
    Object.defineProperty(document, 'hidden', {configurable: true, value: false});
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(raf.pending()).toBe(1);
  });

  it('uses a lighter resolution on narrow screens', () => {
    withWebGL(true);
    stubRaf();
    stubMedia(['(max-width: 640px)']);
    mounted(() => enhanceHeroAurora(hero(), {reducedMotion: false}));
    expect(hero().querySelector('canvas')).not.toBeNull();
    expect(hero().querySelector<HTMLElement>('.hero-aurora')!.dataset.dpr).toBe('0.5');
  });

  it('renders before the first IntersectionObserver report (the hero is on screen at load)', () => {
    withWebGL(true);
    const raf = stubRaf();
    stubMedia([]);
    stubManualIntersectionObserver();
    mounted(() => enhanceHeroAurora(hero(), {reducedMotion: false}));
    raf.tick();
    expect(renders.count).toBeGreaterThan(0);
  });
});
