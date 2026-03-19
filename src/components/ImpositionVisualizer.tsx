import { useState } from 'react';
import { useBookStore, getAllSheetSizes } from '../store/useBookStore';
import { roundTo } from '../engine/units';

export function ImpositionVisualizer() {
  const {
    impositionResult,
    sheetSizeId,
    customSheetSizes,
    pageOrientation,
    bleed_mm,
    setSheetSize,
    addCustomSheetSize,
    removeCustomSheetSize,
    setPageOrientation
  } = useBookStore();

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customW, setCustomW] = useState('');
  const [customH, setCustomH] = useState('');

  const allSheets = getAllSheetSizes(customSheetSizes);
  const currentSheet = allSheets.find(s => s.id === sheetSizeId);

  const handleAddCustom = () => {
    const wVal = parseInt(customW, 10);
    const hVal = parseInt(customH, 10);

    if (wVal > 0 && hVal > 0) {
      addCustomSheetSize(customName.trim(), wVal, hVal);
      setShowCustomForm(false);
      setCustomName('');
      setCustomW('');
      setCustomH('');
    }
  };

  // SVG rendering
  const svgPadding = 30;
  const svgMaxWidth = 500;
  const svgMaxHeight = 400;

  let svgContent = null;

  if (currentSheet && impositionResult) {
    const sheetW = currentSheet.width_mm;
    const sheetH = currentSheet.height_mm;

    // Scale to fit in SVG viewBox
    const scale = Math.min(
      (svgMaxWidth - svgPadding * 2) / sheetW,
      (svgMaxHeight - svgPadding * 2) / sheetH
    );

    const scaledW = sheetW * scale;
    const scaledH = sheetH * scale;
    const viewBoxW = scaledW + svgPadding * 2;
    const viewBoxH = scaledH + svgPadding * 2 + 20;

    svgContent = (
      <svg
        className="imposition-svg"
        viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Sheet background */}
        <rect
          className="sheet-bg"
          x={svgPadding}
          y={svgPadding}
          width={scaledW}
          height={scaledH}
        />

        {/* Pages placed on sheet */}
        {impositionResult.placements.map((p, i) => {
          // Inner rect for the safe zone (page minus bleed)
          const safeX = p.x + bleed_mm;
          const safeY = p.y + bleed_mm;
          const safeW = p.width - bleed_mm * 2;
          const safeH = p.height - bleed_mm * 2;

          return (
            <g key={i}>
              {/* Full page including bleed */}
              <rect
                className="page-rect"
                x={svgPadding + p.x * scale}
                y={svgPadding + p.y * scale}
                width={p.width * scale}
                height={p.height * scale}
              />
              {/* Safe zone (no bleed) */}
              <rect
                className="safe-zone"
                x={svgPadding + safeX * scale}
                y={svgPadding + safeY * scale}
                width={safeW * scale}
                height={safeH * scale}
              />
              <text
                className="page-number"
                x={svgPadding + (p.x + p.width / 2) * scale}
                y={svgPadding + (p.y + p.height / 2) * scale}
              >
                {i + 1}
              </text>
            </g>
          );
        })}

        {/* Sheet dimensions label */}
        <text
          className="dimension-text"
          x={svgPadding + scaledW / 2}
          y={svgPadding + scaledH + 16}
          textAnchor="middle"
        >
          {sheetW} × {sheetH} mm
        </text>
      </svg>
    );
  }

  // Waste classification
  const wasteLevel = !impositionResult
    ? 'high'
    : impositionResult.wastePercentage <= 15
      ? 'low'
      : impositionResult.wastePercentage <= 30
        ? 'medium'
        : 'high';

  const wasteLabel = wasteLevel === 'low'
    ? 'Excelente aprovechamiento'
    : wasteLevel === 'medium'
      ? 'Aprovechamiento aceptable'
      : 'Alta merma — considere otro pliego';

  return (
    <div className="panel" id="imposition-visualizer">
      <h2 className="panel-title">
        Motor de Imposición
      </h2>

      {/* Sheet size selector */}
      <div className="input-row">
        <div className="form-group">
          <label className="form-label">Rotación</label>
          <select
            className="form-input"
            value={pageOrientation}
            onChange={e => setPageOrientation(e.target.value as 'auto' | 'normal' | 'rotated')}
          >
            <option value="auto">Automática (Óptima)</option>
            <option value="normal">Normal</option>
            <option value="rotated">Rotada 90°</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Tamaño pliego</span>
            <button
              type="button"
              onClick={() => setShowCustomForm(!showCustomForm)}
              style={{
                background: 'none', border: 'none', color: 'var(--color-amber-400)',
                cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600
              }}
            >
              {showCustomForm ? 'Cancelar' : '+ Person.'}
            </button>
          </label>

          {showCustomForm ? (
            <div style={{
              background: 'transparent',
              border: 'none',
              marginBottom: 'var(--space-3)'
            }}>
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nombre (opcional)"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                />
              </div>
              <div className="input-row" style={{ marginBottom: 'var(--space-3)' }}>
                <div className="input-with-unit">
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Ancho"
                    value={customW}
                    onChange={e => setCustomW(e.target.value)}
                    min="1"
                  />
                  <span className="input-unit">mm</span>
                </div>
                <div className="input-with-unit">
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Alto"
                    value={customH}
                    onChange={e => setCustomH(e.target.value)}
                    min="1"
                  />
                  <span className="input-unit">mm</span>
                </div>
              </div>
              <button
                onClick={handleAddCustom}
                style={{
                  width: '100%',
                  padding: 'var(--space-2)',
                  background: 'var(--color-text-primary)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Crear Pliego
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                className="form-input"
                value={sheetSizeId}
                onChange={e => setSheetSize(e.target.value)}
                id="select-sheet-size"
                style={{ flex: 1 }}
              >
                {allSheets.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.width_mm}×{s.height_mm} mm)
                  </option>
                ))}
              </select>
              {customSheetSizes.some(cs => cs.id === sheetSizeId) && (
                <button
                  onClick={() => removeCustomSheetSize(sheetSizeId)}
                  title="Eliminar pliego personalizado"
                  style={{
                    background: 'rgba(244, 63, 94, 0.15)',
                    color: 'var(--color-rose-400)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    width: '42px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px'
                  }}
                >
                  ×
                </button>
              )}
            </div>
          )}
        </div></div>

      {/* Optimization Warning */}
      {impositionResult && !impositionResult.optimal && impositionResult.pagesPerSide > 0 && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
          display: 'flex',
          gap: 'var(--space-2)',
          alignItems: 'flex-start'
        }}>
          <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-rose-400)' }}>
            <strong>Disposición no óptima.</strong> Esta rotación genera más merma o ubica menos páginas que la orientación inversa.
          </p>
        </div>
      )}

      {/* SVG Diagram */}
      <div className="imposition-svg-container">
        {svgContent || (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            Configurando imposición...
          </p>
        )}
      </div>

      {/* Stats */}
      {impositionResult && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', marginTop: 'var(--space-6)' }}>
            <div style={{ padding: 'var(--space-3)', textAlign: 'center', borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{impositionResult.pagesPerSide}</div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 600, color: 'var(--color-text-primary)' }}>Pags / cara</div>
            </div>
            <div style={{ padding: 'var(--space-3)', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {impositionResult.cols} × {impositionResult.rows}
              </div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 600, color: 'var(--color-text-primary)' }}>Disposición</div>
            </div>
            <div style={{ padding: 'var(--space-3)', textAlign: 'center', borderRight: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {roundTo(impositionResult.wastePercentage, 1)}%
              </div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 600, color: 'var(--color-text-primary)' }}>Merma</div>
            </div>
            <div style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {impositionResult.rotated ? 'Rotada' : 'Normal'}
              </div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 600, color: 'var(--color-text-primary)' }}>Orientación</div>
            </div>
          </div>

          {/* Waste indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: wasteLevel === 'low' ? '#10b981' : wasteLevel === 'medium' ? '#f59e0b' : '#E63946' }} />
            <span style={{ fontSize: '12px', color: wasteLevel === 'low' ? '#10b981' : wasteLevel === 'medium' ? '#f59e0b' : '#E63946', fontWeight: 500 }}>
              {wasteLabel}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
