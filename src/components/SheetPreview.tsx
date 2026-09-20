import { useState } from 'react';
import { useBookStore, getAllSheetSizes } from '../store/useBookStore';
import { layoutSide } from '../engine/signatures';
import { isPositiveFinite, isNonNegativeFinite } from '../engine/units';
import type { SheetSize, SignatureOption } from '../types';

const SVG_PADDING = 30;
const SVG_MAX_WIDTH = 500;
const SVG_MAX_HEIGHT = 400;

type Side = 'front' | 'back';

interface SignatureSlotGeometry {
  page: number;
  rotated: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  labelX: number;
  labelY: number;
}

interface SignatureSvgGeometry {
  sheetWidth: number;
  sheetHeight: number;
  scaledSheetWidth: number;
  scaledSheetHeight: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  sheetLabelX: number;
  sheetLabelY: number;
  slots: SignatureSlotGeometry[];
}

/**
 * Compute the scaled SVG geometry for one side of a selected signature
 * option, or `null` when the sheet, the option, or any derived number is
 * missing or unusable, so the caller can fall back to an accessible message
 * instead of rendering a broken preview.
 */
function getSignatureSvgGeometry(
  sheet: SheetSize | undefined,
  option: SignatureOption | null,
  side: Side
): SignatureSvgGeometry | null {
  if (!sheet || !option || !isPositiveFinite(sheet.width_mm) || !isPositiveFinite(sheet.height_mm)) {
    return null;
  }

  const scale = Math.min(
    (SVG_MAX_WIDTH - SVG_PADDING * 2) / sheet.width_mm,
    (SVG_MAX_HEIGHT - SVG_PADDING * 2) / sheet.height_mm
  );
  const scaledSheetWidth = sheet.width_mm * scale;
  const scaledSheetHeight = sheet.height_mm * scale;
  const viewBoxWidth = scaledSheetWidth + SVG_PADDING * 2;
  const viewBoxHeight = scaledSheetHeight + SVG_PADDING * 2 + 20;
  const sheetLabelX = SVG_PADDING + scaledSheetWidth / 2;
  const sheetLabelY = SVG_PADDING + scaledSheetHeight + 16;

  if (!isPositiveFinite(scale)
    || !isPositiveFinite(scaledSheetWidth)
    || !isPositiveFinite(scaledSheetHeight)
    || !isPositiveFinite(viewBoxWidth)
    || !isPositiveFinite(viewBoxHeight)
    || !isPositiveFinite(sheetLabelX)
    || !isPositiveFinite(sheetLabelY)) {
    return null;
  }

  let placements;
  try {
    placements = layoutSide(option, side);
  } catch {
    return null;
  }

  const slots: SignatureSlotGeometry[] = [];
  for (const placement of placements) {
    if (!isNonNegativeFinite(placement.x_mm)
      || !isNonNegativeFinite(placement.y_mm)
      || !isPositiveFinite(placement.width_mm)
      || !isPositiveFinite(placement.height_mm)) {
      return null;
    }

    const x = SVG_PADDING + placement.x_mm * scale;
    const y = SVG_PADDING + placement.y_mm * scale;
    const width = placement.width_mm * scale;
    const height = placement.height_mm * scale;
    const labelX = x + width / 2;
    const labelY = y + height / 2;

    if (!isPositiveFinite(x) || !isPositiveFinite(y)
      || !isPositiveFinite(width) || !isPositiveFinite(height)
      || !isPositiveFinite(labelX) || !isPositiveFinite(labelY)) {
      return null;
    }

    slots.push({ page: placement.page, rotated: placement.rotation === 180, x, y, width, height, labelX, labelY });
  }

  return {
    sheetWidth: sheet.width_mm,
    sheetHeight: sheet.height_mm,
    scaledSheetWidth,
    scaledSheetHeight,
    viewBoxWidth,
    viewBoxHeight,
    sheetLabelX,
    sheetLabelY,
    slots,
  };
}

/**
 * The press sheet with its signature imposed on it, and the switch between the
 * two sides of it. The switch travels with the drawing rather than staying
 * among the controls: it changes which face is shown and nothing that is
 * calculated, so it belongs to the view it changes. That also makes this
 * component self-sufficient, which is what lets it live in a column of its
 * own, away from the panel it used to sit inside.
 */
export function SheetPreview() {
  const {
    catalog,
    sheetSizeId,
    customSheetSizes,
    sheetSizePatches,
    hiddenSheetSizeIds,
    signaturePlan,
  } = useBookStore();
  const [side, setSide] = useState<Side>('front');

  const allSheets = catalog ? getAllSheetSizes(catalog, customSheetSizes, sheetSizePatches, hiddenSheetSizeIds) : customSheetSizes;
  const currentSheet = allSheets.find(sheet => sheet.id === sheetSizeId);
  const selected = signaturePlan?.selected ?? null;
  const svgGeometry = getSignatureSvgGeometry(currentSheet, selected, side);

  return (
    <div>
      <div className="form-group">
        <label className="form-label" htmlFor="select-imposition-side">Cara mostrada</label>
        <select
          className="form-input"
          value={side}
          onChange={event => setSide(event.target.value as Side)}
          id="select-imposition-side"
        >
          <option value="front">Tiro (frente)</option>
          <option value="back">Retiro (dorso)</option>
        </select>
      </div>

      <div className="imposition-svg-container">
        {svgGeometry ? (
        <svg
          className="imposition-svg"
          viewBox={`0 0 ${svgGeometry.viewBoxWidth} ${svgGeometry.viewBoxHeight}`}
          xmlns="http://www.w3.org/2000/svg"
          aria-label={`Vista previa del ${side === 'front' ? 'tiro' : 'retiro'} de la firma`}
        >
          <rect
            className="sheet-bg"
            x={SVG_PADDING}
            y={SVG_PADDING}
            width={svgGeometry.scaledSheetWidth}
            height={svgGeometry.scaledSheetHeight}
          />

          {svgGeometry.slots.map((slot, index) => (
            <g key={index} transform={slot.rotated ? `rotate(180 ${slot.labelX} ${slot.labelY})` : undefined}>
              <rect
                className="page-rect"
                x={slot.x}
                y={slot.y}
                width={slot.width}
                height={slot.height}
              />
              <text
                className="page-number"
                x={slot.labelX}
                y={slot.labelY}
              >
                {slot.page}
              </text>
            </g>
          ))}

          <text
            className="dimension-text"
            x={svgGeometry.sheetLabelX}
            y={svgGeometry.sheetLabelY}
            textAnchor="middle"
          >
            {svgGeometry.sheetWidth} × {svgGeometry.sheetHeight} mm
          </text>
        </svg>
        ) : (
          <p className="calculation-note" role="status">
            {selected
              ? 'Corrige los valores indicados para recuperar la vista previa.'
              : 'Ningún esquema de plegado disponible cabe en el pliego, la prensa y las páginas actuales. Elige otro pliego, otra prensa o revisa la configuración.'}
          </p>
        )}
      </div>
    </div>
  );
}
