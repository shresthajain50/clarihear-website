import {describe, expect, it, vi} from 'vitest';
import {submitSignup, FORMSUBMIT_URL} from '../../src/signup/submit';

const data = {name: 'Asha Rao', email: 'asha@example.com', phone: '+919876543210', age: 67};
const resp = (body: string, status = 200) => new Response(body, {status});
const fake = (r: Response) => vi.fn(async () => r) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
const GENERIC = 'Something went wrong. Please try again.';
const OK = '{"success":"true","message":"The form was submitted successfully."}';

describe('submitSignup (FormSubmit)', () => {
  it('targets the FormSubmit AJAX endpoint for the owner inbox', () => {
    expect(FORMSUBMIT_URL).toBe('https://formsubmit.co/ajax/shresthajain.iitb@gmail.com');
  });
  it('posts JSON payload with headers and FormSubmit special fields', async () => {
    const f = fake(resp(OK));
    await submitSignup(data, {fetchImpl: f});
    const [url, init] = (f as any).mock.calls[0];
    expect(url).toBe(FORMSUBMIT_URL);
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers.Accept).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({
      name: 'Asha Rao', email: 'asha@example.com', phone: '+919876543210', age: 67, consent: 'yes',
      _subject: 'New ClariHear early-access sign-up: Asha Rao', _template: 'table', _captcha: 'false', _honey: '',
    });
  });
  it('honeypot checked -> no request, silently ok', async () => {
    const f = fake(resp(OK));
    expect(await submitSignup(data, {honeypot: true, fetchImpl: f})).toEqual({ok: true});
    expect(f).not.toHaveBeenCalled();
  });
  it('success "true" (string) -> ok', async () => {
    expect(await submitSignup(data, {fetchImpl: fake(resp(OK))})).toEqual({ok: true});
  });
  it('success true (boolean) -> ok', async () => {
    expect(await submitSignup(data, {fetchImpl: fake(resp('{"success":true}'))})).toEqual({ok: true});
  });
  it('success "false" (form not yet activated) -> rejected with the generic message', async () => {
    const body = JSON.stringify({success: 'false', message: "This form needs Activation. We've sent you an email containing an 'Activate Form' link."});
    expect(await submitSignup(data, {fetchImpl: fake(resp(body))})).toEqual({ok: false, reason: 'rejected', message: GENERIC});
  });
  it('other truthy success values -> rejected', async () => {
    const r = await submitSignup(data, {fetchImpl: fake(resp('{"success":1}'))});
    expect(r).toMatchObject({ok: false, reason: 'rejected'});
  });
  it('429 -> rate_limited, even with success body', async () => {
    const r = await submitSignup(data, {fetchImpl: fake(resp(OK, 429))});
    expect(r).toEqual({ok: false, reason: 'rate_limited', message: 'Too many sign-ups right now — please try again in a minute.'});
  });
  it('500 -> server', async () => {
    const r = await submitSignup(data, {fetchImpl: fake(resp('{"success":"false"}', 500))});
    expect(r).toEqual({ok: false, reason: 'server', message: GENERIC});
  });
  it('400 -> rejected', async () => {
    const r = await submitSignup(data, {fetchImpl: fake(resp('{"success":"false"}', 400))});
    expect(r).toEqual({ok: false, reason: 'rejected', message: GENERIC});
  });
  it('fetch throws -> network', async () => {
    const f = vi.fn(async () => { throw new TypeError('fail'); }) as unknown as typeof fetch;
    expect(await submitSignup(data, {fetchImpl: f})).toEqual({
      ok: false, reason: 'network', message: "Couldn't reach the sign-up service. Check your connection and try again."});
  });
  it('non-JSON body -> server', async () => {
    const r = await submitSignup(data, {fetchImpl: fake(resp('<html>oops</html>'))});
    expect(r).toEqual({ok: false, reason: 'server', message: GENERIC});
  });
});
