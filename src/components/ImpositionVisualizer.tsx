import { useBookStore } from '../store/useBookStore';
import { SHEET_SIZES } from '../data/substrates';
import { roundTo } from '../engine/units';

export function ImpositionVisualizer() {
  const {
    impositionResult, sheetSizeId, setSheetSize,
  } = useBookStore();

  const currentSheet = SHEET_SIZES.find(s => s.id === sheetSizeId);

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
        {impositionResult.placements.map((p, i) => (
          <g key={i}>
            <rect
              className="page-rect"
              x={svgPadding + p.x * scale}
              y={svgPadding + p.y * scale}
              width={p.width * scale}
              height={p.height * scale}
            />
            <text
              className="page-number"
              x={svgPadding + (p.x + p.width / 2) * scale}
              y={svgPadding + (p.y + p.height / 2) * scale}
            >
              {i + 1}
            </text>
          </g>
        ))}

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
        <span className="icon">🖨️</span>
        Motor de Imposición
      </h2>

      {/* Sheet size selector */}
      <div className="form-group">
        <label className="form-label">Tamaño del pliego</label>
        <select
          className="form-input"
          value={sheetSizeId}
          onChange={e => setSheetSize(e.target.value)}
          id="select-sheet-size"
        >
          {SHEET_SIZES.map(s => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.width_mm}×{s.height_mm} mm)
            </option>
          ))}
        </select>
      </div>

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
          <div className="stat-grid" style={{ marginTop: 'var(--space-4)' }}>
            <div className="stat-card">
              <div className="stat-value amber">{impositionResult.pagesPerSide}</div>
              <div className="stat-label">Pags / cara</div>
            </div>
            <div className="stat-card">
              <div className="stat-value sky">
                {impositionResult.cols} × {impositionResult.rows}
              </div>
              <div className="stat-label">Disposición</div>
            </div>
            <div className="stat-card">
              <div className={`stat-value ${wasteLevel === 'low' ? 'emerald' : wasteLevel === 'medium' ? 'amber' : 'rose'}`}>
                {roundTo(impositionResult.wastePercentage, 1)}%
              </div>
              <div className="stat-label">Merma</div>
            </div>
            <div className="stat-card">
              <div className="stat-value emerald">
                {impositionResult.rotated ? 'Rotada' : 'Normal'}
              </div>
              <div className="stat-label">Orientación</div>
            </div>
          </div>

          {/* Waste indicator */}
          <div className={`waste-indicator ${wasteLevel}`}>
            <div className="waste-dot" />
            <span className="waste-text">{wasteLabel}</span>
          </div>
        </>
      )}
    </div>
  );
}
