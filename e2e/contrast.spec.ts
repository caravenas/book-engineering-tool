import { expect, test, type Page } from '@playwright/test';

/**
 * A control that cannot be read is broken however well it works, and the way
 * a control stops being readable is almost always a state that changes one of
 * its two colours and not the other. Hover is the state that does it: the
 * rule that lights a card up on hover is written for a card that is not
 * chosen, and applied to the chosen one it repaints the ink background white
 * and leaves the white text on it.
 *
 * Measured rather than eyeballed, and measured in a browser, because a
 * computed colour is the result of the whole cascade — which rule won, and at
 * what specificity — and jsdom resolves none of it.
 */
async function openTheApp(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('.app-grid')).toBeVisible();
}

/**
 * The contrast between a control's own text and the background it is
 * actually painted on, by WCAG's relative-luminance formula. The background
 * is looked for up the tree, because a transparent card is painted by
 * whatever is behind it.
 */
const MEASURE_CONTRAST = (selector: string) => {
  function channel(value: number): number {
    const ratio = value / 255;
    return ratio <= 0.04045 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
  }

  function luminance(color: string): number | null {
    const parts = color.match(/[\d.]+/g);
    if (!parts || parts.length < 3) return null;
    // A fully transparent colour paints nothing, so it is not a colour here.
    if (parts.length > 3 && Number(parts[3]) === 0) return null;
    const [r, g, b] = parts.slice(0, 3).map(Number);
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  }

  function paintedBehind(element: Element): number | null {
    let node: Element | null = element;
    while (node) {
      const behind = luminance(getComputedStyle(node).backgroundColor);
      if (behind !== null) return behind;
      node = node.parentElement;
    }
    return null;
  }

  return Array.from(document.querySelectorAll<HTMLElement>(selector))
    .filter(element => element.getClientRects().length > 0)
    /*
     * Not what is drawn rather than said. The paper grid marks a weight a
     * paper does not sell with a faint middle dot, hidden from assistive
     * technology precisely because it is a gap and not a value; it is meant
     * to be barely there, and measuring it as text would be measuring the
     * wrong thing.
     */
    .filter(element => element.getAttribute('aria-hidden') !== 'true')
    .map(element => {
      const ink = luminance(getComputedStyle(element).color);
      const paper = paintedBehind(element);
      if (ink === null || paper === null) return null;
      const lighter = Math.max(ink, paper);
      const darker = Math.min(ink, paper);
      return {
        name: (element.textContent ?? '').trim().slice(0, 40)
          || element.getAttribute('aria-label')
          || element.id,
        ratio: Math.round(((lighter + 0.05) / (darker + 0.05)) * 10) / 10,
      };
    })
    .filter((measured): measured is { name: string; ratio: number } => measured !== null);
};

/** Every card of the spec sheet, with every step open. */
async function openEveryStep(page: Page): Promise<void> {
  const steps = page.locator('details.spec-step');
  for (let index = 0; index < await steps.count(); index += 1) {
    const step = steps.nth(index);
    if (!await step.evaluate(element => (element as HTMLDetailsElement).open)) {
      await step.locator('summary').click();
    }
  }
}

test('no card of the spec sheet loses its text under the pointer', async ({ page }) => {
  await openTheApp(page);
  /*
   * A card fades into its hover colour over 150ms, so a colour read the
   * instant the pointer arrives is a colour the card is only passing
   * through — which is how the first version of this test passed while the
   * bug it was written for was on screen. What is asserted is where the
   * fade ends, so the fade is taken out rather than waited for, thirty
   * times over.
   */
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });
  await openEveryStep(page);

  const cards = page.locator('.column-spec .option-card:not(:disabled)');
  const count = await cards.count();
  expect(count).toBeGreaterThan(10);

  const unreadable: string[] = [];
  let measuredCards = 0;
  for (let index = 0; index < count; index += 1) {
    await cards.nth(index).hover();
    /*
     * Only the card under the pointer: hovering the next one is what puts
     * the previous one back, so the whole sheet is measured in the one state
     * that matters for each card in turn.
     */
    const measured = await page.evaluate(MEASURE_CONTRAST, '.column-spec .option-card:hover');
    measuredCards += measured.length;
    for (const { name, ratio } of measured) {
      // 4.5:1 is what ordinary text needs to stay readable. The card's own
      // colours either side of it are 14:1 and 13:1, so nothing legitimate
      // lands anywhere near the line.
      if (ratio < 4.5) unreadable.push(`«${name}» queda en ${ratio}:1 bajo el puntero`);
    }
  }

  // Nothing measured is not a pass: it is a selector that stopped matching.
  expect(measuredCards).toBe(count);
  expect(unreadable).toEqual([]);
});

/**
 * The same measurement on the catalog board, which marks its chosen cell the
 * same way the sheet does — filled with ink — and so can lose it the same
 * way. It does not today, because every one of its hover rules was written
 * with `:not(.selected)` from the start; this is here so that stays true.
 */
test('no cell of the catalog board loses its text under the pointer', async ({ page }) => {
  await openTheApp(page);
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });
  await page.locator('.central-tab', { hasText: 'Catálogo' }).click();
  await expect(page.locator('.catalog-board')).toBeVisible();

  // Every cell that says something: the gaps of the paper grid are drawn to
  // be barely there, and the measurement leaves them out for the same reason.
  const cells = page.locator([
    '.catalog-board .board-cell:not([disabled])',
    '.catalog-board .board-row',
    '.catalog-board .board-paper-cell:not(.board-paper-cell-empty)',
  ].join(', '));
  const count = await cells.count();
  expect(count).toBeGreaterThan(20);

  const unreadable: string[] = [];
  let measured = 0;
  for (let index = 0; index < count; index += 1) {
    const cell = cells.nth(index);
    await cell.scrollIntoViewIfNeeded();
    await cell.hover();
    const readings = await page.evaluate(MEASURE_CONTRAST, [
      '.catalog-board .board-cell:hover',
      '.catalog-board .board-row:hover',
      '.catalog-board .board-paper-cell:not(.board-paper-cell-empty):hover',
    ].join(', '));
    measured += readings.length;
    for (const { name, ratio } of readings) {
      if (ratio < 4.5) unreadable.push(`«${name}» queda en ${ratio}:1 bajo el puntero`);
    }
  }

  expect(measured).toBe(count);
  expect(unreadable).toEqual([]);
});
