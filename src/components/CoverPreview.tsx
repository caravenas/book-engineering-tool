import { useBookStore, getPlannedCover } from '../store/useBookStore';
import { formatMm, isPositiveFinite } from '../engine/units';
import type { Cover, HardCoverResult, SoftCoverResult } from '../types';

const SVG_PADDING = 30;
const SVG_MAX_WIDTH = 500;
const SVG_MAX_HEIGHT = 320;
const LABEL_SPACE = 40;
// Below this scaled width, a section/board label would overlap its
// neighbours or spill outside the shape, so it is omitted instead of drawn.
const MIN_LABEL_WIDTH_PX = 26;

interface SoftCoverSection {
  key: string;
  label: string;
  value_mm: number;
  x: number;
  width: number;
}

interface SoftCoverSvgGeometry {
  viewBoxWidth: number;
  viewBoxHeight: number;
  scaledHeight: number;
  sections: SoftCoverSection[];
  widthLabelY: number;
}

/**
 * Scaled geometry for the soft cover template: five sections laid out left
 * to right (solapa, contratapa, lomo, portada, solapa), each with a fold
 * line at its boundary. Returns `null` when the sheet size can't be scaled
 * into a usable drawing, so the caller falls back to an accessible message.
 */
function getSoftCoverSvg(cover: SoftCoverResult): SoftCoverSvgGeometry | null {
  if (!isPositiveFinite(cover.sheetWidth_mm) || !isPositiveFinite(cover.sheetHeight_mm)) {
    return null;
  }

  const scale = Math.min(
    (SVG_MAX_WIDTH - SVG_PADDING * 2) / cover.sheetWidth_mm,
    (SVG_MAX_HEIGHT - SVG_PADDING * 2 - LABEL_SPACE) / cover.sheetHeight_mm
  );
  if (!isPositiveFinite(scale)) return null;

  const scaledHeight = cover.sheetHeight_mm * scale;
  const ordered: Array<{ key: string; label: string; value_mm: number }> = [
    { key: 'flapLeft', label: 'Solapa', value_mm: cover.sections.flapLeft_mm },
    { key: 'back', label: 'Contratapa', value_mm: cover.sections.back_mm },
    { key: 'spine', label: 'Lomo', value_mm: cover.sections.spine_mm },
    { key: 'front', label: 'Portada', value_mm: cover.sections.front_mm },
    { key: 'flapRight', label: 'Solapa', value_mm: cover.sections.flapRight_mm },
  ];

  let cursor = SVG_PADDING;
  const sections: SoftCoverSection[] = ordered.map(section => {
    const width = section.value_mm * scale;
    const entry = { ...section, x: cursor, width };
    cursor += width;
    return entry;
  });

  return {
    viewBoxWidth: cover.sheetWidth_mm * scale + SVG_PADDING * 2,
    viewBoxHeight: scaledHeight + SVG_PADDING * 2 + LABEL_SPACE,
    scaledHeight,
    sections,
    widthLabelY: SVG_PADDING + scaledHeight + 20,
  };
}

interface HardCoverBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface HardCoverSvgGeometry {
  viewBoxWidth: number;
  viewBoxHeight: number;
  outer: HardCoverBox;
  leftBoard: HardCoverBox;
  spineBoard: HardCoverBox;
  rightBoard: HardCoverBox;
  widthLabelY: number;
}

/**
 * Scaled geometry for the hard cover template: the forro wrap, the two side
 * boards, the spine board, with the turn-in as the margin between the wrap
 * edge and the boards, and the hinge gaps as the space between boards.
 * `rawCover` supplies `turnIn_mm`/`hingeGap_mm` directly from the catalog
 * entry instead of re-deriving them from the computed result.
 */
function getHardCoverSvg(result: HardCoverResult, rawCover: Cover): HardCoverSvgGeometry | null {
  if (!isPositiveFinite(result.wrapWidth_mm) || !isPositiveFinite(result.wrapHeight_mm)
    || !isPositiveFinite(result.boardWidth_mm) || !isPositiveFinite(result.boardHeight_mm)
    || !isPositiveFinite(result.spineBoardWidth_mm)) {
    return null;
  }

  const scale = Math.min(
    (SVG_MAX_WIDTH - SVG_PADDING * 2) / result.wrapWidth_mm,
    (SVG_MAX_HEIGHT - SVG_PADDING * 2 - LABEL_SPACE) / result.wrapHeight_mm
  );
  if (!isPositiveFinite(scale)) return null;

  const scaledWrapWidth = result.wrapWidth_mm * scale;
  const scaledWrapHeight = result.wrapHeight_mm * scale;
  const turnInPx = rawCover.turnIn_mm * scale;
  const hingeGapPx = rawCover.hingeGap_mm * scale;
  const boardWidthPx = result.boardWidth_mm * scale;
  const boardHeightPx = result.boardHeight_mm * scale;
  const spineBoardWidthPx = result.spineBoardWidth_mm * scale;

  const outerX = SVG_PADDING;
  const outerY = SVG_PADDING;
  const boardY = outerY + turnInPx;
  const leftBoardX = outerX + turnInPx;
  const spineBoardX = leftBoardX + boardWidthPx + hingeGapPx;
  const rightBoardX = spineBoardX + spineBoardWidthPx + hingeGapPx;

  return {
    viewBoxWidth: scaledWrapWidth + SVG_PADDING * 2,
    viewBoxHeight: scaledWrapHeight + SVG_PADDING * 2 + LABEL_SPACE,
    outer: { x: outerX, y: outerY, width: scaledWrapWidth, height: scaledWrapHeight },
    leftBoard: { x: leftBoardX, y: boardY, width: boardWidthPx, height: boardHeightPx },
    spineBoard: { x: spineBoardX, y: boardY, width: spineBoardWidthPx, height: boardHeightPx },
    rightBoard: { x: rightBoardX, y: boardY, width: boardWidthPx, height: boardHeightPx },
    widthLabelY: outerY + scaledWrapHeight + 20,
  };
}

