import { expect, test, type Page } from '@playwright/test';

/**
 * docs/PLAN.md's R-2 will extract each panel's results and diagram into their
 * own components, without moving where they render. This test pins the two
 * things that refactor must not change: each panel's rendered height and the
 * ordered list of result labels it contains. If R-2 moves a stat card between
 * panels, or a layout change shifts a panel's height, this fails and names
 * the panel, rather than the refactor silently drifting.
 */

const PANEL_IDS = [
  'canvas-designer',
  'substrate-selector',
  'spine-calculator',
  'binding-panel',
  'imposition-visualizer',
  'cover-panel',
] as const;

/**
 * Heights measured at 1440x900 on 2026-09-19, on Chromium via this harness.
 * A tolerance of 2px absorbs sub-pixel rounding differences between runs on
 * the same engine, without being wide enough to hide a moved or resized
 * result card, which shifts a panel's height by a full line or more.
 */
const EXPECTED_HEIGHTS: Record<(typeof PANEL_IDS)[number], number> = {
  'canvas-designer': 603,
  'substrate-selector': 424,
  'spine-calculator': 461,
  'binding-panel': 482,
  'imposition-visualizer': 1126,
  'cover-panel': 895,
};
const HEIGHT_TOLERANCE_PX = 2;

const EXPECTED_LABELS: Record<(typeof PANEL_IDS)[number], string[]> = {
  'canvas-designer': [],
  'substrate-selector': ['Calibre declarado'],
  'spine-calculator': ['Lomo estimado (mm)', 'Peso estimado del papel interior', 'Hojas de papel (interior)', 'Gramaje'],
  'binding-panel': ['Lomo del papel interior (mm)', 'Aporte de la encuadernación (mm)', 'Grosor del papel en el pliegue (mm)'],
  'imposition-visualizer': [
    'Páginas / cara del pliego',
    'Firmas por ejemplar',
    'Páginas en blanco',
    'Pliegos de prensa por ejemplar',
    'Área imprimible no utilizada',
    'Orientación de página',
  ],
  // The default cover selection is a soft cover, so only its three stat
  // cards render; the hardcover ("dura") stat cards are a different branch.
  'cover-panel': ['Ancho del pliego de tapa (mm)', 'Alto del pliego de tapa (mm)', 'Peso del papel de tapa'],
};

/** The grid only renders once the seven config files have loaded and validated. */
async function openTheApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('.app-grid')).toBeVisible();
}

function panelHeight(page: Page, id: string): Promise<number> {
  return page.evaluate(panelId => {
    const panel = document.getElementById(panelId);
    if (!panel) throw new Error(`Panel #${panelId} not found`);
    return panel.getBoundingClientRect().height;
  }, id);
}

function panelStatLabels(page: Page, id: string): Promise<string[]> {
  return page.evaluate(panelId => {
    const panel = document.getElementById(panelId);
    if (!panel) throw new Error(`Panel #${panelId} not found`);
    return Array.from(panel.querySelectorAll('.stat-label')).map(el => el.textContent?.trim() ?? '');
  }, id);
}

test.describe('panel results and layout, at 1440x900', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openTheApp(page);
  });

  for (const id of PANEL_IDS) {
    test(`#${id} keeps its height and result labels in place`, async ({ page }) => {
      const height = await panelHeight(page, id);
      expect(Math.round(height)).toBeGreaterThanOrEqual(EXPECTED_HEIGHTS[id] - HEIGHT_TOLERANCE_PX);
      expect(Math.round(height)).toBeLessThanOrEqual(EXPECTED_HEIGHTS[id] + HEIGHT_TOLERANCE_PX);

      const labels = await panelStatLabels(page, id);
      expect(labels).toEqual(EXPECTED_LABELS[id]);
    });
  }
});
