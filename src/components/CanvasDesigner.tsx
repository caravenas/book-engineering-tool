import { useBookStore } from '../store/useBookStore';
import { PROPORTIONS } from '../data/substrates';
import { mmToInches, roundTo } from '../engine/units';
import type { BookFormat } from '../types';

const FORMAT_OPTIONS: { value: BookFormat; label: string; icon: string }[] = [
  { value: 'vertical', label: 'Vertical', icon: '📕' },
  { value: 'landscape', label: 'Apaisado', icon: '📖' },
  { value: 'square', label: 'Cuadrado', icon: '📓' },
];

export function CanvasDesigner() {
  const {
    format, proportionId, pageWidth_mm, pageHeight_mm,
    bleed_mm, unitSystem,
    setFormat, setProportion, setPageDimensions, setBleed, setUnitSystem,
  } = useBookStore();

  // Convert for display
  const displayW = unitSystem === 'imperial' ? roundTo(mmToInches(pageWidth_mm), 2) : roundTo(pageWidth_mm, 1);
  const displayH = unitSystem === 'imperial' ? roundTo(mmToInches(pageHeight_mm), 2) : roundTo(pageHeight_mm, 1);
  const displayBleed = unitSystem === 'imperial' ? roundTo(mmToInches(bleed_mm), 3) : roundTo(bleed_mm, 1);
  const unit = unitSystem === 'imperial' ? '″' : 'mm';

  // Calculate preview dimensions (scaled to fit)
  const maxPreviewH = 140;
  const maxPreviewW = 120;
  const scale = Math.min(maxPreviewW / pageWidth_mm, maxPreviewH / pageHeight_mm, 1);
  const previewW = pageWidth_mm * scale;
  const previewH = pageHeight_mm * scale;
  const bleedScale = bleed_mm * scale;

  return (
    <div className="panel" id="canvas-designer">
      <h2 className="panel-title">
        <span className="icon">🎨</span>
        Canvas Designer
      </h2>

      {/* Format selector */}
      <div className="form-group">
        <label className="form-label">Formato</label>
        <div className="segment-group">
          {FORMAT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`segment-btn ${format === opt.value ? 'active' : ''}`}
              onClick={() => setFormat(opt.value)}
              id={`format-${opt.value}`}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Proportion selector */}
      <div className="form-group">
        <label className="form-label">Proporción</label>
        <div className="segment-group">
          {PROPORTIONS.slice(0, 3).map(prop => (
            <button
              key={prop.label}
              className={`segment-btn ${proportionId === prop.label ? 'active' : ''}`}
              onClick={() => setProportion(prop.label)}
              id={`proportion-${prop.label}`}
              title={prop.description}
            >
              {prop.label}
            </button>
          ))}
          <button
            className={`segment-btn ${proportionId === null ? 'active' : ''}`}
            onClick={() => setProportion(null)}
            id="proportion-custom"
          >
            ✏️ Manual
          </button>
        </div>
      </div>

      {/* Unit system toggle */}
      <div className="form-group">
        <label className="form-label">Unidades</label>
        <div className="segment-group">
          <button
            className={`segment-btn ${unitSystem === 'metric' ? 'active' : ''}`}
            onClick={() => setUnitSystem('metric')}
            id="unit-metric"
          >
            mm (Métrico)
          </button>
          <button
            className={`segment-btn ${unitSystem === 'imperial' ? 'active' : ''}`}
            onClick={() => setUnitSystem('imperial')}
            id="unit-imperial"
          >
            ″ (Imperial)
          </button>
        </div>
      </div>

      {/* Dimensions */}
      <div className="form-group">
        <label className="form-label">Dimensiones de página</label>
        <div className="input-row">
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
              placeholder="Ancho"
            />
            <span className="input-unit">{unit}</span>
          </div>
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
              placeholder="Alto"
            />
            <span className="input-unit">{unit}</span>
          </div>
        </div>
      </div>

      {/* Bleed */}
      <div className="form-group">
        <label className="form-label">Sangrado (Bleed)</label>
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
        <div>
          <div
            className="page-preview"
            style={{ width: previewW + bleedScale * 2, height: previewH + bleedScale * 2 }}
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
      </div>
    </div>
  );
}
