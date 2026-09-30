import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';
import {initSignupForm} from './signup/form';
import {initWave} from './visual/wave';
import {initEnvironmentPicker} from './visual/environments';
import {initReveal} from './visual/reveal';
import {initProfile} from './visual/profile';

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

initReveal(document, {reducedMotion});

// React Bits islands: loaded after first paint so the critical path stays the plain HTML + this file.
// Reduced motion → never loaded. Any failure (load or mount) leaves the page as authored.
if (!reducedMotion) {
  const load = () => {
    const done = (state: string) => (document.documentElement.dataset.islands = state);
    import('./islands/index')
      .then(m => {
        m.enhanceAll(document, {reducedMotion});
        done('ready');
      })
      .catch(() => done('failed'));
  };
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(load, {timeout: 2000}) : setTimeout(load, 200));
  if (document.readyState === 'complete') idle();
  else window.addEventListener('load', idle, {once: true});
}
