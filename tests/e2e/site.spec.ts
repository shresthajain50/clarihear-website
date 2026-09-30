import {test, expect, type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ENDPOINT = 'https://api.web3forms.com/submit';

async function fill(page: Page) {
  await page.locator('#name').fill('Asha Rao');
  await page.locator('#email').fill('asha@example.com');
  await page.locator('#phone').fill('98765 43210');
  await page.locator('#age').fill('34');
  await page.locator('#consent').check();
}

test('pages make no third-party requests on load', async ({page}) => {
  const external: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.hostname !== 'localhost') external.push(r.url());
  });
  for (const path of ['/', '/privacy.html', '/credits.html']) {
    await page.goto(path);
    // Includes the lazily loaded islands chunk (and the aurora) on the index.
    if (path === '/') await page.waitForSelector('html[data-islands]', {state: 'attached'});
    await page.waitForLoadState('networkidle');
  }
  expect(external).toEqual([]);
});

test('hero photo loads from our own origin', async ({page}) => {
  await page.goto('/');
  const hero = page.locator('#hero img.hero-photo');
  await expect(hero).toBeVisible();
  await expect.poll(() => hero.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBeGreaterThan(0);
  const src = await hero.evaluate((img: HTMLImageElement) => img.currentSrc);
  expect(new URL(src).hostname).toBe('localhost');
});

test('place photo follows the picker', async ({page}) => {
  await page.goto('/');
  await page.locator('#env-picker [data-env="cafe"]').click();
  await expect(page.locator('#env-photo img.is-active')).toHaveCount(1);
  await expect(page.locator('#env-photo img[data-env="cafe"]')).toHaveClass(/is-active/);
  await expect(page.locator('#env-photo img[data-env="cafe"]')).toHaveCSS('opacity', '1');
});

test('index loads with an h1', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toBeVisible();
});

for (const path of ['/', '/privacy.html', '/credits.html']) {
  test(`axe: zero violations on ${path}`, async ({page}) => {
    await page.goto(path);
    // Islands load after first paint and change heading classes; let them land first.
    if (path === '/') await page.waitForSelector('html[data-islands]', {state: 'attached'});
    // Axe must see the settled page, not elements mid-fade: scroll every reveal into view first.
    for (const el of await page.locator('.reveal').all()) {
      await el.scrollIntoViewIfNeeded();
    }
    await expect(page.locator('.reveal--pending')).toHaveCount(0);
    for (const el of await page.locator('.reveal').all()) {
      await expect(el).toHaveCSS('opacity', '1');
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    const results = await new AxeBuilder({page})
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });
}

test('no horizontal overflow on mobile', async ({page}, info) => {
  test.skip(info.project.name !== 'chromium-mobile');
  for (const path of ['/', '/privacy.html', '/credits.html']) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    if (path === '/') await page.waitForSelector('html[data-islands]', {state: 'attached'});
    const res = await page.evaluate(() => {
      const w = window.innerWidth;
      // Clipped by an overflow:hidden ancestor that itself fits (e.g. StarBorder's moving glints).
      const clipped = (el: Element) => {
        for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
          const o = getComputedStyle(a).overflowX;
          if ((o === 'hidden' || o === 'clip') && a.getBoundingClientRect().right <= w + 0.5) return true;
        }
        return false;
      };
      const offenders = [...document.querySelectorAll('body *')]
        .filter((el) => {
          const cs = getComputedStyle(el);
          if (cs.position === 'fixed' || cs.display === 'none') return false;
          return el.getBoundingClientRect().right > w + 0.5 && !clipped(el);
        })
        .map((el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + '.' + String(el.className).slice(0, 40));
      return {sw: document.documentElement.scrollWidth, w, offenders};
    });
    expect(res.sw).toBeLessThanOrEqual(res.w);
    expect(res.offenders).toEqual([]);
  }
});

test('reduced motion: all reveals visible', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/');
  const reveals = page.locator('.reveal');
  expect(await reveals.count()).toBeGreaterThan(0);
  await expect(page.locator('.reveal--pending')).toHaveCount(0);
  for (const el of await reveals.all()) {
    await expect(el).toHaveCSS('opacity', '1');
  }
});

test('sign-up success sends exactly one request', async ({page}) => {
  const bodies: any[] = [];
  await page.route(ENDPOINT, async (route) => {
    bodies.push(JSON.parse(route.request().postData() ?? '{}'));
    await route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({success: true})});
  });
  await page.goto('/');
  await fill(page);
  const req = page.waitForRequest(ENDPOINT);
  await page.locator('#signup-submit').click();
  await req;
  await expect(page.locator('#signup-status')).toHaveText(
    "You're on the list, Asha. We'll email asha@example.com when early access opens.",
  );
  expect(bodies).toHaveLength(1);
  expect(bodies[0]).toMatchObject({
    name: 'Asha Rao',
    email: 'asha@example.com',
    phone: '+919876543210',
    age: 34,
    consent: 'yes',
  });
});

test('429 shows rate-limit message and keeps values', async ({page}) => {
  await page.route(ENDPOINT, (r) =>
    r.fulfill({status: 429, contentType: 'application/json', body: JSON.stringify({success: false})}),
  );
  await page.goto('/');
  await fill(page);
  await page.locator('#signup-submit').click();
  await expect(page.locator('#signup-status')).toHaveText(
    'Too many sign-ups right now — please try again in a minute.',
  );
  await expect(page.locator('#name')).toHaveValue('Asha Rao');
  await expect(page.locator('#email')).toHaveValue('asha@example.com');
  await expect(page.locator('#phone')).toHaveValue('98765 43210');
  await expect(page.locator('#age')).toHaveValue('34');
  await expect(page.locator('#consent')).toBeChecked();
});