/**
 * The cover panel's proportional SVG template, read straight from the store
 * instead of taking props: R-3 moves this into its own column, where the
 * panel that draws it today won't be able to pass it anything. The soft and
 * hard cover cases are mutually exclusive branches of the same plan, so they
 * live in one component instead of two.
 */
function CoverSvg() {
  const { catalog, coverId, coverPlan } = useBookStore();
  const selectedCover = catalog?.covers.find(cover => cover.id === coverId) ?? null;
  const plan = getPlannedCover(coverPlan);

  const softSvg = plan && plan.kind === 'blanda' ? getSoftCoverSvg(plan) : null;
  const hardSvg = plan && plan.kind === 'dura' && selectedCover
    ? getHardCoverSvg(plan, selectedCover)
    : null;

  if (softSvg && plan && plan.kind === 'blanda') {
    return (
      <svg
        className="cover-svg"
        viewBox={`0 0 ${softSvg.viewBoxWidth} ${softSvg.viewBoxHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Plantilla proporcional de la tapa blanda"
      >
        {softSvg.sections.map(section => (
          <g key={section.key}>
            <rect
              className="cover-section-rect"
              x={section.x}
              y={SVG_PADDING}
              width={section.width}
              height={softSvg.scaledHeight}
            />
            {section.width >= MIN_LABEL_WIDTH_PX && (
              <text
                className="dimension-text"
                x={section.x + section.width / 2}
                y={SVG_PADDING + softSvg.scaledHeight / 2}
                textAnchor="middle"
              >
                {section.label} {formatMm(section.value_mm)}
              </text>
            )}
          </g>
        ))}
        <text
          className="dimension-text"
          x={softSvg.viewBoxWidth / 2}
          y={softSvg.widthLabelY}
          textAnchor="middle"
        >
          {formatMm(plan.sheetWidth_mm)} × {formatMm(plan.sheetHeight_mm)} mm
        </text>
      </svg>
    );
  }

  if (hardSvg && plan && plan.kind === 'dura') {
    return (
      <svg
        className="cover-svg"
        viewBox={`0 0 ${hardSvg.viewBoxWidth} ${hardSvg.viewBoxHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Plantilla proporcional de la tapa dura"
      >
        <rect
          className="cover-wrap-rect"
          x={hardSvg.outer.x}
          y={hardSvg.outer.y}
          width={hardSvg.outer.width}
          height={hardSvg.outer.height}
        />
        {[
          { key: 'leftBoard', box: hardSvg.leftBoard, label: 'Cartón', value_mm: plan.boardWidth_mm },
          { key: 'spineBoard', box: hardSvg.spineBoard, label: 'Lomo', value_mm: plan.spineBoardWidth_mm },
          { key: 'rightBoard', box: hardSvg.rightBoard, label: 'Cartón', value_mm: plan.boardWidth_mm },
        ].map(board => (
          <g key={board.key}>
            <rect
              className="cover-section-rect"
              x={board.box.x}
              y={board.box.y}
              width={board.box.width}
              height={board.box.height}
            />
            {board.box.width >= MIN_LABEL_WIDTH_PX && (
              <text
                className="dimension-text"
                x={board.box.x + board.box.width / 2}
                y={board.box.y + board.box.height / 2}
                textAnchor="middle"
              >
                {board.label} {formatMm(board.value_mm)}
              </text>
            )}
          </g>
        ))}
        <text
          className="dimension-text"
          x={hardSvg.viewBoxWidth / 2}
          y={hardSvg.widthLabelY}
          textAnchor="middle"
        >
          {formatMm(plan.wrapWidth_mm)} × {formatMm(plan.wrapHeight_mm)} mm (canal {formatMm(selectedCover?.hingeGap_mm ?? 0)} mm, doblez {formatMm(selectedCover?.turnIn_mm ?? 0)} mm)
        </text>
      </svg>
    );
  }

  return null;
}

/**
 * The template drawing with the container and the empty state that belongs to
 * it: when there is no drawable plan, the panel used to say so on the
 * preview's behalf, which only worked while the two lived side by side.
 */
export function CoverPreview() {
  const { coverPlan } = useBookStore();
  const plan = getPlannedCover(coverPlan);

  return (
    <div className="cover-svg-container">
      <CoverSvg />
      {!plan && (
        <p className="calculation-note" role="status">
          {coverPlan && !coverPlan.ok
            ? 'No hay plantilla disponible: el panel de Tapa explica por qué.'
            : 'Corrige los valores indicados para recuperar la plantilla de la tapa.'}
        </p>
      )}
    </div>
  );
}
