import { useBookStore } from '../store/useBookStore';
import { getPageDisplayDimensions } from '../engine/units';

/**
 * The page-dimensions panel's proportional preview, read straight from the
 * store instead of taking props: R-3 moves this into its own column, where
 * the panel that draws it today won't be able to pass it anything.
 */
export function PagePreview() {
  const { pageWidth_mm, pageHeight_mm, bleed_mm, unitSystem } = useBookStore();

  // Keep invalid input away from CSS geometry while the calculators report how to recover.
  const canRenderPreview = Number.isFinite(pageWidth_mm)
    && pageWidth_mm > 0
    && Number.isFinite(pageHeight_mm)
    && pageHeight_mm > 0
    && Number.isFinite(bleed_mm)
    && bleed_mm >= 0;
  // Sized for a corner of a panel it no longer sits in: with a view of its own
  // it gets the column, within the bounds the sheet and cover drawings use.
  const maxPreviewH = 420;
  const maxPreviewW = 360;
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
    // No clamp at 1: that kept the drawing at a millimetre per pixel, so a
    // small page stayed small however much room the view gave it.
    ? Math.min(maxPreviewW / outerPageWidth, maxPreviewH / outerPageHeight)
    : 0;
  const previewW = hasValidOuterGeometry ? pageWidth_mm * scale : 0;
  const previewH = hasValidOuterGeometry ? pageHeight_mm * scale : 0;
  const bleedScale = hasValidOuterGeometry ? bleed_mm * scale : 0;
  /*
   * Clamped, because scaling to fit lands exactly on the bound and binary
   * arithmetic overshoots it: 420.00000000000006 is not <= 420, and the
   * check below would then reject a perfectly good page. One in every
   * twenty-eight sizes did that, a 100 × 150 mm paperback among them. The
   * overshoot is 6e-14 of a pixel, so clamping changes nothing that is drawn.
   */
  const previewWidthWithBleed = hasValidOuterGeometry ? Math.min(outerPageWidth * scale, maxPreviewW) : 0;
  const previewHeightWithBleed = hasValidOuterGeometry ? Math.min(outerPageHeight * scale, maxPreviewH) : 0;
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

  const { displayW, displayH, displayBleed, unit } = getPageDisplayDimensions(
    pageWidth_mm, pageHeight_mm, bleed_mm, unitSystem
  );

  return (
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
  );
}
