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
  options: {
    visibleOnly?: boolean;
    outsideSteps?: boolean;
    outsideCatalog?: boolean;
    outsideCatalogList?: boolean;
    outsideBoardEntries?: boolean;
  } = {}
): Promise<Record<string, number>> {
  return page.evaluate(({ selector, visibleOnly, outsideSteps, outsideCatalog, outsideCatalogList, outsideBoardEntries }) => {
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
      .filter(control => !outsideCatalog || !control.closest('.catalog-editor'))
      /*
       * A row of a catalog list is a control — it chooses which entry the
       * form edits — but its accessible name is the shipped catalog's own
       * data, so counting it here would turn this map into a snapshot of
       * public/config/ and break the build the day someone adds a paper.
       * What matters about the rows is that every entry has one, and that is
       * asserted on its own below.
       */
      .filter(control => !outsideCatalogList || !control.closest('.catalog-list'))
      /*
       * And, for the same reason, the cells of the catalog board: every one
       * of them is named after a catalog entry, so counting them here would
       * make this map a snapshot of public/config/. That the board offers
       * every entry, and marks the one in use, is asserted on its own below.
       */
      .filter(control => !outsideBoardEntries
        || !control.closest('.board-cell, .board-row, .board-paper-cell'))
      /*
       * And, for the same reason, the drawn options of a step whose choices
       * are catalog entries: since R-13 a step offers one card per entry
       * instead of one <option> per entry, so counting them by name would put
       * every paper, press, sheet and cover the shipped catalog declares into
       * the map below. That every entry has a card, and that exactly one is
       * chosen, is asserted on its own further down.
       */
      .filter(control => !control.closest('.option-group-catalog'));
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
    outsideCatalog: options.outsideCatalog ?? false,
    outsideCatalogList: options.outsideCatalogList ?? false,
    outsideBoardEntries: options.outsideBoardEntries ?? false,
  });
}

/** Switches the middle of the screen to one of its three views. */
async function showCentralView(page: Page, name: 'Resultados' | 'Visualización' | 'Catálogo'): Promise<void> {
  await page.locator('.central-tab', { hasText: name }).click();
}

/**
 * The spec sheet is an exclusive accordion, so its steps cannot all be open at
 * once and a control inside a closed step, while still in the DOM, is not
 * reachable. Counting the document in one pass would therefore count controls
 * nobody can touch. Walking the steps instead asserts the stronger thing: that
 * every step opens, and that between them they still hold every control.
 *
 * Since R-22 the middle of the screen is walked the same way, and for the same
 * reason: it holds one of three views at a time, and the two it is not showing
 * are unmounted rather than hidden.
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

  // Visualización holds the four drawings at once since R-24, so there is
  // nothing to walk: what it carries is on screen the moment it is shown.
  await showCentralView(page, 'Visualización');
  add(await controlNameCounts(page, '.column-main'));

  // The board, minus its cells: every one of those is named after a catalog
  // entry, and the map below is not a copy of public/config/.
  await showCentralView(page, 'Catálogo');
  add(await controlNameCounts(page, '.catalog-board', { outsideBoardEntries: true }));

  /*
   * The editor slides in over the board, so nothing inside it is reachable
   * until it is opened, and it shows one catalog at a time for the same
   * reason the steps do. Its navigation is counted once; each catalog's own
   * controls are counted as the walk arrives at them.
   */
  await page.getByRole('button', { name: 'Opciones de imposición' }).click();
  // It slides in, so the walk waits for it rather than counting an empty box.
  await expect(page.locator('.catalog-editor .catalog-header')).toBeVisible();
  add(await controlNameCounts(page, '.catalog-header'));
  add(await controlNameCounts(page, '.catalog-nav'));
  const catalogs = page.locator('.catalog-nav-item');
  const catalogCount = await catalogs.count();
  for (let index = 0; index < catalogCount; index += 1) {
    await catalogs.nth(index).click();
    add(await controlNameCounts(page, '.catalog-content', { outsideCatalogList: true }));
  }
  await page.getByRole('button', { name: 'Cerrar catálogo' }).click();

  // Whatever lives outside all of it: the header's own switch, the notices,
  // and anything the layout grows later. Counted with the figures on screen,
  // which carry no controls of their own, so nothing here is counted twice.
  // Naming regions could quietly miss a control added somewhere else, so the
  // walk is reconciled against the page below.
  await showCentralView(page, 'Resultados');
  add(await controlNameCounts(page, 'body', { outsideSteps: true, outsideCatalog: true }));
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

