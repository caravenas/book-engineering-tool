import { expect, test, type Page } from '@playwright/test';

/**
 * R-23 draws six of the results. A drawing is a claim about proportion — that
 * this spine is a fifth of that one, that this much of the sheet is printed —
 * and a claim about proportion can only be checked where something is laid
 * out. jsdom lays out nothing: there every width is zero and an assertion
 * about one passes whatever the CSS says.
 *
 * What the unit tests pin is the text of the figures; what is pinned here is
 * that the pictures agree with it.
 */
async function openTheApp(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/');
  await expect(page.locator('.app-grid')).toBeVisible();
  await expect(page.locator('.figure-grid')).toBeVisible();
}

test('the spine is drawn on the same scale as the spines it is compared to', async ({ page }) => {
  await openTheApp(page);

  const measured = await page.evaluate(() => {
    const marks = Array.from(document.querySelectorAll<HTMLElement>('.spine-bars .spine-bar'));
    const width = (bar: HTMLElement) => bar.querySelector('.spine-bar-mark')!.getBoundingClientRect().width;
    const labelled = marks.filter(bar => !bar.classList.contains('current'));
    return {
      references: labelled.map(bar => ({
        mm: Number((bar.querySelector('.spine-bar-label')!.textContent ?? '').replace(' mm', '')),
        width: width(bar),
      })),
      current: width(marks.find(bar => bar.classList.contains('current'))!),
      value: document.querySelector('.spine-bars')!
        .closest('.figure')!.querySelector('.stat-value')!.textContent,
    };
  });

  expect(measured.references).toHaveLength(4);
  const spine_mm = Number(measured.value);
  expect(spine_mm).toBeGreaterThan(0);

  /*
   * One scale for all five bars. The 5mm reference is clamped to a minimum
   * width so it never disappears, so the widest reference is the one the
   * scale is read from: a bar that is off-scale is the whole failure mode
   * here — a drawing that says a 2mm spine is half a 40mm one.
   */
  const widest = measured.references[measured.references.length - 1];
  expect(widest.mm).toBe(40);
  const pixelsPerMm = widest.width / widest.mm;
  expect(measured.current).toBeCloseTo(spine_mm * pixelsPerMm, 0);
});

test('the bar of the waste figure is filled by exactly what it reports', async ({ page }) => {
  await openTheApp(page);

  const measured = await page.evaluate(() => {
    const figure = document.querySelector('.waste-row')!.closest('.figure')!;
    return {
      track: figure.querySelector('.waste-bar')!.getBoundingClientRect().width,
      fill: figure.querySelector('.waste-fill')!.getBoundingClientRect().width,
      used: Number(figure.querySelector('.stat-value')!.textContent),
      // The pages of the real imposition, drawn on the little sheet.
      cells: figure.querySelectorAll('.waste-cell').length,
    };
  });

  expect(measured.used).toBeGreaterThan(0);
  expect((measured.fill / measured.track) * 100).toBeCloseTo(measured.used, 0);
  // The default book prints eight pages a side, and every one of them is
  // drawn: a sheet showing fewer would make the waste look larger than it is.
  expect(measured.cells).toBe(8);
});

test('the book at scale draws the page in the proportion the sheet holds', async ({ page }) => {
  await openTheApp(page);

  const measured = await page.evaluate(() => {
    const page_ = document.querySelector('.hero-page')!.getBoundingClientRect();
    const spine = document.querySelector('.hero-spine')!.getBoundingClientRect();
    return { width: page_.width, height: page_.height, spine: spine.width, spineHeight: spine.height };
  });

  // The default book: 140 × 210, which is 2:3.
  expect(measured.height / measured.width).toBeCloseTo(210 / 140, 2);
  // The spine stands as tall as the page, because it is the same book seen
  // end-on, and it is narrower than the page even at eight times its size.
  expect(measured.spineHeight).toBeCloseTo(measured.height, 0);
  expect(measured.spine).toBeLessThan(measured.width);
});
