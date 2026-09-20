import { useState } from 'react';
import { PagePreview } from './PagePreview';
import { SpineView } from './SpinePreview';
import { SheetPreview } from './SheetPreview';
import { CoverPreview } from './CoverPreview';

/**
 * One drawing at a time, chosen here. Stacked, the four of them competed for
 * the same column and each got a fraction of it; a book is looked at one way
 * at a time anyway, so the column shows the view asked for and gives it the
 * whole space.
 *
 * The spine gets a view of its own, which the proposal's three did not
 * include. It draws something the other three do not, and dropping a drawing
 * while claiming to only move things is not a trade this increment is allowed
 * to make.
 */
const VIEWS = [
  { id: 'page', label: 'Página' },
  { id: 'spine', label: 'Lomo' },
  { id: 'sheet', label: 'Pliego' },
  { id: 'cover', label: 'Tapa' },
] as const;

type ViewId = (typeof VIEWS)[number]['id'];

export function PreviewColumn() {
  const [view, setView] = useState<ViewId>('page');

  return (
    <>
      <div className="preview-switch" role="group" aria-label="Vista">
        {VIEWS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className="preview-switch-option"
            aria-pressed={view === id}
            onClick={() => setView(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'page' && <PagePreview />}
      {view === 'spine' && <SpineView />}
      {view === 'sheet' && <SheetPreview />}
      {view === 'cover' && <CoverPreview />}
    </>
  );
}
