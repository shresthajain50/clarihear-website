# ClariHear pre-launch site

The pre-launch website for ClariHear, a personalised hearing assistance app: a
quick tone check (or a professional audiogram) builds your hearing profile, and
ClariHear tunes live sound to it, frequency by frequency, for wherever you are.
ClariHear is not a medical device. The site explains the app and collects early-access sign-ups.

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

**Production (Vercel):** https://clarihear.vercel.app, which is the Vercel project
`clarihear`. `vercel.json` sets the Vite build to `dist` and the security headers.
To deploy from this folder:

```sh
npx vercel deploy --prod
```

To make every push to `main` deploy automatically, connect the GitHub login in
Vercel (Account Settings, then Login Connections), then run `npx vercel git connect`.

**Mirror (GitHub Pages):** on every push to `main`, GitHub Actions
(`.github/workflows/deploy.yml`) runs the tests, builds with
`VITE_BASE=/clarihear-website/`, and publishes to
https://shresthajain50.github.io/clarihear-website/

## Enabling sign-ups

Until a key is added, the form shows "Sign-ups open very soon."

1. Get a free access key at https://web3forms.com by entering
   shresthajain.iitb@gmail.com. The key arrives by email.
2. For Vercel, run `npx vercel env add VITE_WEB3FORMS_KEY production`, paste the key,
   then run `npx vercel deploy --prod`.
3. For the GitHub Pages mirror, go to Settings, then Secrets and variables, then
   Actions, add a repository secret named `WEB3FORMS_KEY`, and re-run the
   "Deploy to GitHub Pages" workflow.

## Privacy

Sign-ups are emailed to the site owner through Web3Forms. See `privacy.html`.

## Scroll-world hero

The hero section has a slot, `#hero[data-scroll-world]`, reserved for a future
scroll-driven film.
