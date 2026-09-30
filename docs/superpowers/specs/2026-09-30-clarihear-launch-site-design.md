# ClariHear launch site — design spec

Status: approved in conversation (sections 1–3, 2026-09-30). Host: GitHub Pages.

## Purpose

A public pre-launch site for the ClariHear app for iPhone and Android. It explains the product
honestly, builds trust, and collects early-access sign-ups (name, email, phone,
age) that are emailed to **shresthajain.iitb@gmail.com** via Web3Forms. It is
deliberately different from the app: no hearing features, no audio.

Success: a visitor understands what ClariHear is and is not within one screen,
can sign up in under a minute on a phone, the owner receives each sign-up by
email, and the page passes an automated accessibility scan.

## Non-negotiables (copy and data)

- Never claim to diagnose, treat or test for hearing loss; never "hearing test",
  "cure", "instead of hearing aids", "clinically proven", "FDA". Say "clearer
  everyday sound", "amplify conversations", "tone check to personalise your sound".
- Not a medical device; for adults 18+; see a hearing professional if concerned.
- No invented social proof: no testimonials, waitlist counts, press logos,
  ratings, countdowns, discounts or App Store badges.
- Data minimisation: only name, email, phone, age; consent checkbox never
  pre-ticked; privacy notice in plain language (DPDP 2023 / GDPR basics).

## Stack

Vite + TypeScript (strict), no UI framework, plain CSS with tokens. One runtime
dependency: `libphonenumber-js` (phone validation). Tests: Vitest + jsdom
(+ @testing-library/dom), Playwright + @axe-core/playwright. Static build to
`dist/`, deployed by GitHub Actions to GitHub Pages; Vite `base` set from
`VITE_BASE` (default `/`, CI `/clarihear-website/`).

Web3Forms access key: build-time `VITE_WEB3FORMS_KEY` (public-safe per
Web3Forms docs). Without a key, the form shows: "Sign-ups open very soon." and
does not submit.

## Design tokens (from the app, src/theme/index.ts)

bg0 #050810, bg1 #0A0F1C, bg2 #111827, bg3 #1C2539; glass rgba(255,255,255,0.05),
glassBorder rgba(255,255,255,0.10); primary #00D4FF, primaryDim #0099BB,
secondary #7B61FF (decorative only — never body text or errors); success #22D3A5,
warning #FFB347, danger #FF5E7D; textPrimary #F1F5F9, textSecondary #94A3B8,
textMuted #475569. Font: Inter (one preloaded latin subset, `font-display: swap`),
system-ui fallback.

## Page structure (index.html)

1. Header: wordmark "ClariHear", nav (How it works, Privacy, FAQ), button "Join early access" → #join.
2. Hero (`#hero`, the scroll-world mount point `data-scroll-world`): eyebrow "Coming soon to iPhone and Android"; h1 "Hear the conversation again."; lead "ClariHear turns your phone and earbuds into a personal sound amplifier, tuned to how you hear and to where you are."; CTA "Join early access"; secondary link "How it works". Visual: animated SVG sound wave (teal→violet) that moves from noisy to clean as the visitor scrolls/points; pause button; static under reduced motion. h1 renders without JS.
3. What it is / isn't (`#honest`): two columns. Is: "A sound amplifier app for everyday listening", "Personalised with a quick in-app tone check", "Built for adults 18 and over". Isn't: "Not a medical device", "Doesn't diagnose or treat hearing loss", "Not a replacement for a hearing professional".
4. How it works (`#how`), 3 steps: "1 · A few safety questions" (anything that needs a professional is flagged first); "2 · Check your earbuds and tune" (a left/right check and a short tone check personalise your sound); "3 · Listen live" (conversations, TV and lectures, clearer, with an instant mute).
5. Real places (`#places`): toggle Quiet home / Office / Café / Outdoors; a 6-bar chart (250 Hz…8 kHz) of that profile's offsets, verbatim from the app: quiet [0,0,0,0,0,0], office [-3,-2,0,0,0,-1], cafe [-8,-6,-3,0,1,-2], outdoors [-10,-6,-2,0,0,-3]; one-line description per profile (app copy).
6. Safety & privacy (`#privacy-promise`): "Your audio stays on your phone" (processed on-device, never uploaded); "Amplification with limits" (gain is capped, loud rooms turn it down automatically); "Mute is always one tap away"; "We'll tell you when to see a professional".
7. FAQ (`#faq`, `<details>`): Is ClariHear a hearing aid? (No — a sound amplifier app, not a medical device); When does it launch? (on iPhone and Android; early-access members hear first); Which earbuds work? (Most wired and Bluetooth earbuds); What happens to my sign-up details? (used only for launch and early-access updates; see privacy notice); Is it free? ("We'll share pricing before launch.").
8. Join (`#join`): form (below). 9. Footer: disclaimer, © 2026 ClariHear, Privacy notice, contact mailto:shresthajain.iitb@gmail.com.

