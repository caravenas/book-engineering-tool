import { expect, test, type Page } from '@playwright/test';

/**
 * R-14 turns the three measurements into figures in a line, with three ways
 * to change one: typing it, nudging it with the arrows, and dragging its unit
 * sideways. Typing was already covered by the unit tests, which drive the
 * input's change event directly. The other two cannot be: a drag is a
 * sequence of real pointer events with pointer capture in the middle of it,
 * and shift-arrow depends on the browser's own handling of a number input
 * being suppressed. Both are reproduced here as the gesture, not as the call
 * the gesture ends in.
 */
async function openTheApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('.app-grid')).toBeVisible();
  // The format step is the one the app opens on, so the measurements are there.
  await expect(page.locator('#input-width')).toBeVisible();
}

test('dragging a measurement by its unit changes it, and redraws the page', async ({ page }) => {
  await openTheApp(page);
  await expect(page.locator('#input-width')).toHaveValue('140');

  const handle = page.locator('.measure-field:has(#input-width) .measure-unit');
  const box = await handle.boundingBox();
  if (!box) throw new Error('the width handle is not on screen');
  const y = box.y + box.height / 2;

  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  // Three pixels to the millimetre, so thirty pixels is ten millimetres.
  await page.mouse.move(box.x + box.width / 2 + 30, y, { steps: 6 });
  await page.mouse.up();

  await expect(page.locator('#input-width')).toHaveValue('150');
  /*
   * The reason to drag rather than type is that the drawing follows, so what
   * is asserted is the measurement written beside the drawing, not the field.
   * Since R-22 the drawings are one of the three views of the middle of the
   * screen, so the drag happens in the sheet and the drawing is looked at
   * afterwards — which is how it is used, with the sheet always on the left.
   */
  await page.locator('.central-tab', { hasText: 'Visualización' }).click();
  await expect(page.locator('.page-figure')).toContainText('150 mm');
  // 2:3 is on, so the height came with it: 150 × 3/2.
  await expect(page.locator('.page-figure')).toContainText('225 mm');
});

test('a drag that leaves the handle keeps changing the measurement', async ({ page }) => {
  await openTheApp(page);

  const handle = page.locator('.measure-field:has(#input-width) .measure-unit');
  const box = await handle.boundingBox();
  if (!box) throw new Error('the width handle is not on screen');

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  /*
   * Well outside the handle, which is some forty pixels wide: a drag of any
   * useful length leaves it at once, and without pointer capture the moves
   * would land on whatever is under the pointer instead.
   */
  await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 + 120, { steps: 10 });
  await page.mouse.up();

  await expect(page.locator('#input-width')).toHaveValue('170');
});

test('the arrows move a measurement one step, and ten with shift', async ({ page }) => {
  await openTheApp(page);

  const width = page.locator('#input-width');
  await width.focus();

  await page.keyboard.press('ArrowUp');
  await expect(width).toHaveValue('141');

  await page.keyboard.press('Shift+ArrowUp');
  await expect(width).toHaveValue('151');

  await page.keyboard.press('Shift+ArrowDown');
  await expect(width).toHaveValue('141');

  await page.keyboard.press('ArrowDown');
  await expect(width).toHaveValue('140');
});

/**
 * A bleed is a few millimetres wide, so it moves half a millimetre a step and
 * needs four times the pointer travel of a page dimension: the same gesture
 * that adds ten millimetres to a width adds one to a bleed.
 */
test('the bleed drags at its own scale', async ({ page }) => {
  await openTheApp(page);
  await expect(page.locator('#input-bleed')).toHaveValue('3');

  const handle = page.locator('.measure-field:has(#input-bleed) .measure-unit');
  const box = await handle.boundingBox();
  if (!box) throw new Error('the bleed handle is not on screen');
  const y = box.y + box.height / 2;

  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 24, y, { steps: 6 });
  await page.mouse.up();

  await expect(page.locator('#input-bleed')).toHaveValue('4');
});

/**
 * Editing a measurement by hand keeps the proportion and moves the other side
 * with it. Until R-28 it dropped the proportion to Manual, which is the
 * opposite of what a proportion is for: choosing 2:3 and then typing a width
 * is asking for the 2:3 page that is this wide, not asking to stop having a
 * proportion. The note in the margin said «fijado por 2:3» on the height
 * alone, which read as "you cannot change this" and meant "changing this
 * throws 2:3 away".
 */
test('a measurement keeps its proportion and moves the other side', async ({ page }) => {
  await openTheApp(page);

  const width = page.locator('#input-width');
  const height = page.locator('#input-height');
  await expect(width).toHaveValue('140');
  await expect(height).toHaveValue('210');
  // The note belongs to both measurements now, because either one moves the
  // other: it names the proportion rather than claiming a side is frozen.
  await expect(page.locator('.measure-field:has(#input-width) .field-marginalia')).toHaveText('2:3');
  await expect(page.locator('.measure-field:has(#input-height) .field-marginalia')).toHaveText('2:3');

  await width.focus();
  await page.keyboard.press('ArrowUp');

  await expect(width).toHaveValue('141');
  // 141 × 3/2, which is the same arithmetic choosing 2:3 does.
  await expect(height).toHaveValue('211.5');
  await expect(page.locator('#proportion-2\\:3')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#proportion-custom')).toHaveAttribute('aria-pressed', 'false');

  // And the other way round: the height settles the width just the same.
  await height.fill('300');
  await expect(width).toHaveValue('200');
  await expect(page.locator('#proportion-2\\:3')).toHaveAttribute('aria-pressed', 'true');
});

/** Manual is what asks for a page no proportion decides. */
test('Manual lets the two measurements move on their own', async ({ page }) => {
  await openTheApp(page);
  await page.locator('#proportion-custom').click();
  await expect(page.locator('.measure-field:has(#input-height) .field-marginalia')).toHaveCount(0);

  await page.locator('#input-width').fill('180');

  await expect(page.locator('#input-width')).toHaveValue('180');
  await expect(page.locator('#input-height')).toHaveValue('210');
});
