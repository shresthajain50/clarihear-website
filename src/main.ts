import './styles/tokens.css';
import './styles/base.css';
import './styles/sections.css';
import {initSignupForm} from './signup/form';

const accessKey = import.meta.env.VITE_WEB3FORMS_KEY;
const signupForm = document.getElementById('signup');
if (signupForm instanceof HTMLFormElement) {
  initSignupForm(signupForm, {accessKey});
  if (accessKey && accessKey.trim() && !document.querySelector('script[data-web3forms]')) {
    const s = document.createElement('script');
    s.src = 'https://web3forms.com/client/script.js';
    s.async = true;
    s.defer = true;
    s.dataset.web3forms = '';
    document.head.appendChild(s);
  }
}
