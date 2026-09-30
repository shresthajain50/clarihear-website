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

## Sign-ups

The form is always open and needs no API key. Submissions are posted to
FormSubmit (https://formsubmit.co), which emails them to
shresthajain.iitb@gmail.com.

One-time step: the very first submission makes FormSubmit send an activation
email to shresthajain.iitb@gmail.com. Click "Activate Form" in that email once.
Until then, submissions are not delivered and visitors see "Something went
wrong. Please try again."

## Privacy

Sign-ups are emailed to the site owner through FormSubmit. See `privacy.html`.

## Scroll-world hero

The hero section has a slot, `#hero[data-scroll-world]`, reserved for a future
scroll-driven film.