/** Every `.stat-label` in the figures view, regardless of which component put it there. */
function resultLabels(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('.results-view .stat-label')).map(el => el.textContent?.trim() ?? ''));
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
  // What the middle of the screen is showing, added by R-22. The header used
  // to carry a way into the catalog instead; the catalog is one of the three
  // views now, so the name stayed and what it does changed.
  'Resultados': 1,
  'Visualización': 1,
  'Catálogo': 1,

  /*
   * The four drawings had a switch of their own from R-3c to R-23 — Página,
   * Lomo, Pliego, Tapa — and it is gone: since R-24 all four are on screen
   * together, named by a heading apiece rather than chosen by a button. The
   * only control left among them is the sheet's own two sides.
   */

  // The way from each section of the board to the catalog that changes it,
  // added by R-22: the board chooses, the dialog behind these edits.
  'Editar el catálogo de proporciones': 1,
  'Editar el catálogo de papeles': 1,
  'Editar el catálogo de pliegos': 1,
  'Editar el catálogo de encuadernaciones': 1,
  'Editar el catálogo de tapas': 1,

  // The editor, added by R-4a: the way out, one entry per catalog, and the
  // press form that moved in from the imposition step.
  'Cerrar catálogo': 1,
  // One per step since R-19, named for the step rather than for the catalog
  // it opens: the rest are reached from the catalog's own navigation.
  'Opciones de formato': 1,
  'Opciones de imposición': 1,
  'Opciones de páginas y encuadernación': 1,
  'Proporciones, 5 entradas': 1,
  'Papeles, 7 entradas': 1,
  'Encuadernaciones, 4 entradas': 1,
  'Prensas, 2 entradas': 1,
  'Pliegos, 6 entradas': 1,
  'Esquemas de plegado, 2 entradas, solo lectura': 1,
  'Tapas, 3 entradas': 1,
  'Opciones de papel': 1,
  'Opciones de tapa': 1,
  '+ Nuevo gramaje': 1,
  'Gramaje': 1,
  'Calibre declarado': 1,

  // One form serves the six editable catalogs, so the controls it always
  // carries appear once per catalog, and each catalog adds its own fields.
  // Papers joined them in R-10 and covers in R-11: a print shop that buys a
  // paper the catalog does not list can now add it instead of editing a file.
  'Nombre': 5,
  'Ocultar': 6,
  'Guardar cambios': 6,
  '+ Nuevo papel': 1,
  '+ Nueva tapa': 1,
  // A cover is made of another catalog's entry, so its material is chosen
  // rather than typed. The default cover is soft, so the four measurements
  // only a hard one has are not on screen to be counted.
  'Tipo': 1,
  'Papel de la tapa': 1,
  'Gramaje de la tapa': 1,
  'Ancho de solapa': 1,
  '+ Nueva prensa': 1,
  '+ Nuevo pliego': 1,
  '+ Nueva encuadernación': 1,
  '+ Nueva proporción': 1,
  'Pliego máximo · ancho': 1,
  'Pliego máximo · alto': 1,
  'Pinza': 1,
  'Lateral': 1,
  'Cola': 1,
  'Calle': 1,
  // Two apiece since R-14: the step's own measurements are named for what
  // they measure, and the catalog's sheet form has always named its fields
  // the same way. Different places, same word, counted where each one lives.
  'Ancho': 2,
  'Alto': 2,
  'Múltiplo de páginas': 1,
  'Mínimo de páginas': 1,
  'Máximo de páginas': 1,
  'Aporte al lomo': 1,
  'Anida los pliegos': 1,
  'Exige múltiplo de firma': 1,
  'Etiqueta': 1,
  'Ancho de la razón': 1,
  'Alto de la razón': 1,
  'Descripción': 2,

  // Everything below was already in the app before the layout moved.
  'Apaisado': 1,
  'Cara mostrada': 1,
  'Cuadrado': 1,
  'Páginas': 1,
  'Añadir una firma': 1,
  'Quitar una firma': 1,
  'Sangrado': 1,
  'Vertical': 1,
};

/**
 * The declared caliper is the one figure that is not a result of the page
 * count: it describes the paper itself, so it lives beside the paper in step
 * 02 rather than in the results column. It is checked apart from the rest for
 * that reason, and because a step can be closed while the column cannot.
 */
const CALIPER_LABEL = 'Calibre declarado';

/*
 * Since R-21 a label is the name of the figure and nothing else: the unit
 * moved out of the parentheses and next to the figure, where it belongs to
 * the number rather than to what the number is called.
 *
 * Since R-23 six of them are drawn rather than listed, and carry the same
 * class so they are still counted here. Five of the old labels became three
 * on the way, and no number left the page with them: the two weights are
 * printed inside the one weight that adds them, and the cover sheet's width
 * and height inside the one measurement that gives both. One label did go —
 * «Lomo del papel interior», which restated the spine engine's own
 * `thickness_mm` beside «Lomo estimado», the same number under two names.
 */
