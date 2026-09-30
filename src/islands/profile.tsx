import {useRef, useSyncExternalStore} from 'react';
import {useInView} from 'motion/react';
import CountUp from '../react-bits/CountUp/CountUp';
import {
  BOOST_CHANGE_EVENT,
  EXAMPLE_BOOSTS,
  fmtBoost,
  renderBoostValue,
  type BoostChangeDetail,
  type BoostMode,
} from '../visual/profile';
import {mountIsland} from './mount';

type ModeStore = {
  get: () => BoostMode;
  set: (mode: BoostMode) => void;
  subscribe: (listener: () => void) => () => void;
};

function createModeStore(initial: BoostMode): ModeStore {
  let mode = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => mode,
    set: next => {
      if (next === mode) return;
      mode = next;
      listeners.forEach(l => l());
    },
    subscribe: l => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

const decimals = (n: number) => (Number.isInteger(n) ? 0 : String(n).split('.')[1]?.length ?? 0);

/**
 * CountUp formats with the larger decimal count of from/to, so it only reproduces the real
 * label ("+6.1") when the target has exactly one decimal and the start has at most one.
 * Anything else (0, whole numbers, negatives) is shown statically, exactly as profile.ts would.
 */
const canCount = (from: number, to: number) => to > 0 && decimals(to) === 1 && decimals(from) <= 1 && from >= 0;

/** The number currently on screen, so a change mid-count continues from where it is (no jump). */
function shownValue(el: HTMLElement | null): number | null {
  const text = el?.textContent?.replace('+', '').replace('−', '-').trim();
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function BoostValue({index, store, duration}: {index: number; store: ModeStore; duration: number}) {
  const mode = useSyncExternalStore(store.subscribe, store.get);
  const to = EXAMPLE_BOOSTS[mode][index];
  const ref = useRef<HTMLSpanElement>(null);
  // Until the chart is seen, the labels are the real values (never a stale zero off screen).
  const seen = useInView(ref, {once: true});
  // Intentionally impure render: the refs below are read and written during render so the start
  // value is decided in the same pass as the new target (a toggle mid-count continues from the
  // number on screen). It is idempotent for a given (seen, to), so a repeated render is harmless.
  const lastTo = useRef<number | null>(null);
  const from = useRef(0); // first view counts up from zero
  if (!seen) {
    lastTo.current = null;
  } else if (lastTo.current !== to) {
    if (lastTo.current !== null) from.current = shownValue(ref.current) ?? lastTo.current;
    lastTo.current = to;
  }
  const [num] = fmtBoost(to).split(' ');
  return (
    <>
      <span ref={ref} className="boost-num">
        {seen && canCount(from.current, to) ? (
          <>
            +<CountUp from={from.current} to={to} duration={duration} />
          </>
        ) : (
          num
        )}
      </span>
      <span className="u"> dB</span>
    </>
  );
}

/**
 * The #profile boost labels → CountUp: from 0 on first view, then from the current to the new
 * value on each Everyday/Café change. Labels always settle on the exact profile.ts text.
 */
export function enhanceProfileCounts(
  root: HTMLElement,
  opts: {reducedMotion: boolean; duration?: number},
): (() => void) | null {
  if (opts.reducedMotion) return null;
  const chart = root.querySelector<HTMLElement>('#boost-chart');
  const els = chart ? [...chart.querySelectorAll<HTMLElement>('.boost-value')] : [];
  if (!chart || !els.length) return null;

  const currentMode = (): BoostMode => {
    const m = chart.dataset.mode;
    return m && m in EXAMPLE_BOOSTS ? (m as BoostMode) : 'everyday';
  };
  const store = createModeStore(currentMode());
  const onChange = (e: Event) => {
    e.preventDefault(); // we render the labels
    store.set((e as CustomEvent<BoostChangeDetail>).detail.mode);
  };

  const unmounts: Array<() => void> = [];
  let done = false;
  const teardown = () => {
    if (done) return;
    done = true;
    root.removeEventListener(BOOST_CHANGE_EVENT, onChange);
    unmounts.forEach(u => u());
    // Hand the labels back to the static renderer, showing the current mode.
    const gains = EXAMPLE_BOOSTS[currentMode()];
    els.forEach((el, i) => renderBoostValue(el, gains[i]));
  };

  root.addEventListener(BOOST_CHANGE_EVENT, onChange);
  try {
    els.forEach((el, index) => {
      const u = mountIsland(el, <BoostValue index={index} store={store} duration={opts.duration ?? 1.2} />, {
        reducedMotion: false,
        onFail: teardown,
      });
      if (u) unmounts.push(u);
    });
  } catch {
    teardown();
    return null;
  }
  return teardown;
}
