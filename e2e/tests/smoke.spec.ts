import { expect, test } from '@playwright/test';

// Runs against a fresh, uninitialized server.
const admin = { email: 'admin@seearr.test', password: 'smoke-test-pass' };

test.describe.configure({ mode: 'serial' });

test('first-run setup creates the admin account', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/setup/);
  await expect(page.getByText('Welcome to Seearr')).toBeVisible();

  await page.getByPlaceholder('admin@example.com').fill(admin.email);
  const passwords = page.locator('input[type="password"]');
  await passwords.nth(0).fill(admin.password);
  await passwords.nth(1).fill(admin.password);
  await page.getByRole('button', { name: 'Create Account' }).click();

  await expect(
    page.getByText('Account created! Now configure your services.')
  ).toBeVisible();
  await page.getByRole('button', { name: 'Finish Setup' }).click();
  await expect(page).not.toHaveURL(/\/setup/);
});

test('signs in with the local account', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);

  await page.locator('input[name="email"]').fill(admin.email);
  await page.locator('input[name="password"]').fill(admin.password);
  await page.getByTestId('local-signin-button').click();

  await expect(page).not.toHaveURL(/\/login/);
  const me = await page.request.get('/api/v1/auth/me');
  expect(me.ok()).toBeTruthy();
  expect((await me.json()).email).toBe(admin.email);
});

test('admin pages load after sign-in', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(admin.email);
  await page.locator('input[name="password"]').fill(admin.password);
  await page.getByTestId('local-signin-button').click();
  await expect(page).not.toHaveURL(/\/login/);

  for (const path of [
    '/settings/main',
    '/settings/users',
    '/settings/services',
    '/settings/jobs',
    '/users',
    '/requests',
  ]) {
    const errors: string[] = [];
    const onError = (e: Error) => errors.push(e.message);
    page.on('pageerror', onError);
    const res = await page.goto(path);
    expect(res?.status(), path).toBeLessThan(400);
    await expect(page, path).toHaveURL(new RegExp(`${path}(\\?|$)`));
    await expect(page.locator('main')).toBeVisible();
    expect(errors, path).toEqual([]);
    page.off('pageerror', onError);
  }
});

test('library page shows its empty state and keeps filters in the URL', async ({
  page,
}) => {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(admin.email);
  await page.locator('input[name="password"]').fill(admin.password);
  await page.getByTestId('local-signin-button').click();
  await expect(page).not.toHaveURL(/\/login/);

  await page.locator('a[href="/library"]:visible').first().click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByText('Nothing here yet')).toBeVisible();

  await page.getByLabel('Media type').selectOption('movie');
  await expect(page).toHaveURL(/type=movie/);
  await page.getByLabel('Sort by').selectOption('modified');
  await expect(page).toHaveURL(/sort=modified/);
  await expect(page.getByText('Nothing here yet')).toBeVisible();
});

test('recommendations are empty until the user has requests or a library', async ({
  page,
}) => {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(admin.email);
  await page.locator('input[name="password"]').fill(admin.password);
  await page.getByTestId('local-signin-button').click();
  await expect(page).not.toHaveURL(/\/login/);

  const res = await page.request.get('/api/v1/discover/recommended');
  expect(res.ok()).toBeTruthy();
  expect((await res.json()).results).toEqual([]);

  const recent = await page.request.get(
    '/api/v1/discover/recommended?recent=true'
  );
  expect(recent.ok()).toBeTruthy();
  expect((await recent.json()).results).toEqual([]);

  const sliders = await page.request.get('/api/v1/settings/discover');
  expect(sliders.ok()).toBeTruthy();
  expect(
    (await sliders.json())
      .map((s: { type: number }) => s.type)
      .filter((type: number) => type > 1000)
      .sort()
  ).toEqual([1001, 1002]);
});
