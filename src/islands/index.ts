import {enhanceEyebrow, enhanceHeadings} from './text';
import {enhanceProfileCounts} from './profile';
import {enhanceHeroAurora, enhanceHeroCta, enhanceSpotlightCards} from './surfaces';

// React Bits islands enhance HTML that is already complete; any failure leaves it as authored.
const enhance = (fn: () => unknown) => {
  try {
    fn();
  } catch {
    // Silent by design: the static page is the fallback.
  }
};

/** Mounts every island. Loaded lazily from main.ts after first paint, only when motion is allowed. */
export function enhanceAll(doc: Document, opts: {reducedMotion: boolean}): void {
  if (opts.reducedMotion) return;
  const eyebrow = doc.querySelector('#hero .eyebrow');
  if (eyebrow) enhance(() => enhanceEyebrow(eyebrow, opts));
  enhance(() => enhanceHeadings(doc, opts));
  const profile = doc.getElementById('profile');
  if (profile) enhance(() => enhanceProfileCounts(profile, opts));
  enhance(() => enhanceSpotlightCards(doc, opts)); // fine pointers only
  enhance(() => enhanceHeroCta(doc, opts));
  const hero = doc.getElementById('hero');
  if (hero) enhance(() => enhanceHeroAurora(hero, opts)); // WebGL only; pauses off screen / hidden tab
}
