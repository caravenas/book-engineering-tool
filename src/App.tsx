import { useEffect, useState } from 'react';
import { useBookStore, userLayerStorage } from './store/useBookStore';
import { loadCatalog } from './config/loadCatalog';
import { readUserLayer } from './config/userLayer';
import type { ConfigError } from './config/validateCatalog';
import { CanvasDesigner } from './components/CanvasDesigner';
import { SubstrateSelector } from './components/SubstrateSelector';
import { ImpositionVisualizer } from './components/ImpositionVisualizer';
import { SpineCalculator } from './components/SpineCalculator';
import { BindingPanel } from './components/BindingPanel';
import { CoverPanel } from './components/CoverPanel';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; errors: ConfigError[] }
  | { status: 'ready' };

const UNEXPECTED_ERROR: ConfigError = {
  file: '',
  path: '',
  message: 'Ocurrió un error inesperado al cargar la configuración.',
};

export default function App() {
  const initialize = useBookStore(state => state.initialize);
  const userLayerStorageAvailable = useBookStore(state => state.userLayerStorageAvailable);
  const userLayerWriteFailed = useBookStore(state => state.userLayerWriteFailed);
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [persistenceNoticeDismissed, setPersistenceNoticeDismissed] = useState(false);
  const showPersistenceNotice = (!userLayerStorageAvailable || userLayerWriteFailed) && !persistenceNoticeDismissed;

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
    <div className="page-wrapper">
      <div className="header-section">
        <header className="app-header" style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <img src="/logo.svg" alt="PliegoStack Logo" style={{ height: '7rem', width: 'auto' }} />
          <h1 className="app-logo">PliegoStack</h1>
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

          {loadState.status === 'ready' && (
            <div className="app-grid">
              <div className="app-cell cell-tl">
                <CanvasDesigner />
              </div>
              <div className="app-cell cell-tr">
                <SubstrateSelector />
              </div>
              <div className="app-cell cell-bl">
                <SpineCalculator />
              </div>
              <div className="app-cell cell-br">
                <BindingPanel />
              </div>
              <div className="app-cell cell-bottom">
                <ImpositionVisualizer />
              </div>
              <div className="app-cell cell-bottom">
                <CoverPanel />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
