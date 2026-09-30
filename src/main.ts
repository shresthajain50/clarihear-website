import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';
import {initSignupForm} from './signup/form';
import {initWave} from './visual/wave';
import {initEnvironmentPicker} from './visual/environments';
import {initReveal} from './visual/reveal';
import {initProfile} from './visual/profile';

const signupForm = document.getElementById('signup');
if (signupForm instanceof HTMLFormElement) {
  initSignupForm(signupForm);
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
