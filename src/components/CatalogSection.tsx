import { useEffect, useState, type AnimationEvent } from 'react';
import { CatalogBoard } from './CatalogBoard';
import { CatalogEditor, useCatalogPanel } from './CatalogPanel';

/**
 * The catalog view, which is two things sharing one place: the board, where
 * the catalogs are read and applied, and the editor, where they are changed.
 *
 * The editor was a modal until R-24 — a sheet of glass over the whole tool,
 * opened by an «editar» in the very view it then covered. It slides in over
 * the board instead, from the right, and slides back out the same way, which
 * says what it is: the same subject, one layer further in.
 */

/**
 * Whether this environment animates. The editor is taken off screen when its
 * leaving animation ends, so where there is no animation there is no end to
 * wait for and it is simply taken away: a reader who asked for less motion,
 * and jsdom, which lays nothing out and runs no animations.
 */
function animatesPanels(): boolean {
  if (typeof window === 'undefined' || typeof Element === 'undefined') return false;
  if (!('getAnimations' in Element.prototype)) return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function CatalogSection() {
  const { isOpen } = useCatalogPanel();
  /*
   * What is on screen, which lags what is asked for by one animation: the
   * editor has to still be there to slide away after it has been closed.
   */
  const [showsEditor, setShowsEditor] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setShowsEditor(true);
    else if (!animatesPanels()) setShowsEditor(false);
  }, [isOpen]);

  const leaving = showsEditor && !isOpen;

  function onAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    // The editor's own animation, not one of a control inside it.
    if (event.target !== event.currentTarget) return;
    if (leaving) setShowsEditor(false);
  }

  return (
    <div className="catalog-section">
      {/* The board comes back the moment the editor starts leaving, so what
          slides away reveals it rather than a gap where it will be. */}
      {(!showsEditor || leaving) && <CatalogBoard />}

      {showsEditor && (
        <div
          className={`catalog-editor${leaving ? ' leaving' : ''}`}
          onAnimationEnd={onAnimationEnd}
        >
          <CatalogEditor />
        </div>
      )}
    </div>
  );
}