test('network failure shows network message', async ({page}) => {
  await page.route(ENDPOINT, (r) => r.abort());
  await page.goto('/');
  await fill(page);
  await page.locator('#signup-submit').click();
  await expect(page.locator('#signup-status')).toHaveText(
    "Couldn't reach the sign-up service. Check your connection and try again.",
  );
});

test('empty submit focuses name and shows errors', async ({page}) => {
  let hits = 0;
  await page.route(ENDPOINT, (r) => {
    hits++;
    return r.abort();
  });
  await page.goto('/');
  await page.locator('#signup-submit').click();
  await expect(page.locator('#name')).toBeFocused();
  await expect(page.locator('#name-error')).toBeVisible();
  await expect(page.locator('#name-error')).toHaveText('Please enter your name.');
  expect(hits).toBe(0);
});

test('environment picker changes description', async ({page}) => {
  await page.goto('/');
  const desc = page.locator('#env-desc');
  const before = await desc.textContent();
  await page.locator('#env-picker [data-env="cafe"]').click();
  await expect(desc).toHaveText('Busy places with many voices. Less rumble, clearer speech.');
  expect(before).not.toBe('Busy places with many voices. Less rumble, clearer speech.');
  await expect(page.locator('#env-picker [data-env="cafe"]')).toHaveAttribute('aria-checked', 'true');
});

test('hearing profile: visible, charts rendered, café toggle retunes the boosts', async ({page}) => {
  await page.goto('/');
  const section = page.locator('#profile');
  await section.scrollIntoViewIfNeeded();
  await expect(section).toBeVisible();
  await expect(section.locator('.profile-panel')).toHaveCount(3);
  await expect(section.locator('#profile-chart svg[role="img"]')).toBeVisible();
  const values = section.locator('#boost-chart .boost-value');
  await expect(values).toHaveCount(6);
  await expect(values.nth(2)).toHaveText('+6.1 dB');
  const cafe = section.locator('#boost-mode [role="radio"]', {hasText: 'Café'});
  await cafe.click();
  await expect(cafe).toHaveAttribute('aria-checked', 'true');
  await expect(values.nth(2)).toHaveText('+3.1 dB');
});

test('hearing profile: axis labels are at least 12px on screen', async ({page}) => {
  await page.goto('/');
  await page.locator('#profile-chart').scrollIntoViewIfNeeded();
  const sizes = await page.locator('#profile-chart svg text').evaluateAll(els =>
    els.map(el => (el as SVGTextElement).getBoundingClientRect().height),
  );
  expect(sizes.length).toBeGreaterThan(0);
  // Rendered glyph box height tracks font size; 12px text yields a box of roughly 12px or more.
  for (const h of sizes) expect(h).toBeGreaterThanOrEqual(11.5);
});

test('reduced motion: no pitch pulse', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/');
  await expect(page.locator('#profile .is-pulsing')).toHaveCount(0);
});

test('reduced motion: no islands, no aurora canvas, CTA as authored', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500); // longer than the idle-callback timeout
  await expect(page.locator('html[data-islands]')).toHaveCount(0);
  await expect(page.locator('#hero canvas')).toHaveCount(0);
  await expect(page.locator('.hero-aurora, .star-border-container, .card-spotlight')).toHaveCount(0);
  await expect(page.locator('#hero .hero-actions a[href="#join"]')).toHaveText('Join early access');
});

test('motion: hero CTA keeps its link, name, focus ring and 44px target', async ({page}) => {
  await page.goto('/');
  await page.waitForSelector('html[data-islands="ready"]', {state: 'attached'});
  const cta = page.locator('#hero .hero-actions a[href="#join"]');
  await expect(cta.locator('.star-border-container')).toHaveCount(1);
  await expect(page.locator('#hero').getByRole('link', {name: 'Join early access', exact: true})).toHaveCount(1);
  await expect(page.locator('header .star-border-container')).toHaveCount(0);
  const box = (await cta.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.width).toBeGreaterThanOrEqual(44);
  await cta.focus();
  await expect(cta).toBeFocused();
  // Keyboard focus shows the site's ring on the link itself (not clipped by the border effect).
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(cta).toHaveCSS('outline-style', 'solid');
  await cta.click();
  await expect(page).toHaveURL(/#join$/);
});

test('motion: aurora is decorative and non-interactive (or absent without WebGL)', async ({page}) => {
  await page.goto('/');
  await page.waitForSelector('html[data-islands="ready"]', {state: 'attached'});
  const host = page.locator('#hero > .hero-aurora');
  if ((await host.count()) === 0) {
    // No WebGL: the CSS gradient stays and nothing is mounted.
    await expect(page.locator('#hero canvas')).toHaveCount(0);
    return;
  }
  await expect(host).toHaveAttribute('aria-hidden', 'true');
  await expect(host).toHaveCSS('pointer-events', 'none');
  await expect(host.locator('canvas')).toHaveCount(1);
  // The copy still receives clicks above it.
  await page.locator('#hero .hero-actions a[href="#how"]').click();
  await expect(page).toHaveURL(/#how$/);
});

test('spotlight cards: fine pointers only', async ({page}, info) => {
  await page.goto('/');
  await page.waitForSelector('html[data-islands="ready"]', {state: 'attached'});
  const layers = page.locator('#honest .card-spotlight, #privacy-promise .card-spotlight, #profile .card-spotlight');
  if (info.project.name === 'chromium-mobile') {
    await expect(layers).toHaveCount(0);
  } else {
    expect(await layers.count()).toBeGreaterThanOrEqual(9);
    await expect(page.locator('#how .card-spotlight')).toHaveCount(0);
  }
});
