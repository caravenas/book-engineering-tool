import { useEffect, useState } from 'react';
import { useBookStore, userLayerStorage } from './store/useBookStore';
import { loadCatalog } from './config/loadCatalog';
import { readUserLayer } from './config/userLayer';
import type { ConfigError } from './config/validateCatalog';
import type { OrphanedUserLayerEntry, OrphanedUserLayerEntryKind } from './types';
import { SpecSteps } from './components/SpecSteps';
import { SpecSummary } from './components/specSummaries';
import { PreviewColumn } from './components/PreviewColumn';
import { CatalogPanelProvider } from './components/CatalogPanel';
import { CatalogBoard } from './components/CatalogBoard';
import { ResultsView } from './components/ResultsView';
import {
  CentralViewProvider, CentralViewTabs, useCentralView, CENTRAL_VIEW_LABEL,
} from './components/CentralView';
import { ResultsBar } from './components/ResultsBar';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; errors: ConfigError[] }
  | { status: 'ready' };

const UNEXPECTED_ERROR: ConfigError = {
  file: '',
  path: '',
  message: 'Ocurrió un error inesperado al cargar la configuración.',
};

/** Which catalog an orphaned entry's `targetId` used to belong to, named the way the rest of the UI names that catalog. */
const ORPHAN_CATALOG_NAME: Record<OrphanedUserLayerEntryKind, string> = {
  proportionPatch: 'proporciones',
  substratePatch: 'papeles',
  coverPatch: 'tapas',
  sheetSizePatch: 'pliegos',
  pressPatch: 'prensas',
  bindingPatch: 'encuadernaciones',
  hiddenProportion: 'proporciones',
  hiddenSubstrate: 'papeles',
  hiddenCover: 'tapas',
  hiddenSheetSize: 'pliegos',
  hiddenPress: 'prensas',
  hiddenBinding: 'encuadernaciones',
};

/** Whether an orphaned entry is a patch (edited a factory entry) or a hide (hid a factory entry). */
function describeOrphanKind(kind: OrphanedUserLayerEntryKind): string {
  return kind.startsWith('hidden') ? 'un ocultamiento' : 'un parche';
}

/**
 * The middle of the screen: the figures, the drawings or the catalog, whichever
 * the header's switch is on. One region rather than three, so a screen reader
 * announces the change of view and not merely a change of contents.
 */
function CentralColumn() {
  const { view } = useCentralView();

  return (
    <section className="app-column column-main" aria-label={CENTRAL_VIEW_LABEL[view]}>
      {view === 'results' && <ResultsView />}
      {view === 'visual' && <PreviewColumn />}
      {view === 'catalog' && <CatalogBoard />}
    </section>
  );
}

