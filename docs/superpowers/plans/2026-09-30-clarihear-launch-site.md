# ClariHear Launch Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A trustworthy, accessible pre-launch site for ClariHear with a working early-access sign-up emailed via Web3Forms, deployed to GitHub Pages.

**Architecture:** Static multi-page Vite + TypeScript site (index.html, privacy.html). Small single-purpose modules in `src/` wired by `src/main.ts`. All logic is pure or DOM-scoped so Vitest+jsdom can test it; Playwright covers real-browser flows and accessibility.

**Tech Stack:** Vite 5, TypeScript 5 (strict), Vitest 2 + jsdom + @testing-library/dom, Playwright 1.x + @axe-core/playwright, libphonenumber-js.

**Spec:** `docs/superpowers/specs/2026-09-30-clarihear-launch-site-design.md` (read it first — copy, fields, messages and tokens are specified there verbatim).

## Global Constraints

- Node 20; `npm` only. Scripts: `dev`, `build` (`tsc --noEmit && vite build`), `test` (`vitest run`), `e2e` (`playwright test`).
- No UI framework; runtime deps limited to `libphonenumber-js`.
- Copy exactly as in the spec; banned words anywhere in shipped HTML: `diagnos`, `treat`, `cure`, `hearing test`, `clinically`, `FDA`, `hearing aid replacement`, `instead of hearing aids`, `testimonial`, `% off`, `discount`. (The FAQ answer "a sound amplifier app, not a medical device" is allowed; the phrase "Is ClariHear a hearing aid?" is allowed.)
- Colours only from the spec tokens (CSS variables in `src/styles/tokens.css`); violet `#7B61FF` never for text.
- Animate only `transform`/`opacity`; honour `prefers-reduced-motion`.
- Vite `base: process.env.VITE_BASE ?? '/'`; Web3Forms key from `import.meta.env.VITE_WEB3FORMS_KEY`.
- Each task commits with a conventional message ending `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- Phone typed without "+" (e.g. `98765 43210`) → treated as Indian (+91) and normalised to `+919876543210`; a clearly invalid number (`12345`) → error. (Task 2)
- Double-click on submit → exactly one network request. (Task 4)
- Web3Forms returns HTTP 200 with `{"success": false}` → shown as failure, data kept. (Task 3)
- Name with accents/apostrophes (`Zoë O'Brien-Nair`) → valid; name of only spaces → error. (Task 2)
- Missing access key in the build → form shows "Sign-ups open very soon." and never calls fetch. (Task 4)

---

### Task 1: Scaffold, tokens, static pages

**Files:** Create `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `.gitignore`, `.env.example`, `index.html`, `privacy.html`, `src/main.ts`, `src/styles/tokens.css`, `src/styles/base.css`, `src/styles/sections.css`, `public/favicon.svg`, `tests/unit/copy.test.ts`, `tests/unit/structure.test.ts`.

**Interfaces — Produces:** DOM ids/hooks later tasks attach to: `#hero[data-scroll-world]` containing `svg#wave` and `button#wave-toggle`; `#places` containing `div[role=radiogroup]#env-picker` with four `button[role=radio][data-env=quiet|office|cafe|outdoors]` and `div#env-chart` + `p#env-desc`; `section#join` containing `form#signup` (fields `name,email,phone,age,consent,botcheck`, each input with `aria-describedby` → `#{field}-error` `<p class="field-error">` and hint `#{field}-hint` where hinted), `div#signup-status[aria-live=polite]`, `button#signup-submit`; elements with class `reveal` for scroll reveals. `src/main.ts` exports nothing; it imports modules and calls their `init*` functions guarded by element existence.

- [ ] Step 1: `npm init`, install dev deps `vite typescript vitest jsdom @testing-library/dom @playwright/test @axe-core/playwright` and dep `libphonenumber-js`. Vite multi-page: `build.rollupOptions.input = {main: 'index.html', privacy: 'privacy.html'}`.
- [ ] Step 2: Write failing `tests/unit/copy.test.ts`: reads `index.html` and `privacy.html` (fs), asserts none of the banned words (case-insensitive) appear, asserts the disclaimer "not a medical device" appears on both pages, asserts `shresthajain.iitb@gmail.com` appears in the footer contact.
- [ ] Step 3: Write failing `tests/unit/structure.test.ts`: parse index.html with jsdom (`new JSDOM(html)`); assert every hook listed above exists; h1 text is "Hear the conversation again."; four env radios; every form input has a `<label for>`; consent checkbox has no `checked` attribute; skip link `a[href="#main"]` exists.
- [ ] Step 4: Run `npx vitest run` → both fail.
- [ ] Step 5: Write the pages with the spec copy verbatim, semantic landmarks (`header`, `main#main`, `footer`), tokens.css (all spec tokens as `--c-*` vars), base.css (Inter via Google Fonts `display=swap` with preconnect, system-ui fallback; focus ring `outline: 2px solid var(--c-primary); outline-offset: 3px`; `scroll-margin-top: 88px` on sections and inputs; min 44px buttons/inputs; `.reveal` visible by default — JS adds `.reveal--pending` only when motion is allowed), sections.css (glass cards, two-column honesty block collapsing to one column < 720px, no horizontal overflow at 320px).
- [ ] Step 6: `npx vitest run` → pass; `npm run build` → succeeds. Commit `feat: scaffold ClariHear launch site with spec copy and tokens`.

