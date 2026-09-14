import { useState } from 'react';
import { useBookStore, getAllSheetSizes } from '../store/useBookStore';
import { roundTo } from '../engine/units';
import type { ImpositionResult, SheetSize } from '../types';

const SVG_PADDING = 30;
const SVG_MAX_WIDTH = 500;
const SVG_MAX_HEIGHT = 400;
const MIN_PAGE_NUMBER_WIDTH = 28;
const MIN_PAGE_NUMBER_HEIGHT = 18;

interface SvgPlacementGeometry {
  pageX: number;
  pageY: number;
  pageWidth: number;
  pageHeight: number;
  safeZoneX: number;
  safeZoneY: number;
  safeZoneWidth: number;
  safeZoneHeight: number;
  pageLabelX: number;
  pageLabelY: number;
}

interface SvgGeometry {
  sheetWidth: number;
  sheetHeight: number;
  scaledSheetWidth: number;
  scaledSheetHeight: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  sheetLabelX: number;
  sheetLabelY: number;
  placements: SvgPlacementGeometry[];
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function getSvgGeometry(
  sheet: SheetSize | undefined,
  impositionResult: ImpositionResult | null,
  bleed: number
): SvgGeometry | null {
  if (!sheet || !impositionResult
    || !isPositiveFinite(sheet.width_mm)
    || !isPositiveFinite(sheet.height_mm)
    || !isNonNegativeFinite(bleed)) {
    return null;
  }

  const bleedSpan = bleed * 2;
  if (!isNonNegativeFinite(bleedSpan) || (bleed > 0 && !isPositiveFinite(bleedSpan))) {
    return null;
  }

  const scale = Math.min(
    (SVG_MAX_WIDTH - SVG_PADDING * 2) / sheet.width_mm,
    (SVG_MAX_HEIGHT - SVG_PADDING * 2) / sheet.height_mm
  );
  const scaledSheetWidth = sheet.width_mm * scale;
  const scaledSheetHeight = sheet.height_mm * scale;
  const scaledSheetRight = SVG_PADDING + scaledSheetWidth;
  const scaledSheetBottom = SVG_PADDING + scaledSheetHeight;
  const viewBoxWidth = scaledSheetWidth + SVG_PADDING * 2;
  const viewBoxHeight = scaledSheetHeight + SVG_PADDING * 2 + 20;
  const sheetLabelX = SVG_PADDING + scaledSheetWidth / 2;
  const sheetLabelY = SVG_PADDING + scaledSheetHeight + 16;

  if (!isPositiveFinite(scale)
    || !isPositiveFinite(scaledSheetWidth)
    || !isPositiveFinite(scaledSheetHeight)
    || !isPositiveFinite(scaledSheetRight)
    || !isPositiveFinite(scaledSheetBottom)
    || !isPositiveFinite(viewBoxWidth)
    || !isPositiveFinite(viewBoxHeight)
    || !isPositiveFinite(sheetLabelX)
    || !isPositiveFinite(sheetLabelY)
    || sheetLabelX <= SVG_PADDING
    || sheetLabelX >= scaledSheetRight
    || sheetLabelY <= scaledSheetBottom
    || sheetLabelY >= viewBoxHeight) {
    return null;
  }

  const placements: SvgPlacementGeometry[] = [];
  for (const placement of impositionResult.placements) {
    if (!isNonNegativeFinite(placement.x)
      || !isNonNegativeFinite(placement.y)
      || !isPositiveFinite(placement.width)
      || !isPositiveFinite(placement.height)) {
      return null;
    }

    const pageRight = placement.x + placement.width;
    const pageBottom = placement.y + placement.height;
    const safeX = placement.x + bleed;
    const safeY = placement.y + bleed;
    const safeWidth = placement.width - bleedSpan;
    const safeHeight = placement.height - bleedSpan;
    const safeRight = safeX + safeWidth;
    const safeBottom = safeY + safeHeight;
    if (!isPositiveFinite(pageRight)
      || !isPositiveFinite(pageBottom)
      || pageRight <= placement.x
      || pageBottom <= placement.y
      || pageRight > sheet.width_mm
      || pageBottom > sheet.height_mm
      || !isNonNegativeFinite(safeX)
      || !isNonNegativeFinite(safeY)
      || !isPositiveFinite(safeWidth)
      || !isPositiveFinite(safeHeight)
      || !isPositiveFinite(safeRight)
      || !isPositiveFinite(safeBottom)
      || safeRight <= safeX
      || safeBottom <= safeY) {
      return null;
    }

    const pageX = SVG_PADDING + placement.x * scale;
    const pageY = SVG_PADDING + placement.y * scale;
    const pageWidth = placement.width * scale;
    const pageHeight = placement.height * scale;
    const pageScaledRight = pageX + pageWidth;
    const pageScaledBottom = pageY + pageHeight;
    const safeZoneX = SVG_PADDING + safeX * scale;
    const safeZoneY = SVG_PADDING + safeY * scale;
    const safeZoneWidth = safeWidth * scale;
    const safeZoneHeight = safeHeight * scale;
    const safeZoneRight = safeZoneX + safeZoneWidth;
    const safeZoneBottom = safeZoneY + safeZoneHeight;
    const pageLabelX = pageX + pageWidth / 2;
    const pageLabelY = pageY + pageHeight / 2;

    if (!isPositiveFinite(pageX)
      || !isPositiveFinite(pageY)
      || !isPositiveFinite(pageWidth)
      || !isPositiveFinite(pageHeight)
      || !isPositiveFinite(pageScaledRight)
      || !isPositiveFinite(pageScaledBottom)
      || pageScaledRight <= pageX
      || pageScaledBottom <= pageY
      || pageX < SVG_PADDING
      || pageY < SVG_PADDING
      || pageScaledRight > scaledSheetRight
      || pageScaledBottom > scaledSheetBottom
      || !isPositiveFinite(safeZoneX)
      || !isPositiveFinite(safeZoneY)
      || !isPositiveFinite(safeZoneWidth)
      || !isPositiveFinite(safeZoneHeight)
      || !isPositiveFinite(safeZoneRight)
      || !isPositiveFinite(safeZoneBottom)
      || safeZoneRight <= safeZoneX
      || safeZoneBottom <= safeZoneY
      || !isPositiveFinite(pageLabelX)
      || !isPositiveFinite(pageLabelY)
      || pageLabelX <= pageX
      || pageLabelX >= pageScaledRight
      || pageLabelY <= pageY
      || pageLabelY >= pageScaledBottom
      || (bleed > 0 && (
        safeZoneX <= pageX
        || safeZoneY <= pageY
        || safeZoneRight >= pageScaledRight
        || safeZoneBottom >= pageScaledBottom
      ))) {
      return null;
    }

    placements.push({
      pageX,
      pageY,
      pageWidth,
      pageHeight,
      safeZoneX,
      safeZoneY,
      safeZoneWidth,
      safeZoneHeight,
      pageLabelX,
      pageLabelY,
    });
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
    placements,
  };
}

export function ImpositionVisualizer() {
  const {
    impositionResult,
    impositionError,
    sheetSizeId,
    customSheetSizes,
    pageOrientation,
    bleed_mm,
    setSheetSize,
    addCustomSheetSize,
    removeCustomSheetSize,
    setPageOrientation,
  } = useBookStore();

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customW, setCustomW] = useState('');
  const [customH, setCustomH] = useState('');
  const [customSheetError, setCustomSheetError] = useState<string | null>(null);

