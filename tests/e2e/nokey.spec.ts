import {test, expect} from '@playwright/test';

// Runs against the build made with an empty VITE_WEB3FORMS_KEY (see playwright.config.ts).
test.use({baseURL: 'http://localhost:4174'});

test('no key: honest notice, inert form, nothing sent to Web3Forms', async ({page}) => {
  const web3forms: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('api.web3forms.com')) web3forms.push(r.url());
  });
  await page.route(/api\.web3forms\.com/, (r) => r.abort());

  await page.goto('/');
  await page.locator('#join').scrollIntoViewIfNeeded();

  const notice = page.locator('#signup .signup-closed');
  await expect(notice).toBeVisible();
  await expect(notice).toHaveText(
    'Sign-ups open very soon. Want a heads-up? Email us at shresthajain.iitb@gmail.com.',
  );
  await expect(notice.locator('a')).toHaveAttribute('href', 'mailto:shresthajain.iitb@gmail.com');

  const inputs = page.locator('#signup input');
  expect(await inputs.count()).toBeGreaterThanOrEqual(6);
  for (const input of await inputs.all()) await expect(input).toBeDisabled();

  await expect(page.locator('#signup button[type="submit"]:visible')).toHaveCount(0);

  // Try to submit anyway: Enter in a field (disabled fields can't take focus, so also
  // focus via script and press Enter), plus a synthetic submit event.
  await page.locator('#name').focus().catch(() => {});
  await page.keyboard.press('Enter');
  await page.locator('#email').dispatchEvent('keydown', {key: 'Enter'});
  await page.evaluate(() => {
    const f = document.getElementById('signup') as HTMLFormElement;
    f.dispatchEvent(new Event('submit', {cancelable: true, bubbles: true}));
  });
  await page.waitForTimeout(500);
  expect(web3forms).toEqual([]);
});

test('no key: axe finds zero violations', async ({page}) => {
  const AxeBuilder = (await import('@axe-core/playwright')).default;
  await page.goto('/');
  for (const el of await page.locator('.reveal').all()) await el.scrollIntoViewIfNeeded();
  await expect(page.locator('.reveal--pending')).toHaveCount(0);
  for (const el of await page.locator('.reveal').all()) await expect(el).toHaveCSS('opacity', '1');
  const results = await new AxeBuilder({page})
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
});
