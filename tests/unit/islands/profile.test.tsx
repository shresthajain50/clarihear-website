// @vitest-environment jsdom
import {describe, it, expect, beforeEach, vi} from 'vitest';
import {waitFor} from '@testing-library/react';
// Islands run on preact/compat: its act flushes preact's effects (RTL's act targets React).
import {act} from 'preact/test-utils';
import {initProfile, EXAMPLE_BOOSTS, fmtBoost} from '../../../src/visual/profile';
import {enhanceProfileCounts} from '../../../src/islands/profile';
import {indexBody, stubManualIntersectionObserver, stubVisibleIntersectionObserver} from './helpers';

const section = () => document.getElementById('profile')!;
const radios = () => [...document.querySelectorAll<HTMLElement>('#boost-mode [role=radio]')];
const values = () => [...document.querySelectorAll<HTMLElement>('#boost-chart .boost-value')].map(v => v.textContent);
const EVERYDAY = EXAMPLE_BOOSTS.everyday.map(fmtBoost);
const CAFE = EXAMPLE_BOOSTS.cafe.map(fmtBoost);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
/** Equal to the expected labels, and still equal a while later (no count still to come). */
const settle = async (expected: string[]) => {
  await waitFor(() => expect(values()).toEqual(expected), {timeout: 8000, interval: 50});
  await sleep(700);
  expect(values()).toEqual(expected);
};

beforeEach(() => {
  vi.unstubAllGlobals();
  stubVisibleIntersectionObserver();
  document.body.innerHTML = indexBody;
  initProfile(section());
});

describe('enhanceProfileCounts', () => {
  it('real labels are exactly what profile.ts renders', () => {
    expect(EVERYDAY).toEqual(['0 dB', '0 dB', '+6.1 dB', '+6.6 dB', '+7.7 dB', '+8.4 dB']);
    expect(CAFE).toEqual(['0 dB', '0 dB', '+3.1 dB', '+6.6 dB', '+8.7 dB', '+6.4 dB']);
  });

  it('does nothing under reduced motion', () => {
    const before = section().innerHTML;
    expect(enhanceProfileCounts(section(), {reducedMotion: true})).toBeNull();
    expect(section().innerHTML).toBe(before);
    radios()[1].click();
    expect(values()).toEqual(CAFE);
  });

  it('shows the real labels until seen, then counts up from zero to the exact Everyday labels', async () => {
    vi.unstubAllGlobals();
    const io = stubManualIntersectionObserver();
    enhanceProfileCounts(section(), {reducedMotion: false, duration: 0.3});
    // Not yet on screen: the labels are already the real values, never a stale zero.
    await new Promise(r => setTimeout(r, 50));
    expect(values()).toEqual(EVERYDAY);
    // Toggling before it is seen keeps them exact too.
    radios()[1].click();
    await new Promise(r => setTimeout(r, 50));
    expect(values()).toEqual(CAFE);
    radios()[0].click();
    await new Promise(r => setTimeout(r, 50));
    expect(values()).toEqual(EVERYDAY);
    // First view: the count starts from zero (unit kept, so labels read "… dB")…
    await act(async () => io.showAll());
    await act(async () => io.showAll()); // CountUp's own observer, created on first view
    expect(values()[2]).toMatch(/^\+?0(\.0)? dB$/);
    // …and settles on the exact values.
    await settle(EVERYDAY);
    // Number on top, unit in its own span, as the static renderer does.
    for (const v of document.querySelectorAll('#boost-chart .boost-value')) {
      expect(v.querySelector('.u')?.textContent).toBe(' dB');
    }
  }, 15000);

  it('animates to the exact Café labels on toggle, and back', async () => {
    enhanceProfileCounts(section(), {reducedMotion: false, duration: 0.3});
    await sleep(20);
    await settle(EVERYDAY);
    radios()[1].click();
    expect(radios()[1].getAttribute('aria-checked')).toBe('true');
    await settle(CAFE);
    radios()[0].click();
    await settle(EVERYDAY);
  }, 20000);

  it('ends on the exact labels after rapid Café → Everyday → Café toggling', async () => {
    enhanceProfileCounts(section(), {reducedMotion: false, duration: 0.3});
    await sleep(20); // on screen: the first count is running
    radios()[1].click();
    radios()[0].click();
    radios()[1].click();
    await settle(CAFE);
    await new Promise(r => setTimeout(r, 600));
    expect(values()).toEqual(CAFE);
    radios()[0].click();
    await new Promise(r => setTimeout(r, 30));
    radios()[1].click();
    await new Promise(r => setTimeout(r, 30));
    radios()[0].click();
    await settle(EVERYDAY);
    await new Promise(r => setTimeout(r, 600));
    expect(values()).toEqual(EVERYDAY);
    // Settled, then there-and-back before a single frame: must not stick on the Café numbers.
    radios()[1].click();
    radios()[0].click();
    await new Promise(r => setTimeout(r, 1500));
    expect(values()).toEqual(EVERYDAY);
    // Same, with the two renders landing in separate tasks.
    radios()[1].click();
    await Promise.resolve();
    await new Promise(r => setTimeout(r, 0));
    radios()[0].click();
    await new Promise(r => setTimeout(r, 1500));
    expect(values()).toEqual(EVERYDAY);
  }, 30000);

  it('unmount hands the labels back to the static renderer', async () => {
    const unmount = enhanceProfileCounts(section(), {reducedMotion: false, duration: 0.3})!;
    unmount();
    expect(values()).toEqual(EVERYDAY);
    radios()[1].click();
    expect(values()).toEqual(CAFE);
  });
});
