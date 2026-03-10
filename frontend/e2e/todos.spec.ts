import { test, expect } from '@playwright/test';

const timestamp = Date.now();

/**
 * Helper: register a new user and navigate to dashboard.
 */
async function registerAndLogin(
  page: import('@playwright/test').Page,
  suffix: string,
) {
  const username = `e2e_todo_${suffix}_${timestamp}`;
  await page.goto('/');
  await page.getByRole('button', { name: 'Register' }).click();
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/dashboard');
  return username;
}

test.describe('Todo CRUD flows', () => {
  test('user can create a new todo', async ({ page }) => {
    await registerAndLogin(page, 'create');

    await page.getByPlaceholder('What needs to be done?').fill('Buy groceries');
    await page.getByRole('button', { name: 'Add' }).click();

    await expect(page.getByText('Buy groceries')).toBeVisible();
  });

  test('user can create a todo with description', async ({ page }) => {
    await registerAndLogin(page, 'desc');

    await page.getByPlaceholder('What needs to be done?').fill('Plan trip');
    await page.getByText('+ Add description').click();
    await page
      .getByPlaceholder('Description (optional)')
      .fill('Book flights and hotels');
    await page.getByRole('button', { name: 'Add' }).click();

    await expect(page.getByText('Plan trip')).toBeVisible();
    await expect(page.getByText('Book flights and hotels')).toBeVisible();
  });

  test('user can mark a todo as completed', async ({ page }) => {
    await registerAndLogin(page, 'complete');

    await page.getByPlaceholder('What needs to be done?').fill('Finish report');
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('Finish report')).toBeVisible();

    // Click the circle button to mark as complete
    await page.getByRole('button', { name: 'Mark as complete' }).click();

    // The text should have line-through styling (completed state)
    await expect(page.getByRole('button', { name: 'Mark as incomplete' })).toBeVisible();
  });

  test('user can edit a todo title', async ({ page }) => {
    await registerAndLogin(page, 'edit');

    await page.getByPlaceholder('What needs to be done?').fill('Old title');
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('Old title')).toBeVisible();

    // Hover and click edit
    const todoItem = page.getByText('Old title').locator('..').locator('..');
    await todoItem.hover();
    await page.getByRole('button', { name: 'Edit todo' }).click();

    // Clear and type new title
    const titleInput = page.locator('input[value="Old title"]');
    await titleInput.clear();
    await titleInput.fill('New title');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('New title')).toBeVisible();
    await expect(page.getByText('Old title')).not.toBeVisible();
  });

  test('user can delete a todo', async ({ page }) => {
    await registerAndLogin(page, 'delete');

    await page
      .getByPlaceholder('What needs to be done?')
      .fill('Delete me');
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('Delete me')).toBeVisible();

    // Hover and click delete
    const todoItem = page.getByText('Delete me').locator('..').locator('..');
    await todoItem.hover();
    await page.getByRole('button', { name: 'Delete todo' }).click();

    await expect(page.getByText('Delete me')).not.toBeVisible();
  });
});

test.describe('Data isolation', () => {
  test('user A cannot see user B\'s todos', async ({ browser }) => {
    // User A creates a todo
    const pageA = await browser.newPage();
    await registerAndLogin(pageA, 'isolation_a');
    await pageA
      .getByPlaceholder('What needs to be done?')
      .fill('Secret todo from A');
    await pageA.getByRole('button', { name: 'Add' }).click();
    await expect(pageA.getByText('Secret todo from A')).toBeVisible();
    await pageA.close();

    // User B should not see it
    const pageB = await browser.newPage();
    await registerAndLogin(pageB, 'isolation_b');
    await expect(pageB.getByText('Secret todo from A')).not.toBeVisible();
    await expect(
      pageB.getByText('No todos yet. Create one above!'),
    ).toBeVisible();
    await pageB.close();
  });
});

test.describe('UI features', () => {
  test('user can toggle dark/light mode', async ({ page }) => {
    await registerAndLogin(page, 'theme');

    // Check initial theme (dark by default)
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);

    // Toggle theme via settings menu
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByText('Toggle theme').click();

    // Should switch to light
    await expect(html).not.toHaveClass(/dark/);
  });

  test('user can switch between compact and card layout', async ({ page }) => {
    await registerAndLogin(page, 'layout');

    // Create a todo so we can see the layout difference
    await page
      .getByPlaceholder('What needs to be done?')
      .fill('Layout test');
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('Layout test')).toBeVisible();

    // Click layout toggle (should switch to card view)
    await page
      .getByRole('button', { name: /Switch to card view/i })
      .click();

    // Now button should say switch to compact view
    await expect(
      page.getByRole('button', { name: /Switch to compact view/i }),
    ).toBeVisible();
  });
});
