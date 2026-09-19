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
