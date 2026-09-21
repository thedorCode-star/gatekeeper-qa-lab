import { test, expect } from '@playwright/test';

test('generates a pizza recommendation', async ({ page }) => {
  await page.goto('https://quickpizza.grafana.com/');
  await page.getByRole('button', { name: 'Pizza, Please!' }).click();

  await expect(page.getByText('Our recommendation:')).toBeVisible();
  await expect(page.getByText(/^Name:/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Love it!' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'No thanks' })).toBeVisible();
});
