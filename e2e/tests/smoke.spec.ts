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
