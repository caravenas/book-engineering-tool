import { expect, test, type Page } from '@playwright/test';

/**
 * docs/PLAN.md's R-3 reorganizes the page into three columns, which makes
 * e2e/panels.spec.ts's per-panel heights and panel-to-label mapping obsolete
 * by design: those pin where things render, and R-3's whole point is to move
 * where things render. What must survive that move is R-3's own acceptance
 * criterion: no control and no result disappears. This file is that net,
 * fixed on properties that don't depend on position: the full set of controls
 * on the page, identified by accessible name rather than by which panel or
 * column contains them, and the full set of result labels on the page,
 * counted across the whole document rather than per panel.
 */

/** The grid only renders once the seven config files have loaded and validated. */
async function openTheApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('.app-grid')).toBeVisible();
}

/**
 * Every interactive control on the page, named by accessible name and
 * counted per name, rather than collapsed into a set of names: this app has
 * several controls that legitimately share a bare verb — "Editar", "Añadir",
 * "Ocultar" appear on proportions, sheets, presses and bindings alike — and
 * today each carries a qualifier ("... de fábrica", "... personalizada")
 * that happens to make its full name unique. A set can't tell "two controls
 * named X" from "one", so if R-3 ever drops one of a pair sharing a name, a
 * set-based comparison wouldn't notice: the surviving name would still be in
 * the set. Comparing a name-to-count map catches that, because the count for
 * that name drops. Order is still not part of what's asserted, since R-3 is
 * free to reorder controls along with moving them.
 */
function controlNameCounts(page: Page): Promise<Record<string, number>> {
  return page.evaluate(() => {
    const controls = Array.from(document.querySelectorAll('button, input, select, textarea'));
    /**
     * The accessible name is what a screen reader announces, and is the
     * identity that doesn't change when R-3 moves a control to a different
     * column: an element's position, its parent panel, and its DOM order are
     * all exactly what R-3 is allowed to rewrite. This mirrors the browser's
     * accessible name computation closely enough for this app's markup: an
     * explicit aria-label wins; failing that, the text of the <label>
     * associated via htmlFor or wrapping (the standard way this codebase
     * labels its inputs and selects); failing that, the element's own text
     * content (how every plain button here is named). A control found by
     * none of these has no accessible name, which would itself be a bug
     * worth surfacing rather than papering over.
     */
    function nameOf(element: Element): string {
      const ariaLabel = element.getAttribute('aria-label');
      if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

      const withLabels = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement;
      const labels = 'labels' in withLabels ? withLabels.labels : null;
      if (labels && labels.length > 0) {
        const labelText = Array.from(labels).map(label => label.textContent?.trim() ?? '').join(' ').trim();
        if (labelText) return labelText;
      }

      return element.textContent?.trim() ?? '';
    }
    return controls.map(nameOf).reduce<Record<string, number>>((counts, name) => {
      counts[name] = (counts[name] ?? 0) + 1;
      return counts;
    }, {});
  });
}

/** Every `.stat-label` on the page, regardless of which panel or column contains it. */
function allStatLabels(page: Page): Promise<string[]> {
  return page.evaluate(() => Array.from(document.querySelectorAll('.stat-label')).map(el => el.textContent?.trim() ?? ''));
}

/**
 * Name-to-count map measured at 1440x900 on 2026-09-19, on Chromium via this
 * harness, in the app's default state (factory catalog, no saved user
 * layer). Every name happens to appear exactly once today; the count is
 * still asserted per name, rather than as a single total, so a future
 * duplicate collapsing to one survivor is a mismatch on that one name and
 * not just a total that happens to still add up.
 */
