import { useState } from 'react';
import { useBookStore } from '../store/useBookStore';
import { mmToInches, roundTo } from '../engine/units';
import { ConfigSourceNote } from './ConfigSourceNote';
import type { BookFormat } from '../types';

const FORMAT_OPTIONS: { value: BookFormat; label: string }[] = [
  { value: 'vertical', label: 'Vertical' },
  { value: 'landscape', label: 'Apaisado' },
  { value: 'square', label: 'Cuadrado' },
];

function toDisplayValue(value_mm: number, unitSystem: 'metric' | 'imperial', decimals: number): number | '' {
  if (!Number.isFinite(value_mm)) {
    return '';
  }

  const converted = unitSystem === 'imperial' ? mmToInches(value_mm) : value_mm;
  if (!Number.isFinite(converted)) {
    return '';
  }

  const rounded = roundTo(converted, decimals);
  if (!Number.isFinite(rounded) || (converted !== 0 && rounded === 0)) {
    return converted;
  }

  return rounded;
}

export function CanvasDesigner() {
  const {
    format, proportionId, pageWidth_mm, pageHeight_mm,
    bleed_mm, unitSystem, catalog,
    customProportions, customProportionError, userLayerStorageAvailable,
    setFormat, setProportion, setPageDimensions, setBleed,
    addCustomProportion, removeCustomProportion, clearCustomProportionError,
  } = useBookStore();

  const [showProportionForm, setShowProportionForm] = useState(false);
  const [proportionLabel, setProportionLabel] = useState('');
  const [proportionRatioWidth, setProportionRatioWidth] = useState('');
  const [proportionRatioHeight, setProportionRatioHeight] = useState('');
  const [proportionDescription, setProportionDescription] = useState('');

  const proportionOptions = catalog ? catalog.proportions.slice(0, 3) : [];
  const isSelectedProportionCustom = customProportions.some(prop => prop.label === proportionId);

  const handleToggleProportionForm = () => {
    setShowProportionForm(!showProportionForm);
    clearCustomProportionError();
  };

  const handleAddProportion = () => {
    const added = addCustomProportion(
      proportionLabel,
      Number(proportionRatioWidth),
      Number(proportionRatioHeight),
      proportionDescription
    );

    if (added) {
      setShowProportionForm(false);
      setProportionLabel('');
      setProportionRatioWidth('');
      setProportionRatioHeight('');
      setProportionDescription('');
    }
  };

  // Convert finite values for display without passing invalid geometry to number inputs.
  const displayW = toDisplayValue(pageWidth_mm, unitSystem, unitSystem === 'imperial' ? 2 : 1);
  const displayH = toDisplayValue(pageHeight_mm, unitSystem, unitSystem === 'imperial' ? 2 : 1);
  const displayBleed = toDisplayValue(bleed_mm, unitSystem, unitSystem === 'imperial' ? 3 : 1);
  const unit = unitSystem === 'imperial' ? '″' : 'mm';

  // Keep invalid input away from CSS geometry while the calculators report how to recover.
  const canRenderPreview = Number.isFinite(pageWidth_mm)
    && pageWidth_mm > 0
    && Number.isFinite(pageHeight_mm)
    && pageHeight_mm > 0
    && Number.isFinite(bleed_mm)
    && bleed_mm >= 0;
  const maxPreviewH = 140;
  const maxPreviewW = 120;
  const bleedSpan = bleed_mm * 2;
  const outerPageWidth = pageWidth_mm + bleedSpan;
  const outerPageHeight = pageHeight_mm + bleedSpan;
  const hasValidOuterGeometry = canRenderPreview
    && Number.isFinite(bleedSpan)
    && (bleed_mm === 0 || bleedSpan > 0)
    && Number.isFinite(outerPageWidth)
    && outerPageWidth > bleedSpan
    && Number.isFinite(outerPageHeight)
    && outerPageHeight > bleedSpan
    && (bleed_mm === 0 || (
      outerPageWidth > pageWidth_mm
      && outerPageHeight > pageHeight_mm
    ));
  const scale = hasValidOuterGeometry
    ? Math.min(maxPreviewW / outerPageWidth, maxPreviewH / outerPageHeight, 1)
    : 0;
  const previewW = hasValidOuterGeometry ? pageWidth_mm * scale : 0;
  const previewH = hasValidOuterGeometry ? pageHeight_mm * scale : 0;
  const bleedScale = hasValidOuterGeometry ? bleed_mm * scale : 0;
  const previewWidthWithBleed = hasValidOuterGeometry ? outerPageWidth * scale : 0;
  const previewHeightWithBleed = hasValidOuterGeometry ? outerPageHeight * scale : 0;
  const safeZoneRight = previewWidthWithBleed - (bleedScale + previewW);
  const safeZoneBottom = previewHeightWithBleed - (bleedScale + previewH);
  const hasValidPreviewGeometry = hasValidOuterGeometry
    && Number.isFinite(scale)
    && scale > 0
    && Number.isFinite(previewW)
    && previewW > 0
    && Number.isFinite(previewH)
    && previewH > 0
    && Number.isFinite(bleedScale)
    && Number.isFinite(previewWidthWithBleed)
    && previewWidthWithBleed > 0
    && previewWidthWithBleed <= maxPreviewW
    && Number.isFinite(previewHeightWithBleed)
    && previewHeightWithBleed > 0
    && previewHeightWithBleed <= maxPreviewH
    && (bleed_mm === 0 || (
      bleedScale > 0
      && safeZoneRight > 0
      && safeZoneBottom > 0
    ));

  return (
    <div className="panel" id="canvas-designer">
      <h2 className="panel-title">
        Formato de página
      </h2>

      {/* Format selector */}
      <div
        className="form-group"
        style={{ marginBottom: 'var(--space-6)' }}
        role="group"
        aria-labelledby="format-group-label"
      >
        <span className="form-label" id="format-group-label">Formato</span>
        <div className="segment-group">
          {FORMAT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`segment-btn ${format === opt.value ? 'active' : ''}`}
              onClick={() => setFormat(opt.value)}
              id={`format-${opt.value}`}
              aria-pressed={format === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Proportion selector */}
      <div
        className="form-group"
        style={{ marginBottom: 'var(--space-6)' }}
      >
        <div className="form-label-row">
          <span className="form-label" id="proportion-group-label">Proporción</span>
          <button
            type="button"
            onClick={handleToggleProportionForm}
            aria-expanded={showProportionForm}
            aria-controls="custom-proportion-form"
            aria-label={showProportionForm ? 'Cancelar proporción personalizada' : 'Añadir proporción personalizada'}
            style={{
              background: 'none', border: 'none', color: 'var(--color-amber-600)',
              cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600,
            }}
          >
            {showProportionForm ? 'Cancelar' : '+ Person.'}
          </button>
        </div>

        {showProportionForm ? (
          <div id="custom-proportion-form" style={{ background: 'transparent', border: 'none', marginBottom: 'var(--space-3)' }}>
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label className="form-label" htmlFor="input-custom-proportion-label">Etiqueta</label>
              <input
                type="text"
                className="form-input"
                value={proportionLabel}
                onChange={event => setProportionLabel(event.target.value)}
                id="input-custom-proportion-label"
              />
            </div>
            <div className="input-row" style={{ marginBottom: 'var(--space-3)' }}>
              <div>
                <label className="form-label" htmlFor="input-custom-proportion-ratio-width">Proporción (ancho)</label>
                <input
                  type="number"
                  className="form-input"
                  value={proportionRatioWidth}
                  onChange={event => setProportionRatioWidth(event.target.value)}
                  min="0"
                  id="input-custom-proportion-ratio-width"
                  aria-describedby={customProportionError ? 'custom-proportion-error' : undefined}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="input-custom-proportion-ratio-height">Proporción (alto)</label>
                <input
                  type="number"
                  className="form-input"
                  value={proportionRatioHeight}
                  onChange={event => setProportionRatioHeight(event.target.value)}
                  min="0"
                  id="input-custom-proportion-ratio-height"
                  aria-describedby={customProportionError ? 'custom-proportion-error' : undefined}
                />
              </div>
            </div>
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label className="form-label" htmlFor="input-custom-proportion-description">Descripción</label>
              <input
                type="text"
                className="form-input"
                value={proportionDescription}
                onChange={event => setProportionDescription(event.target.value)}
                id="input-custom-proportion-description"
              />
            </div>
            {customProportionError && (
              <p className="calculation-error" id="custom-proportion-error" role="alert">
                {customProportionError}
              </p>
            )}
            <button
              type="button"
              onClick={handleAddProportion}
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
              Crear proporción
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div
              className="segment-group"
              style={{ flex: 1 }}
              role="group"
              aria-labelledby="proportion-group-label"
            >
              {proportionOptions.map(prop => (
                <button
                  key={prop.label}
                  type="button"
                  className={`segment-btn ${proportionId === prop.label ? 'active' : ''}`}
                  onClick={() => setProportion(prop.label)}
                  id={`proportion-${prop.label}`}
                  title={prop.description}
                  aria-pressed={proportionId === prop.label}
                >
                  {prop.label}
                </button>
              ))}
              {customProportions.map(prop => (
                <button
                  key={prop.label}
                  type="button"
                  className={`segment-btn ${proportionId === prop.label ? 'active' : ''}`}
                  onClick={() => setProportion(prop.label)}
                  id={`proportion-${prop.label}`}
                  title={prop.description}
                  aria-pressed={proportionId === prop.label}
                >
                  {prop.label}
                </button>
              ))}
              <button
                type="button"
                className={`segment-btn ${proportionId === null ? 'active' : ''}`}
                onClick={() => setProportion(null)}
                id="proportion-custom"
                aria-pressed={proportionId === null}
              >
                Manual
              </button>
            </div>
            {isSelectedProportionCustom && (
              <button
                type="button"
                className="remove-sheet-button"
                onClick={() => removeCustomProportion(proportionId as string)}
                title="Eliminar proporción personalizada"
                aria-label="Eliminar proporción personalizada"
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
        {isSelectedProportionCustom && (
          <ConfigSourceNote text={userLayerStorageAvailable ? 'proporción personalizada' : 'proporción personalizada, guardada solo para esta sesión'} />
        )}
      </div>

      {/* Dimensions and Units side by side */}
      <div className="canvas-dimension-grid">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="input-width">Ancho (Cerrado)</label>
          <div className="input-with-unit">
            <input
              type="number"
              className="form-input"
              value={displayW}
              onChange={e => {
                const val = parseFloat(e.target.value) || 0;
                const mm = unitSystem === 'imperial' ? val * 25.4 : val;
                setPageDimensions(mm, pageHeight_mm);
              }}
              step={unitSystem === 'imperial' ? 0.125 : 1}
              min={0}
              id="input-width"
            />
            <span className="input-unit">{unit}</span>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="input-height">Alto (Cerrado)</label>
          <div className="input-with-unit">
            <input
              type="number"
              className="form-input"
              value={displayH}
              onChange={e => {
                const val = parseFloat(e.target.value) || 0;
                const mm = unitSystem === 'imperial' ? val * 25.4 : val;
                setPageDimensions(pageWidth_mm, mm);
              }}
              step={unitSystem === 'imperial' ? 0.125 : 1}
              min={0}
              id="input-height"
            />
            <span className="input-unit">{unit}</span>
          </div>
        </div>
      </div>

      {/* Bleed */}
      <div className="form-group">
        <label className="form-label" htmlFor="input-bleed">Sangrado (Bleed)</label>
        <div className="input-with-unit">
          <input
            type="number"
            className="form-input"
            value={displayBleed}
            onChange={e => {
              const val = parseFloat(e.target.value) || 0;
              const mm = unitSystem === 'imperial' ? val * 25.4 : val;
              setBleed(mm);
            }}
            step={unitSystem === 'imperial' ? 0.0625 : 0.5}
            min={0}
            id="input-bleed"
          />
          <span className="input-unit">{unit}</span>
        </div>
      </div>

      {/* Page Preview */}
      <div className="page-preview-container">
        {hasValidPreviewGeometry ? (
          <div>
            <div
              className="page-preview"
              style={{ width: previewWidthWithBleed, height: previewHeightWithBleed }}
            >
              <div className="bleed-zone" />
              <div
                className="safe-zone"
                style={{
                  top: bleedScale,
                  left: bleedScale,
                  width: previewW,
                  height: previewH,
                }}
              />
            </div>
            <div className="page-preview-label">
              {displayW} × {displayH} {unit}
              {bleed_mm > 0 && ` + ${displayBleed} ${unit} sangrado`}
            </div>
          </div>
        ) : (
          <p className="calculation-note">
            Introduce dimensiones finitas mayores que cero y un sangrado no negativo para recuperar la vista previa.
          </p>
        )}
      </div>
    </div>
  );
}
