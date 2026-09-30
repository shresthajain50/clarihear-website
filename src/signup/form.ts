import {validateAll, validateField, type Field, type SignupInput} from './validation';
import {submitSignup} from './submit';

const FIELDS: Field[] = ['name', 'email', 'phone', 'age', 'consent'];
const BUTTON_TEXT = 'Join early access';

export interface FormOptions {
  submit?: typeof submitSignup;
}

export function initSignupForm(form: HTMLFormElement, opts: FormOptions = {}): void {
  const doc = form.ownerDocument;
  const status = doc.getElementById('signup-status');
  const button = form.querySelector<HTMLButtonElement>('#signup-submit');
  const submit = opts.submit ?? submitSignup;

  const el = (f: Field) => form.querySelector<HTMLInputElement>(`#${f}`)!;
  const errEl = (f: Field) => doc.getElementById(`${f}-error`);
  const touched = new Set<Field>();
  const flagged = new Set<Field>();

  const read = (): SignupInput => ({
    name: el('name').value,
    email: el('email').value,
    phone: el('phone').value,
    age: el('age').value,
    consent: el('consent').checked,
  });

  function show(f: Field, message: string | null) {
    const err = errEl(f);
    if (err) err.textContent = message ?? '';
    if (message) {
      el(f).setAttribute('aria-invalid', 'true');
      flagged.add(f);
    } else {
      el(f).removeAttribute('aria-invalid');
      flagged.delete(f);
    }
  }

  for (const f of FIELDS) {
    const input = el(f);
    const live = () => {
      touched.add(f);
      if (flagged.has(f)) show(f, validateField(f, read()));
    };
    input.addEventListener('input', live);
    input.addEventListener('change', live);
    input.addEventListener('blur', () => {
      if (!touched.has(f) && !flagged.has(f)) return;
      show(f, validateField(f, read()));
    });
  }

  let inFlight = false;

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (inFlight) return;
    const result = validateAll(read());
    if (!result.ok) {
      let first: Field | null = null;
      for (const f of FIELDS) {
        const message = result.errors[f] ?? null;
        show(f, message);
        if (message && !first) first = f;
      }
      if (first) el(first).focus();
      return;
    }
    for (const f of FIELDS) show(f, null);

    inFlight = true;
    if (button) {
      button.disabled = true;
      button.textContent = 'Joining…';
    }
    if (status) status.textContent = '';

    const honeypot = form.querySelector<HTMLInputElement>('#botcheck')?.checked ?? false;
    const data = result.value;

    void submit(data, {honeypot})
      .then(res => {
        if (res.ok) {
          const first = data.name.split(/\s+/)[0];
          form.hidden = true;
          if (status) {
            status.textContent = `You're on the list, ${first}. We'll email ${data.email} when early access opens.`;
            status.setAttribute('tabindex', '-1');
            status.focus();
          }
        } else if (status) {
          status.textContent = res.message;
        }
      })
      .catch(() => {
        if (status) status.textContent = 'Something went wrong. Please try again.';
      })
      .finally(() => {
        inFlight = false;
        if (button && !form.hidden) {
          button.disabled = false;
          button.textContent = BUTTON_TEXT;
        }
      });
  });
}
