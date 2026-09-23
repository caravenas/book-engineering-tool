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

/** Switches the middle of the screen to one of its three views. */
async function showCentralView(page: Page, name: 'Resultados' | 'Visualización' | 'Catálogo'): Promise<void> {
  await page.locator('.central-tab', { hasText: name }).click();
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
  // Two since R-22: the spec sheet, and the middle that holds one of three views.
  expect(measured.columns).toHaveLength(2);
  for (const column of measured.columns) {
    expect(column.overflowY, `${column.name} must scroll on its own`).toBe('auto');
  }
});

/**
 * The escape hatch for a window too short to divide into scrolling
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
  expect(measured.columnOverflow).toEqual(['visible', 'visible']);
});

/**
 * The spec sheet earns the accordion only if it can be read without opening
 * anything, so a summary that ends in an ellipsis is a silent failure: it
 * still looks fine and no longer says what the step holds. A long title
 * squeezing its value is exactly how that happens.
 *
 * What is measured is the closed sheet, and it is measured with every step
 * closed rather than with the one the app opens on. Until R-13 the two were
 * the same thing, because the open step was a column of dropdowns; a step of
 * drawn options is some 150px taller than the window has left, so the open
 * sheet legitimately scrolls its own column — which is what the column is
 * for, and what the design canvas's sidebar does. The property worth pinning
 * is the one the accordion exists for: closed, the whole sheet is readable
 * without scrolling anything.
 */
test('no closed step truncates what it says, and the closed sheet fits', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('.app-grid')).toBeVisible();

  /*
   * The app opens with every step open, and since R-19 they close
   * independently, so the closed sheet is all five closed rather than the one
   * the app happened to open on.
   */
  const steps = page.locator('details.spec-step');
  for (let index = 0; index < await steps.count(); index += 1) {
    const step = steps.nth(index);
    await expect(step).toHaveAttribute('open', '');
    await step.locator('summary').click();
    await expect(step).not.toHaveAttribute('open', '');
  }

  const measured = await page.evaluate(() => ({
    clipped: Array.from(document.querySelectorAll<HTMLElement>('.spec-step-value'))
      .filter(value => value.scrollWidth > value.clientWidth + 1)
      .map(value => value.textContent ?? ''),
    specScrolls: (() => {
      const column = document.querySelector<HTMLElement>('.column-spec');
      return column ? column.scrollHeight > column.clientHeight : true;
    })(),
    pageScrolls: document.documentElement.scrollHeight > window.innerHeight,
  }));

  expect(measured.clipped).toEqual([]);
  // With every step closed the sheet is short enough to sit still.
  expect(measured.specScrolls).toBe(false);
  // And an open step never makes the page itself scroll: the columns do that.
  expect(measured.pageScrolls).toBe(false);
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
 * it: capped at 1440px, a wide monitor drew the seam of the spec column in
 * mid-air with empty page either side. Measured on a screen wider than the
 * old cap, because at or below it the two layouts are indistinguishable.
 */
test('on a wide screen the sheet keeps its width and the middle takes the rest', async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1400 });
  await openTheApp(page);
  await showCentralView(page, 'Visualización');

  const measured = await page.evaluate(() => {
    const box = (selector: string) => {
      const rect = document.querySelector(selector)!.getBoundingClientRect();
      return { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
    };
    return {
      spec: box('.column-spec'),
      main: box('.column-main'),
      grid: box('.preview-grid'),
      cells: Array.from(document.querySelectorAll('.preview-cell')).map(cell => {
        const rect = cell.getBoundingClientRect();
        return { width: Math.round(rect.width), height: Math.round(rect.height) };
      }),
      viewport: window.innerWidth,
    };
  });

  expect(measured.spec.left).toBe(0);
  expect(measured.main.right).toBe(measured.viewport);
  // The sheet keeps the width it has at 1440 — the canvas's own 372 — so every
  // pixel the wider screen adds belongs to the middle.
  expect(measured.spec.width).toBe(372);
  expect(measured.main.left).toBe(372);

  /*
   * And since R-24 the middle spends them on the drawings rather than on
   * margin: four cells, two by two, dividing the whole of it. Until R-23 one
   * drawing sat in a 720px frame in the centre with the rest of the screen
   * blank either side of it.
   */
  expect(measured.cells).toHaveLength(4);
  expect(measured.grid.width).toBeGreaterThan(measured.main.width - 100);
  const widths = new Set(measured.cells.map(cell => cell.width));
  const heights = new Set(measured.cells.map(cell => cell.height));
  expect(widths.size).toBe(1);
  expect(heights.size).toBe(1);
  // Two columns, so a cell is about half the middle.
  expect([...widths][0]).toBeGreaterThan(measured.main.width / 2 - 100);
});

