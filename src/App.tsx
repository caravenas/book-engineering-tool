import { useEffect } from 'react';
import { useBookStore } from './store/useBookStore';
import { CanvasDesigner } from './components/CanvasDesigner';
import { SubstrateSelector } from './components/SubstrateSelector';
import { ImpositionVisualizer } from './components/ImpositionVisualizer';
import { SpineCalculator } from './components/SpineCalculator';

export default function App() {
  const recalculate = useBookStore(state => state.recalculate);

  // Initial calculation on mount
  useEffect(() => {
    recalculate();
  }, [recalculate]);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-logo">PliegoStack</h1>
      </header>

      <main className="app-grid">
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
      </main>
    </div>
  );
}
