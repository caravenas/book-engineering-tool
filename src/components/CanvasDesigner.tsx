import { useBookStore, getAllProportions } from '../store/useBookStore';
import { getPageDisplayDimensions, isPositiveFinite } from '../engine/units';
import { getCatalogOrigin, ORIGIN_LABEL } from './CatalogOrigin';
import { OptionField, OptionCard } from './OptionGroup';
import { MeasureField } from './MeasureField';
import type { BookFormat } from '../types';

/**
 * The three orientations, each drawn as the silhouette of the page it makes:
 * the shapes are the control, and the words under them only name what the
 * drawing already says. Sizes in px, from the design canvas.
 */
const FORMAT_OPTIONS: { value: BookFormat; label: string; width: number; height: number }[] = [
  { value: 'vertical', label: 'Vertical', width: 22, height: 30 },
  { value: 'landscape', label: 'Apaisado', width: 30, height: 22 },
  { value: 'square', label: 'Cuadrado', width: 26, height: 26 },
];

/** The width every proportion is drawn at, so the drawings compare directly. */
const PROPORTION_FIGURE_WIDTH = 24;
const PROPORTION_FIGURE_MAX_HEIGHT = 40;

/**
 * How tall the page is drawn for a given ratio, at the fixed drawing width and
 * in the orientation currently chosen — the same way the store derives the
 * real height, so the drawing shows what choosing this proportion will do
 * rather than an idealised upright rectangle.
 */
function proportionFigureHeight(ratio: [number, number], format: BookFormat): number {
  const [ratioWidth, ratioHeight] = ratio;
  if (format === 'square' || ratioWidth <= 0 || ratioHeight <= 0) return PROPORTION_FIGURE_WIDTH;

  const factor = format === 'vertical' ? ratioHeight / ratioWidth : ratioWidth / ratioHeight;
  return clampFigureHeight(PROPORTION_FIGURE_WIDTH * factor);
}

/** The same drawing for the page as it currently stands, however it got there. */
function pageFigureHeight(pageWidth_mm: number, pageHeight_mm: number): number {
  if (!isPositiveFinite(pageWidth_mm) || !isPositiveFinite(pageHeight_mm)) return PROPORTION_FIGURE_WIDTH;
  return clampFigureHeight(PROPORTION_FIGURE_WIDTH * (pageHeight_mm / pageWidth_mm));
}

/** A drawing has to stay inside its card, and stay visible when very flat. */
function clampFigureHeight(height: number): number {
  return Math.min(PROPORTION_FIGURE_MAX_HEIGHT, Math.max(8, height));
}

/** A page outline at the drawing width, over the 1:1 square it is compared to. */
function ProportionFigure({ height, dashed }: { height: number; dashed?: boolean }) {
  return (
    <span className="proportion-figure">
      <span className="proportion-unit" />
      <span
        className={`proportion-shape${dashed ? ' dashed' : ''}`}
        style={{ width: `${PROPORTION_FIGURE_WIDTH}px`, height: `${height}px` }}
      />
    </span>
  );
}

