import { expect, test, type Page } from '@playwright/test';

/**
 * R-31 is the first of the mobile work, which had been frozen since R-6.
 *
 * The design canvas has nothing to say here — `PliegoStack v2.html` draws one
 * screen, «v2 Escritorio», and no phone — so what is asserted is not
 * faithfulness to a drawing but the four things that made the tool unusable
 * at 390px: a header that spent a quarter of the screen on the tool's name, a
 * spec sheet 3300px tall standing between the reader and everything the tool
 * works out, a hero laid out in two columns inside 342px, and a grid of
 * eleven paper weights squeezed until its headers ran into one another.
 */
const PHONE = { width: 390, height: 844 };

async function openTheApp(page: Page): Promise<void> {
  await page.setViewportSize(PHONE);
  await page.goto('/');
  await expect(page.locator('.app-grid')).toBeVisible();
}

test('the spec sheet starts closed, so what the tool works out is a screen away', async ({ page }) => {
  await openTheApp(page);

  const steps = page.locator('details.spec-step');
  await expect(steps).toHaveCount(5);
  expect(await steps.evaluateAll(nodes => nodes.map(node => (node as HTMLDetailsElement).open)))
    .toEqual([false, false, false, false, false]);

  // Closed, a step still says what it holds — the property the accordion was
  // built for — so the sheet is readable without opening anything.
  const said = await page.locator('.spec-step-value').allInnerTexts();
  expect(said.filter(text => text.trim().length > 0)).toHaveLength(5);

  const measured = await page.evaluate(() => ({
    middle: Math.round(document.querySelector('.column-main')!.getBoundingClientRect().top + window.scrollY),
    header: Math.round(document.querySelector('.app-header')!.getBoundingClientRect().height),
  }));

  // Open, the five steps were 3300px and the middle began below all of them.
  expect(measured.middle).toBeLessThan(1200);
  // And the header is a header, not a title page. It was 202px — a quarter
  // of the screen — and the tool's name was set three sizes larger there
  // than on a desktop.
  expect(measured.header).toBeLessThan(PHONE.height * 0.22);
});

test('a step opens on a phone like anywhere else', async ({ page }) => {
  await openTheApp(page);
  const step = page.locator('details.spec-step').first();

  await step.locator('summary').click();

  await expect(step).toHaveAttribute('open', '');
  await expect(page.locator('#format-vertical')).toBeVisible();
});

test('the book at scale keeps its three drawings on one row', async ({ page }) => {
  await openTheApp(page);
  await expect(page.locator('.hero')).toBeVisible();

  const measured = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>('.hero-item'));
    const drawings = document.querySelector<HTMLElement>('.hero-drawings')!.getBoundingClientRect();
    return {
      rows: new Set(items.map(item => Math.round(item.getBoundingClientRect().top))).size,
      past: items.filter(item => item.getBoundingClientRect().right > drawings.right + 1).length,
      pageWidth: document.querySelector<HTMLElement>('.hero-page')!.getBoundingClientRect().width,
      share: drawings.width / document.querySelector<HTMLElement>('.results-view')!.getBoundingClientRect().width,
    };
  });

  /*
   * The whole claim of the hero is that the page, the edge and the stack are
   * drawn at one scale. A drawing that wrapped to a row of its own is no
   * longer being compared with anything.
   */
  expect(measured.rows).toBe(1);
  expect(measured.past).toBe(0);
  /*
   * And they are drawn, not implied. Left in two columns at this width the
   * second track's 260px floor took the row and the three of them shrank
   * into 58px between them — one row, nothing overflowing, and a page eleven
   * pixels wide.
   */
  expect(measured.share).toBeGreaterThan(0.7);
  expect(measured.pageWidth).toBeGreaterThan(100);
});

test('the grid of papers scrolls sideways rather than squashing its columns', async ({ page }) => {
  await openTheApp(page);
  await page.locator('.central-tab', { hasText: 'Catálogo' }).click();

  const grid = page.locator('.board-paper-scroll');
  await expect(grid).toBeVisible();

  const measured = await page.evaluate(() => {
    const scroller = document.querySelector<HTMLElement>('.board-paper-scroll')!;
    const cells = Array.from(document.querySelectorAll<HTMLElement>('.board-paper-cell'));
    return {
      scrolls: scroller.scrollWidth > scroller.clientWidth,
      narrowest: Math.min(...cells.map(cell => cell.getBoundingClientRect().width)),
      page: document.documentElement.scrollWidth > window.innerWidth,
    };
  });

  expect(measured.scrolls).toBe(true);
  // Wide enough for three digits and the tick above them. Squeezed into a
  // share of 342px they were 13px and the headers ran together.
  expect(measured.narrowest).toBeGreaterThanOrEqual(40);
  // And the page itself still does not move sideways: the grid scrolls, not
  // the document under it.
  expect(measured.page).toBe(false);
});
