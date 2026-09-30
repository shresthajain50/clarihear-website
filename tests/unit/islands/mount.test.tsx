// @vitest-environment jsdom
import {describe, it, expect, beforeEach, vi, afterEach} from 'vitest';
import {mountIsland} from '../../../src/islands/mount';

const ORIGINAL = '<span class="orig">Original <b>content</b></span>';

function Boom(): never {
  throw new Error('island failed');
}

describe('mountIsland', () => {
  let host: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = `<div id="host">${ORIGINAL}</div>`;
    host = document.getElementById('host')!;
  });
  afterEach(() => vi.restoreAllMocks());

  it('returns null and leaves the DOM untouched under reduced motion', () => {
    const before = document.body.innerHTML;
    expect(mountIsland(host, <em>animated</em>, {reducedMotion: true})).toBeNull();
    expect(document.body.innerHTML).toBe(before);
  });

  it('mounts the node synchronously when motion is allowed', () => {
    const unmount = mountIsland(host, <em className="island">animated</em>, {reducedMotion: false});
    expect(typeof unmount).toBe('function');
    expect(host.querySelector('em.island')?.textContent).toBe('animated');
    expect(host.querySelector('.orig')).toBeNull();
  });

  it('unmount cleans up and restores the original HTML', () => {
    const unmount = mountIsland(host, <em className="island">animated</em>, {reducedMotion: false})!;
    unmount();
    expect(host.innerHTML).toBe(ORIGINAL);
    expect(host.querySelector('em.island')).toBeNull();
    unmount(); // idempotent
    expect(host.innerHTML).toBe(ORIGINAL);
  });

  it('keeps the original HTML when the island throws, and logs nothing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onFail = vi.fn();
    mountIsland(host, <Boom />, {reducedMotion: false, onFail});
    await new Promise(r => setTimeout(r, 0));
    expect(host.innerHTML).toBe(ORIGINAL);
    expect(onFail).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
