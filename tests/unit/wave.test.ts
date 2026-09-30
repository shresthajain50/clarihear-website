// @vitest-environment jsdom
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {wavePath, initWave} from '../../src/visual/wave';

function ys(d: string): number[] {
  return [...d.matchAll(/[ML]\s*[-\d.]+,([-\d.]+)/g)].map(m => Number(m[1]));
}
const maxDev = (clarity: number) => {
  const clean = ys(wavePath(1.3, 1, 800, 160, 80));
  const cur = ys(wavePath(1.3, clarity, 800, 160, 80));
  return Math.max(...cur.map((y, i) => Math.abs(y - clean[i])));
};

describe('wavePath', () => {
  it('starts with M0, and has points+1 segments', () => {
    const d = wavePath(0, 0.5, 800, 160, 40);
    expect(d.startsWith('M0,')).toBe(true);
    expect(d.match(/[ML]/g)).toHaveLength(41);
  });
  it('is deterministic', () => {
    expect(wavePath(2.2, 0.3, 800, 160)).toBe(wavePath(2.2, 0.3, 800, 160));
  });
  it('noise shrinks as clarity approaches 1', () => {
    expect(maxDev(0)).toBeGreaterThan(maxDev(0.5));
    expect(maxDev(0.5)).toBeGreaterThan(maxDev(0.95));
    expect(maxDev(1)).toBe(0);
  });
});

function setup() {
  document.body.innerHTML =
    '<section id="hero"><svg id="wave"><path d="M0 0"/></svg><button id="t">Pause animation</button></section>';
  return {
    svg: document.getElementById('wave') as unknown as SVGSVGElement,
    btn: document.getElementById('t') as HTMLButtonElement,
  };
}

describe('initWave', () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it('reduced motion hides the (useless) toggle', () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn());
    const {svg, btn} = setup();
    initWave(svg, btn, {reducedMotion: true}).destroy();
    expect(btn.hidden).toBe(true);
  });

  it('reduced motion draws once and never requests a frame', () => {
    const raf = vi.fn();
    vi.stubGlobal('requestAnimationFrame', raf);
    const {svg, btn} = setup();
    const before = svg.querySelector('path')!.getAttribute('d');
    const w = initWave(svg, btn, {reducedMotion: true});
    expect(svg.querySelector('path')!.getAttribute('d')).not.toBe(before);
    expect(raf).not.toHaveBeenCalled();
    w.destroy();
  });

  it('toggle switches the visible label (no aria-pressed), and loop stops/starts', () => {
    const raf = vi.fn(() => 1);
    const caf = vi.fn();
    vi.stubGlobal('requestAnimationFrame', raf);
    vi.stubGlobal('cancelAnimationFrame', caf);
    const {svg, btn} = setup();
    const w = initWave(svg, btn);
    expect(raf).toHaveBeenCalled();
    btn.click();
    expect(btn.hasAttribute('aria-pressed')).toBe(false);
    expect(btn.textContent).toBe('Play animation');
    expect(caf).toHaveBeenCalled();
    const n = raf.mock.calls.length;
    btn.click();
    expect(btn.hasAttribute('aria-pressed')).toBe(false);
    expect(btn.textContent).toBe('Pause animation');
    expect(raf.mock.calls.length).toBeGreaterThan(n);
    w.destroy();
  });
});
