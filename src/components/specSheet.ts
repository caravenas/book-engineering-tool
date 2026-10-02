import { useBookStore, getSafeSpineResult, parsePositiveSafeInteger } from '../store/useBookStore';
import { useBookFigures, type BookFigures } from './bookFigures';
import { getCatalogOrigin, ORIGIN_LABEL } from './CatalogOrigin';
import { CATALOG_TITLES } from './catalogNames';
import {
  formatArea, formatMm, formatRoundedValue, formatWeightParts, getPageDisplayDimensions,
} from '../engine/units';
import type { BookStore } from '../types';

/**
 * What the printable spec sheet says, as data.
 *
 * The page that prints it only lays this out. Keeping the sentences here
 * means the sheet reads the store through the same derivations the screen
 * does (`useBookFigures`, the `getAll*` catalogs, the engines' own error
 * texts) and cannot say a different number, and means a test can compare it
 * to the store without a layout engine.
 *
 * A result that cannot be worked out is a row with a `reason` and no value:
 * a printed sheet is carried to a print shop, and a figure it invents would
 * be believed.
 */
export type SpecSheetRow =
  | { label: string; value: string; unit?: string; note?: string; origin?: string }
  | { label: string; reason: string };

export interface SpecSheetSection {
  id: string;
  title: string;
  rows: SpecSheetRow[];
}

export interface SpecSheetSource {
  catalog: string;
  provisional: boolean;
  /** The file's own words about where its data comes from; none for a ratio. */
  source: string | null;
}

export interface SpecSheet {
  sections: SpecSheetSection[];
  /** Catalogs whose file still declares itself an example, by name. */
  exampleCatalogs: string[];
  sources: SpecSheetSource[];
}

const FORMAT_LABEL = { vertical: 'Vertical', landscape: 'Apaisado', square: 'Cuadrado' } as const;
const PRINTING_MODE_LABEL = { 'tiro-retiro': 'Tiro y retiro, una plancha', 'planchas-separadas': 'Planchas separadas' } as const;

const NOT_CALCULABLE = 'No se pudo calcular.';

/** Beside a name, who the entry belongs to; nothing for a factory entry. */
function originNote(origin: ReturnType<typeof getCatalogOrigin>): string | undefined {
  return origin === 'factory' ? undefined : ORIGIN_LABEL[origin];
}

function figure(label: string, amount: number | null, format: (value: number) => string, unit: string, reason: string): SpecSheetRow {
  return amount === null ? { label, reason } : { label, value: format(amount), unit };
}

/** One rule for the unit, the way the results column writes a weight. */
function weightRow(label: string, grams: number | null, reason: string, note?: string): SpecSheetRow {
  if (grams === null) return { label, reason };
  const { value, unit } = formatWeightParts(grams);
  return { label, value, unit, note };
}

