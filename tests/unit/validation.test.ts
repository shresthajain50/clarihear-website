import { describe, it, expect } from 'vitest';
import { validateField, validateAll, MESSAGES, type SignupInput } from '../../src/signup/validation';

const base: SignupInput = {
  name: '  Asha Rao ',
  email: ' Asha@Example.COM ',
  phone: '98765 43210',
  age: ' 34 ',
  consent: true,
};
const with_ = (p: Partial<SignupInput>): SignupInput => ({ ...base, ...p });

describe('MESSAGES copy', () => {
  it('pins literal strings', () => {
    expect(MESSAGES.nameEmpty).toBe('Please enter your name.');
    expect(MESSAGES.ageUnder18).toBe('ClariHear is for adults 18 and over.');
    expect(MESSAGES.phoneInvalid).toBe('Enter a valid phone number with country code, e.g. +91 98765 43210.');
    expect(MESSAGES.nameInvalid).toBe('Please use letters, spaces, apostrophes, full stops or hyphens (2–80 characters).');
    expect(MESSAGES.emailEmpty).toBe('Please enter your email address.');
    expect(MESSAGES.emailInvalid).toBe('Enter an email like name@example.com.');
    expect(MESSAGES.phoneEmpty).toBe('Please enter your phone number.');
    expect(MESSAGES.ageEmpty).toBe('Please enter your age.');
    expect(MESSAGES.ageInvalid).toBe('Enter your age as a whole number.');
    expect(MESSAGES.consent).toBe('Please agree so we can contact you about early access.');
  });
});

describe('validateAll success', () => {
  it('cleans values', () => {
    expect(validateAll(base)).toEqual({
      ok: true,
      value: { name: 'Asha Rao', email: 'asha@example.com', phone: '+919876543210', age: 34 },
    });
  });
  it('normalises international phone', () => {
    const r = validateAll(with_({ phone: '+1 (415) 555-2671' }));
    expect(r.ok && r.value.phone).toBe('+14155552671');
  });
});

describe('name', () => {
  it('accepts unicode, apostrophes, hyphens', () => {
    expect(validateField('name', with_({ name: "Zoë O'Brien-Nair" }))).toBeNull();
  });
  it('whitespace only is empty', () => {
    expect(validateField('name', with_({ name: '   ' }))).toBe(MESSAGES.nameEmpty);
  });
  it('rejects 1 char and 81 chars', () => {
    expect(validateField('name', with_({ name: 'A' }))).toBe(MESSAGES.nameInvalid);
    expect(validateField('name', with_({ name: 'A'.repeat(81) }))).toBe(MESSAGES.nameInvalid);
    expect(validateField('name', with_({ name: 'A'.repeat(80) }))).toBeNull();
  });
});

describe('name normalisation and scripts', () => {
  it('accepts Devanagari with combining marks', () => {
    expect(validateField('name', with_({ name: 'आशा' }))).toBeNull();
  });
  it('accepts NFD Zoë and returns NFC', () => {
    const nfd = 'Zoe\u0308';
    expect(validateField('name', with_({ name: nfd }))).toBeNull();
    const r = validateAll(with_({ name: nfd }));
    expect(r.ok && r.value.name).toBe('Zo\u00EB');
  });
  it('collapses tabs and newlines', () => {
    const a = validateAll(with_({ name: 'Asha\t\tRao' }));
    expect(a.ok && a.value.name).toBe('Asha Rao');
    const b = validateAll(with_({ name: 'A\nB' }));
    expect(b.ok && b.value.name).toBe('A B');
  });
  it('length measured after collapsing', () => {
    expect(validateField('name', with_({ name: 'A' + ' '.repeat(5) + 'B' }))).toBeNull();
  });
});

describe('extra email/phone cases', () => {
  it('keeps plus tag in email', () => {
    const r = validateAll(with_({ email: 'a+x@d.com' }));
    expect(r.ok && r.value.email).toBe('a+x@d.com');
  });
  it('+91 prefix normalises', () => {
    const r = validateAll(with_({ phone: '+91 98765 43210' }));
    expect(r.ok && r.value.phone).toBe('+919876543210');
  });
  it('short Indian number invalid', () => {
    expect(validateField('phone', with_({ phone: '98765 4321' }))).toBe(MESSAGES.phoneInvalid);
  });
});

describe('email', () => {
  it('empty and invalid', () => {
    expect(validateField('email', with_({ email: ' ' }))).toBe(MESSAGES.emailEmpty);
    expect(validateField('email', with_({ email: 'x@y' }))).toBe(MESSAGES.emailInvalid);
  });
});

describe('phone', () => {
  it('empty', () => {
    expect(validateField('phone', with_({ phone: '' }))).toBe(MESSAGES.phoneEmpty);
  });
  it('12345 invalid', () => {
    expect(validateField('phone', with_({ phone: '12345' }))).toBe(MESSAGES.phoneInvalid);
  });
});

describe('age', () => {
  it('empty', () => {
    expect(validateField('age', with_({ age: '' }))).toBe(MESSAGES.ageEmpty);
  });
  it('under 18', () => {
    expect(validateField('age', with_({ age: '17' }))).toBe(MESSAGES.ageUnder18);
  });
  it('18 and 120 ok', () => {
    expect(validateField('age', with_({ age: '18' }))).toBeNull();
    expect(validateField('age', with_({ age: '120' }))).toBeNull();
  });
  it.each(['18.5', 'abc', '121'])('%s invalid', (age) => {
    expect(validateField('age', with_({ age }))).toBe(MESSAGES.ageInvalid);
  });
});

describe('consent', () => {
  it('required', () => {
    expect(validateField('consent', with_({ consent: false }))).toBe(MESSAGES.consent);
    expect(validateField('consent', base)).toBeNull();
  });
});

describe('validateAll failure', () => {
  it('collects all errors', () => {
    const r = validateAll({ name: '', email: 'x@y', phone: '12345', age: '17', consent: false });
    expect(r).toEqual({
      ok: false,
      errors: {
        name: MESSAGES.nameEmpty,
        email: MESSAGES.emailInvalid,
        phone: MESSAGES.phoneInvalid,
        age: MESSAGES.ageUnder18,
        consent: MESSAGES.consent,
      },
    });
  });
});
