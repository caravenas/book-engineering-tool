import { expect, test, type Locator, type Page } from '@playwright/test';

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
function controlNameCounts(
  page: Page,
  root = 'body',
  options: { visibleOnly?: boolean; outsideSteps?: boolean; outsidePreview?: boolean; outsideSwitch?: boolean } = {}
): Promise<Record<string, number>> {
  return page.evaluate(({ selector, visibleOnly, outsideSteps, outsidePreview, outsideSwitch }) => {
    const scope = document.querySelector(selector);
    if (!scope) throw new Error(`No element matches ${selector}`);
    /*
     * Only what is actually rendered. A closed <details> keeps its children in
     * the DOM, so querySelectorAll alone would report controls nobody can
     * reach and the guard would pass while the accordion hid half the tool.
     */
    const controls = Array.from(scope.querySelectorAll('button, input, select, textarea'))
      .filter(control => !visibleOnly || (control as HTMLElement).getClientRects().length > 0)
      .filter(control => !outsideSteps || !control.closest('.spec-step-body'))
      .filter(control => !outsidePreview || !control.closest('.column-preview'))
      // The switch itself is counted once, with the rest of the page, rather
      // than once per view it is walked through.
      .filter(control => !outsideSwitch || !control.closest('.preview-switch'));
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
  }, {
    selector: root,
    visibleOnly: options.visibleOnly ?? true,
    outsideSteps: options.outsideSteps ?? false,
    outsidePreview: options.outsidePreview ?? false,
    outsideSwitch: options.outsideSwitch ?? false,
  });
}

/**
 * The spec sheet is an exclusive accordion, so its steps cannot all be open at
 * once and a control inside a closed step, while still in the DOM, is not
 * reachable. Counting the document in one pass would therefore count controls
 * nobody can touch. Walking the steps instead asserts the stronger thing: that
 * every step opens, and that between them they still hold every control.
 */
async function reachableControlNameCounts(page: Page): Promise<Record<string, number>> {
  const totals: Record<string, number> = {};
  const add = (counts: Record<string, number>) => {
    for (const [name, count] of Object.entries(counts)) {
      totals[name] = (totals[name] ?? 0) + count;
    }
  };

  const steps = page.locator('details.spec-step');
  const stepCount = await steps.count();
  for (let index = 0; index < stepCount; index += 1) {
    await ensureOpen(steps.nth(index));
    add(await controlNameCounts(page, `details.spec-step:nth-of-type(${index + 1}) .spec-step-body`));
  }

  // The preview column shows one drawing at a time, so its controls have to be
  // walked the same way: the shown-side switch only exists while the sheet is
  // the drawing on screen.
  const views = page.locator('.preview-switch-option');
  const viewCount = await views.count();
  for (let index = 0; index < viewCount; index += 1) {
    await views.nth(index).click();
    add(await controlNameCounts(page, '.column-preview', { outsideSwitch: true }));
  }

  // The switch is counted once rather than once per view it walks through.
  add(await controlNameCounts(page, '.preview-switch'));

  // Whatever lives outside both: the notices, and anything the layout grows
  // later. Counting named regions could quietly miss a control added somewhere
  // else, so the walk is reconciled against the page below.
  add(await controlNameCounts(page, 'main', { outsideSteps: true, outsidePreview: true }));
  return totals;
}

/** Opens a step, or leaves it open: clicking one already open would close it. */
async function ensureOpen(step: Locator): Promise<void> {
  if (await step.evaluate(element => (element as HTMLDetailsElement).open)) return;
  await step.locator('summary').click();
  await expect(step).toHaveAttribute('open', '');
}

/** Opens the step a control lives in, so a test can reach it. */
async function openStep(page: Page, title: string): Promise<void> {
  await ensureOpen(page.locator('details.spec-step', { has: page.getByRole('heading', { name: title, exact: true }) }));
}

/** Every `.stat-label` in the results column, regardless of which component put it there. */
function resultLabels(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('.column-results .stat-label')).map(el => el.textContent?.trim() ?? ''));
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
  // The four views of the preview column, added by R-3c. Every other entry
  // below is a control the app already had before the layout moved.
  'Página': 1,
  'Lomo': 1,
  'Pliego': 1,
  'Tapa': 1,
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

/**
 * The declared caliper is the one figure that is not a result of the page
 * count: it describes the paper itself, so it lives beside the paper in step
 * 02 rather than in the results column. It is checked apart from the rest for
 * that reason, and because a step can be closed while the column cannot.
 */
const CALIPER_LABEL = 'Calibre declarado';

const EXPECTED_RESULT_LABELS = [
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
const EXPECTED_RESULT_LABEL_COUNT = 16;

test.describe('page-wide inventory of controls and results, at 1440x900', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openTheApp(page);
  });

  test('every interactive control is reachable, wherever R-3 puts it', async ({ page }) => {
    const counts = await reachableControlNameCounts(page);
    expect(counts).toEqual(EXPECTED_CONTROL_NAME_COUNTS);
  });

  /**
   * The walk visits named regions, so a control put somewhere it does not look
   * would go uncounted and the comparison above would still match. A sweep of
   * the document cannot be required to match it exactly, because an unselected
   * view is unmounted rather than hidden and so is genuinely absent. What must
   * hold is that the sweep finds nothing the walk missed.
   */
  test('the walk reaches every control the page is holding', async ({ page }) => {
    const walked = await reachableControlNameCounts(page);
    const onScreen = await controlNameCounts(page, 'main', { visibleOnly: false });

    const missed = Object.entries(onScreen)
      .filter(([name, count]) => (walked[name] ?? 0) < count)
      .map(([name]) => name);
    expect(missed).toEqual([]);
  });

  test('every result label is still present, wherever R-3 puts it', async ({ page }) => {
    const labels = await resultLabels(page);
    expect(labels.length).toBe(EXPECTED_RESULT_LABEL_COUNT);
    expect(new Set(labels)).toEqual(new Set(EXPECTED_RESULT_LABELS));
  });

  test('the declared caliper is shown with the paper it describes', async ({ page }) => {
    await openStep(page, 'Papel interior');
    await expect(page.getByText(CALIPER_LABEL, { exact: true })).toBeVisible();
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
    await openStep(page, 'Páginas y encuadernación');
    const pagesInput = page.locator('#input-pages');

    await expect(pagesInput).toHaveValue('32');
    await expect(pagesInput).toHaveAttribute('aria-invalid', 'false');
    expect((await resultLabels(page)).length).toBe(EXPECTED_RESULT_LABEL_COUNT);

    // `fill('')` drives React's onChange, unlike assigning `.value` directly.
    await pagesInput.fill('');
    await expect(pagesInput).toHaveAttribute('aria-invalid', 'true');
    // Each of the four calculations that depend on the page count says so on
    // its own: asserting only that some error appeared would pass while three
    // of them failed silently.
    await expect(page.locator('.calculation-error')).toHaveCount(4);
    // Every figure in the column comes from the page count, so an invalid one
    // empties it completely.
    expect(await resultLabels(page)).toEqual([]);

    await pagesInput.fill('32');
    await expect(pagesInput).toHaveAttribute('aria-invalid', 'false');
    // By identity and not only by count: one label duplicated while another
    // vanished would keep the count right and the page wrong.
    expect(new Set(await resultLabels(page))).toEqual(new Set(EXPECTED_RESULT_LABELS));
    expect((await resultLabels(page)).length).toBe(EXPECTED_RESULT_LABEL_COUNT);
  });
});
