import { useState } from 'react';
import { useBookStore, getAllSheetSizes } from '../store/useBookStore';
import { layoutSide } from '../engine/signatures';
import { roundTo } from '../engine/units';
import { ConfigSourceNote } from './ConfigSourceNote';
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

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
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

export function ImpositionVisualizer() {
  const {
    catalog,
    sheetSizeId,
    customSheetSizes,
    pressId,
    foldingSchemeId,
    signaturePlan,
    signatureError,
    setSheetSize,
    addCustomSheetSize,
    removeCustomSheetSize,
    setPress,
    setFoldingScheme,
  } = useBookStore();

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customW, setCustomW] = useState('');
  const [customH, setCustomH] = useState('');
  const [customSheetError, setCustomSheetError] = useState<string | null>(null);
  const [side, setSide] = useState<Side>('front');

  const customWidthIsValid = isPositiveFinite(Number(customW));
  const customHeightIsValid = isPositiveFinite(Number(customH));
  const allSheets = catalog ? getAllSheetSizes(catalog, customSheetSizes) : customSheetSizes;
  const currentSheet = allSheets.find(sheet => sheet.id === sheetSizeId);
  const isSelectedSheetCustom = customSheetSizes.some(sheet => sheet.id === sheetSizeId);

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

  const selected = signaturePlan?.selected ?? null;
  const svgGeometry = getSignatureSvgGeometry(currentSheet, selected, side);

  const svgContent = svgGeometry && (
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
  );

  return (
    <div className="panel" id="imposition-visualizer">
      <h2 className="panel-title">Imposición por firmas</h2>
      <p className="calculation-note">
        Muestra la firma elegida sobre el pliego, con la pinza y los márgenes de la prensa descontados.
        Es una referencia preliminar, no una imposición industrial certificada.
      </p>

      <div className="input-row">
        <div className="form-group">
          <label className="form-label" htmlFor="select-press">Prensa</label>
          <select
            className="form-input"
            value={pressId}
            onChange={event => setPress(event.target.value)}
            id="select-press"
          >
            {catalog?.presses.map(press => (
              <option key={press.id} value={press.id}>{press.name}</option>
            ))}
          </select>
          {catalog && (
            <ConfigSourceNote file="config/maquinas.json" text={catalog.pressesSource} />
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="select-folding-scheme">Esquema de plegado</label>
          <select
            className="form-input"
            value={foldingSchemeId ?? ''}
            onChange={event => setFoldingScheme(event.target.value || null)}
            id="select-folding-scheme"
          >
            <option value="">Automático (menor desperdicio)</option>
            {catalog?.foldingSchemes.map(scheme => (
              <option key={scheme.id} value={scheme.id}>{scheme.name}</option>
            ))}
          </select>
          {catalog && (
            <ConfigSourceNote file="config/esquemas.json" text={catalog.foldingSchemesSource} />
          )}
        </div>

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
          {isSelectedSheetCustom ? (
            <ConfigSourceNote text="pliego personalizado" />
          ) : catalog && (
            <ConfigSourceNote file="config/pliegos.json" text={catalog.sheetSizesSource} />
          )}
        </div>
      </div>

      {signatureError && (
        <p className="calculation-error" role="alert">{signatureError}</p>
      )}

      <div className="imposition-svg-container">
        {svgContent || (
          <p className="calculation-note" role="status">
            {selected
              ? 'Corrige los valores indicados para recuperar la vista previa.'
              : 'Ningún esquema de plegado disponible cabe en el pliego, la prensa y las páginas actuales. Elige otro pliego, otra prensa o revisa la configuración.'}
          </p>
        )}
      </div>

      {selected && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', marginTop: 'var(--space-6)' }}>
          <div style={{ padding: 'var(--space-3)', textAlign: 'center', borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{selected.cols * selected.rows}</div>
            <div className="stat-label">Páginas / cara del pliego</div>
          </div>
          <div style={{ padding: 'var(--space-3)', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{selected.signatures}</div>
            <div className="stat-label">Firmas por ejemplar</div>
          </div>
          <div style={{ padding: 'var(--space-3)', textAlign: 'center', borderRight: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{selected.blankPages}</div>
            <div className="stat-label">Páginas en blanco</div>
          </div>
          <div style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{selected.sheetsPerCopy}</div>
            <div className="stat-label">Pliegos de prensa por ejemplar</div>
          </div>
          <div style={{ padding: 'var(--space-3)', textAlign: 'center', borderRight: '1px solid var(--color-border)', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{roundTo(selected.wastePercentage, 1)}%</div>
            <div className="stat-label">Área imprimible no utilizada</div>
          </div>
          <div style={{ padding: 'var(--space-3)', textAlign: 'center', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{selected.pageRotated ? 'Rotada' : 'Normal'}</div>
            <div className="stat-label">Orientación de página</div>
          </div>
        </div>
      )}
    </div>
  );
}
