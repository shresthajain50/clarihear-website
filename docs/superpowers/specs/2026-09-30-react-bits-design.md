# React Bits motion layer — design spec (website + app)

Status: decided autonomously on 2026-09-30 per the owner's instruction (brainstorm → plan → implement with subagents and TDD).

## Goal
Add tasteful, premium motion inspired by / taken from React Bits (https://reactbits.dev, MIT + Commons Clause — free for commercial products; the components themselves may not be resold) to the ClariHear website and app, without hurting trust, accessibility, privacy or speed.

## Constraints (binding)
- Calm and serious: no glitch, cursor trails, 3D gimmicks. Motion supports reading, never competes with it.
- `prefers-reduced-motion` (web) / Reduce Motion (iOS & Android via `AccessibilityInfo`) → all effects off, content shown statically.
- Content is always in the HTML first (website): the h1, headings, text and numbers are present and readable without JavaScript. Islands enhance existing nodes; they never make content start invisible without JS.
- No third-party requests at runtime (components and their libraries are bundled locally). Privacy notice stays true.
- Accessibility: WCAG 2.2 AA; animated text keeps its accessible name (aria-label on the island root or visually-hidden original text); decorative canvases are aria-hidden; no flashing.
- Performance: the website's JS added by this work ≤ ~90 KB gzip; WebGL background pauses when off-screen or the tab is hidden; mobile uses a lighter configuration or the CSS fallback.
- App: the audio callback and DSP are untouched. Effects use React Native `Animated` with `useNativeDriver: true` where possible. No new runtime dependencies.

## Website — React islands + vendored React Bits (TS-CSS variants)
- Tooling: add `react`, `react-dom`, `@vitejs/plugin-react`, `motion`, `ogl`; tests with `@testing-library/react` under jsdom.
- `src/islands/mount.tsx`: `mountIsland(el, node, {reducedMotion})` renders with `createRoot`; skips entirely under reduced motion (leaves the original HTML).
- Vendored components in `src/react-bits/<Name>/` (from the official registry `https://reactbits.dev/r/<Name>-TS-CSS.json`), each file headed with a provenance + licence comment; `src/react-bits/LICENSE-react-bits.md` holds the licence text.
- Placement:
  - SoftAurora — decorative canvas behind the hero (colours navy #0A0F1C, teal #00D4FF, violet #7B61FF; low intensity/speed); IntersectionObserver + visibilitychange pause; no WebGL → keep CSS gradient; hidden under reduced motion.
  - ShinyText — hero eyebrow text (keeps the exact copy).
  - BlurText — section h2 headings (except the h1), triggered on scroll into view.
  - CountUp — the #profile boost labels (count from 0 on first view; animate between Everyday and Café values on toggle; final text always equals the real values, e.g. "+6.1 dB").
  - SpotlightCard — glass cards in #honest, #privacy-promise and #profile (pointer: fine only).
  - StarBorder — hero "Join early access" CTA only.

## App — React Native ports (no new deps)
- `src/components/motion/useReducedMotion.ts` (AccessibilityInfo + change listener).
- `StaggerText` — word-by-word fade + rise (SplitText/BlurText technique).
- `CountUp` — Animated value → formatted text; exact final value.
- `GlowRing` — soft pulsing teal ring (StarBorder/BorderGlow technique) around the PowerButton while listening is ON.
- Placement: Onboarding slide titles; Safety/Headphone/Tone check screen titles; Audiogram averages; PowerButton when on.

## Testing
- Website unit (jsdom): mountIsland skips under reduced motion; each island mounts on its hook and keeps text/accessible names; CountUp final labels equal the real values in both modes; SoftAurora falls back without WebGL and pauses off-screen; copy/platform/privacy guards stay green.
- Website e2e: axe zero violations; no third-party requests; reduced-motion shows static content; mobile no overflow; bundle-size budget test on the built JS.
- App (jest): each primitive renders final content immediately under reduce motion; CountUp ends at the exact value; GlowRing only while on; existing 186 tests stay green; `tsc` clean.
