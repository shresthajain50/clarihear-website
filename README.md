# ClariHear pre-launch site

The pre-launch website for ClariHear, a sound amplifier app that helps you hear
conversations and everyday sound more clearly. ClariHear is not a medical
device. The site explains the app and collects early-access sign-ups.

## Local development

```
npm install
npm run dev
```

## Tests

```
npm test
npx playwright install chromium
npm run e2e
```

## Deploy

Push to `main`. GitHub Actions (`.github/workflows/deploy.yml`) runs the tests,
builds with `VITE_BASE=/clarihear-website/` and publishes to GitHub Pages at
https://shresthajain50.github.io/clarihear-website/

## Enabling sign-ups

Until a key is added, the form shows "Sign-ups open very soon."

1. Get a free access key at https://web3forms.com by entering
   shresthajain.iitb@gmail.com. The key arrives by email.
2. In the GitHub repo, go to Settings, then Secrets and variables, then Actions,
   and add a repository secret named `WEB3FORMS_KEY`.
3. Re-run the "Deploy to GitHub Pages" workflow.

## Privacy

Sign-ups are emailed to the site owner through Web3Forms. See `privacy.html`.

## Scroll-world hero

The hero section has a slot, `#hero[data-scroll-world]`, reserved for a future
scroll-driven film.