const EXPECTED_RESULT_LABELS = [
  // Drawn, since R-23.
  'Grosor del papel en el pliegue',
  'Peso del papel por ejemplar',
  'Pliegos de prensa por ejemplar',
  'Firmas por ejemplar',
  'Aprovechamiento del pliego',
  'Tapa extendida',
  // Listed: what the six above are made of, and what a drawing cannot show.
  'Lomo estimado',
  'Hojas de papel (interior)',
  'Gramaje',
  'Aporte de la encuadernación',
  'Corrimiento máx.',
  'Páginas / cara del pliego',
  'Páginas en blanco',
  'Orientación de página',
] as const;
const EXPECTED_RESULT_LABEL_COUNT = 14;

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
    const onScreen = await controlNameCounts(page, 'body', { visibleOnly: false, outsideCatalogList: true });

    const missed = Object.entries(onScreen)
      .filter(([name, count]) => (walked[name] ?? 0) < count)
      .map(([name]) => name);
    expect(missed).toEqual([]);
  });

  /**
   * The rows of the catalog lists, asserted as the structure they are rather
   * than as the data they carry: every entry a catalog declares has a row you
   * can choose, and exactly one of them is the entry the form is on.
   *
   * Counting them by accessible name would have worked too, and would have
   * embedded the shipped catalog in this file — a snapshot of
   * public/config/ that breaks the day someone adds a paper, which teaches
   * whoever hits it to overwrite the expectation instead of reading it.
   */
  test('every catalog entry has a row to choose it by, and one is marked', async ({ page }) => {
    await page.getByRole('button', { name: 'Opciones de imposición' }).click();
    const catalogs = page.locator('.catalog-nav-item');

    for (let index = 0; index < await catalogs.count(); index += 1) {
      const item = catalogs.nth(index);
      await item.click();
      const declared = Number(await item.locator('.catalog-nav-count').innerText());
      const rows = page.locator('.catalog-entry-list > li > .catalog-list-item');

      expect(declared).toBeGreaterThan(0);
      expect(await rows.count(), `catálogo ${index + 1}`).toBe(declared);
      // The folding schemes have no form, so nothing is under one there.
      const marked = await rows.locator('[aria-current="true"]').count();
      expect(marked, `catálogo ${index + 1}`).toBeLessThanOrEqual(1);
    }

    await page.getByRole('button', { name: 'Cerrar catálogo' }).click();
  });

  /**
   * The drawn options of the steps, asserted the same way and for the same
   * reason as the catalog rows: what has to hold is that every group offers
   * something and settles on exactly one choice, not which names the shipped
   * catalog happens to carry. This is the half of R-13 that the control map
   * above deliberately stops counting.
   */
  test('every group of drawn options has one choice marked', async ({ page }) => {
    const steps = page.locator('details.spec-step');

    for (let index = 0; index < await steps.count(); index += 1) {
      await ensureOpen(steps.nth(index));
      const groups = steps.nth(index).locator('.option-group');

      for (let group = 0; group < await groups.count(); group += 1) {
        const options = groups.nth(group).locator('.option-card');
        // Chained on the group, not on the options: an option is itself the
        // element that says whether it is chosen, and a locator chained on the
        // cards would look for that inside them and find nothing.
        const chosen = groups.nth(group).locator('.option-card[aria-pressed="true"]');
        const where = `paso ${index + 1}, grupo ${group + 1}`;

        expect(await options.count(), where).toBeGreaterThan(0);
        expect(await chosen.count(), where).toBe(1);
      }
    }
  });

  /**
   * The board, asserted as the structure it is rather than as the data it
   * carries, for the same reason the catalog rows are: every catalog it draws
   * offers something, and settles on exactly one choice. The paper grid is the
   * exception the canvas does not have — a caliper is declared per weight here,
   * not computed from one, so a paper that does not sell a weight leaves that
   * cell empty — and what is asserted there is that at least one cell exists
   * and exactly one is marked.
   */
  test('every section of the board offers its catalog and marks one choice', async ({ page }) => {
    await showCentralView(page, 'Catálogo');
    const board = page.locator('.catalog-board');
    await expect(board).toBeVisible();

    // A · proporciones, B · papeles, C · pliegos y prensas (two groups),
    // D · encuadernación y plegado (two groups), E · tapas.
    const groups = [
      '.board-proportions .board-proportion',
      '.board-paper-grid .board-paper-cell',
      '.board-sheets .board-sheet',
      '.board-rows .board-row:has(.board-press-shape)',
      '.board-rows .board-row:has(.board-binding-mark)',
      '.board-folds .board-fold',
      '.board-covers .board-cover',
    ];

    for (const selector of groups) {
      const options = board.locator(selector);
      const chosen = board.locator(`${selector}[aria-pressed="true"]`);
      expect(await options.count(), selector).toBeGreaterThan(0);
      expect(await chosen.count(), selector).toBe(1);
    }

    // Five sections, each with the way into the catalog that changes it.
    await expect(board.locator('.board-section')).toHaveCount(5);
    await expect(board.locator('.board-section-edit')).toHaveCount(5);
  });

  /**
   * Choosing on the board changes the book, which is what a board is for: it
   * reads the catalogs and applies them, and the editing dialog behind each
   * «editar» is the one that changes the catalogs themselves.
   */
  test('a cell of the board applies itself to the spec sheet', async ({ page }) => {
    await showCentralView(page, 'Catálogo');
    const target = page.locator('.board-sheets .board-sheet[aria-pressed="false"]:not([disabled])').first();
    const name = (await target.locator('.board-sheet-name').innerText()).trim();
    await target.click();

    await expect(page.locator('.board-sheets .board-sheet[aria-pressed="true"] .board-sheet-name')).toHaveText(name);

    await showCentralView(page, 'Resultados');
    await openStep(page, 'Imposición');
    // A field names its group through `aria-labelledby`; the id it is given
    // belongs to the label, not to the group, so the group is found by it.
    const sheetGroup = page.locator('[aria-labelledby="sheet-size-group-label"]');
    await expect(sheetGroup.locator('.option-card[aria-pressed="true"] .option-name')).toHaveText(name);
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
   * A hard cover reports nine figures the default state never shows, because
   * the shipped default is a saddle-stitched book and a saddle stitch has no
   * flat spine to glue boards to. Nothing was checking them: the guard audits
   * the default state, so the whole hardcover branch could break without a
   * single test noticing.
   */
  test('a hard cover reports the boards and the wrap it needs', async ({ page }) => {
    await openStep(page, 'Páginas y encuadernación');
    await page.locator('#binding-hotmelt').click();

    await openStep(page, 'Tapa');
    await page.locator('#cover-dura_estandar').click();

    expect(new Set(await resultLabels(page))).toEqual(new Set([
      // The boards, which only a hard cover has. Its wrap and its weight are
      // in the two drawn figures below, as a soft cover's sheet is.
      'Ancho del cartón lateral',
      'Alto del cartón',
      'Ancho del cartón de lomo',
      'Área de cartón lateral',
      'Área de cartón de lomo',
      'Área total de cartón',
      // Drawn: a flat spine is named for the spine it makes, and a hotmelt
      // does not nest its sheets, so it reports no creep.
      'Lomo final con encuadernación',
      'Peso del papel por ejemplar',
      'Pliegos de prensa por ejemplar',
      'Firmas por ejemplar',
      'Aprovechamiento del pliego',
      'Tapa extendida',
      'Lomo estimado',
      'Hojas de papel (interior)',
      'Gramaje',
      'Aporte de la encuadernación',
      'Páginas / cara del pliego',
      'Páginas en blanco',
      'Orientación de página',
    ]));
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

/**
 * Deleting a custom entry used to be a 27px button with a ::before overlay
 * grown to a usable size, which a unit test pinned by class name because
 * jsdom cannot measure anything. In the catalog it is an ordinary button, so
 * the guarantee is now a size, and a size is what this measures. 40px is the
 * floor this app sets for a pointer target on a desktop layout.
 */
/** Measures the controls a selector names, or the ones a container holds. */
const MEASURE_TOO_SMALL = (selector: string) => Array
  .from(document.querySelectorAll<HTMLElement>(selector))
  .filter(control => control.getClientRects().length > 0)
  // A checkbox is sized by its own rule and hit through its label, so it is
  // measured by the label's box rather than its own.
  .filter(control => !(control instanceof HTMLInputElement && control.type === 'checkbox'))
  .filter(control => control.getBoundingClientRect().height < 40)
  .map(control => `${control.textContent?.trim() || control.getAttribute('aria-label') || control.id} is ${Math.round(control.getBoundingClientRect().height)}px`);

test('every control is big enough to hit, in the catalog and on the way to it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('.app-grid')).toBeVisible();

  const tooSmall: string[] = [];

  /*
   * The catalog and the buttons that open it, which is what has been built to
   * this rule so far. The controls still in the steps do not meet it — the
   * segmented buttons are 23px, the fields 35, the grammage chips 21 — and
   * that is the restyle's job, not something to assert before it is done. When
   * that increment lands, this measures the steps too and has to stay green.
   */
  tooSmall.push(...await page.evaluate(MEASURE_TOO_SMALL, '.step-options, .central-tab'));

  await page.getByRole('button', { name: 'Opciones de imposición' }).click();
  const catalogs = page.locator('.catalog-nav-item');
  for (let index = 0; index < await catalogs.count(); index += 1) {
    await catalogs.nth(index).click();
    tooSmall.push(...await page.evaluate(MEASURE_TOO_SMALL, '.catalog-editor button, .catalog-editor input, .catalog-editor select'));
  }

  expect(tooSmall).toEqual([]);
});
