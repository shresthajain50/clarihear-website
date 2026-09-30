import {describe, expect, it, vi} from 'vitest';
import {submitSignup, WEB3FORMS_URL} from '../../src/signup/submit';

const data = {name: 'Asha Rao', email: 'asha@example.com', phone: '+919876543210', age: 67};
const resp = (body: string, status = 200) => new Response(body, {status});
const fake = (r: Response) => vi.fn(async () => r) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
const GENERIC = 'Something went wrong. Please try again.';

describe('submitSignup', () => {
  it('posts JSON payload with headers', async () => {
    const f = fake(resp('{"success":true}'));
    await submitSignup(data, {accessKey: 'K', fetchImpl: f});
    const [url, init] = (f as any).mock.calls[0];
    expect(url).toBe(WEB3FORMS_URL);
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers.Accept).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({
      access_key: 'K', subject: 'New ClariHear early-access sign-up: Asha Rao', from_name: 'ClariHear website',
      name: 'Asha Rao', email: 'asha@example.com', phone: '+919876543210', age: 67, consent: 'yes', botcheck: false,
    });
  });
  it('includes h-captcha-response only with a non-empty token', async () => {
    const f = fake(resp('{"success":true}'));
    await submitSignup(data, {accessKey: 'K', hcaptchaToken: 'tok', botcheck: true, fetchImpl: f});
    const b = JSON.parse((f as any).mock.calls[0][1].body);
    expect(b['h-captcha-response']).toBe('tok');
    expect(b.botcheck).toBe(true);
    const g = fake(resp('{"success":true}'));
    await submitSignup(data, {accessKey: 'K', hcaptchaToken: '', fetchImpl: g});
    expect('h-captcha-response' in JSON.parse((g as any).mock.calls[0][1].body)).toBe(false);
  });
  it('200 success:true -> ok', async () => {
    expect(await submitSignup(data, {accessKey: 'K', fetchImpl: fake(resp('{"success":true}'))})).toEqual({ok: true});
  });
  it('200 success:false -> rejected (not ok)', async () => {
    const r = await submitSignup(data, {accessKey: 'K', fetchImpl: fake(resp('{"success":false,"body":{"message":"x"}}'))});
    expect(r).toEqual({ok: false, reason: 'rejected', message: GENERIC});
  });
  it('200 with truthy non-true success -> rejected', async () => {
    const r = await submitSignup(data, {accessKey: 'K', fetchImpl: fake(resp('{"success":"true"}'))});
    expect(r).toMatchObject({ok: false, reason: 'rejected'});
  });
  it('429 -> rate_limited, even with success body', async () => {
    const r = await submitSignup(data, {accessKey: 'K', fetchImpl: fake(resp('{"success":true}', 429))});
    expect(r).toEqual({ok: false, reason: 'rate_limited', message: 'Too many sign-ups right now — please try again in a minute.'});
  });
  it('500 -> server', async () => {
    const r = await submitSignup(data, {accessKey: 'K', fetchImpl: fake(resp('{"success":false}', 500))});
    expect(r).toEqual({ok: false, reason: 'server', message: GENERIC});
  });
  it('400 -> rejected', async () => {
    const r = await submitSignup(data, {accessKey: 'K', fetchImpl: fake(resp('{"success":false}', 400))});
    expect(r).toEqual({ok: false, reason: 'rejected', message: GENERIC});
  });
  it('fetch throws -> network', async () => {
    const f = vi.fn(async () => { throw new TypeError('fail'); }) as unknown as typeof fetch;
    expect(await submitSignup(data, {accessKey: 'K', fetchImpl: f})).toEqual({
      ok: false, reason: 'network', message: "Couldn't reach the sign-up service. Check your connection and try again."});
  });
  it('non-JSON body -> server', async () => {
    const r = await submitSignup(data, {accessKey: 'K', fetchImpl: fake(resp('<html>oops</html>'))});
    expect(r).toEqual({ok: false, reason: 'server', message: GENERIC});
  });
});
