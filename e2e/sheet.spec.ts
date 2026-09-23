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

  // Since R-24 the call takes the middle of the screen to the catalog view
  // and slides its editor in, rather than covering the tool with a dialog.
  await expect(page.locator('.catalog-editor')).toBeVisible();
  await expect(page.locator('.central-tab.active')).toHaveText('Catálogo');
  await expect(page.getByRole('heading', { name: 'Proporciones', exact: true })).toBeVisible();
  // The call sits inside the step's own summary, so a plain click on it would
  // have folded the step away behind the catalog it just opened.
  await expect(step).toHaveAttribute('open', '');

  await page.getByRole('button', { name: 'Cerrar catálogo' }).click();
  await expect(page.locator('.catalog-editor')).toHaveCount(0);
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

/**
 * R-24 takes the catalog editor out of its modal and puts it in the catalog
 * view, sliding in over the board. The modal brought three things with it
 * that a plain panel does not, and two of them are worth keeping: Escape, and
 * the keyboard going with the panel instead of being left on the page behind
 * it. (The third, making the rest of the page inert, is the one the modal was
 * wrong about: the spec sheet beside it is exactly what someone editing a
 * catalog is looking at.)
 */
test('the editor takes the keyboard, gives it back, and closes on Escape', async ({ page }) => {
  await openTheApp(page);
  const call = page.getByRole('button', { name: 'Opciones de formato' });
  await call.focus();
  await call.press('Enter');

  const panel = page.locator('.catalog-editor-panel');
  await expect(panel).toBeVisible();
  await expect(panel).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(page.locator('.catalog-editor')).toHaveCount(0);
  // Back where it was: the call is still on the page, because the spec sheet
  // was never covered.
  await expect(call).toBeFocused();
});

/** The board is what the catalog view goes back to, and it is never gone. */
test('closing the editor gives the board its place back', async ({ page }) => {
  await openTheApp(page);
  await page.locator('.central-tab', { hasText: 'Catálogo' }).click();
  await expect(page.locator('.catalog-board')).toBeVisible();

  await page.locator('.board-section-edit').first().click();
  await expect(page.locator('.catalog-editor')).toBeVisible();
  // It takes the board's place rather than floating over the whole tool.
  await expect(page.locator('.catalog-board')).toHaveCount(0);

  await page.getByRole('button', { name: 'Cerrar catálogo' }).click();
  await expect(page.locator('.catalog-editor')).toHaveCount(0);
  await expect(page.locator('.catalog-board')).toBeVisible();
});