privacy.html: who we are + contact; data collected (name, email, phone, age) and why (launch and early-access updates only); processed by Web3Forms and stored in the ClariHear inbox; kept until 12 months after launch, then deleted; never sold; rights (access, correct, erase, withdraw — email us); withdrawal as easy as consent; complaints (India: Data Protection Board; EU: your supervisory authority).

## Sign-up form

Order and fields (visible labels, hints below labels, errors in reserved space):
- Full name — required, 2–80 chars after trim, letters/spaces/.'- ; `autocomplete=name`.
- Email — required, valid address; `type=email autocomplete=email`.
- Phone — required, include country code; hint "Include country code, e.g. +91 98765 43210. Only for launch updates — we never call without asking."; default region IN when no "+"; valid per libphonenumber; normalised to E.164; `type=tel autocomplete=tel inputmode=tel`.
- Age — required whole number 18–120; under 18: "ClariHear is for adults 18 and over."; `inputmode=numeric`.
- Consent checkbox — required, unticked: "I agree that ClariHear may use my name, email, phone number and age to contact me about the launch and early access. I can withdraw anytime." + link to privacy notice.
- Honeypot `botcheck` (hidden); hCaptcha widget via Web3Forms script when a key is present.
Behaviour: validate on blur; once invalid, re-validate on input; on submit validate all, focus the first invalid field; `aria-invalid` + `aria-describedby` to the error; button "Join early access" → "Joining…" disabled while sending; result in `aria-live="polite"` region. Success replaces the form: "You're on the list, {first name}. We'll email {email} when early access opens." Failure keeps entered data, shows a retry message.

Web3Forms payload: `access_key, subject "New ClariHear early-access sign-up: {name}", from_name "ClariHear website", name, email, phone (E.164), age, consent "yes", botcheck`. POST `https://api.web3forms.com/submit`, JSON + `Accept: application/json`; success only if `json.success === true`; map 429 → "Too many sign-ups right now — please try again in a minute."; network error → "Couldn't reach the sign-up service. Check your connection and try again."; other → "Something went wrong. Please try again."

## Motion & accessibility

Only transform/opacity animate; reveals 12px rise + fade, 300 ms ease-out; no scroll-jacking; `prefers-reduced-motion: reduce` shows everything statically and stops the wave; pause control for the wave. WCAG 2.2 AA: contrast, visible 2px focus ring (#00D4FF), 44px targets, `scroll-margin-top` for sticky header, skip link. Mobile-first, no horizontal overflow at 320px.

## Testing

Vitest: validation rules, submit client (all response classes, mocked fetch), form controller (jsdom), environments data parity with the app, chart rendering, copy guard (no banned claim words in index.html/privacy.html). Playwright: full sign-up with mocked Web3Forms (success, 429, offline), errors + focus, no-key fallback, mobile 375px no horizontal scroll, reduced motion, axe (no violations) on both pages.
