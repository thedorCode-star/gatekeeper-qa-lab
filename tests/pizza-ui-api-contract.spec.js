const { test, expect } = require('@playwright/test');

test('displayed pizza matches the recommendation API response', async ({ page }) => {
  await page.goto('https://quickpizza.grafana.com/');

  const responsePromise = page.waitForResponse(
    response =>
      response.url().includes('/api/pizza') &&
      response.request().method() === 'POST'
  );

  await page
    .getByRole('button', { name: /pizza, please!/i })
    .click();

  const response = await responsePromise;

  expect(response.status()).toBe(200);

  const body = await response.json();
  const pizzaName = body.pizza.name;

  await expect(
    page.getByText(`Name: ${pizzaName}`, { exact: true })
  ).toBeVisible();

  expect(Array.isArray(body.pizza.ingredients)).toBe(true);
  expect(body.pizza.ingredients.length).toBeGreaterThan(0);
});