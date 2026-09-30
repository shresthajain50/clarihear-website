import type {CleanSignup} from './validation';

export const WEB3FORMS_URL = 'https://api.web3forms.com/submit';

export type SubmitResult =
  | {ok: true}
  | {ok: false; reason: 'rate_limited' | 'network' | 'server' | 'rejected'; message: string};

const MSG = {
  rate_limited: 'Too many sign-ups right now — please try again in a minute.',
  network: "Couldn't reach the sign-up service. Check your connection and try again.",
  server: 'Something went wrong. Please try again.',
  rejected: 'Something went wrong. Please try again.',
} as const;

const fail = (reason: keyof typeof MSG): SubmitResult => ({ok: false, reason, message: MSG[reason]});

export async function submitSignup(
  data: CleanSignup,
  opts: {accessKey: string; botcheck?: boolean; hcaptchaToken?: string; fetchImpl?: typeof fetch},
): Promise<SubmitResult> {
  const doFetch = opts.fetchImpl ?? globalThis.fetch;
  const payload: Record<string, unknown> = {
    access_key: opts.accessKey,
    subject: `New ClariHear early-access sign-up: ${data.name}`,
    from_name: 'ClariHear website',
    name: data.name,
    email: data.email,
    phone: data.phone,
    age: data.age,
    consent: 'yes',
    botcheck: opts.botcheck ?? false,
  };
  if (typeof opts.hcaptchaToken === 'string' && opts.hcaptchaToken !== '') {
    payload['h-captcha-response'] = opts.hcaptchaToken;
  }

  let res: Response;
  try {
    res = await doFetch(WEB3FORMS_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Accept: 'application/json'},
      body: JSON.stringify(payload),
    });
  } catch {
    return fail('network');
  }
  if (res.status === 429) return fail('rate_limited');
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return fail('server');
  }
  if ((json as {success?: unknown} | null)?.success === true) return {ok: true};
  return fail(res.status >= 500 ? 'server' : 'rejected');
}
