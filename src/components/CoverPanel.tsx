import { useBookStore, getAllBindings } from '../store/useBookStore';
import { roundTo } from '../engine/units';
import { ConfigSourceNote } from './ConfigSourceNote';
import type { Binding, Cover, HardCoverResult, SoftCoverResult } from '../types';

const SVG_PADDING = 30;
const SVG_MAX_WIDTH = 500;
const SVG_MAX_HEIGHT = 320;
const LABEL_SPACE = 40;
// Below this scaled width, a section/board label would overlap its
// neighbours or spill outside the shape, so it is omitted instead of drawn.
const MIN_LABEL_WIDTH_PX = 26;

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/**
 * A cover is compatible with a binding when it's soft, or when it's hard and
 * the binding doesn't nest its signatures (i.e. has a flat spine). `binding`
 * is `null` when the configured binding id isn't in the catalog, in which
 * case only soft covers are offered.
 */
function isCoverCompatible(cover: Cover, binding: Binding | null): boolean {
  return cover.kind === 'blanda' || binding?.nests === false;
}

function formatMm(value: number): string {
  const rounded = roundTo(value, 2);
  return Number.isFinite(rounded) ? String(rounded) : value.toExponential();
}

function formatWeight(grams: number): string {
  return grams >= 1000 ? `${formatMm(grams / 1000)} kg` : `${formatMm(grams)} g`;
}

function formatArea(area_m2: number): string {
  const rounded = roundTo(area_m2, 4);
  return Number.isFinite(rounded) ? String(rounded) : area_m2.toExponential();
}

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

export function CoverPanel() {
  const {
    catalog, coverId, bindingId, customBindings, bindingPatches, hiddenBindingIds, setCover, coverPlan, coverError,
  } = useBookStore();

  const selectedCover = catalog?.covers.find(cover => cover.id === coverId) ?? null;
  const selectedBinding = catalog
    ? getAllBindings(catalog, customBindings, bindingPatches, hiddenBindingIds).find(binding => binding.id === bindingId) ?? null
    : null;
  const plan = coverPlan?.ok ? coverPlan.cover : null;

  const softSvg = plan && plan.kind === 'blanda' ? getSoftCoverSvg(plan) : null;
  const hardSvg = plan && plan.kind === 'dura' && selectedCover
    ? getHardCoverSvg(plan, selectedCover)
    : null;

  return (
    <div className="panel" id="cover-panel">
      <h2 className="panel-title">Tapa</h2>
      <p className="calculation-note">
        Medidas, peso y plantilla de la tapa son referencias preliminares a partir del lomo final calculado.
        Confirma encajado y tolerancias de producción con tu taller antes de producir.
      </p>

      <div className="form-group">
        <label className="form-label" htmlFor="select-cover">Tipo de tapa</label>
        <select
          className="form-input"
          value={coverId}
          onChange={event => setCover(event.target.value)}
          id="select-cover"
        >
          {catalog?.covers
            .filter(cover => isCoverCompatible(cover, selectedBinding) || cover.id === coverId)
            .map(cover => (
              <option
                key={cover.id}
                value={cover.id}
                disabled={!isCoverCompatible(cover, selectedBinding)}
              >
                {cover.name}
              </option>
            ))}
        </select>
        {catalog && (
          <ConfigSourceNote file="config/tapas.json" text={catalog.coversSource} />
        )}
      </div>

      {coverError && (
        <p className="calculation-error" role="alert">{coverError}</p>
      )}

      {coverPlan && !coverPlan.ok && (
        <p className="calculation-note" role="status">{coverPlan.message}</p>
      )}

      {plan && plan.kind === 'blanda' && (
        <>
          <div className="stat-grid spine-stat-grid" style={{ gap: '8px', marginTop: 'var(--space-4)' }}>
            <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
              <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
                {formatMm(plan.sheetWidth_mm)}
              </div>
              <div className="stat-label">Ancho del pliego de tapa (mm)</div>
            </div>
            <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
              <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
                {formatMm(plan.sheetHeight_mm)}
              </div>
              <div className="stat-label">Alto del pliego de tapa (mm)</div>
            </div>
            <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
              <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
                {formatWeight(plan.paperWeight_g)}
              </div>
              <div className="stat-label">Peso del papel de tapa</div>
            </div>
          </div>

          <ul className="cover-sections-list" aria-label="Secciones del pliego de tapa">
            <li>Solapa: {formatMm(plan.sections.flapLeft_mm)} mm</li>
            <li>Contratapa: {formatMm(plan.sections.back_mm)} mm</li>
            <li>Lomo: {formatMm(plan.sections.spine_mm)} mm</li>
            <li>Portada: {formatMm(plan.sections.front_mm)} mm</li>
            <li>Solapa: {formatMm(plan.sections.flapRight_mm)} mm</li>
          </ul>

          {plan.sections.spine_mm === 0 && (
            <p className="calculation-note" style={{ marginTop: 'var(--space-2)' }}>
              Este método pliega una sola hoja por el centro, así que la tapa no tiene panel de lomo.
            </p>
          )}
        </>
      )}

      {plan && plan.kind === 'dura' && (
        <>
          <div className="stat-grid spine-stat-grid" style={{ gap: '8px', marginTop: 'var(--space-4)' }}>
            <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
              <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
                {formatMm(plan.boardWidth_mm)}
              </div>
              <div className="stat-label">Ancho del cartón lateral (mm)</div>
            </div>
            <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
              <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
                {formatMm(plan.boardHeight_mm)}
              </div>
              <div className="stat-label">Alto del cartón (mm)</div>
            </div>
            <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
              <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
                {formatMm(plan.spineBoardWidth_mm)}
              </div>
              <div className="stat-label">Ancho del cartón de lomo (mm)</div>
            </div>
            <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
              <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
                {formatMm(plan.wrapWidth_mm)}
              </div>
              <div className="stat-label">Ancho del forro (mm)</div>
            </div>
            <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
              <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
                {formatMm(plan.wrapHeight_mm)}
              </div>
              <div className="stat-label">Alto del forro (mm)</div>
            </div>
            <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
              <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
                {formatWeight(plan.paperWeight_g)}
              </div>
              <div className="stat-label">Peso del forro</div>
            </div>
            <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
              <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
                {formatArea(plan.sideBoardArea_m2)}
              </div>
              <div className="stat-label">Área de cartón lateral (m²)</div>
            </div>
            <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
              <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
                {formatArea(plan.spineBoardArea_m2)}
              </div>
              <div className="stat-label">Área de cartón de lomo (m²)</div>
            </div>
            <div className="stat-card" style={{ borderRadius: '12px', padding: '10px 4px' }}>
              <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
                {formatArea(plan.boardArea_m2)}
              </div>
              <div className="stat-label">Área total de cartón (m²)</div>
            </div>
          </div>
          <p className="calculation-note" style={{ marginTop: 'var(--space-2)' }}>
            No se calcula el peso del cartón: el catálogo no declara una densidad de cartón, e inventar una produciría un número ficticio.
          </p>
        </>
      )}

      <div className="cover-svg-container">
        {softSvg && plan && plan.kind === 'blanda' ? (
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
        ) : hardSvg && plan && plan.kind === 'dura' ? (
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
        ) : (
          <p className="calculation-note" role="status">
            {coverPlan && !coverPlan.ok
              ? 'No hay plantilla disponible: revisa el mensaje anterior.'
              : 'Corrige los valores indicados para recuperar la plantilla de la tapa.'}
          </p>
        )}
      </div>
    </div>
  );
}