const EXPECTED_CONTROL_NAME_COUNTS: Record<string, number> = {
  '115 g/m²': 1,
  '150 g/m²': 1,
  '1:1': 1,
  '200 g/m²': 1,
  '2:3': 1,
  '300 g/m²': 1,
  '3:5 (Áurea)': 1,
  '90 g/m²': 1,
  'Alto (Cerrado)': 1,
  'Ancho (Cerrado)': 1,
  'Apaisado': 1,
  'Añadir encuadernación personalizada': 1,
  'Añadir gramaje personalizado': 1,
  'Añadir pliego personalizado': 1,
  'Añadir prensa personalizada': 1,
  'Añadir proporción personalizada': 1,
  'Cara mostrada': 1,
  'Cuadrado': 1,
  'Editar encuadernación de fábrica': 1,
  'Editar pliego de fábrica': 1,
  'Editar prensa de fábrica': 1,
  'Editar proporción de fábrica': 1,
  'Encuadernación seleccionada': 1,
  'Esquema de plegado': 1,
  'Manual': 1,
  'NÚMERO DE PÁGINAS': 1,
  'Ocultar encuadernación de fábrica': 1,
  'Ocultar pliego de fábrica': 1,
  'Ocultar prensa de fábrica': 1,
  'Ocultar proporción de fábrica': 1,
  'Pliego seleccionado': 1,
  'Prensa seleccionada': 1,
  'Sangrado (Bleed)': 1,
  'Tipo de papel': 1,
  'Tipo de tapa': 1,
  'Vertical': 1,
};

const EXPECTED_STAT_LABELS = [
  'Calibre declarado',
  'Lomo estimado (mm)',
  'Peso estimado del papel interior',
  'Hojas de papel (interior)',
  'Gramaje',
  'Lomo del papel interior (mm)',
  'Aporte de la encuadernación (mm)',
  'Grosor del papel en el pliegue (mm)',
  'Páginas / cara del pliego',
  'Firmas por ejemplar',
  'Páginas en blanco',
  'Pliegos de prensa por ejemplar',
  'Área imprimible no utilizada',
  'Orientación de página',
  'Ancho del pliego de tapa (mm)',
  'Alto del pliego de tapa (mm)',
  'Peso del papel de tapa',
] as const;
const EXPECTED_STAT_LABEL_COUNT = 17;

test.describe('page-wide inventory of controls and results, at 1440x900', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openTheApp(page);
  });

  test('every interactive control is still present, wherever R-3 puts it', async ({ page }) => {
    const counts = await controlNameCounts(page);
    expect(counts).toEqual(EXPECTED_CONTROL_NAME_COUNTS);
  });

  test('every result label is still present, wherever R-3 puts it', async ({ page }) => {
    const labels = await allStatLabels(page);
    expect(labels.length).toBe(EXPECTED_STAT_LABEL_COUNT);
    expect(new Set(labels)).toEqual(new Set(EXPECTED_STAT_LABELS));
  });

  /**
   * Every result on the page depends on the page count, directly or through
   * the spine, so an invalid one has to clear all of them and a valid one has
   * to bring all of them back. This used to be asserted panel by panel; it is
   * asserted for the whole document now, because R-3 moves results out of the
   * panels that compute them and into a column of their own. What matters is
   * the round trip: an invalid value must not leave anything stuck empty.
   */
  test('an invalid page count clears every result, and a valid one restores them', async ({ page }) => {
    const pagesInput = page.locator('#input-pages');

    await expect(pagesInput).toHaveValue('32');
    await expect(pagesInput).toHaveAttribute('aria-invalid', 'false');
    expect((await allStatLabels(page)).length).toBe(EXPECTED_STAT_LABEL_COUNT);

    // `fill('')` drives React's onChange, unlike assigning `.value` directly.
    await pagesInput.fill('');
    await expect(pagesInput).toHaveAttribute('aria-invalid', 'true');
    // Each of the four calculations that depend on the page count says so on
    // its own: asserting only that some error appeared would pass while three
    // of them failed silently.
    await expect(page.locator('.calculation-error')).toHaveCount(4);
    // The substrate's declared caliper is the one result that does not depend
    // on the page count, so it is the only label that survives an invalid one.
    expect(await allStatLabels(page)).toEqual(['Calibre declarado']);

    await pagesInput.fill('32');
    await expect(pagesInput).toHaveAttribute('aria-invalid', 'false');
    // By identity and not only by count: one label duplicated while another
    // vanished would keep the count right and the page wrong.
    expect(new Set(await allStatLabels(page))).toEqual(new Set(EXPECTED_STAT_LABELS));
    expect((await allStatLabels(page)).length).toBe(EXPECTED_STAT_LABEL_COUNT);
  });
});
