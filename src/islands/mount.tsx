import {Component, type ReactNode} from 'react';
import {LazyMotion, domAnimation} from 'motion/react';
import {flushSync} from 'react-dom';
import {createRoot} from 'react-dom/client';

export type IslandOptions = {
  reducedMotion: boolean;
  /** Called once if the island throws; the original HTML has been put back by then. */
  onFail?: () => void;
};

/**
 * Catches render and effect errors from the island. `react`/`react-dom` resolve to
 * preact/compat (see vite.config.ts), which has no root-level error callbacks, so an error
 * boundary is the one mechanism that works on both preact and React.
 */
class IslandBoundary extends Component<{onError: () => void; children: ReactNode}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() {
    return {failed: true};
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

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
    try {
      root.unmount();
    } catch {
      // Unmounting a failed tree must not stop the restore.
    }
    el.replaceChildren(...original);
    return true;
  };
  const fail = () =>
    queueMicrotask(() => {
      if (restore()) opts.onFail?.();
    });

  const silent = () => {};
  const root = createRoot(el, {
    // React only (preact ignores these): never log to the console; the boundary handles it.
    onUncaughtError: fail,
    onCaughtError: silent,
    onRecoverableError: silent,
  });

  try {
    // Vendored components use the lightweight `m` component; supply only the DOM animation features.
    flushSync(() =>
      root.render(
        <IslandBoundary onError={fail}>
          <LazyMotion features={domAnimation} strict>
            {node}
          </LazyMotion>
        </IslandBoundary>,
      ),
    );
  } catch {
    fail();
  }
  return () => {
    restore();
  };
}
