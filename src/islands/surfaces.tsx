import {useEffect, useState} from 'react';
import SpotlightCard from '../react-bits/SpotlightCard/SpotlightCard';
import StarBorder from '../react-bits/StarBorder/StarBorder';
import SoftAurora from '../react-bits/SoftAurora/SoftAurora';
import {mountIsland} from './mount';

type Opts = {reducedMotion: boolean};

const matches = (query: string) => typeof window.matchMedia === 'function' && window.matchMedia(query).matches;

/* ---------- SpotlightCard: glass cards, fine pointers only ---------- */

/** A faint teal glow that follows the pointer; the card's text stays on top of it. */
const SPOTLIGHT_COLOR = 'rgba(0, 212, 255, 0.12)';
const SPOTLIGHT_CARDS = '#honest .card, #privacy-promise .card, #profile .card';

/**
 * Adds a decorative spotlight layer to the glass cards in #honest, #privacy-promise and #profile.
 * The card keeps its element, classes and content; only an aria-hidden layer is added behind the
 * content. Touch / coarse pointers get nothing (there is no hover to follow).
 */
export function enhanceSpotlightCards(root: ParentNode, opts: Opts): Array<() => void> {
  if (opts.reducedMotion || !matches('(pointer: fine)')) return [];
  const unmounts: Array<() => void> = [];
  for (const card of root.querySelectorAll<HTMLElement>(SPOTLIGHT_CARDS)) {
    const host = document.createElement('span');
    host.className = 'spotlight-host';
    host.setAttribute('aria-hidden', 'true');
    const cleanup = () => {
      host.remove();
      card.classList.remove('has-spotlight');
    };
    try {
      card.prepend(host);
      card.classList.add('has-spotlight');
      const unmount = mountIsland(host, <SpotlightCard target={card} spotlightColor={SPOTLIGHT_COLOR} />, {
        ...opts,
        onFail: cleanup,
      });
      if (!unmount) {
        cleanup();
        continue;
      }
      unmounts.push(() => {
        unmount();
        cleanup();
      });
    } catch {
      cleanup();
    }
  }
  return unmounts;
}

/* ---------- StarBorder: the hero "Join early access" CTA only ---------- */

/**
 * The hero CTA keeps its element (the same <a href="#join">), classes, focus ring and 44px target;
 * its text is wrapped in StarBorder's spans, so the accessible name is unchanged.
 */
export function enhanceHeroCta(root: ParentNode, opts: Opts): (() => void) | null {
  if (opts.reducedMotion) return null;
  const cta = root.querySelector<HTMLAnchorElement>('#hero .hero-actions a[href="#join"]');
  const text = cta?.textContent?.trim();
  if (!cta || !text) return null;
  cta.classList.add('btn--star');
  const drop = () => cta.classList.remove('btn--star');
  const unmount = mountIsland(
    cta,
    <StarBorder
      as="span"
      color="#b8f3ff"
      speed="8s"
      thickness={2}
      backgroundColor="var(--c-primary)"
      textColor="var(--c-bg0)"
      borderColor="transparent"
    >
      {text}
    </StarBorder>,
    {...opts, onFail: drop},
  );
  if (!unmount) {
    drop();
    return null;
  }
  return () => {
    unmount();
    drop();
  };
}

/* ---------- SoftAurora: decorative WebGL behind the hero ---------- */

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render/i;

/** A hardware WebGL context is available. */
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return false;
    // No GPU (software rasteriser): the shader would load the CPU and stall the page, so keep
    // the CSS gradient instead.
    const info = gl.getExtension?.('WEBGL_debug_renderer_info') as {UNMASKED_RENDERER_WEBGL: number} | null;
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    gl.getExtension?.('WEBGL_lose_context')?.loseContext(); // only a probe; free it straight away
    return !SOFTWARE_RENDERER.test(renderer);
  } catch {
    return false;
  }
}

/** Renders only while the hero is on screen and the tab is visible. */
function HeroAurora({hero, narrow}: {hero: HTMLElement; narrow: boolean}) {
  const [onScreen, setOnScreen] = useState(true);
  const [hidden, setHidden] = useState(() => document.hidden);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    io.observe(hero);
    return () => io.disconnect();
  }, [hero]);
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
  // Brand colours (teal, violet) over the hero's navy; slow and faint so it never competes with the copy.
  return (
    <SoftAurora
      color1="#00d4ff"
      color2="#7b61ff"
      speed={0.25}
      scale={1.4}
      brightness={0.55}
      // The band sits beside the copy on wide screens; on narrow ones (copy stacked above the photo)
      // it sits low, behind the photo card, so the lead text keeps AA contrast.
      bandHeight={narrow ? 0.3 : 0.62}
      bandSpread={1}
      colorSpeed={0.5}
      enableMouseInteraction={false}
      paused={!onScreen || hidden}
      dpr={narrow ? 0.5 : 1}
    />
  );
}

/**
 * Mounts the aurora canvas behind the hero copy. Not mounted under reduced motion or without
 * WebGL (the CSS gradient stays). Small screens draw at half resolution: the aurora is soft,
 * so it looks the same at a quarter of the pixels.
 */
export function enhanceHeroAurora(hero: HTMLElement, opts: Opts): (() => void) | null {
  if (opts.reducedMotion || !hasWebGL()) return null;
  const narrow = matches('(max-width: 640px)');
  const host = document.createElement('div');
  host.className = 'hero-aurora';
  host.setAttribute('aria-hidden', 'true');
  host.dataset.dpr = narrow ? '0.5' : '1';
  hero.prepend(host);
  const unmount = mountIsland(host, <HeroAurora hero={hero} narrow={narrow} />, {...opts, onFail: () => host.remove()});
  if (!unmount) {
    host.remove();
    return null;
  }
  return () => {
    unmount();
    host.remove();
  };
}
