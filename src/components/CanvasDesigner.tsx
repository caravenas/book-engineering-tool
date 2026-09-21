import { useCatalogPanel } from './CatalogPanel';
import { useBookStore, getAllProportions } from '../store/useBookStore';
import { getPageDisplayDimensions } from '../engine/units';
import { ConfigSourceNote } from './ConfigSourceNote';
import { getCatalogOrigin, CatalogOriginNote } from './CatalogOrigin';
import type { BookFormat } from '../types';

const FORMAT_OPTIONS: { value: BookFormat; label: string }[] = [
  { value: 'vertical', label: 'Vertical' },
  { value: 'landscape', label: 'Apaisado' },
  { value: 'square', label: 'Cuadrado' },
];

export function CanvasDesigner() {
  const { open: openCatalog } = useCatalogPanel();
  const {
    format, proportionId, pageWidth_mm, pageHeight_mm,
    bleed_mm, unitSystem, catalog,
    customProportions, proportionPatches, hiddenProportionLabels, userLayerStorageAvailable,
    setFormat, setProportion, setPageDimensions, setBleed,
  } = useBookStore();


  const customProportionLabels = new Set(customProportions.map(prop => prop.label));
  const effectiveProportions = catalog
    ? getAllProportions(catalog, customProportions, proportionPatches, hiddenProportionLabels)
    : [];
  const proportionOptions = effectiveProportions
    .filter(prop => !customProportionLabels.has(prop.label))
    .slice(0, 3);
  const isSelectedProportionCustom = customProportions.some(prop => prop.label === proportionId);
  const proportionOrigin = getCatalogOrigin(proportionId, customProportions.map(prop => prop.label), proportionPatches.map(patch => patch.label));


  const { displayW, displayH, displayBleed, unit } = getPageDisplayDimensions(
    pageWidth_mm, pageHeight_mm, bleed_mm, unitSystem
  );

  return (
    <div className="panel" id="canvas-designer">
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
            className="step-options"
            aria-label="Opciones de proporción"
            aria-haspopup="dialog"
            onClick={() => openCatalog('proportions')}
          >
            ···
          </button>
        </div>

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
        </div>
        {isSelectedProportionCustom && (
          <ConfigSourceNote text={userLayerStorageAvailable ? 'proporción personalizada' : 'proporción personalizada, guardada solo para esta sesión'} />
        )}
        {proportionId !== null && <CatalogOriginNote origin={proportionOrigin} />}
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

    </div>
  );
}
