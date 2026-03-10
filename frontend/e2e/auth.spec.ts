import { test, expect } from '@playwright/test';

const timestamp = Date.now();
const testUser = {
  username: `e2e_auth_${timestamp}`,
  password: 'password123',
};

test.describe('Auth flows', () => {
  test('user can register and is redirected to dashboard', async ({ page }) => {
    await page.goto('/');

    // Click Register button in header
    await page.getByRole('button', { name: 'Register' }).click();

    // Fill registration form
    await page.getByLabel('Username').fill(testUser.username);
    await page.getByLabel('Password').fill(testUser.password);
    await page.getByRole('button', { name: 'Create account' }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(
      page.getByText(`Welcome back`, { exact: false }),
    ).toBeVisible();
  });

  test('user can log out and log back in', async ({ page }) => {
    // Register first
    await page.goto('/');
    await page.getByRole('button', { name: 'Register' }).click();
    const loginUser = `e2e_login_${timestamp}`;
    await page.getByLabel('Username').fill(loginUser);
    await page.getByLabel('Password').fill(testUser.password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL('/dashboard');

    // Logout via settings menu
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByText('Logout').click();
    await expect(page).toHaveURL('/');

    // Log back in
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.getByLabel('Username').fill(loginUser);
    await page.getByLabel('Password').fill(testUser.password);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('user sees error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Log in' }).click();

    await page.getByLabel('Username').fill('nonexistent_user');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();

    await expect(
      page.getByText('Invalid username or password'),
    ).toBeVisible();
  });

  test('unauthenticated user visiting /dashboard is redirected to home', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/');
  });

  test('register shows validation error for short username', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Register' }).click();

    await page.getByLabel('Username').fill('ab');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(
      page.getByText('Username must be at least 3 characters'),
    ).toBeVisible();
  });
});
