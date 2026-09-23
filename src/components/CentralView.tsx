import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * What the middle of the screen is showing. Until R-22 the tool was three
 * columns — the spec sheet, one drawing, the figures — and the catalog was a
 * modal on top of them. The design canvas keeps the sheet on the left and
 * gives everything else the same middle, switched from the header: the
 * figures, the drawings and the catalog are three answers to "what does this
 * book come out as", and each of them is worth the whole width rather than a
 * third of it.
 */
export type CentralViewId = 'results' | 'visual' | 'catalog';

const VIEWS: { id: CentralViewId; label: string }[] = [
  { id: 'results', label: 'Resultados' },
  { id: 'visual', label: 'Visualización' },
  { id: 'catalog', label: 'Catálogo' },
];

/** What each view is called, for the region that holds it. */
export const CENTRAL_VIEW_LABEL: Record<CentralViewId, string> =
  Object.fromEntries(VIEWS.map(view => [view.id, view.label])) as Record<CentralViewId, string>;

interface CentralViewApi {
  view: CentralViewId;
  show: (view: CentralViewId) => void;
}

const CentralViewContext = createContext<CentralViewApi | null>(null);

/** Lets anything in the tree read the current view, or switch to another. */
export function useCentralView(): CentralViewApi {
  const api = useContext(CentralViewContext);
  if (!api) throw new Error('useCentralView used outside CentralViewProvider');
  return api;
}

export function CentralViewProvider({ children }: { children: ReactNode }) {
  /*
   * The figures first: the tool is opened to find out what a book comes out
   * as, and the drawings and the catalog are both ways of checking that
   * answer rather than ways of reaching it.
   */
  const [view, setView] = useState<CentralViewId>('results');
  const show = useCallback((next: CentralViewId) => setView(next), []);
  const api = useMemo(() => ({ view, show }), [view, show]);

  return <CentralViewContext.Provider value={api}>{children}</CentralViewContext.Provider>;
}

/**
 * The switch, in the header, where it belongs to the whole screen rather than
 * to any one of the three things it shows.
 *
 * Marked with `aria-pressed` inside a group rather than as a `role="tablist"`,
 * which is what the canvas writes: a tablist promises that the arrow keys
 * move between the tabs and that only one of them is in the tab order, and
 * building that is accessibility work, which is paused. A group of pressed
 * buttons promises only what this is — three buttons, one of them on — and
 * every one of them is reachable by Tab today. The rest of the tool marks its
 * choices the same way, for the same reason.
 */
export function CentralViewTabs() {
  const { view, show } = useCentralView();

  return (
    <div className="central-tabs" role="group" aria-label="Vista central">
      {VIEWS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className={`central-tab${view === id ? ' active' : ''}`}
          aria-pressed={view === id}
          onClick={() => show(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
