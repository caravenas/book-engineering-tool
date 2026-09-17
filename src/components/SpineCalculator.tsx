import { useState } from 'react';
import { useBookStore } from '../store/useBookStore';
import { roundTo } from '../engine/units';

function formatRoundedValue(value: number, decimals: number): string {
  const roundedValue = roundTo(value, decimals);
  return Number.isFinite(roundedValue) ? String(roundedValue) : value.toExponential();
}

function parsePositiveSafeInteger(rawValue: string): number | null {
  if (!/^\d+$/.test(rawValue)) {
    return null;
  }

  const parsedValue = Number(rawValue);
  return Number.isSafeInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

export function SpineCalculator() {
  const {
    totalPages,
    setTotalPages,
    spineResult,
    spineError,
    pageWidth_mm,
    pageHeight_mm,
    selectedGrammage,
  } = useBookStore();

  const [rawTotalPages, setRawTotalPages] = useState(() => String(totalPages));
  const parsedTotalPages = parsePositiveSafeInteger(rawTotalPages);
  const hasInvalidPageCount = parsedTotalPages === null;
  const safeResult = parsedTotalPages !== null && spineResult
    && Number.isFinite(spineResult.thickness_mm)
    && spineResult.thickness_mm > 0
    && Number.isFinite(spineResult.totalWeight_g)
    && spineResult.totalWeight_g > 0
    ? spineResult
    : null;
  const spineBarWidth = safeResult
    ? Math.max(2, Math.min(60, safeResult.thickness_mm * 3))
    : null;
  const coverHeight = 100;
  const sheetCount = Math.ceil(totalPages / 2);

  return (
    <div className="panel" id="spine-calculator">
      <h2 className="panel-title">Lomo y peso del interior</h2>
      <p className="calculation-note">
        El lomo, el calibre y el peso son referencias preliminares.
        Confirma materiales y encuadernación antes de producir.
      </p>

      <div className="spine-calculator-grid">
        <div>
          <div className="form-group">
            <label className="form-label" htmlFor="input-pages" style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
              NÚMERO DE PÁGINAS
            </label>
            <input
              type="number"
              className="form-input"
              value={rawTotalPages}
              onChange={event => {
                const rawValue = event.target.value;
                setRawTotalPages(rawValue);
                setTotalPages(parsePositiveSafeInteger(rawValue) ?? 0);
              }}
              step={1}
              min={1}
              id="input-pages"
              aria-invalid={hasInvalidPageCount}
              aria-describedby="pages-page-count-requirement"
              style={{ borderRadius: '8px', border: '1px solid var(--color-text-primary)', padding: 'var(--space-2) var(--space-3)' }}
            />
            <p className="calculation-note" id="pages-page-count-requirement">
              Introduce un número entero seguro mayor que cero para recuperar las referencias de lomo y peso.
            </p>
          </div>

          {safeResult && spineBarWidth !== null && (
            <div style={{ marginTop: 'var(--space-8)', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, marginBottom: '4px' }}>LOMO</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px' }}>→|</span>
                <div style={{ width: '4px', height: '14px', background: 'transparent' }} />
                <span style={{ fontSize: '14px' }}>|←</span>
              </div>
              <div className="spine-visual" style={{ minHeight: 'auto', padding: 0 }}>
                <div className="spine-cover back" style={{ height: coverHeight, width: '40px', borderRight: 'none' }} />
                <div className="spine-bar" style={{ width: spineBarWidth, height: coverHeight, background: 'transparent', borderTop: '1px solid var(--color-text-primary)', borderBottom: '1px solid var(--color-text-primary)' }}>
                  <div style={{ width: '1px', height: '100%', background: 'var(--color-text-primary)', margin: '0 auto' }} />
                </div>
                <div className="spine-cover front" style={{ height: coverHeight, width: '40px', borderLeft: 'none' }} />
              </div>
            </div>
          )}
        </div>

        <div>
          {safeResult && spineBarWidth !== null ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                  {formatRoundedValue(safeResult.thickness_mm, 2)} mm
                </div>
                <div style={{ width: '60px', height: '60px', border: '1px solid var(--color-text-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ width: spineBarWidth, height: '100%', background: 'var(--color-text-primary)' }} />
                </div>
              </div>

              <div className="stat-grid spine-stat-grid" style={{ gap: '8px' }}>
                <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
                  <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
                    {formatRoundedValue(safeResult.thickness_mm, 2)}
                  </div>
                  <div className="stat-label">Lomo estimado (mm)</div>
                </div>
                <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
                  <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
                    {safeResult.totalWeight_g >= 1000
                      ? `${formatRoundedValue(safeResult.totalWeight_g / 1000, 2)} kg`
                      : `${formatRoundedValue(safeResult.totalWeight_g, 1)} g`}
                  </div>
                  <div className="stat-label">Peso estimado del papel interior</div>
                </div>
                <div className="stat-card" role="group" aria-label="Hojas" style={{ borderRadius: '12px', padding: '10px 4px' }}>
                  <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>{sheetCount}</div>
                  <div className="stat-label">Hojas</div>
                </div>
                <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
                  <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>{selectedGrammage} g/m²</div>
                  <div className="stat-label">Gramaje</div>
                </div>
              </div>
            </>
          ) : (
            <p className="calculation-note">
              Corrige los valores indicados para recuperar las referencias de lomo y peso.
            </p>
          )}
        </div>
      </div>

      {spineError && (
        <p className="calculation-error" id="pages-calculation-error" role="alert">{spineError}</p>
      )}

      {safeResult && (
        <div style={{ marginTop: 'var(--space-6)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
          <p style={{ fontSize: '11px', color: 'var(--color-text-primary)', lineHeight: 1.6, fontFamily: 'var(--font-mono)' }}>
            Hojas físicas = ⌈{totalPages} ÷ 2⌉ = {sheetCount} hojas<br />
            Lomo estimado = {sheetCount} hojas × calibre<br />
            Peso interior estimado = ({formatRoundedValue(pageWidth_mm / 1000, 4)} × {formatRoundedValue(pageHeight_mm / 1000, 4)}) m² × {sheetCount} hojas × {selectedGrammage} g/m²
          </p>
        </div>
      )}
    </div>
  );
}