### Task 2: Field validation (`src/signup/validation.ts`)

**Interfaces — Produces:**
```ts
export type Field = 'name' | 'email' | 'phone' | 'age' | 'consent';
export interface SignupInput { name: string; email: string; phone: string; age: string; consent: boolean }
export interface CleanSignup { name: string; email: string; phone: string /* E.164 */; age: number }
export function validateField(field: Field, input: SignupInput): string | null; // error message or null
export function validateAll(input: SignupInput): {ok: true; value: CleanSignup} | {ok: false; errors: Partial<Record<Field, string>>};
export const MESSAGES: Record<string, string>;
```
Messages (exact): name empty "Please enter your name."; name invalid "Please use letters, spaces, apostrophes, full stops or hyphens (2–80 characters)."; email empty "Please enter your email address."; email invalid "Enter an email like name@example.com."; phone empty "Please enter your phone number."; phone invalid "Enter a valid phone number with country code, e.g. +91 98765 43210."; age empty "Please enter your age."; age invalid "Enter your age as a whole number."; age under 18 "ClariHear is for adults 18 and over."; consent "Please agree so we can contact you about early access."

- [ ] Step 1: Failing tests `tests/unit/validation.test.ts` covering: valid full input → ok with trimmed name, lowercased email, `+919876543210` from `98765 43210`, `+14155552671` from `+1 (415) 555-2671`, age number; `Zoë O'Brien-Nair` valid; `"   "` name → empty message; `"A"` → invalid; 81 chars → invalid; `x@y` → invalid email; `12345` phone → invalid; age `17` → under-18 message; `18` ok; `18.5`, `abc`, `121` → invalid; consent false → consent message; `validateAll` collects all errors at once.
- [ ] Step 2: Run → fail. Step 3: Implement (email regex `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$`; name regex `^[\p{L}][\p{L}\s.'-]{1,79}$`u on trimmed; phone via `parsePhoneNumberFromString(v, 'IN')` + `isValid()` → `.number`). Step 4: Run → pass. Step 5: Commit `feat: sign-up field validation`.

### Task 3: Web3Forms client (`src/signup/submit.ts`)

**Interfaces — Consumes:** `CleanSignup` (Task 2). **Produces:**
```ts
export const WEB3FORMS_URL = 'https://api.web3forms.com/submit';
export type SubmitResult = {ok: true} | {ok: false; reason: 'rate_limited' | 'network' | 'server' | 'rejected'; message: string};
export async function submitSignup(data: CleanSignup, opts: {accessKey: string; botcheck?: boolean; hcaptchaToken?: string; fetchImpl?: typeof fetch}): Promise<SubmitResult>;
```
- [ ] Step 1: Failing tests `tests/unit/submit.test.ts` (fake fetch): posts JSON to URL with headers `Content-Type`/`Accept: application/json`; body contains access_key, subject `New ClariHear early-access sign-up: {name}`, from_name `ClariHear website`, name, email, phone, age, consent `yes`, botcheck false, and `h-captcha-response` only when a token is given; 200 `{success:true}` → ok; 200 `{success:false,body:{message:'x'}}` → rejected with generic message; 429 → rate_limited message; 500 → server message; fetch throws → network message; non-JSON body → server message.
- [ ] Step 2 fail → Step 3 implement → Step 4 pass → Step 5 commit `feat: Web3Forms sign-up client`.

### Task 4: Form controller (`src/signup/form.ts`)

