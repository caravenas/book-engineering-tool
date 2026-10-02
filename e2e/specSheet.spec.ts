import { expect, test, type Page } from '@playwright/test';

/**
 * UX-8: the spec sheet that is printed. Vitest checks what it says; what it
 * measures is asserted here, in a browser, because jsdom lays nothing out:
 * there every width is zero and a claim that the page fits a sheet passes
 * whatever the stylesheet says.
 */

/** A portrait A4 at 96 dpi, which is what the browser prints a page into. */
const A4_PORTRAIT = { width: 794, height: 1123 };

async function openTheApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('.app-grid')).toBeVisible();
}

async function openTheSheet(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Exportar ficha' }).click();
  await expect(page.getByRole('heading', { name: 'Ficha técnica del libro', level: 1 })).toBeVisible();
}

/** Names the elements whose right edge falls outside the viewport. */
function elementsPastTheRightEdge(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const limit = window.innerWidth + 0.5;
    return Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .filter(element => element.getClientRects().length > 0)
      .map(element => ({ element, box: element.getBoundingClientRect() }))
      .filter(({ box }) => box.width > 2 && box.right > limit)
      .slice(0, 5)
      .map(({ element, box }) => `${element.tagName.toLowerCase()}.${element.className.toString().trim().split(/\s+/).join('.')} ends at ${Math.round(box.right)}px`);
  });
}

test.describe('printed', () => {
  test.use({ viewport: A4_PORTRAIT });

  test('the sheet fits the width of a portrait sheet without overflowing', async ({ page }) => {
    await openTheApp(page);
    await openTheSheet(page);
    await page.emulateMedia({ media: 'print' });

    const widths = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      sheet: document.querySelector('.sheet-doc')!.getBoundingClientRect().width,
    }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport);
    expect(widths.sheet).toBeGreaterThan(widths.viewport * 0.9);
    expect(await elementsPastTheRightEdge(page)).toEqual([]);
  });

  test('it shows none of the tool\'s controls', async ({ page }) => {
    await openTheApp(page);
    await openTheSheet(page);
    await page.emulateMedia({ media: 'print' });

    // Not one button, field, or step of the tool is on the page, and neither
    // is the sheet's own toolbar.
    for (const selector of ['button', 'input', 'select', 'summary', '.app-header', '.app-grid', '.central-tabs', '.sheet-toolbar']) {
      await expect(page.locator(selector).filter({ visible: true }), selector).toHaveCount(0);
    }
    await expect(page.getByRole('heading', { name: 'Ficha técnica del libro' })).toBeVisible();
  });

  test('a reason in place of a figure does not push the sheet past the edge', async ({ page }) => {
    await openTheApp(page);
    // With no page count nothing that depends on it can be calculated, so the
    // sheet carries the engines' own sentences where the figures would be.
    // A sheet of paper is narrower than the tool's breakpoint, so its steps
    // start closed.
    await page.locator('summary', { hasText: 'Páginas y encuadernación' }).click();
    await page.locator('#input-pages').fill('');
    await openTheSheet(page);
    await page.emulateMedia({ media: 'print' });

    await expect(page.getByText('No calculable').first()).toBeVisible();
    expect(await page.getByText('No calculable').count()).toBeGreaterThan(3);
    expect(await elementsPastTheRightEdge(page)).toEqual([]);
  });
});

test.describe('on the screen', () => {
  test('the sheet fits a phone, and the control has a row of its own under the header', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openTheApp(page);

    const control = page.getByRole('button', { name: 'Exportar ficha' });
    const geometry = await page.evaluate(() => {
      const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
      return { tabs: box('.central-tabs'), summary: box('.header-summary'), control: box('.header-export'), header: box('.app-header') };
    });
    expect(geometry.control.top).toBeGreaterThanOrEqual(geometry.summary.bottom - 1);
    expect(geometry.control.top).toBeGreaterThanOrEqual(geometry.tabs.bottom - 1);
    expect(geometry.control.right).toBeLessThanOrEqual(390);
    expect(geometry.control.height).toBeGreaterThanOrEqual(40);
    expect(geometry.control.bottom).toBeLessThanOrEqual(geometry.header.bottom + 1);

    await control.click();
    await expect(page.getByRole('heading', { name: 'Ficha técnica del libro', level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    expect(await elementsPastTheRightEdge(page)).toEqual([]);
  });

  test('at desktop width the control is at the far end of the header', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openTheApp(page);

    const geometry = await page.evaluate(() => {
      const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
      return { control: box('.header-export'), header: box('.app-header') };
    });
    // The header's own padding is 24px; the control is flush with it.
    expect(geometry.header.right - geometry.control.right).toBeLessThanOrEqual(32);
    expect(geometry.control.top).toBeGreaterThanOrEqual(geometry.header.top);
    expect(geometry.control.bottom).toBeLessThanOrEqual(geometry.header.bottom + 1);
  });

  test('going back finds the tool where it was left', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openTheApp(page);
    await page.getByRole('button', { name: 'Visualización' }).click();

    await openTheSheet(page);
    await expect(page.locator('.app-grid')).toBeHidden();
    await page.getByRole('button', { name: 'Volver a la herramienta' }).click();

    await expect(page.locator('.app-grid')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Visualización' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Exportar ficha' })).toBeFocused();
  });
});
