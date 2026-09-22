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
 * screen. Asserting only that the page does not scroll would also pass if the
 * columns clipped their content away, so each is checked for the overflow rule
 * that makes anything past its bottom reachable rather than lost.
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
});

/**
 * The escape hatch for a window too short to divide into three scrolling
 * columns, which a laptop at heavy browser zoom reaches as easily as a small
 * screen. There the page scrolls as a whole again, because columns a few
 * hundred pixels tall are worse than a long page: this asserts the content is
 * reachable, not merely that it fits.
 */
test('on a short window the page scrolls as a whole instead of the columns', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 600 });
  await page.goto('/');
  await expect(page.locator('.app-grid')).toBeVisible();

  const measured = await page.evaluate(() => ({
    pageScrollHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
    columnOverflow: Array.from(document.querySelectorAll<HTMLElement>('.app-column'))
      .map(column => getComputedStyle(column).overflowY),
  }));

  expect(measured.pageScrollHeight).toBeGreaterThan(measured.viewportHeight);
  expect(measured.columnOverflow).toEqual(['visible', 'visible', 'visible']);
});

/**
 * The spec sheet earns the accordion only if it can be read without opening
 * anything, so a summary that ends in an ellipsis is a silent failure: it
 * still looks fine and no longer says what the step holds. A long title
 * squeezing its value is exactly how that happens.
 */
test('no closed step truncates what it says, and the whole sheet fits', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('.app-grid')).toBeVisible();

  const measured = await page.evaluate(() => ({
    clipped: Array.from(document.querySelectorAll<HTMLElement>('.spec-step-value'))
      .filter(value => value.scrollWidth > value.clientWidth + 1)
      .map(value => value.textContent ?? ''),
    specScrolls: (() => {
      const column = document.querySelector<HTMLElement>('.column-spec');
      return column ? column.scrollHeight > column.clientHeight : true;
    })(),
  }));

  expect(measured.clipped).toEqual([]);
  // With four of five steps closed the sheet is short enough to sit still.
  expect(measured.specScrolls).toBe(false);
});

/**
 * The results bar is a claim about what stays on screen while the page moves
 * under it, and that is a claim about layout: jsdom has no scrolling and no
 * sticky positioning, so only a browser can say whether it holds.
 */
test('on a phone the three headline figures stay put while the page scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openTheApp(page);

  const bar = page.locator('.results-bar');
  await expect(bar).toBeVisible();
  await expect(bar.locator('.results-bar-label')).toHaveText(['Lomo', 'Pliegos', 'Peso interior']);
  // The default book: a saddle stitch on 32 pages of 150 g/m² Couché.
  await expect(bar.locator('.results-bar-value')).toHaveText(['1.92 mm', '2', '70.6 g']);

  // It starts below the header rather than already pinned, so the scroll
  // below is a real change and not a no-op.
  expect((await bar.boundingBox())?.y ?? 0).toBeGreaterThan(0);

  await page.evaluate(() => window.scrollBy(0, 600));
  await expect(bar).toBeVisible();
  const after = await bar.boundingBox();
  // Stuck to the top of the viewport, not carried off with the header.
  expect(Math.round(after?.y ?? -1)).toBe(0);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});

/**
 * Above the breakpoint the results column is already on screen beside the
 * steps, so pinning three of its figures would be saying them twice for no
 * reason. It is not rendered small and hidden: it takes no space at all.
 */
test('at 1440px there is no results bar, because the results never left', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openTheApp(page);

  await expect(page.locator('.results-bar')).toBeHidden();
  expect(await page.evaluate(() => {
    const element = document.querySelector('.results-bar') as HTMLElement;
    return element.getBoundingClientRect().height;
  })).toBe(0);
});

/**
 * The tool spans the screen rather than sitting in a fixed block centred on
 * it: capped at 1440px, a wide monitor drew the seams of the side columns in
 * mid-air with empty page either side. Measured on a screen wider than the
 * old cap, because at or below it the two layouts are indistinguishable.
 */
test('on a wide screen the side columns reach both edges', async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1400 });
  await openTheApp(page);

  const measured = await page.evaluate(() => {
    const box = (selector: string) => {
      const rect = document.querySelector(selector)!.getBoundingClientRect();
      return { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
    };
    return { spec: box('.column-spec'), results: box('.column-results'), stack: box('.preview-stack'), viewport: window.innerWidth };
  });

  expect(measured.spec.left).toBe(0);
  expect(measured.results.right).toBe(measured.viewport);
  // The side columns keep the widths they have at 1440: every pixel the wider
  // screen adds belongs to the middle.
  expect(measured.spec.width).toBe(400);
  expect(measured.results.width).toBe(320);

  /*
   * And the middle spends them on margin, not on stretching. Uncapped, the
   * sheet's drawing sat in an SVG box 1790px wide and the four-way switch
   * spread across the same 1790px, reading as a toolbar rather than a choice.
   */
  expect(measured.stack.width).toBe(720);
  const slack = measured.stack.left - (measured.spec.width);
  expect(slack).toBe(measured.viewport - measured.results.width - measured.stack.right);
});

/**
 * The view switch is a capsule, and a capsule that wraps becomes two half
 * pills. Between 1025 and 1059px the middle column is only 257px wide and it
 * folded, which an independent review of the width change found. Measured
 * across that window rather than at one width, because the width it breaks at
 * depends on the length of four labels.
 */
for (const width of [1025, 1040, 1060, 1200, 1440, 2560]) {
  test(`the view switch stays on one row at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openTheApp(page);

    const measured = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll<HTMLElement>('.preview-switch .segment-btn'));
      return {
        rows: new Set(buttons.map(button => Math.round(button.getBoundingClientRect().top))).size,
        clipped: buttons.filter(button => button.scrollWidth > button.clientWidth + 1).map(button => button.textContent ?? ''),
      };
    });

    expect(measured.rows).toBe(1);
    // On one row is not enough: a label squeezed to an ellipsis would also
    // report one row and say nothing about which view is which.
    expect(measured.clipped).toEqual([]);
  });
}