export function buildSpecSheet(state: BookStore, figures: BookFigures): SpecSheet {
  const { catalog } = state;
  const typedPages = parsePositiveSafeInteger(state.totalPagesInput);
  const safeSpine = getSafeSpineResult(state.totalPagesInput, state.spineResult);
  const pagesReason = 'Las páginas están sin definir.';
  const spineReason = state.spineError ?? (typedPages === null ? pagesReason : NOT_CALCULABLE);
  const bindingReason = state.bindingError ?? NOT_CALCULABLE;

  // ─── Format ──────────────────────────────────────────────────────────
  const { displayW, displayH, displayBleed, unit } = getPageDisplayDimensions(
    state.pageWidth_mm, state.pageHeight_mm, state.bleed_mm, state.unitSystem
  );
  const hasDimensions = displayW !== '' && displayH !== '';
  const imperial = state.unitSystem === 'imperial';
  const proportionOrigin = originNote(getCatalogOrigin(
    state.proportionId,
    state.customProportions.map(item => item.label),
    state.proportionPatches.map(patch => patch.label)
  ));

  const format: SpecSheetRow[] = [
    { label: 'Orientación', value: FORMAT_LABEL[state.format] },
    { label: 'Proporción', value: state.proportionId ?? 'manual', origin: proportionOrigin },
    hasDimensions
      ? { label: 'Página (ancho × alto)', value: `${displayW} × ${displayH}`, unit }
      : { label: 'Página (ancho × alto)', reason: 'Las dimensiones están sin definir.' },
  ];
  if (hasDimensions && imperial) {
    format.push({
      label: 'Página en milímetros (ancho × alto)',
      value: `${formatMm(state.pageWidth_mm)} × ${formatMm(state.pageHeight_mm)}`,
      unit: 'mm',
    });
  }
  format.push(
    displayBleed === ''
      ? { label: 'Sangrado', reason: 'El sangrado está sin definir.' }
      : { label: 'Sangrado', value: String(displayBleed), unit }
  );
  if (imperial && displayBleed !== '') {
    format.push({ label: 'Sangrado en milímetros', value: formatMm(state.bleed_mm), unit: 'mm' });
  }

  // ─── Paper ───────────────────────────────────────────────────────────
  const paper: SpecSheetRow[] = [
    figures.substrate
      ? {
          label: 'Papel',
          value: figures.substrate.name,
          origin: originNote(getCatalogOrigin(
            state.substrateId,
            state.customSubstrates.map(item => item.id),
            state.substratePatches.map(patch => patch.id)
          )),
        }
      : { label: 'Papel', reason: 'No hay un papel elegido.' },
    { label: 'Gramaje', value: String(state.selectedGrammage), unit: 'g/m²' },
    { label: 'Calibre', value: String(figures.caliper_mm), unit: 'µm' },
  ];

  // ─── Pages and binding ───────────────────────────────────────────────
  const pageCount = state.bindingPageCount;
  const pages: SpecSheetRow[] = [
    typedPages === null
      ? { label: 'Páginas', reason: pagesReason }
      : { label: 'Páginas', value: String(typedPages) },
    figures.binding
      ? {
          label: 'Encuadernación',
          value: figures.binding.name,
          origin: originNote(getCatalogOrigin(
            state.bindingId,
            state.customBindings.map(item => item.id),
            state.bindingPatches.map(patch => patch.id)
          )),
        }
      : { label: 'Encuadernación', reason: 'No hay un método de encuadernación elegido.' },
  ];
  if (pageCount && !pageCount.ok) {
    pages.push({ label: 'Número de páginas', reason: pageCount.message });
  }

  // ─── Imposition ──────────────────────────────────────────────────────
  const plan = figures.plan;
  const imposition: SpecSheetRow[] = [
    figures.press
      ? {
          label: 'Prensa',
          value: figures.press.name,
          origin: originNote(getCatalogOrigin(
            state.pressId,
            state.customPresses.map(item => item.id),
            state.pressPatches.map(patch => patch.id)
          )),
        }
      : { label: 'Prensa', reason: 'No hay una prensa elegida.' },
    figures.sheetSize
      ? {
          label: 'Pliego',
          value: figures.sheetSize.name,
          origin: originNote(getCatalogOrigin(
            state.sheetSizeId,
            state.customSheetSizes.map(item => item.id),
            state.sheetSizePatches.map(patch => patch.id)
          )),
        }
      : { label: 'Pliego', reason: 'No hay un pliego elegido.' },
  ];
  if (plan) {
    imposition.push(
      { label: 'Esquema de plegado', value: plan.scheme.name, note: state.foldingSchemeId === null ? 'automático, el de menor desperdicio' : 'fijado por el usuario' },
      { label: 'Páginas por firma', value: String(plan.scheme.pagesPerSignature) },
      { label: 'Páginas por cara del pliego', value: String(plan.cols * plan.rows) },
      { label: 'Orientación de página', value: plan.pageRotated ? 'Rotada' : 'Normal' },
      { label: 'Impresión', value: PRINTING_MODE_LABEL[plan.printingMode] },
    );
  } else {
    imposition.push({
      label: 'Esquema de plegado',
      reason: state.signatureError
        ?? 'Ningún esquema de plegado cabe con el pliego y la prensa elegidos.',
    });
  }

  // ─── Cover ───────────────────────────────────────────────────────────
  const cover = figures.cover;
  const coverRows: SpecSheetRow[] = [
    cover
      ? {
          label: 'Tapa',
          value: cover.name,
          origin: originNote(getCatalogOrigin(
            state.coverId,
            state.customCovers.map(item => item.id),
            state.coverPatches.map(patch => patch.id)
          )),
        }
      : { label: 'Tapa', reason: 'No hay una tapa elegida.' },
  ];
  const coverPlan = state.coverPlan;
  const coverResult = figures.coverPlan;
  const coverReason = state.coverError ?? (coverPlan && !coverPlan.ok ? coverPlan.message : NOT_CALCULABLE);
  if (coverResult?.kind === 'blanda') {
    const sections = coverResult.sections;
    coverRows.push(
      { label: 'Hoja de tapa (ancho × alto)', value: `${formatMm(coverResult.sheetWidth_mm)} × ${formatMm(coverResult.sheetHeight_mm)}`, unit: 'mm' },
      { label: 'Solapa izquierda', value: formatMm(sections.flapLeft_mm), unit: 'mm' },
      { label: 'Contratapa', value: formatMm(sections.back_mm), unit: 'mm' },
      { label: 'Lomo de tapa', value: formatMm(sections.spine_mm), unit: 'mm' },
      { label: 'Portada', value: formatMm(sections.front_mm), unit: 'mm' },
      { label: 'Solapa derecha', value: formatMm(sections.flapRight_mm), unit: 'mm' },
    );
  } else if (coverResult?.kind === 'dura') {
    coverRows.push(
      { label: 'Ancho del cartón lateral', value: formatMm(coverResult.boardWidth_mm), unit: 'mm' },
      { label: 'Alto del cartón', value: formatMm(coverResult.boardHeight_mm), unit: 'mm' },
      { label: 'Ancho del cartón de lomo', value: formatMm(coverResult.spineBoardWidth_mm), unit: 'mm' },
      { label: 'Forro (ancho × alto)', value: `${formatMm(coverResult.wrapWidth_mm)} × ${formatMm(coverResult.wrapHeight_mm)}`, unit: 'mm' },
      { label: 'Área de cartón lateral', value: formatArea(coverResult.sideBoardArea_m2), unit: 'm²' },
      { label: 'Área de cartón de lomo', value: formatArea(coverResult.spineBoardArea_m2), unit: 'm²' },
      { label: 'Área total de cartón', value: formatArea(coverResult.boardArea_m2), unit: 'm²' },
    );
  } else {
    coverRows.push({ label: 'Medidas de tapa', reason: coverReason });
  }

  // ─── Figures ─────────────────────────────────────────────────────────
  const bindingSpine = state.bindingSpine;
  const figureRows: SpecSheetRow[] = [
    figure('Lomo del papel', safeSpine?.thickness_mm ?? null, value => formatRoundedValue(value, 2), 'mm', spineReason),
    figure('Aporte de la encuadernación', bindingSpine?.allowance_mm ?? null, value => formatRoundedValue(value, 2), 'mm', bindingReason),
    figure(figures.hasFlatSpine ? 'Lomo final con encuadernación' : 'Grosor del papel en el pliegue', bindingSpine?.total_mm ?? null, value => formatRoundedValue(value, 2), 'mm', bindingReason),
  ];
  if (state.bindingCreep) {
    figureRows.push({
      label: 'Corrimiento máximo',
      value: formatRoundedValue(state.bindingCreep.maxShift_mm, 3),
      unit: 'mm',
      note: `${state.bindingCreep.nestedSheets} pliegos anidados`,
    });
  }
  figureRows.push(
    weightRow('Peso del papel interior', figures.interiorWeight_g, spineReason),
    weightRow('Peso del papel de tapa', figures.coverWeight_g, coverReason),
    weightRow(
      'Peso del papel por ejemplar',
      figures.paperWeight_g,
      figures.interiorWeight_g === null ? spineReason : coverReason,
      figures.paperWeight_g !== null && figures.boardUnweighed ? 'sin el cartón: el catálogo no declara su densidad' : undefined
    ),
  );
  if (plan) {
    figureRows.push(
      { label: 'Firmas por ejemplar', value: String(plan.signatures) },
      { label: 'Páginas en blanco', value: String(plan.blankPages) },
      { label: 'Pliegos de prensa por ejemplar', value: String(plan.sheetsPerCopy) },
      { label: 'Aprovechamiento del pliego', value: formatRoundedValue(100 - plan.wastePercentage, 1), unit: '%' },
      { label: 'Desperdicio del pliego', value: formatRoundedValue(plan.wastePercentage, 1), unit: '%' },
    );
  } else {
    const reason = imposition[imposition.length - 1];
    const planReason = 'reason' in reason ? reason.reason : NOT_CALCULABLE;
    for (const label of ['Firmas por ejemplar', 'Páginas en blanco', 'Pliegos de prensa por ejemplar', 'Aprovechamiento del pliego', 'Desperdicio del pliego']) {
      figureRows.push({ label, reason: planReason });
    }
  }

  // ─── Where the data comes from ───────────────────────────────────────
  const sources: SpecSheetSource[] = catalog
    ? [
        { catalog: CATALOG_TITLES.substrates, provisional: catalog.provisional.substrates, source: catalog.substratesSource },
        { catalog: CATALOG_TITLES.sheetSizes, provisional: catalog.provisional.sheetSizes, source: catalog.sheetSizesSource },
        { catalog: CATALOG_TITLES.presses, provisional: catalog.provisional.presses, source: catalog.pressesSource },
        { catalog: CATALOG_TITLES.foldingSchemes, provisional: catalog.provisional.foldingSchemes, source: catalog.foldingSchemesSource },
        { catalog: CATALOG_TITLES.bindings, provisional: catalog.provisional.bindings, source: catalog.bindingsSource },
        { catalog: CATALOG_TITLES.covers, provisional: catalog.provisional.covers, source: catalog.coversSource },
      ]
    : [];

  return {
    sections: [
      { id: 'format', title: 'Formato', rows: format },
      { id: 'paper', title: 'Papel interior', rows: paper },
      { id: 'pages', title: 'Páginas y encuadernación', rows: pages },
      { id: 'imposition', title: 'Imposición', rows: imposition },
      { id: 'cover', title: 'Tapa', rows: coverRows },
      { id: 'figures', title: 'Cifras', rows: figureRows },
    ],
    exampleCatalogs: sources.filter(item => item.provisional).map(item => item.catalog),
    sources,
  };
}

/** The sheet for the book as it stands in the store now. */
export function useSpecSheet(): SpecSheet {
  const state = useBookStore();
  const figures = useBookFigures();
  return buildSpecSheet(state, figures);
}