export default function App() {
  const initialize = useBookStore(state => state.initialize);
  const userLayerStorageAvailable = useBookStore(state => state.userLayerStorageAvailable);
  const userLayerWriteFailed = useBookStore(state => state.userLayerWriteFailed);
  const orphanedUserLayerEntries = useBookStore(state => state.orphanedUserLayerEntries);
  const unpatchProportion = useBookStore(state => state.unpatchProportion);
  const unpatchSubstrate = useBookStore(state => state.unpatchSubstrate);
  const unpatchCover = useBookStore(state => state.unpatchCover);
  const unpatchSheetSize = useBookStore(state => state.unpatchSheetSize);
  const unpatchPress = useBookStore(state => state.unpatchPress);
  const unpatchBinding = useBookStore(state => state.unpatchBinding);
  const showProportion = useBookStore(state => state.showProportion);
  const showSubstrate = useBookStore(state => state.showSubstrate);
  const showCover = useBookStore(state => state.showCover);
  const showSheetSize = useBookStore(state => state.showSheetSize);
  const showPress = useBookStore(state => state.showPress);
  const showBinding = useBookStore(state => state.showBinding);
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [persistenceNoticeDismissed, setPersistenceNoticeDismissed] = useState(false);
  const [orphanNoticeDismissed, setOrphanNoticeDismissed] = useState(false);
  const showPersistenceNotice = (!userLayerStorageAvailable || userLayerWriteFailed) && !persistenceNoticeDismissed;
  const showOrphanNotice = orphanedUserLayerEntries.length > 0 && !orphanNoticeDismissed;

  function removeOrphan(entry: OrphanedUserLayerEntry): void {
    switch (entry.kind) {
      case 'proportionPatch': unpatchProportion(entry.targetId); break;
      case 'substratePatch': unpatchSubstrate(entry.targetId); break;
      case 'coverPatch': unpatchCover(entry.targetId); break;
      case 'sheetSizePatch': unpatchSheetSize(entry.targetId); break;
      case 'pressPatch': unpatchPress(entry.targetId); break;
      case 'bindingPatch': unpatchBinding(entry.targetId); break;
      case 'hiddenProportion': showProportion(entry.targetId); break;
      case 'hiddenSubstrate': showSubstrate(entry.targetId); break;
      case 'hiddenCover': showCover(entry.targetId); break;
      case 'hiddenSheetSize': showSheetSize(entry.targetId); break;
      case 'hiddenPress': showPress(entry.targetId); break;
      case 'hiddenBinding': showBinding(entry.targetId); break;
    }
  }

  // Load the runtime catalog once on mount; guard against StrictMode's
  // double effect invocation and against state updates after unmount.
  useEffect(() => {
    let cancelled = false;

    loadCatalog()
      .then(result => {
        if (cancelled) return;

        if (!result.ok) {
          setLoadState({ status: 'error', errors: result.errors });
          return;
        }

        initialize(result.catalog, readUserLayer(userLayerStorage));
        setLoadState({ status: 'ready' });
      })
      .catch(error => {
        if (cancelled) return;
        console.error('No se pudo cargar la configuración de PliegoStack.', error);
        setLoadState({ status: 'error', errors: [UNEXPECTED_ERROR] });
      });

    return () => {
      cancelled = true;
    };
  }, [initialize]);

  return (
    <CatalogPanelProvider>
    <CentralViewProvider>
    <div className="page-wrapper">
      <div className="header-section">
        <header className="app-header">
          <img src="/logo.svg" alt="PliegoStack Logo" style={{ height: '2.5rem', width: 'auto' }} />
          <h1 className="app-logo">PliegoStack</h1>
          {/* What the tool is, in the same breath as what it is called. */}
          <span className="app-tagline">book engineering tool</span>
          {/*
            * Said once, where it applies to everything below, instead of
            * five times under five dropdowns. Which file says what, and in
            * its own words, is at the foot of the spec sheet and inside each
            * catalog.
            */}
          {loadState.status === 'ready' && <span className="header-badge">Datos de ejemplo</span>}
          {/* What the middle of the screen is showing. It sits between the name
              of the tool and what the book currently is, because it belongs to
              neither: it changes the whole of the screen below. */}
          {loadState.status === 'ready' && <CentralViewTabs />}
          {/* What the book currently is, read from the same place the steps
              read it, so the header and the sheet cannot say different things. */}
          {loadState.status === 'ready' && <SpecSummary />}
        </header>
      </div>

      <div className="main-section">
        <main>
          {loadState.status === 'loading' && (
            <p className="config-status" role="status">Cargando configuración…</p>
          )}

          {loadState.status === 'error' && (
            <div className="config-error" role="alert">
              <h2 className="config-error-title">No se pudo cargar la configuración</h2>
              <ul className="config-error-list">
                {loadState.errors.map((error, index) => (
                  <li key={index}>
                    {error.file && (
                      <>
                        <strong>{error.file}</strong>
                        {error.path && <> — <code>{error.path}</code></>}
                        {': '}
                      </>
                    )}
                    {error.message}
                  </li>
                ))}
              </ul>
              <p className="config-error-hint">Revisa los archivos en config/ y recarga la página.</p>
            </div>
          )}

          {loadState.status === 'ready' && showPersistenceNotice && (
            <div
              className="config-status"
              role="status"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}
            >
              <span>
                No se pudo guardar la configuración personalizada en este navegador. Los cambios se perderán al recargar la página.
              </span>
              <button
                type="button"
                onClick={() => setPersistenceNoticeDismissed(true)}
                aria-label="Cerrar aviso"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--color-text-primary)',
                }}
              >
                ×
              </button>
            </div>
          )}

          {loadState.status === 'ready' && showOrphanNotice && (
            <div
              className="config-status"
              role="status"
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                <span>
                  Hay cambios guardados que ya no corresponden a ningún elemento del catálogo actual.
                  Se conservan por si el elemento vuelve en una futura actualización; puedes eliminarlos si ya no los necesitas:
                </span>
                <button
                  type="button"
                  onClick={() => setOrphanNoticeDismissed(true)}
                  aria-label="Cerrar aviso de registros huérfanos"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  ×
                </button>
              </div>
              <ul style={{ margin: 0, paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {orphanedUserLayerEntries.map(entry => (
                  <li
                    key={`${entry.kind}-${entry.targetId}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}
                  >
                    <span>
                      {describeOrphanKind(entry.kind)} de {ORPHAN_CATALOG_NAME[entry.kind]} para «{entry.targetId}»
                    </span>
                    <button type="button" onClick={() => removeOrphan(entry)}>
                      Eliminar «{entry.targetId}»
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {loadState.status === 'ready' && (
            <>
            <ResultsBar />
            <div className="app-grid">
              <section className="app-column column-spec" aria-label="Ficha técnica">
                <SpecSteps />
              </section>
              <CentralColumn />
            </div>
            </>
          )}
        </main>
      </div>
    </div>
    </CentralViewProvider>
    </CatalogPanelProvider>
  );
}
