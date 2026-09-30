import type {CleanSignup} from './validation';

/** FormSubmit AJAX endpoint: emails each submission to the owner's inbox, no API key. */
export const FORMSUBMIT_URL = 'https://formsubmit.co/ajax/shresthajain.iitb@gmail.com';

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
  opts: {honeypot?: boolean; fetchImpl?: typeof fetch} = {},
): Promise<SubmitResult> {
  // A bot ticked the hidden honeypot: pretend it worked, send nothing.
  if (opts.honeypot) return {ok: true};

  const doFetch = opts.fetchImpl ?? globalThis.fetch;
  const payload = {
    name: data.name,
    email: data.email,
    phone: data.phone,
    age: data.age,
    consent: 'yes',
    _subject: `New ClariHear early-access sign-up: ${data.name}`,
    _template: 'table',
    _captcha: 'false',
    _honey: '',
  };

  let res: Response;
  try {
    res = await doFetch(FORMSUBMIT_URL, {
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
  // FormSubmit answers {"success":"true"} (a string); accept a boolean too.
  const success = (json as {success?: unknown} | null)?.success;
  if (success === true || success === 'true') return {ok: true};
  return fail(res.status >= 500 ? 'server' : 'rejected');
}