export function CanvasDesigner() {
  const {
    format, proportionId, pageWidth_mm, pageHeight_mm,
    bleed_mm, unitSystem, catalog,
    customProportions, proportionPatches, hiddenProportionLabels, userLayerStorageAvailable,
    setFormat, setProportion, setPageDimensions, setBleed,
  } = useBookStore();


  /*
   * Every proportion the catalog offers, in the catalog's own order, custom
   * entries included. Until R-13 the step showed the first three factory
   * proportions and appended the custom ones, which quietly hid two of the
   * five that `formatos.json` ships: three was as many as fitted in a
   * segmented control, and a grid of drawings has no such limit.
   */
  const proportionOptions = catalog
    ? getAllProportions(catalog, customProportions, proportionPatches, hiddenProportionLabels)
    : [];
  const isSelectedProportionCustom = customProportions.some(prop => prop.label === proportionId);
  const proportionOrigin = getCatalogOrigin(proportionId, customProportions.map(prop => prop.label), proportionPatches.map(patch => patch.label));


  const { displayW, displayH, displayBleed, unit } = getPageDisplayDimensions(
    pageWidth_mm, pageHeight_mm, bleed_mm, unitSystem
  );
  const dimensionStep = unitSystem === 'imperial' ? 0.125 : 1;
  const toMm = (value: number) => (unitSystem === 'imperial' ? value * 25.4 : value);
  /*
   * "de fábrica" on a measurement means what it means everywhere else: the
   * value is the one the shipped configuration declares. The height has no
   * default of its own — `formatos.json` gives a width and a proportion and
   * the store derives the rest — so what its margin reports is the proportion
   * deciding it.
   */
  const isFactoryWidth = catalog ? pageWidth_mm === catalog.defaults.pageWidth_mm : false;
  const isFactoryBleed = catalog ? bleed_mm === catalog.defaults.bleed_mm : false;

  return (
    <div className="panel" id="canvas-designer">
      {/* Orientación: the page silhouette each choice produces. */}
      <OptionField label="Orientación" id="format-group" columns={3}>
        {FORMAT_OPTIONS.map(option => (
          <OptionCard
            key={option.value}
            id={`format-${option.value}`}
            name={option.label}
            selected={format === option.value}
            onSelect={() => setFormat(option.value)}
            figure={(
              <span
                className="option-shape"
                style={{ width: `${option.width}px`, height: `${option.height}px` }}
              />
            )}
          />
        ))}
      </OptionField>

      {/*
        * Proporción: each ratio drawn at the same width, over the square it is
        * measured against, so the choice is made by looking at the shapes
        * rather than by reading two numbers. "Manual" draws the page as it
        * currently stands, because that is what manual means here: whatever
        * was last typed into a measurement.
        */}
      <OptionField
        label="Proporción"
        id="proportion-group"
        columns={3}
        fromCatalog
        marginalia={proportionId === null ? null : ORIGIN_LABEL[proportionOrigin]}
        note={isSelectedProportionCustom && !userLayerStorageAvailable && (
          <p className="config-source-note">proporción personalizada, guardada solo para esta sesión</p>
        )}
      >
        {proportionOptions.map(prop => (
          <OptionCard
            key={prop.label}
            id={`proportion-${prop.label}`}
            name={prop.label}
            title={prop.description}
            selected={proportionId === prop.label}
            onSelect={() => setProportion(prop.label)}
            figure={<ProportionFigure height={proportionFigureHeight(prop.ratio, format)} />}
          />
        ))}
        <OptionCard
          id="proportion-custom"
          name="Manual"
          selected={proportionId === null}
          onSelect={() => setProportion(null)}
          figure={(
            <ProportionFigure dashed height={pageFigureHeight(pageWidth_mm, pageHeight_mm)} />
          )}
        />
      </OptionField>

      {/*
        * The three measurements, each a figure in a line with its unit as the
        * handle. They sit in one row because they are one decision, and
        * because a step of drawn options has no vertical room to spare.
        */}
      <div className="measure-grid">
        <MeasureField
          label="Ancho"
          id="input-width"
          value={displayW}
          unit={unit}
          step={dimensionStep}
          marginalia={isFactoryWidth ? ORIGIN_LABEL.factory : null}
          onChange={value => setPageDimensions(toMm(value), pageHeight_mm)}
        />
        <MeasureField
          label="Alto"
          id="input-height"
          value={displayH}
          unit={unit}
          step={dimensionStep}
          /* The store derives the height from the width while a proportion is
             on, so the field says who is deciding it. Typing here is still
             allowed, and turns the proportion to Manual — which is what the
             note is warning about. */
          marginalia={proportionId === null ? null : `fijado por ${proportionId}`}
          onChange={value => setPageDimensions(pageWidth_mm, toMm(value))}
        />
        <MeasureField
          label="Sangrado"
          id="input-bleed"
          value={displayBleed}
          unit={unit}
          step={unitSystem === 'imperial' ? 0.0625 : 0.5}
          /* A bleed is a few millimetres wide, so a pointer that moved a
             millimetre every three pixels would be unusable on it. */
          pixelsPerStep={12}
          dashed
          marginalia={isFactoryBleed ? ORIGIN_LABEL.factory : null}
          onChange={value => setBleed(toMm(value))}
        />
      </div>

    </div>
  );
}
