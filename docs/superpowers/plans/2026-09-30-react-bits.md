# React Bits Motion Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** Tasteful React Bits motion on the website (vendored components as React islands) and React Native ports in the app, with reduced-motion, accessibility, privacy and performance intact.

**Spec:** `docs/superpowers/specs/2026-09-30-react-bits-design.md` (binding).

## Global Constraints
- Reduced motion → no effect, original content shown. Content never starts invisible without JS.
- No runtime third-party requests; components bundled locally with provenance + licence notice.
- WCAG 2.2 AA; axe zero violations; decorative canvases aria-hidden.
- Website added JS ≤ ~90 KB gzip; WebGL pauses off-screen/hidden tab.
- App: no DSP/audio changes, no new runtime deps; Animated with native driver where possible.
- Copy unchanged; existing guards (banned claims, platform parity, privacy) stay green.
- Commits conventional, ending `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus
- JS disabled / island crash → page still fully readable (headings, numbers, CTA).
- Reduced motion → zero animation, zero WebGL.
- CountUp final text must equal the real values ("+6.1 dB" … and Café "+3.1 dB") in both modes, including after rapid toggling.
- Touch devices → no SpotlightCard pointer tracking; mobile → no heavy shader or a lighter one.
- React islands must not duplicate content for screen readers (no double-reading of animated headings).

### Task 1: React islands infra + text/number islands (website)
**Files:** package.json, vite.config.ts (plugin-react; keep multi-page inputs), tsconfig (jsx react-jsx), src/islands/mount.tsx, src/react-bits/{ShinyText,BlurText,CountUp}/ + LICENSE-react-bits.md, src/islands/{text,profile}.tsx, src/main.ts wiring, tests/unit/islands/*.test.tsx.
**Produces:** `mountIsland(el: Element, node: React.ReactNode, opts: {reducedMotion: boolean}): (() => void) | null`; `enhanceHeadings(root: ParentNode, opts)`; `enhanceEyebrow(el, opts)`; `enhanceProfileCounts(root, opts)` integrating with src/visual/profile.ts toggle.
- [ ] Failing tests: mount skips under reducedMotion (returns null, DOM unchanged); headings keep their exact text as accessible name and aren't read twice; eyebrow keeps exact copy; profile counters end at exact labels in Everyday and Café, and after toggling quickly back and forth.
- [ ] Implement by vendoring the official TS-CSS sources from `https://reactbits.dev/r/<Name>-TS-CSS.json` (files[].content) with a header comment (source URL, licence).
- [ ] npm test, npx playwright test, npm run build green. Commit.

### Task 2: Surfaces — SpotlightCard, StarBorder, SoftAurora (website)
**Files:** src/react-bits/{SpotlightCard,StarBorder,SoftAurora}/, src/islands/surfaces.tsx, CSS, main.ts wiring, tests/unit/islands/surfaces.test.tsx, tests/e2e additions, tests/unit/bundle-budget.test.ts.
- [ ] Failing tests: SpotlightCard only when `matchMedia('(pointer: fine)')`; StarBorder wraps only the hero CTA and keeps it a working link with the same accessible name; SoftAurora not mounted under reduced motion, falls back when WebGL unavailable, pauses when off-screen/hidden; bundle budget (sum of gzip JS in dist ≤ budget).
- [ ] Implement, tune for calm (low intensity), verify screenshots desktop/mobile, e2e (axe, no third-party, reduced motion static, mobile overflow). Commit.

### Task 3: App motion primitives (clarihear-2.0, separate repo)
**Files:** src/components/motion/{useReducedMotion,StaggerText,CountUp,GlowRing}.tsx(+index), usage in OnboardingScreen, SafetyScreen, DeviceCheckScreen, ToneCheckScreen, AudiogramScreen, PowerButton; tests in src/components/motion/__tests__/.
- [ ] Failing tests (jest + RN testing library, fake timers): reduce motion → final content immediately; StaggerText renders full text accessible as one label; CountUp ends exactly at value; GlowRing present only while on; existing suites green; tsc clean.
- [ ] Implement with Animated (native driver), apply to screens, simulator smoke check (build + launch + screenshot). Commit on a feature branch `feat/motion-layer`.