**Interfaces — Consumes:** Tasks 1–3. **Produces:** `export function initSignupForm(form: HTMLFormElement, opts: {accessKey: string | undefined; submit?: typeof submitSignup}): void;`
Behaviour per spec "Sign-up form". No key → replace submit area with `<p>` "Sign-ups open very soon." and never call submit. hCaptcha: if key present and `window.hcaptcha` exists, read token from `textarea[name="h-captcha-response"]`.
- [ ] Step 1: Failing tests `tests/unit/form.test.ts` (jsdom, render index.html's form fragment or build it from the file): blur on empty name shows error text in `#name-error`, sets `aria-invalid="true"`; typing a valid value after an error clears it on input; submit with errors focuses first invalid field and does not call submit; valid submit disables button with text "Joining…", calls submit once even when submitted twice rapidly; success replaces form with "You're on the list, Zoë. We'll email zoe@example.com when early access opens." (first name only) inside `#signup-status`; failure shows the result message in status, re-enables button, keeps field values; no key → no submit calls and shows "Sign-ups open very soon.".
- [ ] Step 2 fail → Step 3 implement → Step 4 pass → Step 5 wire in `src/main.ts` (`initSignupForm(form, {accessKey: import.meta.env.VITE_WEB3FORMS_KEY})`; load `https://web3forms.com/client/script.js` async only when key present) → commit `feat: accessible sign-up form controller`.

### Task 5: Interactive visuals (`src/visual/wave.ts`, `src/visual/environments.ts`, `src/visual/reveal.ts`)

**Interfaces — Produces:**
```ts
// environments.ts
export type EnvId = 'quiet' | 'office' | 'cafe' | 'outdoors';
export const ENVIRONMENTS: Record<EnvId, {label: string; description: string; bandOffsetsDb: readonly number[]}>;
export const BANDS_HZ: readonly number[]; // [250,500,1000,2000,4000,8000]
export function initEnvironmentPicker(root: HTMLElement): void;
// wave.ts
export function wavePath(t: number, clarity: number, width: number, height: number, points?: number): string; // SVG path d
export function initWave(svg: SVGSVGElement, toggle: HTMLButtonElement, opts?: {reducedMotion?: boolean}): {destroy(): void};
// reveal.ts
export function initReveal(root: ParentNode, opts?: {reducedMotion?: boolean}): void;
```
Environment labels/descriptions verbatim from the app: quiet "Quiet home" / "A quiet room. Your full personal profile."; office "Office" / "Moderate background: keyboards, air conditioning, nearby voices."; cafe "Café / restaurant" / "Busy places with many voices. Less rumble, clearer speech."; outdoors "Outdoors" / "Streets and parks: traffic and wind are turned down."
- [ ] Step 1: Failing tests `tests/unit/environments.test.ts`: offsets equal the spec arrays exactly; picker click sets `aria-checked` on one radio only, updates `#env-desc`, sets each bar's `style.transform` scaleY from offset (bar height ∝ `(offset+12)/13`), arrow keys move selection (roving tabindex). `tests/unit/wave.test.ts`: `wavePath` returns a path starting `M0,` with `points+1` segments, deterministic for same inputs, amplitude noise shrinks as clarity → 1 (compare max deviation from pure sine); `initWave` with reducedMotion draws once and never calls `requestAnimationFrame`; toggle switches `aria-pressed` and label "Pause animation"/"Play animation". `tests/unit/reveal.test.ts`: with reducedMotion no element gets `reveal--pending`; otherwise elements get it and lose it when the (mocked) IntersectionObserver reports intersection.
- [ ] Step 2 fail → Step 3 implement (wave: rAF loop, clarity from scroll progress of hero + pointer x, paused when hidden or toggled) → Step 4 pass → Step 5 wire in main.ts → commit `feat: sound-wave hero, environment picker, scroll reveals`.

### Task 6: Browser tests (Playwright + axe)

**Files:** `tests/e2e/site.spec.ts`, `playwright.config.ts` (webServer `npm run build && npx vite preview --port 4173 --strictPort` with `VITE_WEB3FORMS_KEY=test-key`; projects chromium desktop + mobile 375×812).
- [ ] Step 1: Tests: page loads with h1; axe on index and privacy → zero violations; mobile: `document.documentElement.scrollWidth <= innerWidth`; reduced motion (`page.emulateMedia({reducedMotion:'reduce'})`) → all `.reveal` visible; sign-up success with `page.route('https://api.web3forms.com/submit')` fulfilling `{success:true}` → success text and exactly one request with phone `+919876543210`; 429 → rate-limit message and values kept; `route.abort()` → network message; empty submit → focus on name and errors visible; environment picker changes description.
- [ ] Step 2: Run `npx playwright install chromium` then `npx playwright test` → fix any genuine failures in the owning module (keep unit tests green). Step 3: commit `test: end-to-end sign-up, accessibility and mobile checks`.

### Task 7: Deploy to GitHub Pages

**Files:** `.github/workflows/deploy.yml` (on push to main: checkout, setup-node 20, `npm ci`, `npm test`, `VITE_BASE=/clarihear-website/ VITE_WEB3FORMS_KEY=${{ secrets.WEB3FORMS_KEY }} npm run build`, `actions/upload-pages-artifact` dist, `actions/deploy-pages`), `README.md` (dev, test, deploy, how to set the key secret).
- [ ] Step 1: Verify `VITE_BASE=/clarihear-website/ npm run build` produces asset URLs under the base and privacy link works. Step 2: create repo `shresthajain50/clarihear-website`, push, enable Pages (source: GitHub Actions), wait for the workflow, verify the live URL returns 200 and the h1. Step 3: commit.
