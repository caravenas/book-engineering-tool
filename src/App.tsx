import { useEffect, useState } from 'react';
import { useBookStore } from './store/useBookStore';
import { loadCatalog } from './config/loadCatalog';
import type { ConfigError } from './config/validateCatalog';
import { CanvasDesigner } from './components/CanvasDesigner';
import { SubstrateSelector } from './components/SubstrateSelector';
import { ImpositionVisualizer } from './components/ImpositionVisualizer';
import { SpineCalculator } from './components/SpineCalculator';
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
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });

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

        initialize(result.catalog);
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

          {loadState.status === 'ready' && (
            <div className="app-grid">
              <div className="app-cell cell-tl">
                <CanvasDesigner />
              </div>
              <div className="app-cell cell-tr">
                <ImpositionVisualizer />
              </div>
              <div className="app-cell cell-bl">
                <SubstrateSelector />
              </div>
              <div className="app-cell cell-br">
                <SpineCalculator />
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
