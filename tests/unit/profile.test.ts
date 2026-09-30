// @vitest-environment jsdom
import {readFileSync} from 'node:fs';
import {describe, it, expect, beforeEach} from 'vitest';
import {
  BANDS,
  EXAMPLE_PROFILE,
  EXAMPLE_BOOSTS,
  MAX_GAIN_DB,
  fmtBoost,
  initProfile,
} from '../../src/visual/profile';

const html = readFileSync('index.html', 'utf8');
const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)![1].replace(/<script[\s\S]*?<\/script>/g, '');

const section = () => document.getElementById('profile')!;
const radios = () => [...document.querySelectorAll<HTMLElement>('#boost-mode [role=radio]')];
const values = () => [...document.querySelectorAll<HTMLElement>('#boost-chart .boost-value')].map(v => v.textContent);
const bars = () => [...document.querySelectorAll<HTMLElement>('#boost-chart .boost-bar')];
const scale = (el: HTMLElement) => Number(/scaleY\(([\d.]+)\)/.exec(el.style.transform)![1]);
const key = (el: HTMLElement, k: string) => el.dispatchEvent(new KeyboardEvent('keydown', {key: k, bubbles: true}));

describe('profile data', () => {
  it('uses the six tone-check bands', () => {
    expect(BANDS).toEqual([250, 500, 1000, 2000, 4000, 8000]);
  });

  it('matches the example profile exactly', () => {
    expect(EXAMPLE_PROFILE.left).toEqual([15, 20, 25, 35, 45, 50]);
    expect(EXAMPLE_PROFILE.right).toEqual([15, 20, 30, 40, 50, 55]);
  });

  it('matches the fitting engine boosts exactly', () => {
    expect(EXAMPLE_BOOSTS.everyday).toEqual([0, 0, 6.1, 6.6, 7.7, 8.4]);
    expect(EXAMPLE_BOOSTS.cafe).toEqual([0, 0, 3.1, 6.6, 8.7, 6.4]);
  });

  it('keeps every boost between 0 and the 20 dB ceiling', () => {
    expect(MAX_GAIN_DB).toBe(20);
    for (const g of [...EXAMPLE_BOOSTS.everyday, ...EXAMPLE_BOOSTS.cafe]) {
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThanOrEqual(MAX_GAIN_DB);
    }
  });

  it('formats boosts with a real plus sign and one decimal', () => {
    expect(fmtBoost(6.1)).toBe('+6.1 dB');
    expect(fmtBoost(8)).toBe('+8.0 dB');
    expect(fmtBoost(0)).toBe('0 dB');
    expect(fmtBoost(-3)).toBe('−3.0 dB');
  });
});

describe('initProfile', () => {
  beforeEach(() => {
    document.body.innerHTML = body;
  });

  it('renders the audiogram with both ears and a descriptive label', () => {
    initProfile(section());
    const chart = document.querySelector('#profile-chart svg')!;
    expect(chart).not.toBeNull();
    expect(chart.getAttribute('role')).toBe('img');
    const label = chart.getAttribute('aria-label')!;
    expect(label).toContain('Left ear: 250 Hz 15, 500 Hz 20, 1 kHz 25, 2 kHz 35, 4 kHz 45, 8 kHz 50');
    expect(label).toContain('Right ear: 250 Hz 15, 500 Hz 20, 1 kHz 30, 2 kHz 40, 4 kHz 50, 8 kHz 55');
    expect(chart.querySelectorAll('.ear-left circle')).toHaveLength(6);
    expect(chart.querySelectorAll('.ear-right .cross')).toHaveLength(6);
    const text = chart.textContent!;
    for (const t of ['250', '8k', '0', '60']) expect(text).toContain(t);
  });

  it('draws the downward axis: 0 dB at the top, 60 dB at the bottom', () => {
    initProfile(section());
    const circles = [...document.querySelectorAll<SVGCircleElement>('#profile-chart .ear-left circle')];
    const ys = circles.map(c => Number(c.getAttribute('cy')));
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeGreaterThan(ys[i - 1]);
  });

  it('renders six boost bars, everyday selected', () => {
    initProfile(section());
    expect(bars()).toHaveLength(6);
    expect(values()).toEqual(['0 dB', '0 dB', '+6.1 dB', '+6.6 dB', '+7.7 dB', '+8.4 dB']);
    expect(radios().map(r => r.getAttribute('aria-checked'))).toEqual(['true', 'false']);
    const s = bars().map(scale);
    expect(s[0]).toBe(0);
    expect(s[5]).toBeGreaterThan(s[4]);
    expect(document.getElementById('boost-chart')!.getAttribute('aria-label')).toContain('Everyday');
  });

  it('café toggle switches bars, labels and checked state', () => {
    initProfile(section());
    const before = bars().map(scale);
    radios()[1].click();
    expect(radios().map(r => r.getAttribute('aria-checked'))).toEqual(['false', 'true']);
    expect(radios().map(r => r.tabIndex)).toEqual([-1, 0]);
    expect(values()).toEqual(['0 dB', '0 dB', '+3.1 dB', '+6.6 dB', '+8.7 dB', '+6.4 dB']);
    const after = bars().map(scale);
    expect(after[2]).toBeLessThan(before[2]);
    expect(after[4]).toBeGreaterThan(before[4]);
    expect(document.getElementById('boost-chart')!.getAttribute('aria-label')).toContain('Café');
    for (const b of bars()) expect(b.getAttribute('style')).not.toMatch(/height|top|bottom/);
    radios()[0].click();
    expect(values()[2]).toBe('+6.1 dB');
  });

  it('arrow keys move between Everyday and Café', () => {
    initProfile(section());
    key(radios()[0], 'ArrowRight');
    expect(radios()[1].getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(radios()[1]);
    key(radios()[1], 'ArrowRight');
    expect(radios()[0].getAttribute('aria-checked')).toBe('true');
  });

  it('pulses one pitch dot only when motion is allowed', () => {
    initProfile(section());
    expect(document.querySelectorAll('#profile .pitch-dot.is-pulsing')).toHaveLength(1);
    document.body.innerHTML = body;
    initProfile(section(), {reducedMotion: true});
    expect(document.querySelectorAll('#profile .is-pulsing')).toHaveLength(0);
  });
});
