import {
  useBookStore, getSafeSpineResult, getAllCovers, getAllSubstrates, getAllGrammageOptions,
} from '../store/useBookStore';
import { formatRoundedValue } from '../engine/units';

/**
 * How much the drawing exaggerates the spine. A 32-page book is two
 * millimetres thick: at true scale it is a line, and a line says nothing
 * about a thickness. The factor is drawn in the caption rather than left for
 * the reader to discover from a measurement that does not match the drawing.
 */
const SPINE_SCALE = 8;

/** How tall the block is drawn, and the least a board may be drawn at. */
const BLOCK_HEIGHT = 260;
const MIN_BOARD_PX = 2;

/**
 * The spine seen from above, which is the one view of a book where its
 * thickness is the subject: the two covers on edge, and between them the
 * paper block, hatched because it is a stack of sheets rather than a solid.
 *
 * Until R-20 this was two drawings — a profile with two covers and a 60px
 * swatch of the same measurement — which said one thing twice. The design
 * canvas draws it once, at a declared scale, with the figure under it.
 */
export function SpineView() {
  const {
    catalog, totalPagesInput, totalPages, spineResult, bindingSpine,
    coverId, customCovers, coverPatches, hiddenCoverIds,
    substrateId, selectedGrammage, customSubstrates, substratePatches, hiddenSubstrateIds, customGrammages,
  } = useBookStore();

  const safeResult = getSafeSpineResult(totalPagesInput, spineResult);

  if (!safeResult) {
    return (
      <p className="calculation-note" role="status">
        Corrige los valores indicados para recuperar el dibujo del lomo.
      </p>
    );
  }

  const cover = catalog
    ? getAllCovers(catalog, customCovers, coverPatches, hiddenCoverIds).find(item => item.id === coverId)
    : undefined;
  const board_mm = cover?.boardThickness_mm ?? 0;
  // The declared caliper of the paper in use, the figure the whole thickness
  // is built from, read the same way the paper step reads it.
  const substrates = catalog
    ? getAllSubstrates(catalog, customSubstrates, substratePatches, hiddenSubstrateIds)
    : customSubstrates;
  const caliper = getAllGrammageOptions(substrates, substrateId, customGrammages)
    .find(option => option.grammage === selectedGrammage)?.caliper ?? 0;
  const sheets = Math.ceil(totalPages / 2);

  // The paper block, and whatever the binding adds to it, drawn apart: the
  // allowance is glue or thread, not paper, and hatching it would say it is.
  const blockPx = Math.max(2, safeResult.thickness_mm * SPINE_SCALE);
  const allowancePx = bindingSpine ? Math.max(0, (bindingSpine.total_mm - bindingSpine.interior_mm) * SPINE_SCALE) : 0;
  const boardPx = board_mm > 0 ? Math.max(MIN_BOARD_PX, board_mm * SPINE_SCALE) : MIN_BOARD_PX;
  const total_mm = (bindingSpine?.total_mm ?? safeResult.thickness_mm) + 2 * board_mm;

  return (
    <div className="spine-view">
      <div className="spine-block" style={{ height: `${BLOCK_HEIGHT}px` }}>
        <span className="spine-board" style={{ width: `${boardPx}px` }} />
        <span className="spine-paper" style={{ width: `${blockPx}px` }} />
        {allowancePx > 0 && <span className="spine-allowance" style={{ width: `${allowancePx}px` }} />}
        <span className="spine-board" style={{ width: `${boardPx}px` }} />
      </div>

      <div className="spine-figure-block">
        <div className="spine-value">
          {formatRoundedValue(total_mm, 2)} <span className="spine-unit">mm</span>
        </div>
        <div className="spine-caption">
          canto visto desde arriba · escala {SPINE_SCALE}:1 · {sheets} hojas × {caliper} µm
        </div>
      </div>
    </div>
  );
}
