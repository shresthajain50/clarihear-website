// @vitest-environment jsdom
import {describe, it, expect, vi, beforeEach} from 'vitest';
import {initReveal} from '../../src/visual/reveal';

let callback: IntersectionObserverCallback;
const observe = vi.fn();
const unobserve = vi.fn();

beforeEach(() => {
  vi.unstubAllGlobals();
  observe.mockClear();
  unobserve.mockClear();
  document.body.innerHTML =
    '<div id="hero"><h1 class="reveal" id="h">Hi</h1></div><p class="reveal" id="a">A</p><p class="reveal" id="b">B</p>';
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: IntersectionObserverCallback) {
        callback = cb;
      }
      observe = observe;
      unobserve = unobserve;
      disconnect() {}
    },
  );
});

describe('initReveal', () => {
  it('does nothing with reduced motion', () => {
    initReveal(document, {reducedMotion: true});
    expect(document.querySelectorAll('.reveal--pending')).toHaveLength(0);
  });

  it('marks non-hero elements pending and clears on intersect', () => {
    initReveal(document);
    expect(document.getElementById('h')!.classList.contains('reveal--pending')).toBe(false);
    const a = document.getElementById('a')!;
    expect(a.classList.contains('reveal--pending')).toBe(true);
    callback([{isIntersecting: true, target: a} as unknown as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(a.classList.contains('reveal--pending')).toBe(false);
    expect(unobserve).toHaveBeenCalledWith(a);
    expect(document.getElementById('b')!.classList.contains('reveal--pending')).toBe(true);
  });

  it('leaves content visible without IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    initReveal(document);
    expect(document.querySelectorAll('.reveal--pending')).toHaveLength(0);
  });
});
