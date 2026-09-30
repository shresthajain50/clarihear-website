// @vitest-environment jsdom
import {describe, it, expect, beforeEach, vi} from 'vitest';
import {screen, waitFor} from '@testing-library/react';
import {enhanceEyebrow, enhanceHeadings} from '../../../src/islands/text';
import {indexBody, stubVisibleIntersectionObserver} from './helpers';

const EYEBROW = 'Coming soon to iPhone and Android';
const H2S = [
  "What ClariHear is, and isn't",
  'How it works',
  'Your hearing profile',
  'Made for everyday moments',
  'Real places',
  'Safety and privacy',
  'Questions',
  'Join early access',
];

beforeEach(() => {
  vi.unstubAllGlobals();
  stubVisibleIntersectionObserver();
  document.body.innerHTML = indexBody;
});

const eyebrow = () => document.querySelector<HTMLElement>('#hero .eyebrow')!;

describe('enhanceEyebrow', () => {
  it('does nothing under reduced motion', () => {
    const before = eyebrow().outerHTML;
    expect(enhanceEyebrow(eyebrow(), {reducedMotion: true})).toBeNull();
    expect(eyebrow().outerHTML).toBe(before);
  });

  it('adds the sheen and keeps the exact copy, read once', () => {
    const unmount = enhanceEyebrow(eyebrow(), {reducedMotion: false});
    expect(unmount).toBeTypeOf('function');
    expect(eyebrow().querySelector('.shiny-text')).not.toBeNull();
    expect(eyebrow().textContent).toBe(EYEBROW);
    expect(eyebrow().tagName).toBe('P');
    expect(eyebrow().classList.contains('eyebrow')).toBe(true);
  });
});

describe('enhanceHeadings', () => {
  it('is a no-op under reduced motion', () => {
    const before = document.body.innerHTML;
    expect(enhanceHeadings(document, {reducedMotion: true})).toEqual([]);
    expect(document.body.innerHTML).toBe(before);
  });

  it('animates every section h2 word by word, never the h1', () => {
    const h1Before = document.querySelector('h1')!.outerHTML;
    const ids = [...document.querySelectorAll('main section h2')].map(h => h.id);
    const unmounts = enhanceHeadings(document, {reducedMotion: false});
    expect(unmounts).toHaveLength(H2S.length);
    expect(document.querySelector('h1')!.outerHTML).toBe(h1Before);
    // Same heading elements, same ids.
    expect([...document.querySelectorAll('main section h2')].map(h => h.id)).toEqual(ids);
    for (const h2 of document.querySelectorAll<HTMLElement>('main section h2')) {
      const animated = h2.querySelector('[aria-hidden="true"]')!;
      expect(animated).not.toBeNull();
      // One animated span per word.
      const words = h2.querySelector('.visually-hidden')!.textContent!.split(' ');
      expect(animated.querySelectorAll(':scope > span > span')).toHaveLength(words.length);
      // The static reveal is replaced by the blur, so the heading doesn't animate twice.
      expect(h2.classList.contains('reveal')).toBe(false);
    }
  });

  it('keeps each heading accessible name identical and not duplicated', () => {
    enhanceHeadings(document, {reducedMotion: false});
    for (const name of H2S) {
      expect(screen.getAllByRole('heading', {level: 2, name})).toHaveLength(1);
    }
    expect(screen.getAllByRole('heading', {level: 1, name: 'Hear the conversation again.'})).toHaveLength(1);
  });

  it('reveals the words once the heading is in view', async () => {
    enhanceHeadings(document, {reducedMotion: false});
    const firstWord = document.querySelector<HTMLElement>('#how-title [aria-hidden="true"] span span')!;
    await waitFor(() => expect(Number(firstWord.style.opacity)).toBe(1), {timeout: 4000});
  });

  it('unmount restores the original heading', () => {
    const before = document.getElementById('how-title')!.outerHTML;
    const unmounts = enhanceHeadings(document, {reducedMotion: false});
    unmounts.forEach(u => u());
    expect(document.getElementById('how-title')!.outerHTML).toBe(before);
  });
});
