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
        <p className="app-tagline">Book Engineering Tool · Ingeniería Editorial</p>
      </header>

      <main className="app-grid">
        {/* Left Panel: Design & Paper */}
        <div className="app-column">
          <CanvasDesigner />
          <SubstrateSelector />
        </div>

        {/* Center Panel: Imposition Visualizer */}
        <div className="app-column">
          <ImpositionVisualizer />
        </div>

        {/* Right Panel: Spine & Weight */}
        <div className="app-column">
          <SpineCalculator />
        </div>
      </main>
    </div>
  );
}