/**
 * The four drawings are shown to be compared, which they cannot be if one of
 * them is a dot in the corner of its cell. Each one fills a good part of the
 * box it was given, at every width the tool claims to work at — which is the
 * whole point of measuring the cell instead of drawing at a fixed size.
 */
for (const { width, height, label } of [
  { width: 1440, height: 900, label: 'desktop' },
  { width: 1024, height: 900, label: 'the breakpoint' },
  { width: 2560, height: 1400, label: 'a wide screen' },
]) {
  test(`every drawing fills the cell it was given at ${width}px, on ${label}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openTheApp(page);
    await showCentralView(page, 'Visualización');
    await expect(page.locator('.preview-cell')).toHaveCount(4);

    const measured = await page.evaluate(() => Array
      .from(document.querySelectorAll<HTMLElement>('.preview-cell'))
      .map(cell => {
        const body = cell.querySelector<HTMLElement>('.preview-cell-body')!.getBoundingClientRect();
        /*
         * The ink, not the box around it: an SVG box can fill its cell while
         * the drawing inside it letterboxes down to a stamp, so what is
         * measured is the shapes — the sheet of paper, the block of the
         * spine, the panels of the cover.
         */
        const shapes = Array.from(cell.querySelectorAll('.page-preview, .spine-block, .sheet-bg, .cover-section-rect, .cover-wrap-rect'))
          .map(shape => shape.getBoundingClientRect());
        const left = Math.min(...shapes.map(box => box.left));
        const right = Math.max(...shapes.map(box => box.right));
        const top = Math.min(...shapes.map(box => box.top));
        const bottom = Math.max(...shapes.map(box => box.bottom));
        /*
         * And nothing at all may fall outside the cell. The drawing is
         * centred in its box, so a drawing given more room than the box has
         * spills equally above and below it and pushes its own measurements
         * out of sight — which the shapes above would not notice, because
         * the shapes would still be inside while the labels around them were
         * already gone.
         */
        const everything = Array.from(cell.querySelectorAll<HTMLElement>('.preview-cell-body *'))
          .map(node => node.getBoundingClientRect())
          .filter(box => box.width > 0 && box.height > 0);

        return {
          name: cell.querySelector('.preview-cell-title')?.textContent ?? '(sin nombre)',
          shapes: shapes.length,
          /*
           * The larger of the two shares. A drawing scaled to fit touches one
           * of the two edges and falls short of the other by however far its
           * proportion differs from the cell's — and a spine is a sliver
           * whatever room it is given, so its width share says nothing.
           */
          share: Math.max((right - left) / body.width, (bottom - top) / body.height),
          clipped: everything.filter(box =>
            box.top < body.top - 1 || box.bottom > body.bottom + 1
            || box.left < body.left - 1 || box.right > body.right + 1
          ).length,
        };
      }));

    expect(measured).toHaveLength(4);
    for (const cell of measured) {
      expect(cell.shapes, `${cell.name} no dibuja nada`).toBeGreaterThan(0);
      expect(cell.clipped, `${cell.name} deja ${cell.clipped} elementos fuera de su celda`).toBe(0);
      // Low enough that a drawing whose proportion fights the cell's still
      // passes, high enough that one stuck at a fixed size does not.
      expect(cell.share, `${cell.name} solo ocupa ${Math.round(cell.share * 100)} % de su celda`)
        .toBeGreaterThan(0.45);
    }
  });
}
