// @vitest-environment jsdom
import {readFileSync} from 'node:fs';
import {describe, it, expect, beforeEach} from 'vitest';
import {ENVIRONMENTS, BANDS_HZ, initEnvironmentPicker} from '../../src/visual/environments';

const html = readFileSync('index.html', 'utf8');
const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)![1].replace(/<script[\s\S]*?<\/script>/g, '');

let picker: HTMLElement;
const radios = () => [...picker.querySelectorAll<HTMLElement>('[role=radio]')];
const bars = () => [...document.querySelectorAll<HTMLElement>('#env-chart .env-bar')];
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

  it('click selects one radio, updates description and bar heights', () => {
    radios()[2].click();
    expect(radios().map(r => r.getAttribute('aria-checked'))).toEqual(['false', 'false', 'true', 'false']);
    expect(radios().map(r => r.tabIndex)).toEqual([-1, -1, 0, -1]);
    expect(document.getElementById('env-desc')!.textContent).toBe(ENVIRONMENTS.cafe.description);
    ENVIRONMENTS.cafe.bandOffsetsDb.forEach((o, i) => {
      expect(bars()[i].style.transform).toBe(`scaleY(${(o + 12) / 13})`);
    });
    expect(document.getElementById('env-chart')!.getAttribute('aria-label')).toContain('Café / restaurant');
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
