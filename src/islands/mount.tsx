import type {ReactNode} from 'react';
import {LazyMotion, domAnimation} from 'motion/react';
import {flushSync} from 'react-dom';
import {createRoot} from 'react-dom/client';

export type IslandOptions = {
  reducedMotion: boolean;
  /** Called once if the island throws; the original HTML has been put back by then. */
  onFail?: () => void;
};

/**
 * Renders a React island into an existing element, enhancing HTML that is already readable.
 * - Reduced motion: does nothing and returns null (the original HTML stays as is).
 * - The island throws (now or later): the original children are restored, silently.
 * - The returned function unmounts the island and restores the original children.
 */
export function mountIsland(el: Element, node: ReactNode, opts: IslandOptions): (() => void) | null {
  if (opts.reducedMotion) return null;

  const original = [...el.childNodes];
  let active = true;

  const restore = () => {
    if (!active) return false;
    active = false;
    root.unmount();
    el.replaceChildren(...original);
    return true;
  };

  const silent = () => {};
  const root = createRoot(el, {
    // Never log to the console in production; a failed island just falls back to the HTML.
    onUncaughtError: () => {
      queueMicrotask(() => {
        if (restore()) opts.onFail?.();
      });
    },
    onCaughtError: silent,
    onRecoverableError: silent,
  });

  // Vendored components use the lightweight `m` component; supply only the DOM animation features.
  flushSync(() =>
    root.render(
      <LazyMotion features={domAnimation} strict>
        {node}
      </LazyMotion>,
    ),
  );
  return () => {
    restore();
  };
}
