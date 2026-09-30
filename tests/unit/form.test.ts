// @vitest-environment jsdom
import {readFileSync} from 'node:fs';
import {describe, it, expect, beforeEach, vi} from 'vitest';
import {initSignupForm} from '../../src/signup/form';

const html = readFileSync('index.html', 'utf8');
const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)![1].replace(/<script[\s\S]*?<\/script>/g, '');

let form: HTMLFormElement;
const $ = <T extends HTMLElement = HTMLInputElement>(id: string) => document.getElementById(id) as T;

function type(id: string, value: string) {
  const el = $(id);
  el.value = value;
  el.dispatchEvent(new Event('input', {bubbles: true}));
}
function blur(id: string) {
  $(id).dispatchEvent(new Event('blur'));
}
function fillValid() {
  type('name', 'Zoë Carter');
  type('email', 'zoe@example.com');
  type('phone', '+91 98765 43210');
  type('age', '34');
  $('consent').checked = true;
  $('consent').dispatchEvent(new Event('change', {bubbles: true}));
}
const submitEvent = () => form.dispatchEvent(new Event('submit', {cancelable: true, bubbles: true}));
const flush = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => {
  document.body.innerHTML = body;
  form = $('signup') as unknown as HTMLFormElement;
});

describe('form controller', () => {
  it('blur on emptied name shows error and aria-invalid; typing valid clears it', () => {
    initSignupForm(form, {accessKey: 'k', submit: vi.fn()});
    type('name', 'x');
    type('name', '');
    blur('name');
    expect($('name-error').textContent).not.toBe('');
    expect($('name').getAttribute('aria-invalid')).toBe('true');
    type('name', 'Zoë Carter');
    expect($('name-error').textContent).toBe('');
    expect($('name').hasAttribute('aria-invalid')).toBe(false);
  });

  it('does not flag an untouched empty field on blur', () => {
    initSignupForm(form, {accessKey: 'k', submit: vi.fn()});
    blur('name');
    expect($('name-error').textContent).toBe('');
    expect($('name').hasAttribute('aria-invalid')).toBe(false);
  });

  it('keeps hint ids in aria-describedby', () => {
    initSignupForm(form, {accessKey: 'k', submit: vi.fn()});
    type('phone', 'x');
    blur('phone');
    expect($('phone').getAttribute('aria-describedby')).toBe('phone-hint phone-error');
  });

  it('submit with errors shows all, focuses first invalid, does not submit', () => {
    const submit = vi.fn();
    initSignupForm(form, {accessKey: 'k', submit});
    type('name', 'Zoë Carter');
    submitEvent();
    expect(submit).not.toHaveBeenCalled();
    expect($('email-error').textContent).not.toBe('');
    expect($('consent-error').textContent).not.toBe('');
    expect($('email').getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe($('email'));
  });

  it('valid submit disables button, calls submit once even when submitted twice', async () => {
    let resolve!: (v: {ok: true}) => void;
    const submit = vi.fn(() => new Promise<{ok: true}>(r => (resolve = r)));
    initSignupForm(form, {accessKey: 'k', submit: submit as never});
    fillValid();
    submitEvent();
    submitEvent();
    expect(submit).toHaveBeenCalledTimes(1);
    const btn = $<HTMLButtonElement>('signup-submit');
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toBe('Joining…');
    const args = submit.mock.calls[0] as unknown as [Record<string, unknown>, Record<string, unknown>];
    expect(args[0]).toMatchObject({name: 'Zoë Carter', email: 'zoe@example.com', phone: '+919876543210', age: 34});
    expect(args[1]).toMatchObject({accessKey: 'k', botcheck: false});
    resolve({ok: true});
    await flush();
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('passes honeypot state and hCaptcha token', async () => {
    const submit = vi.fn(async () => ({ok: true as const}));
    initSignupForm(form, {accessKey: 'k', submit});
    const ta = document.createElement('textarea');
    ta.name = 'h-captcha-response';
    ta.value = 'tok';
    form.appendChild(ta);
    $('botcheck').checked = true;
    fillValid();
    submitEvent();
    expect((submit.mock.calls[0] as unknown[])[1]).toMatchObject({botcheck: true, hcaptchaToken: 'tok'});
  });

  it('success shows first-name message, hides form, focuses status', async () => {
    initSignupForm(form, {accessKey: 'k', submit: async () => ({ok: true})});
    fillValid();
    submitEvent();
    await flush();
    const status = $<HTMLElement>('signup-status');
    expect(status.textContent).toBe("You're on the list, Zoë. We'll email zoe@example.com when early access opens.");
    expect(form.hidden).toBe(true);
    expect(document.activeElement).toBe(status);
  });

  it('failure shows message, re-enables button, keeps values', async () => {
    initSignupForm(form, {
      accessKey: 'k',
      submit: async () => ({ok: false, reason: 'network', message: 'Nope, retry.'}) as never,
    });
    fillValid();
    submitEvent();
    await flush();
    expect($('signup-status').textContent).toBe('Nope, retry.');
    const btn = $<HTMLButtonElement>('signup-submit');
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toBe('Join early access');
    expect($('name').value).toBe('Zoë Carter');
    expect(form.hidden).toBe(false);
  });

  it.each([undefined, '', '   '])('no key (%j) shows closed message and never submits', async key => {
    const submit = vi.fn();
    initSignupForm(form, {accessKey: key, submit});
    expect(document.getElementById('signup-submit')).toBeNull();
    expect(form.querySelector('p.signup-closed')!.textContent).toBe('Sign-ups open very soon.');
    fillValid();
    submitEvent();
    await flush();
    expect(submit).not.toHaveBeenCalled();
  });
});
