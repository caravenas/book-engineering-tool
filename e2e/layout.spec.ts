import { expect, test, type Page } from '@playwright/test';

/**
 * The three widths docs/UI-INVENTORY.md measured, so a regression is reported
 * by the viewport it appears at rather than by a single anonymous failure.
 */
const VIEWPORTS = [
  { label: 'desktop', width: 1440, height: 900 },
  { label: 'the breakpoint', width: 1024, height: 900 },
  { label: 'a phone', width: 390, height: 844 },
];

/**
 * Names the elements whose right edge falls outside the viewport. A bare
 * scrollWidth assertion says the page is too wide; this says which element
 * made it too wide, which is the difference between a failure and a fix.
 */
function elementsPastTheRightEdge(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const limit = window.innerWidth + 0.5;
    return Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .map(element => ({ element, box: element.getBoundingClientRect() }))
      .filter(({ box }) => box.width > 2 && box.right > limit)
      .slice(0, 5)
      .map(({ element, box }) => {
        const classes = element.className.toString().trim();
        const name = classes ? `${element.tagName.toLowerCase()}.${classes.split(/\s+/).join('.')}` : element.tagName.toLowerCase();
        return `${name} ends at ${Math.round(box.right)}px`;
      });
  });
}

/** The grid only renders once the seven config files have loaded and validated. */
async function openTheApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('.app-grid')).toBeVisible();
}

for (const { label, width, height } of VIEWPORTS) {
  test(`does not scroll sideways at ${width}px, on ${label}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openTheApp(page);

    expect(await elementsPastTheRightEdge(page)).toEqual([]);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(width);
  });
}

/**
 * R-3's hypothesis, stated as a test: above the breakpoint the tool fits one
 * screen. The page itself must not scroll, and the columns must, which is the
 * difference between fitting and merely being cut off. Asserting only that the
 * page does not scroll would also pass if the columns clipped their content
 * away, so each column is checked for content taller than the space it has.
 */
test('at 1440px the page does not scroll, its columns do', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('.app-grid')).toBeVisible();

  const measured = await page.evaluate(() => {
    const columns = Array.from(document.querySelectorAll<HTMLElement>('.app-column'));
    return {
      pageScrollHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      columns: columns.map(column => ({
        name: column.getAttribute('aria-label') ?? '(sin nombre)',
        clientHeight: column.clientHeight,
        scrollHeight: column.scrollHeight,
        overflowY: getComputedStyle(column).overflowY,
      })),
    };
  });

  expect(measured.pageScrollHeight).toBeLessThanOrEqual(measured.viewportHeight);
  expect(measured.columns).toHaveLength(3);
  for (const column of measured.columns) {
    expect(column.overflowY, `${column.name} must scroll on its own`).toBe('auto');
  }
  // The spec column holds all six panels, so it is the one that certainly
  // overflows; asserting it by name keeps the test honest if the others fit.
  const spec = measured.columns.find(column => column.name === 'Ficha técnica');
  expect(spec?.scrollHeight).toBeGreaterThan(spec?.clientHeight ?? 0);
});
