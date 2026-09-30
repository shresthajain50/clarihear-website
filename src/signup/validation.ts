import { parsePhoneNumberFromString } from 'libphonenumber-js';

export type Field = 'name' | 'email' | 'phone' | 'age' | 'consent';
export interface SignupInput {
  name: string;
  email: string;
  phone: string;
  age: string;
  consent: boolean;
}
export interface CleanSignup {
  name: string;
  email: string;
  phone: string; // E.164
  age: number;
}

export const MESSAGES = {
  nameEmpty: 'Please enter your name.',
  nameInvalid: 'Please use letters, spaces, apostrophes, full stops or hyphens (2–80 characters).',
  emailEmpty: 'Please enter your email address.',
  emailInvalid: 'Enter an email like name@example.com.',
  phoneEmpty: 'Please enter your phone number.',
  phoneInvalid: 'Enter a valid phone number with country code, e.g. +91 98765 43210.',
  ageEmpty: 'Please enter your age.',
  ageInvalid: 'Enter your age as a whole number.',
  ageUnder18: 'ClariHear is for adults 18 and over.',
  consent: 'Please agree so we can contact you about early access.',
} as const satisfies Record<string, string>;

const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'-]{1,79}$/u;

function cleanName(raw: string): string {
  return raw.trim().normalize('NFC').replace(/\s+/g, ' ');
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function toE164(raw: string): string | null {
  const parsed = parsePhoneNumberFromString(raw, 'IN');
  return parsed && parsed.isValid() ? parsed.number : null;
}

function parseAge(raw: string): { age: number } | { error: string } {
  const v = raw.trim();
  if (!v) return { error: MESSAGES.ageEmpty };
  if (!/^\d+$/.test(v)) return { error: MESSAGES.ageInvalid };
  const age = Number(v);
  if (age > 120) return { error: MESSAGES.ageInvalid };
  if (age < 18) return { error: MESSAGES.ageUnder18 };
  return { age };
}

export function validateField(field: Field, input: SignupInput): string | null {
  switch (field) {
    case 'name': {
      const v = cleanName(input.name);
      if (!v) return MESSAGES.nameEmpty;
      return NAME_RE.test(v) ? null : MESSAGES.nameInvalid;
    }
    case 'email': {
      const v = input.email.trim();
      if (!v) return MESSAGES.emailEmpty;
      return EMAIL_RE.test(v) ? null : MESSAGES.emailInvalid;
    }
    case 'phone': {
      const v = input.phone.trim();
      if (!v) return MESSAGES.phoneEmpty;
      return toE164(v) ? null : MESSAGES.phoneInvalid;
    }
    case 'age': {
      const r = parseAge(input.age);
      return 'error' in r ? r.error : null;
    }
    case 'consent':
      return input.consent ? null : MESSAGES.consent;
  }
}

export function validateAll(
  input: SignupInput,
): { ok: true; value: CleanSignup } | { ok: false; errors: Partial<Record<Field, string>> } {
  const errors: Partial<Record<Field, string>> = {};
  for (const f of ['name', 'email', 'phone', 'age', 'consent'] as const) {
    const e = validateField(f, input);
    if (e) errors[f] = e;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const age = parseAge(input.age);
  return {
    ok: true,
    value: {
      name: cleanName(input.name),
      email: input.email.trim().toLowerCase(),
      phone: toE164(input.phone.trim())!,
      age: (age as { age: number }).age,
    },
  };
}
