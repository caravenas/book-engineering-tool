import { expect, test, type Page } from '@playwright/test';

/**
 * R-19 takes the spec sheet's shape from the design canvas: five sections
 * that open and close on their own, starting open, each with the way into
 * its catalog in the margin of its title.
 *
 * Both properties are the browser's own behaviour rather than the app's — a
 * <details> is exclusive when it carries a `name`, and a click inside a
 * <summary> toggles it — so both are asserted here and not in jsdom, which
 * implements neither faithfully enough to be believed about them.
 */
async function openTheApp(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('.app-grid')).toBeVisible();
}

test('every step opens and closes on its own, and they all start open', async ({ page }) => {
  await openTheApp(page);
  const steps = page.locator('details.spec-step');
  await expect(steps).toHaveCount(5);

  const openFlags = () => steps.evaluateAll(nodes => nodes.map(node => (node as HTMLDetailsElement).open));
  expect(await openFlags()).toEqual([true, true, true, true, true]);

  // Closing one leaves the rest where they were.
  await steps.nth(1).locator('summary').click();
  expect(await openFlags()).toEqual([true, false, true, true, true]);

  // And opening another does not close the first, which is what the shared
  // `name` used to do: until R-19 the sheet could only show one step at a time.
  await steps.nth(1).locator('summary').click();
  await steps.nth(3).locator('summary').click();
  await steps.nth(3).locator('summary').click();
  expect(await openFlags()).toEqual([true, true, true, true, true]);
});

test('the call in a step title opens its catalog without closing the step', async ({ page }) => {
  await openTheApp(page);
  const step = page.locator('details.spec-step').first();
  await expect(step).toHaveAttribute('open', '');

  await page.getByRole('button', { name: 'Opciones de formato' }).click();

  await expect(page.locator('.catalog-dialog')).toBeVisible();
  // The call sits inside the step's own summary, so a plain click on it would
  // have folded the step away behind the catalog it just opened.
  await expect(step).toHaveAttribute('open', '');

  await page.getByRole('button', { name: 'Cerrar catálogo' }).click();
  await expect(step).toHaveAttribute('open', '');
});

/** One call per step, named for the step, reaching every catalog between them. */
test('each step carries its own way into the catalog', async ({ page }) => {
  await openTheApp(page);
  const calls = page.locator('.spec-step-summary .step-options');
  await expect(calls).toHaveCount(5);

  expect(await calls.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')))).toEqual([
    'Opciones de formato',
    'Opciones de papel',
    'Opciones de páginas y encuadernación',
    'Opciones de imposición',
    'Opciones de tapa',
  ]);
});
