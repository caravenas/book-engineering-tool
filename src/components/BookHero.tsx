import { useBookFigures, SPINE_EXAGGERATION } from './bookFigures';
import { getPageDisplayDimensions, formatRoundedValue, isPositiveFinite } from '../engine/units';
import { useBookStore } from '../store/useBookStore';

/**
 * The book itself, at one scale, before any of the figures below it.
 *
 * Three things drawn side by side and measured the same way: the page as it
 * will be trimmed, the edge of the block seen end-on, and the stack of press
 * sheets one copy costs. The spine is the only one exaggerated, because at
 * true scale a two-millimetre spine is a line; the factor is written under it
 * rather than left for the reader to infer from a drawing that does not match
 * its own measurement.
 *
 * Nothing here is a new calculation. Every number is one the engines already
 * report, read through `useBookFigures` so the drawing and the figures under
 * it cannot come from two different derivations.
 */

/** How tall the page is drawn, and how wide it may get, in pixels. */
const HERO_HEIGHT = 230;
const HERO_MAX_PAGE_WIDTH = 240;

/** At most this many sheets are drawn; the last one says the rest are there. */
const MAX_DRAWN_SHEETS = 12;

export function BookHero() {
  const figures = useBookFigures();
  const { pageWidth_mm, pageHeight_mm, bleed_mm, unitSystem, selectedGrammage } = useBookStore();
  const { displayW, displayH, unit } = getPageDisplayDimensions(pageWidth_mm, pageHeight_mm, bleed_mm, unitSystem);

  // The drawing is geometry, so it waits for a page that has one. The steps
  // are already saying what is wrong with it; a hero drawn from a NaN would
  // add a broken picture to a message that is doing its job.
  if (!isPositiveFinite(figures.pageWidth_mm) || !isPositiveFinite(figures.pageHeight_mm)) return null;

  const scale = Math.min(HERO_HEIGHT / figures.pageHeight_mm, HERO_MAX_PAGE_WIDTH / figures.pageWidth_mm);
  const pageHeight = figures.pageHeight_mm * scale;
  const pageWidth = figures.pageWidth_mm * scale;
  const edge_mm = figures.edgeTotal_mm;
  const spineWidth = edge_mm === null ? 0 : Math.max(6, edge_mm * SPINE_EXAGGERATION * scale);
  const boardWidth = figures.board_mm > 0
    ? Math.max(2, figures.board_mm * SPINE_EXAGGERATION * scale)
    : 1;

  const sheetsPerCopy = figures.plan?.sheetsPerCopy ?? null;
  const drawnSheets = sheetsPerCopy === null ? 0 : Math.min(sheetsPerCopy, MAX_DRAWN_SHEETS);
  const sheetBar = drawnSheets > 0
    ? Math.max(4, Math.min(14, Math.floor(pageHeight / drawnSheets) - 2))
    : 0;

  return (
    <div className="hero">
      <div className="hero-drawings">
        <div className="hero-item">
          <span className="hero-value">{displayW} × {displayH} {unit}</span>
          <span className="hero-page" style={{ width: `${pageWidth}px`, height: `${pageHeight}px` }}>
            {/* Where the book is bound: the strip of the page the reader
                never sees flat, which is why a margin is wider on that side. */}
            <span className="hero-hinge" style={{ width: `${Math.max(4, 8 * scale)}px` }} />
          </span>
          <span className="hero-caption">portada</span>
        </div>

        {edge_mm !== null && (
          <div className="hero-item">
            <span className="hero-value">{formatRoundedValue(edge_mm, 2)} mm</span>
            <span className="hero-spine" style={{ width: `${spineWidth}px`, height: `${pageHeight}px` }}>
              <span className="hero-board" style={{ width: `${boardWidth}px` }} />
              <span className="hero-block" />
              <span className="hero-board" style={{ width: `${boardWidth}px` }} />
            </span>
            <span className="hero-caption">canto ×{SPINE_EXAGGERATION}</span>
          </div>
        )}

        {sheetsPerCopy !== null && (
          <div className="hero-item">
            <span className="hero-value">{sheetsPerCopy} pliegos</span>
            <span className="hero-stack" style={{ height: `${pageHeight}px` }}>
              {Array.from({ length: drawnSheets }, (_, index) => (
                <span
                  key={index}
                  /* The last bar is hatched when it stands for more than
                     itself, so a count of twelve is never read as the whole. */
                  className={`hero-sheet${index === 0 && sheetsPerCopy > drawnSheets ? ' more' : ''}`}
                  style={{ height: `${sheetBar}px` }}
                />
              ))}
            </span>
            <span className="hero-caption">{figures.sheetSize?.name ?? 'sin pliego'}</span>
          </div>
        )}
      </div>

      <div className="hero-spec">
        {/* Not a `stat-label`: this names the block, not a figure, and the
            inventory guard counts the page's results by that class. */}
        <span className="hero-label">Ficha</span>
        <p className="hero-title">
          {displayW} × {displayH} {unit} · {figures.totalPages} pág.
        </p>
        <p className="hero-lines">
          {figures.substrate?.name ?? 'sin papel'} · {selectedGrammage} g/m² · {figures.caliper_mm} µm<br />
          {figures.binding?.name ?? 'sin método'} · {figures.cover?.name ?? 'sin tapa'}<br />
          {figures.press?.name ?? 'sin prensa'} · pliego {figures.sheetSize?.name ?? '—'}
          {figures.plan && <> · {figures.plan.scheme.pagesPerSignature} pág. por firma</>}
        </p>
        <p className="hero-scale">dibujo a la misma escala · el canto, ×{SPINE_EXAGGERATION}</p>
      </div>
    </div>
  );
}
