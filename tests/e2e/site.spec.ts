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
    const res = await page.evaluate(() => {
      const w = window.innerWidth;
      const offenders = [...document.querySelectorAll('body *')]
        .filter((el) => {
          const cs = getComputedStyle(el);
          if (cs.position === 'fixed' || cs.display === 'none') return false;
          return el.getBoundingClientRect().right > w + 0.5;
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
