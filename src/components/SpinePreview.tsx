import { useBookStore, getSafeSpineResult } from '../store/useBookStore';
import { formatRoundedValue } from '../engine/units';
import type { SpineResult } from '../types';

const COVER_HEIGHT = 100;

/**
 * The spine calculator's two drawing pieces (the two-cover profile and the
 * thickness swatch) both need the same safe result and the same pixel width
 * for the spine bar, clamped so it stays visible without dwarfing the
 * covers. Read once here instead of copied in each piece.
 */
function useSpineGeometry(): { safeResult: SpineResult | null; spineBarWidth: number | null } {
  const { totalPagesInput, spineResult } = useBookStore();
  const safeResult = getSafeSpineResult(totalPagesInput, spineResult);
  const spineBarWidth = safeResult
    ? Math.max(2, Math.min(60, safeResult.thickness_mm * 3))
    : null;
  return { safeResult, spineBarWidth };
}

/**
 * The spine calculator's two-cover profile, read straight from the store
 * instead of taking props: R-3 moves this into its own column, where the
 * panel that draws it today won't be able to pass it anything.
 */
export function SpinePreview() {
  const { safeResult, spineBarWidth } = useSpineGeometry();
  if (!safeResult || spineBarWidth === null) return null;

  return (
    <div style={{ marginTop: 'var(--space-8)', textAlign: 'center' }}>
      <div style={{ fontSize: '10px', fontWeight: 600, marginBottom: '4px' }}>LOMO</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '14px' }}>→|</span>
        <div style={{ width: '4px', height: '14px', background: 'transparent' }} />
        <span style={{ fontSize: '14px' }}>|←</span>
      </div>
      <div className="spine-visual" style={{ minHeight: 'auto', padding: 0 }}>
        <div className="spine-cover back" style={{ height: COVER_HEIGHT, width: '40px', borderRight: 'none' }} />
        <div className="spine-bar" style={{ width: spineBarWidth, height: COVER_HEIGHT, background: 'transparent', borderTop: '1px solid var(--color-text-primary)', borderBottom: '1px solid var(--color-text-primary)' }}>
          <div style={{ width: '1px', height: '100%', background: 'var(--color-text-primary)', margin: '0 auto' }} />
        </div>
        <div className="spine-cover front" style={{ height: COVER_HEIGHT, width: '40px', borderLeft: 'none' }} />
      </div>
    </div>
  );
}

/**
 * The spine calculator's thickness swatch, read straight from the store
 * instead of taking props, for the same reason as `SpinePreview` above.
 * It stays a separate piece from `SpinePreview` because the panel lays the
 * two profiles out in different columns, and merging them into one mount
 * point would stack their combined height into a single column instead of
 * two, growing the panel well past its pinned height.
 */
export function SpineThicknessPreview() {
  const { safeResult, spineBarWidth } = useSpineGeometry();
  if (!safeResult || spineBarWidth === null) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
        {formatRoundedValue(safeResult.thickness_mm, 2)} mm
      </div>
      <div style={{ width: '60px', height: '60px', border: '1px solid var(--color-text-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: spineBarWidth, height: '100%', background: 'var(--color-text-primary)' }} />
      </div>
    </div>
  );
}
