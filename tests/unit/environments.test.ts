// @vitest-environment jsdom
import {readFileSync} from 'node:fs';
import {describe, it, expect, beforeEach} from 'vitest';
import {ENVIRONMENTS, BANDS_HZ, DB_FULL_DEPTH, initEnvironmentPicker} from '../../src/visual/environments';

const html = readFileSync('index.html', 'utf8');
const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)![1].replace(/<script[\s\S]*?<\/script>/g, '');

let picker: HTMLElement;
const radios = () => [...picker.querySelectorAll<HTMLElement>('[role=radio]')];
const bars = () => [...document.querySelectorAll<HTMLElement>('#env-chart .env-bar')];
const cols = () => [...document.querySelectorAll<HTMLElement>('#env-chart .env-col')];
const values = () => [...document.querySelectorAll<HTMLElement>('#env-chart .env-bar__value')].map(v => v.textContent);
/** Signed bar extent in dB: positive = drawn up from the baseline, negative = down. */
const extent = (bar: HTMLElement) => -Number(/scaleY\((-?[\d.]+)\)/.exec(bar.style.transform)![1]);
const key = (el: HTMLElement, k: string) => el.dispatchEvent(new KeyboardEvent('keydown', {key: k, bubbles: true}));

beforeEach(() => {
  document.body.innerHTML = body;
  picker = document.getElementById('env-picker')!;
  initEnvironmentPicker(picker);
});

describe('environments data', () => {
  it('matches the app profiles exactly', () => {
    expect(BANDS_HZ).toEqual([250, 500, 1000, 2000, 4000, 8000]);
    expect(ENVIRONMENTS.quiet.bandOffsetsDb).toEqual([0, 0, 0, 0, 0, 0]);
    expect(ENVIRONMENTS.office.bandOffsetsDb).toEqual([-3, -2, 0, 0, 0, -1]);
    expect(ENVIRONMENTS.cafe.bandOffsetsDb).toEqual([-8, -6, -3, 0, 1, -2]);
    expect(ENVIRONMENTS.outdoors.bandOffsetsDb).toEqual([-10, -6, -2, 0, 0, -3]);
    expect(ENVIRONMENTS.cafe.label).toBe('Café / restaurant');
    expect(ENVIRONMENTS.outdoors.description).toBe('Streets and parks: traffic and wind are turned down.');
  });
});

describe('environment picker', () => {
  it('renders six bars with labels and role=img chart, quiet selected', () => {
    expect(bars()).toHaveLength(6);
    const chartText = document.getElementById('env-chart')!.textContent!;
    expect(chartText).toContain('250 Hz');
    expect(chartText).toContain('8 kHz');
    const chart = document.getElementById('env-chart')!;
    expect(chart.getAttribute('role')).toBe('img');
    expect(chart.getAttribute('aria-label')).toContain('Quiet home');
    expect(radios().filter(r => r.getAttribute('aria-checked') === 'true')).toHaveLength(1);
  });

  it('click selects one radio, updates description and bar geometry', () => {
    radios()[2].click();
    expect(radios().map(r => r.getAttribute('aria-checked'))).toEqual(['false', 'false', 'true', 'false']);
    expect(radios().map(r => r.tabIndex)).toEqual([-1, -1, 0, -1]);
    expect(document.getElementById('env-desc')!.textContent).toBe(ENVIRONMENTS.cafe.description);
    // Café offsets: [-8, -6, -3, 0, 1, -2]
    const e = bars().map(extent);
    expect(e[0]).toBeLessThan(0); // down from the baseline
    expect(e[4]).toBeGreaterThan(0); // +1 dB goes up
    expect(Math.abs(e[3])).toBe(0); // 0 dB sits on the baseline
    expect(Math.abs(e[0])).toBeGreaterThan(Math.abs(e[1]));
    expect(Math.abs(e[1])).toBeGreaterThan(Math.abs(e[2]));
    expect(Math.abs(e[2])).toBeGreaterThan(Math.abs(e[5]));
    expect(Math.abs(e[5])).toBeGreaterThan(Math.abs(e[4]));
    // Linear in dB.
    ENVIRONMENTS.cafe.bandOffsetsDb.forEach((o, i) => expect(e[i]).toBeCloseTo(o, 5));
    expect(cols().map(c => c.dataset.dir)).toEqual(['down', 'down', 'down', 'flat', 'up', 'down']);
    expect(values()).toEqual(['\u22128 dB', '\u22126 dB', '\u22123 dB', '0 dB', '+1 dB', '\u22122 dB']);
    expect(document.getElementById('env-chart')!.getAttribute('aria-label')).toContain('Café / restaurant');
  });

  it('draws a 0 dB baseline and scales so 12 dB is the full depth', () => {
    expect(DB_FULL_DEPTH).toBe(12);
    expect(document.querySelectorAll('#env-chart .env-baseline')).toHaveLength(1);
    radios()[3].click(); // outdoors: -10 at 250 Hz
    expect(values()[0]).toBe('\u221210 dB');
    expect(bars().map(extent)[0]).toBe(-10);
    radios()[0].click(); // quiet: all zero
    expect(values()).toEqual(Array(6).fill('0 dB'));
    expect(cols().every(c => c.dataset.dir === 'flat')).toBe(true);
  });

  it('animates only transform (edge caps move with translateY)', () => {
    radios()[2].click();
    const caps = [...document.querySelectorAll<HTMLElement>('#env-chart .env-cap')];
    expect(caps).toHaveLength(6);
    for (const c of caps) expect(c.style.transform).toMatch(/^translateY\(-?[\d.]+px\)$/);
    for (const el of [...bars(), ...caps]) expect(el.getAttribute('style')).not.toMatch(/height|top|bottom/);
  });

  it('arrow keys move selection with wrapping, Home/End jump, focus follows', () => {
    const r = radios();
    key(r[0], 'ArrowLeft');
    expect(r[3].getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(r[3]);
    key(r[3], 'ArrowRight');
    expect(r[0].getAttribute('aria-checked')).toBe('true');
    key(r[0], 'ArrowDown');
    expect(r[1].getAttribute('aria-checked')).toBe('true');
    key(r[1], 'ArrowUp');
    expect(r[0].getAttribute('aria-checked')).toBe('true');
    key(r[0], 'End');
    expect(r[3].getAttribute('aria-checked')).toBe('true');
    key(r[3], 'Home');
    expect(r[0].getAttribute('aria-checked')).toBe('true');
    expect(r.map(x => x.tabIndex)).toEqual([0, -1, -1, -1]);
  });
});