  const customWidthIsValid = isPositiveFinite(Number(customW));
  const customHeightIsValid = isPositiveFinite(Number(customH));
  const allSheets = getAllSheetSizes(customSheetSizes);
  const currentSheet = allSheets.find(sheet => sheet.id === sheetSizeId);

  const handleAddCustom = () => {
    const width = Number(customW);
    const height = Number(customH);

    if (!customWidthIsValid || !customHeightIsValid) {
      setCustomSheetError('Introduce ancho y alto como números finitos mayores que cero para crear el pliego.');
      return;
    }

    if (!addCustomSheetSize(customName.trim(), width, height)) {
      setCustomSheetError('No se pudo crear el pliego. Corrige ancho y alto e inténtalo de nuevo.');
      return;
    }

    setShowCustomForm(false);
    setCustomName('');
    setCustomW('');
    setCustomH('');
    setCustomSheetError(null);
  };

  const svgGeometry = getSvgGeometry(currentSheet, impositionResult, bleed_mm);

  const svgContent = svgGeometry && (
    <svg
      className="imposition-svg"
      viewBox={`0 0 ${svgGeometry.viewBoxWidth} ${svgGeometry.viewBoxHeight}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Vista previa de la rejilla uniforme"
    >
      <rect
        className="sheet-bg"
        x={SVG_PADDING}
        y={SVG_PADDING}
        width={svgGeometry.scaledSheetWidth}
        height={svgGeometry.scaledSheetHeight}
      />

      {svgGeometry.placements.map((placement, index) => (
        <g key={index}>
          <rect
            className="page-rect"
            x={placement.pageX}
            y={placement.pageY}
            width={placement.pageWidth}
            height={placement.pageHeight}
          />
          <rect
            className="safe-zone"
            x={placement.safeZoneX}
            y={placement.safeZoneY}
            width={placement.safeZoneWidth}
            height={placement.safeZoneHeight}
          />
          {placement.pageWidth >= MIN_PAGE_NUMBER_WIDTH
            && placement.pageHeight >= MIN_PAGE_NUMBER_HEIGHT && (
              <text
                className="page-number"
                x={placement.pageLabelX}
                y={placement.pageLabelY}
              >
                {index + 1}
              </text>
            )}
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
  );

  return (
    <div className="panel" id="imposition-visualizer">
      <h2 className="panel-title">Aprovechamiento geométrico</h2>
      <p className="calculation-note">
        Compara dos rejillas uniformes, con la página normal y rotada 90°.
        Es una referencia visual, no una imposición industrial.
      </p>

      <div className="input-row">
        <div className="form-group">
          <label className="form-label" htmlFor="select-page-orientation">Rotación</label>
          <select
            className="form-input"
            value={pageOrientation}
            onChange={event => setPageOrientation(event.target.value as 'auto' | 'normal' | 'rotated')}
            id="select-page-orientation"
          >
            <option value="auto">Mejor entre normal y rotada</option>
            <option value="normal">Normal</option>
            <option value="rotated">Rotada 90°</option>
          </select>
        </div>

        <div
          className="form-group"
          role="group"
          aria-labelledby="sheet-size-group-label"
        >
          <div className="form-label-row">
            <span id="sheet-size-group-label" className="form-label">Tamaño del pliego</span>
            <button
              type="button"
              onClick={() => {
                if (showCustomForm) {
                  setCustomSheetError(null);
                }
                setShowCustomForm(!showCustomForm);
              }}
              aria-expanded={showCustomForm}
              aria-controls="custom-sheet-form"
              aria-label={showCustomForm
                ? 'Cancelar pliego personalizado'
                : 'Añadir pliego personalizado'}
              style={{
                background: 'none', border: 'none', color: 'var(--color-amber-600)',
                cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600,
              }}
            >
              {showCustomForm ? 'Cancelar' : '+ Person.'}
            </button>
          </div>

          {showCustomForm ? (
            <div id="custom-sheet-form" style={{ background: 'transparent', border: 'none', marginBottom: 'var(--space-3)' }}>
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <label className="form-label" htmlFor="input-custom-sheet-name">Nombre (opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={customName}
                  onChange={event => setCustomName(event.target.value)}
                  id="input-custom-sheet-name"
                />
              </div>
              <div className="input-row" style={{ marginBottom: 'var(--space-3)' }}>
                <div>
                  <label className="form-label" htmlFor="input-custom-sheet-width">Ancho</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      className="form-input"
                      value={customW}
                      onChange={event => setCustomW(event.target.value)}
                      min="1"
                      id="input-custom-sheet-width"
                      aria-invalid={Boolean(customSheetError) && !customWidthIsValid}
                      aria-describedby={customSheetError ? 'custom-sheet-error' : undefined}
                    />
                    <span className="input-unit">mm</span>
                  </div>
                </div>
                <div>
                  <label className="form-label" htmlFor="input-custom-sheet-height">Alto</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      className="form-input"
                      value={customH}
                      onChange={event => setCustomH(event.target.value)}
                      min="1"
                      id="input-custom-sheet-height"
                      aria-invalid={Boolean(customSheetError) && !customHeightIsValid}
                      aria-describedby={customSheetError ? 'custom-sheet-error' : undefined}
                    />
                    <span className="input-unit">mm</span>
                  </div>
                </div>
              </div>
              {customSheetError && (
                <p className="calculation-error" id="custom-sheet-error" role="alert">
                  {customSheetError}
                </p>
              )}
              <button
                type="button"
                onClick={handleAddCustom}
                style={{
                  width: '100%',
                  padding: 'var(--space-2)',
                  background: 'var(--color-text-primary)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Crear pliego
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <label className="visually-hidden" htmlFor="select-sheet-size">Pliego seleccionado</label>
              <select
                className="form-input"
                value={sheetSizeId}
                onChange={event => setSheetSize(event.target.value)}
                id="select-sheet-size"
                style={{ flex: 1 }}
              >
                {allSheets.map(sheet => (
                  <option key={sheet.id} value={sheet.id}>
                    {sheet.name} ({sheet.width_mm}×{sheet.height_mm} mm)
                  </option>
                ))}
              </select>
              {customSheetSizes.some(sheet => sheet.id === sheetSizeId) && (
                <button
                  type="button"
                  onClick={() => removeCustomSheetSize(sheetSizeId)}
                  title="Eliminar pliego personalizado"
                  aria-label="Eliminar pliego personalizado"
                  style={{
                    background: 'rgba(244, 63, 94, 0.15)',
                    color: 'var(--color-danger-foreground)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    width: '42px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                  }}
                >
                  ×
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {impositionError && (
        <p className="calculation-error" role="alert">{impositionError}</p>
      )}

      {impositionResult && !impositionResult.usesBestOrientation && (
        <p className="calculation-error" role="alert">
          La orientación elegida ubica menos páginas que la alternativa uniforme.
          Selecciona «Mejor entre normal y rotada» para recuperar el mayor conteo de estas dos rejillas.
        </p>
      )}

      <div className="imposition-svg-container">
        {svgContent || (
          <p className="calculation-note">
            {impositionError
              ? 'Corrige los valores indicados para recuperar la vista previa.'
              : 'Completa valores válidos para ver la referencia geométrica.'}
          </p>
        )}
      </div>

      {impositionResult?.previewTruncated && (
        <p className="preview-notice" role="status" aria-live="polite">
          Vista previa parcial: se muestran {impositionResult.placements.length} de {impositionResult.pagesPerSide} ubicaciones.
          Los cálculos conservan el total completo.
        </p>
      )}

      {impositionResult && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', marginTop: 'var(--space-6)' }}>
          <div style={{ padding: 'var(--space-3)', textAlign: 'center', borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{impositionResult.pagesPerSide}</div>
            <div className="stat-label">Ubicaciones / cara</div>
          </div>
          <div style={{ padding: 'var(--space-3)', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {impositionResult.cols} × {impositionResult.rows}
            </div>
            <div className="stat-label">Rejilla uniforme</div>
          </div>
          <div style={{ padding: 'var(--space-3)', textAlign: 'center', borderRight: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {roundTo(impositionResult.wastePercentage, 1)}%
            </div>
            <div className="stat-label">Área no utilizada estimada</div>
          </div>
          <div style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {impositionResult.rotated ? 'Rotada' : 'Normal'}
            </div>
            <div className="stat-label">Orientación</div>
          </div>
        </div>
      )}
    </div>
  );
}
