import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';
import {initSignupForm} from './signup/form';
import {initWave} from './visual/wave';
import {initEnvironmentPicker} from './visual/environments';
import {initReveal} from './visual/reveal';
import {initProfile} from './visual/profile';
import {enhanceEyebrow, enhanceHeadings} from './islands/text';
import {enhanceProfileCounts} from './islands/profile';

const accessKey = import.meta.env.VITE_WEB3FORMS_KEY;
const signupForm = document.getElementById('signup');
if (signupForm instanceof HTMLFormElement) {
  initSignupForm(signupForm, {accessKey});
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const waveSvg = document.getElementById('wave');
const waveToggle = document.getElementById('wave-toggle');
if (waveSvg instanceof SVGSVGElement && waveToggle instanceof HTMLButtonElement) {
  initWave(waveSvg, waveToggle, {reducedMotion});
}

const envPicker = document.getElementById('env-picker');
if (envPicker) initEnvironmentPicker(envPicker);

const profile = document.getElementById('profile');
if (profile) initProfile(profile, {reducedMotion});

// React Bits islands enhance HTML that is already complete; any failure leaves it as authored.
const enhance = (fn: () => unknown) => {
  try {
    fn();
  } catch {
    // Silent by design: the static page is the fallback.
  }
};
if (!reducedMotion) {
  const eyebrow = document.querySelector('#hero .eyebrow');
  if (eyebrow) enhance(() => enhanceEyebrow(eyebrow, {reducedMotion}));
  enhance(() => enhanceHeadings(document, {reducedMotion}));
  if (profile) enhance(() => enhanceProfileCounts(profile, {reducedMotion}));
}

initReveal(document, {reducedMotion});
