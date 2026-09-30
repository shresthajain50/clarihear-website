import {useEffect, useRef, useState} from 'react';
import ShinyText from '../react-bits/ShinyText/ShinyText';
import BlurText from '../react-bits/BlurText/BlurText';
import {mountIsland} from './mount';

type Opts = {reducedMotion: boolean};

/**
 * Eyebrow sheen colours. Both ends (and everything between) stay far above 4.5:1 on the
 * hero's dark navy: #00D4FF ≈ 10.4:1 and #B8F3FF ≈ 16:1 on #0A0F1C, and the sweep only
 * ever mixes between them, so contrast never dips below the resting colour's.
 */
const EYEBROW_COLOR = '#00d4ff';
const EYEBROW_SHINE = '#b8f3ff';

/** Runs the sheen only while the eyebrow is on screen, so it costs nothing once scrolled past. */
function Eyebrow({text}: {text: string}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    io.observe(node);
    return () => io.disconnect();
  }, []);
  return (
    <span ref={ref} className="eyebrow-shine">
      <ShinyText
        text={text}
        speed={4}
        delay={5}
        spread={110}
        color={EYEBROW_COLOR}
        shineColor={EYEBROW_SHINE}
        disabled={!visible}
      />
    </span>
  );
}

/** Hero eyebrow → ShinyText with the same copy. */
export function enhanceEyebrow(el: Element, opts: Opts): (() => void) | null {
  const text = el.textContent?.trim();
  if (opts.reducedMotion || !text) return null;
  return mountIsland(el, <Eyebrow text={text} />, opts);
}

/** Calm word-by-word blur: a small rise, no big drop. */
const FROM = {filter: 'blur(8px)', opacity: 0, y: 8};
const TO = [
  {filter: 'blur(3px)', opacity: 0.6, y: 2},
  {filter: 'blur(0px)', opacity: 1, y: 0},
];

/**
 * The heading keeps its element and id; its accessible name comes from the visually hidden
 * original text, and the animated words are aria-hidden, so it is read exactly once.
 */
function Heading({text}: {text: string}) {
  return (
    <>
      <span className="visually-hidden">{text}</span>
      <span aria-hidden="true" className="blur-heading">
        <BlurText
          text={text}
          animateBy="words"
          direction="bottom"
          delay={70}
          stepDuration={0.3}
          threshold={0.2}
          animationFrom={FROM}
          animationTo={TO}
          className="blur-heading__words"
        />
      </span>
    </>
  );
}

/** Every section h2 (never the h1) → BlurText on scroll into view. Returns the unmount functions. */
export function enhanceHeadings(root: ParentNode, opts: Opts): Array<() => void> {
  if (opts.reducedMotion) return [];
  const unmounts: Array<() => void> = [];
  for (const h2 of root.querySelectorAll<HTMLElement>('main section h2')) {
    // Only plain-text headings: anything with markup inside stays exactly as authored.
    if (h2.children.length) continue;
    const text = h2.textContent?.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    try {
      // The blur replaces the generic reveal, so the heading doesn't animate twice.
      const hadReveal = h2.classList.contains('reveal');
      h2.classList.remove('reveal', 'reveal--pending');
      const unmount = mountIsland(h2, <Heading text={text} />, {
        ...opts,
        onFail: () => hadReveal && h2.classList.add('reveal'),
      });
      if (!unmount) {
        if (hadReveal) h2.classList.add('reveal');
        continue;
      }
      unmounts.push(() => {
        unmount();
        if (hadReveal) h2.classList.add('reveal');
      });
    } catch {
      // Leave the heading as authored.
    }
  }
  return unmounts;
}
