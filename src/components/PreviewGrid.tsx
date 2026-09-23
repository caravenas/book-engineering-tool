import type { ReactNode } from 'react';
import { PagePreview } from './PagePreview';
import { SpineView } from './SpinePreview';
import { SheetPreview } from './SheetPreview';
import { CoverPreview } from './CoverPreview';
import { useElementSize } from './useElementSize';

/**
 * The four drawings of one book, all of them at once.
 *
 * Until R-24 they took turns: four pills over a single frame, because in a
 * column 336px wide four drawings stacked would each have had a fifth of the
 * height. The middle of the screen is not that column any more — it is
 * everything the spec sheet does not take — and four drawings fit in it side
 * by side with room to spare. Switching between them cost a click to compare
 * a page with the sheet it prints on, which is exactly the comparison the
 * drawings exist for.
 *
 * Each cell measures itself and hands its drawing the box it has, so the
 * drawings grow with the window instead of sitting at a fixed size in the
 * middle of whatever room they were given.
 */

/** A drawing, its name, and the box it is measured into. */
function PreviewCell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="preview-cell">
      <h3 className="preview-cell-title">{title}</h3>
      <div className="preview-cell-body">{children}</div>
    </section>
  );
}

/**
 * The two drawings laid out in CSS pixels rather than in an SVG viewBox have
 * to be told how big their cell is; the two that are SVGs scale themselves to
 * whatever box the stylesheet gives them.
 */
function PageCell() {
  const [ref, size] = useElementSize<HTMLDivElement>({ width: 360, height: 420 });
  return (
    <section className="preview-cell">
      <h3 className="preview-cell-title">Página</h3>
      <div className="preview-cell-body" ref={ref}>
        {/* The measurements written around the drawing take room the drawing
            cannot have: the width above it, the height beside it, the foot
            line under it. */}
        <PagePreview maxWidth={size.width - 80} maxHeight={size.height - 76} />
      </div>
    </section>
  );
}

function SpineCell() {
  const [ref, size] = useElementSize<HTMLDivElement>({ width: 360, height: 334 });
  return (
    <section className="preview-cell">
      <h3 className="preview-cell-title">Lomo</h3>
      <div className="preview-cell-body" ref={ref}>
        <SpineView maxHeight={size.height} />
      </div>
    </section>
  );
}

export function PreviewGrid() {
  return (
    <div className="preview-grid">
      <PageCell />
      <SpineCell />
      <PreviewCell title="Pliego"><SheetPreview /></PreviewCell>
      <PreviewCell title="Tapa"><CoverPreview /></PreviewCell>
    </div>
  );
}
